import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// Astro static company marketing site (SWA Free)
export default defineConfig({
  site: 'https://singletonsd.com',
  output: 'static',
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});
