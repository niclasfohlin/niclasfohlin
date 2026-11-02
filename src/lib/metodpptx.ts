// Lathunden som PowerPoint: fyra bilder i 16:9, kant till kant, ur samma data som sidan
// (src/components/Lathund.astro) och Word-filen (src/lib/metoddocx.ts). Bild 1 Metoden, 2 Ett pass,
// 3 Mallen, 4 Material. Layouten kommer från Niclas snabbguide (Kungsholmens insatsspår) via
// metodriggen, i sajtens palett. Innehållet är data i metoden; designen är låst här. Ryms text inte
// krymper den ett steg och sedan varnas det i bygget: korta texten i metoden, ändra inte här.
//
// Före de fyra står filmbilden (Niclas 2026-10-07): metodens filmer, högst tre, som mp4 i bredd med filmens namn och
// dess fyra bildtexter under. Den heter Filmerna och har inget nummer: lathundens bilder räknas 1/4 till 4/4 i varje
// fil, eftersom metodernas texter hänvisar till lathundens sidor med nummer (src/lib/lathundsidor.ts). Filmbilden finns
// bara i 16:9-filen; pdf:en i A4 är lathundens fyra sidor för utskrift. Mp4-filerna görs ur svg-filmerna av
// scripts/filmmp4.mjs, och filmernas uppspelning sätts efteråt i filen (src/lib/filmfil.ts).
//
// Två format ur samma layout (Niclas 2026-09-27: "Pptx kan vara 16:9. De andra filerna är A4"): PowerPoint-filen
// är 16:9 och lathundens pdf A4 liggande (src/pages/utskrift/lathund/[id].pptx.ts, gjord till pdf av
// scripts/lathund-pdf.mjs). Layouten ritas i 16:9-måtten och primitiverna för över den till sidan (x och bredd
// gånger sx, y och höjd gånger sy) med oförändrade teckengrader, så att A4-sidan fyller arket och texten skrivs
// ut i full storlek i stället för 85 procent. Textuppskattningen räknar med den verkliga bredden, så att tabeller
// och rutor fördelar höjden rätt också i A4.
//
// Undervisningsmetodernas lathund under Metoder (K-637) ritas med samma byggstenar, samma filmbild och samma två
// format: lathundensVerktyg, filmbilden och lathundensFil nedan, och sidorna ur standarden längst ned (METODER).
import { readFileSync } from 'node:fs';
import { snabbFalt } from './snabbmall';
import PptxGenJS from 'pptxgenjs';
import type { CollectionEntry } from 'astro:content';
import { FILM_UPPHOV, filmNamn, metodensFilmer, type MetodFilm } from './film';
import { filmbildensUppspelning, mp4Fil, omslagFil, provaFilmfiler } from './filmfil';
import { filmbildNamn, sidetikett, umLathundHuvud, umLathundSpalter, UM_MINUTERNAS_KOLUMNER } from './lathundsidor';
import TECKENBREDD from '../data/teckenbredd.json';
import { lathundFakta, arbetsformRad, etikettOchText, lathundForm, passOrd, passTextKort } from './metod';
import type { MetodData } from './metod';
import { lathundensSidor, utanRadbrytning, UTFALLEN, type LathundDel, type LathundFakta, type LathundSida } from './standard/index.js';
import { bladetsOrd, bladetsLista, bladetsRad, planensAmne, metodensAdress, planeringsbladet, utfalletsGrans, type Um } from './undervisningsmetod';

export const PPTX_TYP = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// Paletten ur src/styles/global.css och lathundens sida: band i accentblått, mörka rutrubriker,
// cremefärgade noter. Typsnitt utan inbäddning: Calibri och Consolas finns där PowerPoint finns.
const NAVY = '1d4f91', INK = '14202b', GREY = '4b5866', LINE = 'e1e6eb', BAND = 'f3f6fa', CELL = 'f8fafc';
const AMBER = '8a5a1e', CREAM = 'fbf3e4', WHITE = 'ffffff', GRON = '2E7D32', ROD = 'B3261E';
const SANS = 'Calibri', MONO = 'Consolas';
const W = 13.333, H = 7.5;
// Sidfoten med upphovet tar de nedersta 0.22 tum på varje bild; innehållet slutar ovanför.
const BOTTEN = H - 0.22;
// Strecket mellan spalterna står mitt på sidan på bild 1, som mallsidans två lika spalter, lathunden på sajten och
// Word-lathunden (Niclas 2026-09-29: på bild 1 var vänsterspalten smalare än den högra, och texten trängdes mot rutan).
// Texten står 0,16 tum från strecket och rutorna 0,31 tum från det, på båda sidor. Bild 2 och 4 har kvar sina gamla
// delningar, eftersom den bredare spalten där behöver bredden: tidsschemat på bild 2, som läraren läser under passet, och
// vänsterspaltens text och rutan På bordet på bild 4 (i mitten krympte tidsschemat och trängdes rutan).
const MITT = W / 2;
const V_X = 0.46, V_BREDD = MITT - 0.01 - 0.16 - V_X, V_RUTA = MITT - 0.01 - 0.31 - V_X;
const H_X = MITT + 0.01 + 0.31, H_BREDD = W - 0.46 - H_X;
export type LathundFormat = '16:9' | 'A4';
const SIDA: Record<LathundFormat, { w: number; h: number }> = { '16:9': { w: W, h: H }, A4: { w: 297 / 25.4, h: 210 / 25.4 } };

type Punkt = { fet?: string; text?: string };
const punktText = (p: Punkt) => (p.fet ? `**${p.fet}** ${p.text ?? ''}`.trim() : p.text ?? '');
const citat = (f: string) => `”${f}”`;
const versaler = (s: string) => s.toUpperCase();

// Bilddata: vad varje bild innehåller, ur metoden. Samma översättning som metodriggens tillPptx.
function bilder(d: MetodData) {
  const l = d.lathund!;
  const bild1 = {
    titel: d.titel,
    band: lathundFakta(d).map((f) => [versaler(f.rubrik), f.text] as [string, string]),
    introRubrik: 'SÅ FUNGERAR INSATSEN',
    intro: l.metoden.text,
    treRubrik: versaler(l.metoden.ruta.rubrik),
    tre: [
      ...(l.metoden.ruta.inledning ? [((e) => (e.etikett ? `**${e.etikett}** ${e.text}` : e.text))(etikettOchText(l.metoden.ruta.inledning))] : []),
      ...l.metoden.ruta.punkter.map(punktText),
      ...(l.metoden.ruta.efter ? [l.metoden.ruta.efter] : []),
    ],
    arbetsform: arbetsformRad(d),
    stegRubrik: versaler(l.metoden.tabell.rubrik),
    // Kolumnrubrikerna ur metoden, som på sidan och i Word: Steg och Exempelfraser, Frågetyp och Exempel, Del (K-064).
    stegKolumner: [versaler(l.metoden.tabell.kolumner[0] ?? ''), versaler(l.metoden.tabell.kolumner[1] ?? '')],
    steg: l.metoden.tabell.rader.map((r) => {
      const [namn, ...under] = r[0].split('\n');
      return { namn, under: under.join(' '), fraser: r.slice(1).join('\n').split('\n').filter(Boolean) };
    }),
    ruta: l.metoden.not,
    anteckning: `${d.titel}, metoden. ${d.ingress}`,
  };
  const bild2 = {
    titel: l.pass.rubrik,
    grupp: versaler(l.pass.textRubrik),
    exempel: [...(l.pass.titel ? [l.pass.titel] : []), ...l.pass.text],
    // Passexemplets titel står fet, som på lathundssidan och i Word (K-390; förut mager i PowerPoint och pdf:en).
    exempelTitel: !!l.pass.titel,
    repliker: (l.pass.repliker ?? []).map(citat),
    forberett: l.pass.forberett ? l.pass.forberett.text.join(' ') : undefined,
    // Rutans rubrik ur metoden, som på lathundssidan och i Word (K-075; förut fast DET JAG FÖRBEREDDE).
    forberettRubrik: versaler(l.pass.forberett?.rubrik ?? 'Det jag förberedde'),
    klarTidigt: l.pass.klarTidigt,
    schemaRubrik: versaler(l.pass.schema.rubrik),
    schemaKolumner: l.pass.schema.kolumner.map(versaler),
    schema: l.pass.schema.rader.map((r) => ({ tid: r.tid, fas: r.fas, text: r.vad + (r.fraser.length ? ' ' + r.fraser.map(citat).join(' · ') : '') })),
    anteckning: `${d.titel}, ett pass ${passOrd(d).forSteg} med ett exempel.`,
  };
  // Bild 3, mallen. Underraden delas: det med skrivlinjer (Elev: ______) till höger, resten till vänster.
  const delar = (l.mall.underrad ?? '').split(' · ');
  const hoger = delar.filter((x) => /_{3,}/.test(x));
  const vanster = delar.filter((x) => !/_{3,}/.test(x));
  // Snabbmallens Före och Efter, med kolumnernas namn (snabbFalt i src/lib/snabbmall.ts, som riggens lathund).
  const block: any[] = l.mall.block.map((x) => (x.typ === 'snabbmall' ? { typ: 'snabbmall', rubrik: `SNABBMALL · ${d.titel}`, ...snabbFalt(d.snabbmall!) } : x));
  let bild3: any = { titel: l.mall.rubrik, bandVanster: versaler(vanster.join(' · ')), bandHoger: versaler(hoger.join('  ')), anteckning: `${d.titel}, mallen som används under passet.` };
  const tomTabell = block.find((x) => x.typ === 'tabell' && x.rader.every((r: string[]) => r.every((c) => !c.trim())));
  const snabb = block.find((x) => x.typ === 'snabbmall');
  if (tomTabell && snabb) {
    // Schema att fylla i till vänster och snabbmallen till höger, som TIL:s lässchema.
    const i = block.indexOf(tomTabell);
    const not = block[i + 1]?.typ === 'not' ? block[i + 1].text : undefined;
    const sista = block[block.length - 1];
    bild3 = {
      ...bild3, typ: 'schema',
      tabell: { kolumner: tomTabell.kolumner.map((k: string) => [versaler(k), Math.max(1.1, Math.min(2.6, 0.13 * k.length + 0.6))]), rader: tomTabell.rader.length + 1, not },
      formular: { rubrik: versaler(snabb.rubrik), sektioner: [{ rubrik: 'FÖRE PASSET', falt: snabb.fore }, { rubrik: 'EFTER PASSET · KORT NOTERING', falt: snabb.efter }] },
      fot: sista.typ === 'not' && sista.text !== not ? { text: sista.text } : undefined,
    };
  } else if (tomTabell && block.filter((x) => x.typ !== 'not').length === 1) {
    // En enda tom tabell utan snabbmall är ett blad att lägga på bordet (talsortsmattan): varje kolumn
    // blir en hög ruta som fyller bilden, så att materialet ryms när bladet skrivs ut i A3, och noten blir foten.
    const i = block.indexOf(tomTabell);
    const not = block[i + 1]?.typ === 'not' ? block[i + 1].text : undefined;
    bild3 = { ...bild3, typ: 'matta', rubrik: tomTabell.rubrik, kolumner: tomTabell.kolumner, rader: Math.max(1, tomTabell.rader.length), fot: not ? { text: not } : undefined };
  } else if (lathundForm(l.mall).form === 'kort') {
    // En ifylld tabell som enda block är ett kort att ha på bordet (strategikortet): raderna stort över hela bilden,
    // som riggens listkort (K-061).
    const k = lathundForm(l.mall);
    bild3 = { ...bild3, typ: 'lista', rubrik: k.tabell!.rubrik, kolumner: k.tabell!.kolumner, rader: k.tabell!.rader, fot: k.not ? { text: k.not } : undefined };
  } else {
    bild3 = { ...bild3, typ: 'block', block };
  }
  const bild4 = {
    titel: l.material.rubrik,
    krav: d.urval ? d.urval.krav.map((k, i) => [`${versaler(l.material.kravEtikett)} ${i + 1}`, k.rubrik, k.text] as [string, string, string]) : [],
    kallorRubrik: versaler(l.material.var.rubrik),
    kallor: l.material.var.punkter.map(punktText),
    kallorEfter: l.material.var.efter,
    bord: l.material.bordet,
    checklista: d.checklista?.punkter ?? [],
    // Rubriken ur metoden, som på sidan och i Word: Skrivkurs: sagoboken heter Checklista inför kursen (K-173).
    checklistaRubrik: versaler(d.checklista?.rubrik ?? 'Checklista inför passet'),
    uppfoljning: [
      ...(l.material.uppfoljning ?? d.uppfoljning?.rader ?? []).map((r) => `**${r.nar}:** ${r.vad}`),
      ...(l.material.varjePass ? [`**Varje pass:** ${l.material.varjePass}`] : []),
    ],
    anteckning: `${d.titel}, materialet: krav, var det finns, vad som ligger på bordet, checklistan och uppföljningen.`,
  };
  return { bild1, bild2, bild3, bild4 };
}

// Antalet rader en text tar i Calibri i en bredd i tum, när PowerPoint bryter vid mellanslag: typsnittets egna
// teckenbredder (src/data/teckenbredd.json, samma som Word-filerna räknar med), med tre procents marginal. Filmbilden
// räknar så, eftersom filmens namn och bildtexter står i smala spalter där en grov uppskattning ger en rad för mycket.
const TECKENINDEX = new Map([...TECKENBREDD.tecken].map((c, i) => [c, i]));
/** En texts bredd i punkter i Calibri, med typsnittets egna teckenbredder. */
function calibriPunkter(text: string, punkter: number, fet = false): number {
  const tabell = (TECKENBREDD.bredd as Record<string, (number | null)[]>)[fet ? 'Calibri fet' : 'Calibri'];
  // Det hårda bindestrecket (utanRadbrytning i standarden) är lika brett som bindestrecket.
  return [...text].reduce((s, c) => s + (tabell[TECKENINDEX.get(c === '\u2011' ? '-' : c) ?? -1] ?? 600) / 1000, 0) * punkter;
}
function calibriRader(text: string, tum: number, punkter: number, fet = false): number {
  const bredd = (ord: string) => calibriPunkter(ord, punkter, fet);
  const plats = tum * 72 * 0.97, mellan = bredd(' ');
  let rader = 1, x = 0;
  for (const ord of text.split(/\s+/).filter(Boolean)) {
    const w = bredd(ord);
    if (x && x + mellan + w > plats) { rader++; x = w; } else x += (x ? mellan : 0) + w;
  }
  return rader;
}

