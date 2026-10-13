#!/usr/bin/env node
// Sidlåset för faktatexterna: var Word börjar en ny sida, uppmätt i Word, så att Google Dokument bryter sidan på samma
// ställe (Faktatextsamtal i grupp 2026-10-13; förebilden är metodriggens build/sidlas.mjs, Niclas 2026-10-07 om
// Google-provets obs: "Men granska detta med Obs och lös det då").
//
// En faktatext flödar över tre till fem sidor (faktatext i src/lib/metoddocx.ts). Word håller ihop en mellanrubrik med
// sitt avsnitt, en bild med sin bildtext och en ruta vars rad inte får delas, och flyttar hela blocket till nästa sida
// när det inte ryms. Google Dokument fyller sidan och delar, och bryter en rad som är en tiondels millimeter för lång på
// ett annat ställe: Virus och bakterier var fem sidor i Word och fyra i Google, och i Skräpet runt jorden delade Google
// fördjupningen som Word flyttade hel. En uttrycklig sidbrytning följer båda. Skriptet mäter därför, för varje metod med
// faktatexter, vilka delar av varje text (index i Faktatext.delar ur faktatextAv i src/lib/ramform.ts) som Word börjar
// en ny sida med, och skriver dem till src/data/sidlas.json. metoddocx.ts läser filen i bygget och i webbläsaren och
// sätter en sidbrytning före de delarna, i alla filer där texten står. Filen committas: Netlify har ingen Word.
//
// Det som låses, som hos riggen: en del som står överst på en sida i Words pdf, när sidan före har luft nederst, minst
// LUFT punkter. En sida som börjar mitt i en del, där ett avsnitt delas över två sidor, låses inte, och inte heller en
// del efter en full sida: där flödar texten, och ett lås gav en nästan tom sida om Google rymmer en rad mindre.
// Luften räknas från den sista textraden ned till textytans nederkant, som står i Word-filens sidinställningar. Riggen
// räknar mot den fullaste sidan i filen, eftersom dess lås inte vet sidans mått. Sidhuvudet och sidfoten står utanför
// textytan, så de behöver inte kännas igen på sin text, som hos riggen.
//
// Så går mätningen till: sajten byggs med SIDLAS_PROV=1, så att src/pages/utskrift/sidlas/[fil].docx.ts gör en Word-fil
// per metod med alla dess faktatexter utan lås (<id>.docx) och en med låsen som står i filen (<id>--last.docx). Word gör
// pdf av den olåsta (wordparitet, ps/word-pdf.ps1), Popplers pdftotext -bbox läser var varje ord står, och det som står
// överst i textytan på varje sida jämförs med det varje del börjar med, som Word-filen själv bär i sin beskrivning
// (faktatextensBorjan i metoddocx.ts), så att regeln om vad som är en del bara står i ramform.ts. Sedan prövas den låsta
// filen i Word: varje text ska ha lika många sidor och samma ord på varje sida som utan lås. Har låsen ändrats byggs
// sajten en gång till för det provet. Bygget går till en tillfällig mapp utanför repot och inte till dist, så att inget
// prov kan hamna i det som laddas upp och en förhandsvisning av dist inte störs, och mappen tas bort efteråt.
//
// En kontrollsumma av allt som påverkar sidorna gör att kontrollen ser om en mätning är inaktuell, utan Word: koden som
// bygger texterna, typsnitten, provsidan, det här skriptet, docx-bibliotekets version, och ur metodens fil dess namn,
// nivåer, ramarna som kan vara faktatexter och måtten på bilderna som står i dem. Låsen själva räknas inte in.
//
//   node scripts/sidlas.mjs                 alla metoder med faktatexter
//   node scripts/sidlas.mjs <id> [<id>…]    bara de angivna
//   node scripts/sidlas.mjs --vid-behov     bara de som saknas eller är inaktuella (körs i npm run validera)
//   node scripts/sidlas.mjs --kontrollera   stanna om en mätning saknas, är inaktuell eller överbliven (npm run build)
//   … --server http://localhost:4321        hämta provet från en utvecklingsserver som redan går, i stället för att bygga
//   … --visa                                skriv ut vad som står överst på varje sida, och behåll pdf:erna
//
// Kräver Word och Popplers pdftotext när en metod ska mätas. Bara en Word-körning åt gången.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { parse as parseYaml } from 'yaml';
import { wordPdfSync } from 'wordparitet';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const kontrollera = args.includes('--kontrollera');
const vidBehov = args.includes('--vid-behov');
const visa = args.includes('--visa');
const serverArg = args.indexOf('--server');
const server = serverArg >= 0 ? String(args[serverArg + 1] ?? '').replace(/\/$/, '') : '';
const valda = args.filter((a, i) => !a.startsWith('--') && (serverArg < 0 || i !== serverArg + 1));
if (serverArg >= 0 && !/^https?:\/\//.test(server)) { console.error('sidlas: --server vill ha en adress, som http://localhost:4321'); process.exit(1); }

const LUFT = 12; // punkter tomt nederst på sidan före, ungefär en rad, som hos riggen
const NYCKEL = 28; // så många bokstäver av det en del börjar med jämförs med sidans början

// En ram kan vara en faktatext när den har minst tre listor och en av dem är en faktaruta eller rutan Visste du att:
// det är kännetecknen som faktatextAv i src/lib/ramform.ts kräver. Här avgör de bara vilka metoder som mäts och vilka
// ramar som räknas in i kontrollsumman. Vilka ramar som är faktatexter, och deras delar, säger provfilen, och mätningen
// stannar om provfilen har en text som inte är en sådan ram, så att de två inte kan glida isär utan att det syns.
const kanVaraFaktatext = (ram) => (ram.listor ?? []).length >= 3 && (ram.listor ?? []).some((l) => /^Fakta: ./.test(l.rubrik ?? '') || l.rubrik === 'Visste du att …');

const katalog = join(rot, 'src', 'content', 'stodundervisning');
const metoder = readdirSync(katalog)
  .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .map((f) => ({ id: f.replace(/\.yaml$/, ''), data: parseYaml(readFileSync(join(katalog, f), 'utf8')) }))
  .filter((m) => !m.data.utkast && (m.data.ramar?.ramar ?? []).some(kanVaraFaktatext));
const manifestFil = join(rot, 'src', 'data', 'sidlas.json');

// Allt som påverkar hur faktatexternas sidor läggs ut i Word: koden som bygger dem och känner igen dem, måtten,
// typsnitten som Word-filen bär, provsidan, mätningen och docx.
const gemensamma = ['src/lib/metoddocx.ts', 'src/lib/ramform.ts', 'src/lib/boksida.ts', 'src/lib/pabordet.ts', 'src/data/faktatext/anton-bredder.json', 'src/pages/utskrift/sidlas/[fil].docx.ts', 'scripts/sidlas.mjs'];
const typsnitt = ['public/fonts/faktatext/Anton-dokument.ttf', 'public/fonts/ljudlek-elev/LjudlekElev-Regular.ttf'];
const docxVersion = (() => { try { return JSON.parse(readFileSync(join(rot, 'node_modules', 'docx', 'package.json'), 'utf8')).version; } catch { return 'okänd'; } })();
const hashAv = (delar) => { const h = createHash('sha256'); for (const d of delar) h.update(d); return h.digest('hex').slice(0, 16); };
// Textfiler hashas med LF oavsett radslut: arbetskopian på Windows har CRLF, Netlifys utcheckning LF. Typsnitten hashas
// som de är.
const lasKalla = (f) => (existsSync(join(rot, f)) ? Buffer.from(readFileSync(join(rot, f), 'utf8').replace(/\r\n/g, '\n')) : Buffer.from(`saknas:${f}`));
const lasBinar = (f) => (existsSync(join(rot, f)) ? readFileSync(join(rot, f)) : Buffer.from(`saknas:${f}`));
const gemensamHash = hashAv([`sidlas, docx ${docxVersion}`, ...gemensamma.map(lasKalla), ...typsnitt.map(lasBinar)]);
// Metodens del av kontrollsumman: bara det som faktatexternas sidor byggs av. Ramarna som kan vara faktatexter, med
// rutan Till läraren som står i sidfoten, bilderna som står i dem med sina mått (src/data/pabordet.json), och metodens
// namn och nivåer, som står i sidfoten. Ett nytt datum, en ändrad lärarsida eller en bilds textalternativ gör inte om
// mätningen.
const bilddata = (() => { try { return JSON.parse(readFileSync(join(rot, 'src', 'data', 'pabordet.json'), 'utf8')); } catch { return {}; } })();
const metodKalla = (m) => {
  const ramar = (m.data.ramar?.ramar ?? []).filter(kanVaraFaktatext);
  const rubriker = new Set(ramar.map((r) => r.rubrik));
  const bilder = (m.data.pabordet ?? []).filter((b) => rubriker.has(String(b.efter ?? '').match(/^ram:\s*(.+)$/)?.[1]?.trim()))
    .map((b) => { const x = bilddata[m.id]?.[String(b.nr)] ?? {}; return { nr: b.nr, rubrik: b.rubrik, efter: b.efter, bredd: x.bredd ?? null, hojd: x.hojd ?? null, skala: x.skala ?? null }; });
  return Buffer.from(JSON.stringify({ titel: m.data.titel, nivaer: m.data.nivaer ?? [], ramar, bilder }));
};
const kallHash = (m) => hashAv([gemensamHash, metodKalla(m)]);
const lasManifest = () => { try { return JSON.parse(readFileSync(manifestFil, 'utf8')); } catch { return {}; } };
const skrivManifest = (manifest) => {
  const sorterad = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  writeFileSync(manifestFil, JSON.stringify(sorterad, null, 2) + '\n');
};
const giltig = (post) => !!post?.las && typeof post.las === 'object' && Object.values(post.las).every((l) => Array.isArray(l) && l.every((n) => Number.isInteger(n) && n >= 0));

if (kontrollera) {
  const manifest = lasManifest();
  const fel = [];
  for (const m of metoder) {
    const post = manifest[m.id];
    if (!post) fel.push(`${m.id}: saknas i src/data/sidlas.json`);
    else if (post.kalla !== kallHash(m)) fel.push(`${m.id}: mätningen gäller äldre faktatexter eller äldre kod`);
    else if (!giltig(post)) fel.push(`${m.id}: låsen är inte listor med delarnas nummer`);
  }
  const medTexter = new Set(metoder.map((m) => m.id));
  for (const id of Object.keys(manifest)) if (!medTexter.has(id)) fel.push(`${id}: överbliven, metoden är borttagen, utkast eller utan faktatexter`);
  if (fel.length > 0) {
    console.error(`Sidlåsets mätning:\n  ${fel.join('\n  ')}\nKör: node scripts/sidlas.mjs --vid-behov`);
    process.exit(1);
  }
  const antal = metoder.reduce((s, m) => s + Object.values(manifest[m.id].las).reduce((a, l) => a + l.length, 0), 0);
  console.log(`Sidlåset är uppmätt och aktuellt för ${metoder.length} ${metoder.length === 1 ? 'metod' : 'metoder'} med faktatexter (${antal} lås).`);
  process.exit(0);
}

const manifest = lasManifest();
const medTexter = new Set(metoder.map((m) => m.id));
let borttagna = 0;
for (const id of Object.keys(manifest)) if (!medTexter.has(id)) { delete manifest[id]; borttagna++; }
const okanda = valda.filter((id) => !medTexter.has(id));
if (okanda.length) { console.error(`sidlas: ${okanda.join(', ')} är ingen publicerad metod med faktatexter.`); process.exit(1); }
const lista = vidBehov
  ? metoder.filter((m) => manifest[m.id]?.kalla !== kallHash(m) || !giltig(manifest[m.id]))
  : valda.length > 0 ? metoder.filter((m) => valda.includes(m.id)) : metoder;
if (lista.length === 0) {
  if (borttagna) skrivManifest(manifest);
  console.log(`Sidlåset är aktuellt för ${metoder.length} ${metoder.length === 1 ? 'metod' : 'metoder'} med faktatexter.`);
  process.exit(0);
}

// ---------------------------------------------------------------- pdf:ens sidor
const bokstaver = (s) => (String(s).normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]/gu) ?? []).join('');
const avkoda = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, '&');

