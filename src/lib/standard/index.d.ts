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

/** Planera insatsen (sajtens K-489, plan.js): när en rad i uppföljningen görs, ur fältet tid. */
export type Tid = { typ: 'fore' } | { typ: 'efter'; veckor: number; till?: number } | { typ: 'lopande'; enhet: 'pass' | 'vecka' } | { typ: 'intervall'; var: number } | { typ: 'vecka'; veckor: number[] } | { typ: 'sista-veckan' } | { typ: 'pass'; pass: number[] } | { typ: 'sista-passet'; efter?: number } | { typ: 'villkor' };
/** En rad i progressionen: veckorna eller passen den gäller; till saknas när den gäller till slutet. */
export interface Steg { rad: number; fran: number; till?: number; vidBehov: boolean; efter?: true }
/** Vilka pass en rad i planens passen gäller: platsen i veckan, eller numret i insatsen. */
export type PassensNar = { typ: 'vecka'; plats: number | 'sista' | 'ovriga' } | { typ: 'pass'; fran: number; till?: number } | { typ: 'sista'; efter?: number } | { typ: 'nastSista'; efter?: number } | { typ: 'veckor'; fran: number; till: number };
/** När en variant av passet gäller: planens ord för passen, passets längd, eller en plats i vissa veckor. */
export type VariantensNar = PassensNar | { typ: 'minuter'; minuter: number } | { typ: 'vecka'; plats: number | 'sista' | 'ovriga'; veckor: { fran: number; till: number } } | { typ: 'sista'; veckor: { fran: number; till: number } };
/** Var ett pass står i planen, som en rad i planens passen och en variant läser det. */
export type PassetsLage = { nr?: number; sista?: boolean; nastSista?: boolean; vecka?: number; plats?: number; sistIVeckan?: boolean; minuter?: number };
/** Metodens plan: hur ofta, passets längd, perioden, progressionens steg och uppföljningens tider. */
export interface Metodplan { takt: { min: number; max: number }; minuter: { min: number; max: number }; period: { min: number; max?: number; enhet: 'veckor' | 'pass'; mer: boolean; hogst: boolean; perKurs: boolean }; stegEnhet: 'veckor' | 'pass'; steg: Steg[]; uppfoljning: { rad: number; tid: Tid }[]; passen: { rad: number; nar: PassensNar | VariantensNar }[]; skattningar: Skattning[]; forvaldaVeckor?: number; foreVeckor?: number }
/** Lärarens val: första passet, dagarna (1 för måndag), antalet veckor eller pass, nivån, minuterna, lovveckorna (2026-52), veckorna som tas om, flyttade och inställda pass. */
export interface Val { start: string; dagar: number[]; langd: number; niva?: string; borja?: number; minuter?: number; lov?: string[]; upprepa?: number[]; flytta?: Record<string, string>; stryk?: string[]; tider?: Record<string, [string, string]>; mal?: string; mitt?: number; slut?: number; fore?: { till: string; dagar: number[]; fasta?: Record<string, number> }[] }
export interface Pass { nr: number; datum: string; vecka: number; steg?: number | null; flyttatFran?: string }
export interface PlanVecka { nr: number; innehall: number; igen: boolean; mandag: string; vecka: { ar: number; vecka: number }; pass: number[]; bortfall: { datum: string; varfor: 'helgdag' | 'installt'; namn?: string }[]; steg?: number | null }
export interface Plan { start: string; enhet: 'veckor' | 'pass'; borja: number; forstaPass?: string; sistaPass?: string; sistaNr?: number; efter: string; pass: Pass[]; veckor: PlanVecka[]; lovveckor: string[]; uppfoljning: { rad: number; typ: Tid['typ']; tillfallen: { datum: string; vecka: number | null }[]; period?: true }[]; fore: { mandag: string; overLov: boolean }; efterSteg?: number; mitt?: number; slut?: number; planerade?: number; struket?: { pass: Pass[]; veckor: PlanVecka[] }; skattningar?: Skattning[] }
export declare const plusDagar: (s: string, n: number) => string;
export declare const veckodag: (s: string) => number;
export declare const mandagen: (s: string) => string;
export declare const arDatum: (s: unknown) => boolean;
export declare function isoVecka(s: string): { ar: number; vecka: number };
export declare const veckonyckel: (s: string) => string;
export declare function paskdagen(ar: number): string;
/** Dagarna då skolan är stängd i hela landet: helgdagarna och jul-, nyårs- och midsommarafton. */
export declare function rodaDagar(ar: number): Map<string, string>;
export declare function helgdag(s: string): string | undefined;
export declare function tolkaTid(text: unknown): Tid | null;
export declare function tolkaSteg(text: unknown): { fran: number; till?: number; vidBehov: boolean; efter?: true } | null;
export declare function tolkaPassen(text: unknown): PassensNar | null;
/** Veckorna som en tabellrad börjar med, "Vecka 3" eller "7–8 Gruppen väljer modell", som ett spann, eller null. */
export declare function radensVeckor(text: unknown): { fran: number; till: number } | null;
/** Veckorna i "vecka 3" och "vecka 1–2" som ett spann. */
export declare function veckorI(text: unknown): { fran: number; till: number } | null;
export declare function metodplan(d: { tid?: string; period?: string; progression?: { enhet?: string; rader: { vecka: string; taggar?: string[] }[] }; uppfoljning?: { rader: { nar: string; tid?: string }[] }; plan?: { passen?: { nar: string }[] } }): { fel: string[]; plan?: Metodplan };
export type MetodensTexter = { uppfoljning?: { rader: { nar: string; vad: string }[] }; progression?: { rader: { vecka: string; fokus?: string; roll?: string; led?: string }[] }; checklista?: { punkter: string[] }; plan?: { passen?: { nar: string; text?: string; ur?: { tabell: string; rad: string; kolumner?: string[] }; kort?: string; tabell?: string }[]; fore?: string[]; justera?: string[]; utvardering?: string[]; upprepa?: string; utan?: string[]; stege?: boolean; nivaval?: { text: string; mer: string }; langdval?: { text: string; mer: string }; veckoval?: { text: string; mer: string; forval?: number }; skattningar?: { namn: string; vem: string; rad: string; text?: string; ram?: string; skala?: { fran: number; till: number; tabell: string }; regler?: { om: string; rad: string }[]; minuter?: number }[] }; ramar?: { ramar?: { rubrik: string; oversikt?: { rader?: unknown[][] }; text?: string[]; delar?: { rubrik: string; falt?: { rubrik: string; text: string }[] }[] }[] }; tidsschema?: { text?: string; efter?: string; rader: { tid: string; fas: string; vad: string }[]; varianter?: Variant[] }; gruppen?: { text: string }; passrutin?: { efterPasset?: string }; principer?: { text: string }; hem?: { text: string[] }; tabeller?: { rubrik: string; kolumner: string[]; rader?: unknown[][] }[]; nivaer?: { namn: string }[]; tid?: string };
/** Tidsschemats text som planen visar den, utan meningarna i plan.utan. */
export declare const planensInledning: (text: string | undefined, utan?: string[]) => string;
/** Planens egna fält och texterna som bara planen läser, med var de står. */
export declare const planensTexter: (d: MetodensTexter) => [string, string][];
/** Alla texter ur metoden som planen visar. */
export declare const visadeTexter: (d: MetodensTexter) => string[];
/** Felen i metodens texter som planen visar: tider i löptext, delar, meningar om metodens sida och veckor i ord i en stege. */
export declare function planensRamFel(d: MetodensTexter & { tid?: string }): string[];
/** En rad i metodens tabell som en roll i planen hämtar sin text ur, eller null när den inte finns. */
export declare function rollensRad(d: MetodensTexter, ur: { tabell: string; rad: string; kolumner?: string[] }): { kolumn: string; text: string }[] | null;
/** Ordet i ur.rad som säger att rollen hämtar veckans rad. */
export declare const VECKANS_RAD: string;
/** Delen i en rad med del som är passets förberedelse. */
export declare const FORE_PASSET: string;
/** Veckans rad i en tabell med en rad per vecka och en kolumn per pass: cellerna för varje vecka, eller null. */
export declare function rollensVeckor(d: MetodensTexter, ur: { tabell: string; rad: string; kolumner?: string[] }): Record<string, { kolumn: string; text: string }[]> | null;
/** Planens egna texter citerar metoden ordagrant. */
export declare function planensCitatFel(d: MetodensTexter & Record<string, unknown>): string[];
/** Hur långt ett stöd för ett val i planen får vara, i tecken: nivåvalet och passets längd (STIL.md under Stöd för ett val). */
export declare const NIVAVALETS_LANGD: number;
/** Stödet för nivåvalet: en metod med nivåer har plan.nivaval, ett citat på högst tre meningar och NIVAVALETS_LANGD tecken. */
export declare function nivavaletsFel(d: MetodensTexter & { nivaer?: unknown[] }, harNivaer?: boolean): string[];
/** Passets längder att välja i planen och förvalet, ur faktarutans spann: ändarna när spannet är högst tio minuter, annars steg om tio minuter med steget i mitten som förval. */
export declare function passetsLangder(m: { min: number; max: number }): { langder: number[]; forval: number };
/** Stödet för passets längd: en metod vars faktaruta säger ett spann har plan.langdval, som nivaval. */
export declare function langdvaletsFel(d: MetodensTexter): string[];
/** Stödet för antalet veckor (plan.veckoval), med ett förval inom metodens period. */
export declare function veckovaletsFel(d: MetodensTexter & { period?: string }): string[];
export declare function planFel(d: Parameters<typeof metodplan>[0] & MetodensTexter): string[];
/** Metodens fil utan planens fält (`plan`, uppföljningens `tid`, progressionens `taggar` och `rubrik`), som bara planens sida läser. */
export declare function utanPlanensFalt<T extends Record<string, any>>(d: T): T;
export declare function forval(mp: Metodplan, idag: string): Val;
/** Planens längd som förval: så många veckor att gruppen når progressionens sista steg, när det ryms i perioden. */
export declare function forvaldLangd(mp: Metodplan, borja?: number): number;
/** Planens första måndag: startveckan, eller nästa vecka när ingen vald dag är kvar i den. */
export declare function forstaMandagen(val: Val): string;
/** Planera insatsens modul: namnet, versionen och om den är en beta (sajtens METODER.md under Planera insatsen). */
export declare const PLANERA: Readonly<{ namn: string; version: string; beta: boolean }>;
/** Metodens övergripande mål i en mening, som sidan och Word skriver det. */
export declare const malensMening: (mal: string) => string;
/** Elevens skattning i avstämningens vecka, eller ingen. */
export declare const skattningenMittI: (s: Sammanstallning, e: SammanstallningElev) => { nr: number; varde: number } | undefined;
/** Felen i ett lektionskorts mål: kortet säger metodens övergripande mål ordagrant. */
export declare function kortetsMalFel(d: { mal?: { overgripande?: string } }, texter: string[], plats: string): string[];
/** Ett filnamn för det som laddas ner ur planen: vad filen är, vem den gäller, metoden och datumet. */
export declare const filnamnet: (slag: 'sammanstallning' | 'plan' | 'kalender', o: { vem?: string; grupp?: boolean; metod: string; datum: string }) => string;
/** Knapparnas namn för att spara planen, ladda ner den och öppna en nedladdad plan. */
export declare const PLANKNAPPAR: Readonly<{ spara: string; laddaNer: string; oppna: string }>;
/** En regel på linjen i metodens skattning av gruppen (tolkaRegel). */
export type Regel = { typ: 'nedat'; veckor: number } | { typ: 'under'; grans: number; veckor: number } | { typ: 'minst'; grans: number; veckor: number };
/** Skalans steg med namn ur metodens tabell (skalansSteg). */
export type Skala = { fran: number; till: number; tabell: string; steg: { fran: number; till: number; namn: string; text?: string }[] };
/** En av metodens egna skattningar (metodensSkattningar, K-559). */
export type Skattning = { namn: string; vem: 'gruppen' | 'eleverna'; rad: number; skala?: Skala; regler: (Regel & { rad: number })[]; text?: string; ram?: string; minuter?: number };
export declare const SKATTNINGARNAS_VEM: readonly ['gruppen', 'eleverna'];
export declare function tolkaRegel(text: unknown): Regel | null;
export declare function regelnGaller(r: Regel, varden: number[]): boolean;
export declare function skalansSteg(d: MetodensTexter, skala: { fran: number; till: number; tabell: string }): Skala | null;
export declare const stegetsNamn: (skala: Skala, x: number) => string;
export declare const skattningensGranser: (s: { regler: Regel[] }) => number[];
export declare const formularetText: (blad: string) => string;
export declare const rensadLank: (x: unknown) => string | undefined;
export declare const stegetsSpann: (x: { fran: number; till: number }) => string;
export declare function metodensSkattningar(d: MetodensTexter): { skattningar: Skattning[]; fel: string[] };
export declare function linjen(plan: Plan, f: Foljd, s: Skattning): { varden: (number | undefined)[]; galler: number[][] };
/** Metodens skattning av gruppen i ord, lika på sidan, i pdf:en och i texten som kopieras (K-559). */
export declare function skattningensText(s: Sammanstallning, sk: Sammanstallning['skattningar'][number], info: { uppfoljning: { nar: string }[] }): { varden: string; regler: string[] };
export declare function planera(mp: Metodplan, val: Val): Plan;
/** Valen efter en förlängning med n veckor, genom planens egna veckor när insatsen avslutades tidigare. */
export declare function forlangdaVal(mp: Metodplan, val: Val, n: number): Val;
/** Veckans nummer i planen, räknat från veckan planen börjar på. */
export declare const planvecka: (plan: Plan, v: PlanVecka) => number;
/** Ordningen efter datum, och efter numret när två har samma datum. */
export declare const efterDatum: (a: { datum: string; nr?: number }, b: { datum: string; nr?: number }) => number;
/** En kopia i datumordning. */
export declare const iDatumordning: <T extends { datum: string; nr?: number }>(lista: T[]) => T[];
/** Veckans pass, i veckans ordning. */
export declare const veckansPass: (plan: { pass: Pass[] }, v: PlanVecka) => Pass[];
export declare const kalendervecka: (n: number) => string;
export declare const kalenderveckaUtskriven: (n: number) => string;
/** Insatsen som avslutades före planens slut, i en mening, eller tom. */
export declare function avslutetText(plan: Plan, pagar?: boolean): string;
/** Utvärderingen efter insatsen, med avslutet och lärarens anledning när insatsen avslutades tidigare. */
export declare function utvarderingenText(plan: Plan, u: { beslut?: string; not?: string } | null | undefined, pagar?: boolean): string;
export declare const kalenderveckor: (a: number, b: number, streck?: string) => string;
/** Kalenderveckorna för några datum, med veckor i följd ihop och ett lov som bryter följden: "v. 45 och v. 47". */
export declare function kalenderveckornaFor(datum: string[]): string;
export declare const gangen: (plan: { veckor: { nr: number; innehall: number }[] }, v: { nr: number; innehall: number; igen: boolean }) => number;
export declare const metodveckan: (innehall: number) => string;
/** Metodens veckor i en text ur metoden, skrivna som planens veckor när planen börjar högre upp i en stege. */
export declare function veckornaIPlanen(text: string, borja?: number): string;
export declare const planveckan: (innehall: number, gang?: number) => string;
export declare const planveckanKort: (innehall: number, gang?: number) => { tal: string; om: string };
export type Veckonamn = { plan: string; kort: string; kalender: string; text: string; Text: string };
export declare const veckansNamn: (v: { innehall: number; gang?: number; vecka: number }) => Veckonamn;
export declare const planveckansNamn: (plan: Plan, v: PlanVecka) => Veckonamn;
/** Raderna i planens passen som gäller passet, den mest bestämda först. */
export declare function passetsRoller(plan: Plan, p: Pass, passen: Metodplan['passen']): number[];
/** Raderna som passet visar: den mest bestämda raden om passets plats i insatsen, med raderna som har samma när, och raderna om veckorna. */
export declare function passetsVisadeRoller(plan: Plan, p: Pass, passen: Metodplan['passen']): number[];
/** Var ett pass står i planen: numret, sista och näst sista, metodens vecka, platsen i veckan och minuterna. */
export declare function passetsLage(plan: Plan, p: Pass, minuter?: number): PassetsLage;
/** Gäller en rad i planens passen eller en variant för passet? */
export declare function passetTraffas(nar: PassensNar | VariantensNar, lage: PassetsLage): boolean;
/** Hur bestämt ett när är, det mest bestämda med lägst tal. */
export declare const narensVikt: (t: PassensNar | VariantensNar) => number;
/** Hur många elever elevlistan rymmer: en hel klass. */
export declare const ELEVLISTANS_LANGD: number;
/** En rolls text i en del av passet (passetsBeskrivning): rollens citat och tabellens celler med kolumnens namn. */
export type DelensForsta = { etikett: string; text: string }[];
/** Ett pass som sidan och kalendern visar det: namnet, rollernas texter, delarna och förberedelsen, med tidsschemats variant för passet. En roll med del står i delen, först eller i stället för delens text. */
export declare function passetsBeskrivning<D extends { tid: string; fas: string; vad: string }>(roller: { text?: string; rad?: { kolumn: string; text: string }[]; veckor?: Record<string, { kolumn: string; text: string }[]>; kort?: string; utanTidsschema?: boolean; del?: string; istallet?: boolean; tabell?: { namn: string; adress: string; delar?: D[]; fore?: { namn: string; nar: string; vad: string; mer?: { etikett: string; text: string }[] }[] } }[], passet: { delar: D[]; fore?: string; varianter?: (Variant & { delar: D[] })[] } | undefined, lage?: PassetsLage): { namn: string; texter: { etikett: string; text: string }[]; delar: (D & { forst?: DelensForsta; istallet?: true })[]; egenOrdning: boolean; fore?: string; foreForst?: DelensForsta; utanDel: string[]; foreRader: { namn: string; nar: string; vad: string; mer?: { etikett: string; text: string }[] }[]; tabell?: { namn: string; adress: string; delar?: D[]; fore?: { namn: string; nar: string; vad: string; mer?: { etikett: string; text: string }[] }[] }; rubrik?: string; variantText?: string };
/** En del i ett pass med egen tabell: tiden, namnet när tabellen har ett, vad som händer och de andra kolumnerna med sina namn. */
export type TabellDel = { tid: string; fas: string; vad: string; mer: { etikett: string; text: string }[] };
/** Delarna i ett pass med egen tabell, och förberedelsen, eller null när tabellen inte är ett pass i delar. */
export declare function tabellensDelar(t: { kolumner: string[]; rader?: unknown[][] }): { delar: TabellDel[]; fore: { namn: string; nar: string; vad: string; mer: { etikett: string; text: string }[] }[] } | null;
/** En dels tid utan "min": "0–3". */
export declare const delensTid: (tid: string) => string;
/** Passets form vissa veckor, i vissa pass eller i ett kortare pass, en variant i metodens tidsschema. */
export type Variant = { nar: string; text?: string; delar: { fas: string; tid: string }[] };
/** När en variant gäller, ur variantens nar. */
export declare function variantensNar(text: unknown): VariantensNar | null;
/** En variant som metodens sida, Word, lathunden och lektionskortet skriver den. */
export declare const variantensMening: (v: Variant) => string;
/** Varianten som gäller passet, den mest bestämda, eller ingen. */
export declare const variantenFor: <V extends { nar: string }>(varianter: V[] | undefined, lage: PassetsLage | undefined) => V | undefined;
/** Felen i metodens tidsschema: varianterna och passets tider i tidsschemats text. */
/** Följer passets delar på varandra från minut 0, så att tiderna är platser i passet och kan skrivas som klockslag? */
export declare function delarIFoljd(delar: { tid: string }[]): boolean;
export declare function tidsschematsFel(d: { tid?: string; tidsschema?: { text?: string; efter?: string; rader: { tid: string; fas: string }[]; varianter?: Variant[] } }): string[];
/** Felen i lathundens och lektionskortens texter för en metod med varianter. */
export declare function varianternasFel(d: { tidsschema?: { varianter?: Variant[] } }, texter: string[], o: { lathund?: boolean; var: string }): string[];
/** Progressionens steg som planen inte når. */
export declare function stegUtanfor(mp: Metodplan, plan: Plan): { rad: number; fran: number; vidBehov: boolean }[];
export declare function veckanFor(plan: Plan, datum: string): PlanVecka | null;
export declare function nastaPass(plan: Plan, datum: string): Pass | null;
/** Nästa pass som inte är bockat, från och med datumet, och de bockade före det. */
export declare function nastaObockade(plan: Plan, datum: string, gjort: (p: Pass) => boolean): { pass: Pass | null; bockade: Pass[] };
export declare function kodaVal(val: Val, extra?: { id?: string; visa?: number | 'fore' }): string;
export declare function lasVal(hash: string): { val: Val; id?: string; visa?: number | 'fore' } | null;
/** Planens största längd i veckor eller pass, i länken och vid en förlängning. */
export declare const LANGSTA: number;
export declare const VECKODAGAR: string[];
/** Veckodagen kort, "mån" för 1. */
export declare const veckodagKort: (d: number) => string;
/** "Mån 2/11". */
export declare const dagKort: (s: string) => string;
/** "2 november till 11 december 2026", med båda åren när spannet går över nyår. */
export declare const datumspann: (fran: string, till: string) => string;
export declare const datumText: (s: string) => string;
export declare const dagOchManad: (s: string) => string;
export declare const dagText: (s: string) => string;
export declare function spannKort(fran: string, till: string): string;
export declare const uppraknat: (ord: string[]) => string;
/** Passens nummer i en text, "Pass 4–6" eller "Pass 4 och 6" när ett pass är struket däremellan. */
export declare const passnummerText: (nr: number[]) => string;
export declare function veckansDagar(plan: { pass: Pass[] }, v: PlanVecka): { fran: string; till: string };
export declare function dokumentationstext(info: { titel: string; undertitel?: string; adress: string; mal?: string; steg?: string[]; uppfoljning: { nar: string }[]; nivaNamn?: string }, plan: Plan, val: Val, o: { minuter: number; genomforda?: number; folj?: boolean; utvardering?: { beslut?: string; not?: string }; elever?: { namn: string }[]; pagar?: boolean }): string;
/** Passens längd i minuter efter dagarnas klockslag, och passets längd för en dag utan klockslag; olika längder var för sig, i storleksordning. */
export declare function passensMinuter(val: Val, standard: number, plan?: { pass: Pass[] }): number[];
/** "30", eller "30 eller 40". */
export declare const minuterText: (minuter: number[]) => string;
/** Ett mål som läraren har skrivit, rensat: en rad, högst 200 tecken. */
export declare const rentMal: (s: unknown) => string;
/** Målet som en mening med stor bokstav och punkt. */
export declare const malText: (mal?: string) => string;
/** En text där elevlistans namn och förnamn har blivit "en elev". */
export declare function utanNamn(text: string, elever: { namn: string }[], kvar?: { namn: string }[]): string;
export declare function kalenderfil(info: { titel: string; uppfoljning: { nar: string }[]; fokus: (string | null)[]; passet?: (p: Pass) => string }, plan: Plan, o: { id: string; lank: (vecka?: number | 'fore') => string; namn?: string; nu: Date; tider?: Val['tider'] }): string;
/** Passens tider, rensade: veckodag till början och slut, som "09:20" och "10:00". */
export declare function rentaTider(tider: unknown): Record<string, [string, string]>;
/** Passets tid efter veckodagen det låg på innan det flyttades. */
export declare const passetsTid: (val: Val, p: Pass) => [string, string] | undefined;
/** "9.20" ur "09:20". */
export declare const tidText: (s: string) => string;
/** "9.20–10.00". */
export declare const tidsspann: (par: [string, string]) => string;
/** Minuterna från midnatt: 560 ur "09:20". */
export declare const minuterAv: (s: string) => number;
/** Klockslaget ur minuterna från midnatt: "09:20" ur 560. */
export declare const klockslag: (t: number) => string;
/** Klockslaget m minuter efter, högst 23:59. */
export declare const plusMinuter: (s: string, m: number) => string;
/** Minuterna i ett spann i tidsschemat: "0–4 min" ger 0 och 4. */
export declare const minuterISpann: (tid: string) => { fran: number; till: number } | null;
/** Dagarna med sina tider, "måndag, onsdag och fredag kl. 9.20–10.00". */
export declare function dagarText(val: Val, plan?: { pass: Pass[] }): string;
/** Dagarna som gällde före ett byte av dagar mitt i insatsen, i datumordning. */
export declare function rentaFore(fore: unknown): { till: string; dagar: number[]; fasta?: Record<string, number> }[];
/** Om en veckodag är en passdag ett visst datum, med ett byte av dagar mitt i insatsen. */
export declare function passdagar(val: Val): (datum: string, dag: number) => boolean;
/** Nya dagar för planen; med ett datum gäller de från det datumet och dagarna före står kvar. */
export declare function bytDagar(val: Val, dagar: number[], fran?: string, plan?: { pass: Pass[] }): Val;

