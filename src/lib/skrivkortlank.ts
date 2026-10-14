// Vägen till sidan som slumpar skrivkort (src/lib/skrivkort.ts), utan biblioteket: modulen vet bara om en metod har ett
// bibliotek, så att metodens Word-fil (src/lib/metoddocx.ts), som webbläsaren också bygger, kan leda dit utan att läsa in
// korten. Filerna läses inte här (import.meta.glob utan eager).
import { CENTRALA } from './centrala';
const FINNS = import.meta.glob('../data/skrivkort/*.json');

export const harSkrivkort = (id: string) => `../data/skrivkort/${id}.json` in FINNS;
/** Sidan som slumpar korten. */
export const skrivkortAdress = (id: string) => `/stodundervisning/${id}/skrivkort`;
// Sidan är en central sak (src/lib/centrala.ts, src/data/centrala.json), med knappens namn och den korta adressen, som
// läraren kan skriva på tavlan (Niclas 2026-10-14: "en direktlänk till slumpgeneratorn"). Netlify leder den korta
// adressen till sidan (netlify.toml).
const sidan = (id: string) => CENTRALA.find((c) => c.slag === 'sida' && c.adress === skrivkortAdress(id));
export const kortAdress = (id: string) => sidan(id)?.kort ?? skrivkortAdress(id);
/** Sidans namn, som rubrik på sidan och i dess titel. */
export const SKRIVKORT_LANK = CENTRALA.find((c) => c.id === 'skrivkort')!.namn;
