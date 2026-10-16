// Aktivitetskortet i Word, ett till ett med metodriggens build/kortform.js (Gruppstärkande aktiviteter, 2026-10-16): ett
// kort per A4, och en Word-fil per kategori med ett kort per sida. Utskriften av ett kort på sidan Ta fram en aktivitet
// ([id]/aktiviteter.astro) är kortets sida ur kategorins pdf, som Word har gjort av den här filen (scripts/bankpdf.mjs)
// och scripts/pdfdelar.mjs klipper ut, så att utskriften och Word-filen är samma sida (METODER.md under Utskriften), och
// korten i listan att skriva ut fogas ihop i webbläsaren av sina sidor.
//
// Formen är riggens (Niclas 2026-10-16: "Tänk på att både brainbreaks och gruppstärkande blir som kort med en enhetlig
// design som kan reproduceras. Ska vara enkel att förstå", riggens kortstandard.md): ett band i kategorins färg med
// kategorin och numret, som nivåknappen på skrivkorten, namnet i elevens typsnitt, raden om vad gruppen gör, faktaraden
// (gruppen, tiden, platsen och Rör vid varandra), bilden i en enda linje, Så gör ni som en numrerad lista, och Material
// och Att tänka på i två kolumner. Kortet är stycken och tabeller utan textrutor och utan exakta radhöjder, så att det
// håller i Word och i Google Dokument (wordparitet, REGLER.md). Bilden är en svg med en reservbild ritad vid bygget
// (src/lib/metodresurser.ts, medReservbilder).
//
// Rättas formen, rättas den hos riggen också. Sajten lägger upphovet med adressen i sidfoten, som allt som laddas ner
// bär (CLAUDE.md), där riggen har metodens namn.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AlignmentType, BorderStyle, Document, Footer, ImageRun, Paragraph, ShadingType, Tab, Table, TableCell, TableRow,
  TabStopType, TextRun, VerticalAlign, WidthType,
} from 'docx';
import { ELEVTYPSNITT, ELEVTYPSNITT_TTF } from './ljudkort';
import { BOKTYPSNITT_TTF } from './ramform';
import { kategorinsKort, platsText, type Aktivitet, type Aktivitetsbank, type Aktivitetskategori } from './aktiviteter';

const ELEV = ELEVTYPSNITT, NAMN = 'Cinzel', HUS = 'Arial';
const FARG = { text: '2B2622', dov: '6F675E', linje: 'D9D2C7' };
const PAGE_W = 11909, PAGE_H = 16834, MARGINAL = 850;
const NBSP = ' ';
const ingen = { style: BorderStyle.NONE, size: 0, color: 'auto' } as const;
const utanKant = { top: ingen, bottom: ingen, left: ingen, right: ingen };
// En tabell utan kanter, också mellan cellerna.
const tabellUtanKant = { ...utanKant, insideHorizontal: ingen, insideVertical: ingen };

type Png = (svg: Uint8Array, bredd: number, hojd: number) => Uint8Array | undefined;

const halvpunkt = (pt: number) => Math.round(pt * 2);
const punkt = (o: Record<string, unknown> = {}) => new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, run: { size: 2, font: HUS }, ...o, children: [new TextRun({ text: '', size: 2, font: HUS })] });
// Stycket som Google Dokument kräver efter en tabell sist i ett avsnitt.
const hjalp = () => new Paragraph({ spacing: { before: 0, after: 0, line: 30 }, run: { size: 2, font: HUS }, children: [new TextRun({ text: '', size: 2, font: HUS })] });
function stycke(text: string, { pt = 11, farg = FARG.text, font = HUS, fore = 0, efter = 0, line = 264, fet = false, keepNext = false }: { pt?: number; farg?: string; font?: string; fore?: number; efter?: number; line?: number; fet?: boolean; keepNext?: boolean } = {}) {
  return new Paragraph({
    alignment: AlignmentType.LEFT, keepNext, spacing: { before: fore, after: efter, line },
    children: String(text).split('\n').map((d, i) => new TextRun({ text: d, size: halvpunkt(pt), color: farg, font, bold: fet, ...(i ? { break: 1 } : {}) })),
  });
}
// En rad i en lista: numret eller pricken i kortets färg, och texten med hängande indrag.
function listrad(markor: string, text: string, farg: string, { pt = 11, efter = 70, indrag = 400 } = {}) {
  return new Paragraph({
    spacing: { before: 0, after: efter, line: 264 }, indent: { left: indrag, hanging: indrag },
    tabStops: [{ type: TabStopType.LEFT, position: indrag }],
    children: [new TextRun({ text: markor, bold: true, color: farg, size: halvpunkt(pt), font: HUS }), new TextRun({ children: [new Tab()], size: halvpunkt(pt) }), new TextRun({ text: String(text), color: FARG.text, size: halvpunkt(pt), font: HUS })],
  });
}
// Bandet överst: kategorin till vänster och numret till höger, vitt på kategorins färg.
function band(B: number, farg: string, vanster: string, hoger: string, pt = 11.5) {
  const run = (text: string) => new TextRun({ text, font: NAMN, color: 'FFFFFF', size: halvpunkt(pt) });
  return new Table({
    width: { size: B, type: WidthType.DXA }, columnWidths: [B], layout: 'fixed', borders: tabellUtanKant,
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      width: { size: B, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: farg, color: 'auto' }, borders: utanKant,
      margins: { top: 105, bottom: 90, left: 240, right: 240 }, verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, tabStops: [{ type: TabStopType.RIGHT, position: B - 480 }], children: [run(vanster.toUpperCase()), new TextRun({ children: [new Tab()], size: halvpunkt(pt) }), run(hoger.toUpperCase())] })],
    })] })],
  });
}
const tunnLinje = (farg: string, fore = 160, efter = 160) => punkt({ spacing: { before: fore, after: efter, line: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: farg, space: 1 } } });

