#!/usr/bin/env node
// Prov för veckans material (src/lib/veckomaterial.ts, K-236 och K-237), i npm run validera.
//
// Niclas 2026-10-06 om Ordverkstad i grupp: "Man måste leta omkring för att hitta vecka 2 på 3 ställen", "Det är inte
// första gången detta händer" och "känns som något litet steg fattas kring denna struktur på allt material". Steget är
// det här provet: i en metod med veckor sorteras materialet i veckans material, som heter efter veckan och står vid den,
// och det som gäller hela kursen. Provet stannar tills sorteringen är läst och inskriven i src/data/veckoprov.json, och
// igen när ramarna eller listorna har ändrats, så att frågan ställs för varje ny kurs och varje nytt material, också i
// en ny session.
//
//   node scripts/veckoprov.mjs                           provar regeln och att varje metod med veckor är genomgången
//   node scripts/veckoprov.mjs --post <id>               visar veckorna med sitt material och det som gäller hela kursen
//   node scripts/veckoprov.mjs --avgjord <id> [--skal "<varför det som ser ut att höra till veckorna står där det står>"]
//
// En kurs med en ram med lektioner får veckans material ställt vid veckan av koden. En metod som nämner veckor i
// rubrikerna utan en sådan ram (ett paket per årskurs, en ram per vecka, två projekt) får det inte, och där kräver
// inskrivningen ett skäl: hur veckans material står samlat, eller varför det inte gör det.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { parse as parseYaml } from 'yaml';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
// Biblioteken är TypeScript och läses av Astro; här buntas de med esbuild, som följer med Astro, och laddas ur minnet.
const ladda = async (fil) => {
  const kod = (await build({ entryPoints: [join(rot, fil)], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })).outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(kod).toString('base64')}`);
};
const { veckomaterial, veckofel, veckofragor, veckorUtanKurs } = await ladda('src/lib/veckomaterial.ts');
const { ramindex } = await ladda('src/lib/ramindex.ts');

const mapp = join(rot, 'src/content/stodundervisning');
const registerFil = join(rot, 'src/data/veckoprov.json');
const las = (id) => parseYaml(readFileSync(join(mapp, `${id}.yaml`), 'utf8'));
const metoder = readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => f.replace(/\.yaml$/, ''));
const ramarna = (d) => d.ramar?.ramar ?? [];
// En kurs som koden kan ställa material vid: exakt en ram med lektioner.
const arKurs = (d) => ramarna(d).filter((r) => r.lektioner).length === 1;
// En metod som nämner minst två olika veckor i rubrikerna utan att vara en sådan kurs.
const harVeckorUtanKurs = (d) => !arKurs(d) && veckorUtanKurs(d).length >= 2;
// Kontrollsumman gäller det som sorteringen läser: veckorna, ramarnas rubriker och listornas rubriker, i ordning.
const summa = (d) => createHash('sha256').update(JSON.stringify(ramarna(d).map((r) => [r.rubrik, !!r.lektioner, r.lektioner ? r.delar.map((x) => x.rubrik) : [], (r.listor ?? []).map((l) => l.rubrik ?? '')]))).digest('hex').slice(0, 16);
const register = () => { try { return JSON.parse(readFileSync(registerFil, 'utf8')); } catch { return {}; } };

// Sorteringen som text. För en kurs: veckorna med sitt material och det som gäller hela kursen. För en metod med veckor
// utan en ram med lektioner: var varje vecka nämns.
function sortering(d) {
  const ramar = ramarna(d);
  const ut = [];
  if (!arKurs(d)) {
    ut.push('Metoden har ingen ram med lektioner (eller flera), så koden ställer inget vid veckorna. Veckorna nämns här:');
    for (const n of veckorUtanKurs(d)) {
      const nams = new RegExp(`(^|[^\\p{L}])vecka\\s+${n}(?!\\d)(?!\\s*[–-]\\s*\\d)`, 'iu');
      ut.push(`  Vecka ${n}`);
      ramar.forEach((r) => {
        if (nams.test(r.rubrik)) ut.push(`      ramen "${r.rubrik}"`);
        for (const l of r.listor ?? []) if (nams.test(l.rubrik ?? '')) ut.push(`      listan "${l.rubrik}" ur ramen "${r.rubrik}"`);
      });
    }
    ut.push('Övriga ramar:', ...ramar.filter((r) => !/vecka\s+\d/i.test(r.rubrik) && !(r.listor ?? []).some((l) => /vecka\s+\d/i.test(l.rubrik ?? ''))).map((r) => `  "${r.rubrik}"`));
    return ut.join('\n');
  }
  const vm = veckomaterial(d);
  const kurs = ramar.find((r) => r.lektioner);
  ut.push(`Veckorna (${kurs.rubrik}), ${kurs.delar.length} delar:`);
  kurs.delar.forEach((del, di) => {
    const saker = vm?.veckor[di].saker ?? [];
    ut.push(`  ${del.rubrik}`);
    for (const x of saker) ut.push(`      ${x.typ === 'ram' ? `ramen "${ramar[x.ri].rubrik}"` : `listan "${ramar[x.ri].listor[x.li].rubrik}" ur ramen "${ramar[x.ri].rubrik}"`}`);
    if (!saker.length) ut.push('      (inget eget material)');
  });
  ut.push('Hela kursen, i filens ordning:');
  ramar.forEach((r, i) => {
    if (r.lektioner || vm?.ramar.has(i)) return;
    const lagda = vm?.listor.get(i);
    const kvar = (r.listor ?? []).filter((_, li) => !lagda?.has(li));
    ut.push(`  "${r.rubrik}"${lagda ? ` (${lagda.size} listor står vid veckorna${kvar.length ? `, ${kvar.length} står kvar` : ''})` : kvar.length ? ` (${kvar.length} ${kvar.length === 1 ? 'lista' : 'listor'})` : ''}`);
  });
  return ut.join('\n');
}

const arg = (namn) => (process.argv.includes(namn) ? process.argv[process.argv.indexOf(namn) + 1] : undefined);
const post = arg('--post');
const avgjord = arg('--avgjord');
if (post || avgjord) {
  const id = post ?? avgjord;
  const d = las(id);
  if (!arKurs(d) && !harVeckorUtanKurs(d)) { console.log(`${id} nämner inga veckor i ramarna, så inget material står vid veckor.`); process.exit(0); }
  const fel = veckofel(d);
  const fragor = veckofragor(d);
  console.log(sortering(d));
  if (fel.length) console.log(`\nStoppar bygget:\n${fel.map((f) => `  ${f.text}`).join('\n')}`);
  if (fragor.length) console.log(`\nFrågor att avgöra:\n${fragor.map((f) => `  ${f}`).join('\n')}`);
  if (avgjord) {
    if (fel.length) { console.error('\nveckoprov: rätta rubrikerna ovan först.'); process.exit(1); }
    const skal = arg('--skal');
    if (fragor.length && !skal) { console.error('\nveckoprov: frågorna ovan är inte avgjorda. Döp om materialet så att det står vid sin vecka, eller skriv in med --skal "<varför det gäller hela kursen>".'); process.exit(1); }
    if (!arKurs(d) && !skal) { console.error('\nveckoprov: metoden har veckor men ingen ram med lektioner. Skriv in med --skal "<hur veckans material står samlat, eller varför det inte gör det>".'); process.exit(1); }
    const r = register();
    r[avgjord] = { datum: new Date().toISOString().slice(0, 10), summa: summa(d), ...(skal ? { skal } : {}) };
    writeFileSync(registerFil, `${JSON.stringify(Object.fromEntries(Object.keys(r).sort().map((k) => [k, r[k]])), null, 2)}\n`);
    console.log(`\nInskrivet i src/data/veckoprov.json: ${avgjord} är genomgången ${r[avgjord].datum}.`);
  }
  process.exit(0);
}

const fel = [];
// 1. Regeln, på en liten fast kurs med tre veckor, så att provet inte beror på en metod som ändras: en ram med
// lektioner, en förlaga per vecka, ramen Ordkorten med en lista per vecka, ett kort och ett protokoll för hela kursen.
const HART = String.fromCharCode(160);
const provkurs = () => ({
  kort: { listor: ['Ordkort'] },
  ramar: { ramar: [
    { rubrik: 'Till läraren: veckorna', lektioner: true, text: ['En sida per vecka.'], delar: [1, 2, 3].map((n) => ({ rubrik: `Vecka ${n} · Namn ${n}`, falt: [{ rubrik: 'Fokus', text: 'Text.' }] })) },
    ...[1, 2, 3].map((n) => ({ rubrik: `Förlaga, vecka ${n}: Text ${n}`, text: ['Läs.'], delar: [{ rubrik: 'Till läraren', falt: [{ rubrik: 'Om texten', text: 'Not.' }] }], listor: [{ rubrik: `Text ${n}`, rader: [['Stycke.']] }, { rubrik: 'Frågorna', rader: [['1. Fråga?']] }] })),
    { rubrik: 'Ordkorten', text: ['Varje vecka har en sida med kort.'], delar: [{ rubrik: 'Till läraren', falt: [{ rubrik: 'Så gör du', text: 'Klipp.' }] }], listor: [1, 2, 3].map((n) => ({ rubrik: `Vecka ${n} · Ordkort`, rader: [['ord']] })) },
    { rubrik: 'Kortet', text: ['Hela kursen.'], delar: [], listor: [{ rubrik: 'Stegen', rader: [['1']] }] },
    { rubrik: 'Protokollet: vecka 1–3', text: ['Tre veckor.'], delar: [{ rubrik: 'Vecka 1', falt: [{ rubrik: 'Läste', text: '' }] }] },
  ] },
});
const med = (andra) => { const d = provkurs(); andra(d.ramar.ramar, d); return d; };
const ram = (r, rubrik) => { const x = r.find((y) => y.rubrik === rubrik); if (!x) throw new Error(`provkursen har ingen ram "${rubrik}"`); return x; };
const vid = (d, vecka) => veckomaterial(d).veckor[vecka - 1].saker;
const fall = [
  ['varje vecka har sin förlaga och sina ordkort', () => {}, (d) => veckomaterial(d).veckor.every((v) => v.saker.length === 2 && v.saker[0].typ === 'ram' && v.saker[0].namn === 'Förlaga' && v.saker[1].typ === 'lista' && v.saker[1].namn === 'Ordkort') && veckofel(d).length === 0 && veckofragor(d).length === 0],
  ['ramen vars listor står vid veckorna står kvar i filens ordning, utan dem', () => {}, (d) => { const vm = veckomaterial(d); const i = d.ramar.ramar.findIndex((x) => x.rubrik === 'Ordkorten'); return !vm.ramar.has(i) && vm.listor.get(i).size === 3; }],
  ['ett spann av veckor gäller hela kursen', () => {}, (d) => { const vm = veckomaterial(d); const i = d.ramar.ramar.findIndex((x) => x.rubrik === 'Protokollet: vecka 1–3'); return !vm.ramar.has(i) && !vm.listor.has(i) && veckofragor(d).length === 0; }],
  ['små bokstäver och veckan sist i rubriken', (r) => { ram(r, 'Förlaga, vecka 2: Text 2').rubrik = 'Förlaga: Text 2, vecka 2'; }, (d) => vid(d, 2).some((x) => x.typ === 'ram' && x.namn === 'Förlaga') && veckofel(d).length === 0],
  ['hårt mellanslag i veckan', (r) => { ram(r, 'Ordkorten').listor[1].rubrik = `Vecka${HART}2 · Ordkort`; }, (d) => vid(d, 2).some((x) => x.typ === 'lista' && x.namn === 'Ordkort')],
  ['vecka 10 är inte vecka 1', (r) => { r[0].delar[2].rubrik = 'Vecka 10 · Namn'; ram(r, 'Förlaga, vecka 3: Text 3').rubrik = 'Förlaga, vecka 10: Text 3'; ram(r, 'Ordkorten').listor[2].rubrik = 'Vecka 10 · Ordkort'; }, (d) => vid(d, 1).length === 2 && vid(d, 3).length === 2 && veckofel(d).length === 0],
  ['material för ett visst pass står vid veckan med passet i namnet', (r) => { ram(r, 'Ordkorten').listor[1].rubrik = 'Vecka 2, pass 1 · Ordkort'; }, (d) => vid(d, 2).some((x) => x.typ === 'lista' && x.namn === 'Pass 1 · Ordkort') && veckofel(d).length === 0],
  ['komma i namnet står kvar', (r) => { ram(r, 'Ordkorten').listor[1].rubrik = 'Vecka 2 · Ordkort, de stora 0,5'; }, (d) => vid(d, 2).some((x) => x.typ === 'lista' && x.namn === 'Ordkort, de stora 0,5')],
  ['två förlagor samma vecka får olika namn i listan', (r) => { r.splice(3, 0, { ...structuredClone(ram(r, 'Förlaga, vecka 2: Text 2')), rubrik: 'Förlaga, vecka 2: Extra' }); }, (d) => { const n = vid(d, 2).filter((x) => x.typ === 'ram').map((x) => x.namn); return n.length === 2 && n.includes('Förlaga: Text 2') && n.includes('Förlaga: Extra'); }],
  ['en lista utan vecka står kvar i sin ram', (r) => { ram(r, 'Ordkorten').listor.push({ rubrik: 'Tomma kort', rader: [['']] }); }, (d) => { const vm = veckomaterial(d); return vm.listor.get(d.ramar.ramar.findIndex((x) => x.rubrik === 'Ordkorten')).size === 3 && veckofel(d).length === 0; }],
  ['en vecka som inte finns stoppar', (r) => { ram(r, 'Ordkorten').listor[2].rubrik = 'Vecka 9 · Ordkort'; }, (d) => veckofel(d).length === 1 && /Vecka 9/.test(veckofel(d)[0].text)],
  ['en vecka som inte finns stoppar också när kursen börjar med en del utan tal', (r) => { r[0].delar.unshift({ rubrik: 'Före kursen', falt: [{ rubrik: 'Fokus', text: 'Text.' }] }); ram(r, 'Ordkorten').listor[2].rubrik = 'Vecka 9 · Ordkort'; }, (d) => veckofel(d).some((f) => /Vecka 9/.test(f.text))],
  ['två veckor i en rubrik stoppar', (r) => { ram(r, 'Ordkorten').listor[2].rubrik = 'Vecka 2 · Vecka 3 · Ordkort'; }, (d) => veckofel(d).length === 1 && /flera/.test(veckofel(d)[0].text)],
  ['en uppräkning av veckor stoppar', (r) => { ram(r, 'Kortet').rubrik = 'Läxa: vecka 1, 2 och 3'; }, (d) => veckofel(d).length === 1 && /räknar upp/.test(veckofel(d)[0].text)],
  ['en lista vid en vecka som inte är kort stoppar', (r) => { r.push({ rubrik: 'Läxorna', text: ['En läxa per vecka.'], delar: [], listor: [1, 2, 3].map((n) => ({ rubrik: `Vecka ${n} · Läxa`, rader: [['Läs.']] })) }); }, (d) => veckofel(d).length === 3 && veckofel(d).every((f) => /inte kort/.test(f.text))],
  ['veckan utan att vara ett eget led ger en fråga', (r) => { ram(r, 'Förlaga, vecka 2: Text 2').rubrik = 'Förlaga vecka 2: Text 2'; ram(r, 'Ordkorten').listor[2].rubrik = 'Vecka 3 – Ordkort'; }, (d) => vid(d, 2).length === 1 && vid(d, 3).length === 1 && veckofragor(d).filter((f) => /eget led/.test(f)).length === 2],
  ['listor som inte heter efter veckorna ger en fråga', (r) => { ram(r, 'Ordkorten').listor.forEach((l, i) => { l.rubrik = `Ordkort ${i + 1}`; }); }, (d) => veckofragor(d).length === 1 && /3 listor/.test(veckofragor(d)[0])],
  ['ramar som inte heter efter veckorna ger en fråga, också med en annan ram emellan', (r) => { [1, 2, 3].forEach((n) => { const x = ram(r, `Förlaga, vecka ${n}: Text ${n}`); x.rubrik = `Förlaga ${n}: Text ${n}`; }); r.splice(2, 0, r.splice(r.findIndex((x) => x.rubrik === 'Kortet'), 1)[0]); }, (d) => veckofragor(d).some((f) => /3 ramar börjar med/.test(f))],
  ['två ramar med lektioner: allt står i filens ordning', (r) => { r.push({ ...structuredClone(r[0]), rubrik: 'Till läraren: projekt 2' }); }, (d) => veckomaterial(d) === undefined && veckofel(d).length === 0 && veckorUtanKurs(d).length === 3],
  ['materialets lista har en rad per vecka och en länk per ram', () => {}, (d) => { const p = ramindex(d.ramar.ramar); const v = p.find((x) => x.typ === 'veckor'); return !!v && v.antal === '3 veckor' && v.rader.length === 3 && v.rader.every((x) => x.saker.length === 2) && !p.some((x) => x.typ === 'niva'); }],
];
for (const [namn, andra, pruva] of fall) {
  try { if (!pruva(med(andra))) fel.push(`regelns prov "${namn}": blev fel. Provet står i scripts/veckoprov.mjs och gäller koden i src/lib/veckomaterial.ts, inte någon metod.`); } catch (e) { fel.push(`regelns prov "${namn}": ${e.message}`); }
}

// 2. Varje metod med veckor är genomgången, och genomgången gäller ramarna som de står nu.
const r = register();
let kurser = 0;
let ovriga = 0;
for (const id of metoder) {
  const d = las(id);
  const kurs = arKurs(d);
  if (!kurs && !harVeckorUtanKurs(d)) continue;
  if (kurs) kurser++; else ovriga++;
  for (const f of veckofel(d)) fel.push(`${id}: ${f.text}`);
  const inskriven = r[id];
  const visa = `node scripts/veckoprov.mjs --post ${id}`;
  if (!inskriven) {
    fel.push(kurs
      ? `${id}: kursen har veckor, och materialet är inte sorterat i veckans material och det som gäller hela kursen. Kör ${visa}, läs listan som läraren som ska skriva ut vecka 2, döp om det som hör till en vecka ("<vad>, vecka N: <titel>" för en ram, "Vecka N · <vad>" för kort) och skriv in genomgången med --avgjord ${id}.`
      : `${id}: metoden nämner veckor i ramarna men har ingen ram med lektioner, så inget ställs vid veckorna. Kör ${visa} och läs var varje vecka står. Gör veckorna till en ram med lektioner, eller skriv in med --avgjord ${id} --skal "<hur veckans material står samlat, eller varför det inte gör det>".`);
  } else if (inskriven.summa !== summa(d)) fel.push(`${id}: ramarna eller listorna har ändrats sedan materialet sorterades ${inskriven.datum}. Kör ${visa}, läs listan igen och skriv in med --avgjord ${id}${inskriven.skal ? ' --skal "<skälet>"' : ''}.`);
  else if (!inskriven.skal && (!kurs || veckofragor(d).length)) fel.push(`${id}: ${kurs ? veckofragor(d).join(' ') : 'metoden har veckor men ingen ram med lektioner.'} Avgör det och skriv in med --avgjord ${id} --skal "<varför>".`);
}
for (const id of Object.keys(r)) if (!metoder.includes(id)) fel.push(`src/data/veckoprov.json: ${id} finns inte som metod.`);

if (fel.length) {
  console.error(`veckoprov: veckans material (src/lib/veckomaterial.ts, METODER.md under Veckans material):\n${fel.map((f) => `  ${f}`).join('\n')}`);
  process.exit(1);
}
console.log(`Veckans material: ${fall.length} fall ger rätt sortering eller stoppar, ${kurser} ${kurser === 1 ? 'kurs' : 'kurser'} med veckor är genomgångna och ${ovriga} ${ovriga === 1 ? 'metod' : 'metoder'} med veckor utan en ram med lektioner har ett inskrivet skäl.`);
