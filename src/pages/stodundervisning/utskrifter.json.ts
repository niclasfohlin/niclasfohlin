import type { APIRoute } from 'astro';
import { publicerade } from '../../lib/innehall';
import { metodensUtskrifter } from '../../lib/utskrift';
import { skrivkortensUtskrifter } from '../../lib/skrivkort';

// /stodundervisning/utskrifter.json: pdf:erna som utskriftsknapparna på enheternas och ramarnas sidor leder till, och
// vilka ramar och blad ur vilka filer var och en består av (src/lib/utskrift.ts). scripts/pdfdelar.mjs klipper ut dem ur
// de hela pdf:erna när sajten byggs, efter samma lista som sidorna länkar efter.
export const GET: APIRoute = async () => {
  const metoder = await publicerade('stodundervisning');
  const filer = metoder.flatMap((m) => [...metodensUtskrifter(m.data, m.id), ...skrivkortensUtskrifter(m.id)]);
  return new Response(JSON.stringify(filer, null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
