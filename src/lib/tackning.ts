// Täckningskartan i metodbanken (K-241, Niclas 2026-10-07): en stapel per metod över årskurserna F till 9, i områdets
// färg, mellan väljaren och korten på /stodundervisning. Kartan ritas ur metodfilerna vid bygget, utan egna fält:
// stapeln är metodens årskursspann, läst ur arskursText ("åk 3–6", "F–2", "F–3, främst F–2") eller, när texten saknas,
// ur nivåerna i arskurs (F-3 och 4-6 blir F–6). Schemat stannar på en arskursText som inte går att läsa och på ett spann
// som inte stämmer med nivåerna, så att kartan och filtret aldrig säger olika (content.config.ts). Inga Node-beroenden.
import type { MetodData } from './metod';

type Arskurs = Pick<MetodData, 'arskurs' | 'arskursText'>;
/** Årskurserna som tal: F är 0, nian är 9. */
export type Spann = [number, number];
const NIVA: Record<string, Spann> = { 'F-3': [0, 3], '4-6': [4, 6], '7-9': [7, 9] };
export const SKALA = ['F', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Spannet i en årskurstext, eller undefined när texten inte har formen "åk 3–6" eller "F–2" (ett bindestreck går
 * också). Det första spannet i texten gäller ("F–3, främst F–2" blir F–3). En ensam årskurs, "åk 1" eller "F", är ett
 * spann på en årskurs. */
export function spannITexten(text: string): Spann | undefined {
  const m = text.match(/(?:^|[^\d])(F|\d)\s*[–-]\s*(\d)(?!\d)/);
  if (m) {
    const fran = m[1] === 'F' ? 0 : Number(m[1]);
    const till = Number(m[2]);
    return fran <= till ? [fran, till] : undefined;
  }
  const ensam = text.trim().match(/^(?:åk\s*)?(F|\d)$/i);
  if (ensam) { const n = ensam[1].toUpperCase() === 'F' ? 0 : Number(ensam[1]); return [n, n]; }
  return undefined;
}
/** Spannet ur nivåerna: det lägsta och det högsta. */
export function spannUrNivaerna(arskurs: readonly string[]): Spann {
  const n = arskurs.map((a) => NIVA[a]).filter(Boolean);
  return [Math.min(...n.map((x) => x[0])), Math.max(...n.map((x) => x[1]))];
}
/** Metodens spann: ur texten när den finns, annars ur nivåerna. */
export function arskursSpannet(d: Arskurs): Spann {
  return (d.arskursText && spannITexten(d.arskursText)) || spannUrNivaerna(d.arskurs);
}
/** "F–3" eller "3–6", som på kortet; en ensam årskurs skrivs "F" eller "4". */
export const spannText = ([fran, till]: Spann) => (fran === till ? (fran === 0 ? 'F' : String(fran)) : `${fran === 0 ? 'F' : fran}–${till}`);
/** Nivåerna som ett spann rör: åk 3–6 rör F-3 och 4-6. */
export const nivaerISpannet = ([fran, till]: Spann): string[] => Object.entries(NIVA).filter(([, [a, b]]) => fran <= b && till >= a).map(([n]) => n);

/** Felet i en metods årskurs, eller undefined: texten går inte att läsa, eller spannet rör andra nivåer än arskurs. */
export function arskursFel(d: Arskurs): string | undefined {
  if (d.arskursText !== undefined && !d.arskursText.trim()) return 'arskursText är tom. Ta bort fältet, eller skriv årskursen som "åk 3–6" eller "F–2".';
  if (d.arskursText && !spannITexten(d.arskursText)) return `arskursText "${d.arskursText}" går inte att läsa som ett spann. Skriv årskursen som "åk 3–6" eller "F–2"; täckningskartan i metodbanken ritar stapeln ur den.`;
  const sp = arskursSpannet(d);
  const ror = nivaerISpannet(sp);
  const nivaer: readonly string[] = d.arskurs;
  const saknas = ror.filter((n) => !nivaer.includes(n));
  const extra = d.arskurs.filter((n) => !ror.includes(n));
  if (!saknas.length && !extra.length) return undefined;
  if (!d.arskursText) return `arskurs ${d.arskurs.join(', ')} har ett glapp: täckningskartan ritar en stapel per metod och kan inte visa det. Ange arskursText med ett spann, eller ta med nivån emellan.`;
  return `arskursText "${d.arskursText}" (${spannText(sp)}) rör nivåerna ${ror.join(', ')} men arskurs säger ${d.arskurs.join(', ')}. Filtret och täckningskartan ska säga samma sak: rätta det ena.`;
}

// Passet och takten i kortform till kartan på dator: "60 min · 2–3 pass/vecka · 8 veckor" ur tid och period, som
// kortets faktaremsa läser dem (kortFakta i metod.ts), i delar som sidan håller ihop var för sig. Det som inte känns
// igen står kvar som det är: ett tillägg efter "pass i veckan" ("och ett tredje när det går" blir 2–3, annat står kvar)
// och en period som inte börjar med veckorna.
const TAL: Record<string, number> = { ett: 1, en: 1, två: 2, tre: 3, fyra: 4, fem: 5, sex: 6, sju: 7, åtta: 8, nio: 9, tio: 10, elva: 11, tolv: 12, femton: 15 };
const ORD = '(ett|en|två|tre|fyra|fem|sex|sju|åtta|nio|tio|elva|tolv|femton)';
const siffror = (s: string) => s
  .replace(new RegExp(`(^|[^\\p{L}])${ORD} till ${ORD}(?=$|[^\\p{L}])`, 'giu'), (_, f, a, b) => `${f}${TAL[a.toLowerCase()]}–${TAL[b.toLowerCase()]}`)
  .replace(new RegExp(`(^|[^\\p{L}])${ORD}(?=$|[^\\p{L}])`, 'giu'), (_, f, a) => `${f}${TAL[a.toLowerCase()]}`);
const NASTA: Record<string, number> = { andra: 2, tredje: 3, fjärde: 4, femte: 5 };
/** Passet och takten som delar: passets längd och hur ofta på en rad, och perioden för sig. */
export function taktDelar(d: Pick<MetodData, 'tid' | 'period'>): { delar: string[]; period?: string } {
  const [pass, ...rest] = (d.tid ?? '').split(/ per pass,?\s*/);
  const delar: string[] = [];
  if (rest.length) {
    delar.push(siffror(pass).replace(/minuter/, 'min').replace(/^cirka /i, 'ca ').replace(/ i skolan och (\d+) hemma/, ' + $1 hemma'));
    const ofta = siffror(rest.join(' '))
      .replace(/^(\d+) (?:pass|gånger) i veckan och (?:ett|1) (andra|tredje|fjärde|femte) när det går\.?$/, (_, n, nasta) => `${n}–${NASTA[nasta]} pass/vecka`)
      .replace(/ (pass|gånger) i veckan\.?$/, ' pass/vecka').replace(/ dagar i veckan\.?$/, ' dagar/vecka').replace(/ samtal i veckan\.?$/, ' samtal/vecka').replace(/^(\d+(?:–\d+)?) pass i följd.*$/, '$1 pass');
    delar.push(ofta);
  } else if (d.tid) delar.push(siffror(d.tid).replace(/minuter/, 'min'));
  let period: string | undefined;
  if (d.period) {
    const veckor = siffror(d.period).match(/^(?:oftast )?(\d+(?:–\d+)?) veckor/i);
    period = veckor ? `${veckor[1]} veckor` : d.period;
  }
  return { delar, period };
}
export const taktKort = (d: Pick<MetodData, 'tid' | 'period'>): string => { const t = taktDelar(d); return [...t.delar, ...(t.period ? [t.period] : [])].join(' · '); };
