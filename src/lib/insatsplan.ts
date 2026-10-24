// Planera insatsen (K-489; Niclas 2026-10-24: "Planera insatsen gillar jag", och "bygg EN som du testar på flera olika
// sätt att den funkar. dvs en standard"): det metodens plansida, /stodundervisning/<id>/planera, behöver ur metodens fil
// vid bygget. Planen räknas fram i webbläsaren av standardens planmotor (src/lib/standard/plan.js) ur samma fält, så att
// sidan, riggen och provet räknar lika. Hur fälten skrivs står i METODER.md under Planera insatsen.
import type { CollectionEntry } from 'astro:content';
import { metodplan, olankadeSaker, postensRad, sakdelar, slugAv } from './standard/index.js';
import { bankAv, nivaFarger } from './bank';
import { harTaFram, taFramAv } from './tafram';
import { formateraDatum } from './innehall';
import { harLathund } from './metod';
import { metodensLektionskort } from './lektionskort';
import { lektionskortetsPapper } from './lektionskortdata';
import { kursensVeckor, metodensSaker, type MetodSak } from './metodsaker';
import { metodensAnkare, metodensAvsnitt } from './metodankare';
import { passOrd, passOversikt } from './metod';
import { CENTRALA, lasbarAdress } from './centrala';
import { publicerade } from './innehall';
import { site } from '../data/site';

type Metod = CollectionEntry<'stodundervisning'>;

// Kan metoden planeras? Regeln står i src/lib/planbar.ts.
export { planbar } from './planbar';

/** Planens adress under metoden. */
export const planensAdress = (id: string) => `/stodundervisning/${id}/planera`;

/**
 * Insatsens mål, som läraren skattar eleverna mot varje vecka och kan skriva om med pennan (Niclas 2026-10-24: "Den kan få
 * en färdig, vi har ju dessa i lektionskorten väl? Men ska kunna trycka och redigera det målet"): plan.mal i metodens fil,
 * och annars målet på metodens lektionskort ("**Mål:** kunna …") när metoden har ett kort.
 */
export function planensMal(m: Metod): string | undefined {
  if (m.data.plan?.mal) return m.data.plan.mal;
  const kort = metodensLektionskort(m.data, m.id);
  if (kort.length !== 1) return undefined;
  return lektionskortetsPapper(kort[0]).ingress?.match(/\*\*Mål:\*\*\s*([^\n]+)/)?.[1]?.trim() || undefined;
}

export interface PlanBank {
  /** Ta fram-sidans led och adress. */
  led: string;
  adress: string;
  /** Verktygets namn, som Ta fram en lästext. */
  namn: string;
  /** Postens namn: text, problem. */
  en: string;
  flera: string;
  nivaer: { namn: string; slug: string; farg: string; poster: { id: string; nr: number; titel: string; taggar: string[] }[] }[];
  /** Taggarnas namn efter adressens form: fore-och-efter → Före och efter. */
  taggar: Record<string, string>;
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
  progression?: { enhet: string; rader: { vecka: string; led?: string; fokus: string; roll: string; taggar?: string[]; rubrik?: string; kort: string }[] };
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
  /** Vad som skiljer passen åt (plan.passen), med adressen till metodens tabell för ett pass som går till på ett eget sätt
   * och tabellens delar, när den har en rad per del med tiden under delens namn (Seriesamtals pass 1). */
  passen?: { nar: string; text: string; kort?: string; tabell?: { namn: string; adress: string; delar?: { tid: string; fas: string; vad: string }[]; fore?: { namn: string; nar: string; vad: string }[] } }[];
  /** Metodens rutor överst, som planen visar eller leder till: principerna, gruppen och Hem och skola. */
  principer?: { rubrik: string; text: string; adress: string };
  gruppen?: { rubrik: string; text: string; adress: string };
  /** Faktarutans grupp, "En till fyra elever", med talen när de går att läsa. */
  grupp?: { text: string; min?: number; max?: number };
  hem?: { rubrik: string; text: string; adress: string };
  /** Metodens avsnitt om när eleven fastnar, och de andra stöden i stunden, som Om något händer i Seriesamtal. */
  fastnar?: { rubrik: string; adress: string }[];
  /** Metodens verktyg och stödmaterial (fältet centrala), utom banken som planen redan har. */
  centrala?: { namn: string; adress: string; pdf: boolean }[];
  /** Metodens mål på sidan, som planen leder till vid insatsens mål. */
  malAdress?: string;
  /** Det som görs före första passet utöver uppföljningen och checklistan (plan.fore). */
  fore?: string[];
  justera?: string[];
  upprepa?: string;
  /** Progressionen är en stege som gruppen kan börja högre upp på (plan.stege). */
  stege?: boolean;
  /** Metodens egna nivåer när metoden inte har en bank (en kurs i nivåer, som De fyra räknesätten). */
  nivaer?: { namn: string; slug: string; farg: string }[];
  /** En tabell med en rad för varje vecka och en kolumn för varje nivå, som Talen och bladen i veckorna: veckans cell för
   * nivån står i planens vecka. */
  nivaTabell?: { rubrik: string; adress: string; veckor: Record<string, Record<string, string>>; not?: string };
}

