---
description: Ta in en ny metod för hela klassen i Metoder ur metodriggens leverans.
argument-hint: <metodens id, som kooperativt-larande>
---
Metod: $ARGUMENTS

Metoder för hela klassen skrivs av metodriggen efter dess standard (`C:/metodrigg/docs/undervisningsmetoder/standarden.md`), och sajten tar in dem. Delarna, filerna och proven står i METODER.md under Undervisningsmetoderna (Metoder), och Lär dig metoden i PLANERA.md. Läs båda först. Det här är det körbara flödet, så som Kooperativt lärande togs in inför lanseringen 2026-10-31 (`underlag/prov/metoder/LANSERINGEN.md`, steg 3). Hur mycket som kommer på en gång hålls ihop står i ARBETSSATT.md under Kön.

1. Läs riggens brev om leveransen: `C:/metodrigg/out/undervisningsmetoder/TILL-SAJTEN.md` och `C:/metodrigg/out/<id>/`. Kör `node scripts/metodriggprov.mjs <id>`, som prövar fälten som sidan, metodkortet och Lär dig metoden läser. Stannar det, skriv till riggen i `FRAN-SAJTEN.md` och vänta på en ny leverans.
2. Kopiera `C:/metodrigg/methods/<id>/metod.yaml` till `src/content/undervisningsmetoder/<id>.yaml` oförändrad, också raden `utkast`: `scripts/metoderfiler.mjs` jämför filens summa med riggens dokument, och metoden stannar på sin gren tills Niclas har sagt ladda upp (steg 11). Ändra inget i texten på sajten: ett fel i metoden går tillbaka till riggen.
3. Ta in dokumenten och filmerna med `node scripts/metoderfiler.mjs`, som stannar när de är byggda ur en annan metodfil. Lathundens PowerPoint och pdf och filmernas mp4 gör `npm run validera`.
4. Taggarna: `node scripts/taggar.mjs --post src/content/undervisningsmetoder/<id>.yaml`, och avgör förslagen (ARBETSSATT.md under Innehåll).
5. En ny delad sak, som ett verktyg i `src/data/centrala.json`, prövas med såddprovet innan den sås (METODER.md under De centrala sakerna). Metoden själv prövas mot verktyget Strategier: riggen prövar strategierna mot metodens text och skriver texten, och sajten för in dem i `src/data/strategier-i-metoder.json`, eller `nej` med skälet, så att metodens fil inte ändras. `scripts/strategier/prov.mjs` stannar på en metod som inte står där. Strukturerna står i metodens fält `strukturkort`, som riggen avgör i analysen.
6. `npm run validera`, med `METODER_UTKAST=1` först när metoden har `utkast: true`. Den prövar sidan, lathunden, Lär dig metoden, pariteten mellan sidan och riggens pdf, länkarna och knapparna för allt namngivet, datumet och filversionen (METODER.md, tabellen under Undervisningsmetoderna).
7. Läs sidan, lathundens sida och Lär dig metoden som bilder i telefonbredd och på dator, och metodkortet i banken på /metoder. Gör provet Den trötta läraren (METODER.md under Arbetsgången): det läraren ska skriva ut och sätta upp före första lektionen får små kort i `src/data/bladkort.json`, och `npm run validera` gör minibilderna.
8. Lär dig metoden prövas som en ny plan i modulen: stegen i PLANERA.md. Liggaren `node scripts/planera/steg.mjs visa` läser bara metoderna i Stödundervisning, så i Metoder hålls stegen i granskningsmappen, med förebilden `underlag/prov/testbaserat-larande/granskning/`.
9. Granskningen: läraren, formen, språket och en kall läsare i Lär dig metoden mot en testsida (`node scripts/utkast.mjs --namn <id>`), och Codex. P1 lagas före uppladdningen. Det som hör till metoden går som brev till riggen.
10. När riggen har levererat den slutliga versionen och allt är grönt, kör `npm run validera` igen med metodens `utkast: false`. Metoden står då i nytt.json, flödena, webbplatskartan och sina taggar, och får sitt delningskort (scripts/cacheprov.mjs stannar annars).
11. Visa Niclas testsidan, och ladda upp först när han har sagt det (ARBETSSATT.md under Kontroll före uppladdning och Uppladdning). Pushen mejlar prenumeranterna om metoden.
12. Skriv återkopplingen till riggen: lärdomarna för nästa metod, innehållet först och formen sist, och skicka ett meddelande till Metodrigg-sessionen med dess id.
