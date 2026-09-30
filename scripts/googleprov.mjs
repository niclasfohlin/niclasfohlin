#!/usr/bin/env node
// Hur ser en Word-fil ut i Google Dokument? (Niclas 2026-09-30: bråken och radavstånden blev fel i Google Dokument fast
// de var rätt i Word, och jag kunde inte se Google Dokument, bara gissa.)
//
// Skriptet laddar upp Word-filen till Google Drive, låter Google Dokument göra om den till ett eget dokument, hämtar det
// som pdf och lägger dokumentet i papperskorgen. Pdf:en är Google Dokuments egen återgivning, samma som läraren ser när
// hen sparar filen med Drive-knappen och öppnar den. Inloggningen lånas från Toishi-riggen (Niclas 2026-09-30: "En
// annan rigg har till och med API till Google med oauth du får låna. Toishi"): C:/toishi/drift/google.js, med
// behörigheten Drive (egna filer), så skriptet ser och rör bara filer det själv har skapat. Nycklar skrivs aldrig ut.
//
//   node scripts/googleprov.mjs <fil.docx> [<ut.pdf>] [--sidor 1,21]   pdf:en och sidorna som bilder (pdftoppm)
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const args = process.argv.slice(2);
const sidArg = args.indexOf('--sidor');
const sidor = sidArg >= 0 ? args[sidArg + 1].split(',').map(Number) : [];
const [fil, utArg] = args.filter((a, i) => !a.startsWith('--') && (sidArg < 0 || i !== sidArg + 1));
if (!fil || !existsSync(fil)) { console.error('googleprov: ange en Word-fil.'); process.exit(1); }
const ut = utArg ?? fil.replace(/\.docx$/i, '-google.pdf');
const TOISHI = 'C:/toishi/drift/google.js';
if (!existsSync(TOISHI)) { console.error(`googleprov: Toishi-riggens Google-inloggning saknas (${TOISHI}).`); process.exit(1); }
const google = createRequire(import.meta.url)(TOISHI);
const nyckel = await google.token();
const auth = { Authorization: `Bearer ${nyckel}` };

const grans = `googleprov-${Date.now().toString(36)}`;
const meta = { name: `googleprov ${basename(fil)} (tas bort)`, mimeType: 'application/vnd.google-apps.document' };
const kropp = Buffer.concat([
  Buffer.from(`--${grans}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${grans}\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`),
  readFileSync(fil),
  Buffer.from(`\r\n--${grans}--`),
]);
const upp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { ...auth, 'Content-Type': `multipart/related; boundary=${grans}` }, body: kropp });
if (!upp.ok) { console.error(`googleprov: uppladdningen svarade ${upp.status}: ${(await upp.text()).slice(0, 300)}`); process.exit(1); }
const { id } = await upp.json();
try {
  const pdf = await fetch(`https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=application/pdf`, { headers: auth });
  if (!pdf.ok) { console.error(`googleprov: exporten svarade ${pdf.status}: ${(await pdf.text()).slice(0, 300)}`); process.exit(1); }
  writeFileSync(ut, Buffer.from(await pdf.arrayBuffer()));
} finally {
  // Papperskorgen, inte radering: dokumentet går att hämta tillbaka i 30 dagar.
  await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, { method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
}
const antal = (readFileSync(ut, 'latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
console.log(`${ut}: ${antal} sidor i Google Dokument`);
for (const s of sidor) {
  const bas = join(dirname(ut), `${basename(ut, '.pdf')}-s${s}`);
  execFileSync('pdftoppm', ['-r', '60', '-f', String(s), '-l', String(s), '-png', '-singlefile', ut, bas]);
  console.log(`  sidan ${s}: ${bas}.png`);
}
