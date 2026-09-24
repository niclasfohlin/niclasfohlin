// Bygger Word-filer ur metodernas data: allt om metoden (beskrivning, planeringsmallar, lathund), delarna för sig, och flera metoder i en fil.
// Körs både i bygget (src/pages/stodundervisning/*.docx.ts) och i webbläsaren när läsaren
// laddar ner valda metoder från /stodundervisning. Därför inga Node-beroenden här.
// Designelementen är samma som på sidan (src/components/Metod.astro): rutor, tabeller med
// rubrikrad, band, gör/undvik och bockar. Varje sida bär © Niclas Fohlin och niclasfohlin.se.
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, HeightRule, LevelFormat, PageNumber, PageOrientation,
  Paragraph, ShadingType, Tab, Table, TableCell, TableLayoutType, TableRow, TabStopType, TextRun, VerticalAlign, WidthType,
  type IBorderOptions, type IRunOptions, type ISectionOptions,
} from 'docx';
import { arbetsformRad, arskursText, datumText, lathundFakta, metaRad, metodAdress, passOversikt, ramArTom, stegTexter, SAJT, UPPHOV, type MetodData, type MetodPost } from './metod';

// Färgerna ur sajtens designsystem (src/styles/global.css) så att filen känns igen från sidan.
const FARG = {
  huvud: '1D4F91', ljus: 'E6EEF8', rand: 'F8FAFC', kant: 'E1E6EB', text: '14202B', svag: '4B5866', vit: 'FFFFFF',
  gron: '2E7D32', gronLjus: 'E8F5E9', varm: 'A8511B', varmLjus: 'FFF4E5',
};
const A4 = { width: 11906, height: 16838 };
const MARGINAL = 1134; // 2 cm
// Innehållets bredd. Stående för metoden och mallarna, liggande för lathunden; medBredd byter tillfälligt.
const BREDD_STAENDE = A4.width - 2 * MARGINAL;
const BREDD_LIGGANDE = A4.height - 2 * MARGINAL;
let BREDD = BREDD_STAENDE;
function medBredd<T>(b: number, fn: () => T): T {
  const gammal = BREDD;
  BREDD = b;
  try { return fn(); } finally { BREDD = gammal; }
}
const DOCX_TYP = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export { DOCX_TYP };

type Barn = Paragraph | Table;
let instans = 0; // numrerade listor: varje lista börjar om på 1

const kant = (color = FARG.kant, size = 4): IBorderOptions => ({ style: BorderStyle.SINGLE, size, color });
const runt = (b: IBorderOptions) => ({ top: b, bottom: b, left: b, right: b });

interface StyckeVal { kursiv?: boolean; fet?: boolean; farg?: string; storlek?: number; fore?: number; efter?: number; hallIhop?: boolean; mitt?: boolean; versaler?: boolean; font?: string }

function run(text: string, o: StyckeVal = {}): TextRun {
  const val: IRunOptions = { text, italics: o.kursiv, bold: o.fet, color: o.farg, size: o.storlek, allCaps: o.versaler, font: o.font };
  return new TextRun(val);
}
// Exemplet berättas rakt; replikerna (”…”) sätts kursiva, som exempelfraserna, så att en lärare hittar det som sägs.
export function exempelStycke(text: string, o: { hallIhop?: boolean; storlek?: number; efter?: number } = {}): Paragraph {
  const delar = text.split(/(”[^”]*”)/).filter(Boolean);
  return new Paragraph({ children: delar.map((t) => run(t, { kursiv: t.startsWith('”'), storlek: o.storlek })), spacing: { before: 0, after: o.efter ?? 120 }, keepNext: o.hallIhop });
}
function stycke(text: string, o: StyckeVal = {}): Paragraph {
  return new Paragraph({
    children: [run(text, o)],
    spacing: { before: o.fore ?? 0, after: o.efter ?? 120 },
    keepNext: o.hallIhop,
    alignment: o.mitt ? AlignmentType.CENTER : undefined,
  });
}
function h2(text: string): Paragraph {
  return new Paragraph({ children: [run(text)], heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 320, after: 100 } });
}
function numrerad(text: string, o: StyckeVal = {}): Paragraph {
  return new Paragraph({ children: [run(text, o)], numbering: { reference: 'nummer', level: 0, instance: instans }, spacing: { after: 60 } });
}
function nyLista(): void { instans += 1; }

interface CellVal { bredd: number; fyll?: string; kanter?: { top?: IBorderOptions; bottom?: IBorderOptions; left?: IBorderOptions; right?: IBorderOptions }; span?: number; mitt?: boolean }
function cell(barn: Barn[], o: CellVal): TableCell {
  return new TableCell({
    width: { size: o.bredd, type: WidthType.DXA },
    columnSpan: o.span,
    shading: o.fyll ? { type: ShadingType.CLEAR, fill: o.fyll, color: 'auto' } : undefined,
    borders: { ...runt(kant()), ...(o.kanter ?? {}) },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: o.mitt ? VerticalAlign.CENTER : VerticalAlign.TOP,
    children: barn.length ? barn : [new Paragraph({ spacing: { after: 0 } })],
  });
}
function tabell(rader: TableRow[], bredder: number[]): Table {
  return new Table({ width: { size: BREDD, type: WidthType.DXA }, columnWidths: bredder, layout: TableLayoutType.FIXED, rows: rader });
}
function rad(celler: TableCell[], o: { huvud?: boolean; hojd?: number } = {}): TableRow {
  return new TableRow({ children: celler, tableHeader: o.huvud, cantSplit: true, height: o.hojd ? { value: o.hojd, rule: HeightRule.ATLEAST } : undefined });
}
function avstand(efter = 160): Paragraph { return new Paragraph({ spacing: { before: 0, after: efter } }); }

