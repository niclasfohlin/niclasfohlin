import type { APIRoute, GetStaticPaths } from 'astro';
import { packaWord } from '../../lib/wordpaket';
import { publicerade } from '../../lib/innehall';
import { DOCX_TYP } from '../../lib/metoddocx';
import { aktiviteterAv } from '../../lib/aktiviteter';
import { aktivitetskortDokument } from '../../lib/aktivitetskortform';
import { centralAv, lasbarAdress } from '../../lib/centrala';
import { medReservbilder } from '../../lib/metodresurser';
import { site } from '../../data/site';

// /stodundervisning/<id>-aktivitetskort-<kategori>.docx: kategorins aktivitetskort, ett per sida
// (src/lib/aktivitetskortform.ts). Word sparar filen som pdf (scripts/bankpdf.mjs), och scripts/pdfdelar.mjs klipper ut
// varje kort som en egen pdf, som sidan Ta fram en aktivitet skriver ut. Sidfoten har sidans korta adress
// (src/data/centrala.json), som läraren kan skriva på tavlan.
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('stodundervisning');
  return metoder.flatMap((m) => {
    const b = aktiviteterAv(m.id);
    return b ? b.kategorier.map((k) => ({ params: { id: m.id, kategori: k.id }, props: { id: m.id, kategori: k.id } })) : [];
  });
};

export const GET: APIRoute = async ({ props }) => {
  const b = aktiviteterAv(props.id)!;
  const c = centralAv('aktiviteter');
  const adress = `${site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}${c ? lasbarAdress(c) : `/stodundervisning/${props.id}/aktiviteter`}`;
  const buffert = await packaWord(await medReservbilder((png) => aktivitetskortDokument(props.id, b, props.kategori, adress, png)), 'nodebuffer');
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
