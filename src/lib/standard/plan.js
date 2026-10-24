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

// Planens fält i metodens fil: `plan` överst, `tid` på uppföljningens rader och `taggar` och `rubrik` på progressionens.
const PLANENS_RADER = { uppfoljning: ['tid'], progression: ['taggar', 'rubrik'] };

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
    const [fran, till] = [tal(m[2]), tal(m[3])];
    if (!(till > fran)) return null;
    return m[1] === 'vecka' ? { typ: 'vecka', veckor: Array.from({ length: till - fran + 1 }, (_, i) => fran + i) } : { typ: 'pass', pass: [fran], till };
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
 * "9–10 vid behov", "6 till det sista", "Vecka 3", "Pass 2–6", "Från pass 11". till saknas när raden gäller till slutet.
 * @param {unknown} text
 * @returns {{ fran: number, till?: number, vidBehov: boolean } | null}
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
  return null;
}

/**
 * Metodens plan ur dess fält: hur ofta och hur länge (faktarutans tid och period, som standarden läser), progressionens
 * steg och uppföljningens tider. En metod kan planeras när varje rad i uppföljningen har `tid` och varje fält går att
 * läsa; annars ger fel vad som saknas, så att sajten kan stanna bygget och riggen skriva det i sin rapport.
 * @param {{ tid?: string, period?: string, progression?: { enhet?: string, rader: { vecka: string, taggar?: string[] }[] }, uppfoljning?: { rader: { nar: string, tid?: string }[] } }} d
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
    },
  };
}

/** Felen som stoppar en metod som ska kunna planeras. @param {Parameters<typeof metodplan>[0]} d */
export const planFel = (d) => metodplan(d).fel;

// ---------- Planen ----------

const FORVALDA_DAGAR = { 1: [3], 2: [2, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] };

/**
 * Planens förval: första passet nästa måndag, metodens minsta antal pass i veckan på jämnt fördelade dagar, och den
 * kortaste perioden.
 * @param {Metodplan} mp
 * @param {string} idag
 * @returns {Val}
 */
export function forval(mp, idag) {
  const ganger = Math.min(5, Math.max(1, mp.takt.min));
  return { start: plusDagar(mandagen(idag), 7), dagar: FORVALDA_DAGAR[ganger], langd: mp.period.min, lov: [], upprepa: [], flytta: {}, stryk: [] };
}

