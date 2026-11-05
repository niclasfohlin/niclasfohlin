#!/usr/bin/env node
// Strategikortens pdf:er (K-699): ett kort per strategi, framsidan och baksidan på var sitt A4 med kortet på den övre
// halvan, i formen ur scripts/strategier/kortform.mjs, filen med alla kort två på varje A4, och för varje metod med fältet
// strategikort metodens kort två och två. Chrome skriver ut korten, som strukturkorten (scripts/strukturer/kort.mjs), och
// varje pdf sparas med bilderna som palett och utan tider (scripts/pdfpack.py --palett), så att samma kort blir samma fil.
// Berättelsens bilder står i public/strategier/bilder/ och ikonerna i public/strategier/ikoner/, båda som svg, så att
// korten är vektor och går att skriva ut större.
//
//   node scripts/strategier/kort.mjs                 alla strategier
//   node scripts/strategier/kort.mjs <id> [<id>…]    bara de angivna
//   node scripts/strategier/kort.mjs --vid-behov     bara de som saknas eller har ändrats (i npm run validera)
//
// Netlify har ingen Chrome, så pdf:erna committas, med manifestet src/data/strategikort.json, som har en kontrollsumma per
// kort: innehall över kortets data och filer, som bygget räknar om och stannar på när ett kort är gammalt
// (src/lib/strategier.ts), och summa, som också tar med formen, skriptet, packningen och typsnitten. Ett utkast får sitt
// kort i underlag/prov/strategier/kort/, som git ignorerar, med manifestet kort.json där. Ett kort vars baksida inte ryms i
// 14 punkter, vars handling inte ryms i bandet i 13 punkter eller vars framsida flödar över stannar skriptet; ett som behövde
// mindre luft eller mindre text listas. Bandets mätning prövas åt andra hållet innan korten görs: ett kort band står kvar i
// 15 punkter, och tre långa led märks som för breda (riggens brev 2026-11-05).
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, mkdtempSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import YAML from 'yaml';
import { PDFDocument } from 'pdf-lib';
import { kortenHtml, bladetHtml, STRATEGIKORTETS_STANDARD } from './kortform.mjs';
import { strategikortetsData, strategikortetsInnehall, strategikortetsFil, STRATEGIKORTEN_ALLA, STRATEGIBLADET, metodensStrategikort, metodensStrategiblad } from '../../src/lib/standard/strategier.js';

const HAR = dirname(fileURLToPath(import.meta.url));
const ROT = join(HAR, '..', '..');
const STRATEGIER = join(ROT, 'src', 'content', 'strategier');
const BILDER = join(ROT, 'public', 'strategier', 'bilder');
const IKONER = join(ROT, 'public', 'strategier', 'ikoner');
const TYPSNITT = join(ROT, 'scripts', 'strukturer', 'typsnitt');
const UT = { utkast: join(ROT, 'underlag', 'prov', 'strategier', 'kort'), visas: join(ROT, 'public', 'strategier', 'kort') };
const MANIFEST = { utkast: join(UT.utkast, 'kort.json'), visas: join(ROT, 'src', 'data', 'strategikort.json') };
const args = process.argv.slice(2);
const vidBehov = args.includes('--vid-behov');
const valda = args.filter((a) => !a.startsWith('--'));

// Insiktens ikon, glödlampan, är densamma på varje kort.
const INSIKTENS_IKON = join(IKONER, 'glodlampa.svg');
// Det som ett kort görs av, utöver strategins fil och dess bilder: formen, skriptet, packningen, insiktens ikon och typsnitten.
const gemensamt = createHash('sha256');
for (const f of [join(HAR, 'kortform.mjs'), join(HAR, 'kort.mjs'), join(ROT, 'scripts', 'pdfpack.py'), INSIKTENS_IKON,...readdirSync(TYPSNITT).filter((f) => f.endsWith('.ttf')).sort().map((f) => join(TYPSNITT, f))]) gemensamt.update(readFileSync(f));
const GEMENSAM = gemensamt.digest('hex');

