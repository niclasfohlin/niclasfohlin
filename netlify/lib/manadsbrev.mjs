// Månadsbrevet (K-730; Niclas 2026-11-07: "topp tre ... i de fyra kategorierna och den nyaste som kommit senaste månaden som lästs
// mest", "dra ur statistik från goatcounter samt lite mysig text som skriver om månaden. Släpp den den 1 varje månad", och "se till
// att allt sker automatiskt"). Går ut av sig självt från netlify/functions/manadsbrev.mjs. Den här filen hämtar månadens siffror,
// räknar ut brevets innehåll och skickar det; formen står i netlify/lib/mejl.mjs. Allt går att köra med en härmad hämtning, så att
// scripts/utskicksprov.mjs kan pröva det, och netlify/functions/manadsbrev-koll.mjs provkör det hos Netlify utan att skicka.
import { meningarna } from '../../src/lib/standard/text.js';
import texter from '../../src/data/manadsbrev.json' with { type: 'json' };
import { periodensBesok, sidornasBesok } from './goatcounter.mjs';
import { manadsMejl } from './mejl.mjs';
import { AVSANDARE, DAGSGRANS, SVAR_TILL, brevo, brevoAndra, brevoLas, dagensUtrymme, ledigTid, svensktDatum } from './utskick.mjs';

const MANADER = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
// Orden i brevet per slag av post. Listorna är samlingarna ur roten (src/lib/samlingar.ts, via nytt.json), så en ny samling kommer med.
const ORDEN = { metod: ['metod', 'metoderna'], artikel: ['text', 'texterna'], bok: ['bok', 'böckerna'] };
// Besöken på posterna var 46 procent av alla besök i oktober 2026. Är andelen under en tiondel läser brevet fel, och då går det inte ut.
const MINSTA_ANDEL = 0.1;
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

// Det som kom under månaden: dagen då posten mejlades första gången (lagret utskick, fältet kom). En artikel och en metod i Metoder
// har också ett datum som går att lita på. En metod i Stödundervisning har bara dagen den senast ändrades, så den räknas bara med kom.
function komIManaden(p, kom, manad) {
  const dag = kom?.[p.url] ?? (p.typ === 'artikel' || p.url.startsWith('/metoder/') || p.typ === 'verktyg' ? p.datum : undefined);
  return !!dag && dag.startsWith(manad.nyckel);
}

/**
 * Brevets innehåll ur månadens besök och allt som är publicerat. En post räknas efter besöken på postens egen sida, som på
 * statistiksidan. summa är alla besök i månaden, också på sidor som inte är poster.
 */
