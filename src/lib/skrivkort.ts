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
export const harSkrivkort = (id: string) => Boolean(FILER[`../data/skrivkort/${id}.json`]);

/** Sidan som slumpar korten. */
export const skrivkortAdress = (id: string) => `/stodundervisning/${id}/skrivkort`;
/** Länkens namn, på metodens kort i metodbanken, överst på metodens sida och i menyn (riggens förslag, Niclas 2026-10-14). */
export const SKRIVKORT_LANK = 'Ta fram ett skrivkort';
export const bildAdress = (id: string, fil: string) => `/stodundervisning/${id}/skrivkort/${fil}`;
/** Nivåns Word-fil med ett kort per sida, och dess pdf ur Word (scripts/bankpdf.mjs). */
export const nivafilNamn = (id: string, niva: string) => `${id}-skrivkort-${niva.toLowerCase()}`;
/** Ett korts pdf: sidan ur nivåns pdf, klippt av scripts/pdfdelar.mjs. */
export const kortPdfNamn = (id: string, kortId: string) => `${id}-skrivkort-${kortId}`;
/** Nivåns kort i Word-filens ordning, ett per sida. */
export const nivansKort = (b: Bibliotek, niva: string) => b.kort.filter((k) => k.niva === niva).sort((x, y) => x.nr - y.nr);

/** Varje korts pdf, som en sida ur nivåns pdf (src/pages/stodundervisning/utskrifter.json.ts, scripts/pdfdelar.mjs). */
export function skrivkortensUtskrifter(id: string): { namn: string; titel: string; delar: { pdf: string; sida: number }[] }[] {
  const b = skrivkortAv(id);
  if (!b) return [];
  return b.nivaer.flatMap((n) => nivansKort(b, n.namn).map((k, i) => ({ namn: kortPdfNamn(id, k.id), titel: `Skrivkort: ${k.niva} ${k.nr}`, delar: [{ pdf: nivafilNamn(id, n.namn), sida: i + 1 }] })));
}
