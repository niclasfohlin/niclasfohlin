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

const { utfallensGranser, undervisningsmetodensFel, UNDERVISNINGSMETODENS_DELAR, delarnasText, laget, NIVAORD, svarighetensNiva, kostnadensNiva, SVARIGHETENS_ORD, KOSTNADENS_ORD, larandetIKort, lathundensSidor, MED_DIG_PA_VAGEN, forstaLektionensMinuter, meningarna, slugAv, UPPTAGNA_LED, innehallstaggar, postensRad, postFel, databasFel, hamtplan, fastaAntal, fohlinHanvisningar, mojligaUpplagg, faktaIFastForm, meningarI, bildtextFel } = await import(pathToFileURL(join(mapp, 'index.js')).href);
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
}
if (UNDERVISNINGSMETODENS_DELAR.map((x) => x.nr).join('') !== '1234AB') fel.push('UNDERVISNINGSMETODENS_DELAR har inte delarna 1, 2, 3, 4, A och B i ordning');
{ const t = delarnasText(UNDERVISNINGSMETODENS_DELAR[1], { minuter: 40, amne: 'matematik', andra: 4 }); if (t.rad !== 'En lektion på 40 minuter, del för del.' || !t.text.includes('i matematik och i fyra andra ämnen')) fel.push(`delarnasText fyller inte i minuterna, ämnet och exemplen: ${t.rad} / ${t.text}`); }
{ const t = delarnasText(UNDERVISNINGSMETODENS_DELAR[2], { veckor: 4, progression: 'Metodens egen text.' }); if (!t.rad.includes('de första fyra veckorna') || t.text !== 'Metodens egen text.') fel.push(`delarnasText fyller inte i del 3: ${t.rad} / ${t.text}`); }

// Metodkortets nivåer (K-632, som riggens evidensen.md): tillförlitligheten sätter taket, låg utan effekt är Oklart, nivå 1
// med negativ effekt heter Negativ effekt, och ett läge eller värde som tabellen inte har är okänt.
const lagesfall = [
  [{ tillforlitlighet: 'hog', effekt: 'stor' }, 'niva 5 Starkt stöd'], [{ tillforlitlighet: 'mattlig', effekt: 'stor' }, 'niva 4 Gott stöd'],
  [{ tillforlitlighet: 'hog', effekt: 'liten' }, 'niva 3 Visst stöd'], [{ tillforlitlighet: 'lag', effekt: 'mattlig' }, 'niva 2 Svagt stöd'],
  [{ tillforlitlighet: 'mattlig', effekt: 'ingen' }, 'niva 1 Inget påvisat stöd'], [{ tillforlitlighet: 'hog', effekt: 'negativ' }, 'niva 1 Negativ effekt'],
  [{ tillforlitlighet: 'lag', effekt: 'ingen' }, 'oklart Oklart'], [{ niva: 'inte-sammanvagt' }, 'inte Inte sammanvägt'], [undefined, 'inte Inte studerat'],
  [{ tillforlitlighet: 'hog', effekt: 'enorm' }, 'okand '], [{ niva: 'toString' }, 'okand '],
];
for (const [v, vantat] of lagesfall) { const l = laget(v); const f = `${l.slag}${l.slag === 'niva' ? ` ${l.niva}` : ''} ${l.ord}`; if (f !== vantat) fel.push(`laget(${JSON.stringify(v)}) ger "${f}", inte "${vantat}"`); }
if (!laget({ tillforlitlighet: 'hog', effekt: 'negativ' }).negativ || laget({ tillforlitlighet: 'hog', effekt: 'ingen' }).negativ) fel.push('laget markerar inte negativ effekt, eller markerar ingen effekt som negativ');
if (NIVAORD.length !== 6 || SVARIGHETENS_ORD[3] !== 'Medelsvårt' || KOSTNADENS_ORD[2] !== 'Låg') fel.push('nivåernas ord har inte en tom först och fem ord');
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
  const vagen = del('veckorna', 'med-dig')?.text ?? '';
  const vagensRader = MED_DIG_PA_VAGEN.map((id) => pilot.uppfoljning.rader.find((r) => r.id === id)?.vad).filter(Boolean);
  if (vagen !== vagensRader.join(' ')) fel.push('Med dig på vägen har inte uppföljningens rader i tidsordning');
  if (del('veckorna', 'progression')?.rader.length !== pilot.progression.rader.length) fel.push('lathundens fjärde sida har inte alla veckor');
  if (del('veckorna', 'hall-fast')) fel.push('Håll fast står i lathunden, men hör till del 4 på metodens sida');
  const stodet = pilot.uppfoljning.rader.find((r) => r.id === 'stodet').vad;
  if (del('veckorna', 'efter')?.text !== meningarna(stodet).slice(0, 2).join(' ')) fel.push('Efter de första veckorna har inte de två första meningarna i stodet');
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

if (fel.length) { console.error(`standardprov: ${fel.length} fel i src/lib/standard/:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`standardprov: standarden (src/lib/standard/) importerar inget utanför sig själv, och slugAv, UPPTAGNA_LED, innehållstaggarna, postens rad och fel och hämtplanen, spärren mot fasta antal, hänvisningarna till Fohlin, uppläggen ur faktarutans tid, kortets ruta i fast form, bildtextens gränser, metodkortets nivåer och lathundens sidor svarar rätt.`);
