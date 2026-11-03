#!/usr/bin/env node
// Intaget av strategierna ur metodriggen (K-699): leveransen i C:/metodrigg/out/strategier/leverans/ (sajtens förslag till
// riggen 2026-11-03), med en json per strategi i fälten ur sajtens svar (out/strategier/FRAN-SAJTEN.md), berättelsens tre
// bilder som <id>-1.svg till <id>-3.svg, ikonerna i ikoner/ och Fluent Emojis licens. Varje strategi prövas med standardens
// strategiensFel innan något skrivs, och en leverans med fel tas inte in. Riggen skriver och ritar; sajten ändrar aldrig
// en strategis text själv, utan ber riggen leverera igen.
//
//   node scripts/strategier/intag.mjs                 ta in leveransen
//   node scripts/strategier/intag.mjs --kontrollera   pröva bara, utan att skriva något
//   node scripts/strategier/intag.mjs <id> [<id>…]    bara de angivna
//
// Det som tas in: json-filen till src/content/strategier/<id>.json, utan riggens egna fält (_om, karna, metoder, farg och
// svg, som sajten läser ur metodernas fält strategikort och ur sin egen form), bilderna till public/strategier/bilder/ och
// de ikoner som korten och sidan använder till public/strategier/ikoner/ med licensen. Sedan gör npm run validera korten.
import { readFileSync, writeFileSync, readdirSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strategiensFel } from '../../src/lib/standard/strategier.js';

const ROT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RIGG = process.env.METODRIGG ?? 'C:/metodrigg';
const KALLA = join(RIGG, 'out', 'strategier', 'leverans');
const UT = { strategier: join(ROT, 'src', 'content', 'strategier'), bilder: join(ROT, 'public', 'strategier', 'bilder'), ikoner: join(ROT, 'public', 'strategier', 'ikoner') };
const args = process.argv.slice(2);
const kontrollera = args.includes('--kontrollera');
const valda = args.filter((a) => !a.startsWith('--'));

if (!existsSync(KALLA)) { console.log(`Ingen leverans i ${KALLA}.`); process.exit(0); }
const RIGGENS_FALT = ['_om', 'karna', 'metoder', 'farg', 'ikonerna'];
const filer = readdirSync(KALLA).filter((f) => f.endsWith('.json') && !f.startsWith('_') && f !== 'bladet.json').filter((f) => !valda.length || valda.includes(f.replace(/\.json$/, '')));
const fel = [];
const intag = [];
for (const f of filer) {
  const id = f.replace(/\.json$/, '');
  const s = JSON.parse(readFileSync(join(KALLA, f), 'utf8'));
  if (s.id !== undefined && s.id !== id) fel.push(`${f}: id ${s.id} är inte filens namn`);
  for (const k of RIGGENS_FALT) delete s[k];
  delete s.id;
  delete s.framsida?.svg; delete s.framsida?.alt; delete s.baksida?.svg;
  // Berättelsens bilder heter efter strategin och sin plats, och står i leveransen bredvid json-filen.
  (s.framsida?.bild?.steg ?? []).forEach((b, i) => { b.fil ??= `${id}-${i + 1}.svg`; if (!existsSync(join(KALLA, b.fil))) fel.push(`${s.namn ?? id}: bilden ${b.fil} saknas i leveransen`); });
  const ikoner = new Set([...(s.framsida?.handling ?? []).map((h) => h.ikon), ...['vad', 'darfor'].map((k) => s.baksida?.[k]?.ikon)].filter(Boolean));
  for (const ikon of ikoner) if (!existsSync(join(KALLA, 'ikoner', `${ikon}.svg`)) && !existsSync(join(UT.ikoner, `${ikon}.svg`))) fel.push(`${s.namn ?? id}: ikonen ${ikon}.svg saknas i leveransens ikoner/ och på sajten`);
  for (const e of strategiensFel({ ...s, id })) fel.push(e);
  intag.push({ id, s, ikoner });
}
if (!existsSync(join(KALLA, 'LICENSE-fluent-emoji.txt')) && !existsSync(join(UT.ikoner, 'LICENSE.txt'))) fel.push('Fluent Emojis licens saknas: LICENSE-fluent-emoji.txt i leveransen');
const nr = intag.map((x) => x.s.nr);
if (new Set(nr).size !== nr.length) fel.push(`Två strategier har samma nummer: ${nr.filter((n, i) => nr.indexOf(n) !== i).join(', ')}`);
if (fel.length) { console.error(`Leveransen tas inte in, ${fel.length} fel (be riggen leverera igen):\n  ${fel.join('\n  ')}`); process.exit(1); }
if (kontrollera) { console.log(`Leveransen håller: ${intag.length} strategier, ${intag.map((x) => x.s.namn).join(', ')}.`); process.exit(0); }

for (const d of Object.values(UT)) mkdirSync(d, { recursive: true });
for (const { id, s, ikoner } of intag) {
  writeFileSync(join(UT.strategier, `${id}.json`), JSON.stringify(s, null, 2) + '\n');
  for (const b of s.framsida.bild.steg) copyFileSync(join(KALLA, b.fil), join(UT.bilder, b.fil));
  for (const ikon of ikoner) if (existsSync(join(KALLA, 'ikoner', `${ikon}.svg`))) copyFileSync(join(KALLA, 'ikoner', `${ikon}.svg`), join(UT.ikoner, `${ikon}.svg`));
}
if (existsSync(join(KALLA, 'LICENSE-fluent-emoji.txt'))) copyFileSync(join(KALLA, 'LICENSE-fluent-emoji.txt'), join(UT.ikoner, 'LICENSE.txt'));
// Meningen till mitten av bladet med alla strategier, riggens ur metodens text (bladet.json: { mitten }).
if (existsSync(join(KALLA, 'bladet.json'))) {
  const { mitten } = JSON.parse(readFileSync(join(KALLA, 'bladet.json'), 'utf8'));
  if (typeof mitten === 'string' && mitten.trim()) writeFileSync(join(ROT, 'src', 'data', 'strategier-bladet.json'), JSON.stringify({ mitten: mitten.trim() }, null, 2) + '\n');
}
console.log(`Intaget: ${intag.length} strategier, ${intag.map((x) => `${x.s.nr} ${x.s.namn}`).join(', ')}. Kör npm run validera, som gör korten.`);
