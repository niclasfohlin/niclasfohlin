#!/usr/bin/env node
// Klarar Word-filerna reglerna för Word och Google Dokument? (K-138, Niclas 2026-09-30: "Du behöver lägga in något form
// av mekanik och script för att enkelt göra rimlig paritet mellan Word och drive".)
//
// Reglerna, skälen och regelprovet står i den gemensamma modulen wordparitet (src/regler.js och REGLER.md), som sajten
// och metodriggen delar och båda bygger ut (K-158). Här står sajtens undantag, med skäl, och vilka filer som prövas.
// Skriptet öppnar varje byggd Word-fil i dist/stodundervisning och stoppar valideringen när en regel bryts, med filen och
// ett utdrag. Det behöver varken Word, Google eller nätverk och tar någon sekund, så det går i npm run validera efter
// bygget. Ett fel rättas i den gemensamma koden (src/lib/metoddocx.ts), aldrig i en enskild metod; ett undantag läggs i
// UNDANTAG nedan med sitt skäl, aldrig tyst. En ny regel läggs i modulen.
//
//   node scripts/wordregler.mjs            alla Word-filer i dist/stodundervisning
//   node scripts/wordregler.mjs <fil.docx> …
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brottSomText, provaWordfil } from 'wordparitet';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(rot, 'dist/stodundervisning');
const valda = process.argv.slice(2);
const filer = valda.length ? valda : readdirSync(DIST).filter((f) => f.endsWith('.docx')).map((f) => join(DIST, f));

// Problemlösning i grupp har "187 ✓" i exemplets tabell, ur metodriggen 2026-09: ett tecken i en tabellcell, där raden
// inte blir högre än cellens text. Metodens text ändras inte för en glyf; riggen skriver ord (FRAN-SAJTEN.md).
const BOCKEN = 'tecken som inte är prövade i Word och Google';
const UNDANTAG = [
  { regel: BOCKEN, fil: 'problemlosning-i-grupp', tecken: '✓', skal: 'bocken i exemplets tabell, i en cell där raden inte blir högre' },
  { regel: BOCKEN, fil: 'alla-metoder', tecken: '✓', skal: 'samlingsfilen har Problemlösning i grupp i sig' },
];

let fel = 0;
for (const fil of filer) {
  const brott = await provaWordfil(readFileSync(fil), { filnamn: basename(fil), undantag: UNDANTAG });
  if (brott.length) {
    fel++;
    console.error(`${basename(fil)}:\n  ${brottSomText(brott).join('\n  ')}`);
  }
}
if (fel) {
  console.error(`\nWord-reglerna: ${fel} av ${filer.length} Word-filer använder något som Google Dokument ritar annorlunda än Word. Rätta den gemensamma koden i src/lib/metoddocx.ts; reglerna och skälen står i wordparitet (REGLER.md).`);
  process.exit(1);
}
console.log(`Word-reglerna: alla ${filer.length} Word-filer klarar reglerna för Word och Google Dokument (wordparitet, REGLER.md).`);
