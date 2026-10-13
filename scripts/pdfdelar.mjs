#!/usr/bin/env node
// Utskriftsknapparnas pdf:er på enheternas och ramarnas sidor (K-342; Niclas 2026-10-13: "Vill inte ha glidning här. Så
// bättre med ett system för skriv ut knapparna", och "System med att den drar från sidorna eller Yaml kommer aldrig få
// exakt paritet med pdf. Så bättre med ett system som alltid blir 1:1"). Varje knapp öppnar en pdf, och pdf:en är sidor ur
// en Word-fil som Word har sparat som pdf: bankens filer och ramarnas filer (scripts/bankpdf.mjs). En text, ett problem,
// lärarens sida eller ett blad är några sidor i en sådan fil. Det här skriptet klipper ut dem efter bygget, så att repot
// bara bär de hela filerna och delarna aldrig kan bli äldre än dem.
//
// Bygget skriver listan dist/stodundervisning/utskrifter.json (src/pages/stodundervisning/utskrifter.json.ts ur
// src/lib/utskrift.ts): varje pdf som en knapp leder till, och vilka ramar och blad ur vilka filer den består av. Var
// ramarna och bladen står i varje fil, sida för sida, mäter scripts/bankpdf.mjs i Word när filen görs och skriver i
// manifestet public/stodundervisning/bank-pdf.json (karta). Saknas en fil, en karta, en ram eller ett blad stannar
// skriptet, och då stannar bygget.
//
//   node scripts/pdfdelar.mjs     klipper ut delarna i dist (körs i npm run validera efter bankpdf, och i npm run build)
//
// Delarna fanns inte när bygget satte filernas version i länkarna (scripts/filversion.mjs), så versionen sätts om sist.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { sattVersioner } from './filversion.mjs';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mapp = join(rot, 'dist', 'stodundervisning');
const lista = join(mapp, 'utskrifter.json');
if (!existsSync(lista)) { console.error('pdfdelar: dist/stodundervisning/utskrifter.json saknas. Bygg sajten först (npm run validera bygger).'); process.exit(1); }
const filer = JSON.parse(readFileSync(lista, 'utf8'));
const manifest = JSON.parse(readFileSync(join(rot, 'public', 'stodundervisning', 'bank-pdf.json'), 'utf8'));
const stopp = (text) => { console.error(`pdfdelar: ${text}`); process.exit(1); };

const kallor = new Map();
const kalla = async (namn) => {
  if (!kallor.has(namn)) {
    const fil = join(mapp, `${namn}.pdf`);
    if (!existsSync(fil)) stopp(`${namn}.pdf saknas i dist. Kör npm run validera, som gör pdf:erna ur Word.`);
    kallor.set(namn, await PDFDocument.load(readFileSync(fil)));
  }
  return kallor.get(namn);
};
// Samma datum i varje bygge, så att filen och dess version i länkarna inte ändras utan att innehållet gör det.
const DATUM = new Date('2026-01-01T00:00:00Z');
let sidor = 0;
for (const f of filer) {
  const ut = await PDFDocument.create();
  // Sidorna ur samma källfil i följd kopieras i ett anrop, så att filens typsnitt följer med en gång och inte en gång
  // per del (granskningen 2026-10-13: tre sidor blev 772 kB i stället för 475).
  const foljder = [];
  for (const del of f.delar) {
    let index;
    if (del.sida !== undefined) {
      // En viss sida ur en fil utan karta, som mallen på lathundens sida 3.
      const k = await kalla(del.pdf);
      if (del.sida < 1 || del.sida > k.getPageCount()) stopp(`${f.namn}.pdf ska ha sidan ${del.sida} ur ${del.pdf}.pdf, som har ${k.getPageCount()} sidor.`);
      index = [del.sida - 1];
    } else {
      const karta = manifest[del.pdf]?.karta;
      if (!karta) stopp(`${del.pdf}.pdf har ingen karta över sina sidor i bank-pdf.json. Kör npm run validera.`);
      const poster = karta.filter((k) => (del.bild !== undefined ? k.bild === del.bild : k.ram === del.ram && k.bild === undefined));
      if (!poster.length) stopp(`${f.namn}.pdf ska ha ${del.bild !== undefined ? `bladet ${del.bild}` : `ramen ${del.ram}`} ur ${del.pdf}.pdf, men kartan har den inte. Kör npm run validera.`);
      index = poster.flatMap((k) => Array.from({ length: k.till - k.fran + 1 }, (_, n) => k.fran - 1 + n));
    }
    const sist = foljder.at(-1);
    if (sist && sist.pdf === del.pdf) sist.index.push(...index); else foljder.push({ pdf: del.pdf, index });
  }
  for (const foljd of foljder) for (const sida of await ut.copyPages(await kalla(foljd.pdf), foljd.index)) ut.addPage(sida);
  ut.setTitle(f.titel);
  ut.setAuthor('Niclas Fohlin');
  ut.setProducer('niclasfohlin.se');
  ut.setCreator('niclasfohlin.se');
  ut.setCreationDate(DATUM);
  ut.setModificationDate(DATUM);
  sidor += ut.getPageCount();
  writeFileSync(join(mapp, `${f.namn}.pdf`), await ut.save());
}
sattVersioner(join(rot, 'dist'));
console.log(`Utskriftsknapparnas pdf:er: ${filer.length} filer med ${sidor} sidor, klippta ur ${kallor.size} av Word-filernas pdf:er.`);
