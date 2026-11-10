import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import {
  PRODUCTION_CNAME,
  checkPagesDist,
  findRootAbsoluteUrlsMissingBase,
  htmlIncludesBasePath,
  normalizeBase,
  parseCheckPagesArgs,
} from './check-pages-dist.mjs';

/**
 * @param {Record<string, string>} files
 * @returns {string}
 */
function writeDist(files) {
  const root = mkdtempSync(join(tmpdir(), 'mkt-pages-dist-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

function validTree(base = '/') {
  const prefix = base === '/' ? '' : base.replace(/\/$/, '');
  return {
    CNAME: `${PRODUCTION_CNAME}\n`,
    '.nojekyll': '',
    '404.html': `<a href="${prefix}/">home</a>`,
    'index.html': `<link rel="stylesheet" href="${prefix}/_astro/index.css" /><a href="${prefix}/services">Services</a>`,
    'admin/index.html': '<link href="config.yml" rel="cms-config-url" />',
  };
}

test('normalizeBase always ends with a slash', () => {
  assert.equal(normalizeBase('/'), '/');
  assert.equal(normalizeBase('/pr-preview/pr-9/'), '/pr-preview/pr-9/');
  assert.equal(normalizeBase('/pr-preview/pr-9'), '/pr-preview/pr-9/');
});

test('parseCheckPagesArgs reads dist and --base', () => {
  assert.deepEqual(parseCheckPagesArgs(['./dist', '--base', '/preview/']), {
    distDir: './dist',
    base: '/preview/',
  });
  assert.deepEqual(parseCheckPagesArgs(['--base=/preview/']), {
    distDir: undefined,
    base: '/preview/',
  });
});

test('findRootAbsoluteUrlsMissingBase ignores production root base', () => {
  assert.deepEqual(findRootAbsoluteUrlsMissingBase('<a href="/services">x</a>', '/'), []);
});

test('findRootAbsoluteUrlsMissingBase flags hrefs that skip the preview base', () => {
  const base = '/pr-preview/pr-9/';
  assert.deepEqual(
    findRootAbsoluteUrlsMissingBase('<a href="/services">x</a><link href="/_astro/x.css" />', base),
    ['/services', '/_astro/x.css'],
  );
  assert.deepEqual(
    findRootAbsoluteUrlsMissingBase(
      '<a href="/pr-preview/pr-9/services">x</a><link href="/pr-preview/pr-9/_astro/x.css" />',
      base,
    ),
    [],
  );
});

test('htmlIncludesBasePath requires the preview prefix', () => {
  assert.equal(htmlIncludesBasePath('<a href="/services">x</a>', '/'), true);
  assert.equal(htmlIncludesBasePath('<a href="/pr-preview/pr-9/">x</a>', '/pr-preview/pr-9/'), true);
  assert.equal(htmlIncludesBasePath('<a href="/services">x</a>', '/pr-preview/pr-9/'), false);
});

test('checkPagesDist accepts a valid production tree', () => {
  const dist = writeDist(validTree());
  try {
    assert.doesNotThrow(() => checkPagesDist(dist, { base: '/' }));
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('checkPagesDist requires CNAME www.singletonsd.com', () => {
  const dist = writeDist({ ...validTree(), CNAME: 'example.com\n' });
  try {
    assert.throws(() => checkPagesDist(dist, { base: '/' }), /CNAME is "example.com"/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('checkPagesDist requires 404.html and .nojekyll', () => {
  const files = validTree();
  delete files['404.html'];
  delete files['.nojekyll'];
  const dist = writeDist(files);
  try {
    assert.throws(() => checkPagesDist(dist, { base: '/' }), /Missing 404\.html/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('checkPagesDist accepts a preview-base tree and rejects root-absolute links', () => {
  const base = '/pr-preview/pr-9/';
  const dist = writeDist(validTree(base));
  try {
    assert.doesNotThrow(() => checkPagesDist(dist, { base }));
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }

  const broken = writeDist(validTree('/'));
  try {
    assert.throws(
      () => checkPagesDist(broken, { base }),
      /root-absolute URL\(s\) missing base/,
    );
  } finally {
    rmSync(broken, { recursive: true, force: true });
  }
});
