// Undervisningsmetoderna, Metoder för läsaren (sajtens K-621, riggens standard för undervisningsmetoder). Delarna i lärarens
// väg som data, så att sidans innehållsrad, Word-filens band och riggens bygge läser samma lista (standarden, avsnitt 4),
// utfallens gränser för en klass (avsnitt 7), metodkortets nivåer (avsnitt 15) och lathundens fyra sidor (avsnitt 14).
// Riggen läser modulen genom build/standarden.mjs.

import { liten, meningarna, talText } from './text.js';
import { larDigetsMetodplan } from './plan.js';

/**
 * Delarna i läsordning: fyra delar i lärarens tid och två bilagor. `rad` står under delens band, och `text` är
 * övergångsmeningen till läraren. {minuter}, {veckor} och {amne} fylls ur metoden med `delarnasText`.
 * @type {readonly { id: string, nr: string, namn: string, rad: string, text: string }[]}
 */
export const UNDERVISNINGSMETODENS_DELAR = [
  { id: 'metoden', nr: '1', namn: 'Metoden', rad: 'Vad metoden är, och rörelsen du leder i varje lektion.', text: '' },
  { id: 'lektionen', nr: '2', namn: 'Lektionen', rad: 'En lektion på {minuter} minuter, del för del.', text: 'Här står lektionen del för del, med det du gör och säger. Sedan ser du den i en lektion i {amne} och i {andra} andra ämnen.' },
  { id: 'kom-igang', nr: '3', namn: 'Kom igång', rad: 'Före första lektionen, planeringen, de första {veckor} veckorna och arbetslaget.', text: '' },
  { id: 'hall-i', nr: '4', namn: 'Håll i', rad: 'Vad du håller fast vid, vad du får ändra och vad du gör när metoden glider.', text: 'Här står vad du håller fast vid och varför, vad du får ändra och vad du gör när metoden börjar glida. Läs den hel efter första veckan.' },
  { id: 'att-skriva-ut', nr: 'A', namn: 'Att skriva ut', rad: 'Lektionskortet, materialet för klassen, planeringsmallen och observationsmallen.', text: 'Här står det du skriver ut: lektionskortet, materialet för klassen, planeringsmallen och observationsmallen för den som besöker en lektion.' },
  { id: 'valet', nr: 'B', namn: 'Valet och forskningen', rad: 'När metoden passar, vad kritiker säger och vad studierna visar.', text: '' },
];

/**
 * En dels rad och text med metodens tal: minuterna i en lektion, veckorna att komma igång i ord, huvudexemplets ämne och
 * antalet andra exempel. Del 3:s text är metodens egen (`progression.text`).
 * @param {{ id: string, rad: string, text: string }} del
 * @param {{ minuter?: number, veckor?: number, amne?: string, andra?: number, progression?: string }} m
 * @returns {{ rad: string, text: string }}
 */
export function delarnasText(del, m) {
  const fyll = (/** @type {string} */ s) => s.replace('{minuter}', String(m.minuter ?? '')).replace('{veckor}', m.veckor ? talText(m.veckor) : '').replace('{amne}', m.amne ?? 'ett ämne').replace('{andra}', talText(m.andra ?? 4));
  return { rad: fyll(del.rad), text: del.id === 'kom-igang' ? (m.progression ?? '') : fyll(del.text) };
}

/**
 * Utfallens gränser för en klass med n elever, räknade i elever med fel (riggens standard, avsnitt 7): Nästan alla kan när
 * högst en femtedel har fel, avrundat nedåt, och Hälften eller färre kan när hälften eller fler har fel, avrundat uppåt.
 * @param {number} n
 * @returns {{ nastanAlla: number, deFlesta: [number, number], halften: number }}
 */
export function utfallensGranser(n) {
  const nastanAlla = Math.floor(n / 5);
  const halften = Math.ceil(n / 2);
  return { nastanAlla, deFlesta: [nastanAlla + 1, halften - 1], halften };
}

/** Utfallens namn i beslutsstället, i ordning (standarden, avsnitt 7 och 18). */
export const UTFALLEN = /** @type {const} */ ([
  { id: 'nastanAlla', namn: 'Nästan alla kan' },
  { id: 'deFlesta', namn: 'De flesta kan' },
  { id: 'halften', namn: 'Hälften eller färre kan' },
]);

