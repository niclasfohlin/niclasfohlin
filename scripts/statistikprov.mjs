// Prov av statistiksidan mot GoatCounters riktiga server (K-094). Sidan körs i Chrome med en påhittad nyckel, så
// varje anrop går på riktigt, med webbläsarens förfrågan (preflight) och GoatCounters gräns på 4 per sekund. Svaret
// 401 byts mot provsiffror efter att det kommit, så att sidan går vidare genom alla anrop som med en riktig nyckel.
// Påhittad nyckel räknas per adress i stället för per nyckel, alltså strängare än hos Niclas.
//   node scripts/statistikprov.mjs https://niclasfohlin.se/statistik     sajten som ligger ute
//   node scripts/statistikprov.mjs http://localhost:4321/statistik       npm run dev
// Godkänt: varje period slutar med Hämtat, stoppade och status429 är 0. Kräver Chrome. Se DRIFT.md under Besöksstatistik.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const url = process.argv[2];
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${process.env.TEMP ?? '/tmp'}/statprov-${port}`, 'about:blank'], { stdio: 'ignore' });
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));

const forberedelse = `
(() => {
  if (!location.pathname.startsWith('/statistik')) return;
  try { localStorage.setItem('goatcounter-nyckel', 'prov-inte-riktig'); localStorage.removeItem('statistik-period'); } catch {}
  const logg = [];
  window.__prov = logg;
  const riktig = window.fetch.bind(window);
  const prov = (adress) => {
    const sokvag = adress.pathname;
    if (sokvag.endsWith('/stats/hits')) {
      const dagar = (Date.now() - new Date(adress.searchParams.get('start')).getTime()) / 86400000;
      const uteslutna = adress.searchParams.getAll('exclude_paths').length;
      logg.limit = adress.searchParams.get('limit');
      if (dagar > 200 && uteslutna === 0) return { more: true, hits: Array.from({ length: 100 }, (_, i) => ({ path: '/artiklar/sida-' + i, path_id: 1000 + i, title: 'Sida ' + i, event: false, count: 1 })) };
      if (dagar > 200) { logg.uteslutna = uteslutna; return { more: false, hits: [{ path: 'dela:facebook:stodundervisning/upprepad-lasning', path_id: 2, title: 'Upprepad läsning: delad på Facebook', event: true, count: 7 }] }; }
      return { more: false, hits: [
        { path: '/stodundervisning/upprepad-lasning', path_id: 1, title: 'Upprepad läsning · Niclas Fohlin', event: false, count: 40 },
        { path: 'dela:facebook:stodundervisning/upprepad-lasning', path_id: 2, title: 'Upprepad läsning: delad på Facebook', event: true, count: 7 },
        { path: 'fil:upprepad-lasning-lathund.pdf', path_id: 3, title: 'Upprepad läsning: lathunden som pdf', event: true, count: 5 },
      ] };
    }
    if (sokvag.endsWith('/stats/total')) return { total: 52, total_events: 12, stats: [] };
    return { stats: [] };
  };
  window.fetch = async (u, o) => {
    const adress = new URL(String(u), location.href);
    if (!adress.pathname.startsWith('/api/v0/')) return riktig(u, o);
    const rad = { vag: adress.pathname.replace('/api/v0', ''), start: Math.round(performance.now()) };
    logg.push(rad);
    try {
      const svar = await riktig(u, o);
      rad.status = svar.status;
      if (svar.status === 401) return new Response(JSON.stringify(prov(adress)), { status: 200, headers: { 'Content-Type': 'application/json' } });
      return svar;
    } catch (fel) {
      rad.status = 'Failed to fetch';
      throw fel;
    }
  };
})();
`;

try {
  let mal;
  for (let i = 0; i < 40 && !mal; i++) {
    await vanta(250);
    try { mal = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
  }
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

  const status = () => utvardera(`document.querySelector('[data-status]')?.textContent || document.querySelector('.stat-status, [role=status]')?.textContent || ''`);
  const vantaKlar = async (maxMs = 30000) => {
    const t0 = Date.now();
    let s = '';
    while (Date.now() - t0 < maxMs) {
      await vanta(250);
      s = await status();
      if (/Hämtat|Det gick inte|Nyckeln/.test(s)) return { s, ms: Date.now() - t0 };
    }
    return { s: `ingen färdig status efter ${maxMs} ms: ${s}`, ms: Date.now() - t0 };
  };
  const logglangd = () => utvardera('window.__prov.length');
  const sammanfatta = async (fran) => utvardera(`(() => { const l = window.__prov.slice(${fran}); return { anrop: l.length, stoppade: l.filter((r) => r.status === 'Failed to fetch').length, status429: l.filter((r) => r.status === 429).length, vagar: l.map((r) => r.vag.replace('/stats/', '') + ':' + r.status).join(' ') }; })()`);

  const resultat = [];
  let fran = 0;
  let r = await vantaKlar();
  resultat.push({ period: 'dag (vid start)', ...r, ...(await sammanfatta(fran)) });
  for (const period of ['vecka', 'manad', 'ar', 'dag']) {
    fran = await logglangd();
    await utvardera(`document.querySelector('[data-period="${period}"]').click()`);
    await vanta(100);
    r = await vantaKlar();
    resultat.push({ period, ...r, ...(await sammanfatta(fran)) });
  }
  // Snabba byten: 7 dagar och direkt 1 år. Bara det senast valda ska visas.
  fran = await logglangd();
  await utvardera(`document.querySelector('[data-period="vecka"]').click(); document.querySelector('[data-period="ar"]').click()`);
  await vanta(100);
  r = await vantaKlar();
  const vald = await utvardera(`document.querySelector('[data-period][aria-pressed="true"]')?.dataset.period`);
  resultat.push({ period: 'vecka och direkt ar', vald, ...r, ...(await sammanfatta(fran)) });
  resultat.push({ period: 'limit och uteslutna på andra sidan i ar', limit: await utvardera('window.__prov.limit'), uteslutna: await utvardera('window.__prov.uteslutna') });
  await skicka('Page.navigate', { url });
  await vanta(700);
  fran = 0;
  await utvardera(`document.querySelector('[data-period="vecka"]').click()`);
  await vanta(150);
  await utvardera(`document.querySelector('[data-period="manad"]').click()`);
  await vanta(150);
  await utvardera(`document.querySelector('[data-period="ar"]').click()`);
  r = await vantaKlar(45000);
  const vald2 = await utvardera(`document.querySelector('[data-period][aria-pressed="true"]')?.dataset.period`);
  const summa2 = await utvardera(`document.querySelector('[data-summa]')?.textContent`);
  resultat.push({ period: 'ny laddning, dag, vecka, manad och ar i snabb följd', vald: vald2, summa: summa2, ...r, ...(await sammanfatta(0)) });
  console.log(JSON.stringify(resultat, null, 1));
  ws.close();
} finally {
  proc.kill();
}
