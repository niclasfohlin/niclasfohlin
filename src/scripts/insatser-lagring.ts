// Lärarens planer (Planera insatsen, K-489) sparas bara i webbläsaren, under nyckeln insatser: valen som länkens form
// (kodaVal i src/lib/standard/plan.js), gruppens namn, bockarna för genomförda pass och en kopia av passens och veckornas
// datum, så att metodbanken och metodens sida kan visa Dina insatser utan att räkna om planen. Inget av det skickas
// någonstans. Lagringen kan vara avstängd eller rensas (privat läge, en skola som rensar webbläsaren); då säger sidan det,
// och länken till planen är kopian som håller.
import { lasVal, passetsTid, plusDagar, tidText, veckodag, VECKODAGAR, type Foljd, type Plan, type Val } from '../lib/standard/index.js';

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
}

const NYCKEL = 'insatser';

/** Planerna i webbläsaren, och om lagringen gick att läsa. */
export function lasPlaner(): { planer: SparadPlan[]; ok: boolean } {
  try {
    const varde = JSON.parse(localStorage.getItem(NYCKEL) ?? '{"v":1,"planer":[]}');
    return { planer: Array.isArray(varde?.planer) ? varde.planer.filter((p: SparadPlan) => p && typeof p.id === 'string' && typeof p.metod === 'string') : [], ok: true };
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
    return [v.nr, v.innehall, v.igen ? 1 : 0, datum[0] ?? v.mandag, datum[datum.length - 1] ?? plusDagar(v.mandag, 4)];
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
