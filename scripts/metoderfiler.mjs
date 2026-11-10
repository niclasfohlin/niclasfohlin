#!/usr/bin/env node
// Undervisningsmetodernas filer (K-621): dokumenten som metodriggen bygger ur metodens fil, och filmerna, in i
// public/metoder/ med fasta namn (src/lib/undervisningsmetodfiler.ts), med bilder av bladens sidor till sidan. Riggens
// förteckning out/<id>/filer.json säger vilken metodfil varje dokument byggdes ur (sha256), och skriptet stannar när den
// inte är samma fil som sajten visar: då bygger riggen om. Sajten bygger ingen egen Word-fil, så att filen och sidan inte
// glider isär (underlag/prov/metoder/UPPDRAGET.md, besluten). Utan förteckning tar skriptet riggens filer efter namnen och
// klipper bladen ur pdf:en med allt, och säger att kontrollen saknas. Lathundens pdf och PowerPoint-fil är sajtens, ur
// lathundens sidor i standarden (scripts/lathund-pdf.mjs och src/lib/metodpptx.ts, K-637), så bara riggens Word-lathund
// tas in.
//
//   node scripts/metoderfiler.mjs                 ta in filerna för varje metod i src/content/undervisningsmetoder/
//   node scripts/metoderfiler.mjs --kontrollera   pröva bara att filerna finns och hör till metodens fil
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import sharp from 'sharp';
import JSZip from 'jszip';
import { slugAv, metodensFilmnamn } from '../src/lib/standard/index.js';

