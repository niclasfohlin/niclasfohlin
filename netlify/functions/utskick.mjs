// Mejlar prenumeranterna om nytt innehåll. Anropas av byggpluginen netlify/plugins/utskick
// direkt efter att en produktionsdeploy publicerats, med den hemliga nyckeln UTSKICK_HEMLIGHET
// i huvudet x-utskick-nyckel. Funktionen får, till skillnad från bygget, skriva till det
// sajtgemensamma lagret i Netlify Blobs där det som redan mejlats står.
//
// Kroppen: { "bas": "https://<deploy>--niclasfohlin.netlify.app" }, adressen nytt.json läses från.
// Logiken ligger i netlify/lib/utskick.mjs.

import { getStore } from '@netlify/blobs';
import { lasNytt, mejlaNytt } from '../lib/utskick.mjs';

const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export default async (request) => {
  if (request.method !== 'POST') return json(405, { fel: 'Bara POST.' });
  const hemlighet = process.env.UTSKICK_HEMLIGHET;
  if (!hemlighet || request.headers.get('x-utskick-nyckel') !== hemlighet) return json(403, { fel: 'Fel nyckel.' });

  const { BREVO_API_KEY, BREVO_LIST_ID, SITE_URL } = process.env;
  const sajt = (SITE_URL ?? 'https://niclasfohlin.se').replace(/\/$/, '');
  let bas = sajt;
  try {
    const kropp = await request.json();
    if (kropp?.bas) bas = String(kropp.bas).replace(/\/$/, '');
  } catch { /* tom kropp: läs från sajten */ }

  try {
    const { poster } = await lasNytt(bas);
    const lager = getStore({ name: 'utskick', consistency: 'strong' });
    const resultat = await mejlaNytt({ poster, sajt, lager, brevoNyckel: BREVO_API_KEY, listId: BREVO_LIST_ID });
    console.log(JSON.stringify({ funktion: 'utskick', bas, ...resultat }));
    return json(200, resultat);
  } catch (fel) {
    const text = String(fel && fel.stack ? fel.stack : fel).replace(/\s+/g, ' ').slice(0, 600);
    console.log(JSON.stringify({ funktion: 'utskick', steg: 'FEL', fel: text }));
    return json(500, { steg: 'FEL', fel: text });
  }
};
