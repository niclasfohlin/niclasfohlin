import type { APIRoute } from 'astro';
import { metoderSorterade } from '../../lib/innehall';

// Alla publicerade metoder med hela modellen. Läses av /stodundervisning när läsaren
// väljer flera metoder och bygger en Word-fil i webbläsaren (src/lib/metoddocx.ts).
export const GET: APIRoute = async () => {
  const metoder = await metoderSorterade();
  const ut = { genererad: new Date().toISOString(), metoder: metoder.map((m) => ({ id: m.id, data: m.data })) };
  return new Response(JSON.stringify(ut), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
