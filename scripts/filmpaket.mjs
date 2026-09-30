#!/usr/bin/env node
// Tar emot metodriggens filmpaket (Niclas 2026-09-30: varje metod har en huvudfilm och högst två extrafilmer; METODER.md
// under Filmerna). Paketet har filerna i public/stodundervisning/ och blocken i film-falt.yaml, ett avsnitt per metod
// som börjar med en rad "# <id>". Skriptet prövar att varje film har sina fem filer, kopierar dem till sajtens
// public/stodundervisning/, byter blocken film och filmer sist i metodens fil mot paketets, och stryker metoden ur
// VANTAR_PA_FILM i src/lib/film.ts när den har fått sin huvudfilm. Inget annat ur riggen tas in.
//
//   node scripts/filmpaket.mjs <paketets mapp> [<id> …]   ta in hela paketet, eller bara de angivna metoderna
//   node scripts/filmpaket.mjs <paketets mapp> --prova    pröva paketet utan att ändra något
//
// Sedan: npm run validera, node scripts/filmplats.mjs och metodprov med --bilder för varje metod (METODER.md).
import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const [paket, ...rest] = process.argv.slice(2);
const prova = rest.includes('--prova');
const valda = rest.filter((a) => !a.startsWith('--'));
if (!paket || !existsSync(join(paket, 'film-falt.yaml'))) {
  console.error('Användning: node scripts/filmpaket.mjs <paketets mapp> [<id> …] [--prova]. Mappen ska ha film-falt.yaml och public/stodundervisning/.');
  process.exit(1);
}
const metodMapp = join(rot, 'src/content/stodundervisning');
const kanda = new Set(readdirSync(metodMapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => f.slice(0, -5)));

