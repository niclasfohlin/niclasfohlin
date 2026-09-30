// Paritet mellan metodens fil, Word-filen och sidans utskrift (Niclas 2026-09-30: rutan Så gör eleven kom med i Word men
// inte i Skriv ut hela beskrivningen; "Det måste funka i framtiden av sig själv om detta sker igen").
//
// Regeln: varje text i metodens yaml-fil med minst 25 tecken står både i Word-filen med allt (<id>.docx) och i sidans
// utskrift. Körs i npm run validera efter bygget, för alla publicerade metoder, och stoppar med sökvägen till texten och
// var den saknas. Ett nytt fält i modellen prövas därmed av sig självt: syns dess text inte i båda, stannar valideringen
// tills fältet ritas där eller står bland undantagen nedan med sitt skäl.
//
// Utskriften läses ur den byggda sidan: texten i allt som inte göms av en regel med display: none i @media print i
// src/styles/global.css. Det som bara står i utskriften (filmens stillbilder) räknas med, det som bara står på skärmen
// (filmen, menyerna, nedladdningsrutan) inte. Korta texter prövas inte, eftersom formen gör om dem: etiketter, numrerade
// rubriker i remsan, fasernas namn.
//
//   node scripts/paritet.mjs            alla publicerade metoder i dist
//   node scripts/paritet.mjs <id> …     bara de metoderna
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import JSZip from 'jszip';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const MINST = 25;

// Undantagen, med skälet. word eller utskrift: false betyder att texten inte ska stå där.
const UNDANTAG = [
  { vag: /^(taggar|relaterade|serie|omrade|arskurs|format|utkast|uppdaterad)(\.|$)/, word: false, utskrift: false, skal: 'register, id och datum, som sidan visar i annan form' },
  { vag: /^tranar$/, word: false, utskrift: false, skal: 'står i den generella metodens lektionsbank, inte i lektionen' },
  { vag: /^(kort|elevblad)(\.|$)/, word: false, utskrift: false, skal: 'pekar ut listor och fält; texterna prövas där de står, under ramar' },
  { vag: /^film\.(titel|beskrivning)$/, word: false, utskrift: false, skal: 'filmens namn och textalternativ på skärmen; stillbildernas texter prövas' },
  { vag: /^lathund\./, utskrift: false, skal: 'lathunden är en egen sida med egen utskrift' },
  { vag: /^mallar\.\d+\.text$/, word: false, skal: 'mallens text är till läraren och står bara på sidan' },
  { vag: /^mallar\.\d+\.underrad$/, utskrift: false, skal: 'raden ritas som fält med skrivlinjer på sidan' },
];

const norm = (s) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const avkoda = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// Reglerna som gömmer något i utskriften. Väljare med bara element och klasser, skilda av mellanslag eller >, prövas mot
// elementet och dess förfäder; andra väljare (med :has, attribut) hoppas över, och då räknas elementet som synligt.
const css = readFileSync(join(rot, 'src/styles/global.css'), 'utf8');
const start = css.indexOf('@media print {');
if (start < 0) { console.error('paritet: hittar inte @media print i src/styles/global.css.'); process.exit(1); }
const regler = [];
for (const m of css.slice(start).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{[^{}]*display:\s*none[^{}]*\}/g)) {
  for (const sel of m[1].split(',').map((x) => x.trim())) {
    if (!/^[\w.\- >]+$/.test(sel)) continue;
    const led = [];
    let barn = false;
    for (const d of sel.replace(/\s*>\s*/g, ' > ').split(/\s+/)) {
      if (d === '>') { barn = true; continue; }
      const [tagg, ...klasser] = d.split('.');
      led.push({ tagg: tagg.toLowerCase(), klasser, barn });
      barn = false;
    }
    regler.push(led);
  }
}
if (regler.length < 5) { console.error(`paritet: bara ${regler.length} regler med display: none i @media print; stilmallen har bytt form, se över scripts/paritet.mjs.`); process.exit(1); }
const passar = (el, l) => (!l.tagg || el.namn === l.tagg) && l.klasser.every((k) => el.klasser.includes(k));
function gomd(el, stack) {
  return regler.some((led) => {
    const sista = led[led.length - 1];
    if (!passar(el, sista)) return false;
    let i = stack.length - 1;
    let direkt = sista.barn;
    for (let j = led.length - 2; j >= 0; j--) {
      let hittad = false;
      if (direkt) { hittad = i >= 0 && passar(stack[i], led[j]); i--; }
      else for (; i >= 0; i--) if (passar(stack[i], led[j])) { hittad = true; i--; break; }
      if (!hittad) return false;
      direkt = led[j].barn;
    }
    return true;
  });
}
const TOMMA = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
function utskriftstext(html) {
  let ut = '';
  let gomda = 0;
  const stack = [];
  for (const m of html.matchAll(/<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1>|<\/?([a-zA-Z][\w-]*)([^>]*)>|[^<]+/g)) {
    if (m[0].startsWith('<!--') || m[1]) continue;
    if (!m[2]) { if (!gomda) ut += m[0]; continue; }
    if (m[0].startsWith('</')) { if (stack.pop()?.gomd) gomda--; ut += ' '; continue; }
    const namn = m[2].toLowerCase();
    if (TOMMA.has(namn) || m[0].endsWith('/>')) continue;
    const el = { namn, klasser: (m[3].match(/\bclass="([^"]*)"/)?.[1] ?? '').split(/\s+/), gomd: false };
    el.gomd = gomd(el, stack);
    stack.push(el);
    if (el.gomd) gomda++;
  }
  return avkoda(ut);
}

// En ram där alla fält är tomma är en mall att fylla i: den står i planeringsmallarna, och sidan visar bara dess
// inledning (METODER.md). Dess delar och huvud prövas därför inte mot utskriften.
const tomRam = (ram) => !ram.listor?.length && (ram.delar ?? []).every((d) => (d.falt ?? []).every((f) => !String(f.text ?? '').trim()));

function texter(x, vag, ut) {
  if (typeof x === 'string') { if (x.length >= MINST && /\p{L}/u.test(x)) ut.push({ vag, text: x }); }
  else if (Array.isArray(x)) x.forEach((y, i) => texter(y, `${vag}.${i}`, ut));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) texter(v, vag ? `${vag}.${k}` : k, ut);
  return ut;
}

