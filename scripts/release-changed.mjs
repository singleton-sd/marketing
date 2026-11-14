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
  PRODUCT,
  ROOT,
  deriveIncrement,
  describeSiteVersion,
  formatGitHubReleaseNotes,
  getCommitMessages,
  getCommitMessagesBetween,
  isAncestorOfHead,
  latestReachableRelease,
  listGitTags,
  planRelease,
  runGit,
  shouldConfirmExistingPublication,
  tagPushArgs,
  versionsFromTags,
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

/**
 * @param {string} tag
 */
function commitForTag(tag) {
  try {
    return runGit(['rev-parse', `${tag}^{commit}`]);
  } catch {
    return null;
  }
}

/**
 * @param {string} tag
 */
function githubReleaseExists(tag) {
  try {
    run('gh', ['release', 'view', tag, '--json', 'tagName']);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} tag
 * @param {string} notes
 */
function ensureGitHubRelease(tag, notes) {
  if (githubReleaseExists(tag)) {
    console.log(`GitHub Release ${tag} already exists.`);
    return;
  }
  run('gh', [
    'release',
    'create',
    tag,
    '--title',
    tag,
    '--notes',
    notes,
    '--verify-tag',
  ]);
}

/**
 * @param {string} tag
 * @param {string} sha
 */
function ensureAnnotatedTag(tag, sha) {
  const existing = commitForTag(tag);
  if (existing && existing !== sha) {
    throw new Error(`Tag ${tag} points at ${existing}, expected ${sha}`);
  }
  if (!existing) {
    runGit(['tag', '-a', tag, '-m', tag, sha]);
  }
  run('git', tagPushArgs(tag));
}

/**
 * @param {{ tag: string, version: string }} last
 * @param {string[]} tags
 */
function notesForExistingTag(last, tags) {
  const reachable = versionsFromTags(PRODUCT, tags).filter((entry) => isAncestorOfHead(entry.tag));
  const index = reachable.findIndex((entry) => entry.version === last.version);
  const previous = index > 0 ? reachable[index - 1] : null;
  const messages = getCommitMessagesBetween(
    previous?.tag ?? null,
    last.tag,
    MARKETING_WATCH_PATHS,
  );
  return formatGitHubReleaseNotes(last.version, messages, deriveIncrement(messages));
}

/**
 * @param {{ tag: string, version: string }} last
 * @param {string[]} tags
 * @returns {boolean} true when CI confirmed the GitHub Release (dispatch Pages)
 */
function confirmExistingPublication(last, tags) {
  const notes = notesForExistingTag(last, tags);
  if (!CI) {
    console.log(`HEAD is already ${last.tag}; would confirm GitHub Release.`);
    console.log('\nNotes:\n');
    console.log(notes);
    return false;
  }
  ensureGitHubRelease(last.tag, notes);
  console.log(`Confirmed GitHub Release ${last.tag}.`);
  setOutput('released', 'true');
  setOutput('tag', last.tag);
  return true;
}

function main() {
  if (CI) {
    syncToOriginMain();
  }

  const tags = listGitTags();
  const last = latestReachableRelease(tags);
  const headSha = runGit(['rev-parse', 'HEAD']);
  const lastTagSha = last ? commitForTag(last.tag) : null;

  if (last && shouldConfirmExistingPublication(last, headSha, lastTagSha)) {
    confirmExistingPublication(last, tags);
    return;
  }

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
  ensureAnnotatedTag(planned.tag, headSha);
  ensureGitHubRelease(planned.tag, planned.notes);

  console.log(`Tagged and published GitHub Release ${planned.tag}.`);
  setOutput('released', 'true');
  setOutput('tag', planned.tag);
}

main();
