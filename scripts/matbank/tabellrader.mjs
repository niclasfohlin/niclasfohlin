// Tabellrader utan satt höjd, som lärarens protokoll (elevlista i metoddocx.ts): varför är de högre i Google (K-141)?
// Tio rader per variant, tre celler: etiketten och ett namn, ett x, och en tom skrivcell.
//   node scripts/matbank.mjs scripts/matbank/tabellrader.mjs
import { BorderStyle, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType } from 'docx';

export const namn = 'tabellrader';

const rader = (o = {}) => (e) => {
  const v = { kant: 4, marginal: 40, storlek: 22, celler: 3, line: undefined, ...o };
  const k = v.kant ? { style: v.stil ?? BorderStyle.SINGLE, size: v.kant, color: '999999' } : { style: BorderStyle.NIL, size: 0, color: 'auto' };
  const bredder = v.celler === 1 ? [9600] : [3200, 3200, 3200];
  return [new Table({
    width: { size: 9600, type: WidthType.DXA }, columnWidths: bredder, layout: TableLayoutType.FIXED,
    rows: Array.from({ length: 10 }, (_, i) => new TableRow({ cantSplit: true, children: bredder.map((b, j) => new TableCell({
      width: { size: b, type: WidthType.DXA }, borders: { top: k, bottom: k, left: k, right: k },
      margins: { top: [v.marginal].flat()[0], bottom: [v.marginal].flat().at(-1), left: 120, right: 120 },
      children: [new Paragraph({ spacing: { before: 0, after: 0, ...(v.line ? { line: v.line } : {}) }, children: [new TextRun({ text: j === 0 ? `${e(i)} Elev` : j === 1 ? 'x' : '', size: v.storlek })] })],
    })) })),
  })];
};

export const varianter = {
  A: { text: 'marginal 40, kant 4 (0,5 pt), 11 pt, tre celler: som protokollet', barn: rader() },
  B: { text: 'utan kanter', barn: rader({ kant: 0 }) },
  C: { text: 'marginal 0', barn: rader({ marginal: 0 }) },
  D: { text: 'kant 8 (1 pt)', barn: rader({ kant: 8 }) },
  E: { text: 'kant 6 (0,75 pt), marginal 45 (2,25 pt)', barn: rader({ kant: 6, marginal: 45 }) },
  F: { text: 'marginal 30', barn: rader({ marginal: 30 }) },
  G: { text: '10 pt i de ifyllda cellerna; den tomma cellens stycke är 11 pt och bestämmer raden', barn: rader({ storlek: 20 }) },
  H: { text: '12 pt', barn: rader({ storlek: 24 }) },
  I: { text: 'en cell', barn: rader({ celler: 1 }) },
  J: { text: 'radavstånd 241 (multipel)', barn: rader({ line: 241 }) },
  K: { text: 'kant 2 (0,25 pt)', barn: rader({ kant: 2 }) },
  L: { text: 'marginal 50 (2,5 pt)', barn: rader({ marginal: 50 }) },
  M: { text: 'marginal 60 (3 pt)', barn: rader({ marginal: 60 }) },
  N: { text: 'marginal 70 (3,5 pt)', barn: rader({ marginal: 70 }) },
  O: { text: 'marginal 80 (4 pt), som vanliga celler', barn: rader({ marginal: 80 }) },
  P: { text: 'marginal 100 (5 pt)', barn: rader({ marginal: 100 }) },
  Q: { text: 'marginal 120 (6 pt)', barn: rader({ marginal: 120 }) },
  R: { text: 'marginal 45 upptill och 50 nedtill, kant 4', barn: rader({ marginal: [45, 50] }) },
  S: { text: 'marginal 45, kant 4', barn: rader({ marginal: 45 }) },
  T: { text: 'marginal 80, kant 6 (0,75 pt)', barn: rader({ marginal: 80, kant: 6 }) },
  U: { text: 'marginal 35 (1,75 pt)', barn: rader({ marginal: 35 }) },
  V: { text: 'marginal 25 (1,25 pt)', barn: rader({ marginal: 25 }) },
  W: { text: 'kant 12 (1,5 pt)', barn: rader({ kant: 12 }) },
  X: { text: 'kant 24 (3 pt)', barn: rader({ kant: 24 }) },
  Y: { text: 'prickad kant 14 (1,75 pt)', barn: rader({ kant: 14, stil: BorderStyle.DOTTED }) },
  Z: { text: 'streckad kant 6 (0,75 pt)', barn: rader({ kant: 6, stil: BorderStyle.DASHED }) },
};

// Uppmätta radsteg i punkter, [Word, Google] (node scripts/matbank.mjs scripts/matbank/tabellrader.mjs --facit).
export const vantat = { A: [17.94, 18.68], B: [17.43, 17.93], C: [13.92, 14.18], D: [18.43, 18.68], E: [18.69, 18.68], F: [16.94, 17.18], G: [17.92, 18.68], H: [19.15, 19.9], I: [17.93, 18.68], J: [17.99, 18.73], K: [17.68, 18.68], L: [18.94, 18.68], M: [19.94, 20.18], N: [20.94, 21.68], O: [21.94, 21.68], P: [23.93, 24.68], Q: [25.94, 26.18], R: [18.68, 18.68], S: [18.43, 18.68], T: [22.18, 21.68], U: [17.43, 17.18], V: [16.43, 17.18], W: [18.93, 19.43], X: [20.43, 20.93], Y: [19.18, 19.43], Z: [18.18, 18.68] };
