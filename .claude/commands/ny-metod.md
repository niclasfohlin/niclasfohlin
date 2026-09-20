---
description: Skapa en metod i Stödundervisning från beskrivning, anteckningar eller dokument.
argument-hint: <beskrivning eller sökväg till underlag>
---
Underlag: $ARGUMENTS

Metoderna kommer oftast som kompendier i docx eller pdf med samma modell: inledning, "Så fungerar insatsen", passrutin, tidsschema, stegtabell med exempelfraser, arbetsform, exempel, när gruppen fastnar, lärarens roll, var man hittar texterna, progression, uppföljning, mål, snabbmall, checklista och grund. Modellen i `src/content.config.ts` speglar det, och sidan, utskriften och Word-filerna byggs ur samma YAML. Hela arbetsgången står i ARBETSSATT.md under Metoder ur underlag.

1. Läs underlaget i sin helhet. Docx: `pandoc <fil> -t markdown -o <scratch>/underlag.md`. Pdf: läs sidorna med Read för designen. Innehåller underlaget flera metoder: dela upp texten per metod (rubriknivå 2) och gör en post per metod. Saknas något som en publicerad metod behöver (område, årskurs, passrutin eller genomförande, uppföljning): fråga Niclas i stället för att hitta på.
2. Bestäm exakt ett område (Matematik, Läsning eller Skrivning) och minst en årskursnivå (F-3, 4-6, 7-9). Metoder ur kompendierna gäller åk 4–9 om Niclas inte säger annat. Lagernivåer (lager 1, 2, 3, RTI) stryks: metoderna står fria på sajten.
3. Välj taggar från registret. Kör `npm run taggar`. Ny tagg bara när ingen befintlig täcker, och då i samma commit som posten.
4. Skriv metoden som en JavaScript-modul i `underlag/metoder/<slug>.mjs` som exporterar objektet (samma fält som `src/content/stodundervisning/_mall.yaml`), och kör `node scripts/metod-yaml.mjs underlag/metoder/<slug>.mjs`. Då blir citattecken, kolon och radbrytningar aldrig YAML-fel. Texten är Niclas egen ur underlaget, ordagrant, med bara dessa ändringar: lagernivå bort, årskurs enligt punkt 2, tankstreck i rubriker blir kolon, "du" i checklistan blir "jag". Fraser i stegtabellen skrivs utan citattecken (de sätts vid rendering). Delar som saknas i underlaget utelämnas.
5. Följ STIL.md i egen text (ingress, undertitel). Inga bristord om elever. Ingressen är egen text, två till fyra meningar, som fungerar i ett kort och i ett nyhetsbrev.
6. Kör `npm run validera`. Schemat är strikt: ett felstavat fält, en tabellrad med fel antal celler eller en okänd tagg stoppar bygget med besked. Rätta tills det går igenom.
7. Kör `node scripts/metodprov.mjs <slug> --underlag <scratch>/underlag-<slug>.md --bilder`. Det kontrollerar sidan, Word-filerna, upphovet i varje sidfot, att underlagets meningar finns kvar, och lägger skärmbilder i `underlag/prov/<slug>/` (desktop, mobil, utskrift). Titta på bilderna: tabellerna på mobil, rutorna, bockarna, sidfoten i utskriften. Öppna gärna docx-filen i Word.
8. Skapa grenen `innehall/<slug>` (eller arbeta på passets gren), committa med "Metod: <titel>". Pusha bara när arbetspasset är klart: en push per pass, och varje push mejlar prenumeranterna om nya metoder.
9. Visa Niclas metadata, passrutinen och de ändringar du gjort i hans text, och fråga om något ska ändras.
