// Undervisningsmetoderna, Metoder för läsaren (sajtens K-621, riggens standard för undervisningsmetoder). Delarna i lärarens
// väg som data, så att sidans innehållsrad, Word-filens band och riggens bygge läser samma lista (standarden, avsnitt 4),
// utfallens gränser för en klass (avsnitt 7), metodkortets nivåer (avsnitt 15) och lathundens fyra sidor (avsnitt 14).
// Riggen läser modulen genom build/standarden.mjs.

import { esc, litenForsta, meningarna, stor, talText } from './text.js';
import { larDigetsMetodplan, uppraknat } from './plan.js';
import { periodensLangd, slugAv } from './index.js';
import { strukturkortensFel } from './strukturer.js';
import { strategikortensFel } from './strategier.js';

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
  { id: 'att-skriva-ut', nr: 'A', namn: 'Att skriva ut', rad: 'Lektionskortet, materialet för klassen och mallarna.', text: 'Här står det du skriver ut: lektionskortet, materialet för klassen, planeringsmallen och observationsmallen för den som besöker en lektion.' },
  { id: 'valet', nr: 'B', namn: 'Valet och forskningen', rad: 'När metoden passar, vad kritiker säger och vad studierna visar.', text: '' },
];

/**
 * Delarna för en metod. I slaget strategier är del 2 ett lager som läraren lägger över sin egen planering, och ingen lektion på
 * ett antal minuter (Niclas 2026-11-01: "formativ bedömning är inte en lektion man planerar. Det är ett lager man lägger över
 * sin egen planering"). Ankaret är detsamma.
 * @param {Record<string, any>} d metodens fil
 */
export const delarnaAv = (d) => UNDERVISNINGSMETODENS_DELAR.map((x) => (x.id === 'lektionen' && d?.slag === 'strategier' ? { ...x, namn: 'Lagret', rad: 'Det du lägger in i din lektion, ställe för ställe.', text: 'Här står lagret ställe för ställe, med det du gör och säger. Sedan ser du det i en lektion i {amne} och i {andra} andra ämnen.' } : x));

/**
 * Det en metod hör ihop med (fältet relaterade), i Stödundervisning eller Metoder: en rot för båda samlingarnas sidor, lathunden
 * och länkarna i texten (Niclas 2026-11-01: "Både stöd och metoder ska funka för det med EN rot"). stod och metoder är de
 * publicerade, så att ett utkast står utanför tills det publiceras; ett id som inte finns stoppar bygget redan när metoderna
 * läses (provaHanvisade i src/lib/innehall.ts).
 * @param {{ relaterade?: string[] }} d metodens fil
 * @param {{ stod: { id: string, data: any }[], metoder: { id: string, data: any }[] }} poster
 * @param {(data: any) => string} arskursAv
 */
export const relateradeAv = (d, { stod, metoder }, arskursAv) => (d?.relaterade ?? []).flatMap((id) => {
  const s = stod.find((x) => x.id === id);
  if (s) return [{ id, titel: s.data.titel, href: `/stodundervisning/${id}`, meta: `Stödundervisning · ${s.data.omrade} · ${arskursAv(s.data)}` }];
  const m = metoder.find((x) => x.id === id);
  return m ? [{ id, titel: m.data.titel, href: `/metoder/${id}`, meta: `Metoder · ${arskursAv(m.data)}` }] : [];
});

/**
 * Felen i det en metod hänvisar till: ett id som inte finns, och ett id som är en metod i båda samlingarna, där länken annars
 * tyst leder till Stödundervisning, eller byter mål den dag ett utkast publiceras (provaHanvisade i src/lib/innehall.ts).
 * @param {{ relaterade?: string[], passar?: { metoder?: string[] } }} d metodens fil
 * @param {{ stod: Set<string>, metoder: Set<string> }} finns alla id i samlingarna, också utkasten
 */
export const hanvisadeMetodersFel = (d, { stod, metoder }) => [
  ...(d?.relaterade ?? []).filter((id) => !stod.has(id) && !metoder.has(id)).map((id) => `relaterade nämner ${id}, som inte är en metod i src/content/stodundervisning/ eller src/content/undervisningsmetoder/.`),
  ...(d?.relaterade ?? []).filter((id) => stod.has(id) && metoder.has(id)).map((id) => `relaterade nämner ${id}, som är en metod både i src/content/stodundervisning/ och i src/content/undervisningsmetoder/, så länken kan leda fel.`),
  ...(d?.passar?.metoder ?? []).filter((id) => !metoder.has(id)).map((id) => `passar.metoder nämner ${id}, som inte är en metod i src/content/undervisningsmetoder/.`),
];

/**
 * Var en fri tabell står i en undervisningsmetod: `efter-inledning` sist i del 1, `fore-lektionen` efter rutan Före lektionen i
 * del 2 och `efter-progression` efter veckorna. Allt
 * annat, som en tabell utan plats eller med mallens `efter-grund`, står sist i bilaga A, som i riggens Word-fil, så att ingen
 * tabell finns i filen men inte på sidan.
 * @param {{ plats?: string }} t tabellen
 * @param {{ progression?: unknown }} d metodens fil
 */
// fore-lektionen: direkt efter rutan Före lektionen i del 2, när tidsschemat har den raden, som rutan Så skriver du frågorna i
// Lärande på kognitionsvetenskaplig grund (riggens 9560dd8, K-743).
export const friTabellensPlats = (t, d) => (t?.plats === 'efter-inledning' || (t?.plats === 'efter-progression' && d?.progression) || (t?.plats === 'fore-lektionen' && (d?.tidsschema?.rader ?? []).some((/** @type {any} */ r) => r?.fas === 'Före lektionen')) ? t.plats : 'bilaga-a');

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

/**
 * Utfallens gränser i par, när metoden räknar elever i par och säger båda, som "Högst 5 av 28 elever i par utan ledtråd,
 * alltså högst två par": elevernas gränser delade med två, så att ett par aldrig räknas halvt (andra ögat på Reciprok
 * undervisning 2026-11-07: med 22 elever stod sju par eller fler kvar).
 * @param {number} n
 * @returns {{ nastanAlla: number, deFlesta: [number, number], halften: number }}
 */
export function utfallensPar(n) {
  const g = utfallensGranser(n);
  return { nastanAlla: Math.floor(g.nastanAlla / 2), deFlesta: [Math.ceil(g.deFlesta[0] / 2), Math.floor(g.deFlesta[1] / 2)], halften: Math.ceil(g.halften / 2) };
}

/**
 * Vad utfallens tal räknar, ur metodens egen mening i stegets redo: "elever i par utan ledtråd" i "Högst 5 av 28 elever i par
 * utan ledtråd, alltså högst två par", och annars "med fel" (riggens brev 2026-11-06 kväll, punkt 11). Riggens renderare har
 * samma regel, så att planeringsbladet säger samma sak på sidan, i lathunden och i Word.
 * @param {{ nastanAlla?: unknown } | null | undefined} redo
 */
export const utfallsord = (redo) => {
  const s = String(redo?.nastanAlla ?? '').replace(/[ ⁠]/g, ' ');
  return s.match(/^Högst \d+ av \d+ ([^.,]+?)[.,]/)?.[1] ?? s.match(/^Högst \S+ par ([^.,]+?)[.,]/)?.[1] ?? 'med fel';
};

/** Utfallens namn i beslutsstället, i ordning (standarden, avsnitt 7 och 18). */
export const UTFALLEN = /** @type {const} */ ([
  { id: 'nastanAlla', namn: 'Nästan alla kan' },
  { id: 'deFlesta', namn: 'De flesta kan' },
  { id: 'halften', namn: 'Hälften eller färre kan' },
]);

// Metodkortets nivåer (sajtens K-623, K-632 och K-641, riggens evidensen.md, avsnitt 6 och 7): tillförlitligheten sätter
// taket och effekten nivån, och låg tillförlitlighet utan effekt eller med negativ effekt är Oklart. Antalet fyllda staplar
// är nivån, 0 till 5 (Niclas 2026-10-30: "0 staplar men där staplarna finns är 0 effekt men mätt. Annars negativ eller
// oklart. 1 stapel är att det finns anekdotiskt stöd ... sedan vanliga som vi har nu ungefär"): 0 är mätt utan effekt,
// och 1 är läget anekdotiskt, utan studie med jämförelsegrupp. Svårighet och Kostnad räknas ur kriterierna. Räkningen och
// orden stod förut både i sajtens metodprofil.ts och i riggens build/sparrprov.mjs och står nu bara här, så att
// metodkortet, lathunden och riggens spärrar räknar med samma funktion.
const NIVAN = {
  hog: { negativ: 0, ingen: 0, liten: 3, mattlig: 4, stor: 5 },
  mattlig: { negativ: 0, ingen: 0, liten: 3, mattlig: 4, stor: 4 },
  lag: { negativ: 'oklart', ingen: 'oklart', liten: 2, mattlig: 2, stor: 2 },
};
/** Nivåernas ord, 0 till 5. Orden 2–5 och Inget påvisat stöd prövades på en kall läsare 2026-10-29: fem lärare ordnade dem lika. */
export const NIVAORD = Object.freeze(['Inget påvisat stöd', 'Anekdotiskt stöd', 'Svagt stöd', 'Visst stöd', 'Gott stöd', 'Starkt stöd']);
/** Ett område utan nivå står med sitt läge, som i metodens fil. Lärande totalt utan sammanställning är Inte sammanvägt. */
const UTAN_NIVA = { 'inte-studerat': 'Inte studerat', 'inte-sammanvagt': 'Inte sammanvägt', vantar: 'Väntar' };

/**
 * Vad varje nivå och läge betyder, i metodkortets ordning, för en lärare och med de begrepp en forskare känner igen
 * (Niclas 2026-10-30: "förklaras på rätt ställen också med korrekt språk både för läraren och ändå okej för forskare").
 * Metodkortets förklaring på sajten och riggens referensblad läser samma text. `staplar` är antalet fyllda staplar, och
 * null betyder att läget står utan staplar.
 */
export const NIVAERNAS_FORKLARING = Object.freeze([
  { ord: NIVAORD[5], staplar: 5, text: 'Hög tillförlitlighet och stor effekt. Flera sammanställningar och stora randomiserade försök visar samma sak.' },
  { ord: NIVAORD[4], staplar: 4, text: 'Minst måttlig tillförlitlighet och minst måttlig effekt.' },
  { ord: NIVAORD[3], staplar: 3, text: 'Minst måttlig tillförlitlighet och en liten effekt som är säker.' },
  { ord: NIVAORD[2], staplar: 2, text: 'Låg tillförlitlighet och en positiv effekt. Några studier med jämförelsegrupp visar effekt, men de är få, små eller har brister.' },
  { ord: NIVAORD[1], staplar: 1, text: 'Ingen studie med jämförelsegrupp, men fallstudier, mätningar före och efter, samband i större material eller lärares erfarenheter pekar mot en effekt. Det är ett skäl att pröva metoden och följa upp den noga.' },
  { ord: NIVAORD[0], staplar: 0, text: 'Studier med jämförelsegrupp och minst måttlig tillförlitlighet visar ingen effekt.' },
  { ord: 'Negativ effekt', staplar: 0, text: 'Studier med jämförelsegrupp och minst måttlig tillförlitlighet visar att resultaten blir sämre.' },
  { ord: 'Oklart', staplar: null, text: 'Få och osäkra studier, utan effekt eller med en negativ. Forskningen räcker inte för att säga något.' },
  { ord: UTAN_NIVA['inte-studerat'], staplar: null, text: 'Ingen har undersökt området, inte heller i fallstudier eller rapporter. Vi vet inte, och det betyder inte att metoden saknar effekt.' },
  { ord: UTAN_NIVA['inte-sammanvagt'], staplar: null, text: 'Bara för Lärande totalt: något ämnesområde saknar nivå, och ingen sammanställning väger ihop flera ämnen.' },
]);

