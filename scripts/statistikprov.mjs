// Prov av statistiksidan (K-094, K-095). Sidan körs i Chrome, och varje anrop går till GoatCounters riktiga server,
// med webbläsarens förfrågan (preflight) och GoatCounters gränser (4 anrop per sekund och 500 i timmen per
// internetanslutning, handlers/mw.go och handlers.go i GoatCounters källkod).
//
//   node scripts/statistikprov.mjs http://localhost:4321/statistik
//     Påhittad nyckel. GoatCounter svarar 401, och svaret byts mot provsiffror som härmar GoatCounter: 125 sidor och
//     händelser, högst 100 per omgång, och exclude_paths läst som GoatCounter läser den (bara första värdet, delat vid
//     komma). Så syntes felet med 7 dagar, 30 dagar och år (K-095): samma 100 kom tillbaka fem gånger.
//   GC_NYCKEL=<nyckeln> node scripts/statistikprov.mjs https://niclasfohlin.se/statistik
//     Riktiga siffror. Sifferrutorna jämförs med det GoatCounter själv räknar. Nyckeln är Niclas och finns inte i repot
//     (Claude Code sätter GC_NYCKEL ur .claude/settings.local.json); den läses bara ur miljön, skrivs aldrig ut, och
//     Chrome körs inkognito så att den inte sparas.
//
// Godkänt: varje period slutar med Hämtat, inget anrop stoppas, inget 429, och sifferrutorna stämmer. Skriptet slutar
// med felkod 1 annars. Varje körning gör omkring 20 anrop mot timmens 500. Kräver Chrome. Se DRIFT.md under
// Besöksstatistik.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const url = process.argv[2];
if (!url) { console.error('Ange adressen till /statistik.'); process.exit(1); }
const nyckel = process.env.GC_NYCKEL ?? '';
const riktig = Boolean(nyckel);
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
const RAKNINGEN_BORJADE = new Date(2026, 8, 28);

// Provsiffrorna: 125 sidor och händelser, som veckan hade 2026-09-29.
const PROV = Array.from({ length: 125 }, (_, i) => {
  const id = i + 1;
  if (id <= 6) return { path: `dela:facebook:stodundervisning/metod-${id}`, path_id: id, title: `Metod ${id}: delad på Facebook`, event: true, count: 1 };
  if (id <= 60) return { path: `fil:metod-${id}.docx`, path_id: id, title: `Metod ${id}: allt om metoden som Word`, event: true, count: 2 };
  return { path: `/stodundervisning/metod-${id}`, path_id: id, title: `Metod ${id} · Niclas Fohlin`, event: false, count: 5 };
});
const summa = (lista) => {
  const handelser = lista.filter((h) => h.event).reduce((a, h) => a + h.count, 0);
  const alla = lista.reduce((a, h) => a + h.count, 0);
  const dela = lista.filter((h) => h.path.startsWith('dela:')).reduce((a, h) => a + h.count, 0);
  return [alla - handelser, handelser - dela, dela];
};

// Det GoatCounter själv räknar, för i dag och för perioden från 28 september (7 dagar, 30 dagar och år).
async function forvantat() {
  if (!riktig) return { dag: summa(PROV), lang: summa(PROV) };
  const api = async (vag, par) => {
    const u = new URL('https://niclasfohlin.goatcounter.com/api/v0' + vag);
    for (const [k, v] of par) u.searchParams.append(k, String(v));
    await vanta(800);
    return (await fetch(u, { headers: { Authorization: `Bearer ${nyckel}` } })).json();
  };
  const slut = new Date(); slut.setMinutes(0, 0, 0); slut.setHours(slut.getHours() + 1);
  const nu = new Date();
  const ut = {};
  for (const [namn, start] of [['dag', new Date(nu.getFullYear(), nu.getMonth(), nu.getDate())], ['lang', RAKNINGEN_BORJADE]]) {
    const tot = await api('/stats/total', [['start', iso(start)], ['end', iso(slut)]]);
    const hits = [];
    const sedda = new Set();
    for (let i = 0; i < 5; i++) {
      const s = await api('/stats/hits', [['start', iso(start)], ['end', iso(slut)], ['limit', 100], ...(sedda.size ? [['exclude_paths', [...sedda].join(',')]] : [])]);
      const nya = (s.hits ?? []).filter((h) => !sedda.has(h.path_id));
      nya.forEach((h) => { sedda.add(h.path_id); hits.push(h); });
      if (!s.more || !nya.length) break;
    }
    const dela = hits.filter((h) => h.path.startsWith('dela:')).reduce((a, h) => a + h.count, 0);
    ut[namn] = [tot.total - tot.total_events, tot.total_events - dela, dela];
  }
  return ut;
}

