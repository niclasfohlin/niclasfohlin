#!/usr/bin/env node
// Ritar Google Dokument en Word-fil som Word gör? (Niclas 2026-09-30: bråken och radavstånden blev fel i Google Dokument
// fast de var rätt i Word, och "Du behöver lägga in något form av mekanik och script för att enkelt göra rimlig
// paritet mellan Word och drive", K-138.)
//
// För varje Word-fil gör skriptet två pdf:er. Words egen (scripts/word-pdf.ps1), sparad efter filens innehåll så att
// en oförändrad fil inte görs om. Google Dokuments (scripts/google.mjs), som när läraren gör om filen till ett
// Google-dokument; Drive-knappen sparar Word-filen som den är, och Google Dokument öppnar den i Office-läget, där Drives
// egen bild av filen ritade filmens bilder på samma sätt (2026-09-30). Sedan jämförs de automatiskt (Niclas: "Granska
// dem ska du göra. Automatiskt"). Det här stoppar (NEJ):
//
//   blocken      varje ställe där Word-filen själv börjar en ny sida (sektion, sidbrytning före) börjar en sida också i
//                Google, och blocket fram till nästa tar inte fler sidor i Google än i Word (sidankare)
//   tomma sidor  ingen sida är tom i Google när Words sida med samma nummer har text
//   texten       inget tecken i Word saknas i Google; ekvationerna räknas inte, Google ritar dem utan text i pdf:en
//   ordbrytning  inget ord bryts mitt i, utan bindestreck, i någon av dem ("Personbeskrivni" och "ng")
//
// Skillnader i den fria texten inne i ett block visas som obs, med första sidan som skiljer sig: Word håller ihop en
// tabell vars rader har "håll ihop med nästa", Google delar den, så Google kan få färre sidor med samma innehåll.
// Skriptet ritar ett översiktsark per fil med Words sidor över Googles, som läses sida för sida före uppladdningen.
//
//   node scripts/googleprov.mjs <fil.docx | metodens id> … [--mapp] [--sidor 1,21]
//   node scripts/googleprov.mjs --andrade [--mapp]   Word-filerna i dist som skiljer sig från dem som ligger ute
//   node scripts/googleprov.mjs --alla [--mapp]      alla Word-filer i dist
//   … --igen                                         jämför de senast hämtade pdf:erna igen, utan uppladdning
//
// --mapp lägger Google-versionerna i testmappen "Prov före uppladdning · niclasfohlin.se" (Niclas: "Skapa en testmapp
// där man testar enkelt innan uppladdning"), där en ny version skriver över samma dokument med samma länk. Ett id tar
// dist/stodundervisning/<id>.docx (kör npm run validera först). Pdf:erna och översiktsarken hamnar i
// underlag/prov/google/. Stannar med kod 1 om en kontroll inte går igenom. Kräver Word, pdftotext, pdftoppm och
// Toishi-riggens Google-inloggning (DRIFT.md under Google Drive-knappen).
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { googlePdf, testmappen } from './google.mjs';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const kraver = createRequire(import.meta.url);
const JSZip = kraver('jszip');
const sharp = kraver('sharp');
const kor = promisify(execFile);
const args = process.argv.slice(2);
const sidArg = args.indexOf('--sidor');
const sidor = sidArg >= 0 ? args[sidArg + 1].split(',').map(Number) : [];
const mapp = args.includes('--mapp');
const DIST = join(rot, 'dist/stodundervisning');
const UT = join(rot, 'underlag/prov/google');
// Gränsen för en sida: under 90 procent av bokstäverna gemensamma skiljer sig sidan.
const SIDLIKHET = 0.9;
const sha = (b) => createHash('sha256').update(b).digest('hex');

