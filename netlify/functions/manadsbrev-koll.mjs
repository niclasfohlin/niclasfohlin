// Provkör månadsbrevet hos Netlify utan att skicka något (K-730): en schemalagd funktion går inte att anropa, och ett fel där skulle
// annars synas först den 1. Funktionen läser GoatCounter, nytt.json, lagret och Brevos utrymme med samma kod och nycklar som
// netlify/functions/manadsbrev.mjs, bygger brevet och svarar med vad som skulle ha gått ut. Skyddad av UTSKICK_HEMLIGHET, i huvudet
// x-utskick-nyckel. nu i kroppen låter den svara som den dagen, till exempel { "nu": "2026-12-01T06:00:00Z" }.
import { getStore } from '@netlify/blobs';
import { skickaManadsbrev } from '../lib/manadsbrev.mjs';

const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export default async (request) => {
  if (request.method !== 'POST') return json(405, { fel: 'Bara POST.' });
  const hemlighet = process.env.UTSKICK_HEMLIGHET;
  if (!hemlighet || request.headers.get('x-utskick-nyckel') !== hemlighet) return json(403, { fel: 'Fel nyckel.' });
  const { BREVO_API_KEY, BREVO_LIST_ID, GC_LASNYCKEL, SITE_URL } = process.env;
  const kropp = await request.json().catch(() => ({}));
  const lager = getStore({ name: 'utskick', consistency: 'strong' });
  const resultat = await skickaManadsbrev({ sajt: (SITE_URL ?? 'https://niclasfohlin.se').replace(/\/$/, ''), lager, brevoNyckel: BREVO_API_KEY, listId: BREVO_LIST_ID, gcNyckel: GC_LASNYCKEL, nu: kropp?.nu ? new Date(kropp.nu) : new Date(), prov: true });
  return json(200, resultat);
};
