// Bygger Word-filer ur metodernas data: allt om metoden (beskrivning, planeringsmallar, lathund), delarna för sig, och flera metoder i en fil.
// Körs både i bygget (src/pages/stodundervisning/*.docx.ts) och i webbläsaren när läsaren
// laddar ner valda metoder från /stodundervisning. Därför inga Node-beroenden här.
// Designelementen är samma som på sidan (src/components/Metod.astro): rutor, tabeller med
// rubrikrad, band, gör/undvik och bockar. Varje sida bär © Niclas Fohlin och niclasfohlin.se.
import {
  AlignmentType, Body, BorderStyle, Document, Footer, Header, HeadingLevel, HeightRule, ImageRun, ImportedXmlComponent, LevelFormat, NoBreakHyphen, PageNumber, PageOrientation,
  Paragraph, ShadingType, Tab, Table, TableCell, TableLayoutType, TableRow, TabStopType, TextRun, VerticalAlign, WidthType,
  type IBorderOptions, type IParagraphOptions, type IRunOptions, type ISectionOptions,
} from 'docx';
import { arbetsformRad, arEttKort, arProtokoll, arskursText, datumText, ejBryt, etikettOchText, laskortKolumn, laskortRubrik, lathundFakta, lathundForm, metaRad, metodAdress, passOrd, passOversikt, ramArTom, stegTexter, SAJT, UPPHOV, type MetodData, type MetodPost, type PassOrd } from './metod';
import { brakDelar, delnamn, kortInfo, lage, STANDARD_NAMNARE, type KortInfo, type Mall } from './brak';
import { andikaBredd, bagSvg, utanStod } from './lasflyt';
import type { MetodPostISerie, SerieKoppling } from './serie';
import { ANDIKA_ADRESS, ELEVTYPSNITT, VIK_TEXT, bildFor as bildForOrd, harElevtypsnitt, kartCeller, kortCeller, ljudenheter, ljudform, arDelark, type KartCell } from './ljudkort';
import { arElevensBlad, harFragor, lastexter, protokollDelas, textlangd, type Lastext } from './ramform';
import { filmerVid, huvudfilm, metodensFilmer, stegDelar, stillbilder, STILLBILD_MATT, type FilmPlats, type MetodFilm } from './film';
import { reservNyckel } from './reservbild';
import * as SAGA from './sagoform.js';
import { arTarning, harBoktypsnitt, SAGO_UPPHOV, sagobladAv, tarningAv, type Sagoblad, type Sagofalt, type Station, type Tarning } from './sagoblad';
import WORDSKALOR from '../data/lathund-word.json';
import TECKENBREDD from '../data/teckenbredd.json';
import { ANFANG_MULTIPEL, BOKBREDD, BOKLUFT, BOKMARGINAL, RAMHOJD, TITEL_PT, boksidansMatt } from './boksida';

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
// Lathunden i Word ligger så nära pdf:en som Word tillåter (K-055): smala marginaler, ingen rubrikrad över bandet
// och större text. SKALA förstorar all text som skapas medan medSkala gäller; utanför lathunden är den 1, så att
// metoden och mallarna blir som förut.
const LH_MARGINAL = { top: 454, right: 454, bottom: 680, left: 454, header: 340, footer: 340 }; // 8 mm, foten 12 mm
const BREDD_LATHUND = A4.height - LH_MARGINAL.left - LH_MARGINAL.right;
const LH_SKALA = 1.2;
let SKALA = 1;
function medSkala<T>(s: number, fn: () => T): T {
  const gammal = SKALA;
  SKALA = s;
  try { return fn(); } finally { SKALA = gammal; }
}
// Textens storlek i halva punkter efter skalan; utan skala lämnas en odefinierad storlek åt dokumentets standard.
// Stegen som mätningen prövar för varje sida, och sidans skala ur mätningen (en metod som inte är uppmätt får LH_SKALA).
export const LH_STEG = [0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4];
function lathundSkalor(id: string): number[] {
  const post = (WORDSKALOR as Record<string, { skalor?: number[] }>)[id];
  return post?.skalor?.length === 4 ? post.skalor : [LH_SKALA, LH_SKALA, LH_SKALA, LH_SKALA];
}
const storl = (n?: number): number | undefined => (SKALA === 1 ? n : Math.round((n ?? 22) * SKALA));
const DOCX_TYP = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export { DOCX_TYP };

type Barn = Paragraph | Table;
// Ett kortark (vikkort, bokstavskort, bokstavskartan, golvbokstäverna) står i en egen sektion med 1 cm marginal, så att så
// många kort som möjligt ryms på ett A4 (Niclas 2026-09-29), som i metodriggen. Sektionsbytet står i flödet av stycken
// och tabeller, och delaSektioner gör sektionerna av det. Efter ett kortark börjar en vanlig sektion igen. En boksida
// (lästexten, boksida()) står i en egen sektion med 1,5 cm marginal och raden Till läraren och nivåns knapp i sidfoten.
type Boksektion = { not: string; niva: string; vad: string; farg: string };
// Ett sagoblad (sagoFlod): rutan Till läraren i sidfoten, eller ingen sidfot på bokens blad.
type Sagosektion = { not: string; utanSidfot: boolean };
class Sektionsbyte { constructor(readonly kortark: boolean, readonly bok?: Boksektion, readonly saga?: Sagosektion) {} }
type Flod = (Barn | Sektionsbyte)[];
const arBarn = (x: Barn | Sektionsbyte): x is Barn => !(x instanceof Sektionsbyte);
// Bilderna och elevens typsnitt till Word-filen (src/lib/ljudkort.ts): vid bygget lästa från public/, i webbläsaren
// hämtade, och givna till metodDokument och mallDokument. RESURSER gäller medan en fil byggs. png ger varje bilds
// reservbild, ritad ur samma SVG (src/lib/reservbild.ts): vid bygget ritar src/lib/metodresurser.ts den, i
// webbläsaren hämtas den som samma bygge ritade.
// boktypsnitt: Cinzel och Cinzel Decorative till boksidorna (public/fonts/boksida/), när metoden har lästexter.
export interface MetodResurser { bilder: Map<string, Uint8Array>; elevtypsnitt?: Uint8Array; boktypsnitt?: { cinzel: Uint8Array; dekor: Uint8Array }; png?: (svg: Uint8Array, bredd: number, hojd: number) => Uint8Array | undefined }
let RESURSER: MetodResurser = { bilder: new Map() };
// Varje bild i Word-filen är en SVG med sin reservbild (Niclas 2026-09-30: i Google Dokument blev bilderna blå rutor).
// Saknas reservbilden stannar bygget, så att en fil med en tom reservbild aldrig kan laddas upp eller hämtas.
function svgRun(svg: Uint8Array, bredd: number, hojd: number, altText: { name: string; description: string; id: string }): ImageRun {
  const png = RESURSER.png?.(svg, bredd, hojd);
  if (!png) throw new Error(`Word-filen saknar reservbilden ${reservNyckel(svg, bredd, hojd)} (${altText.description}). Den ritas ur bildens SVG av src/lib/metodresurser.ts vid bygget och hämtas i webbläsaren från /stodundervisning/reservbild/.`);
  return new ImageRun({ type: 'svg', data: svg, transformation: { width: bredd, height: hojd }, altText, fallback: { type: 'png', data: png } });
}
let instans = 0; // numrerade listor: varje lista börjar om på 1

const kant = (color = FARG.kant, size = 4): IBorderOptions => ({ style: BorderStyle.SINGLE, size, color });
const runt = (b: IBorderOptions) => ({ top: b, bottom: b, left: b, right: b });
// En dubbel ram av två enkla (K-157; Niclas 2026-10-01: boksidans dubbla ram blev enkel i Google Dokument). Google har
// bara heldragna, streckade och prickade kanter och ritar en dubbel kant som en enda linje på omkring 2 pt, där Word
// ritar två linjer. Ramen är därför en tabell med en cell och enkel kant runt en inre tabell med enkel kant, med 1,5 pt
// (30 twips) marginal runt om och ett stycke på 0,15 pt före och efter den inre tabellen, som Google kräver runt en tabell
// i en cell. Mätt i mätbänken (scripts/matbank/dubbellinje.mjs, variant M): dubbla linjer runt om i båda, lika hög i Word
// som Words dubbla kant och 0,45 pt högre i Google. scripts/wordregler.mjs stoppar en dubbel kant.
const DUBBEL_GLAPP = 30;
const hjalpStycke = () => new Paragraph({ spacing: { before: 0, after: 0, line: 30 }, run: { size: 2, font: 'Calibri' }, children: [new TextRun({ text: '', size: 2, font: 'Calibri' })] });
function dubbelRam(bredd: number, kant: IBorderOptions, inre: (bredd: number) => Table): Table {
  const ingen = { style: BorderStyle.NONE, size: 0, color: 'auto' } as const;
  return new Table({
    width: { size: bredd, type: WidthType.DXA }, columnWidths: [bredd], layout: TableLayoutType.FIXED,
    borders: { top: ingen, bottom: ingen, left: ingen, right: ingen, insideHorizontal: ingen, insideVertical: ingen },
    rows: [new TableRow({ children: [new TableCell({
      width: { size: bredd, type: WidthType.DXA }, borders: runt(kant),
      margins: { top: DUBBEL_GLAPP, bottom: DUBBEL_GLAPP, left: DUBBEL_GLAPP, right: DUBBEL_GLAPP },
      children: [hjalpStycke(), inre(bredd - 2 * DUBBEL_GLAPP), hjalpStycke()],
    })] })],
  });
}

// brak: bråken i texten står staplade (elevmaterial); nySida: stycket börjar på en ny sida.
// niva4: stycket är en rubrik på nivå 4 i Word (en listas rubrik under ramens nivå 3), så att den syns i navigeringen (K-035).
interface StyckeVal { kursiv?: boolean; fet?: boolean; farg?: string; storlek?: number; fore?: number; efter?: number; hallIhop?: boolean; mitt?: boolean; versaler?: boolean; font?: string; brak?: boolean; nySida?: boolean; niva4?: boolean }

