// Vägen till sidan som slumpar skrivkort (src/lib/skrivkort.ts), utan biblioteket: modulen vet bara om en metod har ett
// bibliotek, så att metodens Word-fil (src/lib/metoddocx.ts), som webbläsaren också bygger, kan leda dit utan att läsa in
// korten. Filerna läses inte här (import.meta.glob utan eager).
const FINNS = import.meta.glob('../data/skrivkort/*.json');

export const harSkrivkort = (id: string) => `../data/skrivkort/${id}.json` in FINNS;
/** Sidan som slumpar korten. */
export const skrivkortAdress = (id: string) => `/stodundervisning/${id}/skrivkort`;
// Den korta adressen, som läraren kan skriva på tavlan och som står i Word-filen (Niclas 2026-10-14: "en direktlänk
// till slumpgeneratorn"). Netlify leder den till sidan (netlify.toml, raden om skrivkorten bland redirects). En ny metod
// med skrivkort får ingen kort adress av sig själv: den skrivs in här och i netlify.toml.
const KORTA: Record<string, string> = { 'kortskrivning-skriv-varje-dag': '/skrivkort' };
export const kortAdress = (id: string) => KORTA[id] ?? skrivkortAdress(id);
/** Länkens namn, på metodens kort i metodbanken, överst på metodens sida, i menyn, vid urvalet och i Word-filen (riggens
 *  förslag, Niclas 2026-10-14). */
export const SKRIVKORT_LANK = 'Ta fram ett skrivkort';
