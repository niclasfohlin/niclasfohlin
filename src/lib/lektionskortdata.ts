// Lektionskortens innehåll (src/lib/lektionskort.ts): metodriggens papper.json, ett per kort, som
// src/data/lektionskort/<stam>.json (scripts/lektionskortdata.mjs lägger in dem). Läses vid bygget av Word-filerna
// (src/lib/metodresurser.ts och src/pages/stodundervisning/[id].docx.ts), av metoder.json, som webbläsaren bygger Word-filen
// med, och av listan över pdf:erna (bankfiler.json). Saknas ett korts innehåll stannar bygget, så att ingen Word-fil går ut
// utan kortet.
//
// Ett lektionskort är högst ett A4 (Niclas 2026-10-17: "Tänker de ska vara max en a4a i framtiden"), och bygget stannar
// på ett kort med baksida. Säg, skriv och läs kort, med meningarna på baksidan, kom före regeln och får ha sin.
import type { Lektionskort } from './lektionskort';
import type { Papper } from './strategipapper';

const FILER = import.meta.glob<Papper>('../data/lektionskort/*.json', { eager: true, import: 'default' });
const PAPPER = new Map(Object.entries(FILER).map(([vag, p]) => [vag.replace(/^.*\//, '').replace(/\.json$/, ''), p]));
export const FORE_REGELN = new Set(['sag-skriv-och-las-lektionskort']);

/** Kortets innehåll, eller ett fel som stoppar bygget. */
export function lektionskortetsPapper(k: Pick<Lektionskort, 'stam'>): Papper {
  const p = PAPPER.get(k.stam);
  if (!p) throw new Error(`Lektionskortet ${k.stam} saknar sitt innehåll, src/data/lektionskort/${k.stam}.json. Lägg in riggens papper.json med node scripts/lektionskortdata.mjs (METODER.md under Lektionskortet).`);
  if (p.baksida && !FORE_REGELN.has(k.stam)) throw new Error(`Lektionskortet ${k.stam} har en baksida, men ett lektionskort är högst ett A4 (Niclas 2026-10-17). Be metodriggen korta kortet.`);
  return p;
}

/** Hur många sidor kortet är: ett A4, och två för ett kort med baksida från före regeln. */
export const lektionskortetsSidor = (k: Pick<Lektionskort, 'stam'>): number => (lektionskortetsPapper(k).baksida ? 2 : 1);

/** Korten som Word-filen behöver, efter stam (MetodResurser.lektionskort i src/lib/metoddocx.ts). */
export const lasLektionskort = (kort: Pick<Lektionskort, 'stam'>[]): Map<string, Papper> => new Map(kort.map((k) => [k.stam, lektionskortetsPapper(k)]));

/** Alla kort som har ett innehåll, för kontrollen av överblivna filer. */
export const lektionskortensStammar = (): string[] => [...PAPPER.keys()];
