// Kommentarerna: det som funktionen netlify/functions/kommentarer.mjs och skriptet
// scripts/kommentarer.mjs delar. Hur lagret hänger ihop står i DRIFT.md under Kommentarer.

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Funktionens adress. Waline räknar ut samma prefix ur _HANDLER. */
export const PREFIX = '/.netlify/functions/kommentarer';
export const SAJT = process.env.SITE_URL || 'https://niclasfohlin.se';
/** Den enda adress som kan bli administratör. KOMMENTARER_ADMIN byter den vid lokala prov. */
export const ADMIN_EPOST = (process.env.KOMMENTARER_ADMIN || 'niclas.fohlin@gmail.com').trim().toLowerCase();
const AVSANDARE = { name: 'Niclas Fohlin', email: 'nyhetsbrev@niclasfohlin.se' };

const AV = ['av', 'off', 'false', '0', 'nej'];
/** Kommentarerna är ett lager. KOMMENTARER=av i Netlify stänger funktionen direkt och tar bort
 *  rutan från sidorna vid nästa bygge. Saknas variabeln är de på. */
export const kommentarerPa = (varde = process.env.KOMMENTARER) => !AV.includes(String(varde ?? 'på').trim().toLowerCase());

/** Månadens tak i krediter för kommentarerna. Nås det stängs skrivandet till nästa period. */
export const budget = () => Number(process.env.KOMMENTARER_BUDGET) || 50;

// Hemligheter härleds ur en som redan finns i Netlify, så att ingen ny nyckel behöver sättas.
function grund() {
  const g = process.env.UTSKICK_HEMLIGHET || process.env.BREVO_API_KEY;
  if (!g) throw new Error('Varken UTSKICK_HEMLIGHET eller BREVO_API_KEY finns i miljön.');
  return g;
}
export const hemlighet = (namn) => createHmac('sha256', grund()).update(`kommentarer:${namn}`).digest('base64url');

export function signera(namn, data) {
  const kropp = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${kropp}.${createHmac('sha256', hemlighet(namn)).update(kropp).digest('base64url')}`;
}

export function verifiera(namn, token) {
  if (typeof token !== 'string') return null;
  const [kropp, sig] = token.split('.');
  if (!kropp || !sig) return null;
  const vantad = Buffer.from(createHmac('sha256', hemlighet(namn)).update(kropp).digest('base64url'));
  const fatt = Buffer.from(sig);
  if (fatt.length !== vantad.length || !timingSafeEqual(fatt, vantad)) return null;
  try {
    return JSON.parse(Buffer.from(kropp, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export const skydda = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (t) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[t]);

/** Kommentarens text som ren text för mejlet: Waline sparar markdown. */
const renText = (s) => String(s ?? '').replace(/\r/g, '').trim().slice(0, 4000);

const stycken = (text) =>
  text
    .split(/\n{2,}/)
    .map((s) => `<p>${skydda(s).replace(/\n/g, '<br>')}</p>`)
    .join('\n');

// ---------------------------------------------------------------------------------------------
// Mejl genom Brevo, med samma nyckel och avsändare som utskicken.

export async function skickaMejl({ till, amne, text }) {
  const nyckel = process.env.BREVO_API_KEY;
  if (!nyckel) {
    console.error('kommentarer: BREVO_API_KEY saknas, mejlet skickades inte:', amne);
    return false;
  }
  const headers = { 'api-key': nyckel, 'Content-Type': 'application/json', Accept: 'application/json' };
  // Prov: Brevo tar emot och prövar anropet men skickar inget. Flaggan ska ligga i mejlets
  // headers i anropets kropp, inte i HTTP-anropets huvud: där verkade den inte, och natten
  // 2026-09-26 skickades provmejlen på riktigt.
  const sandlada = Boolean(process.env.KOMMENTARER_BREVO_SANDBOX);
  if (sandlada) console.log(`kommentarer: mejl i provläge till ${till}: ${amne}`);
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender: AVSANDARE,
        to: [{ email: till }],
        replyTo: { email: 'niclas.fohlin@gmail.com' },
        subject: amne,
        textContent: text,
        htmlContent: `<!doctype html><html lang="sv"><body style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#14202b;max-width:36rem">\n${stycken(text)}\n</body></html>`,
        tags: ['kommentarer'],
        ...(sandlada ? { headers: { 'X-Sib-Sandbox': 'drop' } } : {}),
      }),
    });
    if (!res.ok) {
      console.error('kommentarer: Brevo svarade', res.status, (await res.text().catch(() => '')).slice(0, 300));
      return false;
    }
    return true;
  } catch (fel) {
    console.error('kommentarer: mejlet kunde inte skickas:', fel?.message);
    return false;
  }
}