/**
 * Läget för ett område i metodkortet: en nivå 0 till 5 med sitt ord, där nivå 0 med negativ effekt heter Negativ effekt,
 * Oklart, eller ett läge utan nivå med sitt ord. Ett område som saknas är Inte studerat, som i riggens skelett, och en
 * tillförlitlighet, effekt eller ett läge som tabellen inte har är okänt, med tomt ord, så att riggens spärrar kan säga det.
 * @param {{ tillforlitlighet?: string, effekt?: string, niva?: string } | undefined | null} v
 * @returns {{ slag: 'niva', niva: number, ord: string, negativ: boolean } | { slag: 'oklart' | 'inte' | 'okand', ord: string }}
 */
export function laget(v) {
  if (!v) return { slag: 'inte', ord: UTAN_NIVA['inte-studerat'] };
  // Anekdotiskt stöd är nivå 1, en stapel, utan tillförlitlighet och effekt att läsa ur tabellen.
  if ('niva' in v && v.niva === 'anekdotiskt') return { slag: 'niva', niva: 1, ord: NIVAORD[1], negativ: false };
  if ('niva' in v) return v.niva && Object.hasOwn(UTAN_NIVA, v.niva) ? { slag: 'inte', ord: UTAN_NIVA[/** @type {keyof typeof UTAN_NIVA} */ (v.niva)] } : { slag: 'okand', ord: '' };
  const n = /** @type {Record<string, Record<string, number | 'oklart'>>} */ (NIVAN)[v.tillforlitlighet ?? '']?.[v.effekt ?? ''];
  if (n === undefined) return { slag: 'okand', ord: '' };
  if (n === 'oklart') return { slag: 'oklart', ord: 'Oklart' };
  const negativ = n === 0 && v.effekt === 'negativ';
  return { slag: 'niva', niva: n, ord: negativ ? 'Negativ effekt' : NIVAORD[n], negativ };
}

/**
 * Rutinens rubrik: Rutinen och namnet, och bara namnet när det redan säger rutinen, som Parrutinen (riggens brev 2026-11-06
 * kväll, punkt 10: "Rutinen parrutinen"). kolon ger formen på en etikett, Rutinen: Provet.
 * @param {string} namn @param {{ kolon?: boolean }} [o]
 */
export const rutinensRubrik = (namn, { kolon = false } = {}) => (/rutinen$/i.test(namn) ? stor(namn) : kolon ? `Rutinen: ${namn}` : `Rutinen ${litenForsta(namn)}`);

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
/**
 * Raden under ett områdes namn på metodkortet, som säger vad området räknar: Ämnen är SO, NO och teknik (Niclas
 * 2026-10-29), och Läsning räknar läsförståelse också i engelska och moderna språk (Niclas beslut i Kooperativt lärande,
 * riggens punkt 14: flyttprovets engelsklärare visste inte vilket stöd metoden har i engelska).
 */
export const OMRADENAS_RAD = Object.freeze({ lasning: 'Också engelska och moderna språk', amnen: 'SO, NO och teknik' });
/** Faktarutans material: högst så många delar (undervisningsmetodensFel och sajtens schema). */
export const FAKTANS_MATERIAL = 6;
/**
 * Etiketterna över ämnesexemplets två rader, `overst.egen` och `overst.visar`, en för alla slag, så att sidan och riggens
 * Word-fil säger samma sak (riggens brev om Kooperativt lärande, punkt 23: Stegen och orden stod över en text utan steg).
 */
export const EXEMPLETS_ETIKETTER = Object.freeze({ egen: 'Innehållet och felet', visar: 'Så visar alla' });

/**
 * Primär evidens på metodkortet: det eller de två av sajtens fyra områden, som i Stödundervisning, där stödet är starkast,
 * minst Visst stöd (Niclas 2026-10-29). Ämnen och Lärande totalt blir aldrig primära. Står fler än två lika avgör
 * tillförlitligheten och sedan effekten, och står de lika också där, står alla (sajtens K-645, riggens punkt 12: i
 * Kooperativt lärande har Skrivning, Matematik och Socialt samma nivå, tillförlitlighet och effekt, och ordningen valde
 * förut bort Socialt). Räkningen stod förut i sajtens metodprofil.ts och står nu här, så att riggens spärr kan läsa den.
 * Kortet tar det första områdets färg.
 * @param {Record<string, any>} evidens metodens profil.evidens
 * @returns {string[]} områdenas namn
 */
export function primaraOmraden(evidens) {
  const T = { hog: 3, mattlig: 2, lag: 1 };
  const E = { stor: 4, mattlig: 3, liten: 2, ingen: 1, negativ: 0 };
  const kandidater = BANKENS_OMRADEN.slice(1).map((o, ordning) => {
    const v = evidens?.[o.id];
    const l = laget(v);
    return { namn: o.namn, ordning, niva: l.slag === 'niva' && !l.negativ ? l.niva : 0, t: /** @type {Record<string, number>} */ (T)[v?.tillforlitlighet] ?? 0, e: /** @type {Record<string, number>} */ (E)[v?.effekt] ?? 0 };
  }).filter((x) => x.niva >= 3);
  const hogst = Math.max(0, ...kandidater.map((x) => x.niva));
  const lika = kandidater.filter((x) => x.niva === hogst).sort((a, b) => b.t - a.t || b.e - a.e || a.ordning - b.ordning);
  return lika.filter((x, i) => i < 2 || (x.t === lika[1].t && x.e === lika[1].e)).map((x) => x.namn);
}
/** Regeln för Primär evidens i ord, i metodkortets förklaring. */
export const PRIMARA_REGELN = 'Primär evidens är det eller de två av sajtens fyra områden, Läsning, Skrivning, Matematik och Socialt, där stödet är starkast, minst Visst stöd. Står fler än två lika avgör tillförlitligheten och sedan effekten, och står de lika också där, står alla.';
/**
 * Raden Primär evidens när inget av de fyra områdena har minst Visst stöd. Den nämner områdena, eftersom Ämnen eller
 * Lärande totalt kan ha Gott stöd två rader ovanför, och "Inget område" lästes då som ett fel (riggens kalla läsare på
 * Testbaserat lärande 2026-11-02). Sajtens kort och riggens Word-fil läser samma ord.
 */
export const PRIMARA_UTAN_OMRADE = 'Inget av läsning, skrivning, matematik och socialt har minst visst stöd';
/** Raden under, som säger varför Ämnen eller Lärande totalt med Gott stöd inte räknas (verifieringen 2026-11-02). */
export const PRIMARA_RAKNAS_INTE = 'Ämnen och Lärande totalt räknas inte här.';
/**
 * Filmernas namn i riggens out/<id>/ och, med metodens id först, i sajtens public/metoder/: huvudfilmen `film` och en
 * `film<nr>` för varje extrafilm i `filmer`, som src/lib/film.ts ger adresserna. En rot för intaget
 * (scripts/metoderfiler.mjs) och leveransprovet (scripts/metodriggprov.mjs), så att en tredje film följer med av sig själv
 * (K-645: intaget tog förut bara film och film2).
 * @param {{ film?: unknown, filmer?: { nr: number }[] }} d metodens fil
 * @returns {string[]}
 */
export const metodensFilmnamn = (d) => [...(d.film ? ['film'] : []), ...(Array.isArray(d.filmer) ? d.filmer : []).map((f) => `film${f.nr}`)];
/** Fälten som en del på metodens sida läser, med delen. */
const SIDANS_FALT = ['karna', 'fastnar', 'stod', 'amnesexempel', 'hinder', 'fallgropar', 'hallFast', 'checklista', 'forsta', 'progression', 'rutiner', 'uppfoljning', 'uppdrag', 'planeringsmall', 'observation', 'ramar', 'passar', 'invandningar', 'grund', 'lasMer', 'larandet', 'roll', 'klassen'];

/** Allmänna ord för material, som står i namn som "bladet Samarbetsfärdigheterna" och som vanliga ord i metodens text. */
export const ALLMANNA_SAKORD = Object.freeze(['bladet', 'bladen', 'kortet', 'korten', 'affischen', 'affischerna', 'mallen', 'mallarna', 'lappen', 'lapparna', 'listan', 'listorna', 'tabellen', 'tabellerna', 'boken', 'böckerna', 'arket', 'arken', 'frågorna', 'fraserna', 'kartan', 'protokollet', 'orden', 'texten', 'texterna', 'planen', 'filmen']);
/**
 * Ett namns första ord ensamt, som "rutan" för bladet Rutan på tavlan (STIL.md under Hänvisningar: ett allmänt ord för en
 * bestämd sak byts mot sakens namn; Niclas 2026-11-08 om Skriva för att lära: "Vad då rutan? Förstår en läsare när man bara
 * säger 'skriv i rutan?'", K-749). Gäller bladen i metodens material vars namn har flera ord och börjar med ett bestämt
 * substantiv på minst fem bokstäver. Varje del av metodens fil, det närmaste objektet med sina texter och listor av texter,
 * läses i filens ordning, och första gången ordet står i delen ska det vara hela namnet; sedan får det stå ensamt. Allmänna
 * ord för material, som bladet och kortet, prövas inte (ALLMANNA_SAKORD), eftersom de står i namn som "bladet
 * Samarbetsfärdigheterna" och som vanliga ord. Om metodens egna ord är förklarade där läraren läser dem först avgör en kall
 * läsare, inte ett prov.
 * @param {Record<string, any>} d metodens fil
 * @returns {string[]}
 */
