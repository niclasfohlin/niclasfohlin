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
 * kommer. En databas vars metod har sina egna slag, som lästexternas slag i Textsamtal i grupp (det eleven listar ut
 * mellan raderna), tar taggarna ur metoden i stället (src/lib/tafram.ts), så att de står på ett ställe.
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
 * @property {string} id adressens led ur nivån och numret, som bas-1, eller, för en post ur en databas utan metod, ur
 *   titeln, som glassen
 * @property {string} niva nivåns namn, som Bas
 * @property {number} nr numret på nivån, från 1
 * @property {string} titel
 * @property {string} rad postens egen första mening (postensRad)
 * @property {string[]} [taggar] innehållstaggarnas namn, när databasen har taggar: en för ett problem, flera för en text
 * @property {string} [sida] postens egen sida, när posten står i en metod (en post ur en databas utan metod har ingen)
 * @property {string} [losning] adressen till postens lösningsförslag: på postens sida, som
 *   /stodundervisning/<metod>/bas-1#blad-12, eller, för en post utan sida, postens pdf med lösningsförslaget
 * @property {{ adress: string, alt: string }} [bild] postens bild, när posten har en (lästexterna har ingen)
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
 * Felen i en post, som en lista. taggar är databasens innehållstaggar (innehallstaggar, eller metodens egna slag): har
 * databasen taggar ska posten ha minst en och bara sådana, och har den inga ska posten inte ha någon.
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
  const egna = p.taggar ?? [];
  if (taggar.length && !egna.length) fel.push(`${vem}: innehållstaggen saknas; den ska vara en av ${taggar.map((t) => t.namn).join(', ')} (fältet innehallstagg på postens ram, eller metodens slag)`);
  for (const t of egna) if (taggar.length && !taggar.some((x) => x.namn === t)) fel.push(`${vem}: innehållstaggen "${t}" finns inte; den ska vara en av ${taggar.map((x) => x.namn).join(', ')}`);
  if (!taggar.length && egna.length) fel.push(`${vem}: har innehållstaggen "${egna[0]}", men databasen har inga taggar (INNEHALLSTAGGAR eller metodens slag)`);
  if (p.sida !== undefined && !/^\/stodundervisning\/[a-z0-9-]+\/[a-z0-9-]+$/.test(p.sida)) fel.push(`${vem}: sidan "${p.sida}" är inte en adress under /stodundervisning/<metod>/`);
  if (p.bild !== undefined && (!/\.(svg|png|jpg)(\?v=[0-9a-f]{8})?$/.test(p.bild.adress ?? '') || !p.bild.alt)) fel.push(`${vem}: bildens adress eller textalternativ saknas`);
  if (p.losning !== undefined && (p.sida !== undefined ? !p.losning.startsWith(`${p.sida}#`) : !PDF.test(p.losning))) fel.push(`${vem}: lösningsförslaget "${p.losning}" står ${p.sida !== undefined ? 'inte på postens sida' : 'inte i en pdf med version, som en post utan sida ska ha'}`);
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

// ---------- Fasta antal i en text (sajtens K-450) ----------
// En metods text står också i dess Word-filer, pdf:er och lathund, som görs om när texten ändras. Ett antal av en
// databas poster i texten, som "tjugofem texter", slutar stämma när databasen växer och skulle göra om filerna varje gång
// (Niclas 2026-10-19: "Försök hålla antal och annat ur lathundar och filer. Eftersom det inte blir bra skalbarhet").
// fastaAntal hittar sådana antal, så att den som har databasen kan stanna på dem; texten säger i stället var posterna
// finns, och sidorna som räknar dem visar talen.

