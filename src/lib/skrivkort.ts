// Skrivkorten (Kortskrivning: skriv varje dag, 2026-10-14, ur metodriggens out/TILL-SAJTEN.md och metodens brev). Ett
// skrivkort är en bild som är början på en berättelse, ett citat eller en händelse med årtal, och biblioteket har 110 kort
// på var och en av nivåerna Bas, Medel och Avancerat. Riggen skriver biblioteket som en fil per metod,
// src/data/skrivkort/<metodens id>.json (riggens out/<slug>/skrivkort.json, gjord av riggens build/skrivkort.mjs), och
// bilderna i två storlekar ligger i public/stodundervisning/<id>/skrivkort/. En metod har skrivkort när filen finns, utan
// eget fält i metodens fil, som en bildserie har sin scenfil.
//
// Sidan som slumpar korten (src/pages/stodundervisning/[id]/skrivkort.astro, Niclas 2026-10-14) läser biblioteket här, och
// Word-filerna med korten (src/lib/skrivkortform.ts) likaså. Ett korts nummer ändras aldrig, och ett kort som stryks
// lämnar sitt nummer tomt.
import { skrivkortAdress } from './skrivkortlank';

export interface Citat { rad: string; vem: string; verk?: string; ar?: number | string; oversatt?: string; skyddat?: boolean }
export interface Handelse { ar: number | string; vad: string; plats?: string; bakgrund?: string }
export interface Skrivkort {
  id: string;
  niva: string;
  nr: number;
  form: 'bild' | 'citat' | 'handelse';
  tema?: string;
  /** Platsen 1–10 i Börja här. */
  borja?: number;
  /** Kortets egen text. Ett bildkort utan den har uppgiften under bilden (fragaBild). */
  text?: string;
  bild?: string;
  citat?: Citat;
  handelse?: Handelse;
}
export interface Skrivbild {
  fil: string;
  liten: string;
  bredd: number;
  hojd: number;
  alt: string;
  /** En mening till läraren om vad bilden visar. Står aldrig på kortet. */
  motiv?: string;
  bakgrund?: string;
  /** Upphovsraden som den står i kortets fot. */
  rad: string;
  upphov?: string;
  licens?: string;
  licensadress?: string;
  adress?: string;
  andrat?: string;
  ai?: boolean;
}
export interface Bibliotek {
  metod: string;
  fraga: string;
  fragaBild: string;
  nivaer: { namn: string; farg: string }[];
  former: string[];
  teman: string[];
  kort: Skrivkort[];
  bilder: Record<string, Skrivbild>;
}

const FILER = import.meta.glob<Bibliotek>('../data/skrivkort/*.json', { eager: true, import: 'default' });

/** Metodens bibliotek, eller inget när metoden saknar skrivkort. Bygget stannar på ett kort vars bild saknas. */
export function skrivkortAv(id: string): Bibliotek | undefined {
  const b = FILER[`../data/skrivkort/${id}.json`];
  if (!b) return undefined;
  const fel = b.kort.flatMap((k) => [
    ...(k.bild && !b.bilder[k.bild] ? [`${k.id}: bilden ${k.bild} saknas bland bilderna`] : []),
    ...(!b.nivaer.some((n) => n.namn === k.niva) ? [`${k.id}: nivån ${k.niva} saknas bland nivåerna`] : []),
    ...(k.form === 'citat' && !k.citat ? [`${k.id}: ett citatkort utan citat`] : []),
    ...(k.form === 'handelse' && !k.handelse ? [`${k.id}: ett händelsekort utan händelse`] : []),
    ...(k.form === 'bild' && !k.bild ? [`${k.id}: ett bildkort utan bild`] : []),
  ]);
  if (fel.length) throw new Error(`Skrivkorten i src/data/skrivkort/${id}.json:\n  ${fel.join('\n  ')}`);
  return b;
}
export { harSkrivkort, kortAdress, skrivkortAdress, SKRIVKORT_LANK } from './skrivkortlank';
export const bildAdress = (id: string, fil: string) => `/stodundervisning/${id}/skrivkort/${fil}`;
/**
 * Det som webbläsaren ritar korten ur (src/scripts/skrivkortet.ts): frågan, nivåernas färger, korten och bilderna med
 * sina adresser, utan källornas mått. Sidan som slumpar korten får alla, delningskortet de kort det visar.
 */
