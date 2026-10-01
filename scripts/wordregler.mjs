#!/usr/bin/env node
// Klarar Word-filerna reglerna för Word och Google Dokument? (K-138, Niclas 2026-09-30: "Du behöver
// lägga in något form av mekanik och script för att enkelt göra rimlig paritet mellan Word och drive".)
//
// Varje regel kommer ur en mätning eller Googles dokumentation (underlag/prov/k138/sokning.md och METODER.md under
// Word och Google Dokument). Skriptet öppnar varje byggd Word-fil i dist/stodundervisning och stoppar valideringen när
// en regel bryts, med filen och ett utdrag. Det behöver varken Word, Google eller nätverk och tar någon sekund, så det
// går i npm run validera efter bygget. Ett fel rättas i den gemensamma koden (src/lib/metoddocx.ts), aldrig i en
// enskild metod; ett undantag läggs i UNDANTAG nedan med sitt skäl, aldrig tyst.
//
//   node scripts/wordregler.mjs            alla Word-filer i dist/stodundervisning
//   node scripts/wordregler.mjs <fil.docx> …
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSZip = createRequire(import.meta.url)('jszip');
const DIST = join(rot, 'dist/stodundervisning');
const valda = process.argv.slice(2);
const filer = valda.length ? valda : readdirSync(DIST).filter((f) => f.endsWith('.docx')).map((f) => join(DIST, f));

// Typsnitt som finns både i Word och i Google Dokument (pdffonts på Googles pdf:er, K-138). Andika följer med i filen
// och finns i Googles bibliotek. Arial bara för tecken som Googles Calibri saknar: bockrutan och golvbokstavens pil, och
// för boksidornas sidfot, som i metodriggen. Cinzel och Cinzel Decorative är boksidornas titel och anfang (K-148): de
// följer med i filen och finns i Googles bibliotek, och mätbänken (scripts/matbank/radavstand.mjs, H och I) och
// googleprov.mjs på Textsamtal i grupps 51 boksidor visade samma radhöjd och samma sidor i båda (2026-10-01).
const TYPSNITT = new Set(['Calibri', 'Andika', 'Consolas', 'Cambria Math', 'Arial', 'Cinzel', 'Cinzel Decorative']);
// Tecknen i texten utöver bokstäver, siffror och mellanrum. Vanliga skiljetecken finns i husets typsnitt i båda. De
// särskilda står här med vad Word och Google gör med dem (pdfminer på pdf:erna 2026-09-30). Ett tecken som inte står
// här stoppar valideringen: pröva det i Word och Google (METODER.md, Word och Google Dokument) och för in det med sitt
// skäl. Ett undantag för ett förbjudet tecken gäller filerna som börjar med namnen i `utom`, med skälet.
const VANLIGA = new Set([...'.,:;!?"\'”“’‘()[]/-–—_·•©+=%&÷×…°*#§<>|']);
const SARSKILDA = {
  '□': 'bockrutan, i Arial i båda (bockRun)',
  '→': 'Googles Calibri saknar pilen och ritar den i Arial, som har lägre radhöjd än Calibri; raden blir inte högre',
  '↑': 'golvbokstavens pil, i Arial i båda',
  '−': 'minustecknet; Googles Calibri saknar det och ritar det i Arial, raden blir inte högre',
  '⁠': 'ordfogen efter tankstrecket i ett spann (ejBryt, "åk 4–9" hålls ihop); nollbred; Word ritar den med Segoe UI Symbol och Google med FreeSans, K-056',
  '‑': 'hårt bindestreck (w:noBreakHyphen) i sss-ooo-lll; Google ritar det med MS-PGothic',
};
const FORBJUDNA_TECKEN = {
  '☐': { skal: 'bockrutan; använd bockRun() i metoddocx.ts, □ i Arial', utom: [] },
  '✓': {
    skal: 'bocken; Word och Google ritar den med var sitt reservtypsnitt; skriv ett ord i metodens text',
    // Problemlösning i grupp har "187 ✓" i exemplets tabell, ur metodriggen 2026-09: ett tecken i en tabellcell, där
    // raden inte blir högre än cellens text. Metodens text ändras inte för en glyf; riggen skriver ord (FRAN-SAJTEN.md).
    utom: ['problemlosning-i-grupp', 'alla-metoder'],
  },
};
const UNDANTAG = [];