// A4-sidan är 88 procent så bred och 110 procent så hög som 16:9-bilden och rymmer lite mindre text. Den får därför
// den största teckengraden i stegen nedan där sidorna inte varnar för något som 16:9-bilderna inte varnar för, samma
// grad på alla fyra sidor. Metoder med luft skrivs ut i full storlek, täta krymper ett eller två steg.
const GRADER = [1, 0.97, 0.94, 0.91, 0.88];

/** Lathunden som pptx-buffert. bas: sajtens adress för upphovsraden; format: 16:9 (standard) eller A4 liggande. */
export async function lathundPptx(m: CollectionEntry<'stodundervisning'>, o: { bas: string; format?: LathundFormat }): Promise<Buffer> {
  // En underrad som inte ryms i bandet bryts, och linjen under bandet skär igenom den andra raden (TIL i grupp 2026-10-18).
  return lathundensFil(m.id, o.format ?? '16:9', m.data.uppdaterad ?? m.data.publicerad, (format, grad, medFilmer) => ritaLathund(m, o.bas, format, grad, medFilmer), (v) => v.startsWith('bild 3: underraden'));
}

/** Bilderna ritade i ett format: presentationen, varningarna och filmernas textalternativ i filmbildens ordning. */
type Ritad = { pres: any; varningar: string[]; filmer: string[] };

/**
 * Lathundens fil i formatet, för båda samlingarna (Stödundervisning och Metoder): bilderna ritas av rita, i 16:9 med
 * filmbilden först, och i A4 med den största teckengraden i GRADER där sidorna inte varnar för något som 16:9-bilderna inte
 * varnar för. Varningarna skrivs i bygget, och en varning som stopp säger är ett fel stoppar det. Filmbildens uppspelning
 * sätts efteråt, med datum som filens datum.
 */
async function lathundensFil(id: string, format: LathundFormat, datum: Date | undefined, rita: (format: LathundFormat, grad: number, medFilmer?: boolean) => Ritad, stopp?: (v: string) => boolean): Promise<Buffer> {
  let valt = rita('16:9', 1, format !== 'A4');
  if (format === 'A4') {
    const slag = (v: string) => v.replace(/\d+(?:[.,]\d+)?/g, '#');
    const tillatna = new Set(valt.varningar.map(slag));
    let vald = 0;
    for (const grad of GRADER) {
      vald = grad;
      valt = rita('A4', grad);
      if (valt.varningar.every((v) => tillatna.has(slag(v)))) break;
    }
    console.log(`  ${id}: lathunden i A4 med ${Math.round(vald * 100)} procent av teckengraden`);
  }
  for (const v of valt.varningar) console.warn(`  ! ${id}${format === 'A4' ? ' (A4)' : ''}: ${v}`);
  const band = stopp && valt.varningar.find(stopp);
  if (band) throw new Error(`${id}${format === 'A4' ? ' (A4)' : ''}: ${band}`);
  // Filen komprimeras: okomprimerad vägde lathunden 235 kB, komprimerad 32 kB (K-243, mätt på Ordverkstad i grupp).
  const buffert = (await valt.pres.write({ outputType: 'nodebuffer', compression: true })) as Buffer;
  return valt.filmer.length ? filmbildensUppspelning(buffert, 1, valt.filmer, datum) : buffert;
}

/** En tom presentation i formatet, med lathundens egenskaper. */
function nyPresentation(format: LathundFormat, titel: string, amne: string): any {
  const Pptx: any = (PptxGenJS as any).default ?? PptxGenJS;
  const pres = new Pptx();
  const sida = SIDA[format];
  if (format === '16:9') pres.layout = 'LAYOUT_WIDE';
  else { pres.defineLayout({ name: 'A4_LIGGANDE', width: sida.w, height: sida.h }); pres.layout = 'A4_LIGGANDE'; }
  pres.lang = 'sv-SE';
  pres.author = 'Niclas Fohlin';
  pres.company = 'niclasfohlin.se';
  pres.title = titel;
  pres.subject = amne;
  return pres;
}