// Word-filens innehåll utan det som skiljer två byggen av samma fil åt: byggets tidsstämpel (docProps/core.xml),
// nyckeln som det inbäddade typsnittet är förvrängt med (fontTable.xml, word/fonts/) och bildernas byte. SVG-filerna har
// CRLF i arbetskopian på Windows och LF på Netlify, en reservbild får samma pixlar men andra byte i PNG-filen på Linux,
// och bildernas filnamn är en kontrollsumma av bilden. Bilderna jämförs därför efter innehållet: SVG med LF, PNG och
// JPEG efter pixlarna (2026-09-30: 13 av 49 filer skilde sig annars mellan byggena på datorn och på Netlify av samma
// kod).
async function innehall(buf) {
  const zip = await JSZip.loadAsync(buf);
  const delar = [];
  const bilder = [];
  for (const n of Object.keys(zip.files).sort()) {
    if (zip.files[n].dir || /^docProps\/core\.xml$|^word\/fontTable\.xml$|^word\/fonts\/|\.rels$/.test(n)) continue;
    const data = await zip.file(n).async('nodebuffer');
    if (/^word\/media\/.+\.(png|jpe?g)$/i.test(n)) {
      const { data: px, info } = await sharp(data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      bilder.push(`${info.width}x${info.height}:${sha(px)}`);
    } else if (n.startsWith('word/media/')) bilder.push(sha(Buffer.from(data.toString('latin1').replace(/\r\n/g, '\n'), 'latin1')));
    else delar.push(`${n}:${sha(data)}`);
  }
  return sha([...delar, ...bilder.sort()].join('\n'));
}

let filer = args.filter((a, i) => !a.startsWith('--') && (sidArg < 0 || i !== sidArg + 1))
  .map((a) => (a.toLowerCase().endsWith('.docx') ? a : join(DIST, `${a}.docx`)));
if (args.includes('--alla') || args.includes('--andrade')) {
  // Samlingsfilen med alla metoder är för stor för Google Drives export (exportSizeLimitExceeded); den är varje metods
  // egen fil i följd, och de granskas var för sig.
  filer = readdirSync(DIST).filter((f) => f.endsWith('.docx') && f !== 'alla-metoder.docx').map((f) => join(DIST, f));
  if (args.includes('--andrade')) {
    const andrade = [];
    for (const f of filer) {
      const ute = await fetch(`https://niclasfohlin.se/stodundervisning/${basename(f)}?v=${Date.now()}`);
      if (!ute.ok || (await innehall(Buffer.from(await ute.arrayBuffer()))) !== (await innehall(readFileSync(f)))) andrade.push(f);
    }
    filer = andrade;
    console.log(`${filer.length} Word-filer skiljer sig från dem som ligger ute.`);
  }
}
if (!filer.length) { console.log('googleprov: inga Word-filer att pröva.'); process.exit(0); }
for (const f of filer) if (!existsSync(f)) { console.error(`googleprov: ${f} finns inte.`); process.exit(1); }

// Texten i Word-filen: orden, och ekvationernas tecken. Stycken och celler skiljer orden åt; ett hårt bindestreck
// (sss-ooo-lll) är ett bindestreck, och fältkoderna (sidnumret) räknas inte.
const ord = (text) => text.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const antal = (lista) => lista.reduce((m, o) => m.set(o, (m.get(o) ?? 0) + 1), new Map());
const bokstaver = (text) => antal(text.normalize('NFC').toLowerCase().match(/\p{L}/gu) ?? []);
const tecken = (text) => antal(text.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]/gu) ?? []);
const avkoda = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
async function wordText(fil) {
  const zip = await JSZip.loadAsync(readFileSync(fil));
  let text = '';
  let ekvationer = '';
  const rubrikrader = new Set();
  const sidhuvud = new Set();
  for (const d of Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n))) {
    const xml = await zip.file(d).async('string');
    for (const m of xml.matchAll(/<m:oMath\b[\s\S]*?<\/m:oMath>/g)) ekvationer += ` ${[...m[0].matchAll(/<m:t(?:\s[^>]*)?>([^<]*)<\/m:t>/g)].map((t) => t[1]).join(' ')}`;
    // Det som upprepas på varje sida och därför står olika många gånger när Word och Google bryter sidorna olika:
    // cellerna i tabellernas rubrikrader (överst på varje sida där tabellen fortsätter) och styckena i sidhuvud och
    // sidfot. Varje cell och stycke räknas för sig, eftersom pdftotext kan läsa dem i en annan ordning.
    // Den hittas på sina bokstäver (sidfotens sidnummer är fält och står inte i filen), och dess siffror följer med.
    const texten = (x) => avkoda((x.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join('')).normalize('NFC').toLowerCase();
    const delar = /^word\/(header|footer)/.test(d) ? xml.split(/<\/w:p>/) : [...xml.matchAll(/<w:tr><w:trPr>(?:(?!<\/w:trPr>).)*<w:tblHeader\b(?:(?!<\/w:trPr>).)*<\/w:trPr>((?:(?!<\/w:tr>).)*)<\/w:tr>/gs)].flatMap((m) => m[1].split(/<\/w:tc>/));
    for (const x of delar) {
      const t = texten(x);
      const b = (t.match(/\p{L}/gu) ?? []).join('');
      if (b.length >= 4) rubrikrader.add(`${b}|${(t.match(/\p{N}/gu) ?? []).join('')}`);
      if (b.length >= 4 && /^word\/(header|footer)/.test(d)) sidhuvud.add((t.match(/[\p{L}\p{N}]/gu) ?? []).join(''));
    }
    text += ' ' + xml.replace(/<m:oMath\b[\s\S]*?<\/m:oMath>/g, ' ').replace(/<w:instrText\b[^>]*>[^<]*<\/w:instrText>/g, ' ')
      .replace(/<\/w:p>|<\/w:tc>|<w:tab\/>|<w:br\/>/g, ' ').replace(/<w:noBreakHyphen\/>/g, '-')
      .replace(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g, '$1').replace(/<[^>]+>/g, '');
  }
  return {
    ord: new Set(ord(avkoda(text))),
    ekvationer: tecken(avkoda(ekvationer)),
    rubrikrader: [...rubrikrader].map((r) => { const [bokst, siffror] = r.split('|'); return { bokst, siffror }; }),
    sidhuvud: [...sidhuvud].sort((a, b) => b.length - a.length),
  };
}
// Hur många gånger rubrikraden står i en pdf-text, räknat i bokstäver utan mellanrum.
const forekomster = (bokst, rad) => { let n = 0; for (let i = bokst.indexOf(rad); i >= 0; i = bokst.indexOf(rad, i + rad.length)) n++; return n; };

