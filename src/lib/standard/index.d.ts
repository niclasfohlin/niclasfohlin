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
export declare function tidensVeckotakt(tid: string | undefined): { min: number; max: number; minst?: true } | null;
/** Perioden i veckor, eller i pass för en lektion i en serie. */
export declare function periodensLangd(period: string | undefined): { min: number; max?: number; enhet: 'veckor' | 'pass'; mer: boolean; hogst: boolean; perKurs: boolean } | null;
/** Metodkortets fakta i fast form: grupp, pass, hur ofta och period; null för ett fält som inte går att läsa. */
export declare function faktaIFastForm(d: { grupp?: string; tid?: string; period?: string }, ord?: { passen?: string }): { grupp: string | null; pass: string | null; ofta: string | null; period: string | null };
/** Bildtextens gränser: högst 250 tecken och tre meningar (sajtens STIL.md under Bildtexter). */
export declare const BILDTEXT: { tecken: number; meningar: number };
/** Meningarna i en text, med citat och förkortningar som inte avslutar en mening. */
export declare function meningarI(text: string): number;
/** Felen i en bilds bildtext och textalternativ; tom lista när de följer regeln. */
export declare function bildtextFel(bild: { rubrik?: string; text: string; alt?: string }, o?: { blad?: boolean; visas?: boolean }): string[];

