import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import semver from 'semver';
import { clientFacingChanges } from './client-changelog.mjs';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const PRODUCT = '@singleton-sd/marketing';
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
 * Parse repo `vX.Y.Z` tags and legacy `@scope/name@version` product tags.
 * @param {string} tag
 * @param {string} [product]
 * @returns {ReleaseTag | null}
 */
export function parseReleaseTag(tag, product = PRODUCT) {
  if (typeof tag !== 'string' || !tag) return null;

  const vMatch = /^v(\d+\.\d+\.\d+)$/.exec(tag);
  if (vMatch && semver.valid(vMatch[1])) {
    return { tag, version: vMatch[1] };
  }

  const prefix = `${product}@`;
  if (tag.startsWith(prefix)) {
    const version = tag.slice(prefix.length);
    if (semver.valid(version)) return { tag, version };
  }

  return null;
}

/**
 * Unique versions from tags, newest last. Prefers `vX.Y.Z` when both formats exist.
 * @param {string} product
 * @param {string[]} tags
 * @returns {ReleaseTag[]}
 */
export function versionsFromTags(product, tags) {
  /** @type {Map<string, ReleaseTag>} */
  const byVersion = new Map();
  for (const tag of tags) {
    const parsed = parseReleaseTag(tag, product);
    if (!parsed) continue;
    const existing = byVersion.get(parsed.version);
    if (!existing || (parsed.tag.startsWith('v') && !existing.tag.startsWith('v'))) {
      byVersion.set(parsed.version, parsed);
    }
  }
  return [...byVersion.values()].sort((left, right) => semver.compare(left.version, right.version));
}

/**
 * Turn `git describe` output into the version string shown at build time.
 * @param {string | null | undefined} described
 */
export function displayVersionFromDescribe(described) {
  if (!described || typeof described !== 'string') return '0.0.0-development';
  let value = described.trim();
  value = value.replace(/^@singleton-sd\/marketing@/, '');
  value = value.replace(/^v(?=\d)/, '');
  return value || '0.0.0-development';
}

export function describeSiteVersion() {
  try {
    const described = runGit([
      'describe',
      '--tags',
      '--match',
      'v[0-9]*',
      '--match',
      '@singleton-sd/marketing@*',
    ]);
    return displayVersionFromDescribe(described);
  } catch {
    return '0.0.0-development';
  }
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
 * @returns {ReleaseTag | null}
 */
export function latestReachableRelease(tags = listGitTags()) {
  const reachable = versionsFromTags(PRODUCT, tags).filter((entry) => isAncestorOfHead(entry.tag));
  return reachable.at(-1) ?? null;
}

/**
 * @param {string | null} sinceTag
 * @param {string[]} paths
 * @returns {string[]}
 */
export function getCommitMessages(sinceTag, paths) {
  const range = sinceTag ? `${sinceTag}..HEAD` : 'HEAD';
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
 * @param {string[]} messages
 * @returns {Increment | null}
 */
export function deriveIncrement(messages) {
  /** @type {Increment | null} */
  let bump = null;
  const rank = { patch: 1, minor: 2, major: 3 };

  for (const message of messages) {
    const subject = message.split('\n')[0] ?? '';
    if (/^chore:\s*Release/i.test(subject)) continue;

    if (
      /^breaking change:/im.test(message) ||
      /^(feat|fix|perf|refactor)(\([^)]*\))?!:/im.test(message)
    ) {
      bump = 'major';
      break;
    }

    if (/^feat(\([^)]*\))?:/im.test(message)) {
      if (!bump || rank.minor > rank[bump]) bump = 'minor';
      continue;
    }

    if (/^(fix|perf)(\([^)]*\))?:/im.test(message)) {
      if (!bump || rank.patch > rank[bump]) bump = 'patch';
    }
  }

  return bump;
}

/**
 * @param {string} baseVersion
 * @param {Increment} increment
 * @param {string[]} existingTags
 */
export function nextFreeVersion(baseVersion, increment, existingTags) {
  const existing = new Set(versionsFromTags(PRODUCT, existingTags).map((entry) => entry.version));
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
 * @param {string} version
 */
export function tagNameFor(version) {
  if (!semver.valid(version) || semver.prerelease(version)) {
    throw new Error(`Invalid stable version: ${version}`);
  }
  return `v${version}`;
}

/**
 * Only vX.Y.Z tag refs — never a branch (including main).
 * @param {string} tag
 * @returns {string[]}
 */
export function tagPushArgs(tag) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
    throw new Error(`Refusing to push non vX.Y.Z tag ref: ${tag}`);
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
 * @param {Increment} increment
 */
export function formatGitHubReleaseNotes(version, messages, increment) {
  const changes = clientFacingChanges(messages);
  const lines = [`# v${version}`, '', `Semantic bump: **${incrementLabel(increment)}**.`, ''];
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
 * @param {{ lastVersion: string, messages: string[], tags: string[] }} input
 * @returns {{ kind: 'empty' } | { kind: 'release', version: string, tag: string, increment: Increment, notes: string }}
 */
export function planRelease({ lastVersion, messages, tags }) {
  const increment = deriveIncrement(messages);
  if (!increment) {
    return { kind: 'empty' };
  }

  const version = nextFreeVersion(lastVersion, increment, tags);
  const tag = tagNameFor(version);
  return {
    kind: 'release',
    version,
    tag,
    increment,
    notes: formatGitHubReleaseNotes(version, messages, increment),
  };
}
