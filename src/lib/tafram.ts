// Ta fram ur en bank (Niclas 2026-10-18: "Problemen i matte borde vara en databas och kunna hämtas likt ex aktiviteter
// men utifrån sina nivåer", och "Allt är ju att du skapar en slags standard för en databas"; byggplanen och skälen i
// underlag/prov/verktyg/PLAN-3.md och ARBETSORDER.md). Bankens enheter (src/lib/bank.ts) är databasens poster, i
// standardens form (src/lib/standard/, Post), och sidan Ta fram ett matteproblem ([id]/problem.astro med
// src/components/TaFram.astro) väljer ur dem efter nivå och innehållstagg. Inget flyttas ur metoden: problemen står kvar
// i metodens fil, och en ny post där kommer med på sidan i nästa bygge.
//
// Billigt från början (Niclas samma dag: "Se till att du bygger så databasen kommer fram billigt utan en massa krediter i
// onödan redan från början"): sidan och datafilen är filer ur samma bygge, utan funktioner. Raderna står i sidan, och
// det som Visa stort och utskriften behöver står i datafilen bredvid ([id]/problem.json.ts, src/lib/kortdata.ts), som
// robotarna inte hämtar. Varje utklippt pdf bär källfilens alla typsnitt (K-424: ett problem är 146 kB, varav 137 kB
// typsnitt, och nivåns fil med tio problem 200 kB), så datan säger var varje posts sidor står i källfilerna och hur stora
// filerna är, och listan hämtar en källfil en gång när det blir mindre (hamtplan i standarden).
//
// Byggets kod: läser filer och pdf:er. Webbläsaren läser bara datafilen.
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDict, PDFDocument, PDFName, PDFRawStream, PDFRef } from 'pdf-lib';
import type { CollectionEntry } from 'astro:content';
import { bankAv, enhetAdress, nivaFarger, type Bank, type Bankenhet } from './bank';
import { enhetensUtskrifter, utskriftAdress, type Utskrift } from './utskrift';
import { bildensAlt, metodensPaBordet } from './pabordet';
import { problemformer } from './problemform';
import { centralAv } from './centrala';
import { databasFel, innehallstaggar, postensRad, type Post, type PostUtskrift } from './standard/index.js';

type Metod = CollectionEntry<'stodundervisning'>;
type Karta = { ram?: number; bild?: number; fran: number; till: number }[];

const PUBLIC = join(process.cwd(), 'public');
const MANIFEST = JSON.parse(readFileSync(join(PUBLIC, 'stodundervisning', 'bank-pdf.json'), 'utf8')) as Record<string, { pdf: string; sidor: number; karta?: Karta }>;
const sha8 = (s: string | Buffer) => createHash('sha256').update(s).digest('hex').slice(0, 8);

/** En fil under public/ med samma version som scripts/filversion.mjs sätter i sidornas länkar, så att sidan och datafilen
 *  hämtar samma adress och webbläsaren sparar den en gång. */
const versioner = new Map<string, string>();
export function medVersion(adress: string): string {
  if (!versioner.has(adress)) versioner.set(adress, `${adress}?v=${sha8(readFileSync(join(PUBLIC, decodeURIComponent(adress))))}`);
  return versioner.get(adress)!;
}

// Källfilens storlek, sidor och typsnitt, ur pdf:en själv. En utklippt del är typsnitten och sina sidors del av resten,
// så uppskattningen blir några procent från den riktiga storleken (mätt 2026-10-18: 146 kB och 428 kB, uppskattat 147 och
// 444).
const vikter = new Map<string, Promise<{ byte: number; typsnitt: number; sidor: number }>>();
function kallvikt(fil: string) {
  if (!vikter.has(fil)) vikter.set(fil, (async () => {
    const bytes = readFileSync(join(PUBLIC, 'stodundervisning', `${fil}.pdf`));
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    const sedda = new Set<string>();
    let typsnitt = 0;
    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
      if (!(obj instanceof PDFDict) || obj.get(PDFName.of('Type')) !== PDFName.of('FontDescriptor')) continue;
      for (const nyckel of ['FontFile', 'FontFile2', 'FontFile3']) {
        const ref = obj.get(PDFName.of(nyckel));
        if (!(ref instanceof PDFRef) || sedda.has(ref.toString())) continue;
        sedda.add(ref.toString());
        const strom = doc.context.lookup(ref);
        if (strom instanceof PDFRawStream) typsnitt += strom.contents.length;
      }
    }
    return { byte: bytes.length, typsnitt, sidor: doc.getPageCount() };
  })());
  return vikter.get(fil)!;
}

