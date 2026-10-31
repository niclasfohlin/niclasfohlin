// Webbläsaren som sidan är öppnad i (K-510; Niclas 2026-10-25: "Går det att ha en knapp när den dyker upp som gör att man
// går till sidan i Chrome/Safari"). Facebook, Messenger, Instagram, LinkedIn och Google-appen öppnar länkar i en egen
// webbläsare inne i appen, med eget minne och utan att kunna lägga sidan på hemskärmen. Planera insatsen och Lär dig metoden
// säger det och har vägen ut, och erbjudandet om appen Metodbanken på /app har vägen ut i stället för stegen
// (src/scripts/appen.ts). Alla frågar här, så att de känner igen samma webbläsare; förut hade de var sitt mönster.
//
// Beskedet i planens sidor väljs också här, av en funktion för båda modulerna (webblasarensBesked; K-644, Niclas 2026-10-30:
// "Måste ha samma kod och rot för både metoder och stödundervisning när man går in på modulen i någon av dem"): i en apps
// egen webbläsare vägen ut, och i Safari i iPhone och iPad att planen görs i appen, eftersom Safari kan radera det en sida
// har sparat efter sju dagar med Safari utan besök på sidan, och en app på hemskärmen räknar sina egna dagar och inte väntas
// få sitt sparade raderat (WebKit, "Full Third-Party Cookie Blocking and More", 2020). Byggstenen i src/scripts/byggstenar.ts
// ritar det.
//
// Vägen ut följer webbläsarnas egen dokumentation. På Android är den en intent-länk (developer.chrome.com/docs/android/
// intents) utan bestämd app, så att Android öppnar appen Metodbanken när den är installerad, eftersom en installerad webbapp
// tar emot länkarna inom sin del av sajten (web.dev/articles/webapks), och annars telefonens webbläsare (Niclas samma dag: "om
// man har appen öppnas den med knapptrycket. Annars webbläsaren"). På iPhone kan en länk inte öppna en app på hemskärmen,
// och Apple beskriver ingen adress som öppnar Safari. x-safari-https:// gör det i iOS 15, 17 och 18 enligt utvecklare som har
// prövat den, men inte i iOS 16 (Christian Tietze, "Safari URL Scheme for macOS and iOS", 2023); Niclas valde den samma dag
// ("Kan man inte köra detta på Safari och iphone"), så knappen Öppna i Safari står med Kopiera länken bredvid, som håller
// där Safari inte öppnas. Om appens webbläsare släpper igenom länkarna går bara att pröva i en riktig telefon.

// Med ändelsen, så att proven kan läsa filen i Node (scripts/planprov.mjs och scripts/appprov.mjs).
import { APPEN } from '../lib/appen.ts';

export interface Webblasare {
  /** Appens namn i en mening, "Facebooks", eller tomt i en vanlig webbläsare och i appen Metodbanken. */
  app: string;
  ios: boolean;
  /**
   * Safari i iPhone och iPad. Chrome, Edge, Firefox och Opera har Safari i sitt namn där, men också sitt eget märke (CriOS,
   * EdgiOS, FxiOS, OPiOS), och beskedet om Safaris sju dagar gäller Safari (Niclas 2026-10-30: "känner av att man använder
   * Safari och iphone"; Codex 2026-10-31).
   */
  safari: boolean;
  android: boolean;
}

/** Är sidan öppnad i appen Metodbanken, från hemskärmen? */
export const iAppen = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/**
 * Webbläsaren ur dess namn (user agent). En iPad som säger att den är en Mac känns igen på pekskärmen (macMedPek).
 * @param ua webbläsarens namn
 */
