import type { APIRoute, GetStaticPaths } from 'astro';
import { packaWord } from '../../lib/wordpaket';
import { publicerade } from '../../lib/innehall';
import { snabbmallDokument, DOCX_TYP } from '../../lib/metoddocx';
import { lasResurser, medReservbilder } from '../../lib/metodresurser';
import { site } from '../../data/site';

// /stodundervisning/<id>-snabbmall.docx: bara snabbmallen, för knappen Skriv ut bladet under bladet (K-487). Pdf:en gör
// scripts/bankpdf.mjs ur den, som en sida (bankfiler.json).
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('stodundervisning');
  return metoder.filter((m) => m.data.snabbmall).map((m) => ({ params: { id: m.id }, props: { m } }));
};

export const GET: APIRoute = async ({ props }) => {
  const resurser = lasResurser([props.m]);
  const buffert = await packaWord(await medReservbilder((png) => snabbmallDokument(props.m, { bas: site.url, resurser: { ...resurser, png } })), 'nodebuffer');
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