// Avsnitten i film-falt.yaml: varje rad "# <id>" börjar ett avsnitt, som slutar vid nästa. En metod som sajten inte har
// stannar: metodens fil kommer först (/ny-metod), filmerna sedan.
const avsnitt = new Map();
const fel = [];
let aktuell = null;
for (const rad of readFileSync(join(paket, 'film-falt.yaml'), 'utf8').replace(/\r\n/g, '\n').split('\n')) {
  const m = rad.match(/^#\s+([a-z0-9-]+)\s*$/);
  if (m) { aktuell = m[1]; avsnitt.set(aktuell, []); if (!kanda.has(aktuell) && (!valda.length || valda.includes(aktuell))) fel.push(`${aktuell}: metoden finns inte i src/content/stodundervisning; kopiera metodens fil först, sedan filmerna.`); continue; }
  if (aktuell) avsnitt.get(aktuell).push(rad);
}
const klara = [];
const { tolkaEfter, platsFel } = await import('../src/lib/film.ts');
for (const [id, rader] of avsnitt) {
  if ((valda.length && !valda.includes(id)) || !kanda.has(id)) continue;
  const text = rader.join('\n').trim();
  const data = parseYaml(text) ?? {};
  const okanda = Object.keys(data).filter((k) => k !== 'film' && k !== 'filmer');
  if (okanda.length) { fel.push(`${id}: paketet har fälten ${okanda.join(', ')}; bara film och filmer tas in.`); continue; }
  if (!data.film) { fel.push(`${id}: avsnittet saknar huvudfilmen (film).`); continue; }
  if ('efterStycke' in data.film || 'efter' in data.film) { fel.push(`${id}: huvudfilmen har efterStycke eller efter; den står alltid efter faktarutan, så fältet ska bort.`); continue; }
  // Platsen prövas med schemats regler mot metodens fil, så att --prova säger det som bygget annars säger efteråt.
  const metod = parseYaml(readFileSync(join(metodMapp, `${id}.yaml`), 'utf8'));
  const platsfel = (data.filmer ?? []).map((f) => { const v = tolkaEfter(String(f.efter ?? '')); return v ? platsFel(metod, v) : `efter "${f.efter}" är ingen plats`; }).filter(Boolean);
  if (platsfel.length) { fel.push(`${id}: ${platsfel.join('; ')}.`); continue; }
  const nummer = ['', ...(data.filmer ?? []).map((f) => String(f.nr))];
  const filer = nummer.flatMap((n) => ['', '-1', '-2', '-3', '-4'].map((s) => `${id}-film${n}${s}.svg`));
  const saknas = filer.filter((f) => !existsSync(join(paket, 'public/stodundervisning', f)));
  if (saknas.length) { fel.push(`${id}: filerna ${saknas.join(', ')} saknas i paketet.`); continue; }
  klara.push({ id, text, filer, antal: nummer.length });
}
for (const id of valda) if (!avsnitt.has(id)) fel.push(`${id}: finns inte i paketets film-falt.yaml.`);
if (fel.length) { console.error(`filmpaket: ${fel.length} fel, inget är ändrat:\n  ${fel.join('\n  ')}`); process.exit(1); }
if (prova) { for (const k of klara) console.log(`ok  ${k.id}: ${k.antal} ${k.antal === 1 ? 'film' : 'filmer'}, ${k.filer.length} filer`); process.exit(0); }

// Blocken film och filmer står sist i metodens fil; de gamla tas bort och paketets läggs dit.
const utanFilmer = (yaml) => {
  const rader = yaml.replace(/\r\n/g, '\n').split('\n');
  const ut = [];
  let hoppar = false;
  for (const rad of rader) {
    if (/^(film|filmer):/.test(rad)) { hoppar = true; continue; }
    // Blocket slutar vid nästa rad i kolumn 0, också en kommentar; ett streck i kolumn 0 är en rad i listan filmer.
    if (hoppar && /^[^\s-]/.test(rad)) hoppar = false;
    if (!hoppar) ut.push(rad);
  }
  // En rad till sist, också när filmblocket följde direkt på den sista raden före.
  return ut.join('\n').replace(/\n*$/, '\n');
};
for (const k of klara) {
  for (const f of k.filer) copyFileSync(join(paket, 'public/stodundervisning', f), join(rot, 'public/stodundervisning', f));
  const fil = join(metodMapp, `${k.id}.yaml`);
  writeFileSync(fil, `${utanFilmer(readFileSync(fil, 'utf8'))}${k.text}\n`);
  console.log(`${k.id}: ${k.antal} ${k.antal === 1 ? 'film' : 'filmer'} och ${k.filer.length} filer intagna.`);
}
// Metoderna som nu har sin huvudfilm stryks ur VANTAR_PA_FILM, så att bygget kräver filmen av dem också.
const filmTs = join(rot, 'src/lib/film.ts');
const ts = readFileSync(filmTs, 'utf8');
const lista = ts.match(/export const VANTAR_PA_FILM: readonly string\[\] = \[([\s\S]*?)\];/);
if (lista) {
  const kvar = [...lista[1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]).filter((id) => !klara.some((k) => k.id === id));
  const rader = [];
  for (let i = 0; i < kvar.length; i += 5) rader.push(`  ${kvar.slice(i, i + 5).map((x) => `'${x}'`).join(', ')},`);
  writeFileSync(filmTs, ts.replace(lista[0], `export const VANTAR_PA_FILM: readonly string[] = [${kvar.length ? `\n${rader.join('\n')}\n` : ''}];`));
  console.log(kvar.length ? `Väntar fortfarande på film: ${kvar.join(', ')}.` : 'Alla metoder har sin huvudfilm; VANTAR_PA_FILM är tom.');
}
// Filmfiler som ingen film i metoden använder längre (en extrafilm som bytt nummer eller tagits bort).
const anvanda = new Set(klara.flatMap((k) => k.filer));
const overblivna = readdirSync(join(rot, 'public/stodundervisning')).filter((f) => klara.some((k) => f.startsWith(`${k.id}-film`) && f.endsWith('.svg')) && !anvanda.has(f));
if (overblivna.length) console.log(`Överblivna filmfiler, ta bort dem om de inte används: ${overblivna.join(', ')}`);
console.log('Nästa steg: npm run validera, node scripts/filmplats.mjs och metodprov med --bilder för varje metod.');
