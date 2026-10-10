Du granskar en metod i metodbanken på niclasfohlin.se (stödundervisning) i telefonbredd, 390 css-pixlar, som andra öga före uppladdning. Sajten är Niclas Fohlins författar- och kunskapssajt. Granskningen i telefonen gjordes första gången för skrivkurserna 2026-10-10 och hittade fyra av nattens viktigaste fel (siffror som stod fel, ett schema som inte gick att läsa, en instruktion i grå småtext, en etikett som såg ut som rubrik för nästa block). Granska inte innehållet eller pedagogiken, bara hur sidan ser ut och läses i telefonen.

Metoden som granskas: {{id}} ({{datum}}).

Filer:

- Posten: {{yaml}}
- Den byggda sidan: {{sida}}
- Den byggda lathunden: {{lathund}}
- Skärmbilderna i telefonbredd, i ordning från sidans topp till dess slut (varje bild är 780 px bred, alltså 390 css-pixlar i dubbel upplösning, och upp till 2 600 px hög), och lathundens bilder:
{{bilder}}
- Koden som bygger sidan: src/components/Metod.astro, src/components/MetodTabell.astro, src/components/Elevlista.astro, src/components/Ramindex.astro, src/components/Boksida.astro, src/components/Struktur.astro, src/components/Textpar.astro, src/components/EjBryt.astro och src/styles/global.css.

Läs varje bild i ordning, som en lärare som öppnar sidan i telefonen kvällen före passet. Leta efter:

- text som går utanför skärmen eller kräver att sidan rullas i sidled, utom i tabeller och scheman som uttryckligen rullar
- kolumner så smala att orden staplas eller bryts mitt i, och kolumnrubriker som skrivs in i varandra
- rubriker, etiketter, siffror eller knappar som bryts så att de läses fel: ett ensamt ord eller tecken på en egen rad, ett tal skilt från sin enhet eller från vecka, pass, dag eller del
- bilder (filmer, bilderna På bordet, boksidor, blad, kort, tärningar, elevens sida i Två texter, strukturer på ett A4) som blir för små för att läsas, beskurna, går genom sin kant eller ligger över text
- likvärdiga saker som ser olika ut utan skäl, något som ser ut som en rubrik men inte är det, och en etikett som hamnar så att den hör till fel block
- en instruktion till läraren som bara står i liten eller grå text
- det läraren behöver kommer långt ned, göms eller går inte att hitta från menyn och materialets lista

Särskilda frågor och avgränsningen för den här granskningen (läs dem före allt annat ovan):

{{fragor}}

Gränsen: högst 15 fynd, P1 först. P1 är när läraren läser fel eller inte kan använda något i telefonen. Ett fynd per sak, med bildens namn och var på bilden, och orsaken i koden när du hittar den. Skriv överst vilka bilder du faktiskt läste. Ändra inget annat än svarsfilen.

## Bilderna jag läste

## Sammanfattning

En tabell med kolumnerna Prio, Fynd, Var, Åtgärd.

## Fynden

Ett stycke per fynd, i tabellens ordning.
