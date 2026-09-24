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

// Årskursen som läsaren ser: arskursText när metoden anger en ("åk 3–6"), annars nivåerna.
export function arskursText(d: Pick<MetodData, 'arskurs' | 'arskursText'>): string {
  return d.arskursText ?? arskursSpann(d.arskurs);
}

// Raden under rubriken i kort, dokument och sökresultat.
export function metaRad(d: MetodData): string {
  return [d.omrade, arskursText(d), d.tid, d.grupp].filter(Boolean).join(' · ');
}

export function datumText(d?: Date | string): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(d));
}

// Sant när metoden har minst en mall att ladda ner: snabbmall, checklista, mål, kontrakt, schema, ramar eller diplom.
export function harMallar(d: MetodData): boolean {
  return Boolean(d.snabbmall || d.checklista || d.mal || d.hem?.kontrakt || d.hem?.schema || d.ramar || d.diplom);
}

// En ram där alla fält är tomma är en mall att fylla i.
export function ramArTom(ram: { huvud?: { text: string }[]; delar: { falt: { text: string }[] }[] }): boolean {
  return ram.delar.every((del) => del.falt.every((f) => !f.text.trim())) && (ram.huvud ?? []).every((f) => !f.text.trim());
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
    { rubrik: 'Årskurs', text: arskursText(d).replace(/^åk\s*/, '') },
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

// Passöversikten: när passrutinens steg har faser slås rutinen, tidsschemat och arbetsformen ihop till
// en remsa (faserna med minuter och arbetsformens delar under) och en tabell med en rad per fas. Raden
// "Före passet" hämtas ur tidsschemat (tiden börjar inte med en siffra), "Efter passet" ur passrutin.efterPasset.
export interface PassFas { fas: string; tid: string; vad: string; minuter: number; steg: { nr: number; text: string }[] }
export interface PassOversikt { rubrik: string; text?: string; fore?: string; efter?: string; efterTabell?: string; faser: PassFas[]; total: number; delar: { rubrik: string; text: string; fran: number; antal: number; tid: string }[] }
export function passOversikt(d: MetodData): PassOversikt | null {
  const steg = d.passrutin?.steg ?? [];
  if (!d.passrutin || !d.tidsschema || !steg.length || steg.some((s) => typeof s === 'string')) return null;
  const objekt = steg as { text: string; fas: string }[];
  const rader = d.tidsschema.rader;
  const arFore = (r: { tid: string }) => !/^\d/.test(r.tid.trim());
  const fore = rader.find(arFore);
  let nr = 0;
  const faser: PassFas[] = rader.filter((r) => !arFore(r)).map((r) => {
    const m = r.tid.match(/(\d+)\s*[–-]\s*(\d+)/);
    const minuter = m ? Math.max(1, Number(m[2]) - Number(m[1])) : 1;
    const egna = objekt.filter((s) => s.fas.toLowerCase() === r.fas.toLowerCase()).map((s) => ({ nr: ++nr, text: s.text }));
    return { fas: r.fas, tid: r.tid, vad: r.vad, minuter, steg: egna };
  });
  const total = faser.reduce((a, f) => a + f.minuter, 0);
  const index = (fas: string) => faser.findIndex((f) => f.fas.toLowerCase() === fas.toLowerCase());
  const delar = (d.arbetsform?.delar ?? []).filter((x) => x.faser?.length).map((x) => {
    const platser = x.faser!.map(index).filter((i) => i >= 0).sort((a, b) => a - b);
    const forsta = faser[platser[0]].tid.match(/\d+/)?.[0] ?? '';
    const sista = faser[platser[platser.length - 1]].tid.match(/(\d+)\s*[–-]\s*(\d+)/)?.[2] ?? '';
    return { rubrik: x.rubrik.replace(/^\d+\.\s*/, ''), text: x.text, fran: platser[0], antal: platser[platser.length - 1] - platser[0] + 1, tid: forsta && sista ? `${forsta}–${sista} min` : '' };
  });
  return { rubrik: d.tidsschema.rubrik, text: d.tidsschema.text, fore: fore?.vad, efter: d.passrutin.efterPasset, efterTabell: d.tidsschema.efter, faser, total, delar };
}
// Rutinens steg som texter, oavsett om de har fas.
export function stegTexter(d: MetodData): string[] {
  return (d.passrutin?.steg ?? []).map((s) => (typeof s === 'string' ? s : s.text));
}
