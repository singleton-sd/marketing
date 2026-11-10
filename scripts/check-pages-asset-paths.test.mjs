import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  collectPagesPathErrors,
  urlToDistRelative,
} from './check-pages-asset-paths.mjs';

/**
 * @param {Record<string, string>} files
 * @returns {string}
 */
function writeDist(files) {
  const root = mkdtempSync(join(tmpdir(), 'mkt-pages-paths-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

const REQUIRED = {
  '.nojekyll': '',
  CNAME: 'www.singletonsd.com\n',
  '404.html': '<!doctype html><title>404</title>',
  'admin/index.html': '<!doctype html><link rel="stylesheet" href="admin.css" />',
  'admin/admin.css': 'body{}',
  '_astro/index.css': 'body{color:red}',
};

test('urlToDistRelative strips production and preview bases', () => {
  assert.equal(urlToDistRelative('/_astro/index.css', '/'), '_astro/index.css');
  assert.equal(
    urlToDistRelative('/pr-preview/pr-4/_astro/index.css', '/pr-preview/pr-4/'),
    '_astro/index.css',
  );
  assert.equal(
    urlToDistRelative('./admin.css', '/', 'admin/index.html'),
    'admin/admin.css',
  );
  assert.equal(urlToDistRelative('https://assets.singletonsd.com/logo.png', '/'), null);
});

test('collectPagesPathErrors accepts a production-shaped dist', () => {
  const dist = writeDist({
    ...REQUIRED,
    'index.html': '<!doctype html><link rel="stylesheet" href="/_astro/index.css" />',
  });
  try {
    assert.deepEqual(collectPagesPathErrors(dist, '/'), []);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('collectPagesPathErrors accepts a preview-shaped dist', () => {
  const dist = writeDist({
    ...REQUIRED,
    'index.html':
      '<!doctype html><link rel="stylesheet" href="/pr-preview/pr-4/_astro/index.css" />',
  });
  try {
    assert.deepEqual(collectPagesPathErrors(dist, '/pr-preview/pr-4/'), []);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('collectPagesPathErrors rejects root-absolute Astro assets under a preview base', () => {
  const dist = writeDist({
    ...REQUIRED,
    'index.html': '<!doctype html><link rel="stylesheet" href="/_astro/index.css" />',
  });
  try {
    const errors = collectPagesPathErrors(dist, '/pr-preview/pr-4/');
    assert.ok(errors.some((line) => line.includes('not prefixed')));
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});
