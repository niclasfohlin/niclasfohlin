#!/usr/bin/env node
// Strukturkortens pdf:er (K-650): ett kort per struktur, framsidan och baksidan på var sitt A4 med kortet på den övre
// halvan, i formen ur scripts/strukturer/kortform.mjs, och filen med alla kort, två på varje A4. Chrome skriver ut korten
// (beslutet i underlag/prov/strukturer/UPPDRAGET.md under Läget: formen är enkel i HTML och svår i Word, och ingen
// Word-fil erbjuds), och pdf-lib delar utskriften i ett kort per fil. Bilden är scenens png i 1600 punkter med så få
// färger som bilden tål (Niclas 2026-10-31: "Ska vara en halv A4a och inte se suddiga ut. Men också optimeras för hur de
// ska komprimeras för sina färger"). Chrome lägger bilden som RGB i pdf:en, så varje pdf görs om med bilden som palett
// och samma bildpunkter (scripts/pdfpack.py --palett, K-700): filen med alla kort gick från 7,5 till 5,1 MB.
//
//   node scripts/strukturer/kort.mjs                 alla strukturer som har en bild
//   node scripts/strukturer/kort.mjs <id> [<id>…]    bara de angivna
//   node scripts/strukturer/kort.mjs --vid-behov     bara de som saknas eller vars kort har ändrats (i npm run validera)
//
// Netlify har ingen Chrome, så pdf:erna committas, med ett manifest som har en kontrollsumma per kort: innehall över
// strukturens namn, slag, steg och scen, som bygget räknar om och stannar på när ett kort är gammalt
// (src/lib/strukturer.ts), och summa, som också tar med motorn, formen och typsnitten. Ett utkast får sitt kort i
// underlag/prov/strukturer/kort/, som git ignorerar, med manifestet kort.json där, och en struktur som visas i
// public/strukturer/kort/, med manifestet src/data/strukturkort.json. Manifestet har också kortets mått: stegens storlek
// och om de fick mindre luft. Ett kort som behövde mindre luft eller mindre text listas som en text att korta, och ett
// kort vars steg inte ryms i 16 punkter stannar skriptet. Ändras ett kort som visas görs filen med alla kort om, i
// slagens ordning, Par, Grupp och Klass, och efter namnet, som verktygets sida har dem.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, mkdtempSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import YAML from 'yaml';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { ritaScen } from './rita.mjs';
import { kortenHtml, KORTETS_STANDARD } from './kortform.mjs';
import { strukturkortetsInnehall, strukturkortetsFil, STRUKTURKORTEN_ALLA, STRUKTURENS_SLAG, metodensStrukturkort } from '../../src/lib/standard/strukturer.js';

const HAR = dirname(fileURLToPath(import.meta.url));
const ROT = join(HAR, '..', '..');
const STRUKTURER = join(ROT, 'src', 'content', 'strukturer');
const SCENER = join(HAR, 'scener');
const UT = { utkast: join(ROT, 'underlag', 'prov', 'strukturer', 'kort'), visas: join(ROT, 'public', 'strukturer', 'kort') };
const MANIFEST = { utkast: join(UT.utkast, 'kort.json'), visas: join(ROT, 'src', 'data', 'strukturkort.json') };
const args = process.argv.slice(2);
const vidBehov = args.includes('--vid-behov');
const valda = args.filter((a) => !a.startsWith('--'));

// Det som ett kort görs av, utöver strukturens egen fil och scen: motorn, formen och typsnitten.
const lasAlla = (mapp, filter) => readdirSync(mapp).filter(filter).sort().map((f) => readFileSync(join(mapp, f)));
const gemensamt = createHash('sha256');
for (const b of [
  ...['rita.mjs', 'stil.json', 'symboler.mjs', 'kortform.mjs'].map((f) => readFileSync(join(HAR, f))),
  readFileSync(join(ROT, 'scripts', 'pdfpack.py')),
  ...lasAlla(join(HAR, 'figurer'), (f) => f.endsWith('.mjs')),
  ...lasAlla(join(HAR, 'typsnitt'), (f) => f.endsWith('.ttf')),
]) gemensamt.update(b);
const GEMENSAM = gemensamt.digest('hex');

const strukturer = readdirSync(STRUKTURER).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => ({ id: f.replace(/\.yaml$/, ''), ...YAML.parse(readFileSync(join(STRUKTURER, f), 'utf8')) }));
const medBild = strukturer.filter((s) => s.bild?.scen && !s.vantar && existsSync(join(SCENER, `${s.bild.scen}.yaml`)));
const scenen = (s) => readFileSync(join(SCENER, `${s.bild.scen}.yaml`), 'utf8');
const innehall = (s) => strukturkortetsInnehall(s, scenen(s));
const summa = (s) => createHash('sha256').update(GEMENSAM).update(innehall(s)).digest('hex').slice(0, 16);
const delen = (s) => (s.utkast ? 'utkast' : 'visas');

