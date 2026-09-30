import type { APIRoute } from 'astro';
import { Packer } from 'docx';
import { metoderSorterade } from '../../lib/innehall';
import { metodDokument, DOCX_TYP } from '../../lib/metoddocx';
import { byggSerier, iSerieordning, serieKoppling } from '../../lib/serie';
import { lasResurser, medReservbilder } from '../../lib/metodresurser';
import { site } from '../../data/site';

// /stodundervisning/alla-metoder.docx: allt om alla publicerade metoder i en fil.
// Reservväg för den som inte kan välja metoder med JavaScript på /stodundervisning. En serie står som den generella
// metoden följd av lektionerna i bankens ordning.
export const GET: APIRoute = async () => {
  const metoder = await metoderSorterade();
  const serier = byggSerier(metoder);
  const poster = iSerieordning(metoder, serier).map((m) => ({ ...m, serie: serieKoppling(m.id, m.data, serier) }));
  const resurser = lasResurser(poster);
  const buffert = await Packer.toBuffer(await medReservbilder((png) => metodDokument(poster, { bas: site.url, medMallar: true, resurser: { ...resurser, png } })));
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
