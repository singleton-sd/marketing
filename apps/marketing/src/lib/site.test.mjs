import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolveOgImageUrl } from './resolve-og-image-url.mjs';

const FALLBACK = 'https://assets.singletonsd.com/og-image/light/og-default.jpg';
const SITE = new URL('https://www.singletonsd.com/');

test('resolveOgImageUrl falls back when unset', () => {
  assert.equal(resolveOgImageUrl(undefined, SITE, FALLBACK), FALLBACK);
  assert.equal(resolveOgImageUrl('', SITE, FALLBACK), FALLBACK);
});

test('resolveOgImageUrl passes through absolute http(s) URLs', () => {
  const abs = 'https://assets.singletonsd.com/og-image/light/custom.jpg';
  assert.equal(resolveOgImageUrl(abs, SITE, FALLBACK), abs);
  assert.equal(
    resolveOgImageUrl('http://example.com/og.png', undefined, FALLBACK),
    'http://example.com/og.png',
  );
});

test('resolveOgImageUrl resolves relative paths against site', () => {
  assert.equal(
    resolveOgImageUrl('/uploads/og.jpg', SITE, FALLBACK),
    'https://www.singletonsd.com/uploads/og.jpg',
  );
});

test('resolveOgImageUrl returns relative path when site is missing', () => {
  assert.equal(resolveOgImageUrl('/uploads/og.jpg', undefined, FALLBACK), '/uploads/og.jpg');
});

function parseYamlMapping(text, key) {
  const match = text.match(new RegExp(`^${key}:\\n((?:  .+\\n)+)`, 'm'));
  assert.ok(match, `expected a ${key} mapping`);
  const mapping = {};
  for (const line of match[1].trimEnd().split('\n')) {
    const kv = line.match(/^  ([A-Za-z0-9_]+): (.+)$/);
    assert.ok(kv, `unexpected ${key} line: ${line}`);
    mapping[kv[1]] = kv[2];
  }
  return mapping;
}

test('Decap GitHub backend uses API gateway cms-auth', () => {
  const yaml = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../public/admin/config.yml'),
    'utf8',
  );
  const backend = parseYamlMapping(yaml, 'backend');
  assert.equal(backend.name, 'github');
  assert.equal(backend.repo, 'singleton-sd/marketing');
  assert.equal(backend.branch, 'main');
  assert.equal(backend.base_url, 'https://api.singletonsd.com');
  assert.equal(backend.auth_endpoint, 'v1/cms-auth/auth');
  assert.equal(backend.scope, undefined);
  assert.doesNotMatch(yaml, /auth\.singletonsd\.com/);
  assert.doesNotMatch(yaml, /azurewebsites\.net/);
  assert.doesNotMatch(yaml, /ssd-mkt-decap-oauth/);
});

test('Decap admin assets are relative so GitHub Pages previews resolve', () => {
  const html = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../public/admin/index.html'),
    'utf8',
  );
  assert.match(html, /href="\.\/config\.yml"/);
  assert.match(html, /href="\.\/admin\.css"/);
  assert.match(html, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.doesNotMatch(html, /(?:href|src)="\/admin\//);
});

test('marketing pages default to server-rendered dark theme', () => {
  const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const layout = readFileSync(join(srcDir, 'layouts/BaseLayout.astro'), 'utf8');
  const header = readFileSync(join(srcDir, 'components/shell/SiteHeader.astro'), 'utf8');
  const footer = readFileSync(join(srcDir, 'components/shell/SiteFooter.astro'), 'utf8');
  const home = readFileSync(join(srcDir, 'pages/index.astro'), 'utf8');
  assert.match(layout, /theme = 'dark'/);
  assert.match(layout, /data-theme=\{theme\}/);
  assert.doesNotMatch(layout, /theme = 'light'/);
  assert.doesNotMatch(layout, /localStorage/);
  assert.match(header, /LOGO_DARK/);
  assert.doesNotMatch(header, /LOGO_LIGHT/);
  assert.match(footer, /LOGO_LIGHT/);
  assert.doesNotMatch(footer, /LOGO_DARK/);
  assert.match(home, /brandLogo=\{LOGO_DARK\}/);
});

test('inverse surfaces use opaque inverse text until a subtle token ships', () => {
  const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const footer = readFileSync(join(srcDir, 'components/shell/SiteFooter.astro'), 'utf8');
  const banner = readFileSync(join(srcDir, 'components/marketing/CtaBanner.astro'), 'utf8');
  assert.match(footer, /text-fg-inverse/);
  assert.doesNotMatch(footer, /class="[^"]*text-fg-subtle/);
  assert.match(footer, /--ssd-color-text-inverse-subtle/);
  assert.match(banner, /text-fg-inverse/);
  assert.doesNotMatch(banner, /class="[^"]*text-fg-subtle/);
  assert.match(banner, /--ssd-color-text-inverse-subtle/);
});

test('tokens stay pinned at 1.3.0', () => {
  const pkg = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf8'),
  );
  assert.equal(pkg.dependencies['@singleton-sd/tokens'], '1.3.0');
});
