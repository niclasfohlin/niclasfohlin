// Metodkortets profil för undervisningsmetoderna, ett utkast för formen (K-623; Niclas 2026-10-29: "Skapa ett utkast på
// ett kort för Direct instruction så som jag beskrev det. Mest för design."). Tabellen och orden är metodriggens utkast 2
// (C:/metodrigg/docs/undervisningsmetoder/standarden.md, avsnitt 5): säkerheten sätter taket och effekten nivån. De flyttar
// till src/lib/standard/ när standarden är låst, så att riggen och sajten läser samma sak, och utkastets värden byts mot
// metodens fil i samlingen src/content/undervisningsmetoder/.
import { uppraknat } from './standard/index.js';

export type Sakerhet = 'hog' | 'mattlig' | 'lag';
export type Effekt = 'negativ' | 'ingen' | 'liten' | 'mattlig' | 'stor';
export type Omradesvarde = { sakerhet: Sakerhet; effekt: Effekt; skal: string } | { inteStuderat: true; skal: string };
export type Omrade = 'larande' | 'lasning' | 'skrivning' | 'matematik' | 'amneskunskaper' | 'socialt';

/** Staplarnas områden i standardens ordning. Lärande totalt sammanfattar och står först. */
export const OMRADEN: readonly { id: Omrade; namn: string; under?: string }[] = [
  { id: 'larande', namn: 'Lärande totalt' },
  { id: 'lasning', namn: 'Läsning' },
  { id: 'skrivning', namn: 'Skrivning' },
  { id: 'matematik', namn: 'Matematik' },
  // Niclas 2026-10-29: "Istället för ämneskunskaper: ämnen". Id:t följer riggens standard tills den byter det.
  { id: 'amneskunskaper', namn: 'Ämnen', under: 'SO, NO och teknik' },
  { id: 'socialt', namn: 'Socialt' },
];

// Nivån ur säkerheten och effekten. Negativ och ingen effekt ger båda 1, med var sitt ord.
const TABELL: Record<Sakerhet, Record<'ingen' | 'liten' | 'mattlig' | 'stor', number>> = {
  hog: { ingen: 1, liten: 3, mattlig: 4, stor: 5 },
  mattlig: { ingen: 1, liten: 3, mattlig: 4, stor: 4 },
  lag: { ingen: 1, liten: 2, mattlig: 2, stor: 2 },
};
export const NIVAORD = ['', 'Ingen påvisad effekt', 'Lovande', 'Visst stöd', 'Gott stöd', 'Starkt stöd'] as const;
const SAKERHET: Record<Sakerhet, string> = { hog: 'Hög säkerhet', mattlig: 'Måttlig säkerhet', lag: 'Låg säkerhet' };
const EFFEKT: Record<Effekt, string> = { negativ: 'negativ effekt', ingen: 'ingen effekt', liten: 'liten effekt', mattlig: 'måttlig effekt', stor: 'stor effekt' };

/** Nivån 1 till 5, dess ord och underlaget i ord, eller null för ett område som inte är studerat. */
export function nivan(v: Omradesvarde): { niva: number; ord: string; underlag: string } | null {
  if ('inteStuderat' in v) return null;
  const niva = TABELL[v.sakerhet][v.effekt === 'negativ' ? 'ingen' : v.effekt];
  return { niva, ord: niva === 1 && v.effekt === 'negativ' ? 'Negativ effekt' : NIVAORD[niva], underlag: `${SAKERHET[v.sakerhet]}, ${EFFEKT[v.effekt]}.` };
}

/** Primär evidens: de områden utom Lärande totalt som har den högsta nivån, när den är minst 3. */
export function primar(evidens: Record<Omrade, Omradesvarde>): string {
  const fem = OMRADEN.filter((o) => o.id !== 'larande').map((o) => ({ namn: o.namn, niva: nivan(evidens[o.id])?.niva ?? 0 }));
  const hogst = Math.max(...fem.map((x) => x.niva));
  const namn = hogst >= 3 ? fem.filter((x) => x.niva === hogst).map((x, i) => (i ? x.namn.toLocaleLowerCase('sv') : x.namn)) : [];
  return namn.length ? uppraknat(namn) : 'Inget område med minst visst stöd';
}

// Svårighet och Kostnad: ordet bredvid de neutrala staplarna (src/components/Staplar.astro). Orden är platshållare tills
// evidensens rubrik för svensk skola är skriven.
const INFORORD = ['', 'Mycket låg', 'Låg', 'Måttlig', 'Hög', 'Mycket hög'] as const;
export const inforOrd = (niva: number) => INFORORD[niva];

export interface Utkast {
  id: string; titel: string; alternativaNamn: string[]; undertitel: string; ingress: string; arskursText: string;
  fakta: [string, string][]; evidens: Record<Omrade, Omradesvarde>;
  svarighet: { niva: number; skal: string }; kostnad: { niva: number; skal: string };
}

const PLATS = 'Platshållare. Här står en mening om vad studierna visar, för vilka elever och hur säkert det är, med källan.';

/**
 * Piloten, Explicit undervisning, som riggens skelett (C:/metodrigg/docs/undervisningsmetoder/skelett-explicit-undervisning.yaml):
 * titeln som Niclas valde 2026-10-29, de alternativa namnen, undertiteln, ingressen, tiden och perioden, och riggens
 * preliminära skäl för Svårighet och Kostnad. Evidensens värden är platshållare som visar varje läge i formen, och inget
 * omdöme om metoden.
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
    larande: { sakerhet: 'hog', effekt: 'mattlig', skal: PLATS },
    lasning: { sakerhet: 'mattlig', effekt: 'mattlig', skal: PLATS },
    skrivning: { sakerhet: 'lag', effekt: 'stor', skal: PLATS },
    matematik: { sakerhet: 'hog', effekt: 'stor', skal: PLATS },
    amneskunskaper: { sakerhet: 'mattlig', effekt: 'liten', skal: PLATS },
    socialt: { inteStuderat: true, skal: 'Platshållare. Här står vad studierna i urvalet mätte, och att ingen av dem mätte det sociala. Inte studerat betyder att vi inte vet, och inte att metoden saknar effekt.' },
  },
  svarighet: { niva: 2, skal: 'Klassen lär sig få rutiner. Det svåra är att dela upp innehållet i små steg och att vänta på alla svar.' },
  kostnad: { niva: 1, skal: 'Minitavlor och pennor. Planeringstiden går till stegen och exemplen.' },
};
