#!/usr/bin/env node
// Läsbilder till granskningen: metodprovets skärmbilder (scripts/metodprov.mjs --bilder skriver desktop-N.png och
// mobil-N.png, 6 000 px höga) delas i bitar som går att läsa en och en, 1 700 px höga på datorn och 2 600 px i
// telefonbredd, i underlag/prov/<id>/lasbilder/ och lasbilder-mobil/. Skrivkurserna 2026-10-10: granskaren fick annars
// inga bilder av sidan, och bitarna gjordes med ett skript i en tillfällig mapp. scripts/metodgranskning.mjs kör det här
// själv när bitarna saknas eller är äldre än skärmbilderna.
//
//   node scripts/lasbilder.mjs <id>
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Delar metodens skärmbilder i läsbitar och returnerar bitarnas sökvägar, datorn och telefonen för sig. */
export async function lasbilder(id) {
  const prov = join(rot, 'underlag', 'prov', id);
  const ut = { desktop: [], mobil: [] };
  for (const [slag, hojd, mappnamn] of [['desktop', 1700, 'lasbilder'], ['mobil', 2600, 'lasbilder-mobil']]) {
    const nr = (f) => Number(f.match(/-(\d+)\.png$/)?.[1] ?? 0);
    const kallor = existsSync(prov) ? readdirSync(prov).filter((f) => new RegExp(`^${slag}(-\\d+)?\\.png$`).test(f)).sort((a, b) => nr(a) - nr(b)) : [];
    const mapp = join(prov, mappnamn);
    rmSync(mapp, { recursive: true, force: true });
    if (!kallor.length) continue;
    mkdirSync(mapp, { recursive: true });
    let n = 0;
    // Varje skärmbild delas för sig, så att ingen bit behöver hela sidan i minnet; en bit går aldrig över två bilder.
    for (const f of kallor) {
      const bild = sharp(join(prov, f));
      const { width, height } = await bild.metadata();
      for (let top = 0; top < height; top += hojd) {
        const fil = join(mapp, `${slag}-${String(++n).padStart(2, '0')}.png`);
        await sharp(join(prov, f)).extract({ left: 0, top, width, height: Math.min(hojd, height - top) }).toFile(fil);
        ut[slag].push(fil);
      }
    }
  }
  return ut;
}

/** Är bitarna äldre än skärmbilderna, eller saknas de? */
export function lasbilderInaktuella(id) {
  const prov = join(rot, 'underlag', 'prov', id);
  if (!existsSync(prov)) return true;
  const tid = (f) => statSync(join(prov, f)).mtimeMs;
  const skarm = readdirSync(prov).filter((f) => /^(desktop|mobil)(-\d+)?\.png$/.test(f));
  if (!skarm.length) return false;
  const bitar = existsSync(join(prov, 'lasbilder')) ? readdirSync(join(prov, 'lasbilder')).map((f) => statSync(join(prov, 'lasbilder', f)).mtimeMs) : [];
  return !bitar.length || Math.min(...bitar) < Math.max(...skarm.map(tid));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const id = process.argv[2];
  if (!id) { console.error('Ange metodens id: node scripts/lasbilder.mjs <id>'); process.exit(1); }
  const ut = await lasbilder(id);
  if (!ut.desktop.length && !ut.mobil.length) { console.error(`Inga skärmbilder i underlag/prov/${id}. Kör node scripts/metodprov.mjs ${id} --bilder först.`); process.exit(1); }
  console.log(`Läsbilder: ${ut.desktop.length} bitar från datorn i underlag/prov/${id}/lasbilder/ och ${ut.mobil.length} i telefonbredd i lasbilder-mobil/.`);
}
