import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { backfillProduct } from '../../../../scripts/backfill-client-changelogs.mjs';
import {
  MARKETING_WATCH_PATHS,
  PRODUCT,
  listGitTags,
} from '../../../../scripts/git-release.mjs';

const fallbackPath = join(dirname(fileURLToPath(import.meta.url)), '../data/changelog.json');

/**
 * @typedef {{ type: string, summary: string, reason?: string }} ChangelogChange
 * @typedef {{ version: string, date: string, changes: ChangelogChange[] }} ChangelogRelease
 * @typedef {{ product: string, releases: ChangelogRelease[] }} ChangelogData
 */

/**
 * Build `/changelog` from git tags so tag-only releases appear without a
 * version-bump commit. Falls back to the committed snapshot if git is unavailable.
 * @returns {ChangelogData}
 */
export function loadMarketingChangelog() {
  try {
    const releases = backfillProduct(PRODUCT, MARKETING_WATCH_PATHS, listGitTags());
    if (releases.length > 0) {
      return { product: PRODUCT, releases };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Falling back to committed changelog.json (${message})`);
  }
  return JSON.parse(readFileSync(fallbackPath, 'utf8'));
}
