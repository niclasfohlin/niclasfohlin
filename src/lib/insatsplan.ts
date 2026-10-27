// Planera insatsen (K-489; Niclas 2026-10-24: "Planera insatsen gillar jag", och "bygg EN som du testar på flera olika
// sätt att den funkar. dvs en standard"): det metodens plansida, /stodundervisning/<id>/planera, behöver ur metodens fil
// vid bygget. Planen räknas fram i webbläsaren av standardens planmotor (src/lib/standard/plan.js) ur samma fält, så att
// sidan, riggen och provet räknar lika. Hur fälten skrivs står i METODER.md under Planera insatsen.
import type { CollectionEntry } from 'astro:content';
import { arDelensTid, faltetIVersionen, veckansPassFalt, veckansPassRam, skyddaRegex, stor, faltetsDelar, faltetsSkillnader, iVersionen, iVersionensKolumner, passetsDelnamn, forstaLedet, mening, meningarna, gruppensElever, kortnamn, lektionsvaletsFel, metodensSkattningar, metodplan, minuterISpann, nivavaletsFel, olankadeSaker, planensInledning, planensTexter, planFel, postensRad, radensVeckor, rollensRad, rollensVeckor, sakdelar, sakspann, slugAv, tabellensDelar, VECKANS_RAD, visadeTexter } from './standard/index.js';
import { bankAv, nivaFarger } from './bank';
import { lektionsnamn } from './serie';
import { harTaFram, taFramAv } from './tafram';
import { formateraDatum } from './innehall';
import { harLathund } from './metod';
import { kursensVeckor, metodensSaker, sidansAnkare, sidansAvsnitt, versionensDelar, versionernasNamn, type MetodSak } from './metodsaker';
import { passOversikt } from './metod';
import { forstaLed } from './karta';
import { CENTRALA, lasbarAdress } from './centrala';
import { publicerade } from './innehall';
import { site } from '../data/site';
import type { Skattning } from './standard/index.js';
import { arBlad, bladNamn, metodensPaBordet } from './pabordet';
import { egnaBlad } from './bladmaterial';

type Metod = CollectionEntry<'stodundervisning'>;

// Kan metoden planeras? Regeln står i src/lib/planbar.ts.
import { planbar } from './planbar';
export { planbar };

/** Planens adress under metoden. */
export const planensAdress = (id: string) => `/stodundervisning/${id}/planera`;

/**
 * Insatsens mål, som läraren skattar eleverna mot varje vecka och kan skriva om med pennan (Niclas 2026-10-24: "Den kan få
 * en färdig, vi har ju dessa i lektionskorten väl? Men ska kunna trycka och redigera det målet"): metodens övergripande
 * mål, mal.overgripande, som lektionskortet också säger (K-522).
 */
export const planensMal = (m: Metod): string => m.data.mal.overgripande;

export interface PlanBank {
  /** Ta fram-sidans led och adress. */
  led: string;
  adress: string;
  /** Verktygets namn, som Ta fram en lästext. */
  namn: string;
  /** Postens namn: text, problem. */
  en: string;
  flera: string;
  /** Nivåns poster, med postens sida i metoden när posten är metodens egen (databasens poster har ingen). */
  nivaer: { namn: string; slug: string; farg: string; poster: { id: string; nr: number; titel: string; taggar: string[]; sida?: string }[] }[];
  /** Taggarnas namn efter adressens form: fore-och-efter → Före och efter. */
  taggar: Record<string, string>;
  /** Metodens poster på nivån tas i tur och ordning, en per pass (plan.enPerPass), och passet visar sin. */
  enPerPass?: true;
}

/** Det plansidan visar och räknar med, som JSON i sidan. */
/** Ett pass i delar ur metodens tabell eller veckans sida, med adressen dit och, på veckans sida, sida satt. */
export type PassTabell = NonNullable<NonNullable<PlanData['passen']>[number]['tabell']>;
export interface PlanData {
  id: string;
  titel: string;
  omrade: string;
  undertitel?: string;
  /** Metodens adress i texten till dokumentationen, utan https. */
  adress: string;
  sida: string;
  uppdaterad?: string;
  uppdateradText?: string;
  /** Insatsens mål (planensMal), som läraren kan skriva om. */
  mal: string;
  tid?: string;
  period?: string;
  /** Progressionens rader, med vad eleverna blir bättre på och regeln för att gå vidare (K-572), som veckan visar. */
  progression?: { enhet: string; rubrik: string; rader: { vecka: string; led?: string; fokus: string; roll: string; eleverna?: string; vidare?: string; taggar?: string[]; rubrik?: string; kort: string }[] };
  /** Uppföljningens rader; en rad med tabell har passets delar, som passet när gruppen samlas efter kursen (K-553). */
  uppfoljning: { rader: { nar: string; vad: string; tid?: string; perElev?: number | [number, number]; tabell?: string; passet?: PassTabell; resultat?: string }[] };
  checklista: string[];
  /** Checklistans rubrik, och om den gäller första passet ("Före första passet", "Checklista inför pass 1"), så att den bara
   * står före första passet och inte i varje vecka (de kalla testarna 2026-10-24). */
  checklistaRubrik?: string;
  forstaChecklista: boolean;
  bank?: PlanBank;
  harLathund: boolean;
  /** Det metoden namnger i planens texter, med adresserna (src/lib/metodsaker.ts): bara de saker som texterna nämner. */
  saker: MetodSak[];
  /** Veckans lektion i metoden för varje vecka i en kurs med veckor (De fyra räknesätten), som veckan i planen leder till. */
  kursveckor?: Record<string, string>;
  /** Passens delar ur veckornas sidor (plan.veckansPass, K-553), efter kursens passnummer, som fältet "Pass N". */
  veckansPass?: Record<string, PassTabell>;
  /** Metodens vecka för kursens pass N, ur fälten Pass N på veckornas sidor (K-585). */
  passensVeckor?: Record<string, number>;
  /** Versionens extra pass före pass 1 (plan.versionsval, extraPass; K-576): namnet, delarna ur passets text, och raden i fore som säger vad som görs. */
  extraPass?: { rubrik?: string; delar?: { tid: string; fas: string; vad: string }[]; fore?: string };
  /** Passet ur metodens tidsschema (betan 2026-10-24: ingen av de kalla testarna kunde hålla första passet bara efter planen):
   * delarna med tid och vad läraren gör, förberedelsen (raden Före passet), andra rader som Hemma, och det läraren gör efter
   * passet (passrutinens efterPasset), med adresserna till passet och stegen på metodens sida. */
  passet?: PlanPasset;
  /** Vad som skiljer passen åt (plan.passen): rollens citat ur metoden och raden ur metodens tabell som den hämtar sin text
   * ur (K-520), och adressen till metodens tabell för ett pass som går till på ett eget sätt med tabellens delar, när den
   * har en rad per del med tiden under delens namn (Seriesamtals pass 1). */
  passen?: { nar: string; text?: string; rad?: { kolumn: string; text: string }[]; veckor?: Record<string, { kolumn: string; text: string }[]>; kort?: string; utanTidsschema?: boolean; del?: string; istallet?: boolean; tabell?: { namn: string; adress: string; sida?: boolean; efter?: string; slag?: string; skillnad?: { texter: string[]; iDelar: { del: string; text: string }[]; ovrigt: { etikett: string; text: string }[] }; delar?: { tid: string; fas: string; vad: string; mer?: { etikett: string; text: string }[] }[]; fore?: { namn: string; nar: string; vad: string; mer?: { etikett: string; text: string }[] }[] } }[];
  /** Metodens rutor överst, som planen visar eller leder till: principerna, gruppen och Hem och skola. */
  principer?: { rubrik: string; text: string; adress: string };
  gruppen?: { rubrik: string; text: string; adress: string };
  /** Faktarutans grupp, "En till fyra elever", med talen när de går att läsa. */
  grupp?: { text: string; min?: number; max?: number };
  hem?: { rubrik: string; text: string; adress: string };
  /** Metodens avsnitt om när eleven fastnar, och de andra stöden i stunden, som Om något händer i Seriesamtal. */
  fastnar?: { rubrik: string; adress: string }[];
  /** Metodens material, med rubriken som i metoden, som Böckerna och materialet, och i en lektion materialets första stycke. */
  material?: { rubrik: string; adress: string; text?: string };
  /** Metodens verktyg och stödmaterial (fältet centrala), utom banken som planen redan har. */
  centrala?: { namn: string; adress: string; pdf: boolean }[];
  /** Metodens mål på sidan, som planen leder till vid insatsens mål. */
  malAdress?: string;
  /** Det som görs före första passet utöver uppföljningen och checklistan (plan.fore). */
  fore?: string[];
  justera?: string[];
  /** Metodens regel för beslutet efter insatsen (plan.utvardering), vid utvärderingen. */
  utvardering?: string[];
  /** Planen har ingen knapp Upprepa veckan (plan.utanUpprepa, K-586). */
  utanUpprepa?: true;
  /** Uppföljningens rad som beslutet efter insatsen väntar på (plan.utvarderasEfter), som radens nummer. */
  utvarderasEfter?: number;
  upprepa?: string;
  /** Progressionen är en stege som gruppen kan börja högre upp på (plan.stege). */
  stege?: boolean;
  /** Metodens egna nivåer när metoden inte har en bank (en kurs i nivåer, som De fyra räknesätten). */
  nivaer?: { namn: string; slug: string; farg: string }[];
  /** En tabell med en rad för varje vecka och en kolumn för varje nivå, som Talen och bladen i veckorna: veckans cell för
   * nivån står i planens vecka. */
  nivaTabell?: { rubrik: string; adress: string; veckor: Record<string, Record<string, string>>; not?: string };
  /** Stödet för nivåvalet (plan.nivaval, K-557): metodens text om nivåerna och tabellen eller avsnittet med mer, som planen
   * visar under en nerpil vid varje nivåval. */
  nivaval?: PlanStod;
  /** Stödet för passets längd (plan.langdval, K-564), när faktarutans tid är ett spann: under Passets längd. */
  langdval?: PlanStod;
  /** Stödet för antalet veckor (plan.veckoval), när längden beror på något metoden säger, som boken, med förvalet. */
  veckoval?: PlanStod & { forval?: number };
  /** Skolveckorna före första passet när det metoden gör före start tar mer än en vecka (plan.foreVeckor). */
  foreVeckor?: number;
  /** Progressionens sista rad tar planens sista vecka när perioden slutar före den (plan.sistaRaden, K-572). */
  sistaRaden?: true;
  /** Metodens egna skattningar (plan.skattningar, K-559): skalan med stegens namn och reglerna ur standarden, adressen till
   * instrumentet på metodens sida, och för det eleverna fyller i bladets pdf och adressen som kopierar formuläret. */
  skattningar?: PlanSkattning[];
  /** En serie med lektionsbank (K-551): lektionerna i bankens ordning, som veckan växlar till, och stödet för valet av
   * ingång med ingångarna (plan.lektionsval). */
  lektioner?: PlanLektion[];
  lektionsval?: PlanStod & { ingangar: { lektion: number; namn: string }[]; klar?: string };
  /** Planens val av version (plan.versionsval, K-576): stödet, och varje version med namn, slug, veckor och planens data i
   * den versionen, de fält som skiljer från den första, som sidan lägger över planens data när versionen väljs. */
  versionsval?: PlanStod & { rubrik: string; versioner: { namn: string; slug: string; veckor?: number; data: Partial<PlanData> }[]; kurser?: { id: string; namn: string; tranar?: string; adress: string }[] };
}