const manifest = {};
for (const [del, fil] of Object.entries(MANIFEST)) manifest[del] = existsSync(fil) ? JSON.parse(readFileSync(fil, 'utf8')) : {};
const alla = manifest.visas[STRUKTURKORTEN_ALLA.nyckel];
// Ett kort som har bytt del, från utkast till visas eller tillbaka, tas bort ur den gamla delens manifest och mapp, så att
// ett utkasts kort aldrig ligger kvar på sajten.
for (const s of medBild) {
  const gamla = delen(s) === 'visas' ? 'utkast' : 'visas';
  delete manifest[gamla][s.id];
  if (existsSync(join(UT[gamla], strukturkortetsFil(s.id)))) unlinkSync(join(UT[gamla], strukturkortetsFil(s.id)));
}
// En struktur som inte har något kort längre, som en som väntar på banken (vantar), har inget kort på sajten.
for (const del of Object.keys(manifest)) for (const id of Object.keys(manifest[del])) if (!id.startsWith('_') && !medBild.some((s) => s.id === id)) delete manifest[del][id];
for (const f of existsSync(UT.visas) ? readdirSync(UT.visas) : []) {
  const id = f.match(/^strukturkort-(.+)\.pdf$/)?.[1];
  if (id && f !== STRUKTURKORTEN_ALLA.fil && !medBild.some((s) => s.id === id && !s.utkast) && !existsSync(join(ROT, 'src', 'content', 'undervisningsmetoder', `${id}.yaml`)) && !existsSync(join(ROT, 'src', 'content', 'stodundervisning', `${id}.yaml`))) unlinkSync(join(UT.visas, f));
}

const aktuellt = (s) => manifest[delen(s)][s.id]?.summa === summa(s) && existsSync(join(UT[delen(s)], strukturkortetsFil(s.id)));
const attGora = medBild.filter((s) => (!valda.length || valda.includes(s.id)) && (!vidBehov || !aktuellt(s)));
// Filen med alla kort, i verktygets ordning.
const ORDNINGEN = Object.keys(STRUKTURENS_SLAG);
const visas = medBild.filter((s) => !s.utkast).sort((a, b) => ORDNINGEN.indexOf(a.slag) - ORDNINGEN.indexOf(b.slag) || a.namn.localeCompare(b.namn, 'sv'));
const allasSumma = createHash('sha256').update(GEMENSAM).update(JSON.stringify(visas.map((s) => [s.id, innehall(s)]))).digest('hex').slice(0, 16);
const allaAttGora = visas.length > 0 && (alla?.summa !== allasSumma || !existsSync(join(UT.visas, STRUKTURKORTEN_ALLA.fil)));
// Metodernas strukturkort (K-661): en metod som importerar strukturer med fältet strukturkort får sina kort två och två på
// A4 i en egen fil, i metodens ordning. En struktur som inte visas stannar skriptet, som bygget gör.
const METODMAPPAR = ['undervisningsmetoder', 'stodundervisning'].map((m) => join(ROT, 'src', 'content', m));
const metoderna = METODMAPPAR.flatMap((mapp) => readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => ({ id: f.replace(/.yaml$/, ''), d: YAML.parse(readFileSync(join(mapp, f), 'utf8')) })))
  .filter((m) => m.d?.strukturkort?.strukturer?.length);
const metodFel = [];
const metodensKort = metoderna.map((m) => {
  const kort = m.d.strukturkort.strukturer.map((id) => visas.find((s) => s.id === id) ?? (metodFel.push(`${m.d.titel}: strukturen ${id} visas inte i verktyget`), null)).filter(Boolean);
  const summa = createHash('sha256').update(GEMENSAM).update(JSON.stringify(kort.map((s) => [s.id, innehall(s)]))).digest('hex').slice(0, 16);
  return { ...m, kort, summa, ...metodensStrukturkort(m.id) };
});
if (metodFel.length) { console.error(`Metodernas strukturkort:\n  ${metodFel.join('\n  ')}`); process.exit(1); }
for (const k of Object.keys(manifest.visas)) if (k.startsWith('_metod:') && !metodensKort.some((m) => m.nyckel === k)) { delete manifest.visas[k]; const f = join(UT.visas, `strukturkort-${k.slice(7)}.pdf`); if (existsSync(f)) unlinkSync(f); }
const metodernaAttGora = metodensKort.filter((m) => manifest.visas[m.nyckel]?.summa !== m.summa || !existsSync(join(UT.visas, m.fil)));
if (!attGora.length && !allaAttGora && !metodernaAttGora.length) { console.log(`Strukturkorten är aktuella (${medBild.length} kort, ${visas.length} som visas).`); process.exit(0); }

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!chrome) { console.error('Chrome hittades inte: korten skrivs ut med Chrome.'); process.exit(1); }

