// Delningskorten (Niclas 2026-09-27): bilden som Facebook, LinkedIn, X med flera visar när en sida delas.
// Varje artikel, bok och metod och varje huvudsida får ett eget kort, 1200 × 630 (Facebooks och LinkedIns mått;
// texten står inom mitten, där alla tjänster visar den). Texten kommer ur posten med samma ord som sidan: titeln,
// och raden över den (Stödundervisning · Matematik · åk 4–6, Krönika · Vi Lärare · 2024, Bok · Studentlitteratur
// · 2021). Mallen är src/pages/delning/kort/[namn].astro, med färgerna och typsnittet ur global.css.
//
// Filnamnet bär en kontrollsumma av allt som syns på kortet: texten, mallen, designsystemets variabler som mallen
// läser (färgerna och typsnittet) och bilden. Texten står i datorns eget typsnitt (K-137), Segoe UI på Windows där
// npm run validera ritar korten; ritas korten på en annan sorts dator, höj VERSION så att alla ritas om i samma typsnitt.
// En ändring ger alltså alltid en ny adress, korten kan cachas i ett år, och Facebook hämtar det nya
// kortet när sidan delas nästa gång. Det gamla kortet ligger kvar för inlägg som redan delats (K-053). scripts/delningskort.mjs ritar de kort som saknas med Chrome och lägger dem i
// public/delning/ (npm run validera); npm run build stannar om ett kort saknas. En sida utan eget kort, till
// exempel lathunden eller en taggsida, får närmaste överordnade sidas kort.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { site } from '../data/site';
import { publicerade, publikationNamn, typLabel } from './innehall';
import { arskursText } from './metod';

export const MALL = 'src/pages/delning/kort/[namn].astro';
// Höjs när något som påverkar korten ändras utanför filerna som räknas in nedan.
const VERSION = 1;

export interface Kort {
  sida: string; // sidans adress, t.ex. /stodundervisning/brakkurs-i-grupp
  namn: string; // filnamnets början, t.ex. stodundervisning-brakkurs-i-grupp
  typ: 'start' | 'om' | 'avsnitt' | 'artikel' | 'bok' | 'metod';
  etikett: string; // raden över titeln, tom på huvudsidorna
  titel: string;
  undertitel: string;
  bild: string; // porträttet, eller bokens omslag
  farg: string; // designsystemets variabel för strecket och raden över titeln
  fil: string; // /delning/<namn>-<kontrollsumma>.jpg
}

const FARG: Record<string, string> = { Matematik: '--farg-accent', Läsning: '--farg-lasning', Skrivning: '--farg-skrivning', Socialt: '--farg-socialt' };
const las = (sokvag: string) => readFileSync(join(process.cwd(), sokvag));

