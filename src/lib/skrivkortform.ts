// Skrivkortet i Word, ett till ett med metodriggens build/skrivkortform.js (Kortskrivning: skriv varje dag, 2026-10-14):
// ett stående kort på ett eget A4, och en Word-fil per nivå med ett kort per sida. Utskriften av ett kort på sidan som
// slumpar dem (src/pages/stodundervisning/[id]/skrivkort.astro) är kortets sida ur nivåns pdf, som Word har gjort av den
// här filen (scripts/bankpdf.mjs) och scripts/pdfdelar.mjs klipper ut, så att utskriften och Word-filen är samma sida.
//
// Formen är riggens (Niclas 2026-10-13 och 14, riggens skrivkortsstandard.md): bilden, citatet och händelsen bär kortet,
// och en egen text står under dem bara när kortet har en. Ett bildkort utan egen text har uppgiften under bilden, och foten
// har den då inte en gång till. Texten står i elevens typsnitt, vänsterställd, stor och gles, årtalet och citattecknet i
// Anton och namnet under ett citat i Cinzel. Foten är lika på alla kort: metodens fråga, nivån och numret som en knapp i
// nivåns färg och bildens upphov. Kortet är en tabell med en kolumn, utan textrutor och med rader som har minsta höjd utan
// cellmarginal upptill och nedtill, så att det håller i Word och i Google Dokument (wordparitet, REGLER.md). Storleken på
// texten väljs med Andikas teckenbredder (src/data/typsnitt/andika-bredder.json, riggens design/typsnitt/andika/
// bredder.json), så att kortet blir samma som riggens.
//
// Rättas formen, rättas den hos riggen också. Sajten lägger till sidfoten med upphov och adress, som allt som laddas ner
// bär (CLAUDE.md), i sidans nedre marginal, där den inte tar plats från kortet. Riggens form för fyra kort på ett A4 att
// klippa står inte här: sidan som slumpar skriver ut ett kort per sida.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AlignmentType, BorderStyle, Document, Footer, HeightRule, ImageRun, Paragraph, ShadingType, Tab, Table, TableCell, TableRow,
  TabStopType, TextRun, VerticalAlign, WidthType,
} from 'docx';
import ANDIKA from '../data/typsnitt/andika-bredder.json';
import { ELEVTYPSNITT, ELEVTYPSNITT_TTF } from './ljudkort';
import { BOKTYPSNITT_TTF, FAKTATYPSNITT_TTF } from './ramform';
import { nivansKort, type Bibliotek, type Skrivkort } from './skrivkort';

const ELEV = ELEVTYPSNITT, TAL = 'Anton', NAMN = 'Cinzel', HUS = 'Arial';
const FARG = { text: '2B2622', dov: '8A8177', linje: 'D9D2C7' };
const PAGE_W = 11909, PAGE_H = 16834;
const MARGINAL = 850;
const NBSP = ' ';
const BREDD = ANDIKA as Record<string, number>;
const STORLEK: Record<string, { bild: number; handelse: number; handelseUtan: number; citat: number }> = {
  Bas: { bild: 38, handelse: 34, handelseUtan: 40, citat: 30 },
  Medel: { bild: 32, handelse: 30, handelseUtan: 34, citat: 28 },
  Avancerat: { bild: 27, handelse: 26, handelseUtan: 30, citat: 25 },
};

