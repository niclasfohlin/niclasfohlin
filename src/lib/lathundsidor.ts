// Lathundens sidor och deras räkning (Niclas 2026-10-07: "Det blir ingen drift eller knas när det står 1/4 på metoden
// men den nu är 2/5 i pptx och 1/4 i pdf? Värt att tänka till här så det automatiskt blir rätt").
//
// Lathunden är fyra sidor: Metoden, Ett pass, Mallen och Material. De räknas 1/4 till 4/4 i varje fil: på sidan, i
// pdf:en, i Word-lathunden och i PowerPoint-filen. Filmbilden, som står först i PowerPoint-filen, heter Filmerna och
// har inget nummer. Skälet är texterna: sjutton texter i nio metoder säger "lathundens tredje sida" eller "sidan 4",
// och samma text står i alla filer. När PowerPoint-filen räknade filmbilden som 1/5 och lathunden 2/5 till 5/5 pekade
// de texterna på fel sida just där (granskningen 2026-10-07). En sida har därför samma nummer överallt.
//
// Sidan och PowerPoint-filen, och därmed pdf:en, hämtar etiketterna härifrån. Word-lathunden skriver sina egna
// (src/lib/metoddocx.ts, lhHuvud). scripts/lathundprov.mjs läser de byggda filerna efter varje bygge och stannar när
// någon av dem räknar annat än listan här.
export const LATHUNDENS_SIDOR = ['Metoden', 'Ett pass', 'Mallen', 'Material'] as const;
export type Lathundsida = (typeof LATHUNDENS_SIDOR)[number];

/** Etiketten uppe till höger på en av lathundens sidor: "Metoden · 1/4". */
export const sidetikett = (sida: Lathundsida) => `${sida} · ${LATHUNDENS_SIDOR.indexOf(sida) + 1}/${LATHUNDENS_SIDOR.length}`;
/** Filmbildens namn i PowerPoint-filen: Filmen för en film, Filmerna för flera. Den räknas inte bland lathundens sidor. */
export const filmbildNamn = (antalFilmer: number) => (antalFilmer === 1 ? 'Filmen' : 'Filmerna');
