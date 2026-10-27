// Sakernas egna filer (K-499; Niclas 2026-10-25: "Helst ska du lösa att enskilda saker som man behöver för pass. Ex addition
// 1 blad finns att ladda ner som enskilt blad som du fixade för andra saker förut", och "Det som något i planen länkar till
// bör ha sådan knapp under sig"). I en metod som kan planeras (planbar i src/lib/planbar.ts, METODER.md under Planera
// insatsen) har varje sak som planen kan leda till en egen Word-fil, som Word sparar som pdf (scripts/bankpdf.mjs), och under
// saken på metodens sida står en knapp som skriver ut den och en länk till Word-filen, som under bladen (egnaBlad i
// src/lib/bladmaterial.ts, K-476; Sakknapp.astro). Sakerna:
//   en ram i materialet, med sina sidor som i planeringsmallarna, när den inte har en fil redan: bankens ramar, nivåernas,
//   ramarna med blad och lärarhandledningarna har sina filer, och en ram vars blad har egna filer skrivs ut med bladen;
//   en lästext utanför banken, som Högläsning i pars provtexter, är en sådan ram;
//   en vecka i en ram med lektioner (veckorna i De fyra räknesätten), veckans sida för sig;
//   ett räkneblad med namn (Addition 1) på sitt A4, och en ram med flera sådana alla bladen i en fil, under det sista;
//   en mall under Mallar att skriva ut, och diplomet eller kursintyget;
//   en tabell i metodens text som planen leder till: en tabell som planens text nämner, passets tabell och uppföljningens
//   (Niclas 2026-10-27: "Skrivdragen i tabell kunde inte laddas ner med en knapp").
// Regeln har inga egna fält: en metod som får sin plan får filerna av sig själv, och planprovet stannar på en sak som
// planen leder till utan knapp och på en fil utan knapp (scripts/planprov.mjs). En lektion i en serie, som Ljudleks, planeras
// i seriens planerare, som leder till lektionens saker, så lektionen har filerna också (verifieringen 2026-10-27: under
// Bokstavskorten i Första ljudet stod ingen knapp). Inga Node-beroenden.
import type { MetodData } from './metod';
import { planbar } from './planbar';
import { bankAv, iBanken } from './bank';
import { metodensNivamaterial } from './nivamaterial';
import { bladgrupper, egnaBlad, metodensBladmaterial } from './bladmaterial';
import { bokhandledningen, lararhandledningar } from './handledning';
import { bladNamn, forstaLed } from './karta';
import { faktatexter, strukturAv, textparAv } from './ramform';
import { allaAntal, kortnamn, sakdelar, slugAv, stor, visadeTexter } from './standard/index.js';
import { metodensSaker, sidansAnkare } from './metodsaker';
import { ljudform } from './ljudkort';

export type Sakslag = 'ram' | 'vecka' | 'rakneblad' | 'mall' | 'diplom' | 'tabell';
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
  ti?: number;
  minst: number;
  hogst: number;
  text: string;
  pdftext: string;
  liggande: boolean;
}


