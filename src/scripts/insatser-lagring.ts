// Lärarens planer (Planera insatsen, K-489) sparas bara i webbläsaren, under nyckeln insatser: valen som länkens form
// (kodaVal i src/lib/standard/plan.js), gruppens namn, bockarna för genomförda pass och en kopia av passens och veckornas
// datum, så att metodbanken och metodens sida kan visa Dina insatser utan att räkna om planen. Inget av det skickas
// någonstans, utom att en plan som pågår säger det till besöksstatistiken med bara metodens namn (pagaende nedan).
// Lagringen kan vara avstängd eller rensas (privat läge, en skola som rensar webbläsaren); då säger sidan det, och
// länken till planen är kopian som håller.
import { goatcounter, idagLokalt } from './raknare.ts';
import { begarVaraktigLagring } from './webblasaren.ts';
import { PLANKNAPPAR, liten, arDatum, talText, filnamnet, forstaLektionensDag, forstaSkolveckanEfter, SAMLINGARNAS_LED, skolveckan, kodaVal, dagarMellan, larDigetsLaget, datumText, dagText, gangen, insatsenAvslutad, lasVal, planensSistaDag, mandagen, passetsTid, planvecka, planveckan, plusDagar, rensaFoljd, planensDagar, rentText, stor, tidText, tvasiffrigt, veckansDagar, veckanFor, veckonyckel, type Foljd, type Plan, type Val } from '../lib/standard/index.js';

export interface SparadPlan {
  id: string;
  metod: string;
  /**
   * Samlingen planen hör till: Planera insatsen i Stödundervisning, eller Lär dig metoden i Metoder (K-628). En plan som
   * sparades före fältet hör till Stödundervisning (rensaPlan), och Dina insatser och Dina planer visar bara sin samlings.
   */
  samling?: Samling;
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
  /** Dagen planen sparades första gången, ÅÅÅÅ-MM-DD, där Före börjar i Lär dig metoden (K-628). En plan utan fältet börjar Före när den senast ändrades. */
  skapad?: string;
  /** Metodens datum när planen gjordes, så att planen kan säga till när metoden har ändrats efteråt. */
  uppdaterad?: string;
  /** Passen (dag, vecka, nummer och tiden när läraren har satt en), veckorna (nummer, metodens vecka, upprepad, första och sista dagen), planens sista dag, när uppföljningen efter kommer efter sista passet, och veckan efter stegen, som läget i Lär dig metoden läser (larDigetsLaget). */
  schema: { pass: ([string, number, number] | [string, number, number, string])[]; veckor: [number, number, number, string, string][]; sista?: string; efter?: string };
  /** Hur många av planens pass som är bockade, till Dina insatser (Codex 2026-10-24: bockar på dagar som inte längre har pass räknades med). */
  bockade?: number;
}

const NYCKEL = 'insatser';

/** Samlingarna med planer: Stödundervisning med Planera insatsen och Metoder med Lär dig metoden (K-628). */
export const SAMLINGAR = ['stodundervisning', 'metoder'] as const;
export type Samling = (typeof SAMLINGAR)[number];
/**
 * Samlingens ord i listan med planerna, på metodens sida och i beskedet efter Öppna planer, en tabell för båda samlingarna
 * (K-628). På appens sida står listan också utan planer, med raden tom och banken där planerna görs (K-644).
 */