// Metodkortets nivåer (sajtens K-623 och K-632, riggens evidensen.md, avsnitt 6 och 7): tillförlitligheten sätter taket och
// effekten nivån, låg tillförlitlighet utan effekt eller med negativ effekt är Oklart, och nivå 1 kräver minst måttlig
// tillförlitlighet. Svårighet och Kostnad räknas ur kriterierna. Räkningen och orden stod förut både i sajtens
// metodprofil.ts och i riggens build/sparrprov.mjs och står nu bara här, så att metodkortet, lathunden och riggens spärrar
// räknar med samma funktion.
const NIVAN = {
  hog: { negativ: 1, ingen: 1, liten: 3, mattlig: 4, stor: 5 },
  mattlig: { negativ: 1, ingen: 1, liten: 3, mattlig: 4, stor: 4 },
  lag: { negativ: 'oklart', ingen: 'oklart', liten: 2, mattlig: 2, stor: 2 },
};
/** Nivåernas ord, 1 till 5. Orden prövades på en kall läsare 2026-10-29: med Svagt stöd och Inget påvisat stöd ordnade fem lärare dem lika. */
export const NIVAORD = Object.freeze(['', 'Inget påvisat stöd', 'Svagt stöd', 'Visst stöd', 'Gott stöd', 'Starkt stöd']);
/** Ett område utan nivå står med sitt läge, som i metodens fil. Lärande totalt utan sammanställning är Inte sammanvägt. */
const UTAN_NIVA = { 'inte-studerat': 'Inte studerat', 'inte-sammanvagt': 'Inte sammanvägt', vantar: 'Väntar' };

/**
 * Läget för ett område i metodkortet: en nivå 1 till 5 med sitt ord, där nivå 1 med negativ effekt heter Negativ effekt,
 * Oklart, eller ett läge utan nivå med sitt ord. Ett område som saknas är Inte studerat, som i riggens skelett, och en
 * tillförlitlighet, effekt eller ett läge som tabellen inte har är okänt, med tomt ord, så att riggens spärrar kan säga det.
 * @param {{ tillforlitlighet?: string, effekt?: string, niva?: string } | undefined | null} v
 * @returns {{ slag: 'niva', niva: number, ord: string, negativ: boolean } | { slag: 'oklart' | 'inte' | 'okand', ord: string }}
 */
export function laget(v) {
  if (!v) return { slag: 'inte', ord: UTAN_NIVA['inte-studerat'] };
  if ('niva' in v) return v.niva && Object.hasOwn(UTAN_NIVA, v.niva) ? { slag: 'inte', ord: UTAN_NIVA[/** @type {keyof typeof UTAN_NIVA} */ (v.niva)] } : { slag: 'okand', ord: '' };
  const n = /** @type {Record<string, Record<string, number | 'oklart'>>} */ (NIVAN)[v.tillforlitlighet ?? '']?.[v.effekt ?? ''];
  if (n === undefined) return { slag: 'okand', ord: '' };
  if (n === 'oklart') return { slag: 'oklart', ord: 'Oklart' };
  const negativ = n === 1 && v.effekt === 'negativ';
  return { slag: 'niva', niva: n, ord: negativ ? 'Negativ effekt' : NIVAORD[n], negativ };
}

/** Svårighetens ord, 1 till 5. Mer betyder mer arbete, och kortets grå staplar säger samma sak. */
export const SVARIGHETENS_ORD = Object.freeze(['', 'Mycket lätt', 'Lätt', 'Medelsvårt', 'Svårt', 'Mycket svårt']);
/** Kostnadens ord, 1 till 5. */
export const KOSTNADENS_ORD = Object.freeze(['', 'Mycket låg', 'Låg', 'Måttlig', 'Hög', 'Mycket hög']);
/**
 * Svårigheten att införa, 1 till 5: den övre medianen av de fyra kriterierna (att lära sig, kärnan, stödet och tiden), vid
 * fyra det högre av de två i mitten. Ett kriterium som inte är ett heltal räknas inte, och utan något är svaret null.
 * @param {{ lara?: number, karnan?: number, stod?: number, tid?: number } | undefined | null} s
 * @returns {number | null}
 */
export function svarighetensNiva(s) {
  const v = ['lara', 'karnan', 'stod', 'tid'].map((k) => /** @type {Record<string, unknown>} */ (s ?? {})[k]).filter(Number.isInteger).map(Number).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
}
/**
 * Kostnaden att införa, 1 till 5: den högre av inköpet och timmarna per lärare första läsåret, i steg vid 5, 15, 40 och 80
 * timmar.
 * @param {{ kop?: number, timmar?: number } | undefined | null} k
 * @returns {number}
 */
export function kostnadensNiva(k) {
  const t = k?.timmar ?? 0;
  return Math.max(k?.kop ?? 1, t < 5 ? 1 : t < 15 ? 2 : t < 40 ? 3 : t < 80 ? 4 : 5);
}

/**
 * Motiveringen i två delar: den första meningen, om tillförlitligheten och effekten som standarden kräver och som kortet
 * gör fet, och resten.
 * @param {string | undefined} text
 */
export function motiveringensDelar(text) {
  const t = String(text ?? '');
  const m = t.match(/^(.+?\.)\s+(.*)$/s);
  return m ? { forst: m[1], resten: m[2] } : { forst: '', resten: t };
}
/**
 * Kommentaren under Lärande totalt, på bankens kort och i lathundens fakta (Niclas 2026-10-30: "lärande totalt med snygg
 * [kommentarsruta] i två rader kopplat till sin son kort beskriver effekt på lärande", och efter granskningen samma natt:
 * raden ska säga för vilka elever och i vilken form stödet gäller): områdets egen korta mening när metoden har den
 * (`kort`), annars motiveringen efter den första meningen, utan hänvisningarna.
 * @param {{ kort?: string, motivering?: string } | undefined | null} v
 * @returns {string | undefined}
 */
