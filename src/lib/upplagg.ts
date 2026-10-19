// Taggarnas slag, metodens upplägg och om den kan göras i klass (K-463; Niclas 2026-10-19: "bättre stringens för taggarna
// och vad som tränas i Stödundervisning", "Intensivträning är något som sker 30min eller kortare 3-5 dagar i veckan för
// att höja en förmåga", och "Intensivträning eller lektionsupplägg ... Sedan sådana som man KAN göra i klass och sådan
// man bara KAN genomföra i grupp").
//
// Varje tagg har ett slag i src/data/taggar.json: förmåga (det eleven tränar, listan Tränar i metodbanken), upplägg (hur
// insatsen går till över veckorna, listan Upplägg), arbetssätt (ett sätt att arbeta i passet, som Textsamtal) eller ämne
// (det artiklar och böcker handlar om). En metod har minst en förmåga och inget ämne.
//
// Uppläggen prövas mot faktarutans tid åt båda hållen, så att en metod har taggen när tiden säger det och bara då:
// Intensivträning är pass på högst 30 minuter tre till fem dagar i veckan, och Lektionsupplägg pass på minst 40 minuter.
// En metod däremellan, som 30 minuter två gånger i veckan, har inget av dem. Ingen tagg sätts av sig själv (Niclas
// 2026-10-03); felet säger vad som ska ändras.
//
// Om metoden kan göras i klass står i fältet format (helklass), som faktarutan visar; en metod utan helklass görs bara i
// grupp. Reglerna står i ARBETSSATT.md under Innehåll.
import taggarData from '../data/taggar.json';

export type Slag = 'förmåga' | 'upplägg' | 'arbetssätt' | 'ämne';
export const SLAG: Slag[] = ['förmåga', 'upplägg', 'arbetssätt', 'ämne'];
const slagAv = new Map<string, Slag>(taggarData.taggar.map((t) => [t.id, t.slag as Slag]));
export const taggensSlag = (id: string): Slag | undefined => slagAv.get(id);

export const INTENSIV = 'intensivtraning';
export const LEKTIONER = 'lektionsupplagg';
export const INTENSIV_MINUTER = 30;
export const INTENSIV_DAGAR = [3, 5] as const;
export const LEKTION_MINUTER = 40;

const TAL: Record<string, number> = { en: 1, ett: 1, två: 2, tre: 3, fyra: 4, fem: 5, sex: 6, sju: 7 };

/**
 * Passets längd och hur ofta, ur faktarutans tid ("30 minuter per pass, tre till fem pass i veckan"): det kortaste och
 * det längsta passet i minuter, och det minsta antalet dagar i veckan som texten anger. "varje dag" är fem. Ett värde
 * som inte går att läsa är undefined.
 */
export function tidensMatt(tid: string): { minst?: number; minuter?: number; perVecka?: number } {
  const t = tid.toLowerCase();
  const min = t.match(/(\d+)(?:\s*[–-]\s*(\d+))?\s*minuter/);
  const minst = min ? Number(min[1]) : undefined;
  const minuter = min ? Number(min[2] ?? min[1]) : undefined;
  const ganger: number[] = [];
  if (/varje dag/.test(t)) ganger.push(5);
  for (const del of t.split(/,|\boch\b/)) {
    if (!/i veckan/.test(del)) continue;
    // Gränserna är Unicode, eftersom \b inte ser å som en bokstav ("två" lästes förbi och "tre" blev talet).
    const forsta = del.match(/(?<![\p{L}\d])(\d+|en|ett|två|tre|fyra|fem|sex|sju)(?![\p{L}\d])/u);
    if (forsta) ganger.push(/^\d+$/.test(forsta[1]) ? Number(forsta[1]) : TAL[forsta[1]]);
  }
  return { minst, minuter, perVecka: ganger.length ? Math.min(...ganger) : undefined };
}

/** Är faktarutans tid intensivträning: pass på högst 30 minuter, tre till fem dagar i veckan? */
export function arIntensiv(tid: string | undefined): boolean {
  if (!tid) return false;
  const { minuter, perVecka } = tidensMatt(tid);
  return minuter !== undefined && perVecka !== undefined && minuter <= INTENSIV_MINUTER && perVecka >= INTENSIV_DAGAR[0] && perVecka <= INTENSIV_DAGAR[1];
}

/** Är faktarutans tid ett lektionsupplägg: pass på minst 40 minuter? */
export function arLektioner(tid: string | undefined): boolean {
  if (!tid) return false;
  const { minst } = tidensMatt(tid);
  return minst !== undefined && minst >= LEKTION_MINUTER;
}

/** Kan metoden göras i klass, eller bara i grupp? Ur fältet format. */
export const kanGorasIKlass = (d: { format?: string[] }) => (d.format ?? []).includes('helklass');

/** Felen i en metods taggar: ett ämne, ingen förmåga, eller ett upplägg som inte stämmer med tiden. */
export function metodensTaggfel(d: { taggar: string[]; tid?: string }): string[] {
  const fel: string[] = [];
  for (const t of d.taggar) if (taggensSlag(t) === 'ämne') fel.push(`Taggen "${t}" är ett ämne för artiklar och böcker. En metod taggas med det eleven tränar, upplägget och arbetssättet (slag förmåga, upplägg eller arbetssätt i src/data/taggar.json).`);
  if (!d.taggar.some((t) => taggensSlag(t) === 'förmåga')) fel.push('Metoden har ingen förmåga bland taggarna. Lägg till det eleven tränar (slag förmåga i src/data/taggar.json, npm run taggar).');
  const tid = d.tid ?? 'inte ifylld';
  const regler: [string, boolean, string][] = [
    [INTENSIV, arIntensiv(d.tid), `pass på högst ${INTENSIV_MINUTER} minuter, ${INTENSIV_DAGAR[0]} till ${INTENSIV_DAGAR[1]} dagar i veckan`],
    [LEKTIONER, arLektioner(d.tid), `pass på minst ${LEKTION_MINUTER} minuter`],
  ];
  for (const [tagg, passar, krav] of regler) {
    const har = d.taggar.includes(tagg);
    if (passar && !har) fel.push(`Faktarutans tid, "${tid}", är ${krav}. Lägg till taggen ${tagg}.`);
    if (!passar && har) fel.push(`Taggen ${tagg} kräver ${krav}, och faktarutans tid är "${tid}". Ta bort taggen, eller skriv tiden som metoden är.`);
  }
  return fel;
}
