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

test('Decap GitHub backend uses API gateway cms-auth', () => {
  const yaml = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../public/admin/config.yml'),
    'utf8',
  );
  assert.match(yaml, /^  repo: singleton-sd\/marketing$/m);
  assert.match(yaml, /^  base_url: https:\/\/api\.singletonsd\.com$/m);
  assert.match(yaml, /^  auth_endpoint: v1\/cms-auth\/auth$/m);
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
