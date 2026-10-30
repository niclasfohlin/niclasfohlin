import type { APIRoute, GetStaticPaths } from 'astro';
import { publicerade } from '../../lib/innehall';
import { PPTX_TYP, undervisningsmetodensLathundPptx } from '../../lib/metodpptx';
import { site } from '../../data/site';

// /metoder/<id>-lathund.pptx (K-637): en undervisningsmetods filmer på en bild först och sedan lathundens fyra sidor som
// fyra bilder i 16:9, kant till kant, ur standardens lathundensSidor, samma som sidan /metoder/<id>/lathund visar
// (src/lib/metodpptx.ts, som också ritar Stödundervisnings lathund). Filen finns för varje metod med lathund.
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('undervisningsmetoder');
  return metoder.filter((m) => m.data.lathund).map((m) => ({ params: { id: m.id }, props: { m } }));
};

export const GET: APIRoute = async ({ props }) => {
  const buffert = await undervisningsmetodensLathundPptx(props.m, { bas: site.url });
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': PPTX_TYP } });
};