export function larandetIKort(v) {
  if (v?.kort) return v.kort;
  const { resten } = motiveringensDelar(v?.motivering);
  const t = resten.replace(/\s*\([^()]*\d{4}[^()]*\)/g, '').replace(/\s+([,.])/g, '$1').trim();
  return t || undefined;
}

/** Metodkortets områden, i kortets ordning (standarden, avsnitt 15). */
const KORTETS_OMRADEN = ['larande', 'lasning', 'skrivning', 'matematik', 'amnen', 'socialt'];
/** Fälten som en del på metodens sida läser, med delen. */
const SIDANS_FALT = ['karna', 'fastnar', 'stod', 'amnesexempel', 'hinder', 'fallgropar', 'hallFast', 'checklista', 'forsta', 'progression', 'rutiner', 'uppfoljning', 'uppdrag', 'planeringsmall', 'observation', 'ramar', 'passar', 'invandningar', 'grund', 'lasMer', 'larandet', 'roll', 'klassen'];

/**
 * Det som saknas eller har fel form i en undervisningsmetods fil för att sajten ska kunna visa den: fälten som metodens
 * sida, metodkortet och Lär dig metoden läser, källorna som kortet nämner, stegen med de tre rutorna och beslutsstället,
 * frågan Gick det? för varje vecka, lärarens två skattningar med regler i formen "under X i N veckor i rad" mot en rad i
 * uppföljningen, filmerna, det svåraste i kort form för lathunden (hinder.kort, HINDRETS_KORT) och en text som YAML har
 * läst som ett objekt för att ett kolon saknar citattecken (sajtens K-627; riggen kör samma prov före leveransen med
 * sajtens `scripts/metodriggprov.mjs`). Tom lista när allt finns.
 * @param {Record<string, any>} d metodens fil, läst
 * @returns {string[]}
 */
