import type { APIRoute, GetStaticPaths } from 'astro';
import { packaWord } from '../../lib/wordpaket';
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
  const buffert = await packaWord(await medReservbilder((png) => mallDokument(props.m, { bas: site.url, resurser: { ...resurser, png } })), 'nodebuffer');
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