// Elevens typsnitt i elevmaterialet (K-130, src/lib/ljudkort.ts): medan medElevtypsnitt gäller får varje textlöpa utan
// eget typsnitt elevens, så att korten att klippa och mallarna står i det, som på sidan. Utanför gäller husets.
let ELEVFONT: string | undefined;
// Husets typsnitt, för det som står i en mall med elevens men är lärarens: mallens rubrik.
const HUSETS = 'Calibri';
function medElevtypsnitt<T>(pa: boolean, fn: () => T): T {
  const gammal = ELEVFONT;
  ELEVFONT = pa ? ELEVTYPSNITT : gammal;
  try { return fn(); } finally { ELEVFONT = gammal; }
}
function run(text: string, o: StyckeVal = {}): TextRun {
  const val: IRunOptions = { text, italics: o.kursiv, bold: o.fet, color: o.farg, size: storl(o.storlek), allCaps: o.versaler, font: o.font ?? ELEVFONT };
  return new TextRun(hardaStreck(val));
}
// Alla andra textlöpor går hit, så att skalan och elevens typsnitt gäller dem också.
function textRun(o: IRunOptions): TextRun {
  return new TextRun(hardaStreck({ ...o, font: o.font ?? ELEVFONT, size: storl(o.size as number | undefined) }));
}
// Ett bindestreck följt av ordfog (U+2060) håller ihop ett exempelord i metoden, som hund-ar-na och sss-ooo-lll. Word
// bryter ändå raden efter ett bindestreck, så där blir det Words hårda bindestreck (K-066, riggen 2026-09-27).
const HARDSTRECK = '-⁠';
function hardaStreck(o: IRunOptions): IRunOptions {
  const t = typeof o.text === 'string' ? o.text : '';
  if (!t.includes(HARDSTRECK)) return o;
  const delar: (string | NoBreakHyphen)[] = [];
  t.split(HARDSTRECK).forEach((del, i) => { if (i) delar.push(new NoBreakHyphen()); if (del) delar.push(del); });
  const { text: _text, ...resten } = o;
  return { ...resten, children: delar } as IRunOptions;
}
// Bråk i elevmaterialet står staplade (src/lib/brak.ts). Word får en ekvation (OMML) med vanlig text i Calibri, eller
// elevens typsnitt i elevmaterialet, i textens färg och något större än texten, eftersom Word krymper täljare och nämnare
// i ett bråk i en mening.
// Samma lösning som i metodriggens kompendium.
const OMML = 'http://schemas.openxmlformats.org/officeDocument/2006/math';
const WML = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function staplatBrak(taljare: string, namnare: string, storlek: number, farg: string): TextRun {
  const f = ELEVFONT ?? 'Calibri';
  const rpr = `<w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}"/><w:color w:val="${farg}"/><w:sz w:val="${storlek}"/><w:szCs w:val="${storlek}"/></w:rPr>`;
  const r = (t: string) => `<m:r><m:rPr><m:nor/></m:rPr>${rpr}<m:t>${t}</m:t></m:r>`;
  const xml = `<m:oMath xmlns:m="${OMML}" xmlns:w="${WML}"><m:f><m:fPr><m:ctrlPr>${rpr}</m:ctrlPr></m:fPr><m:num>${r(taljare)}</m:num><m:den>${r(namnare)}</m:den></m:f></m:oMath>`;
  // fromXmlString lägger en namnlös rot runt elementet; ekvationen är rotens första barn. Den står i stycket
  // där en TextRun annars står.
  return (ImportedXmlComponent.fromXmlString(xml) as unknown as { root: unknown[] }).root[0] as TextRun;
}
// Ett bråk som står ensamt (ett kort, en etikett på tallinjen) är två stycken text: täljaren med ett streck under och
// nämnaren (Niclas 2026-09-30: "De ska vara typsnitt"). Som ekvation blev det litet i Google Dokument, som tar en
// ekvations storlek från texten bredvid, och ett ensamt bråk har ingen; och står text bredvid krymper Word bråket och
// gör raden högre (underlag/prov/brak-google/). Två stycken med storleken på texten och strecket som styckets egen
// kantlinje ritas likadant i Word och i Google Dokument, i elevens typsnitt. Strecket är lika brett som det bredaste
// talet och lite till: indraget räknas ur bredden som bråket har att stå på (`bredd`, twips). `storlek` är siffrornas
// storlek i halvpunkter, som ekvationens.
function brakStycken(taljare: string, namnare: string, storlek: number, farg: string, bredd: number, o: { fore?: number; hallIhop?: boolean } = {}): Paragraph[] {
  const pt = storlek / 2;
  const f = ELEVFONT ?? 'Calibri';
  const streckBredd = Math.round((Math.max(andikaBredd(taljare, pt), andikaBredd(namnare, pt)) + 0.4 * pt) * 20);
  const indrag = Math.max(0, Math.floor((bredd - streckBredd) / 2));
  // Radavståndet är en multipel, aldrig exakt: Google Dokument läser exakt radhöjd som en multipel (radhöjden delad med
  // 240) och lade flera raders luft mellan täljaren och strecket (Niclas telefon 2026-09-30). Multipeln 160 ger i Word
  // något lägre höjd än den exakta raden hade, utan att siffrorna klipps (mätt med underlag/prov/brak-google/multipel.mjs; 170 gav memorykorten i Bråkkursen en sida till).
  const rad = 160;
  const text = (t: string) => new TextRun({ text: t, size: storlek, font: f, color: farg });
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, keepLines: true, indent: { left: indrag, right: indrag }, spacing: { before: o.fore ?? 0, after: 0, line: rad }, border: { bottom: { style: BorderStyle.SINGLE, size: Math.max(6, Math.round(pt * 0.45)), color: farg, space: 1 } }, children: [text(taljare)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, keepNext: o.hallIhop, indent: { left: indrag, right: indrag }, spacing: { before: Math.round(pt * 3), after: 0, line: rad }, children: [text(namnare)] }),
  ];
}
// Det ensamma bråket i en text, om texten bara är ett bråk.
function ensamtBrakI(text: string): { taljare: string; namnare: string } | undefined {
  const delar = brakDelar(text).filter((x) => !('text' in x) || x.text.trim());
  return delar.length === 1 && !('text' in delar[0]) ? delar[0] : undefined;
}
// Faktorn 1,45 gör bråkets siffror lika höga som orden runt dem; Word krymper täljare och nämnare i en mening.
function brakBarn(text: string, o: StyckeVal = {}, faktor = 1.45): TextRun[] {
  const storlek = 2 * Math.round(((o.storlek ?? 22) * SKALA * faktor) / 2);
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

// tat: 1,5 pt luft över och under texten i stället för 4, för lärarens protokoll (K-071) och faktatabellen på metodens
// första sida. Google ritar marginalen i hela bildpunkter (googleTabeller): 2 pt blev 2,25 i Google, och protokollets
// fulla mallsida spillde en rad där (K-141). Med 1,5 pt är protokollets rad omkring 6 mm i både Word och Google, och
// faktatabellen är 0,75 pt lägre per rad i Word och 1,5 pt i Google än förut, vilket ger huvudfilmen mer plats på
// sidan 1 (granskningen 2026-09-30).
interface CellVal { bredd: number; fyll?: string; kanter?: { top?: IBorderOptions; bottom?: IBorderOptions; left?: IBorderOptions; right?: IBorderOptions }; span?: number; mitt?: boolean; tat?: boolean }
function cell(barn: Barn[], o: CellVal): TableCell {
  return new TableCell({
    width: { size: o.bredd, type: WidthType.DXA },
    columnSpan: o.span,
    shading: o.fyll ? { type: ShadingType.CLEAR, fill: o.fyll, color: 'auto' } : undefined,
    borders: { ...runt(kant()), ...(o.kanter ?? {}) },
    margins: { top: o.tat ? 30 : 80, bottom: o.tat ? 30 : 80, left: 120, right: 120 },
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
// Ett ords bredd i twips, i typsnittet och storleken (halva punkter, före lathundens skala) som gäller när texten skapas
// (K-139). Bredderna är typsnittens egna och lika med det Word ritar (src/data/teckenbredd.json ur
// scripts/teckenbredd.py); ett tecken som saknas räknas som 0,6 em. Andika har ingen fet stil, och Words fetning får
// 2 procent.
const TECKENINDEX = new Map([...TECKENBREDD.tecken].map((c, i) => [c, i]));
function ordBredd(ord: string, halvpunkter: number, o: { fet?: boolean; kursiv?: boolean; font?: string } = {}): number {
  const andika = (o.font ?? ELEVFONT) === ELEVTYPSNITT;
  const stil = andika ? 'Andika' : `Calibri${o.fet ? ' fet' : ''}${o.kursiv ? ' kursiv' : ''}`;
  const tabell = (TECKENBREDD.bredd as Record<string, (number | null)[]>)[stil];
  const em = [...ord].reduce((s, c) => s + (c === '⁠' ? 0 : (tabell[TECKENINDEX.get(c) ?? -1] ?? 600) / 1000), 0);
  return em * (andika && o.fet ? 1.02 : 1) * (storl(halvpunkter) ?? halvpunkter) * 10;
}
// Antalet rader en text tar i en bredd (twips), när Word bryter vid mellanslag.
function radantal(text: string, bredd: number, halvpunkter: number, o: { fet?: boolean; kursiv?: boolean; font?: string } = {}): number {
  const mellan = ordBredd(' ', halvpunkter, o);
  let rader = 1, x = 0;
  for (const ord of text.split(/\s+/).filter(Boolean)) {
    const w = ordBredd(ord, halvpunkter, o);
    if (x && x + mellan + w > bredd) { rader++; x = w; } else x += (x ? mellan : 0) + w;
  }
  return rader;
}
// En kolumn blir minst så bred som sitt längsta ord (K-139): Word och Google bryter annars ordet mitt i, utan
// bindestreck ("Personbeskrivni/ng" i Berättelseramens lathund). Word bryter efter ett bindestreck och efter ett
// tankstreck utan ordfog, så leden räknas för sig; ett mellanslag efter strecket delar dem, eftersom filen också körs i
// webbläsaren och Safari före 16.4 (äldre iPad) inte kan tolka ett uttryck som ser bakåt. Bredd flyttas bara när ett
// ord inte ryms, från kolumnerna med mest över; ryms orden inte ens då står bredderna kvar, och googleprov.mjs visar
// ordet som bryts.
type Celltext = { kolumn: number; text: string; halvpunkter: number; fet?: boolean; kursiv?: boolean; font?: string };
function rymOrden(bredder: number[], celler: Celltext[], marginal = 240): number[] {
  const behov = bredder.map(() => 0);
  for (const c of celler) {
    for (const led of c.text.replace(/([-–])(?!⁠)/g, '$1 ').split(/[ \n\t]+/)) {
      if (led) behov[c.kolumn] = Math.max(behov[c.kolumn], Math.ceil(ordBredd(led, c.halvpunkter, c)) + marginal + 20);
    }
  }
  const brist = behov.reduce((s, b, i) => s + Math.max(0, b - bredder[i]), 0);
  const over = bredder.map((b, i) => Math.max(0, b - behov[i]));
  const summaOver = over.reduce((s, x) => s + x, 0);
  if (!brist || summaOver < brist) return bredder;
  const nya = bredder.map((b, i) => (behov[i] > b ? behov[i] : b - Math.floor((brist * over[i]) / summaOver)));
  nya[over.indexOf(Math.max(...over))] -= nya.reduce((s, b) => s + b, 0) - bredder.reduce((s, b) => s + b, 0);
  return nya;
}
// Tabell med rubrikrad. Första kolumnen fet; en radbrytning i en cell blir en ny rad i cellen,
// och i första kolumnen är raderna efter den första kursiva, som i kompendiet.
// En rad där varje cell är skriven med versaler är en mellanrubrik i tabellen (som verbdelen i en läslista).
export const arMellanrubrik = (r: string[]) => r.every((c) => c.trim() && c === c.toUpperCase() && /\p{L}/u.test(c));
function rubrikTabell(kolumner: string[], rader: string[][], givna: number[], o: { fetAndra?: boolean; huvudFyll?: string; hallIhop?: boolean; hallIhopEfter?: boolean; radrubrik?: boolean; storlek?: number; tomHojd?: number; ramad?: boolean } = {}): Barn[] {
  // ramad: ett blad att bygga på (talsortsmattan), fyra ramade fält med ljust namnband, som i PowerPoint.
  const ramad = !!o.ramad;
  const huvudFyll = o.huvudFyll ?? FARG.huvud;
  const radrubrik = o.radrubrik !== false;
  // hallIhopEfter: även sista raden hänger ihop med det som följer (listans ruta "Så arbetar ni med listan").
  // storlek: textstorlek i cellerna (halva punkter); en elevkopia av en ordlista sätts stort.
  const storlek = o.storlek ?? 20;
  // hallIhop: en kort tabell (en ordlista) hålls på en sida genom att varje stycke utom sista radens hänger ihop med nästa.
  // radrubrik: false ger första kolumnen vanlig text (fria tabeller, ordlistor); bara rubrikraden är fet, som i kompendiet.
  // Kolumnerna rymmer sina längsta ord, i samma stil som cellerna nedan (K-139).
  const bredder = rymOrden(givna, [
    ...kolumner.map((k, i) => ({ kolumn: i, text: k, halvpunkter: ramad ? 24 : 20, fet: true })),
    ...rader.flatMap((r) => r.flatMap((text, i) => text.split('\n').flatMap((l, j): Celltext[] => {
      const linje = j > 0 ? ejBryt(l) : l;
      if (arMellanrubrik(r)) return [{ kolumn: i, text: linje, halvpunkter: Math.min(storlek, 18), fet: true }];
      if (i === 0 && radrubrik) return [{ kolumn: i, text: linje, halvpunkter: storlek, fet: j === 0, kursiv: j > 0 }];
      return linje.split(/(”[^”]*”)/).filter(Boolean).map((t) => ({ kolumn: i, text: t, halvpunkter: storlek, fet: !!o.fetAndra && i === 1, kursiv: (i === 0 && j > 0) || t.startsWith('”') }));
    }))),
  ]);
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
// Stegtabellen: nummer och namn i versaler, frågan under, sedan vad du gör och fraserna med citattecken. fran och till
// (räknat från 1) ger en del av tabellen, när en extrafilm står efter ett steg (src/lib/film.ts, stegDelar).
function stegTabell(d: NonNullable<MetodData['steg']>, stegOrd: string, fran = 1, till = d.rader.length): Barn[] {
  const bredder = [2100, 3400, BREDD - 5500];
  const huvud = rad([stegOrd, 'Vad du gör', d.fraserRubrik].map((k, i) => cell([stycke(k, { fet: true, farg: FARG.vit, storlek: 20, efter: 0 })], { bredd: bredder[i], fyll: FARG.huvud, kanter: runt(kant(FARG.huvud)) })), { huvud: true });
  const kropp = d.rader.map((r, i) => [r, i] as const).slice(fran - 1, till).map(([r, i]) => rad([
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
// Bockrutan är □ i Arial (K-138). ☐ fanns bara i Segoe UI Symbol: Google Dokument saknar det och ritar rutan med ett
// reservtypsnitt, och i Word gjorde det raden högre än textens, så att checklistorna blev längre i Word än i Google
// (18,8 mot 17,4 pt per rad i Upprepad läsnings lathund). Googles Calibri saknar också □ och ritar den i Arial
// (granskningen 2026-09-30), så rutan står i Arial i båda: samma tecken och samma mått, och Arial har lägre radhöjd än
// Calibri, så raden blir inte högre. Rutan är två tredjedelar så stor som ☐ vid samma storlek; en ensam ruta i en cell
// är därför en och en halv gång större, så att den är lika stor som förut.
const BOCK = '□';
const bockRun = (storlek: number) => run(BOCK, { font: 'Arial', farg: FARG.huvud, storlek });
function bockRad(text: string, o: StyckeVal = {}): Paragraph {
  return new Paragraph({ children: [bockRun(o.storlek ?? 22), run(` ${text}`, { storlek: 20, ...o })], spacing: { after: 0 } });
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
// hallIhopEfter: tabellen håller ihop med det som följer (ramens huvud med den första listan, K-071).
function ramFaltTabell(falt: { rubrik: string; text: string; kursiv?: boolean }[], o: { rubrik?: string; skrivrum?: boolean; hojder?: (number | undefined)[]; elevblad?: boolean; hallIhopEfter?: boolean } = {}): Barn[] {
  const forsta = o.elevblad ? 2000 : 2300;
  const bredder = [forsta, BREDD - forsta];
  const rader: TableRow[] = [];
  if (o.rubrik) rader.push(rad([cell([stycke(o.rubrik, { fet: true, farg: FARG.huvud, storlek: o.elevblad ? 26 : 22, efter: 0, hallIhop: true })], { bredd: BREDD, span: 2, fyll: FARG.ljus, kanter: runt(kant(FARG.huvud)) })], { huvud: true }));
  falt.forEach((f, i) => {
    const sist = i === falt.length - 1 && !o.hallIhopEfter;
    const linjer = f.text.split('\n');
    const tom = !f.text.trim();
    const hojd = o.hojder?.[i];
    rader.push(rad([
      // Etiketterna och namnraden på elevens blad är elevens (riggens docs/elevmaterial.md): i elevens typsnitt, som på sidan.
      cell([stycke(f.rubrik, { fet: true, storlek: o.elevblad ? 24 : 20, efter: 0, hallIhop: !sist, font: o.elevblad ? ELEVTYPSNITT : undefined })], { bredd: bredder[0], fyll: FARG.rand }),
      cell(tom ? [stycke('', { efter: 0, hallIhop: !sist })] : linjer.map((l, j) => replikStycke(l, { kursiv: f.kursiv, storlek: 20, efter: j === linjer.length - 1 ? 0 : 20, hallIhop: !sist })), { bredd: bredder[1] }),
    ], { hojd: hojd ? Math.round(hojd * CM) : tom ? (o.skrivrum ? 900 : 420) : undefined }));
  });
  return [tabell(rader, bredder), o.hallIhopEfter ? new Paragraph({ spacing: { before: 0, after: 160 }, keepNext: true }) : avstand()];
}
// En elevlista i en ram: orden stora, kolumnrubrikerna små och dämpade, ingen fet första kolumn.
// Bokstäver centreras. Listan hålls ihop, och med hallIhopEfter också med det som följer.
// brak: bråken staplas (metoder i matematik); annars står ett snedstreck kvar, som i ett datum.
// luft: ett kort att ha på bordet (strategikortet, K-062) får luft mellan raderna.
// elev: metoden har elevmaterial (K-130, src/lib/ljudkort.ts), så bladet eleven läser står i elevens typsnitt; lärarens
// protokoll i husets.
function elevlista(l: { rubrik?: string; kolumner?: string[]; rader: string[][]; larare?: boolean }, o: { storlek: number; hallIhopEfter?: boolean; brak?: boolean; luft?: boolean; elev?: boolean }): Barn[] {
  if (harFragor(l)) return fragelista(l, o);
  const ut: Barn[] = [];
  const n = Math.max(...l.rader.map((r) => r.length), l.kolumner?.length ?? 1);
  // En kolumn där alla rader är tomma är en skrivkolumn (kartläggningens Före och Efter): smal, med rubriken i mitten,
  // och resten av bredden går till texten.
  const skriv = Array.from({ length: n }, (_, i) => l.rader.every((r) => !(r[i] ?? '').trim()));
  const antalSkriv = skriv.filter(Boolean).length;
  // Många skrivkolumner (gruppens översikt i Ljudlek i grupp har nio) delar på drygt 60 procent av bredden, så att
  // textkolumnen alltid får plats, som i metodriggen. Med två eller tre är de 1 250 twips, som förut.
  const smal = antalSkriv && antalSkriv < n ? Math.min(1250, Math.floor((BREDD * 0.62) / antalSkriv)) : 0;
  const bredd = Math.floor((BREDD - smal * antalSkriv) / (smal ? n - antalSkriv : n));
  const sista = smal ? skriv.lastIndexOf(false) : n - 1;
  const bredder = Array.from({ length: n }, (_, i) => (smal && skriv[i] ? smal : i === sista ? BREDD - smal * antalSkriv - bredd * ((smal ? n - antalSkriv : n) - 1) : bredd));
  // En lista med skrivkolumner är lärarens protokoll, inte elevens kopia: texten i 11 pt, som i sidans utskrift, och raderna
  // täta (omkring 6 mm, som smalt linjerat papper), så att noten, namnet, rubriken och listorna ryms på en sida att kopiera
  // per elev. Lästrappan före och efter i Upprepad läsning har två listor och ryms så (K-071), och Ljudlekens protokoll har
  // tre listor med 29 rader på sidan med tabellerna.
  const storlek = smal ? Math.min(o.storlek, 22) : o.storlek;
  const bokstaver = l.rader.every((r) => r.every((c) => c.trim().length <= 2));
  if (l.rubrik) ut.push(stycke(l.rubrik, { fet: true, farg: FARG.huvud, storlek: 16, versaler: true, fore: 120, efter: 60, hallIhop: true, niva4: true }));
  const rader: TableRow[] = [];
  if (l.kolumner) rader.push(rad(l.kolumner.map((k, i) => cell([stycke(k, { storlek: 15, versaler: true, farg: FARG.svag, efter: 0, hallIhop: true, mitt: !!smal && skriv[i] })], { bredd: bredder[i], fyll: FARG.rand, tat: !!smal })), { huvud: true }));
  l.rader.forEach((r, ri) => {
    const ihop = ri < l.rader.length - 1 || !!o.hallIhopEfter;
    rader.push(rad(Array.from({ length: n }, (_, i) => cell([stycke(r[i] ?? '', { storlek, fore: o.luft ? 100 : 0, efter: o.luft ? 100 : 0, hallIhop: ihop, mitt: bokstaver, brak: o.brak, font: o.elev && !smal ? ELEVTYPSNITT : undefined })], { bredd: bredder[i], tat: !!smal }))));
  });
  ut.push(tabell(rader, bredder), avstand());
  return ut;
}
// En text med frågor (screeningens nivå 6–8, src/lib/ramform.ts): texten i en cell och frågorna kursivt i cellen bredvid,
// som i Niclas original. De längre texterna står mindre, som där.
const FRAGEBREDD = 0.28;
function fragelista(l: { rubrik?: string; rader: string[][] }, o: { storlek: number; hallIhopEfter?: boolean; elev?: boolean }): Barn[] {
  const ut: Barn[] = [];
  if (l.rubrik) ut.push(stycke(l.rubrik, { fet: true, farg: FARG.huvud, storlek: 16, versaler: true, fore: 120, efter: 60, hallIhop: true, niva4: true }));
  const hoger = Math.round(BREDD * FRAGEBREDD);
  const bredder = [BREDD - hoger, hoger];
  const storlek = { kort: o.storlek, mellan: Math.min(o.storlek, 26), lang: Math.min(o.storlek, 22) }[textlangd(l)];
  const fragor = l.rader.map((r) => (r[1] ?? '').trim()).filter(Boolean);
  ut.push(tabell([rad([
    cell(l.rader.map((r, i) => stycke(r[0], { storlek, efter: i === l.rader.length - 1 ? 0 : 100, hallIhop: true, font: o.elev ? ELEVTYPSNITT : undefined })), { bredd: bredder[0] }),
    cell(fragor.map((f, i) => stycke(f, { kursiv: true, storlek: 20, farg: FARG.svag, efter: i === fragor.length - 1 ? 0 : 100, hallIhop: true })), { bredd: bredder[1] }),
  ])], bredder), o.hallIhopEfter ? new Paragraph({ spacing: { before: 0, after: 160 }, keepNext: true }) : avstand());
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
          ...(k && brak && ensamtBrakI(k.k)
            ? brakStycken(ensamtBrakI(k.k)!.taljare, ensamtBrakI(k.k)!.namnare, 2 * Math.round(((info.korta ? 64 : 28) * SKALA * (info.korta ? 1.25 : 1.45)) / 2), FARG.text, w - 480, { fore: info.korta ? 280 : 200, hallIhop: vidare })
            : [new Paragraph({ alignment: AlignmentType.CENTER, keepNext: vidare, spacing: { before: info.korta ? 280 : 200, after: 0, line: 300 }, children: k ? (brak && /[0-9]+[/][0-9]+/.test(k.k) ? brakBarn(k.k, { storlek: info.korta ? 64 : 28, farg: FARG.text }, info.korta ? 1.25 : 1.45) : [run(k.k, { storlek: info.korta ? 80 : 28, farg: FARG.text })]) : [] })]),
        ],
      });
    }) }));
  }
  return new Table({ width: { size: w * perRad, type: WidthType.DXA }, columnWidths: Array.from({ length: perRad }, () => w), layout: TableLayoutType.FIXED, borders: UTAN_KANTER, rows: rader });
}

// ---------------------------------------------------------------- boksidan
// En lästext (Textsamtal i grupp; lastexter() i src/lib/ramform.ts känner igen den) är en sida i en gammal bok, ett till
// ett med metodriggens build-docx.js (lastext), som Niclas godkände 2026-09-30 och 2026-10-01 ("De ska vara lika som de
// du fick texterna. Alltså se ut som en gamla bok."): en dubbel ram runt sidan, titeln i Cinzel med en röd dubbel linje
// under, ett anfang i Cinzel Decorative, texten i elevens typsnitt och frågorna numrerade under en tunn linje. Raden
// Till läraren och nivån, som en liten knapp i nivåns färg, står i sidfoten, och upphovet litet i sidhuvudet, utanför
// ramen. Formen följer reglerna för Word och Google Dokument (METODER.md): ramen är en tabell med tre rader och inga
// linjer inne i den (titeln, anfanget med de två första raderna bredvid, och resten av texten med frågorna i en rad som
// fyller sidan), i en yttre tabell som ger den dubbla linjen (dubbelRam; Google har ingen dubbel kant, K-157),
// radavstånden är multiplar av typsnittens enkla rad, höjderna står i hela bildpunkter och allt är text.
// Måtten (textens storlek, radavståndet, anfanget) räknas i src/lib/boksida.ts, som sidans utskrift också använder.
// Cinzel och Cinzel Decorative finns i Google Dokument, och Word-filen bär delmängder av dem under samma namn
// (public/fonts/boksida/, OFL).
const BOKTYPSNITT = 'Cinzel';
const ANFANGTYPSNITT = 'Cinzel Decorative';
const BOK = { ram: '4B3A2F', rod: '8C2A1E', text: '2B2622', titel: '3A2D24', not: '8A8177', skiljare: 'B9A894', gra: '555555', kort: ['4E7A43', 'A8742A', '6E3450'] };
const punktStycke = (o: Omit<IParagraphOptions, 'children'> = {}) => new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, run: { size: 2, font: 'Calibri' }, ...o, children: [new TextRun({ text: '', size: 2, font: 'Calibri' })] });
// Text med **fet** och *kursiv*, som riggens runs().
function bokRuns(text: string, bas: IRunOptions): TextRun[] {
  const ut: TextRun[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let sist = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > sist) ut.push(textRun({ ...bas, text: text.slice(sist, m.index) }));
    ut.push(m[0].startsWith('**') ? textRun({ ...bas, text: m[0].slice(2, -2), bold: true }) : textRun({ ...bas, text: m[0].slice(1, -1), italics: true }));
    sist = m.index! + m[0].length;
  }
  if (sist < text.length) ut.push(textRun({ ...bas, text: text.slice(sist) }));
  return ut.length ? ut : [textRun({ ...bas, text: '' })];
}
// Knappen med nivån i sidfoten: vit text i Cinzel på nivåns färg, med luft på båda sidor. På kartläggningens blad står
// bara nivån, och raden Till läraren säger före eller efter.
function nivaKnapp(b: Boksektion): TextRun[] {
  const knapp = { font: BOKTYPSNITT, color: 'FFFFFF', shading: { type: ShadingType.CLEAR, fill: b.farg, color: 'auto' } };
  const vad = /^kartläggning/i.test(b.vad) ? [] : [new TextRun({ text: '  ·  ', size: 19, ...knapp }), new TextRun({ text: b.vad, size: b.vad.length > 8 ? 15 : 17, ...knapp })];
  return [new TextRun({ text: '  ', size: 19, ...knapp }), new TextRun({ text: b.niva.toUpperCase(), size: 19, ...knapp }), ...vad, new TextRun({ text: '  ', size: 19, ...knapp })];
}
// Sidfoten på en boksida: raden Till läraren till vänster, och nivåns knapp och sidnumret till höger, som i riggen.
function bokFot(b: Boksektion): Footer {
  return new Footer({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: BOKBREDD }],
    spacing: { after: 0 },
    children: [
      new TextRun({ text: b.not, size: b.not.length > 75 ? 13 : 15, color: BOK.not, font: 'Arial' }),
      new TextRun({ children: [new Tab()], size: 18, font: 'Arial' }),
      ...nivaKnapp(b),
      new TextRun({ text: '   ', size: 18, font: 'Arial' }),
      new TextRun({ text: 's. ', size: 18, color: BOK.gra, font: 'Arial' }),
      new TextRun({ children: [PageNumber.CURRENT], size: 18, color: BOK.gra, font: 'Arial' }),
    ],
  })] });
}
// Sidhuvudet på en boksida: upphovet, litet och grått ovanför ramen, eftersom allt som laddas ner bär © och
// niclasfohlin.se (riggens boksida har det inte).
function bokHuvud(adress: string): Header {
  return new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ text: `${UPPHOV} · ${adress}`, size: 15, color: BOK.not, font: 'Arial' })] })] });
}
// Lästextens sektionsbyte: boksidan står ensam i sin sektion, och sidfoten får lästextens rad och nivåns knapp.
const bokbyte = (l: Lastext) => new Sektionsbyte(false, { not: l.not, niva: l.niva, vad: l.vad, farg: BOK.kort[l.nivaNr] ?? BOK.ram });
// Boksidan: ett stycke på en punkt (en sektion börjar aldrig med en tabell) och ramen. Ryms texten inte på ett A4 ens med
// det tätaste radavståndet stannar bygget (Niclas 2026-10-01: "En text per sida ska det vara").
function boksida(l: Lastext): Barn[] {
  const matt = boksidansMatt(l);
  if (!matt.ryms) throw new Error(`Lästexten ”${l.titel}” (${l.niva}, ${l.vad}) ryms inte på ett A4 ens med det tätaste radavståndet. Korta texten eller frågorna; varje text ska vara en sida (src/lib/boksida.ts).`);
  const { size, line, storPt, kolW, delat, anfangH, titelH, bokstav } = matt;
  const elev: IRunOptions = { size, color: BOK.text, font: ELEVTYPSNITT };
  // Den dubbla ramen är två enkla (dubbelRam, K-157): boksidans tabell står i en yttre tabell, 30 twips in från dess kant.
  // Luften in till texten minskar lika mycket, så att texten står där den stod och är lika bred (src/lib/boksida.ts räknar
  // med BOKBREDD och BOKLUFT).
  const inreBredd = BOKBREDD - 2 * DUBBEL_GLAPP;
  const luft = BOKLUFT - DUBBEL_GLAPP;
  const ingen = { style: BorderStyle.NONE, size: 0, color: 'auto' } as const;
  const ram = { style: BorderStyle.SINGLE, size: 12, color: BOK.ram } as const;
  const utanLinjer = { top: ingen, bottom: ingen, left: ingen, right: ingen, insideHorizontal: ingen, insideVertical: ingen };
  const noll = { top: 0, bottom: 0, left: 0, right: 0 };
  // En kort linje mitt på raden, som kant under ett stycke på en punkt: tunn mellan texten och frågorna.
  const mitt = (bredd: number) => ({ left: Math.round((inreBredd - bredd) / 2), right: Math.round((inreBredd - bredd) / 2) });
  const linje = (bredd: number, kant: IBorderOptions, fore: number, efter: number) => punktStycke({
    indent: mitt(bredd), spacing: { before: fore, after: efter, line: 240 }, border: { bottom: { ...kant, space: 1 } },
  });
  // Den röda dubbla linjen under titeln, av två enkla (K-157): två stycken med var sin kant under, det andra 0,75 pt högt
  // och 15 twips smalare på var sida, så att Word inte slår ihop dem till en. Mätt i mätbänken (dubbellinje.mjs, variant
  // E): två linjer i både Word och Google, 1 pt lägre än Words dubbla kant i Word och 2,4 pt högre i Google.
  const rod = { style: BorderStyle.SINGLE, size: 6, color: BOK.rod, space: 0 } as const;
  const titellinje = [
    punktStycke({ indent: mitt(2000), spacing: { before: 0, after: 0, line: 240 }, border: { bottom: rod } }),
    punktStycke({ indent: mitt(1970), spacing: { before: 0, after: 300, line: 147 }, border: { bottom: rod } }),
  ];
  // Titeln i Cinzel, vars gemener är kapitäler: den står som i metodens fil och ser ut som titeln i en gammal bok.
  const titel = new Paragraph({ alignment: AlignmentType.CENTER, outlineLevel: 1, indent: { left: luft, right: luft }, spacing: { before: 200, after: 60, line: 240 },
    children: [new TextRun({ text: l.titel, font: BOKTYPSNITT, size: TITEL_PT * 2, color: BOK.titel })] });
  // Ett stycke i texten: en rad per rad.
  const radRuns = (text: string): TextRun[] => {
    const barn: TextRun[] = [];
    text.split('\n').forEach((rad, j) => { if (j) barn.push(new TextRun({ break: 1, size })); if (rad) barn.push(...bokRuns(rad, elev)); });
    return barn;
  };
  const ovriga = l.stycken.slice(1);
  const textStycke = (text: string, efter = 150, v = luft, h = luft) => new Paragraph({ indent: { left: v, right: h }, spacing: { before: 0, after: efter, line }, children: radRuns(text) });
  // Den sista radens höjd, så att ramen fyller sidan. Den är 150 twips (7,5 pt) lägre sedan den dubbla ramen och linjen
  // under titeln är byggda av enkla linjer (K-157): de tar 2,9 pt mer i Google än i Word, och Google flyttar avsnittets
  // sista stycke till en ny sida när sidan är full (sex texter på Avancerad fick en tom sida med 3 pt lägre rad).
  const restH = Math.floor(Math.max(0, RAMHOJD - titelH - anfangH - 90 - 150) / 15) * 15;
  // Frågorna: numret och texten efter en tabb, så att en fråga på två rader står under sin början.
  const fragor = l.fragor.map((f, i) => {
    const n = f.match(/^(\d+)\.\s*([\s\S]*)$/);
    const barn = [new TextRun({ text: n ? `${n[1]}.` : '', ...elev }), new TextRun({ children: [new Tab()], size }), ...radRuns(n ? n[2] : f)];
    return new Paragraph({ indent: { left: luft + 480, right: luft, hanging: 480 }, tabStops: [{ type: TabStopType.LEFT, position: luft + 480 }], keepLines: true,
      keepNext: i < l.fragor.length - 1, spacing: { after: 110, line }, children: barn });
  });
  const ruta = (barn: Barn[], o: { bredd: number; span?: number; kanter: Record<'top' | 'bottom' | 'left' | 'right', IBorderOptions>; marginaler: typeof noll }) =>
    new TableCell({ width: { size: o.bredd, type: WidthType.DXA }, columnSpan: o.span, borders: o.kanter, margins: o.marginaler, children: barn });
  const sidan = new Table({
    width: { size: inreBredd, type: WidthType.DXA }, columnWidths: [luft + kolW, inreBredd - luft - kolW], layout: TableLayoutType.FIXED, borders: utanLinjer,
    rows: [
      new TableRow({ children: [ruta([titel, ...titellinje],
        { bredd: inreBredd, span: 2, kanter: { top: ram, left: ram, right: ram, bottom: ingen }, marginaler: noll })] }),
      new TableRow({ height: { value: anfangH, rule: HeightRule.EXACT }, children: [
        ruta([new Paragraph({ spacing: { before: 0, after: 0, line: Math.round(240 * ANFANG_MULTIPEL) }, children: [new TextRun({ text: bokstav, font: ANFANGTYPSNITT, size: storPt * 2, bold: true, color: BOK.rod })] })],
          { bredd: luft + kolW, kanter: { top: ingen, left: ram, right: ingen, bottom: ingen }, marginaler: { ...noll, left: luft } }),
        ruta([textStycke(delat.inne, delat.rest ? 0 : 150, 0, 0)],
          { bredd: inreBredd - luft - kolW, kanter: { top: ingen, left: ingen, right: ram, bottom: ingen }, marginaler: { ...noll, right: luft } }),
      ] }),
      new TableRow({ height: { value: restH, rule: HeightRule.ATLEAST }, children: [ruta([
        ...(delat.rest ? [textStycke(delat.rest)] : []),
        ...ovriga.map((t) => textStycke(t)),
        linje(900, { style: BorderStyle.SINGLE, size: 4, color: BOK.skiljare }, 100, 300),
        ...fragor,
      ], { bredd: inreBredd, span: 2, kanter: { top: ingen, left: ram, right: ram, bottom: ram }, marginaler: noll })] }),
    ],
  });
  return [punktStycke(), dubbelRam(BOKBREDD, ram, () => sidan)];
}

