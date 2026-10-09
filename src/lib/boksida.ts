// Boksidans mått (K-148): hur stor texten är, hur glest raderna står och hur stort anfanget är, så att varje lästext är
// precis ett A4. Word (boksida() i metoddocx.ts) och sidans utskrift (Boksida.astro) räknar med samma funktion, så att
// en text står likadant i båda (Niclas 2026-10-01: "En text per sida ska det vara. Så se till att inte blir något knas.
// Varje text ska kunna skrivas ut så."). Uträkningen är metodriggens (build-docx.js, lastext), med riggens mått för
// anfanget och teckenbredderna (src/data/boksida/). Inga Node-beroenden: filen körs också i webbläsaren.
import ANFANG from '../data/boksida/anfang.json';
import ANDIKA_BREDD from '../data/boksida/andika-bredder.json';
import CINZEL_BREDD from '../data/boksida/cinzel-bredder.json';
import type { Lastext } from './ramform';

// Sidan i twips: A4 med 1,5 cm marginal runt om, och ramens höjd minus stycket på en punkt före ramen, sektionens sista
// stycke och lite luft.
export const BOK_A4 = { width: 11906, height: 16838 };
export const BOKMARGINAL = { top: 850, bottom: 850, left: 850, right: 850, header: 400, footer: 454 };
export const BOKBREDD = BOK_A4.width - BOKMARGINAL.left - BOKMARGINAL.right;
const nedBildpunkt = (tw: number) => Math.floor(tw / 15) * 15;
export const RAMHOJD = nedBildpunkt(BOK_A4.height - BOKMARGINAL.top - BOKMARGINAL.bottom - 2 * 24 - 150);
// Textens inre marginal i ramen, till vänster och höger.
export const BOKLUFT = 1005;
// Enkla rader per punkt storlek, lika i Word och Google (mätbänken, scripts/matbank/radavstand.mjs).
export const BOKRAD = { Andika: 1.611, Cinzel: 1.348 };
// Anfangets radavstånd som multipel: Word klipper versalen under 0,72 (riggen, 2026-09-30).
export const ANFANG_MULTIPEL = 0.74;
// Raderna bredvid anfanget: lika många som bokstaven är hög.
export const ANFANGRADER = 2;
export const TITEL_PT = 27;
// Radavstånden som prövas, från glesast till tätast (multiplar av Andikas enkla rad, 240 är enkelt).
export const BOKLINJER = [230, 210, 190, 170];

// Bredden av en text i Andika eller Cinzel, i punkter.
// Fet och kursiv stil i texten skrivs som **ord** och *ord* (förlagornas mellanrubriker i Ordverkstad i grupp, 2026-10-06;
// bokRuns i metoddocx.ts och Boksida.astro ritar dem). Tecknen tar ingen plats på raden.
export const utanMarkering = (t: string) => t.replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g, '$1$2');
export const breddPt = (t: string, pt: number, tabell: Record<string, number> = ANDIKA_BREDD) => [...t].reduce((a, c) => a + (tabell[c] ?? (c === '⁠' ? 0 : 0.56)), 0) * pt;
// Delar ett stycke där Word bryter rad nummer n i en spalt som är bredd punkter bred: det som står på de n första raderna,
// och resten. Raderna i stycket (\n) är egna rader.
export function delaVidRad(text: string, bredd: number, pt: number, n: number): { inne: string; rest: string; rader: number } {
  const segment = text.split('\n');
  const inne: string[] = [];
  let rader = 0;
  for (let si = 0; si < segment.length; si++) {
    const ord = segment[si].split(' ');
    const klara: string[] = [];
    let rad = '';
    for (let i = 0; i < ord.length; i++) {
      const prov = rad ? `${rad} ${ord[i]}` : ord[i];
      if (rad && breddPt(utanMarkering(prov), pt) > bredd) {
        klara.push(rad); rader++; rad = ord[i];
        if (rader === n) return { inne: [...inne, klara.join(' ')].join('\n'), rest: [ord.slice(i).join(' '), ...segment.slice(si + 1)].join('\n'), rader };
      } else rad = prov;
    }
    klara.push(rad); rader++;
    inne.push(klara.join(' '));
    if (rader >= n) return { inne: inne.join('\n'), rest: segment.slice(si + 1).join('\n'), rader };
  }
  return { inne: inne.join('\n'), rest: '', rader };
}
// Antalet rader ett stycke tar i en spalt som är bredd punkter bred, med samma brytning som delaVidRad.
export function antalRader(text: string, bredd: number, pt: number): number {
  let rader = 0;
  for (const seg of text.split('\n')) {
    let rad = '';
    for (const o of seg.split(' ')) {
      const prov = rad ? `${rad} ${o}` : o;
      if (rad && breddPt(utanMarkering(prov), pt) > bredd) { rader++; rad = o; } else rad = prov;
    }
    rader++;
  }
  return rader;
}
// En rad som inte ryms i spalten delas i två nära mitten, helst efter ett komma eller före ett litet ord, så att en mening
// på Lättläst står som två hela fraser och inget ord står ensamt.
export function delaFras(rad: string, bredd: number, pt: number): string[] {
  if (breddPt(rad, pt) <= bredd) return [rad];
  const mitt = rad.length / 2;
  let basta = -1;
  let poang = Infinity;
  for (let i = 1; i < rad.length - 1; i++) {
    if (rad[i] !== ' ') continue;
    const fore = rad.slice(0, i);
    const efter = rad.slice(i + 1);
    if (breddPt(fore, pt) > bredd || breddPt(efter, pt) > bredd) continue;
    const fras = /,$/.test(fore) ? -20 : /^(och|men|medan|när|så|som|att|fast|för)\b/.test(efter) ? -12 : /^(på|i|till|med|vid|från|efter|om|innan|utan)\b/.test(efter) ? -5 : 0;
    const p = Math.abs(i - mitt) + fras;
    if (p < poang) { poang = p; basta = i; }
  }
  return basta < 0 ? [rad] : [rad.slice(0, basta), rad.slice(basta + 1)];
}

