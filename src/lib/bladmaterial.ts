// Ramar med blad (Faktatextsamtal i grupp, metodriggens TILL-SAJTEN 2026-10-13, Det nya punkt 3 och 4): de fem modellerna,
// var och en med en sida, ett exempel om skolan och tre blad att skriva ut. Ramar som delar ledet före kolon ("Modellen:
// Tankekartan", "Modellen: Tidslinjen"), står i följd i filen och har blad vid sig (en bild På bordet vars rubrik börjar
// med "Blad: " och efter "ram: <ramens rubrik>", arBlad i pabordet.ts) är ett bladmaterial. Varje sådan ram har en egen
// sida, /stodundervisning/<id>/<namn> ([id]/[enhet].astro), med ramen, exemplet och bladen, var och en med en knapp som
// skriver ut bara det bladet, som en text i en bank har sin sida (Niclas 2026-10-13, om modellerna skulle stå som rader med
// allt i eller få egna sidor "likt texterna": "Jag tycker de få egna sidor."). På metodens sida står ramarna som en rad
// som fälls ut till länkarna och filerna (Bladgrupp.astro, bankens stilar), i samma form som en nivå med sina texter.
// Regeln har inga egna fält, så en ny metod får sidorna av sig själv. Villkoren: minst två ramar i följd
// med samma led, och varje ram i gruppen har minst ett blad. Det första ledet som uppfyller det gäller. Annars står
// ramarna var för sig med sina blad efter sig, som förut.
// Ramarna och bladen finns också som egna filer, Word och pdf (bladfiler; Niclas 2026-10-13: "Modeller (bara de tre tomma
// mallarna) Beskrivning (Exempel + beskrivningen av modellen) båda i docx och pdf", och om förslaget med filerna också i
// varje rad: "Nedladdning och även nedladdning bland länkarna"): bladen för sig, de tomma, ett per liggande sida, och
// sidorna för sig, ramen med sitt ifyllda blad. En fil av varje slag för alla ramarna, i nedladdningsrutan, och en av
// varje för var och en, sist i ramens rad. Bladen kopieras och skrivs ut på A3 eller fylls i på dator, flera gånger;
// sidan och exemplet läser och visar läraren en gång. Inga Node-beroenden.
import { arIfylltBlad, bladNamn, bladVid, metodensPaBordet, type PaBordet } from './pabordet';
import type { MetodData } from './metod';
import { bankAv } from './bank';
import { metodensNivamaterial } from './nivamaterial';
import { slugAv, UPPTAGNA_LED } from './standard/index.js';

type Ram = { rubrik: string };
/** En ram med blad: ramens plats, namnet efter ledet (Tankekartan), bladen i bildernas ordning och hur många som är tomma. */
export interface Bladrad { ri: number; namn: string; slug: string; blad: PaBordet[]; tomma: number }
/** Metodens ramar med blad: ledet före kolon (Modellen), raderna och alla ramarna. */
export interface Bladmaterial { led: string; rader: Bladrad[]; ramar: Set<number>; forst: number }

// Adressens led ur standarden (src/lib/standard/), samma för alla adresser ur namn (K-416).
const slug = slugAv;

