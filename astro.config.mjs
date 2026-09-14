import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import { contentApiPlugin } from './vite-plugins/content-api.mjs';
// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss(), contentApiPlugin()],
  },
  
  site: 'https://yourdomain.com',
  integrations: [sitemap(), react()]
});