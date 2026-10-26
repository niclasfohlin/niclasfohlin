// Planera insatsen (K-489; Niclas 2026-10-24: "Planera insatsen gillar jag", och "bygg EN som du testar på flera olika
// sätt att den funkar. dvs en standard"): det metodens plansida, /stodundervisning/<id>/planera, behöver ur metodens fil
// vid bygget. Planen räknas fram i webbläsaren av standardens planmotor (src/lib/standard/plan.js) ur samma fält, så att
// sidan, riggen och provet räknar lika. Hur fälten skrivs står i METODER.md under Planera insatsen.
import type { CollectionEntry } from 'astro:content';
import { forstaLedet, gruppensElever, kortnamn, metodensSkattningar, metodplan, minuterISpann, nivavaletsFel, olankadeSaker, planensInledning, planensTexter, planFel, postensRad, radensVeckor, rollensRad, rollensVeckor, sakdelar, sakspann, slugAv, tabellensDelar, VECKANS_RAD, visadeTexter } from './standard/index.js';
import { bankAv, nivaFarger } from './bank';
import { harTaFram, taFramAv } from './tafram';
import { formateraDatum } from './innehall';
import { harLathund } from './metod';
import { kursensVeckor, metodensSaker, sidansAnkare, sidansAvsnitt, type MetodSak } from './metodsaker';
import { passOversikt } from './metod';
import { CENTRALA, lasbarAdress } from './centrala';
import { publicerade } from './innehall';
import { site } from '../data/site';
import type { Skattning } from './standard/index.js';
import { arBlad, bladNamn, metodensPaBordet } from './pabordet';
import { egnaBlad } from './bladmaterial';

type Metod = CollectionEntry<'stodundervisning'>;

// Kan metoden planeras? Regeln står i src/lib/planbar.ts.
export { planbar } from './planbar';

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
  progression?: { enhet: string; rader: { vecka: string; led?: string; fokus: string; roll: string; eleverna?: string; vidare?: string; taggar?: string[]; rubrik?: string; kort: string }[] };
  uppfoljning: { rader: { nar: string; vad: string; tid?: string; perElev?: number | [number, number] }[] };
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
  /** Passet ur metodens tidsschema (betan 2026-10-24: ingen av de kalla testarna kunde hålla första passet bara efter planen):
   * delarna med tid och vad läraren gör, förberedelsen (raden Före passet), andra rader som Hemma, och det läraren gör efter
   * passet (passrutinens efterPasset), med adresserna till passet och stegen på metodens sida. */
  passet?: PlanPasset;
  /** Vad som skiljer passen åt (plan.passen): rollens citat ur metoden och raden ur metodens tabell som den hämtar sin text
   * ur (K-520), och adressen till metodens tabell för ett pass som går till på ett eget sätt med tabellens delar, när den
   * har en rad per del med tiden under delens namn (Seriesamtals pass 1). */
  passen?: { nar: string; text?: string; rad?: { kolumn: string; text: string }[]; veckor?: Record<string, { kolumn: string; text: string }[]>; kort?: string; utanTidsschema?: boolean; del?: string; istallet?: boolean; tabell?: { namn: string; adress: string; delar?: { tid: string; fas: string; vad: string; mer?: { etikett: string; text: string }[] }[]; fore?: { namn: string; nar: string; vad: string; mer?: { etikett: string; text: string }[] }[] } }[];
  /** Metodens rutor överst, som planen visar eller leder till: principerna, gruppen och Hem och skola. */
  principer?: { rubrik: string; text: string; adress: string };
  gruppen?: { rubrik: string; text: string; adress: string };
  /** Faktarutans grupp, "En till fyra elever", med talen när de går att läsa. */
  grupp?: { text: string; min?: number; max?: number };
  hem?: { rubrik: string; text: string; adress: string };
  /** Metodens avsnitt om när eleven fastnar, och de andra stöden i stunden, som Om något händer i Seriesamtal. */
  fastnar?: { rubrik: string; adress: string }[];
  /** Metodens material, med rubriken som i metoden, som Böckerna och materialet. */
  material?: { rubrik: string; adress: string };
  /** Metodens verktyg och stödmaterial (fältet centrala), utom banken som planen redan har. */
  centrala?: { namn: string; adress: string; pdf: boolean }[];
  /** Metodens mål på sidan, som planen leder till vid insatsens mål. */
  malAdress?: string;
  /** Det som görs före första passet utöver uppföljningen och checklistan (plan.fore). */
  fore?: string[];
  justera?: string[];
  /** Metodens regel för beslutet efter insatsen (plan.utvardering), vid utvärderingen. */
  utvardering?: string[];
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
}

