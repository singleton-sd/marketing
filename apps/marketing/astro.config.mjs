import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import { rehypePrefixBase } from './src/lib/with-base.mjs';

const environment = /** @type {Record<string, string | undefined>} */ (
  Reflect.get(globalThis, 'process')?.env ?? {}
);

const previewBase = environment.PREVIEW_BASE_PATH;
const base = previewBase && previewBase !== '/' ? previewBase : '/';

// Astro static company marketing site (GitHub Pages).
export default defineConfig({
  site: 'https://www.singletonsd.com',
  base,
  output: 'static',
  // Match sitemap/canonical URLs (/about/) and GitHub Pages directory output.
  trailingSlash: 'always',
  markdown: {
    rehypePlugins: [rehypePrefixBase(base)],
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
  ],
});
