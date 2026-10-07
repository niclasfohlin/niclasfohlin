#!/usr/bin/env node
// Verktyg för taggregistret.
//
//   node scripts/taggar.mjs                 Lista alla taggar med antal användningar
//   node scripts/taggar.mjs --kontrollera   Kontrollera alla innehållsfiler, avsluta med 1 vid fel
//   node scripts/taggar.mjs --kontrollera src/content/artiklar/x.md   Kontrollera en fil
//   node scripts/taggar.mjs --sok läsflyt   Slå upp om ett ord är en tagg eller ett alias
//   node scripts/taggar.mjs --forslag konflikthantering [fler id]   Lista poster vars text nämner taggens namn eller
//                                           alias men saknar taggen, för att pröva en ny tagg mot det som redan finns
//   node scripts/taggar.mjs --post src/content/artiklar/x.md   Lista taggar vars ord står i posten men som saknas
//
// Reglerna står i ARBETSSATT.md under Innehåll; här står dem skriptet håller (Niclas 2026-10-03): en post har minst två och högst fem taggar. En ny tagg prövas alltid mot alla
// befintliga artiklar, böcker och metoder med --forslag: träffarna är kandidater, och den som lägger till taggen läser
// posten och avgör. Har en post redan fem taggar byts en ut bara när den nya är uppenbart bättre, det vill säga mer
// precis om vad posten handlar om; då går den bredaste av de fem. När sökningen är gjord får taggen fältet provad
// (datumet) i registret, och --kontrollera stoppar en tagg som är ny mot origin/main men saknar det. En helt ny tagg
// skapas bara på fyra villkor och bär sin motivering i registret (se nyaTaggarFel nedan). En ny artikel,
// bok eller metod stoppas på samma sätt tills dess taggförslag (--post) är lästa och avgjorda och posten står i
// src/data/taggprov.json, så att det sker av sig självt också i en ny session.
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

// Orden som hör till en tagg (namnet och aliasen) och ett mönster per ord, som träffar i början av ett ord så att
// böjningar räknas (konflikter, konflikten). Ett ord på högst tre bokstäver (SKA, KL, EHT, NVC, ord, tal) räknas bara
// som förkortning i versaler och som helt ord, eftersom "ska", "tal" och "ord" annars träffar nästan varje text.
// Hårt mellanslag, ordfog och mjukt bindestreck styr bara radbrytningen.
const bort = (t) => t.replace(/\u00a0/g, ' ').replace(/[\u2060\u00ad]/g, '');
const tecken = (o) => o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[ -]/g, '[ -]');
const taggOrd = (t) => [...new Set([t.label, ...t.alias].map((x) => x.toLowerCase()))];
const monster = (o) => (o.replace(/[^\p{L}]/gu, '').length <= 3
  ? new RegExp(`(?<![\\p{L}\\p{N}])${tecken(o.toUpperCase())}(?![\\p{L}\\p{N}])`, 'gu')
  : new RegExp(`(?<![\\p{L}\\p{N}])${tecken(o)}`, 'giu'));
const monsterFor = new Map(taggar.map((t) => [t.id, taggOrd(t).map((o) => [o, monster(o)])]));
// Postens text för förslagen: utan adresser, så att en länk till förlagets kategori inte räknas som innehåll.
const postText = (fil) => bort(readFileSync(fil, 'utf8')).replace(/https?:\/\/\S+/g, ' ');
// Träffarna för en tagg i en text: [ord, antal] för varje ord som står där.
const traffarFor = (id, text) => monsterFor.get(id).map(([o, re]) => [o, (text.match(re) ?? []).length]).filter(([, n]) => n > 0);
// Taggförslagen för en post: registrets taggar vars ord står i posten men som posten saknar, flest träffar först.
function forslagForPost(fil) {
  const fm = frontmatter(fil);
  const egna = Array.isArray(fm?.taggar) ? fm.taggar : [];
  const text = postText(fil);
  return taggar.filter((t) => !egna.includes(t.id))
    .map((t) => ({ t, traffar: traffarFor(t.id, text) }))
    .filter((x) => x.traffar.length)
    .map((x) => ({ ...x, summa: x.traffar.reduce((a, [, n]) => a + n, 0) }))
    .sort((a, b) => b.summa - a.summa);
}
const visaForslag = (f) => `${f.t.id} (${f.traffar.map(([o, n]) => `${o} ${n}`).join(', ')})`;
const postVag = (fil) => relative(rot, fil).split('\\').join('/');

