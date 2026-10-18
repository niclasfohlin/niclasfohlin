// Ta fram ur en bank (Niclas 2026-10-18: "Problemen i matte borde vara en databas och kunna hämtas likt ex aktiviteter
// men utifrån sina nivåer", och "Allt är ju att du skapar en slags standard för en databas"; byggplanen och skälen i
// underlag/prov/verktyg/PLAN-3.md och ARBETSORDER.md). Bankens enheter (src/lib/bank.ts) är databasens poster, i
// standardens form (src/lib/standard/, Post), och sidorna Ta fram ett matteproblem ([id]/problem.astro) och Ta fram en
// lästext ([id]/texter.astro), med src/components/TaFram.astro, väljer ur dem efter nivå och tagg. Inget flyttas ur
// metoden: posterna står kvar i metodens fil, och en ny post där kommer med på sidan i nästa bygge.
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
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDict, PDFDocument, PDFName, PDFRawStream, PDFRef } from 'pdf-lib';
import { getCollection, type CollectionEntry } from 'astro:content';
import { arBladsida, bankAv, enhetAdress, foljeFlera, foljeText, nivaFarger, type Bank, type Bankenhet } from './bank';
import { enhetensUtskrifter, radensUtskrifter, utskriftAdress, temanasUtskrifter, type Utskrift } from './utskrift';
import { bladpar, bladRubrik, bladsidaAdress, enhetensBlad, metodensBladmaterial } from './bladmaterial';
import { bildensAlt, bladVid, metodensPaBordet, paBordetVid, type PaBordet } from './pabordet';
import type { Faktatext } from './ramform';
import { sidlasFor } from './sidlas';
import { losningsforslagVy, problemformer } from './problemform';
import type { LosningsforslagVy } from './losningsforslag';
import { centralAv } from './centrala';
import { matteproblemen, matteproblemetsUtskrifter, type Matteproblem } from './matteproblem';
import { handledningensFil, lararhandledningar } from './handledning';
import { databasFel, innehallstaggar, postensRad, slugAv, type Post, type PostUtskrift } from './standard/index.js';

type Metod = CollectionEntry<'stodundervisning'>;
type Karta = { ram?: number; bild?: number; fran: number; till: number }[];

const PUBLIC = join(process.cwd(), 'public');
const MANIFEST = JSON.parse(readFileSync(join(PUBLIC, 'stodundervisning', 'bank-pdf.json'), 'utf8')) as Record<string, { pdf: string; sidor: number; karta?: Karta }>;
const sha8 = (s: string | Buffer) => createHash('sha256').update(s).digest('hex').slice(0, 8);
// Bygget före pdf:erna: npm run validera bygger först och gör sedan pdf:erna ur Word-filerna (scripts/bankpdf.mjs). En ny
// bankfil, eller en vars ramar har flyttat, har då ännu ingen pdf eller karta i bank-pdf.json. Utskriften står då som
// väntande i datafilen (vantar), och bankpdf.mjs bygger om sajten när pdf:erna finns. Netlify bygger aldrig så:
// bankpdf.mjs --kontrollera stannar på en datafil som väntar.
let vantande = false;
const PDF_FINNS = (fil: string) => existsSync(join(PUBLIC, 'stodundervisning', `${fil}.pdf`));

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
    if (!PDF_FINNS(fil)) { vantande = true; return { byte: 2, typsnitt: 1, sidor: 1 }; }
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
    const sidor = (karta ?? []).filter((k) => (del.bild !== undefined ? k.bild === del.bild : k.ram === del.ram && k.bild === undefined))
      .flatMap((k) => Array.from({ length: k.till - k.fran + 1 }, (_, n) => k.fran - 1 + n));
    if (!sidor.length) { vantande = true; sidor.push(0); }
    const sist = kalla.at(-1);
    if (sist && sist.fil === del.pdf) sist.sidor.push(...sidor); else kalla.push({ fil: del.pdf, sidor });
  }
  // Delen klipps först efter bygget (scripts/pdfdelar.mjs), så dess version är källfilernas och sidornas: samma källa
  // och samma sidor ger samma del.
  const version = sha8(JSON.stringify(kalla.map((k) => [MANIFEST[k.fil]?.pdf ?? 'vantar', k.sidor])));
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
  /** Taggarnas id, som raden och sidans knappar bär. */
  taggIds: string[];
  /** Textens eget blad på dess sida (`<sida>#blad-<n>`), där texten börjar: sidan börjar med lärarens sida
   *  (designgranskningen 2026-10-18 natt: länken till texten landade fyra skärmar ovanför den). */
  textAdress?: string;
  /** Bilden utan version, som sidan skriver och scripts/filversion.mjs ger version, och dess mått, när posten har en. */
  bildFil?: string;
  bildMatt?: { bredd: number; hojd: number };
  /** Texten och frågorna för Visa stort. */
  stycken: string[];
  fragor: string[];
  /** Lösningsförslaget för Visa stort (src/lib/losningsforslag.ts), när banken har det. */
  losningsforslag?: LosningsforslagVy;
  /** En faktatexts tema, etikettens första led ("Vatten · text 1 av 5"), och texten för Visa stort som Faktatext.astro
   *  ritar den (src/lib/taframdata.ts): texten, ramens rubrik, bilderna vid ramen och sidlåset. */
  tema?: string;
  /** Textens plats i temat, som kortet och Visa stort visar ("Rymden · text 2 av 5"): ett andra tema på en nivå har
   *  texterna 6 till 10 i metoden (adressen bas-6), men 1 till 5 i temat. */
  temaNr?: number;
  fakta?: { f: Faktatext; rubrik: string; bilder: PaBordet[]; las: number[] };
  /** Faktatextens modell (Niclas 2026-10-18 natt: "En text i fakta ska ha sin modell likt problem har sin lösning, en
   *  ifylld och en tom att skriva ut"): modellens namn, bladet som lärarens sida säger ("Tankekartan, blad 1"),
   *  modellens sida, bladets bild och dess utskrift (enhetensBlad i src/lib/bladmaterial.ts), och den ifyllda modellen,
   *  textens följesida Modellen (arBladsida i src/lib/bank.ts), med sin plats på textens sida, bilden och utskriften. */
  modell?: { namn: string; blad: string; sida: string; bild: { adress: string; alt: string }; bildMatt: { bredd: number; hojd: number }; utskrift: PostUtskrift; ifylld?: { sida: string; bild: { adress: string; alt: string }; bildMatt: { bredd: number; hojd: number }; utskrift: PostUtskrift } };
}
/** Ett tema (faktatexterna): namnet, temats sida ([id]/texter/[tema].astro), texterna i ordning och, när temat har en,
 *  lärarhandledningens fil (src/lib/handledning.ts), Word och pdf utan ändelse. */
