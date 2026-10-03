import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';
import taggarData from '../data/taggar.json';
import publikationerData from '../data/publikationer.json';
import { arLektion, byggSerier, serieUppdaterad } from './serie';

// Utkast visas i utvecklingsläge men aldrig i produktionsbygget.
export async function publicerade<K extends CollectionKey>(samling: K): Promise<CollectionEntry<K>[]> {
  const alla = await getCollection(samling);
  return import.meta.env.PROD ? alla.filter((post) => !post.data.utkast) : alla;
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
