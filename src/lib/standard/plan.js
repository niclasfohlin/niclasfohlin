// Planera insatsen (sajtens K-489; Niclas 2026-10-24: "Planera insatsen gillar jag", och "bygg EN som du testar på flera
// olika sätt att den funkar. dvs en standard"). Läraren väljer första passet, dagarna och antalet veckor; planen räknar
// fram passen och uppföljningen ur metodens fil. Veckorna i planen följer gruppens steg i metoden: en vecka kan tas om, och
// lov och inställda pass flyttar resten fram (Codex-granskningen av utkastet 2026-10-24). Allt räknas med datum som text
// (ÅÅÅÅ-MM-DD) i UTC, så att sommartiden aldrig flyttar en dag. Sajtens METODER.md under Planera insatsen säger hur
// metodens fält skrivs.
import { periodensLangd, postensRad, tidensMatt, tidensVeckotakt } from './index.js';
import { allaTexter, decimal, forstaLedet, forstaOrdet, liten, mening, meningarna, ORDNINGSTAL, rentText, skyddaRegex, stor, talAv, talIRegex, talText, tvasiffrigt, utanPunkt } from './text.js';

const DAG = 86400000;
const tillTid = (s) => { const [a, m, d] = s.split('-').map(Number); return Date.UTC(a, m - 1, d); };
const tillText = (t) => new Date(t).toISOString().slice(0, 10);

/** Datumet n dagar efter (eller före) s. @param {string} s @param {number} n */
export const plusDagar = (s, n) => tillText(tillTid(s) + n * DAG);
/** Veckodagen, 1 för måndag till 7 för söndag. @param {string} s */
export const veckodag = (s) => ((new Date(tillTid(s)).getUTCDay() + 6) % 7) + 1;
/** Måndagen i samma vecka. @param {string} s */
export const mandagen = (s) => plusDagar(s, 1 - veckodag(s));
/** Är texten ett riktigt datum i formen ÅÅÅÅ-MM-DD? @param {unknown} s */
export const arDatum = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && tillText(tillTid(s)) === s;

/** Veckans nummer enligt ISO 8601, som svenska kalendrar använder: vecka 1 är veckan med årets första torsdag. @param {string} s */
export function isoVecka(s) {
  const torsdag = tillTid(s) + (4 - veckodag(s)) * DAG;
  const ar = new Date(torsdag).getUTCFullYear();
  return { ar, vecka: Math.floor((torsdag - Date.UTC(ar, 0, 1)) / DAG / 7) + 1 };
}
/** Veckans nyckel i länken och i lovlistan, som 2026-52. @param {string} s */
export const veckonyckel = (s) => { const v = isoVecka(s); return `${v.ar}-${tvasiffrigt(v.vecka)}`; };

