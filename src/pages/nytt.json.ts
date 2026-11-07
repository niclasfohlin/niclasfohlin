import type { APIRoute } from 'astro';
import { artiklarSorterade, metoderSorterade, bockerSorterade, publikationNamn, publicerade, formateraDatum } from '../lib/innehall';
import { byggSerier, lektionsnamn } from '../lib/serie';
import { arskursText } from '../lib/metod';
import { SAMLINGARNA, samlingen } from '../lib/samlingar';
import { metodensCentrala, CENTRALA } from '../lib/centrala';
import { LEKTIONSKORT_MEJL, metodensLektionskort } from '../lib/lektionskort';
import { metodensSidor } from '../lib/lardig';
import type { Um } from '../lib/undervisningsmetod';
import { metodensBladkort } from '../lib/bladkort';
import { filmNamn, huvudfilm, metodensFilmer, type Film } from '../lib/film';
import { meningarna, uppraknat } from '../lib/standard/index.js';

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
// Texttypens ord i mejlet om en ny text (netlify/lib/utskick.mjs, brev): Ny krönika i ämnesraden och Läs hela krönikan i
// mejlet (Niclas 2026-11-04: "Ex att nytt finns att läsa, ingressen off sedan läs mer här", med länk till originalet och sajten).
const TEXTENS_ORD: Record<string, { en: string; den: string }> = {
  kronika: { en: 'Ny krönika', den: 'krönikan' },
  debatt: { en: 'Ny debattartikel', den: 'debattartikeln' },
  artikel: { en: 'Ny artikel', den: 'artikeln' },
  intervju: { en: 'Ny intervju', den: 'intervjun' },
  podd: { en: 'Nytt poddavsnitt', den: 'avsnittet' },
  annat: { en: 'Ny text', den: 'texten' },
};
const forstaCitat = (c: unknown) => { const x = Array.isArray(c) ? c[0] : undefined; return typeof x === 'string' ? x : (x as { text?: string } | undefined)?.text; };
// Mejlens standard (netlify/lib/mejl.mjs, K-729): repliken är meningen som mejlet öppnar med, och raden är postens rad i månadsbrevets
// topplista. Repliken är textens citat, annars metodens kort, annars ingressens första mening.
const forstaMeningen = (t: string) => [(meningarna(t)[0] ?? t) as string];
// Repliken ur ingressen: ett inledande "Testbaserat lärande är korta prov" blir "Korta prov", eftersom namnet står som rubrik strax
// under, och brod är resten av ingressen, så att meningen inte står två gånger i mejlet.
const utIngressen = (titel: string, ingress: string) => {
  const forsta = forstaMeningen(ingress)[0];
  const namnet = `${titel} är `;
  const replik = forsta.startsWith(namnet) ? `${forsta[namnet.length].toLocaleUpperCase('sv')}${forsta.slice(namnet.length + 1)}` : forsta;
  return { replik: [replik], brod: ingress.slice(forsta.length).trim() };
};
const filmbilden = (d: { film?: Film; filmer?: Film[] }, id: string, samling: 'stodundervisning' | 'metoder') => {
  const f = huvudfilm(metodensFilmer(d as Parameters<typeof metodensFilmer>[0], id, samling));
  return f ? { src: `${f.bas}-omslag.png`, alt: `Bild ur filmen ${filmNamn(f)}` } : undefined;
};
const textensRad = (en: string, publikation: string) => { const ord = en.replace(/^Ny(tt)? /, ''); return `${ord[0].toLocaleUpperCase('sv')}${ord.slice(1)} i ${publikation}`; };

