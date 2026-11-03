#!/usr/bin/env node
// Metodernas paritet (K-621): det en undervisningsmetods sida säger ur metodens fil står också i riggens pdf med allt, och
// det pdf:en säger ur filen står på sidan, så att sidan och dokumentet inte glider isär (ARBETSSATT.md under Design och
// kod, En källa, ingen drift; Stödundervisning har samma prov i scripts/paritet.mjs mot sajtens egen Word-fil). Riggen
// bygger dokumenten och sajten sidan, ur samma metodfil. Provet tar varje text i metodens fil på minst fyra ord och
// jämför den med sidans text i dist och med pdf:ens text, utan mellanslag, radbrytningar och avstavning. En text som står
// på det ena stället men inte det andra är ett fel. En text som inte står på något av dem läser ingen och räknas inte.
// Fälten i UNDANTAG står med avsikt bara på det ena stället, med skälet. Körs i npm run validera efter bygget.
//
//   node scripts/metoderparitet.mjs
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// Texten jämförs utan det som bara styr formen, och pdf:en utan sidhuvud och sidfot (scripts/textjamforelse.mjs).
import { ren, utanHuvudOchFot, pdfText } from './textjamforelse.mjs';
import { parse } from 'yaml';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAPP = join(rot, 'src', 'content', 'undervisningsmetoder');
// Fält som med avsikt står bara på sidan eller bara i pdf:en.
const UNDANTAG = [
  [/^profil\.evidens\.larande\.kort$/, 'kommentaren under Lärande totalt på bankens kort, som pdf:en inte har'],
  [/^ingress$/, 'sidans ingress, som riggens omslag skriver på sitt sätt'],
  [/^lathund\./, 'lathundens texter, som står i lathunden och inte i filen med allt'],
  [/\.(doi|eric|url|id|slug)$/, 'adresser och id'],
  [/^(tid|period)$/, 'faktan, som sidan skriver i fast form (faktaIFastForm i standarden)'],
  [/^uppfoljning\.rader\.tid$/, 'uppföljningens tid, som planen läser (tolkaTid) och läsaren ser i rubriken nar'],
  [/^(planeringsmall|observation)\.|^karna\.komponenter\.kryss$/, 'de tomma mallarna, som står på sidan som bilder av bladen'],
];
// Texter som riggens pdf med allt ännu inte har, fast sidan visar dem, med postens nummer:
// [/metodens id: fältets väg/, 'vad', 'K-nnn']. Raden tas bort när riggen har byggt om, och provet stannar då på varje text
// som glider isär. Tom sedan riggens dce9e59 (K-633) och 10e99c8 (K-706).
const VANTAR = [];
// En text som pdf:en har men som pdftotext läser i en annan ordning, för att en smal tabellcell eller en bildtext bredvid en
// annan bryts över flera rader och läses rad för rad tvärs över cellerna (Lärande på kognitionsvetenskaplig grund
// 2026-11-03: "Avdunstning: solen 3/3 värmer vattnet"): textens tecken står i ordning, från en början på åtta tecken som
// står precis så och inom två och en halv gånger textens längd. Den räknas som funnen och sägs med ett utropstecken.
function iAnnanOrdning(dok, t) {
  const borjan = t.slice(0, 8);
  for (let s = dok.indexOf(borjan); s >= 0; s = dok.indexOf(borjan, s + 1)) {
    const slut = Math.min(dok.length, s + Math.ceil(t.length * 2.5));
    let j = 0;
    for (let i = s; i < slut && j < t.length; i++) if (dok[i] === t[j]) j++;
    if (j === t.length) return true;
  }
  return false;
}
const annanOrdning = [];
const html2text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
// Metodens texter med sin väg, minst fyra ord. En replik inom citattecken jämförs utan dem, eftersom sidan och Word sätter
// dem olika.
const texter = (x, vag = '', ut = []) => {
  if (typeof x === 'string') { if (x.trim().split(/\s+/).length >= 4) ut.push({ vag, text: x }); }
  else if (Array.isArray(x)) x.forEach((y, i) => texter(y, `${vag}[${i}]`, ut));
  else if (x && typeof x === 'object') for (const [k, y] of Object.entries(x)) texter(y, vag ? `${vag}.${k}` : k, ut);
  return ut;
};
const fel = [];
let provade = 0;
const vantande = new Set();
for (const fil of readdirSync(MAPP).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))) {
  const id = fil.replace(/\.yaml$/, '');
  const sida = join(rot, 'dist', 'metoder', id, 'index.html');
  const pdf = join(rot, 'public', 'metoder', `${id}.pdf`);
  if (!existsSync(sida)) continue;
  if (!existsSync(pdf)) { fel.push(`${id}: pdf:en med allt saknas i public/metoder/`); continue; }
  const sidan = ren(html2text(readFileSync(sida, 'utf8')));
  const dokumentet = ren(utanHuvudOchFot(pdfText(pdf)));
  for (const { vag, text } of texter(parse(readFileSync(join(MAPP, fil), 'utf8')))) {
    const falt = vag.replace(/\[\d+\]/g, '');
    if (UNDANTAG.some(([re]) => re.test(falt))) continue;
    const t = ren(text);
    const pa = sidan.includes(t);
    const exakt = dokumentet.includes(t);
    const i = exakt || (pa && iAnnanOrdning(dokumentet, t));
    if (i && !exakt) annanOrdning.push(`${id}: ${vag}`);
    if (pa || i) provade++;
    const vantar = VANTAR.find(([re]) => re.test(`${id}: ${falt}`));
    if (pa && !i && vantar) vantande.add(vantar[1]);
    else if (pa && !i) fel.push(`${id}: ${vag} står på sidan men inte i ${id}.pdf: "${text.slice(0, 70)}"`);
    if (i && !pa) fel.push(`${id}: ${vag} står i ${id}.pdf men inte på sidan: "${text.slice(0, 70)}"`);
  }
}
if (fel.length) { console.error(`metoderparitet: ${fel.length} fel\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`metoderparitet: ${provade} texter ur metodernas filer står både på sidan och i riggens pdf med allt.`);
if (annanOrdning.length) console.log(`! metoderparitet: ${annanOrdning.length} texter står i riggens pdf men läses i en annan ordning, i en tabell eller bredvid en bild: ${annanOrdning.join(', ')}`);
if (vantande.size) console.log(`! metoderparitet: riggens pdf saknar ännu det sidan visar av ${[...vantande].join(', ')} (${[...new Set(VANTAR.filter(([, v]) => vantande.has(v)).map(([, , k]) => k))].join(', ')})`);