// Ritar bilderna i formatet med teckengraden gånger grad och samlar varningarna: lathundens fyra, och i 16:9 filmbilden
// före dem. filmer är textalternativet för varje film på filmbilden, i bildens ordning; tom när filen inte har någon.
function ritaLathund(m: CollectionEntry<'stodundervisning'>, bas: string, format: LathundFormat, grad: number, medFilmer = true): Ritad {
  const o = { bas };
  const d = m.data;
  if (!d.lathund) throw new Error(`${m.id} har ingen lathund`);
  const L = bilder(d);
  // Filmbilden står först i 16:9-filen. medFilmer är falskt när bilderna bara ritas för att samla varningar.
  const filmer = format === '16:9' && medFilmer ? metodensFilmer(d, m.id) : [];
  const pres = nyPresentation(format, `Lathund: ${d.titel}`, d.ingress);
  const adress = `${o.bas.replace(/^https?:\/\//, '')}/stodundervisning/${m.id}/lathund`;
  const upphov = `© Niclas Fohlin · ${adress}`;
  const varningar: string[] = [];
  const varna = (t: string) => { varningar.push(t); };
  const v = lathundensVerktyg(pres, format, grad, upphov, varna);
  const { sx, sy, rect, frame, skalad, txt, label, rich, plain, estH, header, fot, band, darkBox, cream, shapeTable, gridTable, linjer, formular } = v;

  // Filmbilden står först (filmbilden nedan).
  if (filmer.length) filmbilden(pres, v, filmer, { titel: d.titel, adress, upphov });

  // ---------------------------------------------------------------- 1 METODEN
  {
    const b = L.bild1, s = pres.addSlide();
    header(s, b.titel, sidetikett('Metoden'));
    band(s, b.band);
    rect(s, MITT - 0.01, 1.48, 0.02, BOTTEN - 1.48, INK);
    label(s, b.introRubrik, V_X, 1.65, V_BREDD);
    // Rutan under intron är ritad för tre punkter. Fler punkter får mindre grad, och intron krymper ett steg innan det varnas.
    const treSize = b.tre.length > 4 ? 11.5 : 12.5;
    const treH = b.tre.map((t) => Math.max(b.tre.length > 4 ? 0.26 : 0.32, estH(t, V_RUTA - 0.26, treSize, b.tre.length > 4 ? 0.06 : 0.1)));
    const boxH = 0.45 + treH.reduce((a, x) => a + x, 0) + 0.05;
    const afH = b.arbetsform ? Math.max(0.6, estH(b.arbetsform, V_BREDD, 12, 0.1)) : 0;
    let introSize = 12.75;
    let introH = b.intro.reduce((a, p) => a + estH(p, V_BREDD, introSize, 0.12), 0);
    const nedre = BOTTEN - 0.05;
    let boxY = Math.min(Math.max(1.96 + introH + 0.15, 4.05), nedre - (b.arbetsform ? afH + 0.28 + 0.15 : 0) - boxH);
    if (1.96 + introH > boxY - 0.05) {
      introSize = 12;
      introH = b.intro.reduce((a, p) => a + estH(p, V_BREDD, introSize, 0.1), 0);
      boxY = Math.min(Math.max(1.96 + introH + 0.15, 4.05), nedre - (b.arbetsform ? afH + 0.28 + 0.15 : 0) - boxH);
    }
    if (1.96 + introH > boxY + 0.6) varna(`introtexten på bild 1 är lång (${b.intro.join(' ').split(' ').length} ord): korta lathund.metoden.text`);
    txt(s, b.intro.map((p, i) => ({ text: p, options: { breakLine: i < b.intro.length - 1 } })), V_X, 1.96, V_BREDD, boxY - 1.96 - 0.1, { size: introSize, psa: 8 });
    darkBox(s, b.treRubrik, V_X, boxY, V_RUTA, boxH);
    let ty = boxY + 0.42;
    b.tre.forEach((t, i) => { txt(s, rich(t), V_X + 0.15, ty, V_RUTA - 0.26, treH[i], { size: treSize }); ty += treH[i]; });
    if (b.arbetsform) {
      const afY = boxY + boxH + 0.15;
      label(s, 'ARBETSFORM', V_X, afY, V_BREDD);
      txt(s, b.arbetsform, V_X, afY + 0.28, V_BREDD, Math.max(0.3, nedre - afY - 0.28), { size: 12 });
    }
    label(s, b.stegRubrik, H_X, 1.65, H_BREDD);
    const rutaH = b.ruta ? Math.max(0.78, estH(b.ruta, H_BREDD - 0.46, 11.5, 0.3)) : 0;
    const tableAvail = BOTTEN - 1.96 - (b.ruta ? rutaH + 0.17 : 0);
    shapeTable(s, H_X, 1.96, H_BREDD, 1.75, b.stegKolumner, b.steg.map((st) => ({ namn: st.namn, under: st.under, rader: st.fraser, kursiv: true })), tableAvail);
    if (b.ruta) cream(s, H_X, BOTTEN - rutaH, H_BREDD, rutaH, b.ruta, 11.5);
    fot(s);
    s.addNotes(`${b.anteckning} ${upphov}`);
  }

  // ---------------------------------------------------------------- 2 ETT PASS
  {
    const b = L.bild2, s = pres.addSlide();
    header(s, b.titel, sidetikett('Ett pass'));
    rect(s, 0, 0.66, W, 0.02, INK); rect(s, 5.89, 0.68, 0.02, BOTTEN - 0.68, INK);
    const gruppLang = plain(b.grupp).length > 52;
    const gruppH = gruppLang ? 0.45 : 0.25;
    txt(s, b.grupp, 0.46, 0.88, 5.4, gruppH, { mono: true, size: gruppLang ? 10.5 : 12, color: AMBER });
    const top2 = 1.2 + (gruppLang ? 0.2 : 0);
    const c1H = b.forberett ? Math.max(1.0, estH(b.forberett, 4.7, 12, 0.35)) : 0, c2H = b.klarTidigt ? Math.max(0.8, estH(b.klarTidigt, 4.7, 12, 0.35)) : 0;
    const ledigt = BOTTEN - top2 - (c1H ? c1H + 0.15 : 0) - (c2H ? c2H + 0.15 : 0);
    // Lärarens repliker som pratbubblor under textrutan (lathund.pass.repliker). Raderna räknas med Calibris egna
    // teckenbredder, så att rutan och bubblorna får den höjd texten tar och ingen yta står tom.
    const kort = passTextKort({ text: b.exempel });
    const antalRader = (t: string, w: number, size: number) => calibriRader(plain(t), w * sx, size * grad);
    const radHojd = (size: number) => size * grad * 1.2 / 72 / sy;
    const BUBBLA = { x: 0.86, w: 4.6, size: 13, lucka: 0.16, luft: 0.2 };
    const bubbelH = (t: string) => antalRader(t, BUBBLA.w - 0.36, BUBBLA.size) * radHojd(BUBBLA.size) + BUBBLA.luft;
    const bubblorH = b.repliker.length ? 0.14 + 0.3 + b.repliker.reduce((a, t) => a + bubbelH(t) + BUBBLA.lucka, 0) : 0;
    // Textens höjd: ett berättat pass uppskattas som förut (tilltaget), en kort text räknas rad för rad.
    const exH = (size: number) => (kort
      ? b.exempel.reduce((a, p) => a + antalRader(p, 4.97, size) * radHojd(size), 0) + (b.exempel.length - 1) * 5 * grad / 72 / sy
      : b.exempel.reduce((a, p) => a + estH(p, 4.97, size, 0.07), 0));
    const forText = ledigt - bubblorH;
    // En kort text, som ett problem att läsa högt, står så stort som den ryms, högst 18 punkter (passTextKort i
    // metod.ts). Ett berättat pass på omkring 130 ord fyller rutan och står i 11,5 punkter som förut.
    let exGrad = 11.5;
    if (kort) for (let g = 18; g > 11.5; g -= 0.5) if (exH(g) + 0.26 <= forText) { exGrad = g; break; }
    if (b.repliker.length && exH(exGrad) + 0.26 > forText + 0.05) varna(`bild 2: replikerna och texten ryms inte i vänsterspalten (${(exH(exGrad) + 0.26 + bubblorH).toFixed(2)} > ${ledigt.toFixed(2)} tum): färre eller kortare repliker i lathund.pass.repliker`);
    // Med repliker sluter rutan om texten och bubblorna står under; utan dem fyller rutan det lediga, som förut.
    const storyH = b.repliker.length ? exH(exGrad) + 0.26 : ledigt;
    frame(s, 0.46, top2, 5.27, storyH, LINE, 0.75, CELL);
    const need = exH(exGrad);
    if (need > storyH + 0.1) varna(`exemplet på bild 2 är långt (${need.toFixed(2)} > ${(storyH - 0.2).toFixed(2)} tum): korta lathund.pass.text till cirka 130 ord`);
    // Exemplet berättas rakt och replikerna (”…”) kursiva, som på sidan, i lathunden och i Word.
    const repliker = (t: string, sist: boolean, fet = false) => t.split(/(”[^”]*”)/).filter(Boolean).map((x, j, alla) => ({ text: x, options: { italic: x.startsWith('”'), bold: fet || undefined, breakLine: !sist && j === alla.length - 1 } }));
    txt(s, b.exempel.flatMap((t, i) => repliker(t, i === b.exempel.length - 1, i === 0 && b.exempelTitel)), 0.61, top2 + 0.1, 4.97, storyH - 0.16, { size: exGrad, psa: 5 });
    if (b.repliker.length) {
      let by = top2 + storyH + 0.14;
      label(s, 'LÄRAREN SÄGER', 0.46, by, 5.27);
      by += 0.3;
      for (const t of b.repliker) {
        const h = bubbelH(t);
        s.addText(skalad(t), { shape: pres.ShapeType.wedgeRoundRectCallout, x: BUBBLA.x * sx, y: by * sy, w: BUBBLA.w * sx, h: h * sy, fill: { color: BAND }, line: { color: NAVY, width: 1 }, fontFace: SANS, fontSize: BUBBLA.size * grad, color: INK, valign: 'middle', align: 'left', margin: [3, 12, 3, 12], fit: 'none' });
        by += h + BUBBLA.lucka;
      }
    }
    let y = top2 + ledigt + 0.15;
    if (b.forberett) { cream(s, 0.46, y, 5.27, c1H, b.forberett, 12, b.forberettRubrik); y += c1H + 0.15; }
    if (b.klarTidigt) cream(s, 0.46, y, 5.27, c2H, b.klarTidigt, 12, 'KLAR TIDIGT');
    label(s, b.schemaRubrik, 6.22, 0.88, 6.9);
    // En kolumn med bara nummer (stegen när läraren tänker högt i Texttyper i grupp) är smal, så att replikerna får plats.
    shapeTable(s, 6.22, 1.2, 6.66, b.schema.every((r) => r.tid.trim().length <= 2) ? 0.85 : 1.45, b.schemaKolumner, b.schema.map((r) => ({ namn: r.tid, fet: r.fas, rader: [r.text] })), BOTTEN - 1.2);
    fot(s);
    s.addNotes(`${b.anteckning} ${upphov}`);
  }

  // ---------------------------------------------------------------- 3 MALLEN
  {
    const b = L.bild3, s = pres.addSlide();
    header(s, b.titel, sidetikett('Mallen'));
    rect(s, 0, 0.66, W, 0.44, BAND); rect(s, 0, 1.08, W, 0.02, INK);
    txt(s, b.bandVanster ?? '', 0.21, 0.76, 7.2, 0.25, { mono: true, size: 12, color: GREY });
    // Underraden står på en rad i bandet, och en längre bryts och klipps av bandet (riggens varning för sagoboken
    // 2026-10-02, K-168). Consolas är 0,55 gånger graden bred: 78 tecken i 16:9 och 68 i A4 i full storlek. En för lång
    // underrad stoppar bygget i den storlek som väljs (lathundPptx): TIL i grupps rad hade 89 tecken, varningen fanns i båda
    // formaten och släpptes därför igenom i A4, och linjen under bandet skar igenom den andra raden (riggen 2026-10-18).
    const bandTecken = Math.floor(7.2 * sx * 72 / (12 * grad * 0.55));
    if ((b.bandVanster ?? '').length > bandTecken) varna(`bild 3: underraden har ${b.bandVanster.length} tecken, och bandet rymmer ${bandTecken}: korta lathund.mall.underrad`);
    txt(s, b.bandHoger ?? '', 6.6, 0.76, 6.5, 0.25, { mono: true, size: 12, color: GREY, align: 'right' });
    // Mattans och kortets fot är regeln för eleven: en rad, större text, inte fet.
    // Ett kort med meningar (lärarens kort, K-195) har en vanlig not i foten, inte elevens regel i stor text.
    const meningar = b.typ === 'lista' && b.rader.some((r: string[]) => r.some((c) => String(c).length > 40));
    const regel = b.typ === 'matta' || (b.typ === 'lista' && !meningar);
    const fotH = b.fot ? (regel || meningar ? 0.9 : 1.45) : 0, fotY = BOTTEN - fotH;
    const areaTop = 1.25, areaBottom = fotY - 0.15;

    if (b.typ === 'schema') {
      const t = b.tabell, lx = 0.21, ly = areaTop + 0.05, lw = 6.25;
      const totalW = t.kolumner.reduce((a: number, c: [string, number]) => a + c[1], 0);
      const cols: [string, number][] = t.kolumner.map((c: [string, number]) => [c[0], c[1] / totalW * lw]);
      rect(s, lx, ly, lw, 0.35, INK);
      let cx = lx; cols.forEach(([nm, cw]) => { txt(s, nm, cx + 0.1, ly + 0.07, cw - 0.15, 0.25, { mono: true, size: 11, color: WHITE }); cx += cw; });
      const nrows = t.rader ?? 9, rh = Math.min(0.42, (areaBottom - ly - 0.35 - (t.not ? 0.55 : 0.1)) / nrows);
      for (let r = 0; r < nrows; r++) { const yy = ly + 0.35 + r * rh; if (r % 2 === 1) rect(s, lx, yy, lw, rh, CELL); rect(s, lx, yy + rh - 0.01, lw, 0.01, LINE); }
      cx = lx; cols.forEach(([, cw], i) => { if (i > 0) rect(s, cx, ly + 0.35, 0.01, nrows * rh, LINE); cx += cw; });
      frame(s, lx, ly, lw, 0.35 + nrows * rh);
      if (t.not) txt(s, t.not, lx, ly + 0.35 + nrows * rh + 0.1, lw, 0.45, { size: 11, color: GREY });
      rect(s, 6.65, 1.1, 0.02, areaBottom - 1.1, INK);
      formular(s, 6.88, ly, 6.24, b.formular, areaBottom - ly);
    } else if (b.typ === 'matta') {
      // Bladet på bordet: etiketten, sedan en hög ruta per kolumn och rad som fyller bilden, kolumnnamnet
      // stort i ett band överst i varje ruta så att det går att läsa från andra sidan bordet.
      const x0 = 0.21, fullW = W - 0.42, mellan = 0.18, radMellan = 0.12;
      let y = areaTop;
      const [ra_, ti_] = [String(b.rubrik ?? '').toLowerCase(), String(b.titel ?? '').toLowerCase()];
      if (ra_ && !ra_.includes(ti_) && !ti_.includes(ra_)) { label(s, versaler(b.rubrik), x0, y, fullW, NAVY); y += 0.32; }
      const n = b.kolumner.length, cw = (fullW - mellan * (n - 1)) / n;
      const rh = (areaBottom - y - radMellan * (b.rader - 1)) / b.rader;
      for (let r = 0; r < b.rader; r++) {
        for (let i = 0; i < n; i++) {
          const cx = x0 + i * (cw + mellan), cy = y + r * (rh + radMellan);
          frame(s, cx, cy, cw, rh, INK, 1.25, WHITE);
          if (r === 0) {
            rect(s, cx + 0.02, cy + 0.02, cw - 0.04, 0.42, BAND);
            txt(s, b.kolumner[i], cx + 0.14, cy + 0.09, cw - 0.28, 0.3, { size: 14, bold: true });
          }
        }
      }
    } else if (b.typ === 'lista') {
      // Ett kort att ha på bordet (strategikortet): tabellens rader stort över hela bilden, så att eleven kan läsa det
      // vid bordet. Kolumnrubrikerna står små och grå överst, och raderna delar höjden lika. Texten är så stor som
      // raderna och den längsta cellen tillåter, högst 28 pt, räknat på sidan (sx, sy) och i graden (K-061, som riggen).
      // Ett kort med meningar (Kompissamtal: Samtalsteknikerna, åtta tekniker i tre kolumner) ryms inte så i 14 pt, och
      // texten gick över radernas linjer: då får kolumnerna bredd efter sin längsta text, raderna höjd efter innehållet,
      // och texten minskar tills allt ryms, ned till 10,5 pt (K-195, samma rättelse som i metodriggens renderare).
      const x0 = 0.21, fullW = W - 0.42, n = b.kolumner.length;
      let y = areaTop;
      const [ra_, ti_] = [String(b.rubrik ?? '').toLowerCase(), String(b.titel ?? '').toLowerCase()];
      if (ra_ && !ra_.includes(ti_) && !ti_.includes(ra_)) { label(s, versaler(b.rubrik), x0, y, fullW, NAVY); y += 0.36; }
      const kolumnY = y;
      y += 0.34;
      const hojd = areaBottom - y;
      const langst = Math.max(...b.rader.flatMap((r: string[]) => r.map((c) => String(c).length)));
      let cws: number[] = b.kolumner.map(() => fullW / n);
      let rhs: number[] = b.rader.map(() => hojd / b.rader.length);
      let size = Math.max(14, Math.min(28, (rhs[0] * sy * 72 * 0.45) / grad, ((cws[0] - 0.3) * sx * 72) / (langst * 0.55) / grad));
      const behov = (sz: number, bredder: number[]) => b.rader.map((r: string[]) => Math.max(...r.map((c, i) => estH(String(c), bredder[i] - 0.3, sz, 0.1))));
      if (behov(size, cws).some((h: number, ri: number) => h > rhs[ri])) {
        const langd = (i: number) => Math.max(String(b.kolumner[i]).length, ...b.rader.map((r: string[]) => String(r[i] ?? '').length));
        // Det längsta ordet i kolumnen ska rymmas på en rad, så att inget ord bryts mitt i (Kamratspegling).
        const ord = (i: number) => Math.max(...[b.kolumner[i], ...b.rader.map((r: string[]) => r[i] ?? '')].flatMap((t: string) => String(t).split(/\s+/)).map((w: string) => w.length));
        const vikter = b.kolumner.map((_: string, i: number) => Math.max(24, langd(i), ord(i) * 3));
        const summa = vikter.reduce((a: number, v: number) => a + v, 0);
        cws = vikter.map((v: number) => (fullW * v) / summa);
        for (size = 14; size > 10.5 && behov(size, cws).reduce((a: number, h: number) => a + h, 0) > hojd; size -= 0.5);
        const h = behov(size, cws);
        const summaH = h.reduce((a: number, x: number) => a + x, 0);
        if (summaH > hojd) varna(`bild 3: kortet ${b.rubrik ?? ''} ryms inte ens i 10,5 pt: korta texten i lathund.mall`);
        const extra = Math.max(0, hojd - summaH) / h.length;
        rhs = h.map((x: number) => x + extra);
      }
      const xs = cws.map((_: number, i: number) => x0 + cws.slice(0, i).reduce((a: number, w: number) => a + w, 0));
      b.kolumner.forEach((k: string, i: number) => txt(s, versaler(k), xs[i] + 0.15, kolumnY, cws[i] - 0.3, 0.28, { mono: true, size: 12, color: GREY }));
      let ry = y;
      b.rader.forEach((r: string[], ri: number) => {
        rect(s, x0, ry, fullW, 0.015, LINE);
        r.forEach((c, i) => txt(s, String(c), xs[i] + 0.15, ry, cws[i] - 0.3, rhs[ri], { size, valign: 'middle' }));
        ry += rhs[ri];
      });
      rect(s, x0, ry, fullW, 0.015, LINE);
    } else {
      ritaBlock(s, b.block, areaTop, areaBottom);
    }
    if (b.fot) {
      rect(s, 0, fotY, W, fotH, CREAM); rect(s, 0, fotY, W, 0.02, INK);
      txt(s, rich(b.fot.text ?? ''), 0.46, fotY + (regel || meningar ? 0.1 : 0.18), W - 0.92, fotH - (regel || meningar ? 0.2 : 0.3), { size: regel ? 17 : 12.5, valign: regel || meningar ? 'middle' : 'top' });
    }
    fot(s);
    s.addNotes(`${b.anteckning} ${upphov}`);
  }

  // Metodmodellens mallblock. Spalter och tavla tar hela bredden; övriga flödar i två spalter som på
  // sajten, delade där spalterna blir jämnast i höjd.
  function ritaBlock(s: any, block: any[], top: number, bottom: number) {
    const x0 = 0.21, fullW = W - 0.42, mellan = 0.3, colW = (fullW - mellan) / 2;
    const korta = (bl: any) => bl.rader.every((r: string[]) => r.every((c) => String(c).trim().length <= 12));
    // En tabell med två kolumner och korta etiketter i den första (högst 24 tecken) får en första kolumn på en tredjedel av
    // bredden, så att den långa texten får plats på färre rader (metodriggen 2026-09-29, Ljudstarten i Ljudlek i grupp).
    const etikettBredder = (bl: any): number[] | undefined => (bl.kolumner.length === 2 && !korta(bl) && bl.rader.every((r: string[]) => String(r[0] ?? '').trim().length <= 24) ? [1, 2] : undefined);
    const kolumnBredd = (bl: any, w: number, i: number) => { const b = etikettBredder(bl); return b ? (b[i] / (b[0] + b[1])) * w : w / bl.kolumner.length; };
    const est = (bl: any, w: number): number => {
      if (bl.typ === 'tabell') { const elev = korta(bl); return 0.3 + 0.32 + bl.rader.reduce((a: number, r: string[]) => a + (r.every((c) => !c.trim()) ? 0.34 : Math.max(elev ? 0.34 : 0.3, ...r.map((c, i) => estH(c, kolumnBredd(bl, w, i) - 0.16, elev ? 14 : 11, 0.12)))), 0) + 0.15; }
      if (bl.typ === 'skrivruta') return 0.5 + (bl.text ? 0.25 : 0) + bl.rader * 0.32 + 0.2;
      if (bl.typ === 'snabbmall') return 0.32 + 0.33 * 2 + (bl.fore.length + bl.efter.length) * 0.42 + 0.15;
      if (bl.typ === 'kedja') return 0.3 + estH(bl.steg.join('  →  '), w, 12, 0.15) + (bl.citat ? estH(bl.citat, w, 11.5, 0.1) : 0) + 0.15;
      if (bl.typ === 'not') return estH(bl.text, w - 0.4, 12, 0.3) + 0.15;
      if (bl.typ === 'spalter') return 0.5 + bl.rader * 0.32 + 0.25;
      if (bl.typ === 'tavla') return 4.2;
      return 0.5;
    };
    const rita = (bl: any, x: number, y: number, w: number): number => {
      if (bl.typ === 'tabell') {
        label(s, versaler(bl.rubrik), x, y, w, NAVY);
        const elev = korta(bl);
        return 0.3 + gridTable(s, x, y + 0.3, w, bl.kolumner, bl.rader, elev ? { elev: true, size: 14 } : { bredder: etikettBredder(bl) }) + 0.15;
      }
      if (bl.typ === 'skrivruta') {
        const h = 0.5 + (bl.text ? 0.25 : 0) + bl.rader * 0.32 + 0.15;
        rect(s, x, y, w, h, CREAM); rect(s, x, y, 0.04, h, AMBER);
        txt(s, [{ text: bl.rubrik, options: { bold: true, fontSize: 12.5 } }, ...(bl.text ? [{ text: `  ${bl.text}`, options: { fontSize: 11, color: GREY } }] : [])], x + 0.21, y + 0.12, w - 0.4, 0.3 + (bl.text ? 0.25 : 0), { size: 12.5 });
        linjer(s, x + 0.21, y + 0.42 + (bl.text ? 0.25 : 0), w - 0.42, bl.rader);
        return h + 0.15;
      }
      if (bl.typ === 'snabbmall') return formular(s, x, y, w, { rubrik: bl.rubrik, sektioner: [{ rubrik: 'FÖRE PASSET', falt: bl.fore }, { rubrik: 'EFTER PASSET · KORT NOTERING', falt: bl.efter }] }, bottom - y) + 0.15;
      if (bl.typ === 'kedja') {
        label(s, versaler(bl.rubrik), x, y, w, NAVY);
        const th = estH(bl.steg.join('  →  '), w, 12, 0.15);
        txt(s, bl.steg.flatMap((st: string, i: number) => [...(i > 0 ? [{ text: '  →  ', options: { color: GREY } }] : []), { text: st, options: { italic: true, bold: true, fontSize: 12, color: i === bl.steg.length - 1 ? GRON : INK } }]), x, y + 0.3, w, th, { size: 12 });
        let h = 0.3 + th;
        if (bl.citat) { const ch = estH(bl.citat, w, 11.5, 0.1); txt(s, `”${bl.citat}”`, x, y + h, w, ch, { size: 11.5, italic: true, color: AMBER }); h += ch; }
        return h + 0.15;
      }
      if (bl.typ === 'not') {
        const h = estH(bl.text, w - 0.4, 12, 0.3);
        cream(s, x, y, w, h, bl.text, 12);
        return h + 0.15;
      }
      if (bl.typ === 'spalter') {
        const n = bl.kolumner.length, gw = (w - 0.25 * (n - 1)) / n;
        bl.kolumner.forEach((k: { namn: string; fraga: string }, i: number) => {
          const cx = x + i * (gw + 0.25);
          txt(s, [{ text: `${i + 1}  `, options: { fontFace: MONO, color: NAVY, fontSize: 12 } }, { text: k.namn, options: { bold: true, fontSize: 13.5 } }, { text: `  ”${k.fraga}”`, options: { fontSize: 10.5, color: GREY } }], cx, y, gw, 0.4, { size: 13.5 });
          rect(s, cx, y + 0.42, gw, 0.015, INK);
          linjer(s, cx, y + 0.45, gw, bl.rader);
        });
        return 0.5 + bl.rader * 0.32 + 0.25;
      }
      if (bl.typ === 'tavla') {
        const lw = w * 0.46, rx = x + lw + 0.3, rw = w - lw - 0.3;
        let ly = y;
        txt(s, bl.text, x, ly, lw, estH(bl.text, lw, 13), { size: 13, italic: true }); ly += estH(bl.text, lw, 13, 0.1);
        txt(s, bl.fraga, x, ly, lw, 0.3, { size: 13, italic: true, bold: true, color: ROD }); ly += 0.4;
        for (const li of bl.listor) {
          txt(s, li.rubrik, x, ly, lw, 0.25, { size: 11.5, italic: true, color: GREY }); ly += 0.27;
          for (const pk of li.punkter) { txt(s, pk, x, ly, lw, 0.25, { size: 12, italic: true }); ly += 0.25; }
          ly += 0.1;
        }
        if (bl.citat.length > 1) { const c = bl.citat.slice(0, -1).map((q: string) => `”${q}”`).join(' '); txt(s, c, x, ly + 0.1, lw, estH(c, lw, 11.5), { size: 11.5, italic: true, color: AMBER }); ly += estH(c, lw, 11.5, 0.1); }
        let ry = y;
        txt(s, bl.tabell.rubrik, rx, ry, rw, 0.25, { size: 11.5, italic: true, color: GREY }); ry += 0.3;
        ry += gridTable(s, rx, ry, rw, bl.tabell.kolumner, bl.tabell.rader, { huvudFyll: GREY }) + 0.15;
        if (bl.annat) { txt(s, bl.annat.rubrik, rx, ry, rw, 0.25, { size: 11.5, italic: true, color: GREY }); ry += 0.27; for (const r of bl.annat.rader) { txt(s, r, rx, ry, rw, 0.25, { size: 12, italic: true }); ry += 0.25; } }
        if (bl.svar) { txt(s, bl.svar, rx, ry + 0.1, rw, 0.3, { size: 13, italic: true, bold: true, color: ROD }); ry += 0.45; }
        if (bl.citat.length) { const c = `”${bl.citat[bl.citat.length - 1]}”`; txt(s, c, rx, ry + 0.05, rw, estH(c, rw, 11.5), { size: 11.5, italic: true, color: AMBER }); ry += estH(c, rw, 11.5, 0.1); }
        return Math.max(ly, ry) - y + 0.2;
      }
      return 0;
    };
    const bred = (bl: any) => bl.typ === 'spalter' || bl.typ === 'tavla';
    let y = top;
    const smala: any[] = [];
    const tomSmala = () => {
      if (!smala.length) return;
      const vikt = smala.map((bl) => est(bl, colW));
      const total = vikt.reduce((a, b) => a + b, 0);
      let bast = 1, bastH = Infinity;
      for (let k = 1; k <= smala.length; k++) { const v = vikt.slice(0, k).reduce((a, b) => a + b, 0); const h = Math.max(v, total - v); if (h < bastH) { bastH = h; bast = k; } }
      if (smala.length === 1) bast = 1;
      let ly = y, ry = y;
      smala.slice(0, bast).forEach((bl) => { ly += rita(bl, x0, ly, colW); });
      smala.slice(bast).forEach((bl) => { ry += rita(bl, x0 + colW + mellan, ry, colW); });
      y = Math.max(ly, ry);
      smala.length = 0;
    };
    for (const bl of block) {
      if (bred(bl)) { tomSmala(); y += rita(bl, x0, y, fullW); }
      else smala.push(bl);
    }
    tomSmala();
    // Uppskattningen är tilltagen och räknar med luft efter sista blocket; först en kvarts tum över är det på riktigt för fullt.
    if (y > bottom + 0.3) varna(`mallsidan (bild 3) är för full (${y.toFixed(2)} > ${bottom.toFixed(2)} tum): färre rader eller kortare texter i lathund.mall`);
  }

  // ---------------------------------------------------------------- 4 MATERIAL
  {
    const b = L.bild4, s = pres.addSlide();
    header(s, b.titel, sidetikett('Material'));
    const harKrav = b.krav.length > 0;
    let top: number;
    if (harKrav) top = band(s, b.krav, true);
    else { rect(s, 0, 0.66, W, 0.02, INK); top = 0.68; }
    rect(s, 6.94, top, 0.02, BOTTEN - top, INK);
    label(s, b.kallorRubrik, 0.46, top + 0.16, 6.3);
    const rowsN = Math.ceil(b.bord.length / 2);
    // Raderna i rutan (korta saker, en rad var) får inte stå tätare än 0,9 gånger teckengraden, bokstävernas egen
    // höjd, annars skriver de över varandra och rutans kant. Räknat på sidan, i graden som används. Trängs rutan av
    // texten ovanför krymps den texten ett steg i taget, tills raderna ryms (Bråkkurs i grupp: raderna skrev över
    // varandra, granskningen 2026-10-20, K-487); först när inget steg räcker kommer varningen.
    const lagg = (ks: number, es: number) => {
      let yy = top + 0.45;
      const kh = b.kallor.map((k) => Math.max(0.42, estH(k, 6.2, ks, 0.08)));
      yy += kh.reduce((a, h) => a + h + 0.06, 0);
      const eh = b.kallorEfter ? estH(b.kallorEfter, 6.2, es, 0.08) : 0;
      if (b.kallorEfter) yy += eh + 0.06;
      const bordY = Math.max(yy + 0.15, BOTTEN - (0.5 + rowsN * 0.55));
      const rh = Math.min(0.55, (BOTTEN - bordY - 0.5) / rowsN);
      return { ks, es, kh, eh, yy, bordY, rh, radEm: (rh * sy * 72) / (12 * grad) };
    };
    const forslag = [[12.25, 11.5], [11.75, 11], [11.25, 10.5], [10.75, 10]].map(([ks, es]) => lagg(ks, es));
    const val = forslag.find((f) => f.radEm >= 0.9) ?? forslag[forslag.length - 1];
    let y = top + 0.45;
    b.kallor.forEach((k, i) => { txt(s, rich(k), 0.46, y, 6.2, val.kh[i], { size: val.ks }); y += val.kh[i] + 0.06; });
    if (b.kallorEfter) { txt(s, b.kallorEfter, 0.46, y, 6.2, val.eh, { size: val.es, color: GREY }); y += val.eh + 0.06; }
    const bordY = val.bordY, bordH = BOTTEN - bordY, rh = val.rh, radEm = val.radEm;
    if (y + 0.15 > bordY + 0.01) varna('bild 4: källorna är många eller långa, rutan "På bordet" trängs');
    if (radEm < 0.9) varna(`bild 4: raderna i rutan "På bordet" står för tätt (${radEm.toFixed(2)} gånger teckengraden, minst 0,9): färre eller kortare källor eller rader på bordet`);
    darkBox(s, 'PÅ BORDET NÄR PASSET BÖRJAR', 0.46, bordY, 6.17, bordH);
    b.bord.forEach((t, i) => txt(s, t, 0.61 + (i % 2) * 3.03, bordY + 0.46 + Math.floor(i / 2) * rh, 2.95, rh, { size: 12 }));
    // Varje sak har en fast rad, så en sak som behöver fler rader än raden rymmer går in i saken under i samma spalt
    // (riggens varning för sagoboken 2026-10-02, K-168). Raderna räknas med Calibris medelbredd, 0,47 gånger graden:
    // uppskattningen ovan är tilltagen och larmade på saker som ryms på en rad. Står raderna redan för tätt har rutan
    // fått sin varning.
    if (radEm >= 0.9) {
      const radHojd = (12 * grad * 1.25) / 72 / sy;
      const tecken = Math.max(8, Math.floor((2.95 * sx * 72) / (12 * grad * 0.47)));
      b.bord.forEach((t, i) => {
        const rader = Math.ceil(t.length / tecken);
        if (i + 2 < b.bord.length && rader * radHojd > rh + 0.02) varna(`bild 4: "${t.slice(0, 40)}" på bordet tar ${rader} rader och går in i saken under: korta raden i lathund.material.bordet`);
      });
    }

    let ry = top + 0.16;
    let radH = 0.33, chkSize = 11.75, upSize = 12;
    const upBehov = (size: number) => (b.uppfoljning.length ? 0.5 + b.uppfoljning.reduce((a, t) => a + estH(t, 5.3, size, 0.1) + 0.06, 0) : 0);
    const chkRader = () => b.checklista.map((t) => Math.max(radH, estH(`☐  ${t}`, 5.3, chkSize, 0.04)));
    const chkBehov = () => (b.checklista.length ? 0.5 + chkRader().reduce((a, x) => a + x, 0) + 0.1 + 0.22 : 0);
    if (chkBehov() + upBehov(upSize) > BOTTEN - ry) { radH = 0.29; chkSize = 11; upSize = 11.25; }
    if (chkBehov() + upBehov(upSize) > (BOTTEN - ry) * 1.12) varna('bild 4: checklistan och uppföljningen får inte plats i högerspalten: färre punkter eller kortare rader');
    if (b.checklista.length) {
      const hs = chkRader();
      const chkH = 0.5 + hs.reduce((a, x) => a + x, 0) + 0.1;
      darkBox(s, b.checklistaRubrik, 7.27, ry, 5.6, chkH);
      let cy = ry + 0.46;
      b.checklista.forEach((t, i) => { txt(s, `☐  ${t}`, 7.43, cy, 5.4, hs[i], { size: chkSize }); cy += hs[i]; });
      ry += chkH + 0.22;
    }
    if (b.uppfoljning.length) {
      const upH = BOTTEN - ry;
      darkBox(s, 'UPPFÖLJNING', 7.27, ry, 5.6, upH);
      // Texten ska rymmas i rutan: graden sänks steg för steg tills den gör det, sedan varnas det.
      let size = upSize;
      const hojder = () => b.uppfoljning.map((t) => estH(t, 5.3, size, 0.1));
      let uh = hojder();
      const behov = () => 0.5 + uh.reduce((a, x) => a + x, 0) + 0.06 * uh.length;
      while (behov() > upH && size > 10) { size -= 0.5; uh = hojder(); }
      if (behov() > upH + 0.3) varna('bild 4: uppföljningen ryms inte i sin ruta: korta uppfoljning.rader eller lathund.material.varjePass');
      let uy = ry + 0.46;
      b.uppfoljning.forEach((t, i) => { txt(s, rich(t), 7.43, uy, 5.3, uh[i], { size }); uy += uh[i] + 0.06; });
    }
    fot(s);
    s.addNotes(`${b.anteckning} ${upphov}`);
  }

  return { pres, varningar, filmer: filmer.map((f) => `${filmNamn(f)}, filmen: ${f.film.beskrivning}`) };
}

