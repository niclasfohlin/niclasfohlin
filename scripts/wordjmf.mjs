#!/usr/bin/env node
// Ändrar en ändring i Word-byggaret hur Word-filerna ser ut i Word? (Niclas 2026-09-30: "Du borde kunna använda
// Word-motorn på datorn för att mäta med", och "Gör bra och gör säkert".)
//
//   node scripts/wordjmf.mjs --facit [<id> …]   Word gör pdf av varje Word-fil i dist till underlag/prov/wordjmf/facit/
//   node scripts/wordjmf.mjs [<id> …]           samma för dist nu, och jämförelse sida för sida mot facit
//
// Jämförelsen står i den gemensamma modulen wordparitet (wordFacit och wordJamfor i src/jamfor.js, K-158): texten (samma
// antal sidor och samma tecken på varje sida betyder att varje sidbrytning står kvar) och bilden (andelen punkter som
// skiljer sig). De tre mest ändrade sidorna i varje fil ritas som facit, nu och skillnaden i underlag/prov/wordjmf/bilder/,
// som läses innan ändringen godtas. Kräver Word, pdftotext och pdftoppm. Bara en Word-körning åt gången.
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wordFacit, wordJamfor } from 'wordparitet';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(rot, 'dist/stodundervisning');
const PROV = join(rot, 'underlag/prov/wordjmf');
const facit = process.argv.includes('--facit');
mkdirSync(PROV, { recursive: true });
const valda = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const filer = readdirSync(DIST).filter((f) => f.endsWith('.docx') && f !== 'alla-metoder.docx' && (!valda.length || valda.some((v) => f.startsWith(v))));
// Tecken som en ändring bytt med avsikt räknas som samma tecken, så att bytet inte döljer en flyttad rad längre fram
// (K-138: bockrutan ☐ blev □).
const KANDA_BYTEN = [['☐', '□']];

let skiljer = 0;
for (const f of filer) {
  if (facit) { console.log(`facit  ${f}: ${wordFacit(join(DIST, f), join(PROV, 'facit'))} sidor`); continue; }
  const r = await wordJamfor(join(DIST, f), { facitMapp: join(PROV, 'facit'), nuMapp: join(PROV, 'nu'), bildMapp: join(PROV, 'bilder'), byten: KANDA_BYTEN });
  if (r.lage === '?') console.log(`?      ${f}: inget facit`);
  else if (r.lage === 'NEJ') { skiljer++; console.log(`NEJ    ${f}: ${r.delar.join('; ')}`); }
  else console.log(`ok     ${f}: ${r.sidor} sidor, samma sidbrytningar och samma bild`);
}
if (!facit && skiljer) { console.error(`\nwordjmf: ${skiljer} Word-filer ser annorlunda ut i Word än facit. Bilderna står i underlag/prov/wordjmf/bilder/.`); process.exit(1); }
