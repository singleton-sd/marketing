import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const previewYml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../.github/workflows/preview.yml'),
  'utf8',
);

function jobBlock(name) {
  const match = previewYml.match(
    new RegExp(`(?:^|\\n)  ${name}:\\n([\\s\\S]*?)(?=\\n  [a-z][\\w-]*:|$)`),
  );
  assert.ok(match, `expected job ${name}`);
  return match[1];
}

test('hide-comment re-checks current PR state before hiding', () => {
  const hide = jobBlock('hide-comment');
  const stateIdx = hide.indexOf("data.state === 'closed'");
  const hideIdx = hide.indexOf('hide: true');
  assert.match(hide, /github\.rest\.pulls\.get/);
  assert.notEqual(stateIdx, -1);
  assert.notEqual(hideIdx, -1);
  assert.ok(stateIdx < hideIdx, 'live state check must run before hide');
  assert.match(hide, /if: steps\.pr_state\.outputs\.closed == 'true'/);
});
