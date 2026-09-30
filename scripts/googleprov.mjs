#!/usr/bin/env node
// Hur ser en Word-fil ut i Google Dokument? (Niclas 2026-09-30: bråken och radavstånden blev fel i Google Dokument fast
// de var rätt i Word, och jag kunde inte se Google Dokument, bara gissa.)
//
// Skriptet laddar upp Word-filen till Google Drive, låter Google Dokument göra om den till ett eget dokument och hämtar
// det som pdf. Pdf:en är Google Dokuments egen återgivning, som när läraren gör om filen till ett Google-dokument.
// Drive-knappen sparar Word-filen som den är, och Google Dokument öppnar den i Office-läget; Drives egen bild av en sådan
// fil ritade filmens bilder på samma sätt (2026-09-30). Inloggningen lånas från Toishi-riggen (Niclas 2026-09-30: "En
// annan rigg har till och med API till Google med oauth du får låna. Toishi"): C:/toishi/drift/google.js, kontot
// toishi.sthlm@gmail.com, med behörigheten Drive (egna filer), så skriptet ser och rör bara filer det själv har
// skapat. Nycklar skrivs aldrig ut.
//
// Granskningen är automatisk (Niclas: "Granska dem ska du göra. Automatiskt"): för varje fil räknar skriptet sidorna,
// hittar tomma och nästan tomma sidor, jämför orden i Word-filen med orden i Googles pdf och ritar ett översiktsark med
// alla sidor, som läses före uppladdningen. Testmappen (Niclas: "Skapa en testmapp där man testar enkelt innan
// uppladdning"): med --mapp ligger Google-dokumentet kvar i "Prov före uppladdning · niclasfohlin.se" i samma Drive,
// under filens namn, och en ny version skriver över samma dokument, med samma länk. Utan --mapp går dokumentet till
// papperskorgen.
//
//   node scripts/googleprov.mjs <fil.docx | metodens id> … [--mapp] [--sidor 1,21]
//   node scripts/googleprov.mjs --andrade [--mapp]   Word-filerna i dist som skiljer sig från dem som ligger ute
//   node scripts/googleprov.mjs --alla [--mapp]      alla Word-filer i dist
//
// Ett id tar dist/stodundervisning/<id>.docx (kör npm run validera först). Pdf:erna och översiktsarken hamnar i
// underlag/prov/google/. Stannar med kod 1 om en fil har en tom sida eller text som saknas i Googles version.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const kraver = createRequire(import.meta.url);
const JSZip = kraver('jszip');
const sharp = kraver('sharp');
const args = process.argv.slice(2);
const sidArg = args.indexOf('--sidor');
const sidor = sidArg >= 0 ? args[sidArg + 1].split(',').map(Number) : [];
const mapp = args.includes('--mapp');
const DIST = join(rot, 'dist/stodundervisning');
let filer = args.filter((a, i) => !a.startsWith('--') && (sidArg < 0 || i !== sidArg + 1))
  .map((a) => (a.toLowerCase().endsWith('.docx') ? a : join(DIST, `${a}.docx`)));
