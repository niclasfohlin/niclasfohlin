#!/usr/bin/env node
// En regel står på ett ställe (Niclas 2026-10-07: "Saker ska bara stå på ett ställe, annars blir det drift. Och behövs
// det ska det hänvisas till rätt fil."). Provet läser instruktionsfilerna och stannar när samma ordföljd, tolv ord eller
// fler, står i två av dem: då har en regel skrivits av i stället för att hänvisas till. Körs först i npm run validera.
//
//   node scripts/instruktionsprov.mjs            pröva, slutkod 1 när något står dubbelt
//   node scripts/instruktionsprov.mjs --visa     skriv också ut storleken per fil
//   node scripts/instruktionsprov.mjs --nara     lista ordföljder på åtta ord eller fler, utan att stanna
//
// Så lagas ett fynd: bestäm vilken fil som är regelns hem, låt regeln stå där, och skriv i den andra filen var den står,
// med filens namn och rubrik ("står i ARBETSSATT.md under Innehåll"). Skriv inte om regeln med andra ord: då står den
// fortfarande på två ställen, och provet ser det inte.
//
// Hemmen: CLAUDE.md säger vad sajten är, mandatet och vad bara Niclas gör. ARBETSSATT.md säger hur arbetet går till.
// STIL.md hur text skrivs. METODER.md allt om metoderna. DRIFT.md tjänsterna, krediternas tal och mekaniken. Ett
// kommando i .claude/commands/ är ett flöde: stegen i ordning, med hänvisning till reglerna.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
// --nara visar det som ligger nära gränsen, ordföljder på åtta ord eller fler, utan att stanna.
const NARA = process.argv.includes('--nara');
const ORD = NARA ? 8 : 12;
const mapp = (m) => (existsSync(join(rot, m)) ? readdirSync(join(rot, m)).filter((f) => f.endsWith('.md')).sort().map((f) => `${m}/${f}`) : []);
const filer = ['CLAUDE.md', 'ARBETSSATT.md', 'STIL.md', 'AGENTS.md', 'METODER.md', 'DRIFT.md', 'UPPSTART.md', 'KONCEPT.md', 'README.md', ...mapp('.claude/commands'), ...mapp('.claude/agents')]
  .filter((f) => existsSync(join(rot, f)));

// Ordföljder som får stå i två filer, med skälet. Listan ska vara kort: en hänvisning är nästan alltid rätt svar.
const UNDANTAG = [];

const ordI = (fil) => {
  const ut = [];
  readFileSync(join(rot, fil), 'utf8').split(/\r?\n/).forEach((rad, i) => {
    for (const o of rad.toLowerCase().replace(/[^a-zåäöé0-9<>/._@-]+/g, ' ').split(' ')) {
      const rent = o.replace(/[.,:;]+$/, '');
      if (rent) ut.push({ o: rent, rad: i + 1 });
    }
  });
  return ut;
};

const data = filer.map((f) => ({ f, ord: ordI(f) }));
const fynd = [];
for (let a = 0; a < data.length; a++) {
  for (let b = a + 1; b < data.length; b++) {
    const A = data[a].ord, B = data[b].ord;
    const index = new Map();
    for (let i = 0; i + ORD <= B.length; i++) {
      const nyckel = B.slice(i, i + ORD).map((x) => x.o).join(' ');
      if (!index.has(nyckel)) index.set(nyckel, i);
    }
    for (let i = 0; i + ORD <= A.length; i++) {
      const nyckel = A.slice(i, i + ORD).map((x) => x.o).join(' ');
      if (!index.has(nyckel)) continue;
      const j = index.get(nyckel);
      let n = ORD;
      while (i + n < A.length && j + n < B.length && A[i + n].o === B[j + n].o) n++;
      const text = A.slice(i, i + n).map((x) => x.o).join(' ');
      if (!UNDANTAG.some((u) => text.includes(u.text))) fynd.push({ a: data[a].f, radA: A[i].rad, b: data[b].f, radB: B[j].rad, n, text });
      i += n - 1;
    }
  }
}

// Hänvisningarna: "står i X.md under Y" ska peka på något som finns i X. Ett ankare är en rubrik, en fet etikett först i
// ett stycke, första cellen i en tabellrad eller orden som ett stycke börjar med. Byter en rubrik namn utan att
// hänvisningarna följer med, stannar provet här.
const ankare = (fil) => {
  const ut = new Set();
  for (const rad of readFileSync(join(rot, fil), 'utf8').split(/\r?\n/)) {
    const rubrik = rad.match(/^#{1,4}\s+(.+?)\s*$/);
    const fet = rad.match(/^\*\*([^*]+?)\.?\*\*/);
    const cell = rad.match(/^\|\s*([^|]+?)\s*\|/);
    const stycke = rad.match(/^([A-ZÅÄÖ][^.:(|]{3,40}?)\s*[(:.]/);
    for (const t of [rubrik?.[1], fet?.[1], cell?.[1], stycke?.[1]]) if (t) { ut.add(t.trim()); ut.add(t.split(/[:(]/)[0].trim()); }
  }
  return [...ut].filter((a) => a.length >= 3);
};
const ankareI = new Map();
const pekarFel = [];
for (const f of filer) {
  readFileSync(join(rot, f), 'utf8').split(/\r?\n/).forEach((rad, i) => {
    for (const m of rad.matchAll(/([A-ZÅÄÖ]+\.md)(?: säger)? under ([A-ZÅÄÖ][^\n]{0,70})/g)) {
      const mal = m[1];
      if (!filer.includes(mal)) continue;
      if (!ankareI.has(mal)) ankareI.set(mal, ankare(mal));
      const text = m[2];
      if (!ankareI.get(mal).some((a) => text.startsWith(a) && !/[a-zåäö]/i.test(text[a.length] ?? ' '))) pekarFel.push({ f, rad: i + 1, mal, text: text.split(/[.;,)]/)[0].trim() });
    }
  });
}

if (process.argv.includes('--visa')) {
  for (const d of data) console.log(`  ${d.f.padEnd(34)} ${String(readFileSync(join(rot, d.f)).length).padStart(7)} byte`);
}
if (NARA) {
  for (const f of fynd) console.log(`  ${f.a} rad ${f.radA} och ${f.b} rad ${f.radB}, ${f.n} ord: ${f.text.split(' ').slice(0, 16).join(' ')} …`);
  console.log(`Instruktionerna: ${fynd.length} ordföljder på ${ORD} ord eller fler står i två filer. Gränsen där provet stannar är tolv.`);
  process.exit(0);
}
if (fynd.length) {
  console.error(`Instruktionerna: ${fynd.length} ordföljder står i två filer. En regel står på ett ställe: låt den stå i sitt hem och hänvisa dit från den andra filen (scripts/instruktionsprov.mjs säger hur).`);
  for (const f of fynd) console.error(`  ${f.a} rad ${f.radA} och ${f.b} rad ${f.radB}, ${f.n} ord: ${f.text.split(' ').slice(0, 16).join(' ')} …`);
  process.exit(1);
}
if (pekarFel.length) {
  console.error(`Instruktionerna: ${pekarFel.length} hänvisningar pekar på något som inte finns i målfilen. Rätta hänvisningen, eller rubriken om det är den som har bytt namn.`);
  for (const p of pekarFel) console.error(`  ${p.f} rad ${p.rad}: "${p.mal} under ${p.text}"`);
  process.exit(1);
}
console.log(`Instruktionerna: ingen ordföljd på ${ORD} ord eller fler står i två av de ${filer.length} instruktionsfilerna, och hänvisningarna pekar på rubriker som finns.`);