/** Det läraren för in när hen följer insatsen, allt valfritt: passen som blev av (passens dagar), skattningen vecka för vecka (veckans måndag, sedan elevens id eller grupp), elevlistan, resultaten i metodens uppföljning och besluten mitt i och efter. */
export interface Foljd { gjorda?: string[]; elever?: { id: string; namn: string; utkast?: true; fran?: string }[]; narvaro?: boolean; franvaro?: Record<string, string[]>; vecka?: Record<string, { varde?: number; not?: string }>; skattning?: Record<string, Record<string, number>>; resultat?: Record<string, Record<string, string>>; avstamning?: { beslut?: string; not?: string }; utvardering?: { beslut?: string; not?: string }; oppen?: string; borttagna?: string[]; listan?: string; lamnade?: { id: string; namn: string; utkast?: true; fran?: string }[]; matt?: Record<string, Record<string, number>>; lankar?: Record<string, { formular?: string; sammanstallning?: string }> }
export declare const passetsDag: (p: Pass) => string;
export declare const SKALAN: readonly string[];
export declare const skattningsfragan: (grupp?: boolean) => string;
export declare const GRUPPEN: 'grupp';
/** Det läraren har fört in, rensat till det sidan kan visa; det som inte går att läsa tas bort. */
export declare function rensaFoljd(f: unknown): Required<Pick<Foljd, 'gjorda' | 'elever' | 'franvaro' | 'vecka' | 'skattning' | 'resultat'>> & Pick<Foljd, 'narvaro' | 'avstamning' | 'utvardering'>;
export declare function mittVeckan(plan: Plan): number | null;
export interface SammanstallningVecka { nr: number; mandag: string; vecka: number; innehall: number; igen: boolean; pass: { nr: number; dag: string; datum: string; gjort: boolean }[]; gjorda: number; planerade: number; varit: number; installda: number; helgdagar: number; helgdagarKvar: number; skattning?: number; not?: string }
export interface SammanstallningElev { id: string; namn: string; fran?: string; passen?: number; skattningar: { nr: number; vecka: number; varde: number }[]; forsta: { nr: number; vecka: number; varde: number } | null; senaste: { nr: number; vecka: number; varde: number } | null; narvaro: number | null; resultat: Record<string, string> }
export interface Sammanstallning { veckor: SammanstallningVecka[]; elever: SammanstallningElev[]; grupp: boolean; narvaro: boolean; planerade: number; gjorda: number; veckomedel: number | null; varit: number; gjordaVarit: number; installda: number; helgdagar: number; helgdagarKvar?: number; slut: boolean; mitt: number | null; avstamning: { beslut?: string; not?: string } | null; utvardering: { beslut?: string; not?: string } | null; namnen: { namn: string }[]; skattningar: { namn: string; skala: Skala; regler: (Regel & { rad: number })[]; varden: (number | undefined)[]; galler: number[][] }[] }
/** Namnen som texterna som lämnar webbläsaren tvättar bort: eleverna i listan och de som har stått i den. */
export declare const elevernasNamn: (f: Foljd | undefined) => { namn: string }[];
export declare function sammanstallning(plan: Plan, f: Foljd, idag: string): Sammanstallning;
export declare const narvaronKort: (e: SammanstallningElev, s: { gjorda: number }) => string;
export declare const prickarnasText: (e: { fran?: string }) => string;
export declare const passensNarvaro: (s: Sammanstallning, e: { id: string; fran?: string }, franvaro: Record<string, string[]>) => ('med' | 'borta' | 'inte')[][];
export declare const elevenHarNagot: (s: { gjorda: number }, e: SammanstallningElev) => boolean;
export declare const riktning: (e: SammanstallningElev) => 'upp' | 'samma' | 'ned' | null;
/** Riktningen i ord, lika på sidan och i pdf:en: "2 till 3, framåt", "3, en skattning" eller "Inte skattad än". */
export declare const riktningText: (e: SammanstallningElev) => string;
export declare const BESLUT: Readonly<Record<'fortsatt' | 'justera' | 'avsluta' | 'forlang' | 'byt', string>>;
/** Uppföljningens tillfällen med datum, med nyckeln för elevernas resultat: radens nummer och tillfällets datum, "2-2026-12-14". */
export declare const uppfoljningensTillfallen: (plan: Plan) => { nyckel: string; rad: number; datum: string; vecka: number | null }[];
/** En elevs resultat i datumordning, också för ett tillfälle som inte står i planen längre. */
export declare function elevensResultat(plan: Plan, resultat: Record<string, string>): { nyckel: string; rad: number; typ: Tid['typ']; datum: string; varde: string }[];
export declare function sammanstallningstext(info: { titel: string; mal?: string; uppfoljning: { nar: string }[] }, plan: Plan, s: Sammanstallning): string;
export declare function elevtext(info: { mal?: string; uppfoljning: { nar: string }[] }, plan: Plan, s: Sammanstallning, id: string): string;
/** Uppföljningens rad: namnet och kalenderveckorna, "Efter insatsen, v. 51". */
export declare function uppfoljningensRad(plan: Plan, info: { uppfoljning: { nar: string }[] }, u: Plan['uppfoljning'][number]): string;
/** Uppföljningens rad med sitt namn: Efter insatsen, eller radens namn i metoden. */
export declare const uppfoljningensNamn: (plan: Plan, info: { uppfoljning: { nar: string }[] }, rad: number) => string;
/** Uppföljningens rader med datum. */
export declare const uppfoljningensRader: (plan: Plan, info: { uppfoljning: { nar: string }[] }) => string[];
/** Veckorna där läraren har skattat hur veckan gick. */
export declare const skattadeVeckor: <T extends { skattning?: number }>(s: { veckor: T[] }) => T[];
/** Vad skattningen är, i en text. */
export declare const skattningenText: (vem: string, varjeVecka?: boolean) => string;
/** Besluten att välja mellan, mitt i insatsen och efter den. */
export declare const BESLUTEN: Readonly<{ avstamning: readonly ('fortsatt' | 'justera')[]; utvardering: readonly ('avsluta' | 'forlang' | 'byt')[] }>;
/** Utvärderingens beslut som avslutar insatsen. */
export declare const AVSLUTANDE: readonly string[];
/** Dagarna efter sista passet då en insats avslutas av sig själv. */
export declare const AVSLUTAS_EFTER: number;
/** Är insatsens pass slut: sista passets dag har varit. */
export declare const insatsenSlut: (sistaPass: string | undefined, idag: string) => boolean;
/** Passet med ett nummer; numren kan ha en lucka i en plan som avslutas tidigare. */
export declare const passetMedNr: (plan: { pass: Pass[] }, nr: number) => Pass | undefined;
/** Det högsta passnumret, till "pass 6 av 8". */
export declare const hogstaPassnr: (plan: { pass: Pass[] }) => number;
/** Planens sista dag: sista passet, eller uppföljningen efter insatsen när den kommer senare. */
export declare const planensSistaDag: (plan: Plan) => string | undefined;
/** Är insatsen avslutad: beslutet avslutar den från sista passets dag, eller två veckor har gått sedan planens sista dag och läraren har inte öppnat den igen för sista passet. */
export declare const insatsenAvslutad: (sistaPass: string | undefined, beslut: string | undefined, idag: string, oppen?: string, sistaDag?: string) => boolean;
/** Beslutet och lärarens mening, med punkt. */
export declare const beslutText: (b: { beslut?: string; not?: string }) => string;
/** Passens rad: läget, de som har varit utan bock, och de inställda och helgdagarna. */
export declare function passensRad(s: { planerade: number; gjorda: number; varit: number; gjordaVarit: number; slut: boolean; installda: number; helgdagar: number; helgdagarKvar?: number }): string;
/** Passen som läraren har bockat, i en mening. */
export declare function passensLage(s: { planerade: number; gjorda: number; varit: number; gjordaVarit: number; slut: boolean }): string;
/** Elevens närvaro i en mening. */
export declare const narvaronText: (e: { narvaro: number | null }, s: { gjorda: number }) => string;
/** Ett resultat i metodens uppföljning: "Före insatsen, v. 45: 4 av 8". */
export declare const resultatText: (plan: Plan, info: { uppfoljning: { nar: string }[] }, t: { rad: number; datum: string; varde: string }) => string;
/** En elevs skattningar vecka för vecka, till diagrammen. */
export declare const elevensVarden: (s: { veckor: { nr: number }[] }, e: { skattningar: { nr: number; varde: number }[] }) => (number | undefined)[];
/** Stapelns vänsterkant i veckans fack. */
export declare const stapelnsKant: (x0: number, i: number, steg: number, b: number) => number;
/** Veckans pass som prickar under stapeln: mitten för varje pass, och hur det gick. */
export declare const prickarna: <T>(bx: number, b: number, pass: T[]) => { x: number; slag: T }[];

