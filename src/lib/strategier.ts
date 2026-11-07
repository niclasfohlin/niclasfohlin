// Verktyget Strategier (K-699; underlag/prov/strategier/UPPDRAGET.md): strategierna ur metodriggen som sidor,
// /strategier med alla och /strategier/<id> för en, med berättelsen, förklaringen, stegen, förslagen och strategikortet att
// skriva ut. Strategierna står i src/content/strategier/, en per fil, och prövas med standardens strategiensFel; korten är
// pdf:er som scripts/strategier/kort.mjs gör med Chrome och som committas, med manifestet src/data/strategikort.json.
// Bygget stannar på en strategi som visas men vars kort saknas eller är äldre än strategin, som för strukturkorten.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { CollectionEntry } from 'astro:content';
import { publicerade } from './innehall';
import { strategikortetsData, strategikortetsInnehall, strategikortetsFil, STRATEGIKORTEN_ALLA, STRATEGIBLADET, STRATEGIERNAS_FARG, STRATEGINS_OMRADEN, metodensStrategikort } from './standard/index.js';
import manifest from '../data/strategikort.json';
import sadden from '../data/strategier-i-metoder.json';

export type Strategi = CollectionEntry<'strategier'>;

/**
 * Verktygets namn och adress (Niclas 2026-11-03: "De kan kallas strategier. Men i sådden och texter kallad för
 * kognitionsvetenskapliga strategier och strategier för lärande").
 */
export const STRATEGIERNAS_NAMN = 'Strategier';
export const STRATEGIERNAS_ADRESS = '/strategier';
export const strategiensAdress = (id: string) => `/strategier/${id}`;
export const bildensAdress = (fil: string) => `/strategier/bilder/${fil}`;
export const ikonensAdress = (ikon: string) => `/strategier/ikoner/${ikon}.svg`;
export const kortetsAdress = (id: string) => `/strategier/kort/${strategikortetsFil(id)}`;
export const ALLA_KORTENS_ADRESS = `/strategier/kort/${STRATEGIKORTEN_ALLA.fil}`;
export const metodensKortAdress = (metod: string) => `/strategier/kort/${metodensStrategikort(metod).fil}`;

/**
 * Meningen under berättelsens bilder på strategins sida, som förklarar kapseln uppe till vänster i varje bild (riggens
 * informationsgrafik 2026-11-03): cirkeln är hur det går för eleven just då och staplarna hur väl eleven kan det. Riggens
 * förslag, ett ställe för alla strategier.
 */
export const BILDERNAS_FORKLARING = 'Cirkeln visar hur det går, och staplarna hur väl eleven kan det.';

/** Strategiernas färg som css-variabler, för style på sidan och korten, ur standarden som kortet. */
export const strategiernasStil = `--slag: ${STRATEGIERNAS_FARG.farg}; --slag-ljus: ${STRATEGIERNAS_FARG.ljus}; --slag-mork: ${STRATEGIERNAS_FARG.mork}`;

/** Förslagens områden med namnet och färgen, i sidans ordning. */
export const OMRADENA: Record<keyof typeof STRATEGINS_OMRADEN, { namn: string; farg: string }> = {
  lasning: { namn: STRATEGINS_OMRADEN.lasning, farg: 'var(--farg-lasning)' },
  skrivning: { namn: STRATEGINS_OMRADEN.skrivning, farg: 'var(--farg-skrivning)' },
  matematik: { namn: STRATEGINS_OMRADEN.matematik, farg: 'var(--farg-accent)' },
  amnen: { namn: STRATEGINS_OMRADEN.amnen, farg: 'var(--farg-amnen)' },
};

type Manifest = Record<string, { innehall?: string; kb: number; kort?: string[] }>;
const MANIFESTET = manifest as Manifest;
const publikt = (...d: string[]) => join(process.cwd(), 'public', ...d);

