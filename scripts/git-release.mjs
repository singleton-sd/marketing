import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import semver from 'semver';
import { clientFacingChanges } from './client-changelog.mjs';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const PRODUCT = '@singleton-sd/marketing';
export const PACKAGE_PREFIX = '@singleton-sd/';
export const MARKETING_WATCH_PATHS = [
  'apps/marketing',
  'infra/marketing.bicep',
  'infra/global.bicep',
];

/** @typedef {'major' | 'minor' | 'patch'} Increment */
/** @typedef {{ tag: string, version: string }} ReleaseTag */

/**
 * @param {string[]} args
 * @param {import('node:child_process').ExecFileSyncOptions} [options]
 */
export function runGit(args, options = {}) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

export function listGitTags() {
  const out = runGit(['tag', '--list']);
  return out ? out.split('\n').filter(Boolean) : [];
}

/**
 * @param {string | null | undefined} message
 */
export function isReleaseCommitMessage(message) {
  const text = typeof message === 'string' ? message : '';
  const subject = text.split('\n')[0] ?? '';
  return (
    /^chore\(release\)/i.test(subject) ||
    /\[skip ci\]/i.test(text) ||
    /^chore:\s*Release/i.test(subject)
  );
}

/**
 * @param {{ name: string, next: string, tag: string }[]} releases
 */
export function formatReleaseCommitMessage(releases) {
  const subject =
    releases.length === 1
      ? `chore(release): v${releases[0].next} [skip ci]`
      : 'chore(release): package versions [skip ci]';
  const body = releases.map((release) => `- ${release.tag}`).join('\n');
  return `${subject}\n\n${body}\n`;
}

/**
 * Parse `@scope/name@version` product tags.
 * @param {string} tag
 * @param {string} [product]
 * @returns {ReleaseTag | null}
 */
export function parseReleaseTag(tag, product = PRODUCT) {
  if (typeof tag !== 'string' || !tag) return null;
  const prefix = `${product}@`;
  if (!tag.startsWith(prefix)) return null;
  const version = tag.slice(prefix.length);
  return semver.valid(version) ? { tag, version } : null;
}

/**
 * Unique versions from package tags, newest last.
 * @param {string} product
 * @param {string[]} tags
 * @returns {ReleaseTag[]}
 */
export function versionsFromTags(product, tags) {
  return tags
    .map((tag) => parseReleaseTag(tag, product))
    .filter((entry) => entry !== null)
    .sort((left, right) => semver.compare(left.version, right.version));
}

/**
 * @param {string} ref
 */
