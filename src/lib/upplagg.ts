// Taggarnas slag, metodens upplägg och om den kan göras i klass (K-463; Niclas 2026-10-19: "bättre stringens för taggarna
// och vad som tränas i Stödundervisning", "Intensivträning är något som sker 30min eller kortare 3-5 dagar i veckan för
// att höja en förmåga", "Intensivträning eller lektionsupplägg ... Sedan sådana som man KAN göra i klass och sådan man
// bara KAN genomföra i grupp", och om Problemlösning och de sociala metoderna: "Problemlösning har väl lektioner i sig som
// man upprepar? ... De är inte intensivträning och inte riktigt lektioner").
//
// Varje tagg har ett slag i src/data/taggar.json: förmåga (det eleven tränar, listan Tränar i metodbanken), upplägg (hur
// insatsen går till över veckorna, listan Upplägg), arbetssätt (ett sätt att arbeta i passet, som Textsamtal) eller ämne
// (det artiklar och böcker handlar om). En metod har minst en förmåga och inget ämne.
//
// En metod har exakt ett upplägg, och det prövas mot faktarutans tid där tiden avgör. Intensivträning är pass på högst 30
// minuter tre till fem dagar i veckan, åt båda hållen. Lektionsupplägg är planerade lektioner som upprepas med nytt
// innehåll, med pass på minst 30 minuter, och en metod med pass på minst 40 minuter har det. Återkommande pass är korta
// pass, högst 40 minuter, en eller två gånger i veckan. Där tiden rymmer både Lektionsupplägg och Återkommande pass, som
// 30 minuter två gånger i veckan, avgör innehållet: lektioner med något att lära ut, eller gruppens egna samtal och
// aktiviteter. Ingen tagg sätts av sig själv (Niclas 2026-10-03); felet säger vad som ska ändras.
//
// Om metoden kan göras i klass står i fältet format (helklass), som faktarutan visar; en metod utan helklass görs bara i
// grupp. Reglerna står i ARBETSSATT.md under Innehåll.
import taggarData from '../data/taggar.json';
// Tolkningen av tiden och uppläggens gränser står i standarden, som metodriggen också läser (src/lib/standard/).
import { ATERKOMMANDE, ATERKOMMANDE_MINUTER, INTENSIV, INTENSIV_DAGAR, INTENSIV_MINUTER, LEKTION_MINST, LEKTIONER, mojligaUpplagg } from './standard/index.js';
export { ATERKOMMANDE, ATERKOMMANDE_DAGAR, ATERKOMMANDE_MINUTER, INTENSIV, INTENSIV_DAGAR, INTENSIV_MINUTER, LEKTION_MINST, LEKTION_MINUTER, LEKTIONER, arIntensiv, arLektioner, mojligaUpplagg, tidensMatt } from './standard/index.js';

export type Slag = 'förmåga' | 'upplägg' | 'arbetssätt' | 'ämne';
export const SLAG: Slag[] = ['förmåga', 'upplägg', 'arbetssätt', 'ämne'];
const slagAv = new Map<string, Slag>(taggarData.taggar.map((t) => [t.id, t.slag as Slag]));
export const taggensSlag = (id: string): Slag | undefined => slagAv.get(id);

const KRAV: Record<string, string> = {
  [INTENSIV]: `pass på högst ${INTENSIV_MINUTER} minuter, ${INTENSIV_DAGAR[0]} till ${INTENSIV_DAGAR[1]} dagar i veckan`,
  [LEKTIONER]: `pass på minst ${LEKTION_MINST} minuter som inte är intensivträning`,
  [ATERKOMMANDE]: `pass på högst ${ATERKOMMANDE_MINUTER} minuter, en eller två gånger i veckan`,
};

/** Kan metoden göras i klass, eller bara i grupp? Ur fältet format. */
export const kanGorasIKlass = (d: { format?: string[] }) => (d.format ?? []).includes('helklass');

/** Felen i en metods taggar: ett ämne, ingen förmåga, eller ett upplägg som inte stämmer med tiden. */
export function metodensTaggfel(d: { taggar: string[]; tid?: string }): string[] {
  const fel: string[] = [];
  for (const t of d.taggar) if (taggensSlag(t) === 'ämne') fel.push(`Taggen "${t}" är ett ämne för artiklar och böcker. En metod taggas med det eleven tränar, upplägget och arbetssättet (slag förmåga, upplägg eller arbetssätt i src/data/taggar.json).`);
  if (!d.taggar.some((t) => taggensSlag(t) === 'förmåga')) fel.push('Metoden har ingen förmåga bland taggarna. Lägg till det eleven tränar (slag förmåga i src/data/taggar.json, npm run taggar).');
  const tid = d.tid ?? 'inte ifylld';
  const upplagg = d.taggar.filter((t) => taggensSlag(t) === 'upplägg');
  const mojliga = mojligaUpplagg(d.tid);
  if (!d.tid) fel.push('Faktarutans tid saknas, och upplägget prövas mot den. Skriv tiden som "<passets längd> per pass, <hur ofta> i veckan".');
  if (upplagg.length !== 1) fel.push(`Metoden har ${upplagg.length ? `${upplagg.length} upplägg (${upplagg.join(', ')})` : 'inget upplägg'}. Den ska ha exakt ett: ${[INTENSIV, LEKTIONER, ATERKOMMANDE].join(', ')}${mojliga.length ? `, och faktarutans tid, "${tid}", rymmer ${mojliga.join(' eller ')}` : ''}.`);
  for (const u of upplagg) if (!mojliga.includes(u)) fel.push(`Taggen ${u} kräver ${KRAV[u] ?? 'ett annat upplägg'}, och faktarutans tid är "${tid}". ${mojliga.length ? `Tiden rymmer ${mojliga.join(' eller ')}.` : 'Skriv tiden som metoden är.'}`);
  return fel;
}