/** Ett stöd för ett val i planen (STIL.md under Stöd för ett val): metodens text och metodens rubrik med mer, med adressen. */
export interface PlanStod { text: string; mer: { namn: string; adress: string } }

/**
 * En lektion i en serie med lektionsbank, som seriens enda planerare visar de veckor läraren har valt den (K-551; Niclas
 * 2026-10-26: "Ljudlek får därmed bara EN planerare som är samma för alla och som kan väljas lektioner i"): passet, målet
 * som veckan skattas mot, vad eleverna blir bättre på och regeln för att gå vidare, ur lektionens egen fil.
 */
export interface PlanLektion {
  /** Förmågans nummer i banken, som lektionen har i länken och i ingångarna. */
  nr: number;
  id: string;
  /** Lektionens namn utan seriens, som Rim, och förmågans namn, som Bokstävernas ljud. */
  namn: string;
  formaga: string;
  sida: string;
  /** Vad eleven tränar, som banken säger det: planen skriver det som veckans Eleverna blir bättre på. */
  tranar?: string;
  /** Lektionens mål, som veckan skattas mot, och målets plats på lektionens sida. */
  mal: string;
  malAdress?: string;
  /** Regeln för att gå till nästa lektion (lektionens vidare), som fortsätter "Gå vidare till nästa lektion när". */
  vidare?: string;
  /** Lektionens period, som "Omkring två veckor, sex till tio pass", och dess veckor, som planen föreslår efter (K-578). */
  period?: string;
  veckor?: { min: number; max: number };
  passet?: PlanPasset;
  checklista: string[];
  checklistaRubrik?: string;
  principer?: { rubrik: string; text: string; adress: string };
  saker: MetodSak[];
  /** Lektionens rader i uppföljningen med samma När som seriens, som Var tredje vecka med ljudkollens uppgifter för lektionen
   * (Rimligheten 2026-10-27), och lektionens material med det första stycket, som säger vad som skrivs ut och lamineras. */
  uppfoljning: { nar: string; vad: string }[];
  material?: { rubrik: string; adress: string; text?: string };
  /** Lektionens rader, tabellen som lektionens upplägg nämner (Så blir lektionen svårare): uppläggets meningar från den som
   * nämner tabellen, tabellens not med raden gruppen börjar i, och raderna med sina kolumner (de kalla testarna 2026-10-27:
   * "Planen säger inte vilken rad gruppen börjar i, vilka ljud och vilket ark raden har"). */
  rader?: { rubrik: string; adress: string; text: string[]; rader: { namn: string; mer: { etikett: string; text: string }[] }[] };
}

export interface PlanSkattning extends Skattning {
  adress?: string;
  pdf?: string;
  formular?: string;
  /** Ramens delar med stegen, som Så leder du gruppreflektionen, när metoden säger hur det eleverna fyller i görs (ram). */
  delar?: { rubrik: string; falt: { rubrik: string; text: string }[] }[];
}

export interface PlanPasset {
  rubrik: string;
  /** Tidsschemats inledning som planen visar den, utan meningarna i plan.utan (planensInledning i standarden). */
  text?: string;
  delar: { tid: string; fas: string; vad: string; minuter?: number }[];
  /** Tidsschemats varianter: passet när delarna har andra tider, vissa veckor som Läslistors vecka 1–3 (K-515), i vissa pass eller i ett kortare pass. */
  varianter?: { nar: string; text?: string; delar: { tid: string; fas: string; vad: string; minuter?: number }[] }[];
  /** Rader utan minuter i passet, som Hemma, cirka 20 min. */
  andra: { tid: string; fas: string; vad: string }[];
  fore?: string;
  efter?: string;
  not?: string;
  adress: string;
  /** Stegen med vad läraren säger, på metodens sida. */
  steg?: { rubrik: string; fraserRubrik: string; adress: string; rader: { namn: string; fraser: string[] }[] };
}

// Planens texter ur metoden står i standarden (planensTexter och visadeTexter i src/lib/standard/plan.js), så att riggen
// prövar samma texter. Det de namnger blir länkar, men spärren mot namn utan sak gäller bara planens egna texter, eftersom
// metodens sida redan prövar sina.
// De andra metoderna, som en text kan nämna ("till exempel med TIL i grupp"): titeln före kolon när bara en metod har den,
// annars hela titeln.
async function andraMetoder(id: string): Promise<MetodSak[]> {
  const andra = (await publicerade('stodundervisning')).filter((x) => x.id !== id);
  const titlar = andra.map((x) => x.data.titel);
  return andra.map((x) => ({ namn: x.data.titel, former: [...new Set([x.data.titel, kortnamn(x.data.titel, titlar)])], versal: true, adress: `/stodundervisning/${x.id}` }));
}