const strategier = readdirSync(STRATEGIER).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => ({ id: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync(join(STRATEGIER, f), 'utf8')) }));
/** Bildernas och ikonernas filer för ett kort: berättelsens bilder (null när utkastet saknar dem) och handlingens ikoner. */
const filerna = (s) => {
  const d = strategikortetsData(s);
  return { bilder: d.berattelsen.map((b) => (b.fil && existsSync(join(BILDER, b.fil)) ? join(BILDER, b.fil) : null)), ikoner: d.handling.map((h) => join(IKONER, `${h.ikon}.svg`)) };
};
const fel = [];
for (const s of strategier) {
  for (const i of filerna(s).ikoner) if (!existsSync(i)) fel.push(`${s.namn}: ikonen ${i.replace(ROT, '').replace(/\\/g, '/')} saknas`);
  if (!s.utkast && filerna(s).bilder.some((b) => !b)) fel.push(`${s.namn}: en av berättelsens bilder saknas i public/strategier/bilder/`);
}
if (fel.length) { console.error(`Strategikorten:\n  ${fel.join('\n  ')}`); process.exit(1); }
const innehall = (s) => { const f = filerna(s); return strategikortetsInnehall(s, [...f.bilder, ...f.ikoner].map((x) => (x ? readFileSync(x, 'utf8') : ''))); };
const summa = (s) => createHash('sha256').update(GEMENSAM).update(innehall(s)).digest('hex').slice(0, 16);
const delen = (s) => (s.utkast ? 'utkast' : 'visas');

const manifest = {};
for (const [del, fil] of Object.entries(MANIFEST)) manifest[del] = existsSync(fil) ? JSON.parse(readFileSync(fil, 'utf8')) : {};
// Ett kort som har bytt del tas bort ur den gamla delens manifest och mapp, så att ett utkasts kort aldrig ligger på sajten,
// och en strategi som inte finns längre har inget kort.
for (const s of strategier) {
  const gamla = delen(s) === 'visas' ? 'utkast' : 'visas';
  delete manifest[gamla][s.id];
  if (existsSync(join(UT[gamla], strategikortetsFil(s.id)))) unlinkSync(join(UT[gamla], strategikortetsFil(s.id)));
}
for (const del of Object.keys(manifest)) for (const id of Object.keys(manifest[del])) if (!id.startsWith('_') && !strategier.some((s) => s.id === id)) delete manifest[del][id];

const visas = strategier.filter((s) => !s.utkast).sort((a, b) => a.nr - b.nr);
const aktuellt = (s) => manifest[delen(s)][s.id]?.summa === summa(s) && existsSync(join(UT[delen(s)], strategikortetsFil(s.id)));
const attGora = strategier.filter((s) => (!valda.length || valda.includes(s.id)) && (!vidBehov || !aktuellt(s)));
const allasSumma = createHash('sha256').update(GEMENSAM).update(JSON.stringify(visas.map((s) => [s.id, innehall(s)]))).digest('hex').slice(0, 16);
const allaAttGora = visas.length > 0 && (manifest.visas[STRATEGIKORTEN_ALLA.nyckel]?.summa !== allasSumma || !existsSync(join(UT.visas, STRATEGIKORTEN_ALLA.fil)));
if (!visas.length && manifest.visas[STRATEGIKORTEN_ALLA.nyckel]) { delete manifest.visas[STRATEGIKORTEN_ALLA.nyckel]; if (existsSync(join(UT.visas, STRATEGIKORTEN_ALLA.fil))) unlinkSync(join(UT.visas, STRATEGIKORTEN_ALLA.fil)); }
// Metodernas strategikort: en metod med fältet strategikort får sina kort två och två på A4 i en egen fil, i metodens
// ordning. En strategi som inte visas stannar skriptet, som bygget gör.
const METODMAPPAR = ['undervisningsmetoder', 'stodundervisning'].map((m) => join(ROT, 'src', 'content', m));
// Också sajtens sådd i Metoder (src/data/strategier-i-metoder.json), som väver in strategierna utan att metodens fil
// ändras; metodens eget fält går före, som på metodens sida (strategikortetI i src/lib/strategier.ts).
const SADDEN = JSON.parse(readFileSync(join(ROT, 'src', 'data', 'strategier-i-metoder.json'), 'utf8'));
const metoderna = METODMAPPAR.flatMap((mapp) => readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => ({ id: f.replace(/\.yaml$/, ''), d: YAML.parse(readFileSync(join(mapp, f), 'utf8')) })))
  .map((m) => (m.d?.strategikort || !SADDEN[m.id] ? m : { ...m, d: { ...m.d, strategikort: SADDEN[m.id] } }))
  .filter((m) => m.d?.strategikort?.strategier?.length);
