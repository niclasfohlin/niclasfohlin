// Ramarnas form som sidan (Metod.astro, utskriften) och Word-filerna (metoddocx.ts) delar. Inga Node-beroenden.
import { arProtokoll } from './metod';

type Ram = {
  huvud?: { rubrik: string; text: string }[];
  delar: { rubrik: string; falt: { rubrik: string; text: string }[] }[];
  listor?: Lista[];
};

type Lista = { rubrik?: string; kolumner?: string[]; rader: string[][] };

// En lästext (Textsamtal i grupp; Niclas 2026-10-01: lästexterna ska se ut som en gammal bok, ett till ett med
// metodriggen): en ram som heter "<nivå>, <vad>: <titel>", vars första lista heter som titeln och är texten, ett stycke
// per rad, och vars andra och sista lista heter Frågorna, utan kolumner, huvud eller översikt. Samma regel som riggens
// build/modell.mjs (somLastext), så att riggens metodfil fungerar som den är. Word (metoddocx.ts, boksida), sidan och
// utskriften (Metod.astro) ritar den som en boksida, utan ramens text: bladet är elevens. Rutan Till läraren blir en rad
// i sidfoten. Nivåerna numreras i den ordning de först kommer, och knappen i sidfoten får nivåns färg efter numret.
export interface Lastext { niva: string; nivaNr: number; vad: string; titel: string; stycken: string[]; fragor: string[]; not: string }
type RamMedRubrik = Ram & { rubrik: string; oversikt?: unknown };
export function lastexter<R extends RamMedRubrik>(ramar: R[]): Map<R, Lastext> {
  const nivaer: string[] = [];
  const ut = new Map<R, Lastext>();
  for (const ram of ramar) {
    const m = ram.rubrik.match(/^([^,:]+), ([^:]+): (.+)$/);
    const [text, fragor] = ram.listor ?? [];
    if (!m || (ram.listor ?? []).length !== 2 || text.rubrik !== m[3] || fragor.rubrik !== 'Frågorna' || text.kolumner || fragor.kolumner || ram.huvud || ram.oversikt) continue;
    if (!nivaer.includes(m[1])) nivaer.push(m[1]);
    const not = ram.delar.map((del) => `${del.rubrik} · ${del.falt.map((f) => `${f.rubrik}: ${f.text}`).join(' ')}`).join(' ');
    ut.set(ram, { niva: m[1], nivaNr: nivaer.indexOf(m[1]), vad: m[2], titel: m[3], stycken: text.rader.map((r) => String(r[0])), fragor: fragor.rader.map((r) => String(r[0])), not });
  }
  return ut;
}
// Har metoden lästexter, som blir boksidor? Då bär Word-filen Cinzel och Cinzel Decorative (public/fonts/boksida/).
export const harLastexter = (d: { ramar?: { ramar: RamMedRubrik[] } }): boolean => lastexter(d.ramar?.ramar ?? []).size > 0;
export const BOKTYPSNITT_TTF = { cinzel: '/fonts/boksida/Cinzel-dokument.ttf', dekor: '/fonts/boksida/CinzelDecorative-dokument.ttf' };

// En text med frågor (screeningens nivå 6–8 i Ljudlek i grupp, som i Niclas original): två kolumner, texten som eleven
// läser till vänster och frågorna som läraren läser upp till höger. Kolumnen till höger är frågor när varje ifylld rad
// slutar med frågetecken. Texten står för sig och frågorna för sig, kursivt och mindre, på sidan och i Word.
export function harFragor(l: Lista): boolean {
  if (l.kolumner || !l.rader.length || !l.rader.every((r) => r.length === 2 && (r[0] ?? '').trim())) return false;
  const fragor = l.rader.map((r) => (r[1] ?? '').trim()).filter(Boolean);
  return fragor.length > 0 && fragor.every((f) => f.endsWith('?'));
}
// Textens storlek efter längden, som i originalet, där de längre texterna står mindre: några korta meningar (nivå 6),
// en kort berättelse (nivå 7) och en längre (nivå 8). Räknat i tecken i textkolumnen.
export function textlangd(l: Lista): 'kort' | 'mellan' | 'lang' {
  const tecken = l.rader.reduce((a, r) => a + (r[0] ?? '').length, 0);
  return tecken <= 100 ? 'kort' : tecken <= 300 ? 'mellan' : 'lang';
}

// En ram är elevens blad när rubriken eller första stycket säger det ("Ljudkollen, elevens blad", "Elevens blad till
// screeningen före insatsen har två sidor") och den har listor som eleven läser, inte bara lärarens protokoll. I Word blir
// den ett eget blad att lägga på bordet (metoddocx.ts), och sidan säger att bladet finns i planeringsmallarna.
export function arElevensBlad(ram: { rubrik: string; text: string[]; listor?: Lista[] }): boolean {
  const sager = /elevens blad/i.test(ram.rubrik) || /^(Det här är elevens blad|Elevens blad)/i.test(ram.text[0] ?? '');
  return sager && (ram.listor ?? []).some((l) => !arProtokoll(l));
}

// Ett protokoll vars not och listor inte ryms på ett A4 delas: noten (frågorna) på en sida och huvudet (elevens namn) med
// listorna på nästa, så att sidan med tabellerna går att kopiera per elev, som i metodriggen (Protokollet för
// screeningen och ljudkollen i Ljudlek i grupp, granskningen 2026-09-29). Ryms allt står noten kvar med listorna på samma
// sida, som i Upprepad läsning (K-071). Höjden räknas grovt: en rad not om 95 tecken är 0,5 cm och en tabellrad 0,75 cm,
// och en sida har omkring 22 cm för ramen.
export function protokollDelas(ram: Ram): boolean {
  const listor = ram.listor ?? [];
  if (!listor.length || !listor.every(arProtokoll) || !ram.huvud?.length || !ram.delar.length) return false;
  const tecken = ram.delar.flatMap((d) => d.falt).reduce((a, f) => a + f.rubrik.length + f.text.length, 0);
  const rader = listor.reduce((a, l) => a + l.rader.length + (l.kolumner ? 1 : 0) + 1, 0);
  return (tecken / 95) * 0.5 + rader * 0.75 > 22;
}