/** Påskdagen ett år (den gregorianska påskregeln, Meeus, Jones och Butcher). @param {number} ar */
export function paskdagen(ar) {
  const a = ar % 19, b = Math.floor(ar / 100), c = ar % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const manad = Math.floor((h + l - 7 * m + 114) / 31), dag = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ar}-${tvasiffrigt(manad)}-${tvasiffrigt(dag)}`;
}

/**
 * De dagar ett år då skolan är stängd i hela landet: helgdagarna i lagen om allmänna helgdagar och de tre aftnarna
 * (julafton, nyårsafton och midsommarafton). Lov och studiedagar skiljer sig mellan skolor, så dem anger läraren.
 * @param {number} ar
 * @returns {Map<string, string>} datumet och dagens namn
 */
export function rodaDagar(ar) {
  const pask = paskdagen(ar);
  const lordagMellan = (fran) => { let s = `${ar}-${fran}`; while (veckodag(s) !== 6) s = plusDagar(s, 1); return s; };
  const midsommar = lordagMellan('06-20');
  return new Map([
    [`${ar}-01-01`, 'nyårsdagen'], [`${ar}-01-06`, 'trettondedag jul'], [plusDagar(pask, -2), 'långfredagen'], [pask, 'påskdagen'],
    [plusDagar(pask, 1), 'annandag påsk'], [`${ar}-05-01`, 'första maj'], [plusDagar(pask, 39), 'Kristi himmelsfärdsdag'],
    [plusDagar(pask, 49), 'pingstdagen'], [`${ar}-06-06`, 'nationaldagen'], [plusDagar(midsommar, -1), 'midsommarafton'],
    [midsommar, 'midsommardagen'], [lordagMellan('10-31'), 'alla helgons dag'], [`${ar}-12-24`, 'julafton'], [`${ar}-12-25`, 'juldagen'],
    [`${ar}-12-26`, 'annandag jul'], [`${ar}-12-31`, 'nyårsafton'],
  ]);
}
const helgdagar = new Map();
/** Dagens namn om skolan är stängd då i hela landet. @param {string} s */
export function helgdag(s) {
  const ar = Number(s.slice(0, 4));
  if (!helgdagar.has(ar)) helgdagar.set(ar, rodaDagar(ar));
  return helgdagar.get(ar).get(s);
}

// ---------- Metodens fält ----------

// Planens fält i metodens fil: `plan` överst, `tid` och `perElev` på uppföljningens rader och `taggar` och `rubrik` på
// progressionens.
const PLANENS_RADER = { uppfoljning: ['tid', 'perElev'], progression: ['taggar', 'rubrik'] };

/**
 * Metodens fil utan planens fält. Bara planens sida läser dem: de står inte på metodens sida, i Word eller i lathunden,
 * så de ger inget nytt datum, gör inte om lathunden och prövas inte mot Word och utskriften. Resten står kvar i samma
 * ordning, så att en metod utan planens fält ger samma JSON som förut.
 * @template {Record<string, any>} T @param {T} d @returns {T}
 */
export function utanPlanensFalt(d) {
  const ut = { ...d };
  delete ut.plan;
  for (const [k, falt] of Object.entries(PLANENS_RADER)) {
    if (Array.isArray(ut[k]?.rader)) ut[k] = { ...ut[k], rader: ut[k].rader.map((r) => (r && typeof r === 'object' ? Object.fromEntries(Object.entries(r).filter(([f]) => !falt.includes(f))) : r)) };
  }
  return ut;
}

const TAL = `(${talIRegex(1, 12)})`;
const STRECK = String.raw`\s*[–—-]\s*`;
const lista = (s) => s.split(/\s*(?:,|\boch\b)\s*/).filter(Boolean).map((x) => talAv(x));

/**
 * När en rad i metodens uppföljning görs, som ord i fältet `tid` bredvid radens egen text (`nar`). Orden är få och fasta,
 * så att planen kan sätta ett datum och bygget kan stanna på ett ord den inte känner:
 * före, efter, efter N veckor (och N–M veckor), varje pass, i passet, varje vecka, varannan vecka, var N:e vecka,
 * vecka N (och N, M och O eller N–M), första veckan, sista veckan, pass N (och N, M och O eller N–M), sista passet och
 * villkor, det som läraren bedömer när det händer.
 * @param {unknown} text
 * @returns {Tid | null}
 */
export function tolkaTid(text) {
  if (typeof text !== 'string') return null;
  const t = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (t === 'före') return { typ: 'fore' };
  if (t === 'efter') return { typ: 'efter', veckor: 0 };
  let m = t.match(new RegExp(String.raw`^efter ${TAL}(?:${STRECK}${TAL})? veckor?$`, 'u'));
  if (m) return { typ: 'efter', veckor: talAv(m[1]), ...(m[2] ? { till: talAv(m[2]) } : {}) };
  if (t === 'varje pass' || t === 'i passet') return { typ: 'lopande', enhet: 'pass' };
  if (t === 'varje vecka') return { typ: 'lopande', enhet: 'vecka' };
  if (t === 'varannan vecka') return { typ: 'intervall', var: 2 };
  m = t.match(/^var (\d+):e vecka$/);
  if (m) return Number(m[1]) >= 2 ? { typ: 'intervall', var: Number(m[1]) } : null;
  if (t === 'första veckan') return { typ: 'vecka', veckor: [1] };
  if (t === 'sista veckan') return { typ: 'sista-veckan' };
  if (t === 'sista passet') return { typ: 'sista-passet' };
  if (t === 'villkor') return { typ: 'villkor' };
  m = t.match(new RegExp(String.raw`^(vecka|pass) ${TAL}${STRECK}${TAL}$`, 'u'));
  if (m) {
    // Ett spann är alla veckor eller pass i det, som METODER.md säger (Codex 2026-10-24: pass 6–8 gav bara pass 6).
    const [fran, till] = [talAv(m[2]), talAv(m[3])];
    if (!(till > fran)) return null;
    const alla = Array.from({ length: till - fran + 1 }, (_, i) => fran + i);
    return m[1] === 'vecka' ? { typ: 'vecka', veckor: alla } : { typ: 'pass', pass: alla };
  }
  m = t.match(/^(vecka|pass) ([\d\s,]+(?:och \d+)?)$/);
  if (m) {
    const n = lista(m[2]);
    if (!n.length || n.some((x) => !(x >= 1))) return null;
    return m[1] === 'vecka' ? { typ: 'vecka', veckor: n } : { typ: 'pass', pass: n };
  }
  return null;
}

/**
 * Vilka veckor eller pass en rad i metodens progression gäller, ur radens första kolumn (`vecka`): "1", "4–5", "6–8",
 * "9–10 vid behov", "6 till det sista", "Vecka 3", "Pass 2–6" och "Från pass 11". till saknas när raden gäller till
 * slutet. "Efter vecka 7" är det som kommer efter insatsen, som nästa period i Läslistor i grupp: raden står under Efter
 * insatsen och tar ingen vecka i planen (de kalla testarna 2026-10-24: vecka 8 visade nästa period som veckans fokus).
 * @param {unknown} text
 * @returns {{ fran: number, till?: number, vidBehov: boolean, efter?: true } | null}
 */
export function tolkaSteg(text) {
  if (typeof text !== 'string') return null;
  const t = text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^(?:vecka|pass) /, '');
  const vidBehov = / vid behov$/.test(t);
  const k = t.replace(/ vid behov$/, '');
  let m = k.match(/^(\d+)$/);
  if (m) return { fran: Number(m[1]), till: Number(m[1]), vidBehov };
  m = k.match(new RegExp(String.raw`^(\d+)${STRECK}(\d+)$`, 'u'));
  if (m) return Number(m[2]) > Number(m[1]) ? { fran: Number(m[1]), till: Number(m[2]), vidBehov } : null;
  m = k.match(/^(\d+) till det sista$/) ?? k.match(/^från (?:vecka |pass )?(\d+)$/) ?? k.match(/^(\d+) och framåt$/);
  if (m) return { fran: Number(m[1]), vidBehov };
  m = k.match(/^efter (?:vecka |pass )?(\d+)$/);
  if (m) return { fran: Number(m[1]) + 1, vidBehov, efter: true };
  return null;
}

/**
 * Veckorna i "vecka 3" och "vecka 1–2" som ett spann, { fran: 1, till: 2 }, eller null. Planens pass och metodens saker
 * läser dem lika (sajtens src/lib/metodsaker.ts).
 * @param {unknown} text
 */
export function veckorI(text) {
  if (typeof text !== 'string') return null;
  const m = text.replace(/\u2060/g, '').trim().toLowerCase().match(new RegExp(String.raw`^vecka (\d+)(?:${STRECK}(\d+))?$`, 'u'));
  if (!m) return null;
  const fran = Number(m[1]), till = Number(m[2] ?? m[1]);
  return till >= fran ? { fran, till } : null;
}

/**
 * Vilka pass en rad i planens `passen` gäller, ur dess `nar` (betan 2026-10-24: de kalla testarna saknade vad som skiljer
 * passen åt). Ett pass räknas på tre sätt: efter platsen i veckan, "veckans första", "veckans andra", "veckans tredje",
 * "veckans sista" och "veckans övriga" (de mellan första och sista), efter numret i insatsen, "första passet", "pass
 * 7", "pass 2–6", "pass 8 till det sista", "näst sista passet" och "sista passet", eller efter metodens veckor, "vecka
 * 1–3" (Läslistor: vecka 1–3 är passet bara listan, Codex 2026-10-25). Det näst sista passet är Boksamtalets sista
 * läspass, där boken läses ut (riggens omgång 1 2026-10-26).
 * @param {unknown} text
 * @returns {PassensNar | null}
 */
export function tolkaPassen(text) {
  if (typeof text !== 'string') return null;
  const t = text.trim().toLowerCase().replace(/\s+/g, ' ');
  let m = t.match(/^veckans (första|andra|tredje|fjärde|femte|sista|övriga)(?: pass)?$/);
  if (m) return { typ: 'vecka', plats: m[1] === 'sista' ? 'sista' : m[1] === 'övriga' ? 'ovriga' : ORDNINGSTAL.indexOf(m[1]) };
  if (t === 'första passet') return { typ: 'pass', fran: 1, till: 1 };
  if (t === 'sista passet' || t === 'det sista passet') return { typ: 'sista' };
  if (t === 'näst sista passet' || t === 'det näst sista passet') return { typ: 'nastSista' };
  m = t.match(/^pass (\d+)$/);
  if (m) return { typ: 'pass', fran: Number(m[1]), till: Number(m[1]) };
  m = t.match(new RegExp(String.raw`^pass (\d+)${STRECK}(\d+)$`, 'u'));
  if (m) return Number(m[2]) > Number(m[1]) ? { typ: 'pass', fran: Number(m[1]), till: Number(m[2]) } : null;
  m = t.match(/^pass (\d+) till det sista$/);
  if (m) return { typ: 'pass', fran: Number(m[1]) };
  const v = veckorI(t);
  return v ? { typ: 'veckor', ...v } : null;
}

/**
 * Metodens plan ur dess fält: hur ofta och hur länge (faktarutans tid och period, som standarden läser), progressionens
 * steg och uppföljningens tider. En metod kan planeras när varje rad i uppföljningen har `tid` och varje fält går att
 * läsa; annars ger fel vad som saknas, så att sajten kan stanna bygget och riggen skriva det i sin rapport.
 * @param {{ tid?: string, period?: string, progression?: { enhet?: string, rader: { vecka: string, taggar?: string[] }[] }, uppfoljning?: { rader: { nar: string, tid?: string }[] }, plan?: { passen?: { nar: string }[] } }} d
 * @returns {{ fel: string[], plan?: Metodplan }}
 */
export function metodplan(d) {
  const fel = [];
  const takt = tidensVeckotakt(d.tid);
  const matt = tidensMatt(d.tid ?? '');
  const period = periodensLangd(d.period);
  if (!takt) fel.push(`Faktarutans tid, "${d.tid ?? ''}", säger inte hur många pass i veckan.`);
  if (matt.minst === undefined) fel.push(`Faktarutans tid, "${d.tid ?? ''}", säger inte hur långt passet är.`);
  if (!period) fel.push(`Faktarutans period, "${d.period ?? ''}", går inte att läsa i veckor eller pass.`);
  const rader = d.uppfoljning?.rader ?? [];
  if (!rader.length) fel.push('Metoden har ingen uppföljning, och planen behöver veta när uppföljningen görs.');
  const uppfoljning = rader.map((r, rad) => {
    const tid = tolkaTid(r.tid);
    if (r.tid === undefined) fel.push(`Uppföljningens rad "${r.nar}" har ingen tid. Skriv den med standardens ord, som före, varje vecka, vecka 4 eller efter.`);
    else if (!tid) fel.push(`Uppföljningens rad "${r.nar}" har tiden "${r.tid}", som planen inte känner. Orden står i METODER.md under Planera insatsen.`);
    return { rad, tid };
  });
  const enhetText = (d.progression?.enhet ?? 'Vecka').toLowerCase();
  const stegEnhet = enhetText === 'pass' ? 'pass' : enhetText === 'vecka' ? 'veckor' : null;
  if (d.progression && !stegEnhet) fel.push(`Progressionens första kolumn heter "${d.progression.enhet}". Planen läser veckor och pass, så skriv kolumnen som Vecka eller Pass.`);
  const steg = (d.progression?.rader ?? []).map((r, rad) => {
    const s = tolkaSteg(r.vecka);
    if (!s) fel.push(`Progressionens rad "${r.vecka}" går inte att läsa som ${stegEnhet === 'pass' ? 'pass' : 'veckor'}. Skriv den som 1, 4–5, 6 till det sista eller Från pass 11.`);
    return s ? { rad, ...s } : null;
  });
  steg.forEach((s, i) => {
    const forra = steg[i - 1];
    if (s && forra && (forra.till === undefined || s.fran <= forra.till)) fel.push(`Progressionens rad "${d.progression.rader[i].vecka}" börjar innan raden före slutar.`);
  });
  const passen = (d.plan?.passen ?? []).map((p, rad) => {
    const nar = tolkaPassen(p.nar);
    if (!nar) fel.push(`Planens pass "${p.nar}" går inte att läsa. Skriv det som veckans första, veckans sista, veckans övriga, första passet, pass 7, pass 2–6, pass 8 till det sista, näst sista passet, sista passet eller vecka 1–3.`);
    return { rad, nar };
  });
  if (fel.length) return { fel };
  return {
    fel,
    plan: {
      takt: /** @type {{ min: number, max: number }} */ (takt),
      minuter: { min: /** @type {number} */ (matt.minst), max: /** @type {number} */ (matt.minuter) },
      period: /** @type {NonNullable<ReturnType<typeof periodensLangd>>} */ (period),
      stegEnhet: stegEnhet ?? 'veckor',
      steg: /** @type {Steg[]} */ (steg),
      uppfoljning: /** @type {{ rad: number, tid: Tid }[]} */ (uppfoljning),
      passen: /** @type {{ rad: number, nar: NonNullable<ReturnType<typeof tolkaPassen>> }[]} */ (passen),
    },
  };
}

// ---------- Metodens texter i planen ----------
// Texterna ur metoden som planen visar, på ett ställe (sajtens K-515), så att sajten länkar namnen i dem och standarden
// prövar att de går att läsa i planens ram. Metoden är roten (Niclas 2026-10-25: "Metoder måste ha en rot för alla dessa
// premisser ... att saker tas alltid från en rot och att den är 1-1 med metodens kort"): planen visar metodens egna texter
// och läser passets tider ur metodens tidsschema, också vissa veckors (varianterna). Metodens texter är skrivna för
// metodens sida, där passet har en remsa och veckorna metodens nummer, så en mening om metodens sida står i plan.utan, och i
// en stege skrivs metodens veckor med siffror, så att planen kan skriva dem som sina (veckornaIPlanen). Riggen prövar samma
// sak (planFel).

/**
 * Tidsschemats text som planen visar den, utan meningarna i plan.utan: de som gäller metodens sida, som "Remsan visar
 * passet från vecka 4", eller passets tider som planen visar som delar.
 * @param {string | undefined} text
 * @param {string[]} [utan]
 */
export const planensInledning = (text, utan = []) => meningarna(text).filter((m) => !utan.some((u) => u.trim() === m)).join(' ');

/**
 * Planens egna fält och de texter i metoden som bara planen läser, med var de står: uppföljningen, progressionen,
 * checklistan och fälten i plan.
 * @param {MetodensTexter} d
 * @returns {[string, string][]}
 */
export const planensTexter = (d) => [
  ...(d.uppfoljning?.rader ?? []).map((r) => /** @type {[string, string]} */ ([`Uppföljningens rad "${r.nar}"`, r.vad])),
  ...(d.progression?.rader ?? []).flatMap((r) => [r.fokus, r.roll, r.led].filter(Boolean).map((t) => /** @type {[string, string]} */ ([`Progressionens rad "${r.vecka}"`, t]))),
  ...(d.checklista?.punkter ?? []).map((p) => /** @type {[string, string]} */ (['Checklistan', p])),
  ...(d.plan?.passen ?? []).flatMap((p) => (p.text ? [/** @type {[string, string]} */ ([`Planens pass "${p.nar}"`, p.text])] : [])),
  ...(d.plan?.fore ?? []).map((t) => /** @type {[string, string]} */ (['Planens fore', t])),
  ...(d.plan?.justera ?? []).map((t) => /** @type {[string, string]} */ (['Planens justera', t])),
  ...(d.plan?.upprepa ? [/** @type {[string, string]} */ (['Planens upprepa', d.plan.upprepa])] : []),
];

/**
 * Alla texter ur metoden som planen visar: planens egna (planensTexter) och metodens passets delar, tidsschemats inledning
 * som planen visar den, efter passet, gruppen, principerna, Hem och skola, och tabellerna för pass med egen ordning och
 * med veckorna och nivåerna.
 * @param {MetodensTexter} d
 * @returns {string[]}
 */
export const visadeTexter = (d) => [
  ...planensTexter(d).map(([, t]) => t),
  ...(d.tidsschema?.rader ?? []).map((r) => r.vad),
  ...(d.tidsschema?.varianter ?? []).map((v) => v.text),
  planensInledning(d.tidsschema?.text, d.plan?.utan), d.gruppen?.text ?? '',
  d.tidsschema?.efter ?? '', d.passrutin?.efterPasset ?? '', d.principer?.text ?? '', d.hem?.text[0] ?? '',
  ...(d.tabeller ?? []).filter((t) => (d.plan?.passen ?? []).some((p) => p.tabell === t.rubrik || p.ur?.tabell === t.rubrik) || ((d.nivaer ?? []).length >= 2 && t.kolumner.slice(1).every((k, i) => k.toLowerCase() === d.nivaer?.[i]?.namn.toLowerCase()))).flatMap((t) => (t.rader ?? []).flatMap((r) => r.slice(1).map(String))),
].filter(Boolean);

// En mening om metodens sida: remsan och tabellerna där, och det som står under eller efter något. En tabell med namn,
// som "tabellen Talen och bladen i veckorna", är en sak i metoden och blir en länk.
const OM_SIDAN = [/\b(?:[Rr]emsan|[Tt]abeller(?:na)?)(?![\p{L}\p{N}])/u, /\b[Tt]abellen(?![\p{L}\p{N}])(?!\s+\p{Lu})/u, /\b[Ss]tår (?:under|efter|ovan|nedan)(?![\p{L}\p{N}])/u];
const omSidan = (m) => OM_SIDAN.some((r) => r.test(m));
// Metodens veckor i ord, som "vecka tre" och "andra veckan", som planen inte kan skriva som sina veckor. "En" och "ett"
// räknas inte, eftersom "varje vecka en stund" inte är en vecka.
const VECKOR_I_ORD = new RegExp(String.raw`(?<![\p{L}\p{N}])(?:(?:vecka|veckorna)\s+(?:${talIRegex(2, 12, false)})|(?:${ORDNINGSTAL.slice(1).join('|')})\s+veckan)(?![\p{L}\p{N}])`, 'iu');

/**
 * Felen i metodens texter som planen visar (sajtens K-515): passets tider i planens text i stället för i metodens
 * tidsschema, en mening om metodens sida i tidsschemats inledning, en mening i plan.utan som inte finns, och i en stege
 * metodens veckor i ord. Passets tider i tidsschemats egen text stoppas av tidsschematsFel, för alla metoder.
 * @param {MetodensTexter & { tid?: string }} d
 * @returns {string[]}
 */
export function planensRamFel(d) {
  const fel = [];
  for (const p of d.plan?.passen ?? []) if (p.ur && !rollensRad(d, p.ur)) fel.push(`Planens pass "${p.nar}" hämtar sin text ur tabellen "${p.ur.tabell}", raden "${p.ur.rad}"${p.ur.kolumner ? ` och kolumnerna ${p.ur.kolumner.join(', ')}` : ''}, som metoden inte har. Skriv tabellens rubrik, radens första ord och kolumnerna som de står i metoden.`);
  for (const p of d.plan?.passen ?? []) if (p.text && tiderILoptext(p.text)) fel.push(`Planens pass "${p.nar}" säger passets tider. Tiderna står i metodens tidsschema, och tider som gäller vissa veckor som en variant (tidsschema.varianter), så att metodens sida, Word och planen läser samma rot (METODER.md under Tidsschemats varianter).`);
  const meningar = meningarna(d.tidsschema?.text);
  for (const u of d.plan?.utan ?? []) if (!meningar.includes(u.trim())) fel.push(`plan.utan nämner "${u}", som inte är en mening i tidsschemats text. Skriv meningen som den står där, eller ta bort den ur plan.utan.`);
  for (const m of meningarna(planensInledning(d.tidsschema?.text, d.plan?.utan))) if (omSidan(m)) fel.push(`Tidsschemats text säger "${m}", som gäller metodens sida och inte går att läsa i planen. Lägg meningen i plan.utan.`);
  if (d.plan?.stege) for (const t of visadeTexter(d)) {
    const m = t.match(VECKOR_I_ORD);
    if (m) fel.push(`I en stege skriver planen metodens veckor som sina, och då står veckan med siffror: "${m[0]}" i "${postensRad(t, 80)}". Skriv veckan som vecka 1 eller vecka 2–3.`);
  }
  return fel;
}

/**
 * En rad i en av metodens tabeller som en roll i planen hämtar sin text ur (plan.passen med ur, sajtens K-520): tabellen
 * med rubriken, raden vars första cell börjar med rad, och cellerna i kolumnerna, utom den första, med kolumnens namn. En
 * tabell med en enda kolumn efter den första ger cellen utan namn. Så visar planen metodens egen rad, och en ändring i
 * tabellen följer med.
 * @param {MetodensTexter} d
 * @param {{ tabell: string, rad: string, kolumner?: string[] }} ur
 * @returns {{ kolumn: string, text: string }[] | null} null när tabellen, raden eller en kolumn inte finns
 */
export function rollensRad(d, ur) {
  const t = (d.tabeller ?? []).find((x) => x.rubrik === ur.tabell);
  const r = t?.rader?.find((x) => String(x[0]).split('\n')[0].trim() === ur.rad);
  if (!t || !r) return null;
  const valda = ur.kolumner ?? t.kolumner.slice(1);
  if (valda.some((k) => t.kolumner.indexOf(k) < 1)) return null;
  return valda.map((k) => ({ kolumn: t.kolumner.length === 2 ? '' : k, text: String(r[t.kolumner.indexOf(k)] ?? '').trim() })).filter((x) => x.text);
}
// Text som jämförs ordagrant: utan ordfogar och med ett blanksteg mellan orden.
const ordagrant = (s) => String(s).replace(/\u2060/g, '').replace(/\s+/g, ' ').trim();
/**
 * Planens egna texter citerar metoden (sajtens K-521; Niclas 2026-10-25: "att saker tas alltid från en rot och att den är
 * 1-1 med metodens kort"): varje mening i plan.passen, plan.fore, plan.justera och plan.upprepa står ordagrant i metodens
 * egna texter, de som metodens sida visar, så att planen aldrig skriver om metoden och en ändring i metoden stoppar bygget
 * i stället för att glida isär. Lathunden och planens fält räknas inte som metodens texter.
 * @param {MetodensTexter & Record<string, unknown>} d
 * @returns {string[]}
 */
export function planensCitatFel(d) {
  // Hela meningar, så att en mening som har tappat sitt villkor inte går igenom som en del av metodens (Codex 2026-10-25:
  // "Byt till en lättare bok." ur "Byt till en lättare bok när det blir många fel.").
  const kalla = new Set(allaTexter({ ...d, plan: undefined, lathund: undefined }).flatMap((t) => meningarna(t)).map((m) => ordagrant(utanPunkt(m))));
  return planensTexter({ plan: d.plan })
    .filter(([plats]) => plats.startsWith('Planens'))
    .flatMap(([plats, t]) => meningarna(t).filter((m) => !kalla.has(ordagrant(utanPunkt(m)))).map((m) => `${plats} säger "${m}", som inte står så i metoden. Planen citerar metoden ordagrant, så att den är 1–1 med metodens sida: skriv meningen som den står i metoden, eller hämta rollens text ur en tabellrad med ur (METODER.md under Fälten i metodens fil).`));
}

/** Felen som stoppar en metod som ska kunna planeras: planmotorns, texternas i planen och citatens. @param {Parameters<typeof metodplan>[0] & MetodensTexter} d */
export const planFel = (d) => [...metodplan(d).fel, ...planensRamFel(d), ...planensCitatFel(d)];

// ---------- Modulen ----------

/**
 * Modulens namn och version, på ett ställe (Niclas 2026-10-24: "en kort disclaimer att modulen heter Planera och modulens
 * versionsnr (skapa en struktur för modellnr). Kalla den 0.1"). Första siffran är 0 så länge Planera är en beta, märkt där
 * läraren går in och planerar; den andra ökar med en ny förmåga, en tredje när ett fel lagas. Versionerna står i sajtens
 * METODER.md under Planera insatsen.
 */
export const PLANERA = Object.freeze({ namn: 'Planera', version: '0.2.10', beta: true });

// Filnamnen på det som laddas ner ur planen, lika för alla metoder (sajtens K-519; Niclas 2026-10-25: "Kan du standardisera
// dess namn? Alltså elevens namn, metod och datum som placeholders för den. Annars heter alla sammanställningar samma"):
// vad filen är, vem den gäller, metoden och dagens datum. Filens slag ger ändelsen, och planen som fil heter plan, som
// knappen Ladda ner planen (buggjakten och användbarhetsprovet 2026-10-25: "planera-…json" kändes inte igen bland filerna).
const FILERNA = Object.freeze({ sammanstallning: 'pdf', plan: 'json', kalender: 'ics' });
// Knapparna för att spara planen och ta den till en annan dator, lika på planens sida och i raden om appen Stöd (Niclas
// 2026-10-25: "om det ska heta 'Ladda ner planen' och 'Ladda upp planen' eller om det finns bättre ord"). Filen läses i
// webbläsaren och skickas aldrig någonstans, så knappen som läser den heter Öppna och inte Ladda upp: elevernas namn lämnar
// aldrig telefonen eller datorn.
export const PLANKNAPPAR = Object.freeze({ spara: 'Spara planen', laddaNer: 'Ladda ner planen', oppna: 'Öppna en nedladdad plan' });
// En del av ett filnamn: bokstäverna, också å, ä och ö, och siffrorna som de är skrivna, och bindestreck i stället för
// allt annat, så att Åsa och Asa får olika namn (Codex 2026-10-25).
const filnamnsdel = (s) => String(s ?? '').normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
/**
 * Ett filnamn för det som laddas ner ur planen: "sammanstallning-Ali-textsamtal-i-grupp-2026-10-25.pdf" för en elev,
 * "sammanstallning-gruppen-Läsgrupp-2B-textsamtal-i-grupp-2026-10-25.pdf" för gruppen, "plan-Läsgrupp-2B-…-2026-10-25.json"
 * för planen som fil och "kalender-Läsgrupp-2B-…-2026-10-25.ics". Namnen står som de är skrivna, med bindestreck mellan orden,
 * och det som saknas, som gruppens namn, hoppas över.
 * @param {keyof typeof FILERNA} slag
 * @param {{ vem?: string, grupp?: boolean, metod: string, datum: string }} o grupp: gruppens sammanställning, med ordet gruppen
 */
export const filnamnet = (slag, o) => `${[slag, o.grupp ? 'gruppen' : '', o.vem ?? '', o.metod, o.datum].map(filnamnsdel).filter(Boolean).join('-')}.${FILERNA[slag]}`;

// ---------- Planen ----------

const FORVALDA_DAGAR = { 1: [3], 2: [2, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] };

/**
 * Planens längd som förval: så många veckor att gruppen når progressionens sista steg när det ryms i metodens period, som
 * sju veckor för sju läslistor i en period på sex till åtta veckor (de kalla testarna 2026-10-24: sex veckor nådde inte
 * Läslista 6), och annars den kortaste perioden. Ett steg vid behov och det som kommer efter insatsen räknas inte. En plan
 * som börjar på ett senare steg (borja) får de steg som är kvar.
 * @param {Metodplan} mp
 * @param {number} [borja]
 */
export function forvaldLangd(mp, borja = 1) {
  if (mp.stegEnhet !== 'veckor' || mp.period.enhet !== 'veckor' || !mp.steg.length) return mp.period.min;
  const sista = Math.max(0, ...mp.steg.filter((s) => !s.vidBehov && !s.efter).map((s) => s.fran));
  if (borja > 1) return Math.max(1, sista - borja + 1);
  return sista >= mp.period.min && (mp.period.max === undefined || sista <= mp.period.max) ? sista : mp.period.min;
}

/**
 * Planens förval: första passet nästa måndag, metodens minsta antal pass i veckan på jämnt fördelade dagar, och längden
 * som når progressionens sista steg (forvaldLangd).
 * @param {Metodplan} mp
 * @param {string} idag
 * @returns {Val}
 */
export function forval(mp, idag) {
  const ganger = Math.min(5, Math.max(1, mp.takt.min));
  return { start: plusDagar(mandagen(idag), 7), dagar: FORVALDA_DAGAR[ganger], langd: forvaldLangd(mp), lov: [], upprepa: [], flytta: {}, stryk: [] };
}

/**
 * Dagarna som gällde före ett byte av dagar mitt i insatsen (sajtens K-546): för varje byte bytets dag, dagarna före den
 * och de fasta passen, passens dag och nummer som bytet sparade när det gjordes, i datumordning. Ett byte utan dagar eller
 * med ett datum som inte går att läsa tas bort.
 * @param {unknown} fore
 * @returns {{ till: string, dagar: number[], fasta?: Record<string, number> }[]}
 */
export function rentaFore(fore) {
  const veckodagar = (x) => [...new Set(Array.isArray(x) ? x.map(Number) : [])].filter((d) => Number.isInteger(d) && d >= 1 && d <= 5).sort();
  /** @type {Map<string, { till: string, dagar: number[], fasta?: Record<string, number> }>} */
  const ut = new Map();
  for (const f of Array.isArray(fore) ? fore : []) {
    const dagar = veckodagar(f?.dagar);
    const fasta = Object.fromEntries(Object.entries(f?.fasta && typeof f.fasta === 'object' ? f.fasta : {}).filter(([d, nr]) => arDatum(d) && Number.isInteger(nr) && nr >= 1 && nr <= 999).sort(([a], [b]) => (a < b ? -1 : 1)));
    if (arDatum(f?.till) && dagar.length && !ut.has(f.till)) ut.set(f.till, { till: f.till, dagar, ...(Object.keys(fasta).length ? { fasta } : {}) });
  }
  return [...ut.values()].sort((a, b) => (a.till < b.till ? -1 : 1));
}
/**
 * Om en veckodag är en passdag ett visst datum. Ändrar läraren dagarna när insatsen har börjat gäller de nya dagarna från
 * bytets dag, och passen före står kvar på sina dagar med det som förts in. På bytets dag gäller dagarna före och efter, så
 * att dagens pass står kvar och en ny dag kan börja samma dag, och ett pass som bytet har sparat som fast finns alltid
 * (planera). (Sajtens K-546; verifieringen 2026-10-25: ett byte av dagar räknade om passen som redan var hållna, och bocken
 * och frånvaron syntes inte längre.)
 * @param {Val} val
 * @returns {(datum: string, dag: number) => boolean}
 */
export function passdagar(val) {
  const fore = rentaFore(val.fore);
  const nu = [...new Set(val.dagar)];
  const flytta = val.flytta ?? {};
  const pa = (datum, dag) => {
    for (let i = 0; i < fore.length; i++) {
      if (datum < fore[i].till) return fore[i].dagar.includes(dag);
      if (datum === fore[i].till) return fore[i].dagar.includes(dag) || (fore[i + 1]?.dagar ?? nu).includes(dag);
    }
    return nu.includes(dag);
  };
  // Ett pass som har flyttats till en tidigare dag finns när dagarna gällde den dagen, så att ett pass som hölls före sin
  // dag inte faller bort när dagarna byts efteråt. Ett pass som har flyttats till en senare dag följer sin egen dag, så att
  // det inte kommer tillbaka när en dag läggs till igen (Codex 2026-10-25).
  return (datum, dag) => pa(datum, dag) || (arDatum(flytta[datum]) && flytta[datum] < datum && pa(flytta[datum], dag));
}
/**
 * De fasta passen ur alla byten av dagar, passets dag och nummer, ett senare byte före ett tidigare. Ett fast pass finns
 * alltid och behåller sitt nummer och sitt innehåll, och de andra passen numreras runt det (sajtens K-546; Codex
 * 2026-10-25: ett hållet pass som hade flyttats fick ett annat nummer och innehåll när en ny dag kom före det, och en
 * senare flytt skrev om historiken när den räknades om).
 * @param {Val} val
 * @returns {Map<string, number>}
 */
const fastaNummer = (val) => new Map(rentaFore(val.fore).flatMap((f) => Object.entries(f.fasta ?? {})));
/**
 * Nya dagar för planen, som valets enda väg att byta dagar. Med ett datum gäller de nya dagarna från det datumet, och
 * dagarna före står kvar i val.fore; ett byte samma dag ändrar det bytet, och tillbaka till dagarna före tar bort det.
 * Utan datum, före första passet, byts hela planens dagar. En dags tid står kvar så länge dagen är en passdag före ett
 * byte, så att passen som har varit behåller sina klockslag (sajtens K-546). Med planen före ändringen sparar bytet de
 * fasta passen: ett flyttat pass som har hållits, och ett pass i dag som annars skulle falla bort, med sina nummer, så att
 * de står kvar med det som förts in och inget som händer senare skriver om dem (Codex 2026-10-25).
 * @param {Val} val
 * @param {number[]} dagar
 * @param {string} [fran] datumet de nya dagarna gäller från
 * @param {{ pass: Pass[] }} [plan] planen före ändringen
 * @returns {Val}
 */
export function bytDagar(val, dagar, fran, plan) {
  const nya = [...new Set(dagar)].filter((x) => Number.isInteger(x) && x >= 1 && x <= 5).sort();
  /** @type {{ till: string, dagar: number[], fasta?: Record<string, number> }[]} */
  const fore = rentaFore(val.fore);
  let e = fran ? fore.find((f) => f.till === fran) : undefined;
  if (fran && !e) { e = { till: fran, dagar: [...new Set(val.dagar)].sort() }; fore.push(e); }
  if (e && fran && plan) {
    const eDagar = e.dagar;
    // Fast blir det som annars kan falla bort eller byta nummer: ett flyttat pass som har hållits men ligger på eller efter
    // bytets dag, och ett pass i dag vars dag inte gäller före eller efter ändringen. Ett pass före bytets dag på sin egen dag
    // står kvar ändå, så det sparas inte, och historiken växer inte med varje byte (Codex 2026-10-25).
    const flyttatHallet = (p) => !!p.flyttatFran && p.flyttatFran >= fran && p.datum <= fran;
    const iDag = (p) => p.datum === fran && !eDagar.includes(veckodag(passetsDag(p))) && !nya.includes(veckodag(passetsDag(p)));
    const fasta = plan.pass.filter((p) => flyttatHallet(p) || iDag(p));
    if (fasta.length) e.fasta = Object.fromEntries(fasta.map((p) => [passetsDag(p), p.nr])); else delete e.fasta;
  }
  // Bytet tas bort när dagarna är tillbaka som före det och inget pass i dag finns bara genom det.
  const kvar = rentaFore(fore.filter((f) => f !== e || f.dagar.join() !== nya.join() || !!f.fasta));
  const anvanda = new Set([...nya, ...kvar.flatMap((f) => [...f.dagar, ...Object.keys(f.fasta ?? {}).map(veckodag)])].map(String));
  const tider = Object.fromEntries(Object.entries(rentaTider(val.tider)).filter(([d]) => anvanda.has(d)));
  const { fore: _fore, tider: _tider, ...ovrigt } = val;
  return { ...ovrigt, dagar: nya, ...(Object.keys(tider).length ? { tider } : {}), ...(kvar.length ? { fore: kvar } : {}) };
}

/**
 * Planens första måndag: veckan som startdatumet ligger i, eller nästa vecka när ingen av de valda dagarna är kvar den
 * veckan, som när planen börjar på en lördag (buggjakten 2026-10-24: en start på lördag gav en tom första vecka som tog
 * metodens vecka 1).
 * @param {Val} val
 */
export function forstaMandagen(val) {
  const m = mandagen(val.start);
  if (!val.dagar.length) return m;
  // Passdagarna, också före och på ett byte av dagar och dit ett pass har flyttats (Codex 2026-10-25: ett byte på startdagen
  // tappade första veckan).
  const arPassdag = passdagar(val);
  return [1, 2, 3, 4, 5].some((d) => plusDagar(m, d - 1) >= val.start && arPassdag(plusDagar(m, d - 1), d)) ? m : plusDagar(m, 7);
}

/**
 * Passen, veckorna och uppföljningen med datum. Veckorna i planen är metodens veckor i den ordning gruppen tar dem: en
 * vecka som upprepas kommer en gång till direkt efter sig själv, och en lovvecka hoppas över. Ett pass på en dag då
 * skolan är stängd eller som läraren har ställt in faller bort och står kvar som bortfall i sin vecka. Ett flyttat pass
 * behåller sitt nummer och sitt innehåll. Är metodens period räknad i pass, planeras så många pass. En progression som
 * är en stege, som läslistorna, kan börja på ett senare steg (val.borja): planens första vecka är då metodens vecka borja.
 * @param {Metodplan} mp
 * @param {Val} val
 * @returns {Plan}
 */
export function planera(mp, val) {
  // Veckodagarna som någon gång är passdagar, också före ett byte av dagar, och de som gäller varje datum (passdagar).
  const dagar = [...new Set([...val.dagar, ...rentaFore(val.fore).flatMap((f) => [...f.dagar, ...Object.keys(f.fasta ?? {}).map(veckodag)])])].filter((x) => x >= 1 && x <= 5).sort();
  const arPassdag = passdagar(val);
  const lov = new Set(val.lov ?? []);
  const stryk = new Set(val.stryk ?? []);
  const flytta = val.flytta ?? {};
  const iPass = mp.period.enhet === 'pass';
  const langd = Math.max(1, Math.round(val.langd));
  const borja = !iPass && mp.stegEnhet === 'veckor' && Number.isInteger(val.borja) && /** @type {number} */ (val.borja) > 1 ? /** @type {number} */ (val.borja) : 1;
  // Veckornas ordning: metodens veckor från den första, varje upprepning direkt efter veckan den upprepar.
  /** @type {{ innehall: number, igen: boolean }[]} */
  const ordning = [];
  if (!iPass) {
    const upprepa = (val.upprepa ?? []).filter((x) => x >= borja && x < borja + langd);
    for (let c = borja; c < borja + langd; c++) {
      ordning.push({ innehall: c, igen: false });
      for (const x of upprepa) if (x === c) ordning.push({ innehall: c, igen: true });
    }
  }
  /** @type {PlanVecka[]} */
  const veckor = [];
  /** @type {Pass[]} */
  const pass = [];
  /** @type {string[]} */
  const lovveckor = [];
  let mandag = forstaMandagen(val);
  const nastaMandag = () => { while (lov.has(veckonyckel(mandag))) { lovveckor.push(mandag); mandag = plusDagar(mandag, 7); } const m = mandag; mandag = plusDagar(mandag, 7); return m; };
  // En insats som avslutas tidigare slutar med passet med numret val.slut: passen efter dess dag, i veckan och i veckorna
  // efter, finns inte i planen (Niclas 2026-10-25: "Avsluta insatsen denna vecka ... då skrivs alla sammaställningar om med
  // den vecka man avslutar den som sista", och samma kväll: "Avsluta onsdagen"). Slutet är ett pass och inte ett datum, så
  // att det följer med när en ny start eller ett lov flyttar passen (buggjakten samma kväll: en ny start flyttade slutet,
  // och planen krympte). Passets dag i planen utan slut är insatsens sista dag, så att ett flyttat pass står kvar eller
  // stryks efter sitt datum (Codex samma kväll: ett pass som flyttats till fredagen stod kvar efter onsdagens slut).
  const slut = Number.isInteger(val.slut) && /** @type {number} */ (val.slut) >= 1 ? /** @type {number} */ (val.slut) : null;
  const hel = slut ? planera(mp, { ...val, slut: undefined }) : null;
  const slutDag = hel?.pass.find((p) => p.nr === slut)?.datum;
  if (hel && !slutDag) return hel;
  // Nästa vecka som inte är lov, utan att gå vidare.
  const kommande = () => { let m = mandag; while (lov.has(veckonyckel(m))) m = plusDagar(m, 7); return m; };
  // Passens nummer räknas som i planen utan slut, också för ett pass som stryks, så att ett pass behåller sitt nummer och sitt
  // innehåll när ett flyttat pass före det stryks (Codex 2026-10-25: onsdagens pass 5, Chatten, blev pass 4, Vinsten). Då
  // kan numren ha en lucka, och ett pass slås upp på sitt nummer, aldrig på sin plats i listan (passetMedNr).
  // Passens nummer: de fasta behåller sina (fastaNummer), och de andra får numren i tur och ordning utan dem.
  // Ett fast pass som har ställts in, ligger före starten eller i en lovvecka finns inte, och tar varken en plats eller ett
  // nummer (Codex 2026-10-25).
  const fasta = new Map([...fastaNummer(val)].filter(([d]) => d >= val.start && !stryk.has(d) && !helgdag(d) && !lov.has(veckonyckel(d))));
  const tagna = new Set(fasta.values());
  let nasta = 1;
  const nyttNummer = () => { while (tagna.has(nasta)) nasta += 1; return nasta++; };
  // I en period i pass räknas de fasta passen först, och nya pass fyller platserna som är kvar (Codex 2026-10-25).
  const nyaPlatser = langd - fasta.size;
  let nyaAntal = 0, fastaKvar = fasta.size;
  // Spärren mot en plan utan slut: en period i pass där inga dagar ger pass.
  for (let i = 0; iPass ? (nyaAntal < nyaPlatser || fastaKvar > 0) && i < 104 : i < ordning.length; i++) {
    if (slutDag && veckor.length && kommande() > slutDag) break;
    const m = nastaMandag();
    const v = { nr: veckor.length + 1, innehall: iPass ? veckor.length + 1 : ordning[i].innehall, igen: iPass ? false : ordning[i].igen, mandag: m, vecka: isoVecka(m), pass: [], bortfall: [] };
    for (const dag of dagar) {
      const datum = plusDagar(m, dag - 1);
      const fast = fasta.get(datum);
      if (datum < val.start || (fast === undefined && !arPassdag(datum, dag))) continue;
      if (fast !== undefined) fastaKvar -= 1;
      else if (iPass && nyaAntal >= nyaPlatser) continue;
      const nytt = arDatum(flytta[datum]) ? flytta[datum] : undefined;
      const namn = helgdag(datum);
      if (namn) { if (!slutDag || datum <= slutDag) v.bortfall.push({ datum, varfor: 'helgdag', namn }); continue; }
      if (stryk.has(datum)) { if (!slutDag || datum <= slutDag) v.bortfall.push({ datum, varfor: 'installt' }); continue; }
      const nr = fast ?? nyttNummer();
      if (fast === undefined) nyaAntal += 1;
      if (slutDag && (nytt ?? datum) > slutDag) continue;
      const p = { nr, datum: nytt ?? datum, vecka: v.nr, ...(nytt ? { flyttatFran: datum } : {}) };
      pass.push(p);
      v.pass.push(p.nr);
    }
    if (iPass && !v.pass.length && !v.bortfall.length) continue;
    veckor.push(v);
  }
  // Det avslutet stryker, ur planen utan slut, så att sidan kan visa det överstruket. Ett slut som inte stryker något gäller
  // inte: en länk kan bära vilket nummer som helst.
  /** @type {{ pass: Pass[], veckor: PlanVecka[] } | undefined} */
  let struket;
  /** @type {number | undefined} */
  let planerade;
  if (hel && slutDag) {
    if (!pass.length || hel.pass.length <= pass.length) return hel;
    while (veckor.length > 1 && !veckor[veckor.length - 1].pass.length) veckor.pop();
    struket = { pass: hel.pass.filter((p) => p.datum > slutDag), veckor: hel.veckor.slice(veckor.length) };
    planerade = hel.pass.length;
  }
  // Första och sista passet efter datum: ett flyttat pass kan hamna före ett pass med lägre nummer (Codex 2026-10-24: det
  // sista passet flyttat till tisdagen avslutade insatsen före onsdagens pass).
  const iOrdning = iDatumordning(pass);
  const forsta = iOrdning[0], sista = iOrdning[iOrdning.length - 1];
  const forstaPass = forsta?.datum;
  const sistaPass = sista?.datum;
  // Efter insatsen: första veckan efter den sista som inte är lov. Är passen i planens sista veckor inställda räknas den
  // från veckan med det sista passet (Codex 2026-10-25: uppföljningen efter hamnade en vecka för sent).
  let efter = nastaMandag();
  if (sista) {
    let e = plusDagar(mandagen(sista.datum), 7);
    while (lov.has(veckonyckel(e))) e = plusDagar(e, 7);
    if (e < efter) efter = e;
  }
  // Före första passet: skolveckan före planens första vecka, förbi lovveckor (de kalla testarna 2026-10-24: kartläggningen
  // och mötet med hemmen stod på första passets dag). overLov säger att veckan före var lov.
  let foreMandag = plusDagar(veckor[0]?.mandag ?? forstaMandagen(val), -7);
  let overLov = false;
  for (let i = 0; i < 53 && lov.has(veckonyckel(foreMandag)); i++) { foreMandag = plusDagar(foreMandag, -7); overLov = true; }
  // Varje pass hör till ett steg i progressionen: efter veckans plats i metoden, eller passets nummer. Det som kommer efter
  // insatsen tar ingen vecka.
  const stegFor = (nr) => mp.steg.find((s) => !s.efter && nr >= s.fran && (s.till === undefined || nr <= s.till));
  for (const v of veckor) v.steg = mp.stegEnhet === 'veckor' ? stegFor(v.innehall)?.rad ?? null : null;
  for (const p of pass) p.steg = mp.stegEnhet === 'pass' ? stegFor(p.nr)?.rad ?? null : veckor[p.vecka - 1].steg;
  const sistaIVeckan = (v) => veckansDagar({ pass }, v).till;
  const uppfoljning = mp.uppfoljning.map(({ rad, tid }) => {
    /** @type {{ datum: string, vecka: number | null }[]} */
    let tillfallen = [];
    // Före insatsen står i veckan före, med vecka 0: före planens första vecka.
    if (tid.typ === 'fore' && forsta) tillfallen = [{ datum: foreMandag, vecka: 0 }];
    // Efter: veckan efter sista passet; efter N veckor: veckan med dagen N veckor efter sista passet (buggjägarna
    // 2026-10-25: fyra veckor efter räknades från veckan efter och blev fem).
    else if (tid.typ === 'efter') tillfallen = [{ datum: tid.veckor && sista ? mandagen(plusDagar(sista.datum, tid.veckor * 7)) : plusDagar(efter, tid.veckor * 7), vecka: null }];
    else if (tid.typ === 'intervall') tillfallen = veckor.filter((v) => v.nr % tid.var === 0).map((v) => ({ datum: sistaIVeckan(v), vecka: v.nr }));
    else if (tid.typ === 'vecka') tillfallen = tid.veckor.flatMap((n) => { const v = [...veckor].reverse().find((x) => x.innehall === n); return v ? [{ datum: sistaIVeckan(v), vecka: v.nr }] : []; });
    else if (tid.typ === 'sista-veckan' && veckor.length) { const v = veckor[veckor.length - 1]; tillfallen = [{ datum: sistaIVeckan(v), vecka: v.nr }]; }
    else if (tid.typ === 'pass') tillfallen = tid.pass.flatMap((n) => { const p = pass.find((x) => x.nr === n); return p ? [{ datum: p.datum, vecka: p.vecka }] : []; });
    else if (tid.typ === 'sista-passet' && sista) tillfallen = [{ datum: sista.datum, vecka: sista.vecka }];
    return { rad, typ: tid.typ, tillfallen };
  });
  const efterSteg = mp.steg.find((s) => s.efter)?.rad;
  return {
    start: val.start, enhet: iPass ? 'pass' : 'veckor', borja, forstaPass, sistaPass, sistaNr: sista?.nr, efter, pass, veckor, lovveckor, uppfoljning,
    fore: { mandag: foreMandag, overLov }, ...(efterSteg !== undefined ? { efterSteg } : {}), ...(val.mitt ? { mitt: val.mitt } : {}),
    // Passen planen hade före avslutet, så att texterna kan säga hur mycket tidigare insatsen slutade, och det som ströks.
    ...(slut ? { slut, planerade, struket } : {}),
  };
}

/**
 * Valen efter en förlängning med n veckor efter insatsen. Avstämningen står kvar i sin vecka (`mitt`). En insats som
 * avslutades tidigare förlängs genom planens egna veckor, med upprepningarna, så att de strukna veckorna kommer tillbaka i
 * sin ordning först, och planen blir längre först när de är slut (K-542; Codex 2026-10-25: en vecka gav två med en
 * upprepning). I en progression i pass är en vecka planens dagar.
 * @param {Metodplan} mp
 * @param {Val} val
 * @param {number} n
 * @returns {Val}
 */
export function forlangdaVal(mp, val, n) {
  const steg = (x) => (mp.period.enhet === 'pass' ? x * val.dagar.length : x);
  const plan = planera(mp, val);
  const mitt = val.mitt ?? mittVeckan(plan) ?? undefined;
  const ut = { ...val, ...(mitt ? { mitt } : {}) };
  if (!val.slut) return { ...ut, langd: val.langd + steg(n) };
  const hel = planera(mp, { ...val, slut: undefined });
  const mal = plan.veckor.length + n;
  // Planen slutar då med hela veckan, också passen efter avslutet i den vecka där insatsen slutade.
  const sista = iDatumordning(hel.pass.filter((p) => p.vecka <= mal)).pop()?.nr;
  if (mal < hel.veckor.length && sista) return { ...ut, slut: sista };
  const { slut, ...utanSlut } = ut;
  return { ...utanSlut, langd: val.langd + steg(mal - hel.veckor.length) };
}

/**
 * En insats som avslutades före planens slut, i en mening, lika i sammanställningen, pdf:erna, elevens rad och texten till
 * åtgärdsprogrammet (Niclas 2026-10-25: "Insatsen avslutades v. Anledning var att ..."): veckan i planen med
 * kalenderveckan, och hur många av de planerade passen som hann bli. I nutid medan insatsen pågår, "avslutas", och sedan i
 * dåtid. Tom när planen går till sitt slut.
 * @param {Plan} plan
 * @param {boolean} [pagar] insatsen pågår, den är inte avslutad (insatsenAvslutad)
 */
export function avslutetText(plan, pagar = false) {
  if (!plan.slut || !plan.planerade || !plan.veckor.length) return '';
  const v = plan.veckor[plan.veckor.length - 1];
  return `Insatsen ${pagar ? 'avslutas' : 'avslutades'} i ${planveckansNamn(plan, v).text}, efter ${plan.pass.length} av ${plan.planerade} planerade pass.`;
}
/**
 * Utvärderingen efter insatsen, lika på sidan, i pdf:erna och i texterna som kopieras: när insatsen avslutades tidigare
 * avslutet med lärarens anledning, som är utvärderingens mening med beslutet Avsluta insatsen, och annars beslutet och
 * meningen. Tom när inget är valt eller skrivet.
 * @param {Plan} plan
 * @param {{ beslut?: string, not?: string } | null | undefined} u
 * @param {boolean} [pagar] insatsen pågår, sista passet har inte varit
 */
export function utvarderingenText(plan, u, pagar = false) {
  const beslutet = u?.beslut || u?.not ? beslutText(u) : '';
  const avslut = avslutetText(plan, pagar);
  if (!avslut) return beslutet;
  return [avslut, u?.beslut === 'avsluta' ? (u.not ? `Anledning: ${mening(stor(utanPunkt(u.not)))}` : '') : beslutet].filter(Boolean).join(' ');
}

/**
 * Veckans nummer i planen, som veckans rubrik: metodens vecka, räknad från veckan planen börjar på. En plan som börjar på
 * Läslista 2 har den listan i sin vecka 1.
 * @param {Plan} plan
 * @param {PlanVecka} v
 */
export const planvecka = (plan, v) => v.innehall - ((plan.borja ?? 1) - 1);
/**
 * Ordningen efter datum, och efter numret när två har samma datum, som passen efter att ett har flyttats.
 * @param {{ datum: string, nr?: number }} a
 * @param {{ datum: string, nr?: number }} b
 */
export const efterDatum = (a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : (a.nr ?? 0) - (b.nr ?? 0));
/** En kopia i datumordning. @template {{ datum: string, nr?: number }} T @param {T[]} lista @returns {T[]} */
export const iDatumordning = (lista) => [...lista].sort(efterDatum);
/** Veckans pass, i veckans ordning. @param {{ pass: Pass[] }} plan @param {PlanVecka} v */
export const veckansPass = (plan, v) => v.pass.map((n) => passetMedNr(plan, n)).filter(Boolean);
/**
 * Passet med ett nummer, eller inget. Numren kan ha en lucka i en plan som avslutas tidigare, så ett pass slås aldrig upp på
 * sin plats i listan (Codex 2026-10-25).
 * @param {{ pass: Pass[] }} plan
 * @param {number} nr
 */
export const passetMedNr = (plan, nr) => plan.pass.find((p) => p.nr === nr);
/** Det högsta passnumret, till "pass 6 av 8", som är antalet pass när numren inte har någon lucka. @param {{ pass: Pass[] }} plan */
export const hogstaPassnr = (plan) => Math.max(0, ...plan.pass.map((p) => p.nr));

// ---------- Veckornas namn ----------
// Veckornas namn står här och bara här (sajtens K-508; Niclas 2026-10-25: "Sammanställning ska ju matcha veckor i planen
// bara på ett smidigt sätt utan drift", och "se till att utskrifter och allt plockar från samma ställe"): vecka 6 är alltid
// veckan i planen, som i planens lista och veckans rubrik, och v. 50 alltid veckans nummer i kalendern. Sidan, diagrammen,
// pdf:erna och texterna som kopieras hämtar namnen här, och sajtens planprov stannar på en vecka som skrivs ut på annat sätt.

/** Veckans nummer i kalendern: "v. 50". */
export const kalendervecka = (n) => `v. ${n}`;
/** Kalenderveckan för en skärmläsare, där förkortningen läses fel: "kalendervecka 50". */
export const kalenderveckaUtskriven = (n) => `kalendervecka ${n}`;
/** Ett spann av kalenderveckor: "v. 45", "v. 45–46" och över nyår "v. 52 till v. 1", så att ett spann bakåt inte ser ut som ett fel. */
export const kalenderveckor = (a, b, streck = '–') => (b === a ? kalendervecka(a) : b < a || streck !== '–' ? `${kalendervecka(a)} till ${kalendervecka(b)}` : `${kalendervecka(a)}–${b}`);
/**
 * Kalenderveckorna för några datum: veckor i följd står ihop, och en vecka utan datum, som ett lov, bryter följden:
 * "v. 45 och v. 47", "v. 45–47" (buggjakten 2026-10-25: texten till åtgärdsprogrammet sa "v. 45–47" om ett steg före och
 * efter ett lov i v. 46).
 * @param {string[]} datum
 */
export function kalenderveckornaFor(datum) {
  /** @type {string[][]} */
  const foljder = [];
  for (const m of [...new Set(datum.map(mandagen))].sort()) {
    const f = foljder[foljder.length - 1];
    if (f && plusDagar(f[f.length - 1], 7) === m) f.push(m);
    else foljder.push([m]);
  }
  return uppraknat(foljder.map((f) => kalenderveckor(isoVecka(f[0]).vecka, isoVecka(f[f.length - 1]).vecka)));
}
// Vilken gång i ord: "igen" och "en tredje gång", ur standardens ordningstal (text.js).
const gangenText = (gang) => (gang === 1 ? 'igen' : ORDNINGSTAL[gang + 1] ? `en ${ORDNINGSTAL[gang + 1]} gång` : `för ${gang + 1}:e gången`);
/**
 * Vilken gång veckan tas: 0 första gången, 1 igen och 2 en tredje gång.
 * @param {Plan} plan
 * @param {PlanVecka} v
 */
export const gangen = (plan, v) => (v.igen ? plan.veckor.filter((x) => x.innehall === v.innehall && x.nr <= v.nr).length - 1 : 0);
/** Veckan i planen: "6", "3 igen" och "3 en tredje gång". */
export const planveckan = (innehall, gang = 0) => `${innehall}${gang ? ` ${gangenText(gang)}` : ''}`;
/** Metodens vecka, som skiljer sig från veckan i planen när en stege börjar högre upp: "vecka 3 i metoden". */
export const metodveckan = (innehall) => `vecka ${innehall} i metoden`;
// Metodens veckor i en text: ordet vecka eller veckorna med ett nummer, ett spann eller en lista, "vecka 4", "Vecka 1–3" och
// "vecka 1 och 4", och "från" före när det står där.
const VECKOR_I_TEXT = new RegExp(String.raw`(\b[Ff]rån\s+)?\b([Vv]ecka|[Vv]eckorna)\s+(\d+(?:${STRECK}\u2060?\d+)?(?:\s*(?:,|och)\s*\d+(?:${STRECK}\u2060?\d+)?)*)`, 'gu');
const VECKANS_LED = new RegExp(String.raw`(\d+)(?:(${STRECK}\u2060?)(\d+))?`, 'gu');
/**
 * Metodens veckor i en text ur metoden, skrivna som planens veckor (sajtens K-515: i en plan som börjar på Läslista 3 är
 * metodens vecka 3 planens vecka 1, men metodens texter sa "från vecka 4" och "Vecka 1–3 är passet bara listan"). Sidan,
 * kalendern och texterna som kopieras läser metodens texter genom den, så att en vecka heter likadant i hela planen. En plan
 * som börjar på metodens första vecka har samma nummer som metoden. I en plan som börjar högre upp blir varje vecka planens
 * (planvecka), ett spann kortas till veckorna i planen, "från vecka 2" före planens första vecka blir planens första, och en
 * hänvisning som bara gäller veckor före planen står kvar med "i metoden" efter, som metodveckan.
 * @param {string} text
 * @param {number} [borja] metodens vecka som är planens första (Plan.borja)
 */
export function veckornaIPlanen(text, borja = 1) {
  if (!(borja > 1)) return text;
  const iPlanen = (n) => n - (borja - 1);
  return String(text).replace(VECKOR_I_TEXT, (hel, fran, ord, lista) => {
    const led = [...lista.matchAll(VECKANS_LED)].map((m) => ({ a: Number(m[1]), b: Number(m[3] ?? m[1]), streck: m[2] ?? '' }));
    const kvar = led.flatMap((x) => {
      // "Från vecka 2" gäller också alla veckor efter.
      const b = fran && led.length === 1 && x.a === x.b ? Infinity : x.b;
      if (b < borja) return [];
      const a = iPlanen(Math.max(x.a, borja)), till = b === Infinity ? a : iPlanen(b);
      return [till > a ? `${a}${x.streck || '–'}${till}` : String(a)];
    });
    if (!kvar.length) return `${hel} i metoden`;
    const enVecka = kvar.length === 1 && /^\d+$/.test(kvar[0]);
    return `${fran ?? ''}${enVecka && /^[Vv]eckorna$/.test(ord) ? `${ord[0]}ecka` : ord} ${uppraknat(kvar)}`;
  });
}
/** Veckan i planen kort, till veckoremsan och diagrammen: talet, och "igen" eller "3:e" när veckan tas om. */
export const planveckanKort = (innehall, gang = 0) => ({ tal: String(innehall), om: !gang ? '' : gang === 1 ? 'igen' : `${gang + 1}:e` });
/**
 * En vecka med sina namn: veckan i planen, den korta formen till diagrammen, kalenderveckan, och veckan i en text,
 * "vecka 6 (v. 50)" och med stor bokstav först i en mening. Diagrammen har den korta formen och kalenderveckan på var sin rad.
 * @param {{ innehall: number, gang?: number, vecka: number }} v en vecka i sammanställningen
 */
export const veckansNamn = (v) => {
  const plan = planveckan(v.innehall, v.gang ?? 0), k = planveckanKort(v.innehall, v.gang ?? 0), kalender = kalendervecka(v.vecka);
  return { plan, kort: k.om ? `${k.tal} ${k.om}` : k.tal, kalender, text: `vecka ${plan} (${kalender})`, Text: `Vecka ${plan} (${kalender})` };
};
/**
 * Namnen för en vecka i planen.
 * @param {Plan} plan
 * @param {PlanVecka} v
 */
export const planveckansNamn = (plan, v) => veckansNamn({ innehall: planvecka(plan, v), gang: gangen(plan, v), vecka: v.vecka.vecka });

/**
 * Var ett pass står i planen, som en rad i planens `passen` och en variant av passet läser det, en rot för båda (riggens
 * omgång 1 2026-10-26: Högläsning i pars visning i veckans första pass har andra tider): passets nummer, om det är planens
 * sista eller näst sista pass, metodens vecka, platsen i veckan efter datum, så att ett flyttat pass har sin nya plats, om
 * det är veckans sista av minst två, och passets längd i minuter när den är känd.
 * @param {Plan} plan
 * @param {Pass} p
 * @param {number} [minuter]
 * @returns {PassetsLage}
 */
export function passetsLage(plan, p, minuter) {
  const v = plan.veckor[p.vecka - 1];
  const iVeckan = v ? iDatumordning(veckansPass(plan, v)) : [p];
  const plats = iVeckan.findIndex((x) => x.nr === p.nr) + 1;
  const nastSista = Math.max(0, ...plan.pass.map((x) => x.nr).filter((n) => n < (plan.sistaNr ?? 0)));
  return { nr: p.nr, sista: p.nr === plan.sistaNr, nastSista: nastSista > 0 && p.nr === nastSista, vecka: v?.innehall, plats, sistIVeckan: iVeckan.length > 1 && plats === iVeckan.length, ...(minuter !== undefined ? { minuter } : {}) };
}
/**
 * Gäller en rad i planens `passen` eller en variant av passet för ett pass? Raden och varianten läses med samma ord
 * (tolkaPassen och variantensNar), och en variant kan också gälla passets längd ("ett pass på tio minuter") eller en plats
 * i vissa veckor ("veckans första pass i vecka 2–5").
 * @param {PassensNar | VariantensNar} nar
 * @param {PassetsLage} lage
 */
export function passetTraffas(nar, lage) {
  if (nar.typ === 'minuter') return lage.minuter === nar.minuter;
  const iVeckorna = (s) => lage.vecka !== undefined && lage.vecka >= s.fran && lage.vecka <= s.till;
  if ('veckor' in nar && nar.veckor && !iVeckorna(nar.veckor)) return false;
  if (nar.typ === 'sista') return !!lage.sista;
  if (nar.typ === 'nastSista') return !!lage.nastSista;
  if (nar.typ === 'pass') return lage.nr !== undefined && lage.nr >= nar.fran && (nar.till === undefined || lage.nr <= nar.till);
  if (nar.typ === 'veckor') return iVeckorna(nar);
  if (nar.plats === 'sista') return !!lage.sistIVeckan;
  if (nar.plats === 'ovriga') return (lage.plats ?? 0) > 1 && !lage.sistIVeckan;
  return lage.plats === nar.plats;
}
/**
 * Hur bestämt ett när är, det mest bestämda först: sista passet, ett pass med eget nummer, det näst sista passet, ett spann
 * av pass, metodens veckor, en plats i vissa veckor, platsen i veckan och sist passets längd. Sista passet går före ett eget
 * nummer, så att en insats som avslutas tidigare slutar med metodens sista pass (Codex 2026-10-25: Seriesamtal slutade med
 * Lunchen i stället för passet som avslutar perioden), och första passet före det näst sista i en plan med två pass.
 * @param {PassensNar | VariantensNar} t
 */
export const narensVikt = (t) => (t.typ === 'sista' ? -1 : t.typ === 'pass' && t.till === t.fran ? 0 : t.typ === 'nastSista' ? 0.5 : t.typ === 'pass' ? 1 : t.typ === 'veckor' ? 2 : t.typ === 'minuter' ? 4 : 'veckor' in t && t.veckor ? 2.5 : 3);
/**
 * Raderna i planens `passen` som gäller ett pass, den mest bestämda först (narensVikt). Platsen i veckan räknas efter
 * datum, och veckans sista är det sista av minst två (passetsLage).
 * @param {Plan} plan
 * @param {Pass} p
 * @param {Metodplan['passen']} passen
 * @returns {number[]} radernas nummer i metodens passen
 */
export function passetsRoller(plan, p, passen) {
  const lage = passetsLage(plan, p);
  return (passen ?? []).filter((x) => passetTraffas(x.nar, lage)).sort((a, b) => narensVikt(a.nar) - narensVikt(b.nar) || a.rad - b.rad).map((x) => x.rad);
}

// ---------- Passet ----------
// Passet är metodens tidsschema, och de veckor då passet har andra delar eller tider står de som en variant i tidsschemat
// (sajtens K-515; Niclas 2026-10-25: "Kan det inte hämtas får du skapa en standard och en rot för en sak eller egenskap som
// sedan används av metoden som rot och för modulen som rot", och "se till att det blir enhetlig och inte handgrepp").
// Metodens sida och Word skriver varianten med variantensMening, lathunden och lektionskortet säger samma mening
// (varianternasFel), och planen och kalendern visar passet de veckorna med variantens delar (passetsBeskrivning).

/** En dels tid utan "min", som i passets rader och kalendern: "0–3". @param {string} tid */
export const delensTid = (tid) => tid.replace(/\u2060/g, '').replace(/\s*min$/, '');
/**
 * En variant som metodens sida, Word, lathunden och lektionskortet skriver den: "Vecka 1–3: passet är bara listan, med
 * modellering 0–3 minuter, körläsning 3–6, parläsning 6–14 och avslutning 14–15." En variant för passets längd ändrar bara
 * tiderna, så de står först och variantens text efter: "Ett pass på tio minuter: första läsningen 0–2 minuter, modellering
 * 2–4, läs igen 4–9 och avslutning 9–10. Då hinner du lyssna på varje elev om gruppen har högst fyra elever." En variant
 * utan text har bara tiderna.
 * @param {Variant} v
 */
export const variantensMening = (v) => {
  const delar = uppraknat(v.delar.map((x, i) => `${liten(x.fas)} ${delensTid(x.tid)}${i === 0 ? ' minuter' : ''}`));
  if (!v.text || variantensNar(v.nar)?.typ === 'minuter') return `${stor(v.nar)}: ${delar}.${v.text ? ` ${mening(stor(v.text))}` : ''}`;
  return `${stor(v.nar)}: ${liten(utanPunkt(v.text))}, med ${delar}.`;
};
/**
 * När en variant av passet gäller, ur variantens `nar` (riggens omgång 1 2026-10-26: Upprepad läsnings pass på tio
 * minuter och Högläsning i pars visning i veckans första pass hade sina tider i en mening): metodens veckor, "vecka 1–3",
 * passets längd, "ett pass på tio minuter", och planens ord för passen (tolkaPassen), som "pass 2" och "veckans första
 * pass", också i vissa veckor, "veckans första pass i vecka 2–5".
 * @param {unknown} text
 * @returns {VariantensNar | null}
 */
export function variantensNar(text) {
  if (typeof text !== 'string') return null;
  const t = text.replace(/⁠/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  let m = t.match(new RegExp(String.raw`^(?:ett )?pass på (${talIRegex(1, 120)}) minuter$`, 'u'));
  if (m) { const n = talAv(m[1]); return n >= 1 ? { typ: 'minuter', minuter: n } : null; }
  m = t.match(/^(.+?) i (vecka .+)$/);
  if (m) {
    const p = tolkaPassen(m[1]), veckor = veckorI(m[2]);
    return p && veckor && p.typ === 'vecka' ? { ...p, veckor } : null;
  }
  return tolkaPassen(t);
}
/**
 * Varianten som gäller ett pass, den mest bestämda först (narensVikt), eller ingen: passets veckor, plats och nummer, och
 * sist passets längd.
 * @template {{ nar: string }} V
 * @param {V[] | undefined} varianter
 * @param {PassetsLage | undefined} lage passets läge (passetsLage), eller bara metodens vecka och passets minuter
 * @returns {V | undefined}
 */
export const variantenFor = (varianter, lage) => {
  if (!lage) return undefined;
  const traffar = (varianter ?? []).flatMap((v, i) => { const nar = variantensNar(v.nar); return nar && passetTraffas(nar, lage) ? [{ v, i, vikt: narensVikt(nar) }] : []; });
  return traffar.sort((a, b) => a.vikt - b.vikt || a.i - b.i)[0]?.v;
};
// Passets tider i löptext, som "modelleringen tar 0–3 minuter, körläsningen 3–6": minuter och ett spann som inte är veckor,
// pass, sidor eller nivåer.
const SPANN_AV_MINUTER = new RegExp(String.raw`(?<!\b(?:vecka|veckorna|pass|passen|sidan|sidorna|s\.|kapitel|nivå|nivåerna|lista|listorna)\s+)\b\d{1,2}${STRECK}\u2060?\d{1,2}\b`, 'iu');
const tiderILoptext = (t) => (/\bminut/i.test(t) || /\d\s*min\b/i.test(t)) && SPANN_AV_MINUTER.test(t);
/**
 * Felen i metodens tidsschema, för alla metoder: en variant vars när inte går att läsa, vars veckor går in i en annan
 * variants eller vars längd en annan variant eller tidsschemat själv redan har, en del som inte är en rad i tidsschemat,
 * delar som inte följer på varandra från minut 0 eller räcker längre än passet, en variant för passets längd vars delar inte
 * slutar på den längden, och passets tider i tidsschemats text, som ska stå som en variant.
 * @param {{ tid?: string, tidsschema?: { text?: string, rader: { tid: string, fas: string }[], varianter?: Variant[] } }} d
 * @returns {string[]}
 */
export function tidsschematsFel(d) {
  const fel = [];
  const t = d.tidsschema;
  if (!t) return fel;
  const minuter = tidensMatt(d.tid ?? '').minuter;
  const schematsLangd = Math.max(0, ...t.rader.map((r) => minuterISpann(r.tid)?.till ?? 0));
  const spann = [], langder = new Set();
  for (const v of t.varianter ?? []) {
    const plats = `Tidsschemats variant "${v.nar}"`;
    const nar = variantensNar(v.nar);
    if (!nar) fel.push(`${plats} går inte att läsa. Skriv den som vecka 1–3, ett pass på tio minuter, pass 2, veckans första pass eller veckans första pass i vecka 2–5.`);
    else if (nar.typ === 'veckor') {
      if (spann.some((x) => nar.fran <= x.till && x.fran <= nar.till)) fel.push(`${plats} gäller veckor som en annan variant redan gäller.`);
      else spann.push(nar);
    } else if (nar.typ === 'minuter') {
      if (langder.has(nar.minuter)) fel.push(`${plats} gäller en längd som en annan variant redan gäller.`);
      else if (nar.minuter === schematsLangd) fel.push(`${plats} gäller samma längd som tidsschemats rader.`);
      langder.add(nar.minuter);
    }
    let forra = 0;
    for (const x of v.delar) {
      const m = minuterISpann(x.tid);
      if (!t.rader.some((r) => r.fas.toLowerCase() === x.fas.toLowerCase())) fel.push(`${plats} har delen ${x.fas}, som inte är en rad i tidsschemat. Delarna heter som tidsschemats rader, så att planen hittar vad läraren gör.`);
      if (!m || m.till <= m.fran) { fel.push(`${plats} har delen ${x.fas} med tiden "${x.tid}", som inte är ett spann av minuter. Skriv den som 0–3 min.`); continue; }
      if (m.fran !== forra) fel.push(`${plats}: delen ${x.fas} börjar på minut ${m.fran}, och delen före slutar på minut ${forra}. Delarna följer på varandra från minut 0.`);
      forra = m.till;
    }
    if (nar?.typ === 'minuter') { if (forra !== nar.minuter) fel.push(`${plats} har delar till minut ${forra}, men varianten gäller ett pass på ${nar.minuter} minuter.`); }
    else if (minuter !== undefined && forra > minuter) fel.push(`${plats} har delar till minut ${forra}, men faktarutans pass är ${minuter} minuter.`);
  }
  for (const m of meningarna(t.text)) if (tiderILoptext(m)) fel.push(`Tidsschemats text säger passets tider i en mening, "${m}". Skriv dem som en variant i tidsschema.varianter, så skriver metodens sida, Word och planen dem ur samma rot (METODER.md under Tidsschemats varianter).`);
  return fel;
}
/**
 * Felen i lathundens och lektionskortens texter för en metod med varianter: lathunden säger varje variant för vissa veckor
 * med variantensMening, eftersom passet ser ut så för alla de veckorna, och ingen text säger passets tider för vissa veckor
 * på eget sätt. En variant för passets längd eller för ett visst pass behöver inte stå i lathunden. Texterna är riggens, och
 * sajten ritar dem som de är, så bygget stannar på en egen mening i stället för att skriva om den.
 * @param {{ tidsschema?: { varianter?: Variant[] } }} d
 * @param {string[]} texter lathundens eller ett lektionskorts texter
 * @param {{ lathund?: boolean, var: string }} o
 * @returns {string[]}
 */
export function varianternasFel(d, texter, o) {
  const varianter = d.tidsschema?.varianter ?? [];
  const meningar = varianter.map(variantensMening);
  const fel = [];
  if (o.lathund) for (const v of varianter.filter((x) => variantensNar(x.nar)?.typ === 'veckor')) { const m = variantensMening(v); if (!texter.some((t) => t.includes(m))) fel.push(`${o.var} säger inte tidsschemats variant med standardens mening. Skriv "${m}" där lathunden säger hur passet ser ut de veckorna.`); }
  for (const t of texter) for (const s of meningarna(t)) if (/\bvecka\s+\d/i.test(s) && tiderILoptext(s) && !meningar.includes(s)) fel.push(`${o.var} säger passets tider för vissa veckor på eget sätt: "${s}". Skriv dem som en variant i metodens tidsschema, och säg varianten med standardens mening${meningar.length ? `: "${meningar.join('" och "')}"` : ''}.`);
  return fel;
}

/**
 * Delarna i ett pass med egen tabell, som Seriesamtals pass 1 och Boksamtalets bokval (riggens omgång 1 2026-10-26: tre
 * former av tabeller i Läsningens metoder, där planen bara läste Seriesamtals). En rad är en del med delens tid, delens namn
 * och vad som händer. Tiden och namnet står i var sin kolumn ("Delen" och "Tid") eller i samma cell ("Del", "Del och tid"
 * eller "Tid och del"), på två rader ("Varför vi ses" och "0–4 min") eller med en punkt emellan ("0–5 · Var är vi?").
 * Kolumnerna efter är delens text: den första är vad som händer, och de andra står med kolumnens namn, som "Du säger". En
 * rad utan minuter ("Före passet", "Dagen före") är förberedelsen. Null när tabellen inte är ett pass i delar, också när en
 * del saknar namn: då får metodens tabell namnen, som Boksamtalets bokval fick (Niclas samma dag: metoderna får förtydligas,
 * "tydligare passdelar"), så att planen visar tunna rader med delarnas namn.
 * @param {{ kolumner: string[], rader?: unknown[][] }} t
 * @returns {{ delar: TabellDel[], fore: { namn: string, nar: string, vad: string }[] } | null}
 */
export function tabellensDelar(t) {
  const k = t.kolumner.map((x) => x.trim().toLowerCase());
  const tidKol = k.indexOf('tid');
  const namnKol = k.findIndex((x) => x === 'del' || x === 'delen');
  const blandad = k.findIndex((x) => x === 'del och tid' || x === 'tid och del');
  // Tiden och namnet i samma cell: en kolumn som säger båda, eller en kolumn Del när tabellen inte har någon kolumn Tid.
  const samma = blandad >= 0 ? blandad : tidKol < 0 ? namnKol : -1;
  if (samma < 0 && tidKol < 0) return null;
  const textKol = k.map((_, i) => i).filter((i) => i !== samma && i !== tidKol && i !== namnKol);
  if (!textKol.length) return null;
  const arTid = (s) => minuterISpann(s) !== null;
  /** @type {TabellDel[]} */
  const delar = [];
  const fore = [];
  for (const r of t.rader ?? []) {
    const cell = (i) => String(r[i] ?? '').trim();
    let tid, namn;
    if (samma >= 0) {
      const leden = cell(samma).split(/\n|\s+·\s+/).map((x) => x.trim()).filter(Boolean);
      tid = leden.find(arTid) ?? leden[1] ?? '';
      namn = leden.find((x) => x !== tid) ?? '';
    } else {
      tid = cell(tidKol);
      namn = namnKol >= 0 ? cell(namnKol) : '';
    }
    const [forsta, ...andra] = textKol;
    const vad = cell(forsta);
    if (arTid(tid)) delar.push({ tid, fas: namn, vad, mer: andra.map((i) => ({ etikett: t.kolumner[i].trim(), text: cell(i) })).filter((x) => x.text) });
    else fore.push({ namn, nar: tid, vad });
  }
  return delar.length && delar.every((x) => x.fas) ? { delar, fore } : null;
}

/**
 * Ett pass som sidan och kalendern visar det, en rot för båda (sajtens K-515: kalendern visade både rollens tider och
 * tidsschemats delar för samma pass, eftersom sidan och kalendern valde delarna var för sig). Rollerna står den mest
 * bestämda först. Passets namn är den första rollens korta namn, eller en rolls ord före kolon, och rollernas texter står
 * utan namnet när det är deras början. Delarna är den första rollens tabell (Seriesamtals pass 1), annars tidsschemats
 * variant för passet (variantenFor: Läslistors vecka 1–3, där passet bara är listan, Högläsning i pars visning och
 * Upprepad läsnings pass på tio minuter), och annars tidsschemats. En tabell är passets egen ordning, så då gäller inte
 * tidsschemats förberedelse och fraser (egenOrdning); en variant är samma pass med andra tider, så där gäller de, och
 * variantens text står först bland texterna. En roll har sin egen text, ett citat ur metoden, och raden ur metodens tabell
 * som den hämtar sin text ur, med kolumnens namn som etikett (K-520).
 * @template {{ tid: string, fas: string, vad: string }} D
 * @param {{ text?: string, rad?: { kolumn: string, text: string }[], kort?: string, tabell?: { namn: string, adress: string, delar?: D[], fore?: { namn: string, nar: string, vad: string }[] } }[]} roller
 * @param {{ delar: D[], fore?: string, varianter?: (Variant & { delar: D[] })[] } | undefined} passet passet ur tidsschemat
 * @param {PassetsLage} [lage] passets läge i planen (passetsLage), med passets minuter
 */
export function passetsBeskrivning(roller, passet, lage) {
  const namnet = (r) => r.kort ?? (r.text && /^[^:]{3,30}:/.test(r.text) ? forstaLedet(r.text) : '');
  const utanNamnet = (r) => (r.kort && r.text.toLowerCase().startsWith(`${r.kort.toLowerCase()}:`) ? stor(r.text.slice(r.kort.length + 1).trim()) : r.text);
  const tabell = roller.find((r) => r.tabell?.delar?.length)?.tabell;
  const variant = tabell ? undefined : variantenFor(passet?.varianter, lage);
  /** @type {{ etikett: string, text: string }[]} */
  const texter = [...(variant?.text ? [{ etikett: '', text: variant.text }] : []), ...roller.flatMap((r) => [...(r.text ? [{ etikett: '', text: utanNamnet(r) }] : []), ...(r.rad ?? []).map((c) => ({ etikett: c.kolumn, text: c.text }))])];
  return {
    namn: roller.map(namnet).find(Boolean) ?? '',
    texter,
    delar: tabell?.delar ?? variant?.delar ?? passet?.delar ?? [],
    egenOrdning: !!tabell,
    fore: tabell ? undefined : passet?.fore,
    foreRader: tabell?.fore ?? [],
    tabell: roller.find((r) => r.tabell)?.tabell,
  };
}

/**
 * Progressionens steg som planen inte når: steg som börjar efter planens sista vecka (eller pass), med de steg som görs vid
 * behov för sig. Det som kommer efter insatsen räknas inte. Planen säger till, så att en kortare plan inte tyst tappar ett
 * steg (de kalla testarna 2026-10-24: sex veckor nådde inte Läslista 6).
 * @param {Metodplan} mp
 * @param {Plan} plan
 * @returns {{ rad: number, fran: number, vidBehov: boolean }[]}
 */
export function stegUtanfor(mp, plan) {
  const sista = mp.stegEnhet === 'pass' ? hogstaPassnr(plan) : Math.max(0, ...plan.veckor.map((v) => v.innehall));
  return mp.steg.filter((s) => !s.efter && s.fran > sista).map((s) => ({ rad: s.rad, fran: s.fran, vidBehov: s.vidBehov }));
}

/** Planens vecka för ett datum: veckan datumet ligger i, nästa vecka före start, och sista veckan efter slutet. @param {Plan} plan @param {string} datum */
export function veckanFor(plan, datum) {
  if (!plan.veckor.length) return null;
  const v = plan.veckor.find((x) => datum >= x.mandag && datum <= plusDagar(x.mandag, 6));
  if (v) return v;
  return datum < plan.veckor[0].mandag ? plan.veckor[0] : plan.veckor.find((x) => x.mandag > datum) ?? plan.veckor[plan.veckor.length - 1];
}
/** Nästa pass från och med ett datum, eller inget när planen är slut. @param {Plan} plan @param {string} datum */
export const nastaPass = (plan, datum) => iDatumordning(plan.pass).find((p) => p.datum >= datum) ?? null;
/**
 * Nästa pass som inte är bockat, från och med ett datum, och de bockade före det. Ett pass som läraren redan har bockat är
 * gjort, också ett som bockades i förväg samma vecka, så nästa pass är passet efter (användbarhetsprovet 2026-10-25: rutan
 * stod kvar på dagens pass efter bocken).
 * @param {Plan} plan
 * @param {string} datum
 * @param {(p: Pass) => boolean} gjort
 * @returns {{ pass: Pass | null, bockade: Pass[] }}
 */
export function nastaObockade(plan, datum, gjort) {
  const fran = iDatumordning(plan.pass).filter((p) => p.datum >= datum);
  const i = fran.findIndex((p) => !gjort(p));
  return { pass: i === -1 ? null : fran[i], bockade: i === -1 ? fran : fran.slice(0, i) };
}

// ---------- Länken ----------

/**
 * Planens största längd, i veckor eller pass, både i länken och när läraren förlänger, så att en förlängd plan alltid går
 * att läsa (Codex 2026-10-24: en plan som förlängdes förbi gränsen i länken föll tillbaka till förvalen).
 */
export const LANGSTA = 200;

/**
 * Valen som länk: allt som avgör planen, lärarens eget mål när det finns och planens id, men aldrig gruppens eller
 * elevernas namn. Länken står efter # och skickas därför aldrig till servern eller till besöksstatistiken.
 * @param {Val} val
 * @param {{ id?: string, visa?: number | 'fore' }} [extra]
 */
export function kodaVal(val, extra = {}) {
  const delar = [`s=${val.start}`, `d=${[...val.dagar].sort().join('')}`, `l=${val.langd}`];
  if (val.niva) delar.push(`n=${val.niva}`);
  if (val.borja && val.borja > 1) delar.push(`b=${val.borja}`);
  if (val.minuter) delar.push(`m=${val.minuter}`);
  if (val.lov?.length) delar.push(`lov=${[...val.lov].sort().join('.')}`);
  if (val.upprepa?.length) delar.push(`u=${[...val.upprepa].sort((a, b) => a - b).join('.')}`);
  const f = Object.entries(val.flytta ?? {}).filter(([a, b]) => arDatum(a) && arDatum(b)).sort();
  if (f.length) delar.push(`f=${f.map(([a, b]) => `${a}~${b}`).join('.')}`);
  if (val.stryk?.length) delar.push(`x=${[...val.stryk].sort().join('.')}`);
  const tider = Object.entries(rentaTider(val.tider)).sort();
  if (tider.length) delar.push(`t=${tider.map(([d, [a, b]]) => `${d}-${a.replace(':', '')}-${b.replace(':', '')}`).join('.')}`);
  if (val.mal) delar.push(`mal=${encodeURIComponent(val.mal)}`);
  if (val.mitt) delar.push(`a=${val.mitt}`);
  if (val.slut) delar.push(`e=${val.slut}`);
  const fore = rentaFore(val.fore);
  if (fore.length) delar.push(`db=${fore.map((f) => `${f.till}~${f.dagar.join('')}${f.fasta ? `~${Object.entries(f.fasta).map(([d, nr]) => `${d}!${nr}`).join(',')}` : ''}`).join('.')}`);
  if (extra.id) delar.push(`p=${extra.id}`);
  if (extra.visa) delar.push(`v=${extra.visa}`);
  return delar.join('&');
}

/**
 * Valen ur en länk, eller null när länken inte är en plan. Ett värde som inte går att läsa tas bort, så att en trasig
 * länk aldrig ger en felaktig plan.
 * @param {string} hash
 * @returns {{ val: Val, id?: string, visa?: number | 'fore' } | null}
 */
export function lasVal(hash) {
  const p = new URLSearchParams(String(hash ?? '').replace(/^#/, ''));
  const start = p.get('s');
  const dagar = [...new Set((p.get('d') ?? '').split('').map(Number).filter((x) => x >= 1 && x <= 5))].sort();
  const langd = Number(p.get('l'));
  // Datumet inom åren som sidans fält tar emot, så att en länk aldrig ger en plan som inte går att räkna (Codex 2026-10-24).
  if (!arDatum(start) || start < '2000-01-01' || start > '2099-12-31' || !dagar.length || !Number.isInteger(langd) || langd < 1 || langd > LANGSTA) return null;
  const punkter = (k) => (p.get(k) ?? '').split('.').filter(Boolean);
  const niva = p.get('n') ?? '';
  const borja = Number(p.get('b'));
  const minuter = Number(p.get('m'));
  const id = p.get('p') ?? '';
  const visa = p.get('v') === 'fore' ? 'fore' : Number(p.get('v'));
  const mal = rentMal(p.get('mal'));
  const mitt = Number(p.get('a'));
  const slut = Number(p.get('e'));
  const tider = rentaTider(Object.fromEntries(punkter('t').map((x) => x.match(/^([1-5])-(\d{2})(\d{2})-(\d{2})(\d{2})$/)).filter(Boolean).map((m) => [m[1], [`${m[2]}:${m[3]}`, `${m[4]}:${m[5]}`]])));
  // Dagarna före ett byte av dagar mitt i insatsen: bytets dag och dagarna före, "2026-11-26~24".
  const fore = rentaFore(punkter('db').map((x) => x.split('~')).map(([till, d, f]) => ({ till, dagar: String(d ?? '').split('').map(Number), fasta: Object.fromEntries(String(f ?? '').split(',').filter(Boolean).map((x) => x.split('!')).map(([dag, nr]) => [dag, Number(nr)])) })));
  /** @type {Val} */
  const val = {
    start, dagar, langd,
    lov: punkter('lov').filter((x) => /^\d{4}-\d{2}$/.test(x)),
    // En upprepad vecka är metodens vecka, inom planens veckor räknat från veckan planen börjar på.
    upprepa: punkter('u').map(Number).filter((x) => Number.isInteger(x) && x >= 1 && x < (Number.isInteger(borja) && borja > 1 ? borja : 1) + langd),
    flytta: Object.fromEntries(punkter('f').map((x) => x.split('~')).filter(([a, b]) => arDatum(a) && arDatum(b))),
    stryk: punkter('x').filter(arDatum),
    ...(/^[a-z0-9-]{1,30}$/.test(niva) ? { niva } : {}),
    ...(Number.isInteger(borja) && borja > 1 && borja <= LANGSTA ? { borja } : {}),
    ...(Number.isInteger(minuter) && minuter >= 5 && minuter <= 240 ? { minuter } : {}),
    ...(Object.keys(tider).length ? { tider } : {}),
    ...(mal ? { mal } : {}),
    ...(Number.isInteger(mitt) && mitt >= 1 && mitt <= LANGSTA ? { mitt } : {}),
    // Slutet är numret på insatsens sista pass.
    ...(Number.isInteger(slut) && slut >= 1 && slut <= 999 ? { slut } : {}),
    ...(fore.length ? { fore } : {}),
  };
  return { val, ...(/^[a-z0-9]{4,12}$/.test(id) ? { id } : {}), ...(visa === 'fore' || (Number.isInteger(visa) && visa >= 1 && visa <= 2 * LANGSTA) ? { visa } : {}) };
}

/**
 * Passens tider som läraren har satt (Niclas 2026-10-24: "kan de lägga in ex 0920 till 1000 på passet?"): en början och
 * ett slut för varje veckodag, som "09:20" och "10:00". En tid som inte går att läsa, eller som slutar innan den börjar,
 * tas bort.
 * @param {unknown} tider
 * @returns {Record<string, [string, string]>}
 */
export function rentaTider(tider) {
  const klocka = (s) => (typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : null);
  /** @type {Record<string, [string, string]>} */
  const ut = {};
  for (const [d, par] of Object.entries(tider && typeof tider === 'object' ? tider : {})) {
    const a = klocka(Array.isArray(par) ? par[0] : null), b = klocka(Array.isArray(par) ? par[1] : null);
    if (/^[1-5]$/.test(d) && a && b && a < b) ut[d] = [a, b];
  }
  return ut;
}
/** Passets tid: tiden för veckodagen det låg på innan det flyttades, eller ingen. @param {Val} val @param {Pass} p */
export const passetsTid = (val, p) => rentaTider(val.tider)[String(veckodag(passetsDag(p)))];
/** "9.20" ur "09:20". @param {string} s */
export const tidText = (s) => `${Number(s.slice(0, 2))}.${s.slice(3, 5)}`;
/** "9.20–10.00". @param {[string, string]} par */
export const tidsspann = (par) => `${tidText(par[0])}–${tidText(par[1])}`;
/** Minuterna från midnatt: 560 ur "09:20". @param {string} s */
export const minuterAv = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
/** Klockslaget ur minuterna från midnatt: "09:20" ur 560. @param {number} t */
export const klockslag = (t) => `${tvasiffrigt(Math.floor(t / 60))}:${tvasiffrigt(t % 60)}`;
/** Klockslaget m minuter efter, högst 23:59: "10:00" ur "09:20" och 40. @param {string} s @param {number} m */
export const plusMinuter = (s, m) => { const t = minuterAv(s) + m; return t >= 24 * 60 ? '23:59' : klockslag(t); };
/** Minuterna i ett spann i tidsschemat: "0–4 min" ger 0 och 4. @param {string} tid */
export const minuterISpann = (tid) => { const m = tid.match(/(\d+)\s*[–-]\u2060?\s*(\d+)/); return m ? { fran: Number(m[1]), till: Number(m[2]) } : null; };
/**
 * Dagarna med sina tider: "måndag, onsdag och fredag kl. 9.20–10.00" när dagarna har samma tid, och annars tiden vid
 * varje dag, "måndag kl. 9.20–10.00 och onsdag kl. 13.00–13.40".
 * @param {Val} val
 */
export function dagarText(val) {
  const tider = rentaTider(val.tider);
  const dagar = [...new Set(val.dagar)].sort();
  const par = dagar.map((d) => tider[String(d)]);
  const samma = par[0] && par.every((x) => x && x[0] === par[0][0] && x[1] === par[0][1]);
  const nu = samma || !par.some(Boolean) ? `${uppraknat(dagar.map((d) => VECKODAGAR[d - 1]))}${samma ? ` kl. ${tidsspann(par[0])}` : ''}`
    // En dag utan tid säger det, så att den inte läses som att den har nästa dags tid (buggjakten 2026-10-24).
    : uppraknat(dagar.map((d, i) => `${VECKODAGAR[d - 1]}${par[i] ? ` kl. ${tidsspann(par[i])}` : ' utan tid'}`));
  // Ett byte av dagar mitt i insatsen: dagarna före och dagarna från bytets dag, "tisdag och torsdag, och från 26 november
  // onsdag och torsdag kl. 9.00–9.30" (sajtens K-546).
  const fore = rentaFore(val.fore);
  if (!fore.length) return nu;
  const namn = (d) => uppraknat(d.map((x) => VECKODAGAR[x - 1]));
  return [...fore.map((f, i) => (i ? `från ${dagOchManad(fore[i - 1].till)} ${namn(f.dagar)}` : namn(f.dagar))), `och från ${dagOchManad(fore[fore.length - 1].till)} ${nu}`].join(', ');
}

/**
 * Passens längd i minuter: varje dags klockslag när läraren har satt dem, och annars passets längd (Codex 2026-10-24:
 * 9.20–10.00 gav "pass om 30 minuter"). Olika längder står var för sig, i storleksordning.
 * @param {Val} val
 * @param {number} standard passets längd utan klockslag
 * @returns {number[]}
 */
export function passensMinuter(val, standard, plan) {
  const tider = rentaTider(val.tider);
  // Med planen räknas dagarna som planens pass har, också före ett byte av dagar (Codex 2026-10-25).
  const dagar = plan?.pass.length ? plan.pass.map((p) => veckodag(passetsDag(p))) : val.dagar;
  return [...new Set([...new Set(dagar)].map((d) => { const t = tider[String(d)]; return t ? minuterAv(t[1]) - minuterAv(t[0]) : standard; }))].sort((a, b) => a - b);
}
/** "30", eller "30 eller 40" när dagarna har olika långa pass. @param {number[]} minuter */
export const minuterText = (minuter) => (minuter.length <= 1 ? minuter.join('') : `${minuter.slice(0, -1).join(', ')} eller ${minuter[minuter.length - 1]}`);

/** Ett mål som läraren har skrivit: en rad, högst 200 tecken, utan styrtecken. @param {unknown} s */
export const rentMal = (s) => rentText(String(s ?? ''), 200);

// ---------- Texterna ----------

const MANADER = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const MANAD_KORT = MANADER.map((m) => m.slice(0, 3));
export const VECKODAGAR = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag'];
/** Veckodagen kort, "mån" för 1; stor() ger "Mån". @param {number} d */
export const veckodagKort = (d) => VECKODAGAR[d - 1].slice(0, 3);
const delar = (s) => s.split('-').map(Number);
/** Målet som en mening: stor bokstav först och punkt sist, som "Kunna läsa mellan raderna." @param {string} [mal] */
export const malText = (mal) => { const t = rentMal(mal); return t ? mening(stor(t)) : ''; };
/**
 * Metodens övergripande mål i en mening, som metodens sida och Word skriver det under Mål (sajtens K-522): "Det
 * övergripande målet är att eleven ska kunna läsa mellan raderna, säga vad man tror och visa ledtråden i texten."
 * @param {string} mal metodens mal.overgripande, "kunna …"
 */
export const malensMening = (mal) => `Det övergripande målet är att eleven ska ${utanPunkt(liten(rentMal(mal)))}.`;
/**
 * Felen i ett lektionskorts mål: kortet säger metodens övergripande mål ordagrant, efter "Mål:" (sajtens K-522), så att
 * kortet, metodens sida och planen skattar mot samma mål. Kortet är riggens, och bygget stannar på ett annat mål.
 * @param {{ mal?: { overgripande?: string } }} d
 * @param {string[]} texter kortets texter
 * @param {string} plats
 * @returns {string[]}
 */
export function kortetsMalFel(d, texter, plats) {
  const malet = utanPunkt(rentMal(d.mal?.overgripande ?? ''));
  const malen = texter.flatMap((t) => [...t.matchAll(/\*\*Mål:\*\*\s*([^\n]+)/g)].map((m) => utanPunkt(rentMal(m[1]))));
  // Ett kort utan mål stannar också (Codex 2026-10-25: spärren släppte ett kort där målet var borttaget).
  if (!malen.length) return [`${plats} saknar målet. Kortet säger metodens övergripande mål ordagrant efter "Mål:" (METODER.md under Lektionskortet).`];
  return malen.filter((x) => x !== malet).map((x) => `${plats} har målet "${x}", men metodens övergripande mål är "${malet}". Kortet säger metodens mål ordagrant (METODER.md under Lektionskortet).`);
}

/**
 * En text utan elevernas namn: varje namn i elevlistan och dess förnamn blir "en elev", och med genitivets s "en elevs",
 * också i lärarens egna meningar (granskningen 2026-10-24: "Bea behöver mer stöd vid stoppet" följde med texten som skulle
 * sakna namn). Texterna som kopieras till dokumentationen går genom den. De elever som står kvar när några tas bort skyddas
 * med hela sina namn, så att ett borttaget förnamn inte tvättas ur en annan elevs namn (Codex 2026-10-25: "Ali S klarade
 * uppgiften" blev "En elev S klarade uppgiften" när Ali togs bort).
 * @param {string} text
 * @param {{ namn: string }[]} elever
 * @param {{ namn: string }[]} [kvar] eleverna som står kvar
 */
export function utanNamn(text, elever, kvar = []) {
  const namn = [...new Set((elever ?? []).flatMap((e) => { const n = String(e.namn ?? '').trim(); return [n, forstaOrdet(n)]; }).filter((n) => n.length >= 2))].sort((a, b) => b.length - a.length);
  const skyddade = [...new Set((kvar ?? []).map((e) => String(e.namn ?? '').trim()).filter((n) => n.length >= 2))].sort((a, b) => b.length - a.length);
  /** @type {string[]} */
  const gomda = [];
  let ut = String(text ?? '');
  // Utan lookbehind, som Safari före 16.4 inte kan: tecknet före namnet fångas och står kvar.
  for (const n of skyddade) ut = ut.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${skyddaRegex(n)}(?![\\p{L}\\p{N}])`, 'giu'), (hel, fore) => { gomda.push(hel.slice(fore.length)); return `${fore}\u0000${gomda.length - 1}\u0000`; });
  for (const n of namn) {
    const monster = new RegExp(`(^|[^\\p{L}\\p{N}])${skyddaRegex(n)}(s?)(?![\\p{L}\\p{N}])`, 'giu');
    ut = ut.replace(monster, (_, fore, s) => `${fore}${s ? 'en elevs' : 'en elev'}`);
  }
  return ut.replace(/(^|[.!?:]\s+)en elev/g, (_, fore) => `${fore}En elev`).replace(/\u0000(\d+)\u0000/g, (_, i) => gomda[Number(i)]);
}