// ---------------------------------------------------------------- byggstenarna
/**
 * Lathundens verktyg för en presentation i ett format, för båda samlingarna: primitiverna och byggstenarna som
 * Stödundervisnings och Metoders lathund ritar sina bilder med. Alla mått är i 16:9-bildens tum, och primitiverna för över
 * dem till sidans format (sx, sy) med teckengraden gånger grad. upphov är raden i sidfoten, och varna samlar det som inte
 * ryms.
 */
function lathundensVerktyg(pres: any, format: LathundFormat, grad: number, upphov: string, varna: (t: string) => void) {
  const sida = SIDA[format];
  const sx = sida.w / W, sy = sida.h / H;
  const rect = (s: any, x: number, y: number, w: number, h: number, fill: string) => s.addShape(pres.ShapeType.rect, { x: x * sx, y: y * sy, w: w * sx, h: h * sy, fill: { color: fill }, line: { color: fill, width: 0 } });
  const frame = (s: any, x: number, y: number, w: number, h: number, color = INK, width = 1, fill?: string) => s.addShape(pres.ShapeType.rect, { x: x * sx, y: y * sy, w: w * sx, h: h * sy, fill: fill ? { color: fill } : { type: 'none' }, line: { color, width } });
  // Teckengraden gånger grad, också i textlöpor med egen grad. Ett bindestreck med ordfog (sss-⁠ooo-⁠lll) blir ett hårt
  // bindestreck, eftersom PowerPoint bryter raden efter bindestrecket också när ordfogen står där (hardaStreck i metoddocx.ts).
  const hart = (t: any) => (typeof t === 'string' ? t.replace(/-\u2060/g, '\u2011') : t);
  const skalad = (t: any) => (Array.isArray(t) ? t.map((r: any) => ({ ...r, text: hart(r?.text), ...(r?.options?.fontSize ? { options: { ...r.options, fontSize: r.options.fontSize * grad } } : {}) })) : hart(t));
  const txt = (s: any, t: any, x: number, y: number, w: number, h: number, o: any = {}) => s.addText(skalad(t), { x: x * sx, y: y * sy, w: w * sx, h: h * sy, isTextBox: true, margin: 0, fontFace: o.mono ? MONO : SANS, fontSize: (o.size ?? 12.75) * grad, color: o.color ?? INK, bold: !!o.bold, italic: !!o.italic, valign: o.valign ?? 'top', align: o.align ?? 'left', paraSpaceAfter: o.psa ?? 0, fit: 'none' });
  const label = (s: any, t: string, x: number, y: number, w: number, color = AMBER) => txt(s, t, x, y, w, 0.25, { mono: true, size: 12, color });
  // "**fet** resten" blir textlöpor.
  const rich = (t: any, base: any = {}): any[] => {
    if (Array.isArray(t)) return t;
    const parts: any[] = []; const re = /\*\*([^*]+)\*\*/g; let last = 0; let mm: RegExpExecArray | null;
    t = String(t ?? '');
    while ((mm = re.exec(t))) { if (mm.index > last) parts.push({ text: t.slice(last, mm.index), options: { ...base } }); parts.push({ text: mm[1], options: { ...base, bold: true } }); last = mm.index + mm[0].length; }
    if (last < t.length) parts.push({ text: t.slice(last), options: { ...base } });
    return parts.length ? parts : [{ text: t, options: { ...base } }];
  };
  const plain = (t: any) => String(t ?? '').replace(/\*\*/g, '');
  // Uppskattad texthöjd i 16:9-bildens tum, tilltagen. Raderna räknas på den verkliga bredden (wIn gånger sx) och
  // den verkliga graden (size gånger grad), och höjden förs tillbaka till bildens tum (delat med sy).
  // En radbrytning (\n) i texten börjar en ny rad: i Skrivkurs: sagobokens mall står stationen och frågan i samma cell,
  // och raden fick en rads höjd, så att frågan klipptes av raden under (K-168, riggens estHCell).
  const estLines = (t: any, wIn: number, size: number) => { const cpl = Math.max(8, Math.floor(wIn * sx * 72 / (size * grad * 0.52))); return Math.max(1, plain(t).split('\n').reduce((a, rad) => a + Math.max(1, Math.ceil(rad.length / cpl)), 0)); };
  const estH = (t: any, wIn: number, size: number, gap = 0) => estLines(t, wIn, size) * size * grad * 1.25 / 72 / sy + gap;

  // right är sidans etikett, "Metoden · 1/4" ur sidetikett, eller filmbildens namn.
  function header(s: any, title: string, right: string) {
    rect(s, 0, 0, W, 0.66, NAVY);
    txt(s, 'LATHUND', 0.46, 0.21, 1.5, 0.27, { mono: true, size: 12.75, color: WHITE });
    txt(s, title, 1.96, 0.16, 8.3, 0.39, { size: 18.75, bold: true, color: WHITE });
    txt(s, versaler(right), 9.8, 0.21, 3.1, 0.27, { mono: true, size: 12.75, color: WHITE, align: 'right' });
  }
  function fot(s: any) {
    txt(s, upphov, 0.46, H - 0.2, W - 0.92, 0.16, { mono: true, size: 7.5, color: GREY, align: 'right' });
  }
  function band(s: any, items: string[][], sub = false) {
    const h = sub ? 1.25 : 0.82;
    rect(s, 0, 0.66, W, h, BAND); rect(s, 0, 0.66 + h - 0.02, W, 0.02, INK);
    const n = items.length, cw = (W - 0.46) / n;
    const longest = Math.max(...items.map((it) => plain(it[1]).length));
    const vsize = sub ? 14.25 : (longest > 26 ? 12 : longest > 20 ? 13.5 : longest > 15 ? 14.5 : 16.5);
    items.forEach((it, i) => {
      const x = 0.46 + i * cw;
      if (i > 0) rect(s, x - 0.26, 0.66, 0.01, h - 0.02, LINE);
      txt(s, it[0], x, 0.77, cw - 0.4, 0.25, { mono: true, size: 12, color: GREY });
      txt(s, it[1], x, 1.02, cw - 0.4, sub ? 0.29 : 0.34, { size: vsize, bold: true });
      if (sub) txt(s, it[2] ?? '', x, 1.30, cw - 0.45, 0.5, { size: 12 });
    });
    return 0.66 + h;
  }
  function darkBox(s: any, title: string, x: number, y: number, w: number, h: number) {
    frame(s, x, y, w, h, INK, 1, WHITE);
    rect(s, x + 0.01, y + 0.01, w - 0.02, 0.34, INK);
    txt(s, title, x + 0.15, y + 0.07, w - 0.3, 0.25, { mono: true, size: 12, color: WHITE });
  }
  function cream(s: any, x: number, y: number, w: number, h: number, t: any, size = 12.75, tag?: string) {
    rect(s, x, y, w, h, CREAM); rect(s, x, y, 0.04, h, AMBER);
    const parts = tag ? [{ text: tag + '  ', options: { fontFace: MONO, fontSize: 11, color: AMBER } }, ...rich(t)] : rich(t);
    txt(s, parts, x + 0.21, y + 0.12, w - 0.4, h - 0.24, { size, valign: 'middle' });
  }
  // Tabell ritad som former, radhöjder räknas ut och skalas till tillgänglig höjd.
  function shapeTable(s: any, x: number, y: number, w: number, c1: number, headers: string[], rows: { namn: string; under?: string; fet?: string; rader: string[]; kursiv?: boolean }[], availH: number) {
    const rightW = w - c1 - 0.3, leftW = c1 - 0.25;
    const avail = availH - 0.35;
    let fs = 12.75, us = 11.5, nat: number[] = [], sum = 0;
    const measure = () => { nat = rows.map((r) => {
      const left = 0.2 + Math.max(0.27, estH(r.namn, leftW, fs)) + (r.under ? estH(r.under, leftW, us) : 0) + 0.1;
      const right = 0.2 + (r.fet ? estH(r.fet, rightW, fs, 0.04) : 0) + r.rader.reduce((a, t) => a + estH(t, rightW, fs, 0.04), 0);
      return Math.max(left, right, 0.6);
    }); sum = nat.reduce((a, b) => a + b, 0); };
    measure();
    if (sum > avail) { fs = 12; us = 10.5; measure(); }
    if (sum > avail) { fs = 11.5; us = 10; measure(); }
    const k = sum > avail ? avail / sum : 1;
    if (k < 0.85) varna(`tabellen "${headers.join('|')}" är trång (${sum.toFixed(2)} > ${avail.toFixed(2)} tum): korta texterna i lathunden`);
    const hs = nat.map((h) => h * k + (sum < avail ? (avail - sum) / rows.length : 0));
    rect(s, x, y, w, 0.35, INK);
    txt(s, headers[0], x + 0.15, y + 0.07, c1 - 0.2, 0.25, { mono: true, size: 12, color: WHITE });
    rect(s, x + c1, y, 0.01, 0.35, '4A5361');
    txt(s, headers[1], x + c1 + 0.16, y + 0.07, w - c1 - 0.3, 0.25, { mono: true, size: 12, color: WHITE });
    let cy = y + 0.35;
    rows.forEach((r, i) => {
      const h = hs[i];
      rect(s, x, cy, c1, h, BAND);
      if (i > 0) rect(s, x, cy, w, 0.01, LINE);
      rect(s, x + c1, cy, 0.01, h, LINE);
      const namnH = Math.max(0.27, estH(r.namn, leftW, fs));
      txt(s, r.namn, x + 0.15, cy + 0.1, leftW, namnH, { size: fs, bold: true });
      if (r.under) txt(s, r.under, x + 0.15, cy + 0.1 + namnH + 0.02, leftW, h - namnH - 0.15, { size: us, color: GREY });
      // En fet första rad (fasens namn i schemat på bild 2) står före texten, som i webblathunden.
      const fetRad = r.fet ? [{ text: plain(r.fet), options: { bold: true, breakLine: true, fontSize: fs, fontFace: SANS, color: INK } }] : [];
      txt(s, [...fetRad, ...r.rader.map((t, j) => ({ text: plain(t), options: { italic: !!r.kursiv, breakLine: j < r.rader.length - 1, fontSize: fs, fontFace: SANS, color: INK } }))], x + c1 + 0.16, cy + 0.1, rightW, h - 0.15, { psa: 3 });
      cy += h;
    });
    frame(s, x, y, w, cy - y);
    return cy;
  }
  // Rubriktabell med valfritt antal kolumner: mörk rubrikrad, zebra, tomma celler får skrivhöjd.
  // elev: en elevlista (veckans läslista) får ljus rubrikrad, små grå rubriker, stora ord och ingen fet första kolumn.
  // kursiv och farger: kolumnerna med kursiv text och kolumnernas färger, som minuternas repliker i Metoders lathund, och
  // exakt: radhöjden ur textens verkliga rader, som Metoders lathund räknar sina delar.
  function gridTable(s: any, x: number, y: number, w: number, kolumner: string[], rader: string[][], o: any = {}) {
    const n = kolumner.length;
    const bredder: number[] = o.bredder ?? kolumner.map((_k, i) => (i === 0 ? 0.9 : 1) * w / (n - 0.1));
    const sum = bredder.reduce((a, b) => a + b, 0);
    const ws = bredder.map((b) => b / sum * w);
    const size = o.size ?? 11;
    // exakt: radernas höjd räknas med Calibris teckenbredder (calibriRader), i stället för den tilltagna uppskattningen.
    const cellH = (c: string, i: number) => (o.exakt ? calibriRader(plain(c), (ws[i] - 0.16) * sx, size * grad, i === 0 && !o.elev) * size * grad * 1.22 / 72 / sy + 0.12 : estH(c, ws[i] - 0.16, size, 0.12));
    const hs = rader.map((r) => r.every((c) => !String(c).trim()) ? (o.tomHojd ?? 0.34) : Math.max(o.elev ? 0.34 : 0.3, ...r.map((c, i) => cellH(c, i))));
    rect(s, x, y, w, 0.32, o.huvudFyll ?? (o.elev ? BAND : INK));
    let cx = x;
    kolumner.forEach((k, i) => { txt(s, k, cx + 0.08, y + 0.06, ws[i] - 0.12, 0.25, { mono: true, size: o.elev ? 9 : 10.5, color: o.elev ? GREY : WHITE }); cx += ws[i]; });
    let cy = y + 0.32;
    rader.forEach((r, ri) => {
      if (ri % 2 === 1) rect(s, x, cy, w, hs[ri], CELL);
      rect(s, x, cy, w, 0.01, LINE);
      let cx2 = x;
      r.forEach((c, i) => {
        if (i > 0) rect(s, cx2, cy, 0.01, hs[ri], LINE);
        if (String(c).trim()) txt(s, plain(c), cx2 + 0.08, cy + 0.06, ws[i] - 0.14, hs[ri] - 0.08, { size, bold: i === 0 && !o.elev, italic: o.kursiv?.includes(i), color: o.farger?.[i] });
        cx2 += ws[i];
      });
      cy += hs[ri];
    });
    frame(s, x, y, w, cy - y);
    return cy - y;
  }
  function linjer(s: any, x: number, y: number, w: number, n: number, h = 0.32) { for (let i = 0; i < n; i++) rect(s, x, y + (i + 1) * h - 0.01, w, 0.01, LINE); return n * h; }
  // Formuläret (snabbmallen): sektionsrader i mörkt, fält med etikett till vänster.
  function formular(s: any, x: number, y: number, w: number, f: { rubrik: string; sektioner: { rubrik: string; falt: string[] }[] }, maxH: number) {
    label(s, f.rubrik, x, y, w);
    let cy = y + 0.32; const y0 = cy;
    const nf = f.sektioner.reduce((a, se) => a + se.falt.length, 0);
    const fh = Math.max(0.36, Math.min(0.62, (maxH - 0.32 - 0.33 * f.sektioner.length) / nf));
    for (const se of f.sektioner) {
      rect(s, x, cy, w, 0.33, INK); txt(s, se.rubrik, x + 0.15, cy + 0.06, w - 0.3, 0.25, { mono: true, size: 12, color: WHITE }); cy += 0.33;
      for (const fl of se.falt) { rect(s, x, cy, w, fh, WHITE); rect(s, x, cy + fh - 0.01, w, 0.01, LINE); rect(s, x, cy, 2.1, fh, BAND); rect(s, x + 2.1, cy, 0.01, fh, LINE); txt(s, fl, x + 0.15, cy + 0.08, 1.85, fh - 0.12, { size: 11.5, bold: true }); cy += fh; }
    }
    frame(s, x, y0, w, cy - y0);
    return cy - y;
  }
  return { pres, sx, sy, grad, varna, rect, frame, hart, skalad, txt, label, rich, plain, estLines, estH, header, fot, band, darkBox, cream, shapeTable, gridTable, linjer, formular };
}
type Verktyg = ReturnType<typeof lathundensVerktyg>;

