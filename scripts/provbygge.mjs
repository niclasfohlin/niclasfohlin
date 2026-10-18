#!/usr/bin/env node
// Provbygget (Verktyg och stödmaterial, arbetsordern steg 0; DRIFT.md under Netlify): bygger sajten i tillfälliga kopior
// som Netlify gör (npm run build) och bevisar att en ändring bara ändrar det den ska.
//
//   node scripts/provbygge.mjs jamfor [--fore main] [--efter HEAD] [--vantat <fil.json>]
//       bygger två commits i var sin kopia och jämför hela dist fil för fil. Sidor, stilar, skript och data jämförs byte
//       för byte, Word, PowerPoint och zip på sitt innehåll utan tidsstämplarna, pdf byte för byte. Det som ska ändras
//       står i förväg i --vantat (se nedan); allt annat delas i oförändrat, nytt, borttaget och oväntat, och oväntat
//       eller borttaget stoppar (exitkod 1).
//   node scripts/provbygge.mjs rent [--ref HEAD]
//       packar upp en commit, kör npm ci och npm run build under Node 22.12, som Netlify (netlify.toml, .nvmrc).
//       Node 22.12 hämtas som npm-paketet node@22.12.0 (omkring 30 MB) i npx:s cache.
//
// Kommandot rör inte sajtens arbetsträd, dist eller git: kopiorna packas upp ur git (git archive) i en egen mapp, som
// scripts/forhandsbilder.mjs gör, med egna cachemappar. Jämförelsen länkar in sajtens node_modules och läser dem bara.
//
// --vantat är en JSON-lista med regler för det som får skilja:
//   { "vad": "statistiken laddas bara på sajten", "filer": "\\.html$", "byt": [["<regex>", "<ersättning>"]] }
//       byt körs på båda sidor före jämförelsen, så att resten av filen ändå ska vara lika;
//   { "vad": "...", "filer": "<regex>", "fritt": true }  filen får skilja hur som helst;
//   { "vad": "...", "filer": "<regex>", "borttagen": true }  filen får försvinna.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const varde = (flagga, forval) => (args.includes(flagga) ? args[args.indexOf(flagga) + 1] : forval);
const lage = args[0];
const arbete = join(tmpdir(), 'niclasfohlin-provbygge');
const MARKE = '.provbygge';
const kor = (kommando, argument, o = {}) => spawnSync(kommando, argument, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...o });

if (!['jamfor', 'rent'].includes(lage)) {
  console.error('Användning: node scripts/provbygge.mjs jamfor [--fore main] [--efter HEAD] [--vantat <fil>]\n           node scripts/provbygge.mjs rent [--ref HEAD]');
  process.exit(1);
}

// En körning i taget.
mkdirSync(arbete, { recursive: true });
const las = join(arbete, 'las.json');
if (existsSync(las)) {
  const { pid } = JSON.parse(readFileSync(las, 'utf8'));
  let lever = false;
  try { process.kill(pid, 0); lever = true; } catch { /* processen finns inte kvar */ }
  if (lever) { console.error(`provbygge: en annan körning pågår (process ${pid}).`); process.exit(1); }
}
writeFileSync(las, JSON.stringify({ pid: process.pid, start: new Date().toISOString() }));
const lankar = [];
// Länken till sajtens node_modules tas bort som länk, aldrig som mapp.
const taBort = (lank) => { try { if (lstatSync(lank).isSymbolicLink()) unlinkSync(lank); } catch { /* ingen länk */ } };
process.on('exit', () => { for (const l of lankar) taBort(l); try { unlinkSync(las); } catch { /* borta */ } });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(1));