/** "2 november 2026". @param {string} s */
export const datumText = (s) => { const [a, m, d] = delar(s); return `${d} ${MANADER[m - 1]} ${a}`; };
/** "2 november". @param {string} s */
export const dagOchManad = (s) => { const [, m, d] = delar(s); return `${d} ${MANADER[m - 1]}`; };
/** "måndag 2 november". @param {string} s */
export const dagText = (s) => `${VECKODAGAR[veckodag(s) - 1]} ${dagOchManad(s)}`;
/** "Mån 2/11", i veckans lista över pass. @param {string} s */
export const dagKort = (s) => { const [, m, d] = delar(s); return `${stor(veckodagKort(veckodag(s)))} ${d}/${m}`; };
/** "2–6 nov" eller "30 nov–4 dec". @param {string} fran @param {string} till */
export function spannKort(fran, till) {
  const [, m1, d1] = delar(fran), [, m2, d2] = delar(till);
  if (fran === till) return `${d1} ${MANAD_KORT[m1 - 1]}`;
  return m1 === m2 ? `${d1}–${d2} ${MANAD_KORT[m1 - 1]}` : `${d1} ${MANAD_KORT[m1 - 1]}–${d2} ${MANAD_KORT[m2 - 1]}`;
}
/** "2 november till 11 december 2026", med båda åren när spannet går över nyår. @param {string} fran @param {string} till */
export const datumspann = (fran, till) => `${fran.slice(0, 4) === till.slice(0, 4) ? dagOchManad(fran) : datumText(fran)} till ${datumText(till)}`;
/** "måndag, onsdag och fredag". @param {string[]} ord */
export const uppraknat = (ord) => (ord.length <= 1 ? ord.join('') : `${ord.slice(0, -1).join(', ')} och ${ord[ord.length - 1]}`);
/**
 * Passens nummer i en text, "Pass 4–6", och med luckan när ett pass är struket före ett pass som står kvar: "Pass 4 och 6".
 * Passen behåller sina nummer när insatsen avslutas tidigare (Codex 2026-10-25), så numren läses aldrig som ett spann.
 * @param {number[]} nr
 */