export function namnetsForstaOrdFel(d) {
  const namnen = (d?.ramar?.ramar ?? []).map((/** @type {{ rubrik?: string }} */ r) => String(r?.rubrik ?? '').trim()).filter((n) => {
    const ord = n.split(/\s+/);
    const forsta = ord[0].toLocaleLowerCase('sv');
    return ord.length > 1 && /^\p{L}{3,}(?:an|en|et|na)$/u.test(forsta) && !ALLMANNA_SAKORD.includes(forsta);
  });
  if (!namnen.length) return [];
  /** @type {{ vag: string, text: string }[]} */
  const delar = [];
  const vandra = (/** @type {unknown} */ x, /** @type {string} */ vag) => {
    if (!x || typeof x !== 'object' || x instanceof Date) return;
    /** @type {string[]} */
    const egna = [];
    /** @type {[unknown, string][]} */
    const under = [];
    for (const [k, v] of Object.entries(x)) {
      const p = Array.isArray(x) ? `${vag}[${k}]` : vag ? `${vag}.${k}` : k;
      if (typeof v === 'string') egna.push(v);
      else if (Array.isArray(v) && v.length && v.every((y) => typeof y === 'string')) egna.push(...v);
      else under.push([v, p]);
    }
    if (egna.length) delar.push({ vag: vag || 'metodens huvud', text: egna.join('\n') });
    for (const [v, p] of under) vandra(v, p);
  };
  vandra(d, '');
  /** @type {string[]} */
  const fel = [];
  for (const namn of namnen) {
    const ordet = namn.split(/\s+/)[0];
    const re = new RegExp(`(?<![\\p{L}\\d-])${ordet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\d-])`, 'iu');
    for (const del of delar) {
      const m = re.exec(del.text);
      if (!m || del.text.slice(m.index, m.index + namn.length).toLocaleLowerCase('sv') === namn.toLocaleLowerCase('sv')) continue;
      fel.push(`${del.vag} säger "${m[0]}" innan delen har sagt ${namn}: skriv sakens namn första gången i delen, och fältets namn när det gäller ett fält (STIL.md under Hänvisningar)`);
    }
  }
  return fel;
}
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
  // Har alla fyra ämnesområden en nivå slås de ihop till Lärande totalt (Niclas 2026-11-06, riggens evidensen.md, avsnitt 7).
  if (ev.larande?.niva === 'inte-sammanvagt' && ['lasning', 'skrivning', 'matematik', 'amnen'].every((o) => laget(ev[o]).slag === 'niva')) fel.push('profil.evidens.larande: Inte sammanvägt gäller bara när något av Läsning, Skrivning, Matematik och Ämnen saknar nivå. Har alla fyra en nivå slås de ihop: tillförlitligheten och effekten är medianen av deras ord, och vid jämnt antal det högre av de två i mitten');
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
  // Faktarutans material, det viktigaste på några rader, som i Stödundervisning (Niclas 2026-10-02: "Viktigaste och en länk
  // till rätt ställe"). Regeln stod förut bara i sajtens schema, så riggens leveransprov såg den inte (K-645).
  if (Array.isArray(d.material) && d.material.length > FAKTANS_MATERIAL) fel.push(`material har ${d.material.length} delar, och faktarutan rymmer ${FAKTANS_MATERIAL}: det viktigaste, och resten i Materialet för klassen`);
  krav('film', d.film, 'huvudfilmen');
  for (const f of d.filmer ?? []) krav(`filmer ${f.nr}.efter`, f.efter, 'platsen för extrafilmen');
  krav('hinder.kort', d.hinder?.kort, 'Det svåraste i lathunden: risken och vad läraren gör');
  if (meningarna(d.hinder?.kort).length > HINDRETS_KORT.meningar) fel.push(`hinder.kort har fler än ${HINDRETS_KORT.meningar} meningar`);
  if (String(d.hinder?.kort ?? '').length > HINDRETS_KORT.tecken) fel.push(`hinder.kort har fler än ${HINDRETS_KORT.tecken} tecken`);
  // Bankens filter: syftet och slaget (sajtens K-642).
  const syften = Array.isArray(d.syfte) ? d.syfte : [];
  if (syften.length < 1 || syften.length > 2) fel.push('syfte ska ha ett eller två av ' + SYFTEN.map((x) => x.id).join(', ') + ': banken filtrerar på det under Du vill');
  for (const s of syften) if (!SYFTEN.some((x) => x.id === s)) fel.push(`syfte ${s} finns inte i standardens SYFTEN`);
  if (!Object.hasOwn(ANVANDS_I, d.slag)) fel.push(`slag ${d.slag} är inte ett av ${Object.keys(ANVANDS_I).join(', ')}`);
  if ('mal' in d) fel.push('mal står i metoden: en undervisningsmetod har inget mål, läraren skriver sitt i Lär dig metoden (Niclas 2026-10-30)');
  fel.push(...lathundensTakFel(d));
  fel.push(...strukturkortensFel(d.strukturkort));
  fel.push(...strategikortensFel(d.strategikort));
  fel.push(...namnetsForstaOrdFel(d));
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
  const delar = delarnaAv(d).slice(0, 3).map((x) => ({ namn: `Del ${x.nr}, ${x.namn}`, ankare: `del-${x.id}` }));
  const ord = ordI([d.inledning, d.roll, d.karna?.komponenter?.map((k) => [k.namn, k.vad]), d.tidsschema, d.steg, d.fastnar, (d.amnesexempel ?? []).find((e) => e.huvud), d.stod, d.checklista, d.klassen, d.forsta?.text, d.progression, d.rutiner, d.uppfoljning, d.uppdrag, d.hinder]);
  return { delar: [...delar, { namn: 'Det svåraste, i del 4', ankare: 'det-svaraste' }], minuter: Math.max(5, Math.round(ord / 180 / 5) * 5) };
}

/** Uppföljningens rader i Med dig på vägen, i tidsordning: arbetslaget före start, besöken och arbetslaget i vecka 4 (riggens c8a40cc). En äldre fil har en rad för arbetslaget. */
export const MED_DIG_PA_VAGEN = Object.freeze(['arbetslaget-fore', 'arbetslaget', 'observationerna', 'arbetslaget-efter']);
/**
 * Namnen på områdena i Så syns lärandet i klassen (`larandet.omraden`), som metodens sida och riggens Word-fil skriver dem
 * (granskningen inför lanseringen, G10: socialt saknades i sajtens lista, så id:t stod med liten bokstav där Word skriver Det
 * sociala). Ett område som listan inte har står med sitt id.
 */
export const LARANDETS_OMRADEN = Object.freeze({ amneskunskaper: 'Ämneskunskaperna', sprak: 'Språket', lasning: 'Läsningen', skrivning: 'Skrivandet', kommunikation: 'Kommunikationen', samarbete: 'Samarbetet', socialt: 'Det sociala' });
/**
 * Riggens fasta text om arbetslagets möten i Till arbetslaget (riggens 1b71a99, build/undervisningsmetod.mjs rad 461–475),
 * ordagrant, så att metodens sida och riggens Word-fil säger samma sak (granskningen inför lanseringen, G11: sidan saknade
 * vem som leder, Mellan mötena, Möte 2:s instruktion och den femte frågan). arbetslagetsMoten ordnar delarna ur metodens fil.
 */
export const ARBETSLAGETS_MOTEN = Object.freeze({
  leder: 'En förstelärare eller specialläraren leder mötena, och rektor ger arbetslaget tiden. Besöken är stöd och ingen bedömning.',
  mote1: 'Möte 1, före första lektionen',
  mellan: 'Mellan mötena',
  mote2: 'Möte 2, i slutet av vecka',
  mote2UtanVecka: 'Möte 2, i slutet av de första veckorna',
  mote2Text: 'Ni tar frågorna enskilt, i par och sedan alla: var och en tänker först själv, sedan pratar ni två och två, och sist delar ni med alla. Var och en säger sist vad hen tar med sig.',
  sistaFragan: 'Hur fortsätter vi: med metoden i vardagen, i ett ämne till, och vem besöker vem nästa gång?',
});
/**
 * Till arbetslaget i riggens ordning, en rot för metodens sida och riggens renderare: metodens text (`uppdrag.text`), raden
 * om vem som leder i liten stil, och mötena, var och ett med rubrik, stycken och en numrerad lista: Möte 1 med
 * `uppdrag.forbered`, Mellan mötena med `uppdrag.planera` och `uppdrag.genomfor` när metoden har dem, och Möte 2 i slutet av
 * periodens första vecka (`periodensLangd(period).min`), med det ni tar med (`uppdrag.taMed` eller slagets), Möte 2:s
 * instruktion och `uppdrag.reflektera` och sist den femte frågan. Null utan `uppdrag`.
 * @param {Record<string, any>} d metodens fil, läst
 * @returns {{ rubrik: string, text: string, leder: string, moten: { id: string, rubrik: string, text: string[], fragor: string[] }[] } | null}
 */
export function arbetslagetsMoten(d) {
  const u = d?.uppdrag;
  if (!u) return null;
  const M = ARBETSLAGETS_MOTEN;
  const lista = (/** @type {unknown} */ x) => /** @type {string[]} */ ((Array.isArray(x) ? x : x ? [x] : []).filter(Boolean));
  const vecka = periodensLangd(d.period)?.min;
  const moten = [
    { id: 'mote-1', rubrik: M.mote1, text: lista(u.forbered?.text), fragor: lista(u.forbered?.fragor) },
    { id: 'mellan', rubrik: M.mellan, text: lista([u.planera, u.genomfor]), fragor: [] },
    // Det ni tar med till Möte 2 är metodens egen mening när den har en (`uppdrag.taMed`), som grovplaneringarna i
    // Testbaserat lärande, och annars slagets (andra ögat 2026-11-02: Möte 2 sa planeringen med kryssen, och metoden ses med
    // grovplaneringarna).
    { id: 'mote-2', rubrik: vecka ? `${M.mote2} ${vecka}` : M.mote2UtanVecka, text: [`${u.taMed ?? slagensOrd(d).taMed} ${M.mote2Text}`], fragor: [...lista(u.reflektera), M.sistaFragan] },
  ].filter((m) => m.id === 'mote-2' || m.text.length || m.fragor.length);
  return { rubrik: u.rubrik ?? 'Till arbetslaget', text: String(u.text ?? ''), leder: M.leder, moten };
}
/**
 * Det som skiljer slagen åt i vägen till måndag (sajtens K-645, riggens brev om Kooperativt lärande 2026-10-30): i ett
 * lektionsförlopp är den första lektionen med metoden en hel lektion, och i en metod med strukturer gör klassen korta
 * samarbeten den första veckan och den första hela lektionen i vecka 2 eller 3 (Niclas N2). `forstaLektionen` är lektionen
 * som minuterna och den grå planen i planeringsmallen gäller, och `din` samma lektion inne i en mening. Avsnittets rubrik,
 * Första lektionen eller Första veckan, är metodens egen (`forsta.rubrik`). Ett slag som tabellen inte har får ett
 * lektionsförlopps form.
 */