export function webblasaren(ua = navigator.userAgent, o: { iAppen?: boolean; macMedPek?: boolean } = { iAppen: iAppen(), macMedPek: navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 }): Webblasare {
  const ios = /iPad|iPhone|iPod/.test(ua) || !!o.macMedPek;
  const android = /Android/.test(ua);
  const app = o.iAppen ? ''
    : /FBAN\/Messenger|FB_IAB\/MESSENGER/.test(ua) ? 'Messengers'
    : /FBAN|FBAV|FB_IAB/.test(ua) ? 'Facebooks'
    : /Instagram/.test(ua) ? 'Instagrams'
    : /LinkedInApp/.test(ua) ? 'LinkedIns'
    : /GSA\//.test(ua) ? 'Google-appens'
    // På iPhone har Safari och, sedan iOS 16.4, Chrome, Edge och Firefox Safari i sitt namn, men inte en apps egen
    // webbläsare (granskningen 2026-10-25).
    : ios && !/Safari\//.test(ua) ? 'en apps'
    // På Android har en apps egen webbläsare (WebView) märket wv, som Google säger att sajter kan leta efter om inte appen
    // har bytt ut namnet (Android Developers Blog, "User-Agent Reduction on Android WebView", december 2024). LinkedIns
    // webbläsare på Android saknar LinkedInApp i namnet (Niclas 2026-10-25: "knappen om webbläsare kom ej fram trots
    // linkedin browser").
    : android && /;\s*wv\)/.test(ua) ? 'en apps' : '';
  const safari = ios && !app && /Safari\//.test(ua) && !/CriOS|EdgiOS|FxiOS|OPiOS|OPT\//.test(ua);
  return { app, ios, safari, android };
}

/**
 * Vägen ut ur appens webbläsare, med knappens text, eller null där det inte finns någon. På Android står planen efter #
 * före intentens del, som Android läser från det sista #.
 */
export function vagenUt(adress: string, w: Webblasare): { href: string; text: string } | null {
  const u = new URL(adress);
  if (w.android) return { href: `intent://${u.host}${u.pathname}${u.hash}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(adress)};end`, text: 'Öppna i webbläsaren' };
  if (w.ios) return { href: `x-safari-https://${u.host}${u.pathname}${u.hash}`, text: 'Öppna i Safari' };
  return null;
}

/** Beskedet i appens webbläsare: varför planen ska göras någon annanstans, och vart. */
export const vagenUtText = (w: Webblasare) => `Du har öppnat sidan i ${w.app} egen webbläsare. En plan som sparas här finns bara här. ${w.android ? `Öppna sidan i webbläsaren, eller i appen ${APPEN.namn} om du har den` : w.ios ? `Öppna sidan i Safari, eller appen ${APPEN.namn} från hemskärmen om du har den` : 'Kopiera länken till din webbläsare'}, så finns planen kvar där.`;
/** Erbjudandet om appen i en apps webbläsare, som inte kan lägga sidan på hemskärmen: vart läraren går för att lägga till den. */
export const vagenUtTillAppen = (w: Webblasare) => `Du har öppnat sidan i ${w.app} egen webbläsare, som inte kan lägga appen på hemskärmen. Öppna sidan i ${w.ios ? 'Safari' : 'webbläsaren'} och lägg till appen där.`;

/**
 * Ber webbläsaren låta det sidan har sparat stå kvar (navigator.storage.persist), när läraren sparar en plan och när en sida i
 * appens delar öppnas med planer sparade, eftersom en beviljad begäran kan gälla bara tills webbläsaren stängs (Apples forum
 * för utvecklare, tråd 710157, 2022; Niclas 2026-10-31: "Bör vi inte slå på det om vi kan?"). Safari och Chrome avgör själva och
 * frågar inte läraren: WebKit beviljar efter bland annat om sidan är öppnad som app från hemskärmen (WebKit, "Updates to
 * Storage Policy", 2023), och Chrome efter bland annat om sidan är installerad (web.dev, "Persistent storage"). Firefox frågar
 * läraren med en ruta, och där begärs den bara när läraren sparar (fraga), så att rutan kommer efter något läraren gjorde och
 * inte när sidan öppnas (web.dev samma artikel; Niclas samma natt: "Då kan läraren trycka ja?"). En gång per besök, och inte
 * när lagringen redan är varaktig. Om en beviljad begäran undantar planerna från Safaris sju dagar står inte i WebKits
 * dokumentation, så beskedet om appen och filen står kvar som skyddet.
 */
