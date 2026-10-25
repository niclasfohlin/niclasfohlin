// Små textverktyg, en rot för varje (sajtens K-509; Niclas 2026-10-25: "Centralisera och till en rot ... Och saker ska
// härledas ur en beräkning eller ett ställe som är samma sak. Inte ha kopierade koder på olika ställen"). Planen, sidorna,
// pdf:erna och standardens andra delar hämtar dem här, och sajtens planprov stannar på samma funktion, samma lista eller
// samma kod på två ställen i modulen (PLANERA.md under Spärren mot drift).

/** Stor bokstav först: "Måndag 2 november". @param {string} s */
export const stor = (s) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);
/** Liten bokstav först, som när en mening ur metoden står inne i en annan. @param {string} s */
export const liten = (s) => s.charAt(0).toLocaleLowerCase('sv') + s.slice(1);
/** En mening slutar med punkt, om den inte redan slutar med ett skiljetecken. @param {string} s */
export const mening = (s) => (/[.!?:”"]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
/** Utan punkt och blanksteg sist, så att texten kan stå inne i en längre mening. @param {string} s */
export const utanPunkt = (s) => s.replace(/[.\s]+$/, '');
/** Ett tal med decimalkomma: "3,5". @param {number | null} n */
export const decimal = (n) => String(n).replace('.', ',');
/** "09" ur 9. @param {number} n */
export const tvasiffrigt = (n) => String(n).padStart(2, '0');
/** Text som ska stå i HTML, med &, <, > och " skyddade. @param {string} s */
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
/** Text som ska sökas ordagrant i ett reguljärt uttryck. @param {string} s */
export const skyddaRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * Text som läraren har skrivit, på en rad: utan styrtecken, med ett blanksteg mellan orden och högst max tecken. Annat än
 * text blir tom text.
 * @param {unknown} x
 * @param {number} max
 */
export const rentText = (x, max) => (typeof x === 'string' ? x.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
/** Namnets första led, före kolon: "Lärarhandledningen" ur "Lärarhandledningen: Läs mellan raderna". @param {string} s */
export const forstaLedet = (s) => s.split(':')[0].trim();
/**
 * Ett namn kort, med bara första ledet, när inget annat namn i listan har samma första led, och annars helt: "Bildserie 1"
 * och "Mina lärdomar: vecka 1–2".
 * @param {string} namn
 * @param {string[]} alla
 */
export const kortnamn = (namn, alla) => (alla.filter((x) => forstaLedet(x) === forstaLedet(namn)).length === 1 ? forstaLedet(namn) : namn);

// ---------- Talen ----------
// Löptext skriver talen upp till tolv med bokstäver (talText), och metodernas texter läses med siffror eller ord, också
// sammansatta som "tjugofem" (talAv). Orden står här och bara här.

const ENTAL = ['noll', 'ett', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv', 'tretton', 'fjorton', 'femton', 'sexton', 'sjutton', 'arton', 'nitton'];
const TIOTAL = ['', '', 'tjugo', 'trettio', 'fyrtio', 'femtio', 'sextio', 'sjuttio', 'åttio', 'nittio'];
/** Ordningstalen, "första" för 1. */
export const ORDNINGSTAL = Object.freeze(['', 'första', 'andra', 'tredje', 'fjärde', 'femte', 'sjätte', 'sjunde', 'åttonde', 'nionde', 'tionde']);
/** Ett tal i ord upp till tolv, som i löptext, och annars med siffror. @param {number} n @param {boolean} [en] "en" i stället för "ett" */
export const talText = (n, en = false) => (n === 1 && en ? 'en' : Number.isInteger(n) && n >= 0 && n <= 12 ? ENTAL[n] : String(n));
/** "båda" för två och "alla tre" för fler. @param {number} n */
export const allaAntal = (n) => (n === 2 ? 'båda' : `alla ${talText(n)}`);
/** Ett tal ur siffror eller ord, också "en" och sammansatta som "tjugofem"; NaN när texten inte är ett tal. @param {string} s */
export function talAv(s) {
  const t = String(s ?? '').trim().toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  if (t === 'en') return 1;
  const tio = TIOTAL.findIndex((x) => x && t.startsWith(x));
  if (tio > 0) {
    const rest = t.slice(TIOTAL[tio].length);
    const e = rest === '' ? 0 : rest === 'en' ? 1 : ENTAL.indexOf(rest);
    return e >= 0 && e <= 9 ? tio * 10 + e : NaN;
  }
  const i = ENTAL.indexOf(t);
  return i >= 0 ? i : NaN;
}
/**
 * Talen från fran till till som led i ett reguljärt uttryck, med siffrorna först: "\d+|en|ett|två|tre". "en" står med när
 * ett ingår, och från tjugo de sammansatta tiotalen, som "tjugofem".
 * @param {number} fran
 * @param {number} till
 */
export const talIRegex = (fran, till) => {
  const tiotal = till >= 20 ? [`(?:${TIOTAL.slice(2, Math.min(9, Math.floor(till / 10)) + 1).join('|')})(?:en|${ENTAL.slice(1, 10).join('|')})?`] : [];
  return ['\\d+', ...(fran <= 1 && till >= 1 ? ['en'] : []), ...ENTAL.slice(Math.max(0, fran), Math.min(19, till) + 1), ...tiotal].join('|');
};
