// Lärarens planer (Planera insatsen, K-489) sparas bara i webbläsaren, under nyckeln insatser: valen som länkens form
// (kodaVal i src/lib/standard/plan.js), gruppens namn, bockarna för genomförda pass och en kopia av passens och veckornas
// datum, så att metodbanken och metodens sida kan visa Dina insatser utan att räkna om planen. Inget av det skickas
// någonstans, utom att en plan som pågår säger det till besöksstatistiken med bara metodens namn (pagaende nedan).
// Lagringen kan vara avstängd eller rensas (privat läge, en skola som rensar webbläsaren); då säger sidan det, och
// länken till planen är kopian som håller.
import { arDatum, talText, filnamnet, kodaVal, dagText, gangen, insatsenAvslutad, lasVal, planensSistaDag, mandagen, passetsTid, planvecka, planveckan, plusDagar, rensaFoljd, rentText, spannKort, stor, tidText, tvasiffrigt, veckansDagar, veckodagKort, veckonyckel, type Foljd, type Plan, type Val } from '../lib/standard/index.js';

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
  /** Passen (dag, vecka, nummer och tiden när läraren har satt en), veckorna (nummer, metodens vecka, upprepad, första och sista dagen) och planens sista dag, när uppföljningen efter kommer efter sista passet. */
  schema: { pass: ([string, number, number] | [string, number, number, string])[]; veckor: [number, number, number, string, string][]; sista?: string };
  /** Hur många av planens pass som är bockade, till Dina insatser (Codex 2026-10-24: bockar på dagar som inte längre har pass räknades med). */
  bockade?: number;
}

const NYCKEL = 'insatser';

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
    id: p.id, metod: p.metod, titel: rentText(p.titel, 160), ...(typeof p.omrade === 'string' ? { omrade: rentText(p.omrade, 40) } : {}),
    namn: rentText(p.namn, 40), val: typeof p.val === 'string' ? p.val.slice(0, 20000) : '', folj: p.folj === true, foljd: rensaFoljd(p.foljd),
    ...(kopia ? { kopia } : {}), andrad: tidpunkt(p.andrad) ?? '', ...(uppdaterad ? { uppdaterad } : {}), schema: { pass, veckor, ...(arDatum(schema.sista) ? { sista: schema.sista } : {}) },
    ...(heltal(p.bockade) ? { bockade: p.bockade } : {}),
  };
}

/**
 * Planens format, lika i lagringen och i planen som fil. Det som har sparats eller laddats ner från Planera 0.2.7 och framåt
 * öppnas alltid i en senare version, med allt det har (Niclas 2026-10-25: "bakåtkompatibilitet med äldre json filer. Så nya
 * itterationer funkar med den och lägger in data som finns och varnar bara när data inte finns i den gamla om det behövs",
 * och "från och med den som är uppe nu ska det bara bakåtkompatibilitet från den och framåt"). Ett fält som läggs till får
 * sitt standardvärde när det saknas. Ett fält som byter betydelse eller tas bort höjer formatets version och får en
 * konvertering från versionen före i KONVERTERINGAR. Provfilerna i scripts/planera/filer/ är formatet som varje version skrev
 * det, och planprovet öppnar dem (PLANERA.md under Planens fil och lagringen).
 */
export const PLANFORMAT = 1;
/** Meningen när en nyare version av Planera insatsen har sparat planen eller planerna i webbläsaren. */
export const NYARE_VERSION = 'Planen är sparad i en nyare version av Planera insatsen. Ladda om sidan, så kommer allt med.';
export const PLANFILENS_TYP = 'planera-insatsen';
/**
 * Konverteringarna från en version av formatet till nästa: KONVERTERINGAR[1] gör en plan i version 1 till version 2 och
 * säger vad som saknades, när läraren behöver veta det. Inga än: version 1 har gällt sedan 0.2.7, och det som har lagts till
 * sedan dess har ett standardvärde.
 */
