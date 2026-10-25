// Lärarens planer (Planera insatsen, K-489) sparas bara i webbläsaren, under nyckeln insatser: valen som länkens form
// (kodaVal i src/lib/standard/plan.js), gruppens namn, bockarna för genomförda pass och en kopia av passens och veckornas
// datum, så att metodbanken och metodens sida kan visa Dina insatser utan att räkna om planen. Inget av det skickas
// någonstans, utom att en plan som pågår säger det till besöksstatistiken med bara metodens namn (pagaende nedan).
// Lagringen kan vara avstängd eller rensas (privat läge, en skola som rensar webbläsaren); då säger sidan det, och
// länken till planen är kopian som håller.
import { arDatum, lasVal, mandagen, passetsTid, planvecka, plusDagar, rensaFoljd, tidText, veckodag, veckonyckel, VECKODAGAR, type Foljd, type Plan, type Val } from '../lib/standard/index.js';

export interface SparadPlan {
  id: string;
  metod: string;
  titel: string;
  /** Metodens område, för färgen i Dina insatser. */
  omrade?: string;
  namn: string;
  /** Valen i länkens form. */
  val: string;
  /** Följer läraren insatsen (Niclas 2026-10-24: "man enkelt bara kan ha en planläggare", och följa insatsen som ett val). */
  folj?: boolean;
  /** Bockarna, närvaron, skattningarna, resultaten och besluten. Elevernas namn står bara här och i lärarens kopia. */
  foljd?: Foljd;
  /** När läraren senast sparade en kopia som fil, ÅÅÅÅ-MM-DD. */
  kopia?: string;
  /** När planen senast ändrades, ÅÅÅÅ-MM-DDTHH:MM:SS i läsarens tid, så att två kopior från samma dag går att skilja åt (granskningen 2026-10-24). */
  andrad: string;
  /** Metodens datum när planen gjordes, så att planen kan säga till när metoden har ändrats efteråt. */
  uppdaterad?: string;
  /** Passen (dag, vecka, nummer och tiden när läraren har satt en) och veckorna (nummer, metodens vecka, upprepad, första och sista dagen). */
  schema: { pass: ([string, number, number] | [string, number, number, string])[]; veckor: [number, number, number, string, string][] };
  /** Hur många av planens pass som är bockade, till Dina insatser (Codex 2026-10-24: bockar på dagar som inte längre har pass räknades med). */
  bockade?: number;
}

const NYCKEL = 'insatser';

const text = (x: unknown, max: number) => (typeof x === 'string' ? x.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');
const tidpunkt = (x: unknown) => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(x) ? x : undefined);
const heltal = (x: unknown) => Number.isInteger(x) && (x as number) >= 0;
/**
 * En plan ur lagringen eller ur en kopia som fil, rensad till det sidorna kan visa, så att ett fält som har ändrats för hand
 * aldrig får sidorna att stanna (Codex 2026-10-24). En plan utan id eller metod är ingen plan.
 */
export function rensaPlan(x: unknown): SparadPlan | null {
  const p = (x && typeof x === 'object' ? x : {}) as Record<string, any>;
  if (typeof p.id !== 'string' || !/^[a-z0-9]{4,12}$/.test(p.id) || typeof p.metod !== 'string' || !/^[a-z0-9-]{1,80}$/.test(p.metod)) return null;
  const schema = p.schema && typeof p.schema === 'object' ? p.schema : {};
  const rader = (y: unknown) => (Array.isArray(y) ? y.filter((r) => Array.isArray(r)) : []) as unknown[][];
  const pass = rader(schema.pass).filter((r) => arDatum(r[0]) && heltal(r[1]) && heltal(r[2]) && (r[3] === undefined || (typeof r[3] === 'string' && /^\d{2}:\d{2}$/.test(r[3])))) as SparadPlan['schema']['pass'];
  const veckor = rader(schema.veckor).filter((r) => heltal(r[0]) && heltal(r[1]) && (r[2] === 0 || r[2] === 1) && arDatum(r[3]) && arDatum(r[4])) as SparadPlan['schema']['veckor'];
  const kopia = tidpunkt(p.kopia), uppdaterad = tidpunkt(p.uppdaterad);
  return {
    id: p.id, metod: p.metod, titel: text(p.titel, 160), ...(typeof p.omrade === 'string' ? { omrade: text(p.omrade, 40) } : {}),
    namn: text(p.namn, 40), val: typeof p.val === 'string' ? p.val.slice(0, 4000) : '', folj: p.folj === true, foljd: rensaFoljd(p.foljd),
    ...(kopia ? { kopia } : {}), andrad: tidpunkt(p.andrad) ?? '', ...(uppdaterad ? { uppdaterad } : {}), schema: { pass, veckor },
    ...(heltal(p.bockade) ? { bockade: p.bockade } : {}),
  };
}

