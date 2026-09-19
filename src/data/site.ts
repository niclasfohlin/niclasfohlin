// Sajtens grunddata. Ändra här, inte i enskilda sidor.
export const site = {
  namn: 'Niclas Fohlin',
  url: 'https://niclasfohlin.se',
  beskrivning: 'Artiklar, böcker och metoder för stödundervisning i matematik, läsning och skrivning.',
  // Kort rad under namnet i sidhuvud och på startsidan.
  rad: 'Specialpedagog, författare och föreläsare',
  sprak: 'sv',
  navigation: [
    { text: 'Artiklar', href: '/artiklar' },
    { text: 'Böcker', href: '/bocker' },
    { text: 'Stödundervisning', href: '/stodundervisning' },
    { text: 'Om', href: '/om' },
  ],
  omraden: ['Matematik', 'Läsning', 'Skrivning'] as const,
  arskurser: ['F-3', '4-6', '7-9'] as const,
};
