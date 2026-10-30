// Text att jämföra mellan en sida och en pdf (K-632): metodernas paritet (scripts/metoderparitet.mjs) och lathundens prov i
// scripts/metoderprov.mjs läser riggens pdf:er och sajtens sidor med samma regler, så att två ställen som säger samma sak
// räknas som lika och ingen av dem har en egen variant.
import { spawnSync } from 'node:child_process';

/**
 * Text utan det som bara styr formen: gemener, inga mellanslag av något slag (ordfog och mjukt bindestreck med), inga
 * citattecken och inga bindestreck, eftersom pdftotext tar bort ett riktigt bindestreck där Word bryter ett ord i
 * radslutet ("exitlapparna"; riggens build/paritet.mjs gör samma).
 * @param {unknown} t
 */
export const ren = (t) => String(t).toLocaleLowerCase('sv').replace(/[\s ⁠­​]+/g, '').replace(/[”“"«»’‘']/g, '').replace(/[-‐‑]/g, '');
/**
 * Pdf-texten utan sidhuvudet och sidfoten på varje sida, som annars står mitt i ett stycke som går över en sidbrytning:
 * metodens namn med niclasfohlin.se, upphovsraden och Sida X av Y.
 * @param {string} text
 */
export const utanHuvudOchFot = (text) => text.split('\n').filter((r) => !/niclasfohlin\.se\s*$|^\s*©\s*Niclas Fohlin|^\s*Sida \d+ av \d+\s*$/.test(r)).join('\n');
/**
 * Pdf:ens text med pdftotext (Poppler) i läsordning, med sidhuvud och sidfot; tom när filen inte går att läsa.
 * @param {string} fil
 */
export const pdfText = (fil) => spawnSync('pdftotext', ['-enc', 'UTF-8', fil, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).stdout ?? '';