export const passnummerText = (nr) => {
  /** @type {[number, number][]} */
  const delar = [];
  for (const n of [...nr].sort((a, b) => a - b)) {
    const sist = delar[delar.length - 1];
    if (sist && n === sist[1] + 1) sist[1] = n;
    else delar.push([n, n]);
  }
  return delar.length ? `Pass ${uppraknat(delar.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)))}` : '';
};
/** Veckans första och sista dag i planen: passens, eller måndag till fredag. @param {{ pass: Pass[] }} plan @param {PlanVecka} v */
export function veckansDagar(plan, v) {
  const datum = veckansPass(plan, v).map((p) => p.datum).sort();
  return { fran: datum[0] ?? v.mandag, till: datum[datum.length - 1] ?? plusDagar(v.mandag, 4) };
}

// En rad i uppföljningen som heter efter insatsens vecka, som "Vecka 4", säger att det är insatsens vecka, så att den inte
// läses som kalenderveckan bredvid (de kalla testarna 2026-10-24: "Vecka 4, vecka 48"), och veckan heter som i planen när
// planen börjar högre upp i en stege (veckornaIPlanen).
const narIText = (nar, borja) => {
  const t = veckornaIPlanen(nar.trim(), borja);
  return veckorI(nar) && !t.endsWith(' i metoden') ? `${t} i insatsen` : t;
};
/**
 * Uppföljningens rad i en text, på sidan och i pdf:en: namnet och kalenderveckorna, "Kartläggning, v. 44" och "Efter insatsen,
 * v. 51". Den första raden efter insatsen heter Efter insatsen, så att planen inte säger metodens "Efter sex till åtta
 * veckor" om en kortare plan (buggjägarna 2026-10-25). En rad utan datum står med bara namnet.
 * @param {Plan} plan
 * @param {{ uppfoljning: { nar: string }[] }} info
 * @param {Plan['uppfoljning'][number]} u
 */
