#!/usr/bin/env node
// Ändrar en ändring i Word-byggaret hur Word-filerna ser ut i Word? (Niclas 2026-09-30: "Du borde kunna använda
// Word-motorn på datorn för att mäta med", och "Gör bra och gör säkert".)
//
//   node scripts/wordjmf.mjs --facit [<id> …]   Word gör pdf av varje Word-fil i dist till underlag/prov/wordjmf/facit/
//   node scripts/wordjmf.mjs [<id> …]           samma för dist nu, och jämförelse sida för sida mot facit
//
// Jämförelsen gör två saker per sida. Texten (pdftotext): samma antal sidor och samma text på varje sida betyder att
// varje sidbrytning står kvar. Bilden (pdftoppm i 40 dpi): andelen punkter som skiljer sig, så att det som flyttar
// inom en sida också syns; en sida där mer än 0,05 procent skiljer sig räknas som ändrad, och de tre mest ändrade
// sidorna i varje fil ritas som facit, nu och skillnaden i underlag/prov/wordjmf/bilder/, som läses innan ändringen
// godtas. Kräver Word (scripts/word-pdf.ps1), pdftotext och pdftoppm.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sharp = createRequire(import.meta.url)('sharp');
const DIST = join(rot, 'dist/stodundervisning');
const PROV = join(rot, 'underlag/prov/wordjmf');
const facit = process.argv.includes('--facit');
const ut = join(PROV, facit ? 'facit' : 'nu');
mkdirSync(ut, { recursive: true });
const valda = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const filer = readdirSync(DIST).filter((f) => f.endsWith('.docx') && f !== 'alla-metoder.docx' && (!valda.length || valda.some((v) => f.startsWith(v))));
// Tecken som en ändring bytt med avsikt räknas som samma tecken, så att bytet inte döljer en flyttad rad längre fram
// (K-138: bockrutan ☐ blev □).
const KANDA_BYTEN = [['☐', '□']];
// Sidans tecken sorterade, utan sidnumret: samma tecken på samma sida betyder att sidbrytningarna står kvar. Ordningen
// räknas inte, eftersom pdftotext kan läsa kortens rutnät i en annan ordning när något flyttar en bråkdel av en punkt.
const sidor = (pdf) => execFileSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\f').slice(0, -1)
  .map((s) => KANDA_BYTEN.reduce((t, [fran, till]) => t.replaceAll(fran, till), s.replace(/Sida \d+ av \d+/g, '')))
  .map((s) => [...s.replace(/\s+/g, '')].sort().join(''));
const GRANS = 0.0005;

function sidbilder(pdf, mapp) {
  rmSync(mapp, { recursive: true, force: true });
  mkdirSync(mapp, { recursive: true });
  execFileSync('pdftoppm', ['-r', '40', '-gray', '-png', pdf, join(mapp, 's')]);
  return readdirSync(mapp).sort().map((f) => join(mapp, f));
}
// Andelen punkter som skiljer sig mellan facit och nu, sida för sida, och bilderna av de mest ändrade sidorna.
async function bildjmf(gammal, ny, namn) {
  const a = sidbilder(gammal, join(PROV, '.a'));
  const b = sidbilder(ny, join(PROV, '.b'));
  const res = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const [ma, mb] = await Promise.all([sharp(a[i]).metadata(), sharp(b[i]).metadata()]);
    const w = Math.min(ma.width, mb.width);
    const h = Math.min(ma.height, mb.height);
    const [pa, pb] = await Promise.all([a[i], b[i]].map((p) => sharp(p).extract({ left: 0, top: 0, width: w, height: h }).greyscale().raw().toBuffer()));
    const diff = Buffer.alloc(w * h, 255);
    let olika = 0;
    for (let j = 0; j < pa.length; j++) if (Math.abs(pa[j] - pb[j]) > 48) { olika++; diff[j] = 0; }
    res.push({ sida: i + 1, andel: olika / (w * h), w, h, diff, a: a[i], b: b[i] });
  }
  const bilder = join(PROV, 'bilder');
  mkdirSync(bilder, { recursive: true });
  for (const f of readdirSync(bilder)) if (f.startsWith(`${namn}-s`)) rmSync(join(bilder, f));
  for (const r of [...res].sort((x, y) => y.andel - x.andel).slice(0, 3).filter((r) => r.andel > GRANS)) {
    await sharp({ create: { width: r.w * 3 + 8, height: r.h, channels: 3, background: '#999999' } }).composite([
      { input: await sharp(r.a).extract({ left: 0, top: 0, width: r.w, height: r.h }).png().toBuffer(), left: 0, top: 0 },
      { input: await sharp(r.b).extract({ left: 0, top: 0, width: r.w, height: r.h }).png().toBuffer(), left: r.w + 4, top: 0 },
      { input: await sharp(r.diff, { raw: { width: r.w, height: r.h, channels: 1 } }).png().toBuffer(), left: 2 * r.w + 8, top: 0 },
    ]).png().toFile(join(bilder, `${namn}-s${r.sida}.png`));
  }
  rmSync(join(PROV, '.a'), { recursive: true, force: true });
  rmSync(join(PROV, '.b'), { recursive: true, force: true });
  return res.filter((r) => r.andel > GRANS);
}

let skiljer = 0;
for (const f of filer) {
  const pdf = join(ut, f.replace(/\.docx$/, '.pdf'));
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(rot, 'scripts/word-pdf.ps1'), join(DIST, f), pdf], { stdio: 'ignore', timeout: 300000 });
  if (facit) { console.log(`facit  ${f}: ${sidor(pdf).length} sidor`); continue; }
  const gammal = join(PROV, 'facit', f.replace(/\.docx$/, '.pdf'));
  if (!existsSync(gammal)) { console.log(`?      ${f}: inget facit`); continue; }
  const [a, b] = [sidor(gammal), sidor(pdf)];
  const olika = a.map((s, i) => (s === b[i] ? 0 : i + 1)).filter(Boolean);
  const ibild = await bildjmf(gammal, pdf, f.replace(/\.docx$/, ''));
  if (a.length !== b.length || olika.length || ibild.length) {
    skiljer++;
    const delar = [];
    if (a.length !== b.length) delar.push(`${a.length} → ${b.length} sidor`);
    if (olika.length) delar.push(`annan text på sidan ${olika.slice(0, 12).join(', ')}${olika.length > 12 ? ' …' : ''}`);
    if (ibild.length) delar.push(`ändrad bild på ${ibild.length} sidor (${ibild.slice(0, 8).map((r) => `s${r.sida} ${(r.andel * 100).toFixed(2)} %`).join(', ')}${ibild.length > 8 ? ' …' : ''})`);
    console.log(`NEJ    ${f}: ${delar.join('; ')}`);
  } else console.log(`ok     ${f}: ${b.length} sidor, samma sidbrytningar och samma bild`);
}
if (!facit && skiljer) { console.error(`\nwordjmf: ${skiljer} Word-filer ser annorlunda ut i Word än facit. Bilderna står i underlag/prov/wordjmf/bilder/.`); process.exit(1); }
