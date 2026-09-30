#!/usr/bin/env node
// Ändrar en ändring i Word-byggaret hur Word-filerna ser ut i Word? (Niclas 2026-09-30: "Du borde kunna använda
// Word-motorn på datorn för att mäta med", och "Gör bra och gör säkert".)
//
//   node scripts/wordjmf.mjs --facit    Word gör pdf av varje Word-fil i dist till underlag/prov/wordjmf/facit/
//   node scripts/wordjmf.mjs            samma för dist nu, och jämförelse sida för sida mot facit
//
// Jämförelsen läser texten på varje sida med pdftotext: samma antal sidor och samma text på varje sida betyder att
// varje sidbrytning står kvar. Skillnaderna skrivs ut per fil. Kräver Word (scripts/word-pdf.ps1) och pdftotext.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(rot, 'dist/stodundervisning');
const facit = process.argv.includes('--facit');
const ut = join(rot, 'underlag/prov/wordjmf', facit ? 'facit' : 'nu');
mkdirSync(ut, { recursive: true });
const valda = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const filer = readdirSync(DIST).filter((f) => f.endsWith('.docx') && f !== 'alla-metoder.docx' && (!valda.length || valda.some((v) => f.startsWith(v))));
const sidor = (pdf) => execFileSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\f').slice(0, -1)
  .map((s) => s.replace(/Sida \d+ av \d+/g, '').replace(/\s+/g, ''));
let skiljer = 0;
for (const f of filer) {
  const pdf = join(ut, f.replace(/\.docx$/, '.pdf'));
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(rot, 'scripts/word-pdf.ps1'), join(DIST, f), pdf], { stdio: 'ignore', timeout: 300000 });
  if (facit) { console.log(`facit  ${f}: ${sidor(pdf).length} sidor`); continue; }
  const gammal = join(rot, 'underlag/prov/wordjmf/facit', f.replace(/\.docx$/, '.pdf'));
  if (!existsSync(gammal)) { console.log(`?      ${f}: inget facit`); continue; }
  const [a, b] = [sidor(gammal), sidor(pdf)];
  const olika = a.map((s, i) => (s === b[i] ? 0 : i + 1)).filter(Boolean);
  if (a.length !== b.length || olika.length) {
    skiljer++;
    console.log(`NEJ    ${f}: ${a.length} → ${b.length} sidor${olika.length ? `, första skillnaden på sidan ${olika[0]}` : ''}`);
  } else console.log(`ok     ${f}: ${b.length} sidor, samma sidbrytningar`);
}
if (!facit && skiljer) { console.error(`\nwordjmf: ${skiljer} Word-filer ser annorlunda ut i Word än facit.`); process.exit(1); }