/** Sakerna som planens texter nämner (K-493), så att sidan bara bär dem. */
// Med andra texter som planen visar ur metoden, som lektionens rader och material i en serie (Codex 2026-10-27: "Kedjorna" i
// tabellens not blev ingen länk).
export async function planensSaker(m: Metod, andra: string[] = [], version?: string): Promise<MetodSak[]> {
  // En lektion i en serie har också seriens saker, som Bokstavskartan och Bokstavskort till ljudstarten i Ljudlek i grupp,
  // före metodernas namn, så att "Bokstavskartan står i Ljudlek i grupp" leder till kartan (länkgranskningen 2026-10-27).
  const serien = m.data.serie ? (await publicerade('stodundervisning')).find((x) => x.id === m.data.serie) : undefined;
  // En serie har sina lektioner som saker, med lektionens namn som titel, så att "väljer du Första ljudet" leder till
  // lektionens sida (riggens leverans 2026-10-27).
  const lektionerna = m.data.lektionsbank ? (await seriensMetoder(m)).map((x) => ({ namn: lektionsnamn(x.data.titel), former: [lektionsnamn(x.data.titel)], versal: true, adress: `/stodundervisning/${x.id}` })) : [];
  const alla = [...metodensSaker(m.data, m.id, version), ...(serien ? metodensSaker(serien.data, serien.id) : []), ...lektionerna, ...(await andraMetoder(m.id))];
  const texterna = [...visadeTexter(m.data), ...andra];
  const anvanda = new Set(texterna.flatMap((t) => sakdelar(t, alla).flatMap((x) => (x.sak === undefined ? [] : [x.sak]))));
  // Ett spann, som "Bildserie 2–6", bär varje sak i spannet, så att planen kan länka dem var för sig. Namnet är ett eller
  // två ord, eller det sista ordet när ett ord med stor bokstav står före, som i "Laminerat Bildserie 1–6".
  const spann = new Set(texterna.flatMap((t) => sakspann(t).flatMap((x) => x.namn.flatMap((n) => x.nummer.map((nr) => `${n} ${nr}`)))));
  alla.forEach((s, i) => { if (spann.has(s.namn)) anvanda.add(i); });
  return alla.filter((_, i) => anvanda.has(i));
}

const tabellensAdress = (d: Metod['data'], id: string, namn: string) => {
  const t = d.tabeller.find((x) => x.rubrik === namn);
  const a = t && sidansAnkare(d).tabellAnkare.get(t);
  return a ? `/stodundervisning/${id}#${a}` : undefined;
};

// Passet ur tidsschemat: raderna med minuter är passets delar, raden Före passet är förberedelsen, och en rad som Hemma,
// cirka 20 min står efter delarna. Tidsschemats varianter är passet de veckor då delarna har andra tider, med vad läraren
// gör ur raden med samma fas, så att texten står på ett ställe i metoden (K-515).
function planensPass(d: Metod['data'], id: string): PlanPasset | undefined {
  if (!d.tidsschema) return undefined;
  const sida = `/stodundervisning/${id}`;
  const medTid = (r: { tid: string }) => arDelensTid(r.tid);
  const fore = (r: { tid: string }) => /^före/i.test(r.tid.trim());
  const del = (r: { tid: string; fas: string; vad: string }) => {
    const t = minuterISpann(r.tid);
    return { tid: r.tid, fas: r.fas, vad: r.vad, ...(t ? { minuter: Math.max(1, t.till - t.fran) } : {}) };
  };
  const vadFor = (fas: string) => d.tidsschema!.rader.find((r) => r.fas.toLowerCase() === fas.toLowerCase())?.vad ?? '';
  return {
    rubrik: d.tidsschema.rubrik,
    ...(planensInledning(d.tidsschema.text, d.plan?.utan) ? { text: planensInledning(d.tidsschema.text, d.plan?.utan) } : {}),
    delar: d.tidsschema.rader.filter(medTid).map(del),
    ...(d.tidsschema.varianter ? { varianter: d.tidsschema.varianter.map((v) => ({ nar: v.nar, text: v.text, delar: v.delar.map((x) => del({ ...x, vad: vadFor(x.fas) })) })) } : {}),
    andra: d.tidsschema.rader.filter((r) => !medTid(r) && !fore(r)).map((r) => ({ tid: r.tid, fas: r.fas, vad: r.vad })),
    ...(d.tidsschema.rader.find(fore) ? { fore: d.tidsschema.rader.find(fore)!.vad } : {}),
    ...(d.passrutin?.efterPasset ? { efter: d.passrutin.efterPasset } : {}),
    ...(d.tidsschema.efter ? { not: d.tidsschema.efter } : {}),
    adress: `${sida}#${passetsAnkare(d)}`,
    ...(d.steg ? { steg: { rubrik: d.steg.rubrik, fraserRubrik: forstaLedet(d.steg.fraserRubrik), adress: `${sida}#steg`, rader: d.steg.rader.map((r) => ({ namn: r.namn, fraser: r.fraser.slice(0, 3) })) } } : {}),
  };
}

// Ett pass med egen tabell, som Pass 1 i Seriesamtal och Boksamtalets bokval: delarna med tid, namn och text, och raderna
// utan minuter som förberedelse, ur standardens tabellensDelar, som läser tabellernas former.
// En dels andra kolumner står bara med när de har text.
const medMer = <T extends { mer: { etikett: string; text: string }[] }>({ mer, ...x }: T) => ({ ...x, ...(mer.length ? { mer } : {}) });
function passetsTabell(d: Metod['data'], id: string, namn: string, kolumn?: string): PassTabell {
  const adress = tabellensAdress(d, id, namn) ?? `/stodundervisning/${id}`;
  const t = d.tabeller.find((x) => x.rubrik === namn);
  const delar = t ? tabellensDelar(t, kolumn) : null;
  if (!delar) return { namn, adress };
  return { namn, adress, delar: delar.delar.map(medMer), fore: delar.fore.map(medMer), ...(delar.efter ? { efter: delar.efter } : {}) };
}

