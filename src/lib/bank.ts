// Banken: texter eller problem i nivåer som står på egna sidor (Niclas 2026-10-10 om Problemlösning i grupp: trettio
// problem i tre nivåer med tre sidor var, "Känns konstigt om allt bara ska ligga scrollandes på mobilen i evigheter", och
// "skapa en struktur för hur problemen hittas, visas och listas så det inte blir svåröverskådligt eller evigt scrollande i
// onödan", med möjlighet "att bara skriva ut problem utan allt annat och bara problem samt med tillhörande lärarens sida
// och kontrastpar"). Textsamtal i grupp har samma form med femtio texter (K-163: utskriften av hela beskrivningen var 201
// sidor).
//
// Banken känns igen på ramarnas rubriker, utan nya fält, med samma regler som materialets lista (ramindex.ts):
//   en enhet är en lästext eller en faktatext, "<nivå>, <vad>: <titel>" (enhetstexter i ramform.ts), som "Bas, problem 1:
//   Äpplena" och "Bas, text 1: Vattenplaneten";
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
// andra metoder, och utskriften Metoden har dem inte (METODER.md under Utskriften). Bara skärmen är kortare: där står
// enheterna på sina egna sidor.
//
// I en bank av faktatexter (Faktatextsamtal i grupp) är filerna delade på ett annat sätt (Niclas 2026-10-13: "faktatexter
// är en kolumn och lärarhandledning den andra och med Allt, Bas, Medel och Avancerat"): texterna för sig och lärarens sidor
// för sig, utan en fil med båda. En faktatext är flera sidor och kopieras en per elev, och lärarens sida skrivs ut en
// gång, så en fil med båda skulle få läraren att plocka sidor vid kopiatorn (sidorForSig nedan).
//
// Postens följesida (Niclas 2026-10-18 om Ta fram ett matteproblem: "Tänkte mer att det är problemets A4a och dess
// lösningsförslag"): den följesida som hör till enheten när den tas fram ur databasen (src/lib/tafram.ts), problemets
// lösningsförslag eller, i en bank utan lösningsförslag, textens lärarsida. Banken får en fil per nivå med enheterna och
// den följesidan, som Ta fram skriver ut, när enheterna har fler följesidor än den; annars är filen med följesidorna
// redan den. Är följesidan Lärarens sida får den ingen egen fil, eftersom filen med alla följesidor heter efter den
// (-med-lararens-sida), och Ta fram skriver då ut enheten med alla sina följesidor. En ram vars rubrik är lösningsförslagens namn i bestämd form plural och en rubrik, som "Lösningsförslagen:
// Visa och jämför lösningar" (metodriggens TILL-SAJTEN 2026-10-18), är en ruta som ritas på varje lösningsförslag och
// aldrig för sig (src/lib/problemform.ts): den hör till banken, så att den varken står bland ramarna eller i materialets
// lista.
//
// Temats lärarhandledning (src/lib/handledning.ts, Faktatextsamtal i grupp): ramen "Lärarhandledning: <nivå>, <tema>" hör
// till banken och står före temats första text, i filerna med följesidorna eller bara följesidorna och i filen med allt,
// som hos metodriggen ("Varje tema börjar med en lärarhandledning"). Den gemensamma sidan, "Lärarhandledningarna:
// <rubrik>", ritas på varje handledning och aldrig för sig, som rutan på lösningsförslagen. Ingen av dem står bland
// ramarna eller i materialets lista, och temats sida ([id]/texter/[tema].astro) visar handledningen.
//
// Lästexternas lärarhandledning (src/lib/handledning.ts, Textsamtal i grupp): ramen "Lärarhandledningen: <titel>" hör
// till banken och står först i filen med alla nivåer och följesidorna, och därmed i filen med allt, före den första
// nivån, som hos metodriggen. Den har en egen fil och en egen sida ([id]/texter/lararhandledning.astro).
//
// Inga Node-beroenden: Word-filen av flera metoder byggs i webbläsaren med samma regel.
import { enhetstexter, type Enhetstext } from './ramform';
import { arBokhandledning, arHandledningarna, HANDLEDNING } from './handledning';
import { slugAv, UPPTAGNA_LED } from './standard/index.js';

