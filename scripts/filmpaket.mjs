#!/usr/bin/env node
// Tar emot metodriggens filmpaket (Niclas 2026-09-30: varje metod har en huvudfilm och högst två extrafilmer; METODER.md
// under Filmerna). Paketet har filerna i public/stodundervisning/ och blocken i film-falt.yaml, ett avsnitt per metod
// som börjar med en rad "# <id>". Skriptet prövar att varje film har sina fem filer, kopierar dem till sajtens
// public/stodundervisning/, byter blocken film och filmer sist i metodens fil mot paketets, och stryker metoden ur
// VANTAR_PA_FILM i src/lib/film.ts när den har fått sin huvudfilm. Inget annat ur riggen tas in.
//
// Rätt direkt, inte efter (Niclas 2026-09-30: få uppladdningar): allt prövas innan något skrivs. Fälten prövas med
// schemats regler (src/content.config.ts), platsen mot metodens fil (platsFel i src/lib/film.ts) och filerna mot paketet.
// En huvudfilm med riggens äldre efterStycke eller efter får fältet borttaget, med ett besked, eftersom huvudfilmen alltid
// står efter faktarutan. En metod som redan har film på sajten lämnas orörd om paketets block är detsamma, och skrivs
// bara över med --ersatt, så att sajtens rättningar i en film inte försvinner av misstag; med --ersatt visas vad
// som ändras, fält för fält. Varje svg-fil prövas: den ska stå för sig själv (en film som <img> hämtar inga typsnitt,
// bilder eller stilar utifrån), ha filmens eller stillbildens mått och inget skript. Filer i paketet som inte är filmer
// (ett typsnitt, metodtexter) räknas upp: skriptet tar inte in dem, och LAS-MIG.md säger vad de är till för.
//
//   node scripts/filmpaket.mjs <paketets mapp> [<id> …]   ta in hela paketet, eller bara de angivna metoderna
//   node scripts/filmpaket.mjs <paketets mapp> --prova    pröva paketet utan att ändra något
//   node scripts/filmpaket.mjs <paketets mapp> --ersatt   ersätt också filmer som redan finns och skiljer sig
//
// Sedan det skriptet skriver ut: npm run validera, filmplats.mjs, metodprov med --bilder och en titt på varje film.
import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const [paket, ...rest] = process.argv.slice(2);
const prova = rest.includes('--prova');
const ersatt = rest.includes('--ersatt');
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
const noter = [];
const { tolkaEfter, platsFel, HOGST_EXTRAFILMER } = await import('../src/lib/film.ts');
// Schemats regler för en film (filmFalt i src/content.config.ts), så att --prova säger det som bygget annars säger efteråt.
const FALT = ['titel', 'sekunder', 'beskrivning', 'rubrik', 'ingress', 'stillbilder'];
const text = (x) => typeof x === 'string' && x.trim().length > 0;
function filmFel(f, namn, extra) {
  const ut = [];
  const tillatna = extra ? [...FALT, 'nr', 'efter'] : FALT;
  const okanda = Object.keys(f ?? {}).filter((k) => !tillatna.includes(k));
  if (okanda.length) ut.push(`${namn} har fälten ${okanda.join(', ')}, som schemat inte tar`);
  if (!(typeof f?.sekunder === 'number' && f.sekunder > 0)) ut.push(`${namn}: sekunder ska vara ett tal`);
  for (const k of ['beskrivning', 'rubrik', 'ingress']) if (!text(f?.[k])) ut.push(`${namn}: ${k} saknas`);
  if (f?.titel !== undefined && !text(f.titel)) ut.push(`${namn}: titel är tom`);
  if (!Array.isArray(f?.stillbilder) || f.stillbilder.length !== 4) ut.push(`${namn}: fyra stillbilder`);
  else f.stillbilder.forEach((b, i) => { if (!text(b?.text)) ut.push(`${namn}: stillbild ${i + 1} saknar text`); else if (b.text.trim().length > 55) ut.push(`${namn}: stillbild ${i + 1} har ${b.text.trim().length} tecken, högst 55`); });
  if (extra && ![2, 3].includes(f?.nr)) ut.push(`${namn}: nr är 2 eller 3`);
  return ut;
}
// Riggens äldre fält för huvudfilmens plats tas bort ur blocket: raderna direkt under film: med två blankstegs indrag.
function utanPlats(blocktext) {
  const ut = [];
  let iFilm = false;
  for (const rad of blocktext.split('\n')) {
    if (/^film:/.test(rad)) iFilm = true;
    else if (/^\S/.test(rad)) iFilm = false;
    if (iFilm && /^ {2}(efterStycke|efter):/.test(rad)) continue;
    ut.push(rad);
  }
  return ut.join('\n');
}
// En svg som visas som <img> laddar inga externa resurser: allt ska finnas i filen (data:-adresser eller #id).
const FILMMATT = { film: '0 0 960 540', stillbild: '0 0 960 500' };
function svgFel(fil, slag) {
  const svg = readFileSync(fil, 'utf8');
  const namn = fil.split(/[\\/]/).pop();
  const ut = [];
  if (!/<svg[\s>]/.test(svg) || !/<\/svg>\s*$/.test(svg)) ut.push(`${namn} är ingen hel svg-fil`);
  const viewBox = svg.match(/<svg[^>]*\sviewBox="([^"]+)"/)?.[1]?.trim().replace(/\s+/g, ' ');
  if (viewBox !== FILMMATT[slag]) ut.push(`${namn} har viewBox "${viewBox ?? 'saknas'}", ${slag}en ska ha "${FILMMATT[slag]}"`);
  if (/<script[\s>]/i.test(svg)) ut.push(`${namn} har ett skript`);
  const externa = [
    ...[...svg.matchAll(/url\(\s*['"]?([^'")\s]+)/g)].map((m) => m[1]),
    ...[...svg.matchAll(/(?:xlink:)?href="([^"]+)"/g)].map((m) => m[1]),
    ...[...svg.matchAll(/@import\s+(?:url\()?['"]?([^'");\s]+)/g)].map((m) => m[1]),
  ].filter((a) => !a.startsWith('data:') && !a.startsWith('#'));
  if (externa.length) ut.push(`${namn} hämtar ${[...new Set(externa)].slice(0, 3).join(', ')} utifrån, vilket en film som <img> inte kan: bädda in det i filen`);
  return ut;
}
// Vad som skiljer två filmblock, fält för fält, för den som ska läsa riggens ändringar innan de tas in.
function skillnader(fore, efter, sti = '') {
  if (JSON.stringify(fore) === JSON.stringify(efter)) return [];
  if (fore && efter && typeof fore === 'object' && typeof efter === 'object') {
    const nycklar = [...new Set([...Object.keys(fore), ...Object.keys(efter)])];
    return nycklar.flatMap((k) => skillnader(fore[k], efter[k], sti ? `${sti}.${k}` : k));
  }
  const visa = (x) => (x === undefined ? '(finns inte)' : typeof x === 'string' ? `”${x}”` : JSON.stringify(x));
  return [`${sti}: ${visa(fore)} → ${visa(efter)}`];
}
const sorterad = (x) => JSON.stringify(x, (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]])) : v));
for (const [id, rader] of avsnitt) {
  if ((valda.length && !valda.includes(id)) || !kanda.has(id)) continue;
  let blocktext = rader.join('\n').trim();
  const forsta = parseYaml(blocktext) ?? {};
  if (forsta.film && ('efterStycke' in forsta.film || 'efter' in forsta.film)) {
    blocktext = utanPlats(blocktext);
    noter.push(`${id}: huvudfilmens efterStycke eller efter är borttaget; huvudfilmen står alltid efter faktarutan.`);
  }
  const data = parseYaml(blocktext) ?? {};
  const okanda = Object.keys(data).filter((k) => k !== 'film' && k !== 'filmer');
  if (okanda.length) { fel.push(`${id}: paketet har fälten ${okanda.join(', ')}; bara film och filmer tas in.`); continue; }
  if (!data.film) { fel.push(`${id}: avsnittet saknar huvudfilmen (film).`); continue; }
  const filmer = data.filmer ?? [];
  const faltfel = [...filmFel(data.film, 'huvudfilmen', false), ...filmer.flatMap((f, i) => filmFel(f, `extrafilm ${f?.nr ?? i + 2}`, true))];
  if (filmer.length > HOGST_EXTRAFILMER) faltfel.push(`${filmer.length} extrafilmer, högst ${HOGST_EXTRAFILMER}`);
  if (new Set(filmer.map((f) => f.nr)).size !== filmer.length) faltfel.push('två extrafilmer har samma nr');
  const nycklar = [data.film, ...filmer].map((f) => `${f?.rubrik}\n${f?.ingress}`);
  if (new Set(nycklar).size !== nycklar.length) faltfel.push('två filmer har samma rubrik och ingress');
  if (faltfel.length) { fel.push(`${id}: ${faltfel.join('; ')}.`); continue; }
  // Platsen prövas med schemats regler mot metodens fil.
  const metod = parseYaml(readFileSync(join(metodMapp, `${id}.yaml`), 'utf8'));
  const platsfel = filmer.map((f) => { const v = tolkaEfter(String(f.efter ?? '')); return v ? platsFel(metod, v) : `efter "${f.efter}" är ingen plats`; }).filter(Boolean);
  if (platsfel.length) { fel.push(`${id}: ${platsfel.join('; ')}.`); continue; }
  const nummer = ['', ...filmer.map((f) => String(f.nr))];
  const filer = nummer.flatMap((n) => ['', '-1', '-2', '-3', '-4'].map((s) => `${id}-film${n}${s}.svg`));
  const saknas = filer.filter((f) => !existsSync(join(paket, 'public/stodundervisning', f)));
  if (saknas.length) { fel.push(`${id}: filerna ${saknas.join(', ')} saknas i paketet.`); continue; }
  const svgfel = filer.flatMap((f) => svgFel(join(paket, 'public/stodundervisning', f), /-\d\.svg$/.test(f) ? 'stillbild' : 'film'));
  if (svgfel.length) { fel.push(`${id}: ${svgfel.join('; ')}.`); continue; }
  // En metod som redan har film: orörd när blocket är detsamma, och ersatt bara med --ersatt.
  if (metod.film) {
    const lika = sorterad({ film: metod.film, filmer: metod.filmer ?? [] }) === sorterad({ film: data.film, filmer });
    if (lika) { noter.push(`${id}: filmerna är desamma som på sajten; blocket lämnas orört (filerna kopieras ändå).`); }
    else if (!ersatt) { fel.push(`${id}: metoden har redan film på sajten, och paketets block skiljer sig. Jämför och kör med --ersatt om paketets ska gälla; sajtens rättningar i filmen går då förlorade.`); continue; }
    else noter.push(`${id}: filmerna ersätts med paketets (--ersatt):\n       ${skillnader({ film: metod.film, filmer: metod.filmer ?? [] }, { film: data.film, filmer }).join('\n       ')}`);
    klara.push({ id, text: blocktext, filer, antal: nummer.length, orord: lika });
    continue;
  }
  klara.push({ id, text: blocktext, filer, antal: nummer.length, orord: false });
}
for (const id of valda) if (!avsnitt.has(id)) fel.push(`${id}: finns inte i paketets film-falt.yaml.`);
// Allt annat i paketet räknas upp, så att inget missas: skriptet tar bara in filmerna.
const filmfil = /^[a-z0-9-]+-film\d?(-\d)?\.svg$/;
function allaFiler(mapp, bas = '') {
  return readdirSync(join(mapp, bas), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? allaFiler(mapp, join(bas, e.name)) : [join(bas, e.name).replace(/\\/g, '/')]));
}
const ovriga = allaFiler(paket).filter((f) => !['film-falt.yaml', 'LAS-MIG.md', 'index.html'].includes(f) && !(f.startsWith('public/stodundervisning/') && filmfil.test(f.split('/').pop())));
if (ovriga.length) noter.push(`paketet har också ${ovriga.join(', ')}. Skriptet tar inte in dem; läs LAS-MIG.md för vad de är till för, och ta in dem för sig (en metodtext med scripts/metoddiff.mjs).`);
for (const n of noter) console.log(`obs  ${n}`);
if (fel.length) { console.error(`filmpaket: ${fel.length} fel, inget är ändrat:\n  ${fel.join('\n  ')}`); process.exit(1); }
if (prova) { for (const k of klara) console.log(`ok   ${k.id}: ${k.antal} ${k.antal === 1 ? 'film' : 'filmer'}, ${k.filer.length} filer`); process.exit(0); }

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
  if (!k.orord) writeFileSync(fil, `${utanFilmer(readFileSync(fil, 'utf8'))}${k.text}\n`);
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
const ids = klara.map((k) => k.id);
console.log(`\nNästa steg, i ordning, innan något laddas upp (METODER.md under Filmerna):
  1. npm run validera
  2. node scripts/filmplats.mjs --utan-bygge ${ids.join(' ')}
  3. för varje metod: node scripts/metodprov.mjs <id> --bilder   (${ids.join(', ')})
  4. titta på varje film där den står, på sidan, i utskriften och i Word, och läs filmernas texter som svenska
  5. granskning, sedan en commit och en push med allt`);
