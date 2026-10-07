import type { APIRoute, GetStaticPaths } from 'astro';
import { publicerade } from '../../lib/innehall';
import { metodensFilmer } from '../../lib/film';
import { filmZip } from '../../lib/filmfil';
import { metodAdress } from '../../lib/metod';
import { site } from '../../data/site';

// /stodundervisning/<id>-filmer.zip: metodens filmer som mp4 i en zip-fil, med en textfil om upphovet (Niclas
// 2026-10-07: en knapp på metodens sida och på lathundssidan som laddar ner filmerna). Filen byggs vid varje bygge ur
// mp4-filerna i public/stodundervisning/ (scripts/filmmp4.mjs gör dem ur svg-filmerna), för varje metod med film, utan
// något extra steg när en metod läggs upp.
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('stodundervisning');
  return metoder.filter((m) => metodensFilmer(m.data, m.id).length).map((m) => ({ params: { id: m.id }, props: { m } }));
};

export const GET: APIRoute = async ({ props }) => {
  const m = props.m;
  const buffert = await filmZip(m.data.titel, metodAdress(site.url, m.id), metodensFilmer(m.data, m.id));
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': 'application/zip' } });
};