export function sakfiler(d: MetodData, id: string): Sakfil[] {
  const lektion = !!d.serie && d.formaga !== undefined && !d.plan;
  if (!planbar(d) && !lektion) return [];
  const ut: Sakfil[] = [];
  const ramar = d.ramar?.ramar ?? [];
  const bank = bankAv(d);
  const nm = metodensNivamaterial(d);
  const bm = metodensBladmaterial(d, id);
  const handledningar = lararhandledningar(ramar);
  const bokhl = bokhandledningen(ramar);
  const egna = egnaBlad(d, id);
  const medBlad = new Set(egna.map((b) => b.ri));
  const fakta = faktatexter(ramar);
  // Ramens namn på knappen: rubrikens första led när ingen annan ram har det ("Bildserie 1"), annars hela rubriken ("Mina
  // lärdomar: vecka 1–2"), med standardens kortnamn.
  const rubriker = ramar.map((r) => r.rubrik);
  ramar.forEach((ram, ri) => {
    if (iBanken(bank, ri)) return;
    if (nm?.ramar.has(ri) || bm?.ramar.has(ri) || handledningar.has(ri) || bokhl?.ri === ri || medBlad.has(ri)) return;
    if (fakta.has(ram) || textparAv(ram) || strukturAv(ram)) return;
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
        const antal = allaAntal(namngivna.length);
        ut.push({ namn: `${id}-blad-${slugAv(ram.rubrik)}-alla`, titel: ram.rubrik, slag: 'rakneblad', ri, listor: namngivna.map((b) => b.li), minst: namngivna.length, hogst: namngivna.length, text: `Skriv ut ${antal} bladen`, pdftext: `${stor(antal)} bladen som pdf`, liggande: false });
      }
      return;
    }
    // Ramen med sina sidor: minst en, och en text till läraren, listorna, elevens blad med bildserien och arket var för sig.
    // Sagoformens blad har en sida per steg eller skylt (sidor, eller bilderna), och en ram att fylla i med huvud kan ta en
    // sida per del, som i planeringsmallarna (K-553: Sagobokens Sagans väg i fyra steg är fyra sidor, och Berättelseramens
    // egen ram med sex delar fyra).
    const sago = ram.sagoform ? (ram.sagoform.sidor ?? ram.sagoform.bilder?.length ?? 1) : 0;
    const fylla = ram.huvud ? (ram.delar ?? []).length : 0;
    // Golvbokstäverna står en per A4 (ljudform i src/lib/ljudkort.ts), så varje bokstav är en sida (Ljudleks Bokstavsgympa).
    const golv = listor.filter((l) => ljudform(d, l) === 'golvbokstaver').reduce((n, l) => n + (l.rader ?? []).flat().filter(Boolean).length, 0);
    const hogst = 3 + listor.length + (ram.serie ? 2 : 0) + (ram.ark ? 1 : 0) + sago + fylla + golv;
    const namn = kortnamn(ram.rubrik, rubriker);
    ut.push({ namn: `${id}-blad-${slugAv(ram.rubrik)}`, titel: ram.rubrik, slag: 'ram', ri, minst: 1, hogst, text: `Skriv ut ${namn}`, pdftext: `${namn} som pdf`, liggande: false });
  });
  // Diplomet eller kursintyget, ett blad.
  if (d.diplom) ut.push({ namn: `${id}-blad-${slugAv(d.diplom.rubrik)}`, titel: d.diplom.rubrik, slag: 'diplom', minst: 1, hogst: 1, text: 'Skriv ut bladet', pdftext: 'Bladet som pdf', liggande: false });
  // Mallarna, var och en för sig: ett ark per talsort för en matta med enPerSida, annars ett liggande blad.
  d.mallar.forEach((m, mi) => {
    const ark = m.typ === 'matta' && m.enPerSida ? (m.kolumner ?? []).length : 0;
    ut.push({ namn: `${id}-mall-${slugAv(m.rubrik)}`, titel: m.rubrik, slag: 'mall', mi, minst: ark || 1, hogst: ark || 1, text: ark ? 'Skriv ut arken' : 'Skriv ut bladet', pdftext: ark ? 'Arken som pdf' : 'Bladet som pdf', liggande: !ark });
  });
  // Tabellerna som planen leder till, var och en med sin rubrik, texten, tabellen och noten, och så många sidor som raderna
  // kan ta.
  const tabellrubriker = d.tabeller.map((t) => t.rubrik);
  for (const ti of planensTabeller(d, id)) {
    const t = d.tabeller[ti];
    const namn = kortnamn(t.rubrik, tabellrubriker);
    ut.push({ namn: `${id}-tabell-${slugAv(t.rubrik)}`, titel: t.rubrik, slag: 'tabell', ti, minst: 1, hogst: 2 + Math.ceil(t.rader.length / 6), text: `Skriv ut ${namn}`, pdftext: `${namn} som pdf`, liggande: false });
  }
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
    tabell: new Map(filer.filter((f) => f.slag === 'tabell').map((f) => [f.ti!, f])),
  };
}

/** Tabellerna i metodens text som planen leder till: de som planens text nämner (metodensSaker, som planen länkar med), och
 * passens och uppföljningens tabeller, som planen visar delarna ur. Ett pass utan tidsschemats delar leder till tabellen i
 * sin ur. En lektion i en serie, som Ljudleks, planeras i seriens planerare, som leder till lektionens tabeller, som
 * Ordbanken och Ljudstarten, så lektionen har filer för alla sina (planprovet 2026-10-27). Andra metoder utan plan har inga. */
export function planensTabeller(d: MetodData, id: string): number[] {
  if (!!d.serie && d.formaga !== undefined && !d.plan) return d.tabeller.map((_, ti) => ti);
  if (!d.plan) return [];
  const saker = metodensSaker(d, id);
  const { tabellAnkare } = sidansAnkare(d);
  const namnda = new Set(visadeTexter(d).flatMap((t) => sakdelar(t, saker).flatMap((x) => (x.sak !== undefined && saker[x.sak].slag === 'tabell' ? [saker[x.sak].adress] : []))));
  const iPlanen = new Set([
    ...(d.plan.passen ?? []).flatMap((p) => [p.tabell, p.utanTidsschema ? p.ur?.tabell : undefined]),
    ...(d.uppfoljning?.rader ?? []).map((r) => r.tabell),
  ].filter(Boolean));
  return d.tabeller.flatMap((t, ti) => (namnda.has(`/stodundervisning/${id}#${tabellAnkare.get(t)}`) || iPlanen.has(t.rubrik) ? [ti] : []));
}
