// Lektionskortet (Niclas 2026-10-17): ett A4 att ha i handen när läraren leder en lektion som återkommer, med samma eller
// växlande innehåll. "Detta får bli en ny standard. När en metod har en lektion som återupprepas med samma eller växlande
// innehåll ska det finnas ett lektionskort i metoden. En metod kan ha flera Lektionskort. Men max 3 för en enskild metod.
// Över det är det inte en reproducerande lektion." Metodriggen gör pdf:en, och sajten visar den som en blå knapp bredvid
// Öppna lathunden, i nedladdningsrutan, i menyn och på metodens kort i metodbanken, och vid lektionen i texten ("Lektionskortet
// ska då finnas som blå knapp vid lektionen"). Word-filen har en rad med länken på samma plats i texten (metoddocx.ts). Har
// metoden fler än ett kort bär knappen lektionens namn, "Lektionskort: Ordpasset" (Niclas: "fler än 1 Lektionskort:
// lektionsnamn"). Platsen skrivs med extrafilmernas ord (src/lib/film.ts, tolkaEfter), och utan plats står knappen efter
// passets tabell. Modulen läser inga filer, eftersom webbläsaren bygger Word-filen med samma kod.
import { passar, tolkaEfter, type FilmPlats } from './film';

export const HOGST_LEKTIONSKORT = 3;
export const LEKTIONSKORT_PLATS = 'tidsschema';
// Det som följer på länken i mejlet om en ny metod med lektionskort (src/pages/nytt.json.ts).
export const LEKTIONSKORT_MEJL = 'ett A4 att ha i handen när du leder lektionen';

type Kortfalt = { lektionskort?: { namn?: string; efter?: string }[] };
export interface Lektionskort { lektionskort: true; metod: string; nr: number; namn?: string; knapp: string; fil: string; adress: string; vid?: FilmPlats }

/** Pdf:ens namn i public/stodundervisning/: <id>-lektionskort.pdf, och -2 och -3 när metoden har fler. */
export const lektionskortFil = (id: string, nr: number) => `${id}-lektionskort${nr > 1 ? `-${nr}` : ''}.pdf`;

/** Metodens lektionskort i fältets ordning, med knappens text och platsen i texten. */
export function metodensLektionskort(d: Kortfalt, id: string): Lektionskort[] {
  const lista = d.lektionskort ?? [];
  return lista.map((k, i) => ({
    lektionskort: true,
    metod: id,
    nr: i + 1,
    namn: k.namn,
    knapp: lista.length > 1 && k.namn ? `Lektionskort: ${k.namn}` : 'Lektionskort',
    fil: lektionskortFil(id, i + 1),
    adress: `/stodundervisning/${lektionskortFil(id, i + 1)}`,
    vid: tolkaEfter(k.efter ?? LEKTIONSKORT_PLATS),
  }));
}

/** Korten vars knapp står på platsen i texten. */
export const lektionskortVid = (kort: Lektionskort[], plats: FilmPlats) => kort.filter((k) => k.vid && passar(k.vid, plats));

/** Länkens attribut: pdf:en öppnas i en ny flik, där läraren skriver ut den eller sparar den, och trycket räknas som en
 *  utskrift i statistiken, som de centrala sakernas pdf:er (DRIFT.md under Besöksstatistik). */
export function lektionskortLank(k: Lektionskort, titel: string): Record<string, string> {
  return { href: k.adress, target: '_blank', rel: 'noopener', 'data-goatcounter-click': `utskrift:${k.metod}/lektionskort${k.nr > 1 ? `-${k.nr}` : ''}`, 'data-goatcounter-title': `${titel}: ${k.knapp} som pdf` };
}

/** Fältets fel, som stoppar bygget (src/content.config.ts): fler än ett kort kräver lektionens namn på varje. */
export function lektionskortFel(d: Kortfalt): string | undefined {
  const lista = d.lektionskort ?? [];
  if (lista.length > 1 && lista.some((k) => !k.namn?.trim())) return 'Med fler än ett lektionskort behöver varje kort lektionens namn i namn, som knappen bär ("Lektionskort: Ordpasset").';
  return undefined;
}