// ---------------------------------------------------------------- sagobladen och tärningen
// Skrivkurs: sagoboken (Niclas 2026-10-02: mallarna ska kännas som sagor, "Snirklar och som curbits ... längs upp i
// mallen och en drake som är som en ram runt en sida", och "Du behåller såklart all snygg design på alla mallar"). En ram
// med sagoform är ett blad i en sagobok på ett eget A4, ett till ett med metodriggens build-docx.js (sagoblad, tarning):
// rubriken i Cinzel, elevens text i elevens typsnitt och ornamenten ur src/lib/sagoform.js som bilder i tabellceller, så
// att bladet går att skriva i. Ramen är lindormen (en drake runt sidan) eller slingan (kurbits överst, en dubbel linje av
// två enkla runt innehållet och en liten prydnad nederst). Datan står i src/lib/sagoblad.ts. Formen följer reglerna för
// Word och Google Dokument (wordparitet): rader med satt höjd utan cellmarginal upptill, höjder och marginaler i hela
// bildpunkter och tabeller i celler med ett stycke på en punkt runt sig. Måtten är millimeter.
const MM = 1440 / 25.4;
const mmTw = (mm: number) => bildpunkt(Math.round(mm * MM));
const twMm = (tw: number) => tw / MM;
const mmPx = (mm: number) => Math.round((mm / 25.4) * 96);
const PT_MM = 25.4 / 72;
const SF = { titel: '3A2D24', rod: '8C2A1E', ockra: 'B07A22', gron: '2F5634', linje: 'B9A894', fraga: '5E5046', start: '9C8B7B', text: '2B2622' };
// Egen kant utan linje: sajtens SAGA_INGEN står längre ned i filen och finns inte när de här konstanterna skapas.
const SAGA_INGEN: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const SAGA_INGA = { top: SAGA_INGEN, bottom: SAGA_INGEN, left: SAGA_INGEN, right: SAGA_INGEN };
const SAGA_NOLL = { top: 0, bottom: 0, left: 0, right: 0 };
const SAGA_UTAN = { ...SAGA_INGA, insideHorizontal: SAGA_INGEN, insideVertical: SAGA_INGEN };
let sagoBildNr = 0;
// Bildbankens bild som SVG-text ur Word-filens resurser (sagoBilder i src/lib/sagoblad.ts).
function bildbankSvg(sokvag: string | null): string | null {
  if (!sokvag) return null;
  const data = RESURSER.bilder.get(sokvag);
  if (!data) throw new Error(`Bilden ${sokvag} saknas i Word-filens resurser (sagoBilder i src/lib/sagoblad.ts).`);
  return new TextDecoder().decode(data);
}
const sagoRun = (svg: string, bMm: number, hMm: number, namn: string) =>
  svgRun(new TextEncoder().encode(svg), mmPx(bMm), mmPx(hMm), { name: `${namn} ${++sagoBildNr}`, description: namn, id: String(6000 + sagoBildNr) });
// En bild i ett eget stycke, utan luft, med styckemärket i 1 pt, så att raden är bildens höjd.
const sagoBild = (svg: string, bMm: number, hMm: number, namn: string, o: { align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) => new Paragraph({
  alignment: o.align ?? AlignmentType.CENTER, spacing: { before: 0, after: 0, line: 240 }, run: { size: 2, font: 'Calibri' }, children: [sagoRun(svg, bMm, hMm, namn)],
});
interface SagoText { align?: (typeof AlignmentType)[keyof typeof AlignmentType]; keepNext?: boolean; fore?: number; efter?: number; size?: number; color?: string; font?: string; caps?: boolean }
const sagoText = (text: string | null | undefined, o: SagoText = {}) => new Paragraph({
  alignment: o.align, keepNext: o.keepNext, spacing: { before: o.fore ?? 0, after: o.efter ?? 0, line: 240 },
  children: [new TextRun({ text: String(text ?? ''), font: o.font ?? ELEVTYPSNITT, size: o.size ?? 24, color: o.color ?? SF.text, ...(o.caps ? { allCaps: true } : {}) })],
});
const sagoTomCell = (w: number) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: SAGA_INGA, margins: SAGA_NOLL, children: [punktStycke()] });
const sagoLinje: IBorderOptions = { style: BorderStyle.SINGLE, size: 4, color: SF.linje };
const ockraKant: IBorderOptions = { style: BorderStyle.SINGLE, size: 8, color: SF.ockra };
// Sagobladens och tärningens tabeller är byggda efter reglerna för Google Dokument från början, som i riggen (exakta
// höjder utan marginal upptill och med kantens bildpunkt nedtill, hela bildpunkter och ett stycke på en punkt runt en
// tabell i en cell), och de har celler över flera rader, som googleTabeller inte kan bygga om. googleTabeller hoppar
// därför över dem, och regelprovet (scripts/wordregler.mjs) prövar dem som alla andra.
const GOOGLEKLARA = new WeakSet<Table>();
const googleklar = (t: Table) => { GOOGLEKLARA.add(t); return t; };
const sagoTabell = (w: number, kolumner: number[], rows: TableRow[]) => googleklar(new Table({ width: { size: w, type: WidthType.DXA }, columnWidths: kolumner, layout: TableLayoutType.FIXED, borders: SAGA_UTAN, rows }));
// En rad att skriva på: en cell med en tunn linje under. Startorden står ljust i början av raden.
function sagoSkrivrad(w: number, o: { span?: number; vanster?: number; start?: string; size?: number } = {}): TableCell {
  return new TableCell({
    width: { size: w, type: WidthType.DXA }, ...(o.span ? { columnSpan: o.span } : {}), verticalAlign: VerticalAlign.BOTTOM,
    borders: { top: SAGA_INGEN, left: SAGA_INGEN, right: SAGA_INGEN, bottom: sagoLinje }, margins: { top: 0, bottom: 15, left: o.vanster ?? 80, right: 40 },
    children: [o.start ? sagoText(o.start, { size: o.size ?? 24, color: SF.start }) : punktStycke()],
  });
}
// Antalet rader i ett fält: höjden i cm ur metodens elevblad, delad med radavståndet.
const raderAv = (cm: number | null | undefined, radMm: number, minst = 1) => Math.max(minst, Math.round(((cm ?? 2) * 10) / radMm));
const textMm = (text: string | null | undefined, namn: 'andika' | 'cinzel', halvpunkter: number) => SAGA.textBredd(String(text ?? ''), namn, (halvpunkter / 2) * PT_MM);

// Rubriken överst på bladet: titeln i Cinzel, undertiteln i versaler och namnraderna, med etiketter lika breda, så att
// raderna börjar under varandra.
function sagoRubrik(b: Sagoblad, w: number): Barn[] {
  const ut: Barn[] = [new Paragraph({ alignment: AlignmentType.CENTER, outlineLevel: 1, spacing: { before: 40, after: 0, line: 240 }, children: [new TextRun({ text: b.titel, font: BOKTYPSNITT, size: b.titel.length > 18 ? 48 : 56, color: SF.titel })] })];
  if (b.undertitel) ut.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60, line: 240 }, children: [new TextRun({ text: b.undertitel, font: BOKTYPSNITT, size: 20, color: SF.ockra, allCaps: true })] }));
  if (b.namnrader.length) {
    const lw = mmTw(Math.min(60, Math.max(...b.namnrader.map((n) => Math.ceil(SAGA.textBredd(`${n}:`, 'andika', 13 * PT_MM)))) + 4));
    ut.push(punktStycke(), sagoTabell(w, [lw, w - lw], b.namnrader.map((n) => new TableRow({ cantSplit: true, height: { value: mmTw(8), rule: HeightRule.EXACT }, children: [
      new TableCell({ width: { size: lw, type: WidthType.DXA }, verticalAlign: VerticalAlign.BOTTOM, borders: SAGA_INGA, margins: { top: 0, bottom: 15, left: 0, right: 80 }, children: [sagoText(`${n}:`, { size: 26, color: SF.fraga })] }),
      sagoSkrivrad(w - lw),
    ] }))), punktStycke());
  }
  return ut;
}
const rubrikHojd = (b: Sagoblad) => 14 + (b.undertitel ? 5.5 : 0) + (b.namnrader.length ? 2 + 8 * b.namnrader.length : 0);

// Lindormen som ram. Word lägger en glipa på cirka 0,2 mm under varje bild, så bitarna står aldrig över varandra där
// kroppen går tvärs över skarven: översta raden, med huvudet, slingan och svansen, har exakt bildens höjd; sidorna är var
// sin hög bild från översta raden ned till botten, sammanslagna över innehållets rad och nedersta raden; nederkanten
// står i nedersta raden, nedtill i cellen, så att den möter sidornas hörn hur högt innehållet än är.
function lindormRam(innehall: (w: number, hMm: number) => Barn[]): Barn[] {
  const B = twMm(BREDD_KORTARK), H = 264, botten = 20, sida = 19;
  const toppTw = mmTw(44), topp = twMm(toppTw);
  const ws = mmTw(sida), wm = BREDD_KORTARK - 2 * ws, sidaMm = twMm(ws), mittMm = twMm(wm);
  const R = SAGA.lindorm(B, H, { topp, skarvar: [{ axel: 'y', varde: topp }, { axel: 'x', varde: sidaMm, fran: H - botten - 6 }, { axel: 'x', varde: B - sidaMm, fran: H - botten - 6 }] });
  const bildCell = (svg: string, bMm: number, hMm: number, w: number, o: { span?: number; rowSpan?: number; botten?: boolean } = {}) => new TableCell({
    width: { size: w, type: WidthType.DXA }, ...(o.span ? { columnSpan: o.span } : {}), ...(o.rowSpan ? { rowSpan: o.rowSpan } : {}),
    verticalAlign: o.botten ? VerticalAlign.BOTTOM : VerticalAlign.TOP, borders: SAGA_INGA, margins: SAGA_NOLL, children: [sagoBild(svg, bMm, hMm, 'Lindormen, en drake runt sidan')],
  });
  const rows = [
    new TableRow({ cantSplit: true, height: { value: toppTw, rule: HeightRule.EXACT }, children: [bildCell(R.utsnitt(0, 0, B, topp), B, topp, BREDD_KORTARK, { span: 3 })] }),
    new TableRow({ cantSplit: true, children: [
      bildCell(R.utsnitt(0, topp, sidaMm, H - topp), sidaMm, H - topp, ws, { rowSpan: 2 }),
      new TableCell({ width: { size: wm, type: WidthType.DXA }, borders: SAGA_INGA, margins: { top: 0, bottom: 0, left: 100, right: 100 }, children: [punktStycke(), ...innehall(wm - 200, H - topp - botten), punktStycke()] }),
      bildCell(R.utsnitt(B - sidaMm, topp, sidaMm, H - topp), sidaMm, H - topp, ws, { rowSpan: 2 }),
    ] }),
    new TableRow({ cantSplit: true, children: [bildCell(R.utsnitt(sidaMm, H - botten, mittMm, botten), mittMm, botten, wm, { botten: true })] }),
  ];
  return [punktStycke(), sagoTabell(BREDD_KORTARK, [ws, wm, ws], rows)];
}
// Slingan som ram: kurbitsslingan överst, innehållet i en dubbel ram av två enkla linjer (rött utanför, ockra innanför)
// och en liten prydnad nederst.
const SLINGA_INNEHALL = 277 - 30 - 11 - 16;
function slingRam(innehall: (w: number) => Barn[]): Barn[] {
  const B = twMm(BREDD_KORTARK), sh = 30;
  const yttre: IBorderOptions = { style: BorderStyle.SINGLE, size: 12, color: SF.rod };
  const inre: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: SF.ockra };
  const luft = 60;
  const ruta = sagoTabell(BREDD_KORTARK, [BREDD_KORTARK], [new TableRow({ children: [new TableCell({
    width: { size: BREDD_KORTARK, type: WidthType.DXA }, borders: runt(yttre), margins: { top: luft, bottom: luft, left: luft, right: luft },
    children: [hjalpStycke(), sagoTabell(BREDD_KORTARK - 2 * luft, [BREDD_KORTARK - 2 * luft], [new TableRow({ children: [new TableCell({
      width: { size: BREDD_KORTARK - 2 * luft, type: WidthType.DXA }, borders: runt(inre), margins: { top: 0, bottom: 0, left: 220, right: 220 },
      children: [punktStycke(), ...innehall(BREDD_KORTARK - 2 * luft - 440), punktStycke()],
    })] })]), hjalpStycke()],
  })] })]);
  return [sagoBild(SAGA.kurbitsslinga(B, sh), B, sh, 'Kurbitsslingan'), ruta, sagoBild(SAGA.prydnad(110, 11), 110, 11, 'Prydnaden')];
}

// En stations namn och fråga: numret och namnet i Cinzel och frågan i elevens typsnitt. Startorden står kursivt efter
// namnet, ovanför raderna (Niclas 2026-10-02: "kursivt och över, inte på själva raden"), i 14 pt, eftersom eleven
// skriver av dem.
const stationNamn = (st: Station, size = 26, start?: string | null) => new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, keepNext: true, children: [
  new TextRun({ text: `${st.nr}  `, font: BOKTYPSNITT, size, color: SF.ockra }),
  new TextRun({ text: st.namn, font: BOKTYPSNITT, size, color: SF.rod }),
  ...(start ? [new TextRun({ text: `   ${start} …`, font: ELEVTYPSNITT, size: 28, italics: true, color: SF.fraga })] : []),
] });
const stationFraga = (st: Station) => sagoText(st.fraga, { size: 26, color: SF.fraga });

// Sagans väg: rundeln i första kolumnen, sammanslagen över stationens rader, namnet med startorden och frågan, och sedan
// raderna att skriva på. Med rita står en ruta att rita i bredvid raderna, som blir 13 mm höga för de yngstas handstil.
function vagInnehall(b: Sagoblad, w: number, hojdMm: number): Barn[] {
  const n = b.stationer.length;
  const rum = hojdMm - rubrikHojd(b) - 6;
  const kolM = mmTw(b.rita ? 27 : 29), kolR = b.rita ? mmTw(50) : 0, kolT = w - kolM - kolR;
  const huvudTw = b.stationer.map((st) => mmTw((textMm(st.fraga, 'andika', 26) <= twMm(b.rita ? kolR + kolT : kolT) - 4 ? 13 : 18.5) + 2));
  const radMm = b.rita ? 13 : (b.radMm ?? 7.5);
  // Raderna fördelas efter höjderna i metodens elevblad, så att alla stationer ryms.
  const rader = b.stationer.map((st) => raderAv(st.cm, radMm));
  const behov = (radTw: number) => b.stationer.reduce((a, _, i) => a + huvudTw[i] + rader[i] * radTw, 0);
  let radTw = mmTw(radMm);
  while (twMm(behov(radTw)) > rum && radTw > mmTw(6)) radTw -= 15;
  while (twMm(behov(radTw)) > rum) { const i = rader.indexOf(Math.max(...rader)); if (rader[i] <= 1) break; rader[i] -= 1; }
  const rows: TableRow[] = [];
  b.stationer.forEach((st, i) => {
    // Rundeln har exakt stationens höjd, så att vägen blir hel genom stationerna.
    const hMm = twMm(huvudTw[i] + rader[i] * radTw);
    const bild = SAGA.rundel(twMm(kolM), hMm, bildbankSvg(st.bild), { upp: i > 0, ned: i < n - 1, r: Math.min(9.4, hMm * 0.34) }).svg(0, 0, twMm(kolM), hMm);
    const rundel = new TableCell({ width: { size: kolM, type: WidthType.DXA }, rowSpan: 1 + rader[i], borders: SAGA_INGA, margins: SAGA_NOLL, children: [sagoBild(bild, twMm(kolM), hMm, `Stationen ${st.namn}`)] });
    const huvud = new TableCell({ width: { size: kolR + kolT, type: WidthType.DXA }, ...(b.rita ? { columnSpan: 2 } : {}), verticalAlign: b.rita ? VerticalAlign.TOP : VerticalAlign.CENTER, borders: SAGA_INGA,
      margins: { top: 0, bottom: 0, left: b.rita ? 60 : 80, right: 40 }, children: [stationNamn(st, 28, st.start), stationFraga(st)] });
    rows.push(new TableRow({ cantSplit: true, height: { value: huvudTw[i], rule: HeightRule.EXACT }, children: [rundel, huvud] }));
    const ruta = new TableCell({ width: { size: kolR, type: WidthType.DXA }, rowSpan: rader[i], verticalAlign: VerticalAlign.TOP, borders: runt(ockraKant),
      margins: { top: 0, bottom: 0, left: 60, right: 60 }, children: [sagoText('Rita', { size: 24, color: SF.start })] });
    for (let j = 0; j < rader[i]; j++) rows.push(new TableRow({ cantSplit: true, height: { value: radTw, rule: HeightRule.EXACT }, children: [
      ...(b.rita && j === 0 ? [ruta] : []),
      sagoSkrivrad(kolT, { size: b.rita ? 28 : 24, vanster: b.rita ? 160 : 80 }),
    ] }));
  });
  return [...sagoRubrik(b, w), sagoTabell(w, b.rita ? [kolM, kolR, kolT] : [kolM, kolT], rows)];
}

// Spänningsberget: berget med vägen, och under det en rad för varje station med namnet, lågor att färga och en rad.
function bergInnehall(b: Sagoblad, w: number, hojdMm: number): Barn[] {
  const bMm = twMm(w);
  const berg = SAGA.berget(bMm, 78, b.stationer.map((st) => bildbankSvg(st.bild)));
  const kolN = mmTw(46), kolL = mmTw(44), kolT = w - kolN - kolL;
  // Raderna fyller det som är kvar av sidan under berget, mellan 10 och 18 mm höga, utom 10 mm som Google Dokument
  // behöver: där blir de exakta raderna och bilderna några millimeter högre, och berget i sex steg sköt prydnaden till en
  // egen sida (scripts/googleprov.mjs, 2026-10-02).
  const kvar = hojdMm - rubrikHojd(b) - 78 - (b.text ? 9 : 0) - 6 - 10;
  const radTw = mmTw(Math.max(10, Math.min(18, kvar / b.stationer.length)));
  const lagor = SAGA.lagor(40, 8.5);
  const rows = b.stationer.map((st) => new TableRow({ cantSplit: true, height: { value: radTw, rule: HeightRule.EXACT }, children: [
    new TableCell({ width: { size: kolN, type: WidthType.DXA }, verticalAlign: VerticalAlign.BOTTOM, borders: { ...SAGA_INGA, bottom: sagoLinje }, margins: { top: 0, bottom: 15, left: 40, right: 40 }, children: [stationNamn(st, 26)] }),
    new TableCell({ width: { size: kolL, type: WidthType.DXA }, verticalAlign: VerticalAlign.BOTTOM, borders: { ...SAGA_INGA, bottom: sagoLinje }, margins: { top: 0, bottom: 15, left: 40, right: 40 }, children: [sagoBild(lagor, 40, 8.5, 'Fem lågor att färga')] }),
    sagoSkrivrad(kolT),
  ] }));
  return [...sagoRubrik(b, w), sagoBild(berg, bMm, 78, 'Spänningsberget'), ...(b.text ? [sagoText(b.text, { size: 26, color: SF.fraga, align: AlignmentType.CENTER, fore: 60, efter: 60 })] : []), punktStycke(),
    sagoTabell(w, [kolN, kolL, kolT], rows), punktStycke()];
}