// Ruta med fet inledning: "Så fungerar insatsen" och "Tre saker att hålla fast vid".
// Rutans rubrik står på egen rad, som på sidan och i kompendiet; utan rubrik bara texten.
function ruta(rubrik: string, text: string, o: { kursivText?: boolean } = {}): Barn[] {
  const barn = rubrik
    ? [new Paragraph({ children: [run(rubrik, { fet: true, farg: FARG.huvud })], spacing: { after: 40 }, keepNext: true }), new Paragraph({ children: [run(text, { kursiv: o.kursivText })], spacing: { after: 0 } })]
    : [new Paragraph({ children: [run(text, { kursiv: o.kursivText })], spacing: { after: 0 } })];
  return [tabell([rad([cell(barn, { bredd: BREDD, fyll: FARG.ljus, kanter: { left: kant(FARG.huvud, 24) } })])], [BREDD]), avstand()];
}
// Passrutinen: numrerade steg i en ruta.
function rutinRuta(steg: string[]): Barn[] {
  nyLista();
  const barn = steg.map((s, i) => new Paragraph({ children: [run(s)], numbering: { reference: 'nummer', level: 0, instance: instans }, spacing: { after: i === steg.length - 1 ? 0 : 60 } }));
  return [tabell([rad([cell(barn, { bredd: BREDD, fyll: FARG.ljus, kanter: { left: kant(FARG.huvud, 24) } })])], [BREDD]), avstand()];
}
// Tabell med rubrikrad. Första kolumnen fet; en radbrytning i en cell blir en ny rad i cellen,
// och i första kolumnen är raderna efter den första kursiva, som i kompendiet.
// En rad där varje cell är skriven med versaler är en mellanrubrik i tabellen (som verbdelen i en läslista).
export const arMellanrubrik = (r: string[]) => r.every((c) => c.trim() && c === c.toUpperCase() && /\p{L}/u.test(c));
function rubrikTabell(kolumner: string[], rader: string[][], bredder: number[], o: { fetAndra?: boolean; huvudFyll?: string; hallIhop?: boolean; hallIhopEfter?: boolean; radrubrik?: boolean; storlek?: number } = {}): Barn[] {
  const huvudFyll = o.huvudFyll ?? FARG.huvud;
  const radrubrik = o.radrubrik !== false;
  // hallIhopEfter: även sista raden hänger ihop med det som följer (listans ruta "Så arbetar ni med listan").
  // storlek: textstorlek i cellerna (halva punkter); en elevkopia av en ordlista sätts stort.
  const storlek = o.storlek ?? 20;
  // hallIhop: en kort tabell (en ordlista) hålls på en sida genom att varje stycke utom sista radens hänger ihop med nästa.
  // radrubrik: false ger första kolumnen vanlig text (fria tabeller, ordlistor); bara rubrikraden är fet, som i kompendiet.
  const huvud = rad(kolumner.map((k, i) => cell([stycke(k, { fet: true, farg: FARG.vit, storlek: 20, efter: 0, hallIhop: o.hallIhop })], { bredd: bredder[i], fyll: huvudFyll, kanter: runt(kant(huvudFyll)) })), { huvud: true });
  const kropp = rader.map((r, ri) => rad(r.map((text, i) => {
    const linjer = text.split('\n');
    const ihop = o.hallIhop && (ri < rader.length - 1 || !!o.hallIhopEfter);
    const mellan = arMellanrubrik(r);
    const barn = mellan
      ? linjer.map((l, j) => stycke(l, { fet: true, farg: FARG.huvud, storlek: Math.min(storlek, 18), efter: j === linjer.length - 1 ? 0 : 20, hallIhop: ihop }))
      : i === 0 && radrubrik
        ? linjer.map((l, j) => stycke(l, { fet: j === 0, kursiv: j > 0, farg: j === 0 ? FARG.huvud : FARG.svag, storlek, efter: j === linjer.length - 1 ? 0 : 20, hallIhop: ihop }))
        : linjer.map((l, j) => stycke(l, { fet: o.fetAndra && i === 1, kursiv: i === 0 && j > 0, farg: i === 0 && j > 0 ? FARG.svag : undefined, storlek, efter: j === linjer.length - 1 ? 0 : 20, hallIhop: ihop }));
    return cell(barn, { bredd: bredder[i], fyll: mellan ? FARG.ljus : ri % 2 === 1 ? FARG.rand : undefined });
    // En rad utan text är en skrivrad: ge den höjd för handskrift.
  }), { hojd: r.every((t) => !t.trim()) ? 420 : undefined }));
  return [tabell([huvud, ...kropp], bredder), avstand()];
}
// Stegtabellen: nummer och namn i versaler, frågan under, sedan vad du gör och fraserna med citattecken.
function stegTabell(d: NonNullable<MetodData['steg']>): Barn[] {
  const bredder = [2100, 3400, BREDD - 5500];
  const huvud = rad(['Steg', 'Vad du gör', d.fraserRubrik].map((k, i) => cell([stycke(k, { fet: true, farg: FARG.vit, storlek: 20, efter: 0 })], { bredd: bredder[i], fyll: FARG.huvud, kanter: runt(kant(FARG.huvud)) })), { huvud: true });
  const kropp = d.rader.map((r, i) => rad([
    cell([
      stycke(`${i + 1}  ${r.namn}`, { fet: true, farg: FARG.huvud, storlek: 20, versaler: true, efter: r.fraga ? 20 : 0 }),
      ...(r.fraga ? [stycke(r.fraga, { kursiv: true, farg: FARG.svag, storlek: 20, efter: 0 })] : []),
    ], { bredd: bredder[0], fyll: i % 2 === 1 ? FARG.rand : undefined }),
    cell([stycke(r.gor, { storlek: 20, efter: 0 })], { bredd: bredder[1], fyll: i % 2 === 1 ? FARG.rand : undefined }),
    cell(r.fraser.map((f, j) => stycke(`”${f}”`, { kursiv: true, storlek: 20, efter: j === r.fraser.length - 1 ? 0 : 20 })), { bredd: bredder[2], fyll: i % 2 === 1 ? FARG.rand : undefined }),
  ]));
  return [tabell([huvud, ...kropp], bredder), avstand()];
}
// Band: rubriker i rubrikfärg och en kort text under, centrerat. Arbetsformen och urvalskraven.
function band(delar: { rubrik: string; text: string }[]): Barn[] {
  const bredd = Math.floor(BREDD / delar.length);
  const bredder = delar.map((_, i) => (i === delar.length - 1 ? BREDD - bredd * (delar.length - 1) : bredd));
  return [tabell([
    rad(delar.map((d, i) => cell([stycke(d.rubrik, { fet: true, farg: FARG.vit, storlek: 22, mitt: true, efter: 0 })], { bredd: bredder[i], fyll: FARG.huvud, kanter: runt(kant(FARG.huvud)), mitt: true })), { huvud: true }),
    rad(delar.map((d, i) => cell([stycke(d.text, { storlek: 20, mitt: true, efter: 0 })], { bredd: bredder[i], mitt: true }))),
  ], bredder), avstand()];
}
function motto(text: string): Barn[] {
  return [tabell([rad([cell([stycke(text, { fet: true, farg: FARG.vit, mitt: true, efter: 0 })], { bredd: BREDD, fyll: FARG.huvud, kanter: runt(kant(FARG.huvud)), mitt: true })])], [BREDD]), avstand()];
}
function fragaRuta(rubrik: string, fragor: string[]): Barn[] {
  const barn = [stycke(rubrik, { fet: true, farg: FARG.huvud, storlek: 20, efter: 40 }), ...fragor.map((f, i) => stycke(f, { fet: true, storlek: 24, efter: i === fragor.length - 1 ? 0 : 20 }))];
  return [tabell([rad([cell(barn, { bredd: BREDD, fyll: FARG.ljus, kanter: { left: kant(FARG.huvud, 24) } })])], [BREDD]), avstand()];
}
function gorUndvik(gor: string[], undvik: string[]): Barn[] {
  const halv = Math.floor(BREDD / 2);
  const bredder = [halv, BREDD - halv];
  const lista = (punkter: string[], farg: string) => punkter.map((p, i) => stycke(p, { farg, storlek: 20, efter: i === punkter.length - 1 ? 0 : 40 }));
  return [tabell([
    rad([
      cell([stycke('Gör så här', { fet: true, farg: FARG.vit, versaler: true, storlek: 20, efter: 0 })], { bredd: bredder[0], fyll: FARG.gron, kanter: runt(kant(FARG.gron)) }),
      cell([stycke('Undvik', { fet: true, farg: FARG.vit, versaler: true, storlek: 20, efter: 0 })], { bredd: bredder[1], fyll: FARG.varm, kanter: runt(kant(FARG.varm)) }),
    ], { huvud: true }),
    rad([
      cell(lista(gor, '1B5E20'), { bredd: bredder[0], fyll: FARG.gronLjus }),
      cell(lista(undvik, '8A3A0E'), { bredd: bredder[1], fyll: FARG.varmLjus }),
    ]),
  ], bredder), avstand()];
}
const BOCK = '☐';
function bockRad(text: string, o: StyckeVal = {}): Paragraph {
  return new Paragraph({ children: [run(`${BOCK} `, { font: 'Segoe UI Symbol', farg: FARG.huvud, storlek: o.storlek ?? 22 }), run(text, { storlek: 20, ...o })], spacing: { after: 0 } });
}
// Bockar i en eller två kolumner: målen och checklistan.
function bockar(punkter: string[], kolumner: 1 | 2, o: { hojd?: number } = {}): Barn[] {
  const bredd = Math.floor(BREDD / kolumner);
  const bredder = kolumner === 2 ? [bredd, BREDD - bredd] : [BREDD];
  const rader: TableRow[] = [];
  for (let i = 0; i < punkter.length; i += kolumner) {
    const celler = [];
    for (let k = 0; k < kolumner; k++) {
      const p = punkter[i + k];
      celler.push(cell(p === undefined ? [] : [bockRad(p)], { bredd: bredder[k], fyll: Math.floor(i / kolumner) % 2 === 1 ? FARG.rand : undefined, mitt: true }));
    }
    rader.push(rad(celler, { hojd: o.hojd }));
  }
  return [tabell(rader, bredder), avstand()];
}
// Före- och efterkollen: etiketten i rubrikfärg till vänster.
function tvaKolumner(rader: { nar: string; vad: string }[]): Barn[] {
  const bredder = [2600, BREDD - 2600];
  return [tabell(rader.map((r) => rad([
    cell([stycke(r.nar, { fet: true, farg: FARG.vit, storlek: 20, efter: 0 })], { bredd: bredder[0], fyll: FARG.huvud, kanter: runt(kant(FARG.huvud)) }),
    cell([stycke(r.vad, { storlek: 20, efter: 0 })], { bredd: bredder[1] }),
  ])), bredder), avstand()];
}
// Snabbmallen: en halv sida att fylla i. Med skrivrum blir raderna högre, för mallfilen och utskriften.
function snabbmallTabell(titel: string, fore: string[], efter: string[], o: { skrivrum?: boolean; hojd?: number } = {}): Barn[] {
  const bredder = [Math.min(3600, Math.floor(BREDD * 0.4)), BREDD - Math.min(3600, Math.floor(BREDD * 0.4))];
  const hojd = o.hojd ?? (o.skrivrum ? 900 : 420);
  // Alla stycken utom den sista radens håller ihop med nästa, så att Word inte delar mallen över två sidor.
  const avsnitt = (text: string, fyll: string, farg: string) => rad([cell([stycke(text, { fet: true, farg, storlek: 20, efter: 0, hallIhop: true })], { bredd: BREDD, span: 2, fyll, kanter: runt(kant(fyll === FARG.huvud ? FARG.huvud : FARG.kant)) })]);
  const falt = (text: string, sist = false) => rad([
    cell([stycke(text, { fet: true, storlek: 20, efter: 0, hallIhop: !sist })], { bredd: bredder[0], fyll: FARG.rand, mitt: true }),
    cell([stycke('', { efter: 0, hallIhop: !sist })], { bredd: bredder[1] }),
  ], { hojd });
  return [tabell([
    avsnitt(`SNABBMALL · ${titel}`, FARG.huvud, FARG.vit),
    avsnitt('Före passet', FARG.ljus, FARG.huvud),
    ...fore.map((f) => falt(f)),
    avsnitt('Efter passet: kort notering', FARG.ljus, FARG.huvud),
    ...efter.map((f, i) => falt(f, i === efter.length - 1)),
  ], bredder), avstand()];
}
function grundRuta(text: string): Barn[] {
  return [tabell([rad([cell([stycke(text, { storlek: 20, efter: 0 })], { bredd: BREDD, kanter: runt(kant(FARG.huvud, 8)) })])], [BREDD]), avstand(80)];
}
function skrivrad(etiketter: string[]): Paragraph {
  return new Paragraph({ children: etiketter.map((e, i) => run(`${i > 0 ? '     ' : ''}${e}: ______________________`, { storlek: 20, farg: FARG.svag })), spacing: { before: 80, after: 200 } });
}

