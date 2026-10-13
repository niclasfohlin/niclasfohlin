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
// Samma skript gör pdf av varje metods fil med allt och av filen med bara metoden (slag allt och metoden i listan): det
// är pdf:erna som knapparna Skriv ut: Allt och Metoden öppnar (K-342; Niclas 2026-10-13: "Vill inte ha glidning här. Så
// bättre med ett system för skriv ut knapparna", och "System med att den drar från sidorna eller Yaml kommer aldrig få
// exakt paritet med pdf. Så bättre med ett system som alltid blir 1:1").
//
// Kartan: knapparna på en texts, ett problems och en rams sida öppnar några sidor ur en av de här pdf:erna
// (scripts/pdfdelar.mjs klipper ut dem när sajten byggs). Word-filen bär en lista över sina ramar och blad i ordning
// (egenskapen sidkarta, src/lib/metoddocx.ts) och ett bokmärke där var och en börjar. Word sparar bokmärkena i pdf:en
// (scripts/word-jobb.ps1), och scripts/pdfkarta.py läser vilken sida de står på. Av det skrivs karta i manifestet:
// varje rams och blads första och sista sida i pdf:en. Sidan läses ur pdf:en och inte ur Word, som lägger ut sidorna
// olika när det visar ett dokument och när det sparar det som pdf.
//
// Kräver Word (scripts/word-jobb.ps1), Python med pikepdf (pip install pikepdf) och Poppler (pdfinfo, pdftotext) när en
// pdf ska göras. Alla filer görs i en Word-körning, och bara en Word-körning åt gången.
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { wordinnehall } from './wordinnehall.mjs';

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
// Word-filens innehåll som kontrollsumma (scripts/wordinnehall.mjs, som googleprov.mjs delar): text, tabeller och former,
// sidhuvuden och sidfötter, bildernas svg och fotona, utan id, löpnummer, radslut och reservbilder.
// Faktatexternas Anton (public/fonts/faktatext/) räknas bara för en Word-fil som bär typsnittet, så att de pdf:er som
// gjordes innan typsnittet fanns behåller sina summor och inte görs om (Faktatextsamtal i grupp, 2026-10-13).
const ANTON = 'public/fonts/faktatext/Anton-dokument.ttf';
const antonHash = existsSync(join(rot, ANTON)) ? sha(readFileSync(join(rot, ANTON))) : `saknas:${ANTON}`;
const innehallHash = async (docx) => {
  const data = readFileSync(docx);
  const typsnitt = await (await JSZip.loadAsync(data)).file('word/fontTable.xml')?.async('string') ?? '';
  return wordinnehall(data, /w:name="Anton"/.test(typsnitt) ? `${typsnittHash}|${antonHash}` : typsnittHash);
};
const pdfFor = (namn) => join(pdfMapp, `${namn}.pdf`);
// Word-filens sidkarta (egenskapen sidkarta i docProps/custom.xml): ramarna och bladen i filens ordning, med antalet
// avsnitt var. En fil utan egenskapen har ingen karta (filen med allt, lathunden).
const avkoda = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const sidkartaI = async (docx) => {
  const xml = await (await JSZip.loadAsync(readFileSync(docx))).file('docProps/custom.xml')?.async('string');
  const m = xml?.match(/name="sidkarta"[^>]*>\s*<vt:lpwstr>([\s\S]*?)<\/vt:lpwstr>/);
  return m ? JSON.parse(avkoda(m[1])) : undefined;
};
// Kartan: var varje ram och blad står i pdf:en, ur sidkartan och sidan där pdf:en har varje bokmärke (sida_0 …).
const bokmarkenI = (pdf) => JSON.parse(execFileSync('python', [join(rot, 'scripts', 'pdfkarta.py'), pdf], { encoding: 'utf8', maxBuffer: 1 << 26 }));
const kartaAv = (sidkarta, bokmarken, sidor, namn) => {
  const borjan = sidkarta.map((p, k) => {
    const sida = bokmarken[`sida_${k}`];
    if (!sida) throw new Error(`${namn}: pdf:en har inget bokmärke sida_${k} (${p.bild !== undefined ? `bladet ${p.bild}` : `ramen ${p.ram}`})`);
    return sida;
  });
  return sidkarta.map((p, k) => {
    const fran = borjan[k];
    const till = (borjan[k + 1] ?? sidor + 1) - 1;
    if (!(fran >= 1 && till >= fran)) throw new Error(`${namn}: ${p.bild !== undefined ? `bladet ${p.bild}` : `ramen ${p.ram}`} börjar på sidan ${fran} och nästa del på sidan ${borjan[k + 1] ?? sidor + 1}; varje del ska börja på en ny sida`);
    return { ...(p.ram !== undefined ? { ram: p.ram } : {}), ...(p.bild !== undefined ? { bild: p.bild } : {}), fran, till };
  });
};
// Kartans led, ramens nummer och bladets bild i ordning, ska vara Word-filens sidkarta. Numren är ramens plats i
// metodens fil och bildens nummer, och de kan flyttas utan att Word-filens innehåll ändras: en ram som läggs till före
// banken, eller lärarsidor som byter plats i filen. Då är pdf:en densamma men kartan pekar fel, och knapparnas pdf:er
// skulle klippas ur fel sidor med grönt bygge (granskningen 2026-10-13, P1). Sidorna är desamma när Word-filens summa
// är densamma, så leden skrivs om efter plats, utan Word.
const led = (poster) => JSON.stringify(poster.map((p) => [p.ram ?? null, p.bild ?? null]));
const kartansLed = (karta, sidkarta) => (karta.length !== sidkarta.length ? undefined : karta.map((k, i) => ({ ...(sidkarta[i].ram !== undefined ? { ram: sidkarta[i].ram } : {}), ...(sidkarta[i].bild !== undefined ? { bild: sidkarta[i].bild } : {}), fran: k.fran, till: k.till })));
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
    else {
      const sidkarta = await sidkartaI(docx);
      if (sidkarta && !post.karta) fel.push(`${f.namn}: manifestet saknar kartan över ramarnas sidor`);
      else if (sidkarta && led(post.karta) !== led(sidkarta)) fel.push(`${f.namn}: kartan i manifestet har andra ramar och blad än Word-filen, så knapparnas pdf:er skulle klippas ur fel sidor`);
    }
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
// En aktuell pdf utan karta i manifestet, fast Word-filen har en sidkarta: Word sparar filen igen, för bokmärkenas skull.
// En karta med andra led än Word-filens sidkarta, men lika många, får leden omskrivna efter plats (se kartansLed).
const utanKarta = [];
let omskrivna = 0;
for (const f of filer) {
  if (att.includes(f)) continue;
  const sidkarta = await sidkartaI(join(dist, `${f.namn}.docx`));
  if (!sidkarta) continue;
  const karta = manifest[f.namn]?.karta;
  if (karta && led(karta) === led(sidkarta)) continue;
  const ny = karta && kartansLed(karta, sidkarta);
  if (ny) { manifest[f.namn].karta = ny; omskrivna += 1; } else utanKarta.push(f);
}
if (omskrivna) console.log(`Kartans ramar och blad är omskrivna efter Word-filernas sidkarta i ${omskrivna} filer (sidorna är desamma).`);
if (!att.length && !utanKarta.length) { writeFileSync(manifestFil, JSON.stringify(manifest, null, 2) + '\n'); console.log(`Pdf:erna ur Word är aktuella (${filer.length} filer).`); process.exit(0); }
if (att.length) console.log(`Gör pdf ur Word för ${att.map((f) => f.namn).join(', ')} …`);
if (utanKarta.length) console.log(`Läser var ramarna står i ${utanKarta.length} filer som redan har sin pdf …`);
const tmp = join(tmpdir(), `bankpdf-${process.pid}`);
mkdirSync(tmp, { recursive: true });
let fel = 0;
// Alla filer i en Word-körning (scripts/word-jobb.ps1). En fil som bara saknar kartan sparas också som pdf, för
// bokmärkenas skull, men den pdf:en läggs inte ut: den som finns är gjord av samma Word-fil.
const jobb = [...att.map((f) => ({ f, ny: true })), ...utanKarta.map((f) => ({ f, ny: false }))].map(({ f, ny }) => {
  const kopia = join(tmp, `${f.namn}.docx`);
  copyFileSync(join(dist, `${f.namn}.docx`), kopia);
  return { f, ny, docx: kopia, pdf: join(tmp, `${f.namn}-word.pdf`) };
});
const jobbFil = join(tmp, 'jobb.json');
const svarFil = join(tmp, 'svar.json');
writeFileSync(jobbFil, JSON.stringify(jobb.map((j) => ({ docx: j.docx, pdf: j.pdf }))));
try { execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(rot, 'scripts', 'word-jobb.ps1'), jobbFil, svarFil], { stdio: 'ignore', timeout: 3600000 }); } catch (e) { console.error(`bankpdf: Word-körningen gick inte igenom (${e.message.split('\n')[0]}).`); }
const svar = existsSync(svarFil) ? JSON.parse(readFileSync(svarFil, 'utf8').replace(/^\uFEFF/, '')) : [];
const svarFor = (j) => svar.find((x) => x.docx === j.docx);
for (const j of jobb) {
  const f = j.f;
  const tmpPdf = join(tmp, `${f.namn}.pdf`);
  try {
    const r = svarFor(j);
    if (!r) throw new Error('Word svarade inte för filen');
    if (r.fel) throw new Error(`Word: ${r.fel}`);
    const sidkarta = await sidkartaI(j.docx);
    const wordPdf = j.pdf;
    if (!existsSync(wordPdf)) throw new Error('Word gjorde ingen pdf');
    const last = sidkarta ? bokmarkenI(wordPdf) : undefined;
    if (!j.ny) {
      // Bara kartan: pdf:en som finns är gjord av samma Word-fil, så den nya har samma sidor.
      if (last.sidor !== manifest[f.namn].sidor) throw new Error(`den nya pdf:en är ${last.sidor} sidor men den som finns ${manifest[f.namn].sidor}`);
      manifest[f.namn].karta = kartaAv(sidkarta, last.bokmarken, last.sidor, f.namn);
      console.log(`  ok   ${f.namn}: kartan över ${manifest[f.namn].karta.length} ramar och blad`);
      continue;
    }
    execFileSync('python', [join(rot, 'scripts', 'pdfpack.py'), wordPdf, tmpPdf], { stdio: 'inherit', timeout: 600000 });
    if (!existsSync(tmpPdf)) throw new Error('pdfpack.py gjorde ingen pdf');
    const info = execFileSync('pdfinfo', [tmpPdf], { encoding: 'utf8' });
    const sidor = Number((info.match(/Pages:\s+(\d+)/) || [])[1]);
    // Ett blad per sida: en sida som spiller över ger fler sidor än bladen, och då är något fel i formen.
    if (sidor < f.minst || sidor > f.hogst) throw new Error(`pdf:en är ${sidor} sidor, ska vara ${f.minst === f.hogst ? f.minst : `${f.minst} till ${f.hogst}`} (ett blad per sida)`);
    const text = execFileSync('pdftotext', [tmpPdf, '-'], { encoding: 'latin1', maxBuffer: 1 << 28 }).split('\f').slice(0, sidor);
    const utan = text.map((t, i) => (t.includes('Niclas Fohlin') ? 0 : i + 1)).filter(Boolean);
    if (utan.length) throw new Error(`sidan ${utan.join(', ')} saknar upphovet`);
    const karta = sidkarta ? kartaAv(sidkarta, last.bokmarken, sidor, f.namn) : undefined;
    const ut = pdfFor(f.namn);
    copyFileSync(tmpPdf, `${ut}.tmp`);
    renameSync(`${ut}.tmp`, ut);
    if (existsSync(dist)) copyFileSync(ut, join(dist, `${f.namn}.pdf`));
    manifest[f.namn] = { word: summor.get(f.namn), pdf: sha(readFileSync(ut)), sidor, kB: Math.round(readFileSync(ut).length / 1024), datum: new Date().toISOString().slice(0, 10), ...(karta ? { karta } : {}) };
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
