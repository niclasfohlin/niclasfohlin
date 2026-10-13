import type { APIRoute } from 'astro';
import { publicerade } from '../../lib/innehall';
import { bankAv, bankfiler, bankfilensRamar } from '../../lib/bank';
import { metodensNivamaterial, nivafiler } from '../../lib/nivamaterial';
import { bladfiler, metodensBladmaterial } from '../../lib/bladmaterial';
import { ovrigtfil } from '../../lib/ovrigt';

// /stodundervisning/bankfiler.json: bankernas filer (src/lib/bank.ts), som scripts/bankpdf.mjs gör pdf av ur Word-filerna
// efter bygget. Varje fil har sitt namn och hur många sidor den ska ha: en per enhet med bara enheterna, och med
// följesidorna en per blad och en till två per nivås översikt (minst och högst). Listan byggs ur samma regel som sidorna
// och Word-filerna, så att skriptet aldrig gissar vilka filer som finns. ramar är filens ramar i ordning och
// oversikter nivåernas översikter bland dem, som scripts/paritet.mjs prövar texterna i.
// En faktatext (src/lib/ramform.ts, faktatextAv) är två till sex sidor, och lärarens sida till den en eller två, så
// gränserna räknas per ram (Faktatextsamtal i grupp, 2026-10-13: tre sidor på Bas, fyra på Medel och fem på Avancerat).
// Filerna för ramar med blad (src/lib/bladmaterial.ts, slag: 'blad' och 'sidor') och filen med det övriga materialet
// (src/lib/ovrigt.ts, slag: 'ovrigt') står här också, med sina egna gränser för sidantalet, så att samma skript gör
// deras pdf:er.
// Nivåernas filer i en metod med nivåer i materialet (src/lib/nivamaterial.ts) står här också, med slag: 'niva', så att
// samma skript gör deras pdf:er: en ram är ett blad, och en sida om nivån får ta två sidor.
export const GET: APIRoute = async () => {
  const metoder = await publicerade('stodundervisning');
  const filer = metoder.flatMap((m) => {
    const nm = metodensNivamaterial(m.data);
    const nivans = nm ? nivafiler(m.id, nm).map((f) => ({ metod: m.id, namn: f.namn, rubrik: f.rubrik, slag: 'niva', minst: f.ramar.length, hogst: f.ramar.length * 2, ramar: f.ramar, oversikter: [] as number[] })) : [];
    const bm = metodensBladmaterial(m.data, m.id);
    const ovrigt = ovrigtfil(m.data, m.id);
    nivans.push(...(bm ? bladfiler(m.id, bm).map((f) => ({ metod: m.id, namn: f.namn, rubrik: f.rubrik, slag: f.slag as string, minst: f.minst, hogst: f.hogst, ramar: f.ramar, oversikter: [] as number[] })) : []));
    if (ovrigt) nivans.push({ metod: m.id, namn: ovrigt.namn, rubrik: ovrigt.rubrik, slag: 'ovrigt', minst: ovrigt.minst, hogst: ovrigt.hogst, ramar: ovrigt.ramar, oversikter: [] });
    const bank = bankAv(m.data);
    if (!bank) return nivans;
    const fakta = new Set(bank.enheter.filter((e) => e.l.faktatext).map((e) => e.ri));
    const vidFakta = new Set(bank.enheter.filter((e) => e.l.faktatext).flatMap((e) => [...e.fore, ...e.efter]));
    const sidor = (ri: number): [number, number] => (fakta.has(ri) ? [2, 6] : vidFakta.has(ri) ? [1, 2] : bank.oversikter.has(ri) ? [1, 2] : [1, 1]);
    return [...nivans, ...bankfiler(m.id, bank).map((f) => {
      const ramar = bankfilensRamar(bank, f);
      return { metod: m.id, namn: f.namn, rubrik: f.rubrik, minst: ramar.reduce((s, ri) => s + sidor(ri)[0], 0), hogst: ramar.reduce((s, ri) => s + sidor(ri)[1], 0), ramar, oversikter: ramar.filter((ri) => bank.oversikter.has(ri)) };
    })];
  });
  return new Response(JSON.stringify(filer, null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