// Metodens filmer som mp4, i bredd efter antalet: en stor i mitten, två i bredd eller tre i bredd (Niclas 2026-10-07:
// "ha dem i en grid slide 1 (grupperade beroende på antal) som första slide med text under"). Över varje film står en
// liten speltriangel, filmens nummer och längd, under den filmens namn och dess fyra bildtexter. Omslagsbilden har
// inget spelmärke över sig: det täckte ordet mitt i filmen, och i Google Presentationer, som gör filmerna till
// stillbilder, såg det ut som en trasig film. Raden nederst säger var filmerna spelar då.
function filmbilden(pres: any, v: Verktyg, filmer: MetodFilm[], o: { titel: string; adress: string; upphov: string }) {
  const { txt, header, fot, hart, varna } = v;
  const { titel, adress, upphov } = o;
  const s = pres.addSlide();
  const n = filmer.length;
  header(s, titel, filmbildNamn(n));
  const M = 0.46, BR = W - 2 * M, RAD_Y = H - 0.56;
  // PowerPoints spelarrad visas direkt under filmen när man pekar på den, och låg mitt i filmens namn när namnet stod
  // tätt under filmen (Niclas 2026-10-07). Namnet börjar därför 0,6 tum under filmen.
  const SPELARRAD = 0.6;
  let form = n === 1 ? { w: 6.1, lucka: 0, y: 1.12, grad: 14, titel: 18 } : n === 2 ? { w: 6.0, lucka: BR - 12, y: 1.15, grad: 14.5, titel: 18 } : { w: (BR - 0.6) / 3, lucka: 0.3, y: 1.15, grad: 14, titel: 17 };
  const namn = filmer.map(filmNamn);
  // Namnet kan bli två rader i den smala spalten (Textsamtal i grupp har ett på 48 tecken), och alla spalters texter
  // börjar på samma höjd. Bildtexterna har 22 punkters hängande indrag.
  const matt = (v: typeof form) => {
    const namnH = Math.max(...namn.map((t) => calibriRader(t, v.w, v.titel, true))) * v.titel * 1.22 / 72;
    const textH = Math.max(...filmer.map((f) => f.film.stillbilder.reduce((a, b) => a + calibriRader(b.text, v.w - 22 / 72, v.grad) * v.grad * 1.2 / 72 + 5 / 72, 0)));
    const textY = v.y + v.w * 9 / 16 + SPELARRAD + namnH + 0.1;
    return { namnH, textY, slut: textY + textH };
  };
  // Ryms texterna inte ovanför sista raden krymper graden ett steg i taget, och en ensam film blir smalare; sedan varnas det.
  let hojd = matt(form);
  while (hojd.slut > RAD_Y - 0.06 && form.grad > 11.5) { form = { ...form, grad: form.grad - 0.5 }; hojd = matt(form); }
  while (n === 1 && hojd.slut > RAD_Y - 0.06 && form.w > 5) { form = { ...form, w: form.w - 0.25 }; hojd = matt(form); }
  if (hojd.slut > RAD_Y) varna('filmbilden: filmens namn och bildtexter ryms inte under filmen: korta filmens titel eller stillbildernas texter');
  const fh = form.w * 9 / 16, x0 = n === 1 ? (W - form.w) / 2 : M;
  filmer.forEach((f, i) => {
    provaFilmfiler(f, titel);
    const x = x0 + i * (form.w + form.lucka);
    s.addShape(pres.ShapeType.triangle, { x: x + 0.005, y: form.y - 0.285, w: 0.15, h: 0.13, rotate: 90, fill: { color: AMBER }, line: { color: AMBER, width: 0 } });
    txt(s, `${n === 1 ? 'FILMEN' : `FILM ${f.nr}`} · ${Math.round(f.film.sekunder)} SEKUNDER`, x + 0.24, form.y - 0.33, form.w - 0.24, 0.25, { mono: true, size: 12, color: AMBER });
    s.addMedia({ type: 'video', path: mp4Fil(f), cover: `data:image/png;base64,${readFileSync(omslagFil(f)).toString('base64')}`, x, y: form.y, w: form.w, h: fh });
    txt(s, namn[i], x, form.y + fh + SPELARRAD, form.w, hojd.namnH, { size: form.titel, bold: true });
    // Bildtexterna som numrerad lista med hängande indrag, så att en text på två rader står rak under sig själv.
    s.addText(f.film.stillbilder.map((b) => ({ text: hart(b.text), options: { bullet: { type: 'number', style: 'arabicPlain', indent: 22 }, fontFace: SANS, fontSize: form.grad, color: INK, breakLine: true } })),
      { x, y: hojd.textY, w: form.w, h: RAD_Y - 0.06 - hojd.textY, isTextBox: true, margin: 0, valign: 'top', paraSpaceAfter: 5, fit: 'none' });
  });
  // Raden nederst: i PowerPoint spelar ett klick filmen. I Google Presentationer är filmerna stillbilder, och då
  // säger raden var de spelar, med adressen som länk.
  s.addText([
    { text: `${n === 1 ? 'Klicka på filmen för att spela den' : 'Klicka på en film för att spela den'}. Spelar filmen inte här? Se den på ` },
    { text: adress, options: { hyperlink: { url: `https://${adress}` } } },
  ], { x: M, y: RAD_Y, w: BR, h: 0.24, isTextBox: true, margin: 0, fontFace: SANS, fontSize: 11, color: GREY, valign: 'top', fit: 'none' });
  fot(s);
  s.addNotes(`${titel}, ${n === 1 ? 'filmen' : 'filmerna'}: ${namn.join(', ')}. ${upphov} ${FILM_UPPHOV}`);
}
// ================================================================ METODER
// Undervisningsmetodernas lathund under Metoder (K-637; Niclas 2026-10-30: "Kan du bara göra om standarden för denna
// lathund enligt nuvarande 4 steg. Men att den görs likt den andra för stödundervisning och du fixar den med filmer"): de
// fyra sidorna ur standarden (lathundensSidor), samma som sidan /metoder/<id>/lathund visar, ritade med byggstenarna ovan i
// Stödundervisnings form. Filmbilden står först i 16:9-filen utan nummer, och sedan kommer de fyra sidorna kant till kant,
// med sidhuvudet och delarnas spalter ur src/lib/lathundsidor.ts, som sidan läser. Varje del ritas av sitt slag (umDel), och
// planeringsbladet efter samma regler och ord som Planeringsblad.astro (planeringsbladet och bladetsOrd i
// src/lib/undervisningsmetod.ts), med utfallens gränser ur standarden (utfalletsGrans). Formen är standardformen för varje
// undervisningsmetod, så inget här vet något om en enskild metod: en sida ritas så stor som den ryms, först i sidans spalter,
// sedan med den sista delen i en spalt flyttad till den andra eller med spalterna delade på ett annat ställe i läsordningen,
// och med texten ett steg mindre i taget. Fälten har tak i standarden (LATHUNDENS_TAK, som undervisningsmetodensFel prövar),
// och en metod vid taken ryms med texten i minst 85 procent; ryms en sida inte ens i det minsta steget varnas det i bygget.
// Pdf:en är A4-varianten av samma bilder, gjord av PowerPoint (scripts/lathund-pdf.mjs).

