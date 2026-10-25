// Planera insatsen (sajtens K-489; Niclas 2026-10-24: "Planera insatsen gillar jag", och "bygg EN som du testar på flera
// olika sätt att den funkar. dvs en standard"). Läraren väljer första passet, dagarna och antalet veckor; planen räknar
// fram passen och uppföljningen ur metodens fil. Veckorna i planen följer gruppens steg i metoden: en vecka kan tas om, och
// lov och inställda pass flyttar resten fram (Codex-granskningen av utkastet 2026-10-24). Allt räknas med datum som text
// (ÅÅÅÅ-MM-DD) i UTC, så att sommartiden aldrig flyttar en dag. Sajtens METODER.md under Planera insatsen säger hur
// metodens fält skrivs.
import { periodensLangd, postensRad, tidensMatt, tidensVeckotakt } from './index.js';

const DAG = 86400000;
const tillTid = (s) => { const [a, m, d] = s.split('-').map(Number); return Date.UTC(a, m - 1, d); };
const tillText = (t) => new Date(t).toISOString().slice(0, 10);
const tvasiffrigt = (n) => String(n).padStart(2, '0');

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

const TALORD = { en: 1, ett: 1, två: 2, tre: 3, fyra: 4, fem: 5, sex: 6, sju: 7, åtta: 8, nio: 9, tio: 10, elva: 11, tolv: 12 };
const tal = (x) => (/^\d+$/.test(x) ? Number(x) : TALORD[x]);
const TAL = String.raw`(\d+|${Object.keys(TALORD).join('|')})`;
const STRECK = String.raw`\s*[–—-]\s*`;
const lista = (s) => s.split(/\s*(?:,|\boch\b)\s*/).filter(Boolean).map(tal);

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
  if (m) return { typ: 'efter', veckor: tal(m[1]), ...(m[2] ? { till: tal(m[2]) } : {}) };
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
    const [fran, till] = [tal(m[2]), tal(m[3])];
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
 * Vilka pass en rad i planens `passen` gäller, ur dess `nar` (betan 2026-10-24: de kalla testarna saknade vad som skiljer
 * passen åt). Ett pass räknas på tre sätt: efter platsen i veckan, "veckans första", "veckans andra", "veckans tredje",
 * "veckans sista" och "veckans övriga" (de mellan första och sista), efter numret i insatsen, "första passet", "pass
 * 7", "pass 2–6", "pass 8 till det sista" och "sista passet", eller efter metodens veckor, "vecka 1–3" (Läslistor: vecka
 * 1–3 är passet bara listan, Codex 2026-10-25).
 * @param {unknown} text
 * @returns {{ typ: 'vecka', plats: number | 'sista' | 'ovriga' } | { typ: 'pass', fran: number, till?: number } | { typ: 'sista' } | { typ: 'veckor', fran: number, till: number } | null}
 */
