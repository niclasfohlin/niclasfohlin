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
// En metod med en bank (src/lib/bank.ts): metodens sida har nivåernas översikter, och enheterna med följesidorna står på
// sina egna sidor (K-428), så bankens texter prövas mot enheternas sidor och bankens fil med alla nivåer, och resten av
// metoden mot metodens sida och Word-filen med allt. Problemens bilder (problemets
// sida, Två lösningar och lösningarna på lärarens sida, src/lib/problemform.ts) står utan rubrik och bildtext och prövas
// som strukturens bild, i textalternativet, och lösningarna i ord är bildernas textalternativ på bladet Två lösningar.
//
//   node scripts/paritet.mjs            alla publicerade metoder i dist
//   node scripts/paritet.mjs <id> …     bara de metoderna
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { utanPlanensFalt } from '../src/lib/standard/index.js';
import JSZip from 'jszip';
import { lasTeman, medTemana } from '../src/lib/faktatemaihop.js';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const MINST = 25;
// De centrala sakerna och sajtens adress utan https://, som Word-filens rad om en sak börjar med (src/lib/metoddocx.ts).
const CENTRALA = JSON.parse(readFileSync(join(rot, 'src/data/centrala.json'), 'utf8'));
const SAJT = readFileSync(join(rot, 'src/data/site.ts'), 'utf8').match(/url: '(?:https?:\/\/)?([^'/]+)/)[1];

// Undantagen, med skälet. word eller utskrift: false betyder att texten inte ska stå där.
const UNDANTAG = [
  { vag: /^(taggar|relaterade|serie|omrade|arskurs|format|utkast|uppdaterad|publicerad)(\.|$)/, word: false, utskrift: false, skal: 'register, id och datum, som sidan visar i annan form' },
  { vag: /^tranar$/, word: false, utskrift: false, skal: 'står i den generella metodens lektionsbank, inte i lektionen' },
  { vag: /^lektionsbank\.skalRubrik$/, utskrift: false, skal: 'rubriken över skälen i Word-filens tabell; sidan visar banken som kort, med skälet i varje kort' },
  { vag: /^(kort|elevblad)(\.|$)/, word: false, utskrift: false, skal: 'pekar ut listor och fält; texterna prövas där de står, under ramar' },
  { vag: /^(film|filmer\.\d+)\.(titel|beskrivning)$/, word: false, utskrift: false, skal: 'filmens namn och textalternativ på skärmen; stillbildernas texter prövas' },
  { vag: /^filmer\.\d+\.efter$/, word: false, utskrift: false, skal: 'filmens plats; platsen prövas nedan' },
  { vag: /^pabordet\.\d+\.efter$/, word: false, utskrift: false, skal: 'bildens plats; platsen prövas nedan, som filmernas' },
  { vag: /^snabbmall\.(pass|period)$/, word: false, utskrift: false, skal: 'snabbmallens form: antalet passrader och veckorna, som bladet ritar som rader och band (src/lib/snabbmall.ts)' },
  { vag: /^pabordet\.\d+\.alt$/, word: false, utskrift: false, skal: 'bildens textalternativ (STIL.md under Bildtexter); det prövas nedan, i bildens alt på sidan och i Word' },
  { vag: /^centrala\.\d+\.(id|efterText)$/, word: false, utskrift: false, skal: 'den centrala sakens id och plats; sidan och Word-filen sätter knappen och länken på platsen med samma kod (src/lib/centrala.ts)' },
  { vag: /^lektionskort\.\d+\.efter$/, word: false, utskrift: false, skal: 'lektionskortets plats; sidan och Word-filen sätter knappen och länken på platsen med samma kod (src/lib/lektionskort.ts)' },
  { vag: /^lektionskort\.\d+\.text$/, word: false, skal: 'meningen vid lektionskortets knapp i Materialet; Word-filen har kortet självt på sina egna sidor, och meningen före kortets sidbrytning blev ensam på en sida (kortets texter prövas nedan)' },
  { vag: /^lathund\./, utskrift: false, skal: 'lathunden är en egen sida med egen utskrift' },
  { vag: /^uppfoljning\.rader\.\d+\.resultat$/, word: false, utskrift: false, skal: 'det resultatfältet i Planera insatsen tar emot, med metodens skala (K-579); hur mätningen görs står i radens vad, som sidan och Word-filen visar' },
  { vag: /^mallar\.\d+\.text$/, word: false, skal: 'mallens text är till läraren och står bara på sidan' },
  { vag: /^mallar\.\d+\.underrad$/, utskrift: false, skal: 'raden ritas som fält med skrivlinjer på sidan' },
  { vag: /^ramar\.ramar\.\d+\.(serie|ark)$/, word: false, utskrift: false, skal: 'bildseriens och arkets id i metodens scenfil; rutorna står som bilder (src/lib/bildserier.ts)' },
  { vag: /^ramar\.ramar\.\d+\.innehallstagg$/, word: false, utskrift: false, skal: 'databasens innehållstagg, som Ta fram-sidan visar och väljer ur (src/lib/tafram.ts) och lösningsförslaget har över titeln; elevens blad har den inte' },
  { vag: /^ramar\.ramar\.\d+\.oversikt\.bilder\.\d+$/, word: false, utskrift: false, skal: 'litteraturlistans omslag, filens sökväg; bilden står i listans första kolumn (src/lib/litteraturlista.ts)' },
  { vag: /^mallar\.\d+\.etiketter\.\d+$/, word: false, utskrift: false, skal: 'seriemallens namn på rutorna står i rutornas bilder, i elevens typsnitt (src/lib/serieritning.js)' },
];