// Kontraktet mellan skola, hem och elev: en inramad ruta med kicker, inledning och var och ens ansvar.
type Kontrakt = NonNullable<NonNullable<MetodData['hem']>['kontrakt']>;
function kontraktRuta(k: Kontrakt): Barn[] {
  const barn: Paragraph[] = [
    stycke(k.rubrik.toUpperCase(), { fet: true, farg: FARG.huvud, storlek: 17, efter: 100 }),
    stycke(k.inledning, { kursiv: true, storlek: 20 }),
    ...k.ansvar.map((a) => new Paragraph({ children: [run(`${a.rubrik}. `, { fet: true, storlek: 20 }), run(a.text, { storlek: 20 })], spacing: { after: 120 } })),
  ];
  if (k.efter) barn.push(stycke(k.efter, { farg: FARG.svag, storlek: 20, efter: 0 }));
  return [tabell([rad([cell(barn, { bredd: BREDD, kanter: runt(kant(FARG.text)) })])], [BREDD]), avstand()];
}

// Lässchemat eller ett annat schema att fylla i: rubrikrad och tomma rader att skriva på.
type Schema = NonNullable<NonNullable<MetodData['hem']>['schema']>;
function schemaTabell(s: Schema): Table {
  const n = s.kolumner.length;
  const forsta = 1500;
  const sista = 2000;
  const mitten = Math.floor((BREDD - forsta - sista * (n - 2)) / 1);
  const bredder = s.kolumner.map((_, i) => (i === 0 ? forsta : i === 1 ? mitten : sista));
  const huvud = rad(s.kolumner.map((k, i) => cell([stycke(k, { fet: true, farg: FARG.vit, storlek: 20, efter: 0 })], { bredd: bredder[i], fyll: FARG.huvud, kanter: runt(kant(FARG.huvud)) })), { huvud: true });
  const kropp = Array.from({ length: s.rader }, (_, r) => rad(bredder.map((b) => cell([stycke('', { efter: 0 })], { bredd: b, fyll: r % 2 === 1 ? FARG.rand : undefined, kanter: runt(kant()) })), { hojd: 480 }));
  return tabell([huvud, ...kropp], bredder);
}

// En ram (berättelseram eller liknande): inledning, översikt och delarna som tabeller med ett fält
// per rad. Tomma fält får skrivrum, så att en tom ram blir en mall att fylla i. Raderna i en del
// hålls ihop på samma sida.
type Ram = NonNullable<MetodData['ramar']>['ramar'][number];
function ramFaltTabell(falt: { rubrik: string; text: string; kursiv?: boolean }[], o: { rubrik?: string; skrivrum?: boolean } = {}): Barn[] {
  const bredder = [2300, BREDD - 2300];
  const rader: TableRow[] = [];
  if (o.rubrik) rader.push(rad([cell([stycke(o.rubrik, { fet: true, farg: FARG.huvud, storlek: 22, efter: 0, hallIhop: true })], { bredd: BREDD, span: 2, fyll: FARG.ljus, kanter: runt(kant(FARG.huvud)) })], { huvud: true }));
  falt.forEach((f, i) => {
    const sist = i === falt.length - 1;
    const linjer = f.text.split('\n');
    const tom = !f.text.trim();
    rader.push(rad([
      cell([stycke(f.rubrik, { fet: true, storlek: 20, efter: 0, hallIhop: !sist })], { bredd: bredder[0], fyll: FARG.rand }),
      cell(tom ? [stycke('', { efter: 0, hallIhop: !sist })] : linjer.map((l, j) => stycke(l, { kursiv: f.kursiv, storlek: 20, efter: j === linjer.length - 1 ? 0 : 20, hallIhop: !sist })), { bredd: bredder[1] }),
    ], { hojd: tom ? (o.skrivrum ? 900 : 420) : undefined }));
  });
  return [tabell(rader, bredder), avstand()];
}
// En elevlista i en ram: orden stora, kolumnrubrikerna små och dämpade, ingen fet första kolumn.
// Bokstäver centreras. Listan hålls ihop, och med hallIhopEfter också med det som följer.
function elevlista(l: { rubrik?: string; kolumner?: string[]; rader: string[][] }, o: { storlek: number; hallIhopEfter?: boolean }): Barn[] {
  const ut: Barn[] = [];
  const n = Math.max(...l.rader.map((r) => r.length), l.kolumner?.length ?? 1);
  const bredd = Math.floor(BREDD / n);
  const bredder = Array.from({ length: n }, (_, i) => (i === n - 1 ? BREDD - bredd * (n - 1) : bredd));
  const bokstaver = l.rader.every((r) => r.every((c) => c.trim().length <= 2));
  if (l.rubrik) ut.push(stycke(l.rubrik, { fet: true, farg: FARG.huvud, storlek: 16, versaler: true, fore: 120, efter: 60, hallIhop: true }));
  const rader: TableRow[] = [];
  if (l.kolumner) rader.push(rad(l.kolumner.map((k, i) => cell([stycke(k, { storlek: 15, versaler: true, farg: FARG.svag, efter: 0, hallIhop: true })], { bredd: bredder[i], fyll: FARG.rand })), { huvud: true }));
  l.rader.forEach((r, ri) => {
    const ihop = ri < l.rader.length - 1 || !!o.hallIhopEfter;
    rader.push(rad(Array.from({ length: n }, (_, i) => cell([stycke(r[i] ?? '', { storlek: o.storlek, efter: 0, hallIhop: ihop, mitt: bokstaver })], { bredd: bredder[i] }))));
  });
  ut.push(tabell(rader, bredder), avstand());
  return ut;
}
// stor: en elevkopia (planeringsmallarna), där listorna kommer först och sätts stort nog att läsas av ett par
// eller visas för gruppen; annars (beskrivningen) står lärarnoten först och listorna efter.
function ramBarn(ram: Ram, o: { skrivrum?: boolean; stor?: boolean } = {}): Barn[] {
  const ut: Barn[] = [];
  for (const s of ram.text) ut.push(stycke(s, { hallIhop: true }));
  // En ordlista eller bokstavslista (bara korta celler) får lika breda kolumner; en översikt med
  // längre text får en smal etikettkolumn först.
  const korta = !!ram.oversikt && ram.oversikt.rader.every((r) => r.every((c) => c.length <= 30));
  if (ram.oversikt) {
    const n = ram.oversikt.kolumner.length;
    const forsta = korta ? Math.floor(BREDD / n) : 1100;
    const rest = Math.floor((BREDD - forsta) / (n - 1));
    ut.push(...rubrikTabell(ram.oversikt.kolumner, ram.oversikt.rader, ram.oversikt.kolumner.map((_, i) => (i === 0 ? forsta : i === n - 1 ? BREDD - forsta - rest * (n - 2) : rest)), { hallIhop: korta, hallIhopEfter: korta, radrubrik: false, storlek: korta && o.stor ? 30 : undefined }));
  }
  if (ram.huvud) ut.push(...ramFaltTabell(ram.huvud, { skrivrum: o.skrivrum }));
  // En ordlistas ruta bär listans namn, så att en sida eller ett blad som börjar med rutan går att koppla rätt.
  const noter = () => ram.delar.flatMap((del) => ramFaltTabell(del.falt, { rubrik: korta || ram.listor ? `${del.rubrik} · ${ram.rubrik}` : del.rubrik, skrivrum: o.skrivrum }));
  // I beskrivningen bär listans rubrik ramens namn, så att en lista som hamnar på en ny sida går att koppla rätt.
  const listor = () => (ram.listor ?? []).flatMap((l, i, alla) => elevlista({ ...l, rubrik: !o.stor && l.rubrik ? `${l.rubrik} · ${ram.rubrik}` : l.rubrik }, { storlek: o.stor ? 32 : 26, hallIhopEfter: i < alla.length - 1 }));
  if (ram.listor) ut.push(...(o.stor ? [...listor(), ...noter()] : [...noter(), ...listor()]));
  else ut.push(...noter());
  return ut;
}
// Diplomet: en inramad sida, centrerad, med skrivlinjer där texten är understreck.
function diplomBarn(dip: NonNullable<MetodData['diplom']>): Barn[] {
  const linje = '________________________________________';
  const barn: Paragraph[] = [];
  if (dip.kicker) barn.push(new Paragraph({ children: [new TextRun({ text: dip.kicker, font: 'Consolas', size: 20, allCaps: true, characterSpacing: 40, color: FARG.svag })], alignment: AlignmentType.CENTER, spacing: { before: 600, after: 240 } }));
  barn.push(new Paragraph({ children: [run(dip.rubrik, { fet: true, farg: FARG.huvud, storlek: 72 })], alignment: AlignmentType.CENTER, spacing: { after: 480 } }));
  for (const t of dip.text) {
    barn.push(/^_{3,}$/.test(t)
      ? new Paragraph({ children: [run(linje, { farg: FARG.svag, storlek: 28 })], alignment: AlignmentType.CENTER, spacing: { before: 120, after: 360 } })
      : new Paragraph({ children: [run(t, { storlek: 26, kursiv: /[.!]$/.test(t) })], alignment: AlignmentType.CENTER, spacing: { after: 240 } }));
  }
  if (dip.underskrifter.length) barn.push(new Paragraph({ children: dip.underskrifter.map((u, i) => run(`${i > 0 ? '        ' : ''}${u} ____________________`, { storlek: 22, farg: FARG.svag })), alignment: AlignmentType.CENTER, spacing: { before: 600, after: 600 } }));
  return [new Table({ width: { size: BREDD, type: WidthType.DXA }, columnWidths: [BREDD], layout: TableLayoutType.FIXED, rows: [new TableRow({ children: [new TableCell({
    width: { size: BREDD, type: WidthType.DXA },
    borders: runt({ style: BorderStyle.DOUBLE, size: 12, color: FARG.huvud }),
    margins: { top: 400, bottom: 400, left: 600, right: 600 },
    children: barn,
  })] })] }), avstand()];
}

