import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';
import { fileURLToPath } from 'url';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  output: 'server',
  adapter: netlify(),
  site: 'https://endearing-lily-dade62.netlify.app',
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },
  server: {
    host: '0.0.0.0',
    port: 4321
  }
});