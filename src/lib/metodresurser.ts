// Bilderna och elevens typsnitt till Word-filerna vid bygget, lästa från public/ (src/lib/ljudkort.ts säger vilka), och
// varje bilds reservbild, ritad ur samma SVG (src/lib/reservbild.ts).
// Bara för bygget: i webbläsaren hämtas samma filer av sidan som bygger den samlade filen (src/pages/stodundervisning/index.astro).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { ELEVTYPSNITT_TTF, harElevtypsnitt, metodensBilder } from './ljudkort';
import { BOKTYPSNITT_TTF } from './ramform';
import { harBoktypsnitt, sagoBilder } from './sagoblad';
import type { MetodPost } from './metod';
import type { MetodResurser } from './metoddocx';
import { reservMatt, reservNyckel, samlaReservbilder } from './reservbild';

const PUBLIC = join(process.cwd(), 'public');
const las = (sokvag: string) => new Uint8Array(readFileSync(join(PUBLIC, sokvag.replace(/^\//, ''))));

export function lasResurser(poster: MetodPost[]): MetodResurser {
  const bilder = new Map<string, Uint8Array>();
  for (const p of poster) for (const b of [...metodensBilder(p.data, p.id), ...sagoBilder(p.data)]) if (!bilder.has(b)) bilder.set(b, las(b));
  return {
    bilder,
    elevtypsnitt: poster.some((p) => harElevtypsnitt(p.data)) ? las(ELEVTYPSNITT_TTF) : undefined,
    boktypsnitt: poster.some((p) => harBoktypsnitt(p.data)) ? { cinzel: las(BOKTYPSNITT_TTF.cinzel), dekor: las(BOKTYPSNITT_TTF.dekor) } : undefined,
  };
}

// Ritaren läser inga typsnitt från datorn, bara Reservbild (scripts/reservtypsnitt.py), så att reservbilden blir
// likadan på Windows och på Netlify. Stillbildernas "IBM Plex Sans, Segoe UI, Arial, sans-serif" blir sans-serif.
const TYPSNITT = join(process.cwd(), 'src/data/typsnitt/Reservbild-Regular.ttf');
const FAMILJ = 'Reservbild';
// Filerna ska vara små (Niclas 2026-09-30: "lågt kb och fottryck", men "Får ju inte bli bara suddigt"). Bilderna är
// teckningar med få färger, så reservbilden sparas med en färgpalett och utan brusutjämning, i dubbla
// skärmupplösningen: med kvalitet 70 väljer libimagequant så få färger som varje bild tål, och tar fler där en bild
// behöver dem. Mätt 2026-09-30: 276 bilder blev 897 KB mot 2 952 KB som vanlig PNG, och ingen skillnad syntes mot
// originalet (de tyngsta stillbilderna, bildkort och läskort; 16 färger var 831 KB men kan slå ihop färger i ett
// färgrikt bildkort). Bygget har 292 reservbilder, omkring 940 KB.
// Reservbilden får exakt rutans mått (reservMatt): SVG-bilden ritas så stor den ryms i rutan och läggs i mitten, med
// genomskinlig kant där proportionerna skiljer sig (ett bildkort som är 3 procent smalare än högt i en kvadratisk ruta,
// en läskortsrad där rutan avrundats till hela punkter). Ingen bild skalas om i efterhand, så inget blir suddigt.
const FONT = { fontFiles: [TYPSNITT], loadSystemFonts: false, defaultFontFamily: FAMILJ, sansSerifFamily: FAMILJ, serifFamily: FAMILJ, monospaceFamily: FAMILJ };
const ritade = new Map<string, Promise<Uint8Array>>();
export function ritaReservbild(svg: Uint8Array, bredd: number, hojd: number): Promise<Uint8Array> {
  const nyckel = reservNyckel(svg, bredd, hojd);
  let png = ritade.get(nyckel);
  if (!png) {
    const ruta = reservMatt(bredd, hojd);
    const egen = new Resvg(Buffer.from(svg), { font: FONT });
    const smalare = egen.width / egen.height < ruta.bredd / ruta.hojd;
    let bild = new Resvg(Buffer.from(svg), { fitTo: smalare ? { mode: 'height', value: ruta.hojd } : { mode: 'width', value: ruta.bredd }, font: FONT }).render();
    if (bild.width > ruta.bredd || bild.height > ruta.hojd) bild = new Resvg(Buffer.from(svg), { fitTo: smalare ? { mode: 'width', value: ruta.bredd } : { mode: 'height', value: ruta.hojd }, font: FONT }).render();
    const [vanster, ovan] = [Math.floor((ruta.bredd - bild.width) / 2), Math.floor((ruta.hojd - bild.height) / 2)];
    png = sharp(bild.pixels, { raw: { width: bild.width, height: bild.height, channels: 4 } })
      .extend({ left: vanster, right: ruta.bredd - bild.width - vanster, top: ovan, bottom: ruta.hojd - bild.height - ovan, background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
  const klara = new Map(await Promise.all([...behov].map(async ([nyckel, b]) => [nyckel, await ritaReservbild(b.svg, b.bredd, b.hojd)] as const)));
  return bygg((svg, bredd, hojd) => klara.get(reservNyckel(svg, bredd, hojd)));
}
