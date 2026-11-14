import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  deriveIncrement,
  formatGitHubReleaseNotes,
  formatReleaseCommitMessage,
  isReleaseCommitMessage,
  parseReleaseTag,
  planRelease,
  shouldConfirmExistingPublication,
  shouldRetryPublication,
  tagNameFor,
  tagPushArgs,
  versionsFromTags,
} from './git-release.mjs';

const here = dirname(fileURLToPath(import.meta.url));

test('parseReleaseTag accepts package tags only', () => {
  assert.deepEqual(parseReleaseTag('@singleton-sd/marketing@0.7.1'), {
    tag: '@singleton-sd/marketing@0.7.1',
    version: '0.7.1',
  });
  assert.equal(parseReleaseTag('v0.8.0'), null);
  assert.equal(parseReleaseTag('@singleton-sd/marketing-oauth@0.2.0'), null);
  assert.equal(parseReleaseTag('main'), null);
});

test('versionsFromTags selects and semantically orders tags for one product', () => {
  assert.deepEqual(
    versionsFromTags('@singleton-sd/marketing', [
      '@singleton-sd/marketing-oauth@9.0.0',
      '@singleton-sd/marketing@0.10.0',
      '@singleton-sd/marketing@0.2.0',
      'v0.8.0',
    ]),
    [
      { tag: '@singleton-sd/marketing@0.2.0', version: '0.2.0' },
      { tag: '@singleton-sd/marketing@0.10.0', version: '0.10.0' },
    ],
  );
});

test('isReleaseCommitMessage matches chore(release) and [skip ci]', () => {
  assert.equal(isReleaseCommitMessage('chore(release): v0.8.0 [skip ci]'), true);
  assert.equal(isReleaseCommitMessage('chore(release): package versions\n\n- @singleton-sd/marketing@0.8.0'), true);
  assert.equal(isReleaseCommitMessage('feat: MKT-12 Add something [skip ci]'), true);
  assert.equal(isReleaseCommitMessage('chore: Release package versions'), true);
  assert.equal(isReleaseCommitMessage('feat: MKT-12 Add intake'), false);
});

test('formatReleaseCommitMessage uses chore(release) and [skip ci]', () => {
  assert.equal(
    formatReleaseCommitMessage([
      { name: '@singleton-sd/marketing', next: '0.8.0', tag: '@singleton-sd/marketing@0.8.0' },
    ]),
    'chore(release): v0.8.0 [skip ci]\n\n- @singleton-sd/marketing@0.8.0\n',
  );
  assert.equal(
    formatReleaseCommitMessage([
      { name: '@singleton-sd/marketing', next: '0.8.0', tag: '@singleton-sd/marketing@0.8.0' },
      { name: '@singleton-sd/other', next: '1.0.0', tag: '@singleton-sd/other@1.0.0' },
    ]),
    'chore(release): package versions [skip ci]\n\n- @singleton-sd/marketing@0.8.0\n- @singleton-sd/other@1.0.0\n',
  );
});

test('deriveIncrement skips release commits and ranks conventional types', () => {
  assert.equal(deriveIncrement(['chore: Release package versions', 'docs: Update README']), null);
  assert.equal(deriveIncrement(['chore(release): v0.8.0 [skip ci]', 'docs: Update README']), null);
  assert.equal(deriveIncrement(['fix: Patch form labels', 'feat: Add intake']), 'minor');
  assert.equal(deriveIncrement(['fix: Patch form labels']), 'patch');
  assert.equal(deriveIncrement(['feat!: Replace routing']), 'major');
});

test('deriveIncrement treats a breaking ! on any conventional type as major', () => {
  assert.equal(deriveIncrement(['chore!: Remove the old configuration']), 'major');
  assert.equal(deriveIncrement(['docs!: Rewrite auth']), 'major');
  assert.equal(deriveIncrement(['chore: tidy', 'feat: Add intake']), 'minor');
  assert.equal(
    deriveIncrement(['docs: Explain install\n\nBREAKING CHANGE: Clients must use /v2.']),
    'major',
  );
});

