/** Brand assets hosted on the company CDN — do not vendor binaries into this repo. */
export const ASSETS_ORIGIN = 'https://assets.singletonsd.com';

export const SITE_ORIGIN = 'https://www.singletonsd.com';

export const SITE_NAME = 'Singleton Software Development';

export const DEFAULT_OG_IMAGE = `${ASSETS_ORIGIN}/og-image/light/og-default.jpg`;

export const ORGANIZATION_LOGO = `${ASSETS_ORIGIN}/logo/static/dark/circle/bg-none/512.png`;

export const FAVICON = {
  manifest: `${ASSETS_ORIGIN}/favicons/circle/bg-none/site.webmanifest`,
  appleTouch: `${ASSETS_ORIGIN}/favicons/circle/bg-none/apple-touch-icon.png`,
  png32: `${ASSETS_ORIGIN}/favicons/circle/bg-none/favicon-32x32.png`,
  png16: `${ASSETS_ORIGIN}/favicons/circle/bg-none/favicon-16x16.png`,
  shortcut: `${ASSETS_ORIGIN}/favicons/circle/bg-none/favicon.png`,
} as const;

/** Resolve page OG image: absolute CDN/http URLs pass through; relative paths use site origin. */
export function resolveOgImageUrl(
  ogImage: string | undefined,
  site: URL | undefined,
  fallback = DEFAULT_OG_IMAGE,
): string {
  if (!ogImage) return fallback;
  if (/^https?:\/\//i.test(ogImage)) return ogImage;
  if (site) return new URL(ogImage, site).href;
  return ogImage;
}
