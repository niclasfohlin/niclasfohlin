// Banken: texter eller problem i nivåer som står på egna sidor (Niclas 2026-10-10 om Problemlösning i grupp: trettio
// problem i tre nivåer med tre sidor var, "Känns konstigt om allt bara ska ligga scrollandes på mobilen i evigheter", och
// "skapa en struktur för hur problemen hittas, visas och listas så det inte blir svåröverskådligt eller evigt scrollande i
// onödan", med möjlighet "att bara skriva ut problem utan allt annat och bara problem samt med tillhörande lärarens sida
// och kontrastpar"). Textsamtal i grupp har samma form med femtio texter (K-163: utskriften av hela beskrivningen var 201
// sidor).
//
// Banken känns igen på ramarnas rubriker, utan nya fält, med samma regler som materialets lista (ramindex.ts):
//   en enhet är en lästext, "<nivå>, <vad>: <titel>" (lastexter i ramform.ts), som "Bas, problem 1: Äpplena";
//   en följesida är en ram som heter "<namn>: <nivå>, <vad>, <titel>", som "Lärarens sida: Bas, problem 1, Äpplena" och
//   "Två lösningar: Bas, problem 1, Äpplena", och hör till enheten med samma nivå, vad och titel;
//   nivåns översikt är ramen "Lärarens sidor: <nivå>".
// En metod har en bank när den har minst BANK_MINST enheter och minst en följesida. Då står varje enhet med sina
// följesidor på en egen sida, /stodundervisning/<id>/<nivå>-<nummer> ([id]/[enhet].astro), och metodens sida visar
// nivåernas översikter med länkar till sidorna och filerna (Metod.astro, Bankfiler.astro). Word-filerna och pdf:erna
// finns per nivå och för alla nivåer, med bara enheterna (elevens blad) eller med följesidorna (metoddocx.ts, bankDokument;
// scripts/bankpdf.mjs).
// Banken lägger bara till och tar inget bort (Niclas 2026-10-10: "Om skriv ut hela beskrivningen i alla är verkligen att
// skriva ut allt bör denna också vara det? Gillar inte riktigt för mycket specialfall från sida till sida"): utskriften av
// allt, Word-filen Allt om metoden och planeringsmallarna har enheterna med följesidorna, nivå för nivå, som i
// andra metoder, och Bara beskrivningen har dem inte (METODER.md under Utskriften). Bara skärmen är kortare: där står
// enheterna på sina egna sidor.
//
// Inga Node-beroenden: Word-filen av flera metoder byggs i webbläsaren med samma regel.
import { lastexter, type Lastext } from './ramform';

type Ram = Parameters<typeof lastexter>[0][number];
type Metod = { ramar?: { ramar: Ram[] } };

/** Färre enheter än så står kvar på metodens sida, som förut. */
export const BANK_MINST = 10;

/** Enhetens ord ur vad ("problem 1", "text 1"): ett problem, problemet, problem, problemen. Ett nytt ord läggs till här. */
const ORD: Record<string, { en: string; bestamd: string; flera: string; alla: string }> = {
  problem: { en: 'problem', bestamd: 'problemet', flera: 'problem', alla: 'problemen' },
  text: { en: 'text', bestamd: 'texten', flera: 'texter', alla: 'texterna' },
};

export interface Bankenhet {
  /** Lästextens plats bland ramarna. */
  ri: number;
  l: Lastext;
  /** Numret ur vad ("problem 4" ger 4), annars inget (kartläggning före). */
  nr?: number;
  /** Sidans namn i adressen: nivån och numret, "bas-4", eller nivån och vad, "lattlast-kartlaggning-fore". */
  slug: string;
  /** Följesidorna i filens ordning, före och efter enheten: Textsamtal har lärarsidorna samlade före texterna. */
  fore: number[];
  efter: number[];
}
export interface Bankniva { namn: string; nivaNr: number; slug: string; oversikt?: number; enheter: Bankenhet[] }
export interface Bank {
  ord: { en: string; bestamd: string; flera: string; alla: string; slug: string };
  /** Följesidornas namn i den ordning de först kommer: Lärarens sida, Två lösningar. */
  foljesidor: string[];
  nivaer: Bankniva[];
  enheter: Bankenhet[];
  /** Ramarna som står på enheternas sidor och på metodens sida bara i utskriften: enheterna och följesidorna. */
  ramar: Set<number>;
  /** Nivåernas översikter, som står på metodens sida i bankens nivåer. */
  oversikter: Set<number>;
}

