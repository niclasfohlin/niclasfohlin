// Bilderna På bordet ur metodriggen (De fyra räknesätten i grupp, metodriggens TILL-SAJTEN 2026-10-04): det som ligger
// framför lärarens händer när hen har visat, en bild för materialet och en för varje vecka. Riggen ritar bilderna ur
// metodens scener, och sajten tar de färdiga svg-filerna, som filmerna: <id>-pabordet-<nr>.svg i public/stodundervisning/,
// 960 × 540. Varje bild står där fältet efter säger, med samma platser som extrafilmerna (src/lib/film.ts): på sidan och
// i utskriften med rubriken och bildtexten (Filmruta.astro), och i Word i satsens bredd med en reservbild (metoddocx.ts).
// Efter en del i en ram med lektioner (en vecka) står bilden direkt under delen, och i Word på samma sida.
import type { MetodData } from './metod';
import { passar, tolkaEfter, type FilmPlats } from './film';

export type PaBordetFalt = MetodData['pabordet'][number];
export interface PaBordet { bild: PaBordetFalt; adress: string; vid?: FilmPlats }
export const PABORDET_MATT = { bredd: 960, hojd: 540 };

/** Metodens bilder På bordet, i fältets ordning. */
export const metodensPaBordet = (d: MetodData, id: string): PaBordet[] =>
  (d.pabordet ?? []).map((b) => ({ bild: b, adress: `/stodundervisning/${id}-pabordet-${b.nr}.svg`, vid: tolkaEfter(b.efter) }));
/** Bilderna som står på platsen. */
export const paBordetVid = (bilder: PaBordet[], plats: FilmPlats) => bilder.filter((b) => b.vid && passar(b.vid, plats));
/** Bilden står efter en del i en ram (en vecka): utan egen rubrik, med "På bordet." först i bildtexten. */
export const iDel = (b: PaBordet) => !!b.vid && 'del' in b.vid;
