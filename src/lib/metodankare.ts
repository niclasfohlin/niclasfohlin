// Metodens avsnitt och ankare: avsnitten i sidans meny, och ankarna för de fria tabellerna, ramarna, lektionernas delar och
// mallarna, i den ordning metodens sida ger dem. Metodens sida (Metod.astro) och planen (src/lib/metodsaker.ts) läser samma
// funktioner, så att en länk från planen alltid leder till det ankare som sidan har (K-493).
import type { MetodData } from './metod';
import { metodensBlad } from './karta';
import { metodensAvsnitt } from './standard/index.js';

// Sidnavigationen, de avsnitt som finns i modellens ordning med korta namn, står i standarden (metodensAvsnitt i
// src/lib/standard/plan.js), så att stödens platser i planen läser samma lista som sidan, också i riggen (K-779).
export { metodensAvsnitt };

// Stabila ankare för rutorna, de fria tabellerna och ramarna, så att en lektion kan länka till avsnittet i den generella
// metoden (Ljudlek i grupp, Seriefot och skriptet i [id].astro): rubrikens första led i gemener, som "Ordbanken" #ordbanken
// och "Dagens ljud: bokstävernas ordning" #dagens-ljud. Ett ankare som redan finns får en siffra efter sig.
export const ankarnamn = (s: string) => s.split(':')[0].toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Ankarna i sidans ordning: tabellerna, ramarna, lektionernas delar och kursens blad (räknebladen, som "Addition 1").
 * ankare ger fler ankare i samma följd (listorna i Metod.astro), så att ett namn aldrig får två ankare.
 */
export function metodensAnkare(d: MetodData, avsnitt: { id: string }[]) {
  const ramar = d.ramar?.ramar ?? [];
  const upptagna = new Set([...avsnitt.map((a) => a.id), 'upplagg', 'gruppen', 'principer', 'lektionsbank', 'ramar', ...ramar.map((_, i) => `ram-${i + 1}`)]);
  const ankare = (s: string) => { let id = ankarnamn(s) || 'avsnitt'; for (let n = 2; upptagna.has(id); n++) id = `${ankarnamn(s)}-${n}`; upptagna.add(id); return id; };
  const tabellAnkare = new Map(d.tabeller.map((t) => [t, ankare(t.rubrik)]));
  const ramAnkare = ramar.map((r) => ankare(r.rubrik));
  // Veckorna som lektioner (en ram med lektioner, De fyra räknesätten, Niclas 2026-10-04): varje del har ett eget ankare, som
  // korten överst i ramen leder till, och ramen står i menyn med namnet efter kolon ("Till läraren: veckorna" blir Veckorna).
  const delAnkare = ramar.map((r) => (r.lektioner ? r.delar.map((del) => ankare(del.rubrik)) : []));
  // Kursens blad (src/lib/karta.ts): ett ankare för varje blad, som kartan och planen leder till.
  const blad = metodensBlad(d);
  const bladAnkare = new Map([...blad].map(([namn, plats]) => [`${plats.ri}-${plats.li}`, ankare(`blad ${namn}`)]));
  return { ankare, tabellAnkare, ramAnkare, delAnkare, blad, bladAnkare };
}

/**
 * Mallarnas ankare under Mallar att skriva ut, som "mall-lyssningsbladet", så att en text kan leda till mallen (K-493). De
 * står för sig, med mall först, och krockar därför inte med ramarnas; två mallar med samma namn får en siffra efter sig.
 */
export function mallarnasAnkare(d: MetodData): string[] {
  const sedda = new Set<string>();
  return d.mallar.map((m) => {
    let id = `mall-${ankarnamn(m.rubrik) || 'mall'}`;
    for (let n = 2; sedda.has(id); n++) id = `mall-${ankarnamn(m.rubrik) || 'mall'}-${n}`;
    sedda.add(id);
    return id;
  });
}