export interface PlanPasset {
  rubrik: string;
  /** Tidsschemats inledning, som står vid förberedelsen. */
  text?: string;
  delar: { tid: string; fas: string; vad: string; minuter?: number }[];
  /** Rader utan minuter i passet, som Hemma, cirka 20 min. */
  andra: { tid: string; fas: string; vad: string }[];
  fore?: string;
  efter?: string;
  not?: string;
  adress: string;
  /** Stegen med vad läraren säger, på metodens sida. */
  steg?: { rubrik: string; adress: string; rader: { namn: string; fraser: string[] }[] };
}

// Planens texter ur metoden, som sidan visar med länkar till det de namnger, med var de står till spärren.
const planensTexter = (d: Metod['data']): [string, string][] => [
  ...(d.uppfoljning?.rader ?? []).map((r): [string, string] => [`Uppföljningens rad "${r.nar}"`, r.vad]),
  ...(d.progression?.rader ?? []).flatMap((r): [string, string][] => [[`Progressionens rad "${r.vecka}"`, r.fokus], [`Progressionens rad "${r.vecka}"`, r.roll], ...(r.led ? [[`Progressionens rad "${r.vecka}"`, r.led] as [string, string]] : [])]),
  ...(d.checklista?.punkter ?? []).map((p): [string, string] => ['Checklistan', p]),
  ...(d.plan?.passen ?? []).map((p): [string, string] => [`Planens pass "${p.nar}"`, p.text]),
  ...(d.plan?.fore ?? []).map((t): [string, string] => ['Planens fore', t]),
  ...(d.plan?.justera ?? []).map((t): [string, string] => ['Planens justera', t]),
  ...(d.plan?.upprepa ? [['Planens upprepa', d.plan.upprepa] as [string, string]] : []),
];
// Metodens egna texter som planen också visar: passets delar, förberedelsen, efter passet, principerna och Hem och skola.
// Det de namnger blir länkar, men spärren gäller bara planens texter ovan, eftersom metodens sida redan prövar sina.
const visadeTexter = (d: Metod['data']): string[] => [
  ...planensTexter(d).map(([, t]) => t),
  ...(d.tidsschema?.rader ?? []).map((r) => r.vad),
  // Tidsschemats inledning står först bland passets delar, och gruppen under Före (länkgranskningen 2026-10-25: Lektionskortet
  // och Ljudlek i grupp blev ingen länk där).
  d.tidsschema?.text ?? '', d.gruppen?.text ?? '',
  d.tidsschema?.efter ?? '', d.passrutin?.efterPasset ?? '', d.principer?.text ?? '', d.hem?.text[0] ?? '',
  // Tabellerna för pass med egen ordning, och en tabell med veckorna och nivåerna, som bladen i De fyra räknesätten.
  ...d.tabeller.filter((t) => (d.plan?.passen ?? []).some((p) => p.tabell === t.rubrik) || (d.nivaer.length >= 2 && t.kolumner.slice(1).every((k, i) => k.toLowerCase() === d.nivaer[i]?.namn.toLowerCase()))).flatMap((t) => (t.rader ?? []).flatMap((r) => r.slice(1).map(String))),
].filter(Boolean);
// De andra metoderna, som en text kan nämna ("till exempel med TIL i grupp"): titeln före kolon när bara en metod har den,
// annars hela titeln.
async function andraMetoder(id: string): Promise<MetodSak[]> {
  const andra = (await publicerade('stodundervisning')).filter((x) => x.id !== id);
  const forsta = (t: string) => t.split(':')[0].trim();
  const antal = new Map<string, number>();
  for (const x of andra) antal.set(forsta(x.data.titel), (antal.get(forsta(x.data.titel)) ?? 0) + 1);
  return andra.map((x) => {
    const kort = forsta(x.data.titel);
    return { namn: x.data.titel, former: [...new Set([x.data.titel, ...(antal.get(kort) === 1 ? [kort] : [])])], versal: true, adress: `/stodundervisning/${x.id}` };
  });
}

