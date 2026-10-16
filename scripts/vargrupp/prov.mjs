// Prov av sammanställningen (node scripts/vargrupp/prov.mjs, --behall låter svaren stå kvar) med datum över ett årsskifte, i oordning (Niclas 2026-10-16: "att de funkar för vilka
// datum som helst"). 2026-12-28 (måndag) och 2027-01-01 (fredag) är samma ISO-vecka, 53 år 2026, och ska bli ett
// tillfälle; 2027-01-05 är vecka 1 och 2027-01-19 vecka 3. Augusti kommer sist i fliken men först i tiden.
// Förväntat: Tillfälle 1 (v. 34) 2 svar, Tillfälle 2 (v. 53) 4 svar, Tillfälle 3 (v. 1) 3 svar, Tillfälle 4 (v. 3) 3 svar.
import { readFileSync } from 'node:fs';
import { anrop } from './google.mjs';

const f = JSON.parse(readFileSync(new URL('./vargrupp.json', import.meta.url), 'utf8'));
const S = `https://sheets.googleapis.com/v4/spreadsheets/${f.ark}`;
const R = encodeURIComponent("'Formulärsvar 1'!A2:I13");
const serie = (t) => { const [d, k] = t.split(' '); const [y, m, dag] = d.split('-').map(Number); const [h, mi] = k.split(':').map(Number); return (Date.UTC(y, m - 1, dag, h, mi) - Date.UTC(1899, 11, 30)) / 86400000; };
const rader = [
  ['2026-12-28 10:15', 3, 3, 4, 4, 4, 3, 'Före jullovet.'], ['2026-12-28 10:20', 4, 3, 3, 4, 5, 4, ''],
  ['2027-01-01 09:00', 3, 4, 3, 3, 4, 4, ''], ['2027-01-01 09:05', 4, 4, 4, 5, 4, 4, 'Nytt år.'],
  ['2027-01-05 13:00', 4, 4, 4, 4, 4, 4, ''], ['2027-01-05 13:02', 5, 4, 4, 5, 5, 4, ''], ['2027-01-07 08:30', 4, 5, 4, 4, 5, 5, ''],
  ['2027-01-19 10:00', 5, 5, 5, 5, 5, 4, 'Bästa veckan.'], ['2027-01-19 10:01', 4, 5, 4, 5, 5, 5, ''], ['2027-01-21 11:11', 5, 4, 5, 4, 5, 5, ''],
  ['2026-08-20 10:00', 2, 3, 2, 3, 3, 3, 'Första gången.'], ['2026-08-21 10:00', 3, 2, 3, 3, 4, 3, ''],
].map(([t, ...v], i) => [serie(t), `elev${(i % 4) + 1}@example.test`, ...v]);
const skriv = await anrop(`${S}/values/${R}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: rader }) });
if (skriv.status >= 300) throw new Error(JSON.stringify(skriv.j).slice(0, 300));
await new Promise((r) => setTimeout(r, 3000));
const las = async (omr) => (await anrop(`${S}/values/${encodeURIComponent(omr)}?valueRenderOption=FORMATTED_VALUE`)).j.values ?? [];
console.log('Senaste tillfället:');
for (const r of await las("'Sammanställning'!A5:G7")) console.log('  ', r.join(' | '));
console.log('Alla tillfällen:');
for (const r of await las("'Sammanställning'!A10:G15")) console.log('  ', r.join(' | '));
console.log('Senaste tillfället per påstående:');
for (const r of await las("'Per påstående'!Q5:R11")) console.log('  ', r.join(' | '));
console.log('Elevernas svar:');
for (const r of await las("'Elevernas svar'!A4:B9")) console.log('  ', r.join(' | '));
if (!process.argv.includes('--behall')) {
  await anrop(`${S}/values/${R}:clear`, { method: 'POST', body: '{}' });
  console.log('De påhittade svaren är borttagna.');
}
