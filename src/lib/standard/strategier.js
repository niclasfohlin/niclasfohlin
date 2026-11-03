// Strategierna (sajtens K-699): reglerna för en strategi i verktyget Strategier, med namnet som Niclas valde 2026-11-03.
// En strategi är ett sätt att lära ur kognitionsvetenskapen, som Plocka fram, skriven och ritad av metodriggen
// (C:/metodrigg/out/strategier/) och satt av sajten som ett kort i strukturkortets form och en sida. Formen och fälten är
// sajtens svar till riggen i out/strategier/FRAN-SAJTEN.md. Reglerna står här, så att sajtens schema, intaget och riggen
// prövar samma sak före leveransen.

import { meningarna } from './text.js';

/**
 * Gränserna för en strategi. Kortet är ett liggande A5 som strukturkortet (Niclas 2026-11-03: "kanske strategikorten också
 * ska vara som strukturkort, en halv A4 med fram och baksida"), och texterna ska rymmas på en rad där kortet har en rad:
 * meningen under namnet, rubriken och utfallet under var och en av berättelsens tre bilder, och handlingens tre led. Baksidan
 * har insikten, Så gör du i tre eller fyra steg med rubrik och text och det som avgör, När den passar eller Undvik. Om ett
 * kort ändå inte ryms avgör mätningen när kortet görs. Förslagen är fyra, som strukturernas, med NO, SO och teknik i stället
 * för socialt (Niclas samma dag: "användningsförslag i banken för Läs, skriv, matte och ämnen (NO/SO/Teknik)").
 */
export const STRATEGINS_GRANSER = Object.freeze({
  mening: 45,
  berattelsen: Object.freeze({ bilder: 3, rubrik: 16, utfall: 16 }),
  handling: Object.freeze({ antal: 3, tecken: 20 }),
  insikt: 90,
  steg: Object.freeze({ minst: 3, högst: 4, rubrik: 20, text: 70 }),
  avgor: Object.freeze(['När den passar', 'Undvik']),
  minnet: Object.freeze({ minst: 2, högst: 3, namn: 16, text: 24, pil: 12 }),
  forslag: Object.freeze({ antal: 4, meningar: Object.freeze([3, 5]) }),
  arskurser: Object.freeze(['F–3', '4–6', '7–9']),
});

/**
 * Strategiernas färg, en rot för kortet (scripts/strategier/kortform.mjs) och sidorna (src/lib/strategier.ts): violett,
 * som inget av strukturernas slag har, så att ett strategikort skiljs från ett strukturkort på ett ögonblick.
 */
export const STRATEGIERNAS_FARG = Object.freeze({ farg: '#4a3c8c', mork: '#3c3172', ljus: '#eeebf8' });

/** Förslagens områden, med namnet som sidan visar, i sidans ordning. */
export const STRATEGINS_OMRADEN = Object.freeze({
  lasning: 'Läsning',
  skrivning: 'Skrivning',
  matematik: 'Matematik',
  amnen: 'NO, SO och teknik',
});

/** Ett id i verktyget och en ikons id: a–z, siffror och bindestreck, som sajtens taggar och adresser. */
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const text = (t) => (typeof t === 'string' ? t.trim() : '');

/**
 * Felen i en strategi, som en lista. En strategi som är utkast får sakna förslag, källor och bildernas filer; en strategi
 * som visas har allt. Fälten står i FRAN-SAJTEN.md: id, nr, namn, forskningensOrd, framsida (mening, bild med liknelse och
 * tre steg, insikt, handling), baksida (vad, darfor, iMinnet, saGorDu, avgor, tankPa, forskningen, fordjupa) och forslag.
 * @param {Record<string, any>} s
 * @returns {string[]}
 */
