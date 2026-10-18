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
| `INNEHALLSTAGGAR`, `innehallstaggar` | Innehållstaggarna per ämne, databasens sista nivå efter nivån och slaget. Matematikens är de fem delarna av det centrala innehållet i Lgr22 |
| `postensRad` | Postens egen första mening, som raden under titeln |
| `Post`, `PostUtskrift` (typerna) | Postens form: id, nivå, nummer, titel, rad, tagg, sida, lösningsförslag, bild och utskrifter, med var utskrifternas sidor står i källfilerna |
| `postFel`, `databasFel` | Kontrollerna, som listor med fel |
| `hamtplan` | Det billigaste sättet att hämta en listas sidor: posternas egna pdf:er eller källfilen en gång |

## Det som kommer

Lösningsförslaget som eget blad (metodriggens ram `Lösningsförslag: <nivå>, problem <nummer>, <titel>`, K-423) och texternas och faktatexternas databaser (testversion 2). Sedan, i etapp 2, databasen som egen fil, omvandlingen mellan riggens ramar och posterna åt båda hållen, mallarnas register och steget att lyfta ut en mall ur en metod. Före etapp 2 för sajten och riggen ett samtal om modulen.
