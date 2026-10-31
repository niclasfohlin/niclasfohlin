import type { APIRoute } from 'astro';
import { appikonAdress } from '../../lib/appikon';
import { APPEN } from '../../lib/appen';

// Manifestet för appen Metodbanken (K-644, src/lib/appen.ts): Stödundervisning och Metoder som app på hemskärmen, med
// Metodbanken under ikonen och "Metodbanken: Stöd och Metoder" i installationsrutan. Appen börjar på /app och rymmer hela
// sajten (scope /), så att Stöd, Metoder och appens sida är en app; en artikel eller bok öppnas i appen med sajtens meny och
// raden Hem (Base.astro). Adressen och id är desamma som när appen hette Stöd, sedan 2026-10-25, så att Android uppdaterar
// den installerade appen.
// Kraven för att Chrome ska erbjuda installation står på https://web.dev/articles/install-criteria (DRIFT.md under Appen
// Metodbanken).
export const GET: APIRoute = () => new Response(JSON.stringify({
  id: APPEN.id,
  name: APPEN.fulltNamn,
  short_name: APPEN.namn,
  description: APPEN.beskrivning,
  lang: 'sv',
  dir: 'ltr',
  start_url: APPEN.adress,
  scope: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#14202b',
  icons: [
    { src: appikonAdress('ikon-192'), sizes: '192x192', type: 'image/png' },
    { src: appikonAdress('ikon-512'), sizes: '512x512', type: 'image/png' },
    { src: appikonAdress('ikon-maskbar-512'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2), { headers: { 'Content-Type': 'application/manifest+json' } });
