#!/usr/bin/env node
// Bilderna i rätt storlek för sitt syfte (Niclas 2026-09-27). Varje bild under public/images hämtas av läsarna
// och av Facebook med flera när en sida delas, och varje megabyte drar krediter. Omslagen och porträttet visas
// som mest 240 punkter breda, så 480 pixlar räcker även på skarpa skärmar; en delningsbild (namnet slutar på
// -delning) är 1200 × 630.
//
// npm run validera kör skriptet, så ingen behöver komma ihåg det. Varje ny eller ändrad bild görs om en gång:
// till högst 480 pixlar bred (1200 för delningsbilder), JPEG med kvalitet 78 (WebP likaså), och ett PNG-foto
// utan genomskinlighet blir JPEG och får den nya sökvägen i posterna under src/ och i underlag/bocker/register.json;
// en PNG som verkligen är genomskinlig blir en mindre PNG. Bredden begränsas, höjden följer med. Blir bilden inte minst en
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


const alla = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? alla(join(d, e.name)) : [join(d, e.name)]));
const kb = (b) => (b / 1000).toFixed(1).replace('.', ',');
const webb = (f) => '/' + relative(join(rot, 'public'), f).replace(/\\/g, '/');
const summa = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);
const gjorda = existsSync(FORTECKNING) ? JSON.parse(readFileSync(FORTECKNING, 'utf8')) : {};
const filer = alla(join(rot, 'public', 'images')).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
const nya = filer.filter((f) => gjorda[webb(f)] !== summa(f));

// Ikonerna ur favicon.svg: apple-touch-icon.png (180 × 180, hemskärmen på iPhone och iPad) och favicon.ico (32 × 32,
// för webbläsare och robotar som frågar efter den; utan dem gav de över 400 fel om dygnet, 2026-09-27). De görs om
// när favicon.svg ändras, och förteckningen minns svg:ens kontrollsumma.
const svg = join(rot, 'public', 'favicon.svg');
const apple = join(rot, 'public', 'apple-touch-icon.png');
const ico = join(rot, 'public', 'favicon.ico');
const ikonerAktuella = !existsSync(svg) || (gjorda['/favicon.svg'] === summa(svg) && existsSync(apple) && existsSync(ico));

if (kontrollera) {
  for (const f of nya) console.log(`  inte gjord: ${webb(f)} (${kb(statSync(f).size)} kB)`);
  if (!ikonerAktuella) console.log('  ikonerna är inte gjorda ur /favicon.svg');
  const fel = nya.length > 0 || !ikonerAktuella;
  console.log(fel ? 'Bilderna eller ikonerna är inte gjorda i rätt storlek. Kör: node scripts/bilder.mjs' : `Bilderna har rätt storlek (${filer.length} st), och ikonerna är aktuella.`);
  process.exit(fel ? 1 : 0);
}

// sharp följer med Astro, som använder den för sina bilder. Kontrollen ovan klarar sig utan, så att den kan köras i
// Netlify-bygget.
let sharp;
try { sharp = (await import('sharp')).default; sharp.cache(false); } catch { console.error('sharp saknas (följer med Astro): kör npm install.'); process.exit(1); }

// Posterna, koden och bokregistret som kan peka på en bild, för när ett PNG-foto byter namn till .jpg.
const kallfiler = [join(rot, 'src'), join(rot, 'underlag', 'bocker')].filter((d) => existsSync(d)).flatMap(alla).filter((f) => /\.(md|mdx|ya?ml|json|ts|astro|mjs)$/.test(f));

for (const fil of nya) {
  // Bilden läses in i minnet först: på Windows håller sharp annars filen öppen, och den går inte att skriva över.
  const indata = readFileSync(fil);
  const m = await sharp(indata).metadata();
  const byte = statSync(fil).size;
  const max = /-delning\.[a-z]+$/i.test(fil) ? DELNING : BREDD;
  const krymps = m.width > max;
  // En alfakanal som inte används (helt ogenomskinlig bild) räknas som foto.
  const ogenomskinlig = !m.hasAlpha || (await sharp(indata).stats()).isOpaque;
  const pngFoto = m.format === 'png' && ogenomskinlig;
  let bild = sharp(indata).rotate().resize({ width: Math.min(m.width, max), withoutEnlargement: true });
  let ut = fil;
  if (m.format === 'webp') bild = bild.webp({ quality: KVALITET });
  else if (m.format === 'png' && !ogenomskinlig) bild = bild.png({ compressionLevel: 9, palette: true });
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

if (!ikonerAktuella) {
  const kalla = readFileSync(svg);
  // iPhone rundar hörnen själv och fyller det genomskinliga med svart, så ikonen får sin egen bakgrund ut i hörnen.
  const bakgrund = kalla.toString('utf8').match(/fill="(#[0-9a-fA-F]{3,6})"/)?.[1] ?? '#ffffff';
  writeFileSync(apple, await sharp(kalla, { density: 400 }).resize(180, 180).flatten({ background: bakgrund }).png().toBuffer());
  const png = await sharp(kalla, { density: 400 }).resize(32, 32).png().toBuffer();
  // Ett ICO-huvud med en enda bild i PNG-form, som alla webbläsare sedan Windows Vista läser.
  const huvud = Buffer.alloc(22);
  huvud.writeUInt16LE(0, 0); huvud.writeUInt16LE(1, 2); huvud.writeUInt16LE(1, 4);
  huvud.writeUInt8(32, 6); huvud.writeUInt8(32, 7); huvud.writeUInt8(0, 8); huvud.writeUInt8(0, 9);
  huvud.writeUInt16LE(1, 10); huvud.writeUInt16LE(32, 12); huvud.writeUInt32LE(png.length, 14); huvud.writeUInt32LE(22, 18);
  writeFileSync(ico, Buffer.concat([huvud, png]));
  gjorda['/favicon.svg'] = summa(svg);
  console.log('  ikonerna gjorda ur /favicon.svg: /apple-touch-icon.png och /favicon.ico');
}

// Förteckningen följer filerna: bilder som tagits bort försvinner ur den.
const finns = new Set([...alla(join(rot, 'public', 'images')).map(webb), ...(existsSync(svg) ? ['/favicon.svg'] : [])]);
const ny = Object.fromEntries(Object.entries(gjorda).filter(([k]) => finns.has(k)).sort(([a], [b]) => a.localeCompare(b)));
if (JSON.stringify(ny) !== JSON.stringify(existsSync(FORTECKNING) ? JSON.parse(readFileSync(FORTECKNING, 'utf8')) : null)) writeFileSync(FORTECKNING, JSON.stringify(ny, null, 2) + '\n');
console.log(nya.length ? `${nya.length} bilder gjordes i rätt storlek. Committa dem och src/data/bilder.json med ändringen.` : `Bilderna har rätt storlek (${filer.length} st).`);
