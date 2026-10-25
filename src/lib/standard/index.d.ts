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
export type Tid = { typ: 'fore' } | { typ: 'efter'; veckor: number; till?: number } | { typ: 'lopande'; enhet: 'pass' | 'vecka' } | { typ: 'intervall'; var: number } | { typ: 'vecka'; veckor: number[] } | { typ: 'sista-veckan' } | { typ: 'pass'; pass: number[] } | { typ: 'sista-passet' } | { typ: 'villkor' };
/** En rad i progressionen: veckorna eller passen den gäller; till saknas när den gäller till slutet. */
export interface Steg { rad: number; fran: number; till?: number; vidBehov: boolean; efter?: true }
/** Vilka pass en rad i planens passen gäller: platsen i veckan, eller numret i insatsen. */
export type PassensNar = { typ: 'vecka'; plats: number | 'sista' | 'ovriga' } | { typ: 'pass'; fran: number; till?: number } | { typ: 'sista' } | { typ: 'veckor'; fran: number; till: number };
/** Metodens plan: hur ofta, passets längd, perioden, progressionens steg och uppföljningens tider. */
export interface Metodplan { takt: { min: number; max: number }; minuter: { min: number; max: number }; period: { min: number; max?: number; enhet: 'veckor' | 'pass'; mer: boolean; hogst: boolean; perKurs: boolean }; stegEnhet: 'veckor' | 'pass'; steg: Steg[]; uppfoljning: { rad: number; tid: Tid }[]; passen: { rad: number; nar: PassensNar }[] }
/** Lärarens val: första passet, dagarna (1 för måndag), antalet veckor eller pass, nivån, minuterna, lovveckorna (2026-52), veckorna som tas om, flyttade och inställda pass. */
export interface Val { start: string; dagar: number[]; langd: number; niva?: string; borja?: number; minuter?: number; lov?: string[]; upprepa?: number[]; flytta?: Record<string, string>; stryk?: string[]; tider?: Record<string, [string, string]>; mal?: string }
export interface Pass { nr: number; datum: string; vecka: number; steg?: number | null; flyttatFran?: string }
export interface PlanVecka { nr: number; innehall: number; igen: boolean; mandag: string; vecka: { ar: number; vecka: number }; pass: number[]; bortfall: { datum: string; varfor: 'helgdag' | 'installt'; namn?: string }[]; steg?: number | null }
export interface Plan { start: string; enhet: 'veckor' | 'pass'; borja: number; forstaPass?: string; sistaPass?: string; sistaNr?: number; efter: string; pass: Pass[]; veckor: PlanVecka[]; lovveckor: string[]; uppfoljning: { rad: number; typ: Tid['typ']; tillfallen: { datum: string; vecka: number | null }[] }[]; fore: { mandag: string; overLov: boolean }; efterSteg?: number }
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
/** Veckorna i "vecka 3" och "vecka 1–2" som ett spann. */
export declare function veckorI(text: unknown): { fran: number; till: number } | null;
export declare function metodplan(d: { tid?: string; period?: string; progression?: { enhet?: string; rader: { vecka: string; taggar?: string[] }[] }; uppfoljning?: { rader: { nar: string; tid?: string }[] }; plan?: { passen?: { nar: string }[] } }): { fel: string[]; plan?: Metodplan };
export declare function planFel(d: Parameters<typeof metodplan>[0]): string[];
/** Metodens fil utan planens fält (`plan`, uppföljningens `tid`, progressionens `taggar` och `rubrik`), som bara planens sida läser. */
export declare function utanPlanensFalt<T extends Record<string, any>>(d: T): T;
export declare function forval(mp: Metodplan, idag: string): Val;
/** Planens längd som förval: så många veckor att gruppen når progressionens sista steg, när det ryms i perioden. */
export declare function forvaldLangd(mp: Metodplan, borja?: number): number;
/** Planens första måndag: startveckan, eller nästa vecka när ingen vald dag är kvar i den. */
export declare function forstaMandagen(val: Val): string;
/** Planera insatsens modul: namnet, versionen och om den är en beta (sajtens METODER.md under Planera insatsen). */
export declare const PLANERA: Readonly<{ namn: string; version: string; beta: boolean }>;
export declare function planera(mp: Metodplan, val: Val): Plan;
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
export declare const kalenderveckor: (a: number, b: number, streck?: string) => string;
export declare const gangen: (plan: { veckor: { nr: number; innehall: number }[] }, v: { nr: number; innehall: number; igen: boolean }) => number;
export declare const metodveckan: (innehall: number) => string;
export declare const planveckan: (innehall: number, gang?: number) => string;
export declare const planveckanKort: (innehall: number, gang?: number) => { tal: string; om: string };
export type Veckonamn = { plan: string; kort: string; kalender: string; text: string; Text: string };
export declare const veckansNamn: (v: { innehall: number; gang?: number; vecka: number }) => Veckonamn;
export declare const planveckansNamn: (plan: Plan, v: PlanVecka) => Veckonamn;
/** Raderna i planens passen som gäller passet, den mest bestämda först. */
export declare function passetsRoller(plan: Plan, p: Pass, passen: Metodplan['passen']): number[];
/** Progressionens steg som planen inte når. */
export declare function stegUtanfor(mp: Metodplan, plan: Plan): { rad: number; fran: number; vidBehov: boolean }[];
export declare function veckanFor(plan: Plan, datum: string): PlanVecka | null;
export declare function nastaPass(plan: Plan, datum: string): Pass | null;
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
export declare function veckansDagar(plan: { pass: Pass[] }, v: PlanVecka): { fran: string; till: string };
export declare function dokumentationstext(info: { titel: string; undertitel?: string; adress: string; mal?: string; steg?: string[]; uppfoljning: { nar: string }[]; nivaNamn?: string }, plan: Plan, val: Val, o: { minuter: number; genomforda?: number; folj?: boolean }): string;
/** Passens längd i minuter efter dagarnas klockslag, och passets längd för en dag utan klockslag; olika längder var för sig, i storleksordning. */
export declare function passensMinuter(val: Val, standard: number): number[];
/** "30", eller "30 eller 40". */
export declare const minuterText: (minuter: number[]) => string;
/** Ett mål som läraren har skrivit, rensat: en rad, högst 200 tecken. */
export declare const rentMal: (s: unknown) => string;
/** Målet som en mening med stor bokstav och punkt. */
export declare const malText: (mal?: string) => string;
/** En text där elevlistans namn och förnamn har blivit "en elev". */
export declare function utanNamn(text: string, elever: { namn: string }[]): string;
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
export declare function dagarText(val: Val): string;