// Passens delar ur veckornas sidor (plan.veckansPass, K-553; riggens förslag 2026-10-27): ramen med lektioner har en del
// per vecka, och varje pass ett fält "Pass N" med en rad per del, som standardens faltetsDelar läser. Nyckeln är kursens
// passnummer.
// Metodens vecka för kursens pass, ur fälten Pass N på veckornas sidor, så att länken till veckans manus följer passet när
// ett lov eller en röd dag har flyttat det (Rimligheten 2026-10-27: Sagobokens pass 26–27 hör till metodens vecka 9).
function passensVeckor(d: Metod['data'], version?: string): Record<string, number> | undefined {
  const ram = veckansPassRam(d);
  if (!ram) return undefined;
  const ut: Record<string, number> = {};
  for (const { del, led } of versionensDelar(d, ram, version)) {
    const vecka = led.match(/^vecka (\d+)$/i)?.[1];
    if (!vecka) continue;
    for (const fa of del.falt ?? []) { const nr = faltetIVersionen(fa.rubrik, version)?.rubrik.match(/^pass (\d+)$/i)?.[1]; if (nr && !ut[nr]) ut[nr] = Number(vecka); }
  }
  return Object.keys(ut).length ? ut : undefined;
}
function veckornasPass(d: Metod['data'], id: string, version?: string): Record<string, PassTabell> | undefined {
  const rubrik = d.plan?.veckansPass;
  if (!rubrik) return undefined;
  const ramar = d.ramar?.ramar ?? [];
  const ri = ramar.findIndex((r) => r.rubrik === rubrik);
  if (ri < 0) return undefined;
  const { delAnkare } = sidansAnkare(d);
  const ut: Record<string, PassTabell> = {};
  // Passets delar, som ett fält som bara säger det som skiljer står i: tidsschemats och tabellernas som planens rader leder
  // till (K-585: Sagobokens skrivpass och bokpass).
  const delnamn = passetsDelnamn(d);
  // I en metod med versioner i planens val (K-576) gäller en veckosida som "Skattjakten vecka 3" sin version, och ett fält
  // utan rader som hör till en annan version. Fältet "Dag N" är veckans pass N, med nyckeln vecka.N (Värdeskapande).
  const alla = versionernasNamn(d);
  // En del som bara säger "som i tabellen Dag 2" får tabellens rad med samma namn, så att läraren ser vad delen är utan att
  // lämna planen (Rimligheten 2026-10-27: Värdeskapandes Hitta draget och Jämför stod bara som hänvisningar).
  const tabellerna = [
    ...(d.tidsschema ? [{ rubrik: d.tidsschema.rubrik, delar: d.tidsschema.rader }] : []),
    ...d.tabeller.flatMap((t) => { const x = tabellensDelar(t); return x ? [{ rubrik: t.rubrik, delar: x.delar }] : []; }),
  ];
  const somITabellen = <T extends { fas: string; vad: string }>(x: T): T => {
    const namn = x.vad.match(/^som i tabellen (.+?)\.?$/iu)?.[1]?.toLocaleLowerCase('sv');
    const t = namn ? tabellerna.find((y) => y.rubrik.toLocaleLowerCase('sv') === namn || y.rubrik.toLocaleLowerCase('sv').startsWith(`${namn},`)) : undefined;
    const rad = t?.delar.find((y) => y.fas.toLocaleLowerCase('sv') === x.fas.toLocaleLowerCase('sv'));
    return rad ? { ...x, vad: rad.vad } : x;
  };
  const versionensEgna = new Set<string>();
  for (const { del, di, led } of versionensDelar(d, ramar[ri], version)) {
    const vecka = led.match(/^vecka (\d+)$/i)?.[1];
    for (const f of del.falt ?? []) {
      // Ett fält som "Pass 9 i sex steg" är passet i den versionen och står i stället för "Pass 9" (K-576, Sagoboken).
      const iv = faltetIVersionen(f.rubrik, version);
      if (!iv) continue;
      const dag = vecka ? iv.rubrik.match(/^dag (\d+)$/i)?.[1] : undefined;
      const nr = dag ? `${vecka}.${dag}` : iv.rubrik.match(/^pass (\d+)$/i)?.[1];
      if (!nr || (!iv.egen && versionensEgna.has(nr))) continue;
      if (iv.egen) versionensEgna.add(nr);
      const text = iVersionen(f.text, version, alla);
      const delar = faltetsDelar(text);
      const bas = { namn: `${forstaLed(del.rubrik)}, ${f.rubrik}`, adress: `/stodundervisning/${id}#${delAnkare[ri][di]}`, sida: true };
      if (delar) { ut[nr] = { ...bas, ...(delar.slag ? { slag: delar.slag } : {}), ...(delar.efter ? { efter: delar.efter } : {}), delar: delar.delar.map(somITabellen).map(medMer), fore: delar.fore.map(medMer) }; continue; }
      const sk = faltetsSkillnader(text, delnamn);
      if (sk) ut[nr] = { ...bas, ...(sk.slag ? { slag: sk.slag } : {}), skillnad: { texter: sk.texter, iDelar: sk.iDelar, ovrigt: sk.ovrigt } };
    }
  }
  return ut;
}

// En tabell med en rad för varje vecka och en kolumn för varje nivå (Talen och bladen i veckorna i De fyra räknesätten,
// Texterna, vecka för vecka i Faktatextsamtal i grupp): kolumnerna efter den första heter som metodens nivåer, och varje
// rad börjar med veckan, "Vecka 3", "3 Venndiagrammet" eller "7–8 Gruppen väljer modell".
function nivaTabellen(d: Metod['data'], id: string): PlanData['nivaTabell'] {
  const nivaer = d.nivaer.map((n) => n.namn.toLowerCase());
  if (nivaer.length < 2) return undefined;
  const t = d.tabeller.find((x) => x.kolumner.length === nivaer.length + 1 && x.kolumner.slice(1).every((k, i) => k.toLowerCase() === nivaer[i]) && (x.rader ?? []).length > 0 && (x.rader ?? []).every((r) => !!radensVeckor(r[0])));
  if (!t) return undefined;
  const veckor: Record<string, Record<string, string>> = {};
  for (const r of t.rader ?? []) {
    const celler = Object.fromEntries(d.nivaer.map((n, i) => [slugAv(n.namn), String(r[i + 1] ?? '').trim()]));
    const s = radensVeckor(r[0]);
    if (s) for (let v = s.fran; v <= s.till; v++) veckor[String(v)] = celler;
  }
  return { rubrik: t.rubrik, adress: tabellensAdress(d, id, t.rubrik) ?? `/stodundervisning/${id}`, veckor, ...(t.not ? { not: t.not } : {}) };
}


/**
 * Lektionerna i en serie med lektionsbank, i bankens ordning, med det som seriens planerare visar en vecka med lektionen
 * (K-551): passet ur lektionens tidsschema, målet, vad eleverna blir bättre på och regeln för att gå vidare. Bara den
 * generella metoden har lektioner; en lektion planeras i seriens planerare.
 */
/** Seriens metoder, lektionerna eller kurserna, i förmågornas ordning (K-551, K-576). */
async function seriensMetoder(m: Metod) {
  return (await publicerade('stodundervisning')).filter((x) => x.data.serie === m.id && x.data.formaga !== undefined).sort((a, b) => a.data.formaga! - b.data.formaga!);
}

async function planensLektioner(m: Metod): Promise<PlanLektion[]> {
  const bank = m.data.lektionsbank;
  if (!bank) return [];
  const lektioner = await seriensMetoder(m);
  const serienasNar = new Set((m.data.uppfoljning?.rader ?? []).map((r) => r.nar));
  return Promise.all(lektioner.map(async (l) => {
    const ld = l.data;
    const sida = `/stodundervisning/${l.id}`;
    // Lektionens tidsschema säger hur delen går till och passrutinens steg vad eleverna gör, så delen börjar med steget (de
    // kalla testarna 2026-10-27: "Stegen visar bara hur korten fördelas, inte vad eleverna gör").
    const stegen = new Map((ld.passrutin?.steg ?? []).flatMap((s) => (typeof s === 'string' ? [] : [[s.fas.toLowerCase(), s.text] as [string, string]])));
    const pass0 = planensPass(ld, l.id);
    // Stegets sista led står inte två gånger när delens text redan säger det, som "och du lyssnar på dagens elever"
    // (verifieringen samma dag).
    const utanUpprepning = (steg: string, vad: string) => { const m = steg.match(/^(.*), och (.+?)\.$/u); return m && vad.toLowerCase().includes(m[2].toLowerCase()) ? `${m[1]}.` : mening(steg); };
    const passet = pass0 && { ...pass0, delar: pass0.delar.map((x) => (stegen.has(x.fas.toLowerCase()) ? { ...x, vad: `${utanUpprepning(stegen.get(x.fas.toLowerCase())!, x.vad)} ${x.vad}` } : x)) };
    const tabellen = ld.upplagg ? ld.tabeller.find((t) => ld.upplagg!.text.includes(t.rubrik)) : undefined;
    const upplagget = tabellen ? meningarna(ld.upplagg!.text) : [];
    const fran = upplagget.findIndex((m) => m.includes(tabellen!.rubrik));
    return {
      nr: ld.formaga!,
      id: l.id,
      namn: lektionsnamn(ld.titel),
      formaga: bank.formagor.find((f) => f.nr === ld.formaga)?.namn ?? lektionsnamn(ld.titel),
      sida,
      ...(ld.tranar ? { tranar: ld.tranar } : {}),
      mal: planensMal(l),
      ...(ld.mal ? { malAdress: `${sida}#mal` } : {}),
      ...(ld.vidare ? { vidare: ld.vidare } : {}),
      ...(ld.period ? { period: ld.period } : {}),
      ...(ld.veckor ? { veckor: ld.veckor } : {}),
      ...(passet ? { passet } : {}),
      checklista: ld.checklista?.punkter ?? [],
      ...(ld.checklista ? { checklistaRubrik: ld.checklista.rubrik } : {}),
      ...(ld.principer ? { principer: { rubrik: ld.principer.rubrik, text: ld.principer.text, adress: `${sida}#principer` } } : {}),
      // Lektionens saker ur allt planen visar ur lektionen: också raderna, uppläggets meningar, materialets stycke och stegen.
      saker: await planensSaker(l, [...upplagget.slice(Math.max(0, fran)), tabellen?.not ?? '', ...(tabellen?.rader ?? []).flatMap((r) => r.slice(1)), ld.ramar?.text?.[0] ?? '', ...stegen.values()]),
      uppfoljning: (ld.uppfoljning?.rader ?? []).filter((r) => serienasNar.has(r.nar)).map((r) => ({ nar: r.nar, vad: r.vad })),
      ...(tabellen ? { rader: { rubrik: tabellen.rubrik, adress: tabellensAdress(ld, l.id, tabellen.rubrik) ?? sida, text: [...upplagget.slice(Math.max(0, fran)), ...(tabellen.not ? [tabellen.not] : [])], rader: (tabellen.rader ?? []).map((r) => ({ namn: r[0], mer: r.slice(1).flatMap((c, i) => (c ? [{ etikett: tabellen.kolumner[i + 1], text: c }] : [])) })) } } : {}),
      ...(ld.ramar?.ramar?.length ? { material: { rubrik: ld.ramar.rubrik || 'Materialet', adress: `${sida}#ramar`, ...(ld.ramar.text?.[0] ? { text: ld.ramar.text[0] } : {}) } } : {}),
    };
  }));
}