const bredd = (t: string, pt: number) => [...String(t)].reduce((a, c) => a + (BREDD[c] ?? 0.56), 0) * pt;
// Antalet rader som texten tar i en spalt som är b punkter bred. Raderna i texten (\n) är egna rader.
function rader(text: string, b: number, pt: number) {
  let n = 0;
  for (const st of String(text).split('\n')) {
    let rad = 0; n++;
    for (const o of st.split(' ')) {
      const w = bredd(o, pt), mellan = rad ? bredd(' ', pt) : 0;
      if (rad && rad + mellan + w > b) { n++; rad = w; } else rad += mellan + w;
    }
  }
  return n;
}
// Den största storleken, från start och nedåt i halva punkter, där texten tar högst max rader.
function passa(text: string, b: number, start: number, minst: number, max: number) {
  let pt = start;
  while (pt > minst && rader(text, b, pt) > max) pt -= 0.5;
  return pt;
}
const punkt = (o: Record<string, unknown> = {}) => new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, run: { size: 2, font: HUS }, ...o, children: [new TextRun({ text: '', size: 2, font: HUS })] });
// Ett stycke i elevens typsnitt. Rader i texten blir radbrytningar, och ned sänker texten i sin rad. Sänkningen står i
// halva punkter utan enhet, som riggen skriver den (w:position): docx skriver texten som den är, men dess typ vill ha en
// enhet, därav typen nedan.
type Hojning = `-${number}pt`;
function stycke(text: string, { pt, farg = FARG.text, font = ELEV, fore = 0, efter = 0, line = 216, keepNext = false, ned = 0 }: { pt: number; farg?: string; font?: string; fore?: number; efter?: number; line?: number; keepNext?: boolean; ned?: number }) {
  const delar = String(text).split('\n');
  return new Paragraph({
    alignment: AlignmentType.LEFT, keepNext, spacing: { before: fore, after: efter, line },
    children: delar.map((d, i) => new TextRun({ text: d, size: Math.round(pt * 2), color: farg, font, ...(ned ? { position: String(-Math.round(ned * 2)) as Hojning } : {}), ...(i ? { break: 1 } : {}) })),
  });
}
// En kort linje i nivåns färg: ett stycke på en punkt med kant under, indraget från höger.
const kortLinje = (farg: string, innerB: number, langd: number, fore: number, efter: number) => punkt({ indent: { right: Math.max(0, innerB - langd) }, spacing: { before: fore, after: efter, line: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: farg, space: 1 } } });

export interface Kortbild { data: Buffer; rad: string; alt: string }