export interface Boksidesmatt {
  /** Alla rader korta (Lättläst, en mening per rad): 16 pt, annars 13 pt. Storleken i halva punkter. */
  kortaRader: boolean; size: number; pt: number;
  /** Radavståndet som multipel (240 är enkelt) och raden i punkter. */
  line: number; radPt: number;
  /** Anfanget: bokstaven (med ett citattecken före om texten börjar med en replik), dess storlek och kolumnens bredd. */
  bokstav: string; storPt: number; kolW: number;
  /** Det som står bredvid anfanget och resten av första stycket, anfangets och titelns höjd i twips. */
  delat: { inne: string; rest: string; rader: number }; anfangH: number; titelH: number;
  /** Ryms texten på sidan med det här radavståndet? */
  ryms: boolean;
}
// Boksidans mått: det glesaste radavståndet där titeln, texten och frågorna ryms i ramen. Ryms texten inte ens med det
// tätaste står ryms false, och Word-byggaret stannar.
export function boksidansMatt(l: Lastext): Boksidesmatt {
  const kortaRader = l.stycken.every((s) => s.split('\n').every((r) => r.length <= 50));
  const size = kortaRader ? 32 : 26;
  const pt = size / 2;
  const luft = BOKLUFT;
  const [forsta0, ...ovriga] = l.stycken;
  const m = forsta0.match(/^([”’]?)(\p{L})/u);
  const bokstav = m ? m[1] + m[2] : '';
  const titelRader = Math.max(1, Math.ceil(breddPt(l.titel, TITEL_PT, CINZEL_BREDD) / ((BOKBREDD - 2 * luft) / 20)));
  const titelH = 90 + 200 + Math.ceil(titelRader * BOKRAD.Cinzel * TITEL_PT * 20) + 60 + 24 + 45 + 300;
  const fragaBredd = (BOKBREDD - 2 * luft - 480) / 20 * 0.965;
  const fullBredd = (BOKBREDD - 2 * luft) / 20 * 0.965;
  const anfangBredd = ANFANG.bredd as Record<string, number>;
  const anfangUnder = ANFANG.under as Record<string, number>;
  const forsok = (line: number): Boksidesmatt => {
    const radPt = BOKRAD.Andika * pt * line / 240;
    const storPt = Math.round((0.8645 * pt + radPt) / (ANFANG_MULTIPEL * 0.976));
    const kolW = nedBildpunkt(((m?.[1] ? 0.3 : 0) + (anfangBredd[m?.[2]?.toUpperCase() ?? ''] ?? 0.8)) * 1.04 * storPt * 20) + 120;
    const spalt = (BOKBREDD - luft - kolW - luft) / 20 * 0.965;
    // På Lättläst står en mening per rad. En mening som inte ryms bredvid anfanget delas vid en frasgräns.
    let forsta = forsta0;
    if (kortaRader) {
      const [a0, ...resten] = forsta0.slice(bokstav.length).split('\n');
      const nya: string[] = [];
      [a0, ...resten].forEach((r, i) => nya.push(...(i < ANFANGRADER ? delaFras(r, spalt, pt) : [r])));
      forsta = bokstav + nya.join('\n');
    }
    const delat = delaVidRad(forsta.slice(bokstav.length), spalt, pt, ANFANGRADER);
    // Anfangets rad: bokstavens baslinje står på andra radens baslinje (0,8645 av textens storlek plus en rad ner), och
    // svansen under baslinjen ska synas. Raden är exakt så hög, eller två textrader om de är högre.
    const svans = (anfangUnder[m?.[2]?.toUpperCase() ?? ''] ?? 0.22) * storPt;
    const anfangH = nedBildpunkt(Math.max(Math.ceil(Math.max(2, delat.rader) * radPt * 20) + (delat.rest ? 0 : 150), Math.ceil((0.8645 * pt + radPt + svans + 1) * 20)) + 14);
    const radTw = radPt * 20;
    const restText = (delat.rest ? [delat.rest] : []).concat(ovriga);
    const textH = restText.reduce((h, t) => h + antalRader(t, fullBredd, pt) * radTw + 150, 0);
    const fragorH = l.fragor.reduce((h, f) => h + antalRader(f.replace(/^\d+\.\s*/, ''), fragaBredd, pt) * radTw + 110, 0);
    const behov = titelH + anfangH + textH + 100 + 300 + 24 + fragorH + 90;
    return { kortaRader, size, pt, line, radPt, bokstav, storPt, kolW, delat, anfangH, titelH, ryms: behov <= RAMHOJD - 300 };
  };
  const alla = BOKLINJER.map(forsok);
  return alla.find((f) => f.ryms) ?? alla[alla.length - 1];
}

