import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  displayVersionFromDescribe,
  latestReachableRelease,
} from '../../../../scripts/git-release.mjs';
import { siteVersion } from './site-version.mjs';

const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../package.json'), 'utf8'),
);

test('package.json version is a placeholder, not the released version', () => {
  assert.equal(pkg.version, '0.0.0-development');
});

test('siteVersion comes from git describe, not package.json', () => {
  const version = siteVersion();
  if (!latestReachableRelease()) {
    assert.equal(version, '0.0.0-development');
    assert.equal(version, pkg.version);
    return;
  }
  assert.notEqual(version, pkg.version);
  assert.match(version, /^\d+\.\d+\.\d+/);
});

test('displayVersionFromDescribe never returns the package.json placeholder for a real tag', () => {
  assert.equal(displayVersionFromDescribe('v0.8.0'), '0.8.0');
  assert.notEqual(displayVersionFromDescribe('v0.8.0'), pkg.version);
});
