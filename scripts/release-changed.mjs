#!/usr/bin/env node
/**
 * Tag-only product releases. Never commits, and never pushes a branch
 * (including `main`).
 *
 * Usage:
 *   node scripts/release-changed.mjs           # dry-run
 *   node scripts/release-changed.mjs --ci      # annotated vX.Y.Z tag + GitHub Release
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import {
  MARKETING_WATCH_PATHS,
  ROOT,
  describeSiteVersion,
  getCommitMessages,
  latestReachableRelease,
  listGitTags,
  planRelease,
  runGit,
  tagPushArgs,
} from './git-release.mjs';

const CI = process.argv.includes('--ci');

/**
 * @param {string} name
 * @param {string} value
 */
function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  appendFileSync(file, `${name}=${value}\n`);
}

/**
 * @param {string} file
 * @param {string[]} args
 */
function run(file, args) {
  return execFileSync(file, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function assertCleanWorktree() {
  const dirty = runGit(['status', '--porcelain']);
  if (dirty) {
    throw new Error('Refusing to tag a dirty worktree.');
  }
}

function syncToOriginMain() {
  runGit(['fetch', 'origin', 'main', '--tags']);
  const head = runGit(['rev-parse', 'HEAD']);
  const main = runGit(['rev-parse', 'origin/main']);
  if (head === main) return;
  console.log(`Updating HEAD ${head.slice(0, 7)} → origin/main ${main.slice(0, 7)}`);
  runGit(['reset', '--hard', 'origin/main']);
}

function main() {
  if (CI) {
    syncToOriginMain();
  }

  const tags = listGitTags();
  const last = latestReachableRelease(tags);
  const messages = getCommitMessages(last?.tag ?? null, MARKETING_WATCH_PATHS);
  const planned = planRelease({
    lastVersion: last?.version ?? '0.0.0',
    messages,
    tags,
  });

  if (planned.kind === 'empty') {
    console.log('Nothing to release.');
    setOutput('released', 'false');
    return;
  }

  const from = last?.tag ?? 'untagged';
  console.log(
    CI
      ? `Releasing ${planned.tag} (${planned.increment}) from ${from}`
      : `Dry-run — would release ${planned.tag} (${planned.increment}) from ${from}`,
  );
  console.log(`  site version now: ${describeSiteVersion()}`);

  if (!CI) {
    console.log('\nRe-run with --ci to create the annotated tag and GitHub Release.');
    console.log('\nNotes:\n');
    console.log(planned.notes);
    return;
  }

  assertCleanWorktree();

  const sha = runGit(['rev-parse', 'HEAD']);
  runGit(['tag', '-a', planned.tag, '-m', planned.tag, sha]);
  run('git', tagPushArgs(planned.tag));
  run('gh', [
    'release',
    'create',
    planned.tag,
    '--title',
    planned.tag,
    '--notes',
    planned.notes,
    '--verify-tag',
  ]);

  console.log(`Tagged and published GitHub Release ${planned.tag}.`);
  setOutput('released', 'true');
  setOutput('tag', planned.tag);
}

main();
