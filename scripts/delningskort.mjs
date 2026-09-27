#!/usr/bin/env node
// Delningskorten: ritar de kort som saknas med Chrome ur mallen src/pages/delning/kort/[namn].astro och lägger dem
// i public/delning/ (följer med i bygget) och i dist/delning/. Vilka kort som ska finnas och vad filerna heter står
// i bygget, i dist/delning/kort.json, som src/lib/delningskort.ts skriver. Filnamnet bär en kontrollsumma av allt
// som syns på kortet, så ett kort som finns är aktuellt, och ett kort som ingen sida längre pekar på tas bort.
// Filerna committas: Netlify har ingen Chrome. Allt ur en källa utan drift, som lathundens pdf (Niclas 2026-09-27).
//
//   node scripts/delningskort.mjs                 ritar de kort som saknas (körs sist i npm run validera, efter bygget)
//   node scripts/delningskort.mjs --kontrollera   stannar om ett kort saknas i bygget (körs i npm run build)

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync, rmSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const kontrollera = process.argv.includes('--kontrollera');
const forteckning = join(rot, 'dist', 'delning', 'kort.json');
const publik = join(rot, 'public', 'delning');
const byggd = join(rot, 'dist', 'delning');

if (!existsSync(forteckning)) { console.error('dist/delning/kort.json saknas: bygg sajten först (astro build).'); process.exit(1); }
const kort = JSON.parse(readFileSync(forteckning, 'utf8'));
const fil = (k) => k.fil.replace(/^\/delning\//, '');

if (kontrollera) {
  const saknas = kort.filter((k) => !existsSync(join(byggd, fil(k))));
  if (saknas.length) {
    console.error(`Delningskort saknas för ${saknas.length} sidor:\n  ${saknas.slice(0, 12).map((k) => `${k.sida} (${fil(k)})`).join('\n  ')}\nKör npm run validera, som ritar dem, och committa public/delning/.`);
    process.exit(1);
  }
  console.log(`Delningskorten finns för ${kort.length} sidor.`);
  process.exit(0);
}

mkdirSync(publik, { recursive: true });
const behovs = new Set(kort.map(fil));
const overblivna = readdirSync(publik).filter((f) => f.endsWith('.jpg') && !behovs.has(f));
for (const f of overblivna) {
  unlinkSync(join(publik, f));
  if (existsSync(join(byggd, f))) unlinkSync(join(byggd, f));
}
const saknas = kort.filter((k) => !existsSync(join(publik, fil(k))));
if (saknas.length === 0) {
  console.log(`Delningskorten är aktuella för ${kort.length} sidor${overblivna.length ? `; ${overblivna.length} gamla togs bort` : ''}.`);
  process.exit(0);
}

let sharp;
try { sharp = (await import('sharp')).default; } catch { console.error('sharp saknas (följer med Astro): kör npm install.'); process.exit(1); }
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!chrome) { console.error('Chrome hittades inte.'); process.exit(1); }
console.log(`Ritar ${saknas.length} delningskort …`);

const vanta = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 4327;
const server = spawn('npx', ['astro', 'preview', '--port', String(port), '--ignore-lock'], { cwd: rot, shell: true, stdio: 'ignore' });
const devtools = 9300 + Math.floor(Math.random() * 500);
const profil = join(tmpdir(), `delningskort-${devtools}`);
const webblasare = spawn(chrome, ['--headless=new', `--remote-debugging-port=${devtools}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', `--user-data-dir=${profil}`, 'about:blank'], { stdio: 'ignore' });
const stang = () => {
  for (const p of [server, webblasare]) { try { execFileSync('taskkill', ['/F', '/T', '/PID', String(p.pid)], { stdio: 'ignore' }); } catch { p.kill(); } }
  try { rmSync(profil, { recursive: true, force: true }); } catch { /* Chrome släpper profilen strax */ }
};

let fel = 0;
try {
  let svarar = false;
  for (let i = 0; i < 60 && !svarar; i++) {
    await vanta(1000);
    svarar = await fetch(`http://localhost:${port}/delning/kort.json`).then((r) => r.ok).catch(() => false);
  }
  if (!svarar) throw new Error('förhandsservern svarade inte inom 60 sekunder');
  let mal;
  for (let i = 0; i < 40 && !mal; i++) { await vanta(250); try { mal = (await (await fetch(`http://127.0.0.1:${devtools}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* startar */ } }
  if (!mal) throw new Error('Chrome startade inte');
  const ws = new WebSocket(mal.webSocketDebuggerUrl);
  await new Promise((r, x) => { ws.onopen = r; ws.onerror = x; });
  let nr = 0;
  const svar = new Map();
  const handelser = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && svar.has(d.id)) { svar.get(d.id)(d); svar.delete(d.id); }
    else if (d.method && handelser.has(d.method)) { handelser.get(d.method)(d); handelser.delete(d.method); }
  };
  const skicka = (method, params = {}) => new Promise((r) => { const id = ++nr; svar.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await skicka('Page.enable');
  await skicka('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
  for (const k of saknas) {
    try {
      const laddad = new Promise((r) => handelser.set('Page.loadEventFired', r));
      await skicka('Page.navigate', { url: `http://localhost:${port}${k.mall}` });
      await Promise.race([laddad, vanta(15000)]);
      // Typsnittet och bilderna ska vara inne innan kortet fotograferas.
      await skicka('Runtime.evaluate', { awaitPromise: true, expression: 'document.fonts.ready.then(() => Promise.all([...document.images].map((i) => i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; })))).then(() => true)' });
      await vanta(80);
      const bild = await skicka('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
      if (!bild.result?.data) throw new Error('ingen bild');
      const jpg = await sharp(Buffer.from(bild.result.data, 'base64')).jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();
      const m = await sharp(jpg).metadata();
      if (m.width !== 1200 || m.height !== 630) throw new Error(`kortet blev ${m.width} × ${m.height}`);
      writeFileSync(join(publik, fil(k)), jpg);
      if (existsSync(byggd)) writeFileSync(join(byggd, fil(k)), jpg);
    } catch (e) {
      fel++;
      console.log(`  FEL  ${k.sida}: ${e.message}`);
    }
  }
  ws.close();
} catch (e) {
  fel++;
  console.error(`Delningskorten: ${e.message}`);
} finally {
  stang();
}
console.log(fel ? `${fel} fel.` : `Klart: ${saknas.length} nya delningskort i public/delning/${overblivna.length ? `, ${overblivna.length} gamla borttagna` : ''}. Committa dem med ändringen.`);
process.exit(fel ? 1 : 0);
