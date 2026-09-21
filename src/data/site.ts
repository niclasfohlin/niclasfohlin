// Sajtens grunddata. Ändra här, inte i enskilda sidor.
export const site = {
  namn: 'Niclas Fohlin',
  url: 'https://niclasfohlin.se',
  beskrivning: 'Texter om skolan, böcker om undervisning och metoder för stödundervisning i läsning, skrivning och matematik.',
  // Kort rad under namnet i sidhuvud och på startsidan.
  rad: 'Speciallärare, specialpedagog, författare och föreläsare',
  epost: 'niclas.fohlin@gmail.com',
  // Bild som visas när en sida delas och sidan saknar egen bild.
  delningsbild: '/images/niclas-fohlin-delning.jpg',
  sprak: 'sv',
  navigation: [
    { text: 'Artiklar', href: '/artiklar' },
    { text: 'Böcker', href: '/bocker' },
    { text: 'Stödundervisning', href: '/stodundervisning' },
    { text: 'Om', href: '/om' },
  ],
  // OAuth-klient-id (webb) från Niclas Google Cloud-projekt, för knappen "Spara i Drive" vid
  // Word-filerna. Ingen hemlighet: det står i sidans kod. Tomt: knapparna visas inte. Se DRIFT.md.
  driveKlientId: '',
  omraden: ['Matematik', 'Läsning', 'Skrivning'] as const,
  arskurser: ['F-3', '4-6', '7-9'] as const,
};