const norm = (s) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
// En Word-fils text, med sidhuvuden och sidfötter, normaliserad som ovan.
const wordtext = async (fil) => {
  const zip = await JSZip.loadAsync(readFileSync(fil));
  const delar = await Promise.all(Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n)).map((n) => zip.file(n).async('string')));
  return norm(avkoda(delar.join(' ').replace(/<[^>]+>/g, '')));
};
// Lektionskortets texter (src/data/lektionskort/<stam>.json, riggens papper.json): titeln, raden under knappen, målet,
// rutorna och delarna, cell för cell och rad för rad, baksidan och källraden. Fet stil (**) och ordfogen (U+2060) är form.
const kortetsTexter = (p) => {
  const ut = [];
  const lagg = (t) => { for (const rad of String(t ?? '').split('\n')) { const r = rad.replace(/\*\*/g, '').replace(/\u2060/g, '').trim(); if (r) ut.push(r); } };
  const sida = (s) => {
    lagg(s.titel); lagg(s.undertitel); for (const t of s.info ?? []) lagg(t); lagg(s.ingress);
    for (const k of s.ruta?.punkter ?? []) { lagg(k.rubrik); lagg(k.text); }
    for (const d of s.delar ?? []) { lagg(d.rubrik); lagg(d.text); for (const k of d.kolumner) lagg(k); for (const r of d.rader) for (const c of r) lagg(c); lagg(d.not); }
  };
  sida(p);
  if (p.baksida) sida(p.baksida);
  lagg(p.kalla);
  lagg(p.fot);
  return ut;
};
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

// En faktatext (faktatextAv i src/lib/ramform.ts, samma regel) är sidor i en faktabok: ramens text är etiketten, och
// listornas rubriker säger vad delarna är. Listan "Bild: <namn>" är platsen för bilden På bordet med det namnet, och
// rubriken skrivs inte ut: bildens rubrik och text står i dess textalternativ, och listans rad är bildtexten. Under Läs
// mer står adressen som sin domän, med hela adressen som länkens mål.
const arFaktatext = (ram) => {
  const m = String(ram.rubrik ?? '').match(/^([^,:]+), ([^:]+): (.+)$/);
  const listor = ram.listor ?? [];
  return !!m && listor.length >= 3 && listor[0].rubrik === m[3] && !ram.huvud && !ram.oversikt && !ram.sagoform && !ram.serie && !ram.ark
    && !listor.some((l) => l.kolumner || l.larare) && listor.some((l) => /^Fakta: ./.test(l.rubrik ?? '') || l.rubrik === 'Visste du att …');
};

// En kooperativ struktur (strukturAv i src/lib/ramform.ts, samma regel) är en sida med strukturens namn som titel och den
// första bilden På bordet som hör till ramen, utan rubrik och bildtext, som i metodriggens kompendium: bildens rubrik och
// text står i dess textalternativ, alt på sidan och descr i Word. Ramens rubrik står i Word som namnet, och "Strukturen,
// vecka 1" bara på sidan, för skärmläsaren. Fler bilder till ramen (bild A och bild B) står som andra bilder På bordet.
const arStruktur = (ram) => {
  const [steg, ruta] = ram.listor ?? [];
  return /^Strukturen, [^:]+: .+$/.test(String(ram.rubrik ?? '')) && (ram.listor ?? []).length === 2 && steg.rubrik === 'Så gör ni' && !steg.kolumner && !ruta.kolumner
    && steg.rader.length >= 4 && steg.rader.length <= 9 && ruta.rader.length >= 1 && ruta.rader.length <= 2 && !ram.huvud && !ram.oversikt && !ram.sagoform;
};

// Två texter (textparAv i src/lib/ramform.ts, samma regel): två kolumner och en rad, och frågorna.
const arTextpar = (ram) => {
  const [t, f] = ram.listor ?? [];
  return (ram.listor ?? []).length === 2 && (t.kolumner ?? []).length === 2 && t.rader.length === 1 && !t.larare && f.rubrik === 'Frågorna' && !f.kolumner && f.rader.length >= 3 && f.rader.length <= 5 && !ram.huvud && !ram.oversikt && !ram.sagoform;
};

// En länk i en cell, [text](https://…) i litteraturlistan (src/lib/litteraturlista.ts), står som sin text: adressen syns
// varken i Word eller i utskriften.
const utanLankar = (s) => s.replace(/\[([^\]\n]+)\]\(https?:\/\/[^)\s]+\)/g, '$1');
function texter(x, vag, ut, minst = MINST) {
  if (typeof x === 'string') { const t = utanLankar(x); if (t.length >= minst && /\p{L}/u.test(t)) ut.push({ vag, text: t }); }
  else if (Array.isArray(x)) x.forEach((y, i) => texter(y, `${vag}.${i}`, ut, minst));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) texter(v, vag ? `${vag}.${k}` : k, ut, minst);
  return ut;
}

