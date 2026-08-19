import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import {
  cssHasLegacyFgVars,
  htmlHasTokenCdnLink,
  missingRequiredSsdVars,
  smokeMarketingTokens,
} from './smoke-tokens.mjs';

/**
 * @param {Record<string, string>} files
 * @returns {string} temp dist dir
 */
function writeDist(files) {
  const root = mkdtempSync(join(tmpdir(), 'mkt-token-smoke-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

const VALID_SITE_CSS = `
:root {
  --ssd-color-text-default: #111;
  --ssd-color-background-default: #fff;
}
.text-fg { color: var(--ssd-color-text-default); }
`;

const VALID_VENDOR_CSS = `
[data-theme="dark"] {
  --ssd-color-text-default: #eee;
  --ssd-color-background-default: #111;
}
`;

const VALID_HTML = `<!doctype html><html><link rel="stylesheet" href="/_astro/index.css" /></html>`;

const VALID_ADMIN_HTML = `<!doctype html>
<html>
  <link rel="stylesheet" href="/admin/vendor/tokens-dark.css" />
</html>
`;

/**
 * @returns {Record<string, string>}
 */
function validTree() {
  return {
    '_astro/index.css': VALID_SITE_CSS,
    'index.html': VALID_HTML,
    'admin/index.html': VALID_ADMIN_HTML,
    'admin/vendor/tokens-dark.css': VALID_VENDOR_CSS,
    'admin/vendor/tokens-root-dark.css': VALID_VENDOR_CSS,
  };
}

test('missingRequiredSsdVars reports unpublished keys', () => {
  assert.deepEqual(missingRequiredSsdVars('--ssd-color-text-default: #111;'), [
    '--ssd-color-background-default',
  ]);
  assert.deepEqual(
    missingRequiredSsdVars(
      '--ssd-color-text-default: #111; --ssd-color-background-default: #fff;',
    ),
    [],
  );
});

test('cssHasLegacyFgVars ignores product .text-fg and --pk-fg', () => {
  assert.equal(cssHasLegacyFgVars('.text-fg { color: var(--ssd-color-text-default); }'), false);
  assert.equal(cssHasLegacyFgVars('--pk-fg: var(--ssd-color-text-default);'), false);
  assert.equal(cssHasLegacyFgVars('--fg-text: #111;'), true);
});

test('htmlHasTokenCdnLink detects token gallery host', () => {
  assert.equal(htmlHasTokenCdnLink('<link href="https://assets.singletonsd.com/x.css" />'), false);
  assert.equal(
    htmlHasTokenCdnLink('<link href="https://tokens.design.singletonsd.com/css/dark.css" />'),
    true,
  );
});

test('smokeMarketingTokens accepts a valid dist tree', () => {
  const dist = writeDist(validTree());
  try {
    assert.doesNotThrow(() => smokeMarketingTokens(dist));
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('smokeMarketingTokens fails when dist is missing', () => {
  assert.throws(
    () => smokeMarketingTokens(join(tmpdir(), 'mkt-token-smoke-missing-dist')),
    /Marketing dist not found/,
  );
});

test('smokeMarketingTokens fails when site CSS lacks --ssd- vars', () => {
  const dist = writeDist({
    ...validTree(),
    '_astro/index.css': '.text-fg { color: black; }',
  });
  try {
    assert.throws(
      () => smokeMarketingTokens(dist),
      /missing published token vars: --ssd-color-text-default, --ssd-color-background-default/,
    );
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('smokeMarketingTokens fails when CSS uses legacy --fg- vars', () => {
  const dist = writeDist({
    ...validTree(),
    '_astro/index.css': `${VALID_SITE_CSS}\n--fg-text: #111;`,
  });
  try {
    assert.throws(() => smokeMarketingTokens(dist), /legacy --fg- custom properties/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('smokeMarketingTokens fails when HTML loads the token CDN', () => {
  const dist = writeDist({
    ...validTree(),
    'index.html':
      '<link rel="stylesheet" href="https://tokens.design.singletonsd.com/css/dark.css" />',
  });
  try {
    assert.throws(() => smokeMarketingTokens(dist), /tokens\.design\.singletonsd\.com/);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('smokeMarketingTokens fails when vendored token CSS is missing', () => {
  const files = validTree();
  delete files['admin/vendor/tokens-dark.css'];
  const dist = writeDist(files);
  try {
    assert.throws(
      () => smokeMarketingTokens(dist),
      /Missing or empty vendored token CSS under admin\/vendor: tokens-dark\.css/,
    );
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});