const LEKTIONENS_ORD = Object.freeze({ planera: 'Planera lektionen', planeraRad: 'Planera varje lektion på ett blad i planeringsmallen.', delarna: 'Lektionens delar', hela: 'Hela lektionen', lathunden: 'planeringen av en lektion', kortet: 'Lektion', alla: 'Alla elever visar', beslut: 'Beslutet', zon: 'Lektionen', bladetsBeslut: 'Beslutet', lasning: 'före första lektionen', strukturkortVid: 'fore', taMed: 'Ta med planeringsmallen med Efter lektionen ifylld och observationsmallarna.' });
// Lagret står i en rubrik bara som del 2 (delarnaAv); de andra rubrikerna har vanliga ord (K-703; Niclas 2026-11-03: "Vissa
// rubriker blir stela med 'Lagret på...' ... lite på näsan att ha det i alla titlar hela tiden. Gillar inte för långa titlar
// som blir som meningar."). Rubriken i del 3 heter Planering, som riggens planeringsblad, eftersom Formativ bedömning har en del i
// lektionen som heter Din planering (andra ögat 2026-11-04, P2).
const LAGRETS_ORD = Object.freeze({ planera: 'Planering', planeraRad: 'Skriv det här på den planering du har, eller på bladet i planeringsmallen när du vill.', delarna: 'Delarna', hela: 'Lagret i din lektion', lathunden: 'din planering', kortet: 'Din lektion', alla: 'Eleverna', beslut: 'Så avgör du', zon: 'Lagret', bladetsBeslut: 'Vägarna', lasning: 'under vecka 1', strukturkortVid: 'efter', taMed: 'Ta med din planering med dina kryss och observationsmallarna.' });
export const SLAGENS_FORM = Object.freeze({
  lektionsforlopp: Object.freeze({ forstaLektionen: 'Första lektionen', din: 'din första lektion', start: 'Första lektionen med eleverna', ...LEKTIONENS_ORD }),
  strukturer: Object.freeze({ forstaLektionen: 'Den första hela lektionen', din: 'din första hela lektion', start: 'Första samarbetet med eleverna', ...LEKTIONENS_ORD }),
  strategier: Object.freeze({ forstaLektionen: 'Första lektionen', din: 'din första lektion', start: 'Första lektionen med eleverna', ...LAGRETS_ORD }),
});
/**
 * Slagets ord, en rot för sidan, planeringsbladet, lathunden, metodkortet och mejlet: i slaget strategier säger de lagret och
 * din egen lektion, och aldrig en lektion att planera (Niclas 2026-11-01). Ett slag som tabellen inte har får ett lektionsförlopps ord.
 * @param {Record<string, any>} d metodens fil
 */
/**
 * Säger tiden i slaget strategier lagrets minuter i lektionen, "12 minuter i din lektion" i Testbaserat lärande, och inte
 * lektionen som lagret ligger över, "Din lektion, 45 minuter" i Formativ bedömning? Metodkortets etikett och bankens Används i
 * läser samma sak.
 * @param {Record<string, any>} d metodens fil
 */
export const lagretIDinLektion = (d) => d?.slag === 'strategier' && /\bi din lektion\b/i.test(String(d?.tid ?? ''));

// ---------- Lagret i lärarens lektion ----------
// Riggens standard, avsnitt 7 och 16 (2026-11-08; sajtens K-739 och K-741). Niclas samma dag: "Själva skrivandet är ju inte en
// hel lektion, utan valda delar för att förstärka lärandet", och om Lär dig metoden: "Att det handlar om att integrera de små
// delarna i de vanliga lektioner man har." I slaget strategier är lärarens egen lektion ramen, och lagrets ställen står i den.
// Remsan i del 2 och veckorna i Lär dig metoden ritar lektionen i skala ur samma rot.

/** Ställenas platser i lärarens lektion, i lektionens ordning (fältet `var`). */
export const LAGRETS_VAR = Object.freeze(['i början', 'mitt i', 'i slutet']);

/**
 * Lektionens delar i tidsschemat, utan raderna Före lektionen och Efter lektionen, som riggens standard sätter först och sist med
 * en tid som inte är minuter. En del vars tid inte börjar med minuter står med, så att spärren säger det i stället för att delen
 * faller bort (Codex 2026-11-08, nr 5).
 * @param {Record<string, any>} d metodens fil
 * @returns {Record<string, any>[]}
 */
const lektionensDelar = (d) => (d?.tidsschema?.rader ?? []).filter((/** @type {any} */ r) => !/^(före|efter)\b/i.test(String(r?.tid ?? '').trim()));

/**
 * Minuterna i en dels tid i tidsschemat, den kortaste och den längsta: "5 min" 5 och 5, "5–⁠7 min" 5 och 7, "1 min och sedan
 * vägen" 1 och 1. Null när tiden inte börjar med minuter.
 * @param {unknown} tid
 * @returns {{ min: number, max: number } | null}
 */
export const delensMinuter = (tid) => {
  const m = String(tid ?? '').replace(/⁠/g, '').match(/^(\d+)(?:\s*[–-]\s*(\d+))?\s*min/);
  return m ? { min: Number(m[1]), max: Number(m[2] ?? m[1]) } : null;
};

/**
 * Lagret i lärarens lektion ur metodens fil: lektionens längd (`tidsschema.minuter`), lärarens egen lektion (raden med
 * `ram: true`), lektionens delar i ordning med ställenas plats (`var`) och minuter, och veckornas ställen
 * (`progression.rader[].stallen`) efter veckans värde. En metod som riggen ännu inte har öppnat får fälten ur `bro`, sajtens
 * datafil. Null utom i slaget strategier, och när fälten saknas.
 * @param {Record<string, any>} d metodens fil
 * @param {{ minuter?: number, ram?: string, var?: Record<string, string>, stallen?: Record<string, string[]>, rutiner?: Record<string, string>, vantar?: string }} [bro]
 * @returns {{ minuter: number, ram: string, rader: { namn: string, ram?: true, var?: string, tid: string, min: number, max: number }[], stallen: { namn: string, var: string, tid: string, min: number, max: number }[], veckor: Record<string, string[]> } | null}
 */
export function lagretAv(d, bro) {
  if (d?.slag !== 'strategier') return null;
  /** @type {Record<string, any>[]} */
  const delar = lektionensDelar(d);
  const ram = delar.find((r) => r?.ram === true) ?? (bro?.ram ? delar.find((r) => r?.fas === bro.ram) : undefined);
  const minuter = d.tidsschema?.minuter ?? bro?.minuter;
  if (!ram || !Number.isInteger(minuter)) return null;
  const rader = delar.map((r) => {
    const m = delensMinuter(r.tid) ?? { min: 0, max: 0 };
    return r === ram ? { namn: String(r.fas), ram: /** @type {true} */ (true), tid: String(r.tid), ...m } : { namn: String(r.fas), var: String(r.var ?? bro?.var?.[r.fas] ?? ''), tid: String(r.tid), ...m };
  });
  const veckor = Object.fromEntries((d.progression?.rader ?? []).map((/** @type {any} */ v) => {
    const k = String(v?.vecka ?? '');
    return [k, (Array.isArray(v?.stallen) ? v.stallen : bro?.stallen?.[k] ?? []).map(String)];
  }));
  // Rutinerna och delen där var och en görs (`rutiner.rader[].stalle`, riggens standard, avsnitt 7, raden Rutinerna; K-744).
  const rutiner = Object.fromEntries((d.rutiner?.rader ?? []).flatMap((/** @type {any} */ r) => { const s = r?.stalle ?? bro?.rutiner?.[r?.namn]; return r?.namn && s ? [[String(r.namn), String(s)]] : []; }));
  // Greppen inne i lärarens lektion, utan egna minuter (`tidsschema.rader[].grepp` på ramens rad, riggens standard, avsnitt 7,
  // raden Grepp inne i lektionen; K-743). Veckans `stallen` får nämna ett grepp med sitt namn.
  const grepp = (Array.isArray(ram.grepp) ? ram.grepp : []).map(String);
  return { minuter, ram: String(ram.fas), rader, stallen: /** @type {any} */ (rader.filter((r) => !r.ram)), grepp, veckor, rutiner };
}

/**
 * Om ett greppnamn är en del i metoden, som standarden säger att greppet har sitt hem i: en del i kärnan, en rutin eller en
 * tabell (riggens standard, avsnitt 7, raden Grepp inne i lektionen; K-743). Remsan och veckorna leder greppet till kortet för
 * lärarens lektion i del 2, där metoden säger hur läraren tar det (den kalla läraren Elin 2026-11-09).
 * @param {Record<string, any>} d metodens fil
 * @param {string} namn greppets namn
 */
const greppetsDel = (d, namn) => [...(d?.karna?.komponenter ?? []), ...(d?.rutiner?.rader ?? [])].some((/** @type {any} */ x) => x?.namn === namn) || (d?.tabeller ?? []).some((/** @type {any} */ x) => x?.rubrik === namn);
/**
 * Det som står i stället för minuterna vid ett grepp, i remsan i del 2 och i veckorna i Lär dig metoden: läraren tar greppet när
 * innehållet behöver det, och det har inga egna minuter (idéagenterna 2026-11-08, K-743). Ordet ram och ordet verktyg står inte
 * vid lärarens lektion: i metoden är ramen ställena, och på sajten är ett verktyg en egen sida (riggens brev 2026-11-08).
 */
export const GREPPETS_TID = 'vid behov';
/**
 * Det som står i stället för minuterna vid lärarens lektion i veckorna i Lär dig metoden, där lektionen har lärarens egen längd:
 * resten av lektionen, som meningen under ställena (användbarheten 2026-11-09: skalans grå del hade ingen rad; K-743).
 */
export const LARARENS_TID = 'resten av lektionen';

/**
 * Lagrets skala, som remsan i del 2 och veckorna i Lär dig metoden ritar: lektionens minuter med de valda ställena på sina
 * platser och lärarens lektion i resten, delad lika före och efter ställena mitt i. Ett ställe med ett spann får spannets mitt,
 * och lärarens lektion bär sitt namn i den första luckan. Utan val alla ställen. Greppen bland de valda har inga minuter och
 * står inte i skalan, utan i `grepp`, som remsan och veckan ritar inne i lärarens lektion (K-743).
 * @param {{ minuter: number, ram: string, stallen: { namn: string, var: string, min: number, max: number }[], grepp?: string[] }} lagret lagretAv
 * @param {string[]} [valda] ställenas och greppens namn
 * @returns {{ stallen: { namn: string, var: string, tid?: string, min: number, max: number }[], grepp: string[], skala: { namn: string, ram?: true, minuter: number }[], min: number, max: number }}
 */
export function lagretsSkala(lagret, valda) {
  const stallen = lagret.stallen.filter((x) => !valda || valda.includes(x.namn));
  const grepp = (lagret.grepp ?? []).filter((x) => !valda || valda.includes(x));
  const mitt = (/** @type {{ min: number, max: number }} */ x) => (x.min + x.max) / 2;
  const [borjan, mittI, slutet] = LAGRETS_VAR.map((v) => stallen.filter((x) => x.var === v));
  const resten = Math.max(0, lagret.minuter - stallen.reduce((s, x) => s + mitt(x), 0)) / (mittI.length ? 2 : 1);
  const stalle = (/** @type {{ namn: string, min: number, max: number }} */ x) => ({ namn: x.namn, minuter: mitt(x) });
  const ram = (/** @type {string} */ namn) => ({ namn, ram: /** @type {true} */ (true), minuter: resten });
  return {
    stallen,
    grepp,
    skala: [...borjan.map(stalle), ram(lagret.ram), ...(mittI.length ? [...mittI.map(stalle), ram('')] : []), ...slutet.map(stalle)],
    min: stallen.reduce((s, x) => s + x.min, 0),
    max: stallen.reduce((s, x) => s + x.max, 0),
  };
}

