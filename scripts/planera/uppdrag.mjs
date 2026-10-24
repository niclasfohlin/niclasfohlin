#!/usr/bin/env node
// Ett uppdrag till en agent ur en mall i scripts/planera/ (PLANERA.md under Agenterna och uppdragen). Fyller {{verktyget}} med
// verktygets del (verktyget.md), {{skript}} med läsarens webbläsare (scripts/lasare.mjs) och varje annat {{namn}} med värdet
// som ges, och stannar när något står kvar utan värde, så att en agent aldrig får ett uppdrag med en lucka.
//
//   node scripts/planera/uppdrag.mjs <mall> <ut.md> namn=värde …     ett värde som börjar med @ läses ur den filen
//
// Inga beroenden.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mapp = dirname(fileURLToPath(import.meta.url));
const [mall, ut, ...par] = process.argv.slice(2);
if (!mall || !ut) { console.error('Så här: node scripts/planera/uppdrag.mjs <mall> <ut.md> namn=värde …'); process.exit(1); }
const fil = join(mapp, mall.endsWith('.md') ? mall : `${mall}.md`);
if (!existsSync(fil)) { console.error(`uppdrag: mallen ${fil} finns inte.`); process.exit(1); }
const varden = Object.fromEntries(par.map((p) => {
  const i = p.indexOf('=');
  const v = p.slice(i + 1);
  return [p.slice(0, i), v.startsWith('@') ? readFileSync(v.slice(1), 'utf8').trim() : v];
}));
varden.skript ??= resolve(mapp, '..', 'lasare.mjs').replace(/\\/g, '/');
const text = readFileSync(fil, 'utf8')
  .replace('{{verktyget}}', readFileSync(join(mapp, 'verktyget.md'), 'utf8').trim())
  .replace(/\{\{(\w+)\}\}/g, (hel, namn) => varden[namn] ?? hel);
const kvar = [...new Set(text.match(/\{\{\w+\}\}/g) ?? [])];
if (kvar.length) { console.error(`uppdrag: ${kvar.join(', ')} saknar värde.`); process.exit(1); }
mkdirSync(dirname(resolve(ut)), { recursive: true });
writeFileSync(ut, text);
console.log(`Uppdraget ligger i ${ut}.`);
