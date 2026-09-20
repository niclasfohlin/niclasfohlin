import type { APIRoute, GetStaticPaths } from 'astro';
import { Packer } from 'docx';
import { publicerade } from '../../lib/innehall';
import { metodDokument, DOCX_TYP } from '../../lib/metoddocx';
import { site } from '../../data/site';

// /stodundervisning/<id>.docx: hela metoden som Word-fil, byggd vid bygget ur samma data som sidan.
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('stodundervisning');
  return metoder.map((m) => ({ params: { id: m.id }, props: { m } }));
};

export const GET: APIRoute = async ({ props }) => {
  const buffert = await Packer.toBuffer(metodDokument([props.m], { bas: site.url }));
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
