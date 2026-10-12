// Litteraturlistan (Chambers boksamtal i grupp, metodriggens TILL-SAJTEN 2026-10-12). Niclas 2026-10-10: "Jag tycker inte
// det behövs en egen sida för varje bok. Utan bara översikten och en miniatyr framsida från förslagen senaste utgåva på
// svenska." En ramöversikt med fältet bilder är en litteraturlista: en bild per rad, bokens omslag, i en smal första
// kolumn utan rubrik. Cellerna har tre saker som sidan (Litteraturlista.astro), utskriften och Word (litteraturlista i
// metoddocx.ts) ritar likadant, ett till ett med riggens build-docx.js:
//   länkar, skrivna [text](https://…), och **fet** och *kursiv* text,
//   en cell som bara är ett tal, med en rad under ("12\n183 sidor"): talet stort i nivåns färg och raden liten och grå,
//   nivåns färg i rubrikraden, när ett led i ramens namn heter som en av metodens nivåer (nivaer).
// Inga Node-beroenden, så att den också kan köras i webbläsaren, där metodbankens samlade Word-fil byggs.
import type { Niva } from './nivaer';

export interface Inline { text: string; fet?: boolean; kursiv?: boolean; href?: string }
const INLINE = /(\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;
/** En rad i en cell i sina delar: vanlig text, fet, kursiv och länkar. */
export function inline(text: string): Inline[] {
  const ut: Inline[] = [];
  let forra = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > forra) ut.push({ text: text.slice(forra, m.index) });
    const lank = m[0].match(/^\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (lank) ut.push({ text: lank[1], href: lank[2] });
    else if (m[0].startsWith('**')) ut.push({ text: m[0].slice(2, -2), fet: true });
    else ut.push({ text: m[0].slice(1, -1), kursiv: true });
    forra = m.index + m[0].length;
  }
  if (forra < text.length) ut.push({ text: text.slice(forra) });
  return ut;
}
/** Radens text som läsaren ser den, utan markeringen och länkarnas adresser. */
export const utanInline = (text: string) => inline(text).map((d) => d.text).join('');

/** En cell som bara är ett tal, med en rad under: läspassen och bokens sidor. */
export function talcell(cell: string): { tal: string; under?: string } | undefined {
  const m = cell.trim().match(/^(\d+)(?:\n(.+))?$/);
  return m ? { tal: m[1], under: m[2] } : undefined;
}

/** Nivån i ramens namn: ett led mellan kolon och komma som heter som en av metodens nivåer ("Böckerna: Bas"). */
export function ramensNiva(rubrik: string, nivaer: Niva[]): Niva | undefined {
  const led = rubrik.split(/: |, /).map((x) => x.trim());
  return nivaer.find((n) => led.includes(n.namn));
}

/** Bildens adress på sajten. Sökvägen i metodens fil gäller metodens mapp, public/stodundervisning/<id>/. */
export const omslagAdress = (id: string, sokvag: string) => `/stodundervisning/${id}/${sokvag}`;

interface MedOversikt { ramar?: { ramar: { oversikt?: { bilder?: string[] } }[] } }
/** Litteraturlistornas bilder i en metod, för Word-filernas resurser (metodensBilder i ljudkort.ts). */
export const listornasBilder = (d: MedOversikt, id: string): string[] => (d.ramar?.ramar ?? []).flatMap((r) => (r.oversikt?.bilder ?? []).map((b) => omslagAdress(id, b)));

/** Bokens namn i en rad, till omslagets textalternativ: det feta i radens första cell, annars cellens första rad. */
export const radensNamn = (rad: string[]) => inline(rad[0] ?? '').find((d) => d.fet)?.text ?? utanInline((rad[0] ?? '').split('\n')[0]);

/** Kolumnernas andel av bredden, med bildens kolumn först. Utan bredder får bilden 11 procent och de andra delar på resten. */
export function kolumnandelar(kolumner: number, bredder?: number[]): number[] {
  const b = bredder?.length === kolumner + 1 ? bredder : [11, ...Array.from({ length: kolumner }, () => 89 / kolumner)];
  const summa = b.reduce((a, x) => a + x, 0);
  return b.map((x) => x / summa);
}

/** Bildens mått i bildpunkter ur filens huvud, för jpg och png. */
export function bildMatt(data: Uint8Array): { bredd: number; hojd: number; typ: 'jpg' | 'png' } | undefined {
  const v = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (data[0] === 0x89 && data[1] === 0x50) return { bredd: v.getUint32(16), hojd: v.getUint32(20), typ: 'png' };
  for (let i = 2; i < data.length - 9;) {
    if (data[i] !== 0xff) { i++; continue; }
    const kod = data[i + 1];
    if (kod >= 0xc0 && kod <= 0xc3) return { hojd: v.getUint16(i + 5), bredd: v.getUint16(i + 7), typ: 'jpg' };
    i += 2 + v.getUint16(i + 2);
  }
  return undefined;
}
