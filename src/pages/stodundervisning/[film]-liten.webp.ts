import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';
import { publicerade } from '../../lib/innehall';
import { metodensFilmer, type MetodFilm } from '../../lib/film';
import { omslagFil, provaFilmfiler, SMABILD } from '../../lib/filmfil';

// /stodundervisning/<id>-film2-liten.webp: filmens omslagsbild i litet format, till raden där läsaren väljer film i
// spelaren på lathundssidan (src/components/Filmspelare.astro). Bilden görs vid bygget ur omslagsbilden som
// scripts/filmmp4.mjs sparar med filmens mp4, för varje film i en metod med lathund och mer än en film; en metod med
// en film har ingen rad att välja i.
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('stodundervisning');
  return metoder.flatMap((m) => {
    const filmer = metodensFilmer(m.data, m.id);
    if (!m.data.lathund || filmer.length < 2) return [];
    return filmer.map((f) => ({ params: { film: f.bas.split('/').pop() }, props: { f, titel: m.data.titel } }));
  });
};

export const GET: APIRoute = async ({ props }) => {
  const f = props.f as MetodFilm;
  provaFilmfiler(f, props.titel);
  const bild = await sharp(omslagFil(f)).resize(SMABILD.bredd, SMABILD.hojd).webp({ quality: 72, effort: 6 }).toBuffer();
  return new Response(new Uint8Array(bild), { headers: { 'Content-Type': 'image/webp' } });
};
