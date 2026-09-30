#!/usr/bin/env node
// Mätbänken: hur ritar Word och Google Dokument en form? (K-138, Niclas 2026-09-30: "Kommer du VETA hur du snabbt gör i
// framtiden. Eller är det 4h såhär nästa metod?")
//
// En ny form i Word-filerna (en ny sorts kort, tabell eller rad) prövas här innan den byggs in i src/lib/metoddocx.ts.
// Ett prov i scripts/matbank/ bygger varianter av formen med docx, Word och Google Dokument ritar samma fil, och bänken
// mäter varje variants radsteg (avståndet mellan etiketterna Ar0, Ar1 …) i båda. Det som skiljer blir en regel i
// metoddocx.ts och scripts/wordregler.mjs och en rad i METODER.md under Word och Google Dokument. Proven i
// scripts/matbank/ är mätningarna bakom reglerna och förebilder: kopiera det som liknar formen och byt varianterna. Kör
// dem också när docx eller Google byter version; en regel som inte längre håller syns som en ny skillnad.
//
//   node scripts/matbank.mjs scripts/matbank/tabellrader.mjs
//
// Ett prov exporterar `namn`, `varianter` ({ A: { text, barn: (e) => Barn[] }, … }, där e(i) ger etiketten för rad i,
// "Ar0", som ska stå först i sin rad eller sitt stycke) och om det behövs `typsnitt` (docx fonts, för Andika). Varje
// variant följs av ett stycke "mellan". Pdf:erna, en bild av första sidan i Word och Google bredvid varandra och
// tabellen hamnar i underlag/prov/matbank/<namn>/. Kräver Word (scripts/word-pdf.ps1), Google-inloggningen (DRIFT.md
// under Google Drive-knappen) och Popplers pdftotext, som ligger bredvid pdftoppm.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as docx from 'docx';
import { googlePdf } from './google.mjs';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
// Proven importerar docx som modul; bänken gör likadant, så att filen byggs av en och samma kopia av biblioteket (med
// require blandades två kopior, och Word kunde inte öppna filen).
const sharp = createRequire(import.meta.url)('sharp');
const provFil = process.argv[2];
if (!provFil) {
  console.error('Ange ett prov: node scripts/matbank.mjs scripts/matbank/tabellrader.mjs');
  process.exit(1);
}
const prov = await import(pathToFileURL(resolve(provFil)).href);
const { namn, varianter, typsnitt } = prov;
if (!namn || !varianter) {
  console.error(`${provFil} ska exportera namn och varianter.`);
  process.exit(1);
}
const ut = join(rot, 'underlag/prov/matbank', namn);
mkdirSync(ut, { recursive: true });

// Popplers pdftotext ger ordens lägen (-bbox); den i Git för Windows (xpdf) gör det inte.
function popplerPdftotext() {
  try {
    const pdftoppm = execFileSync('where', ['pdftoppm'], { encoding: 'utf8' }).split(/\r?\n/)[0].trim();
    const fil = join(dirname(pdftoppm), 'pdftotext.exe');
    if (existsSync(fil)) return fil;
  } catch { /* ingen pdftoppm i PATH */ }
  throw new Error('Popplers pdftotext saknas (den ska ligga bredvid pdftoppm).');
}
const PDFTOTEXT = popplerPdftotext();

// Samma standard som Word-filerna på sajten (dokument() i metoddocx.ts): Calibri 11 pt, svenska, A4 med 1 cm marginal.
const barn = [];
for (const [v, variant] of Object.entries(varianter)) {
  barn.push(...variant.barn((i) => `${v}r${i}`));
  barn.push(new docx.Paragraph({ spacing: { before: 0, after: 0 }, children: [new docx.TextRun('mellan')] }));
}
const dokument = new docx.Document({
  ...(typsnitt ? { fonts: typsnitt } : {}),
  styles: { default: { document: { run: { font: 'Calibri', size: 22, language: { value: 'sv-SE' } } } } },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 567, bottom: 567, left: 567, right: 567 } } }, children: barn }],
});
const fil = join(ut, `${namn}.docx`);
writeFileSync(fil, await docx.Packer.toBuffer(dokument));
const pdf = { word: join(ut, `${namn}-word.pdf`), google: join(ut, `${namn}-google.pdf`) };
execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(rot, 'scripts/word-pdf.ps1'), fil, pdf.word], { stdio: 'ignore', timeout: 300000 });
writeFileSync(pdf.google, (await googlePdf(readFileSync(fil), { namn: `matbank ${namn}` })).pdf);

