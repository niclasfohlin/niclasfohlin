// Aktivitetskorten och brainbreakkorten (Gruppstärkande aktiviteter, 2026-10-16, ur metodriggens
// out/gruppstarkande-aktiviteter/TILL-SAJTEN.md). Niclas samma natt: "en till databas där gruppstärkande aktiviteter är
// uppdelade efter relevanta kategorier", "Varje aktivitet ska rymmas på ett A4 och vara kategoriserad med en sådan
// märkning som Bas och Medel har för sin nivå", och "Sedan två databaser. En för brainbreaks". Riggen skriver de två
// databaserna som filer per metod, src/data/aktiviteter/<metodens id>.json och src/data/brainbreaks/<metodens id>.json
// (riggens out/<slug>/aktiviteter.json och brainbreaks.json, gjorda av riggens build/kort.mjs), och kortens bilder ligger
// i public/stodundervisning/<id>/kort/. En metod har korten när filen finns, utan eget fält i metodens fil, som
// skrivkorten (src/lib/skrivkort.ts).
//
// Sidorna som slumpar korten är centrala saker (src/data/centrala.json): Ta fram en aktivitet
// ([id]/aktiviteter.astro, den korta adressen /gruppstarkande) och Ta fram en brainbreak ([id]/brainbreaks.astro,
// /brainbreaks). Aktivitetskorten finns också i Word, en fil per kategori med ett kort per sida
// (src/lib/aktivitetskortform.ts), och utskriften av ett kort på sidan är kortets sida ur kategorins pdf, som Word har
// gjort (METODER.md under Utskriften). Ett korts id och nummer ändras aldrig.

export interface Aktivitetskategori { id: string; namn: string; farg: string }
export interface Aktivitet {
  id: string;
  kategori: string;
  nr: number;
  namn: string;
  /** Vad gruppen gör tillsammans, en mening. */
  rad: string;
  grupp: string;
  tid: string;
  plats: string;
  /** Bara när eleverna rör vid varandra. */
  beroring?: boolean;
  material: string[];
  steg: string[];
  /** Att tänka på. */
  tanka: string[];
  bild: string;
  alt: string;
}
export interface Aktivitetsbank { metod: string; titel: string; kategorier: Aktivitetskategori[]; kort: Aktivitet[] }

export interface Musikkanal { id: string; namn: string; kanal: string; strom: string; reserv: string; sida: string }
export interface Brainbreakkategori { id: string; namn: string; farg: string }
export interface Brainbreak {
  id: string;
  nr: number;
  /** Kategorin, som Lek eller Lugn, som står i kortets band och är en knapp att slumpa ur. */
  kategori: string;
  namn: string;
  /** Klockans förval, 1–10 minuter. */
  minuter: number;
  slag: string;
  /** Kanalen som passar, eller ingen. */
  musik: string;
  plats: string;
  beroring?: boolean;
  text: string;
  bild: string;
  alt: string;
}
export interface Brainbreakbank { metod: string; titel: string; farg: string; kategorier: Brainbreakkategori[]; musik: Musikkanal[]; kort: Brainbreak[] }

const AKTIVITETER = import.meta.glob<Aktivitetsbank>('../data/aktiviteter/*.json', { eager: true, import: 'default' });
const BRAINBREAKS = import.meta.glob<Brainbreakbank>('../data/brainbreaks/*.json', { eager: true, import: 'default' });

const fargFel = (f: string) => !/^[0-9A-Fa-f]{6}$/.test(f);
// En kategori har minst tio kort, och korten har tre till fem kategorier (Niclas 2026-10-16: "En kategori måste ha minst
// 10 kort för att vara en. Och 5 kategorier som mest. (3-5st beroende på vad du hittar)"). Det gäller aktivitetskorten och
// brainbreakkorten.
const KATEGORIER = { minst: 3, mest: 5, kort: 10 };
function kategoriFel(kategorier: { id: string }[], kort: { kategori: string }[]): string[] {
  const fel: string[] = [];
  if (kategorier.length < KATEGORIER.minst || kategorier.length > KATEGORIER.mest) fel.push(`${kategorier.length} kategorier; korten har ${KATEGORIER.minst} till ${KATEGORIER.mest}`);
  for (const k of kategorier) {
    const n = kort.filter((x) => x.kategori === k.id).length;
    if (n < KATEGORIER.kort) fel.push(`kategorin ${k.id} har ${n} kort; en kategori har minst ${KATEGORIER.kort}`);
  }
  return fel;
}
const textFel = (vem: string, falt: string, v: unknown) => (typeof v === 'string' && v.trim() ? [] : [`${vem}: ${falt} saknas eller är inte en text`]);
const listFel = (vem: string, falt: string, v: unknown, tom = false) => (Array.isArray(v) && (tom || v.length) && v.every((x) => typeof x === 'string' && x.trim()) ? [] : [`${vem}: ${falt} är inte en lista med texter`]);