/** Metodens saker i en text (sajtens K-493): en sak är något som metoden har ett namn på och sajten en egen adress för. */
export interface Sak { namn: string; former?: string[]; versal?: boolean }
/** Är namnet ett ord för en sak (ett ord på blad, kort, mall, lathund … eller ett långt sammansatt ord), som också hittas med liten bokstav? */
export declare function arSaksord(namn: string): boolean;
/** Formerna av en saks namn i bestämd form: samtalskortet, samtalskortets, samtalskorten. */
export declare function sakensFormer(namn: string): string[];
/** Texten i delar, där en del med sak är ett namn på en av sakerna. */
export declare function sakdelar(text: string, saker: Sak[]): { text: string; sak?: number }[];
/** Namn som ser ut som en sak (ett sammansatt ord på blad, kort, mall …) men inte är någon av sakerna. */
export declare function olankadeSaker(text: string, saker: Sak[]): string[];
export declare const EGNA_SAKER: readonly string[];
/** Spannen av saker med nummer i en text, som "Bildserie 2–6". */
export declare function sakspann(text: string): { index: number; langd: number; text: string; namn: string[]; fran: number; till: number; nummer: number[] }[];

/** Små textverktyg och talen (sajtens K-509, text.js), en rot för varje. */
export declare const stor: (s: string) => string;
export declare const liten: (s: string) => string;
export declare const mening: (s: string) => string;
export declare const utanPunkt: (s: string) => string;
export declare const decimal: (n: number | null) => string;
export declare const tvasiffrigt: (n: number) => string;
export declare const esc: (s: string) => string;
export declare const skyddaRegex: (s: string) => string;
export declare const rentText: (x: unknown, max: number) => string;
/** En text som är längre än gränsen, kapad vid ett ord och med tre punkter sist. */
export declare const kapaVidOrd: (t: string, max: number) => string;
export declare const forstaLedet: (s: string) => string;
/** Alla texter i ett värde, också i listor och objekt. */
export declare const allaTexter: (x: unknown) => string[];
/** Det första ordet: en elevs förnamn eller rubrikens första ord. */
export declare const forstaOrdet: (s: unknown) => string;
/** Om ett namn på en elevs rad är samma elev: samma förnamn. */
export declare const sammaElev: (forut: string, nu: string) => boolean;
/** Meningarna i en text. */
export declare function meningarna(text: unknown): string[];
/** Om en mening slutar med punkt, utropstecken, frågetecken eller tre punkter. */
export declare const slutarMedPunkt: (m: string) => boolean;
/** Ett namn kort, med bara första ledet, när inget annat namn i listan har samma första led. */
export declare const kortnamn: (namn: string, alla: string[]) => string;
export declare const ORDNINGSTAL: readonly string[];
/** Ett tal i ord upp till tolv, som i löptext, och annars med siffror. */
export declare const talText: (n: number, en?: boolean) => string;
/** "båda" för två och "alla tre" för fler. */
export declare const allaAntal: (n: number) => string;
/** Ett tal ur siffror eller ord, också sammansatta; NaN när texten inte är ett tal. */
export declare function talAv(s: string): number;
/** Talen från fran till till som led i ett reguljärt uttryck. */
export declare const talIRegex: (fran: number, till: number, siffror?: boolean) => string;
