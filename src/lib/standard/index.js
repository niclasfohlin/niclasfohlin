// Standarden för sajtens databaser och mallar (Verktyg och stödmaterial; underlag/prov/verktyg/PLAN-3.md och
// ARBETSORDER.md). Det här är början på modulen som sajten och metodriggen ska dela, som wordparitet: vanlig JavaScript
// med typerna i index.d.ts, utan Astro, utan filläsning och utan sajtens data, så att sidorna, webbläsaren, skripten och
// riggen kör samma kod. scripts/standardprov.mjs stoppar en import av astro:, node: eller sajtens data här och prövar
// funktionerna. Reglerna står i REGLER.md och ändringarna i CHANGELOG.md.

/**
 * Adressens led ur ett namn: små bokstäver, tecknen över bokstäverna bort (å och ä blir a, ö blir o, é blir e, ü blir u),
 * och allt annat än a–z och siffror blir ett bindestreck, utan bindestreck först och sist. Samma funktion för alla
 * adresser som görs ur namn: bankens enheter och nivåer, bladens rader, nivåernas material och övrigt (K-416).
 * @param {string} s
 * @returns {string}
 */
export const slugAv = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Leden under /stodundervisning/<metod>/ som metodens egna sidor har: en enhet, ett blad eller en annan sida som får sin
 * adress ur ett namn får inte heta så. problem, texter och faktatexter är Ta fram-sidornas led.
 * @type {readonly string[]}
 */
export const UPPTAGNA_LED = Object.freeze(['lathund', 'serier', 'skrivkort', 'aktiviteter', 'brainbreaks', 'kort', 'problem', 'texter', 'faktatexter']);
