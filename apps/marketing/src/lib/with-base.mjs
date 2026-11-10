/**
 * Prefix an internal path with Astro's `BASE_URL` (`/` in production,
 * `/pr-preview/pr-<n>/` on GitHub Pages PR previews).
 * External, hash, mailto, tel, and protocol-relative links are unchanged.
 *
 * @param {string} path
 * @param {string} base
 * @returns {string}
 */
export function withBase(path, base) {
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('//') ||
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
 * Strip a configured Astro `base` prefix from a pathname when present, so
 * matching works whether the runtime pathname includes the deployment prefix.
 *
 * @param {string} pathname
 * @param {string} base
 * @returns {string}
 */
export function stripBase(pathname, base) {
  const current = pathname || '/';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  if (!normalizedBase) {
    return current.replace(/\/$/, '') || '/';
  }
  if (current === normalizedBase || current === `${normalizedBase}/`) {
    return '/';
  }
  if (current.startsWith(`${normalizedBase}/`)) {
    return current.slice(normalizedBase.length).replace(/\/$/, '') || '/';
  }
  return current.replace(/\/$/, '') || '/';
}

/**
 * Whether `pathname` matches a nav `href` after base-path normalization.
 * Home links compare equality only so a root `base` of `/` cannot match
 * every route. Pathnames with or without the preview prefix both match.
 *
 * @param {string} pathname
 * @param {string} href
 * @param {string} base
 * @returns {boolean}
 */
export function isActivePath(pathname, href, base) {
  const current = stripBase(pathname, base);
  if (href === '/') {
    return current === '/';
  }
  const target = href.replace(/\/$/, '') || '/';
  const normalizedTarget = target.startsWith('/') ? target : `/${target}`;
  return current === normalizedTarget || current.startsWith(`${normalizedTarget}/`);
}

/**
 * Rehype plugin factory: prefix root-relative `href`/`src` on Markdown HTML
 * (content collections) with the Astro base so preview subpaths resolve.
 *
 * @param {string} base
 * @returns {() => (tree: { type?: string, properties?: Record<string, unknown>, children?: unknown[] }) => void}
 */
export function rehypePrefixBase(base) {
  return function rehypePrefixBasePlugin() {
    return function transform(tree) {
      visit(tree);
    };

    /**
     * @param {unknown} node
     */
    function visit(node) {
      if (node === null || typeof node !== 'object') {
        return;
      }
      const record = /** @type {{ type?: string, properties?: Record<string, unknown>, children?: unknown[] }} */ (
        node
      );
      if (record.type === 'element' && record.properties && typeof record.properties === 'object') {
        for (const key of ['href', 'src']) {
          const value = record.properties[key];
          if (typeof value === 'string') {
            record.properties[key] = withBase(value, base);
          }
        }
      }
      if (Array.isArray(record.children)) {
        for (const child of record.children) {
          visit(child);
        }
      }
    }
  };
}