// Tabellraderna, nivå för nivå: varje rads egen höjd, den största cellmarginalen upptill och nedtill i radens egna
// celler, den tjockaste kanten över eller under en cell i punkter och om någon av dess celler har en tabell i sig.
function tabellrader(xml) {
  const rader = [];
  const oppna = [];
  for (const m of xml.matchAll(/<w:tbl>|<w:tr>|<\/w:tr>|<w:trHeight\b[^>]*\/>|<w:tcMar>(?:(?!<\/w:tcMar>).)*<\/w:tcMar>|<w:tcBorders>(?:(?!<\/w:tcBorders>).)*<\/w:tcBorders>/gs)) {
    const t = m[0];
    const rad = oppna[oppna.length - 1];
    if (t === '<w:tbl>') { if (rad) rad.inre = true; }
    else if (t === '<w:tr>') oppna.push({ index: m.index, hojd: null, upp: 0, ned: 0, kant: 0, inre: false });
    else if (t === '</w:tr>') rader.push(oppna.pop());
    else if (t.startsWith('<w:trHeight') && rad) rad.hojd = t.match(/w:hRule="(\w+)"/)?.[1] ?? 'atLeast';
    else if (t.startsWith('<w:tcBorders') && rad) for (const v of t.matchAll(/<w:(?:top|bottom)\b([^>]*)\/>/g)) {
      const stil = v[1].match(/w:val="(\w+)"/)?.[1];
      if (stil && stil !== 'nil' && stil !== 'none') rad.kant = Math.max(rad.kant, Number(v[1].match(/w:sz="(\d+)"/)?.[1] ?? 0) / 8);
    }
    else if (rad) for (const v of t.matchAll(/<w:(top|bottom) w:type="dxa" w:w="(\d+)"/g)) {
      if (v[1] === 'top') rad.upp = Math.max(rad.upp, Number(v[2]));
      else rad.ned = Math.max(rad.ned, Number(v[2]));
    }
  }
  return rader;
}
// Kantens bildpunkter i Google, i twips: närmaste antal hela bildpunkter (0,75 pt), minst en (mätbänken 2026-09-30).
const kantensBildpunkter = (pt) => (pt > 0 ? Math.max(15, Math.round(pt / 0.75) * 15) : 0);
// Texten närmast efter träffen, så att stället går att känna igen i filen.
const utdrag = (xml, i) => (xml.slice(i, i + 6000).match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, '')).join(' ').replace(/\s+/g, ' ').trim().slice(0, 70) || 'utan text';
const REGLER = [
  {
    namn: 'exakt eller minsta radavstånd',
    skal: 'Google läser w:line som en multipel av enkelt radavstånd (värdet delat med 240); använd radHojd() eller luft()',
    prova: (xml) => [...xml.matchAll(/<w:spacing\b[^>]*w:lineRule="(exact|atLeast)"/g)].map((m) => m.index),
  },
  {
    namn: 'rad med satt höjd och cellmarginal upptill, eller nedtill mer än kantens bildpunkter',
    skal: 'Word lägger marginalen ovanpå radens höjd, Google räknar in den; googleTabeller() i dokument() flyttar den till höjden och lämnar nedtill bara kantens bildpunkter',
    prova: (xml) => tabellrader(xml).filter((r) => r.hojd && (r.upp > 0 || r.ned > kantensBildpunkter(r.kant))).map((r) => r.index),
  },
  {
    namn: 'tabell i en cell i en rad med satt höjd',
    skal: 'Google gör raden högre än höjden (vikkortet 3,42 cm mot 3,2 cm); använd stycken, till exempel med tabbstopp',
    prova: (xml) => tabellrader(xml).filter((r) => r.hojd && r.inre).map((r) => r.index),
  },
  {
    namn: 'tabell i en cell utan ett stycke på en punkt före och efter',
    skal: 'Google lägger ett tomt stycke i normal storlek före och efter en tabell som står först eller sist i en cell, och rutan blir 17 pt högre; kringTabeller() i metoddocx.ts',
    // En tabell först i en cell (med eller utan w:tcPr), två tabeller i följd, och ett tomt stycke i normal storlek sist
    // i cellen efter en tabell. Ett stycke med text där stoppar inte: det lägger Google inget till.
    prova: (xml) => [
      ...xml.matchAll(/<\/w:tcPr><w:tbl>|<w:tc><w:tbl>|<\/w:tbl><w:tbl>|<\/w:tbl><w:p\/><\/w:tc>/g),
      ...[...xml.matchAll(/<\/w:tbl>(<w:p>(?:(?!<\/w:p>).)*<\/w:p>)<\/w:tc>/gs)]
        .filter((m) => !/<w:sz w:val="[12]"\/>/.test(m[1]) && !/<w:t(?:\s[^>]*)?>[^<]+<\/w:t>/.test(m[1])),
    ].map((m) => m.index),
  },
  {
    namn: 'avsnittsbrytningens stycke högre än en punkt',
    skal: 'Google flyttar stycket till en ny sida när sidan är full och gör en tom sida; avsnittsStycke() i metoddocx.ts',
    prova: (xml) => [...xml.matchAll(/<w:p><w:pPr>((?:(?!<\/w:pPr>).)*)<w:sectPr/gs)].filter((m) => !/<w:sz w:val="[12]"\/>/.test(m[1])).map((m) => m.index),
  },
  {
    namn: 'dokumentet slutar med en tabell',
    skal: 'Word och Google lägger till ett stycke i normal storlek efter tabellen, och en full sida får en tom sida efter sig',
    prova: (xml) => (/<\/w:tbl><w:sectPr\b(?:(?!<w:sectPr).)*<\/w:sectPr><\/w:body>/s.test(xml) ? [xml.lastIndexOf('</w:tbl>')] : []),
  },
  {
    namn: 'typsnitt som Google saknar',
    skal: `Google ritar texten med ett reservtypsnitt med andra mått; tillåtna: ${[...TYPSNITT].join(', ')}`,
    prova: (xml) => [...xml.matchAll(/<w:rFonts\b[^>]*>/g)].filter((m) => [...m[0].matchAll(/w:(?:ascii|hAnsi|cs|eastAsia)="([^"]+)"/g)].some((f) => !TYPSNITT.has(f[1]))).map((m) => m.index),
  },
  {
    namn: 'tecken som inte är prövade i Word och Google',
    skal: `förbjudna: ${Object.entries(FORBJUDNA_TECKEN).map(([t, s]) => `${t} (${s.skal})`).join(', ')}; ett nytt tecken prövas och förs in i SARSKILDA i wordregler.mjs med sitt skäl`,
    prova: (xml, fil) => {
      const ok = (c) => /[\p{L}\p{N}\s]/u.test(c) || VANLIGA.has(c) || c in SARSKILDA
        || (c in FORBJUDNA_TECKEN && FORBJUDNA_TECKEN[c].utom.some((u) => fil.startsWith(u)));
      const avkoda = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
      return [...xml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].filter((m) => ![...avkoda(m[1])].every(ok)).map((m) => m.index);
    },
  },
  {
    namn: 'teckenavstånd',
    skal: 'Google ignorerar teckenavståndet och ritar texten tätare än Word, så att raderna bryts på andra ställen',
    prova: (xml) => [...xml.matchAll(/<w:rPr>(?:(?!<\/w:rPr>).)*?<w:spacing w:val="/gs)].map((m) => m.index),
  },
  {
    namn: 'ekvation ensam i ett stycke',
    skal: 'Google tar ekvationens storlek från texten bredvid, och en ensam ekvation blir liten; brakStycken() i metoddocx.ts',
    prova: (xml) => [...xml.matchAll(/<w:p>(?:<w:pPr>(?:(?!<\/w:pPr>).)*<\/w:pPr>)?<m:oMath>(?:(?!<\/m:oMath>).)*<\/m:oMath><\/w:p>/gs)].map((m) => m.index),
  },
  {
    namn: 'det som Google saknar',
    skal: 'flytande bild, ram, textruta, sidkant, dold text, avstavning, kontextuellt avstånd och procentbredd finns inte i Google Dokument',
    prova: (xml) => [...xml.matchAll(/<wp:anchor\b|<w:framePr\b|<w:txbxContent\b|<w:pgBorders\b|<w:vanish\/>|<w:autoHyphenation\b|<w:contextualSpacing\/>|w:type="pct"/g)].map((m) => m.index),
  },
  {
    namn: 'fält utom sidnummer och sidantal',
    skal: 'Google har bara PAGE och NUMPAGES',
    prova: (xml) => [...xml.matchAll(/<w:instrText[^>]*>([^<]*)<\/w:instrText>/g)].filter((m) => !/^\s*(PAGE|NUMPAGES)\b/.test(m[1])).map((m) => m.index),
  },
  {
    // K-157 (Niclas 2026-10-01: boksidans dubbla ram och den röda dubbla linjen under titeln blev enkla i Google). Mätt i
    // mätbänken (scripts/matbank/dubbellinje.mjs): Google ritar en dubbel kant som en enda linje på omkring 2 pt.
    namn: 'kantstil som Google saknar',
    skal: 'Google har bara heldragna, streckade och prickade kanter och ritar en dubbel kant som en enkel; bygg den dubbla linjen av två enkla (dubbelRam och boksidans titellinje i metoddocx.ts)',
    // En kant har tjocklek eller färg; numreringens <w:start w:val="1"/> har det inte.
    prova: (xml) => [...xml.matchAll(/<w:(?:top|bottom|left|right|start|end|insideH|insideV|between|bar|bdr)\b(?=[^>]*\bw:(?:sz|color)=)[^>]*\bw:val="(?!single"|dashed"|dotted"|none"|nil")[^"]*"/g)].map((m) => m.index),
  },
  {
    namn: 'tabbstopp som Google saknar',
    skal: 'Google har tabbstopp till vänster, i mitten och till höger, utan utfyllnad',
    prova: (xml) => [...xml.matchAll(/<w:tab w:val="(decimal|bar|num)"|<w:tab\b[^>]*w:leader="(?!none)/g)].map((m) => m.index),
  },
];

let fel = 0;
for (const fil of filer) {
  const zip = await JSZip.loadAsync(readFileSync(fil));
  // Texten, sidhuvud och sidfot, och formatmallarna, numreringen och inställningarna (där avstavningen står).
  const delar = Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*|styles|numbering|settings)\.xml$/.test(n));
  const brott = [];
  for (const del of delar) {
    const xml = await zip.file(del).async('string');
    for (const r of REGLER) {
      if (UNDANTAG.some((u) => u.regel === r.namn && (!u.fil || basename(fil).startsWith(u.fil)))) continue;
      const traffar = r.prova(xml, basename(fil));
      if (traffar.length) brott.push(`${r.namn} (${traffar.length}), t.ex. "${utdrag(xml, traffar[0])}". ${r.skal}`);
    }
  }
  if (brott.length) {
    fel++;
    console.error(`${basename(fil)}:\n  ${brott.join('\n  ')}`);
  }
}
if (fel) {
  console.error(`\nWord-reglerna: ${fel} av ${filer.length} Word-filer använder något som Google Dokument ritar annorlunda än Word. Rätta den gemensamma koden i src/lib/metoddocx.ts; reglerna och skälen står i METODER.md under Word och Google Dokument.`);
  process.exit(1);
}
console.log(`Word-reglerna: alla ${filer.length} Word-filer klarar reglerna för Word och Google Dokument (METODER.md).`);