export interface TaFramTema { namn: string; slug: string; adress: string; poster: TaFramPost[]; handledning?: string; utskrift?: PostUtskrift }
/** En tagg på sidan: namnet, förklaringen (knappens title), färgen 1–7 (--tagg-1 i global.css) och antalet poster. */
export interface TaFramTagg { id: string; namn: string; om: string; farg: number; antal: number }
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
  /** Det som listan skriver ut med posterna: lösningsförslagen, eller följesidorna i en rad i en bank utan dem, som
   *  "lärarens sida och Två lösningar". foljeEn är detsamma för en post: lösningsförslaget. */
  folje: string;
  foljeEn: string;
  /** Länken vid varje post till dess följesida: Lösningsförslag, som öppnar Visa stort med bladet, eller Lärarens sida,
   *  som leder till sidan bland postens sidor i metoden. */
  losningNamn: string;
  /** Nivåerna med sina poster, och i en bank med teman (faktatexterna) temana i ordning, och nivåns två filer: bara
   *  posterna, och posterna med följesidorna eller, där de står i egna filer (forSig), bara följesidorna. */
  nivaer: { namn: string; slug: string; farg: string; poster: TaFramPost[]; teman?: TaFramTema[]; filer: { bara: Fil; med?: Fil } }[];
  /** Följesidorna står i egna filer (sidorForSig i src/lib/bank.ts): faktatexterna och lärarens sidor. */
  forSig: boolean;
  /** Sidan har bara texterna (Ta fram en lästext och Ta fram en faktatext; Niclas 2026-10-18 natt: "Funderar på om denna
   *  sida med texter bara ska ha texterna. Så för de hitta det andra via metoden som har lärarsidor mm"): kortet har Visa
   *  stort och taggarna, listan och nivån skriver ut texterna, och lärarens sida nås från Visa stort. Ta fram ett
   *  matteproblem har kvar lösningsförslagen vid kortet och i listan (Niclas samma dag: "utan att missa att de finns"). */
  baraTexter: boolean;
  /** Taggarna är ett val på Ta fram ett matteproblem, där innehållet delar nivån (Niclas 2026-10-18: "en innehållstag likt
   *  brainbreaks har"). På sidorna med texter står taggen bara på kortet: faktatexternas struktur, eftersom varje tema har
   *  en text av varje (formgivarnas förslag 2026-10-18 natt, underlag/prov/verktyg/granskning/ide-*.md), och lästexternas
   *  slag (Niclas samma natt: "Slagen kan ju vara som taggar för innehållet men inte för att välja. Tar bort en del plotter
   *  om de inte finns för att välja ut texter"). */
  taggVal: boolean;
  /** Lärarhandledningen till hela banken, när metoden har en (lästexterna): sidan där den står att läsa och skriva ut. */
  handledning?: string;
  taggar: TaFramTagg[];
  /** Vad taggarna är: valets etikett (Innehåll, Slag), en mening till ingressen och en till raden längst ned på sidan. */
  taggText: { etikett: string; ingress: string; kalla: string };
  poster: TaFramPost[];
  /** Källfilerna som listan kan hämta i stället för posternas egna pdf:er. */
  filer: Record<string, Fil>;
}
export interface Fil { namn: string; adress: string; byte: number }

