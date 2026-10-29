// Metodkortets profil för undervisningsmetoderna, ett utkast för formen (K-623; Niclas 2026-10-29: "Skapa ett utkast på
// ett kort för Direct instruction så som jag beskrev det. Mest för design."). Tabellen, orden och funktionerna följer
// metodriggens standard (C:/metodrigg/docs/undervisningsmetoder/evidensen.md och build/sparrprov.mjs, riggens 77c3807):
// tillförlitligheten sätter taket och effekten nivån, låg tillförlitlighet utan effekt är Oklart, och Svårighet och
// Kostnad räknas ur kriterierna. De flyttar till src/lib/standard/ när standarden är låst, så att riggen och sajten
// räknar med samma funktion, och utkastets värden byts mot metodens fil i samlingen src/content/undervisningsmetoder/.
import { uppraknat } from './standard/index.js';

export type Tillforlitlighet = 'hog' | 'mattlig' | 'lag';
export type Effekt = 'negativ' | 'ingen' | 'liten' | 'mattlig' | 'stor';
export type Omradesvarde = { tillforlitlighet: Tillforlitlighet; effekt: Effekt; motivering: string } | { inteStuderat: true; motivering: string };
export type Omrade = 'larande' | 'lasning' | 'skrivning' | 'matematik' | 'amnen' | 'socialt';

/** Staplarnas områden i standardens ordning. Lärande totalt sammanfattar och står först. */
export const OMRADEN: readonly { id: Omrade; namn: string; under?: string }[] = [
  { id: 'larande', namn: 'Lärande totalt' },
  { id: 'lasning', namn: 'Läsning' },
  { id: 'skrivning', namn: 'Skrivning' },
  { id: 'matematik', namn: 'Matematik' },
  // Niclas 2026-10-29: "Istället för ämneskunskaper: ämnen".
  { id: 'amnen', namn: 'Ämnen', under: 'SO, NO och teknik' },
  { id: 'socialt', namn: 'Socialt' },
];

// Nivån ur tillförlitligheten och effekten. Låg tillförlitlighet utan effekt eller med negativ effekt är Oklart, och 1
// kräver minst måttlig tillförlitlighet.
const TABELL: Record<Tillforlitlighet, Record<Effekt, number | 'oklart'>> = {
  hog: { negativ: 1, ingen: 1, liten: 3, mattlig: 4, stor: 5 },
  mattlig: { negativ: 1, ingen: 1, liten: 3, mattlig: 4, stor: 4 },
  lag: { negativ: 'oklart', ingen: 'oklart', liten: 2, mattlig: 2, stor: 2 },
};
// Orden prövades på en kall läsare 2026-10-29: med Svagt stöd och Inget påvisat stöd ordnade fem lärare dem lika.
export const NIVAORD = ['', 'Inget påvisat stöd', 'Svagt stöd', 'Visst stöd', 'Gott stöd', 'Starkt stöd'] as const;

/** Läget för ett område: en nivå 1 till 5 med sitt ord, Negativ effekt, Oklart eller Inte studerat. */
export type Laget = { slag: 'niva'; niva: number; ord: string; negativ: boolean } | { slag: 'oklart' | 'inte'; ord: string };
export function laget(v: Omradesvarde): Laget {
  if ('inteStuderat' in v) return { slag: 'inte', ord: 'Inte studerat' };
  const n = TABELL[v.tillforlitlighet][v.effekt];
  if (n === 'oklart') return { slag: 'oklart', ord: 'Oklart' };
  const negativ = n === 1 && v.effekt === 'negativ';
  return { slag: 'niva', niva: n, ord: negativ ? 'Negativ effekt' : NIVAORD[n], negativ };
}

/** Motiveringen börjar med tillförlitligheten och effekten, som standarden kräver; kortet gör den meningen fet. */
export function motiveringensDelar(text: string): { forst: string; resten: string } {
  const m = text.match(/^(.+?\.)\s+(.*)$/s);
  return m ? { forst: m[1], resten: m[2] } : { forst: '', resten: text };
}

/**
 * Primär evidens: sajtens fyra områden, som i Stödundervisning, med deras färger (Niclas 2026-10-29: "ska det inte vara
 * sajtens kort för Matematik (primär effekt blir de fyra läs, skrv, matematik, socialt)"). Högst två områden med den högsta
 * nivån, minst Visst stöd. Står fler än två lika avgör tillförlitligheten och sedan effekten, och sist sajtens ordning.
 * Ämnen och Lärande totalt blir aldrig primära. Kortet tar det första områdets färg.
 */