export const SAMLINGENS_ORD: Record<Samling, { led: string; listan: string; din: string; dina: (n: number) => string; enLank: string; flera: string; avslutade: (n: number) => string; lista: string; pagar: string; tom: string; bank: { namn: string; adress: string } }> = {
  stodundervisning: { led: SAMLINGARNAS_LED.stodundervisning, listan: 'Dina insatser', din: 'Din insats', dina: (n) => `Dina insatser · ${n} grupper`, enLank: 'Veckan i planen', flera: 'Planerna', avslutade: (n) => (n === 1 ? 'En avslutad insats' : `${n} avslutade insatser`), lista: 'Metodbanken: en plan under Dina insatser', pagar: 'Din insats på metodens sida', tom: 'Inga insatser än. Du planerar en insats med Planera insatsen på en metods sida i', bank: { namn: 'Stöd', adress: '/stodundervisning' } },
  metoder: { led: SAMLINGARNAS_LED.metoder, listan: 'Dina planer', din: 'Din plan', dina: (n) => `Dina planer · ${n}`, enLank: 'Lär dig metoden', flera: 'Planerna', avslutade: (n) => (n === 1 ? 'En avslutad plan' : `${n} avslutade planer`), lista: 'Metoder: en plan under Dina planer', pagar: 'Din plan på metodens sida', tom: 'Inga planer än. Du gör en plan med Lär dig metoden på en metods sida i', bank: { namn: 'Metoder', adress: '/metoder' } },
};
/**
 * Nyckeln för beskedet som en sida lämnar när den skickar läraren till en plan i en annan samling, så att beskedet visas på
 * planens sida, Planera insatsen eller Lär dig metoden (lanseringen 2026-10-31: en plan ur Lär dig metoden som öppnades på
 * Planera insatsens sida fick beskedet under Planeras nyckel).
 */
export const BESKEDETS_NYCKEL: Record<Samling, string> = { stodundervisning: 'pl-besked', metoder: 'ld-besked' };
/** Knapparna under listan med planerna, i båda samlingarna och på appens sida (Niclas 2026-10-28). */
export const LISTANS_KNAPPAR = Object.freeze({ laddaNer: 'Ladda ner planer', oppna: 'Öppna planer' });
/**
 * Raden på en bank när webbläsaren inte har några planer, med Öppna planer under, så att planerna går att öppna ur en fil på
 * varje sida, också på en ny dator (Niclas 2026-10-31: "ladda upp kan ta emot zip eller enskilda filer oavsett vilken sida man
 * är på"; planprovet i en tom webbläsare).
 */
export const PLANERNA_I_EN_FIL = 'Har du planer i en fil, från en annan dator eller telefon?';
/** Planens samling, med Stödundervisning för en plan utan fältet. */
export const samlingen = (p: { samling?: unknown }): Samling => (p.samling === 'metoder' ? 'metoder' : 'stodundervisning');
/** Planerna i en samling. */
export const iSamlingen = <T extends { samling?: unknown }>(planer: T[], samling: Samling) => planer.filter((p) => samlingen(p) === samling);

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
    id: p.id, metod: p.metod, samling: samlingen(p), titel: rentText(p.titel, 160), ...(typeof p.omrade === 'string' ? { omrade: rentText(p.omrade, 40) } : {}),
    namn: rentText(p.namn, 40), val: typeof p.val === 'string' ? p.val.slice(0, 20000) : '', folj: p.folj === true, foljd: rensaFoljd(p.foljd),
    ...(kopia ? { kopia } : {}), andrad: tidpunkt(p.andrad) ?? '', ...(arDatum(p.skapad) ? { skapad: p.skapad } : {}), ...(uppdaterad ? { uppdaterad } : {}), schema: { pass, veckor, ...(arDatum(schema.sista) ? { sista: schema.sista } : {}), ...(arDatum(schema.efter) ? { efter: schema.efter } : {}) },
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
export const PLANFORMAT = 2;
/** Meningen när en nyare version av Planera insatsen har sparat planen eller planerna i webbläsaren. */
export const NYARE_VERSION = 'Planen är sparad i en nyare version av Planera insatsen. Ladda om sidan, så kommer allt med.';
export const PLANFILENS_TYP = 'planera-insatsen';
/**
 * Konverteringarna från en version av formatet till nästa: KONVERTERINGAR[1] gör en plan i version 1 till version 2 och
 * säger vad som saknades, när läraren behöver veta det. Version 1 gällde från 0.2.7 till 0.8.2. Version 2, från Planera
 * 0.9.0, har samma fält och de nya för Lär dig metoden (samling, skapad och klasserna i följden), så en plan i version 1 är
 * en plan i version 2 som den är. Versionen höjdes så att en flik med en äldre version, som står öppen när sajten laddas
 * upp, säger till och inte skriver tillbaka planerna utan de nya fälten (lagringenArNyare; Codex 2026-10-31).
 */
