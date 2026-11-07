// De små korten ur ett blad i metoden, och knappen överst (src/data/bladkort.json; Niclas 2026-11-07 om Strategikorten i
// Reciprok undervisning: "Skulle önska sådana där småkort för utskrift av strategierna tidigt där de tas upp. Klicka så kommer
// man till alla fyra att skriva ut", och "Analysera om de kan missas av en trött lärare"). Analysen: på telefonen stod bilderna
// på korten först på skärm 56 av 74 och knappen som skriver ut dem på skärm 59. Metodens egen tabell ger namnen och raden, och
// materialets sidbilder ger bilden, så att inget skrivs för hand och inget glider isär från pdf:en.
import register from '../data/bladkort.json';
import { talText } from './standard/index.js';
import { bladetsAnkare, type Um } from './undervisningsmetod';

type Post = { blad: string; knapp: string; tabell: string; framsidor: number[]; perSida: number };
type Bild = { src: string; bredd: number; hojd: number };
export type Bladkort = { blad: string; ankare: string; etikett: string; alla: string; kort: { namn: string; rad: string; bild: Bild; del: number }[] };

const posten = (id: string) => (register as unknown as Record<string, Post | undefined>)[id];

/** Knappen överst på metodens sida, som leder till bladet. */
export function bladetsKnapp(id: string): { namn: string; adress: string } | null {
  const p = posten(id);
  return p ? { namn: p.knapp, adress: `#${bladetsAnkare(p.blad)}` } : null;
}

/** Var korten står: efter inledningens första stycke som nämner bladet, efter det första som kärnan har ritat. */
export const bladkortensStycke = (id: string, d: Um): number => {
  const p = posten(id);
  if (!p) return -1;
  const i = ((d.inledning ?? []) as string[]).slice(1).findIndex((s) => s.includes(p.blad));
  if (i < 0) throw new Error(`src/data/bladkort.json: ${d.titel} nämner inte ${p.blad} i inledningen, så de små korten har ingen plats.`);
  return i;
};

/** De små korten: tabellens rader i ordning, med varsin halva av framsidornas sidbilder. Bygget stannar när något saknas. */
export function metodensBladkort(id: string, d: Um, bilder: Bild[] = []): Bladkort | null {
  const p = posten(id);
  if (!p) return null;
  const tabell = ((d.tabeller ?? []) as { rubrik: string; rader: string[][] }[]).find((t) => t.rubrik === p.tabell);
  if (!tabell) throw new Error(`src/data/bladkort.json: ${d.titel} har ingen tabell ${p.tabell}.`);
  if (tabell.rader.length !== p.framsidor.length * p.perSida) throw new Error(`src/data/bladkort.json: ${p.tabell} i ${d.titel} har ${tabell.rader.length} rader och ${p.blad} ${p.framsidor.length * p.perSida} kort.`);
  const kort = tabell.rader.map((r, i) => {
    const sida = p.framsidor[Math.floor(i / p.perSida)];
    const bild = bilder[sida - 1];
    if (!bild) throw new Error(`src/data/bladkort.json: ${d.titel} har ingen bild av sidan ${sida} i materialet.`);
    return { namn: r[0], rad: r[1], bild, del: i % p.perSida };
  });
  return { blad: p.blad, ankare: bladetsAnkare(p.blad), etikett: `${p.blad} att skriva ut`, alla: `Alla ${talText(kort.length)} att skriva ut`, kort };
}
