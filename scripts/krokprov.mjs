#!/usr/bin/env node
// Ingen fil utan krok (Niclas 2026-10-07: "alla filer .md .yaml .js och annat hänvisas till så inget ligger utan att ha
// en krok från ex arbetssätt eller Claude.md"). Provet börjar i CLAUDE.md och följer varje hänvisning: en fil som nämns
// i en fil med krok har själv krok, och det som den i sin tur nämner eller importerar får det också. Det som blir över
// är filer som ingen instruktion, inget skript och ingen kod leder till, och provet stannar på dem. Körs i npm run validera.
//
//   node scripts/krokprov.mjs            pröva, slutkod 1 när en fil saknar krok
//   node scripts/krokprov.mjs --visa     skriv också ut var varje fil har sin krok (fil <- den som nämner den)
//   node scripts/krokprov.mjs --visa <del av namn>   bara de filer vars namn innehåller texten
//
// Vad som räknas som krok:
//   - filens sökväg eller filnamn står i en fil som har krok (ett filnamn som flera filer delar måste stå med sin mapp)
//   - filen importeras av kod som har krok
//   - filen ligger i en innehållsmapp (INNEHALL nedan) och mappen står i en fil som har krok: poster, bilder, filmer och
//     kort nämns inte en och en
//
// Så lagas ett fynd: är filen i bruk, skriv den i sitt hem, en gång (ett skript i tabellen i DRIFT.md under Riggen, en
// del av metodbygget i METODER.md, en handbok i tabellen i CLAUDE.md). Är den inte i bruk: lägg en post i kön om att
// ta bort den, och skriv den i VANTAR nedan med postens id tills det är gjort.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROT = 'CLAUDE.md';

// Innehållsmappar: filerna i dem har krok genom mappen. Mallarna (_mall.*) prövas ändå en och en.
const INNEHALL = [
  'src/content/artiklar/', 'src/content/bocker/', 'src/content/stodundervisning/',
  'public/stodundervisning/', 'public/bildbank/', 'public/delning/', 'public/images/', 'public/fonts/',
  'underlag/texter/', 'utskick/', 'src/data/bildserier/',
];
// Sidorna är sajtens adresser: Astro läser varje fil i mappen som en sida, så mappen är kroken.
const SIDOR = 'src/pages/';
// Filer som väntar på ett beslut i kön och därför får sakna krok så länge, med postens id.
const VANTAR = {};

const TEXT = /\.(md|mjs|js|ts|astro|json|toml|ya?ml|ps1|py|css|html|txt|sql)$/i;
const filer = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: rot, encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\0').filter(Boolean).filter((f) => existsSync(join(rot, f)));
const iInnehall = (f) => INNEHALL.find((m) => f.startsWith(m) && !posix.basename(f).startsWith('_mall.'));
const kandidater = filer.filter((f) => f !== ROT);
// Ett lokalt paket (en mapp med egen package.json eller manifest.yml, som byggpluginen) nämns som mapp: då har filerna i
// mappen krok.
const paket = [...new Set(filer.filter((f) => f.includes('/') && /\/(package\.json|manifest\.yml)$/.test(f)).map((f) => posix.dirname(f)))];

// Filnamn som bara en fil bär får stå utan mapp. Delas namnet (index.astro, _mall.md) räcker mappen närmast och namnet.
const antalMedNamn = new Map();
for (const f of filer) antalMedNamn.set(posix.basename(f), (antalMedNamn.get(posix.basename(f)) ?? 0) + 1);
const nyckelFor = (f) => {
  const namn = posix.basename(f);
  if (antalMedNamn.get(namn) === 1 && namn.length >= 5) return namn;
  const delar = f.split('/');
  return delar.slice(-2).join('/');
};
const mallNamn = (f) => posix.basename(f).startsWith('_mall.');
const rattSidaOm = (text, i, langd) => {
  const fore = i === 0 ? ' ' : text[i - 1];
  const efter = text[i + langd] ?? ' ';
  return !/[A-Za-z0-9åäöÅÄÖ_-]/.test(fore) && !/[A-Za-z0-9åäöÅÄÖ_]/.test(efter);
};
const namns = (text, nyckel) => {
  for (let i = text.indexOf(nyckel); i !== -1; i = text.indexOf(nyckel, i + 1)) if (rattSidaOm(text, i, nyckel.length)) return true;
  return false;
};

