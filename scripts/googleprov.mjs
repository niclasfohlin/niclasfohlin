#!/usr/bin/env node
// Ritar Google Dokument en Word-fil som Word gör? (Niclas 2026-09-30: bråken och radavstånden blev fel i Google Dokument
// fast de var rätt i Word, och "Du behöver lägga in något form av mekanik och script för att enkelt göra rimlig
// paritet mellan Word och drive", K-138.)
//
// Jämförelsen står i den gemensamma modulen wordparitet (jamforWordGoogle i src/jamfor.js, delad med metodriggen,
// K-158), med det som stoppar (blocken, tomma sidor, texten och ordbrytningen) och det som visas som obs. Här står
// sajtens del: vilka filer som prövas, jämförelsen med filerna som ligger ute, sidhuvudets och sidfotens rader som inte
// räknas som sidans text, mapparna och testmappen. Niclas: "Granska dem ska du göra. Automatiskt".
//
// Först luftprovet (luftprov i wordparitet, K-456; Niclas 2026-10-19: "Borde inte du kunna bygga nu en enkel testmodul för
// Google testet som är mycket snabbare?"): ryms varje block mellan sidankarna, med den drift som förra jämförelsen av
// samma fil mätte, går filen igenom utan Google. Bara de andra laddas upp, fyra åt gången. Words pdf tas ur valideringen
// (public/stodundervisning/<namn>.pdf, när summan i bank-pdf.json stämmer med Word-filen), så att Word bara körs för filer
// som valideringen inte gör pdf av. Reglerna prövas i valideringen (scripts/wordregler.mjs). Hur luftprovet räknar står i
// wordparitets REGLER.md under Luftprovet.
//
//   node scripts/googleprov.mjs <fil.docx | metodens id> … [--mapp] [--sidor 1,21]
//   node scripts/googleprov.mjs --andrade [--mapp]   Word-filerna i dist som skiljer sig från dem som ligger ute
//   node scripts/googleprov.mjs --alla [--mapp]      alla Word-filer i dist
//   … --google                                       hela jämförelsen med Google för varje fil, utan luftprovet: vid en
//                                                    ny form, vid större ändringar och som stickprov
//   … --samtidigt 4                                  så många filer åt gången hos Google
//   … --igen                                         jämför de senast hämtade pdf:erna igen, utan uppladdning
//
// --mapp lägger Google-versionerna i testmappen "Prov före uppladdning · niclasfohlin.se" (Niclas: "Skapa en testmapp
// där man testar enkelt innan uppladdning"), där en ny version skriver över samma dokument med samma länk. Ett id tar
// dist/stodundervisning/<id>.docx (kör npm run validera först). Pdf:erna och översiktsarken hamnar i
// underlag/prov/google/. Stannar med kod 1 om en kontroll inte går igenom. Kräver Word, pdftotext, pdftoppm och
// Toishi-riggens Google-inloggning (DRIFT.md under Google Drive-knappen).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jamforFlera, luftprov } from 'wordparitet';
import { wordinnehall, wordPdfensSumma } from './wordinnehall.mjs';
import { INLOGGNING, testmappen } from './google.mjs';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const sidArg = args.indexOf('--sidor');
const sidor = sidArg >= 0 ? args[sidArg + 1].split(',').map(Number) : [];
const mapp = args.includes('--mapp');
const DIST = join(rot, 'dist/stodundervisning');
const UT = join(rot, 'underlag/prov/google');
// Sidnumret står som "Sida 12 av 31" och på boksidorna som "s. 42" sist i sidfoten (K-148), och sidhuvudet och sidfoten
// har upphovet och adressen: det står på varje sida och räknas inte som sidans text.
const SIDNUMMER = /Sida \d+ av \d+|(?<= s\.) \d+(?=\s*$)/gm;
const RAM = /Sida \d+ av \d+|(?<= s\.) \d+(?=\s*$)|© Niclas Fohlin[^\n]*|[^\n]*· niclasfohlin\.se\s*$/gm;

let filer = args.filter((a, i) => !a.startsWith('--') && (sidArg < 0 || i !== sidArg + 1))
  .map((a) => (a.toLowerCase().endsWith('.docx') ? a : join(DIST, `${a}.docx`)));
