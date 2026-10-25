// Webbläsaren som sidan är öppnad i (K-510; Niclas 2026-10-25: "Går det att ha en knapp när den dyker upp som gör att man
// går till sidan i Chrome/Safari"). Facebook, Messenger, Instagram, LinkedIn och Google-appen öppnar länkar i en egen
// webbläsare inne i appen, med eget minne och utan att kunna lägga sidan på hemskärmen. Planera insatsen säger det och har
// vägen ut (src/scripts/planera.ts), och raden om appen Stöd syns inte där (src/scripts/appen.ts). Båda frågar här, så att
// de känner igen samma webbläsare; förut hade de var sitt mönster.
//
// Vägen ut följer webbläsarnas egen dokumentation. På Android är den en intent-länk (developer.chrome.com/docs/android/
// intents) utan bestämd app, så att Android öppnar appen Stöd när den är installerad, eftersom en installerad webbapp tar
// emot länkarna inom sin del av sajten (web.dev/articles/webapks), och annars telefonens webbläsare (Niclas samma dag: "om
// man har appen öppnas den med knapptrycket. Annars webbläsaren"). På iPhone kan en länk inte öppna en app på hemskärmen,
// och Apple beskriver ingen adress som öppnar Safari. x-safari-https:// gör det i iOS 15, 17 och 18 enligt utvecklare som har
// prövat den, men inte i iOS 16 (Christian Tietze, "Safari URL Scheme for macOS and iOS", 2023); Niclas valde den samma dag
// ("Kan man inte köra detta på Safari och iphone"), så knappen Öppna i Safari står med Kopiera länken bredvid, som håller
// där Safari inte öppnas. Om appens webbläsare släpper igenom länkarna går bara att pröva i en riktig telefon.

export interface Webblasare {
  /** Appens namn i en mening, "Facebooks", eller tomt i en vanlig webbläsare och i appen Stöd. */
  app: string;
  ios: boolean;
  android: boolean;
}

/** Är sidan öppnad i appen Stöd, från hemskärmen? */
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
    : ios && !/Safari\//.test(ua) ? 'en apps' : '';
  return { app, ios, android };
}

/** Sidans adress utan det som appen har lagt till, som Facebooks fbclid: sidan och det som står efter #. */
export const sidansAdress = (l: { origin: string; pathname: string; hash: string }) => `${l.origin}${l.pathname}${l.hash}`;

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
export const vagenUtText = (w: Webblasare) => `Du har öppnat sidan i ${w.app} egen webbläsare. En plan som sparas här finns bara här. ${w.android ? 'Öppna sidan i webbläsaren, eller i appen Stöd om du har den' : w.ios ? 'Öppna sidan i Safari, eller appen Stöd från hemskärmen om du har den' : 'Kopiera länken till din webbläsare'}, så finns planen kvar där.`;
