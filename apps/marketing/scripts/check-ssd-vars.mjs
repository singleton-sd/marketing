#!/usr/bin/env node
/**
 * Fail if the site references var(--ssd-*) that the installed tokens
 * package does not declare. Scans src, public (except vendor copies),
 * and tailwind.config.mjs. Comments that name a future token without
 * var() are ignored.
 *
 * Usage: node ./scripts/check-ssd-vars.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VAR_USE_RE = /var\(\s*(--ssd-[a-z0-9-]+)/gi;
export const VAR_DECL_RE = /(--ssd-[a-z0-9-]+)\s*:/g;
const SCAN_EXTS = new Set(['.astro', '.css', '.html', '.js', '.mjs', '.ts', '.yml']);
const SKIP_DIRS = new Set(['.git', 'dist', 'node_modules', 'vendor']);

/**
 * @param {string} text
 * @param {RegExp} re
 * @returns {Set<string>}
 */
export function collectMatches(text, re) {
  const found = new Set();
  const copy = new RegExp(re.source, re.flags);
  let match;
  while ((match = copy.exec(text))) {
    found.add(match[1]);
  }
  return found;
}

/**
 * @param {string} root
 * @param {(filePath: string) => boolean} predicate
 * @returns {string[]}
 */
export function listFiles(root, predicate) {
  /** @type {string[]} */
  const found = [];
  if (!existsSync(root)) {
    return found;
  }
  const stat = statSync(root);
  if (stat.isFile()) {
    if (predicate(root)) found.push(root);
    return found;
  }
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
        continue;
      }
      if (entry.isFile() && predicate(full)) found.push(full);
    }
  }
  walk(root);
  return found.sort();
}

/**
 * @param {string[]} cssPaths
 * @returns {Set<string>}
 */
export function definedSsdVars(cssPaths) {
  const defined = new Set();
  for (const cssPath of cssPaths) {
    for (const name of collectMatches(readFileSync(cssPath, 'utf8'), VAR_DECL_RE)) {
      defined.add(name);
    }
  }
  return defined;
}

/**
 * @param {string[]} filePaths
 * @returns {Set<string>}
 */
export function usedSsdVars(filePaths) {
  const used = new Set();
  for (const filePath of filePaths) {
    for (const name of collectMatches(readFileSync(filePath, 'utf8'), VAR_USE_RE)) {
      used.add(name);
    }
  }
  return used;
}

/**
 * @param {Iterable<string>} used
 * @param {Set<string>} defined
 * @returns {string[]}
 */
export function missingSsdVars(used, defined) {
  return [...used].filter((name) => !defined.has(name)).sort();
}

/**
 * @param {string} appRoot
 * @returns {string[]}
 */
export function siteSourceFiles(appRoot) {
  const scan = (filePath) => SCAN_EXTS.has(extname(filePath));
  return [
    ...listFiles(join(appRoot, 'src'), scan),
    ...listFiles(join(appRoot, 'public'), scan),
    ...listFiles(join(appRoot, 'tailwind.config.mjs'), scan),
  ];
}

/**
 * @returns {string[]}
 */
export function installedTokenCssFiles() {
  const lightCss = fileURLToPath(import.meta.resolve('@singleton-sd/tokens/css/light'));
  return listFiles(dirname(lightCss), (filePath) => filePath.endsWith('.css'));
}

/**
 * @param {string} appRoot
 * @returns {{ used: Set<string>, defined: Set<string>, missing: string[] }}
 */
export function checkInstalledSsdVars(appRoot) {
  const used = usedSsdVars(siteSourceFiles(appRoot));
  const defined = definedSsdVars(installedTokenCssFiles());
  return { used, defined, missing: missingSsdVars(used, defined) };
}

const isDirectRun = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectRun) {
  const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const { used, missing } = checkInstalledSsdVars(appRoot);
  if (missing.length > 0) {
    console.error(
      `Undefined --ssd-* vars (not declared by installed @singleton-sd/tokens):\n${missing
        .map((name) => `- ${name}`)
        .join('\n')}`,
    );
    process.exit(1);
  }
  console.log(`OK: ${used.size} referenced --ssd-* vars are defined by installed tokens.`);
}