// Ett kort som en tabell med en kolumn: innehållet i en eller flera rader, och foten sist. B och H är kortets bredd och
// höjd i twips. bild är bildens fil, upphovsrad och textalternativ, eller inget när kortet saknar bild.
function kortTabell(b: Bibliotek, k: Skrivkort, { B, H, bild }: { B: number; H: number; bild?: Kortbild }) {
  const niva = b.nivaer.find((n) => n.namn === k.niva)!;
  const ram = { style: BorderStyle.SINGLE, size: 12, color: niva.farg };
  const ingen = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  // Cellens marginaler står i hela bildpunkter, 15 twips, som Google ritar dem (wordparitet, REGLER.md).
  const marX = Math.round(640 / 15) * 15, innerB = B - 2 * marX, innerPt = innerB / 20;
  const bildPx = Math.floor((B - 40) / 15), bildH = Math.round((bildPx * 2) / 3) * 15;
  const fotH = 760 + (bild ? 170 : 0);
  // Luften mellan radernas summa och kortets höjd: bildens rad är några punkter högre än bilden, och kanterna tar plats.
  const LUFT = 200;
  const STD = { top: 280, bottom: 280, left: marX, right: marX };
  type Mar = typeof STD;
  const cell = (children: (Paragraph | Table)[], o: { mar?: Mar; overst?: boolean; nederst?: boolean; linje?: boolean } = {}) => new TableCell({
    width: { size: B, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: o.mar ?? STD,
    borders: { top: o.overst ? ram : (o.linje ? { style: BorderStyle.SINGLE, size: 4, color: FARG.linje } : ingen), bottom: o.nederst ? ram : ingen, left: ram, right: ram },
    children,
  });
  // En rad med satt höjd har ingen cellmarginal upptill eller nedtill (wordparitet, REGLER.md: Word lägger marginalerna
  // utanpå höjden, och Google räknar in dem). Luften ligger i stället som ett stycke på en punkt med avstånd, först och
  // sist i cellen, och radens höjd är hela raden i båda.
  const PUNKT = 23;
  const luft = (fore: number, efter: number) => punkt({ spacing: { before: Math.max(0, fore), after: Math.max(0, efter), line: 240 } });
  const rad = (children: Paragraph[], o: { mar?: Mar; overst?: boolean; nederst?: boolean; linje?: boolean } = {}, hojd?: number) => {
    const mar = o.mar ?? STD;
    if (!hojd) return new TableRow({ cantSplit: true, children: [cell(children, o)] });
    return new TableRow({ cantSplit: true, height: { value: Math.max(120, Math.round(hojd / 15) * 15), rule: HeightRule.ATLEAST },
      children: [cell([luft(mar.top - PUNKT, 0), ...children, luft(0, mar.bottom - PUNKT)], { ...o, mar: { ...mar, top: 0, bottom: 0 } })] });
  };
  const bildrad = (o: { overst?: boolean } = {}) => rad([new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, line: 240 }, run: { size: 2, font: HUS }, children: [new ImageRun({ type: 'jpg', data: bild!.data, transformation: { width: bildPx, height: Math.round((bildPx * 2) / 3) }, altText: { title: k.bild ?? '', description: bild!.alt, name: k.bild ?? '' } })] })], { mar: { top: 0, bottom: 0, left: 0, right: 0 }, ...o });
  const rader_: TableRow[] = [];
  const egen = String(k.text ?? '').trim();
  const utanFraga = k.form === 'bild' && !egen && !!bild;
  const s = STORLEK[k.niva] ?? STORLEK.Medel;
  if (k.form === 'bild' && bild) {
    const txt = egen || b.fragaBild;
    const pt = passa(txt, innerPt, s.bild, 20, 5);
    rader_.push(bildrad({ overst: true }));
    rader_.push(rad([stycke(txt, { pt })], {}, H - bildH - fotH - LUFT));
  } else if (k.form === 'handelse' && k.handelse) {
    const h = k.handelse;
    if (bild) {
      const vadPt = passa(h.vad, innerPt, egen ? 23 : 27, 17, egen ? 2 : 4);
      const huvud = [stycke(String(h.ar), { pt: 76, farg: niva.farg, font: TAL, line: 240, keepNext: true }), stycke(h.vad, { pt: vadPt, fore: 40 })];
      const huvudMar = { top: 200, bottom: 220, left: marX, right: marX };
      if (egen) {
        const pt = passa(egen, innerPt, s.handelse, 19, 4);
        const huvudH = Math.round((76 * 1.5 + rader(h.vad, innerPt, vadPt) * vadPt * 1.5) * 20) + 420;
        rader_.push(rad(huvud, { overst: true, mar: huvudMar }));
        rader_.push(bildrad());
        rader_.push(rad([stycke(egen, { pt })], {}, Math.max(1500, H - huvudH - bildH - fotH - LUFT)));
      } else {
        // Utan egen text: årtalet och meningen får resten av kortets höjd, och bilden står närmast foten.
        rader_.push(rad(huvud, { overst: true, mar: huvudMar }, H - bildH - fotH - LUFT));
        rader_.push(bildrad());
      }
    } else {
      const vadPt = passa(h.vad, innerPt, egen ? 30 : 34, 22, egen ? 4 : 7);
      rader_.push(rad([
        stycke(String(h.ar), { pt: 150, farg: niva.farg, font: TAL, line: 240, keepNext: true }),
        stycke(h.vad, { pt: vadPt, fore: 120, keepNext: !!egen }),
        ...(egen ? [kortLinje(niva.farg, innerB, 1700, 520, 520), stycke(egen, { pt: passa(egen, innerPt, s.handelseUtan, 22, 5) })] : []),
      ], { overst: true }, H - fotH - LUFT));
    }
  } else if (k.form === 'citat' && k.citat) {
    const c = k.citat;
    // En vers har egna rader: storleken väljs så att varje versrad står hel, ned till 24 punkter. Sedan får raderna brytas.
    const versrader = String(c.rad).split('\n').filter(Boolean);
    let citatPt = 36;
    if (versrader.length > 1) while (citatPt > 24 && Math.max(...versrader.map((r) => bredd(r, citatPt))) > innerPt * 0.98) citatPt -= 0.5;
    citatPt = passa(c.rad, innerPt, citatPt, 22, 9);
    const under = [c.verk, c.ar].filter(Boolean).join(', ');
    rader_.push(rad([
      // Citattecknet sitter högt i sin rad. Det sänks, så att luften hamnar över tecknet och inte mellan tecknet och citatet.
      stycke('”', { pt: 110, farg: niva.farg, font: TAL, line: 96, keepNext: true, ned: 110 * 0.62 }),
      stycke(c.rad, { pt: citatPt, line: 228, keepNext: true }),
      kortLinje(niva.farg, innerB, 1700, 360, 200),
      new Paragraph({ spacing: { before: 0, after: 0, line: 276 }, keepNext: !!egen, children: [
        new TextRun({ text: c.vem, font: NAMN, size: 30, color: FARG.text }),
        ...(under ? [new TextRun({ text: `${NBSP}${NBSP}${NBSP}${under}`, font: ELEV, size: 25, color: FARG.dov })] : []),
      ] }),
      ...(egen ? [stycke(egen, { pt: passa(egen, innerPt, s.citat, 19, 4), fore: 760 })] : []),
    ], { overst: true }, H - fotH - LUFT));
  } else {
    throw new Error(`Skrivkortet ${k.id} har formen ${k.form} utan sitt innehåll${k.form === 'bild' ? ' (bilden saknas)' : ''}.`);
  }
  // Foten: den fasta frågan till vänster, nivån och numret som en knapp till höger, och bildens upphov under.
  const knapp = { font: NAMN, color: 'FFFFFF', shading: { type: ShadingType.CLEAR, fill: niva.farg, color: 'auto' }, size: 23 };
  const fragaPt = 12;
  const tabb = [{ type: TabStopType.RIGHT, position: B - 2 * 360 }];
  const fragan = new TextRun({ text: utanFraga ? '' : b.fraga, font: ELEV, size: fragaPt * 2, color: FARG.text });
  const knappen = [new TextRun({ children: [new Tab()], size: fragaPt * 2 }), new TextRun({ text: `${NBSP}${NBSP}${k.niva.toUpperCase()}${NBSP}${NBSP}·${NBSP}${NBSP}${k.nr}${NBSP}${NBSP}`, ...knapp })];
  const upphov = bild ? [new TextRun({ text: bild.rad, font: HUS, size: 15, color: FARG.dov })] : [];
  rader_.push(rad([
    new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, tabStops: tabb, children: [fragan, ...knappen] }),
    ...(bild ? [new Paragraph({ spacing: { before: 40, after: 0, line: 240 }, children: upphov })] : []),
  ], { linje: true, nederst: true, mar: { top: 150, bottom: 130, left: 360, right: 360 } }, fotH));
  return new Table({ width: { size: B, type: WidthType.DXA }, columnWidths: [B], layout: 'fixed', rows: rader_ });
}

