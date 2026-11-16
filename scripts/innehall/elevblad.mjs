#!/usr/bin/env node
// Elevernas två blad i verktyget Innehåll (K-793): riggens html i scripts/innehall/elevblad/<id>.html, ritad för eleven i
// Andika och prövad av tolv kalla elever, tryckt till pdf med Chrome i public/innehall/<id>.pdf, som strukturkorten, så att
// inget görs om för hand. En pdf görs om bara när bladet, typsnittet eller packaren har ändrats: manifestet
// src/data/innehall/elevblad.json bär summan av dem och av pdf:en. Varje blad är ett A4.
//
//   node scripts/innehall/elevblad.mjs                gör de pdf:er som saknas eller är gjorda av ett äldre blad (validera)
//   node scripts/innehall/elevblad.mjs --kontrollera  stanna när en pdf saknas, är överbliven eller inte är gjord av bladet
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PDFDocument } from 'pdf-lib';

const HAR = dirname(fileURLToPath(import.meta.url));
const ROT = join(HAR, '..', '..');
const BLAD = join(HAR, 'elevblad');
const UT = join(ROT, 'public', 'innehall');
const MANIFEST = join(ROT, 'src', 'data', 'innehall', 'elevblad.json');
const kontrollera = process.argv.includes('--kontrollera');

const sha = (b) => createHash('sha256').update(b).digest('hex');
// Summan räknas med radsluten som i git, eftersom Windows har filerna med CRLF och Netlify, som kör --kontrollera, med LF.
const text = (fil) => readFileSync(fil, 'utf8').replace(/\r\n/g, '\n');
const summa = (html) => sha([text(html), sha(readFileSync(join(HAR, 'typsnitt', 'Andika-Regular.ttf'))), text(join(ROT, 'scripts', 'pdfpack.py'))].join('\n')).slice(0, 32);
const lasManifest = () => { try { return JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch { return {}; } };

const blad = existsSync(BLAD) ? readdirSync(BLAD).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, '')) : [];
const manifest = lasManifest();
const fel = [];
const attGora = [];
for (const id of blad) {
  const pdf = join(UT, `${id}.pdf`);
  const post = manifest[id];
  const s = summa(join(BLAD, `${id}.html`));
  if (!existsSync(pdf)) { fel.push(`${id}.pdf saknas`); attGora.push(id); }
  else if (!post || post.blad !== s) { fel.push(`${id}.pdf är gjord av ett äldre blad`); attGora.push(id); }
  else if (post.pdf !== sha(readFileSync(pdf))) { fel.push(`${id}.pdf stämmer inte med manifestet`); attGora.push(id); }
}
const overblivna = Object.keys(manifest).filter((id) => !blad.includes(id));
for (const id of overblivna) fel.push(`${id}.pdf är överbliven: bladet finns inte längre`);

if (kontrollera) {
  if (fel.length) { console.error(`Elevernas blad i Innehåll: ${fel.join('; ')}. Kör node scripts/innehall/elevblad.mjs.`); process.exit(1); }
  console.log(`Elevernas blad i Innehåll: ${blad.length} pdf:er, gjorda av bladen.`);
  process.exit(0);
}

const chrome = process.env.CHROME ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (attGora.length && !chrome) { console.error('Hittar inte Chrome. Sätt CHROME=<sökväg>.'); process.exit(1); }
const tmp = mkdtempSync(join(tmpdir(), 'innehall-elevblad-'));
try {
  for (const id of attGora) {
    const ratt = join(tmp, `${id}-chrome.pdf`);
    execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=5000', `--print-to-pdf=${ratt}`, pathToFileURL(join(BLAD, `${id}.html`)).href], { stdio: 'ignore', timeout: 120000 });
    const sidor = (await PDFDocument.load(readFileSync(ratt))).getPageCount();
    if (sidor !== 1) { console.error(`${id}: bladet blev ${sidor} sidor, och det ska vara ett A4.`); process.exit(1); }
    const ut = join(UT, `${id}.pdf`);
    execFileSync('python', [join(ROT, 'scripts', 'pdfpack.py'), ratt, ut], { stdio: 'inherit', timeout: 600000 });
    manifest[id] = { blad: summa(join(BLAD, `${id}.html`)), pdf: sha(readFileSync(ut)) };
    console.log(`ok   ${id}.pdf, ${Math.round(readFileSync(ut).length / 1024)} kB`);
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }
for (const id of overblivna) { if (existsSync(join(UT, `${id}.pdf`))) unlinkSync(join(UT, `${id}.pdf`)); delete manifest[id]; }
if (attGora.length || overblivna.length) writeFileSync(MANIFEST, `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 1)}\n`);
console.log(`Elevernas blad i Innehåll: ${blad.length} pdf:er${attGora.length ? `, ${attGora.length} gjorda nu` : ', alla aktuella'}.`);