// Sidhuvud, sidfot och sidnummer räknas inte som sidans text.
const RAM = /Sida \d+ av \d+|© Niclas Fohlin[^\n]*|[^\n]*· niclasfohlin\.se\s*$/gm;
const sidtexter = (pdf) => execFileSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\f').slice(0, -1).map((t) => t.replace(RAM, ''));
// Andelen bokstäver som två sidor har gemensamt (1 är samma text).
function likhet(a, b) {
  let gemensamt = 0;
  let summa = 0;
  for (const [c, n] of a) { gemensamt += Math.min(n, b.get(c) ?? 0); summa += n; }
  for (const [, n] of b) summa += n;
  return summa ? (2 * gemensamt) / summa : 1;
}
// Ett ord som bryts mitt i utan bindestreck: en del som inte är ett ord i filen men blir det med nästa del. Bara ord
// på minst sex bokstäver, som är de som bryts i en smal kolumn: korten i Ljudlek har orden med en bokstav per cell
// (prickarna under ljuden), och pdf-läsaren delar dem ibland ("må" och "l"), vilket inte syns för läsaren.
function brutnaOrd(sidorna, iFilen) {
  const t = ord(sidorna.join(' '));
  const brutna = new Set();
  for (let i = 0; i < t.length - 1; i++) {
    const hel = t[i] + t[i + 1];
    if (hel.length >= 6 && t[i].length > 1 && !iFilen.has(t[i]) && iFilen.has(hel)) brutna.add(hel);
  }
  return brutna;
}

