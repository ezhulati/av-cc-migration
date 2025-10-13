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
  build: {
    format: 'directory',
  },
  image: {
    domains: ['albaniavisit.com', 'eia476h758b.exactdn.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.exactdn.com',
      },
    ],
  },
});
