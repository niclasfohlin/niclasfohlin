// Verktyget Strategier (K-699, arbetsnamnet; underlag/prov/strategier/UPPDRAGET.md): strategierna ur metodriggen som sidor,
// /strategier med alla och /strategier/<id> för en, med berättelsen, förklaringen, stegen, förslagen och strategikortet att
// skriva ut. Strategierna står i src/content/strategier/, en per fil, och prövas med standardens strategiensFel; korten är
// pdf:er som scripts/strategier/kort.mjs gör med Chrome och som committas, med manifestet src/data/strategikort.json.
// Bygget stannar på en strategi som visas men vars kort saknas eller är äldre än strategin, som för strukturkorten.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CollectionEntry } from 'astro:content';
import { publicerade } from './innehall';
import { strategikortetsData, strategikortetsInnehall, strategikortetsFil, STRATEGIKORTEN_ALLA, STRATEGIBLADET, STRATEGIERNAS_FARG, STRATEGINS_OMRADEN, metodensStrategikort } from './standard/index.js';
import manifest from '../data/strategikort.json';

export type Strategi = CollectionEntry<'strategier'>;

/** Verktygets namn och adress, ett ställe tills Niclas har valt namnet. */
export const STRATEGIERNAS_NAMN = 'Strategier';
export const STRATEGIERNAS_ADRESS = '/strategier';
export const strategiensAdress = (id: string) => `/strategier/${id}`;
export const bildensAdress = (fil: string) => `/strategier/bilder/${fil}`;
export const ikonensAdress = (ikon: string) => `/strategier/ikoner/${ikon}.svg`;
export const kortetsAdress = (id: string) => `/strategier/kort/${strategikortetsFil(id)}`;
export const ALLA_KORTENS_ADRESS = `/strategier/kort/${STRATEGIKORTEN_ALLA.fil}`;
export const metodensKortAdress = (metod: string) => `/strategier/kort/${metodensStrategikort(metod).fil}`;

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

/** Bladet med alla strategier som visas, väggens mitt, ett liggande A4 (scripts/strategier/kort.mjs). */
export const BLADETS_ADRESS = `/strategier/kort/${STRATEGIBLADET.fil}`;
export const bladetFinns = () => Boolean(MANIFESTET[STRATEGIBLADET.nyckel]) && existsSync(publikt('strategier', 'kort', STRATEGIBLADET.fil));