export function strategiensFel(s) {
  const fel = [];
  const g = STRATEGINS_GRANSER;
  const namn = text(s?.namn) || 'Strategin';
  if (!text(s?.namn)) fel.push('Strategin har inget namn.');
  if (typeof s?.id === 'string' && !ID.test(s.id)) fel.push(`${namn}: id ${s.id} har annat än a–z, siffror och bindestreck.`);
  if (!Number.isInteger(s?.nr) || s.nr < 1) fel.push(`${namn}: nr är inget heltal från 1. Numret står på kortet och ändras aldrig när kortet är publicerat.`);
  if (!text(s?.forskningensOrd)) fel.push(`${namn}: forskningensOrd saknas, forskningens namn på strategin, som retrieval practice.`);

  const f = s?.framsida ?? {};
  const langd = (t, max, vad) => { if (!text(t)) fel.push(`${namn}: ${vad} saknas.`); else if (text(t).length > max) fel.push(`${namn}: ${vad} har ${text(t).length} tecken; högst ${max}, så att den ryms på kortet.`); };
  langd(f.mening, g.mening, 'framsidans mening');
  langd(f.insikt, g.insikt, 'insikten');
  if (!text(f.bild?.liknelse)) fel.push(`${namn}: berättelsens liknelse saknas (framsida.bild.liknelse).`);
  const bilder = Array.isArray(f.bild?.steg) ? f.bild.steg : [];
  if (bilder.length !== g.berattelsen.bilder) fel.push(`${namn}: berättelsen har ${bilder.length} bilder; den har ${g.berattelsen.bilder}.`);
  bilder.forEach((b, i) => {
    langd(b?.rubrik, g.berattelsen.rubrik, `bild ${i + 1}:s rubrik`);
    langd(b?.utfall, g.berattelsen.utfall, `bild ${i + 1}:s utfall`);
    if (!s?.utkast && !text(b?.fil)) fel.push(`${namn}: bild ${i + 1} har ingen fil.`);
    if (!s?.utkast && !text(b?.alt)) fel.push(`${namn}: bild ${i + 1} har inget textalternativ.`);
  });
  const handling = Array.isArray(f.handling) ? f.handling : [];
  if (handling.length !== g.handling.antal) fel.push(`${namn}: handlingen har ${handling.length} led; den har ${g.handling.antal}.`);
  handling.forEach((h, i) => {
    langd(h?.text, g.handling.tecken, `handlingens led ${i + 1}`);
    if (!ID.test(String(h?.ikon ?? ''))) fel.push(`${namn}: handlingens led ${i + 1} har ikonen "${h?.ikon}", som inte är ett id med a–z, siffror och bindestreck.`);
  });

  const b = s?.baksida ?? {};
  const steg = Array.isArray(b.saGorDu) ? b.saGorDu : [];
  if (steg.length < g.steg.minst || steg.length > g.steg.högst) fel.push(`${namn}: Så gör du har ${steg.length} steg; ${g.steg.minst} eller ${g.steg.högst}.`);
  steg.forEach((x, i) => { langd(x?.rubrik, g.steg.rubrik, `steg ${i + 1}:s rubrik`); langd(x?.text, g.steg.text, `steg ${i + 1}:s text`); });
  if (!g.avgor.includes(b.avgor?.rubrik)) fel.push(`${namn}: avgor.rubrik är "${b.avgor?.rubrik ?? ''}"; den är ${g.avgor.map((x) => `"${x}"`).join(' eller ')}.`);
  langd(b.avgor?.text, g.steg.text, 'avgor.text');
  for (const [falt, vad] of [['vad', 'Vad det är'], ['darfor', 'Därför hjälper det']]) {
    const t = text(typeof b[falt] === 'string' ? b[falt] : b[falt]?.text);
    if (!t) fel.push(`${namn}: ${vad} saknas (baksida.${falt}).`);
  }
  const delar = Array.isArray(b.iMinnet?.delar) ? b.iMinnet.delar : [];
  if (delar.length < g.minnet.minst || delar.length > g.minnet.högst) fel.push(`${namn}: minnets bild har ${delar.length} delar; ${g.minnet.minst} eller ${g.minnet.högst}.`);
  // Minnets bild står på kortets baksida i en spalt på 58 mm: delens namn i 15 punkter, dess text och pilens text i 11.
  delar.forEach((d, i) => { langd(d?.namn, g.minnet.namn, `minnets del ${i + 1}:s namn`); if (d?.text !== undefined) langd(d.text, g.minnet.text, `minnets del ${i + 1}:s text`); });
  (b.iMinnet?.pilar ?? []).forEach((p, i) => langd(p?.text, g.minnet.pil, `minnets pil ${i + 1}:s text`));
  for (const p of b.iMinnet?.pilar ?? []) if (![p?.fran, p?.till].every((d) => delar.some((x) => x?.namn === d))) fel.push(`${namn}: en pil i minnets bild går mellan "${p?.fran}" och "${p?.till}", som inte båda är delar.`);
  for (const l of b.fordjupa ?? []) if (!/^\/[a-z0-9/-]*$/.test(String(l?.adress ?? ''))) fel.push(`${namn}: Fördjupa leder till "${l?.adress}", som inte är en adress på sajten.`);
  if (s?.utkast) return fel;

  const kallor = b.forskningen?.kallor ?? [];
  if (!text(b.forskningen?.text)) fel.push(`${namn}: Forskningen saknas.`);
  if (!kallor.length || kallor.some((k) => typeof k !== 'object' || !text(k?.id) || !text(k?.titel) || !text(k?.text))) fel.push(`${namn}: Forskningens källor står som { id, titel, text, adress }, med minst en källa.`);
  const forslag = Array.isArray(s?.forslag) ? s.forslag : [];
  if (forslag.length !== g.forslag.antal) fel.push(`${namn}: strategin har ${forslag.length} förslag; den har ${g.forslag.antal}.`);
  forslag.forEach((x, i) => {
    if (!(x?.omrade in STRATEGINS_OMRADEN)) fel.push(`${namn}: förslag ${i + 1} har området ${x?.omrade}, som inte finns: ${Object.keys(STRATEGINS_OMRADEN).join(', ')}.`);
    if (!g.arskurser.includes(x?.arskurs)) fel.push(`${namn}: förslag ${i + 1} har årskursen ${x?.arskurs}, som inte finns: ${g.arskurser.join(', ')}.`);
    if (!text(x?.amne)) fel.push(`${namn}: förslag ${i + 1} har inget ämne.`);
    const n = meningarna(text(x?.text)).length;
    if (n < g.forslag.meningar[0] || n > g.forslag.meningar[1]) fel.push(`${namn}: förslag ${i + 1} har ${n} meningar; ett förslag har ${g.forslag.meningar[0]} till ${g.forslag.meningar[1]}.`);
  });
  return fel;
}

