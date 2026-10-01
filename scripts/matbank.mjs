#!/usr/bin/env node
// Mätbänken: hur ritar Word och Google Dokument en form? (K-138, Niclas 2026-09-30: "Kommer du VETA hur du snabbt gör i
// framtiden. Eller är det 4h såhär nästa metod?")
//
// Bänken och proven står i den gemensamma modulen wordparitet (src/bank.js och bank/, delade med metodriggen, K-158):
// en ny form mäts genom att kopiera det prov i modulens bank/ som liknar formen, byta varianterna och köra bänken; det
// som skiljer blir en regel och en byggsten i modulen och en rad i dess REGLER.md. Här står sajtens inloggning och
// mappen för resultatet, underlag/prov/matbank/<prov>/. Bara en Word-körning åt gången.
//
//   node scripts/matbank.mjs <prov i wordparitet/bank | fil.mjs> [--facit]
//
// Med --facit skrivs de uppmätta stegen in i provet; ett prov i modulen ändras då i klonen C:/wordparitet, inte i
// node_modules (kör bänken med sökvägen till klonens prov).
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { korBank } from 'wordparitet/bank';
import { INLOGGNING } from './google.mjs';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const prov = process.argv.slice(2).find((a) => !a.startsWith('--'));
const facit = process.argv.includes('--facit');
const modulensBank = join(dirname(createRequire(import.meta.url).resolve('wordparitet/package.json')), 'bank');
const fil = prov && (existsSync(prov) ? resolve(prov) : join(modulensBank, `${prov.replace(/\.mjs$/, '')}.mjs`));
if (!fil || !existsSync(fil)) {
  console.error('Ange ett prov: node scripts/matbank.mjs <namn i wordparitet/bank | fil.mjs> [--facit]');
  process.exit(1);
}
const namn = fil.replace(/^.*[\\/]/, '').replace(/\.mjs$/, '');
try {
  const { rader, andrade, bild } = await korBank(fil, { ut: join(rot, 'underlag/prov/matbank', namn), facit, inloggning: INLOGGNING });
  console.log(rader.join('\n'));
  if (bild) console.log(`\nWord till vänster, Google till höger: ${bild}`);
  if (facit) console.log(`Facit skrivet i ${fil}.`);
  else if (andrade) {
    console.error(`\nmätbänken: ${andrade} varianter mäter annorlunda än provets vantat. Läs om regeln fortfarande gäller; --facit skriver de nya stegen.`);
    process.exit(1);
  }
} catch (e) {
  console.error(`mätbänken: ${e.message}`);
  process.exit(1);
}
