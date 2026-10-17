// Strategipapperets design, ett till ett med metodriggens build/strategipapper.js (riggens 376dd91): ett A4 för läraren
// med smala marginaler, en titel med en knapp och en inforuta, en ingress, rutor i rad och för varje del ett mörkblått
// band och en tät tabell, i riggens typsnitt och färger. Sajten ritar med den lektionskortet (src/lib/lektionskort.ts)
// ur riggens papper.json (src/data/lektionskort/), i kortets egen Word-fil och först i Materialet i metodens Word-filer
// (Niclas 2026-10-17: "var skrivs den ur med Skriv ut allt"), så att utskriften och knappens pdf är samma kort. Ändrar
// riggen sin byggsten, gör samma ändring här och jämför med riggens pdf (METODER.md under Lektionskortet).
// Inga Node-beroenden: metoddocx.ts körs också i webbläsaren.
import { AlignmentType, BorderStyle, Footer, NoBreakHyphen, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType, type IBorderOptions } from 'docx';

/** En del: ett mörkblått band med rubriken och en rad, kolumnernas namn och raderna. */
export interface PapperDel {
  rubrik: string;
  text?: string;
  kolumner: string[];
  bredder?: number[];
  rader: string[][];
  storlek?: number;
  namnrad?: number;
  tat?: boolean;
  grupper?: number[];
  not?: string;
}
/** En sida: titeln med knappen och inforutan (eller en rad under titeln), ingressen, rutorna och delarna. */
export interface PapperSida {
  titel?: string;
  undertitel?: string;
  knapp?: string;
  info?: string[];
  infoUtanRuta?: boolean;
  ingress?: string;
  ruta?: { punkter: { rubrik: string; text: string }[]; storlek?: { rubrik?: number; text?: number } };
  delar: PapperDel[];
}
/** Riggens papper.json: framsidan, baksidan när kortet har en, sidfoten på varje sida och källraden sist. */
export interface Papper extends PapperSida {
  design?: string;
  fil?: string;
  dokumenttitel?: string;
  fot?: string;
  kalla?: string;
  baksida?: PapperSida;
}

// Riggens design/tokens.json: Arial och kompendiets färger.
const FONT = 'Arial';
const NAVY = '1f5c99';
const BLUE = '2e75b6';
const INK = '1a1a1a';
const GREY = '555555';
const LIGHT = 'f8fbfd';
const BAND = 'ebf4fb';
const LINE = 'd6e4f0';
const VIT = 'FFFFFF';
// A4 med smala marginaler, 1,27 cm, så att två tabeller ryms på sidan, och sidhuvudet och sidfoten 0,635 cm från kanten.
// Sidans mått är riggens (design/tokens.json), 3 twips bredare och 4 lägre än sajtens A4, så att raderna bryts som i
// riggens kort, som är prövat i Google Dokument (granskningen 2026-10-17: Räkna ljud bröt en rad på ett annat ställe).
export const PAPPER_SIDA = { width: 11909, height: 16834 };
export const PAPPER_MARGINALER = { top: 720, right: 720, bottom: 720, left: 720, header: 360, footer: 360 };
const TW = PAPPER_SIDA.width - PAPPER_MARGINALER.left - PAPPER_MARGINALER.right;
// Styckets slutmärke i riggens standard, Arial 9,5 punkter. Riggens dokument har det som standard för allt, sajtens
// Word-filer Calibri 11 (dokument() i src/lib/metoddocx.ts), och Word räknar slutmärket in i den sista radens höjd: med
// sajtens standard blev varje rad i kortets täta tabeller högre än riggens, och ett fullt kort kunde bli två sidor. Varje
// stycke bär därför riggens standard själv, så att kortet blir likadant i båda filerna.
const MARKE = { font: FONT, size: 19 };

type Barn = Paragraph | Table;

// Bindestreck följt av ordfog (U+2060) håller ihop ett exempelord, som sss-ooo-lll, och blir Words hårda bindestreck.
const HARD = '-⁠';
function run(o: { text: string; font?: string; size?: number; color?: string; italics?: boolean; bold?: boolean }): TextRun {
  const t = String(o.text ?? '');
  if (!t.includes(HARD)) return new TextRun(o);
  const children: (NoBreakHyphen | string)[] = [];
  t.split(HARD).forEach((del, i) => { if (i) children.push(new NoBreakHyphen()); if (del) children.push(del); });
  const { text: _text, ...rest } = o;
  return new TextRun({ ...rest, children });
}
// **fet** i texten
function runs(text: string, base: { font?: string; size?: number; color?: string; italics?: boolean; bold?: boolean }): TextRun[] {
  return String(text).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((d) => (d.startsWith('**') ? run({ ...base, text: d.slice(2, -2), bold: true }) : run({ ...base, text: d })));
}
type PO = { before?: number; after?: number; line?: number; keepNext?: boolean; size?: number; color?: string; italics?: boolean; bold?: boolean };
const p = (text: string, o: PO = {}) => new Paragraph({ spacing: { before: o.before ?? 0, after: o.after ?? 0, line: o.line ?? 240 }, keepNext: o.keepNext, run: MARKE, children: runs(text, { font: FONT, size: o.size ?? 19, color: o.color ?? INK, italics: o.italics, bold: o.bold }) });

