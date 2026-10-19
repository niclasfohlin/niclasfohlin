import type { APIRoute } from 'astro';
import { matteproblemenPaSidan, publicerade } from '../../lib/innehall';
import { matteproblemensUtskrifter } from '../../lib/matteproblem';
import { metodensUtskrifter } from '../../lib/utskrift';
import { medDatabaserna } from '../../lib/faktateman';
import { skrivkortensUtskrifter } from '../../lib/skrivkort';
import { aktiviteternasUtskrifter } from '../../lib/aktiviteter';

// /stodundervisning/utskrifter.json: pdf:erna som utskriftsknapparna på enheternas och ramarnas sidor leder till, och
// vilka ramar och blad ur vilka filer var och en består av (src/lib/utskrift.ts). scripts/pdfdelar.mjs klipper ut dem ur
// de hela pdf:erna när sajten byggs, efter samma lista som sidorna länkar efter. Ta fram ett matteproblems poster klipps ur
// sidans egna filer (src/lib/matteproblem.ts). Metoderna läses med databasens teman (src/lib/faktateman.ts), så att en
// text ur databasen har sina utskrifter som metodens egna.
export const GET: APIRoute = async () => {
  const metoder = await medDatabaserna(await publicerade('stodundervisning'));
  const mp = await matteproblemenPaSidan();
  const filer = [...metoder.flatMap((m) => [...metodensUtskrifter(m.data, m.id), ...skrivkortensUtskrifter(m.id), ...aktiviteternasUtskrifter(m.id)]), ...(mp ? matteproblemensUtskrifter(mp.alla) : [])];
  return new Response(JSON.stringify(filer, null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
