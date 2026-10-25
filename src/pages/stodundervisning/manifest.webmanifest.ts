import type { APIRoute } from 'astro';
import { appikonAdress } from '../../lib/appikon';

// Manifestet för appen Stöd (K-505): metodbanken som app på hemskärmen, med Stöd under ikonen och hela namnet
// Stödundervisning i installationsrutan (Niclas 2026-10-25: "Den ska heta Stöd eller Insatser ... Kör på ditt förslag").
// Appen börjar i metodbanken och rymmer allt under /stodundervisning: metoderna, lathundarna, verktygen och Planera
// insatsen. Kraven för att Chrome ska erbjuda installation står på https://web.dev/articles/install-criteria (DRIFT.md
// under Appen Stöd).
export const GET: APIRoute = () => new Response(JSON.stringify({
  id: '/stodundervisning',
  name: 'Stödundervisning',
  short_name: 'Stöd',
  description: 'Metoder för stödundervisning i grupp, och Planera insatsen för din grupp.',
  lang: 'sv',
  dir: 'ltr',
  start_url: '/stodundervisning',
  scope: '/stodundervisning',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#14202b',
  icons: [
    { src: appikonAdress('ikon-192'), sizes: '192x192', type: 'image/png' },
    { src: appikonAdress('ikon-512'), sizes: '512x512', type: 'image/png' },
    { src: appikonAdress('ikon-maskbar-512'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2), { headers: { 'Content-Type': 'application/manifest+json' } });
