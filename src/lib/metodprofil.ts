// Metodkortets profil för undervisningsmetoderna (K-623, form godkänd som version 1; K-621, ur metodens fil). Nivåerna,
// orden, Svårighet och Kostnad och kommentaren under Lärande totalt räknas i standarden (src/lib/standard/
// undervisningsmetod.js, K-632), som riggen och lathunden också läser, så att kortet, lathunden och riggens spärrar säger
// samma sak. Här står det som bara kortet gör: områdena i kortets ordning, de primära områdena och kortet ur metodens fil i
// samlingen src/content/undervisningsmetoder/ (`kortetUrFil`). PILOTEN är utkastet med platshållare som K-623 visade formen med.
import { faktaIFastForm, laget, uppraknat, type Effekt, type Kostnad, type Omradesvarde, type Svarighet, type Tillforlitlighet } from './standard/index.js';

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

export interface Utkast {
  id: string; titel: string; alternativaNamn: string[]; undertitel: string; ingress: string; arskursText: string;
  fakta: [string, string][]; evidens: Record<Omrade, Omradesvarde>; svarighet: Svarighet; kostnad: Kostnad;
  /** Värdena är platshållare, som i K-623:s utkast, och kortet säger det. */
  platshallare?: boolean;
}

/** Det kortet läser i metodens fil (src/content/undervisningsmetoder/<id>.yaml). */
export interface Kortfalt {
  titel: string; alternativaNamn?: string[]; undertitel?: string; ingress: string; arskursText?: string; arskurs: string[];
  tid: string; period: string;
  profil: { evidens: Record<Omrade, Omradesvarde>; svarighet: Svarighet; kostnad: Kostnad };
}

/**
 * Kortet ur metodens fil: faktan i fast form ur faktarutans tid och period, med samlingens ord för passen, och profilen som
 * den står. Ett faktafält som inte går att läsa stoppar bygget, som i Stödundervisning, så att kortet aldrig har en tom cell.
 */
export function kortetUrFil(id: string, d: Kortfalt): Utkast {
  // Kortet har rubrikerna Lektion och Hur ofta, så takten står utan ord: "minst 3/vecka" (en rad i telefonen).
  const f = faktaIFastForm({ tid: d.tid, period: d.period }, { passen: '' });
  const tomma = (['pass', 'ofta', 'period'] as const).filter((k) => !f[k]);
  if (tomma.length) throw new Error(`${id}: faktarutans ${tomma.join(', ')} går inte att läsa ur tid "${d.tid}" och period "${d.period}"`);
  const arskursText = d.arskursText ?? d.arskurs.join(', ');
  return {
    id, titel: d.titel, alternativaNamn: d.alternativaNamn ?? [], undertitel: d.undertitel ?? '', ingress: d.ingress, arskursText,
    fakta: [['Lektion', f.pass!], ['Hur ofta', f.ofta!], ['De första veckorna', f.period!], ['Årskurs', arskursText]],
    evidens: d.profil.evidens, svarighet: d.profil.svarighet, kostnad: d.profil.kostnad,
  };
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
    socialt: { niva: 'inte-studerat', motivering: 'Platshållare: här står vad studierna i urvalet mätte, och att ingen av dem mätte det sociala.' },
  },
  svarighet: { lara: 3, karnan: 3, stod: 3, tid: 3, motivering: 'Läraren övar nya drag: att visa i små steg med samma ord, leda övningen i högt tempo och vänta med eget arbete tills nästan alla kan.' },
  kostnad: { kop: 2, timmar: 10, motivering: 'Miniwhiteboards och exit-lappar. Timmarna är läsningen, tre möten i arbetslaget, samtalen efter två observationer och en timme i veckan för stegen och orden de första veckorna.' },
  platshallare: true,
};
