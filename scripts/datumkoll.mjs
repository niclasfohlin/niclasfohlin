#!/usr/bin/env node
// Metodens datum följer metoden (Niclas 2026-10-03: "datum för metoden alltid ska uppdateras när ändringar görs i korta
// rutan. Det har du inte gjort förut." och "När metoden ändras ska datumet ändras."). Faktarutan I korthet visar
// Uppdaterad, och läsaren ska kunna lita på att datumet säger när metoden senast ändrades. Materialet i alla metoder
// 2026-10-02 och rutorna överst 2026-10-03 ändrades utan nytt datum, och därför sätter skriptet datumet själv.
//
// Varje metod jämförs med samma fil på origin/main, det som ligger ute. Skiljer sig något i metoden, och är uppdaterad
// samma som där, sätts dagens datum (svensk tid) på raden uppdaterad. Det som inte är metodens innehåll räknas inte:
// datumet självt, relaterade (länkarna till andra metoder, som ändras när en ny metod kommer), utkast och tecken som bara
// styr radbrytningen (hårt mellanslag och ordfog). En ny metod har sitt eget datum och lämnas som den är. En ändring i
// den gemensamma koden (formen) ändrar inte metodens fil och inte datumet.
//
// npm run validera kör skriptet före lathundarna, så att datumet står rätt också i Word, PowerPoint och pdf.
//   node scripts/datumkoll.mjs                 sätter datumet där det behövs
//   node scripts/datumkoll.mjs --kontrollera   ändrar inget; slutkod 1 om ett datum saknas
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAPP = 'src/content/stodundervisning';
// Fält som inte är metodens innehåll (samma som sajtens fält i scripts/metoddiff.mjs).
const INTE_INNEHALL = new Set(['uppdaterad', 'relaterade', 'utkast']);
const kontrollera = process.argv.includes('--kontrollera');

// Dagens datum i svensk tid, som YYYY-MM-DD.
const idag = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const utan = (x) => JSON.stringify(x ?? null).replace(/ /g, ' ').replace(/⁠/g, '');
const datum = (x) => (x instanceof Date ? x.toISOString().slice(0, 10) : x ? String(x).slice(0, 10) : '');
const git = (args) => execFileSync('git', args, { cwd: rot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

let ute;
try { ute = new Set(git(['ls-tree', '--name-only', 'origin/main', `${MAPP}/`]).split('\n').filter(Boolean)); }
catch { console.log('Datumen: origin/main finns inte här, så inget jämförs.'); process.exit(0); }

const satta = [];
const saknas = [];
for (const fil of readdirSync(join(rot, MAPP)).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))) {
  const vag = `${MAPP}/${fil}`;
  if (!ute.has(vag)) continue;
  const text = readFileSync(join(rot, vag), 'utf8');
  const nu = parseYaml(text);
  const fore = parseYaml(git(['show', `origin/main:${vag}`]));
  const falt = [...new Set([...Object.keys(nu), ...Object.keys(fore)])].filter((k) => !INTE_INNEHALL.has(k));
  const andrade = falt.filter((k) => utan(nu[k]) !== utan(fore[k]));
  if (!andrade.length || datum(nu.uppdaterad) !== datum(fore.uppdaterad)) continue;
  if (kontrollera) { saknas.push(`${fil} (${andrade.join(', ')})`); continue; }
  // Radslutet står kvar, också CRLF i arbetskopian.
  const rad = /^uppdaterad:[ \t]*("?)\d{4}-\d{2}-\d{2}\1[ \t]*(\r?)$/m;
  if (!rad.test(text)) { saknas.push(`${fil}: raden uppdaterad saknas`); continue; }
  writeFileSync(join(rot, vag), text.replace(rad, (_, q, cr) => `uppdaterad: ${q}${idag}${q}${cr}`));
  satta.push(`${fil.replace(/\.yaml$/, '')} (${andrade.join(', ')})`);
}

if (saknas.length) {
  console.error(`Datumen: ${saknas.length} metod(er) är ändrade men har samma datum som det som ligger ute:\n  ${saknas.join('\n  ')}\nKör node scripts/datumkoll.mjs, som sätter dagens datum.`);
  process.exit(1);
}
console.log(satta.length
  ? `Datumen: ${idag} i ${satta.length} ändrade metod(er): ${satta.join('; ')}. Committa metodfilerna med ändringen.`
  : 'Datumen stämmer: varje ändrad metod har ett nytt datum.');
