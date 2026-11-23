// Små textverktyg, en rot för varje (sajtens K-509; Niclas 2026-10-25: "Centralisera och till en rot ... Och saker ska
// härledas ur en beräkning eller ett ställe som är samma sak. Inte ha kopierade koder på olika ställen"). Planen, sidorna,
// pdf:erna och standardens andra delar hämtar dem här, och sajtens planprov stannar på samma funktion, samma lista eller
// samma kod på två ställen i modulen (PLANERA.md under Spärren mot drift).

/** Stor bokstav först: "Måndag 2 november". @param {string} s */
export const stor = (s) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);
/** Liten bokstav först, som när en mening ur metoden står inne i en annan. @param {string} s */
export const liten = (s) => s.charAt(0).toLocaleLowerCase('sv') + s.slice(1);
/**
 * Liten bokstav först i ett namn som står inne i en mening, utom när namnet börjar med en förkortning eller en bokstav med
 * bindestreck, som T-kortet och EPA, som riggens renderare (riggens brev om Kooperativt lärande 2026-10-30, punkt 1:
 * "Rutinen t-kortet" ska vara "Rutinen T-kortet"). @param {string} s
 */
export const litenForsta = (s) => (/^\p{Lu}\p{Ll}/u.test(String(s ?? '')) ? liten(String(s)) : String(s ?? ''));
/**
 * En text där raden inte bryts på fel ställe, för en fil med fasta rader som lathundens PowerPoint-fil och dess pdf
 * (riggens brev om Kooperativt lärande 2026-10-30, punkt 7: "T- / kortet", "Ping- / pong-prat" och "interaktion, 5 /
 * Återkoppling"): ett bindestreck mellan två bokstäver blir ett hårt bindestreck (U+2011), och mellanslaget efter ett tal som
 * står för sig före ett ord blir ett hårt mellanslag (U+00A0), så att numret följer med ordet. Sidan behåller vanliga tecken,
 * så att metodens saker hittas i texten. @param {string} s
 */