const kant = (color = LINE, size = 4): IBorderOptions => ({ style: BorderStyle.SINGLE, size, color });
const INGEN: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: VIT };
const MAR = { top: 55, bottom: 55, left: 100, right: 100 };
type Kanter = { top: IBorderOptions; bottom: IBorderOptions; left: IBorderOptions; right: IBorderOptions };
// Riggens cell tar också en lodrät justering, som ingen av kortets delar använder; här står cellerna alltid upptill.
function cell(children: Paragraph[], o: { w: number; fill?: string; borders?: Kanter; mar?: typeof MAR; span?: number }): TableCell {
  return new TableCell({
    width: { size: o.w, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP, margins: o.mar ?? MAR,
    ...(o.span && o.span > 1 ? { columnSpan: o.span } : {}),
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
    borders: o.borders ?? { top: kant(), bottom: kant(), left: kant(), right: kant() },
    children,
  });
}
const bredder = (andelar: number[] | undefined, n: number): number[] => {
  const a = andelar ?? Array(n).fill(1);
  const summa = a.reduce((x, y) => x + y, 0);
  const w = a.map((x) => Math.round((TW * x) / summa));
  w[n - 1] = TW - w.slice(0, -1).reduce((x, y) => x + y, 0);
  return w;
};

// Rutorna överst: det viktigaste i rutor i rad, var och en med sin rubrik och en mening eller två.
function kort(punkter: { rubrik: string; text: string }[], storlek: { rubrik?: number; text?: number } = {}): Table {
  const w = bredder(undefined, punkter.length);
  return new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: w, layout: 'fixed', rows: [new TableRow({ cantSplit: true, children: punkter.map((k, i) => cell([
    p(k.rubrik, { bold: true, color: NAVY, size: storlek.rubrik ?? 20, after: 30 }),
    p(k.text, { size: storlek.text ?? 18 }),
  ], { w: w[i], fill: LIGHT, borders: { top: kant(BLUE, 18), bottom: kant(LINE), left: i ? kant(VIT, 24) : kant(LINE), right: i < punkter.length - 1 ? kant(VIT, 24) : kant(LINE) }, mar: { top: 90, bottom: 90, left: 130, right: 110 } })) })] });
}

// Luft mellan rutor och tabeller: ett stycke på en punkt med avstånd efter. Word slår annars ihop tabeller som står
// direkt efter varandra, och Google Dokument lägger själv in ett stycke mellan dem.
const luft = (efter: number) => new Paragraph({ spacing: { before: 0, after: efter, line: 240 }, run: { size: 2, font: FONT }, children: [new TextRun({ text: '', size: 2, font: FONT })] });

// En del: första raden ett mörkblått band över alla kolumner med rubriken och en rad om delen, andra raden kolumnernas
// namn på ljusblått, och raderna utan lodräta linjer. grupper delar tabellen i block med en tjockare blå linje, tat ger
// mindre luft i raderna, och en rad med färre celler än kolumner får den sista cellen över resten.
function del(d: PapperDel): Barn[] {
  const n = d.kolumner.length;
  const w = bredder(d.bredder, n);
  const band = new TableRow({ cantSplit: true, children: [new TableCell({
    width: { size: TW, type: WidthType.DXA }, columnSpan: n, margins: { top: 70, bottom: 70, left: 130, right: 130 },
    shading: { type: ShadingType.CLEAR, fill: NAVY, color: 'auto' },
    borders: { top: kant(NAVY), bottom: kant(NAVY), left: kant(NAVY), right: kant(NAVY) },
    children: [new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, keepNext: true, run: MARKE, children: [
      ...runs(d.rubrik, { font: FONT, size: 23, bold: true, color: VIT }),
      ...(d.text ? [run({ text: `   ${d.text}`, font: FONT, size: 18, color: 'DCE8F5' })] : []),
    ] })],
  })] });
  const huvud = new TableRow({ cantSplit: true, children: d.kolumner.map((k, i) => cell([p(k, { bold: true, color: NAVY, size: 17, keepNext: true })], { w: w[i], fill: BAND, borders: { top: kant(BAND), bottom: kant(LINE), left: kant(BAND), right: kant(BAND) }, mar: { top: 40, bottom: 40, left: 100, right: 100 } })) });
  const gransRader = new Set<number>();
  (d.grupper ?? []).reduce((summa, antal) => { if (summa > 0) gransRader.add(summa); return summa + antal; }, 0);
  const luftRad = d.tat ? 40 : 70;
  const rader = d.rader.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, ci) => {
    const span = ci === r.length - 1 ? n - r.length + 1 : 1;
    return cell(String(c).split('\n').map((t, k) => (ci === 0
      ? p(k === 0 ? t.replace(/\*\*/g, '') : t, { size: k === 0 ? 20 : (d.namnrad ?? 16), bold: k === 0, color: k === 0 ? NAVY : GREY })
      : p(t, { size: d.storlek ?? 20 }))), { w: w.slice(ci, ci + span).reduce((x, y) => x + y, 0), span, borders: { top: gransRader.has(ri) ? kant(BLUE, 14) : kant(), bottom: kant(), left: INGEN, right: INGEN }, mar: { top: luftRad, bottom: luftRad, left: 100, right: 100 } });
  }) }));
  return [
    luft(120),
    new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: w, layout: 'fixed', rows: [band, huvud, ...rader] }),
    ...(d.not ? [p(d.not, { size: 18, before: 70 })] : []),
  ];
}