export function uppfoljningensRad(plan, info, u) {
  const namn = uppfoljningensNamn(plan, info, u.rad);
  return u.tillfallen.length ? `${namn}, ${uppraknat([...new Set(u.tillfallen.map((t) => kalendervecka(isoVecka(t.datum).vecka)))])}` : namn;
}
/**
 * Uppföljningens rad med sitt namn, i raden och vid elevens resultat: den första raden efter insatsen heter Efter insatsen,
 * en rad som heter efter insatsens vecka säger det, och metodens veckor i namnet heter som planens (narIText; Codex
 * 2026-10-25: "Avstämning vecka 4" behöll metodens nummer).
 * @param {Plan} plan
 * @param {{ uppfoljning: { nar: string }[] }} info
 * @param {number} rad
 */
export const uppfoljningensNamn = (plan, info, rad) => (rad === plan.uppfoljning.find((x) => x.typ === 'efter')?.rad ? 'Efter insatsen' : narIText(info.uppfoljning[rad]?.nar ?? '', plan.borja));
/** Uppföljningens rader med datum, som sammanställningen, sidan och pdf:en visar dem. @param {Plan} plan @param {{ uppfoljning: { nar: string }[] }} info */
export const uppfoljningensRader = (plan, info) => plan.uppfoljning.filter((u) => u.tillfallen.length).map((u) => uppfoljningensRad(plan, info, u));
/** Vad skattningen är, i en text: "skattning varje vecka, 1 till 5, av hur väl eleven klarar målet på egen hand". @param {string} vem eleven, eleverna eller gruppen @param {boolean} [varjeVecka] */
export const skattningenText = (vem, varjeVecka = true) => `skattning${varjeVecka ? ' varje vecka' : ''}, 1 till 5, av hur väl ${vem} klarar målet på egen hand`;

