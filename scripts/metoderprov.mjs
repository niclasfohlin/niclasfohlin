#!/usr/bin/env node
// Metoderprovet (K-621): undervisningsmetodernas sidor i det byggda dist, i Chrome, som en lärare möter dem. Varje sida
// under /metoder/ (banken, metodens sida och Lär dig metoden) prövas i 320 och 360 punkters bredd med allt utfällt: ingen
// sida rullar i sidled (designgranskningen 2026-10-30: planeringsbladet gjorde metodens sida 343 punkter bred i 320, och
// utskriftsformat.mjs prövar bara Stödundervisning). På metodens sida och lathundens sida leder varje ankare till ett
// element och varje fil som sidan länkar till finns, och på metodens sida står delarna i standardens ordning
// (UNDERVISNINGSMETODENS_DELAR). Lathundens sida säger det lathundens pdf säger (K-632): varje mening på sidan står i
// public/metoder/<id>-lathund.pdf, som sajten gör ur sin PowerPoint-fil sedan K-637 (scripts/lathund-pdf.mjs), och pdf:ens sidfot leder till sidan, som finns för varje metod med lathunden (granskningen
// 2026-10-30: sidfoten ledde till en adress som gav 404). Metodens saker (STIL.md under Hänvisningar,
// undervisningsmetodensSaker i src/lib/undervisningsmetod.ts) är länkar där metodens sida nämner dem, inget namn ser ut som en
// sak som metoden inte har (olankadeSaker i standarden), och varje sak har en knapp under sig vars fil finns, som planprov.mjs
// prövar Stödundervisnings saker. Körs i npm run validera.
//
//   node scripts/metoderprov.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { UNDERVISNINGSMETODENS_DELAR, meningarna, sakdelar, olankadeSaker, lathundensSidor } from '../src/lib/standard/index.js';
import { ren, utanHuvudOchFot, pdfText } from './textjamforelse.mjs';

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
const lathundsidor = sidor.filter((s) => /^\/metoder\/[^/]+\/lathund$/.test(s));
const fel = [];
let provadeSaker = 0;