/**
 * Strategikorten i en metod: fältet `strategikort` i metodens fil, med en text och strategiernas id i verktyget, i den
 * ordning de skrivs ut, som `strukturkort`. Ett udda antal går, till skillnad från strukturkorten, eftersom metoden
 * Lärande på kognitionsvetenskaplig grund har fem strategier som kärna (Niclas 2026-11-03: metoden "kommer visa 5st"); det
 * sista arket får då en tom nedre halva. `blad` är namnet på metodens blad med strategierna, som sajten gör ur samma fält.
 */
export const METODENS_STRATEGIKORT = Object.freeze({ minst: 1, högst: 8 });
/**
 * Felen i en metods fält strategikort, som en lista; tomt när fältet saknas.
 * @param {unknown} sk
 * @returns {string[]}
 */
export function strategikortensFel(sk) {
  if (sk === undefined) return [];
  const g = METODENS_STRATEGIKORT;
  const x = /** @type {{ text?: unknown, strategier?: unknown, blad?: unknown }} */ (sk ?? {});
  const fel = [];
  if (typeof x.text !== 'string' || !x.text.trim()) fel.push('strategikort.text saknas: en text om korten, som sidan och Word-filen visar.');
  const ids = Array.isArray(x.strategier) ? x.strategier : [];
  if (ids.length < g.minst || ids.length > g.högst) fel.push(`strategikort.strategier har ${ids.length} strategier; en metod har ${g.minst} till ${g.högst}.`);
  for (const id of ids) if (typeof id !== 'string' || !ID.test(id)) fel.push(`strategikort.strategier: "${id}" är inget id i verktyget.`);
  if (new Set(ids).size !== ids.length) fel.push('strategikort.strategier har en strategi två gånger.');
  if (x.blad !== undefined && (typeof x.blad !== 'string' || !x.blad.trim())) fel.push('strategikort.blad är bladets namn som metoden säger det, eller utelämnat.');
  return fel;
}

/**
 * Det ett strategikort visar, ur strategins fil: numret, namnet, meningen, berättelsen, handlingen, insikten, minnets bild,
 * stegen och det som avgör. Skriptet som gör korten (scripts/strategier/kort.mjs) och sidan läser samma.
 * @param {Record<string, any>} s
 */
export function strategikortetsData(s) {
  const f = s.framsida ?? {}, b = s.baksida ?? {};
  return {
    nr: s.nr, namn: s.namn, mening: f.mening, insikt: f.insikt,
    berattelsen: (f.bild?.steg ?? []).map((x) => ({ rubrik: x.rubrik, utfall: x.utfall, fil: x.fil ?? null })),
    handling: (f.handling ?? []).map((h) => ({ text: h.text, ikon: h.ikon })),
    minnet: { delar: b.iMinnet?.delar ?? [], pilar: b.iMinnet?.pilar ?? [] },
    steg: b.saGorDu ?? [], avgor: b.avgor ?? null,
  };
}
/**
 * Kontrollsumman över det ett strategikort visar: kortets data och bildernas och ikonernas filer, som text. Skriptet som
 * gör korten skriver den i manifestet, och bygget räknar om den och stannar på ett kort som är äldre än strategin.
 * Radsluten räknas som \n, så att en arbetskopia i Windows och Netlifys bygge räknar samma. FNV-1a på 32 bitar.
 * @param {Record<string, any>} s
 * @param {string[]} filerna  bildernas och ikonernas svg, i kortets ordning
 */
export function strategikortetsInnehall(s, filerna) {
  const t = JSON.stringify([strategikortetsData(s), filerna.map((f) => f.replace(/\r\n/g, '\n'))]);
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** Kortets fil, i public/strategier/kort/ och på /strategier/kort/. */
export const strategikortetsFil = (id) => `strategikort-${id}.pdf`;
/** Filen med alla kort, två på varje A4, och dess nyckel i manifestet. */
export const STRATEGIKORTEN_ALLA = Object.freeze({ fil: 'strategikort-alla.pdf', nyckel: '_alla' });
/** Bladet med alla strategier, väggens mitt, och dess nyckel i manifestet; en metods blad med sina strategier. */
export const STRATEGIBLADET = Object.freeze({ fil: 'strategier-bladet.pdf', nyckel: '_bladet' });
export const metodensStrategiblad = (metod) => Object.freeze({ fil: `strategier-bladet-${metod}.pdf`, nyckel: `_blad:${metod}` });
/** En metods strategikort, två och två på A4, och nyckeln i manifestet. */
export const metodensStrategikort = (metod) => Object.freeze({ fil: `strategikort-${metod}.pdf`, nyckel: `_metod:${metod}` });
