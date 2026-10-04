// Paritet mellan metodens fil, Word-filen och sidans utskrift (Niclas 2026-09-30: rutan Så gör eleven kom med i Word men
// inte i Skriv ut hela beskrivningen; "Det måste funka i framtiden av sig själv om detta sker igen").
//
// Regeln: varje text i metodens yaml-fil med minst 25 tecken står både i Word-filen med allt (<id>.docx) och i sidans
// utskrift, och varje films stillbilder står efter samma text i båda (huvudfilmen efter faktarutan, en extrafilm vid
// sitt moment). Körs i npm run validera efter bygget, för alla publicerade metoder, och stoppar med sökvägen till texten och
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
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import JSZip from 'jszip';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const MINST = 25;

// Undantagen, med skälet. word eller utskrift: false betyder att texten inte ska stå där.
const UNDANTAG = [
  { vag: /^(taggar|relaterade|serie|omrade|arskurs|format|utkast|uppdaterad|publicerad)(\.|$)/, word: false, utskrift: false, skal: 'register, id och datum, som sidan visar i annan form' },
  { vag: /^tranar$/, word: false, utskrift: false, skal: 'står i den generella metodens lektionsbank, inte i lektionen' },
  { vag: /^(kort|elevblad)(\.|$)/, word: false, utskrift: false, skal: 'pekar ut listor och fält; texterna prövas där de står, under ramar' },
  { vag: /^(film|filmer\.\d+)\.(titel|beskrivning)$/, word: false, utskrift: false, skal: 'filmens namn och textalternativ på skärmen; stillbildernas texter prövas' },
  { vag: /^filmer\.\d+\.efter$/, word: false, utskrift: false, skal: 'filmens plats; platsen prövas nedan' },
  { vag: /^lathund\./, utskrift: false, skal: 'lathunden är en egen sida med egen utskrift' },
  { vag: /^mallar\.\d+\.text$/, word: false, skal: 'mallens text är till läraren och står bara på sidan' },
  { vag: /^mallar\.\d+\.underrad$/, utskrift: false, skal: 'raden ritas som fält med skrivlinjer på sidan' },
  { vag: /^ramar\.ramar\.\d+\.(serie|ark)$/, word: false, utskrift: false, skal: 'bildseriens och arkets id i metodens scenfil; rutorna står som bilder (src/lib/bildserier.ts)' },
  { vag: /^mallar\.\d+\.etiketter\.\d+$/, word: false, utskrift: false, skal: 'seriemallens namn på rutorna står i rutornas bilder, i elevens typsnitt (src/lib/serieritning.js)' },
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
// Utskriftens text, och dess rubriker (h1–h3 som syns, utanför filmernas rutor) med platsen i den normaliserade texten.
function utskriftstext(html) {
  let ut = '';
  let gomda = 0;
  const stack = [];
  const rubriker = [];
  for (const m of html.matchAll(/<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1>|<\/?([a-zA-Z][\w-]*)([^>]*)>|[^<]+/g)) {
    if (m[0].startsWith('<!--') || m[1]) continue;
    if (!m[2]) { if (!gomda) ut += m[0]; continue; }
    if (m[0].startsWith('</')) {
      const el = stack.pop();
      if (el?.gomd) gomda--;
      if (el?.rubrik) el.rubrik.slut = ut.length;
      ut += ' ';
      continue;
    }
    const namn = m[2].toLowerCase();
    if (TOMMA.has(namn) || m[0].endsWith('/>')) continue;
    const el = { namn, klasser: (m[3].match(/\bclass="([^"]*)"/)?.[1] ?? '').split(/\s+/), gomd: false };
    el.gomd = gomd(el, stack);
    if (/^h[1-3]$/.test(namn) && !gomda && !el.gomd && !stack.some((x) => x.klasser.includes('film-bilder'))) rubriker.push(el.rubrik = { start: ut.length, slut: ut.length });
    stack.push(el);
    if (el.gomd) gomda++;
  }
  return { text: avkoda(ut), rubriker: platser(ut, rubriker.map((r) => [r.start, ut.slice(r.start, r.slut)])) };
}
// Rubrikerna med platsen i den normaliserade texten: [index i råtexten, rubrikens text] till { plats, text }.
function platser(ra, rubriker) {
  const ut = [];
  let plats = 0;
  let forra = 0;
  for (const [index, text] of [...rubriker].sort((a, b) => a[0] - b[0])) {
    plats += norm(avkoda(ra.slice(forra, index))).length;
    forra = index;
    ut.push({ plats, text: norm(avkoda(text)) });
  }
  return ut;
}
// Word-filens rubriker (styckeformaten Heading1–3) med platsen i den normaliserade texten.
function wordRubriker(xml) {
  const utanTaggar = [];
  let ra = '';
  for (const m of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>|<[^>]+>|[^<]+/g)) {
    if (m[0].startsWith('<w:p') && /<w:pStyle w:val="Heading[1-3]"\/>/.test(m[0])) utanTaggar.push([ra.length, m[0].replace(/<[^>]+>/g, '')]);
    ra += m[0].replace(/<[^>]+>/g, '');
  }
  return platser(ra, utanTaggar);
}

// En ram där alla fält är tomma är en mall att fylla i: den står i planeringsmallarna, och sidan visar bara dess
// inledning (METODER.md). Dess delar och huvud prövas därför inte mot utskriften.
const tomRam = (ram) => !ram.listor?.length && (ram.delar ?? []).every((d) => (d.falt ?? []).every((f) => !String(f.text ?? '').trim()));
// En lästext är en boksida (lastexter() i src/lib/ramform.ts, samma regel): bladet är elevens, så ramens text ("Läs
// texten och svara på frågorna.") står varken i Word eller i utskriften, och rutan Till läraren står i boksidans sidfot.
const arLastext = (ram) => {
  const m = String(ram.rubrik ?? '').match(/^([^,:]+), ([^:]+): (.+)$/);
  const [text, fragor] = ram.listor ?? [];
  return !!m && (ram.listor ?? []).length === 2 && text.rubrik === m[3] && fragor.rubrik === 'Frågorna' && !text.kolumner && !fragor.kolumner && !ram.huvud && !ram.oversikt;
};

function texter(x, vag, ut, minst = MINST) {
  if (typeof x === 'string') { if (x.length >= minst && /\p{L}/u.test(x)) ut.push({ vag, text: x }); }
  else if (Array.isArray(x)) x.forEach((y, i) => texter(y, `${vag}.${i}`, ut, minst));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) texter(v, vag ? `${vag}.${k}` : k, ut, minst);
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
  const tryckt = utskriftstext(readFileSync(sida, 'utf8'));
  const utskrift = norm(tryckt.text);
  const zip = await JSZip.loadAsync(readFileSync(docx));
  const xml = await zip.file('word/document.xml').async('string');
  // Sidhuvuden och sidfötter hör till Word-filen: boksidornas rad Till läraren står i sidfoten.
  const huvudOchFot = await Promise.all(Object.keys(zip.files).filter((n) => /^word\/(header|footer)\d*\.xml$/.test(n)).map((n) => zip.file(n).async('string')));
  const word = norm(avkoda([xml, ...huvudOchFot].join(' ').replace(/<[^>]+>/g, '')));
  const tommaRamar = (d.ramar?.ramar ?? []).map((r, i) => (tomRam(r) ? new RegExp(`^ramar\\.ramar\\.${i}\\.(delar|huvud)\\.`) : null)).filter(Boolean);
  const lastextRader = (d.ramar?.ramar ?? []).map((r, i) => (arLastext(r) ? new RegExp(`^ramar\\.ramar\\.${i}\\.text\\.`) : null)).filter(Boolean);
  // En lästexts rubrik står i två delar i Word: titeln överst på boksidan och nivån och vad i sidfotens knapp (FYRA STEG ·
  // saga 1). Textsamtal i grupp hade dessutom hela rubriken i lärarsidornas rubriker, men Skrivkurs: sagoboken har inga
  // lärarsidor (2026-10-02). Båda delarna ska stå i Word-filen; utskriften har rubriken i ett stycke.
  const lastextRubrik = new Map((d.ramar?.ramar ?? []).flatMap((r, i) => {
    const m = arLastext(r) && String(r.rubrik).match(/^([^,:]+), ([^:]+): (.+)$/);
    return m ? [[`ramar.ramar.${i}.rubrik`, [norm(`${m[1]} ${m[2]}`), norm(m[3])]]] : [];
  }));
  // Ett sagoblad (sagoform) har fältets fråga och startord på var sin plats: startorden efter stationens namn och frågan
  // under (src/lib/metoddocx.ts, sagoblad). I metodens fil står de i samma fält, med en radbrytning emellan, så i Word
  // prövas delarna var för sig.
  const sagofalt = new Set((d.ramar?.ramar ?? []).flatMap((r, i) => (r.sagoform ? r.delar.flatMap((del, j) => del.falt.map((_, k) => `ramar.ramar.${i}.delar.${j}.falt.${k}.text`)) : [])));
  // En tärning (en kortlista som heter Tärning och har sex kort, src/lib/sagoblad.ts) står med sina ord på skärmen men
  // inte i utskriften, där sidan hänvisar till tärningen att vika i planeringsmallarna (granskningen 2026-10-02).
  const arTarning = (l) => /^Tärning\b/i.test(l.rubrik ?? '') && (d.kort?.listor ?? []).some((t) => (l.rubrik ?? '').includes(t)) && l.rader.flat().filter((c) => String(c ?? '').trim()).length === 6;
  const tarningar = (d.ramar?.ramar ?? []).flatMap((r, i) => (r.listor ?? []).map((l, j) => (arTarning(l) ? new RegExp(`^ramar\\.ramar\\.${i}\\.listor\\.${j}\\.`) : null)).filter(Boolean));
  const saknas = [];
  for (const { vag, text } of texter(d, '', [])) {
    if (lastextRader.some((r) => r.test(vag))) continue;
    const u = UNDANTAG.find((x) => x.vag.test(vag));
    // Arbetsformens delar står i remsan och på lathunden utan sitt nummer ("4. I tur och ordning igen" blir "I tur och
    // ordning igen", passOversikt och arbetsformRad i src/lib/metod.ts), så numret prövas inte (Kompissamtal 2026-10-03).
    const n = norm(/^arbetsform\.delar\.\d+\.rubrik$/.test(vag) ? text.replace(/^\d+\.\s*/, '') : text);
    const iWord = u?.word === false || word.includes(n) || !!lastextRubrik.get(vag)?.every((del) => word.includes(del))
      || (sagofalt.has(vag) && text.split('\n').every((del) => word.includes(norm(del))));
    const iUtskrift = u?.utskrift === false || tommaRamar.some((r) => r.test(vag)) || tarningar.some((r) => r.test(vag)) || utskrift.includes(n);
    provade++;
    if (!iWord || !iUtskrift) saknas.push(`    ${vag}: saknas i ${[!iWord && 'Word-filen', !iUtskrift && 'sidans utskrift'].filter(Boolean).join(' och ')}\n      ”${text.length > 110 ? `${text.slice(0, 110)}…` : text}”`);
  }
  // Filmernas plats (src/lib/film.ts): varje film står i samma avsnitt och efter samma text ur metodens fil i Word-filen
  // och i utskriften, så att en film aldrig står vid ett moment i den ena och ett annat i den andra. Filmen hittas genom
  // rubriken och ingressen över stillbilderna, och alla fyra bildtexterna ska följa. Avsnittet är den närmaste rubriken
  // före filmen som står som rubrik i båda (h1–h3 i utskriften, Heading1–3 i Word); texten är den närmaste text ur
  // filen med minst 25 tecken som slutar före filmen. Sidans egna rader (länken till ramarna sist i urvalet) och det som
  // följer efter filmen (Word fortsätter med planeringsmallarna) påverkar inte prövningen (granskningen 2026-09-30).
  // Rubrikerna räknas när de står som rubrik i båda: sidans egna (Gör så här, rutornas rubriker) och Word-filens egna
  // räknas inte. Avsnittens rubriker kan komma ur schemats förval (Snabbmall, Grunden), inte bara ur metodens fil.
  const rubrikText = new Map(texter(d, '', [], 1).map(({ text }) => [norm(text), text]));
  const allaWord = wordRubriker(xml);
  const iBada = new Set(allaWord.map((r) => r.text).filter((t) => tryckt.rubriker.some((r) => r.text === t)));
  const rubrikerWord = allaWord.filter((r) => iBada.has(r.text));
  const rubrikerUtskrift = tryckt.rubriker.filter((r) => iBada.has(r.text));
  const avsnittFore = (rubriker, pos) => rubriker.filter((r) => r.plats < pos).at(-1)?.text ?? 'början';
  const langa = texter(d, '', []).filter(({ vag }) => !UNDANTAG.some((x) => x.vag.test(vag))).map(({ text }) => norm(text));
  const textFore = (doc, pos) => {
    let bast = { text: 'början', slut: -1 };
    for (const n of langa) { const i = doc.lastIndexOf(n, pos - n.length); if (i >= 0 && (i + n.length > bast.slut || (i + n.length === bast.slut && n.length > bast.text.length))) bast = { text: n, slut: i + n.length }; }
    return bast.text;
  };
  const kort = (n) => { const t = rubrikText.get(n) ?? n; return t.length > 60 ? `${t.slice(0, 60)}…` : t; };
  for (const [nr, film] of [d.film, ...(d.filmer ?? [])].entries()) {
    if (!film) continue;
    const namn = nr === 0 ? 'huvudfilmen' : `extrafilm ${film.nr}`;
    const nyckel = norm(film.rubrik) + norm(film.ingress);
    const pW = word.indexOf(nyckel);
    const pU = utskrift.indexOf(nyckel);
    if (pW < 0 || pU < 0) { saknas.push(`    ${namn}: rubriken och ingressen över stillbilderna saknas i ${[pW < 0 && 'Word-filen', pU < 0 && 'sidans utskrift'].filter(Boolean).join(' och ')}`); continue; }
    if (word.indexOf(nyckel, pW + 1) >= 0 || utskrift.indexOf(nyckel, pU + 1) >= 0) { saknas.push(`    ${namn}: två filmer har samma rubrik och ingress; ge filmen en egen rubrik, så att dess plats går att pröva`); continue; }
    // Bildtexterna i ordning efter rubriken, alla fyra, oavsett längd.
    for (const [doc, pos, var_] of [[word, pW, 'Word-filen'], [utskrift, pU, 'sidans utskrift']]) {
      let i = pos + nyckel.length;
      film.stillbilder.forEach((b, j) => { const k = doc.indexOf(norm(b.text), i); if (k < 0) saknas.push(`    ${namn}: bildtext ${j + 1} saknas efter filmens rubrik i ${var_}: ”${b.text}”`); else i = k; });
    }
    const [aW, aU] = [avsnittFore(rubrikerWord, pW), avsnittFore(rubrikerUtskrift, pU)];
    if (aW !== aU) saknas.push(`    ${namn}: står under rubriken ”${kort(aW)}” i Word-filen men under ”${kort(aU)}” i sidans utskrift; platsen ska vara densamma (src/lib/film.ts, filmerVid)`);
    const [fW, fU] = [textFore(word, pW), textFore(utskrift, pU)];
    if (fW !== fU) saknas.push(`    ${namn}: står efter ”${kort(fW)}” i Word-filen men efter ”${kort(fU)}” i sidans utskrift; platsen ska vara densamma (src/lib/film.ts, filmerVid)`);
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
// Provfilmen (FILMPROV=1, scripts/filmplats.mjs) får aldrig bli kvar i ett bygge.
const provkvar = htmlFiler(join(rot, 'dist')).filter((f) => readFileSync(f, 'utf8').includes('Provtext med femtiofem tecken'));
if (provkvar.length) { console.error(`paritet: provfilmen står kvar i ${provkvar.length} sidor i dist (${provkvar[0]}). Bygg om utan FILMPROV.`); process.exit(1); }
const utan = [];
for (const sida of htmlFiler(join(rot, 'dist'))) {
  for (const m of readFileSync(sida, 'utf8').matchAll(FILLANK)) if (existsSync(join(rot, 'dist', decodeURIComponent(m[2])))) utan.push(`${sida.slice(join(rot, 'dist').length)}: ${m[2]}`);
}
if (utan.length) {
  console.error(`paritet: ${utan.length} länkar till filer saknar version (scripts/filversion.mjs ska ha satt den vid bygget):`);
  for (const rad of utan.slice(0, 10)) console.error(`  ${rad}`);
  process.exit(1);
}
// Elevens typsnitt (K-130): varje tecken som Word-filerna skriver i elevens typsnitt (i Word heter det Andika, i webbens
// fil Ljudlek Elev; src/lib/ljudkort.ts) finns i typsnittsfilen, annars ritar
// Word det i ett annat typsnitt mitt i elevens material. Webbfilen görs ur samma teckenlista (scripts/elevtypsnitt.py).
// Teckentabellen (cmap, format 4 och 12) läses direkt ur ttf-filen.
function cmapTecken(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let cmap = -1;
  for (let i = 0; i < dv.getUint16(4); i++) if (buf.toString('latin1', 12 + 16 * i, 16 + 16 * i) === 'cmap') cmap = dv.getUint32(12 + 16 * i + 8);
  const ut = new Set();
  if (cmap < 0) return ut;
  for (let i = 0; i < dv.getUint16(cmap + 2); i++) {
    const off = cmap + dv.getUint32(cmap + 4 + 8 * i + 4);
    const format = dv.getUint16(off);
    if (format === 4) {
      const segX2 = dv.getUint16(off + 6);
      const [slut, start, delta, spann] = [off + 14, off + 16 + segX2, off + 16 + 2 * segX2, off + 16 + 3 * segX2];
      for (let k = 0; k < segX2 / 2; k++) {
        const [e, st, d, r] = [dv.getUint16(slut + 2 * k), dv.getUint16(start + 2 * k), dv.getInt16(delta + 2 * k), dv.getUint16(spann + 2 * k)];
        for (let c = st; c <= e && c !== 0xffff; c++) {
          let glyf = r === 0 ? (c + d) & 0xffff : dv.getUint16(spann + 2 * k + r + 2 * (c - st));
          if (r !== 0 && glyf) glyf = (glyf + d) & 0xffff;
          if (glyf) ut.add(c);
        }
      }
    } else if (format === 12) {
      for (let j = 0; j < dv.getUint32(off + 12); j++) {
        const b = off + 16 + 12 * j;
        for (let c = dv.getUint32(b); c <= dv.getUint32(b + 4); c++) ut.add(c);
      }
    }
  }
  return ut;
}
const typsnitt = cmapTecken(readFileSync(join(rot, 'public/fonts/ljudlek-elev/LjudlekElev-Regular.ttf')));
const saknasTecken = new Map();
for (const namn of readdirSync(join(rot, 'dist/stodundervisning')).filter((f) => f.endsWith('.docx'))) {
  const zip = await JSZip.loadAsync(readFileSync(join(rot, 'dist/stodundervisning', namn)));
  const xml = await zip.file('word/document.xml').async('string');
  for (const m of xml.matchAll(/<(w|m):r(?:\s[^>]*)?>([\s\S]*?)<\/\1:r>/g)) {
    if (!m[2].includes('w:ascii="Andika"')) continue;
    for (const t of m[2].matchAll(/<[wm]:t(?:\s[^>]*)?>([^<]*)<\/[wm]:t>/g)) {
      for (const tecken of avkoda(t[1])) {
        const c = tecken.codePointAt(0);
        if (c > 0x20 && !typsnitt.has(c)) saknasTecken.set(tecken, new Set([...(saknasTecken.get(tecken) ?? []), namn]));
      }
    }
  }
}
if (!typsnitt.size || saknasTecken.size) {
  console.error(typsnitt.size
    ? `paritet: elevens typsnitt saknar ${saknasTecken.size} tecken som Word-filernas elevmaterial använder:\n${[...saknasTecken].map(([t, f]) => `  ${t} (U+${t.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}) i ${[...f].slice(0, 4).join(', ')}${f.size > 4 ? ` och ${f.size - 4} till` : ''}`).join('\n')}\nLägg tecknen i TECKEN i scripts/elevtypsnitt.py och kör skriptet, eller skriv texten utan dem.`
    : 'paritet: hittar ingen teckentabell i public/fonts/ljudlek-elev/LjudlekElev-Regular.ttf.');
  process.exit(1);
}
// Reservbilderna i Word-filerna (src/lib/reservbild.ts; Niclas 2026-09-30: i Google Dokument blev filmens bilder blå
// rutor). Varje bild har en riktig reservbild och ingen punkt, varje reservbild finns också under
// /stodundervisning/reservbild/, så att filen som webbläsaren bygger får samma bild, och varje tecken i en bilds text finns
// i reservbildens typsnitt, annars ritar ritaren en tom ruta i stället för tecknet (scripts/reservtypsnitt.py).
const sha = (b) => createHash('sha1').update(b).digest('hex');
const reservMapp = join(rot, 'dist/stodundervisning/reservbild');
const reservbilder = new Set(existsSync(reservMapp) ? readdirSync(reservMapp).map((f) => sha(readFileSync(join(reservMapp, f)))) : []);
const reservTypsnitt = cmapTecken(readFileSync(join(rot, 'src/data/typsnitt/Reservbild-Regular.ttf')));
const reservFel = new Set();
let reservAntal = 0;
for (const namn of readdirSync(join(rot, 'dist/stodundervisning')).filter((f) => f.endsWith('.docx'))) {
  const zip = await JSZip.loadAsync(readFileSync(join(rot, 'dist/stodundervisning', namn)));
  // Samma mått (Niclas 2026-09-30: "Viktigt är samma storlek i mått"): reservbilden har rutans proportioner i Word-filen,
  // så att Google Dokument inte drar ut den.
  const dokument = await zip.file('word/document.xml').async('string');
  const mal = new Map([...(await zip.file('word/_rels/document.xml.rels').async('string')).matchAll(/<Relationship\b([^>]*)\/>/g)]
    .map((m) => [m[1].match(/Id="([^"]+)"/)?.[1], m[1].match(/Target="([^"]+)"/)?.[1]]));
  // Bara PNG-bilder som är reservbild till en SVG prövas (granskningen: en vanlig PNG i en mall är ingen reservbild).
  for (const ritning of dokument.matchAll(/<w:drawing>[\s\S]*?<\/w:drawing>/g)) {
    const ruta = ritning[0].match(/<wp:extent cx="(\d+)" cy="(\d+)"/);
    const blip = ritning[0].match(/<a:blip r:embed="([^"]+)"/);
    if (!ruta || !blip || !ritning[0].includes('svgBlip')) continue;
    const media = `word/${mal.get(blip[1])}`;
    const png = await zip.file(media)?.async('nodebuffer');
    if (!png) { reservFel.add(`${namn}: en bild saknar sin reservbild ${media}`); continue; }
    reservAntal++;
    const [pw, ph] = [png.readUInt32BE(16), png.readUInt32BE(20)];
    if (pw <= 1 && ph <= 1) reservFel.add(`${namn}: en bild har en punkt som reservbild, som Google Dokument visar som en ruta`);
    else if (!reservbilder.has(sha(png))) reservFel.add(`${namn}: reservbilden ${media} finns inte under /stodundervisning/reservbild/, så filen som webbläsaren bygger saknar den (src/pages/stodundervisning/reservbild/[nyckel].png.ts)`);
    if (Math.abs(pw / ph / (Number(ruta[1]) / Number(ruta[2])) - 1) > Math.max(0.005, 1.5 / ph)) reservFel.add(`${namn}: en reservbild är ${pw} × ${ph} pixlar men står i en ruta med andra proportioner (reservMatt i src/lib/reservbild.ts)`);
  }
  for (const media of Object.keys(zip.files).filter((n) => n.startsWith('word/media/'))) {
    if (media.endsWith('.svg')) {
      const svg = await zip.file(media).async('string');
      for (const t of svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)) {
        for (const tecken of avkoda(t[1].replace(/<[^>]+>/g, ''))) {
          const c = tecken.codePointAt(0);
          if (c > 0x20 && !reservTypsnitt.has(c)) reservFel.add(`${namn}: tecknet ${tecken} (U+${c.toString(16).toUpperCase().padStart(4, '0')}) i en bild saknas i reservbildens typsnitt; lägg det i TECKEN i scripts/reservtypsnitt.py och kör skriptet, och stannar skriptet för att Andika saknar tecknet, be riggen byta det i bilden`);
        }
      }
    }
  }
}
if (!reservbilder.size || reservFel.size) {
  console.error(`paritet: Word-filernas reservbilder:\n${reservbilder.size ? [...reservFel].slice(0, 10).map((r) => `  ${r}`).join('\n') : '  /stodundervisning/reservbild/ är tom i dist.'}`);
  process.exit(1);
}
// Filmerna spelar och går att pausa (Niclas 2026-09-30: på datorn stod filmen still utan knapp). Film.astro bäddar in
// filmen som <object> och styr den genom --spel, vilket kräver att sajten får bädda in sina egna filer och att varje film
// låter --spel styra sina animeringar.
const ramregel = readFileSync(join(rot, 'netlify.toml'), 'utf8').match(/X-Frame-Options\s*=\s*"([^"]*)"/)?.[1];
if (ramregel && ramregel.toUpperCase() !== 'SAMEORIGIN') {
  console.error(`paritet: netlify.toml sätter X-Frame-Options = "${ramregel}". Filmerna står i <object> (Film.astro) och kräver SAMEORIGIN, annars står de still.`);
  process.exit(1);
}
const filmerUtanPaus = readdirSync(join(rot, 'dist/stodundervisning'))
  .filter((f) => /-film\d?\.svg$/.test(f) && readFileSync(join(rot, 'dist/stodundervisning', f), 'utf8').includes('@keyframes'))
  .filter((f) => !readFileSync(join(rot, 'dist/stodundervisning', f), 'utf8').includes('var(--spel'));
if (filmerUtanPaus.length) {
  console.error(`paritet: ${filmerUtanPaus.length} filmer styr inte sina animeringar med var(--spel), så Pausa fryser dem inte: ${filmerUtanPaus.slice(0, 5).join(', ')}. Be metodriggen om animation-play-state: var(--spel,running).`);
  process.exit(1);
}
console.log(`Paritet: ${provade} texter i ${filer.length} metoder står både i Word-filen och i sidans utskrift, filmerna står på samma plats i båda och går att pausa, länkarna till filerna bär version, elevens typsnitt har varje tecken i elevmaterialet, och Word-filernas ${reservAntal} bilder har en riktig reservbild för Google Dokument.`);