// tema: faktatextens tema (src/lib/handledning.ts), som metodens schema har på ramen.
type Ram = Parameters<typeof enhetstexter>[0][number] & { tema?: string };
// databas: satt på metoden med databasens teman (src/lib/faktatemaihop.js, medTemana).
type Metod = { ramar?: { ramar: Ram[]; databas?: string } };

/** Färre enheter än så står kvar på metodens sida, som förut. */
export const BANK_MINST = 10;

/** Enhetens ord ur vad ("problem 1", "text 1"): ett problem, problemet, problem, problemen, och artikeln. Ett nytt ord
 *  läggs till här. */
const ORD: Record<string, { en: string; bestamd: string; flera: string; alla: string; artikel: 'en' | 'ett' }> = {
  problem: { en: 'problem', bestamd: 'problemet', flera: 'problem', alla: 'problemen', artikel: 'ett' },
  text: { en: 'text', bestamd: 'texten', flera: 'texter', alla: 'texterna', artikel: 'en' },
};

export interface Bankenhet {
  /** Textens plats bland ramarna. */
  ri: number;
  /** Nivån, vad och titeln ur ramens namn, och texten själv: en lästext (boksida, problem) eller en faktatext. */
  l: Enhetstext;
  /** Numret ur vad ("problem 4" ger 4), annars inget (kartläggning före). */
  nr?: number;
  /** Sidans namn i adressen: nivån och numret, "bas-4", eller nivån och vad, "lattlast-kartlaggning-fore". */
  slug: string;
  /** Följesidorna i filens ordning, före och efter enheten: Textsamtal har lärarsidorna samlade före texterna. */
  fore: number[];
  efter: number[];
  /** Postens följesida, problemets lösningsförslag, bland följesidorna (POSTENS_FOLJESIDOR). */
  post?: number;
  /** Temats lärarhandledning, som står före enheten: den första texten i ett tema med handledning. */
  handledning?: number;
  /** Temat, ur ramens fält tema eller faktatextens etikett ("Vatten · text 1 av 5"). */
  tema?: string;
}
export interface Bankniva { namn: string; nivaNr: number; slug: string; oversikt?: number; enheter: Bankenhet[] }
// Följesidorna som kan höra till enheten i databasen, i den ordning de väljs, med namnet i bestämd form plural och i en
// mening: "Lösningsförslag", "Lösningsförslagen", "lösningsförslaget". harRuta: en ram med det pluralt bestämda namnet är
// en ruta som ritas på varje sådan sida. En ny läggs till här.
const POSTENS_FOLJESIDOR: Record<string, { alla: string; bestamd: string; harRuta?: boolean }> = {
  'Lösningsförslag': { alla: 'Lösningsförslagen', bestamd: 'lösningsförslaget', harRuta: true },
  'Lärarens sida': { alla: 'Lärarens sidor', bestamd: 'lärarens sida' },
};
export interface Bank {
  ord: { en: string; bestamd: string; flera: string; alla: string; artikel: 'en' | 'ett'; slug: string };
  /** Följesidornas namn i den ordning de först kommer: Lärarens sida, Två lösningar, Lösningsförslag. */
  foljesidor: string[];
  /** Postens följesida (POSTENS_FOLJESIDOR) när varje enhet har den: namnet, som Lösningsförslag, i bestämd form plural
   * och i en mening, och rutan som ritas på varje sådan sida. */
  post?: { namn: string; alla: string; bestamd: string; slug: string; ruta?: number };
  /** Följesidorna står i egna filer, och ingen fil har enheterna med följesidorna: en bank där varje enhet är en faktatext. */
  sidorForSig: boolean;
  /** Lästexternas lärarhandledning, ramen "Lärarhandledningen: <titel>", när banken har en. */
  handledning?: number;
  nivaer: Bankniva[];
  enheter: Bankenhet[];
  /** Ramarna som står på enheternas sidor och på metodens sida bara i utskriften: enheterna och följesidorna, rutan som
   * ritas på postens följesidor, och temanas lärarhandledningar med deras gemensamma sida. */
  ramar: Set<number>;
  /** Nivåernas översikter, som står på metodens sida i bankens nivåer. */
  oversikter: Set<number>;
  /** Databasens namn, när banken har databasens teman (src/lib/faktateman.ts): då är filerna databasens egna, en per nivå
   *  med namnet först (faktatexter-bas), och metodens egna filer står kvar med metodens poster (bankfiler nedan). */
  databas?: string;
}