/** Planera insatsen (sajtens K-489, plan.js): när en rad i uppföljningen görs, ur fältet tid. */
export type Tid = { typ: 'fore' } | { typ: 'extra' } | { typ: 'efter'; veckor: number; till?: number } | { typ: 'lopande'; enhet: 'pass' | 'vecka' } | { typ: 'intervall'; var: number } | { typ: 'vecka'; veckor: number[]; plats?: 'forsta' | 'sista' } | { typ: 'sista-veckan'; plats?: 'forsta' | 'sista' } | { typ: 'pass'; pass: number[]; kurs?: true } | { typ: 'sista-passet'; efter?: number } | { typ: 'villkor' };
/** En rad i progressionen: veckorna eller passen den gäller; till saknas när den gäller till slutet. */
export interface Steg { rad: number; fran: number; till?: number; vidBehov: boolean; efter?: true }
/** Vilka pass en rad i planens passen gäller: platsen i veckan, eller numret i insatsen. */
export type PassensNar = { typ: 'vecka'; plats: number | 'sista' | 'ovriga' } | { typ: 'pass'; fran: number; till?: number } | { typ: 'sista'; efter?: number } | { typ: 'nastSista'; efter?: number } | { typ: 'veckor'; fran: number; till: number };
/** När en variant av passet gäller: planens ord för passen, passets längd, eller en plats i vissa veckor. */
export type VariantensNar = PassensNar | { typ: 'minuter'; minuter: number } | { typ: 'vecka'; plats: number | 'sista' | 'ovriga'; veckor: { fran: number; till: number } } | { typ: 'sista'; veckor: { fran: number; till: number } };
/** Var ett pass står i planen, som en rad i planens passen och en variant läser det. */
export type PassetsLage = { nr?: number; sista?: boolean; nastSista?: boolean; vecka?: number; plats?: number; sistIVeckan?: boolean; minuter?: number };
/** Metodens plan: hur ofta, passets längd, perioden, progressionens steg och uppföljningens tider. */
export interface Metodplan { takt: { min: number; max: number }; minuter: { min: number; max: number }; period: { min: number; max?: number; enhet: 'veckor' | 'pass'; mer: boolean; hogst: boolean; perKurs: boolean }; stegEnhet: 'veckor' | 'pass' | 'nar'; steg: Steg[]; uppfoljning: { rad: number; tid: Tid; perElev?: true }[]; passen: { rad: number; nar: PassensNar | VariantensNar }[]; skattningar: Skattning[]; forvaldaVeckor?: number; foreVeckor?: number; sistaRaden?: true; extraPass?: true }
/** Lärarens val: första passet, dagarna (1 för måndag), antalet veckor eller pass, nivån, minuterna, lovveckorna (2026-52), veckorna som tas om, flyttade och inställda pass. */
export interface Val { start: string; dagar: number[]; langd: number; lektioner?: number[]; niva?: string; version?: string; borja?: number; minuter?: number; lov?: string[]; upprepa?: number[]; flytta?: Record<string, string>; stryk?: string[]; uppehall?: string[]; tider?: Record<string, [string, string]>; passtider?: Record<string, [string, string] | [string, string, number]>; mal?: string; mitt?: number; slut?: number; fore?: { till: string; dagar: number[]; fasta?: Record<string, number> }[] }
export interface Pass { nr: number; datum: string; vecka: number; steg?: number | null; flyttatFran?: string }
export interface PlanVecka { nr: number; innehall: number; igen: boolean; mandag: string; vecka: { ar: number; vecka: number }; pass: number[]; bortfall: { datum: string; varfor: 'helgdag' | 'installt' | 'uppehall'; namn?: string }[]; steg?: number | null }
export interface Plan { start: string; enhet: 'veckor' | 'pass'; borja: number; forstaPass?: string; sistaPass?: string; sistaNr?: number; efter: string; pass: Pass[]; veckor: PlanVecka[]; lovveckor: string[]; uppfoljning: { rad: number; typ: Tid['typ']; tillfallen: { datum: string; vecka: number | null }[]; period?: true; plats?: 'forsta' | 'sista' }[]; fore: { mandag: string; overLov: boolean }; efterSteg?: number; mitt?: number; slut?: number; planerade?: number; struket?: { pass: Pass[]; veckor: PlanVecka[] }; uppehall?: string[]; skattningar?: Skattning[]; extraDag?: string }
/** Dagen ur ett datum i en metods fil, ÅÅÅÅ-MM-DD. */
export declare const dagAv: (d: unknown) => string;
/** Metodens veckor i en text som planens veckor med kalenderveckan. */
export declare function veckornaMedDatum(text: string, plan: Plan): string;
/** Ritas linjen: den har två kryss. */
export declare const linjenRitas: (l: { varden: (number | undefined)[] }) => boolean;
/** Ett tal med lika många decimaler som de andra i en kolumn. */
export declare const medDecimaler: (n: number, decimaler?: number) => string;
/** Läsvägen före första lektionen: delarna med ankarna och tiden i minuter. */
export declare function lasvagen(d: Record<string, any>): { delar: { namn: string; ankare: string }[]; minuter: number };
/** Följderna i en lista: det som följer på det före står i samma följd. */
export declare const foljderna: <T>(lista: T[], foljer: (fore: T, x: T) => boolean) => T[][];
/** Skolveckan, måndag till fredag, och veckans söndag. */
export declare const skolveckan: (mandag: string) => { fran: string; till: string; sondag: string };
/** Om skolveckan har varit: fredagen är förbi. */
export declare const skolveckanHarVarit: (mandag: string, idag: string) => boolean;
/** Första veckan efter en vecka som inte är lov. */
export declare const forstaSkolveckanEfter: (mandag: string, lov: Set<string>) => string;
/** Måndagarna från en måndag till och med en annan. */
export declare const mandagarna: (fran: string, till: string) => string[];
/** Är veckan i sommarlovet. */
export declare const iSommarlovet: (datum: string) => boolean;
export declare const iJulen: (datum: string) => boolean;
export declare const julveckorna: (dagar: string[], idag: string) => string[];
export declare const julensText: (veckor: string[], vad: string, plats: string) => string;
/** Veckorna som går att trycka som lov. */
export declare function lovveckornaAttValja(plan: Plan, val: Val, fran: string): string[];
/** Samlingens led i statistikens namn. */
export declare const SAMLINGARNAS_LED: Readonly<{ stodundervisning: string; metoder: string }>;
/** Skolveckan i ord: "v. 47, 16–20 nov". */
export declare const skolveckansText: (mandag: string) => string;
/** Hur lång en period är i ord: dagarna upp till fem, sedan omkring så många veckor. */
export declare const periodensText: (dagar: number) => string;
/** Dagarna från ett datum till ett annat, negativt när det andra är före. */
export declare const dagarMellan: (fran: string, till: string) => number;
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
export declare function metodplan(d: { tid?: string; period?: string; progression?: { enhet?: string; rader: { vecka: string; taggar?: string[] }[] }; uppfoljning?: { rader: { nar: string; id?: string; tid?: string }[] }; plan?: { passen?: { nar: string }[]; skattningar?: NonNullable<NonNullable<MetodensTexter['plan']>['skattningar']> } }): { fel: string[]; plan?: Metodplan };
export type MetodensTexter = { uppfoljning?: { rader: { nar: string; vad: string; id?: string }[] }; progression?: { rader: { vecka: string; fokus?: string; roll?: string; led?: string; eleverna?: string; vidare?: string }[] }; checklista?: { punkter: string[] }; plan?: { passen?: { nar: string; text?: string; ur?: { tabell: string; rad: string; kolumner?: string[] }; kort?: string; tabell?: string }[]; fore?: string[]; justera?: string[]; utvardering?: string[]; upprepa?: string; utan?: string[]; stege?: boolean; veckansPass?: string; nivaval?: { text: string; mer: string }; langdval?: { text: string; mer: string }; veckoval?: { text: string; mer: string; forval?: number }; lektionsval?: { text: string; mer: string; ingangar?: { lektion: number; namn: string }[] }; skattningar?: { namn: string; vem: string; rad: string; text?: string; ram?: string; skala?: { fran: number; till: number; tabell?: string }; regler?: { om: string; rad: string }[]; minuter?: number }[] }; ramar?: { ramar?: { rubrik: string; oversikt?: { rader?: unknown[][] }; text?: string[]; delar?: { rubrik: string; falt?: { rubrik: string; text: string }[] }[] }[] }; tidsschema?: { text?: string; efter?: string; rader: { tid: string; fas: string; vad: string }[]; varianter?: Variant[] }; gruppen?: { text: string }; passrutin?: { efterPasset?: string }; principer?: { text: string }; hem?: { text: string[] }; tabeller?: { rubrik: string; kolumner: string[]; rader?: unknown[][] }[]; nivaer?: { namn: string }[]; tid?: string };
/** Tidsschemats text som planen visar den, utan meningarna i plan.utan. */
export declare const planensInledning: (text: string | undefined, utan?: string[]) => string;
/** Planens egna fält och texterna som bara planen läser, med var de står. */
export declare const planensTexter: (d: MetodensTexter) => [string, string][];
/** Alla texter ur metoden som planen visar. */
export declare const visadeTexter: (d: MetodensTexter) => string[];
export declare function veckansPassRam<R extends { rubrik: string }>(d: { ramar?: { ramar?: R[] }; plan?: { veckansPass?: string } }): R | undefined;
export declare const veckansPassFalt: (d: MetodensTexter) => { del: string; f: { rubrik: string; text: string } }[];
/** Felen i metodens texter som planen visar: tider i löptext, delar, meningar om metodens sida och veckor i ord i en stege. */
export declare function planensRamFel(d: MetodensTexter & { tid?: string }): string[];
/** En rad i metodens tabell som en roll i planen hämtar sin text ur, eller null när den inte finns. */
export declare function rollensRad(d: MetodensTexter, ur: { tabell: string; rad: string; kolumner?: string[] }): { kolumn: string; text: string }[] | null;
/** Ordet i ur.rad som säger att rollen hämtar veckans rad. */
export declare const VECKANS_RAD: string;
/** Delen i en rad med del som är passets förberedelse. */
export declare const arDelensTid: (tid: unknown) => boolean;
export declare const FORE_PASSET: string;
export declare const EFTER_PASSET: string;
export declare function versionsvaletsFel(d: unknown): string[];
export declare function iVersionen(text: string | undefined, namn: string | undefined, alla: string[]): string;
export declare function versionensVecka(led: string, namn: string | undefined, alla: string[]): string | null;
export declare function faltetIVersionen(rubrik: string, namn: string | undefined): { rubrik: string; egen: boolean } | null;
export declare function iVersionensKolumner<T extends { kolumn: string; text: string }>(celler: T[], namn: string | undefined, alla: string[]): T[];
export declare const passetsDelnamn: (d: { tidsschema?: unknown; tabeller?: unknown; plan?: unknown }) => string[];
/** Veckans rad i en tabell med en rad per vecka och en kolumn per pass: cellerna för varje vecka, eller null. */
export declare function rollensVeckor(d: MetodensTexter, ur: { tabell: string; rad: string; kolumner?: string[] }): Record<string, { kolumn: string; text: string }[]> | null;
/** Planens egna texter citerar metoden ordagrant. */
export declare function planensCitatFel(d: MetodensTexter & Record<string, unknown>): string[];
/** Hur långt ett stöd för ett val i planen får vara, i tecken: nivåvalet och passets längd (STIL.md under Stöd för ett val). */
export declare const NIVAVALETS_LANGD: number;
/** Stödet för nivåvalet: en metod med nivåer har plan.nivaval, ett citat på högst tre meningar och NIVAVALETS_LANGD tecken. */
export declare function nivavaletsFel(d: MetodensTexter & { nivaer?: unknown[] }, harNivaer?: boolean): string[];
export declare const LEKTIONENS_GRANS: number;
export declare const vidareTillLektion: (vidare: string, sista?: boolean) => string;
export declare function lektionsvaletsFel(d: { plan?: { lektionsval?: { text?: string; ingangar?: { lektion: number; namn: string }[] } }; vidare?: string }): string[];
export declare function lektionensForslag(varden: number[], veckor?: { min: number; max: number }, gangen?: number): { forslag: 'nasta' | 'upprepa' | null; snitt: number | null; forKort: boolean };
export declare function rentaLektioner(lektioner: unknown): number[];
/** Passets längder att välja i planen och förvalet, ur faktarutans spann: ändarna när spannet är högst tio minuter, annars steg om tio minuter med steget i mitten som förval. */
export declare function passetsLangder(m: { min: number; max: number }): { langder: number[]; forval: number };
/** Stödet för passets längd: en metod vars faktaruta säger ett spann har plan.langdval, som nivaval. */
export declare function langdvaletsFel(d: MetodensTexter): string[];
/** Stödet för antalet veckor (plan.veckoval), med ett förval inom metodens period. */
export declare function veckovaletsFel(d: MetodensTexter & { period?: string }): string[];
/** Metodens regel för beslutet efter insatsen, som varje metod som kan planeras har i plan.utvardering. */
export declare const utvarderingensFel: (d: { plan?: { utvardering?: string[] } }) => string[];
/** Uppföljningens resultat med ett tal direkt före "av", som "uppgift 9 av 4", som läses som ett resultat. */
export declare const resultatetsFel: (d: { uppfoljning?: { rader?: { nar?: string; resultat?: string }[] } }) => string[];
export declare const ELEVERNAS_KOLUMN: string;
export declare const ELEVERNAS_LANGD: number;
export declare const vidareMening: (vidare: string) => string;
export declare const elevernasCell: (r: { eleverna?: string; vidare?: string }) => string;
/** Början på regeln för att gå vidare, "Gå vidare när". */
export declare const VIDARE_BORJAN: string;
/** Om metodens regel för att ta veckan igen hänvisar till radernas regel för att gå vidare. */
export declare const hanvisarTillVidare: (upprepa: string) => boolean;
/** Om regeln för att gå vidare i progressionens rad prövas i veckan: radens sista vecka i planen, eller veckan med radens sista pass. */
export declare function vidareProvasI(mp: Metodplan, plan: Plan, v: { innehall: number; pass: number[]; steg?: number | null }, rad: number): boolean;
/** Metodens regel för att ta veckan igen som planen visar i en vecka, hel eller bara meningarna om hur, eller null. */
export declare function upprepaIVeckan(upprepa: string | undefined, medRegler: boolean, provas: boolean): { text: string; hela: boolean } | null;
export declare const harElevernasKolumn: (d: { progression?: { rader: { eleverna?: string; vidare?: string }[] } }) => boolean;
export declare function elevernasFel(d: { plan?: unknown; progression?: { rader: { vecka: string; eleverna?: string; vidare?: string }[] } }): string[];
/** Spärren för lärarens roll i en metod som kan planeras: ingen mening i `roll` börjar med "Läraren", eftersom planen visar den under Det du gör. */
export declare function rollensFel(d: { plan?: unknown; progression?: { rader: { vecka: string; roll?: string }[] } }): string[];
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
export declare const filnamnet: (slag: 'sammanstallning' | 'plan' | 'kalender' | 'planer', o: { vem?: string; grupp?: boolean; metod?: string; datum: string; samling?: 'stodundervisning' | 'metoder' | 'alla' }) => string;
/** Knapparnas namn för att spara planen, ladda ner den och öppna en nedladdad plan. */
export declare const PLANKNAPPAR: Readonly<{ spara: string; laddaNer: string; oppna: string }>;
/** Raden under knapparna som öppnar planer. */
export declare const PLANFILERNAS_SLAG: string;
/** En regel på linjen i metodens skattning av gruppen (tolkaRegel). */
export type Regel = { typ: 'nedat'; veckor: number } | { typ: 'under'; grans: number; veckor: number } | { typ: 'underIRad'; grans: number; veckor: number } | { typ: 'minst'; grans: number; veckor: number };
/** Skalans steg med namn ur metodens tabell (skalansSteg). */
export type Skala = { fran: number; till: number; tabell?: string; steg: { fran: number; till: number; namn: string; text?: string }[] };
/** En av metodens egna skattningar (metodensSkattningar, K-559). */
export type Skattning = { namn: string; vem: 'gruppen' | 'eleverna' | 'lararen'; rad: number; skala?: Skala; regler: (Regel & { rad: number })[]; text?: string; ram?: string; minuter?: number };
export declare const SKATTNINGARNAS_VEM: readonly ['gruppen', 'eleverna', 'lararen'];
export declare function tolkaRegel(text: unknown): Regel | null;
export declare function regelnGaller(r: Regel, varden: number[]): boolean;
export declare function skalansSteg(d: MetodensTexter, skala: { fran: number; till: number; tabell: string }): Skala | null;
export declare const stegetsNamn: (skala: Skala, x: number) => string;
/** Är värdet ett heltal på skalan, från och med fran till och med till. */
export declare const iSkalan: (x: unknown, skala: { fran: number; till: number }) => x is number;
export declare const skattningensGranser: (s: { regler: Regel[] }) => number[];
export declare const formularetText: (blad: string) => string;
export declare const rensadLank: (x: unknown) => string | undefined;
export declare const stegetsSpann: (x: { fran: number; till: number }) => string;
export declare function metodensSkattningar(d: MetodensTexter): { skattningar: Skattning[]; fel: string[] };
export declare function linjen(plan: Plan | { veckor: { mandag: string }[] }, f: Foljd, s: Skattning): { varden: (number | undefined)[]; galler: number[][] };
// Lär dig metoden (sajtens K-628): lärarens väg genom en undervisningsmetod, med stegen, veckorna efter stegen, klasserna och linjerna.
export type Klass = { id: string; namn: string; borta?: true };
export type LarDigVecka = { nr: number; mandag: string; vecka: number; innehall: number; gang: number; steg: number | null; efter: boolean; namn: Veckonamn };
export declare const EFTER_STEGEN_VAR: number;
export declare const KLASSLISTANS_LANGD: number;
export declare const KLASSENS_NAMN: number;
export declare const KOMMENTARENS_LANGD: number;
export declare const KLASSNOTENS_LANGD: number;
export declare function forlangSteget(val: Val, innehall: number, n?: number): Val;
/** Dagarna med något infört, i båda samlingarna. */
export declare function infordaDatum(f: Foljd, plan: { mitt?: number; veckor: { mandag: string }[] }): string[];
/** Det senast införda datumet. */
export declare const sistaInfort: (f: Foljd, plan: { mitt?: number; veckor: { mandag: string }[] }) => string | undefined;
/** Veckan i planen kort, till remsan. */
export declare const planveckansKort: (plan: Plan, v: PlanVecka) => { tal: string; om: string };
/** Har klassen något infört: en rad, en skattning eller ett svar Mitt i. */
export declare const klassenHarNagot: (f: Foljd, id: string) => boolean;
export declare const harInfortEfter: (f: Foljd, mandag: string, plan: { mitt?: number; veckor: { mandag: string }[] }) => boolean;
/** Vad svaret på Gick det? gjorde med planen, i en mening. */
export declare function gickDetsFoljd(plan: Plan, mandag: string, svar: 'ja' | 'inte' | undefined, rubriker: string[]): string;
/** Är lovet i veckan låst: något är infört i veckan eller senare. */
export declare const lovetLast: (mandag: string, sista: string | undefined) => boolean;
/** Lovveckorna i en mening, "Lov v. 48–49."; tom utan lov. */
export declare const lovetsText: (lov: string[]) => string;
export declare function efterStegen(plan: Plan, val: Val, f: Foljd, idag: string): string[];
export declare function larDigetsVeckor(plan: Plan, val: Val, f: Foljd, idag: string): LarDigVecka[];
export declare const larDigetsFas: (plan: Plan, idag: string) => 'fore' | 'under' | 'efter';
export declare const forstaLektionensMening: (namn: string, forsta: string, idag: string, mandag?: string) => string;
export declare const forensMening: (fran: string, forsta: string, idag: string) => string;
/** Var läraren är i Lär dig metoden, en regel för sidan, listan och pdf:en. */
export declare function larDigetsLaget(p: { forsta: string | null; mandagar: string[]; efter: string; avslutad?: boolean }, idag: string): { fas: 'fore' | 'under' | 'efter'; vecka: number | null; lage: 'kommande' | 'pagaende' | 'avslutad' };
export declare const larDigetsLagetFor: (plan: Plan, idag: string, avslutad?: boolean) => ReturnType<typeof larDigetsLaget>;
/** Hur ofta läraren skattar efter stegen, i ord. */
export declare const efterStegensTakt: () => string;
/** Stegen i Lär dig metoden: antalet, ett stegs nummer och om veckan har det sista steget. */
export declare const larDigetsSteg: (plan: { veckor: { nr?: number; steg?: number | null }[] }) => { antal: number; rad: (v: { nr?: number; steg?: number | null }) => number | null; nummer: (v: { nr?: number; steg?: number | null }) => number; sista: (v: { nr?: number; steg?: number | null }) => boolean };
/** Veckan Mitt i att låsa när den har börjat. */
export declare const larDigetsMittLast: (plan: Plan, idag: string) => number | undefined;
export declare const forstaLektionen: (plan: Plan) => string | null;
/** Dagen för första lektionen ur dagen läraren valde och måndagen i planens första vecka. */
export declare const forstaLektionensDag: (start: string, mandag: string) => string;
export declare const FORE_VECKOR: number;
export declare const larDigetsForval: (mp: Metodplan, idag: string) => Val;
export declare function larDigetsNu(plan: Plan, veckor: LarDigVecka[], idag: string): number | null;
/** Det som inte kom med när läraren skrev klasserna, i en mening. */
export declare function klasslistansBesked(text: string): string;
/** Dagen planen börjar på i Lär dig metoden, efter metodens slag. */
export declare const planensStart: (d: Record<string, any>) => string;
/** Den första hela lektionen när den kommer efter vecka 1, med metodens mening och veckan. */
export declare function forstaHelaLektionen(d: Record<string, any>): { namn: string; text: string; vecka: number } | null;
/** Namnet på rutan med planens rad om första lektionen, efter metodens slag. */
export declare const forstaVeckansNamn: (d: Record<string, any>) => string;
/** Är två namn på en klass nästan lika, som en rättning. */
export declare function namnenNastanLika(a: string, b: string): boolean;
/** Namnlistan, en rot för elevlistan och klasslistan: listan med id ur det läraren skriver, med de lämnade, frågorna och det som inte kom med. */
export declare function namnlistan<T extends { id: string; namn: string; utkast?: true }>(text: string, fore: T[], o: { nyttId: () => string; langd: number; namnetsLangd: number; nu?: T[]; lamnade?: T[] }): { lista: { id: string; namn: string }[]; nya: string[]; fragor: { ny: { id: string; namn: string }; kandidater: T[] }[]; borta: T[]; lamnade: T[]; dubbletter: string[]; utanfor: string[]; kortade: string[]; enBokstav: string[]; tomma: number };
/** Valen med dagen läraren väljer som första lektionen. */
export declare function larDigetsStart(val: Val, start: string): Val;
export declare function klasserUrText(text: string, fore: Klass[], nyttId: () => string, behall?: (id: string) => boolean): Klass[];
export type LarDigSammanstallningsvecka = LarDigVecka & { namn: Veckonamn; gick?: 'ja' | 'inte'; kommentar?: string; noter: { id: string; namn: string; text: string }[] };
/** En klass skattning i veckorna före en vecka i planen. */
export type KlassenHittills = { snitt: number; senaste: number; veckor: string; kommentarer: { vecka: string; text: string }[] };
/** Veckan mitt i stegen och klassen med lägst medel i veckorna före. */
export type LarDigMittI = { nr: number; mandag: string; klass: (KlassenHittills & { id: string; namn: string; ensam: boolean }) | null };
/** Klasserna vecka för vecka: veckornas plats i sammanställningen, och en rad per skattad klass med talen och medlet. */
export type Klasstabell = { veckor: number[]; rader: { id: string; namn: string; etikett: string; borta?: true; varden: (number | undefined)[]; snitt: number | null }[] };
/** Avslutet i Lär dig metoden: dagen, anledningen, fasen och steget då, och antalet steg. */
export type LarDigAvslut = { datum: string; not?: string; fas: 'fore' | 'under' | 'efter'; steg: number | null; antal: number };
export type LarDigSammanstallning = { fas: 'fore' | 'under' | 'efter'; nu: number | null; dag: string; harNagot: boolean; mal: string; veckor: LarDigSammanstallningsvecka[]; kommenterade: LarDigSammanstallningsvecka[]; linjer: { namn: string; skala: Skala; regler: (Regel & { rad: number })[]; varden: (number | undefined)[]; galler: number[][] }[]; stegen: { nummer: number; steg: number | null; veckor: number; pagar: boolean }[]; kvar: { nummer: number; steg: number | null }[]; lov: string[]; axel: Veckonamn[]; spann: { fran: string; till: string } | null; klasserna: string; klasstabell: Klasstabell; mitt: LarDigMittI | null; mittSvar: { id: string; namn: string; text: string; snitt?: number; veckor?: string; hittills?: string }[]; avslut: LarDigAvslut | null };
export declare function larDigSammanstallning(plan: Plan, val: Val, f: Foljd, idag: string): LarDigSammanstallning;
export declare const larDigetsRegler: (s: LarDigSammanstallning, rader: { nar: string }[]) => { rad: number; text: string }[];
/** Regeln som gällde i en vecka på linjen. */
export declare const regelnIVeckan: <R extends Regel>(l: { regler: R[]; galler: number[][] }, i: number) => R | undefined;
/** Ett steg som läraren har tagit, i en mening. */
export declare const stegetsRad: (x: { nummer: number; steg: number | null; veckor: number; pagar: boolean }, rubriker: string[]) => string;
/** Klassernas skala i en mening. */
export declare const klassernasSkalaText: () => string;
export declare const regelnIOrd: (r: Regel) => string;
export declare const granslinjensText: (regler: Regel[]) => string;
export declare const LARARENS_SKALOR: readonly { fraga: string; lagst: string; hogst: string }[];
export declare const skalansAndar: (namn: string, j: number) => { fraga: string; lagst: string; hogst: string } | null;
/** Klassernas skattning i Lär dig metoden: skalan 1 till 5 och dess ändar. */
export declare const KLASSERNAS_SKALA: Readonly<Skala & { lagst: string; hogst: string }>;
/** Skalans ändar i ord: "1 är inte alls säker och 10 är helt säker". */
export declare const skalansAndarText: (skala: { fran: number; till: number }, andar: { lagst: string; hogst: string }) => string;
/** Stegen som inte har börjat, i en mening, "Kvar: …" och efter ett avslut "Inte tagna: …". */
export declare const larDigetsKvar: (s: { kvar: { nummer: number; steg: number | null }[]; avslut: unknown }, rubriker: string[]) => string;
/** En tabell per rad och kolumn med ett värde satt, eller borttaget med undefined, och raden borttagen när den blir tom. */
export declare const medVardet: <T>(tabell: Record<string, Record<string, T>> | undefined, rad: string, kolumn: string, varde: T | undefined) => Record<string, Record<string, T>>;
/** Svaret på Gick det? med stegets fråga: "… Ja." eller "… Inte än." */
export declare const gickDetSvaret: (fraga: string | undefined, svar: 'ja' | 'inte') => string;
/** Meningen sist i Lär dig metodens sammanställning. */
export declare const SKATTNINGARNAS_GRANS: string;
/** Frågan vid klassens knappar: "Hur gick det i 7B den här veckan?" */
export declare const klassensFraga: (namn: string) => string;
/** Klasserna vecka för vecka, med talen och klassens medel. */
export declare function klassernasTabell(veckor: { mandag: string }[], f: Foljd): Klasstabell;
export declare function larDigetsKlasser(f: Foljd): string;
export declare function larDigetsSpann(plan: Plan, f: Foljd): { fran: string; till: string } | null;
/** Veckan mitt i stegen i Lär dig metoden: floor(N/2) + 1 av planens N veckor med steg. */
export declare const larDigetsMitt: (plan: { veckor: unknown[] }) => number | null;
/** En klass skattning i veckorna före en vecka i planen, eller inget. */
export declare function klassenHittills(plan: Plan, f: Foljd, id: string, nr: number): KlassenHittills | null;
/** Mitt i stegen: veckan och klassen med lägst medel i veckorna före. */
export declare function larDigetsMittI(plan: Plan, f: Foljd): LarDigMittI | null;
/** Klassen Mitt i i en mening. */
export declare const mittIText: (k: { namn: string; snitt: number; veckor: string; ensam?: boolean }) => string;
/** Frågan Mitt i. */
export declare const mittIFragan: (namn: string) => string;
export declare const MITT_I_LANGD: number;
/** Avslutet i Lär dig metoden i en mening. */
export declare const larDigetsAvslutText: (a: LarDigAvslut) => string;
/** Förslagen på anledning när läraren avslutar en plan, i båda samlingarna. */
export declare const AVSLUTETS_ANLEDNINGAR: Readonly<{ stodundervisning: readonly string[]; metoder: readonly string[] }>;
export declare const ANLEDNINGENS_LANGD: number;
/** Metodens plan i Lär dig metoden ur sidans data. */
export declare const larDigetsMetodplan: (data: { tid: string; period: string; progression: unknown; uppfoljning: unknown; passen: unknown[]; skattningar: unknown[] }) => ReturnType<typeof metodplan>;
export declare function svaraGickDet(plan: Plan, val: Val, f: Foljd, mandag: string, svar: 'ja' | 'inte' | undefined): { val: Val; gick: Record<string, 'ja' | 'inte'>; andrad: boolean; last: boolean };
export declare function obesvaradVecka(plan: Plan, f: Foljd, idag: string, skapad?: string): PlanVecka | null;
/** Metodens skattning av gruppen i ord, lika på sidan, i pdf:en och i texten som kopieras (K-559). */
export declare function skattningensText(s: Sammanstallning, sk: Sammanstallning['skattningar'][number], info: { uppfoljning: { nar: string }[] }): { varden: string; regler: string[] };
export declare function planera(mp: Metodplan, val: Val): Plan;
/** Valen efter en förlängning med n veckor, genom planens egna veckor när insatsen avslutades tidigare, och med dagen läraren förlänger efter den dagen, aldrig på veckor som har varit. */
export declare function forlangdaVal(mp: Metodplan, val: Val, n: number, idag?: string): Val;
/** Veckans nummer i planen, räknat från veckan planen börjar på. */
export declare const planvecka: (plan: Plan, v: PlanVecka) => number;
/** Ordningen efter datum, och efter numret när två har samma datum. */
export declare const efterDatum: (a: { datum: string; nr?: number }, b: { datum: string; nr?: number }) => number;
/** En kopia i datumordning. */
export declare const iDatumordning: <T extends { datum: string; nr?: number }>(lista: T[]) => T[];
/** Veckans pass, i veckans ordning. */
export declare const veckansPass: (plan: { pass: Pass[] }, v: PlanVecka) => Pass[];
/** En vecka där läraren har ställt in alla pass: planen visar inte veckans innehåll. */
export declare const allaPassInstallda: (v: PlanVecka) => boolean;
export declare const kalendervecka: (n: number) => string;
export declare const kalenderveckaUtskriven: (n: number) => string;
/** Insatsen som avslutades före planens slut, i en mening, eller tom. */
export declare function avslutetText(plan: Plan, pagar?: boolean): string;
/** Utvärderingen efter insatsen, med avslutet och lärarens anledning när insatsen avslutades tidigare. */
/** Lärarens anledning till ett avslut i en mening, "Anledning: …", i båda lagren; tom utan. */
export declare const anledningen: (not: string | undefined) => string;
/** Medelvärdet med en decimal, eller inget utan värden. */
export declare const medel: (x: number[]) => number | null;
export declare function utvarderingenText(plan: Plan, u: { beslut?: string; not?: string } | null | undefined, pagar?: boolean, tidigare?: Avslutet[] | Avslutet | null): string;
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
export declare const larDigetsNamn: (v: { innehall: number; gang?: number; vecka: number; efter?: boolean }) => Veckonamn;
/** Raderna i planens passen som gäller passet, den mest bestämda först. */
export declare function passetsRoller(plan: Plan, p: Pass, passen: Metodplan['passen']): number[];
/** Raderna som passet visar: den mest bestämda raden om passets plats i insatsen, med raderna som har samma när, och raderna om veckorna. */
export declare function passetsVisadeRoller(plan: Plan, p: Pass, passen: Metodplan['passen'], varianter?: { nar: string }[]): number[];
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
export declare function passetsBeskrivning<D extends { tid: string; fas: string; vad: string }>(roller: { text?: string; rad?: { kolumn: string; text: string }[]; veckor?: Record<string, { kolumn: string; text: string }[]>; kort?: string; utanTidsschema?: boolean; del?: string; istallet?: boolean; sist?: boolean; tabell?: { namn: string; adress: string; sida?: boolean; efter?: string; delar?: D[]; fore?: { namn: string; nar: string; vad: string; mer?: { etikett: string; text: string }[] }[] } }[], passet: { delar: D[]; fore?: string; varianter?: (Variant & { delar: D[] })[] } | undefined, lage?: PassetsLage): { namn: string; texter: { etikett: string; text: string }[]; delar: (D & { forst?: DelensForsta; sist?: DelensForsta; istallet?: true })[]; egenOrdning: boolean; fore?: string; foreForst?: DelensForsta; efterForst?: DelensForsta; efterIstallet?: true; utanDel: string[]; foreRader: { namn: string; nar: string; vad: string; mer?: { etikett: string; text: string }[] }[]; tabell?: { namn: string; adress: string; sida?: boolean; efter?: string; delar?: D[]; fore?: { namn: string; nar: string; vad: string; mer?: { etikett: string; text: string }[] }[] }; rubrik?: string; variantText?: string };
/** En del i ett pass med egen tabell: tiden, namnet när tabellen har ett, vad som händer och de andra kolumnerna med sina namn. */
export type TabellDel = { tid: string; fas: string; vad: string; mer: { etikett: string; text: string }[] };
/** Delarna i ett pass med egen tabell, och förberedelsen, eller null när tabellen inte är ett pass i delar. */
/** Passets delar ur ett fält på veckans sida, en rad per del: "N–M min. Delens namn: det som händer." */
export declare function faltetsDelar(text: unknown): { delar: TabellDel[]; fore: { namn: string; nar: string; vad: string; mer: { etikett: string; text: string }[] }[]; efter?: string; slag?: string } | null;
export declare function faltetsSkillnader(text: unknown, delnamn: string[]): { slag: string; texter: string[]; iDelar: { del: string; text: string }[]; ovrigt: { etikett: string; text: string }[] } | null;
/** Metodens passnummer i en kurs i veckor, som veckosidans fält "Pass N". */
export declare function kursensPassnummer(plan: Plan, takt: number, p: Pass, veckor?: number): number | null;
export declare function tabellensDelar(t: { kolumner: string[]; rader?: unknown[][] }, kolumn?: string): { delar: TabellDel[]; fore: { namn: string; nar: string; vad: string; mer: { etikett: string; text: string }[] }[]; efter?: string } | null;
/** En dels tid utan "min": "0–3". */
export declare const delensTid: (tid: string) => string;
/** En dels tid i planen: en plats i passet, "0–4", när delarna följer på varandra, och annars längden, "3–8 min". */
export declare const delensTidI: (tid: string, delar: { tid: string }[]) => string;
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
/** Hur länge varje steg varar, i en mening till Börja på, eller tom när stegen är olika långa. */
export declare function stegensTakt(rader: { vecka: string }[]): string;
/** Stegets namn i planen: ledet före det korta namnet, "Vi gör · Paren ställer frågorna …". */
export declare const stegetsNamnIPlanen: (r: { led?: string }, kort: string) => string;
/** Stegets innehåll utan ledet, för raden Eleven arbetar med i texten till åtgärdsprogrammet. */
export declare const stegetsInnehall: (r: { led?: string; kort: string }) => string;
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
export declare function dokumentationstext(info: { titel: string; undertitel?: string; adress: string; mal?: string; steg?: string[]; uppfoljning: { nar: string }[]; nivaNamn?: string }, plan: Plan, val: Val, o: { minuter: number; genomforda?: number; folj?: boolean; avstamning?: { beslut?: string; not?: string }; utvardering?: { beslut?: string; not?: string }; elever?: { namn: string }[]; pagar?: boolean; lektioner?: { namn: string; datum: string[] }[]; lektionerSedan?: boolean; extraPass?: { datum: string }; tidigareAvslut?: Avslutet[] | null; resultat?: string[] }): string;
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
export declare const RESULTATETS_LANGD: number;
export declare const utanFogar: (s: string | undefined) => string;
export declare const versionsform: (s: string | undefined) => string;
export declare function lektionernaPaVeckorna(fore: Plan, efter: Plan, lektioner: number[], minne?: Record<string, number>): { lektioner: number[]; minne: Record<string, number> };
export declare function antalBockade(plan: Plan, gjorda: string[] | undefined): number;
export declare function extraPassetsDag(plan: Plan, val: Val): string | undefined;
export declare function kalenderfil(info: { titel: string; uppfoljning: { nar: string }[]; fokus: (string | null)[]; passet?: (p: Pass) => string; minuter?: (p: Pass) => number; extraPass?: { datum: string; text: string } }, plan: Plan, o: { id: string; lank: (vecka?: number | 'fore') => string; namn?: string; nu: Date; tider?: Val['tider']; passtider?: Val['passtider']; elever?: { namn: string; fran?: string }[] }): string;
/** Passens tider, rensade: veckodag till början och slut, som "09:20" och "10:00". */
export declare function rentaTider(tider: unknown): Record<string, [string, string]>;
export declare function rentaPasstider(passtider: unknown): Record<string, [string, string] | [string, string, number]>;
export declare const passetsEgenTid: (val: Val, p: Pass) => [string, string] | undefined;
export declare const dokumentationsrader: (...a: Parameters<typeof dokumentationstext>) => { etikett?: string; text: string }[];
export declare const radText: (r: { etikett?: string; text: string }) => string;
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
/** Dagarnas avsnitt, ett före varje byte av dagar och ett med dagarna som gäller nu, med passens datum. */
export declare function dagarnasAvsnitt(val: Val, pass: { datum: string; nr?: number; flyttatFran?: string }[]): { dagar: number[]; datum: string[]; nu: boolean }[];
/** Dagarna i planens namn: "Mån, ons, fre från 9 nov", och efter ett byte "…, sedan tis, ons, fre". */
export declare function planensDagar(val: Val, pass: { datum: string; nr?: number; flyttatFran?: string }[]): string;
/** Dagarna som gällde före ett byte av dagar mitt i insatsen, i datumordning. */
export declare function rentaFore(fore: unknown): { till: string; dagar: number[]; fasta?: Record<string, number> }[];
/** Om en veckodag är en passdag ett visst datum, med ett byte av dagar mitt i insatsen. */
export declare function passdagar(val: Val): (datum: string, dag: number) => boolean;
/** Nya dagar för planen; med ett datum gäller de från det datumet och dagarna före står kvar. */
export declare function bytDagar(val: Val, dagar: number[], fran?: string, plan?: { pass: Pass[] }): Val;

