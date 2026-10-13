#!/usr/bin/env node
// Klarar Word-filerna reglerna för Word och Google Dokument? (K-138, Niclas 2026-09-30: "Du behöver lägga in något form
// av mekanik och script för att enkelt göra rimlig paritet mellan Word och drive".)
//
// Reglerna, skälen och regelprovet står i den gemensamma modulen wordparitet (src/regler.js och REGLER.md), som sajten
// och metodriggen delar och båda bygger ut (K-158). Här står sajtens undantag, med skäl, och vilka filer som prövas.
// Skriptet öppnar varje byggd Word-fil i dist/stodundervisning och stoppar valideringen när en regel bryts, med filen och
// ett utdrag. Det behöver varken Word, Google eller nätverk och tar någon sekund, så det går i npm run validera efter
// bygget. Ett fel rättas i den gemensamma koden (src/lib/metoddocx.ts), aldrig i en enskild metod; ett undantag läggs i
// UNDANTAG nedan med sitt skäl, aldrig tyst. En ny regel läggs i modulen.
//
//   node scripts/wordregler.mjs            alla Word-filer i dist/stodundervisning
//   node scripts/wordregler.mjs <fil.docx> …
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { REGLER, TYPSNITT, brottSomText, provaWordfil, utdrag } from 'wordparitet';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(rot, 'dist/stodundervisning');
const valda = process.argv.slice(2);
const filer = valda.length ? valda : readdirSync(DIST).filter((f) => f.endsWith('.docx')).map((f) => join(DIST, f));

// Problemlösning i grupp har "187 ✓" i exemplets tabell, ur metodriggen 2026-09: ett tecken i en tabellcell, där raden
// inte blir högre än cellens text. Metodens text ändras inte för en glyf; riggen skriver ord (FRAN-SAJTEN.md).
const BOCKEN = 'tecken som inte är prövade i Word och Google';
const UNDANTAG = [
  { regel: BOCKEN, fil: 'problemlosning-i-grupp', tecken: '✓', skal: 'bocken i exemplets tabell, i en cell där raden inte blir högre' },
  // Chambers boksamtal i grupp, omtaget 2026-10-12: frågan som fick svar har en bock på bokens tavla, i lathundens mall
  // och efter exemplet. Bocken är metodens egen sak (en fråga får en bock när boken svarar), och raden står i tavlans ruta.
  { regel: BOCKEN, fil: 'boksamtal-i-grupp', tecken: '✓', skal: 'bocken vid frågan som fick svar på bokens tavla, i tavlans ruta' },
  { regel: BOCKEN, fil: 'alla-metoder', tecken: '✓', skal: 'samlingsfilen har Problemlösning i grupp och Chambers boksamtal i grupp i sig' },
  // Faktatextens bildtexter börjar med en liten fyrkant i nivåns färg (faktatext i src/lib/metoddocx.ts, ur metodriggens
  // TILL-SAJTEN 2026-10-13, Det nya punkt 10). Fyrkanten står i Arial, som finns i Word och i Google Dokument, i 9 punkter
  // på en rad i Andika 11,5 punkter, så raden blir inte högre av den. Riggens Word-fil med 37 fyrkanter var lika i Word
  // och Google, 145 sidor i båda. Undantaget gäller formen, så det har ingen fil: nästa metod med faktatexter får det.
  // Tecknet förs in i modulens SARSKILDA när det är mätt i bänken, och då stryks raden här.
  { regel: BOCKEN, tecken: '■', skal: 'fyrkanten före bildtexten i en faktatext, i Arial, på en rad som Andika gör högre' },
];

