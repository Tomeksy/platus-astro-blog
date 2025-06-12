import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  output: 'static',
  adapter: netlify(),
  site: 'https://endearing-lily-dade62.netlify.app',
  server: {
    host: '0.0.0.0',
    port: 4321
  }
});