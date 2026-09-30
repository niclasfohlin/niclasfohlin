// Bilderna och elevens typsnitt till Word-filerna vid bygget, lästa från public/ (src/lib/ljudkort.ts säger vilka), och
// varje bilds reservbild, ritad ur samma SVG (src/lib/reservbild.ts).
// Bara för bygget: i webbläsaren hämtas samma filer av sidan som bygger den samlade filen (src/pages/stodundervisning/index.astro).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { ELEVTYPSNITT_TTF, harElevtypsnitt, metodensBilder } from './ljudkort';
import type { MetodPost } from './metod';
import type { MetodResurser } from './metoddocx';
import { reservBredd, reservNyckel, samlaReservbilder } from './reservbild';

const PUBLIC = join(process.cwd(), 'public');
const las = (sokvag: string) => new Uint8Array(readFileSync(join(PUBLIC, sokvag.replace(/^\//, ''))));

export function lasResurser(poster: MetodPost[]): MetodResurser {
  const bilder = new Map<string, Uint8Array>();
  for (const p of poster) for (const b of metodensBilder(p.data, p.id)) if (!bilder.has(b)) bilder.set(b, las(b));
  return { bilder, elevtypsnitt: poster.some((p) => harElevtypsnitt(p.data)) ? las(ELEVTYPSNITT_TTF) : undefined };
}

// Ritaren läser inga typsnitt från datorn, bara Reservbild (scripts/reservtypsnitt.py), så att reservbilden blir
// likadan på Windows och på Netlify. Stillbildernas "IBM Plex Sans, Segoe UI, Arial, sans-serif" blir sans-serif.
const TYPSNITT = join(process.cwd(), 'src/data/typsnitt/Reservbild-Regular.ttf');
const FAMILJ = 'Reservbild';
// Filerna ska vara små (Niclas 2026-09-30: "lågt kb och fottryck", men "Får ju inte bli bara suddigt"). Bilderna är
// teckningar med få färger, så reservbilden sparas med en färgpalett och utan brusutjämning, i dubbla
// skärmupplösningen: med kvalitet 70 väljer libimagequant så få färger som varje bild tål, och tar fler där en bild
// behöver dem. Alla 276 bilder blev 897 KB mot 2 952 KB som vanlig PNG, och ingen skillnad syntes mot originalet
// (prövat 2026-09-30 på de tyngsta stillbilderna, bildkort och läskort; 16 färger var 831 KB men kan slå ihop färger i
// ett färgrikt bildkort).
const ritade = new Map<string, Promise<Uint8Array>>();
export function ritaReservbild(svg: Uint8Array, bredd: number): Promise<Uint8Array> {
  const nyckel = reservNyckel(svg, bredd);
  let png = ritade.get(nyckel);
  if (!png) {
    const bild = new Resvg(Buffer.from(svg), {
      fitTo: { mode: 'width', value: reservBredd(bredd) },
      font: { fontFiles: [TYPSNITT], loadSystemFonts: false, defaultFontFamily: FAMILJ, sansSerifFamily: FAMILJ, serifFamily: FAMILJ, monospaceFamily: FAMILJ },
    }).render();
    png = sharp(bild.pixels, { raw: { width: bild.width, height: bild.height, channels: 4 } })
      .png({ palette: true, quality: 70, dither: 0, effort: 10, compressionLevel: 9 })
      .toBuffer()
      .then((b) => new Uint8Array(b));
    ritade.set(nyckel, png);
  }
  return png;
}

// Bygger en Word-fil med reservbilderna: först en gång för att se vilka bilder den har, sedan med bildernas reservbilder,
// ritade ur samma SVG. Samma två steg som i webbläsaren (src/pages/stodundervisning/index.astro).
export async function medReservbilder<T>(bygg: (png: NonNullable<MetodResurser['png']>) => T): Promise<T> {
  const { behov, png } = samlaReservbilder();
  bygg(png);
  const klara = new Map(await Promise.all([...behov].map(async ([nyckel, b]) => [nyckel, await ritaReservbild(b.svg, b.bredd)] as const)));
  return bygg((svg, bredd) => klara.get(reservNyckel(svg, bredd)));
}
