import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertCompleteTagHistory,
  validateBackfillCoverage,
  versionsFromTags,
} from './backfill-client-changelogs.mjs';

test('selects and semantically orders tags for one product', () => {
  assert.deepEqual(
    versionsFromTags('@singleton-sd/marketing', [
      '@singleton-sd/marketing-oauth@9.0.0',
      '@singleton-sd/marketing@0.10.0',
      '@singleton-sd/marketing@0.2.0',
      '@singleton-sd/marketing@invalid',
    ]),
    [
      { tag: '@singleton-sd/marketing@0.2.0', version: '0.2.0' },
      { tag: '@singleton-sd/marketing@0.10.0', version: '0.10.0' },
    ],
  );
});

test('rejects a partial clone before it can truncate existing history', () => {
  assert.throws(
    () =>
      assertCompleteTagHistory(
        '@singleton-sd/marketing',
        [{ version: '1.0.0' }, { version: '0.9.0' }],
        [{ version: '1.0.0' }],
      ),
    /missing 0\.9\.0.*git fetch origin --tags/,
  );
});

test('accepts tags covering every existing release', () => {
  assert.doesNotThrow(() =>
    assertCompleteTagHistory(
      '@singleton-sd/marketing',
      [{ version: '1.0.0' }],
      [{ version: '0.9.0' }, { version: '1.0.0' }],
    ),
  );
});

test('preflights every product before any history rewrite can begin', () => {
  const reads = [];
  assert.throws(
    () =>
      validateBackfillCoverage(
        ['@singleton-sd/marketing@1.0.0'],
        (relativePath) => {
          reads.push(relativePath);
          return '# Changelog\n\n## 1.0.0 — 2026-01-01\n\n### New\n\n- Add release history\n\n## 0.9.0 — 2025-12-01\n\n### Fixed\n\n- Patch filters\n';
        },
      ),
    /@singleton-sd\/marketing.*missing 0\.9\.0/,
  );
  assert.deepEqual(reads, ['apps/marketing/CHANGELOG.md']);
});