// Sidankarna: de första bokstäverna efter varje ställe där Word-filen själv börjar en ny sida, en ny sektion eller ett
// stycke med sidbrytning före. Mellan två ankare står ett block (en mall, ett kortark, en lathundssida, en del av
// beskrivningen), och varje block ska börja på en ny sida och inte ta fler sidor i Google än i Word. Inne i ett block
// får texten brytas något annorlunda: Word håller ihop en tabell vars rader har "håll ihop med nästa" och flyttar den
// till nästa sida, medan Google Dokument, som saknar det för tabellrader, delar den (Antalsuppfattning 60 sidor i Word
// och 56 i Google 2026-09-30, med samma innehåll).
async function sidankare(fil) {
  const xml = await (await JSZip.loadAsync(readFileSync(fil))).file('word/document.xml').async('string');
  const starter = [0];
  for (const m of xml.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr><\/w:pPr><\/w:p>/g)) starter.push(m.index + m[0].length);
  for (const m of xml.matchAll(/<w:p><w:pPr>(?:(?!<\/w:pPr>).)*<w:pageBreakBefore\/>/gs)) starter.push(m.index);
  // Ankaret tar bara text fram till nästa ställe där filen börjar en ny sida: ett kort ark (bokstavskorten) ska inte
  // få nästa avsnitts rubrik i sitt ankare.
  const sorterade = [...new Set(starter)].sort((a, b) => a - b);
  return sorterade.map((i, k) => {
    const text = avkoda((xml.slice(i, Math.min(sorterade[k + 1] ?? Infinity, i + 30000)).match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join(''));
    return (text.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]/gu) ?? []).join('').slice(0, 48);
  }).filter((a) => a.length >= 8);
}
// Sidan som börjar med ankaret, i ordning; -1 när ankaret inte börjar någon sida. Sidorna läses uppifrån och ned
// (pdftotext -layout), eftersom läsordningen kan ta en spalt längre ned först, och bara sidans första rader räknas,
// så att en rubrik med samma ord mitt på en sida inte tas för ankaret.
const layoutsidor = (pdf) => execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\f').slice(0, -1).map((t) => t.replace(RAM, ''));
// Sidornas bokstäver uppifrån och ned utan sidhuvud och sidfot, som tas bort som text och inte som rad: på ett kortark
// med smal marginal står arkets rubrik och sidhuvudet på samma rad i Googles uppställning (Bråkkursen 2026-09-30).
const ankartexter = (pdf, sidhuvud) => execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\f').slice(0, -1).map((t) => sidhuvud.reduce((b, h) => b.split(h).join(''), (t.replace(/Sida \d+ av \d+/g, '').normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]/gu) ?? []).join('')));
// Står samma text överst på flera sidor (Skrivkursens snabbmall står både i beskrivningen och som mall) väljs i
// Google den sida som ligger närmast där ankaret borde stå: förra ankarets sida plus Words avstånd mellan dem.
// Ett ankare står överst på en sida när sidans första tecken innehåller det, eller nästan alla dess tecken i en annan
// ordning: i Google kan en bokstav i marginalen hamna på rubrikens rad (screeningens stora B, 2026-09-30).
function ankarsidor(bokstaverna, ankare, iWord) {
  const bokst = bokstaverna.map((b) => b.slice(0, 130));
  const nastanAlla = (topp, a) => {
    const kvar = antal([...topp]);
    let traff = 0;
    for (const c of a) if ((kvar.get(c) ?? 0) > 0) { kvar.set(c, kvar.get(c) - 1); traff++; }
    return traff >= 0.95 * a.length;
  };
  const ut = [];
  let p = 0;
  let forra = -1;
  ankare.forEach((a, i) => {
    const kandidater = [];
    for (let s = p + (i > 0 && a === ankare[i - 1] ? 1 : 0); s < bokst.length; s++) if (bokst[s].includes(a) || nastanAlla(bokst[s].slice(0, a.length + 20), a)) kandidater.push(s);
    let hittad = kandidater[0] ?? -1;
    if (iWord && iWord[i] >= 0 && kandidater.length > 1) {
      const vantat = forra >= 0 ? ut[forra] + (iWord[i] - iWord[forra]) : iWord[i];
      hittad = kandidater.reduce((b, s) => (Math.abs(s - vantat) < Math.abs(b - vantat) ? s : b));
    }
    ut.push(hittad);
    if (hittad >= 0) { p = hittad; if (!iWord || iWord[i] >= 0) forra = i; }
  });
  return ut;
}

