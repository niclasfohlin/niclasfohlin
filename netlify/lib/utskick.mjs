// Mejl till prenumeranterna om nytt innehåll. Används av byggpluginen netlify/plugins/utskick. Mejlens form står i netlify/lib/mejl.mjs.
//
// Tar listan över allt som är publicerat (nytt.json), jämför med det som redan mejlats i lagret
// (Netlify Blobs, lagret "utskick", nyckeln "skickat") och skickar en Brevo-kampanj till listan om
// det som tillkommit. Första körningen registrerar allt som redan ligger ute utan att skicka,
// så att en ny rigg aldrig mejlar hela arkivet.

import { postMejl } from './mejl.mjs';

// Avsändaren ligger på den egna domänen, som är autentiserad i Brevo (DKIM och DMARC via Loopias DNS).
// Adressen har ingen brevlåda: svar går till Niclas vanliga adress via reply-to.
export const AVSANDARE = { name: 'Niclas Fohlin', email: 'nyhetsbrev@niclasfohlin.se' };
export const SVAR_TILL = 'niclas.fohlin@gmail.com';

// Sändtiden (Niclas 2026-11-03: "Jag vill att Brevo kampanjer aldrig skickas mellan 21-07. Från 0700 på morgonen och senast
// till 21. Om något laddas upp nattetid läggs Brevo till skicka ut 0700."): utanför 07.00–21.00 svensk tid ger sandtid
// nästa 07.00 med tidszonen, som Brevos scheduledAt tar emot (2017-06-01T12:30:00+02:00 i Brevos dokumentation), och inom
// tiden null, så skickas kampanjen direkt. Används också av scripts/brevo.mjs.
const svenskt = (d) => Object.fromEntries(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset' }).formatToParts(d).map((x) => [x.type, x.value]));
export const svensktDatum = (d) => { const s = svenskt(d); return `${s.year}-${s.month}-${s.day}`; };
export const inomSandtiden = (tid) => { const timme = Number(svenskt(tid).hour); return timme >= 7 && timme < 21; };
export function sandtid(nu = new Date()) {
  if (inomSandtiden(nu)) return null;
  const timme = Number(svenskt(nu).hour);
  // Dagen och tidszonen för den 07.00 som kommer: i morgon efter 21, annars i dag. Tidszonen läses kring 07.00 den dagen,
  // så att en natt när sommartiden börjar eller slutar ger rätt tid.
  const kring = new Date(nu.getTime() + (timme >= 21 ? 31 - timme : 8 - timme) * 3600e3);
  const d = svenskt(kring);
  const zon = d.timeZoneName.replace('GMT', '') || '+00:00';
  // En tid som har passerat när Brevo tar emot kampanjen ger ett fel, så minuterna före 07.00 ger 07.10 (andra ögat på
  // Strategier 2026-11-03).
  const sju = `${d.year}-${d.month}-${d.day}T07:00:00${zon}`;
  return new Date(sju).getTime() - nu.getTime() < 5 * 60e3 ? sju.replace('T07:00', 'T07:10') : sju;
}

// Brevos gräns på gratisplanen, 300 mejl om dagen (K-731). Kampanj 34 stannade 2026-11-04 efter 16 av 141 mottagare, eftersom två
// kampanjer samma morgon hade tagit 282, och med omkring 150 prenumeranter får bara en kampanj plats om dagen. Därför läser
// utskicket vad som är kvar i dag, och en kampanj som inte ryms går till nästa morgon med plats. bokat säger hur många mejl som redan
// ligger schemalagda en viss dag.
export const DAGSGRANS = 300;
const morgonen = (dag) => `${dag}T07:00:00${svenskt(new Date(`${dag}T12:00:00Z`)).timeZoneName.replace('GMT', '') || '+00:00'}`;
const dagenEfter = (dag) => new Date(Date.parse(`${dag}T12:00:00Z`) + 86400e3).toISOString().slice(0, 10);
/** När kampanjen kan gå: null när den får plats nu, annars tiden med tidszon, som scheduledAt. */
export function ledigTid({ nu = new Date(), kvar = Infinity, behov = 0, bokat = {} }) {
  const idag = svensktDatum(nu);
  const forst = sandtid(nu);
  // Dagens plats är Brevos rest, och morgonens bokningar räknas som väntande tills de har gått. Sedan står de i resten.
  const vantar = nu.getTime() < Date.parse(morgonen(idag)) + 15 * 60e3 ? bokat[idag] ?? 0 : 0;
  const plats = (dag) => (dag === idag ? kvar - vantar : DAGSGRANS - (bokat[dag] ?? 0));
  if (!forst && plats(idag) >= behov) return null;
  let tid = forst ?? morgonen(dagenEfter(idag));
  for (let i = 0; i < 31; i++) {
    const dag = tid.slice(0, 10);
    if (plats(dag) >= behov) return tid;
    tid = morgonen(dagenEfter(dag));
  }
  return forst ?? morgonen(dagenEfter(idag));
}
/** Dagens återstående mejl och listans storlek. Går de inte att läsa är kand false, och en kampanj väntar till nästa morgon. */
export async function dagensUtrymme(nyckel, listId) {
  try {
    // Listans egna räknare släpar efter i Brevo och kan visa 0, så antalet läses ur kontakterna (scripts/brevo.mjs).
    const [konto, lista] = await Promise.all([brevoLas('/account', nyckel), brevoLas(`/contacts/lists/${listId}/contacts?limit=1`, nyckel)]);
    const dagens = (konto.plan ?? []).find((p) => p.creditsType === 'sendLimit');
    return { kvar: dagens ? dagens.credits : Infinity, behov: lista.count ?? 0, kand: true };
  } catch (fel) {
    console.log(`utskick: Brevos utrymme gick inte att läsa: ${fel?.message ?? fel}`);
    return { kvar: 0, behov: 160, kand: false };
  }
}

// Nya verktyg får ett eget utskick, skilt från nya texter och metoder (Niclas 2026-11-03: "Ett Brevo för metoden och ett
// Brevo för två verktygen").
export const utskicken = (nya) => [nya.filter((p) => p.typ !== 'verktyg'), nya.filter((p) => p.typ === 'verktyg')].filter((g) => g.length);

// En serie (Ljudlek i grupp) är en generell metod med lektioner som egna poster. Är den generella metoden ny står
// lektionerna under den, som en rad med länkar, och räknas inte som egna inlägg; en lektion som kommer senare står för
// sig som en nyhet i serien (etiketten Ny lektion i … kommer från nytt.json).
export function grupperaNya(nya) {
  const urler = new Set(nya.map((p) => p.url));
  const lektioner = new Map();
  for (const p of nya) if (p.serie && urler.has(p.serie.url)) lektioner.set(p.serie.url, [...(lektioner.get(p.serie.url) ?? []), p]);
  // Lektionerna i bankens ordning (ordning ur nytt.json).
  for (const lista of lektioner.values()) lista.sort((a, b) => (a.ordning ?? 0) - (b.ordning ?? 0));
  return nya.filter((p) => !(p.serie && urler.has(p.serie.url))).map((p) => (lektioner.has(p.url) ? { ...p, lektioner: lektioner.get(p.url) } : p));
}

// Mejlet, i standardens form (netlify/lib/mejl.mjs). En ny text har mallen med texttypen, tidningen och datumet, rubriken, citatet,
// ingressen, Läs hela krönikan och originalet (Niclas 2026-11-04), och en serie står som en helhet med sina lektioner.
export const brev = (nya, sajt, o) => postMejl(grupperaNya(nya), sajt, o);

export async function brevoLas(sokvag, nyckel) {
  const res = await fetch(`https://api.brevo.com/v3${sokvag}`, { headers: { 'api-key': nyckel, Accept: 'application/json' }, signal: AbortSignal.timeout(6000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`Brevo ${sokvag} svarade ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

export async function brevoAndra(sokvag, body, nyckel) {
  const res = await fetch(`https://api.brevo.com/v3${sokvag}`, { method: 'PUT', headers: { 'api-key': nyckel, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Brevo ${sokvag} svarade ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export async function brevo(sokvag, body, nyckel) {
  const res = await fetch(`https://api.brevo.com/v3${sokvag}`, {
    method: 'POST',
    headers: { 'api-key': nyckel, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Brevo ${sokvag} svarade ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

// Läser nytt.json från en adress, helst deployens egen (permalänken) så att det är den nya
// versionen. Några omförsök om svaret ännu inte är JSON.
export async function lasNytt(bas) {
  let senast = '';
  for (let forsok = 1; forsok <= 5; forsok++) {
    const res = await fetch(`${bas}/nytt.json`, { cache: 'no-store', headers: { Accept: 'application/json' } });
    const typ = res.headers.get('content-type') ?? '';
    if (res.ok && typ.includes('json')) return res.json();
    senast = `${res.status} ${typ}`;
    await new Promise((r) => setTimeout(r, 1500 * forsok));
  }
  throw new Error(`nytt.json gick inte att läsa från ${bas}: ${senast}`);
}

/**
 * @param {object} arg
 * @param {Array<{url: string, titel: string, ingress: string, etikett: string}>} arg.poster allt som är publicerat
 * @param {string} arg.sajt publik adress utan avslutande snedstreck
 * @param {{ get: Function, setJSON: Function }} arg.lager Netlify Blobs-lagret "utskick"
 * @param {string | undefined} arg.brevoNyckel
 * @param {string | undefined} arg.listId
 * @returns {Promise<{steg: string, antal?: number, nya?: string[], kampanj?: number}>}
 */
export async function mejlaNytt({ poster, sajt, lager, brevoNyckel, listId, nu = new Date() }) {
  const skickat = await lager.get('skickat', { type: 'json' });
  if (!skickat) {
    await lager.setJSON('skickat', { urler: poster.map((p) => p.url), initierad: new Date().toISOString() });
    return { steg: 'första körningen: registrerade utan utskick', antal: poster.length };
  }

  const kanda = new Set(skickat.urler);
  const nya = poster.filter((p) => !kanda.has(p.url));
  if (nya.length === 0) return { steg: 'inget nytt', antal: poster.length };
  if (!brevoNyckel || !listId) return { steg: 'nytt finns men Brevo saknas', nya: nya.map((p) => p.url) };

  // Registrera först, skicka sedan. Misslyckas registreringen skickas inget och nästa körning
  // försöker igen. Misslyckas sändningen skickar nästa körning inte samma innehåll en gång till:
  // kampanjen står i lagret med status avbruten och får i så fall skickas för hand i Brevo.
  // kom är dagen då posten kom till sajten, som månadsbrevets Månadens nya läser (netlify/lib/manadsbrev.mjs).
  const urler = [...skickat.urler, ...nya.map((p) => p.url)];
  const idag = svensktDatum(nu);
  const kom = { ...skickat.kom, ...Object.fromEntries(nya.map((p) => [p.url, idag])) };
  const utrymme = await dagensUtrymme(brevoNyckel, listId);
  let kvar = utrymme.kvar;
  const { behov } = utrymme;
  const bokat = Object.fromEntries(Object.entries(skickat.bokat ?? {}).filter(([dag]) => dag >= idag));
  const senast = { datum: nu.toISOString(), poster: nya.map((p) => p.url), status: 'skapar', kampanj: undefined, kampanjer: [], schemalagd: undefined, fel: undefined };
  const spara = () => lager.setJSON('skickat', { urler, initierad: skickat.initierad, senast, kom, bokat });
  await spara();

  try {
    // Ett utskick för nya texter och metoder och ett för nya verktyg (utskicken), schemalagt till 07.00 utanför sändtiden och till
    // nästa morgon med plats när dagens mejl inte räcker (ledigTid).
    for (const grupp of utskicken(nya)) {
      const tid = ledigTid({ nu, kvar, behov, bokat });
      // En serie med sina lektioner är ett inlägg i ämnesraden: Nytt på niclasfohlin.se: Ljudlek i grupp.
      const grupper = grupperaNya(grupp);
      const verktyg = grupp[0].typ === 'verktyg';
      const titlar = grupper.map((p) => p.titel);
      const amne = verktyg
        ? `${grupper.length === 1 ? 'Nytt verktyg' : 'Nya verktyg'} på niclasfohlin.se: ${titlar.length === 1 ? titlar[0] : `${titlar.slice(0, -1).join(', ')} och ${titlar.at(-1)}`}`
        : grupper.length === 1 ? `${grupper[0].amne ?? grupper[0].text?.amne ?? 'Nytt på niclasfohlin.se'}: ${titlar[0]}` : `Nytt på niclasfohlin.se: ${grupper.length} nya inlägg`;
      const kampanj = await brevo('/emailCampaigns', {
        name: `Nytt ${nu.toISOString().slice(0, 16)}: ${titlar.join(' | ').slice(0, 120)}`,
        subject: amne,
        previewText: grupper[0].ingress,
        sender: AVSANDARE,
        replyTo: SVAR_TILL,
        htmlContent: brev(grupp, sajt, { titel: amne, pre: grupper[0].ingress }),
        recipients: { listIds: [Number(listId)] },
        ...(tid ? { scheduledAt: tid } : {}),
      }, brevoNyckel);
      senast.kampanj = kampanj.id;
      senast.kampanjer.push(kampanj.id);
      senast.status = 'skapad';
      if (tid) {
        bokat[tid.slice(0, 10)] = (bokat[tid.slice(0, 10)] ?? 0) + behov;
        senast.schemalagd = tid;
      } else {
        kvar -= behov;
      }
      await spara();
      if (!tid) await brevo(`/emailCampaigns/${kampanj.id}/sendNow`, {}, brevoNyckel);
    }
    senast.status = senast.schemalagd ? 'schemalagd' : 'skickad';
    await spara();
    return { steg: senast.schemalagd ? `kampanj schemalagd till ${senast.schemalagd}` : 'kampanj skickad', kampanj: senast.kampanj, kampanjer: senast.kampanjer, nya: senast.poster };
  } catch (fel) {
    senast.status = 'avbruten';
    senast.fel = String(fel?.message ?? fel).slice(0, 300);
    await spara().catch(() => {});
    throw fel;
  }
}