export function tolkaPassen(text) {
  if (typeof text !== 'string') return null;
  const t = text.trim().toLowerCase().replace(/\s+/g, ' ');
  const PLATS = { första: 1, andra: 2, tredje: 3, fjärde: 4, femte: 5 };
  let m = t.match(/^veckans (första|andra|tredje|fjärde|femte|sista|övriga)(?: pass)?$/);
  if (m) return { typ: 'vecka', plats: m[1] === 'sista' ? 'sista' : m[1] === 'övriga' ? 'ovriga' : PLATS[m[1]] };
  if (t === 'första passet') return { typ: 'pass', fran: 1, till: 1 };
  if (t === 'sista passet' || t === 'det sista passet') return { typ: 'sista' };
  m = t.match(/^pass (\d+)$/);
  if (m) return { typ: 'pass', fran: Number(m[1]), till: Number(m[1]) };
  m = t.match(new RegExp(String.raw`^pass (\d+)${STRECK}(\d+)$`, 'u'));
  if (m) return Number(m[2]) > Number(m[1]) ? { typ: 'pass', fran: Number(m[1]), till: Number(m[2]) } : null;
  m = t.match(/^pass (\d+) till det sista$/);
  if (m) return { typ: 'pass', fran: Number(m[1]) };
  m = t.match(new RegExp(String.raw`^vecka (\d+)(?:${STRECK}(\d+))?$`, 'u'));
  if (m) { const fran = Number(m[1]), till = Number(m[2] ?? m[1]); return till >= fran ? { typ: 'veckor', fran, till } : null; }
  return null;
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
    if (!nar) fel.push(`Planens pass "${p.nar}" går inte att läsa. Skriv det som veckans första, veckans sista, veckans övriga, första passet, pass 7, pass 2–6, pass 8 till det sista, sista passet eller vecka 1–3.`);
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

/** Felen som stoppar en metod som ska kunna planeras. @param {Parameters<typeof metodplan>[0]} d */
export const planFel = (d) => metodplan(d).fel;

// ---------- Modulen ----------

/**
 * Modulens namn och version, på ett ställe (Niclas 2026-10-24: "en kort disclaimer att modulen heter Planera och modulens
 * versionsnr (skapa en struktur för modellnr). Kalla den 0.1"). Första siffran är 0 så länge Planera är en beta, märkt där
 * läraren går in och planerar; den andra ökar med en ny förmåga, en tredje när ett fel lagas. Versionerna står i sajtens
 * METODER.md under Planera insatsen.
 */
export const PLANERA = Object.freeze({ namn: 'Planera', version: '0.2.4', beta: true });

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
 * Planens första måndag: veckan som startdatumet ligger i, eller nästa vecka när ingen av de valda dagarna är kvar den
 * veckan, som när planen börjar på en lördag (buggjakten 2026-10-24: en start på lördag gav en tom första vecka som tog
 * metodens vecka 1).
 * @param {Val} val
 */
export function forstaMandagen(val) {
  const dagar = [...new Set(val.dagar)].filter((x) => x >= 1 && x <= 5).sort();
  const m = mandagen(val.start);
  return dagar.length && plusDagar(m, dagar[dagar.length - 1] - 1) < val.start ? plusDagar(m, 7) : m;
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
  const dagar = [...new Set(val.dagar)].filter((x) => x >= 1 && x <= 5).sort();
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
  // Spärren mot en plan utan slut: en period i pass där inga dagar ger pass.
  for (let i = 0; iPass ? pass.length < langd && i < 104 : i < ordning.length; i++) {
    const m = nastaMandag();
    const v = { nr: veckor.length + 1, innehall: iPass ? veckor.length + 1 : ordning[i].innehall, igen: iPass ? false : ordning[i].igen, mandag: m, vecka: isoVecka(m), pass: [], bortfall: [] };
    for (const dag of dagar) {
      if (iPass && pass.length >= langd) break;
      const datum = plusDagar(m, dag - 1);
      if (datum < val.start) continue;
      const namn = helgdag(datum);
      if (namn) { v.bortfall.push({ datum, varfor: 'helgdag', namn }); continue; }
      if (stryk.has(datum)) { v.bortfall.push({ datum, varfor: 'installt' }); continue; }
      const nytt = arDatum(flytta[datum]) ? flytta[datum] : undefined;
      const p = { nr: pass.length + 1, datum: nytt ?? datum, vecka: v.nr, ...(nytt ? { flyttatFran: datum } : {}) };
      pass.push(p);
      v.pass.push(p.nr);
    }
    if (iPass && !v.pass.length && !v.bortfall.length) continue;
    veckor.push(v);
  }
  // Första och sista passet efter datum: ett flyttat pass kan hamna före ett pass med lägre nummer (Codex 2026-10-24: det
  // sista passet flyttat till tisdagen avslutade insatsen före onsdagens pass).
  const iOrdning = [...pass].sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.nr - b.nr));
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
  const sistaIVeckan = (v) => (v.pass.length ? v.pass.map((n) => pass[n - 1].datum).sort()[v.pass.length - 1] : plusDagar(v.mandag, 4));
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
    else if (tid.typ === 'pass') tillfallen = tid.pass.flatMap((n) => (pass[n - 1] ? [{ datum: pass[n - 1].datum, vecka: pass[n - 1].vecka }] : []));
    else if (tid.typ === 'sista-passet' && sista) tillfallen = [{ datum: sista.datum, vecka: sista.vecka }];
    return { rad, typ: tid.typ, tillfallen };
  });
  const efterSteg = mp.steg.find((s) => s.efter)?.rad;
  return {
    start: val.start, enhet: iPass ? 'pass' : 'veckor', borja, forstaPass, sistaPass, sistaNr: sista?.nr, efter, pass, veckor, lovveckor, uppfoljning,
    fore: { mandag: foreMandag, overLov }, ...(efterSteg !== undefined ? { efterSteg } : {}),
  };
}

/**
 * Veckans nummer i planen, som veckans rubrik: metodens vecka, räknad från veckan planen börjar på. En plan som börjar på
 * Läslista 2 har den listan i sin vecka 1.
 * @param {Plan} plan
 * @param {PlanVecka} v
 */