/** Bilden till ett kort, ur metodens mapp i public/. Bygget stannar när filen saknas. */
export function kortbild(id: string, b: Bibliotek, k: Skrivkort): Kortbild | undefined {
  if (!k.bild) return undefined;
  const x = b.bilder[k.bild];
  return { data: readFileSync(join(process.cwd(), 'public', 'stodundervisning', id, 'skrivkort', x.fil)), rad: x.rad, alt: x.alt };
}

/** Nivåns Word-fil: korten i nummerordning, ett per sida. */
export function skrivkortDokument(id: string, b: Bibliotek, niva: string, adress: string): Document {
  const lista = nivansKort(b, niva);
  if (!lista.length) throw new Error(`Skrivkorten i ${id} har inga kort på nivån ${niva}.`);
  const B = PAGE_W - 2 * MARGINAL, H = Math.floor((PAGE_H - 2 * MARGINAL - 2 * 24 - 220) / 15) * 15;
  const children: (Paragraph | Table)[] = [];
  lista.forEach((k, i) => { children.push(punkt(i ? { pageBreakBefore: true } : {})); children.push(kortTabell(b, k, { B, H, bild: kortbild(id, b, k) })); });
  children.push(punkt());
  const las = (fil: string) => readFileSync(join(process.cwd(), 'public', fil.replace(/^\//, '')));
  const fot = new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, line: 240 }, children: [new TextRun({ text: `© Niclas Fohlin · ${adress}`, font: HUS, size: 14, color: FARG.dov })] });
  return new Document({
    creator: 'Niclas Fohlin', title: `Skrivkort: ${niva}`,
    fonts: [
      { name: ELEV, data: las(ELEVTYPSNITT_TTF) },
      { name: TAL, data: las(FAKTATYPSNITT_TTF) },
      { name: NAMN, data: las(BOKTYPSNITT_TTF.cinzel) },
    ],
    styles: { default: { document: { run: { font: HUS, size: 22, color: FARG.text }, paragraph: { spacing: { line: 276 } } } } },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGINAL, bottom: MARGINAL, left: MARGINAL, right: MARGINAL, header: 300, footer: 300 } } },
      footers: { default: new Footer({ children: [fot] }) },
      children,
    }],
  });
}
