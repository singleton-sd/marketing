#!/usr/bin/env node
/**
 * Assert GitHub Pages build output: CNAME, 404.html, .nojekyll, and that
 * in-page asset/nav URLs honor Astro `base` / PREVIEW_BASE_PATH.
 *
 * Usage:
 *   node ./scripts/check-pages-dist.mjs [distDir] [--base /path/]
 * Default distDir: apps/marketing/dist
 * Default base: PREVIEW_BASE_PATH or "/"
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PRODUCTION_CNAME = 'www.singletonsd.com';

const ROOT_ABS_ATTR = /(?:href|src)=["'](\/[^"']*)["']/gi;

/**
 * @param {string} value
 * @returns {string}
 */
export function normalizeBase(value) {
  if (!value || value === '/') {
    return '/';
  }
  return value.endsWith('/') ? value : `${value}/`;
}

/**
 * @param {string[]} argv
 * @returns {{ distDir: string | undefined, base: string | undefined }}
 */
export function parseCheckPagesArgs(argv) {
  /** @type {string | undefined} */
  let distDir;
  /** @type {string | undefined} */
  let base;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--base') {
      base = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith('--base=')) {
      base = arg.slice('--base='.length);
      continue;
    }
    if (!arg.startsWith('-') && distDir === undefined) {
      distDir = arg;
    }
  }
  return { distDir, base };
}

/**
 * Root-absolute href/src values that do not start with `base`.
 * Production `base` of `/` has nothing to flag.
 *
 * @param {string} html
 * @param {string} base
 * @returns {string[]}
 */
export function findRootAbsoluteUrlsMissingBase(html, base) {
  const normalized = normalizeBase(base);
  if (normalized === '/') {
    return [];
  }
  /** @type {string[]} */
  const missing = [];
  ROOT_ABS_ATTR.lastIndex = 0;
  let match = ROOT_ABS_ATTR.exec(html);
  while (match) {
    const url = match[1];
    if (!url.startsWith('//') && !url.startsWith(normalized)) {
      missing.push(url);
    }
    match = ROOT_ABS_ATTR.exec(html);
  }
  return missing;
}

/**
 * @param {string} html
 * @param {string} base
 * @returns {boolean}
 */
export function htmlIncludesBasePath(html, base) {
  const normalized = normalizeBase(base);
  if (normalized === '/') {
    return true;
  }
  return html.includes(normalized);
}

/**
 * @param {string} distDir
 * @param {string} filePath
 * @returns {string}
 */
function distRelative(filePath, distDir) {
  return relative(distDir, filePath).split('\\').join('/');
}

/**
 * @param {string} root
 * @param {(filePath: string) => boolean} predicate
 * @returns {string[]}
 */
function listFiles(root, predicate) {
  /** @type {string[]} */
  const found = [];
  /**
   * @param {string} dir
   */
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.isFile() && predicate(full)) {
        found.push(full);
      }
    }
  }
  if (existsSync(root) && statSync(root).isDirectory()) {
    walk(root);
  }
  return found.sort();
}

/**
 * @param {string} distDir
 * @param {{ base?: string }} [options]
 */
export function checkPagesDist(distDir, options = {}) {
  const dist = resolve(distDir);
  const base = normalizeBase(options.base ?? process.env.PREVIEW_BASE_PATH ?? '/');
  /** @type {string[]} */
  const errors = [];

  if (!existsSync(dist) || !statSync(dist).isDirectory()) {
    throw new Error(
      `Pages dist not found at ${dist}. Run \`pnpm --filter @singleton-sd/marketing run build\` first.`,
    );
  }

  const requiredFiles = ['CNAME', '404.html', '.nojekyll', 'index.html', 'admin/index.html'];
  for (const rel of requiredFiles) {
    const full = join(dist, rel);
    if (!existsSync(full) || !statSync(full).isFile()) {
      errors.push(`Missing ${rel} in dist.`);
    }
  }

  const cnamePath = join(dist, 'CNAME');
  if (existsSync(cnamePath) && statSync(cnamePath).isFile()) {
    const cname = readFileSync(cnamePath, 'utf8').trim();
    if (cname !== PRODUCTION_CNAME) {
      errors.push(`CNAME is "${cname}", expected "${PRODUCTION_CNAME}".`);
    }
  }

  const htmlFiles = listFiles(dist, (filePath) => filePath.endsWith('.html'));
  if (htmlFiles.length === 0) {
    errors.push(`No HTML files under ${dist}.`);
  }

  let sawBasePath = base === '/';
  for (const filePath of htmlFiles) {
    const html = readFileSync(filePath, 'utf8');
    const rel = distRelative(filePath, dist);
    if (htmlIncludesBasePath(html, base)) {
      sawBasePath = true;
    }
    const missing = findRootAbsoluteUrlsMissingBase(html, base);
    if (missing.length > 0) {
      errors.push(
        `${rel}: root-absolute URL(s) missing base ${base}: ${missing.slice(0, 8).join(', ')}`,
      );
    }
  }

  if (!sawBasePath) {
    errors.push(`No built HTML includes Astro base path ${base}.`);
  }

  if (errors.length > 0) {
    throw new Error(`Pages dist check failed:\n${errors.map((line) => `- ${line}`).join('\n')}`);
  }
}

const isDirectRun = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectRun) {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const defaultDist = resolve(scriptDir, '../dist');
  const parsed = parseCheckPagesArgs(process.argv.slice(2));
  const distDir = parsed.distDir ? resolve(parsed.distDir) : defaultDist;
  const base = parsed.base ?? process.env.PREVIEW_BASE_PATH ?? '/';

  try {
    checkPagesDist(distDir, { base });
    console.log(`OK  pages dist ${distDir} (base ${normalizeBase(base)})`);
    process.exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
