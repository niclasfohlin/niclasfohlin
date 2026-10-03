#!/usr/bin/env node
// Jämför en metodtext från metodriggen med sajtens fil, fält för fält (Niclas 2026-09-30: riggens paket har metodtexter
// med sig, och det ska bli rätt direkt). Riggens fil skriver aldrig över sajtens: sajten har egna rättningar (språket,
// Materialet, granskningarnas fynd), och de ska inte försvinna. Skriptet visar vad som skiljer, så att det riggen har
// ändrat tas in för sig och sajtens rättningar står kvar. Filmfälten (film, filmer) tas in med scripts/filmpaket.mjs och
// visas inte här. Fält som sajten äger (uppdaterad, relaterade, utkast) står för sig.
//
//   node scripts/metoddiff.mjs <riggens yaml> [<id>]              allt som skiljer riggens fil från sajtens
//   node scripts/metoddiff.mjs <riggens yaml> [<id>] --bas <yaml>  bara det riggen har ändrat sedan basen, den version
//                                                                  riggen utgick från (riggens förra leverans, ur riggens
//                                                                  git eller out/<id>/), och om sajten har ändrat samma fält
//
// id är filnamnet utan .yaml; utan id tas det ur riggens filnamn. Med --bas blir listan kort: sajtens egna rättningar
// syns inte, och ett fält som både riggen och sajten har ändrat står som krock, att avgöra för hand.
//
// Ändrar ingenting.
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const basIndex = argv.indexOf('--bas');
const basFil = basIndex >= 0 ? argv[basIndex + 1] : undefined;
const [riggFil, idArg] = argv.filter((_, i) => basIndex < 0 || (i !== basIndex && i !== basIndex + 1));
if (!riggFil || !existsSync(riggFil)) { console.error('Användning: node scripts/metoddiff.mjs <riggens yaml> [<id>]'); process.exit(1); }
const id = idArg ?? basename(riggFil).replace(/(\.sajten)?\.ya?ml$/, '').replace(/^metod$/, basename(dirname(riggFil)));
const sajtFil = join(rot, 'src/content/stodundervisning', `${id}.yaml`);
if (!existsSync(sajtFil)) { console.error(`metoddiff: sajten har ingen metod ${id} (${sajtFil}). En ny metod tas in med /ny-metod.`); process.exit(1); }
const rigg = parseYaml(readFileSync(riggFil, 'utf8')) ?? {};
const sajt = parseYaml(readFileSync(sajtFil, 'utf8')) ?? {};
if (basFil && !existsSync(basFil)) { console.error(`metoddiff: basen ${basFil} finns inte.`); process.exit(1); }
const bas = basFil ? parseYaml(readFileSync(basFil, 'utf8')) ?? {} : undefined;

const FILM = new Set(['film', 'filmer']);
const SAJTENS = new Set(['uppdaterad', 'publicerad', 'relaterade', 'utkast']);
const visa = (x) => (x === undefined ? '(finns inte)' : typeof x === 'string' ? `”${x}”` : JSON.stringify(x));
function skillnader(a, b, sti, ut) {
  if (JSON.stringify(a) === JSON.stringify(b)) return ut;
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) skillnader(a[i], b[i], `${sti}.${i}`, ut);
    return ut;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])]) skillnader(a[k], b[k], sti ? `${sti}.${k}` : k, ut);
    return ut;
  }
  ut.push({ sti, sajt: a, rigg: b });
  return ut;
}
const varde = (x, sti) => sti.split('.').reduce((v, k) => (v == null ? undefined : v[k]), x);
if (bas) {
  // Tre vägar: det riggen har ändrat sedan basen, med sajtens värde bredvid.
  const andrat = skillnader(bas, rigg, '', []).filter((d) => !FILM.has(d.sti.split('.')[0]) && !SAJTENS.has(d.sti.split('.')[0]));
  const krock = andrat.filter((d) => JSON.stringify(varde(sajt, d.sti)) !== JSON.stringify(d.sajt) && JSON.stringify(varde(sajt, d.sti)) !== JSON.stringify(d.rigg));
  console.log(`${id}: riggen har ändrat ${andrat.length} fält sedan basen (${basFil}), varav ${krock.length} som sajten också har ändrat.`);
  for (const d of andrat) {
    const s = varde(sajt, d.sti);
    const lage = JSON.stringify(s) === JSON.stringify(d.rigg) ? 'sajten har redan riggens' : JSON.stringify(s) === JSON.stringify(d.sajt) ? 'ta riggens' : 'KROCK: sajten har ändrat också, avgör för hand';
    console.log(`\n${d.sti}  (${lage})\n  basen:  ${visa(d.sajt)}\n  riggen: ${visa(d.rigg)}${lage.startsWith('KROCK') ? `\n  sajten: ${visa(s)}` : ''}`);
  }
  process.exit(0);
}
const alla = skillnader(sajt, rigg, '', []).filter((d) => !FILM.has(d.sti.split('.')[0]));
const egna = alla.filter((d) => SAJTENS.has(d.sti.split('.')[0]));
const text = alla.filter((d) => !SAJTENS.has(d.sti.split('.')[0]));
console.log(`${id}: ${text.length} ${text.length === 1 ? 'skillnad' : 'skillnader'} i metodens text mellan sajten och riggen (${riggFil}).`);
for (const d of text) console.log(`\n${d.sti}\n  sajten: ${visa(d.sajt)}\n  riggen: ${visa(d.rigg)}`);
if (egna.length) console.log(`\nFält som sajten äger och behåller: ${egna.map((d) => d.sti).join(', ')}.`);
console.log('\nTa in det riggen har ändrat i sajtens fil för hand, fält för fält, och behåll sajtens rättningar. Sedan npm run validera och metodprov.');
