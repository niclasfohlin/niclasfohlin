#!/usr/bin/env node
// Spelar filmerna, och fryser Pausa dem? (Niclas 2026-09-30: på datorn stod filmen still utan knapp, och Pausa började om
// filmen; "Den måste ju spela alldeles oavsett".)
//
// Skriptet öppnar varje publicerad metod i Chrome med minskad rörelse påtvingad, som en Windows-dator med animeringar
// avstängda, och prövar det läsaren ser: huvudfilmen rör sig, knappen Pausa syns, Pausa fryser filmen där den är, Spela
// fortsätter därifrån, och varje extrafilm hämtas och rör sig när läsaren scrollar dit. Sajten serveras ur dist med
// X-Frame-Options ur netlify.toml, som på Netlify, eftersom filmen står i en <object> (Film.astro) och rubriken avgör om
// den får bäddas in.
//
// En metod med lathund prövas också på lathundssidan, där filmerna står i en spelare (Filmspelare.astro, Niclas
// 2026-10-07): en film visas från början och spelar, varje val visar sin film och bara den, filmen som väljs hämtas och
// rör sig, vägen tillbaka till den första filmen fungerar och Pausa fryser den där, knappen för zip-filen finns med
// filens version, och spelaren är borta i utskriften också i ett brett fönster (granskningen 2026-10-07: en regel för
// dator vann över utskriftens, och spelaren skrevs ut i A3 och liggande).
//
//   node scripts/filmprov.mjs                        alla publicerade metoder, ur dist (kör npm run validera först)
//   node scripts/filmprov.mjs <id> …                 bara de metoderna
//   node scripts/filmprov.mjs --adress https://niclasfohlin.se   sajten ute, efter deployen
//   node scripts/filmprov.mjs --utan-minskad         en dator med animeringar påslagna
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const adressArg = args.indexOf('--adress');
const ute = adressArg >= 0 ? args[adressArg + 1]?.replace(/\/$/, '') : '';
const minskad = !args.includes('--utan-minskad');
const valda = args.filter((a, i) => !a.startsWith('--') && (adressArg < 0 || i !== adressArg + 1));
const mapp = join(rot, 'src/content/stodundervisning');
const metoder = readdirSync(mapp)
  .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .map((f) => ({ id: f.slice(0, -5), d: parseYaml(readFileSync(join(mapp, f), 'utf8')) }))
  .filter((m) => !m.d.utkast && m.d.film && (!valda.length || valda.includes(m.id)));
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!chrome) { console.error('filmprov: Chrome hittades inte.'); process.exit(1); }