// Popplers pdftotext, som kan -bbox. På den här datorn ligger xpdfs pdftotext först i sökvägen i Git Bash (riggens kod).
function popplersPdftotext() {
  const namn = process.platform === 'win32' ? 'pdftotext.exe' : 'pdftotext';
  for (const dir of (process.env.PATH ?? '').split(delimiter).filter(Boolean)) {
    const fil = join(dir, namn);
    if (!existsSync(fil)) continue;
    const r = spawnSync(fil, ['-v'], { encoding: 'utf8' });
    if (/poppler/i.test(`${r.stdout}${r.stderr}`)) return fil;
  }
  return null;
}

// Textytan på provfilens sidor, i punkter från sidans överkant: mellan den övre och den nedre marginalen, ur Word-filens
// egna sidinställningar. Provfilen har bara faktatexter, så alla sektioner har samma mått. Sidhuvudet och sidfoten står
// utanför textytan och räknas inte.
function textytan(xml) {
  const sida = xml.match(/<w:pgSz\b[^>]*\bw:h="(\d+)"/), marg = xml.match(/<w:pgMar\b[^>]*>/)?.[0] ?? '';
  const topp = marg.match(/\bw:top="(\d+)"/), botten = marg.match(/\bw:bottom="(\d+)"/);
  if (!sida || !topp || !botten) throw new Error('provfilens sidinställningar gick inte att läsa');
  return { topp: Number(topp[1]) / 20, botten: (Number(sida[1]) - Number(botten[1])) / 20 };
}

