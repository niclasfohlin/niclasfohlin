import type { APIRoute } from 'astro';
import { metoderSorterade } from '../../lib/innehall';
import { byggSerier, serieKoppling } from '../../lib/serie';

// Alla publicerade metoder med hela modellen. Läses av /stodundervisning när läsaren
// väljer flera metoder och bygger en Word-fil i webbläsaren (src/lib/metoddocx.ts). En metod i en serie har sin plats
// i serien med sig (serie), så att filen får samma lektionsbank som den som byggs vid bygget.
export const GET: APIRoute = async () => {
  const metoder = await metoderSorterade();
  const serier = byggSerier(metoder);
  const ut = { genererad: new Date().toISOString(), metoder: metoder.map((m) => ({ id: m.id, data: m.data, serie: serieKoppling(m.id, m.data, serier) })) };
  return new Response(JSON.stringify(ut), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
