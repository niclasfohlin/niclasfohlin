// Förteckningen över delningskorten, som scripts/delningskort.mjs läser ur bygget: vilka kort som ska finnas,
// vilken fil vart och ett ska ligga i och var mallen för det står. Se src/lib/delningskort.ts.
import { allaKort } from '../../lib/delningskort';

export async function GET() {
  // Sidan som slumpar skrivkort har en egen mall (src/pages/delning/skrivkort/[namn].astro).
  const kort = (await allaKort()).map(({ sida, namn, fil, skrivkort }) => ({ sida, namn, fil, mall: skrivkort ? `/delning/skrivkort/${namn}` : `/delning/kort/${namn}` }));
  return new Response(JSON.stringify(kort, null, 1) + '\n', { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
