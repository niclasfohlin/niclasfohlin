#!/usr/bin/env node
// Lathundens pdf är lathundens PowerPoint i A4 liggande, gjord till pdf av PowerPoint: fyra sidor kant till kant som
// fyller ett A4-ark, med Calibri och sökbar text (Niclas 2026-09-27: pdf:en ska vara maximerad som bilderna, och
// "Pptx kan vara 16:9. De andra filerna är A4"). A4-varianten byggs ur samma layout som 16:9-filen
// (src/lib/metodpptx.ts, format A4) av src/pages/utskrift/lathund/[id].pptx.ts, bara när LATHUND_A4=1. Skriptet
// bygger sajten så, tar dist/utskrift/lathund/<id>.pptx, låter PowerPoint spara den som pdf, kontrollerar sidantal,
// A4 liggande och upphov, lägger filen i public/stodundervisning/ (följer med i bygget) och i dist/ och tar bort
// A4-filerna ur dist. Pdf-filerna committas: Netlify har ingen PowerPoint. Ett manifest (lathund-pdf.json) med en
// kontrollsumma av allt som påverkar pdf:en gör att kontrollen ser om en pdf är inaktuell, utan PowerPoint.
//
// Allt ur en källa utan drift (Niclas 2026-09-27): ingen behöver komma ihåg att göra om pdf:en. npm run validera
// kör --vid-behov, som gör om just de pdf:er som är inaktuella och tar bort överblivna; bygget på Netlify kör
// --kontrollera och stannar om en inaktuell pdf ändå har pushats.
//
//   node scripts/lathund-pdf.mjs                 alla metoder med lathund
//   node scripts/lathund-pdf.mjs <id> [<id>…]    bara de angivna
//   node scripts/lathund-pdf.mjs --vid-behov     bara de som saknas eller är inaktuella (körs i npm run validera)
//   node scripts/lathund-pdf.mjs --kontrollera   stanna om en pdf saknas, är inaktuell eller är
//                                                överbliven (körs i npm run build)
//   node scripts/lathund-pdf.mjs --utan-bygge    hoppa över astro build (dist har redan A4-filerna ur ett
//                                                bygge med LATHUND_A4=1)
//
// Kräver PowerPoint (scripts/pptx-till-pdf.ps1) och Poppler (pdfinfo, pdftotext) när en pdf ska göras.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, renameSync, unlinkSync, rmSync } from 'node:fs';
import { execFileSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const kontrollera = args.includes('--kontrollera');
const vidBehov = args.includes('--vid-behov');
const utanBygge = args.includes('--utan-bygge');
const valda = args.filter((a) => !a.startsWith('--'));

const katalog = join(rot, 'src', 'content', 'stodundervisning');
const metoder = readdirSync(katalog)
  .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .map((f) => ({ id: f.replace(/\.yaml$/, ''), fil: join(katalog, f), data: parseYaml(readFileSync(join(katalog, f), 'utf8')) }))
  .filter((m) => m.data.lathund && !m.data.utkast);
const pdfMapp = join(rot, 'public', 'stodundervisning');
const manifestFil = join(pdfMapp, 'lathund-pdf.json');
const pdfFor = (id) => join(pdfMapp, `${id}-lathund.pdf`);

// Allt som påverkar pdf:en: metodens text, koden som bygger A4-varianten av PowerPoint-filen (med sajtens adress i
// site.ts), PowerPoint-skriptet som gör pdf:en och pptxgenjs version.
const gemensamma = ['src/lib/metodpptx.ts', 'src/lib/metod.ts', 'src/pages/utskrift/lathund/[id].pptx.ts', 'src/data/site.ts', 'scripts/pptx-till-pdf.ps1'];
const pptxgenjs = (() => { try { return JSON.parse(readFileSync(join(rot, 'node_modules', 'pptxgenjs', 'package.json'), 'utf8')).version; } catch { return 'okänd'; } })();
const hashAv = (delar) => { const h = createHash('sha256'); for (const d of delar) h.update(d); return h.digest('hex').slice(0, 16); };
// Textfiler hashas med LF oavsett radslut: arbetskopian på Windows har CRLF, Netlifys utcheckning LF.
const lasKalla = (f) => Buffer.from(readFileSync(f, 'utf8').replace(/\r\n/g, '\n'));
const gemensamHash = hashAv([`pdf ur pptx i A4, pptxgenjs ${pptxgenjs}`, ...gemensamma.map((f) => (existsSync(join(rot, f)) ? lasKalla(join(rot, f)) : Buffer.from(`saknas:${f}`)))]);
const kallHash = (m) => hashAv([gemensamHash, lasKalla(m.fil)]);
const filHash = (p) => hashAv([readFileSync(p)]);
const lasManifest = () => { try { return JSON.parse(readFileSync(manifestFil, 'utf8')); } catch { return {}; } };

if (kontrollera) {
  const manifest = lasManifest();
  const fel = [];
  for (const m of metoder) {
    const post = manifest[m.id];
    const pdf = pdfFor(m.id);
    if (!existsSync(pdf)) fel.push(`${m.id}: pdf saknas`);
    else if (!post) fel.push(`${m.id}: saknas i manifestet`);
    else if (post.kalla !== kallHash(m)) fel.push(`${m.id}: pdf:n är gjord av en äldre metod eller äldre kod`);
    else if (post.pdf !== filHash(pdf)) fel.push(`${m.id}: pdf-filen stämmer inte med manifestet`);
  }
  const publicerade = new Set(metoder.map((m) => m.id));
  for (const f of readdirSync(pdfMapp).filter((f) => f.endsWith('-lathund.pdf'))) {
    const id = f.replace(/-lathund\.pdf$/, '');
    if (!publicerade.has(id)) fel.push(`${f}: överbliven, metoden är borttagen, utkast eller utan lathund (ta bort filen och raden i manifestet)`);
  }
  if (fel.length > 0) {
    console.error(`Lathundens pdf:\n  ${fel.join('\n  ')}\nKör: node scripts/lathund-pdf.mjs`);
    process.exit(1);
  }
  console.log(`Lathundens pdf finns och är aktuell för ${metoder.length} metoder.`);
  process.exit(0);
}

// --vid-behov: tar bort överblivna pdf:er och gör om bara de som saknas eller är gjorda av en äldre metod eller äldre kod.
const inaktuella = () => {
  const manifest = lasManifest();
  return metoder.filter((m) => {
    const post = manifest[m.id];
    const pdf = pdfFor(m.id);
    return !existsSync(pdf) || !post || post.kalla !== kallHash(m) || post.pdf !== filHash(pdf);
  });
};
if (vidBehov) {
  const publicerade = new Set(metoder.map((m) => m.id));
  mkdirSync(pdfMapp, { recursive: true });
  for (const f of readdirSync(pdfMapp).filter((f) => f.endsWith('-lathund.pdf'))) {
    if (!publicerade.has(f.replace(/-lathund\.pdf$/, ''))) { unlinkSync(join(pdfMapp, f)); console.log(`  bort ${f}: metoden har ingen publicerad lathund`); }
  }
}
const lista = vidBehov ? inaktuella() : valda.length > 0 ? metoder.filter((m) => valda.includes(m.id)) : metoder;
if (vidBehov && lista.length === 0) { console.log(`Lathundens pdf är aktuell för ${metoder.length} metoder.`); process.exit(0); }
if (lista.length === 0) { console.error('Ingen metod med lathund att göra pdf av.'); process.exit(1); }
if (vidBehov) console.log(`Gör om lathundens pdf ur PowerPoint för ${lista.map((m) => m.id).join(', ')} …`);
for (const verktyg of ['pdfinfo', 'pdftotext']) {
  // Poppler-verktygen svarar med felkod på -v; det som avslöjar att de saknas är ENOENT.
  try { execFileSync(verktyg, ['-v'], { stdio: 'ignore' }); } catch (e) { if (e.code === 'ENOENT') { console.error(`${verktyg} (Poppler) krävs för att kontrollera pdf:n.`); process.exit(1); } }
}
if (!utanBygge) {
  console.log('Bygger sajten med lathundens A4-sidor (LATHUND_A4=1) ur aktuell kod …');
  execSync('npx astro build', { cwd: rot, stdio: 'ignore', env: { ...process.env, LATHUND_A4: '1' } });
}
const a4Mapp = join(rot, 'dist', 'utskrift');
mkdirSync(pdfMapp, { recursive: true });

const tmp = join(tmpdir(), `lathund-pdf-${process.pid}`);
mkdirSync(tmp, { recursive: true });
const manifest = lasManifest();
let fel = 0;
try {
  for (const m of lista) {
    const pptx = join(a4Mapp, 'lathund', `${m.id}.pptx`);
    const kopia = join(tmp, `${m.id}-lathund.pptx`);
    const tmpPdf = join(tmp, `${m.id}-lathund.pdf`);
    const ut = pdfFor(m.id);
    try {
      if (!existsSync(pptx)) throw new Error('A4-filen saknas i dist/utskrift/lathund (bygg utan --utan-bygge)');
      copyFileSync(pptx, kopia);
      // PowerPoint sparar pdf:en bredvid källan med samma namn.
      execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(rot, 'scripts', 'pptx-till-pdf.ps1'), kopia], { stdio: 'ignore', timeout: 120000 });
      if (!existsSync(tmpPdf)) throw new Error('PowerPoint gjorde ingen pdf');
      const info = execFileSync('pdfinfo', [tmpPdf], { encoding: 'utf8' });
      const sidor = Number((info.match(/Pages:\s+(\d+)/) || [])[1]);
      if (sidor !== 4) throw new Error(`pdf:n är ${sidor} sidor, ska vara fyra`);
      // A4 liggande är 841,9 × 595,3 punkter.
      const [, bredd, hojd] = (info.match(/Page size:\s+([\d.]+) x ([\d.]+)/) || []).map(Number);
      if (Math.abs(bredd - 841.9) > 2 || Math.abs(hojd - 595.3) > 2) throw new Error(`sidan är ${bredd} × ${hojd} punkter, ska vara A4 liggande (841,9 × 595,3)`);
      for (let s = 1; s <= 4; s++) {
        const text = execFileSync('pdftotext', ['-f', String(s), '-l', String(s), tmpPdf, '-'], { encoding: 'latin1' });
        if (!text.includes('Niclas Fohlin') || !text.includes(`niclasfohlin.se/stodundervisning/${m.id}/lathund`)) throw new Error(`sida ${s} saknar upphov eller adress`);
      }
      copyFileSync(tmpPdf, `${ut}.tmp`);
      renameSync(`${ut}.tmp`, ut);
      const iDist = join(rot, 'dist', 'stodundervisning', `${m.id}-lathund.pdf`);
      if (existsSync(dirname(iDist))) copyFileSync(ut, iDist);
      manifest[m.id] = { kalla: kallHash(m), pdf: filHash(ut), datum: new Date().toISOString().slice(0, 10) };
      console.log(`  ok   ${m.id}: public/stodundervisning/${m.id}-lathund.pdf (fyra A4-sidor ur PowerPoint, upphov på alla)`);
    } catch (e) {
      fel++;
      console.log(`  FEL  ${m.id}: ${e.message}`);
    }
  }
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch { /* PowerPoint släpper filerna strax */ }
  // A4-filerna är bara förlagor till pdf:en och ska aldrig publiceras.
  try { rmSync(a4Mapp, { recursive: true, force: true }); } catch { /* finns inte */ }
}
const publicerade = new Set(metoder.map((m) => m.id));
for (const id of Object.keys(manifest)) if (!publicerade.has(id)) delete manifest[id];
writeFileSync(manifestFil, JSON.stringify(manifest, null, 2) + '\n');
console.log(fel ? `\n${fel} fel.` : '\nAllt ok. Committa pdf-filerna och lathund-pdf.json tillsammans med metoden.');
process.exit(fel ? 1 : 0);
