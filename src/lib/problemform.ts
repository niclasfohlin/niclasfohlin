// Problemens tre blad (Problemlösning i grupp, metodriggens TILL-SAJTEN 2026-10-10, Det nya punkt 1–3), med samma regler
// som riggens build/modell.mjs, så att riggens metodfil fungerar som den är. Sidan och utskriften (Metod.astro,
// Problemsida.astro, Textpar.astro) och Word-filerna (metoddocx.ts) frågar här, så att formerna inte kan glida isär.
//   Problemets sida: en lästext (lastexter i ramform.ts) vars vad börjar med problem och som har en bild På bordet med
//   efter "ram: <ramens rubrik>". Bilden står mellan problemet och frågan, utan anfang.
//   Två lösningar: två texter (textparAv) i en ram som heter "Två lösningar: <nivå>, <vad>, <titel>", med två bilder På
//   bordet vid ramen, lösning A och B i nummerordning. Elevens blad har de ritade lösningarna, på ett liggande A4, utan
//   lärarens sida före.
//   Lärarens sida till ett problem: en ram som heter "Lärarens sida: <nivå>, <vad>, <titel>" där vad börjar med problem.
//   Problemet och frågorna står först i en ruta, ur problemets egen ram, och de två lösningarna bredvid varandra efter
//   ramens text, med namnen ur ramen Två lösningar.
// Inga Node-beroenden: Word-filen av flera metoder byggs i webbläsaren med samma regler.
import { lastexter, textparAv, type Lastext, type Textpar } from './ramform';
import { paBordetVid, type PaBordet } from './pabordet';

type Ram = Parameters<typeof lastexter>[0][number] & Parameters<typeof textparAv>[0];

export const arProblem = (vad: string) => /^problem(\s|$)/i.test(vad);

export interface Problemformer {
  /** Problemets bild, när ramen är problemets sida. */
  bild: (ram: Ram) => PaBordet | undefined;
  /** Två lösningar: texterna och de två bilderna, när ramen är bladet Två lösningar. */
  losningar: (ram: Ram) => { par: Textpar; bilder: PaBordet[] } | undefined;
  /** Lärarens sida till ett problem: problemets stycken och frågor, och lösningarnas bilder med sina namn. */
  larare: (ram: Ram) => { l: Lastext; bilder: PaBordet[]; namn: string[] } | undefined;
}

export function problemformer(ramar: Ram[], bilder: PaBordet[]): Problemformer {
  const texter = lastexter(ramar);
  const losningsbilder = (rubrik: string) => (/^Två lösningar:/.test(rubrik) ? paBordetVid(bilder, { ram: rubrik }) : []);
  return {
    bild: (ram) => { const l = texter.get(ram); return l && arProblem(l.vad) ? paBordetVid(bilder, { ram: ram.rubrik })[0] : undefined; },
    losningar: (ram) => {
      const par = textparAv(ram);
      const b = par ? losningsbilder(ram.rubrik) : [];
      return par && b.length === 2 ? { par, bilder: b } : undefined;
    },
    larare: (ram) => {
      const m = ram.rubrik.match(/^Lärarens sida: (.+)$/);
      if (!m) return undefined;
      const pram = ramar.find((x) => { const l = texter.get(x); return !!l && arProblem(l.vad) && `${l.niva}, ${l.vad}, ${l.titel}` === m[1]; });
      if (!pram) return undefined;
      const tva = ramar.find((x) => x.rubrik === `Två lösningar: ${m[1]}`);
      const b = tva ? losningsbilder(tva.rubrik) : [];
      return { l: texter.get(pram)!, bilder: b.length === 2 ? b : [], namn: (tva?.listor?.[0]?.kolumner ?? []).map(String) };
    },
  };
}

/** Raden Till läraren under bladet Två lösningar: ramens rutor, som på problemets sida. */
export const losningarnasNot = (ram: { delar: { rubrik: string; falt: { rubrik: string; text: string }[] }[] }) =>
  ram.delar.map((del) => `${del.rubrik} · ${del.falt.map((f) => `${f.rubrik}: ${f.text}`).join(' ')}`).join(' ');
/** Nivån och vad ur "Två lösningar: Bas, problem 1, Äpplena", till knappen i sidfoten. */
export const losningarnasNiva = (rubrik: string) => { const m = rubrik.match(/^Två lösningar: ([^,]+), ([^,]+), (.+)$/); return m ? { niva: m[1], vad: m[2], titel: m[3] } : undefined; };
