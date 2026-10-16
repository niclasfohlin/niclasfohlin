// Brainbreakkortens data till sidan Ta fram en brainbreak, i en egen fil bredvid sidan (src/lib/kortdata.ts).
import type { APIRoute } from 'astro';
import { publicerade } from '../../../lib/innehall';
import { brainbreaksAv, brainbreaksData } from '../../../lib/aktiviteter';
import { kortdataSvar } from '../../../lib/kortdata';

export async function getStaticPaths() {
  return (await publicerade('stodundervisning')).filter((m) => brainbreaksAv(m.id)).map((m) => ({ params: { id: m.id } }));
}

export const GET: APIRoute = ({ params }) => kortdataSvar(brainbreaksData(params.id!, brainbreaksAv(params.id!)!));
