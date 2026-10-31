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

const { utfallensGranser, undervisningsmetodensFel, EFFEKTENS_GRANSER, effektensSkala, platsenAv100, UNDERVISNINGSMETODENS_DELAR, delarnasText, laget, NIVAORD, NIVAERNAS_FORKLARING, bankensVal, bankensRutor, bankensValPassar, bankensValUr, BANKENS_LAGEN, spannUr, spannText, SYFTEN, ANVANDS_I, STODETS_GRUPPER, SVARIGHETENS_GRUPPER, svarighetensNiva, kostnadensNiva, SVARIGHETENS_ORD, KOSTNADENS_ORD, larandetIKort, lathundensSidor, MED_DIG_PA_VAGEN, forstaLektionensMinuter, meningarna, slugAv, UPPTAGNA_LED, innehallstaggar, postensRad, postFel, databasFel, hamtplan, fastaAntal, fohlinHanvisningar, mojligaUpplagg, faktaIFastForm, meningarI, bildtextFel, primaraOmraden, PRIMARA_REGELN, forstaLektionensForm, SLAGENS_FORM, veckansRubrik, vagenTillMandag, variantensAnkare, LARANDETS_OMRADEN, ARBETSLAGETS_MOTEN, arbetslagetsMoten, litenForsta, utanRadbrytning, metodensFilmnamn, FAKTANS_MATERIAL, OMRADENAS_RAD, STRUKTURENS_SLAG, strukturensFel, strukturensSumma } = await import(pathToFileURL(join(mapp, 'index.js')).href);
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

// Metodkortets ruta i fast form (K-465): metodernas egna formuleringar.
const faktaFall = [
  [{ grupp: 'Två till sex elever', tid: '30 minuter per pass, tre pass i veckan', period: 'Fem veckor' }, '2–6 elever|30 min|3 pass/vecka|5 veckor'],
  [{ grupp: 'Från fyra elever till en hel klass', tid: '10–40 minuter per pass, en eller två gånger i veckan', period: 'Tolv veckor eller mer, så länge gruppen behöver det' }, '4 elever–klass|10–40 min|1–2 pass/vecka|12+ veckor'],
  [{ grupp: '2–12 elever', tid: '60 minuter per pass, två pass i veckan och ett tredje när det går', period: 'Högst en vecka, tre till fem pass' }, '2–12 elever|60 min|2–3 pass/vecka|högst 1 vecka'],
  [{ grupp: 'En till fyra elever', tid: '20 minuter i skolan och 20 hemma per pass, vanligtvis fyra dagar i veckan', period: 'Sex veckor för varje kurs' }, '1–4 elever|20 min + 20 hemma|4 pass/vecka|6 veckor per kurs'],
  [{ grupp: 'Två till åtta elever, eller en hel klass', tid: '10–15 minuter per pass, varje dag eller minst tre gånger i veckan', period: 'Åtta till tolv pass i följd' }, '2–8 elever|10–15 min|3–5 pass/vecka|8–12 pass'],
];
for (const [d, vantat] of faktaFall) { const f = Object.values(faktaIFastForm(d)).join('|'); if (f !== vantat) fel.push(`faktaIFastForm(${JSON.stringify(d)}) ger ${f}, inte ${vantat}`); }
// Undervisningsmetodernas tid: lektioner, och ett lägsta tal med minst (riggens standard, avsnitt 7 och 18).
const lektionsfall = [
  [{ tid: '40 minuter per lektion, minst tre lektioner i veckan', period: 'Fyra veckor att komma igång' }, '|40 min|minst 3 lektioner/vecka|4 veckor'],
  [{ tid: '50 minuter per lektion, tre till fem lektioner i veckan', period: 'Sex veckor att komma igång' }, '|50 min|3–5 lektioner/vecka|6 veckor'],
];
if (faktaIFastForm({ tid: '40 minuter per lektion, minst tre lektioner i veckan' }, { passen: '' }).ofta !== 'minst 3/vecka') fel.push('faktaIFastForm utan ord för passen ger inte "minst 3/vecka"');
for (const [d, vantat] of lektionsfall) { const f = Object.values(faktaIFastForm(d, { passen: 'lektioner' })).map((x) => x ?? '').join('|'); if (f !== vantat) fel.push(`faktaIFastForm(${JSON.stringify(d)}, lektioner) ger ${f}, inte ${vantat}`); }

