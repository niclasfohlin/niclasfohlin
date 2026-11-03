import type { APIRoute } from 'astro';
import { artiklarSorterade, metoderSorterade, bockerSorterade, publikationNamn, publicerade } from '../lib/innehall';
import { byggSerier, lektionsnamn } from '../lib/serie';
import { arskursText } from '../lib/metod';
import { metodensCentrala, CENTRALA } from '../lib/centrala';
import { LEKTIONSKORT_MEJL, metodensLektionskort } from '../lib/lektionskort';
import { metodensSidor } from '../lib/lardig';
import type { Um } from '../lib/undervisningsmetod';

// Maskinläsbar lista över allt som är publicerat: artiklar, metoder i Stödundervisning, metoder för hela klassen i Metoder och
// böcker (Niclas 2026-10-31: "En ny metod ska också trigga Brevo"; scripts/cacheprov.mjs stannar på en samling med sidor
// som inte står här).
// Byggpluginen netlify/plugins/utskick läser den efter varje lyckad deploy (via
// netlify/functions/utskick.mjs och netlify/lib/utskick.mjs) och mejlar
// prenumeranterna om det som tillkommit. Utkast är redan bortfiltrerade i produktion.
// En lektion i en serie (Ljudlek i grupp) har serien med sig, så att brevet visar serien som en helhet när den är ny
// och en senare lektion som en nyhet i serien (netlify/lib/utskick.mjs, grupperaNya).
// En metod med skrivkort har sidan som slumpar dem som en egen rad i brevet (lankar; Niclas 2026-10-14: sidan ska stå
// tydligt i mejlet som skickas).
export const GET: APIRoute = async () => {
  const [artiklar, metoder, bocker, undervisningsmetoder] = await Promise.all([artiklarSorterade(), metoderSorterade(), bockerSorterade(), publicerade('undervisningsmetoder')]);
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
        // De centrala sakerna (src/lib/centrala.ts) får en rad var med länken efter ingressen.
        // Lektionskorten (src/lib/lektionskort.ts) får en rad var efter de centrala sakerna.
        ...(metodensCentrala(m.data).length || m.data.lektionskort.length ? { lankar: [...metodensCentrala(m.data).map((c) => ({ url: c.adress, text: c.namn, efter: c.mejl })), ...metodensLektionskort(m.data, m.id).map((k) => ({ url: k.adress, text: k.knapp, efter: LEKTIONSKORT_MEJL }))] } : {}),
        ...(serie ? { serie: { url: `/stodundervisning/${serie.id}`, titel: serie.titel }, namn: lektionsnamn(m.data.titel), ordning: serie.lektioner.findIndex((l) => l.id === m.id), ord: { den: serie.ord.den, flera: serie.ord.flera } } : {}),
      };
    }),
    ...undervisningsmetoder.map((u) => {
      // Lär dig metoden och lathunden får en rad var med länken efter ingressen, som de centrala sakerna i Stödundervisning,
      // ur samma rot som bankens kort (metodensSidor i src/lib/lardig.ts).
      const sidor = metodensSidor(u.id, u.data as Um);
      return {
        typ: 'metod',
        etikett: `Ny metod för hela klassen, ${u.data.arskursText ?? u.data.arskurs.join(', ')}`.replace(/⁠/g, ''),
        url: `/metoder/${u.id}`,
        titel: u.data.titel,
        ingress: u.data.ingress,
        datum: u.data.publicerad.toISOString().slice(0, 10),
        ...(sidor.length ? { lankar: sidor.map((s) => ({ url: s.href, text: s.text, efter: s.mejl })) } : {}),
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
    // Ett nytt verktyg med publicerad i src/data/centrala.json, som Strukturer och Strategier (Niclas 2026-11-03: mejla den nya
    // metoden och också de två nya verktygen, "Ett Brevo för metoden och ett Brevo för två verktygen"). Utskicket lägger
    // verktygen i ett eget mejl (utskicken i netlify/lib/utskick.mjs). Ingressen är verktygets rad för mejlen.
    ...CENTRALA.filter((c) => c.del === 'verktyg' && c.publicerad).map((c) => ({
      typ: 'verktyg',
      etikett: 'Nytt verktyg',
      url: c.adress,
      titel: c.namn,
      ingress: `${c.mejl.charAt(0).toUpperCase()}${c.mejl.slice(1)}.`,
      datum: c.publicerad!,
    })),
  ];
  return new Response(JSON.stringify({ genererad: new Date().toISOString(), antal: poster.length, poster }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};