const ENTAL = ['noll', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv', 'tretton', 'fjorton', 'femton', 'sexton', 'sjutton', 'arton', 'nitton'];
const TIOTAL = ['', '', 'tjugo', 'trettio', 'fyrtio', 'femtio', 'sextio', 'sjuttio', 'åttio', 'nittio'];

const TALET = '(?:\\d+|två|tre|fyra|fem|sex|sju|åtta|nio|tio|elva|tolv|tretton|fjorton|femton|sexton|sjutton|arton|nitton|(?:tjugo|trettio|fyrtio|femtio|sextio|sjuttio|åttio|nittio)(?:en|ett|två|tre|fyra|fem|sex|sju|åtta|nio)?)';

/** Ett tal ur texten, med siffror eller i ord ("tjugofem"). */
function talAv(s) {
  if (/^\d+$/.test(s)) return Number(s);
  const t = s.toLowerCase();
  const tio = TIOTAL.findIndex((x) => x && t.startsWith(x));
  if (tio > 0) return tio * 10 + Math.max(0, ENTAL.indexOf(t.slice(TIOTAL[tio].length)), ['en', 'ett'].includes(t.slice(TIOTAL[tio].length)) ? 1 : 0);
  return ENTAL.indexOf(t);
}

/**
 * De fasta antalen av en databas poster i en text, som "tjugofem texter", "trettio nya problem" eller "fem på varje
 * nivå": de slutar stämma när databasen växer, så den som har databasen stannar på dem. ord är
 * postens substantiv i obestämd och bestämd form ("texter", "texterna"), och de räknas från fem: mindre tal är för det
 * mesta metodens egna ("två eller tre texter i veckan"). grupper är det som posterna står i ("teman", "kategorier"), och
 * de räknas från två. Ett tal i ett spann ("vecka 6–8") räknas inte.
 * @param {string} text
 * @param {string[]} ord
 * @param {string[]} [grupper]
 * @returns {string[]}
 */
export function fastaAntal(text, ord, grupper = []) {
  const fore = '(?<![\\p{L}\\d–-])', efter = '(?![\\p{L}\\d])';
  const lista = (o) => o.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  // "fem på varje nivå" står utan substantiv och gäller posterna, så den formen prövas bara med dem.
  const traff = (subst, minst, perGrupp) => {
    if (!subst.length) return [];
    const re = new RegExp(`${fore}(${TALET})(?:\\s+(?!på${efter})\\p{L}+)?\\s+(?:${lista(subst)})${efter}${perGrupp ? `|${fore}(${TALET})\\s+på\\s+(?:varje|var och en av)\\s+(?:nivå|nivåerna|tema|temana)${efter}` : ''}`, 'giu');
    return [...text.matchAll(re)].filter((m) => talAv(m[1] ?? m[2]) >= minst).map((m) => m[0]);
  };
  return [...traff(ord, 5, true), ...traff(grupper, 2, false)];
}

/**
 * Hänvisningarna till Niclas Fohlins böcker i en text, så att den som ritar texten kan göra dem till länkar (sajtens
 * K-459; Niclas 2026-10-19: "Vill även att ALLA där det står Fohlin eller hänvisas till Fohlin är länk till boken den
 * hänvisar till"). Tre former: i en parentes, som "(Fohlin och Wilson, 2023)" och en av flera, som "(Pearson och
 * Gallagher, 1983; Fohlin och Wilson, 2025)"; med året i parentes efter, som "Fohlin och Wilson (2025)"; och i en
 * källförteckning, med titeln mellan, som "Fohlin och Wilson, Skriv! (utkommer 2027)". "utkommer" före året betyder att
 * boken inte är utgiven. Varje hänvisning har sin plats i texten (start och slut, det som blir länken), medförfattarnas
 * efternamn, om det står "m.fl.", året och titeln när den står i hänvisningen. Vilken bok det är avgör den som har
 * böckerna (sajtens src/lib/boklankar.ts).
 * @param {string} text
 * @returns {{ start: number, slut: number, text: string, medforfattare: string[], mfl: boolean, ar: number, utkommer: boolean, titel?: string }[]}
 */
export function fohlinHanvisningar(text) {
  const ut = [];
  // Författarna: Fohlin först, ensam, med "m.fl." eller med fler efter ("Fohlin och Wilson", "Fohlin, Fohlin och
  // Wilson", där Lisa Fohlin är medförfattare), eller sist av två ("Wilson och Fohlin"). "&" står som &amp; i HTML.
  const NAMN = String.raw`[\p{Lu}][\p{L}-]+`;
  const OCH = String.raw`\s+(?:och|&(?:amp;)?)\s+`;
  const FORF = String.raw`(?:Fohlin(?:(?:,\s+${NAMN})*${OCH}${NAMN}|\s+m\.\s?fl\.)?|${NAMN}${OCH}Fohlin)`;
  const AR = String.raw`(utkommer\s+)?((?:19|20)\d\d)[a-z]?`;
  const mfl = (s) => /m\.\s?fl\./.test(s);
  // Medförfattarna är namnen utom ett Fohlin, i ordning.
  const medforfattare = (forf) => {
    if (mfl(forf)) return [];
    const namn = forf.split(new RegExp(String.raw`\s*,\s*|${OCH}`, 'u')).map((n) => n.trim()).filter(Boolean);
    namn.splice(namn.indexOf('Fohlin'), 1);
    return namn;
  };
  // I en parentes, en eller flera hänvisningar åtskilda av semikolon, med "se" eller "jfr" före och sidan efter, som
  // "(se Fohlin och Wilson, 2023, s. 45)". Länken är författarna och året.
  const iParentes = new RegExp(String.raw`^(\s*(?:(?:se(?:\s+även|\s+t\.\s?ex\.)?|jfr)\s+)?)(${FORF})\s*,\s*${AR}(?:\s*,\s*(?:s|sid|kap)\.\s*\d+(?:\s*[–-]\s*\d+)?(?:\s*ff?\.)?)?\s*$`, 'u');
  const paren = [];
  for (const m of text.matchAll(/\(([^()]*)\)/g)) {
    paren.push([m.index, m.index + m[0].length]);
    let pos = m.index + 1;
    // Semikolon skiljer hänvisningarna, utom i ett tecken i HTML (&amp;).
    for (const del of m[1].split(/(?<!&[a-z]+);/)) {
      const d = del.match(iParentes);
      if (d) {
        const start = pos + d[1].length;
        const arSlut = del.indexOf(d[4], d[1].length + d[2].length) + d[4].length;
        const slut = pos + arSlut + (del.slice(arSlut).match(/^[a-z]/) ? 1 : 0);
        ut.push({ start, slut, text: text.slice(start, slut), medforfattare: medforfattare(d[2]), mfl: mfl(d[2]), ar: Number(d[4]), utkommer: Boolean(d[3]) });
      }
      pos += del.length + 1;
    }
  }
  // Med året i parentes efter, och med titeln mellan i en källförteckning. Titeln går inte över ett meningsslut (punkt och
  // stor bokstav); utrop står i titlar ("Skriv!", "LÄS! Nycklar …").
  const efter = new RegExp(String.raw`(?<![\p{L}])(${FORF})(?:,\s*((?:[^()\n;.]|\.(?!\s+[\p{Lu}])){1,140}?))?\s*\(${AR}\)`, 'gu');
  for (const m of text.matchAll(efter)) {
    const start = m.index;
    if (paren.some(([a, b]) => start > a && start < b)) continue;
    // "Lisa Fohlin" och "Niclas Fohlin" är personer, inte hänvisningar.
    if (/(?:Niclas|Lisa)\s+$/.test(text.slice(Math.max(0, start - 8), start))) continue;
    const slut = start + m[0].length;
    const titel = m[0].slice(m[1].length).match(/^,\s*([\s\S]*?)\s*\([^()]*\)$/)?.[1];
    ut.push({ start, slut, text: m[0], medforfattare: medforfattare(m[1]), mfl: mfl(m[1]), ar: Number(m[4]), utkommer: Boolean(m[3]), ...(titel ? { titel } : {}) });
  }
  return ut.sort((a, b) => a.start - b.start);
}
