// Strukturerna (sajtens K-650): slagen och reglerna för en struktur i verktyget Strukturer. En struktur är ett sätt att
// organisera samarbete ur grundbokens bank (C:/grundbok-repo/docs/strukturer.md), med namnet och stegen ur banken och
// slaget, bilden och förslagen ur sajten. Reglerna står här, så att sajtens schema, intaget och riggen prövar samma sak.

import { meningarna } from './text.js';

/**
 * Slagen, med namnet för läsaren och färgen, en rot för kortet, filtret, strukturens sida och symbolerna
 * (scripts/strukturer/symboler.mjs). Slaget avgörs av var strukturens kärna sker: klass när hela klassen rör sig eller
 * står i en form samtidigt, grupp när kärnan kräver tre eller fler vid sitt bord, par när kärnan sker i par. Färgerna är
 * skilda från ämnenas och hämtade ur bildernas färger, och färgen bär aldrig slaget ensam: symbolen och ordet gör det, också
 * i svartvitt.
 * @type {Readonly<Record<'par' | 'grupp' | 'klass', { namn: string, farg: string, ljus: string }>>}
 */
export const STRUKTURENS_SLAG = Object.freeze({
  par: Object.freeze({ namn: 'Par', farg: '#2a7a96', ljus: '#dcedf3' }),
  grupp: Object.freeze({ namn: 'Grupp', farg: '#a8730e', ljus: '#f6ead2' }),
  klass: Object.freeze({ namn: 'Klass', farg: '#b8475f', ljus: '#f6e0e5' }),
});

/**
 * Gränserna för en struktur. Stegen ska rymmas på kortets baksida i minst 12 punkter med miniatyren (grundbokens
 * längsta steg var 104 tecken och längsta post 602 tecken när posten skrevs). Förslagen är fyra, ett per område eller
 * två i ett område när ett annat inte passar, med 3 till 5 meningar (Niclas 2026-10-31: "Ett användningsförslag är kort
 * text om 3-5 meningar hur det skulle kunna användas i praktiken").
 */
export const STRUKTURENS_GRANSER = Object.freeze({
  steg: Object.freeze({ minst: 4, högst: 8, tecken: 140, allaTecken: 720 }),
  forslag: Object.freeze({ antal: 4, meningar: Object.freeze([3, 5]) }),
  omraden: Object.freeze(['lasning', 'skrivning', 'matematik', 'socialt']),
  arskurser: Object.freeze(['F–3', '4–6', '7–9']),
});

/**
 * Kontrollsumman över det som kommer ur banken: namnet, andra namn, syftet och stegen. Intaget skriver den i kalla.summa,
 * och schemat räknar om den, så att en ändring för hand stannar bygget: stegen ändras i banken och tas in igen (Niclas
 * 2026-10-31: banken är källan). FNV-1a på 32 bitar, utan Node, så att webbläsaren och riggen kan räkna samma.
 * @param {{ namn?: string, andra?: string[], syfte?: string, steg?: string[] }} s
 * @returns {string}
 */
