// Mejl till prenumeranterna om nytt innehåll. Används av byggpluginen netlify/plugins/utskick.
//
// Tar listan över allt som är publicerat (nytt.json), jämför med det som redan mejlats i lagret
// (Netlify Blobs, lagret "utskick", nyckeln "skickat") och skickar en Brevo-kampanj till listan om
// det som tillkommit. Första körningen registrerar allt som redan ligger ute utan att skicka,
// så att en ny rigg aldrig mejlar hela arkivet.

// Avsändaren ligger på den egna domänen, som är autentiserad i Brevo (DKIM och DMARC via Loopias DNS).
// Adressen har ingen brevlåda: svar går till Niclas vanliga adress via reply-to.
const AVSANDARE = { name: 'Niclas Fohlin', email: 'nyhetsbrev@niclasfohlin.se' };
const SVAR_TILL = 'niclas.fohlin@gmail.com';

const html = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Sändtiden (Niclas 2026-11-03: "Jag vill att Brevo kampanjer aldrig skickas mellan 21-07. Från 0700 på morgonen och senast
// till 21. Om något laddas upp nattetid läggs Brevo till skicka ut 0700."): utanför 07.00–21.00 svensk tid ger sandtid
// nästa 07.00 med tidszonen, som Brevos scheduledAt tar emot (2017-06-01T12:30:00+02:00 i Brevos dokumentation), och inom
// tiden null, så skickas kampanjen direkt. Används också av scripts/brevo.mjs.
const svenskt = (d) => Object.fromEntries(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset' }).formatToParts(d).map((x) => [x.type, x.value]));
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

// En post kan ha egna rader med länkar efter ingressen (lankar i nytt.json), som en metods centrala saker (src/lib/centrala.ts).
export function brev(nya, sajt) {
  const lank = (p, text) => `<a href="${sajt}${p.url}" style="color:#2f5d50;">${html(text)}</a>`;
  const delar = grupperaNya(nya).map((p) => `
    <p style="margin:0 0 4px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px;color:#5a635e;">${html(p.etikett)}</p>
    <h2 style="margin:0 0 8px;font-size:22px;line-height:1.25;"><a href="${sajt}${p.url}" style="color:#18221d;text-decoration:none;">${html(p.titel)}</a></h2>
    <p style="margin:0 0 12px;">${html(p.ingress)}</p>${(p.lankar ?? []).map((l) => `
    <p style="margin:0 0 12px;">${lank(l, l.text)}${l.efter ? `: ${html(l.efter)}` : ''}.</p>`).join('')}${p.lektioner?.length ? `
    <p style="margin:0 0 12px;">${p.lektioner.length === 1 ? `Med ${p.lektioner[0].ord?.den ?? 'lektionen'}` : `Med ${p.lektioner.length} ${p.lektioner[0].ord?.flera ?? 'lektioner'}`}: ${p.lektioner.map((l) => lank(l, l.namn ?? l.titel)).join(', ')}.</p>` : ''}
    <p style="margin:0 0 28px;">${lank(p, p.typ === 'verktyg' ? 'Öppna verktyget på niclasfohlin.se' : 'Läs på niclasfohlin.se')}</p>`).join('');
  return `<!doctype html>
<html lang="sv"><body style="margin:0;padding:0;background:#f7f6f1;font-family:Georgia,'Times New Roman',serif;color:#18221d;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f1;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #deddd7;border-radius:12px;"><tr><td style="padding:32px 28px;font-size:17px;line-height:1.6;">
<p style="margin:0 0 20px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px;color:#5a635e;">Nytt på niclasfohlin.se</p>
${delar}
<p style="margin:0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:13px;color:#5a635e;">Du får det här mejlet för att du prenumererar på nya texter från Niclas Fohlin. <a href="{{ unsubscribe }}" style="color:#5a635e;">Avsluta prenumerationen</a> · <a href="{{ mirror }}" style="color:#5a635e;">Visa i webbläsaren</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

async function brevo(sokvag, body, nyckel) {
  const res = await fetch(`https://api.brevo.com/v3${sokvag}`, {
    method: 'POST',
    headers: { 'api-key': nyckel, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
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
  const urler = [...skickat.urler, ...nya.map((p) => p.url)];
  const tid = sandtid(nu);
  const senast = { datum: nu.toISOString(), poster: nya.map((p) => p.url), status: 'skapar', kampanj: undefined, kampanjer: [], schemalagd: tid ?? undefined, fel: undefined };
  const spara = () => lager.setJSON('skickat', { urler, initierad: skickat.initierad, senast });
  await spara();

  try {
    // Ett utskick för nya texter och metoder och ett för nya verktyg (utskicken), schemalagt till 07.00 utanför sändtiden.
    for (const grupp of utskicken(nya)) {
      // En serie med sina lektioner är ett inlägg i ämnesraden: Nytt på niclasfohlin.se: Ljudlek i grupp.
      const grupper = grupperaNya(grupp);
      const verktyg = grupp[0].typ === 'verktyg';
      const titlar = grupper.map((p) => p.titel);
      const amne = verktyg
        ? `${grupper.length === 1 ? 'Nytt verktyg' : 'Nya verktyg'} på niclasfohlin.se: ${titlar.length === 1 ? titlar[0] : `${titlar.slice(0, -1).join(', ')} och ${titlar.at(-1)}`}`
        : grupper.length === 1 ? `Nytt på niclasfohlin.se: ${titlar[0]}` : `Nytt på niclasfohlin.se: ${grupper.length} nya inlägg`;
      const kampanj = await brevo('/emailCampaigns', {
        name: `Nytt ${nu.toISOString().slice(0, 16)}: ${titlar.join(' | ').slice(0, 120)}`,
        subject: amne,
        sender: AVSANDARE,
        replyTo: SVAR_TILL,
        htmlContent: brev(grupp, sajt),
        recipients: { listIds: [Number(listId)] },
        ...(tid ? { scheduledAt: tid } : {}),
      }, brevoNyckel);
      senast.kampanj = kampanj.id;
      senast.kampanjer.push(kampanj.id);
      senast.status = 'skapad';
      await spara();
      if (!tid) await brevo(`/emailCampaigns/${kampanj.id}/sendNow`, {}, brevoNyckel);
    }
    senast.status = tid ? 'schemalagd' : 'skickad';
    await spara();
    return { steg: tid ? `kampanj schemalagd till ${tid}` : 'kampanj skickad', kampanj: senast.kampanj, kampanjer: senast.kampanjer, nya: senast.poster };
  } catch (fel) {
    senast.status = 'avbruten';
    senast.fel = String(fel?.message ?? fel).slice(0, 300);
    await spara().catch(() => {});
    throw fel;
  }
}
