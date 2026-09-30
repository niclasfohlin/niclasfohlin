import type { APIRoute, GetStaticPaths } from 'astro';
import { metoderSorterade } from '../../../lib/innehall';
import { metodDokument } from '../../../lib/metoddocx';
import { lasResurser, ritaReservbild } from '../../../lib/metodresurser';
import { samlaReservbilder } from '../../../lib/reservbild';
import { byggSerier, serieKoppling } from '../../../lib/serie';
import { site } from '../../../data/site';

// /stodundervisning/reservbild/<nyckel>.png: reservbilden till en bild i Word-filerna (src/lib/reservbild.ts), för filen
// som webbläsaren bygger när läsaren väljer flera metoder. Bygget går igenom varje publicerad metod, lektionerna också,
// med samma data som metoder.json, bygger dess Word-fil en gång för att se vilka bilder den har och ritar varje bilds
// reservbild ur samma SVG, med samma ritare som Word-filerna som byggs här. Läsaren hämtar dem bara när hen bygger en fil.
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await metoderSorterade();
  const serier = byggSerier(metoder);
  const alla = new Map<string, { svg: Uint8Array; bredd: number; hojd: number }>();
  for (const m of metoder) {
    const post = { ...m, serie: serieKoppling(m.id, m.data, serier) };
    const { behov, png } = samlaReservbilder();
    metodDokument([post], { bas: site.url, medMallar: true, resurser: { ...lasResurser([post]), png } });
    for (const [nyckel, bild] of behov) alla.set(nyckel, bild);
  }
  return [...alla].map(([nyckel, bild]) => ({ params: { nyckel }, props: bild }));
};

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await ritaReservbild(props.svg as Uint8Array, props.bredd as number, props.hojd as number)), { headers: { 'Content-Type': 'image/png' } });