export const KONVERTERINGAR: Record<number, (plan: Record<string, unknown>) => { plan: Record<string, unknown>; varningar: string[] }> = {};
/** En plan i en äldre version av formatet, konverterad till den här, med varningarna, och en varning för en plan ur en nyare version. */
export function konverteraPlan(plan: unknown, v: unknown): { plan: unknown; varningar: string[] } {
  const fran = Number.isInteger(v) && (v as number) >= 1 ? (v as number) : 1;
  const varningar: string[] = [];
  let ut = plan;
  for (let x = fran; x < PLANFORMAT; x++) {
    const k = KONVERTERINGAR[x];
    if (k && ut && typeof ut === 'object') { const r = k(ut as Record<string, unknown>); ut = r.plan; varningar.push(...r.varningar); }
  }
  if (fran > PLANFORMAT) varningar.push(NYARE_VERSION);
  return { plan: ut, varningar };
}
/** Planen som fil: typen, formatets version, modulens version och planen. */
export const planfilen = (plan: SparadPlan, modul: string) => JSON.stringify({ typ: PLANFILENS_TYP, v: PLANFORMAT, modul, sparad: plan.andrad, plan }, null, 1);
/** En nedladdad plan, konverterad och rensad, med varningarna, eller null när filen inte är en plan. */
export function lasPlanfil(innehall: unknown): { plan: SparadPlan; varningar: string[] } | null {
  const f = innehall && typeof innehall === 'object' ? (innehall as Record<string, unknown>) : null;
  if (!f || f.typ !== PLANFILENS_TYP) return null;
  const { plan, varningar } = konverteraPlan(f.plan, f.v);
  const p = rensaPlan(plan);
  return p ? { plan: p, varningar } : null;
}

/** Planerna i webbläsaren, konverterade från lagringens version och rensade, om lagringen gick att läsa, och varningarna, som när en nyare version har sparat dem (Codex 2026-10-25). */
export function lasPlaner(): { planer: SparadPlan[]; ok: boolean; varningar: string[] } {
  try {
    const varde = JSON.parse(localStorage.getItem(NYCKEL) ?? `{"v":${PLANFORMAT},"planer":[]}`);
    const varningar = new Set<string>();
    const planer = Array.isArray(varde?.planer) ? varde.planer.map((x: unknown) => { const k = konverteraPlan(x, varde.v); k.varningar.forEach((w) => varningar.add(w)); return rensaPlan(k.plan); }).filter((p: SparadPlan | null): p is SparadPlan => !!p) : [];
    return { planer, ok: true, varningar: [...varningar] };
  } catch {
    return { planer: [], ok: false, varningar: [] };
  }
}

/** Skriver planerna i formatets version; false när lagringen är avstängd eller full. */
/**
 * Om planerna i webbläsaren är sparade av en nyare version. Då skriver den här versionen inget, så att det som den nyare
 * versionen sparade och den här inte känner till inte går förlorat (Codex 2026-10-25).
 */
