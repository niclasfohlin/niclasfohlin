// Ramarnas form som sidan (Metod.astro, utskriften) och Word-filerna (metoddocx.ts) delar. Inga Node-beroenden.
import { arProtokoll } from './metod';

type Ram = {
  huvud?: { rubrik: string; text: string }[];
  delar: { rubrik: string; falt: { rubrik: string; text: string }[] }[];
  listor?: { rubrik?: string; kolumner?: string[]; rader: string[][] }[];
};

// Ett protokoll vars not och listor inte ryms på ett A4 delas: noten (frågorna) på en sida och huvudet (elevens namn) med
// listorna på nästa, så att sidan med tabellerna går att kopiera per elev, som i metodriggen (Protokollet för
// screeningen och ljudkollen i Ljudlek i grupp, granskningen 2026-09-29). Ryms allt står noten kvar med listorna på samma
// sida, som i Upprepad läsning (K-071). Höjden räknas grovt: en rad not om 95 tecken är 0,5 cm och en tabellrad 0,75 cm,
// och en sida har omkring 22 cm för ramen.
export function protokollDelas(ram: Ram): boolean {
  const listor = ram.listor ?? [];
  if (!listor.length || !listor.every(arProtokoll) || !ram.huvud?.length || !ram.delar.length) return false;
  const tecken = ram.delar.flatMap((d) => d.falt).reduce((a, f) => a + f.rubrik.length + f.text.length, 0);
  const rader = listor.reduce((a, l) => a + l.rader.length + (l.kolumner ? 1 : 0) + 1, 0);
  return (tecken / 95) * 0.5 + rader * 0.75 > 22;
}
