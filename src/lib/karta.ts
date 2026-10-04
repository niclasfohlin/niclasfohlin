// Kartan över kursens veckor (De fyra räknesätten i grupp, Niclas 2026-10-04: tabellen Talen och bladen i veckorna "måste
// ju också kunna tryckas på som länkar eller karta. Infon i den behövs också för varje vecka"). En fri tabell med
// karta: true har en rad per del i ramen med lektioner, med delens första led först i första cellen ("Vecka 1"). Sidan
// (Metod.astro och MetodTabell.astro) och Word (metoddocx.ts) länkar veckan i första kolumnen till veckan och bladens namn
// ("Addition 1", "Subtraktion 4 och 5") till räknebladen ("Blad 1 · Addition · …"), och varje vecka visar sin rad, så att
// läraren ser veckans tal och blad för varje nivå där veckan står. Inga Node-beroenden, så att den också kan köras i
// webbläsaren, där Word-filen av flera metoder byggs.
import type { MetodData } from './metod';

type Tabell = MetodData['tabeller'][number];
type Lista = { rubrik?: string; rakneblad?: unknown };
type MetodForKarta = { tabeller: Tabell[]; ramar?: { ramar: { lektioner?: boolean; delar: { rubrik: string }[]; listor?: Lista[] }[] } };

/** Första ledet i en rubrik eller cell: "Vecka 1" ur "Vecka 1 · Hopp på talraden" och ur "Vecka 1\nHopp på talraden". */
export const forstaLed = (s: string) => s.split(/\n| · /)[0].trim();
export const kartan = (d: { tabeller: Tabell[] }) => d.tabeller.find((t) => t.karta);

/** Delen (veckan) som kartans rad hör till, som index i ramarna och i ramens delar. */
export function radensDel(d: MetodForKarta, rad: string[]): { ri: number; di: number } | undefined {
  const led = forstaLed(rad[0] ?? '');
  for (const [ri, r] of (d.ramar?.ramar ?? []).entries()) {
    if (!r.lektioner) continue;
    const di = r.delar.findIndex((x) => forstaLed(x.rubrik) === led);
    if (di >= 0) return { ri, di };
  }
  return undefined;
}
/** Kartans rad för en del (en vecka), eller undefined. */
export const delensRad = (t: Tabell | undefined, delRubrik: string) => t?.rader.find((r) => forstaLed(r[0] ?? '') === forstaLed(delRubrik));

/** Räknebladets namn i kartan: "Blad 1 · Addition · Hoppa på talraden" heter "Addition 1". */
export function bladNamn(rubrik?: string): string | undefined {
  const m = (rubrik ?? '').match(/^Blad (\d+) · ([^·]+?)(?: · |$)/);
  return m ? `${m[2].trim()} ${m[1]}` : undefined;
}
/** Metodens räkneblad med namn, som namnet och listans plats (ramens och listans index). */
export function metodensBlad(d: MetodForKarta): Map<string, { ri: number; li: number }> {
  const ut = new Map<string, { ri: number; li: number }>();
  (d.ramar?.ramar ?? []).forEach((r, ri) => (r.listor ?? []).forEach((l, li) => {
    const namn = l.rakneblad ? bladNamn(l.rubrik) : undefined;
    if (namn && !ut.has(namn)) ut.set(namn, { ri, li });
  }));
  return ut;
}
const tecken = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Texten i delar, med bladens namn utpekade: "Subtraktion 4 och 5" blir Subtraktion 4, " och " och 5 (Subtraktion 5). */
export function bladDelar(text: string, blad: Set<string>): { text: string; blad?: string }[] {
  const satt = [...new Set([...blad].map((b) => b.replace(/ \d+$/, '')))];
  if (!satt.length) return [{ text }];
  const ut: { text: string; blad?: string }[] = [];
  let pos = 0;
  for (const m of text.matchAll(new RegExp(`(${satt.map(tecken).join('|')}) (\\d+)((?: och \\d+)*)`, 'g'))) {
    if (m.index! > pos) ut.push({ text: text.slice(pos, m.index) });
    const namn = `${m[1]} ${m[2]}`;
    ut.push(blad.has(namn) ? { text: namn, blad: namn } : { text: namn });
    for (const och of (m[3] ?? '').matchAll(/ och (\d+)/g)) {
      const n = `${m[1]} ${och[1]}`;
      ut.push({ text: ' och ' }, blad.has(n) ? { text: och[1], blad: n } : { text: och[1] });
    }
    pos = m.index! + m[0].length;
  }
  if (pos < text.length) ut.push({ text: text.slice(pos) });
  return ut;
}
// En kort kontrollsumma (FNV-1a) av ett namn, i bas 36, högst sju tecken.
const summa = (s: string) => { let h = 0x811c9dc5; for (const c of s) h = Math.imul(h ^ c.codePointAt(0)!, 0x01000193) >>> 0; return h.toString(36); };
/** Bokmärkets namn i Word, med bokstäverna a–z, siffror och understreck och en bokstav först: fyra_raknesatten_vecka_1,
 * fyra_raknesatten_blad_addition_1. Word tillåter 40 tecken, så ett längre namn kortas och får en kontrollsumma av hela
 * namnet sist; att bara korta det skulle göra blad 1 och blad 10 i en metod med långt id till samma bokmärke. */
export const wordId = (s: string) => {
  const id = s.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').replace(/^(?=[^a-z])/, 'b_');
  return id.length <= 40 ? id : `${id.slice(0, 32)}_${summa(id)}`;
};