test('deriveIncrement classifies from the subject, not the body', () => {
  assert.equal(deriveIncrement(['fix: Correct help text\n\nfeat: Add intake']), 'patch');
  assert.equal(deriveIncrement(['docs: Explain install\n\nfeat: Add intake']), null);
});

test('shouldConfirmExistingPublication is a retry when the latest tag is HEAD', () => {
  const last = { tag: '@singleton-sd/marketing@0.8.0', version: '0.8.0' };
  const sha = 'abc123';
  assert.equal(shouldConfirmExistingPublication(last, sha, sha), true);
  assert.equal(shouldConfirmExistingPublication(last, sha, 'def456'), false);
  assert.equal(shouldConfirmExistingPublication(null, sha, sha), false);
  assert.equal(shouldConfirmExistingPublication(last, sha, null), false);
});

test('shouldRetryPublication also retries a release commit without a GitHub Release', () => {
  const last = { tag: '@singleton-sd/marketing@0.8.0', version: '0.8.0' };
  assert.equal(
    shouldRetryPublication('chore(release): v0.8.0 [skip ci]', last, 'abc', 'def'),
    true,
  );
  assert.equal(shouldRetryPublication('feat: MKT-12 Add intake', last, 'abc', 'def'), false);
  assert.equal(shouldRetryPublication('feat: MKT-12 Add intake', last, 'abc', 'abc'), true);
});

test('planRelease is empty when commits are not releasable', () => {
  assert.equal(
    planRelease({
      lastVersion: '0.7.1',
      messages: ['docs: Update README', 'chore: tidy', 'test: Cover footer'],
      tags: ['@singleton-sd/marketing@0.7.1'],
    }).kind,
    'empty',
  );
});

test('planRelease bumps the package tag and never names a branch', () => {
  const planned = planRelease({
    lastVersion: '0.7.1',
    messages: ['feat: MKT-17 Add lead intake\n\nVisitors can request a callback.'],
    tags: ['@singleton-sd/marketing@0.7.1'],
  });
  assert.equal(planned.kind, 'release');
  if (planned.kind !== 'release') return;
  assert.equal(planned.tag, '@singleton-sd/marketing@0.8.0');
  assert.equal(planned.increment, 'minor');
  assert.equal(planned.version, '0.8.0');
  assert.match(planned.notes, /# v0\.8\.0/);
  assert.match(planned.notes, /Add lead intake/);
  assert.deepEqual(tagPushArgs(planned.tag), [
    'push',
    'origin',
    'refs/tags/@singleton-sd/marketing@0.8.0',
  ]);
});

test('planRelease skips already-tagged versions', () => {
  const planned = planRelease({
    lastVersion: '0.7.1',
    messages: ['feat: Add something'],
    tags: ['@singleton-sd/marketing@0.7.1', '@singleton-sd/marketing@0.8.0'],
  });
  assert.equal(planned.kind, 'release');
  if (planned.kind !== 'release') return;
  assert.equal(planned.tag, '@singleton-sd/marketing@0.9.0');
});

test('tagPushArgs refuses branches and non-package tags', () => {
  assert.throws(() => tagPushArgs('main'), /branch ref/);
  assert.throws(() => tagPushArgs('HEAD:main'), /branch ref/);
  assert.throws(() => tagPushArgs('refs/heads/main'), /branch ref/);
  assert.throws(() => tagPushArgs('v0.8.0'), /non package-version tag/);
  assert.throws(() => tagNameFor('0.0.0-development', '1.0.0'), /Unexpected package name/);
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

test('tag push helpers never push a branch', () => {
  const files = ['git-release.mjs'];
  for (const relative of files) {
    const source = readFileSync(join(here, relative), 'utf8');
    assert.doesNotMatch(source, /HEAD:main/);
    assert.doesNotMatch(source, /git push origin main/);
  }
});
