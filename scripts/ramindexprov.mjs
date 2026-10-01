#!/usr/bin/env node
// Prov för materialets lista (src/lib/ramindex.ts, K-152, K-155, K-156), i npm run validera. Listan byggs ur ramarnas
// rubriker, så provet kör den mot alla metoder och mot felskrivna rubriker ur granskningen 2026-10-01
// (underlag/prov/k152/granskning-2026-10-01.md): varje ram ska ha exakt en länk, en lärarsida ska stå på sin texts rad,
// en felskriven lärarsida ska stoppa bygget och en vanlig ram får aldrig göra det.
//
//   node scripts/ramindexprov.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { parse as parseYaml } from 'yaml';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
// ramindex.ts är TypeScript och läses av Astro; här buntas den med esbuild, som följer med Astro, och laddas ur minnet.
const kod = (await build({ entryPoints: [join(rot, 'src/lib/ramindex.ts')], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })).outputFiles[0].text;
const { ramindex } = await import(`data:text/javascript;base64,${Buffer.from(kod).toString('base64')}`);

const fel = [];
const lankar = (poster) => poster.flatMap((p) => (p.typ === 'rad' ? [p.rad.lank.nr] : [...(p.oversikt ? [p.oversikt.nr] : []), ...p.rader.flatMap((r) => [r.lank.nr, ...(r.extra ? [r.extra.nr] : [])])]));

// Alla metoder: inget stopp, och varje ram har exakt en länk.
const mapp = join(rot, 'src/content/stodundervisning');
let metoder = 0;
for (const f of readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))) {
  const ramar = parseYaml(readFileSync(join(mapp, f), 'utf8')).ramar?.ramar ?? [];
  if (ramar.length < 4) continue;
  metoder++;
  try {
    const nr = lankar(ramindex(ramar));
    if (nr.length !== ramar.length || new Set(nr).size !== ramar.length) fel.push(`${f}: ${ramar.length} ramar men ${new Set(nr).size} länkar`);
  } catch (e) { fel.push(`${f}: stoppar: ${e.message}`); }
}

// Granskningens fall, på Textsamtal i grupp.
const textsamtal = parseYaml(readFileSync(join(mapp, 'textsamtal-i-grupp.yaml'), 'utf8')).ramar.ramar;
const med = (andra) => { const r = structuredClone(textsamtal); andra(r); return r; };
const doep = (r, fran, till) => { const ram = r.find((x) => x.rubrik === fran); if (!ram) throw new Error(`provet hittar inte ramen "${fran}"`); ram.rubrik = till; return ram; };
const radFor = (poster, titel) => poster.filter((p) => p.typ === 'niva').flatMap((p) => p.rader).find((r) => r.lank.namn === titel);
const fall = [
  ['komma i titeln', 'går', (r) => { doep(r, 'Mellan, text 8: Lördag klockan 14', 'Mellan, text 8: Lördag, klockan 14').listor[0].rubrik = 'Lördag, klockan 14'; doep(r, 'Lärarens sida: Mellan, text 8, Lördag klockan 14', 'Lärarens sida: Mellan, text 8, Lördag, klockan 14'); }, (p) => radFor(p, 'Lördag, klockan 14')?.extra],
  ['komma i vad', 'går', (r) => { doep(r, 'Mellan, kartläggning före: Fem minuter', 'Mellan, kartläggning, före: Fem minuter'); doep(r, 'Lärarens sida: Mellan, kartläggning före, Fem minuter', 'Lärarens sida: Mellan, kartläggning, före, Fem minuter'); }, (p) => radFor(p, 'Fem minuter')?.extra],
  ['felstavad nivå', 'stoppar', (r) => doep(r, 'Lärarens sida: Mellan, text 3, Mössan', 'Lärarens sida: Melan, text 3, Mössan')],
  ['komma saknas', 'stoppar', (r) => doep(r, 'Lärarens sida: Mellan, text 3, Mössan', 'Lärarens sida: Mellan text 3, Mössan')],
  ['kolon i stället för komma', 'stoppar', (r) => doep(r, 'Lärarens sida: Mellan, text 3, Mössan', 'Lärarens sida: Mellan, text 3: Mössan')],
  ['nivån omdöpt bara i texterna', 'stoppar', (r) => { for (const ram of r) if (/^Mellan, /.test(ram.rubrik)) ram.rubrik = ram.rubrik.replace(/^Mellan, /, 'Mellannivå, '); }],
  ['en andra lärarsida till samma text', 'stoppar', (r) => r.splice(7, 0, structuredClone(r.find((x) => x.rubrik === 'Lärarens sida: Lättläst, text 1, Staketet')))],
  ['översikt för en nivå som inte finns', 'stoppar', (r) => doep(r, 'Lärarens sidor: Mellan', 'Lärarens sidor: Mellannivå')],
  ['en vanlig ram med nivåernas namn', 'går', (r) => r.splice(4, 0, { rubrik: 'Samtalskort: Mellan, Avancerad, Lättläst', text: ['Kort.'], delar: [] }), (p) => p.some((x) => x.typ === 'rad' && x.rad.lank.namn === 'Samtalskort: Mellan, Avancerad, Lättläst')],
  ['en tabell med nivåns namn tar inte översiktens plats', 'går', (r) => r.splice(4, 0, { rubrik: 'Ordlista: Mellan', text: ['Orden.'], delar: [], oversikt: { kolumner: ['Ord'], rader: [['ord']] } }), (p) => p.find((x) => x.typ === 'niva' && x.namn === 'Mellan')?.oversikt?.namn === 'Lärarens sidor: Mellan'],
];
for (const [namn, vantat, andra, pruva] of fall) {
  let poster, stopp;
  try { poster = ramindex(med(andra)); } catch (e) { stopp = e.message; }
  if (vantat === 'stoppar' && !stopp) fel.push(`${namn}: stoppade inte`);
  else if (vantat === 'stoppar' && !stopp.startsWith('Materialets lista: ramen')) fel.push(`${namn}: stoppade med fel besked: ${stopp}`);
  else if (vantat === 'går' && stopp) fel.push(`${namn}: stoppade: ${stopp}`);
  else if (vantat === 'går' && pruva && !pruva(poster)) fel.push(`${namn}: listan blev fel`);
}

if (fel.length) {
  console.error(`ramindexprov: materialets lista (src/lib/ramindex.ts):\n${fel.map((f) => `  ${f}`).join('\n')}`);
  process.exit(1);
}
console.log(`Materialets lista: ${metoder} metoder har en länk per ram, och ${fall.length} felskrivna och udda rubriker ger rätt lista eller stoppar bygget.`);
