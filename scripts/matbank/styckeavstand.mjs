// Styckeavstånd i Word och Google: avrundar Google avståndet före och efter ett stycke till hela bildpunkter (0,75 pt),
// som cellmarginalerna (tabellrader.mjs)? Åtta stycken per variant i Calibri 11 pt utan angivet radavstånd.
//   node scripts/matbank.mjs scripts/matbank/styckeavstand.mjs
import { Paragraph, TextRun } from 'docx';

export const namn = 'styckeavstand';

const stycken = (efter, fore = 0) => (e) => Array.from({ length: 8 }, (_, i) => new Paragraph({
  spacing: { before: fore, after: efter },
  children: [new TextRun({ text: `${e(i)} en rad text`, size: 22 })],
}));

export const varianter = {
  A: { text: 'efter 0', barn: stycken(0) },
  B: { text: 'efter 20 (1 pt)', barn: stycken(20) },
  C: { text: 'efter 40 (2 pt)', barn: stycken(40) },
  D: { text: 'efter 60 (3 pt)', barn: stycken(60) },
  E: { text: 'efter 80 (4 pt)', barn: stycken(80) },
  F: { text: 'efter 100 (5 pt)', barn: stycken(100) },
  G: { text: 'efter 120 (6 pt)', barn: stycken(120) },
  H: { text: 'efter 200 (10 pt)', barn: stycken(200) },
  I: { text: 'före 40 och efter 40', barn: stycken(40, 40) },
  J: { text: 'efter 35 (1,75 pt)', barn: stycken(35) },
};