// Ett fält med rubrik och rader: etiketten i elevens typsnitt i 14 pt och ledtråden i 12 pt efter den, eller på en egen
// rad när den inte ryms bredvid, och raderna under.
const ETIKETT = 28, LEDTRAD = 24;
const tvaHuvudrader = (f: Sagofalt, wMm: number, size = ETIKETT) => !!f.fraga && textMm(f.rubrik, 'andika', size) + textMm(`  ${f.fraga}`, 'andika', LEDTRAD) > wMm - 2;
const faltHuvudMm = (f: Sagofalt, wMm: number, size?: number) => (tvaHuvudrader(f, wMm, size) ? 13.5 : 7.5);
function faltRader(f: Sagofalt, w: number, radTw: number, o: { size?: number } = {}): Table {
  const n = raderAv(f.cm, twMm(radTw));
  const size = o.size ?? ETIKETT;
  const tva = tvaHuvudrader(f, twMm(w), size);
  const etikett = new TextRun({ text: f.rubrik, font: ELEVTYPSNITT, size, color: SF.rod });
  const ledtrad = (fore: string) => new TextRun({ text: `${fore}${f.fraga}`, font: ELEVTYPSNITT, size: LEDTRAD, color: SF.fraga });
  const huvudrad = (hMm: number, barn: TextRun[]) => new TableRow({ cantSplit: true, height: { value: mmTw(hMm), rule: HeightRule.EXACT }, children: [new TableCell({ width: { size: w, type: WidthType.DXA }, verticalAlign: VerticalAlign.BOTTOM, borders: SAGA_INGA, margins: SAGA_NOLL, children: [new Paragraph({ keepNext: true, spacing: { before: 0, after: 0, line: 240 }, children: barn })] })] });
  const rows = tva ? [huvudrad(7.5, [etikett]), huvudrad(6, [ledtrad('')])] : [huvudrad(7.5, [etikett, ...(f.fraga ? [ledtrad('  ')] : [])])];
  for (let j = 0; j < n; j++) rows.push(new TableRow({ cantSplit: true, height: { value: radTw, rule: HeightRule.EXACT }, children: [sagoSkrivrad(w, { vanster: 40 })] }));
  return sagoTabell(w, [w], rows);
}
// Hjältens kort: den ovala ramen till vänster med de första fälten bredvid, och resten av fälten under.
function portrattInnehall(b: Sagoblad, w: number, hojdMm: number): Barn[] {
  const [bild, ...falt] = b.falt;
  const kolB = mmTw(66), kolF = w - kolB - mmTw(4);
  const radTw = mmTw(b.radMm ?? 8.5);
  const ramMm = 86;
  let anvant = 0;
  const bredvid: Sagofalt[] = [], under: Sagofalt[] = [];
  for (const f of falt) { const h = faltHuvudMm(f, twMm(kolF)) + raderAv(f.cm, twMm(radTw)) * twMm(radTw) + 2; if (!under.length && anvant + h <= ramMm + 4) { bredvid.push(f); anvant += h; } else under.push(f); }
  const kol = sagoTabell(w, [kolB, mmTw(4), kolF], [new TableRow({ cantSplit: true, children: [
    new TableCell({ width: { size: kolB, type: WidthType.DXA }, borders: SAGA_INGA, margins: SAGA_NOLL, children: [sagoBild(SAGA.portrattRam(66, ramMm), 66, ramMm, 'En oval ram att rita hjälten i'), sagoText(bild?.rubrik ?? '', { size: 26, color: SF.fraga, align: AlignmentType.CENTER })] }),
    sagoTomCell(mmTw(4)),
    new TableCell({ width: { size: kolF, type: WidthType.DXA }, borders: SAGA_INGA, margins: SAGA_NOLL, children: [...bredvid.flatMap((f) => [punktStycke(), faltRader(f, kolF, radTw)]), punktStycke()] }),
  ] })]);
  // Raderna under ramen blir högre tills fälten fyller sidan, högst 13 mm, och räcker det inte får det sista fältet fler.
  const radsUnder = under.reduce((a, f) => a + raderAv(f.cm, twMm(radTw)), 0);
  const overMm = rubrikHojd(b) + Math.max(ramMm + 8, anvant) + under.reduce((a, f) => a + faltHuvudMm(f, twMm(w)) + 2, 0) + 6;
  const radUnderTw = radsUnder ? mmTw(Math.max(twMm(radTw), Math.min(13, (hojdMm - overMm) / radsUnder))) : radTw;
  const extra = radsUnder ? Math.max(0, Math.floor((hojdMm - overMm - radsUnder * twMm(radUnderTw)) / twMm(radUnderTw))) : 0;
  return [...sagoRubrik(b, w), punktStycke(), kol, ...under.flatMap((f, i) => [punktStycke(), faltRader({ ...f, cm: ((raderAv(f.cm, twMm(radTw)) + (i === under.length - 1 ? extra : 0)) * twMm(radUnderTw)) / 10 }, w, radUnderTw)]), punktStycke()];
}
// En ruta att rita i, med etiketten ljust överst.
const ritruta = (rubrik: string, w: number, hMm: number) => sagoTabell(w, [w], [new TableRow({ cantSplit: true, height: { value: mmTw(hMm), rule: HeightRule.EXACT }, children: [new TableCell({ width: { size: w, type: WidthType.DXA }, borders: runt(ockraKant), margins: { top: 0, bottom: 15, left: 80, right: 80 }, children: [sagoText(rubrik, { size: 24, color: SF.start })] })] })]);
// Omslaget: titelraderna, en stor ruta att rita i och raderna för författarna.
function omslagInnehall(b: Sagoblad, w: number, hojdMm: number): Barn[] {
  const ut: Barn[] = [];
  const rutan = b.falt.find((f) => /rita|bild/i.test(f.rubrik));
  const ovriga = b.falt.filter((f) => f !== rutan);
  const radTw = mmTw(11);
  const ovrigaMm = ovriga.reduce((a, f) => a + faltHuvudMm(f, twMm(w)) + raderAv(f.cm, 11) * 11 + 2, 0);
  const rutaMm = Math.max(40, Math.min((rutan?.cm ?? 12) * 10, hojdMm - ovrigaMm - 14));
  const [forst, ...efter] = ovriga;
  if (forst) ut.push(punktStycke(), faltRader(forst, w, radTw, { size: 30 }));
  if (rutan) ut.push(punktStycke(), ritruta(rutan.rubrik, w, rutaMm));
  for (const f of efter) ut.push(punktStycke(), faltRader(f, w, radTw));
  return [...ut, punktStycke()];
}
// En sida i sagoboken: titelraden, rutan att rita i och raderna, där de två första raderna står bredvid rutan för den
// första bokstaven, som anfanget på boksidan.
function sidaInnehall(b: Sagoblad, w: number, hojdMm: number): Barn[] {
  const ut: Barn[] = [];
  const titel = b.falt.find((f) => /titel/i.test(f.rubrik));
  const rutan = b.falt.find((f) => /rita|bild/i.test(f.rubrik));
  const texten = b.falt.find((f) => f !== titel && f !== rutan);
  const radMm = 9.5, radTw = mmTw(radMm);
  if (titel) ut.push(sagoTabell(w, [mmTw(30), w - mmTw(30)], [new TableRow({ cantSplit: true, height: { value: mmTw(12), rule: HeightRule.EXACT }, children: [
    new TableCell({ width: { size: mmTw(30), type: WidthType.DXA }, verticalAlign: VerticalAlign.BOTTOM, borders: SAGA_INGA, margins: { top: 0, bottom: 15, left: 0, right: 80 }, children: [new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [new TextRun({ text: titel.rubrik, font: ELEVTYPSNITT, size: ETIKETT, color: SF.rod })] })] }),
    sagoSkrivrad(w - mmTw(30), { size: 32 }),
  ] })]), punktStycke({ spacing: { before: 0, after: 90, line: 240 } }));
  const textMmHojd = texten ? raderAv(texten.cm, radMm) * radMm : 0;
  const rutaMm = Math.max(50, hojdMm - textMmHojd - 30);
  if (rutan) ut.push(ritruta(rutan.rubrik, w, rutaMm), punktStycke());
  if (texten) {
    const n = raderAv(texten.cm, radMm, 3);
    const kolA = mmTw(2 * radMm + 1);
    const anfang = SAGA.anfangsRuta(2 * radMm);
    const rows: TableRow[] = [];
    for (let j = 0; j < n; j++) rows.push(new TableRow({ cantSplit: true, height: { value: radTw, rule: HeightRule.EXACT }, children: j === 0
      ? [new TableCell({ width: { size: kolA, type: WidthType.DXA }, rowSpan: 2, borders: SAGA_INGA, margins: SAGA_NOLL, children: [sagoBild(anfang, 2 * radMm - 0.5, 2 * radMm - 0.5, 'En ruta för den första bokstaven', { align: AlignmentType.LEFT })] }), sagoSkrivrad(w - kolA, { size: 28 })]
      : j === 1 ? [sagoSkrivrad(w - kolA, { size: 28 })] : [sagoSkrivrad(w, { span: 2, size: 28, vanster: 40 })] }));
    ut.push(sagoTabell(w, [kolA, w - kolA], rows));
  }
  return [...ut, punktStycke()];
}
// Författarna: två rutor att rita i, var och en med fälten bredvid.
function forfattareInnehall(b: Sagoblad, w: number): Barn[] {
  const rutan = b.falt.find((f) => /rita|bild/i.test(f.rubrik));
  const falt = b.falt.filter((f) => f !== rutan);
  const kolB = mmTw(58), kolF = w - kolB - mmTw(5);
  const radTw = mmTw(9);
  const block = () => sagoTabell(w, [kolB, mmTw(5), kolF], [new TableRow({ cantSplit: true, children: [
    new TableCell({ width: { size: kolB, type: WidthType.DXA }, borders: SAGA_INGA, margins: SAGA_NOLL, children: [sagoBild(SAGA.portrattRam(56, 74), 56, 74, 'En oval ram att rita författaren i'), sagoText(rutan?.rubrik ?? '', { size: 26, color: SF.fraga, align: AlignmentType.CENTER })] }),
    sagoTomCell(mmTw(5)),
    new TableCell({ width: { size: kolF, type: WidthType.DXA }, borders: SAGA_INGA, margins: SAGA_NOLL, children: [...falt.flatMap((f) => [punktStycke(), faltRader(f, kolF, radTw)]), punktStycke()] }),
  ] })]);
  return [...sagoRubrik(b, w), punktStycke(), block(), punktStycke(), sagoBild(SAGA.prydnad(80, 9), 80, 9, 'Prydnaden'), punktStycke(), block(), punktStycke()];
}
// Två kort eller skyltar på ett A4, med streckad kant att klippa längs.
const korthojd = () => bildpunkt(Math.floor((A4.height - 2 * KORTMARGINAL - 600) / 2));
// Frågekorten och rollkorten: varje lista är ett kort på ett halvt A4, med en liten slinga överst, listans rubrik i Cinzel
// och raderna numrerade i elevens typsnitt. Med kortbilder står stationens rundel i stället för numret, så att också den
// som inte läser än hittar stationen, och en prick där raden inte hör till en station.
function kortSagoblad(b: Sagoblad): Barn[] {
  const ikonMm = 9.5;
  const markor = (l: { rubrik: string }, i: number): TextRun | ImageRun => {
    const bilder = b.kortbilder?.[l.rubrik];
    if (!bilder) return new TextRun({ text: `${i + 1}.`, font: BOKTYPSNITT, size: 34, color: SF.rod });
    const ord = bilder[i];
    if (!ord) return new TextRun({ text: '•', font: BOKTYPSNITT, size: 34, color: SF.ockra });
    const svg = SAGA.rundel(ikonMm, ikonMm, bildbankSvg(bildForOrd(ord)), { upp: false, ned: false, r: ikonMm * 0.47 }).svg(0, 0, ikonMm, ikonMm);
    return sagoRun(svg, ikonMm, ikonMm, `Stationen ${ord}`);
  };
  const kort = (l: { rubrik: string; rader: string[][] }) => {
    const med = !!b.kortbilder?.[l.rubrik];
    return [
      sagoBild(SAGA.kurbitsslinga(120, 20), 120, 20, 'Kurbitsslingan'),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 160, line: 240 }, children: [new TextRun({ text: l.rubrik, font: BOKTYPSNITT, size: 36, color: SF.titel })] }),
      ...l.rader.map((r, i) => new Paragraph({ indent: med ? { left: 1100, right: 400, hanging: 780 } : { left: 960, right: 400, hanging: 520 }, tabStops: [{ type: TabStopType.LEFT, position: med ? 1100 : 960 }], spacing: { before: 0, after: med ? 60 : 180, line: 240 }, children: [
        markor(l, i), new TextRun({ children: [new Tab()], size: 34 }), new TextRun({ text: String(r[0] ?? ''), font: ELEVTYPSNITT, size: 34, color: SF.text }),
      ] })),
    ];
  };
  return [punktStycke(), sagoTabell(BREDD_KORTARK, [BREDD_KORTARK], b.listor.map((l) => new TableRow({ cantSplit: true, height: { value: korthojd(), rule: HeightRule.EXACT }, children: [new TableCell({
    width: { size: BREDD_KORTARK, type: WidthType.DXA }, borders: runt(STRECKAD), margins: { top: 0, bottom: 15, left: 200, right: 200 }, children: kort(l),
  })] })))];
}
// Vägskyltarna: en skylt för varje station, två på ett A4 med streckad kant att klippa längs. Rosetten står stort överst,
// sedan numret och namnet i Cinzel, startorden och frågan i elevens typsnitt, så att gruppen ser skylten från golvet.
function skyltarSagoblad(b: Sagoblad): Barn[] {
  const skylt = (st: Station) => [
    sagoBild(SAGA.rosett(120, 64, bildbankSvg(st.bild)), 120, 64, `Rosetten för ${st.namn}`),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 0, line: 240 }, children: [
      new TextRun({ text: `${st.nr}  `, font: BOKTYPSNITT, size: 72, color: SF.ockra }),
      new TextRun({ text: st.namn, font: BOKTYPSNITT, size: 72, color: SF.rod }),
    ] }),
    ...(st.start ? [sagoText(st.start, { size: 48, align: AlignmentType.CENTER, fore: 40 })] : []),
    ...(st.fraga ? [sagoText(st.fraga, { size: 30, color: SF.fraga, align: AlignmentType.CENTER, fore: 60 })] : []),
    new Paragraph({ spacing: { before: 120, after: 0, line: 240 }, run: { size: 2, font: 'Calibri' }, alignment: AlignmentType.CENTER, children: [sagoRun(SAGA.prydnad(90, 10), 90, 10, 'Prydnaden')] }),
    // Versionen under prydnaden, så att skyltarna i fyra och sex steg går att skilja åt.
    ...(b.undertitel ? [sagoText(b.undertitel, { font: BOKTYPSNITT, size: 20, color: SF.ockra, align: AlignmentType.CENTER, caps: true, fore: 40 })] : []),
  ];
  const par: Station[][] = [];
  for (let i = 0; i < b.stationer.length; i += 2) par.push(b.stationer.slice(i, i + 2));
  return par.flatMap((tva, j) => [
    j ? punktStycke({ pageBreakBefore: true }) : punktStycke(),
    sagoTabell(BREDD_KORTARK, [BREDD_KORTARK], tva.map((st) => new TableRow({ cantSplit: true, height: { value: korthojd(), rule: HeightRule.EXACT }, children: [new TableCell({
      width: { size: BREDD_KORTARK, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: runt(STRECKAD), margins: { top: 0, bottom: 15, left: 200, right: 200 }, children: skylt(st),
    })] }))),
  ]);
}
function sagobladBarn(b: Sagoblad): Barn[] {
  if (b.form === 'kort') return kortSagoblad(b);
  if (b.form === 'skyltar') return skyltarSagoblad(b);
  const innehall = (w: number, h: number): Barn[] => (b.form === 'vag' ? vagInnehall(b, w, h)
    : b.form === 'berg' ? bergInnehall(b, w, h)
      : b.form === 'portratt' ? portrattInnehall(b, w, h)
        : b.form === 'omslag' ? omslagInnehall(b, w, h)
          : b.form === 'sida' ? sidaInnehall(b, w, h)
            : forfattareInnehall(b, w));
  return b.ram === 'lindorm' ? lindormRam((w, h) => innehall(w, h)) : slingRam((w) => innehall(w, SLINGA_INNEHALL));
}
// Lärarens text till en följd av sagoblad: ramens rubrik, text och ruta Till läraren i vanlig storlek, och bildernas
// upphov, så att läraren läser hur bladet används utan att läsa sidfoten (granskningen 2026-10-02).
function sagoLarartext(ramar: Ram[], d: MetodData, rubrik: (text: string) => Barn): Barn[] {
  const ut: Barn[] = [];
  for (const r of ramar) {
    ut.push(rubrik(r.rubrik));
    for (const s of r.text) ut.push(stycke(s, { efter: 60 }));
    const [blad] = sagobladAv(r, d);
    if (blad.not) ut.push(stycke(blad.not, { farg: FARG.svag, storlek: 20, efter: 100 }));
  }
  ut.push(stycke(SAGO_UPPHOV, { farg: FARG.svag, storlek: 18 }));
  return ut;
}
// En följd av ramar med sagoform från ramen i.
const sagoFoljd = (ramar: Ram[], i: number): Ram[] => { const ut: Ram[] = []; for (let j = i; j < ramar.length && ramar[j].sagoform; j++) ut.push(ramar[j]); return ut; };
// Ramens blad, vart och ett på en egen sida i en egen sektion: rutan Till läraren i sidfoten, som på boksidan, och bokens
// blad utan sidfot, så att de går att kopiera in i den tryckta boken (riggens läsbarhetsrunda 2026-10-02). Upphovet står
// litet i sidhuvudet på alla, som på boksidan.
function sagoFlod(ram: Ram, d: MetodData): Flod {
  return [...sagobladAv(ram, d).flatMap((b) => [new Sektionsbyte(false, undefined, { not: b.not, utanSidfot: b.bokblad }), ...sagobladBarn(b)]), new Sektionsbyte(false)];
}
// Sidfoten på ett sagoblad: raden Till läraren till vänster och sidnumret till höger.
function sagoFot(s: Sagosektion): Footer {
  if (s.utanSidfot) return new Footer({ children: [punktStycke()] });
  return new Footer({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: BREDD_KORTARK }], spacing: { after: 0 },
    children: [
      new TextRun({ text: s.not, size: s.not.length > 75 ? 13 : 15, color: BOK.not, font: 'Arial' }),
      new TextRun({ children: [new Tab()], size: 18, font: 'Arial' }),
      new TextRun({ text: 's. ', size: 18, color: BOK.gra, font: 'Arial' }),
      new TextRun({ children: [PageNumber.CURRENT], size: 18, color: BOK.gra, font: 'Arial' }),
    ],
  })] });
}
// Tärningen (Niclas 2026-10-01: "stora berättelsetärningar i A4 som klipps ut och viks"): ett kors av sex sidor på 5,8 cm,
// en tärning per A4, med en flik vid var och en av de sju kanterna som limmas. Korset har fyra sidor i mittkolumnen (A, C,
// E, F uppifrån) och en på var sida om den andra (B och D). Streckad grå kant klipps och blå prickad viks, som på
// vikkorten. Varje sida är en bild: tärningens färg, en dubbel ram med blommor i hörnen, frågan i Cinzel, bilden ur
// bildbanken och ordet. Raderna har exakt höjd utan cellmarginal upptill, så att korset blir lika stort i Word och Google.
const TARNING_TEXT = 'Klipp längs strecken, också de korta strecken vid flikarna. Vik längs de blå prickade linjerna och limma flikarna inuti tärningen.';
// Rubriken och raden över korset i 9,5 pt, som i riggen (granskningen 2026-10-02: 7,5 och 8 pt var för små vid korset).
const tarningRubrik = (text: string | undefined): Paragraph[] => [
  ...(text ? [new Paragraph({ keepNext: true, spacing: { before: 0, after: 40 }, heading: HeadingLevel.HEADING_4, children: [textRun({ text, bold: true, size: 19, color: FARG.huvud, allCaps: true })] })] : []),
  new Paragraph({ keepNext: true, spacing: { before: 0, after: 80 }, children: [textRun({ text: TARNING_TEXT, size: 19, color: FARG.svag })] }),
];
function tarningTabell(t: Tarning): Table {
  const s = 3285, fl = 630;
  const bredder = [s - fl, fl, s, fl, s - fl];
  // Rutnätet: en versal är en sida, en gemen en flik på den sidan och en punkt tomt. B och D går över två kolumner.
  const NAT = ['.aAa.', 'BBCDD', '.eEe.', '.fFf.', '..f..'];
  const vad = (r: number, c: number): { sida?: string; flik?: string } | null => {
    const x = NAT[r]?.[c];
    if (!x || x === '.') return null;
    return x === x.toUpperCase() ? { sida: x } : { flik: x.toUpperCase() };
  };
  // Kanten mellan två rutor: två sidor, eller en sida och dess flik, viks. En ruta mot tomt, mot arkets kant eller mot en
  // annan sidas flik klipps, och två tomma rutor har ingen kant. Båda cellerna får samma kant.
  type Ruta = ReturnType<typeof vad>;
  const kantMellan = (x: Ruta, y: Ruta): IBorderOptions => {
    if (!x && !y) return SAGA_INGEN;
    if (x?.sida && y?.sida) return x.sida === y.sida ? SAGA_INGEN : VIKLINJE;
    if ((x?.sida && y?.flik === x.sida) || (y?.sida && x?.flik === y.sida)) return VIKLINJE;
    return STRECKAD;
  };
  const sidaMm = Math.floor(twMm(s - 200) * 10) / 10;
  const { ljus } = SAGA.TARNINGSFARGER[(t.nr - 1) % SAGA.TARNINGSFARGER.length];
  const innehall = (bokstav: string) => {
    const { ord, bild } = t.sidor['ABCDEF'.indexOf(bokstav)];
    // sagoform.js är JavaScript, och TypeScript läser parametrarnas typer ur förvalen (null), så anropet får sin typ här.
    const tarningssida = SAGA.tarningssida as unknown as (o: { nr: number; fraga: string; ord: string; bild: string | null; sida: number; allaOrd: string[] }) => string;
    return [sagoBild(tarningssida({ nr: t.nr, fraga: t.fraga, ord, bild: bildbankSvg(bild), sida: sidaMm, allaOrd: t.allaOrd }), sidaMm, sidaMm, `Tärningens sida: ${ord}`)];
  };
  const rows = NAT.map((rad, r) => {
    const celler: TableCell[] = [];
    for (let c = 0; c < rad.length; c++) {
      const x = vad(r, c);
      const span = x?.sida && vad(r, c + 1)?.sida === x.sida ? 2 : 1;
      celler.push(new TableCell({
        width: { size: bredder.slice(c, c + span).reduce((a, v) => a + v, 0), type: WidthType.DXA }, ...(span > 1 ? { columnSpan: span } : {}),
        verticalAlign: VerticalAlign.CENTER,
        borders: { top: kantMellan(x, vad(r - 1, c)), bottom: kantMellan(x, vad(r + 1, c)), left: kantMellan(x, vad(r, c - 1)), right: kantMellan(x, vad(r, c + span)) },
        ...(x?.flik ? { shading: { type: ShadingType.CLEAR, fill: ljus.replace('#', ''), color: 'auto' } } : {}),
        margins: { top: 0, bottom: 15, left: 100, right: 100 },
        children: x?.sida ? innehall(x.sida) : [punktStycke()],
      }));
      c += span - 1;
    }
    return new TableRow({ cantSplit: true, height: { value: r < 4 ? s : fl, rule: HeightRule.EXACT }, children: celler });
  });
  return googleklar(new Table({ alignment: AlignmentType.CENTER, width: { size: 3 * s, type: WidthType.DXA }, columnWidths: bredder, layout: TableLayoutType.FIXED, borders: UTAN_KANTER, rows }));
}
// stor: en elevkopia (planeringsmallarna), där listorna kommer först och sätts stort nog att läsas av ett par
// eller visas för gruppen; annars (beskrivningen) står lärarnoten först och listorna efter.
// kort: metodens kort att klippa (d.kort); blad: fältens höjd i cm när ramen är elevens blad (d.elevblad).
// elev: metoden har elevmaterial (K-130, src/lib/ljudkort.ts), så elevens blad och korten att klippa står i elevens
// typsnitt.
function ramBarn(ram: Ram, o: { skrivrum?: boolean; stor?: boolean; kort?: MetodData['kort']; blad?: Record<string, number>; brak?: boolean; elev?: boolean } = {}): Flod {
  const ut: Flod = [];
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
  // Står huvudet före en lista håller det ihop med den, så att namnet står på samma sida som protokollet (K-071).
  const huvud = () => (ram.huvud ? ramFaltTabell(ram.huvud, { skrivrum: o.skrivrum, hojder: o.blad ? ram.huvud.map(() => 1) : undefined, hallIhopEfter: !!ram.listor?.length }) : []);
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
  // En lästräningstext blir två läskort på en egen sida (K-063), och en ensam kort lista ett kort i 20 pt (K-062).
  const listor = () => (ram.listor ?? []).flatMap((l, i, alla) => {
    const stodKolumn = laskortKolumn(l);
    if (stodKolumn !== undefined) return laskortBarn(l, stodKolumn);
    const ettKort = arEttKort(alla, l);
    return elevlista({ ...l, rubrik: !o.stor && l.rubrik && !namngerRamen(l.rubrik) ? `${l.rubrik} · ${ram.rubrik}` : l.rubrik }, { storlek: ettKort ? 40 : storlek, luft: ettKort, hallIhopEfter: o.stor ? i === alla.length - 1 : i < alla.length - 1, brak: o.brak, elev: o.elev && !l.larare });
  });
  // Berättartärningarna (src/lib/sagoblad.ts, tarningTabell): lärarens ruta först, sedan varje tärning på ett eget A4 med
  // smal marginal, som ett kors att klippa, vika och limma, både i beskrivningen och i planeringsmallarna.
  if ((ram.listor ?? []).some((l) => arTarning({ kort: o.kort }, l))) {
    ut.push(...noter(), stycke(SAGO_UPPHOV, { farg: FARG.svag, storlek: 18 }));
    for (const l of ram.listor ?? []) {
      if (!arTarning({ kort: o.kort }, l)) { ut.push(...elevlista(l, { storlek, brak: o.brak, elev: o.elev && !l.larare })); continue; }
      ut.push(new Sektionsbyte(true), ...tarningRubrik(l.rubrik), tarningTabell(tarningAv(l, ram, { kort: o.kort })), new Sektionsbyte(false));
    }
    return ut;
  }
  // Ljudlekens kort och kartan (src/lib/ljudkort.ts): lärarens ruta först, sedan varje ark i en egen sektion med smal
  // marginal, som i riggens kompendium, både i beskrivningen och i planeringsmallarna.
  if ((ram.listor ?? []).some((l) => ljudform({ kort: o.kort }, l))) {
    ut.push(...noter());
    // Upphovet för bildbankens bilder står en gång i ramen med bilderna, före arken, så att det följer med både filen med
    // allt och planeringsmallarna (MIT-licensen kräver det i kopiorna).
    const former = new Set((ram.listor ?? []).map((l) => ljudform({ kort: o.kort }, l)));
    const med = [former.has('bildkort') && 'bildkorten', former.has('bokstavskarta') && 'bokstavskartan'].filter(Boolean);
    if (med.length) ut.push(stycke(`Bilderna på ${med.join(' och ')}: Fluent Emoji, © Microsoft Corporation, MIT-licens.`, { farg: FARG.svag, storlek: 18 }));
    for (const l of ram.listor ?? []) {
      const form = ljudform({ kort: o.kort }, l);
      if (!form) { ut.push(...elevlista(l, { storlek, brak: o.brak, elev: o.elev && !l.larare })); continue; }
      ut.push(new Sektionsbyte(true), ...ljudBarn(l, form), new Sektionsbyte(false));
    }
    return ut;
  }
  // Läskorten står var och en på en egen sida, så lärarens noter om dem står först, också i elevkopian.
  if ((ram.listor ?? []).some((l) => laskortKolumn(l) !== undefined)) {
    ut.push(...noter(), ...huvud(), ...listor());
    return ut;
  }
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
      ut.push(medElevtypsnitt(!!o.elev, () => kortlista(info, o.brak)), avstand());
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
  // Lärarens protokoll (Lästrappan före och efter, bråkkursens kartläggning) fylls i av läraren: noten om hur står först
  // också i elevkopian, som på sidan. Sist hamnade den ensam på en egen sida när protokollet fyllde sin (K-071).
  const protokoll = !!ram.listor?.length && ram.listor.every(arProtokoll);
  // Ryms inte noten och listorna på ett A4 står noten (frågorna) på en sida och huvudet med listorna på nästa, så att
  // sidan med tabellerna går att kopiera per elev (src/lib/ramform.ts).
  const delas = protokoll && protokollDelas(ram) ? [new Paragraph({ pageBreakBefore: true, spacing: { before: 0, after: 0 } })] : [];
  if (ram.listor) ut.push(...(o.stor && !protokoll ? [...huvud(), ...listor(), ...noter()] : [...noter(), ...delas, ...huvud(), ...listor()]));
  else ut.push(...noter());
  return ut;
}
// Läskort (K-063): en lästräningstext som två kort att ha på bordet, ett halvt A4 vardera på en egen sida, med streckad
// kant att klippa längs. Överst kortet med stöd, där varje mening är en bild med en båge under varje ordgrupp
// (lasflyt.ts; Word ritar SVG sedan 2016, och reservbilden är samma bild som PNG, svgRun), och underst kortet utan stöd i
// vanlig text. Märkningen litet och grått, titeln i 20 pt och meningarna i 18 pt Arial, som i metodriggen.
// Varje bild har meningen som alternativtext, så att den går att läsa upp, och ett eget id i dokumentet.
let bagBildNr = 0;
function bagBild(text: string, breddTwips: number): Paragraph {
  const { svg, bredd, hojd } = bagSvg(text, { bredd: breddTwips / 20, storlek: 17, radfaktor: 1.6, typsnitt: 'Andika' });
  const px = (pt: number) => Math.round((pt * 4) / 3);
  const altText = { name: `Mening med bågar ${++bagBildNr}`, description: utanStod(text), id: String(1000 + bagBildNr) };
  return new Paragraph({ spacing: { after: 60 }, children: [svgRun(new TextEncoder().encode(svg), px(bredd), px(hojd), altText)] });
}
// Läskorten står i elevens typsnitt (K-130): kortet med stöd är en bild där orden är Andikas konturer och bågarna ligger
// efter Andikas bredder (src/lib/lasflyt.ts, som riggen), så att det ser likadant ut var filen än öppnas, och kortet utan
// stöd står i det inbäddade typsnittet. Texten är 17 pt med exakt radavstånd, som riggens, så att båda korten ryms på
// samma A4 också med den längsta texten (metodprovet prövar det i Word). Samma på sidan (Laskort.astro).
function laskortBarn(l: { rubrik?: string; kolumner?: string[]; rader: string[][] }, stodKolumn: number): Barn[] {
  const { nr, titel } = laskortRubrik(l);
  const marg = { top: 240, bottom: 200, left: 300, right: 300 };
  const inre = BREDD - marg.left - marg.right;
  const streckad = { style: BorderStyle.DASHED, size: 6, color: '777777' };
  const kort = (stod: boolean): Barn[] => [
    new Paragraph({ spacing: { after: 100 }, children: [textRun({ text: `Lästräningstext ${nr ? `${nr} · ` : ''}${stod ? 'med stöd' : 'utan stöd'}`, size: 15, color: FARG.svag })] }),
    new Paragraph({ spacing: { after: 200 }, children: [textRun({ text: titel, bold: true, size: 40, font: ELEVTYPSNITT, color: '1F2937' })] }),
    ...l.rader.map((r) => String(r[stod ? stodKolumn : 1 - stodKolumn] ?? '')).map((t) => (stod
      ? bagBild(t, inre)
      : new Paragraph({ spacing: { after: 80, ...radHojd(500, storl(34) ?? 34, ELEVTYPSNITT) }, children: [textRun({ text: t, size: 34, font: ELEVTYPSNITT, color: '1F2937' })] }))),
  ];
  return [
    new Paragraph({ pageBreakBefore: true, spacing: { before: 0, after: 0 } }),
    new Table({ width: { size: BREDD, type: WidthType.DXA }, columnWidths: [BREDD], layout: TableLayoutType.FIXED, rows: [true, false].map((stod) => new TableRow({ cantSplit: true, height: { value: 6000, rule: HeightRule.ATLEAST }, children: [new TableCell({ width: { size: BREDD, type: WidthType.DXA }, borders: { top: streckad, bottom: streckad, left: streckad, right: streckad }, margins: marg, children: kort(stod) })] })) }),
  ];
}

