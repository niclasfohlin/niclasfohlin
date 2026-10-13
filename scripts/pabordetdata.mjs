#!/usr/bin/env node
// Bilderna På bordet ur en leverans från metodriggen: kopierar svg-filerna till public/stodundervisning/ och skriver det
// om bilderna som inte står i metodens fil till src/data/pabordet.json, ur riggens out/<slug>/pabordet.json (Faktatextsamtal
// i grupp, metodriggens TILL-SAJTEN 2026-10-13, Det nya punkt 4, 6, 7 och 9): bildens mått när de är andra än 960 × 540,
// bladets skrivytor (ytor), elev (eleven ser på bilden) och skala (bilden ritas smalare i Word). src/lib/pabordet.ts läser
// filen. Inget skrivs för hand: en ny leverans körs genom skriptet igen, och metodens post skrivs då om i sin helhet.
//
//   node scripts/pabordetdata.mjs <riggens out/<slug>>            kopierar bilderna och skriver metodens post
//   node scripts/pabordetdata.mjs <riggens out/<slug>> --prova    säger bara vad som skulle göras
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const mapp = args.find((a) => !a.startsWith('--'));
const prova = args.includes('--prova');
if (!mapp || !existsSync(join(mapp, 'pabordet.json'))) {
  console.error('Ange riggens mapp med pabordet.json: node scripts/pabordetdata.mjs C:/metodrigg/out/<slug> [--prova]');
  process.exit(1);
}
const rigg = JSON.parse(readFileSync(join(mapp, 'pabordet.json'), 'utf8'));
const slug = rigg.slug;
const FORVAL = { bredd: 960, hojd: 540 };
const DATAFIL = 'src/data/pabordet.json';
const data = existsSync(DATAFIL) ? JSON.parse(readFileSync(DATAFIL, 'utf8')) : {};
const post = {};
let kopierade = 0;
for (const b of rigg.bilder) {
  const fran = join(mapp, b.fil);
  if (!existsSync(fran)) { console.error(`FEL  bild ${b.nr}: filen ${b.fil} saknas i ${mapp}.`); process.exit(1); }
  if (!prova) copyFileSync(fran, `public/stodundervisning/${slug}-pabordet-${b.nr}.svg`);
  kopierade++;
  const x = {};
  if (b.bredd !== FORVAL.bredd || b.hojd !== FORVAL.hojd) { x.bredd = b.bredd; x.hojd = b.hojd; }
  if (b.ytor?.length) x.ytor = b.ytor.map((y) => ({ namn: y.namn, x: y.x, y: y.y, b: y.b, h: y.h, ...(y.lage ? { lage: y.lage } : {}), ...(y.mitt ? { mitt: true } : {}) }));
  if (b.elev) x.elev = true;
  if (typeof b.skala === 'number') x.skala = b.skala;
  if (Object.keys(x).length) post[b.nr] = x;
}
if (Object.keys(post).length) data[slug] = post; else delete data[slug];
// En post per rad och bild, så att en ändring syns som en rad i git.
const text = `{\n${Object.keys(data).sort().map((id) => `  ${JSON.stringify(id)}: {\n${Object.entries(data[id]).map(([nr, x]) => `    ${JSON.stringify(nr)}: ${JSON.stringify(x)}`).join(',\n')}\n  }`).join(',\n')}\n}\n`;
if (!prova) writeFileSync(DATAFIL, text);
const antal = (f) => Object.values(post).filter(f).length;
console.log(`${prova ? 'prov ' : 'ok   '}${slug}: ${kopierade} bilder${prova ? ' skulle kopieras' : ' kopierade'}, ${antal((x) => x.bredd)} med egna mått, ${antal((x) => x.ytor)} blad med skrivytor, ${antal((x) => x.elev)} som eleven ser på, ${antal((x) => x.skala)} med skala.`);
