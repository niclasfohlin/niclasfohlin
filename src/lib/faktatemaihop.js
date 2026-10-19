// Databasens faktatexter i metodens bank (K-435): ett tema i src/content/faktateman/ har samma ramar, bilder och tabell
// som temat hade haft i metodens fil (schemat faktateman i src/content.config.ts), och här läggs temana efter metodens
// egna, i den ordning banken ska ha dem: nivå för nivå, och på en nivå efter textnumren. Sajten läser det genom
// src/lib/faktateman.ts, och skripten som läser metodens fil själva (scripts/sidlas.mjs, scripts/paritet.mjs) genom
// lasTeman nedan, så att alla ser samma bank. Inga Node-beroenden utom i lasTeman, som bara skripten anropar. Vanlig
// JavaScript, som standarden (src/lib/standard/REGLER.md), med typerna i faktatemaihop.d.ts.

/** Databasens namn: i dess filer (faktatexter-bas), som banken med temana får (bankfiler i src/lib/bank.ts). */
export const DATABAS = 'faktatexter';
const NIVAORDNING = ['Bas', 'Medel', 'Avancerat'];
const forstaNummer = (t) => Math.min(...t.ramar.map((r) => Number(r.rubrik.match(/, text (\d+)[,:]/)?.[1] ?? Infinity)));

/** Temana i bankens ordning: nivå för nivå, i metodens nivåers ordning, och på en nivå efter det första textnumret. */
export function ordnaTeman(teman, nivaer = NIVAORDNING) {
  const plats = (n) => { const i = nivaer.indexOf(n); return i < 0 ? nivaer.length : i; };
  return [...teman].sort((a, b) => plats(a.data.niva) - plats(b.data.niva) || forstaNummer(a.data) - forstaNummer(b.data));
}

/** Metodens data med temana efter metodens egna ramar, bilder På bordet och tabeller, och med databasens namn på ramarna
 *  (databas), så att banken får databasens egna filer och metodens filer står kvar med metodens poster. Stannar när ett
 *  tema har en ram eller en bild som metoden eller ett annat tema redan har. Utan teman kommer data tillbaka som den är. */
export function medTemana(d, teman) {
  if (!teman.length) return d;
  if (!d.ramar) throw new Error(`Databasens faktatexter: ${d.titel} har inga ramar att lägga temana till (src/content/faktateman/).`);
  const ordnade = ordnaTeman(teman, (d.nivaer ?? []).map((n) => n.namn).concat(NIVAORDNING));
  const rubriker = new Set(d.ramar.ramar.map((r) => r.rubrik));
  const nummer = new Set((d.pabordet ?? []).map((b) => b.nr));
  for (const t of ordnade) {
    for (const r of t.data.ramar) {
      if (rubriker.has(r.rubrik)) throw new Error(`Databasens faktatexter: ramen "${r.rubrik}" i temat ${t.data.tema} (src/content/faktateman/${t.id}.yaml) finns redan i ${d.titel} eller ett annat tema.`);
      rubriker.add(r.rubrik);
    }
    for (const b of t.data.pabordet ?? []) {
      if (nummer.has(b.nr)) throw new Error(`Databasens faktatexter: bilden ${b.nr} i temat ${t.data.tema} (src/content/faktateman/${t.id}.yaml) har ett nummer som ${d.titel} eller ett annat tema redan har.`);
      nummer.add(b.nr);
    }
  }
  return {
    ...d,
    ramar: { ...d.ramar, ramar: [...d.ramar.ramar, ...ordnade.flatMap((t) => t.data.ramar)], databas: DATABAS },
    pabordet: [...(d.pabordet ?? []), ...ordnade.flatMap((t) => t.data.pabordet ?? [])],
    tabeller: [...(d.tabeller ?? []), ...ordnade.flatMap((t) => t.data.tabeller ?? [])],
  };
}

/** Skriptens väg in: temana i en mapp (src/content/faktateman/), som { id, data } per fil, ur yaml-filerna. Filer som
 *  börjar med _ läses inte, som i sajtens samlingar. */
export async function lasTeman(mapp, parseYaml) {
  const { existsSync, readdirSync, readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  if (!existsSync(mapp)) return [];
  return readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => ({ id: f.slice(0, -5), data: parseYaml(readFileSync(join(mapp, f), 'utf8')) }));
}
