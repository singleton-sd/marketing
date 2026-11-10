#!/usr/bin/env node
/**
 * Assert a marketing Astro dist is safe to publish on GitHub Pages.
 *
 * Usage:
 *   node scripts/check-pages-asset-paths.mjs <distDir> <expectedBase>
 *
 * `expectedBase` is `/` for production or `/pr-preview/pr-<n>/` for previews.
 * Astro still emits files at the dist root; only the URLs inside HTML are
 * prefixed, so this checker strips `expectedBase` before looking up files.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PRODUCTION_CNAME = 'www.singletonsd.com';

const ASSET_ATTR_RE = /\b(?:href|src)="([^"]+)"/g;
const LOCAL_ASSET_RE = /\/_astro\/|\/admin\/|\.css$|\.js$/;

/**
 * @param {string} base
 * @returns {string}
 */
export function normalizeBase(base) {
  if (!base || base === '/') {
    return '/';
  }
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * Map a built URL back to a file under dist. Returns null when the URL is
 * not a same-origin path under `expectedBase`. Relative URLs are resolved
 * against the HTML file that referenced them.
 *
 * @param {string} url
 * @param {string} expectedBase
 * @param {string} [htmlRel] HTML path relative to dist (posix), e.g. `admin/index.html`
 * @returns {string | null}
 */
export function urlToDistRelative(url, expectedBase, htmlRel = 'index.html') {
  if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return null;
  }
  if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) {
    return null;
  }
  const withoutQuery = url.split('?')[0] ?? url;
  const base = normalizeBase(expectedBase);
  if (!withoutQuery.startsWith('/')) {
    const combined = normalize(join(dirname(htmlRel), withoutQuery));
    return relative('.', combined).split('\\').join('/');
  }
  if (base === '/') {
    return withoutQuery.replace(/^\//, '');
  }
  if (!withoutQuery.startsWith(base)) {
    return null;
  }
  return withoutQuery.slice(base.length);
}

/**
 * @param {string} distDir
 * @param {(filePath: string) => boolean} predicate
 * @returns {string[]}
 */
function listFiles(distDir, predicate) {
  /** @type {string[]} */
  const found = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
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
  walk(distDir);
  return found;
}

/**
 * @param {string} distDir
 * @param {string} expectedBase
 * @returns {string[]}
 */
export function collectPagesPathErrors(distDir, expectedBase) {
  const dist = resolve(distDir);
  const base = normalizeBase(expectedBase);
  /** @type {string[]} */
  const errors = [];

  if (!existsSync(dist) || !statSync(dist).isDirectory()) {
    return [`Dist not found at ${dist}`];
  }

  const requiredFiles = ['.nojekyll', '404.html', 'CNAME', 'index.html', 'admin/index.html'];
  for (const rel of requiredFiles) {
    const full = join(dist, rel);
    if (!existsSync(full) || !statSync(full).isFile()) {
      errors.push(`Missing required Pages file: ${rel}`);
    }
  }

  const cnamePath = join(dist, 'CNAME');
  if (existsSync(cnamePath)) {
    const cname = readFileSync(cnamePath, 'utf8').trim();
    if (cname !== PRODUCTION_CNAME) {
      errors.push(`CNAME is "${cname}", expected "${PRODUCTION_CNAME}"`);
    }
  }

  if (existsSync(join(dist, 'staticwebapp.config.json'))) {
    errors.push('staticwebapp.config.json must not be published to GitHub Pages');
  }

  const htmlFiles = listFiles(dist, (filePath) => filePath.endsWith('.html'));
  if (htmlFiles.length === 0) {
    errors.push(`No HTML files under ${dist}`);
  }

  let astroAssetHits = 0;
  for (const filePath of htmlFiles) {
    const html = readFileSync(filePath, 'utf8');
    const htmlRel = relative(dist, filePath).split('\\').join('/');
    if (html.includes('azurestaticapps.net') || html.includes('staticwebapp.config')) {
      errors.push(`${filePath}: still references Azure Static Web Apps`);
    }

    for (const match of html.matchAll(ASSET_ATTR_RE)) {
      const url = match[1];
      if (!url || !LOCAL_ASSET_RE.test(url)) {
        continue;
      }
      if (url.startsWith('http://') || url.startsWith('https://')) {
        continue;
      }

      if (url.includes('/_astro/')) {
        astroAssetHits += 1;
        if (base === '/') {
          if (!url.startsWith('/_astro/')) {
            errors.push(`${filePath}: Astro asset is not root-relative: ${url}`);
          }
        } else if (!url.startsWith(`${base}_astro/`)) {
          errors.push(
            `${filePath}: Astro asset is not prefixed with ${base}: ${url}`,
          );
        }
      } else if (base !== '/' && url.startsWith('/') && !url.startsWith(base) && url.startsWith('/admin/')) {
        errors.push(`${filePath}: admin asset is not prefixed with ${base}: ${url}`);
      }

      const distRel = urlToDistRelative(url, base, htmlRel);
      if (distRel === null) {
        continue;
      }
      const onDisk = join(dist, distRel);
      if (!existsSync(onDisk) || !statSync(onDisk).isFile()) {
        errors.push(`${filePath}: missing asset ${url} (looked for ${distRel})`);
      }
    }
  }

  if (astroAssetHits === 0) {
    errors.push('No /_astro/ assets found in HTML — the build looks incomplete');
  }

  return errors;
}

/**
 * @param {string} distDir
 * @param {string} expectedBase
 */
export function assertPagesAssetPaths(distDir, expectedBase) {
  const errors = collectPagesPathErrors(distDir, expectedBase);
  if (errors.length > 0) {
    throw new Error(
      `GitHub Pages path check failed for base "${normalizeBase(expectedBase)}":\n${errors
        .map((line) => `- ${line}`)
        .join('\n')}`,
    );
  }
}

const isDirectRun = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectRun) {
  const distDir = process.argv[2];
  const expectedBase = process.argv[3];
  if (!distDir || expectedBase === undefined) {
    console.error('Usage: node scripts/check-pages-asset-paths.mjs <distDir> <expectedBase>');
    process.exit(1);
  }
  try {
    assertPagesAssetPaths(distDir, expectedBase);
    console.log(`OK  pages paths ${resolve(distDir)} base=${normalizeBase(expectedBase)}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