export const KONVERTERINGAR: Record<number, (plan: Record<string, unknown>) => { plan: Record<string, unknown>; varningar: string[] }> = {
  1: (plan) => ({ plan, varningar: [] }),
};
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
    if (planer.length) begarVaraktigLagring({ fraga: true });
    return true;
  } catch {
    return false;
  }
}
/**
 * Planens innehåll som text, med nycklarna i ordning och det införda rensat, så att samma plan ger samma text var den än
 * kommer ifrån: lagringen, en fil eller sidan. En rot för båda lagren (Codex 2026-10-31, fynd 2 och 4).
 */
export const planensInnehall = (p: { val: string; namn?: string; folj?: boolean; foljd?: unknown }) => JSON.stringify([p.val, p.namn ?? '', !!p.folj, rensaFoljd(p.foljd)], (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v));
/** När en plan ändrades, i ord: "30 oktober 2026 kl. 9.15", och "tidigare" utan tid. */
export const andradText = (andrad?: string) => (!andrad ? 'tidigare' : andrad.includes('T') ? `${datumText(andrad.slice(0, 10))} kl. ${tidText(andrad.slice(11, 16))}` : datumText(andrad.slice(0, 10)));
/**
 * Skulle en plan ur en fil ersätta en plan i webbläsaren som har ändrats efter filen, också samma dag? Då frågar sidan först,
 * med frågan i filensFraga, i båda lagren (granskningen 2026-10-24, och Codex 2026-10-31, fynd 4).
 */
export const filenErsatterNyare = (finns: SparadPlan | undefined, fil: SparadPlan) => !!finns && planensInnehall(finns) !== planensInnehall(fil) && (finns.andrad ?? '') >= (fil.andrad ?? '');
/**
 * Frågan före en äldre fil, med vad läraren gör om hon behåller planen här: filen saknar det som har förts in sedan, så hon
 * laddar ner planen igen (Niclas 2026-10-31: "säga att de bör ladda ner … igen då det finns nyare data som försvinner").
 */
export const filensFraga = (finns: SparadPlan, fil: SparadPlan) => `Planen i den här webbläsaren ändrades ${andradText(finns.andrad)}, och planen i filen ${andradText(fil.andrad)}. Ersätta den med planen i filen? Behåller du planen här, ${liten(PLANKNAPPAR.laddaNer)} igen, så har filen det senaste.`;
/**
 * En annan flik med samma plan, i båda lagren (Codex 2026-10-24 och 2026-10-31, fynd 2): det den sparar visas här också, så att
 * den här fliken inte skriver över det med det den hade, utom det den här fliken har skrivit men inte sparat än, som vinner. En
 * plan som tas bort i en annan flik stängs här. senast är planens innehåll när fliken senast läste eller sparade den.
 */
/**
 * Det fliken minns om sin plan: innehållet när den senast läste eller sparade den, som vidAndraFlikar jämför med, och att spara
 * den, i båda lagren (Codex 2026-10-31, fynd 2).
 */
export function flikensPlan() {
  let senast = '', bas: SparadPlan | null = null, sammanslagen: SparadPlan | null = null;
  return {
    senast: () => senast,
    minns: (p: SparadPlan) => { senast = planensInnehall(p); bas = p; },
    // Har en annan flik sparat planen sedan fliken läste den, läggs flikens egna ändringar på den andra flikens plan, så att
    // inget av det den andra fliken förde in skrivs över (Codex 2026-10-31, nr 2). sammanslagen säger planen fliken ska visa.
    skriv: (p: SparadPlan) => {
      const lagrad = lasPlaner().planer.find((x) => x.id === p.id);
      const ny = lagrad && bas && planensInnehall(lagrad) !== senast ? slaSamman(bas, lagrad, p) : p;
      const ok = skrivPlanen(ny);
      if (ok) { senast = planensInnehall(ny); bas = ny; sammanslagen = ny === p ? null : ny; }
      return ok;
    },
    sammanslagen: () => { const s = sammanslagen; sammanslagen = null; return s; },
  };
}
/**
 * Tre planer slås samman, fältet för fältet: det fliken har ändrat sedan basen går före, och annars står den andra flikens
 * (Codex 2026-10-31, nr 2). Texter, tal och listor är hela värden; objekt slås samman nyckel för nyckel.
 */
