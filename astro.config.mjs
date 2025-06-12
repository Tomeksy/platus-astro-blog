import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), sitemap()],
  output: 'static',
  site: 'https://endearing-lily-dade62.netlify.app',
  server: {
    host: '0.0.0.0',
    port: 4321
  }
});