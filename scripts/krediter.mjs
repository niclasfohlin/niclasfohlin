#!/usr/bin/env node
// Netlify-krediterna: saldot, vad som drar dem och kreditspärren före uppladdning.
//
//   npm run krediter                       saldot, förbrukningen per mätare, det löpande per dygn och spärren
//   npm run krediter -- trafik [timmar]    vad trafiken består av: besökare, adresser och filtyper (förval 24)
//   node scripts/krediter.mjs --rad        en rad till krokarna: vid varje nytt uppdrag och efter kompaktering
//   node scripts/krediter.mjs --grind      raden, och slutkod 1 när spärren är stängd, 3 när saldot inte gick
//                                          att läsa (kroken .claude/hooks/skydda-main.mjs före uppladdning)
//
// Kreditspärren (Niclas 2026-09-27): vid 100 krediter kvar laddas inget upp till sajten. Spärren stänger när
// nästa produktionsbygge, 15 krediter, skulle ta saldot under 100. Då fortsätter arbetet lokalt som vanligt,
// med grenar, npm run validera och sammanslagning till main, men main pushas inte. Det som väntar
// säkerhetskopieras till grenen vantar-pa-krediter, som Netlify inte bygger, och laddas upp med en enda push
// när krediterna är påfyllda. Hela gången står i DRIFT.md under Krediter.
//
// Saldot och trafiken läses ur samma anrop som Netlifys egen panel använder (Usage & billing och
// Observability). De är odokumenterade: Netlifys öppna API redovisar inga krediter (2026-09-27).
// Nyckeln är Netlify CLI:s inloggning; den skrivs aldrig ut.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GOLV = 100;
export const BYGGE = 15;
export const VANTGREN = 'vantar-pa-krediter';
const TEAM = 'niclas-fohlin';
const SITE = '8af49398-3862-4b58-84a6-88f68d0064c1';
const API = 'https://api.netlify.com/api/v1';
const DYGN = 86400000;
const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Senaste avläsningen, så att raden vid varje nytt uppdrag inte frågar Netlify oftare än var tionde minut.
const CACHE = join(rot, '.claude', 'krediter.local.json');
const CACHE_MS = 10 * 60 * 1000;

const lasToken = () => {
  const filer = [
    process.env.APPDATA && join(process.env.APPDATA, 'netlify', 'Config', 'config.json'),
    join(homedir(), 'Library', 'Preferences', 'netlify', 'config.json'),
    join(homedir(), '.config', 'netlify', 'config.json'),
  ].filter(Boolean);
  const fil = filer.find((f) => existsSync(f));
  const c = fil ? JSON.parse(readFileSync(fil, 'utf8')) : {};
  const token = c.users?.[c.userId]?.auth?.token;
  if (!token) throw new Error('Netlify CLI är inte inloggad (netlify login)');
  return token;
};

const anrop = async (token, vag, body) => {
  const r = await fetch(API + vag, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`Netlify svarade ${r.status} på ${vag.split('?')[0]}`);
  return r.json();
};

const tal = (x) => Number(x) || 0;

// Saldot, förbrukningen per mätare sedan perioden började och det löpande per dygn: allt utom byggen,
// snittet för de tre senaste hela dygnen (UTC), så att en ändring av trafiken syns inom några dagar.
export const lasKrediter = async () => {
  const token = lasToken();
  const [saldo, matare, dagar, grenar] = await Promise.all([
    anrop(token, `/${TEAM}/billing/credits`),
    anrop(token, `/${TEAM}/billing/credit_usage`),
    anrop(token, `/${TEAM}/credit_usage_insights`),
    anrop(token, `/sites/${SITE}/database/branches`).catch(() => null),
  ]);
  if (!saldo?.plan_credits) throw new Error('Netlify redovisade inget saldo (har planen bytts?)');
  const block = (saldo.active_credit_blocks ?? []).find((b) => b.subscription_allocation) ?? (saldo.active_credit_blocks ?? [])[0] ?? {};
  const idag = new Date().toISOString().slice(0, 10);
  const hela = (Array.isArray(dagar) ? dagar : []).filter((d) => d.date < idag).slice(-3);
  const lopande = hela.map((d) => (d.usage ?? []).filter((u) => u.metric_id !== 'production_deploys').reduce((s, u) => s + tal(u.credit_cost), 0));
  return {
    kvar: tal(saldo.plan_credits.available) + tal(saldo.credit_addons?.available),
    totalt: tal(saldo.plan_credits.total) + tal(saldo.credit_addons?.total),
    anvant: tal(saldo.plan_credits.used) + tal(saldo.credit_addons?.used),
    start: block.effective_date ?? null,
    slut: block.expiry_date ?? null,
    perDygn: lopande.length ? lopande.reduce((a, b) => a + b, 0) / lopande.length : 0,
    matare: Object.fromEntries(Object.entries(matare ?? {}).map(([k, v]) => [k, { krediter: tal(v?.credits_used), mangd: tal(v?.usage_used) }])),
    grenar: grenar ? tolkaGrenar(grenar) : null,
    last: new Date().toISOString(),
  };
};