/** Undervisningsmetodens lathund som pptx-buffert, i 16:9 (standard) eller A4 liggande, som lathundPptx. */
export async function undervisningsmetodensLathundPptx(m: CollectionEntry<'undervisningsmetoder'>, o: { bas: string; format?: LathundFormat }): Promise<Buffer> {
  return lathundensFil(m.id, o.format ?? '16:9', m.data.uppdaterad ?? m.data.publicerad, (format, grad, medFilmer) => ritaUmLathund(m, o.bas, format, grad, medFilmer));
}

function ritaUmLathund(m: CollectionEntry<'undervisningsmetoder'>, bas: string, format: LathundFormat, grad: number, medFilmer = true): Ritad {
  const d = m.data as Um;
  if (!d.lathund) throw new Error(`${m.id} har ingen lathund`);
  // Raderna bryts inte vid ett bindestreck eller efter ett nummer (utanRadbrytning, riggens punkt 7). Planeringsbladet läser
  // planen efter delarnas namn och står som det är.
  const sidor = lathundensSidor(d).map((sida) => ({ ...sida, delar: sida.delar.map((x) => (x.slag === 'planering' ? x : JSON.parse(JSON.stringify(x), (k, t) => (typeof t === 'string' && k !== 'id' && k !== 'slag' ? utanRadbrytning(t) : t)) as LathundDel)) }));
  const filmer = format === '16:9' && medFilmer ? metodensFilmer({ film: d.film, filmer: d.filmer }, m.id, 'metoder') : [];
  const pres = nyPresentation(format, `Lathund: ${d.titel}`, d.ingress);
  const adress = `${bas.replace(/^https?:\/\//, '')}${metodensAdress(m.id)}/lathund`;
  const upphov = `© Niclas Fohlin · ${adress}`;
  const varningar: string[] = [];
  const v = lathundensVerktyg(pres, format, grad, upphov, (t) => { varningar.push(t); });
  if (filmer.length) filmbilden(pres, v, filmer, { titel: d.titel, adress, upphov });
  for (const sida of sidor) {
    const s = pres.addSlide();
    const huvud = umLathundHuvud(d.titel, sida, sidor.length);
    v.header(s, huvud.rubrik, huvud.etikett);
    umSida(v, s, d, sida);
    v.fot(s);
    s.addNotes(`${d.titel}, lathundens sida ${sida.nr}: ${sida.namn}. ${upphov}`);
  }
  return { pres, varningar, filmer: filmer.map((f) => `${filmNamn(f)}, filmen: ${f.film.beskrivning}`) };
}

// En bild som inget ritas på: delarna mäts genom att ritas här, med samma kod som ritar dem.
const TORR = { addText: () => undefined, addShape: () => undefined, addNotes: () => undefined, addMedia: () => undefined, addImage: () => undefined };
// Textens storlek i steg, gånger grundgraderna nedan: en sida med luft står större, en tät mindre. Det största steget ger
// brödtext i 15 punkter, som Stödundervisnings största text på en sida med luft.
const UM_STEG = [1.25, 1.2, 1.15, 1.1, 1.05, 1, 0.95, 0.9, 0.85, 0.8];
// Luften mellan delarna, i tum.
const UM_MELLAN = 0.18;
type UmSpalter = ReturnType<typeof umLathundSpalter<LathundDel>>;

/** Höjden en text tar på 16:9-bilden, räknad med Calibris teckenbredder på sidans verkliga bredd och grad (calibriRader). */
function textHojd(v: Verktyg, t: unknown, w: number, size: number, fet = false): number {
  return String(v.plain(t)).split('\n').reduce((a, rad) => a + calibriRader(rad, w * v.sx, size * v.grad, fet), 0) * size * v.grad * 1.22 / 72 / v.sy;
}

/** Ritar en lathundssidas delar så stort som de ryms, och varnar när de inte ryms ens i det minsta steget. */
function umSida(v: Verktyg, s: any, d: Um, sida: LathundSida): void {
  const sidans = umLathundSpalter(sida.delar);
  // Den sista delen i en spalt flyttad till den andras slut, som andra och tredje försöket.
  const flyttad = (fran: 'vanster' | 'hoger'): UmSpalter | undefined => {
    const till = fran === 'vanster' ? 'hoger' : 'vanster';
    if (sidans[fran].length < 2) return undefined;
    return { ...sidans, [fran]: sidans[fran].slice(0, -1), [till]: [...sidans[till], sidans[fran].at(-1)!] };
  };
  // Sedan delarna i läsordning, vänster spalt före höger, delade på ett annat ställe, närmast sidans delning först.
  const ordning = [...sidans.vanster, ...sidans.hoger];
  const delningar = ordning.map((_, k) => k).filter((k) => k > 0 && k !== sidans.vanster.length).sort((a, b) => Math.abs(a - sidans.vanster.length) - Math.abs(b - sidans.vanster.length));
  const forsok = [sidans, flyttad('hoger'), flyttad('vanster'), ...delningar.map((k) => ({ ...sidans, vanster: ordning.slice(0, k), hoger: ordning.slice(k) }))].filter((x): x is UmSpalter => !!x);
  for (const z of UM_STEG) for (const sp of forsok) if (umLagg(v, TORR, d, sp, z) <= BOTTEN + 0.02) { umLagg(v, s, d, sp, z); return; }
  const minsta = UM_STEG[UM_STEG.length - 1];
  v.varna(`sidan ${sida.nr} (${sida.namn}) ryms inte ens i ${Math.round(minsta * 100)} procent (${umLagg(v, TORR, d, sidans, minsta).toFixed(2)} > ${BOTTEN.toFixed(2)} tum): korta texten i metoden`);
  umLagg(v, s, d, sidans, minsta);
}

/** Lägger sidans delar: faktan i ett band, delarna i hela bredden, spalterna och delarna efter dem. Svarar var sidan slutar. */
function umLagg(v: Verktyg, s: any, d: Um, sp: UmSpalter, z: number): number {
  const fakta = sp.fore.find((x) => x.slag === 'fakta');
  let y: number;
  if (fakta && fakta.slag === 'fakta') y = umFaktaband(v, s, fakta.rader) + 0.2;
  else { v.rect(s, 0, 0.66, W, 0.02, INK); y = 0.88; }
  const hela = sp.fore.filter((x) => x.slag !== 'fakta');
  for (const x of hela) y += umDel(v, s, d, x, V_X, y, W - 2 * V_X, z) + UM_MELLAN;
  if (sp.vanster.length || sp.hoger.length) {
    // Strecket mellan spalterna står mitt på sidan, som på Stödundervisnings bild 1, från bandet eller delen ovanför.
    const strecket = hela.length ? y - 0.08 : y - 0.2;
    v.rect(s, MITT - 0.01, strecket, 0.02, BOTTEN - strecket, INK);
    let vy = y, hy = y;
    for (const x of sp.vanster) vy += umDel(v, s, d, x, V_X, vy, V_BREDD, z) + UM_MELLAN;
    for (const x of sp.hoger) hy += umDel(v, s, d, x, H_X, hy, H_BREDD, z) + UM_MELLAN;
    y = Math.max(vy, hy);
  }
  for (const x of sp.efter) y += umDel(v, s, d, x, V_X, y, W - 2 * V_X, z) + UM_MELLAN;
  return y - UM_MELLAN;
}

