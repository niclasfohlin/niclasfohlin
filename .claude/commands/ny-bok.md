---
description: Skapa eller uppdatera en bokpost.
argument-hint: <titel eller underlag>
---
Underlag: $ARGUMENTS

1. Samla titel, utgivningsår, förlag, medförfattare, serie, ISBN, omslag och länkar. Fakta du inte har: fråga Niclas. Hitta inte på år eller ISBN.
2. Omslaget läggs i public/images/bocker/<slug> med den ändelse det kom med (.jpg eller .png), och posten får samma sökväg. Bilden visas i 120 och 240 px. `npm run validera` krymper den automatiskt till 480 pixlar bred med kvalitet 78, gör en PNG utan genomskinlighet till JPEG med ny sökväg i posten och i underlag/bocker/register.json, och ritar bokens delningskort med omslaget; committa bilden, `src/data/bilder.json` och kortet i `public/delning/` med posten. Har Niclas inte gett en bild: lämna omslag tomt och säg det.
3. Skriv beskrivning och längre presentation enligt STIL.md.
4. Skapa eller uppdatera src/content/bocker/<slug>.md med _mall.md som förlaga. Taggarna väljs efter reglerna i ARBETSSATT.md under Innehåll; pröva förslagen med `node scripts/taggar.mjs --post <fil>` och skriv in en ny bok i `src/data/taggprov.json`. Fält du saknar uppgift om tas bort, inte lämnas med mallens exempelvärden. `utkast: false` när boken ska ut. Lägg också en rad i `underlag/bocker/register.json`.
5. Kör npm run validera.
6. Gren innehall/bok-<slug>, commit "Bok: <titel>". Visa posten för Niclas; efter hans ok, eller om han redan sagt "lägg upp", ladda upp som ARBETSSATT.md säger under Kontroll före uppladdning och sedan under Uppladdning; prenumeranterna får då ett mejl om boken.