export function isAncestorOfHead(ref) {
  try {
    runGit(['merge-base', '--is-ancestor', ref, 'HEAD']);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string[]} [tags]
 * @param {string} [product]
 * @returns {ReleaseTag[]}
 */
export function reachableReleases(tags = listGitTags(), product = PRODUCT) {
  return versionsFromTags(product, tags).filter((entry) => isAncestorOfHead(entry.tag));
}

/**
 * @param {string[]} [tags]
 * @param {string} [product]
 * @returns {ReleaseTag | null}
 */
export function latestReachableRelease(tags = listGitTags(), product = PRODUCT) {
  return reachableReleases(tags, product).at(-1) ?? null;
}

/**
 * True when the latest reachable tag already points at HEAD — a retry after the
 * commit/tag push succeeded but the GitHub Release (or Pages dispatch) did not.
 * @param {ReleaseTag | null} last
 * @param {string | null | undefined} headSha
 * @param {string | null | undefined} lastTagSha
 */
export function shouldConfirmExistingPublication(last, headSha, lastTagSha) {
  return Boolean(last && headSha && lastTagSha && headSha === lastTagSha);
}

/**
 * @param {string | null | undefined} headMessage
 * @param {ReleaseTag | null} last
 * @param {string | null | undefined} headSha
 * @param {string | null | undefined} lastTagSha
 */
export function shouldRetryPublication(headMessage, last, headSha, lastTagSha) {
  return (
    isReleaseCommitMessage(headMessage) ||
    shouldConfirmExistingPublication(last, headSha, lastTagSha)
  );
}

/** @typedef {{ name: string, version: string, path: string }} RetryPackage */
/** @typedef {{ name: string, version: string, tag: string, path: string }} RetryTarget */

/**
 * Packages to confirm (tag + GitHub Release) when HEAD is already a release.
 * Independent packages whose version still matches their last tag are skipped.
 *
 * @param {{
 *   packages: RetryPackage[],
 *   lastFor: (name: string) => ReleaseTag | null,
 *   lastTagShaFor: (tag: string) => string | null,
 *   headSha: string,
 *   headMessage: string,
 * }} input
 * @returns {RetryTarget[]}
 */
export function selectRetryTargets({ packages, lastFor, lastTagShaFor, headSha, headMessage }) {
  const releaseHead = isReleaseCommitMessage(headMessage);
  /** @type {RetryTarget[]} */
  const targets = [];

  for (const pkg of packages) {
    const last = lastFor(pkg.name);
    const lastTagSha = last ? lastTagShaFor(last.tag) : null;

    if (last && lastTagSha === headSha) {
      targets.push({ name: pkg.name, version: last.version, tag: last.tag, path: pkg.path });
      continue;
    }

    if (releaseHead && (!last || last.version !== pkg.version)) {
      targets.push({
        name: pkg.name,
        version: pkg.version,
        tag: tagNameFor(pkg.name, pkg.version),
        path: pkg.path,
      });
    }
  }

  return targets;
}

/**
 * Push HEAD to origin/main, rebasing on rejection. Returns the SHA that
 * landed on main after any rebase.
 *
 * @param {(args: string[]) => string} [git]
 */
export function pushCommitToMain(git = (args) => runGit(args)) {
  const maxAttempts = 3;
  /** @type {unknown} */
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      git(['push', 'origin', 'HEAD:main']);
      return git(['rev-parse', 'HEAD']);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      git(['fetch', 'origin', 'main']);
      git(['pull', '--rebase', '--autostash', 'origin', 'main']);
    }
  }

  throw lastError;
}

/**
 * @param {string | null} sinceTag
 * @param {string} untilRef
 * @param {string[]} paths
 * @returns {string[]}
 */
