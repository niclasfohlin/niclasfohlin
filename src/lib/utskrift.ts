// Utskriftsknapparnas pdf:er (Niclas 2026-10-13: "Vill inte ha glidning här. Så bättre med ett system för skriv ut
// knapparna", och "System med att den drar från sidorna eller Yaml kommer aldrig få exakt paritet med pdf. Så bättre med
// ett system som alltid blir 1:1"). Varje knapp som skriver ut öppnar en pdf, och varje pdf är sidor ur en Word-fil som
// Word har sparat som pdf (scripts/bankpdf.mjs): metodens fil med allt, filen med bara metoden, bankens filer och
// ramarnas filer. Här står vilken pdf varje knapp leder till, och vilka ramar och blad ur vilka filer den består av.
// Sidorna läser adresserna härifrån, och bygget klipper ut filerna efter samma lista (scripts/pdfdelar.mjs genom
// src/pages/stodundervisning/utskrifter.json.ts), så att en knapp aldrig kan leda till en fil som inte görs.
// Inga Node-beroenden.
import type { MetodData } from './metod';
import { bankAv, bankfiler, bankfilensRamar, slugAv, foljesidansNamn, type Bank, type Bankenhet } from './bank';
import { harLathund } from './metod';
import { ovrigtfil } from './ovrigt';
import { bladNamn, bladVid, metodensPaBordet } from './pabordet';
import { bladfiler, bladKort, metodensBladmaterial, type Bladmaterial, type Bladrad } from './bladmaterial';
import { arIfylltBlad, type PaBordet } from './pabordet';

/** En del av en utskrift: en ram (med sina egna sidor, utan bladen), ett blad eller en viss sida, ur en av metodens pdf:er. */
export interface Utskriftsdel { pdf: string; ram?: number; bild?: number; sida?: number }
/** En pdf som en knapp leder till: namnet utan ändelse, filens titel och delarna i ordning. */
export interface Utskrift { namn: string; titel: string; delar: Utskriftsdel[] }

export const utskriftAdress = (u: Pick<Utskrift, 'namn'>) => `/stodundervisning/${u.namn}.pdf`;

type Ram = NonNullable<MetodData['ramar']>['ramar'][number];
/** Bladets namn på en enhets sida: enheten heter som bankens ord (texten, problemet), en följesida som ledet före kolon. */
export const enhetsbladNamn = (bank: Bank, e: Bankenhet, ramar: Ram[], ri: number) => (ri === e.ri ? bank.ord.bestamd : foljesidansNamn(ramar[ri]));

/** En enhets utskrifter: alla enhetens sidor i en pdf, varje ram för sig och, när banken har postens följesida (src/lib/
 * bank.ts), enheten med den, som problemet med lösningsförslaget, som Ta fram skriver ut. */
export function enhetensUtskrifter(d: MetodData, id: string, bank: Bank, e: Bankenhet): { alla: Utskrift; ramar: Map<number, Utskrift>; post?: Utskrift } {
  const ramarna = d.ramar!.ramar;
  // Enheten och ramen jämförs på sitt namn i adressen: sidan och komponenten har var sin bank och var sitt bladmaterial.
  const niva = bank.nivaer.find((n) => n.enheter.some((x) => x.slug === e.slug))!;
  const filer = bankfiler(id, bank).filter((f) => f.niva?.slug === niva.slug).map((f) => ({ namn: f.namn, ramar: bankfilensRamar(bank, f) }));
  const fil = (ri: number) => {
    const f = filer.find((x) => x.ramar.includes(ri));
    if (!f) throw new Error(`${d.titel}: ramen "${ramarna[ri].rubrik}" står inte i någon av nivån ${niva.namn}s filer, så den har ingen pdf att skriva ut (src/lib/utskrift.ts).`);
    return f.namn;
  };
  const bladen = [...e.fore, e.ri, ...e.efter];
  // Står alla enhetens sidor i en och samma fil tas de därifrån, i enhetens ordning.
  const hel = filer.find((x) => bladen.every((ri) => x.ramar.includes(ri)));
  const namn = (ri: number) => enhetsbladNamn(bank, e, ramarna, ri);
  const titel = `${d.titel}: ${e.l.niva}, ${e.l.vad}, ${e.l.titel}`;
  // Enheten med postens följesida, ur filen med båda (bankfiler, 'post').
  const postfil = e.post !== undefined ? filer.find((x) => x.ramar.includes(e.ri) && x.ramar.includes(e.post!)) : undefined;
  return {
    alla: { namn: `${id}-${e.slug}`, titel, delar: bladen.map((ri) => ({ pdf: hel?.namn ?? fil(ri), ram: ri })) },
    ramar: new Map(bladen.map((ri) => [ri, { namn: `${id}-${e.slug}-${slugAv(namn(ri))}`, titel: `${titel}: ${namn(ri).toLowerCase()}`, delar: [{ pdf: fil(ri), ram: ri }] }])),
    // Har enheten bara postens följesida är det enhetens alla sidor, och då står de i en pdf (alla).
    ...(bank.post && e.post !== undefined && bank.post.egenFil ? { post: { namn: `${id}-${e.slug}-med-${bank.post.slug}`, titel: `${titel}, med ${bank.post.bestamd}`, delar: bladen.filter((ri) => ri === e.ri || ri === e.post).map((ri) => ({ pdf: postfil?.namn ?? fil(ri), ram: ri })) } } : {}),
  };
}

