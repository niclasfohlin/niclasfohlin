// En undervisningsmetods filer (K-621): dokumenten som metodriggen bygger ur metodens fil, Word och pdf, och bilderna av
// bladen, i public/metoder/ med fasta namn. scripts/metoderfiler.mjs tar in dem ur riggens out/<id>/ och prövar att de är
// byggda ur samma metodfil som sajten visar (filer.json). Sidan visar en knapp bara för en fil som finns. Filernas namn står
// i src/lib/undervisningsmetod.ts (UM_NAMN), där metodens saker också läser dem och som sidans skript kan läsa utan filerna.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { liten, slugAv } from './standard/index.js';
import { UM_NAMN, UM_SLAG, umRad, umStam, type Um, type UmSlag } from './undervisningsmetod';
import { parse } from 'yaml';
import { bankAv, enhetAdress } from './bank';
import { metodensCentrala } from './centrala';
import { medTemana } from './faktatemaihop.js';

const bankerna = new Map<string, ReturnType<typeof bankAv>>();
/** Banken i en metod i Stödundervisning, med databasens teman som textsidorna (medDatabasen), läst direkt ur filerna eftersom
 *  sakerna räknas utan samlingarna: faktatexterna i temana hade annars fallit bort (Codex 2026-11-07). */
function metodensBank(metod: string) {
  const fil = join(process.cwd(), 'src', 'content', 'stodundervisning', `${metod}.yaml`);
  if (!existsSync(fil)) return null;
  const mapp = join(process.cwd(), 'src', 'content', 'faktateman');
  const teman = existsSync(mapp) ? readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => ({ id: f.replace(/\.yaml$/, ''), data: parse(readFileSync(join(mapp, f), 'utf8')) })).filter((t) => t.data.metod === metod) : [];
  return bankAv(medTemana(parse(readFileSync(fil, 'utf8')), teman));
}
/**
 * Bankens texter som metoden pekar ut, ur metoderna vars bank den visar med fältet centrala: titeln med sitt nummer, som
 * Tackfisken (20) och Skrapet på dörren (Mellan, text 2), och titeln i en tabellcell bredvid nivån, som Någon har varit här
 * med Mellan, text 15 i Reciprok undervisning (STIL.md under Hänvisningar, raden En sak i metoden). Bara titeln räcker inte:
 * bankernas titlar är också vanliga ord, som Lappen, Skolan och Nästan, och "Nästan alla kan" är ingen text. En titel med
 * flera ord länkas också utan numret.
 */
function bankensTexter(d: Um): { namn: string; former: string[]; adress: string }[] {
  const text = JSON.stringify(d);
  const ut: { namn: string; former: string[]; adress: string }[] = [];
  for (const c of metodensCentrala(d)) {
    if (!c.metod) continue;
    if (!bankerna.has(c.metod)) bankerna.set(c.metod, metodensBank(c.metod));
    for (const e of bankerna.get(c.metod)?.enheter ?? []) {
      const titel = e.l.titel;
      if (!titel || e.nr === undefined) continue;
      const former = [`${titel} (${e.nr})`, `${titel} (${e.l.niva}, text ${e.nr})`].filter((f) => text.includes(f));
      const iCell = text.includes(`"${titel}","${e.l.niva}, text ${e.nr}"`);
      if (former.length || iCell) ut.push({ namn: titel, former: [...former, ...(titel.includes(' ') ? [titel] : [])], adress: enhetAdress(c.metod, e) });
    }
  }
  return ut;
}

export type { UmSlag };
export interface UmFil { slag: UmSlag | 'tabell'; namn: string; rad: string; pdf?: string; docx?: string }

const MAPP = join(process.cwd(), 'public', 'metoder');

/** Metodens filer som finns, per slag, med filens namn och raden i Ladda ner och skriv ut. */
export function metodensFiler(id: string): Record<UmSlag, UmFil | undefined> {
  const ut = {} as Record<UmSlag, UmFil | undefined>;
  for (const slag of UM_SLAG) {
    const stam = umStam(id, slag);
    const pdf = existsSync(join(MAPP, `${stam}.pdf`)) ? `/metoder/${stam}.pdf` : undefined;
    const docx = existsSync(join(MAPP, `${stam}.docx`)) ? `/metoder/${stam}.docx` : undefined;
    ut[slag] = pdf || docx ? { slag, namn: UM_NAMN[slag], rad: umRad(slag), pdf, docx } : undefined;
  }
  return ut;
}

