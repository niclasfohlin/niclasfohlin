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
| `INNEHALLSTAGGAR`, `innehallstaggar` | Innehållstaggarna per ämne, databasens sista nivå efter nivån och slaget. Matematikens är de fem delarna av det centrala innehållet i Lgr22. En metod med egna slag, som lästexternas slag i Textsamtal i grupp, ger sina taggar själv |
| `postensRad` | Postens egen första mening, som raden under titeln |
| `Post`, `PostUtskrift` (typerna) | Postens form: id, nivå, nummer, titel, rad, taggar (en eller flera), sida, lösningsförslag, bild (när posten har en) och utskrifter, med var utskrifternas sidor står i källfilerna |
| `postFel`, `databasFel` | Kontrollerna, som listor med fel |
| `hamtplan` | Det billigaste sättet att hämta en listas sidor: posternas egna pdf:er eller källfilen en gång |
| `fohlinHanvisningar` | Hänvisningarna till Niclas Fohlins böcker i en text, med platsen, medförfattarna, året och titeln, så att den som ritar texten gör dem till länkar: till bokens sida när boken finns, och till sajtens sida med alla böcker (`/bocker`) när den inte är utgiven. Vilken bok det är avgör sajten ur böckernas år och medförfattare. Reglerna står i sajtens STIL.md under Hänvisningar |
| `tidensMatt`, `mojligaUpplagg` | Metodens upplägg ur faktarutans tid: passets längd och hur ofta, och vilka av de tre uppläggen tiden rymmer (Intensivträning, Lektionsupplägg, Återkommande pass). En metod har exakt ett. Reglerna står i sajtens ARBETSSATT.md under Innehåll |
| `faktaIFastForm` | Metodkortets ruta i fast form ur faktarutans grupp, tid och period: antal elever, minuter, pass i veckan och veckor, lika för alla metoder. Ett fält som inte går att läsa ger null, och sajten stoppar metoden |
| `stor`, `mening`, `esc`, `talAv`, `talText` och de andra i `text.js` | Små textverktyg och talen i ord, en rot för varje, som standardens andra delar och sajten hämtar. Talen läses med siffror eller ord, också sammansatta som "tjugofem", och skrivs med bokstäver upp till tolv. `meningarna` delar en text i meningar, och `sammaElev` säger om ett namn på en elevs rad är samma elev |
| `malensMening` och `kortetsMalFel` i `plan.js` | Metodens övergripande mål (`mal.overgripande`): meningen på metodens sida och i Word, och lektionskortets mål ordagrant. Riggen skriver målet i varje metod och på kortet |
| `rollensRad` och `planensCitatFel` i `plan.js` | Planens roller och texter ur metoden: en rad ur metodens tabell, eller ett ordagrant citat, så att planen är 1–1 med metodens sida. Riggen kör samma spärr |
| `tidsschematsFel`, `varianternasFel`, `variantensMening` och `variantensNar` i `plan.js` | Tidsschemats varianter, passets form vissa veckor, i vissa pass och i ett kortare pass, som metodens sida, Word, lathunden, lektionskortet och planen läser ur samma rot. Riggen kör samma spärr före leveransen. Reglerna står i sajtens METODER.md under Tidsschemats varianter |
| `BILDTEXT`, `meningarI`, `bildtextFel` | Bildtexten under en bild: en till tre meningar och högst 250 tecken, inte "Bilden visar", och ett blad har sitt textalternativ i `alt`. Det som bildtexten säger, det bilden inte kan berätta själv, prövas i granskningen. Reglerna står i sajtens STIL.md under Bildtexter |
| `fastaAntal` | Spärren: de fasta antalen av en databas poster (från fem) och grupper (från två) i en text, som "tjugofem texter" eller "tre teman". De slutar stämma när databasen växer, och eftersom texten också står i Word-filerna, pdf:erna och lathunden skulle de göra om dem varje gång. Texten säger var posterna finns, och sidorna visar talen. Reglerna står i sajtens METODER.md under Antalen och databaserna |
| `plan.js`: `metodplan`, `planFel`, `utanPlanensFalt`, `planera`, `forstaMandagen`, `forval`, `tolkaTid`, `tolkaSteg`, `rodaDagar`, `isoVecka`, `kodaVal`, `lasVal`, `rentaTider`, `passetsTid`, `tidText`, `tidsspann`, `dagarText`, `rentMal`, `malText`, `utanNamn`, `passensMinuter`, `minuterText`, `LANGSTA`, `dokumentationstext`, `kalenderfil`, `sammanstallning`, `sammanstallningstext`, `elevtext`, `elevensResultat`, `rensaFoljd`, `SKALAN`, `mittVeckan`, `tolkaPassen`, `passetsRoller`, `forvaldLangd`, `planvecka`, `stegUtanfor` | Planera insatsen: metodens plan ur faktarutans tid och period, progressionens veckor och uppföljningens `tid`, passen med datum och röda dagar, veckor som upprepas, lov, flyttade och inställda pass, passens tider, insatsens mål, länken, texten till åtgärdsprogrammet, kalenderfilen och sammanställningen när läraren följer insatsen, med elevernas namn bortbytta i texterna som kopieras. Passens roller (`plan.passen`), före första passet, en stege som börjar högre upp och de steg planen inte når. `utanPlanensFalt` säger på ett ställe vilka fälten är, som bara planens sida läser. Reglerna står i sajtens METODER.md under Planera insatsen |
| `saker.js`: `sakensFormer`, `sakdelar`, `olankadeSaker` | Metodens saker i en text: namnen på bladen, korten, mallarna, testen och texterna i sina former, och spärren mot ett namn som ingen sak har. Sajten bygger listan över sakerna och deras adresser ur metodens fil; reglerna står i sajtens STIL.md under Hänvisningar |

## Det som kommer

Lösningsförslaget som eget blad (K-423) och texternas och faktatexternas databaser är gjorda i testversion 2. Sedan, i etapp 2, databasen som egen fil, omvandlingen mellan riggens ramar och posterna åt båda hållen, mallarnas register och steget att lyfta ut en mall ur en metod. Före etapp 2 för sajten och riggen ett samtal om modulen.
