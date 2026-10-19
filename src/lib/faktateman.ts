// Databasens faktatexter (K-435; Niclas 2026-10-19: "det rimligen inte borde vara läggas till i metoden mer än att Fler
// faktatexter finns... Och att första omgången faktatexter blir som ett 'exempel' på hur man arbetar"). Ett tema är en
// fil i src/content/faktateman/, med samma ramar, bilder och tabell som temat hade haft i metodens fil (schemat
// faktateman i src/content.config.ts). medDatabasen lägger temana till metodens bank, efter metodens egna ramar
// (src/lib/faktatemaihop.js), så att banken (src/lib/bank.ts) ser dem som vilka teman som helst: Ta fram en faktatext,
// temats sida, textens sida, databasens egna nivåfiler (faktatexter-bas, bankfiler i src/lib/bank.ts) och utskrifter,
// handledningarna och delningskorten följer med av sig själva. Metodens sida, bankens filer där och Word-filerna med allt,
// metoden och planeringsmallarna läser metoden utan databasen, så att metoden och dess filer inte växer med den. Formen står i METODER.md under Ta fram ur en bank, raden Databasens faktatexter.
import { getCollection, type CollectionEntry } from 'astro:content';
import { medTemana } from './faktatemaihop.js';
import { bankAv, BANK_MINST } from './bank';

type Metod = CollectionEntry<'stodundervisning'>;

let allaTeman: Promise<CollectionEntry<'faktateman'>[]> | undefined;
const temana = () => (allaTeman ??= getCollection('faktateman'));

/** Databasens teman till en metod. */
export async function metodensTeman(id: string): Promise<CollectionEntry<'faktateman'>[]> {
  return (await temana()).filter((t) => t.data.metod === id);
}

const ihop = new WeakMap<Metod['data'], Metod['data']>();
/** Metoden med databasens teman i banken. En metod utan teman i databasen kommer tillbaka som den är. Bygget stannar när
 *  metodens egen bank är för liten (BANK_MINST): då skulle metodens sida och Ta fram tappa banken medan temanas sidor och
 *  filer fanns kvar (granskningen 2026-10-19). */
export async function medDatabasen<M extends { id: string; data: Metod['data'] }>(m: M): Promise<M> {
  const teman = await metodensTeman(m.id);
  if (!teman.length) return m;
  if (!bankAv(m.data)) throw new Error(`Databasens faktatexter: ${m.data.titel} har teman i src/content/faktateman/, men metodens egna texter är färre än ${BANK_MINST} eller saknar följesidor, så metoden har ingen bank att lägga temana till (src/lib/bank.ts).`);
  let data = ihop.get(m.data);
  if (!data) { data = medTemana(m.data, teman); ihop.set(m.data, data); }
  return { ...m, data };
}

/** Flera metoder med databasen, i samma ordning. Bygget stannar på ett tema vars metod inte är en publicerad metod: det
 *  skulle annars falla bort utan att någon såg det. */
export async function medDatabaserna<M extends { id: string; data: Metod['data'] }>(metoder: M[]): Promise<M[]> {
  const ids = new Set(metoder.map((m) => m.id));
  const borta = (await temana()).filter((t) => !ids.has(t.data.metod));
  if (borta.length) throw new Error(`Databasens faktatexter: ${borta.map((t) => `${t.id}.yaml har metoden ${t.data.metod}`).join(', ')}, som inte är en publicerad metod (src/content/faktateman/).`);
  return Promise.all(metoder.map(medDatabasen));
}
