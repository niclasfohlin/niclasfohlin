Du granskar en ny metod i metodbanken på niclasfohlin.se (stödundervisning) som second opinion. Sajten är Niclas Fohlins författar- och kunskapssajt, byggd med Astro; metoderna är YAML-filer med strikt schema, och sidan, utskriften, lathunden och Word-filerna byggs ur samma data. Du har inga skrivrättigheter och ska inte ändra något. Svara på svenska, i markdown, i den form som anges längst ner.

Läs först ramarna: CLAUDE.md, STIL.md och METODER.md. METODER.md beskriver modellen (vilka delar en metod har, hur de heter i YAML och var de syns), lathundens fyra sidor och blocktyper, samt vilka ändringar i Niclas text som är avsiktliga: lagernivåer bort, årskurs 4 till 9, kolon i stället för tankstreck i rubriker, "jag" i checklistan, elevantal enligt lathunden. Sådant ska du inte anmärka på.

Metoden som granskas: {{id}} ({{datum}}).

Filer:

- Posten: {{yaml}}
- Underlaget från Niclas, i markdown: {{underlag}}
- Den byggda sidan: {{sida}}
- Den byggda lathunden: {{lathund}}
- Word-filernas text:
{{docx}}
- Skärmbilder och utskrifter:
{{bilder}}
- Koden som bygger allt: src/content.config.ts (schemat), src/components/Metod.astro, src/components/MetodTabell.astro, src/components/Lathund.astro, src/components/Nedladdning.astro, src/lib/metoddocx.ts, src/lib/metod.ts, src/styles/global.css (skärm under .m-* och .lh-*, utskrift under @media print).
- Förebilderna: src/content/stodundervisning/problemlosning-i-grupp.yaml, boksamtal-i-grupp.yaml, faktatextsamtal-i-grupp.yaml, och deras byggda sidor i dist/stodundervisning/.

Granska tre saker.

1. Paritet i innehåll. Finns varje del i underlaget med i YAML-filen (rubriker, stycken, tabellrader, exempelfraser, listor, siffror)? Finns varje del i YAML-filen på sidan, i Word-filen med allt, i mallarna och i lathunden? Är tabellerna kompletta, cell för cell? Stämmer elevantal, passlängd, frekvens och period överallt: faktarutan, texten, lathundens faktarutor, Word-filens framsida? Har något ändrats i Niclas text utöver de avsiktliga ändringarna? Citera det som saknas eller avviker, med fil och plats.

2. Paritet i design. Jämför sidan (skärmbilderna för desktop och mobil), utskriften (pdf) och Word-filerna mot förebilderna: samma element i samma ordning (band, rutor, rutinruta, stegtabell, stödtrappa, gör och undvik, bockar, snabbmall, grund), samma rubriknivåer, sidfot med © Niclas Fohlin och adressen på varje del som laddas ner eller skrivs ut, lathunden på exakt fyra liggande sidor, tabeller som fungerar på mobil. Avviker den nya metoden från de tre förebilderna på något sätt som inte beror på innehållet?

3. Kvalitet. Följer egen text (ingress, undertitel) STIL.md: korta meningar, inget bristspråk om elever, inga tankstreck, inga punktlistor i löptext? Kan en lärare följa genomförandet i morgon utan att fråga: tid, material, gruppstorlek, steg, uppföljning? Tillgänglighet: rubrikordning, tabellrubriker, kontrast, tangentbord. Något som saknas jämfört med förebilderna och som lärare skulle behöva?

Lämna fynden så här. Var konkret: fil, rad eller rubrik, vad som står, vad som borde stå. Inga allmänna råd utan belägg.

## Sammanfattning

En tabell med kolumnerna Prio, Fynd, Var, Åtgärd. P1 är fel som en läsare eller lärare ser (saknat innehåll, felaktiga siffror, trasig layout, saknat upphov). P2 är brister som bör lagas före nästa metod (avvikelser från förebilderna, otydligheter, tillgänglighet). P3 är idéer och förbättringar. Innehållsförslag som kräver Niclas beslut (hans text, pedagogiska val) märks "Niclas" i kolumnen Åtgärd.

## Paritet i innehåll

## Paritet i design

## Kvalitet

## Frågor till Niclas

Det som bara han kan avgöra.
