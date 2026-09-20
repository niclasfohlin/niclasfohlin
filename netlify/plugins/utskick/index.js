// Byggplugin: mejlar prenumeranterna om nytt innehåll när en produktionsdeploy gått igenom.
//
// onSuccess körs av Netlify efter att deployen publicerats. Pluginen läser nytt.json ur den byggda
// sajten, jämför med lagret i Netlify Blobs och skickar en Brevo-kampanj om det nya. Resultatet
// visas i deployens sammanfattning i Netlify och i bygglogen. Logiken ligger i netlify/lib/utskick.mjs.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getStore } from '@netlify/blobs';
import { mejlaNytt } from '../../lib/utskick.mjs';

export const onSuccess = async ({ constants, utils }) => {
  const { CONTEXT, BREVO_API_KEY, BREVO_LIST_ID, SITE_URL } = process.env;
  if (CONTEXT !== 'production') {
    console.log(`utskick: hoppar över, kontexten är ${CONTEXT}`);
    return;
  }
  try {
    const fil = join(constants.PUBLISH_DIR, 'nytt.json');
    const { poster } = JSON.parse(await readFile(fil, 'utf8'));
    const lager = getStore({ name: 'utskick', consistency: 'strong' });
    const sajt = (SITE_URL ?? 'https://niclasfohlin.se').replace(/\/$/, '');
    const resultat = await mejlaNytt({ poster, sajt, lager, brevoNyckel: BREVO_API_KEY, listId: BREVO_LIST_ID });
    const text = resultat.nya?.length ? `${resultat.steg}: ${resultat.nya.join(', ')}` : `${resultat.steg} (${resultat.antal ?? 0} poster)`;
    console.log(`utskick: ${text}`);
    utils.status.show({ title: 'Utskick till prenumeranterna', summary: text });
  } catch (fel) {
    // Lokalt bygge (netlify build) saknar lagret; då görs inget.
    if (fel && fel.name === 'MissingBlobsEnvironmentError') {
      console.log('utskick: inget lager i den här miljön (lokalt bygge), hoppar över');
      return;
    }
    // Ett misslyckat utskick ska inte göra deployen röd; det syns i loggen och i sammanfattningen.
    const text = String(fel && fel.stack ? fel.stack : fel).replace(/\s+/g, ' ').slice(0, 600);
    console.log(`utskick: FEL ${text}`);
    utils.status.show({ title: 'Utskick till prenumeranterna misslyckades', summary: text });
  }
};