export const mejl = {
  nyKommentar: ({ nick, mail, kommentar, titel, url, skrap }) => ({
    amne: `${skrap ? 'Troligen skräp: ' : 'Ny kommentar: '}${titel}`,
    text: [
      `${nick} har kommenterat ${titel}.`,
      renText(kommentar),
      `Kommentaren syns på sidan först när du har godkänt den. Godkänn, svara eller ta bort den i panelen: ${SAJT}/kommentarer/admin (glömt lösenordet: ${SAJT}/kommentarer/registrera). Är du inloggad där kan du också göra det direkt under texten på sajten.`,
      `Sidan: ${SAJT}${url}#kommentarer${mail ? `\nAvsändarens e-post: ${mail}` : ''}`,
    ].join('\n\n'),
  }),
  svar: ({ mottagare, svarare, kommentar, titel, url, id }) => ({
    amne: `${svarare} har svarat på din kommentar`,
    text: [
      `Hej ${mottagare}.`,
      `${svarare} har svarat på din kommentar till ${titel}:`,
      renText(kommentar),
      `Läs svaret och hela samtalet: ${SAJT}${url}#kommentar-${id}`,
      'Du får det här mejlet för att du lämnade din e-postadress när du kommenterade. Inga andra mejl skickas.',
    ].join('\n\n'),
  }),
  registrera: ({ lank }) => ({
    amne: 'Välj lösenord för kommentarerna på niclasfohlin.se',
    text: [
      'Klicka på länken för att välja lösenord och bli administratör för kommentarerna. Länken gäller i 30 minuter.',
      lank,
      'Har du inte bett om länken kan du strunta i mejlet.',
    ].join('\n\n'),
  }),
  budget: ({ anvant, tak, stangt }) => ({
    amne: stangt ? 'Kommentarerna är stängda resten av perioden' : `Kommentarerna har använt ${anvant} av ${tak} krediter`,
    text: [
      stangt
        ? `Kommentarerna har nått taket på ${tak} krediter för perioden. Nya kommentarer tas inte emot förrän nästa period börjar. De som redan finns syns som vanligt.`
        : `Kommentarerna har använt omkring ${anvant} av ${tak} krediter den här perioden.`,
      'Läget: npm run kommentarer -- status. Taket höjs med netlify env:set KOMMENTARER_BUDGET och ett nytt bygge.',
    ].join('\n\n'),
  }),
};

// ---------------------------------------------------------------------------------------------
// Tak i tid. Räknar händelser i ett glidande fönster i Blobs och svarar true om en till ryms.
// Skyddar inloggningen mot gissning och Brevos 300 mejl per dygn, som nyhetsbreven också behöver.

export async function inomTak(lager, nyckel, { max, fonsterMs }, nu = Date.now()) {
  const tider = ((await lager.get(nyckel, { type: 'json' }).catch(() => null)) ?? []).filter((t) => nu - t < fonsterMs);
  if (tider.length >= max) return false;
  tider.push(nu);
  await lager.setJSON(nyckel, tider).catch(() => {});
  return true;
}

export const TAK = {
  /** Mejl från kommentarerna per dygn, alla slag tillsammans. */
  mejl: { max: 30, fonsterMs: 24 * 3600000 },
  /** Länkar för att bli administratör eller byta lösenord per dygn. */
  registrera: { max: 3, fonsterMs: 24 * 3600000 },
  /** Inloggningsförsök per avsändare och timme, och för alla tillsammans. */
  inloggning: { max: 10, fonsterMs: 3600000 },
  inloggningAlla: { max: 40, fonsterMs: 3600000 },
};