/** Det läraren för in när hen följer insatsen, allt valfritt: passen som blev av (passens dagar), skattningen vecka för vecka (veckans måndag, sedan elevens id eller grupp), elevlistan, resultaten i metodens uppföljning och besluten mitt i och efter. */
export interface Foljd { gjorda?: string[]; elever?: { id: string; namn: string; utkast?: true; fran?: string }[]; narvaro?: boolean; franvaro?: Record<string, string[]>; vecka?: Record<string, { varde?: number; not?: string }>; skattning?: Record<string, Record<string, number>>; resultat?: Record<string, Record<string, string>>; avstamning?: { beslut?: string; not?: string }; utvardering?: { beslut?: string; not?: string }; oppen?: string; borttagna?: string[]; listan?: string; lamnade?: { id: string; namn: string; utkast?: true; fran?: string }[]; matt?: Record<string, Record<string, number>>; lankar?: Record<string, { formular?: string; sammanstallning?: string }>; lektionPa?: Record<string, number>; klasser?: Klass[]; kommentar?: Record<string, string>; noter?: Record<string, Record<string, string>>; gick?: Record<string, 'ja' | 'inte'>; bockat?: number[]; klassvarden?: Record<string, Record<string, number>>; mittI?: Record<string, string>; avslut?: { datum: string; not?: string }; tidigareAvslut?: Avslutet[] }
export declare const passetsDag: (p: Pass) => string;
/** Passet som redan ligger på en dag i veckan, utom passet som flyttas. */
export declare const passetPaDagen: (plan: { pass: Pass[] }, v: PlanVecka, datum: string, utom: string) => Pass | undefined;
/** Dagen som ett pass hade innan det flyttades till datumet. */
export declare const flyttatHit: (val: Val, datum: string) => string | undefined;
/** Valen när läraren ställer in passet på en dag; det sista passet efter ett avslut ger slutet till passet före (fore, avslutet), och utan pass före null; det sista passet i en period i veckor ger fore utan avslutet. */
export declare function installtPass(plan: Plan, val: Val, dag: string): { val: Val; fore?: Pass; avslutet?: boolean } | null;
/** Beskedet när läraren ställer in ett pass, ur installtPass: passet insatsen nu slutar med, och efter ett avslut att det som avslutet strök inte kommer tillbaka. */
export declare const installtBesked: (inst: { fore?: Pass; avslutet?: boolean }) => string;
/** Ett avslut som ett annat beslut har kommit efter: passet insatsen slutade med och lärarens anledning (Foljd.tidigareAvslut). */
export interface Avslutet { pass: number; not?: string }
/** Avsluten som en lista i ordning, också ur ett enda avslut som en plan sparade före listan. */
export declare const avslutenFore: (x: unknown) => Avslutet[];
/** Hur många avslut planen minns. */
export declare const AVSLUTENS_LANGD: number;
export declare const SKALAN: readonly string[];
export declare const skattningsfragan: (grupp?: boolean) => string;
export declare const GRUPPEN: 'grupp';
/** Det läraren har fört in, rensat till det sidan kan visa; det som inte går att läsa tas bort. */
export declare function rensaFoljd(f: unknown): Required<Pick<Foljd, 'gjorda' | 'elever' | 'franvaro' | 'vecka' | 'skattning' | 'resultat'>> & Pick<Foljd, 'narvaro' | 'avstamning' | 'utvardering'>;
export declare function mittVeckan(plan: Plan): number | null;
export interface SammanstallningVecka { lektion?: string; nr: number; mandag: string; vecka: number; innehall: number; igen: boolean; pass: { nr: number; dag: string; datum: string; gjort: boolean }[]; gjorda: number; planerade: number; varit: number; installda: number; helgdagar: number; helgdagarKvar: number; skattning?: number; not?: string }
export interface SammanstallningElev { id: string; namn: string; fran?: string; passen?: number; skattningar: { nr: number; vecka: number; varde: number; lektion?: string }[]; forsta: { nr: number; vecka: number; varde: number; lektion?: string } | null; senaste: { nr: number; vecka: number; varde: number; lektion?: string } | null; narvaro: number | null; resultat: Record<string, string> }
export interface Sammanstallning { veckor: SammanstallningVecka[]; elever: SammanstallningElev[]; lektioner?: { namn: string; mal: string; veckor: number[] }[]; grupp: boolean; narvaro: boolean; planerade: number; gjorda: number; veckomedel: number | null; varit: number; gjordaVarit: number; installda: number; helgdagar: number; helgdagarKvar?: number; slut: boolean; avslutad?: boolean; mitt: number | null; avstamning: { beslut?: string; not?: string } | null; utvardering: { beslut?: string; not?: string } | null; tidigareAvslut?: Avslutet[] | null; resultat?: string[]; namnen: { namn: string }[]; skattningar: { namn: string; skala: Skala; regler: (Regel & { rad: number })[]; varden: (number | undefined)[]; galler: number[][] }[] }
/** Namnen som texterna som lämnar webbläsaren tvättar bort: eleverna i listan och de som har stått i den. */
export declare const elevernasNamn: (f: Foljd | undefined) => { namn: string }[];
export declare function sammanstallning(plan: Plan, f: Foljd, idag: string, lektioner?: ({ namn: string; mal: string } | null | undefined)[]): Sammanstallning;
export declare const lektionernasMal: (s: Pick<Sammanstallning, 'lektioner' | 'veckor' | 'elever'>, e?: Pick<SammanstallningElev, 'skattningar'>) => string;
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
export declare function uppfoljningensRad(plan: Plan, info: { uppfoljning: { nar: string }[] }, u: Plan['uppfoljning'][number], nycklar?: string[]): string;
/** Uppföljningens datum för en rad, med en mätning vid ett tidigare slut som en förlängning har flyttat. */
export declare function uppfoljningensDatum(u: Plan['uppfoljning'][number], nycklar?: string[]): string[];
/** Nycklarna till resultaten som har förts in, "rad-datum". */
export declare const resultatensNycklar: (f: { resultat?: Record<string, Record<string, string>> } | null | undefined) => string[];
/** Uppföljningens rad med sitt namn: Efter insatsen, eller radens namn i metoden. */
export declare const uppfoljningensNamn: (plan: Plan, info: { uppfoljning: { nar: string }[] }, rad: number) => string;
/** Uppföljningens rader med datum. */
export declare const uppfoljningensRader: (plan: Plan, info: { uppfoljning: { nar: string }[] }, nycklar?: string[]) => string[];
/** Veckorna där läraren har skattat hur veckan gick. */
export declare const skattadeVeckor: <T extends { skattning?: number }>(s: { veckor: T[] }) => T[];
/** Vad skattningen är, i en text. */
export declare const skattningenText: (vem: string, varjeVecka?: boolean, mal?: string) => string;
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
export declare const insatsenAvslutad: (sistaPass: string | undefined, beslut: string | undefined, idag: string, oppen?: string, sistaDag?: string, iFortid?: boolean) => boolean;
/** Beslutet och lärarens mening, med punkt. */
export declare const beslutText: (b: { beslut?: string; not?: string }) => string;
/** Förlängningens uppehåll i en mening, lika i texten till åtgärdsprogrammet och sammanställningen. */
export declare function uppehalletsText(plan: Plan, tidigare?: Avslutet[] | Avslutet | null): string;
/** Uppehållets hela veckor efter en förlängning, deras måndagar. */
export declare const uppehalletsVeckor: (plan: Plan) => string[];
/** Beskedet när elever lämnar elevlistan, eller klasser listan i Lär dig metoden (klasser), med vad som händer med det som förts in om dem. */
export declare function borttagnasBesked(borta: { namn: string; harInfort: boolean }[], o?: { klasser?: boolean }): string;
/** Har läraren fört in något om eleven: en skattning, ett resultat eller frånvaro. */
export declare const elevenHarInfort: (f: Foljd, id: string) => boolean;
/** Dagen en ny elev kom till elevlistan, ur listans historia: i dag när gruppen har haft en lista före i dag och ett pass är bockat före i dag, annars ingen. */
export declare const nyaElevensDag: (f: Foljd, fore: number, idag: string) => string | undefined;
/** Avstämningen mitt i insatsen som en rad, lika i sammanställningen och i texten till åtgärdsprogrammet. */
export declare const avstamningensRad: (veckan: string, a: { beslut?: string; not?: string } | null | undefined) => { etikett: string; text: string } | null;
/** Passens rad: läget, de som har varit utan bock, och de inställda och helgdagarna. */
export declare function passensRad(s: { planerade: number; gjorda: number; varit: number; gjordaVarit: number; slut: boolean; installda: number; helgdagar: number; helgdagarKvar?: number }): string;
/** Passen som läraren har bockat, i en mening. */
export declare function passensLage(s: { planerade: number; gjorda: number; varit: number; gjordaVarit: number; slut: boolean }): string;
/** Elevens närvaro i en mening. */
export declare const narvaronText: (e: { narvaro: number | null }, s: { gjorda: number }) => string;
/** Delarna i en mätnings resultat, med semikolon mellan i metodens fält. */
export declare const resultatetsDelar: (resultat: string | undefined) => string[];
/** Det läraren förde in vid en mätning, med vad varje värde står för ur metodens delar, eller som läraren skrev det. */
export declare function resultatMedDelar(resultat: string | undefined, varde: string): string;
/** Det läraren förde in vid uppföljningens rad, med radens delar. */
export declare const resultatetsVarde: (info: { uppfoljning: { resultat?: string }[] }, t: { rad: number; varde: string }) => string;
/** Ett resultat i metodens uppföljning, med vad talen står för: "Före insatsen, v. 45: nivå i screeningen 2, klarade uppgifter 6 av 9". */
export declare const resultatText: (plan: Plan, info: { uppfoljning: { nar: string; resultat?: string }[] }, t: { rad: number; datum: string; varde: string }) => string;
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
/** En text med metodens saker, där saken blir det sidan gör av den och resten det sidan gör av en text, en rot för båda lagren. */
export declare const sakernasText: <S extends Sak>(text: string, saker: S[], sak: (s: S, text: string) => string, annat: (text: string) => string) => string;
/** Namn som ser ut som en sak (ett sammansatt ord på blad, kort, mall …) men inte är någon av sakerna. */
export declare function olankadeSaker(text: string, saker: Sak[]): string[];
export declare const EGNA_SAKER: readonly string[];
/** Spannen av saker med nummer i en text, som "Bildserie 2–6". */
export declare function sakspann(text: string): { index: number; langd: number; text: string; namn: string[]; fran: number; till: number; nummer: number[] }[];

