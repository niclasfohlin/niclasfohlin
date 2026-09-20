#!/usr/bin/env node
// Skriver en metod i stödundervisning som YAML ur en JavaScript-modul, så att citattecken,
// kolon och radbrytningar aldrig blir YAML-fel. Modulen exporterar metoden som default,
// med samma fält som src/content/stodundervisning/_mall.yaml.
//
//   node scripts/metod-yaml.mjs underlag/metoder/problemlosning-i-grupp.mjs
//   node scripts/metod-yaml.mjs <modul> --id <slug>     (annars filnamnet utan .mjs)
//
// Filen hamnar i src/content/stodundervisning/<id>.yaml. Bygget validerar mot modellen.

import { writeFileSync } from 'node:fs';
import { basename, join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { stringify } from 'yaml';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const modul = args.find((a) => !a.startsWith('--'));
if (!modul) {
  console.error('Ange modulen: node scripts/metod-yaml.mjs <fil.mjs> [--id <slug>]');
  process.exit(1);
}
const idArg = args.indexOf('--id');
const id = idArg >= 0 ? args[idArg + 1] : basename(modul).replace(/\.m?js$/, '');
if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) {
  console.error(`Ogiltigt id "${id}": bara a-z, 0-9 och bindestreck.`);
  process.exit(1);
}

const { default: metod } = await import(pathToFileURL(resolve(modul)).href);
if (!metod || typeof metod !== 'object' || !metod.titel) {
  console.error('Modulen ska exportera metoden som default, med minst titel.');
  process.exit(1);
}

const huvud = `# Metod i stödundervisning. Modellen står i src/content.config.ts och mallen i _mall.yaml.\n# Skriven av scripts/metod-yaml.mjs ur ${basename(modul)}. Ändra i YAML-filen eller kör om skriptet.\n`;
const yaml = stringify(metod, { lineWidth: 0, defaultStringType: 'PLAIN', defaultKeyType: 'PLAIN' });
const ut = join(rot, 'src/content/stodundervisning', `${id}.yaml`);
writeFileSync(ut, huvud + yaml);
console.log(`Skrev ${ut} (${yaml.length} tecken). Kör npm run validera.`);