// dist med Netlifys X-Frame-Options.
const dist = join(rot, 'dist');
const ramregel = readFileSync(join(rot, 'netlify.toml'), 'utf8').match(/X-Frame-Options\s*=\s*"([^"]*)"/)?.[1];
const TYPER = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.xml': 'application/xml', '.ico': 'image/x-icon' };
let server;
let bas = ute;
if (!ute) {
  if (!existsSync(join(dist, 'stodundervisning'))) { console.error('filmprov: dist saknas. Kör npm run validera eller npx astro build först.'); process.exit(1); }
  server = createServer((req, res) => {
    let p = join(dist, decodeURIComponent(req.url.split('?')[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    else if (!existsSync(p) && existsSync(`${p}.html`)) p = `${p}.html`;
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    const rubriker = { 'Content-Type': TYPER[extname(p)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' };
    if (ramregel) rubriker['X-Frame-Options'] = ramregel;
    res.writeHead(200, rubriker);
    res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  bas = `http://127.0.0.1:${server.address().port}`;
}

const port = 9400 + Math.floor(Math.random() * 400);
const flaggor = [`--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'filmprov-'))}`, '--window-size=1280,900'];
if (minskad) flaggor.push('--force-prefers-reduced-motion');
const proc = spawn(chrome, [...flaggor, 'about:blank'], { stdio: 'ignore' });
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));
let mal;
for (let i = 0; i < 40 && !mal; i++) {
  await vanta(250);
  try { mal = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((m) => m.type === 'page'); } catch {}
}
if (!mal) { proc.kill(); server?.close(); console.error('filmprov: Chrome startade inte.'); process.exit(1); }
const ws = new WebSocket(mal.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let nr = 0;
const svar = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && svar.has(m.id)) { svar.get(m.id)(m); svar.delete(m.id); } });
const skicka = (method, params = {}) => new Promise((r) => { const id = ++nr; svar.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const utvardera = async (expression) => (await skicka('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.result?.value;
await skicka('Page.enable');

// Körs i sidan: prövar filmerna som en läsare och svarar med felen.
const PROV = `(async () => {
  const vanta = (ms) => new Promise((r) => setTimeout(r, ms));
  const figurer = [...document.querySelectorAll('figure.film')];
  const namn = (f) => f.dataset.namn ?? 'filmen';
  const lage = (f) => {
    const o = f.querySelector('.film-bild');
    if (!o || o.tagName !== 'OBJECT') return { fel: 'visas som stillbild, inte som film (' + (o ? o.tagName : 'inget') + ')' };
    const d = o.contentDocument;
    if (!d) return { fel: 'filmen gick inte att bädda in (X-Frame-Options?)' };
    d.documentElement.getBoundingClientRect();
    const a = d.getAnimations();
    if (!a.length) return { fel: 'filmen har inga animeringar igång' };
    return { t: Math.round(Math.max(...a.map((x) => x.currentTime ?? 0))), spelar: a.filter((x) => x.playState === 'running').length };
  };
  const vantaPa = async (f, ms) => { let l = lage(f); for (let i = 0; i < ms / 200 && l.fel; i++) { await vanta(200); l = lage(f); } return l; };
  const fel = [];
  if (!figurer.length) return { filmer: 0, fel: ['ingen film på sidan'] };
  const huvud = figurer[0];
  const l0 = await vantaPa(huvud, 6000);
  if (l0.fel) fel.push(namn(huvud) + ': ' + l0.fel);
  else {
    await vanta(1000);
    const l1 = lage(huvud);
    if (!(l1.t > l0.t)) fel.push(namn(huvud) + ': står still');
    const k = huvud.querySelector('.film-knapp');
    if (!k || k.hidden) fel.push(namn(huvud) + ': knappen Pausa syns inte');
    else {
      k.click(); await vanta(300);
      const p0 = lage(huvud); await vanta(1000); const p1 = lage(huvud);
      if (p0.spelar || p1.t !== p0.t) fel.push(namn(huvud) + ': Pausa fryser inte filmen');
      if (k.textContent !== 'Spela') fel.push(namn(huvud) + ': knappen byter inte till Spela');
      k.click(); await vanta(300);
      const s0 = lage(huvud); await vanta(1000); const s1 = lage(huvud);
      if (s0.t < p1.t || s0.t > p1.t + 800) fel.push(namn(huvud) + ': Spela fortsätter inte där filmen stod (' + p1.t + ' ms, sedan ' + s0.t + ' ms)');
      if (!(s1.t > s0.t)) fel.push(namn(huvud) + ': Spela startar inte filmen igen');
    }
  }
  // Extrafilmerna hämtas först när läsaren närmar sig dem.
  for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await vanta(60); }
  for (const f of figurer.slice(1)) {
    f.scrollIntoView({ block: 'center' });
    const e0 = await vantaPa(f, 5000);
    if (e0.fel) { fel.push(namn(f) + ': ' + e0.fel); continue; }
    await vanta(700);
    if (!(lage(f).t > e0.t)) fel.push(namn(f) + ': står still');
    if (f.querySelector('.film-knapp')?.hidden !== false) fel.push(namn(f) + ': knappen Pausa syns inte');
  }
  return { filmer: figurer.length, fel };
})()`;

// Körs på lathundssidan: spelaren med alla filmer.
const PROV_SPELARE = `(async () => {
  const vanta = (ms) => new Promise((r) => setTimeout(r, ms));
  const spelare = document.querySelector('[data-filmspelare]');
  if (!spelare) return { filmer: 0, fel: ['ingen spelare på lathundssidan'] };
  const filmer = [...spelare.querySelectorAll('[data-filmspelare-film]')];
  const val = [...spelare.querySelectorAll('[data-filmspelare-val]')];
  const figur = (f) => f.querySelector('figure.film');
  const namn = (f) => figur(f)?.dataset.namn ?? 'filmen';
  const lage = (f) => {
    const o = figur(f)?.querySelector('.film-bild');
    if (!o || o.tagName !== 'OBJECT') return { fel: 'visas som stillbild, inte som film (' + (o ? o.tagName : 'inget') + ')' };
    const d = o.contentDocument;
    if (!d) return { fel: 'filmen gick inte att bädda in (X-Frame-Options?)' };
    d.documentElement.getBoundingClientRect();
    const a = d.getAnimations();
    if (!a.length) return { fel: 'filmen har inga animeringar igång' };
    return { t: Math.round(Math.max(...a.map((x) => x.currentTime ?? 0))) };
  };
  const vantaPa = async (f, ms) => { let l = lage(f); for (let i = 0; i < ms / 200 && l.fel; i++) { await vanta(200); l = lage(f); } return l; };
  const synliga = () => filmer.filter((f) => !f.hidden && f.offsetParent !== null);
  const fel = [];
  if (!filmer.length) return { filmer: 0, fel: ['spelaren har ingen film'] };
  if (synliga().length !== 1) fel.push('visar ' + synliga().length + ' filmer från början, väntat en');
  if (filmer.length > 1 && val.length !== filmer.length) fel.push(val.length + ' val för ' + filmer.length + ' filmer');
  if (filmer.length === 1 && val.length) fel.push('en film men en rad med val');
  if (val.length && val.some((k) => k.offsetParent === null)) fel.push('raden med valen syns inte');
  const rorSig = async (f) => {
    const l0 = await vantaPa(f, 6000);
    if (l0.fel) return namn(f) + ': ' + l0.fel;
    await vanta(800);
    return lage(f).t > l0.t ? '' : namn(f) + ': står still';
  };
  const forsta = await rorSig(filmer[0]);
  if (forsta) fel.push(forsta);
  for (const [i, k] of val.entries()) {
    k.click();
    await vanta(250);
    const s = synliga();
    if (s.length !== 1 || s[0] !== filmer[i]) { fel.push('valet ' + (i + 1) + ' visar inte sin film'); continue; }
    if (k.getAttribute('aria-pressed') !== 'true' || val.filter((x) => x.getAttribute('aria-pressed') === 'true').length !== 1) fel.push('valet ' + (i + 1) + ': aria-pressed säger inte vilken film som visas');
    const r = await rorSig(filmer[i]);
    if (r) fel.push(r);
    if (figur(filmer[i])?.querySelector('.film-knapp')?.hidden !== false) fel.push(namn(filmer[i]) + ': knappen Pausa syns inte');
  }
  // Vägen tillbaka: den första filmen igen. Den ska röra sig, och Pausa ska frysa den där den är.
  if (val.length > 1) {
    val[0].click();
    await vanta(300);
    const s = synliga();
    if (s.length !== 1 || s[0] !== filmer[0]) fel.push('tillbaka till första filmen: den visas inte');
    else {
      const r = await rorSig(filmer[0]);
      if (r) fel.push('tillbaka till första filmen: ' + r);
      const k = figur(filmer[0])?.querySelector('.film-knapp');
      if (!k || k.hidden) fel.push('tillbaka till första filmen: knappen Pausa syns inte');
      else if (!r) {
        k.click(); await vanta(300);
        const p0 = lage(filmer[0]); await vanta(900); const p1 = lage(filmer[0]);
        if (p0.fel || p1.fel || p1.t !== p0.t) fel.push('tillbaka till första filmen: Pausa fryser inte filmen');
        k.click();
      }
    }
  }
  const zip = spelare.querySelector('.film-hamta a');
  if (!zip) fel.push('knappen för zip-filen saknas');
  else if (!(zip.getAttribute('href') ?? '').includes('-filmer.zip?v=')) fel.push('zip-länken saknar filens version: ' + zip.getAttribute('href'));
  return { filmer: filmer.length, fel };
})()`;

let felSidor = 0;
try {
  for (const { id, d } of metoder) {
    await skicka('Page.navigate', { url: `${bas}/stodundervisning/${id}` });
    let klar = false;
    for (let i = 0; i < 40 && !klar; i++) { await vanta(250); klar = (await utvardera('document.readyState')) === 'complete'; }
    const r = (await utvardera(PROV)) ?? { filmer: 0, fel: ['sidan svarade inte'] };
    if (r.fel.length) felSidor++;
    console.log(`${r.fel.length ? 'NEJ' : 'ok '}  ${id.padEnd(34)} ${r.filmer} ${r.filmer === 1 ? 'film' : 'filmer'}${r.fel.length ? `: ${r.fel.join('; ')}` : ''}`);
    if (!d.lathund) continue;
    await skicka('Page.navigate', { url: `${bas}/stodundervisning/${id}/lathund` });
    klar = false;
    for (let i = 0; i < 40 && !klar; i++) { await vanta(250); klar = (await utvardera('document.readyState')) === 'complete'; }
    const s = (await utvardera(PROV_SPELARE)) ?? { filmer: 0, fel: ['lathundssidan svarade inte'] };
    // Utskriften, i fönstrets fulla bredd: spelaren ska vara borta.
    await skicka('Emulation.setEmulatedMedia', { media: 'print' });
    const iUtskrift = await utvardera(`getComputedStyle(document.querySelector('[data-filmspelare]') ?? document.body).display`);
    await skicka('Emulation.setEmulatedMedia', { media: '' });
    if (s.filmer && iUtskrift !== 'none') s.fel.push(`spelaren syns i utskriften (display: ${iUtskrift})`);
    if (s.fel.length) felSidor++;
    console.log(`${s.fel.length ? 'NEJ' : 'ok '}  ${`${id}/lathund`.padEnd(34)} ${s.filmer} ${s.filmer === 1 ? 'film' : 'filmer'} i spelaren${s.fel.length ? `: ${s.fel.join('; ')}` : ''}`);
  }
} finally {
  ws.close();
  proc.kill();
  server?.close();
}
const lage = `${minskad ? 'med minskad rörelse' : 'utan minskad rörelse'}, ${ute || `dist med X-Frame-Options ${ramregel ?? 'saknas'}`}`;
if (felSidor) {
  console.error(`\nfilmprov: filmerna på ${felSidor} sidor spelar inte som de ska (${metoder.length} metoder prövade, ${lage}). Film.astro, Filmspelare.astro och METODER.md under Filmerna.`);
  process.exit(1);
}
console.log(`\nFilmerna i ${metoder.length} ${metoder.length === 1 ? 'metod' : 'metoder'} spelar, Pausa fryser dem och Spela fortsätter, och spelaren på lathundssidan visar varje film (${lage}).`);
