#!/usr/bin/env node
// Förhandsbilder till metodriggen: metodens sida som läraren ser den, i telefonbredd och på dator, innan metoden är
// levererad (riggens förslag 2026-10-12 efter Chambers boksamtal i grupp: sajtens granskning i telefonbredd fann fyra
// saker som inte går att se i riggens Word-fil, och riggen vill läsa samma bitar före leveransen; K-327). Riggen kör
// kommandot själv, mot sin egen metodfil:
//
//   node C:/niclasfohlin.se/niclasfohlin-site-starter/scripts/forhandsbilder.mjs <metodens yaml> [--ut <mapp>]
//   … --id <id>        metodens id, när filen inte heter <id>.yaml (riggens methods/<id>/metod.yaml)
//   … --utfallt        allt som fälls ut på sidan står utfällt i bilderna (nivåer, långa listor)
//   … --arbete <mapp>  arbetsmappen, annars <temp>/niclasfohlin-forhandsbild
//
// Bilderna hamnar i <metodfilens mapp>/forhandsbilder/, med läsbitarna i lasbilder/ och lasbilder-mobil/ (lathundssidan i
// lasbilder-lathund/ och lasbilder-lathund-mobil/) och en rapport, FORHANDSBILD.md, som säger vad bilderna visar och
// inte visar.
//
// Kommandot rör inte sajtens arbetsträd, dist eller git. Det packar upp det som ligger på main (git archive) i
// arbetsmappen, lägger riggens fil där och bygger kopian, med egna cachemappar. Sajtens session kan därför stå mitt i
// ett bygge eller en jämförelse i Google Dokument (2026-10-10 förstörde ett bygge i samma mapp en sådan). Det enda
// kopian delar med sajten är node_modules, som länkas in medan kommandot går och bara läses.
//
// Det sajten inte har stoppar inte bilderna, det står i rapporten:
//   ett fält som sajtens schema inte känner tas bort ur kopian, med namn och plats,
//   en del som schemat stoppar av ett annat skäl (en form sajten inte har, en plats som inte finns) tas bort som helhet,
//   en bild På bordet eller ett omslag som varken finns bredvid metodfilen eller hos sajten blir en grå ruta,
//   och filmer som sajten inte har filerna till visas inte.
// Stoppar schemat något som inte går att ta bort, som ett fält överst i filen, stannar kommandot med schemats rad.
// Bygget tar omkring två minuter och bilderna en till. Kräver Chrome.
import { execFile, spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { parseDocument } from 'yaml';
import sharp from 'sharp';
import { lasbilder } from './lasbilder.mjs';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const varde = (flagga) => (args.includes(flagga) ? args[args.indexOf(flagga) + 1] : undefined);
const fil = args.find((a, i) => !a.startsWith('--') && !['--ut', '--id', '--arbete'].includes(args[i - 1]));
if (!fil || !existsSync(fil)) {
  console.error('Användning: node scripts/forhandsbilder.mjs <metodens yaml> [--ut <mapp>] [--id <id>] [--utfallt] [--arbete <mapp>]');
  process.exit(1);
}
const kalla = resolve(fil);
const id = varde('--id') ?? basename(kalla, extname(kalla));
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) { console.error(`forhandsbilder: ”${id}” är inte ett id. Ge metodens id med --id <id>.`); process.exit(1); }
const ut = resolve(varde('--ut') ?? join(dirname(kalla), 'forhandsbilder'));
const arbete = resolve(varde('--arbete') ?? join(tmpdir(), 'niclasfohlin-forhandsbild'));
const kopia = join(arbete, 'sajt');
const lank = join(kopia, 'node_modules');
const las = join(arbete, 'las.json');
const MARKE = '.forhandsbild';
const stod = join(kopia, 'public', 'stodundervisning');
const metodfil = join(kopia, 'src', 'content', 'stodundervisning', `${id}.yaml`);
const rapport = { borttagna: [], rutor: [], filmer: [], bilder: [] };

// En körning i taget: två byggen i samma kopia förstör varandra.
mkdirSync(arbete, { recursive: true });
if (existsSync(las)) {
  const { pid } = JSON.parse(readFileSync(las, 'utf8'));
  let lever = false;
  try { process.kill(pid, 0); lever = true; } catch { /* processen finns inte kvar */ }
  if (lever) { console.error(`forhandsbilder: en annan körning pågår (process ${pid}). Vänta tills den är klar.`); process.exit(1); }
}
writeFileSync(las, JSON.stringify({ pid: process.pid, start: new Date().toISOString() }));

