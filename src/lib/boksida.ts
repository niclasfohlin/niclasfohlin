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
