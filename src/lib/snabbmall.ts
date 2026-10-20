// Snabbmallen som ramverk (metodriggen 2026-10-20, K-487). Niclas om förlagan i TIL i grupp: "Jag tycker denna är bättre
// än originalet." Bladet gäller veckans pass, eller två till fyra veckors: före passet skriver läraren vad eleverna ska lära
// sig, efter passet det hen såg och vad gruppen gör nästa gång, och de första veckorna kryssar hen de tre sakerna som ska
// med i varje pass. Sist läser hen bladet och skriver två rutor. Formen står i riggens docs/snabbmall.md och i METODER.md,
// tabellen över modellens delar. Det som sidan, Word-filerna och lathunden skriver likadant står här, så att de inte
// säger olika.

/** Perioderna som ett blad kan gälla. */
export const SNABB_PERIODER = ['veckan', 'två veckor', 'tre veckor', 'fyra veckor'] as const;
export type SnabbPeriod = (typeof SNABB_PERIODER)[number];

export interface Snabbmall {
  rubrik: string;
  text?: string;
  pass: number;
  period: SnabbPeriod;
  overst?: string[];
  fore: string;
  foreHjalp?: string;
  efter: string;
  ska: string[];
  sist: string[];
  not?: string;
}

const stor = (s: string) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);

/** Lathundens block snabbmall: Före och Efter som förut, med kolumnernas namn (riggens snabbFalt i build/modell.mjs). */
export const snabbFalt = (s: Snabbmall) => ({ fore: [stor(s.fore)], efter: [stor(s.efter), 'Nästa gång'] });

/** Raden överst på bladet: veckan, eller veckorna bladet gäller. */
export const snabbVeckorna = (s: Snabbmall) => `Vecka ______${s.period === 'två veckor' ? ' och ______' : s.period === 'veckan' ? '' : ' till ______'}`;

/** De fasta orden på bladet. */
export const SNABB = {
  passen: 'Passen',
  pass: 'Pass',
  nasta: 'Nästa gång',
  datum: 'Datum',
  eleverna: 'Eleverna',
  ska: 'Det här ska med i varje pass',
  skaHjalp: 'Kryssa efter passet de första tre veckorna.',
  sistHjalp: 'Läs raderna och kryssen ovanför.',
} as const;

/** Bandet över de två rutorna sist: Sist i veckan, eller Efter två veckor. */
export const snabbSist = (s: Snabbmall) => (s.period === 'veckan' ? 'Sist i veckan' : `Efter ${s.period}`);

/** Passradernas höjd i Word: 3 200 twips delat på passen, mellan 600 och 1 100, som hos riggen. */
export const snabbRadHojd = (pass: number) => Math.max(600, Math.min(1100, Math.floor(3200 / pass)));
