// Datan till sidorna Ta fram en lästext och Ta fram en faktatext, i en egen fil bredvid sidan (src/lib/tafram.ts,
// src/lib/taframdata.ts, src/lib/kortdata.ts): det som Visa stort och listan att skriva ut behöver, och faktatexterna
// som Faktatext.astro ritar dem.
import type { APIRoute } from 'astro';
import { publicerade } from '../../../lib/innehall';
import { harTaFram, taFramAv } from '../../../lib/tafram';
import { taFramDatafil } from '../../../lib/taframdata';
import { kortdataSvar } from '../../../lib/kortdata';

export async function getStaticPaths() {
  return (await publicerade('stodundervisning')).filter((m) => harTaFram(m, 'texter')).map((m) => ({ params: { id: m.id }, props: { m } }));
}

export const GET: APIRoute = async ({ props }) => kortdataSvar(await taFramDatafil(await taFramAv(props.m)));
