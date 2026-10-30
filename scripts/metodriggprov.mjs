#!/usr/bin/env node
// Leveransprovet för en undervisningsmetod (K-627): det metodriggen kör mot sin egen leverans innan den säger att en metod
// är levererad, så att sajten tar emot den utan rundor (Niclas 2026-10-30: "Viktigt bara att riggen får standarden för hur
// en metod ska skrivas och läggas in ... Vad behöver den för att [hamna] rätt i sitt bygge då?"). Provet läser riggens
// methods/<id>/metod.yaml och out/<id>/, inte sajtens kopia, och prövar det sajten bygger på: fälten som metodens sida,
// metodkortet och Lär dig metoden läser, filer.json med summan för metodfilen, de åtta dokumenten med © Niclas Fohlin och
// niclasfohlin.se på varje sida, och filmerna. Standarden står i METODER.md under Undervisningsmetoderna.
//
//   node scripts/metodriggprov.mjs <id> [--rigg C:/metodrigg]
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { undervisningsmetodensFel } from '../src/lib/standard/index.js';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const RIGG = args.includes('--rigg') ? args[args.indexOf('--rigg') + 1] : (process.env.METODRIGG ?? 'C:/metodrigg');
if (!id) { console.error('metodriggprov: ange metodens id, som explicit-undervisning.'); process.exit(1); }
const fil = join(RIGG, 'methods', id, 'metod.yaml');
if (!existsSync(fil)) { console.error(`metodriggprov: ${fil} saknas.`); process.exit(1); }
const text = readFileSync(fil, 'utf8');
const d = parse(text);
// 1. Fälten, med standardens prov, som sajtens schema också kör (src/lib/standard/undervisningsmetod.js).
const fel = undervisningsmetodensFel(d);

// 2. Dokumenten: filer.json, summan och upphovsraden.
const ut = join(RIGG, 'out', id);
const forteckning = join(ut, 'filer.json');
const SLAG = ['allt', 'metoden', 'lathund', 'lektionskort', 'planeringsmall', 'observation', 'materialet', 'referensblad'];
if (!existsSync(forteckning)) fel.push(`out/${id}/filer.json saknas`);
else {
  const f = JSON.parse(readFileSync(forteckning, 'utf8'));
  const summa = createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
  for (const s of SLAG) if (!(f.filer ?? []).some((x) => x.slag === s)) fel.push(`filer.json saknar ${s}`);
  for (const x of f.filer ?? []) {
    if ((x.metodSha256 ?? f.metodSha256) !== summa) fel.push(`${x.namn} är byggd ur en annan metod.yaml än den som ligger i methods/${id}/`);
    for (const namn of [x.namn, x.pdf].filter(Boolean)) {
      const p = [join(ut, namn), join(RIGG, 'out', 'material', `lektionskort-${id}`, namn)].find((y) => existsSync(y));
      if (!p) { fel.push(`${namn} saknas`); continue; }
      if (namn.endsWith('.pdf')) {
        const sidor = spawnSync('pdftotext', ['-enc', 'UTF-8', p, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).stdout.split('\f').filter((t) => t.trim());
        const utan = sidor.map((t, i) => (t.includes('© Niclas Fohlin') && t.includes('niclasfohlin.se') ? 0 : i + 1)).filter(Boolean);
        if (utan.length) fel.push(`${namn} saknar "© Niclas Fohlin" och niclasfohlin.se på sidan ${utan.slice(0, 6).join(', ')}`);
        if (sidor.some((t) => /\[object |undefined|NaN/.test(t))) fel.push(`${namn} har [object …], undefined eller NaN i texten`);
      }
    }
  }
}

// 3. Filmerna.
for (const [namn, nr] of [['film', null], ...(d.filmer ?? []).map((f) => [`film${f.nr}`, f.nr])]) for (const ext of ['', '-1', '-2', '-3', '-4']) if (!existsSync(join(ut, `${namn}${ext}.svg`))) fel.push(`out/${id}/${namn}${ext}.svg saknas${nr ? ` (extrafilm ${nr})` : ''}`);

if (fel.length) { console.error(`metodriggprov: ${id}, ${fel.length} fel:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`metodriggprov: ${id} har allt sajten läser, och filer.json, de åtta dokumenten med upphovsraden och filmerna hör till metodfilen.`);
