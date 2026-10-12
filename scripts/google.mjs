// Google Dokuments återgivning av en Word-fil, för scripts/googleprov.mjs, matbank.mjs och lathund-word.mjs. Koden står
// i den gemensamma modulen wordparitet (src/google.js, delad med metodriggen, K-158); här står sajtens inloggning och
// testmapp.
//
// Inloggningen lånas från Toishi-riggen (Niclas 2026-09-30): C:/toishi/drift/google.js, kontot toishi.sthlm@gmail.com,
// behörigheten Drive (egna filer), så att skripten ser och rör bara filer de själva har skapat. Nycklar skrivs aldrig
// ut. Utan testmapp är dokumentet tillfälligt och går till papperskorgen efter hämtningen. I testmappen "Prov före
// uppladdning · niclasfohlin.se" ligger det kvar under filens namn, och en ny version skriver över samma dokument med
// samma länk: 2026-09-30 lade provet den förra versionen i papperskorgen medan Niclas läste den, och bilderna blev
// varningstrianglar.
import { googlePdf as modulensPdf, testmappen as modulensMapp } from 'wordparitet';

export const INLOGGNING = 'C:/toishi/drift/google.js';
export const TESTMAPP = 'Prov före uppladdning · niclasfohlin.se';

/** Testmappens id; mappen skapas om den inte finns. */
export const testmappen = () => modulensMapp(TESTMAPP, { inloggning: INLOGGNING });
/** Google Dokuments pdf av Word-filen (en Buffer); med mappId ligger dokumentet kvar i testmappen. Svarar { pdf, lank }. */
// Ett tillfälligt fel hos Google (500, 502, 503 eller 429) prövas igen, tre gånger med längre väntan: ett enda 500 från
// Drive stoppade annars hela valideringen mitt i mätningen av lathundarna (K-239, senast 2026-10-12).
export async function googlePdf(docx, o = {}) {
  for (let forsok = 1; ; forsok++) {
    try { return await modulensPdf(docx, { ...o, inloggning: INLOGGNING }); } catch (e) {
      if (forsok >= 4 || !/svarade (429|500|502|503)\b/.test(String(e?.message))) throw e;
      console.log(`  Google svarade med ett tillfälligt fel, försök ${forsok + 1} av 4 om ${forsok * 10} sekunder …`);
      await new Promise((r) => setTimeout(r, forsok * 10000));
    }
  }
}