/** En utskrift som standardens PostUtskrift: adressen med version, var sidorna står i källfilerna och storleken. */
async function postUtskrift(u: Utskrift): Promise<PostUtskrift> {
  const kalla: { fil: string; sidor: number[] }[] = [];
  for (const del of u.delar) {
    const karta = MANIFEST[del.pdf]?.karta;
    if (!karta) throw new Error(`Ta fram: ${del.pdf}.pdf har ingen karta över sina sidor i bank-pdf.json. Kör npm run validera.`);
    const sidor = karta.filter((k) => (del.bild !== undefined ? k.bild === del.bild : k.ram === del.ram && k.bild === undefined))
      .flatMap((k) => Array.from({ length: k.till - k.fran + 1 }, (_, n) => k.fran - 1 + n));
    if (!sidor.length) throw new Error(`Ta fram: ${u.namn}.pdf ska ha ramen ${del.ram} ur ${del.pdf}.pdf, men kartan har den inte. Kör npm run validera.`);
    const sist = kalla.at(-1);
    if (sist && sist.fil === del.pdf) sist.sidor.push(...sidor); else kalla.push({ fil: del.pdf, sidor });
  }
  // Delen klipps först efter bygget (scripts/pdfdelar.mjs), så dess version är källfilernas och sidornas: samma källa
  // och samma sidor ger samma del.
  const version = sha8(JSON.stringify(kalla.map((k) => [MANIFEST[k.fil].pdf, k.sidor])));
  let byte = 0;
  for (const k of kalla) {
    const v = await kallvikt(k.fil);
    byte += v.typsnitt + ((v.byte - v.typsnitt) * k.sidor.length) / v.sidor;
  }
  return { adress: `${utskriftAdress(u)}?v=${version}`, byte: Math.round(byte), kalla };
}

/** En post på sidan: standardens Post med det sidan och Visa stort behöver. */
export interface TaFramPost extends Post {
  nivaSlug: string;
  farg: string;
  taggId?: string;
  /** Bilden utan version, som sidan skriver och scripts/filversion.mjs ger version. */
  bildFil: string;
  /** Problemet och frågorna för Visa stort. */
  stycken: string[];
  fragor: string[];
}
export interface TaFram {
  metod: string;
  titel: string;
  omrade: string;
  /** Sidans namn i registret, som Ta fram ett matteproblem, och dess adress och korta adress. */
  namn: string;
  adress: string;
  kort?: string;
  led: string;
  ord: Bank['ord'];
  /** Följesidorna i en rad, som "lärarens sida och Två lösningar". */
  folje: string;
  nivaer: { namn: string; slug: string; farg: string; poster: TaFramPost[]; filer: { bara: Fil; med?: Fil } }[];
  taggar: { id: string; namn: string; lgr22: string; antal: number }[];
  poster: TaFramPost[];
  /** Källfilerna som listan kan hämta i stället för posternas egna pdf:er. */
  filer: Record<string, Fil>;
}
export interface Fil { namn: string; adress: string; byte: number }

/** Bankens led i adressen: problem, texter. Ta fram-sidorna har sina led bland de reserverade (UPPTAGNA_LED). */
export const taFramLed = (b: Bank) => b.ord.slug;
/** Metoderna med en bank vars Ta fram-sida är led, som problem. */
export const harTaFram = (m: Metod, led: string) => bankAv(m.data)?.ord.slug === led;

const fil = (namn: string): Fil => ({ namn, adress: medVersion(`/stodundervisning/${namn}.pdf`), byte: statSync(join(PUBLIC, 'stodundervisning', `${namn}.pdf`)).size });

// En gång per metodfil: sidan och datafilen läser samma databas i bygget, och en ändrad metodfil i npm run dev är en ny
// post och byggs om.
const cache = new WeakMap<object, Promise<TaFram>>();
/** Databasen ur metodens bank. Stoppar bygget med standardens fel (databasFel) när en post inte håller formen. */
export function taFramAv(m: Metod): Promise<TaFram> {
  if (!cache.has(m.data)) cache.set(m.data, bygg(m));
  return cache.get(m.data)!;
}