// Words pdf, sparad efter filens innehåll i underlag/prov/google/word/.
async function wordPdf(fil, nyckel) {
  const mapp = join(UT, 'word');
  mkdirSync(mapp, { recursive: true });
  const namn = basename(fil, '.docx');
  const pdf = join(mapp, `${namn}-${nyckel.slice(0, 16)}.pdf`);
  if (existsSync(pdf)) return pdf;
  // Äldre versioner av samma fil tas bort; filnamnen har bara a-z, siffror och bindestreck.
  for (const f of readdirSync(mapp)) if (f.startsWith(`${namn}-`) && /^[0-9a-f]{16}\.pdf$/.test(f.slice(namn.length + 1))) rmSync(join(mapp, f));
  await kor('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(rot, 'scripts/word-pdf.ps1'), fil, pdf], { timeout: 300000 });
  return pdf;
}

// Översiktsarket: tio sidor i bredd, Words sidor överst och Googles under, par för par.
async function oversikt(wordPdfFil, googlePdfFil, ark) {
  const bilder = async (pdf, prefix) => {
    const tmp = join(UT, `.sidor-${prefix}`);
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp);
    execFileSync('pdftoppm', ['-r', '20', '-png', pdf, join(tmp, 's')]);
    const ut = await Promise.all(readdirSync(tmp).sort().map(async (f) => ({ data: readFileSync(join(tmp, f)), matt: await sharp(join(tmp, f)).metadata() })));
    rmSync(tmp, { recursive: true, force: true });
    return ut;
  };
  const [w, g] = [await bilder(wordPdfFil, 'w'), await bilder(googlePdfFil, 'g')];
  const alla = [...w, ...g];
  const cb = Math.max(...alla.map((b) => b.matt.width)) + 6;
  const ch = Math.max(...alla.map((b) => b.matt.height)) + 6;
  const k = 10;
  const par = Math.ceil(Math.max(w.length, g.length) / k);
  const lager = [];
  for (const [rad, lista] of [[0, w], [1, g]]) lista.forEach((b, i) => lager.push({ input: b.data, left: (i % k) * cb, top: Math.floor(i / k) * (2 * ch + 16) + rad * ch }));
  await sharp({ create: { width: k * cb, height: par * (2 * ch + 16), channels: 3, background: '#666666' } }).composite(lager).png().toFile(ark);
}