/**
 * Texten till åtgärdsprogrammet (Niclas 2026-10-24: "kopiera text till ÅP ... mål, varaktighet, tider och dagar och vad
 * eleven ska arbeta med, alltså metodens innehåll kort och koncist"), i den ordning den står under Åtgärder: åtgärden,
 * målet, omfattningen med dagar, tider och datum, vad eleven arbetar med vecka för vecka, uppföljningen och metodens
 * adress. Den säger det planerade, och hur många pass som är bockade när läraren har bockat dem. Målet är lärarens eget
 * (val.mal) eller metodens (info.mal), och innehållet är metodens steg i korta rubriker (info.steg, en per rad i
 * progressionen). Texten har inga namn. o.minuter är passets längd utan klockslag; har läraren satt tider räknas längden
 * ur dem (passensMinuter).
 * @param {{ titel: string, undertitel?: string, adress: string, mal?: string, steg?: string[], uppfoljning: { nar: string }[], nivaNamn?: string }} info
 * @param {Plan} plan
 * @param {Val} val
 * @param {{ minuter: number, genomforda?: number, folj?: boolean, utvardering?: { beslut?: string, not?: string }, elever?: { namn: string }[], pagar?: boolean }} o utvärderingen och eleverna: anledningen när insatsen avslutades tidigare, utan elevernas namn
 */
export function dokumentationstext(info, plan, val, o) {
  const rader = [];
  // Undertitelns årskurser gäller metoden, inte eleven: "för åk 3–7" och "för F–6" (de kalla testarna 2026-10-24).
  const under = info.undertitel ? liten(info.undertitel.replace(/\.$/, '').replace(/,?\s*för (?:åk\s*)?[F\d][\d–-]*(?:\s*(?:och|till)\s*\d+)?$/i, '')) : '';
  rader.push(`Åtgärd: ${info.titel}${under ? `, ${under}` : ''}.`);
  const mal = val.mal || info.mal;
  if (mal) rader.push(`Mål: ${malText(mal)}`);
  const dagar = dagarText(val);
  const v1 = plan.veckor[0]?.vecka.vecka, v2 = plan.veckor[plan.veckor.length - 1]?.vecka.vecka;
  if (plan.forstaPass && plan.sistaPass) rader.push(`Omfattning: ${plan.pass.length} pass om ${minuterText(passensMinuter(val, o.minuter, plan))} minuter, ${dagar}, ${datumspann(plan.forstaPass, plan.sistaPass)} (${kalenderveckor(v1, v2, ' till ')})${info.nivaNamn ? `, på nivån ${info.nivaNamn}` : ''}.`);
  // En insats som avslutades tidigare säger det, med lärarens anledning utan elevernas namn (K-542).
  if (avslutetText(plan)) rader.push(utanNamn(utvarderingenText(plan, o.utvardering?.beslut === 'avsluta' ? o.utvardering : undefined, o.pagar), o.elever ?? []));
  // Det eleven arbetar med: metodens steg i planens ordning, med kalenderveckorna. Pass i följd med samma steg står ihop, och
  // ett lov mitt i står inte med i veckorna (kalenderveckornaFor).
  /** @type {{ steg: number | null, datum: string[] }[]} */
  const grupper = [];
  for (const p of plan.pass) {
    const steg = p.steg ?? null;
    const sista = grupper[grupper.length - 1];
    if (sista && sista.steg === steg) sista.datum.push(p.datum);
    else grupper.push({ steg, datum: [p.datum] });
  }
  const innehall = grupper.filter((g) => g.steg !== null && info.steg?.[g.steg]).map((g) => `${veckornaIPlanen(String(info.steg?.[/** @type {number} */ (g.steg)]), plan.borja).replace(/[.;]\s*$/, '')} (${kalenderveckornaFor(g.datum)})`);
  if (innehall.length) rader.push(`Eleven arbetar med: ${innehall.join('; ')}.`);
  // Uppföljningens rader, utom villkoren utan datum, som läraren bedömer när det händer.
  const tider = plan.uppfoljning.filter((u) => u.tillfallen.length || u.typ !== 'villkor').map((u) => uppfoljningensRad(plan, info, u));
  if (tider.length) rader.push(`Uppföljning: ${tider.join('. ')}.`);
  if (o.folj) {
    const m = mittVeckan(plan);
    rader.push(`${stor(skattningenText('eleven'))}${m ? `, med avstämning mitt i insatsen ${planveckansNamn(plan, plan.veckor[m - 1]).text}` : ''} och utvärdering efter insatsen.`);
  }
  if (o.genomforda !== undefined) rader.push(`Bockade som genomförda: ${o.genomforda} av ${plan.pass.length} pass.`);
  rader.push(`Metoden: ${info.adress}`);
  return rader.join('\n');
}

// ---------- Följ insatsen ----------

/**
 * Passets dag i planen: dagen det låg på innan det flyttades. Bockarna sparas på den, så att de står kvar när planen
 * ändras efteråt (en upprepad vecka eller ett lov flyttar numren men inte dagarna som har varit).
 * @param {Pass} p
 */