/** En del ritad ur sitt slag på (x, y) i bredden w. Svarar höjden. */
function umDel(v: Verktyg, s: any, d: Um, x: LathundDel, X: number, Y: number, w: number, z: number): number {
  switch (x.slag) {
    case 'stycken': return umStycken(v, s, X, Y, w, x.rubrik, x.text, 12 * z);
    case 'kort': return umKortrad(v, s, X, Y, w, x.rubrik, x.kort, x.fot, z);
    case 'not': return umNot(v, s, X, Y, w, x.namn, x.text, 11.5 * z);
    case 'checklista': return umChecklista(v, s, X, Y, w, x.rubrik, x.punkter, 11.5 * z);
    case 'minuter': return umMinuterna(v, s, X, Y, w, x.rubrik, x.delar, 11 * z);
    case 'rutin': return umRutan(v, s, X, Y, w, x.rubrik, x.text, x.steg, 11.5 * z);
    case 'tabell': return umTabell(v, s, X, Y, w, x.rubrik, x.kolumner, x.rader, 11 * z);
    case 'planering': return umPlaneringsblad(v, s, d, X, Y, w, x, z);
    default: return 0;
  }
}

/**
 * Faktan i ett band under sidhuvudet, som Stödundervisnings band på bild 1: etiketten, värdet och en kommentar under, som
 * Lärande totalt har, i samma storlek på varje sida som bandet står på. Varje spalt rymmer sin etikett och sitt längsta ord på
 * en rad (Medelsvårt), resten av bredden delas efter texten, och bandet får höjd efter den högsta. Svarar var bandet slutar.
 */
function umFaktaband(v: Verktyg, s: any, rader: LathundFakta[]): number {
  const { rect, txt } = v;
  const VARDE = 14, UNDER = 10.5, Y0 = 0.66, LUFT = 0.4;
  // Etiketten står i Consolas, som är 0,55 gånger graden bred.
  const minsta = rader.map((r) => Math.max(versaler(r.namn).length * 0.55 * 12 * v.grad / 72 / v.sx, ...r.text.split(/\s+/).map((o) => calibriPunkter(o, VARDE * v.grad, true) / 72 / v.sx)) + LUFT + 0.05);
  const vikter = rader.map((r) => r.text.length + (r.under?.length ?? 0) * 0.5);
  const kvar = Math.max(0, W - 0.46 - minsta.reduce((a, b) => a + b, 0));
  const summa = vikter.reduce((a, b) => a + b, 0);
  const bredder = minsta.map((m, i) => m + (kvar * vikter[i]) / summa);
  const xs = bredder.map((_, i) => 0.46 + bredder.slice(0, i).reduce((a, b) => a + b, 0));
  const matt = rader.map((r, i) => {
    const varde = textHojd(v, r.text, bredder[i] - 0.4, VARDE, true);
    return { varde, under: r.under ? textHojd(v, r.under, bredder[i] - 0.4, UNDER) : 0 };
  });
  const h = Math.max(...matt.map((m) => 0.36 + m.varde + (m.under ? 0.04 + m.under : 0))) + 0.14;
  rect(s, 0, Y0, W, h, BAND); rect(s, 0, Y0 + h - 0.02, W, 0.02, INK);
  rader.forEach((r, i) => {
    if (i > 0) rect(s, xs[i] - 0.26, Y0, 0.01, h - 0.02, LINE);
    txt(s, versaler(r.namn), xs[i], Y0 + 0.11, bredder[i] - 0.4, 0.25, { mono: true, size: 12, color: GREY });
    txt(s, r.text, xs[i], Y0 + 0.36, bredder[i] - 0.4, matt[i].varde, { size: VARDE, bold: true });
    if (r.under) txt(s, r.under, xs[i], Y0 + 0.4 + matt[i].varde, bredder[i] - 0.4, matt[i].under, { size: UNDER, color: GREY });
  });
  return Y0 + h;
}

/** Stycken med en etikett över, som Stödundervisnings text på bild 1. Svarar höjden. */
function umStycken(v: Verktyg, s: any, x: number, y: number, w: number, rubrik: string | undefined, text: string[], size: number): number {
  const psa = 6 * size / 12;
  let h = 0;
  if (rubrik) { v.label(s, versaler(rubrik), x, y, w); h += 0.3; }
  const hojd = text.reduce((a, p) => a + textHojd(v, p, w, size), 0) + (text.length - 1) * psa / 72 / v.sy;
  v.txt(s, text.map((p, i) => ({ text: p, options: { breakLine: i < text.length - 1 } })), x, y + h, w, hojd, { size, psa });
  return h + hojd;
}

/**
 * Korten i en rad om två, som kärnans fyra komponenter på metodens sida: numret i en rund bricka, namnet, vad det är och
 * momenten i kursiv nederst, och foten i kursiv under korten. Svarar höjden.
 */
function umKortrad(v: Verktyg, s: any, x: number, y: number, w: number, rubrik: string | undefined, kort: { nr: number; namn: string; text: string; under: string }[], fot: string | undefined, z: number): number {
  const { frame, txt, label, pres, sx, sy, grad } = v;
  const TEXT = 10.5 * z, UNDER = 9.5 * z, MELLAN = 0.14, D = 0.3;
  const cw = (w - MELLAN) / 2, inre = cw - 0.24;
  // Namnen står så stora att det längsta ordet ryms på en rad i kortet, så att inget ord bryts mitt i, som
  // Samarbetsfärdigheter i en smal spalt (riggens punkt 6), och lika stora i alla kort.
  const plats = (inre - D - 0.1) * sx * 72 * 0.97;
  const NAMN = Math.min(12 * z, ...kort.flatMap((k) => k.namn.split(/\s+/)).map((o) => (12 * z * plats) / Math.max(1, calibriPunkter(o, 12 * z * grad, true))));
  let h = 0;
  if (rubrik) { label(s, versaler(rubrik), x, y, w); h += 0.3; }
  const matt = kort.map((k) => ({ namn: Math.max(D, textHojd(v, k.namn, inre - D - 0.1, NAMN, true)), text: textHojd(v, k.text, inre, TEXT), under: k.under ? textHojd(v, k.under, inre, UNDER) : 0 }));
  for (let i = 0; i < kort.length; i += 2) {
    const par = matt.slice(i, i + 2);
    const rad = Math.max(...par.map((m) => 0.1 + m.namn + 0.06 + m.text + (m.under ? 0.08 + m.under : 0) + 0.1));
    kort.slice(i, i + 2).forEach((k, j) => {
      const m = matt[i + j], cx = x + j * (cw + MELLAN), cy = y + h;
      frame(s, cx, cy, cw, rad, LINE, 0.75, WHITE);
      // Brickan är rund också i A4, där sidans mått förs över olika på bredden och höjden.
      const dia = D * Math.min(sx, sy);
      s.addText(String(k.nr), { shape: pres.ShapeType.ellipse, x: (cx + 0.12) * sx, y: (cy + 0.1) * sy, w: dia, h: dia, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, fontFace: SANS, fontSize: 11 * grad, bold: true, color: WHITE, align: 'center', valign: 'middle', margin: 0, fit: 'none' });
      txt(s, k.namn, cx + 0.12 + D + 0.1, cy + 0.1, inre - D - 0.1, m.namn, { size: NAMN, bold: true, valign: m.namn > D + 0.01 ? 'top' : 'middle' });
      txt(s, k.text, cx + 0.12, cy + 0.16 + m.namn, inre, m.text, { size: TEXT });
      if (k.under) txt(s, k.under, cx + 0.12, cy + rad - 0.1 - m.under, inre, m.under, { size: UNDER, italic: true, color: GREY });
    });
    h += rad + MELLAN;
  }
  if (fot) {
    const fh = textHojd(v, fot, w, TEXT);
    txt(s, fot, x, y + h, w, fh, { size: TEXT, italic: true, color: GREY, align: 'center' });
    h += fh + MELLAN;
  }
  return h - MELLAN;
}

/** En not i kräm med namnet i versaler först, som Stödundervisnings Klar tidigt på bild 2. Svarar höjden. */
function umNot(v: Verktyg, s: any, x: number, y: number, w: number, namn: string, text: string, size: number): number {
  // Namnet står i Consolas, som är bredare än Calibri; det räknas som Calibri i fet stil med två tecken till.
  const h = textHojd(v, `${versaler(namn)}WW ${text}`, w - 0.42, size, true) + 0.28;
  v.cream(s, x, y, w, h, text, size, versaler(namn));
  return h;
}

/** Checklistan i en ruta med mörk rubrik och en kryssruta per punkt, som Stödundervisnings checklista på bild 4. Svarar höjden. */
function umChecklista(v: Verktyg, s: any, x: number, y: number, w: number, rubrik: string, punkter: string[], size: number): number {
  const hs = punkter.map((t) => textHojd(v, `☐  ${t}`, w - 0.32, size) + 0.06);
  const h = 0.46 + hs.reduce((a, b) => a + b, 0) + 0.08;
  v.darkBox(s, versaler(rubrik), x, y, w, h);
  let cy = y + 0.46;
  punkter.forEach((t, i) => { v.txt(s, `☐  ${t}`, x + 0.16, cy, w - 0.32, hs[i], { size }); cy += hs[i]; });
  return h;
}

/** En ruta med mörk rubrik, en text och numrerade steg, som en rutin. Svarar höjden. */
function umRutan(v: Verktyg, s: any, x: number, y: number, w: number, rubrik: string, text: string, steg: string[], size: number): number {
  const inre = w - 0.32, indrag = 0.3;
  const th = text ? textHojd(v, text, inre, size) : 0;
  const sh = steg.map((t) => textHojd(v, t, inre - indrag, size) + 0.04);
  const h = 0.46 + th + (steg.length ? 0.08 + sh.reduce((a, b) => a + b, 0) : 0) + 0.1;
  v.darkBox(s, versaler(rubrik), x, y, w, h);
  if (text) v.txt(s, text, x + 0.16, y + 0.46, inre, th, { size });
  let cy = y + 0.46 + th + 0.08;
  steg.forEach((t, i) => {
    v.txt(s, `${i + 1}.`, x + 0.16, cy, indrag, sh[i], { size, bold: true, color: NAVY });
    v.txt(s, t, x + 0.16 + indrag, cy, inre - indrag, sh[i], { size });
    cy += sh[i];
  });
  return h;
}

/** Första lektionens minuter med det läraren säger, i en tabell med repliker i kursiv. Svarar höjden. */
function umMinuterna(v: Verktyg, s: any, x: number, y: number, w: number, rubrik: string, delar: { fas: string; tid: string; fraser: string[] }[], size: number): number {
  v.label(s, versaler(rubrik), x, y, w);
  const rader = delar.map((r) => [r.tid, r.fas, r.fraser.map((f) => `”${f}”`).join(' ')]);
  return 0.3 + v.gridTable(s, x, y + 0.3, w, UM_MINUTERNAS_KOLUMNER.map(versaler), rader, { bredder: [0.8, 1.2, w - 2], size, kursiv: [2], exakt: true });
}

/**
 * En tabell med etikett över. Varje kolumn rymmer sitt längsta ord på en rad, så att inget ord bryts mitt i
 * (miniwhiteboarden i första kolumnen, som är fet), och resten av bredden delas efter kolumnernas text. Svarar höjden.
 */
function umTabell(v: Verktyg, s: any, x: number, y: number, w: number, rubrik: string | undefined, kolumner: string[], rader: string[][], size: number): number {
  let h = 0;
  if (rubrik) { v.label(s, versaler(rubrik), x, y, w); h += 0.3; }
  const minsta = kolumner.map((_, i) => Math.max(...rader.flatMap((r) => String(r[i] ?? '').split(/\s+/)).map((o) => calibriPunkter(o, size * v.grad, i === 0) / 72 / v.sx)) + 0.24);
  const vikter = kolumner.map((k, i) => Math.max(k.length * 1.4, 10, rader.reduce((a, r) => a + String(r[i] ?? '').length, 0) / Math.max(1, rader.length)));
  const kvar = Math.max(0, w - minsta.reduce((a, b) => a + b, 0));
  const summa = vikter.reduce((a, b) => a + b, 0);
  const bredder = minsta.map((m, i) => m + (kvar * vikter[i]) / summa);
  return h + v.gridTable(s, x, y + h, w, kolumner.map(versaler), rader, { bredder, size, exakt: true });
}

// Planeringsbladets färger, som på sidan (global.css, .um-blad och .um-utfall): zonernas band, rutornas ton, det läraren
// skrev i grått när bladet är en förlaga, och utfallens tre färger.
const BLAD = { zon: NAVY, ton: BAND, fas: '143a6b', gra: '59636e' };
const UTFALLETS_FARG: Record<string, { fyll: string; kant: string }> = { nastanAlla: { fyll: 'e3f1e8', kant: '1e6b45' }, deFlesta: { fyll: 'fdf6e3', kant: 'c99700' }, halften: { fyll: 'eef0f3', kant: '6f7c8a' } };

/**
 * Planeringsbladet på lathundens tredje sida, efter samma regler och ord som Planeringsblad.astro: huvudet, Före lektionen,
 * Lektionen med beslutet och utfallens gränser för klassens antal, och Efter lektionen när planen har det. Zonerna står i
 * två spalter, delade där spalterna blir jämnast i höjd, och raden om förlagan står överst. Svarar höjden.
 */