const FYRA: readonly { id: Omrade; namn: string }[] = [
  { id: 'lasning', namn: 'Läsning' }, { id: 'skrivning', namn: 'Skrivning' }, { id: 'matematik', namn: 'Matematik' }, { id: 'socialt', namn: 'Socialt' },
];
const VIKT_T: Record<Tillforlitlighet, number> = { hog: 3, mattlig: 2, lag: 1 };
const VIKT_E: Record<Effekt, number> = { stor: 4, mattlig: 3, liten: 2, ingen: 1, negativ: 0 };
export function primaraOmraden(evidens: Record<Omrade, Omradesvarde>): string[] {
  const kandidater = FYRA.map((o, ordning) => {
    const v = evidens[o.id];
    const l = laget(v);
    return { namn: o.namn, ordning, niva: l.slag === 'niva' && !l.negativ ? l.niva : 0, t: 'tillforlitlighet' in v ? VIKT_T[v.tillforlitlighet] : 0, e: 'effekt' in v ? VIKT_E[v.effekt] : 0 };
  }).filter((x) => x.niva >= 3);
  const hogst = Math.max(0, ...kandidater.map((x) => x.niva));
  return kandidater.filter((x) => x.niva === hogst).sort((a, b) => b.t - a.t || b.e - a.e || a.ordning - b.ordning).slice(0, 2).map((x) => x.namn);
}
export const primar = (evidens: Record<Omrade, Omradesvarde>): string => {
  const namn = primaraOmraden(evidens);
  return namn.length ? uppraknat(namn.map((n, i) => (i ? n.toLocaleLowerCase('sv') : n))) : 'Inget område med minst visst stöd';
};

// Svårighet och Kostnad ur kriterierna (evidensen.md, avsnitt 7). Svårigheten är den övre medianen av fyra, kostnaden den
// högre av inköpet och timmarna. Orden: mer betyder mer arbete eller pengar, och de grå staplarna säger samma sak.
export type Svarighet = { lara: number; karnan: number; stod: number; tid: number; motivering: string };
export type Kostnad = { kop: number; timmar: number; motivering: string };
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : s[s.length / 2]; };
export const svarighetensNiva = (s: Svarighet) => median([s.lara, s.karnan, s.stod, s.tid]);
export const kostnadensNiva = (k: Kostnad) => Math.max(k.kop, k.timmar < 5 ? 1 : k.timmar < 15 ? 2 : k.timmar < 40 ? 3 : k.timmar < 80 ? 4 : 5);
export const SVARIGHETENS_ORD = ['', 'Mycket lätt', 'Lätt', 'Medelsvårt', 'Svårt', 'Mycket svårt'] as const;
export const KOSTNADENS_ORD = ['', 'Mycket låg', 'Låg', 'Måttlig', 'Hög', 'Mycket hög'] as const;

export interface Utkast {
  id: string; titel: string; alternativaNamn: string[]; undertitel: string; ingress: string; arskursText: string;
  fakta: [string, string][]; evidens: Record<Omrade, Omradesvarde>; svarighet: Svarighet; kostnad: Kostnad;
}

// Platshållarnas motivering börjar som standarden kräver, med tillförlitligheten och effekten i ord.
const ORDET: Record<Tillforlitlighet, string> = { hog: 'Hög', mattlig: 'Måttlig', lag: 'Låg' };
const plats = (t: Tillforlitlighet, e: Effekt) => ({ tillforlitlighet: t, effekt: e, motivering: `${ORDET[t]} tillförlitlighet, ${e === 'mattlig' ? 'måttlig' : e} effekt. Platshållare: här står vad den bästa källan visar och för vilka elever, med källan.` });

/**
 * Piloten, Explicit undervisning, som riggens skelett (C:/metodrigg/docs/undervisningsmetoder/skelett-explicit-undervisning.yaml):
 * titeln som Niclas valde 2026-10-29, de alternativa namnen, undertiteln, ingressen, tiden och perioden, och riggens
 * kriterier och motiveringar för Svårighet och Kostnad. Evidensens värden väntar på riggens bedömning, så kortet har
 * platshållare som visar lägena i formen, och inget omdöme om metoden.
 */
export const PILOTEN: Utkast = {
  id: 'explicit-undervisning',
  titel: 'Explicit undervisning',
  alternativaNamn: ['Direktinstruktion', 'Strukturerad undervisning', 'Direct Instruction'],
  undertitel: 'Ett sätt att undervisa i helklass när något nytt ska läras, F–9',
  ingress: 'Du visar det nya i små steg, klassen gör det med dig tills nästan alla kan, och sedan gör var och en själv. Alla svarar ofta, så att du ser vem som behöver mer innan någon övar fel.',
  arskursText: 'F–9',
  fakta: [['Lektion', '50 min'], ['Hur ofta', '2–5 i veckan'], ['Införande', '4 veckor'], ['Årskurs', 'F–9']],
  evidens: {
    larande: plats('hog', 'mattlig'),
    lasning: plats('mattlig', 'liten'),
    skrivning: plats('lag', 'stor'),
    matematik: plats('hog', 'stor'),
    amnen: { tillforlitlighet: 'lag', effekt: 'ingen', motivering: 'Låg tillförlitlighet, ingen effekt. Platshållare: här står vad som finns, som tre små studier utan effekt, och varför det inte räcker för att säga något.' },
    socialt: { inteStuderat: true, motivering: 'Platshållare: här står vad studierna i urvalet mätte, och att ingen av dem mätte det sociala.' },
  },
  svarighet: { lara: 3, karnan: 3, stod: 3, tid: 3, motivering: 'Läraren övar nya drag: att visa i små steg med samma ord, leda övningen i högt tempo och vänta med eget arbete tills nästan alla kan.' },
  kostnad: { kop: 2, timmar: 10, motivering: 'Miniwhiteboards och exit-lappar. Timmarna är läsningen, tre möten i arbetslaget, samtalen efter två observationer och en timme i veckan för stegen och orden de första veckorna.' },
};