/** Metodens aktivitetskort, eller inget när metoden saknar dem. Bygget stannar på ett kort som inte håller formen. */
export function aktiviteterAv(id: string): Aktivitetsbank | undefined {
  const b = AKTIVITETER[`../data/aktiviteter/${id}.json`];
  if (!b) return undefined;
  const fel: string[] = [];
  const kategorier = new Set(b.kategorier.map((k) => k.id));
  for (const k of b.kategorier) if (fargFel(k.farg) || !/^[a-z0-9-]+$/.test(k.id) || !k.namn?.trim()) fel.push(`kategorin ${k.id}: id, namn och färg (sex hexsiffror)`);
  const sedda = new Set<string>();
  for (const k of b.kort) {
    const vem = k.id ?? `kort ${k.nr}`;
    if (!/^[a-z0-9-]+$/.test(k.id ?? '') || sedda.has(k.id)) fel.push(`${vem}: id saknas, har fel tecken eller finns redan`);
    sedda.add(k.id);
    if (!kategorier.has(k.kategori)) fel.push(`${vem}: kategorin ${k.kategori} saknas bland kategorierna`);
    if (!Number.isInteger(k.nr) || k.nr < 1) fel.push(`${vem}: nr är inte ett heltal från 1`);
    fel.push(...textFel(vem, 'namn', k.namn), ...textFel(vem, 'rad', k.rad), ...textFel(vem, 'grupp', k.grupp), ...textFel(vem, 'tid', k.tid), ...textFel(vem, 'plats', k.plats), ...textFel(vem, 'bild', k.bild), ...textFel(vem, 'alt', k.alt));
    fel.push(...listFel(vem, 'steg', k.steg), ...listFel(vem, 'material', k.material, true), ...listFel(vem, 'tanka', k.tanka, true));
  }
  for (const kat of b.kategorier) {
    const nr = b.kort.filter((k) => k.kategori === kat.id).map((k) => k.nr);
    if (new Set(nr).size !== nr.length) fel.push(`kategorin ${kat.id}: två kort har samma nummer`);
  }
  fel.push(...kategoriFel(b.kategorier, b.kort));
  if (fel.length) throw new Error(`Aktivitetskorten i src/data/aktiviteter/${id}.json:\n  ${fel.join('\n  ')}`);
  return b;
}

