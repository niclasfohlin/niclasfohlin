#!/usr/bin/env node
// Standardprovet (src/lib/standard/REGLER.md): standarden för databaser och mallar ska kunna flyttas till en modul som
// sajten och metodriggen delar, som wordparitet. Provet stoppar därför en import av astro:, node:, sajtens data eller
// kod utanför mappen, och prövar att funktionerna svarar som de ska. Körs i npm run validera.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mapp = join(rot, 'src', 'lib', 'standard');
const fel = [];

for (const f of readdirSync(mapp).filter((x) => /\.(js|d\.ts)$/.test(x))) {
  const text = readFileSync(join(mapp, f), 'utf8');
  for (const [, kalla] of text.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (!kalla) continue;
    if (/^(astro:|node:)/.test(kalla)) fel.push(`${f}: importerar ${kalla}; standarden ska gå att köra utan Astro och Node`);
    else if (kalla.startsWith('../') || /\/data\/|\.json$/.test(kalla)) fel.push(`${f}: importerar ${kalla}; det sajten vet ges som argument, och koden utanför mappen hör inte till standarden`);
    else if (!kalla.startsWith('./')) fel.push(`${f}: importerar paketet ${kalla}; ett beroende i standarden beslutas och skrivs i REGLER.md först`);
  }
}

const { slugAv, UPPTAGNA_LED, innehallstaggar, postensRad, postFel, databasFel, hamtplan } = await import(pathToFileURL(join(mapp, 'index.js')).href);
const fall = [
  ['Två lösningar', 'tva-losningar'], ['Lärarens sida', 'lararens-sida'], ['Bas', 'bas'], ['Problem och lösning', 'problem-och-losning'],
  ['Café Über', 'cafe-uber'], ['  –Äpple, år 3–  ', 'apple-ar-3'], ['Venndiagrammet', 'venndiagrammet'], ['Ö', 'o'],
];
for (const [in_, ut] of fall) if (slugAv(in_) !== ut) fel.push(`slugAv("${in_}") ger "${slugAv(in_)}", inte "${ut}"`);
for (const led of ['lathund', 'skrivkort', 'aktiviteter', 'brainbreaks', 'problem', 'texter', 'faktatexter']) if (!UPPTAGNA_LED.includes(led)) fel.push(`UPPTAGNA_LED saknar ${led}`);
if (UPPTAGNA_LED.some((l) => slugAv(l) !== l)) fel.push('UPPTAGNA_LED har ett led som inte är skrivet som en adress');

// Innehållstaggarna: matematikens fem delar ur Lgr22, inga för ett ämne utan databas.
const matte = innehallstaggar('Matematik');
if (matte.map((t) => t.id).join(' ') !== 'taluppfattning algebra geometri sannolikhet-och-statistik samband-och-forandring') fel.push(`innehallstaggar('Matematik') ger ${matte.map((t) => t.id).join(', ')}`);
if (matte.find((t) => t.id === 'taluppfattning')?.lgr22 !== 'Taluppfattning och tals användning') fel.push('Taluppfattning har inte kursplanens rubrik');
if (innehallstaggar('Läsning').length !== 0) fel.push('Läsning har taggar utan en databas');

// Postens rad: den första meningen, inte en punkt i ett tal, och kortad vid ett ord.
const rader = [
  ['Fyra påsar med äpplen står på bänken. I påsarna finns 25 äpplen tillsammans.', 'Fyra påsar med äpplen står på bänken.'],
  ['Ett glas kostar 2.5 kr. Sedan köper hon två.', 'Ett glas kostar 2.5 kr.'],
  ['Vem betalar mest? Ordna köpen.', 'Vem betalar mest?'],
  ['Utan punkt', 'Utan punkt'],
];
for (const [in_, ut] of rader) if (postensRad(in_) !== ut) fel.push(`postensRad("${in_}") ger "${postensRad(in_)}", inte "${ut}"`);
const lang = postensRad(`${'ord '.repeat(60)}slut.`);
if (lang.length > 122 || !lang.endsWith(' …')) fel.push(`postensRad kortar inte en lång mening vid ett ord: "${lang}"`);