export const planvecka = (plan, v) => v.innehall - ((plan.borja ?? 1) - 1);

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
const GANGEN = ['', 'igen', 'en tredje gång', 'en fjärde gång', 'en femte gång'];
/**
 * Vilken gång veckan tas: 0 första gången, 1 igen och 2 en tredje gång.
 * @param {Plan} plan
 * @param {PlanVecka} v
 */
export const gangen = (plan, v) => (v.igen ? plan.veckor.filter((x) => x.innehall === v.innehall && x.nr <= v.nr).length - 1 : 0);
/** Veckan i planen: "6", "3 igen" och "3 en tredje gång". */
export const planveckan = (innehall, gang = 0) => `${innehall}${gang ? ` ${GANGEN[gang] ?? `för ${gang + 1}:e gången`}` : ''}`;
/** Metodens vecka, som skiljer sig från veckan i planen när en stege börjar högre upp: "vecka 3 i metoden". */
export const metodveckan = (innehall) => `vecka ${innehall} i metoden`;
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
 * Raderna i planens `passen` som gäller ett pass, den mest bestämda först: ett pass med eget nummer (pass 7, sista passet),
 * sedan ett spann av pass (pass 8 till det sista), metodens veckor (vecka 1–3) och sist platsen i veckan (veckans första). Platsen i veckan räknas efter
 * datum, så att ett flyttat pass har sin nya plats, och veckans sista är det sista av minst två.
 * @param {Plan} plan
 * @param {Pass} p
 * @param {Metodplan['passen']} passen
 * @returns {number[]} radernas nummer i metodens passen
 */
export function passetsRoller(plan, p, passen) {
  const v = plan.veckor[p.vecka - 1];
  const iVeckan = v ? v.pass.map((n) => plan.pass[n - 1]).sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.nr - b.nr)) : [p];
  const plats = iVeckan.findIndex((x) => x.nr === p.nr) + 1;
  const sistIVeckan = iVeckan.length > 1 && plats === iVeckan.length;
  const traffar = (t) => {
    if (t.typ === 'sista') return p.nr === plan.sistaNr;
    if (t.typ === 'pass') return p.nr >= t.fran && (t.till === undefined || p.nr <= t.till);
    if (t.typ === 'veckor') return !!v && v.innehall >= t.fran && v.innehall <= t.till;
    if (t.plats === 'sista') return sistIVeckan;
    if (t.plats === 'ovriga') return plats > 1 && !sistIVeckan;
    return plats === t.plats;
  };
  const vikt = (t) => (t.typ === 'sista' || (t.typ === 'pass' && t.till === t.fran) ? 0 : t.typ === 'pass' ? 1 : t.typ === 'veckor' ? 2 : 3);
  return (passen ?? []).filter((x) => traffar(x.nar)).sort((a, b) => vikt(a.nar) - vikt(b.nar) || a.rad - b.rad).map((x) => x.rad);
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
  const sista = mp.stegEnhet === 'pass' ? plan.pass.length : Math.max(0, ...plan.veckor.map((v) => v.innehall));
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
export const nastaPass = (plan, datum) => [...plan.pass].sort((a, b) => (a.datum < b.datum ? -1 : 1)).find((p) => p.datum >= datum) ?? null;

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
  const tider = rentaTider(Object.fromEntries(punkter('t').map((x) => x.match(/^([1-5])-(\d{2})(\d{2})-(\d{2})(\d{2})$/)).filter(Boolean).map((m) => [m[1], [`${m[2]}:${m[3]}`, `${m[4]}:${m[5]}`]])));
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
  if (samma || !par.some(Boolean)) return `${uppraknat(dagar.map((d) => VECKODAGAR[d - 1]))}${samma ? ` kl. ${tidsspann(par[0])}` : ''}`;
  // En dag utan tid säger det, så att den inte läses som att den har nästa dags tid (buggjakten 2026-10-24).
  return uppraknat(dagar.map((d, i) => `${VECKODAGAR[d - 1]}${par[i] ? ` kl. ${tidsspann(par[i])}` : ' utan tid'}`));
}

/**
 * Passens längd i minuter: varje dags klockslag när läraren har satt dem, och annars passets längd (Codex 2026-10-24:
 * 9.20–10.00 gav "pass om 30 minuter"). Olika längder står var för sig, i storleksordning.
 * @param {Val} val
 * @param {number} standard passets längd utan klockslag
 * @returns {number[]}
 */
