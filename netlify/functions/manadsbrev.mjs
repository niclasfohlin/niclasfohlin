// Månadsbrevet går ut av sig självt den 1 varje månad (K-730; Niclas 2026-11-07: "Släpp den den 1 varje månad"): Netlify kör
// funktionen kl. 06.00 UTC, 07.00 svensk vintertid och 08.00 sommartid. Körningarna den 2 och 3 gör bara något om brevet inte gick
// ut den 1, så att ett fel hos GoatCounter eller Brevo inte kostar en månad. Logiken står i netlify/lib/manadsbrev.mjs, och
// netlify/functions/manadsbrev-koll.mjs provkör samma kod utan att skicka. Ett fel mejlas till Niclas.
import { getStore } from '@netlify/blobs';
import { skickaManadsbrev } from '../lib/manadsbrev.mjs';

export const config = { schedule: '0 6 1-3 * *' };

export default async () => {
  const { BREVO_API_KEY, BREVO_LIST_ID, GC_LASNYCKEL, SITE_URL } = process.env;
  const lager = getStore({ name: 'utskick', consistency: 'strong' });
  try {
    const resultat = await skickaManadsbrev({ sajt: (SITE_URL ?? 'https://niclasfohlin.se').replace(/\/$/, ''), lager, brevoNyckel: BREVO_API_KEY, listId: BREVO_LIST_ID, gcNyckel: GC_LASNYCKEL });
    console.log(JSON.stringify({ funktion: 'manadsbrev', ...resultat }));
  } catch (fel) {
    console.log(JSON.stringify({ funktion: 'manadsbrev', steg: 'FEL', fel: String(fel?.stack ?? fel).replace(/\s+/g, ' ').slice(0, 600) }));
  }
};
