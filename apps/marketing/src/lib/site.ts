import { resolveOgImageUrl as resolveOgImageUrlImpl } from './resolve-og-image-url.mjs';

/** Brand assets hosted on the company CDN — do not vendor binaries into this repo. */
export const ASSETS_ORIGIN = 'https://assets.singletonsd.com';

export const SITE_ORIGIN = 'https://www.singletonsd.com';

export const SITE_NAME = 'Singleton Software Development';

export const DEFAULT_OG_IMAGE = `${ASSETS_ORIGIN}/og-image/light/og-default.jpg`;

/** Circle mark for light surfaces (header, hero). */
export const LOGO_LIGHT = `${ASSETS_ORIGIN}/logo/static/light/circle/bg-none/512.png`;

/** Circle mark for dark surfaces (footer, Decap admin). */
export const LOGO_DARK = `${ASSETS_ORIGIN}/logo/static/dark/circle/bg-none/512.png`;

export const ORGANIZATION_LOGO = LOGO_DARK;

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
  return resolveOgImageUrlImpl(ogImage, site, fallback);
}