// Passöversikten (src/lib/metod.ts passOversikt): fasremsan med minuter och arbetsformens delar under, och
// tabellen med en rad per fas: fas och tid, rutinens numrerade steg, vad som händer, med raderna Före och Efter passet.
function passRemsa(p: NonNullable<ReturnType<typeof passOversikt>>): Barn[] {
  const bredder = p.faser.map((f) => Math.floor(BREDD * f.minuter / p.total));
  bredder[bredder.length - 1] += BREDD - bredder.reduce((a, b) => a + b, 0);
  const rader: TableRow[] = [rad(p.faser.map((f, i) => cell([
    stycke(f.fas, { fet: true, farg: FARG.vit, storlek: 20, mitt: true, efter: 0, hallIhop: true }),
    stycke(f.tid, { farg: FARG.vit, storlek: 16, mitt: true, efter: 0, hallIhop: true }),
  ], { bredd: bredder[i], fyll: FARG.huvud, kanter: runt(kant(FARG.huvud)), mitt: true })), { huvud: true })];
  if (p.delar.length) {
    const celler: TableCell[] = [];
    for (let i = 0; i < p.faser.length; i++) {
      const del = p.delar.find((x) => x.fran === i);
      if (del) {
        const b = bredder.slice(i, i + del.antal).reduce((a, x) => a + x, 0);
        celler.push(cell([new Paragraph({ children: [run(del.rubrik, { fet: true, storlek: 18 }), ...(del.tid ? [run(` ${del.tid}`, { storlek: 16, farg: FARG.svag })] : []), run(` · ${del.text}`, { storlek: 18, farg: FARG.svag })], alignment: AlignmentType.CENTER, spacing: { after: 0 }, keepNext: true })], { bredd: b, span: del.antal, fyll: FARG.ljus, mitt: true }));
        i += del.antal - 1;
      } else if (!p.delar.some((x) => i > x.fran && i < x.fran + x.antal)) celler.push(cell([stycke('', { efter: 0 })], { bredd: bredder[i], fyll: FARG.ljus }));
    }
    rader.push(rad(celler));
  }
  return [tabell(rader, bredder), avstand()];
}
function passTabell(p: NonNullable<ReturnType<typeof passOversikt>>, antalSteg: number): Barn[] {
  const bredder = [1900, 3900, BREDD - 5800];
  const huvud = rad(['Fas', `Rutinen i ${antalSteg} steg`, 'Så leder du det'].map((k, i) => cell([stycke(k, { fet: true, farg: FARG.vit, storlek: 20, efter: 0 })], { bredd: bredder[i], fyll: FARG.huvud, kanter: runt(kant(FARG.huvud)) })), { huvud: true });
  const kantRad = (etikett: string, text: string) => rad([
    cell([stycke(etikett, { fet: true, farg: FARG.huvud, storlek: 20, efter: 0 })], { bredd: bredder[0], fyll: FARG.ljus }),
    cell([stycke(text, { storlek: 20, efter: 0 })], { bredd: bredder[1] + bredder[2], span: 2, fyll: FARG.ljus }),
  ]);
  const rader: TableRow[] = [huvud];
  if (p.fore) rader.push(kantRad('Före passet', p.fore));
  p.faser.forEach((f, ri) => rader.push(rad([
    cell([stycke(f.fas, { fet: true, farg: FARG.huvud, storlek: 20, efter: 20 }), stycke(f.tid, { kursiv: true, farg: FARG.svag, storlek: 20, efter: 0 })], { bredd: bredder[0], fyll: ri % 2 === 1 ? FARG.rand : undefined }),
    cell(f.steg.length ? f.steg.map((st, j) => stycke(`${st.nr}. ${st.text}`, { storlek: 20, efter: j === f.steg.length - 1 ? 0 : 20 })) : [stycke('', { efter: 0 })], { bredd: bredder[1], fyll: ri % 2 === 1 ? FARG.rand : undefined }),
    cell([stycke(f.vad, { storlek: 20, efter: 0 })], { bredd: bredder[2], fyll: ri % 2 === 1 ? FARG.rand : undefined }),
  ])));
  if (p.efter) rader.push(kantRad('Efter passet', p.efter));
  return [tabell(rader, bredder), avstand()];
}

// Tavlan under passet (blocket tavla i lathunden): problemet till vänster, lösningarna till höger.
type Tavla = Extract<NonNullable<MetodData['lathund']>['mall']['block'][number], { typ: 'tavla' }>;
function tavlaBarn(b: Tavla): Barn[] {
  const citat = (f: string) => `”${f}”`;
  return lhSpalter(
    () => [
      stycke(b.text, { kursiv: true, storlek: 22 }),
      stycke(b.fraga, { kursiv: true, fet: true, storlek: 22, farg: 'B3261E' }),
      ...b.listor.flatMap((x) => [stycke(x.rubrik, { kursiv: true, storlek: 20, farg: FARG.svag, fore: 80, efter: 20 }), ...x.punkter.map((p) => stycke(p, { kursiv: true, storlek: 20, efter: 20 }))]),
      ...(b.citat.length > 1 ? [stycke(b.citat.slice(0, -1).map(citat).join(' '), { kursiv: true, storlek: 19, farg: BRUN, fore: 120 })] : []),
    ],
    () => [
      stycke(b.tabell.rubrik, { kursiv: true, storlek: 20, farg: FARG.svag, efter: 40 }),
      ...rubrikTabell(b.tabell.kolumner, b.tabell.rader, kolumnBredder(b.tabell.kolumner.length), { huvudFyll: FARG.svag, radrubrik: false }),
      ...(b.annat ? [stycke(b.annat.rubrik, { kursiv: true, storlek: 20, farg: FARG.svag, efter: 20 }), ...b.annat.rader.map((r) => stycke(r, { kursiv: true, storlek: 20, efter: 20 }))] : []),
      ...(b.svar ? [stycke(b.svar, { kursiv: true, fet: true, storlek: 22, farg: 'B3261E', fore: 80 })] : []),
      ...(b.citat.length ? [stycke(citat(b.citat[b.citat.length - 1]), { kursiv: true, storlek: 19, farg: BRUN, fore: 120 })] : []),
    ],
  );
}

// Faktarutan: samma uppgifter som på sidan, så att Word-filen står för sig själv.
function faktaTabell(d: MetodData): Barn[] {
  const rader: [string, string][] = [['Område', d.omrade], ['Årskurs', arskursText(d)]];
  if (d.format.length) rader.push(['Format', d.format.join(', ')]);
  if (d.tid) rader.push(['Tid', d.tid]);
  if (d.period) rader.push(['Period', d.period]);
  if (d.grupp) rader.push(['Grupp', d.grupp]);
  if (d.material.length) rader.push(['Material', `${d.material.join('. ')}.`]);
  if (d.uppdaterad) rader.push(['Uppdaterad', datumText(d.uppdaterad)]);
  const bredder = [2000, BREDD - 2000];
  return [tabell(rader.map(([etikett, varde]) => rad([
    cell([stycke(etikett, { fet: true, storlek: 20, efter: 0 })], { bredd: bredder[0], fyll: FARG.ljus }),
    cell([stycke(varde, { storlek: 20, efter: 0 })], { bredd: bredder[1] }),
  ])), bredder), avstand()];
}