export function passensMinuter(val, standard) {
  const tider = rentaTider(val.tider);
  const minut = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  return [...new Set([...new Set(val.dagar)].map((d) => { const t = tider[String(d)]; return t ? minut(t[1]) - minut(t[0]) : standard; }))].sort((a, b) => a - b);
}
/** "30", eller "30 eller 40" när dagarna har olika långa pass. @param {number[]} minuter */
export const minuterText = (minuter) => (minuter.length <= 1 ? minuter.join('') : `${minuter.slice(0, -1).join(', ')} eller ${minuter[minuter.length - 1]}`);

/** Ett mål som läraren har skrivit: en rad, högst 200 tecken, utan styrtecken. @param {unknown} s */
export const rentMal = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

// ---------- Texterna ----------

const MANADER = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const MANAD_KORT = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MAND_KORT_ETT = (m) => MANAD_KORT[m - 1];
export const VECKODAGAR = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag'];
const delar = (s) => s.split('-').map(Number);
/** Målet som en mening: stor bokstav först och punkt sist, som "Kunna läsa mellan raderna." @param {string} [mal] */
export const malText = (mal) => {
  const t = rentMal(mal);
  if (!t) return '';
  const s = t.charAt(0).toLocaleUpperCase('sv') + t.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
};

/**
 * En text utan elevernas namn: varje namn i elevlistan och dess förnamn blir "en elev", och med genitivets s "en elevs",
 * också i lärarens egna meningar (granskningen 2026-10-24: "Bea behöver mer stöd vid stoppet" följde med texten som skulle
 * sakna namn). Texterna som kopieras till dokumentationen går genom den.
 * @param {string} text
 * @param {{ namn: string }[]} elever
 */
export function utanNamn(text, elever) {
  const namn = [...new Set((elever ?? []).flatMap((e) => { const n = String(e.namn ?? '').trim(); return [n, n.split(/\s+/)[0]]; }).filter((n) => n.length >= 2))].sort((a, b) => b.length - a.length);
  let ut = String(text ?? '');
  for (const n of namn) {
    // Utan lookbehind, som Safari före 16.4 inte kan: tecknet före namnet fångas och står kvar.
    const monster = new RegExp(`(^|[^\\p{L}\\p{N}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s?)(?![\\p{L}\\p{N}])`, 'giu');
    ut = ut.replace(monster, (_, fore, s) => `${fore}${s ? 'en elevs' : 'en elev'}`);
  }
  return ut.replace(/(^|[.!?:]\s+)en elev/g, (_, fore) => `${fore}En elev`);
}