/** Bilden till ett kort, ur metodens mapp i public/. Bygget stannar när filen saknas. */
export const kortbildSvg = (id: string, fil: string) => readFileSync(join(process.cwd(), 'public', 'stodundervisning', id, 'kort', fil));

/** Aktivitetskortet, ett A4. B är kortets bredd i twips. */
function aktivitetKort(kat: Aktivitetskategori, k: Aktivitet, { B, svg, png }: { B: number; svg: Uint8Array; png: Png }) {
  const farg = kat.farg;
  const delar: (Paragraph | Table)[] = [];
  delar.push(band(B, farg, kat.namn, String(k.nr)));
  delar.push(stycke(k.namn, { pt: 28, font: ELEV, fore: 220, efter: 60, line: 240, keepNext: true }));
  delar.push(stycke(k.rad, { pt: 12.5, efter: 90, line: 276, keepNext: true }));
  const fakta = [k.grupp, k.tid, platsText(k.plats), ...(k.beroring ? ['Rör vid varandra'] : [])].filter(Boolean).join(`${NBSP}${NBSP}·${NBSP}${NBSP}`);
  delar.push(stycke(fakta, { pt: 10, farg, fet: true, efter: 120, keepNext: true }));
  // Bilden i 3:2, 72 procent av kortets bredd, i bildpunkter (15 twips per bildpunkt).
  const bx = Math.round((B * 0.72) / 15), by = Math.round((bx * 2) / 3);
  const reserv = png(svg, bx, by);
  if (!reserv) throw new Error(`Aktivitetskortet ${k.id} saknar reservbilden till ${k.bild} (src/lib/metodresurser.ts).`);
  delar.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 0, after: 60, line: 240 }, children: [new ImageRun({ type: 'svg', data: svg, transformation: { width: bx, height: by }, fallback: { type: 'png', data: reserv }, altText: { title: k.namn, description: k.alt, name: k.bild } })] }));
  delar.push(tunnLinje(farg, 40, 140));
  delar.push(stycke('Så gör ni', { pt: 12.5, farg, fet: true, efter: 90, keepNext: true }));
  k.steg.forEach((s, i) => delar.push(listrad(`${i + 1}.`, s, farg)));
  // Material och Att tänka på sida vid sida, i två kolumner.
  const vB = Math.round(B * 0.36), hB = B - vB;
  const kolumn = (rubrik: string, rader: string[], bredd: number) => new TableCell({
    width: { size: bredd, type: WidthType.DXA }, borders: utanKant, margins: { top: 0, bottom: 0, left: 0, right: rubrik === 'Material' ? 300 : 0 },
    children: [stycke(rubrik, { pt: 12.5, farg, fet: true, efter: 80, keepNext: true }), ...rader.map((r) => listrad('•', r, farg, { pt: 10.5, efter: 50, indrag: 240 }))],
  });
  delar.push(tunnLinje(farg, 100, 140));
  delar.push(new Table({
    width: { size: B, type: WidthType.DXA }, columnWidths: [vB, hB], layout: 'fixed', borders: tabellUtanKant,
    rows: [new TableRow({ cantSplit: true, children: [kolumn('Material', k.material.length ? k.material : ['Inget'], vB), kolumn('Att tänka på', k.tanka, hB)] })],
  }));
  delar.push(hjalp());
  return delar;
}

/** Kategorins Word-fil: korten i nummerordning, ett per sida. adress står i sidfoten med upphovet. */
export function aktivitetskortDokument(id: string, b: Aktivitetsbank, kategori: string, adress: string, png: Png): Document {
  const kat = b.kategorier.find((x) => x.id === kategori);
  const lista = kategorinsKort(b, kategori);
  if (!kat || !lista.length) throw new Error(`Aktivitetskorten i ${id} har inga kort i kategorin ${kategori}.`);
  const B = PAGE_W - 2 * MARGINAL;
  const children: (Paragraph | Table)[] = [];
  lista.forEach((k, i) => {
    if (i) children.push(punkt({ pageBreakBefore: true }));
    children.push(...aktivitetKort(kat, k, { B, svg: kortbildSvg(id, k.bild), png }));
  });
  children.push(punkt());
  const las = (fil: string) => readFileSync(join(process.cwd(), 'public', fil.replace(/^\//, '')));
  const fot = new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 0, line: 240 }, children: [new TextRun({ text: `© Niclas Fohlin${NBSP}${NBSP}·${NBSP}${NBSP}${adress}`, font: HUS, size: 15, color: FARG.dov })] })] });
  return new Document({
    creator: 'Niclas Fohlin', title: `Aktivitetskort: ${kat.namn}`,
    fonts: [
      { name: ELEV, data: las(ELEVTYPSNITT_TTF) },
      { name: NAMN, data: las(BOKTYPSNITT_TTF.cinzel) },
    ],
    styles: { default: { document: { run: { font: HUS, size: 22, color: FARG.text }, paragraph: { spacing: { line: 264 } } } } },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGINAL, bottom: MARGINAL, left: MARGINAL, right: MARGINAL, header: 300, footer: 360 } } },
      footers: { default: fot },
      children,
    }],
  });
}