// Ljudlekens kort i Word (Ljudlek i grupp, 2026-09-29), portade från metodriggens build/build-docx.js så att sajten
// och riggens kompendium ritar likadant. Reglerna för när en lista blir vilken form står i src/lib/ljudkort.ts.
const KORTMARGINAL = 567; // 1 cm
const BREDD_KORTARK = A4.width - 2 * KORTMARGINAL;
const STRECKAD: IBorderOptions = { style: BorderStyle.DASHED, size: 6, color: '777777' };
// Viklinjen ska synas olik klipplinjen också på armslängds håll och i svartvitt: större prickar, i blått.
const VIKLINJE: IBorderOptions = { style: BorderStyle.DOTTED, size: 14, color: FARG.huvud };
const INGEN: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const px = (cm: number) => Math.round((cm / 2.54) * 96);
let ljudBildNr = 0;
function bildRun(sokvag: string, storlek: number, namn: string, hojd = storlek): ImageRun {
  const data = RESURSER.bilder.get(sokvag);
  if (!data) throw new Error(`Bilden ${sokvag} saknas i Word-filens resurser (src/lib/ljudkort.ts, metodensBilder).`);
  return svgRun(data, storlek, hojd, { name: `Bild ${++ljudBildNr}`, description: namn, id: String(3000 + ljudBildNr) });
}
const elevRun = (text: string, size: number, farg = FARG.text) => new TextRun({ text, size, color: farg, font: ELEVTYPSNITT });
// Arkets rubrik och, för vikkorten, raden om klipp och vik: små, så att arket får plats på sidan.
function arkRubrik(text: string | undefined, vik: boolean): Paragraph[] {
  const ut: Paragraph[] = [];
  if (text) ut.push(new Paragraph({ keepNext: true, spacing: { before: 0, after: 40 }, heading: HeadingLevel.HEADING_4, children: [textRun({ text, bold: true, size: 15, color: FARG.huvud, allCaps: true })] }));
  if (vik) ut.push(new Paragraph({ keepNext: true, spacing: { before: 0, after: 80 }, children: [textRun({ text: VIK_TEXT, size: 16, color: FARG.svag })] }));
  return ut;
}
function ljudBarn(l: { rubrik?: string; rader: string[][] }, form: NonNullable<ReturnType<typeof ljudform>>): Barn[] {
  const kort = kortCeller(l);
  if (form === 'bildkort') return [...arkRubrik(l.rubrik, true), vikkortTabell(kort)];
  if (form === 'bokstavskort') return [...arkRubrik(l.rubrik, false), bokstavskortTabell(kort)];
  if (form === 'bokstavskarta') return [...arkRubrik(l.rubrik, false), bokstavskartaTabell(kartCeller(l))];
  return golvbokstaverBarn(kort);
}
// Ordet på vikkortet med en prick under varje ljud, eller en båge under varje del: två stycken med ett centrerat
// tabbstopp mitt i varje enhets bredd, enheterna i det övre och prickarna eller bågarna i det undre, så att pricken
// hamnar under sin bokstav. Inga celler: Google Dokument gör en rad med en tabell i en cell högre än radens fasta höjd,
// och vikkortens åttonde rad hamnade på en ny sida (K-138: inre tabell 3,42 cm i Google mot 3,2 cm, två stycken med
// tabbstopp 3,2 cm, och prickarna under bokstäverna i både Word och Google). Smala bokstäver har en minsta bredd, så att
// prickarna under i, l och j inte klumpar ihop sig, och texten krymper med ordets bredd (28 pt när ordet ryms). `inre`
// är cellens bredd innanför marginalerna; ordet får 80 twips mindre, som marginal.
const BOKSTAVSBREDD = (c: string): number => (c.length > 1 ? [...c].reduce((a, x) => a + BOKSTAVSBREDD(x), 0) + 0.3 : /[mw]/.test(c) ? 1.45 : /[ilj]/.test(c) ? 0.78 : /[tfr]/.test(c) ? 0.82 : 1);
function ordMedPrickar(ord: string, inre: number, delar: boolean): Paragraph[] {
  const enheter = ljudenheter(ord, delar);
  // Dubbelteckning och ck står i sin naturliga bredd med en prick; r, t och f behöver 0,8 (ekorre, riggen).
  const naturlig = (x: string) => (/[mw]/.test(x) ? 1.45 : /[ilj]/.test(x) ? 0.55 : /[tfr]/.test(x) ? 0.8 : 1);
  const bredd = (c: string) => (delar ? BOKSTAVSBREDD(c) : c.length > 1 ? [...c].reduce((a, x) => a + naturlig(x), 0) : BOKSTAVSBREDD(c));
  const enhet = Math.min(300, Math.floor((inre - 80) / enheter.reduce((a, c) => a + bredd(c), 0)));
  const ordSize = Math.max(delar ? 20 : 28, Math.round(((56 * enhet) / 300) * (delar && enheter.some((x) => x.length > 1) ? 0.82 : 0.92)));
  const prickSize = Math.max(24, Math.round((40 * enhet) / 300));
  const bredder = enheter.map((c) => Math.round(bredd(c) * enhet));
  // Ordet står mitt i cellen; varje enhets tabbstopp är mitt i dess bredd, räknat från cellens vänstra innerkant.
  const start = Math.round((inre - bredder.reduce((a, x) => a + x, 0)) / 2);
  const stopp = bredder.map((w, i) => ({ type: TabStopType.CENTER, position: start + bredder.slice(0, i).reduce((a, x) => a + x, 0) + Math.round(w / 2) }));
  // Tabben står i samma typsnitt och storlek som enheten, så att raden inte blir högre.
  const rad = (delarna: { run: TextRun | ImageRun; storlek: number }[], fore = 0) => new Paragraph({
    tabStops: stopp, spacing: { before: fore, after: 0, line: 240 },
    children: delarna.flatMap((d) => [new TextRun({ children: [new Tab()], size: d.storlek, font: ELEVTYPSNITT }), d.run]),
  });
  // Bågen under en del: en liten svg-bild, 80 procent av delens bredd.
  const bage = (w: number): ImageRun => {
    const bw = Math.max(12, Math.round((w * 0.8) / 15));
    const bh = Math.max(6, Math.round(bw * 0.28));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}" viewBox="0 0 100 28"><path d="M6 5 Q50 30 94 5" stroke="#${FARG.text}" stroke-width="7" fill="none" stroke-linecap="round"/></svg>`;
    return svgRun(new TextEncoder().encode(svg), bw, bh, { name: `Båge ${++ljudBildNr}`, description: 'en del', id: String(3000 + ljudBildNr) });
  };
  return [
    rad(enheter.map((c) => ({ run: elevRun(c, ordSize), storlek: ordSize }))),
    delar ? rad(bredder.map((w) => ({ run: bage(w), storlek: 2 })), 40) : rad(enheter.map(() => ({ run: elevRun('•', prickSize), storlek: prickSize }))),
  ];
}
// Vikkort: bilden till vänster och ordet till höger, streckad kant att klippa och en blå prickad viklinje. Arket står två
// gånger på sidan, så att en utskrift räcker till två par: tre kort i bredd och åtta rader, varje halva 3,2 × 3,2 cm.
function vikkortTabell(kort: string[]): Table {
  const perRad = 3;
  const halva = Math.floor(BREDD_KORTARK / (perRad * 2));
  const hojd = Math.round(3.2 * CM);
  const alla = [...kort, ...kort];
  const delar = arDelark(kort);
  const mar = { top: 60, bottom: 60, left: 80, right: 80 };
  const rader: TableRow[] = [];
  for (let i = 0; i < alla.length; i += perRad) {
    const rad = alla.slice(i, i + perRad);
    rader.push(new TableRow({ cantSplit: true, height: { value: hojd, rule: HeightRule.EXACT }, children: Array.from({ length: perRad }, (_, j) => rad[j]).flatMap((k) => (k === undefined
      ? [0, 1].map(() => new TableCell({ width: { size: halva, type: WidthType.DXA }, borders: runt(INGEN), children: [new Paragraph({})] }))
      : [
        new TableCell({
          width: { size: halva, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { top: STRECKAD, bottom: STRECKAD, left: STRECKAD, right: VIKLINJE }, margins: mar,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [bildRun(bildForKort(k), px(2.4), k.replace(/[-\u2060]/g, ''))] })],
        }),
        new TableCell({
          width: { size: halva, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: { top: STRECKAD, bottom: STRECKAD, left: VIKLINJE, right: STRECKAD }, margins: mar,
          children: ordMedPrickar(k, halva - mar.left - mar.right, delar),
        }),
      ])) }));
  }
  return new Table({ width: { size: halva * perRad * 2, type: WidthType.DXA }, columnWidths: Array(perRad * 2).fill(halva), layout: TableLayoutType.FIXED, borders: UTAN_KANTER, rows: rader });
}
// Bokstavskort: en bokstav i 96 pt i elevens typsnitt, ett restkort eller stavelsekort med två eller tre bokstäver mindre.
// Fyra kort i bredd och sex rader, alla 24 på ett A4, cirka 4,7 × 4,4 cm med streckad kant och ingen skrivlinje.
function bokstavskortTabell(kort: string[]): Table {
  const langst = Math.max(...kort.map((k) => [...k].length));
  const storlek = langst <= 1 ? 192 : langst === 2 ? 144 : 104;
  const perRad = 4;
  const w = Math.floor(BREDD_KORTARK / perRad);
  const hojd = Math.round(4.4 * CM);
  const rader: TableRow[] = [];
  for (let i = 0; i < kort.length; i += perRad) {
    const rad = kort.slice(i, i + perRad);
    rader.push(new TableRow({ cantSplit: true, height: { value: hojd, rule: HeightRule.EXACT }, children: Array.from({ length: perRad }, (_, j) => rad[j]).map((k) => new TableCell({
      width: { size: w, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders: runt(k === undefined ? INGEN : STRECKAD), margins: { top: 0, bottom: 0, left: 80, right: 80 },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, ...radHojd(2200, storlek, ELEVTYPSNITT) }, children: k === undefined ? [] : [elevRun(k, storlek)] })],
    })) }));
  }
  return new Table({ width: { size: w * perRad, type: WidthType.DXA }, columnWidths: Array(perRad).fill(w), layout: TableLayoutType.FIXED, borders: UTAN_KANTER, rows: rader });
}
// Golvbokstäver: en bokstav per sida i 560 pt, så att en gemen är cirka 10–15 cm hög och eleven kan kliva på den. Ingen
// linje. En tydlig pil nederst visar vad som är upp, så att n inte blir u och d inte blir p när arket läggs på golvet; för
// b, d, p och q avgör den bokstaven (läsbarheten 2026-09-29: den lilla grå pilen syntes knappt).
// Inget avstånd före: alla bokstäver står på samma höjd på sidan (riggen). Bokstaven är 512 pt, Google Dokuments
// största storlek (560 pt blev 512 i Google), och pilen står i Arial, som Google annars tar när Calibri saknar ↑, så
// att bokstaven och pilen är lika i båda (K-138).
const GOLVSTORLEK = 1024;
function golvbokstaverBarn(kort: string[]): Barn[] {
  return kort.flatMap((k, i) => [
    new Paragraph({ pageBreakBefore: i > 0, alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, ...radHojd(12900, GOLVSTORLEK, ELEVTYPSNITT) }, children: [elevRun(k, GOLVSTORLEK)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 800, after: 0, ...radHojd(1000, 88, 'Arial') }, children: [new TextRun({ text: '↑', size: 88, bold: true, color: FARG.text, font: 'Arial' })] }),
  ]);
}
// Bokstavskartan: alfabetet på ett A4, fem i bredd, med stor och liten bokstav, bilden och ordet under. En bokstav utan
// bild har sin förklaring i bildens ställe. Tunna heldragna linjer: kartan är ett blad, inte kort att klippa.
function bokstavskartaTabell(celler: KartCell[]): Table {
  const perRad = 5;
  const w = Math.floor(BREDD_KORTARK / perRad);
  const hojd = Math.round(4.3 * CM);
  const linje: IBorderOptions = { style: BorderStyle.SINGLE, size: 4, color: '777777' };
  const rader: TableRow[] = [];
  for (let i = 0; i < celler.length; i += perRad) {
    const rad = celler.slice(i, i + perRad);
    rader.push(new TableRow({ cantSplit: true, height: { value: hojd, rule: HeightRule.EXACT }, children: Array.from({ length: perRad }, (_, j) => rad[j]).map((c) => new TableCell({
      width: { size: w, type: WidthType.DXA }, verticalAlign: VerticalAlign.TOP, borders: runt(c ? linje : INGEN), margins: { top: 60, bottom: 40, left: 60, right: 60 },
      children: !c ? [new Paragraph({})] : [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40, ...radHojd(760, 64, ELEVTYPSNITT) }, children: [elevRun(`${c.bokstav.toLocaleUpperCase('sv')}${c.bokstav}`, 64)] }),
        ...(c.bild
          ? [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 20 }, children: [bildRun(c.bild, px(1.9), c.ord)] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, ...radHojd(340, 26, ELEVTYPSNITT) }, children: [elevRun(c.ord, 26)] }),
          ]
          // Utan bild (q, w, x): lika mycket luft som bilden, så att bokstaven och ordet står i linje med grannarnas.
          : [
            luft(Math.round(1.9 * CM), false, { efter: 20 }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, ...radHojd(340, 26, ELEVTYPSNITT) }, children: [elevRun(c.ord, 26, FARG.svag)] }),
          ]),
      ],
    })) }));
  }
  return new Table({ width: { size: w * perRad, type: WidthType.DXA }, columnWidths: Array(perRad).fill(w), layout: TableLayoutType.FIXED, borders: UTAN_KANTER, rows: rader });
}
function bildForKort(k: string): string {
  const b = bildForOrd(k);
  if (!b) throw new Error(`Ordet "${k}" har ingen bild i bildbanken.`);
  return b;
}

