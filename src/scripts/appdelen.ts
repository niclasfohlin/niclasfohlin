// Appen Metodbankens delar av sajten, /app, /stodundervisning och /metoder (K-644, src/lib/appen.ts): skriptet står på varje
// sida där (Base.astro). Det registrerar appens service worker (public/sw-stod.js) med räckvidden hela sajten, eftersom appen
// rymmer tre delar, och tar bort appen Stöds registrering med räckvidden /stodundervisning, som annars skulle ta över
// metodbankens sidor med en egen kopia av samma skript. Det stoppar Chromes egen ruta om installation (mini-infobar), så att
// appen bara erbjuds när läraren själv går till /app (Niclas 2026-10-30: "Kan man göra att den inte öppnas automatiskt"; "Prevent
// the mini-infobar from appearing on mobile" med preventDefault, web.dev/articles/customize-install). Och att appen används
// räknas en gång om dagen, utan namn eller värden.
// Bara det minsta, så att skriptet inte läser in standarden på sidor som inte behöver den (src/scripts/raknare.ts).
import { goatcounter, idagLokalt } from './raknare';
import { arGamlaAppen, begarVaraktigLagring, GAMLA_APPEN, iAppen } from './webblasaren';
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

// Med planer sparade ber sidan webbläsaren låta dem stå kvar, varje gång (begarVaraktigLagring i webblasaren.ts).
try {
  if (/"planer":\[\{/.test(localStorage.getItem('insatser') ?? '')) begarVaraktigLagring();
} catch { /* lagringen är avstängd */ }

// Den gamla appen Stöd i iPhone och iPad visar överst hur läraren flyttar till Metodbanken, en gång i varje besök, med
// knappen Ladda ner planer, som läser in lagringen först när den trycks (arGamlaAppen i webblasaren.ts).
function gamlaAppen() {
  let start = location.pathname;
  try {
    start = sessionStorage.getItem('app-start') ?? start;
    sessionStorage.setItem('app-start', start);
    if (sessionStorage.getItem('app-gamla-visad') === '1' || !arGamlaAppen(start)) return;
    sessionStorage.setItem('app-gamla-visad', '1');
  } catch { if (!arGamlaAppen(start)) return; }
  const main = document.querySelector('main');
  if (!main) return;
  const ruta = document.createElement('div');
  ruta.className = 'pl-besked app-gamla';
  ruta.setAttribute('role', 'note');
  const rubrik = document.createElement('p');
  rubrik.textContent = GAMLA_APPEN.rubrik;
  const steg = document.createElement('ol');
  for (const s of GAMLA_APPEN.steg) { const li = document.createElement('li'); li.textContent = s; steg.append(li); }
  const knappar = document.createElement('p');
  knappar.className = 'pl-andra-knappar';
  const ner = document.createElement('button');
  ner.type = 'button';
  ner.className = 'knapp liten';
  ner.textContent = 'Ladda ner planer';
  ner.dataset.goatcounterClick = 'app:gamla:ladda-ner';
  ner.dataset.goatcounterTitle = 'Appen Stöd: planerna nedladdade för flytten';
  ner.addEventListener('click', async () => {
    const [{ allaPlanerna, idagLokalt: dag }, { laddaNer }, { PLANERA }] = await Promise.all([import('./insatser-lagring'), import('./skattning'), import('../lib/standard/index.js')]);
    const fil = allaPlanerna(PLANERA.version, dag(), null);
    if (fil) laddaNer(fil.blob, fil.namn);
    else rubrik.textContent = 'Det finns inga planer att ladda ner i den här appen.';
  });
  const stang = document.createElement('button');
  stang.type = 'button';
  stang.className = 'knapp sekundar liten';
  stang.textContent = 'Stäng';
  stang.addEventListener('click', () => ruta.remove());
  knappar.append(ner, stang);
  ruta.append(rubrik, steg, knappar);
  // I planens sidor står beskedet där beskedet om webbläsaren står (PlanNotis.astro, data-plan-notis), och annars överst.
  const notisen = document.querySelector('[data-plan-notis]');
  if (notisen) notisen.before(ruta); else main.prepend(ruta);
}
gamlaAppen();

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