export const slugAv = (s: string) => s.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/[éè]/g, 'e').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Adressens sista led får inte krocka med metodens andra sidor under /stodundervisning/<id>/.
const UPPTAGNA = new Set(['lathund', 'serier']);

export function bankAv(d: Metod): Bank | null {
  const ramar = d.ramar?.ramar ?? [];
  const texter = lastexter(ramar);
  if (texter.size < BANK_MINST) return null;
  const nycklar = new Map<string, Bankenhet>();
  const nivaer = new Map<string, Bankniva>();
  const enheter: Bankenhet[] = [];
  let ordet: string | undefined;
  ramar.forEach((ram, ri) => {
    const l = texter.get(ram);
    if (!l) return;
    const m = l.vad.match(/^(\S+) (\d+)$/);
    if (m) ordet ??= m[1].toLowerCase();
    if (!nivaer.has(l.niva)) nivaer.set(l.niva, { namn: l.niva, nivaNr: l.nivaNr, slug: slugAv(l.niva), enheter: [] });
    const e: Bankenhet = { ri, l, nr: m ? Number(m[2]) : undefined, slug: `${slugAv(l.niva)}-${m ? m[2] : slugAv(l.vad)}`, fore: [], efter: [] };
    nivaer.get(l.niva)!.enheter.push(e);
    enheter.push(e);
    nycklar.set(`${l.niva}, ${l.vad}, ${l.titel}`, e);
  });
  const foljesidor: string[] = [];
  const bankramar = new Set(enheter.map((e) => e.ri));
  const oversikter = new Set<number>();
  ramar.forEach((ram, ri) => {
    if (bankramar.has(ri)) return;
    const sidor = ram.rubrik.match(/^Lärarens sidor: (.+)$/);
    if (sidor && nivaer.has(sidor[1]) && nivaer.get(sidor[1])!.oversikt === undefined) { nivaer.get(sidor[1])!.oversikt = ri; oversikter.add(ri); return; }
    const m = ram.rubrik.match(/^([^:]+): (.+)$/);
    const e = m && nycklar.get(m[2]);
    if (!e) return;
    (ri < e.ri ? e.fore : e.efter).push(ri);
    if (!foljesidor.includes(m[1])) foljesidor.push(m[1]);
    bankramar.add(ri);
  });
  if (!foljesidor.length) return null;
  const ord = ORD[ordet ?? ''];
  if (!ord) throw new Error(`Banken: enheterna heter "${ordet ?? enheter[0].l.vad}", som src/lib/bank.ts inte har ord för. Lägg till ordet i ORD (ett problem, problemet, problem, problemen).`);
  const slugar = new Set<string>();
  for (const e of enheter) {
    if (UPPTAGNA.has(e.slug) || slugar.has(e.slug)) throw new Error(`Banken: två enheter, eller en enhet och en annan sida, får adressen ${e.slug} (${ramar[e.ri].rubrik}). Ge nivån eller numret ett annat namn.`);
    slugar.add(e.slug);
  }
  return { ord: { ...ord, slug: slugAv(ord.flera) }, foljesidor, nivaer: [...nivaer.values()], enheter, ramar: bankramar, oversikter };
}

/** Enhetens sida. */
export const enhetAdress = (id: string, e: Bankenhet) => `/stodundervisning/${id}/${e.slug}`;
/** Enhetens namn i en mening eller länk: "Bas, problem 1: Äpplena". */
export const enhetNamn = (e: Bankenhet) => `${e.l.niva}, ${e.l.vad}: ${e.l.titel}`;