// Etiketternas lägen, sida för sida: yMin är överkanten av ordets ruta, så radsteget är skillnaden mellan två etiketter
// på samma sida. Word och Google ger typsnittet olika övre kant i pdf:en; därför jämförs bara steg, inte lägen.
function etiketter(pdfFil) {
  const xml = execFileSync(PDFTOTEXT, ['-bbox', '-enc', 'UTF-8', pdfFil, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const sidor = xml.split('<page ').slice(1);
  const lagen = {};
  sidor.forEach((s, nr) => {
    for (const m of s.matchAll(/<word xMin="[\d.]+" yMin="([\d.]+)" xMax="[\d.]+" yMax="[\d.]+">([A-Z])r(\d+)<\/word>/g)) {
      (lagen[m[2]] ??= []).push({ sida: nr + 1, y: Number(m[1]), i: Number(m[3]) });
    }
  });
  return { lagen, sidor: sidor.length };
}
const matt = { word: etiketter(pdf.word), google: etiketter(pdf.google) };
const steg = (l = []) => {
  const s = l.slice(1).map((b, k) => (b.sida === l[k].sida && b.i === l[k].i + 1 ? b.y - l[k].y : null)).filter((x) => x !== null);
  return s.length ? { medel: s.reduce((a, b) => a + b, 0) / s.length, min: Math.min(...s), max: Math.max(...s), n: s.length } : null;
};
const tal = (x) => (x ? `${x.medel.toFixed(2).padStart(6)} (${x.min.toFixed(2)}–${x.max.toFixed(2)})` : '     –           ');
const rader = [`Mätbänken: ${namn}, radsteg i punkter (medel, minst–störst). Word ${matt.word.sidor} sidor, Google ${matt.google.sidor}.`, ''];
for (const [v, variant] of Object.entries(varianter)) {
  const [w, g] = [steg(matt.word.lagen[v]), steg(matt.google.lagen[v])];
  const skillnad = w && g ? `${(g.medel - w.medel >= 0 ? '+' : '')}${(g.medel - w.medel).toFixed(2)}` : '';
  rader.push(`${v}  Word ${tal(w)}  Google ${tal(g)}  ${skillnad.padStart(6)}  ${variant.text ?? ''}`);
}
writeFileSync(join(ut, 'resultat.txt'), rader.join('\n') + '\n');
console.log(rader.join('\n'));

// Första sidan i Word och Google bredvid varandra, för att se formen och inte bara talen.
const bilder = {};
for (const vem of ['word', 'google']) {
  const bas = join(ut, `${namn}-${vem}-s1`);
  execFileSync('pdftoppm', ['-r', '60', '-f', '1', '-l', '1', '-png', '-singlefile', pdf[vem], bas]);
  bilder[vem] = `${bas}.png`;
}
const [mw, mg] = await Promise.all([sharp(bilder.word).metadata(), sharp(bilder.google).metadata()]);
await sharp({ create: { width: mw.width + mg.width + 12, height: Math.max(mw.height, mg.height), channels: 3, background: '#999999' } })
  .composite([{ input: bilder.word, left: 0, top: 0 }, { input: bilder.google, left: mw.width + 12, top: 0 }])
  .png().toFile(join(ut, `${namn}-word-google.png`));
console.log(`\nWord till vänster, Google till höger: ${join(ut, `${namn}-word-google.png`)}`);
