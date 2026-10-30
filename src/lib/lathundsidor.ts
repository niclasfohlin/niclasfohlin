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

// Undervisningsmetodernas lathund under Metoder (K-632, K-637): fyra sidor ur standarden (lathundensSidor i
// src/lib/standard/undervisningsmetod.js), som räknas 1/4 till 4/4 på samma sätt, med filmbilden utan nummer först i
// PowerPoint-filen. Sidan (Umlathund.astro) och PowerPoint-filen, och därmed pdf:en, hämtar sidhuvudet och delarnas
// spalter härifrån. Den första sidan heter som metoden och bär sidans namn i etiketten, "Metoden · 1/4"; de andra heter som
// sidan, med numret i etiketten, "2/4". scripts/lathundprov.mjs prövar räkningen i de byggda filerna.
/** Sidhuvudet på en av undervisningsmetodens lathundssidor: rubriken och etiketten uppe till höger. */
export const umLathundHuvud = (titel: string, sida: { nr: number; namn: string }, antal: number) => ({
  rubrik: sida.nr === 1 ? titel : sida.namn,
  etikett: `${sida.nr === 1 ? `${sida.namn} · ` : ''}${sida.nr}/${antal}`,
});
/** Kolumnerna i tabellen Minuterna, första lektionen minut för minut med det läraren säger. */
export const UM_MINUTERNAS_KOLUMNER = ['Minut', 'Delen', 'Du säger'] as const;
// Delens spalt: texten och noterna till vänster, korten, minuterna, rutinerna och tabellerna till höger. En del utan spalt
// står i hela bredden, före spalterna eller efter dem.
const UM_SPALT: Record<string, 'vanster' | 'hoger'> = { text: 'vanster', svarast: 'vanster', karnan: 'hoger', fore: 'vanster', forsta: 'hoger', minuterna: 'hoger', 'med-dig': 'vanster', efter: 'vanster', glider: 'hoger' };
/** En lathundssidas delar efter plats: i hela bredden före spalterna, i vänster och höger spalt, och efter dem. */
export function umLathundSpalter<T extends { id: string; slag: string }>(delar: T[]): { fore: T[]; vanster: T[]; hoger: T[]; efter: T[] } {
  const ut = { fore: [] as T[], vanster: [] as T[], hoger: [] as T[], efter: [] as T[] };
  for (const x of delar) {
    const k = UM_SPALT[x.id] ?? (x.slag === 'rutin' ? 'hoger' : undefined);
    if (k) ut[k].push(x);
    else (ut.vanster.length || ut.hoger.length ? ut.efter : ut.fore).push(x);
  }
  return ut;
}
