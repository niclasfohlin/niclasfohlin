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
export const googlePdf = (docx, o = {}) => modulensPdf(docx, { ...o, inloggning: INLOGGNING });
