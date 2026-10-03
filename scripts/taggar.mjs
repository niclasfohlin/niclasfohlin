#!/usr/bin/env node
// Verktyg för taggregistret.
//
//   node scripts/taggar.mjs                 Lista alla taggar med antal användningar
//   node scripts/taggar.mjs --kontrollera   Kontrollera alla innehållsfiler, avsluta med 1 vid fel
//   node scripts/taggar.mjs --kontrollera src/content/artiklar/x.md   Kontrollera en fil
//   node scripts/taggar.mjs --sok läsflyt   Slå upp om ett ord är en tagg eller ett alias
//   node scripts/taggar.mjs --forslag konflikthantering [fler id]   Lista poster vars text nämner taggens namn eller
//                                           alias men saknar taggen, för att pröva en ny tagg mot det som redan finns
//
// Reglerna (Niclas 2026-10-03): en post har minst två och högst fem taggar. En ny tagg prövas alltid mot alla
// befintliga artiklar, böcker och metoder med --forslag: träffarna är kandidater, och den som lägger till taggen läser
// posten och avgör. Har en post redan fem taggar byts en ut bara när den nya är uppenbart bättre, det vill säga mer
// precis om vad posten handlar om; då går den bredaste av de fem. När sökningen är gjord får taggen fältet provad
// (datumet) i registret, och --kontrollera stoppar en tagg som är ny mot origin/main men saknar det.
//
// Inga beroenden utöver yaml (devDependency). Körs även av Claude Code-hooken.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const taggar = JSON.parse(readFileSync(join(rot, 'src/data/taggar.json'), 'utf8')).taggar;
const publikationer = JSON.parse(readFileSync(join(rot, 'src/data/publikationer.json'), 'utf8')).publikationer;

const taggIds = new Set(taggar.map((t) => t.id));
const taggAlias = new Map();
for (const t of taggar) {
  taggAlias.set(t.label.toLowerCase(), t.id);
  for (const a of t.alias) taggAlias.set(a.toLowerCase(), t.id);
}
// Minst två och högst fem taggar per post (Niclas 2026-10-03), samma gränser som schemat i src/content.config.ts.
const MINST = 2;
const HOGST = 5;
const pubIds = new Set(publikationer.map((p) => p.id));
const pubAlias = new Map();
for (const p of publikationer) {
  pubAlias.set(p.namn.toLowerCase(), p.id);
  for (const a of p.alias) pubAlias.set(a.toLowerCase(), p.id);
}

function innehallsfiler() {
  const filer = [];
  for (const samling of ['artiklar', 'bocker', 'stodundervisning']) {
    const dir = join(rot, 'src/content', samling);
    let namn = [];
    try { namn = readdirSync(dir); } catch { continue; }
    for (const f of namn) {
      if (!(f.endsWith('.md') || f.endsWith('.yaml')) || f.startsWith('_')) continue;
      const p = join(dir, f);
      if (statSync(p).isFile()) filer.push(p);
    }
  }
  return filer;
}

// Markdown har frontmatter mellan ---; en metod i stödundervisning är en hel YAML-fil.
function frontmatter(fil) {
  const text = readFileSync(fil, 'utf8');
  if (fil.endsWith('.yaml')) {
    try { return parseYaml(text) ?? {}; } catch (e) { return { _fel: e.message }; }
  }
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try { return parseYaml(m[1]) ?? {}; } catch (e) { return { _fel: e.message }; }
}

function kontrolleraFil(fil) {
  const fel = [];
  const rel = relative(rot, fil);
  const fm = frontmatter(fil);
  if (!fm) return [`${rel}: saknar frontmatter (--- ... ---).`];
  if (fm._fel) return [`${rel}: frontmatter går inte att läsa: ${fm._fel}`];

  const lista = Array.isArray(fm.taggar) ? fm.taggar : [];
  for (const t of lista) {
    if (taggIds.has(t)) continue;
    const forslag = taggAlias.get(String(t).toLowerCase());
    fel.push(forslag
      ? `${rel}: taggen "${t}" är ett alias. Byt till "${forslag}".`
      : `${rel}: okänd tagg "${t}". Använd en befintlig tagg eller lägg till den i src/data/taggar.json med label, omrade, beskrivning och alias.`);
  }
  const dubletter = lista.filter((t, i) => lista.indexOf(t) !== i);
  if (lista.length > HOGST) fel.push(`${rel}: ${lista.length} taggar; högst ${HOGST} per post (Niclas 2026-10-03). Behåll de ${HOGST} som bäst säger vad posten handlar om.`);
  if (lista.length < MINST) fel.push(`${rel}: ${lista.length} tagg${lista.length === 1 ? '' : 'ar'}; minst ${MINST} per post (Niclas 2026-10-03). Lägg till en som säger vad posten handlar om, aldrig en utfyllnad.`);
  for (const d of new Set(dubletter)) fel.push(`${rel}: taggen "${d}" står två gånger.`);

  if (fil.includes(`${join('src', 'content', 'artiklar')}`) && fm.publikation !== undefined) {
    const p = String(fm.publikation);
    if (!pubIds.has(p)) {
      const forslag = pubAlias.get(p.toLowerCase());
      fel.push(forslag
        ? `${rel}: publikationen "${p}" skrivs "${forslag}".`
        : `${rel}: okänd publikation "${p}". Lägg till den i src/data/publikationer.json.`);
    }
  }
  return fel;
}

