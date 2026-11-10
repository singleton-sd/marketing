/**
 * Prefix an internal path with Astro's `BASE_URL` (`/` in production,
 * `/pr-preview/pr-<n>/` on GitHub Pages PR previews).
 * External, hash, mailto, and tel links are returned unchanged.
 *
 * @param {string} path
 * @param {string} base
 * @returns {string}
 */
export function withBase(path, base) {
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
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
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Whether `pathname` matches a nav `href` after base-path normalization.
 * Home links compare equality only so a root `base` of `/` cannot match
 * every route.
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
  return current === target || current.startsWith(`${target}/`);
}
