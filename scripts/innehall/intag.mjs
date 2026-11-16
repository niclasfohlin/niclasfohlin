#!/usr/bin/env node
// Intaget av verktyget Innehåll ur metodriggen (K-793; Niclas 2026-11-15: ”en form av artikel med stödmallar”). Riggen
// lämnar leveransen i C:/metodrigg/out/material/innehall/sajten/ i den form sajten bad om (riggens out/FRAN-SAJTEN.md,
// avsnittet Innehåll 2026-11-15 natt): artikeln i fält (innehall-verktyg.yaml), mallarna och exemplen i strategipapperets
// form, elevernas två blad som html, verktygets bild, kartan i två storlekar och förslaget till sådden. Allt prövas innan
// något skrivs, och en leverans med fel tas inte in. Riggen skriver texten; sajten ändrar den aldrig själv, utan ber riggen
// leverera igen.
//
//   node scripts/innehall/intag.mjs                 ta in leveransen
//   node scripts/innehall/intag.mjs --kontrollera   pröva bara, utan att skriva något
//
// Det som tas in: artikeln till src/data/innehall/verktyget.json, mallarna och exemplen till src/data/innehall/papper/
// (sajten ritar Word-filerna ur dem med src/lib/strategipapper.ts, och Word gör pdf:en i valideringen), förslaget till
// sådden till src/data/innehall/sadd-forslag.json (sajten avgör sådden i src/data/innehall-i-metoder.json), elevernas blad
// till scripts/innehall/elevblad/ med typsnittet i scripts/innehall/typsnitt/ (scripts/innehall/elevblad.mjs trycker
// dem), och bilden och kartorna till public/innehall/.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { FORBJUDNA_TECKEN } from 'wordparitet';

const ROT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RIGG = process.env.METODRIGG ?? 'C:/metodrigg';
const KALLA = process.env.INNEHALL_LEVERANS ?? join(RIGG, 'out', 'material', 'innehall', 'sajten');
const TYPSNITT = join(RIGG, 'design', 'typsnitt', 'andika');
const UT = {
  data: join(ROT, 'src', 'data', 'innehall'),
  papper: join(ROT, 'src', 'data', 'innehall', 'papper'),
  elevblad: join(ROT, 'scripts', 'innehall', 'elevblad'),
  typsnitt: join(ROT, 'scripts', 'innehall', 'typsnitt'),
  bilder: join(ROT, 'public', 'innehall'),
};
const kontrollera = process.argv.includes('--kontrollera');

if (!existsSync(join(KALLA, 'innehall-verktyg.yaml'))) { console.error(`Ingen leverans i ${KALLA} (innehall-verktyg.yaml saknas).`); process.exit(1); }
const fel = [];
const las = (fil) => readFileSync(join(KALLA, fil), 'utf8');
const lasYaml = (fil) => { try { return parse(las(fil)); } catch (e) { fel.push(`${fil}: går inte att läsa (${e.message})`); return undefined; } };
const finns = (fil, vad) => { if (!fil || !existsSync(join(KALLA, fil))) { fel.push(`${vad}: filen ${fil ?? '(ingen)'} saknas i leveransen`); return false; } return true; };

const v = lasYaml('innehall-verktyg.yaml') ?? {};
for (const k of ['titel', 'underrubrik', 'ingress', 'borjaHar', 'fragor', 'avsnitt', 'karta', 'forskning', 'kallor', 'fore', 'mallar', 'exempel', 'bild']) if (v[k] === undefined) fel.push(`innehall-verktyg.yaml: fältet ${k} saknas`);

