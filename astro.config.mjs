import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import filversion from './scripts/filversion.mjs';

// Statisk sajt. Ingen adapter behövs så länge Netlify Functions bara ligger
// i netlify/functions och inte i Astro-routes.
export default defineConfig({
  site: 'https://niclasfohlin.se',
  trailingSlash: 'never',
  // Delningskortens mallar (src/pages/delning/kort/) är bara till för att ritas av, inte för att hittas, och
  // statistiksidan är bara för Niclas.
  // filversion: varje länk till en fil under /stodundervisning/ bär filens kontrollsumma, så att webbläsaren aldrig ger
  // en äldre Word-fil, pdf eller film än sidan (scripts/filversion.mjs).
  integrations: [sitemap({ filter: (sida) => !sida.includes('/delning/') && !sida.endsWith('/statistik') }), filversion()],
});