// Hela metoden i den ordning modellen har.
function metodBarn(post: MetodPost, bas: string): Barn[] {
  const d = post.data;
  const ut: Barn[] = [];
  ut.push(new Paragraph({ children: [run(d.titel)], heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 60 } }));
  if (d.undertitel) ut.push(stycke(d.undertitel, { kursiv: true, farg: FARG.huvud, storlek: 24, efter: 80 }));
  ut.push(stycke(metaRad(d), { farg: FARG.svag, storlek: 20, efter: 200 }));
  ut.push(stycke(d.ingress, { storlek: 24, efter: 160 }));
  ut.push(...faktaTabell(d));
  for (const s of d.inledning) ut.push(stycke(s));
  if (d.upplagg) ut.push(...ruta(d.upplagg.rubrik, d.upplagg.text));
  if (d.gruppen) ut.push(...ruta(d.gruppen.rubrik, d.gruppen.text));
  if (d.principer) ut.push(...ruta(d.principer.rubrik, d.principer.text));
  const friTabell = (t: MetodData['tabeller'][number]) => {
    ut.push(h2(t.rubrik));
    if (t.text) ut.push(stycke(t.text, { hallIhop: true }));
    const forsta = 2300;
    const rest = Math.floor((BREDD - forsta) / (t.kolumner.length - 1));
    const bredder = t.kolumner.map((_, i) => (i === 0 ? forsta : i === t.kolumner.length - 1 ? BREDD - forsta - rest * (t.kolumner.length - 2) : rest));
    ut.push(...rubrikTabell(t.kolumner, t.rader, bredder, { radrubrik: false }));
    if (t.not) ut.push(...ruta('', t.not));
  };
  for (const t of d.tabeller.filter((x) => x.plats === 'efter-inledning')) friTabell(t);
  const pass = passOversikt(d);
  if (pass && d.passrutin) {
    ut.push(h2(pass.rubrik));
    if (d.passrutin.text) ut.push(stycke(d.passrutin.text, { hallIhop: true }));
    if (pass.text) ut.push(stycke(pass.text, { hallIhop: true }));
    ut.push(...passRemsa(pass));
    ut.push(...passTabell(pass, stegTexter(d).length));
    if (pass.efterTabell) ut.push(stycke(pass.efterTabell, { farg: FARG.svag }));
  } else if (d.passrutin) {
    ut.push(h2(d.passrutin.rubrik));
    if (d.passrutin.text) ut.push(stycke(d.passrutin.text, { hallIhop: true }));
    ut.push(...rutinRuta(stegTexter(d)));
    if (d.passrutin.efter) ut.push(stycke(d.passrutin.efter, { farg: FARG.svag }));
  }
  if (d.tidsschema && !pass) {
    ut.push(h2(d.tidsschema.rubrik));
    if (d.tidsschema.text) ut.push(stycke(d.tidsschema.text, { hallIhop: true }));
    ut.push(...rubrikTabell(['Tid', 'Fas', 'Vad händer'], d.tidsschema.rader.map((r) => [r.tid, r.fas, r.vad]), [1700, 2200, BREDD - 3900], { fetAndra: true }));
    if (d.tidsschema.efter) ut.push(stycke(d.tidsschema.efter, { farg: FARG.svag }));
  }
  for (const t of d.tabeller.filter((x) => x.plats === 'efter-tidsschema')) friTabell(t);
  if (d.steg) {
    ut.push(h2(d.steg.rubrik));
    if (d.steg.text) ut.push(stycke(d.steg.text, { hallIhop: true }));
    ut.push(...stegTabell(d.steg));
  }
  for (const t of d.tabeller.filter((x) => x.plats === 'efter-steg')) friTabell(t);
  if (d.arbetsform) {
    ut.push(h2(d.arbetsform.rubrik));
    ut.push(stycke(d.arbetsform.text, { hallIhop: pass ? false : true }));
    if (!(pass && pass.delar.length)) ut.push(...band(d.arbetsform.delar));
  }
  for (const t of d.tabeller.filter((x) => x.plats === 'efter-arbetsform')) friTabell(t);
  if (d.exempel) {
    ut.push(h2(d.exempel.rubrik));
    ut.push(...ruta(`${d.exempel.valt.rubrik}:`, d.exempel.valt.text, { kursivText: true }));
    for (const s of d.exempel.text) ut.push(exempelStycke(s));
    const tavla = d.exempel.tavla ? d.lathund?.mall.block.find((b): b is Tavla => b.typ === 'tavla') : undefined;
    if (tavla) {
      ut.push(stycke('Tavlan under passet', { fet: true, farg: FARG.huvud, storlek: 20, fore: 120, efter: 60, hallIhop: true }));
      ut.push(...tavlaBarn(tavla));
      if (d.exempel.tavlaText) ut.push(stycke(d.exempel.tavlaText, { farg: FARG.svag, fore: 80 }));
      else ut.push(avstand(80));
    }
  }
  if (d.fastnar) {
    ut.push(h2(d.fastnar.rubrik));
    ut.push(stycke(d.fastnar.text, { hallIhop: true }));
    ut.push(...fragaRuta('Fråga alltid först:', d.fastnar.fragaForst));
    ut.push(stycke(d.fastnar.trappaText, { hallIhop: true }));
    nyLista();
    for (const t of d.fastnar.trappa) ut.push(numrerad(t));
    if (d.fastnar.efter) ut.push(stycke(d.fastnar.efter, { farg: FARG.svag, fore: 80 }));
    else ut.push(avstand(80));
    if (d.fastnar.motto) ut.push(...motto(d.fastnar.motto));
  }
  for (const t of d.tabeller.filter((x) => x.plats === 'efter-fastnar')) friTabell(t);
  if (d.roll) {
    ut.push(h2(d.roll.rubrik));
    ut.push(stycke(d.roll.text, { hallIhop: true }));
    ut.push(...gorUndvik(d.roll.gor, d.roll.undvik));
  }
  if (d.urval) {
    ut.push(h2(d.urval.rubrik));
    for (const s of d.urval.text) ut.push(stycke(s));
    if (d.urval.kravText) ut.push(stycke(d.urval.kravText, { hallIhop: true }));
    ut.push(...band(d.urval.krav));
  }
  for (const t of d.tabeller.filter((x) => x.plats === 'efter-urval')) friTabell(t);
  if (d.hem) {
    ut.push(h2(d.hem.rubrik));
    for (const s of d.hem.text) ut.push(stycke(s));
    if (d.hem.kontrakt) ut.push(...kontraktRuta(d.hem.kontrakt));
    if (d.hem.schema) ut.push(stycke(`${d.hem.schema.rubrik}: ${d.hem.schema.text ? `${d.hem.schema.text} ` : ''}Schemat med ${d.hem.schema.rader} rader att fylla i finns i planeringsmallarna.`, { farg: FARG.svag }));
  }
  if (d.progression) {
    ut.push(h2(d.progression.rubrik));
    if (d.progression.text) ut.push(stycke(d.progression.text, { hallIhop: true }));
    ut.push(...rubrikTabell([d.progression.enhet, 'Fokus', 'Lärarens roll'], d.progression.rader.map((r) => [r.led ? `${r.vecka}\n${r.led}` : r.vecka, r.fokus, r.roll]), [1700, 4000, BREDD - 5700]));
  }
  if (d.uppfoljning) {
    ut.push(h2(d.uppfoljning.rubrik));
    if (d.uppfoljning.text) ut.push(stycke(d.uppfoljning.text, { hallIhop: true }));
    ut.push(...tvaKolumner(d.uppfoljning.rader));
  }
  if (d.mal) {
    ut.push(h2(d.mal.rubrik));
    ut.push(stycke(d.mal.text, { hallIhop: true }));
    ut.push(...bockar(d.mal.punkter, 2));
  }
  if (d.snabbmall) {
    ut.push(h2(d.snabbmall.rubrik));
    if (d.snabbmall.text) ut.push(stycke(d.snabbmall.text, { hallIhop: true }));
    ut.push(...snabbmallTabell(d.titel, d.snabbmall.fore, d.snabbmall.efter));
  }
  if (d.checklista) {
    ut.push(h2(d.checklista.rubrik));
    ut.push(...bockar(d.checklista.punkter, 1));
  }
  if (d.grund) {
    ut.push(h2(d.grund.rubrik));
    ut.push(...grundRuta(d.grund.text));
    if (d.grund.kallor) ut.push(stycke(d.grund.kallor, { farg: FARG.svag, storlek: 18 }));
  }
  for (const t of d.tabeller.filter((x) => x.plats === 'efter-grund')) friTabell(t);
  if (d.ramar) {
    ut.push(h2(d.ramar.rubrik));
    for (const s of d.ramar.text) ut.push(stycke(s));
    for (const ram of d.ramar.ramar) {
      ut.push(new Paragraph({ children: [run(ram.rubrik)], heading: HeadingLevel.HEADING_3, keepNext: true, spacing: { before: 240, after: 80 } }));
      if (ramArTom(ram)) {
        for (const s of ram.text) ut.push(stycke(s));
        ut.push(stycke(`Ramen att fylla i, med ${ram.delar.length} delar, finns i planeringsmallarna.`, { farg: FARG.svag }));
      } else ut.push(...ramBarn(ram));
    }
    if (d.ramar.efter) ut.push(stycke(d.ramar.efter, { farg: FARG.svag }));
  }
  if (d.diplom) {
    ut.push(h2(d.diplom.rubrik));
    ut.push(stycke('Diplomet finns som egen sida i planeringsmallarna.', { farg: FARG.svag }));
  }
  return ut;
}

