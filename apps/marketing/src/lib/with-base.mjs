/**
 * Prefix an internal path with Astro's `BASE_URL` (e.g. `/` or `/pr-preview/pr-9/`).
 * External, hash, and mailto links are returned unchanged.
 *
 * @param {string} path
 * @param {string} base
 * @returns {string}
 */
export function withBase(path, base) {
  if (
    path.startsWith('http') ||
    path.startsWith('#') ||
    path.startsWith('mailto:') ||
    path.startsWith('tel:')
  ) {
    return path;
  }
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  if (path === '/') {
    return `${normalizedBase}/`;
  }
  return `${normalizedBase}${path}`;
}

/**
 * Whether `pathname` matches a nav `href` after base-path normalization.
 * Home links compare equality only so a root `base` of `/` cannot match every route.
 *
 * @param {string} pathname
 * @param {string} href
 * @param {string} base
 * @returns {boolean}
 */
export function isActivePath(pathname, href, base) {
  const current = pathname.replace(/\/$/, '') || '/';
  const target = withBase(href, base).replace(/\/$/, '') || '/';
  if (href === '/') {
    return current === target;
  }
  return current === target || current.endsWith(href);
}
