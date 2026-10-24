// Planera insatsen (K-489; Niclas 2026-10-24: "Planera insatsen gillar jag", och "bygg EN som du testar på flera olika
// sätt att den funkar. dvs en standard"): det metodens plansida, /stodundervisning/<id>/planera, behöver ur metodens fil
// vid bygget. Planen räknas fram i webbläsaren av standardens planmotor (src/lib/standard/plan.js) ur samma fält, så att
// sidan, riggen och provet räknar lika. Hur fälten skrivs står i METODER.md under Planera insatsen.
import type { CollectionEntry } from 'astro:content';
import { metodplan, postensRad, slugAv } from './standard/index.js';
import { bankAv, nivaFarger } from './bank';
import { harTaFram, taFramAv } from './tafram';
import { formateraDatum } from './innehall';
import { harLathund } from './metod';
import { metodensLektionskort } from './lektionskort';
import { lektionskortetsPapper } from './lektionskortdata';
import { site } from '../data/site';

type Metod = CollectionEntry<'stodundervisning'>;

/**
 * Kan metoden planeras? Varje rad i uppföljningen har sin tid (fältet tid). Under steg 1 och 2 gäller det de metoder som
 * har fått fälten; i steg 3 får alla metoder dem, och då stannar bygget på en metod utan.
 */
export const planbar = (d: Metod['data']) => !!d.uppfoljning?.rader.length && d.uppfoljning.rader.every((r) => r.tid !== undefined);

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
  uppfoljning: { rader: { nar: string; vad: string; tid?: string }[] };
  checklista: string[];
  bank?: PlanBank;
  harLathund: boolean;
}

/** Planens data ur metodens fil. */
export async function planensData(m: Metod): Promise<PlanData> {
  const d = m.data;
  const bank = harTaFram(m, 'texter') || harTaFram(m, 'problem') ? await planensBank(m) : undefined;
  const uppdaterad = d.uppdaterad ? (d.uppdaterad instanceof Date ? d.uppdaterad.toISOString().slice(0, 10) : String(d.uppdaterad).slice(0, 10)) : undefined;
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
    ...(d.progression ? { progression: { enhet: d.progression.enhet, rader: d.progression.rader.map((r) => ({ ...r, kort: r.rubrik ?? postensRad(r.fokus, 80) })) } } : {}),
    uppfoljning: { rader: d.uppfoljning?.rader ?? [] },
    checklista: d.checklista?.punkter ?? [],
    ...(bank ? { bank } : {}),
    harLathund: harLathund(d),
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
  return fel.map((f) => `${m.id}: ${f}`);
}