// En post i rätt form har inga fel, och fel form ger fel.
const del = (namn, fil, sidor, byte) => ({ adress: `/stodundervisning/${namn}.pdf?v=0123abcd`, byte, kalla: [{ fil, sidor }] });
const post = (id, nr, sidor) => ({
  id, niva: 'Bas', nr, titel: `Problem ${nr}`, rad: 'En mening.', tagg: 'Algebra', sida: `/stodundervisning/metoden/${id}`, losning: `/stodundervisning/metoden/${id}#blad-2`,
  bild: { adress: '/stodundervisning/metoden-pabordet-1.svg?v=0123abcd', alt: 'En bild.' },
  utskrift: { post: del(`metoden-${id}-problemet`, 'metoden-problem-bas', [nr - 1], 150000), med: del(`metoden-${id}`, 'metoden-problem-bas-med', sidor, 440000) },
});
const ratt = [post('bas-1', 1, [1, 2, 3]), post('bas-2', 2, [4, 5, 6])];
const radFel = databasFel(ratt, matte);
if (radFel.length) fel.push(`databasFel för poster i rätt form: ${radFel.join('; ')}`);
if (!postFel({ ...ratt[0], tagg: 'Bråk' }, matte).some((f) => f.includes('innehållstaggen'))) fel.push('postFel släpper en tagg som inte finns');
if (!postFel({ ...ratt[0], tagg: undefined }, matte).some((f) => f.includes('saknas'))) fel.push('postFel släpper en post utan tagg i ett ämne med taggar');
if (!postFel({ ...ratt[0], id: 'problem' }, matte).length) fel.push('postFel släpper ett id som är ett reserverat led');
if (!databasFel([ratt[0], ratt[0]], matte).some((f) => f.includes('två gånger'))) fel.push('databasFel släpper ett id som finns två gånger');
if (!databasFel([ratt[1], ratt[0]], matte).some((f) => f.includes('ordning'))) fel.push('databasFel släpper nummer som inte står i ordning');

// Hämtplanen: källfilen en gång när den är mindre än posternas egna pdf:er, annars posternas.
const filer = { 'metoden-problem-bas': { adress: '/stodundervisning/metoden-problem-bas.pdf?v=11111111', byte: 205000 }, 'metoden-problem-bas-med': { adress: '/stodundervisning/metoden-problem-bas-med.pdf?v=22222222', byte: 1200000 } };
const ett = hamtplan([{ id: 'bas-1', u: ratt[0].utskrift.post }], filer);
if (ett.hamta.length !== 1 || ett.hamta[0].adress !== ratt[0].utskrift.post.adress || ett.sidor[0].index !== null) fel.push('hamtplan hämtar inte postens egen pdf för ett problem');
const tva = hamtplan(ratt.map((p) => ({ id: p.id, u: p.utskrift.post })), filer);
if (tva.hamta.length !== 1 || tva.hamta[0].adress !== filer['metoden-problem-bas'].adress || tva.sidor.map((x) => x.index?.join()).join('|') !== '0|1' || tva.byte !== 205000) fel.push(`hamtplan hämtar inte nivåns fil en gång för två problem: ${JSON.stringify(tva)}`);
const med = hamtplan(ratt.map((p) => ({ id: p.id, u: p.utskrift.med })), filer);
if (med.hamta.length !== 2 || med.byte !== 880000) fel.push(`hamtplan hämtar inte posternas egna pdf:er när de är mindre än källfilen: ${JSON.stringify(med)}`);

if (fel.length) { console.error(`standardprov: ${fel.length} fel i src/lib/standard/:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`standardprov: standarden (src/lib/standard/) importerar inget utanför sig själv, och slugAv, UPPTAGNA_LED, innehållstaggarna, postens rad och fel och hämtplanen svarar rätt.`);
