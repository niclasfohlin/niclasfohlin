// Undervisningsmetoderna, Metoder för läsaren (sajtens K-621, riggens standard för undervisningsmetoder). Delarna i lärarens
// väg som data, så att sidans innehållsrad, Word-filens band och riggens bygge läser samma lista (standarden, avsnitt 4),
// och utfallens gränser för en klass (avsnitt 7). Riggen läser modulen genom build/standarden.mjs.

import { talText } from './text.js';

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
  { id: 'att-skriva-ut', nr: 'A', namn: 'Att skriva ut', rad: 'Materialet för klassen, planeringsmallen och observationsmallen.', text: 'Här står det du skriver ut: lektionskortet, materialet för klassen, planeringsmallen och observationsmallen för den som besöker en lektion.' },
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