/** Bildernas och ikonernas filer för ett kort, som text, i samma ordning som scripts/strategier/kort.mjs läser dem. */
function kortetsFiler(s: Strategi['data']): string[] {
  const d = strategikortetsData(s);
  const las = (f: string) => (existsSync(f) ? readFileSync(f, 'utf8') : '');
  return [...d.berattelsen.map((b) => (b.fil ? las(publikt('strategier', 'bilder', b.fil)) : '')), ...d.handling.map((h) => las(publikt('strategier', 'ikoner', `${h.ikon}.svg`)))];
}

let provat = false;
// Korten är pdf:er som görs i förväg: ett kort som saknas eller är äldre än strategin stoppar bygget, så att kortet aldrig
// visar något annat än sidan. Ett utkasts kort ligger utanför sajten och prövas inte här.
function provaKorten(alla: Strategi[]) {
  if (provat) return;
  const fel: string[] = [];
  const visas = alla.filter((s) => !s.data.utkast);
  for (const s of visas) {
    const m = MANIFESTET[s.id];
    if (!m) fel.push(`${s.data.namn}: kortet saknas i src/data/strategikort.json`);
    else if (m.innehall !== strategikortetsInnehall(s.data, kortetsFiler(s.data))) fel.push(`${s.data.namn}: kortet är äldre än strategin, en bild eller en ikon`);
    if (!existsSync(publikt('strategier', 'kort', strategikortetsFil(s.id)))) fel.push(`${s.data.namn}: public/strategier/kort/${strategikortetsFil(s.id)} saknas`);
  }
  const allas = MANIFESTET[STRATEGIKORTEN_ALLA.nyckel]?.kort ?? [];
  if (visas.length && [...allas].sort().join() !== visas.map((s) => s.id).sort().join()) fel.push('Filen med alla kort har inte samma strategier som sidan');
  if (fel.length) throw new Error(`Strategikorten:\n  ${fel.join('\n  ')}\nGör om dem med node scripts/strategier/kort.mjs --vid-behov (npm run validera gör det).`);
  provat = true;
}

/** Strategierna som visas, efter numret. Ett utkast visas bara lokalt, som andra utkast. */
export async function strategierna(): Promise<Strategi[]> {
  const alla = (await publicerade('strategier')).sort((a, b) => a.data.nr - b.data.nr);
  provaKorten(alla);
  return alla;
}

/** Har strategin ett kort på sajten? Ett utkasts kort görs i underlag/prov/strategier/kort/ och har ingen adress. */
export const kortetFinns = (s: Strategi) => !s.data.utkast && existsSync(publikt('strategier', 'kort', strategikortetsFil(s.id)));

/** Metoden som verktyget hör till, i Metoder, som brödsmulorna leder till när den är publicerad. */
export const strategiernasMetod = async () => (await publicerade('undervisningsmetoder')).find((m) => m.id === 'larande-pa-kognitionsvetenskaplig-grund');

/** Storleken på filen med alla kort, som "800 kB" eller "1,2 MB", och antalet kort i den. */
export function allaKortensStorlek(): string {
  const kb = MANIFESTET[STRATEGIKORTEN_ALLA.nyckel]?.kb ?? 0;
  return kb >= 1000 ? `${(kb / 1024).toFixed(1).replace('.', ',')} MB` : `${kb} kB`;
}
export const allaKortensAntal = () => (MANIFESTET[STRATEGIKORTEN_ALLA.nyckel]?.kort ?? []).length;

/**
 * Strategierna som en metod i Metoder visar: metodens eget fält strategikort, eller sajtens sådd i
 * src/data/strategier-i-metoder.json, som väver in dem utan att metodens fil ändras (K-702; Niclas 2026-11-03).
 */
type Strategikortet = { text: string; strategier: string[] };
export function strategikortetI(id: string, d: object): Strategikortet | undefined {
  const iRegistret = (sadden as unknown as Record<string, Strategikortet | undefined>)[id];
  return (d as { strategikort?: Strategikortet }).strategikort ?? (iRegistret?.strategier?.length ? iRegistret : undefined);
}