/** Sakerna som planens texter nämner (K-493), så att sidan bara bär dem. */
export async function planensSaker(m: Metod): Promise<MetodSak[]> {
  const alla = [...metodensSaker(m.data, m.id), ...(await andraMetoder(m.id))];
  const anvanda = new Set(visadeTexter(m.data).flatMap((t) => sakdelar(t, alla).flatMap((x) => (x.sak === undefined ? [] : [x.sak]))));
  // Ett spann, som "Bildserie 2–6", bär varje sak i spannet, så att planen kan länka dem var för sig.
  const spann = new Set(visadeTexter(m.data).flatMap((t) => [...t.matchAll(/(\p{Lu}\p{L}+(?: \p{L}+)?) (\d+)\s*[–-]\u2060?\s*(\d+)/gu)].flatMap((x) => { const a = Number(x[2]), b = Number(x[3]); return b > a && b - a <= 7 ? Array.from({ length: b - a + 1 }, (_, i) => `${x[1]} ${a + i}`) : []; })));
  alla.forEach((s, i) => { if (spann.has(s.namn)) anvanda.add(i); });
  return alla.filter((_, i) => anvanda.has(i));
}

// Metodens avsnitt och tabellernas ankare, som metodens sida ger dem (src/lib/metodankare.ts).
const ankarna = (d: Metod['data']) => metodensAnkare(d, metodensAvsnitt(d, { pass: !!passOversikt(d), stegen: passOrd(d).stegen }));
const tabellensAdress = (d: Metod['data'], id: string, namn: string) => {
  const t = d.tabeller.find((x) => x.rubrik === namn);
  const a = t && ankarna(d).tabellAnkare.get(t);
  return a ? `/stodundervisning/${id}#${a}` : undefined;
};

// Passet ur tidsschemat: raderna med minuter är passets delar, raden Före passet är förberedelsen, och en rad som Hemma,
// cirka 20 min står efter delarna.
function planensPass(d: Metod['data'], id: string): PlanPasset | undefined {
  if (!d.tidsschema) return undefined;
  const sida = `/stodundervisning/${id}`;
  const medTid = (r: { tid: string }) => /^\d/.test(r.tid.trim());
  const fore = (r: { tid: string }) => /^före/i.test(r.tid.trim());
  const delar = d.tidsschema.rader.filter(medTid).map((r) => {
    const t = r.tid.match(/(\d+)\s*[–-]\u2060?\s*(\d+)/);
    return { tid: r.tid, fas: r.fas, vad: r.vad, ...(t ? { minuter: Math.max(1, Number(t[2]) - Number(t[1])) } : {}) };
  });
  return {
    rubrik: d.tidsschema.rubrik,
    ...(d.tidsschema.text ? { text: d.tidsschema.text } : {}),
    delar,
    andra: d.tidsschema.rader.filter((r) => !medTid(r) && !fore(r)).map((r) => ({ tid: r.tid, fas: r.fas, vad: r.vad })),
    ...(d.tidsschema.rader.find(fore) ? { fore: d.tidsschema.rader.find(fore)!.vad } : {}),
    ...(d.passrutin?.efterPasset ? { efter: d.passrutin.efterPasset } : {}),
    ...(d.tidsschema.efter ? { not: d.tidsschema.efter } : {}),
    adress: `${sida}#${passOversikt(d) ? 'passrutin' : 'tidsschema'}`,
    ...(d.steg ? { steg: { rubrik: d.steg.rubrik, adress: `${sida}#steg`, rader: d.steg.rader.map((r) => ({ namn: r.namn, fraser: r.fraser.slice(0, 3) })) } } : {}),
  };
}