/** Metodens brainbreakkort, eller inget när metoden saknar dem. */
export function brainbreaksAv(id: string): Brainbreakbank | undefined {
  const b = BRAINBREAKS[`../data/brainbreaks/${id}.json`];
  if (!b) return undefined;
  const fel: string[] = [];
  if (fargFel(b.farg)) fel.push('farg är inte sex hexsiffror');
  const kanaler = new Set(b.musik.map((m) => m.id));
  const kategorier = new Set((b.kategorier ?? []).map((k) => k.id));
  for (const k of b.kategorier ?? []) if (!/^[a-z0-9-]+$/.test(k.id ?? '') || !k.namn?.trim() || fargFel(k.farg ?? '')) fel.push(`kategorin ${k.id}: id, namn och färg (sex hexsiffror)`);
  fel.push(...kategoriFel(b.kategorier ?? [], b.kort));
  for (const m of b.musik) if (!/^https:\/\//.test(m.strom ?? '') || !/^https:\/\//.test(m.reserv ?? '') || !/^https:\/\//.test(m.sida ?? '') || !m.namn?.trim() || !m.kanal?.trim()) fel.push(`kanalen ${m.id}: namn, kanal och adresserna strom, reserv och sida (https)`);
  const sedda = new Set<string>();
  for (const k of b.kort) {
    const vem = k.id ?? `kort ${k.nr}`;
    if (!/^[a-z0-9-]+$/.test(k.id ?? '') || sedda.has(k.id)) fel.push(`${vem}: id saknas, har fel tecken eller finns redan`);
    sedda.add(k.id);
    if (!Number.isInteger(k.minuter) || k.minuter < 1 || k.minuter > 99) fel.push(`${vem}: minuter är inte ett heltal från 1 till 99`);
    if (k.musik !== 'ingen' && !kanaler.has(k.musik)) fel.push(`${vem}: musiken ${k.musik} är ingen kanal`);
    if (!kategorier.has(k.kategori)) fel.push(`${vem}: kategorin ${k.kategori} saknas bland kategorierna`);
    fel.push(...textFel(vem, 'namn', k.namn), ...textFel(vem, 'text', k.text), ...textFel(vem, 'bild', k.bild), ...textFel(vem, 'alt', k.alt));
  }
  if (new Set(b.kort.map((k) => k.nr)).size !== b.kort.length) fel.push('två kort har samma nummer');
  if (fel.length) throw new Error(`Brainbreakkorten i src/data/brainbreaks/${id}.json:\n  ${fel.join('\n  ')}`);
  return b;
}

/** Sidorna och kortens bilder. */
export const aktiviteterAdress = (id: string) => `/stodundervisning/${id}/aktiviteter`;
export const brainbreaksAdress = (id: string) => `/stodundervisning/${id}/brainbreaks`;
export const kortbildAdress = (id: string, fil: string) => `/stodundervisning/${id}/kort/${fil}`;
/** Kategorins Word-fil med ett kort per sida, och dess pdf ur Word (scripts/bankpdf.mjs). */
export const kategorifilNamn = (id: string, kategori: string) => `${id}-aktivitetskort-${kategori}`;
/** Ett korts pdf: sidan ur kategorins pdf, klippt av scripts/pdfdelar.mjs. */
export const aktivitetPdfNamn = (id: string, kortId: string) => `${id}-aktivitetskort-${kortId}`;
/** Kategorins kort i nummerordning, ett per sida i Word-filen. */
export const kategorinsKort = (b: Aktivitetsbank, kategori: string) => b.kort.filter((k) => k.kategori === kategori).sort((x, y) => x.nr - y.nr);

/** Platsen med stor bokstav, som på riggens kort. */
export const platsText = (p: string) => ({ inne: 'Inne', ute: 'Ute', 'inne eller ute': 'Inne eller ute' } as Record<string, string>)[p.toLowerCase()] ?? p;

// Ett urval är korten i den ordningen, som de tre på sidornas delningskort; utan urval alla kort.
const urvalet = <T extends { id: string }>(kort: T[], urval?: string[]) => (urval ? urval.map((id) => kort.find((k) => k.id === id)).filter((k): k is T => Boolean(k)) : kort);

/** Det som webbläsaren ritar aktivitetskorten ur (src/scripts/kortbanken.ts). */
export function aktiviteterData(id: string, b: Aktivitetsbank, urval?: string[]) {
  return {
    kategorier: b.kategorier.map((k) => ({ id: k.id, namn: k.namn, farg: `#${k.farg}` })),
    kort: urvalet(b.kort, urval).map((k) => ({ ...k, plats: platsText(k.plats), bild: kortbildAdress(id, k.bild), pdf: `/stodundervisning/${aktivitetPdfNamn(id, k.id)}.pdf` })),
  };
}

/** Det som webbläsaren ritar brainbreakkorten ur. */
export function brainbreaksData(id: string, b: Brainbreakbank, urval?: string[]) {
  return {
    farg: `#${b.farg}`,
    kategorier: b.kategorier.map((k) => ({ id: k.id, namn: k.namn, farg: `#${k.farg}` })),
    musik: b.musik.map((m) => ({ id: m.id, namn: m.namn, kanal: m.kanal, strom: m.strom, reserv: m.reserv, sida: m.sida })),
    kort: urvalet(b.kort, urval).map((k) => ({ ...k, bild: kortbildAdress(id, k.bild) })),
  };
}

/** De tre korten på delningskortet till sidan Ta fram en aktivitet (src/lib/delningskort.ts): det första kortet i var
 *  annan kategori, så att bilden visar tre färger. */
export function delningensAktiviteter(b: Aktivitetsbank): string[] {
  const kategorier = [...b.kategorier.filter((_, i) => i % 2 === 0), ...b.kategorier.filter((_, i) => i % 2 === 1)];
  return kategorier.map((kat) => kategorinsKort(b, kat.id)[0]?.id).filter((id): id is string => Boolean(id)).slice(0, 3);
}
/** De tre korten på delningskortet till sidan Ta fram en brainbreak: det första kortet i var annan kategori, som
 *  aktivitetskorten, så att bilden visar brainbreaks av olika slag (de tre första var alla lugna). */
export function delningensBrainbreaks(b: Brainbreakbank): string[] {
  const iOrdning = [...b.kort].sort((x, y) => x.nr - y.nr);
  const kategorier = [...b.kategorier.filter((_, i) => i % 2 === 0), ...b.kategorier.filter((_, i) => i % 2 === 1)];
  return kategorier.map((kat) => iOrdning.find((k) => k.kategori === kat.id)?.id).filter((id): id is string => Boolean(id)).slice(0, 3);
}

/** Varje aktivitetskorts pdf, som en sida ur kategorins pdf (src/pages/stodundervisning/utskrifter.json.ts). */
export function aktiviteternasUtskrifter(id: string): { namn: string; titel: string; delar: { pdf: string; sida: number }[] }[] {
  const b = aktiviteterAv(id);
  if (!b) return [];
  return b.kategorier.flatMap((kat) => kategorinsKort(b, kat.id).map((k, i) => ({ namn: aktivitetPdfNamn(id, k.id), titel: `${kat.namn} ${k.nr}: ${k.namn}`, delar: [{ pdf: kategorifilNamn(id, kat.id), sida: i + 1 }] })));
}
