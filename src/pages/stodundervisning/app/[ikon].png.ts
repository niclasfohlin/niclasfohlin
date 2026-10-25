import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { APPIKONER, appikonSvg, type Appikon } from '../../../lib/appikon';

// /stodundervisning/app/<ikon>.png: appen Stöds ikon i de storlekar som manifestet och iPhone läser (src/lib/appikon.ts),
// ritad ur svg:en vid varje bygge, så att ingen bild måste göras om för hand.
export const getStaticPaths: GetStaticPaths = () => Object.keys(APPIKONER).map((ikon) => ({ params: { ikon } }));

export const GET: APIRoute = async ({ params }) => {
  const { storlek, maskbar } = APPIKONER[params.ikon as Appikon];
  const bild = await sharp(Buffer.from(appikonSvg({ maskbar }))).resize(storlek, storlek).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(bild), { headers: { 'Content-Type': 'image/png' } });
};
