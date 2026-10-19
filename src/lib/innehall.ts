import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';
import taggarData from '../data/taggar.json';
import publikationerData from '../data/publikationer.json';
import { arLektion, byggSerier, serieUppdaterad } from './serie';
import { bankAv } from './bank';
import { matteproblemen, type Matteproblem } from './matteproblem';
import { metodensFastaAntal } from './antal';
import { hanvisningsFel } from './boklankar';
import { metodensLektionskort } from './lektionskort';
import { lasLektionskort } from './lektionskortdata';

// Utkast visas i utvecklingsläge men aldrig i produktionsbygget. Databasens matteproblem har inget utkastläge.
// En metods text, som också står i dess Word-filer och lathund, säger inte hur många poster en databas har: ett fast
// antal stoppar bygget (src/lib/antal.ts, METODER.md under Antalen och databaserna, K-450). En hänvisning till Fohlin som
// inte leder till en bok, och ett verktyg som inte finns, stoppar det också, i metodens fil och i dess lektionskort
// (src/lib/boklankar.ts, STIL.md under Hänvisningar, K-460).
export async function publicerade<K extends CollectionKey>(samling: K): Promise<CollectionEntry<K>[]> {
  const alla = await getCollection(samling);
  const synliga = import.meta.env.PROD ? alla.filter((post) => !('utkast' in post.data && post.data.utkast)) : alla;
  if (samling === 'stodundervisning') for (const m of synliga as CollectionEntry<'stodundervisning'>[]) provaAntal(m);
  return synliga;
}

// En metod prövas en gång per bygge, och i utvecklingsläget igen när filen har ändrats (nytt data).
const provade = new WeakSet<object>();
function provaAntal(m: CollectionEntry<'stodundervisning'>) {
  if (provade.has(m.data)) return;
  const lankar = [...hanvisningarnasFel(m.data), ...[...lasLektionskort(metodensLektionskort(m.data, m.id))].flatMap(([stam, papper]) => hanvisningarnasFel(papper, `src/data/lektionskort/${stam}.json`))];
  if (lankar.length) throw new Error(`${m.data.titel}: ${lankar.length} hänvisningar kan inte bli länkar:\n  ${lankar.join('\n  ')}\nReglerna står i STIL.md under Hänvisningar.`);
  const fel = metodensFastaAntal(m);
  if (fel.length) throw new Error(`${m.data.titel}: ${fel.length} fasta antal av databasens poster, som slutar stämma när databasen växer och skulle göra om Word-filerna, pdf:erna och lathunden varje gång:\n  ${fel.join('\n  ')}\nSkriv utan antal och säg var posterna finns (METODER.md under Antalen och databaserna). Är talet en del av metoden och inte databasens storlek, skriv frasen med sitt skäl i src/data/fasta-antal.json.`);
  provade.add(m.data);
}

// Hänvisningarnas fel i varje text i metodens fil, med fältets väg.
function hanvisningarnasFel(x: unknown, vag = ''): string[] {
  if (typeof x === 'string') return hanvisningsFel(x).map((f) => `${vag}: ${f}`);
  if (Array.isArray(x)) return x.flatMap((y, i) => hanvisningarnasFel(y, `${vag}.${i}`));
  if (x && typeof x === 'object' && !(x instanceof Date)) return Object.entries(x).flatMap(([k, v]) => hanvisningarnasFel(v, vag ? `${vag}.${k}` : k));
  return [];
}

// Ta fram ett matteproblems alla problem (src/lib/matteproblem.ts): metoden vars bank är problem, med databasens poster i
// src/content/matteproblem/ efter metodens på varje nivå. undefined när ingen publicerad metod har en bank med problem.
export async function matteproblemenPaSidan(): Promise<{ metod: CollectionEntry<'stodundervisning'>; alla: Matteproblem[] } | undefined> {
  const metod = (await publicerade('stodundervisning')).find((m) => bankAv(m.data)?.ord.slug === 'problem');
  if (!metod) return undefined;
  return { metod, alla: matteproblemen(metod, (await getCollection('matteproblem')).map((e) => ({ id: e.id, data: e.data }))) };
}

export async function artiklarSorterade() {
  const poster = await publicerade('artiklar');
  return poster.sort((a, b) => b.data.datum.getTime() - a.data.datum.getTime());
}

export async function metoderSorterade() {
  const poster = await publicerade('stodundervisning');
  return poster.sort((a, b) => a.data.titel.localeCompare(b.data.titel, 'sv'));
}

// De senast tillagda eller ändrade metoderna först (fältet uppdaterad), för startsidan. En lektion står i sin serie och
// inte som eget kort, och seriens datum är det senaste i serien, så att en ny lektion lyfter serien (src/lib/serie.ts).
export async function metoderSenaste() {
  const poster = await publicerade('stodundervisning');
  const serier = byggSerier(poster);
  const tid = (m: (typeof poster)[number]) => (serier.has(m.id) ? serieUppdaterad(serier.get(m.id)!, poster) : m.data.uppdaterad?.getTime() ?? 0);
  // Samma datum: den som kom ut senast först (publicerad), så att en ny metod inte skyms när många ändras samma dag.
  const ut = (m: (typeof poster)[number]) => m.data.publicerad?.getTime() ?? 0;
  return poster.filter((m) => !arLektion(m.data)).sort((a, b) => tid(b) - tid(a) || ut(b) - ut(a) || a.data.titel.localeCompare(b.data.titel, 'sv'));
}

// Serierna bland de publicerade metoderna. Stoppar bygget när en lektion pekar på en serie eller förmåga som inte finns.
export async function metodSerier() {
  return byggSerier(await publicerade('stodundervisning'));
}

export async function bockerSorterade() {
  const poster = await publicerade('bocker');
  return poster.sort((a, b) => b.data.utgivningsar - a.data.utgivningsar);
}

const taggMap = new Map(taggarData.taggar.map((t) => [t.id, t]));
const publikationMap = new Map(publikationerData.publikationer.map((p) => [p.id, p]));

export function taggLabel(id: string): string {
  return taggMap.get(id)?.label ?? id;
}

export function taggInfo(id: string) {
  return taggMap.get(id);
}

export function allaTaggar() {
  return taggarData.taggar;
}

export function publikationNamn(id: string): string {
  return publikationMap.get(id)?.namn ?? id;
}

export function publikationInfo(id: string) {
  return publikationMap.get(id);
}

// Etiketten läsaren ser för en artikels typ.
const typEtiketter: Record<string, string> = { kronika: 'Krönika', debatt: 'Debatt', artikel: 'Artikel', intervju: 'Intervju', podd: 'Poddavsnitt', annat: 'Text' };
export function typLabel(typ: string): string {
  return typEtiketter[typ] ?? typ;
}

export function formateraDatum(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}
