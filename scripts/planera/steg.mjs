#!/usr/bin/env node
// Stegen i PLANERA.md för det som ska upp, så att inget steg glöms bort (Niclas 2026-10-27: "Du kanske kan fixa så du inte
// glömmer planera.md och olika stegen i framtiden?", efter att steg 3, 4, 7, 8 och 8b hade fallit bort i en kompaktering).
//
// Skriptet läser vad som skiljer grenen från main på GitHub: varje metod vars fil har ändrats och vars plan syns (plan utan
// vantar), och modulen när dess kod har ändrats. För dem räknar det fram stegen som PLANERA.md kräver, under Tre slags
// arbete och Stegen, och jämför med liggaren, där varje gjort steg står med sitt svar. Liggaren gäller en omgång: den
// räknas från main på GitHub, och en push av main börjar en ny.
//
//   node scripts/planera/steg.mjs visa [--kort]                stegen som krävs och läget, för omgången
//   node scripts/planera/steg.mjs gjort <id|modulen> <steg> <svar>    ett steg gjort, med filen eller brevet med svaret
//   node scripts/planera/steg.mjs gjort <id|modulen> <steg> --skal "<varför steget inte behövs i omgången>"
//   node scripts/planera/steg.mjs prov [--till main]           stannar (exit 1) när ett steg saknas; kroken kör det vid
//                                                              en push av main (.claude/hooks/skydda-main.mjs)
//
// Liggaren ligger i underlag/prov/planera-steg.json, som git inte ser, som kön i KO.md. Inga beroenden utöver yaml.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LIGGARE = join(rot, 'underlag', 'prov', 'planera-steg.json');
const git = (...a) => execFileSync('git', a, { cwd: rot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

// Stegen ur PLANERA.md: en metod som får planen, och modulen när den ändras och läraren för in något i den. Steg 2
// (valideringen) och 12 (Google och uppladdningen) prövas av valideringen och kroken själva.
const STEGEN = {
  '1': 'Metodens pass mot målet (passgenomgången)',
  '3': 'Läs själv i telefonbredd',
  '4': 'Länkgranskningen',
  '4b': 'Rimligheten',
  '6': 'Kalla testare',
  '7': 'Användbarheten',
  '8': 'Buggjakten',
  '8b': 'Samma sak överallt',
  '9': 'Codex',
  '11': 'Verifieringen',
};
const FOR_METOD = ['1', '3', '4', '4b', '6', '11'];
const FOR_MODULEN = ['7', '8', '8b', '9', '11'];
// Modulens kod: det som räknar, visar och sparar planen (PLANERA.md under Stegen, Tre slags arbete).
const MODULEN = [/^src\/lib\/standard\/(plan|saker|text)\.js$/, /^src\/lib\/(insatsplan|metodsaker|planbar)\.ts$/, /^src\/scripts\/(planera|planpdf|insatser[^/]*)\.ts$/, /^src\/components\/Planera[^/]*\.astro$/, /^src\/pages\/stodundervisning\/\[id\]\/planera\.astro$/, /^src\/content\.config\.ts$/];

const args = process.argv.slice(2);
const varde = (namn, forval) => (args.includes(namn) ? args[args.indexOf(namn) + 1] : forval);

function bas() {
  try { return git('rev-parse', 'origin/main'); } catch { return ''; }
}

// Omgången: metoderna vars fil har ändrats och vars plan syns i det som ska upp, och om modulen har ändrats.
function omgangen(till) {
  const b = bas();
  const filer = b ? git('diff', '--name-only', `${b}..${till}`).split('\n').filter(Boolean) : [];
  const metoder = [];
  for (const f of filer) {
    const m = f.match(/^src\/content\/stodundervisning\/([^_/][^/]*)\.yaml$/);
    if (!m) continue;
    let d;
    try { d = parse(git('show', `${till}:${f}`)); } catch { continue; }
    if (d?.plan && !d.plan.vantar && !d.utkast) metoder.push({ id: m[1], titel: d.titel ?? m[1] });
  }
  return { bas: b, metoder, modulen: filer.some((f) => MODULEN.some((r) => r.test(f))) };
}

function lasLiggaren(b) {
  if (!existsSync(LIGGARE)) return { bas: b, steg: {} };
  const l = JSON.parse(readFileSync(LIGGARE, 'utf8'));
  // En liggare från en tidigare omgång gäller inte, eftersom main har pushats sedan dess.
  return l.bas === b ? l : { bas: b, steg: {} };
}

function krav(o) {
  return [...o.metoder.map((m) => ({ vem: m.id, namn: m.titel, steg: FOR_METOD })), ...(o.modulen ? [{ vem: 'modulen', namn: 'Modulen', steg: FOR_MODULEN }] : [])];
}

function lage(till) {
  const o = omgangen(till);
  const l = lasLiggaren(o.bas);
  const rader = krav(o).map((k) => ({ ...k, saknas: k.steg.filter((s) => !l.steg[k.vem]?.[s]), gjorda: k.steg.filter((s) => l.steg[k.vem]?.[s]) }));
  return { o, l, rader };
}

const kommando = args[0];
if (kommando === 'gjort') {
  const [, vem, steg, svar] = args;
  if (!vem || !STEGEN[steg]) { console.error(`steg: skriv gjort <id|modulen> <steg> <svar>, med ett steg av ${Object.keys(STEGEN).join(', ')}.`); process.exit(1); }
  const skal = varde('--skal');
  if (!skal && (!svar || svar.startsWith('--'))) { console.error('steg: ange filen eller brevet med svaret, eller --skal "<varför steget inte behövs>".'); process.exit(1); }
  if (!skal && !existsSync(resolve(rot, svar))) { console.error(`steg: ${svar} finns inte.`); process.exit(1); }
  const b = bas();
  const l = lasLiggaren(b);
  l.steg[vem] = { ...(l.steg[vem] ?? {}), [steg]: { datum: new Date().toISOString().slice(0, 10), ...(skal ? { skal } : { svar }) } };
  mkdirSync(dirname(LIGGARE), { recursive: true });
  writeFileSync(LIGGARE, `${JSON.stringify(l, null, 2)}\n`);
  console.log(`${vem}: steg ${steg}, ${STEGEN[steg]}, gjort.`);
} else if (kommando === 'visa' || kommando === 'prov') {
  const till = varde('--till', 'HEAD');
  const { o, l, rader } = lage(till);
  const saknas = rader.filter((r) => r.saknas.length);
  if (kommando === 'prov') {
    if (!saknas.length) process.exit(0);
    console.log(`Stegen i PLANERA.md saknas för det som ska upp:\n${saknas.map((r) => `  ${r.namn}: ${r.saknas.map((s) => `${s} ${STEGEN[s]}`).join(', ')}`).join('\n')}\nSkriv in gjorda steg med node scripts/planera/steg.mjs gjort <id|modulen> <steg> <svar>.`);
    process.exit(1);
  }
  if (!rader.length) { console.log('Planera: inget i omgången behöver stegen i PLANERA.md (ingen metod med plan och ingen kod i modulen har ändrats mot main på GitHub).'); process.exit(0); }
  if (args.includes('--kort')) {
    console.log(saknas.length ? `Stegen i PLANERA.md som saknas före pushen:\n${saknas.map((r) => `  ${r.namn}: ${r.saknas.join(', ')}`).join('\n')}\nVisa allt med node scripts/planera/steg.mjs visa.` : 'Alla steg i PLANERA.md är gjorda för det som ska upp.');
    process.exit(0);
  }
  console.log(`Omgången mot main på GitHub (${o.bas.slice(0, 7)}): ${o.metoder.length} metoder med planen${o.modulen ? ' och modulen' : ''}.\n`);
  for (const r of rader) {
    console.log(`${r.namn}`);
    for (const s of r.steg) {
      const g = l.steg[r.vem]?.[s];
      console.log(`  ${g ? 'gjort ' : 'SAKNAS'} ${s.padEnd(3)} ${STEGEN[s]}${g ? `  (${g.datum}: ${g.svar ?? `inte i omgången, ${g.skal}`})` : ''}`);
    }
  }
} else {
  console.log('Så här: node scripts/planera/steg.mjs visa [--kort] | gjort <id|modulen> <steg> <svar> [--skal "<varför>"] | prov [--till main]');
  process.exit(kommando ? 1 : 0);
}
