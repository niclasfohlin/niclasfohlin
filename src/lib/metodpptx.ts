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
import { readFileSync } from 'node:fs';
import PptxGenJS from 'pptxgenjs';
import type { CollectionEntry } from 'astro:content';
import { FILM_UPPHOV, filmNamn, metodensFilmer } from './film';
import { filmbildensUppspelning, mp4Fil, omslagFil, provaFilmfiler } from './filmfil';
import { filmbildNamn, sidetikett } from './lathundsidor';
import TECKENBREDD from '../data/teckenbredd.json';
import { lathundFakta, arbetsformRad, etikettOchText, lathundForm, passOrd } from './metod';
import type { MetodData } from './metod';

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
    forberett: l.pass.forberett ? l.pass.forberett.text.join(' ') : undefined,
    // Rutans rubrik ur metoden, som på lathundssidan och i Word (K-075; förut fast DET JAG FÖRBEREDDE).
    forberettRubrik: versaler(l.pass.forberett?.rubrik ?? 'Det jag förberedde'),
    klarTidigt: l.pass.klarTidigt,
    schemaRubrik: versaler(l.pass.schema.rubrik),
    schema: l.pass.schema.rader.map((r) => ({ tid: r.tid, fas: r.fas, text: r.vad + (r.fraser.length ? ' ' + r.fraser.map(citat).join(' · ') : '') })),
    anteckning: `${d.titel}, ett pass ${passOrd(d).forSteg} med ett exempel.`,
  };
  // Bild 3, mallen. Underraden delas: det med skrivlinjer (Elev: ______) till höger, resten till vänster.
  const delar = (l.mall.underrad ?? '').split(' · ');
  const hoger = delar.filter((x) => /_{3,}/.test(x));
  const vanster = delar.filter((x) => !/_{3,}/.test(x));
  const block: any[] = l.mall.block.map((x) => (x.typ === 'snabbmall' ? { typ: 'snabbmall', rubrik: `SNABBMALL · ${d.titel}`, fore: d.snabbmall!.fore, efter: d.snabbmall!.efter } : x));
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
      ...(d.uppfoljning?.rader ?? []).map((r) => `**${r.nar}:** ${r.vad}`),
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
function calibriRader(text: string, tum: number, punkter: number, fet = false): number {
  const tabell = (TECKENBREDD.bredd as Record<string, (number | null)[]>)[fet ? 'Calibri fet' : 'Calibri'];
  const bredd = (ord: string) => [...ord].reduce((s, c) => s + (tabell[TECKENINDEX.get(c) ?? -1] ?? 600) / 1000, 0) * punkter;
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
  const format = o.format ?? '16:9';
  let valt = ritaLathund(m, o.bas, '16:9', 1, format !== 'A4');
  if (format === 'A4') {
    const slag = (v: string) => v.replace(/\d+(?:[.,]\d+)?/g, '#');
    const tillatna = new Set(valt.varningar.map(slag));
    let vald = 0;
    for (const grad of GRADER) {
      vald = grad;
      valt = ritaLathund(m, o.bas, 'A4', grad);
      if (valt.varningar.every((v) => tillatna.has(slag(v)))) break;
    }
    console.log(`  ${m.id}: lathunden i A4 med ${Math.round(vald * 100)} procent av teckengraden`);
  }
  for (const v of valt.varningar) console.warn(`  ! ${m.id}${format === 'A4' ? ' (A4)' : ''}: ${v}`);
  // Filen komprimeras: okomprimerad vägde lathunden 235 kB, komprimerad 32 kB (K-243, mätt på Ordverkstad i grupp).
  const buffert = (await valt.pres.write({ outputType: 'nodebuffer', compression: true })) as Buffer;
  return valt.filmer.length ? filmbildensUppspelning(buffert, 1, valt.filmer, m.data.uppdaterad ?? m.data.publicerad) : buffert;
}