// Adressens led och de reserverade leden kommer ur standarden (src/lib/standard/), som alla adresser ur namn använder.
export { slugAv };
// Adressens sista led får inte krocka med metodens andra sidor under /stodundervisning/<id>/.
const UPPTAGNA = new Set(UPPTAGNA_LED);

/** Är ramen bankens egen eller en av dess översikter? En rot för allt som hoppar över bankens ramar (K-509). */
export const iBanken = (bank: Bank | null | undefined, ri: number): bank is Bank => !!bank && (bank.ramar.has(ri) || bank.oversikter.has(ri));

export function bankAv(d: Metod): Bank | null {
  const ramar = d.ramar?.ramar ?? [];
  const texter = enhetstexter(ramar);
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
    const tema = ram.tema ?? (l.faktatext?.etikett.includes(' · ') ? l.faktatext.etikett.split(' · ')[0] : undefined);
    const e: Bankenhet = { ri, l, nr: m ? Number(m[2]) : undefined, slug: `${slugAv(l.niva)}-${m ? m[2] : slugAv(l.vad)}`, fore: [], efter: [], ...(tema ? { tema } : {}) };
    nivaer.get(l.niva)!.enheter.push(e);
    enheter.push(e);
    nycklar.set(`${l.niva}, ${l.vad}, ${l.titel}`, e);
  });
  const foljesidor: string[] = [];
  const bankramar = new Set(enheter.map((e) => e.ri));
  const oversikter = new Set<number>();
  const rutor = new Map<string, number>();
  const handledningar: number[] = [];
  let allman: number | undefined;
  ramar.forEach((ram, ri) => {
    if (bankramar.has(ri)) return;
    if (arHandledningarna(ram)) { handledningar.push(ri); return; }
    if (arBokhandledning(ram)) { allman = ri; handledningar.push(ri); return; }
    const hl = ram.rubrik.match(HANDLEDNING);
    if (hl) {
      const tema = ram.tema ?? hl[2];
      const forst = enheter.find((e) => e.l.niva === hl[1] && e.tema === tema);
      if (!forst) throw new Error(`Banken: ${ram.rubrik} hör till temat ${tema} på nivån ${hl[1]}, men ingen text på nivån har det temat (src/lib/bank.ts).`);
      forst.handledning = ri;
      handledningar.push(ri);
      return;
    }
    const sidor = ram.rubrik.match(/^Lärarens sidor: (.+)$/);
    if (sidor && nivaer.has(sidor[1]) && nivaer.get(sidor[1])!.oversikt === undefined) { nivaer.get(sidor[1])!.oversikt = ri; oversikter.add(ri); return; }
    const m = ram.rubrik.match(/^([^:]+): (.+)$/);
    const ruta = m && Object.entries(POSTENS_FOLJESIDOR).find(([, x]) => x.harRuta && x.alla === m[1]);
    if (ruta && !rutor.has(ruta[0])) { rutor.set(ruta[0], ri); return; }
    const e = m && nycklar.get(m[2]);
    if (!e) return;
    (ri < e.ri ? e.fore : e.efter).push(ri);
    if (!foljesidor.includes(m[1])) foljesidor.push(m[1]);
    bankramar.add(ri);
  });
  if (!foljesidor.length) return null;
  // Postens följesida är den första i POSTENS_FOLJESIDOR som varje enhet har; har ingen enhet den skrivs enheten ut ensam
  // ur databasen.
  const sidaAv = (e: Bankenhet, n: string) => [...e.fore, ...e.efter].find((ri) => ramar[ri].rubrik.startsWith(`${n}: `));
  const postNamn = Object.keys(POSTENS_FOLJESIDOR).find((n) => foljesidor.includes(n) && enheter.every((e) => sidaAv(e, n) !== undefined));
  if (postNamn) for (const e of enheter) e.post = sidaAv(e, postNamn);
  const post = postNamn ? { namn: postNamn, alla: POSTENS_FOLJESIDOR[postNamn].alla, bestamd: POSTENS_FOLJESIDOR[postNamn].bestamd, slug: slugAv(postNamn), ...(rutor.has(postNamn) ? { ruta: rutor.get(postNamn) } : {}) } : undefined;
  for (const ri of [...rutor.values(), ...handledningar]) bankramar.add(ri);
  const ord = ORD[ordet ?? ''];
  if (!ord) throw new Error(`Banken: enheterna heter "${ordet ?? enheter[0].l.vad}", som src/lib/bank.ts inte har ord för. Lägg till ordet i ORD (ett problem, problemet, problem, problemen).`);
  const slugar = new Set<string>();
  for (const e of enheter) {
    if (UPPTAGNA.has(e.slug) || slugar.has(e.slug)) throw new Error(`Banken: två enheter, eller en enhet och en annan sida, får adressen ${e.slug} (${ramar[e.ri].rubrik}). Ge nivån eller numret ett annat namn.`);
    slugar.add(e.slug);
  }
  return { ord: { ...ord, slug: slugAv(ord.flera) }, foljesidor, ...(post ? { post } : {}), sidorForSig: enheter.every((e) => !!e.l.faktatext), ...(allman !== undefined ? { handledning: allman } : {}), nivaer: [...nivaer.values()], enheter, ramar: bankramar, oversikter, ...(d.ramar?.databas ? { databas: d.ramar.databas } : {}) };
}