// Frågorna: fem med nummer och en sist, med frågan, raden i Börja här, stycket i Tänk till och raden i mallen.
const NR = ['1', '2', '3', '4', '5', 'Sist'];
const fragor = Array.isArray(v.fragor) ? v.fragor : [];
// Numret är text också när yaml läser det som ett tal (nr: 1), så att sidans adresser (#fraga-1) går att räkna (Codex 2026-11-15).
for (const f of fragor) if (f.nr !== undefined) f.nr = String(f.nr);
if (fragor.map((f) => String(f.nr)).join() !== NR.join()) fel.push(`fragor: numren ska vara ${NR.join(', ')}, och är ${fragor.map((f) => f.nr).join(', ')}`);
const ids = new Set();
for (const f of fragor) {
  if (!f.id || ids.has(f.id)) fel.push(`fragor: id ${f.id ?? '(inget)'} saknas eller står två gånger`);
  ids.add(f.id);
  for (const k of ['fraga', 'kort', 'text', 'mall']) if (typeof f[k] !== 'string' || !f[k].trim()) fel.push(`fragor, ${f.id}: fältet ${k} saknas`);
}

// Mallarna och exemplen: papper i strategipapperets form, eller elevens blad som html.
const mallar = Array.isArray(v.mallar) ? v.mallar : [];
const exempel = Array.isArray(v.exempel) ? v.exempel : [];
const papper = new Map();
const elevblad = new Map();
for (const m of mallar) {
  if (!m.id || !m.namn || !m.for) fel.push(`mallar: ${m.id ?? '(inget id)'} saknar id, namn eller for`);
  if (!finns(m.fil, `mallen ${m.namn ?? m.id}`)) continue;
  if (m.fil.endsWith('.html')) elevblad.set(m.id, las(m.fil));
  else {
    const p = lasYaml(m.fil);
    if (p && p.design !== 'strategipapper') fel.push(`${m.fil}: designen är ${p.design}, och sajten ritar bara strategipapper`);
    if (p) papper.set(m.id, p);
  }
}
for (const e of exempel) {
  if (!e.id || !e.titel) fel.push(`exempel: ${e.id ?? '(inget id)'} saknar id eller titel`);
  if (!finns(e.fil, `exemplet ${e.titel ?? e.id}`)) continue;
  const p = lasYaml(e.fil);
  if (!p) continue;
  if (p.design !== 'strategipapper') fel.push(`${e.fil}: designen är ${p.design}, och sajten ritar bara strategipapper`);
  const rubriker = (p.ruta?.punkter ?? []).map((x) => x.rubrik).join(', ');
  if (rubriker !== 'Före, Efter, I klassrummet') fel.push(`${e.fil}: rutan överst ska ha Före, Efter och I klassrummet, och har ${rubriker || 'inget'}`);
  // Exemplets frågor är artikelns, i samma ordning, så att ett exempel inte står kvar med en gammal fråga (Codex 2026-11-15).
  const exempletsFragor = (p.delar?.[0]?.rader ?? []).map((r) => r[0]);
  fragor.forEach((f, i) => { if (exempletsFragor[i] !== `${f.nr} · ${f.fraga}`) fel.push(`${e.fil}, rad ${i + 1}: står ”${exempletsFragor[i]}” och ska vara ”${f.nr} · ${f.fraga}” ur fragor`); });
  // Och inga rader till: en fråga för mycket i exemplet gick förut igenom (Codex 2026-11-16).
  if (exempletsFragor.length !== fragor.length) fel.push(`${e.fil}: frågetabellen har ${exempletsFragor.length} rader och ska ha ${fragor.length}, en per fråga ur fragor`);
  papper.set(e.id, p);
}

// Raderna i Min innehållsanalys är frågornas nummer och fråga, och på nästa rad mallens rad, tecken för tecken.
const analysen = papper.get('min-innehallsanalys');
if (!analysen) fel.push('mallar: Min innehållsanalys (min-innehallsanalys) saknas');
else {
  const rader = analysen.delar?.[0]?.rader ?? [];
  fragor.forEach((f, i) => {
    const vantad = `${f.nr} · ${f.fraga}\n${f.mall}`;
    if (rader[i]?.[0] !== vantad) fel.push(`Min innehållsanalys, rad ${i + 1}: står ”${String(rader[i]?.[0]).replace(/\n/g, ' / ')}” och ska vara ”${vantad.replace(/\n/g, ' / ')}” ur fragor`);
  });
  if (rader.length !== fragor.length) fel.push(`Min innehållsanalys: frågetabellen har ${rader.length} rader och ska ha ${fragor.length}, en per fråga ur fragor`);
}

