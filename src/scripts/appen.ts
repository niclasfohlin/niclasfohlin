// Erbjudandet om appen Metodbanken på appens sida, /app (K-505, K-644; Niclas 2026-10-30: "Kan man göra att den inte öppnas
// automatiskt. Men trycker man på den kommer man till en sida som niclasfohlin.se/app"). Raden står i
// src/components/AppRad.astro, och skriptet visar den där den passar. Service workern och att appen används står i
// src/scripts/appdelen.ts, som alla appens sidor har.
//
// | Var | När raden visas |
// |---|---|
// | Chrome och andra Chromium-webbläsare, i Android och på en dator | När webbläsaren säger att appen går att installera (beforeinstallprompt); knappen visar webbläsarens egen fråga |
// | iPhone och iPad | Alltid, med tre steg, eftersom Safari inte kan installera med en knapp, och med stegen utfällda när läraren kommer från beskedet i planens sidor (#lagg-till). Appen har sitt eget minne, skilt från Safari, så raden säger hur en sparad plan flyttas dit |
// | En apps egen webbläsare, som Facebooks, i en telefon | Med vägen ut till Safari eller webbläsaren, eftersom den webbläsaren inte kan lägga sidan på hemskärmen |
// | Aldrig | I appen själv, och i 30 dagar efter krysset, utom när läraren kommer från beskedet. När appen är installerad erbjuder Chrome ingen installation, så raden syns inte heller då |
//
// Inget av det läraren har skrivit skickas någonstans. Statistiken får bara trycken och installationen, utan namn eller värden.
import { goatcounter, LISTANS_KNAPPAR, lasPlaner } from './insatser-lagring';
import { iAppen, vagenUt, vagenUtTillAppen, webblasaren } from './webblasaren';
import { APPEN } from '../lib/appen';

// Bara krysset gömmer raden i 30 dagar. Att appen installerades sparas inte: tas appen bort märker sidan det inte, och raden
// ska då komma tillbaka (Niclas 2026-10-25: "Jag avinstallerade appen men nu dyker inte upp igen att installera den").
// Namnet byttes 2026-10-30, när raden flyttade från bankerna till /app, så att ett kryss på bankernas rad inte gömmer
// erbjudandet på sidan som läraren själv har gått till.
const STANGD = 'appen-kryss';
const DAGAR = 30;
const las = (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } };
const skriv = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* bara den här sidvisningen */ } };
const rakna = (path: string, title: string) => goatcounter()?.count?.({ path, title, event: true });

const rad = document.querySelector<HTMLElement>('[data-app]');
const webb = webblasaren();
const pekskarm = matchMedia('(pointer: coarse)').matches;
// Läraren kom från beskedet i Planera insatsen eller Lär dig metoden och vill lägga till appen nu.
const fran = location.hash === '#lagg-till';
const stangdNyss = () => { const d = las(STANGD); return !fran && !!d && Date.now() - new Date(d).getTime() < DAGAR * 86400000; };

if (rad && !iAppen() && !stangdNyss()) {
  const knapp = rad.querySelector<HTMLButtonElement>('[data-app-knapp]')!;
  const ut = rad.querySelector<HTMLAnchorElement>('[data-app-ut]')!;
  const om = rad.querySelector<HTMLElement>('[data-app-om]')!;
  const steg = rad.querySelector<HTMLElement>('[data-app-steg]')!;
  const not = rad.querySelector<HTMLElement>('[data-app-not]')!;
  let fraga: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }) | null = null;

  const dolj = () => { rad.hidden = true; };
  // När läraren själv gömmer raden flyttas fokus till sidans rubrik, så att den som använder tangentbord eller skärmläsare
  // inte tappar sin plats.
  const doljOchFlytta = () => { dolj(); const h = document.querySelector<HTMLElement>('h1'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } };
  const visa = () => {
    if (stangdNyss()) { dolj(); return; }
    if (webb.app) {
      // En apps egen webbläsare: vägen ut i stället för stegen, där det finns en.
      const dit = vagenUt(location.href.replace(/#.*$/, ''), webb);
      if (!dit || !pekskarm) { dolj(); return; }
      om.textContent = vagenUtTillAppen(webb);
      knapp.hidden = true;
      ut.href = dit.href;
      ut.textContent = dit.text;
      ut.hidden = false;
    } else if (webb.ios) {
      knapp.textContent = 'Visa hur';
      knapp.setAttribute('aria-expanded', String(!steg.hidden));
      // Appen har sitt eget minne, skilt från Safari (web.dev/learn/pwa/installation: "Each installation has its own isolated
      // storage"), så en plan som är sparad här flyttas dit som fil, med knapparna under listorna på den här sidan.
      const planer = lasPlaner().planer;
      not.textContent = planer.length ? `Appen har sitt eget minne, skilt från Safari. ${planer.length === 1 ? 'Planen' : 'Planerna'} du har sparat här flyttar du dit med ${LISTANS_KNAPPAR.laddaNer} här och ${LISTANS_KNAPPAR.oppna} i appen.` : '';
      not.hidden = !not.textContent;
    } else {
      if (!fraga) { dolj(); return; }
      knapp.textContent = 'Installera';
      knapp.removeAttribute('aria-expanded');
    }
    rad.hidden = false;
  };
  // Stegen fälls ut, och raden kommer fram, när läraren kom från beskedet.
  const fallUt = () => { steg.hidden = false; knapp.setAttribute('aria-expanded', 'true'); rad.scrollIntoView({ block: 'center' }); };

  knapp.addEventListener('click', async () => {
    if (fraga) {
      await fraga.prompt();
      await fraga.userChoice;
      // Ja eller nej: frågan går bara att ställa en gång, och raden går undan tills Chrome erbjuder installation igen.
      fraga = null;
      doljOchFlytta();
      return;
    }
    if (!webb.ios) { dolj(); return; }
    steg.hidden = !steg.hidden;
    knapp.setAttribute('aria-expanded', String(!steg.hidden));
  });
  rad.querySelector('[data-app-stang]')!.addEventListener('click', () => { skriv(STANGD, new Date().toISOString()); doljOchFlytta(); });
  // iPhone och iPad installerar med stegen; frågan finns bara i Chrome och andra Chromium-webbläsare. Frågan sparas, så att
  // Chrome inte visar sin egen ruta (src/scripts/appdelen.ts gör samma sak på appens andra sidor).
  if (!webb.ios && !webb.app) addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); fraga = e as typeof fraga; visa(); });
  addEventListener('appinstalled', () => { rakna('app:installerad', `Appen ${APPEN.namn}: installerad`); dolj(); });
  if (webb.ios || webb.app) visa();
  if (fran && webb.ios && !rad.hidden) fallUt();
}