// Mallarna: snabbmallen, checklistan, målkollen, kontraktet, schemat, ramarna och diplomet, en per
// sida, med plats att skriva. I filen med allt står de färdiga ramarna redan i beskrivningen och
// hoppas då över här (baraTommaRamar); i mallfilen för sig finns alla ramar.
function mallBarn(post: MetodPost, bas: string, o: { baraTommaRamar?: boolean } = {}): Barn[][] {
  const d = post.data;
  const sidor: Barn[][] = [];
  const under = (namn: string) => [
    new Paragraph({ children: [run(namn)], heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 40 } }),
    stycke(`${d.titel} · ${arskursText(d)}`, { kursiv: true, farg: FARG.huvud, storlek: 24, efter: 160 }),
  ];
  if (d.snabbmall) {
    sidor.push([
      ...under('Snabbmall'),
      ...(d.snabbmall.text ? [stycke(d.snabbmall.text)] : []),
      skrivrad(['Datum', 'Pass nr', 'Grupp']),
      ...snabbmallTabell(d.titel, d.snabbmall.fore, d.snabbmall.efter, { skrivrum: true }),
    ]);
  }
  if (d.checklista) {
    sidor.push([
      ...under(d.checklista.rubrik),
      stycke('Bocka av inför varje pass. Det som inte är gjort görs innan eleverna kommer.'),
      skrivrad(['Datum', 'Pass nr']),
      ...bockar(d.checklista.punkter, 1, { hojd: 560 }),
    ]);
  }
  if (d.hem?.kontrakt) {
    const k = d.hem.kontrakt;
    const b = Math.floor(BREDD / 3);
    const underskrifter = tabell([
      rad(['Lärare', 'Elev', 'Vårdnadshavare'].map((namn) => cell([stycke(namn, { fet: true, storlek: 20, efter: 0 })], { bredd: b, kanter: runt(kant()) })), { huvud: true }),
      rad([0, 1, 2].map(() => cell([stycke('', { efter: 0 })], { bredd: b, kanter: runt(kant()) })), { hojd: 1000 }),
    ], [b, b, b]);
    sidor.push([
      ...under(k.rubrik),
      skrivrad(['Elev', 'Klass']),
      ...kontraktRuta(k),
      skrivrad(['Tidsomfång, veckor', 'Från', 'Till']),
      stycke('Underskrifter', { fet: true, storlek: 20, efter: 60 }),
      underskrifter,
    ]);
  }
  if (d.hem?.schema) {
    const s = d.hem.schema;
    sidor.push([
      ...under(s.rubrik),
      ...(s.text ? [stycke(s.text)] : []),
      skrivrad(['Elev', 'Period']),
      schemaTabell(s),
    ]);
  }
  if (d.mal) {
    const bredder = [BREDD - 2400, 1200, 1200];
    const huvud = rad(['Efter perioden ska eleven oftare kunna', 'Före', 'Efter'].map((k, i) => cell([stycke(k, { fet: true, farg: FARG.vit, storlek: 20, mitt: i > 0, efter: 0 })], { bredd: bredder[i], fyll: FARG.huvud, kanter: runt(kant(FARG.huvud)) })), { huvud: true });
    const kropp = d.mal.punkter.map((p, i) => rad([
      cell([stycke(p, { storlek: 20, efter: 0 })], { bredd: bredder[0], fyll: i % 2 === 1 ? FARG.rand : undefined, mitt: true }),
      cell([new Paragraph({ children: [run(BOCK, { font: 'Segoe UI Symbol', farg: FARG.huvud, storlek: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 0 } })], { bredd: bredder[1], fyll: i % 2 === 1 ? FARG.rand : undefined, mitt: true }),
      cell([new Paragraph({ children: [run(BOCK, { font: 'Segoe UI Symbol', farg: FARG.huvud, storlek: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 0 } })], { bredd: bredder[2], fyll: i % 2 === 1 ? FARG.rand : undefined, mitt: true }),
    ], { hojd: 520 }));
    const notering = tabell([rad([cell([stycke('Notering', { fet: true, storlek: 20, efter: 0 })], { bredd: BREDD, kanter: runt(kant()) })], { hojd: 2400 })], [BREDD]);
    sidor.push([
      ...under('Målkoll före och efter'),
      stycke('Fyll i före insatsen och igen efter perioden. Kryssa i det eleven klarar, och skriv under Notering vilket stöd som behövdes.'),
      skrivrad(['Elev', 'Datum före', 'Datum efter']),
      tabell([huvud, ...kropp], bredder),
      avstand(),
      notering,
      avstand(),
    ]);
  }
  if (d.ramar) {
    for (const ram of d.ramar.ramar) {
      const tom = ramArTom(ram);
      if (o.baraTommaRamar && !tom) continue;
      sidor.push([...under(ram.rubrik), ...ramBarn(ram, { skrivrum: tom, stor: true })]);
    }
  }
  if (d.diplom) sidor.push([...under(d.diplom.rubrik), ...diplomBarn(d.diplom)]);
  for (const sida of sidor) sida.push(stycke(`${UPPHOV}. Mall till ${d.titel}, ${metodAdress(bas, post.id)}.`, { farg: FARG.svag, storlek: 18, fore: 160 }));
  return sidor;
}

// Kolumnbredder som fyller innehållsbredden; första kolumnen kan få en egen andel.
function kolumnBredder(antal: number, forstaAndel?: number): number[] {
  const forsta = forstaAndel ? Math.floor(BREDD * forstaAndel) : Math.floor(BREDD / antal);
  const rest = Math.floor((BREDD - forsta) / (antal - 1));
  return Array.from({ length: antal }, (_, i) => (i === 0 ? forsta : i === antal - 1 ? BREDD - forsta - rest * (antal - 2) : rest));
}

// Lathunden: fyra liggande sidor med snabbguidens designelement. Mörk rubrikrad på rutorna,
// cremefärgade noter, faktarutor och kickers i versaler.
const CREME = 'FBF3E4';
const BRUN = '8A5A1E';
const MONO = 'Consolas';
// Kickers är riktiga rubriker (nivå 3) så att dokumentet går att navigera, med eget utseende.
function kicker(text: string, o: { farg?: string; efter?: number; fore?: number } = {}): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: MONO, size: 15, bold: false, allCaps: true, characterSpacing: 20, color: o.farg ?? FARG.svag })], spacing: { before: o.fore ?? 160, after: o.efter ?? 60 }, keepNext: true });
}
function lhHuvud(titel: string, etikett: string): Barn[] {
  const barn = [new Paragraph({
    heading: HeadingLevel.HEADING_2,
    tabStops: [{ type: TabStopType.RIGHT, position: BREDD - 240 }],
    children: [
      new TextRun({ text: 'LATHUND  ', font: MONO, size: 15, bold: false, color: 'DDE6E1', characterSpacing: 20 }),
      new TextRun({ text: titel, bold: true, size: 28, color: FARG.vit, font: 'Calibri' }),
      new TextRun({ children: [new Tab()] }),
      new TextRun({ text: etikett, font: MONO, size: 15, bold: false, allCaps: true, color: 'DDE6E1', characterSpacing: 20 }),
    ],
    spacing: { before: 0, after: 0 },
  })];
  return [tabell([rad([cell(barn, { bredd: BREDD, fyll: FARG.huvud, kanter: runt(kant(FARG.huvud)), mitt: true })])], [BREDD]), avstand(120)];
}
// Faktarutor i en rad: kicker och värde, ljus bakgrund.
function lhRutor(delar: { rubrik: string; text: string }[], o: { storlek?: number; under?: string[] } = {}): Barn[] {
  const bredd = Math.floor(BREDD / delar.length);
  const bredder = delar.map((_, i) => (i === delar.length - 1 ? BREDD - bredd * (delar.length - 1) : bredd));
  return [tabell([rad(delar.map((d, i) => cell([
    kicker(d.rubrik, { fore: 0, efter: 20 }),
    stycke(d.text, { fet: true, storlek: o.storlek ?? 24, efter: o.under?.[i] ? 20 : 0 }),
    ...(o.under?.[i] ? [stycke(o.under[i], { storlek: 19, efter: 0 })] : []),
  ], { bredd: bredder[i], fyll: FARG.rand })))], bredder), avstand(120)];
}
// Ruta med mörk rubrikrad.
function lhRuta(rubrik: string, barn: Barn[]): Barn[] {
  return [tabell([
    rad([cell([new Paragraph({ children: [new TextRun({ text: rubrik, font: MONO, size: 16, allCaps: true, color: FARG.vit, characterSpacing: 20 })], spacing: { after: 0 } })], { bredd: BREDD, fyll: FARG.text, kanter: runt(kant(FARG.text)) })]),
    rad([cell(barn, { bredd: BREDD, kanter: { left: kant(FARG.text, 8), right: kant(FARG.text, 8), bottom: kant(FARG.text, 8), top: kant(FARG.text, 8) } })]),
  ], [BREDD]), avstand(120)];
}
function lhNot(barn: Barn[]): Barn[] {
  return [tabell([rad([cell(barn, { bredd: BREDD, fyll: CREME, kanter: { ...runt(kant(CREME)), left: kant(BRUN, 24) } })])], [BREDD]), avstand(120)];
}
function lhGra(barn: Paragraph[]): Barn[] {
  return [tabell([rad([cell(barn, { bredd: BREDD, fyll: FARG.kant, kanter: runt(kant(FARG.kant)) })])], [BREDD]), avstand(120)];
}
// Tomma skrivrader.
function lhRader(antal: number, hojd = 420): Barn[] {
  return [tabell(Array.from({ length: antal }, () => rad([cell([], { bredd: BREDD, kanter: { top: { style: BorderStyle.NONE, size: 0, color: 'auto' }, left: { style: BorderStyle.NONE, size: 0, color: 'auto' }, right: { style: BorderStyle.NONE, size: 0, color: 'auto' }, bottom: kant(FARG.kant) } })], { hojd })), [BREDD]), avstand(80)];
}
// Två spalter utan kanter. Innehållet i spalterna byggs med spaltens bredd.
function lhSpalter(vanster: () => Barn[], hoger: () => Barn[]): Barn[] {
  const mellan = 360;
  const halv = Math.floor((BREDD - mellan) / 2);
  const inre = halv - 240;
  const v = medBredd(inre, vanster);
  const h = medBredd(inre, hoger);
  const ingen = { style: BorderStyle.NONE, size: 0, color: 'auto' } as const;
  const fyll = (b: Barn[]) => (b.length ? b : [new Paragraph({ spacing: { after: 0 } })]);
  return [new Table({
    width: { size: BREDD, type: WidthType.DXA },
    columnWidths: [halv, mellan, BREDD - halv - mellan],
    layout: TableLayoutType.FIXED,
    borders: { top: ingen, bottom: ingen, left: ingen, right: ingen, insideHorizontal: ingen, insideVertical: ingen },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: halv, type: WidthType.DXA }, borders: runt(ingen), margins: { top: 0, bottom: 0, left: 0, right: 0 }, children: fyll(v) as (Paragraph | Table)[] }),
      new TableCell({ width: { size: mellan, type: WidthType.DXA }, borders: runt(ingen), margins: { top: 0, bottom: 0, left: 0, right: 0 }, children: [new Paragraph({ spacing: { after: 0 } })] }),
      new TableCell({ width: { size: BREDD - halv - mellan, type: WidthType.DXA }, borders: runt(ingen), margins: { top: 0, bottom: 0, left: 0, right: 0 }, children: fyll(h) as (Paragraph | Table)[] }),
    ] })],
  })];
}
const punktStycken = (punkter: { fet?: string; text?: string }[], storlek = 20) => punkter.map((p, i, alla) => new Paragraph({
  children: [...(p.fet ? [new TextRun({ text: p.fet, bold: true, size: storlek })] : []), ...(p.text ? [new TextRun({ text: `${p.fet ? ' ' : ''}${p.text}`, size: storlek })] : [])],
  spacing: { after: i === alla.length - 1 ? 0 : 60 },
}));

