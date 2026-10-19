// Typerna för src/lib/standard/index.js (se filen och REGLER.md).

/** Adressens led ur ett namn: små bokstäver, utan tecken över bokstäverna, annat än a–z och siffror som bindestreck. */
export declare const slugAv: (s: string) => string;

/** Leden under /stodundervisning/<metod>/ som metodens egna sidor redan har. */
export declare const UPPTAGNA_LED: readonly string[];

/** En innehållstagg: namnet på sidan och i metodens fil, och kursplanens rubrik. */
export interface Innehallstagg { namn: string; lgr22: string }

/** Innehållstaggarna per ämne: för Matematik de fem delarna av det centrala innehållet i Lgr22. */
export declare const INNEHALLSTAGGAR: Readonly<Record<string, readonly Innehallstagg[]>>;

/** Ämnets innehållstaggar med sina id, i kursplanens ordning, eller en tom lista. */
export declare const innehallstaggar: (omrade: string) => (Innehallstagg & { id: string })[];

/** Postens egen första mening, kortad vid ett ord när den är längre än langst tecken (förval 120). */
export declare function postensRad(stycke: string, langst?: number): string;

/** Ett slag av utskrift för en post: postens egen pdf och var dess sidor står i källfilerna. */
export interface PostUtskrift {
  /** Postens pdf med version: /stodundervisning/<namn>.pdf?v=<åtta tecken>. */
  adress: string;
  /** Postens pdf:s storlek, uppskattad ur källfilen. */
  byte: number;
  /** Källfilerna med sidornas index, från 0. */
  kalla: { fil: string; sidor: number[] }[];
}

/** En post ur en databas. */
export interface Post {
  /** Adressens led ur nivån och numret, som bas-1. */
  id: string;
  niva: string;
  nr: number;
  titel: string;
  /** Postens egen första mening. */
  rad: string;
  /** Innehållstaggarnas namn, när databasen har taggar: en för ett problem, flera för en text. */
  taggar?: string[];
  /** Postens egen sida, när posten står i en metod; en post ur en databas utan metod har ingen. */
  sida?: string;
  /** Adressen till postens lösningsförslag: på postens sida, eller, för en post utan sida, postens pdf med lösningsförslaget. */
  losning?: string;
  /** Postens bild, när den har en; lästexterna har ingen. */
  bild?: { adress: string; alt: string };
  /** Varje slag av utskrift, som post (bara problemet) och med (problemet med lösningsförslaget, eller med lärarens sida i en bank utan lösningsförslag). */
  utskrift: Record<string, PostUtskrift>;
}

/** Felen i en post, som en lista. */
export declare function postFel(p: Post, taggar: { namn: string }[]): string[];

/** Felen i en hel databas: posternas fel, dubbla id och nummer som inte står i ordning på sin nivå. */
export declare function databasFel(poster: Post[], taggar: { namn: string }[]): string[];

/** Det billigaste sättet att hämta listans sidor: posternas egna pdf:er eller källfilen en gång, per källfil. */
export declare function hamtplan(
  lista: { id: string; u: PostUtskrift }[],
  filer: Record<string, { adress: string; byte: number }>,
): { hamta: { adress: string; byte: number }[]; sidor: { adress: string; index: number[] | null }[]; byte: number };

/** De fasta antalen av en databas poster (från fem) och grupper (från två) i en text, som "tjugofem texter", "fem på varje nivå" eller "tre teman". */
export declare function fastaAntal(text: string, ord: string[], grupper?: string[]): string[];
