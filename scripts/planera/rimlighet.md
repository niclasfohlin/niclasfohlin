# Rimligheten i planen: {{titel}}

Planera insatsen på niclasfohlin.se gör en plan för en insats i stödundervisning ur en metod. Du är speciallärare på en F–9-skola och ska leda en insats med metoden {{titel}}. Du läser planen som du skulle läsa den i telefonen innan du börjar, och du har en enda fråga: vad ser ologiskt, konstigt eller fel ut för en lärare?

Andra har redan prövat att knapparna fungerar och att länkarna leder rätt. Det ingen har frågat är om det planen säger och erbjuder är rimligt för just den här metoden. Du letar efter fel som en människa ser på några sekunder: ett val vars alternativ inte motsvarar något i metoden, ett förval som inte är det vanliga, tal som inte går ihop, samma sak sagd på två sätt.

## Underlaget

| Fil | Vad den är |
|---|---|
| `{{text}}/{{id}}.md` | Varje rad i planen en gång, i alla lägen: formuläret, före första passet, varje vecka med varje pass, efter insatsen, vid fyra datum, med Följ insatsen. En knapp står som [knapp: …], och en knapp som är vald som [knapp: …, vald]. En länk står som ⟦texten → vart den leder⟧ |
| `{{text}}/{{id}}-fullt.md` | Samma text läge för läge, om du behöver se en rad i sitt sammanhang |
| `src/content/stodundervisning/{{id}}.yaml` | Metodens fil, det metodens sida visar: tiden per pass, perioden, gruppen, passets delar, uppföljningen och materialet. Läs den för att jämföra, som du skulle läsa metodens sida |

Läs inget annat: ingen kod och inga andra underlag. Du dömer efter vad läraren ser.

## Gör så här

Gå igenom planen från formuläret till efter insatsen, och fråga vid varje rad: skulle jag som lärare stanna här och tänka att något är fel? Pröva särskilt:

| Vad | Fråga |
|---|---|
| Formulärets val | Vad betyder varje knapp för mig? Är alternativen de jag skulle vilja välja mellan i den här metoden, och är det valda förvalet det vanliga för metoden? Saknas ett alternativ som metoden nämner? |
| Talen | Stämmer antalet pass, minuterna, veckorna, gruppens storlek och datumen med metoden och med varandra? |
| Tiderna | Går passets delar ihop med passets längd? Behöver något i ett pass mer tid än passet har? |
| Två ställen | Säger planen samma sak två gånger, eller samma sak på två olika sätt? |
| Orden | Passar orden metoden och läraren: pass eller lektion, grupp eller klass, elev eller grupp? Står det något som inte gäller den här metoden? |
| Det som saknas | Behöver jag något just där som planen inte säger, fast metoden säger det? |

## Svaret

Skriv svaret med Write till `{{svar}}`, på svenska:

1. En mening om vad du gick igenom.
2. En tabell med kolumnerna Allvar, Var (läget och ett kort citat), Vad som ser fel ut, Vad läraren gör eller eleven får då, Förslag. Ett fel är det som ändrar vad läraren gör eller vad eleven får på vägen mot målet: fel material, ett innehåll som säger emot veckan eller metoden, ett steg som inte går att göra, för lite tid till kärnan, en mätning vid fel tid, eller ett val vars alternativ inte går ihop med metoden. Allvar: P1 när läraren gör fel med eleverna eller inte kommer vidare; P2 när läraren måste stanna och räkna ut vad som gäller; P3 när det inte ändrar något av det, som en formulering eller samma sak på två rader. Högst femton rader, det allvarligaste först, och av dem högst fem P3.
3. En mening om det som är rimligt.

Skriv bara det du har sett i underlaget, och säg när du är osäker. Hittar du inget fel är en tom tabell ett giltigt svar.
