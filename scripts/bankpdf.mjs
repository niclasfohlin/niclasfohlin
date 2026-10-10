#!/usr/bin/env node
// Bankens pdf:er (src/lib/bank.ts; Niclas 2026-10-10: problemen ska gå att ladda ner "docx/pdf", per nivå och för alla
// nivåer, med bara problemen eller med lärarens sida och Två lösningar). Varje pdf är Word-filen från bygget, sparad som
// pdf av Word, så att pdf:en och Word-filen alltid är samma sidor (en källa, ingen drift). Word-filerna byggs vid varje
// bygge av src/pages/stodundervisning/[id].docx.ts; pdf:erna kan inte göras på Netlify, som saknar Word, så de görs här,
// läggs i public/stodundervisning/ och committas med manifestet bank-pdf.json.
//
// En pdf görs om bara när Word-filens innehåll ändras, inte när koden ändras på ett sätt som inte syns i filen: manifestet
// bär en kontrollsumma av Word-filens text, sidhuvuden, sidfötter och svg-bilder, utan bildernas löpnummer och interna id
// (K-212: numren beror på i vilken ordning bygget gör filerna), och av typsnittsfilerna som Word-filen bäddar in. Så
// växer inte repot med nya pdf:er i onödan.
//
// Word gör bilderna till kurvor med fem decimaler, så pdf:en packas efteråt (scripts/pdfpack.py): punkterna rundas till en
// hundradels punkt och raka kurvor blir linjer, utan att något syns (Niclas 2026-10-10: "Ner mot 3mb är bra"; alla nivåer
// med lärarsidorna i Problemlösning i grupp blev 3,1 MB i stället för 6,6).
//
//   node scripts/bankpdf.mjs                gör om de pdf:er som saknas eller är gjorda av en äldre Word-fil, och tar bort
//                                           överblivna (körs i npm run validera, efter bygget)
//   node scripts/bankpdf.mjs --alla         gör om alla
//   node scripts/bankpdf.mjs --kontrollera  stanna om en pdf saknas, är överbliven eller inte är gjord av Word-filen i dist
//                                           (körs i npm run build, efter bygget)
//
// Kräver Word (node_modules/wordparitet/ps/word-pdf.ps1), Python med pikepdf (pip install pikepdf) och Poppler (pdfinfo,
// pdftotext) när en pdf ska göras. Bara en Word-körning åt gången.
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const kontrollera = args.includes('--kontrollera');
const alla = args.includes('--alla');
const dist = join(rot, 'dist', 'stodundervisning');
const pdfMapp = join(rot, 'public', 'stodundervisning');
const manifestFil = join(pdfMapp, 'bank-pdf.json');
const lista = join(dist, 'bankfiler.json');
if (!existsSync(lista)) { console.error('bankpdf: dist/stodundervisning/bankfiler.json saknas. Bygg sajten först (npm run validera bygger).'); process.exit(1); }
const filer = JSON.parse(readFileSync(lista, 'utf8'));
const lasManifest = () => { try { return JSON.parse(readFileSync(manifestFil, 'utf8')); } catch { return {}; } };
const sha = (b) => createHash('sha256').update(b).digest('hex');

