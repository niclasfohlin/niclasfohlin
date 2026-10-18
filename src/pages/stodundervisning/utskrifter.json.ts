import type { APIRoute } from 'astro';
import { matteproblemenPaSidan, publicerade } from '../../lib/innehall';
import { matteproblemensUtskrifter } from '../../lib/matteproblem';
import { metodensUtskrifter } from '../../lib/utskrift';
import { skrivkortensUtskrifter } from '../../lib/skrivkort';
import { aktiviteternasUtskrifter } from '../../lib/aktiviteter';

// /stodundervisning/utskrifter.json: pdf:erna som utskriftsknapparna på enheternas och ramarnas sidor leder till, och
// vilka ramar och blad ur vilka filer var och en består av (src/lib/utskrift.ts). scripts/pdfdelar.mjs klipper ut dem ur
// de hela pdf:erna när sajten byggs, efter samma lista som sidorna länkar efter. Ta fram ett matteproblems poster klipps ur
// sidans egna filer (src/lib/matteproblem.ts).
export const GET: APIRoute = async () => {
  const metoder = await publicerade('stodundervisning');
  const mp = await matteproblemenPaSidan();
  const filer = [...metoder.flatMap((m) => [...metodensUtskrifter(m.data, m.id), ...skrivkortensUtskrifter(m.id), ...aktiviteternasUtskrifter(m.id)]), ...(mp ? matteproblemensUtskrifter(mp.alla) : [])];
  return new Response(JSON.stringify(filer, null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
