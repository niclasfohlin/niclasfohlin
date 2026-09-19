// Prenumeration via Brevo med dubbel opt-in.
//
// Funktionen lägger till en kontakt i Brevo och låter Brevo skicka
// bekräftelsemejlet. Den skickar aldrig nyhetsbrev. Utan miljövariabler
// svarar den 503 så att formuläret kan ligga ute innan Brevo är kopplat.
//
// Miljövariabler (sätts av Niclas med "netlify env:set", aldrig av Claude Code):
//   BREVO_API_KEY           API-nyckel från Brevo
//   BREVO_LIST_ID           Numeriskt list-id
//   BREVO_DOI_TEMPLATE_ID   Numeriskt id på mallen för dubbel opt-in
//   SITE_URL                t.ex. https://niclasfohlin.se
//
// Brevos endpoint för dubbel opt-in: POST /v3/contacts/doubleOptinConfirmation.
// Verifiera fältnamnen mot Brevos aktuella API-dokumentation innan skarp drift.

const EPOST = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function svar(status, meddelande, extra = {}) {
  return new Response(JSON.stringify({ meddelande, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default async (request) => {
  if (request.method !== 'POST') return svar(405, 'Bara POST.');

  let epost = '';
  let honung = '';
  const typ = request.headers.get('content-type') ?? '';
  try {
    if (typ.includes('application/json')) {
      const body = await request.json();
      epost = String(body.epost ?? '');
      honung = String(body.webbplats ?? '');
    } else {
      const form = await request.formData();
      epost = String(form.get('epost') ?? '');
      honung = String(form.get('webbplats') ?? '');
    }
  } catch {
    return svar(400, 'Kunde inte läsa formuläret.');
  }

  // Honungsfälla: ett dolt fält som bara robotar fyller i.
  if (honung) return svar(200, 'Tack. Kolla din inkorg.');

  epost = epost.trim().toLowerCase();
  if (!EPOST.test(epost)) return svar(400, 'Ange en giltig e-postadress.');

  const { BREVO_API_KEY, BREVO_LIST_ID, BREVO_DOI_TEMPLATE_ID, SITE_URL } = process.env;
  if (!BREVO_API_KEY || !BREVO_LIST_ID || !BREVO_DOI_TEMPLATE_ID) {
    return svar(503, 'Prenumerationen är inte påslagen ännu. Följ gärna via RSS så länge.', { rss: '/rss.xml' });
  }

  const res = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email: epost,
      includeListIds: [Number(BREVO_LIST_ID)],
      templateId: Number(BREVO_DOI_TEMPLATE_ID),
      redirectionUrl: `${SITE_URL ?? 'https://niclasfohlin.se'}/prenumerera?bekraftad=1`,
    }),
  });

  if (res.status === 201 || res.status === 204) {
    return svar(200, 'Tack. Ett bekräftelsemejl är på väg.');
  }

  const fel = await res.text().catch(() => '');
  console.error('Brevo svarade', res.status, fel);
  return svar(502, 'Det gick inte att registrera adressen just nu. Försök igen senare.');
};

