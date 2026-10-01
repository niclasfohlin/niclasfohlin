#!/usr/bin/env node
// Ritar Google Dokument en Word-fil som Word gör? (Niclas 2026-09-30: bråken och radavstånden blev fel i Google Dokument
// fast de var rätt i Word, och "Du behöver lägga in något form av mekanik och script för att enkelt göra rimlig
// paritet mellan Word och drive", K-138.)
//
// Jämförelsen står i den gemensamma modulen wordparitet (jamforWordGoogle i src/jamfor.js, delad med metodriggen,
// K-158), med det som stoppar (blocken, tomma sidor, texten och ordbrytningen) och det som visas som obs. Här står
// sajtens del: vilka filer som prövas, jämförelsen med filerna som ligger ute, sidhuvudets och sidfotens rader som inte
// räknas som sidans text, mapparna och testmappen. Niclas: "Granska dem ska du göra. Automatiskt".
//
//   node scripts/googleprov.mjs <fil.docx | metodens id> … [--mapp] [--sidor 1,21]
//   node scripts/googleprov.mjs --andrade [--mapp]   Word-filerna i dist som skiljer sig från dem som ligger ute
//   node scripts/googleprov.mjs --alla [--mapp]      alla Word-filer i dist
//   … --igen                                         jämför de senast hämtade pdf:erna igen, utan uppladdning
//
// --mapp lägger Google-versionerna i testmappen "Prov före uppladdning · niclasfohlin.se" (Niclas: "Skapa en testmapp
// där man testar enkelt innan uppladdning"), där en ny version skriver över samma dokument med samma länk. Ett id tar
// dist/stodundervisning/<id>.docx (kör npm run validera först). Pdf:erna och översiktsarken hamnar i
// underlag/prov/google/. Stannar med kod 1 om en kontroll inte går igenom. Kräver Word, pdftotext, pdftoppm och
// Toishi-riggens Google-inloggning (DRIFT.md under Google Drive-knappen).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { innehall, jamforWordGoogle } from 'wordparitet';
import { INLOGGNING, testmappen } from './google.mjs';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const sidArg = args.indexOf('--sidor');
const sidor = sidArg >= 0 ? args[sidArg + 1].split(',').map(Number) : [];
const mapp = args.includes('--mapp');
const DIST = join(rot, 'dist/stodundervisning');
const UT = join(rot, 'underlag/prov/google');
// Sidnumret står som "Sida 12 av 31" och på boksidorna som "s. 42" sist i sidfoten (K-148), och sidhuvudet och sidfoten
// har upphovet och adressen: det står på varje sida och räknas inte som sidans text.
const SIDNUMMER = /Sida \d+ av \d+|(?<= s\.) \d+(?=\s*$)/gm;
const RAM = /Sida \d+ av \d+|(?<= s\.) \d+(?=\s*$)|© Niclas Fohlin[^\n]*|[^\n]*· niclasfohlin\.se\s*$/gm;

let filer = args.filter((a, i) => !a.startsWith('--') && (sidArg < 0 || i !== sidArg + 1))
  .map((a) => (a.toLowerCase().endsWith('.docx') ? a : join(DIST, `${a}.docx`)));
if (args.includes('--alla') || args.includes('--andrade')) {
  // Samlingsfilen med alla metoder är för stor för Google Drives export (exportSizeLimitExceeded); den är varje metods
  // egen fil i följd, och de granskas var för sig.
  filer = readdirSync(DIST).filter((f) => f.endsWith('.docx') && f !== 'alla-metoder.docx').map((f) => join(DIST, f));
  if (args.includes('--andrade')) {
    const andrade = [];
    for (const f of filer) {
      const ute = await fetch(`https://niclasfohlin.se/stodundervisning/${basename(f)}?v=${Date.now()}`);
      if (!ute.ok || (await innehall(Buffer.from(await ute.arrayBuffer()))) !== (await innehall(readFileSync(f)))) andrade.push(f);
    }
    filer = andrade;
    console.log(`${filer.length} Word-filer skiljer sig från dem som ligger ute.`);
  }
}
if (!filer.length) { console.log('googleprov: inga Word-filer att pröva.'); process.exit(0); }
for (const f of filer) if (!existsSync(f)) { console.error(`googleprov: ${f} finns inte.`); process.exit(1); }

const mappId = mapp ? await testmappen() : undefined;
let fel = 0;
for (const fil of filer) {
  let r;
  try {
    r = await jamforWordGoogle(fil, { ut: UT, mappId, inloggning: INLOGGNING, igen: args.includes('--igen'), ram: RAM, sidnummer: SIDNUMMER, sidor, visaAnkare: args.includes('--visa-ankare') });
  } catch (e) {
    fel++;
    console.log(`NEJ  ${basename(fil, '.docx')}: ${e.message.replace(/\s+/g, ' ').slice(0, 240)}`);
    continue;
  }
  if (r.lage === 'NEJ') fel++;
  for (const rad of r.ankarlista) console.log(`     ${rad}`);
  console.log(`${r.lage.padEnd(3)}  ${r.namn}: ${r.beskrivning}${r.lage !== 'NEJ' ? ` (${r.provade} av ${r.ankare} sidankare prövade; de börjar sin sida och ryms lika i båda)` : ''}`);
  console.log(`     översikt (Word över Google): ${r.ark}${r.lank && mapp ? `\n     i testmappen: ${r.lank}` : ''}`);
  for (const b of r.bilder) console.log(`     sidan ${b.sida} i ${b.vem === 'word' ? 'Word' : 'Google'}: ${b.fil}`);
}
if (fel) { console.error(`\ngoogleprov: ${fel} av ${filer.length} Word-filer skiljer sig mellan Word och Google Dokument så att det stoppar. Läs översiktsarken.`); process.exit(1); }
console.log(`\nAlla ${filer.length} Word-filer: varje block börjar sin sida och ryms lika i Word och Google Dokument, ingen tom sida och ingen text som saknas. Läs översiktsarken, särskilt filerna med obs.`);
