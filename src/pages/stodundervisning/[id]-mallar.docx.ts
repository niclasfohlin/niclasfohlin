import type { APIRoute, GetStaticPaths } from 'astro';
import { Packer } from 'docx';
import { publicerade } from '../../lib/innehall';
import { mallDokument, DOCX_TYP } from '../../lib/metoddocx';
import { lasResurser, medReservbilder } from '../../lib/metodresurser';
import { site } from '../../data/site';

// /stodundervisning/<id>-mallar.docx: snabbmall, checklista och målkoll, en per sida.
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('stodundervisning');
  return metoder.map((m) => ({ params: { id: m.id }, props: { m } }));
};

export const GET: APIRoute = async ({ props }) => {
  const resurser = lasResurser([props.m]);
  const buffert = await Packer.toBuffer(await medReservbilder((png) => mallDokument(props.m, { bas: site.url, resurser: { ...resurser, png } })));
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
