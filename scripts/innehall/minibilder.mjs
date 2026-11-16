#!/usr/bin/env node
// Minibilderna till verktyget Innehålls mallar (K-793): en liten webp av varje mallblads första sida, som korten under
// Mallarna och rutorna i texten visar, så att läraren ser vilket blad det är innan det hämtas (Opus form A,
// underlag/prov/innehall/ide/). Bilden görs ur pdf:en som knappen hämtar: Words pdf av ett papper
// (public/stodundervisning/innehall-<id>.pdf, scripts/bankpdf.mjs) och Chromes pdf av ett elevblad
// (public/innehall/<id>.pdf, scripts/innehall/elevblad.mjs). Bladets övre del syns, i 640 × 452 punkter, som kortet visar
// i hälften av det.
//
// En bild görs om när dess pdf eller formen här har ändrats, så att inget görs för hand. Summorna står i
// src/data/innehall/minibilder.json. En bild vars mall inte längre finns tas bort.
//
//   node scripts/innehall/minibilder.mjs              gör det som saknas eller är gammalt (validera, efter pdf:erna)
//   node scripts/innehall/minibilder.mjs --kontrollera  stanna när en bild saknas eller är gjord av en äldre pdf
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const UT = join(ROT, 'public', 'innehall');
const MANIFEST = join(ROT, 'src', 'data', 'innehall', 'minibilder.json');
// Formens version: höjs när klippet nedan ändras, så att alla bilder görs om.
const FORMEN = 1;
const BREDD = 640, HOJD = 452;
const kontrollera = process.argv.includes('--kontrollera');

const verktyget = JSON.parse(readFileSync(join(ROT, 'src', 'data', 'innehall', 'verktyget.json'), 'utf8'));
const kallan = (m) => (m.slag === 'elevblad' ? join(UT, `${m.id}.pdf`) : join(ROT, 'public', 'stodundervisning', `innehall-${m.id}.pdf`));
const summa = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const nytt = {};
const fel = [];
const tmp = mkdtempSync(join(tmpdir(), 'innehall-minibild-'));
try {
  for (const m of verktyget.mallar) {
    const pdf = kallan(m);
    const fil = `minibild-${m.id}.webp`;
    if (!existsSync(pdf)) { fel.push(`${m.namn}: pdf:en ${pdf.slice(ROT.length + 1)} saknas, så minibilden kan inte göras (kör npm run validera)`); continue; }
    const nyckel = `${FORMEN}:${summa(readFileSync(pdf))}`;
    nytt[m.id] = nyckel;
    if (manifest[m.id] === nyckel && existsSync(join(UT, fil))) continue;
    if (kontrollera) { fel.push(`${fil} saknas eller är gjord av en äldre pdf`); continue; }
    const r = spawnSync('pdftoppm', ['-png', '-r', '110', '-f', '1', '-l', '1', '-singlefile', pdf, join(tmp, m.id)], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`pdftoppm stannade på ${pdf}: ${r.stderr}`);
    const sida = join(tmp, `${m.id}.png`);
    const { width, height } = await sharp(sida).metadata();
    // Bladets övre del i kortets form, från bladets kant, så att titeln och första delen syns.
    const hojd = Math.min(height, Math.round(width * HOJD / BREDD));
    await sharp(sida).flatten({ background: '#ffffff' }).extract({ left: 0, top: 0, width, height: hojd }).resize(BREDD, HOJD).webp({ quality: 80, effort: 6 }).toFile(join(UT, fil));
    console.log(`ok   ${fil}`);
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }

// En bild vars mall inte längre finns.
const ids = new Set(verktyget.mallar.map((m) => m.id));
for (const f of readdirSync(UT).filter((x) => /^minibild-.+\.webp$/.test(x))) {
  const id = f.replace(/^minibild-|\.webp$/g, '');
  if (ids.has(id)) continue;
  if (kontrollera) fel.push(`${f} är överbliven: mallen finns inte längre`);
  else unlinkSync(join(UT, f));
}
if (fel.length) { console.error(`Innehålls minibilder: ${fel.join('; ')}.`); process.exit(1); }
if (!kontrollera) writeFileSync(MANIFEST, `${JSON.stringify(nytt, null, 1)}\n`);
console.log(`Innehålls minibilder: ${Object.keys(nytt).length} aktuella.`);
