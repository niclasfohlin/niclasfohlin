#!/usr/bin/env node
// Standardprovet (src/lib/standard/REGLER.md): standarden för databaser och mallar ska kunna flyttas till en modul som
// sajten och metodriggen delar, som wordparitet. Provet stoppar därför en import av astro:, node:, sajtens data eller
// kod utanför mappen, och prövar att funktionerna svarar som de ska. Körs i npm run validera.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mapp = join(rot, 'src', 'lib', 'standard');
const fel = [];

for (const f of readdirSync(mapp).filter((x) => /\.(js|d\.ts)$/.test(x))) {
  const text = readFileSync(join(mapp, f), 'utf8');
  for (const [, kalla] of text.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (!kalla) continue;
    if (/^(astro:|node:)/.test(kalla)) fel.push(`${f}: importerar ${kalla}; standarden ska gå att köra utan Astro och Node`);
    else if (kalla.startsWith('../') || /\/data\/|\.json$/.test(kalla)) fel.push(`${f}: importerar ${kalla}; det sajten vet ges som argument, och koden utanför mappen hör inte till standarden`);
    else if (!kalla.startsWith('./')) fel.push(`${f}: importerar paketet ${kalla}; ett beroende i standarden beslutas och skrivs i REGLER.md först`);
  }
}

const { slugAv, UPPTAGNA_LED } = await import(pathToFileURL(join(mapp, 'index.js')).href);
const fall = [
  ['Två lösningar', 'tva-losningar'], ['Lärarens sida', 'lararens-sida'], ['Bas', 'bas'], ['Problem och lösning', 'problem-och-losning'],
  ['Café Über', 'cafe-uber'], ['  –Äpple, år 3–  ', 'apple-ar-3'], ['Venndiagrammet', 'venndiagrammet'], ['Ö', 'o'],
];
for (const [in_, ut] of fall) if (slugAv(in_) !== ut) fel.push(`slugAv("${in_}") ger "${slugAv(in_)}", inte "${ut}"`);
for (const led of ['lathund', 'skrivkort', 'aktiviteter', 'brainbreaks', 'problem', 'texter', 'faktatexter']) if (!UPPTAGNA_LED.includes(led)) fel.push(`UPPTAGNA_LED saknar ${led}`);
if (UPPTAGNA_LED.some((l) => slugAv(l) !== l)) fel.push('UPPTAGNA_LED har ett led som inte är skrivet som en adress');

if (fel.length) { console.error(`standardprov: ${fel.length} fel i src/lib/standard/:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`standardprov: standarden (src/lib/standard/) importerar inget utanför sig själv, och slugAv och UPPTAGNA_LED svarar rätt i ${fall.length} fall.`);