// Sidorna i pdf:en: det som står överst i textytan, läst uppifrån och från vänster, var texten slutar nedåt, och sidans
// ord i bokstavsordning, för jämförelsen av filen med lås mot filen utan.
function sidorI(pdf, yta, pdftotext) {
  const r = spawnSync(pdftotext, ['-enc', 'UTF-8', '-bbox', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`pdftotext -bbox gick inte på ${pdf}: ${String(r.stderr).slice(0, 200)}`);
  return [...r.stdout.matchAll(/<page width="[\d.]+" height="[\d.]+">([\s\S]*?)<\/page>/g)].map((m) => {
    const ord = [...m[1].matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="[\d.]+" yMax="([\d.]+)">([^<]*)<\/word>/g)]
      .map((w) => ({ x: Number(w[1]), y0: Number(w[2]), y1: Number(w[3]), text: avkoda(w[4]) }))
      // Ett ord hör till textytan när dess mitt står i den: radens ruta i pdf:en är typsnittets hela höjd, som sticker ut
      // någon punkt över och under raden.
      .filter((w) => (w.y0 + w.y1) / 2 > yta.topp && (w.y0 + w.y1) / 2 < yta.botten);
    // Raderna: ord vars mitt står inom radens höjd hör till samma rad, och raden läses från vänster. Marginalspaltens
    // ord står på samma rader som textspaltens och kommer efter dem.
    const rader = [];
    for (const w of [...ord].sort((a, b) => a.y0 - b.y0 || a.x - b.x)) {
      const rad = rader.find((q) => (w.y0 + w.y1) / 2 > q.y0 && (w.y0 + w.y1) / 2 < q.y1);
      if (rad) { rad.ord.push(w); rad.y0 = Math.min(rad.y0, w.y0); rad.y1 = Math.max(rad.y1, w.y1); } else rader.push({ y0: w.y0, y1: w.y1, ord: [w] });
    }
    rader.sort((a, b) => a.y0 - b.y0);
    const topp = bokstaver(rader.slice(0, 8).map((q) => q.ord.sort((a, b) => a.x - b.x).map((w) => w.text).join(' ')).join(' ')).slice(0, 240);
    return { topp, nederst: ord.length ? Math.max(...ord.map((w) => w.y1)) : yta.topp, ord: ord.map((w) => w.text).sort().join(' ') };
  });
}