// Länken till sajtens node_modules tas alltid bort som länk, aldrig som mapp, och finns bara medan kommandot går.
const taBortLanken = () => { try { if (lstatSync(lank).isSymbolicLink()) unlinkSync(lank); } catch { /* ingen länk */ } };
const stada = () => { taBortLanken(); try { unlinkSync(las); } catch { /* redan borta */ } };
process.on('exit', stada);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(1));

const kor = (kommando, argument, o = {}) => spawnSync(kommando, argument, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...o });

// 1. Kopian: det som ligger på sajtens main, uppackat på nytt varje gång, så att inget från förra körningen står kvar.
function packaUpp() {
  taBortLanken();
  if (existsSync(kopia)) {
    // Mappen tas bara bort när den är kommandots egen och länken säkert är borta.
    if (!existsSync(join(kopia, MARKE)) || existsSync(lank)) throw new Error(`${kopia} ser inte ut som kommandots kopia, eller länken till node_modules står kvar. Ta bort mappen för hand.`);
    rmSync(kopia, { recursive: true, force: true });
  }
  mkdirSync(kopia, { recursive: true });
  writeFileSync(join(kopia, MARKE), 'Kopia av sajten för scripts/forhandsbilder.mjs. Tas bort och görs om vid varje körning.\n');
  const tar = join(arbete, 'sajt.tar');
  const arkiv = kor('git', ['-C', rot, 'archive', '--format=tar', '-o', tar, 'main']);
  if (arkiv.status !== 0) throw new Error(`git archive gick inte: ${arkiv.stderr}`);
  // Utan enhetsbokstav i argumenten: tar i Git Bash läser C: som en annan dator.
  const upp = kor('tar', ['-xf', '../sajt.tar'], { cwd: kopia });
  if (upp.status !== 0) throw new Error(`tar gick inte: ${upp.stderr}`);
  unlinkSync(tar);
  symlinkSync(join(rot, 'node_modules'), lank, 'junction');
  // Egna cachemappar: Astros och Vites cache ligger annars i node_modules, som är sajtens.
  renameSync(join(kopia, 'astro.config.mjs'), join(kopia, 'astro.config.sajt.mjs'));
  writeFileSync(join(kopia, 'astro.config.mjs'), "import bas from './astro.config.sajt.mjs';\nexport default { ...bas, cacheDir: '../cache/astro', vite: { ...(bas.vite ?? {}), cacheDir: '../cache/vite' } };\n");
  return kor('git', ['-C', rot, 'log', '-1', '--format=%h %cs %s', 'main']).stdout.trim();
}

