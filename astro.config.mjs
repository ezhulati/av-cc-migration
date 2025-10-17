// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://albaniavisit.com',
  output: 'static',
  integrations: [
    tailwind(),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          sq: 'sq',
        },
      },
    }),
  ],
  redirects: {
    '/destinations/albanian-riviera': '/attractions/albanian-riviera/',
  },
  build: {
    format: 'directory',
  },
  image: {
    service: { entrypoint: 'astro/assets/services/noop' },
  },
  vite: {
    server: {
      watch: {
        // Reduce file watching overhead for large content collections
        usePolling: false,
        interval: 1000,
        binaryInterval: 3000,
        // Ignore accommodation files from hot reload to prevent infinite loops
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/src/content/accommodation/**', // Don't watch accommodation files
        ],
      },
    },
    optimizeDeps: {
      exclude: ['astro:content'],
    },
  },
});
