// Månadsbrevet (K-730; Niclas 2026-11-07: "topp tre ... i de fyra kategorierna och den nyaste som kommit senaste månaden som lästs
// mest", "dra ur statistik från goatcounter samt lite mysig text som skriver om månaden. Släpp den den 1 varje månad", och "se till
// att allt sker automatiskt"). Går ut av sig självt från netlify/functions/manadsbrev.mjs. Den här filen hämtar månadens siffror,
// räknar ut brevets innehåll och skickar det; formen står i netlify/lib/mejl.mjs. Allt går att köra med en härmad hämtning, så att
// scripts/utskicksprov.mjs kan pröva det, och netlify/functions/manadsbrev-koll.mjs provkör det hos Netlify utan att skicka.
import { meningarna } from '../../src/lib/standard/text.js';
import texter from '../../src/data/manadsbrev.json' with { type: 'json' };
import { manadsMejl } from './mejl.mjs';
import { AVSANDARE, DAGSGRANS, SVAR_TILL, brevo, brevoAndra, brevoLas, dagensUtrymme, ledigTid, svensktDatum } from './utskick.mjs';

const MANADER = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const KATEGORIER = [
  { namn: 'Stödundervisning', bas: '/stodundervisning/', url: '/stodundervisning/', en: 'metod', ord: 'metoderna' },
  { namn: 'Metoder', bas: '/metoder/', url: '/metoder', en: 'metod', ord: 'metoderna' },
  { namn: 'Artiklar', bas: '/artiklar/', url: '/artiklar', en: 'text', ord: 'texterna' },
  { namn: 'Böcker', bas: '/bocker/', url: '/bocker', en: 'bok', ord: 'böckerna' },
];
const stor = (s) => `${s[0].toLocaleUpperCase('sv')}${s.slice(1)}`;
// Midnatt svensk tid som UTC: tidszonen läses mitt på dagen, så att sommartiden blir rätt.
function midnatt(ar, man) {
  const prov = new Date(Date.UTC(ar, man - 1, 1, 12));
  const zon = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Stockholm', timeZoneName: 'longOffset' }).formatToParts(prov).find((x) => x.type === 'timeZoneName').value.replace('GMT', '') || '+00:00';
  return new Date(`${ar}-${String(man).padStart(2, '0')}-01T00:00:00${zon}`);
}

/** Månaden med nyckeln ÅÅÅÅ-MM: namnet och dess gränser som tider. */
export function manaden(nyckel) {
  const [ar, man] = nyckel.split('-').map(Number);
  const nasta = man === 12 ? [ar + 1, 1] : [ar, man + 1];
  return { nyckel, ar, man, namn: MANADER[man - 1], start: midnatt(ar, man), slut: midnatt(...nasta) };
}

/** Månaden före dagen nu, svensk tid: den som brevet den 1 handlar om. */
export function forraManaden(nu = new Date()) {
  const [ar, man] = svensktDatum(nu).split('-').map(Number);
  return manaden(man === 1 ? `${ar - 1}-12` : `${ar}-${String(man - 1).padStart(2, '0')}`);
}