async function bygg(m: Metod): Promise<TaFram> {
  const d = m.data;
  const bank = bankAv(d);
  if (!bank) throw new Error(`Ta fram: ${d.titel} har ingen bank (src/lib/bank.ts).`);
  const led = taFramLed(bank);
  const adress = `/stodundervisning/${m.id}/${led}`;
  const c = centralAv(led === 'problem' ? 'matteproblem' : led);
  const farger = nivaFarger(d, bank);
  const ramar = d.ramar!.ramar;
  const former = problemformer(ramar, metodensPaBordet(d, m.id));
  const taggar = innehallstaggar(d.omrade);
  const post = async (e: Bankenhet): Promise<TaFramPost> => {
    const ram = ramar[e.ri];
    const bild = former.bild(ram);
    if (!bild) throw new Error(`Ta fram: ${ram.rubrik} har ingen bild På bordet (src/lib/problemform.ts).`);
    const u = enhetensUtskrifter(d, m.id, bank, e);
    const tagg = ram.innehallstagg;
    const t = taggar.find((x) => x.namn === tagg);
    const stycken = e.l.lastext?.stycken ?? [];
    // Lösningsförslaget (Niclas 2026-10-18: "utan att missa att de finns"): bladet Lösningsförslag när metoden har det
    // (metodriggens blad, K-423), annars Lärarens sida, där de två lösningarna står. Ankaret är bladets på postens sida.
    const losningsblad = [...e.fore, ...e.efter].find((ri) => /^Lösningsförslag:/.test(ramar[ri].rubrik)) ?? [...e.fore, ...e.efter].find((ri) => /^Lärarens sida:/.test(ramar[ri].rubrik));
    return {
      id: e.slug, niva: e.l.niva, nr: e.nr ?? 0, titel: e.l.titel, rad: postensRad(stycken[0] ?? ''), ...(tagg ? { tagg } : {}),
      sida: enhetAdress(m.id, e), ...(losningsblad !== undefined ? { losning: `${enhetAdress(m.id, e)}#blad-${losningsblad + 1}` } : {}), bild: { adress: medVersion(bild.adress), alt: bildensAlt(bild) },
      utskrift: { post: await postUtskrift(u.ramar.get(e.ri)!), med: await postUtskrift(u.alla) },
      nivaSlug: bank.nivaer.find((n) => n.enheter.includes(e))!.slug, farg: farger[e.l.niva], ...(t ? { taggId: t.id } : {}),
      bildFil: bild.adress, stycken, fragor: (e.l.lastext?.fragor ?? []).map((f) => f.replace(/^\d+\.\s*/, '')),
    };
  };
  const poster: TaFramPost[] = [];
  for (const e of bank.enheter) poster.push(await post(e));
  const fel = databasFel(poster, taggar);
  if (fel.length) throw new Error(`Ta fram (${d.titel}): ${fel.length} fel i databasen:\n  ${fel.join('\n  ')}`);
  // Källfilerna som posternas sidor står i, och nivåns två filer att skriva ut hela nivån (bankfiler i src/lib/bank.ts).
  const filer: Record<string, Fil> = {};
  for (const p of poster) for (const u of Object.values(p.utskrift)) for (const k of u.kalla) filer[k.fil] ??= fil(k.fil);
  const nivaer = bank.nivaer.map((n) => {
    const egna = poster.filter((p) => p.nivaSlug === n.slug);
    const bara = egna[0].utskrift.post.kalla[0].fil;
    const med = egna[0].utskrift.med.kalla[0].fil;
    return { namn: n.namn, slug: n.slug, farg: farger[n.namn], poster: egna, filer: { bara: filer[bara], ...(med !== bara ? { med: filer[med] } : {}) } };
  });
  return {
    metod: m.id, titel: d.titel, omrade: d.omrade, namn: c?.namn ?? `Ta fram ett ${bank.ord.en}`, adress, ...(c?.kort ? { kort: c.kort } : {}), led,
    ord: bank.ord, folje: bank.foljesidor.map((n) => (/^Lärarens sida$/i.test(n) ? n.toLowerCase() : n)).join(' och '),
    nivaer, taggar: taggar.map((t) => ({ ...t, antal: poster.filter((p) => p.tagg === t.namn).length })).filter((t) => t.antal > 0),
    poster, filer,
  };
}

/** Det som delningskortet ritar för några poster (src/pages/delning/tafram/[namn].astro): titeln, nivån, texten, frågorna
 *  och bilden, utan utskrifterna, så att kortet inte behöver läsa pdf:erna. */
export function taFramKortposter(m: Metod, ids: string[]) {
  const d = m.data;
  const bank = bankAv(d)!;
  const farger = nivaFarger(d, bank);
  const ramar = d.ramar!.ramar;
  const former = problemformer(ramar, metodensPaBordet(d, m.id));
  return ids.map((id) => {
    const e = bank.enheter.find((x) => x.slug === id);
    if (!e) throw new Error(`Ta fram: ${d.titel} har ingen post ${id} att rita på delningskortet (src/lib/delningskort.ts, TAFRAMENS_POSTER).`);
    return { id, titel: e.l.titel, niva: e.l.niva, nr: e.nr ?? 0, farg: farger[e.l.niva], tagg: ramar[e.ri].innehallstagg ?? '', stycken: e.l.lastext?.stycken ?? [], fragor: (e.l.lastext?.fragor ?? []).map((f) => f.replace(/^\d+\.\s*/, '')), bild: former.bild(ramar[e.ri])?.adress ?? '' };
  });
}

/** Datafilen bredvid sidan: det som Visa stort och listan att skriva ut behöver, utan det som redan står i sidan. */
export const taFramData = (t: TaFram) => ({
  poster: t.poster.map((p) => ({ id: p.id, niva: p.niva, nivaSlug: p.nivaSlug, nr: p.nr, titel: p.titel, ...(p.tagg ? { tagg: p.tagg } : {}), sida: p.sida, ...(p.losning ? { losning: p.losning } : {}), bild: p.bild, stycken: p.stycken, fragor: p.fragor, utskrift: p.utskrift })),
  filer: Object.fromEntries(Object.entries(t.filer).map(([k, f]) => [k, { adress: f.adress, byte: f.byte }])),
  nivaer: t.nivaer.map((n) => ({ namn: n.namn, slug: n.slug, farg: n.farg, antal: n.poster.length })),
});