// Det som går att pröva i HTML: ankarna, filerna och delarnas ordning.
for (const s of [...metodsidor, ...lathundsidor]) {
  const html = readFileSync(join(dist, s, 'index.html'), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/href="#([^"]+)"/g)) if (!ids.has(decodeURIComponent(m[1]))) fel.push(`${s}: länken #${m[1]} leder inte till något element`);
  for (const m of html.matchAll(/(?:href|src|data)="(\/metoder\/[^"?#]+\.(?:pdf|docx|pptx|png|svg|webp|mp4|zip))(?:\?[^"]*)?"/g)) if (!existsSync(join(dist, decodeURIComponent(m[1])))) fel.push(`${s}: filen ${m[1]} saknas`);
  if (lathundsidor.includes(s)) {
    // Lathundens saker leder till metodens sida, och ankaret står där.
    const metod = s.replace(/\/lathund$/, '');
    const metodens = new Set([...readFileSync(join(dist, metod, 'index.html'), 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const m of html.matchAll(new RegExp(`href="${metod}#([^"]+)"`, 'g'))) if (!metodens.has(decodeURIComponent(m[1]))) fel.push(`${s}: länken ${metod}#${m[1]} leder inte till något element på metodens sida`);
    provaSakerna(s, html, ids);
    continue;
  }
  const delar = [...html.matchAll(/<section class="um-del" id="del-([a-z-]+)"/g)].map((m) => m[1]);
  const vantat = UNDERVISNINGSMETODENS_DELAR.map((d) => d.id);
  if (delar.join(' ') !== vantat.join(' ')) fel.push(`${s}: delarna står ${delar.join(', ')}, ska vara ${vantat.join(', ')}`);
  // En länk till ett ankare på metodens egen sida med hela adressen, som metodens saker har.
  for (const m of html.matchAll(new RegExp(`href="${s}#([^"]+)"`, 'g'))) if (!ids.has(decodeURIComponent(m[1]))) fel.push(`${s}: länken ${s}#${m[1]} leder inte till något element`);
  provaSakerna(s, html, ids);
}

// Metodens saker på sidan: listan står i sidan (um-saker, ur undervisningsmetodensSaker).
function provaSakerna(s, html, ids) {
  const json = html.match(/<script type="application\/json" id="um-saker">([\s\S]*?)<\/script>/)?.[1];
  if (!json) { fel.push(`${s}: sidan saknar metodens saker (um-saker i src/pages/metoder/[id].astro)`); return; }
  const saker = JSON.parse(json);
  // Texten som läsaren ser och som kan nämna en sak: inte länkarna och knapparna, rubrikerna och huvudena, etiketterna (dt,
  // th, caption, label, filrubriken), raderna som fälls ut (summary, som inte kan ha en länk i sig), navigeringen, det som
  // bara står för skärmläsaren och upphovsraden (STIL.md under Hänvisningar: rubrikerna och etiketterna länkas inte).
  const HOPPA = new Set(['a', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'nav', 'dt', 'th', 'caption', 'label', 'summary', 'script', 'style', 'svg', 'title', 'template', 'textarea', 'select', 'option', 'noscript']);
  const TOMMA = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  // Rutornas rubriker och planeringsbladets etiketter är rubriker och etiketter, som Rutinen: T-kortet och Färdigheten på
  // T-kortet (K-645).
  const KLASS = /\bclass="[^"]*\b(upphov|filrubrik|faktaruta-etikett|visually-hidden|tryck-fot|um-ruta-rubrik|um-blad-etikett)\b/;
  const tecken = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  const avkoda = (t) => t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (h, k) => (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' || k[1] === 'X' ? parseInt(k.slice(2), 16) : Number(k.slice(1))) : tecken[k.toLowerCase()] ?? h));
  const kropp = html.slice(html.indexOf('<article'), html.lastIndexOf('</article>'));
  const stack = [];
  let hoppa = 0;
  let fran = 0;
  const texter = [];
  for (const m of kropp.matchAll(/<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g)) {
    const text = kropp.slice(fran, m.index);
    if (!hoppa && text.trim()) texter.push(avkoda(text));
    fran = m.index + m[0].length;
    const namn = m[2]?.toLowerCase();
    if (!namn || TOMMA.has(namn) || m[4]) continue;
    if (m[1]) {
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].namn === namn) { for (const x of stack.splice(i)) if (x.hoppar) hoppa--; break; }
    } else {
      const hoppar = HOPPA.has(namn) || KLASS.test(m[3] ?? '') || /\saria-hidden="true"/.test(m[3] ?? '');
      stack.push({ namn, hoppar });
      if (hoppar) hoppa++;
    }
  }
  const utan = new Set();
  const okanda = new Set();
  for (const t of texter) {
    for (const d of sakdelar(t, saker)) if (d.sak !== undefined) utan.add(`"${d.text}" i ”${t.replace(/\s+/g, ' ').trim().slice(0, 70)}”`);
    for (const namn of olankadeSaker(t, saker)) okanda.add(namn);
  }
  for (const u of utan) fel.push(`${s}: ${u} är ingen länk till saken (medSaker i src/lib/undervisningsmetod.ts)`);
  for (const o of okanda) fel.push(`${s}: "${o}" ser ut som en sak, men metoden har ingen sak som heter så. Skriv namnet som saken heter, eller lägg saken i undervisningsmetodensSaker`);
  // Varje sak har en knapp under sig som skriver ut eller laddar ner den, och knappens fil finns. Saken är elementet med
  // ankaret, och knappen står i det. En sak som är en egen sida, som lathunden, har en knapp till sidan, och sidan finns.
  // Metodkortet är en del av sidan (slag avsnitt) och skrivs ut med metoden.
  for (const x of saker.filter((y) => y.slag !== 'avsnitt')) {
    const [vag, ankare] = x.adress.split('#');
    if (!ankare) {
      if (!existsSync(join(dist, vag, 'index.html'))) fel.push(`${s}: ${x.namn} leder till ${vag}, som inte finns i dist`);
      if (!new RegExp(`<a class="knapp[^"]*" href="${vag}"`).test(html)) fel.push(`${s}: ${x.namn} har ingen knapp till ${vag}`);
      continue;
    }
    if (vag !== s || !ids.has(ankare)) continue;
    const start = html.search(new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\sid="${ankare}"`));
    const tagg = html.slice(start).match(/^<([a-z][a-z0-9]*)/)[1];
    // Elementets slut: den stängande taggen som går jämnt ut med de öppnande av samma slag.
    let djup = 0;
    let slut = html.length;
    for (const m of html.slice(start).matchAll(new RegExp(`<(/?)${tagg}\\b[^>]*>`, 'g'))) { djup += m[1] ? -1 : 1; if (!djup) { slut = start + m.index + m[0].length; break; } }
    const knappar = [...html.slice(start, slut).matchAll(/<a\b([^>]*)>/g)].map((m) => m[1]).filter((a) => /\sdata-skriv-ut-pdf\b/.test(a) || /\sdownload="[^"]*\.(pdf|docx)"/.test(a)).map((a) => a.match(/\shref="([^"?#]+)/)?.[1]).filter(Boolean);
    if (!knappar.length) fel.push(`${s}#${ankare}: ${x.namn} har ingen knapp under sig som skriver ut eller laddar ner den`);
    for (const k of knappar) if (!existsSync(join(dist, decodeURIComponent(k)))) fel.push(`${s}#${ankare}: knappen under ${x.namn} leder till ${k}, som inte finns`);
  }
  provadeSaker += saker.length;
}

// Lathundens pdf och sidan (K-632; pdf:en är sajtens sedan K-637). Texten jämförs med samma regler som metodernas paritet, och pdf:en utan
// sidhuvud och sidfot (scripts/textjamforelse.mjs). Sidfoten prövas för sig: den ska leda till lathundens sida.
const lathundPdf = new Map();
// Det lathunden säger men pdf:en ännu inte har: en mening på sidan som står i en av de här texterna ur lathundensSidor får
// saknas i pdf:en, som ['vad', (sidor) => texterna]. En rad tas bort när pdf:en har gjorts om, och provet stannar då på
// varje mening som glider isär. Tom sedan pdf:en ritas ur lathundensSidor (riggens dce9e59, K-632, och sajtens K-637).
const VANTAR = [];
const lathundensVantande = new Map();
const lathundenVantar = new Set();
for (const s of metodsidor) {
  const id = s.split('/')[2];
  const pdf = join(rot, 'public', 'metoder', `${id}-lathund.pdf`);
  if (!existsSync(pdf)) continue;
  if (!lathundsidor.includes(`${s}/lathund`)) { fel.push(`${s}: ${id}-lathund.pdf finns, men sidan ${s}/lathund, som pdf:ens sidfot leder till, finns inte`); continue; }
  // Pdf:en ur PowerPoint läses i formernas ordning, så att tabellernas celler inte fogas ihop (pdfText med raw).
  const text = pdfText(pdf, { raw: true });
  if (!text.trim()) { fel.push(`${s}/lathund: ${id}-lathund.pdf gick inte att läsa med pdftotext`); continue; }
  if (!ren(text).includes(ren(`niclasfohlin.se${s}/lathund`))) fel.push(`${s}/lathund: sidfoten i ${id}-lathund.pdf leder inte hit`);
  lathundPdf.set(`${s}/lathund`, ren(utanHuvudOchFot(text)));
  const sidorna = lathundensSidor(parse(readFileSync(join(rot, 'src', 'content', 'undervisningsmetoder', `${id}.yaml`), 'utf8')));
  lathundensVantande.set(`${s}/lathund`, VANTAR.map(([namn, texter]) => [namn, (texter(sidorna) ?? []).filter(Boolean).map(ren)]));
}
// Lathundens texter i Chrome, som läsaren ser dem. Rubrikerna, knapparna, länkarna i bandet och det som bara skärmläsaren
// hör står inte i pdf:en. Ur planeringsbladet läses bara det läraren skrev, eftersom bladets etiketter är sajtens blad
// (Planeringsblad.astro).
const LATHUNDENS_TEXTER = `(() => {
  const lh = document.querySelector('.lh');
  if (!lh) return null;
  const k = lh.cloneNode(true);
  k.querySelectorAll('h2, h3, .lh-kicker, .lh-etikett, .lh-lank, button, .visually-hidden, thead, .um-kort-nr').forEach((e) => e.remove());
  const ut = [];
  for (const blad of k.querySelectorAll('.um-blad')) { blad.querySelectorAll('dd, .um-blad-text, li').forEach((e) => ut.push(e.textContent)); blad.remove(); }
  const LOV = 'p, li, td, th, strong, dd, .um-lh-under';
  k.querySelectorAll(LOV).forEach((e) => { if (!e.querySelector(LOV)) ut.push(e.textContent); });
  return ut.map((t) => t.replace(/\\s+/g, ' ').trim()).filter(Boolean);
})()`;
let lathundensMeningar = 0;

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
      // Inget namn i remsan, cellerna eller kortets värden klipps eller går ut ur sin ruta (designgranskningen 2026-10-30), och
      // inget ord i kärnans kort går ut ur kortet (Samarbetsfärdigheter i 390 punkter, K-645).
      const klippt = await kor(`(() => { const ut = []; for (const e of document.querySelectorAll('.um-remsa-namn, .um-celler a, .mp-varde, .mp-namn')) { if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') ut.push(e.textContent.trim().slice(0, 30)); const ram = e.closest('.mp-bank-halv, .mp-rad, .mp-bank-en'); if (ram && e.getBoundingClientRect().right > ram.getBoundingClientRect().right + 1) ut.push(e.textContent.trim().slice(0, 30) + ' (utanför rutan)'); } for (const e of document.querySelectorAll('.um-kort-namn, .um-kort-vad, .um-kort-moment')) if (e.scrollWidth > e.clientWidth + 1) ut.push(e.textContent.trim().slice(0, 30) + ' (ut ur kortet)'); return ut.join(' · '); })()`);
      if (klippt) fel.push(`${s}: i ${bredd} punkter klipps eller går ut: ${klippt}`);
    }
    // Varje mening på lathundens sida står i lathundens pdf (K-632, K-637).
    const pdf = lathundPdf.get(s);
    if (!pdf) continue;
    const texter = await kor(LATHUNDENS_TEXTER);
    if (!Array.isArray(texter) || !texter.length) { fel.push(`${s}: lathundens texter gick inte att läsa på sidan`); continue; }
    for (const t of texter) for (const m of meningarna(t)) {
      lathundensMeningar++;
      if (pdf.includes(ren(m))) continue;
      const vantar = lathundensVantande.get(s)?.find(([, texter]) => texter.some((x) => x.includes(ren(m))));
      if (vantar) lathundenVantar.add(vantar[0]);
      else fel.push(`${s}: står inte i ${s.split('/')[2]}-lathund.pdf: "${m.slice(0, 90)}"`);
    }
  }
  ws.close();
} finally {
  proc.kill();
  server.close();
  try { rmSync(profil, { recursive: true, force: true }); } catch { /* Chrome kan hålla filerna en stund */ }
}
if (fel.length) { console.error(`metoderprov: ${fel.length} fel\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`metoderprov: ${sidor.length} sidor under /metoder rullar inte i sidled i 320 och 360 punkter, inga namn i remsan, cellerna eller kortet klipps, och på ${metodsidor.length} metodsidor leder ankarna och filerna rätt, delarna står i standardens ordning och metodens ${provadeSaker} saker är länkar där de nämns och har en knapp under sig, och ${lathundensMeningar} meningar på ${lathundsidor.length} lathundssidor står i lathundens pdf.`);
if (lathundenVantar.size) console.log(`! metoderprov: lathundens pdf saknar ännu det sidan visar av ${[...lathundenVantar].join(", ")} (K-632)`);
