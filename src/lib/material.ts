// Metodens material: avsnitten efter beskrivningen (Niclas 2026-10-10: "Skriv ut: Hela metoden (allt), Bara
// metodbeskrivningen"). Metodens sida märker dem data-material (Metod.astro), och knappen Metoden och stilmallen
// lämnar dem utanför utskriften (Nedladdning.astro, global.css). Word-filen utan mallar och lathundar (metodBarn i
// metoddocx.ts) lämnar samma avsnitt utanför; mallarna och lathunden står inte i den. Ett nytt avsnitt som är material
// läggs till här, och sidan, utskriften och Word följer. Regeln står i METODER.md under Utskriften, och
// scripts/utskriftsformat.mjs prövar utskriften.
export const MATERIAL = new Set(['ramar', 'diplom', 'mallar'] as const);
export type Materialavsnitt = 'ramar' | 'diplom' | 'mallar';

/** Har metoden material, alltså något som utskriften Metoden lämnar utanför? Då finns knappen Metoden och Word-filen
 * med bara metoden (src/pages/stodundervisning/[id].docx.ts). */
export const harMaterial = (d: { ramar?: unknown; diplom?: unknown; mallar?: unknown[] }): boolean =>
  (MATERIAL.has('ramar') && !!d.ramar) || (MATERIAL.has('diplom') && !!d.diplom) || (MATERIAL.has('mallar') && (d.mallar?.length ?? 0) > 0);

/** Kontraktets och schemats namn i bestämd form (hem.kontrakt, hem.schema; TIL i grupp), till knapparna, raderna i
 *  nedladdningsrutan och pdf:ens titel: kontraktet, och schemat böjt ur rubrikens första ord när det slutar på schema,
 *  som lässchemat ur Lässchema TIL. Ett annat namn går inte att böja säkert (läslogg blir läsloggen, inte läslogget;
 *  granskningen 2026-10-17), så då står rubriken som den är. */
export function hemsidansNamn(vad: 'kontrakt' | 'schema', rubrik = ''): string {
  if (vad === 'kontrakt') return 'kontraktet';
  const ord = (rubrik.trim().split(/\s+/)[0] || 'schema').toLocaleLowerCase('sv');
  return /schema$/.test(ord) ? `${ord}t` : rubrik.trim();
}

/** Attributet data-material på sidan: tomt för ett avsnitt som är material, annars inget. */
export const materialAttribut = (avsnitt: Materialavsnitt): '' | undefined => (MATERIAL.has(avsnitt) ? '' : undefined);
