import assert from 'node:assert/strict';
import test from 'node:test';
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