export function lagringenArNyare(): boolean {
  try {
    return Number(JSON.parse(localStorage.getItem(NYCKEL) ?? '{}')?.v) > PLANFORMAT;
  } catch {
    return false;
  }
}
export function skrivPlaner(planer: SparadPlan[]): boolean {
  if (lagringenArNyare()) return false;
  try {
    localStorage.setItem(NYCKEL, JSON.stringify({ v: PLANFORMAT, planer }));
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
  return `${d.getFullYear()}-${tvasiffrigt(d.getMonth() + 1)}-${tvasiffrigt(d.getDate())}T${tvasiffrigt(d.getHours())}:${tvasiffrigt(d.getMinutes())}:${tvasiffrigt(d.getSeconds())}`;
};

/** Kopian av planens datum som sparas med planen, med passets tid när läraren har satt en. */
export const schemaAv = (plan: Plan, val?: Val): SparadPlan['schema'] => ({
  pass: plan.pass.map((p) => { const tid = val ? passetsTid(val, p) : undefined; return tid ? [p.datum, p.vecka, p.nr, `${tid[0]}`] : [p.datum, p.vecka, p.nr]; }),
  veckor: plan.veckor.map((v) => { const d = veckansDagar(plan, v); return [v.nr, planvecka(plan, v), v.igen ? 1 : 0, d.fran, d.till]; }),
  ...(planensSistaDag(plan) && planensSistaDag(plan) !== plan.sistaPass ? { sista: planensSistaDag(plan) } : {}),
});

/** "i dag", "i morgon" eller "onsdag 18 november". */
export function narText(datum: string, idag: string) {
  if (datum === idag) return 'i dag';
  if (datum === plusDagar(idag, 1)) return 'i morgon';
  // Datumet ur standarden, som överallt i modulen (K-508).
  return dagText(datum);
}

/** Var planen står i dag, ur kopian: veckan i planen och nästa pass, eller att den inte har börjat eller är slut. */
export function lageAv(p: SparadPlan, idag: string): { text: string; vecka?: number } {
  const pass = [...p.schema.pass].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const nasta = pass.find((x) => x[0] >= idag);
  if (!pass.length) return { text: 'Planen har inga pass' };
  // En avslutad plan öppnas på Efter insatsen, utan vecka i länken. Märket Avslutad står före texten (statusAv).
  const sista = pass[pass.length - 1][0];
  if (statusAv(p, idag) === 'avslutad') return { text: `Sista passet ${sista < idag ? 'var' : 'är'} ${narText(sista, idag)}` };
  // Efter sista passet pågår insatsen tills läraren avslutar den, eller två veckor har gått (insatsenAvslutad).
  if (!nasta) return { text: `Utvärderingen återstår. Sista passet var ${narText(sista, idag)}` };
  const v = p.schema.veckor.find((x) => x[0] === nasta[1]);
  const kl = nasta[3] ? ` kl. ${tidText(nasta[3])}` : '';
  if (nasta === pass[0] && nasta[0] > idag) return { text: `Första passet ${narText(nasta[0], idag)}${kl}`, vecka: v?.[0] };
  // Vilken gång veckan tas räknas av standardens gangen, som i planen, ur kopians veckor.
  const gang = v ? gangen({ veckor: p.schema.veckor.map(([nr, innehall]) => ({ nr, innehall })) }, { nr: v[0], innehall: v[1], igen: v[2] === 1 }) : 0;
  return { text: `Vecka ${v ? planveckan(v[1], gang) : '?'} i planen, pass ${nasta[2]} ${narText(nasta[0], idag)}${kl}`, vecka: v?.[0] };
}

/** Dagen för planens nästa pass från och med i dag, eller 9999 när planen är slut: planerna ordnas efter den. */
export const nastaPassAv = (p: SparadPlan, idag: string) => p.schema.pass.map((x) => x[0]).filter((d) => d >= idag).sort()[0] ?? '9999';
/**
 * Insatsens läge ur planens pass och utvärderingens beslut, lika i metodbanken, på metodens sida och i planen (Niclas
 * 2026-10-25: "tre knappar: KOMMANDE PÅGÅENDE, AVSLUTAD"): kommande före första passet, avslutad när läraren har avslutat
 * insatsen eller två veckor efter sista passet (insatsenAvslutad i standarden), och pågående däremellan.
 */
export type Status = 'pagaende' | 'kommande' | 'avslutad';
export const STATUSNAMN: Record<Status, string> = { pagaende: 'Pågående', kommande: 'Kommande', avslutad: 'Avslutad' };
export function statusAv(p: SparadPlan, idag: string): Status {
  const datum = p.schema.pass.map((x) => x[0]).sort();
  if (!datum.length || insatsenAvslutad(datum[datum.length - 1], p.foljd?.utvardering?.beslut, idag, p.foljd?.oppen, p.schema.sista)) return 'avslutad';
  return datum[0] > idag ? 'kommande' : 'pagaende';
}
const STATUSORDNING: Record<Status, number> = { pagaende: 0, kommande: 1, avslutad: 2 };
/**
 * Planerna i tur och ordning: först efter läget, pågående, kommande och avslutade, inom läget efter datum, med nästa pass,
 * första passet och den senast avslutade först, och sedan efter område och metod (Niclas 2026-10-25: "Först dessa tre med
 * datumsortering, sedan efter insatstyp och metod"), och sist den senast ändrade.
 */
export const iTurOrdning = (idag: string) => (a: SparadPlan, b: SparadPlan) => {
  const sa = statusAv(a, idag), sb = statusAv(b, idag);
  if (sa !== sb) return STATUSORDNING[sa] - STATUSORDNING[sb];
  const datum = (p: SparadPlan) => {
    const d = p.schema.pass.map((x) => x[0]).sort();
    return sa === 'avslutad' ? d[d.length - 1] ?? '' : sa === 'kommande' ? d[0] ?? '' : nastaPassAv(p, idag);
  };
  const da = datum(a), db = datum(b);
  if (da !== db) return (da < db ? -1 : 1) * (sa === 'avslutad' ? -1 : 1);
  return (a.omrade ?? '').localeCompare(b.omrade ?? '', 'sv') || a.titel.localeCompare(b.titel, 'sv') || (a.andrad < b.andrad ? 1 : a.andrad > b.andrad ? -1 : 0);
};

/** Namnen på flera planer, där två likadana skiljs åt med ett nummer: "Mån, ons, fre från 26 okt" och "… · 2" (buggjakten 2026-10-24). */
export function skiljNamnen(namn: string[]): string[] {
  const sedda = new Map<string, number>();
  return namn.map((n) => { const i = (sedda.get(n) ?? 0) + 1; sedda.set(n, i); return i > 1 ? `${n} · ${i}` : n; });
}

/** Planens namn: gruppens, eller dagarna och första passet, som "Mån, ons, fre från 2 nov" (granskningen 2026-10-24: två planer utan namn såg likadana ut). */
export function planensNamn(p: { namn?: string; val: string; schema?: SparadPlan['schema'] }): string {
  if (p.namn) return p.namn;
  const v = lasVal(p.val)?.val;
  if (!v) return 'Plan utan namn';
  const dagar = [...v.dagar].sort().map((d) => veckodagKort(d)).join(', ');
  // Efter första passet, som efter ett lov i första veckan inte är planens startdag (de kalla läsarna 2026-10-24).
  const forsta = p.schema?.pass.map((x) => x[0]).sort()[0] ?? v.start;
  return `${stor(dagar)} från ${spannKort(forsta, forsta)}`;
}

/** Adressen till en sparad plan, och till en vecka i den. */
export const planensAdress = (p: { metod: string; val: string; id: string }, vecka?: number) => `/stodundervisning/${encodeURIComponent(p.metod)}/planera#${p.val}&p=${encodeURIComponent(p.id)}${vecka ? `&v=${vecka}` : ''}`;

/** GoatCounter, när count.js har laddats; det laddas bara på sajtens egen adress (Base.astro) och kan vara stoppat. */
export const goatcounter = () => (window as { goatcounter?: { count?: (v: object) => void } }).goatcounter;

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
    const gc = goatcounter();
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

// ---------- Alla planer som en fil, och flera planer in på en gång ----------
// Niclas 2026-10-28: "Det bör finnas en knapp för Ladda ner alla mina planer ... som laddar ner alla i en zip eller samlat
// med datum och bra namn", "Den knappen finns bara när man har en plan sparad", och "En Ladda upp alla planer knapp brevid
// som kan läsa in en zip eller enskilda filer. Även ladda upp planer bör kunna göra samma sak i en metod så allt har en rot".
// Zip-filen har varje plans fil ur planfilen, så att varje fil i den också öppnas för sig, och inget nytt format behövs.
// Zip-filen skrivs och läses här, utan beroenden: filerna lagras utan komprimering, och en zip som datorn har packat om
// läses också när den är komprimerad (deflate), med webbläsarens egen DecompressionStream.

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

/** En zip med filerna, utan komprimering. */
export function zipa(filer: { namn: string; text: string }[]): Blob {
  const kod = new TextEncoder();
  const delar: Uint8Array[] = [], katalog: Uint8Array[] = [];
  let plats = 0;
  for (const fil of filer) {
    const namn = kod.encode(fil.namn), data = kod.encode(fil.text), crc = crc32(data);
    const lokal = new DataView(new ArrayBuffer(30));
    // Lokalt huvud: signatur, version 20, flagga 0x0800 (namnet i UTF-8), metod 0, tid och datum 0, crc, storlekarna, namnets längd.
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, namn.length, 2]].forEach(([o, v, n]) => (n === 4 ? lokal.setUint32(o, v, true) : lokal.setUint16(o, v, true)));
    const central = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, namn.length, 2], [42, plats, 4]].forEach(([o, v, n]) => (n === 4 ? central.setUint32(o, v, true) : central.setUint16(o, v, true)));
    delar.push(new Uint8Array(lokal.buffer), namn, data);
    katalog.push(new Uint8Array(central.buffer), namn);
    plats += 30 + namn.length + data.length;
  }
  const storlek = katalog.reduce((n, d) => n + d.length, 0);
  const slut = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [8, filer.length, 2], [10, filer.length, 2], [12, storlek, 4], [16, plats, 4]].forEach(([o, v, n]) => (n === 4 ? slut.setUint32(o, v, true) : slut.setUint16(o, v, true)));
  return new Blob([...delar, ...katalog, new Uint8Array(slut.buffer)] as BlobPart[], { type: 'application/zip' });
}

