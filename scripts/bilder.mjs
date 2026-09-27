#!/usr/bin/env node
// Bilderna i rätt storlek för sitt syfte (Niclas 2026-09-27). Varje bild under public/images hämtas av läsarna
// och av Facebook med flera när en sida delas, och varje megabyte drar krediter. Omslagen och porträttet visas
// som mest 240 punkter breda, så 480 pixlar räcker även på skarpa skärmar; en delningsbild (namnet slutar på
// -delning) är 1200 × 630.
//
// npm run validera kör skriptet, så ingen behöver komma ihåg det. Varje ny eller ändrad bild görs om en gång:
// till högst 480 pixlar bred (1200 för delningsbilder), JPEG med kvalitet 78 (WebP likaså), och ett PNG-foto
// utan genomskinlighet blir JPEG och får den nya sökvägen i posterna under src/. Blir bilden inte minst en
// tiondel mindre och behöver den inte krympas behålls originalet. src/data/bilder.json minns vilka bilder som
// är gjorda, med en kontrollsumma, så att ingen bild komprimeras om vid nästa körning.
//
//   node scripts/bilder.mjs                 gör om de bilder som är nya eller ändrade (körs i npm run validera)
//   node scripts/bilder.mjs --kontrollera   visar dem utan att ändra något; slutkod 1 om det finns någon

import { existsSync, readdirSync, readFileSync, writeFileSync, statSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const kontrollera = process.argv.includes('--kontrollera');
const BREDD = 480;
const DELNING = 1200;
const KVALITET = 78;
const FORTECKNING = join(rot, 'src', 'data', 'bilder.json');

// sharp följer med Astro, som använder den för sina bilder.
let sharp;
try { sharp = (await import('sharp')).default; sharp.cache(false); } catch { console.error('sharp saknas (följer med Astro): kör npm install.'); process.exit(1); }

const alla = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? alla(join(d, e.name)) : [join(d, e.name)]));
const kb = (b) => (b / 1000).toFixed(1).replace('.', ',');
const webb = (f) => '/' + relative(join(rot, 'public'), f).replace(/\\/g, '/');
const summa = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);
const gjorda = existsSync(FORTECKNING) ? JSON.parse(readFileSync(FORTECKNING, 'utf8')) : {};
const filer = alla(join(rot, 'public', 'images')).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
const nya = filer.filter((f) => gjorda[webb(f)] !== summa(f));

if (kontrollera) {
  for (const f of nya) console.log(`  inte gjord: ${webb(f)} (${kb(statSync(f).size)} kB)`);
  console.log(nya.length ? `${nya.length} bilder är inte gjorda i rätt storlek. Kör: node scripts/bilder.mjs` : `Bilderna har rätt storlek (${filer.length} st).`);
  process.exit(nya.length ? 1 : 0);
}

// Posterna och koden som kan peka på en bild, för när ett PNG-foto byter namn till .jpg.
const kallfiler = alla(join(rot, 'src')).filter((f) => /\.(md|mdx|ya?ml|json|ts|astro|mjs)$/.test(f));

for (const fil of nya) {
  // Bilden läses in i minnet först: på Windows håller sharp annars filen öppen, och den går inte att skriva över.
  const indata = readFileSync(fil);
  const m = await sharp(indata).metadata();
  const byte = statSync(fil).size;
  const max = /-delning\.[a-z]+$/i.test(fil) ? DELNING : BREDD;
  const krymps = m.width > max;
  const pngFoto = m.format === 'png' && !m.hasAlpha;
  let bild = sharp(indata).rotate().resize({ width: Math.min(m.width, max), withoutEnlargement: true });
  let ut = fil;
  if (m.format === 'webp') bild = bild.webp({ quality: KVALITET });
  else if (m.format === 'png' && m.hasAlpha) bild = bild.png({ compressionLevel: 9, palette: true });
  else { bild = bild.flatten({ background: '#ffffff' }).jpeg({ quality: KVALITET, mozjpeg: true }); ut = fil.replace(/\.(png|jpeg)$/i, '.jpg'); }
  const data = await bild.toBuffer();
  if (!krymps && !pngFoto && data.length > byte * 0.9) {
    gjorda[webb(fil)] = summa(fil);
    console.log(`  redan rätt ${webb(fil)} (${kb(byte)} kB)`);
    continue;
  }
  const nyM = await sharp(data).metadata();
  writeFileSync(ut, data);
  if (ut !== fil) {
    unlinkSync(fil);
    delete gjorda[webb(fil)];
    for (const k of kallfiler) {
      const text = readFileSync(k, 'utf8');
      if (!text.includes(webb(fil))) continue;
      writeFileSync(k, text.split(webb(fil)).join(webb(ut)));
      console.log(`  sökväg i ${relative(rot, k).replace(/\\/g, '/')}: ${webb(fil)} blir ${webb(ut)}`);
    }
  }
  gjorda[webb(ut)] = summa(ut);
  console.log(`  krympt ${webb(ut)}: ${kb(byte)} kB blir ${kb(data.length)} kB (${m.width} × ${m.height} blir ${nyM.width} × ${nyM.height})`);
}

// Förteckningen följer filerna: bilder som tagits bort försvinner ur den.
const finns = new Set(alla(join(rot, 'public', 'images')).map(webb));
const ny = Object.fromEntries(Object.entries(gjorda).filter(([k]) => finns.has(k)).sort(([a], [b]) => a.localeCompare(b)));
if (JSON.stringify(ny) !== JSON.stringify(existsSync(FORTECKNING) ? JSON.parse(readFileSync(FORTECKNING, 'utf8')) : null)) writeFileSync(FORTECKNING, JSON.stringify(ny, null, 2) + '\n');
console.log(nya.length ? `${nya.length} bilder gjordes i rätt storlek. Committa dem och src/data/bilder.json med ändringen.` : `Bilderna har rätt storlek (${filer.length} st).`);
