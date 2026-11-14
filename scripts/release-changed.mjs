#!/usr/bin/env node
/**
 * Path-aware independent releases for the pnpm monorepo.
 *
 * Bumps each workspace package that has releasable conventional commits since
 * its last `@scope/name@version` tag (reachable from HEAD), then creates one
 * git commit + per-package tags + GitHub Releases.
 *
 * Push order is commit-then-tags (never `--follow-tags`): a non-fast-forward
 * race must not publish tags without the release commit on main.
 *
 * Usage:
 *   node scripts/release-changed.mjs           # dry-run
 *   node scripts/release-changed.mjs --ci      # bump, commit, tag, push, GitHub Release
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import semver from 'semver';
import { CLIENT_CHANGELOG_TARGETS, updateClientChangelogs } from './client-changelog.mjs';
import {
  PACKAGE_PREFIX,
  PRODUCT,
  ROOT,
  deriveIncrement,
  formatGitHubReleaseNotes,
  formatReleaseCommitMessage,
  getCommitMessages,
  getCommitMessagesBetween,
  isAncestorOfHead,
  latestReachableRelease,
  listGitTags,
  nextFreeVersion,
  pushCommitToMain,
  runGit,
  selectRetryTargets,
  tagNameFor,
  tagPushArgs,
  versionsFromTags,
} from './git-release.mjs';

const CI = process.argv.includes('--ci');

/** @typedef {'major' | 'minor' | 'patch'} Increment */

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
 * @param {import('node:child_process').ExecFileSyncOptions} [options]
 */
