import type { APIRoute, GetStaticPaths } from 'astro';
import { packaWord } from '../../../lib/wordpaket';
import { publicerade } from '../../../lib/innehall';
import { faktatextProvDokument, DOCX_TYP } from '../../../lib/metoddocx';
import { lasResurser, medReservbilder } from '../../../lib/metodresurser';
import { site } from '../../../data/site';

// Provfiler för mätningen av sidlåset (scripts/sidlas.mjs): en Word-fil per metod med alla dess faktatexter, utan lås
// som <id>.docx och med låsen i src/data/sidlas.json som <id>--last.docx. Skriptet bygger sajten med SIDLAS_PROV=1 (och
// SIDLAS_PROV_IDS för de metoder som ska mätas) till en tillfällig mapp, låter Word göra pdf av filerna och tar bort
// mappen. I ett vanligt bygge görs inga filer här, så inget prov hamnar i det som laddas upp. Utvecklingsservern har adresserna alltid, så att
// mätningen kan hämta provet därifrån utan att bygga (scripts/sidlas.mjs --server). En metod utan faktatexter får också
// sin fil, utan texter: en fil som saknas betyder då att provet inte byggdes, och mätningen stannar i stället för att
// tro att metoden inte har några lås.
export const getStaticPaths: GetStaticPaths = async () => {
  if (process.env.SIDLAS_PROV !== '1' && !import.meta.env.DEV) return [];
  const valda = process.env.SIDLAS_PROV_IDS?.split(',').filter(Boolean);
  const metoder = (await publicerade('stodundervisning')).filter((m) => !valda || valda.includes(m.id));
  return metoder.flatMap((m) => [false, true].map((last) => ({ params: { fil: `${m.id}${last ? '--last' : ''}` }, props: { m, last } })));
};

export const GET: APIRoute = async ({ props }) => {
  const resurser = lasResurser([props.m]);
  const buffert = await packaWord(await medReservbilder((png) => faktatextProvDokument(props.m, { bas: site.url, last: props.last, resurser: { ...resurser, png } })), 'nodebuffer');
  return new Response(new Uint8Array(buffert), { headers: { 'Content-Type': DOCX_TYP } });
};
