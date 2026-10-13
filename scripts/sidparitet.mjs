#!/usr/bin/env node
// Sidorna i utskriften Allt mot sidorna i den färdiga Word-filen (Niclas 2026-10-13, om Faktatextsamtal i grupp, där
// utskriften hade 148 sidor och Word-filen 150: "Varför skiljer skriv ut allt mot docx/pdf? Vill ju ha dem i paritet",
// och "Det ska alltid ske en granskning mellan slutgiltig docx och skriv ut allt för att försöka få paritet. Den ska
// finnas i din rigg.").
//
// Sidan och Word-filen byggs ur samma metodfil av två olika program: Skriv ut Allt är webbläsarens utskrift av sidan
// (stilmallens @media print), och Word-filen görs av src/lib/metoddocx.ts och bryts av Word. scripts/paritet.mjs prövar
// att varje text står i båda, och scripts/utskriftsformat.mjs att stående och liggande sidor stämmer. Det här skriptet
// prövar det som återstår: att samma text står på samma sida.
//
// Så går jämförelsen till. Utskriften Allt av varje metodsida sparas av scripts/utskriftsformat.mjs när den skrivs ut
// (node_modules/.cache/utskrift-allt/), och Word gör pdf av Word-filen med allt (wordparitet, ps/word-pdf.ps1). Texten i
// de två pdf:erna läses sida för sida. En följd av sex ord som står precis en gång i varje pdf är ett ankare: den säger
// att ordet på den platsen i Word-filen är samma ord som på sin plats i utskriften. Sidhuvuden, sidfötter och annat som
// upprepas är aldrig ankare, eftersom det står mer än en gång. Av ankarna följer vilka sidor i utskriften varje sida i
// Word delar text med. Två sidor som bara delar text med varandra är samma sida. Annars hör sidorna till en följd som
// bryts olika, och den skrivs ut med sidnummer i båda och orden den börjar med: "Word s. 73–77 (5 sidor), utskriften
// s. 80–83 (4 sidor)". Lathundens sidor i Word-filen räknas inte, eftersom lathunden skrivs ut från sin egen sida.
// Sidor utan text som går att känna igen, som ett blad som är en bild, räknas för sig.
//
// Måttet är hur många sidor i Word-filen som inte har en egen sida i utskriften med samma text. Noll är paritet. Talet
// för varje metod står i scripts/sidparitet.json, med datum och skäl, och provet stannar när en metods tal är högre än
// det som står där, och på en metod som saknas i filen. Blir talet lägre skrivs det nya in av sig självt, så att det
// aldrig kan bli sämre igen utan att någon har sett det. En skillnad som får stå kvar skrivs in med
//   node scripts/sidparitet.mjs --godkann <id> --skal "<varför, och köposten som ska laga det>"
// (--godkann alla skriver in varje metod som saknas i filen, som när provet kom till.)
// Rapporten för varje metod som prövas sparas i underlag/prov/sidparitet/<id>.md, och den läses före uppladdningen
// (ARBETSSATT.md under Kontroll före uppladdning).
//
//   node scripts/sidparitet.mjs                alla metoder som har ändrats (körs i npm run validera, efter utskriftsformat)
//   node scripts/sidparitet.mjs --alla         alla metoder
//   node scripts/sidparitet.mjs <id> …         bara de metoderna
//   node scripts/sidparitet.mjs --visa         skriv ut varje följd som bryts olika
//   node scripts/sidparitet.mjs --pdf <utskrift.pdf> <word.pdf>    jämför två pdf:er utan att röra något annat
//
// Kräver Word (node_modules/wordparitet/ps/word-pdf.ps1) och Poppler (pdfinfo, pdftotext). Utan dem säger skriptet obs
// och släpper igenom, som utskriftsformat.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wordinnehall } from './wordinnehall.mjs';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(rot, 'dist');
const args = process.argv.slice(2);
const flagga = (namn) => args.includes(namn);
const varde = (namn) => { const i = args.indexOf(namn); return i >= 0 ? args[i + 1] : undefined; };
const ANKARE = 6;
const MINST = 3;
const sha = (b) => createHash('sha1').update(b).digest('hex');

/** Sidorna i en pdf: orden på varje sida, i läsordning, och om sidan ligger. */
export function pdfsidor(pdf) {
  const info = execFileSync('pdfinfo', ['-f', '1', '-l', '99999', pdf], { encoding: 'utf8' });
  const format = [...info.matchAll(/Page\s+\d+ size:\s+([\d.]+) x ([\d.]+)/g)].map((m) => Number(m[1]) > Number(m[2]));
  const texter = execFileSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\f').slice(0, format.length);
  return texter.map((t, i) => ({
    liggande: format[i],
    text: t.replace(/\s+/g, ' ').trim(),
    // Mjuka bindestreck, ordfogar och avstavningar ska inte göra två ord av ett: bara bokstäver och siffror räknas.
    ord: t.normalize('NFC').toLowerCase().replace(/[­⁠​]/g, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean),
  }));
}

