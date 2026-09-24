---
description: Skapa eller uppdatera en bokpost.
argument-hint: <titel eller underlag>
---
Underlag: $ARGUMENTS

1. Samla titel, utgivningsår, förlag, medförfattare, serie, ISBN, omslag och länkar. Fakta du inte har: fråga Niclas. Hitta inte på år eller ISBN.
2. Omslaget läggs i public/images/bocker/<slug>.jpg. Bilden visas i 120 och 240 px; är den bredare än 600 px eller större än 150 kB, skala ner med Python och PIL (finns installerat): `Image.open(f).thumbnail((600, 900))` och spara med quality 85. Har Niclas inte gett en bild: lämna omslag tomt och säg det.
3. Skriv beskrivning och längre presentation enligt STIL.md.
4. Skapa eller uppdatera src/content/bocker/<slug>.md med _mall.md som förlaga. Taggar från registret. Fält du saknar uppgift om tas bort, inte lämnas med mallens exempelvärden. `utkast: false` när boken ska ut. Lägg också en rad i `underlag/bocker/register.json`.
5. Kör npm run validera.
6. Gren innehall/bok-<slug>, commit "Bok: <titel>". Visa posten för Niclas; efter hans ok, eller om han redan sagt "lägg upp", slå ihop till main och pusha, en push per pass. Pushen mejlar prenumeranterna om den nya boken. Efter pushen: `node scripts/deploykoll.mjs` väntar in bygget och visar om mejlet gick.
