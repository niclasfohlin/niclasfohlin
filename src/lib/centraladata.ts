// Stödmaterialens innehåll (K-488): metodriggens papper.json för varje central sak som är en pdf, som Lässtrategier, i
// src/data/centrala/<id>.json (scripts/centraladata.mjs). Word ritar materialet med strategipapper.ts sist i filen med allt
// för varje metod som har det (metodDokument) och som materialets egen fil (stodmaterialDokument), vars pdf knappen och den
// korta adressen öppnar. Datan följer med i koden, så att metodbankens fil, som byggs i webbläsaren, får samma sidor.
import type { Papper } from './strategipapper';

const filer = import.meta.glob<Papper>('../data/centrala/*.json', { eager: true, import: 'default' });
const PAPPER = new Map(Object.entries(filer).map(([fil, papper]) => [fil.replace(/^.*\/(.+)\.json$/, '$1'), papper]));

/** Materialets innehåll, eller undefined när det inte finns. */
export const centraltPapper = (id: string): Papper | undefined => PAPPER.get(id);
/** De centrala saker som har innehåll. */
export const centralaMedPapper = (): string[] => [...PAPPER.keys()];
