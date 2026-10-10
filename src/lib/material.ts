// Metodens material: avsnitten efter beskrivningen (Niclas 2026-10-10: "Skriv ut: Hela metoden (allt), Bara
// metodbeskrivningen"). Metodens sida märker dem data-material (Metod.astro), och knappen Bara beskrivningen och stilmallen
// lämnar dem utanför utskriften (Nedladdning.astro, global.css). Word-filen utan mallar och lathundar (metodBarn i
// metoddocx.ts) lämnar samma avsnitt utanför; mallarna och lathunden står inte i den. Ett nytt avsnitt som är material
// läggs till här, och sidan, utskriften och Word följer. Regeln står i METODER.md under Utskriften, och
// scripts/utskriftsformat.mjs prövar utskriften.
export const MATERIAL = new Set(['ramar', 'diplom', 'mallar'] as const);
export type Materialavsnitt = 'ramar' | 'diplom' | 'mallar';

/** Attributet data-material på sidan: tomt för ett avsnitt som är material, annars inget. */
export const materialAttribut = (avsnitt: Materialavsnitt): '' | undefined => (MATERIAL.has(avsnitt) ? '' : undefined);
