// De små korten tidigt på metodens sida, och knappen överst (src/data/bladkort.json; Niclas 2026-11-07 om Strategikorten i
// Reciprok undervisning: "Skulle önska sådana där småkort för utskrift av strategierna tidigt där de tas upp. Klicka så kommer
// man till alla fyra att skriva ut", och "Analysera om de kan missas av en trött lärare"). Analysen: på telefonen stod bilderna
// på korten först på skärm 56 av 74 och knappen som skriver ut dem på skärm 59. Metodens egna texter ger namnen och raden, och
// minibilderna görs ur sakens egen sida (scripts/minibilder.mjs), så att inget skrivs för hand och inget glider isär från pdf:en.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import register from '../data/bladkort.json';
import stodregister from '../data/bladkort-stod.json';
import materialetsSidor from '../data/materialets-sidor.json';
import { MINIBILDEN, metodensMinibilder, sakensNamn, stodmetodensMinibilder } from './bladkortfiler.js';
import { sidansSaker } from './metodsaker';
import type { MetodData } from './metod';
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

/** Korten står direkt efter kärnan, när inledningens första stycke, som kärnan står efter, redan nämner saken. */
export const EFTER_KARNAN = -2;
/** Var korten står: efter det första stycket i inledningen som har ordet i stycket eller bladets namn. Kärnan ritas efter det
 *  första stycket, så nämner det saken står korten efter kärnan (EFTER_KARNAN; Tänkande klassrum efter omtaget 2026-11-15, där
 *  fyrfältaren förklaras i första stycket), och annars efter stycket efter kärnan som nämner den. */
export const bladkortensStycke = (id: string, d: Um): number => {
  const p = posten(id);
  if (!p) return -1;
  const ordet = (p.stycket ?? p.blad!).toLocaleLowerCase('sv');
  if (String((d.inledning ?? [])[0] ?? '').toLocaleLowerCase('sv').includes(ordet)) return EFTER_KARNAN;
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
  const bilder = metodensMinibilder(id, d, p, materialetsSidor) as { namn: string; fil: string }[];
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

// Stödundervisningens små kort (K-769), som i Metoder, ur ett eget register (src/data/bladkort-stod.json), eftersom Metoders
// register läses nyckel för nyckel som Metoders metoder. Sakens namn är ett blad, en mall eller en tabell i metoden, och
// adressen är den som texten på sidan leder till (sidansSaker i src/lib/metodsaker.ts), där knappen som skriver ut saken står.
type StodPost = { stycket: string; saker: Sak[] };
const stodposten = (id: string) => (stodregister as unknown as Record<string, StodPost | undefined>)[id];
const stodfel = (d: MetodData, vad: string) => new Error(`src/data/bladkort-stod.json: ${d.titel} ${vad}`);

/** Var korten står på en stödmetods sida: efter det första stycket i inledningen som har ordet i stycket. */
export function stodkortensStycke(id: string, d: MetodData): number {
  const p = stodposten(id);
  if (!p) return -1;
  const ordet = p.stycket.toLocaleLowerCase('sv');
  const i = d.inledning.findIndex((s) => s.toLocaleLowerCase('sv').includes(ordet));
  if (i < 0) throw stodfel(d, `nämner inte ${p.stycket} i inledningen, så de små korten har ingen plats.`);
  return i;
}

/** En stödmetods små kort: minibilden, namnet, raden ur metodens text och adressen. Bygget stannar när något saknas. */
export function stodmetodensBladkort(id: string, d: MetodData): Bladkort | null {
  const p = stodposten(id);
  if (!p) return null;
  if (!p.saker?.length || p.saker.length > 3) throw stodfel(d, `har ${p.saker?.length ?? 0} saker, och de små korten visar en till tre.`);
  const saker = sidansSaker(d, id);
  const bilder = stodmetodensMinibilder(id, p, (f: string) => existsSync(join(process.cwd(), f))) as { namn: string; fil: string }[];
  const kort = p.saker.map((s) => {
    const namn = sakensNamn(s);
    const sak = saker.find((x) => x.namn === namn);
    if (!sak) throw stodfel(d, `har inget blad, ingen mall och ingen tabell som heter ${namn}.`);
    const ram = (d.ramar?.ramar ?? []).find((r) => r.rubrik === namn);
    const mall = d.mallar.find((m) => m.rubrik === namn);
    const tabell = d.tabeller.find((t) => t.rubrik === namn);
    const text = ram?.text?.[0] ?? (mall as { text?: string } | undefined)?.text ?? tabell?.text;
    const rad = kortetsRad(d as unknown as Um, namn, text, typeof s === 'string' ? undefined : s.mening);
    const m = bilder.find((x) => x.namn === namn)!;
    if (!existsSync(join(process.cwd(), 'public', 'stodundervisning', m.fil))) throw stodfel(d, `saknar minibilden till ${namn}. Saken behöver en egen fil att skriva ut (src/lib/sakfiler.ts), och node scripts/minibilder.mjs gör bilden.`);
    return { namn, rad, adress: sak.adress, bild: { src: `/stodundervisning/${m.fil}`, bredd: MINIBILDEN.bredd, hojd: MINIBILDEN.hojd } };
  });
  const alla = d.ramar ? '#ramar' : d.mallar.length ? '#mallar' : kort[0].adress;
  return { namn: 'Att skriva ut', saker: true, etikett: 'Att skriva ut', alla: { text: 'Allt att skriva ut', adress: alla }, kort };
}
