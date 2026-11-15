import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  collectMatches,
  definedSsdVars,
  missingSsdVars,
  parseArgs,
  siteSourceFiles,
  usedSsdVars,
  VAR_DECL_RE,
  VAR_USE_RE,
} from './check-ssd-vars.mjs';

test('collectMatches finds var() uses and declarations', () => {
  assert.deepEqual(
    [...collectMatches('color: var(--ssd-color-text-link);', VAR_USE_RE)],
    ['--ssd-color-text-link'],
  );
  assert.deepEqual(
    [...collectMatches('--ssd-color-text-link: #abc;', VAR_DECL_RE)],
    ['--ssd-color-text-link'],
  );
  assert.equal(
    collectMatches('Move to --ssd-color-text-inverse-subtle later.', VAR_USE_RE).size,
    0,
  );
});

test('missingSsdVars reports used names the package does not declare', () => {
  const root = mkdtempSync(join(tmpdir(), 'mkt-ssd-vars-'));
  try {
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src', 'a.css'), 'color: var(--ssd-color-text-link);');
    writeFileSync(join(root, 'src', 'b.css'), 'outline-color: var(--ssd-missing);');
    writeFileSync(join(root, 'tokens.css'), '--ssd-color-text-link: #abc;');
    const used = usedSsdVars([join(root, 'src', 'a.css'), join(root, 'src', 'b.css')]);
    const defined = definedSsdVars([join(root, 'tokens.css')]);
    assert.deepEqual(missingSsdVars(used, defined), ['--ssd-missing']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('siteSourceFiles discovers src and public files and skips vendor', () => {
  const root = mkdtempSync(join(tmpdir(), 'mkt-ssd-src-'));
  try {
    mkdirSync(join(root, 'src'), { recursive: true });
    mkdirSync(join(root, 'public', 'vendor'), { recursive: true });
    writeFileSync(join(root, 'src', 'a.css'), 'color: var(--ssd-color-text-link);');
    writeFileSync(join(root, 'public', 'ok.css'), 'color: var(--ssd-color-text-muted);');
    writeFileSync(join(root, 'public', 'vendor', 'tokens.css'), 'color: var(--ssd-missing);');
    writeFileSync(join(root, 'tailwind.config.mjs'), 'colors: { fg: "var(--ssd-color-text-default)" }');
    const files = siteSourceFiles(root);
    assert.equal(files.some((filePath) => filePath.endsWith(`${join('src', 'a.css')}`)), true);
    assert.equal(files.some((filePath) => filePath.endsWith(`${join('public', 'ok.css')}`)), true);
    assert.equal(files.some((filePath) => filePath.includes(`${join('vendor', 'tokens.css')}`)), false);
    assert.equal(files.some((filePath) => filePath.endsWith('tailwind.config.mjs')), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('parseArgs rejects unknown flags and --tokens with no value', () => {
  assert.throws(() => parseArgs(['--unknown']), /Unknown flag: --unknown/);
  assert.throws(() => parseArgs(['--tokens']), /--tokens requires a value/);
  assert.throws(() => parseArgs(['--tokens', '--app']), /--tokens requires a value/);
  assert.deepEqual(parseArgs(['--tokens', '/tmp/tokens.css']), {
    tokenCss: ['/tmp/tokens.css'],
  });
});

test('CLI exits nonzero when a discovered source uses an undefined token', () => {
  const root = mkdtempSync(join(tmpdir(), 'mkt-ssd-cli-'));
  try {
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src', 'a.css'), 'color: var(--ssd-missing);');
    const tokens = join(root, 'tokens.css');
    writeFileSync(tokens, '--ssd-color-text-link: #abc;');
    const script = join(dirname(fileURLToPath(import.meta.url)), 'check-ssd-vars.mjs');
    const result = spawnSync(process.execPath, [script, '--app', root, '--tokens', tokens], {
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--ssd-missing/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
