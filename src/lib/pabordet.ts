// Bilderna På bordet ur metodriggen (De fyra räknesätten i grupp, metodriggens TILL-SAJTEN 2026-10-04): det som ligger
// framför lärarens händer när hen har visat, en bild för materialet och en för varje vecka. Riggen ritar bilderna ur
// metodens scener, och sajten tar de färdiga svg-filerna, som filmerna: <id>-pabordet-<nr>.svg i public/stodundervisning/,
// 960 × 540. Varje bild står där fältet efter säger, med samma platser som extrafilmerna (src/lib/film.ts): på sidan och
// i utskriften med rubriken och bildtexten (Filmruta.astro), och i Word i satsens bredd med en reservbild (metoddocx.ts).
// Efter en del i en ram med lektioner (en vecka) står bilden direkt under delen, och i Word på samma sida.
//
// Det om bilden som inte står i metodens fil kommer ur riggens pabordet.json och står i src/data/pabordet.json, skriven av
// scripts/pabordetdata.mjs (Faktatextsamtal i grupp, metodriggens TILL-SAJTEN 2026-10-13): bildens mått när de är andra än
// 960 × 540, bladets skrivytor, elev och skala.
//   ytor   skrivytorna på ett blad, i bildens punkter: namn, x, y, bredd och höjd, läget i cellen och om texten är
//          centrerad. I Word ligger en cell över varje yta, så att bladet går att skriva i (bildblad i metoddocx.ts).
//   elev   eleven ser på bilden (kartläggningens blad): den står direkt efter det eleven läser, utan rubriken På bordet.
//   skala  mellan 0,5 och 1: bilden ritas smalare och mitt på raden i Word, så att den ryms på sidan med sin text.
import type { MetodData } from './metod';
import { passar, tolkaEfter, type FilmPlats } from './film';
import BILDDATA from '../data/pabordet.json';

export type PaBordetFalt = MetodData['pabordet'][number];
export interface Bladyta { namn: string; x: number; y: number; b: number; h: number; lage?: 'uppe' | 'mitt' | 'nere'; mitt?: boolean }
// fil: ett blad i en vanlig ram har en egen fil att skriva ut (egnaBlad i src/lib/bladmaterial.ts), som metodens sida sätter.
export interface PaBordet { bild: PaBordetFalt; adress: string; vid?: FilmPlats; matt: { bredd: number; hojd: number }; ytor?: Bladyta[]; elev?: boolean; skala?: number; fil?: { namn: string; titel: string; statistik: string } }
export const PABORDET_MATT = { bredd: 960, hojd: 540 };
type Bilddata = { bredd?: number; hojd?: number; ytor?: Bladyta[]; elev?: boolean; skala?: number };
const bilddata = (id: string, nr: number): Bilddata => (BILDDATA as Record<string, Record<string, Bilddata>>)[id]?.[String(nr)] ?? {};

/** Metodens bilder På bordet, i fältets ordning. */
export const metodensPaBordet = (d: MetodData, id: string): PaBordet[] =>
  (d.pabordet ?? []).map((b) => {
    const x = bilddata(id, b.nr);
    return { bild: b, adress: `/stodundervisning/${id}-pabordet-${b.nr}.svg`, vid: tolkaEfter(b.efter), matt: { bredd: x.bredd ?? PABORDET_MATT.bredd, hojd: x.hojd ?? PABORDET_MATT.hojd }, ...(x.ytor ? { ytor: x.ytor } : {}), ...(x.elev ? { elev: true } : {}), ...(x.skala ? { skala: x.skala } : {}) };
  });
// Ett blad (Faktatextsamtal i grupp, metodriggens TILL-SAJTEN 2026-10-13, Det nya punkt 4): en bild På bordet vars rubrik
// börjar med "Blad: ", som "Blad: Tankekartan 1: fyra delar". Den står ensam på ett liggande A4 direkt efter sin ram
// (efter: "ram: <ramens rubrik>"), och bladets namn är ritat i bilden. Ett blad vars namn säger exemplet ("Tankekartan,
// exemplet om skolan") är ifyllt: läraren visar det, och det har inget att skriva i. Samma regel som riggens
// build/modell.mjs.
const BLAD = /^Blad: (.+)$/;
export const arBlad = (b: PaBordet) => BLAD.test(b.bild.rubrik);
/** Bladets namn utan "Blad: ": "Tankekartan 1: fyra delar". */
export const bladNamn = (b: PaBordet) => b.bild.rubrik.match(BLAD)?.[1] ?? b.bild.rubrik;
/** Ett ifyllt blad: exemplet om skolan, eller textens modell, bladet efter en enhets följesida "<namn>: <nivå>, <vad>,
 *  <titel>" (Faktatextsamtal i grupp, ramen Modellen: Bas, text 1, Vattenplaneten; src/lib/bank.ts, arBladsida). */
export const arIfylltBlad = (b: PaBordet) => arBlad(b) && (/, exemplet\b/.test(bladNamn(b)) || /^ram: [^:]+: [^,]+, [^,]+ \d+, ./.test(b.bild.efter ?? ''));
/** Ett stående blad, högre än brett (Vår grupp i Gruppstärkande aktiviteter, 2026-10-16), står på ett stående A4. */
export const arStaendeBlad = (b: PaBordet) => arBlad(b) && b.matt.hojd > b.matt.bredd;
/** Ramens blad, i bildernas ordning. */
export const bladVid = (bilder: PaBordet[], ramensRubrik: string) => paBordetVid(bilder, { ram: ramensRubrik }).filter(arBlad);
/** Bilderna som står på platsen. */
export const paBordetVid = (bilder: PaBordet[], plats: FilmPlats) => bilder.filter((b) => b.vid && passar(b.vid, plats));
/** Bildens textalternativ när den står utan rubrik och bildtext (strukturens sida): rubriken och texten, med en punkt
 * efter rubriken bara när den inte redan slutar med ett skiljetecken (Berätta mera!). */
export const bildensAlt = (b: PaBordet) => `På bordet: ${b.bild.rubrik}${/[.!?]$/.test(b.bild.rubrik) ? '' : '.'} ${b.bild.text}`;
/** Bilden står efter en del i en ram (en vecka): utan egen rubrik, med "På bordet." först i bildtexten. */
export const iDel = (b: PaBordet) => !!b.vid && 'del' in b.vid;
