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

// ---------- Databasen: nivån, slaget och taggen ----------
// En databas är posterna ur en metods bank, som problemen i Problemlösning i grupp på sidan Ta fram ett matteproblem.
// Innehållet har tre nivåer: nivån (Bas, Medel, Avancerat), slaget (problem, text) och sist innehållstaggen (Niclas
// 2026-10-18: "Förutom bas, medel, avancerat och att det är problem. Skulle vara mysigt med en innehållstag likt
// brainbreaks har", och "Så att du bygger att en databas även kan ha taggar som sista innehållsnivå").

/**
 * Innehållstaggarna per ämne. Problemen i matematik har de fem delarna av det centrala innehållet i kursplanen i
 * matematik (Skolverket, Lgr22), samma i åk 1–3, 4–6 och 7–9 (Niclas 2026-10-18: "Du kan ta de stora delarna från
 * läroplanen och tagga dem", och "Rimligt många taggar. Men stora centrala delar av ämnet för problem"). Problemlösning,
 * kursplanens sjätte del, är ingen tagg, eftersom alla poster är problem. namn står på sidan och i metodens fil (fältet
 * innehallstagg på postens ram), och lgr22 är kursplanens rubrik. Ett nytt ämne får sina taggar här när dess databas
 * kommer.
 * @type {Readonly<Record<string, readonly { namn: string, lgr22: string }[]>>}
 */
export const INNEHALLSTAGGAR = Object.freeze({
  Matematik: Object.freeze([
    { namn: 'Taluppfattning', lgr22: 'Taluppfattning och tals användning' },
    { namn: 'Algebra', lgr22: 'Algebra' },
    { namn: 'Geometri', lgr22: 'Geometri' },
    { namn: 'Sannolikhet och statistik', lgr22: 'Sannolikhet och statistik' },
    { namn: 'Samband och förändring', lgr22: 'Samband och förändring' },
  ]),
});

/**
 * Ämnets innehållstaggar med sina id, i kursplanens ordning, eller en tom lista när ämnet inte har några.
 * @param {string} omrade
 * @returns {{ id: string, namn: string, lgr22: string }[]}
 */
export const innehallstaggar = (omrade) => (INNEHALLSTAGGAR[omrade] ?? []).map((t) => ({ id: slugAv(t.namn), ...t }));

/**
 * Postens rad: dess egen första mening, som kortet visar under titeln (inga nya texter; granskningen 2026-10-18). En
 * mening slutar med punkt, utropstecken eller frågetecken före ett mellanslag och en versal eller en siffra, eller sist i
 * stycket. Är meningen längre än langst tecken kortas den vid ett ord och får " …".
 * @param {string} stycke
 * @param {number} [langst]
 * @returns {string}
 */
