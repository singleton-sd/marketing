import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

// Astro static company marketing site (SWA Free)
export default defineConfig({
  site: 'https://www.singletonsd.com',
  output: 'static',
  // Match sitemap/canonical URLs (/about/) and SWA directory output.
  trailingSlash: 'always',
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      filter: (page) => !page.includes('/admin'),
    }),
  ],
});