export function slaSamman(bas: SparadPlan, deras: SparadPlan, vara: SparadPlan): SparadPlan {
  const lika = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const obj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
  const samman = (b: unknown, d: unknown, v: unknown): unknown => {
    if (lika(v, b)) return d;
    if (lika(d, b) || !obj(v) || !obj(d) || !obj(b)) return v;
    const ut: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(b), ...Object.keys(d), ...Object.keys(v)])) { const x = samman(b[k], d[k], v[k]); if (x !== undefined) ut[k] = x; }
    return ut;
  };
  return { ...vara, val: samman(bas.val, deras.val, vara.val) as string, namn: samman(bas.namn, deras.namn, vara.namn) as string, foljd: samman(bas.foljd, deras.foljd, vara.foljd) as Foljd };
}
/** En plan läggs tillbaka i stället för en annan i listan som den är nu, så att Ångra inte tar bort det andra flikar har sparat sedan (Codex 2026-10-31, nr 1). Utan ut läggs planen bara till. */
export const bytPlanen = (ut: string | undefined, tillbaka: SparadPlan | undefined) => skrivPlaner([...(tillbaka ? [tillbaka] : []), ...lasPlaner().planer.filter((x) => x.id !== ut && x.id !== tillbaka?.id)]);
/** Beskedet när planen togs bort i en annan flik. */
export const BORTTAGEN_I_ANNAN_FLIK = 'Planen togs bort i en annan flik.';
export function vidAndraFlikar(o: { aktiv: () => { id: string; sparad: boolean }; minne: ReturnType<typeof flikensPlan>; vantar: () => boolean; borta: (besked: string) => void; andrad: (p: SparadPlan) => void; ovrigt?: () => void }) {
  addEventListener('storage', (e) => {
    if (e.key !== null && e.key !== NYCKEL) return;
    const a = o.aktiv();
    const p = a.sparad ? lasPlaner().planer.find((x) => x.id === a.id) : undefined;
    if (a.sparad && !p) { o.borta(BORTTAGEN_I_ANNAN_FLIK); return; }
    if (p && planensInnehall(p) !== o.minne.senast() && !o.vantar()) { o.andrad(p); return; }
    o.ovrigt?.();
  });
}
/** En plan sparas först bland planerna och ersätter planen med samma id, i båda lagren (K-630); false när lagringen inte tar den. */
export const skrivPlanen = (p: SparadPlan) => skrivPlaner([p, ...lasPlaner().planer.filter((x) => x.id !== p.id)]);

/** Ett nytt id för en plan, sex tecken. Det står i länken, så att samma plan känns igen på en annan enhet. */
export const nyttId = () => Math.random().toString(36).slice(2, 8).padEnd(6, '0');

// Dagens datum i läsarens egen tid och GoatCounter står i src/scripts/raknare.ts, som appens skript läser utan standarden.
export { goatcounter, idagLokalt };

/** Klockslaget nu, ÅÅÅÅ-MM-DDTHH:MM:SS i läsarens tid. */
const nuTid = () => {
  const d = new Date();
  return `${d.getFullYear()}-${tvasiffrigt(d.getMonth() + 1)}-${tvasiffrigt(d.getDate())}T${tvasiffrigt(d.getHours())}:${tvasiffrigt(d.getMinutes())}:${tvasiffrigt(d.getSeconds())}`;
};