// Det som riggen har byggt men som väntar på Niclas ja, som { id, slag, skal }: filen tas inte in, och sidan, lathunden och
// proven klarar metoden utan den, eftersom sidan bara visar en knapp för en fil som finns (src/lib/undervisningsmetodfiler.ts).
// En rad tas bort när Niclas har sagt ja och riggens brev säger det. Tom sedan Niclas ja till Kooperativt lärandes
// lektionskort 2026-10-30 (K-645).
const VANTAR = [];

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RIGG = process.env.METODRIGG ?? 'C:/metodrigg';
const MAPP = join(ROT, 'src', 'content', 'undervisningsmetoder');
const UT = join(ROT, 'public', 'metoder');
const kontrollera = process.argv.includes('--kontrollera');
// Materialets sidor per blad, när ett blad har flera sidor i ett material med flera blad (src/data/materialets-sidor.json).
const SIDORNA = join(ROT, 'src', 'data', 'materialets-sidor.json');
const materialetsSidor = existsSync(SIDORNA) ? JSON.parse(readFileSync(SIDORNA, 'utf8')) : {};
const XML = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
/** Ett attributvärde ur Word-filens XML som text: de fem namngivna tecknen och tecken med nummer, som &#197; för Å. */
const avkodaXml = (t) => t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (hela, k) => (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' || k[1] === 'X' ? parseInt(k.slice(2), 16) : Number(k.slice(1))) : XML[k] ?? hela));
/** Bildernas namn i en Word-fil, i ordning: riggen ger varje sida i materialet bladets rubrik som namn. */
const bildnamnen = async (docx) => [...(await (await JSZip.loadAsync(readFileSync(docx))).file('word/document.xml').async('string')).matchAll(/<wp:docPr\b[^>]*\bname=(?:"([^"]*)"|'([^']*)')/g)].map((m) => avkodaXml(m[1] ?? m[2]));
/**
 * Vilka sidor i materialet som hör till vilket blad, ur bildernas namn (K-734): bladets rubrik, eller rubriken följd av ett
 * mellanslag och något mer, som "Idékorten 1, sida 1". Den längsta rubriken som passar vinner, så att "Kortet till eleven 2"
 * hör till Kortet till eleven och inte till Kortet (Codex kodgranskning 2026-11-08). Svaret är sidornas index per blad, i
 * bladens ordning, eller null när en sida saknar blad, ett blad saknar sidor eller sidorna inte står i bladens ordning.
 */
function sidornaPerBlad(namnen, bladen) {
  const bladet = namnen.map((n) => bladen.filter((r) => n === r || n.startsWith(`${r} `)).sort((a, b) => b.length - a.length)[0]);
  if (!namnen.length || !bladet.every(Boolean)) return null;
  const sidor = bladen.map((r) => bladet.flatMap((b, i) => (b === r ? [i] : [])));
  const iOrdning = sidor.every((x, i) => x.length && x.at(-1) - x[0] === x.length - 1 && (!i || x[0] === sidor[i - 1].at(-1) + 1));
  return iOrdning ? sidor : null;
}
// Provet åt båda hållen, innan något tas in: kopplingen, de långa rubrikerna och tecknen.
for (const [namnen, bladen, vantat] of [
  [['A', 'B 1', 'B 2', 'C'], ['A', 'B', 'C'], [[0], [1, 2], [3]]],
  [['Kortet', 'Kortet till eleven 1', 'Kortet till eleven 2'], ['Kortet', 'Kortet till eleven'], [[0], [1, 2]]],
  [['A 1', 'A 2', 'B'], ['A', 'B'], [[0, 1], [2]]],
  [['B', 'A'], ['A', 'B'], null],
  [['A', 'B', 'A'], ['A', 'B'], null],
  [['A', 'A'], ['A', 'B'], null],
  [['A', 'X'], ['A', 'B'], null],
  [['Ab'], ['A'], null],
  [[], ['A'], null],
]) if (JSON.stringify(sidornaPerBlad(namnen, bladen)) !== JSON.stringify(vantat)) { console.error(`metoderfiler: provet av sidornaPerBlad gav fel svar på ${JSON.stringify(namnen)}`); process.exit(1); }
if (avkodaXml('A &quot;B&quot; &#197;kortet &#xC4; &amp; &lt;&gt; &apos;') !== 'A "B" Åkortet Ä & <> \'') { console.error('metoderfiler: provet av avkodaXml gav fel svar'); process.exit(1); }
/** Kartan över materialets sidor som den skrivs till filen: metoderna i bokstavsordning, så att samma innehåll ger samma fil. */
const sidornasFil = () => `${JSON.stringify({ _om: 'Materialets sidor per blad i Metoder, när ett blad har flera sidor i ett material med flera blad, som Idékorten i Skriva för att lära. Skrivs av scripts/metoderfiler.mjs ur bildernas namn i riggens Word-fil, och läses av metodens sida och de små korten. bilder är numren på materialets sidbilder, <id>-materialet-<n>.png.', ...Object.fromEntries(Object.keys(materialetsSidor).filter((k) => k !== '_om').sort().map((k) => [k, materialetsSidor[k]])) }, null, 2)}\n`;
// Summan räknas med LF som radslut, som i riggen, så att en kopia med CRLF ger samma summa.
const sha = (f) => createHash('sha256').update(readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
const fel = [];
const varningar = [];
// Riggens pdf:er packas när de tas in (K-759): ritningen rundas i papperets punkter och bilderna läggs som palett med samma
// bildpunkter (scripts/pdfpack.py --palett, DRIFT.md under Krediter). Genomgången 2026-11-10: 22,3 blev 18,7 MB, och sidorna
// var desamma i 600 dpi. Alla tar en dryg minut, så den packade filen sparas i node_modules/.cache/metoderfiler/packade/
// med ett namn ur riggens fil och packningen, som inte committas, och kopieras därifrån varje gång som riggens fil förut.
const PACKADE = join(ROT, 'node_modules', '.cache', 'metoderfiler', 'packade');
const PACKAREN = readFileSync(join(ROT, 'scripts', 'pdfpack.py'));
const anvanda = new Set();
function taIn(kalla, mal) {
  if (!mal.endsWith('.pdf')) return copyFileSync(kalla, mal);
  const namn = `${createHash('sha256').update(readFileSync(kalla)).update(PACKAREN).digest('hex').slice(0, 32)}.pdf`;
  const packad = join(PACKADE, namn);
  anvanda.add(namn);
  if (!existsSync(packad)) {
    mkdirSync(PACKADE, { recursive: true });
    const r = spawnSync('python', [join(ROT, 'scripts', 'pdfpack.py'), '--palett', kalla, `${packad}.tmp`], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`packningen av ${mal}: ${r.stderr}`);
    renameSync(`${packad}.tmp`, packad);
  }
  copyFileSync(packad, mal);
}
mkdirSync(UT, { recursive: true });

// Sidorna i en pdf som text, en post per sida.
const sidorna = (pdf) => spawnSync('pdftotext', ['-enc', 'UTF-8', '-layout', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).stdout.split('\f');
// Klipper sidorna fran..till (1-baserat, med båda) ur en pdf med pikepdf.
const klipp = (pdf, fran, till, ut) => {
  const r = spawnSync('python', ['-I', '-c', `import pikepdf,sys\nsrc=pikepdf.open(sys.argv[1])\nny=pikepdf.new()\nfor i in range(int(sys.argv[2])-1,int(sys.argv[3])): ny.pages.append(src.pages[i])\nny.save(sys.argv[4], deterministic_id=True)`, pdf, String(fran), String(till), ut], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`klippet ${ut}: ${r.stderr}`);
};
// Bilderna av sidorna, 420 punkter breda, som palett-PNG, från sidan fran (materialets blad, utan textsidan före dem).
const bilder = async (pdf, stam, fran = 1) => {
  for (const f of readdirSync(UT)) if (f.startsWith(`${stam}-`) && /-\d+\.png$/.test(f)) rmSync(join(UT, f));
  const tmp = join(ROT, 'node_modules', '.cache', 'metoderfiler');
  mkdirSync(tmp, { recursive: true });
  spawnSync('pdftoppm', ['-png', '-r', '72', '-f', String(fran), pdf, join(tmp, 'sida')]);
  const sidor = readdirSync(tmp).filter((f) => f.startsWith('sida')).sort();
  for (const [i, f] of sidor.entries()) {
    await sharp(join(tmp, f)).resize({ width: 840 }).png({ compressionLevel: 9, palette: true, colours: 96 }).toFile(join(UT, `${stam}-${i + 1}.png`));
    rmSync(join(tmp, f));
  }
  return sidor.length;
};

for (const fil of readdirSync(MAPP).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))) {
  const id = fil.replace(/\.yaml$/, '');
  const d = parse(readFileSync(join(MAPP, fil), 'utf8'));
  const ut = join(RIGG, 'out', id);
  const metodensSha = sha(join(MAPP, fil));
  const forteckning = join(ut, 'filer.json');
  const filer = []; // { slag, kalla, typ }
  // Dokumenten som riggen har byggt ur en annan metodfil än sajtens, som [namnet, summan] (K-740).
  const avvikande = [];
  if (existsSync(forteckning)) {
    const f = JSON.parse(readFileSync(forteckning, 'utf8'));
    // Riggens filer står i out/<id>/, och lektionskortet i out/material/lektionskort-<id>/.
    const hitta = (namn) => [join(ut, namn), join(RIGG, 'out', 'material', `lektionskort-${id}`, namn)].find((x) => existsSync(x));
    for (const post of f.filer ?? []) {
      const vantar = VANTAR.find((v) => v.id === id && v.slag === post.slag);
      if (vantar) { varningar.push(`${id}: ${post.namn} tas inte in: ${vantar.skal}`); continue; }
      const yamlSha = post.metodSha256 ?? f.metodSha256;
      if (yamlSha !== metodensSha) avvikande.push([post.namn, String(yamlSha)]);
      // Lathundens pdf är sajtens, gjord av PowerPoint ur sajtens PowerPoint-fil (scripts/lathund-pdf.mjs, K-637), så riggens
      // tas inte in; riggens Word-lathund tas in som förut.
      // En fri tabell med egen fil, som Grovplaneringen i Testbaserat lärande (K-684), står med slag tabell och tabellens
      // rubrik, och heter <id>-tabell-<rubrik> som i Stödundervisning (tabellensStam i src/lib/undervisningsmetodfiler.ts).
      let slag = post.slag;
      if (slag === 'tabell') {
        if (!(d.tabeller ?? []).some((t) => t.rubrik === post.rubrik)) { fel.push(`${id}: ${post.namn} hör till tabellen "${post.rubrik}", som metoden inte har`); continue; }
        slag = `tabell-${slugAv(post.rubrik)}`;
      }
      for (const namn of [post.namn, post.slag === 'lathund' ? undefined : post.pdf].filter(Boolean)) {
        const kalla = hitta(namn);
        if (!kalla) { fel.push(`${id}: ${namn} saknas hos riggen`); continue; }
        filer.push({ slag, kalla, typ: namn.split('.').pop() });
      }
    }
  } else {
    varningar.push(`${id}: riggens förteckning out/${id}/filer.json saknas, så filerna tas efter namnen och kontrollen mot metodfilen saknas`);
    const t = d.titel;
    for (const [slag, namn] of [['allt', `${t}`], ['lathund', `${t} - Att komma igång`]]) for (const typ of slag === 'lathund' ? ['docx'] : ['pdf', 'docx']) if (existsSync(join(ut, `${namn}.${typ}`))) filer.push({ slag, kalla: join(ut, `${namn}.${typ}`), typ });
    const kort = join(RIGG, 'out', 'material', `lektionskort-${id}`);
    for (const typ of ['pdf', 'docx']) if (existsSync(join(kort, `Lektionskort - ${t}.${typ}`))) filer.push({ slag: 'lektionskort', kalla: join(kort, `Lektionskort - ${t}.${typ}`), typ });
  }
  // En metod vars dokument riggen har byggt ur en annan metodfil får ingenting skrivet, varken dokument, blad, bilder eller filmer
  // (K-740, 2026-11-08: en validering som stannade på summan lämnade riggens nya filer i public/metoder). Har sajten inte ändrat
  // metodens fil sedan senaste commit arbetar riggen med en ny version, som omtaget av Lärande på kognitionsvetenskaplig grund
  // samma kväll, och sajten behåller sina filer, som valideringen prövade när de committades, med en varning. Har sajten ändrat
  // filen är intaget halvt, och skriptet stannar. Sajtens filer prövas då som med --kontrollera.
  const sajtensFil = `src/content/undervisningsmetoder/${fil}`;
  const oforandrad = avvikande.length > 0 && spawnSync('git', ['ls-files', '--error-unmatch', sajtensFil], { cwd: ROT }).status === 0 && spawnSync('git', ['diff', '--quiet', 'HEAD', '--', sajtensFil], { cwd: ROT }).status === 0;
  if (oforandrad) varningar.push(`${id}: riggen har byggt nyare dokument ur metodfilen ${avvikande[0][1].slice(0, 8)}, och sajtens fil är ${metodensSha.slice(0, 8)}, oförändrad sedan senaste commit. Sajten behåller sina filer tills riggens leverans tas in`);
  else for (const [namn, summan] of avvikande) fel.push(`${id}: ${namn} är byggd ur en annan metodfil än sajtens (${summan.slice(0, 8)} mot ${metodensSha.slice(0, 8)}). Kopiera riggens metod.yaml eller be riggen bygga om.`);
  const lasEndast = kontrollera || avvikande.length > 0;
  const stam = (slag) => (slag === 'allt' ? id : `${id}-${slag}`);
  if (!lasEndast) {
    // En tabells fil som riggen inte längre lämnar tas bort, som bladen nedan.
    for (const f of readdirSync(UT).filter((x) => x.startsWith(`${id}-tabell-`) && !filer.some((y) => x === `${stam(y.slag)}.${y.typ}`))) rmSync(join(UT, f));
    for (const f of filer) taIn(f.kalla, join(UT, `${stam(f.slag)}.${f.typ}`));
  }

  // Bladen i Materialet för klassen: ett blad per sida, i metodens ordning, sist i materialets pdf. En textsida före dem,
  // med materialets rubrik överst (riggens leverans 2026-10-30: "Materialet för klassen. Utöver lektionskortet …"), hör inte
  // till bladen. forstaBladet är bladens första sida, eller 0 när sidorna inte går ihop med bladen.
  const bladen = (d.ramar?.ramar ?? []).map((r) => r.rubrik).filter(Boolean);
  const material = join(UT, `${stam('materialet')}.pdf`);
  let forstaBladet = 0;
  // Ett enda blad kan ha flera sidor, som Strategikorten i Reciprok undervisning, två A4 fram och bak. Då är sistaSidan satt.
  let sistaSidan = 0;
  // Ett blad kan också ha flera sidor när materialet har flera blad, som Idékorten i Skriva för att lära, sex sidor fram och bak.
  // Då säger bildernas namn i materialets Word-fil vilket blad varje sida hör till: bladets rubrik, eller rubriken följd av
  // mellanslag och sidans nummer ("Idékorten 1, sida 1"). delarna är bladens sidor i pdf:en och bildernas nummer.
  let delarna = null;
  let kopplingenFoll = false;
  if (!lasEndast && bladen.length && existsSync(material)) {
    const s = sidorna(material);
    const fore = s.length - 1 - bladen.length;
    const textsida = (t) => t.split(/\r?\n/).slice(0, 4).some((rad) => rad.trim() === (d.ramar?.rubrik ?? 'Materialet för klassen'));
    if (fore === 0) forstaBladet = 1;
    else if (fore === 1 && textsida(s[0])) forstaBladet = 2;
    else if (bladen.length === 1 && fore > 0) { forstaBladet = textsida(s[0]) ? 2 : 1; sistaSidan = s.length - 1; }
    else {
      const docx = join(UT, `${stam('materialet')}.docx`);
      const forsta = textsida(s[0]) ? 2 : 1;
      const namnen = existsSync(docx) ? await bildnamnen(docx) : [];
      // Varje sida hör till ett blad, varje blad har sidor, och sidorna står i bladens ordning utan glapp (sidornaPerBlad).
      const sidor = namnen.length === s.length - forsta ? sidornaPerBlad(namnen, bladen) : null;
      if (sidor) {
        forstaBladet = forsta;
        delarna = bladen.map((r, i) => ({ blad: r, fran: forsta + sidor[i][0], till: forsta + sidor[i].at(-1), bilder: sidor[i].map((x) => x + 1) }));
      } else {
        // Sidan skulle annars visa fel bilder vid bladen, och gamla bladfiler skulle stå kvar bredvid nya bilder (Codex
        // kodgranskning 2026-11-08, fynd 2), så intaget stannar och lämnar metodens karta, bilder och blad som de var.
        kopplingenFoll = true;
        fel.push(`${id}: materialets pdf har ${s.length - 1} sidor och metoden ${bladen.length} blad, och bildernas namn i ${existsSync(docx) ? 'materialets Word-fil' : 'materialets Word-fil, som saknas,'} säger inte vilket blad varje sida hör till. Riggen ger varje sida bladets rubrik som namn, eller rubriken följd av ett mellanslag och sidans nummer (METODER.md, raden Ett blad med flera sidor)`);
      }
    }
  }
  if (!lasEndast && bladen.length && !kopplingenFoll) {
    // Bara metoder där ett blad har flera sidor bredvid andra blad står i filen; för de andra är sidan bladets nummer.
    const forut = JSON.stringify(materialetsSidor[id] ?? null);
    if (delarna && delarna.some((x) => x.bilder.length > 1)) materialetsSidor[id] = delarna.map(({ blad, bilder }) => ({ blad, bilder }));
    else delete materialetsSidor[id];
    if (JSON.stringify(materialetsSidor[id] ?? null) !== forut) writeFileSync(SIDORNA, sidornasFil());
  }

  // Med --kontrollera, som i Netlifys bygge utan riggen och utan pdftotext, prövas kartan mot bildernas namn i sajtens kopia av
  // materialets Word-fil, och att varje bild i kartan finns (Codex kodgranskning 2026-11-08, fynd 5).
  if (lasEndast && materialetsSidor[id]) {
    const docx = join(UT, `${stam('materialet')}.docx`);
    const sidor = existsSync(docx) ? sidornaPerBlad(await bildnamnen(docx), bladen) : null;
    const vantat = sidor ? bladen.map((blad, i) => ({ blad, bilder: sidor[i].map((x) => x + 1) })) : null;
    if (JSON.stringify(vantat) !== JSON.stringify(materialetsSidor[id])) fel.push(`${id}: src/data/materialets-sidor.json stämmer inte med bildernas namn i public/metoder/${stam('materialet')}.docx. Kör node scripts/metoderfiler.mjs`);
    for (const n of materialetsSidor[id].flatMap((x) => x.bilder)) if (!existsSync(join(UT, `${stam('materialet')}-${n}.png`))) fel.push(`${id}: bilden ${stam('materialet')}-${n}.png, som src/data/materialets-sidor.json nämner, saknas i public/metoder/`);
  }
  // Och åt andra hållet: säger namnen att ett blad har flera sidor, behövs kartan, och utan den visar sidan en bild per blad
  // (Codex kodgranskning 2026-11-08, andra omgången, fynd 2).
  if (lasEndast && bladen.length > 1 && !materialetsSidor[id]) {
    const docx = join(UT, `${stam('materialet')}.docx`);
    const sidor = existsSync(docx) ? sidornaPerBlad(await bildnamnen(docx), bladen) : null;
    if (sidor?.some((x) => x.length > 1)) fel.push(`${id}: bildernas namn i public/metoder/${stam('materialet')}.docx säger att ${bladen.filter((_, i) => sidor[i].length > 1).join(', ')} har flera sidor, men src/data/materialets-sidor.json saknar metoden. Kör node scripts/metoderfiler.mjs`);
  }

  // Bladen som riggen inte har lämnat som egna filer klipps ur pdf:en med allt, efter rubrikerna på sidorna.
  const allt = join(UT, `${id}.pdf`);
  const har = new Set(filer.filter((f) => f.typ === 'pdf').map((f) => f.slag));
  if (!lasEndast && existsSync(allt)) {
    const s = sidorna(allt);
    const forsta = (re, fran = 0) => s.findIndex((x, i) => i >= fran && re.test(x));
    const pl = forsta(/^\s*Planering · /m);
    const ob = forsta(/^\s*Observation av en lektion/m);
    const b = forsta(/^\s*B\s+Valet och forskningen/m);
    const a = forsta(/^\s*A\s+Att skriva ut/m);
    const ref = forsta(/^\s*Forskningen bakom/m);
    const las = forsta(/^\s*Läs mer\s*$/m, ref);
    const klippen = [
      ['materialet', a + 1, pl - 1],
      ['planeringsmall', pl, ob - 1],
      ['observation', ob, b - 1],
      ['referensblad', ref, las > ref ? las - 1 : ref],
    ];
    for (const [slag, fran, till] of klippen) {
      if (har.has(slag)) continue;
      if (fran < 0 || till < fran) { varningar.push(`${id}: ${slag} hittades inte i pdf:en med allt`); continue; }
      // Sidor med bara en rad eller två (en tom baksida) tas inte med.
      let slut = till;
      while (slut > fran && s[slut].replace(/\s+/g, ' ').trim().length < 60) slut--;
      klipp(allt, fran + 1, slut + 1, join(UT, `${stam(slag)}.pdf`));
      varningar.push(`${id}: ${slag} klippt ur pdf:en med allt, sidorna ${fran + 1}–${slut + 1}, tills riggen lämnar den som egen fil`);
    }
    for (const slag of ['lektionskort', 'planeringsmall', 'observation', 'materialet']) {
      const pdf = join(UT, `${stam(slag)}.pdf`);
      if (slag === 'materialet' && kopplingenFoll) continue;
      if (existsSync(pdf)) console.log(`metoderfiler: ${id}, ${slag}: ${await bilder(pdf, stam(slag), slag === 'materialet' ? forstaBladet || 1 : 1)} bilder`);
    }
  }

  // Bladen i Materialet för klassen, var och en som egen pdf, <id>-blad-<namn>.pdf (src/lib/undervisningsmetodfiler.ts),
  // så att knappen under ett blad skriver ut just det bladet (STIL.md under Hänvisningar: en bestämd sak har en knapp).
  // Sidorna är bladens sidor ovan; går de inte ihop klipps inget, och skriptet har sagt det. Riggen kan lämna bladen som egna
  // filer i stället, och då tas de in som de andra.
  const bladfil = (namn) => `${id}-blad-${slugAv(namn)}.pdf`;
  if (!lasEndast && !kopplingenFoll) {
    for (const f of readdirSync(UT).filter((x) => x.startsWith(`${id}-blad-`) && x.endsWith('.pdf') && !bladen.some((n) => bladfil(n) === x))) rmSync(join(UT, f));
    if (forstaBladet) bladen.forEach((namn, i) => { if (!filer.some((f) => f.slag === `blad-${slugAv(namn)}`)) klipp(material, delarna ? delarna[i].fran : forstaBladet + i, delarna ? delarna[i].till : sistaSidan || forstaBladet + i, join(UT, bladfil(namn))); });
    // Ett blad med flera sidor skrivs ut dubbelsidigt, och en textsida först skulle lägga baksidorna fel (andra ögat på
    // Reciprok undervisning 2026-11-07). Materialets pdf på sajten är därför bladets sidor, och texten står på metodens sida.
    if (sistaSidan) copyFileSync(join(UT, bladfil(bladen[0])), material);
  }

  // Filmerna: riggens svg-filer med sajtens namn, som i Stödundervisning, en för huvudfilmen och en för varje extrafilm i
  // metodens fil (metodensFilmnamn i standarden, som leveransprovet läser).
  for (const namn of metodensFilmnamn(d)) {
    for (const ext of ['', '-1', '-2', '-3', '-4']) {
      // Med --kontrollera, som i Netlifys bygge utan riggen, prövas sajtens kopia.
      const k = lasEndast ? join(UT, `${id}-${namn}${ext}.svg`) : join(ut, `${namn}${ext}.svg`);
      if (!existsSync(k)) { fel.push(`${id}: ${lasEndast ? `${id}-${namn}${ext}.svg saknas i public/metoder/` : `${namn}${ext}.svg saknas hos riggen`}`); continue; }
      if (!lasEndast) copyFileSync(k, join(UT, `${id}-${namn}${ext}.svg`));
    }
  }
  for (const slag of ['allt', 'lektionskort'].filter((s) => !VANTAR.some((v) => v.id === id && v.slag === s))) if (!existsSync(join(UT, `${stam(slag)}.pdf`))) fel.push(`${id}: ${slag} saknas i public/metoder/`);
  if (d.lathund && !existsSync(join(UT, `${stam('lathund')}.docx`))) fel.push(`${id}: Word-lathunden saknas i public/metoder/`);
  // Allt som laddas ner bär © Niclas Fohlin och niclasfohlin.se, på varje sida (CLAUDE.md under Innehållstyperna; Niclas
  // 2026-10-30: "Hör även allt (C) Niclas Fohlin som ska ha det likt stödundervisning?"). Raden läses med Popplers pdftotext,
  // som Netlifys byggmiljö saknar, så den prövas i npm run validera och inte med --kontrollera (det första bygget av main med
  // Metoder 2026-10-31 stannade på det).
  if (!kontrollera) for (const f of readdirSync(UT).filter((x) => x.startsWith(id) && x.endsWith('.pdf'))) {
    const utan = sidorna(join(UT, f)).map((t, i) => ({ t, i })).filter(({ t }) => t.trim() && !(t.includes('© Niclas Fohlin') && t.includes('niclasfohlin.se'))).map(({ i }) => i + 1);
    if (utan.length) fel.push(`${id}: ${f} saknar "© Niclas Fohlin" och niclasfohlin.se på sidan ${utan.slice(0, 8).join(', ')}${utan.length > 8 ? ' …' : ''}. Riggen sätter raden i sidfoten på varje sida`);
  }
}

// En metod som inte längre finns står inte kvar i kartan över materialets sidor, och med --kontrollera stannar en sådan rad.
const metoderna = new Set(readdirSync(MAPP).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => f.replace(/\.yaml$/, '')));
const kvar = Object.keys(materialetsSidor).filter((k) => k !== '_om' && !metoderna.has(k));
if (kvar.length && kontrollera) fel.push(`src/data/materialets-sidor.json har ${kvar.join(', ')}, som inte är metoder i src/content/undervisningsmetoder/. Kör node scripts/metoderfiler.mjs`);
else if (kvar.length) { for (const k of kvar) delete materialetsSidor[k]; writeFileSync(SIDORNA, sidornasFil()); }

// En packad fil som ingen av riggens filer längre ger tas bort, så att cachen inte växer med varje leverans.
if (!kontrollera && !fel.length && existsSync(PACKADE)) for (const f of readdirSync(PACKADE)) if (!anvanda.has(f)) rmSync(join(PACKADE, f));
for (const v of varningar) console.log(`! ${v}`);
if (fel.length) { console.error(fel.map((f) => `metoderfiler: ${f}`).join('\n')); process.exit(1); }
console.log('metoderfiler: klart');
