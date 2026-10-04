// Ljudlekens former (Ljudlek i grupp, 2026-09-29), gemensamma för sidan (Metod.astro, Vikkort.astro, Bokstavskort.astro,
// Bokstavskarta.astro, Golvbokstaver.astro) och Word-filerna (metoddocx.ts), med samma regler som metodriggen
// (C:/metodrigg/build/modell.mjs och build-docx.js), så att riggens kompendium och sajten ritar likadant:
//   vikkort        en kortlista där varje ord har en bild i bildbanken: bilden till vänster och ordet till höger med en
//                  prick under varje ljud (en båge under varje del när orden står i delar), att vika med facit bakom
//   bokstavskort   en kortlista där varje kort är en till tre bokstäver: stora, i elevens typsnitt, utan skrivlinje
//   golvbokstäver  en kortlista vars rubrik börjar med Golvbokstäver och där varje kort är en bokstav: en per A4
//   bokstavskartan en lista (inte kort) med minst tio celler, var och en en bokstav och ett ord ("a apa"), där de
//                  flesta orden har en bild: alfabetet på ett A4
// Elevens typsnitt gäller sedan 2026-09-30 allt elevmaterial i alla metoder (K-130, harElevtypsnitt nedan). Inga
// Node-beroenden: metoddocx.ts körs också i webbläsaren.
import BILDBANK from '../data/bildbank.json';
import type { MetodData } from './metod';
import { metodensFilmer, stillbilder } from './film';
import { metodensPaBordet } from './pabordet';

// Elevens typsnitt: Andika från SIL (Open Font License 1.1), här som delmängden Ljudlek Elev i public/fonts/ljudlek-elev/
// med licensen. En ändrad fil som används för sig får inte heta Andika (OFL-FAQ 2.6), därför heter webbens fil Ljudlek
// Elev, som metodriggen valde. scripts/elevtypsnitt.py gör båda filerna ur Andika med samma tecken: webbläsaren hämtar
// woff2-filen (14 KB) bara på sidor där något står i typsnittet, och Word-filerna bär ttf-filen (33 KB) inbäddad, så att
// elevmaterialet ser likadant ut där typsnittet inte är installerat. scripts/paritet.mjs prövar att varje tecken finns.
//
// I Word-filerna heter elevens typsnitt Andika (Niclas 2026-09-30, hans beslut om rättigheterna: "Vi får kalla vår
// Andika som är nerbantad"). Ett typsnitt som bäddas in i ett dokument, helt eller som delmängd, omfattas inte av
// licensens regler om ändrade versioner (OFL-FAQ 1.11 och 1.12), och Word bäddar in det förvrängt i filen. Google
// Dokument läser inte inbäddade typsnitt men har Andika själv, så med det namnet står elevtexterna i Andika också där,
// vare sig filen sparas med Drive-knappen eller laddas upp för hand. Word använder den inbäddade delmängden.
export const ELEVTYPSNITT = 'Andika';
export const ELEVTYPSNITT_TTF = '/fonts/ljudlek-elev/LjudlekElev-Regular.ttf';
export const ANDIKA_ADRESS = 'https://software.sil.org/andika/';
export const VIK_TEXT = 'Klipp längs strecken och vik längs den blå prickade linjen, så att bilden blir framsidan och ordet baksidan.';

// Upphovet för bildbankens bilder (MIT-licensen kräver det i kopiorna) står en gång under Materialet, inte på korten
// som klipps ut (Niclas 2026-09-29).
export function upphovBilder(d: MetodData): string | undefined {
  const former = allaFormer(d);
  const listor = (d.ramar?.ramar ?? []).flatMap((r) => r.listor ?? []).filter((l) => arBildlista(l)).map(bildlistansNamn);
  const delar = [former.has('bildkort') && 'bildkorten', former.has('bokstavskarta') && 'bokstavskartan', ...listor].filter(Boolean);
  return delar.length ? `Bilderna på ${delar.join(' och ')}: Fluent Emoji, © Microsoft Corporation, MIT-licens.` : undefined;
}

