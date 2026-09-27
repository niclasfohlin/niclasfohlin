import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Statisk sajt. Ingen adapter behövs så länge Netlify Functions bara ligger
// i netlify/functions och inte i Astro-routes.
export default defineConfig({
  site: 'https://niclasfohlin.se',
  trailingSlash: 'never',
  // Delningskortens mallar (src/pages/delning/kort/) är bara till för att ritas av, inte för att hittas.
  integrations: [sitemap({ filter: (sida) => !sida.includes('/delning/') })],
});