/** "2 november 2026". @param {string} s */
export const datumText = (s) => { const [a, m, d] = delar(s); return `${d} ${MANADER[m - 1]} ${a}`; };
/** "2 november". @param {string} s */
export const dagOchManad = (s) => { const [, m, d] = delar(s); return `${d} ${MANADER[m - 1]}`; };
/** "måndag 2 november". @param {string} s */
export const dagText = (s) => `${VECKODAGAR[veckodag(s) - 1]} ${dagOchManad(s)}`;
/** "2–6 nov" eller "30 nov–4 dec". @param {string} fran @param {string} till */
export function spannKort(fran, till) {
  const [, m1, d1] = delar(fran), [, m2, d2] = delar(till);
  if (fran === till) return `${d1} ${MAND_KORT_ETT(m1)}`;
  return m1 === m2 ? `${d1}–${d2} ${MANAD_KORT[m1 - 1]}` : `${d1} ${MANAD_KORT[m1 - 1]}–${d2} ${MANAD_KORT[m2 - 1]}`;
}
/** "måndag, onsdag och fredag". @param {string[]} ord */
export const uppraknat = (ord) => (ord.length <= 1 ? ord.join('') : `${ord.slice(0, -1).join(', ')} och ${ord[ord.length - 1]}`);
const TALTEXT = ['noll', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv'];
/** Ett tal i ord upp till tolv, som i löptext. @param {number} n @param {boolean} [en] "en" i stället för "ett" */
export const talText = (n, en = false) => (n === 1 && en ? 'en' : TALTEXT[n] ?? String(n));
/** Veckans första och sista dag i planen: passens, eller måndag till fredag. @param {Plan} plan @param {PlanVecka} v */
export function veckansDagar(plan, v) {
  const datum = v.pass.map((n) => plan.pass[n - 1].datum).sort();
  return { fran: datum[0] ?? v.mandag, till: datum[datum.length - 1] ?? plusDagar(v.mandag, 4) };
}

// En rad i uppföljningen som heter efter insatsens vecka, som "Vecka 4", säger att det är insatsens vecka, så att den inte
// läses som kalenderveckan bredvid (de kalla testarna 2026-10-24: "Vecka 4, vecka 48").
const narIText = (nar) => (/^vecka \d+$/i.test(nar.trim()) ? `${nar.trim()} i insatsen` : nar);

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
 * @param {{ minuter: number, genomforda?: number, folj?: boolean }} o
 */
export function dokumentationstext(info, plan, val, o) {
  const rader = [];
  const forsta = (s) => s.charAt(0).toLocaleLowerCase('sv') + s.slice(1);
  // Undertitelns årskurser gäller metoden, inte eleven: "för åk 3–7" och "för F–6" (de kalla testarna 2026-10-24).
  const under = info.undertitel ? forsta(info.undertitel.replace(/\.$/, '').replace(/,?\s*för (?:åk\s*)?[F\d][\d–-]*(?:\s*(?:och|till)\s*\d+)?$/i, '')) : '';
  rader.push(`Åtgärd: ${info.titel}${under ? `, ${under}` : ''}.`);
  const mal = val.mal || info.mal;
  if (mal) rader.push(`Mål: ${malText(mal)}`);
  const dagar = dagarText(val);
  const v1 = plan.veckor[0]?.vecka.vecka, v2 = plan.veckor[plan.veckor.length - 1]?.vecka.vecka;
  // Samma år står en gång: "2 november till 11 december 2026".
  const fran = plan.forstaPass && plan.sistaPass && plan.forstaPass.slice(0, 4) === plan.sistaPass.slice(0, 4) ? dagOchManad(plan.forstaPass) : plan.forstaPass && datumText(plan.forstaPass);
  if (plan.forstaPass && plan.sistaPass) rader.push(`Omfattning: ${plan.pass.length} pass om ${minuterText(passensMinuter(val, o.minuter))} minuter, ${dagar}, ${fran} till ${datumText(plan.sistaPass)} (${kalenderveckor(v1, v2, ' till ')})${info.nivaNamn ? `, på nivån ${info.nivaNamn}` : ''}.`);
  // Det eleven arbetar med: metodens steg i planens ordning, med kalenderveckorna. Pass i följd med samma steg står ihop.
  /** @type {{ steg: number | null, fran: string, till: string }[]} */
  const grupper = [];
  for (const p of plan.pass) {
    const steg = p.steg ?? null;
    const sista = grupper[grupper.length - 1];
    if (sista && sista.steg === steg) sista.till = p.datum;
    else grupper.push({ steg, fran: p.datum, till: p.datum });
  }
  const innehall = grupper.filter((g) => g.steg !== null && info.steg?.[g.steg]).map((g) => {
    const a = isoVecka(g.fran).vecka, b = isoVecka(g.till).vecka;
    return `${String(info.steg?.[/** @type {number} */ (g.steg)]).replace(/[.;]\s*$/, '')} (${kalenderveckor(a, b)})`;
  });
  if (innehall.length) rader.push(`Eleven arbetar med: ${innehall.join('; ')}.`);
  // Uppföljningen efter heter Efter insatsen, så att texten inte säger metodens "Efter sex till åtta veckor" om en kortare
  // plan (buggjägarna 2026-10-25).
  const forstaEfter = plan.uppfoljning.find((u) => u.typ === 'efter')?.rad;
  const tider = plan.uppfoljning.flatMap((u) => {
    const nar = u.rad === forstaEfter ? 'Efter insatsen' : narIText(info.uppfoljning[u.rad]?.nar ?? '');
    if (!u.tillfallen.length) return u.typ === 'villkor' ? [] : [nar];
    return [`${nar}, ${uppraknat(u.tillfallen.map((t) => kalendervecka(isoVecka(t.datum).vecka)))}`];
  });
  if (tider.length) rader.push(`Uppföljning: ${tider.join('. ')}.`);
  if (o.folj) {
    const m = mittVeckan(plan);
    rader.push(`Skattning varje vecka, 1 till 5, av hur väl eleven klarar målet på egen hand${m ? `, med avstämning mitt i insatsen ${planveckansNamn(plan, plan.veckor[m - 1]).text}` : ''} och utvärdering efter insatsen.`);
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
  const text = (x, max) => (typeof x === 'string' ? x.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const id = (x) => typeof x === 'string' && /^[a-z0-9]{1,12}$/i.test(x);
  const steg = (x) => Number.isInteger(x) && x >= 1 && x <= 5;
  const per = (x, fn) => Object.fromEntries(Object.entries(obj(x)).flatMap(([k, v]) => { const ut = fn(k, v); return ut === undefined ? [] : [[k, ut]]; }));
  const g = obj(f);
  const elever = lista(g.elever).flatMap((e) => (id(e?.id) && text(e?.namn, 30) ? [{ id: e.id, namn: text(e.namn, 30) }] : []))
    .filter((e, i, alla) => alla.findIndex((x) => x.id === e.id) === i).slice(0, 12);
  const beslut = (x, tillatna) => {
    const b = obj(x), not = text(b.not, 200);
    return tillatna.includes(b.beslut) || not ? { ...(tillatna.includes(b.beslut) ? { beslut: b.beslut } : {}), ...(not ? { not } : {}) } : undefined;
  };
  const avstamning = beslut(g.avstamning, ['fortsatt', 'justera']), utvardering = beslut(g.utvardering, ['avsluta', 'forlang', 'byt']);
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
  };
}

/**
 * Veckan mitt i insatsen, då läraren stämmer av om eleverna rör sig i rätt riktning (Niclas 2026-10-24: "en mitt i
 * insatsen avstämning och check om man börjar röra sig i rätt riktning för det metoden tränar"): den första veckan i
 * planen med metodens mittersta vecka, eller veckan med det mittersta passet när perioden räknas i pass.
 * @param {Plan} plan
 */
export function mittVeckan(plan) {
  if (!plan.veckor.length) return null;
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
    const pass = v.pass.map((n) => plan.pass[n - 1]);
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
    slut: !!plan.sistaPass && idag > plan.sistaPass, mitt: mittVeckan(plan),
    avstamning: f.avstamning ?? null, utvardering: f.utvardering ?? null,
  };
}

/** Riktningen från första till senaste skattningen: upp, samma eller ned, och null med färre än två. @param {{ forsta: { varde: number } | null, senaste: { varde: number } | null, skattningar: unknown[] }} e */
export const riktning = (e) => (e.skattningar.length < 2 ? null : e.senaste.varde > e.forsta.varde ? 'upp' : e.senaste.varde < e.forsta.varde ? 'ned' : 'samma');
export const BESLUT = Object.freeze({ fortsatt: 'Fortsätt som planerat', justera: 'Justera insatsen', avsluta: 'Avsluta insatsen', forlang: 'Förläng insatsen', byt: 'Byt insats' });
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
    return m && u && typeof varde === 'string' && varde.trim() ? [{ nyckel, rad: u.rad, typ: u.typ, datum: m[2], varde: varde.trim() }] : [];
  }).sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.rad - b.rad));
}
const decimal = (n) => String(n).replace('.', ',');
const stor = (s) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);
const medel = (x) => (x.length ? Math.round((x.reduce((a, b) => a + b, 0) / x.length) * 10) / 10 : null);