export function postensRad(stycke, langst = 120) {
  const t = stycke.replace(/\s+/g, ' ').trim();
  const slut = t.search(/[.!?](?=\s+[A-ZÅÄÖÉ0-9"”]|$)/);
  const mening = slut >= 0 ? t.slice(0, slut + 1) : t;
  if (mening.length <= langst) return mening;
  const kort = mening.slice(0, langst);
  return `${kort.slice(0, Math.max(kort.lastIndexOf(' '), 1)).replace(/[,;:]$/, '')} …`;
}

/**
 * En post ur en databas, i den form som sidan, datafilen och listan att skriva ut använder.
 * @typedef {object} Post
 * @property {string} id adressens led ur nivån och numret, som bas-1
 * @property {string} niva nivåns namn, som Bas
 * @property {number} nr numret på nivån, från 1
 * @property {string} titel
 * @property {string} rad postens egen första mening (postensRad)
 * @property {string} [tagg] innehållstaggens namn, när ämnet har taggar
 * @property {string} sida postens egen sida
 * @property {string} [losning] adressen till postens lösningsförslag på postens sida, som /stodundervisning/<metod>/bas-1#blad-12
 * @property {{ adress: string, alt: string }} bild
 * @property {Record<string, PostUtskrift>} utskrift varje slag av utskrift, som post (bara problemet) och med (problemet med lösningsförslaget, eller med lärarens sida i en bank utan lösningsförslag)
 */
/**
 * Ett slag av utskrift för en post: postens egen pdf och var dess sidor står i källfilerna, så att listan kan hämta
 * källfilen en gång när det blir mindre än postens egna pdf:er (K-424: varje utklippt pdf bär källfilens alla typsnitt).
 * @typedef {object} PostUtskrift
 * @property {string} adress postens pdf med version, /stodundervisning/<namn>.pdf?v=<åtta tecken>
 * @property {number} byte postens pdf:s storlek, uppskattad ur källfilen
 * @property {{ fil: string, sidor: number[] }[]} kalla källfilerna med sidornas index, från 0
 */

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PDF = /^\/stodundervisning\/[\w.-]+\.pdf\?v=[0-9a-f]{8}$/;

/**
 * Felen i en post, som en lista. taggar är ämnets innehållstaggar (innehallstaggar): har ämnet taggar ska posten ha en av
 * dem, och har det inga ska den inte ha någon.
 * @param {Post} p
 * @param {{ namn: string }[]} taggar
 * @returns {string[]}
 */
export function postFel(p, taggar) {
  const fel = [];
  const vem = `${p.niva ?? '?'} ${p.nr ?? '?'} ${p.titel ?? ''}`.trim();
  if (!ID.test(p.id ?? '')) fel.push(`${vem}: id "${p.id}" är inte skrivet som en adress`);
  if (UPPTAGNA_LED.includes(p.id)) fel.push(`${vem}: id "${p.id}" är ett led som metodens egna sidor har`);
  if (!p.niva) fel.push(`${vem}: nivån saknas`);
  if (!Number.isInteger(p.nr) || p.nr < 1) fel.push(`${vem}: numret ska vara ett heltal från 1`);
  if (!p.titel) fel.push(`${vem}: titeln saknas`);
  if (!p.rad) fel.push(`${vem}: raden saknas (postens första mening)`);
  if (taggar.length && !taggar.some((t) => t.namn === p.tagg)) fel.push(`${vem}: innehållstaggen ${p.tagg ? `"${p.tagg}" finns inte` : 'saknas'}; den ska vara en av ${taggar.map((t) => t.namn).join(', ')} (fältet innehallstagg på postens ram)`);
  if (!taggar.length && p.tagg) fel.push(`${vem}: har innehållstaggen "${p.tagg}", men ämnet har inga taggar i standarden (INNEHALLSTAGGAR)`);
  if (!/^\/stodundervisning\/[a-z0-9-]+\/[a-z0-9-]+$/.test(p.sida ?? '')) fel.push(`${vem}: sidan "${p.sida}" är inte en adress under /stodundervisning/<metod>/`);
  if (!/\.(svg|png|jpg)(\?v=[0-9a-f]{8})?$/.test(p.bild?.adress ?? '') || !p.bild?.alt) fel.push(`${vem}: bilden eller dess textalternativ saknas`);
  if (p.losning !== undefined && !p.losning.startsWith(`${p.sida}#`)) fel.push(`${vem}: lösningsförslaget "${p.losning}" står inte på postens sida`);
  for (const [slag, u] of Object.entries(p.utskrift ?? {})) {
    if (!PDF.test(u.adress)) fel.push(`${vem}: utskriften ${slag} har adressen "${u.adress}", som inte är en pdf med version`);
    if (!(u.byte > 0)) fel.push(`${vem}: utskriften ${slag} har ingen storlek`);
    if (!u.kalla?.length || u.kalla.some((k) => !k.fil || !k.sidor.length || k.sidor.some((s) => !Number.isInteger(s) || s < 0))) fel.push(`${vem}: utskriften ${slag} säger inte var sidorna står`);
  }
  if (!Object.keys(p.utskrift ?? {}).length) fel.push(`${vem}: utskrifterna saknas`);
  return fel;
}

/**
 * Felen i en hel databas: varje posts fel (postFel), id som finns två gånger, och nummer som inte står i ordning på sin
 * nivå.
 * @param {Post[]} poster
 * @param {{ namn: string }[]} taggar
 * @returns {string[]}
 */
export function databasFel(poster, taggar) {
  const fel = poster.flatMap((p) => postFel(p, taggar));
  const sedda = new Set();
  for (const p of poster) { if (sedda.has(p.id)) fel.push(`id "${p.id}" finns två gånger`); sedda.add(p.id); }
  const nivaer = [...new Set(poster.map((p) => p.niva))];
  for (const n of nivaer) {
    const nr = poster.filter((p) => p.niva === n).map((p) => p.nr);
    if (nr.some((x, i) => i > 0 && x <= nr[i - 1])) fel.push(`nivån ${n}: numren står inte i ordning (${nr.join(', ')})`);
  }
  return fel;
}

/**
 * Det billigaste sättet att hämta listans sidor (K-424): för varje källfil, antingen de valda posternas egna pdf:er
 * eller källfilen en gång, det som är minst. En post vars utskrift har sidor ur flera källfiler hämtas alltid som sin
 * egen pdf. Ger det som ska hämtas, i den ordning det först behövs, och för varje post var dess sidor finns.
 * @param {{ id: string, u: PostUtskrift }[]} lista posterna i listans ordning, med det slag av utskrift som väljs
 * @param {Record<string, { adress: string, byte: number }>} filer källfilerna
 * @returns {{ hamta: { adress: string, byte: number }[], sidor: { adress: string, index: number[] | null }[], byte: number }}
 */
export function hamtplan(lista, filer) {
  const perFil = new Map();
  for (const { u } of lista) if (u.kalla.length === 1) perFil.set(u.kalla[0].fil, (perFil.get(u.kalla[0].fil) ?? 0) + u.byte);
  const helFil = new Set([...perFil].filter(([fil, byte]) => filer[fil] && filer[fil].byte < byte).map(([fil]) => fil));
  const hamta = new Map();
  const sidor = lista.map(({ u }) => {
    if (u.kalla.length === 1 && helFil.has(u.kalla[0].fil)) {
      const f = filer[u.kalla[0].fil];
      hamta.set(f.adress, f.byte);
      return { adress: f.adress, index: u.kalla[0].sidor };
    }
    hamta.set(u.adress, u.byte);
    return { adress: u.adress, index: null };
  });
  const ut = [...hamta].map(([adress, byte]) => ({ adress, byte }));
  return { hamta: ut, sidor, byte: ut.reduce((s, x) => s + x.byte, 0) };
}