// Designsystemets variabler som kortet läser: de som mallen nämner och strecket färgas med, med sina värden ur
// :root-blocket i början av global.css. En ny variabel som kortet inte läser ritar alltså inte om korten (K-156).
// Strecket har områdets färg (FARG). De tre första områdenas färger har räknats in i varje korts summa sedan K-156 och
// står kvar där, så att korten behåller sina adresser; ett nytt områdes färg räknas bara in i sina egna kort, så att
// ett nytt område inte ritar om alla kort (Socialt 2026-10-03 hade annars ritat om 103 kort).
const GRUNDFARGER = ['--farg-accent', '--farg-lasning', '--farg-skrivning'];
let designVarden: Map<string, string> | undefined;
function designsystem(farg: string): string {
  if (!designVarden) {
    const css = las('src/styles/global.css').toString('utf8').replace(/\r\n/g, '\n');
    const start = css.indexOf(':root {');
    designVarden = new Map([...css.slice(start, css.indexOf('\n}', start)).matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  }
  const varden = designVarden;
  const lasta = new Set([...las(MALL).toString('utf8').matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]).concat(GRUNDFARGER, farg));
  return [...lasta].filter((v) => varden.has(v)).sort().map((v) => `${v}: ${varden.get(v)}`).join('\n');
}

// "Bråkkurs i grupp: förstå, räkna och tänka i bråk" blir titeln "Bråkkurs i grupp" och undertiteln
// "Förstå, räkna och tänka i bråk".
function dela(text: string): [string, string] {
  const i = text.indexOf(': ');
  if (i < 0) return [text, ''];
  const rest = text.slice(i + 2);
  return [text.slice(0, i), rest.charAt(0).toLocaleUpperCase('sv') + rest.slice(1)];
}
const forstaMeningen = (text: string) => text.split(/(?<=\.)\s/)[0];

let alla: Promise<Kort[]> | undefined;

export function allaKort(): Promise<Kort[]> {
  alla ??= (async () => {
    const utan: Omit<Kort, 'fil'>[] = [];
    const lagg = (k: Omit<Kort, 'fil' | 'namn'>) => utan.push({ ...k, namn: k.sida === '/' ? 'start' : k.sida.slice(1).replace(/\//g, '-') });
    const portratt = site.portratt;

    lagg({ sida: '/', typ: 'start', etikett: '', titel: site.namn, undertitel: site.rad, bild: portratt, farg: '--farg-accent' });
    for (const [nyckel, s] of Object.entries(site.sidor)) {
      // Om-sidan har porträttet till höger och därmed en smal spalt: där står raden under namnet i stället för beskrivningen.
      const om = nyckel === 'om';
      lagg({ sida: `/${nyckel}`, typ: om ? 'om' : 'avsnitt', etikett: '', titel: s.titel, undertitel: om ? site.rad : forstaMeningen(s.beskrivning), bild: portratt, farg: '--farg-accent' });
    }
    for (const a of await publicerade('artiklar')) {
      const ar = a.data.datum.getFullYear();
      const var_ = a.data.publikation === 'egen' ? '' : ` · ${publikationNamn(a.data.publikation)}`;
      const [titel, undertitel] = dela(a.data.titel);
      lagg({ sida: `/artiklar/${a.id}`, typ: 'artikel', etikett: `${typLabel(a.data.typ)}${var_} · ${ar}`, titel, undertitel, bild: portratt, farg: '--farg-accent' });
    }
    for (const b of await publicerade('bocker')) {
      const [titel, undertitel] = dela(b.data.titel);
      const etikett = ['Bok', b.data.forlag, b.data.utgivningsar].filter(Boolean).join(' · ');
      lagg({ sida: `/bocker/${b.id}`, typ: 'bok', etikett, titel, undertitel, bild: b.data.omslag ?? portratt, farg: '--farg-accent' });
    }
    for (const m of await publicerade('stodundervisning')) {
      const [titel, undertitel] = dela(m.data.titel);
      lagg({ sida: `/stodundervisning/${m.id}`, typ: 'metod', etikett: `Stödundervisning · ${m.data.omrade} · ${arskursText(m.data)}`, titel, undertitel: undertitel || m.data.undertitel || '', bild: portratt, farg: FARG[m.data.omrade] ?? '--farg-accent' });
    }

    const gemensamt = [String(VERSION), las(MALL).toString('utf8').replace(/\r\n/g, '\n')];
    const bilder = new Map<string, string>();
    const bildSumma = (b: string) => bilder.get(b) ?? bilder.set(b, createHash('sha256').update(las(join('public', b))).digest('hex')).get(b)!;
    return utan.map((k) => {
      const h = createHash('sha256');
      for (const del of [...gemensamt, designsystem(k.farg), JSON.stringify(k), bildSumma(k.bild), bildSumma(portratt)]) h.update(del);
      return { ...k, fil: `/delning/${k.namn}-${h.digest('hex').slice(0, 10)}.jpg` };
    });
  })();
  return alla;
}

// Kortet för en sida: sidans eget, annars närmaste överordnade sidas, annars startsidans.
export async function kortFor(adress: string): Promise<Kort> {
  const kort = await allaKort();
  const karta = new Map(kort.map((k) => [k.sida, k]));
  let sida = decodeURI(adress).replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/+$/, '') || '/';
  while (!karta.has(sida) && sida !== '/') sida = sida.slice(0, sida.lastIndexOf('/')) || '/';
  return karta.get(sida) ?? kort[0];
}