const forberedelse = `
(() => {
  if (!location.pathname.startsWith('/statistik')) return;
  try { localStorage.setItem('goatcounter-nyckel', ${JSON.stringify(riktig ? nyckel : 'prov-inte-riktig')}); localStorage.removeItem('statistik-period'); } catch {}
  const logg = [];
  window.__prov = logg;
  const PROV = ${JSON.stringify(PROV)};
  const svaraSom = (adress) => {
    if (adress.pathname.endsWith('/stats/hits')) {
      // Som GoatCounter: limit högst 100, och exclude_paths är bara det första värdet, delat vid komma och mellanslag.
      const limit = Math.min(Number(adress.searchParams.get('limit')) || 20, 100);
      const uteslutna = new Set((adress.searchParams.get('exclude_paths') || '').split(/[, ]/).filter(Boolean).map(Number));
      const kvar = PROV.filter((h) => !uteslutna.has(h.path_id)).sort((a, b) => b.count - a.count);
      return { hits: kvar.slice(0, limit), more: kvar.length > limit };
    }
    if (adress.pathname.endsWith('/stats/total')) {
      const handelser = PROV.filter((h) => h.event).reduce((a, h) => a + h.count, 0);
      return { total: PROV.reduce((a, h) => a + h.count, 0), total_events: handelser, stats: [] };
    }
    return { stats: [] };
  };
  const hamta = window.fetch.bind(window);
  window.fetch = async (u, o) => {
    const adress = new URL(String(u), location.href);
    if (!adress.pathname.startsWith('/api/v0/')) return hamta(u, o);
    const rad = { vag: adress.pathname.replace('/api/v0/stats/', '') };
    logg.push(rad);
    try {
      const svar = await hamta(u, o);
      rad.status = svar.status;
      if (${riktig ? 'false' : 'true'} && svar.status === 401) return new Response(JSON.stringify(svaraSom(adress)), { status: 200, headers: { 'Content-Type': 'application/json' } });
      return svar;
    } catch (fel) { rad.status = 'Failed to fetch'; throw fel; }
  };
})();`;

const chrome = process.env.CHROME ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!chrome) { console.error('Hittar inte Chrome. Sätt CHROME=<sökväg>.'); process.exit(1); }
const mal0 = await forvantat();
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, '--headless=new', '--incognito', '--disable-gpu', '--no-first-run', `--user-data-dir=${process.env.TEMP ?? '/tmp'}/statistikprov-${port}`, 'about:blank'], { stdio: 'ignore' });
let fel = 0;
try {
  let mal;
  for (let i = 0; i < 40 && !mal; i++) { await vanta(250); try { mal = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} }
  if (!mal) throw new Error('Chrome svarade inte.');
  const ws = new WebSocket(mal.webSocketDebuggerUrl);
  await new Promise((r, x) => { ws.onopen = r; ws.onerror = x; });
  let nr = 0;
  const vantande = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && vantande.has(d.id)) { vantande.get(d.id)(d); vantande.delete(d.id); } };
  const skicka = (method, params = {}) => new Promise((r) => { const id = ++nr; vantande.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const utvardera = async (expression) => (await skicka('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.result?.value;
  await skicka('Page.enable');
  await skicka('Page.addScriptToEvaluateOnNewDocument', { source: forberedelse });
  await skicka('Page.navigate', { url });

  const vantaKlar = async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      await vanta(250);
      const s = await utvardera(`document.querySelector('[data-status]')?.textContent || ''`);
      if (/Hämtat|Det gick inte|Nyckeln|tar inte emot|inte uppkopplad/.test(s)) return { s, ms: Date.now() - t0 };
    }
    return { s: 'ingen färdig status efter 60 s', ms: 60000 };
  };
  const tal = () => utvardera(`[...document.querySelectorAll('.stat-tal strong')].map((e) => Number(e.textContent.replace(/[^0-9]/g, '')))`);
  const langd = () => utvardera('window.__prov.length');
  const anrop = (fran) => utvardera(`window.__prov.slice(${fran})`);
  const prova = async (namn, gor, forvantade) => {
    const fran = await langd();
    await gor();
    const r = await vantaKlar();
    const l = await anrop(fran);
    const stoppade = l.filter((x) => x.status === 'Failed to fetch').length;
    const status429 = l.filter((x) => x.status === 429).length;
    const visade = await tal();
    const ratt = JSON.stringify(visade) === JSON.stringify(forvantade);
    const ok = /Hämtat/.test(r.s) && !stoppade && !status429 && ratt;
    if (!ok) fel++;
    console.log(`${ok ? 'GRÖNT' : 'RÖTT '}  ${namn.padEnd(34)} ${r.s.padEnd(16)} ${String(r.ms).padStart(5)} ms  ${String(l.length).padStart(2)} anrop  stoppade ${stoppade}  429 ${status429}  rutor ${visade.join('/')}${ratt ? '' : ` (GoatCounter: ${forvantade.join('/')})`}`);
  };
  const klick = (period) => () => utvardera(`document.querySelector('[data-period="${period}"]').click()`);
  console.log(riktig ? 'Riktiga siffror med Niclas nyckel.' : 'Påhittad nyckel och provsiffror som härmar GoatCounter.');
  await prova('i dag, när sidan laddas', async () => {}, mal0.dag);
  await prova('7 dagar', klick('vecka'), mal0.lang);
  await prova('30 dagar', klick('manad'), mal0.lang);
  await prova('1 år', klick('ar'), mal0.lang);
  await prova('i dag igen, sparat', klick('dag'), mal0.dag);
  await skicka('Page.navigate', { url });
  await vanta(700);
  await prova('ny laddning, byten i snabb följd', async () => {
    await klick('vecka')();
    await vanta(150);
    await klick('manad')();
    await vanta(150);
    await klick('ar')();
  }, mal0.lang);
  ws.close();
} finally {
  proc.kill();
}
if (fel) { console.log(`${fel} prov röda.`); process.exit(1); }
console.log('Alla prov gröna.');
