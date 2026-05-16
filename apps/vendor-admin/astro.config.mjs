import { defineConfig } from 'astro/config';
import alpinejs from '@astrojs/alpinejs';

export default defineConfig({
  integrations: [alpinejs()],
  server: { port: 5174 },
  vite: {
    optimizeDeps: {
      include: ['@supabase/supabase-js', '@micro-store/core'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-supabase': ['@supabase/supabase-js'],
          },
        },
      },
    },
  },
});
