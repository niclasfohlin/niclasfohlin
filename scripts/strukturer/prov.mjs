#!/usr/bin/env node
// Provet av verktyget Strukturer (K-650, underlag/prov/strukturer/UPPDRAGET.md under Proven som ska finnas), efter bygget
// i npm run validera:
//
//   sidorna     varje struktur som visas har sin sida i dist med stegen och de fyra förslagen, sin bild och sitt kort, och
//               verktygets sida har en bock för var och en
//   utskriften  ett urval läggs två och två på A4 i webbläsarens kod (src/lib/strukturkort.js): sida 1 har framsidorna
//               och sida 2 baksidorna i samma ordning, uppe före nere, och ett udda antal ger en sista sida med ett kort;
//               filen med alla kort har lika många ark och korten i verktygets ordning. Läst ur pdf:en med pdftotext
//   åt andra hållet  samma prov på ett urval i omvänd ordning ska stanna, så att provet ser felet det letar efter
//
// Bredden i 320 och 360 punkter prövar scripts/utskriftsformat.mjs, som öppnar sidorna i Chrome.
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import YAML from 'yaml';
import * as pdflib from 'pdf-lib';
import { strukturkortenTvaOchTva } from '../../src/lib/strukturkort.js';
import { strukturkortetsFil, STRUKTURKORTEN_ALLA, STRUKTURENS_SLAG } from '../../src/lib/standard/strukturer.js';

const ROT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(ROT, 'dist');
const MAPP = join(ROT, 'src', 'content', 'strukturer');
const ORDNINGEN = Object.keys(STRUKTURENS_SLAG);
const visas = readdirSync(MAPP).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .map((f) => ({ id: f.replace(/\.yaml$/, ''), ...YAML.parse(readFileSync(join(MAPP, f), 'utf8')) }))
  .filter((s) => !s.utkast && !s.vantar && s.bild)
  .sort((a, b) => ORDNINGEN.indexOf(a.slag) - ORDNINGEN.indexOf(b.slag) || a.namn.localeCompare(b.namn, 'sv'));
if (!visas.length) { console.log('Strukturer: ingen struktur visas, så verktyget är inte prövat.'); process.exit(0); }

const fel = [];
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = (vag) => { const f = join(DIST, vag, 'index.html'); return existsSync(f) ? readFileSync(f, 'utf8') : null; };

// Sidorna, bilderna och korten.
const verktyget = html('strukturer');
if (!verktyget) fel.push('dist/strukturer/index.html saknas');
for (const s of visas) {
  const sida = html(join('strukturer', s.id));
  if (!sida) { fel.push(`${s.namn}: sidan saknas i dist`); continue; }
  for (const t of s.steg) if (!sida.includes(esc(t).replace(/\*([^*]+)\*/g, '<em>$1</em>'))) fel.push(`${s.namn}: steget "${t.slice(0, 40)}" står inte på sidan`);
  for (const f of s.forslag ?? []) if (!sida.includes(esc(f.text).slice(0, 60))) fel.push(`${s.namn}: förslaget "${f.text.slice(0, 40)}" står inte på sidan`);
  const svg = join(DIST, 'strukturer', `${s.id}.svg`);
  if (!existsSync(svg) || !readFileSync(svg, 'utf8').startsWith('<svg')) fel.push(`${s.namn}: bilden /strukturer/${s.id}.svg saknas`);
  if (!existsSync(join(DIST, 'strukturer', 'kort', strukturkortetsFil(s.id)))) fel.push(`${s.namn}: kortet saknas i dist`);
  if (verktyget && !verktyget.includes(`data-valj="${s.id}"`)) fel.push(`${s.namn}: verktygets sida har ingen bock för strukturen`);
}

// Utskriften, läst ur pdf:en.
const tmp = mkdtempSync(join(tmpdir(), 'strukturprov-'));
const platt = (t) => t.replace(/\s+/g, ' ').trim();
function sidorna(bytes) {
  const fil = join(tmp, `p${Math.random().toString(36).slice(2)}.pdf`);
  writeFileSync(fil, bytes);
  return execFileSync('pdftotext', ['-enc', 'UTF-8', fil, '-'], { encoding: 'utf8' }).split('\f').slice(0, -1).map(platt);
}
// Felen i en utskrift av korten k, som ska stå två och två i den ordningen.
function ordningensFel(sidor, k, vad) {
  const f = [];
  const ark = Math.ceil(k.length / 2);
  if (sidor.length !== 2 * ark) return [`${vad}: ${sidor.length} sidor, ska vara ${2 * ark}`];
  for (let a = 0; a < ark; a++) {
    const uppe = k[2 * a], nere = k[2 * a + 1];
    for (const [del, text] of [['framsidan', sidor[2 * a]], ['baksidan', sidor[2 * a + 1]]]) {
      const i = text.indexOf(platt(uppe.namn));
      if (i < 0) { f.push(`${vad}: ${uppe.namn} saknas på ark ${a + 1}, ${del}`); continue; }
      if (nere) {
        const j = text.indexOf(platt(nere.namn), i + 1);
        if (j < 0) f.push(`${vad}: ${nere.namn} står inte under ${uppe.namn} på ark ${a + 1}, ${del}`);
      } else if (k.some((x) => x !== uppe && text.includes(platt(x.namn)) && !platt(uppe.namn).includes(platt(x.namn)))) f.push(`${vad}: sista arket ska bara ha ${uppe.namn}`);
    }
    if (!sidor[2 * a + 1].includes(platt(uppe.steg[0]).replace(/\*/g, '').slice(0, 25))) f.push(`${vad}: ${uppe.namn}s första steg står inte på baksidan på ark ${a + 1}`);
  }
  return f;
}
const kortet = (s) => readFileSync(join(ROT, 'public', 'strukturer', 'kort', strukturkortetsFil(s.id)));
const urval = visas.filter((s, i) => i % Math.ceil(visas.length / 3) === 0).slice(0, 3);
fel.push(...ordningensFel(sidorna(await strukturkortenTvaOchTva(pdflib, urval.map(kortet))), urval, 'Urvalet'));
const tva = urval.slice(0, 2);
fel.push(...ordningensFel(sidorna(await strukturkortenTvaOchTva(pdflib, tva.map(kortet))), tva, 'Två kort'));
// Åt andra hållet: urvalet i omvänd ordning ska inte gå igenom provet för den rätta ordningen.
const omvant = [...urval].reverse();
if (!ordningensFel(sidorna(await strukturkortenTvaOchTva(pdflib, omvant.map(kortet))), urval, 'Omvänt').length) fel.push('Provet av ordningen ser inte ett urval i omvänd ordning: provet prövar inget');
const alla = join(ROT, 'public', 'strukturer', 'kort', STRUKTURKORTEN_ALLA.fil);
if (!existsSync(alla)) fel.push(`${STRUKTURKORTEN_ALLA.fil} saknas`);
else fel.push(...ordningensFel(sidorna(readFileSync(alla)), visas, 'Filen med alla kort'));

