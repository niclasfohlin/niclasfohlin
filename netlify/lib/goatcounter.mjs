// GoatCounter från en rot (K-730; Niclas 2026-11-07: "Se till att statistiken är robust, från en rot och hållbar över tid till
// månadsbrev"): allt på servern som läser statistiken går genom den här filen, månadsbrevet (netlify/lib/manadsbrev.mjs och
// scripts/manadsbrev.mjs) och topplistan i verktyget Strukturer (netlify/functions/strukturer-topp.mjs och
// scripts/strukturer/topplistan.mjs). Statistiksidan frågar GoatCounter direkt från webbläsaren med egen kö och läser samma tal:
// en post räknas efter besöken på postens egen sida (src/pages/statistik.astro), och samlingarna kommer ur src/lib/samlingar.ts.
//
// Två sätt att fråga. sidornasBesok frågar efter sidorna med namn, så att svaret tar lika lång tid hur många händelser sajten än får:
// oktober 2026 hade 1 247 sidor och händelser, och att läsa dem alla tog 13 anrop, men posternas sidor tog 3 anrop, en sekund, och
// gav exakt samma tal. allaHits läser allt, och behövs bara när händelserna också räknas. GoatCounter tar högst 4 anrop i sekunden
// och 500 i timmen (DRIFT.md under Besöksstatistik).
const BAS = 'https://niclasfohlin.goatcounter.com/api/v0';
const SIDA = 100; // GoatCounters största limit
const sov = (ms) => new Promise((r) => setTimeout(r, ms));
export const gcTid = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

async function fraga(vag, parametrar, nyckel, { hamta = fetch, forsok = 3, vantan = 1100, timeout = 5000 } = {}) {
  const u = new URL(`${BAS}${vag}`);
  for (const [k, v] of Object.entries(parametrar)) u.searchParams.set(k, String(v));
  for (let i = 1; ; i++) {
    const r = await hamta(u, { headers: { Authorization: `Bearer ${nyckel}` }, signal: AbortSignal.timeout(timeout) });
    // Ett stoppat anrop går att göra om: gränsen gäller per sekund, och nästa försök kommer efter den.
    if (r.status === 429 && i < forsok) { await sov(vantan); continue; }
    if (!r.ok) throw new Error(`GoatCounter svarade ${r.status}`);
    return r.json();
  }
}

/** Alla sidor och händelser i perioden, 100 i taget med de hämtade som exclude_paths. API:t har inget filter (400 prövat 2026-11-01). */
export async function allaHits(nyckel, { start, slut, hamta, tidsgrans = 6000, paus = 300, timeout = 4000, varv = 20 } = {}) {
  const borjan = Date.now();
  const ut = [];
  const sedda = new Set();
  for (let i = 0; i < varv && Date.now() - borjan < tidsgrans; i++) {
    // GoatCounter tar högst fyra anrop i sekunden och svarar annars 429 (prövat 2026-11-01: sjätte sidan utan paus).
    if (i && paus) await sov(paus);
    const json = await fraga('/stats/hits', { start: gcTid(start), end: gcTid(slut), limit: SIDA, ...(sedda.size ? { exclude_paths: [...sedda].join(',') } : {}) }, nyckel, { hamta, forsok: 1, timeout });
    const nya = (json.hits ?? []).filter((h) => !sedda.has(h.path_id));
    for (const h of nya) { sedda.add(h.path_id); ut.push(h); }
    if (!json.more || !nya.length) break;
  }
  return ut;
}

/** Besöken per sida, utan händelserna. En sida med snedstreck sist är samma sida. */
export function besokPerSida(hits) {
  const ut = new Map();
  for (const h of hits) {
    if (h.event || !h.path) continue;
    const sida = h.path.replace(/\/$/, '') || '/';
    ut.set(sida, (ut.get(sida) ?? 0) + (h.count ?? 0));
  }
  return ut;
}

/**
 * Besöken på de här sidorna i perioden. Sidorna går i frågan med sina namn (path_by_name), högst 100 i varje, och med och utan
 * snedstreck sist. Säger GoatCounter att mer finns än frågan gav är något fel, och då stannar det hellre än att talen blir för låga.
 */
export async function sidornasBesok(nyckel, sidor, { start, slut, hamta, paus = 300 } = {}) {
  // Namnen skiljs åt med kommatecken i frågan. Sajtens adresser har inga, och en sådan adress skulle ge fel tal utan att det syns.
  if (sidor.some((s) => s.includes(','))) throw new Error('En adress med kommatecken går inte att fråga efter med namn');
  const namn = [...new Set(sidor)].flatMap((s) => [s, `${s}/`]);
  const hits = [];
  for (let i = 0; i < namn.length; i += SIDA) {
    if (i && paus) await sov(paus);
    const json = await fraga('/stats/hits', { start: gcTid(start), end: gcTid(slut), limit: SIDA, path_by_name: 'true', include_paths: namn.slice(i, i + SIDA).join(',') }, nyckel, { hamta });
    if (json.more) throw new Error('GoatCounter säger att svaret inte är helt');
    hits.push(...(json.hits ?? []));
  }
  return besokPerSida(hits);
}

/** Alla besök i perioden, utan händelserna, med ett enda anrop. */
export async function periodensBesok(nyckel, { start, slut, hamta } = {}) {
  const json = await fraga('/stats/total', { start: gcTid(start), end: gcTid(slut) }, nyckel, { hamta });
  return (json.total ?? 0) - (json.total_events ?? 0);
}
