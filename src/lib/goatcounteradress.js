// Adressen till GoatCounters lista över sidor och händelser (statistiksidan, src/pages/statistik.astro, och dess prov,
// scripts/statistikprov.mjs). Listan hämtas 100 i taget, och de som redan hämtats står i adressen som exclude_paths, så
// adressen växer för varje omgång. Chrome talar HTTP/2 med GoatCounter, och där bryts en adress över omkring 8 000 tecken
// med ERR_HTTP2_PROTOCOL_ERROR, som sidan såg som Failed to fetch: 7 dagar, 30 dagar och ett år stannade i den åttonde
// omgången med 8 536 tecken, och 7 336 gick (prövat 2026-11-19, Niclas: "Även fast jag trycker för först"). Skripten talar
// HTTP/1.1 och märkte inget. Kommatecknen står därför som de är och inte som %2C, så att omkring 900 sidor ryms, och
// hämtningen slutar innan adressen blir längre än gränsen.
// Vanlig JavaScript, så att provet kan läsa filen utan bygget.

/** Den längsta adress som hämtas, med marginal mot de omkring 8 000 tecken där HTTP/2 bryter. */
export const ADRESSENS_GRANS = 7500;

/**
 * Adressen till nästa omgång, eller null när den skulle bli för lång: då är listan inte hel, och sidan säger det.
 * @param {string} bas GoatCounters adress, som https://niclasfohlin.goatcounter.com
 * @param {{ start: string, end: string }} tid
 * @param {Iterable<number>} sedda path_id för det som redan hämtats
 * @returns {string | null}
 */
export function listansAdress(bas, tid, sedda) {
  const url = new URL(`${bas}/api/v0/stats/hits`);
  url.searchParams.set('start', tid.start);
  url.searchParams.set('end', tid.end);
  url.searchParams.set('limit', '100');
  const ids = [...sedda];
  const adress = ids.length ? `${url.href}&exclude_paths=${ids.join(',')}` : url.href;
  return adress.length <= ADRESSENS_GRANS ? adress : null;
}
