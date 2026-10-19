#!/usr/bin/env node
// Bilderna På bordet ur en leverans från metodriggen: kopierar svg-filerna till public/stodundervisning/ och skriver det
// om bilderna som inte står i metodens fil till src/data/pabordet.json, ur riggens out/<slug>/pabordet.json (Faktatextsamtal
// i grupp, metodriggens TILL-SAJTEN 2026-10-13, Det nya punkt 4, 6, 7 och 9): bildens mått när de är andra än 960 × 540,
// bladets skrivytor (ytor), elev (eleven ser på bilden) och skala (bilden ritas smalare i Word). src/lib/pabordet.ts läser
// filen. Inget skrivs för hand: en ny leverans körs genom skriptet igen, och metodens post skrivs då om i sin helhet.
// Bilderna till databasens faktatexter (src/content/faktateman/, K-435) kommer i en egen leverans, riggens
// out/<slug>/databas/pabordet.json, som scripts/faktateman.mjs tar in med --databas: då läggs temanas bilder till metodens
// post, och de som redan stod där skrivs över. En bild som varken metoden eller ett tema på sajten har står kvar i posten
// och nämns. När metodens post skrivs om står temanas bilder kvar, och temanas nummer i metodens leverans hoppas över:
// de kommer bara med temats egen leverans.
//
//   node scripts/pabordetdata.mjs <riggens out/<slug>>            kopierar bilderna och skriver metodens post
//   node scripts/pabordetdata.mjs <riggens out/<slug>> --databas  databasens bilder, ur databas/pabordet.json
//   node scripts/pabordetdata.mjs <riggens out/<slug>> --prova    säger bara vad som skulle göras
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { lasTeman } from '../src/lib/faktatemaihop.js';

const args = process.argv.slice(2);
const mapp = args.find((a) => !a.startsWith('--'));
const prova = args.includes('--prova');
const databas = args.includes('--databas');
const listan = databas ? join(mapp ?? '', 'databas', 'pabordet.json') : join(mapp ?? '', 'pabordet.json');
if (!mapp || !existsSync(listan)) {
  console.error(`Ange riggens mapp med ${databas ? 'databas/pabordet.json' : 'pabordet.json'}: node scripts/pabordetdata.mjs C:/metodrigg/out/<slug> [--databas] [--prova]`);
  process.exit(1);
}
const rigg = JSON.parse(readFileSync(listan, 'utf8'));
const slug = rigg.slug;
const FORVAL = { bredd: 960, hojd: 540 };
const DATAFIL = 'src/data/pabordet.json';
const data = existsSync(DATAFIL) ? JSON.parse(readFileSync(DATAFIL, 'utf8')) : {};
// Databasens bilder läggs till metodens post. Metodens post skrivs om, men temanas bilder står kvar.
const temanas = new Set((await lasTeman('src/content/faktateman', parseYaml)).filter((t) => t.data.metod === slug).flatMap((t) => (t.data.pabordet ?? []).map((b) => String(b.nr))));
const forut = data[slug] ?? {};
const post = databas ? { ...forut } : Object.fromEntries(Object.entries(forut).filter(([nr]) => temanas.has(nr)));
let kopierade = 0;
let hoppade = 0;
for (const b of rigg.bilder) {
  if (!databas && temanas.has(String(b.nr))) { hoppade++; continue; }
  delete post[b.nr];
  // Svg-filerna står i metodens mapp hos riggen, databasens också i databas/, som går först i en databasleverans.
  const fran = (databas ? [join(mapp, 'databas', b.fil), join(mapp, b.fil)] : [join(mapp, b.fil)]).find((f) => existsSync(f)) ?? join(mapp, b.fil);
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
// Bilder i posten som varken metoden eller ett tema på sajten har, efter en ny databasleverans med andra nummer.
const metodens = existsSync(`src/content/stodundervisning/${slug}.yaml`) ? new Set((parseYaml(readFileSync(`src/content/stodundervisning/${slug}.yaml`, 'utf8')).pabordet ?? []).map((b) => String(b.nr))) : new Set();
const overblivna = Object.keys(post).filter((nr) => !metodens.has(nr) && !temanas.has(nr) && !rigg.bilder.some((b) => String(b.nr) === nr));
if (overblivna.length) console.log(`obs  ${slug}: bilderna ${overblivna.join(', ')} står i src/data/pabordet.json men varken i metoden eller i ett tema; ta bort dem och deras svg-filer om de inte behövs.`);
if (hoppade) console.log(`     ${slug}: ${hoppade} bilder hör till databasens teman och hoppades över; de kommer med temats leverans (scripts/faktateman.mjs).`);
// En post per rad och bild, så att en ändring syns som en rad i git.
const text = `{\n${Object.keys(data).sort().map((id) => `  ${JSON.stringify(id)}: {\n${Object.entries(data[id]).map(([nr, x]) => `    ${JSON.stringify(nr)}: ${JSON.stringify(x)}`).join(',\n')}\n  }`).join(',\n')}\n}\n`;
if (!prova) writeFileSync(DATAFIL, text);
const antal = (f) => Object.values(post).filter(f).length;
console.log(`${prova ? 'prov ' : 'ok   '}${slug}${databas ? ', databasen' : ''}: ${kopierade} bilder${prova ? ' skulle kopieras' : ' kopierade'}, ${antal((x) => x.bredd)} med egna mått, ${antal((x) => x.ytor)} blad med skrivytor, ${antal((x) => x.elev)} som eleven ser på, ${antal((x) => x.skala)} med skala.`);