if (args.includes('--alla') || args.includes('--andrade')) {
  // Samlingsfilen med alla metoder är för stor för Google Drives export (exportSizeLimitExceeded); den är varje metods
  // egen fil i följd, och de granskas var för sig.
  filer = readdirSync(DIST).filter((f) => f.endsWith('.docx') && f !== 'alla-metoder.docx').map((f) => join(DIST, f));
  if (args.includes('--andrade')) {
    // Två byggen av samma Word-fil skiljer sig i byggets tidsstämpel (docProps/core.xml), i nyckeln som det inbäddade
    // typsnittet är förvrängt med (fontTable.xml, word/fonts/) och i bilderna: SVG-filerna har CRLF i arbetskopian på
    // Windows och LF på Netlify, och en reservbild får samma pixlar men andra byte i PNG-filen på Linux. Bildernas
    // filnamn är en kontrollsumma av bilden och skiljer sig därmed också. Innehållet jämförs därför utan dem, och
    // bilderna efter sitt innehåll: SVG med LF, PNG och JPEG efter pixlarna (2026-09-30: 13 av 49 filer skilde sig
    // annars mellan byggena på datorn och på Netlify av samma kod).
    const sha = (b) => createHash('sha256').update(b).digest('hex');
    const innehall = async (buf) => {
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
    };
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
const TOISHI = 'C:/toishi/drift/google.js';
if (!existsSync(TOISHI)) { console.error(`googleprov: Toishi-riggens Google-inloggning saknas (${TOISHI}).`); process.exit(1); }
const google = kraver(TOISHI);
const auth = { Authorization: `Bearer ${await google.token()}` };
const API = 'https://www.googleapis.com/drive/v3/files';
const DOKUMENT = 'application/vnd.google-apps.document';
const MAPP = 'Prov före uppladdning · niclasfohlin.se';

async function anrop(url, init = {}) {
  const svar = await fetch(url, { ...init, headers: { ...auth, ...(init.headers ?? {}) } });
  if (!svar.ok) throw new Error(`${init.method ?? 'GET'} ${url.split('?')[0]} svarade ${svar.status}: ${(await svar.text()).slice(0, 300)}`);
  return svar;
}
const sok = async (q) => (await (await anrop(`${API}?q=${encodeURIComponent(`${q} and trashed=false`)}&fields=files(id,name)`)).json()).files;
const papperskorgen = (id) => anrop(`${API}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });

// Orden i en text: bokstäver och siffror, gemener.
const ord = (text) => text.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const antal = (lista) => lista.reduce((m, o) => m.set(o, (m.get(o) ?? 0) + 1), new Map());
async function wordOrd(fil) {
  const zip = await JSZip.loadAsync(readFileSync(fil));
  const delar = Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n));
  let text = '';
  for (const d of delar) {
    const xml = await zip.file(d).async('string');
    // Stycken och celler skiljer orden åt; texten står i w:t och ekvationernas m:t.
    // Ett hårt bindestreck (sss-ooo-lll) är ett bindestreck. Fältkoderna (sidnumret) och ekvationerna räknas inte:
    // Google ritar ekvationer utan text i pdf:en, så de granskas på översiktsarket.
    text += ' ' + xml.replace(/<m:oMath\b[\s\S]*?<\/m:oMath>/g, ' ').replace(/<w:instrText\b[^>]*>[^<]*<\/w:instrText>/g, ' ')
      .replace(/<\/w:p>|<\/w:tc>|<w:tab\/>|<w:br\/>/g, ' ').replace(/<w:noBreakHyphen\/>/g, '-')
      .replace(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g, '$1').replace(/<[^>]+>/g, '');
  }
  return ord(text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
}
// En sida utan annat än sidhuvud, sidfot och sidnummer.
const RAM = /Sida \d+ av \d+|© Niclas Fohlin[^\n]*|[^\n]*· niclasfohlin\.se\s*$/gm;

let mappId;
if (mapp) {
  mappId = (await sok(`name='${MAPP}' and mimeType='application/vnd.google-apps.folder'`))[0]?.id;
  if (!mappId) mappId = (await (await anrop(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: MAPP, mimeType: 'application/vnd.google-apps.folder' }) })).json()).id;
}
const ut = join(rot, 'underlag/prov/google');
mkdirSync(ut, { recursive: true });
let fel = 0;
for (const fil of filer) {
  const namn = basename(fil, '.docx');
  const grans = `googleprov-${Date.now().toString(36)}`;
  // I testmappen skriver en ny version över samma Google-dokument, så att länken är densamma och ett dokument som
  // någon har öppet aldrig försvinner: 2026-09-30 lade skriptet den förra versionen i papperskorgen medan Niclas läste
  // den, och bilderna blev varningstrianglar. Finns inget dokument med filens namn skapas det. En uppdatering har
  // ingen metadata (föräldern får inte anges där), bara den nya Word-filen, som Google gör om till samma dokument.
  const forra = mappId ? (await sok(`name='${namn.replace(/'/g, "\\'")}' and '${mappId}' in parents`))[0] : undefined;
  const meta = forra ? {} : { name: mapp ? namn : `googleprov ${namn} (tas bort)`, mimeType: DOKUMENT, ...(mappId ? { parents: [mappId] } : {}) };
  const kropp = Buffer.concat([
    Buffer.from(`--${grans}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${grans}\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`),
    readFileSync(fil),
    Buffer.from(`\r\n--${grans}--`),
  ]);
  const { id, webViewLink } = await (await anrop(
    forra ? `https://www.googleapis.com/upload/drive/v3/files/${forra.id}?uploadType=multipart&fields=id,webViewLink` : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    { method: forra ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${grans}` }, body: kropp },
  )).json();
  const pdf = join(ut, `${namn}-google.pdf`);
  try {
    writeFileSync(pdf, Buffer.from(await (await anrop(`${API}/${id}/export?mimeType=application/pdf`)).arrayBuffer()));
  } catch (e) {
    fel++;
    console.log(`NEJ  ${namn}: gick inte att hämta från Google Dokument: ${e.message.replace(/\s+/g, ' ').slice(0, 200)}`);
    continue;
  } finally {
    // Utan testmappen är dokumentet tillfälligt: papperskorgen, där det går att hämta tillbaka i 30 dagar.
    if (!mapp) await papperskorgen(id);
  }
  // Granskningen.
  const pdfText = (...val) => execFileSync('pdftotext', ['-enc', 'UTF-8', ...val, pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const texter = pdfText().split('\f').slice(0, -1);
  const tomma = texter.map((t, i) => [i + 1, t.replace(RAM, '').trim()]).filter(([, t]) => t.length < 3).map(([s]) => s);
  const iWord = antal(await wordOrd(fil));
  // Orden räknas i sidornas uppställning (-layout): annars slår pdftotext ihop ett ord med bindestreck i radslutet
  // med nästa rads första ord ("bild-" och "och" blir "bildoch") och ett ord ser ut att saknas fast det står där.
  const iGoogle = antal(ord(pdfText('-layout')));
  const saknas = [...iWord].filter(([o, n]) => (iGoogle.get(o) ?? 0) < n).map(([o, n]) => `${o}${n - (iGoogle.get(o) ?? 0) > 1 ? ` ×${n - (iGoogle.get(o) ?? 0)}` : ''}`);
  // Översiktsarket: alla sidor i rader om tio.
  const tmp = join(ut, `.sidor-${namn}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp);
  execFileSync('pdftoppm', ['-r', '20', '-png', pdf, join(tmp, 's')]);
  const bilder = readdirSync(tmp).sort().map((f) => join(tmp, f));
  const matt = await sharp(bilder[0]).metadata();
  const k = 10;
  const ark = join(ut, `${namn}-google-oversikt.png`);
  await sharp({ create: { width: k * (matt.width + 6), height: Math.ceil(bilder.length / k) * (matt.height + 6), channels: 3, background: '#666666' } })
    .composite(bilder.map((b, i) => ({ input: b, left: (i % k) * (matt.width + 6), top: Math.floor(i / k) * (matt.height + 6) })))
    .png().toFile(ark);
  rmSync(tmp, { recursive: true, force: true });
  const problem = tomma.length || saknas.length;
  if (problem) fel++;
  console.log(`${problem ? 'NEJ' : 'ok '}  ${namn}: ${texter.length} sidor i Google Dokument${tomma.length ? `, tomma sidor ${tomma.join(', ')}` : ''}${saknas.length ? `, saknas i Google: ${saknas.slice(0, 12).join(' ')}${saknas.length > 12 ? ` och ${saknas.length - 12} till` : ''}` : ''}`);
  console.log(`     översikt: ${ark}${mapp ? `\n     i testmappen: ${webViewLink}` : ''}`);
  for (const s of sidor) {
    const bas = join(ut, `${namn}-google-s${s}`);
    execFileSync('pdftoppm', ['-r', '60', '-f', String(s), '-l', String(s), '-png', '-singlefile', pdf, bas]);
    console.log(`     sidan ${s}: ${bas}.png`);
  }
}
if (fel) { console.error(`\ngoogleprov: ${fel} av ${filer.length} Word-filer har tomma sidor eller text som saknas i Google Dokument. Läs översiktsarken.`); process.exit(1); }
console.log(`\nAlla ${filer.length} Word-filer: inga tomma sidor och ingen text som saknas i Google Dokument. Läs översiktsarken.`);