const lasCache = () => {
  try {
    const c = JSON.parse(readFileSync(CACHE, 'utf8'));
    return Date.now() - Date.parse(c.last) < CACHE_MS ? c : null;
  } catch { return null; }
};

// farsk: fråga Netlify även om avläsningen i cachen är färsk (spärren före uppladdning gör alltid det).
// KREDITER_PROV_KVAR=<tal> låtsas att saldot är det talet, så att spärren kan provas utan att röra Netlify.
export const hamta = async ({ farsk = false } = {}) => {
  const prov = process.env.KREDITER_PROV_KVAR;
  if (prov) return { kvar: Number(prov), totalt: 1000, anvant: 1000 - Number(prov), start: null, slut: new Date(Date.now() + 10 * DYGN).toISOString(), perDygn: 5, matare: {}, last: new Date().toISOString() };
  const c = !farsk && lasCache();
  if (c) return c;
  const k = await lasKrediter();
  try { writeFileSync(CACHE, JSON.stringify(k, null, 1) + '\n'); } catch { /* cachen är en bekvämlighet */ }
  return k;
};

export const lage = (k) => {
  const nu = Date.now();
  const slut = k.slut ? Date.parse(k.slut) : null;
  const tom = k.perDygn > 0 ? new Date(nu + (k.kvar / k.perDygn) * DYGN) : null;
  const golv = k.perDygn > 0 && k.kvar > GOLV ? new Date(nu + ((k.kvar - GOLV) / k.perDygn) * DYGN) : null;
  return {
    oppen: k.kvar - BYGGE >= GOLV,
    rum: Math.max(0, Math.floor((k.kvar - GOLV) / BYGGE)),
    dagarKvar: slut ? Math.max(0, Math.ceil((slut - nu) / DYGN)) : null,
    tom,
    golv,
    tomForeSlut: Boolean(tom && slut && tom.getTime() < slut),
    golvForeSlut: Boolean(golv && slut && golv.getTime() < slut),
  };
};