// Ritar bilderna i formatet med teckengraden gånger grad och samlar varningarna: lathundens fyra, och i 16:9 filmbilden
// före dem. filmer är textalternativet för varje film på filmbilden, i bildens ordning; tom när filen inte har någon.
function ritaLathund(m: CollectionEntry<'stodundervisning'>, bas: string, format: LathundFormat, grad: number, medFilmer = true): { pres: any; varningar: string[]; filmer: string[] } {
  const o = { bas };
  const d = m.data;
  if (!d.lathund) throw new Error(`${m.id} har ingen lathund`);
  const L = bilder(d);
  // Filmbilden står först i 16:9-filen. medFilmer är falskt när bilderna bara ritas för att samla varningar.
  const filmer = format === '16:9' && medFilmer ? metodensFilmer(d, m.id) : [];
  const Pptx: any = (PptxGenJS as any).default ?? PptxGenJS;
  const pres = new Pptx();
  const sida = SIDA[format];
  const sx = sida.w / W, sy = sida.h / H;
  if (format === '16:9') pres.layout = 'LAYOUT_WIDE';
  else { pres.defineLayout({ name: 'A4_LIGGANDE', width: sida.w, height: sida.h }); pres.layout = 'A4_LIGGANDE'; }
  pres.lang = 'sv-SE';
  pres.author = 'Niclas Fohlin';
  pres.company = 'niclasfohlin.se';
  pres.title = `Lathund: ${d.titel}`;
  pres.subject = d.ingress;
  const adress = `${o.bas.replace(/^https?:\/\//, '')}/stodundervisning/${m.id}/lathund`;
  const upphov = `© Niclas Fohlin · ${adress}`;
  const varningar: string[] = [];
  const varna = (t: string) => { varningar.push(t); };

  // ---------------------------------------------------------------- primitiver
  // Alla mått nedan är i 16:9-bildens tum; primitiverna för över dem till sidans format (sx, sy).
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
  function gridTable(s: any, x: number, y: number, w: number, kolumner: string[], rader: string[][], o: any = {}) {
    const n = kolumner.length;
    const bredder: number[] = o.bredder ?? kolumner.map((_k, i) => (i === 0 ? 0.9 : 1) * w / (n - 0.1));
    const sum = bredder.reduce((a, b) => a + b, 0);
    const ws = bredder.map((b) => b / sum * w);
    const size = o.size ?? 11;
    const hs = rader.map((r) => r.every((c) => !String(c).trim()) ? (o.tomHojd ?? 0.34) : Math.max(o.elev ? 0.34 : 0.3, ...r.map((c, i) => estH(c, ws[i] - 0.16, size, 0.12))));
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
        if (String(c).trim()) txt(s, plain(c), cx2 + 0.08, cy + 0.06, ws[i] - 0.14, hs[ri] - 0.08, { size, bold: i === 0 && !o.elev });
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

  // ---------------------------------------------------------------- FILMERNA
  // Metodens filmer som mp4, i bredd efter antalet: en stor i mitten, två i bredd eller tre i bredd (Niclas 2026-10-07:
  // "ha dem i en grid slide 1 (grupperade beroende på antal) som första slide med text under"). Över varje film står en
  // liten speltriangel, filmens nummer och längd, under den filmens namn och dess fyra bildtexter. Omslagsbilden har
  // inget spelmärke över sig: det täckte ordet mitt i filmen, och i Google Presentationer, som gör filmerna till
  // stillbilder, såg det ut som en trasig film. Raden nederst säger var filmerna spelar då.
  if (filmer.length) {
    const s = pres.addSlide();
    const n = filmer.length;
    header(s, d.titel, filmbildNamn(n));
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
      provaFilmfiler(f, d.titel);
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
    s.addNotes(`${d.titel}, ${n === 1 ? 'filmen' : 'filmerna'}: ${namn.join(', ')}. ${upphov} ${FILM_UPPHOV}`);
  }

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
    const storyH = BOTTEN - top2 - (c1H ? c1H + 0.15 : 0) - (c2H ? c2H + 0.15 : 0);
    frame(s, 0.46, top2, 5.27, storyH, LINE, 0.75, CELL);
    const need = b.exempel.reduce((a, p) => a + estH(p, 4.97, 11.5, 0.07), 0);
    if (need > storyH + 0.1) varna(`exemplet på bild 2 är långt (${need.toFixed(2)} > ${(storyH - 0.2).toFixed(2)} tum): korta lathund.pass.text till cirka 130 ord`);
    // Exemplet berättas rakt och replikerna (”…”) kursiva, som på sidan, i lathunden och i Word.
    const repliker = (t: string, sist: boolean) => t.split(/(”[^”]*”)/).filter(Boolean).map((x, j, alla) => ({ text: x, options: { italic: x.startsWith('”'), breakLine: !sist && j === alla.length - 1 } }));
    txt(s, b.exempel.flatMap((t, i) => repliker(t, i === b.exempel.length - 1)), 0.61, top2 + 0.1, 4.97, storyH - 0.2, { size: 11.5, psa: 5 });
    let y = top2 + storyH + 0.15;
    if (b.forberett) { cream(s, 0.46, y, 5.27, c1H, b.forberett, 12, b.forberettRubrik); y += c1H + 0.15; }
    if (b.klarTidigt) cream(s, 0.46, y, 5.27, c2H, b.klarTidigt, 12, 'KLAR TIDIGT');
    label(s, b.schemaRubrik, 6.22, 0.88, 6.9);
    shapeTable(s, 6.22, 1.2, 6.66, 1.45, ['TID', 'VAD HÄNDER'], b.schema.map((r) => ({ namn: r.tid, fet: r.fas, rader: [r.text] })), BOTTEN - 1.2);
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
    // 2026-10-02, K-168). Consolas är 0,55 gånger graden bred.
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
    let y = top + 0.45;
    const kh = b.kallor.map((k) => Math.max(0.42, estH(k, 6.2, 12.25, 0.08)));
    b.kallor.forEach((k, i) => { txt(s, rich(k), 0.46, y, 6.2, kh[i], { size: 12.25 }); y += kh[i] + 0.06; });
    if (b.kallorEfter) { const eh = estH(b.kallorEfter, 6.2, 11.5, 0.08); txt(s, b.kallorEfter, 0.46, y, 6.2, eh, { size: 11.5, color: GREY }); y += eh + 0.06; }
    const rowsN = Math.ceil(b.bord.length / 2);
    const bordY = Math.max(y + 0.15, BOTTEN - (0.5 + rowsN * 0.55)), bordH = BOTTEN - bordY, rh = Math.min(0.55, (bordH - 0.5) / rowsN);
    if (y + 0.15 > bordY + 0.01) varna('bild 4: källorna är många eller långa, rutan "På bordet" trängs');
    // Raderna i rutan (korta saker, en rad var) får inte stå tätare än 0,9 gånger teckengraden, bokstävernas egen
    // höjd, annars skriver de över varandra och rutans kant. Räknat på sidan, i graden som används.
    const radEm = (rh * sy * 72) / (12 * grad);
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