export function undervisningsmetodensFel(d) {
  /** @type {string[]} */
  const fel = [];
  const finns = (/** @type {unknown} */ v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length);
  const krav = (/** @type {string} */ vag, /** @type {unknown} */ v, /** @type {string} */ vad) => { if (!finns(v)) fel.push(`${vag} saknas: ${vad}`); };
  // En text med ett kolon utan citattecken blir ett objekt med en lång nyckel (pilotens inledning 2026-10-30).
  const vandra = (/** @type {unknown} */ x, /** @type {string} */ vag) => {
    if (Array.isArray(x)) x.forEach((v, i) => { if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && Object.keys(v)[0].length > 40) fel.push(`${vag}[${i}] är ett objekt och inte en text: ett kolon utan citattecken`); vandra(v, `${vag}[${i}]`); });
    else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) vandra(v, vag ? `${vag}.${k}` : k);
  };
  vandra(d, '');
  for (const f of ['titel', 'ingress', 'arskurs', 'taggar', 'slag', 'tid', 'period', 'material', 'inledning', 'kallor']) krav(f, d[f], 'huvudet och faktan');
  const ev = d.profil?.evidens ?? {};
  for (const o of KORTETS_OMRADEN) krav(`profil.evidens.${o}`, ev[o], 'metodkortets rad');
  krav('profil.evidens.larande.kort', ev.larande?.kort, 'kommentaren under Lärande totalt på bankens kort');
  if (String(ev.larande?.kort ?? '').length > 80) fel.push('profil.evidens.larande.kort har fler än 80 tecken');
  for (const f of ['svarighet', 'kostnad', 'urval']) krav(`profil.${f}`, d.profil?.[f], 'metodkortet');
  const ids = new Set((d.kallor ?? []).map((/** @type {{ id: string }} */ k) => k.id));
  for (const o of KORTETS_OMRADEN) for (const k of ev[o]?.kallor ?? []) if (!ids.has(k)) fel.push(`profil.evidens.${o}.kallor: ${k} står inte i kallor`);
  for (const k of d.kallor ?? []) for (const f of ['id', 'grupp', 'titel', 'text']) krav(`kallor ${k.id ?? '?'}.${f}`, k[f], 'referensbladet');
  const steg = d.steg?.rader ?? [];
  krav('steg.rader', steg, 'lektionens delar');
  for (const s of steg) for (const f of ['namn', 'alla', 'titta', 'beslut', 'gor']) krav(`steg ${s.namn ?? '?'}.${f}`, s[f], 'lektionens del med tre rutor');
  if (!steg.some((/** @type {any} */ s) => UTFALLEN.every((u) => s.redo?.[u.id]))) fel.push('inget steg har redo med nastanAlla, deFlesta och halften: beslutsstället');
  const faser = new Set((d.tidsschema?.rader ?? []).map((/** @type {{ fas: string }} */ r) => r.fas));
  for (const s of steg) if (s.namn && !faser.has(s.namn)) fel.push(`steg ${s.namn} har ingen rad i tidsschemat`);
  for (const f of SIDANS_FALT) krav(f, d[f], 'en del på metodens sida');
  if ((d.amnesexempel ?? []).filter((/** @type {{ huvud?: boolean }} */ e) => e.huvud).length !== 1) fel.push('amnesexempel har inte exakt ett huvudexempel');
  // Lär dig metoden tar ett steg i veckan ur progressionen: varje rad är en vecka med det klasserna lär sig, lärarens drag och
  // frågan Gick det?, och motorn kan räkna planen med lärarens skattningar (sajtens K-631; granskningen rot-3, fynd 7 och 8:
  // kraven stod förut bara i sajtens bygge, och en rad "Vecka 3–4" gav "Steg 4 av 3").
  krav('progression.rader', d.progression?.rader, 'stegen i Lär dig metoden');
  for (const r of d.progression?.rader ?? []) {
    for (const f of ['rubrik', 'eleverna', 'roll']) krav(`progression vecka ${r.vecka}.${f}`, r[f], 'steget i Lär dig metoden');
    if (!/^\d+$/.test(String(r.vecka ?? '').trim())) fel.push(`progression vecka ${r.vecka} är inte en vecka: Lär dig metoden tar ett steg i veckan, med en rad för varje vecka`);
    krav(`progression vecka ${r.vecka}.fraga`, r.fraga, 'frågan Gick det? i Lär dig metoden');
    if (r.fraga && !/\?$/.test(r.fraga)) fel.push(`progression vecka ${r.vecka}.fraga slutar inte med frågetecken`);
  }
  fel.push(...larDigetsMetodplan({ tid: d.tid, period: d.period, progression: d.progression, uppfoljning: d.uppfoljning, passen: d.plan?.passen ?? [], skattningar: d.plan?.skattningar ?? [] }).fel.map((f) => `planen i Lär dig metoden: ${f}`));
  const rader = d.uppfoljning?.rader ?? [];
  for (const u of rader) if (!u.id) fel.push(`uppfoljning "${u.nar}" saknar id`);
  const uppf = new Set(rader.map((/** @type {{ id: string }} */ r) => r.id));
  const sk = d.plan?.skattningar ?? [];
  if (sk.length !== 2 || sk.some((/** @type {any} */ x) => x.vem !== 'lararen' || x.skala?.fran !== 1 || x.skala?.till !== 10)) fel.push('plan.skattningar ska ha två skattningar med vem: lararen och skala 1 till 10 (Lär dig metoden)');
  for (const x of sk) for (const r of x.regler ?? []) {
    if (!uppf.has(r.rad)) fel.push(`regeln i ${x.namn} pekar på ${r.rad}, som inte är en rad i uppföljningen`);
    if (!/^under \d+ i \d+ veckor i rad$/.test(r.om)) fel.push(`regeln "${r.om}" i ${x.namn} har inte formen "under X i N veckor i rad"`);
  }
  krav('film', d.film, 'huvudfilmen');
  for (const f of d.filmer ?? []) krav(`filmer ${f.nr}.efter`, f.efter, 'platsen för extrafilmen');
  krav('hinder.kort', d.hinder?.kort, 'Det svåraste i lathunden: risken och vad läraren gör');
  if (meningarna(d.hinder?.kort).length > HINDRETS_KORT.meningar) fel.push(`hinder.kort har fler än ${HINDRETS_KORT.meningar} meningar`);
  if (String(d.hinder?.kort ?? '').length > HINDRETS_KORT.tecken) fel.push(`hinder.kort har fler än ${HINDRETS_KORT.tecken} tecken`);
  if ('mal' in d) fel.push('mal står i metoden: en undervisningsmetod har inget mål, läraren skriver sitt i Lär dig metoden (Niclas 2026-10-30)');
  fel.push(...lathundensTakFel(d));
  return fel;
}

/**
 * Lathundens tak (sajtens K-637): de längder som ryms på lathundens fyra liggande sidor i PowerPoint-filen och pdf:en, som
 * sajten ritar för varje undervisningsmetod ur lathundensSidor. Taken är pilotens längder med marginal (brevet till riggen
 * 2026-10-30, 06.15 punkt 3), prövade på en provmetod där varje fält står vid sitt tak: då ryms varje sida med texten i
 * minst 85 procent av sin storlek. `tecken` är tecken per text, `alla` tecken tillsammans.
 */
export const LATHUNDENS_TAK = Object.freeze({
  tid: 55,
  metodensText: { stycken: 2, tecken: 210 },
  lektionensText: 340,
  karnan: { namn: 40, vad: 110 },
  checklista: { punkter: 8, tecken: 120 },
  fraser: 60,
  rutinerVecka1: 1,
  veckorna: { rader: 5, tecken: 130, alla: 1500 },
  medDig: 360,
  efter: 260,
  fallgropar: { fallgrop: 80, prova: 135 },
});

/**
 * Det i metodens fil som är längre än lathundens tak (LATHUNDENS_TAK), med fältet och var det står i lathunden. Tom lista
 * när allt ryms.
 * @param {Record<string, any>} d metodens fil, läst
 * @returns {string[]}
 */
