import type { APIRoute } from 'astro';
import { artiklarSorterade, metoderSorterade, bockerSorterade, publikationNamn } from '../lib/innehall';

// Maskinläsbar lista över allt som är publicerat: artiklar, metoder och böcker.
// Byggpluginen netlify/plugins/utskick läser den efter varje lyckad deploy (via
// netlify/functions/utskick.mjs och netlify/lib/utskick.mjs) och mejlar
// prenumeranterna om det som tillkommit. Utkast är redan bortfiltrerade i produktion.
export const GET: APIRoute = async () => {
  const [artiklar, metoder, bocker] = await Promise.all([artiklarSorterade(), metoderSorterade(), bockerSorterade()]);
  const poster = [
    ...artiklar.map((a) => ({
      typ: 'artikel',
      etikett: `Ny text, publicerad i ${publikationNamn(a.data.publikation)}`,
      url: `/artiklar/${a.id}`,
      titel: a.data.titel,
      ingress: a.data.ingress,
      datum: a.data.datum.toISOString().slice(0, 10),
    })),
    ...metoder.map((m) => ({
      typ: 'metod',
      etikett: `Ny metod i stödundervisning: ${m.data.omrade}, ${m.data.arskurs.join(', ')}`,
      url: `/stodundervisning/${m.id}`,
      titel: m.data.titel,
      ingress: m.data.ingress,
      datum: (m.data.uppdaterad ?? new Date(0)).toISOString().slice(0, 10),
    })),
    ...bocker.map((b) => ({
      typ: 'bok',
      etikett: `Ny bok${b.data.forlag ? `, ${b.data.forlag}` : ''}`,
      url: `/bocker/${b.id}`,
      titel: b.data.titel,
      ingress: b.data.beskrivning,
      datum: `${b.data.utgivningsar}-01-01`,
    })),
  ];
  return new Response(JSON.stringify({ genererad: new Date().toISOString(), antal: poster.length, poster }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};