const mapp = join(rot, 'src/content/stodundervisning');
const valda = process.argv.slice(2);
const filer = readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).filter((f) => !valda.length || valda.includes(f.slice(0, -5)));
let fel = 0;
let provade = 0;
for (const fil of filer) {
  const id = fil.slice(0, -5);
  const d = parseYaml(readFileSync(join(mapp, fil), 'utf8'));
  if (d.utkast) continue;
  const sida = join(rot, 'dist/stodundervisning', id, 'index.html');
  const docx = join(rot, 'dist/stodundervisning', `${id}.docx`);
  if (!existsSync(sida) || !existsSync(docx)) { console.error(`paritet: ${id} saknas i dist (sidan eller Word-filen). Kör npm run validera, som bygger först.`); fel++; continue; }
  const utskrift = norm(utskriftstext(readFileSync(sida, 'utf8')));
  const zip = await JSZip.loadAsync(readFileSync(docx));
  const word = norm(avkoda((await zip.file('word/document.xml').async('string')).replace(/<[^>]+>/g, '')));
  const tommaRamar = (d.ramar?.ramar ?? []).map((r, i) => (tomRam(r) ? new RegExp(`^ramar\\.ramar\\.${i}\\.(delar|huvud)\\.`) : null)).filter(Boolean);
  const saknas = [];
  for (const { vag, text } of texter(d, '', [])) {
    const u = UNDANTAG.find((x) => x.vag.test(vag));
    const n = norm(text);
    const iWord = u?.word === false || word.includes(n);
    const iUtskrift = u?.utskrift === false || tommaRamar.some((r) => r.test(vag)) || utskrift.includes(n);
    provade++;
    if (!iWord || !iUtskrift) saknas.push(`    ${vag}: saknas i ${[!iWord && 'Word-filen', !iUtskrift && 'sidans utskrift'].filter(Boolean).join(' och ')}\n      ”${text.length > 110 ? `${text.slice(0, 110)}…` : text}”`);
  }
  if (saknas.length) {
    fel += saknas.length;
    console.error(`paritet: ${d.titel} (${id}.yaml), ${saknas.length} ${saknas.length === 1 ? 'text' : 'texter'} står inte överallt:\n${saknas.join('\n')}`);
  }
}
if (fel) {
  console.error(`\nparitet: ${fel} fel. Varje text i metodens fil ska stå både i Word-filen med allt och i sidans utskrift.\nRita delen i den gemensamma koden (Metod.astro och [id].astro för sidan och utskriften, metoddocx.ts för Word), eller\nlägg fältet bland undantagen i scripts/paritet.mjs med skälet, om det inte ska stå där.`);
  process.exit(1);
}
// Länkarna till filerna: varje länk från en byggd sida till en fil under /stodundervisning/ bär filens version
// (scripts/filversion.mjs), så att webbläsaren inte kan ge en äldre fil än sidan.
const { FILLANK, htmlFiler } = await import('./filversion.mjs');
const utan = [];
for (const sida of htmlFiler(join(rot, 'dist'))) {
  for (const m of readFileSync(sida, 'utf8').matchAll(FILLANK)) if (existsSync(join(rot, 'dist', decodeURIComponent(m[2])))) utan.push(`${sida.slice(join(rot, 'dist').length)}: ${m[2]}`);
}
if (utan.length) {
  console.error(`paritet: ${utan.length} länkar till filer saknar version (scripts/filversion.mjs ska ha satt den vid bygget):`);
  for (const rad of utan.slice(0, 10)) console.error(`  ${rad}`);
  process.exit(1);
}
console.log(`Paritet: ${provade} texter i ${filer.length} metoder står både i Word-filen och i sidans utskrift, och länkarna till filerna bär version.`);
