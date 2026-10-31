// Appen Metodbanken (K-644; Niclas 2026-10-30: "Går det att göra att appen heter Metoder&Stöd eller Insatser eller kanske du
// har bättre? Kan den ligga så den kommer fram på både Stödundervisning och Metoder?", och om namnet: "Ja. Använd
// Metodbanken."): Stödundervisning och Metoder som en app på hemskärmen, som börjar på /app med de två bankerna och lärarens
// planer. Här står appens namn, adresser och delar, som manifestet, sidhuvudet, appens sida och provet läser
// (src/pages/stodundervisning/manifest.webmanifest.ts, src/layouts/Base.astro, src/pages/app/index.astro och
// scripts/appprov.mjs). Service workern (public/sw-stod.js) har delarna som en egen lista, eftersom den inte kan läsa
// sajtens kod, och provet stannar när listorna skiljer sig åt. DRIFT.md under Appen Metodbanken.

export const APPEN = {
  /** Namnet under ikonen, och i iPhone (apple-mobile-web-app-title). */
  namn: 'Metodbanken',
  /** Namnet i installationsrutan. */
  fulltNamn: 'Metodbanken: Stöd och Metoder',
  beskrivning: 'Metodbanken för stödundervisning i grupp och undervisning i hela klassen, med dina insatser och planer på hemskärmen.',
  /** Appens sida, där appen börjar, och där den erbjuds i webbläsaren. */
  adress: '/app',
  /**
   * Manifestet står kvar där appen Stöd hade det sedan 2026-10-25, eftersom Google avråder från att flytta det ("Don't change
   * the name or location of your web app manifest file", web.dev/articles/manifest-updates), och id står kvar, så att Android
   * uppdaterar den installerade appen i stället för att se en ny.
   */
  manifest: '/stodundervisning/manifest.webmanifest',
  id: '/stodundervisning',
} as const;

/** Sajtens delar som hör till appen: appens sida och de två bankerna med allt under dem. */
export const APPENS_DELAR = [APPEN.adress, '/stodundervisning', '/metoder'] as const;

/** Hör sidan på adressen till appens delar? Där har sidan manifestet och appens ikon, och i appen göms sajtens meny. */
export const iAppensDel = (vag: string) => APPENS_DELAR.some((d) => vag === d || vag.startsWith(`${d}/`));
