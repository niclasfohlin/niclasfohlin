// Google Dokuments återgivning av en Word-fil, för scripts/googleprov.mjs och scripts/lathund-word.mjs.
//
// Word-filen laddas upp till Google Drive, Google Dokument gör om den till ett eget dokument, och dokumentet hämtas som
// pdf. Inloggningen lånas från Toishi-riggen (Niclas 2026-09-30): C:/toishi/drift/google.js, kontot
// toishi.sthlm@gmail.com, behörigheten Drive (egna filer), så att skripten ser och rör bara filer de själva har skapat.
// Nycklar skrivs aldrig ut. Utan testmapp är dokumentet tillfälligt och går till papperskorgen efter hämtningen. I
// testmappen "Prov före uppladdning · niclasfohlin.se" ligger det kvar under filens namn, och en ny version skriver
// över samma dokument med samma länk: 2026-09-30 lade provet den förra versionen i papperskorgen medan Niclas läste
// den, och bilderna blev varningstrianglar.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';

const TOISHI = 'C:/toishi/drift/google.js';
const API = 'https://www.googleapis.com/drive/v3/files';
const UPP = 'https://www.googleapis.com/upload/drive/v3/files';
const DOKUMENT = 'application/vnd.google-apps.document';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const TESTMAPP = 'Prov före uppladdning · niclasfohlin.se';

let auth;
async function inloggning() {
  if (!auth) {
    if (!existsSync(TOISHI)) throw new Error(`Toishi-riggens Google-inloggning saknas (${TOISHI}); se DRIFT.md under Google Drive-knappen.`);
    auth = { Authorization: `Bearer ${await createRequire(import.meta.url)(TOISHI).token()}` };
  }
  return auth;
}
// Nyckeln gäller omkring en timme; svarar Google 401 hämtas en ny en gång (en lång körning med Word kan ta längre tid).
async function anrop(url, init = {}, igen = true) {
  const svar = await fetch(url, { ...init, headers: { ...(await inloggning()), ...(init.headers ?? {}) } });
  if (svar.status === 401 && igen) { auth = undefined; return anrop(url, init, false); }
  if (!svar.ok) throw new Error(`${init.method ?? 'GET'} ${url.split('?')[0]} svarade ${svar.status}: ${(await svar.text()).replace(/\s+/g, ' ').slice(0, 300)}`);
  return svar;
}
const sok = async (q) => (await (await anrop(`${API}?q=${encodeURIComponent(`${q} and trashed=false`)}&fields=files(id,name)`)).json()).files;
const papperskorgen = (id) => anrop(`${API}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });

/** Testmappens id; mappen skapas om den inte finns. */
export async function testmappen() {
  const finns = (await sok(`name='${TESTMAPP}' and mimeType='application/vnd.google-apps.folder'`))[0]?.id;
  if (finns) return finns;
  return (await (await anrop(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: TESTMAPP, mimeType: 'application/vnd.google-apps.folder' }) })).json()).id;
}

/**
 * Gör om Word-filen (en Buffer) till ett Google-dokument och hämtar det som pdf. Med mappId ligger dokumentet kvar i
 * mappen under namnet, och en ny version skriver över samma dokument; en uppdatering har ingen metadata (föräldern får
 * inte anges där), bara den nya Word-filen. Utan mappId går dokumentet till papperskorgen, där det går att hämta
 * tillbaka i 30 dagar. Svarar { pdf, lank }.
 */
export async function googlePdf(docx, { namn = 'fil', mappId } = {}) {
  const forra = mappId ? (await sok(`name='${namn.replace(/'/g, "\\'")}' and '${mappId}' in parents`))[0] : undefined;
  const meta = forra ? {} : { name: mappId ? namn : `googleprov ${namn} (tas bort)`, mimeType: DOKUMENT, ...(mappId ? { parents: [mappId] } : {}) };
  const grans = `googleprov-${Date.now().toString(36)}`;
  const kropp = Buffer.concat([
    Buffer.from(`--${grans}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${grans}\r\nContent-Type: ${DOCX}\r\n\r\n`),
    docx,
    Buffer.from(`\r\n--${grans}--`),
  ]);
  const { id, webViewLink } = await (await anrop(
    `${UPP}${forra ? `/${forra.id}` : ''}?uploadType=multipart&fields=id,webViewLink`,
    { method: forra ? 'PATCH' : 'POST', headers: { 'Content-Type': `multipart/related; boundary=${grans}` }, body: kropp },
  )).json();
  try {
    return { pdf: Buffer.from(await (await anrop(`${API}/${id}/export?mimeType=application/pdf`)).arrayBuffer()), lank: webViewLink };
  } finally {
    if (!mappId) await papperskorgen(id);
  }
}