export const passetsDag = (p) => p.flyttatFran ?? p.datum;

/**
 * Skalan när läraren följer insatsen (Niclas 2026-10-24: "skatta enkelt 1-5 hur väl den nu klarar av metodens centrala
 * förmåga självmant"): hur väl eleven klarar insatsens mål på egen hand. Målet står ovanför skattningen (Niclas samma dag:
 * "Så man vet vad man skattar för"). Stegen har korta namn, så att två lärare skattar lika.
 */
export const SKALAN = Object.freeze(['Inte än', 'Med mycket stöd', 'Med visst stöd', 'Oftast själv', 'Själv och säkert']);
/** Frågan till skattningen, om eleven eller gruppen. @param {boolean} [grupp] */
export const skattningsfragan = (grupp = false) => `Hur väl klarar ${grupp ? 'gruppen' : 'eleven'} målet på egen hand?`;
/** Gruppens nyckel i skattningen, när läraren följer insatsen utan elevlista. */
export const GRUPPEN = 'grupp';

/**
 * Det läraren har fört in, rensat till det sidan kan visa: rätt slag av värde i varje fält, datum som är datum, skattningar
 * 1 till 5 och texter med sin längd. Det som inte går att läsa tas bort, så att en kopia som har ändrats för hand aldrig får
 * sidan att stanna (Codex 2026-10-24: en kopia med gjorda: null gjorde sidan obrukbar, också efter omladdning).
 * @param {unknown} f
 * @returns {Foljd}
 */
export function rensaFoljd(f) {
  const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const lista = (x) => (Array.isArray(x) ? x : []);
  const text = rentText;
  const id = (x) => typeof x === 'string' && /^[a-z0-9]{1,12}$/i.test(x);
  const steg = (x) => Number.isInteger(x) && x >= 1 && x <= 5;
  const per = (x, fn) => Object.fromEntries(Object.entries(obj(x)).flatMap(([k, v]) => { const ut = fn(k, v); return ut === undefined ? [] : [[k, ut]]; }));
  const g = obj(f);
  // En elev vars namn sparades medan läraren skrev är ett utkast, som en annan flik inte sparar som ett tidigare namn (K-537).
  const elever = lista(g.elever).flatMap((e) => (id(e?.id) && text(e?.namn, 30) ? [{ id: e.id, namn: text(e.namn, 30), ...(e.utkast === true ? { utkast: true } : {}) }] : []))
    .filter((e, i, alla) => alla.findIndex((x) => x.id === e.id) === i).slice(0, 12);
  const beslut = (x, tillatna) => {
    const b = obj(x), not = text(b.not, 200);
    return tillatna.includes(b.beslut) || not ? { ...(tillatna.includes(b.beslut) ? { beslut: b.beslut } : {}), ...(not ? { not } : {}) } : undefined;
  };
  const avstamning = beslut(g.avstamning, BESLUTEN.avstamning), utvardering = beslut(g.utvardering, BESLUTEN.utvardering);
  const borttagna = [...new Set(lista(g.borttagna).map((n) => text(n, 30)).filter(Boolean))].slice(-100);
  return {
    gjorda: [...new Set(lista(g.gjorda).filter(arDatum))].sort(),
    elever,
    ...(g.narvaro === true ? { narvaro: true } : {}),
    franvaro: per(g.franvaro, (d, v) => (arDatum(d) && Array.isArray(v) ? [...new Set(v.filter(id))] : undefined)),
    vecka: per(g.vecka, (d, v) => {
      if (!arDatum(d)) return undefined;
      const not = text(obj(v).not, 200);
      return { ...(steg(obj(v).varde) ? { varde: obj(v).varde } : {}), ...(not ? { not } : {}) };
    }),
    skattning: per(g.skattning, (d, v) => (arDatum(d) ? per(v, (k, x) => (id(k) && steg(x) ? x : undefined)) : undefined)),
    resultat: per(g.resultat, (k, v) => (/^\d+-\d{4}-\d{2}-\d{2}$/.test(k) ? per(v, (e, x) => (id(e) && text(x, 40) ? text(x, 40) : undefined)) : undefined)),
    ...(avstamning ? { avstamning } : {}),
    ...(utvardering ? { utvardering } : {}),
    ...(arDatum(g.oppen) ? { oppen: g.oppen } : {}),
    ...(borttagna.length ? { borttagna } : {}),
  };
}
/**
 * Namnen som texterna som lämnar webbläsaren tvättar bort: eleverna i listan och de som har stått i den. Ett namn som
 * lämnar listan sparas med planen, så att det inte följer med texten som kopieras, också i en annan flik som läser listan
 * medan läraren skriver, och lärarens meningar skrivs inte om (sajtens K-537; Codex 2026-10-25).
 * @param {Foljd | undefined} f
 * @returns {{ namn: string }[]}
 */
export const elevernasNamn = (f) => [...(f?.elever ?? []).map((e) => ({ namn: e.namn })), ...(f?.borttagna ?? []).map((namn) => ({ namn }))];

/**
 * Veckan mitt i insatsen, då läraren stämmer av om eleverna rör sig i rätt riktning (Niclas 2026-10-24: "en mitt i
 * insatsen avstämning och check om man börjar röra sig i rätt riktning för det metoden tränar"): den första veckan i
 * planen med metodens mittersta vecka, eller veckan med det mittersta passet när perioden räknas i pass.
 * @param {Plan} plan
 */
export function mittVeckan(plan) {
  if (!plan.veckor.length) return null;
  // En förlängd insats har kvar sin avstämning i veckan den hade (verifieringen 2026-10-25: förlängningen flyttade
  // avstämningen till en vecka som redan hade varit). Veckan står i valen sedan förlängningen.
  // En insats som avslutades före sin avstämning, eller i avstämningens vecka, har ingen: sista veckan har utvärderingen
  // (buggjakten 2026-10-25: Mitt i stod ensamt i diagrammet).
  if (plan.slut && plan.mitt && plan.mitt >= plan.veckor.length) return null;
  if (plan.mitt && plan.veckor.some((v) => v.nr === plan.mitt)) return plan.mitt;
  if (plan.slut && plan.mitt) return null;
  if (plan.enhet === 'pass') return plan.pass[Math.ceil(plan.pass.length / 2) - 1]?.vecka ?? null;
  // Metodens veckor i planen, utan upprepningarna, så att en plan som börjar på ett senare steg har sin egen mitt.
  const unika = [...new Set(plan.veckor.map((v) => v.innehall))];
  const mitt = unika[Math.ceil(unika.length / 2) - 1];
  return plan.veckor.find((v) => v.innehall === mitt)?.nr ?? null;
}

/**
 * Sammanställningen när läraren följer insatsen: passen som blev av vecka för vecka, varje elevs skattning vecka för
 * vecka (eller gruppens), avstämningen mitt i och utvärderingen efter, och resultaten i metodens egen uppföljning. Det
 * som läraren inte har fört in räknas inte: ett pass som inte är bockat är inte bockat, och närvaron räknas bara när
 * läraren noterar den (f.narvaro).
 * @param {Plan} plan
 * @param {Foljd} f
 * @param {string} idag
 */
export function sammanstallning(plan, f, idag) {
  const gjorda = new Set(f.gjorda ?? []);
  const gjort = (p) => gjorda.has(passetsDag(p));
  const lista = f.elever ?? [];
  // Gruppens skattningar står kvar som en egen rad när läraren skriver in eleverna efteråt.
  const gruppSkattad = plan.veckor.some((v) => f.skattning?.[v.mandag]?.[GRUPPEN] >= 1);
  const vem = lista.length ? [...lista, ...(gruppSkattad ? [{ id: GRUPPEN, namn: 'Gruppen' }] : [])] : [{ id: GRUPPEN, namn: 'Gruppen' }];
  const narvaro = !!f.narvaro && lista.length > 0;
  const veckor = plan.veckor.map((v) => {
    const pass = veckansPass(plan, v);
    return {
      // innehall är veckans nummer i planen, som veckans rubrik (planvecka), också när planen börjar på ett senare steg.
      nr: v.nr, mandag: v.mandag, vecka: v.vecka.vecka, innehall: planvecka(plan, v), igen: v.igen, gang: gangen(plan, v), pass: pass.map((p) => ({ nr: p.nr, dag: passetsDag(p), datum: p.datum, gjort: gjort(p) })),
      gjorda: pass.filter(gjort).length, planerade: pass.length, varit: pass.filter((p) => p.datum <= idag).length,
      installda: v.bortfall.filter((b) => b.varfor === 'installt').length, helgdagar: v.bortfall.filter((b) => b.varfor === 'helgdag').length,
      ...(f.vecka?.[v.mandag]?.varde >= 1 && f.vecka[v.mandag].varde <= 5 ? { skattning: f.vecka[v.mandag].varde } : {}),
      ...(f.vecka?.[v.mandag]?.not ? { not: f.vecka[v.mandag].not } : {}),
    };
  });
  const passGjorda = plan.pass.filter(gjort);
  const elever = vem.map((e) => {
    const skattningar = plan.veckor.map((v) => ({ nr: v.nr, vecka: v.vecka.vecka, varde: f.skattning?.[v.mandag]?.[e.id] })).filter((x) => x.varde >= 1 && x.varde <= 5);
    return {
      id: e.id, namn: e.namn, skattningar,
      forsta: skattningar[0] ?? null, senaste: skattningar[skattningar.length - 1] ?? null,
      // Närvaron räknas på de bockade passen: alla är med tills läraren har tryckt på den som inte var där.
      narvaro: narvaro && e.id !== GRUPPEN ? passGjorda.filter((p) => !(f.franvaro?.[passetsDag(p)] ?? []).includes(e.id)).length : null,
      resultat: Object.fromEntries(Object.entries(f.resultat ?? {}).map(([k, r]) => [k, (r ?? {})[e.id] ?? ''])),
    };
  });
  return {
    veckor, elever, grupp: !lista.length, narvaro,
    planerade: plan.pass.length, gjorda: passGjorda.length, varit: plan.pass.filter((p) => p.datum <= idag).length,
    // De bockade bland passen som har varit, så att ett pass som är bockat i förväg inte ger ett minustal (buggjakten).
    gjordaVarit: passGjorda.filter((p) => p.datum <= idag).length,
    veckomedel: medel(veckor.filter((v) => v.skattning).map((v) => v.skattning)),
    installda: veckor.reduce((a, v) => a + v.installda, 0), helgdagar: veckor.reduce((a, v) => a + v.helgdagar, 0),
    slut: insatsenSlut(plan.sistaPass, idag), mitt: mittVeckan(plan),
    // Avstämningen hör till veckan mitt i: en insats som avslutades i den veckan eller före har ingen, så den står inte i
    // texterna och pdf:erna, men lärarens beslut ligger kvar och kommer tillbaka med Ångra avslutet (buggjakten
    // 2026-10-25: avstämningen var borta i veckan men stod kvar i texten till åtgärdsprogrammet).
    avstamning: mittVeckan(plan) ? f.avstamning ?? null : null, utvardering: f.utvardering ?? null,
    // Namnen som texterna tvättar bort, ur en rot (elevernasNamn).
    namnen: elevernasNamn(f),
  };
}

/** Riktningen från första till senaste skattningen: upp, samma eller ned, och null med färre än två. @param {{ forsta: { varde: number } | null, senaste: { varde: number } | null, skattningar: unknown[] }} e */
export const riktning = (e) => (e.skattningar.length < 2 ? null : e.senaste.varde > e.forsta.varde ? 'upp' : e.senaste.varde < e.forsta.varde ? 'ned' : 'samma');
const RIKTNING = { upp: 'framåt', samma: 'som förut', ned: 'bakåt' };
/** Riktningen i ord, lika på sidan och i pdf:en: "2 till 3, framåt", "3, en skattning" eller "Inte skattad än". @param {Parameters<typeof riktning>[0]} e */
export const riktningText = (e) => { const r = riktning(e); return r ? `${e.forsta?.varde} till ${e.senaste?.varde}, ${RIKTNING[r]}` : e.senaste ? `${e.senaste.varde}, en skattning` : 'Inte skattad än'; };
export const BESLUT = Object.freeze({ fortsatt: 'Fortsätt som planerat', justera: 'Justera insatsen', avsluta: 'Avsluta insatsen', forlang: 'Förläng insatsen', byt: 'Byt insats' });
/** Besluten att välja mellan, mitt i insatsen och efter den. */
export const BESLUTEN = Object.freeze({ avstamning: Object.freeze(['fortsatt', 'justera']), utvardering: Object.freeze(['avsluta', 'forlang', 'byt']) });
/** Utvärderingens beslut som avslutar insatsen: gruppen slutar, eller byter till en annan insats. */
export const AVSLUTANDE = Object.freeze(['avsluta', 'byt']);
/** Dagarna efter sista passet då en insats avslutas av sig själv (Niclas 2026-10-25: "planen blir automatiskt avslutad 2 veckor efter sista datum"). */
export const AVSLUTAS_EFTER = 14;
/**
 * Är insatsens pass slut: sista passets dag har varit. Då visar planen Efter insatsen, och texterna säger avslutet i dåtid.
 * På sista passets dag är passet kvar att hålla, också när läraren redan har avslutat insatsen (verifieringen 2026-10-25:
 * planen visade Efter insatsen och måndagens pass när onsdagens pass var det sista).
 * @param {string | undefined} sistaPass planens sista pass
 * @param {string} idag
 */
export const insatsenSlut = (sistaPass, idag) => !!sistaPass && idag > sistaPass;
/**
 * Planens sista dag: sista passet, eller metodens uppföljning efter insatsen när den kommer senare, som Seriesamtals fyra
 * veckor efter sista passet. En plan avslutas av sig själv två veckor efter den (Niclas 2026-10-25: "2 veckor efter sista
 * datum"; verifieringen samma kväll: Seriesamtal avslutades före sin uppföljning).
 * @param {Plan} plan
 * @returns {string | undefined}
 */
export const planensSistaDag = (plan) => [plan.sistaPass, ...plan.uppfoljning.filter((u) => u.typ === 'efter').flatMap((u) => u.tillfallen.map((t) => plusDagar(t.datum, 4)))].filter(Boolean).sort().pop();
/**
 * Är insatsen avslutad, lika i planen, i metodbanken och på metodens sida (Niclas 2026-10-25: "avslutet måste märkas när det
 * är tryckt ... när man går in på den (förutom att den då läggs som Avslutad)"): läraren har avslutat den eller bytt insats,
 * från sista passets dag, eller två veckor har gått sedan planens sista dag (planensSistaDag), också efter en förlängning,
 * och läraren har inte öppnat den igen för det sista passet (oppen; samma kväll: "blir de två veckor efter sista datum så
 * blir den avslutad oavsett. Man kan ångra det som vanligt").
 * @param {string | undefined} sistaPass planens sista pass
 * @param {string | undefined} beslut utvärderingens beslut
 * @param {string} idag
 * @param {string} [oppen] sista passet då läraren ångrade avslutet
 * @param {string} [sistaDag] planens sista dag, när uppföljningen efter kommer efter sista passet
 */
export const insatsenAvslutad = (sistaPass, beslut, idag, oppen, sistaDag) => !!sistaPass && ((idag >= sistaPass && AVSLUTANDE.includes(beslut ?? '')) || (idag >= plusDagar(sistaDag && sistaDag > sistaPass ? sistaDag : sistaPass, AVSLUTAS_EFTER) && oppen !== sistaPass));
/** Beslutet och lärarens mening, var för sig och med punkt: "Fortsätt som planerat. Gruppen behöver mer tid." En mening utan beslut kommer med (Codex 2026-10-24). @param {{ beslut?: string, not?: string }} b */
export const beslutText = (b) => [b.beslut ? BESLUT[b.beslut] ?? b.beslut : '', b.not ?? ''].map(utanPunkt).filter(Boolean).map((x) => mening(x)).join(' ');
/**
 * Passen som läraren har bockat, i en mening, lika på sidan, i pdf:en och i texten som kopieras: de bockade bland passen som
 * har varit, så att ett pass som är bockat i förväg inte räknas (buggjakten 2026-10-24), och efter insatsen alla.
 * @param {{ planerade: number, gjorda: number, varit: number, gjordaVarit: number, slut: boolean }} s
 */
/**
 * Passens rad, lika på sidan, i pdf:en och i texten som kopieras (steget Samma sak överallt 2026-10-25: sidan och texten
 * hade var sitt tillägg): passens läge och de som ställdes in eller föll på en helgdag. Läget säger redan hur många av de
 * pass som har varit som är bockade, så de utan bock sägs inte en gång till (användbarhetsprovet samma dag).
 * @param {{ planerade: number, gjorda: number, varit: number, gjordaVarit: number, slut: boolean, installda: number, helgdagar: number }} s
 */
export function passensRad(s) {
  const bort = [s.installda ? `${talText(s.installda)} pass ställdes in` : '', s.helgdagar ? `${talText(s.helgdagar)} föll på ${s.helgdagar === 1 ? 'en helgdag' : 'helgdagar'}` : ''].filter(Boolean);
  return [passensLage(s), bort.length ? `${stor(uppraknat(bort))}.` : ''].filter(Boolean).join(' ');
}
export function passensLage(s) {
  if (!s.varit) return `Inget pass har varit än. Planen har ${s.planerade} pass.`;
  if (!s.gjorda) return `Inga pass är bockade än. Planen har ${s.planerade} pass.`;
  if (s.slut) return `${s.gjorda} av ${s.planerade} pass är bockade som genomförda.`;
  return `${s.gjordaVarit} av de ${s.varit} pass som har varit är bockade. Planen har ${s.planerade} pass.`;
}
/** Elevens närvaro i en mening: "Var med i 5 av 6 bockade pass." @param {{ narvaro: number | null }} e @param {{ gjorda: number }} s */
export const narvaronText = (e, s) => `Var med i ${e.narvaro} av ${s.gjorda} bockade pass.`;
/** Ett resultat i metodens uppföljning, med radens namn som i uppföljningens rad: "Efter insatsen, v. 51: 6 av 8". @param {Plan} plan @param {{ uppfoljning: { nar: string }[] }} info @param {{ rad: number, datum: string, varde: string }} t */
export const resultatText = (plan, info, t) => `${uppfoljningensNamn(plan, info, t.rad)}, ${kalendervecka(isoVecka(t.datum).vecka)}: ${utanPunkt(t.varde)}`;
/** Veckorna där läraren har skattat hur veckan gick. @template {{ skattning?: number }} T @param {{ veckor: T[] }} s @returns {T[]} */
export const skattadeVeckor = (s) => s.veckor.filter((v) => v.skattning);
/**
 * Elevens skattning i avstämningens vecka, eller ingen, som stapeln under Mitt i i diagrammen och veckan i elevens rad
 * (steget Samma sak överallt 2026-10-25: sidan tog veckan före när eleven inte var skattad mitt i).
 * @param {Sammanstallning} s
 * @param {SammanstallningElev} e
 */