// Det om bilderna På bordet som inte står i metodens fil (src/data/pabordet.json, scripts/pabordetdata.mjs): elev säger att
// eleven ser på bilden.
const bilddata = existsSync(join(rot, 'src/data/pabordet.json')) ? JSON.parse(readFileSync(join(rot, 'src/data/pabordet.json'), 'utf8')) : {};
// Bankernas filer, ur bygget (src/pages/stodundervisning/bankfiler.json.ts).
const bankfiler = existsSync(join(rot, 'dist/stodundervisning/bankfiler.json')) ? JSON.parse(readFileSync(join(rot, 'dist/stodundervisning/bankfiler.json'), 'utf8')) : [];
const mapp = join(rot, 'src/content/stodundervisning');
const teman = await lasTeman(join(rot, 'src/content/faktateman'), parseYaml);
const valda = process.argv.slice(2);
const filer = readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).filter((f) => !valda.length || valda.includes(f.slice(0, -5)));
let fel = 0;
let provade = 0;
for (const fil of filer) {
  const id = fil.slice(0, -5);
  // Metoden med databasens teman (src/lib/faktatemaihop.js), som databasens filer och enheternas sidor har dem: temanas
  // texter prövas där. Metodens sida och filen med allt har dem inte och prövas mot metodens egen fil (egen). Temanas
  // ramar och bilder står efter metodens, så ramarnas och bildernas nummer är desamma i båda. Planens fält läser bara
  // planens sida (utanPlanensFalt i standarden), och de prövas inte.
  const egen = utanPlanensFalt(parseYaml(readFileSync(join(mapp, fil), 'utf8')));
  const d = medTemana(egen, teman.filter((t) => t.data.metod === id));
  if (d.utkast) continue;
  const sida = join(rot, 'dist/stodundervisning', id, 'index.html');
  const docx = join(rot, 'dist/stodundervisning', `${id}.docx`);
  if (!existsSync(sida) || !existsSync(docx)) { console.error(`paritet: ${id} saknas i dist (sidan eller Word-filen). Kör npm run validera, som bygger först.`); fel++; continue; }
  const html = readFileSync(sida, 'utf8');
  const tryckt = utskriftstext(html);
  const utskrift = norm(tryckt.text);
  let xml = '';
  const huvudOchFot = [];
  for (const fil of [docx]) {
    const zip = await JSZip.loadAsync(readFileSync(fil));
    xml += await zip.file('word/document.xml').async('string');
    // Sidhuvuden och sidfötter hör till Word-filen: boksidornas rad Till läraren står i sidfoten.
    huvudOchFot.push(...await Promise.all(Object.keys(zip.files).filter((n) => /^word\/(header|footer)\d*\.xml$/.test(n)).map((n) => zip.file(n).async('string'))));
  }
  const word = norm(avkoda([xml, ...huvudOchFot].join(' ').replace(/<[^>]+>/g, '')));
  // De centrala sakerna (src/lib/centrala.ts): metodens sida har knappen till saken, och Word-filen raden med namnet och
  // adressen. Platsen sätts av samma kod i båda; här prövas att ingen av dem faller bort (granskningen 2026-10-14).
  for (const x of d.centrala ?? []) {
    const c = CENTRALA.find((y) => y.id === x.id);
    if (!c) continue;
    const rad = `${c.namn}: ${SAJT}${c.kort ?? c.adress}`;
    if (!word.includes(norm(rad))) { console.error(`paritet: ${id}.docx saknar raden "${rad}" (centrala, ${c.id}).`); fel++; }
    const knappar = [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].filter((m) => m[1].split('?')[0] === c.adress && m[2].replace(/<[^>]+>/g, '').startsWith(c.namn));
    if (knappar.length < 3) { console.error(`paritet: ${id} har ${knappar.length} knappar till ${c.namn}; sidan ska ha den under ingressen, överst i menyn och i texten (centrala, ${c.id}).`); fel++; }
  }
  // Lektionskorten (src/lib/lektionskort.ts): knappen bredvid Öppna lathunden i nedladdningsrutan och i menyn och vid
  // lektionen i texten, och Word-filen raden med knappens namn och adressen på samma plats.
  const lektionskort = d.lektionskort ?? [];
  lektionskort.forEach((k, i) => {
    const fil = `${id}-lektionskort${i > 0 ? `-${i + 1}` : ''}.pdf`;
    const knapp = lektionskort.length > 1 && k.namn ? `Lektionskort: ${k.namn}` : 'Lektionskort';
    const rad = `${knapp}: ${SAJT}/stodundervisning/${fil}`;
    if (!word.includes(norm(rad))) { console.error(`paritet: ${id}.docx saknar raden "${rad}" (lektionskort ${i + 1}).`); fel++; }
    const knappar = [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].filter((m) => m[1].split('?')[0] === `/stodundervisning/${fil}` && m[2].replace(/<[^>]+>/g, '').startsWith(knapp));
    if (knappar.length < 4) { console.error(`paritet: ${id} har ${knappar.length} knappar till ${knapp}; sidan ska ha den i nedladdningsrutan och menyn bredvid Öppna lathunden, först i Materialet och vid lektionen i texten (lektionskort ${i + 1}).`); fel++; }
  });
  // Lektionsbanken (Lektionsbank.astro): vid varje lektion en länk till dess kort, och knappen med alla korten.
  if (d.lektionsbank) {
    const lektioner = readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => [f.slice(0, -5), parseYaml(readFileSync(join(mapp, f), 'utf8'))]).filter(([, l]) => l.serie === id && !l.utkast);
    let medKort = 0;
    for (const [lid, l] of lektioner) (l.lektionskort ?? []).forEach((_, i) => {
      medKort++;
      const fil = `/stodundervisning/${lid}-lektionskort${i > 0 ? `-${i + 1}` : ''}.pdf`;
      if (!new RegExp(`href="${fil.replace(/[.]/g, '\\.')}(?:\\?[^"]*)?"`).test(html)) { console.error(`paritet: ${id} saknar länken till ${fil} vid lektionen i lektionsbanken.`); fel++; }
    });
    if (medKort && !new RegExp(`href="/stodundervisning/${id}-alla-lektionskort\\.pdf(?:\\?[^"]*)?"[^>]*data-skriv-ut-pdf`).test(html)) { console.error(`paritet: ${id} saknar knappen Skriv ut alla lektionskort efter lektionsbanken.`); fel++; }
  }
  // Kortet självt står först i Materialet i Word-filen med allt och i planeringsmallarna, och i sin egen Word-fil, vars pdf
  // knappen öppnar (Niclas 2026-10-17: "var skrivs den ur med Skriv ut allt"). Varje text på kortet ska stå i alla tre.
  for (const [i] of lektionskort.entries()) {
    const stam = `${id}-lektionskort${i > 0 ? `-${i + 1}` : ''}`;
    const data = join(rot, 'src/data/lektionskort', `${stam}.json`);
    if (!existsSync(data)) { console.error(`paritet: ${id} har lektionskort ${i + 1} men inte dess innehåll, src/data/lektionskort/${stam}.json.`); fel++; continue; }
    const texter = kortetsTexter(JSON.parse(readFileSync(data, 'utf8')));
    const filerna = [[`${id}.docx`, word], [`${id}-mallar.docx`, null], [`${stam}.docx`, null]];
    for (const [namn, given] of filerna) {
      const fil = join(rot, 'dist/stodundervisning', namn);
      if (!given && !existsSync(fil)) { console.error(`paritet: ${namn} saknas i dist (lektionskort ${i + 1}).`); fel++; continue; }
      const text = given ?? await wordtext(fil);
      const saknas = texter.filter((t) => !text.includes(norm(t)));
      if (saknas.length) { console.error(`paritet: ${namn} saknar ${saknas.length} av lektionskortets texter (src/data/lektionskort/${stam}.json), först "${saknas[0].slice(0, 60)}".`); fel++; }
    }
  }
  // Kontraktet och schemat (hem.kontrakt, hem.schema; TIL i grupp) är material med var sitt A4 (Niclas 2026-10-17): en
  // utskriftsknapp i Materialet och en i Hem och skola, raden i nedladdningsrutan, och sakens texter i den egna Word-filen,
  // vars pdf knapparna öppnar, och i planeringsmallarna (granskningen 2026-10-17).
  for (const vad of ['kontrakt', 'schema']) {
    const sak = d.hem?.[vad];
    if (!sak) continue;
    const stam = `${id}-${vad}`;
    // Avsnittet fram till nästa avsnitt: kontraktet och schemat står i Materialet före ramarnas egna avsnitt (Metod.astro).
    const avsnittet = (sid) => { const i = html.indexOf(`<section id="${sid}"`); if (i < 0) return ''; const j = html.indexOf('<section', i + 1); return html.slice(i, j < 0 ? undefined : j); };
    for (const [plats, del] of [['Materialet', avsnittet('ramar')], ['Hem och skola', avsnittet('hem')]]) {
      const knappar = [...del.matchAll(/<a\b[^>]*>/g)].filter((m) => new RegExp(`\\bhref="/stodundervisning/${stam}\\.pdf(?:\\?[^"]*)?"`).test(m[0]) && /\bdata-skriv-ut-pdf\b/.test(m[0]));
      if (!knappar.length) { console.error(`paritet: ${id} saknar utskriftsknappen till ${stam}.pdf i ${plats} (hem.${vad}).`); fel++; }
    }
    if (!new RegExp(`href="/stodundervisning/${stam}\\.docx(?:\\?[^"]*)?"`).test(html)) { console.error(`paritet: ${id} saknar raden med ${stam}.docx i nedladdningsrutan (hem.${vad}).`); fel++; }
    const sakensTexter = (vad === 'kontrakt' ? [sak.rubrik ?? 'Kontrakt', sak.inledning, ...sak.ansvar.flatMap((a) => [a.rubrik, a.text]), sak.efter] : [sak.rubrik, sak.text, ...sak.kolumner]).filter(Boolean);
    for (const namn of [`${stam}.docx`, `${id}-mallar.docx`]) {
      const fil = join(rot, 'dist/stodundervisning', namn);
      if (!existsSync(fil)) { console.error(`paritet: ${namn} saknas i dist (hem.${vad}).`); fel++; continue; }
      const text = await wordtext(fil);
      const saknas = sakensTexter.filter((t) => !text.includes(norm(t)));
      if (saknas.length) { console.error(`paritet: ${namn} saknar ${saknas.length} av texterna i hem.${vad}, först "${saknas[0].slice(0, 60)}".`); fel++; }
    }
  }
  // Ett radslut inne i en text (w:t) visar Word som ett mellanslag: raderna som metodens fil har under varandra läses då
  // som en fras (kortet När det skaver i Faktatextsamtal i grupp, granskningen 2026-10-13). En radbrytning ska vara en
  // ny rad i stycket (stycke i src/lib/metoddocx.ts), eller ett mellanrum där texten är en rad, som i sidfoten.
  const radslut = [...[xml, ...huvudOchFot].join(' ').matchAll(/<w:t(?:\s[^>]*)?>([^<]*\n[^<]*)<\/w:t>/g)].map((m) => avkoda(m[1]).replace(/\n/g, ' ⏎ ').slice(0, 80));
  if (radslut.length) { console.error(`paritet: ${id}.docx har ${radslut.length} texter med ett radslut som Word visar som mellanslag, först "${radslut[0]}". Bryt raden i stycket (stycke i src/lib/metoddocx.ts).`); fel += radslut.length; }
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
  // En räknebladsrubrik med en nivås led (nivaer, src/lib/nivaer.ts) står med nivåns skylt först och utan ledet:
  // "Före och efter · Bas · Räkna i rutnätet" står som skylten Bas och "Före och efter · Räkna i rutnätet", på sidan och i
  // Word. Andra listor står som de är skrivna, eftersom skylten bara ritas på räknebladen.
  const nivaNamn = new Set((d.nivaer ?? []).map((x) => x.namn));
  const raknebladsRubrik = (vag) => { const m = vag.match(/^ramar\.ramar\.(\d+)\.listor\.(\d+)\.rubrik$/); return !!m && !!d.ramar?.ramar?.[m[1]]?.listor?.[m[2]]?.rakneblad; };
  const medNivanForst = (t) => { const led = t.split(' · '); const i = led.findIndex((x) => nivaNamn.has(x.trim())); return i < 0 ? t : `${led[i].trim()} ${led.filter((_, j) => j !== i).join(' · ')}`; };
  // Strukturernas sidor: rubriken i Word som namnet, och den första bilden På bordet till ramen i textalternativet.
  const strukturRubrik = new Map((d.ramar?.ramar ?? []).flatMap((r, i) => (arStruktur(r) ? [[`ramar.ramar.${i}.rubrik`, norm(String(r.rubrik).replace(/^Strukturen, [^:]+: /, ''))]] : [])));
  const strukturBilder = new Set((d.ramar?.ramar ?? []).filter(arStruktur).flatMap((r) => { const b = (d.pabordet ?? []).find((x) => x.efter === `ram: ${r.rubrik}`); return b ? [b.nr] : []; }));
  const altWord = new Set([...xml.matchAll(/\bdescr="([^"]*)"/g)].map((m) => norm(avkoda(m[1]))));
  const altSida = new Set([...html.matchAll(/\balt="([^"]*)"/g)].map((m) => norm(avkoda(m[1]))));
  const saknas = [];
  // Problemens bilder (src/lib/problemform.ts): bilden till problemets sida och lösningarna till bladet Två lösningar, som
  // också står på lärarens sida. De har ingen rubrik eller bildtext; rubriken och texten står i textalternativet.
  const tvaLosningar = new Map((d.ramar?.ramar ?? []).flatMap((r, i) => (/^Två lösningar: /.test(r.rubrik) && arTextpar(r) && (d.pabordet ?? []).filter((b) => b.efter === `ram: ${r.rubrik}`).length === 2 ? [[i, r]] : [])));
  const problemRamar = new Set((d.ramar?.ramar ?? []).filter((r) => { const m = arLastext(r) && String(r.rubrik).match(/^([^,:]+), ([^:]+): (.+)$/); return !!m && /^problem(\s|$)/i.test(m[2]); }).map((r) => `ram: ${r.rubrik}`));
  const problemBilder = new Set((d.pabordet ?? []).filter((b) => problemRamar.has(b.efter) || [...tvaLosningar.values()].some((r) => b.efter === `ram: ${r.rubrik}`)).map((b) => b.nr));
  // Lösningsförslagen (src/lib/problemform.ts, K-423). Rutans ram, "Lösningsförslagen: <rubrik>", ritas på varje
  // lösningsförslag med rubriken efter kolonet, och ramens text säger det till den som läser metodens fil: den står varken
  // i Word eller i utskriften. Lösningsförslagets rubrik står i två delar, som bladet Två lösningars: titeln överst och
  // nivån och vad i sidfotens knapp.
  const rutansRamar = (d.ramar?.ramar ?? []).flatMap((r, i) => (/^Lösningsförslagen: /.test(String(r.rubrik)) ? [[i, r]] : []));
  const rutansText = rutansRamar.map(([i]) => new RegExp(`^ramar\\.ramar\\.${i}\\.text\\.`));
  const rutansRubrik = new Map(rutansRamar.map(([i, r]) => [`ramar.ramar.${i}.rubrik`, norm(String(r.rubrik).replace(/^Lösningsförslagen: /, ''))]));
  const lfRubrik = new Map((d.ramar?.ramar ?? []).flatMap((r, i) => { const m = String(r.rubrik).match(/^Lösningsförslag: ([^,]+), (problem \d+), (.+)$/); return m ? [[`ramar.ramar.${i}.rubrik`, [norm(`${m[1]} ${m[2]}`), norm(m[3])]]] : []; }));
  // Lärarhandledningarna (src/lib/handledning.ts, K-434). Den gemensamma ramen, "Lärarhandledningarna: <rubrik>", ritas
  // på varje handledning, och dess rubrik och text säger det till den som läser metodens fil: de står varken i Word eller
  // i utskriften. En handlednings rubrik står i två delar: etiketten med nivån ("BAS · LÄRARHANDLEDNING") och temat.
  const gemensamText = (d.ramar?.ramar ?? []).flatMap((r, i) => (/^Lärarhandledningarna: /.test(String(r.rubrik)) ? [new RegExp(`^ramar\\.ramar\\.${i}\\.(rubrik$|text\\.)`)] : []));
  // Rutan och den gemensamma ramen ritas på bankens blad, lösningsförslagen och handledningarna, och prövas därför med
  // bankens texter, mot enheternas och temanas sidor (nedan), inte mot metodens sida (K-428).
  const bladensRamar = new Set((d.ramar?.ramar ?? []).flatMap((r, i) => (/^(Lösningsförslagen|Lärarhandledningarna): /.test(String(r.rubrik)) ? [i] : [])));
  // Textens modell, ifylld (arBladsida i src/lib/bank.ts): ramen "Modellen: <nivå>, text <n>, <titel>" ritas bara som
  // bladet efter den, som hos metodriggen. Ramens rubrik, text och delar (frågan, vad svaret har med och ett svar ur
  // lärarens sida) står varken i Word eller i utskriften, och bladets rubrik och text prövas i textalternativet, som andra
  // blad.
  const bladsidor = (d.ramar?.ramar ?? []).flatMap((r, i) => (/^Modellen: [^,]+, [^,]+ \d+, ./.test(String(r.rubrik)) ? [new RegExp(`^ramar\\.ramar\\.${i}\\.`)] : []));
  // Lästexternas lärarhandledning, "Lärarhandledningen: <titel>" (bokhandledningen i src/lib/handledning.ts, K-439): också
  // i två delar, etiketten ("TEXTSAMTAL I GRUPP · LÄRARHANDLEDNING") och titeln.
  const hlRubrik = new Map((d.ramar?.ramar ?? []).flatMap((r, i) => { const m = String(r.rubrik).match(/^Lärarhandledning: ([^,]+), (.+)$/); const b = String(r.rubrik).match(/^Lärarhandledningen: (.+)$/); return m ? [[`ramar.ramar.${i}.rubrik`, [norm(`${m[1]} lärarhandledning`), norm(r.tema ?? m[2])]]] : b ? [[`ramar.ramar.${i}.rubrik`, [norm('lärarhandledning'), norm(b[1])]]] : []; }));
  // Faktatextens bilder (på platsen "Bild: <namn>" i texten), bladen (rubriken börjar med "Blad: ", src/lib/pabordet.ts)
  // och bilden som eleven ser på (elev i src/data/pabordet.json) står utan rubriken På bordet, som problemens bilder:
  // rubriken och texten står i textalternativet, och de prövas där.
  const faktaplatser = new Set((d.ramar?.ramar ?? []).filter(arFaktatext).flatMap((r) => (r.listor ?? []).flatMap((l) => { const m = String(l.rubrik ?? '').match(/^Bild: (.+)$/); return m ? [`ram: ${r.rubrik}|${m[1]}`] : []; })));
  for (const b of d.pabordet ?? []) {
    if (faktaplatser.has(`${b.efter}|${b.rubrik}`) || /^Blad: /.test(b.rubrik) || bilddata[id]?.[String(b.nr)]?.elev) problemBilder.add(b.nr);
  }
  // Platsens rubrik ("Bild: <namn>") och adresserna under Läs mer skrivs inte ut som de står.
  const faktaUndantag = (d.ramar?.ramar ?? []).flatMap((r, i) => (arFaktatext(r) ? (r.listor ?? []).flatMap((l, j) => [
    ...(/^Bild: ./.test(l.rubrik ?? '') ? [`ramar.ramar.${i}.listor.${j}.rubrik`] : []),
    ...(l.rubrik === 'Läs mer' ? l.rader.flatMap((rad, k) => (/^https?:\/\//.test(String(rad[1] ?? '')) ? [`ramar.ramar.${i}.listor.${j}.rader.${k}.1`] : [])) : []),
  ]) : []));
  const utanUtskrift = new Set(faktaUndantag);
  // Texterna och bildernas textalternativ prövas mot en Word-fil och en utskrift: metodens sida mot Word-filen med allt, och
  // i en bank också enheternas sidor mot bankens fil med alla nivåer och följesidorna (nedan). ram väljer ramarna.
  const ramAv = (efter) => (d.ramar?.ramar ?? []).findIndex((r) => `ram: ${r.rubrik}` === efter);
  const provaTexter = ({ word, utskrift, altWord, altSida, ram = () => true, kalla = d }) => {
  const ut = [];
  for (const nr of problemBilder) {
    const b = d.pabordet.find((x) => x.nr === nr);
    if (!ram(ramAv(b.efter))) continue;
    const alt = norm(`På bordet: ${b.rubrik}${/[.!?]$/.test(b.rubrik) ? '' : '.'} ${b.alt ?? b.text}`);
    if (!altWord.has(alt) || !altSida.has(alt)) ut.push(`    bilden På bordet ${nr} (${b.rubrik}): textalternativet med rubriken och bildtexten saknas i ${[!altWord.has(alt) && 'Word-filerna', !altSida.has(alt) && 'sidorna'].filter(Boolean).join(' och ')}`);
  }
  // En bild På bordet med bildtext och eget textalternativ (alt, STIL.md under Bildtexter): bildtexten prövas som text
  // nedan, och textalternativet här, i bildens alt på sidan och i Word.
  for (const b of (d.pabordet ?? []).filter((x) => x.alt && !problemBilder.has(x.nr) && !strukturBilder.has(x.nr))) {
    if (!ram(ramAv(b.efter))) continue;
    const alt = norm(`På bordet: ${b.rubrik}${/[.!?]$/.test(b.rubrik) ? '' : '.'} ${b.alt}`);
    if (!altWord.has(alt) || !altSida.has(alt)) ut.push(`    bilden På bordet ${b.nr} (${b.rubrik}): textalternativet (alt) saknas i ${[!altWord.has(alt) && 'Word-filerna', !altSida.has(alt) && 'sidorna'].filter(Boolean).join(' och ')}`);
  }
  // Lösningarna i ord på bladet Två lösningar står i bildernas textalternativ, med lösningens namn först.
  const losningsText = new Map([...tvaLosningar].flatMap(([i, r]) => r.listor[0].rader[0].map((t, k) => [`ramar.ramar.${i}.listor.0.rader.0.${k}`, norm(`${r.listor[0].kolumner[k]}: ${t}`)])));
  // Bladets rubrik står i två delar, som en lästexts: titeln överst och nivån och vad i sidfotens knapp.
  const losningsRubrik = new Map([...tvaLosningar].flatMap(([i, r]) => { const m = r.rubrik.match(/^Två lösningar: ([^,]+), ([^,]+), (.+)$/); return m ? [[`ramar.ramar.${i}.rubrik`, [norm(`${m[1]} ${m[2]}`), norm(m[3])]]] : []; }));
  for (const nr of strukturBilder) {
    const b = d.pabordet.find((x) => x.nr === nr);
    if (!ram(ramAv(b.efter))) continue;
    const alt = norm(`På bordet: ${b.rubrik} ${b.alt ?? b.text}`);
    if (!altWord.has(alt) || !altSida.has(alt)) ut.push(`    bilden På bordet ${nr} (${b.rubrik}) på strukturens sida: textalternativet med rubriken och bildtexten saknas i ${[!altWord.has(alt) && 'Word-filen', !altSida.has(alt) && 'sidan'].filter(Boolean).join(' och ')}`);
  }
  for (const { vag, text } of texter(kalla, '', [])) {
    const ri = vag.match(/^ramar\.ramar\.(\d+)\./);
    if (!ram(ri ? Number(ri[1]) : -1)) continue;
    if (lastextRader.some((r) => r.test(vag)) || rutansText.some((r) => r.test(vag)) || gemensamText.some((r) => r.test(vag)) || bladsidor.some((r) => r.test(vag)) || utanUtskrift.has(vag)) continue;
    // Strukturens bild prövas ovan, i textalternativet.
    const pb = vag.match(/^pabordet\.(\d+)\.(rubrik|text)$/);
    if (pb && (strukturBilder.has(d.pabordet[Number(pb[1])].nr) || problemBilder.has(d.pabordet[Number(pb[1])].nr))) continue;
    // En bild vid en del i en ram (del: <rubrik>) står utan egen rubrik, med bildtexten som börjar med På bordet. Bildens
    // rubrik, som Ett möjligt resultat: Vattenplaneten, står då i textalternativet, på sidan och i Word.
    if (pb && pb[2] === 'rubrik' && /^del: /.test(d.pabordet[Number(pb[1])].efter)) {
      const alt = norm(`På bordet: ${text}`);
      if (altWord.has(alt) && altSida.has(alt)) { provade++; continue; }
    }
    if (losningsText.has(vag)) {
      const n = losningsText.get(vag);
      if (!altWord.has(n) || !altSida.has(n)) ut.push(`    ${vag}: lösningen i ord saknas som bildens textalternativ i ${[!altWord.has(n) && 'Word-filerna', !altSida.has(n) && 'sidorna'].filter(Boolean).join(' och ')}`);
      provade++;
      continue;
    }
    if (rutansRubrik.has(vag)) {
      const n = rutansRubrik.get(vag);
      if (!word.includes(n) || !utskrift.includes(n)) ut.push(`    ${vag}: rutans rubrik saknas på lösningsförslagen i ${[!word.includes(n) && 'Word-filerna', !utskrift.includes(n) && 'utskriften'].filter(Boolean).join(' och ')}`);
      provade++;
      continue;
    }
    if (losningsRubrik.has(vag) || lfRubrik.has(vag) || hlRubrik.has(vag)) {
      const delar = losningsRubrik.get(vag) ?? lfRubrik.get(vag) ?? hlRubrik.get(vag);
      if (!delar.every((x) => word.includes(x)) || !delar.every((x) => utskrift.includes(x))) ut.push(`    ${vag}: bladets titel eller nivå saknas i ${[!delar.every((x) => word.includes(x)) && 'Word-filerna', !delar.every((x) => utskrift.includes(x)) && 'utskriften'].filter(Boolean).join(' och ')}`);
      provade++;
      continue;
    }
    const u = UNDANTAG.find((x) => x.vag.test(vag));
    // Arbetsformens delar står i remsan och på lathunden utan sitt nummer ("4. I tur och ordning igen" blir "I tur och
    // ordning igen", passOversikt och arbetsformRad i src/lib/metod.ts), så numret prövas inte (Kompissamtal 2026-10-03).
    const n = norm(/^arbetsform\.delar\.\d+\.rubrik$/.test(vag) ? text.replace(/^\d+\.\s*/, '') : raknebladsRubrik(vag) ? medNivanForst(text) : text);
    const iWord = u?.word === false || word.includes(n) || !!lastextRubrik.get(vag)?.every((del) => word.includes(del)) || (strukturRubrik.has(vag) && word.includes(strukturRubrik.get(vag)))
      || (sagofalt.has(vag) && text.split('\n').every((del) => word.includes(norm(del))));
    const iUtskrift = u?.utskrift === false || tommaRamar.some((r) => r.test(vag)) || tarningar.some((r) => r.test(vag)) || utskrift.includes(n);
    provade++;
    if (!iWord || !iUtskrift) ut.push(`    ${vag}: saknas i ${[!iWord && 'Word-filen', !iUtskrift && 'sidans utskrift'].filter(Boolean).join(' och ')}\n      ”${text.length > 110 ? `${text.slice(0, 110)}…` : text}”`);
  }
  return ut;
  };
  // Bankens ramar, utom nivåernas översikter, står inte på metodens sida (K-428, 2026-10-19): sidan har översikterna och
  // länkar till enheternas sidor, och Skriv ut: Allt skriver ut Word-filens pdf. De prövas mot enheternas sidor och bankens
  // fil nedan.
  const bankensRamar = new Set(bankfiler.filter((f) => f.metod === id && !f.slag).flatMap((f) => (f.ramar ?? []).filter((ri) => !(f.oversikter ?? []).includes(ri))));
  saknas.push(...provaTexter({ word, utskrift, altWord, altSida, ram: (ri) => !bankensRamar.has(ri) && !bladensRamar.has(ri), kalla: egen }));
  // Banken (src/lib/bank.ts): enheternas egna sidor och bankens filer byggs på andra vägar än metodens sida och filen med
  // allt (Metod.astro med enhet, mallBarn i metoddocx.ts), så bankens texter prövas där också, med bankens fil med alla
  // nivåer och följesidorna som Word-fil (granskningen 2026-10-10). I en bank där följesidorna står i egna filer
  // (sidorForSig i bank.ts, faktatexterna) prövas filerna med alla nivåer tillsammans: texterna och lärarens sidor.
  const bankens = bankfiler.filter((f) => f.metod === id && !f.slag);
  const medSidor = bankens.find((f) => /-alla-med-lararens-sida$/.test(f.namn));
  // Databasens filer, en per nivå (databas i bankfiler.json), har temanas texter, och prövas med metodens.
  const bankfilerna = [...(medSidor ? [medSidor] : bankens.filter((f) => !f.databas && /-alla$/.test(f.namn))), ...bankens.filter((f) => f.databas)];
  const bankfil = bankfilerna.length ? { namn: bankfilerna.map((f) => f.namn).join(' och '), oversikter: bankfilerna.flatMap((f) => f.oversikter ?? []), ramar: bankfilerna.flatMap((f) => f.ramar ?? []) } : undefined;
  if (bankfil) {
    const mappen = join(rot, 'dist/stodundervisning', id);
    // Enheternas sidor, och sidorna under dem: temanas sidor på Ta fram en faktatext (texter/<tema>), där lärarhandledningen
    // står.
    const sidor = readdirSync(mappen, { withFileTypes: true }).filter((x) => x.isDirectory() && !['lathund', 'serier'].includes(x.name)).flatMap((x) => [join(mappen, x.name), ...readdirSync(join(mappen, x.name), { withFileTypes: true }).filter((y) => y.isDirectory()).map((y) => join(mappen, x.name, y.name))]);
    const enhetsHtml = sidor.filter((x) => existsSync(join(x, 'index.html'))).map((x) => readFileSync(join(x, 'index.html'), 'utf8')).join('\n');
    const bxmlDelar = [];
    const bdelar = [];
    for (const f of bankfilerna) {
      const bzip = await JSZip.loadAsync(readFileSync(join(rot, 'dist/stodundervisning', `${f.namn}.docx`)));
      bxmlDelar.push(await bzip.file('word/document.xml').async('string'));
      bdelar.push(...await Promise.all(Object.keys(bzip.files).filter((n) => /^word\/(header|footer)\d*\.xml$/.test(n)).map((n) => bzip.file(n).async('string'))));
    }
    const bxml = bxmlDelar.join(' ');
    // Nivåernas översikter står på metodens sida och i bankens fil, inte på enheternas sidor, och prövas med metodens sida.
    const oversikter = new Set(bankfil.oversikter ?? []);
    const iBanken = new Set((bankfil.ramar ?? []).filter((ri) => !oversikter.has(ri)));
    if (!iBanken.size) saknas.push(`    ${bankfil.namn}: bankfiler.json saknar bankens ramar (src/pages/stodundervisning/bankfiler.json.ts)`);
    saknas.push(...provaTexter({
      word: norm(avkoda([bxml, ...bdelar].join(' ').replace(/<[^>]+>/g, ''))),
      utskrift: norm(utskriftstext(enhetsHtml).text),
      altWord: new Set([...bxml.matchAll(/\bdescr="([^"]*)"/g)].map((m) => norm(avkoda(m[1])))),
      altSida: new Set([...enhetsHtml.matchAll(/\balt="([^"]*)"/g)].map((m) => norm(avkoda(m[1])))),
      ram: (ri) => iBanken.has(ri) || bladensRamar.has(ri),
    }).map((x) => `${x}\n      (i bankens fil ${bankfil.namn}.docx och enheternas sidor)`));
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
  // Strukturens ruta Till läraren står i sidfoten i Word och under ramen på sidan, så den räknas inte som texten före en bild.
  const strukturDelar = (d.ramar?.ramar ?? []).map((r, i) => (arStruktur(r) ? new RegExp(`^ramar\\.ramar\\.${i}\\.delar\\.`) : null)).filter(Boolean);
  const langa = texter(d, '', []).filter(({ vag }) => !UNDANTAG.some((x) => x.vag.test(vag)) && !strukturDelar.some((r) => r.test(vag))).map(({ text }) => norm(text));
  // Rutans text döljs med lika många mellanslag, så att ett namn inne i den, som ramens rubrik i "står direkt efter
  // Strukturen, vecka 1: Lika och olika", inte heller räknas (riggens leverans 2026-10-27, Beskrivande text).
  const dolda = texter(d, '', []).filter(({ vag }) => strukturDelar.some((r) => r.test(vag))).map(({ text }) => norm(text)).filter((t) => t.length > 20);
  const utanRutan = (doc) => dolda.reduce((ut, t) => ut.split(t).join(' '.repeat(t.length)), doc);
  const textFore = (dokument, pos) => {
    const doc = utanRutan(dokument);
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
  // Bilderna På bordet (src/lib/pabordet.ts) prövas som filmerna: bilden står i samma avsnitt och efter samma text ur
  // metodens fil i Word-filen och i utskriften. Bilden hittas genom sin rubrik och bildtext, som följer varandra i båda
  // (bilden själv är ingen text); efter en vecka står bara bildtexten, som börjar med På bordet.
  for (const b of egen.pabordet ?? []) {
    if (strukturBilder.has(b.nr) || problemBilder.has(b.nr)) continue;
    const namn = `bilden På bordet ${b.nr} (${b.rubrik})`;
    const nyckel = norm(`På bordet ${/^del:/.test(b.efter ?? '') ? '' : b.rubrik} ${b.text}`);
    const pW = word.indexOf(nyckel);
    const pU = utskrift.indexOf(nyckel);
    if (pW < 0 || pU < 0) { saknas.push(`    ${namn}: rubriken och bildtexten saknas i ${[pW < 0 && 'Word-filen', pU < 0 && 'sidans utskrift'].filter(Boolean).join(' och ')}`); continue; }
    if (word.indexOf(nyckel, pW + 1) >= 0 || utskrift.indexOf(nyckel, pU + 1) >= 0) { saknas.push(`    ${namn}: två bilder har samma rubrik och bildtext; ge bilden en egen bildtext, så att dess plats går att pröva`); continue; }
    const [aW, aU] = [avsnittFore(rubrikerWord, pW), avsnittFore(rubrikerUtskrift, pU)];
    if (aW !== aU) saknas.push(`    ${namn}: står under rubriken ”${kort(aW)}” i Word-filen men under ”${kort(aU)}” i sidans utskrift; platsen ska vara densamma (src/lib/pabordet.ts, paBordetVid)`);
    const [fW, fU] = [textFore(word, pW), textFore(utskrift, pU)];
    if (fW !== fU) saknas.push(`    ${namn}: står efter ”${kort(fW)}” i Word-filen men efter ”${kort(fU)}” i sidans utskrift; platsen ska vara densamma (src/lib/pabordet.ts, paBordetVid)`);
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
// Statistiken (Niclas 2026-10-14: "Kolla också att statistiken funkar för allt", efter att utskriftsknapparna blivit
// pdf:er, K-342): varje länk som går att trycka på till en egen fil (Word, PowerPoint, pdf, zip, mp4) och varje
// utskriftsknapp har ett namn i statistiken, data-goatcounter-click (DRIFT.md under Besöksstatistik). Lathundens knappar
// till passtexten och mallen saknade det i en dag. Länkarna i en mall (<template>), som sidan som slumpar skrivkort läser
// kortens adresser ur, trycker ingen på.
const utanNamn = [];
for (const sida of htmlFiler(join(rot, 'dist'))) {
  const html = readFileSync(sida, 'utf8').replace(/<template\b[\s\S]*?<\/template>/g, '');
  for (const m of html.matchAll(/<(a|button)\b([^>]*)>/g)) {
    const attr = m[2];
    const href = attr.match(/\bhref="([^"]+)"/)?.[1] ?? '';
    const egenFil = /^\/[^/]/.test(href) && /\.(docx|pptx|pdf|zip|mp4)(\?|$)/.test(href);
    if ((egenFil || /data-skriv-ut-pdf/.test(attr)) && !/data-goatcounter-click="/.test(attr)) utanNamn.push(`${sida.slice(join(rot, 'dist').length)}: ${href || attr.slice(0, 60)}`);
  }
}
if (utanNamn.length) {
  console.error(`paritet: ${utanNamn.length} länkar till filer eller utskriftsknappar saknar namn i statistiken (data-goatcounter-click):`);
  for (const rad of utanNamn.slice(0, 10)) console.error(`  ${rad}`);
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
// Filen med allt och filen med bara metoden står i listan för pdf:ernas skull (slag allt och metoden) men är inga
// bankfiler: webbläsaren bygger dem också, så deras reservbilder prövas som förut.
const bankensDocx = new Set(bankfiler.filter((f) => !['allt', 'metoden', 'lathundtext'].includes(f.slag)).map((f) => `${f.namn}.docx`));
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
    // Bankens filer (src/lib/bank.ts) byggs bara vid bygget, aldrig i webbläsaren, så deras reservbilder behöver inte stå där.
    else if (!bankensDocx.has(namn) && !reservbilder.has(sha(png))) reservFel.add(`${namn}: reservbilden ${media} finns inte under /stodundervisning/reservbild/, så filen som webbläsaren bygger saknar den (src/pages/stodundervisning/reservbild/[nyckel].png.ts)`);
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
console.log(`Paritet: ${provade} texter i ${filer.length} metoder står både i Word-filen och i sidans utskrift, filmerna står på samma plats i båda och går att pausa, länkarna till filerna bär version och har namn i statistiken, elevens typsnitt har varje tecken i elevmaterialet, och Word-filernas ${reservAntal} bilder har en riktig reservbild för Google Dokument.`);