// Avsnitten: id, rubrik och block i ordning. Frågorna står en gång, och varje mall som en ruta pekar på finns.
const avsnitt = Array.isArray(v.avsnitt) ? v.avsnitt : [];
const avsnittensId = new Set();
const BLOCK = ['stycke', 'ruta', 'fragorna', 'tabell', 'mall'];
let fragorna = 0;
const mallIdn = new Set(mallar.map((m) => m.id));
const iRutor = new Set();
for (const a of avsnitt) {
  if (!a.id || avsnittensId.has(a.id) || ids.has(a.id)) fel.push(`avsnitt: id ${a.id ?? '(inget)'} saknas eller står två gånger`);
  avsnittensId.add(a.id);
  if (!a.rubrik) fel.push(`avsnitt ${a.id}: rubrik saknas`);
  for (const b of a.block ?? []) {
    const slag = Object.keys(b);
    if (slag.length !== 1 || !BLOCK.includes(slag[0])) { fel.push(`avsnitt ${a.id}: blocket ${JSON.stringify(b).slice(0, 60)} är inget av ${BLOCK.join(', ')}`); continue; }
    if (b.fragorna) fragorna++;
    if (b.mall) for (const id of [b.mall.id].flat()) { if (!mallIdn.has(id)) fel.push(`avsnitt ${a.id}: rutan pekar på mallen ${id}, som inte finns i mallar`); iRutor.add(id); }
    if (b.tabell && (!Array.isArray(b.tabell.huvud) || !Array.isArray(b.tabell.rader))) fel.push(`avsnitt ${a.id}: tabellen saknar huvud eller rader`);
  }
}
if (fragorna !== 1) fel.push(`avsnitt: frågorna ska stå en gång (blocket fragorna), och står ${fragorna} gånger`);
for (const id of mallIdn) if (!iRutor.has(id)) fel.push(`mallen ${id} har ingen ruta i texten, så den har ingen plats för sina knappar`);

// Bilden och kartorna.
finns(v.bild?.fil, 'bilden');
if (!v.bild?.alt) fel.push('bild: textalternativet alt saknas');
finns(v.karta?.fil, 'kartan');
finns(v.karta?.telefon?.fil, 'kartan för telefonen');
if (!v.karta?.alt) fel.push('karta: textalternativet alt saknas');

// Ingen utkastmärkning i det som syns: fälten, mallarna, exemplen och det som står i elevernas blad utanför kommentarerna.
const synligt = (html) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
const texter = [['innehall-verktyg.yaml', JSON.stringify(v)], ...[...papper].map(([id, p]) => [id, JSON.stringify(p)]), ...[...elevblad].map(([id, h]) => [id, synligt(h)])];
for (const [vad, t] of texter) if (/utkast/i.test(t)) fel.push(`${vad}: ordet utkast står kvar`);

// Tecken som sajtens regler för Word och Google Dokument förbjuder (wordparitet), som ☐, i det som blir Word-filer: mallarna
// och exemplen (Codex 2026-11-15, P1).
for (const [id, p] of papper) for (const [tecken, skal] of Object.entries(FORBJUDNA_TECKEN)) if (JSON.stringify(p).includes(tecken)) fel.push(`${id}: tecknet ${tecken} är förbjudet i en Word-fil (${skal})`);
for (const [id, p] of papper) for (const t of new Set(JSON.stringify(p).match(/[☐-☒✓-✘]/g) ?? [])) if (!(t in FORBJUDNA_TECKEN)) fel.push(`${id}: tecknet ${t} är inte prövat i Word och Google Dokument; använd □ eller ett ord`);