// En kopia av en commit, uppackad på nytt, med egna cachemappar för Astro och Vite.
function packaUpp(namn, ref, lankaModuler) {
  const kopia = join(arbete, namn);
  const lank = join(kopia, 'node_modules');
  taBort(lank);
  if (existsSync(kopia)) {
    if (!existsSync(join(kopia, MARKE)) || existsSync(lank) && lstatSync(lank).isSymbolicLink()) throw new Error(`${kopia} ser inte ut som kommandots kopia. Ta bort mappen för hand.`);
    rmSync(kopia, { recursive: true, force: true });
  }
  mkdirSync(kopia, { recursive: true });
  const sha = kor('git', ['-C', rot, 'rev-parse', '--short', ref]).stdout.trim();
  if (!sha) throw new Error(`${ref} finns inte i git.`);
  writeFileSync(join(kopia, MARKE), `Kopia av sajten för scripts/provbygge.mjs, commit ${sha}. Tas bort och görs om vid varje körning.\n`);
  const tar = join(arbete, `${namn}.tar`);
  // Utan omvandling av radsluten: med core.autocrlf=true lägger git archive till CR i textfilerna, och då stämmer
  // kontrollsummorna i bygget inte (favicon.svg 2026-10-18). Netlify checkar ut med LF, som här.
  const arkiv = kor('git', ['-C', rot, '-c', 'core.autocrlf=false', 'archive', '--format=tar', '-o', tar, ref]);
  if (arkiv.status !== 0) throw new Error(`git archive gick inte: ${arkiv.stderr}`);
  // Utan enhetsbokstav: tar i Git Bash läser C: som en annan dator.
  const upp = kor('tar', ['-xf', `../${namn}.tar`], { cwd: kopia });
  if (upp.status !== 0) throw new Error(`tar gick inte: ${upp.stderr}`);
  unlinkSync(tar);
  if (lankaModuler) { symlinkSync(join(rot, 'node_modules'), lank, 'junction'); lankar.push(lank); }
  renameSync(join(kopia, 'astro.config.mjs'), join(kopia, 'astro.config.sajt.mjs'));
  writeFileSync(join(kopia, 'astro.config.mjs'), `import bas from './astro.config.sajt.mjs';\nexport default { ...bas, cacheDir: '../cache-${namn}/astro', vite: { ...(bas.vite ?? {}), cacheDir: '../cache-${namn}/vite' } };\n`);
  return { kopia, sha };
}

function bygg(kopia, env = process.env, npm = ['npm']) {
  const start = Date.now();
  const r = kor(npm[0], [...npm.slice(1), 'run', 'build'], { cwd: kopia, env, shell: true });
  const sekunder = Math.round((Date.now() - start) / 1000);
  if (r.status !== 0) throw new Error(`npm run build stannade efter ${sekunder} s:\n${(r.stdout + r.stderr).split('\n').slice(-30).join('\n')}`);
  return sekunder;
}