/** När planen senast laddades ner och kopian av dess datum, som båda lagren sparar med planen (K-630). */
export const kopianOchSchemat = (kopia: string | undefined, plan: Plan, val: Val) => ({ ...(kopia ? { kopia } : {}), schema: schemaAv(plan, val) });
/** Hur många dagar sedan planen laddades ner, eller inget när den inte har laddats ner, i båda lagren (K-630). */
export const kopiansAlder = (kopia: string | undefined, idag: string) => (kopia ? dagarMellan(kopia.slice(0, 10), idag) : null);
/** Dagarna efter en nedladdning då planen påminner om att ladda ner igen, som Safaris sju dagar (granskningen 2026-10-24). */
export const KOPIANS_GRANS = 7;
/** När planen senast laddades ner, och att ladda ner igen när filen är äldre än gränsen, i båda lagren (granskningen rot-3, fynd 18). */
export const kopiansText = (kopia: string, idag: string) => `Planen laddades senast ner ${datumText(kopia.slice(0, 10))}.${(kopiansAlder(kopia, idag) ?? 0) > KOPIANS_GRANS ? ' Ladda ner den igen, så kommer det senaste med.' : ''}`;
/**
 * Planen som sparas, i båda lagren (granskningen rot-3, fynd 13): det sidan vet om planen, när den ändrades, när den senast
 * laddades ner och kopian av dess datum. uppdaterad är metodens datum när planen gjordes, så att planen kan säga till när
 * metoden har ändrats efteråt.
 */