if (args.includes('--alla') || args.includes('--andrade')) {
  // Samlingsfilen med alla metoder är för stor för Google Drives export (exportSizeLimitExceeded); den är varje metods
  // egen fil i följd, och de granskas var för sig.
  filer = readdirSync(DIST).filter((f) => f.endsWith('.docx') && f !== 'alla-metoder.docx').map((f) => join(DIST, f));
  if (args.includes('--andrade')) {
    const andrade = new Set();
    // Filerna ute hämtas bara när de har ändrats sedan förra körningen: Netlify svarar 304 utan innehåll på en fråga med
    // filens etikett (If-None-Match), och innehållets summa från förra hämtningen står i ute.json. Förut hämtades varje fil
    // varje gång, 144 MB och omkring 3 krediter per körning för 853 filer (Niclas 2026-10-28: "Vad äter krediter nu på sajten förutom
    // uppladdningar?"; skripten stod för 396 av dygnets 1 038 MB).
    const UTE = join(UT, 'ute.json');
    let kanda = {};
    try { kanda = JSON.parse(readFileSync(UTE, 'utf8')); } catch { /* första körningen */ }
    const summa = async (buf) => createHash('sha1').update(String(await wordinnehall(buf, '', { allt: true }))).digest('hex');
    let hamtade = 0;
    // Åtta åt gången: en fil i taget tog flera minuter för omkring 240 filer.
    let nasta = 0;
    const lista = filer;
    await Promise.all(Array.from({ length: 8 }, async () => {
      while (nasta < lista.length) {
        const f = lista[nasta++];
        const namn = basename(f);
        const kand = kanda[namn];
        // Okomprimerat: med gzip eller br svarade Netlify 200 på de flesta filerna fast etiketten stämde, och utan svarar det
        // 304 varje gång. Word-filen är redan komprimerad inuti, så det kostar nästan inget när filen har ändrats.
        const ute = await fetch(`https://niclasfohlin.se/stodundervisning/${namn}`, { headers: { 'Accept-Encoding': 'identity', ...(kand?.etag ? { 'If-None-Match': kand.etag } : {}) } });
        // Innehållet jämförs utan det som skiftar mellan datorn och Netlify (scripts/wordinnehall.mjs, K-178): bildernas
        // löpnummer, svg-filernas radslut och reservbilderna. En fil som inte finns ute är ny och prövas.
        // Här räknas också formatmallarna, numreringen och fristående png-bilder (allt), som kan ändra sidorna.
        let uteSumma;
        if (ute.status === 304 && kand) uteSumma = kand.summa;
        else if (ute.ok) {
          uteSumma = await summa(Buffer.from(await ute.arrayBuffer()));
          hamtade++;
          const etag = ute.headers.get('etag');
          if (etag) kanda[namn] = { etag, summa: uteSumma };
        }
        if (uteSumma === undefined || uteSumma !== (await summa(readFileSync(f)))) andrade.add(f);
      }
    }));
    mkdirSync(UT, { recursive: true });
    writeFileSync(UTE, `${JSON.stringify(kanda, null, 1)}\n`);
    console.log(`${hamtade} av ${lista.length} filer hämtades från sajten; de andra var oförändrade sedan förra körningen.`);
    filer = lista.filter((f) => andrade.has(f));
    console.log(`${filer.length} Word-filer skiljer sig från dem som ligger ute.`);
  }
}
if (!filer.length) { console.log('googleprov: inga Word-filer att pröva.'); process.exit(0); }
for (const f of filer) if (!existsSync(f)) { console.error(`googleprov: ${f} finns inte.`); process.exit(1); }

