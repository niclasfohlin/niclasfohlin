import type { APIRoute, GetStaticPaths } from 'astro';
import { Packer } from 'docx';
import { publicerade } from '../../lib/innehall';
import { metodDokument, DOCX_TYP } from '../../lib/metoddocx';
import { byggSerier, serieKoppling } from '../../lib/serie';
import { lasResurser, medReservbilder } from '../../lib/metodresurser';
import { site } from '../../data/site';

// /stodundervisning/<id>.docx: allt om metoden i en Word-fil, byggd vid bygget ur samma data som
// sidan: metodbeskrivningen, planeringsmallarna och lathunden. "Hela" ska betyda hela. En metod i en serie får sin
// plats i serien med sig, så att den generella metoden har lektionsbanken och lektionen raden Hör till.
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('stodundervisning');
  const serier = byggSerier(metoder);
  return metoder.map((m) => ({ params: { id: m.id }, props: { m: { ...m, serie: serieKoppling(m.id, m.data, serier) } } }));
};

export const GET: APIRoute = async ({ props }) => {
  const resurser = lasResurser([props.m]);
  const buffert = await Packer.toBuffer(await medReservbilder((png) => metodDokument([props.m], { bas: site.url, medMallar: true, resurser: { ...resurser, png } })));
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
