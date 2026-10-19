// Metodkortets ruta i fast form (K-465; Niclas 2026-10-19: "Skulle vilja ha en bättre standard på dessa för alla ... att
// det står tydligt och lika", och "sådant funkar inte riktigt i en databas som växer. Behöver tydlighet"). Varje ruta
// läses ur faktarutans fält med standardens tolkning (faktaIFastForm i src/lib/standard/) och skrivs lika för alla
// metoder, i siffror och samma enheter: årskursen som spann (F–3, 4–9), gruppen i elever, passet i minuter, hur ofta i
// pass i veckan, perioden i veckor, och om metoden kan göras i klass. Faktarutan på metodens sida och i Word-filen står
// kvar i metodens egna ord. Ett fält som inte går att läsa stoppar bygget (faktaFel), så att en ny metod får samma ruta.
import type { MetodData } from './metod';
import { faktaIFastForm } from './standard/index.js';
import { arskursSpannet, spannText } from './tackning';
import { kanGorasIKlass } from './upplagg';

export function kortFakta(d: MetodData): { rubrik: string; text: string }[] {
  const f = faktaIFastForm(d);
  return [
    { rubrik: 'Årskurs', text: spannText(arskursSpannet(d)) },
    { rubrik: 'Grupp', text: f.grupp ?? '' },
    { rubrik: 'Pass', text: f.pass ?? '' },
    { rubrik: 'Hur ofta', text: f.ofta ?? '' },
    { rubrik: 'Period', text: f.period ?? '' },
    { rubrik: 'Klass eller grupp', text: kanGorasIKlass(d) ? 'Kan göras i klass' : 'Bara i grupp' },
  ].filter((x) => x.text);
}

/** Faktarutans fält som inte går att läsa i fast form. */
export function faktaFel(d: { grupp?: string; tid?: string; period?: string }): string[] {
  const f = faktaIFastForm(d);
  const fel: string[] = [];
  if (d.grupp && !f.grupp) fel.push(`Faktarutans grupp, "${d.grupp}", går inte att läsa som antal elever. Skriv den som "Två till åtta elever".`);
  if (d.tid && (!f.pass || !f.ofta)) fel.push(`Faktarutans tid, "${d.tid}", går inte att läsa som passets längd och hur ofta. Skriv den som "30 minuter per pass, tre pass i veckan".`);
  if (d.period && !f.period) fel.push(`Faktarutans period, "${d.period}", går inte att läsa i veckor. Skriv den som "Sex till åtta veckor".`);
  return fel;
}