/** Små textverktyg och talen (sajtens K-509, text.js), en rot för varje. */
export declare const stor: (s: string) => string;
export declare const liten: (s: string) => string;
/** Liten bokstav först i ett namn inne i en mening, utom i en förkortning eller en bokstav med bindestreck, som T-kortet. */
export declare const litenForsta: (s: string) => string;
/** Hårda bindestreck mellan bokstäver och hårt mellanslag efter ett fristående tal, för filer med fasta rader. */
export declare const utanRadbrytning: (s: string) => string;
export declare const mening: (s: string) => string;
export declare const utanPunkt: (s: string) => string;
export declare const decimal: (n: number | null) => string;
export declare const tvasiffrigt: (n: number) => string;
export declare const esc: (s: string) => string;
export declare const skyddaRegex: (s: string) => string;
/** Ett antal med ett ord av utrum i ord: "en vecka", "två veckor". */
export declare const antalText: (n: number, en: string, flera: string) => string;
/** Ett antal veckor i ord. */
export declare const veckorText: (n: number) => string;
/** En lista, eller en tom lista när värdet inte är en. */
export declare const somLista: (x: unknown) => unknown[];
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

/** Undervisningsmetoderna (sajtens K-621, undervisningsmetod.js): delarna i lärarens väg, i läsordning. */
export declare const UNDERVISNINGSMETODENS_DELAR: readonly { id: string; nr: string; namn: string; rad: string; text: string }[];
/** En dels rad och övergångsmening med metodens minuter, veckor och huvudexemplets ämne. */
export declare function delarnasText(del: { id: string; rad: string; text: string }, m: { minuter?: number; veckor?: number; amne?: string; andra?: number; progression?: string }): { rad: string; text: string };
/** Utfallens gränser för en klass med n elever, i elever med fel. */
export declare function utfallensGranser(n: number): { nastanAlla: number; deFlesta: [number, number]; halften: number };
/** Utfallens namn i beslutsstället, i ordning. */
export declare const UTFALLEN: readonly [{ id: 'nastanAlla'; namn: 'Nästan alla kan' }, { id: 'deFlesta'; namn: 'De flesta kan' }, { id: 'halften'; namn: 'Hälften eller färre kan' }];
/** Det som saknas eller har fel form i en undervisningsmetods fil för att sajten ska kunna visa den. Tom lista när allt finns. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare function undervisningsmetodensFel(d: Record<string, any>): string[];

/** Metodkortets nivåer (undervisningsmetod.js, sajtens K-632): tillförlitligheten och effekten i ett område. */
export type Tillforlitlighet = 'hog' | 'mattlig' | 'lag';
export type Effekt = 'negativ' | 'ingen' | 'liten' | 'mattlig' | 'stor';
/** Ett område utan nivå: Inte studerat, Inte sammanvägt eller Väntar (bara i ett skelett). */
export type UtanNiva = 'inte-studerat' | 'inte-sammanvagt' | 'vantar';
export type Omradesvarde = { tillforlitlighet: Tillforlitlighet; effekt: Effekt; motivering: string; kallor?: string[]; kort?: string } | { niva: UtanNiva; motivering: string; kort?: string } | { niva: 'anekdotiskt'; motivering: string; kallor: string[]; kort?: string };
/** Läget för ett område: en nivå 1 till 5 med sitt ord, Oklart, ett läge utan nivå eller okänt (tomt ord). */
export type Laget = { slag: 'niva'; niva: number; ord: string; negativ: boolean } | { slag: 'oklart' | 'inte' | 'okand'; ord: string };
/** Nivåernas ord, 1 till 5, med en tom först. */
export declare const NIVAORD: readonly ['Inget påvisat stöd', 'Anekdotiskt stöd', 'Svagt stöd', 'Visst stöd', 'Gott stöd', 'Starkt stöd'];
/** Vad varje nivå och läge betyder, i metodkortets ordning; staplar är antalet fyllda, null utan staplar. */
/** Vad en metod är till för, filtret Du vill i banken Metoder. */
export declare const SYFTEN: readonly { id: string; namn: string; text: string }[];
/** Var i lektionen metoden används, ur slaget. */
export declare const ANVANDS_I: Readonly<Record<'lektionsforlopp' | 'strukturer' | 'strategier', string>>;
/** Områdena som banken filtrerar stödet på. */
export declare const BANKENS_OMRADEN: readonly { id: string; namn: string }[];
/** Stödets grupper efter antalet staplar. */
export declare const STODETS_GRUPPER: readonly { id: string; namn: string; staplar: number[]; text: string }[];
/** Svårighetens grupper efter nivån. */
export declare const SVARIGHETENS_GRUPPER: readonly { id: string; namn: string; nivaer: number[] }[];
/** Det banken filtrerar en metod på. */
export declare function bankensVal(d: Record<string, any>): { syfte: string[]; anvands: string | null; svarighet: string | null; stod: Record<string, string | null> };
/** Ett spann mellan reglagets två grepp, i lägenas ordning. */
export type Spann = { fran: string; till: string };
/** Lägena i bankens reglage, i ordning. */
export declare const BANKENS_LAGEN: Readonly<{ anvands: readonly string[]; stod: readonly string[]; svarighet: readonly string[] }>;
/** Spannet ur adressens text, eller null för Alla. */
export declare function spannUr(lagen: readonly string[], text: string | null | undefined): Spann | null;
/** Spannets text i adressen, tom för Alla. */
export declare function spannText(lagen: readonly string[], spann: Spann | null | undefined): string;
/** Filtrets val som bankensValPassar tar dem. */
export type BankensVal = { syfte?: string; omrade?: string; anvands?: Spann | null; stod?: Spann | null; svarighet?: Spann | null };
/** Om en metod passar filtrets val; spannen med ändarna, Stöd i valt område och annars Lärande totalt. */
export declare function bankensValPassar(v: ReturnType<typeof bankensVal>, val: BankensVal): boolean;
/** Filtrets val ur adressens eller formulärets text. */
export declare function bankensValUr(text: Record<string, string | undefined>): BankensVal;
/** Vilka rutor bankens filter visar: de som skiljer metoderna åt, och Område och Stöd tillsammans. */
export declare function bankensRutor(valen: ReturnType<typeof bankensVal>[]): { syfte: boolean; anvands: boolean; omrade: boolean; stod: boolean; svarighet: boolean };
export declare const NIVAERNAS_FORKLARING: readonly { ord: string; staplar: number | null; text: string }[];
export declare function laget(v: { tillforlitlighet?: string; effekt?: string; niva?: string } | undefined | null): Laget;
export type Svarighet = { lara: number; karnan: number; stod: number; tid: number; motivering: string };
export type Kostnad = { kop: number; timmar: number; motivering: string };
export declare const SVARIGHETENS_ORD: readonly ['', 'Mycket lätt', 'Lätt', 'Medelsvårt', 'Svårt', 'Mycket svårt'];
export declare const KOSTNADENS_ORD: readonly ['', 'Mycket låg', 'Låg', 'Måttlig', 'Hög', 'Mycket hög'];
/** Svårigheten att införa, 1 till 5: den övre medianen av de fyra kriterierna; null utan något kriterium. */
export declare function svarighetensNiva(s: { lara: number; karnan: number; stod: number; tid: number }): number;
export declare function svarighetensNiva(s: { lara?: number; karnan?: number; stod?: number; tid?: number } | undefined | null): number | null;
/** Kostnaden att införa, 1 till 5: den högre av inköpet och timmarna. */
export declare function kostnadensNiva(k: { kop?: number; timmar?: number } | undefined | null): number;
/** Motiveringens första mening, om tillförlitligheten och effekten, och resten. */
export declare function motiveringensDelar(text: string | undefined): { forst: string; resten: string };
/** Kommentaren under Lärande totalt: områdets korta mening, eller motiveringen efter den första meningen utan hänvisningar. */
export declare function larandetIKort(v: { kort?: string; motivering?: string } | undefined | null): string | undefined;