export function getCommitMessagesBetween(sinceTag, untilRef, paths) {
  const range = sinceTag ? `${sinceTag}..${untilRef}` : untilRef;
  try {
    const out = runGit(['log', range, '--format=%B%x1e', '--', ...paths]);
    if (!out) return [];
    return out
      .split('\x1e')
      .map((message) => message.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * @param {string | null} sinceTag
 * @param {string[]} paths
 * @returns {string[]}
 */
export function getCommitMessages(sinceTag, paths) {
  return getCommitMessagesBetween(sinceTag, 'HEAD', paths);
}

/**
 * Parse each conventional-commit subject once. A `!` marker on any type, or a
 * `BREAKING CHANGE:` footer, is major. Type checks use the subject only so
 * body lines cannot change the bump.
 * @param {string[]} messages
 * @returns {Increment | null}
 */
export function deriveIncrement(messages) {
  /** @type {Increment | null} */
  let bump = null;
  const rank = { patch: 1, minor: 2, major: 3 };

  for (const message of messages) {
    const subject = message.split('\n')[0] ?? '';
    if (isReleaseCommitMessage(message)) continue;

    const match = subject.match(/^([a-z]+)(?:\([^)]*\))?(!)?:\s*(.+)$/i);
    const breakingFooter = /^breaking change:/im.test(message);
    if (match?.[2] || breakingFooter) {
      bump = 'major';
      break;
    }
    if (!match) continue;

    const type = match[1].toLowerCase();
    if (type === 'feat') {
      if (!bump || rank.minor > rank[bump]) bump = 'minor';
      continue;
    }
    if (type === 'fix' || type === 'perf') {
      if (!bump || rank.patch > rank[bump]) bump = 'patch';
    }
  }

  return bump;
}

/**
 * @param {string} baseVersion
 * @param {Increment} increment
 * @param {string[]} existingTags
 * @param {string} [product]
 */
export function nextFreeVersion(baseVersion, increment, existingTags, product = PRODUCT) {
  const existing = new Set(versionsFromTags(product, existingTags).map((entry) => entry.version));
  let base = semver.valid(baseVersion) ? baseVersion : '0.0.0';

  for (let i = 0; i < 50; i += 1) {
    const next = semver.inc(base, increment);
    if (!next) {
      throw new Error(`Failed to bump ${base} with ${increment}`);
    }
    if (!existing.has(next)) return next;
    console.warn(`Version ${next} already tagged — skipping to next ${increment}.`);
    base = next;
  }

  throw new Error(`Could not find a free version after ${base}`);
}

/**
 * @param {string} packageName
 * @param {string} version
 */
export function tagNameFor(packageName, version) {
  if (!packageName.startsWith(PACKAGE_PREFIX)) {
    throw new Error(`Unexpected package name: ${packageName}`);
  }
  if (!semver.valid(version) || semver.prerelease(version)) {
    throw new Error(`Invalid stable version: ${version}`);
  }
  return `${packageName}@${version}`;
}

/**
 * Only annotated product tags — never a branch (including main).
 * @param {string} tag
 * @returns {string[]}
 */
export function tagPushArgs(tag) {
  if (tag === 'main' || tag.includes(':') || tag.startsWith('refs/heads/')) {
    throw new Error(`Refusing to push a branch ref: ${tag}`);
  }
  if (!/^@singleton-sd\/[A-Za-z0-9._-]+@\d+\.\d+\.\d+$/.test(tag)) {
    throw new Error(`Refusing to push non package-version tag ref: ${tag}`);
  }
  return ['push', 'origin', `refs/tags/${tag}`];
}

/**
 * @param {Increment} increment
 */
function incrementLabel(increment) {
  switch (increment) {
    case 'major':
      return 'major';
    case 'minor':
      return 'minor';
    case 'patch':
      return 'patch';
    default: {
      const exhaustive = increment;
      throw new Error(`Unknown increment: ${exhaustive}`);
    }
  }
}

/**
 * @param {string} version
 * @param {string[]} messages
 * @param {Increment | null} [increment]
 */
export function formatGitHubReleaseNotes(version, messages, increment = null) {
  const changes = clientFacingChanges(messages);
  const lines = [`# v${version}`, ''];
  if (increment) {
    lines.push(`Semantic bump: **${incrementLabel(increment)}**.`, '');
  }
  const order = /** @type {const} */ (['Breaking', 'New', 'Fixed', 'Improved']);

  for (const type of order) {
    const items = changes.filter((change) => change.type === type);
    if (!items.length) continue;
    lines.push(`## ${type}`, '');
    for (const change of items) {
      lines.push(`- ${change.summary}`);
      if (change.reason) lines.push(`  ${change.reason}`);
    }
    lines.push('');
  }

  if (changes.length === 0) {
    lines.push('No client-facing changes were recorded for this release.', '');
  }

  return lines.join('\n');
}

/**
 * @param {{ lastVersion: string, messages: string[], tags: string[], packageName?: string }} input
 * @returns {{ kind: 'empty' } | { kind: 'release', version: string, tag: string, increment: Increment, notes: string }}
 */
export function planRelease({ lastVersion, messages, tags, packageName = PRODUCT }) {
  const increment = deriveIncrement(messages);
  if (!increment) {
    return { kind: 'empty' };
  }

  const version = nextFreeVersion(lastVersion, increment, tags, packageName);
  const tag = tagNameFor(packageName, version);
  return {
    kind: 'release',
    version,
    tag,
    increment,
    notes: formatGitHubReleaseNotes(version, messages, increment),
  };
}