/** Planens data ur metodens fil. */
export async function planensData(m: Metod, version?: string): Promise<PlanData> {
  const d = m.data;
  const sida = `/stodundervisning/${m.id}`;
  // Planens val av version (K-576): utan vald version räknas planen för varje version, och sidan får den första och för de
  // andra de fält som skiljer, så att valet byter innehållet utan att sidan hämtar något.
  const vv = d.plan?.versionsval;
  const alla = versionernasNamn(d);
  if (vv?.versioner && version === undefined) {
    const datan = await Promise.all(vv.versioner.map((x) => planensData(m, x.namn)));
    const bas = datan[0];
    const skiljer = (b: PlanData) => Object.fromEntries([...new Set([...Object.keys(bas), ...Object.keys(b)])].filter((k) => JSON.stringify((bas as unknown as Record<string, unknown>)[k]) !== JSON.stringify((b as unknown as Record<string, unknown>)[k])).map((k) => [k, (b as unknown as Record<string, unknown>)[k] ?? null])) as Partial<PlanData>;
    const stod = stodet(vv, d, m.id);
    return { ...bas, versionsval: { ...(stod ?? { text: vv.text, mer: { namn: vv.mer, adress: sida } }), rubrik: vv.rubrik, versioner: vv.versioner.map((x, i) => ({ namn: x.namn, slug: slugAv(x.namn), ...(x.veckor ? { veckor: x.veckor } : {}), data: i === 0 ? {} : skiljer(datan[i]) })) } };
  }
  // En serie vars kurser har egna planer, som Texttyper i grupp: valet leder till kursernas planer (K-576; Niclas
  // 2026-10-27), och sidan visar bara valet (PlaneraKurser.astro).
  if (vv && !vv.versioner && d.lektionsbank) {
    const kurser = await seriensMetoder(m);
    const stod = stodet(vv, d, m.id);
    return { ...(await planensData({ ...m, data: { ...d, plan: { ...d.plan!, versionsval: undefined } } } as Metod)), versionsval: { ...(stod ?? { text: vv.text, mer: { namn: vv.mer, adress: sida } }), rubrik: vv.rubrik, versioner: [], kurser: kurser.map((x) => ({ id: x.id, namn: lektionsnamn(x.data.titel), ...(x.data.tranar ? { tranar: x.data.tranar } : {}), adress: `/stodundervisning/${x.id}/planera` })) } };
  }
  const versionen = vv?.versioner?.find((x) => x.namn === version);
  // En mening eller rad som bara gäller en annan version, som "I Guideboken …", står inte med, i varje text planen visar ur
  // metoden (Rimligheten 2026-10-27: Guidebokens plan hade Skattjaktens replik, mentortext och period).
  const iV = (t: string | undefined) => iVersionen(t, version, alla);
  const iVLista = (l?: string[]) => { const ut = (l ?? []).map(iV).filter(Boolean); return ut.length ? ut : undefined; };
  // En rad i uppföljningen vars När börjar med en annan version, som "I sex steg: pass 26", står inte med (K-576, Sagokollen).
  const uppfRader = (d.uppfoljning?.rader ?? []).filter((r) => iV(r.nar));
  // I sin egen version heter raden utan märket: "I fyra steg: pass 25 och 27" blir "Pass 25 och 27".
  const utanMarket = (t: string) => (version ? stor(t.replace(new RegExp(`^(?:i|med)\\s+${skyddaRegex(version)}\\s*:\\s*`, 'iu'), '')) : t);
  // En kurs med veckor har veckans titel i metoden, och den är veckans rubrik i planen när progressionen inte har en egen.
  const kurs = kursensVeckor(d, m.id, version);
  const bank = harTaFram(m, 'texter') || harTaFram(m, 'problem') ? await planensBank(m) : undefined;
  const uppdaterad = d.uppdaterad ? (d.uppdaterad instanceof Date ? d.uppdaterad.toISOString().slice(0, 10) : String(d.uppdaterad).slice(0, 10)) : undefined;
  const passet = planensPass(d, m.id);
  const fastnar = [
    ...(d.fastnar ? [{ rubrik: d.fastnar.rubrik, adress: `${sida}#fastnar` }] : []),
    ...d.tabeller.filter((t) => t.plats === 'efter-fastnar').flatMap((t) => { const a = tabellensAdress(d, m.id, t.rubrik); return a ? [{ rubrik: t.rubrik, adress: a }] : []; }),
  ];
  const centrala = (d.centrala ?? []).flatMap((c) => {
    const x = CENTRALA.find((y) => y.id === c.id);
    if (!x || x.slag === 'formular' || (bank && (x.adress === bank.adress || lasbarAdress(x) === bank.adress))) return [];
    return [{ namn: x.namn, adress: lasbarAdress(x), pdf: x.slag === 'pdf' }];
  });
  // Gruppens storlek läses av standardens gruppensElever, som metodkortets ruta (K-509).
  const g = gruppensElever(d.grupp);
  const grupp = d.grupp ? { text: d.grupp, ...(g ? { min: g.min, ...(g.max !== undefined ? { max: g.max } : {}) } : {}) } : undefined;
  // Veckans texter ur banken genom progressionens taggar, som i Textsamtal i grupp, eller annars nivåns rad i tabellen med
  // veckor och nivåer, som i Faktatextsamtal i grupp (verifieringen av omgång 1 2026-10-26).
  const nivaTabell = bank && (d.progression?.rader ?? []).some((r) => r.taggar?.length) ? undefined : nivaTabellen(d, m.id);
  // En checklista inför första passet, som "Checklista inför samtal 1" i Kompissamtal, står under Före (länkgranskningen av
  // omgång 5 2026-10-26: den stod i varje vecka), och så gör en checklista inför kursen, som i texttypskurserna (riggens
  // passgenomgång av skrivmetoderna 2026-10-26: "Checklista inför en kurs" stod i varje pass), också "Före kursen" och
  // "Checklista före insatsen" (Codex 2026-10-27).
  const forstaChecklista = !!d.checklista && /första|\b(?:pass|samtal|lektion)\s+1\b|(?:inför|före) (?:en )?(?:kurs|insats|start)(?:en)?\b/iu.test(d.checklista.rubrik);
  const nivaval = stodet(d.plan?.nivaval, d, m.id);
  const langdval = stodet(d.plan?.langdval, d, m.id);
  const veckostod = stodet(d.plan?.veckoval, d, m.id);
  const veckoval = veckostod && d.plan?.veckoval?.forval ? { ...veckostod, forval: d.plan.veckoval.forval } : veckostod;
  const skattningar = planensSkattningar(d, m.id);
  const lektioner = d.plan?.lektionsval ? await planensLektioner(m) : [];
  const ingangsstod = stodet(d.plan?.lektionsval, d, m.id);
  return {
    id: m.id,
    titel: d.titel,
    omrade: d.omrade,
    ...(d.undertitel ? { undertitel: d.undertitel } : {}),
    adress: `${site.url.replace(/^https?:\/\//, '')}/stodundervisning/${m.id}`,
    sida: `/stodundervisning/${m.id}`,
    ...(uppdaterad ? { uppdaterad, uppdateradText: formateraDatum(d.uppdaterad!) } : {}),
    mal: planensMal(m),
    tid: d.tid,
    period: d.period,
    ...(d.progression ? { progression: { enhet: d.progression.enhet, rubrik: d.progression.rubrik, rader: d.progression.rader.map((r) => ({ ...r, kort: veckansKort(r, kurs[r.vecka]?.titel) })) } } : {}),
    // Versionens tid på en rad i uppföljningen, efter radens När (K-576).
    uppfoljning: { rader: uppfRader.map((r) => ({ ...r, vad: iV(r.vad) })).map((r) => (versionen?.tider?.[r.nar] ? { ...r, tid: versionen.tider[r.nar] } : r)).map((r) => (r.tabell ? { ...r, passet: passetsTabell(d, m.id, r.tabell) } : r)).map((r) => ({ ...r, nar: utanMarket(r.nar) })) },
    checklista: d.checklista?.punkter ?? [],
    ...(d.checklista ? { checklistaRubrik: d.checklista.rubrik } : {}),
    forstaChecklista,
    ...(bank ? { bank } : {}),
    harLathund: harLathund(d),
    // Sakerna i versionen, så att "vecka 1" leder till versionens vecka 1 (Codex 2026-10-27: Guidebokens vecka 1 ledde till
    // Skattjakten).
    saker: await planensSaker(m, [], version),
    ...(d.plan?.veckansPass ? { veckansPass: veckornasPass(d, m.id, version) ?? {} } : {}),
    ...(passensVeckor(d, version) ? { passensVeckor: passensVeckor(d, version) } : {}),
    ...(versionen?.extraPass ? { extraPass: { ...(versionen.extraPass.rubrik ? { rubrik: versionen.extraPass.rubrik } : {}), ...(faltetsDelar(versionen.extraPass.text ?? '') ? { delar: faltetsDelar(versionen.extraPass.text ?? '')!.delar.map(({ tid, fas, vad }) => ({ tid, fas, vad })) } : {}), ...(versionen.fore?.[0] ? { fore: versionen.fore[0] } : {}) } } : {}),
    ...(Object.keys(kurs).length ? { kursveckor: Object.fromEntries(Object.entries(kurs).map(([v, k]) => [v, k.adress])) } : {}),
    ...(passet ? { passet } : {}),
    // En rad vars text bara gäller en annan version står inte med (K-576).
    ...(d.plan?.passen ? { passen: d.plan.passen.filter((p) => !p.text || iV(p.text) || p.ur || p.tabell || (p.del && p.istallet)).map((p) => ({ nar: p.nar, ...(p.text && iV(p.text) ? { text: iV(p.text) } : {}), ...(p.ur ? (p.ur.rad === VECKANS_RAD ? { veckor: rollensVeckor(d, p.ur) ?? {} } : { rad: rollensEtiketter(iVersionensKolumner(rollensRad(d, p.ur) ?? [], version, alla).map((c) => ({ ...c, text: iV(c.text) })).filter((c) => c.text), p.kort, p.ur.rad) }) : {}), ...(p.kort ? { kort: p.kort } : {}), ...(p.utanTidsschema ? { utanTidsschema: true } : {}), ...(p.del ? { del: p.del } : {}), ...(p.istallet ? { istallet: true } : {}), ...(p.tabell ? { tabell: passetsTabell(d, m.id, p.tabell, p.kolumn) } : {}) })) } : {}),
    ...(d.principer ? { principer: { rubrik: d.principer.rubrik, text: d.principer.text, adress: `${sida}#principer` } } : {}),
    ...(d.gruppen ? { gruppen: { rubrik: d.gruppen.rubrik, text: iV(d.gruppen.text), adress: `${sida}#gruppen` } } : {}),
    ...(grupp ? { grupp } : {}),
    ...(d.hem ? { hem: { rubrik: d.hem.rubrik, text: postensRad(d.hem.text[0], 240), adress: `${sida}#hem` } } : {}),
    ...(fastnar.length ? { fastnar } : {}),
    ...(d.ramar?.ramar?.length ? { material: { rubrik: d.ramar.rubrik || 'Materialet', adress: `${sida}#ramar` } } : {}),
    ...(centrala.length ? { centrala } : {}),
    ...(d.mal ? { malAdress: `${sida}#mal` } : {}),
    ...(d.plan?.fore || versionen?.fore ? { fore: [...(d.plan?.fore ?? []).map(iV).filter(Boolean), ...(versionen?.fore ?? [])] } : {}),
    ...(iVLista(d.plan?.justera) ? { justera: iVLista(d.plan?.justera) } : {}),
    ...(iVLista(d.plan?.utvardering) ? { utvardering: iVLista(d.plan?.utvardering) } : {}),
    ...(d.plan?.utvarderasEfter && uppfRader.some((r) => r.nar === d.plan!.utvarderasEfter) ? { utvarderasEfter: uppfRader.findIndex((r) => r.nar === d.plan!.utvarderasEfter) } : {}),
    ...(d.plan?.upprepa ? { upprepa: d.plan.upprepa } : {}),
    ...(d.plan?.utanUpprepa ? { utanUpprepa: true as const } : {}),
    ...(d.plan?.stege ? { stege: true } : {}),
    ...(!bank && d.nivaer.length >= 2 ? { nivaer: d.nivaer.map((n) => ({ namn: n.namn, slug: slugAv(n.namn), farg: `#${n.farg.toLowerCase()}` })) } : {}),
    ...(nivaTabell ? { nivaTabell } : {}),
    ...(nivaval ? { nivaval } : {}),
    ...(langdval ? { langdval } : {}),
    ...(veckoval ? { veckoval } : {}),
    ...(d.plan?.foreVeckor ? { foreVeckor: d.plan.foreVeckor } : {}),
    ...(d.plan?.sistaRaden && { sistaRaden: d.plan.sistaRaden }),
    ...(skattningar.length ? { skattningar } : {}),
    ...(lektioner.length ? { lektioner } : {}),
    ...(ingangsstod && d.plan?.lektionsval ? { lektionsval: { ...ingangsstod, ingangar: d.plan.lektionsval.ingangar, ...(d.plan.lektionsval.klar ? { klar: d.plan.lektionsval.klar } : {}) } } : {}),
  };
}