/** Alla sidor och händelser i perioden, 100 i taget, som statistiksidan. API:t har inget filter, så allt läses. */
export async function hamtaHits(nyckel, { start, slut, hamta = fetch, tidsgrans = 15000, paus = 300 } = {}) {
  const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const borjan = Date.now();
  const ut = [];
  const sedda = new Set();
  for (let i = 0; i < 40; i++) {
    if (Date.now() - borjan > tidsgrans) throw new Error('GoatCounter hann inte svara inom tiden');
    const u = new URL('https://niclasfohlin.goatcounter.com/api/v0/stats/hits');
    u.searchParams.set('start', iso(start));
    u.searchParams.set('end', iso(slut));
    u.searchParams.set('limit', '100');
    if (sedda.size) u.searchParams.set('exclude_paths', [...sedda].join(','));
    // GoatCounter tar högst fyra anrop i sekunden.
    if (i && paus) await new Promise((r) => setTimeout(r, paus));
    const r = await hamta(u, { headers: { Authorization: `Bearer ${nyckel}` }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`GoatCounter svarade ${r.status}`);
    const json = await r.json();
    const nya = (json.hits ?? []).filter((h) => !sedda.has(h.path_id));
    for (const h of nya) { sedda.add(h.path_id); ut.push(h); }
    if (!json.more || !nya.length) break;
  }
  return ut;
}

/** Besöken per sida, utan händelserna. */
export function besokPerSida(hits) {
  const ut = new Map();
  for (const h of hits) {
    if (h.event || !h.path) continue;
    const sida = h.path.replace(/\/$/, '') || '/';
    ut.set(sida, (ut.get(sida) ?? 0) + (h.count ?? 0));
  }
  return ut;
}

// Det som kom under månaden: dagen då posten mejlades första gången (lagret utskick, fältet kom). En artikel och en metod i Metoder
// har också ett datum som går att lita på. En metod i Stödundervisning har bara dagen den senast ändrades, så den räknas bara med kom.
function komIManaden(p, kom, manad) {
  const dag = kom?.[p.url] ?? (p.typ === 'artikel' || p.url.startsWith('/metoder/') || p.typ === 'verktyg' ? p.datum : undefined);
  return !!dag && dag.startsWith(manad.nyckel);
}

/** Brevets innehåll ur månadens besök och allt som är publicerat. */
export function manadensBrev({ besok, poster, kom, manad }) {
  const med = poster.map((p) => ({ ...p, besok: besok.get(p.url) ?? 0 }));
  const i = (k) => med.filter((p) => p.url.startsWith(k.bas) && p.besok > 0).sort((a, b) => b.besok - a.besok || a.titel.localeCompare(b.titel, 'sv'));
  const listor = KATEGORIER.map((k) => ({ namn: k.namn, url: k.url, rader: i(k).slice(0, 3).map((p) => ({ titel: p.titel, rad: p.rad, url: p.url, bild: k.namn === 'Böcker' ? p.bild : undefined, besok: p.besok })) })).filter((l) => l.rader.length);
  const metoderna = [...i(KATEGORIER[0]), ...i(KATEGORIER[1])].sort((a, b) => b.besok - a.besok);
  const kandidat = med.filter((p) => p.besok > 0 && komIManaden(p, kom, manad)).sort((a, b) => b.besok - a.besok)[0];
  let nyast;
  if (kandidat) {
    const k = KATEGORIER.find((x) => kandidat.url.startsWith(x.bas));
    const bland = k ? i(k).slice(0, 3).some((p) => p.url === kandidat.url) : false;
    const etta = k ? (k.en === 'metod' ? metoderna : i(k))[0]?.url === kandidat.url : false;
    const rad = etta ? `Blev månadens mest lästa ${k.en}.` : bland ? `Blev direkt en av de mest lästa ${k.ord}.` : 'Lästes mest av det som var nytt.';
    nyast = { etikett: `Nytt i ${manad.namn}`, typ: kandidat.typ, text: kandidat.text, ord: kandidat.ord, titel: kandidat.titel, url: kandidat.url, ingress: meningarna(kandidat.brod ?? kandidat.ingress).slice(0, 2).join(' ') || kandidat.ingress, bild: kandidat.typ === 'bok' ? undefined : kandidat.bild, rad };
  }
  const text = texter[manad.namn];
  const [forsta, ...resten] = meningarna(text);
  const alla = [...besok.values()].reduce((s, n) => s + n, 0);
  const summa = alla >= 1000 ? `Sajtens sidor hade över ${String(Math.floor(alla / 1000)).replace(/\B(?=(\d{3})+$)/g, ' ')} 000 besök i ${manad.namn}.` : undefined;
  const [a, b] = metoderna;
  return {
    amne: `Månadsbrev: mest läst i ${manad.namn}`,
    manad: `Månadsbrev, ${manad.namn} ${manad.ar}`,
    manadsnamn: manad.namn,
    forsta,
    text: resten.join(' '),
    pre: resten[0] ?? forsta,
    // Är den mest lästa också månadens nya säger blocket det, och brevet behöver inte säga samma sak raden före.
    mest: a && a.url !== nyast?.url ? [a, b].filter(Boolean).map((p) => ({ titel: p.titel, url: p.url })) : undefined,
    mestOrd: b && b.besok >= 0.8 * a.besok ? 'tätt följd av' : 'följd av',
    summa,
    nyast,
    listor,
  };
}

/** Läser nytt.json; samma som lasNytt men med en hämtning som går att härma. */
async function lasPoster(sajt, hamta) {
  const r = await hamta(`${sajt}/nytt.json`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error(`nytt.json svarade ${r.status}`);
  return (await r.json()).poster;
}

/** Säger till Niclas när brevet inte gick ut, så att felet inte syns först när någon saknar brevet. */
async function sagTill(fel, manad, nyckel) {
  await brevo('/smtp/email', { sender: AVSANDARE, to: [{ email: SVAR_TILL }], subject: `Månadsbrevet för ${manad.namn} gick inte ut`, textContent: `Månadsbrevet för ${manad.namn} kunde inte skapas.\n\n${fel}\n\nFunktionen manadsbrev försöker igen de två nästa dagarna. Loggen finns hos Netlify, och DRIFT.md under Brevo säger hur brevet skickas för hand.` }, nyckel).catch(() => {});
}

/** Månadens kampanj i Brevo, om den finns: { id, status }. Listan är sanningen, också när en körning stannade mitt i. */
async function kampanjen(nyckel, namn) {
  const svar = await brevoLas('/emailCampaigns?type=classic&limit=50&sort=desc&excludeHtmlContent=true', nyckel);
  return (svar.campaigns ?? []).find((k) => k.name?.startsWith(`${namn}:`));
}

/**
 * Månadens brev från funktionen. Det skickas en gång: finns kampanjen redan i Brevo tas den om hand i stället för att en ny skapas,
 * och ett fel före utskicket försöks igen nästa körning, den 2 och 3. prov: true läser allt och bygger brevet, men skickar inget
 * och skriver inget. Tiden är räknad så att allt hinner inom Netlifys 30 sekunder: GoatCounter högst 15, och varje anrop har sin gräns.
 */
export async function skickaManadsbrev({ sajt, lager, brevoNyckel, listId, gcNyckel, nu = new Date(), hamta = fetch, prov = false, paus = 300 }) {
  const manad = forraManaden(nu);
  const namn = `Månadsbrev ${manad.nyckel}`;
  let logg = {};
  try {
    logg = (await lager.get('manadsbrev', { type: 'json' })) ?? {};
    const forut = logg[manad.nyckel];
    if (forut && ['skickad', 'schemalagd'].includes(forut.status)) return { steg: `redan gjort: ${forut.status}`, manad: manad.nyckel, kampanj: forut.kampanj };
    const saknas = [!gcNyckel && 'GC_LASNYCKEL', !brevoNyckel && 'BREVO_API_KEY', !listId && 'BREVO_LIST_ID'].filter(Boolean);
    if (saknas.length) throw new Error(`Miljövariabler saknas: ${saknas.join(', ')}`);
    const finns = await kampanjen(brevoNyckel, namn);
    if (finns && finns.status !== 'draft') {
      if (!prov) {
        logg[manad.nyckel] = { status: 'skickad', datum: nu.toISOString(), kampanj: finns.id };
        await lager.setJSON('manadsbrev', logg);
        if (finns.status === 'suspended') await sagTill(`Kampanj ${finns.id} är stoppad i Brevo. Dagsgränsen kan ha tagit slut.`, manad, brevoNyckel);
      }
      return { steg: `redan gjort: kampanj ${finns.id} har status ${finns.status}`, manad: manad.nyckel, kampanj: finns.id };
    }
    const hits = await hamtaHits(gcNyckel, { start: manad.start, slut: manad.slut, hamta, paus });
    const poster = await lasPoster(sajt, hamta);
    const skickat = (await lager.get('skickat', { type: 'json' })) ?? {};
    const brevet = manadensBrev({ besok: besokPerSida(hits), poster, kom: skickat.kom, manad });
    if (!brevet.listor.length) throw new Error('GoatCounter gav inga besök på sajtens poster');
    const html = manadsMejl(brevet, sajt);
    const { kvar, behov, kand } = await dagensUtrymme(brevoNyckel, listId);
    if (!kand) throw new Error('Brevos dagsrest och listan gick inte att läsa');
    if (behov > DAGSGRANS) throw new Error(`Listan har ${behov} kontakter, fler än de ${DAGSGRANS} mejl som gratisplanen tar om dagen`);
    const bokat = skickat.bokat ?? {};
    const tid = ledigTid({ nu, kvar, behov, bokat });
    const sammanfattning = { manad: manad.nyckel, amne: brevet.amne, tid: tid ?? 'nu', behov, kvar, listor: brevet.listor.map((l) => `${l.namn}: ${l.rader.map((r) => r.titel).join(', ')}`), nyast: brevet.nyast?.titel, kb: Math.round(Buffer.byteLength(html) / 1024) };
    if (prov) return { steg: 'prov: inget skickat', ...sammanfattning };
    const kampanjens = { subject: brevet.amne, previewText: brevet.pre, sender: AVSANDARE, replyTo: SVAR_TILL, htmlContent: html, recipients: { listIds: [Number(listId)] } };
    const id = finns?.id ?? (await brevo('/emailCampaigns', { name: `${namn}: ${brevet.amne}`, ...kampanjens }, brevoNyckel)).id;
    logg[manad.nyckel] = { status: 'skapad', datum: nu.toISOString(), kampanj: id };
    await lager.setJSON('manadsbrev', logg);
    if (tid) {
      await brevoAndra(`/emailCampaigns/${id}`, { scheduledAt: tid }, brevoNyckel);
      await lager.setJSON('skickat', { ...skickat, bokat: { ...bokat, [tid.slice(0, 10)]: (bokat[tid.slice(0, 10)] ?? 0) + behov } });
    } else {
      await brevo(`/emailCampaigns/${id}/sendNow`, {}, brevoNyckel);
    }
    logg[manad.nyckel] = { status: tid ? 'schemalagd' : 'skickad', datum: nu.toISOString(), kampanj: id, tid: tid ?? undefined };
    await lager.setJSON('manadsbrev', logg);
    return { steg: tid ? `månadsbrevet schemalagt till ${tid}` : 'månadsbrevet skickat', kampanj: id, ...sammanfattning };
  } catch (fel) {
    const text = String(fel?.message ?? fel).slice(0, 300);
    if (prov) return { steg: 'prov: FEL', fel: text, manad: manad.nyckel };
    // Nästa körning läser Brevos lista och skickar aldrig två gånger, så ett fel går att försöka igen, också efter kampanjen.
    const kampanj = logg[manad.nyckel]?.kampanj;
    logg[manad.nyckel] = { status: 'fel', datum: nu.toISOString(), fel: text, kampanj };
    await Promise.resolve(lager.setJSON('manadsbrev', logg)).catch(() => {});
    await sagTill(text, manad, brevoNyckel);
    throw fel;
  }
}