// Förslaget till sådden, som sajten avgör.
const sadd = existsSync(join(KALLA, 'innehall-sadd.yaml')) ? lasYaml('innehall-sadd.yaml') : undefined;
if (!Array.isArray(sadd?.sadd)) fel.push('innehall-sadd.yaml: listan sadd saknas');

// Elevernas typsnitt, Andika (SIL Open Font License).
for (const f of ['Andika-Regular.ttf', 'OFL.txt']) if (!existsSync(join(TYPSNITT, f))) fel.push(`typsnittet: ${join(TYPSNITT, f)} saknas`);

if (fel.length) { console.error(`Leveransen tas inte in, ${fel.length} fel (be riggen leverera igen):\n  ${fel.join('\n  ')}`); process.exit(1); }
if (kontrollera) { console.log(`Leveransen håller: ${fragor.length} frågor, ${avsnitt.length} avsnitt, ${mallar.length} mallar, ${exempel.length} exempel och sådden i ${sadd.sadd.length} metoder.`); process.exit(0); }

for (const d of Object.values(UT)) mkdirSync(d, { recursive: true });
const skriv = (fil, data) => writeFileSync(fil, `${JSON.stringify(data, null, 1)}\n`);
// Artikeln, med mallarnas slag och exemplens rutor, som sidan läser. Filnamnen är riggens och följer inte med.
const verktyget = {
  ...v,
  mallar: mallar.map(({ fil, ...m }) => ({ ...m, slag: fil.endsWith('.html') ? 'elevblad' : 'papper' })),
  exempel: exempel.map(({ fil, ...e }) => ({ ...e, ruta: papper.get(e.id).ruta.punkter, rubrik: papper.get(e.id).titel })),
  bild: { ...v.bild, fil: 'bild.svg' },
  karta: { ...v.karta, fil: 'konceptkarta.svg', telefon: { ...v.karta.telefon, fil: 'konceptkarta-telefon.svg' } },
};
skriv(join(UT.data, 'verktyget.json'), verktyget);
// Varje sida i en pdf bär upphovet (scripts/bankpdf.mjs): ett papper med baksida och utan sidfot får sajtens upphov i
// sidfoten, som lektionskorten har, tills riggen lämnar fältet fot själv (riggens out/FRAN-SAJTEN.md, Innehåll, Sidfoten).
const UPPHOVET = '© Niclas Fohlin, niclasfohlin.se/innehall';
for (const [id, p] of papper) skriv(join(UT.papper, `${id}.json`), p.baksida && !p.fot ? { ...p, fot: UPPHOVET } : p);
skriv(join(UT.data, 'sadd-forslag.json'), sadd);
// Elevernas blad pekar på sajtens kopia av typsnittet.
for (const [id, html] of elevblad) writeFileSync(join(UT.elevblad, `${id}.html`), html.replace(/url\((["'])[^"')]*Andika-Regular\.ttf\1\)/g, 'url("../typsnitt/Andika-Regular.ttf")'));
for (const f of ['Andika-Regular.ttf', 'OFL.txt']) copyFileSync(join(TYPSNITT, f), join(UT.typsnitt, f));
copyFileSync(join(KALLA, v.bild.fil), join(UT.bilder, 'bild.svg'));
copyFileSync(join(KALLA, v.karta.fil), join(UT.bilder, 'konceptkarta.svg'));
copyFileSync(join(KALLA, v.karta.telefon.fil), join(UT.bilder, 'konceptkarta-telefon.svg'));
console.log(`Intaget: ${fragor.length} frågor, ${avsnitt.length} avsnitt, ${papper.size} papper (mallar och exempel), ${elevblad.size} elevblad, bilden och kartorna. Kör npm run validera, som gör Word-filerna, pdf:erna och elevernas blad.`);
