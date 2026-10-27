# Länkgranskning av planen: {{titel}}

Planera insatsen på niclasfohlin.se gör en plan för en insats i stödundervisning ur en metod, och planens texter länkar till det metoden namnger. Du ska granska länkarna i planen för metoden {{titel}} och svara på Niclas fråga: "Finns det något som namnges som bör länkas till i metoden som inte gör det?" Svara också på det omvända: leder en länk fel, eller är något länkat som inte borde vara det?

## Underlaget

| Fil | Vad den är |
|---|---|
| `{{text}}/{{id}}.md` | Varje rad i planen en gång, i alla lägen: före första passet, varje vecka med varje pass, efter insatsen, vid fyra datum, med Följ insatsen. En länk står som ⟦texten → vart den leder (målets rubrik på metodens sida)⟧, en knapp som [knapp: …] |
| `{{text}}/{{id}}-platser.md` | Metodens platser: varje ankare på metodens sida med sin rubrik, det en länk kan leda till |
| `{{text}}/{{id}}-fullt.md` | Samma text läge för läge, om du behöver se en rad i sitt sammanhang |
| `src/content/stodundervisning/{{id}}.yaml` | Metodens fil, där namnen på bladen, korten, mallarna, texterna och lektionerna står |

Läs inget annat: ingen kod och inga andra underlag. Du ska döma efter vad läraren ser, inte efter hur det är byggt.

## Regeln

Så här står regeln i sajtens stilguide (STIL.md, Hänvisningar):

> En sak i metoden länkas när tre saker stämmer. Sajten har en egen sida, fil eller plats på metodens sida för just den saken. Texten säger sakens namn som det står i metoden. Och texten pekar på saken, inte på det saken lär ut: "Lägg fram samtalskortet" länkas, men inte "samtalsdragen" som kortet visar. Inte länkat är begrepp och steg som metodens text förklarar (Det står, Stanna, Starten), ett pass i veckans ordning (pass 3), elevens egna saker (bänkboken), en nivå eller ett slag för sig och allmänna ord (texten, frågorna).

Saker som länkas: ett blad, ett kort, en mall, ett test, en text i banken, ett lektionskort, en vecka i en kurs med veckor, och sajtens verktyg och stödmaterial. Ett namn i böjd form räknas ("samtalskortets två första rader", "kartläggningens text före").

## Gör så här

1. Gå igenom raderna i `{{id}}.md`. Leta efter varje namn på något i metoden som har en plats bland platserna eller en egen sida, och som inte står inom ⟦ ⟧. Pröva det mot regelns tre villkor.
2. Gå igenom varje länk. Leder den till rätt sak, med en rubrik som stämmer med namnet? Är det en sak, eller ett begrepp eller ett steg som inte borde vara länkat?
3. Se efter om samma namn är länkat på ett ställe men inte på ett annat, och om ett namn leder till olika ställen i olika rader.
4. Leta efter allmänna ord som pekar på en bestämd sak som läraren behöver eller använder, som "kortet", "korten", "bladet", "bubblorna" eller "filmerna". Då ska texten säga sakens namn, så att den blir en länk (STIL.md under Hänvisningar: "Om det är saker som behövs eller ska användas och är specifika saker ska de namnges och länkas"). Ett sådant fynd är P1 när läraren behöver saken i passet, och svaret säger vilket namn som ska stå där.

## Svaret

Skriv svaret med Write till `{{svar}}`, på svenska:

1. En mening om vad du gick igenom.
2. En tabell med kolumnerna Allvar, Raden i planen (ett kort citat), Namnet, Borde leda till (ankare och rubrik, eller "ingen länk"), Varför. Allvar: P1 när läraren behöver saken för passet och inte når den, eller när en länk leder till fel sak; P2 när ett namn borde vara en länk men saken är mindre central, eller när länkens text vilseleder; P3 när ett begrepp är länkat eller något annat är tveksamt. Högst tjugo rader, det allvarligaste först.
3. En mening om det som stämmer.

Skriv bara det du har sett i underlaget, och säg när du är osäker på om något är en sak eller ett begrepp.
