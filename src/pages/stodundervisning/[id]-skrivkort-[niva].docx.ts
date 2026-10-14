import type { APIRoute, GetStaticPaths } from 'astro';
import { packaWord } from '../../lib/wordpaket';
import { publicerade } from '../../lib/innehall';
import { DOCX_TYP } from '../../lib/metoddocx';
import { skrivkortAv } from '../../lib/skrivkort';
import { skrivkortDokument } from '../../lib/skrivkortform';
import { site } from '../../data/site';

// /stodundervisning/<id>-skrivkort-<nivå>.docx: nivåns skrivkort, ett per sida (src/lib/skrivkortform.ts). Word sparar
// filen som pdf (scripts/bankpdf.mjs), och scripts/pdfdelar.mjs klipper ut varje kort som en egen pdf, som sidan som
// slumpar korten skriver ut.
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('stodundervisning');
  return metoder.flatMap((m) => {
    const b = skrivkortAv(m.id);
    return b ? b.nivaer.map((n) => ({ params: { id: m.id, niva: n.namn.toLowerCase() }, props: { id: m.id, niva: n.namn } })) : [];
  });
};

export const GET: APIRoute = async ({ props }) => {
  const b = skrivkortAv(props.id)!;
  const adress = `${site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}/stodundervisning/${props.id}/skrivkort`;
  const buffert = await packaWord(skrivkortDokument(props.id, b, props.niva, adress), 'nodebuffer');
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