// Alla filer i dist med en summa av innehållet, efter reglerna för det som får skilja.
const TEXT = new Set(['.html', '.css', '.js', '.mjs', '.json', '.xml', '.svg', '.txt', '.webmanifest']);
const ZIP = new Set(['.docx', '.pptx', '.xlsx', '.zip']);
const TIDSSTAMPLAR = new Set(['docProps/core.xml', 'docProps/app.xml']);
// Det som skiljer mellan två byggen av samma commit och därför inte räknas (main mot main 2026-10-18): Word-filernas
// datum, nyckeln för det inbäddade typsnittet (w:fontKey i fontTable.xml, slumpad för varje fil) och typsnittsfilens
// första 32 byte, som blandas med nyckeln (ODTTF), och versionen i länkarna till de filer som byggs (?v= ur filens byte).
const BYGGDA_LANKAR = /(\.(?:docx|pptx|xlsx|zip))\?v=[0-9a-f]+/g;
const NYCKEL = /w:fontKey="\{[0-9a-fA-F-]+\}"/g;
// Länkarnas relationer får ett slumpat id av docx-biblioteket (rId följt av bokstäver), de numrerade (rId1) är fasta.
const LANK_ID = /rId(?![0-9]+")[A-Za-z0-9_-]+(?=")/g;
async function manifest(dist, regler) {
  const ut = new Map();
  const ga = (mapp) => { for (const f of readdirSync(mapp, { withFileTypes: true })) { const p = join(mapp, f.name); if (f.isDirectory()) ga(p); else ut.set(relative(dist, p).replace(/\\/g, '/'), p); } };
  ga(dist);
  const summor = new Map();
  for (const [vag, fil] of ut) {
    const e = extname(vag).toLowerCase();
    const h = createHash('sha256');
    if (ZIP.has(e)) {
      const zip = await JSZip.loadAsync(readFileSync(fil));
      for (const namn of Object.keys(zip.files).sort()) {
        if (zip.files[namn].dir || TIDSSTAMPLAR.has(namn)) continue;
        let innehall = await zip.files[namn].async('nodebuffer');
        if (namn.endsWith('.odttf')) innehall = innehall.subarray(32);
        else if (/\.(xml|rels)$/.test(namn)) innehall = Buffer.from(innehall.toString('utf8').replace(NYCKEL, 'w:fontKey=""').replace(LANK_ID, 'rIdLank'));
        h.update(namn).update(innehall);
      }
    } else if (TEXT.has(e)) {
      let t = readFileSync(fil, 'utf8').replace(BYGGDA_LANKAR, '$1?v=');
      if (e === '.json') { try { const j = JSON.parse(t); if (j && typeof j === 'object' && 'genererad' in j) { delete j.genererad; t = JSON.stringify(j); } } catch { /* inte json */ } }
      for (const r of regler) if (r.byt && new RegExp(r.filer).test(vag)) for (const [fran, till] of r.byt) t = t.replace(new RegExp(fran, 'g'), till);
      h.update(t);
    } else h.update(readFileSync(fil));
    summor.set(vag, h.digest('hex'));
  }
  return summor;
}

async function jamfor() {
  const fore = varde('--fore', 'main');
  const efter = varde('--efter', 'HEAD');
  const vantatFil = varde('--vantat');
  const regler = vantatFil ? JSON.parse(readFileSync(resolve(vantatFil), 'utf8')) : [];
  // --utan-bygge jämför kopiorna från förra körningen igen, till exempel efter en ändrad regel i --vantat.
  const utanBygge = args.includes('--utan-bygge');
  const redan = (namn) => ({ kopia: join(arbete, namn), sha: readFileSync(join(arbete, namn, MARKE), 'utf8').match(/commit (\w+)/)?.[1] ?? '?' });
  let a, b, ta = 0, tb = 0;
  if (utanBygge) {
    if (!existsSync(join(arbete, 'fore', 'dist')) || !existsSync(join(arbete, 'efter', 'dist'))) throw new Error('Det finns inga byggda kopior att jämföra; kör utan --utan-bygge.');
    [a, b] = [redan('fore'), redan('efter')];
  } else {
    a = packaUpp('fore', fore, true);
    console.log(`Bygger ${fore} (${a.sha}) …`);
    ta = bygg(a.kopia);
    b = packaUpp('efter', efter, true);
    console.log(`Bygger ${efter} (${b.sha}) …`);
    tb = bygg(b.kopia);
  }
  const [ma, mb] = [await manifest(join(a.kopia, 'dist'), regler), await manifest(join(b.kopia, 'dist'), regler)];
  const regelFor = (vag, nyckel) => regler.find((r) => r[nyckel] && new RegExp(r.filer).test(vag));
  const lista = { oforandrat: [], forvantat: [], nytt: [], borttaget: [], ovantat: [] };
  for (const [vag, s] of ma) {
    if (!mb.has(vag)) (regelFor(vag, 'borttagen') ? lista.forvantat : lista.borttaget).push(vag);
    else if (mb.get(vag) === s) lista.oforandrat.push(vag);
    else (regelFor(vag, 'fritt') ? lista.forvantat : lista.ovantat).push(vag);
  }
  for (const vag of mb.keys()) if (!ma.has(vag)) lista.nytt.push(vag);
  console.log(`\nJämförelse ${fore} (${a.sha}, bygget ${ta} s) mot ${efter} (${b.sha}, bygget ${tb} s): ${ma.size} filer före, ${mb.size} efter.`);
  console.log(`  oförändrat ${lista.oforandrat.length}, väntat ${lista.forvantat.length}, nytt ${lista.nytt.length}, borttaget ${lista.borttaget.length}, oväntat ${lista.ovantat.length}`);
  const visa = (rubrik, l) => { if (l.length) console.log(`\n${rubrik} (${l.length}):\n  ${l.slice(0, 40).join('\n  ')}${l.length > 40 ? `\n  … och ${l.length - 40} till` : ''}`); };
  visa('Nytt', lista.nytt);
  visa('Väntat', lista.forvantat);
  visa('Borttaget', lista.borttaget);
  visa('Oväntat', lista.ovantat);
  // Första skillnaden i en oväntad textfil, så att den går att förstå utan att öppna kopiorna.
  for (const vag of lista.ovantat.slice(0, 5)) {
    if (!TEXT.has(extname(vag).toLowerCase())) continue;
    const [x, y] = [readFileSync(join(a.kopia, 'dist', vag), 'utf8'), readFileSync(join(b.kopia, 'dist', vag), 'utf8')].map((t) => t.replace(BYGGDA_LANKAR, '$1?v='));
    let i = 0; while (i < x.length && x[i] === y[i]) i++;
    console.log(`\n${vag}, första skillnaden vid tecken ${i}:\n  före:  ${JSON.stringify(x.slice(Math.max(0, i - 60), i + 100))}\n  efter: ${JSON.stringify(y.slice(Math.max(0, i - 60), i + 100))}`);
  }
  const rapport = join(rot, 'underlag', 'prov', 'provbygge', `jamfor-${a.sha.replace(/\W/g, 'x')}-${b.sha.replace(/\W/g, 'x')}.json`);
  mkdirSync(dirname(rapport), { recursive: true });
  writeFileSync(rapport, JSON.stringify({ fore: { ref: fore, sha: a.sha, sekunder: ta, filer: ma.size }, efter: { ref: efter, sha: b.sha, sekunder: tb, filer: mb.size }, ...lista }, null, 1));
  console.log(`\nRapporten: ${relative(rot, rapport)}`);
  process.exit(lista.ovantat.length || lista.borttaget.length ? 1 : 0);
}