function run(file, args, options = {}) {
  return execFileSync(file, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

/**
 * @returns {{ name: string, path: string, version: string }[]}
 */
function listWorkspacePackages() {
  const raw = run('pnpm', ['m', 'ls', '--json', '-r', '--depth', '-1']);
  /** @type {unknown} */
  const parsed = JSON.parse(raw || '[]');
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list
    .filter(
      (pkg) =>
        pkg &&
        typeof pkg === 'object' &&
        'name' in pkg &&
        typeof pkg.name === 'string' &&
        pkg.name.startsWith(PACKAGE_PREFIX) &&
        'path' in pkg &&
        typeof pkg.path === 'string',
    )
    .map((pkg) => {
      const pkgJsonPath = join(pkg.path, 'package.json');
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
      return {
        name: pkg.name,
        path: pkg.path,
        version: typeof pkgJson.version === 'string' ? pkgJson.version : '0.0.0',
      };
    });
}

/**
 * @param {string} packageName
 * @param {string[]} tags
 * @returns {string | null}
 */
function getLastTag(packageName, tags) {
  const reachable = versionsFromTags(packageName, tags).filter((entry) =>
    isAncestorOfHead(entry.tag),
  );
  return reachable.at(-1)?.tag ?? null;
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
 * Paths whose commits should count toward a package bump.
 * @param {{ name: string, path: string }} pkg
 * @returns {string[]}
 */
function watchPathsFor(pkg) {
  const rel = relative(ROOT, pkg.path).replace(/\\/g, '/');
  const paths = [rel];

  if (pkg.name === PRODUCT) {
    paths.push('infra/marketing.bicep', 'infra/global.bicep');
  }

  return paths;
}

/**
 * @param {string} packageName
 * @param {string} packageVersion
 * @param {string | null} lastTag
 * @param {Increment} increment
 * @param {string[]} tags
 * @returns {{ base: string, next: string, tag: string }}
 */
function resolveNextVersion(packageName, packageVersion, lastTag, increment, tags) {
  const tagVersion = lastTag ? versionsFromTags(packageName, [lastTag])[0]?.version : null;
  const candidates = [packageVersion, tagVersion].filter(
    (version) => typeof version === 'string' && Boolean(semver.valid(version)),
  );
  const from = candidates.length > 0 ? candidates.sort(semver.rcompare)[0] : '0.0.0';
  const next = nextFreeVersion(from, increment, tags, packageName);
  return { base: from, next, tag: tagNameFor(packageName, next) };
}

/**
 * @param {{ name: string, version: string, next: string, increment: Increment }[]} releases
 */
function updateChangelog(releases) {
  const changelogPath = join(ROOT, 'CHANGELOG.md');
  const date = new Date().toISOString().slice(0, 10);
  const section = [
    `## ${date}`,
    '',
    ...releases.map((release) => {
      const target = CLIENT_CHANGELOG_TARGETS[release.name];
      const name = target ? `[${release.name}](${target.markdown})` : release.name;
      return `- **${name}** \`${release.version}\` → \`${release.next}\` (${release.increment})`;
    }),
    '',
  ].join('\n');

  if (existsSync(changelogPath)) {
    const existing = readFileSync(changelogPath, 'utf8');
    const withoutHeader = existing.replace(/^# Changelog\r?\n\r?\n?/, '');
    writeFileSync(changelogPath, `# Changelog\n\n${section}${withoutHeader}`);
  } else {
    writeFileSync(changelogPath, `# Changelog\n\n${section}`);
  }
}

/**
 * @param {string} packagePath
 * @param {string} version
 */
function writePackageVersion(packagePath, version) {
  const pkgJsonPath = join(packagePath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  pkg.version = version;
  writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
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
 * @param {{ name: string, version: string, tag: string, path: string }} pkg
 * @param {string[]} tags
 */
function notesForPackage(pkg, tags) {
  const previous = versionsFromTags(pkg.name, tags)
    .filter((entry) => entry.version !== pkg.version && isAncestorOfHead(entry.tag))
    .at(-1);
  const until = commitForTag(pkg.tag) ? pkg.tag : 'HEAD';
  const messages = getCommitMessagesBetween(previous?.tag ?? null, until, watchPathsFor(pkg));
  return formatGitHubReleaseNotes(pkg.version, messages, deriveIncrement(messages));
}

/**
 * @param {{ name: string, version: string, tag: string, path: string }[]} packages
 * @param {string[]} tags
 * @param {string} headSha
 */
function confirmExistingPublication(packages, tags, headSha) {
  if (!CI) {
    console.log('HEAD is already a release; would confirm tags and GitHub Releases:');
    for (const pkg of packages) {
      console.log(`  ${pkg.tag}`);
    }
    return false;
  }

  for (const pkg of packages) {
    ensureAnnotatedTag(pkg.tag, headSha);
    ensureGitHubRelease(pkg.tag, notesForPackage(pkg, tags));
  }

  const primary = packages.find((pkg) => pkg.name === PRODUCT) ?? packages[0];
  console.log(`Confirmed GitHub Release ${primary.tag}.`);
  setOutput('released', 'true');
  setOutput('tag', primary.tag);
  return true;
}

/**
 * @param {string[]} tags
 * @param {string} headSha
 * @param {string} headMessage
 * @returns {boolean}
 */
function retryExistingPublicationIfNeeded(tags, headSha, headMessage) {
  const targets = selectRetryTargets({
    packages: listWorkspacePackages(),
    lastFor: (name) => latestReachableRelease(tags, name),
    lastTagShaFor: (tag) => commitForTag(tag),
    headSha,
    headMessage,
  });
  if (targets.length === 0) return false;
  confirmExistingPublication(targets, tags, headSha);
  return true;
}

function main() {
  if (CI) {
    syncToOriginMain();
  }

  const tags = listGitTags();
  const headSha = runGit(['rev-parse', 'HEAD']);
  const headMessage = runGit(['log', '-1', '--format=%B']);

  if (retryExistingPublicationIfNeeded(tags, headSha, headMessage)) {
    return;
  }

  const packages = listWorkspacePackages();
  if (packages.length === 0) {
    console.log('No workspace packages found.');
    setOutput('released', 'false');
    return;
  }

  /** @type {{ name: string, path: string, version: string, next: string, increment: Increment, tag: string, messages: string[] }[]} */
  const releases = [];

  for (const pkg of packages) {
    const lastTag = getLastTag(pkg.name, tags);
    const paths = watchPathsFor(pkg);
    const messages = getCommitMessages(lastTag, paths);
    const increment = deriveIncrement(messages);
    if (!increment) continue;

    const resolved = resolveNextVersion(pkg.name, pkg.version, lastTag, increment, tags);
    releases.push({
      name: pkg.name,
      path: pkg.path,
      version: resolved.base,
      next: resolved.next,
      increment,
      tag: resolved.tag,
      messages,
    });
  }

  if (releases.length === 0) {
    console.log('Nothing to release.');
    setOutput('released', 'false');
    return;
  }

  console.log(CI ? 'Releasing:' : 'Dry-run — would release:');
  for (const release of releases) {
    console.log(`  ${release.name}: ${release.version} → ${release.next} (${release.increment}) [${release.tag}]`);
  }

  if (!CI) {
    console.log('\nRe-run with --ci to bump, commit, tag, push, and publish GitHub Releases.');
    console.log('\nNotes:\n');
    for (const release of releases) {
      console.log(formatGitHubReleaseNotes(release.next, release.messages, release.increment));
    }
    return;
  }

  for (const release of releases) {
    writePackageVersion(release.path, release.next);
  }

  updateChangelog(releases);
  updateClientChangelogs(ROOT, releases, new Date().toISOString().slice(0, 10));

  const message = formatReleaseCommitMessage(releases);

  for (const release of releases) {
    run('git', ['add', join(release.path, 'package.json')]);
  }
  run('git', ['add', 'CHANGELOG.md']);
  for (const release of releases) {
    const targets = CLIENT_CHANGELOG_TARGETS[release.name];
    if (targets) run('git', ['add', targets.markdown, targets.data]);
  }
  run('git', ['commit', '-m', message], {
    env: { ...process.env, HUSKY: '0' },
  });

  const releaseSha = pushCommitToMain();

  for (const release of releases) {
    ensureAnnotatedTag(release.tag, releaseSha);
    ensureGitHubRelease(
      release.tag,
      formatGitHubReleaseNotes(release.next, release.messages, release.increment),
    );
  }

  const primary = releases.find((release) => release.name === PRODUCT) ?? releases[0];
  console.log('Release commit and tags pushed.');
  setOutput('released', 'true');
  setOutput('tag', primary.tag);
}

main();