/** Taggarnas färger (--tagg-1 till --tagg-7 i global.css), skilda från nivåernas (Niclas 2026-10-18: "Skulle önska att de
 *  olika taggarna fick varsin färg. Inte samma färg som nivåerna"). En tagg har sin färg efter sin plats bland
 *  databasens taggar, också när en annan tagg saknar poster, så att färgen inte byter tagg. */
export const TAGGFARGER = 7;

/** Bankens led i adressen: problem, texter. Ta fram-sidorna har sina led bland de reserverade (UPPTAGNA_LED). */
export const taFramLed = (b: Bank) => b.ord.slug;
/** Databasens namn i registret (src/data/centrala.json): problemen, lästexterna och faktatexterna, där texterna och
 *  lärarens sidor står i egna filer och texterna hör till teman (Niclas 2026-10-18: "Kanske nivå. Sedan tema. Sedan
 *  enskilda texterna"). */
export const taFramSlag = (b: Bank) => (b.ord.slug === 'problem' ? 'matteproblem' : b.ord.slug === 'texter' ? (b.sidorForSig ? 'faktatexter' : 'lastexter') : undefined);
/** Metoderna med en bank vars Ta fram-sida är led, som problem eller texter. */
export const harTaFram = (m: Metod, led: string) => { const b = bankAv(m.data); return !!b && b.ord.slug === led && !!taFramSlag(b); };

type Ram = NonNullable<Metod['data']['ramar']>['ramar'][number];
// Metodens egna slag (Textsamtal i grupp, tabellen "Slagen: det eleven listar ut") är lästexternas taggar, med metodens
// förklaring, så att de står på ett ställe. En texts slag står på dess lärarsida, i frågornas namn ("Fråga 2 · mellan
// raderna, Vem, syftning").
const metodensSlag = (d: Metod['data']) => {
  const t = (d.tabeller ?? []).find((x) => /^Slagen\b/.test(x.rubrik ?? ''));
  return t?.rader.map((r) => ({ id: slugAv(String(r[0])), namn: String(r[0]), om: `${String(r[0])}: eleven listar ut ${String(r[1] ?? '')}` }));
};
// Faktatexternas byggnad (Faktatextsamtal i grupp, tabellen "De fem modellerna: en för varje sätt att bygga en text"):
// varje sätt har sin modell, och textens modell står på dess lärarsida ("Texten jämför två saker, och modellen är
// Venndiagrammet"). Taggen är sättets namn, det ord lärare söker på, med metodens förklaring och modellens fråga.
const BYGGNAD: Record<string, string> = { Tankekartan: 'Beskrivning', Tidslinjen: 'Tidsordning', Venndiagrammet: 'Jämförelse', Kedjan: 'Orsak och verkan', 'Problem och lösning': 'Problem och lösning' };
const metodensModeller = (d: Metod['data']) => {
  const t = (d.tabeller ?? []).find((x) => /^De fem modellerna\b/.test(x.rubrik ?? ''));
  const k = t?.kolumner?.indexOf('Modellen') ?? -1;
  if (!t || k < 0) return undefined;
  return t.rader.map((r) => {
    const modell = String(r[k]);
    const namn = BYGGNAD[modell] ?? modell;
    return { id: slugAv(namn), namn, modell, om: `Texten ${String(r[0])}, och modellen är ${modell}: ${String(r[k + 1] ?? '')}` };
  });
};
const textensModell = (ram: Ram) => (ram.text ?? []).join(' ').match(/modellen är ([^,.]+)/)?.[1]?.trim();
const textensSlag = (ram: Ram) =>
  [...new Set(ram.delar.flatMap((del) => del.falt.map((f) => f.rubrik.match(/^Fråga \d+ · mellan raderna, ([^,]+)/)?.[1]?.trim()).filter((x): x is string => !!x)))];