export function manadensBrev({ besok, poster, samlingar, summa: allaBesok, kom, manad }) {
  const med = poster.map((p) => ({ ...p, besok: besok.get(p.url) ?? 0 })).filter((p) => p.besok > 0).sort((a, b) => b.besok - a.besok || a.titel.localeCompare(b.titel, 'sv'));
  const iSamlingen = (s) => med.filter((p) => p.url.startsWith(`/${s.led}/`));
  const listor = samlingar.map((s) => ({ namn: s.namn, url: `/${s.led}`, rader: iSamlingen(s).slice(0, 3).map((p) => ({ titel: p.titel, rad: p.rad, url: p.url, bild: p.typ === 'bok' ? p.bild : undefined, besok: p.besok })) })).filter((l) => l.rader.length);
  const metoderna = med.filter((p) => p.typ === 'metod');
  const kandidat = med.find((p) => komIManaden(p, kom, manad));
  let nyast;
  if (kandidat) {
    const [en, flera] = ORDEN[kandidat.typ] ?? [];
    const sin = samlingar.find((s) => kandidat.url.startsWith(`/${s.led}/`));
    const bland = !!sin && iSamlingen(sin).slice(0, 3).some((p) => p.url === kandidat.url);
    const etta = med.find((p) => p.typ === kandidat.typ)?.url === kandidat.url;
    const rad = en && etta ? `Blev månadens mest lästa ${en}.` : en && bland ? `Blev direkt en av de mest lästa ${flera}.` : 'Lästes mest av det som var nytt.';
    nyast = { etikett: `Nytt i ${manad.namn}`, typ: kandidat.typ, text: kandidat.text, ord: kandidat.ord, titel: kandidat.titel, url: kandidat.url, ingress: meningarna(kandidat.brod || kandidat.ingress).slice(0, 2).join(' ') || kandidat.ingress, bild: kandidat.typ === 'bok' ? undefined : kandidat.bild, rad };
  }
  const text = texter[manad.namn];
  const [forsta, ...resten] = meningarna(text);
  const alla = allaBesok ?? [...besok.values()].reduce((s, n) => s + n, 0);
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

/** Läser nytt.json: posterna och samlingarna ur roten, med en hämtning som går att härma. */
async function lasNyttet(sajt, hamta) {
  const r = await hamta(`${sajt}/nytt.json`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error(`nytt.json svarade ${r.status}`);
  const { poster, samlingar } = await r.json();
  if (!poster?.length || !samlingar?.length) throw new Error('nytt.json saknar poster eller samlingar');
  return { poster, samlingar };
}

/** Säger till Niclas när brevet inte gick ut, så att felet inte syns först när någon saknar brevet. */
async function sagTill(fel, manad, nyckel) {
  return brevo('/smtp/email', { sender: AVSANDARE, to: [{ email: SVAR_TILL }], subject: `Månadsbrevet för ${manad.namn} gick inte ut`, textContent: `Månadsbrevet för ${manad.namn} kunde inte skapas.\n\n${fel}\n\nFunktionen manadsbrev försöker igen de två nästa dagarna. Loggen finns hos Netlify, och DRIFT.md under Brevo säger hur brevet skickas för hand.` }, nyckel).then(() => true, () => false);
}

/** Månadens kampanj i Brevo, om den finns: { id, status }. Den sparade kampanjen först, annars de senaste 50, vilket räcker de tre dagar som funktionen körs. */
async function kampanjen(nyckel, namn, id) {
  if (id) return { id, status: (await brevoLas(`/emailCampaigns/${id}?excludeHtmlContent=true`, nyckel)).status };
  const svar = await brevoLas('/emailCampaigns?type=classic&limit=50&sort=desc&excludeHtmlContent=true', nyckel);
  return (svar.campaigns ?? []).find((k) => k.name?.startsWith(`${namn}:`));
}
// En kampanj med någon av de här statusarna har gått eller går av sig själv. En stoppad eller avbruten kampanj behöver Niclas.
const GAR = ['sent', 'queued', 'in_process', 'in_review', 'archive'];
// Tiden för allt före utskicket: efter den stannar körningen med besked, så att beskedet hinner gå inom Netlifys 30 sekunder.
const TIDSBUDGET = 20000;

/**
 * Månadens brev från funktionen. Det skickas en gång: finns kampanjen redan i Brevo tas den om hand i stället för att en ny skapas,
 * och ett fel före utskicket försöks igen nästa körning, den 2 och 3. prov: true läser allt och bygger brevet, men skickar inget
 * och skriver inget. Tiden är räknad så att allt hinner inom Netlifys 30 sekunder: GoatCounter högst 15, och varje anrop har sin gräns.
 */
export async function skickaManadsbrev({ sajt, lager, brevoNyckel, listId, gcNyckel, nu = new Date(), hamta = fetch, prov = false, paus = 300 }) {
  const manad = forraManaden(nu);
  const namn = `Månadsbrev ${manad.nyckel}`;
  const borjan = Date.now();
  let logg = {};
  try {
    logg = (await lager.get('manadsbrev', { type: 'json' })) ?? {};
    const forut = logg[manad.nyckel];
    const saknas = [!gcNyckel && 'GC_LASNYCKEL', !brevoNyckel && 'BREVO_API_KEY', !listId && 'BREVO_LIST_ID'].filter(Boolean);
    if (saknas.length) throw new Error(`Miljövariabler saknas: ${saknas.join(', ')}`);
    // Brevo är sanningen om vad som har hänt: också en kampanj som var schemalagd i går kan ha stoppats.
    const finns = await kampanjen(brevoNyckel, namn, forut?.kampanj);
    if (finns && finns.status !== 'draft') {
      const gar = GAR.includes(finns.status);
      if (!prov) {
        const larmad = forut?.larmad || (!gar && (await sagTill(`Kampanj ${finns.id} har status ${finns.status} i Brevo. Dagsgränsen kan ha tagit slut, och brevet behöver skickas för hand.`, manad, brevoNyckel)));
        logg[manad.nyckel] = { ...forut, status: gar ? forut?.status === 'schemalagd' ? 'schemalagd' : 'skickad' : 'stoppad', kampanj: finns.id, larmad: !!larmad };
        await lager.setJSON('manadsbrev', logg);
      }
      return { steg: `redan gjort: kampanj ${finns.id} har status ${finns.status}`, manad: manad.nyckel, kampanj: finns.id };
    }
    const { poster, samlingar } = await lasNyttet(sajt, hamta);
    const period = { start: manad.start, slut: manad.slut, hamta };
    const besok = await sidornasBesok(gcNyckel, poster.map((p) => p.url), { ...period, paus });
    const allaBesok = await periodensBesok(gcNyckel, period);
    const posternas = [...besok.values()].reduce((s, n) => s + n, 0);
    if (!allaBesok || posternas < MINSTA_ANDEL * allaBesok) throw new Error(`GoatCounter gav ${posternas} besök på posterna av ${allaBesok} i allt, vilket inte är rimligt`);
    const skickat = (await lager.get('skickat', { type: 'json' })) ?? {};
    const brevet = manadensBrev({ besok, poster, samlingar, summa: allaBesok, kom: skickat.kom, manad });
    const html = manadsMejl(brevet, sajt);
    const { kvar, behov, kand } = await dagensUtrymme(brevoNyckel, listId);
    if (!kand) throw new Error('Brevos dagsrest och listan gick inte att läsa');
    if (behov > DAGSGRANS) throw new Error(`Listan har ${behov} kontakter, fler än de ${DAGSGRANS} mejl som gratisplanen tar om dagen`);
    const bokat = skickat.bokat ?? {};
    const tid = ledigTid({ nu, kvar, behov, bokat });
    const sammanfattning = { manad: manad.nyckel, amne: brevet.amne, tid: tid ?? 'nu', behov, kvar, besok: allaBesok, posternas, listor: brevet.listor.map((l) => `${l.namn}: ${l.rader.map((r) => r.titel).join(', ')}`), nyast: brevet.nyast?.titel, kb: Math.round(Buffer.byteLength(html) / 1024) };
    if (prov) return { steg: 'prov: inget skickat', ...sammanfattning };
    if (Date.now() - borjan > TIDSBUDGET) throw new Error('Läsningen tog för lång tid, så brevet väntar till nästa körning');
    const kampanjens = { subject: brevet.amne, previewText: brevet.pre, sender: AVSANDARE, replyTo: SVAR_TILL, htmlContent: html, recipients: { listIds: [Number(listId)] } };
    const id = finns?.id ?? (await brevo('/emailCampaigns', { name: `${namn}: ${brevet.amne}`, ...kampanjens }, brevoNyckel)).id;
    logg[manad.nyckel] = { status: 'skapad', datum: nu.toISOString(), kampanj: id };
    await lager.setJSON('manadsbrev', logg);
    if (tid) {
      // Platsen bokas före tiden, så att en körning som stannar emellan aldrig lämnar en kampanj utan bokning.
      await lager.setJSON('skickat', { ...skickat, bokat: { ...bokat, [tid.slice(0, 10)]: (bokat[tid.slice(0, 10)] ?? 0) + behov } });
      await brevoAndra(`/emailCampaigns/${id}`, { scheduledAt: tid }, brevoNyckel);
    } else {
      await brevo(`/emailCampaigns/${id}/sendNow`, {}, brevoNyckel);
    }
    // Månadens tal sparas med brevet, så att de finns kvar oberoende av GoatCounter och går att jämföra över åren.
    const siffror = { besok: allaBesok, posternas, listor: brevet.listor.map((l) => ({ namn: l.namn, rader: l.rader.map((r) => ({ url: r.url, besok: r.besok })) })), nyast: brevet.nyast?.url };
    logg[manad.nyckel] = { status: tid ? 'schemalagd' : 'skickad', datum: nu.toISOString(), kampanj: id, tid: tid ?? undefined, siffror };
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