// Det provfilen själv säger om sina texter: ramens rubrik, det texten börjar med och det varje del börjar med.
async function provetsTexter(zip) {
  const karna = await zip.file('docProps/core.xml')?.async('string');
  const json = karna?.match(/<dc:description>([\s\S]*?)<\/dc:description>/)?.[1];
  try { return JSON.parse(avkoda(json ?? '')).texter; } catch { throw new Error('provfilen bär inte texternas delar i sin beskrivning (faktatextProvDokument i src/lib/metoddocx.ts)'); }
}

// En provfils texter, sida för sida: vilken del som står överst på varje sida (−1 mitt i en del), luften nederst på
// sidan före, och sidans ord.
async function matt(docx, pdf, pdftotext) {
  const zip = await JSZip.loadAsync(docx);
  const xml = await zip.file('word/document.xml').async('string');
  const texter = await provetsTexter(zip);
  const yta = textytan(xml);
  const sidor = sidorI(pdf, yta, pdftotext);
  const ut = texter.map((t) => ({ rubrik: t.rubrik, delar: t.delar, sidor: [] }));
  let nr = -1;
  for (const s of sidor) {
    const nasta = texter[nr + 1];
    if (nasta && s.topp.startsWith(bokstaver(nasta.borjar).slice(0, NYCKEL))) nr++;
    if (nr < 0) throw new Error(`provfilens första sida börjar inte med den första texten (${texter[0]?.rubrik})`);
    ut[nr].sidor.push(s);
  }
  if (nr !== texter.length - 1) throw new Error(`texten ${texter[nr + 1].rubrik} hittades inte i Words pdf: ingen sida börjar med ${texter[nr + 1].borjar}`);
  for (const t of ut) {
    let forra = -1;
    t.sidor.forEach((s, k) => {
      s.del = -1;
      s.luft = k ? Math.round(yta.botten - t.sidor[k - 1].nederst) : 0;
      if (!k) return;
      // Delarna står i ordning, så den som börjar sidan står efter den som började en tidigare sida.
      for (let j = forra + 1; j < t.delar.length; j++) {
        const nyckel = bokstaver(t.delar[j]).slice(0, NYCKEL);
        if (nyckel.length >= 4 && s.topp.startsWith(nyckel)) { s.del = j; forra = j; break; }
      }
    });
  }
  return ut;
}
const lasenAv = (texter) => Object.fromEntries(texter.map((t) => [t.rubrik, t.sidor.flatMap((s) => (s.del >= 0 && s.luft >= LUFT ? [s.del] : []))]));
const likaLas = (a, b) => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
const antalLas = (las) => Object.values(las ?? {}).reduce((a, l) => a + l.length, 0);

