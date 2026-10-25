// Det övriga materialet som en egen fil (Faktatextsamtal i grupp; Niclas godkände förslaget 2026-10-13): ramarna som inte
// står i en bank (src/lib/bank.ts), i nivåernas rader (src/lib/nivamaterial.ts) eller bland ramarna med blad
// (src/lib/bladmaterial.ts), som Kärnorna, kortet När det skaver, jobbkorten, Egen text och kartläggningen. Utan filen
// ligger de sist i planeringsmallarna, efter bankens alla sidor: omkring 120 sidor in i Faktatextsamtal i grupp, fast
// bladet Kärnorna skrivs ut varje vecka. Metoden säger själv vad materialet heter, i fältet ramar.ovrigt (Bladen och
// korten), och utan fältet finns ingen fil: så får ingen publicerad metod en fil som ingen har bett om, och namnet är
// metodens eget ord. Filen har ramarna i filens ordning, ett blad per sida som i planeringsmallarna (ramarDokument i
// metoddocx.ts), i Word och pdf (scripts/bankpdf.mjs). Inga Node-beroenden.
import type { MetodData } from './metod';
import { bankAv, iBanken } from './bank';
import { metodensBladmaterial } from './bladmaterial';
import { metodensNivamaterial } from './nivamaterial';
import { bladVid, metodensPaBordet } from './pabordet';
import { slugAv } from './standard/index.js';

/** Filen med det övriga materialet: namnet (adressen utan ändelse), metodens ord för materialet, ramarna och hur många
 * sidor filen ska ha, minst och högst. */
export interface Ovrigtfil { namn: string; rubrik: string; huvud: string; ramar: number[]; minst: number; hogst: number }

// Adressens led ur standarden (src/lib/standard/), samma för alla adresser ur namn (K-416).
const slug = slugAv;

export function ovrigtfil(d: MetodData, id: string): Ovrigtfil | undefined {
  const namn = d.ramar?.ovrigt;
  if (!d.ramar || !namn) return undefined;
  const ramarna = d.ramar.ramar;
  const bilder = metodensPaBordet(d, id);
  const bank = bankAv(d);
  const nm = metodensNivamaterial(d);
  const bm = metodensBladmaterial(d, id);
  const ramar = ramarna.map((_, ri) => ri).filter((ri) => !iBanken(bank, ri) && !nm?.ramar.has(ri) && !bm?.ramar.has(ri));
  if (!ramar.length) throw new Error(`${d.titel}: ramar.ovrigt är "${namn}", men alla ramarna står redan i banken, i nivåernas rader eller bland ramarna med blad. Ta bort fältet.`);
  // Varje ram är minst en sida och får ta tre (en text till läraren och ett blad på två sidor), och varje blad vid ramen
  // är en sida till.
  const blad = ramar.reduce((s, ri) => s + bladVid(bilder, ramarna[ri].rubrik).length, 0);
  return { namn: `${id}-${slug(namn)}`, rubrik: namn, huvud: namn, ramar, minst: ramar.length + blad, hogst: ramar.length * 3 + blad };
}