// Bildens png: så få färger som bilden tål. Medelfelet mot bilden i alla färger ska vara under 0,6 av 255.
const tmp = mkdtempSync(join(tmpdir(), 'strukturkort-'));
const bilder = {};
async function bilden(s) {
  if (bilder[s.id]) return bilder[s.id];
  const svg = Buffer.from(ritaScen(YAML.parse(scenen(s))));
  const bas = sharp(svg, { density: Math.round(72 * 1600 / 900) }).resize({ width: 1600 }).flatten({ background: '#fff' });
  const full = await bas.clone().raw().toBuffer();
  let vald = null;
  for (const colours of [12, 16, 24, 32, 64]) {
    const png = await bas.clone().png({ palette: true, colours, dither: 0, effort: 10, compressionLevel: 9 }).toBuffer();
    const tillbaka = await sharp(png).removeAlpha().raw().toBuffer();
    let sum = 0;
    for (let i = 0; i < full.length; i++) sum += Math.abs(full[i] - tillbaka[i]);
    vald = { png, colours };
    if (sum / full.length < 0.6) break;
  }
  const fil = join(tmp, `${s.id}.png`);
  writeFileSync(fil, vald.png);
  return (bilder[s.id] = { fil, colours: vald.colours, kb: Math.round(vald.png.length / 1024) });
}

const url = (p) => pathToFileURL(p).href;
const flaggor = ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=10000'];
const kortet = async (s) => ({ id: s.id, namn: s.namn, slag: s.slag, steg: s.steg, bild: url((await bilden(s)).fil) });
// Chrome skriver ut sidan till pdf och ger sidans DOM efter mätningen.
function skrivUt(namn, html) {
  const htmlFil = join(tmp, `${namn}.html`);
  writeFileSync(htmlFil, html);
  const pdfFil = join(tmp, `${namn}.pdf`);
  execFileSync(chrome, [...flaggor, `--print-to-pdf=${pdfFil}`, url(htmlFil)], { stdio: 'ignore', timeout: 600000 });
  const dom = execFileSync(chrome, [...flaggor, '--dump-dom', url(htmlFil)], { encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 27 });
  if (!/<body[^>]*data-klar="1"/.test(dom)) { console.error(`Korten (${namn}) mättes inte: sidan blev inte klar i Chrome.`); process.exit(1); }
  return { pdf: readFileSync(pdfFil), dom };
}
// Sparar pdf:en med bilderna som palett och utan tider, så att samma kort blir samma fil (scripts/pdfpack.py --palett), och
// ger storleken i kB.
function spara(bytes, fil) {
  const fore = join(tmp, 'packa.pdf');
  writeFileSync(fore, bytes);
  execFileSync('python', [join(ROT, 'scripts', 'pdfpack.py'), '--palett', fore, fil], { stdio: 'inherit', timeout: 600000 });
  return Math.round(readFileSync(fil).length / 1024);
}

