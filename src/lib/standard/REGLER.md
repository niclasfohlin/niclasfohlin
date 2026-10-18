# Standarden för databaser och mallar

Den här mappen är början på modulen som sajten och metodriggen ska dela, som wordparitet (`C:/wordparitet`). Planen och skälen står i `underlag/prov/verktyg/PLAN-3.md` (avsnitt 8 och 9) och i METODER.md under De centrala sakerna.

## Det som gäller för koden här

| Regel | Varför |
|---|---|
| Vanlig JavaScript (ESM) med typerna i `index.d.ts` | Node 22.12, som Netlify bygger med, läser inte TypeScript, och riggen ska kunna köra samma fil |
| Ingen import av `astro:`, `node:` eller sajtens data (`src/data/`, json) | Webbläsaren, skripten och riggen ska kunna köra koden; det sajten vet ges som argument |
| Kontrollerna är funktioner som ger en lista med fel | Sajten gör dem till byggfel, riggen skriver dem i sin rapport |
| Varje ändring står i `CHANGELOG.md` med datum och skäl | När mappen blir en delad modul får den versioner som wordparitet |

`scripts/standardprov.mjs` prövar de två första reglerna och funktionernas svar i `npm run validera`.

## Det som finns

| Del | Vad |
|---|---|
| `slugAv` | Adressens led ur ett namn. En funktion för alla adresser som görs ur namn |
| `UPPTAGNA_LED` | Leden under en metods adress som metodens egna sidor har |

## Det som kommer

Postens form för Ta fram-sidorna (id, grupp, nummer, titel, första raden, bild, sida och pdf-delarna med version), och kontrollerna för den, när Ta fram ett matteproblem byggs. Sedan, i etapp 2, databasen som egen fil, omvandlingen mellan riggens ramar och posterna åt båda hållen, mallarnas register och steget att lyfta ut en mall ur en metod. Före etapp 2 för sajten och riggen ett samtal om modulen.
