import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Statisk sajt. Ingen adapter behövs så länge Netlify Functions bara ligger
// i netlify/functions och inte i Astro-routes.
export default defineConfig({
  site: 'https://niclasfohlin.se',
  trailingSlash: 'never',
  integrations: [sitemap()],
});
