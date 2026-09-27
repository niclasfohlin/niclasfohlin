import type { APIRoute, GetStaticPaths } from 'astro';
import { publicerade } from '../../../lib/innehall';
import { lathundPptx, PPTX_TYP } from '../../../lib/metodpptx';
import { site } from '../../../data/site';

// Lathunden i A4 liggande, bara som förlaga till lathundens pdf: scripts/lathund-pdf.mjs bygger sajten med
// LATHUND_A4=1, låter PowerPoint spara filerna som pdf och tar bort dem ur dist. I ett vanligt bygge (Netlify,
// npm run validera) görs inga filer här, så de publiceras aldrig. PowerPoint-filen läsaren laddar ner är 16:9
// (src/pages/stodundervisning/[id]-lathund.pptx.ts); båda byggs ur samma layout i src/lib/metodpptx.ts.
export const getStaticPaths: GetStaticPaths = async () => {
  if (process.env.LATHUND_A4 !== '1') return [];
  const metoder = await publicerade('stodundervisning');
  return metoder.filter((m) => m.data.lathund).map((m) => ({ params: { id: m.id }, props: { m } }));
};

export const GET: APIRoute = async ({ props }) => {
  const buffert = await lathundPptx(props.m, { bas: site.url, format: 'A4' });
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': PPTX_TYP } });
};