// Ett pass med egen tabell, som Pass 1 i Seriesamtal: en rad per del med delens namn och tiden på två rader i första
// cellen ("Varför vi ses" och "0–4 min") och vad läraren gör i den andra. En rad utan minuter ("Före passet", "Dagen
// före") är förberedelsen.
function passetsTabell(d: Metod['data'], id: string, namn: string): NonNullable<NonNullable<PlanData['passen']>[number]['tabell']> {
  const adress = tabellensAdress(d, id, namn) ?? `/stodundervisning/${id}`;
  const t = d.tabeller.find((x) => x.rubrik === namn);
  if (!t || t.kolumner.length !== 2) return { namn, adress };
  const rader = (t.rader ?? []).map((r) => { const [del, tid = ''] = String(r[0]).split('\n').map((x) => x.trim()); return { del, tid, vad: String(r[1]).trim() }; });
  if (!rader.length || !rader.every((r) => r.del && r.tid)) return { namn, adress };
  const medTid = (tid: string) => /^\d/.test(tid);
  return {
    namn, adress,
    delar: rader.filter((r) => medTid(r.tid)).map((r) => ({ tid: r.tid, fas: r.del, vad: r.vad })),
    fore: rader.filter((r) => !medTid(r.tid)).map((r) => ({ namn: r.del, nar: r.tid, vad: r.vad })),
  };
}

// En tabell med en rad för varje vecka och en kolumn för varje nivå (Talen och bladen i veckorna i De fyra räknesätten):
// kolumnerna efter den första heter som metodens nivåer, och varje rad börjar med "Vecka N".
function nivaTabellen(d: Metod['data'], id: string): PlanData['nivaTabell'] {
  const nivaer = d.nivaer.map((n) => n.namn.toLowerCase());
  if (nivaer.length < 2) return undefined;
  const t = d.tabeller.find((x) => x.kolumner.length === nivaer.length + 1 && x.kolumner.slice(1).every((k, i) => k.toLowerCase() === nivaer[i]) && (x.rader ?? []).length > 0 && (x.rader ?? []).every((r) => /^vecka \d+/i.test(String(r[0]).trim())));
  if (!t) return undefined;
  const veckor: Record<string, Record<string, string>> = {};
  for (const r of t.rader ?? []) {
    const v = String(r[0]).trim().match(/^vecka (\d+)/i)?.[1];
    if (!v) continue;
    veckor[v] = Object.fromEntries(d.nivaer.map((n, i) => [slugAv(n.namn), String(r[i + 1] ?? '').trim()]));
  }
  return { rubrik: t.rubrik, adress: tabellensAdress(d, id, t.rubrik) ?? `/stodundervisning/${id}`, veckor, ...(t.not ? { not: t.not } : {}) };
}

/** Faktarutans grupp som tal: "En till fyra elever" ger 1 och 4. */
export function gruppensStorlek(text?: string): { min?: number; max?: number } {
  const TAL: Record<string, number> = { en: 1, ett: 1, två: 2, tre: 3, fyra: 4, fem: 5, sex: 6, sju: 7, åtta: 8, nio: 9, tio: 10, elva: 11, tolv: 12 };
  const tal = (x: string) => (/^\d+$/.test(x) ? Number(x) : TAL[x.toLowerCase()]);
  const m = (text ?? '').trim().match(/^(\S+)\s+(?:till|[–-])\s+(\S+)\s+elever/i);
  if (m && tal(m[1]) && tal(m[2])) return { min: tal(m[1]), max: tal(m[2]) };
  const h = (text ?? '').trim().match(/^högst (\S+) elever/i);
  return h && tal(h[1]) ? { max: tal(h[1]) } : {};
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
  const grupp = d.grupp ? { text: d.grupp, ...gruppensStorlek(d.grupp) } : undefined;
  const nivaTabell = bank ? undefined : nivaTabellen(d, m.id);
  const forstaChecklista = !!d.checklista && /första|pass 1\b/i.test(d.checklista.rubrik);
  return {
    id: m.id,
    titel: d.titel,
    omrade: d.omrade,
    ...(d.undertitel ? { undertitel: d.undertitel } : {}),
    adress: `${site.url.replace(/^https?:\/\//, '')}/stodundervisning/${m.id}`,
    sida: `/stodundervisning/${m.id}`,
    ...(uppdaterad ? { uppdaterad, uppdateradText: formateraDatum(d.uppdaterad!) } : {}),
    mal: planensMal(m) ?? '',
    tid: d.tid,
    period: d.period,
    ...(d.progression ? { progression: { enhet: d.progression.enhet, rader: d.progression.rader.map((r) => ({ ...r, kort: r.rubrik ?? (kurs[r.vecka]?.titel || postensRad(r.fokus, 80)) })) } } : {}),
    uppfoljning: { rader: d.uppfoljning?.rader ?? [] },
    checklista: d.checklista?.punkter ?? [],
    ...(d.checklista ? { checklistaRubrik: d.checklista.rubrik } : {}),
    forstaChecklista,
    ...(bank ? { bank } : {}),
    harLathund: harLathund(d),
    saker: await planensSaker(m),
    ...(Object.keys(kurs).length ? { kursveckor: Object.fromEntries(Object.entries(kurs).map(([v, k]) => [v, k.adress])) } : {}),
    ...(passet ? { passet } : {}),
    ...(d.plan?.passen ? { passen: d.plan.passen.map((p) => ({ nar: p.nar, text: p.text, ...(p.kort ? { kort: p.kort } : {}), ...(p.tabell ? { tabell: passetsTabell(d, m.id, p.tabell) } : {}) })) } : {}),
    ...(d.principer ? { principer: { rubrik: d.principer.rubrik, text: d.principer.text, adress: `${sida}#principer` } } : {}),
    ...(d.gruppen ? { gruppen: { rubrik: d.gruppen.rubrik, text: d.gruppen.text, adress: `${sida}#gruppen` } } : {}),
    ...(grupp ? { grupp } : {}),
    ...(d.hem ? { hem: { rubrik: d.hem.rubrik, text: postensRad(d.hem.text[0], 240), adress: `${sida}#hem` } } : {}),
    ...(fastnar.length ? { fastnar } : {}),
    ...(centrala.length ? { centrala } : {}),
    ...(d.mal ? { malAdress: `${sida}#mal` } : {}),
    ...(d.plan?.fore ? { fore: d.plan.fore } : {}),
    ...(d.plan?.justera ? { justera: d.plan.justera } : {}),
    ...(d.plan?.upprepa ? { upprepa: d.plan.upprepa } : {}),
    ...(d.plan?.stege ? { stege: true } : {}),
    ...(!bank && d.nivaer.length >= 2 ? { nivaer: d.nivaer.map((n) => ({ namn: n.namn, slug: slugAv(n.namn), farg: `#${n.farg.toLowerCase()}` })) } : {}),
    ...(nivaTabell ? { nivaTabell } : {}),
  };
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
      poster: n.poster.map((p) => ({ id: p.id, nr: p.nr, titel: p.titel, taggar: (p.taggar ?? []).map(slugAv) })),
    })),
    taggar,
  };
}