/** Jämför utskriftens sidor med Word-filens. Ger följderna som bryts olika och talen. */
export function jamfor(utskrift, word) {
  // Ordens ström i varje pdf, med sidan varje ord står på.
  const strom = (sidor) => { const ord = []; const sida = []; sidor.forEach((s, i) => { for (const w of s.ord) { ord.push(w); sida.push(i); } }); return { ord, sida }; };
  const u = strom(utskrift);
  const w = strom(word);
  const gram = (s) => { const m = new Map(); for (let i = 0; i + ANKARE <= s.ord.length; i++) { const k = s.ord.slice(i, i + ANKARE).join(' '); m.set(k, m.has(k) ? -1 : i); } return m; };
  const gu = gram(u);
  const gw = gram(w);
  // delar[j][i]: hur många ord på Word-filens sida j som har sitt ankare på utskriftens sida i.
  const delar = word.map(() => new Map());
  const ankrade = { word: word.map(() => 0), utskrift: utskrift.map(() => 0) };
  for (const [k, pw] of gw) {
    if (pw < 0) continue;
    const pu = gu.get(k);
    if (pu === undefined || pu < 0) continue;
    const j = w.sida[pw];
    const i = u.sida[pu];
    delar[j].set(i, (delar[j].get(i) ?? 0) + 1);
    ankrade.word[j]++;
    ankrade.utskrift[i]++;
  }
  // En kant mellan två sidor räknas när de delar minst MINST ord. Ett eller två ord är ankare som går över en sidgräns.
  const kanter = [];
  delar.forEach((m, j) => { for (const [i, n] of m) if (n >= MINST) kanter.push([j, i, n]); });
  // Följder: sidor som hänger ihop genom kanter.
  const fu = new Map();
  const hitta = (x) => { while (fu.get(x) !== x) { fu.set(x, fu.get(fu.get(x))); x = fu.get(x); } return x; };
  for (const [j, i] of kanter) { for (const x of [`w${j}`, `u${i}`]) if (!fu.has(x)) fu.set(x, x); fu.set(hitta(`w${j}`), hitta(`u${i}`)); }
  const grupper = new Map();
  for (const x of fu.keys()) { const r = hitta(x); if (!grupper.has(r)) grupper.set(r, { word: [], utskrift: [] }); grupper.get(r)[x[0] === 'w' ? 'word' : 'utskrift'].push(Number(x.slice(1))); }
  const foljder = [...grupper.values()].map((g) => ({ word: g.word.sort((a, b) => a - b), utskrift: g.utskrift.sort((a, b) => a - b) })).sort((a, b) => (a.word[0] ?? 1e9) - (b.word[0] ?? 1e9));
  const lika = foljder.filter((f) => f.word.length === 1 && f.utskrift.length === 1);
  const olika = foljder.filter((f) => !(f.word.length === 1 && f.utskrift.length === 1));
  // Sidor utan kant: för lite text som går att känna igen (ett blad som är en bild), eller text som bara står i den ena.
  const utan = (sidor, bokstav, antal) => sidor.map((s, i) => i).filter((i) => !fu.has(`${bokstav}${i}`)).map((i) => ({ sida: i, ord: sidor[i].ord.length, ankrade: antal[i] }));
  return { lika, olika, utanWord: utan(word, 'w', ankrade.word), utanUtskrift: utan(utskrift, 'u', ankrade.utskrift) };
}

const spann = (a) => {
  const ut = [];
  for (const x of a) { const s = ut.at(-1); if (s && x === s[1] + 1) s[1] = x; else ut.push([x, x]); }
  return ut.map(([f, t]) => (f === t ? `${f + 1}` : `${f + 1}–${t + 1}`)).join(', ');
};
const sidord = (n) => (n === 1 ? '1 sida' : `${n} sidor`);