/** Det läraren för in när hen följer insatsen, allt valfritt: passen som blev av (passens dagar), skattningen vecka för vecka (veckans måndag, sedan elevens id eller grupp), elevlistan, resultaten i metodens uppföljning och besluten mitt i och efter. */
export interface Foljd { gjorda?: string[]; elever?: { id: string; namn: string }[]; narvaro?: boolean; franvaro?: Record<string, string[]>; vecka?: Record<string, { varde?: number; not?: string }>; skattning?: Record<string, Record<string, number>>; resultat?: Record<string, Record<string, string>>; avstamning?: { beslut?: string; not?: string }; utvardering?: { beslut?: string; not?: string } }
export declare const passetsDag: (p: Pass) => string;
export declare const SKALAN: readonly string[];
export declare const skattningsfragan: (grupp?: boolean) => string;
export declare const GRUPPEN: 'grupp';
/** Det läraren har fört in, rensat till det sidan kan visa; det som inte går att läsa tas bort. */
export declare function rensaFoljd(f: unknown): Required<Pick<Foljd, 'gjorda' | 'elever' | 'franvaro' | 'vecka' | 'skattning' | 'resultat'>> & Pick<Foljd, 'narvaro' | 'avstamning' | 'utvardering'>;
export declare function mittVeckan(plan: Plan): number | null;
export interface SammanstallningVecka { nr: number; mandag: string; vecka: number; innehall: number; igen: boolean; pass: { nr: number; dag: string; datum: string; gjort: boolean }[]; gjorda: number; planerade: number; varit: number; installda: number; helgdagar: number; skattning?: number; not?: string }
export interface SammanstallningElev { id: string; namn: string; skattningar: { nr: number; vecka: number; varde: number }[]; forsta: { nr: number; vecka: number; varde: number } | null; senaste: { nr: number; vecka: number; varde: number } | null; narvaro: number | null; resultat: Record<string, string> }
export interface Sammanstallning { veckor: SammanstallningVecka[]; elever: SammanstallningElev[]; grupp: boolean; narvaro: boolean; planerade: number; gjorda: number; veckomedel: number | null; varit: number; gjordaVarit: number; installda: number; helgdagar: number; slut: boolean; mitt: number | null; avstamning: { beslut?: string; not?: string } | null; utvardering: { beslut?: string; not?: string } | null }
export declare function sammanstallning(plan: Plan, f: Foljd, idag: string): Sammanstallning;
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
/** Uppföljningens rader med datum. */
export declare const uppfoljningensRader: (plan: Plan, info: { uppfoljning: { nar: string }[] }) => string[];
/** Veckorna där läraren har skattat hur veckan gick. */
export declare const skattadeVeckor: <T extends { skattning?: number }>(s: { veckor: T[] }) => T[];
/** Vad skattningen är, i en text. */
export declare const skattningenText: (vem: string, varjeVecka?: boolean) => string;
/** Besluten att välja mellan, mitt i insatsen och efter den. */
export declare const BESLUTEN: Readonly<{ avstamning: readonly ('fortsatt' | 'justera')[]; utvardering: readonly ('avsluta' | 'forlang' | 'byt')[] }>;
/** Beslutet och lärarens mening, med punkt. */
export declare const beslutText: (b: { beslut?: string; not?: string }) => string;
/** Passen som läraren har bockat, i en mening. */
export declare function passensLage(s: { planerade: number; gjorda: number; varit: number; gjordaVarit: number; slut: boolean }): string;
/** Elevens närvaro i en mening. */
export declare const narvaronText: (e: { narvaro: number | null }, s: { gjorda: number }) => string;
/** Ett resultat i metodens uppföljning: "Före insatsen, v. 45: 4 av 8". */
export declare const resultatText: (info: { uppfoljning: { nar: string }[] }, t: { rad: number; datum: string; varde: string }) => string;
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
export declare const forstaLedet: (s: string) => string;
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
export declare const talIRegex: (fran: number, till: number) => string;
