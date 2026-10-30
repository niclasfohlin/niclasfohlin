import type { APIRoute, GetStaticPaths } from 'astro';
import { publicerade } from '../../lib/innehall';
import { metodensFilmer } from '../../lib/film';
import { filmZip } from '../../lib/filmfil';
import { metodensAdress, type Um } from '../../lib/undervisningsmetod';
import { site } from '../../data/site';

// /metoder/<id>-filmer.zip: en undervisningsmetods filmer som mp4 i en zip-fil, med en textfil om upphovet (K-634), som
// /stodundervisning/<id>-filmer.zip. Filen byggs vid varje bygge ur mp4-filerna i public/metoder/, som scripts/filmmp4.mjs
// gör ur riggens svg-filmer, och knapparna står i spelaren på lathundssidan och som raden Filmerna i Ladda ner och skriv ut.

// Metodens filmer i public/metoder/, som lathundssidan och metodens sida hittar dem.
const umFilmer = (m: { id: string; data: unknown }) => { const d = m.data as Um; return metodensFilmer({ film: d.film, filmer: d.filmer }, m.id, 'metoder'); };

export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('undervisningsmetoder');
  return metoder.filter((m) => umFilmer(m).length).map((m) => ({ params: { id: m.id }, props: { m } }));
};

export const GET: APIRoute = async ({ props }) => {
  const m = props.m;
  const buffert = await filmZip(m.data.titel, `${site.url}${metodensAdress(m.id)}`, umFilmer(m), 'under Metoder');
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': 'application/zip' } });
};