export function lathundensTakFel(d) {
  const T = LATHUNDENS_TAK;
  /** @type {string[]} */
  const fel = [];
  const lista = (/** @type {unknown} */ x) => /** @type {any[]} */ (Array.isArray(x) ? x : x ? [x] : []);
  const langd = (/** @type {unknown} */ s) => String(s ?? '').length;
  const over = (/** @type {string} */ vag, /** @type {unknown} */ s, /** @type {number} */ tak, /** @type {string} */ plats) => { if (langd(s) > tak) fel.push(`${vag} har ${langd(s)} tecken, och ${plats} rymmer ${tak}`); };
  over('tid', d.tid, T.tid, 'faktan på lathundens sida 1');
  const metoden = lista(d.lathund?.metoden?.text);
  if (metoden.length > T.metodensText.stycken) fel.push(`lathund.metoden.text har ${metoden.length} stycken, och lathundens sida 1 rymmer ${T.metodensText.stycken}`);
  metoden.forEach((s, i) => over(`lathund.metoden.text[${i}]`, s, T.metodensText.tecken, 'lathundens sida 1'));
  over('lathund.lektion.text', lista(d.lathund?.lektion?.text).join(' '), T.lektionensText, 'Första lektionen på lathundens sida 2');
  for (const k of lista(d.karna?.komponenter)) { over(`karna ${k.namn}.namn`, k.namn, T.karnan.namn, 'kortet på lathundens sida 1'); over(`karna ${k.namn}.vad`, k.vad, T.karnan.vad, 'kortet på lathundens sida 1'); }
  const punkter = lista(d.checklista?.punkter);
  if (punkter.length > T.checklista.punkter) fel.push(`checklista har ${punkter.length} punkter, och lathundens sida 2 rymmer ${T.checklista.punkter}`);
  punkter.forEach((p, i) => over(`checklista.punkter[${i}]`, p, T.checklista.tecken, 'lathundens sida 2'));
  for (const s of lista(d.steg?.rader)) lista(s.fraser).slice(0, 2).forEach((f, i) => over(`steg ${s.namn}.fraser[${i}]`, f, T.fraser, 'Du säger på lathundens sida 2'));
  const rutiner = lista(d.rutiner?.rader).filter((r) => String(r.vecka ?? '') === '1');
  if (rutiner.length > T.rutinerVecka1) fel.push(`rutiner har ${rutiner.length} rutiner i vecka 1, och lathundens sida 2 rymmer ${T.rutinerVecka1}`);
  const veckor = lista(d.progression?.rader);
  if (veckor.length > T.veckorna.rader) fel.push(`progression.rader har ${veckor.length} rader, och veckornas tabell på lathundens sida 4 rymmer ${T.veckorna.rader}`);
  const celler = veckor.flatMap((r) => [[`progression vecka ${r.vecka}.eleverna`, r.eleverna ?? r.fokus], [`progression vecka ${r.vecka}.roll`, r.roll], [`progression vecka ${r.vecka}.vidare`, r.vidare]]);
  for (const [vag, s] of celler) over(vag, s, T.veckorna.tecken, 'veckornas tabell på lathundens sida 4');
  const alla = celler.reduce((n, [, s]) => n + langd(s), 0);
  if (alla > T.veckorna.alla) fel.push(`veckornas tabell har ${alla} tecken i cellerna, och lathundens sida 4 rymmer ${T.veckorna.alla}`);
  const urad = (/** @type {string} */ id) => lista(d.uppfoljning?.rader).find((r) => r.id === id)?.vad;
  over('uppfoljning, Med dig på vägen', MED_DIG_PA_VAGEN.map(urad).filter(Boolean).join(' '), T.medDig, 'lathundens sida 4');
  over('uppfoljning stodet, de två första meningarna', meningarna(urad('stodet')).slice(0, 2).join(' '), T.efter, 'Efter de första veckorna på lathundens sida 4');
  for (const r of lista(d.fallgropar?.rader).filter((x) => x.komponent && x.prova)) { over(`fallgropar ${r.komponent}.fallgrop`, r.fallgrop, T.fallgropar.fallgrop, 'Om det glider på lathundens sida 4'); over(`fallgropar ${r.komponent}.prova`, r.prova, T.fallgropar.prova, 'Om det glider på lathundens sida 4'); }
  return fel;
}

/** Orden i ett värde ur metodens fil: texterna, också i listor och objekt. @param {unknown} v @returns {number} */
const ordI = (v) => (typeof v === 'string' ? v.split(/\s+/).filter(Boolean).length : Array.isArray(v) ? v.reduce((n, x) => n + ordI(x), 0) : v && typeof v === 'object' ? Object.values(v).reduce((n, x) => n + ordI(x), 0) : 0);
/**
 * Läsvägen före första lektionen, en rot för metodens sida (Vill du börja på måndag?) och Lär dig metoden (Läs in dig): del 1
 * till 3 och Det svåraste i del 4, med ankarna på metodens sida, och tiden i minuter, 180 ord i minuten avrundat till fem
 * (sajtens K-631; den kalla läsaren 2026-10-30: planen hade fem delar utan tid, och Det svåraste saknades).
 * @param {Record<string, any>} d metodens fil
 */
