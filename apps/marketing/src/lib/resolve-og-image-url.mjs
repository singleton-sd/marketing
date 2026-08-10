/**
 * Resolve page OG image URL.
 * Absolute CDN/http URLs pass through; relative paths use site origin.
 * @param {string | undefined} ogImage
 * @param {URL | undefined} site
 * @param {string} fallback
 * @returns {string}
 */
export function resolveOgImageUrl(ogImage, site, fallback) {
  if (!ogImage) return fallback;
  if (/^https?:\/\//i.test(ogImage)) return ogImage;
  if (site) return new URL(ogImage, site).href;
  return ogImage;
}