// Veckans namn i planens lista, i Hela planen och i texten till åtgärdsprogrammet: progressionens rubrik, kursens titel för
// veckan, titeln före kolon i fokus ("Lika delar: eleverna delar …") eller hela första meningen, utan tre punkter (de kalla
// testarna 2026-10-26: veckans fokus var kapat i texten som klistras in i åtgärdsprogrammet).
const veckansKort = (r: { rubrik?: string; fokus: string }, titel?: string) => r.rubrik ?? (titel || r.fokus.match(/^([^:.!?]{3,40}):\s/u)?.[1] || postensRad(r.fokus, Infinity));

/**
 * Metodens egna skattningar med adresserna (K-559): instrumentet på metodens sida, som bladet Lärarens skattning, och för
 * det eleverna fyller i bladets egen pdf och fältet google på bladet, som kopierar formuläret och sammanställningen.
 */
function planensSkattningar(d: Metod['data'], id: string): PlanSkattning[] {
  const blad = metodensPaBordet(d, id).filter(arBlad);
  const filer = egnaBlad(d, id);
  return metodensSkattningar(d).skattningar.map((x) => {
    const b = blad.find((y) => bladNamn(y).toLowerCase() === x.namn.toLowerCase());
    const fil = filer.find((f) => f.titel.toLowerCase() === x.namn.toLowerCase());
    const ram = x.ram ? (d.ramar?.ramar ?? []).find((r) => r.rubrik === x.ram) : undefined;
    return {
      ...x,
      ...(b ? { adress: `/stodundervisning/${id}#blad-${b.bild.nr}` } : {}),
      ...(fil ? { pdf: `/stodundervisning/${fil.namn}.pdf` } : {}),
      ...(x.vem === 'eleverna' && b?.bild.google ? { formular: b.bild.google } : {}),
      ...(ram?.delar?.length ? { delar: ram.delar.map((g) => ({ rubrik: g.rubrik, falt: (g.falt ?? []).map((f) => ({ rubrik: f.rubrik, text: f.text })) })) } : {}),
    };
  });
}

