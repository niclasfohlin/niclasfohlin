// De små korten tidigt på metodens sida, och knappen överst (src/data/bladkort.json; Niclas 2026-11-07 om Strategikorten i
// Reciprok undervisning: "Skulle önska sådana där småkort för utskrift av strategierna tidigt där de tas upp. Klicka så kommer
// man till alla fyra att skriva ut", och "Analysera om de kan missas av en trött lärare"). Analysen: på telefonen stod bilderna
// på korten först på skärm 56 av 74 och knappen som skriver ut dem på skärm 59. Metodens egna texter ger namnen och raden, och
// minibilderna görs ur sakens egen sida (scripts/minibilder.mjs), så att inget skrivs för hand och inget glider isär från pdf:en.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import register from '../data/bladkort.json';
import { MINIBILDEN, metodensMinibilder, sakensNamn } from './bladkortfiler.js';
import { meningarna, slugAv, talText } from './standard/index.js';
import { bladetsAnkare, type Um } from './undervisningsmetod';

type Sak = string | { namn: string; mening: string };
type Knapp = string | { namn: string; till: string };
type Post = { blad?: string; knapp?: Knapp; tabell?: string; framsidor?: number[]; perSida?: number; stycket?: string; saker?: Sak[] };
type Bild = { src: string; bredd: number; hojd: number };
export type Bladkort = { namn: string; saker: boolean; etikett: string; alla: { text: string; adress: string }; kort: { namn: string; rad: string; bild: Bild; adress: string }[] };

const posten = (id: string) => (register as unknown as Record<string, Post | undefined>)[id];
const fel = (d: Um, vad: string) => new Error(`src/data/bladkort.json: ${d.titel} ${vad}`);

/** Knappen överst på metodens sida, som leder till bladet eller till en tabell i metoden. */
export function bladetsKnapp(id: string, d: Um): { namn: string; adress: string } | null {
  const k = posten(id)?.knapp;
  if (!k) return null;
  if (typeof k === 'string') return { namn: k, adress: `#${bladetsAnkare(posten(id)!.blad!)}` };
  if (!((d.tabeller ?? []) as { rubrik: string }[]).some((t) => t.rubrik === k.till)) throw fel(d, `har ingen tabell ${k.till}, som knappen ${k.namn} leder till.`);
  return { namn: k.namn, adress: `#${slugAv(k.till)}` };
}

/** Var korten står: efter det första stycket i inledningen, efter det som kärnan har ritat, som har ordet i stycket eller bladets namn. */
export const bladkortensStycke = (id: string, d: Um): number => {
  const p = posten(id);
  if (!p) return -1;
  const ordet = (p.stycket ?? p.blad!).toLocaleLowerCase('sv');
  const i = ((d.inledning ?? []) as string[]).slice(1).findIndex((s) => s.toLocaleLowerCase('sv').includes(ordet));
  if (i < 0) throw fel(d, `nämner inte ${ordet} i inledningen, så de små korten har ingen plats.`);
  return i;
};

/** Meningen i metodens text som står på kortet: den första, eller den som börjar med registrets ord. */
function kortetsRad(d: Um, namn: string, text: string | undefined, borjan?: string) {
  const m: string[] = meningarna(text ?? '');
  const rad = borjan ? m.find((x) => x.startsWith(borjan)) : m[0];
  if (!rad) throw fel(d, `har ingen mening ${borjan ? `som börjar med ${borjan} ` : ''}om ${namn}.`);
  // Namnet står strax ovanför, så ett inledande "Grovplaneringen är terminens plan" blir "Terminens plan".
  const namnet = `${namn} är `;
  return rad.startsWith(namnet) ? `${rad[namnet.length].toLocaleUpperCase('sv')}${rad.slice(namnet.length + 1)}` : rad;
}

/** Saken i registrets lista: raden ur metodens egen text och platsen på sidan där den står med knappen som skriver ut den. */
function saken(d: Um, s: Sak): { rad: string; adress: string } {
  const namn = sakensNamn(s);
  const borjan = typeof s === 'string' ? undefined : s.mening;
  const ram = ((d.ramar?.ramar ?? []) as { rubrik: string; text?: string[] }[]).find((r) => r.rubrik === namn);
  if (ram) return { rad: kortetsRad(d, namn, ram.text?.[0], borjan), adress: `#${bladetsAnkare(namn)}` };
  if (namn === 'Strukturkorten') return { rad: kortetsRad(d, namn, (d.strukturkort as { text?: string } | undefined)?.text, borjan), adress: '#strukturkorten' };
  if (namn === 'Strategikorten' || namn === 'Strategibladet') return { rad: kortetsRad(d, namn, (d.strategikort as { text?: string } | undefined)?.text, borjan), adress: '#strategierna' };
  const t = ((d.tabeller ?? []) as { rubrik: string; text?: string }[]).find((x) => x.rubrik === namn);
  if (t) return { rad: kortetsRad(d, namn, t.text, borjan), adress: `#${slugAv(namn)}` };
  throw fel(d, `har inget blad, kort eller mall som heter ${namn}.`);
}

/** Korten: minibilden, namnet och raden. Bygget stannar när något saknas, och scripts/minibilder.mjs gör bilderna före bygget. */
export function metodensBladkort(id: string, d: Um): Bladkort | null {
  const p = posten(id);
  if (!p) return null;
  const bilder = metodensMinibilder(id, d, p) as { namn: string; fil: string }[];
  const bilden = (namn: string): Bild => {
    const m = bilder.find((x) => x.namn === namn);
    if (!m || !existsSync(join(process.cwd(), 'public', 'metoder', m.fil))) throw fel(d, `saknar minibilden till ${namn}. Kör node scripts/minibilder.mjs.`);
    return { src: `/metoder/${m.fil}`, bredd: MINIBILDEN.bredd, hojd: MINIBILDEN.hojd };
  };
  if (p.blad) {
    const tabell = ((d.tabeller ?? []) as { rubrik: string; rader: string[][] }[]).find((t) => t.rubrik === p.tabell);
    if (!tabell) throw fel(d, `har ingen tabell ${p.tabell}.`);
    if (tabell.rader.length !== p.framsidor!.length * p.perSida!) throw fel(d, `har ${tabell.rader.length} rader i ${p.tabell} och ${p.framsidor!.length * p.perSida!} kort i ${p.blad}.`);
    const ankare = `#${bladetsAnkare(p.blad)}`;
    const kort = tabell.rader.map((r) => ({ namn: r[0], rad: r[1], bild: bilden(r[0]), adress: ankare }));
    return { namn: p.blad, saker: false, etikett: `${p.blad} att skriva ut`, alla: { text: `Alla ${talText(kort.length)} att skriva ut`, adress: ankare }, kort };
  }
  return { namn: 'Att skriva ut', saker: true, etikett: 'Att skriva ut', alla: { text: 'Allt att skriva ut', adress: '#del-att-skriva-ut' }, kort: (p.saker ?? []).map((s) => ({ namn: sakensNamn(s), ...saken(d, s), bild: bilden(sakensNamn(s)) })) };
}