// Words pdf ur valideringen, när den är gjord av just den här Word-filen (summan i bank-pdf.json).
const PDF = join(rot, 'public/stodundervisning');
const register = existsSync(join(PDF, 'bank-pdf.json')) ? JSON.parse(readFileSync(join(PDF, 'bank-pdf.json'), 'utf8')) : {};
const wordPdf = new Map();
for (const f of filer) {
  const namn = basename(f, '.docx');
  if (register[namn] && existsSync(join(PDF, `${namn}.pdf`)) && register[namn].word === await wordPdfensSumma(readFileSync(f), rot)) wordPdf.set(f, join(PDF, `${namn}.pdf`));
}
const start = Date.now();
const sek = () => Math.round((Date.now() - start) / 1000);
// Luftprovet: filerna där varje block ryms med uppmätt drift går igenom utan Google.
let tillGoogle = filer;
let rymdes = 0;
if (!args.includes('--google') && !args.includes('--igen')) {
  // Fyra åt gången: provet ritar sidorna med pdftoppm, som arbetar på datorn.
  const behover = new Set();
  let nasta = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (nasta < filer.length) {
      const fil = filer[nasta++];
      try {
        const r = await luftprov(fil, { ut: UT, wordPdf: wordPdf.get(fil), sidnummer: SIDNUMMER });
        if (r.lage === 'ryms') { rymdes++; console.log(`ryms ${r.namn}: luftprovet, ${r.block} block på ${r.sidor} sidor ryms med uppmätt drift`); continue; }
        // Utan sidankare har luftprovet inte mätt något (wordparitet 0.3.4), och filen jämförs med Google.
        const t = r.tranga[0];
        if (r.inga) console.log(`  …  ${r.namn}: till Google, luftprovet hittade inget sidankare och mätte inget`);
        else console.log(`  …  ${r.namn}: till Google, ${r.tranga.length} trånga block, först Words sida ${t.fran + t.k} med ${t.luft} pt luft mot ${t.drift} pt ${t.kalla === 'standard' ? 'standarddrift' : 'uppmätt drift'}`);
      } catch (e) {
        console.log(`  …  ${basename(fil, '.docx')}: till Google, luftprovet gick inte (${String(e.message).replace(/\s+/g, ' ').slice(0, 120)})`);
      }
      behover.add(fil);
    }
  }));
  tillGoogle = filer.filter((f) => behover.has(f));
  console.log(`Luftprovet: ${rymdes} av ${filer.length} Word-filer ryms utan Google (${sek()} s). ${tillGoogle.length} jämförs med Google.`);
}
const mappId = mapp && tillGoogle.length ? await testmappen() : undefined;
let fel = 0;
await jamforFlera(tillGoogle, {
  ut: UT, mappId, inloggning: INLOGGNING, igen: args.includes('--igen'), ram: RAM, sidnummer: SIDNUMMER, sidor, visaAnkare: args.includes('--visa-ankare'),
  samtidigt: Number(args[args.indexOf('--samtidigt') + 1]) || 4,
  wordPdf: (fil) => wordPdf.get(fil),
  vid: (r) => {
    if (r.lage === 'NEJ') fel++;
    for (const rad of r.ankarlista ?? []) console.log(`     ${rad}`);
    console.log(`${r.lage.padEnd(4)} ${r.namn}: ${r.beskrivning}${r.lage !== 'NEJ' ? ` (${r.provade} av ${r.ankare} sidankare prövade; de börjar sin sida och ryms lika i båda)` : ''}`);
    if (r.ark) console.log(`     översikt (Word över Google): ${r.ark}${r.lank && mapp ? `\n     i testmappen: ${r.lank}` : ''}`);
    for (const b of r.bilder ?? []) console.log(`     sidan ${b.sida} i ${b.vem === 'word' ? 'Word' : 'Google'}: ${b.fil}`);
  },
});
if (fel) { console.error(`\ngoogleprov: ${fel} av ${tillGoogle.length} Word-filer som jämfördes skiljer sig mellan Word och Google Dokument så att det stoppar (${sek()} s). Läs översiktsarken.`); process.exit(1); }
console.log(`\nAlla ${filer.length} Word-filer: ${rymdes ? `${rymdes} ryms enligt luftprovet och ` : ''}${tillGoogle.length} jämförda med Google, där varje block börjar sin sida och ryms lika i Word och Google Dokument, ingen tom sida och ingen text som saknas (${sek()} s, ${wordPdf.size} med Words pdf ur valideringen). Läs översiktsarken, särskilt filerna med obs.`);
