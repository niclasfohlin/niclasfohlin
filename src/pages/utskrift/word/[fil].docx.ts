import type { APIRoute, GetStaticPaths } from 'astro';
import { Packer } from 'docx';
import { publicerade } from '../../../lib/innehall';
import { lathundProvDokument, LH_STEG, DOCX_TYP } from '../../../lib/metoddocx';
import { site } from '../../../data/site';

// Provfiler för mätningen av Word-lathunden (scripts/lathund-word.mjs): varje sida för sig i varje steg i LH_STEG,
// som <id>--<sida>--<steg i procent>.docx. Skriptet bygger sajten med LATHUND_WORDPROV=1 (och LATHUND_WORDPROV_IDS
// för de metoder som ska mätas), låter Word räkna sidorna och tar bort filerna. I ett vanligt bygge görs inga filer här.
export const getStaticPaths: GetStaticPaths = async () => {
  if (process.env.LATHUND_WORDPROV !== '1') return [];
  const valda = process.env.LATHUND_WORDPROV_IDS?.split(',').filter(Boolean);
  const metoder = (await publicerade('stodundervisning')).filter((m) => m.data.lathund && (!valda || valda.includes(m.id)));
  return metoder.flatMap((m) => [1, 2, 3, 4].flatMap((nr) => LH_STEG.map((skala) => ({
    params: { fil: `${m.id}--${nr}--${Math.round(skala * 100)}` },
    props: { m, nr, skala },
  }))));
};

export const GET: APIRoute = async ({ props }) => {
  const buffert = await Packer.toBuffer(lathundProvDokument(props.m, props.nr, props.skala, { bas: site.url }));
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