// ---------------------------------------------------------------- provfilerna
const arbetsmapp = join(tmpdir(), 'niclasfohlin-sidlas');
rmSync(arbetsmapp, { recursive: true, force: true });
mkdirSync(arbetsmapp, { recursive: true });
const byggmapp = join(arbetsmapp, 'dist');
const distProv = join(byggmapp, 'utskrift', 'sidlas');
const provnamn = (id, last) => `${id}${last ? '--last' : ''}.docx`;
// Bygger sajten med provsidan påslagen, för de här metoderna, till den tillfälliga mappen. Provfilerna hamnar i
// utskrift/sidlas där. Går bygget inte följer slutet av dess utskrift med felet.
const bygg = (ids) => {
  rmSync(byggmapp, { recursive: true, force: true });
  try {
    execSync(`npx astro build --outDir "${byggmapp}"`, { cwd: rot, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 27, env: { ...process.env, SIDLAS_PROV: '1', SIDLAS_PROV_IDS: ids.join(',') } });
  } catch (e) {
    throw new Error(`bygget med provsidan gick inte (npx astro build): ${`${e.stdout ?? ''}${e.stderr ?? ''}`.replace(/\x1b\[[0-9;]*m/g, '').trim().split(/\r?\n/).slice(-6).join(' | ').slice(0, 900)}`);
  }
};
// En provfil som en Buffer: ur bygget, eller hämtad från utvecklingsservern. Provsidan gör en fil också för en metod
// utan faktatexter, så en fil som saknas betyder att provet inte byggdes.
async function prov(id, last) {
  if (!server) {
    const fil = join(distProv, provnamn(id, last));
    if (!existsSync(fil)) throw new Error(`provfilen utskrift/sidlas/${provnamn(id, last)} byggdes inte (src/pages/utskrift/sidlas/[fil].docx.ts, SIDLAS_PROV)`);
    return readFileSync(fil);
  }
  const svar = await fetch(`${server}/utskrift/sidlas/${provnamn(id, last)}`, { cache: 'no-store' });
  if (!svar.ok) throw new Error(`${server}/utskrift/sidlas/${provnamn(id, last)} svarade ${svar.status}: ${(await svar.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300)}`);
  return Buffer.from(await svar.arrayBuffer());
}
// Word-filen till disk och Words pdf av den.
function tillPdf(namn, docx) {
  const fil = join(arbetsmapp, `${namn}.docx`), pdf = join(arbetsmapp, `${namn}.pdf`);
  writeFileSync(fil, docx);
  wordPdfSync(fil, pdf, { timeout: 900000 });
  return pdf;
}
// Antalet uttryckliga sidbrytningar i en provfil: så många lås har filen.
const brytningarI = async (docx) => ((await (await JSZip.loadAsync(docx)).file('word/document.xml').async('string')).match(/<w:pageBreakBefore\/>/g) ?? []).length;

