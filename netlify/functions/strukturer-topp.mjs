// Topplistan i verktyget Strukturer (K-665; Niclas 2026-10-31: "en topplista över de 5 mest tittade på och nedladdade
// strukturerna i verktyget (kan använda goatcounter för att uppdatera den listan)", och 2026-11-01: "Bygg dessa då").
//
// Funktionen räknar varje strukturs besök och utskrifter de senaste 30 dagarna ur GoatCounters API, med samma räkning som
// bygget (strukturernasTopplista i standarden: en utskrift väger som fem besök), och svarar med listan som JSON. Netlifys
// CDN sparar svaret ett dygn (Netlify-CDN-Cache-Control), så funktionen körs omkring en gång om dygnet, och sidan
// /strukturer hämtar listan när den laddas (src/scripts/kortlistan.ts). Utan nyckel, och när GoatCounter inte svarar
// eller svarar 429, svarar funktionen 503, och sidan visar listan som den var när sajten byggdes
// (src/data/strukturer-topp.json, scripts/strukturer/topplistan.mjs).
//
// Miljövariabel: GC_LASNYCKEL, en API-nyckel i GoatCounter som bara kan läsa statistiken. Claude Code satte den i Netlify
// 2026-11-01 på Niclas begäran ("Den läser BARA statistik och är INGEN HEMLIGHET"), med netlify env:set i den länkade
// mappen; med --site satte kommandot tyst ingenting.
//
// Varje körning gör högst 20 anrop mot GoatCounters 500 i timmen och slutar efter sex sekunder med det den har hunnit, så att svaret kommer inom Netlifys tio sekunder.
import { strukturernasTopplista } from '../../src/lib/standard/strukturer.js';

export const config = { path: '/api/strukturer-topp' };

const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
const svar = (status, data, cache) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...(cache ? { 'Cache-Control': 'public, max-age=3600', 'Netlify-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' } : { 'Cache-Control': 'no-store' }) },
});

/** Alla besök och händelser i perioden, 100 i taget, med de hämtade som exclude_paths, som statistiksidan. */
export async function hamtaHits(nyckel, { hamta = fetch, nu = new Date(), tidsgrans = 6000, paus = 300 } = {}) {
  const slut = new Date(nu); slut.setMinutes(0, 0, 0); slut.setHours(slut.getHours() + 1);
  const start = new Date(slut.getTime() - 30 * 86400000);
  const borjan = Date.now();
  const ut = [];
  const sedda = new Set();
  for (let i = 0; i < 20 && Date.now() - borjan < tidsgrans; i++) {
    const u = new URL('https://niclasfohlin.goatcounter.com/api/v0/stats/hits');
    u.searchParams.set('start', iso(start));
    u.searchParams.set('end', iso(slut));
    u.searchParams.set('limit', '100');
    if (sedda.size) u.searchParams.set('exclude_paths', [...sedda].join(','));
    // GoatCounter tar högst fyra anrop i sekunden och svarar annars 429 (prövat 2026-11-01: sjätte sidan utan paus).
    if (i) await new Promise((r) => setTimeout(r, paus));
    const r = await hamta(u, { headers: { Authorization: `Bearer ${nyckel}` }, signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(`GoatCounter svarade ${r.status}`);
    const json = await r.json();
    const nya = (json.hits ?? []).filter((h) => !sedda.has(h.path_id));
    for (const h of nya) { sedda.add(h.path_id); ut.push(h); }
    if (!json.more || !nya.length) break;
  }
  return ut;
}

/** Svaret, med nyckeln och hämtningen som argument, så att provet kan härma GoatCounter (scripts/strukturer/prov.mjs). */
export async function topplistansSvar({ nyckel, hamta = fetch, nu = new Date(), tidsgrans = 6000, paus = 300 } = {}) {
  if (!nyckel) return svar(503, { meddelande: 'Topplistan har ingen nyckel; sidan visar listan från bygget.' });
  try {
    const strukturer = strukturernasTopplista(await hamtaHits(nyckel, { hamta, nu, tidsgrans, paus })).slice(0, 20);
    return svar(200, { datum: new Date().toISOString(), strukturer }, true);
  } catch (e) {
    return svar(503, { meddelande: `Topplistan kunde inte hämtas: ${e.message}` });
  }
}

export default async () => topplistansSvar({ nyckel: process.env.GC_LASNYCKEL });