/** Minuterna som ett tal eller ett spann: "5" eller "5–⁠7". @param {{ min: number, max: number }} x */
const minuternasSpann = (x) => (x.min === x.max ? String(x.min) : `${x.min}–⁠${x.max}`);
/** Ställets plats och minuter, som raderna i Lär dig metoden säger dem: "mitt i, 5–⁠7 min". @param {{ var: string, min: number, max: number }} x */
export const stalletsTid = (x) => `${x.var}, ${minuternasSpann(x)} min`;

/**
 * Skalan som HTML, en rot för remsan i del 2 och veckorna i Lär dig metoden: en rad med lärarens lektion i grått, med sitt namn i
 * den första luckan, och ställena i blått, var och en så bred som sina minuter. Den är dold för skärmläsare, eftersom raderna
 * under säger samma sak med ord.
 * @param {{ namn: string, ram?: true, minuter: number }[]} skala lagretsSkala
 */
export const lagretsSkalaHtml = (skala) => `<div class="um-skala" aria-hidden="true">${skala.map((x) => `<span${x.ram ? ' class="um-skala-ram"' : ''} style="flex: ${x.minuter} 1 0">${x.ram ? esc(x.namn) : ''}</span>`).join('')}</div>`;

/**
 * Meningen under ställena i Lär dig metoden: "Stanna och skriv tar 5–⁠7 av lektionens 45 minuter. Resten av lektionen är din."
 * Med flera ställen "Med alla veckans ställen tar det 10–⁠12 …", eftersom läraren ofta väljer färre (riggens standard, Ställena).
 * @param {{ stallen: { namn: string }[], min: number, max: number }} s lagretsSkala
 * @param {number} minuter lektionens längd
 * @param {string} [vilka] ordet före ställen, som "veckans"
 */
// På metodens sida är lektionen metodens exempel, "av en lektion på 45 minuter", och i Lär dig metoden lärarens egen, "av
// lektionens 60 minuter" (de kalla läsarna 2026-11-08 med lektioner på 40 och 60 minuter läste sidans 45 som ett krav).
// Med grepp säger meningen också var de tas, med metodens egna ord "när innehållet behöver dem" (användbarheten och den kalla
// läraren Sara 2026-11-09: greppen lästes som delar att göra varje lektion; K-743).
export const lagretsMening = (s, minuter, vilka = '', { exempel = false } = {}) => {
  const tal = minuternasSpann(s);
  const grepp = s.grepp ?? [];
  const resten = grepp.length ? `Resten av lektionen är din, och där tar du ${uppraknat(grepp)} när innehållet behöver ${grepp.length === 1 ? 'det' : 'dem'}.` : 'Resten av lektionen är din.';
  return `${s.stallen.length === 1 ? `${s.stallen[0].namn} tar` : `Med alla ${vilka ? `${vilka} ` : ''}ställen tar det`} ${tal} av ${exempel ? 'en lektion på' : 'lektionens'} ${minuter} minuter. ${resten}`;
};

/**
 * Ställena som är nya i en vecka jämfört med veckan före i planen, som Lär dig metoden märker Ny. Inga när veckan före har samma
 * steg, som en vecka till eller en vecka som progressionen inte har en egen rad för, och inga i den första veckan (Codex
 * 2026-11-08, nr 7).
 * @param {{ veckor: Record<string, string[]> }} lagret lagretAv
 * @param {string | undefined} vecka progressionens vecka för veckan
 * @param {string | undefined} forra progressionens vecka för veckan före i planen
 * @returns {string[]}
 */
/**
 * Veckans rutiner med delen där var och en görs, som Lär dig metoden sätter i ställets rad, och en rutin i lärarens lektion under
 * ställena (riggens standard, avsnitt 7, raden Rutinerna; de kalla lärarna 2026-11-08: veckans nya rutin stod inte i veckans
 * lektion; K-744). En rutin utan del står inte med.
 * @param {{ ram: string, rutiner?: Record<string, string> }} lagret lagretAv
 * @param {{ namn: string }[]} rutiner veckans rutiner
 * @returns {{ namn: string, stalle: string, ram: boolean }[]}
 */
export const lagretsRutiner = (lagret, rutiner) => rutiner.flatMap((r) => { const s = lagret.rutiner?.[r.namn]; return s ? [{ namn: r.namn, stalle: s, ram: s === lagret.ram }] : []; });

export const lagretsNya = (lagret, vecka, forra) => (vecka === undefined || forra === undefined || vecka === forra ? [] : (lagret.veckor[vecka] ?? []).filter((x) => !(lagret.veckor[forra] ?? []).includes(x)));

/**
 * Felen i lagret (riggens standard, avsnitt 7; sajtens K-739): i slaget strategier är en rad lärarens lektion, varje annan del
 * har sin plats och sina minuter, lektionen har sin längd och varje vecka sina ställen, i metodens fil eller i sajtens datafil
 * (`bro`), aldrig i båda. En metod som väntar på riggens omtag står i datafilen med `vantar` och skälet.
 * @param {Record<string, any>} d metodens fil
 * @param {{ minuter?: number, ram?: string, var?: Record<string, string>, stallen?: Record<string, string[]>, rutiner?: Record<string, string>, vantar?: string }} [bro]
 * @returns {string[]}
 */
/**
 * Om metodens fil har lagrets fält, ram, var, minuter eller veckornas ställen. En rot för spärren och riggens prov, som prövar
 * riggens fil utan sajtens datafil när filen har fälten (kodgranskningen 2026-11-09).
 * @param {Record<string, any>} d metodens fil
 */
export const lagretIFilen = (d) => lektionensDelar(d).some((/** @type {any} */ r) => r?.ram !== undefined || r?.var !== undefined) || d?.tidsschema?.minuter !== undefined || (d?.progression?.rader ?? []).some((/** @type {any} */ v) => v?.stallen !== undefined);
export function lagretsFel(d, bro) {
  if (d?.slag !== 'strategier') return bro ? ['Sajtens datafil för lagret, src/data/lagret.json, har metoden, fast den inte är av slaget strategier.'] : [];
  /** @type {Record<string, any>[]} */
  const delar = lektionensDelar(d);
  /** @type {Record<string, any>[]} */
  const veckor = d.progression?.rader ?? [];
  const iFilen = lagretIFilen(d);
  if (iFilen && bro) return ['Metodens fil har lagrets fält, och sajtens datafil har dem också: ta bort metoden ur src/data/lagret.json.'];
  if (!iFilen && bro?.vantar) return [];
  if (!iFilen && !bro) return ['Metoden är ett lager i lärarens lektion (slaget strategier), men varken filen eller src/data/lagret.json säger lärarens lektion (ram), ställenas plats (var), lektionens minuter och veckornas ställen (stallen). En metod som väntar på riggens omtag står i datafilen med vantar och skälet.'];
  const fel = [];
  const ramar = delar.filter((r) => (iFilen ? r?.ram === true : r?.fas === bro?.ram));
  if (ramar.length !== 1) fel.push(`Lagret: ${ramar.length} rader i tidsschemat är lärarens lektion (ram), en ska vara det.`);
  // Greppen inne i lärarens lektion (riggens standard, avsnitt 7, raden Grepp inne i lektionen; K-743): en lista med namn, som
  // remsan och veckorna ritar inne i lärarens lektion, och var och en är en del i metoden (greppetsDel). Ett grepp har inga
  // minuter och är inget ställe.
  /** @type {string[]} */
  const grepp = [];
  // Grepp står bara på lärarens rad, så att inget faller bort tyst ur remsan och veckorna (andra ögat 2026-11-09).
  for (const r of delar.filter((x) => x?.grepp !== undefined && !ramar.includes(x))) fel.push(`Lagret: ${r.fas} har grepp, som bara står på lärarens lektion.`);
  for (const r of ramar.filter((x) => x?.grepp !== undefined)) {
    if (!Array.isArray(r.grepp) || !r.grepp.length || r.grepp.some((/** @type {unknown} */ g) => typeof g !== 'string' || !g.trim())) { fel.push(`Lagret: ${r.fas} har grepp, som ska vara en lista med namn.`); continue; }
    for (const g of r.grepp) {
      if (grepp.includes(g)) fel.push(`Lagret: greppet ${g} står två gånger.`);
      else if (delar.some((x) => x.fas === g)) fel.push(`Lagret: greppet ${g} har samma namn som en del i tidsschemat.`);
      else if (!greppetsDel(d, g)) fel.push(`Lagret: greppet ${g} är inte en del i metoden, i kärnan, bland rutinerna eller bland tabellerna.`);
      // Ett grepp som är en del i kärnan görs i lärarens lektion, så att greppet och kärnans moment säger samma sak (kodgranskningen 2026-11-09).
      else if ((d.karna?.komponenter ?? []).some((/** @type {any} */ k) => k?.namn === g && !(k.moment ?? []).includes(r.fas))) fel.push(`Lagret: greppet ${g} står i ${r.fas}, men kärnan säger inte att delen görs där (moment).`);
      grepp.push(g);
    }
  }
  for (const r of delar.filter((x) => !ramar.includes(x))) {
    if (!LAGRETS_VAR.includes(iFilen ? r.var : bro?.var?.[r.fas])) fel.push(`Lagret: ${r.fas} säger inte var den står, i början, mitt i eller i slutet (var).`);
    if (!delensMinuter(r.tid)) fel.push(`Lagret: ${r.fas} har tiden ${r.tid}, som inte börjar med minuter.`);
  }
  // Varje rutin säger delen där den görs, ett ställe eller lärarens lektion (riggens standard, avsnitt 7, raden Rutinerna; K-744).
  const delnamnen = new Set(delar.map((r) => r.fas));
  for (const r of d.rutiner?.rader ?? []) {
    const s = iFilen ? r?.stalle : bro?.rutiner?.[r?.namn];
    if (!s) fel.push(`Lagret: rutinen ${r?.namn} säger inte vid vilken del den görs (stalle).`);
    else if (!delnamnen.has(s)) fel.push(`Lagret: rutinen ${r?.namn} görs vid ${s}, som inte är en del i tidsschemat.`);
  }
  const min = iFilen ? d.tidsschema?.minuter : bro?.minuter;
  if (!Number.isInteger(min) || min < 20 || min > 120) fel.push('Lagret: lektionens längd i minuter (tidsschema.minuter) saknas eller ligger utanför 20–120.');
  // Ställena ryms i lektionen med plats för lärarens egen, så att skalan och meningen om minuterna aldrig säger mer än lektionen
  // (Codex 2026-11-08, nr 6).
  const langst = delar.filter((x) => !ramar.includes(x)).reduce((s, r) => s + (delensMinuter(r.tid)?.max ?? 0), 0);
  if (Number.isInteger(min) && langst >= min) fel.push(`Lagret: ställena tar upp till ${langst} minuter, och lektionen har ${min}, så lärarens lektion får ingen plats.`);
  // Varje del har sitt kort på metodens sida, som remsan i del 2 och raderna i Lär dig metoden leder till (Codex 2026-11-08, nr 4).
  const stegen = new Set((d.steg?.rader ?? []).map((/** @type {any} */ s) => s?.namn));
  for (const r of delar) if (!stegen.has(r.fas)) fel.push(`Lagret: ${r.fas} har inget steg med samma namn, så remsan och Lär dig metoden leder inte till något kort.`);
  const namnen = new Set(delar.filter((x) => !ramar.includes(x)).map((r) => r.fas));
  for (const v of veckor) {
    const k = String(v?.vecka ?? '');
    const s = iFilen ? v?.stallen : bro?.stallen?.[k];
    if (!Array.isArray(s) || !s.length) fel.push(`Lagret: vecka ${k} säger inte vilka ställen klassen använder (stallen).`);
    else {
      for (const x of s) if (!namnen.has(x) && !grepp.includes(x)) fel.push(`Lagret: vecka ${k} har ${x}, som varken är ett ställe i tidsschemat eller ett grepp i lärarens lektion.`);
      // En vecka har minst ett ställe, så att meningen om minuterna aldrig säger 0 (andra ögat och kodgranskningen 2026-11-09).
      if (!s.some((x) => namnen.has(x))) fel.push(`Lagret: vecka ${k} har inget ställe, bara grepp.`);
    }
  }
  if (!iFilen) {
    for (const k of Object.keys(bro?.var ?? {})) if (!delar.some((r) => r.fas === k)) fel.push(`Lagret: src/data/lagret.json har ${k}, som inte är en del i tidsschemat.`);
    for (const k of Object.keys(bro?.stallen ?? {})) if (!veckor.some((v) => String(v?.vecka ?? '') === k)) fel.push(`Lagret: src/data/lagret.json har vecka ${k}, som progressionen inte har.`);
    for (const k of Object.keys(bro?.rutiner ?? {})) if (!(d.rutiner?.rader ?? []).some((/** @type {any} */ r) => r?.namn === k)) fel.push(`Lagret: src/data/lagret.json har rutinen ${k}, som metoden inte har.`);
  }
  return fel;
}

