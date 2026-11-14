import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  deriveIncrement,
  displayVersionFromDescribe,
  formatGitHubReleaseNotes,
  parseReleaseTag,
  planRelease,
  tagNameFor,
  tagPushArgs,
  versionsFromTags,
} from './git-release.mjs';

const here = dirname(fileURLToPath(import.meta.url));

test('parseReleaseTag accepts vX.Y.Z and legacy product tags', () => {
  assert.deepEqual(parseReleaseTag('v0.8.0'), { tag: 'v0.8.0', version: '0.8.0' });
  assert.deepEqual(parseReleaseTag('@singleton-sd/marketing@0.7.1'), {
    tag: '@singleton-sd/marketing@0.7.1',
    version: '0.7.1',
  });
  assert.equal(parseReleaseTag('@singleton-sd/marketing-oauth@0.2.0'), null);
  assert.equal(parseReleaseTag('main'), null);
  assert.equal(parseReleaseTag('v0.8.0-rc.1'), null);
});

test('versionsFromTags prefers vX.Y.Z when both formats exist', () => {
  assert.deepEqual(
    versionsFromTags('@singleton-sd/marketing', [
      '@singleton-sd/marketing-oauth@9.0.0',
      '@singleton-sd/marketing@0.7.1',
      'v0.7.1',
      '@singleton-sd/marketing@0.2.0',
      'v0.8.0',
    ]),
    [
      { tag: '@singleton-sd/marketing@0.2.0', version: '0.2.0' },
      { tag: 'v0.7.1', version: '0.7.1' },
      { tag: 'v0.8.0', version: '0.8.0' },
    ],
  );
});

test('displayVersionFromDescribe strips tag prefixes and keeps git describe suffixes', () => {
  assert.equal(displayVersionFromDescribe('v0.8.0'), '0.8.0');
  assert.equal(displayVersionFromDescribe('v0.8.0-3-gabcdef1'), '0.8.0-3-gabcdef1');
  assert.equal(displayVersionFromDescribe('@singleton-sd/marketing@0.7.1'), '0.7.1');
  assert.equal(
    displayVersionFromDescribe('@singleton-sd/marketing@0.7.1-2-gabc1234'),
    '0.7.1-2-gabc1234',
  );
  assert.equal(displayVersionFromDescribe(''), '0.0.0-development');
});

test('deriveIncrement skips release commits and ranks conventional types', () => {
  assert.equal(deriveIncrement(['chore: Release package versions', 'docs: Update README']), null);
  assert.equal(deriveIncrement(['fix: Patch form labels', 'feat: Add intake']), 'minor');
  assert.equal(deriveIncrement(['fix: Patch form labels']), 'patch');
  assert.equal(deriveIncrement(['feat!: Replace routing']), 'major');
});

test('planRelease is tag-only and never names a branch', () => {
  const planned = planRelease({
    lastVersion: '0.7.1',
    messages: ['feat: MKT-17 Add lead intake\n\nVisitors can request a callback.'],
    tags: ['@singleton-sd/marketing@0.7.1'],
  });
  assert.equal(planned.kind, 'release');
  if (planned.kind !== 'release') return;
  assert.equal(planned.tag, 'v0.8.0');
  assert.equal(planned.increment, 'minor');
  assert.equal(planned.version, '0.8.0');
  assert.match(planned.notes, /# v0\.8\.0/);
  assert.match(planned.notes, /Add lead intake/);
  assert.deepEqual(tagPushArgs(planned.tag), ['push', 'origin', 'refs/tags/v0.8.0']);
});

test('planRelease skips already-tagged versions', () => {
  const planned = planRelease({
    lastVersion: '0.7.1',
    messages: ['feat: Add something'],
    tags: ['@singleton-sd/marketing@0.7.1', 'v0.8.0'],
  });
  assert.equal(planned.kind, 'release');
  if (planned.kind !== 'release') return;
  assert.equal(planned.tag, 'v0.9.0');
});

test('tagPushArgs refuses branches and non-semver tags', () => {
  assert.throws(() => tagPushArgs('main'), /non vX\.Y\.Z/);
  assert.throws(() => tagPushArgs('HEAD:main'), /non vX\.Y\.Z/);
  assert.throws(() => tagPushArgs('refs/heads/main'), /non vX\.Y\.Z/);
  assert.throws(() => tagPushArgs('@singleton-sd/marketing@0.8.0'), /non vX\.Y\.Z/);
  assert.throws(() => tagNameFor('0.0.0-development'), /Invalid stable version/);
});

test('formatGitHubReleaseNotes groups client-facing changes', () => {
  const notes = formatGitHubReleaseNotes(
    '0.8.0',
    ['feat: MKT-17 Add lead intake\n\nVisitors can request a callback.', 'fix: Correct footer link'],
    'minor',
  );
  assert.match(notes, /Semantic bump: \*\*minor\*\*/);
  assert.match(notes, /## New/);
  assert.match(notes, /## Fixed/);
});

test('release tooling never pushes to main', () => {
  const files = ['git-release.mjs', 'release-changed.mjs', '../.github/workflows/release.yml'];
  for (const relative of files) {
    const source = readFileSync(join(here, relative), 'utf8');
    assert.doesNotMatch(source, /HEAD:main/);
    assert.doesNotMatch(source, /git push origin main/);
    assert.doesNotMatch(source, /['"]main['"].*git push|push.*origin['"] main/);
  }
});
