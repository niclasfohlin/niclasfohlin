// Filernas version i länkarna (Niclas 2026-09-30: sidan visade ny text men Word-filen var gårdagens, ur webbläsarens
// minne). Sidan, Word-filerna, PowerPoint, pdf och filmerna byggs ur samma källa vid samma bygge, men filerna får ligga
// ett dygn i läsarens webbläsare (netlify.toml), så att Facebooks hämtare inte laddar ner dem om och om igen. Därför bär
// varje länk från en sida till en fil under /stodundervisning/ filens kontrollsumma, ?v=<åtta tecken>: ändras filen,
// byter länken adress, och webbläsaren kan aldrig ge en äldre fil än sidan. En direktlänk utan version får fortfarande
// ligga ett dygn.
//
// Körs av Astro när bygget är klart (astro.config.mjs), över alla byggda sidor, så att en ny länk får versionen utan
// att någon skriver den. scripts/paritet.mjs prövar efteråt att ingen länk saknar version.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Länkar, bilder, filmernas <object data> och knapparnas adresser (Drive, filmen) till filer under /stodundervisning/,
// också zip-filen med metodens filmer, filmerna som mp4 och spelarens småbilder.
export const FILLANK = /\b(href|src|data-drive-src|data-film|data-stillbild|data)="(\/stodundervisning\/[^"?#\s]+\.(?:docx|pptx|pdf|svg|zip|mp4|webp))"/g;

export function htmlFiler(mapp) {
  const ut = [];
  for (const namn of readdirSync(mapp)) {
    const p = join(mapp, namn);
    if (statSync(p).isDirectory()) ut.push(...htmlFiler(p));
    else if (namn.endsWith('.html')) ut.push(p);
  }
  return ut;
}

export function sattVersioner(dist) {
  const summor = new Map();
  const version = (adress) => {
    if (!summor.has(adress)) {
      const fil = join(dist, decodeURIComponent(adress));
      summor.set(adress, existsSync(fil) ? createHash('sha256').update(readFileSync(fil)).digest('hex').slice(0, 8) : '');
    }
    return summor.get(adress);
  };
  let lankar = 0;
  for (const fil of htmlFiler(dist)) {
    const html = readFileSync(fil, 'utf8');
    const ny = html.replace(FILLANK, (hel, attribut, adress) => {
      const v = version(adress);
      if (!v) return hel;
      lankar++;
      return `${attribut}="${adress}?v=${v}"`;
    });
    if (ny !== html) writeFileSync(fil, ny);
  }
  return { lankar, filer: [...summor.values()].filter(Boolean).length };
}

export default function filversion() {
  return {
    name: 'filversion',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const dist = dir.pathname.replace(/^\/([A-Za-z]:)/, '$1');
        const { lankar, filer } = sattVersioner(decodeURIComponent(dist));
        logger.info(`${lankar} länkar till ${filer} filer under /stodundervisning/ bär filens version.`);
      },
    },
  };
}
