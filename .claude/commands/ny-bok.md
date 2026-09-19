---
description: Skapa eller uppdatera en bokpost.
argument-hint: <titel eller underlag>
---
Underlag: $ARGUMENTS

1. Samla titel, utgivningsår, förlag, medförfattare, serie, ISBN, omslag och länkar. Fakta du inte har: fråga Niclas. Hitta inte på år eller ISBN.
2. Omslaget läggs i public/images/bocker/<slug>.jpg. Har Niclas inte gett en bild: lämna omslag tomt och säg det.
3. Skriv beskrivning och längre presentation enligt STIL.md.
4. Skapa eller uppdatera src/content/bocker/<slug>.md med _mall.md som förlaga. Taggar från registret.
5. Kör npm run validera.
6. Gren innehall/bok-<slug>, commit "Bok: <titel>". Pusha inte.
