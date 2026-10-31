#!/usr/bin/env node
// Strukturkortens pdf:er (K-650): ett kort per struktur, framsidan och baksidan på var sitt A4 med kortet på den övre
// halvan, i formen ur scripts/strukturer/kortform.mjs. Chrome skriver ut korten (beslutet i
// underlag/prov/strukturer/UPPDRAGET.md under Läget: formen är enkel i HTML och svår i Word, och ingen Word-fil erbjuds),
// och pdf-lib delar utskriften i ett kort per fil. Bilden är scenens png i 1600 punkter med så få färger som bilden tål
// (Niclas 2026-10-31: "Ska vara en halv A4a och inte se suddiga ut. Men också optimeras för hur de ska komprimeras för
// sina färger").
//
//   node scripts/strukturer/kort.mjs                 alla strukturer som har en bild
//   node scripts/strukturer/kort.mjs <id> [<id>…]    bara de angivna
//   node scripts/strukturer/kort.mjs --vid-behov     bara de som saknas eller vars kort har ändrats
//
// Netlify har ingen Chrome, så pdf:erna committas, med ett manifest (kort.json) som har en kontrollsumma per kort över
// strukturens fält, scenen, motorn, formen och typsnitten. Ett utkast får sitt kort i underlag/prov/strukturer/kort/,
// som git ignorerar, och en struktur som visas i public/strukturer/kort/. Manifestet har också kortets mått: stegens
// storlek och om de fick mindre luft. Ett kort som behövde mindre luft eller mindre text listas som en text att korta,
// och ett kort vars steg inte ryms i 16 punkter stannar skriptet.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, mkdtempSync } from 'node:fs';
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

const HAR = dirname(fileURLToPath(import.meta.url));
const ROT = join(HAR, '..', '..');
const STRUKTURER = join(ROT, 'src', 'content', 'strukturer');
const SCENER = join(HAR, 'scener');
const UT = { utkast: join(ROT, 'underlag', 'prov', 'strukturer', 'kort'), visas: join(ROT, 'public', 'strukturer', 'kort') };
const args = process.argv.slice(2);
const vidBehov = args.includes('--vid-behov');
const valda = args.filter((a) => !a.startsWith('--'));

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!chrome) { console.error('Chrome hittades inte: korten skrivs ut med Chrome.'); process.exit(1); }

// Det som ett kort görs av, utöver strukturens egen fil och scen: motorn, formen och typsnitten.
const lasAlla = (mapp, filter) => readdirSync(mapp).filter(filter).sort().map((f) => readFileSync(join(mapp, f)));
const gemensamt = createHash('sha256');
for (const b of [
  ...['rita.mjs', 'stil.json', 'symboler.mjs', 'kortform.mjs'].map((f) => readFileSync(join(HAR, f))),
  ...lasAlla(join(HAR, 'figurer'), (f) => f.endsWith('.mjs')),
  ...lasAlla(join(HAR, 'typsnitt'), (f) => f.endsWith('.ttf')),
]) gemensamt.update(b);
const GEMENSAM = gemensamt.digest('hex');

const strukturer = readdirSync(STRUKTURER).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => ({ id: f.replace(/\.yaml$/, ''), ...YAML.parse(readFileSync(join(STRUKTURER, f), 'utf8')) }));
const medBild = strukturer.filter((s) => s.bild?.scen && !s.vantar && existsSync(join(SCENER, `${s.bild.scen}.yaml`)) && (!valda.length || valda.includes(s.id)));
const summa = (s) => createHash('sha256').update(GEMENSAM).update(JSON.stringify([s.namn, s.slag, s.steg])).update(readFileSync(join(SCENER, `${s.bild.scen}.yaml`))).digest('hex').slice(0, 16);

const manifest = {};
for (const [del, mapp] of Object.entries(UT)) {
  const fil = join(mapp, 'kort.json');
  manifest[del] = existsSync(fil) ? JSON.parse(readFileSync(fil, 'utf8')) : {};
}
const delen = (s) => (s.utkast ? 'utkast' : 'visas');
const attGora = medBild.filter((s) => !vidBehov || manifest[delen(s)][s.id]?.summa !== summa(s) || !existsSync(join(UT[delen(s)], `${s.id}.pdf`)));
if (!attGora.length) { console.log(`Strukturkorten är aktuella (${medBild.length} kort).`); process.exit(0); }

