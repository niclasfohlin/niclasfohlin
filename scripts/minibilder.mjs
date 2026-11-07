#!/usr/bin/env node
// Minibilderna till metodens små kort (K-728; src/data/bladkort.json och src/lib/bladkortfiler.js): en liten webp per kort i
// public/metoder/, gjord ur bladets sidbild eller ur första sidan i en pdf. Sidans bilder är 840 punkter breda och väger upp till
// 100 kB, och i kortets ruta syns bara en del av dem. En minibild väger några kB, sidfoten är borta och saken fyller rutan.
//
// En bild görs om när dess källa eller formen här har ändrats, så att inget görs för hand (ARBETSSATT.md under Design och kod, En
// källa, ingen drift). Källornas summor står i src/data/minibilder.json. En minibild som inte längre har ett kort tas bort.
//
//   node scripts/minibilder.mjs           gör det som saknas eller är gammalt
//   node scripts/minibilder.mjs --alla    gör om alla
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import sharp from 'sharp';
import { MINIBILDEN, metodensMinibilder } from '../src/lib/bladkortfiler.js';

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UT = join(ROT, 'public', 'metoder');
const MANIFEST = join(ROT, 'src', 'data', 'minibilder.json');
// Formens version: höjs när klippet nedan ändras, så att alla bilder görs om.
const FORMEN = 3;
// Ett block är rader i följd med något på. Sidhuvud och sidfot är tunna block högst upp och längst ned, och ett kort är ett stort block.
const HUVUD = { fore: 0.08, hojd: 0.02 };
const FOT = { efter: 0.9, hojd: 0.025 };
const KORT = 0.2;

const alla = process.argv.includes('--alla');
const summa = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const register = JSON.parse(readFileSync(join(ROT, 'src', 'data', 'bladkort.json'), 'utf8'));
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const nytt = {};

async function sidan(kalla, sida) {
  if (!kalla.endsWith('.pdf')) return readFileSync(join(ROT, kalla));
  const mapp = mkdtempSync(join(tmpdir(), 'minibild-'));
  const r = spawnSync('pdftoppm', ['-png', '-r', '120', '-f', String(sida), '-l', String(sida), '-singlefile', join(ROT, kalla), join(mapp, 'sida')], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`pdftoppm stannade på ${kalla}: ${r.stderr}`);
  const b = readFileSync(join(mapp, 'sida.png'));
  rmSync(mapp, { recursive: true, force: true });
  return b;
}

/** Blocken på sidan, som [första raden, sista raden]: en rad räknas när minst andel av bredden är mörkare än grans. */
function blocken(data, bredd, hojd, grans, andel) {
  const ut = [];
  let start = -1;
  for (let y = 0; y < hojd; y++) {
    let farg = 0;
    for (let x = 0; x < bredd; x++) if (data[y * bredd + x] < grans) farg++;
    const med = farg > 0 && farg >= andel * bredd;
    if (med && start < 0) start = y;
    if (!med && start >= 0) { ut.push([start, y - 1]); start = -1; }
  }
  if (start >= 0) ut.push([start, hojd - 1]);
  return ut;
}

/**
 * Raderna som är saken. Fasta andelar skar i kortens ramar (Codex 2026-11-07), så klippet läser sidans block. Ett kort på en sida
 * med två är ett av de två stora blocken. Klipplinjen och saxen mellan korten hör inte till något av dem: saxen når över
 * mellanrummet på bladen, så där läses raderna som är fyllda, vilket korten med färg i botten är. En hel sida är allt utom sidfoten,
 * och en mall ur Word också utan sidhuvudet.
 */
function radernaMed(data, bredd, hojd, del, mall) {
  if (del === 'hel') {
    const b = blocken(data, bredd, hojd, 235, 0).filter(([f, s]) => !(f >= FOT.efter * hojd && s - f <= FOT.hojd * hojd) && !(mall && f <= HUVUD.fore * hojd && s - f <= HUVUD.hojd * hojd));
    return [b[0][0], b.at(-1)[1]];
  }
  const stora = (b) => b.filter(([f, s]) => s - f >= KORT * hojd);
  let kort = stora(blocken(data, bredd, hojd, 235, 0));
  if (kort.length < 2) kort = stora(blocken(data, bredd, hojd, 250, 0.08));
  if (kort.length !== 2) throw new Error(`sidan har ${kort.length} kort och inte två`);
  return kort[del === 'ovre' ? 0 : 1];
}

async function gor({ kalla, sida, del, fil }) {
  const bild = await sidan(kalla, sida);
  const { data, info } = await sharp(bild).flatten({ background: '#ffffff' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const mall = kalla.endsWith('.pdf') && del === 'hel' && height > width;
  const [fran, till] = radernaMed(data, width, height, del, mall);
  // Saken ska fylla rutan: den vita marginalen runt den går bort. En liggande sak står hel, och en stående visar sin översta del.
  const delen = await sharp(bild).flatten({ background: '#ffffff' }).extract({ left: 0, top: fran, width, height: till - fran + 1 }).toBuffer();
  const klipp = await sharp(delen).trim({ background: '#ffffff', threshold: 16 }).toBuffer();
  const luft = Math.round(MINIBILDEN.hojd * 0.06);
  const klippet = await sharp(klipp).metadata();
  const form = klippet.width >= klippet.height ? { fit: 'contain', background: '#ffffff' } : { fit: 'cover', position: 'top' };
  const inre = await sharp(klipp).resize(MINIBILDEN.bredd - 2 * luft, MINIBILDEN.hojd - 2 * luft, form).flatten({ background: '#ffffff' }).toBuffer();
  const fardig = await sharp(inre).extend({ top: luft, bottom: luft, left: luft, right: luft, background: '#ffffff' }).toBuffer();
  await sharp(fardig).webp({ quality: 80, effort: 6 }).toFile(join(UT, fil));
  // Mejlen läser png, eftersom Outlook i Windows inte visar webp (netlify/lib/mejl.mjs).
  await sharp(fardig).png({ compressionLevel: 9, palette: true, colours: 128 }).toFile(join(UT, fil.replace(/\.webp$/, '.png')));
}

let gjorda = 0;
const gallande = new Set();
for (const [id, post] of Object.entries(register)) {
  if (id === '_om') continue;
  const d = parse(readFileSync(join(ROT, 'src', 'content', 'undervisningsmetoder', `${id}.yaml`), 'utf8'));
  for (const m of metodensMinibilder(id, d, post)) {
    if (!existsSync(join(ROT, m.kalla))) throw new Error(`${id}: minibilden ${m.namn} ska göras ur ${m.kalla}, som saknas.`);
    const nyckel = `${FORMEN}:${m.sida}:${m.del}:${summa(readFileSync(join(ROT, m.kalla)))}`;
    gallande.add(m.fil);
    nytt[m.fil] = nyckel;
    if (!alla && manifest[m.fil] === nyckel && existsSync(join(UT, m.fil)) && existsSync(join(UT, m.fil.replace(/\.webp$/, '.png')))) continue;
    await gor(m);
    gjorda++;
  }
}
for (const f of readdirSync(UT).filter((x) => /-minibild-[a-z0-9-]+\.(webp|png)$/.test(x) && !gallande.has(x.replace(/\.png$/, '.webp')))) rmSync(join(UT, f));
writeFileSync(MANIFEST, `${JSON.stringify(nytt, null, 2)}\n`);
console.log(`Minibilderna: ${gallande.size} kort, ${gjorda} ${gjorda === 1 ? 'gjord' : 'gjorda'} nu.`);