// Typsnitten som Word-filerna bäddar in: ändras de (ett nytt tecken i elevens typsnitt) ändras pdf:en.
const TYPSNITT = ['public/fonts/ljudlek-elev/LjudlekElev-Regular.ttf', 'public/fonts/boksida/Cinzel-dokument.ttf', 'public/fonts/boksida/CinzelDecorative-dokument.ttf'];
const typsnittHash = sha(TYPSNITT.map((f) => (existsSync(join(rot, f)) ? sha(readFileSync(join(rot, f))) : `saknas:${f}`)).join('|'));
// Word-filens innehåll: text, tabeller och former i document.xml, sidhuvuden och sidfötter, utan id och löpnummer, och
// bilderna som innehåll, sorterade, så att samma fil ger samma summa oavsett i vilken ordning bygget gjorde filerna.
async function innehallHash(docx) {
  const zip = await JSZip.loadAsync(readFileSync(docx));
  const delar = [];
  const utanId = (xml) => xml
    .replace(/\s(?:id|name)="[^"]*"/g, '')
    .replace(/\sr:(?:embed|id|link)="[^"]*"/g, '')
    .replace(/\sw:(?:id|rsid\w*)="[^"]*"/g, '');
  for (const namn of Object.keys(zip.files).sort()) {
    if (/^word\/(document|header\d*|footer\d*)\.xml$/.test(namn)) delarPush(namn, utanId(await zip.file(namn).async('string')));
  }
  function delarPush(namn, xml) { delar.push(`${namn.replace(/\d+/g, '#')}:${sha(xml)}`); }
  // Sidhuvudenas och sidfötternas nummer i filnamnen kan skifta; summorna sorteras.
  delar.sort();
  const bilder = [];
  // Bara bildernas svg: Word ritar dem, och reservbilderna (png) görs ur dem vid bygget, med verktyg som kan skilja i
  // bildpunkter mellan datorn och Netlify.
  for (const namn of Object.keys(zip.files)) if (/^word\/media\/.+\.svg$/i.test(namn)) bilder.push(sha(await zip.file(namn).async('uint8array')));
  return sha([typsnittHash, ...delar, ...bilder.sort()].join('\n'));
}
const pdfFor = (namn) => join(pdfMapp, `${namn}.pdf`);
const kanda = new Set(filer.map((f) => `${f.namn}.pdf`));
// En pdf i manifestet som ingen bank längre har (en borttagen nivå, en metod utan bank). Bara manifestets filer räknas,
// så att andra pdf:er i mappen (lathundarna) aldrig rörs.
const overblivna = () => Object.keys(lasManifest()).map((n) => `${n}.pdf`).filter((f) => !kanda.has(f));

if (kontrollera) {
  const manifest = lasManifest();
  const fel = [];
  for (const f of filer) {
    const docx = join(dist, `${f.namn}.docx`);
    const post = manifest[f.namn];
    if (!existsSync(pdfFor(f.namn))) fel.push(`${f.namn}.pdf saknas`);
    else if (!post) fel.push(`${f.namn}: saknas i manifestet`);
    else if (!existsSync(docx)) fel.push(`${f.namn}.docx saknas i dist`);
    else if (post.word !== await innehallHash(docx)) fel.push(`${f.namn}.pdf är gjord av en äldre Word-fil`);
    else if (post.pdf !== sha(readFileSync(pdfFor(f.namn)))) fel.push(`${f.namn}.pdf stämmer inte med manifestet`);
  }
  for (const f of overblivna()) fel.push(`${f}: överbliven, ingen bank har filen (ta bort filen och raden i manifestet)`);
  if (fel.length) { console.error(`Bankens pdf:er:\n  ${fel.join('\n  ')}\nKör: npm run validera (eller node scripts/bankpdf.mjs efter ett bygge)`); process.exit(1); }
  console.log(`Bankens pdf:er finns och är aktuella (${filer.length} filer).`);
  process.exit(0);
}