export const slagensOrd = (d) => {
  const form = /** @type {Record<string, typeof SLAGENS_FORM.lektionsforlopp>} */ (SLAGENS_FORM)[d?.slag] ?? SLAGENS_FORM.lektionsforlopp;
  // I slaget strategier säger tiden antingen lektionen som lagret ligger över, "Din lektion, 45 minuter" i Formativ bedömning,
  // eller lagrets minuter i lektionen, "12 minuter i din lektion" i Testbaserat lärande. Metodkortets etikett säger samma
  // sak som tiden, så att 12 min inte läses som lektionens längd (den kalla läsaren på Testbaserat lärande 2026-11-02).
  // Läraren läser delarna under vecka 1 när metodens checklista säger det, som i Formativ bedömning, och annars före första
  // lektionen (andra ögat på Testbaserat lärande 2026-11-02: Läs in dig sa vecka 1, och metoden säger före första mötet).
  if (d?.slag !== 'strategier') return form;
  const kortet = lagretIDinLektion(d) ? 'I din lektion' : form.kortet;
  const lasning = (d?.checklista?.punkter ?? []).some((/** @type {unknown} */ p) => /\bunder\s+vecka\s+1\s+läser du\b/i.test(String(p))) ? form.lasning : SLAGENS_FORM.lektionsforlopp.lasning;
  return kortet === form.kortet && lasning === form.lasning ? form : { ...form, kortet, lasning };
};
/**
 * Vägen till måndag i slaget strategier, en mening för rutan Vill du börja på måndag?: metodens första punkt i checklistan och
 * lathundens första lektion (`lathund.lektion.text`), som rutan hänvisar till, eller annars det första stycket om första
 * lektionen (`forsta.text`), ordagrant, eftersom läraren lägger lagret på sin egen lektion (den
 * kalla läsaren 2026-11-02: rutan sa fyll i planeringsmallen, och metoden säger att ingen ny planering behövs). Har metoden
 * inget om första lektionen står tidsschemats första rad. Tidsschemat gäller en vanlig lektion, och i Testbaserat lärande är
 * första gången ett annat prov än det vanliga (andra ögat 2026-11-02, P1). Null i andra slag.
 * @param {Record<string, any>} d metodens fil
 * @returns {string | null}
 */
export const lagretsVagTillMandag = (d) => {
  if (d?.slag !== 'strategier') return null;
  const forsta = Array.isArray(d.forsta?.text) ? d.forsta.text[0] : d.forsta?.text;
  // Lathundens första lektion först, så att rutan säger samma sak som lathundens sida 2 (kodgranskningen 2026-11-02: Formativ
  // bedömning tappade "Tre rader räcker" när rutan tog forsta.text).
  return [d.checklista?.punkter?.[0], d.lathund?.lektion?.text || forsta || d.tidsschema?.rader?.[0]?.vad].filter(Boolean).join(' ') || null;
};
/** Raden under Planera på metodens sida: i slaget strategier tidsschemats första rad, det läraren skriver på sin planering, ordagrant. @param {Record<string, any>} d metodens fil */
export const planerasRad = (d) => (d?.slag === 'strategier' && d.tidsschema?.rader?.[0]?.vad) || slagensOrd(d).planeraRad;
/** Rubriken för planeringen på metodens sida och i lathunden, efter metodens slag. @param {Record<string, any>} d metodens fil */
export const planerasNamn = (d) => slagensOrd(d).planera;
/**
 * Dagen planen börjar på i Lär dig metoden, efter metodens slag: första lektionen, och i strukturerna det första samarbetet,
 * eftersom första hela lektionen kommer senare (granskningen inför lanseringen, F1). @param {Record<string, any>} d
 */
export const planensStart = (d) => (/** @type {Record<string, { start: string }>} */ (SLAGENS_FORM)[d?.slag] ?? SLAGENS_FORM.lektionsforlopp).start;
/**
 * Den första hela lektionen när den kommer efter vecka 1, som i strukturerna: namnet, metodens egen mening om den
 * (tidsschemats variant för första lektionen) och veckan meningen nämner först, som Lär dig metoden visar i den veckan. Inget
 * i ett lektionsförlopp, där första lektionen är vecka 1 (F1).
 * @param {Record<string, any>} d
 * @returns {{ namn: string, text: string, vecka: number } | null}
 */
export function forstaHelaLektionen(d) {
  const namn = forstaLektionensForm(d).namn;
  const text = (d?.tidsschema?.varianter ?? []).find((/** @type {{ nar?: string }} */ v) => /^första lektionen$/i.test(String(v.nar ?? '').trim()))?.text;
  const vecka = Number(/\bvecka[\s⁠]+(\d+)/i.exec(String(text ?? ''))?.[1]);
  return namn !== forstaLektionensForm({}).namn && text && vecka > 1 ? { namn, text: String(text), vecka } : null;
}
/** Ankaret på metodens sida för en variant av lektionens tider, ur dess `nar`: "variant-ett-samarbete-i-en-vanlig-lektion". @param {string} nar */
export const variantensAnkare = (nar) => `variant-${slugAv(String(nar ?? ''))}`;
/**
 * Vägen till måndag när den första hela lektionen kommer efter vecka 1, som i strukturerna, en rot för rutan Vill du börja på
 * måndag? på metodens sida och lathundens sida 2, Vägen till måndag (granskningen inför lanseringen, G1: båda visade den
 * hela lektionen på 45 minuter, fast vecka 1 i kooperativt lärande är samarbeten på tio minuter): vecka 1 med metodens egen
 * första mening i `forsta.text`, den korta formen som veckan görs i, det vill säga den kortaste av tidsschemats andra
 * varianter, med sitt namn, sitt ankare på metodens sida och sina minuter, och veckorna för den första hela lektionen som
 * metodens mening om den säger dem ("i vecka 2 eller 3"), där planeringsmallen fylls i. Null i ett lektionsförlopp, där
 * vägen till måndag är den första lektionen, som förut.
 * @param {Record<string, any>} d metodens fil, läst
 * @returns {{ vecka1: string, kort: { nar: string, rubrik: string, ankare: string, minuter: { fas: string, tid: string, fraser: string[] }[] } | null, hel: { namn: string, nar: string } } | null}
 */
export function vagenTillMandag(d) {
  const hel = forstaHelaLektionen(d);
  if (!hel) return null;
  const lista = (/** @type {unknown} */ x) => /** @type {any[]} */ (Array.isArray(x) ? x : x ? [x] : []);
  // En variants längd: minuten där dess sista del slutar.
  const slut = (/** @type {{ delar?: { tid?: string }[] }} */ v) => Math.max(0, ...lista(v.delar).map((x) => Number(/(\d+)\D*$/.exec(String(x.tid ?? '').replace(/\s*min\s*$/, ''))?.[1] ?? 0)));
  const kort = lista(d.tidsschema?.varianter).filter((v) => !/^första lektionen$/i.test(String(v.nar ?? '').trim()) && lista(v.delar).length).sort((a, b) => slut(a) - slut(b))[0];
  return {
    vecka1: meningarna(lista(d.forsta?.text)[0])[0] ?? '',
    kort: kort ? { nar: String(kort.nar), rubrik: stor(String(kort.nar)), ankare: variantensAnkare(kort.nar), minuter: forstaLektionensMinuter(d, kort.nar) } : null,
    hel: { namn: hel.namn, nar: /\bi vecka[\s⁠]+\d+(?:\s+(?:eller|och|till)\s+\d+)?/i.exec(hel.text)?.[0] ?? `i vecka ${hel.vecka}` },
  };
}
/**
 * Lektionen som minuterna och den grå planen gäller, med orden som metodens sida och lathunden skriver om den, en rot för
 * båda: namnet, namnet inne i en mening, rubriken på minuterna och raden ovanför den grå planen på lathundens tredje sida.
 * Minuterna heter Minuterna när avsnittet redan heter som lektionen, och annars som lektionen (riggens punkt 3). Raden
 * ovanför planen säger vilken lektion den är (punkt 4) och att den är ifylld som exempel, och talar inte om det grå,
 * eftersom planeringsmallen säger att det grå är det du gör i varje lektion (punkt 21; granskningen inför lanseringen, G9:
 * "i grått att skriva över" gav det grå två betydelser).
 * @param {Record<string, any>} d metodens fil
 * @returns {{ namn: string, din: string, minuterna: string, forlagan: string }}
 */
