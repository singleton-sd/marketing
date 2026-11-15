import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  collectMatches,
  definedSsdVars,
  missingSsdVars,
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
