// Dubbla linjer i Word och Google (K-157; Niclas 2026-10-01: boksidans dubbla ram och den röda dubbla linjen under
// titeln blev enkla i Google Dokument). Google har bara heldragna, streckade och prickade kanter och ritar en dubbel kant
// som en enda linje på omkring 2 pt. Word ritar en dubbel kant med storleken sz som två linjer på sz med sz emellan
// (uppmätt i boksidan: ramen med sz 12 är 1,5 + 1,5 + 1,5 pt, titellinjen med sz 6 är 0,75 + 0,75 + 0,75 pt). Proven
// bygger den dubbla linjen av två enkla, så att Word och Google ritar samma sak, och mäter vad det gör med höjden.
//   node scripts/matbank.mjs scripts/matbank/dubbellinje.mjs
import { AlignmentType, BorderStyle, HeightRule, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType } from 'docx';

export const namn = 'dubbellinje';

const ingen = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const etikett = (t) => new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: t, bold: true, size: 20 })] });
// Ett stycke på en punkt (Calibri 1 pt, också styckemärket, som punktStycke i metoddocx.ts), med radavståndet som multipel: 240 ger 1,22 pt, 295 ger 1,5 pt och 147 ger 0,75 pt.
const punkt = (line = 240, o = {}) => new Paragraph({ spacing: { before: 0, after: 0, line }, run: { size: 2, font: 'Calibri' }, ...o, children: [new TextRun({ text: '', size: 2, font: 'Calibri' })] });
const BREDD = 9000;

// Ramen som boksidan: en tabell med två rader och kant bara runt om (överst, på sidorna och nederst).
const ramtabell = (bredd, kant, e, forsta, utanNedre = false) => new Table({
  width: { size: bredd, type: WidthType.DXA }, columnWidths: [bredd], layout: TableLayoutType.FIXED,
  borders: { top: ingen, bottom: ingen, left: ingen, right: ingen, insideHorizontal: ingen, insideVertical: ingen },
  rows: [0, 1].map((r) => new TableRow({ children: [new TableCell({
    width: { size: bredd, type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 400, right: 400 },
    borders: { top: r === 0 ? kant : ingen, bottom: r === 1 && !utanNedre ? kant : ingen, left: kant, right: kant },
    children: [new Paragraph({ spacing: { before: 120, after: 120 }, children: [new TextRun({ text: e(forsta + r), bold: true, size: 20 })] })],
  })] })),
});
// Den dubbla ramen av två enkla: en tabell med en cell och enkel kant, och i den, efter ett stycke som är mellanrummet,
// boksidans tabell med enkel kant.
const nastlad = (kant, glapp, sida, line, o = {}) => (e) => [etikett(e(0)), new Table({
  width: { size: BREDD, type: WidthType.DXA }, columnWidths: [BREDD], layout: TableLayoutType.FIXED,
  rows: [new TableRow({ children: [new TableCell({
    width: { size: BREDD, type: WidthType.DXA }, borders: { top: kant, bottom: kant, left: kant, right: kant },
    margins: { top: glapp, bottom: o.ned ?? glapp, left: sida, right: sida },
    children: [punkt(line, o.fore ?? {}), ramtabell(BREDD - 2 * sida, kant, e, 1, o.inreUtanNedre), punkt(o.efterLine ?? line, o.efter ?? {})],
  })] })],
}), etikett(e(3))];

// Linjen under titeln, 2000 twips bred och centrerad.
const indrag = (bredd) => ({ left: (BREDD - bredd) / 2, right: (BREDD - bredd) / 2 });
const titellinje = {
  dubbel: (e) => [etikett(e(0)), punkt(240, { indent: indrag(2000), border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: '8C2A1E', space: 1 } } }), etikett(e(1))],
  tvaStycken: (gap) => (e) => [etikett(e(0)),
    punkt(240, { indent: indrag(2000), border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '8C2A1E', space: 0 } } }),
    punkt(gap, { indent: indrag(1970), border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '8C2A1E', space: 0 } } }),
    etikett(e(1))],
  tabell: (hojd) => (e) => [etikett(e(0)), new Table({
    width: { size: 2000, type: WidthType.DXA }, columnWidths: [2000], layout: TableLayoutType.FIXED, alignment: AlignmentType.CENTER,
    rows: [new TableRow({ height: { value: hojd, rule: HeightRule.EXACT }, children: [new TableCell({
      width: { size: 2000, type: WidthType.DXA }, margins: { top: 0, bottom: 0, left: 0, right: 0 },
      borders: { top: { style: BorderStyle.SINGLE, size: 6, color: '8C2A1E' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: '8C2A1E' }, left: ingen, right: ingen },
      children: [punkt(240)],
    })] })],
  }), etikett(e(1))],
};

