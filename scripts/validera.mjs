// Valideringen, npm run validera (ARBETSSATT.md under Grenar och commits): stegen i ordning, med tiden för varje steg
// sist, så att det syns var tiden går (K-484; Niclas 2026-10-20: "Den gör full validation skulle behöva göras snabbare").
//
// Sajten byggs en gång. Förut byggde Word-lathundens mätning, sidlåset och lathundens pdf var sitt hela bygge för sina
// provfiler, och bankpdf.mjs ett till när Word hade gjort nya pdf:er: fyra eller fem byggen om knappt tre minuter, av 17
// och 23 minuter samma dag. Nu frågar valideringen först mätningarna vilka metoder de behöver provfiler för (--behov),
// bygger sajten en gång med provsidorna påslagna, och låter mätningarna läsa provfilerna ur det bygget (--utan-bygge).
// Har en mätning ändrat det sajten läser (lathundens storlekar i src/data/lathund-word.json, sidlåsen i
// src/data/sidlas.json) byggs sajten om; har bara lathundens pdf ändrats läggs den i dist med ny version i länkarna.
// Provsidorna tas sedan bort ur dist, så att dist är det Netlify bygger. Ett steg som går rött stoppar resten.
//
//   node scripts/validera.mjs
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bytVersioner } from './filversion.mjs';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(rot, 'dist');
const tider = [];
const borjan = Date.now();
const sek = (ms) => `${Math.floor(ms / 60000)}.${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}`;

function tidtabell() {
  const langst = Math.max(...tider.map(([n]) => n.length));
  console.log(`\nTiden, minuter.sekunder (${sek(Date.now() - borjan)} i allt):`);
  for (const [namn, ms] of tider) console.log(`  ${namn.padEnd(langst)}  ${sek(ms).padStart(5)}`);
}

// Ett steg: kommandot med sin utskrift, och tiden. Går det rött stannar valideringen med stegets kod.
function steg(namn, kommando, env = {}) {
  const t0 = Date.now();
  const r = spawnSync(kommando, { cwd: rot, stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
  tider.push([namn, Date.now() - t0]);
  if (r.status !== 0) {
    tidtabell();
    console.error(`\nValideringen stannade i steget ${namn} (${kommando}).`);
    process.exit(r.status ?? 1);
  }
}

// En mätnings svar på --behov: metoderna den behöver provfiler för, som JSON på sista raden.
function behov(namn, skript) {
  const t0 = Date.now();
  const r = spawnSync('node', [join('scripts', skript), '--behov'], { cwd: rot, encoding: 'utf8', shell: false });
  tider.push([`${namn}, behovet`, Date.now() - t0]);
  if (r.status !== 0) { process.stderr.write(r.stdout + r.stderr); tidtabell(); process.exit(r.status ?? 1); }
  return JSON.parse(r.stdout.trim().split('\n').at(-1));
}

const summa = (fil) => (existsSync(fil) ? createHash('sha256').update(readFileSync(fil)).digest('hex') : '');
// Det sajten läser ur mätningarna: storlekarna och låsen, utan kontrollsummor och datum.
const lastData = () => {
  const las = (fil, falt) => { try { const j = JSON.parse(readFileSync(join(rot, fil), 'utf8')); return JSON.stringify(Object.fromEntries(Object.entries(j).map(([k, v]) => [k, v?.[falt]]))); } catch { return ''; } };
  return las('src/data/lathund-word.json', 'skalor') + las('src/data/sidlas.json', 'las');
};
const pdfMapp = join(rot, 'public', 'stodundervisning');
const lathundPdfer = () => new Map(readdirSync(pdfMapp).filter((f) => f.endsWith('-lathund.pdf')).map((f) => [f, summa(join(pdfMapp, f))]));

steg('instruktionsprov', 'node scripts/instruktionsprov.mjs');
steg('krokprov', 'node scripts/krokprov.mjs');
steg('standardprov', 'node scripts/standardprov.mjs');
steg('taggar', 'node scripts/taggar.mjs --kontrollera');
steg('saddprov', 'node scripts/saddprov.mjs --kontrollera');
steg('datumkoll', 'node scripts/datumkoll.mjs');
steg('ramindexprov', 'node scripts/ramindexprov.mjs');
steg('veckoprov', 'node scripts/veckoprov.mjs');
steg('bilder', 'node scripts/bilder.mjs');
steg('bildbank', 'node scripts/bildbank.mjs');
steg('filmmp4', 'node scripts/filmmp4.mjs --vid-behov');
steg('bladfot', 'node scripts/bladfot.mjs --vid-behov');

const pdf = behov('lathund-pdf', 'lathund-pdf.mjs');
const word = behov('lathund-word', 'lathund-word.mjs');
const sidlas = behov('sidlas', 'sidlas.mjs');

steg('astro check', 'npx astro check');
const prov = {
  ...(pdf.length ? { LATHUND_A4: '1' } : {}),
  ...(word.length ? { LATHUND_WORDPROV: '1', LATHUND_WORDPROV_IDS: word.join(',') } : {}),
  ...(sidlas.length ? { SIDLAS_PROV: '1', SIDLAS_PROV_IDS: sidlas.join(',') } : {}),
};
const provNamn = [pdf.length && `lathundens pdf (${pdf.length})`, word.length && `Word-lathunden (${word.length})`, sidlas.length && `sidlåset (${sidlas.length})`].filter(Boolean);
if (provNamn.length) console.log(`\nBygget har provfilerna för ${provNamn.join(', ')}.`);
steg('astro build', 'npx astro build', prov);

if (provNamn.length) {
  const dataFore = lastData();
  const pdfFore = lathundPdfer();
  if (pdf.length) steg('lathund-pdf', 'node scripts/lathund-pdf.mjs --vid-behov --utan-bygge');
  if (word.length) steg('lathund-word', 'node scripts/lathund-word.mjs --vid-behov --utan-bygge');
  if (sidlas.length) steg('sidlas', 'node scripts/sidlas.mjs --vid-behov --utan-bygge');
  if (lastData() !== dataFore) {
    console.log('\nEn mätning har ändrat det sajten läser: sajten byggs om.');
    steg('astro build igen', 'npx astro build');
  } else {
    // Lathundens nya pdf till dist, och länkarna till den med den nya versionen.
    const andrade = [...lathundPdfer()].filter(([f, s]) => pdfFore.get(f) !== s).map(([f]) => f);
    for (const f of andrade) copyFileSync(join(pdfMapp, f), join(dist, 'stodundervisning', f));
    if (andrade.length) bytVersioner(dist, andrade.map((f) => `/stodundervisning/${f}`));
  }
  for (const del of ['lathund', 'word', 'sidlas']) rmSync(join(dist, 'utskrift', del), { recursive: true, force: true });
}

steg('bankpdf', 'node scripts/bankpdf.mjs');
steg('pdfdelar', 'node scripts/pdfdelar.mjs');
steg('paritet', 'node scripts/paritet.mjs');
steg('utskriftsformat', 'node scripts/utskriftsformat.mjs');
steg('planprov', 'node scripts/planprov.mjs');
steg('lathundprov', 'node scripts/lathundprov.mjs');
steg('wordregler', 'node scripts/wordregler.mjs');
steg('delningskort', 'node scripts/delningskort.mjs');
steg('cacheprov', 'node scripts/cacheprov.mjs');
tidtabell();
