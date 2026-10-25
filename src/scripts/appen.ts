// Appen Stöd (K-505, Niclas 2026-10-25): metodbanken som app på telefonens hemskärm. Skriptet registrerar appens service
// worker (public/sw-stod.js) och visar raden om appen (src/components/AppRad.astro) där den passar.
//
// | Var | När raden visas |
// |---|---|
// | Android och andra Chromium-webbläsare | När webbläsaren säger att appen går att installera (beforeinstallprompt); knappen visar telefonens egen fråga. På Planera insatsen först när planen är sparad, eftersom appen delar minne med Chrome och planen då finns i appen |
// | iPhone och iPad | Alltid, med tre steg, eftersom Safari inte kan installera med en knapp. Appen har sitt eget minne, skilt från Safari, så på Planera insatsen säger raden före sparandet att planen görs i appen, och efter hur en sparad plan flyttas dit som fil |
// | Aldrig | I appen själv, på en dator, i Facebooks och Instagrams egna webbläsare, och i 30 dagar efter krysset. När appen är installerad erbjuder Chrome ingen installation, så raden syns inte heller då |
//
// Inget av det läraren har skrivit skickas någonstans. Statistiken får bara trycken på knappen, installationen och att
// appen används, en gång om dagen (app:i-appen), utan namn eller värden.
import { goatcounter, idagLokalt, lasPlaner } from './insatser-lagring';
import { iAppen as iAppenNu, webblasaren } from './webblasaren';
import { PLANKNAPPAR } from '../lib/standard/index.js';

// Bara krysset gömmer raden i 30 dagar. Att appen installerades sparas inte: tas appen bort märker sidan det inte, och
// raden ska då komma tillbaka (Niclas 2026-10-25: "Jag avinstallerade appen men nu dyker inte upp igen att installera
// den"). Namnet byttes samma dag, så att den gamla markeringen inte gäller.
const STANGD = 'app-kryss';
const ANVAND = 'app-anvand';
const las = (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } };
const skriv = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* bara den här sidvisningen */ } };
const rakna = (path: string, title: string) => goatcounter()?.count?.({ path, title, event: true });

const iAppen = iAppenNu();

// Service workern bara på https, så att förhandsvisningen på datorn inte får en.
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw-stod.js', { scope: '/stodundervisning' }).catch(() => { /* sidan fungerar utan */ });

// Att appen används räknas en gång om dagen, när count.js har laddats.
if (iAppen && las(ANVAND) !== idagLokalt()) {
  const gor = () => { rakna('app:i-appen', 'Appen Stöd: används i dag'); skriv(ANVAND, idagLokalt()); };
  if (document.readyState === 'complete') gor(); else addEventListener('load', gor, { once: true });
}

const rad = document.querySelector<HTMLElement>('[data-app]');
const webb = webblasaren();
const ios = webb.ios;
const pekskarm = matchMedia('(pointer: coarse)').matches;
// Appars egna webbläsare kan inte lägga sidan på hemskärmen (src/scripts/webblasaren.ts).
const egenWebblasare = !!webb.app;
const stangdNyss = () => { const d = las(STANGD); return !!d && Date.now() - new Date(d).getTime() < 30 * 86400000; };

if (rad && !iAppen && pekskarm && !egenWebblasare && !stangdNyss()) {
  const knapp = rad.querySelector<HTMLButtonElement>('[data-app-knapp]')!;
  const om = rad.querySelector<HTMLElement>('[data-app-om]')!;
  const steg = rad.querySelector<HTMLElement>('[data-app-steg]')!;
  const not = rad.querySelector<HTMLElement>('[data-app-not]')!;
  const planera = rad.dataset.plats === 'planera';
  const harPlan = () => !!rad.dataset.metod && lasPlaner().planer.some((p) => p.metod === rad.dataset.metod);
  let fraga: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null = null;

  const dolj = () => { rad.hidden = true; };
  // När läraren själv gömmer raden flyttas fokus till sidans rubrik, så att den som använder tangentbord eller skärmläsare
  // inte tappar sin plats.
  const doljOchFlytta = () => { dolj(); const h = document.querySelector<HTMLElement>('h1'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } };
  // Texten efter telefon och plats; på Planera insatsen följer den om planen är sparad.
  const visa = () => {
    if (stangdNyss()) { dolj(); return; }
    if (ios) {
      knapp.textContent = 'Visa hur';
      knapp.setAttribute('aria-expanded', String(!steg.hidden));
      if (planera && harPlan()) {
        om.textContent = 'Ha planen på hemskärmen, ett tryck bort.';
        not.textContent = `Appen har sitt eget minne, skilt från Safari. Tryck på ${PLANKNAPPAR.laddaNer} här, och öppna filen i appen med ${PLANKNAPPAR.oppna}.`;
      } else if (planera) {
        om.textContent = 'Planerar du i telefonen? Lägg appen på hemskärmen först och gör planen där.';
        not.textContent = 'Appen har sitt eget minne, skilt från Safari, så en plan som görs i appen finns i appen.';
      } else {
        om.textContent = 'Metodbanken och Planera insatsen på hemskärmen.';
        not.textContent = lasPlaner().planer.length ? `Appen har sitt eget minne, skilt från Safari. En plan du har sparat här flyttar du dit med ${PLANKNAPPAR.laddaNer} och ${PLANKNAPPAR.oppna}.` : '';
      }
      not.hidden = !not.textContent;
    } else {
      if (!fraga || (planera && !harPlan())) { dolj(); return; }
      knapp.textContent = 'Installera';
      knapp.removeAttribute('aria-expanded');
      om.textContent = planera ? 'Ha planen på hemskärmen, ett tryck bort.' : 'Metodbanken och Planera insatsen på hemskärmen.';
    }
    rad.hidden = false;
  };

  knapp.addEventListener('click', async () => {
    if (fraga) {
      await fraga.prompt();
      await fraga.userChoice;
      // Ja eller nej: frågan går bara att ställa en gång, och raden går undan tills Chrome erbjuder installation igen.
      fraga = null;
      doljOchFlytta();
      return;
    }
    if (!ios) { dolj(); return; }
    steg.hidden = !steg.hidden;
    knapp.setAttribute('aria-expanded', String(!steg.hidden));
  });
  rad.querySelector('[data-app-stang]')!.addEventListener('click', () => { skriv(STANGD, new Date().toISOString()); doljOchFlytta(); });
  // iPhone och iPad installerar med stegen; frågan finns bara i Chrome och andra Chromium-webbläsare.
  if (!ios) addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); fraga = e as typeof fraga; visa(); });
  addEventListener('appinstalled', () => { rakna('app:installerad', 'Appen Stöd: installerad'); dolj(); });
  // Planera insatsen säger till när planen sparas (src/scripts/planera.ts).
  document.addEventListener('planera:sparad', visa);
  if (ios) visa();
}