function lathundBarn(post: MetodPost): Barn[][] {
  const d = post.data;
  const l = d.lathund;
  if (!l) return [];
  const sidor: Barn[][] = [];
  const citat = (f: string) => `”${f}”`;
  const stor = (t: string) => stycke(t, { storlek: 20 });

  // 1. Metoden.
  sidor.push([
    ...lhHuvud(d.titel, 'Metoden · 1/4'),
    ...lhRutor(lathundFakta(d)),
    ...lhSpalter(
      () => [
        kicker('Så fungerar insatsen', { farg: FARG.huvud, fore: 60 }),
        ...l.metoden.text.map(stor),
        ...lhRuta(l.metoden.ruta.rubrik, [
          ...(l.metoden.ruta.inledning ? [stycke(l.metoden.ruta.inledning, { fet: true, storlek: 20, efter: 60 })] : []),
          ...punktStycken(l.metoden.ruta.punkter),
          ...(l.metoden.ruta.efter ? [stycke(l.metoden.ruta.efter, { farg: FARG.svag, storlek: 19, fore: 60, efter: 0 })] : []),
        ]),
        ...(arbetsformRad(d) ? [kicker('Arbetsform', { farg: FARG.huvud, fore: 60 }), stycke(arbetsformRad(d), { storlek: 20 })] : []),
      ],
      () => [
        kicker(l.metoden.tabell.rubrik, { farg: FARG.huvud, fore: 60 }),
        ...rubrikTabell(l.metoden.tabell.kolumner, l.metoden.tabell.rader, kolumnBredder(l.metoden.tabell.kolumner.length, 0.3), { huvudFyll: FARG.text }),
        ...(l.metoden.not ? lhNot([stycke(l.metoden.not, { storlek: 20, efter: 0 })]) : []),
      ],
    ),
  ]);

  // 2. Ett pass.
  sidor.push([
    ...lhHuvud(l.pass.rubrik, 'Ett pass · 2/4'),
    ...lhSpalter(
      () => [
        ...lhRuta(l.pass.textRubrik, [
          ...(l.pass.titel ? [stycke(l.pass.titel, { fet: true, storlek: 21, efter: 40 })] : []),
          ...l.pass.text.map((p, i, alla) => exempelStycke(p, { storlek: 18, efter: i === alla.length - 1 ? 0 : 40 })),
        ]),
        ...lhNot([kicker(l.pass.forberett.rubrik, { farg: BRUN, fore: 0 }), ...l.pass.forberett.text.map((p, i, alla) => stycke(p, { storlek: 18, efter: i === alla.length - 1 ? 0 : 40 }))]),
        ...(l.pass.klarTidigt ? lhGra([kicker('Klar tidigt', { fore: 0 }), stycke(l.pass.klarTidigt, { storlek: 18, efter: 0 })]) : []),
      ],
      () => {
        const bredder = [1300, BREDD - 1300];
        const huvud = rad(['Tid', 'Vad händer'].map((k, i) => cell([new Paragraph({ children: [new TextRun({ text: k, font: MONO, size: 16, allCaps: true, color: FARG.vit, characterSpacing: 20 })], spacing: { after: 0 } })], { bredd: bredder[i], fyll: FARG.text, kanter: runt(kant(FARG.text)) })), { huvud: true });
        const kropp = l.pass.schema.rader.map((r, i) => rad([
          cell([new Paragraph({ children: [new TextRun({ text: r.tid, font: MONO, size: 18, bold: true, color: FARG.svag })], spacing: { after: 0 } })], { bredd: bredder[0], fyll: i % 2 === 1 ? FARG.rand : undefined }),
          cell([
            stycke(r.fas, { fet: true, storlek: 19, efter: 10 }),
            stycke(r.vad, { storlek: 18, efter: r.fraser.length ? 10 : 0 }),
            ...(r.fraser.length ? [stycke(r.fraser.map(citat).join(' · '), { kursiv: true, farg: BRUN, storlek: 18, efter: 0 })] : []),
          ], { bredd: bredder[1], fyll: i % 2 === 1 ? FARG.rand : undefined }),
        ]));
        return [kicker(l.pass.schema.rubrik, { farg: FARG.huvud, fore: 60 }), tabell([huvud, ...kropp], bredder)];
      },
    ),
  ]);

  // 3. Mallen. Spalterna och tavlan tar hela bredden; övriga block flödar i två spalter, som på sidan.
  const mall: Barn[] = [...lhHuvud(l.mall.rubrik, 'Mallen · 3/4')];
  if (l.mall.underrad) mall.push(kicker(l.mall.underrad, { fore: 0, efter: 120 }));
  // De smala blocken fördelas på två spalter som på sidan: där lägger webbläsaren dem i ordning och
  // delar där spalterna blir jämnast i höjd. Här uppskattas höjden i rader och delningen väljs så att
  // den högsta spalten blir så låg som möjligt.
  const smala: { vikt: number; f: () => Barn[] }[] = [];
  const tomSmala = () => {
    if (!smala.length) return;
    const total = smala.reduce((s, b) => s + b.vikt, 0);
    let bast = 1;
    let bastHojd = Infinity;
    for (let k = 1; k <= smala.length; k++) {
      const vanster = smala.slice(0, k).reduce((s, b) => s + b.vikt, 0);
      const hojd = Math.max(vanster, total - vanster);
      if (hojd < bastHojd) { bastHojd = hojd; bast = k; }
    }
    const vanster = smala.slice(0, bast);
    const hoger = smala.slice(bast);
    mall.push(...lhSpalter(() => vanster.flatMap((b) => b.f()), () => hoger.flatMap((b) => b.f())));
    smala.length = 0;
  };
  for (const b of l.mall.block) {
    if (b.typ === 'spalter') {
      tomSmala();
      const par: typeof b.kolumner[] = [];
      for (let i = 0; i < b.kolumner.length; i += 2) par.push(b.kolumner.slice(i, i + 2));
      for (const p of par) {
        const spalt = (k: { namn: string; fraga: string } | undefined, nr: number) => () => (k ? [
          new Paragraph({ children: [new TextRun({ text: `${nr}  `, font: MONO, color: FARG.huvud, size: 18 }), new TextRun({ text: k.namn, bold: true, size: 24 }), new TextRun({ text: `  ${citat(k.fraga)}`, size: 19, color: FARG.svag })], border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: FARG.text, space: 2 } }, spacing: { after: 60 } }),
          ...lhRader(b.rader, 330),
        ] : []);
        const nr = b.kolumner.indexOf(p[0]) + 1;
        mall.push(...lhSpalter(spalt(p[0], nr), spalt(p[1], nr + 1)));
      }
    } else if (b.typ === 'skrivruta') {
      smala.push({ vikt: b.rader + 2, f: () => lhNot([
        new Paragraph({ children: [new TextRun({ text: b.rubrik, bold: true, size: 22 }), ...(b.text ? [new TextRun({ text: `  ${b.text}`, size: 19, color: FARG.svag })] : [])], spacing: { after: 60 } }),
        ...lhRader(b.rader, 320),
      ]) });
    } else if (b.typ === 'tavla') {
      tomSmala();
      mall.push(...tavlaBarn(b));
    } else if (b.typ === 'snabbmall' && d.snabbmall) {
      const sm = d.snabbmall;
      smala.push({ vikt: sm.fore.length + sm.efter.length + 3, f: () => snabbmallTabell(d.titel, sm.fore, sm.efter, { skrivrum: true, hojd: 640 }) });
    } else if (b.typ === 'tabell') {
      const korta = b.rader.every((r) => r.every((c) => c.length <= 12));
      smala.push({ vikt: b.rader.length + 2, f: () => [kicker(b.rubrik, { farg: FARG.huvud, fore: 0 }), ...(korta ? elevlista({ kolumner: b.kolumner, rader: b.rader }, { storlek: 22 }) : rubrikTabell(b.kolumner, b.rader, kolumnBredder(b.kolumner.length, 0.3), { huvudFyll: FARG.text, radrubrik: false }))] });
    } else if (b.typ === 'kedja') {
      smala.push({ vikt: 3, f: () => [
        kicker(b.rubrik, { farg: FARG.huvud, fore: 0 }),
        new Paragraph({ children: b.steg.flatMap((s, i) => [...(i > 0 ? [new TextRun({ text: '  →  ', color: FARG.svag })] : []), new TextRun({ text: s, italics: true, bold: true, size: 21, color: i === b.steg.length - 1 ? '2E7D32' : FARG.text })]), spacing: { after: 120 } }),
        ...(b.citat ? [stycke(citat(b.citat), { kursiv: true, farg: BRUN, storlek: 20 })] : []),
      ] });
    } else if (b.typ === 'not') {
      smala.push({ vikt: 1 + Math.ceil(b.text.length / 110), f: () => lhNot([stycke(b.text, { storlek: 20, efter: 0 })]) });
    }
  }
  tomSmala();
  sidor.push(mall);

  // 4. Material.
  const material: Barn[] = [...lhHuvud(l.material.rubrik, 'Material · 4/4')];
  if (d.urval) material.push(...lhRutor(d.urval.krav.map((k, i) => ({ rubrik: `${l.material.kravEtikett} ${i + 1}`, text: k.rubrik })), { storlek: 22, under: d.urval.krav.map((k) => k.text) }));
  material.push(...lhSpalter(
    () => [
      kicker(l.material.var.rubrik, { farg: FARG.huvud, fore: 60 }),
      ...punktStycken(l.material.var.punkter),
      ...(l.material.var.efter ? [stycke(l.material.var.efter, { farg: FARG.svag, storlek: 19, fore: 80 })] : [avstand(80)]),
      ...lhRuta('På bordet när passet börjar', l.material.bordet.map((p, i, alla) => stycke(p, { storlek: 20, efter: i === alla.length - 1 ? 0 : 40 }))),
    ],
    () => [
      ...(d.checklista ? lhRuta(d.checklista.rubrik, d.checklista.punkter.map((p, i, alla) => new Paragraph({ children: [run(`${BOCK} `, { font: 'Segoe UI Symbol', farg: FARG.huvud, storlek: 20 }), run(p, { storlek: 20 })], spacing: { after: i === alla.length - 1 ? 0 : 40 } }))) : []),
      ...(d.uppfoljning || l.material.varjePass ? lhRuta('Uppföljning', [
        ...(d.uppfoljning?.rader ?? []).map((r) => new Paragraph({ children: [new TextRun({ text: `${r.nar}: `, bold: true, size: 20 }), new TextRun({ text: r.vad, size: 20 })], spacing: { after: 60 } })),
        ...(l.material.varjePass ? [new Paragraph({ children: [new TextRun({ text: 'Varje pass: ', bold: true, size: 20 }), new TextRun({ text: l.material.varjePass, size: 20 })], spacing: { after: 0 } })] : []),
      ]) : []),
    ],
  ));
  sidor.push(material);
  return sidor;
}