export const utanRadbrytning = (s) => String(s ?? '').replace(/(\p{L})-(?=\p{L})/gu, '$1\u2011').replace(/(^|[\s(])(\d+) (?=\p{L})/gu, '$1$2\u00a0');
/** En mening slutar med punkt, om den inte redan slutar med ett skiljetecken. @param {string} s */
export const mening = (s) => (/[.!?:”"]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
/** Utan punkt och blanksteg sist, så att texten kan stå inne i en längre mening. @param {string} s */
export const utanPunkt = (s) => s.replace(/[.\s]+$/, '');
/** Ett tal med decimalkomma: "3,5". @param {number | null} n */
export const decimal = (n) => String(n).replace('.', ',');
/** Ett tal med lika många decimaler som de andra i en kolumn: "2,0" och "4,4" (den kalla läsaren 2026-10-30, nr 17). @param {number} n @param {number} [decimaler] */
export const medDecimaler = (n, decimaler = 1) => n.toFixed(decimaler).replace('.', ',');
/** "09" ur 9. @param {number} n */
export const tvasiffrigt = (n) => String(n).padStart(2, '0');
/** Text som ska stå i HTML, med &, <, > och " skyddade. @param {string} s */
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
/** Text som ska sökas ordagrant i ett reguljärt uttryck. @param {string} s */
export const skyddaRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * En text som är längre än gränsen, kapad vid ett ord och med tre punkter sist, så att den aldrig slutar mitt i ett ord
 * som läses som en förkortning (sajtens K-543; buggjakten 2026-10-25: "Mycket lång anl." i sammanställningen). Ett ord som
 * är längre än halva gränsen kapas där gränsen går.
 * @param {string} t
 * @param {number} max
 */
export const kapaVidOrd = (t, max) => {
  if (t.length <= max) return t;
  const kapad = t.slice(0, max - 1);
  const vid = kapad.lastIndexOf(' ');
  return `${(vid >= max / 2 ? kapad.slice(0, vid) : kapad).replace(/[\s,.;:!?–-]+$/u, '')}…`;
};
/**
 * Text som läraren har skrivit, på en rad: utan styrtecken, med ett blanksteg mellan orden och högst max tecken, kapad vid
 * ett ord (kapaVidOrd). Annat än text blir tom text.
 * @param {unknown} x
 * @param {number} max
 */
/** En lista, eller en tom lista när värdet inte är en, som det läraren har fört in eller en metods fält (sajtens K-630: samma rad stod i rensaFoljd och i sajtens Lär dig metoden). @param {unknown} x @returns {unknown[]} */
export const somLista = (x) => (Array.isArray(x) ? x : []);
/** Text utan ordfogar och mjuka bindestreck, som riggen sätter i ett spann som "åk 4–5" och "2–12 min", så att ett namn kan
 * jämföras och ett spann läsas som tal (flyttad hit från plan.js 2026-11-08, så att faktans tolkare i index.js kan läsa den). */
export const utanFogar = (s) => String(s ?? '').replace(/[\u2060\u00ad]/g, '');
export const rentText = (x, max) => (typeof x === 'string' ? kapaVidOrd(x.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim(), max) : '');
/**
 * Etiketten som en rad i ett fält börjar med, som "Steg 2" i "Steg 2: …", ur metodens radetiketter, som den står i raden. Ett
 * hårt mellanslag i texten eller i etiketten är ett blanksteg (K-814: "Steg 1" fick husets blå och "Steg 2" inte).
 * @param {string} rad
 * @param {readonly string[] | undefined} etiketter
 * @returns {string | undefined}
 */
export const radensEtikett = (rad, etiketter) => { const n = (/** @type {string} */ s) => s.replace(/\u00a0/g, ' '); const t = n(rad); const e = (etiketter ?? []).find((x) => t.startsWith(`${n(x)}: `)); return e === undefined ? undefined : rad.slice(0, e.length); };
/** Namnets första led, före kolon: "Lärarhandledningen" ur "Lärarhandledningen: Läs mellan raderna". @param {string} s */
export const forstaLedet = (s) => s.split(':')[0].trim();
/** Alla texter i ett värde, också i listor och objekt, som lathunden eller ett lektionskorts innehåll. @param {unknown} x @returns {string[]} */
export const allaTexter = (x) => (typeof x === 'string' ? [x] : Array.isArray(x) ? x.flatMap(allaTexter) : x && typeof x === 'object' && !(x instanceof Date) ? Object.values(x).flatMap(allaTexter) : []);
/** Det första ordet: en elevs förnamn, "Ali" ur "Ali S.", och rubrikens första ord, "Lässchema" ur "Lässchema TIL". @param {unknown} s */
export const forstaOrdet = (s) => String(s ?? '').trim().split(/\s+/)[0];
/**
 * Om ett namn som skrivs på en elevs rad i elevlistan är samma elev, med samma förnamn, som "Ali" och "Ali S." (sajtens
 * K-516; buggjakten 2026-10-25: Nova skrevs på Annas rad och fick Annas skattningar och resultat). Ett annat förnamn är en
 * ny elev, också ett förnamn som bara skiljer på en bokstav, eftersom många namn gör det (Alva och Alma, Nora och Nova).
 * Läraren kan säga att det är samma elev med rättat namn.
 * @param {string} forut namnet när läraren började skriva
 * @param {string} nu
 */
export const sammaElev = (forut, nu) => !!forstaOrdet(forut) && forstaOrdet(forut).toLocaleLowerCase('sv') === forstaOrdet(nu).toLocaleLowerCase('sv');
// Förkortningar som slutar med punkt utan att meningen slutar.
const FORKORTNING = /(?:^|[^\p{L}])(?:t\.ex|m\.fl|bl\.a|o\.s\.v|s\.k|d\.v\.s|ca|kl|nr|s)\.$/iu;
/** Om en mening slutar med punkt, utropstecken, frågetecken eller tre punkter, också inom citattecken. @param {string} m */
export const slutarMedPunkt = (m) => /[.!?…]["”»’)]*$/u.test(m);
/**
 * Meningarna i en text: en mening slutar med punkt, utropstecken, frågetecken eller tre punkter, också inom citattecken,
 * före ett ord med stor bokstav eller textens slut. Förkortningar som t.ex. delar inte, och ett citat som ”Hej!” mitt i en
 * mening inte heller.
 * @param {unknown} text
 * @returns {string[]}
 */
export function meningarna(text) {
  const t = String(text ?? '').trim();
  if (!t) return [];
  const ut = [];
  let fran = 0;
  for (const m of t.matchAll(/[.!?…]["”»’)]*(?=\s+[A-ZÅÄÖ”"«])/gu)) {
    const slut = /** @type {number} */ (m.index) + m[0].length;
    if (FORKORTNING.test(t.slice(fran, /** @type {number} */ (m.index) + 1))) continue;
    ut.push(t.slice(fran, slut).trim());
    fran = slut;
  }
  ut.push(t.slice(fran).trim());
  return ut.filter(Boolean);
}
/**
 * Ett namn kort, med bara första ledet, när inget annat namn i listan har samma första led, och annars helt: "Bildserie 1"
 * och "Mina lärdomar: vecka 1–2".
 * @param {string} namn
 * @param {string[]} alla
 */
export const kortnamn = (namn, alla) => (alla.filter((x) => forstaLedet(x) === forstaLedet(namn)).length === 1 ? forstaLedet(namn) : namn);

// ---------- Talen ----------
// Löptext skriver talen upp till tolv med bokstäver (talText), och metodernas texter läses med siffror eller ord, också
// sammansatta som "tjugofem" (talAv). Orden står här och bara här.

const ENTAL = ['noll', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv', 'tretton', 'fjorton', 'femton', 'sexton', 'sjutton', 'arton', 'nitton'];
const TIOTAL = ['', '', 'tjugo', 'trettio', 'fyrtio', 'femtio', 'sextio', 'sjuttio', 'åttio', 'nittio'];
/** Ordningstalen, "första" för 1. */
export const ORDNINGSTAL = Object.freeze(['', 'första', 'andra', 'tredje', 'fjärde', 'femte', 'sjätte', 'sjunde', 'åttonde', 'nionde', 'tionde']);
/** Ett tal i ord upp till tolv, som i löptext, och annars med siffror. @param {number} n @param {boolean} [en] "en" i stället för "ett" */
export const talText = (n, en = false) => (n === 1 && en ? 'en' : Number.isInteger(n) && n >= 0 && n <= 12 ? ENTAL[n] : String(n));
/** Ett antal med ett ord av utrum i ord, som "en vecka", "två veckor" och "tre dagar" (granskningen rot-3, fynd 11). @param {number} n @param {string} en @param {string} flera */
export const antalText = (n, en, flera) => `${talText(n, true)} ${n === 1 ? en : flera}`;
/** Ett antal veckor i ord: "en vecka", "två veckor". @param {number} n */
export const veckorText = (n) => antalText(n, 'vecka', 'veckor');
/** "båda" för två och "alla tre" för fler. @param {number} n */
export const allaAntal = (n) => (n === 2 ? 'båda' : `alla ${talText(n)}`);
/** Ett tal ur siffror eller ord, också "en" och sammansatta som "tjugofem"; NaN när texten inte är ett tal. @param {string} s */
export function talAv(s) {
  const t = String(s ?? '').trim().toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  if (t === 'en') return 1;
  const tio = TIOTAL.findIndex((x) => x && t.startsWith(x));
  if (tio > 0) {
    const rest = t.slice(TIOTAL[tio].length);
    const e = rest === '' ? 0 : rest === 'en' ? 1 : ENTAL.indexOf(rest);
    return e >= 0 && e <= 9 ? tio * 10 + e : NaN;
  }
  const i = ENTAL.indexOf(t);
  return i >= 0 ? i : NaN;
}
/**
 * Talen från fran till till som led i ett reguljärt uttryck, med siffrorna först: "\d+|en|ett|två|tre". "en" står med när
 * ett ingår, och från tjugo de sammansatta tiotalen, som "tjugofem". Utan siffror bara orden.
 * @param {number} fran
 * @param {number} till
 * @param {boolean} [siffror]
 */
export const talIRegex = (fran, till, siffror = true) => {
  const tiotal = till >= 20 ? [`(?:${TIOTAL.slice(2, Math.min(9, Math.floor(till / 10)) + 1).join('|')})(?:en|${ENTAL.slice(1, 10).join('|')})?`] : [];
  return [...(siffror ? ['\\d+'] : []), ...(fran <= 1 && till >= 1 ? ['en'] : []), ...ENTAL.slice(Math.max(0, fran), Math.min(19, till) + 1), ...tiotal].join('|');
};
/**
 * En länk ut från sajten i en text, skriven [text](https://…), som Material att köpa i Tänkande klassrum (riggens leverans
 * 2026-11-14, K-762) och litteraturlistan i Boksamtal i grupp. En rot för sidan i båda bankerna (medWebblankar och
 * lankaBocker) och Word-filerna (lankLopor), så att samma skrivsätt blir en länk överallt (K-768). Adressen får ha
 * parenteser i par, som en artikel på Wikipedia.
 */
export const WEBBLANK = /\[([^\]\n]+)\]\((https?:\/\/(?:[^()\s]|\([^()\s]*\))+)\)/g;
/**
 * Texten i delar: länkarna med sin text och adress, och texten mellan dem. Utan länkar är svaret en del med hela texten.
 * @param {string} t
 * @returns {{ text: string, href?: string }[]}
 */
export function webbdelar(t) {
  const s = String(t ?? '');
  /** @type {{ text: string, href?: string }[]} */
  const ut = [];
  let forra = 0;
  for (const m of s.matchAll(WEBBLANK)) {
    if (m.index > forra) ut.push({ text: s.slice(forra, m.index) });
    ut.push({ text: m[1], href: m[2] });
    forra = m.index + m[0].length;
  }
  if (forra < s.length || !ut.length) ut.push({ text: s.slice(forra) });
  return ut;
}