/** Ett stöd för ett val i planen (STIL.md under Stöd för ett val): metodens text och metodens rubrik med mer, med adressen. */
export interface PlanStod { text: string; mer: { namn: string; adress: string } }

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
export async function planensSaker(m: Metod): Promise<MetodSak[]> {
  const alla = [...metodensSaker(m.data, m.id), ...(await andraMetoder(m.id))];
  const anvanda = new Set(visadeTexter(m.data).flatMap((t) => sakdelar(t, alla).flatMap((x) => (x.sak === undefined ? [] : [x.sak]))));
  // Ett spann, som "Bildserie 2–6", bär varje sak i spannet, så att planen kan länka dem var för sig. Namnet är ett eller
  // två ord, eller det sista ordet när ett ord med stor bokstav står före, som i "Laminerat Bildserie 1–6".
  const spann = new Set(visadeTexter(m.data).flatMap((t) => sakspann(t).flatMap((x) => x.namn.flatMap((n) => x.nummer.map((nr) => `${n} ${nr}`)))));
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
  const medTid = (r: { tid: string }) => /^\d/.test(r.tid.trim());
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
function passetsTabell(d: Metod['data'], id: string, namn: string): NonNullable<NonNullable<PlanData['passen']>[number]['tabell']> {
  const adress = tabellensAdress(d, id, namn) ?? `/stodundervisning/${id}`;
  const t = d.tabeller.find((x) => x.rubrik === namn);
  const delar = t ? tabellensDelar(t) : null;
  if (!delar) return { namn, adress };
  const medMer = <T extends { mer: { etikett: string; text: string }[] }>({ mer, ...x }: T) => ({ ...x, ...(mer.length ? { mer } : {}) });
  return { namn, adress, delar: delar.delar.map(medMer), fore: delar.fore.map(medMer) };
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


/** Planens data ur metodens fil. */
export async function planensData(m: Metod): Promise<PlanData> {
  const d = m.data;
  const sida = `/stodundervisning/${m.id}`;
  // En kurs med veckor har veckans titel i metoden, och den är veckans rubrik i planen när progressionen inte har en egen.
  const kurs = kursensVeckor(d, m.id);
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
  // omgång 5 2026-10-26: den stod i varje vecka).
  const forstaChecklista = !!d.checklista && /första|\b(?:pass|samtal|lektion)\s+1\b/iu.test(d.checklista.rubrik);
  const nivaval = stodet(d.plan?.nivaval, d, m.id);
  const langdval = stodet(d.plan?.langdval, d, m.id);
  const veckostod = stodet(d.plan?.veckoval, d, m.id);
  const veckoval = veckostod && d.plan?.veckoval?.forval ? { ...veckostod, forval: d.plan.veckoval.forval } : veckostod;
  const skattningar = planensSkattningar(d, m.id);
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
    ...(d.progression ? { progression: { enhet: d.progression.enhet, rader: d.progression.rader.map((r) => ({ ...r, kort: veckansKort(r, kurs[r.vecka]?.titel) })) } } : {}),
    uppfoljning: { rader: d.uppfoljning?.rader ?? [] },
    checklista: d.checklista?.punkter ?? [],
    ...(d.checklista ? { checklistaRubrik: d.checklista.rubrik } : {}),
    forstaChecklista,
    ...(bank ? { bank } : {}),
    harLathund: harLathund(d),
    saker: await planensSaker(m),
    ...(Object.keys(kurs).length ? { kursveckor: Object.fromEntries(Object.entries(kurs).map(([v, k]) => [v, k.adress])) } : {}),
    ...(passet ? { passet } : {}),
    ...(d.plan?.passen ? { passen: d.plan.passen.map((p) => ({ nar: p.nar, ...(p.text ? { text: p.text } : {}), ...(p.ur ? (p.ur.rad === VECKANS_RAD ? { veckor: rollensVeckor(d, p.ur) ?? {} } : { rad: rollensEtiketter(rollensRad(d, p.ur) ?? [], p.kort, p.ur.rad) }) : {}), ...(p.kort ? { kort: p.kort } : {}), ...(p.utanTidsschema ? { utanTidsschema: true } : {}), ...(p.del ? { del: p.del } : {}), ...(p.istallet ? { istallet: true } : {}), ...(p.tabell ? { tabell: passetsTabell(d, m.id, p.tabell) } : {}) })) } : {}),
    ...(d.principer ? { principer: { rubrik: d.principer.rubrik, text: d.principer.text, adress: `${sida}#principer` } } : {}),
    ...(d.gruppen ? { gruppen: { rubrik: d.gruppen.rubrik, text: d.gruppen.text, adress: `${sida}#gruppen` } } : {}),
    ...(grupp ? { grupp } : {}),
    ...(d.hem ? { hem: { rubrik: d.hem.rubrik, text: postensRad(d.hem.text[0], 240), adress: `${sida}#hem` } } : {}),
    ...(fastnar.length ? { fastnar } : {}),
    ...(d.ramar?.ramar?.length ? { material: { rubrik: d.ramar.rubrik || 'Materialet', adress: `${sida}#ramar` } } : {}),
    ...(centrala.length ? { centrala } : {}),
    ...(d.mal ? { malAdress: `${sida}#mal` } : {}),
    ...(d.plan?.fore ? { fore: d.plan.fore } : {}),
    ...(d.plan?.justera ? { justera: d.plan.justera } : {}),
    ...(d.plan?.utvardering ? { utvardering: d.plan.utvardering } : {}),
    ...(d.plan?.upprepa ? { upprepa: d.plan.upprepa } : {}),
    ...(d.plan?.stege ? { stege: true } : {}),
    ...(!bank && d.nivaer.length >= 2 ? { nivaer: d.nivaer.map((n) => ({ namn: n.namn, slug: slugAv(n.namn), farg: `#${n.farg.toLowerCase()}` })) } : {}),
    ...(nivaTabell ? { nivaTabell } : {}),
    ...(nivaval ? { nivaval } : {}),
    ...(langdval ? { langdval } : {}),
    ...(veckoval ? { veckoval } : {}),
    ...(d.plan?.foreVeckor ? { foreVeckor: d.plan.foreVeckor } : {}),
    ...(d.plan?.sistaRaden && { sistaRaden: d.plan.sistaRaden }),
    ...(skattningar.length ? { skattningar } : {}),
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
  if (m.data.plan?.stege && metodplan(m.data).plan?.stegEnhet !== 'veckor') fel.push('plan.stege gäller en progression i veckor, där gruppen kan börja på en senare vecka.');
  // Stödet för nivåvalet (K-557): också en metod vars nivåer bara finns i banken, som Textsamtal i grupp, har det, och mer
  // är en tabell, ett avsnitt eller en ram i metoden, så att länken leder dit. Standarden prövar text och längd (planFel).
  const bankensNivaer = harTaFram(m, 'texter') || harTaFram(m, 'problem') ? (await planensBank(m))?.nivaer.length ?? 0 : 0;
  if (bankensNivaer >= 2 && m.data.nivaer.length < 2) fel.push(...nivavaletsFel(m.data, true));
  for (const x of planensSkattningar(m.data, m.id)) {
    if (!x.adress) fel.push(`plan.skattningar: "${x.namn}" är inget blad i metoden. Skriv bladets namn som det står efter "Blad: ", som Lärarens skattning.`);
    if (x.vem === 'eleverna' && !x.formular) fel.push(`plan.skattningar: bladet "${x.namn}" fylls i av eleverna och har inget formulär (fältet google på bladet), så planen kan inte leda till det.`);
  }
  for (const falt of ['nivaval', 'langdval', 'veckoval'] as const) {
    const n = m.data.plan?.[falt];
    if (n && !stodet(n, m.data, m.id)) fel.push(`plan.${falt}.mer säger "${n.mer}", som inte är en tabell, ett avsnitt eller en ram i metoden. Skriv rubriken som den står i metoden, som Så skiljer sig nivåerna.`);
  }
  if (m.data.plan?.enPerPass && !(harTaFram(m, 'texter') || harTaFram(m, 'problem'))) fel.push('plan.enPerPass gäller en metod med en bank, där planen visar passets post.');
  // Ett namn som ser ut som en sak i metoden men inte är någon av dem blir ingen länk i planen (K-493).
  const saker = metodensSaker(m.data, m.id);
  for (const [plats, text] of planensTexter(m.data)) for (const namn of olankadeSaker(text, saker)) fel.push(`${plats} nämner "${namn}", men metoden har ingen sak som heter så, och då blir det ingen länk i planen. Skriv namnet som bladet, kortet eller mallen heter i metoden, eller lägg saken i metoden (STIL.md under Hänvisningar).`);
  return fel.map((f) => `${m.id}: ${f}`);
}
