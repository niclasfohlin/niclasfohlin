Du granskar ett stilbyte på niclasfohlin.se, Niclas Fohlins författar- och kunskapssajt (Astro 7, statiskt bygge). Sajten har fått en ny form, riktningen "Klar handbok": vit yta, mörkt sidhuvud, djupblå accent, ett sanstypsnitt (Public Sans, självhostat), ljus blågrå ton för band och rutor, fyllda rubrikrader i tabeller, och på metodsidorna en sidnavigation i egen spalt till vänster som markerar avsnittet i bild. Innehållet, alltså metodernas YAML-filer, artiklarna och böckerna, är oförändrat och låst. Du har inga skrivrättigheter. Svara på svenska i markdown, i formen längst ner.

Läs först ramarna: CLAUDE.md, STIL.md, KONCEPT.md och METODER.md.

Ändringen i sin helhet syns med `git diff main -- src/ public/` (grenen sajt/klar-handbok mot main). Filerna som ändrats: src/styles/global.css (designsystemet, allt ligger där), src/layouts/Base.astro (typsnittspreload, theme-color), src/pages/stodundervisning/[id].astro (metodsidans topp: rubrik, faktaruta med etiketten "I korthet" och nedladdningarna i ett band), src/components/Metod.astro (sidnavigationen i egen spalt, innehållet i .metod-text, ett litet skript som markerar avsnittet i bild), src/lib/metoddocx.ts (Word-filernas färger följer sajten), public/fonts/ (typsnittet). Det byggda resultatet ligger i dist/.

Skärmbilder av det nya utseendet (bifogade som bilder, och i underlag/prov/sajt/): startsidan, metodbanken, en metodsida, dess lathund, artikelarkivet, böckerna, om-sidan och prenumerera, på desktop och mobil. Utskriften av metodsidan och lathunden som pdf: underlag/prov/problemlosning-i-grupp/utskrift.pdf och lathund-utskrift.pdf (läs med pdftotext om det finns).

Granska två saker.

1. Att inget förstördes eller tappades bort. Gå igenom diffen regel för regel och jämför med det byggda resultatet: finns varje element som fanns förut kvar och synligt (sidhuvud, sidnavigation, faktaruta, nedladdningsknappar och länkar, rutor, tabeller med rubrikrad, passrutin, stödtrappa, gör och undvik, bockar, snabbmall, grund, lathundens fyra sidor, korten i metodbanken, urvalsraden, filtret, artikelarkivets sök, bokkorten, prenumerationsformuläret, sidfoten)? Har någon regel tappat sin selektor när klassen .metod-sida blev .metod-topp? Fungerar utskriften fortfarande: sidfoten med upphov på varje sida, lathunden på exakt fyra liggande sidor, inga knappar i utskriften, rubriker som håller ihop med sitt innehåll? Kontrast: håller all text 4.5:1 mot sin bakgrund (den ljusblå tonen, de fyllda rubrikraderna, sidhuvudets länkar, taggarna, den avslagna knappen)? Tangentbord och skärmläsare: rubrikordning, aria-current på sidnavigationen, fokus synligt? Mobil: bryter något, hamnar något utanför skärmen, staplas stegtabellen fortfarande? Prestanda: typsnittet laddas självhostat med preload och font-display swap; ser du något som ger layoutskift?

2. Mottagaren. Föreställ dig att du är lärare, det är kväll, du är trött, och i morgon förmiddag ska du hålla ett stödpass med en liten grupp. Du landar på startsidan, sedan i metodbanken, sedan på metodsidan Problemlösning i grupp, sedan på lathunden. Gå igenom det steg för steg som den läsaren: hittar du rätt utan att tänka? Är ordningen på metodsidan logisk för någon som ska genomföra passet i morgon, eller kommer det viktigaste för sent? Är knapparna begripliga: vad får jag när jag trycker "Öppna lathunden", "Allt om metoden (docx)", "Bara lathunden (docx)"? Fattas något för bekvämligheten: en tydlig väg till "det jag behöver skriva ut i kväll", en uppskattning av förberedelsetid, en väg tillbaka, ett sätt att komma ihåg var man var, något i sidnavigationen? Är något steg ologiskt, till exempel att sidnavigationen börjar med Lathund, eller att faktarutan står till höger? Vad skulle den trötta läraren sakna, och vad skulle hon slippa?

Lämna fynden så här. Var konkret: fil, rad eller selektor, vad som är fel eller saknas, vad som borde göras. Inga allmänna råd utan belägg.

## Sammanfattning

En tabell med kolumnerna Prio, Fynd, Var, Åtgärd. P1 är fel som en läsare ser (förlorat innehåll, trasig layout, kontrast under 4.5:1, utskrift som gått sönder). P2 är brister som bör lagas (avvikelser, otydligheter, tillgänglighet, mobil). P3 är idéer och förbättringar för den trötta läraren. Sådant som kräver Niclas beslut (innehåll, hans text) märks "Niclas" i kolumnen Åtgärd.

## Stilbytet: vad som är kvar och vad som ändrats

## Mottagaren: den trötta läraren, steg för steg

## Frågor till Niclas
