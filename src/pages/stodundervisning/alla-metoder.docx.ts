import type { APIRoute } from 'astro';
import { Packer } from 'docx';
import { metoderSorterade } from '../../lib/innehall';
import { metodDokument, DOCX_TYP } from '../../lib/metoddocx';
import { site } from '../../data/site';

// /stodundervisning/alla-metoder.docx: alla publicerade metoder med mallar i en fil.
// Reservväg för den som inte kan välja metoder med JavaScript på /stodundervisning.
export const GET: APIRoute = async () => {
  const metoder = await metoderSorterade();
  const buffert = await Packer.toBuffer(metodDokument(metoder, { bas: site.url, medMallar: true }));
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
