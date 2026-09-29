// Bilderna och elevens typsnitt till Word-filerna vid bygget, lästa från public/ (src/lib/ljudkort.ts säger vilka).
// Bara för bygget: i webbläsaren hämtas samma filer av sidan som bygger den samlade filen (src/pages/stodundervisning/index.astro).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ELEVTYPSNITT_TTF, harElevtypsnitt, metodensBilder } from './ljudkort';
import type { MetodPost } from './metod';
import type { MetodResurser } from './metoddocx';

const PUBLIC = join(process.cwd(), 'public');
const las = (sokvag: string) => new Uint8Array(readFileSync(join(PUBLIC, sokvag.replace(/^\//, ''))));

export function lasResurser(poster: MetodPost[]): MetodResurser {
  const bilder = new Map<string, Uint8Array>();
  for (const p of poster) for (const b of metodensBilder(p.data)) if (!bilder.has(b)) bilder.set(b, las(b));
  return { bilder, elevtypsnitt: poster.some((p) => harElevtypsnitt(p.data)) ? las(ELEVTYPSNITT_TTF) : undefined };
}
