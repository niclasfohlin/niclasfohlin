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
| `passetsBeskrivning`, `passetsVisadeRoller` och `FORE_PASSET` i `plan.js` | Passet som planen och kalendern visar det: namnet, raderna och delarna. En rad i `plan.passen` med `del` står i passets del, eller i förberedelsen när delen är Före passet, först eller med `istallet` i stället för delens text, tabellens andra kolumner och fraserna, och `planensRamFel` stoppar en del som passet inte har. Av raderna om passets plats i insatsen visar passet den mest bestämda och raderna med samma när. Riggen skriver `del` när en rad för vissa veckor eller pass gäller en del av passet, och med `istallet` delens hela text för de passen, med metodens meningar |
| `plan.foreVeckor` i `metodplan` och `planera` | Skolveckorna före första passet när det metoden gör före start tar mer än en vecka, som Chambers boksamtals läsintervjuer och böcker: planens Före börjar så många skolveckor före, förbi lov |
| `plan.sistaRaden` i `metodplan` och `planera` | Progressionens sista rad tar planens sista vecka när perioden slutar före den, när metoden säger det, som Problemlösnings ledet Du gör själv i en period kortare än åtta veckor |
| `BILDTEXT`, `meningarI`, `bildtextFel` | Bildtexten under en bild: en till tre meningar och högst 250 tecken, inte "Bilden visar", och ett blad har sitt textalternativ i `alt`. Det som bildtexten säger, det bilden inte kan berätta själv, prövas i granskningen. Reglerna står i sajtens STIL.md under Bildtexter |
| `fastaAntal` | Spärren: de fasta antalen av en databas poster (från fem) och grupper (från två) i en text, som "tjugofem texter" eller "tre teman". De slutar stämma när databasen växer, och eftersom texten också står i Word-filerna, pdf:erna och lathunden skulle de göra om dem varje gång. Texten säger var posterna finns, och sidorna visar talen. Reglerna står i sajtens METODER.md under Antalen och databaserna |
| `plan.js`: `metodplan`, `planFel`, `utanPlanensFalt`, `planera`, `forstaMandagen`, `forval`, `tolkaTid`, `tolkaSteg`, `rodaDagar`, `isoVecka`, `kodaVal`, `lasVal`, `rentaTider`, `passetsTid`, `tidText`, `tidsspann`, `dagarText`, `rentMal`, `malText`, `utanNamn`, `passensMinuter`, `minuterText`, `LANGSTA`, `dokumentationstext`, `kalenderfil`, `sammanstallning`, `sammanstallningstext`, `elevtext`, `elevensResultat`, `rensaFoljd`, `SKALAN`, `mittVeckan`, `tolkaPassen`, `passetsRoller`, `forvaldLangd`, `planvecka`, `stegUtanfor` | Planera insatsen: metodens plan ur faktarutans tid och period, progressionens veckor och uppföljningens `tid`, passen med datum och röda dagar, veckor som upprepas, lov, flyttade och inställda pass, passens tider, insatsens mål, länken, texten till åtgärdsprogrammet, kalenderfilen och sammanställningen när läraren följer insatsen, med elevernas namn bortbytta i texterna som kopieras. Passens roller (`plan.passen`), före första passet, en stege som börjar högre upp och de steg planen inte når. `utanPlanensFalt` säger på ett ställe vilka fälten är, som bara planens sida läser. Reglerna står i sajtens METODER.md under Planera insatsen |
| `plan.js`: `nivavaletsFel`, `langdvaletsFel`, `veckovaletsFel`, `NIVAVALETS_LANGD` och `passetsLangder` | Stöden för valen i planen, nivån, passets längd och antalet veckor: ett citat ur metoden på högst tre meningar och 250 tecken och metodens rubrik med mer, som riggen och sajten prövar. Passets längder att välja och förvalet ur faktarutans spann. En metod som kan planeras och vars period är ett spann eller öppen har stödet för antalet veckor. Reglerna står i sajtens STIL.md under Stöd för ett val |
| `utvarderingensFel` i `plan.js` | Metodens regel för beslutet efter insatsen i `plan.utvardering`, som varje metod som kan planeras har: vad läraren beslutar efter vilket resultat, ordagrant ur metoden |
| `plan.js`: `elevernasFel`, `elevernasCell`, `vidareMening`, `harElevernasKolumn`, `ELEVERNAS_KOLUMN` och `ELEVERNAS_LANGD` | Elevernas riktning i progressionen: `eleverna` börjar med "Att" och har högst två meningar och 200 tecken, `vidare` fortsätter "Gå vidare när" med liten bokstav och utan punkt och saknas i den sista raden, och en metod som kan planeras har `eleverna` i varje rad. Cellen i den fjärde kolumnen och meningen "Gå vidare när …" kommer härifrån till metodens sida, Word och planen. Riggen kör spärren före leveransen |
| `plan.js`: `metodensSkattningar`, `tolkaRegel`, `regelnGaller`, `skalansSteg`, `stegetsNamn`, `stegetsSpann`, `skattningensGranser`, `linjen`, `skattningensText`, `rensadLank` och `SKATTNINGARNAS_VEM` | Metodens egna skattningar: fältet, reglerna, skalan, linjen och texten, som avsnittet Metodens egna skattningar nedan beskriver |
| `saker.js`: `sakensFormer`, `sakdelar`, `olankadeSaker` | Metodens saker i en text: namnen på bladen, korten, mallarna, testen och texterna i sina former, och spärren mot ett namn som ingen sak har. Sajten bygger listan över sakerna och deras adresser ur metodens fil; reglerna står i sajtens STIL.md under Hänvisningar |

