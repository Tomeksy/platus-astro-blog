import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';
import { fileURLToPath } from 'url';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  output: 'server',
  adapter: netlify(),
  site: 'https://hilfsmittel-berater.at',
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },
  server: {
    host: true,
    port: 4321
  }
});