/** Rapporten som text: talen först, sedan varje följd som bryts olika. */
export function rapport(namn, utskrift, word, r) {
  const rader = [];
  const iOlika = r.olika.reduce((s, f) => s + f.word.length, 0);
  rader.push(`# Sidparitet: ${namn}`, '');
  rader.push(`Utskriften Allt har ${sidord(utskrift.length)} och Word-filen ${sidord(word.length)}, lathunden oräknad. ${r.lika.length} sidor är samma sida i båda. ${iOlika} sidor i Word-filen står i ${r.olika.length} följder som bryts olika.`, '');
  if (r.olika.length) {
    rader.push('| Word-filen | Utskriften | Följden börjar |', '|---|---|---|');
    for (const f of r.olika) {
      const forst = f.word.length ? word[f.word[0]].text : utskrift[f.utskrift[0]].text;
      rader.push(`| s. ${spann(f.word) || '–'} (${sidord(f.word.length)}) | s. ${spann(f.utskrift) || '–'} (${sidord(f.utskrift.length)}) | ${forst.slice(0, 70).replace(/\|/g, '/')} |`);
    }
    rader.push('');
  }
  const tomma = (lista, sidor, vem) => { if (lista.length) rader.push(`${vem}: ${lista.length} sidor utan text att känna igen (s. ${spann(lista.map((x) => x.sida))}). ${lista.filter((x) => x.ord >= 40).map((x) => `Sidan ${x.sida + 1} har ${x.ord} ord som inte står så i den andra: "${sidor[x.sida].text.slice(0, 60)}"`).join('. ')}`.trim(), ''); };
  tomma(r.utanWord, word, 'Word-filen');
  tomma(r.utanUtskrift, utskrift, 'Utskriften');
  return { text: rader.join('\n'), tal: iOlika };
}

// Två pdf:er direkt, för felsökning.
if (flagga('--pdf')) {
  const [a, b] = args.slice(args.indexOf('--pdf') + 1);
  const utskrift = pdfsidor(a);
  const word = pdfsidor(b).filter((s) => !/\/lathund\b/.test(s.text));
  console.log(rapport('två pdf:er', utskrift, word, jamfor(utskrift, word)).text);
  process.exit(0);
}