// Huvudet med inforutan: titeln till vänster, och till höger knappen, en mörkblå ruta med vit text som säger vad bladet
// är (Lektionskort), och under den raden om årskursen, passet och gruppen, med eller utan ljus ruta.
function huvud(s: PapperSida): Table {
  const wInfo = Math.round(TW * 0.3);
  const wTitel = TW - wInfo;
  const mitt = (children: TextRun[]) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, line: 240 }, run: MARKE, children });
  const ruta = (children: Paragraph[], fill: string, borders: Kanter) => new TableCell({
    width: { size: wInfo, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, margins: { top: 45, bottom: 45, left: 110, right: 110 },
    shading: { type: ShadingType.CLEAR, fill, color: 'auto' }, borders, children,
  });
  const titel = new TableCell({
    width: { size: wTitel, type: WidthType.DXA }, rowSpan: 2, verticalAlign: VerticalAlign.CENTER, margins: { top: 0, bottom: 0, left: 0, right: 120 },
    borders: { top: INGEN, bottom: INGEN, left: INGEN, right: INGEN }, children: [p(s.titel ?? '', { bold: true, color: NAVY, size: 44 })],
  });
  const knapp = ruta([mitt([run({ text: s.knapp ?? '', font: FONT, size: 21, bold: true, color: VIT })])], NAVY, { top: kant(NAVY), bottom: kant(NAVY), left: kant(NAVY), right: kant(NAVY) });
  const info = s.infoUtanRuta
    ? ruta((s.info ?? []).map((t) => mitt(runs(t, { font: FONT, size: 18, color: INK }))), VIT, { top: INGEN, bottom: INGEN, left: INGEN, right: INGEN })
    : ruta((s.info ?? []).map((t) => mitt(runs(t, { font: FONT, size: 18, color: INK }))), LIGHT, { top: kant(LIGHT), bottom: kant(LINE), left: kant(LIGHT), right: kant(LIGHT) });
  return new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: [wTitel, wInfo], layout: 'fixed', rows: [
    new TableRow({ cantSplit: true, children: [titel, knapp] }),
    new TableRow({ cantSplit: true, children: [info] }),
  ] });
}

const sida = (s: PapperSida): Barn[] => [
  ...(s.info || s.knapp ? [huvud(s), luft(80)] : [
    ...(s.titel ? [p(s.titel, { bold: true, color: NAVY, size: 44, after: 0 })] : []),
    ...(s.undertitel ? [p(s.undertitel, { color: GREY, size: 19, after: s.ingress ? 50 : 110 })] : []),
  ]),
  ...(s.ingress ? [p(s.ingress, { size: 21, after: 110 })] : []),
  ...(s.ruta ? [kort(s.ruta.punkter, s.ruta.storlek)] : []),
  ...s.delar.flatMap(del),
];

/** Kortets sidor: framsidan, och baksidan när kortet har en, var och en en egen sektion; källraden står sist. */
export function papperSidor(papper: Papper): Barn[][] {
  const kalla = papper.kalla ? [luft(0), p(papper.kalla, { size: 15, color: GREY, before: 80 })] : [];
  return papper.baksida ? [sida(papper), [...sida(papper.baksida), ...kalla]] : [[...sida(papper), ...kalla]];
}

/** Ett stycke på en punkt i kortets Arial, som riggens punkt(): i kortets tomma sidhuvud, och före och efter en tabell som
 *  börjar eller slutar en sida. Sajtens stycke på en punkt står i Calibri (avsnittsStycke i src/lib/metoddocx.ts), och då
 *  bäddade Word in Calibri i kortets pdf, 50 kB mer än riggens (2026-10-17). */
export const papperPunkt = (): Paragraph => luft(0);

/** Sidfoten, som står på varje sida: upphovet och var materialet skrivs ut. */
export const papperFot = (papper: Papper): Footer => new Footer({ children: [papper.fot ? p(papper.fot, { size: 15, color: GREY }) : luft(0)] });
