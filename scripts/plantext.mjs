#!/usr/bin/env node
// Planens text till en länkgranskning (Niclas 2026-10-25: "Finns det något som namnges som bör länkas till i metoden som inte
// gör det?"). Öppnar planen för varje metod som kan planeras i Chrome, sparar en plan med Följ insatsen, och går igenom
// varje läge vid fyra datum (före start, i vecka 3, i vecka 7 och långt efter): Före, varje vecka med varje pass i
// rutan, och Efter insatsen, med allt som fälls ut öppnat. Varje länk står utmärkt, ⟦texten → vart den leder⟧, med målets
// rubrik på metodens sida. Ut kommer två filer per metod: varje rad i planen en gång, med läget där den först stod, och
// metodens platser med ankare, som en granskare jämför med (METODER.md under Planera insatsen, Proven).
//
//   node scripts/plantext.mjs [<id> …] [--ut <mapp>]    förval: alla metoder med planen, till underlag/prov/plantext/
//
// Läser dist, som npm run validera bygger. Kräver Chrome, som scripts/planprov.mjs.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(rot, 'dist');
const args = process.argv.slice(2);
const ut = args.includes('--ut') ? resolve(args[args.indexOf('--ut') + 1]) : join(rot, 'underlag', 'prov', 'plantext');
const valda = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--ut');
const alla = readdirSync(join(dist, 'stodundervisning')).filter((x) => existsSync(join(dist, 'stodundervisning', x, 'planera', 'index.html')));
const metoder = valda.length ? valda : alla;
const chrome = process.env.CHROME ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!chrome) { console.error('plantext: Chrome saknas.'); process.exit(1); }
mkdirSync(ut, { recursive: true });

const TYPER = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.pdf': 'application/pdf' };
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPER[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const bas = `http://127.0.0.1:${server.address().port}`;
const port = 9700 + Math.floor(Math.random() * 200);
const profil = join(tmpdir(), `plantext-${port}`);
mkdirSync(profil, { recursive: true });
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profil}`, 'about:blank'], { stdio: 'ignore' });
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));

// En flik med ett fast datum, klockan tio, så att planen visar det läge som gäller den dagen.
async function flik(datum) {
  let info;
  for (let i = 0; i < 40 && !info; i++) { await vanta(250); try { info = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { /* startar */ } }
  if (!info) throw new Error('Chrome svarade inte.');
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((r, x) => { ws.onopen = r; ws.onerror = x; });
  let nr = 0;
  const vantande = new Map();
  let laddad = () => {};
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && vantande.has(d.id)) { vantande.get(d.id)(d); vantande.delete(d.id); } else if (d.method === 'Page.loadEventFired') laddad(); };
  const skicka = (method, params = {}) => new Promise((r) => { const id = ++nr; vantande.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await skicka('Page.enable');
  const [a, m, d] = datum.split('-').map(Number);
  await skicka('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const FAST = ${Date.UTC(a, m - 1, d, 9, 0, 0)}; const D = Date; class F extends D { constructor(...x) { super(...(x.length ? x : [FAST])); } static now() { return FAST; } } globalThis.Date = F; window.confirm = () => true; })();` });
  await skicka('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const kor = async (expression) => { const r = await skicka('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); return r.result?.result?.value; };
  return { kor, oppna: async (url) => { const klar = new Promise((r) => { laddad = r; }); await skicka('Page.navigate', { url }); await Promise.race([klar, vanta(20000)]); await vanta(400); }, stang: () => ws.close() };
}

// Texten i ett element, rad för rad, med länkarna utmärkta. Det som är dolt hoppas över; det som fälls ut är öppnat först.
const DUMPA = `(rot, mal) => {
  const BLOCK = new Set(['P','LI','DIV','H1','H2','H3','H4','H5','H6','TR','SECTION','DETAILS','SUMMARY','DT','DD','UL','OL','TABLE','FIGURE','FIGCAPTION','NAV','HEADER','LABEL','FIELDSET','LEGEND','BLOCKQUOTE']);
  const rader = [];
  let rad = '';
  const bryt = () => { const t = rad.replace(/\\s+/g, ' ').trim(); if (t) rader.push(t); rad = ''; };
  const gom = (el) => el.hidden || getComputedStyle(el).display === 'none' || el.getAttribute('aria-hidden') === 'true';
  const ga = (n) => {
    if (n.nodeType === 3) { rad += n.textContent; return; }
    if (n.nodeType !== 1 || gom(n) || n.classList.contains('visually-hidden')) return;
    if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE' || n.tagName === 'TEXTAREA' || n.tagName === 'SELECT' || n.tagName === 'svg') return;
    if (n.tagName === 'A' && n.getAttribute('href')) {
      const href = n.getAttribute('href').split('?')[0];
      const ankare = href.includes('#') ? href.split('#')[1] : '';
      const vart = ankare && mal[ankare] ? href.replace(/^\\/stodundervisning\\//, '') + ' (' + mal[ankare] + ')' : href.replace(/^\\/stodundervisning\\//, '');
      rad += ' ⟦' + n.textContent.replace(/\\s+/g, ' ').trim() + ' → ' + vart + '⟧ ';
      return;
    }
    if (n.tagName === 'BUTTON') { rad += ' [knapp: ' + n.textContent.replace(/\\s+/g, ' ').trim() + '] '; return; }
    const block = BLOCK.has(n.tagName);
    if (block) bryt();
    for (const c of n.childNodes) ga(c);
    if (block) bryt();
  };
  ga(rot);
  bryt();
  return rader;
}`;