const ORD = (BILDBANK as { ord: Record<string, string> }).ord;
// Ordets bild i bildbanken, eller null. Ett ord i delar ("a-na-nas") har samma bild som ordet ("ananas").
export function bildFor(ord?: string): string | null {
  const nyckel = String(ord ?? '').trim().toLowerCase().replace(/[-\u2060]/g, '');
  const fil = ORD[nyckel];
  return fil ? `/bildbank/${fil}` : null;
}

type Lista = { rubrik?: string; kolumner?: string[]; rader: string[][]; bilder?: boolean };
export const kortCeller = (l: Lista) => l.rader.flat().map((c) => String(c ?? '').trim()).filter(Boolean);
// En lista med en bild över varje ord (listans fält bilder, Kompissamtal: kortet Peka på känslan): sidan ritar den med
// Bildlista.astro och Word med bildlista i src/lib/metoddocx.ts. Saknas en bild står listan som vanligt; schemat stoppar det.
export const arBildlista = (l: Lista): boolean => !!l.bilder && kortCeller(l).length > 0 && kortCeller(l).every((k) => bildFor(k));
// Hur upphovsraden nämner listan: "Bilderna på kortet Peka på känslan: …".
// Ett namn som slutar med frågetecken eller utropstecken står inom citattecken, så att kolonet efter det läses rätt:
// "Bilderna på kortet ”Vad behöver hen?”: Fluent Emoji" (Seriesamtal, metodriggens upphovsrad 2026-10-04).
export const bildlistansNamn = (l: Lista): string => (l.rubrik ? (/[?!]$/.test(l.rubrik.trim()) ? `kortet ”${l.rubrik.trim()}”` : `kortet ${l.rubrik}`) : 'korten med bilder');
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
// Elevens typsnitt i allt elevmaterial (Niclas 2026-09-29, K-130: "allt som ligger på bordet och är elevmaterial"), med
// metodriggens regler (docs/elevmaterial.md): listor och kort som eleven läser, läskorten, elevens blad, mallarna och
// diplomet, i alla metoder, så att eleven möter samma a, g och l överallt. Lärarens protokoll och listor märkta
// larare: true, lathunden och ramarnas delar till läraren eller hemmet står i husets typsnitt. En bildserie är elevens
// blad (seriens namn och namnraden, Seriesamtal). En metod utan elevmaterial
// behöver inte typsnittet, och då laddas och bäddas det inte in.
export const harElevmaterial = (d: MetodData): boolean =>
  (d.ramar?.ramar ?? []).some((r) => (r.listor?.length ?? 0) > 0 || !!r.serie) || Object.keys(d.elevblad ?? {}).length > 0 || d.mallar.length > 0 || !!d.diplom;
export const harElevtypsnitt = (d: MetodData): boolean => allaFormer(d).size > 0 || harElevmaterial(d);

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

// Bilderna en metod behöver, för Word-filerna: vid bygget läses de från disken, i webbläsaren hämtas de. Filmernas
// stillbilder, huvudfilmens och extrafilmernas (src/lib/film.ts), hittas genom metodens id.
export function metodensBilder(d: MetodData, id?: string): string[] {
  const ut = new Set<string>();
  if (id) for (const f of metodensFilmer(d, id)) for (const b of stillbilder(f)) ut.add(b);
  // Bilderna På bordet (src/lib/pabordet.ts) står i Word-filen i satsens bredd.
  if (id) for (const b of metodensPaBordet(d, id)) ut.add(b.adress);
  for (const ram of d.ramar?.ramar ?? []) {
    for (const l of ram.listor ?? []) {
      const f = ljudform(d, l);
      if (f === 'bildkort') for (const k of kortCeller(l)) ut.add(bildFor(k)!);
      if (f === 'bokstavskarta') for (const c of kartCeller(l)) if (c.bild) ut.add(c.bild);
      if (arBildlista(l)) for (const k of kortCeller(l)) ut.add(bildFor(k)!);
    }
  }
  return [...ut];
}