const lararsidan = (ramar: Ram[], e: Bankenhet) => [...e.fore, ...e.efter].find((ri) => /^Lärarens sida:/.test(ramar[ri].rubrik));
/** Databasens taggar med förklaring och färg: metodens egna slag (lästexterna), sätten att bygga en text (faktatexterna)
 *  eller kursplanens delar i metodens ämne (problemen). */
const databasensTaggar = (d: Metod['data']) =>
  (metodensSlag(d) ?? metodensModeller(d)?.map(({ id, namn, om }) => ({ id, namn, om })) ?? innehallstaggar(d.omrade).map((t) => ({ id: t.id, namn: t.namn, om: `${t.lgr22}, en del av det centrala innehållet i kursplanen i ${d.omrade.toLowerCase()}` })))
    .map((t, i) => ({ ...t, farg: (i % TAGGFARGER) + 1 }));
/** En enhets taggar: textens slag eller byggnad ur dess lärarsida, eller problemets innehållstagg. */
const enhetensTaggar = (d: Metod['data'], e: Bankenhet): string[] => {
  const ramar = d.ramar!.ramar;
  const ls = lararsidan(ramar, e);
  if (metodensSlag(d)) return ls !== undefined ? textensSlag(ramar[ls]) : [];
  const modeller = metodensModeller(d);
  if (modeller) { const modell = ls !== undefined ? textensModell(ramar[ls]) : undefined; const x = modeller.find((y) => y.modell === modell); return x ? [x.namn] : []; }
  const t = ramar[e.ri].innehallstagg;
  return t ? [t] : [];
};
// Nivåns översikt (Lärarens sidor: Lättläst) säger vad varje text handlar om, i kolumnen Handlar om. Den raden står på
// postens rad, där ett problem har sin första mening.
const handlarOm = (ramar: Ram[], oversikt: number | undefined, nr: number | undefined) => {
  const o = oversikt !== undefined ? ramar[oversikt].oversikt : undefined;
  const k = o?.kolumner.indexOf('Handlar om') ?? -1;
  if (!o || k < 0 || nr === undefined) return undefined;
  const rad = o.rader.find((r) => new RegExp(`^${nr}\\.\\s`).test(String(r[0])));
  return rad ? String(rad[k]) : undefined;
};

