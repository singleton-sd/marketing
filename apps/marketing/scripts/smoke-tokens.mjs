#!/usr/bin/env node
/**
 * Smoke the marketing Astro build for published @singleton-sd/tokens.
 *
 * Asserts dist CSS uses --ssd-* (not legacy --fg-*) and HTML does not load
 * token sheets from tokens.design.singletonsd.com. Also checks Decap vendor
 * copies from copy-token-css.mjs.
 *
 * Usage:
 *   node ./scripts/smoke-tokens.mjs [distDir]
 * Default distDir: apps/marketing/dist (Astro outDir).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Keep in sync with copy-token-css.mjs destination filenames. */
export const VENDOR_TOKEN_CSS = ['tokens-dark.css', 'tokens-root-dark.css'];

export const REQUIRED_SSD_VARS = [
  '--ssd-color-text-default',
  '--ssd-color-background-default',
];

const TOKEN_CDN = 'tokens.design.singletonsd.com';
const LEGACY_FG = '--fg-';

/**
 * @param {string} root
 * @param {(filePath: string) => boolean} predicate
 * @returns {string[]}
 */
export function listFiles(root, predicate) {
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
 * @param {string} filePath
 * @param {string} distDir
 * @returns {string}
 */
export function distRelative(filePath, distDir) {
  return relative(distDir, filePath).split('\\').join('/');
}

/**
 * @param {string} filePath
 * @param {string} distDir
 * @returns {boolean}
 */
export function isVendorCss(filePath, distDir) {
  const rel = distRelative(filePath, distDir);
  return rel.startsWith('admin/vendor/') && rel.endsWith('.css');
}

/**
 * @param {string} css
 * @param {string[]} requiredVars
 * @returns {string[]} missing var names
 */
export function missingRequiredSsdVars(css, requiredVars = REQUIRED_SSD_VARS) {
  return requiredVars.filter((name) => !css.includes(name));
}

/**
 * @param {string} css
 * @returns {boolean}
 */
export function cssHasLegacyFgVars(css) {
  return css.includes(LEGACY_FG);
}

/**
 * @param {string} html
 * @returns {boolean}
 */
export function htmlHasTokenCdnLink(html) {
  return html.toLowerCase().includes(TOKEN_CDN);
}

/**
 * @param {string} distDir
 * @returns {string[]}
 */
export function missingVendorTokenCss(distDir) {
  const vendorDir = join(distDir, 'admin', 'vendor');
  return VENDOR_TOKEN_CSS.filter((name) => {
    const filePath = join(vendorDir, name);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      return true;
    }
    const css = readFileSync(filePath, 'utf8');
    return css.trim().length === 0 || !css.includes('--ssd-');
  });
}

/**
 * Scan a marketing Astro dist folder.
 *
 * @param {string} distDir
 * @throws {Error} when assertions fail or dist is missing
 */
export function smokeMarketingTokens(distDir) {
  const dist = resolve(distDir);
  if (!existsSync(dist) || !statSync(dist).isDirectory()) {
    throw new Error(
      `Marketing dist not found at ${dist}. Run \`pnpm --filter @singleton-sd/marketing run build\` first.`,
    );
  }

  /** @type {string[]} */
  const errors = [];

  const cssFiles = listFiles(dist, (filePath) => filePath.endsWith('.css'));
  const htmlFiles = listFiles(dist, (filePath) => filePath.endsWith('.html'));

  if (cssFiles.length === 0) {
    errors.push(`No CSS files under ${dist}.`);
  }
  if (htmlFiles.length === 0) {
    errors.push(`No HTML files under ${dist}.`);
  }

  const siteCss = cssFiles
    .filter((filePath) => !isVendorCss(filePath, dist))
    .map((filePath) => readFileSync(filePath, 'utf8'))
    .join('\n');
  const missingSsd = missingRequiredSsdVars(siteCss);
  if (missingSsd.length > 0) {
    errors.push(
      `Built site CSS is missing published token vars: ${missingSsd.join(', ')}.`,
    );
  }

  for (const filePath of cssFiles) {
    const css = readFileSync(filePath, 'utf8');
    if (cssHasLegacyFgVars(css)) {
      errors.push(
        `${distRelative(filePath, dist)} contains legacy ${LEGACY_FG} custom properties.`,
      );
    }
  }

  for (const filePath of htmlFiles) {
    const html = readFileSync(filePath, 'utf8');
    if (htmlHasTokenCdnLink(html)) {
      errors.push(
        `${distRelative(filePath, dist)} links token sheets from ${TOKEN_CDN}.`,
      );
    }
  }

  const missingVendor = missingVendorTokenCss(dist);
  if (missingVendor.length > 0) {
    errors.push(
      `Missing or empty vendored token CSS under admin/vendor: ${missingVendor.join(', ')}.`,
    );
  }

  if (errors.length > 0) {
    throw new Error(`Marketing token smoke failed:\n${errors.map((line) => `- ${line}`).join('\n')}`);
  }
}

const isDirectRun = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectRun) {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const defaultDist = resolve(scriptDir, '../dist');
  const distDir = process.argv[2] ? resolve(process.argv[2]) : defaultDist;

  try {
    smokeMarketingTokens(distDir);
    console.log(`OK  token smoke ${distDir}`);
    process.exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
