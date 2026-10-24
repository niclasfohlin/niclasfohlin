// Sakernas egna filer (K-499; Niclas 2026-10-25: "Helst ska du lösa att enskilda saker som man behöver för pass. Ex addition
// 1 blad finns att ladda ner som enskilt blad som du fixade för andra saker förut", och "Det som något i planen länkar till
// bör ha sådan knapp under sig"). I en metod som kan planeras (planbar i src/lib/planbar.ts, METODER.md under Planera
// insatsen) har varje sak som planen kan leda till en egen Word-fil, som Word sparar som pdf (scripts/bankpdf.mjs), och under
// saken på metodens sida står en knapp som skriver ut den och en länk till Word-filen, som under bladen (egnaBlad i
// src/lib/bladmaterial.ts, K-476; Sakknapp.astro). Sakerna:
//   en ram i materialet, med sina sidor som i planeringsmallarna, när den inte har en fil redan: bankens ramar, nivåernas,
//   ramarna med blad och lärarhandledningarna har sina filer, och en ram vars blad har egna filer skrivs ut med bladen;
//   en vecka i en ram med lektioner (veckorna i De fyra räknesätten), veckans sida för sig;
//   ett räkneblad med namn (Addition 1) på sitt A4, och en ram med flera sådana alla bladen i en fil, under det sista;
//   en mall under Mallar att skriva ut, och diplomet eller kursintyget.
// Regeln har inga egna fält: en metod som får sin plan får filerna av sig själv, och planprovet stannar på en sak som
// planen leder till utan knapp och på en fil utan knapp (scripts/planprov.mjs). Inga Node-beroenden.
import type { MetodData } from './metod';
import { planbar } from './planbar';
import { bankAv } from './bank';
import { metodensNivamaterial } from './nivamaterial';
import { bladgrupper, egnaBlad, metodensBladmaterial } from './bladmaterial';
import { bokhandledningen, lararhandledningar } from './handledning';
import { bladNamn, forstaLed } from './karta';
import { faktatexter, lastexter, strukturAv, textparAv } from './ramform';
import { slugAv } from './standard/index.js';

export type Sakslag = 'ram' | 'vecka' | 'rakneblad' | 'mall' | 'diplom';
/** En saks fil: namnet utan ändelse, sakens namn (dokumentets titel och skärmläsarens), var saken står i metodens fil, hur
 * många sidor filen ska ha (scripts/bankpdf.mjs prövar det), knappens ord när utskriften görs direkt och annars, och om
 * alla sidorna ligger. */
export interface Sakfil {
  namn: string;
  titel: string;
  slag: Sakslag;
  ri?: number;
  di?: number;
  listor?: number[];
  mi?: number;
  minst: number;
  hogst: number;
  text: string;
  pdftext: string;
  liggande: boolean;
}

const ANTAL = ['', 'ett', 'båda', 'alla tre', 'alla fyra', 'alla fem', 'alla sex', 'alla sju', 'alla åtta', 'alla nio', 'alla tio'];
const versal = (s: string) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);

