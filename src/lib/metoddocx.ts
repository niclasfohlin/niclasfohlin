// Bygger Word-filer ur metodernas data: allt om metoden (beskrivning, planeringsmallar, lathund), delarna för sig, och flera metoder i en fil.
// Körs både i bygget (src/pages/stodundervisning/*.docx.ts) och i webbläsaren när läsaren
// laddar ner valda metoder från /stodundervisning. Därför inga Node-beroenden här.
// Designelementen är samma som på sidan (src/components/Metod.astro): rutor, tabeller med
// rubrikrad, band, gör/undvik och bockar. Varje sida bär © Niclas Fohlin och niclasfohlin.se.
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, HeightRule, ImportedXmlComponent, LevelFormat, LineRuleType, PageNumber, PageOrientation,
  Paragraph, ShadingType, Tab, Table, TableCell, TableLayoutType, TableRow, TabStopType, TextRun, VerticalAlign, WidthType,
  type IBorderOptions, type IRunOptions, type ISectionOptions,
} from 'docx';
import { arbetsformRad, arskursText, datumText, ejBryt, etikettOchText, lathundFakta, metaRad, metodAdress, passOversikt, ramArTom, stegTexter, SAJT, UPPHOV, type MetodData, type MetodPost } from './metod';
import { brakDelar, delnamn, kortInfo, lage, STANDARD_NAMNARE, type KortInfo, type Mall } from './brak';

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

// brak: bråken i texten står staplade (elevmaterial); nySida: stycket börjar på en ny sida.
// niva4: stycket är en rubrik på nivå 4 i Word (en listas rubrik under ramens nivå 3), så att den syns i navigeringen (K-035).
interface StyckeVal { kursiv?: boolean; fet?: boolean; farg?: string; storlek?: number; fore?: number; efter?: number; hallIhop?: boolean; mitt?: boolean; versaler?: boolean; font?: string; brak?: boolean; nySida?: boolean; niva4?: boolean }

