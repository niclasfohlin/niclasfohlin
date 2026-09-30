// Filmerna ur metodriggen (fältet film, Niclas 2026-09-30): en film per lektion, som är lektionens lathund, och en film
// om en del av en metod, som ljudstarten i Ljudlek i grupp. Filerna ligger i public/stodundervisning/ och hittas genom
// metodens id, som <id>-mallar.docx och <id>-lathund.pdf: <id>-film.svg är filmen, 960 × 540, och <id>-film-1.svg …
// -4.svg stillbilderna, 960 × 500. Filmen är en svg med CSS-animation som loopar; den visas som <img>, eftersom dess
// CSS har globala regler (g, korta id och @keyframes) som skulle gälla hela sidan om svg-filen stod i sidans HTML.
// Paus (WCAG 2.2.2) byter filmen mot stillbild 1, som riggen föreslår som affisch. Med minskad rörelse står filmen
// still av sig själv. Samma modul används av sidan (Film.astro), Word-filerna (metoddocx.ts) och bilderna till Word
// (ljudkort.ts, metodensBilder). Inga Node-beroenden.
import type { MetodData } from './metod';

export type Film = NonNullable<MetodData['film']>;

export const filmAdress = (id: string) => `/stodundervisning/${id}-film.svg`;
export const stillbildAdress = (id: string, nr: number) => `/stodundervisning/${id}-film-${nr}.svg`;
export const stillbilder = (id: string) => [1, 2, 3, 4].map((nr) => stillbildAdress(id, nr));

// Filmens mått, för sidans img och Word-filens bilder.
export const FILM_MATT = { bredd: 960, hojd: 540 };
export const STILLBILD_MATT = { bredd: 960, hojd: 500 };

// En film utan titel visar hela lektionen och är dess lathund: den står efter faktarutan, innan texten börjar. En film
// med titel visar en del av metoden och står på sidan efter inledningens stycke efterStycke, eller efter hela inledningen.
// I Word står stillbilderna alltid efter faktatabellen, före inledningen, på första sidan (metoddocx.ts, metodBarn).
export const arLektionsfilm = (film: Film) => !film.titel;
export const filmEfterStycke = (film: Film, antalStycken: number) => Math.min(film.efterStycke ?? antalStycken, antalStycken);
