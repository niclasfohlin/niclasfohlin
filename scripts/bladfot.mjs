// Hur långt ned varje blad är ritat (granskningen av elevens blad 2026-10-20: upphovsraden stod i bladets ritning i 31 av
// 66 pdf:er). Word ritar ett blad kant till kant och upphovet på en fast höjd under bildens nedersta linje (bildblad i
// src/lib/metoddocx.ts), och metodriggens nya blad har sina ramar ända ned till 293 mm av ett stående A4. Skriptet ritar
// varje blads svg med resvg, en punkt per bildpunkt, och letar uppifrån sidans nederkant efter den första raden som skiljer
// sig från bakgrunden i hörnet. Raden, i bildens punkter, står i src/data/bladfot.json med svg-filens kontrollsumma, och
// src/lib/pabordet.ts ger den bladet som fot. Ett blad som är ritat för långt ned krymps då i Word, så att upphovet står
// under ritningen. Mätningen görs i förväg, eftersom webbläsaren som bygger metodbankens Word-fil inte kan rita svg.
//
//   node scripts/bladfot.mjs                 mäter alla blad
//   node scripts/bladfot.mjs --vid-behov     bara de som saknas eller har en ny svg-fil (npm run validera)
//   node scripts/bladfot.mjs --kontrollera   stanna om en mätning saknas, är inaktuell eller överbliven (npm run build)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { Resvg } from '@resvg/resvg-js';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UT = join(rot, 'src/data/bladfot.json');
const args = process.argv.slice(2);
const kontrollera = args.includes('--kontrollera');
const vidBehov = args.includes('--vid-behov');
// Hur mycket en kanal får skilja från bakgrunden innan raden räknas som ritad: kantutjämningen ger svaga toner.
const TOLERANS = 24;

const mapp = join(rot, 'src/content/stodundervisning');
const blad = readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).flatMap((f) => {
  const id = f.replace(/\.yaml$/, '');
  const d = parseYaml(readFileSync(join(mapp, f), 'utf8'));
  return (d.pabordet ?? []).filter((b) => String(b.rubrik ?? '').startsWith('Blad: ')).map((b) => ({ nyckel: `${id}-${b.nr}`, fil: join(rot, 'public/stodundervisning', `${id}-pabordet-${b.nr}.svg`) }));
});
const forr = existsSync(UT) ? JSON.parse(readFileSync(UT, 'utf8')) : {};
// Summan bortser från radsluten: git skriver svg-filerna med CRLF när en gren checkas ut, fast bladet är detsamma.
const summa = (fil) => createHash('sha256').update(readFileSync(fil, 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);

function mat(fil) {
  const r = new Resvg(readFileSync(fil), { fitTo: { mode: 'original' }, background: 'rgba(255,255,255,1)' }).render();
  const { width: b, height: h, pixels } = r;
  const px = (x, y) => { const i = (y * b + x) * 4; return [pixels[i], pixels[i + 1], pixels[i + 2]]; };
  const bakgrund = px(2, h - 2);
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < b; x++) {
      const p = px(x, y);
      if (Math.abs(p[0] - bakgrund[0]) > TOLERANS || Math.abs(p[1] - bakgrund[1]) > TOLERANS || Math.abs(p[2] - bakgrund[2]) > TOLERANS) return { fot: y + 1, hojd: h };
    }
  }
  return { fot: 0, hojd: h };
}

const ut = {};
const fel = [];
let matta = 0;
for (const x of blad) {
  if (!existsSync(x.fil)) { fel.push(`${x.nyckel}: svg-filen saknas (${x.fil})`); continue; }
  const s = summa(x.fil);
  if (forr[x.nyckel]?.summa === s) { ut[x.nyckel] = forr[x.nyckel]; continue; }
  if (kontrollera) { fel.push(`${x.nyckel}: ${forr[x.nyckel] ? 'mätningen är gjord av en äldre svg-fil' : 'mätningen saknas'}. Kör npm run validera, som mäter bladen (scripts/bladfot.mjs --vid-behov), och committa src/data/bladfot.json.`); continue; }
  const m = mat(x.fil);
  ut[x.nyckel] = { summa: s, fot: m.fot };
  matta++;
}
const overblivna = Object.keys(forr).filter((k) => !ut[k] && !blad.some((x) => x.nyckel === k));
if (kontrollera && overblivna.length) fel.push(`Mätningar utan blad i någon metod: ${overblivna.join(', ')}. Kör npm run validera.`);
if (fel.length) { console.error(`bladfot:\n  ${fel.join('\n  ')}`); process.exit(1); }
if (kontrollera) { console.log(`Bladens mätning är aktuell för ${blad.length} blad.`); process.exit(0); }
const sorterad = Object.fromEntries(Object.keys(ut).sort().map((k) => [k, ut[k]]));
if (matta || overblivna.length || !vidBehov) writeFileSync(UT, `${JSON.stringify(sorterad, null, 2)}\n`);
console.log(matta ? `Bladens mätning: ${matta} blad mätta, ${blad.length} i alla. Committa src/data/bladfot.json.` : `Bladens mätning är aktuell för ${blad.length} blad.`);