const pdftotext = popplersPdftotext();
if (!pdftotext) { console.error('sidlas: Popplers pdftotext saknas i sökvägen, så sidorna kan inte läsas (pdftotext -bbox).'); process.exit(1); }
console.log(`Mäter sidlåset i Word för ${lista.map((m) => m.id).join(', ')} …`);
const fore = JSON.stringify(manifest);
let fel = 0;
try {
  if (!server) bygg(lista.map((m) => m.id));
  // Mätningen: den olåsta filen, sida för sida.
  const matta = [];
  for (const m of lista) {
    try {
      const docx = await prov(m.id, false);
      // En provfil utan texter: ramarna som såg ut som faktatexter är inte det. Metoden har då inga lås, och Word behövs inte.
      const texter = (await provetsTexter(await JSZip.loadAsync(docx))).length ? await matt(docx, tillPdf(m.id, docx), pdftotext) : [];
      const kandidater = new Set((m.data.ramar?.ramar ?? []).filter(kanVaraFaktatext).map((r) => r.rubrik));
      const utanfor = texter.filter((t) => !kandidater.has(t.rubrik)).map((t) => t.rubrik);
      if (utanfor.length) throw new Error(`provfilen har faktatexter som skriptets kännetecken inte ser (${utanfor.join(', ')}): rätta kanVaraFaktatext i scripts/sidlas.mjs efter faktatextAv i src/lib/ramform.ts`);
      matta.push({ m, texter, las: lasenAv(texter), andrad: !likaLas(lasenAv(texter), manifest[m.id]?.las) });
      if (visa) for (const t of texter) {
        console.log(`  ${t.rubrik}: ${t.sidor.length} sidor`);
        t.sidor.forEach((s, k) => { if (k) console.log(`    sida ${k + 1}  luft ${String(s.luft).padStart(3)}  ${s.del < 0 ? 'mitt i en del, låses inte' : `del ${s.del} (${t.delar[s.del].slice(0, 40)}): ${s.luft >= LUFT ? 'låses' : 'full sida före, låses inte'}`}`); });
      }
    } catch (e) {
      fel++;
      console.log(`  FEL  ${m.id}: ${e.message}`);
    }
  }
  // Låsen skrivs, så att filen med lås kan byggas och prövas. Datumet står kvar när ingenting har ändrats, så att en
  // mätning till inte ändrar filen.
  for (const x of matta) {
    const forra = manifest[x.m.id];
    const kalla = kallHash(x.m);
    manifest[x.m.id] = { kalla, datum: forra && forra.kalla === kalla && !x.andrad ? forra.datum : new Date().toISOString().slice(0, 10), las: x.las };
  }
  skrivManifest(manifest);
  // Provet av filen med lås: Word ska bryta sidorna som före låset. Bygget har redan filen när låsen är de som stod i
  // src/data/sidlas.json; annars byggs sajten en gång till. Utvecklingsservern läser den nya filen själv, och provet
  // väntar tills den gör det.
  const medLas = matta.filter((x) => antalLas(x.las) > 0);
  if (!server && medLas.some((x) => x.andrad)) bygg(medLas.map((x) => x.m.id));
  for (const x of medLas) {
    try {
      let docx = await prov(x.m.id, true);
      for (let n = 0; server && n < 20 && (await brytningarI(docx)) !== antalLas(x.las); n++) { await new Promise((r) => setTimeout(r, 1500)); docx = await prov(x.m.id, true); }
      if (!docx || (await brytningarI(docx)) !== antalLas(x.las)) throw new Error(`filen med lås har ${docx ? await brytningarI(docx) : 0} sidbrytningar, och mätningen ${antalLas(x.las)} lås${server ? ': utvecklingsservern har inte läst den nya src/data/sidlas.json' : ''}`);
      const last = await matt(docx, tillPdf(`${x.m.id}--last`, docx), pdftotext);
      const skiljer = [];
      x.texter.forEach((t, i) => {
        const l = last[i];
        if (l.sidor.length !== t.sidor.length) { skiljer.push(`${t.rubrik}: ${l.sidor.length} sidor med lås mot ${t.sidor.length} utan`); return; }
        const sida = t.sidor.findIndex((s, k) => s.ord !== l.sidor[k].ord);
        if (sida >= 0) skiljer.push(`${t.rubrik}: sidan ${sida + 1} har andra ord med lås än utan`);
      });
      if (skiljer.length) throw new Error(`Word bryter sidorna annorlunda med låsen:\n       ${skiljer.join('\n       ')}`);
    } catch (e) {
      fel++;
      x.fel = true;
      console.log(`  FEL  ${x.m.id}: ${e.message}`);
    }
  }
  for (const x of matta) {
    if (x.fel) continue;
    const sidor = x.texter.reduce((a, t) => a + t.sidor.length, 0);
    const lasta = x.texter.filter((t) => x.las[t.rubrik].length).map((t) => `${t.rubrik} (${x.las[t.rubrik].map((j) => { const k = t.sidor.findIndex((s) => s.del === j); return `sidan ${k + 1}: ${t.delar[j].slice(0, 32).trim()}`; }).join('; ')})`);
    console.log(`  ok   ${x.m.id}: ${x.texter.length} faktatexter, ${sidor} sidor i Word, ${antalLas(x.las)} lås${x.andrad ? '' : ', som förut'}${lasta.length ? `\n         ${lasta.join('\n         ')}` : ''}`);
  }
  // En metod vars lås inte höll provet får inte stå som mätt: det som stod före mätningen står kvar, och kontrollen
  // stannar tills felet är löst.
  if (matta.some((x) => x.fel)) {
    const gammal = JSON.parse(fore);
    for (const x of matta.filter((y) => y.fel)) { if (gammal[x.m.id]) manifest[x.m.id] = gammal[x.m.id]; else delete manifest[x.m.id]; }
    skrivManifest(manifest);
  }
} catch (e) {
  fel++;
  console.log(`  FEL  ${e.message}`);
  // Ett fel före provet av filen med lås: låsen som redan är skrivna är inte prövade, så det som stod före står kvar.
  skrivManifest(JSON.parse(fore));
} finally {
  // Det tillfälliga bygget tas alltid bort. Word-filerna och pdf:erna står kvar bara när de ska visas.
  try { rmSync(byggmapp, { recursive: true, force: true }); } catch { /* finns inte */ }
  if (visa) console.log(`  pdf:erna ligger i ${arbetsmapp}`); else try { rmSync(arbetsmapp, { recursive: true, force: true }); } catch { /* en pdf kan vara öppen */ }
}
console.log(fel ? `\n${fel} fel.` : '\nAllt ok. Committa src/data/sidlas.json tillsammans med ändringen.');
process.exit(fel ? 1 : 0);