export function lasvagen(d) {
  const delar = UNDERVISNINGSMETODENS_DELAR.slice(0, 3).map((x) => ({ namn: `Del ${x.nr}, ${x.namn}`, ankare: `del-${x.id}` }));
  const ord = ordI([d.inledning, d.roll, d.karna?.komponenter?.map((k) => [k.namn, k.vad]), d.tidsschema, d.steg, d.fastnar, (d.amnesexempel ?? []).find((e) => e.huvud), d.stod, d.checklista, d.klassen, d.forsta?.text, d.progression, d.rutiner, d.uppfoljning, d.uppdrag, d.hinder]);
  return { delar: [...delar, { namn: 'Det svåraste, i del 4', ankare: 'det-svaraste' }], minuter: Math.max(5, Math.round(ord / 180 / 5) * 5) };
}

/** Uppföljningens rader i Med dig på vägen, i tidsordning: arbetslaget före start, besöken och arbetslaget i vecka 4 (riggens c8a40cc). En äldre fil har en rad för arbetslaget. */
export const MED_DIG_PA_VAGEN = Object.freeze(['arbetslaget-fore', 'arbetslaget', 'observationerna', 'arbetslaget-efter']);
/** Förlagans rad på lathundens tredje sida, när planeringsbladet är första lektionen i grått (riggens planeringsblad). */
const FORLAGAN = 'Det grå är en förlaga att skriva över. Minuterna är hållpunkter.';
/** Det svåraste i kort form (hinder.kort), som lathunden visar: risken och vad läraren gör (sajtens K-632, Niclas 2026-10-30). */
export const HINDRETS_KORT = Object.freeze({ meningar: 2, tecken: 220 });

/**
 * Första lektionens minuter med det läraren säger i varje del: delarna och minuterna ur tidsschemats variant "första
 * lektionen", och de en eller två första fraserna ur stegets `fraser` för samma del. Den första delen är rutinen i vecka 1
 * (forsta.text), så där står rutinens repliker, det som står inom citattecken i rutinens steg, och inte de två snabba
 * (granskare-3 nr 22). En rot för tabellen Första lektionen, minut för minut på metodens sida och Minuterna i lathunden.
 * Tom lista utan varianten.
 * @param {Record<string, any>} d metodens fil, läst
 * @returns {{ fas: string, tid: string, fraser: string[] }[]}
 */
export function forstaLektionensMinuter(d) {
  const lista = (/** @type {unknown} */ x) => /** @type {any[]} */ (Array.isArray(x) ? x : []);
  const varianten = lista(d.tidsschema?.varianter).find((x) => x.nar === 'första lektionen');
  const steg = lista(d.steg?.rader);
  const rutinens = lista(d.rutiner?.rader).filter((r) => String(r.vecka ?? '') === '1').flatMap((r) => [...lista(r.steg).join(' ').matchAll(/”([^”]+)”/g)].map((m) => m[1]));
  return lista(varianten?.delar).map((x) => ({ fas: x.fas, tid: String(x.tid), fraser: x.fas === steg[0]?.namn && rutinens.length ? rutinens : lista(steg.find((y) => y.namn === x.fas)?.fraser).slice(0, 2) }));
}

/**
 * @typedef {{ namn: string, text: string, niva?: number, under?: string }} LathundFakta
 * @typedef {{ id: string } & (
 *   { slag: 'fakta', rader: LathundFakta[] }
 *   | { slag: 'stycken', rubrik?: string, text: string[] }
 *   | { slag: 'kort', rubrik?: string, kort: { nr: number, namn: string, text: string, under: string }[], fot?: string }
 *   | { slag: 'not', namn: string, text: string }
 *   | { slag: 'checklista', rubrik: string, punkter: string[] }
 *   | { slag: 'minuter', rubrik: string, delar: { fas: string, tid: string, fraser: string[] }[] }
 *   | { slag: 'rutin', rubrik: string, namn: string, text: string, steg: string[] }
 *   | { slag: 'planering', plan: Record<string, any>, exempel?: Record<string, any>, variant?: string, gra: boolean, text?: string }
 *   | { slag: 'tabell', rubrik?: string, kolumner: string[], rader: string[][] }
 * )} LathundDel
 * @typedef {{ id: string, nr: number, namn: string, delar: LathundDel[] }} LathundSida
 */