export function forstaLektionensForm(d) {
  const form = /** @type {Record<string, { forstaLektionen: string, din: string }>} */ (SLAGENS_FORM)[d?.slag] ?? SLAGENS_FORM.lektionsforlopp;
  const namn = form.forstaLektionen;
  return { namn, din: form.din, minuterna: (d?.forsta?.rubrik ?? namn) === namn ? 'Minuterna' : namn, forlagan: `${namn}, ifylld som exempel. Minuterna är hållpunkter.` };
}
/**
 * Veckans rubrik i De första veckorna, på metodens sida och i lathundens tabell (riggens punkt 10, Niclas led i
 * progressionen): numret, ledet när raden har det (`led`, som Klimatet eller Jag gör) och rubriken, "Vecka 1, Klimatet:
 * Kamraten, T-kortet och Ping-pong-prat". Utan ledet står "Vecka 1: …". Med `vecka: false` står numret utan ordet, som i
 * lathundens kolumn Vecka: "1. Klimatet: …".
 * @param {{ vecka?: string | number, led?: string, rubrik?: string }} r
 * @param {{ vecka?: boolean, nummer?: boolean }} [o] med `nummer: false` står bara ledet och rubriken, "Klimatet: …", som
 * stegets namn i Lär dig metoden, där veckan står för sig
 */
export function veckansRubrik(r, { vecka = true, nummer = true } = {}) {
  const led = String(r.led ?? '').trim();
  const rubrik = String(r.rubrik ?? '');
  if (!nummer) return `${led ? `${led}: ` : ''}${rubrik}`;
  if (!vecka) return `${r.vecka}. ${led ? `${led}: ` : ''}${rubrik}`;
  return led ? `Vecka ${r.vecka}, ${led}: ${rubrik}` : `Vecka ${r.vecka}: ${rubrik}`;
}
/**
 * Namnet på rutan med planens rad om första lektionen, i veckan med den i Lär dig metoden: Första lektionen, och i en metod
 * där första hela lektionen kommer senare, som strukturerna, veckans rad i progressionen, "Vecka 1, Klimatet: …", så att
 * vecka 1 inte heter Den första hela lektionen (granskningen inför lanseringen, B5).
 * @param {Record<string, any>} d
 */
export const forstaVeckansNamn = (d) => (forstaLektionensForm(d).namn === forstaLektionensForm({}).namn || !d.progression?.rader?.[0] ? forstaLektionensForm(d).namn : veckansRubrik(d.progression.rader[0]));
/** Det svåraste i kort form (hinder.kort), som lathunden visar: risken och vad läraren gör (sajtens K-632, Niclas 2026-10-30). */
export const HINDRETS_KORT = Object.freeze({ meningar: 2, tecken: 220 });

/**
 * Första lektionens minuter med det läraren säger i varje del: delarna och minuterna ur tidsschemats variant "första
 * lektionen", och delens egna `fraser` eller de en eller två första fraserna ur stegets `fraser` för samma del. Den första delen är rutinen i vecka 1
 * (forsta.text), så där står rutinens repliker, det som står inom citattecken i rutinens steg, och inte de två snabba
 * (granskare-3 nr 22). En rot för tabellen Första lektionen, minut för minut på metodens sida och Minuterna i lathunden.
 * Med `nar` gäller minuterna en annan variant, som den korta formen som vecka 1 görs i (vagenTillMandag). Tom lista utan
 * varianten.
 * @param {Record<string, any>} d metodens fil, läst
 * @param {string} [nar] variantens `nar`, förvalt första lektionen
 * @returns {{ fas: string, tid: string, fraser: string[] }[]}
 */