/** Platserna i en metod i Metoder där strategiernas små kort vävs in (sajtens register, K-702), med samma form som sådden i
 *  Stödundervisning: efter, delar, slag och om. */
export const strategiernasPlatser = (id: string): { efter: string; delar: string[]; slag?: 'form' | 'forslag'; om?: string }[] =>
  (sadden as unknown as Record<string, { platser?: { efter: string; delar: string[]; slag?: 'form' | 'forslag'; om?: string }[] } | undefined>)[id]?.platser ?? [];

/** En strategi som en metod visar: det metodens avsnitt och dess små kort behöver. */
export type ImporteradStrategi = { id: string; nr: number; namn: string; mening: string; bilder: (string | null)[] };
/**
 * Strategierna som en metod i Metoder visar med fältet strategikort, i metodens ordning, ur verktygets filer i
 * src/content/strategier/, som strukturerna med fältet strukturkort (src/lib/strukturer.ts, strukturernaAv). Läses direkt ur
 * filerna, så att metodens sida och saker kan läsa dem utan samlingen. En strategi som inte finns eller är utkast stoppar
 * bygget, så att metoden aldrig leder till ett kort som saknas.
 */
export function strategiernaAv(ids: string[], vem: string): ImporteradStrategi[] {
  return ids.map((id) => {
    const fil = join(process.cwd(), 'src', 'content', 'strategier', `${id}.json`);
    if (!existsSync(fil)) throw new Error(`${vem} nämner ${id}, som inte är en strategi i src/content/strategier/.`);
    const x = JSON.parse(readFileSync(fil, 'utf8'));
    if (x.utkast) throw new Error(`${vem} nämner ${x.namn}, som är utkast i verktyget Strategier.`);
    return { id, nr: x.nr, namn: x.namn, mening: x.framsida.mening, bilder: (x.framsida.bild?.steg ?? []).map((b: { fil?: string }) => (b.fil ? bildensAdress(b.fil) : null)) };
  });
}
/** Metodens strategikort finns och har metodens strategier i metodens ordning; annars stannar bygget, som för strukturkorten. */
export function provaMetodensStrategikort(metod: string, ids: string[]) {
  const m = MANIFESTET[metodensStrategikort(metod).nyckel];
  if (!m || !existsSync(publikt('strategier', 'kort', metodensStrategikort(metod).fil)) || (m.kort ?? []).join() !== ids.join()) throw new Error(`${metod}: strategikorten i public/strategier/kort/${metodensStrategikort(metod).fil} saknas eller har andra strategier än metodens fält strategikort. Gör om dem med node scripts/strategier/kort.mjs --vid-behov (npm run validera gör det).`);
}

/**
 * Adressen med filens version, som scripts/filversion.mjs sätter på sidornas länkar (filens sha256, åtta tecken), för en
 * adress som inte står i sidans html, som Lär dig metodens knappar; samma som för strukturkorten (src/lib/strukturer.ts).
 */
const versioner = new Map<string, string>();
export const kortensVersion = (adress: string) => {
  if (!versioner.has(adress)) {
    const fil = join(process.cwd(), 'public', adress);
    versioner.set(adress, existsSync(fil) ? `${adress}?v=${createHash('sha256').update(readFileSync(fil)).digest('hex').slice(0, 8)}` : adress);
  }
  return versioner.get(adress)!;
};

/** Bladet med alla strategier som visas, väggens mitt, ett liggande A4 (scripts/strategier/kort.mjs). */
export const BLADETS_ADRESS = `/strategier/kort/${STRATEGIBLADET.fil}`;
export const bladetFinns = () => Boolean(MANIFESTET[STRATEGIBLADET.nyckel]) && existsSync(publikt('strategier', 'kort', STRATEGIBLADET.fil));