/** Filerna i en zip, som text: lagrade eller komprimerade (deflate). En zip som inte går att läsa ger inga filer. */
export async function packaUpp(b: Uint8Array): Promise<{ namn: string; text: string }[]> {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength), avkod = new TextDecoder();
  let e = b.length - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) return [];
  const antal = v.getUint16(e + 10, true);
  let c = v.getUint32(e + 16, true);
  const ut: { namn: string; text: string }[] = [];
  for (let i = 0; i < antal && c + 46 <= b.length && v.getUint32(c, true) === 0x02014b50; i++) {
    const metod = v.getUint16(c + 10, true), storlek = v.getUint32(c + 20, true), nl2 = v.getUint16(c + 28, true), xl = v.getUint16(c + 30, true), kl = v.getUint16(c + 32, true), lokal = v.getUint32(c + 42, true);
    const namn = avkod.decode(b.subarray(c + 46, c + 46 + nl2));
    const start = lokal + 30 + v.getUint16(lokal + 26, true) + v.getUint16(lokal + 28, true);
    const data = b.subarray(start, start + storlek);
    c += 46 + nl2 + xl + kl;
    if (namn.endsWith('/')) continue;
    try {
      if (metod === 0) ut.push({ namn, text: avkod.decode(data) });
      else if (metod === 8 && typeof DecompressionStream !== 'undefined') ut.push({ namn, text: await new Response(new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text() });
    } catch { /* en fil som inte går att packa upp hoppas över */ }
  }
  return ut;
}

