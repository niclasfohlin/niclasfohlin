#!/usr/bin/env node
// Metoderprovet (K-621): undervisningsmetodernas sidor i det byggda dist, i Chrome, som en lärare möter dem. Varje sida
// under /metoder/ (banken, metodens sida och Lär dig metoden) prövas i 320 och 360 punkters bredd med allt utfällt: ingen
// sida rullar i sidled (designgranskningen 2026-10-30: planeringsbladet gjorde metodens sida 343 punkter bred i 320, och
// utskriftsformat.mjs prövar bara Stödundervisning). På metodens sida leder varje ankare till ett element, varje fil som
// sidan länkar till finns, och delarna står i standardens ordning (UNDERVISNINGSMETODENS_DELAR). Körs i npm run validera.
//
//   node scripts/metoderprov.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UNDERVISNINGSMETODENS_DELAR } from '../src/lib/standard/index.js';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(rot, 'dist');
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!existsSync(join(dist, 'metoder'))) { console.log('metoderprov: inga sidor under /metoder i dist, inget att pröva.'); process.exit(0); }
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));

// Sidorna: banken, och varje metods sida med dess undersidor.
const sidor = ['/metoder'];
for (const e of readdirSync(join(dist, 'metoder'), { withFileTypes: true })) {
  if (!e.isDirectory() || !existsSync(join(dist, 'metoder', e.name, 'index.html'))) continue;
  sidor.push(`/metoder/${e.name}`);
  for (const u of readdirSync(join(dist, 'metoder', e.name), { withFileTypes: true })) if (u.isDirectory() && existsSync(join(dist, 'metoder', e.name, u.name, 'index.html'))) sidor.push(`/metoder/${e.name}/${u.name}`);
}
const metodsidor = sidor.filter((s) => /^\/metoder\/[^/]+$/.test(s));
const fel = [];

// Det som går att pröva i HTML: ankarna, filerna och delarnas ordning.
for (const s of metodsidor) {
  const html = readFileSync(join(dist, s, 'index.html'), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/href="#([^"]+)"/g)) if (!ids.has(decodeURIComponent(m[1]))) fel.push(`${s}: länken #${m[1]} leder inte till något element`);
  for (const m of html.matchAll(/(?:href|src|data)="(\/metoder\/[^"?#]+\.(?:pdf|docx|png|svg|webp|mp4|zip))(?:\?[^"]*)?"/g)) if (!existsSync(join(dist, decodeURIComponent(m[1])))) fel.push(`${s}: filen ${m[1]} saknas`);
  const delar = [...html.matchAll(/<section class="um-del" id="del-([a-z-]+)"/g)].map((m) => m[1]);
  const vantat = UNDERVISNINGSMETODENS_DELAR.map((d) => d.id);
  if (delar.join(' ') !== vantat.join(' ')) fel.push(`${s}: delarna står ${delar.join(', ')}, ska vara ${vantat.join(', ')}`);
}

// En enkel server för dist och Chrome utan fönster.
const TYPER = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let fil = join(dist, p);
  if (existsSync(join(fil, 'index.html'))) fil = join(fil, 'index.html');
  if (!existsSync(fil)) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', TYPER[extname(fil)] ?? 'application/octet-stream');
  res.end(readFileSync(fil));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const bas = `http://127.0.0.1:${server.address().port}`;
const port = 9300 + Math.floor(Math.random() * 500);
const profil = join(tmpdir(), `metoderprov-${port}`);
mkdirSync(profil, { recursive: true });
const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, 'about:blank'], { stdio: 'ignore' });
try {
  let info;
  for (let i = 0; i < 40 && !info; i++) { await vanta(250); try { info = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { /* Chrome har inte startat än */ } }
  if (!info) throw new Error('Chrome svarade inte på DevTools-porten.');
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((r, x) => { ws.onopen = r; ws.onerror = x; });
  let nr = 0;
  const vantande = new Map();
  let laddad = () => {};
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && vantande.has(d.id)) { vantande.get(d.id)(d); vantande.delete(d.id); } else if (d.method === 'Page.loadEventFired') laddad(); };
  const skicka = (method, params = {}) => new Promise((r) => { const id = ++nr; vantande.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await skicka('Page.enable');
  const oppna = async (url) => { const klar = new Promise((r) => { laddad = r; }); await skicka('Page.navigate', { url }); await Promise.race([klar, vanta(20000)]); };
  const kor = async (expression) => (await skicka('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  for (const s of sidor) {
    for (const bredd of [320, 360]) {
      await skicka('Emulation.setDeviceMetricsOverride', { width: bredd, height: 800, deviceScaleFactor: 2, mobile: true });
      await oppna(`${bas}${s}`);
      const bred = await kor(`document.fonts.ready.then(() => { document.querySelectorAll('details').forEach((x) => { x.open = true; }); const W = document.documentElement.clientWidth; const sw = document.documentElement.scrollWidth; if (sw <= W + 1) return ''; const klipps = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (getComputedStyle(a).overflowX !== 'visible') return true; return false; }; for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.width && !klipps(e) && r.right > W + 1 && e.parentElement.getBoundingClientRect().right <= W + 1) return sw + ' punkter bred, ' + e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/)[0] : '') + ' ”' + (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40) + '”'; } return sw + ' punkter bred'; })`);
      if (bred === undefined) fel.push(`${s}: provet i ${bredd} punkter fick inget svar`);
      else if (bred) fel.push(`${s}: rullar i sidled i ${bredd} punkter: ${bred}`);
      // Inget namn i remsan, cellerna eller kortets värden klipps eller går ut ur sin ruta (designgranskningen 2026-10-30).
      const klippt = await kor(`(() => { const ut = []; for (const e of document.querySelectorAll('.um-remsa-namn, .um-celler a, .mp-varde, .mp-namn')) { if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') ut.push(e.textContent.trim().slice(0, 30)); const ram = e.closest('.mp-bank-halv, .mp-rad, .mp-bank-en'); if (ram && e.getBoundingClientRect().right > ram.getBoundingClientRect().right + 1) ut.push(e.textContent.trim().slice(0, 30) + ' (utanför rutan)'); } return ut.join(' · '); })()`);
      if (klippt) fel.push(`${s}: i ${bredd} punkter klipps eller går ut: ${klippt}`);
    }
  }
  ws.close();
} finally {
  proc.kill();
  server.close();
  try { rmSync(profil, { recursive: true, force: true }); } catch { /* Chrome kan hålla filerna en stund */ }
}
if (fel.length) { console.error(`metoderprov: ${fel.length} fel\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`metoderprov: ${sidor.length} sidor under /metoder rullar inte i sidled i 320 och 360 punkter, inga namn i remsan, cellerna eller kortet klipps, och på ${metodsidor.length} metodsidor leder ankarna och filerna rätt och delarna står i standardens ordning.`);
