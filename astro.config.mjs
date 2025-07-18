import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), sitemap()],
  output: 'static',
  site: 'https://hilfsmittelberater.online',
  server: {
    host: '0.0.0.0',
    port: 3000
  }
});