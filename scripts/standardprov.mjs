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

// Det en fil importerar: import x from 'y', export … from 'y', import 'y' (utan from) och import('y'), med kommentarerna
// bortplockade (granskningen 2026-10-18: de två sista släpptes förut igenom).
const importer = (text) => {
  const kod = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  return [...kod.matchAll(/(?:import|export)\s[^'";]*?from\s+['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]|\bimport\(\s*['"`]([^'"`]+)['"`]\s*\)/g)].map((m) => m[1] ?? m[2] ?? m[3]).filter(Boolean);
};
// Provet av provet: varje sätt att importera hittas, och en kommentar räknas inte.
const provImporter = [["import fs from 'node:fs';", 'node:fs'], ["import 'node:fs';", 'node:fs'], ["const x = await import('node:fs');", 'node:fs'], ["export { a } from 'astro:content';", 'astro:content'], ["import * as d from '../data/site';", '../data/site'], ["// import 'node:fs'", undefined], ['/* import("node:fs") */', undefined]];
for (const [kod, vantat] of provImporter) if (importer(kod)[0] !== vantat) fel.push(`importkontrollen ger ${JSON.stringify(importer(kod))} för ${kod}, inte ${vantat ?? 'ingenting'}`);

for (const f of readdirSync(mapp).filter((x) => /\.(js|d\.ts)$/.test(x))) {
  const text = readFileSync(join(mapp, f), 'utf8');
  for (const kalla of importer(text)) {
    if (/^(astro:|node:)/.test(kalla)) fel.push(`${f}: importerar ${kalla}; standarden ska gå att köra utan Astro och Node`);
    else if (kalla.startsWith('../') || /\/data\/|\.json$/.test(kalla)) fel.push(`${f}: importerar ${kalla}; det sajten vet ges som argument, och koden utanför mappen hör inte till standarden`);
    else if (!kalla.startsWith('./')) fel.push(`${f}: importerar paketet ${kalla}; ett beroende i standarden beslutas och skrivs i REGLER.md först`);
  }
}

const { slugAv, UPPTAGNA_LED, innehallstaggar, postensRad, postFel, databasFel, hamtplan, fastaAntal, fohlinHanvisningar, mojligaUpplagg } = await import(pathToFileURL(join(mapp, 'index.js')).href);
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
  id, niva: 'Bas', nr, titel: `Problem ${nr}`, rad: 'En mening.', taggar: ['Algebra'], sida: `/stodundervisning/metoden/${id}`, losning: `/stodundervisning/metoden/${id}#blad-2`,
  bild: { adress: '/stodundervisning/metoden-pabordet-1.svg?v=0123abcd', alt: 'En bild.' },
  utskrift: { post: del(`metoden-${id}-problemet`, 'metoden-problem-bas', [nr - 1], 150000), med: del(`metoden-${id}`, 'metoden-problem-bas-med', sidor, 440000) },
});
const ratt = [post('bas-1', 1, [1, 2, 3]), post('bas-2', 2, [4, 5, 6])];
const radFel = databasFel(ratt, matte);
if (radFel.length) fel.push(`databasFel för poster i rätt form: ${radFel.join('; ')}`);
if (!postFel({ ...ratt[0], taggar: ['Bråk'] }, matte).some((f) => f.includes('innehållstaggen'))) fel.push('postFel släpper en tagg som inte finns');
if (!postFel({ ...ratt[0], taggar: ['Algebra', 'Bråk'] }, matte).some((f) => f.includes('"Bråk"'))) fel.push('postFel släpper en andra tagg som inte finns');
if (!postFel({ ...ratt[0], taggar: undefined }, matte).some((f) => f.includes('saknas'))) fel.push('postFel släpper en post utan tagg i en databas med taggar');
if (postFel({ ...ratt[0], taggar: ['Algebra', 'Geometri'] }, matte).length) fel.push('postFel stoppar en post med två taggar som finns');
if (postFel({ ...ratt[0], bild: undefined }, matte).length) fel.push('postFel stoppar en post utan bild, som en lästext');
if (!postFel({ ...ratt[0], bild: { adress: '/x.svg', alt: '' } }, matte).some((f) => f.includes('textalternativ'))) fel.push('postFel släpper en bild utan textalternativ');
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

// Spärren mot fasta antal av en databas poster (K-450).
const ord = ['texter', 'texterna', 'problem', 'problemen'];
const traffar = [['på varje nivå tjugofem texter med frågor', 1], ['fem på varje nivå', 1], ['trettio nya problem', 1], ['tre teman', 1],
  ['två eller tre texter i veckan', 0], ['vecka 6–8 klassens texter', 0], ['Läs en text', 0]];
for (const [t, n] of traffar) { const f = fastaAntal(t, ord, ['teman']); if (f.length !== n) fel.push(`fastaAntal("${t}") ger ${JSON.stringify(f)}`); }

// Hänvisningarna till Niclas Fohlins böcker (K-459): formerna som metoderna har, och det som inte är en hänvisning.
const hanv = [
  ['Gruppstärkande ledarskap (Fohlin och Wilson, 2023).', [['Fohlin och Wilson, 2023', 2023, false]]],
  ['(Pearson och Gallagher, 1983; Fohlin och Wilson, 2025)', [['Fohlin och Wilson, 2025', 2025, false]]],
  ['Fohlin och Wilson (2025) visar', [['Fohlin och Wilson (2025)', 2025, false]]],
  ['Fohlin och Wilson, Skriv! (utkommer 2027)', [['Fohlin och Wilson, Skriv! (utkommer 2027)', 2027, true]]],
  ['Fohlin m.fl., Grundbok i kooperativt lärande (2017)', [['Fohlin m.fl., Grundbok i kooperativt lärande (2017)', 2017, false]]],
  ['© Niclas Fohlin, niclasfohlin.se', []],
  ['Lisa Fohlin (2020)', []],
  // Granskningen 2026-10-19: Fohlin efter en annan, Lisa Fohlin som medförfattare, "se" före och sidan efter, & i HTML,
  // och en källförteckning där titeln inte får gå över ett meningsslut.
  ['Wilson och Fohlin (2025) visar.', [['Wilson och Fohlin (2025)', 2025, false]]],
  ['(Fohlin, Fohlin och Wilson, 2020)', [['Fohlin, Fohlin och Wilson, 2020', 2020, false]]],
  ['(se Fohlin och Wilson, 2023, s. 45)', [['Fohlin och Wilson, 2023', 2023, false]]],
  ['(Fohlin &amp; Wilson, 2023; Fohlin, 2026)', [['Fohlin &amp; Wilson, 2023', 2023, false], ['Fohlin, 2026', 2026, false]]],
  ['Fohlin och Wilson. Elbow (1973) visar.', []],
];
for (const [t, vantat] of hanv) {
  const f = fohlinHanvisningar(t).map((h) => [h.text, h.ar, h.utkommer]);
  if (JSON.stringify(f) !== JSON.stringify(vantat)) fel.push(`fohlinHanvisningar("${t}") ger ${JSON.stringify(f)}`);
}
const lisa = fohlinHanvisningar('Fohlin, Fohlin och Wilson (2020)')[0]?.medforfattare;
if (JSON.stringify(lisa) !== '["Fohlin","Wilson"]') fel.push(`fohlinHanvisningar läser medförfattarna i "Fohlin, Fohlin och Wilson (2020)" som ${JSON.stringify(lisa)}`);

// Uppläggen ur faktarutans tid (K-463): metodernas former, och de svåra formuleringarna ur granskningen.
const upplaggFall = [
  ['30 minuter per pass, tre till fem pass i veckan', 'intensivtraning'], ['10–15 minuter per pass, varje dag eller minst tre gånger i veckan', 'intensivtraning'],
  ['20 minuter i skolan och 20 hemma per pass, vanligtvis fyra dagar i veckan', 'intensivtraning'], ['60 minuter per pass, två pass i veckan', 'lektionsupplagg'],
  ['30 minuter per pass, två till tre pass i veckan', 'lektionsupplagg,aterkommande-pass'], ['Cirka 20 minuter per pass, ett samtal i veckan', 'aterkommande-pass'],
  ['10–40 minuter per pass, en eller två gånger i veckan', 'aterkommande-pass'], ['45 minuter en gång i veckan', 'lektionsupplagg'],
  ['30 minuter tre gånger i veckan', 'intensivtraning'], ['10 till 40 minuter per pass, en eller två gånger i veckan', 'aterkommande-pass'],
  ['15 minuter dagligen', 'intensivtraning'], ['60 min per pass, två pass i veckan', 'lektionsupplagg'], ['20 minuter per pass, under sex veckor med tre pass i veckan', 'intensivtraning'],
];
for (const [tid, vantat] of upplaggFall) if (mojligaUpplagg(tid).join(',') !== vantat) fel.push(`mojligaUpplagg("${tid}") ger ${mojligaUpplagg(tid).join(',') || 'inget'}, inte ${vantat}`);

if (fel.length) { console.error(`standardprov: ${fel.length} fel i src/lib/standard/:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`standardprov: standarden (src/lib/standard/) importerar inget utanför sig själv, och slugAv, UPPTAGNA_LED, innehållstaggarna, postens rad och fel och hämtplanen, spärren mot fasta antal, hänvisningarna till Fohlin och uppläggen ur faktarutans tid svarar rätt.`);