export function sakfiler(d: MetodData, id: string): Sakfil[] {
  if (!planbar(d)) return [];
  const ut: Sakfil[] = [];
  const ramar = d.ramar?.ramar ?? [];
  const bank = bankAv(d);
  const nm = metodensNivamaterial(d);
  const bm = metodensBladmaterial(d, id);
  const handledningar = lararhandledningar(ramar);
  const bokhl = bokhandledningen(ramar);
  const egna = egnaBlad(d, id);
  const medBlad = new Set(egna.map((b) => b.ri));
  const texter = lastexter(ramar);
  const fakta = faktatexter(ramar);
  // Ramens namn på knappen: rubrikens första led när ingen annan ram har det ("Bildserie 1"), annars hela rubriken ("Mina
  // lärdomar: vecka 1–2").
  const forsta = (rubrik: string) => rubrik.split(':')[0].trim();
  const knappnamn = (rubrik: string) => (ramar.filter((r) => forsta(r.rubrik) === forsta(rubrik)).length === 1 ? forsta(rubrik) : rubrik);
  ramar.forEach((ram, ri) => {
    if (bank && (bank.ramar.has(ri) || bank.oversikter.has(ri))) return;
    if (nm?.ramar.has(ri) || bm?.ramar.has(ri) || handledningar.has(ri) || bokhl?.ri === ri || medBlad.has(ri)) return;
    if (texter.has(ram) || fakta.has(ram) || textparAv(ram) || strukturAv(ram)) return;
    // Veckorna i en ram med lektioner, var och en för sig: en del vars första led är en vecka ("Vecka 1 · Hopp på talraden").
    if (ram.lektioner) {
      ram.delar.forEach((del, di) => {
        const v = forstaLed(del.rubrik).match(/^vecka (\d+)$/i)?.[1];
        if (v) ut.push({ namn: `${id}-vecka-${v}`, titel: del.rubrik, slag: 'vecka', ri, di, minst: 1, hogst: 2, text: 'Skriv ut veckan', pdftext: 'Veckan som pdf', liggande: false });
      });
      return;
    }
    // Räknebladen med namn, vart och ett för sig, och är alla ramens listor sådana blad, alla i en fil.
    const listor = ram.listor ?? [];
    const namngivna = listor.flatMap((l, li) => { const namn = l.rakneblad ? bladNamn(l.rubrik) : undefined; return namn ? [{ namn, li }] : []; });
    for (const b of namngivna) ut.push({ namn: `${id}-blad-${slugAv(b.namn)}`, titel: b.namn, slag: 'rakneblad', ri, listor: [b.li], minst: 1, hogst: 1, text: 'Skriv ut bladet', pdftext: 'Bladet som pdf', liggande: false });
    if (namngivna.length && namngivna.length === listor.length) {
      if (namngivna.length >= 2) {
        const antal = ANTAL[namngivna.length] ?? `alla ${namngivna.length}`;
        ut.push({ namn: `${id}-blad-${slugAv(ram.rubrik)}-alla`, titel: ram.rubrik, slag: 'rakneblad', ri, listor: namngivna.map((b) => b.li), minst: namngivna.length, hogst: namngivna.length, text: `Skriv ut ${antal} bladen`, pdftext: `${versal(antal)} bladen som pdf`, liggande: false });
      }
      return;
    }
    // Ramen med sina sidor: minst en, och en text till läraren, listorna, elevens blad med bildserien och arket var för sig.
    const hogst = 3 + listor.length + (ram.serie ? 2 : 0) + (ram.ark ? 1 : 0);
    const namn = knappnamn(ram.rubrik);
    ut.push({ namn: `${id}-blad-${slugAv(ram.rubrik)}`, titel: ram.rubrik, slag: 'ram', ri, minst: 1, hogst, text: `Skriv ut ${namn}`, pdftext: `${namn} som pdf`, liggande: false });
  });
  // Diplomet eller kursintyget, ett blad.
  if (d.diplom) ut.push({ namn: `${id}-blad-${slugAv(d.diplom.rubrik)}`, titel: d.diplom.rubrik, slag: 'diplom', minst: 1, hogst: 1, text: 'Skriv ut bladet', pdftext: 'Bladet som pdf', liggande: false });
  // Mallarna, var och en för sig: ett ark per talsort för en matta med enPerSida, annars ett liggande blad.
  d.mallar.forEach((m, mi) => {
    const ark = m.typ === 'matta' && m.enPerSida ? (m.kolumner ?? []).length : 0;
    ut.push({ namn: `${id}-mall-${slugAv(m.rubrik)}`, titel: m.rubrik, slag: 'mall', mi, minst: ark || 1, hogst: ark || 1, text: ark ? 'Skriv ut arken' : 'Skriv ut bladet', pdftext: ark ? 'Arken som pdf' : 'Bladet som pdf', liggande: !ark });
  });
  // Varje fil har ett eget namn, också bland bladens filer (egnaBlad och bladgrupper), så att ingen fil skriver över en annan.
  const upptagna = new Set([...egna.map((b) => b.namn), ...bladgrupper(d, id).map((g) => g.namn)]);
  for (const f of ut) {
    if (!slugAv(f.titel) || upptagna.has(f.namn)) throw new Error(`${d.titel}: ${f.titel} får filnamnet ${f.namn}, som en annan fil redan har (src/lib/sakfiler.ts). Ge saken ett annat namn.`);
    upptagna.add(f.namn);
  }
  return ut;
}

/** Sakernas filer efter var de står på metodens sida: ramens fil, veckans och räknebladens efter ram och plats, mallens. */
export function sakernasPlatser(filer: Sakfil[]) {
  return {
    ram: new Map(filer.filter((f) => f.slag === 'ram').map((f) => [f.ri!, f])),
    vecka: new Map(filer.filter((f) => f.slag === 'vecka').map((f) => [`${f.ri}-${f.di}`, f])),
    blad: new Map(filer.filter((f) => f.slag === 'rakneblad' && f.listor!.length === 1).map((f) => [`${f.ri}-${f.listor![0]}`, f])),
    alla: new Map(filer.filter((f) => f.slag === 'rakneblad' && f.listor!.length > 1).map((f) => [`${f.ri}-${f.listor!.at(-1)}`, f])),
    mall: new Map(filer.filter((f) => f.slag === 'mall').map((f) => [f.mi!, f])),
    diplom: filer.find((f) => f.slag === 'diplom'),
  };
}