// Ledets former, som raden, tabellen i nedladdningsrutan, filerna och ramens sida heter efter: Modellen blir Modellerna,
// modeller och Modellens sida. Ett nytt led läggs till här.
const LED: Record<string, { alla: string; flera: string; sida: string }> = { Modellen: { alla: 'Modellerna', flera: 'modeller', sida: 'Modellens sida' } };
const ledets = (bm: Pick<Bladmaterial, 'led'>) => {
  const former = LED[bm.led];
  if (!former) throw new Error(`Ramarna med blad heter "${bm.led}: …", som src/lib/bladmaterial.ts inte har former för. Lägg till ledet i LED (Modellen: Modellerna, modeller, Modellens sida).`);
  return former;
};
export const ledFlera = (bm: Pick<Bladmaterial, 'led'>) => ledets(bm).alla;
/** Antalet ramar med ledets ord: "5 modeller". */
export const ledAntal = (bm: Bladmaterial) => `${bm.rader.length} ${ledets(bm).flera}`;
/** Ramens namn på sin egen sida: "Modellens sida". */
export const ledSida = (bm: Pick<Bladmaterial, 'led'>) => ledets(bm).sida;
/** Radens ankare på metodens sida, som en rams sida leder tillbaka till: modellerna. */
export const gruppId = (bm: Pick<Bladmaterial, 'led'>) => slug(ledFlera(bm));
/** Ramens egen sida. */
export const bladsidaAdress = (id: string, rad: Pick<Bladrad, 'slug'>) => `/stodundervisning/${id}/${rad.slug}`;
// Bladets namn på ramens sida, utan ramens namn: "Tankekartan 1: fyra delar" blir Blad 1 (kort) och Blad 1: fyra delar
// (rubriken), och "Tankekartan, exemplet om skolan" blir Exemplet.
const bladRest = (rad: Pick<Bladrad, 'namn'>, b: PaBordet) => { const namn = bladNamn(b); return namn.startsWith(rad.namn) ? namn.slice(rad.namn.length).trim() : namn; };
export const bladKort = (rad: Pick<Bladrad, 'namn'>, b: PaBordet) => {
  const rest = bladRest(rad, b);
  const nr = rest.match(/^(\d+)(?!\d)/);
  if (nr) return `Blad ${nr[1]}`;
  const ord = rest.replace(/^[,:] */, '').split(/[ ,:]/)[0];
  return ord ? ord.charAt(0).toLocaleUpperCase('sv') + ord.slice(1) : bladNamn(b);
};
export const bladRubrik = (rad: Pick<Bladrad, 'namn'>, b: PaBordet) => {
  const m = bladRest(rad, b).match(/^(\d+)(?!\d)[: ]*(.*)$/);
  return m ? `Blad ${m[1]}${m[2] ? `: ${m[2]}` : ''}` : bladKort(rad, b);
};
const TAL = ['', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio'];
/** Raden för alla ramarna i nedladdningsrutans tabell: "Alla fem". */
export const allaRader = (bm: Bladmaterial) => `Alla ${TAL[bm.rader.length] ?? bm.rader.length}`;
/** Har ramarna ifyllda blad, som exemplet om skolan? Då heter den andra filen efter sidan och exemplet. */
export const harExempel = (bm: Bladmaterial) => bm.rader.some((r) => r.blad.some(arIfylltBlad));
/** En fil ur bladmaterialet: de tomma bladen (bilder, numren i pabordet) eller ramarna med sina ifyllda blad (ramar), för
 * en rad eller för alla. sidor: hur många sidor filen ska ha, minst och högst, som scripts/bankpdf.mjs prövar. */
/** Enheterna i banken och ramarna med blad som hör ihop: de står på samma rad i en fri tabell, som en text och veckans
 * modell i tabellen Texterna, vecka för vecka (Faktatextsamtal i grupp). En cell är en enhet när den är precis en enhets
 * titel, och en ram när den är ramens namn, med eller utan ett nummer före, som länkarna i tabellen (cellLank i
 * Metod.astro). Textens sida leder så till veckans modell och modellens sida till sina texter (granskningen 2026-10-13:
 * lärarens sida sa "modellen är Tankekartan, blad 1" som ren text, och läraren fick gå tillbaka till metodens sida). */
export function bladpar(d: MetodData, bm: Bladmaterial): { enhet: number; rad: Bladrad }[] {
  const bank = bankAv(d);
  if (!bank) return [];
  const par: { enhet: number; rad: Bladrad }[] = [];
  for (const t of d.tabeller ?? []) for (const r of t.rader) {
    const celler = r.map((c) => String(c ?? '').replace(/\s+/g, ' ').trim());
    const enheter = celler.flatMap((c) => { const x = bank.enheter.filter((e) => e.l.titel === c); return x.length === 1 ? [x[0].ri] : []; });
    const rader = celler.flatMap((c) => { const x = bm.rader.find((y) => y.namn === c.replace(/^\d+\.? /, '')); return x ? [x] : []; });
    for (const enhet of enheter) for (const rad of rader) if (!par.some((p) => p.enhet === enhet && p.rad === rad)) par.push({ enhet, rad });
  }
  return par;
}

export interface Bladfil { namn: string; rad?: Bladrad; slag: 'blad' | 'sidor'; rubrik: string; huvud: string; ramar: number[]; bilder: number[]; minst: number; hogst: number }
export function bladfiler(id: string, bm: Bladmaterial): Bladfil[] {
  const flera = ledFlera(bm);
  const exempel = harExempel(bm);
  return [undefined, ...bm.rader].flatMap((rad) => {
    const rader = rad ? [rad] : bm.rader;
    const bas = `${id}-${slug(flera)}-${rad ? rad.slug : 'alla'}`;
    const huvud = rad ? rad.namn : flera;
    const tomma = rader.flatMap((r) => r.blad.filter((b) => !arIfylltBlad(b)).map((b) => b.bild.nr));
    const ifyllda = rader.reduce((s, r) => s + r.blad.filter(arIfylltBlad).length, 0);
    const sidorna = rad ? (exempel ? 'sidan och exemplet' : 'sidan') : (exempel ? 'sidorna och exemplen' : 'sidorna');
    return [
      ...(tomma.length ? [{ namn: `${bas}-blad`, rad, slag: 'blad' as const, rubrik: `${huvud}: bladen`, huvud, ramar: [], bilder: tomma, minst: tomma.length, hogst: tomma.length }] : []),
      // Ramen är ett A4 i Word och får ta två, och varje ifyllt blad är en sida.
      { namn: `${bas}-sidor`, rad, slag: 'sidor' as const, rubrik: `${huvud}: ${sidorna}`, huvud, ramar: rader.map((r) => r.ri), bilder: [], minst: rader.length + ifyllda, hogst: rader.length * 2 + ifyllda },
    ];
  });
}

/** Metodens bladmaterial med sidans villkor: bankens ramar och nivåernas material står redan på sina ställen. Sidan,
 * nedladdningsrutan, filerna och det övriga materialet (src/lib/ovrigt.ts) frågar här, så att de alltid ser samma rader. */
export function metodensBladmaterial(d: MetodData, id: string): Bladmaterial | undefined {
  if (!d.ramar) return undefined;
  const bank = bankAv(d);
  const nm = metodensNivamaterial(d);
  const bm = bladmaterial(d.ramar.ramar, metodensPaBordet(d, id), (ri) => (!!bank && (bank.ramar.has(ri) || bank.oversikter.has(ri))) || !!nm?.ramar.has(ri));
  // Ramens sida har ramens namn som adress, och den får inte krocka med en enhets sida i banken eller metodens andra sidor.
  const upptagna = new Set([...UPPTAGNA_LED, ...(bank?.enheter.map((e) => e.slug) ?? [])]);
  for (const r of bm?.rader ?? []) {
    if (!r.slug || upptagna.has(r.slug)) throw new Error(`${d.titel}: ramen "${bm!.led}: ${r.namn}" får adressen ${r.slug}, som en annan sida redan har. Ge ramen ett annat namn.`);
    upptagna.add(r.slug);
  }
  return bm;
}

/** utanfor: ramar som redan står på ett annat ställe (bankens enheter, nivåernas material). */
export function bladmaterial(ramar: Ram[], bilder: PaBordet[], utanfor: (ri: number) => boolean = () => false): Bladmaterial | undefined {
  for (let k = 0; k < ramar.length; k++) {
    const led = utanfor(k) ? undefined : ramar[k].rubrik.match(/^([^:]+): (.+)$/)?.[1];
    if (!led) continue;
    let slut = k;
    while (slut < ramar.length && !utanfor(slut) && ramar[slut].rubrik.startsWith(`${led}: `)) slut++;
    const rader = ramar.slice(k, slut).map((ram, i) => {
      const blad = bladVid(bilder, ram.rubrik);
      const namn = ram.rubrik.slice(led.length + 2);
      return { ri: k + i, namn, slug: slug(namn), blad, tomma: blad.filter((b) => !arIfylltBlad(b)).length };
    });
    if (rader.length >= 2 && rader.every((r) => r.blad.length > 0)) return { led, rader, ramar: new Set(rader.map((r) => r.ri)), forst: k };
    k = slut - 1;
  }
  return undefined;
}
