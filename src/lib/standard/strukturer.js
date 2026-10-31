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