// Elevens sida till två texter och strukturens sida (src/lib/ramform.ts, textparAv och strukturAv) har boksidans ram, men
// texten står närmare ramen än lästextens: 700 twips, som i metodriggens build-docx.js (textpar och struktur). Måtten och
// uträkningen är riggens, så att sidan blir densamma i sajtens Word-fil, i riggens kompendium och i sidans utskrift.
export const FORMLUFT = 700;
// Raden under titeln (ramens text till eleven) står i Andika 15 pt.
export const FORMRAD_PT = 15;
const titelRaderFor = (titel: string) => Math.max(1, Math.ceil(breddPt(titel, TITEL_PT, CINZEL_BREDD) / ((BOKBREDD - 2 * FORMLUFT) / 20)));
// Bredderna i twips inne i den dubbla ramen (30 twips in från den yttre kanten, metoddocx.ts DUBBEL_GLAPP).
const INRE = BOKBREDD - 2 * 30;
const LUFT_I = FORMLUFT - 30;

export interface Textparmatt {
  /** Storleken i halva punkter (33, 32, 30 eller 28) och i punkter, radavståndet som multipel och raden i punkter. */
  size: number; pt: number; line: number; radPt: number;
  /** Höjderna i twips: titeln med linjen och raden, spalterna och raden med frågorna, som fyller resten av ramen. */
  titelH: number; spaltH: number; restH: number;
  /** Spaltens bredd i twips (den första; den andra är resten), och luften mot mittlinjen. */
  spaltW: number; inne: number;
  ryms: boolean;
}
// Elevens sida till två texter: den största storleken, från 16,5 till 14 punkter, där titeln, raden, de två texterna och
// frågorna ryms på ett A4. Ryms de inte ens i 14 punkter står ryms false, och Word-byggaret stannar.
export function textparMatt(p: { titel: string; texter: string[]; fragor: string[]; text: string }): Textparmatt {
  const spaltW = Math.floor(INRE / 2);
  const inne = 300;
  const titelRader = titelRaderFor(p.titel);
  const helBredd = (INRE - 2 * LUFT_I) / 20 * 0.965;
  const radenRader = p.text ? antalRader(p.text, helBredd, FORMRAD_PT) : 0;
  const textBredd = (spaltW - LUFT_I - inne) / 20 * 0.965;
  const fragaBredd = (INRE - 2 * LUFT_I - 480) / 20 * 0.965;
  const forsok = (size: number): Textparmatt => {
    const pt = size / 2, line = 230;
    const radPt = BOKRAD.Andika * pt * line / 240;
    const titelH = 200 + Math.ceil(titelRader * BOKRAD.Cinzel * TITEL_PT * 20) + 60 + 24 + 45 + 240 + Math.ceil(radenRader * BOKRAD.Andika * FORMRAD_PT * 20) + 360;
    const spaltH = nedBildpunkt(Math.ceil(Math.ceil(BOKRAD.Cinzel * 20 * 20) + Math.ceil(BOKRAD.Cinzel * 10.5 * 20) + 200 + Math.max(...p.texter.map((t) => antalRader(utanMarkering(t), textBredd, pt))) * radPt * 20));
    const fragorH = 100 + 400 + Math.ceil(BOKRAD.Cinzel * 13 * 20) + 200 + p.fragor.reduce((h, f) => h + antalRader(f, fragaBredd, pt) * radPt * 20 + 120, 0);
    const restH = nedBildpunkt(Math.max(0, RAMHOJD - titelH - spaltH - 450));
    return { size, pt, line, radPt, titelH, spaltH, restH, spaltW, inne, ryms: titelH + spaltH + fragorH + 450 <= RAMHOJD };
  };
  const alla = [33, 32, 30, 28].map(forsok);
  return alla.find((f) => f.ryms) ?? alla[alla.length - 1];
}