export function forstaLektionensMinuter(d, nar = 'första lektionen') {
  const lista = (/** @type {unknown} */ x) => /** @type {any[]} */ (Array.isArray(x) ? x : []);
  const varianten = lista(d.tidsschema?.varianter).find((x) => x.nar === nar);
  const steg = lista(d.steg?.rader);
  const rutinens = lista(d.rutiner?.rader).filter((r) => String(r.vecka ?? '') === '1').flatMap((r) => [...lista(r.steg).join(' ').matchAll(/”([^”]+)”/g)].map((m) => m[1]));
  // En del i varianten med egna fraser säger dem, som kontrasten i Testbaserat lärandes första lektion, där läraren tänker
  // högt i stället för paren (den kalla läsaren 2026-11-02: minuterna sa ”En minut själv, en minut i par”).
  return lista(varianten?.delar).map((x) => ({ fas: x.fas, tid: String(x.tid), fraser: lista(x.fraser).length ? lista(x.fraser) : x.fas === steg[0]?.namn && rutinens.length ? rutinens : lista(steg.find((y) => y.namn === x.fas)?.fraser).slice(0, 2) }));
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
 * meningar ur stodet. En del utan innehåll står inte med. Efter riggens brev om Kooperativt lärande 2026-10-30 (sajtens
 * K-645): avsnittet på sida 2 heter som metodens `forsta.rubrik`, Första lektionen eller Första veckan, och minuterna och den
 * grå planen gäller lektionen ur forstaLektionensForm; kärnans moment räknas upp med komma och och, veckorna har sitt led
 * (veckansRubrik) och fallgroparna komponentens nummer. Kommer den första hela lektionen efter vecka 1, som i strukturerna,
 * har sida 2 minuterna för den korta form som vecka 1 görs i, ur samma rot som rutan Vill du börja på måndag?
 * (vagenTillMandag; granskningen inför lanseringen, G1).
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
  // En fallgrop per komponent, den första med Pröva i stället, med komponentens nummer först, så att det syns vilken del av
  // kärnan som glider (riggens punkt 9). Manusen för en svår stund står på metodens sida.
  const fallgropar = lista(d.fallgropar?.rader).filter((x, i, alla) => x.komponent && x.prova && alla.findIndex((y) => y.komponent === x.komponent && y.prova) === i);
  const komponentensNr = (/** @type {string} */ namn) => lista(d.karna?.komponenter).findIndex((k) => k.namn === namn) + 1;
  const lektionen = forstaLektionensForm(d);
  const vagen = vagenTillMandag(d);
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
      { id: 'karnan', slag: 'kort', rubrik: 'Kärnan', kort: lista(d.karna?.komponenter).map((k, i) => ({ nr: i + 1, namn: k.namn, text: k.vad, under: uppraknat(lista(k.moment)) })), fot: d.karna?.varv },
      { id: 'svarast', slag: 'not', namn: 'Det svåraste', text: d.hinder?.kort || forsta(d.hinder?.text) },
    ] },
    { id: 'mandag', nr: 2, namn: 'Vägen till måndag', delar: [
      { id: 'fore', slag: 'checklista', rubrik: d.checklista?.rubrik ?? 'Före första lektionen', punkter: lista(d.checklista?.punkter) },
      { id: 'forsta', slag: 'stycken', rubrik: d.forsta?.rubrik ?? lektionen.namn, text: lista(l.lektion?.text) },
      // I en metod där den första hela lektionen kommer efter vecka 1 är måndagen den korta formen, med dess minuter
      // (vagenTillMandag, G1); den hela lektionen står som förlaga på sida 3.
      { id: 'minuterna', slag: 'minuter', rubrik: vagen?.kort ? vagen.kort.rubrik : lektionen.minuterna, delar: (vagen?.kort ? vagen.kort.minuter : forstaLektionensMinuter(d)).map((x) => ({ ...x, tid: x.tid.replace(/\s*min$/, '') })) },
      ...lista(d.rutiner?.rader).filter((r) => String(r.vecka ?? '') === '1').map((r, i) => /** @type {LathundDel} */ ({ id: `rutin-${i + 1}`, slag: 'rutin', rubrik: rutinensRubrik(r.namn), namn: r.namn, text: r.vad ?? '', steg: lista(r.steg) })),
    ] },
    { id: 'planera', nr: 3, namn: planerasNamn(d), delar: [
      d.forsta?.plan
        ? { id: 'bladet', slag: 'planering', plan: d.forsta.plan, exempel: huvud, variant: 'första lektionen', gra: true, text: lektionen.forlagan }
        : { id: 'bladet', slag: 'planering', plan: huvud?.plan, exempel: huvud, gra: false },
    ] },
    { id: 'veckorna', nr: 4, namn: l.igang?.rubrik ?? 'De första veckorna', delar: [
      { id: 'inledning', slag: 'stycken', text: [forsta(d.progression?.text, 2)] },
      { id: 'progression', slag: 'tabell', kolumner: ['Vecka', 'Klassen lär sig', 'Du övar', 'Gå vidare när'], rader: lista(d.progression?.rader).map((r) => [veckansRubrik(r, { vecka: false }), r.eleverna ?? r.fokus ?? '', r.roll ?? '', r.vidare ?? '']) },
      { id: 'med-dig', slag: 'not', namn: 'Med dig på vägen', text: MED_DIG_PA_VAGEN.map(urad).filter(Boolean).join(' ') },
      { id: 'efter', slag: 'not', namn: 'Efter de första veckorna', text: forsta(urad('stodet'), 2) },
      { id: 'glider', slag: 'tabell', rubrik: 'Om det glider', kolumner: ['Fallgropen', 'Pröva i stället'], rader: fallgropar.map((r) => [komponentensNr(r.komponent) ? `${komponentensNr(r.komponent)} ${r.fallgrop}` : r.fallgrop, r.prova]) },
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
 * riggens evidensen.md, avsnitt 3. Skalans två källor står inte i metodens referenslista, så de står på en egen rad med hela
 * referensen (`kallor`) och inte som hänvisningar i texten, som läsaren inte hittar i referensbladet (riggens brev om
 * Kooperativt lärande, punkt 19).
 * @returns {{ rubrik: string, text: string[], kallor: { namn: string, text: string, doi: string }[] }}
 */
export function effektensSkala() {
  const s = EFFEKTENS_GRANSER.stora;
  const a = EFFEKTENS_GRANSER.andra;
  const plats = (/** @type {number} */ x) => `plats ${platsenAv100(x)} vid ${skalansTal(x)}`;
  return {
    rubrik: 'Så läses effekten',
    text: [
      `Talet säger hur mycket bättre det gick för eleverna med metoden än för eleverna utan. Tänk dig 100 elever utan metoden på rad efter resultat. Eleven i mitten står på plats 50. Med metoden flyttar den eleven till ${plats(0.1)}, ${plats(s.stor)} och ${plats(a.stor)}.`,
      `I stora försök i många skolor är ${skalansTal(s.mattlig)} en måttlig och ${skalansTal(s.stor)} en stor effekt. Mindre studier ger ungefär dubbelt så stora tal, så där är ${skalansTal(a.mattlig)} måttlig och ${skalansTal(a.stor)} stor. Under det är effekten liten. När resultatet inte är säkert står Inte säker.`,
    ],
    kallor: [
      { namn: 'Kraft (2020)', text: 'Kraft, M. A. (2020). Interpreting effect sizes of education interventions. Educational Researcher, 49(4), 241–253.', doi: '10.3102/0013189X20912798' },
      { namn: 'Cheung och Slavin (2016)', text: 'Cheung, A. C. K. och Slavin, R. E. (2016). How methodological features affect effect sizes in education. Educational Researcher, 45(5), 283–292.', doi: '10.3102/0013189X16656615' },
    ],
  };
}

/**
 * Vad en metod är till för, ett eller två val i metodens fält `syfte`, som banken Metoder filtrerar på under Du vill
 * (Niclas 2026-10-30: "Börja också tänka på hur man ska kunna sortera metoder. Se stödundervisning som förlaga", och
 * idéuppdraget i sajtens underlag/prov/metoder/ide/). Ämne och årskurs skiljer inte metoderna åt, eftersom standarden
 * kräver exempel i minst fyra ämnen och två stadier; det gör syftet.
 */
export const SYFTEN = Object.freeze([
  { id: 'nytt', namn: 'Lära ut något nytt', text: 'Eleverna möter innehåll de inte kan, och du visar det steg för steg.' },
  { id: 'ova', namn: 'Öva och befästa', text: 'Eleverna har mött innehållet och ska bli säkra och minnas det.' },
  { id: 'samarbeta', namn: 'Samarbeta', text: 'Eleverna arbetar i par eller grupper där alla behövs.' },
  { id: 'tanka', namn: 'Tänka och samtala', text: 'Eleverna resonerar och sätter ord på sitt tänkande, i samtal eller i skrift.' },
  { id: 'se', namn: 'Se var eleverna är', text: 'Du tar reda på var eleverna står i varje lektion och använder det.' },
]);
/**
 * Var i lektionen metoden används, ur metodens `slag`: filtret Används i, i reglagets ordning från lite till mycket (Niclas
 * 2026-10-30: "från delar, till lektion till alla lektioner"). Stödets och svårighetens grupper nedan står också i ordning.
 */
export const ANVANDS_I = Object.freeze({ strukturer: 'Delar av lektionen', lektionsforlopp: 'Hela lektionen', strategier: 'Alla lektioner' });
/**
 * Områdena som banken filtrerar stödet på: Lärande totalt och sajtens fyra områden (Niclas 2026-10-30: "Man vill kunna
 * hitta metoder bättre för just läsning i evidens ... Kunna sortera ur evidens i de 4 kategorierna + lärande").
 */
export const BANKENS_OMRADEN = Object.freeze([
  { id: 'larande', namn: 'Lärande totalt' },
  { id: 'lasning', namn: 'Läsning' },
  { id: 'skrivning', namn: 'Skrivning' },
  { id: 'matematik', namn: 'Matematik' },
  { id: 'socialt', namn: 'Socialt' },
]);
/**
 * Stödets grupper i filtret Stöd, efter antalet staplar (Niclas samma dag: "Alla, svag(1-2), medel (3), stark (4-5)", och
 * "gillar nivåerna 1-2, 3 och 4-5", "I listan ska det vara ord" och "strömlinjeforma det till alla, svagt, visst, starkt").
 * Valen är ord, och förklaringen under valen knyter dem till kortets ord och staplar.
 * Ett område utan nivå, eller med 0, står bara under Alla. Banken ordnar aldrig korten efter staplarna: inom ett val står
 * metoderna i bokstavsordning.
 */
export const STODETS_GRUPPER = Object.freeze([
  { id: 'svagt', namn: 'Svagt', staplar: [1, 2], text: 'Anekdotiskt eller svagt stöd, en eller två staplar på kortet.' },
  { id: 'medel', namn: 'Visst', staplar: [3], text: 'Visst stöd, tre staplar.' },
  { id: 'starkt', namn: 'Starkt', staplar: [4, 5], text: 'Gott eller starkt stöd, fyra eller fem staplar.' },
]);
/** Svårighetens grupper i filtret Svårighet, efter nivån 1–5. */
export const SVARIGHETENS_GRUPPER = Object.freeze([
  { id: 'latt', namn: 'Lätt', nivaer: [1, 2] },
  { id: 'medel', namn: 'Medelsvårt', nivaer: [3] },
  { id: 'svart', namn: 'Svårt', nivaer: [4, 5] },
]);
/**
 * Lägena i bankens reglage, i ordning från lite till mycket: Används i, Stöd och Svårighet filtreras med ett spann mellan
 * två grepp, Från och Till (Niclas 2026-10-30: "Från-Till"). Ur ANVANDS_I, STODETS_GRUPPER och SVARIGHETENS_GRUPPER.
 */
export const BANKENS_LAGEN = Object.freeze({
  anvands: Object.freeze(Object.keys(ANVANDS_I)),
  stod: Object.freeze(STODETS_GRUPPER.map((g) => g.id)),
  svarighet: Object.freeze(SVARIGHETENS_GRUPPER.map((g) => g.id)),
});
/**
 * Ett spann i ett reglages lägen ur sin text i adressen, "medel-starkt" eller "medel" när Från och Till står på samma
 * läge, som { fran, till }. Tomt, hela banan, ett omvänt spann och ett läge som reglaget inte har är null: Alla, och då
 * syns också metoderna utan nivå.
 * @param {readonly string[]} lagen
 * @param {string | null | undefined} text
 * @returns {{ fran: string, till: string } | null}
 */
export function spannUr(lagen, text) {
  const [fran, till = fran] = String(text ?? '').split('-');
  const a = lagen.indexOf(fran), b = lagen.indexOf(till);
  return !fran || a < 0 || b < 0 || a > b || (a === 0 && b === lagen.length - 1) ? null : { fran, till };
}
/**
 * Spannets text i adressen: tom för Alla och ett läge när Från och Till är samma.
 * @param {readonly string[]} lagen
 * @param {{ fran: string, till: string } | null | undefined} spann
 */
export function spannText(lagen, spann) {
  const s = spann ? spannUr(lagen, `${spann.fran}-${spann.till}`) : null;
  return !s ? '' : s.fran === s.till ? s.fran : `${s.fran}-${s.till}`;
}

/**
 * Det banken filtrerar en metod på, ur metodens fil och samma rötter som metodkortet: syftena, var den används,
 * svårighetens grupp och stödets grupp i varje område. En rot för bankens data, så att filtret och kortet säger samma sak.
 * @param {Record<string, any>} d metodens fil, läst
 * @returns {{ syfte: string[], anvands: string | null, svarighet: string | null, stod: Record<string, string | null> }}
 */
export function bankensVal(d) {
  const ev = d.profil?.evidens ?? {};
  const grupp = (/** @type {string} */ o) => {
    const l = laget(ev[o]);
    return l.slag === 'niva' && !l.negativ ? STODETS_GRUPPER.find((g) => g.staplar.includes(l.niva))?.id ?? null : null;
  };
  const sv = d.profil?.svarighet ? svarighetensNiva(d.profil.svarighet) : null;
  return {
    syfte: (Array.isArray(d.syfte) ? d.syfte : []).filter((/** @type {string} */ s) => SYFTEN.some((x) => x.id === s)),
    // Ett lager som är några minuter i lektionen, som provet i Testbaserat lärande, används i delar av lektionen och inte i
    // alla lektioner (andra ögat 2026-11-02), med samma läsning av tiden som metodkortets etikett (lagretIDinLektion).
    anvands: lagretIDinLektion(d) ? 'strukturer' : /** @type {Record<string, string>} */ (ANVANDS_I)[d.slag] ? d.slag : null,
    svarighet: sv === null ? null : SVARIGHETENS_GRUPPER.find((g) => g.nivaer.includes(sv))?.id ?? null,
    stod: Object.fromEntries(BANKENS_OMRADEN.map((o) => [o.id, grupp(o.id)])),
  };
}

/**
 * Om en metod passar filtrets val, en rot för bankens antal vid bygget och filtret i webbläsaren (sajtens K-642). Ett tomt
 * val är Alla. Används i, Stöd och Svårighet är spann i BANKENS_LAGEN, { fran, till } med ändarna medräknade: en metod
 * passar när dess värde ligger i spannet, och ett spann över hela banan är Alla, där också metoderna utan nivå syns. Stöd
 * gäller området i Område, och utan valt område Lärande totalt.
 * @param {ReturnType<typeof bankensVal>} v metodens val
 * @param {{ syfte?: string, omrade?: string, anvands?: Spann | null, stod?: Spann | null, svarighet?: Spann | null }} val
 * @returns {boolean}
 * @typedef {{ fran: string, till: string }} Spann
 */
export function bankensValPassar(v, val) {
  const inom = (/** @type {readonly string[]} */ lagen, /** @type {string | null | undefined} */ varde, /** @type {Spann | null | undefined} */ spann) => {
    const s = spann ? spannUr(lagen, `${spann.fran}-${spann.till}`) : null;
    if (!s) return true;
    const i = lagen.indexOf(varde ?? '');
    return i >= 0 && i >= lagen.indexOf(s.fran) && i <= lagen.indexOf(s.till);
  };
  return (!val.syfte || v.syfte.includes(val.syfte)) && inom(BANKENS_LAGEN.anvands, v.anvands, val.anvands)
    && inom(BANKENS_LAGEN.stod, v.stod[val.omrade || BANKENS_OMRADEN[0].id], val.stod) && inom(BANKENS_LAGEN.svarighet, v.svarighet, val.svarighet);
}
/**
 * Filtrets val ur adressens eller formulärets text, med spannen lästa ur sina lägen, som bankensValPassar tar dem.
 * @param {Record<string, string | undefined>} text
 */
export const bankensValUr = (text) => ({
  syfte: text.syfte || undefined, omrade: text.omrade || undefined,
  anvands: spannUr(BANKENS_LAGEN.anvands, text.anvands), stod: spannUr(BANKENS_LAGEN.stod, text.stod), svarighet: spannUr(BANKENS_LAGEN.svarighet, text.svarighet),
});

/**
 * Vilka rutor banken Metoder visar i filtret, ur metodernas `bankensVal` (sajtens K-642): en ruta visas bara när den skiljer
 * metoderna åt, det vill säga när minst två val har metoder och inget val har alla. Område och Stöd visas tillsammans eller
 * inte alls, och de visas när stödet skiljer metoderna åt i något av bankens områden. Med en metod visas alltså inget
 * filter. Sajtens bank och riggen läser samma regel.
 * @param {ReturnType<typeof bankensVal>[]} valen
 * @returns {{ syfte: boolean, anvands: boolean, omrade: boolean, stod: boolean, svarighet: boolean }}
 */
export function bankensRutor(valen) {
  const skiljer = (/** @type {(v: ReturnType<typeof bankensVal>) => (string | null)[]} */ varden, /** @type {string[]} */ ids) => {
    const antal = ids.map((id) => valen.filter((v) => varden(v).includes(id)).length);
    return antal.filter((n) => n > 0).length >= 2 && antal.every((n) => n < valen.length);
  };
  const stod = BANKENS_OMRADEN.some((o) => skiljer((v) => [v.stod[o.id]], STODETS_GRUPPER.map((g) => g.id)));
  return {
    syfte: skiljer((v) => v.syfte, SYFTEN.map((x) => x.id)),
    anvands: skiljer((v) => [v.anvands], Object.keys(ANVANDS_I)),
    omrade: stod,
    stod,
    svarighet: skiljer((v) => [v.svarighet], SVARIGHETENS_GRUPPER.map((g) => g.id)),
  };
}