/** Enhetens sida. */
export const enhetAdress = (id: string, e: Bankenhet) => `/stodundervisning/${id}/${e.slug}`;
/** Enhetens namn i en mening eller länk: "Bas, problem 1: Äpplena". */
export const enhetNamn = (e: Bankenhet) => `${e.l.niva}, ${e.l.vad}: ${e.l.titel}`;

/** Följesidornas namn i en rad: "lärarens sida, Två lösningar och lösningsförslaget". Lärarens sida och lösningsförslaget
 * är vanliga ord, de andra namn på blad. */
export const foljeText = (b: Bank) => {
  const ord = b.foljesidor.map((n) => (/^Lärarens sida$/i.test(n) || n in BLADSIDOR ? n.toLowerCase() : POSTENS_FOLJESIDOR[n]?.bestamd ?? n));
  return ord.length > 1 ? `${ord.slice(0, -1).join(', ')} och ${ord[ord.length - 1]}` : ord[0];
};

// Följesidornas namn i flertal, som filen med bara följesidorna heter efter. Ett nytt namn läggs till här.
const FOLJE_FLERA: Record<string, string> = { 'Lärarens sida': 'Lärarens sidor', 'Lösningsförslag': 'Lösningsförslag', Modellen: 'Modellerna' };
// Följesidor som är sitt blad (K-434, Faktatextsamtal i grupp: textens modell, ifylld, metodriggens leverans 2026-10-18
// natt): ramen "Modellen: <nivå>, text <n>, <titel>" ritas bara som bladet efter den, på en liggande sida, som hos
// riggen, och ramens text och delar (frågan och ett svar ur lärarens sida) är till den som läser metodens fil. Ett nytt
// namn läggs till här.
// Namnet är följesidans på enhetens sida, i dess meny och i knapparna, så att den inte heter som bladet ur ramen med blad
// som står på samma sida (metodriggens läsning av sidorna 2026-10-18 natt: två avsnitt hette Modellen).
const BLADSIDOR: Record<string, string> = { Modellen: 'Den ifyllda modellen' };
/** En följesida som är sitt blad. */
export const arBladsida = (ram: { rubrik: string }) => { const m = ram.rubrik.match(/^([^:]+): [^,]+, [^,]+ \d+, ./); return !!m && m[1] in BLADSIDOR; };
/** Följesidans namn på enhetens sida, i dess meny och i knapparna: namnet före kolon, och för en följesida som är sitt
 *  blad namnet i BLADSIDOR ("Den ifyllda modellen"). */