/** Lathunden Att komma igång (undervisningsmetod.js, lathundensSidor): en rad i faktan. */
/** niva är nivån 1 till 5 i Lärande totalt, Svårighet och Kostnad, som riggen skriver före ordet. */
export interface LathundFakta { namn: string; text: string; niva?: number; under?: string }
/** En del på en av lathundens sidor, med sitt slag och innehåll. */
export type LathundDel = { id: string } & (
  | { slag: 'fakta'; rader: LathundFakta[] }
  | { slag: 'stycken'; rubrik?: string; text: string[] }
  | { slag: 'kort'; rubrik?: string; kort: { nr: number; namn: string; text: string; under: string }[]; fot?: string }
  | { slag: 'not'; namn: string; text: string }
  | { slag: 'checklista'; rubrik: string; punkter: string[] }
  | { slag: 'minuter'; rubrik: string; delar: { fas: string; tid: string; fraser: string[] }[] }
  | { slag: 'rutin'; rubrik: string; namn: string; text: string; steg: string[] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { slag: 'planering'; plan: Record<string, any>; exempel?: Record<string, any>; variant?: string; gra: boolean; text?: string }
  | { slag: 'tabell'; rubrik?: string; kolumner: string[]; rader: string[][] }
);
export interface LathundSida { id: string; nr: number; namn: string; delar: LathundDel[] }
/** Uppföljningens rader i Med dig på vägen, i tidsordning. */
export declare const MED_DIG_PA_VAGEN: readonly string[];
/** Namnen på områdena i Så syns lärandet i klassen, som Det sociala. */
export declare const LARANDETS_OMRADEN: Readonly<Record<string, string>>;
/** Riggens fasta text om arbetslagets möten i Till arbetslaget, ordagrant. */
export declare const ARBETSLAGETS_MOTEN: Readonly<{ leder: string; mote1: string; mellan: string; mote2: string; mote2UtanVecka: string; mote2Text: string; sistaFragan: string }>;
/** Till arbetslaget i riggens ordning: texten, raden om vem som leder och mötena med rubrik, stycken och frågor. Null utan uppdrag. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare function arbetslagetsMoten(d: Record<string, any>): { rubrik: string; text: string; leder: string; moten: { id: string; rubrik: string; text: string[]; fragor: string[] }[] } | null;
/** Det svåraste i kort form (hinder.kort): högst två meningar och 220 tecken. */
export declare const HINDRETS_KORT: { readonly meningar: number; readonly tecken: number };
/** Lathundens tak: de längder som ryms på lathundens fyra liggande sidor, som sajten ritar (K-637). */
export declare const LATHUNDENS_TAK: {
  readonly tid: number; readonly metodensText: { readonly stycken: number; readonly tecken: number }; readonly lektionensText: number;
  readonly karnan: { readonly namn: number; readonly vad: number }; readonly checklista: { readonly punkter: number; readonly tecken: number };
  readonly fraser: number; readonly rutinerVecka1: number; readonly veckorna: { readonly rader: number; readonly tecken: number; readonly alla: number };
  readonly medDig: number; readonly efter: number; readonly fallgropar: { readonly fallgrop: number; readonly prova: number };
};
/** Det i metodens fil som är längre än lathundens tak, med fältet och var det står i lathunden; tom när allt ryms. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare function lathundensTakFel(d: Record<string, any>): string[];
/** Effektens gränser i standardavvikelser: stora randomiserade studier med oberoende prov (Kraft, 2020) och andra studier och sammanställningar. */
export declare const EFFEKTENS_GRANSER: { readonly stora: { readonly mattlig: number; readonly stor: number }; readonly andra: { readonly mattlig: number; readonly stor: number } };
/** Platsen av 100 där eleven i mitten hamnar med en effekt på x standardavvikelser, som 58 vid 0,20. */
export declare function platsenAv100(x: number): number;
/** Hur effekten läses, kort för en lärare: vad talet betyder och orden, samma i varje undervisningsmetod, med talen ur EFFEKTENS_GRANSER. */
export declare function effektensSkala(): { rubrik: string; text: string[]; kallor: { namn: string; text: string; doi: string }[] };
/** Det som skiljer slagen åt i vägen till måndag: lektionen som minuterna och den grå planen gäller, och samma i en mening. */
export declare const SLAGENS_FORM: Readonly<Record<'lektionsforlopp' | 'strukturer' | 'strategier', Readonly<{ forstaLektionen: string; din: string; start: string }>>>;
/** Lektionen som minuterna och den grå planen gäller, med namnet i en mening, minuternas rubrik och raden ovanför planen. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare function forstaLektionensForm(d: Record<string, any>): { namn: string; din: string; minuterna: string; forlagan: string };
/** Veckans rubrik med numret, ledet när raden har det och rubriken: "Vecka 1, Klimatet: …", eller "1. Klimatet: …". */
export declare function veckansRubrik(r: { vecka?: string | number; led?: string; rubrik?: string }, o?: { vecka?: boolean; nummer?: boolean }): string;
/** Raden under ett områdes namn på metodkortet. */
export declare const OMRADENAS_RAD: Readonly<{ lasning: string; amnen: string }>;
/** Faktarutans material: högst så många delar. */
export declare const FAKTANS_MATERIAL: number;
/** Etiketterna över ämnesexemplets två rader, en för alla slag. */
export declare const EXEMPLETS_ETIKETTER: Readonly<{ egen: string; visar: string }>;
/** Primär evidens: de högst två av sajtens fyra områden med starkast stöd, minst Visst stöd, och alla som står helt lika. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare function primaraOmraden(evidens: Record<string, any>): string[];
/** Regeln för Primär evidens i ord. */
export declare const PRIMARA_REGELN: string;
/** Filmernas namn, film och film<nr> för varje extrafilm. */
export declare const metodensFilmnamn: (d: { film?: unknown; filmer?: { nr: number }[] }) => string[];
/** Första lektionens delar med minuterna och de en eller två fraser läraren säger; den första delen har rutinens repliker. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare function forstaLektionensMinuter(d: Record<string, any>, nar?: string): { fas: string; tid: string; fraser: string[] }[];
/** Ankaret på metodens sida för en variant av lektionens tider, ur dess nar. */
export declare const variantensAnkare: (nar: string) => string;
/** Vägen till måndag när den första hela lektionen kommer efter vecka 1: vecka 1 ur forsta.text, den korta formen och veckorna för den hela lektionen. Null i ett lektionsförlopp. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare function vagenTillMandag(d: Record<string, any>): { vecka1: string; kort: { nar: string; rubrik: string; ankare: string; minuter: { fas: string; tid: string; fraser: string[] }[] } | null; hel: { namn: string; nar: string } } | null;
/** Lathundens fyra sidor ur metodens fält: Metoden, Vägen till måndag, Planera lektionen och De första veckorna, utan Håll fast. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export declare function lathundensSidor(d: Record<string, any>): LathundSida[];

/** Strukturernas slag med namnet för läsaren och färgen, en rot för kortet, filtret, sidan och symbolerna (K-650). */
export declare const STRUKTURENS_SLAG: Readonly<Record<'par' | 'grupp' | 'klass', { namn: string; farg: string; ljus: string }>>;
/** Gränserna för en struktur: stegens antal och längd, förslagens antal och meningar, områdena och årskurserna. */
export declare const STRUKTURENS_GRANSER: Readonly<{
  steg: Readonly<{ minst: number; 'högst': number; tecken: number; allaTecken: number }>;
  forslag: Readonly<{ antal: number; meningar: readonly [number, number] }>;
  omraden: readonly string[];
  arskurser: readonly string[];
}>;
/** Kontrollsumman över bankens fält i en struktur: namnet, andra namn, syftet och stegen. */
export declare function strukturensSumma(s: { namn?: string; andra?: string[]; syfte?: string; steg?: string[] }): string;
/** Felen i en struktur, som en lista. Ett utkast får sakna bild, förslag och prövning. */
export declare function strukturensFel(s: { namn?: string; andra?: string[]; syfte?: string; kalla?: { summa: string }; slag?: string; steg?: string[]; bild?: { scen?: string; alt?: string }; forslag?: { omrade: string; arskurs: string; amne?: string; text: string }[]; provad?: { datum: string; svar: string }; utkast?: boolean }): string[];
/** Arken när strukturkort skrivs ut två och två: framsidorna och sedan baksidorna i samma ordning, med kortens platser. */
export declare function strukturkortensArk(antal: number): { del: 'fram' | 'bak'; uppe: number; nere: number | null }[];
/** Kontrollsumman över det ett strukturkort visar: namnet, slaget, stegen och scenens fil. */
export declare function strukturkortetsInnehall(s: { namn: string; slag: string; steg: string[] }, scen: string): string;
/** Kortets fil, strukturkort-<id>.pdf. */
export declare function strukturkortetsFil(id: string): string;
/** Filen med alla strukturkort och dess nyckel i manifestet. */
export declare const STRUKTURKORTEN_ALLA: Readonly<{ fil: string; nyckel: string }>;
/** En metods strukturkort två och två på A4, och nyckeln i manifestet. */
export declare function metodensStrukturkort(metod: string): Readonly<{ fil: string; nyckel: string }>;
/** Formerna som en strukturs namn står i i en metods text, för sådden. */
export declare function strukturnamnensFormer(namn: string): string[];
/** Står strukturens namn i texten, med stor bokstav utom i ett namn med kommatecken? */
export declare function strukturnamnetI(namn: string, text: string): boolean;
/** En utskrift väger som så många besök i topplistan. */
export declare const UTSKRIFTENS_VIKT: number;
/** Hur många strukturer topplistan visar, och hur många som behöver ha besök innan den visas. */
export declare const TOPPLISTANS_ANTAL: number;
/** Topplistans räkning ur GoatCounters sidor och händelser, flest först. */
export declare function strukturernasTopplista(hits: { path: string; count: number }[]): { id: string; antal: number; besok: number; utskrifter: number }[];
/** Gränserna för strukturerna i en metods fält strukturkort. */
export declare const METODENS_STRUKTURKORT: Readonly<{ minst: number; högst: number }>;
/** Felen i en metods fält strukturkort, tomt när fältet saknas. */
export declare function strukturkortensFel(sk: unknown): string[];
