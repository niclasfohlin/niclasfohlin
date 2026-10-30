// En undervisningsmetods filer (K-621): dokumenten som metodriggen bygger ur metodens fil, Word och pdf, och bilderna av
// bladen, i public/metoder/ med fasta namn. scripts/metoderfiler.mjs tar in dem ur riggens out/<id>/ och prövar att de är
// byggda ur samma metodfil som sajten visar (filer.json). Sidan visar en knapp bara för en fil som finns. Filernas namn står
// i src/lib/undervisningsmetod.ts (UM_NAMN), där metodens saker också läser dem och som sidans skript kan läsa utan filerna.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { slugAv } from './standard/index.js';
import { UM_NAMN, UM_SLAG, umRad, umStam, type UmSlag } from './undervisningsmetod';

export type { UmSlag };
export interface UmFil { slag: UmSlag; namn: string; rad: string; pdf?: string; docx?: string }

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
 * Bladens egna pdf:er i Materialet för klassen, <id>-blad-<namn>.pdf, ett blad per sida i materialets pdf, i metodens
 * ordning (ramar.ramar). scripts/metoderfiler.mjs klipper ut dem ur materialets pdf, så att knappen under ett blad skriver
 * ut just det bladet (STIL.md under Hänvisningar: en bestämd sak har en knapp). Ett blad utan fil får ingen egen knapp.
 */
export const bladetsStam = (id: string, namn: string) => `${id}-blad-${slugAv(namn)}`;
export function metodensBlad(id: string, rubriker: string[]): { namn: string; pdf?: string }[] {
  return rubriker.map((namn) => { const stam = bladetsStam(id, namn); return { namn, ...(existsSync(join(MAPP, `${stam}.pdf`)) ? { pdf: `/metoder/${stam}.pdf` } : {}) }; });
}