/**
 * Sammanställningen som text till dokumentationen, utan elevernas namn: målet, passen som är bockade, skattningarna som
 * medel vid första och senaste tillfället, hur många som rör sig framåt, avstämningen, utvärderingen och uppföljningen.
 * @param {{ titel: string, mal?: string, uppfoljning: { nar: string }[] }} info
 * @param {Plan} plan
 * @param {ReturnType<typeof sammanstallning>} s
 */
export function sammanstallningstext(info, plan, s) {
  const rader = [];
  const samma = plan.forstaPass && plan.sistaPass && plan.forstaPass.slice(0, 4) === plan.sistaPass.slice(0, 4);
  if (plan.forstaPass && plan.sistaPass) rader.push(`Sammanställning: ${info.titel}, ${samma ? dagOchManad(plan.forstaPass) : datumText(plan.forstaPass)} till ${datumText(plan.sistaPass)}.`);
  if (info.mal) rader.push(`Mål: ${malText(info.mal)}`);
  const bort = [s.installda ? `${s.installda} pass ställdes in` : '', s.helgdagar ? `${s.helgdagar} föll på ${s.helgdagar === 1 ? 'en helgdag' : 'helgdagar'}` : ''].filter(Boolean);
  const pass = !s.gjorda ? `${s.planerade} i planen.` : s.slut ? `${s.gjorda} av ${s.planerade} är bockade som genomförda.` : !s.varit ? `${s.planerade} i planen. Inget pass har varit än.` :`${s.gjordaVarit} av de ${s.varit} som har varit är bockade som genomförda, av ${s.planerade} i planen.`;
  rader.push(`Pass: ${pass}${bort.length ? ` ${stor(uppraknat(bort))}.` : ''}`);
  const elever = s.elever.filter((e) => e.id !== GRUPPEN);
  const skattade = (s.grupp ? s.elever : elever).filter((e) => e.skattningar.length);
  if (skattade.length) {
    if (s.grupp) {
      const e = skattade[0];
      rader.push(`Skattning varje vecka, 1 till 5, av hur väl gruppen klarar målet på egen hand: ${e.skattningar.map((x) => `${veckansNamn(s.veckor[x.nr - 1]).text}: ${x.varde}`).join(', ')}.`);
    } else {
      const fore = medel(skattade.map((e) => e.forsta.varde)), sedan = medel(skattade.map((e) => e.senaste.varde));
      const upp = skattade.filter((e) => riktning(e) === 'upp').length;
      rader.push(`Skattning varje vecka, 1 till 5, av hur väl eleverna klarar målet på egen hand: medel ${decimal(fore)} vid första skattningen och ${decimal(sedan)} vid den senaste. ${upp} av ${skattade.length} elever har gått framåt.`);
    }
  }
  const gruppen = s.grupp ? null : s.elever.find((e) => e.id === GRUPPEN && e.skattningar.length);
  if (gruppen) rader.push(`Gruppen skattades också: ${gruppen.skattningar.map((x) => `${veckansNamn(s.veckor[x.nr - 1]).text}: ${x.varde}`).join(', ')}.`);
  if (s.narvaro && s.gjorda) {
    const borta = elever.filter((e) => e.narvaro < s.gjorda);
    rader.push(borta.length ? `Närvaro i de bockade passen: ${elever.length - borta.length} av ${elever.length} elever var med i alla; ${borta.length === 1 ? 'en elev' : `${borta.length} elever`} missade ${uppraknat(borta.map((e) => String(s.gjorda - e.narvaro)))} pass.` : `Närvaro i de bockade passen: alla elever var med i alla.`);
  }
  const veckorna = s.veckor.filter((v) => v.skattning);
  if (veckorna.length) rader.push(`Hur veckorna gick, 1 till 5: ${veckorna.map((v) => `${veckansNamn(v).text}: ${v.skattning}`).join(', ')}. Medel ${decimal(s.veckomedel)}.`);
  const noter = s.veckor.filter((v) => v.not);
  if (noter.length) rader.push(`Anteckningar: ${noter.map((v) => `${veckansNamn(v).text}: ${v.not.replace(/[.\s]+$/, '')}`).join('. ')}.`);
  // Beslutet och meningen, var för sig: en mening utan beslut kommer med (Codex 2026-10-24).
  const beslutet = (b) => [b.beslut ? BESLUT[b.beslut] ?? b.beslut : '', b.not ?? ''].map((x) => x.replace(/[.\s]+$/, '')).filter(Boolean).map((x) => `${x}.`).join(' ');
  if (s.avstamning?.beslut || s.avstamning?.not) rader.push(`Avstämning mitt i insatsen${s.mitt ? `, ${veckansNamn(s.veckor[s.mitt - 1]).text}` : ''}: ${beslutet(s.avstamning)}`);
  if (s.utvardering?.beslut || s.utvardering?.not) rader.push(`Utvärdering efter insatsen: ${beslutet(s.utvardering)}`);
  const efterRad = plan.uppfoljning.find((u) => u.typ === 'efter')?.rad;
  const tider = plan.uppfoljning.filter((u) => u.tillfallen.length).map((u) => `${u.rad === efterRad ? 'Efter insatsen' : narIText(info.uppfoljning[u.rad]?.nar ?? '')}, ${uppraknat(u.tillfallen.map((t) => kalendervecka(isoVecka(t.datum).vecka)))}`);
  if (tider.length) rader.push(`Uppföljning: ${tider.join('. ')}.`);
  return utanNamn(rader.join('\n'), elever);
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
  if (e.narvaro !== null && s.gjorda) delar.push(`Var med i ${e.narvaro} av ${s.gjorda} bockade pass.`);
  if (e.skattningar.length) delar.push(`Skattning, 1 till 5, av hur väl eleven klarar målet på egen hand: ${e.skattningar.map((x) => `${veckansNamn(s.veckor[x.nr - 1]).text}: ${x.varde}`).join(', ')}.`);
  for (const t of elevensResultat(plan, e.resultat)) delar.push(`${info.uppfoljning[t.rad]?.nar ?? ''}, ${kalendervecka(isoVecka(t.datum).vecka)}: ${t.varde.replace(/[.\s]+$/, '')}.`);
  return utanNamn(delar.join(' '), s.elever.filter((x) => x.id !== GRUPPEN));
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
    const fokus = steg !== null && steg !== undefined && info.fokus[steg] ? `\n${hel(/** @type {string} */ (info.fokus[steg]))}` : '';
    const passet = info.passet ? info.passet(p) : '';
    handelse(`${o.id}-p${p.nr}`, p.datum, `${info.titel}, pass ${p.nr} av ${plan.pass.length}${vem}`, `Vecka ${planveckansNamn(plan, v).plan} i planen.${fokus}${passet ? `\n${passet}` : ''}\nVeckan i planen: ${o.lank(v.nr)}`, o.lank(v.nr), tider[String(veckodag(passetsDag(p)))]);
  }
  for (const u of plan.uppfoljning) u.tillfallen.forEach((t, i) => {
    const fore = t.vecka === 0;
    const nar = (info.uppfoljning[u.rad]?.nar ?? '').toLocaleLowerCase('sv');
    handelse(`${o.id}-u${u.rad}-${i + 1}`, t.datum, `${info.titel}: ${fore ? `före första passet, ${nar}` : `uppföljning, ${nar}`}${vem}`, `${fore ? 'Före första passet' : 'Uppföljningen'} i planen: ${o.lank(fore ? 'fore' : t.vecka ?? undefined)}`, o.lank(fore ? 'fore' : t.vecka ?? undefined), undefined, fore ? 5 : 1);
  });
  rader.push('END:VCALENDAR');
  return rader.map(vik).join('\r\n') + '\r\n';
}