function run(text: string, o: StyckeVal = {}): TextRun {
  const val: IRunOptions = { text, italics: o.kursiv, bold: o.fet, color: o.farg, size: o.storlek, allCaps: o.versaler, font: o.font };
  return new TextRun(val);
}
// Bråk i elevmaterialet står staplade (src/lib/brak.ts). Word får en ekvation (OMML) med vanlig text i Calibri, i
// textens färg och något större än texten, eftersom Word krymper täljare och nämnare i ett bråk i en mening.
// Samma lösning som i metodriggens kompendium.
const OMML = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
const WML = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function staplatBrak(taljare: string, namnare: string, storlek: number, farg: string): TextRun {
  const rpr = `<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/><w:color w:val="${farg}"/><w:sz w:val="${storlek}"/><w:szCs w:val="${storlek}"/></w:rPr>`;
  const r = (t: string) => `<m:r><m:rPr><m:nor/></m:rPr>${rpr}<m:t>${t}</m:t></m:r>`;
  const xml = `<m:oMath xmlns:m="${OMML}" xmlns:w="${WML}"><m:f><m:fPr><m:ctrlPr>${rpr}</m:ctrlPr></m:fPr><m:num>${r(taljare)}</m:num><m:den>${r(namnare)}</m:den></m:f></m:oMath>`;
  // fromXmlString lägger en namnlös rot runt elementet; ekvationen är rotens första barn. Den står i stycket
  // där en TextRun annars står.
  return (ImportedXmlComponent.fromXmlString(xml) as unknown as { root: unknown[] }).root[0] as TextRun;
}
// Faktorn 1,45 gör bråkets siffror lika höga som orden runt dem; Word krymper täljare och nämnare i en mening.
function brakBarn(text: string, o: StyckeVal = {}, faktor = 1.45): TextRun[] {
  const storlek = 2 * Math.round(((o.storlek ?? 22) * faktor) / 2);
  return brakDelar(text).map((x) => ('text' in x ? run(x.text, o) : staplatBrak(x.taljare, x.namnare, storlek, o.farg ?? FARG.text)));
}
// Exemplet berättas rakt; replikerna (”…”) sätts kursiva, som exempelfraserna, så att en lärare hittar det som sägs.
export function exempelStycke(text: string, o: { hallIhop?: boolean; storlek?: number; efter?: number } = {}): Paragraph {
  const delar = text.split(/(”[^”]*”)/).filter(Boolean);
  return new Paragraph({ children: delar.map((t) => run(t, { kursiv: t.startsWith('”'), storlek: o.storlek })), spacing: { before: 0, after: o.efter ?? 120 }, keepNext: o.hallIhop });
}
// En tabellcell med repliker (”…”) sätter dem kursiva, som exempelfraserna i stegtabellen (lathundens
// stegtabell, en fri tabell med ett citat), så att en lärare ser vad som sägs.
function replikStycke(text: string, o: StyckeVal = {}): Paragraph {
  const delar = text.split(/(”[^”]*”)/).filter(Boolean);
  return new Paragraph({
    children: delar.map((t) => run(t, { ...o, kursiv: o.kursiv || t.startsWith('”') })),
    spacing: { before: o.fore ?? 0, after: o.efter ?? 120 },
    keepNext: o.hallIhop,
    alignment: o.mitt ? AlignmentType.CENTER : undefined,
  });
}
function stycke(text: string, o: StyckeVal = {}): Paragraph {
  return new Paragraph({
    children: o.brak ? brakBarn(text, o) : [run(text, o)],
    spacing: { before: o.fore ?? 0, after: o.efter ?? 120 },
    keepNext: o.hallIhop,
    pageBreakBefore: o.nySida,
    alignment: o.mitt ? AlignmentType.CENTER : undefined,
    heading: o.niva4 ? HeadingLevel.HEADING_4 : undefined,
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
function rubrikTabell(kolumner: string[], rader: string[][], bredder: number[], o: { fetAndra?: boolean; huvudFyll?: string; hallIhop?: boolean; hallIhopEfter?: boolean; radrubrik?: boolean; storlek?: number; tomHojd?: number; ramad?: boolean } = {}): Barn[] {
  // ramad: ett blad att bygga på (talsortsmattan), fyra ramade fält med ljust namnband, som i PowerPoint.
  const ramad = !!o.ramad;
  const huvudFyll = o.huvudFyll ?? FARG.huvud;
  const radrubrik = o.radrubrik !== false;
  // hallIhopEfter: även sista raden hänger ihop med det som följer (listans ruta "Så arbetar ni med listan").
  // storlek: textstorlek i cellerna (halva punkter); en elevkopia av en ordlista sätts stort.
  const storlek = o.storlek ?? 20;
  // hallIhop: en kort tabell (en ordlista) hålls på en sida genom att varje stycke utom sista radens hänger ihop med nästa.
  // radrubrik: false ger första kolumnen vanlig text (fria tabeller, ordlistor); bara rubrikraden är fet, som i kompendiet.
  const huvud = rad(kolumner.map((k, i) => cell([stycke(k, { fet: true, farg: ramad ? FARG.text : FARG.vit, storlek: ramad ? 24 : 20, efter: 0, hallIhop: o.hallIhop })], { bredd: bredder[i], fyll: ramad ? FARG.rand : huvudFyll, kanter: runt(ramad ? kant(FARG.text, 8) : kant(huvudFyll)) })), { huvud: true });
  const kropp = rader.map((r, ri) => rad(r.map((text, i) => {
    // Raden under radrubriken (tider som "8–18 min · dag 2: 5–8") får inte brytas mitt i ett spann.
    const linjer = text.split('\n').map((l, j) => (j > 0 ? ejBryt(l) : l));
    const ihop = o.hallIhop && (ri < rader.length - 1 || !!o.hallIhopEfter);
    const mellan = arMellanrubrik(r);
    const barn = mellan
      ? linjer.map((l, j) => stycke(l, { fet: true, farg: FARG.huvud, storlek: Math.min(storlek, 18), efter: j === linjer.length - 1 ? 0 : 20, hallIhop: ihop }))
      : i === 0 && radrubrik
        ? linjer.map((l, j) => stycke(l, { fet: j === 0, kursiv: j > 0, farg: j === 0 ? FARG.huvud : FARG.svag, storlek, efter: j === linjer.length - 1 ? 0 : 20, hallIhop: ihop }))
        : linjer.map((l, j) => replikStycke(l, { fet: o.fetAndra && i === 1, kursiv: i === 0 && j > 0, farg: i === 0 && j > 0 ? FARG.svag : undefined, storlek, efter: j === linjer.length - 1 ? 0 : 20, hallIhop: ihop }));
    if (ramad) return cell(barn, { bredd: bredder[i], kanter: runt(kant(FARG.text, 8)) });
    return cell(barn, { bredd: bredder[i], fyll: mellan ? FARG.ljus : ri % 2 === 1 ? FARG.rand : undefined });
    // En rad utan text är en skrivrad: ge den höjd för handskrift (tomHojd: en ruta att bygga i på bordet).
  }), { hojd: r.every((t) => !t.trim()) ? (o.tomHojd ?? 420) : undefined }));
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
  const barn = [stycke(rubrik, { fet: true, farg: FARG.huvud, storlek: 20, efter: 40 }), ...fragor.map((f, i) => stycke(f, { storlek: 24, efter: i === fragor.length - 1 ? 0 : 20 }))];
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
// Elevens blad (d.elevblad): fälten får sin höjd i cm, så att eleven kan skriva och rita i dem och bladet fyller
// sidan, och etiketterna står i större text i en smalare kolumn.
const CM = 567;
function ramFaltTabell(falt: { rubrik: string; text: string; kursiv?: boolean }[], o: { rubrik?: string; skrivrum?: boolean; hojder?: (number | undefined)[]; elevblad?: boolean } = {}): Barn[] {
  const forsta = o.elevblad ? 2000 : 2300;
  const bredder = [forsta, BREDD - forsta];
  const rader: TableRow[] = [];
  if (o.rubrik) rader.push(rad([cell([stycke(o.rubrik, { fet: true, farg: FARG.huvud, storlek: o.elevblad ? 26 : 22, efter: 0, hallIhop: true })], { bredd: BREDD, span: 2, fyll: FARG.ljus, kanter: runt(kant(FARG.huvud)) })], { huvud: true }));
  falt.forEach((f, i) => {
    const sist = i === falt.length - 1;
    const linjer = f.text.split('\n');
    const tom = !f.text.trim();
    const hojd = o.hojder?.[i];
    rader.push(rad([
      cell([stycke(f.rubrik, { fet: true, storlek: o.elevblad ? 24 : 20, efter: 0, hallIhop: !sist })], { bredd: bredder[0], fyll: FARG.rand }),
      cell(tom ? [stycke('', { efter: 0, hallIhop: !sist })] : linjer.map((l, j) => replikStycke(l, { kursiv: f.kursiv, storlek: 20, efter: j === linjer.length - 1 ? 0 : 20, hallIhop: !sist })), { bredd: bredder[1] }),
    ], { hojd: hojd ? Math.round(hojd * CM) : tom ? (o.skrivrum ? 900 : 420) : undefined }));
  });
  return [tabell(rader, bredder), avstand()];
}
// En elevlista i en ram: orden stora, kolumnrubrikerna små och dämpade, ingen fet första kolumn.
// Bokstäver centreras. Listan hålls ihop, och med hallIhopEfter också med det som följer.
// brak: bråken staplas (metoder i matematik); annars står ett snedstreck kvar, som i ett datum.
function elevlista(l: { rubrik?: string; kolumner?: string[]; rader: string[][] }, o: { storlek: number; hallIhopEfter?: boolean; brak?: boolean }): Barn[] {
  const ut: Barn[] = [];
  const n = Math.max(...l.rader.map((r) => r.length), l.kolumner?.length ?? 1);
  // En kolumn där alla rader är tomma är en skrivkolumn (kartläggningens Före och Efter): smal, med rubriken i mitten,
  // och resten av bredden går till texten.
  const skriv = Array.from({ length: n }, (_, i) => l.rader.every((r) => !(r[i] ?? '').trim()));
  const antalSkriv = skriv.filter(Boolean).length;
  const smal = antalSkriv && antalSkriv < n ? 1250 : 0;
  const bredd = Math.floor((BREDD - smal * antalSkriv) / (smal ? n - antalSkriv : n));
  const sista = smal ? skriv.lastIndexOf(false) : n - 1;
  const bredder = Array.from({ length: n }, (_, i) => (smal && skriv[i] ? smal : i === sista ? BREDD - smal * antalSkriv - bredd * ((smal ? n - antalSkriv : n) - 1) : bredd));
  // En lista med skrivkolumner är lärarens protokoll, inte elevens kopia: texten i vanlig storlek, så att listan, namnet
  // och rubriken ryms på en sida.
  const storlek = smal ? Math.min(o.storlek, 24) : o.storlek;
  const bokstaver = l.rader.every((r) => r.every((c) => c.trim().length <= 2));
  if (l.rubrik) ut.push(stycke(l.rubrik, { fet: true, farg: FARG.huvud, storlek: 16, versaler: true, fore: 120, efter: 60, hallIhop: true, niva4: true }));
  const rader: TableRow[] = [];
  if (l.kolumner) rader.push(rad(l.kolumner.map((k, i) => cell([stycke(k, { storlek: 15, versaler: true, farg: FARG.svag, efter: 0, hallIhop: true, mitt: !!smal && skriv[i] })], { bredd: bredder[i], fyll: FARG.rand })), { huvud: true }));
  l.rader.forEach((r, ri) => {
    const ihop = ri < l.rader.length - 1 || !!o.hallIhopEfter;
    rader.push(rad(Array.from({ length: n }, (_, i) => cell([stycke(r[i] ?? '', { storlek, efter: 0, hallIhop: ihop, mitt: bokstaver, brak: o.brak })], { bredd: bredder[i] }))));
  });
  ut.push(tabell(rader, bredder), avstand());
  return ut;
}
// Kort att klippa (d.kort, src/lib/brak.ts): varje kort är en ruta med streckad kant att klippa längs, stor nog att
// hålla i handen. Meningar står två i bredd (cirka 8 × 4,5 cm), tal och bråk fyra i bredd (cirka 4 × 4 cm) med stor
// text, och ett ensamt kort (problemet) över hela bredden, i ett eller flera exemplar. Märkningen står litet och grått
// överst i kortet, så att korten går att sortera när de är klippta. Korten i en lista hålls på samma sida.
function kortlista(info: KortInfo, brak = true): Table {
  const perRad = info.ett ? 1 : info.korta ? 4 : 2;
  const w = Math.floor(BREDD / perRad);
  const hojd = Math.round((info.korta ? 4 : info.ett ? 3.6 : 4.5) * CM);
  const streckad: IBorderOptions = { style: BorderStyle.DASHED, size: 6, color: FARG.svag };
  const alla = info.kort.flatMap((k, i) => Array.from({ length: info.kopior }, () => ({ k, i })));
  const rader: TableRow[] = [];
  for (let i = 0; i < alla.length; i += perRad) {
    const kort = alla.slice(i, i + perRad);
    const vidare = i + perRad < alla.length;
    rader.push(new TableRow({ cantSplit: true, height: { value: hojd, rule: HeightRule.ATLEAST }, children: Array.from({ length: perRad }, (_, j) => {
      const k = kort[j];
      return new TableCell({
        width: { size: w, type: WidthType.DXA },
        // Märkningen står överst i hörnet på varje kort i raden, och texten en bit ned (K-039).
        verticalAlign: VerticalAlign.TOP,
        borders: k ? runt(streckad) : runt(INGEN_KANT),
        margins: { top: 140, bottom: 140, left: 240, right: 240 },
        children: [
          ...(k && info.markning ? [new Paragraph({ keepNext: vidare, spacing: { after: 120, line: 240 }, children: [run(info.markning(k.i), { storlek: 15, farg: FARG.svag })] })] : []),
          new Paragraph({ alignment: AlignmentType.CENTER, keepNext: vidare, spacing: { before: info.korta ? 280 : 200, after: 0, line: 300 }, children: k ? (brak && /[0-9]+[/][0-9]+/.test(k.k) ? brakBarn(k.k, { storlek: info.korta ? 64 : 28, farg: FARG.text }, info.korta ? 1.25 : 1.45) : [run(k.k, { storlek: info.korta ? 80 : 28, farg: FARG.text })]) : [] }),
        ],
      });
    }) }));
  }
  return new Table({ width: { size: w * perRad, type: WidthType.DXA }, columnWidths: Array.from({ length: perRad }, () => w), layout: TableLayoutType.FIXED, borders: UTAN_KANTER, rows: rader });
}
// stor: en elevkopia (planeringsmallarna), där listorna kommer först och sätts stort nog att läsas av ett par
// eller visas för gruppen; annars (beskrivningen) står lärarnoten först och listorna efter.
// kort: metodens kort att klippa (d.kort); blad: fältens höjd i cm när ramen är elevens blad (d.elevblad).
function ramBarn(ram: Ram, o: { skrivrum?: boolean; stor?: boolean; kort?: MetodData['kort']; blad?: Record<string, number>; brak?: boolean } = {}): Barn[] {
  const ut: Barn[] = [];
  for (const s of ram.text) ut.push(stycke(s, { hallIhop: true }));
  // En ordlista eller bokstavslista (bara korta celler) får lika breda kolumner; en översikt med
  // längre text får en smal etikettkolumn först, men bara när första kolumnen är etiketter. Bär den
  // längre text (som projektplanens "Vecka 1 · Inbjudan till laget" med mentortexten under) blir
  // kolumnerna lika breda, annars staplas orden och bryts mitt i.
  const korta = !!ram.oversikt && ram.oversikt.rader.every((r) => r.every((c) => c.length <= 30));
  const etiketter = !!ram.oversikt && ram.oversikt.rader.every((r) => (r[0] ?? '').length <= 30 && !(r[0] ?? '').includes('\n'));
  if (ram.oversikt) {
    const n = ram.oversikt.kolumner.length;
    const forsta = korta || !etiketter ? Math.floor(BREDD / n) : 1100;
    const rest = Math.floor((BREDD - forsta) / (n - 1));
    ut.push(...rubrikTabell(ram.oversikt.kolumner, ram.oversikt.rader, ram.oversikt.kolumner.map((_, i) => (i === 0 ? forsta : i === n - 1 ? BREDD - forsta - rest * (n - 2) : rest)), { hallIhop: korta, hallIhopEfter: korta, radrubrik: false, storlek: korta && o.stor ? 30 : undefined }));
  }
  // Ramens huvud (fält att fylla i före delarna) står först. Har ramen listor står det i stället direkt före den första
  // listan, som på sidan, så att elevens namn och tecknen på kartläggningens protokoll hör till listan.
  // På elevens blad är namnraden 1 cm, så att bladets fält i sina mått och upphovet ryms på sidan.
  const huvud = () => (ram.huvud ? ramFaltTabell(ram.huvud, { skrivrum: o.skrivrum, hojder: o.blad ? ram.huvud.map(() => 1) : undefined }) : []);
  if (!ram.listor) ut.push(...huvud());
  // En ordlistas ruta bär listans namn, så att en sida eller ett blad som börjar med rutan går att koppla rätt.
  const noter = (delar = ram.delar) => delar.flatMap((del) => ramFaltTabell(del.falt, { rubrik: korta || ram.listor ? `${del.rubrik} · ${ram.rubrik}` : del.rubrik, skrivrum: o.skrivrum, hojder: o.blad ? del.falt.map((f) => o.blad![f.rubrik]) : undefined, elevblad: !!o.blad }));
  // I beskrivningen bär listans rubrik ramens namn, så att en lista som hamnar på en ny sida går att
  // koppla rätt ("Läs orden, kolumn för kolumn · Läslista 4"). Säger listans rubrik redan vilken ram
  // den hör till ("Skattjakten, vecka 1 · Läs inbjudan två gånger" under "Mentortexterna till
  // skattjakten, att kopiera") läggs inget till.
  const ord = (s: string) => s.toLowerCase().split(/[^a-zåäöé0-9]+/).filter((w) => w.length > 3);
  // "Åk 1" är kortare än fyra tecken men namnger ramen lika väl ("Vecka 1 · Åk 1 · …" under "Åk 1: talen 0–30").
  const arskurs = (s: string) => s.toLowerCase().match(/åk\s*\d+(?:[–-]\d+)?/)?.[0].replace(/\s+/g, ' ');
  const namngerRamen = (rubrik: string) => ord(rubrik).some((w) => ord(ram.rubrik).includes(w)) || (!!arskurs(rubrik) && arskurs(rubrik) === arskurs(ram.rubrik));
  // I elevkopian är orden stora, men en ram med många rader (skattjaktens fyra mentortexter, sexton
  // rader) sätts ett steg mindre så att listorna, noten och upphovet ryms på en sida och ingen
  // ensam rad hamnar på en sida för sig.
  const radantal = (ram.listor ?? []).reduce((a, l) => a + l.rader.length, 0);
  const storlek = o.stor ? (radantal > 12 ? 28 : 32) : 26;
  // I elevkopian får listorna bryta sida mellan sig, men den sista håller ihop med lärarnoten efter,
  // så att noten och upphovet aldrig står ensamma på en sida. I beskrivningen hålls listorna ihop.
  const listor = () => (ram.listor ?? []).flatMap((l, i, alla) => elevlista({ ...l, rubrik: !o.stor && l.rubrik && !namngerRamen(l.rubrik) ? `${l.rubrik} · ${ram.rubrik}` : l.rubrik }, { storlek, hallIhopEfter: o.stor ? i === alla.length - 1 : i < alla.length - 1, brak: o.brak }));
  // Kort att klippa: lärarens ruta först, och varje grupp av kort ("Vecka 1 · Pass 1") börjar på ny sida, så att
  // varje pass är en kopia och korten aldrig delar sida med lärarens ruta. Som i metodriggens kompendium.
  if ((ram.listor ?? []).some((l) => kortInfo({ kort: o.kort }, l))) {
    ut.push(...noter());
    let forra = '';
    for (const l of ram.listor ?? []) {
      const info = kortInfo({ kort: o.kort }, l);
      if (!info) { ut.push(...elevlista(l, { storlek, brak: o.brak })); continue; }
      ut.push(stycke(l.rubrik ?? '', { fet: true, farg: FARG.huvud, storlek: 16, versaler: true, fore: 120, efter: 60, hallIhop: true, nySida: info.grupp !== forra, niva4: true }));
      forra = info.grupp;
      ut.push(kortlista(info, o.brak), avstand());
    }
    return ut;
  }
  // En not till hemmet ("Till vårdnadshavaren") följer med elevkopian hem, med läxa 1, och står därför först i
  // elevkopian; lärarens noter står sist där (K-031).
  const tillHemmet = (del: Ram['delar'][number]) => /^Till (vårdnadshavar|hemmet|föräld)/i.test(del.rubrik);
  if (ram.listor && o.stor && ram.delar.some(tillHemmet)) {
    ut.push(...noter(ram.delar.filter(tillHemmet)), ...huvud(), ...listor(), ...noter(ram.delar.filter((d) => !tillHemmet(d))));
    return ut;
  }
  if (ram.listor) ut.push(...(o.stor ? [...huvud(), ...listor(), ...noter()] : [...noter(), ...huvud(), ...listor()]));
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
  // Kolumnerna följer minuterna, men en kort fas (fem minuter av sextio) får inte bli så smal att
  // "Vår text" och "18–23 min" staplas ord för ord: minst 1300 DXA, och de längre faserna lämnar ifrån sig resten.
  const MINST = 1300;
  let bredder = p.faser.map((f) => Math.floor(BREDD * f.minuter / p.total));
  const lyft = bredder.reduce((a, b) => a + Math.max(0, MINST - b), 0);
  if (lyft > 0) {
    const stora = bredder.filter((b) => b > MINST).reduce((a, b) => a + b, 0);
    bredder = bredder.map((b) => (b < MINST ? MINST : Math.floor(b - lyft * b / stora)));
  }
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
        celler.push(cell([new Paragraph({ children: [run(del.rubrik, { fet: true, storlek: 18 }), run(` · ${del.text}`, { storlek: 18, farg: FARG.svag })], alignment: AlignmentType.CENTER, spacing: { after: 0 }, keepNext: true })], { bredd: b, span: del.antal, fyll: FARG.ljus, mitt: true }));
        i += del.antal - 1;
      } else if (!p.delar.some((x) => i > x.fran && i < x.fran + x.antal)) celler.push(cell([stycke('', { efter: 0 })], { bredd: bredder[i], fyll: FARG.ljus }));
    }
    rader.push(rad(celler));
  }
  return [tabell(rader, bredder), avstand()];
}
function passTabell(p: NonNullable<ReturnType<typeof passOversikt>>, antalSteg: number): Barn[] {
  const bredder = [1900, 3900, BREDD - 5800];
  // Rubrikraden, Före passet och första fasen hänger ihop, så att tabellen inte börjar med två rader ensamma sist på en sida.
  const huvud = rad(['Fas', `Rutinen i ${antalSteg} steg`, 'Så leder du det'].map((k, i) => cell([stycke(k, { fet: true, farg: FARG.vit, storlek: 20, efter: 0, hallIhop: true })], { bredd: bredder[i], fyll: FARG.huvud, kanter: runt(kant(FARG.huvud)) })),{ huvud: true });
  const kantRad = (etikett: string, text: string, ihop = false) => rad([
    cell([stycke(etikett, { fet: true, farg: FARG.huvud, storlek: 20, efter: 0, hallIhop: ihop })], { bredd: bredder[0], fyll: FARG.ljus }),
    cell([stycke(text, { storlek: 20, efter: 0, hallIhop: ihop })], { bredd: bredder[1] + bredder[2], span: 2, fyll: FARG.ljus }),
  ]);
  const rader: TableRow[] = [huvud];
  if (p.fore) rader.push(kantRad('Före passet', p.fore, true));
  p.faser.forEach((f, ri) => rader.push(rad([
    cell([stycke(f.fas, { fet: true, farg: FARG.huvud, storlek: 20, efter: 20, hallIhop: ri === 0 }), stycke(f.tid, { kursiv: true, farg: FARG.svag, storlek: 20, efter: 0 })], { bredd: bredder[0], fyll: ri % 2 === 1 ? FARG.rand : undefined }),
    cell(f.steg.length ? f.steg.map((st, j) => stycke(`${st.nr}. ${st.text}`, { storlek: 20, efter: j === f.steg.length - 1 ? 0 : 20 })) : [stycke('', { efter: 0 })], { bredd: bredder[1], fyll: ri % 2 === 1 ? FARG.rand : undefined }),
    cell([replikStycke(f.vad, { storlek: 20, efter: 0 })], { bredd: bredder[2], fyll: ri % 2 === 1 ? FARG.rand : undefined }),
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
    // En kort fri tabell (högst fem rader) hålls på en sida; en längre får bryta med rubrikraden upprepad.
    ut.push(...rubrikTabell(t.kolumner, t.rader, bredder, { radrubrik: false, hallIhop: t.rader.length <= 5 }));
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
    // En kort kursplan hålls på en sida; en lång får bryta, rubrikraden upprepas.
    ut.push(...rubrikTabell([d.progression.enhet, 'Fokus', 'Lärarens roll'], d.progression.rader.map((r) => [r.led ? `${r.vecka}\n${r.led}` : r.vecka, r.fokus, r.roll]), [1700, 4000, BREDD - 5700], { hallIhop: d.progression.rader.length <= 6 }));
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
        ut.push(stycke(d.elevblad[ram.rubrik] ? `${ram.rubrik} finns som elevens blad i planeringsmallarna, med rutor att skriva och rita i.` : `Ramen att fylla i, med ${ram.delar.length === 1 ? 'en del' : `${ram.delar.length} delar`}, finns i planeringsmallarna.`, { farg: FARG.svag }));
      } else ut.push(...ramBarn(ram, { kort: d.kort, blad: d.elevblad[ram.rubrik], brak: d.omrade === 'Matematik' }));
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
function mallBarn(post: MetodPost, bas: string, o: { baraTommaRamar?: boolean } = {}): { barn: Barn[]; liggande?: boolean }[] {
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
  // Har metoden en egen kartläggning (en ram som heter Kartläggning …) hör målkollen ihop med den (K-046).
  const kartlaggning = (d.ramar?.ramar ?? []).some((r) => /^Kartläggning/.test(r.rubrik));
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
      stycke(kartlaggning
        ? 'Fyll i målkollen ur kartläggningen, före och efter: kryssa i ett mål när eleven klarar uppgifterna för det. Vilka uppgifter som prövar vilket mål står i kartläggningens ruta Till läraren. Skriv under Notering vilket stöd som behövdes.'
        : 'Fyll i före insatsen och igen efter perioden. Kryssa i det eleven klarar, och skriv under Notering vilket stöd som behövdes.'),
      skrivrad([kartlaggning ? 'Elevens namn' : 'Elev', 'Datum före', 'Datum efter']),
      tabell([huvud, ...kropp], bredder),
      avstand(),
      notering,
      avstand(),
    ]);
  }
  // Elevens blad fyller sidan med fälten i sina mått, så där bär sidfoten upphovet ensam, som på mallarnas sidor.
  const bladsidor = new Set<Barn[]>();
  if (d.ramar) {
    for (const ram of d.ramar.ramar) {
      const tom = ramArTom(ram);
      if (o.baraTommaRamar && !tom) continue;
      const sida = [...under(ram.rubrik), ...ramBarn(ram, { skrivrum: tom, stor: true, kort: d.kort, blad: d.elevblad[ram.rubrik], brak: d.omrade === 'Matematik' })];
      if (d.elevblad[ram.rubrik]) bladsidor.add(sida);
      sidor.push(sida);
    }
  }
  // Diplomet bär sin egen rubrik: utan sidans rubrik och metodrad, så att eleven inte får Diplom två gånger (K-040).
  if (d.diplom) sidor.push([...diplomBarn(d.diplom)]);
  for (const sida of sidor) if (!bladsidor.has(sida)) sida.push(stycke(`${UPPHOV}. Mall till ${d.titel}, ${metodAdress(bas, post.id)}.`, { farg: FARG.svag, storlek: 18, fore: 160 }));
  // Mallarna (bråkplanket och tallinjerna) sist, var och en på en liggande sida med smal marginal. Sidfoten bär
  // upphovet, så att planket och linjerna får hela höjden. Är lathundens tredje sida ett blad att lägga på bordet
  // (talsortsmattan, bladet Bråket på fyra sätt) står bladet först bland dem, så att det kopieras med resten.
  const blad = d.lathund && arMatta(d.lathund.mall) ? medBredd(BREDD_MALL, () => [mattaSida(d.lathund!.mall)]) : [];
  // Ett ark per talsort (en matta med enPerSida) står på stående A4, en sida per kolumn; övriga mallar liggande.
  const mallsidor = d.mallar.flatMap((m) => (m.typ === 'matta' && m.enPerSida
    ? (m.kolumner ?? []).map((k) => ({ barn: medBredd(BREDD_STAENDE, () => talsortSida(m, k)), liggande: false }))
    : [{ barn: medBredd(BREDD_MALL, () => mallSida(m)), liggande: true }]));
  return [...sidor.map((barn) => ({ barn })), ...blad.map((barn) => ({ barn, liggande: true })), ...mallsidor];
}

// Ett blad att lägga på bordet: lathundens mall är en enda tom tabell och högst en not (talsortsmattan, bladet
// Bråket på fyra sätt). I lathunden och i planeringsmallarna ritas det med höga ramade rutor som fyller sidan.
type LathundMall = NonNullable<MetodData['lathund']>['mall'];
function arMatta(mall: LathundMall): boolean {
  return mall.block.filter((b) => b.typ !== 'not').length === 1 && mall.block.some((b) => b.typ === 'tabell' && b.rader.every((r) => r.every((c) => !c.trim())));
}
// Bladet i planeringsmallarna: samma form som på lathundens tredje sida, utan lathundens band, och med regeln i foten.
// Tabellens rubrik står bara när den säger något annat än sidans (inte "Talsortsmatta" under "Talsortsmattan").
function mattaSida(mall: LathundMall): Barn[] {
  const barn: Barn[] = [new Paragraph({ children: [run(mall.rubrik)], heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 40 } })];
  // Underraden (Namn och Kortet) är det eleven skriver först: i vanlig textstorlek, inte som lathundens etikett.
  if (mall.underrad) barn.push(stycke(mall.underrad, { storlek: 22, efter: 160 }));
  for (const b of mall.block) {
    if (b.typ === 'tabell') {
      const [a, c] = [(b.rubrik ?? '').toLowerCase(), mall.rubrik.toLowerCase()];
      if (a && !a.includes(c) && !c.includes(a)) barn.push(kicker(b.rubrik, { farg: FARG.huvud, fore: 0 }));
      barn.push(mattaTabell(b.kolumner, { hojd: 7000, rader: b.rader.length }), avstand(160));
    } else if (b.typ === 'not') barn.push(...lhNot([stycke(b.text, { storlek: 28, efter: 0 })]));
  }
  return barn;
}

// Bråkplanket och tallinjerna (d.mallar, src/lib/brak.ts): mallar att skriva ut, klippa och lägga på bordet. Det hela
// är 26 cm i planket och på linjen från 0 till 1, så att bitarna kan läggas mot linjen; skrivs de ut på A3 blir båda
// lika mycket större. De ritas med tabellkanter, så att Word och LibreOffice ritar dem utan bilder. Samma mått och
// form som i metodriggens kompendium.
const BREDD_MALL = A4.height - 2 * 720;
// Kanter som inte ska synas är INGEN_KANT (nil, se lhRader), och tabellerna har UTAN_KANTER, annars ritar Word sin standardkant.
const linjeKant = (size: number): IBorderOptions => ({ style: BorderStyle.SINGLE, size, color: FARG.text });
// Ett stycke i exakt höjd: luft mellan linjerna, eller innehållet i en tom cell.
const luft = (hojd: number, hallIhop?: boolean) => new Paragraph({ keepNext: hallIhop, spacing: { before: 0, after: 0, line: hojd, lineRule: LineRuleType.EXACT }, children: [new TextRun({ text: '', size: 2 })] });
// En cell på ett gemensamt rutnät x: från läge a till läge z, med de kanter som anges.
function rutcell(x: number[], a: number, z: number, o: { top?: IBorderOptions; bottom?: IBorderOptions; left?: IBorderOptions; right?: IBorderOptions; barn?: Paragraph[]; mitt?: boolean; hallIhop?: boolean } = {}): TableCell {
  const i0 = x.indexOf(a);
  const i1 = x.indexOf(z);
  return new TableCell({
    width: { size: z - a, type: WidthType.DXA },
    columnSpan: i1 - i0 > 1 ? i1 - i0 : undefined,
    borders: { top: o.top ?? INGEN_KANT, bottom: o.bottom ?? INGEN_KANT, left: o.left ?? INGEN_KANT, right: o.right ?? INGEN_KANT },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    verticalAlign: o.mitt ? VerticalAlign.CENTER : VerticalAlign.TOP,
    children: o.barn ?? [luft(20, o.hallIhop)],
  });
}
// Bråkplanket: en rad per nämnare, varje rad lika lång som det hela och delad i lika stora delar, med bråket staplat
// i varje bit (eller tomt, att fylla i). Alla rader delar ett rutnät, så att 1/2, 2/4 och 4/8 slutar på samma ställe.
function brakplankTabell(m: Mall): Table {
  const L = Math.round((m.langdCm ?? 26) * CM);
  const namnare = m.namnare ?? STANDARD_NAMNARE;
  const h = m.radhojd ?? 800;
  const stor = h >= 1200;
  const x = [...new Set([0, L, ...namnare.flatMap((n) => Array.from({ length: n - 1 }, (_, k) => lage(L, k + 1, n)))])].sort((p, q) => p - q);
  const rader = namnare.map((n) => new TableRow({ cantSplit: true, height: { value: h, rule: HeightRule.EXACT }, children: Array.from({ length: n }, (_, k) => rutcell(x, lage(L, k, n), lage(L, k + 1, n), {
    top: linjeKant(8), bottom: linjeKant(8), left: linjeKant(8), right: linjeKant(8), mitt: true,
    barn: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, line: 240 }, children: m.etiketter === false ? [] : n === 1 ? [run('1', { storlek: stor ? 40 : 30 })] : [staplatBrak('1', String(n), stor ? (n >= 10 ? 32 : 40) : n >= 10 ? 26 : 30, FARG.text)] })],
  })) }));
  return new Table({ width: { size: L, type: WidthType.DXA }, columnWidths: x.slice(1).map((v, i) => v - x[i]), layout: TableLayoutType.FIXED, alignment: AlignmentType.CENTER, borders: UTAN_KANTER, rows: rader });
}
// En tallinje från 0 till `till`, med ett streck vid varje del (`delar` per hel) och talen vid hela tal. Strecken går
// över och under linjen, strecken vid hela tal är tjockare, och linjen fortsätter en bit efter sista strecket,
// eftersom talen fortsätter. Linjerna är centrerade, så att 0 och 1 står rakt under varandra.
function tallinjeTabell(ln: { till: number; delar: number }, L: number): Table {
  const marg = 283;
  const etikettBredd = 520;
  const N = ln.delar * ln.till;
  const t = Array.from({ length: N + 1 }, (_, k) => marg + lage(L, k, N));
  const hela = new Set(Array.from({ length: ln.till + 1 }, (_, h) => h * ln.delar));
  const W = L + 2 * marg;
  const etiketter = [...hela].map((k) => ({ a: t[k] - etikettBredd / 2, z: t[k] + etikettBredd / 2, text: String(k / ln.delar) }));
  const x = [...new Set([0, W, ...t, ...etiketter.flatMap((e) => [e.a, e.z])])].sort((p, q) => p - q);
  const streck = (k: number) => linjeKant(hela.has(k) ? 14 : 8);
  // Båda cellerna vid ett streck får samma kant, annars väljer Word den tunnare. Raderna hålls ihop, så att en
  // linje aldrig delas över två sidor.
  const strecksRad = (ovan: boolean) => new TableRow({ cantSplit: true, height: { value: 150, rule: HeightRule.EXACT }, children: [
    rutcell(x, 0, t[0], { right: streck(0), hallIhop: true }),
    ...Array.from({ length: N }, (_, k) => rutcell(x, t[k], t[k + 1], { left: streck(k), right: streck(k + 1), bottom: ovan ? linjeKant(10) : undefined, hallIhop: true })),
    rutcell(x, t[N], W, { left: streck(N), bottom: ovan ? linjeKant(10) : undefined, hallIhop: true }),
  ] });
  const etikettRad: TableCell[] = [];
  let pos = 0;
  for (const e of etiketter) {
    if (e.a > pos) etikettRad.push(rutcell(x, pos, e.a));
    etikettRad.push(rutcell(x, e.a, e.z, { barn: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 0, line: 240 }, children: [run(e.text, { storlek: 22 })] })] }));
    pos = e.z;
  }
  if (pos < W) etikettRad.push(rutcell(x, pos, W));
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: x.slice(1).map((v, i) => v - x[i]), layout: TableLayoutType.FIXED, alignment: AlignmentType.CENTER, borders: UTAN_KANTER,
    rows: [strecksRad(true), strecksRad(false), new TableRow({ cantSplit: true, height: { value: 380, rule: HeightRule.ATLEAST }, children: etikettRad })] });
}
// En matta ur d.mallar (decimalmattan): kolumnerna med namnet stort i ett ljust band och höga rutor som fyller den
// liggande sidan, ett decimalkomma i en smal kolumn utan ram efter kolumn nummer komma, och regeln i foten.
// Mattans text är till läraren och står bara på sidan; på bladet står underraden, som på talsortsmattan.
function mattaMallSida(m: Mall): Barn[] {
  return [
    new Paragraph({ children: [run(m.rubrik)], heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 40 } }),
    ...(m.underrad ? [stycke(m.underrad, { storlek: 22, efter: 160 })] : []),
    mattaTabell(m.kolumner ?? [], { komma: m.komma, hojd: 7000 }),
    ...(m.fot ? [avstand(160), ...lhNot([stycke(m.fot, { storlek: 28, efter: 0 })])] : []),
  ];
}
// Mattans tabell, gemensam för bladet från lathunden och mattorna bland mallarna: kolumnnamnet 16 pt fet i ett ljust
// band, rutor med ram i angiven höjd (fördelad på raderna), och ett decimalkomma i en smal kolumn utan ram efter
// kolumn nummer komma, nederst, där talet skrivs.
function mattaTabell(kolumner: string[], o: { komma?: number; hojd: number; rader?: number }): Table {
  const kommaBredd = o.komma ? 1000 : 0;
  const w = Math.floor((BREDD - kommaBredd) / kolumner.length);
  const delar = kolumner.flatMap((k, i) => [
    { k, w: i === kolumner.length - 1 ? BREDD - kommaBredd - w * (kolumner.length - 1) : w, komma: false },
    ...(o.komma === i + 1 ? [{ k: '', w: kommaBredd, komma: true }] : []),
  ]);
  const ram = runt(kant(FARG.text, 8));
  const utan = runt(INGEN_KANT);
  const antal = o.rader ?? 1;
  const huvud = rad(delar.map((x) => (x.komma ? cell([], { bredd: x.w, kanter: utan }) : cell([stycke(x.k, { fet: true, storlek: 32, efter: 0 })], { bredd: x.w, fyll: FARG.ljus, kanter: ram }))), { huvud: true });
  const kropp = Array.from({ length: antal }, (_, r) => new TableRow({ cantSplit: true, height: { value: Math.floor(o.hojd / antal), rule: HeightRule.EXACT }, children: delar.map((x) => new TableCell({
    width: { size: x.w, type: WidthType.DXA },
    borders: x.komma ? utan : ram,
    verticalAlign: VerticalAlign.BOTTOM,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: x.komma && r === antal - 1 ? [run(',', { storlek: 200, fet: true })] : [] })],
  })) }));
  return new Table({ width: { size: BREDD, type: WidthType.DXA }, columnWidths: delar.map((x) => x.w), layout: TableLayoutType.FIXED, borders: UTAN_KANTER, rows: [huvud, ...kropp] });
}
// Ett ark per talsort (en matta med enPerSida): kolumnens namn stort i bandet och en ruta som fyller det stående arket,
// 21 cm hög, så att en hundraplatta eller tio tiostavar i rad får plats och två hundraplattor under varandra. Arken
// läggs i ordning bredvid varandra, så alla fyra har samma huvud och linjerar; lärarens text står bara på sidan.
function talsortSida(m: Mall, k: string): Barn[] {
  const ram = runt(kant(FARG.text, 8));
  return [
    new Paragraph({ children: [run(m.rubrik)], heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 40 } }),
    m.underrad ? stycke(m.underrad, { storlek: 22, efter: 160 }) : avstand(160),
    tabell([
      rad([cell([stycke(k, { fet: true, storlek: 48, efter: 0, mitt: true })], { bredd: BREDD, fyll: FARG.ljus, kanter: ram })], { huvud: true }),
      new TableRow({ cantSplit: true, height: { value: 11900, rule: HeightRule.EXACT }, children: [cell([], { bredd: BREDD, kanter: ram })] }),
    ], [BREDD]),
  ];
}
function mallSida(m: Mall): Barn[] {
  if (m.typ === 'matta') return mattaMallSida(m);
  const L = Math.round((m.langdCm ?? 26) * CM);
  // En delad linje bär delarnas namn (brak.ts, delnamn) till vänster ovanför linjen, i luften före den, så att sidan
  // blir lika hög som utan namn. Linjens 0 står 283 in från tabellens kant, och tabellen är centrerad (tallinjeTabell).
  const namnRad = (namn: string, hojd: number, vid: number) => new Paragraph({ keepNext: true, indent: { left: vid }, spacing: { before: 0, after: 0, line: hojd, lineRule: LineRuleType.EXACT }, children: [run(namn, { storlek: 20, farg: FARG.svag })] });
  return [
    new Paragraph({ children: [run(m.rubrik)], heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 40 } }),
    ...(m.text ? [stycke(m.text, { efter: 120 })] : []),
    ...(m.typ === 'brakplank'
      ? [luft(160), brakplankTabell(m)]
      : (m.linjer ?? []).flatMap((ln, i) => {
          const Ln = ln.langdCm ? Math.round(ln.langdCm * CM) : L;
          const fore = i ? m.mellanrum ?? 420 : 300;
          const namn = delnamn(ln.delar);
          return [namn ? namnRad(namn, fore, Math.round((BREDD - (Ln + 2 * 283)) / 2) + 283) : luft(fore, true), tallinjeTabell(ln, Ln)];
        })),
  ];
}

