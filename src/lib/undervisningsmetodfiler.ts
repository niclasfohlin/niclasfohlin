// En undervisningsmetods filer (K-621): dokumenten som metodriggen bygger ur metodens fil, Word och pdf, och bilderna av
// bladen, i public/metoder/ med fasta namn. scripts/metoderfiler.mjs tar in dem ur riggens out/<id>/ och prövar att de är
// byggda ur samma metodfil som sajten visar (filer.json). Sidan visar en knapp bara för en fil som finns.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type UmSlag = 'allt' | 'metoden' | 'lathund' | 'lektionskort' | 'planeringsmall' | 'observation' | 'materialet' | 'referensblad';
export interface UmFil { slag: UmSlag; namn: string; pdf?: string; docx?: string }

/** Filens namn på knappen och i statistiken. */
export const UM_NAMN: Record<UmSlag, string> = {
  allt: 'Allt, med bladen och materialet', metoden: 'Metoden, utan bladen', lathund: 'Lathunden Att komma igång', lektionskort: 'Lektionskortet', planeringsmall: 'Planeringsmallen',
  observation: 'Observationsmallen', materialet: 'Materialet för klassen', referensblad: 'Referensbladet',
};
export const UM_SLAG = Object.keys(UM_NAMN) as UmSlag[];

/** Filens stam i public/metoder/: <id> för filen med allt, annars <id>-<slag>. */
export const umStam = (id: string, slag: UmSlag) => (slag === 'allt' ? id : `${id}-${slag}`);

const MAPP = join(process.cwd(), 'public', 'metoder');

/** Metodens filer som finns, per slag. */
export function metodensFiler(id: string): Record<UmSlag, UmFil | undefined> {
  const ut = {} as Record<UmSlag, UmFil | undefined>;
  for (const slag of UM_SLAG) {
    const stam = umStam(id, slag);
    const pdf = existsSync(join(MAPP, `${stam}.pdf`)) ? `/metoder/${stam}.pdf` : undefined;
    const docx = existsSync(join(MAPP, `${stam}.docx`)) ? `/metoder/${stam}.docx` : undefined;
    ut[slag] = pdf || docx ? { slag, namn: UM_NAMN[slag], pdf, docx } : undefined;
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