/**
 * Planerna i en eller flera filer, en plans fil eller en zip med flera, en rot för Öppna en nedladdad plan i metoden och
 * Öppna nedladdade planer på Stödundervisning. Varje plan läses med lasPlanfil och valen kodas om, som när en fil öppnas
 * för sig. En fil som inte är en plan räknas, så att beskedet kan säga det.
 */
export async function lasPlanfilerna(filer: File[]): Promise<{ planer: { plan: SparadPlan; varningar: string[] }[]; inte: number }> {
  const texter: string[] = [];
  let inte = 0;
  for (const fil of filer) {
    const b = new Uint8Array(await fil.arrayBuffer());
    if (b[0] === 0x50 && b[1] === 0x4b) {
      const i = await packaUpp(b);
      if (!i.length) inte++;
      texter.push(...i.filter((x) => /\.json$/i.test(x.namn)).map((x) => x.text));
    } else texter.push(new TextDecoder().decode(b));
  }
  const planer: { plan: SparadPlan; varningar: string[] }[] = [];
  for (const t of texter) {
    let innehall: unknown;
    try { innehall = JSON.parse(t); } catch { inte++; continue; }
    const last = lasPlanfil(innehall);
    const valen = last ? lasVal(last.plan.val) : null;
    if (!last || !valen) { inte++; continue; }
    last.plan.val = kodaVal(valen.val);
    planer.push(last);
  }
  // Samma plan i flera filer: den nyaste versionen, efter när planen senast ändrades (Niclas 2026-10-28: "Om en och samma
  // plan väljs som har flera filer ska uppladdningen ladda upp den nyaste versionen av en metods insats").
  const nyast = new Map<string, { plan: SparadPlan; varningar: string[] }>();
  for (const x of planer) { const f = nyast.get(x.plan.id); if (!f || x.plan.andrad > f.plan.andrad) nyast.set(x.plan.id, x); }
  return { planer: [...nyast.values()], inte };
}