// ---------------------------------------------------------------------------------------------
// Kreditmätaren. Netlify visar inte förbrukningen i sitt API, så funktionen räknar själv och
// sparar räkningen i Netlify Blobs, lagret "kommentarer". Uppskattning, inte faktura:
//   databasen: minst 1 enhet så länge den är vaken, och den somnar efter 5 minuter utan anrop;
//              10 krediter per enhet och timme (Netlify Database, Personal: 1 till 4 enheter, går inte
//              att ändra). En enhet är 1 GB-timme i Netlifys räkning; grenens 0,25 i API:t är Neons mått
//              för samma sak. Rättat 2026-09-27 efter Netlifys faktura: 0,25 här gav en fjärdedel av
//              det verkliga, och varje uppvaknande kostar omkring 1 kredit. Uppskattningen är ett golv:
//              databasen kan växa till 4 enheter under last, och byggena räknas inte här.
//   funktionen: 1 GB minne, 10 krediter per GB-timme
//   anropen:   2 krediter per 10 000

export const LAGER = 'kommentarer';
const VILA_MIN = 5;
const DB_ENHETER = 1;

/** Perioden börjar den 20:e som Netlifys fakturaperiod (07.00 UTC). Nyckeln är periodens första dag. */
export function period(nu = new Date()) {
  const dag = Number(process.env.KOMMENTARER_PERIODDAG) || 20;
  const d = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), dag, 7));
  if (nu < d) d.setUTCMonth(d.getUTCMonth() - 1);
  return `forbrukning-${d.toISOString().slice(0, 10)}`;
}

const tom = () => ({ anrop: 0, funktionMs: 0, dbMinuter: 0, dbStart: 0, dbSenast: 0, varnat: 0 });

export function uppskattning(f) {
  const oppen = f.dbStart ? (f.dbSenast - f.dbStart) / 60000 + VILA_MIN : 0;
  const db = ((f.dbMinuter + oppen) / 60) * DB_ENHETER * 10;
  const funktion = (f.funktionMs / 3.6e6) * 10;
  const anrop = (f.anrop / 10000) * 2;
  return { db, funktion, anrop, summa: db + funktion + anrop };
}

export async function lasForbrukning(lager, nu = new Date()) {
  return { ...tom(), ...((await lager.get(period(nu), { type: 'json' }).catch(() => null)) ?? {}) };
}

/** Lägger ett anrop till räkningen. databas: anropet väckte eller höll databasen vaken. */
export async function raknaAnrop(lager, { ms, databas }, nu = new Date()) {
  const f = await lasForbrukning(lager, nu);
  const t = nu.getTime();
  f.anrop += 1;
  f.funktionMs += Math.max(0, ms);
  if (databas) {
    if (!f.dbStart || t - f.dbSenast > VILA_MIN * 60000) {
      if (f.dbStart) f.dbMinuter += (f.dbSenast - f.dbStart) / 60000 + VILA_MIN;
      f.dbStart = t;
    }
    f.dbSenast = t;
  }
  await lager.setJSON(period(nu), f).catch((fel) => console.error('kommentarer: räkningen sparades inte:', fel?.message));
  return f;
}

/** Varnar en gång vid 80 procent och en gång när taket nås. */
export async function varnaVidTak(lager, f, nu = new Date()) {
  const tak = budget();
  const anvant = uppskattning(f).summa;
  const niva = anvant >= tak ? 2 : anvant >= tak * 0.8 ? 1 : 0;
  if (niva <= (f.varnat || 0)) return;
  f.varnat = niva;
  await lager.setJSON(period(nu), f).catch(() => {});
  const { amne, text } = mejl.budget({ anvant: Math.round(anvant), tak, stangt: niva === 2 });
  await skickaMejl({ till: ADMIN_EPOST, amne, text });
}
