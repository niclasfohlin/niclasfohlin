// Service worker för appen Stöd (K-505), med räckvidden /stodundervisning: metodbanken, metoderna och Planera insatsen.
// Den registreras av src/scripts/appen.ts och står i roten, eftersom metodbankens adress är /stodundervisning utan
// snedstreck, och en service worker får bara räckvidd under sin egen mapp.
//
// Sidorna hämtas från nätet först, så att innehållet alltid är det senaste, och en kopia sparas vid sidan av, så att det
// läraren har öppnat förut går att öppna utan nät. Ett fel när kopian sparas, som när telefonens minne är fullt, rör inte
// svaret från nätet (granskningen 2026-10-25, P1). Metodbanken och planens sidor står i en egen låda som varken töms av
// andra sidor eller av en ny version, så att planen finns kvar utan nät. Metodbanken och dess filer sparas redan när
// service workern installeras, eftersom första starten i iPhones app laddas innan service workern har tagit över.
// Sajtens byggda filer under /_astro/ byter namn när de ändras och sparas första gången de hämtas, men bara ett svar med
// status 200 som inte är en html-sida. Pdf, Word, PowerPoint, filmer, bilder, funktionerna och allt från andra adresser
// går orört till nätet, så att appen inte tar plats i telefonen eller drar Netlifys krediter. Ändras logiken här, höjs
// VERSION, så att de gamla kopiorna av sidorna och filerna tas bort.
// Koden står i en egen funktion, så att inget av dess namn blir globalt: astro check läser filen som ett skript, och
// spara krockade med src/scripts/bockar.ts.
(() => {
  const VERSION = 'stod-2';
  const SIDOR = `${VERSION}-sidor`;
  const FILER = `${VERSION}-filer`;
  const VIKTIGA = 'stod-planer';
  const HOGST = { [SIDOR]: 60, [FILER]: 150, [VIKTIGA]: 30 };
  const METODBANKEN = '/stodundervisning';

  const UTAN_NAT = '<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Utan nät · Stöd</title></head>'
    + '<body style="font-family:system-ui,sans-serif;margin:0;padding:1.5rem;color:#14202b;line-height:1.5"><h1 style="font-size:1.4rem">Telefonen är utan nät</h1>'
    + '<p>Sidan har inte öppnats i appen förut, så den finns inte sparad. Det du har öppnat tidigare, som din plan och dina metoder, går att öppna utan nät.</p>'
    + '<p><a href="/stodundervisning">Till metodbanken</a></p></body></html>';

  const arSida = (svar) => svar.ok && (svar.headers.get('content-type') || '').includes('text/html');
  const arFil = (svar) => svar.status === 200 && !(svar.headers.get('content-type') || '').includes('text/html');
  // Metodbanken och planens sidor är det läraren behöver utan nät.
  const ladaFor = (vag) => (vag === METODBANKEN || /^\/stodundervisning\/[^/]+\/planera$/.test(vag) ? VIKTIGA : SIDOR);

  // De äldsta kopiorna tas bort när en låda har fler än sitt högsta antal.
  async function trimma(namn) {
    const lada = await caches.open(namn);
    const nycklar = await lada.keys();
    for (const k of nycklar.slice(0, Math.max(0, nycklar.length - HOGST[namn]))) await lada.delete(k);
  }
  async function spara(namn, nyckel, svar) {
    const lada = await caches.open(namn);
    await lada.put(nyckel, svar);
    await trimma(namn);
  }

  // Metodbanken och filerna den läser sparas när service workern installeras. Går det inte, installeras den ändå.
  self.addEventListener('install', (e) => {
    e.waitUntil((async () => {
      try {
        const svar = await fetch(METODBANKEN, { cache: 'no-cache' });
        if (!arSida(svar)) return;
        const html = await svar.clone().text();
        await spara(VIKTIGA, METODBANKEN, svar);
        const filer = [...new Set(html.match(/\/_astro\/[^"'\s)]+/g) ?? [])];
        const lada = await caches.open(FILER);
        for (const f of filer) { try { const s = await fetch(f); if (arFil(s)) await lada.put(f, s); } catch { /* sparas när den hämtas */ } }
      } catch { /* sparas när sidorna öppnas */ }
    })().then(() => self.skipWaiting()));
  });
  self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys()
      .then((namn) => Promise.all(namn.filter((n) => n !== VIKTIGA && !n.startsWith(`${VERSION}-`)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()));
  });

  self.addEventListener('fetch', (e) => {
    const fraga = e.request;
    if (fraga.method !== 'GET') return;
    const url = new URL(fraga.url);
    if (url.origin !== self.location.origin) return;
    // En sida i appen: nätet först, kopian när nätet inte svarar. En fil med ändelse, som en pdf, är ingen sida.
    if (fraga.mode === 'navigate') {
      if (!url.pathname.startsWith(METODBANKEN) || /\.[a-z0-9]+$/i.test(url.pathname)) return;
      const nyckel = url.pathname.replace(/\/$/, '') || METODBANKEN;
      e.respondWith((async () => {
        let svar;
        try {
          svar = await fetch(fraga);
        } catch {
          const sparad = (await caches.match(nyckel, { cacheName: ladaFor(nyckel) })) || (await caches.match(nyckel));
          return sparad || new Response(UTAN_NAT, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
        if (arSida(svar)) e.waitUntil(spara(ladaFor(nyckel), nyckel, svar.clone()).catch(() => { /* svaret visas ändå */ }));
        return svar;
      })());
      return;
    }
    if (url.pathname.startsWith('/_astro/')) {
      e.respondWith((async () => {
        const sparat = await caches.match(fraga, { cacheName: FILER }).catch(() => undefined);
        if (sparat) return sparat;
        const svar = await fetch(fraga);
        if (arFil(svar)) e.waitUntil(spara(FILER, fraga, svar.clone()).catch(() => { /* svaret visas ändå */ }));
        return svar;
      })());
    }
  });
})();