export const sparadPlan = (aktiv: { id: string; val: Val; foljd: Foljd; kopia?: string; uppdaterad?: string }, metod: { id: string; titel: string; uppdaterad?: string }, plan: Plan, egna: Pick<SparadPlan, 'namn' | 'bockade'> & Partial<Pick<SparadPlan, 'samling' | 'omrade' | 'folj' | 'skapad'>>): SparadPlan => ({
  id: aktiv.id, metod: metod.id, titel: metod.titel, ...egna, val: kodaVal(aktiv.val), foljd: aktiv.foljd, andrad: nuTid(), uppdaterad: aktiv.uppdaterad ?? metod.uppdaterad, ...kopianOchSchemat(aktiv.kopia, plan, aktiv.val),
});
/** Kopian av planens datum som sparas med planen, med passets tid när läraren har satt en. */
export const schemaAv = (plan: Plan, val?: Val): SparadPlan['schema'] => ({
  pass: plan.pass.map((p) => { const tid = val ? passetsTid(val, p) : undefined; return tid ? [p.datum, p.vecka, p.nr, `${tid[0]}`] : [p.datum, p.vecka, p.nr]; }),
  veckor: plan.veckor.map((v) => { const d = veckansDagar(plan, v); return [v.nr, planvecka(plan, v), v.igen ? 1 : 0, d.fran, d.till]; }),
  ...(planensSistaDag(plan) && planensSistaDag(plan) !== plan.sistaPass ? { sista: planensSistaDag(plan) } : {}),
  ...(plan.efter ? { efter: plan.efter } : {}),
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
  if (samlingen(p) === 'metoder') return larDigetsLage(p, idag);
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
  const veckan = (x: SparadPlan['schema']['veckor'][number]) => planveckan(x[1], gangen({ veckor: p.schema.veckor.map(([nr, innehall]) => ({ nr, innehall })) }, { nr: x[0], innehall: x[1], igen: x[2] === 1 }));
  // Veckan som gruppen är i, ur samma rot som planen (veckanFor): på helgen före ett lov är det veckan som just har slutat,
  // och nästa pass i en senare vecka säger sin vecka, så att raden och länken visar samma vecka som planen (Samma sak överallt
  // inför lanseringen, E5: söndagen före jullovet sa planen vecka 4 igen, och raden vecka 5).
  const nu = veckanFor({ veckor: p.schema.veckor.map(([nr, , , fran]) => ({ nr, mandag: mandagen(fran) })) } as unknown as Plan, idag);
  const iVeckan = nu ? p.schema.veckor.find((x) => x[0] === nu.nr) : undefined;
  if (iVeckan && v && iVeckan[0] !== v[0]) return { text: `Vecka ${veckan(iVeckan)} i planen. Nästa pass, pass ${nasta[2]}, är ${narText(nasta[0], idag)}${kl}, i vecka ${veckan(v)}`, vecka: iVeckan[0] };
  return { text: `Vecka ${v ? veckan(v) : '?'} i planen, pass ${nasta[2]} ${narText(nasta[0], idag)}${kl}`, vecka: v?.[0] };
}

/**
 * Var en plan i Lär dig metoden står i dag, ur kopian, med stegen i stället för passen (K-628): Före till första lektionen,
 * steget i veckan, och efter stegen. Första lektionen är dagen läraren valde, eller den första veckan med lektioner när den
 * dagen är en helg (forstaLektionen i standarden).
 */
// Lägets värden ur kopian av planen: första lektionen ur dagen läraren valde, stegens måndagar och veckan efter stegen, som
// sidan läser ur planen (larDigetsLaget i standarden). En äldre kopia utan veckan efter stegen räknar den med planens regel
// (forstaSkolveckanEfter).
function larDigetsLagetsVarden(p: SparadPlan, veckor = [...p.schema.veckor].sort((a, b) => a[0] - b[0])) {
  const mandagar = veckor.map((x) => mandagen(x[3]));
  const start = lasVal(p.val)?.val.start ?? veckor[0]?.[3];
  return { forsta: mandagar.length && start ? forstaLektionensDag(start, mandagar[0]) : null, mandagar, efter: p.schema.efter ?? (mandagar.length ? forstaSkolveckanEfter(mandagar[mandagar.length - 1], new Set(lasVal(p.val)?.val.lov ?? [])) : ''), avslutad: !!p.foljd?.avslut };
}
function larDigetsLage(p: SparadPlan, idag: string): { text: string; vecka?: number } {
  const veckor = [...p.schema.veckor].sort((a, b) => a[0] - b[0]);
  if (!veckor.length) return { text: 'Planen har inga steg' };
  // En plan som läraren har avslutat säger när (K-631). Märket Avslutad står före texten (statusAv).
  if (p.foljd?.avslut) return { text: `Du avslutade planen ${narText(p.foljd.avslut.datum, idag)}` };
  const varden = larDigetsLagetsVarden(p, veckor), l = larDigetsLaget(varden, idag);
  if (l.fas === 'fore') return { text: varden.forsta ? `Före. Första lektionen ${narText(varden.forsta, idag)}` : 'Före' };
  const v = l.vecka ? veckor[l.vecka - 1] : undefined;
  return l.fas === 'under' && v ? { text: `Steg ${v[1]}${v[2] ? ', en vecka till' : ''}`, vecka: v[0] } : { text: 'Efter stegen' };
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
  // En plan i Lär dig metoden har läget ur samma regel som sidan: Kommande i Före, Avslutad när läraren har avslutat den, och
  // annars Pågående, också efter stegen, där läraren skattar vidare (K-631; granskningen rot-3, fynd 3).
  if (samlingen(p) === 'metoder') return larDigetsLaget(larDigetsLagetsVarden(p), idag).lage;
  const datum = p.schema.pass.map((x) => x[0]).sort();
  // En insats som avslutades i förtid är avslutad tills en förlängning är gjord, som på planens sida (insatsenAvslutad; C15).
  if (!datum.length || insatsenAvslutad(datum[datum.length - 1], p.foljd?.utvardering?.beslut, idag, p.foljd?.oppen, p.schema.sista, !!lasVal(p.val)?.val.slut)) return 'avslutad';
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
export function planensNamn(p: { namn?: string; val: string; schema?: SparadPlan['schema']; samling?: unknown }): string {
  if (p.namn) return p.namn;
  // En plan i Lär dig metoden är lärarens egen, en per metod, och heter som sidan (K-628).
  if (samlingen(p) === 'metoder') return 'Lär dig metoden';
  const v = lasVal(p.val)?.val;
  if (!v) return 'Plan utan namn';
  // Dagarna ur samma rot som texten till åtgärdsprogrammet, med dagarna före och efter ett byte mitt i insatsen (planensDagar
  // i standarden; buggjakten inför lanseringen, C3).
  return planensDagar(v, (p.schema?.pass ?? []).map(([datum, , nr]) => ({ datum, nr })));
}

/** Adressen till en sparad plan, och till en vecka i den. En plan i Metoder öppnas på metodens Lär dig metoden (K-628). */
export const planensAdress = (p: { metod: string; val: string; id: string; samling?: unknown }, vecka?: number) => (samlingen(p) === 'metoder' ? `/metoder/${encodeURIComponent(p.metod)}/lar-dig#p=${encodeURIComponent(p.id)}` : `/stodundervisning/${encodeURIComponent(p.metod)}/planera#${p.val}&p=${encodeURIComponent(p.id)}${vecka ? `&v=${vecka}` : ''}`);

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
// Statistikens regel för en plan som pågår är en avsiktligt annan än märket Pågående (statusAv): statistiken räknar veckorna
// med pass, från måndagen i första passets vecka till söndagen i sista, och inte veckorna efter, när insatsen väntar på
// utvärderingen (granskningen rot-3, fynd 20).
export function pagaendeHandelser(planer: SparadPlan[], idag: string): { id: string; path: string; title: string }[] {
  const perMetod = new Map<string, number>();
  const ut: { id: string; path: string; title: string }[] = [];
  // Bara insatserna i Stödundervisning: en plan i Lär dig metoden är ingen insats (K-628).
  for (const p of iSamlingen([...planer], 'stodundervisning').sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const dagar = p.schema.pass.map((x) => x[0]).sort();
    if (!dagar.length || idag < mandagen(dagar[0]) || idag > skolveckan(mandagen(dagar[dagar.length - 1])).sondag) continue;
    const n = (perMetod.get(p.metod) ?? 0) + 1;
    perMetod.set(p.metod, n);
    if (n <= PAGAR_HOGST) ut.push({ id: p.id, path: `${SAMLINGARNAS_LED.stodundervisning}:${p.metod}:pagar${n > 1 ? `:${n}` : ''}`, title: `${p.titel}: en insats pågår` });
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
 * aldrig skriver över det läraren har fört in sedan. Har flera filer samma plan, gäller den nyaste av dem, så att planen
 * står en gång (Niclas 2026-10-31: "Och den tar alltid nyaste versionen om personen markerar flera filer?"). Svaret säger om
 * det gick, hur många som sparades och hur många som var äldre, i webbläsaren eller bland filerna.
 */
export function sparaPlanerna(nya: SparadPlan[]): { ok: boolean; sparade: number; aldre: number } {
  const finns = lasPlaner().planer;
  const nyaste = [...nya.reduce((m, n) => { const f = m.get(n.id); if (!f || f.andrad < n.andrad) m.set(n.id, n); return m; }, new Map<string, SparadPlan>()).values()];
  // Samma tid med annat innehåll räknas som en äldre fil, eftersom tiden bara har sekunder (Codex 2026-10-31, nr 4), som
  // filenErsatterNyare på planens sida.
  const att = nyaste.filter((n) => { const f = finns.find((x) => x.id === n.id); return !f || f.andrad < n.andrad || (f.andrad === n.andrad && planensInnehall(f) === planensInnehall(n)); });
  const ok = skrivPlaner([...att, ...finns.filter((x) => !att.some((n) => n.id === x.id))]);
  return { ok, sparade: att.length, aldre: nya.length - att.length };
}

/**
 * I appen Metodbanken: planerna finns bara i appen och försvinner när appen tas bort, i iPhone och i Android, där Chrome varnar men
 * varningen går att trycka bort (Niclas 2026-10-28). Sajten märker inte när appen tas bort, så den säger det före, på högst
 * två rader under knapparna Ladda ner planer och Öppna planer, som säger vad läraren gör (Niclas samma dag: "kortare text").
 */
export const APPENS_PLANER = 'Planerna finns bara i appen. Tar du bort appen, försvinner de.';

/** Filerna ur ett filfält, som töms, så att samma fil går att välja igen. */
export const valdaFiler = (e: Event) => { const input = e.target as HTMLInputElement; const filer = [...(input.files ?? [])]; input.value = ''; return filer; };

/**
 * Planen ur filfältet Öppna en nedladdad plan, en rot för båda lagren (K-630): flera filer eller en zip sparas och sidan laddas
 * om med beskedet (oppnaPlanerna), och en fil läses med lasPlanfilerna. Inget när inget valdes eller sidan laddas om, och
 * { last: null } när filen inte är en plan.
 */
export async function planenUrFaltet(e: Event, nyckel: string, samling: Samling = 'stodundervisning'): Promise<{ last: { plan: SparadPlan; varningar: string[] } | null } | null> {
  const filer = valdaFiler(e);
  if (!filer.length) return null;
  if (filer.length > 1 || /\.zip$/i.test(filer[0].name)) { await oppnaPlanerna(filer, nyckel, samling); return null; }
  const { planer } = await lasPlanfilerna(filer);
  return { last: planer[0] ?? null };
}
/**
 * Planerna ur filerna sparas, och sidan laddas om med beskedet under nyckeln, en rot för metoden, bankerna och appens sida.
 * Beskedet säger listorna som planerna står under, efter planernas egna samlingar, så att en zip med båda samlingarna, som
 * Ladda ner planer på appens sida ger, nämner båda listorna (lagningen inför lanseringen, A1).
 */
export async function oppnaPlanerna(filer: File[], nyckel: string, samling: Samling | null = 'stodundervisning') {
  const { planer, inte } = await lasPlanfilerna(filer);
  const samlingarna = SAMLINGAR.filter((s) => planer.some((x) => samlingen(x.plan) === s));
  const text = planernasBesked(sparaPlanerna(planer.map((x) => x.plan)), inte, samlingarna.length ? samlingarna : samling ?? 'stodundervisning');
  try { sessionStorage.setItem(nyckel, text); } catch { /* utan lagring */ }
  location.reload();
}

/** Beskedet efter att planer har lästs in, lika i metoden och på bankerna, med listan eller listorna som planerna står under. */
export const planernasBesked = (r: { ok: boolean; sparade: number; aldre: number }, inte: number, samling: Samling | readonly Samling[] = 'stodundervisning') => (!r.ok ? 'Planerna gick inte att spara i den här webbläsaren.'
  : [r.sparade ? `${r.sparade === 1 ? 'En plan är öppnad' : `${stor(talText(r.sparade))} planer är öppnade`} ur filerna, med allt som förts in. De står under ${(typeof samling === 'string' ? [samling] : samling).map((s) => SAMLINGENS_ORD[s].listan).join(' och ')}${typeof samling !== 'string' && samling.length > 1 ? ',' : ''} och under sin metod.` : '',
    r.aldre ? `${r.aldre === 1 ? 'En fil' : `${stor(talText(r.aldre))} filer`} hade en äldre version av en plan, och den nyaste står kvar. ${LISTANS_KNAPPAR.laddaNer} igen, så har filen det senaste.` : '',
    inte ? `${inte === 1 ? 'En fil' : `${stor(talText(inte))} filer`} var inte en nedladdad plan.` : ''].filter(Boolean).join(' ') || 'Filerna hade ingen plan.');

/**
 * Zip-filen med alla sparade planer i samlingen, en plans fil i taget ur planfilen, och filens namn med dagens datum. Utan
 * samling (null) har den planerna i båda samlingarna, som Ladda ner planer på appens sida, så att en flytt till appen tar
 * med allt (lagningen inför lanseringen, A1). Varje plans fil heter efter planens egen samling.
 */
export function allaPlanerna(modul: string, idag: string, samling: Samling | null = 'stodundervisning'): { blob: Blob; namn: string } | null {
  const planer = samling ? iSamlingen(lasPlaner().planer, samling) : lasPlaner().planer;
  if (!planer.length) return null;
  const tagna = new Set<string>();
  const filer = planer.map((p) => {
    let namn = filnamnet('plan', { samling: samlingen(p), vem: p.namn, metod: p.metod, datum: idag });
    for (let i = 2; tagna.has(namn); i++) namn = namn.replace(/(-\d+)?\.json$/, `-${i}.json`);
    tagna.add(namn);
    return { namn, text: planfilen(p, modul) };
  });
  return { blob: zipa(filer), namn: filnamnet('planer', { samling: samling ?? 'alla', datum: idag }) };
}
