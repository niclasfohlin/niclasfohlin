// Förteckningen över delningskorten, som scripts/delningskort.mjs läser ur bygget: vilka kort som ska finnas,
// vilken fil vart och ett ska ligga i och var mallen för det står. Se src/lib/delningskort.ts.
import { allaKort } from '../../lib/delningskort';

export async function GET() {
  const kort = (await allaKort()).map(({ sida, namn, fil }) => ({ sida, namn, fil, mall: `/delning/kort/${namn}` }));
  return new Response(JSON.stringify(kort, null, 1) + '\n', { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
