// Aktivitetskortens data till sidan Ta fram en aktivitet, i en egen fil bredvid sidan (src/lib/kortdata.ts).
import type { APIRoute } from 'astro';
import { publicerade } from '../../../lib/innehall';
import { aktiviteterAv, aktiviteterData } from '../../../lib/aktiviteter';
import { kortdataSvar } from '../../../lib/kortdata';

export async function getStaticPaths() {
  return (await publicerade('stodundervisning')).filter((m) => aktiviteterAv(m.id)).map((m) => ({ params: { id: m.id } }));
}

export const GET: APIRoute = ({ params }) => kortdataSvar(aktiviteterData(params.id!, aktiviteterAv(params.id!)!));