let lagringenBegard = false;
export function begarVaraktigLagring(o: { fraga?: boolean } = {}, ua = navigator.userAgent): void {
  const fragar = /Firefox\//.test(ua) && !/FxiOS/.test(ua);
  if (lagringenBegard || (fragar && !o.fraga)) return;
  lagringenBegard = true;
  try {
    const s = navigator.storage;
    s?.persisted?.().then((ja) => (ja ? undefined : s.persist?.())).catch(() => undefined);
  } catch { /* webbläsaren saknar Storage API */ }
}

/**
 * Den gamla appen Stöd i iPhone och iPad (Niclas 2026-10-31: "Kan du på något sätt tvinga eller få till att de med gamla appen
 * blir uppdaterad till nya webbappen?"). iPhone läser in appens namn, ikon och startsida när den läggs på hemskärmen och
 * aldrig igen, så appen Stöd heter Stöd och börjar i /stodundervisning tills läraren lägger till Metodbanken, och dess planer
 * står i dess eget minne. I Android uppdaterar Chrome appen av sig själv ur manifestet (web.dev, "How Chrome handles updates to
 * the web app manifest"), och där visas inget. Appen känns igen på sidan den startade på: Metodbanken börjar på /app.
 * @param start sidan som appen öppnades på, den första i besöket
 */
export const GAMLA_APPENS_START = '/stodundervisning';
export function arGamlaAppen(start: string, w = webblasaren(), app = iAppen()): boolean {
  return app && w.ios && (start === GAMLA_APPENS_START || start.startsWith(`${GAMLA_APPENS_START}/`));
}
/** Beskedet i den gamla appen: rubriken och stegen till Metodbanken, med planerna i en fil. */
export const GAMLA_APPEN = Object.freeze({
  rubrik: `Det finns en ny app, ${APPEN.namn}, med Stöd och Metoder.`,
  steg: [
    'Tryck Ladda ner planer här nedanför, så har du alla planer i en fil.',
    `Öppna niclasfohlin.se${APPEN.adress} i Safari och lägg till ${APPEN.namn} på hemskärmen.`,
    `Öppna filen i ${APPEN.namn} med Öppna planer. Sedan kan du ta bort appen Stöd.`,
  ],
});

/** Varför planen görs i appen i iPhone och iPad, i beskedet och i påminnelsen om filen (WebKit 2020, överst i filen). */
export const SAFARI_RADERAR = 'Safari kan radera det sidan har sparat efter sju dagar utan besök. I appen på hemskärmen finns planen kvar.';

/** Beskedet om webbläsaren i planens sidor: slaget, texten och vart knappen leder. */
export type WebblasarensBesked = { slag: 'appens'; text: string; ut: { href: string; text: string } | null } | { slag: 'safari'; text: string; till: { href: string; text: string } };
/**
 * Beskedet om webbläsaren överst i Planera insatsen och Lär dig metoden, en funktion för båda: i en apps egen webbläsare vägen
 * ut med planens adress, och i Safari i iPhone och iPad att planen görs i appen, med knappen till appens sida och stegen
 * utfällda (#lagg-till). Inget i appen, i Chrome, Edge och Firefox i iPhone, i Chrome i Android och på en dator.
 * Knapparnas namn i planen kommer från sidan (PLANKNAPPAR i standarden), så att filen inte läser in standarden där bara
 * webbläsaren behövs.
 */
export function webblasarensBesked(adress: string, knappar: { laddaNer: string; oppna: string }, w = webblasaren(), app = iAppen()): WebblasarensBesked | null {
  if (app) return null;
  if (w.app) return { slag: 'appens', text: vagenUtText(w), ut: vagenUt(adress, w) };
  if (w.safari) return { slag: 'safari', text: `Gör planen i appen ${APPEN.namn}. ${SAFARI_RADERAR} Tills du har appen skyddar du planen med ${knappar.laddaNer}, och i appen öppnar du filen med ${knappar.oppna}.`, till: { href: `${APPEN.adress}#lagg-till`, text: 'Så lägger du till appen' } };
  return null;
}