export const GET: APIRoute = async () => {
  const [artiklar, metoder, bocker, undervisningsmetoder] = await Promise.all([artiklarSorterade(), metoderSorterade(), bockerSorterade(), publicerade('undervisningsmetoder')]);
  const serier = byggSerier(metoder);
  const poster = [
    ...artiklar.map((a) => ({
      typ: 'artikel',
      etikett: `${TEXTENS_ORD[a.data.typ].en} i ${publikationNamn(a.data.publikation)}, ${formateraDatum(a.data.datum)}`,
      url: `/artiklar/${a.id}`,
      titel: a.data.titel,
      ingress: a.data.ingress,
      // Mejlets egna rader för en text: ämnesradens ord, ordet i Läs hela, det första lyftcitatet och originalet.
      text: { amne: TEXTENS_ORD[a.data.typ].en, den: TEXTENS_ORD[a.data.typ].den, citat: forstaCitat(a.data.citat), publikation: publikationNamn(a.data.publikation), original: a.data.originalUrl },
      datum: a.data.datum.toISOString().slice(0, 10),
      ...(forstaCitat(a.data.citat) ? { replik: [forstaCitat(a.data.citat)] } : utIngressen(a.data.titel, a.data.ingress)),
      rad: textensRad(TEXTENS_ORD[a.data.typ].en, publikationNamn(a.data.publikation)),
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
        amne: serie ? `Ny ${serie.ord.en} i ${serie.titel}` : 'Ny metod',
        omrade: m.data.omrade,
        ...utIngressen(m.data.titel, m.data.ingress),
        rad: serie ? serie.titel : `${m.data.omrade}, ${arskursText(m.data).replace(/\u2060/g, '')}`,
        bild: filmbilden(m.data, m.id, 'stodundervisning'),
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
      // De små korten (src/data/bladkort.json) står också i mejlet, med minibilderna som png, som Outlook kan visa. Ett blad som är
      // flera kort ger mejlets replik, som de fyra frågorna i Reciprok undervisning.
      const kort = metodensBladkort(u.id, u.data as Um);
      return {
        typ: 'metod',
        etikett: `Ny metod för hela klassen, ${u.data.arskursText ?? u.data.arskurs.join(', ')}`.replace(/⁠/g, ''),
        url: `/metoder/${u.id}`,
        titel: u.data.titel,
        ingress: u.data.ingress,
        datum: u.data.publicerad.toISOString().slice(0, 10),
        amne: 'Ny metod',
        ...(kort && !kort.saker ? { replik: kort.kort.map((k) => k.rad.replace(/[”"“]/g, '')) } : utIngressen(u.data.titel, u.data.ingress)),
        rad: `Hela klassen, ${u.data.arskursText ?? u.data.arskurs.join(', ')}`.replace(/⁠/g, ''),
        bild: filmbilden(u.data as { film?: Film; filmer?: Film[] }, u.id, 'metoder'),
        ...(kort ? { kort: { namn: kort.namn, etikett: kort.etikett, alla: { text: kort.alla.text, url: `/metoder/${u.id}${kort.alla.adress}` }, rader: kort.kort.map((k) => ({ namn: k.namn, rad: k.rad, url: `/metoder/${u.id}${k.adress}`, bild: k.bild.src.replace(/\.webp$/, '.png') })) } } : {}),
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
      amne: 'Ny bok',
      ...utIngressen(b.data.titel, b.data.beskrivning),
      rad: [b.data.forlag, b.data.utgivningsar].filter(Boolean).join(', '),
      ...(b.data.omslag ? { bild: { src: b.data.omslag, alt: `Omslaget till ${b.data.titel}` } } : {}),
      ...(b.data.medforfattare?.length ? { forfattare: `Med ${uppraknat(b.data.medforfattare)}` } : {}),
      ...(b.data.lankar?.length ? { lankar: b.data.lankar.map((l) => ({ url: l.url, text: l.text })) } : {}),
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
      amne: 'Nytt verktyg',
      replik: forstaMeningen(c.vav?.text ?? `${c.mejl.charAt(0).toUpperCase()}${c.mejl.slice(1)}.`),
      rad: 'Verktyg',
    })),
  ];
  // Samlingarna ur roten, så att månadsbrevet får en lista per samling utan en egen förteckning (netlify/lib/manadsbrev.mjs).
  const samlingar = SAMLINGARNA.map((s) => ({ led: samlingen(s).led, namn: samlingen(s).namn }));
  return new Response(JSON.stringify({ genererad: new Date().toISOString(), antal: poster.length, samlingar, poster }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};