/** En cell vars kolumn heter som passet självt, som Faktatextsamtals kolumn Läspasset i läspasset, får radens namn som
 * etikett, så att "Tränar att stanna när det skaver" inte blir "Läspasset att stanna när det skaver" (Rimligheten
 * 2026-10-26: raden såg ut som en halv mening). */
const rollensEtiketter = (celler: { kolumn: string; text: string }[], kort: string | undefined, rad: string) =>
  celler.map((c) => (kort && c.kolumn.trim().toLocaleLowerCase('sv') === kort.trim().toLocaleLowerCase('sv') ? { ...c, kolumn: rad } : c));

/** Avsnittet på metodens sida där passet står: passrutinen när metoden har en passöversikt, och annars tidsschemat. */
const passetsAnkare = (d: Metod['data']) => (passOversikt(d) ? 'passrutin' : 'tidsschema');

/** Ett stöd för ett val, nivåvalet eller passets längd, med adressen till metodens tabell, avsnitt eller ram med mer, med
 * hela rubriken som den står i metoden (Codex 2026-10-26: sakernas register har verktygen och rubrikernas första led), eller
 * inget när den inte finns. */
function stodet(n: { text: string; mer: string } | undefined, d: Metod['data'], id: string): PlanStod | undefined {
  if (!n) return undefined;
  const { ramAnkare, tabellAnkare } = sidansAnkare(d);
  const rutor = d as unknown as Record<string, { rubrik?: string } | undefined>;
  const rubriker: [string | undefined, string | undefined][] = [
    ...d.tabeller.map((t): [string, string | undefined] => [t.rubrik, tabellAnkare.get(t)]),
    ...sidansAvsnitt(d).map((a): [string | undefined, string] => [rutor[a.id]?.rubrik, a.id]),
    // Tidsschemats rubrik står över passet, också när passet har en översikt och avsnittet heter passrutin (K-564: Upprepad
    // läsnings Ett pass på 15 minuter).
    [d.tidsschema?.rubrik, passetsAnkare(d)],
    [d.gruppen?.rubrik, 'gruppen'], [d.principer?.rubrik, 'principer'],
    // Lektionsbanken i en serie, där ingångarna står (K-551), med avsnittets ankare i Lektionsbank.astro.
    [d.lektionsbank?.rubrik, 'lektionsbank'],
    ...(d.ramar?.ramar ?? []).map((r, i): [string, string] => [r.rubrik, ramAnkare[i]]),
  ];
  const traff = rubriker.find(([r, a]) => !!a && r?.trim() === n.mer.trim());
  return traff ? { text: n.text.trim(), mer: { namn: n.mer.trim(), adress: `/stodundervisning/${id}#${traff[1]}` } } : undefined;
}

async function planensBank(m: Metod): Promise<PlanBank | undefined> {
  const b = bankAv(m.data);
  if (!b) return undefined;
  const t = await taFramAv(m);
  const farger = nivaFarger(m.data, b);
  const taggar = Object.fromEntries(t.taggar.map((x) => [slugAv(x.namn), x.namn]));
  return {
    led: t.led,
    adress: t.adress,
    namn: t.namn,
    en: t.ord.en,
    flera: t.ord.flera,
    nivaer: t.nivaer.map((n) => ({
      namn: n.namn, slug: n.slug, farg: farger[n.namn] ?? n.farg,
      poster: n.poster.map((p) => ({ id: p.id, nr: p.nr, titel: p.titel, taggar: (p.taggar ?? []).map(slugAv), ...(p.sida ? { sida: p.sida } : {}) })),
    })),
    taggar,
    ...(m.data.plan?.enPerPass ? { enPerPass: true as const } : {}),
  };
}

/**
 * Felen som stoppar bygget för en metod som ska kunna planeras: standardens fel (tiden i varje rad i uppföljningen,
 * progressionens veckor, faktarutans tid och period), en metod utan mål och en tagg i progressionen som banken inte har.
 */
