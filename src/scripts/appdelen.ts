// Appen Metodbankens delar av sajten, /app, /stodundervisning och /metoder (K-644, src/lib/appen.ts): skriptet står på varje
// sida där (Base.astro). Det registrerar appens service worker (public/sw-stod.js) med räckvidden hela sajten, eftersom appen
// rymmer tre delar, och tar bort appen Stöds registrering med räckvidden /stodundervisning, som annars skulle ta över
// metodbankens sidor med en egen kopia av samma skript. Det stoppar Chromes egen ruta om installation (mini-infobar), så att
// appen bara erbjuds när läraren själv går till /app (Niclas 2026-10-30: "Kan man göra att den inte öppnas automatiskt"; "Prevent
// the mini-infobar from appearing on mobile" med preventDefault, web.dev/articles/customize-install). Och att appen används
// räknas en gång om dagen, utan namn eller värden.
// Bara det minsta, så att skriptet inte läser in standarden på sidor som inte behöver den (src/scripts/raknare.ts).
import { goatcounter, idagLokalt } from './raknare';
import { iAppen } from './webblasaren';
import { APPEN } from '../lib/appen';

// Service workern bara på https, så att förhandsvisningen på datorn inte får en. Appen Stöds registrering hade räckvidden
// /stodundervisning till 2026-10-30; kopiorna av sidorna står kvar i lådorna, som hör till sajten och inte till registreringen.
const STODS_RACKVIDD = '/stodundervisning';
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('/sw-stod.js', { scope: '/' })
    .then(() => navigator.serviceWorker.getRegistrations())
    .then((alla) => Promise.all(alla.filter((r) => new URL(r.scope).pathname === STODS_RACKVIDD).map((r) => r.unregister())))
    .catch(() => { /* sidan fungerar utan */ });
}

// Webbläsarens egen fråga visas bara på /app, där src/scripts/appen.ts tar den.
if (location.pathname !== APPEN.adress) addEventListener('beforeinstallprompt', (e) => e.preventDefault());

// Att appen används räknas en gång om dagen, när count.js har laddats.
const ANVAND = 'app-anvand';
if (iAppen()) {
  let senast = '';
  try { senast = localStorage.getItem(ANVAND) ?? ''; } catch { /* räknas varje gång */ }
  if (senast !== idagLokalt()) {
    const gor = () => { goatcounter()?.count?.({ path: 'app:i-appen', title: `Appen ${APPEN.namn}: används i dag`, event: true }); try { localStorage.setItem(ANVAND, idagLokalt()); } catch { /* räknas igen */ } };
    if (document.readyState === 'complete') gor(); else addEventListener('load', gor, { once: true });
  }
}
