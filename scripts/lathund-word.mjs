#!/usr/bin/env node
// Word-lathundens storlek per sida, uppmätt i Word (K-055, Niclas 2026-09-27: docx-lathunden så nära PowerPoint som
// det går). Varje sida i lathunden får den största texten som ryms på en sida i Word, ett steg under för marginal
// mot andra program (LibreOffice, Word på Mac), och sedan så stor att den också ryms på en sida i Google Dokument
// (K-138: scripts/google.mjs, ett steg i taget mindre tills sidan ryms). Skriptet bygger sajten med LATHUND_WORDPROV=1, så att
// src/pages/utskrift/word/[fil].docx.ts gör varje sida i varje steg i LH_STEG (src/lib/metoddocx.ts), låter Word
// räkna sidorna (scripts/word-provsidor.ps1), skriver skalorna till src/data/lathund-word.json och tar bort
// provfilerna. Filen committas: Netlify har ingen Word. metoddocx.ts läser den i bygget och i webbläsaren, så att
// alla Word-filer med lathunden får samma storlekar. En kontrollsumma av allt som påverkar sidorna gör att
// kontrollen ser om en mätning är inaktuell, utan Word.
//
// Allt ur en källa utan drift (Niclas 2026-09-27): npm run validera kör --vid-behov, som mäter just de metoder som
// är ändrade och tar bort överblivna; bygget på Netlify kör --kontrollera och stannar om en inaktuell mätning pushats.
//
// Mätningen nycklas i två steg (K-462; Niclas 2026-10-19: "Du får gärna försöka fixa så denna validering i framtiden görs
// snabbare om det går"). Kontrollsumman (kalla) säger utan bygge om metoden eller koden har ändrats. Har den det byggs
// provfilerna, och deras innehåll (scripts/wordinnehall.mjs, utan det som skiftar mellan byggen) jämförs med innehållet
// när metoden mättes (innehall), tillsammans med mätningen själv (word-provsidor.ps1, google.mjs och MATNING här). Är
// provfilerna desamma ger Word och Google samma storlekar, och bara kontrollsumman skrivs om; Word och Google mäter bara
// de metoder vars lathund verkligen ser annorlunda ut. Förut mättes alla lathundar om, över en timme, vid varje ändring
// i Word-koden, också en som bara lade länkar i metodernas löptext.
//
//   node scripts/lathund-word.mjs                 alla metoder med lathund
//   node scripts/lathund-word.mjs <id> [<id>…]    bara de angivna
//   node scripts/lathund-word.mjs --vid-behov     bara de som saknas eller är inaktuella (körs i npm run validera)
//   node scripts/lathund-word.mjs --behov         skriv metoderna som --vid-behov skulle mäta, som JSON, och sluta
//   … --utan-bygge                                provfilerna finns redan i dist/utskrift/word (scripts/validera.mjs)
//   node scripts/lathund-word.mjs --kontrollera   stanna om en mätning saknas, är inaktuell eller överbliven
//   node scripts/lathund-word.mjs --fro           skriv provfilernas innehåll till mätningar som saknar det, utan Word, så
//                                                 att nästa ändring i koden jämförs med dem. Bara i en utcheckning där
//                                                 koden, metoderna och mätningarna är som i HEAD och mätningarna gäller
//                                                 HEAD (skriptet själv får vara nyare); annars stannar det
//
// Kräver Word och Google-inloggningen (DRIFT.md under Google Drive-knappen) när en metod ska mätas.

import { existsSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { googlePdf } from './google.mjs';
import { execFileSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import JSZip from 'jszip';
import { wordinnehall } from './wordinnehall.mjs';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const kontrollera = args.includes('--kontrollera');
const vidBehov = args.includes('--vid-behov');
const fro = args.includes('--fro');
const behovet = args.includes('--behov');
const utanBygge = args.includes('--utan-bygge');
const valda = args.filter((a) => !a.startsWith('--'));

const katalog = join(rot, 'src', 'content', 'stodundervisning');
const metoder = readdirSync(katalog)
  .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .map((f) => ({ id: f.replace(/\.yaml$/, ''), fil: join(katalog, f), data: parseYaml(readFileSync(join(katalog, f), 'utf8')) }))
  .filter((m) => m.data.lathund && !m.data.utkast);
const manifestFil = join(rot, 'src', 'data', 'lathund-word.json');

// Allt som påverkar hur sidorna läggs ut i Word: metodens text, koden som bygger dem, provsidan, mätningen och docx.
const gemensamma = ['src/lib/metoddocx.ts', 'src/lib/metod.ts', 'src/lib/brak.ts', 'src/lib/ramform.ts', 'src/data/teckenbredd.json', 'src/pages/utskrift/word/[fil].docx.ts', 'scripts/word-provsidor.ps1', 'scripts/lathund-word.mjs', 'scripts/google.mjs'];
const docxVersion = (() => { try { return JSON.parse(readFileSync(join(rot, 'node_modules', 'docx', 'package.json'), 'utf8')).version; } catch { return 'okänd'; } })();
const hashAv = (delar) => { const h = createHash('sha256'); for (const d of delar) h.update(d); return h.digest('hex').slice(0, 16); };
// Textfiler hashas med LF oavsett radslut: arbetskopian på Windows har CRLF, Netlifys utcheckning LF.
const lasKalla = (f) => Buffer.from(readFileSync(f, 'utf8').replace(/\r\n/g, '\n'));
const gemensamHash = hashAv([`word-lathund, docx ${docxVersion}`, ...gemensamma.map((f) => (existsSync(join(rot, f)) ? lasKalla(join(rot, f)) : Buffer.from(`saknas:${f}`)))]);
// Metodens del av kontrollsumman: metodens fil utan det som lathunden inte visar, så att ett nytt datum, en ändrad ruta
// överst eller en ny länk till en annan metod inte gör om lathunden (Niclas 2026-10-03: "Varför ändras lathunden av
// datumet?"). Lathundens kod (metodpptx.ts och lathundBarn i metoddocx.ts) läser inga av fälten; läser den ett av dem
// en dag, ändras koden och därmed den gemensamma delen, och alla lathundar görs om.
const INTE_I_LATHUNDEN = ['uppdaterad', 'publicerad', 'relaterade', 'utkast', 'upplagg', 'gruppen', 'principer', 'taggar', 'format'];
const metodKalla = (m) => { const d = { ...m.data }; for (const k of INTE_I_LATHUNDEN) delete d[k]; return Buffer.from(JSON.stringify(d)); };
const kallHash = (m) => hashAv([gemensamHash, metodKalla(m)]);
// Det som avgör storlekarna när provfilerna är desamma: sättet att mäta. Ändras stegen här (marginalen, Google-provet),
// räknas MATNING upp, så att alla lathundar mäts om.
const MATNING = 1;
const matHash = hashAv([`mätning ${MATNING}`, lasKalla(join(rot, 'scripts', 'word-provsidor.ps1')), lasKalla(join(rot, 'scripts', 'google.mjs'))]);
const lasManifest = () => { try { return JSON.parse(readFileSync(manifestFil, 'utf8')); } catch { return {}; } };
const skrivManifest = (manifest) => {
  const sorterad = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  writeFileSync(manifestFil, JSON.stringify(sorterad, null, 2) + '\n');
};
const giltig = (post) => Array.isArray(post?.skalor) && post.skalor.length === 4 && post.skalor.every((s) => typeof s === 'number' && s > 0);

if (kontrollera) {
  const manifest = lasManifest();
  const fel = [];
  for (const m of metoder) {
    const post = manifest[m.id];
    if (!post) fel.push(`${m.id}: saknas i src/data/lathund-word.json`);
    else if (post.kalla !== kallHash(m)) fel.push(`${m.id}: mätningen gäller en äldre metod eller äldre kod`);
    else if (!giltig(post)) fel.push(`${m.id}: skalorna är inte fyra tal`);
  }
  const publicerade = new Set(metoder.map((m) => m.id));
  for (const id of Object.keys(manifest)) if (!publicerade.has(id)) fel.push(`${id}: överbliven, metoden är borttagen, utkast eller utan lathund`);
  if (fel.length > 0) {
    console.error(`Word-lathundens mätning:\n  ${fel.join('\n  ')}\nKör: node scripts/lathund-word.mjs --vid-behov`);
    process.exit(1);
  }
  console.log(`Word-lathundens storlekar är uppmätta och aktuella för ${metoder.length} metoder.`);
  process.exit(0);
}

const manifest = lasManifest();
const publicerade = new Set(metoder.map((m) => m.id));
let bortagna = 0;
for (const id of Object.keys(manifest)) if (!publicerade.has(id)) { delete manifest[id]; bortagna++; }
if (fro) {
  // Provfilerna som byggs nu ska vara de som mättes: koden, metoderna och mätningarna som i HEAD, och mätningarna
  // aktuella för HEAD:s kod, räknat med HEAD:s version av det här skriptet.
  const git = (a) => execFileSync('git', a, { cwd: rot, encoding: 'utf8', maxBuffer: 1 << 26 });
  const andrade = git(['status', '--porcelain', '--', 'src', 'scripts']).split('\n').filter(Boolean).filter((r) => !/scripts\/lathund-word\.mjs$/.test(r));
  if (andrade.length) { console.error(`--fro vill ha en utcheckning som HEAD, men det här är ändrat:\n  ${andrade.join('\n  ')}`); process.exit(1); }
  const iHead = hashAv([`word-lathund, docx ${docxVersion}`, ...gemensamma.map((f) => (f === 'scripts/lathund-word.mjs' ? Buffer.from(git(['show', `HEAD:${f}`]).replace(/\r\n/g, '\n')) : existsSync(join(rot, f)) ? lasKalla(join(rot, f)) : Buffer.from(`saknas:${f}`)))]);
  const inaktuella = metoder.filter((m) => manifest[m.id]?.kalla !== hashAv([iHead, metodKalla(m)]) || !giltig(manifest[m.id]));
  if (inaktuella.length) { console.error(`--fro: mätningen gäller inte HEAD för ${inaktuella.map((m) => m.id).join(', ')}`); process.exit(1); }
}
const lista = fro
  ? metoder.filter((m) => !manifest[m.id].innehall)
  : vidBehov || behovet
  ? metoder.filter((m) => manifest[m.id]?.kalla !== kallHash(m) || !giltig(manifest[m.id]))
  : valda.length > 0 ? metoder.filter((m) => valda.includes(m.id)) : metoder;
// --behov: metoderna som behöver provfiler, som JSON, så att valideringen bygger dem i sitt enda bygge (K-484).
if (behovet) { console.log(JSON.stringify(lista.map((m) => m.id))); process.exit(0); }
if (lista.length === 0) {
  if (bortagna) skrivManifest(manifest);
  console.log(`Word-lathundens storlekar är aktuella för ${metoder.length} metoder.`);
  process.exit(0);
}
console.log(`${utanBygge ? 'Läser Word-lathundens provfiler ur bygget' : 'Bygger Word-lathundens provfiler'} för ${lista.map((m) => m.id).join(', ')} …`);
if (!utanBygge) execSync('npx astro build', { cwd: rot, stdio: 'ignore', env: { ...process.env, LATHUND_WORDPROV: '1', LATHUND_WORDPROV_IDS: lista.map((m) => m.id).join(',') } });
const provMapp = join(rot, 'dist', 'utskrift', 'word');
let fel = 0;
try {
  if (!existsSync(provMapp)) throw new Error('provfilerna saknas i dist/utskrift/word');
  // Provfilernas innehåll per metod: varje sida i varje steg, utan det som skiftar mellan byggen (bildernas löpnummer,
  // datumet, radsluten), så att samma lathund ger samma summa.
  // Word lägger också ut sidan efter inställningarna och typsnitten i filen, som wordinnehall inte räknar.
  const provfiler = (id) => readdirSync(provMapp).filter((f) => f.startsWith(`${id}--`) && f.endsWith('.docx')).sort();
  const ovrigt = async (data) => {
    const zip = await JSZip.loadAsync(data);
    const namn = Object.keys(zip.files).filter((n) => /^word\/(settings\.xml|fontTable\.xml|theme\/|fonts\/)/.test(n) && !zip.files[n].dir).sort();
    return createHash('sha256').update((await Promise.all(namn.map(async (n) => `${n}:${createHash('sha256').update(await zip.file(n).async('nodebuffer')).digest('hex')}`))).join('\n')).digest('hex');
  };
  const innehall = new Map();
  for (const m of lista) {
    const delar = [];
    for (const f of provfiler(m.id)) {
      const data = readFileSync(join(provMapp, f));
      delar.push(`${f}:${await wordinnehall(data, '', { allt: true })}:${await ovrigt(data)}`);
    }
    innehall.set(m.id, hashAv([matHash, ...delar.map((d) => Buffer.from(d))]));
  }
  if (fro) {
    for (const m of lista) manifest[m.id] = { ...manifest[m.id], innehall: innehall.get(m.id) };
    console.log(`  ok   provfilernas innehåll skrivet för ${lista.length} metoder, utan Word.`);
    lista.length = 0;
  }
  // Metoderna vars provfiler är desamma som när de mättes: bara kontrollsumman skrivs om, och deras provfiler tas bort
  // innan Word mäter de andra.
  const samma = lista.filter((m) => manifest[m.id]?.innehall === innehall.get(m.id) && giltig(manifest[m.id]));
  for (const m of samma) {
    manifest[m.id] = { ...manifest[m.id], kalla: kallHash(m) };
    for (const f of readdirSync(provMapp).filter((x) => x.startsWith(`${m.id}--`))) rmSync(join(provMapp, f));
  }
  if (samma.length) console.log(`  ok   ${samma.length} lathundar ser likadana ut som när de mättes och mäts inte om: ${samma.map((m) => m.id).join(', ')}`);
  lista.splice(0, lista.length, ...lista.filter((m) => !samma.includes(m)));
  if (lista.length) console.log(`Mäter Word-lathunden i Word och Google för ${lista.map((m) => m.id).join(', ')} …`);
  if (lista.length) {
  // Stegen som finns för varje sida, i procent.
  const steg = {};
  for (const f of readdirSync(provMapp)) {
    const t = f.match(/^(.+--\d)--(\d+)\.docx$/);
    if (t) (steg[t[1]] ??= []).push(Number(t[2]));
  }
  const ut = execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(rot, 'scripts', 'word-provsidor.ps1'), provMapp], { encoding: 'utf8', timeout: 1800000 });
  const matt = Object.fromEntries(ut.split(/\r?\n/).map((r) => r.match(/^(.+--\d)=(\d+)$/)).filter(Boolean).map((t) => [t[1], Number(t[2])]));
  for (const m of lista) {
    const skalor = [];
    for (const nr of [1, 2, 3, 4]) {
      const nyckel = `${m.id}--${nr}`;
      const alla = (steg[nyckel] ?? []).sort((a, b) => a - b);
      const storst = matt[nyckel] ?? 0;
      if (!storst) { skalor.push(0); continue; }
      // Ett steg under det största som ryms, för marginal; det minsta steget får stå kvar.
      const i = alla.indexOf(storst);
      skalor.push(alla[Math.max(0, i - 1)] / 100);
    }
    if (skalor.some((s) => !s)) {
      fel++;
      const sidor = skalor.map((s, i) => (s ? null : i + 1)).filter(Boolean).join(' och ');
      console.log(`  FEL  ${m.id}: sida ${sidor} i Word-lathunden ryms inte på en sida ens i minsta storleken; korta texten på den sidan`);
      continue;
    }
    // Samma sida ska rymmas i Google Dokument (K-138): Google ritar lathundens rutor i rutor något högre än Word, och en
    // sida som var full i Word fick en tom sida efter sig i Google (Upprepad läsning, Läslistor, Problemlösning
    // 2026-09-30). Varje sida prövas därför i Google i den storlek Word valde, och ett steg i taget mindre tills den
    // ryms på en sida (scripts/google.mjs, Toishi-riggens inloggning).
    const google = [];
    const rymsInte = [];
    for (const [i, nr] of [1, 2, 3, 4].entries()) {
      const alla = (steg[`${m.id}--${nr}`] ?? []).sort((a, b) => a - b);
      let j = alla.indexOf(Math.round(skalor[i] * 100));
      let sidor = 0;
      while (j >= 0) {
        const fil = join(provMapp, `${m.id}--${nr}--${alla[j]}.docx`);
        const pdf = join(provMapp, `${m.id}--${nr}--${alla[j]}-google.pdf`);
        writeFileSync(pdf, (await googlePdf(readFileSync(fil), { namn: `lathundprov ${m.id} ${nr} ${alla[j]}` })).pdf);
        sidor = execFileSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\f').slice(0, -1).length;
        if (sidor <= 1 || j === 0) break;
        j--;
      }
      if (sidor > 1) rymsInte.push(nr);
      if (alla[j] / 100 !== skalor[i]) google.push(`sida ${nr} ${Math.round(skalor[i] * 100)} → ${alla[j]} %`);
      skalor[i] = alla[j] / 100;
    }
    if (rymsInte.length) {
      fel++;
      console.log(`  FEL  ${m.id}: sida ${rymsInte.join(' och ')} i Word-lathunden ryms inte på en sida i Google Dokument ens i minsta storleken; korta texten eller rätta formen (METODER.md, Word och Google Dokument)`);
      continue;
    }
    manifest[m.id] = { kalla: kallHash(m), innehall: innehall.get(m.id), skalor, datum: new Date().toISOString().slice(0, 10) };
    console.log(`  ok   ${m.id}: ${skalor.map((s) => `${Math.round(s * 100)} %`).join(' · ')}${google.length ? ` (Google: ${google.join(', ')})` : ''}`);
  }
  }
} catch (e) {
  fel++;
  console.log(`  FEL  ${e.message}`);
} finally {
  // Provfilerna ska aldrig publiceras.
  try { rmSync(join(rot, 'dist', 'utskrift', 'word'), { recursive: true, force: true }); } catch { /* finns inte */ }
}
skrivManifest(manifest);
console.log(fel ? `\n${fel} fel.` : '\nAllt ok. Committa src/data/lathund-word.json tillsammans med ändringen.');
process.exit(fel ? 1 : 0);
