import { describeSiteVersion } from '../../../../scripts/git-release.mjs';

/** Build-time site version from `git describe`, never package.json. */
export function siteVersion() {
  return describeSiteVersion();
}