export function kortData(id: string, b: Bibliotek, bara?: string[]) {
  const kort = bara ? bara.map((x) => b.kort.find((k) => k.id === x)!) : b.kort;
  const bilder = new Set(kort.map((k) => k.bild).filter(Boolean));
  return {
    fraga: b.fraga,
    fragaBild: b.fragaBild,
    nivaer: b.nivaer.map((n) => ({ namn: n.namn, farg: `#${n.farg}` })),
    kort: kort.map((k) => ({ id: k.id, niva: k.niva, nr: k.nr, form: k.form, ...(k.text ? { text: k.text } : {}), ...(k.bild ? { bild: k.bild } : {}), ...(k.citat ? { citat: k.citat } : {}), ...(k.handelse ? { handelse: k.handelse } : {}) })),
    bilder: Object.fromEntries(Object.entries(b.bilder).filter(([namn]) => bilder.has(namn)).map(([namn, x]) => [namn, {
      stor: bildAdress(id, x.fil), liten: bildAdress(id, x.liten), alt: x.alt, rad: x.rad,
      ...(x.motiv ? { motiv: x.motiv } : {}), ...(x.bakgrund ? { bakgrund: x.bakgrund } : {}), ...(x.ai ? { ai: true } : {}),
      ...(x.adress ? { adress: x.adress } : {}), ...(x.licens ? { licens: x.licens } : {}), ...(x.licensadress ? { licensadress: x.licensadress } : {}), ...(x.upphov ? { upphov: x.upphov } : {}),
    }])),
  };
}

/**
 * Korten på sidans delningskort (src/lib/delningskort.ts), från vänster: en händelse på Medel, ett bildkort på Bas
 * längst fram i mitten och ett citat på Avancerat, bara med bilder som är fria (CC0 eller public domain), eftersom
 * delningsbilden sprids utan upphovsrad. Månlandningen 1969, elefanten på trehjulingen och Karin Boyes rad. Saknas ett
 * av dem tar bygget ett annat kort på samma nivå med fri bild, eller utan bild.
 */
const DELNING = ['medel-016', 'bas-036', 'avancerat-002'];
export function delningensKort(b: Bibliotek): string[] {
  const fri = (k: Skrivkort) => !k.bild || /^(CC0|Public domain)/i.test(b.bilder[k.bild]?.licens ?? '');
  return DELNING.map((id, i) => {
    const k = b.kort.find((x) => x.id === id);
    if (k && fri(k)) return id;
    const niva = ['Medel', 'Bas', 'Avancerat'][i];
    return b.kort.find((x) => x.niva === niva && fri(x))?.id;
  }).filter((x): x is string => Boolean(x));
}

/** Nivåns Word-fil med ett kort per sida, och dess pdf ur Word (scripts/bankpdf.mjs). */
export const nivafilNamn = (id: string, niva: string) => `${id}-skrivkort-${niva.toLowerCase()}`;
/** Ett korts pdf: sidan ur nivåns pdf, klippt av scripts/pdfdelar.mjs. */
export const kortPdfNamn = (id: string, kortId: string) => `${id}-skrivkort-${kortId}`;
/** Nivåns kort i Word-filens ordning, ett per sida. */
export const nivansKort = (b: Bibliotek, niva: string) => b.kort.filter((k) => k.niva === niva).sort((x, y) => x.nr - y.nr);

/**
 * Korten Börja här i en översikt (ramen Börja här: de tio första passen): kolumner som heter som nivåerna och passets
 * nummer först i raden. lank ger kortets adress på sidan som slumpar korten för en cell med kortets namn, och nivaer
 * nivåns tio kort i ordning. En cell med samma text som ett annat korts blir ingen länk. Inget när översikten inte har
 * metodens kort Börja här.
 */
export function borjaHar(id: string, oversikt: { kolumner: string[]; rader: string[][] }) {
  const b = skrivkortAv(id);
  if (!b) return undefined;
  const celler = new Map<string, string | null>();
  oversikt.rader.forEach((r) => {
    const n = Number(r[0]);
    if (!Number.isInteger(n)) return;
    oversikt.kolumner.forEach((k, i) => {
      const kort = b.kort.find((x) => x.niva === k && x.borja === n);
      const text = (r[i] ?? '').replace(/\s+/g, ' ').trim();
      if (!kort || !text) return;
      const adress = `${skrivkortAdress(id)}#${kort.id}`;
      celler.set(text, celler.has(text) && celler.get(text) !== adress ? null : adress);
    });
  });
  if (!celler.size) return undefined;
  const nivaer = b.nivaer.filter((n) => oversikt.kolumner.includes(n.namn)).map((n) => ({
    namn: n.namn,
    adress: `${skrivkortAdress(id)}#${b.kort.filter((k) => k.niva === n.namn && k.borja).sort((x, y) => x.borja! - y.borja!).map((k) => k.id).join(',')}`,
  }));
  return { lank: (cell: string) => celler.get(cell.replace(/\s+/g, ' ').trim()) ?? undefined, nivaer };
}

/** Varje korts pdf, som en sida ur nivåns pdf (src/pages/stodundervisning/utskrifter.json.ts, scripts/pdfdelar.mjs). */
export function skrivkortensUtskrifter(id: string): { namn: string; titel: string; delar: { pdf: string; sida: number }[] }[] {
  const b = skrivkortAv(id);
  if (!b) return [];
  return b.nivaer.flatMap((n) => nivansKort(b, n.namn).map((k, i) => ({ namn: kortPdfNamn(id, k.id), titel: `Skrivkort: ${k.niva} ${k.nr}`, delar: [{ pdf: nivafilNamn(id, n.namn), sida: i + 1 }] })));
}