for (const verktyg of ['pdfinfo', 'pdftotext']) {
  try { execFileSync(verktyg, ['-v'], { stdio: 'ignore' }); } catch (e) { if (e.code === 'ENOENT') { console.error(`${verktyg} (Poppler) krävs för att kontrollera pdf:erna.`); process.exit(1); } }
}
mkdirSync(pdfMapp, { recursive: true });
const manifest = lasManifest();
for (const f of overblivna()) {
  if (existsSync(join(pdfMapp, f))) unlinkSync(join(pdfMapp, f));
  delete manifest[f.replace(/\.pdf$/, '')];
  console.log(`  bort ${f}: ingen bank har filen`);
}
const summor = new Map();
const att = [];
for (const f of filer) {
  const docx = join(dist, `${f.namn}.docx`);
  if (!existsSync(docx)) { console.error(`bankpdf: ${f.namn}.docx saknas i dist.`); process.exit(1); }
  const summa = await innehallHash(docx);
  summor.set(f.namn, summa);
  const post = manifest[f.namn];
  if (alla || !post || post.word !== summa || !existsSync(pdfFor(f.namn)) || post.pdf !== sha(readFileSync(pdfFor(f.namn)))) att.push(f);
}
if (!att.length) { writeFileSync(manifestFil, JSON.stringify(manifest, null, 2) + '\n'); console.log(`Bankens pdf:er är aktuella (${filer.length} filer).`); process.exit(0); }
console.log(`Gör pdf ur Word för ${att.map((f) => f.namn).join(', ')} …`);
const tmp = join(tmpdir(), `bankpdf-${process.pid}`);
mkdirSync(tmp, { recursive: true });
let fel = 0;
for (const f of att) {
  const kopia = join(tmp, `${f.namn}.docx`);
  const tmpPdf = join(tmp, `${f.namn}.pdf`);
  try {
    copyFileSync(join(dist, `${f.namn}.docx`), kopia);
    const wordPdf = join(tmp, `${f.namn}-word.pdf`);
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(rot, 'node_modules', 'wordparitet', 'ps', 'word-pdf.ps1'), kopia, wordPdf], { stdio: 'ignore', timeout: 600000 });
    if (!existsSync(wordPdf)) throw new Error('Word gjorde ingen pdf');
    execFileSync('python', [join(rot, 'scripts', 'pdfpack.py'), wordPdf, tmpPdf], { stdio: 'inherit', timeout: 600000 });
    if (!existsSync(tmpPdf)) throw new Error('pdfpack.py gjorde ingen pdf');
    const info = execFileSync('pdfinfo', [tmpPdf], { encoding: 'utf8' });
    const sidor = Number((info.match(/Pages:\s+(\d+)/) || [])[1]);
    // Ett blad per sida: en sida som spiller över ger fler sidor än bladen, och då är något fel i formen.
    if (sidor < f.minst || sidor > f.hogst) throw new Error(`pdf:en är ${sidor} sidor, ska vara ${f.minst === f.hogst ? f.minst : `${f.minst} till ${f.hogst}`} (ett blad per sida)`);
    const text = execFileSync('pdftotext', [tmpPdf, '-'], { encoding: 'latin1' }).split('\f').slice(0, sidor);
    const utan = text.map((t, i) => (t.includes('Niclas Fohlin') ? 0 : i + 1)).filter(Boolean);
    if (utan.length) throw new Error(`sidan ${utan.join(', ')} saknar upphovet`);
    const ut = pdfFor(f.namn);
    copyFileSync(tmpPdf, `${ut}.tmp`);
    renameSync(`${ut}.tmp`, ut);
    if (existsSync(dist)) copyFileSync(ut, join(dist, `${f.namn}.pdf`));
    manifest[f.namn] = { word: summor.get(f.namn), pdf: sha(readFileSync(ut)), sidor, kB: Math.round(readFileSync(ut).length / 1024), datum: new Date().toISOString().slice(0, 10) };
    console.log(`  ok   ${f.namn}.pdf: ${sidor} sidor, ${manifest[f.namn].kB} kB (${Math.round(readFileSync(wordPdf).length / 1024)} kB ur Word)`);
  } catch (e) {
    fel++;
    console.log(`  FEL  ${f.namn}: ${e.message}`);
  }
}
writeFileSync(manifestFil, JSON.stringify(manifest, null, 2) + '\n');
// En ny pdf fanns inte när bygget satte filernas version i länkarna (scripts/filversion.mjs): länkarna till den får sin
// version nu, i dist. Nästa bygge sätter den av sig själv.
if (existsSync(dist)) { const { sattVersioner } = await import('./filversion.mjs'); sattVersioner(join(rot, 'dist')); }
console.log(fel ? `\n${fel} fel.` : '\nAllt ok. Committa pdf-filerna och bank-pdf.json tillsammans med ändringen.');
process.exit(fel ? 1 : 0);
