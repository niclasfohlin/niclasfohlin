// Uppslagsverket (K-814; Niclas 2026-11-22 om Relationell vägledning: "Sajten behöver skapa tydlighet kring
// 'uppslagsverket' digitalt. Dvs. de 8 delarna. Det är en designfråga. De behöver inte vara i en tabell som nu, men ska vara
// centrala och tidiga så att de enkelt kan slås upp i metoden"). En metod vars kärna är delar som läraren slår upp har dem
// överst på sidan, en rad per del som börjar med när den används, och varje del på en egen sida med stegen först
// ([id]/[enhet].astro). Formen känns igen på metodens fil, utan egna fält: en ram med lektioner vars delar heter
// "Del 1 · Namnet", "Del 2 · Namnet" i följd, och en fri tabell med en rad per del, som börjar med delens led och namn.
// Tabellens andra kolumn säger när delen används och den tredje det viktigaste. I Word och i sidans egen utskrift står
// tabellen och delarna som i filen, en sida per del. Reglerna och skälen: METODER.md under Uppslagsverket.
import type { MetodData } from './metod';
import { forstaLed } from './karta';

export interface Uppslagsfalt { rubrik: string; text: string; kursiv?: boolean }
/** En del: platsen i ramen, numret, sidans namn (del-5), namnet, när den används, det viktigaste och fälten. nar är
 * tabellens korta rad och narFaltet delens eget fält När. */
export interface Uppslagsdel { di: number; nr: number; slug: string; led: string; namn: string; nar: string; viktigast?: string; narFaltet: string; steg: Uppslagsfalt; las: Uppslagsfalt[] }
export interface Uppslag { ri: number; ti: number; rubrik: string; kolumner: string[]; not?: string; delar: Uppslagsdel[] }

const FALT_NAR = /^när$/iu;
// Delens steg: fältet vars text är numrerade rader, "1. …" och "2. …".
const arSteg = (t: string) => /^1\. /u.test(t.trim()) && /\n2\. /u.test(t);

/** Metodens uppslagsverk, eller inget. */
export function metodensUppslag(d: MetodData): Uppslag | undefined {
  const ramar = d.ramar?.ramar ?? [];
  for (const [ri, ram] of ramar.entries()) {
    if (!ram.lektioner || ram.delar.length < 3) continue;
    const namn = ram.delar.map((del) => ({ led: forstaLed(del.rubrik), namn: del.rubrik.split(' · ').slice(1).join(' · ') }));
    if (!namn.every((x, i) => x.led === `Del ${i + 1}` && x.namn)) continue;
    const ti = d.tabeller.findIndex((t) => t.rader.length === namn.length && t.rader.every((r, i) => { const [led, titel] = r[0].split('\n'); return led?.trim() === namn[i].led && titel?.trim() === namn[i].namn; }));
    if (ti < 0) continue;
    const t = d.tabeller[ti];
    const delar = ram.delar.map((del, di): Uppslagsdel | undefined => {
      const falt = del.falt as Uppslagsfalt[];
      const steg = falt.find((f) => arSteg(f.text));
      if (!steg) return undefined;
      const narFaltet = falt.find((f) => FALT_NAR.test(f.rubrik))?.text ?? t.rader[di][1];
      return { di, nr: di + 1, slug: `del-${di + 1}`, led: namn[di].led, namn: namn[di].namn, nar: t.rader[di][1], ...(t.rader[di][2] ? { viktigast: t.rader[di][2] } : {}), narFaltet, steg, las: falt.filter((f) => f !== steg && !FALT_NAR.test(f.rubrik)) };
    });
    if (delar.some((x) => !x)) continue;
    return { ri, ti, rubrik: t.rubrik, kolumner: t.kolumner, ...(t.not ? { not: t.not } : {}), delar: delar as Uppslagsdel[] };
  }
  return undefined;
}

/** Ankaret för uppslagsverket överst på metodens sida. */
export const UPPSLAGETS_ANKARE = 'uppslag';
/** Delens egen sida. */
export const uppslagsAdress = (id: string, del: { slug: string }) => `/stodundervisning/${id}/${del.slug}`;
/** Filen med alla delar, en sida var. */
export const allaDelarnasFil = (id: string) => `${id}-alla-delar`;

/** Ett steg i en del: rubriken, stegets början fram till den första punkten eller kolonet, och sedan texten, med en replik
 * efter ett kolon för sig, så att läraren i korridoren hittar det hen säger. Orden är metodens, i samma ordning. */
export interface Uppslagssteg { rubrik: string; stycken: { slag: 'text' | 'replik'; text: string }[] }
export function uppslagensSteg(text: string): Uppslagssteg[] {
  return text.split(/\n(?=\d+\. )/u).map((rad) => {
    const t = rad.replace(/^\d+\. /u, '').trim();
    // Rubriken slutar vid det första kolonet eller vid meningens slut. En replik inne i meningen räknas inte som ett slut.
    const m = t.match(/^[^”]*?(?:[.?!](?=\s|$)|:(?=\s))/u);
    const rubrik = (m ? m[0] : t).trim();
    const resten = t.slice(rubrik.length).trim();
    const stycken: Uppslagssteg['stycken'] = [];
    // En replik står för sig när den kommer efter ett kolon, i rubriken eller i texten, och slutar sin mening, och flera
    // repliker i följd hör ihop. En replik inne i en mening står kvar i den.
    let kvar = resten;
    let efterKolon = rubrik.endsWith(':') || resten.startsWith('”');
    while (kvar) {
      if (efterKolon) {
        const r = kvar.match(/^(?:”[^”]*[.?!…]”\s*)+/u);
        if (r) { stycken.push({ slag: 'replik', text: r[0].trim() }); kvar = kvar.slice(r[0].length).trim(); efterKolon = false; continue; }
      }
      const k = kvar.match(/^(.*?:)\s+(?=”[^”]*[.?!…]”(?:\s+(?:[A-ZÅÄÖ”])|$))/su);
      if (k) { stycken.push({ slag: 'text', text: k[1] }); kvar = kvar.slice(k[0].length); efterKolon = true; continue; }
      stycken.push({ slag: 'text', text: kvar });
      kvar = '';
    }
    return { rubrik, stycken };
  });
}