// Kolumnbredder som fyller innehållsbredden; första kolumnen kan få en egen andel.
function kolumnBredder(antal: number, forstaAndel?: number): number[] {
  const forsta = forstaAndel ? Math.floor(BREDD * forstaAndel) : Math.floor(BREDD / antal);
  const rest = Math.floor((BREDD - forsta) / (antal - 1));
  return Array.from({ length: antal }, (_, i) => (i === 0 ? forsta : i === antal - 1 ? BREDD - forsta - rest * (antal - 2) : rest));
}

// Rutans inledning i lathunden: etiketten fet och frågan mager, som på sidan (K-025).
function inledningStycke(rad: string): Paragraph {
  const { etikett, text } = etikettOchText(rad);
  return new Paragraph({ children: [...(etikett ? [run(`${etikett} `, { fet: true, storlek: 20 })] : []), run(text, { storlek: 20 })], spacing: { before: 0, after: 60 } });
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
// Ingen kant. I Word betyder "none" på en cell att tabellens kant gäller i stället, och docx sätter en
// svart standardkant på varje tabell; "nil" tar bort kanten på riktigt. Skrivraderna sätter därför nil
// på cellerna och på tabellen, så att bara den tunna linjen under varje rad blir kvar.
const INGEN_KANT = { style: BorderStyle.NIL, size: 0, color: 'auto' } as const;
const UTAN_KANTER = { top: INGEN_KANT, bottom: INGEN_KANT, left: INGEN_KANT, right: INGEN_KANT, insideHorizontal: INGEN_KANT, insideVertical: INGEN_KANT } as const;
// Tomma skrivrader.
function lhRader(antal: number, hojd = 420): Barn[] {
  const rader = Array.from({ length: antal }, () => rad([cell([], { bredd: BREDD, kanter: { top: INGEN_KANT, left: INGEN_KANT, right: INGEN_KANT, bottom: kant(FARG.kant) } })], { hojd }));
  return [new Table({ width: { size: BREDD, type: WidthType.DXA }, columnWidths: [BREDD], layout: TableLayoutType.FIXED, borders: UTAN_KANTER, rows: rader }), avstand(80)];
}
// Två spalter utan kanter. Innehållet i spalterna byggs med spaltens bredd.
function lhSpalter(vanster: () => Barn[], hoger: () => Barn[]): Barn[] {
  const mellan = 360;
  const halv = Math.floor((BREDD - mellan) / 2);
  const inre = halv - 240;
  const v = medBredd(inre, vanster);
  const h = medBredd(inre, hoger);
  const ingen = INGEN_KANT;
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
          ...(l.metoden.ruta.inledning ? [inledningStycke(l.metoden.ruta.inledning)] : []),
          ...punktStycken(l.metoden.ruta.punkter),
          ...(l.metoden.ruta.efter ? [stycke(l.metoden.ruta.efter, { farg: FARG.svag, storlek: 19, fore: 60, efter: 0 })] : []),
        ]),
        ...(arbetsformRad(d) ? [kicker('Arbetsform', { farg: FARG.huvud, fore: 60 }), stycke(arbetsformRad(d), { storlek: 20 })] : []),
      ],
      () => [
        kicker(l.metoden.tabell.rubrik, { farg: FARG.huvud, fore: 60 }),
        ...rubrikTabell(l.metoden.tabell.kolumner, l.metoden.tabell.rader, kolumnBredder(l.metoden.tabell.kolumner.length, 0.36), { huvudFyll: FARG.text }),
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
        ...(l.pass.klarTidigt ? lhNot([kicker('Klar tidigt', { fore: 0 }), stycke(l.pass.klarTidigt, { storlek: 18, efter: 0 })]) : []),
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
  // En enda tom tabell utan snabbmall är ett blad att lägga på bordet (talsortsmattan): den tar hela
  // bredden med höga rutor som fyller sidan, och noten står under, i stället för två spalter.
  const matta = arMatta(l.mall);
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
    } else if (b.typ === 'tabell' && matta) {
      tomSmala();
      mall.push(kicker(b.rubrik, { farg: FARG.huvud, fore: 0 }), ...rubrikTabell(b.kolumner, b.rader, kolumnBredder(b.kolumner.length), { huvudFyll: FARG.text, radrubrik: false, storlek: 24, tomHojd: Math.min(6000, Math.floor(6000 / b.rader.length)), ramad: true }));
    } else if (b.typ === 'tabell') {
      const korta = b.rader.every((r) => r.every((c) => c.length <= 12));
      smala.push({ vikt: b.rader.length + 2, f: () => [kicker(b.rubrik, { farg: FARG.huvud, fore: 0 }), ...(korta ? elevlista({ kolumner: b.kolumner, rader: b.rader }, { storlek: 22 }) : rubrikTabell(b.kolumner, b.rader, kolumnBredder(b.kolumner.length, 0.3), { huvudFyll: FARG.text, radrubrik: false }))] });
    } else if (b.typ === 'kedja') {
      smala.push({ vikt: 3, f: () => [
        kicker(b.rubrik, { farg: FARG.huvud, fore: 0 }),
        new Paragraph({ children: b.steg.flatMap((s, i) => [...(i > 0 ? [new TextRun({ text: '  →  ', color: FARG.svag })] : []), new TextRun({ text: s, italics: true, bold: true, size: 21, color: i === b.steg.length - 1 ? '2E7D32' : FARG.text })]), spacing: { after: 120 } }),
        ...(b.citat ? [stycke(citat(b.citat), { kursiv: true, farg: BRUN, storlek: 20 })] : []),
      ] });
    } else if (b.typ === 'not' && matta) {
      // Mattans fot är regeln för eleven: större, inte fet.
      tomSmala();
      mall.push(...lhNot([stycke(b.text, { storlek: 28, efter: 0 })]));
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
// smal: en liggande mallsida med smal marginal, så att det hela i bråkplanket och på tallinjen (26 cm) ryms.
function sektion(barn: Barn[], huvudtext: string, adress: string, o: { liggande?: boolean; smal?: boolean } = {}): ISectionOptions {
  const marginal = o.smal ? { top: 720, right: 720, bottom: 900, left: 720, header: 450, footer: 450 } : { top: MARGINAL, right: MARGINAL, bottom: MARGINAL, left: MARGINAL, header: 567, footer: 567 };
  return {
    properties: { page: { size: { ...A4, orientation: o.liggande ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: marginal } },
    headers: { default: sidhuvud(huvudtext) },
    footers: { default: sidfot(adress, o.smal ? BREDD_MALL : o.liggande ? BREDD_LIGGANDE : BREDD_STAENDE) },
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
        // Listornas rubriker (K-035): definierad här, så att Word inte lägger på sin inbyggda nivå 4 (kursiv, blå).
        heading4: { run: { size: 16, bold: true, italics: false, color: FARG.huvud, font: 'Calibri', allCaps: true }, paragraph: { outlineLevel: 3, keepNext: true, spacing: { before: 120, after: 60 } } },
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
      for (const sida of mallBarn(post, o.bas, { baraTommaRamar: true })) sektioner.push(sektion(sida.barn, `Mall · ${post.data.titel} · ${SAJT}`, adress, { liggande: sida.liggande, smal: sida.liggande }));
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
  if (sidor.length === 0) sidor.push({ barn: [stycke(`${post.data.titel} har inga mallar.`)] });
  const sektioner = sidor.map((sida) => sektion(sida.barn, `Mall · ${post.data.titel} · ${SAJT}`, adress, { liggande: sida.liggande, smal: sida.liggande }));
  return dokument(`Mallar: ${post.data.titel}`, sektioner);
}