// Nya poster prövas innan de kommer ut (Niclas 2026-10-03: "Bygg det så det sker också av automatik även i ny kontext
// för dig"): en artikel, bok eller metod som inte finns på origin/main och inte är utkast stoppas av --kontrollera, och
// därmed av npm run validera, tills taggförslagen är lästa och avgjorda och posten står i src/data/taggprov.json med
// datumet. Utan git eller origin/main prövas inget här.
const TAGGPROV = join(rot, 'src/data/taggprov.json');
function lasTaggprov() {
  try { return JSON.parse(readFileSync(TAGGPROV, 'utf8')).poster ?? {}; } catch { return {}; }
}
function oprovadePoster(filer) {
  let ute;
  try { ute = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', 'origin/main', 'src/content'], { cwd: rot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean)); } catch { return []; }
  const prov = lasTaggprov();
  return filer.flatMap((fil) => {
    const vag = postVag(fil);
    if (ute.has(vag) || prov[vag]) return [];
    const fm = frontmatter(fil);
    if (!fm || fm._fel || fm.utkast) return [];
    const f = forslagForPost(fil);
    return [`${vag}: ny post. Pröva taggarna innan den kommer ut: ${f.length ? `registret föreslår ${f.slice(0, 8).map(visaForslag).join('; ')}` : 'inga andra taggar i registret nämns i posten'}. Läs posten, välj ${MINST} till ${HOGST} taggar (node scripts/taggar.mjs --post ${vag}), och skriv "${vag}": "<datum>" under poster i src/data/taggprov.json.`];
  });
}

if (args[0] === '--post') {
  const fil = resolve(args[1] ?? '');
  const fm = args[1] ? frontmatter(fil) : null;
  if (!fm || fm._fel) { console.error('Ange en post: node scripts/taggar.mjs --post src/content/artiklar/x.md'); process.exit(1); }
  const egna = Array.isArray(fm.taggar) ? fm.taggar : [];
  const f = forslagForPost(fil);
  console.log(`${postVag(fil)}: ${egna.length} av högst ${HOGST} taggar (${egna.join(', ') || 'inga'}).`);
  console.log(f.length
    ? `Taggar vars ord står i posten men som saknas, flest träffar först. Läs och avgör; en tagg ska säga vad posten handlar om:\n${f.map((x) => `  ${String(x.summa).padStart(3)}  ${visaForslag(x)}`).join('\n')}`
    : 'Inga andra taggar i registret nämns i posten.');
  process.exit(0);
}

if (args[0] === '--forslag') {
  const ids = args.slice(1);
  if (!ids.length) { console.error('Ange taggens id: node scripts/taggar.mjs --forslag konflikthantering'); process.exit(1); }
  for (const id of ids) {
    const t = taggar.find((x) => x.id === id);
    if (!t) { console.error(`"${id}" är ingen tagg.`); process.exit(1); }
    const rader = [];
    for (const fil of innehallsfiler()) {
      const fm = frontmatter(fil);
      if (!fm || fm._fel || fm.utkast) continue;
      const egna = Array.isArray(fm.taggar) ? fm.taggar : [];
      if (egna.includes(id)) continue;
      const traffar = traffarFor(id, postText(fil));
      if (!traffar.length) continue;
      const summa = traffar.reduce((a, [, n]) => a + n, 0);
      rader.push({ summa, rad: `  ${String(summa).padStart(3)}  ${postVag(fil).padEnd(64)} ${egna.length}/${HOGST} taggar  ${traffar.map(([o, n]) => `${o} ${n}`).join(', ')}` });
    }
    rader.sort((a, b) => b.summa - a.summa);
    console.log(`\n${t.label} (${id}): ${rader.length} poster nämner den men saknar taggen. Läs dem och avgör; en post har högst ${HOGST} taggar.`);
    for (const r of rader) console.log(r.rad);
  }
  process.exit(0);
}

// En helt ny tagg (som inte finns i registret på origin/main) skapas bara när fyra saker stämmer (Niclas 2026-10-03:
// "Bygg det i tagg-systemet"):
//   1. Ingen befintlig tagg eller alias täcker ämnet (npm run taggar och --sok). Täcker en nästan, får den ett alias.
//   2. Ämnet är det posten huvudsakligen handlar om eller tränar, inte en detalj i den.
//   3. Genomgången av alla poster (--forslag) hittar minst en post till, eller fler texter om ämnet är på väg.
//   4. Namnet är lärarens eget ord, och aliasen fångar de ord lärare söker på.
// Registret bär skälen: motivering (1, 2 och 4, en eller två meningar), provad (datumet för genomgången) och, när
// taggen bara har en post, fler (vilka texter som är på väg). --kontrollera stoppar en ny tagg som saknar något av
// det. Utan git eller origin/main prövas inget här. Ett ord får dessutom bara höra till en tagg (alla taggar).
const MOTIVERING_MINST = 40;
function antalPoster(id) {
  let n = 0;
  for (const fil of innehallsfiler()) {
    const fm = frontmatter(fil);
    if (fm && !fm._fel && !fm.utkast && Array.isArray(fm.taggar) && fm.taggar.includes(id)) n++;
  }
  return n;
}
function nyaTaggarFel() {
  let ute;
  try { ute = JSON.parse(execFileSync('git', ['show', 'origin/main:src/data/taggar.json'], { cwd: rot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).taggar; } catch { return []; }
  const fanns = new Set(ute.map((t) => t.id));
  const fel = [];
  for (const t of taggar.filter((x) => !fanns.has(x.id))) {
    const var_ = `src/data/taggar.json: taggen "${t.id}" är ny`;
    if (String(t.motivering ?? '').trim().length < MOTIVERING_MINST) fel.push(`${var_}. Skriv "motivering" på taggen, en eller två meningar: vad posten huvudsakligen handlar om, varför ingen befintlig tagg eller alias täcker det, och att namnet är lärarens ord. Täcker en befintlig tagg nästan, lägg ett alias där i stället.`);
    if (!t.provad) fel.push(`${var_}. Sök igenom alla poster med node scripts/taggar.mjs --forslag ${t.id}, avgör träffarna och skriv "provad": "<datum>" på taggen.`);
    const n = antalPoster(t.id);
    if (n < 2 && !String(t.fler ?? '').trim()) fel.push(`${var_} och har ${n} post${n === 1 ? '' : 'er'} efter genomgången. En tagg ska samla mer än en post: lägg den där den hör hemma, skriv i "fler" vilka texter om ämnet som är på väg, eller använd en befintlig tagg med ett nytt alias.`);
  }
  return fel;
}
function ordKrockar() {
  const agare = new Map();
  for (const t of taggar) for (const o of new Set([t.label, ...t.alias].map((x) => x.toLowerCase()))) agare.set(o, [...(agare.get(o) ?? []), t.id]);
  return [...agare].filter(([, ids]) => ids.length > 1).map(([o, ids]) => `src/data/taggar.json: ordet "${o}" hör till ${ids.join(' och ')}. Ett ord får bara peka på en tagg.`);
}

if (args[0] === '--kontrollera') {
  const filer = args[1] ? [resolve(args[1])] : innehallsfiler();
  const fel = [...filer.flatMap(kontrolleraFil), ...(args[1] ? [] : [...ordKrockar(), ...nyaTaggarFel(), ...oprovadePoster(filer)])];
  if (fel.length) {
    console.error(fel.join('\n'));
    process.exit(1);
  }
  console.log(`Taggar och publikationer OK i ${filer.length} fil(er).`);
  process.exit(0);
}

lista();
