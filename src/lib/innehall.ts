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
import { allaTexter, kortetsMalFel, varianternasFel } from './standard/index.js';
import type { SamlingNyckel } from './samlingar';

// Utkast visas i utvecklingsläge men aldrig i produktionsbygget. Databasens matteproblem har inget utkastläge.
// En metods text, som också står i dess Word-filer och lathund, säger inte hur många poster en databas har: ett fast
// antal stoppar bygget (src/lib/antal.ts, METODER.md under Antalen och databaserna, K-450). En hänvisning till Fohlin som
// inte leder till en bok, och ett verktyg som inte finns, stoppar det också, i metodens fil och i dess lektionskort
// (src/lib/boklankar.ts, STIL.md under Hänvisningar, K-460).
// Undervisningsmetoderna skrivs av metodriggen och står som utkast tills Niclas har sagt ja. Ett bygge för en testsida hos
// Netlify (scripts/utkast.mjs, som aldrig är produktionen) tar med dem med METODER_UTKAST=1, så att proven och testsidan
// har metoden (K-629). Netlifys bygge av main sätter aldrig flaggan.
const metodernasUtkast = (samling: string) => samling === 'undervisningsmetoder' && process.env.METODER_UTKAST === '1';
export async function publicerade<K extends CollectionKey>(samling: K): Promise<CollectionEntry<K>[]> {
  const alla = await getCollection(samling);
  const synliga = import.meta.env.PROD && !metodernasUtkast(samling) ? alla.filter((post) => !('utkast' in post.data && post.data.utkast)) : alla;
  if (samling === 'stodundervisning') for (const m of synliga as CollectionEntry<'stodundervisning'>[]) provaAntal(m);
  if (samling === 'stodundervisning' || samling === 'undervisningsmetoder') await provaHanvisade(synliga as CollectionEntry<'stodundervisning' | 'undervisningsmetoder'>[]);
  return synliga;
}

// Hör ihop med (relaterade, metoder i Stödundervisning) och valkartans metoder (passar.metoder, metoder under Metoder) pekar
// på poster som finns. Ett okänt id stoppar bygget, så att en länk aldrig försvinner utan att någon ser det (Niclas 2026-10-31:
// "Det skulle funnits någon spärr eller test som hittat det jag frågar om"). Ett utkast finns: sidorna visar det inte, och
// länken kommer av sig själv när utkastet publiceras. Prövas en gång per bygge, som provaAntal.
const hanvisningarnaProvade = new WeakSet<object>();
async function provaHanvisade(poster: CollectionEntry<'stodundervisning' | 'undervisningsmetoder'>[]) {
  const nya = poster.filter((p) => !hanvisningarnaProvade.has(p.data));
  if (!nya.length) return;
  const finns = async (samling: 'stodundervisning' | 'undervisningsmetoder') => new Set((await getCollection(samling)).map((p) => p.id));
  const [stod, metoder] = await Promise.all([finns('stodundervisning'), finns('undervisningsmetoder')]);
  const fel = nya.flatMap((p) => {
    const d = p.data as { relaterade?: string[]; passar?: { metoder?: string[] } };
    return [
      ...(d.relaterade ?? []).filter((id) => !stod.has(id)).map((id) => `${p.filePath ?? p.id}: relaterade nämner ${id}, som inte är en metod i src/content/stodundervisning/.`),
      ...(d.passar?.metoder ?? []).filter((id) => !metoder.has(id)).map((id) => `${p.filePath ?? p.id}: passar.metoder nämner ${id}, som inte är en metod i src/content/undervisningsmetoder/.`),
    ];
  });
  if (fel.length) throw new Error(`${fel.length} okända id i Hör ihop med och valkartan:\n  ${fel.join('\n  ')}\nRätta id:t eller ta bort det.`);
  for (const p of nya) hanvisningarnaProvade.add(p.data);
}

// En metod prövas en gång per bygge, och i utvecklingsläget igen när filen har ändrats (nytt data).
const provade = new WeakSet<object>();
function provaAntal(m: CollectionEntry<'stodundervisning'>) {
  if (provade.has(m.data)) return;
  const kort = [...lasLektionskort(metodensLektionskort(m.data, m.id))];
  const lankar = [...hanvisningarnasFel(m.data), ...kort.flatMap(([stam, papper]) => hanvisningarnasFel(papper, `src/data/lektionskort/${stam}.json`))];
  if (lankar.length) throw new Error(`${m.data.titel}: ${lankar.length} hänvisningar kan inte bli länkar:\n  ${lankar.join('\n  ')}\nReglerna står i STIL.md under Hänvisningar.`);
  // Ett lektionskort säger passets tider för vissa veckor med tidsschemats variant och standardens mening, så att kortet
  // är 1–1 med metoden (K-515, varianternasFel i standarden).
  // Kortets mål är metodens övergripande mål, ordagrant (K-522, kortetsMalFel i standarden).
  const varianter = kort.flatMap(([stam, papper]) => [...varianternasFel(m.data, allaTexter(papper), { var: `Lektionskortet src/data/lektionskort/${stam}.json` }), ...kortetsMalFel(m.data, allaTexter(papper), `Lektionskortet src/data/lektionskort/${stam}.json`)]);
  if (varianter.length) throw new Error(`${m.data.titel}:\n  ${varianter.join('\n  ')}\nReglerna står i METODER.md under Tidsschemats varianter.`);
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

export async function undervisningsmetoderSorterade() {
  const poster = await publicerade('undervisningsmetoder');
  return poster.sort((a, b) => a.data.titel.localeCompare(b.data.titel, 'sv'));
}

/**
 * Varje samlings publicerade poster i sin ordning, för sidorna som räknar upp allt, som taggarnas sidor och statistiken: en
 * nyckel per samling i roten (src/lib/samlingar.ts). En ny samling i roten som saknas här stannar astro check.
 */
export async function samlingarnasPoster(): Promise<{ [K in SamlingNyckel]: CollectionEntry<K>[] }> {
  const [stodundervisning, undervisningsmetoder, artiklar, bocker] = await Promise.all([metoderSorterade(), undervisningsmetoderSorterade(), artiklarSorterade(), bockerSorterade()]);
  return { stodundervisning, undervisningsmetoder, artiklar, bocker };
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

// Etiketten på en text: Replik och Slutreplik är debatter med en egen etikett (fältet replik i src/content.config.ts), och
// i filtret på /artiklar hör de till Debatt.
export function textEtikett(data: { typ: string; replik?: { slag: 'replik' | 'slutreplik' } }): string {
  if (data.replik) return data.replik.slag === 'replik' ? 'Replik' : 'Slutreplik';
  return typLabel(data.typ);
}

// Etiketten i bestämd form, för raden om vad en replik svarar på: "som svarade på krönikan …".
const bestamdForm: Record<string, string> = { Krönika: 'krönikan', Debatt: 'debattartikeln', Replik: 'repliken', Slutreplik: 'slutrepliken', Artikel: 'artikeln', Intervju: 'intervjun', Poddavsnitt: 'poddavsnittet', Text: 'texten' };
export function textEtikettBestamd(data: Parameters<typeof textEtikett>[0]): string {
  const e = textEtikett(data);
  return bestamdForm[e] ?? e.toLowerCase();
}

export function formateraDatum(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}