// Två undantag som gäller en form och inte en fil, och som därför prövas här i stället för i modulen. Modulens undantag
// stänger av en hel regel för en fil; här släpps bara just det formen behöver, i alla filer, och allt annat ur regeln
// stoppar som förut. Modulens egen regel gör träffarna, så att sajten inte har en egen kopia av den.
//
// Bladets bild bakom texten (bildblad i src/lib/metoddocx.ts, Faktatextsamtal i grupp, metodriggens TILL-SAJTEN
// 2026-10-13, Det nya punkt 4; Niclas 2026-10-12: bladen "bredd till bredd på docx utan marginaler, liggande", och "Gärna
// så att det också fungerar i Google Drive"): en bild över hela den liggande sidan, förankrad i sidans hörn och bakom
// texten, med en tabell utan linjer över. Riggen mätte 2026-10-12 med modulens jämförelse att bilden och tabellen står
// lika i Word och i Google Dokument, där en textruta blir en teckning i ett eget fönster. Undantaget gäller bara en
// förankrad bild som ligger bakom texten med läget räknat från sidan. En flytande bild som texten flyter runt, en ram, en
// textruta, en sidkant, dold text, avstavning, kontextuellt avstånd och procentbredd stoppar.
const GOOGLE_SAKNAR = 'det som Google saknar';
const bladetsBild = (xml, i) => {
  const ankare = xml.slice(i, xml.indexOf('</wp:anchor>', i));
  return xml.startsWith('<wp:anchor', i) && /^<wp:anchor\b[^>]*\bbehindDoc="1"/.test(ankare) && /<wp:positionH relativeFrom="page">/.test(ankare) && /<wp:positionV relativeFrom="page">/.test(ankare) && /<wp:wrapNone\/>/.test(ankare);
};
// Anton, faktatexternas rubriker (public/fonts/faktatext/, metodriggens TILL-SAJTEN 2026-10-13, Det nya punkt 8): finns
// i Googles bibliotek och följer med i Word-filen som en delmängd med hhea-måtten också som win- och typo-mått, så att
// raden blir lika hög i Word och Google. Riggens fil med Anton var lika i båda, men typsnittet är inte mätt i modulens
// bänk än: när det är mätt förs det in i modulens TYPSNITT, och undantaget stryks här.
const TYPSNITT_REGEL = 'typsnitt som Google saknar';
const EGNA_TYPSNITT = new Set(['Anton']);
const baraEgnaTypsnitt = (xml, i) => [...xml.slice(i, xml.indexOf('>', i)).matchAll(/w:(?:ascii|hAnsi|cs|eastAsia)="([^"]+)"/g)].every((f) => TYPSNITT.has(f[1]) || EGNA_TYPSNITT.has(f[1]));
const FORMUNDANTAG = [
  { regel: GOOGLE_SAKNAR, slapps: bladetsBild, skal: 'bladets bild bakom texten, som Google Dokument ritar på samma plats som Word (riggen 2026-10-12)' },
  { regel: TYPSNITT_REGEL, slapps: baraEgnaTypsnitt, skal: 'Anton i faktatexternas rubriker, i väntan på mätningen i wordparitets bänk' },
];
for (const u of FORMUNDANTAG) if (!REGLER.some((r) => r.namn === u.regel)) { console.error(`wordregler: modulen wordparitet har ingen regel som heter "${u.regel}". Pröva formundantagen mot modulens nya version.`); process.exit(1); }

// Brotten mot reglerna med formundantag: modulens regel prövas på samma delar som modulen prövar, och de träffar som inte
// är formens egna blir brott, i modulens form.
async function formbrott(data) {
  const zip = await JSZip.loadAsync(data);
  const brott = [];
  for (const del of Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*|styles|numbering|settings)\.xml$/.test(n))) {
    const xml = await zip.file(del).async('string');
    for (const u of FORMUNDANTAG) {
      const regel = REGLER.find((r) => r.namn === u.regel);
      const traffar = regel.prova(xml).filter((i) => !u.slapps(xml, i));
      if (traffar.length) brott.push({ regel: regel.namn, skal: regel.skal, del, antal: traffar.length, utdrag: utdrag(xml, traffar[0]) });
    }
  }
  return brott;
}

let fel = 0;
for (const fil of filer) {
  const data = readFileSync(fil);
  const brott = [
    ...await provaWordfil(data, { filnamn: basename(fil), undantag: [...UNDANTAG, ...FORMUNDANTAG.map((u) => ({ regel: u.regel, skal: u.skal }))] }),
    ...await formbrott(data),
  ];
  if (brott.length) {
    fel++;
    console.error(`${basename(fil)}:\n  ${brottSomText(brott).join('\n  ')}`);
  }
}
if (fel) {
  console.error(`\nWord-reglerna: ${fel} av ${filer.length} Word-filer använder något som Google Dokument ritar annorlunda än Word. Rätta den gemensamma koden i src/lib/metoddocx.ts; reglerna och skälen står i wordparitet (REGLER.md).`);
  process.exit(1);
}
console.log(`Word-reglerna: alla ${filer.length} Word-filer klarar reglerna för Word och Google Dokument (wordparitet, REGLER.md).`);
