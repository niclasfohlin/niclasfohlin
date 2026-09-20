import type { CollectionEntry } from 'astro:content';

// Metodens data som den ser ut i bygget och i webbläsaren. I metoder.json är datumet en sträng.
export type MetodData = Omit<CollectionEntry<'stodundervisning'>['data'], 'uppdaterad'> & { uppdaterad?: Date | string };
export interface MetodPost { id: string; data: MetodData }

export const UPPHOV = '© Niclas Fohlin';
export const SAJT = 'niclasfohlin.se';
export function metodAdress(bas: string, id: string): string {
  return `${bas.replace(/\/$/, '')}/stodundervisning/${id}`;
}

const ORDNING = ['F-3', '4-6', '7-9'];

// "4-6, 7-9" blir "åk 4–9" när nivåerna hänger ihop, annars räknas de upp.
export function arskursSpann(arskurs: readonly string[]): string {
  const valda = ORDNING.filter((a) => arskurs.includes(a));
  if (valda.length === 0) return '';
  const forsta = ORDNING.indexOf(valda[0]);
  const sista = ORDNING.indexOf(valda[valda.length - 1]);
  if (sista - forsta + 1 !== valda.length) return valda.map((a) => (a.startsWith('F') ? a.replace('-', '–') : `åk ${a.replace('-', '–')}`)).join(', ');
  const start = valda[0].split('-')[0];
  const slut = valda[valda.length - 1].split('-')[1];
  return start === 'F' ? `F–${slut}` : `åk ${start}–${slut}`;
}

// Raden under rubriken i kort, dokument och sökresultat.
export function metaRad(d: MetodData): string {
  return [d.omrade, arskursSpann(d.arskurs), d.tid, d.grupp].filter(Boolean).join(' · ');
}

export function datumText(d?: Date | string): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(d));
}

// Sant när metoden har minst en mall att ladda ner: snabbmall, checklista eller mål.
export function harMallar(d: MetodData): boolean {
  return Boolean(d.snabbmall || d.checklista || d.mal);
}