const las = (f) => { try { return statSync(join(rot, f)).size < 1500000 ? readFileSync(join(rot, f), 'utf8') : ''; } catch { return ''; } };
const importer = (f, text) => {
  const ut = [];
  for (const m of text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+|require\(\s*)['"]([^'"\n]+)['"]/g)) {
    const s = m[1];
    if (!s.startsWith('.')) continue;
    const bas = posix.normalize(posix.join(posix.dirname(f), s));
    for (const slut of ['', '.ts', '.mjs', '.js', '.astro', '.json', '/index.ts', '/index.js']) if (filer.includes(bas + slut)) { ut.push(bas + slut); break; }
  }
  return ut;
};

// Bredden först från CLAUDE.md.
const krok = new Map([[ROT, 'roten']]);
const ko = [ROT];
const mappar = new Set();
while (ko.length) {
  const f = ko.shift();
  if (!TEXT.test(f) || iInnehall(f)) continue;
  const text = las(f);
  if (!text) continue;
  const lagg = (g, hur) => { if (!krok.has(g)) { krok.set(g, `${f}${hur}`); ko.push(g); } };
  for (const g of importer(f, text)) lagg(g, ' (import)');
  for (const g of kandidater) {
    if (krok.has(g)) continue;
    if (iInnehall(g) || g.startsWith(SIDOR)) continue;
    if (namns(text, g) || namns(text, nyckelFor(g)) || (mallNamn(g) && namns(text, posix.basename(g)) && namns(text, `${g.split('/').slice(0, -1).join('/')}/`))) lagg(g, '');
  }
  for (const p of paket) {
    if (mappar.has(p) || !namns(text, p)) continue;
    mappar.add(p);
    for (const g of kandidater) if (g.startsWith(`${p}/`)) lagg(g, ` (paketet ${p})`);
  }
  for (const m of [...INNEHALL, SIDOR]) {
    if (mappar.has(m) || !(text.includes(m) || text.includes(m.slice(0, -1)))) continue;
    mappar.add(m);
    for (const g of kandidater) if ((m === SIDOR ? g.startsWith(SIDOR) : iInnehall(g) === m)) lagg(g, ` (mappen ${m})`);
  }
}

const args = process.argv.slice(2);
if (args.includes('--visa')) {
  const sok = args.find((a) => !a.startsWith('--'));
  for (const [f, fran] of [...krok].sort()) if ((!sok || f.includes(sok)) && !iInnehall(f)) console.log(`  ${f}  <-  ${fran}`);
}
const utan = kandidater.filter((f) => !krok.has(f) && !VANTAR[f]);
const overflodiga = Object.keys(VANTAR).filter((f) => krok.has(f) || !filer.includes(f));
if (overflodiga.length) { console.error(`Krokarna: ${overflodiga.join(', ')} står i VANTAR i scripts/krokprov.mjs men har krok eller finns inte längre. Stryk raden.`); process.exit(1); }
if (utan.length) {
  console.error(`Krokarna: ${utan.length} filer har ingen krok. Ingen instruktion, inget skript och ingen kod som nås från CLAUDE.md leder till dem (scripts/krokprov.mjs säger hur det lagas).`);
  for (const f of utan) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`Krokarna: alla ${kandidater.length} filer nås från CLAUDE.md, ${kandidater.filter((f) => iInnehall(f)).length} av dem genom sin innehållsmapp${Object.keys(VANTAR).length ? `, och ${Object.keys(VANTAR).length} väntar på beslut i kön` : ''}.`);