const fil = (namn: string): Fil => {
  if (!PDF_FINNS(namn)) { vantande = true; return { namn, adress: `/stodundervisning/${namn}.pdf?v=00000000`, byte: 1 }; }
  return { namn, adress: medVersion(`/stodundervisning/${namn}.pdf`), byte: statSync(join(PUBLIC, 'stodundervisning', `${namn}.pdf`)).size };
};

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
  const slag = taFramSlag(bank);
  const c = slag ? centralAv(slag) : undefined;
  const farger = nivaFarger(d, bank);
  const ramar = d.ramar!.ramar;
  const bilder = metodensPaBordet(d, m.id);
  const former = problemformer(ramar, bilder);
  const egnaSlag = !!metodensSlag(d);
  const modeller = !!metodensModeller(d);
  // Modellernas blad (src/lib/bladmaterial.ts), när metoden har dem: textens modell på Ta fram en faktatext.
  const bm = metodensBladmaterial(d, m.id);
  const par = bm ? bladpar(d, bm) : [];
  const taggar = databasensTaggar(d);
  const post = async (e: Bankenhet): Promise<TaFramPost> => {
    const ram = ramar[e.ri];
    // Problemets bild, eller faktatextens första bild, som raden visar.
    const faktabilder = e.l.faktatext ? paBordetVid(bilder, { ram: ram.rubrik }) : [];
    const bild = former.bild(ram) ?? faktabilder[0];
    if (!bild && slag === 'matteproblem') throw new Error(`Ta fram: ${ram.rubrik} har ingen bild På bordet (src/lib/problemform.ts).`);
    const u = enhetensUtskrifter(d, m.id, bank, e);
    const postensTaggar = enhetensTaggar(d, e);
    const lararsida = lararsidan(ramar, e);
    const stycken = e.l.lastext?.stycken ?? [];
    const niva = bank.nivaer.find((n) => n.enheter.includes(e))!;
    // Lösningsförslaget (Niclas 2026-10-18: "utan att missa att de finns"): bladet Lösningsförslag när metoden har det
    // (metodriggens blad, K-423), annars Lärarens sida, där de två lösningarna står. Ankaret är bladets på postens sida.
    const losningsblad = [...e.fore, ...e.efter].find((ri) => /^Lösningsförslag:/.test(ramar[ri].rubrik)) ?? lararsida;
    // Bladet självt för Visa stort, med bildernas adresser med version, som sidans.
    const lf = e.post !== undefined ? former.losningsforslag(ramar[e.post]) : undefined;
    // Postens rad: vad lästexten handlar om (översikten), vad faktatexten säger (lärarens sida börjar med det) eller
    // problemets första mening.
    const rad = handlarOm(ramar, niva.oversikt, e.nr) ?? (e.l.faktatext && lararsida !== undefined ? postensRad(ramar[lararsida].text?.[0] ?? '') : postensRad(stycken[0] ?? ''));
    return {
      id: e.slug, niva: e.l.niva, nr: e.nr ?? 0, titel: e.l.titel, rad, ...(postensTaggar.length ? { taggar: postensTaggar } : {}),
      sida: enhetAdress(m.id, e), ...(losningsblad !== undefined ? { losning: `${enhetAdress(m.id, e)}#blad-${losningsblad + 1}` } : {}),
      ...(e.fore.length ? { textAdress: `${enhetAdress(m.id, e)}#blad-${e.ri + 1}` } : {}),
      ...(bild ? { bild: { adress: medVersion(bild.adress), alt: bildensAlt(bild) }, bildFil: bild.adress, bildMatt: bild.matt } : {}),
      // Där följesidorna står i egna filer skriver listan ut dem för sig, utan texten (enhetensUtskrifter, folje).
      utskrift: { post: await postUtskrift(u.ramar.get(e.ri)!), med: await postUtskrift(u.folje ?? u.post ?? u.alla) },
      nivaSlug: niva.slug, farg: farger[e.l.niva],
      taggIds: postensTaggar.map((t) => taggar.find((x) => x.namn === t)?.id ?? slugAv(t)),
      stycken, fragor: (e.l.lastext?.fragor ?? []).map((f) => f.replace(/^\d+\.\s*/, '')),
      ...(lf ? { losningsforslag: losningsforslagVy(lf, (b) => ({ adress: medVersion(b.adress), alt: bildensAlt(b) })) } : {}),
      ...(e.l.faktatext ? { ...(e.tema ? { tema: e.tema } : {}), fakta: { f: e.l.faktatext, rubrik: ram.rubrik, bilder: faktabilder, las: sidlasFor(m.id, ram.rubrik) } } : {}),
      ...(await modellen(e)),
    };
  };
  // Faktatextens modell: bladet som lärarens sida säger, med bladets utskrift ur modellens filer.
  const modellen = async (e: Bankenhet): Promise<Pick<TaFramPost, 'modell'>> => {
    const funnet = bm && e.l.faktatext ? enhetensBlad(d, bm, e, par) : undefined;
    // En faktatext har en modell: står den inte i tabellen som parar texter och modeller, eller säger lärarens sida inget
    // blad som finns, stannar bygget, i stället för att länken Modellen försvinner (Codex-granskningen 2026-10-18 natt).
    if (funnet && (funnet.raderna.length !== 1 || !funnet.blad)) throw new Error(`Ta fram: ${e.l.niva}, ${e.l.vad}: ${e.l.titel} ${funnet.raderna.length !== 1 ? `står med ${funnet.raderna.length} modeller i tabellen som parar texter och modeller` : `hör till ${funnet.raderna[0].namn}, men lärarens sida säger inget blad som finns ("${funnet.raderna[0].namn}, blad <nummer>")`} (src/lib/bladmaterial.ts, enhetensBlad).`);
    const x = funnet?.blad;
    if (!bm || !x) return {};
    const u = radensUtskrifter(d, m.id, bm, x.rad).blad.get(x.b.bild.nr);
    if (!u) return {};
    // Den ifyllda modellen: bladet efter textens följesida Modellen, med utskriften ur nivåns fil.
    const fri = e.efter.find((ri) => arBladsida(ramar[ri]));
    const fb = fri !== undefined ? bladVid(bilder, ramar[fri].rubrik)[0] : undefined;
    const fu = fri !== undefined ? enhetensUtskrifter(d, m.id, bank, e).ramar.get(fri) : undefined;
    if (fri !== undefined && (!fb || !fu)) throw new Error(`Ta fram: ${ramar[fri].rubrik} har inget blad, så den ifyllda modellen saknas (src/lib/tafram.ts).`);
    const ifylld = fb && fu ? { sida: `${enhetAdress(m.id, e)}#blad-${fri! + 1}`, bild: { adress: medVersion(fb.adress), alt: bildensAlt(fb) }, bildMatt: fb.matt, utskrift: await postUtskrift(fu) } : undefined;
    return { modell: { namn: x.rad.namn, blad: bladRubrik(x.rad, x.b), sida: bladsidaAdress(m.id, x.rad), bild: { adress: medVersion(x.b.adress), alt: bildensAlt(x.b) }, bildMatt: x.b.matt, utskrift: await postUtskrift(u), ...(ifylld ? { ifylld } : {}) } };
  };
  // Ta fram ett matteproblem: metodens problem och databasens (src/lib/matteproblem.ts), med utskrifterna ur sidans egna
  // filer, en per nivå med nivåns alla problem. Databasens problem har ingen sida i metoden, och länken till
  // lösningsförslaget är då dess pdf, som Visa stort öppnar i stället när sidan har JavaScript.
  const strip = (f: string) => f.replace(/^\d+\.\s*/, '');
  const problemPost = async (alla: Matteproblem[], p: Matteproblem): Promise<TaFramPost> => {
    const u = matteproblemetsUtskrifter(alla, p);
    const utskrift = { post: await postUtskrift(u.post), med: await postUtskrift(u.med) };
    const e = p.enhet;
    const blad = e && [...e.fore, ...e.efter].find((ri) => /^Lösningsförslag:/.test(ramar[ri].rubrik));
    return {
      id: p.id, niva: p.niva, nr: p.nr, titel: p.titel, rad: postensRad(p.l.stycken[0] ?? ''), ...(p.tagg ? { taggar: [p.tagg] } : {}),
      ...(e ? { sida: enhetAdress(m.id, e), ...(blad !== undefined ? { losning: `${enhetAdress(m.id, e)}#blad-${blad + 1}` } : {}) } : { losning: utskrift.med.adress }),
      bild: { adress: medVersion(p.bild.adress), alt: bildensAlt(p.bild) }, bildFil: p.bild.adress, bildMatt: p.bild.matt,
      utskrift, nivaSlug: bank.nivaer.find((n) => n.namn === p.niva)!.slug, farg: farger[p.niva],
      taggIds: p.tagg ? [taggar.find((x) => x.namn === p.tagg)?.id ?? slugAv(p.tagg)] : [],
      stycken: p.l.stycken, fragor: p.l.fragor.map(strip),
      losningsforslag: losningsforslagVy(p.lf, (b) => ({ adress: medVersion(b.adress), alt: bildensAlt(b) })),
    };
  };
  // Kartläggningens texter (utan nummer, som "Kartläggning före: Bland vagnarna") är elevens prov före och efter
  // perioden och står inte bland posterna: läst i förväg säger de inget om vad eleven har lärt sig.
  const poster: TaFramPost[] = [];
  if (slag === 'matteproblem') {
    const alla = matteproblemen(m, (await getCollection('matteproblem')).map((x) => ({ id: x.id, data: x.data })));
    for (const p of alla) poster.push(await problemPost(alla, p));
  } else for (const e of bank.enheter.filter((x) => x.nr !== undefined)) poster.push(await post(e));
  const fel = databasFel(poster, taggar);
  if (fel.length && !vantande) throw new Error(`Ta fram (${d.titel}): ${fel.length} fel i databasen:\n  ${fel.join('\n  ')}`);
  // Källfilerna som posternas sidor står i, och nivåns två filer att skriva ut hela nivån (bankfiler i src/lib/bank.ts).
  const filer: Record<string, Fil> = {};
  for (const p of poster) for (const u of Object.values(p.utskrift)) for (const k of u.kalla) filer[k.fil] ??= fil(k.fil);
  // Temana med lärarhandledning (src/lib/handledning.ts), och temats texter i en pdf (temanasUtskrifter).
  const handledningarna = [...lararhandledningar(ramar).values()];
  const handledda = new Set(handledningarna.map((h) => h.tema));
  const temanasPdf = new Map<string, PostUtskrift>();
  for (const [tema, u] of temanasUtskrifter(d, m.id, bank)) temanasPdf.set(tema, await postUtskrift(u));
  const nivaer = bank.nivaer.filter((n) => poster.some((p) => p.nivaSlug === n.slug)).map((n) => {
    const egna = poster.filter((p) => p.nivaSlug === n.slug);
    // Nivåns filer: den med bara posterna, och den andra som posternas följesidor står i (med följesidorna, eller bara
    // följesidorna där de står för sig).
    const bara = egna[0].utskrift.post.kalla[0].fil;
    const med = egna[0].utskrift.med.kalla.map((k) => k.fil).find((f) => f !== bara);
    // Temana i den ordning texterna står, när posterna har teman. Har en text på nivån inget tema när de andra har det, eller
    // ett namn utan bokstäver, stannar bygget: annars blev det ett namnlöst tema med adressen /texter/ (Codex-granskningen
    // 2026-10-18 natt).
    const utan = egna.some((p) => p.tema) ? egna.filter((p) => !p.tema || !slugAv(p.tema)) : [];
    if (utan.length) throw new Error(`Ta fram (${d.titel}): ${utan.map((p) => `${p.niva}, text ${p.nr}: ${p.titel}`).join('; ')} har inget tema, men andra texter på nivån har det. Ge ramen fältet tema, med ett namn som temats sida och filer kan heta efter (src/lib/bank.ts, src/lib/handledning.ts).`);
    const teman = egna.some((p) => p.tema) ? [...new Set(egna.map((p) => p.tema ?? ''))].map((namn) => ({ namn, slug: slugAv(namn), adress: `${adress}/${slugAv(namn)}`, poster: egna.filter((p) => (p.tema ?? '') === namn), ...(handledda.has(namn) ? { handledning: handledningensFil(m.id, { tema: namn }) } : {}), ...(temanasPdf.has(namn) ? { utskrift: temanasPdf.get(namn) } : {}) })) : undefined;
    for (const tema of teman ?? []) tema.poster.forEach((p, i) => { p.temaNr = i + 1; });
    return { namn: n.namn, slug: n.slug, farg: farger[n.namn], poster: egna, ...(teman ? { teman } : {}), filer: { bara: filer[bara], ...(med ? { med: filer[med] } : {}) } };
  });
  // Ett tema heter något som inget annat tema i metoden heter: temats sida, dess lärarhandledning och dess fil heter efter
  // namnet utan nivån (/texter/<tema>, <id>-lararhandledning-<tema>), så två nivåer med samma tema skulle dela adress.
  const allaTeman = nivaer.flatMap((n) => (n.teman ?? []).map((x) => ({ niva: n.namn, namn: x.namn, slug: x.slug, poster: x.poster })));
  // Handledningens texter är temats texter, en del per text med textens titel, så att varje text på temats sida leder till
  // sin del i handledningen och ingen del står utan text (Codex-granskningen 2026-10-18 natt: en felstavad titel tog bort
  // länken utan att något sades).
  for (const h of handledningarna) {
    const tema = allaTeman.find((x) => x.namn === h.tema);
    if (!tema) continue;
    const titlar = tema.poster.map((p) => p.titel);
    const delar = h.texter.map((x) => x.titel);
    const saknas = titlar.filter((t) => delar.filter((x) => x === t).length !== 1);
    const over = delar.filter((x) => !titlar.includes(x));
    if (saknas.length || over.length) throw new Error(`Ta fram (${d.titel}): lärarhandledningen till ${h.tema} har inte en del per text i temat.${saknas.length ? ` Texter utan en egen del: ${saknas.join(', ')}.` : ''}${over.length ? ` Delar som inte är en text i temat: ${over.join(', ')}.` : ''} Delens rubrik är "<nummer> <textens titel>: <modellen>" (src/lib/handledning.ts).`);
  }
  for (const x of allaTeman) {
    const samma = allaTeman.filter((y) => y.slug === x.slug);
    if (samma.length > 1) throw new Error(`Ta fram (${d.titel}): temat ${x.namn} står på nivåerna ${samma.map((y) => y.niva).join(' och ')}. Ett tema har ett namn som inget annat tema i metoden har, eftersom temats sida, lärarhandledningen och filerna heter efter namnet (${adress}/${x.slug}, ${m.id}-lararhandledning-${x.slug}). Ge temat ett eget namn i metodens fil.`);
  }
  const medPoster = taggar.map((t) => ({ ...t, antal: poster.filter((p) => p.taggar?.includes(t.namn)).length })).filter((t) => t.antal > 0);
  return {
    metod: m.id, titel: d.titel, omrade: d.omrade, namn: c?.namn ?? `Ta fram ett ${bank.ord.en}`, adress, ...(c?.kort ? { kort: c.kort } : {}), led,
    ord: bank.ord,
    // Det som skrivs ut med posten: lösningsförslaget, eller, där följesidorna står i egna filer (faktatexterna), lärarens
    // sida och den ifyllda modellen, som textens sida i metoden skriver ut. Listan på sidorna med texter skriver bara ut
    // texterna (baraTexter).
    ...(bank.sidorForSig
      ? { folje: foljeFlera(bank).toLowerCase(), foljeEn: foljeText(bank) }
      : bank.post
      ? { folje: bank.post.alla.toLowerCase(), foljeEn: bank.post.bestamd }
      : (() => { const f = bank.foljesidor.map((n) => (/^Lärarens sida$/i.test(n) ? n.toLowerCase() : n)).join(' och '); return { folje: f, foljeEn: f }; })()),
    losningNamn: !bank.post || bank.post.namn === 'Lösningsförslag' ? 'Lösningsförslag' : bank.post.namn,
    nivaer, forSig: bank.sidorForSig, baraTexter: led === 'texter', taggVal: medPoster.length > 0 && led !== 'texter', taggar: medPoster,
    // Lästexternas lärarhandledning har en egen sida under Ta fram ([id]/texter/lararhandledning.astro).
    ...(bank.handledning !== undefined ? { handledning: `${adress}/lararhandledning` } : {}),
    taggText: egnaSlag
      ? { etikett: 'Slag', ingress: ` Taggen vid texten säger vad eleven ska lista ut mellan raderna.`, kalla: ' Taggarna är metodens slag av frågor mellan raderna, ur tabellen Slagen: det eleven listar ut.' }
      : modeller
        ? { etikett: 'Struktur', ingress: ` Taggen vid texten säger hur den är byggd.`, kalla: ' Strukturen på varje text är ett av de fem sätten att bygga en text, ur tabellen De fem modellerna, och varje sätt har sin modell.' }
        : { etikett: 'Innehåll', ingress: ` Tryck på en tagg för att se ${bank.ord.alla} i en del av ${d.omrade.toLowerCase()}en.`, kalla: ` Taggarna är delarna av det centrala innehållet i kursplanen i ${d.omrade.toLowerCase()} (Skolverket, Lgr22).` },
    poster, filer,
  };
}

