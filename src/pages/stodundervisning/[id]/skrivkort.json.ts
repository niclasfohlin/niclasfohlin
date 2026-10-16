// Skrivkortens data till sidan Ta fram ett skrivkort, i en egen fil bredvid sidan (src/lib/kortdata.ts).
import type { APIRoute } from 'astro';
import { publicerade } from '../../../lib/innehall';
import { kortData, skrivkortAv } from '../../../lib/skrivkort';
import { kortdataSvar } from '../../../lib/kortdata';

export async function getStaticPaths() {
  return (await publicerade('stodundervisning')).filter((m) => skrivkortAv(m.id)).map((m) => ({ params: { id: m.id } }));
}

export const GET: APIRoute = ({ params }) => kortdataSvar(kortData(params.id!, skrivkortAv(params.id!)!));
