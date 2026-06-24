import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import alpinejs from '@astrojs/alpinejs';

export default defineConfig({
  integrations: [react(), alpinejs()],
  server: { port: 5173 },
});