const fel = [], korta = [];
if (attGora.length) {
  const { pdf, dom } = skrivUt('kort', kortenHtml(await Promise.all(attGora.map(kortet)), { typsnitt: url(join(HAR, 'typsnitt')) }));
  // Måtten per kort ur sidan.
  const matt = {};
  for (const m of dom.matchAll(/<div class="ark" data-id="([^"]+)" data-sida="(fram|bak)">([\s\S]*?)<div class="klipp">/g)) {
    const [, id, del, inne] = m;
    matt[id] ||= {};
    if (del === 'fram') { const n = inne.match(/<h2 class="namn"[^>]*data-pt="([\d.]+)"[^>]*data-rader="(\d+)"/); matt[id].namn = n ? { pt: +n[1], rader: +n[2] } : null; }
    else {
      const ol = inne.match(/<ol([^>]*)>/)?.[1] ?? '';
      matt[id].steg = { pt: +(ol.match(/data-pt="([\d.]+)"/)?.[1] ?? 0), tat: /data-tat/.test(ol), rymsInte: /data-ryms-inte/.test(ol) };
    }
  }
  // Utskriften delad i ett kort per fil: sida 2i är framsidan och 2i + 1 baksidan.
  const utskrift = await PDFDocument.load(pdf);
  if (utskrift.getPageCount() !== attGora.length * 2) { console.error(`Utskriften har ${utskrift.getPageCount()} sidor, inte ${attGora.length * 2}.`); process.exit(1); }
  for (const [i, s] of attGora.entries()) {
    const m = matt[s.id];
    if (!m?.steg || !m?.namn) { fel.push(`${s.namn}: kortet mättes inte`); continue; }
    if (m.steg.rymsInte) fel.push(`${s.namn}: stegen ryms inte i ${KORTETS_STANDARD.stegMinst} punkter; skriv dem kortare i grundbokens bank`);
    if (m.steg.tat || m.steg.pt < KORTETS_STANDARD.steg) korta.push(`${s.namn} (${m.steg.pt} punkter${m.steg.tat ? ', mindre luft' : ''})`);
    const ett = await PDFDocument.create();
    for (const p of await ett.copyPages(utskrift, [2 * i, 2 * i + 1])) ett.addPage(p);
    ett.setTitle(`${s.namn}: strukturkort`);
    ett.setAuthor('Niclas Fohlin');
    const mapp = UT[delen(s)];
    mkdirSync(mapp, { recursive: true });
    const kb = spara(await ett.save({ useObjectStreams: true }), join(mapp, strukturkortetsFil(s.id)));
    manifest[delen(s)][s.id] = { innehall: innehall(s), summa: summa(s), kb, bild: { colours: bilder[s.id].colours, kb: bilder[s.id].kb }, namn: m.namn, steg: m.steg };
  }
}

for (const m of fel.length ? [] : metodernaAttGora) {
  const { pdf, dom } = skrivUt(`metod-${m.id}`, kortenHtml(await Promise.all(m.kort.map(kortet)), { typsnitt: url(join(HAR, 'typsnitt')), tvaOchTva: true, titel: `Strukturkort: ${m.d.titel}` }));
  if (/data-ryms-inte/.test(dom)) fel.push(`${m.d.titel}: ett kort ryms inte i 16 punkter`);
  const doc = await PDFDocument.load(pdf);
  doc.setTitle(`Strukturkort: ${m.d.titel}`);
  doc.setAuthor('Niclas Fohlin');
  mkdirSync(UT.visas, { recursive: true });
  const kb = spara(await doc.save({ useObjectStreams: true }), join(UT.visas, m.fil));
  manifest.visas[m.nyckel] = { summa: m.summa, kort: m.kort.map((s) => s.id), kb };
  console.log(`${m.d.titel}: ${m.kort.length} strukturkort på ${doc.getPageCount()} sidor, ${kb} kB.`);
}
if (allaAttGora && !fel.length) {
  const { pdf, dom } = skrivUt('alla', kortenHtml(await Promise.all(visas.map(kortet)), { typsnitt: url(join(HAR, 'typsnitt')), tvaOchTva: true, titel: 'Strukturkort: alla' }));
  if (/data-ryms-inte/.test(dom)) fel.push('Filen med alla kort: ett kort ryms inte i 16 punkter');
  const doc = await PDFDocument.load(pdf);
  const vantat = 2 * Math.ceil(visas.length / 2);
  if (doc.getPageCount() !== vantat) fel.push(`Filen med alla kort har ${doc.getPageCount()} sidor, inte ${vantat}`);
  doc.setTitle('Strukturkort: alla');
  doc.setAuthor('Niclas Fohlin');
  mkdirSync(UT.visas, { recursive: true });
  const kb = spara(await doc.save({ useObjectStreams: true }), join(UT.visas, STRUKTURKORTEN_ALLA.fil));
  manifest.visas[STRUKTURKORTEN_ALLA.nyckel] = { summa: allasSumma, kort: visas.map((s) => s.id), kb };
  console.log(`Filen med alla kort: ${visas.length} kort på ${doc.getPageCount()} sidor, ${kb} kB.`);
}

for (const [del, fil] of Object.entries(MANIFEST)) {
  if (!Object.keys(manifest[del]).length && !existsSync(fil)) continue;
  mkdirSync(dirname(fil), { recursive: true });
  const sorterad = Object.fromEntries(Object.entries(manifest[del]).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(fil, JSON.stringify(sorterad, null, 2) + '\n');
}
const kb = attGora.reduce((a, s) => a + (manifest[delen(s)][s.id]?.kb ?? 0), 0);
if (attGora.length) console.log(`Strukturkorten: ${attGora.length} kort, ${kb} kB.`);
if (korta.length) console.log(`  ! ryms inte i ${KORTETS_STANDARD.steg} punkter, texter att korta (${korta.length}): ${korta.join(', ')}`);
if (fel.length) { console.error(`Strukturkorten stannade:\n  ${fel.join('\n  ')}`); process.exit(1); }