// Diplomet: en inramad sida, centrerad, med skrivlinjer där texten är understreck.
function diplomBarn(dip: NonNullable<MetodData['diplom']>): Barn[] {
  const linje = '________________________________________';
  const barn: Paragraph[] = [];
  if (dip.kicker) barn.push(new Paragraph({ children: [textRun({ text: dip.kicker, font: 'Consolas', size: 20, allCaps: true, color: FARG.svag })], alignment: AlignmentType.CENTER, spacing: { before: 600, after: 240 } }));
  barn.push(new Paragraph({ children: [run(dip.rubrik, { fet: true, farg: FARG.huvud, storlek: 72 })], alignment: AlignmentType.CENTER, spacing: { after: 480 } }));
  for (const t of dip.text) {
    barn.push(/^_{3,}$/.test(t)
      ? new Paragraph({ children: [run(linje, { farg: FARG.svag, storlek: 28 })], alignment: AlignmentType.CENTER, spacing: { before: 120, after: 360 } })
      : new Paragraph({ children: [run(t, { storlek: 26, kursiv: /[.!]$/.test(t) })], alignment: AlignmentType.CENTER, spacing: { after: 240 } }));
  }
  if (dip.underskrifter.length) barn.push(new Paragraph({ children: dip.underskrifter.map((u, i) => run(`${i > 0 ? '        ' : ''}${u} ____________________`, { storlek: 22, farg: FARG.svag })), alignment: AlignmentType.CENTER, spacing: { before: 600, after: 600 } }));
  // Den dubbla ramen är två enkla (dubbelRam, K-157), så att Google Dokument ritar den dubbel som Word; den inre cellens
  // marginal är 30 twips mindre åt sidorna, så att texten står där den stod, och 375 upptill och nedtill (hela bildpunkter).
  const kant = { style: BorderStyle.SINGLE, size: 12, color: FARG.huvud } as const;
  return [dubbelRam(BREDD, kant, (inre) => new Table({ width: { size: inre, type: WidthType.DXA }, columnWidths: [inre], layout: TableLayoutType.FIXED, rows: [new TableRow({ children: [new TableCell({
    width: { size: inre, type: WidthType.DXA },
    borders: runt(kant),
    margins: { top: 375, bottom: 375, left: 600 - DUBBEL_GLAPP, right: 600 - DUBBEL_GLAPP },
    children: barn,
  })] })] })), avstand()];
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
function passTabell(p: NonNullable<ReturnType<typeof passOversikt>>, antalSteg: number, ord: PassOrd): Barn[] {
  const bredder = [1900, 3900, BREDD - 5800];
  // Rubrikraden, Före passet och första fasen hänger ihop, så att tabellen inte börjar med två rader ensamma sist på en sida.
  const huvud = rad([ord.fas, ord.rutin(antalSteg), 'Så leder du det'].map((k, i) => cell([stycke(k, { fet: true, farg: FARG.vit, storlek: 20, efter: 0, hallIhop: true })], { bredd: bredder[i], fyll: FARG.huvud, kanter: runt(kant(FARG.huvud)) })),{ huvud: true });
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

// Faktarutan: samma uppgifter som på sidan, så att Word-filen står för sig själv. En lektion i en serie säger vilken
// serie och förmåga den hör till, och den generella metoden hur många lektioner banken har (src/lib/serie.ts).
function faktaTabell(d: MetodData, serie?: SerieKoppling): Barn[] {
  // Två korta uppgifter per rad och de långa (Hör till, Material) över hela bredden, sist, som i sidans utskrift
  // (global.css): tabellen blir hälften så hög, och huvudfilmens stillbilder ryms på sidan 1 också när Material är
  // långt (Bråkkurs i grupp, 2026-09-30).
  const korta: [string, string][] = [];
  const langa: [string, string][] = [];
  if (serie?.lektion) langa.push(['Hör till', `${serie.serie.titel}, förmåga\u00a0${serie.lektion.formaga}\u00a0av\u00a0${serie.serie.formagor.length}: ${serie.formaga?.namn ?? ''}`]);
  korta.push(['Område', d.omrade], ['Årskurs', arskursText(d)]);
  if (d.format.length) korta.push(['Format', d.format.join(', ')]);
  if (d.tid) korta.push(['Tid', d.tid]);
  if (d.period) korta.push(['Period', d.period]);
  if (d.grupp) korta.push(['Grupp', d.grupp]);
  if (serie && !serie.lektion && serie.serie.lektioner.length) korta.push(['Lektioner', `${serie.serie.lektioner.length === 1 ? 'En' : serie.serie.lektioner.length} i lektionsbanken`]);
  if (d.uppdaterad) korta.push(['Uppdaterad', datumText(d.uppdaterad)]);
  // Materialet är egenskaper på en rad, som på sidan, och resten står under metodens material eller i lathunden.
  if (d.material.length) langa.push(['Material', `${d.material.join(', ')}${d.ramar ? ` · allt material under ${d.ramar.rubrik}` : d.lathund ? ' · allt material i lathunden' : ''}`]);
  const etikett = 1500;
  const halv = Math.floor(BREDD / 2);
  const bredder = [etikett, halv - etikett, etikett, BREDD - halv - etikett];
  const namn = (t: string) => cell([stycke(t, { fet: true, storlek: 19, efter: 0 })], { bredd: etikett, fyll: FARG.ljus, tat: true });
  const varde = (t: string, bredd: number, span?: number) => cell([stycke(t, { storlek: 19, efter: 0 })], { bredd, span, tat: true });
  const rader: TableRow[] = [];
  const hel = ([e, v]: [string, string]) => rad([namn(e), varde(v, BREDD - etikett, 3)]);
  if (serie?.lektion) rader.push(hel(langa.shift()!));
  for (let i = 0; i < korta.length; i += 2) {
    const [x, y] = [korta[i], korta[i + 1]];
    rader.push(rad(y ? [namn(x[0]), varde(x[1], bredder[1]), namn(y[0]), varde(y[1], bredder[3])] : [namn(x[0]), varde(x[1], BREDD - etikett, 3)]));
  }
  for (const l of langa) rader.push(hel(l));
  return [tabell(rader, bredder), avstand()];
}

// Under materialet i en metod med Ljudlekens kort: en rad om elevens typsnitt, Andika, som läraren kan använda till egna kort,
// som på sidan (Metod.astro). Bildernas upphov står i ramen med bilderna (ramBarn).
function ljudRader(d: MetodData): Paragraph[] {
  const ut: Paragraph[] = [];
  if (harElevtypsnitt(d)) {
    const namnt = (d.ramar?.text ?? []).some((s) => s.includes('Andika'));
    const adress = ANDIKA_ADRESS.replace(/^https:\/\//, '').replace(/\/$/, '');
    ut.push(stycke(`${namnt ? 'Ladda ner Andika' : 'Elevens material står i Andika, ett gratis typsnitt från SIL som är gjort för att vara lätt att läsa. Ladda ner det'} på ${adress} och använd det när du gör egna kort och blad.`, { farg: FARG.svag }));
  }
  return ut;
}

// Lektionsbanken i den generella metoden (Ljudlek i grupp): förmågorna i ordning med lektionerna och vad eleven tränar,
// byggd ur lektionerna, som på sidan (Lektionsbank.astro). En förmåga utan lektion står kvar.
function lektionsbankBarn(serie: SerieKoppling['serie']): Barn[] {
  const bredder = [2300, 4200, BREDD - 6500];
  const ut: Barn[] = [h2(serie.rubrik)];
  if (serie.text) ut.push(stycke(serie.text, { hallIhop: true }));
  const rader = serie.formagor.map((f) => [`${f.nr} · ${f.namn}`, f.lektioner.map((l) => `${l.namn}: ${l.tranar}`).join('\n') || 'Ingen lektion ännu', f.skal ?? '']);
  ut.push(...rubrikTabell(['Förmåga', 'Lektionerna och vad eleven tränar', 'Skälet till platsen'], rader, bredder, { radrubrik: false }));
  if (serie.not) ut.push(...ruta('', serie.not));
  return ut;
}

// En films fyra stillbilder (src/lib/film.ts): rubriken, ingressen och bilderna två och två i en tabell utan ramar, med
// numret och texten under varje bild, som i metodriggens Word-fil. Blocket hålls ihop, så att det står helt på en sida.
// Huvudfilmens står på första sidan, en extrafilms vid sitt moment, på samma platser som på sidan och i utskriften.
const STILLBILD_CM = 7.75;
function filmBarn(f: MetodFilm): Barn[] {
  const film = f.film;
  const bilder = stillbilder(f);
  const halv = Math.floor(BREDD / 2);
  const bredd = px(STILLBILD_CM);
  const hojd = Math.round((bredd * STILLBILD_MATT.hojd) / STILLBILD_MATT.bredd);
  const cellFor = (i: number, sistaRaden: boolean) => new TableCell({
    width: { size: halv, type: WidthType.DXA }, borders: runt(INGEN_KANT), margins: { top: 40, bottom: sistaRaden ? 0 : 120, left: 40, right: 40 },
    children: [
      new Paragraph({ keepNext: true, spacing: { before: 0, after: 40 }, children: [bildRun(bilder[i], bredd, film.stillbilder[i].text, hojd)] }),
      new Paragraph({ keepNext: !sistaRaden, spacing: { before: 0, after: 0 }, children: [run(`${i + 1} · `, { fet: true, storlek: 19, farg: FARG.huvud }), run(film.stillbilder[i].text, { storlek: 19 })] }),
    ],
  });
  return [
    stycke(film.rubrik, { fet: true, farg: FARG.huvud, storlek: 24, fore: 120, efter: 40, hallIhop: true }),
    stycke(film.ingress, { storlek: 19, farg: FARG.svag, efter: 100, hallIhop: true }),
    new Table({
      width: { size: halv * 2, type: WidthType.DXA }, columnWidths: [halv, halv], layout: TableLayoutType.FIXED, borders: UTAN_KANTER,
      rows: [0, 2].map((i) => new TableRow({ cantSplit: true, children: [cellFor(i, i === 2), cellFor(i + 1, i === 2)] })),
    }),
    avstand(160),
  ];
}

// Hela metoden i den ordning modellen har.
function metodBarn(post: MetodPostISerie, bas: string): Flod {
  const d = post.data;
  const ut: Flod = [];
  ut.push(new Paragraph({ children: [run(d.titel)], heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 60 } }));
  if (d.undertitel) ut.push(stycke(d.undertitel, { kursiv: true, farg: FARG.huvud, storlek: 24, efter: 80 }));
  ut.push(stycke(metaRad(d), { farg: FARG.svag, storlek: 20, efter: 200 }));
  ut.push(stycke(d.ingress, { storlek: 24, efter: 160 }));
  // Faktatabellen först och sedan huvudfilmens stillbilder, före inledningen, som på sidan (Niclas 2026-09-30: inforutan
  // först och sedan vad eleven gör). Så står bilderna på första sidan ("på s. 1 alltid"); efter inledningen, som i
  // riggens Word-fil, hamnade de på sidan 2, eftersom sajtens första sida också har faktatabellen.
  ut.push(...faktaTabell(d, post.serie));
  const filmer = metodensFilmer(d, post.id);
  const huvud = huvudfilm(filmer);
  if (huvud) ut.push(...filmBarn(huvud));
  // Extrafilmerna på samma platser som på sidan (Metod.astro): sist i ett avsnitt, efter en fri tabell eller en ram, efter
  // ett steg eller efter ett stycke.
  const filmVid = (...platser: FilmPlats[]) => { for (const p of platser) for (const f of filmerVid(filmer, p)) ut.push(...filmBarn(f)); };
  d.inledning.forEach((s, i) => { ut.push(stycke(s)); filmVid({ stycke: i + 1 }); });
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
    filmVid({ tabell: t.rubrik });
  };
  for (const t of d.tabeller.filter((x) => x.plats === 'efter-inledning')) friTabell(t);
  const pass = passOversikt(d);
  if (pass && d.passrutin) {
    ut.push(h2(pass.rubrik));
    if (d.passrutin.text) ut.push(stycke(d.passrutin.text, { hallIhop: true }));
    if (pass.text) ut.push(stycke(pass.text, { hallIhop: true }));
    ut.push(...passRemsa(pass));
    ut.push(...passTabell(pass, stegTexter(d).length, passOrd(d)));
    if (pass.efterTabell) ut.push(stycke(pass.efterTabell, { farg: FARG.svag }));
    filmVid({ avsnitt: 'passrutin' }, { avsnitt: 'tidsschema' });
  } else if (d.passrutin) {
    ut.push(h2(d.passrutin.rubrik));
    if (d.passrutin.text) ut.push(stycke(d.passrutin.text, { hallIhop: true }));
    ut.push(...rutinRuta(stegTexter(d)));
    if (d.passrutin.efter) ut.push(stycke(d.passrutin.efter, { farg: FARG.svag }));
    filmVid({ avsnitt: 'passrutin' });
  }
  if (d.tidsschema && !pass) {
    ut.push(h2(d.tidsschema.rubrik));
    if (d.tidsschema.text) ut.push(stycke(d.tidsschema.text, { hallIhop: true }));
    ut.push(...rubrikTabell(['Tid', 'Fas', 'Vad händer'], d.tidsschema.rader.map((r) => [r.tid, r.fas, r.vad]), [1700, 2200, BREDD - 3900], { fetAndra: true }));
    if (d.tidsschema.efter) ut.push(stycke(d.tidsschema.efter, { farg: FARG.svag }));
    filmVid({ avsnitt: 'tidsschema' });
  }
  for (const t of d.tabeller.filter((x) => x.plats === 'efter-tidsschema')) friTabell(t);
  if (d.steg) {
    ut.push(h2(d.steg.rubrik));
    if (d.steg.text) ut.push(stycke(d.steg.text, { hallIhop: true }));
    for (const [fran, till] of stegDelar(d.steg.rader.length, filmer)) {
      ut.push(...stegTabell(d.steg, passOrd(d).steg, fran, till));
      filmVid({ steg: till });
    }
    filmVid({ avsnitt: 'steg' });
  }
  for (const t of d.tabeller.filter((x) => x.plats === 'efter-steg')) friTabell(t);
  if (d.arbetsform) {
    ut.push(h2(d.arbetsform.rubrik));
    ut.push(stycke(d.arbetsform.text, { hallIhop: pass ? false : true }));
    if (!(pass && pass.delar.length)) ut.push(...band(d.arbetsform.delar));
    filmVid({ avsnitt: 'arbetsform' });
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
    filmVid({ avsnitt: 'exempel' });
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
    filmVid({ avsnitt: 'fastnar' });
  }
  for (const t of d.tabeller.filter((x) => x.plats === 'efter-fastnar')) friTabell(t);
  if (d.roll) {
    ut.push(h2(d.roll.rubrik));
    ut.push(stycke(d.roll.text, { hallIhop: true }));
    ut.push(...gorUndvik(d.roll.gor, d.roll.undvik));
    filmVid({ avsnitt: 'roll' });
  }
  if (d.urval) {
    ut.push(h2(d.urval.rubrik));
    for (const s of d.urval.text) ut.push(stycke(s));
    if (d.urval.kravText) ut.push(stycke(d.urval.kravText, { hallIhop: true }));
    ut.push(...band(d.urval.krav));
    filmVid({ avsnitt: 'urval' });
  }
  if (post.serie && !post.serie.lektion) ut.push(...lektionsbankBarn(post.serie.serie));
  for (const t of d.tabeller.filter((x) => x.plats === 'efter-urval')) friTabell(t);
  if (d.hem) {
    ut.push(h2(d.hem.rubrik));
    for (const s of d.hem.text) ut.push(stycke(s));
    if (d.hem.kontrakt) ut.push(...kontraktRuta(d.hem.kontrakt));
    if (d.hem.schema) ut.push(stycke(`${d.hem.schema.rubrik}: ${d.hem.schema.text ? `${d.hem.schema.text} ` : ''}Schemat med ${d.hem.schema.rader} rader att fylla i finns i planeringsmallarna.`, { farg: FARG.svag }));
    filmVid({ avsnitt: 'hem' });
  }
  if (d.progression) {
    ut.push(h2(d.progression.rubrik));
    if (d.progression.text) ut.push(stycke(d.progression.text, { hallIhop: true }));
    // En kort kursplan hålls på en sida; en lång får bryta, rubrikraden upprepas.
    ut.push(...rubrikTabell([d.progression.enhet, 'Fokus', 'Lärarens roll'], d.progression.rader.map((r) => [r.led ? `${r.vecka}\n${r.led}` : r.vecka, r.fokus, r.roll]), [1700, 4000, BREDD - 5700], { hallIhop: d.progression.rader.length <= 6 }));
    filmVid({ avsnitt: 'progression' });
  }
  if (d.uppfoljning) {
    ut.push(h2(d.uppfoljning.rubrik));
    if (d.uppfoljning.text) ut.push(stycke(d.uppfoljning.text, { hallIhop: true }));
    ut.push(...tvaKolumner(d.uppfoljning.rader));
    filmVid({ avsnitt: 'uppfoljning' });
  }
  if (d.mal) {
    ut.push(h2(d.mal.rubrik));
    ut.push(stycke(d.mal.text, { hallIhop: true }));
    ut.push(...bockar(d.mal.punkter, 2));
    filmVid({ avsnitt: 'mal' });
  }
  if (d.snabbmall) {
    ut.push(h2(d.snabbmall.rubrik));
    if (d.snabbmall.text) ut.push(stycke(d.snabbmall.text, { hallIhop: true }));
    ut.push(...snabbmallTabell(d.titel, d.snabbmall.fore, d.snabbmall.efter));
    filmVid({ avsnitt: 'snabbmall' });
  }
  if (d.checklista) {
    ut.push(h2(d.checklista.rubrik));
    ut.push(...bockar(d.checklista.punkter, 1));
    filmVid({ avsnitt: 'checklista' });
  }
  if (d.grund) {
    ut.push(h2(d.grund.rubrik));
    ut.push(...grundRuta(d.grund.text));
    if (d.grund.kallor) ut.push(stycke(d.grund.kallor, { farg: FARG.svag, storlek: 18 }));
    filmVid({ avsnitt: 'grund' });
  }
  for (const t of d.tabeller.filter((x) => x.plats === 'efter-grund')) friTabell(t);
  if (d.ramar) {
    ut.push(h2(d.ramar.rubrik));
    for (const s of d.ramar.text) ut.push(stycke(s));
    ut.push(...ljudRader(d));
    const boksidor = lastexter(d.ramar.ramar);
    const ramarna = d.ramar.ramar;
    for (const [i, ram] of ramarna.entries()) {
      // En lästext är en boksida på en egen sida, med titeln i boken i stället för en rubrik (boksida()).
      const lastext = boksidor.get(ram);
      if (lastext) {
        ut.push(bokbyte(lastext), ...boksida(lastext), new Sektionsbyte(false));
        filmVid({ ram: ram.rubrik });
        continue;
      }
      // Ett sagoblad (sagoform) står på en egen sida med rutan Till läraren i sidfoten (sagoFlod). Ramarnas rubriker och
      // texter för läraren står samlade före en följd av sagoblad, så att varje blad inte får en nästan tom sida framför
      // sig (Skrivkurs: sagoboken, 2026-10-02). Bokens blad har ingen sidfot, så deras ruta Till läraren står där också.
      if (ram.sagoform) {
        if (!ramarna[i - 1]?.sagoform) ut.push(...sagoLarartext(sagoFoljd(ramarna, i), d, (text) => new Paragraph({ children: [run(text)], heading: HeadingLevel.HEADING_3, keepNext: true, spacing: { before: 240, after: 80 } })));
        ut.push(...sagoFlod(ram, d));
        filmVid({ ram: ram.rubrik });
        continue;
      }
      ut.push(new Paragraph({ children: [run(ram.rubrik)], heading: HeadingLevel.HEADING_3, keepNext: true, spacing: { before: 240, after: 80 } }));
      if (ramArTom(ram)) {
        for (const s of ram.text) ut.push(stycke(s));
        ut.push(stycke(d.elevblad[ram.rubrik] ? `${ram.rubrik} finns som elevens blad i planeringsmallarna, med rutor att skriva och rita i.` : `Ramen att fylla i, med ${ram.delar.length === 1 ? 'en del' : `${ram.delar.length} delar`}, finns i planeringsmallarna.`, { farg: FARG.svag }));
      } else ut.push(...ramBarn(ram, { kort: d.kort, blad: d.elevblad[ram.rubrik], brak: d.omrade === 'Matematik', elev: harElevtypsnitt(d) }));
      filmVid({ ram: ram.rubrik });
    }
    if (d.ramar.efter) ut.push(stycke(d.ramar.efter, { farg: FARG.svag }));
    filmVid({ avsnitt: 'ramar' });
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
function mallBarn(post: MetodPost, bas: string, o: { baraTommaRamar?: boolean } = {}): { barn: Flod; liggande?: boolean }[] {
  const d = post.data;
  const sidor: Flod[] = [];
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
      // En checklista inför kursen (Skrivkurs: sagoboken) görs en gång, så den har inget passnummer.
      ...(/kursen/i.test(d.checklista.rubrik)
        ? [stycke('Bocka av före kursen. Det som inte är gjort görs innan kursen börjar.'), skrivrad(['Datum'])]
        : [stycke('Bocka av inför varje pass. Det som inte är gjort görs innan eleverna kommer.'), skrivrad(['Datum', 'Pass nr'])]),
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
      cell([new Paragraph({ children: [bockRun(42)], alignment: AlignmentType.CENTER, spacing: { after: 0 } })], { bredd: bredder[1], fyll: i % 2 === 1 ? FARG.rand : undefined, mitt: true }),
      cell([new Paragraph({ children: [bockRun(42)], alignment: AlignmentType.CENTER, spacing: { after: 0 } })], { bredd: bredder[2], fyll: i % 2 === 1 ? FARG.rand : undefined, mitt: true }),
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
  const bladsidor = new Set<Flod>();
  if (d.ramar) {
    const boksidor = lastexter(d.ramar.ramar);
    for (const [i, ram] of d.ramar.ramar.entries()) {
      const tom = ramArTom(ram);
      // En lästext är en boksida, som eleven läser (boksida()). Sidfoten och sidhuvudet bär upphovet, så sidan får ingen
      // upphovsrad. I filen med allt står den redan i beskrivningen.
      const lastext = boksidor.get(ram);
      if (lastext) {
        if (o.baraTommaRamar) continue;
        const sida: Flod = [bokbyte(lastext), ...boksida(lastext)];
        bladsidor.add(sida);
        sidor.push(sida);
        continue;
      }
      // Ett sagoblad står som det är, med upphovet i sidhuvudet. I filen med allt står det redan i beskrivningen.
      if (ram.sagoform) {
        if (o.baraTommaRamar) continue;
        // Före en följd av blad en sida med lärarens text till dem, som i filen med allt.
        if (!d.ramar.ramar[i - 1]?.sagoform) sidor.push([...under('Till läraren om bladen'), ...sagoLarartext(sagoFoljd(d.ramar.ramar, i), d, (text) => stycke(text, { fet: true, storlek: 24, efter: 40, hallIhop: true }))]);
        const sida = sagoFlod(ram, d);
        bladsidor.add(sida);
        sidor.push(sida);
        continue;
      }
      // Elevens blad (screeningen och ljudkollen i Ljudlek i grupp): bladet eleven har framför sig står för sig, med bara
      // det eleven läser, och lärarens text på ett eget blad efter i planeringsmallarna. I filen med allt står lärarens
      // text redan i beskrivningen, så där kommer bara bladet (Niclas 2026-09-29: screeningen på exakt två A4, med bara
      // elevarbetet framför eleven).
      if (arElevensBlad(ram)) {
        const blad = elevensBladSida(ram, d);
        bladsidor.add(blad);
        sidor.push(blad);
        const paBladet = new Set(muntligaNivaer(ram));
        const lararDelar = ram.delar.map((del) => ({ ...del, falt: del.falt.filter((f) => !paBladet.has(f)) })).filter((del) => del.falt.length);
        if (!o.baraTommaRamar) sidor.push([...under(`${ram.rubrik.replace(/,\s*elevens blad$/i, '')}: till läraren`), ...ram.text.map((t) => stycke(t)), ...ramBarn({ ...ram, delar: lararDelar, listor: undefined, huvud: undefined, text: [] }, { stor: true, elev: false })]);
        continue;
      }
      if (o.baraTommaRamar && !tom) continue;
      const sida: Flod = [...under(ram.rubrik), ...ramBarn(ram, { skrivrum: tom, stor: true, kort: d.kort, blad: d.elevblad[ram.rubrik], brak: d.omrade === 'Matematik', elev: harElevtypsnitt(d) })];
      // Ett kortark fyller sin sida och foten bär upphovet, så sidan får ingen upphovsrad (den hamnade ensam på en sida).
      if (d.elevblad[ram.rubrik] || sida.some((x) => x instanceof Sektionsbyte)) bladsidor.add(sida);
      sidor.push(sida);
    }
  }
  // Diplomet bär sin egen rubrik: utan sidans rubrik och metodrad, så att eleven inte får Diplom två gånger (K-040).
  // Diplomet är elevens (riggens docs/elevmaterial.md): texten i elevens typsnitt; kickern står kvar i sitt.
  if (d.diplom) sidor.push([...medElevtypsnitt(harElevtypsnitt(d), () => diplomBarn(d.diplom!))]);
  for (const sida of sidor) if (!bladsidor.has(sida)) sida.push(stycke(`${UPPHOV}. Mall till ${d.titel}, ${metodAdress(bas, post.id)}.`, { farg: FARG.svag, storlek: 18, fore: 160 }));
  // Mallarna (bråkplanket och tallinjerna) sist, var och en på en liggande sida med smal marginal. Sidfoten bär
  // upphovet, så att planket och linjerna får hela höjden. Är lathundens tredje sida ett blad att lägga på bordet
  // (talsortsmattan, bladet Bråket på fyra sätt) står bladet först bland dem, så att det kopieras med resten.
  // Mallarna och bladet ligger framför eleven: i elevens typsnitt, när metoden har elevmaterial (K-130), som på sidan.
  const elev = harElevtypsnitt(d);
  const blad = d.lathund && arMatta(d.lathund.mall) ? medBredd(BREDD_MALL, () => [medElevtypsnitt(elev, () => mattaSida(d.lathund!.mall))]) : [];
  // Ett ark per talsort (en matta med enPerSida) står på stående A4, en sida per kolumn; övriga mallar liggande.
  const mallsidor = d.mallar.flatMap((m) => (m.typ === 'matta' && m.enPerSida
    ? (m.kolumner ?? []).map((k) => ({ barn: medBredd(BREDD_STAENDE, () => medElevtypsnitt(elev, () => talsortSida(m, k))), liggande: false }))
    : [{ barn: medBredd(BREDD_MALL, () => medElevtypsnitt(elev, () => mallSida(m))), liggande: true }]));
  return [...sidor.map((barn) => ({ barn })), ...blad.map((barn) => ({ barn, liggande: true })), ...mallsidor];
}

// Nivåerna som står på elevens blad fast läraren säger dem: fälten i rutan Till läraren som heter Nivå eller Uppgift med
// ett nummer före bladets första lista (screeningens Nivå 1 och Nivå 2). De står på bladet och inte på lärarens blad efter;
// ett fält om nivåer som eleven läser från bladet (Nivå 6–8) står kvar hos läraren.
function muntligaNivaer(ram: Ram): Ram['delar'][number]['falt'] {
  const nummer = (t: string) => Number(t.match(/^(?:Nivå|Uppgift)\s+(\d+)/i)?.[1] ?? NaN);
  const forstaLista = Math.min(...(ram.listor ?? []).map((l) => nummer(l.rubrik ?? '')).filter(Number.isFinite));
  return ram.delar.flatMap((del) => del.falt).filter((f) => Number.isFinite(nummer(f.rubrik)) && f.text.trim() && !(nummer(f.rubrik) >= forstaLista));
}
// Elevens blad på ett A4, att lägga på bordet och peka på under screeningen (Niclas 2026-09-29, med hans original Screening
// i läsning fsk/åk 1 som förebild): bladets namn överst och versionen stort i hörnet, sedan varje nivå med en tunn linje
// över, nivån fet och vad som görs kursivt ("Nivå 3" och "Säg hur bokstaven låter"), och det eleven läser stort, i elevens
// typsnitt när metoden har Ljudlekens kort, utan rutnät: bokstäver i 36 pt, ord i 28 pt och meningar i 24 pt, var och en
// med luft runt att peka på. Ramens fält att fylla i (elevens namn) står under rubriken.
function elevensBladSida(ram: Ram, d: MetodData): Flod {
  const ut: Flod = [];
  const version = ram.rubrik.match(/version\s+([A-ZÅÄÖ])$/i)?.[1];
  const namn = ram.rubrik.replace(/,\s*(version\s+[A-ZÅÄÖ]|elevens blad)$/i, '');
  const hoger = 1400;
  // Bladets namn och versionen, överst på varje blad, så att en kopia av det andra bladet också visar vilken version det är.
  const rubrikrad = () => new Table({
    width: { size: BREDD, type: WidthType.DXA }, columnWidths: [BREDD - hoger, hoger], layout: TableLayoutType.FIXED, borders: UTAN_KANTER,
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: BREDD - hoger, type: WidthType.DXA }, borders: runt(INGEN_KANT), verticalAlign: VerticalAlign.BOTTOM, children: [
        new Paragraph({ spacing: { before: 0, after: 40 }, children: [run(namn, { fet: true, storlek: 36 })] }),
        new Paragraph({ spacing: { before: 0, after: 0 }, children: [run(d.titel, { farg: FARG.svag, storlek: 18 })] }),
      ] }),
      new TableCell({ width: { size: hoger, type: WidthType.DXA }, borders: runt(INGEN_KANT), verticalAlign: VerticalAlign.BOTTOM, children: [
        new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 0 }, children: version ? [run(version, { fet: true, storlek: 80 })] : [] }),
      ] }),
    ] })],
  });
  ut.push(rubrikrad());
  ut.push(avstand(200));
  if (ram.huvud) ut.push(...ramFaltTabell(ram.huvud, { skrivrum: true, hojder: ram.huvud.map(() => 1.2), hallIhopEfter: true }));
  const font = harElevtypsnitt(d) ? ELEVTYPSNITT : undefined;
  const linje: IBorderOptions = { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 8 };
  let forraNiva = '';
  // Nivåerna som du säger och eleven svarar på (fälten Nivå 1 och Nivå 2 i rutan Till läraren) står först, som i originalet:
  // nivån fet och det du säger kursivt. Sedan listorna som eleven läser, i nivåernas ordning.
  for (const f of muntligaNivaer(ram)) {
    ut.push(new Paragraph({ keepNext: true, border: { top: linje }, spacing: { before: 160, after: 0 }, children: [run(f.rubrik, { fet: true, storlek: 20 })] }));
    ut.push(new Paragraph({ spacing: { before: 0, after: 160 }, children: f.text.split(/(”[^”]*”)/).filter(Boolean).map((t) => run(t, { kursiv: true, storlek: 22, farg: t.startsWith('”') ? FARG.text : FARG.svag })) }));
  }
  let nyttBlad = false;
  for (const [li, l] of (ram.listor ?? []).entries()) {
    // Texterna med frågor (nivå 6–8) börjar ett nytt blad, som i originalet: det första bladet har ljuden, bokstäverna,
    // orden och meningarna, det andra texterna. Så blir screeningen två A4 per version.
    if (harFragor(l) && li > 0 && !nyttBlad) {
      nyttBlad = true;
      ut.push(luft(20, false, { nySida: true }));
      ut.push(rubrikrad(), avstand(200));
      forraNiva = '';
    }
    const m = (l.rubrik ?? '').match(/^([^:]{1,24}):\s*(.+)$/);
    const niva = m ? m[1] : (l.rubrik ?? '');
    // Två listor i följd med samma nivå (små och stora bokstäver i nivå 3) står under en rubrik, som i originalet.
    if (niva !== forraNiva) ut.push(new Paragraph({ keepNext: true, border: { top: linje }, spacing: { before: 160, after: 0 }, children: [run(niva, { fet: true, storlek: 20 })] }));
    forraNiva = niva;
    if (m) ut.push(new Paragraph({ keepNext: true, spacing: { before: 0, after: 120 }, children: [run(m[2], { kursiv: true, storlek: 20, farg: FARG.svag })] }));
    if (harFragor(l)) {
      // Texten till vänster i elevens typsnitt, de längre texterna mindre, och frågorna som du läser upp kursivt till höger.
      const grad = { kort: 36, mellan: 26, lang: 24 }[textlangd(l)];
      const fragor = l.rader.map((r) => (r[1] ?? '').trim()).filter(Boolean);
      const h = Math.round(BREDD * FRAGEBREDD);
      ut.push(new Table({
        width: { size: BREDD, type: WidthType.DXA }, columnWidths: [BREDD - h, h], layout: TableLayoutType.FIXED, borders: UTAN_KANTER,
        rows: [new TableRow({ cantSplit: true, children: [
          new TableCell({ width: { size: BREDD - h, type: WidthType.DXA }, borders: runt(INGEN_KANT), margins: { top: 0, bottom: 0, left: 0, right: 360 },
            children: l.rader.map((r) => new Paragraph({ spacing: { before: 0, after: grad >= 36 ? 120 : 80 }, children: [run(r[0], { storlek: grad, font })] })) }),
          new TableCell({ width: { size: h, type: WidthType.DXA }, borders: runt(INGEN_KANT), margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: fragor.map((f) => new Paragraph({ spacing: { before: 0, after: 120 }, children: [run(f, { kursiv: true, storlek: 20, farg: FARG.svag })] })) }),
        ] })],
      }));
      ut.push(avstand(120));
      continue;
    }
    const n = Math.max(...l.rader.map((r) => r.length));
    const bokstaver = l.rader.every((r) => r.every((c) => c.trim().length <= 2));
    if (n === 1) {
      // Meningar: en per rad, vänsterställda, med luft emellan.
      l.rader.forEach((r, i) => ut.push(new Paragraph({ keepNext: i < l.rader.length - 1, spacing: { before: 0, after: 180 }, children: [run(r[0] ?? '', { storlek: 48, font })] })));
      continue;
    }
    // Bokstäver och ord: lika breda platser utan rutnät, mitt i sin plats, så att läraren och eleven kan peka på var och en.
    const bredd = Math.floor(BREDD / n);
    ut.push(new Table({
      width: { size: bredd * n, type: WidthType.DXA }, columnWidths: Array.from({ length: n }, () => bredd), layout: TableLayoutType.FIXED, borders: UTAN_KANTER,
      rows: l.rader.map((r, ri) => new TableRow({ cantSplit: true, children: Array.from({ length: n }, (_, i) => new TableCell({
        width: { size: bredd, type: WidthType.DXA }, borders: runt(INGEN_KANT), margins: { top: 60, bottom: 60, left: 40, right: 40 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, keepNext: ri < l.rader.length - 1, spacing: { before: 0, after: 0 }, children: [run(r[i] ?? '', { storlek: bokstaver ? 72 : 56, font })] })],
      })) })),
    }));
    ut.push(avstand(120));
  }
  return ut;
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
  const barn: Barn[] = [new Paragraph({ children: [run(mall.rubrik, { font: HUSETS })], heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 40 } })];
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
// Radhöjd och luft som Word och Google Dokument läser likadant (Niclas 2026-09-30). Google Dokument läser exakt
// radhöjd som en multipel, höjden delad med 240, och gjorde raderna flera gånger för höga: läskortens två kort hamnade
// på varsin sida, bråkets täljare fick ett glapp och tabeller med fast radhöjd sköt en tom sida framför sig
// (scripts/googleprov.mjs). Därför finns ingen exakt radhöjd i Word-filerna. En textrad får en multipel av typsnittets
// enkla rad, som är lika hög i Word och Google (mätt 2026-09-30): 1,611 gånger storleken för Andika (typo-måtten, med
// USE_TYPO_METRICS), 1,2207 för Calibri och 1,150 för Arial. Då blir raden lika hög i Word som den exakta raden var
// (scripts/wordjmf.mjs jämför sidorna med Word). Luft är avståndet före ett tomt stycke med en punkts tecken.
const ENKEL_RAD: Record<string, number> = { Andika: 1.611, Calibri: 1.2207, Arial: 1.15 };
function radHojd(hojd: number, storlek: number, font?: string): { line: number } {
  const enkel = (ENKEL_RAD[font ?? 'Calibri'] ?? ENKEL_RAD.Calibri) * (storlek / 2) * 20;
  return { line: Math.max(1, Math.round((240 * hojd) / enkel)) };
}
const LUFT_RAD = 24; // en punkts tecken i Calibri, i twips
const luft = (hojd: number, hallIhop?: boolean, o: { efter?: number; nySida?: boolean } = {}) => new Paragraph({
  keepNext: hallIhop, pageBreakBefore: o.nySida, run: { size: 2, font: 'Calibri' },
  spacing: { before: Math.max(0, hojd - LUFT_RAD), after: o.efter ?? 0, line: 240 },
  children: [new TextRun({ text: '', size: 2, font: 'Calibri' })],
});
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
    barn: m.etiketter === false || n === 1
      ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0, line: 240 }, children: m.etiketter === false ? [] : [run('1', { storlek: stor ? 40 : 30 })] })]
      : brakStycken('1', String(n), stor ? (n >= 10 ? 32 : 40) : n >= 10 ? 26 : 30, FARG.text, lage(L, k + 1, n) - lage(L, k, n)),
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
// Ett rutnät (sexfältaren, jämförelsetabellen, tabellmallen) är samma blad med rader: rutorna delar höjden.
// Elevbladen (rutnät och flöde) har ett band på 12 mm, som bilden på sidan, så att en tom rubrik går att skriva i,
// och utan fot rutor som fyller sidan (8 000 twips); mattorna och blad med fot behåller 7 000.
const ELEVBLAD_BAND = 680;
const ELEVBLAD_HOJD = (m: Mall) => (m.typ === 'matta' || m.fot ? 7000 : 8000);
function mattaMallSida(m: Mall): Barn[] {
  return [
    new Paragraph({ children: [run(m.rubrik, { font: HUSETS })], heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 40 } }),
    ...(m.underrad ? [stycke(m.underrad, { storlek: 22, efter: 160 })] : []),
    m.typ === 'flode' ? flodeTabell(m.kolumner ?? [], ELEVBLAD_HOJD(m), ELEVBLAD_BAND) : mattaTabell(m.kolumner ?? [], { komma: m.komma, hojd: ELEVBLAD_HOJD(m), rader: m.rader, bandHojd: m.typ === 'rutnat' ? ELEVBLAD_BAND : undefined }),
    ...(m.fot ? [avstand(160), ...lhNot([stycke(m.fot, { storlek: 28, efter: 0 })])] : []),
  ];
}
// Ett flöde (tidslinjen, orsak-verkan-kedjan, problem-lösning-rutan): rutor i följd med namnet i ett ljust band, som i
// mattan, och en pil mitt för rutorna i en smal kolumn utan ram mellan dem.
function flodeTabell(kolumner: string[], hojd: number, bandHojd?: number): Table {
  const pil = 700;
  const n = kolumner.length;
  const w = Math.floor((BREDD - pil * (n - 1)) / n);
  const delar = kolumner.flatMap((k, i) => [
    { k, w: i === n - 1 ? BREDD - pil * (n - 1) - w * (n - 1) : w, pil: false },
    ...(i < n - 1 ? [{ k: '', w: pil, pil: true }] : []),
  ]);
  const ram = runt(kant(FARG.text, 8));
  const utan = runt(INGEN_KANT);
  const huvud = rad(delar.map((x) => (x.pil ? cell([], { bredd: x.w, kanter: utan }) : cell([stycke(x.k, { fet: true, storlek: 32, efter: 0 })], { bredd: x.w, fyll: FARG.ljus, kanter: ram }))), { huvud: true, hojd: bandHojd });
  const kropp = new TableRow({ cantSplit: true, height: { value: hojd, rule: HeightRule.EXACT }, children: delar.map((x) => new TableCell({
    width: { size: x.w, type: WidthType.DXA },
    borders: x.pil ? utan : ram,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: x.pil ? [run('→', { storlek: 72, farg: FARG.svag })] : [] })],
  })) });
  return new Table({ width: { size: BREDD, type: WidthType.DXA }, columnWidths: delar.map((x) => x.w), layout: TableLayoutType.FIXED, borders: UTAN_KANTER, rows: [huvud, kropp] });
}
// Mattans tabell, gemensam för bladet från lathunden och mattorna bland mallarna: kolumnnamnet 16 pt fet i ett ljust
// band, rutor med ram i angiven höjd (fördelad på raderna), och ett decimalkomma i en smal kolumn utan ram efter
// kolumn nummer komma, nederst, där talet skrivs.
function mattaTabell(kolumner: string[], o: { komma?: number; hojd: number; rader?: number; bandHojd?: number }): Table {
  const kommaBredd = o.komma ? 1000 : 0;
  const w = Math.floor((BREDD - kommaBredd) / kolumner.length);
  const delar = kolumner.flatMap((k, i) => [
    { k, w: i === kolumner.length - 1 ? BREDD - kommaBredd - w * (kolumner.length - 1) : w, komma: false },
    ...(o.komma === i + 1 ? [{ k: '', w: kommaBredd, komma: true }] : []),
  ]);
  const ram = runt(kant(FARG.text, 8));
  const utan = runt(INGEN_KANT);
  const antal = o.rader ?? 1;
  const huvud = rad(delar.map((x) => (x.komma ? cell([], { bredd: x.w, kanter: utan }) : cell([stycke(x.k, { fet: true, storlek: 32, efter: 0 })], { bredd: x.w, fyll: FARG.ljus, kanter: ram }))), { huvud: true, hojd: o.bandHojd });
  // Bandet rymmer en rad. Bryts ett långt kolumnnamn (Parets väg i Skrivkurs: sagoboken, kartläggningens protokoll i
  // Textsamtal i grupp, K-153) krymper raderna under lika mycket som bandet växer, så att mallen står på en sida och ingen
  // rad hamnar ensam på nästa. Raderna räknas med typsnittets bredder (ordBredd) och enkla radhöjd (ENKEL_RAD).
  const bandRader = Math.max(1, ...delar.filter((x) => !x.komma).map((x) => radantal(x.k, x.w - 240, 32, { fet: true })));
  const extra = (bandRader - 1) * Math.round((ENKEL_RAD[ELEVFONT ?? 'Calibri'] ?? ENKEL_RAD.Calibri) * 16 * 20);
  const kroppHojd = Math.max(antal * 400, o.hojd - extra);
  const kropp = Array.from({ length: antal }, (_, r) => new TableRow({ cantSplit: true, height: { value: Math.floor(kroppHojd / antal), rule: HeightRule.EXACT }, children: delar.map((x) => new TableCell({
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
    new Paragraph({ children: [run(m.rubrik, { font: HUSETS })], heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 40 } }),
    m.underrad ? stycke(m.underrad, { storlek: 22, efter: 160 }) : avstand(160),
    tabell([
      rad([cell([stycke(k, { fet: true, storlek: 48, efter: 0, mitt: true })], { bredd: BREDD, fyll: FARG.ljus, kanter: ram })], { huvud: true }),
      new TableRow({ cantSplit: true, height: { value: 11900, rule: HeightRule.EXACT }, children: [cell([], { bredd: BREDD, kanter: ram })] }),
    ], [BREDD]),
  ];
}
function mallSida(m: Mall): Barn[] {
  if (m.typ === 'matta' || m.typ === 'rutnat' || m.typ === 'flode') return mattaMallSida(m);
  const L = Math.round((m.langdCm ?? 26) * CM);
  // En delad linje bär delarnas namn (brak.ts, delnamn) till vänster ovanför linjen, i luften före den, så att sidan
  // blir lika hög som utan namn. Linjens 0 står 283 in från tabellens kant, och tabellen är centrerad (tallinjeTabell).
  const namnRad = (namn: string, hojd: number, vid: number) => new Paragraph({ keepNext: true, indent: { left: vid }, spacing: { before: 0, after: 0, ...radHojd(hojd, storl(20) ?? 20, ELEVFONT) }, children: [run(namn, { storlek: 20, farg: FARG.svag })] });
  return [
    new Paragraph({ children: [run(m.rubrik, { font: HUSETS })], heading: HeadingLevel.HEADING_1, spacing: { before: 0, after: 40 } }),
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
// Kickerns typsnitt, utan teckenavstånd (K-138): Google Dokument ignorerar teckenavståndet och ritar texten tätare än
// Word, så att raderna bryts på andra ställen i de två.
const MONO = 'Consolas';
// Kickers är riktiga rubriker (nivå 3) så att dokumentet går att navigera, med eget utseende.
function kicker(text: string, o: { farg?: string; efter?: number; fore?: number } = {}): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [textRun({ text, font: MONO, size: 15, bold: false, allCaps: true, color: o.farg ?? FARG.svag })], spacing: { before: o.fore ?? 160, after: o.efter ?? 60 }, keepNext: true });
}
function lhHuvud(titel: string, etikett: string, niva1 = false): Barn[] {
  const barn = [new Paragraph({
    heading: niva1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    tabStops: [{ type: TabStopType.RIGHT, position: BREDD - 240 }],
    children: [
      textRun({ text: 'LATHUND  ', font: MONO, size: 15, bold: false, color: 'DDE6E1' }),
      textRun({ text: titel, bold: true, size: 28, color: FARG.vit, font: 'Calibri' }),
      textRun({ children: [new Tab()] }),
      textRun({ text: etikett, font: MONO, size: 15, bold: false, allCaps: true, color: 'DDE6E1' }),
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
// Rutans rubrik är en rubrik på nivå 3 (K-018), med rutans eget utseende.
function lhRuta(rubrik: string, barn: Barn[]): Barn[] {
  return [tabell([
    rad([cell([new Paragraph({ heading: HeadingLevel.HEADING_3, children: [textRun({ text: rubrik, font: MONO, size: 16, bold: false, allCaps: true, color: FARG.vit })], spacing: { before: 0, after: 0 } })], { bredd: BREDD, fyll: FARG.text, kanter: runt(kant(FARG.text)) })]),
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
  const rader = Array.from({ length: antal }, () => rad([cell([], { bredd: BREDD, kanter: { top: INGEN_KANT, left: INGEN_KANT, right: INGEN_KANT, bottom: kant(FARG.kant) } })], { hojd: Math.round(hojd * SKALA) }));
  return [new Table({ width: { size: BREDD, type: WidthType.DXA }, columnWidths: [BREDD], layout: TableLayoutType.FIXED, borders: UTAN_KANTER, rows: rader }), avstand(80)];
}
// Två spalter utan kanter. Innehållet i spalterna byggs med spaltens bredd.
// Strategikortet på lathundens tredje sida (K-061): raderna över hela bredden med lika höjd, kolumnrubrikerna små och
// grå överst och tunna linjer mellan raderna, som i PowerPoint. Radernas höjd följer skalan, så att mätningen i Word
// (lathund-word.mjs) kan krympa sidan: med en fast höjd på 8 400 twips föll Upprepad läsnings sjunde rad på en egen sida
// i varje storlek. Texten är så stor som raden och den längsta cellen tillåter, högst 28 pt, och sätts i den slutliga
// storleken (stycke skalar graden, så den delas med skalan först), så att en cell aldrig bryts.
function kortTabell(kolumner: string[], rader: string[][]): Barn[] {
  const bredder = kolumnBredder(kolumner.length);
  const radHojd = Math.floor((7000 * SKALA) / Math.max(1, rader.length));
  const langst = Math.max(...rader.flatMap((r) => r.map((c) => c.length)));
  const pt = Math.max(14, Math.min(28, (radHojd / 20) * 0.45, (bredder[0] / 20 - 12) / (langst * 0.55))) / SKALA;
  const linje = kant(FARG.kant, 6);
  const kanter = { top: INGEN_KANT, left: INGEN_KANT, right: INGEN_KANT, bottom: linje };
  const huvud = rad(kolumner.map((k, i) => cell([new Paragraph({ children: [textRun({ text: k, font: MONO, size: 16, allCaps: true, color: FARG.svag })], spacing: { after: 0 } })], { bredd: bredder[i], kanter })), { huvud: true });
  const kropp = rader.map((r) => new TableRow({ cantSplit: true, height: { value: radHojd, rule: HeightRule.ATLEAST }, children: r.map((c, i) => new TableCell({
    width: { size: bredder[i], type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    borders: kanter,
    margins: { top: 40, bottom: 40, left: 120, right: 120 },
    children: [stycke(c, { storlek: Math.round(pt * 2), efter: 0 })],
  })) }));
  return [new Table({ width: { size: BREDD, type: WidthType.DXA }, columnWidths: bredder, layout: TableLayoutType.FIXED, borders: UTAN_KANTER, rows: [huvud, ...kropp] }), avstand(80)];
}
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
  children: [...(p.fet ? [textRun({ text: p.fet, bold: true, size: storlek })] : []), ...(p.text ? [textRun({ text: `${p.fet ? ' ' : ''}${p.text}`, size: storlek })] : [])],
  spacing: { after: i === alla.length - 1 ? 0 : 60 },
}));

// niva1: den fristående lathunden, där första bandet är dokumentets rubrik på nivå 1 (K-018). Varje sida byggs med
// sin egen skala, uppmätt i Word av scripts/lathund-word.mjs (src/data/lathund-word.json); skalor och baraSida
// används av mätningen, som bygger en sida i taget i olika storlekar.
function lathundBarn(post: MetodPost, o: { niva1?: boolean; skalor?: number[]; baraSida?: number } = {}): Barn[][] {
  const d = post.data;
  const l = d.lathund;
  if (!l) return [];
  const sidor: Barn[][] = [];
  const citat = (f: string) => `”${f}”`;
  const stor = (t: string) => stycke(t, { storlek: 20 });
  const skalor = o.skalor ?? lathundSkalor(post.id);
  const sida = (nr: number, fn: () => Barn[]) => { if (!o.baraSida || o.baraSida === nr) sidor.push(medSkala(skalor[nr - 1] ?? LH_SKALA, fn)); };

  // 1. Metoden.
  sida(1, () => [
    ...lhHuvud(d.titel, 'Metoden · 1/4', o.niva1),
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
  sida(2, () => [
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
        const huvud = rad(['Tid', 'Vad händer'].map((k, i) => cell([new Paragraph({ children: [textRun({ text: k, font: MONO, size: 16, allCaps: true, color: FARG.vit })], spacing: { after: 0 } })], { bredd: bredder[i], fyll: FARG.text, kanter: runt(kant(FARG.text)) })), { huvud: true });
        const kropp = l.pass.schema.rader.map((r, i) => rad([
          cell([new Paragraph({ children: [textRun({ text: r.tid, font: MONO, size: 18, bold: true, color: FARG.svag })], spacing: { after: 0 } })], { bredd: bredder[0], fyll: i % 2 === 1 ? FARG.rand : undefined }),
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
  sida(3, () => {
    const mall: Barn[] = [...lhHuvud(l.mall.rubrik, 'Mallen · 3/4')];
    if (l.mall.underrad) mall.push(kicker(l.mall.underrad, { fore: 0, efter: 120 }));
    // En enda tom tabell utan snabbmall är ett blad att lägga på bordet (talsortsmattan): den tar hela
    // bredden med höga rutor som fyller sidan, och noten står under, i stället för två spalter.
    const matta = arMatta(l.mall);
    // En enda ifylld tabell är ett kort att ha på bordet (strategikortet, K-061): hela bredden, stor text och lika
    // höga rader som fyller sidan, som i PowerPoint (lathundForm i metod.ts).
    const kort = lathundForm(l.mall).form === 'kort';
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
            new Paragraph({ children: [textRun({ text: `${nr}  `, font: MONO, color: FARG.huvud, size: 18 }), textRun({ text: k.namn, bold: true, size: 24 }), textRun({ text: `  ${citat(k.fraga)}`, size: 19, color: FARG.svag })], border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: FARG.text, space: 2 } }, spacing: { after: 60 } }),
            ...lhRader(b.rader, 330),
          ] : []);
          const nr = b.kolumner.indexOf(p[0]) + 1;
          mall.push(...lhSpalter(spalt(p[0], nr), spalt(p[1], nr + 1)));
        }
      } else if (b.typ === 'skrivruta') {
        smala.push({ vikt: b.rader + 2, f: () => lhNot([
          new Paragraph({ children: [textRun({ text: b.rubrik, bold: true, size: 22 }), ...(b.text ? [textRun({ text: `  ${b.text}`, size: 19, color: FARG.svag })] : [])], spacing: { after: 60 } }),
          ...lhRader(b.rader, 320),
        ]) });
      } else if (b.typ === 'tavla') {
        tomSmala();
        mall.push(...tavlaBarn(b));
      } else if (b.typ === 'snabbmall' && d.snabbmall) {
        const sm = d.snabbmall;
        smala.push({ vikt: sm.fore.length + sm.efter.length + 3, f: () => snabbmallTabell(d.titel, sm.fore, sm.efter, { skrivrum: true, hojd: Math.round(640 * SKALA) }) });
      } else if (b.typ === 'tabell' && matta) {
        tomSmala();
        mall.push(kicker(b.rubrik, { farg: FARG.huvud, fore: 0 }), ...rubrikTabell(b.kolumner, b.rader, kolumnBredder(b.kolumner.length), { huvudFyll: FARG.text, radrubrik: false, storlek: 24, tomHojd: Math.min(6000, Math.floor(6000 / b.rader.length)), ramad: true }));
      } else if (b.typ === 'tabell' && kort) {
        tomSmala();
        const [a, c] = [(b.rubrik ?? '').toLowerCase(), l.mall.rubrik.toLowerCase()];
        if (a && !a.includes(c) && !c.includes(a)) mall.push(kicker(b.rubrik, { farg: FARG.huvud, fore: 0 }));
        mall.push(...kortTabell(b.kolumner, b.rader));
      } else if (b.typ === 'tabell') {
        const korta = b.rader.every((r) => r.every((c) => c.length <= 12));
        smala.push({ vikt: b.rader.length + 2, f: () => [kicker(b.rubrik, { farg: FARG.huvud, fore: 0 }), ...(korta ? elevlista({ kolumner: b.kolumner, rader: b.rader }, { storlek: 22 }) : rubrikTabell(b.kolumner, b.rader, kolumnBredder(b.kolumner.length, 0.3), { huvudFyll: FARG.text, radrubrik: false }))] });
      } else if (b.typ === 'kedja') {
        smala.push({ vikt: 3, f: () => [
          kicker(b.rubrik, { farg: FARG.huvud, fore: 0 }),
          new Paragraph({ children: b.steg.flatMap((s, i) => [...(i > 0 ? [textRun({ text: '  →  ', color: FARG.svag })] : []), textRun({ text: s, italics: true, bold: true, size: 21, color: i === b.steg.length - 1 ? '2E7D32' : FARG.text })]), spacing: { after: 120 } }),
          ...(b.citat ? [stycke(citat(b.citat), { kursiv: true, farg: BRUN, storlek: 20 })] : []),
        ] });
      } else if (b.typ === 'not' && (matta || kort)) {
        // Mattans och kortets fot är regeln för eleven: större, inte fet.
        tomSmala();
        mall.push(...lhNot([stycke(b.text, { storlek: 28, efter: 0 })]));
      } else if (b.typ === 'not') {
        smala.push({ vikt: 1 + Math.ceil(b.text.length / 110), f: () => lhNot([stycke(b.text, { storlek: 20, efter: 0 })]) });
      }
    }
    tomSmala();
    return mall;
  });

  // 4. Material.
  sida(4, () => {
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
        ...(d.checklista ? lhRuta(d.checklista.rubrik, d.checklista.punkter.map((p, i, alla) => new Paragraph({ children: [bockRun(20), run(` ${p}`, { storlek: 20 })], spacing: { after: i === alla.length - 1 ? 0 : 40 } }))) : []),
        ...(d.uppfoljning || l.material.varjePass ? lhRuta('Uppföljning', [
          ...(d.uppfoljning?.rader ?? []).map((r) => new Paragraph({ children: [textRun({ text: `${r.nar}: `, bold: true, size: 20 }), textRun({ text: r.vad, size: 20 })], spacing: { after: 60 } })),
          ...(l.material.varjePass ? [new Paragraph({ children: [textRun({ text: 'Varje pass: ', bold: true, size: 20 }), textRun({ text: l.material.varjePass, size: 20 })], spacing: { after: 0 } })] : []),
        ]) : []),
      ],
    ));
    return material;
  });
  return sidor;
}

function sidhuvud(text: string): Header {
  return new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(text, { farg: FARG.svag, storlek: 18 })], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: FARG.kant, space: 4 } }, spacing: { after: 0 } })] });
}
// liten: lathundens fot, mindre och utan linje, som pdf:ens upphovsrad.
function sidfot(adress: string, bredd: number, liten = false): Footer {
  const storlek = liten ? 15 : 18;
  return new Footer({ children: [new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: bredd }],
    children: [run(`${UPPHOV} · ${adress}`, { farg: FARG.svag, storlek }), textRun({ children: [new Tab(), 'Sida ', PageNumber.CURRENT, ' av ', PageNumber.TOTAL_PAGES], color: FARG.svag, size: storlek })],
    border: liten ? undefined : { top: { style: BorderStyle.SINGLE, size: 4, color: FARG.kant, space: 4 } },
    spacing: { after: 0 },
  })] });
}
// smal: en liggande mallsida med smal marginal, så att det hela i bråkplanket och på tallinjen (26 cm) ryms.
// lathund: lathundens sida med smala marginaler och utan rubrikrad, eftersom bandet bär titeln; sidhuvudet är ändå
// satt (tomt), så att en lathund efter mallarna i Word-filen med allt inte ärver mallarnas rubrikrad.
// kortark: Ljudlekens kort med 1 cm marginal, utan rubrikrad och med lathundens lilla fot, så att arket ryms på sidan.
// bok: en boksida (lästexten, boksida()) med 1,5 cm marginal, upphovet i sidhuvudet och raden Till läraren, nivåns knapp
// och sidnumret i sidfoten, som i metodriggen.
function sektion(barn: Barn[], huvudtext: string, adress: string, o: { liggande?: boolean; smal?: boolean; lathund?: boolean; kortark?: boolean; bok?: Boksektion; saga?: Sagosektion } = {}): ISectionOptions {
  // Ett sagoblad: kortarkets marginal på 1 cm, upphovet litet i sidhuvudet, som på boksidan, och rutan Till läraren och
  // sidnumret i sidfoten, eller ingen sidfot på bokens blad (sagoFot).
  if (o.saga) {
    return {
      properties: { page: { size: { ...A4, orientation: PageOrientation.PORTRAIT }, margin: { top: KORTMARGINAL, right: KORTMARGINAL, bottom: KORTMARGINAL, left: KORTMARGINAL, header: 280, footer: 280 } } },
      headers: { default: bokHuvud(adress) },
      footers: { default: sagoFot(o.saga) },
      children: barn,
    };
  }
  if (o.bok) {
    return {
      properties: { page: { size: { ...A4, orientation: PageOrientation.PORTRAIT }, margin: BOKMARGINAL } },
      headers: { default: bokHuvud(adress) },
      footers: { default: bokFot(o.bok) },
      children: barn,
    };
  }
  if (o.kortark) {
    return {
      properties: { page: { size: { ...A4, orientation: PageOrientation.PORTRAIT }, margin: { top: KORTMARGINAL, right: KORTMARGINAL, bottom: KORTMARGINAL, left: KORTMARGINAL, header: 280, footer: 280 } } },
      headers: { default: new Header({ children: [new Paragraph({ spacing: { after: 0 } })] }) },
      footers: { default: sidfot(adress, BREDD_KORTARK, true) },
      children: barn,
    };
  }
  const marginal = o.lathund ? LH_MARGINAL : o.smal ? { top: 720, right: 720, bottom: 900, left: 720, header: 450, footer: 450 } : { top: MARGINAL, right: MARGINAL, bottom: MARGINAL, left: MARGINAL, header: 567, footer: 567 };
  return {
    properties: { page: { size: { ...A4, orientation: o.liggande || o.lathund ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: marginal } },
    headers: { default: o.lathund ? new Header({ children: [new Paragraph({ spacing: { after: 0 } })] }) : sidhuvud(huvudtext) },
    footers: { default: sidfot(adress, o.lathund ? BREDD_LATHUND : o.smal ? BREDD_MALL : o.liggande ? BREDD_LIGGANDE : BREDD_STAENDE, o.lathund) },
    children: barn,
  };
}
// Ett flöde med sektionsbyten blir sektioner: ett kortark i en egen sektion med smal marginal, det andra i sidans vanliga.
// En tom sektion hoppas över, så att två ark i följd inte lämnar en tom sida mellan sig.
function delaSektioner(flod: Flod, huvudtext: string, adress: string, o: { liggande?: boolean; smal?: boolean } = {}): ISectionOptions[] {
  const ut: ISectionOptions[] = [];
  let barn: Barn[] = [];
  let kortark = false;
  let bok: Boksektion | undefined;
  let saga: Sagosektion | undefined;
  const klar = () => { if (barn.length) ut.push(sektion(barn, huvudtext, adress, saga ? { saga } : bok ? { bok } : kortark ? { kortark: true } : o)); barn = []; };
  for (const x of flod) {
    if (arBarn(x)) { barn.push(x); continue; }
    klar();
    kortark = x.kortark;
    bok = x.bok;
    saga = x.saga;
  }
  klar();
  if (!ut.length) ut.push(sektion([new Paragraph({})], huvudtext, adress, o));
  return ut;
}
// Word-filen bär elevens typsnitt inbäddat när någon av metoderna har Ljudlekens kort och typsnittet finns i resurserna,
// så att korten ser likadana ut där typsnittet inte är installerat, och boksidornas Cinzel och Cinzel Decorative när
// någon har lästexter. Saknas boksidornas typsnitt i resurserna stannar bygget, så att en boksida aldrig går ut i fel
// typsnitt.
function typsnittFor(poster: MetodPost[]): { fonts?: { name: string; data: Buffer }[] } {
  const fonts: { name: string; data: Buffer }[] = [];
  const elev = RESURSER.elevtypsnitt;
  if (elev && poster.some((p) => harElevtypsnitt(p.data))) fonts.push({ name: ELEVTYPSNITT, data: elev as Buffer });
  if (poster.some((p) => harBoktypsnitt(p.data))) {
    const bok = RESURSER.boktypsnitt;
    if (!bok) throw new Error('Word-filen har boksidor eller sagoblad men saknar Cinzel och Cinzel Decorative (public/fonts/boksida/), som src/lib/metodresurser.ts läser vid bygget och sidan hämtar i webbläsaren.');
    fonts.push({ name: BOKTYPSNITT, data: bok.cinzel as Buffer }, { name: ANFANGTYPSNITT, data: bok.dekor as Buffer });
  }
  return fonts.length ? { fonts } : {};
}
// Avsnittets sista stycke. docx lägger ett tomt stycke i dokumentets textstorlek sist i varje avsnitt, och det bär
// avsnittets inställningar (sidans storlek, sidhuvudet). Word låter stycket hänga kvar på en full sida, men Google
// Dokument flyttar det till en ny sida och gör en tom sida; slutar dokumentet med en tabell lägger båda till ett sådant
// stycke själva (Boksamtals lathund och Bråkkursens mallar i Google Dokument, scripts/googleprov.mjs 2026-09-30). Det
// stycket är därför en punkt högt i alla Word-filer, med radavståndet som multipel: docx-bibliotekets stycke byts ut
// här, och dokument() lägger ett likadant sist när det sista avsnittet slutar med en tabell.
const avsnittsStycke = () => new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, run: { size: 2, font: 'Calibri' } });
// Bytet gäller docx 9.7:s inre metod; finns den inte längre (en ny version av docx) stannar bygget här i stället för att
// stycket tyst blir normalstort igen.
if (typeof (Body.prototype as unknown as { createSectionParagraph?: unknown }).createSectionParagraph !== 'function') {
  throw new Error('metoddocx.ts: docx saknar Body.prototype.createSectionParagraph; pröva avsnittsStycke mot den nya versionen (K-138).');
}
(Body.prototype as unknown as { createSectionParagraph: (sektion: unknown) => Paragraph }).createSectionParagraph = (sektion) => {
  const stycke = avsnittsStycke();
  (stycke as unknown as { properties: { push: (x: unknown) => void } }).properties.push(sektion);
  return stycke;
};
// Tabellerna görs om här, i alla Word-filer och alla former på en gång, efter två regler (K-138, mätta 2026-09-30).
//
// En rad med satt höjd har ingen cellmarginal upptill eller nedtill. Word lägger marginalerna ovanpå radens höjd, båda
// vid minsta höjd och den nedre vid exakt höjd, men Google Dokument räknar dem in i höjden: en protokollrad på minst 900
// twips med 80 upptill och nedtill blev 53,5 pt i Word och 45,8 pt i Google. Höjden får därför marginalerna som Word
// lägger till, cellernas marginaler upptill och nedtill blir 0,
// och luften ligger som ett stycke av samma höjd först och sist i cellen. Då ritar Word raden som förut och Google
// nästan likadant (53,5 och 54,0 pt; vikkortet 93,7 och 94,5 pt), och resten är Googles bildpunkter nedan.
//
// En tabell i en cell har ett stycke på en punkt före och efter sig. Google tillåter ingen tabell först eller sist i en
// cell och lägger där ett tomt stycke i normal storlek; docx lägger ett sådant efter. En ruta i lathundens spalter blev
// 17 pt högre i Google än i Word, och skrivraderna 29 pt; med styckena på en punkt skiljer det 3 pt.
//
// docx-biblioteket behåller radernas och cellernas inställningar (options), så raden byggs om ur dem;
// scripts/wordregler.mjs stoppar valideringen om en fil ändå bryter en regel.
type MedInstallningar<T> = { options: T };
const radInst = (r: TableRow) => (r as unknown as MedInstallningar<ConstructorParameters<typeof TableRow>[0]>).options;
const cellInst = (c: TableCell) => (c as unknown as MedInstallningar<ConstructorParameters<typeof TableCell>[0]>).options;
// Stycket har "håll ihop med nästa" påslaget. docx skriver keepNext: false som ett eget element med värdet false, så
// elementet räcker inte (granskningen 2026-09-30: 352 celler fick annars luftstycken som höll ihop).
type XmlDel = { rootKey?: string; root?: XmlDel[] | Record<string, unknown> };
const haller = (b: unknown) => b instanceof Paragraph && ((b as unknown as { properties?: XmlDel }).properties?.root as XmlDel[] ?? []).some((x) => {
  if (x.rootKey !== 'w:keepNext') return false;
  const attr = (Array.isArray(x.root) ? x.root : []).find((a) => a.rootKey === '_attr');
  return !(attr && (attr.root as Record<string, unknown>)?.val === false);
});
// Ett stycke på en punkt före en tabell som står först i cellen eller efter en annan tabell, och efter den sista. Ett
// tomt stycke sist i cellen direkt efter en tabell (avstand()) blir också ett på en punkt: Word räknar inte dess höjd
// där, Google gör det (mätt 2026-09-30).
// Tomt är ett stycke utan körningar vars egenskaper bara är avstånd (avstand()), inte ett med sidbrytning, kant eller
// "håll ihop med nästa".
const tomtStycke = (x: unknown) => x instanceof Paragraph && (x as unknown as { root: unknown[] }).root.length <= 1
  && ((x as unknown as { properties?: XmlDel }).properties?.root as XmlDel[] ?? []).every((e) => e.rootKey === 'w:spacing');