/**
 * Passen, veckorna och uppföljningen med datum. Veckorna i planen är metodens veckor i den ordning gruppen tar dem: en
 * vecka som upprepas kommer en gång till direkt efter sig själv, och en lovvecka hoppas över. Ett pass på en dag då
 * skolan är stängd eller som läraren har ställt in faller bort och står kvar som bortfall i sin vecka. Ett flyttat pass
 * behåller sitt nummer och sitt innehåll. Är metodens period räknad i pass, planeras så många pass.
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
  // Veckornas ordning: metodens veckor, varje upprepning direkt efter veckan den upprepar.
  /** @type {{ innehall: number, igen: boolean }[]} */
  const ordning = [];
  if (!iPass) {
    const upprepa = (val.upprepa ?? []).filter((x) => x >= 1 && x <= langd);
    for (let c = 1; c <= langd; c++) {
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
  let mandag = mandagen(val.start);
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
  const forstaPass = pass[0]?.datum;
  const sistaPass = pass[pass.length - 1]?.datum;
  // Efter insatsen: första veckan efter den sista som inte är lov.
  const efter = nastaMandag();
  // Varje pass hör till ett steg i progressionen: efter veckans plats i metoden, eller passets nummer.
  const stegFor = (nr) => mp.steg.find((s) => nr >= s.fran && (s.till === undefined || nr <= s.till));
  for (const v of veckor) v.steg = mp.stegEnhet === 'veckor' ? stegFor(v.innehall)?.rad ?? null : null;
  for (const p of pass) p.steg = mp.stegEnhet === 'pass' ? stegFor(p.nr)?.rad ?? null : veckor[p.vecka - 1].steg;
  const sistaIVeckan = (v) => (v.pass.length ? pass[v.pass[v.pass.length - 1] - 1].datum : plusDagar(v.mandag, 4));
  const uppfoljning = mp.uppfoljning.map(({ rad, tid }) => {
    /** @type {{ datum: string, vecka: number | null }[]} */
    let tillfallen = [];
    if (tid.typ === 'fore' && forstaPass) tillfallen = [{ datum: forstaPass, vecka: 1 }];
    else if (tid.typ === 'efter') tillfallen = [{ datum: plusDagar(efter, tid.veckor * 7), vecka: null }];
    else if (tid.typ === 'intervall') tillfallen = veckor.filter((v) => v.nr % tid.var === 0).map((v) => ({ datum: sistaIVeckan(v), vecka: v.nr }));
    else if (tid.typ === 'vecka') tillfallen = tid.veckor.flatMap((n) => { const v = [...veckor].reverse().find((x) => x.innehall === n); return v ? [{ datum: sistaIVeckan(v), vecka: v.nr }] : []; });
    else if (tid.typ === 'sista-veckan' && veckor.length) { const v = veckor[veckor.length - 1]; tillfallen = [{ datum: sistaIVeckan(v), vecka: v.nr }]; }
    else if (tid.typ === 'pass') tillfallen = tid.pass.flatMap((n) => (pass[n - 1] ? [{ datum: pass[n - 1].datum, vecka: pass[n - 1].vecka }] : []));
    else if (tid.typ === 'sista-passet' && sistaPass) tillfallen = [{ datum: sistaPass, vecka: pass[pass.length - 1].vecka }];
    return { rad, typ: tid.typ, tillfallen };
  });
  return { start: val.start, enhet: iPass ? 'pass' : 'veckor', forstaPass, sistaPass, efter, pass, veckor, lovveckor, uppfoljning };
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
 * Valen som länk: allt som avgör planen, och planens id, men aldrig gruppens namn. Länken står efter # och skickas därför
 * aldrig till servern eller till besöksstatistiken.
 * @param {Val} val
 * @param {{ id?: string, visa?: number }} [extra]
 */
export function kodaVal(val, extra = {}) {
  const delar = [`s=${val.start}`, `d=${[...val.dagar].sort().join('')}`, `l=${val.langd}`];
  if (val.niva) delar.push(`n=${val.niva}`);
  if (val.minuter) delar.push(`m=${val.minuter}`);
  if (val.lov?.length) delar.push(`lov=${[...val.lov].sort().join('.')}`);
  if (val.upprepa?.length) delar.push(`u=${[...val.upprepa].sort((a, b) => a - b).join('.')}`);
  const f = Object.entries(val.flytta ?? {}).filter(([a, b]) => arDatum(a) && arDatum(b)).sort();
  if (f.length) delar.push(`f=${f.map(([a, b]) => `${a}~${b}`).join('.')}`);
  if (val.stryk?.length) delar.push(`x=${[...val.stryk].sort().join('.')}`);
  if (extra.id) delar.push(`p=${extra.id}`);
  if (extra.visa) delar.push(`v=${extra.visa}`);
  return delar.join('&');
}

/**
 * Valen ur en länk, eller null när länken inte är en plan. Ett värde som inte går att läsa tas bort, så att en trasig
 * länk aldrig ger en felaktig plan.
 * @param {string} hash
 * @returns {{ val: Val, id?: string, visa?: number } | null}
 */
export function lasVal(hash) {
  const p = new URLSearchParams(String(hash ?? '').replace(/^#/, ''));
  const start = p.get('s');
  const dagar = [...new Set((p.get('d') ?? '').split('').map(Number).filter((x) => x >= 1 && x <= 5))].sort();
  const langd = Number(p.get('l'));
  if (!arDatum(start) || !dagar.length || !Number.isInteger(langd) || langd < 1 || langd > 60) return null;
  const punkter = (k) => (p.get(k) ?? '').split('.').filter(Boolean);
  const niva = p.get('n') ?? '';
  const minuter = Number(p.get('m'));
  const id = p.get('p') ?? '';
  const visa = Number(p.get('v'));
  /** @type {Val} */
  const val = {
    start, dagar, langd,
    lov: punkter('lov').filter((x) => /^\d{4}-\d{2}$/.test(x)),
    upprepa: punkter('u').map(Number).filter((x) => Number.isInteger(x) && x >= 1 && x <= langd),
    flytta: Object.fromEntries(punkter('f').map((x) => x.split('~')).filter(([a, b]) => arDatum(a) && arDatum(b))),
    stryk: punkter('x').filter(arDatum),
    ...(/^[a-z0-9-]{1,30}$/.test(niva) ? { niva } : {}),
    ...(Number.isInteger(minuter) && minuter >= 5 && minuter <= 240 ? { minuter } : {}),
  };
  return { val, ...(/^[a-z0-9]{4,12}$/.test(id) ? { id } : {}), ...(Number.isInteger(visa) && visa >= 1 && visa <= 80 ? { visa } : {}) };
}

// ---------- Texterna ----------

const MANADER = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const MANAD_KORT = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export const VECKODAGAR = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag'];
const delar = (s) => s.split('-').map(Number);
/** "2 november 2026". @param {string} s */
export const datumText = (s) => { const [a, m, d] = delar(s); return `${d} ${MANADER[m - 1]} ${a}`; };
/** "2 november". @param {string} s */
export const dagOchManad = (s) => { const [, m, d] = delar(s); return `${d} ${MANADER[m - 1]}`; };
/** "måndag 2 november". @param {string} s */
export const dagText = (s) => `${VECKODAGAR[veckodag(s) - 1]} ${dagOchManad(s)}`;
/** "2–6 nov" eller "30 nov–4 dec". @param {string} fran @param {string} till */
export function spannKort(fran, till) {
  const [, m1, d1] = delar(fran), [, m2, d2] = delar(till);
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

/**
 * Texten som läraren klistrar in i skolans dokumentation: insatsen, omfattningen med datum, målen och uppföljningen. Den
 * säger det planerade, och hur många pass som är genomförda när läraren har bockat dem.
 * @param {{ titel: string, undertitel?: string, adress: string, mal?: { punkter: string[] }, uppfoljning: { nar: string }[], nivaNamn?: string }} info
 * @param {Plan} plan
 * @param {Val} val
 * @param {{ minuter: number, genomforda?: number }} o
 */
export function dokumentationstext(info, plan, val, o) {
  const rader = [];
  const forsta = (s) => s.charAt(0).toLocaleLowerCase('sv') + s.slice(1);
  rader.push(`Insats: ${info.titel}${info.undertitel ? `, ${forsta(info.undertitel.replace(/\.$/, ''))}` : ''}.`);
  const dagar = uppraknat([...val.dagar].sort().map((d) => VECKODAGAR[d - 1]));
  const v1 = plan.veckor[0]?.vecka.vecka, v2 = plan.veckor[plan.veckor.length - 1]?.vecka.vecka;
  // Samma år står en gång: "2 november till 11 december 2026".
  const fran = plan.forstaPass && plan.sistaPass && plan.forstaPass.slice(0, 4) === plan.sistaPass.slice(0, 4) ? dagOchManad(plan.forstaPass) : plan.forstaPass && datumText(plan.forstaPass);
  if (plan.forstaPass && plan.sistaPass) rader.push(`Omfattning: ${plan.pass.length} pass om ${o.minuter} minuter, ${dagar}, ${fran} till ${datumText(plan.sistaPass)} (vecka ${v1}${v2 !== v1 ? ` till ${v2}` : ''})${info.nivaNamn ? `, på nivån ${info.nivaNamn}` : ''}.`);
  // Målen skiljs med semikolon, eftersom ett mål kan ha ett kommatecken i sig.
  if (info.mal?.punkter.length) rader.push(`Mål: eleven ska oftare kunna ${info.mal.punkter.map((p) => forsta(p.replace(/[.;]$/, ''))).join('; ')}.`);
  const tider = plan.uppfoljning.flatMap((u) => {
    const nar = info.uppfoljning[u.rad]?.nar ?? '';
    if (!u.tillfallen.length) return u.typ === 'villkor' ? [] : [nar];
    return [`${nar}, ${uppraknat(u.tillfallen.map((t) => `vecka ${isoVecka(t.datum).vecka}`))}`];
  });
  if (tider.length) rader.push(`Uppföljning: ${tider.join('. ')}.`);
  if (o.genomforda !== undefined) rader.push(`Genomfört: ${o.genomforda} av ${plan.pass.length} pass.`);
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
 * förmåga självmant"): hur väl eleven klarar förmågan på egen hand. Stegen har korta namn, så att två lärare skattar lika.
 */
export const SKALAN = Object.freeze(['Inte än', 'Med mycket stöd', 'Med visst stöd', 'Oftast själv', 'Själv och säkert']);
/** Frågan till skattningen, med metodens förmåga ("läsa mellan raderna") eller utan. @param {string} [formaga] @param {boolean} [grupp] */
export const skattningsfragan = (formaga, grupp = false) => `Hur väl klarar ${grupp ? 'gruppen' : 'eleven'} ${formaga ? `att ${formaga}` : 'det ni tränar'} på egen hand?`;
/** Gruppens nyckel i skattningen, när läraren följer insatsen utan elevlista. */
export const GRUPPEN = 'grupp';

/**
 * Veckan mitt i insatsen, då läraren stämmer av om eleverna rör sig i rätt riktning (Niclas 2026-10-24: "en mitt i
 * insatsen avstämning och check om man börjar röra sig i rätt riktning för det metoden tränar"): den första veckan i
 * planen med metodens mittersta vecka, eller veckan med det mittersta passet när perioden räknas i pass.
 * @param {Plan} plan
 */
export function mittVeckan(plan) {
  if (!plan.veckor.length) return null;
  if (plan.enhet === 'pass') return plan.pass[Math.ceil(plan.pass.length / 2) - 1]?.vecka ?? null;
  const sista = Math.max(...plan.veckor.map((v) => v.innehall));
  return plan.veckor.find((v) => v.innehall === Math.ceil(sista / 2))?.nr ?? null;
}

/**
 * Sammanställningen när läraren följer insatsen: passen som blev av vecka för vecka, varje elevs skattning vecka för
 * vecka (eller gruppens), avstämningen mitt i och utvärderingen efter, och resultaten i metodens egen uppföljning. Det
 * som läraren inte har fört in räknas inte.
 * @param {Plan} plan
 * @param {Foljd} f
 * @param {string} idag
 */
export function sammanstallning(plan, f, idag) {
  const gjorda = new Set(f.gjorda ?? []);
  const gjort = (p) => gjorda.has(passetsDag(p));
  const vem = (f.elever ?? []).length ? f.elever : [{ id: GRUPPEN, namn: 'Gruppen' }];
  const veckor = plan.veckor.map((v) => {
    const pass = v.pass.map((n) => plan.pass[n - 1]);
    return {
      nr: v.nr, mandag: v.mandag, vecka: v.vecka.vecka, innehall: v.innehall, igen: v.igen, pass: pass.map((p) => ({ nr: p.nr, dag: passetsDag(p), datum: p.datum, gjort: gjort(p) })),
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
      // Närvaron räknas på passen som blev av: alla är med tills läraren har tryckt på den som inte var där.
      narvaro: passGjorda.filter((p) => !(f.franvaro?.[passetsDag(p)] ?? []).includes(e.id)).length,
      resultat: Object.fromEntries(Object.entries(f.resultat ?? {}).map(([k, r]) => [k, (r ?? {})[e.id] ?? ''])),
    };
  });
  return {
    veckor, elever, grupp: !(f.elever ?? []).length,
    planerade: plan.pass.length, gjorda: passGjorda.length, varit: plan.pass.filter((p) => p.datum <= idag).length,
    veckomedel: medel(veckor.filter((v) => v.skattning).map((v) => v.skattning)),
    installda: veckor.reduce((a, v) => a + v.installda, 0), helgdagar: veckor.reduce((a, v) => a + v.helgdagar, 0),
    slut: !!plan.sistaPass && idag > plan.sistaPass, mitt: mittVeckan(plan),
    avstamning: f.avstamning ?? null, utvardering: f.utvardering ?? null,
  };
}

/** Riktningen från första till senaste skattningen: upp, samma eller ned, och null med färre än två. @param {{ forsta: { varde: number } | null, senaste: { varde: number } | null, skattningar: unknown[] }} e */
export const riktning = (e) => (e.skattningar.length < 2 ? null : e.senaste.varde > e.forsta.varde ? 'upp' : e.senaste.varde < e.forsta.varde ? 'ned' : 'samma');
export const BESLUT = Object.freeze({ fortsatt: 'Fortsätt som planerat', justera: 'Justera insatsen', avsluta: 'Avsluta insatsen', forlang: 'Förläng insatsen', byt: 'Byt insats' });
/** Uppföljningens tillfällen med datum, med sin nyckel för elevernas resultat ("0-0": radens nummer och tillfällets). @param {Plan} plan */
export const uppfoljningensTillfallen = (plan) => plan.uppfoljning.flatMap((u) => u.tillfallen.map((t, i) => ({ nyckel: `${u.rad}-${i}`, rad: u.rad, datum: t.datum, vecka: t.vecka })));
const decimal = (n) => String(n).replace('.', ',');
const stor = (s) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);
const medel = (x) => (x.length ? Math.round((x.reduce((a, b) => a + b, 0) / x.length) * 10) / 10 : null);

/**
 * Sammanställningen som text till dokumentationen, utan elevernas namn: passen som blev av, skattningarna som medel vid
 * första och senaste tillfället, hur många som rör sig framåt, avstämningen, utvärderingen och uppföljningen.
 * @param {{ titel: string, formaga?: string, uppfoljning: { nar: string }[] }} info
 * @param {Plan} plan
 * @param {ReturnType<typeof sammanstallning>} s
 */
export function sammanstallningstext(info, plan, s) {
  const rader = [];
  const samma = plan.forstaPass && plan.sistaPass && plan.forstaPass.slice(0, 4) === plan.sistaPass.slice(0, 4);
  if (plan.forstaPass && plan.sistaPass) rader.push(`Sammanställning: ${info.titel}, ${samma ? dagOchManad(plan.forstaPass) : datumText(plan.forstaPass)} till ${datumText(plan.sistaPass)}.`);
  const bort = [s.installda ? `${s.installda} pass ställdes in` : '', s.helgdagar ? `${s.helgdagar} föll på ${s.helgdagar === 1 ? 'en helgdag' : 'helgdagar'}` : ''].filter(Boolean);
  rader.push(`Pass: ${s.slut ? `${s.gjorda} av ${s.planerade} blev av.` : `${s.gjorda} av de ${s.varit} pass som har varit blev av, av ${s.planerade} i planen.`}${bort.length ? ` ${stor(uppraknat(bort))}.` : ''}`);
  const skattade = s.elever.filter((e) => e.skattningar.length);
  if (skattade.length) {
    const vad = info.formaga ? `att ${info.formaga}` : 'det de tränar';
    if (s.grupp) {
      const e = skattade[0];
      rader.push(`Skattning varje vecka, 1 till 5, av hur väl gruppen klarar ${vad} på egen hand: ${e.skattningar.map((x) => `vecka ${x.vecka}: ${x.varde}`).join(', ')}.`);
    } else {
      const fore = medel(skattade.map((e) => e.forsta.varde)), sedan = medel(skattade.map((e) => e.senaste.varde));
      const upp = skattade.filter((e) => riktning(e) === 'upp').length;
      rader.push(`Skattning varje vecka, 1 till 5, av hur väl eleverna klarar ${vad} på egen hand: medel ${decimal(fore)} vid första skattningen och ${decimal(sedan)} vid den senaste. ${upp} av ${skattade.length} elever har gått framåt.`);
    }
  }
  const narvaro = s.grupp || !s.gjorda ? [] : s.elever.filter((e) => e.narvaro < s.gjorda);
  if (!s.grupp && s.gjorda) rader.push(narvaro.length ? `Närvaro: ${s.elever.length - narvaro.length} av ${s.elever.length} elever var med i alla pass som blev av; ${narvaro.length === 1 ? 'en elev' : `${narvaro.length} elever`} missade ${uppraknat(narvaro.map((e) => String(s.gjorda - e.narvaro)))} pass.` : `Närvaro: alla elever var med i alla pass som blev av.`);
  const veckorna = s.veckor.filter((v) => v.skattning);
  if (veckorna.length) rader.push(`Hur veckorna gick, 1 till 5: ${veckorna.map((v) => `vecka ${v.vecka}: ${v.skattning}`).join(', ')}. Medel ${decimal(s.veckomedel)}.`);
  const noter = s.veckor.filter((v) => v.not);
  if (noter.length) rader.push(`Anteckningar: ${noter.map((v) => `vecka ${v.vecka}: ${v.not.replace(/[.\s]+$/, '')}`).join('. ')}.`);
  if (s.avstamning?.beslut) rader.push(`Avstämning mitt i insatsen${s.mitt ? `, vecka ${plan.veckor[s.mitt - 1].vecka.vecka}` : ''}: ${BESLUT[s.avstamning.beslut] ?? s.avstamning.beslut}.${s.avstamning.not ? ` ${s.avstamning.not.replace(/[.\s]+$/, '')}.` : ''}`);
  if (s.utvardering?.beslut) rader.push(`Utvärdering efter insatsen: ${BESLUT[s.utvardering.beslut] ?? s.utvardering.beslut}.${s.utvardering.not ? ` ${s.utvardering.not.replace(/[.\s]+$/, '')}.` : ''}`);
  const tider = plan.uppfoljning.filter((u) => u.tillfallen.length).map((u) => `${info.uppfoljning[u.rad]?.nar ?? ''}, ${uppraknat(u.tillfallen.map((t) => `vecka ${isoVecka(t.datum).vecka}`))}`);
  if (tider.length) rader.push(`Uppföljning: ${tider.join('. ')}.`);
  return rader.join('\n');
}

/**
 * En elevs rad, utan namnet, för elevens egen dokumentation: skattningen vecka för vecka och resultaten i metodens
 * uppföljning.
 * @param {{ formaga?: string, uppfoljning: { nar: string }[] }} info
 * @param {Plan} plan
 * @param {ReturnType<typeof sammanstallning>} s
 * @param {string} id
 */
export function elevtext(info, plan, s, id) {
  const e = s.elever.find((x) => x.id === id);
  if (!e) return '';
  const delar = [];
  if (s.gjorda) delar.push(`Var med i ${e.narvaro} av ${s.gjorda} pass som blev av.`);
  if (e.skattningar.length) delar.push(`Skattning, 1 till 5, av hur väl eleven klarar ${info.formaga ? `att ${info.formaga}` : 'det eleven tränar'} på egen hand: ${e.skattningar.map((x) => `vecka ${x.vecka}: ${x.varde}`).join(', ')}.`);
  for (const t of uppfoljningensTillfallen(plan)) if (e.resultat[t.nyckel]) delar.push(`${info.uppfoljning[t.rad]?.nar ?? ''}, vecka ${isoVecka(t.datum).vecka}: ${e.resultat[t.nyckel].replace(/[.\s]+$/, '')}.`);
  return delar.join(' ');
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
 * Kalenderfilen: en heldagshändelse för varje vecka i planen, på veckans första pass, och en för varje tillfälle i
 * uppföljningen som har ett datum. Varje händelse länkar till sin vecka i planen. Samma plan ger samma id (UID), så att en
 * kalender som läser filen igen kan känna igen händelserna; SEQUENCE växer med tiden, så att den senaste filen gäller.
 * @param {{ titel: string, uppfoljning: { nar: string }[], fokus: (string | null)[] }} info
 * @param {Plan} plan
 * @param {{ id: string, lank: (vecka?: number) => string, namn?: string, nu: Date }} o
 */
export function kalenderfil(info, plan, o) {
  const stamp = o.nu.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const sekvens = Math.max(0, Math.floor((o.nu.getTime() - Date.UTC(2026, 0, 1)) / 60000));
  const vem = o.namn ? ` (${o.namn})` : '';
  const rader = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//niclasfohlin.se//Planera insatsen//SV', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const handelse = (uid, datum, titel, text, lank) => {
    rader.push('BEGIN:VEVENT', `UID:${uid}@niclasfohlin.se`, `DTSTAMP:${stamp}`, `SEQUENCE:${sekvens}`, `DTSTART;VALUE=DATE:${kalDatum(datum)}`, `DTEND;VALUE=DATE:${kalDatum(plusDagar(datum, 1))}`,
      `SUMMARY:${kalText(titel)}`, `DESCRIPTION:${kalText(text)}`, `URL:${lank}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
  };
  for (const v of plan.veckor) {
    const { fran } = veckansDagar(plan, v);
    const passen = v.pass.length ? `Pass ${uppraknat(v.pass.map(String))}: ${uppraknat(v.pass.map((n) => dagText(plan.pass[n - 1].datum)))}.` : 'Inga pass den här veckan.';
    const fokus = v.steg !== null && v.steg !== undefined && info.fokus[v.steg] ? `\n${postensRad(info.fokus[v.steg], 160)}` : '';
    handelse(`${o.id}-v${v.nr}`, fran, `${info.titel}, vecka ${v.innehall} i planen${v.igen ? ' igen' : ''}${vem}`, `${passen}${fokus}\nVeckan i planen: ${o.lank(v.nr)}`, o.lank(v.nr));
  }
  for (const u of plan.uppfoljning) u.tillfallen.forEach((t, i) => {
    handelse(`${o.id}-u${u.rad}-${i + 1}`, t.datum, `${info.titel}: uppföljning, ${(info.uppfoljning[u.rad]?.nar ?? '').toLocaleLowerCase('sv')}${vem}`, `Uppföljningen i planen: ${o.lank(t.vecka ?? undefined)}`, o.lank(t.vecka ?? undefined));
  });
  rader.push('END:VCALENDAR');
  return rader.map(vik).join('\r\n') + '\r\n';
}

/**
 * @typedef {{ typ: 'fore' } | { typ: 'efter', veckor: number, till?: number } | { typ: 'lopande', enhet: 'pass' | 'vecka' } | { typ: 'intervall', var: number } | { typ: 'vecka', veckor: number[] } | { typ: 'sista-veckan' } | { typ: 'pass', pass: number[], till?: number } | { typ: 'sista-passet' } | { typ: 'villkor' }} Tid
 * @typedef {{ rad: number, fran: number, till?: number, vidBehov: boolean }} Steg
 * @typedef {{ takt: { min: number, max: number }, minuter: { min: number, max: number }, period: { min: number, max?: number, enhet: 'veckor' | 'pass', mer: boolean, perKurs: boolean }, stegEnhet: 'veckor' | 'pass', steg: Steg[], uppfoljning: { rad: number, tid: Tid }[] }} Metodplan
 * @typedef {{ start: string, dagar: number[], langd: number, niva?: string, minuter?: number, lov?: string[], upprepa?: number[], flytta?: Record<string, string>, stryk?: string[] }} Val
 * @typedef {{ nr: number, datum: string, vecka: number, steg?: number | null, flyttatFran?: string }} Pass
 * @typedef {{ nr: number, innehall: number, igen: boolean, mandag: string, vecka: { ar: number, vecka: number }, pass: number[], bortfall: { datum: string, varfor: 'helgdag' | 'installt', namn?: string }[], steg?: number | null }} PlanVecka
 * @typedef {{ start: string, enhet: 'veckor' | 'pass', forstaPass?: string, sistaPass?: string, efter: string, pass: Pass[], veckor: PlanVecka[], lovveckor: string[], uppfoljning: { rad: number, typ: Tid['typ'], tillfallen: { datum: string, vecka: number | null }[] }[] }} Plan
 * @typedef {{ gjorda?: string[], elever?: { id: string, namn: string }[], franvaro?: Record<string, string[]>, vecka?: Record<string, { varde?: number, not?: string }>, skattning?: Record<string, Record<string, number>>, resultat?: Record<string, Record<string, string>>, avstamning?: { beslut?: string, not?: string }, utvardering?: { beslut?: string, not?: string } }} Foljd
 */