/** En rams utskrifter (en ram med blad, som en modell): allt i en pdf, ramens sida för sig och varje blad för sig. */
export function radensUtskrifter(d: MetodData, id: string, bm: Bladmaterial, rad: Bladrad): { alla: Utskrift; sidan: Utskrift; blad: Map<number, Utskrift> } {
  const filer = bladfiler(id, bm).filter((f) => f.rad?.slug === rad.slug);
  const sidor = filer.find((f) => f.slag === 'sidor');
  const tomma = filer.find((f) => f.slag === 'blad');
  if (!sidor) throw new Error(`${d.titel}: ramen "${rad.namn}" har ingen fil med sin sida (src/lib/bladmaterial.ts).`);
  const bladdel = (b: PaBordet): Utskriftsdel => {
    // Ett ifyllt blad (exemplet) står i filen med ramens sida, och de tomma bladen i filen med bladen (bladfiler).
    const f = arIfylltBlad(b) ? sidor : tomma;
    if (!f) throw new Error(`${d.titel}: bladet "${b.bild.rubrik}" står inte i någon av filerna för ${rad.namn}, så det har ingen pdf att skriva ut (src/lib/utskrift.ts).`);
    return { pdf: f.namn, bild: b.bild.nr };
  };
  const titel = `${d.titel}: ${bm.led.toLowerCase()} ${rad.namn}`;
  const sidan: Utskriftsdel = { pdf: sidor.namn, ram: rad.ri };
  return {
    alla: { namn: `${id}-${rad.slug}`, titel, delar: [sidan, ...rad.blad.map(bladdel)] },
    sidan: { namn: `${id}-${rad.slug}-sidan`, titel: `${titel}: sidan`, delar: [sidan] },
    blad: new Map(rad.blad.map((b) => [b.bild.nr, { namn: `${id}-${rad.slug}-${slugAv(bladKort(rad, b))}`, titel: `${titel}: ${bladKort(rad, b).toLowerCase()}`, delar: [bladdel(b)] }])),
  };
}

/** Ramarna som hör till varje enhet (ramar.vidEnheterna i metodens fil, som bladet Kärnorna): ramen, dess blad och
 * pdf:en som knappen på enhetens sida öppnar. Har ramen blad är det bladen som skrivs ut, annars ramens egna sidor.
 * Sidorna tas ur filen med det övriga materialet (src/lib/ovrigt.ts), där ramen står. */
export interface VidEnheten { ri: number; rubrik: string; blad: PaBordet[]; utskrift: Utskrift }
export function vidEnheterna(d: MetodData, id: string): VidEnheten[] {
  const namn = d.ramar?.vidEnheterna ?? [];
  if (!namn.length) return [];
  const ramarna = d.ramar!.ramar;
  const ovrig = ovrigtfil(d, id);
  const bilder = metodensPaBordet(d, id);
  return namn.map((rubrik) => {
    const ri = ramarna.findIndex((r) => r.rubrik === rubrik);
    if (ri < 0) throw new Error(`${d.titel}: ramar.vidEnheterna nämner "${rubrik}", men ingen ram heter så.`);
    if (!bankAv(d)) throw new Error(`${d.titel}: ramar.vidEnheterna nämner "${rubrik}", men metoden har ingen bank med enheter på egna sidor (src/lib/bank.ts).`);
    if (!ovrig?.ramar.includes(ri)) throw new Error(`${d.titel}: ramen "${rubrik}" i ramar.vidEnheterna står inte i filen med det övriga materialet (ramar.ovrigt, src/lib/ovrigt.ts), så den har ingen pdf att skriva ut.`);
    const blad = bladVid(bilder, rubrik);
    return { ri, rubrik, blad, utskrift: { namn: `${id}-${slugAv(rubrik)}`, titel: `${d.titel}: ${blad.length === 1 ? bladNamn(blad[0]) : rubrik}`, delar: blad.length ? blad.map((b) => ({ pdf: ovrig.namn, bild: b.bild.nr })) : [{ pdf: ovrig.namn, ram: ri }] } };
  });
}

/** Lathundens mall för sig: sidan 3 i lathundens pdf (Lathund.astro, knappen Skriv ut den här sidan). */
export const lathundensMall = (d: Pick<MetodData, 'titel'>, id: string): Utskrift => ({ namn: `${id}-lathund-mall`, titel: `Lathund: ${d.titel}, mallen`, delar: [{ pdf: `${id}-lathund`, sida: 3 }] });

/** Alla pdf:er som metodens knappar leder till och som klipps ur de hela filerna, var och en en gång. */
export function metodensUtskrifter(d: MetodData, id: string): Utskrift[] {
  const ut = new Map<string, Utskrift>();
  const lagg = (u: Utskrift) => {
    const forr = ut.get(u.namn);
    if (forr && JSON.stringify(forr.delar) !== JSON.stringify(u.delar)) throw new Error(`${d.titel}: två utskrifter heter ${u.namn}.pdf (src/lib/utskrift.ts).`);
    ut.set(u.namn, u);
  };
  if (harLathund(d)) lagg(lathundensMall(d, id));
  for (const v of vidEnheterna(d, id)) lagg(v.utskrift);
  const bank = bankAv(d);
  if (bank) for (const e of bank.enheter) { const u = enhetensUtskrifter(d, id, bank, e); lagg(u.alla); for (const x of u.ramar.values()) lagg(x); if (u.post) lagg(u.post); }
  const bm = metodensBladmaterial(d, id);
  if (bm) for (const rad of bm.rader) { const u = radensUtskrifter(d, id, bm, rad); lagg(u.alla); lagg(u.sidan); for (const x of u.blad.values()) lagg(x); }
  return [...ut.values()];
}
