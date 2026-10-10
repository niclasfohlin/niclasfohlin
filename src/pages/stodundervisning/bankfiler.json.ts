import type { APIRoute } from 'astro';
import { publicerade } from '../../lib/innehall';
import { bankAv, bankfiler, bankfilensRamar } from '../../lib/bank';

// /stodundervisning/bankfiler.json: bankernas filer (src/lib/bank.ts), som scripts/bankpdf.mjs gör pdf av ur Word-filerna
// efter bygget. Varje fil har sitt namn och hur många sidor den ska ha: en per enhet med bara enheterna, och med
// följesidorna en per blad och en till två per nivås översikt (minst och högst). Listan byggs ur samma regel som sidorna
// och Word-filerna, så att skriptet aldrig gissar vilka filer som finns.
export const GET: APIRoute = async () => {
  const metoder = await publicerade('stodundervisning');
  const filer = metoder.flatMap((m) => {
    const bank = bankAv(m.data);
    if (!bank) return [];
    return bankfiler(m.id, bank).map((f) => {
      const ramar = bankfilensRamar(bank, f);
      const oversikter = ramar.filter((ri) => bank.oversikter.has(ri)).length;
      return { metod: m.id, namn: f.namn, rubrik: f.rubrik, minst: ramar.length, hogst: ramar.length + oversikter };
    });
  });
  return new Response(JSON.stringify(filer, null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