const metodensKort = metoderna.map((m) => {
  const kort = m.d.strategikort.strategier.map((id) => visas.find((s) => s.id === id) ?? (fel.push(`${m.d.titel}: strategin ${id} visas inte i verktyget`), null)).filter(Boolean);
  return { ...m, kort, summa: createHash('sha256').update(GEMENSAM).update(JSON.stringify(kort.map((s) => [s.id, innehall(s)]))).digest('hex').slice(0, 16), ...metodensStrategikort(m.id) };
});
if (fel.length) { console.error(`Strategikorten:\n  ${fel.join('\n  ')}`); process.exit(1); }
for (const k of Object.keys(manifest.visas)) if (k.startsWith('_metod:') && !metodensKort.some((m) => m.nyckel === k)) { delete manifest.visas[k]; const f = join(UT.visas, `strategikort-${k.slice(7)}.pdf`); if (existsSync(f)) unlinkSync(f); }
const metodernaAttGora = metodensKort.filter((m) => manifest.visas[m.nyckel]?.summa !== m.summa || !existsSync(join(UT.visas, m.fil)));
// Bladen: verktygets blad med alla strategier som visas (med utkasten i underlag/prov/ när ingen visas än), och för varje
// metod som namnger sitt blad (strategikort.blad) ett blad med metodens strategier. Meningen i mitten är riggens, ur
// leveransens bladet.json, som intaget lägger i src/data/strategier-bladet.json.
const MITTEN_FIL = join(ROT, 'src', 'data', 'strategier-bladet.json');
const mitten = existsSync(MITTEN_FIL) ? JSON.parse(readFileSync(MITTEN_FIL, 'utf8')).mitten : undefined;
const bladetsRader = (lista) => lista.map((s) => { const d = strategikortetsData(s); return { nr: d.nr, namn: d.namn, mening: d.mening }; });
const bladetsSumma = (lista, titel) => createHash('sha256').update(GEMENSAM).update(JSON.stringify([titel, mitten ?? '', bladetsRader(lista)])).digest('hex').slice(0, 16);
const bladen = [
  ...(visas.length ? [{ del: 'visas', lista: visas, titel: 'Strategier', fil: STRATEGIBLADET.fil, nyckel: STRATEGIBLADET.nyckel }] : strategier.length ? [{ del: 'utkast', lista: [...strategier].sort((a, b) => a.nr - b.nr), titel: 'Strategier', fil: STRATEGIBLADET.fil, nyckel: STRATEGIBLADET.nyckel }] : []),
  ...metodensKort.filter((m) => m.d.strategikort.blad).map((m) => ({ del: 'visas', lista: m.kort, titel: m.d.strategikort.blad, ...metodensStrategiblad(m.id) })),
].map((b) => ({ ...b, summa: bladetsSumma(b.lista, b.titel) }));
for (const del of Object.keys(manifest)) for (const k of Object.keys(manifest[del])) if ((k === STRATEGIBLADET.nyckel || k.startsWith('_blad:')) && !bladen.some((b) => b.del === del && b.nyckel === k)) { const f = join(UT[del], k === STRATEGIBLADET.nyckel ? STRATEGIBLADET.fil : metodensStrategiblad(k.slice(6)).fil); delete manifest[del][k]; if (existsSync(f)) unlinkSync(f); }
const bladenAttGora = bladen.filter((b) => manifest[b.del][b.nyckel]?.summa !== b.summa || !existsSync(join(UT[b.del], b.fil)));