function umPlaneringsblad(v: Verktyg, s: any, d: Um, x: number, y: number, w: number, del: Extract<LathundDel, { slag: 'planering' }>, z: number): number {
  const { rect, txt } = v;
  const plan = del.plan;
  const { mall, varianten, variantensNamn, delensTid, utfalletsText, delarna, planensDel, kryss, etikett, beslutetsFas, karnansNr } = planeringsbladet(d, plan, del.variant);
  const O = bladetsOrd(d);
  const amne = planensAmne(plan, del.exempel);
  const VARDE = del.gra ? BLAD.gra : INK;
  const ETIKETT = 9.5 * z, TEXT = 10.5 * z, ZON = 10.5 * z;
  // Ett fält: etiketten i grått och det läraren skrev i fet stil under, eh under fältets överkant.
  const falt = (s: any, fx: number, fy: number, fw: number, namn: string, varde: unknown, eh = textHojd(v, namn, fw, ETIKETT)) => {
    const vh = textHojd(v, varde ?? '', fw, TEXT, true);
    txt(s, namn, fx, fy, fw, eh, { size: ETIKETT, color: GREY });
    if (String(varde ?? '').trim()) txt(s, String(varde), fx, fy + eh, fw, vh, { size: TEXT, bold: true, color: VARDE });
    return eh + vh;
  };
  // Fälten i rader med lika bredd, där det läraren skrev börjar på samma höjd i en rad. En rad har så många fält att varje
  // fält rymmer sitt längsta ord, så att inget ord bryts mitt i (Lektion i arbetsområdet i en smal spalt i A4).
  const faltrad = (s: any, fx: number, fy: number, fw: number, falten: [string, unknown][]) => {
    const ordet = (t: unknown, size: number, fet: boolean) => Math.max(0, ...String(t ?? '').split(/\s+/).map((o) => calibriPunkter(o, size * v.grad, fet) / 72 / v.sx));
    const minsta = falten.map(([namn, varde]) => Math.max(ordet(namn, ETIKETT, false), ordet(varde, TEXT, true)) + 0.05);
    let n = falten.length;
    while (n > 1 && minsta.some((m) => m > (fw - 0.12 * (n - 1)) / n)) n--;
    const bw = (fw - 0.12 * (n - 1)) / n;
    let h = 0;
    for (let i = 0; i < falten.length; i += n) {
      const rad = falten.slice(i, i + n);
      const eh = Math.max(...rad.map(([namn]) => textHojd(v, namn, bw, ETIKETT)));
      h += Math.max(...rad.map(([namn, varde], j) => falt(s, fx + j * (bw + 0.12), fy + h, bw, namn, varde, eh))) + (i + n < falten.length ? 0.08 : 0);
    }
    return h;
  };
  // Zonens band, med en text efter namnet i vanlig vikt (minuterna i första lektionen).
  const zon = (s: any, zx: number, zy: number, zw: number, namn: string, efter?: string) => {
    rect(s, zx, zy, zw, 0.28, BLAD.zon);
    txt(s, [{ text: namn, options: { bold: true } }, ...(efter ? [{ text: efter }] : [])], zx + 0.1, zy + 0.04, zw - 0.2, 0.22, { size: ZON, color: WHITE });
    return 0.28 + 0.1;
  };
  // Rader med etikett till vänster och det läraren skrev till höger, som mallens Felet jag letar efter.
  const radlista = (s: any, rx: number, ry: number, rw: number, rader: [string, unknown][]) => {
    const ew = Math.min(1.2, rw * 0.36);
    let h = 0;
    for (const [namn, varde] of rader) {
      const rh = Math.max(textHojd(v, namn, ew - 0.06, ETIKETT), textHojd(v, varde ?? '', rw - ew, TEXT, true)) + 0.04;
      txt(s, namn, rx, ry + h, ew - 0.06, rh, { size: ETIKETT, color: GREY });
      if (String(varde ?? '').trim()) txt(s, String(varde), rx + ew, ry + h, rw - ew, rh, { size: TEXT, bold: true, color: VARDE });
      h += rh;
    }
    return h;
  };
  // En ruta i Före lektionen: tonad bakgrund, etiketten i fet stil och innehållet under.
  const ruta = (s: any, rx: number, ry: number, rw: number, namn: string, inne: (s: any, ix: number, iy: number, iw: number) => number) => {
    const eh = textHojd(v, namn, rw - 0.2, TEXT, true);
    const ih = inne(TORR, rx + 0.1, ry + 0.08 + eh + 0.03, rw - 0.2);
    const h = 0.08 + eh + 0.03 + ih + 0.08;
    rect(s, rx, ry, rw, h, BLAD.ton);
    txt(s, namn, rx + 0.1, ry + 0.08, rw - 0.2, eh, { size: TEXT, bold: true });
    inne(s, rx + 0.1, ry + 0.08 + eh + 0.03, rw - 0.2);
    return h;
  };

  const block: ((s: any, bx: number, by: number, bw: number) => number)[] = [
    // Huvudet: klassen, ämnet, datumet och lektionen, sedan målet och exit-lappen.
    (s, bx, by, bw) => {
      let h = faltrad(s, bx, by, bw, [[O.klass, plan.klass], ...(amne ? [[O.amne, amne] as [string, unknown]] : []), [O.datum, plan.datum], [O.lektion, plan.lektion]]) + 0.1;
      h += faltrad(s, bx, by + h, bw, [[O.mal, plan.mal], [O.belagg, plan.belagg]]) + 0.08;
      rect(s, bx, by + h, bw, 0.01, LINE);
      return h + 0.1;
    },
    // Före lektionen: mallens rutor och Förberett, under varandra.
    (s, bx, by, bw) => {
      let h = zon(s, bx, by, bw, O.fore);
      for (const r of (mall.fore ?? []) as { etikett: string; rader?: string[]; falt?: string | string[]; fot?: string; fotFalt?: string }[]) {
        h += ruta(s, bx, by + h, bw, r.etikett, (s, ix, iy, iw) => {
          let ih = 0;
          if (typeof r.falt === 'string') {
            const steg = bladetsLista(plan.fore?.[r.falt]).filter(Boolean);
            for (const [i, t] of steg.entries()) {
              const th = textHojd(v, t, iw - 0.25, TEXT, true);
              txt(s, `${i + 1}.`, ix, iy + ih, 0.25, th, { size: TEXT, bold: true, color: VARDE });
              txt(s, t, ix + 0.25, iy + ih, iw - 0.25, th, { size: TEXT, bold: true, color: VARDE });
              ih += th + 0.02;
            }
          } else ih += radlista(s, ix, iy, iw, (r.rader ?? []).map((rad, i) => [rad.replace(/:$/, ''), plan.fore?.[(r.falt as string[] | undefined)?.[i] ?? '']] as [string, unknown]));
          if (r.fot) {
            const t = [{ text: `${r.fot} `, options: { color: GREY } }, { text: String((r.fotFalt && plan.fore?.[r.fotFalt]) ?? ''), options: { bold: true, color: VARDE } }];
            const fh = textHojd(v, `${r.fot} ${(r.fotFalt && plan.fore?.[r.fotFalt]) ?? ''}`, iw, TEXT, true);
            txt(s, t, ix, iy + ih + 0.04, iw, fh, { size: TEXT });
            ih += 0.04 + fh;
          }
          return ih;
        }) + 0.08;
      }
      h += ruta(s, bx, by + h, bw, O.forberett, (s, ix, iy, iw) => radlista(s, ix, iy, iw, [[O.blad, plan.blad], [O.stod, plan.forberett]]));
      return h + 0.08;
    },
    // Lektionen: delarna med minuterna och kärnan, och beslutet efter delen där läraren ser om klassen är redo, med utfallens
    // gränser för klassen.
    (s, bx, by, bw) => {
      let h = zon(s, bx, by, bw, O.lektionen, varianten ? ` · ${O.minuterna} ${variantensNamn}` : undefined);
      const c1 = 1.3, rw = bw - c1 - 0.2;
      const rad = (s: any, ry: number, fas: string, tid: string, hoger: (s: any, hx: number, hy: number) => number) => {
        const fh = textHojd(v, fas, c1 - 0.16, TEXT, true), th = textHojd(v, tid, c1 - 0.16, ETIKETT);
        const hh = hoger(TORR, bx + c1 + 0.1, ry + 0.06);
        const rh = Math.max(fh + th, hh) + 0.12;
        rect(s, bx, ry, c1, rh, BLAD.ton);
        rect(s, bx, ry, bw, 0.01, LINE);
        txt(s, fas, bx + 0.08, ry + 0.06, c1 - 0.16, fh, { size: TEXT, bold: true, color: BLAD.fas });
        txt(s, tid, bx + 0.08, ry + 0.06 + fh, c1 - 0.16, th, { size: ETIKETT, color: GREY });
        hoger(s, bx + c1 + 0.1, ry + 0.06);
        return rh;
      };
      for (const del of delarna) {
        const text = planensDel(del.fas);
        const tid = `${delensTid(del.fas) ?? ''}${karnansNr(del.fas) ? ` · ${karnansNr(del.fas)}` : ''}`;
        h += rad(s, by + h, del.fas, tid, (s, hx, hy) => {
          let ih = 0;
          const skriv = del.skriv ? bladetsRad(del.skriv) : !text && del.not ? del.not : undefined;
          if (skriv) { const sh = textHojd(v, skriv, rw, ETIKETT); txt(s, skriv, hx, hy, rw, sh, { size: ETIKETT, color: GREY }); ih += sh; }
          if (text) { const th = textHojd(v, text, rw, TEXT, true); txt(s, text, hx, hy + ih, rw, th, { size: TEXT, bold: true, color: VARDE }); ih += th; }
          return ih;
        });
        if (del.fas === beslutetsFas && plan.beslut) {
          h += rad(s, by + h, O.beslutet, `${O.elever} ${plan.beslut.elever}`, (s, hx, hy) => {
            const uw = (rw - 0.16) / 3;
            const inne = (s: any, u: (typeof UTFALLEN)[number], ux: number, uy: number) => {
              const iw = uw - 0.2;
              let ih = 0;
              const nh = textHojd(v, u.namn, iw, TEXT, true);
              txt(s, u.namn, ux, uy, iw, nh, { size: TEXT, bold: true });
              ih += nh;
              const grans = `${utfalletsGrans(u.id, plan.beslut.elever)} ${utfalletsText(u.id)}`;
              const gh = textHojd(v, grans, iw, ETIKETT);
              txt(s, grans, ux, uy + ih, iw, gh, { size: ETIKETT, color: GREY });
              ih += gh;
              bladetsLista(mall.beslut?.[u.id]).forEach((namn, j) => {
                const varde = bladetsLista(plan.beslut[u.id])[j] ?? '';
                const rh = textHojd(v, `${namn} ${varde}`, iw, TEXT, true);
                txt(s, [{ text: `${namn} `, options: { color: GREY, fontSize: ETIKETT } }, { text: varde, options: { bold: true, color: VARDE } }], ux, uy + ih + 0.04, iw, rh, { size: TEXT });
                ih += 0.04 + rh;
              });
              return ih;
            };
            const uh = Math.max(...UTFALLEN.map((u) => inne(TORR, u, 0, 0))) + 0.14;
            UTFALLEN.forEach((u, i) => {
              const ux = hx + i * (uw + 0.08);
              const f = UTFALLETS_FARG[u.id];
              rect(s, ux, hy, uw, uh, f.fyll);
              rect(s, ux, hy, 0.05, uh, f.kant);
              inne(s, u, ux + 0.12, hy + 0.07);
            });
            return uh;
          });
        }
      }
      rect(s, bx, by + h, bw, 0.01, LINE);
      return h + 0.1;
    },
    // Efter lektionen, i huvudexemplets plan: fälten och kärnans kryss.
    ...(plan.efter ? [(s: any, bx: number, by: number, bw: number) => {
      let h = zon(s, bx, by, bw, O.efter);
      h += faltrad(s, bx, by + h, bw, [[etikett('kontrollen', 'Kontrollen'), plan.efter.kontrollen], [etikett('hogar', 'Exit-lapparna', true), plan.efter.hogar]]) + 0.06;
      h += falt(s, bx, by + h, bw, etikett('sag', 'Det jag såg'), plan.efter.sag) + 0.06;
      const kh = textHojd(v, O.karnanIlektionen, bw, ETIKETT);
      txt(s, O.karnanIlektionen, bx, by + h, bw, kh, { size: ETIKETT, color: GREY });
      h += kh;
      (d.karna?.komponenter ?? []).forEach((k: { kryss: string }, i: number) => {
        const pa = kryss.has(i + 1);
        const t = `${pa ? '☒' : '☐'} ${i + 1} ${k.kryss.replace(/\.$/, '')}`;
        const th = textHojd(v, t, bw, TEXT, pa);
        txt(s, t, bx, by + h, bw, th, { size: TEXT, bold: pa, color: VARDE });
        h += th;
      });
      h += 0.06 + faltrad(s, bx, by + h, bw, [[etikett('nasta', 'Nästa lektion: två snabba'), plan.efter.nasta], [etikett('forst', 'Jag går först till'), plan.efter.forst]]);
      return h + 0.1;
    }] : []),
    // Det läraren lägger till sist, i kursiv.
    ...(bladetsLista(plan.lagg).length ? [(s: any, bx: number, by: number, bw: number) => bladetsLista(plan.lagg).reduce((h, t) => { const th = textHojd(v, t, bw, TEXT); txt(s, t, bx, by + h, bw, th, { size: TEXT, italic: true, color: GREY }); return h + th + 0.06; }, 0)] : []),
  ];

  let top = y;
  if (del.text) { const th = textHojd(v, del.text, w, 11 * z); txt(s, del.text, x, y, w, th, { size: 11 * z, color: GREY }); top += th + 0.1; }
  // Två spalter: zonerna i ordning, delade där spalterna blir jämnast i höjd, och den vänstra spalten så bred att den högsta
  // spalten blir så låg som möjligt (lektionens tabell med beslutet behöver mest bredd).
  const hojd = (fran: number, till: number, bw: number) => block.slice(fran, till).reduce((a, b) => a + b(TORR, 0, 0, bw), 0);
  let delning = 1, andel = 0.45, bast = Infinity;
  for (const a of [0.46, 0.42, 0.38, 0.34]) for (let k = 1; k < block.length; k++) {
    const hh = Math.max(hojd(0, k, (w - 0.35) * a), hojd(k, block.length, (w - 0.35) * (1 - a)));
    if (hh < bast - 0.01) { bast = hh; delning = k; andel = a; }
  }
  const vw = (w - 0.35) * andel, hw = w - 0.35 - vw, hx = x + vw + 0.35;
  let vy = top, hy = top;
  for (const b of block.slice(0, delning)) vy += b(s, x, vy, vw);
  for (const b of block.slice(delning)) hy += b(s, hx, hy, hw);
  return Math.max(vy, hy) - y;
}