/**
 * Lathunden Att komma igång (riggens standard, avsnitt 14; sajtens K-632): fyra sidor ur metodens fält som data, så att
 * sidan /metoder/<id>/lathund och riggens lathund i Word och pdf säger samma sak. Urvalet är riggens lathundBlock
 * (build/undervisningsmetod.mjs) som det stod 2026-10-30, och riggen ritar sin lathund ur den här funktionen. En sida har id,
 * nummer, namn och delarna i läsordning, och en del har id, slag och innehåll; renderaren ritar varje slag i sin form. Sida 1
 * är metoden: faktan, metodens text, kärnans komponenter och det svåraste. Sida 2 är vägen till måndag: checklistan, första
 * lektionen med minuterna och det läraren säger (forstaLektionensMinuter) och vecka 1:s rutiner. Sida 3 är planeringsbladet,
 * med första lektionen i grått som förlaga när metoden har den och annars huvudexemplets plan. Sida 4 är de första veckorna:
 * veckorna, de som är med på vägen, efter de första veckorna och en fallgrop per komponent; det man håller fast vid hör till
 * tiden efter och står i del 4 på metodens sida. Niclas beslut 2026-10-30, efter granskningen: Lärande totalt har
 * kommentaren under ordet (larandetIKort), som säger för vilka elever och i vilken form stödet gäller; det svåraste är
 * hinder.kort, risken och vad läraren gör, och utan den första meningen i hinder.text; Efter de första veckorna har två
 * meningar ur stodet. En del utan innehåll står inte med.
 * @param {Record<string, any>} d metodens fil, läst
 * @returns {LathundSida[]}
 */
export function lathundensSidor(d) {
  const lista = (/** @type {unknown} */ x) => /** @type {any[]} */ (Array.isArray(x) ? x : x ? [x] : []);
  const forsta = (/** @type {unknown} */ s, n = 1) => meningarna(s).slice(0, n).join(' ');
  const ev = d.profil?.evidens ?? {};
  const l = d.lathund ?? {};
  const larande = laget(ev.larande);
  const sv = svarighetensNiva(d.profil?.svarighet);
  const ko = kostnadensNiva(d.profil?.kostnad);
  const huvud = lista(d.amnesexempel).find((e) => e.huvud);
  const urad = (/** @type {string} */ id) => lista(d.uppfoljning?.rader).find((r) => r.id === id)?.vad;
  // En fallgrop per komponent, den första med Pröva i stället. Manusen för en svår stund står på metodens sida.
  const fallgropar = lista(d.fallgropar?.rader).filter((x, i, alla) => x.komponent && x.prova && alla.findIndex((y) => y.komponent === x.komponent && y.prova) === i);
  /** @type {LathundSida[]} */
  const sidor = [
    { id: 'metoden', nr: 1, namn: 'Metoden', delar: [
      { id: 'fakta', slag: 'fakta', rader: [
        { namn: 'Lektionen', text: d.tid ?? '' },
        { namn: 'De första veckorna', text: d.period ?? '' },
        { namn: 'Lärande totalt', text: larande.ord, ...(larande.slag === 'niva' ? { niva: larande.niva } : {}), under: larandetIKort(ev.larande) },
        { namn: 'Svårighet', text: sv ? SVARIGHETENS_ORD[sv] : '', ...(sv ? { niva: sv } : {}) },
        { namn: 'Kostnad', text: d.profil?.kostnad ? KOSTNADENS_ORD[ko] : '', niva: ko },
      ].filter((r) => r.text) },
      { id: 'text', slag: 'stycken', rubrik: 'Metoden', text: lista(l.metoden?.text) },
      { id: 'karnan', slag: 'kort', rubrik: 'Kärnan', kort: lista(d.karna?.komponenter).map((k, i) => ({ nr: i + 1, namn: k.namn, text: k.vad, under: lista(k.moment).join(' och ') })), fot: d.karna?.varv },
      { id: 'svarast', slag: 'not', namn: 'Det svåraste', text: d.hinder?.kort || forsta(d.hinder?.text) },
    ] },
    { id: 'mandag', nr: 2, namn: 'Vägen till måndag', delar: [
      { id: 'fore', slag: 'checklista', rubrik: d.checklista?.rubrik ?? 'Före första lektionen', punkter: lista(d.checklista?.punkter) },
      { id: 'forsta', slag: 'stycken', rubrik: 'Första lektionen', text: lista(l.lektion?.text) },
      { id: 'minuterna', slag: 'minuter', rubrik: 'Minuterna', delar: forstaLektionensMinuter(d).map((x) => ({ ...x, tid: x.tid.replace(/\s*min$/, '') })) },
      ...lista(d.rutiner?.rader).filter((r) => String(r.vecka ?? '') === '1').map((r, i) => /** @type {LathundDel} */ ({ id: `rutin-${i + 1}`, slag: 'rutin', rubrik: `Rutinen ${liten(r.namn)}`, namn: r.namn, text: r.vad ?? '', steg: lista(r.steg) })),
    ] },
    { id: 'planera', nr: 3, namn: 'Planera lektionen', delar: [
      d.forsta?.plan
        ? { id: 'bladet', slag: 'planering', plan: d.forsta.plan, exempel: huvud, variant: 'första lektionen', gra: true, text: FORLAGAN }
        : { id: 'bladet', slag: 'planering', plan: huvud?.plan, exempel: huvud, gra: false },
    ] },
    { id: 'veckorna', nr: 4, namn: l.igang?.rubrik ?? 'De första veckorna', delar: [
      { id: 'inledning', slag: 'stycken', text: [forsta(d.progression?.text, 2)] },
      { id: 'progression', slag: 'tabell', kolumner: ['Vecka', 'Klassen lär sig', 'Du övar', 'Gå vidare när'], rader: lista(d.progression?.rader).map((r) => [`${r.vecka}. ${r.rubrik}`, r.eleverna ?? r.fokus ?? '', r.roll ?? '', r.vidare ?? '']) },
      { id: 'med-dig', slag: 'not', namn: 'Med dig på vägen', text: MED_DIG_PA_VAGEN.map(urad).filter(Boolean).join(' ') },
      { id: 'efter', slag: 'not', namn: 'Efter de första veckorna', text: forsta(urad('stodet'), 2) },
      { id: 'glider', slag: 'tabell', rubrik: 'Om det glider', kolumner: ['Fallgropen', 'Pröva i stället'], rader: fallgropar.map((r) => [r.fallgrop, r.prova]) },
    ] },
  ];
  const harInnehall = (/** @type {LathundDel} */ x) => {
    switch (x.slag) {
      case 'fakta': return x.rader.length > 0;
      case 'stycken': case 'not': return lista(x.text).some(Boolean);
      case 'kort': return x.kort.length > 0;
      case 'checklista': return x.punkter.length > 0;
      case 'minuter': return x.delar.length > 0;
      case 'tabell': return x.rader.length > 0;
      case 'planering': return !!x.plan;
      default: return true;
    }
  };
  return sidor.map((s) => ({ ...s, delar: /** @type {LathundDel[]} */ (s.delar).filter(harInnehall) }));
}

