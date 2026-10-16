// Förteckningen över delningskorten, som scripts/delningskort.mjs läser ur bygget: vilka kort som ska finnas,
// vilken fil vart och ett ska ligga i och var mallen för det står. Se src/lib/delningskort.ts.
import { allaKort } from '../../lib/delningskort';

export async function GET() {
  // Sidan som slumpar skrivkort har en egen mall (src/pages/delning/skrivkort/[namn].astro), och så har sidorna som
  // slumpar aktivitetskort och brainbreaks (src/pages/delning/aktiviteter/ och brainbreaks/).
  const kort = (await allaKort()).map(({ sida, namn, fil, skrivkort, kortbank }) => ({ sida, namn, fil, mall: skrivkort ? `/delning/skrivkort/${namn}` : kortbank ? `/delning/${kortbank.slag}/${namn}` : `/delning/kort/${namn}` }));
  return new Response(JSON.stringify(kort, null, 1) + '\n', { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