// Undervisningsmetoderna (K-621): utfallens gränser som riggens standard räknar dem, och delarnas ordning och text.
for (const [n, vantat] of [[28, '5|6-13|14'], [22, '4|5-10|11'], [25, '5|6-12|13'], [5, '1|2-2|3']]) { const g = utfallensGranser(n); const f = `${g.nastanAlla}|${g.deFlesta.join('-')}|${g.halften}`; if (f !== vantat) fel.push(`utfallensGranser(${n}) ger ${f}, inte ${vantat}`); }
// Effektens skala: texten säger gränserna ur konstanten, och andra kolumnen börjar vid Cohens 0,2 (Niclas 2026-10-30).
{
  const t = effektensSkala().text.join(' ');
  for (const v of ['plats 54 vid 0,10', 'plats 58 vid 0,20', 'plats 66 vid 0,40', '0,05 en måttlig och 0,20 en stor', '0,20 måttlig och 0,40 stor'])
    if (!t.includes(v)) fel.push(`effektensSkala säger inte "${v}"`);
  // Skalans källor står på en egen rad med hela referensen och doi, och inte som hänvisningar i texten (riggens punkt 19, K-645).
  const kallor = effektensSkala().kallor ?? [];
  if (/\(Kraft|Cheung/.test(t) || kallor.map((x) => x.namn).join('|') !== 'Kraft (2020)|Cheung och Slavin (2016)' || kallor.some((x) => !/^10\.\d{4}\//.test(x.doi) || !x.text.includes(x.namn.replace(/ \(\d{4}\)$/, '').split(' och ')[0]))) fel.push('effektensSkala har inte skalans två källor på en egen rad, Kraft (2020) och Cheung och Slavin (2016) med doi, och inga hänvisningar i texten');
  if ([0, 0.2, 0.4, 0.8, -0.2].map(platsenAv100).join() !== '50,58,66,79,42') fel.push('platsenAv100 ger inte 50, 58, 66, 79 och 42 för 0, 0,2, 0,4, 0,8 och −0,2');
  if (EFFEKTENS_GRANSER.andra.mattlig !== 0.2 || EFFEKTENS_GRANSER.stora.stor !== 0.2) fel.push('EFFEKTENS_GRANSER har inte gränserna 0,20 för måttlig i andra studier och 0,20 för stor i stora försök');
}
// Bankens filter: stödets grupp efter staplarna, och inget område utan nivå i en grupp (K-642).
{
  const v = bankensVal({ syfte: ['nytt', 'okant'], slag: 'strukturer', profil: { svarighet: { lara: 2, karnan: 2, stod: 1, tid: 2 }, evidens: { larande: { tillforlitlighet: 'hog', effekt: 'stor' }, lasning: { niva: 'anekdotiskt', motivering: 'x', kallor: ['a', 'b'] }, skrivning: { tillforlitlighet: 'mattlig', effekt: 'liten' }, matematik: { tillforlitlighet: 'hog', effekt: 'ingen' }, socialt: { niva: 'inte-studerat', motivering: 'x' } } } });
  if (JSON.stringify(v) !== JSON.stringify({ syfte: ['nytt'], anvands: 'strukturer', svarighet: 'latt', stod: { larande: 'starkt', lasning: 'svagt', skrivning: 'medel', matematik: null, socialt: null } })) fel.push(`bankensVal ger ${JSON.stringify(v)}`);
  if (SYFTEN.length !== 5) fel.push('SYFTEN har inte fem syften');
  // Reglagens ordning, från lite till mycket, som banken visar lägena i.
  if (Object.values(ANVANDS_I).join() !== 'Delar av lektionen,Hela lektionen,Alla lektioner' || STODETS_GRUPPER.map((g) => g.namn).join() !== 'Svagt,Visst,Starkt' || SVARIGHETENS_GRUPPER.map((g) => g.namn).join() !== 'Lätt,Medelsvårt,Svårt') fel.push('reglagens lägen står inte från lite till mycket: ANVANDS_I, STODETS_GRUPPER eller SVARIGHETENS_GRUPPER');
  // Bankens rutor, prövade med 1, 3 och 30 metoder: en ruta bara när den skiljer metoderna åt, och Område och Stöd
  // tillsammans, när stödet skiljer metoderna åt i något område.
  const inte = { niva: 'inte-studerat' }, hog = { tillforlitlighet: 'hog', effekt: 'stor' }, lag = { tillforlitlighet: 'lag', effekt: 'liten' }, ingen = { tillforlitlighet: 'hog', effekt: 'ingen' };
  const metod = (syfte, slag, larande, lasning, sv) => bankensVal({ syfte, slag, profil: { svarighet: { lara: sv, karnan: sv, stod: sv, tid: sv }, evidens: { larande, lasning, skrivning: inte, matematik: inte, socialt: inte } } });
  const SYFTENA = SYFTEN.map((x) => x.id), SLAGEN = ['lektionsforlopp', 'strukturer', 'strategier'];
  const rutorna = [
    ['en metod', [metod(['nytt'], 'strukturer', hog, lag, 3)], { syfte: false, anvands: false, omrade: false, stod: false, svarighet: false }],
    // Tre metoder med samma slag och utan nivå i Läsning: Används i skiljer dem inte åt, men Lärande totalt gör det.
    ['tre metoder', [metod(['nytt'], 'strukturer', hog, ingen, 2), metod(['nytt', 'ova'], 'strukturer', lag, ingen, 3), metod(['ova'], 'strukturer', hog, ingen, 4)], { syfte: true, anvands: false, omrade: true, stod: true, svarighet: true }],
    // Trettio metoder med samma svårighet och Starkt i Lärande totalt: Stöd visas för Läsnings skull.
    ['trettio metoder', Array.from({ length: 30 }, (_, i) => metod([SYFTENA[i % 5]], SLAGEN[i % 3], hog, i % 2 ? lag : hog, 3)), { syfte: true, anvands: true, omrade: true, stod: true, svarighet: false }],
    ['trettio metoder med samma syfte i alla', Array.from({ length: 30 }, (_, i) => metod(['nytt', SYFTENA[1 + (i % 4)]], SLAGEN[i % 3], hog, hog, 1 + (i % 5))), { syfte: false, anvands: true, omrade: false, stod: false, svarighet: true }],
  ];
  for (const [namn, valen, vantat] of rutorna) { const r = bankensRutor(valen); if (JSON.stringify(r) !== JSON.stringify(vantat)) fel.push(`bankensRutor för ${namn} ger ${JSON.stringify(r)}, inte ${JSON.stringify(vantat)}`); }
  // Ett val passar: spannen med ändarna, hela banan som Alla med metoderna utan nivå, Stöd i valt område och utan område i
  // Lärande totalt, och ett tomt val är Alla.
  const sp = (fran, till = fran) => ({ fran, till });
  const passar = [[{}, true], [{ syfte: 'nytt', anvands: sp('strukturer'), svarighet: sp('latt') }, true], [{ stod: sp('medel', 'starkt') }, true],
    [{ omrade: 'lasning', stod: sp('medel', 'starkt') }, false], [{ omrade: 'lasning', stod: sp('svagt') }, true], [{ omrade: 'skrivning', stod: sp('svagt', 'medel') }, true],
    [{ omrade: 'matematik', stod: sp('svagt', 'medel') }, false], [{ omrade: 'matematik', stod: sp('svagt', 'starkt') }, true], [{ svarighet: sp('medel', 'svart') }, false],
    [{ anvands: sp('lektionsforlopp', 'strategier') }, false], [{ syfte: 'ova' }, false]];
  for (const [val, vantat] of passar) if (bankensValPassar(v, val) !== vantat) fel.push(`bankensValPassar(${JSON.stringify(val)}) ger ${!vantat}`);
  // Spannet i adressen: ett läge, två i ordning, och hela banan, ett omvänt spann eller ett okänt läge som Alla.
  const L = BANKENS_LAGEN.stod;
  if (L.join() !== 'svagt,medel,starkt' || BANKENS_LAGEN.svarighet.join() !== 'latt,medel,svart' || BANKENS_LAGEN.anvands.join() !== 'strukturer,lektionsforlopp,strategier') fel.push('BANKENS_LAGEN står inte i reglagens ordning');
  if (JSON.stringify([spannUr(L, 'medel-starkt'), spannUr(L, 'medel'), spannUr(L, 'svagt-starkt'), spannUr(L, 'starkt-medel'), spannUr(L, 'okant'), spannUr(L, '')]) !== JSON.stringify([sp('medel', 'starkt'), sp('medel'), null, null, null, null])
    || spannText(L, sp('medel')) !== 'medel' || spannText(L, sp('svagt', 'medel')) !== 'svagt-medel' || spannText(L, sp('svagt', 'starkt')) !== '' || JSON.stringify(bankensValUr({ stod: 'medel-starkt', omrade: 'lasning' })) !== JSON.stringify({ omrade: 'lasning', anvands: null, stod: sp('medel', 'starkt'), svarighet: null }))
    fel.push('spannUr, spannText eller bankensValUr läser inte spannet som adressen skriver det');
}
// Undervisningsmetodens fält: piloten har allt, och en fil med fel ger varje fel (sajtens K-627).
{
  const { parse } = await import('yaml');
  const pilot = parse(readFileSync(join(mapp, '..', '..', 'content', 'undervisningsmetoder', 'explicit-undervisning.yaml'), 'utf8'));
  const f0 = undervisningsmetodensFel(pilot);
  if (f0.length) fel.push(`undervisningsmetodensFel ger fel i piloten: ${f0.slice(0, 3).join('; ')}`);
  const trasig = structuredClone(pilot);
  trasig.inledning = [{ ['Det här är en mening som har ett kolon mitt i sig utan citattecken']: 'resten' }];
  trasig.profil.evidens.larande.kort = 'x'.repeat(81);
  trasig.progression.rader[0].fraga = 'Gick det';
  trasig.plan.skattningar[0].regler = [{ om: 'under 4 två veckor', rad: 'finns-inte' }];
  trasig.mal = 'Ett mål';
  trasig.hinder.kort = `Ett. Två. Tre ${'x'.repeat(220)}.`;
  const f1 = undervisningsmetodensFel(trasig).join(' | ');
  for (const v of ['kolon utan citattecken', 'fler än 80 tecken', 'frågetecken', 'inte är en rad i uppföljningen', 'i rad"', 'inget mål', 'hinder.kort har fler än 2 meningar', 'hinder.kort har fler än 220 tecken']) if (!f1.includes(v)) fel.push(`undervisningsmetodensFel fångar inte ${v}`);
  const utanKort = structuredClone(pilot); delete utanKort.hinder.kort;
  if (!undervisningsmetodensFel(utanKort).some((f) => f.startsWith('hinder.kort saknas'))) fel.push('undervisningsmetodensFel fångar inte en metod utan hinder.kort');
  // Faktarutans material har högst sex delar, som sajtens schema, så att riggens leveransprov ser samma regel (K-645).
  const sju = structuredClone(pilot); sju.material = [...pilot.material, ...Array.from({ length: FAKTANS_MATERIAL + 1 - pilot.material.length }, (_, i) => `del ${i}`)];
  if (FAKTANS_MATERIAL !== 6 || !undervisningsmetodensFel(sju).some((f) => f.startsWith(`material har ${FAKTANS_MATERIAL + 1} delar`))) fel.push('undervisningsmetodensFel fångar inte faktarutans material med fler än sex delar');
  // Filmernas namn: huvudfilmen och en för varje extrafilm (K-645: intaget tog förut bara två).
  if (metodensFilmnamn({ film: {}, filmer: [{ nr: 2 }, { nr: 3 }] }).join() !== 'film,film2,film3' || metodensFilmnamn({}).length) fel.push('metodensFilmnamn ger inte film, film2 och film3');
}
// Primär evidens (K-645, riggens punkt 12): högst två av de fyra områdena med den högsta nivån, minst Visst stöd, och alla som
// står helt lika i tillförlitligheten och effekten, så att ordningen aldrig väljer bort ett område.
{
  const v = (t, e) => ({ tillforlitlighet: t, effekt: e, motivering: 'x', kallor: ['a'] });
  const ev = (lasning, skrivning, matematik, socialt) => ({ larande: v('hog', 'stor'), lasning, skrivning, matematik, amnen: v('hog', 'stor'), socialt });
  const fall = [
    [ev(v('mattlig', 'liten'), v('mattlig', 'mattlig'), v('mattlig', 'mattlig'), v('mattlig', 'mattlig')), 'Skrivning|Matematik|Socialt'],
    [ev(v('lag', 'ingen'), v('mattlig', 'liten'), v('mattlig', 'mattlig'), v('lag', 'ingen')), 'Matematik'],
    [ev(v('hog', 'mattlig'), v('mattlig', 'stor'), v('mattlig', 'mattlig'), v('mattlig', 'mattlig')), 'Läsning|Skrivning'],
    [ev(v('lag', 'stor'), v('lag', 'stor'), v('mattlig', 'ingen'), { niva: 'inte-studerat', motivering: 'x' }), ''],
  ];
  for (const [e, vantat] of fall) if (primaraOmraden(e).join('|') !== vantat) fel.push(`primaraOmraden ger ${primaraOmraden(e).join(', ') || 'inget'}, inte ${vantat || 'inget'}`);
  if (!PRIMARA_REGELN.includes('står alla')) fel.push('PRIMARA_REGELN säger inte att alla som står lika står');
  if (!OMRADENAS_RAD.lasning.includes('engelska') || OMRADENAS_RAD.amnen !== 'SO, NO och teknik') fel.push('OMRADENAS_RAD säger inte att Läsning räknar engelska och moderna språk och Ämnen SO, NO och teknik');
}
// Slagens form och veckans rubrik (K-645): Första lektionen i ett lektionsförlopp och Den första hela lektionen i en metod med
// strukturer, och veckan med sitt led.
{
  const l = forstaLektionensForm({ slag: 'lektionsforlopp', forsta: { rubrik: 'Första lektionen' } });
  const s = forstaLektionensForm({ slag: 'strukturer', forsta: { rubrik: 'Första veckan' } });
  if (l.minuterna !== 'Minuterna' || l.din !== 'din första lektion' || s.minuterna !== 'Den första hela lektionen' || s.forlagan !== 'Den första hela lektionen, ifylld som exempel. Minuterna är hållpunkter.' || /grå/.test(s.forlagan)) fel.push('forstaLektionensForm ger inte minuternas rubrik, lektionen i en mening och raden ovanför förlagan, ifylld som exempel och utan det grå (G9), för båda slagen');
  if (forstaLektionensForm({ slag: 'okant' }).namn !== SLAGENS_FORM.lektionsforlopp.forstaLektionen) fel.push('forstaLektionensForm ger inte ett okänt slag ett lektionsförlopps form');
  if (veckansRubrik({ vecka: '1', led: 'Klimatet', rubrik: 'Kamraten' }) !== 'Vecka 1, Klimatet: Kamraten' || veckansRubrik({ vecka: 2, rubrik: 'Paret' }) !== 'Vecka 2: Paret' || veckansRubrik({ vecka: '1', led: 'Jag gör', rubrik: 'Signalen' }, { vecka: false }) !== '1. Jag gör: Signalen') fel.push('veckansRubrik ger inte veckan med ledet, och utan ledet');
  if (litenForsta('T-kortet') !== 'T-kortet' || litenForsta('EPA') !== 'EPA' || litenForsta('Signalen') !== 'signalen') fel.push('litenForsta gör T-kortet, EPA eller Signalen fel');
  if (utanRadbrytning('Ping-pong-prat och 5 Återkoppling, 0–5 min och 3 · 4') !== 'Ping\u2011pong\u2011prat och 5\u00a0Återkoppling, 0–5 min och 3 · 4') fel.push('utanRadbrytning sätter inte hårda bindestreck och hårt mellanslag efter ett nummer, eller ändrar något annat');
}
if (UNDERVISNINGSMETODENS_DELAR.map((x) => x.nr).join('') !== '1234AB') fel.push('UNDERVISNINGSMETODENS_DELAR har inte delarna 1, 2, 3, 4, A och B i ordning');
{ const t = delarnasText(UNDERVISNINGSMETODENS_DELAR[1], { minuter: 40, amne: 'matematik', andra: 4 }); if (t.rad !== 'En lektion på 40 minuter, del för del.' || !t.text.includes('i matematik och i fyra andra ämnen')) fel.push(`delarnasText fyller inte i minuterna, ämnet och exemplen: ${t.rad} / ${t.text}`); }
{ const t = delarnasText(UNDERVISNINGSMETODENS_DELAR[2], { veckor: 4, progression: 'Metodens egen text.' }); if (!t.rad.includes('de första fyra veckorna') || t.text !== 'Metodens egen text.') fel.push(`delarnasText fyller inte i del 3: ${t.rad} / ${t.text}`); }

// Metodkortets nivåer (K-632, som riggens evidensen.md): tillförlitligheten sätter taket, låg utan effekt är Oklart, nivå 1
// med negativ effekt heter Negativ effekt, och ett läge eller värde som tabellen inte har är okänt.
const lagesfall = [
  // Anekdotiskt stöd är nivå 1, en stapel (K-641; Niclas 2026-10-30).
  [{ niva: 'anekdotiskt', motivering: 'x', kallor: ['a'] }, 'niva 1 Anekdotiskt stöd'],
  [{ tillforlitlighet: 'hog', effekt: 'stor' }, 'niva 5 Starkt stöd'], [{ tillforlitlighet: 'mattlig', effekt: 'stor' }, 'niva 4 Gott stöd'],
  [{ tillforlitlighet: 'hog', effekt: 'liten' }, 'niva 3 Visst stöd'], [{ tillforlitlighet: 'lag', effekt: 'mattlig' }, 'niva 2 Svagt stöd'],
  [{ tillforlitlighet: 'mattlig', effekt: 'ingen' }, 'niva 0 Inget påvisat stöd'], [{ tillforlitlighet: 'hog', effekt: 'negativ' }, 'niva 0 Negativ effekt'],
  [{ tillforlitlighet: 'lag', effekt: 'ingen' }, 'oklart Oklart'], [{ niva: 'inte-sammanvagt' }, 'inte Inte sammanvägt'], [undefined, 'inte Inte studerat'],
  [{ tillforlitlighet: 'hog', effekt: 'enorm' }, 'okand '], [{ niva: 'toString' }, 'okand '],
];
for (const [v, vantat] of lagesfall) { const l = laget(v); const f = `${l.slag}${l.slag === 'niva' ? ` ${l.niva}` : ''} ${l.ord}`; if (f !== vantat) fel.push(`laget(${JSON.stringify(v)}) ger "${f}", inte "${vantat}"`); }
if (!laget({ tillforlitlighet: 'hog', effekt: 'negativ' }).negativ || laget({ tillforlitlighet: 'hog', effekt: 'ingen' }).negativ) fel.push('laget markerar inte negativ effekt, eller markerar ingen effekt som negativ');
if (NIVAORD.length !== 6 || NIVAORD[0] !== 'Inget påvisat stöd' || NIVAORD[1] !== 'Anekdotiskt stöd' || SVARIGHETENS_ORD[3] !== 'Medelsvårt' || KOSTNADENS_ORD[2] !== 'Låg') fel.push('nivåernas ord går inte från Inget påvisat stöd (0) och Anekdotiskt stöd (1) till Starkt stöd (5)');
if (NIVAERNAS_FORKLARING.filter((x) => x.staplar !== null).map((x) => x.staplar).join() !== '5,4,3,2,1,0,0' || NIVAERNAS_FORKLARING.some((x) => !x.text)) fel.push('NIVAERNAS_FORKLARING har inte nivåerna 5 till 0, Negativ effekt med 0 och en text för varje');
for (const [s, vantat] of [[{ lara: 3, karnan: 3, stod: 3, tid: 3 }, 3], [{ lara: 1, karnan: 2, stod: 4, tid: 5 }, 4], [{ lara: 5, karnan: 1, stod: 5, tid: 1 }, 5], [{ lara: 2, karnan: 3 }, 3], [null, null]]) if (svarighetensNiva(s) !== vantat) fel.push(`svarighetensNiva(${JSON.stringify(s)}) ger ${svarighetensNiva(s)}, inte ${vantat} (den övre medianen)`);
for (const [k, vantat] of [[{ kop: 2, timmar: 13 }, 2], [{ kop: 1, timmar: 15 }, 3], [{ kop: 1, timmar: 4.9 }, 1], [{ kop: 4, timmar: 0 }, 4], [{ kop: 1, timmar: 80 }, 5]]) if (kostnadensNiva(k) !== vantat) fel.push(`kostnadensNiva(${JSON.stringify(k)}) ger ${kostnadensNiva(k)}, inte ${vantat}`);
if (larandetIKort({ kort: 'Kort.', motivering: 'Hög. Lång.' }) !== 'Kort.' || larandetIKort({ motivering: 'Måttlig tillförlitlighet, måttlig effekt. Stödet gäller små grupper (Fuchs m.fl., 2021).' }) !== 'Stödet gäller små grupper.') fel.push('larandetIKort tar inte kort först, eller tar inte bort hänvisningen ur motiveringen');

// Lathundens fyra sidor ur piloten (K-632): sidorna och delarna i riggens lathunds ordning, med samma meningar ur metoden.
{
  const { parse } = await import('yaml');
  const pilot = parse(readFileSync(join(mapp, '..', '..', 'content', 'undervisningsmetoder', 'explicit-undervisning.yaml'), 'utf8'));
  const sidor = lathundensSidor(pilot);
  const del = (s, id) => sidor.find((x) => x.id === s)?.delar.find((x) => x.id === id);
  if (sidor.map((s) => `${s.nr}${s.id}`).join(' ') !== '1metoden 2mandag 3planera 4veckorna') fel.push(`lathundensSidor ger sidorna ${sidor.map((s) => `${s.nr}${s.id}`).join(', ')}`);
  const fakta = del('metoden', 'fakta')?.rader ?? [];
  if (fakta.map((r) => r.namn).join('|') !== 'Lektionen|De första veckorna|Lärande totalt|Svårighet|Kostnad') fel.push(`lathundens fakta har raderna ${fakta.map((r) => r.namn).join(', ')}`);
  const totalt = fakta.find((r) => r.namn === 'Lärande totalt');
  if (totalt?.text !== laget(pilot.profil.evidens.larande).ord || totalt?.under !== pilot.profil.evidens.larande.kort) fel.push('Lärande totalt i lathunden har inte kortets ord och kommentaren larande.kort');
  const sv = fakta.find((r) => r.namn === 'Svårighet');
  if (sv?.text !== SVARIGHETENS_ORD[svarighetensNiva(pilot.profil.svarighet)] || sv?.niva !== svarighetensNiva(pilot.profil.svarighet)) fel.push('Svårighet i lathunden räknas inte som i metodkortet');
  if (del('metoden', 'karnan')?.kort.length !== pilot.karna.komponenter.length) fel.push('lathunden har inte ett kort per komponent i kärnan');
  if (del('metoden', 'svarast')?.text !== pilot.hinder.kort) fel.push('Det svåraste i lathunden är inte hinder.kort');
  { const utan = structuredClone(pilot); delete utan.hinder.kort; const t = lathundensSidor(utan)[0].delar.find((x) => x.id === 'svarast')?.text ?? ''; if (!pilot.hinder.text.startsWith(t) || !t || /\.\s/.test(t)) fel.push('utan hinder.kort är Det svåraste i lathunden inte den första meningen i hinder.text'); }
  const minuter = del('mandag', 'minuterna')?.delar ?? [];
  if (!minuter.length || minuter.some((x) => /min$/.test(x.tid)) || minuter[0]?.tid !== pilot.tidsschema.varianter.find((v) => v.nar === 'första lektionen').delar[0].tid.replace(/\s*min$/, '')) fel.push('lathundens minuter är inte första lektionens, utan "min"');
  // Du säger: rutinens repliker vid den första delen, och annars högst två av stegets fraser för samma del.
  const forstaMin = forstaLektionensMinuter(pilot);
  const stegFor = (fas) => pilot.steg.rader.find((s) => s.namn === fas);
  if (forstaMin.some((x, i) => x.fraser.length > (i === 0 ? 9 : 2) || (i > 0 && x.fraser.some((f) => !(stegFor(x.fas)?.fraser ?? []).includes(f))))) fel.push('forstaLektionensMinuter tar fraser som inte är stegets två första för delen');
  if (!forstaMin[0]?.fraser.includes('1, 2, 3, visa!')) fel.push('forstaLektionensMinuter har inte rutinens repliker vid första lektionens start');
  if (minuter.map((x) => x.fraser.join('|')).join(' ') !== forstaMin.map((x) => x.fraser.join('|')).join(' ')) fel.push('lathundens minuter har inte samma fraser som forstaLektionensMinuter');
  if (sidor[1].delar.filter((x) => x.slag === 'rutin').length !== pilot.rutiner.rader.filter((r) => String(r.vecka) === '1').length) fel.push('lathunden har inte vecka 1:s rutiner, och bara dem');
  const blad = del('planera', 'bladet');
  if (blad?.plan !== pilot.forsta.plan || !blad.gra || blad.variant !== 'första lektionen') fel.push('lathundens tredje sida är inte första lektionens plan i grått');
  const utanForsta = structuredClone(pilot); delete utanForsta.forsta.plan; delete utanForsta.hinder;
  const blad2 = lathundensSidor(utanForsta)[2].delar[0];
  if (blad2?.gra || blad2?.plan?.mal !== pilot.amnesexempel.find((e) => e.huvud).plan?.mal) fel.push('utan förlaga är lathundens tredje sida inte huvudexemplets plan');
  if (lathundensSidor(utanForsta)[0].delar.some((x) => x.id === 'svarast')) fel.push('en metod utan hinder får en tom Det svåraste i lathunden');
  const glider = del('veckorna', 'glider')?.rader ?? [];
  const komponenter = new Set(pilot.fallgropar.rader.filter((r) => r.komponent && r.prova).map((r) => r.komponent));
  if (glider.length !== komponenter.size) fel.push(`Om det glider har ${glider.length} rader, inte en per komponent (${komponenter.size})`);
  // Fallgropen har komponentens nummer först, kärnans moment räknas upp och veckan har sitt led (riggens punkter 8–10, K-645).
  if (glider.some((r) => !/^[1-5] /.test(r[0]))) fel.push('Om det glider har inte komponentens nummer före fallgropen');
  if (del('metoden', 'karnan')?.kort.some((k) => / och .* och /.test(k.under))) fel.push('kärnans moment står med och mellan alla, inte med komma och och');
  if (del('veckorna', 'progression')?.rader[0][0] !== veckansRubrik(pilot.progression.rader[0], { vecka: false })) fel.push('lathundens veckor har inte veckans rubrik med ledet');
  if (del('mandag', 'forsta')?.rubrik !== pilot.forsta.rubrik) fel.push('lathundens andra sida har inte metodens rubrik på Första lektionen');
  const vagen = del('veckorna', 'med-dig')?.text ?? '';
  const vagensRader = MED_DIG_PA_VAGEN.map((id) => pilot.uppfoljning.rader.find((r) => r.id === id)?.vad).filter(Boolean);
  if (vagen !== vagensRader.join(' ')) fel.push('Med dig på vägen har inte uppföljningens rader i tidsordning');
  if (del('veckorna', 'progression')?.rader.length !== pilot.progression.rader.length) fel.push('lathundens fjärde sida har inte alla veckor');
  if (del('veckorna', 'hall-fast')) fel.push('Håll fast står i lathunden, men hör till del 4 på metodens sida');
  const stodet = pilot.uppfoljning.rader.find((r) => r.id === 'stodet').vad;
  if (del('veckorna', 'efter')?.text !== meningarna(stodet).slice(0, 2).join(' ')) fel.push('Efter de första veckorna har inte de två första meningarna i stodet');
  // Vägen till måndag (lagningen inför lanseringen, G1): i ett lektionsförlopp som förut, och i en metod med strukturer, där den
  // första hela lektionen kommer efter vecka 1, vecka 1 med metodens första mening, den korta formen med sina minuter, som
  // lathundens sida 2 visar, och veckorna för den hela lektionen.
  if (vagenTillMandag(pilot) !== null) fel.push('vagenTillMandag ger en väg i ett lektionsförlopp, där vägen till måndag är den första lektionen');
  const koop = parse(readFileSync(join(mapp, '..', '..', 'content', 'undervisningsmetoder', 'kooperativt-larande.yaml'), 'utf8'));
  const kv = vagenTillMandag(koop);
  const kort = koop.tidsschema.varianter.find((v) => v.nar === 'ett samarbete i en vanlig lektion');
  if (!kv || kv.vecka1 !== meningarna(koop.forsta.text[0])[0] || kv.kort?.nar !== kort.nar || kv.kort.ankare !== variantensAnkare(kort.nar) || kv.kort.minuter.map((x) => x.tid).join() !== kort.delar.map((x) => x.tid).join() || !/^i vecka.2 eller 3$/.test(kv.hel.nar)) fel.push(`vagenTillMandag i kooperativt lärande ger inte vecka 1, den korta formen och veckorna för den hela lektionen: ${JSON.stringify(kv)}`);
  const koopMin = lathundensSidor(koop)[1].delar.find((x) => x.id === 'minuterna');
  if (koopMin?.rubrik !== kv?.kort?.rubrik || koopMin?.delar.length !== kort.delar.length) fel.push('lathundens sida 2 i kooperativt lärande har inte den korta formens minuter (G1)');
  // Så syns lärandet i klassen (G10) och Till arbetslaget (G11) ur standardens rötter.
  if (LARANDETS_OMRADEN.socialt !== 'Det sociala' || (koop.larandet?.omraden ?? []).some((o) => !LARANDETS_OMRADEN[o.omrade])) fel.push('LARANDETS_OMRADEN har inte ett namn för varje område i Så syns lärandet i klassen, som Det sociala');
  const moten = arbetslagetsMoten(koop);
  if (!moten || moten.leder !== ARBETSLAGETS_MOTEN.leder || moten.moten.map((m) => m.rubrik).join('|') !== 'Möte 1, före första lektionen|Mellan mötena|Möte 2, i slutet av vecka 5' || moten.moten[2].text[0] !== ARBETSLAGETS_MOTEN.mote2Text || moten.moten[2].fragor.at(-1) !== ARBETSLAGETS_MOTEN.sistaFragan || moten.moten[2].fragor.length !== koop.uppdrag.reflektera.length + 1) fel.push(`arbetslagetsMoten ger inte riggens ordning och fasta text: ${JSON.stringify(moten?.moten.map((m) => m.rubrik))}`);
  if (arbetslagetsMoten({ uppdrag: { text: 'T' } })?.moten.map((m) => m.rubrik).join('|') !== ARBETSLAGETS_MOTEN.mote2UtanVecka || arbetslagetsMoten({}) !== null) fel.push('arbetslagetsMoten utan period och möten ger inte bara Möte 2 i slutet av de första veckorna, eller ger något utan uppdrag');
}

// Bildtexten (K-486): meningarna, med citat och förkortningar, och felen.
const meningsfall = [['Ett A4 per elev, att klippa isär. Eleverna lägger talet med korten i vecka 2.', 2], ['Läs ”Hej!” högt. Sedan t.ex. ”Vad tror du?” Klart.', 3],
  ['Siffrorna 1,2 och 0,8 står här, se s. 4.', 1], ['Jag hörde att du …', 1], ['Ett. Två. Tre. Fyra.', 4], ['', 0]];
for (const [t, n] of meningsfall) if (meningarI(t) !== n) fel.push(`meningarI("${t}") ger ${meningarI(t)}, inte ${n}`);
const bildfall = [
  [{ text: 'Ett A4 per elev, att klippa isär.', alt: 'Tjugofyra sifferkort.' }, { blad: true }, 0],
  [{ text: 'Ett A4 per elev, att klippa isär.' }, { blad: true }, 1],
  [{ text: 'Bilden visar bordet.' }, {}, 1],
  [{ text: 'Bild A till Lika och olika. Klipp isär bild A och bild B.' }, {}, 0],
  [{ text: 'Ett. Två. Tre. Fyra.' }, {}, 1],
  [{ text: 'x'.repeat(251) }, {}, 1],
  [{ text: 'x'.repeat(400) }, { visas: false }, 0],
];
for (const [b, o, n] of bildfall) { const f = bildtextFel(b, o); if (f.length !== n) fel.push(`bildtextFel(${JSON.stringify(b).slice(0, 60)}) ger ${JSON.stringify(f)}`); }

// Strukturerna (K-650): ett utkast med fyra steg går igenom, och varje regel stannar på sitt fel, prövat åt andra hållet.
const steg4 = ['Läraren ställer *frågan*.', 'Eleverna tänker.', 'Eleverna talar i par.', 'Eleverna delar med klassen.'];
const forslag4 = ['lasning', 'skrivning', 'matematik', 'socialt'].map((omrade) => ({ omrade, arskurs: '4–6', text: 'Ett. Två. Tre.' }));
const hel = { namn: 'EPA', slag: 'par', steg: steg4, bild: { scen: 'epa', alt: 'Två elever talar.' }, forslag: forslag4 };
const strukturfall = [
  [{ namn: 'EPA', slag: 'par', steg: steg4, utkast: true }, 0],
  [hel, 0],
  [{ ...hel, slag: 'trio' }, 1],
  [{ ...hel, steg: steg4.slice(0, 3) }, 1],
  [{ ...hel, steg: [...steg4, ...steg4, 'Ett nionde.'] }, 1],
  [{ ...hel, steg: [...steg4.slice(0, 3), 'x'.repeat(141)] }, 1],
  [{ ...hel, bild: undefined }, 1],
  [{ ...hel, bild: { scen: 'epa' } }, 1],
  [{ ...hel, forslag: forslag4.slice(0, 3) }, 1],
  [{ ...hel, forslag: [{ ...forslag4[0], text: 'Ett. Två.' }, ...forslag4.slice(1)] }, 1],
  [{ ...hel, forslag: [{ ...forslag4[0], omrade: 'musik', arskurs: '1–2' }, ...forslag4.slice(1)] }, 2],
];
for (const [s, n] of strukturfall) { const f = strukturensFel(s); if (f.length !== n) fel.push(`strukturensFel(${JSON.stringify(s).slice(0, 70)}) ger ${JSON.stringify(f)}, inte ${n} fel`); }
const kallad = { ...hel, andra: [], syfte: 'Var och en tänker först.', kalla: { summa: '' } };
kallad.kalla.summa = strukturensSumma(kallad);
if (strukturensFel(kallad).length) fel.push(`strukturensFel ger fel på en struktur med rätt kontrollsumma: ${strukturensFel(kallad)}`);
if (strukturensFel({ ...kallad, steg: [...steg4.slice(0, 3), 'Eleverna delar med hela klassen.'] }).length !== 1) fel.push('strukturensFel släpper igenom ett steg som är ändrat för hand');
if (strukturensSumma({ namn: 'a' }) === strukturensSumma({ namn: 'b' })) fel.push('strukturensSumma ger samma summa för olika namn');
if (Object.keys(STRUKTURENS_SLAG).join() !== 'par,grupp,klass') fel.push('STRUKTURENS_SLAG har inte slagen par, grupp och klass i den ordningen');

if (fel.length) { console.error(`standardprov: ${fel.length} fel i src/lib/standard/:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`standardprov: standarden (src/lib/standard/) importerar inget utanför sig själv, och strukturernas regler, slugAv, UPPTAGNA_LED, innehållstaggarna, postens rad och fel och hämtplanen, spärren mot fasta antal, hänvisningarna till Fohlin, uppläggen ur faktarutans tid, kortets ruta i fast form, bildtextens gränser, metodkortets nivåer och lathundens sidor svarar rätt.`);