/**
 * Effektens gränser i standardavvikelser (riggens evidensen.md, avsnitt 3). Stora randomiserade studier med prov som
 * forskarna inte har gjort själva följer Kraft (2020), som byggde skalan på 1 942 effekter i 747 randomiserade studier i
 * skolan. Andra studier och sammanställningar ger ungefär dubbelt så stora tal (Cheung och Slavin, 2016), och där ligger
 * gränserna på Cohens 0,2 och Hatties 0,40 (Niclas 2026-10-30: "Är de verkligen korrekt gängse regler att kalla ex 0.1
 * måttlig effekt?", och "Kör dina rekommendationer"). Sajtens text om skalan och riggens spärr läser samma tal.
 */
export const EFFEKTENS_GRANSER = Object.freeze({
  stora: Object.freeze({ mattlig: 0.05, stor: 0.2 }),
  andra: Object.freeze({ mattlig: 0.2, stor: 0.4 }),
});

/** Ett tal med decimalkomma och två decimaler, som skalans gränser skrivs. @param {number} x */
const skalansTal = (x) => x.toFixed(2).replace('.', ',');

/**
 * Platsen av 100 där eleven i mitten hamnar med en effekt på x standardavvikelser: normalfördelningen vid x, med erf
 * enligt Abramowitz och Stegun 7.1.26 (felet under 0,0000002). Vid 0,20 är det plats 58.
 * @param {number} x
 */
export function platsenAv100(x) {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return Math.round(50 * (1 + Math.sign(x) * erf));
}

/**
 * Hur effekten läses, samma i varje undervisningsmetod och kort nog för en lärare som inte är forskare: på metodens sida
 * i bilaga B och i metodkortets förklaring, och i riggens Word-fil (Niclas 2026-10-30: "skriv en liten text om detta i B
 * delen hur effektstorlek bedöms med orden", "ha samma i alla metoder", och "Det måste finnas någon kortare förklaring
 * vad 0.2 innebär ... För en lärare som inte är forskare. Enkelt och koncist"). Första stycket säger vad talet betyder,
 * och det andra orden. Gränserna kommer ur EFFEKTENS_GRANSER och platserna ur platsenAv100. Skälen till skalan står i
 * riggens evidensen.md, avsnitt 3.
 * @returns {{ rubrik: string, text: string[] }}
 */
export function effektensSkala() {
  const s = EFFEKTENS_GRANSER.stora;
  const a = EFFEKTENS_GRANSER.andra;
  const plats = (/** @type {number} */ x) => `plats ${platsenAv100(x)} vid ${skalansTal(x)}`;
  return {
    rubrik: 'Så läses effekten',
    text: [
      `Talet säger hur mycket bättre det gick för eleverna med metoden än för eleverna utan. Tänk dig 100 elever utan metoden på rad efter resultat. Eleven i mitten står på plats 50. Med metoden flyttar den eleven till ${plats(0.1)}, ${plats(s.stor)} och ${plats(a.stor)}.`,
      `I stora försök i många skolor är ${skalansTal(s.mattlig)} en måttlig och ${skalansTal(s.stor)} en stor effekt. Mindre studier ger ungefär dubbelt så stora tal, så där är ${skalansTal(a.mattlig)} måttlig och ${skalansTal(a.stor)} stor (Kraft, 2020; Cheung och Slavin, 2016). Under det är effekten liten. När resultatet inte är säkert står Inte säker.`,
    ],
  };
}
