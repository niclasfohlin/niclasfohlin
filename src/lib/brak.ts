// Bråkkursens former, gemensamma för sidan (Metod.astro, Kortlista.astro, MallBild.astro) och Word-filerna
// (metoddocx.ts): staplade bråk i elevmaterialet, kort att klippa och mallarnas geometri. Reglerna är desamma som
// i metodriggen (C:/metodrigg/docs/schema.md), så att riggens kompendium och sajten ritar likadant.
// Inga Node-beroenden: metoddocx.ts körs också i webbläsaren.
import type { MetodData } from './metod';

// Ett bråk skrivet med snedstreck (3/4) ritas staplat i elevmaterialet: täljaren över ett vågrätt bråkstreck och
// nämnaren under, som i läroböckerna, på NCM:s bråkplank och på de nationella proven. I lärarens löptext står
// snedstrecket kvar.
export type BrakDel = { text: string } | { taljare: string; namnare: string };
export function brakDelar(text: string): BrakDel[] {
  const ut: BrakDel[] = [];
  const re = /(\d+)\/(\d+)/g;
  let sist = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > sist) ut.push({ text: text.slice(sist, m.index) });
    ut.push({ taljare: m[1], namnare: m[2] });
    sist = m.index + m[0].length;
  }
  if (sist < text.length || !ut.length) ut.push({ text: text.slice(sist) });
  // Bråk i en uppräkning eller ett uttryck ("1/2, 1/10, 1/4", "3/5 + 4/5") hålls ihop på raden: mellanslagen i en
  // kort text mellan två bråk blir hårda.
  return ut.map((x, i) => ('text' in x && i > 0 && i < ut.length - 1 && x.text.length <= 7 ? { text: x.text.replace(/ /g, '\u00a0') } : x));
}

// Texten som HTML för sidan (Brak.astro): varje bråk blir MathML, och texten runt bråken skyddas. Ett skiljetecken
// direkt efter ett bråk hålls på samma rad som bråket, så att en rad aldrig börjar med en punkt.
export function brakHtml(text: string): string {
  const skydda = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const delar = brakDelar(text);
  let html = '';
  for (let i = 0; i < delar.length; i++) {
    const x = delar[i];
    if ('text' in x) {
      html += skydda(x.text);
      continue;
    }
    const brak = `<math class="m-brak"><mfrac><mn>${x.taljare}</mn><mn>${x.namnare}</mn></mfrac></math>`;
    const nasta = delar[i + 1];
    const tecken = nasta && 'text' in nasta ? (nasta.text.match(/^[.,:;!?)\u201d]+/)?.[0] ?? '') : '';
    if (tecken && nasta && 'text' in nasta) {
      html += `<span class="m-brak-ihop">${brak}${skydda(tecken)}</span>`;
      delar[i + 1] = { text: nasta.text.slice(tecken.length) };
    } else html += brak;
  }
  return html;
}

// Kort att klippa (d.kort): en lista i en ram blir kort när dess rubrik innehåller någon av texterna. Rubrikens två
// första led ("Vecka 1 · Pass 1") är kortens grupp, och i Word börjar varje grupp på ny sida. Korta kort (tal och
// bråk, högst fem tecken) står fyra i bredd med stor text, ett ensamt kort (ett problem) över hela bredden och
// meningar två i bredd. Meningskorten får gruppen och ett nummer i hörnet, samma nummer som Lyssna efter hänvisar
// till, och en kopia får samma märkning som kortet den kopierar.
export interface KortInfo {
  kort: string[];
  kopior: number;
  grupp: string;
  korta: boolean;
  ett: boolean;
  markning?: (i: number) => string;
}
export function kortInfo(d: Pick<MetodData, 'kort'>, lista: { rubrik?: string; rader: string[][] }): KortInfo | null {
  const rubrik = lista.rubrik ?? '';
  if (!d.kort || !d.kort.listor.some((t) => rubrik.includes(t))) return null;
  const led = rubrik.split(' · ');
  const grupp = led.length >= 3 ? led.slice(0, 2).join(' · ') : rubrik;
  const kort = lista.rader.flat();
  const kopior = Object.entries(d.kort.kopior ?? {}).find(([t]) => rubrik.includes(t))?.[1] ?? 1;
  const meningar = kort.some((k) => k.trim().length > 5) && (kort.length > 1 || kopior > 1);
  return {
    kort,
    kopior,
    grupp,
    korta: kort.every((k) => k.trim().length <= 5),
    ett: new Set(kort).size === 1,
    // Alla kort i en grupp får gruppen i hörnet, så att klippta satser går att sortera och korten har ett upp och
    // ned (6/8 och 8/9). Meningskorten får också ett nummer. Sajtens tillägg 2026-09-26 till riggens regel, där
    // bara meningskorten var märkta.
    markning: led.length >= 3 ? (i: number) => (meningar && kort.length > 1 ? `${grupp} · ${i + 1}` : grupp) : undefined,
  };
}

// Mallarna (d.mallar): bråkplanket och tallinjerna. Det hela är lika långt i planket och på tallinjen från 0 till 1,
// så att bitarna kan läggas mot linjen. Längderna räknas i samma enhet som L: twips i Word, millimeter på sidan.
export type Mall = MetodData['mallar'][number];
export const STANDARD_NAMNARE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
export const TWIP_MM = 25.4 / 1440;
const sgd = (a: number, b: number): number => (b ? sgd(b, a % b) : a);
// Läget för k/n av längden L, räknat på det förkortade bråket, så att 1/2, 2/4 och 4/8 hamnar på samma punkt.
export function lage(L: number, k: number, n: number, heltal = true): number {
  const g = sgd(k, n) || 1;
  const v = (L * (k / g)) / (n / g);
  return heltal ? Math.round(v) : v;
}
// En delad tallinje bär delarnas namn till vänster ovanför linjen, så att eleven hittar "linjen i fjärdedelar" som
// korten talar om utan att räkna strecken. Bråken vid strecken skriver eleven själv. En odelad linje har inget namn.
const DELNAMN: Record<number, string> = { 2: 'halvor', 3: 'tredjedelar', 4: 'fjärdedelar', 5: 'femtedelar', 6: 'sjättedelar', 7: 'sjundedelar', 8: 'åttondelar', 9: 'niondelar', 10: 'tiondelar', 11: 'elftedelar', 12: 'tolftedelar' };
export function delnamn(delar: number): string {
  return DELNAMN[delar] ?? '';
}
