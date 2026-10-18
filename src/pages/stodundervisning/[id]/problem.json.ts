// Datan till sidan Ta fram ett matteproblem, i en egen fil bredvid sidan (src/lib/tafram.ts, src/lib/kortdata.ts): det
// som Visa stort och listan att skriva ut behöver.
import type { APIRoute } from 'astro';
import { publicerade } from '../../../lib/innehall';
import { harTaFram, taFramAv, taFramData } from '../../../lib/tafram';
import { kortdataSvar } from '../../../lib/kortdata';

export async function getStaticPaths() {
  return (await publicerade('stodundervisning')).filter((m) => harTaFram(m, 'problem')).map((m) => ({ params: { id: m.id }, props: { m } }));
}

export const GET: APIRoute = async ({ props }) => kortdataSvar(taFramData(await taFramAv(props.m)));