/** Följesidornas namn i en rad: "lärarens sida och Två lösningar". Lärarens sida är ett vanligt ord, de andra namn på blad. */
export const foljeText = (b: Bank) => {
  const ord = b.foljesidor.map((n) => (/^Lärarens sida$/i.test(n) ? n.toLowerCase() : n));
  return ord.length > 1 ? `${ord.slice(0, -1).join(', ')} och ${ord[ord.length - 1]}` : ord[0];
};

/** En fil ur banken: en nivå eller alla, med bara enheterna eller med följesidorna. */
export interface Bankfil { namn: string; niva?: Bankniva; medFoljesidor: boolean; rubrik: string }
export function bankfiler(id: string, b: Bank): Bankfil[] {
  const ut: Bankfil[] = [];
  for (const niva of [undefined, ...b.nivaer]) {
    for (const medFoljesidor of [false, true]) {
      const namn = `${id}-${b.ord.slug}-${niva ? niva.slug : 'alla'}${medFoljesidor ? '-med-lararens-sida' : ''}`;
      const vad = medFoljesidor ? `${b.ord.alla} med ${foljeText(b)}` : `bara ${b.ord.alla}`;
      ut.push({ namn, niva, medFoljesidor, rubrik: `${niva ? niva.namn : 'Alla nivåer'}: ${vad}` });
    }
  }
  return ut;
}

/** Ramarna i en fil ur banken, i ordning: per nivå översikten och sedan enhet för enhet med följesidorna runt. */
export function bankfilensRamar(b: Bank, f: Pick<Bankfil, 'niva' | 'medFoljesidor'>): number[] {
  return (f.niva ? [f.niva] : b.nivaer).flatMap((n) => [
    ...(f.medFoljesidor && n.oversikt !== undefined ? [n.oversikt] : []),
    ...n.enheter.flatMap((e) => (f.medFoljesidor ? [...e.fore, e.ri, ...e.efter] : [e.ri])),
  ]);
}

/** Enheten som en cell i nivåns översikt pekar på: "1. Äpplena", "Kartläggning före: Bland vagnarna" eller titeln. */
export function enhetICell(n: Bankniva, cell: string): Bankenhet | undefined {
  const c = cell.replace(/\s+/g, ' ').trim().toLowerCase();
  return n.enheter.find((e) => {
    const t = e.l.titel.toLowerCase();
    return c === t || (e.nr !== undefined && c === `${e.nr}. ${t}`) || c === `${e.l.vad}: ${t}`.toLowerCase();
  });
}

/** Raden om bankens filer och sidor, i beskrivningen före nivåerna: i Word (metodBarn) och i sidans utskrift (Metod.astro). */
export const bankRad = (b: Bank, adress: string) => {
  const alla = b.ord.alla.charAt(0).toLocaleUpperCase('sv') + b.ord.alla.slice(1);
  return `${alla} finns också i egna filer, en för varje nivå och en för alla nivåer: bara ${b.ord.alla}, eller ${b.ord.alla} med ${foljeText(b)}. Filerna finns på ${adress}, och varje ${b.ord.en} har en egen sida där.`;
};

/** Förra och nästa enhet på samma nivå. */
export function grannar(b: Bank, e: Bankenhet): { forra?: Bankenhet; nasta?: Bankenhet; niva: Bankniva; plats: number } {
  const niva = b.nivaer.find((n) => n.enheter.includes(e))!;
  const i = niva.enheter.indexOf(e);
  return { forra: niva.enheter[i - 1], nasta: niva.enheter[i + 1], niva, plats: i + 1 };
}

/** Boksidornas nivåfärger, i den ordning nivåerna först kommer (grön, ockra, plommon), som Metod.astro och Word. */
export const BOKNIVA = ['#4e7a43', '#a8742a', '#6e3450'];
/** Nivåernas färger: metodens egna (nivaer) eller boksidornas. */
export const nivaFarger = (d: { nivaer?: { namn: string; farg: string }[] }, b: Bank): Record<string, string> =>
  Object.fromEntries(b.nivaer.map((n) => { const egen = d.nivaer?.find((x) => x.namn === n.namn)?.farg; return [n.namn, egen ? `#${egen.toLowerCase()}` : BOKNIVA[n.nivaNr] ?? '#4b3a2f']; }));
