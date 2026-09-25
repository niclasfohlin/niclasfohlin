import type { APIRoute, GetStaticPaths } from 'astro';
import { publicerade } from '../../lib/innehall';
import { lathundPptx, PPTX_TYP } from '../../lib/metodpptx';
import { site } from '../../data/site';

// /stodundervisning/<id>-lathund.pptx: lathundens fyra sidor som fyra bilder i 16:9, kant till kant,
// byggda ur samma data som sidan och Word-filen (src/lib/metodpptx.ts). Filen finns för varje metod
// med lathund, utan något extra steg när en metod läggs upp.
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('stodundervisning');
  return metoder.filter((m) => m.data.lathund).map((m) => ({ params: { id: m.id }, props: { m } }));
};

export const GET: APIRoute = async ({ props }) => {
  const buffert = await lathundPptx(props.m, { bas: site.url });
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': PPTX_TYP } });
};
