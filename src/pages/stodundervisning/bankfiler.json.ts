import type { APIRoute } from 'astro';
import { publicerade } from '../../lib/innehall';
import { bankAv, bankfiler, bankfilensRamar } from '../../lib/bank';
import { metodensNivamaterial, nivafiler } from '../../lib/nivamaterial';
import { bladfiler, metodensBladmaterial } from '../../lib/bladmaterial';
import { ovrigtfil } from '../../lib/ovrigt';
import { harMaterial } from '../../lib/material';
import { harLathund } from '../../lib/metod';
import { nivafilNamn, skrivkortAv } from '../../lib/skrivkort';
import { aktiviteterAv, kategorifilNamn, kategorinsKort } from '../../lib/aktiviteter';
import { byggSerier } from '../../lib/serie';
import { allaLektionskortStam, metodensLektionskort } from '../../lib/lektionskort';
import { lektionskortetsSidor } from '../../lib/lektionskortdata';

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
// Varje metods fil med allt (slag: 'allt') och, när metoden har material, filen med bara metoden (slag: 'metoden') står
// här också: deras pdf:er är det knapparna Skriv ut: Allt och Metoden öppnar (K-342, Niclas 2026-10-13). De har inga
// gränser för sidantalet, eftersom beskrivningen flödar. Lathundens passtext för sig (slag: 'lathundtext') är en till
// tre sidor.
// Skrivkortens filer (src/lib/skrivkortform.ts, slag: 'skrivkort'), en per nivå med ett kort per sida, så att sidan
// som slumpar korten kan skriva ut varje kort som en sida ur Word-filens pdf (scripts/pdfdelar.mjs). Aktivitetskortens
// filer (src/lib/aktivitetskortform.ts, slag: 'aktivitetskort') likaså, en per kategori, och ett kort som inte ryms på
// sitt A4 stoppar då skriptet.
// Lektionskorten (src/lib/lektionskort.ts, slag: 'lektionskort'), ett per fil med så många sidor som kortet har (ett A4),
// och en serie vars lektioner har kort får alla i en fil (slag: 'lektionskorten'), så att ett kort som inte ryms stoppar
// skriptet och knapparnas pdf:er är Word-filerna.
export const GET: APIRoute = async () => {
  const metoder = await publicerade('stodundervisning');
  const serier = byggSerier(metoder);
  const filer = metoder.flatMap((m) => {
    const nm = metodensNivamaterial(m.data);
    const hela = [
      { metod: m.id, namn: m.id, rubrik: 'Allt om metoden', slag: 'allt', minst: 1, hogst: 999, ramar: [] as number[], oversikter: [] as number[] },
      ...(harMaterial(m.data) ? [{ metod: m.id, namn: `${m.id}-metoden`, rubrik: 'Metoden', slag: 'metoden', minst: 1, hogst: 999, ramar: [] as number[], oversikter: [] as number[] }] : []),
      ...(harLathund(m.data) ? [{ metod: m.id, namn: `${m.id}-lathund-text`, rubrik: 'Lathundens passtext', slag: 'lathundtext', minst: 1, hogst: 3, ramar: [] as number[], oversikter: [] as number[] }] : []),
    ];
    const nivans = nm ? nivafiler(m.id, nm).map((f) => ({ metod: m.id, namn: f.namn, rubrik: f.rubrik, slag: 'niva', minst: f.ramar.length, hogst: f.ramar.length * 2, ramar: f.ramar, oversikter: [] as number[] })) : [];
    const bm = metodensBladmaterial(m.data, m.id);
    const ovrigt = ovrigtfil(m.data, m.id);
    nivans.push(...(bm ? bladfiler(m.id, bm).map((f) => ({ metod: m.id, namn: f.namn, rubrik: f.rubrik, slag: f.slag as string, minst: f.minst, hogst: f.hogst, ramar: f.ramar, oversikter: [] as number[] })) : []));
    if (ovrigt) nivans.push({ metod: m.id, namn: ovrigt.namn, rubrik: ovrigt.rubrik, slag: 'ovrigt', minst: ovrigt.minst, hogst: ovrigt.hogst, ramar: ovrigt.ramar, oversikter: [] });
    const skrivkort = skrivkortAv(m.id);
    if (skrivkort) nivans.push(...skrivkort.nivaer.map((n) => { const antal = skrivkort.kort.filter((k) => k.niva === n.namn).length; return { metod: m.id, namn: nivafilNamn(m.id, n.namn), rubrik: `Skrivkort: ${n.namn}`, slag: 'skrivkort', minst: antal, hogst: antal, ramar: [] as number[], oversikter: [] as number[] }; }));
    const aktiviteter = aktiviteterAv(m.id);
    if (aktiviteter) nivans.push(...aktiviteter.kategorier.map((k) => { const antal = kategorinsKort(aktiviteter, k.id).length; return { metod: m.id, namn: kategorifilNamn(m.id, k.id), rubrik: `Aktivitetskort: ${k.namn}`, slag: 'aktivitetskort', minst: antal, hogst: antal, ramar: [] as number[], oversikter: [] as number[] }; }));
    // Kontraktet och schemat (hem.kontrakt, hem.schema): ett A4 var, och en pdf som spiller över stoppar skriptet.
    if (m.data.hem?.kontrakt) nivans.push({ metod: m.id, namn: `${m.id}-kontrakt`, rubrik: m.data.hem.kontrakt.rubrik, slag: 'hemsida', minst: 1, hogst: 1, ramar: [], oversikter: [] });
    if (m.data.hem?.schema) nivans.push({ metod: m.id, namn: `${m.id}-schema`, rubrik: m.data.hem.schema.rubrik, slag: 'hemsida', minst: 1, hogst: 1, ramar: [], oversikter: [] });
    nivans.push(...metodensLektionskort(m.data, m.id).map((k) => { const sidor = lektionskortetsSidor(k); return { metod: m.id, namn: k.stam, rubrik: k.knapp, slag: 'lektionskort', minst: sidor, hogst: sidor, ramar: [] as number[], oversikter: [] as number[] }; }));
    const lektionernasKort = m.data.lektionsbank ? (serier.get(m.id)?.lektioner ?? []).flatMap((l) => { const lektion = metoder.find((x) => x.id === l.id); return lektion ? metodensLektionskort(lektion.data, lektion.id) : []; }) : [];
    if (lektionernasKort.length) { const sidor = lektionernasKort.reduce((s, k) => s + lektionskortetsSidor(k), 0); nivans.push({ metod: m.id, namn: allaLektionskortStam(m.id), rubrik: 'Alla lektionskort', slag: 'lektionskorten', minst: sidor, hogst: sidor, ramar: [], oversikter: [] }); }
    const bank = bankAv(m.data);
    if (!bank) return [...hela, ...nivans];
    const fakta = new Set(bank.enheter.filter((e) => e.l.faktatext).map((e) => e.ri));
    const vidFakta = new Set(bank.enheter.filter((e) => e.l.faktatext).flatMap((e) => [...e.fore, ...e.efter]));
    const sidor = (ri: number): [number, number] => (fakta.has(ri) ? [2, 6] : vidFakta.has(ri) ? [1, 2] : bank.oversikter.has(ri) ? [1, 2] : [1, 1]);
    return [...hela, ...nivans, ...bankfiler(m.id, bank).map((f) => {
      const ramar = bankfilensRamar(bank, f);
      return { metod: m.id, namn: f.namn, rubrik: f.rubrik, minst: ramar.reduce((s, ri) => s + sidor(ri)[0], 0), hogst: ramar.reduce((s, ri) => s + sidor(ri)[1], 0), ramar, oversikter: ramar.filter((ri) => bank.oversikter.has(ri)) };
    })];
  });
  return new Response(JSON.stringify(filer, null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