/**
 * @typedef {{ typ: 'fore' } | { typ: 'efter', veckor: number, till?: number } | { typ: 'lopande', enhet: 'pass' | 'vecka' } | { typ: 'intervall', var: number } | { typ: 'vecka', veckor: number[] } | { typ: 'sista-veckan' } | { typ: 'pass', pass: number[], till?: number } | { typ: 'sista-passet' } | { typ: 'villkor' }} Tid
 * @typedef {{ rad: number, fran: number, till?: number, vidBehov: boolean, efter?: true }} Steg
 * @typedef {{ typ: 'vecka', plats: number | 'sista' | 'ovriga' } | { typ: 'pass', fran: number, till?: number } | { typ: 'sista' } | { typ: 'veckor', fran: number, till: number }} PassensNar
 * @typedef {{ takt: { min: number, max: number }, minuter: { min: number, max: number }, period: { min: number, max?: number, enhet: 'veckor' | 'pass', mer: boolean, perKurs: boolean }, stegEnhet: 'veckor' | 'pass', steg: Steg[], uppfoljning: { rad: number, tid: Tid }[], passen: { rad: number, nar: PassensNar }[] }} Metodplan
 * @typedef {{ start: string, dagar: number[], langd: number, niva?: string, borja?: number, minuter?: number, lov?: string[], upprepa?: number[], flytta?: Record<string, string>, stryk?: string[], tider?: Record<string, [string, string]>, mal?: string }} Val
 * @typedef {{ nr: number, datum: string, vecka: number, steg?: number | null, flyttatFran?: string }} Pass
 * @typedef {{ nr: number, innehall: number, igen: boolean, mandag: string, vecka: { ar: number, vecka: number }, pass: number[], bortfall: { datum: string, varfor: 'helgdag' | 'installt', namn?: string }[], steg?: number | null }} PlanVecka
 * @typedef {{ start: string, enhet: 'veckor' | 'pass', borja: number, forstaPass?: string, sistaPass?: string, sistaNr?: number, efter: string, pass: Pass[], veckor: PlanVecka[], lovveckor: string[], uppfoljning: { rad: number, typ: Tid['typ'], tillfallen: { datum: string, vecka: number | null }[] }[], fore: { mandag: string, overLov: boolean }, efterSteg?: number }} Plan
 * @typedef {{ gjorda?: string[], elever?: { id: string, namn: string }[], narvaro?: boolean, franvaro?: Record<string, string[]>, vecka?: Record<string, { varde?: number, not?: string }>, skattning?: Record<string, Record<string, number>>, resultat?: Record<string, Record<string, string>>, avstamning?: { beslut?: string, not?: string }, utvardering?: { beslut?: string, not?: string } }} Foljd
 */