export const skattningenMittI = (s, e) => (s.mitt ? e.skattningar.find((x) => x.nr === s.mitt) : undefined);
/** En elevs skattningar vecka för vecka, med ett tomt värde för en vecka utan, till diagrammen. @param {{ veckor: { nr: number }[] }} s @param {{ skattningar: { nr: number, varde: number }[] }} e */
export const elevensVarden = (s, e) => s.veckor.map((v) => e.skattningar.find((x) => x.nr === v.nr)?.varde);
/**
 * Uppföljningens tillfällen med datum, med sin nyckel för elevernas resultat: radens nummer och tillfällets datum, som
 * "2-2026-12-14". Ett resultat hör till dagen det gällde, så att det står kvar på den dagen när planen ändras efteråt
 * (Codex 2026-10-24: efter en förlängning visades resultatet efter insatsen som nästa mätning).
 * @param {Plan} plan
 */
export const uppfoljningensTillfallen = (plan) => plan.uppfoljning.flatMap((u) => u.tillfallen.map((t) => ({ nyckel: `${u.rad}-${t.datum}`, rad: u.rad, datum: t.datum, vecka: t.vecka })));
/**
 * En elevs resultat i metodens uppföljning, i datumordning: också de som gäller ett tillfälle som inte står i planen längre,
 * som resultatet efter insatsen före en förlängning. typ säger om raden är uppföljningen före eller efter.
 * @param {Plan} plan
 * @param {Record<string, string>} resultat elevens, nyckel som i uppfoljningensTillfallen
 */
export function elevensResultat(plan, resultat) {
  return Object.entries(resultat ?? {}).flatMap(([nyckel, varde]) => {
    const m = /^(\d+)-(\d{4}-\d{2}-\d{2})$/.exec(nyckel);
    const u = m && plan.uppfoljning.find((x) => x.rad === Number(m[1]));
    // Ett resultat i en vecka som planen inte längre har, som efter ett avslut, står kvar men visas inte; före och efter
    // insatsen gäller det alltid (Codex 2026-10-25: vecka 4 i insatsen stod i sammanställningen efter ett avslut i vecka 3).
    const iPlanen = !!u && (u.typ === 'fore' || u.typ === 'efter' || !plan.sistaPass || m[2] <= plan.sistaPass);
    return m && u && iPlanen && typeof varde === 'string' && varde.trim() ? [{ nyckel, rad: u.rad, typ: u.typ, datum: m[2], varde: varde.trim() }] : [];
  }).sort((a, b) => efterDatum(a, b) || a.rad - b.rad);
}
const medel = (x) => (x.length ? Math.round((x.reduce((a, b) => a + b, 0) / x.length) * 10) / 10 : null);
// Skattningarna vecka för vecka i en text, "vecka 1 (v. 45): 2, vecka 2 (v. 46): 3", med veckornas namn ur roten.
const skattningarna = (s, e) => e.skattningar.map((x) => `${veckansNamn(s.veckor[x.nr - 1]).text}: ${x.varde}`).join(', ');

// ---------- Diagrammet ----------
// Staplarna vecka för vecka ritas lika på sidan och i pdf:en: stapeln mitt i veckans fack, och passens prickar under den
// med sju punkter mellan.

/** Stapelns vänsterkant i veckans fack. @param {number} x0 diagrammets vänsterkant @param {number} i veckans plats @param {number} steg fackets bredd @param {number} b stapelns bredd */
export const stapelnsKant = (x0, i, steg, b) => x0 + i * steg + (steg - b) / 2;
/** Veckans pass som prickar under stapeln: mitten för varje pass, och hur det gick. @template T @param {number} bx stapelns vänsterkant @param {number} b stapelns bredd @param {T[]} pass veckans pass @returns {{ x: number, slag: T }[]} */
export const prickarna = (bx, b, pass) => pass.map((slag, j) => ({ x: bx + b / 2 + (j - (pass.length - 1) / 2) * 7, slag }));

/**
 * Sammanställningen som text till dokumentationen, utan elevernas namn: målet, passen som är bockade, skattningarna som
 * medel vid första och senaste tillfället, hur många som rör sig framåt, avstämningen, utvärderingen och uppföljningen.
 * @param {{ titel: string, mal?: string, uppfoljning: { nar: string }[] }} info
 * @param {Plan} plan
 * @param {ReturnType<typeof sammanstallning>} s
 */
export function sammanstallningstext(info, plan, s) {
  const rader = [];
  if (plan.forstaPass && plan.sistaPass) rader.push(`Sammanställning: ${info.titel}, ${datumspann(plan.forstaPass, plan.sistaPass)}.`);
  if (info.mal) rader.push(`Mål: ${malText(info.mal)}`);
  rader.push(`Pass: ${passensRad(s)}`);
  const elever = s.elever.filter((e) => e.id !== GRUPPEN);
  const skattade = (s.grupp ? s.elever : elever).filter((e) => e.skattningar.length);
  if (skattade.length) {
    if (s.grupp) {
      const e = skattade[0];
      rader.push(`${stor(skattningenText('gruppen'))}: ${skattningarna(s, e)}.`);
    } else {
      const fore = medel(skattade.map((e) => e.forsta.varde)), sedan = medel(skattade.map((e) => e.senaste.varde));
      // Framåt räknas bland eleverna med två skattningar eller fler, så att en elev som har skattats en gång inte räknas som
      // en som står still (buggjakten 2026-10-25: "0 av 1 elever" med fyra elever i listan).
      const jamforda = skattade.filter((e) => riktning(e) !== null);
      const upp = jamforda.filter((e) => riktning(e) === 'upp').length;
      rader.push(`${stor(skattningenText('eleverna'))}: medel ${decimal(fore)} vid första skattningen och ${decimal(sedan)} vid den senaste.${jamforda.length ? ` ${upp} av ${jamforda.length} ${jamforda.length === 1 ? 'elev' : 'elever'} med två skattningar eller fler har gått framåt.` : ''}`);
    }
  }
  const gruppen = s.grupp ? null : s.elever.find((e) => e.id === GRUPPEN && e.skattningar.length);
  if (gruppen) rader.push(`Gruppen skattades också: ${skattningarna(s, gruppen)}.`);
  if (s.narvaro && s.gjorda) {
    const borta = elever.filter((e) => e.narvaro < s.gjorda);
    rader.push(borta.length ? `Närvaro i de bockade passen: ${elever.length - borta.length} av ${elever.length} elever var med i alla; ${borta.length === 1 ? 'en elev' : `${borta.length} elever`} missade ${uppraknat(borta.map((e) => String(s.gjorda - e.narvaro)))} pass.` : `Närvaro i de bockade passen: alla elever var med i alla.`);
  }
  const veckorna = skattadeVeckor(s);
  if (veckorna.length) rader.push(`Hur veckorna gick, 1 till 5: ${veckorna.map((v) => `${veckansNamn(v).text}: ${v.skattning}`).join(', ')}. Medel ${decimal(s.veckomedel)}.`);
  const noter = s.veckor.filter((v) => v.not);
  if (noter.length) rader.push(`Anteckningar: ${noter.map((v) => mening(`${veckansNamn(v).text}: ${v.not}`)).join(' ')}`);
  if (s.avstamning?.beslut || s.avstamning?.not) rader.push(`Avstämning mitt i insatsen${s.mitt ? `, ${veckansNamn(s.veckor[s.mitt - 1]).text}` : ''}: ${beslutText(s.avstamning)}`);
  const utvarderingen = utvarderingenText(plan, s.utvardering, !s.slut);
  if (utvarderingen) rader.push(`Utvärdering efter insatsen: ${utvarderingen}`);
  const tider = uppfoljningensRader(plan, info);
  if (tider.length) rader.push(`Uppföljning: ${tider.join('. ')}.`);
  return utanNamn(rader.join('\n'), s.namnen);
}

/**
 * En elevs rad, utan namnet, för elevens egen dokumentation: målet, skattningen vecka för vecka och resultaten i metodens
 * uppföljning, och närvaron när läraren noterar den.
 * @param {{ mal?: string, uppfoljning: { nar: string }[] }} info
 * @param {Plan} plan
 * @param {ReturnType<typeof sammanstallning>} s
 * @param {string} id
 */
export function elevtext(info, plan, s, id) {
  const e = s.elever.find((x) => x.id === id);
  if (!e) return '';
  const delar = [];
  if (info.mal) delar.push(`Mål: ${malText(info.mal)}`);
  if (e.narvaro !== null && s.gjorda) delar.push(narvaronText(e, s));
  if (e.skattningar.length) delar.push(`${stor(skattningenText('eleven', false))}: ${skattningarna(s, e)}.`);
  for (const t of elevensResultat(plan, e.resultat)) delar.push(mening(resultatText(plan, info, t)));
  // Utvärderingen, med avslutet och anledningen när insatsen avslutades tidigare, står också i elevens rad (K-542; Niclas
  // 2026-10-25: "kommer med på totala sammaställningen och för varje elev").
  const utvarderingen = utvarderingenText(plan, s.utvardering, !s.slut);
  if (utvarderingen) delar.push(`Utvärdering efter insatsen: ${utvarderingen}`);
  return utanNamn(delar.join(' '), s.namnen);
}

// ---------- Kalendern ----------

// Text i en kalenderfil (RFC 5545, 3.3.11): bakstreck, semikolon, komma och radbyte skrivs med bakstreck.
const kalText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// En rad i filen är högst 75 byte; resten fortsätter på nästa rad efter ett blanksteg (RFC 5545, 3.1), och ett tecken
// delas aldrig mellan två rader.
function vik(rad) {
  const ut = [];
  let nu = '', byte = 0;
  for (const tecken of rad) {
    const b = new TextEncoder().encode(tecken).length;
    if (byte + b > (ut.length ? 74 : 75)) { ut.push(nu); nu = ''; byte = 0; }
    nu += tecken; byte += b;
  }
  ut.push(nu);
  return ut.join('\r\n ');
}
const kalDatum = (s) => s.replace(/-/g, '');

/**
 * Kalenderfilen: en händelse för varje pass, med klockslaget när läraren har satt tider, i lärarens egen tid (en tid utan
 * tidszon, RFC 5545 3.3.5), och annars som heldagshändelse på passets dag (buggjakten 2026-10-24: en händelse per vecka
 * visade bara veckans första pass i kalendern). Dessutom en heldagshändelse för varje tillfälle i uppföljningen som har ett
 * datum. Varje händelse länkar till sin vecka i planen. Samma plan ger samma id (UID), så att en kalender som läser filen
 * igen kan känna igen händelserna; SEQUENCE växer med tiden, så att den senaste filen gäller. Beskrivningen har veckans hela
 * fokus och, när sidan ger det, passets delar (info.passet), så att ett möte i andra meningen syns (de kalla testarna
 * 2026-10-24). Det som görs före första passet är en händelse över hela veckan före.
 * @param {{ titel: string, uppfoljning: { nar: string }[], fokus: (string | null)[], passet?: (p: Pass) => string }} info
 * @param {Plan} plan
 * @param {{ id: string, lank: (vecka?: number | 'fore') => string, namn?: string, nu: Date, tider?: Val['tider'] }} o
 */
export function kalenderfil(info, plan, o) {
  const stamp = o.nu.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const sekvens = Math.max(0, Math.floor((o.nu.getTime() - Date.UTC(2026, 0, 1)) / 60000));
  const vem = o.namn ? ` (${o.namn})` : '';
  const rader = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//niclasfohlin.se//Planera insatsen//SV', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const handelse = (uid, datum, titel, text, lank, tid, dagar = 1) => {
    const nar = tid ? [`DTSTART:${kalDatum(datum)}T${tid[0].replace(':', '')}00`, `DTEND:${kalDatum(datum)}T${tid[1].replace(':', '')}00`] : [`DTSTART;VALUE=DATE:${kalDatum(datum)}`, `DTEND;VALUE=DATE:${kalDatum(plusDagar(datum, dagar))}`];
    rader.push('BEGIN:VEVENT', `UID:${uid}@niclasfohlin.se`, `DTSTAMP:${stamp}`, `SEQUENCE:${sekvens}`, ...nar,
      `SUMMARY:${kalText(titel)}`, `DESCRIPTION:${kalText(text)}`, `URL:${lank}`, `TRANSP:${tid ? 'OPAQUE' : 'TRANSPARENT'}`, 'END:VEVENT');
  };
  const tider = rentaTider(o.tider);
  const hel = (s) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length <= 600 ? t : `${t.slice(0, 600).replace(/\s+\S*$/, '')} …`; };
  for (const p of plan.pass) {
    const v = plan.veckor[p.vecka - 1];
    const steg = p.steg ?? v.steg;
    // Metodens texter med planens veckor, som på sidan (veckornaIPlanen).
    const fokus = steg !== null && steg !== undefined && info.fokus[steg] ? `\n${hel(veckornaIPlanen(/** @type {string} */ (info.fokus[steg]), plan.borja))}` : '';
    const passet = info.passet ? veckornaIPlanen(info.passet(p), plan.borja) : '';
    handelse(`${o.id}-p${p.nr}`, p.datum, `${info.titel}, pass ${p.nr} av ${hogstaPassnr(plan)}${vem}`, `Vecka ${planveckansNamn(plan, v).plan} i planen.${fokus}${passet ? `\n${passet}` : ''}\nVeckan i planen: ${o.lank(v.nr)}`, o.lank(v.nr), tider[String(veckodag(passetsDag(p)))]);
  }
  for (const u of plan.uppfoljning) u.tillfallen.forEach((t, i) => {
    const fore = t.vecka === 0;
    // Raden heter som på sidan, Efter insatsen för den första efter insatsen (buggjakten 2026-10-25: kalendern sa "efter sista
    // passet" där sidan sa Efter insatsen).
    const nar = uppfoljningensNamn(plan, info, u.rad).toLocaleLowerCase('sv');
    handelse(`${o.id}-u${u.rad}-${i + 1}`, t.datum, `${info.titel}: ${fore ? `före första passet, ${nar}` : `uppföljning, ${nar}`}${vem}`, `${fore ? 'Före första passet' : 'Uppföljningen'} i planen: ${o.lank(fore ? 'fore' : t.vecka ?? undefined)}`, o.lank(fore ? 'fore' : t.vecka ?? undefined), undefined, fore || u.typ === 'efter' ? 5 : 1);
  });
  rader.push('END:VCALENDAR');
  return rader.map(vik).join('\r\n') + '\r\n';
}

/**
 * @typedef {{ typ: 'fore' } | { typ: 'efter', veckor: number, till?: number } | { typ: 'lopande', enhet: 'pass' | 'vecka' } | { typ: 'intervall', var: number } | { typ: 'vecka', veckor: number[] } | { typ: 'sista-veckan' } | { typ: 'pass', pass: number[], till?: number } | { typ: 'sista-passet' } | { typ: 'villkor' }} Tid
 * @typedef {{ rad: number, fran: number, till?: number, vidBehov: boolean, efter?: true }} Steg
 * @typedef {{ typ: 'vecka', plats: number | 'sista' | 'ovriga' } | { typ: 'pass', fran: number, till?: number } | { typ: 'sista' } | { typ: 'veckor', fran: number, till: number }} PassensNar
 * @typedef {{ takt: { min: number, max: number }, minuter: { min: number, max: number }, period: { min: number, max?: number, enhet: 'veckor' | 'pass', mer: boolean, perKurs: boolean }, stegEnhet: 'veckor' | 'pass', steg: Steg[], uppfoljning: { rad: number, tid: Tid }[], passen: { rad: number, nar: PassensNar }[] }} Metodplan
 * @typedef {{ uppfoljning?: { rader: { nar: string, vad: string }[] }, progression?: { rader: { vecka: string, fokus?: string, roll?: string, led?: string }[] }, checklista?: { punkter: string[] }, plan?: { passen?: { nar: string, text?: string, ur?: { tabell: string, rad: string, kolumner?: string[] }, kort?: string, tabell?: string }[], fore?: string[], justera?: string[], upprepa?: string, utan?: string[], stege?: boolean }, tidsschema?: { text?: string, efter?: string, rader: { tid: string, fas: string, vad: string }[], varianter?: Variant[] }, gruppen?: { text: string }, passrutin?: { efterPasset?: string }, principer?: { text: string }, hem?: { text: string[] }, tabeller?: { rubrik: string, kolumner: string[], rader?: unknown[][] }[], nivaer?: { namn: string }[] }} MetodensTexter
 * @typedef {{ nar: string, text?: string, delar: { fas: string, tid: string }[] }} Variant
 * @typedef {{ tid: string, fas: string, vad: string, mer: { etikett: string, text: string }[] }} TabellDel
 * @typedef {{ typ: 'vecka', plats: number | 'sista' | 'ovriga' } | { typ: 'pass', fran: number, till?: number } | { typ: 'sista' } | { typ: 'nastSista' } | { typ: 'veckor', fran: number, till: number }} PassensNar
 * @typedef {PassensNar | { typ: 'minuter', minuter: number } | { typ: 'vecka', plats: number | 'sista' | 'ovriga', veckor: { fran: number, till: number } }} VariantensNar
 * @typedef {{ nr?: number, sista?: boolean, nastSista?: boolean, vecka?: number, plats?: number, sistIVeckan?: boolean, minuter?: number }} PassetsLage
 * @typedef {{ start: string, dagar: number[], langd: number, niva?: string, borja?: number, minuter?: number, lov?: string[], upprepa?: number[], flytta?: Record<string, string>, stryk?: string[], tider?: Record<string, [string, string]>, mal?: string, mitt?: number, slut?: number, fore?: { till: string, dagar: number[], fasta?: Record<string, number> }[] }} Val
 * @typedef {{ nr: number, datum: string, vecka: number, steg?: number | null, flyttatFran?: string }} Pass
 * @typedef {{ nr: number, innehall: number, igen: boolean, mandag: string, vecka: { ar: number, vecka: number }, pass: number[], bortfall: { datum: string, varfor: 'helgdag' | 'installt', namn?: string }[], steg?: number | null }} PlanVecka
 * @typedef {{ start: string, enhet: 'veckor' | 'pass', borja: number, forstaPass?: string, sistaPass?: string, sistaNr?: number, efter: string, pass: Pass[], veckor: PlanVecka[], lovveckor: string[], uppfoljning: { rad: number, typ: Tid['typ'], tillfallen: { datum: string, vecka: number | null }[] }[], fore: { mandag: string, overLov: boolean }, efterSteg?: number, mitt?: number, slut?: number, planerade?: number, struket?: { pass: Pass[], veckor: PlanVecka[] } }} Plan
 * @typedef {{ gjorda?: string[], elever?: { id: string, namn: string, utkast?: true }[], narvaro?: boolean, franvaro?: Record<string, string[]>, vecka?: Record<string, { varde?: number, not?: string }>, skattning?: Record<string, Record<string, number>>, resultat?: Record<string, Record<string, string>>, avstamning?: { beslut?: string, not?: string }, utvardering?: { beslut?: string, not?: string }, oppen?: string, borttagna?: string[] }} Foljd
 */