function kringTabeller(barn: readonly (Paragraph | Table)[]): (Paragraph | Table)[] {
  const ut: (Paragraph | Table)[] = [];
  barn.forEach((x, i) => {
    if (x instanceof Table && (i === 0 || barn[i - 1] instanceof Table)) ut.push(new Paragraph({ keepNext: true, spacing: { before: 0, after: 0, line: 240 }, run: { size: 2, font: 'Calibri' } }));
    ut.push(x);
  });
  if (ut.at(-1) instanceof Table) ut.push(avsnittsStycke());
  else if (ut.at(-2) instanceof Table && tomtStycke(ut.at(-1))) ut[ut.length - 1] = avsnittsStycke();
  return ut;
}
// Google Dokument ritar tabellens lodräta mått i hela bildpunkter, 0,75 pt eller 15 twips, och Word exakt (mätbänken,
// scripts/matbank/tabellrader.mjs och radhojd.mjs, 2026-09-30, K-141). Cellmarginalen och en satt radhöjd avrundas till
// närmaste bildpunkt, och kanten mellan två rader tar en bildpunkt i Google (0,25 till 1 pt) där Word räknar kantens
// tjocklek; styckeavstånden ritar båda exakt. Protokollets rad med 2 pt marginal och kant på 0,5 pt blev 17,9 pt i Word
// och 18,7 i Google, och en full mallsida spillde en rad i Google. Marginalerna och höjderna står därför i hela
// bildpunkter, och det kanten skiljer ligger i den nedre marginalen, så att raden blir lika hög i båda och Google ritar
// den som förut. En exakt höjd räknar kanten i Word men inte i Google; där står kantens bildpunkt som nedre marginal,
// som Word lägger utanför en exakt höjd.
const BILDPUNKT = 15;
const bildpunkt = (twips: number) => Math.round(twips / BILDPUNKT) * BILDPUNKT;
// Kanten mellan raderna i punkter, i Word och i Google: den tjockaste över eller under en cell i raden. En dubbel kant
// finns inte i Word-filerna (dubbelRam, K-157; scripts/wordregler.mjs stoppar den).
function radKant(celler: TableCell[]): { word: number; google: number } {
  let word = 0;
  for (const c of celler) {
    const k = cellInst(c).borders;
    for (const s of [k?.top, k?.bottom]) {
      if (!s || s.style === BorderStyle.NIL || s.style === BorderStyle.NONE || !s.size) continue;
      word = Math.max(word, s.size / 8);
    }
  }
  return { word, google: !word ? word : Math.max(0.75, Math.round(word / 0.75) * 0.75) };
}
function googleTabeller(barn: readonly unknown[]): void {
  for (const b of barn) {
    if (!(b instanceof Table) || GOOGLEKLARA.has(b)) continue;
    const rot = (b as unknown as { root: unknown[] }).root;
    rot.forEach((r, i) => {
      if (!(r instanceof TableRow)) return;
      const rad = radInst(r);
      const celler = rad.children as TableCell[];
      // Raden byggs om ur sina celler; en cell som spänner över flera rader har fortsättningar som bara finns i
      // radens root och skulle försvinna. Inget använder rowSpan i dag.
      if (celler.some((c) => (cellInst(c).rowSpan ?? 1) > 1)) throw new Error('metoddocx.ts: googleTabeller kan inte bygga om en rad med rowSpan (K-138).');
      for (const c of celler) googleTabeller(cellInst(c).children);
      const marg = celler.map((c) => cellInst(c).margins ?? {});
      const upp = rad.height ? Math.max(0, ...marg.map((m) => m.top ?? 0)) : 0;
      const ned = rad.height ? Math.max(0, ...marg.map((m) => m.bottom ?? 0)) : 0;
      const inre = celler.some((c) => cellInst(c).children.some((x) => x instanceof Table));
      const exakt = rad.height?.rule === HeightRule.EXACT;
      const kant = radKant(celler);
      // Det kanten skiljer, i twips. Mer än en halv bildpunkt delas mellan marginalen upptill och nedtill, så att Google
      // avrundar bort det i båda.
      const skillnad = Math.round((kant.google - kant.word) * 20);
      const [overTill, underTill] = Math.abs(skillnad) * 2 > BILDPUNKT ? [Math.ceil(skillnad / 2), Math.floor(skillnad / 2)] : [0, skillnad];
      const nya = celler.map((c, j) => {
        const o = cellInst(c);
        const hall = o.children.some(haller);
        const t = upp || ned ? marg[j].top ?? 0 : 0;
        const n = upp || ned ? marg[j].bottom ?? 0 : 0;
        const barnet = upp || ned || inre ? kringTabeller([...(t ? [luft(t, hall)] : []), ...o.children, ...(n ? [luft(n, hall)] : [])]) : o.children;
        const margins = rad.height
          ? { ...marg[j], top: 0, bottom: exakt ? Math.round(kant.google * 20) : Math.max(0, skillnad) }
          : { ...marg[j], top: Math.max(0, bildpunkt(marg[j].top ?? 0) + overTill), bottom: Math.max(0, bildpunkt(marg[j].bottom ?? 0) + underTill) };
        return new TableCell({ ...o, margins, children: barnet });
      });
      const hojd = rad.height ? bildpunkt(Number(rad.height.value) + (exakt ? ned : upp + ned)) + (!exakt && skillnad < 0 ? skillnad : 0) : 0;
      rot[i] = new TableRow({ ...rad, ...(rad.height ? { height: { value: hojd, rule: rad.height.rule } } : {}), children: nya });
    });
  }
}
function dokument(titel: string, sektioner: ISectionOptions[], typsnitt: { fonts?: { name: string; data: Buffer }[] } = {}): Document {
  // Två tabeller i följd får ett stycke på en punkt emellan, som i en cell: Google lägger annars ett i normal storlek.
  // Ett avsnitt som börjar med en tabell börjar med ett sådant stycke (Google lade lathundens sida 1 14 pt lägre), och
  // ett tomt stycke sist i ett avsnitt tas bort, eftersom nästa avsnitt ändå börjar på en ny sida (sidan efter
  // började 16 pt lägre i Google). Granskningen 2026-09-30.
  sektioner = sektioner.map((s) => {
    const barn = s.children.flatMap((x, i) => (x instanceof Table && s.children[i - 1] instanceof Table ? [avsnittsStycke(), x] : [x]));
    while (barn.length > 1 && tomtStycke(barn.at(-1))) barn.pop();
    return { ...s, children: barn[0] instanceof Table ? [avsnittsStycke(), ...barn] : barn };
  });
  const sista = sektioner.at(-1);
  if (sista && sista.children.at(-1) instanceof Table) sektioner = [...sektioner.slice(0, -1), { ...sista, children: [...sista.children, avsnittsStycke()] }];
  for (const s of sektioner) googleTabeller(s.children);
  return new Document({
    ...typsnitt,
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
export function metodDokument(poster: MetodPostISerie[], o: { bas: string; medMallar?: boolean; resurser?: MetodResurser }): Document {
  instans = 0;
  RESURSER = o.resurser ?? { bilder: new Map() };
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
    sektioner.push(...delaSektioner(metodBarn(post, o.bas), `${post.data.titel} · ${SAJT}`, adress));
    if (o.medMallar) {
      for (const sida of mallBarn(post, o.bas, { baraTommaRamar: true })) sektioner.push(...delaSektioner(sida.barn, `Mall · ${post.data.titel} · ${SAJT}`, adress, { liggande: sida.liggande, smal: sida.liggande }));
      for (const sida of medBredd(BREDD_LATHUND, () => lathundBarn(post))) sektioner.push(sektion(sida, `Lathund · ${post.data.titel} · ${SAJT}`, `${adress}/lathund`, { lathund: true }));
    }
  }
  return dokument(poster.length === 1 ? poster[0].data.titel : 'Metoder för stödundervisning', sektioner, typsnittFor(poster));
}

// Lathunden till en metod: fyra liggande sidor.
export function lathundDokument(post: MetodPost, o: { bas: string }): Document {
  instans = 0;
  const adress = `${metodAdress(o.bas, post.id).replace(/^https?:\/\//, '')}/lathund`;
  const sidor = medBredd(BREDD_LATHUND, () => lathundBarn(post, { niva1: true }));
  if (sidor.length === 0) sidor.push([stycke(`${post.data.titel} har ingen lathund.`)]);
  const sektioner = sidor.map((sida) => sektion(sida, `Lathund · ${post.data.titel} · ${SAJT}`, adress, { lathund: true }));
  return dokument(`Lathund: ${post.data.titel}`, sektioner);
}

// En enda sida ur lathunden i en given skala, för mätningen i Word (scripts/lathund-word.mjs).
export function lathundProvDokument(post: MetodPost, nr: number, skala: number, o: { bas: string }): Document {
  instans = 0;
  const adress = `${metodAdress(o.bas, post.id).replace(/^https?:\/\//, '')}/lathund`;
  const sidor = medBredd(BREDD_LATHUND, () => lathundBarn(post, { niva1: nr === 1, skalor: [skala, skala, skala, skala], baraSida: nr }));
  return dokument(`Lathund: ${post.data.titel}, sida ${nr}`, sidor.map((sida) => sektion(sida, '', adress, { lathund: true })));
}

// Bara mallarna till en metod.
export function mallDokument(post: MetodPost, o: { bas: string; resurser?: MetodResurser }): Document {
  instans = 0;
  RESURSER = o.resurser ?? { bilder: new Map() };
  const adress = metodAdress(o.bas, post.id).replace(/^https?:\/\//, '');
  const sidor = mallBarn(post, o.bas);
  if (sidor.length === 0) sidor.push({ barn: [stycke(`${post.data.titel} har inga mallar.`)] });
  const sektioner = sidor.flatMap((sida) => delaSektioner(sida.barn, `Mall · ${post.data.titel} · ${SAJT}`, adress, { liggande: sida.liggande, smal: sida.liggande }));
  return dokument(`Mallar: ${post.data.titel}`, sektioner, typsnittFor([post]));
}
