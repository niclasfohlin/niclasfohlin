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

/** En hänvisning till en av Niclas Fohlins böcker i en text: platsen, medförfattarnas efternamn, "m.fl.", året, om boken inte är utgiven ("utkommer") och titeln när den står i hänvisningen. */
export interface FohlinHanvisning { start: number; slut: number; text: string; medforfattare: string[]; mfl: boolean; ar: number; utkommer: boolean; titel?: string }
/** Hänvisningarna till Niclas Fohlins böcker i en text: i en parentes ("(Fohlin och Wilson, 2023)"), med året efter ("Fohlin och Wilson (2025)") och i en källförteckning ("Fohlin och Wilson, Skriv! (utkommer 2027)"). */
export declare function fohlinHanvisningar(text: string): FohlinHanvisning[];

/** Uppläggens taggar och gränser (sajtens K-463). */
export declare const INTENSIV: 'intensivtraning';
export declare const LEKTIONER: 'lektionsupplagg';
export declare const ATERKOMMANDE: 'aterkommande-pass';
export declare const INTENSIV_MINUTER: number;
export declare const INTENSIV_DAGAR: readonly [number, number];
export declare const LEKTION_MINST: number;
export declare const LEKTION_MINUTER: number;
export declare const ATERKOMMANDE_MINUTER: number;
export declare const ATERKOMMANDE_DAGAR: number;
/** Passets längd i minuter, det kortaste och det längsta, och det minsta antalet dagar i veckan, ur faktarutans tid. */
export declare function tidensMatt(tid: string): { minst?: number; minuter?: number; perVecka?: number };
/** Är tiden intensivträning: pass på högst 30 minuter, tre till fem dagar i veckan? */
export declare function arIntensiv(tid: string | undefined): boolean;
/** Måste tiden vara ett lektionsupplägg: pass på minst 40 minuter? */
export declare function arLektioner(tid: string | undefined): boolean;
/** Vilka upplägg tiden rymmer. Intensivträning utesluter de andra. */
export declare function mojligaUpplagg(tid: string | undefined): string[];

/** Gruppens storlek ur faktarutans grupp: minst och högst antal elever, och om gruppen kan vara en hel klass. */
export declare function gruppensElever(grupp: string | undefined): { min: number; max?: number; klass: boolean } | null;
/** Hur ofta, som ett spann av pass i veckan. */
export declare function tidensVeckotakt(tid: string | undefined): { min: number; max: number } | null;
/** Perioden i veckor, eller i pass för en lektion i en serie. */
export declare function periodensLangd(period: string | undefined): { min: number; max?: number; enhet: 'veckor' | 'pass'; mer: boolean; hogst: boolean; perKurs: boolean } | null;
/** Metodkortets fakta i fast form: grupp, pass, hur ofta och period; null för ett fält som inte går att läsa. */
export declare function faktaIFastForm(d: { grupp?: string; tid?: string; period?: string }): { grupp: string | null; pass: string | null; ofta: string | null; period: string | null };
/** Bildtextens gränser: högst 250 tecken och tre meningar (sajtens STIL.md under Bildtexter). */
export declare const BILDTEXT: { tecken: number; meningar: number };
/** Meningarna i en text, med citat och förkortningar som inte avslutar en mening. */
export declare function meningarI(text: string): number;
/** Felen i en bilds bildtext och textalternativ; tom lista när de följer regeln. */
export declare function bildtextFel(bild: { rubrik?: string; text: string; alt?: string }, o?: { blad?: boolean; visas?: boolean }): string[];