const skrivManifest = () => {
  for (const [del, fil] of Object.entries(MANIFEST)) {
    if (!Object.keys(manifest[del]).length && !existsSync(fil)) continue;
    mkdirSync(dirname(fil), { recursive: true });
    writeFileSync(fil, JSON.stringify(Object.fromEntries(Object.entries(manifest[del]).sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n');
  }
};
if (!attGora.length && !allaAttGora && !metodernaAttGora.length && !bladenAttGora.length) { skrivManifest(); console.log(`Strategikorten är aktuella (${strategier.length} kort, ${visas.length} som visas).`); process.exit(0); }

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!chrome) { console.error('Chrome hittades inte: korten skrivs ut med Chrome.'); process.exit(1); }
const tmp = mkdtempSync(join(tmpdir(), 'strategikort-'));
const url = (p) => pathToFileURL(p).href;
const flaggor = ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--allow-file-access-from-files', '--virtual-time-budget=10000'];
const kortet = (s) => {
  const d = strategikortetsData(s), f = filerna(s);
  return { id: s.id, ...d, insiktensIkon: url(INSIKTENS_IKON), berattelsen: d.berattelsen.map((b, i) => ({ ...b, bild: f.bilder[i] ? url(f.bilder[i]) : null })), handling: d.handling.map((h, i) => ({ ...h, ikon: url(f.ikoner[i]) })) };
};
// Chrome skriver ut sidan till pdf och ger sidans DOM efter mätningen; utan pdf bara DOM, som i provet av bandet.
function skrivUt(namn, html, { pdf = true } = {}) {
  const htmlFil = join(tmp, `${namn}.html`);
  writeFileSync(htmlFil, html);
  const pdfFil = join(tmp, `${namn}.pdf`);
  if (pdf) execFileSync(chrome, [...flaggor, `--print-to-pdf=${pdfFil}`, url(htmlFil)], { stdio: 'ignore', timeout: 600000 });
  const dom = execFileSync(chrome, [...flaggor, '--dump-dom', url(htmlFil)], { encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 27 });
  if (!/<body[^>]*data-klar="1"/.test(dom)) { console.error(`Korten (${namn}) mättes inte: sidan blev inte klar i Chrome.`); process.exit(1); }
  return { pdf: pdf ? readFileSync(pdfFil) : null, dom };
}
// Bandets attribut på kortets framsida i DOM efter mätningen: storleken och om leden ändå inte ryms.
const bandet = (dom, id) => {
  const a = dom.match(new RegExp(`<div class="ark" data-id="${id}" data-sida="fram">[\\s\\S]*?<div class="handling"([^>]*)>`))?.[1] ?? '';
  return { pt: +(a.match(/data-pt="([\d.]+)"/)?.[1] ?? 0), rymsInte: /data-ryms-inte/.test(a) };
};
// Sparar pdf:en med bilderna som palett och utan tider (scripts/pdfpack.py --palett) och ger storleken i kB.
function spara(bytes, fil) {
  const fore = join(tmp, 'packa.pdf');
  writeFileSync(fore, bytes);
  execFileSync('python', [join(ROT, 'scripts', 'pdfpack.py'), '--palett', fore, fil], { stdio: 'inherit', timeout: 600000 });
  return Math.round(readFileSync(fil).length / 1024);
}

const korta = [];
if (attGora.length) {
  // Provet åt andra hållet: ett kort band och tre led som inte ryms ens i 13 punkter, med det första kortets bilder och ikon.
  const forebild = kortet(attGora[0]);
  const provkort = (id, texter) => ({ ...forebild, id, handling: texter.map((text) => ({ text, ikon: forebild.handling[0].ikon })) });
  const prov = skrivUt('bandprov', kortenHtml([provkort('prov-kort', ['Läs', 'Skriv', 'Rätta']), provkort('prov-langt', Array(3).fill('Visa det med kroppen'))], { typsnitt: url(TYPSNITT) }), { pdf: false }).dom;
  const [kort, langt] = [bandet(prov, 'prov-kort'), bandet(prov, 'prov-langt')];
  if (kort.pt !== STRATEGIKORTETS_STANDARD.band || kort.rymsInte || !langt.rymsInte) { console.error(`Bandets mätning ser inte felet den letar efter: ett kort band gav ${JSON.stringify(kort)} och tre långa led ${JSON.stringify(langt)}.`); process.exit(1); }
  const { pdf, dom } = skrivUt('kort', kortenHtml(attGora.map(kortet), { typsnitt: url(TYPSNITT) }));
  const matt = {};
  for (const m of dom.matchAll(/<div class="ark" data-id="([^"]+)" data-sida="(fram|bak)">([\s\S]*?)<div class="klipp">/g)) {
    const [, id, del, inne] = m;
    matt[id] ||= {};
    if (del === 'fram') {
      const n = inne.match(/<h2 class="namn"[^>]*data-pt="([\d.]+)"[^>]*data-rader="(\d+)"/);
      matt[id].namn = n ? { pt: +n[1], rader: +n[2] } : null;
      matt[id].framRymsInte = /class="inne"[^>]*data-ryms-inte/.test(inne);
      matt[id].band = bandet(m[0], id);
    } else {
      const ol = inne.match(/<ol([^>]*)>/)?.[1] ?? '';
      matt[id].bak = { pt: +(ol.match(/data-pt="([\d.]+)"/)?.[1] ?? 0), tat: /data-tat/.test(ol), rymsInte: /data-ryms-inte/.test(ol) };
    }
  }
  const utskrift = await PDFDocument.load(pdf);
  if (utskrift.getPageCount() !== attGora.length * 2) { console.error(`Utskriften har ${utskrift.getPageCount()} sidor, inte ${attGora.length * 2}.`); process.exit(1); }
  for (const [i, s] of attGora.entries()) {
    const m = matt[s.id];
    if (!m?.bak || !m?.namn || !m?.band?.pt) { fel.push(`${s.namn}: kortet mättes inte`); continue; }
    if (m.framRymsInte) fel.push(`${s.namn}: framsidan ryms inte på kortet; korta meningen eller handlingen`);
    if (m.band.rymsInte) fel.push(`${s.namn}: handlingen ryms inte i bandet i ${STRATEGIKORTETS_STANDARD.bandMinst} punkter; korta ett led`);
    if (m.bak.rymsInte) fel.push(`${s.namn}: baksidan ryms inte i ${STRATEGIKORTETS_STANDARD.bakMinst} punkter; korta insikten eller stegen`);
    if (m.band.pt < STRATEGIKORTETS_STANDARD.band) korta.push(`${s.namn} (bandet i ${m.band.pt} punkter)`);
    if (m.bak.tat || m.bak.pt < STRATEGIKORTETS_STANDARD.bak) korta.push(`${s.namn} (baksidan i ${m.bak.pt} punkter${m.bak.tat ? ', mindre luft' : ''})`);
    const ett = await PDFDocument.create();
    for (const p of await ett.copyPages(utskrift, [2 * i, 2 * i + 1])) ett.addPage(p);
    ett.setTitle(`${s.namn}: strategikort`);
    ett.setAuthor('Niclas Fohlin');
    mkdirSync(UT[delen(s)], { recursive: true });
    const kb = spara(await ett.save({ useObjectStreams: true }), join(UT[delen(s)], strategikortetsFil(s.id)));
    manifest[delen(s)][s.id] = { innehall: innehall(s), summa: summa(s), kb, namn: m.namn, band: m.band, bak: m.bak };
  }
}
for (const m of fel.length ? [] : metodernaAttGora) {
  const { pdf, dom } = skrivUt(`metod-${m.id}`, kortenHtml(m.kort.map(kortet), { typsnitt: url(TYPSNITT), tvaOchTva: true, titel: `Strategikort: ${m.d.titel}` }));
  if (/data-ryms-inte/.test(dom)) fel.push(`${m.d.titel}: ett kort ryms inte`);
  const doc = await PDFDocument.load(pdf);
  doc.setTitle(`Strategikort: ${m.d.titel}`);
  doc.setAuthor('Niclas Fohlin');
  mkdirSync(UT.visas, { recursive: true });
  const kb = spara(await doc.save({ useObjectStreams: true }), join(UT.visas, m.fil));
  manifest.visas[m.nyckel] = { summa: m.summa, kort: m.kort.map((s) => s.id), kb };
  console.log(`${m.d.titel}: ${m.kort.length} strategikort på ${doc.getPageCount()} sidor, ${kb} kB.`);
}
if (allaAttGora && !fel.length) {
  const { pdf, dom } = skrivUt('alla', kortenHtml(visas.map(kortet), { typsnitt: url(TYPSNITT), tvaOchTva: true, titel: 'Strategikort: alla' }));
  if (/data-ryms-inte/.test(dom)) fel.push('Filen med alla kort: ett kort ryms inte');
  const doc = await PDFDocument.load(pdf);
  if (doc.getPageCount() !== 2 * Math.ceil(visas.length / 2)) fel.push(`Filen med alla kort har ${doc.getPageCount()} sidor, inte ${2 * Math.ceil(visas.length / 2)}`);
  doc.setTitle('Strategikort: alla');
  doc.setAuthor('Niclas Fohlin');
  mkdirSync(UT.visas, { recursive: true });
  const kb = spara(await doc.save({ useObjectStreams: true }), join(UT.visas, STRATEGIKORTEN_ALLA.fil));
  manifest.visas[STRATEGIKORTEN_ALLA.nyckel] = { summa: allasSumma, kort: visas.map((s) => s.id), kb };
  console.log(`Filen med alla kort: ${visas.length} kort på ${doc.getPageCount()} sidor, ${kb} kB.`);
}

for (const b of fel.length ? [] : bladenAttGora) {
  const { pdf } = skrivUt(`blad-${b.nyckel.replace(/\W/g, '')}`, bladetHtml(bladetsRader(b.lista), { typsnitt: url(TYPSNITT), titel: b.titel, mitten }));
  const doc = await PDFDocument.load(pdf);
  if (doc.getPageCount() !== 1) fel.push(`${b.titel}: bladet har ${doc.getPageCount()} sidor, inte en; för många strategier för ett A4`);
  doc.setTitle(b.titel);
  doc.setAuthor('Niclas Fohlin');
  mkdirSync(UT[b.del], { recursive: true });
  const kb = spara(await doc.save({ useObjectStreams: true }), join(UT[b.del], b.fil));
  manifest[b.del][b.nyckel] = { summa: b.summa, strategier: b.lista.map((s) => s.id), kb };
  console.log(`${b.titel}: bladet med ${b.lista.length} strategier, ${kb} kB.`);
}

skrivManifest();
if (attGora.length) console.log(`Strategikorten: ${attGora.length} kort, ${attGora.reduce((a, s) => a + (manifest[delen(s)][s.id]?.kb ?? 0), 0)} kB.`);
if (korta.length) console.log(`  ! ryms bara med mindre text eller luft, texter att korta (${korta.length}): ${korta.join(', ')}`);
if (fel.length) { console.error(`Strategikorten stannade:\n  ${fel.join('\n  ')}`); process.exit(1); }