/** Planerna i webbläsaren, rensade, och om lagringen gick att läsa. */
export function lasPlaner(): { planer: SparadPlan[]; ok: boolean } {
  try {
    const varde = JSON.parse(localStorage.getItem(NYCKEL) ?? '{"v":1,"planer":[]}');
    return { planer: Array.isArray(varde?.planer) ? varde.planer.map(rensaPlan).filter((p: SparadPlan | null): p is SparadPlan => !!p) : [], ok: true };
  } catch {
    return { planer: [], ok: false };
  }
}

/** Skriver planerna; false när lagringen är avstängd eller full. */
export function skrivPlaner(planer: SparadPlan[]): boolean {
  try {
    localStorage.setItem(NYCKEL, JSON.stringify({ v: 1, planer }));
    return true;
  } catch {
    return false;
  }
}

/** Ett nytt id för en plan, sex tecken. Det står i länken, så att samma plan känns igen på en annan enhet. */
export const nyttId = () => Math.random().toString(36).slice(2, 8).padEnd(6, '0');

/** Dagens datum i läsarens egen tid, ÅÅÅÅ-MM-DD. */
export const idagLokalt = () => new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/** Klockslaget nu, ÅÅÅÅ-MM-DDTHH:MM:SS i läsarens tid. */
export const nuTid = () => {
  const d = new Date();
  const t = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${t(d.getMonth() + 1)}-${t(d.getDate())}T${t(d.getHours())}:${t(d.getMinutes())}:${t(d.getSeconds())}`;
};

/** Kopian av planens datum som sparas med planen, med passets tid när läraren har satt en. */
export const schemaAv = (plan: Plan, val?: Val): SparadPlan['schema'] => ({
  pass: plan.pass.map((p) => { const tid = val ? passetsTid(val, p) : undefined; return tid ? [p.datum, p.vecka, p.nr, `${tid[0]}`] : [p.datum, p.vecka, p.nr]; }),
  veckor: plan.veckor.map((v) => {
    const datum = v.pass.map((n) => plan.pass[n - 1].datum).sort();
    return [v.nr, planvecka(plan, v), v.igen ? 1 : 0, datum[0] ?? v.mandag, datum[datum.length - 1] ?? plusDagar(v.mandag, 4)];
  }),
});

/** "i dag", "i morgon" eller "onsdag 18 november". */
export function narText(datum: string, idag: string) {
  if (datum === idag) return 'i dag';
  if (datum === plusDagar(idag, 1)) return 'i morgon';
  const [, m, d] = datum.split('-').map(Number);
  const manader = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
  return `${VECKODAGAR[veckodag(datum) - 1]} ${d} ${manader[m - 1]}`;
}

/** Var planen står i dag, ur kopian: veckan i planen och nästa pass, eller att den inte har börjat eller är slut. */
export function lageAv(p: SparadPlan, idag: string): { text: string; vecka?: number } {
  const pass = [...p.schema.pass].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const nasta = pass.find((x) => x[0] >= idag);
  if (!pass.length) return { text: 'Planen har inga pass' };
  // En plan som är slut öppnas på Efter insatsen, utan vecka i länken.
  if (!nasta) return { text: `Insatsen är slut. Sista passet var ${narText(pass[pass.length - 1][0], idag)}` };
  const v = p.schema.veckor.find((x) => x[0] === nasta[1]);
  const kl = nasta[3] ? ` kl. ${tidText(nasta[3])}` : '';
  if (nasta === pass[0] && nasta[0] > idag) return { text: `Första passet ${narText(nasta[0], idag)}${kl}`, vecka: v?.[0] };
  return { text: `Vecka ${v?.[1] ?? '?'}${v?.[2] ? ' igen' : ''} i planen, pass ${nasta[2]} ${narText(nasta[0], idag)}${kl}`, vecka: v?.[0] };
}

/** Dagen för planens nästa pass från och med i dag, eller 9999 när planen är slut: planerna ordnas efter den. */
export const nastaPassAv = (p: SparadPlan, idag: string) => p.schema.pass.map((x) => x[0]).filter((d) => d >= idag).sort()[0] ?? '9999';
/** Planerna med nästa pass först, och en plan som är slut sist. */
export const iTurOrdning = (idag: string) => (a: SparadPlan, b: SparadPlan) => (nastaPassAv(a, idag) < nastaPassAv(b, idag) ? -1 : nastaPassAv(a, idag) > nastaPassAv(b, idag) ? 1 : a.andrad < b.andrad ? 1 : -1);

/** Namnen på flera planer, där två likadana skiljs åt med ett nummer: "Mån, ons, fre från 26 okt" och "… · 2" (buggjakten 2026-10-24). */
export function skiljNamnen(namn: string[]): string[] {
  const sedda = new Map<string, number>();
  return namn.map((n) => { const i = (sedda.get(n) ?? 0) + 1; sedda.set(n, i); return i > 1 ? `${n} · ${i}` : n; });
}

const MANAD_KORT = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
/** Planens namn: gruppens, eller dagarna och första passet, som "Mån, ons, fre från 2 nov" (granskningen 2026-10-24: två planer utan namn såg likadana ut). */
export function planensNamn(p: { namn?: string; val: string; schema?: SparadPlan['schema'] }): string {
  if (p.namn) return p.namn;
  const v = lasVal(p.val)?.val;
  if (!v) return 'Plan utan namn';
  const dagar = [...v.dagar].sort().map((d) => VECKODAGAR[d - 1].slice(0, 3)).join(', ');
  // Efter första passet, som efter ett lov i första veckan inte är planens startdag (de kalla läsarna 2026-10-24).
  const forsta = p.schema?.pass.map((x) => x[0]).sort()[0] ?? v.start;
  const [, m, d] = forsta.split('-').map(Number);
  return `${dagar.charAt(0).toLocaleUpperCase('sv')}${dagar.slice(1)} från ${d} ${MANAD_KORT[m - 1]}`;
}

// Pågående insatser i statistiken (K-504, Niclas 2026-10-25: "en lista på pågående Planerade insatser just nu i antal för
// sin metod"). En sparad plan som är inne i sina veckor, från veckan med första passet till veckan med det sista, säger
// det till GoatCounter en gång i veckan, måndag till söndag, när en sida som läser planerna öppnas: händelsen
// planera:<metod>:pagar, och :2 och :3 för en andra och tredje plan för samma metod i samma webbläsare, eftersom
// GoatCounter räknar besökare och inte händelser. Händelsen bär bara metoden, aldrig planens namn, gruppen eller
// eleverna. Statistiksidan räknar dem under Pågående insatser (src/pages/statistik.astro, DRIFT.md under
// Besöksstatistik).
const PAGAR = 'insatser-pagar';
export const PAGAR_HOGST = 3;
/** Händelserna för planerna som pågår den här veckan, med planens id, i en fast ordning så att numret står kvar veckan ut. */
export function pagaendeHandelser(planer: SparadPlan[], idag: string): { id: string; path: string; title: string }[] {
  const perMetod = new Map<string, number>();
  const ut: { id: string; path: string; title: string }[] = [];
  for (const p of [...planer].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const dagar = p.schema.pass.map((x) => x[0]).sort();
    if (!dagar.length || idag < mandagen(dagar[0]) || idag > plusDagar(mandagen(dagar[dagar.length - 1]), 6)) continue;
    const n = (perMetod.get(p.metod) ?? 0) + 1;
    perMetod.set(p.metod, n);
    if (n <= PAGAR_HOGST) ut.push({ id: p.id, path: `planera:${p.metod}:pagar${n > 1 ? `:${n}` : ''}`, title: `${p.titel}: en insats pågår` });
  }
  return ut;
}
/**
 * Säger GoatCounter vilka planer som pågår, en gång per plan och vecka. count.js laddas bara på sajtens egen adress
 * (Base.astro) och kan vara stoppad av en annonsblockerare; då räknas inget, och veckan prövas igen nästa gång.
 */
export function raknaPagaende(planer: SparadPlan[], idag = idagLokalt()) {
  const skicka = () => {
    const gc = (window as { goatcounter?: { count?: (v: object) => void } }).goatcounter;
    if (!gc?.count) return;
    let skickade: Record<string, string>;
    try { skickade = JSON.parse(localStorage.getItem(PAGAR) ?? '{}') ?? {}; } catch { return; }
    const vecka = veckonyckel(mandagen(idag));
    const handelser = pagaendeHandelser(planer, idag);
    const nya: Record<string, string> = {};
    for (const h of handelser) {
      if (skickade[h.id] !== vecka) gc.count({ path: h.path, title: h.title, event: true });
      nya[h.id] = vecka;
    }
    try { localStorage.setItem(PAGAR, JSON.stringify(nya)); } catch { /* räknas igen nästa gång */ }
  };
  // count.js laddas asynkront; sidans load-händelse väntar in det.
  if (document.readyState === 'complete') skicka();
  else addEventListener('load', skicka, { once: true });
}