export const varianter = {
  A: { text: 'ramen med dubbel kant 12 (före K-157): dubbel i Word, en enda linje på 2 pt i Google', barn: (e) => [etikett(e(0)), ramtabell(BREDD, { style: BorderStyle.DOUBLE, size: 12, color: '4B3A2F' }, e, 1), etikett(e(3))] },
  B: { text: 'tabell i tabell, stycken på 1,5 pt över och under: Word räknar inte stycket efter den inre tabellen, och de nedre linjerna går ihop', barn: nastlad({ style: BorderStyle.SINGLE, size: 12, color: '4B3A2F' }, 0, 30, 295) },
  C: { text: 'tabell i tabell, stycken på 1,22 pt: samma som B', barn: nastlad({ style: BorderStyle.SINGLE, size: 12, color: '4B3A2F' }, 0, 30, 240) },
  I: { text: 'tabell i tabell, nedre mellanrummet som cellens marginal: dubbel i båda, men Googles stycken gör mellanrummen ojämna', barn: nastlad({ style: BorderStyle.SINGLE, size: 12, color: '4B3A2F' }, 0, 30, 295, { ned: 30, efterLine: 240 }) },
  J: { text: 'stycket efter den inre tabellen med luft före: Word räknar inte luften, linjerna går ihop', barn: nastlad({ style: BorderStyle.SINGLE, size: 12, color: '4B3A2F' }, 0, 30, 295, { efterLine: 240, efter: { spacing: { before: 30, after: 0, line: 240 } } }) },
  K: { text: 'den inre nedre linjen som kant på stycket efter tabellen: dubbel i Word, högre i Google', barn: nastlad({ style: BorderStyle.SINGLE, size: 12, color: '4B3A2F' }, 0, 30, 295, { inreUtanNedre: true, efterLine: 240, efter: { spacing: { before: 0, after: 30, line: 240 }, border: { top: { style: BorderStyle.SINGLE, size: 12, color: '4B3A2F', space: 0 } } } }) },
  L: { text: 'marginal 30 runt om, stycken med radavstånd 60: dubbel i båda, 0,34 pt skillnad', barn: nastlad({ style: BorderStyle.SINGLE, size: 12, color: '4B3A2F' }, 30, 30, 60) },
  M: { text: 'marginal 30 runt om, stycken med radavstånd 30 (dubbelRam i metoddocx.ts): dubbel i båda, lika hög i Word som A och 0,45 pt högre i Google', barn: nastlad({ style: BorderStyle.SINGLE, size: 12, color: '4B3A2F' }, 30, 30, 30) },
  D: { text: 'titellinjen med dubbel kant 6 (före K-157): dubbel i Word, enkel i Google', barn: titellinje.dubbel },
  E: { text: 'titellinjen av två stycken med enkel kant 6, det andra 0,75 pt högt (boksidans titellinje): dubbel i båda, 2,4 pt högre i Google', barn: titellinje.tvaStycken(147) },
  F: { text: 'titellinjen av två stycken med enkel kant 6, det andra 1,22 pt högt', barn: titellinje.tvaStycken(240) },
  N: { text: 'titellinjen av två stycken med enkel kant 6, det andra med radavstånd 60', barn: titellinje.tvaStycken(60) },
  O: { text: 'titellinjen av två stycken, det andra med radavstånd 30: linjerna nästan ihop i Word', barn: titellinje.tvaStycken(30) },
  G: { text: 'titellinjen som en tabellrad exakt 15 twips: Word slår ihop linjerna', barn: titellinje.tabell(15) },
  H: { text: 'titellinjen som en tabellrad exakt 30 twips: Word ritar en ruta', barn: titellinje.tabell(30) },
};

// Uppmätta radsteg i punkter, [Word, Google] (node scripts/matbank.mjs scripts/matbank/dubbellinje.mjs --facit).
export const vantat = { A: [23.21, 21.21], B: [22.68, 24.46], C: [22.61, 24.04], I: [23.2, 24.75], J: [22.72, 24.75], K: [22.21, 24.75], L: [23.32, 23.66], M: [23.29, 23.44], D: [16.68, 16.45], E: [15.72, 18.14], F: [16.2, 19.2], N: [15.24, 17.14], O: [15.12, 16.8], G: [13.68, 16.45], H: [14.4, 16.45] };
