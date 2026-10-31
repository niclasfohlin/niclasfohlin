// Service worker för appen Metodbanken, som hette Stöd till 2026-10-30 (K-505, K-644), med räckvidden hela sajten och
// sidorna i appens delar: appens sida /app, Stödundervisning med Planera insatsen och Metoder med Lär dig metoden. Den
// registreras av src/scripts/appdelen.ts och står i roten, eftersom en service worker bara får räckvidd under sin egen mapp.
// Delarna står i DELAR, som src/lib/appen.ts har som APPENS_DELAR; filen kan inte läsa sajtens kod, och scripts/appprov.mjs
// stannar när listorna skiljer sig åt. Sidor utanför delarna, som en artikel, går orörda till nätet.
//
// Sidorna hämtas från nätet först, så att innehållet alltid är det senaste, och en kopia sparas vid sidan av, så att det
// läraren har öppnat förut går att öppna utan nät. Ett fel när kopian sparas, som när telefonens minne är fullt, rör inte
// svaret från nätet (granskningen 2026-10-25, P1). Appens sida, bankerna och planens sidor, Planera insatsen och Lär dig
// metoden, står i en egen låda som varken töms av andra sidor eller av en ny version, så att planen finns kvar utan nät.
// Appens sida och dess filer sparas redan när service workern installeras, eftersom första starten i iPhones app laddas
// innan service workern har tagit över.
// Sajtens byggda filer under /_astro/ byter namn när de ändras och sparas första gången de hämtas, men bara ett svar med
// status 200 som inte är en html-sida. Pdf, Word, PowerPoint, filmer, bilder, funktionerna och allt från andra adresser
// går orört till nätet, så att appen inte tar plats i telefonen eller drar Netlifys krediter. Ändras logiken här, höjs
// VERSION, så att de gamla kopiorna av sidorna och filerna tas bort.
// Koden står i en egen funktion, så att inget av dess namn blir globalt: astro check läser filen som ett skript, och
// spara krockade med src/scripts/bockar.ts.
(() => {
  const VERSION = 'stod-3';
  const SIDOR = `${VERSION}-sidor`;
  const FILER = `${VERSION}-filer`;
  // Lådans namn står kvar från när appen hette Stöd, så att planerna som redan är sparade finns kvar utan nät.
  const VIKTIGA = 'stod-planer';
  const HOGST = { [SIDOR]: 60, [FILER]: 150, [VIKTIGA]: 30 };
  const DELAR = ['/app', '/stodundervisning', '/metoder'];
  const START = DELAR[0];

  const UTAN_NAT = '<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Utan nät · Metodbanken</title></head>'
    + '<body style="font-family:system-ui,sans-serif;margin:0;padding:1.5rem;color:#14202b;line-height:1.5"><h1 style="font-size:1.4rem">Telefonen är utan nät</h1>'
    + '<p>Sidan har inte öppnats i appen förut, så den finns inte sparad. Det du har öppnat tidigare, som din plan och dina metoder, går att öppna utan nät.</p>'
    + '<p><a href="/app">Till Metodbanken</a></p></body></html>';

  const arSida = (svar) => svar.ok && (svar.headers.get('content-type') || '').includes('text/html');
  const arFil = (svar) => svar.status === 200 && !(svar.headers.get('content-type') || '').includes('text/html');
  const iDelarna = (vag) => DELAR.some((d) => vag === d || vag.startsWith(`${d}/`));
  // Appens sida, bankerna och planens sidor är det läraren behöver utan nät.
  const ladaFor = (vag) => (DELAR.includes(vag) || /^\/stodundervisning\/[^/]+\/planera$/.test(vag) || /^\/metoder\/[^/]+\/lar-dig$/.test(vag) ? VIKTIGA : SIDOR);

  // Filerna som sidorna i den viktiga lådan läser. De står kvar när lådan för filer trimmas och när en ny version tar över,
  // så att en plan som är sparad utan nät öppnas med sina skript, också när sidan är sparad av en äldre version (Codex
  // 2026-10-31: planens sida stod kvar, men dess skript försvann med den gamla lådan).
  // Skripten läser i sin tur andra delar, som from"./standard.….js" och "_astro/drive.….js", och de räknas med.
  async function viktigaFiler() {
    const lada = await caches.open(VIKTIGA);
    const filer = new Set();
    const kvar = [];
    const lagg = (f, bas) => { const u = new URL(f, bas).href; if (!filer.has(u)) { filer.add(u); kvar.push(u); } };
    for (const k of await lada.keys()) {
      const svar = await lada.match(k);
      const html = svar ? await svar.text().catch(() => '') : '';
      for (const f of html.match(/\/_astro\/[^"'\s)]+/g) ?? []) lagg(f, self.location.origin);
    }
    while (kvar.length) {
      const u = kvar.pop();
      if (!/\.m?js$/.test(new URL(u).pathname)) continue;
      const svar = await caches.match(u);
      const js = svar ? await svar.text().catch(() => '') : '';
      for (const m of js.matchAll(/["'](\.\/[^"'\s]+?\.(?:m?js|css)|\/?_astro\/[^"'\s]+?\.(?:m?js|css))["']/g)) lagg(m[1].startsWith('.') ? m[1] : `/${m[1].replace(/^\//, '')}`, m[1].startsWith('.') ? u : self.location.origin);
    }
    return filer;
  }
  // De äldsta kopiorna tas bort när en låda har fler än sitt högsta antal, utom filerna som de viktiga sidorna läser.
  async function trimma(namn) {
    const lada = await caches.open(namn);
    const nycklar = await lada.keys();
    if (nycklar.length <= HOGST[namn]) return;
    const skydd = namn === FILER ? await viktigaFiler() : new Set();
    const kan = nycklar.filter((k) => !skydd.has(k.url));
    for (const k of kan.slice(0, Math.max(0, nycklar.length - HOGST[namn]))) await lada.delete(k);
  }
  async function spara(namn, nyckel, svar) {
    const lada = await caches.open(namn);
    await lada.put(nyckel, svar);
    await trimma(namn);
  }

  // Appens sida och filerna den läser sparas när service workern installeras. Går det inte, installeras den ändå.
  self.addEventListener('install', (e) => {
    e.waitUntil((async () => {
      try {
        const svar = await fetch(START, { cache: 'no-cache' });
        if (!arSida(svar)) return;
        const html = await svar.clone().text();
        await spara(VIKTIGA, START, svar);
        const filer = [...new Set(html.match(/\/_astro\/[^"'\s)]+/g) ?? [])];
        const lada = await caches.open(FILER);
        for (const f of filer) { try { const s = await fetch(f); if (arFil(s)) await lada.put(f, s); } catch { /* sparas när den hämtas */ } }
      } catch { /* sparas när sidorna öppnas */ }
    })().then(() => self.skipWaiting()));
  });
  // En ny version tar bort de gamla lådorna, men flyttar först filerna som de viktiga sidorna läser till den nya lådan.
  self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
      const gamla = (await caches.keys()).filter((n) => n !== VIKTIGA && !n.startsWith(`${VERSION}-`));
      // Går flytten inte, som när telefonens minne är fullt, står de gamla lådorna för filer kvar till nästa gång, och filerna
      // söks där (Codex 2026-10-31: skripten försvann fast flytten misslyckades).
      let flyttat = true;
      try {
        const skydd = await viktigaFiler();
        const ny = await caches.open(FILER);
        for (const n of gamla.filter((x) => x.endsWith('-filer'))) {
          const lada = await caches.open(n);
          for (const k of await lada.keys()) {
            if (!skydd.has(k.url) || (await ny.match(k))) continue;
            const svar = await lada.match(k);
            if (svar) await ny.put(k, svar);
          }
        }
      } catch { flyttat = false; }
      await Promise.all(gamla.filter((n) => flyttat || !n.endsWith('-filer')).map((n) => caches.delete(n)));
      await self.clients.claim();
    })());
  });

  self.addEventListener('fetch', (e) => {
    const fraga = e.request;
    if (fraga.method !== 'GET') return;
    const url = new URL(fraga.url);
    if (url.origin !== self.location.origin) return;
    // En sida i appen: nätet först, kopian när nätet inte svarar. En fil med ändelse, som en pdf, är ingen sida.
    if (fraga.mode === 'navigate') {
      const nyckel = url.pathname.replace(/\/$/, '') || '/';
      if (!iDelarna(nyckel) || /\.[a-z0-9]+$/i.test(url.pathname)) return;
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
        const sparat = (await caches.match(fraga, { cacheName: FILER }).catch(() => undefined)) || (await caches.match(fraga).catch(() => undefined));
        if (sparat) return sparat;
        const svar = await fetch(fraga);
        if (arFil(svar)) e.waitUntil(spara(FILER, fraga, svar.clone()).catch(() => { /* svaret visas ändå */ }));
        return svar;
      })());
    }
  });
})();