export interface Strukturmatt {
  /** Stegens storlek i halva punkter och i punkter, radavståndet, raden i punkter och rutans storlek i punkter. */
  size: number; pt: number; line: number; radPt: number; rutaPt: number;
  /** Bildens andel av bredden innanför luften, och dess bredd och höjd i twips. */
  skala: number; bildB: number; bildH: number;
  /** Titelns höjd och resten av ramen i twips. */
  titelH: number; restH: number;
  ryms: boolean;
}
// Strukturens sida: den största storleken och bilden, från 15 punkter och bilden i 80 procent av bredden till 12 punkter
// och 60 procent, där titeln, raden, bilden, stegen och rutan ryms på ett A4.
export function strukturMatt(s: { titel: string; steg: string[]; ruta: string[]; text: string }, bild?: { bredd: number; hojd: number }): Strukturmatt {
  const titelRader = titelRaderFor(s.titel);
  const helB = INRE - 2 * LUFT_I;
  const helBredd = helB / 20 * 0.965;
  const radenRader = s.text ? antalRader(s.text, helBredd, FORMRAD_PT) : 0;
  const stegBredd = (helB - 480) / 20 * 0.965;
  const rutaBredd = (helB - 2 * 300) / 20 * 0.965;
  const forsok = ([size, skala]: number[]): Strukturmatt => {
    const bildB = Math.round(helB * skala), bildH = bild ? Math.round((bildB * bild.hojd) / bild.bredd) : 0;
    const pt = size / 2, line = 230, radPt = BOKRAD.Andika * pt * line / 240, rutaPt = pt - 1.5;
    const titelH = 200 + Math.ceil(titelRader * BOKRAD.Cinzel * TITEL_PT * 20) + 60 + 24 + 45 + 240 + Math.ceil(radenRader * BOKRAD.Andika * FORMRAD_PT * 20) + 240;
    const stegH = 100 + Math.ceil(BOKRAD.Cinzel * 13 * 20) + 160 + s.steg.reduce((h, x) => h + antalRader(x, stegBredd, pt) * radPt * 20 + 100, 0);
    const rutaH = 200 + 2 * 160 + (1 + s.ruta.reduce((n, x) => n + antalRader(x, rutaBredd, rutaPt), 0)) * BOKRAD.Andika * rutaPt * 20 + 200;
    const restH = nedBildpunkt(Math.max(0, RAMHOJD - titelH - 450));
    return { size, pt, line, radPt, rutaPt, skala, bildB, bildH, titelH, restH, ryms: titelH + bildH + 200 + stegH + rutaH + 450 <= RAMHOJD };
  };
  const alla = [[30, 0.8], [28, 0.8], [28, 0.7], [26, 0.8], [26, 0.7], [24, 0.7], [26, 0.6], [24, 0.6]].map(forsok);
  return alla.find((f) => f.ryms) ?? alla[alla.length - 1];
}
