# Kodgranskning: Planera {{version}}

Du läser repot för niclasfohlin.se i en sandlåda där du bara får läsa. Ändra inga filer. Svara på svenska.

Planera insatsen är en modul som räknar fram en plan för en insats i stödundervisning ur en metods fil. {{bakgrund}} Ändringarna står i commits efter `{{bas}}` (`git diff {{bas}} -- src scripts METODER.md PLANERA.md`). Granska dem för fel, inte för användbarhet: leta efter det som räknar fel, tappar eller blandar ihop det läraren har fört in, leder till fel ställe, skriver ut fel sak, visar något som inte stämmer med metoden, eller kraschar.

## Det nya

{{nytt}}

Reglerna står i `METODER.md` under Planera insatsen och i `PLANERA.md`. Provet, som visar vad som redan prövas: `scripts/planprov.mjs`.

## Leta särskilt efter

{{leta}}

Och alltid:

1. Det läraren har fört in (bockar, skattningar, veckans gång, resultat, elevlistan) som försvinner eller hamnar under fel vecka, steg eller datum när planen ändras, och om Ångra återställer allt.
2. Datum som blir fel med lov, röda dagar, flyttade och inställda pass, upprepade veckor, en start mitt i en vecka eller på en lördag, och över nyår.
3. Det som sätts in i sidan som HTML: allt som kommer från läraren eller metoden ska skyddas.
4. Data som saknas: en metod utan tidsschema, utan stegen, utan planens valfria fält, eller med en form som de fem metoderna i betan inte har.
5. En ändring i den delade koden som ändrar en fil eller sida som fanns före, utan att det var meningen.

## Svaret

Skriv svaret som ditt svar. Högst femton fynd, P1 först. P1: det läraren har fört in försvinner eller blir fel, sidan slutar fungera, en knapp skriver ut fel sak, eller planen visar fel pass, datum eller länk. P2: något som visas, skrivs ut eller kopieras stämmer inte. P3: det andra. För varje fynd: fil och rad, ett konkret sätt att framkalla felet, vad som händer, och lagningen i en mening. Skriv bara fel som du har hittat i koden, och säg när något bygger på antaganden.