function rent() {
  const ref = varde('--ref', 'HEAD');
  const NODE = '22.12.0';
  const hitta = kor('npx', ['-y', `node@${NODE}`, '-e', 'console.log(process.execPath + "|" + process.version)'], { shell: true });
  const [nodeExe, version] = (hitta.stdout || '').trim().split('\n').pop().split('|');
  if (hitta.status !== 0 || version !== `v${NODE}`) throw new Error(`Node ${NODE} gick inte att hämta med npx:\n${hitta.stderr}`);
  const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
  if (!existsSync(npmCli)) throw new Error(`npm hittades inte bredvid Node (${npmCli}).`);
  const k = packaUpp('rent', ref, false);
  // Netlifys Node först i sökvägen, så att också skripten som npm run build startar kör den.
  const env = { ...process.env, PATH: `${dirname(nodeExe)}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}` };
  console.log(`Node ${version}: npm ci i en ren kopia av ${ref} (${k.sha}) …`);
  const ci = kor(`"${nodeExe}"`, [`"${npmCli}"`, 'ci', '--no-audit', '--no-fund'], { cwd: k.kopia, env, shell: true });
  if (ci.status !== 0) throw new Error(`npm ci gick inte:\n${(ci.stdout + ci.stderr).split('\n').slice(-30).join('\n')}`);
  console.log('npm run build …');
  const sekunder = bygg(k.kopia, env, [`"${nodeExe}"`, `"${npmCli}"`]);
  console.log(`Rent bygge under Node ${version} av ${ref} (${k.sha}) gick igenom på ${sekunder} s.`);
}

try {
  if (lage === 'jamfor') await jamfor();
  else rent();
} catch (e) {
  console.error(`provbygge: ${e.message}`);
  process.exit(1);
}