// Topplistans funktion (K-665) med härmade svar från GoatCounter: listan i rätt ordning och sparad ett dygn hos Netlify,
// och 503 utan nyckel och när GoatCounter svarar 429, så att sidan står kvar med listan från bygget.
{
  const { topplistansSvar } = await import('../../netlify/functions/strukturer-topp.mjs');
  const svar = (status, json) => async () => ({ ok: status === 200, status, json: async () => json });
  const hits = [{ path: '/strukturer/epa', count: 3, path_id: 1 }, { path: 'utskrift:strukturer/epa', count: 2, path_id: 2 }, { path: '/strukturer/visa', count: 9, path_id: 3 }, { path: 'utskrift:strukturer/alla', count: 40, path_id: 4 }];
  const r = await topplistansSvar({ nyckel: 'prov', hamta: svar(200, { hits, more: false }) });
  const d = await r.json();
  if (r.status !== 200 || d.strukturer.map((x) => x.id).join() !== 'epa,visa') fel.push(`Topplistans funktion svarade ${r.status} med ${JSON.stringify(d).slice(0, 120)}`);
  if (!/s-maxage=86400/.test(r.headers.get('netlify-cdn-cache-control') ?? '')) fel.push('Topplistans funktion sparas inte ett dygn hos Netlify (Netlify-CDN-Cache-Control)');
  if ((await topplistansSvar({ nyckel: '' })).status !== 503) fel.push('Topplistans funktion utan nyckel svarar inte 503');
  if ((await topplistansSvar({ nyckel: 'prov', hamta: svar(429, {}) })).status !== 503) fel.push('Topplistans funktion svarar inte 503 när GoatCounter svarar 429');
}

// Sådden (src/lib/vav.ts, METODER.md under Sådden): varje plats i src/data/sadd.json är ritad på metodens sida, med ett litet
// kort för varje struktur, i registrets ordning. En plats som metoden har men som sidan inte ritar, som en ram i en bank,
// försvinner annars utan att bygget stannar (granskningen 2026-11-01, 5b).
const saddJa = JSON.parse(readFileSync(join(ROT, 'src', 'data', 'sadd.json'), 'utf8')).saker.strukturer?.ja ?? {};
let platser = 0;
for (const [metod, x] of Object.entries(saddJa)) {
  if (typeof x !== 'object' || !x.vav) continue;
  const fil = join(DIST, 'stodundervisning', metod, 'index.html');
  if (!existsSync(fil)) { fel.push(`Sådden: ${metod} har ingen sida i dist`); continue; }
  const rutor = [...readFileSync(fil, 'utf8').matchAll(/<aside class="vav[\s\S]*?<\/aside>/g)].map((m) => m[0]);
  if (rutor.length !== x.vav.length) fel.push(`Sådden: ${metod} har ${rutor.length} invävda rutor på sidan, och src/data/sadd.json ${x.vav.length} platser`);
  // Rutorna står i sidans ordning och platserna i registrets, så korten jämförs utan ordningen mellan platserna.
  const pasidan = rutor.map((r) => [...r.matchAll(/href="\/strukturer\/([a-z0-9-]+)"/g)].map((m) => m[1]).join()).sort();
  const iregistret = x.vav.map((r) => (r.delar ?? []).join()).sort();
  if (rutor.length === x.vav.length && pasidan.join(' | ') !== iregistret.join(' | ')) fel.push(`Sådden: ${metod} har korten ${pasidan.join(' | ')} på sidan och ska ha ${iregistret.join(' | ')}`);
  platser += x.vav.length;
}

if (fel.length) { console.error(`Strukturer: ${fel.length} fel:\n  ${fel.slice(0, 30).join('\n  ')}`); process.exit(1); }
console.log(`Sådden: ${platser} platser i ${Object.values(saddJa).filter((x) => typeof x === 'object' && x.vav).length} metoder är ritade med sina kort.`);
console.log(`Strukturer: ${visas.length} strukturer med sida, bild, kort och bock; utskriften två och två prövad med ${urval.length} och 2 kort och i filen med alla (${Math.ceil(visas.length / 2)} ark), och provet ser ett urval i omvänd ordning; topplistans funktion prövad med härmade svar, utan nyckel och med 429.`);
