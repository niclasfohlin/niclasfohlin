// Tabellrader med satt höjd, i Word och Google (reglerna om satt höjd och tabell i en cell i METODER.md under Word och
// Google Dokument): Word lägger cellmarginalerna upptill och nedtill ovanpå höjden, Google räknar in dem, och en tabell
// i en cell gör raden högre i Google. googleTabeller i metoddocx.ts flyttar marginalerna till höjden (variant B).
//   node scripts/matbank.mjs scripts/matbank/radhojd.mjs
import { BorderStyle, HeightRule, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, WidthType } from 'docx';

export const namn = 'radhojd';

const kant = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
const kanter = { top: kant, bottom: kant, left: kant, right: kant };
const inre = () => new Table({
  width: { size: 2000, type: WidthType.DXA }, columnWidths: [1000, 1000], layout: TableLayoutType.FIXED,
  rows: [new TableRow({ children: [0, 1].map(() => new TableCell({ width: { size: 1000, type: WidthType.DXA }, borders: kanter, children: [new Paragraph('·')] })) })],
});
// En rad: etiketten i första cellen, andra cellen tom eller med en inre tabell. kant ger en annan kant runt cellerna och
// under en nedre marginal efter att googleTabeller flyttat marginalerna (kantens bildpunkt).
const rader = (o) => (e) => { const k = o.kant ?? kant; const kanter = { top: k, bottom: k, left: k, right: k }; return [new Table({
  width: { size: 9600, type: WidthType.DXA }, columnWidths: [2300, 7300], layout: TableLayoutType.FIXED,
  rows: Array.from({ length: 6 }, (_, i) => new TableRow({ cantSplit: true, height: { value: o.hojd, rule: o.regel }, children: [
    new TableCell({ width: { size: 2300, type: WidthType.DXA }, borders: kanter, margins: { top: o.marginal, bottom: o.under ?? o.marginal, left: 120, right: 120 },
      children: [new Paragraph({ spacing: { before: o.luft ?? 0, after: o.luft ?? 0 }, children: [new TextRun({ text: e(i), bold: true, size: 20 })] })] }),
    new TableCell({ width: { size: 7300, type: WidthType.DXA }, borders: kanter, margins: { top: o.marginal, bottom: o.under ?? o.marginal, left: 120, right: 120 },
      children: o.inre ? [new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [new TextRun({ text: '', size: 2 })] }), inre(), new Paragraph({ spacing: { before: 0, after: 0, line: 240 }, children: [new TextRun({ text: '', size: 2 })] })] : [new Paragraph('')] }),
  ] })),
})]; };

export const varianter = {
  A: { text: 'minst 900, marginal 80 upptill och nedtill: Word lägger marginalerna ovanpå, Google räknar in dem', barn: rader({ hojd: 900, regel: HeightRule.ATLEAST, marginal: 80 }) },
  B: { text: 'minst 1060, marginal 0, stycket 80 före och efter: googleTabeller före bildpunkterna, nästan lika (K-141 tar resten)', barn: rader({ hojd: 1060, regel: HeightRule.ATLEAST, marginal: 0, luft: 80 }) },
  C: { text: 'exakt 1200, marginal 60: Word lägger den nedre marginalen ovanpå', barn: rader({ hojd: 1200, regel: HeightRule.EXACT, marginal: 60 }) },
  D: { text: 'minst 1200, inre tabell i cellen med stycken på en punkt runt: Google gör raden högre', barn: rader({ hojd: 1200, regel: HeightRule.ATLEAST, marginal: 0, inre: true }) },
  E: { text: 'minst 590 (29,5 pt), marginal 0', barn: rader({ hojd: 590, regel: HeightRule.ATLEAST, marginal: 0 }) },
  F: { text: 'minst 600 (30 pt), marginal 0', barn: rader({ hojd: 600, regel: HeightRule.ATLEAST, marginal: 0 }) },
  G: { text: 'minst 610 (30,5 pt), marginal 0', barn: rader({ hojd: 610, regel: HeightRule.ATLEAST, marginal: 0 }) },
  H: { text: 'minst 620 (31 pt), marginal 0', barn: rader({ hojd: 620, regel: HeightRule.ATLEAST, marginal: 0 }) },
  I: { text: 'exakt 610 (30,5 pt), marginal 0', barn: rader({ hojd: 610, regel: HeightRule.EXACT, marginal: 0 }) },
  J: { text: 'exakt 600, nedre marginal 15 (kantens bildpunkt): lika i båda', barn: rader({ hojd: 600, regel: HeightRule.EXACT, marginal: 0, under: 15 }) },
  K: { text: 'exakt 600, prickad kant 14 (1,75 pt, vikkortets viklinje)', barn: rader({ hojd: 600, regel: HeightRule.EXACT, marginal: 0, kant: { style: BorderStyle.DOTTED, size: 14, color: '999999' } }) },
  L: { text: 'exakt 600, kant 12 (1,5 pt)', barn: rader({ hojd: 600, regel: HeightRule.EXACT, marginal: 0, kant: { style: BorderStyle.SINGLE, size: 12, color: '999999' } }) },
  M: { text: 'exakt 600, kant 24 (3 pt)', barn: rader({ hojd: 600, regel: HeightRule.EXACT, marginal: 0, kant: { style: BorderStyle.SINGLE, size: 24, color: '999999' } }) },
  N: { text: 'exakt 600, streckad kant 6 (0,75 pt, kortens klipplinje)', barn: rader({ hojd: 600, regel: HeightRule.EXACT, marginal: 0, kant: { style: BorderStyle.DASHED, size: 6, color: '999999' } }) },
  O: { text: 'minst 600, prickad kant 14', barn: rader({ hojd: 600, regel: HeightRule.ATLEAST, marginal: 0, kant: { style: BorderStyle.DOTTED, size: 14, color: '999999' } }) },
  P: { text: 'minst 600, kant 12 (1,5 pt)', barn: rader({ hojd: 600, regel: HeightRule.ATLEAST, marginal: 0, kant: { style: BorderStyle.SINGLE, size: 12, color: '999999' } }) },
  Q: { text: 'exakt 600, prickad kant 14, nedre marginal 30', barn: rader({ hojd: 600, regel: HeightRule.EXACT, marginal: 0, under: 30, kant: { style: BorderStyle.DOTTED, size: 14, color: '999999' } }) },
};

// Uppmätta radsteg i punkter, [Word, Google] (node scripts/matbank.mjs scripts/matbank/radhojd.mjs --facit).
export const vantat = { A: [53.53, 45.75], B: [53.53, 54], C: [63.01, 60.75], D: [60.51, 60.75], E: [30.01, 30], F: [30.51, 30.75], G: [31.01, 31.5], H: [31.51, 31.5], I: [30.52, 31.5], J: [30.75, 30.75], K: [30, 31.5], L: [30, 31.5], M: [30, 33], N: [30.01, 30.75], O: [31.76, 31.5], P: [31.5, 31.5], Q: [31.52, 31.5] };