/** Det som delningskortet ritar för några poster (src/pages/delning/tafram/[namn].astro): titeln, nivån, texten, frågorna,
 *  taggarna och bilden, utan utskrifterna, så att kortet inte behöver läsa pdf:erna. */
export function taFramKortposter(m: Metod, ids: string[]) {
  const d = m.data;
  const bank = bankAv(d)!;
  const farger = nivaFarger(d, bank);
  const ramar = d.ramar!.ramar;
  const bilder = metodensPaBordet(d, m.id);
  const former = problemformer(ramar, bilder);
  const taggar = databasensTaggar(d);
  return ids.map((id) => {
    const e = bank.enheter.find((x) => x.slug === id);
    if (!e) throw new Error(`Ta fram: ${d.titel} har ingen post ${id} att rita på delningskortet (src/lib/delningskort.ts, TAFRAMENS_POSTER).`);
    return {
      id, titel: e.l.titel, niva: e.l.niva, nr: e.nr ?? 0, farg: farger[e.l.niva], en: bank.ord.en,
      taggar: enhetensTaggar(d, e).map((namn) => ({ namn, farg: taggar.find((x) => x.namn === namn)?.farg ?? 1 })),
      stycken: e.l.lastext?.stycken ?? e.l.faktatext?.ingress ?? [], fragor: (e.l.lastext?.fragor ?? []).map((f) => f.replace(/^\d+\.\s*/, '')),
      bild: (former.bild(ramar[e.ri]) ?? (e.l.faktatext ? paBordetVid(bilder, { ram: ramar[e.ri].rubrik })[0] : undefined))?.adress ?? '',
    };
  });
}

