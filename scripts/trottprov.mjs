#!/usr/bin/env node
// Den trötta läraren (METODER.md under Arbetsgången; Niclas 2026-11-07: "finns det centralt innehåll, mallar eller kunskap från
// metoden som en trött lärare missar, eller som kommer väldigt sent trots att det är viktigt?"). Provet görs av en människa eller
// en agent som läser sidan, så här prövas bara att det är gjort: en ny metod i Stödundervisning eller Metoder, som inte finns på
// origin/main och inte är utkast, stoppar valideringen tills den står i src/data/trottprov.json med en till tre saker, var de
// syntes och vad som avgjordes. Samma form som taggprovet (scripts/taggar.mjs). Utan git eller origin/main prövas inga nya
// metoder, men registrets poster prövas alltid.
//
// En ny metod i Stödundervisning prövas här också med standardens namnetsForstaOrdFel (K-770), som Metoders schema kör för
// varje metod: ett blads namn med flera ord vars första ord står ensamt innan delen har sagt namnet, som "rutan" för Rutan på
// tavlan. De publicerade prövas inte, eftersom två av dem har sådana ställen som riggen har fått i en lista (riggens
// out/FRAN-SAJTEN.md, Nytt 2026-11-14), och en metod som tas om bör rättas då.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { namnetsForstaOrdFel } from '../src/lib/standard/index.js';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOGST = 3;

/** Felen i en post: en till tre saker, var och en med namnet, var den syntes och beslutet. */
export function postensFel(vag, p) {
  const fel = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p?.provad ?? '')) fel.push(`${vag}: provad är datumet för provet`);
  const saker = Array.isArray(p?.saker) ? p.saker : [];
  if (saker.length < 1 || saker.length > HOGST) fel.push(`${vag}: ${saker.length} saker, och provet väljer en till ${HOGST}`);
  for (const s of saker) for (const f of ['sak', 'forst', 'beslut']) if (!String(s?.[f] ?? '').trim()) fel.push(`${vag}: ${s?.sak ?? 'en sak'} saknar ${f}`);
  return fel;
}

// Provet åt andra hållet: en post utan saker, med för många saker och utan beslut stoppas, och en hel post går igenom.
const hel = { sak: 'a', forst: 'b', beslut: 'c' };
const fall = [[{ provad: '2026-11-07', saker: [hel] }, 0], [{ provad: '2026-11-07', saker: [] }, 1], [{ provad: '2026-11-07', saker: [hel, hel, hel, hel] }, 1], [{ provad: '2026-11-07', saker: [{ sak: 'a', forst: 'b' }] }, 1], [{ saker: [hel] }, 1]];
for (const [p, n] of fall) if (postensFel('prov', p).length !== n) { console.error(`trottprov: provet av postensFel gav fel svar på ${JSON.stringify(p)}`); process.exit(1); }

const register = JSON.parse(readFileSync(join(rot, 'src', 'data', 'trottprov.json'), 'utf8')).poster ?? {};
const fel = Object.entries(register).flatMap(([vag, p]) => postensFel(vag, p));
let ute = null;
try { ute = new Set(execFileSync('git', ['ls-tree', '-r', '--name-only', 'origin/main', 'src/content'], { cwd: rot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean)); } catch { /* utan origin/main prövas registret ensamt */ }
if (ute) for (const mapp of ['src/content/stodundervisning', 'src/content/undervisningsmetoder']) {
  for (const f of readdirSync(join(rot, mapp)).filter((x) => x.endsWith('.yaml') && !x.startsWith('_'))) {
    const vag = `${mapp}/${f}`;
    const d = parse(readFileSync(join(rot, vag), 'utf8'));
    if (ute.has(vag) || d?.utkast) continue;
    if (mapp.endsWith('stodundervisning')) for (const x of namnetsForstaOrdFel(d)) fel.push(`${vag}: ${x}`);
    if (register[vag]) continue;
    fel.push(`${vag}: ny metod utan provet Den trötta läraren. Gör det som METODER.md säger under Arbetsgången och skriv in det i src/data/trottprov.json`);
  }
}
if (fel.length) { console.error(`trottprov: ${fel.length} fel\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`trottprov: ${Object.keys(register).length} metoder har gått igenom Den trötta läraren, och varje ny metod står med.`);
