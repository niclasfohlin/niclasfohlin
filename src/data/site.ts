// Sajtens grunddata. Ändra här, inte i enskilda sidor.
export const site = {
  namn: 'Niclas Fohlin',
  url: 'https://niclasfohlin.se',
  beskrivning: 'Texter om skolan, böcker om undervisning och metoder för stödundervisning i läsning, skrivning och matematik.',
  // Kort rad under namnet i sidhuvud och på startsidan.
  rad: 'Speciallärare, specialpedagog, författare och föreläsare',
  epost: 'niclas.fohlin@gmail.com',
  // Porträttet på startsidan, om-sidan och delningskorten.
  portratt: '/images/niclas-fohlin.jpg',
  // Huvudsidornas titel och beskrivning, som sidorna och deras delningskort läser (src/lib/delningskort.ts).
  // Varje artikel, bok och metod har sin egen i posten.
  sidor: {
    artiklar: { titel: 'Artiklar', beskrivning: 'Krönikor, debattartiklar och intervjuer om skolan, publicerade i Vi Lärare, Göteborgs-Posten och andra tidningar. Sök bland texterna eller bläddra per år.' },
    bocker: { titel: 'Böcker', beskrivning: 'Niclas Fohlins böcker om kooperativt lärande, undervisning och läsinlärning, samt läromedel och kapitel i andra böcker.' },
    stodundervisning: { titel: 'Stödundervisning', beskrivning: 'Metodbank för stödundervisning i matematik, läsning, skrivning och socialt samspel. Varje metod har körschema, exempelfraser och mallar, och går att skriva ut och ladda ner som Word-fil.' },
    om: { titel: 'Om Niclas Fohlin', beskrivning: 'Niclas Fohlin är samordnande specialpedagog på AcadeMedias grundskolor, speciallärare, författare och föreläsare.' },
    prenumerera: { titel: 'Prenumerera', beskrivning: 'Få ett mejl när det kommer nya texter, böcker eller metoder.' },
    taggar: { titel: 'Taggar', beskrivning: 'Alla ämnen som texterna och metoderna är taggade med.' },
  },
  sprak: 'sv',
  navigation: [
    { text: 'Artiklar', href: '/artiklar' },
    { text: 'Böcker', href: '/bocker' },
    { text: 'Stödundervisning', href: '/stodundervisning' },
    { text: 'Om', href: '/om' },
  ],
  // OAuth-klient-id (webb) från Niclas Google Cloud-projekt, för knappen "Spara i Drive" vid
  // Word-filerna. Ingen hemlighet: det står i sidans kod. Tomt: knapparna visas inte. Se DRIFT.md.
  driveKlientId: '656779914599-bf50fg8iddnhqcb8gaa0co2dd3h8ou1k.apps.googleusercontent.com',
  // Besöksstatistiken i GoatCounter (Niclas konto, niclasfohlin.goatcounter.com): sidvisningar utan kakor och utan
  // personuppgifter, och nedladdningar och utskrifter som händelser på knapparna. Räkningen går till GoatCounter
  // och drar inga Netlify-krediter. Tomt: inget räknas. Se DRIFT.md under Besöksstatistik.
  statistik: 'https://niclasfohlin.goatcounter.com/count',
  omraden: ['Matematik', 'Läsning', 'Skrivning', 'Socialt'] as const,
  arskurser: ['F-3', '4-6', '7-9'] as const,
};
