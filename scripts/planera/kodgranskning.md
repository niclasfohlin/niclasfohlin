# Kodgranskning: Planera {{version}}

Du läser repot för niclasfohlin.se i en sandlåda där du bara får läsa. Ändra inga filer. Svara på svenska.

Planera insatsen är en modul som räknar fram en plan för en insats i stödundervisning ur en metods fil. {{bakgrund}} Ändringarna står efter `{{bas}}`, i commits och i arbetsträdet, som kan ha det som inte är committat än (`git diff {{bas}} -- src scripts METODER.md PLANERA.md STIL.md`). Granska dem för fel, inte för användbarhet: leta efter det som räknar fel, tappar eller blandar ihop det läraren har fört in, leder till fel ställe, skriver ut fel sak, visar något som inte stämmer med metoden, eller kraschar.

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
6. Drift: ny kod som skriver ut en vecka, ett datum eller ett annat värde på egen hand, fast standarden har en funktion för det, eller ett nytt värde som visas på flera ställen utan en funktion i standarden (`PLANERA.md` under Spärren mot drift). Samma sak ska heta och visa likadant på sidan, i pdf:erna, i texterna som kopieras, i texten till åtgärdsprogrammet och i kalenderfilen.
7. Nycklar: det som sparas om en elev, ett pass eller en vecka, och vad som händer när det nyckeln bygger på ändras, som en ny elev på en annan elevs rad, ett pass som flyttas eller ett lov som läggs in efteråt.
8. Metoden som rot: en premiss om metoden, som passets tider, veckorna eller uppföljningen, som planen tar någon annanstans ifrån än metodens egna fält, eller som står på två ställen i metoden (`PLANERA.md` under Metoden är roten).

## Svaret

Skriv svaret som ditt svar. Högst femton fynd, P1 först. P1: det läraren har fört in försvinner eller blir fel, sidan slutar fungera, en knapp skriver ut fel sak, eller planen visar fel pass, datum eller länk. P2: något som visas, skrivs ut eller kopieras stämmer inte. P3: det andra. För varje fynd: fil och rad, ett konkret sätt att framkalla felet, vad som händer, och lagningen i en mening. Skriv bara fel som du har hittat i koden, och säg när något bygger på antaganden.
