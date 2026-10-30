import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { PPTX_TYP, undervisningsmetodensLathundPptx } from '../../../../lib/metodpptx';
import { site } from '../../../../data/site';

// En undervisningsmetods lathund i A4 liggande, bara som förlaga till lathundens pdf (K-637), som
// src/pages/utskrift/lathund/[id].pptx.ts för Stödundervisning: scripts/lathund-pdf.mjs bygger sajten med LATHUND_A4=1,
// låter PowerPoint spara filerna som pdf och tar bort dem ur dist. Varje undervisningsmetod med lathund får sin förlaga,
// också ett utkast, eftersom metodens filer i public/metoder/ följer med i varje bygge (scripts/metoderfiler.mjs).
export const getStaticPaths: GetStaticPaths = async () => {
  if (process.env.LATHUND_A4 !== '1') return [];
  const metoder = await getCollection('undervisningsmetoder');
  return metoder.filter((m) => m.data.lathund).map((m) => ({ params: { id: m.id }, props: { m } }));
};

export const GET: APIRoute = async ({ props }) => {
  const buffert = await undervisningsmetodensLathundPptx(props.m, { bas: site.url, format: 'A4' });
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': PPTX_TYP } });
};
