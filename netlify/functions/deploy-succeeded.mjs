// Körs av Netlify efter varje lyckad deploy (händelsen deploySucceeded).
//
// Läser /nytt.json på sajten, jämför med det som redan mejlats (Netlify Blobs, lagret "utskick",
// nyckeln "skickat") och skickar en Brevo-kampanj till prenumeranterna om det som tillkommit:
// nya artiklar, metoder och böcker. Första körningen registrerar allt som redan ligger ute utan
// att skicka något, så att en ny funktion aldrig mejlar hela arkivet.
//
// Miljövariabler: BREVO_API_KEY, BREVO_LIST_ID, SITE_URL. Saknas de loggas det och inget skickas.
// Längre nyhetsbrev skrivs fortfarande med /utskick och skickas när Niclas sagt skicka.

import { getStore } from '@netlify/blobs';

const AVSANDARE = { name: 'Niclas Fohlin', email: 'niclas.fohlin@gmail.com' };

// Varje logg är en rad JSON så att den går att läsa i Netlifys funktionslogg.
const logg = (steg, extra = {}) => console.log(JSON.stringify({ funktion: 'deploy-succeeded', steg, ...extra }));

const html = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function brev(nya, sajt) {
  const delar = nya.map((p) => `
    <p style="margin:0 0 4px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px;color:#5a635e;">${html(p.etikett)}</p>
    <h2 style="margin:0 0 8px;font-size:22px;line-height:1.25;"><a href="${sajt}${p.url}" style="color:#18221d;text-decoration:none;">${html(p.titel)}</a></h2>
    <p style="margin:0 0 12px;">${html(p.ingress)}</p>
    <p style="margin:0 0 28px;"><a href="${sajt}${p.url}" style="color:#2f5d50;">Läs på niclasfohlin.se</a></p>`).join('');
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

// Lagret för det som redan mejlats. Netlify sätter siteID och token åt funktionen; finns
// NETLIFY_BLOBS_TOKEN i miljön används den i stället, som reserv.
function lagret() {
  const { NETLIFY_BLOBS_TOKEN, SITE_ID } = process.env;
  if (NETLIFY_BLOBS_TOKEN && SITE_ID) return getStore({ name: 'utskick', consistency: 'strong', siteID: SITE_ID, token: NETLIFY_BLOBS_TOKEN });
  return getStore({ name: 'utskick', consistency: 'strong' });
}

// Läser nytt.json från deployens egen adress (permalänken), så att det är den nya versionen
// och inte det CDN:et råkar ha kvar av den gamla. Några omförsök om svaret ännu inte är JSON.
async function lasNytt(bas) {
  let senast = '';
  for (let forsok = 1; forsok <= 5; forsok++) {
    const res = await fetch(`${bas}/nytt.json`, { cache: 'no-store', headers: { Accept: 'application/json' } });
    const typ = res.headers.get('content-type') ?? '';
    if (res.ok && typ.includes('json')) return res.json();
    senast = `${res.status} ${typ}`;
    await new Promise((r) => setTimeout(r, 2000 * forsok));
  }
  throw new Error(`nytt.json gick inte att läsa från ${bas}: ${senast}`);
}

async function mejlaNytt(deploy) {
  const kontext = deploy?.context;
  if (kontext && kontext !== 'production') return logg('hoppar över', { kontext });

  const { BREVO_API_KEY, BREVO_LIST_ID, SITE_URL } = process.env;
  const sajt = (SITE_URL ?? 'https://niclasfohlin.se').replace(/\/$/, '');
  // Deployens egen adress i händelsens payload (Netlifys deploy-objekt).
  const bas = (deploy?.deploy_ssl_url || deploy?.links?.permalink || deploy?.ssl_url || sajt).replace(/\/$/, '');

  const { poster } = await lasNytt(bas);

  const lager = lagret();
  const skickat = await lager.get('skickat', { type: 'json' });
  if (!skickat) {
    await lager.setJSON('skickat', { urler: poster.map((p) => p.url), initierad: new Date().toISOString() });
    return logg('första körningen: registrerade utan utskick', { antal: poster.length });
  }

  const kanda = new Set(skickat.urler);
  const nya = poster.filter((p) => !kanda.has(p.url));
  if (nya.length === 0) return logg('inget nytt', { antal: poster.length });
  if (!BREVO_API_KEY || !BREVO_LIST_ID) return logg('nytt finns men Brevo saknas', { nya: nya.map((p) => p.url) });

  const amne = nya.length === 1 ? `Nytt på niclasfohlin.se: ${nya[0].titel}` : `Nytt på niclasfohlin.se: ${nya.length} nya inlägg`;
  const kampanj = await brevo('/emailCampaigns', {
    name: `Nytt ${new Date().toISOString().slice(0, 16)}: ${nya.map((p) => p.titel).join(' | ').slice(0, 120)}`,
    subject: amne,
    sender: AVSANDARE,
    replyTo: AVSANDARE.email,
    htmlContent: brev(nya, sajt),
    recipients: { listIds: [Number(BREVO_LIST_ID)] },
  }, BREVO_API_KEY);
  await brevo(`/emailCampaigns/${kampanj.id}/sendNow`, {}, BREVO_API_KEY);

  await lager.setJSON('skickat', {
    urler: [...skickat.urler, ...nya.map((p) => p.url)],
    initierad: skickat.initierad,
    senast: { datum: new Date().toISOString(), kampanj: kampanj.id, poster: nya.map((p) => p.url) },
  });
  return logg('kampanj skickad', { kampanj: kampanj.id, nya: nya.map((p) => p.url) });
}

async function kor(deploy) {
  try {
    await mejlaNytt(deploy);
  } catch (fel) {
    logg('FEL', { fel: String(fel && fel.stack ? fel.stack : fel).replace(/\s+/g, ' ').slice(0, 800) });
  }
}

// Netlify anropar funktionen med { payload: <deploy> } där deploy har id, context (production,
// deploy-preview, branch-deploy), branch och deploy_ssl_url, deployens egen adress.
export default async (request) => {
  let deploy = {};
  try { deploy = (await request.json())?.payload ?? {}; } catch { /* tom kropp vid lokal körning */ }
  logg('start', { deploy: deploy.id, kontext: deploy.context, gren: deploy.branch, adress: deploy.deploy_ssl_url });
  await kor(deploy);
  return new Response('ok', { status: 200 });
};