function lista() {
  const antal = new Map();
  for (const fil of innehallsfiler()) {
    const fm = frontmatter(fil);
    for (const t of (Array.isArray(fm?.taggar) ? fm.taggar : [])) antal.set(t, (antal.get(t) ?? 0) + 1);
  }
  const perOmrade = new Map();
  for (const t of taggar) {
    if (!perOmrade.has(t.omrade)) perOmrade.set(t.omrade, []);
    perOmrade.get(t.omrade).push(t);
  }
  for (const [omrade, lista] of perOmrade) {
    console.log(`\n${omrade}`);
    for (const t of lista) {
      const n = antal.get(t.id) ?? 0;
      console.log(`  ${t.id.padEnd(26)} ${String(n).padStart(3)}  ${t.label}${t.alias.length ? `  (alias: ${t.alias.join(', ')})` : ''}`);
    }
  }
  const okanda = [...antal.keys()].filter((t) => !taggIds.has(t));
  if (okanda.length) console.log(`\nOkända taggar i innehållet: ${okanda.join(', ')}`);
  console.log(`\nPublikationer: ${publikationer.map((p) => p.id).join(', ')}`);
}

const args = process.argv.slice(2);

if (args[0] === '--sok') {
  const ord = (args[1] ?? '').toLowerCase();
  if (taggIds.has(ord)) console.log(`"${ord}" är en tagg.`);
  else if (taggAlias.has(ord)) console.log(`"${ord}" är ett alias för "${taggAlias.get(ord)}".`);
  else if (pubIds.has(ord)) console.log(`"${ord}" är en publikation.`);
  else if (pubAlias.has(ord)) console.log(`"${ord}" är ett alias för publikationen "${pubAlias.get(ord)}".`);
  else console.log(`"${ord}" finns inte i registren. Kontrollera om en befintlig tagg täcker samma sak innan du lägger till.`);
  process.exit(0);
}

// Kandidater för en ny tagg: poster vars text (rubrik, ingress och brödtext, eller hela metodens fil) nämner taggens
// namn eller ett alias i början av ett ord, så att böjningar räknas (konflikter, konflikten), men som saknar taggen.
if (args[0] === '--forslag') {
  const ids = args.slice(1);
  if (!ids.length) { console.error('Ange taggens id: node scripts/taggar.mjs --forslag konflikthantering'); process.exit(1); }
  // Hårt mellanslag, ordfog och mjukt bindestreck styr bara radbrytningen och ska inte hindra en träff.
  const bort = (t) => t.replace(/\u00a0/g, ' ').replace(/[\u2060\u00ad]/g, '');
  const tecken = (o) => o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[ -]/g, '[ -]');
  for (const id of ids) {
    const t = taggar.find((x) => x.id === id);
    if (!t) { console.error(`"${id}" är ingen tagg.`); process.exit(1); }
    const ord = [...new Set([t.label, ...t.alias].map((x) => x.toLowerCase()))];
    const monster = ord.map((o) => new RegExp(`(?<![\\p{L}\\p{N}])${tecken(o)}`, 'giu'));
    const rader = [];
    for (const fil of innehallsfiler()) {
      const fm = frontmatter(fil);
      if (!fm || fm._fel || fm.utkast) continue;
      const egna = Array.isArray(fm.taggar) ? fm.taggar : [];
      if (egna.includes(id)) continue;
      const text = bort(readFileSync(fil, 'utf8'));
      const traffar = ord.map((o, i) => [o, (text.match(monster[i]) ?? []).length]).filter(([, n]) => n > 0);
      if (!traffar.length) continue;
      const summa = traffar.reduce((a, [, n]) => a + n, 0);
      const vag = relative(rot, fil).split('\\').join('/');
      rader.push({ summa, rad: `  ${String(summa).padStart(3)}  ${vag.padEnd(64)} ${egna.length}/${HOGST} taggar  ${traffar.map(([o, n]) => `${o} ${n}`).join(', ')}` });
    }
    rader.sort((a, b) => b.summa - a.summa);
    console.log(`\n${t.label} (${id}): ${rader.length} poster nämner den men saknar taggen. Läs dem och avgör; en post har högst ${HOGST} taggar.`);
    for (const r of rader) console.log(r.rad);
  }
  process.exit(0);
}

// En ny tagg (som inte finns i registret på origin/main) ska vara prövad mot alla befintliga poster innan den kommer
// ut: fältet provad i registret säger att --forslag är körd och träffarna avgjorda (Niclas 2026-10-03: "En ny tagg bör
// alltid leda till att databasen söks igenom"). Utan git eller origin/main prövas inget här.
function oprovadeTaggar() {
  let ute;
  try { ute = JSON.parse(execFileSync('git', ['show', 'origin/main:src/data/taggar.json'], { cwd: rot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).taggar; } catch { return []; }
  const fanns = new Set(ute.map((t) => t.id));
  return taggar.filter((t) => !fanns.has(t.id) && !t.provad).map((t) => `src/data/taggar.json: taggen "${t.id}" är ny. Sök igenom alla poster med node scripts/taggar.mjs --forslag ${t.id}, avgör träffarna och skriv "provad": "<datum>" på taggen i registret.`);
}

if (args[0] === '--kontrollera') {
  const filer = args[1] ? [resolve(args[1])] : innehallsfiler();
  const fel = [...filer.flatMap(kontrolleraFil), ...(args[1] ? [] : oprovadeTaggar())];
  if (fel.length) {
    console.error(fel.join('\n'));
    process.exit(1);
  }
  console.log(`Taggar och publikationer OK i ${filer.length} fil(er).`);
  process.exit(0);
}

lista();
