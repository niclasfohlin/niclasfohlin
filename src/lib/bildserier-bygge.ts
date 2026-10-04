// Bildseriernas rutor vid bygget (src/lib/bildserier.ts säger vilka filerna är och var de står): scenerna ur
// src/data/bildserier/<metodens id>.json, ritade med metodriggens kod (src/lib/serieritning.js). Bara för bygget:
// sidan, utskriften och Word-filerna som byggs här får rutorna härifrån, och webbläsaren hämtar de färdiga filerna.
import * as SERIE from './serieritning.js';
import type { MetodPost } from './metod';
import { arkAdress, arSerieMall, mallAdress, mallEtiketter, serieAdress, type Serieantal } from './bildserier';

type Scen = { personer: Record<string, unknown>; serier: Record<string, { rutor: unknown[] }> };
const SCENER = import.meta.glob<Scen>('../data/bildserier/*.json', { eager: true, import: 'default' });
const scenfil = (id: string) => `src/data/bildserier/${id}.json`;
function scen(id: string): Scen {
  const s = SCENER[`../data/bildserier/${id}.json`];
  if (!s) throw new Error(`${id}: metoden visar bildserier men har ingen scenfil (${scenfil(id)}).`);
  return s;
}

// Antalet rutor i varje bildserie som ramarna visar. Bygget stannar om en serie saknas i scenfilen.
export function serieantal(post: MetodPost): Serieantal {
  const ut: Serieantal = {};
  for (const ram of post.data.ramar?.ramar ?? []) {
    if (!ram.serie) continue;
    const serie = scen(post.id).serier[ram.serie];
    if (!serie?.rutor?.length) throw new Error(`${post.id}: ramen ${ram.rubrik} visar bildserien "${ram.serie}", som inte finns i ${scenfil(post.id)}.`);
    ut[ram.serie] = serie.rutor.length;
  }
  return ut;
}

// Metodens filer, adressen och svg-filen, ritade en gång per bygge.
const ritade = new Map<string, Map<string, string>>();
export function serieFiler(post: MetodPost): Map<string, string> {
  const d = post.data;
  const nyckel = JSON.stringify([post.id, (d.ramar?.ramar ?? []).map((r) => [r.serie, r.ark]), d.mallar.filter(arSerieMall)]);
  const fardig = ritade.get(nyckel);
  if (fardig) return fardig;
  const ut = new Map<string, string>();
  serieantal(post);
  for (const ram of d.ramar?.ramar ?? []) {
    const serie = ram.serie;
    if (serie) (SERIE.serieRutor(scen(post.id), serie) as string[]).forEach((svg, i) => ut.set(serieAdress(post.id, serie, i + 1), svg));
    if (ram.ark === 'bubblor') ut.set(arkAdress(post.id, ram.ark), SERIE.bubbelark());
  }
  for (const m of d.mallar.filter(arSerieMall)) (SERIE.mallRutor(m.rutor, mallEtiketter(m)) as string[]).forEach((svg, i) => ut.set(mallAdress(post.id, m, i + 1), svg));
  ritade.set(nyckel, ut);
  return ut;
}

// En fil ur metodens filer, som bytes till Word-filen.
export function serieFil(post: MetodPost, adress: string): Uint8Array | undefined {
  const svg = serieFiler(post).get(adress);
  return svg === undefined ? undefined : new TextEncoder().encode(svg);
}
