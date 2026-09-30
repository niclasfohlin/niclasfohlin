// Radavståndet i stycken, i Word och Google (regeln om radavstånd i METODER.md under Word och Google Dokument): enkelt
// radavstånd är lika högt i båda i Calibri, Andika och Arial, och exakt radavstånd läser Google som en multipel.
//   node scripts/matbank.mjs scripts/matbank/radavstand.mjs
import { readFileSync } from 'node:fs';
import { LineRuleType, Paragraph, TextRun } from 'docx';

export const namn = 'radavstand';
// Andika följer med i filen, som i sajtens Word-filer (elevens typsnitt, src/lib/ljudkort.ts).
export const typsnitt = [{ name: 'Andika', data: readFileSync(new URL('../../public/fonts/ljudlek-elev/LjudlekElev-Regular.ttf', import.meta.url)) }];

const stycken = (font, storlek, spacing = {}) => (e) => Array.from({ length: 8 }, (_, i) => new Paragraph({
  spacing: { before: 0, after: 0, ...spacing },
  children: [new TextRun({ text: `${e(i)} en rad text`, font, size: storlek })],
}));

export const varianter = {
  A: { text: 'Calibri 11 pt, inget radavstånd angivet', barn: stycken('Calibri', 22) },
  B: { text: 'Calibri 11 pt, enkelt (line 240)', barn: stycken('Calibri', 22, { line: 240 }) },
  C: { text: 'Andika 14 pt, enkelt', barn: stycken('Andika', 28, { line: 240 }) },
  D: { text: 'Arial 11 pt, enkelt', barn: stycken('Arial', 22, { line: 240 }) },
  E: { text: 'Calibri 11 pt, multipel 1,5 (line 360)', barn: stycken('Calibri', 22, { line: 360 }) },
  F: { text: 'Calibri 11 pt, exakt 20 pt (line 400 exact): Google läser multipel 400/240', barn: stycken('Calibri', 22, { line: 400, lineRule: LineRuleType.EXACT }) },
  G: { text: 'Calibri 11 pt, minst 20 pt (line 400 atLeast)', barn: stycken('Calibri', 22, { line: 400, lineRule: LineRuleType.AT_LEAST }) },
};