/**
 * Planerna sparas, och en plan med samma id ersätts, utom när planen i webbläsaren är nyare än filen, så att en gammal fil
 * aldrig skriver över det läraren har fört in sedan. Svaret säger om det gick, hur många som sparades och hur många som var
 * äldre.
 */
export function sparaPlanerna(nya: SparadPlan[]): { ok: boolean; sparade: number; aldre: number } {
  const finns = lasPlaner().planer;
  const att = nya.filter((n) => { const f = finns.find((x) => x.id === n.id); return !f || f.andrad <= n.andrad; });
  const ok = skrivPlaner([...att, ...finns.filter((x) => !att.some((n) => n.id === x.id))]);
  return { ok, sparade: att.length, aldre: nya.length - att.length };
}

/** Filerna ur ett filfält, som töms, så att samma fil går att välja igen. */
export const valdaFiler = (e: Event) => { const input = e.target as HTMLInputElement; const filer = [...(input.files ?? [])]; input.value = ''; return filer; };

/** Planerna ur filerna sparas, och sidan laddas om med beskedet under nyckeln, en rot för metoden och Stödundervisning. */
export async function oppnaPlanerna(filer: File[], nyckel: string) {
  const { planer, inte } = await lasPlanfilerna(filer);
  const text = planernasBesked(sparaPlanerna(planer.map((x) => x.plan)), inte);
  try { sessionStorage.setItem(nyckel, text); } catch { /* utan lagring */ }
  location.reload();
}

/** Beskedet efter att planer har lästs in, lika i metoden och på Stödundervisning. */
export const planernasBesked = (r: { ok: boolean; sparade: number; aldre: number }, inte: number) => (!r.ok ? 'Planerna gick inte att spara i den här webbläsaren.'
  : [r.sparade ? `${r.sparade === 1 ? 'En plan är öppnad' : `${stor(talText(r.sparade))} planer är öppnade`} ur filerna, med allt som förts in. De står under Dina insatser och under sin metod.` : '',
    r.aldre ? `${r.aldre === 1 ? 'En plan' : `${stor(talText(r.aldre))} planer`} i webbläsaren var nyare än filen och står kvar.` : '',
    inte ? `${inte === 1 ? 'En fil' : `${stor(talText(inte))} filer`} var inte en nedladdad plan.` : ''].filter(Boolean).join(' ') || 'Filerna hade ingen plan.');

/** Zip-filen med alla sparade planer, en plans fil i taget ur planfilen, och filens namn med dagens datum. */
export function allaPlanerna(modul: string, idag: string): { blob: Blob; namn: string } | null {
  const { planer } = lasPlaner();
  if (!planer.length) return null;
  const tagna = new Set<string>();
  const filer = planer.map((p) => {
    let namn = filnamnet('plan', { vem: p.namn, metod: p.metod, datum: idag });
    for (let i = 2; tagna.has(namn); i++) namn = namn.replace(/(-\d+)?\.json$/, `-${i}.json`);
    tagna.add(namn);
    return { namn, text: planfilen(p, modul) };
  });
  return { blob: zipa(filer), namn: `alla-planer-stodundervisning-${idag}.zip` };
}
