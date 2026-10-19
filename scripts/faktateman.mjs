#!/usr/bin/env node
// Intaget av databasens faktatexter (K-435) ur en leverans från metodriggen: ett tema per fil i riggens
// out/<slug>/databas/<tema>.yaml, i den form som riggens FRAN-SAJTEN beskriver (Nytt 2026-10-19: formen för databasens
// faktatexter), och temanas bilder i databas/pabordet.json. Skriptet lägger temafilerna i src/content/faktateman/ som de
// är, och temanas bilder med deras mått och skrivytor genom scripts/pabordetdata.mjs --databas. Metodens fil rörs inte.
// Ett tema som redan finns skrivs över, och ett tema på sajten som leveransen inte har står kvar och nämns. Schemat
// (faktateman i src/content.config.ts) och bygget prövar sedan filerna, och npm run validera gör deras Word-filer och
// pdf:er. Formen och vad som följer med står i METODER.md under Ta fram ur en bank, raden Databasens faktatexter.
//
//   node scripts/faktateman.mjs <riggens out/<slug>>            tar in temana och bilderna
//   node scripts/faktateman.mjs <riggens out/<slug>> --prova    säger bara vad som skulle göras
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';
import { medTemana } from '../src/lib/faktatemaihop.js';

const args = process.argv.slice(2);
const mapp = args.find((a) => !a.startsWith('--'));
const prova = args.includes('--prova');
const databas = mapp ? join(mapp, 'databas') : '';
if (!mapp || !existsSync(databas)) {
  console.error('Ange riggens mapp med databas/: node scripts/faktateman.mjs C:/metodrigg/out/<slug> [--prova]');
  process.exit(1);
}
const MAL = 'src/content/faktateman';
const filer = readdirSync(databas).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'));
if (!filer.length) { console.error(`faktateman: ${databas} har inga temafiler (<tema>.yaml).`); process.exit(1); }

const fel = [];
const teman = filer.map((f) => {
  const text = readFileSync(join(databas, f), 'utf8');
  const d = parseYaml(text);
  const id = f.slice(0, -5);
  if (!d?.metod || !d?.tema || !d?.niva) fel.push(`${f}: saknar metod, tema eller niva`);
  else if (!existsSync(join('src/content/stodundervisning', `${d.metod}.yaml`))) fel.push(`${f}: metoden ${d.metod} finns inte i src/content/stodundervisning/`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) fel.push(`${f}: filens namn ska vara temats namn som adress, med a–z, 0–9 och bindestreck`);
  return { f, id, d, text };
});
// Varje bild som ett tema har ska ha sin fil och sina mått i databas/pabordet.json, och tvärtom.
const bilder = existsSync(join(databas, 'pabordet.json')) ? JSON.parse(readFileSync(join(databas, 'pabordet.json'), 'utf8')) : { bilder: [] };
const iListan = new Set(bilder.bilder.map((b) => b.nr));
const iTemana = new Set(teman.flatMap((t) => (t.d?.pabordet ?? []).map((b) => b.nr)));
for (const nr of iTemana) if (!iListan.has(nr)) fel.push(`bild ${nr}: står i ett tema men inte i databas/pabordet.json`);
for (const nr of iListan) if (!iTemana.has(nr)) fel.push(`bild ${nr}: står i databas/pabordet.json men inte i något tema`);
// Leveransen med metoden och temana som redan ligger på sajten, som bygget lägger ihop dem (src/lib/faktatemaihop.js):
// en ram eller en bild som metoden eller ett annat tema redan har stoppar intaget innan något kopieras, så att ingen bild
// skrivs över.
const paSajten = existsSync(MAL) ? readdirSync(MAL).filter((f) => f.endsWith('.yaml') && !f.startsWith('_') && !filer.includes(f)).map((f) => ({ id: f.slice(0, -5), data: parseYaml(readFileSync(join(MAL, f), 'utf8')) })) : [];
if (!fel.length) for (const metod of new Set(teman.map((t) => t.d.metod))) {
  try {
    medTemana(parseYaml(readFileSync(join('src/content/stodundervisning', `${metod}.yaml`), 'utf8')), [...paSajten.filter((t) => t.data?.metod === metod), ...teman.filter((t) => t.d.metod === metod).map((t) => ({ id: t.id, data: t.d }))]);
  } catch (e) { fel.push(e.message); }
}
if (fel.length) { console.error(`faktateman: leveransen tas inte in:\n  ${fel.join('\n  ')}`); process.exit(1); }

if (!prova) mkdirSync(MAL, { recursive: true });
for (const t of teman) {
  const dit = join(MAL, t.f);
  const forut = existsSync(dit) ? readFileSync(dit, 'utf8') : undefined;
  const lage = forut === undefined ? 'nytt' : forut.replace(/\r\n/g, '\n') === t.text.replace(/\r\n/g, '\n') ? 'samma' : 'ändrat';
  if (!prova && lage !== 'samma') copyFileSync(join(databas, t.f), dit);
  console.log(`${prova ? 'prov ' : 'ok   '}${t.d.tema} (${t.d.niva}, ${t.d.metod}): ${lage}, ${t.d.ramar?.length ?? 0} ramar, ${t.d.pabordet?.length ?? 0} bilder`);
}
const metoder = new Set(teman.map((t) => t.d.metod));
const kvar = paSajten.filter((t) => metoder.has(t.data?.metod)).map((t) => `${t.id}.yaml`);
if (kvar.length) console.log(`obs  på sajten men inte i leveransen, står kvar: ${kvar.join(', ')}`);
if (iListan.size) {
  const r = spawnSync(process.execPath, ['scripts/pabordetdata.mjs', mapp, '--databas', ...(prova ? ['--prova'] : [])], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
if (!prova) console.log('Nästa steg: npm run validera, som prövar temana i schemat och gör deras Word-filer, pdf:er och sidlås.');