## Metodens egna skattningar

En metod med ett eget instrument, som Gruppstärkande aktiviteters Lärarens skattning från 1 till 10 och bladet Vår grupp, gör det i Planera med metodens skala och vid metodens tillfällen (sajtens K-559; Niclas 2026-10-26: "Viktigt att det funkar som en egen modul du kan lägga in andra skattningar i på kommande metoder"). Delen slås på med fältet `plan.skattningar` i metodens fil och är borta utan det: en metod utan fältet ser ut som förut.

| Steg | Så gör du |
|---|---|
| 1. Uppföljningens rad | Instrumentet har en rad i metodens uppföljning med en tid i insatsens veckor, som `varje vecka`, `varannan vecka` eller `vecka 4`. Raden säger när och vad, och planen visar den |
| 2. Skalan, för gruppen | Metodens tabell, eller en rams översikt, där första kolumnen säger stegen och deras namn, som "9–10 · Mycket bra". Varje steg från första till sista har ett namn |
| 3. Reglerna, när metoden har sådana | En rad i uppföljningen med `tid: "villkor"` för varje regel, med det läraren gör, och regelns ord i fältet: `nedåt 2 veckor i rad`, `under 7 i 4 veckor utan att stiga` eller `minst 7 i 4 veckor`. Veckorna räknas i följd: en vecka i planen utan kryss bryter följden, och ett lov är ingen vecka i planen |
| 4. Fältet | En rad i `plan.skattningar` med `namn` (bladets namn efter "Blad: "), `vem`, `rad` (uppföljningens rad), en valfri `text` (ett ordagrant citat ur metoden), för gruppen `skala` och `regler`, och för det eleverna fyller i en valfri `ram`, metodens ram som säger hur det görs, med stegen |
| 5. Proven | `npm run validera` |

```yaml
plan:
  skattningar:
    - namn: Lärarens skattning
      vem: gruppen
      rad: Lärarens skattning varje vecka
      text: "Skatta i slutet av veckan, gärna direkt efter veckans sista pass."
      skala: { fran: 1, till: 10, tabell: Lärarens skattning }
      regler:
        - { om: nedåt 2 veckor i rad, rad: Linjen i Lärarens skattning nedåt två veckor i rad }
    - namn: Vår grupp
      vem: eleverna
      rad: Gruppreflektion varannan vecka
      text: "Ni gör gruppreflektionen varannan vecka, från vecka 2, direkt efter en aktivitet som gruppen redan kan och som tar omkring tio minuter."
      ram: Gruppreflektion
```

| Vem | Vad planen gör |
|---|---|
| `gruppen` | Läraren skattar gruppen med metodens skala vid Skatta gruppen i veckorna då metoden gör det, med stegens namn och, att fälla ut, tabellens beskrivning av varje steg. Det ersätter planens skattning av gruppen, så att gruppen har en skala, och elevernas 1–5 mot målet står hopfällda under. Linjen ritas med reglernas gränser streckade, en regel som gäller står under skalan och överst i rutan med passet veckan efter, och reglerna står under Vad linjen säger. Sammanställningen, avstämningen, utvärderingen, pdf:en och texterna läser linjen. Högst en per metod |
| `eleverna` | Eleverna fyller i metodens blad eller formulär själva, och planen tar inte emot svaren. Uppföljningens rad har en tid med datum, som `varannan vecka` eller `vecka 4`. Det tar tid i passet, så planen lägger det i veckans längsta pass efter lärarens tider, och i veckans sista när passen är lika långa. Med `minuter`, passets längd som det behöver, säger planen till i passet när det är kortare. I passet där metoden gör det står metodens text och ramens steg, som fälls ut, knapparna till bladets pdf och till formuläret (fältet `google` på bladet) med en mening om vad formuläret är (`formularetText`), och lärarens länkar till sin kopia och sin sammanställning, som bara sparas i webbläsaren och i planens fil |

Bort med delen: ta bort fältet. Uppföljningens rader står kvar och visas som förut, med reglerna under Håll koll på. Bygget stannar på en rad som metoden inte har, en tid utan veckor, en skala vars tabell inte säger varje steg, en regel som inte går att läsa eller vars rad inte är ett villkor, fler än en skattning av gruppen, ett namn som inget blad har och ett blad som eleverna fyller i utan formulär (`metodensSkattningar` här och `insatsplanFel` på sajten).

## Det som kommer

Lösningsförslaget som eget blad (K-423) och texternas och faktatexternas databaser är gjorda i testversion 2. Sedan, i etapp 2, databasen som egen fil, omvandlingen mellan riggens ramar och posterna åt båda hållen, mallarnas register och steget att lyfta ut en mall ur en metod. Före etapp 2 för sajten och riggen ett samtal om modulen.
