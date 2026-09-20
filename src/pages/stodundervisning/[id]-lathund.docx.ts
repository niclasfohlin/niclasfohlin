import type { APIRoute, GetStaticPaths } from 'astro';
import { Packer } from 'docx';
import { publicerade } from '../../lib/innehall';
import { lathundDokument, DOCX_TYP } from '../../lib/metoddocx';
import { site } from '../../data/site';

// /stodundervisning/<id>-lathund.docx: lathundens fyra sidor i liggande A4.
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('stodundervisning');
  return metoder.filter((m) => m.data.lathund).map((m) => ({ params: { id: m.id }, props: { m } }));
};

export const GET: APIRoute = async ({ props }) => {
  const buffert = await Packer.toBuffer(lathundDokument(props.m, { bas: site.url }));
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