try {
  for (const id of metoder) {
    // Metodens platser: varje element med id och en rubrik eller text att känna igen det på.
    const f0 = await flik('2026-10-28');
    await f0.oppna(`${bas}/stodundervisning/${id}`);
    const mal = await f0.kor(`(() => { const ut = {}; for (const el of document.querySelectorAll('main [id]')) { const r = /^H[1-6]$/.test(el.tagName) ? el : el.querySelector('h2, h3, h4, figcaption, .m-blad-rubrik, .m-lista-rubrik, legend, summary, p.kicker'); const t = (r ?? el).textContent.replace(/\\s+/g, ' ').trim().slice(0, 90); if (t) ut[el.id] = t; } return ut; })()`) ?? {};
    f0.stang();
    // Planen: start måndag 2 november 2026, Följ insatsen, sparad.
    const f1 = await flik('2026-10-28');
    await f1.oppna(`${bas}/stodundervisning/${id}/planera`);
    await f1.kor(`(() => { const i = document.getElementById('pl-start'); i.value = '2026-11-02'; i.dispatchEvent(new Event('change')); const f = document.getElementById('pl-folj'); if (f && !f.checked) f.click(); return true; })()`);
    await vanta(200);
    await f1.kor(`document.getElementById('pl-spara').click()`);
    await vanta(400);
    f1.stang();
    // Fyra dagar: före start, mitt i vecka 3, i vecka 7 (sista veckan i en plan på sex veckor och mitt i en längre) och långt
    // efter, när varje plan är slut. Det som bara står i den vecka som pågår kommer så med för olika veckor.
    const datumen = [['före start', '2026-10-28'], ['onsdag i vecka 3', '2026-11-18'], ['onsdag i vecka 7', '2026-12-16'], ['långt efter', '2027-02-24']];
    const sett = new Map();
    const fullt = [];
    for (const [namn, datum] of datumen) {
      const f = await flik(datum);
      await f.oppna(`${bas}/stodundervisning/${id}/planera`);
      const vyer = (await f.kor(`[...new Set([...document.querySelectorAll('#pl-veckan .pl-remsa [data-vy]')].map((b) => b.dataset.vy))]`)) ?? [];
      const lagen = [['planen', `document.getElementById('pl-planen')`], ...vyer.map((v) => [`läget ${v}`, `document.getElementById('pl-veckan')`, v])];
      for (const [lage, valj, vy] of lagen) {
        if (vy !== undefined) { await f.kor(`document.querySelector('#pl-veckan .pl-remsa [data-vy="${vy}"]')?.click()`); await vanta(250); }
        await f.kor(`document.querySelectorAll('#pl-veckan details, #pl-planen details').forEach((d) => { d.open = true; })`);
        const pass = vy === undefined ? [null] : [null, ...((await f.kor(`[...document.querySelectorAll('#pl-veckan [data-visa-pass]')].map((b) => b.dataset.visaPass).filter(Boolean)`)) ?? [])];
        for (const p of pass) {
          if (p) { await f.kor(`document.querySelector('#pl-veckan [data-visa-pass="${p}"]')?.click()`); await vanta(200); await f.kor(`document.querySelectorAll('#pl-veckan details').forEach((d) => { d.open = true; })`); }
          const rader = (await f.kor(`(${DUMPA})(${valj}, ${JSON.stringify(mal)})`)) ?? [];
          const var_ = `${namn}, ${lage}${p ? `, pass ${p} i rutan` : ''}`;
          fullt.push(`## ${var_}\n\n${rader.join('\n')}\n`);
          for (const r of rader) if (!sett.has(r)) sett.set(r, var_);
        }
      }
      f.stang();
    }
    const unika = [...sett].filter(([r]) => r.length > 2);
    writeFileSync(join(ut, `${id}.md`), `# Planens text: ${id}\n\nVarje rad i planen en gång, med läget där den först stod. Länkarna står som ⟦texten → vart den leder (målets rubrik)⟧. Planen börjar måndag 2 november 2026, med Följ insatsen, och läses vid fyra datum.\n\n${unika.map(([r, v]) => `- ${r}  \n  _(${v})_`).join('\n')}\n`);
    writeFileSync(join(ut, `${id}-fullt.md`), `# Planens text i varje läge: ${id}\n\n${fullt.join('\n')}`);
    writeFileSync(join(ut, `${id}-platser.md`), `# Metodens platser: ${id}\n\nVarje element med ett ankare på metodens sida, /stodundervisning/${id}#<ankare>, med sin rubrik.\n\n| Ankare | Rubrik eller text |\n|---|---|\n${Object.entries(mal).map(([a, t]) => `| ${a} | ${t.replace(/\|/g, '/')} |`).join('\n')}\n`);
    console.log(`plantext: ${id}: ${unika.length} rader, ${Object.keys(mal).length} platser på metodens sida`);
  }
} finally {
  proc.kill();
  server.close();
}