/**
 * Felen som stoppar bygget för en metod som ska kunna planeras: standardens fel (tiden i varje rad i uppföljningen,
 * progressionens veckor, faktarutans tid och period), en metod utan mål och en tagg i progressionen som banken inte har.
 */
export async function insatsplanFel(m: Metod): Promise<string[]> {
  const fel = metodplan(m.data).fel;
  if (!planensMal(m)) fel.push('Metoden har inget mål för planen: skriv plan.mal i metodens fil, eller ge metoden ett lektionskort med ett mål.');
  const taggar = (m.data.progression?.rader ?? []).flatMap((r) => r.taggar ?? []);
  if (taggar.length) {
    const bank = harTaFram(m, 'texter') || harTaFram(m, 'problem') ? await planensBank(m) : undefined;
    if (!bank) fel.push(`Progressionen har taggar (${taggar.join(', ')}), men metoden har ingen bank med taggar att visa dem i.`);
    else for (const t of new Set(taggar)) if (!bank.taggar[t]) fel.push(`Progressionens tagg "${t}" finns inte i bankens taggar (${Object.keys(bank.taggar).join(', ')}).`);
  }
  // En tabell som planens pass hänvisar till finns i metoden, så att länken leder dit (betan 2026-10-24).
  for (const p of m.data.plan?.passen ?? []) if (p.tabell && !tabellensAdress(m.data, m.id, p.tabell)) fel.push(`Planens pass "${p.nar}" hänvisar till tabellen "${p.tabell}", som metoden inte har. Skriv tabellens rubrik som den står i metoden.`);
  if (m.data.plan?.stege && metodplan(m.data).plan?.stegEnhet !== 'veckor') fel.push('plan.stege gäller en progression i veckor, där gruppen kan börja på en senare vecka.');
  // Ett namn som ser ut som en sak i metoden men inte är någon av dem blir ingen länk i planen (K-493).
  const saker = metodensSaker(m.data, m.id);
  for (const [plats, text] of planensTexter(m.data)) for (const namn of olankadeSaker(text, saker)) fel.push(`${plats} nämner "${namn}", men metoden har ingen sak som heter så, och då blir det ingen länk i planen. Skriv namnet som bladet, kortet eller mallen heter i metoden, eller lägg saken i metoden (STIL.md under Hänvisningar).`);
  return fel.map((f) => `${m.id}: ${f}`);
}