/** Datafilen bredvid sidan: det som Visa stort och listan att skriva ut behöver, utan det som redan står i sidan. Ett
 *  lösningsförslag står utan problemet, som posten redan har, och rutan, som är densamma på alla, står en gång
 *  (losningsruta); webbläsaren sätter ihop bladet (src/scripts/tafram.ts). */
export const taFramData = (t: TaFram) => ({
  poster: t.poster.map((p) => ({
    id: p.id, niva: p.niva, nivaSlug: p.nivaSlug, nr: p.nr, titel: p.titel, ...(p.taggar ? { taggar: p.taggar } : {}), sida: p.sida, ...(p.losning ? { losning: p.losning } : {}), ...(p.bild ? { bild: p.bild } : {}), stycken: p.stycken, fragor: p.fragor, utskrift: p.utskrift,
    ...(p.modell ? { modell: p.modell } : {}),
    ...(p.losningsforslag ? { losningsforslag: (({ problem: _p, ruta: _r, ...lf }) => lf)(p.losningsforslag) } : {}),
  })),
  ...(t.poster.find((p) => p.losningsforslag) ? { losningsruta: t.poster.find((p) => p.losningsforslag)!.losningsforslag!.ruta } : {}),
  filer: Object.fromEntries(Object.entries(t.filer).map(([k, f]) => [k, { adress: f.adress, byte: f.byte }])),
  nivaer: t.nivaer.map((n) => ({ namn: n.namn, slug: n.slug, farg: n.farg, antal: n.poster.length })),
  ...(vantande ? { vantar: true } : {}),
});
