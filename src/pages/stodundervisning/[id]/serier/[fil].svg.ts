import type { APIRoute, GetStaticPaths } from 'astro';
import { publicerade } from '../../../../lib/innehall';
import { serieFiler } from '../../../../lib/bildserier-bygge';

// /stodundervisning/<id>/serier/<fil>.svg: bildseriernas rutor, arken att klippa ut och seriemallarnas tomma rutor
// (src/lib/bildserier.ts), ritade vid bygget ur metodens scenfil med metodriggens kod. Sidan och utskriften visar dem,
// och webbläsaren hämtar dem när den bygger en Word-fil av flera metoder, byte för byte de som Word-filerna här har.
export const getStaticPaths: GetStaticPaths = async () => {
  const metoder = await publicerade('stodundervisning');
  return metoder.flatMap((m) => [...serieFiler(m)].map(([adress, svg]) => ({ params: { id: m.id, fil: adress.slice(adress.lastIndexOf('/') + 1).replace(/\.svg$/, '') }, props: { svg } })));
};

export const GET: APIRoute = ({ props }) => new Response(props.svg as string, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