const harPoppler = (() => { try { execFileSync('pdfinfo', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; } })();
const wordPs = join(rot, 'node_modules', 'wordparitet', 'ps', 'word-pdf.ps1');
if (!harPoppler || process.platform !== 'win32' || !existsSync(wordPs)) { console.log(`sidparitet: obs, ${!harPoppler ? 'Poppler (pdfinfo)' : 'Word'} saknas, utskriftens sidor är inte prövade mot Word-filens`); process.exit(0); }
if (!existsSync(join(dist, 'stodundervisning'))) { console.error('sidparitet: dist saknas. Kör npm run validera, som bygger först.'); process.exit(1); }

const listfil = join(rot, 'scripts', 'sidparitet.json');
const lista = existsSync(listfil) ? JSON.parse(readFileSync(listfil, 'utf8')) : {};
const cacheFil = join(rot, 'node_modules', '.cache', 'sidparitet.json');
const cache = existsSync(cacheFil) ? JSON.parse(readFileSync(cacheFil, 'utf8')) : {};
const utskrifter = join(rot, 'node_modules', '.cache', 'utskrift-allt');
const wordPdfer = join(rot, 'node_modules', '.cache', 'sidparitet-word');
const rapporter = join(rot, 'underlag', 'prov', 'sidparitet');
const idag = new Date().toLocaleDateString('sv-SE');
const skrivLista = () => writeFileSync(listfil, `${JSON.stringify(Object.fromEntries(Object.entries(lista).sort(([a], [b]) => a.localeCompare(b, 'sv'))), null, 2)}\n`);

const metodMapp = join(dist, 'stodundervisning');
const valda = args.filter((a, i) => !a.startsWith('--') && !['--godkann', '--skal'].includes(args[i - 1]));
const godkann = varde('--godkann');
const metoder = readdirSync(metodMapp, { withFileTypes: true })
  .filter((x) => x.isDirectory() && existsSync(join(metodMapp, x.name, 'index.html')) && existsSync(join(metodMapp, `${x.name}.docx`)))
  .map((x) => x.name)
  .filter((id) => (godkann && godkann !== 'alla' ? id === godkann : !valda.length || valda.includes(id)));
if (godkann && !metoder.length) { console.error(`sidparitet: metoden ${godkann} finns inte i dist.`); process.exit(1); }
if (godkann && !varde('--skal')) { console.error('sidparitet: --godkann kräver --skal "<varför, och köposten som ska laga det>".'); process.exit(1); }

// Utskriften Allt som utskriftsformat sparade senast, och vad den skrevs ut ur.
const utskriftFor = (id) => {
  const fil = existsSync(utskrifter) ? readdirSync(utskrifter).find((f) => f.startsWith(`${id}--`) && f.endsWith('.pdf')) : undefined;
  return fil ? { fil: join(utskrifter, fil), nyckel: fil.slice(id.length + 2, -4) } : undefined;
};
const formatnycklar = existsSync(join(rot, 'node_modules', '.cache', 'utskriftsformat.json')) ? JSON.parse(readFileSync(join(rot, 'node_modules', '.cache', 'utskriftsformat.json'), 'utf8')) : {};
const egen = sha(readFileSync(fileURLToPath(import.meta.url)));

let fel = 0;
let provade = 0;
const rader = [];
mkdirSync(wordPdfer, { recursive: true });
mkdirSync(rapporter, { recursive: true });
for (const id of metoder) {
  const docx = join(metodMapp, `${id}.docx`);
  const wordNyckel = (await wordinnehall(readFileSync(docx), '', { allt: true })).slice(0, 16);
  const u = utskriftFor(id);
  if (!u) { fel++; console.error(`  fel  ${id}: utskriften Allt är inte sparad. Kör node scripts/utskriftsformat.mjs ${id} --alla.`); continue; }
  // Utskriften ska vara den som utskriftsformat senast godkände för sidan som ligger i dist.
  const vantad = formatnycklar[`/stodundervisning/${id}`];
  if (vantad && vantad !== u.nyckel) { fel++; console.error(`  fel  ${id}: den sparade utskriften Allt är äldre än sidan. Kör node scripts/utskriftsformat.mjs ${id} --alla.`); continue; }
  const nyckel = sha(`${u.nyckel} ${wordNyckel} ${egen}`);
  if (!flagga('--alla') && !valda.length && !godkann && cache[id]?.nyckel === nyckel) { rader.push([id, cache[id].tal, true]); continue; }
  // Words pdf av filen, sparad efter filens innehåll.
  const wordPdf = join(wordPdfer, `${id}--${wordNyckel}.pdf`);
  if (!existsSync(wordPdf)) {
    for (const f of readdirSync(wordPdfer)) if (f.startsWith(`${id}--`)) rmSync(join(wordPdfer, f));
    const kopia = join(tmpdir(), `sidparitet-${process.pid}-${id}.docx`);
    copyFileSync(docx, kopia);
    try { execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', wordPs, kopia, wordPdf], { stdio: 'ignore', timeout: 600000 }); } finally { rmSync(kopia, { force: true }); }
    if (!existsSync(wordPdf)) { fel++; console.error(`  fel  ${id}: Word gjorde ingen pdf av ${id}.docx.`); continue; }
  }
  const utskrift = pdfsidor(u.fil);
  const word = pdfsidor(wordPdf).filter((s) => !/\/lathund\b/.test(s.text));
  const r = rapport(id, utskrift, word, jamfor(utskrift, word));
  writeFileSync(join(rapporter, `${id}.md`), `${r.text}\n`);
  cache[id] = { nyckel, tal: r.tal };
  rader.push([id, r.tal, false]);
  provade++;
  if (flagga('--visa')) console.log(`${r.text}\n`);
}

for (const [id, tal] of rader) {
  const post = lista[id];
  // --godkann alla skriver in utgångsläget för varje metod som inte står i listan (första mätningen 2026-10-13).
  if (godkann === id || (godkann === 'alla' && !post && tal > 0)) { lista[id] = { tal, datum: idag, skal: varde('--skal') }; console.log(`  godkänd  ${id}: ${tal} sidor i Word-filen har ingen egen sida i utskriften. Skälet är inskrivet.`); continue; }
  if (!post) {
    if (tal === 0) { lista[id] = { tal: 0, datum: idag }; continue; }
    fel++;
    console.error(`  fel  ${id}: ${tal} sidor i Word-filen har ingen egen sida i utskriften Allt, och metoden står inte i scripts/sidparitet.json. Läs underlag/prov/sidparitet/${id}.md, laga skillnaderna, eller skriv in dem med --godkann ${id} --skal "…".`);
  } else if (tal > post.tal) {
    fel++;
    console.error(`  fel  ${id}: ${tal} sidor i Word-filen har ingen egen sida i utskriften Allt, mot ${post.tal} förut (${post.datum}). Läs underlag/prov/sidparitet/${id}.md.`);
  } else if (tal < post.tal) {
    console.log(`  bättre  ${id}: ${tal} sidor skiljer, mot ${post.tal} förut. Det nya talet är inskrivet.`);
    lista[id] = tal === 0 ? { tal: 0, datum: idag } : { ...post, tal, datum: idag };
  }
}
skrivLista();
mkdirSync(dirname(cacheFil), { recursive: true });
writeFileSync(cacheFil, JSON.stringify(cache, null, 1));
const med = rader.filter(([, tal]) => tal > 0);
console.log(`sidparitet: ${metoder.length} metoder, ${provade} prövade nu${fel ? `, ${fel} fel` : ''}. ${rader.length - med.length} har samma sidor i utskriften Allt som i Word-filen${med.length ? `, och ${med.length} har sidor som bryts olika (${med.map(([id, tal]) => `${id} ${tal}`).join(', ')}). Rapporterna står i underlag/prov/sidparitet/` : ''}`);
process.exit(fel ? 1 : 0);
