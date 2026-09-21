Du granskar en ny funktion på niclasfohlin.se (Astro 7, statiskt bygge): vid varje Word-fil i metodbanken finns nu ett filval, Word, Drive och för lathunden pdf, byggt som en grupp små knappar. Du har inga skrivrättigheter. Svara på svenska i markdown i formen längst ner.

Läs först CLAUDE.md, STIL.md och METODER.md, sedan diffen: `git diff main -- src/ scripts/ package.json public/stodundervisning/` (grenen sajt/drive-och-pdf mot main).

Filerna: src/components/Filval.astro (gruppen, används på metodsidan via src/components/Nedladdning.astro, på lathunden src/pages/stodundervisning/[id]/lathund.astro och i metodbanken src/pages/stodundervisning/index.astro, även i urvalsraden "Spara valda i Drive"), src/scripts/drive.ts (Google Identity Services och Drive-API:t, behörigheten drive.file, multipart-uppladdning, laddas först vid tryck), src/data/site.ts (driveKlientId, tomt i dag: Drive-knapparna renderas då inte; Base.astro skriver id:t som data-drive-klient på html), src/styles/global.css (.filval, .filrader, .drive-status), scripts/lathund-pdf.mjs (lathunden som pdf med Chrome, committad i public/stodundervisning/, kontroll i npm run validera). Skärmbilder med Drive-knappen synlig (tillfälligt klient-id vid bygget): bifogade.

Granska tre saker.

1. Koden i drive.ts mot Googles dokumentation som du känner den: initTokenClient och requestAccessToken, hantering av error_callback och nekad behörighet, multipart-uppladdningen till upload/drive/v3/files (metadata som JSON-del, filen som andra del, mimeType docx), fälten id och webViewLink, 401 när token gått ut, att inget skickas till Google innan läsaren tryckt, att inget klient-id eller token läcker till loggar. Vad går sönder, vad saknas (till exempel att en fil sparas dubbelt om man trycker två gånger, att status inte läses upp av skärmläsare, att knappen inte återställs)? Är `drive.file` rätt behörighet, och krävs Googles granskning för ett publicerat konsentformulär med bara den?

2. Filvalet som gränssnitt: är gruppen begriplig och tillgänglig (role=group, aria-label, dolda texter, kontrast, träffyta på mobil), är orden rätt (Word, Drive, Pdf), blir metodsidan plottrig eller tydligare än förut, fungerar det utan JavaScript (Word och pdf är vanliga länkar, Drive saknas), och är samma val konsekvent överallt där en Word-fil erbjuds? Något ställe som glömts?

3. Pdf-flödet: scripts/lathund-pdf.mjs och kontrollen i validera. Risker: en pdf som är äldre än sin YAML, en metod utan lathund, Netlify som saknar Chrome, filstorleken (omkring 300 kB per fil), att pdf:en bär upphov på varje sida. Finns det ett enklare eller säkrare sätt?

Lämna fynden så här, konkret med fil och rad. Inga allmänna råd utan belägg.

## Sammanfattning

Tabell med Prio, Fynd, Var, Åtgärd. P1: fel som gör att funktionen inte fungerar eller riskerar läsarens data. P2: brister som bör lagas. P3: idéer. Det som kräver Niclas beslut märks "Niclas".

## Drive-koden

## Filvalet

## Pdf-flödet