export interface UmBild { src: string; bredd: number; hojd: number }

/** Bilderna av bladens sidor, <id>-<slag>-<n>.png, i ordning, med måtten ur filens huvud så att sidan inte hoppar. */
export function metodensBilder(id: string): Record<string, UmBild[]> {
  const ut: Record<string, UmBild[]> = {};
  if (!existsSync(MAPP)) return ut;
  for (const f of readdirSync(MAPP)) {
    const m = f.match(new RegExp(`^${id}-([a-z]+)-(\\d+)\\.png$`));
    if (!m) continue;
    const huvud = readFileSync(join(MAPP, f)).subarray(16, 24);
    (ut[m[1]] ??= [])[Number(m[2]) - 1] = { src: `/metoder/${f}`, bredd: huvud.readUInt32BE(0), hojd: huvud.readUInt32BE(4) };
  }
  return ut;
}

/**
 * Bladens egna pdf:er i Materialet för klassen, <id>-blad-<namn>.pdf, ett blad per sida i materialets pdf (ett enda blad kan ha flera sidor), i metodens
 * ordning (ramar.ramar). scripts/metoderfiler.mjs klipper ut dem ur materialets pdf, så att knappen under ett blad skriver
 * ut just det bladet (STIL.md under Hänvisningar: en bestämd sak har en knapp). Ett blad utan fil får ingen egen knapp.
 */
export const bladetsStam = (id: string, namn: string) => `${id}-blad-${slugAv(namn)}`;
export function metodensBlad(id: string, rubriker: string[]): { namn: string; pdf?: string }[] {
  return rubriker.map((namn) => { const stam = bladetsStam(id, namn); return { namn, ...(existsSync(join(MAPP, `${stam}.pdf`)) ? { pdf: `/metoder/${stam}.pdf` } : {}) }; });
}

/**
 * En fri tabell med egen fil, som Grovplaneringen i Testbaserat lärande, en mall att skriva i Word eller Google (K-684;
 * Niclas till riggen 2026-11-02: "Då vill man ju ofta mest ha en bra mall för drive eller docx"). Filen heter
 * <id>-tabell-<rubrik>, som tabellernas filer i Stödundervisning, och riggen lämnar den i filer.json med slag tabell
 * (scripts/metoderfiler.mjs). Tabellen får knappen under sig och en rad i Ladda ner och skriv ut, och den är en sak.
 */
export const tabellensStam = (id: string, rubrik: string) => `${id}-tabell-${slugAv(rubrik)}`;
export function metodensTabellfiler(id: string, rubriker: string[]): UmFil[] {
  return rubriker.flatMap((rubrik) => {
    const stam = tabellensStam(id, rubrik);
    const pdf = existsSync(join(MAPP, `${stam}.pdf`)) ? `/metoder/${stam}.pdf` : undefined;
    const docx = existsSync(join(MAPP, `${stam}.docx`)) ? `/metoder/${stam}.docx` : undefined;
    return pdf || docx ? [{ slag: 'tabell' as const, namn: rubrik, rad: `Bara ${liten(rubrik)}`, pdf, docx }] : [];
  });
}

/**
 * Det metodens saker behöver veta om filerna (undervisningsmetodensSaker): om lektionskortet finns, och vilka fria tabeller
 * som har en egen fil. En rot för metodens sida, lathunden och Lär dig metoden, så att samma ord leder till samma sak.
 */
export const sakernasFiler = (id: string, d: Um) => ({
  banktexter: bankensTexter(d),
  lektionskort: !!metodensFiler(id).lektionskort,
  tabeller: metodensTabellfiler(id, ((d.tabeller ?? []) as { rubrik: string }[]).map((t) => t.rubrik)).map((f) => f.namn),
});