mkdirSync(UT, { recursive: true });
const mappId = mapp ? await testmappen() : undefined;
let fel = 0;
for (const fil of filer) {
  const namn = basename(fil, '.docx');
  const docx = readFileSync(fil);
  let wPdf;
  let g;
  const gPdf = join(UT, `${namn}-google.pdf`);
  const gNyckel = `${gPdf}.nyckel`;
  let nyckel;
  try {
    // Word och Google arbetar samtidigt: Word på datorn, Google på nätet. Med --igen jämförs den senast hämtade
    // Google-pdf:en en gång till, utan uppladdning, när bara jämförelsen har ändrats; bara om den är gjord ur samma
    // innehåll (nyckeln bredvid pdf:en), annars hämtas en ny.
    nyckel = await innehall(docx);
    const igen = args.includes('--igen') && existsSync(gPdf) && existsSync(gNyckel) && readFileSync(gNyckel, 'utf8') === nyckel;
    [wPdf, g] = await Promise.all([wordPdf(fil, nyckel), igen ? { pdf: readFileSync(gPdf) } : googlePdf(docx, { namn, mappId })]);
  } catch (e) {
    fel++;
    console.log(`NEJ  ${namn}: ${e.message.replace(/\s+/g, ' ').slice(0, 240)}`);
    continue;
  }
  writeFileSync(gPdf, g.pdf);
  writeFileSync(gNyckel, nyckel);
  const iFilen = await wordText(fil);
  // Sidorna uppifrån och ned (-layout) för allt utom ordbrytningen: pdftotexts vanliga läsläge tappar ibland tecken
  // som står ovanpå varandra i Words pdf (Bråkkursens mallar 2026-09-30), och en sida ska läsas som den ser ut.
  const w = layoutsidor(wPdf);
  const gs = layoutsidor(gPdf);
  // problem stoppar; obs är skillnader i den fria texten inne i ett block, som läses på översiktsarket.
  const problem = [];
  const obs = [];
  // Blocken mellan sidankarna: varje block börjar på en ny sida i båda och tar inte fler sidor i Google än i Word.
  const ankare = await sidankare(fil);
  const pw = ankarsidor(ankartexter(wPdf, iFilen.sidhuvud), ankare);
  const pg = ankarsidor(ankartexter(gPdf, iFilen.sidhuvud), ankare, pw);
  const nasta = (p, i, slut) => p.slice(i + 1).find((x) => x >= 0) ?? slut;
  const utanSida = [];
  const langre = [];
  ankare.forEach((a, i) => {
    if (pw[i] < 0) return;
    if (pg[i] < 0) { utanSida.push(`"${a.slice(0, 16)}…" (Words sida ${pw[i] + 1})`); return; }
    const iWord = nasta(pw, i, w.length) - pw[i];
    const iGoogle = nasta(pg, i, gs.length) - pg[i];
    if (iGoogle > iWord) langre.push(`blocket från Words sida ${pw[i] + 1} tar ${iGoogle} sidor i Google mot ${iWord}`);
  });
  if (args.includes('--visa-ankare')) ankare.forEach((a, i) => console.log(`     ankare ${String(i + 1).padStart(2)}: Word s${pw[i] + 1}, Google s${pg[i] + 1}  ${a}`));
  if (utanSida.length) problem.push(`börjar inte en sida i Google: ${utanSida.slice(0, 4).join(', ')}${utanSida.length > 4 ? ` och ${utanSida.length - 4} till` : ''}`);
  if (langre.length) problem.push(langre.slice(0, 4).join(', ') + (langre.length > 4 ? ` och ${langre.length - 4} till` : ''));
  // Tomma sidor i Google och sidor med annan text, jämförda med Words sida med samma nummer. Skiljer sig sidantalet
  // visas bara den första sidan som skiljer sig, eftersom resten följer med.
  const tomma = [];
  const olika = [];
  for (let s = 0; s < gs.length; s++) {
    const gb = bokstaver(gs[s]);
    const wb = bokstaver(w[s] ?? '');
    if (gs[s].trim().length < 3 && (w[s] === undefined || w[s].trim().length >= 3)) tomma.push(s + 1);
    else if (w[s] !== undefined && likhet(wb, gb) < SIDLIKHET) olika.push(`${s + 1} (${Math.round(likhet(wb, gb) * 100)} %)`);
  }
  if (tomma.length) problem.push(`tom sida i Google ${tomma.join(', ')}`);
  if (w.length !== gs.length) obs.push(`Word ${w.length} sidor, Google ${gs.length}`);
  if (olika.length) obs.push(`${w.length === gs.length ? 'annan text på sidan' : 'första sidan som skiljer sig:'} ${(w.length === gs.length ? olika : olika.slice(0, 1)).join(', ')}`);
  // Texten: bokstäver och siffror i Words pdf som saknas i Googles. Hela sidorna räknas, med sidhuvud och sidfot men
  // utan sidnumren, och det som upprepas per sida dras av så många gånger som det står fler gånger i Word;
  // ekvationerna räknas inte, eftersom Google ritar dem utan text i pdf:en.
  const hela = (pdf) => execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const [helW, helG] = [hela(wPdf), hela(gPdf)];
  const utanSidnummer = (t) => t.replace(/Sida \d+ av \d+/g, 'Sida av');
  const iWord = tecken(utanSidnummer(helW));
  const iGoogle = tecken(utanSidnummer(helG));
  const bokstW = (helW.normalize('NFC').toLowerCase().match(/\p{L}/gu) ?? []).join('');
  const bokstG = (helG.normalize('NFC').toLowerCase().match(/\p{L}/gu) ?? []).join('');
  for (const rad of iFilen.rubrikrader) {
    const extra = forekomster(bokstW, rad.bokst) - forekomster(bokstG, rad.bokst);
    if (extra > 0) for (const c of rad.bokst + rad.siffror) iWord.set(c, (iWord.get(c) ?? 0) - extra);
  }
  const saknas = [...iWord].map(([c, n]) => [c, n - (iFilen.ekvationer.get(c) ?? 0) - (iGoogle.get(c) ?? 0)]).filter(([, d]) => d > 0);
  if (saknas.length) problem.push(`saknas i Google: ${saknas.slice(0, 12).map(([c, d]) => `${c}${d > 1 ? ` ×${d}` : ''}`).join(' ')}${saknas.length > 12 ? ` och ${saknas.length - 12} till` : ''}`);
  // Ord som bryts mitt i.
  // Ordbrytningen läses i läsordning, där en cells nästa rad följer direkt efter den förra.
  const iW = brutnaOrd(sidtexter(wPdf), iFilen.ord);
  const iG = brutnaOrd(sidtexter(gPdf), iFilen.ord);
  const brutna = [...new Set([...iW, ...iG])].map((o) => `${o} (${iW.has(o) && iG.has(o) ? 'Word och Google' : iW.has(o) ? 'Word' : 'Google'})`);
  if (brutna.length) problem.push(`bryts mitt i ordet: ${brutna.join(', ')}`);
  const ark = join(UT, `${namn}-oversikt.png`);
  await oversikt(wPdf, gPdf, ark);
  if (problem.length) fel++;
  const lage = problem.length ? 'NEJ' : obs.length ? 'obs' : 'ok ';
  const beskrivning = [...problem, ...obs].join('; ') || `${w.length} sidor i Word och i Google, samma text på varje sida`;
  const provade = pw.filter((p) => p >= 0).length;
  console.log(`${lage}  ${namn}: ${beskrivning}${!problem.length ? ` (${provade} av ${ankare.length} sidankare prövade; de börjar sin sida och ryms lika i båda)` : ''}`);
  console.log(`     översikt (Word över Google): ${ark}${g.lank && mapp ? `\n     i testmappen: ${g.lank}` : ''}`);
  for (const s of sidor) {
    for (const [pdf, vem] of [[wPdf, 'word'], [gPdf, 'google']]) {
      const bas = join(UT, `${namn}-${vem}-s${s}`);
      execFileSync('pdftoppm', ['-r', '60', '-f', String(s), '-l', String(s), '-png', '-singlefile', pdf, bas]);
      console.log(`     sidan ${s} i ${vem === 'word' ? 'Word' : 'Google'}: ${bas}.png`);
    }
  }
}
if (fel) { console.error(`\ngoogleprov: ${fel} av ${filer.length} Word-filer skiljer sig mellan Word och Google Dokument så att det stoppar. Läs översiktsarken.`); process.exit(1); }
console.log(`\nAlla ${filer.length} Word-filer: varje block börjar sin sida och ryms lika i Word och Google Dokument, ingen tom sida och ingen text som saknas. Läs översiktsarken, särskilt filerna med obs.`);