export const foljesidansNamn = (ram: { rubrik: string }) => { const n = ram.rubrik.split(':')[0]; return arBladsida(ram) ? BLADSIDOR[n] : n; };
/** Följesidorna i flertal, som kolumnen och filen heter: "Lärarens sidor". */
export const foljeFlera = (b: Bank) => {
  const ord = b.foljesidor.map((n) => { const f = FOLJE_FLERA[n]; if (!f) throw new Error(`Banken: följesidan "${n}" har inget namn i flertal i src/lib/bank.ts. Lägg till det i FOLJE_FLERA (Lärarens sida: Lärarens sidor).`); return f; });
  return ord.length > 1 ? `${ord.slice(0, -1).join(', ')} och ${ord[ord.length - 1].toLowerCase()}` : ord[0];
};
/** En fil ur banken: en nivå eller alla, med bara enheterna (false), med följesidorna (true) eller med bara följesidorna
 * ('bara', i en bank där följesidorna står för sig). Filen med följesidorna har lösningsförslagen i sig (Bankfiler.astro).
 * Ta fram ett matteproblem har egna filer med problemen och lösningsförslagen (src/lib/matteproblem.ts).
 * En bank med databasens teman (b.databas) har databasens egna filer, en per nivå och utan en för alla nivåer, som Ta fram
 * och temanas och textens sidor skriver ut ur: faktatexter-bas med texterna och faktatexter-bas-<följesidorna> (METODER.md
 * under Ta fram ur en bank, raden Databasens faktatexter). Metodens sida och dess filer har metodens egna, med metodens
 * poster, så att metodens filer inte växer med databasen. */
export interface Bankfil { namn: string; niva?: Bankniva; medFoljesidor: boolean | 'bara'; rubrik: string }
export function bankfiler(id: string, b: Bank): Bankfil[] {
  const ut: Bankfil[] = [];
  if (b.databas) {
    const sidor = b.sidorForSig ? foljeFlera(b) : `med ${foljeText(b)}`;
    for (const niva of b.nivaer) {
      ut.push({ namn: `${b.databas}-${niva.slug}`, niva, medFoljesidor: false, rubrik: `${niva.namn}: ${b.ord.alla}` });
      ut.push({ namn: `${b.databas}-${niva.slug}-${slugAv(sidor)}`, niva, medFoljesidor: b.sidorForSig ? 'bara' : true, rubrik: `${niva.namn}: ${b.sidorForSig ? sidor.toLowerCase() : `${b.ord.alla} ${sidor}`}` });
    }
    return ut;
  }
  if (b.sidorForSig) {
    const sidor = foljeFlera(b);
    for (const niva of [undefined, ...b.nivaer]) {
      const var_ = niva ? niva.slug : 'alla';
      ut.push({ namn: `${id}-${b.ord.slug}-${var_}`, niva, medFoljesidor: false, rubrik: `${niva ? niva.namn : 'Alla nivåer'}: ${b.ord.alla}` });
      ut.push({ namn: `${id}-${slugAv(sidor)}-${var_}`, niva, medFoljesidor: 'bara', rubrik: `${niva ? niva.namn : 'Alla nivåer'}: ${sidor.toLowerCase()}` });
    }
    return ut;
  }
  // Ordningen är den som en enhets blad hämtas ur (src/lib/utskrift.ts): problemet ur filen med bara problemen och
  // följesidorna ur filen med alla.
  for (const niva of [undefined, ...b.nivaer]) {
    for (const medFoljesidor of [false, true]) {
      const namn = `${id}-${b.ord.slug}-${niva ? niva.slug : 'alla'}${medFoljesidor ? '-med-lararens-sida' : ''}`;
      const vad = medFoljesidor ? `${b.ord.alla} med ${foljeText(b)}` : `bara ${b.ord.alla}`;
      ut.push({ namn, niva, medFoljesidor, rubrik: `${niva ? niva.namn : 'Alla nivåer'}: ${vad}` });
    }
  }
  return ut;
}

