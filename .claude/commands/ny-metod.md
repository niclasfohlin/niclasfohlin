---
description: Skapa en metod i Stödundervisning från beskrivning, anteckningar eller dokument.
argument-hint: <beskrivning eller sökväg till underlag>
---
Underlag: $ARGUMENTS

1. Läs underlaget. Är det ett dokument: läs hela. Saknas något som mallen kräver (område, årskurs, genomförande): fråga Niclas i stället för att fylla i på egen hand.
2. Bestäm exakt ett område (Matematik, Läsning eller Skrivning) och minst en årskursnivå (F-3, 4-6, 7-9).
3. Välj taggar från registret. Kör npm run taggar. Ny tagg bara när ingen befintlig täcker, och då i samma commit som posten.
4. Skriv posten i src/content/stodundervisning/<slug>.md med _mall.md som förlaga och behåll rubrikerna Syfte, För vem, Material, Genomförande, Progression, Uppföljning och Källor. Genomförandet ska en lärare kunna följa i morgon utan att fråga. Källor bara som parentescitat som går att verifiera; osäkra källor stryks.
5. Följ STIL.md. Inga bristord om elever.
6. Kör npm run validera. Rätta tills det går igenom.
7. Skapa grenen innehall/<slug>, committa med meddelandet "Metod: <titel>". Pusha inte.
8. Visa frontmatter och genomförande för Niclas och fråga om något ska ändras.
