import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  output: 'static',
  site: 'https://hilfsmittelberater.online',
  server: {
    host: '0.0.0.0',
    port: 4321
  }
});