/** Ramarna i en fil ur banken, i ordning: per nivå översikten och sedan enhet för enhet med följesidorna runt, bara
 * följesidorna, eller enheten och postens följesida. Ett temas lärarhandledning står före temats första enhet i filerna
 * med följesidorna, och lästexternas lärarhandledning först i filen med alla nivåer och följesidorna. */
export function bankfilensRamar(b: Bank, f: Pick<Bankfil, 'niva' | 'medFoljesidor'>): number[] {
  const larare = f.medFoljesidor === true || f.medFoljesidor === 'bara';
  return [...(larare && !f.niva && b.handledning !== undefined ? [b.handledning] : []), ...(f.niva ? [f.niva] : b.nivaer).flatMap((n) => [
    ...(larare && n.oversikt !== undefined ? [n.oversikt] : []),
    ...n.enheter.flatMap((e) => [
      ...(larare && e.handledning !== undefined ? [e.handledning] : []),
      ...(f.medFoljesidor === 'bara' ? [...e.fore, ...e.efter] : f.medFoljesidor ? [...e.fore, e.ri, ...e.efter] : [e.ri]),
    ]),
  ])];
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
  if (b.sidorForSig) return `${alla} och ${foljeFlera(b).toLowerCase()} finns också i egna filer, en för varje nivå och en för alla nivåer: ${b.ord.alla} för sig och ${foljeFlera(b).toLowerCase()} för sig. Filerna finns på ${adress}, och varje ${b.ord.en} har en egen sida där.`;
  return `${alla} finns också i egna filer, en för varje nivå och en för alla nivåer: bara ${b.ord.alla}, eller ${b.ord.alla} med ${foljeText(b)}. Filerna finns på ${adress}, och varje ${b.ord.en} har en egen sida där.`;
};

/** Förra och nästa enhet på samma nivå, och i en bank med teman i samma tema (designgranskningen 2026-10-18 natt: med ett
 *  andra tema på en nivå gick förra och nästa över temats gräns). */
export function grannar(b: Bank, e: Bankenhet): { forra?: Bankenhet; nasta?: Bankenhet; niva: Bankniva; plats: number } {
  const niva = b.nivaer.find((n) => n.enheter.includes(e))!;
  const rad = e.tema ? niva.enheter.filter((x) => x.tema === e.tema) : niva.enheter;
  const i = rad.indexOf(e);
  return { forra: rad[i - 1], nasta: rad[i + 1], niva, plats: i + 1 };
}

/** Enhetens nummer och hur många de är: i temat när enheten har ett, som Ta fram en faktatext räknar (temaNr i
 *  src/lib/tafram.ts) och texten själv säger ("Vatten · text 1 av 5"), annars på nivån. */
export function enhetensPlats(b: Bank, e: Bankenhet): { nr?: number; antal: number } {
  const niva = b.nivaer.find((n) => n.enheter.includes(e))!;
  const numrerade = niva.enheter.filter((x) => x.nr !== undefined && (!e.tema || x.tema === e.tema));
  return { nr: e.nr === undefined ? undefined : e.tema ? numrerade.indexOf(e) + 1 : e.nr, antal: numrerade.length };
}

/** Boksidornas nivåfärger, i den ordning nivåerna först kommer (grön, ockra, plommon), som Metod.astro och Word. */
export const BOKNIVA = ['#4e7a43', '#a8742a', '#6e3450'];
/** Nivåernas färger: metodens egna (nivaer) eller boksidornas. */
export const nivaFarger = (d: { nivaer?: { namn: string; farg: string }[] }, b: Bank): Record<string, string> =>
  Object.fromEntries(b.nivaer.map((n) => { const egen = d.nivaer?.find((x) => x.namn === n.namn)?.farg; return [n.namn, egen ? `#${egen.toLowerCase()}` : BOKNIVA[n.nivaNr] ?? '#4b3a2f']; }));
