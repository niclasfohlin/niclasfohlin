#!/usr/bin/env node
// Lektionskortens innehåll från metodriggen (src/lib/lektionskort.ts, METODER.md under Lektionskortet): riggens papper.json
// för varje kort blir src/data/lektionskort/<stam>.json, som sajten ritar kortet ur i Word med riggens design
// (src/lib/strategipapper.ts), först i Materialet, i planeringsmallarna och i kortets egen fil, vars pdf knappen öppnar.
// Riggen lämnar korten i out/lektionskort/sajten/ som <stam>.json, med sajtens namn (<id>-lektionskort.json, och -2 och -3
// när metoden har fler). Skriptet läser också riggens arbetsmappar, out/lektionskort/<id>/papper.json och
// out/material/lektionskort-<id>/papper.json, där korten låg 2026-10-17.
//
//   node scripts/lektionskortdata.mjs <mapp> …                 lägg in varje kort som mappen har
//   node scripts/lektionskortdata.mjs <papper.json> <stam>     lägg in ett kort under ett givet namn
//
// Varje kort prövas innan det läggs in: strategipapperets design, knappen Lektionskort, pdf:ens titel med ordet
// Lektionskort, upphovet i sidfoten, en metod med kortets id, och högst ett A4, alltså ingen baksida, utom Säg, skriv och
// läs kort från före regeln (Niclas 2026-10-17). Metodens fil får fältet lektionskort för hand, med riggens mening till
// Materialet i text; skriptet säger vilka metoder som saknar fältet.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UT = join(rot, 'src/data/lektionskort');
const METODER = join(rot, 'src/content/stodundervisning');
const FORE_REGELN = new Set(['sag-skriv-och-las-lektionskort']);
const STAM = /^([a-z0-9-]+?)-lektionskort(?:-([23]))?$/;

const args = process.argv.slice(2);
if (!args.length) { console.error('node scripts/lektionskortdata.mjs <mapp> …   eller   node scripts/lektionskortdata.mjs <papper.json> <stam>'); process.exit(1); }

// Korten att lägga in, som [fil, stam].
const kort = [];
if (args.length === 2 && args[0].endsWith('.json') && STAM.test(args[1])) kort.push([resolve(args[0]), args[1]]);
else for (const mapp of args.map((a) => resolve(a))) {
  if (!existsSync(mapp) || !statSync(mapp).isDirectory()) { console.error(`lektionskortdata: ${mapp} är ingen mapp.`); process.exit(1); }
  for (const namn of readdirSync(mapp)) {
    const vag = join(mapp, namn);
    const stam = namn.replace(/\.json$/, '');
    if (namn.endsWith('.json') && STAM.test(stam)) { kort.push([vag, stam]); continue; }
    if (!statSync(vag).isDirectory() || !existsSync(join(vag, 'papper.json'))) continue;
    const id = namn.replace(/^lektionskort-/, '');
    if (existsSync(join(METODER, `${id}.yaml`))) kort.push([join(vag, 'papper.json'), `${id}-lektionskort`]);
  }
}
if (!kort.length) { console.error('lektionskortdata: inga lektionskort hittades.'); process.exit(1); }

const fel = [];
const lagda = [];
mkdirSync(UT, { recursive: true });
for (const [fil, stam] of kort) {
  const id = stam.match(STAM)[1];
  let p;
  try { p = JSON.parse(readFileSync(fil, 'utf8')); } catch (e) { fel.push(`${stam}: ${fil} går inte att läsa (${e.message})`); continue; }
  const brister = [];
  if (p.design !== 'strategipapper') brister.push(`designen är ${p.design ?? 'inte satt'}, ska vara strategipapper`);
  if (p.knapp !== 'Lektionskort') brister.push('knappen överst till höger heter inte Lektionskort');
  if (!/Lektionskort/.test(p.dokumenttitel ?? '')) brister.push('pdf:ens titel (dokumenttitel) saknar ordet Lektionskort');
  if (!/©\s*Niclas Fohlin/.test(p.fot ?? '') || !String(p.fot).includes('niclasfohlin.se')) brister.push('sidfoten (fot) saknar © Niclas Fohlin och niclasfohlin.se');
  if (!p.titel) brister.push('titeln saknas');
  if (!Array.isArray(p.delar) || !p.delar.length || p.delar.some((d) => !Array.isArray(d.kolumner) || !Array.isArray(d.rader))) brister.push('delarna saknas eller saknar kolumner och rader');
  if (p.baksida && !FORE_REGELN.has(stam)) brister.push('kortet har en baksida, men ett lektionskort är högst ett A4 (Niclas 2026-10-17)');
  if (!existsSync(join(METODER, `${id}.yaml`))) brister.push(`metoden ${id} finns inte i src/content/stodundervisning/`);
  if (brister.length) { fel.push(`${stam} (${fil}): ${brister.join('; ')}`); continue; }
  writeFileSync(join(UT, `${stam}.json`), JSON.stringify(p, null, 1) + '\n');
  lagda.push(stam);
}
for (const stam of lagda) console.log(`  ok   src/data/lektionskort/${stam}.json`);
// Metoderna som har ett kort men inte fältet, eller färre poster i fältet än korten.
for (const id of [...new Set(lagda.map((s) => s.match(STAM)[1]))]) {
  const d = parseYaml(readFileSync(join(METODER, `${id}.yaml`), 'utf8'));
  const antal = lagda.filter((s) => s.match(STAM)[1] === id).map((s) => Number(s.match(STAM)[2] ?? 1));
  const hogst = Math.max(...antal);
  if ((d.lektionskort ?? []).length < hogst) console.log(`  obs  ${id}.yaml har ${(d.lektionskort ?? []).length} poster i lektionskort men ${hogst} kort: lägg till fältet, med riggens mening i text (METODER.md under Lektionskortet)`);
}
if (fel.length) { console.error(`\nLektionskort som inte lades in:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`\n${lagda.length} lektionskort inlagda. Kör npm run validera, som ritar korten och gör deras pdf:er.`);
