import type { APIRoute } from 'astro';
import { artiklarSorterade, metoderSorterade, bockerSorterade, publikationNamn } from '../lib/innehall';
import { byggSerier, lektionsnamn } from '../lib/serie';
import { arskursText } from '../lib/metod';

// Maskinläsbar lista över allt som är publicerat: artiklar, metoder och böcker.
// Byggpluginen netlify/plugins/utskick läser den efter varje lyckad deploy (via
// netlify/functions/utskick.mjs och netlify/lib/utskick.mjs) och mejlar
// prenumeranterna om det som tillkommit. Utkast är redan bortfiltrerade i produktion.
// En lektion i en serie (Ljudlek i grupp) har serien med sig, så att brevet visar serien som en helhet när den är ny
// och en senare lektion som en nyhet i serien (netlify/lib/utskick.mjs, grupperaNya).
export const GET: APIRoute = async () => {
  const [artiklar, metoder, bocker] = await Promise.all([artiklarSorterade(), metoderSorterade(), bockerSorterade()]);
  const serier = byggSerier(metoder);
  const poster = [
    ...artiklar.map((a) => ({
      typ: 'artikel',
      etikett: `Ny text, publicerad i ${publikationNamn(a.data.publikation)}`,
      url: `/artiklar/${a.id}`,
      titel: a.data.titel,
      ingress: a.data.ingress,
      datum: a.data.datum.toISOString().slice(0, 10),
    })),
    ...metoder.map((m) => {
      const serie = m.data.serie ? serier.get(m.data.serie) : undefined;
      return {
        typ: 'metod',
        etikett: serie ? `Ny ${serie.ord.en} i ${serie.titel}` :`Ny metod i stödundervisning: ${m.data.omrade}, ${arskursText(m.data).replace(/\u2060/g, '')}`,
        url: `/stodundervisning/${m.id}`,
        titel: m.data.titel,
        ingress: m.data.ingress,
        datum: (m.data.uppdaterad ?? new Date(0)).toISOString().slice(0, 10),
        // Seriens ord följer med, så att brevet säger "Med 4 kurser" om en serie av kurser (src/lib/serie.ts, serieOrd).
        ...(serie ? { serie: { url: `/stodundervisning/${serie.id}`, titel: serie.titel }, namn: lektionsnamn(m.data.titel), ordning: serie.lektioner.findIndex((l) => l.id === m.id), ord: { den: serie.ord.den, flera: serie.ord.flera } } : {}),
      };
    }),
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