// 2. Riggens fil och det som ligger bredvid den: bilderna På bordet och litteraturlistans omslag (flödet /ny-metod).
function laggIn() {
  const hade = existsSync(metodfil) ? parseDocument(readFileSync(metodfil, 'utf8')) : undefined;
  const dok = parseDocument(readFileSync(kalla, 'utf8'));
  if (dok.errors.length) throw new Error(`${kalla} går inte att läsa som YAML: ${dok.errors[0].message}`);
  const d = dok.toJS();
  const mapp = dirname(kalla);
  mkdirSync(join(stod, id), { recursive: true });
  for (const b of d.pabordet ?? []) {
    const mal = join(stod, `${id}-pabordet-${b.nr}.svg`);
    const riggens = join(mapp, `pabordet-${b.nr}.svg`);
    if (existsSync(riggens)) copyFileSync(riggens, mal);
    else if (!existsSync(mal)) {
      writeFileSync(mal, `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="#e4e4e4"/><text x="480" y="280" font-family="sans-serif" font-size="30" text-anchor="middle" fill="#555">Bilden På bordet ${b.nr} saknas</text></svg>\n`);
      rapport.rutor.push(`bilden På bordet ${b.nr} (pabordet-${b.nr}.svg ligger inte bredvid metodfilen)`);
    }
  }
  // Bladens mått och skrivytor står i riggens pabordet.json, och kopians eget scripts/pabordetdata.mjs skriver in dem i
  // kopians src/data/pabordet.json, som flödet /ny-metod gör hos sajten (K-363, riggens brev 2026-10-16: ett blad med
  // andra mått än 960 × 540 stoppade annars bygget av kopian).
  if (existsSync(join(mapp, 'pabordet.json'))) {
    const { slug } = JSON.parse(readFileSync(join(mapp, 'pabordet.json'), 'utf8'));
    if (slug !== id) throw new Error(`pabordet.json bredvid metodfilen gäller ${slug}, inte ${id}. Ge rätt mapp eller --id.`);
    const p = kor(process.execPath, [join(kopia, 'scripts', 'pabordetdata.mjs'), mapp], { cwd: kopia });
    if (p.status !== 0) throw new Error(`scripts/pabordetdata.mjs gick inte i kopian:\n${p.stderr || p.stdout}`);
  }
  const omslag = [...new Set((d.ramar?.ramar ?? []).flatMap((r) => r.oversikt?.bilder ?? []))];
  for (const sokvag of omslag) {
    const mal = join(stod, id, sokvag);
    const riggens = join(mapp, sokvag);
    mkdirSync(dirname(mal), { recursive: true });
    if (existsSync(riggens)) copyFileSync(riggens, mal);
    else if (!existsSync(mal)) rapport.rutor.push({ omslag: sokvag, mal });
  }
  // Filmerna. Riggens fil har oftast inga filmblock, de kommer med filmpaketet. Har sajten metoden redan står dess
  // huvudfilm kvar i bilderna, så att sidan har sin form. Extrafilmerna pekar på platser i texten och tas inte med.
  const harFiler = (bas) => ['.svg', '.mp4', '-omslag.png', '-1.svg', '-2.svg', '-3.svg', '-4.svg'].every((slut) => existsSync(join(stod, `${bas}${slut}`)));
  if (!dok.has('film') && hade?.has('film')) {
    dok.set('film', hade.get('film', true));
    rapport.filmer.push('Riggens fil har inget filmblock. Huvudfilmen i bilderna är den som ligger ute i dag, och extrafilmerna visas inte.');
  }
  if (dok.has('film') && !harFiler(`${id}-film`)) { dok.delete('film'); rapport.filmer.push('Huvudfilmens filer finns inte hos sajten, så filmen visas inte.'); }
  const extra = dok.get('filmer');
  if (extra?.items) {
    for (let i = extra.items.length - 1; i >= 0; i--) {
      const nr = extra.items[i].get?.('nr');
      if (!harFiler(`${id}-film${nr}`)) { extra.items.splice(i, 1); rapport.filmer.push(`Film ${nr} har inga filer hos sajten och visas inte.`); }
    }
    if (!extra.items.length) dok.delete('filmer');
  }
  if (!dok.has('film')) {
    // Bygget kräver en huvudfilm av varje metod som inte väntar på sin film (src/lib/film.ts).
    const filmkod = join(kopia, 'src', 'lib', 'film.ts');
    const kod = readFileSync(filmkod, 'utf8');
    const med = kod.replace(/(VANTAR_PA_FILM: readonly string\[\] = \[)/, `$1'${id}', `);
    if (med !== kod) writeFileSync(filmkod, med);
    if (!rapport.filmer.length) rapport.filmer.push('Metoden har ingen film i bilderna: riggens fil har inget filmblock, och sajten har ingen film för metoden.');
  }
  return dok;
}

// Omslag som saknas blir grå rutor i omslagets form.
async function graRutor() {
  for (const r of rapport.rutor) {
    if (typeof r === 'string') continue;
    const ruta = sharp({ create: { width: 300, height: 450, channels: 3, background: '#d9d9d9' } });
    await (/\.png$/i.test(r.mal) ? ruta.png() : ruta.jpeg()).toFile(r.mal);
  }
  rapport.rutor = rapport.rutor.map((r) => (typeof r === 'string' ? r : `omslaget ${r.omslag} (ligger inte bredvid metodfilen)`));
}

// 3. Bygget. Stoppar schemat metoden tas det som stoppar bort ur kopian, och bygget prövas igen.
const utanFarg = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const visa = (stig) => stig.map((s, i) => (typeof s === 'number' ? `[${s}]` : `${i ? '.' : ''}${s}`)).join('') || 'överst i filen';
function bygg(dok) {
  for (let varv = 1; varv <= 8; varv++) {
    writeFileSync(metodfil, String(dok));
    const b = kor(process.execPath, [join(lank, 'astro', 'bin', 'astro.mjs'), 'build'], { cwd: kopia });
    if (b.status === 0 && existsSync(join(kopia, 'dist', 'stodundervisning', id, 'index.html'))) return;
    const logg = utanFarg(`${b.stdout}\n${b.stderr}`);
    writeFileSync(join(arbete, 'bygge.log'), logg);
    const schema = logg.match(new RegExp(`stodundervisning → ${id} data does not match collection schema\\.\\s*\\n([\\s\\S]*?)\\n\\s*Hint:`));
    if (!schema) {
      const fel = logg.split('\n').filter((r) => /error|Error|saknas|\[ERROR\]/.test(r)).slice(0, 12).join('\n');
      throw new Error(`Bygget av kopian stannade, och det är inte metodens fält som stoppar:\n${fel || logg.slice(-1500)}\nHela loggen: ${join(arbete, 'bygge.log')}`);
    }
    // Varje rad är "<plats>: <besked>", med platsen som fält och nummer med punkter emellan (**** är överst i filen).
    const rader = schema[1].split('\n').map((r) => r.trim()).filter(Boolean).map((r) => {
      const m = r.match(/^(\S+?): (.*)$/);
      const stig = !m || /^\*+$/.test(m[1]) ? [] : m[1].split('.').map((s) => (/^\d+$/.test(s) ? Number(s) : s));
      return { stig, besked: m ? m[2] : r };
    });
    const bort = [];
    for (const { stig, besked } of rader) {
      const okanda = besked.match(/^Unrecognized keys?: (.*)$/);
      if (okanda) { for (const n of okanda[1].matchAll(/"([^"]+)"/g)) bort.push({ stig: [...stig, n[1]], skal: 'sajtens schema har inte fältet' }); continue; }
      // Annars tas den närmaste delen i en lista bort: ramen, mallen, bilden eller raden som schemat stoppar.
      const sista = stig.findLastIndex((s) => typeof s === 'number');
      if (sista < 0) throw new Error(`Sajtens schema stoppar metoden på något som inte går att ta bort ur kopian:\n  ${visa(stig)}: ${besked}\nHela loggen: ${join(arbete, 'bygge.log')}`);
      bort.push({ stig: stig.slice(0, sista + 1), skal: `${visa(stig)}: ${besked}` });
    }
    // Djupast och sist först, så att numren före står kvar; det som ligger i något som redan är borttaget hoppas över.
    const nyckel = (s) => s.map((x) => (typeof x === 'number' ? String(x).padStart(6, '0') : x)).join('/');
    const unika = [...new Map(bort.map((x) => [nyckel(x.stig), x])).values()].sort((a, b) => (nyckel(a.stig) < nyckel(b.stig) ? 1 : -1));
    let tog = 0;
    for (const x of unika) {
      if (!dok.hasIn(x.stig)) continue;
      const nod = dok.getIn(x.stig);
      const namn = typeof x.stig.at(-1) === 'number' ? (nod?.get?.('rubrik') ?? nod?.get?.('titel') ?? nod?.get?.('typ')) : undefined;
      dok.deleteIn(x.stig);
      rapport.borttagna.push(`${visa(x.stig)}${namn ? ` (”${namn}”)` : ''}: ${x.skal}`);
      tog++;
    }
    if (!tog) throw new Error(`Sajtens schema stoppar metoden, och inget mer går att ta bort:\n${schema[1]}\nHela loggen: ${join(arbete, 'bygge.log')}`);
    console.log(`  varv ${varv}: schemat stoppade ${unika.length} ställen, de är borttagna ur kopian och bygget prövas igen`);
  }
  throw new Error(`Bygget gick inte igenom efter åtta varv. Loggen: ${join(arbete, 'bygge.log')}`);
}

// 4. Den byggda kopian visas av en egen liten server, och sidorna tas som bilder med sajtens skarmbild.mjs.
const TYPER = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.ico': 'image/x-icon', '.xml': 'application/xml' };
function server() {
  const dist = join(kopia, 'dist');
  return new Promise((klar) => {
    const s = createServer((req, res) => {
      const stig = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[\\/]+/, '');
      const kandidater = [join(dist, stig), join(dist, stig, 'index.html'), join(dist, `${stig}.html`)];
      const traff = stig.includes('..') ? undefined : kandidater.find((k) => existsSync(k) && lstatSync(k).isFile());
      if (!traff) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Finns inte'); return; }
      res.writeHead(200, { 'content-type': TYPER[extname(traff).toLowerCase()] ?? 'application/octet-stream' });
      res.end(readFileSync(traff));
    });
    s.listen(0, '127.0.0.1', () => klar(s));
  });
}

async function taBilder() {
  mkdirSync(ut, { recursive: true });
  // Förra körningens bilder tas bort först, så att mappen bara har bilder av sidan som den är nu.
  for (const f of readdirSync(ut)) {
    if (/^(lathund-)?(desktop|mobil)(-\d+)?\.png$/.test(f)) unlinkSync(join(ut, f));
    else if (/^lasbilder(-lathund)?(-mobil)?$/.test(f)) rmSync(join(ut, f), { recursive: true, force: true });
  }
  const s = await server();
  try {
    const bas = `http://127.0.0.1:${s.address().port}/stodundervisning/${id}`;
    const oppna = args.includes('--utfallt') ? ['--js', "document.querySelectorAll('details').forEach((d) => { d.open = true; })"] : [];
    // Väntas in utan att stanna processen: servern här ovanför ska kunna svara medan bilden tas.
    const bild = (adress, namn, extra = []) => promisify(execFile)(process.execPath, [join(rot, 'scripts', 'skarmbild.mjs'), adress, join(ut, namn), ...extra, ...oppna], { timeout: 600000 });
    await bild(bas, 'desktop.png');
    await bild(bas, 'mobil.png', ['--mobil']);
    if (existsSync(join(kopia, 'dist', 'stodundervisning', id, 'lathund', 'index.html'))) {
      await bild(`${bas}/lathund`, 'lathund-desktop.png');
      await bild(`${bas}/lathund`, 'lathund-mobil.png', ['--mobil']);
    }
  } finally { s.close(); }
  const bitar = await lasbilder(id, ut, [['desktop', 1700, 'lasbilder'], ['mobil', 2600, 'lasbilder-mobil'], ['lathund-desktop', 1700, 'lasbilder-lathund'], ['lathund-mobil', 2600, 'lasbilder-lathund-mobil']]);
  rapport.bilder = Object.entries(bitar).filter(([, b]) => b.length).map(([slag, b]) => `${b.length} bitar i ${basename(dirname(b[0]))}/ (${slag})`);
}

try {
  console.log(`forhandsbilder: ${id} ur ${kalla}`);
  const main = packaUpp();
  console.log(`  kopian är sajtens main: ${main}`);
  const dok = laggIn();
  await graRutor();
  console.log('  bygger kopian (omkring två minuter) …');
  bygg(dok);
  console.log('  tar bilderna …');
  await taBilder();
  const lista = (rubrik, rader, tomt) => `## ${rubrik}\n\n${rader.length ? rader.map((r) => `- ${r}`).join('\n') : tomt}\n`;
  writeFileSync(join(ut, 'FORHANDSBILD.md'), [
    `# Förhandsbilder: ${id}\n`,
    `Gjorda ${new Date().toLocaleString('sv-SE')} av sajtens scripts/forhandsbilder.mjs, ur ${kalla}. Bilderna visar metodens sida och lathundssidan byggda med koden på sajtens main (${main}). Inget är incheckat eller publicerat.${args.includes('--utfallt') ? ' Allt som fälls ut står utfällt.' : ' Det som fälls ut på sidan står hopfällt, som när läraren kommer dit; --utfallt visar det utfällt.'}\n`,
    lista('Borttaget ur kopian för att sajten inte har det', rapport.borttagna, 'Inget. Sajtens schema tog emot hela filen.'),
    lista('Grå rutor', rapport.rutor, 'Inga. Varje bild På bordet och varje omslag fanns bredvid metodfilen eller hos sajten.'),
    lista('Filmerna', rapport.filmer, 'Filmerna i bilderna är metodfilens egna.'),
    lista('Bilderna', rapport.bilder, 'Inga bilder.'),
  ].join('\n'));
  console.log(`\nKlart. Bilderna ligger i ${ut}:`);
  for (const r of rapport.bilder) console.log(`  ${r}`);
  for (const [rubrik, rader] of [['Borttaget ur kopian för att sajten inte har det', rapport.borttagna], ['Grå rutor', rapport.rutor], ['Filmerna', rapport.filmer]]) {
    if (!rader.length) continue;
    console.log(`\n${rubrik}:`);
    for (const r of rader) console.log(`  ${r}`);
  }
  console.log(`\nRapporten: ${join(ut, 'FORHANDSBILD.md')}`);
} catch (e) {
  console.error(`\nforhandsbilder: ${e.message}`);
  process.exitCode = 1;
} finally {
  stada();
}