export function strukturensSumma(s) {
  const t = JSON.stringify([s.namn ?? '', s.andra ?? [], s.syfte ?? '', s.steg ?? []]);
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/**
 * Kontrollsumman över det ett strukturkort visar: namnet, slaget, stegen och bildens scen. Skriptet som gör korten
 * (scripts/strukturer/kort.mjs) skriver den i manifestet, och bygget räknar om den och stannar på ett kort som är äldre än
 * strukturen. Radsluten i scenens fil räknas som \n, så att en arbetskopia i Windows och Netlifys bygge räknar samma.
 * @param {{ namn: string, slag: string, steg: string[] }} s
 * @param {string} scen  scenens fil, som text
 * @returns {string}
 */
export function strukturkortetsInnehall(s, scen) {
  const t = JSON.stringify([s.namn, s.slag, s.steg, scen.replace(/\r\n/g, '\n')]);
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/**
 * Strukturkorten i en metod (sajtens K-661; Niclas 2026-11-01: "De strukturer som nu finns i den får ersättas av dessa. Så
 * någon enkel import funktion för en struktur"): fältet `strukturkort` i metodens fil, med en text och strukturernas id i
 * verktyget Strukturer, i den ordning de skrivs ut. Korten skrivs ut två och två, så att ett jämnt antal fyller arken (Niclas
 * samma dag: "eftersom de skrivs ut två och två bör du välja ut en till så det blir 6st"). Sajten prövar att varje id finns.
 */
export const METODENS_STRUKTURKORT = Object.freeze({ minst: 2, högst: 8 });
/**
 * Felen i en metods fält strukturkort, som en lista; tomt när fältet saknas.
 * @param {unknown} sk
 * @returns {string[]}
 */
export function strukturkortensFel(sk) {
  if (sk === undefined) return [];
  const g = METODENS_STRUKTURKORT;
  const x = /** @type {{ text?: unknown, strukturer?: unknown }} */ (sk ?? {});
  const fel = [];
  if (typeof x.text !== 'string' || !x.text.trim()) fel.push('strukturkort.text saknas: en text om korten, som sidan och Word-filen visar.');
  const ids = Array.isArray(x.strukturer) ? x.strukturer : [];
  if (ids.length < g.minst || ids.length > g.högst) fel.push(`strukturkort.strukturer har ${ids.length} strukturer; en metod har ${g.minst} till ${g.högst}.`);
  if (ids.length % 2) fel.push(`strukturkort.strukturer har ett udda antal (${ids.length}): korten skrivs ut två och två, så välj ett jämnt antal.`);
  for (const id of ids) if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) fel.push(`strukturkort.strukturer: "${id}" är inget id i verktyget Strukturer.`);
  if (new Set(ids).size !== ids.length) fel.push('strukturkort.strukturer har en struktur två gånger.');
  return fel;
}

/**
 * Topplistans räkning (sajtens K-650 och K-665): varje strukturs besök (/strukturer/<id>) och utskrifter (händelsen
 * utskrift:strukturer/<id>) ur GoatCounters lista över sidor och händelser, med en utskrift som fem besök (Niclas 2026-11-01:
 * "Utskrift av en struktur kanske ger 5 besök?"). Filen med alla kort och listans egen händelse räknas inte per kort.
 * Samma räkning i bygget (scripts/strukturer/topplistan.mjs) och i funktionen (netlify/functions/strukturer-topp.mjs).
 */
export const UTSKRIFTENS_VIKT = 5;
/**
 * Hur många strukturer topplistan visar, och hur många som behöver ha besök innan den visas: sex, så att korten fyller hela
 * rader både två i bredd i telefonen och tre på datorn (Niclas 2026-11-01, med en bild där fem lämnade en halv rad: "Vi kör
 * sex"). Bygget och sidan läser samma tal.
 */
export const TOPPLISTANS_ANTAL = 6;
/**
 * @param {{ path: string, count: number }[]} hits
 * @returns {{ id: string, antal: number, besok: number, utskrifter: number }[]}  flest först, sedan efter id
 */
export function strukturernasTopplista(hits) {
  /** @type {Map<string, { besok: number, utskrifter: number }>} */
  const rakning = new Map();
  for (const h of hits) {
    const m = /^(\/strukturer\/|utskrift:strukturer\/)([a-z0-9-]+)$/.exec(String(h.path));
    if (!m || m[2] === 'listan' || m[2] === 'alla') continue;
    const r = rakning.get(m[2]) ?? { besok: 0, utskrifter: 0 };
    if (m[1].startsWith('utskrift')) r.utskrifter += h.count; else r.besok += h.count;
    rakning.set(m[2], r);
  }
  return [...rakning].map(([id, r]) => ({ id, antal: r.besok + UTSKRIFTENS_VIKT * r.utskrifter, ...r })).sort((a, b) => b.antal - a.antal || a.id.localeCompare(b.id));
}

/** Kortets fil, i public/strukturer/kort/ och på /strukturer/kort/. */
export const strukturkortetsFil = (id) => `strukturkort-${id}.pdf`;
/** Filen med alla kort, två på varje A4, och dess nyckel i manifestet. */
export const STRUKTURKORTEN_ALLA = Object.freeze({ fil: 'strukturkort-alla.pdf', nyckel: '_alla' });
/** En metods strukturkort, två och två på A4, och nyckeln i manifestet. */
export const metodensStrukturkort = (metod) => Object.freeze({ fil: `strukturkort-${metod}.pdf`, nyckel: `_metod:${metod}` });

/**
 * Formerna som en strukturs namn står i i en metods text, för sådden (sajtens src/lib/vav.ts och scripts/saddprov.mjs): namnet;
 * ett namn med flera ord också utan utropstecken eller frågetecken (Berätta mera); ett namn med tankstreck också med "och"
 * (Inre och yttre cirkel); och ett namn med ett ord också i bestämd form (Galleriet för Galleri). Ett namn med ett ord och ett
 * tecken, som Visa! och Rösta!, behåller tecknet, eftersom ordet utan det är ett vanligt verb.
 * @param {string} namn
 * @returns {string[]}
 */
export function strukturnamnensFormer(namn) {
  const former = new Set([namn]);
  if (namn.includes(' ')) former.add(namn.replace(/[!?]$/, ''));
  if (namn.includes('–')) former.add(namn.replace(/\s*–\s*/g, ' och '));
  if (/^\p{L}+$/u.test(namn)) { former.add(`${namn}et`); former.add(`${namn}en`); }
  return [...former].filter((n) => n.length >= 3);
}
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * Står strukturens namn i texten? Med stor bokstav, som ett namn, så att verbet "turas om" inte räknas, utom ett namn med
 * kommatecken, som "jag gör, vi gör, du gör", som inte kan vara vanliga ord.
 * @param {string} namn
 * @param {string} text
 */
export function strukturnamnetI(namn, text) {
  return strukturnamnensFormer(namn).some((n) => new RegExp(`(^|[^\\p{L}])${esc(n)}(?![\\p{L}])`, n.includes(',') ? 'iu' : 'u').test(text));
}

/**
 * Felen i en struktur, som en lista. En struktur som är utkast får sakna bild och förslag; en struktur som visas har
 * båda, och bilden har sitt textalternativ.
 * @param {{ namn?: string, andra?: string[], syfte?: string, slag?: string, steg?: string[], kalla?: { summa: string }, bild?: { scen?: string, alt?: string }, forslag?: { omrade: string, arskurs: string, amne?: string, text: string }[], utkast?: boolean }} s
 * @returns {string[]}
 */
export function strukturensFel(s) {
  const fel = [];
  const g = STRUKTURENS_GRANSER;
  if (!s.namn) fel.push('Strukturen har inget namn.');
  if (s.kalla && s.kalla.summa !== strukturensSumma(s)) fel.push(`Namnet, andra namn, syftet eller stegen i ${s.namn} skiljer sig från bankens post vid intaget: ändra dem i grundbokens bank och kör node scripts/strukturer/intag.mjs, inte i filen.`);
  if (!(s.slag in STRUKTURENS_SLAG)) fel.push(`Slaget ${s.slag} finns inte: ${Object.keys(STRUKTURENS_SLAG).join(', ')}.`);
  const steg = s.steg ?? [];
  if (steg.length < g.steg.minst || steg.length > g.steg.högst) fel.push(`Strukturen har ${steg.length} steg; ett kort har ${g.steg.minst} till ${g.steg.högst}.`);
  steg.forEach((t, i) => { if (t.length > g.steg.tecken) fel.push(`Steg ${i + 1} har ${t.length} tecken; ett steg har högst ${g.steg.tecken}, så att baksidan rymmer stegen.`); });
  const alla = steg.reduce((a, t) => a + t.length, 0);
  if (alla > g.steg.allaTecken) fel.push(`Stegen har ${alla} tecken tillsammans; baksidan rymmer ${g.steg.allaTecken}.`);
  if (s.utkast) return fel;
  if (!s.provad) fel.push('Strukturen är inte prövad: stegen prövas av två lärare i rollen och avgörs innan strukturen visas (provad).');
  if (!s.bild?.scen) fel.push('Strukturen har ingen bild, och bara ett utkast får sakna den.');
  else if (!s.bild.alt) fel.push('Bilden har inget textalternativ.');
  const forslag = s.forslag ?? [];
  if (forslag.length !== g.forslag.antal) fel.push(`Strukturen har ${forslag.length} förslag; den har ${g.forslag.antal}.`);
  forslag.forEach((f, i) => {
    if (!g.omraden.includes(f.omrade)) fel.push(`Förslag ${i + 1} har området ${f.omrade}, som inte finns: ${g.omraden.join(', ')}.`);
    if (!g.arskurser.includes(f.arskurs)) fel.push(`Förslag ${i + 1} har årskursen ${f.arskurs}, som inte finns: ${g.arskurser.join(', ')}.`);
    const n = meningarna(f.text).length;
    if (n < g.forslag.meningar[0] || n > g.forslag.meningar[1]) fel.push(`Förslag ${i + 1} har ${n} meningar; ett förslag har ${g.forslag.meningar[0]} till ${g.forslag.meningar[1]}.`);
  });
  return fel;
}

/**
 * Arken när kort skrivs ut två och två: varje A4 har två kort, ett uppe och ett nere, och varje ark är två sidor, först
 * framsidorna och sedan baksidorna i samma ordning, så att de hamnar rätt när arket skrivs ut dubbelsidigt och vänds längs
 * långsidan, som är skrivarnas förval. Ett udda antal ger en tom nedre halva på sista arket. Talen är kortens platser i
 * listan.
 * @param {number} antal
 * @returns {{ del: 'fram' | 'bak', uppe: number, nere: number | null }[]}
 */
export function strukturkortensArk(antal) {
  const sidor = [];
  for (let i = 0; i < antal; i += 2) {
    const nere = i + 1 < antal ? i + 1 : null;
    sidor.push({ del: 'fram', uppe: i, nere }, { del: 'bak', uppe: i, nere });
  }
  return sidor;
}
