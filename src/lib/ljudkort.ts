// Ljudlekens former (Ljudlek i grupp, 2026-09-29), gemensamma för sidan (Metod.astro, Vikkort.astro, Bokstavskort.astro,
// Bokstavskarta.astro, Golvbokstaver.astro) och Word-filerna (metoddocx.ts), med samma regler som metodriggen
// (C:/metodrigg/build/modell.mjs och build-docx.js), så att riggens kompendium och sajten ritar likadant:
//   vikkort        en kortlista där varje ord har en bild i bildbanken: bilden till vänster och ordet till höger med en
//                  prick under varje ljud (en båge under varje del när orden står i delar), att vika med facit bakom
//   bokstavskort   en kortlista där varje kort är en till tre bokstäver: stora, i elevens typsnitt, utan skrivlinje
//   golvbokstäver  en kortlista vars rubrik börjar med Golvbokstäver och där varje kort är en bokstav: en per A4
//   bokstavskartan en lista (inte kort) med minst tio celler, var och en en bokstav och ett ord ("a apa"), där de
//                  flesta orden har en bild: alfabetet på ett A4
// Har metoden någon av dem står också elevens blad (elevlistor som inte är protokoll) i elevens typsnitt, så att eleven
// möter samma a och l på bladet som på korten. Inga Node-beroenden: metoddocx.ts körs också i webbläsaren.
import BILDBANK from '../data/bildbank.json';
import type { MetodData } from './metod';

// Elevens typsnitt: Andika från SIL (Open Font License 1.1), här som delmängden Ljudlek Elev i public/fonts/ljudlek-elev/
// med licensen. En ändrad fil som används för sig får inte heta Andika (OFL-FAQ 2.6), därför namnet, som metodriggen
// valde. Webbläsaren hämtar woff2-filen (svenska tecken, 14 KB, scripts/elevtypsnitt.py) bara på sidor där något står i
// typsnittet, och Word-filerna bär riggens bredare ttf-fil inbäddad, så att korten ser likadana ut där typsnittet inte
// är installerat.
export const ELEVTYPSNITT = 'Ljudlek Elev';
export const ELEVTYPSNITT_TTF = '/fonts/ljudlek-elev/LjudlekElev-Regular.ttf';
export const ANDIKA_ADRESS = 'https://software.sil.org/andika/';
export const VIK_TEXT = 'Klipp längs strecken och vik längs den blå prickade linjen, så att bilden blir framsidan och ordet baksidan.';

// Upphovet för bildbankens bilder (MIT-licensen kräver det i kopiorna) står en gång under Materialet, inte på korten
// som klipps ut (Niclas 2026-09-29).
export function upphovBilder(d: MetodData): string | undefined {
  const former = allaFormer(d);
  const delar = [former.has('bildkort') && 'bildkorten', former.has('bokstavskarta') && 'bokstavskartan'].filter(Boolean);
  return delar.length ? `Bilderna på ${delar.join(' och ')}: Fluent Emoji, © Microsoft Corporation, MIT-licens.` : undefined;
}

const ORD = (BILDBANK as { ord: Record<string, string> }).ord;
// Ordets bild i bildbanken, eller null. Ett ord i delar ("a-na-nas") har samma bild som ordet ("ananas").
export function bildFor(ord?: string): string | null {
  const nyckel = String(ord ?? '').trim().toLowerCase().replace(/[-\u2060]/g, '');
  const fil = ORD[nyckel];
  return fil ? `/bildbank/${fil}` : null;
}

type Lista = { rubrik?: string; kolumner?: string[]; rader: string[][] };
export const kortCeller = (l: Lista) => l.rader.flat().map((c) => String(c ?? '').trim()).filter(Boolean);
const arKortlista = (d: Pick<MetodData, 'kort'>, l: Lista) => (d.kort?.listor ?? []).some((t) => (l.rubrik ?? '').includes(t));

export type Ljudform = 'bildkort' | 'bokstavskort' | 'golvbokstaver' | 'bokstavskarta';
export function ljudform(d: Pick<MetodData, 'kort'>, l: Lista): Ljudform | undefined {
  const celler = kortCeller(l);
  if (!celler.length) return undefined;
  if (arKortlista(d, l)) {
    if (/^Golvbokst/i.test(l.rubrik ?? '') && celler.every((k) => /^\p{L}$/u.test(k))) return 'golvbokstaver';
    if (celler.every((k) => bildFor(k))) return 'bildkort';
    if (celler.every((k) => /^\p{L}{1,3}$/u.test(k))) return 'bokstavskort';
    return undefined;
  }
  const delar = celler.map((c) => c.match(/^(\p{L})(?:\s+(.+))?$/u));
  if (celler.length >= 10 && delar.every(Boolean) && delar.filter((x) => x?.[2] && bildFor(x[2])).length >= celler.length * 0.7) return 'bokstavskarta';
  return undefined;
}
function allaFormer(d: MetodData): Set<Ljudform> {
  const ut = new Set<Ljudform>();
  for (const ram of d.ramar?.ramar ?? []) for (const l of ram.listor ?? []) { const f = ljudform(d, l); if (f) ut.add(f); }
  return ut;
}
export const harElevtypsnitt = (d: MetodData): boolean => allaFormer(d).size > 0;

// Bokstavskartans celler: bokstaven, ordet och bilden. En bokstav utan bild har sin förklaring i ordets ställe ("som k").
export interface KartCell { bokstav: string; ord: string; bild: string | null }
export function kartCeller(l: Lista): KartCell[] {
  return kortCeller(l).map((c) => {
    const m = c.match(/^(\p{L})(?:\s+(.+))?$/u)!;
    return { bokstav: m[1], ord: m[2] ?? '', bild: m[2] ? bildFor(m[2]) : null };
  });
}

// Vikkortets ord i enheter med en prick under varje: ett ljud per bokstav, och dubbelteckning och ck är ett ljud med en
// prick (Niclas 2026-09-29). Står orden i delar (a-na-nas) är enheterna delarna, med en båge under varje, så att
// prickarna alltid betyder ljud i serien (Ord och stavelser).
export const arDelark = (kort: string[]): boolean => kort.some((k) => k.includes('-'));
export function ljudenheter(ord: string, delar = false): string[] {
  const rent = String(ord).replace(/\u2060/g, '');
  if (delar) return rent.split('-').filter(Boolean);
  const tecken = [...rent];
  const ut: string[] = [];
  for (let i = 0; i < tecken.length; i++) {
    const c = tecken[i];
    const n = tecken[i + 1];
    if (n && !/[aeiouyåäö]/i.test(c) && (n === c || (c === 'c' && n === 'k'))) { ut.push(c + n); i++; } else ut.push(c);
  }
  return ut;
}

// Bilderna en metod behöver, för Word-filerna: vid bygget läses de från disken, i webbläsaren hämtas de.
export function metodensBilder(d: MetodData): string[] {
  const ut = new Set<string>();
  for (const ram of d.ramar?.ramar ?? []) {
    for (const l of ram.listor ?? []) {
      const f = ljudform(d, l);
      if (f === 'bildkort') for (const k of kortCeller(l)) ut.add(bildFor(k)!);
      if (f === 'bokstavskarta') for (const c of kartCeller(l)) if (c.bild) ut.add(c.bild);
    }
  }
  return [...ut];
}