// Bildens png: så få färger som bilden tål. Medelfelet mot bilden i alla färger ska vara under 0,6 av 255.
const tmp = mkdtempSync(join(tmpdir(), 'strukturkort-'));
async function bilden(s) {
  const svg = Buffer.from(ritaScen(YAML.parse(readFileSync(join(SCENER, `${s.bild.scen}.yaml`), 'utf8'))));
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
  return { fil, colours: vald.colours, kb: Math.round(vald.png.length / 1024) };
}

const bilder = {};
for (const s of attGora) bilder[s.id] = await bilden(s);
const url = (p) => pathToFileURL(p).href;
const html = kortenHtml(attGora.map((s) => ({ id: s.id, namn: s.namn, slag: s.slag, steg: s.steg, bild: url(bilder[s.id].fil) })), { typsnitt: url(join(HAR, 'typsnitt')) });
const htmlFil = join(tmp, 'kort.html');
writeFileSync(htmlFil, html);
const pdfFil = join(tmp, 'kort.pdf');
const flaggor = ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=10000'];
execFileSync(chrome, [...flaggor, `--print-to-pdf=${pdfFil}`, url(htmlFil)], { stdio: 'ignore', timeout: 300000 });
const dom = execFileSync(chrome, [...flaggor, '--dump-dom', url(htmlFil)], { encoding: 'utf8', timeout: 300000, maxBuffer: 1 << 26 });
if (!/<body[^>]*data-klar="1"/.test(dom)) { console.error('Korten mättes inte: sidan blev inte klar i Chrome.'); process.exit(1); }

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
const alla = await PDFDocument.load(readFileSync(pdfFil));
if (alla.getPageCount() !== attGora.length * 2) { console.error(`Utskriften har ${alla.getPageCount()} sidor, inte ${attGora.length * 2}.`); process.exit(1); }
const fel = [], korta = [];
for (const [i, s] of attGora.entries()) {
  const m = matt[s.id];
  if (!m?.steg || !m?.namn) { fel.push(`${s.namn}: kortet mättes inte`); continue; }
  if (m.steg.rymsInte) fel.push(`${s.namn}: stegen ryms inte i ${KORTETS_STANDARD.stegMinst} punkter; skriv dem kortare i grundbokens bank`);
  if (m.steg.tat || m.steg.pt < KORTETS_STANDARD.steg) korta.push(`${s.namn} (${m.steg.pt} punkter${m.steg.tat ? ', mindre luft' : ''})`);
  const ett = await PDFDocument.create();
  for (const p of await ett.copyPages(alla, [2 * i, 2 * i + 1])) ett.addPage(p);
  ett.setTitle(`${s.namn}: strukturkort`);
  ett.setAuthor('Niclas Fohlin');
  const mapp = UT[delen(s)];
  mkdirSync(mapp, { recursive: true });
  const bytes = await ett.save();
  writeFileSync(join(mapp, `${s.id}.pdf`), bytes);
  manifest[delen(s)][s.id] = { summa: summa(s), kb: Math.round(bytes.length / 1024), bild: { colours: bilder[s.id].colours, kb: bilder[s.id].kb }, namn: m.namn, steg: m.steg };
}
for (const [del, mapp] of Object.entries(UT)) {
  if (!Object.keys(manifest[del]).length) continue;
  mkdirSync(mapp, { recursive: true });
  const sorterad = Object.fromEntries(Object.entries(manifest[del]).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(mapp, 'kort.json'), JSON.stringify(sorterad, null, 2) + '\n');
}
const kb = attGora.reduce((a, s) => a + (manifest[delen(s)][s.id]?.kb ?? 0), 0);
console.log(`Strukturkorten: ${attGora.length} kort, ${kb} kB.`);
if (korta.length) console.log(`  ! ryms inte i ${KORTETS_STANDARD.steg} punkter, texter att korta (${korta.length}): ${korta.join(', ')}`);
if (fel.length) { console.error(`Strukturkorten stannade:\n  ${fel.join('\n  ')}`); process.exit(1); }