// Commits på main som inte är uppladdade, och hur många av dem som bygger (utan [skip netlify]).
export const vantande = (kalla = 'main') => {
  try {
    const ut = execFileSync('git', ['log', `origin/main..${kalla}`, '--format=%B%x00'], { cwd: rot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const commits = ut.split('\0').map((s) => s.trim()).filter(Boolean);
    return { alla: commits.length, bygger: commits.filter((c) => !/\[skip (netlify|ci)\]/i.test(c)).length };
  } catch { return { alla: 0, bygger: 0 }; }
};

const heltal = (x) => Math.round(x).toLocaleString('sv-SE');
const kred = (x) => (x < 10 ? x.toFixed(1).replace('.', ',') : heltal(x));
const decimal = (x) => x.toFixed(1).replace('.', ',');
const datum = (d) => d.toISOString().slice(0, 10);
const commits = (n) => `${n} ${n === 1 ? 'commit' : 'commits'}`;

export const rad = (k, l = lage(k), v = vantande()) => {
  const pafyllning = k.slut ? k.slut.slice(0, 10) : 'okänt datum';
  const vantar = v.bygger ? ` ${commits(v.bygger)} på main väntar på uppladdning.` : '';
  const slutar = l.tomForeSlut ? ` Allt utom byggen drar omkring ${kred(k.perDygn)} om dygnet, så saldot tar slut omkring ${datum(l.tom)}, före påfyllningen; då pausar Netlify sajten.` : '';
  if (!l.oppen) {
    return `KREDITSPÄRREN ÄR STÄNGD: ${heltal(k.kvar)} Netlify-krediter kvar, gränsen är ${GOLV}. Ladda inte upp, och säg till Niclas. Arbeta, validera och slå ihop till main lokalt som vanligt, men pusha inte main; säkerhetskopiera med git push origin main:${VANTGREN}. Krediterna fylls på ${pafyllning}.${vantar}${slutar}${paminnelser(k)}`;
  }
  let s = `Netlify-krediter: ${heltal(k.kvar)} kvar av ${heltal(k.totalt)} till ${pafyllning}. Kreditspärren vid ${GOLV} är öppen: rum för ${l.rum} ${l.rum === 1 ? 'bygge' : 'byggen'} i dag. Allt utom byggen drar omkring ${kred(k.perDygn)} om dygnet.`;
  if (l.tomForeSlut) s += ` VARNING: även utan byggen tar saldot slut omkring ${datum(l.tom)}, före påfyllningen; då pausar Netlify sajten. Säg till Niclas.`;
  else if (l.golvForeSlut) s += ` Utan byggen stänger spärren omkring ${datum(l.golv)}.`;
  if (v.bygger) s += ` ${commits(v.bygger)} på main väntar på uppladdning: en push laddar upp allt.`;
  return s + paminnelser(k);
};

const MATARE = {
  production_deploys: ['byggen', (m) => `${heltal(m)} st`],
  bandwidth: ['bandbredd', (m) => `${decimal(m)} GB`],
  web_requests: ['anrop', (m) => `${heltal(m)} st`],
  db_compute: ['databasen', (m) => `${decimal(m)} GB-timmar`],
  db_bandwidth: ['databasens bandbredd', (m) => `${decimal(m)} GB`],
  functions_compute: ['funktionerna', (m) => `${decimal(m)} GB-timmar`],
  dev_server_compute: ['förhandsservrar', (m) => `${decimal(m)} GB-timmar`],
  agent_runner_compute: ['agenter', (m) => `${decimal(m)} GB-timmar`],
  ai_gateway_ai_inference: ['AI', () => ''],
  agent_runner_ai_inference: ['agenternas AI', () => ''],
};

// Databasens grenar (kommentarerna): sover de, och när var de senast vakna? Varje uppvaknande kostar omkring
// 1 kredit (DRIFT.md under Kommentarer). En gren från en förhandsversion är en testgren som bara Niclas kan ta bort.
function tolkaGrenar(svar) {
  const grenar = Array.isArray(svar) ? svar : svar?.branches ?? [];
  return grenar.map((g) => ({ namn: g.name ?? g.branch_id, sammanhang: g.metadata?.deploy?.context ?? '', vaken: g.compute?.current_state === 'active', senast: g.compute?.last_active ?? null }));
}

// En migrering i netlify/database/migrations gör att varje produktionsbygge väcker databasen (omkring 1 kredit);
// schemat ligger därför i netlify/database/schema/ (K-050, DRIFT.md under Kommentarer).
const migreringar = () => {
  const mapp = join(rot, 'netlify', 'database', 'migrations');
  try { return existsSync(mapp) && readdirSync(mapp).length > 0; } catch { return false; }
};

// Det som väntar och som raden ska påminna om vid varje nytt uppdrag, tills det är gjort.
const paminnelser = (k) => {
  const p = [];
  for (const g of (k.grenar ?? []).filter((g) => g.namn !== 'production')) p.push(`Databasens testgren ${g.namn} finns kvar; Niclas tar bort den i Netlify under Database (INSTRUKTIONER.docx).`);
  if (migreringar()) p.push('netlify/database/migrations har filer, så varje bygge väcker databasen för omkring 1 kredit; se DRIFT.md under Kommentarer.');
  return p.length ? ` ${p.join(' ')}` : '';
};

const visa = (k) => {
  const l = lage(k);
  const v = vantande();
  const delar = Object.entries(k.matare)
    .filter(([, m]) => m.krediter >= 0.05)
    .sort((a, b) => b[1].krediter - a[1].krediter)
    .map(([id, m]) => { const [namn, mangd] = MATARE[id] ?? [id, () => '']; const x = mangd(m.mangd); return `${namn} ${kred(m.krediter)}${x ? ` (${x})` : ''}`; });
  console.log(`Netlify-krediter, lästa ${k.last.slice(0, 16).replace('T', ' ')} UTC`);
  console.log(`  Kvar ${heltal(k.kvar)} av ${heltal(k.totalt)}. Fylls på ${k.slut ? k.slut.slice(0, 10) : 'okänt datum'}${l.dagarKvar !== null ? `, om ${l.dagarKvar} dygn` : ''}.`);
  console.log(`  Använt ${heltal(k.anvant)}: ${delar.join(', ')}.`);
  console.log(`  Allt utom byggen drar omkring ${kred(k.perDygn)} om dygnet (snittet för de tre senaste dygnen).`);
  if (l.golv || l.tom) console.log(`  Utan fler byggen${l.golv ? ` stänger spärren omkring ${datum(l.golv)}` : ''}${l.golv && l.tom ? ' och' : ''}${l.tom ? ` tar saldot slut omkring ${datum(l.tom)}` : ''}.`);
  if (l.tomForeSlut) console.log('  VARNING: saldot tar slut före påfyllningen. Då pausar Netlify sajten och besökarna ser "Site not available". Se vad som drar: npm run krediter -- trafik');
  console.log(`Kreditspärren vid ${GOLV}: ${l.oppen ? `öppen, rum för ${l.rum} ${l.rum === 1 ? 'bygge' : 'byggen'} i dag` : 'STÄNGD, ladda inte upp'}.`);
  console.log(`Lokalt: ${v.alla ? `${commits(v.alla)} på main är inte uppladdade, ${v.bygger} av dem bygger` : 'inget väntar på uppladdning'}.`);
  for (const g of k.grenar ?? []) {
    const tid = g.senast ? `${g.senast.slice(0, 16).replace('T', ' ')} UTC` : 'aldrig';
    const lage = g.vaken ? 'är vaken' : `sover, senast vaken ${tid}`;
    console.log(g.namn === 'production'
      ? `Databasen: ${lage}.`
      : `Databasgrenen ${g.namn} (${g.sammanhang || 'okänt sammanhang'}) ${lage}: en testgren, som Niclas tar bort i Netlify under Database.`);
  }
};

const BESOKARE = {
  browser: 'webbläsare',
  'page-preview': 'förhandsvisning av delade länkar',
  crawler: 'sökrobotar',
  tooling: 'verktyg och skript',
  'ai-agent': 'AI-agenter',
  other: 'övrigt',
  '': 'okänt',
};

const trafik = async (timmar) => {
  const token = lasToken();
  const till = Date.now();
  const fran = till - timmar * 3600000;
  const fraga = async (name, falt, antal = 10) => {
    const svar = await anrop(token, `/sites/${SITE}/observability/query/topk?from_ts=${fran}&to_ts=${till}`, {
      data: [{ attributes: { queries: [{ name, filters: [], sort_by: [{ field: falt, order: 'DESC' }], page: 1, per_page: antal }] } }],
    });
    return svar?.data?.[0]?.attributes?.items ?? [];
  };
  const [besokare, adresser, agenter, typer] = await Promise.all([
    fraga('user_agent_categories', 'Bandwidth', 20),
    fraga('urls', 'Bandwidth'),
    fraga('user_agents', 'Bandwidth', 6),
    fraga('content_types', 'Bandwidth', 6),
  ]);
  const mb = (b) => decimal(b / 1e6);
  const anropen = besokare.reduce((s, i) => s + i.count, 0);
  const bytes = besokare.reduce((s, i) => s + i.bandwidth, 0);
  console.log(`Trafiken de senaste ${timmar} timmarna: ${heltal(anropen)} anrop och ${mb(bytes)} MB, omkring ${kred((anropen / 10000) * 2 + (bytes / 1e9) * 20)} krediter.`);
  const tabell = (rubrik, rader, namn) => {
    console.log(`\n${rubrik.padEnd(62)}${'anrop'.padStart(8)}${'MB'.padStart(9)}`);
    for (const i of rader) console.log(`  ${namn(i).slice(0, 60).padEnd(60)}${heltal(i.count).padStart(8)}${mb(i.bandwidth).padStart(9)}`);
  };
  tabell('Besökare', besokare, (i) => BESOKARE[i.key] ?? i.key);
  tabell('Adresser med mest bandbredd', adresser, (i) => i.key.replace(/^https?:\/\/[^/]+/, '') || '/');
  tabell('Webbläsare och robotar med mest bandbredd', agenter, (i) => i.key || '(tom)');
  tabell('Filtyper', typer, (i) => i.key || '(ingen)');
};

const arHuvud = process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (arHuvud) {
  const args = process.argv.slice(2);
  const radlage = args.includes('--rad') || args.includes('--grind');
  try {
    if (args[0] === 'trafik') {
      await trafik(Number(args[1]) || 24);
    } else if (radlage) {
      const grind = args.includes('--grind');
      const k = await hamta({ farsk: grind || args.includes('--farsk') });
      const l = lage(k);
      console.log(rad(k, l));
      process.exit(grind && !l.oppen ? 1 : 0);
    } else {
      visa(await hamta({ farsk: true }));
    }
  } catch (e) {
    console.log(`Netlify-krediterna gick inte att läsa (${e.message}). Läs saldot i Netlify under Usage & billing före uppladdning; se DRIFT.md under Krediter.`);
    process.exit(args.includes('--rad') ? 0 : 3);
  }
}
