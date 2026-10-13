// Sidlåset för en faktatext: vilka av textens delar (index i Faktatext.delar, src/lib/ramform.ts) som Word börjar en ny
// sida med. Mätningen står i src/data/sidlas.json och görs av scripts/sidlas.mjs i npm run validera (METODER.md under
// Word och Google Dokument). Sidans utskrift bryter sidan på samma ställen (Faktatext.astro), så att en text har samma
// sidor i Skriv ut Allt som i Word-filen (Niclas 2026-10-13: "Vill ju ha dem i paritet"). Word-bygget läser samma uppslag
// (faktatext i src/lib/metoddocx.ts). Inga Node-beroenden.
import SIDLAS from '../data/sidlas.json';

export const sidlasFor = (id: string, rubrik: string): number[] => (SIDLAS as Record<string, { las?: Record<string, number[]> }>)[id]?.las?.[rubrik] ?? [];
