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

export function harLathund(d: MetodData): boolean {
  return Boolean(d.lathund);
}

const versal = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const gemen = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

// Lathundens fyra faktarutor. Passlängd och frekvens ur tid ("20 minuter per pass, två till tre pass
// i veckan"), perioden ur period, gruppen ur grupp, innehållet ur lathunden.
export function lathundFakta(d: MetodData): { rubrik: string; text: string }[] {
  const [passlangd, ...rest] = (d.tid ?? '').split(/ per pass,?\s*/);
  const frekvens = [rest.join(' ').trim(), d.period ? gemen(d.period) : ''].filter(Boolean).join(' i ');
  return [
    { rubrik: 'Passlängd', text: versal(passlangd.trim()) || '' },
    { rubrik: 'Grupp', text: d.grupp ?? '' },
    { rubrik: 'Frekvens', text: versal(frekvens) },
    { rubrik: 'Innehåll', text: d.lathund?.innehall ?? '' },
  ].filter((f) => f.text);
}

// Faktaremsan på metodkortet i metodbanken: årskurs, grupp, passlängd och hur ofta, ur samma
// fält som lathundens faktarutor, så att kortet aldrig säger emot metoden.
export function kortFakta(d: MetodData): { rubrik: string; text: string }[] {
  // Tiden skrivs "20 minuter per pass, två till tre pass i veckan" (se _mall.yaml). Saknas " per pass"
  // går den inte att dela säkert och visas då hel under Tid.
  const [passlangd, ...rest] = (d.tid ?? '').split(/ per pass,?\s*/);
  const tid = rest.length > 0
    ? [{ rubrik: 'Pass', text: versal(passlangd.trim()) }, { rubrik: 'Hur ofta', text: versal(rest.join(' ').trim()) }]
    : [{ rubrik: 'Tid', text: d.tid ?? '' }];
  return [
    { rubrik: 'Årskurs', text: arskursSpann(d.arskurs).replace(/^åk\s*/, '') },
    { rubrik: 'Grupp', text: d.grupp ?? '' },
    ...tid,
  ].filter((f) => f.text);
}

// Arbetsformen som en rad: "Gemensamt (läraren leder) → i par (eleverna prövar) → gemensamt igen (…)".
export function arbetsformRad(d: MetodData): string {
  if (!d.arbetsform) return '';
  return d.arbetsform.delar
    .map((x, i) => {
      const namn = x.rubrik.replace(/^\d+\.\s*/, '');
      return `${i === 0 ? versal(namn) : gemen(namn)} (${gemen(x.text)})`;
    })
    .join(' → ');
}