export async function insatsplanFel(m: Metod): Promise<string[]> {
  const fel = planFel(m.data);
  const taggar = (m.data.progression?.rader ?? []).flatMap((r) => r.taggar ?? []);
  if (taggar.length) {
    const bank = harTaFram(m, 'texter') || harTaFram(m, 'problem') ? await planensBank(m) : undefined;
    if (!bank) fel.push(`Progressionen har taggar (${taggar.join(', ')}), men metoden har ingen bank med taggar att visa dem i.`);
    else for (const t of new Set(taggar)) if (!bank.taggar[t]) fel.push(`Progressionens tagg "${t}" finns inte i bankens taggar (${Object.keys(bank.taggar).join(', ')}).`);
  }
  // En tabell som planens pass hänvisar till finns i metoden, så att länken leder dit (betan 2026-10-24).
  for (const p of m.data.plan?.passen ?? []) if (p.tabell && !tabellensAdress(m.data, m.id, p.tabell)) fel.push(`Planens pass "${p.nar}" hänvisar till tabellen "${p.tabell}", som metoden inte har. Skriv tabellens rubrik som den står i metoden.`);
  // Passets tabell är ett pass i delar, så att planen inte faller tillbaka tyst på tidsschemats delar och säger emot passet
  // (Codex 2026-10-27, K-553: Sagobokens läspass fick skrivpassets delar), och en vald kolumn finns i tabellen.
  for (const p of m.data.plan?.passen ?? []) {
    const t = p.tabell ? m.data.tabeller.find((x) => x.rubrik === p.tabell) : undefined;
    if (t && !tabellensDelar(t, p.kolumn)) fel.push(`Planens pass "${p.nar}" har tabellen "${p.tabell}"${p.kolumn ? ` och kolumnen "${p.kolumn}"` : ''}, som inte går att läsa som ett pass i delar. Tabellen behöver en kolumn Tid och en kolumn Del eller Steg, eller Del och tid i samma cell${p.kolumn ? ', och kolumnen ska finnas bland textens kolumner' : ''}. Är tabellen en översikt, citera den med ur i stället för tabell.`);
    if (p.kolumn && !p.tabell) fel.push(`Planens pass "${p.nar}" har kolumnen "${p.kolumn}" men ingen tabell.`);
  }
  // Uppföljningens tabell är ett pass i delar (K-553), och veckornas pass läses ur en ram med lektioner där varje fält
  // "Pass N" har en rad per del, och metoden har ett fast antal pass i veckan.
  for (const r of m.data.uppfoljning?.rader ?? []) {
    const t = r.tabell ? m.data.tabeller.find((x) => x.rubrik === r.tabell) : undefined;
    if (r.tabell && !(t && tabellensDelar(t))) fel.push(`Uppföljningens rad "${r.nar}" har tabellen "${r.tabell}", som metoden inte har eller som inte går att läsa som ett pass i delar.`);
  }
  if (m.data.plan?.veckansPass) {
    const ram = (m.data.ramar?.ramar ?? []).find((r) => r.rubrik === m.data.plan!.veckansPass);
    const takt = metodplan(m.data).plan?.takt;
    if (!ram?.lektioner) fel.push(`plan.veckansPass säger ramen "${m.data.plan.veckansPass}", som metoden inte har som en ram med en del per vecka (lektioner).`);
    else {
      const falten = veckansPassFalt(m.data);
      if (!falten.length) fel.push(`plan.veckansPass: ramen "${ram.rubrik}" har inga fält som heter Pass N eller Dag N.`);
      // Ett fält utan minuter säger bara det som skiljer från passets tabell, som Sagobokens "Där vi slutade: …", och planen
      // visar då passet (K-585). Ett fält med minuter ska gå att läsa som delar.
      for (const { del, f } of falten) if (/\d\s*[–-]\u2060?\s*\d+\s*min/.test(f.text) && !faltetsDelar(f.text)) fel.push(`plan.veckansPass: ${del}, ${f.rubrik}, har ingen rad som "N–M min. Delens namn: …".`);
      for (const { del, f } of falten) if (!faltetsDelar(f.text) && !faltetsSkillnader(f.text, [])) fel.push(`plan.veckansPass: ${del}, ${f.rubrik}, har ingen text.`);
      // Ett fält som "Pass 9 i sex steg" gäller en version i planens val (K-576).
      for (const { del, f } of falten) { const x = f.rubrik.match(/ i (.+)$/i)?.[1]; if (x && !versionernasNamn(m.data).some((n) => n.toLocaleLowerCase('sv') === x.toLocaleLowerCase('sv'))) fel.push(`plan.veckansPass: ${del}, ${f.rubrik}, gäller "${x}", som inte är en version i plan.versionsval.`); }
    }
    // Kursens pass räknas i veckor med ett fast antal pass i veckan, eller som planens i en period i pass (K-585). Fält som
    // "Dag 1" är veckans pass efter platsen i veckan och räknar inga kursens pass (Värdeskapande, K-576).
    const passfalt = (ram?.delar ?? []).some((del) => (del.falt ?? []).some((f) => /^pass \d+$/i.test(f.rubrik)));
    if (passfalt && takt && takt.min !== takt.max && metodplan(m.data).plan?.period.enhet !== 'pass') fel.push('plan.veckansPass räknar kursens pass och kräver ett fast antal pass i veckan i faktarutans tid, eller en period i pass.');
  }
  // En serie vars kurser har egna planer leder bara till kurser som kan planeras (K-576).
  if (m.data.plan?.versionsval && !m.data.plan.versionsval.versioner) {
    if (!m.data.lektionsbank) fel.push('plan.versionsval utan versioner gäller en serie med lektionsbank, vars kurser har egna planer.');
    else for (const x of await seriensMetoder(m)) if (!planbar(x.data)) fel.push(`plan.versionsval leder till kursen ${x.data.titel}, som inte kan planeras än (plan.vantar eller uppföljningen utan tid).`);
  }
  // Varje version räknas som planen gör det (Codex 2026-10-27): uppföljningen med versionens tider, en rad i uppföljningen
  // som har kvar en text i versionen, och versionens veckor som veckosidorna i veckans ram, så att metoden är roten.
  const versioner = m.data.plan?.versionsval?.versioner ?? [];
  const allaVersioner = versionernasNamn(m.data);
  const rader = m.data.uppfoljning?.rader ?? [];
  // Metodens egna skattningar pekar på uppföljningens rader med nummer, så en sådan metod har inga rader som bara gäller en
  // version (Codex 2026-10-27).
  if (m.data.plan?.skattningar && versioner.length && rader.some((r) => versioner.some((v) => !iVersionen(r.nar, v.namn, allaVersioner)))) fel.push('En metod med plan.skattningar har inga rader i uppföljningen som bara gäller en version i plan.versionsval.');
  for (const v of versioner) {
    for (const r of rader) if (iVersionen(r.nar, v.namn, allaVersioner) && !iVersionen(r.vad, v.namn, allaVersioner)) fel.push(`Uppföljningens rad "${r.nar}" har ingen text i ${v.namn}. Skriv en mening för varje version, eller ge versionen en egen tid i plan.versionsval.`);
    if (v.extraPass && !v.extraPass.text && !v.fore?.length) fel.push(`plan.versionsval: ${v.namn} har ett extra pass men varken passets text eller en rad i fore som säger vad som görs i det.`);
    if (v.extraPass?.text && !faltetsDelar(v.extraPass.text)) fel.push(`plan.versionsval: ${v.namn}, extraPass.text, har ingen rad som "N–M min. Delens namn: …".`);
    for (const n of Object.keys(v.tider ?? {})) if (!rader.some((r) => r.nar === n)) fel.push(`plan.versionsval: ${v.namn} har en tid för "${n}", som uppföljningen inte har.`);
    if (v.tider) for (const f of metodplan({ ...m.data, uppfoljning: { ...m.data.uppfoljning!, rader: rader.map((r) => (v.tider![r.nar] ? { ...r, tid: v.tider![r.nar] } : r)) } }).fel) fel.push(`plan.versionsval, ${v.namn}: ${f}`);
    const sista = Math.max(0, ...Object.keys(kursensVeckor(m.data, m.id, v.namn)).map(Number));
    if (typeof v.veckor === 'number' && sista && sista !== v.veckor) fel.push(`plan.versionsval: ${v.namn} har ${v.veckor} veckor, men veckosidorna i ramen går till vecka ${sista}.`);
  }
  // Utvärderingen väntar på en rad i uppföljningen efter insatsen (K-586).
  if (m.data.plan?.utvarderasEfter) {
    const r = (m.data.uppfoljning?.rader ?? []).find((x) => x.nar === m.data.plan!.utvarderasEfter);
    if (!r || !/^efter\b/i.test(String(r.tid ?? ''))) fel.push(`plan.utvarderasEfter säger "${m.data.plan.utvarderasEfter}", som inte är en rad i uppföljningen med tiden efter.`);
  }
  if (m.data.plan?.stege && metodplan(m.data).plan?.stegEnhet !== 'veckor') fel.push('plan.stege gäller en progression i veckor, där gruppen kan börja på en senare vecka.');
  // Stödet för nivåvalet (K-557): också en metod vars nivåer bara finns i banken, som Textsamtal i grupp, har det, och mer
  // är en tabell, ett avsnitt eller en ram i metoden, så att länken leder dit. Standarden prövar text och längd (planFel).
  const bankensNivaer = harTaFram(m, 'texter') || harTaFram(m, 'problem') ? (await planensBank(m))?.nivaer.length ?? 0 : 0;
  if (bankensNivaer >= 2 && m.data.nivaer.length < 2) fel.push(...nivavaletsFel(m.data, true));
  for (const x of planensSkattningar(m.data, m.id)) {
    if (!x.adress) fel.push(`plan.skattningar: "${x.namn}" är inget blad i metoden. Skriv bladets namn som det står efter "Blad: ", som Lärarens skattning.`);
    if (x.vem === 'eleverna' && !x.formular) fel.push(`plan.skattningar: bladet "${x.namn}" fylls i av eleverna och har inget formulär (fältet google på bladet), så planen kan inte leda till det.`);
  }
  for (const falt of ['nivaval', 'langdval', 'veckoval', 'lektionsval'] as const) {
    const n = m.data.plan?.[falt];
    if (n && !stodet(n, m.data, m.id)) fel.push(`plan.${falt}.mer säger "${n.mer}", som inte är en tabell, ett avsnitt eller en ram i metoden. Skriv rubriken som den står i metoden, som Så skiljer sig nivåerna.`);
  }
  // En serie med lektionsbank (K-551): stödet för valet av ingång, ingångar till lektioner som finns och varje lektions
  // regel för att gå vidare, som standarden prövar (lektionsvaletsFel).
  if (m.data.plan?.lektionsval) {
    fel.push(...lektionsvaletsFel(m.data));
    const lektioner = await planensLektioner(m);
    if (!lektioner.length) fel.push('plan.lektionsval gäller en serie med lektionsbank och lektioner, och metoden har inga.');
    for (const i of m.data.plan.lektionsval.ingangar) if (!lektioner.some((l) => l.nr === i.lektion)) fel.push(`plan.lektionsval har ingången "${i.namn}" till lektion ${i.lektion}, som serien inte har.`);
    for (const l of (await publicerade('stodundervisning')).filter((x) => x.data.serie === m.id)) for (const f of lektionsvaletsFel(l.data)) fel.push(`${l.id}: ${f}`);
  }
  if (m.data.plan?.enPerPass && !(harTaFram(m, 'texter') || harTaFram(m, 'problem'))) fel.push('plan.enPerPass gäller en metod med en bank, där planen visar passets post.');
  // Ett namn som ser ut som en sak i metoden men inte är någon av dem blir ingen länk i planen (K-493).
  const saker = metodensSaker(m.data, m.id);
  for (const [plats, text] of planensTexter(m.data)) for (const namn of olankadeSaker(text, saker)) fel.push(`${plats} nämner "${namn}", men metoden har ingen sak som heter så, och då blir det ingen länk i planen. Skriv namnet som bladet, kortet eller mallen heter i metoden, eller lägg saken i metoden (STIL.md under Hänvisningar).`);
  return fel.map((f) => `${m.id}: ${f}`);
}