function sidhuvud(text: string): Header {
  return new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(text, { farg: FARG.svag, storlek: 18 })], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: FARG.kant, space: 4 } }, spacing: { after: 0 } })] });
}
function sidfot(adress: string, bredd: number): Footer {
  return new Footer({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: bredd }],
    children: [run(`${UPPHOV} · ${adress}`, { farg: FARG.svag, storlek: 18 }), new TextRun({ children: [new Tab(), 'Sida ', PageNumber.CURRENT, ' av ', PageNumber.TOTAL_PAGES], color: FARG.svag, size: 18 })],
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: FARG.kant, space: 4 } },
    spacing: { after: 0 },
  })] });
}
function sektion(barn: Barn[], huvudtext: string, adress: string, o: { liggande?: boolean } = {}): ISectionOptions {
  return {
    properties: { page: { size: { ...A4, orientation: o.liggande ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: MARGINAL, right: MARGINAL, bottom: MARGINAL, left: MARGINAL, header: 567, footer: 567 } } },
    headers: { default: sidhuvud(huvudtext) },
    footers: { default: sidfot(adress, o.liggande ? BREDD_LIGGANDE : BREDD_STAENDE) },
    children: barn,
  };
}
function dokument(titel: string, sektioner: ISectionOptions[]): Document {
  return new Document({
    creator: 'Niclas Fohlin',
    title: titel,
    description: `${UPPHOV} · ${SAJT}`,
    // Rubrikerna som standardstilar (en definition per nivå) och svenska som dokumentspråk.
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22, color: FARG.text, language: { value: 'sv-SE' } } },
        heading1: { run: { size: 44, bold: true, color: FARG.huvud, font: 'Calibri' }, paragraph: { outlineLevel: 0, keepNext: true, spacing: { before: 0, after: 80 } } },
        heading2: { run: { size: 28, bold: true, color: FARG.huvud, font: 'Calibri' }, paragraph: { outlineLevel: 1, keepNext: true, spacing: { before: 320, after: 100 } } },
        heading3: { run: { size: 24, bold: true, color: FARG.huvud, font: 'Calibri' }, paragraph: { outlineLevel: 2, keepNext: true, spacing: { before: 200, after: 80 } } },
      },
    },
    numbering: { config: [{ reference: 'nummer', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START, style: { paragraph: { indent: { left: 540, hanging: 360 } }, run: { bold: true, color: FARG.huvud } } }] }] },
    sections: sektioner,
  });
}

// En eller flera metoder i en fil, med planeringsmallarna och lathunden efter varje metod om medMallar är satt.
export function metodDokument(poster: MetodPost[], o: { bas: string; medMallar?: boolean }): Document {
  instans = 0;
  const sektioner: ISectionOptions[] = [];
  if (poster.length === 0) {
    sektioner.push(sektion([stycke('Inga metoder är publicerade ännu.')], `Stödundervisning · ${SAJT}`, `${SAJT}/stodundervisning`));
  }
  if (poster.length > 1) {
    const bredder = [4600, 2000, BREDD - 6600];
    sektioner.push(sektion([
      new Paragraph({ children: [run('Metoder för stödundervisning')], heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 60 } }),
      stycke(`${poster.length} metoder från ${SAJT}, hämtade ${datumText(new Date())}. Varje metod börjar på en ny sida${o.medMallar ? ', och efter varje metod följer planeringsmallarna och lathunden' : ''}.`, { farg: FARG.svag, efter: 240 }),
      ...rubrikTabell(['Metod', 'Område', 'Årskurs'], poster.map((p) => [p.data.titel, p.data.omrade, arskursText(p.data)]), bredder),
      stycke(`${UPPHOV}. Metoderna får användas i undervisning. Ange ${SAJT} som källa när de sprids vidare.`, { farg: FARG.svag, storlek: 18, fore: 200 }),
    ], `Stödundervisning · ${SAJT}`, `${SAJT}/stodundervisning`));
  }
  for (const post of poster) {
    const adress = metodAdress(o.bas, post.id).replace(/^https?:\/\//, '');
    sektioner.push(sektion(metodBarn(post, o.bas), `${post.data.titel} · ${SAJT}`, adress));
    if (o.medMallar) {
      for (const sida of mallBarn(post, o.bas, { baraTommaRamar: true })) sektioner.push(sektion(sida, `Mall · ${post.data.titel} · ${SAJT}`, adress));
      for (const sida of medBredd(BREDD_LIGGANDE, () => lathundBarn(post))) sektioner.push(sektion(sida, `Lathund · ${post.data.titel} · ${SAJT}`, `${adress}/lathund`, { liggande: true }));
    }
  }
  return dokument(poster.length === 1 ? poster[0].data.titel : 'Metoder för stödundervisning', sektioner);
}

// Lathunden till en metod: fyra liggande sidor.
export function lathundDokument(post: MetodPost, o: { bas: string }): Document {
  instans = 0;
  const adress = `${metodAdress(o.bas, post.id).replace(/^https?:\/\//, '')}/lathund`;
  const sidor = medBredd(BREDD_LIGGANDE, () => lathundBarn(post));
  if (sidor.length === 0) sidor.push([stycke(`${post.data.titel} har ingen lathund.`)]);
  const sektioner = sidor.map((sida) => sektion(sida, `Lathund · ${post.data.titel} · ${SAJT}`, adress, { liggande: true }));
  return dokument(`Lathund: ${post.data.titel}`, sektioner);
}

// Bara mallarna till en metod.
export function mallDokument(post: MetodPost, o: { bas: string }): Document {
  instans = 0;
  const adress = metodAdress(o.bas, post.id).replace(/^https?:\/\//, '');
  const sidor = mallBarn(post, o.bas);
  if (sidor.length === 0) sidor.push([stycke(`${post.data.titel} har inga mallar.`)]);
  const sektioner = sidor.map((sida) => sektion(sida, `Mall · ${post.data.titel} · ${SAJT}`, adress));
  return dokument(`Mallar: ${post.data.titel}`, sektioner);
}
