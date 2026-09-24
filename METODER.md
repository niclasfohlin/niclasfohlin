# Metoder: från underlag till sida

Så tas en metod till stödundervisning emot och görs om till en post. Modellen är de fem som redan finns: öppna `src/content/stodundervisning/problemlosning-i-grupp.yaml` bredvid det nya underlaget och följ formen. `problemlosning-i-grupp.yaml` har den rikaste modellen och en lathund med blocket tavla; `boksamtal-i-grupp.yaml` visar en fri tabell efter stegtabellen och en lathund med spalter och skrivruta; `faktatextsamtal-i-grupp.yaml` en fri tabell efter arbetsformen och en lathund med kedja, tabell, snabbmall och not; `til-i-grupp.yaml` hem med kontrakt och schema; `skrivkurs-berattelseram.yaml` ramar, diplom och `arskursText`; `problemlosning-i-grupp.yaml` dessutom passöversikten (steg med fas, arbetsform med faser) och tabeller efter fastnar och grund. Det körbara arbetsflödet är `/ny-metod`; den här filen förklarar varför det ser ut som det gör.

## Det som kommer från Niclas

Ett kompendium i docx (och samma i pdf, för designen) med en eller flera metoder efter en fast modell, och en lathund i pptx, pdf eller odp med fyra sidor per metod. Filerna kommer som uppladdningar i chatten, med sökväg. Kopiera dem till `underlag/metoder/<leverans>/`, där `<leverans>` är avsändare, månad och metod, som `kungsholmen-2026-09-skrivkurs` (git ignorerar mappen: repot är publikt, underlagen är opublicerade). Namnge dem `kompendium.docx`, `kompendium.pdf`, `lathund.pptx` och `lathund.pdf`; `kompendium.md` och `lathund-sidor/` görs av dig. Leveranserna hittills: `kungsholmen-2026-09/` (de tre första metoderna), `kungsholmen-2026-09-til/`, `kungsholmen-2026-09-skrivkurs/` och `namnaren-2026-09/` (artikeln bakom problemlösningens omarbetning). Saknas kompendiet som pdf görs den ur docx-filen: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/word-pdf.ps1 <mapp>/kompendium.docx <mapp>/kompendium.pdf`, och sidbilderna med `pdftoppm -r 80 -png <mapp>/kompendium.pdf <mapp>/kompendium-sidor/sida`. Har kompendiet flera metoder: dela `kompendium.md` per metod (`kompendium-<slug>.md`) innan metodprov och granskning, annars räknas de andra metodernas meningar som avvikelser.

Läs så här: docx med `pandoc <fil> -t markdown -o <mapp>/kompendium.md`; pdf-sidorna med Read (designen: band, rutor, tabeller, bockar). Kommer lathunden bara som pptx eller odp: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pptx-till-pdf.ps1 <mapp>/lathund.pptx` gör pdf:en med PowerPoint, och `pdftoppm -r 80 -png <mapp>/lathund.pdf <mapp>/lathund-sidor/sida` ger en bild per sida att läsa med Read. Texten går också att läsa ur `ppt/slides/slide*.xml` efter uppackning. Flera metoder i samma kompendium delas per rubriknivå 2.

## Modellen

Schemat i `src/content.config.ts` är strikt: ett okänt fält, en tabellrad med fel antal celler eller en okänd tagg stoppar bygget med besked. Delarna är valfria; det som saknas i underlaget utelämnas. Så här hänger kompendiets rubriker, fälten och det som byggs ihop:

| I kompendiet | Fält | Syns som |
|---|---|---|
| Rubrik, underrubrik, faktaruta (tid, period, grupp, material) | `titel`, `undertitel`, `tid`, `period`, `grupp`, `material`, `omrade`, `arskurs`, `taggar`, `format` | sidhuvud och faktaruta, kortet i metodbanken, lathundens faktarutor, docx-framsidan |
| Egen ingress (skrivs av oss) | `ingress` | kortet, startsidan, nyhetsbrevet, description |
| Inledande stycken | `inledning` | första stycket på sidan |
| "Så fungerar insatsen", "Så sätter du ihop gruppen", principer | `upplagg`, `gruppen`, `principer` (rubrik, text) | rutor |
| Passrutin | `passrutin` (steg, efter; steg kan ha `fas` som matchar en rad i tidsschemat, och då `efterPasset`) | numrerad rutinruta, `#passrutin`. Har stegen faser: passöversikten i stället för rutinruta, tidsschema och arbetsformsband, som problemlösningen: fasremsan med minuter och arbetsformens delar, och en tabell med en rad per fas (fas och tid, rutinens steg, vad händer) med raderna Före och Efter passet |
| Tidsschema | `tidsschema` (rubrik, text, rader: tid, fas, vad, efter) | tabell, `#tidsschema`; i passöversikten ger den fasernas namn, tider och "vad händer", rubriken ("Ett pass på 20 minuter") och raden Före passet (raden vars tid inte börjar med en siffra) |
| "Vad du gör och säger", exempelfraser | `steg` (rader: namn, fraga, gor, fraser) | stegtabell med fraskolumn, `#steg`; fraserna skrivs utan citattecken |
| Arbetsformens delar | `arbetsform` (delar: rubrik, text, `faser` för passöversiktens remsa) | band, `#arbetsform`; med passöversikt bara texten, delarna står i remsan |
| Fria tabeller (frågetyper, textstrukturer, mappens innehåll, två slags pass) | `tabeller` (plats efter-inledning, efter-tidsschema, efter-steg, efter-arbetsform, efter-fastnar, efter-urval eller efter-grund) | rubriktabeller där de hör hemma. Bara rubrikraden är fet, som i kompendiet; första kolumnen är vanlig text (så även i ramarnas översikter och lathundens tabellblock). Radrubriker i fet stil har bara tidsschemat, passöversikten, stegtabellen, progressionen, uppföljningen och lathundens stegtabell |
| Exempel på ett pass | `exempel` (valt, text; `tavla: true` visar lathundens tavla efter berättelsen, `tavlaText` under den) | `#exempel` |
| När gruppen fastnar | `fastnar` (fragaForst, trappa, efter, motto) | frågeruta, stödtrappa, motto, `#fastnar` |
| Lärarens roll: gör och undvik | `roll` (gor, undvik) | två kolumner, `#roll` |
| Var man hittar texter eller uppgifter, krav | `urval` (text, krav) | `#urval` |
| Hem och skola: möte med vårdnadshavare, kontrakt, schema att fylla i | `hem` (text, kontrakt med inledning och ansvar, schema med kolumner och antal rader) | `#hem`; kontraktet och schemat som egna sidor i planeringsmallarna |
| Progression | `progression` (enhet Vecka eller Pass; rader: vecka, `led` som Jag gör och Vi gör, fokus, roll) | tabell, `#progression` |
| Uppföljning | `uppfoljning` (rader: nar, vad) | tabell, `#uppfoljning` |
| Mål | `mal` (punkter) | kryssbar lista, `#mal`, målkollen i mallarna |
| Snabbmall | `snabbmall` (fore, efter) | `#snabbmall`, mallen i docx och lathundens block snabbmall |
| Checklista | `checklista` (punkter) | kryssbar lista, `#checklista`, mallen i docx |
| Grund och källor | `grund` (text, kallor) | `#grund`; källor som (Författare, årtal) |
| Berättelseramar, textramar, läslistor eller andra ramar metoden arbetar i, sist i kompendiet | `ramar` (rubrik, text; per ram rubrik, text, oversikt som tabell, `listor` som elevmaterial: rubrik, kolumner bara när de betyder något, rader; huvud, delar med falt: rubrik, text, kursiv) | `#ramar` efter grunden med varje färdig ram i sin helhet; en ram där alla fält är tomma är en mall att fylla i och visas på sidan bara med sin inledning; i planeringsmallarna blir varje ram egna sidor (i filen med allt bara de tomma, de färdiga står redan i beskrivningen). En översikt med bara korta celler (en ordlista eller bokstavslista, som läslistorna) får lika breda kolumner på sidan (klassen `tat`) och i Word; en översikt med längre text får en smal etikettkolumn först och staplas på mobil när den har fler än tre kolumner |
| Diplom eller intyg | `diplom` (kicker, rubrik, text med `___` som skrivlinje, underskrifter) | `#diplom` som inramad ruta på sidan; en egen sida i planeringsmallarna |

`arskurs` är nivåerna som filtret använder; säger kompendiet något exaktare, som åk 3–6, skrivs det i `arskursText` och visas i stället för nivåerna på kortet, sidan och i Word-filerna. Delarna `arbetsform`, `fastnar`, `roll` och `urval` kräver också `rubrik` och `text` (kompendiets rubrik och inledande stycke), och `urval` kan ha `kravText` före kraven; `_mall.yaml` visar alla fält. `relaterade` är två till tre metoder som delar område eller arbetsform (samtal i grupp, kurs), och den nya läggs i deras `relaterade` i samma commit. Exakt ett `omrade`: det metoden i första hand tränar; tränar den två lika mycket, fråga Niclas. `relaterade` pekar åt båda håll: lägg den nya metoden i de metoder den hör ihop med, i samma commit. `uppdaterad` är dagens datum när posten publiceras eller ändras. `utkast: true` håller metoden utanför produktionen, pdf-kontrollen och mejlet till prenumeranterna, men visar den i `npm run dev`; sätt `utkast: false` när metoden är klar att mejlas, före pushen.

Typografins regel, på sidan, i utskriften, i lathunden och i Word: fet stil betyder rubrik, inget annat. Rubrikraden i en tabell är fet. Första kolumnen är fet bara när den är radrubriker (tidsschemat, passöversikten, stegtabellen, progressionen, uppföljningen, snabbmallen, lathundens stegtabell); i fria tabeller, ramarnas översikter och lathundens tabellblock står rubrikerna i rad 1 eller ovanför, och första kolumnen är vanlig text. En rad skriven med versaler i innehållet är en mellanrubrik och ritas som rubrikrad (`MetodTabell.astro`, `rubrikTabell` i `metoddocx.ts`). Spann som "F–3" och "åk 4–9" i sidhuvudet skyddas mot radbrytning (`ejBryt` i `metod.ts`). Något som bryter mot regeln läses fel av en lärare, och `metodprov.mjs` stannar på det som går att pröva maskinellt.

Formen i övrigt är vald för läraren som ska genomföra passet, avgjord 2026-09-24 med Codex som mottagare: rutans rubrik ("Så fungerar insatsen") står på egen rad som i kompendiet, på sidan och i Word; på mobil kommer faktarutan före nedladdningarna, remsans arbetsform följer direkt på sin fas och säger vilka faser den spänner över, och en fri tabell med tre kolumner och längre text staplas; menyn kallar urvalsavsnittet Material, och under det länkas ramarna och planeringsmallarna när metoden har ramar; exemplet berättas rakt med replikerna kursiva, som exempelfraserna, på sidan, i lathunden och i Word; Word-framsidans ingress är inte fet; en ordlistas ruta bär listans namn i utskriften och i Word, och nedladdningsknappen säger "Bara planeringsmallarna och läslistorna". Lathundens faktarad (liten etikett, fett värde) är Niclas eget mönster ur snabbguiden och behålls, liksom lathundens "Tre saker" med fet inledning på samma rad.

Elevmaterial i en ram (läslistor, bokstäver, meningar, en text) skrivs som `listor`, inte som `oversikt`: flera listor per ram, var och en med en läsanvisning som rubrik ("Läs orden, kolumn för kolumn") och kolumnrubriker bara när de betyder något för läraren. De ritas som elevlistor (`Elevlista.astro`, `elevlista` i `metoddocx.ts`): orden stora och lätta att peka i, rubrikerna små och dämpade, ingen fet första kolumn, bokstäver centrerade. Lärarnoten (Fokus, Så gör ni, Lyssna efter) står som en kompakt not före listorna på sidan och i Word-filen med allt, och efter dem i elevkopiorna där listan är sidans huvudsak. Lathundens tabellblock med korta celler ritas likadant. Förebilden är Niclas resursdokument till läslistorna (2026-09-24), där Läslista start är två listor utan kolumnrubriker och Läslista 5 tre listor i stället för en tabell med mellanrubrik.

Sidan byggs av `src/components/Metod.astro` (tabeller via `MetodTabell.astro`, nedladdningsrutan via `Nedladdning.astro`), Word-filerna av `src/lib/metoddocx.ts`, faktatexter och hjälpfunktioner i `src/lib/metod.ts`. Stilarna heter `.m-*` för metodens delar (band, ruta, rutin, tabell, trappa, gor-undvik, bockar, snabbmall, grund) och ligger i `src/styles/global.css`, utskriften under `@media print`.

## Lathunden

Fyra sidor ur Niclas snabbguide, i samma fil under `lathund`. Sidan `/stodundervisning/<id>/lathund` (`src/components/Lathund.astro`, stilar `.lh-*`), utskrift i liggande A4 på exakt fyra sidor, och Word-filen `<id>-lathund.docx`. Rubriker som "Insatsspår 1" stryks: lathunden heter det metoden heter.

| Sida | Fält | Innehåll |
|---|---|---|
| 1 Metoden | `lathund.innehall`, `lathund.metoden` (text, ruta med punkter, tabell, not) | metoden i korthet; faktarutorna passlängd, grupp, frekvens hämtas från `tid`, `grupp`, `period` |
| 2 Ett pass | `lathund.pass` (text, forberett, klarTidigt, schema med fraser) | passet steg för steg; elevtexten går att skriva ut för sig |
| 3 Mallen | `lathund.mall` (block) | blocken flödar i två spalter; typerna nedan |
| 4 Material | `lathund.material` (var, bordet, varjePass) | kraven hämtas från `urval`, checklistan från `checklista` |

Blocktyperna på mallsidan: `spalter` (kolumner med fråga och skrivrader), `skrivruta` (rubrik och rader), `tavla` (text, fråga, listor, tabell, annat, svar, citat), `snabbmall` (hämtar metodens snabbmall, som därför måste finnas), `tabell` (rubriktabell), `kedja` (steg med pilar), `not`. Lathunden får aldrig säga emot metoden: elevantal, passlängd och period skrivs en gång, i metodens faktafält.

## Texten

Texten i posten är Niclas egen ur underlaget, ordagrant. De enda avsiktliga ändringarna: lagernivåer (lager 1 till 3, RTI, insatsspår) bort, årskursen (kompendiets angivelse ersätts i löptexten av den Niclas anger, 4 till 9 om han inte säger annat; nivåerna i `arskurs`, en exaktare angivelse i `arskursText`), kolon i stället för tankstreck i rubriker, "jag" i stället för "du" i checklistan. Elevantalet tas ur lathunden om kompendiet och lathunden säger olika (boksamtal fyra till tio, problemlösning och faktatextsamtal två till åtta). Säger de olika om passlängd, frekvens eller period: sajten följer kompendiet, och avvikelsen skrivs som ett beslut till Niclas. Ingress och undertitel är vår egen text enligt STIL.md. Saknas något som en publicerad metod behöver (område, årskurs, passrutin eller genomförande, uppföljning): fråga Niclas, hitta inte på.

Pushen mejlar prenumeranterna, så metoden pushas när den är klar. Behöver Niclas se den först: visa skärmbilderna och Word-filen från metodprov i chatten och vänta med pushen. `utkast` är `false` från början: lathund-pdf, metodprov och granskningen bygger sajten som produktion och hoppar över utkast. Det som håller metoden från läsarna är att den inte pushas. `utkast: true` bara när något annat i passet måste pushas innan metoden är klar. Beslut och avvikelser skrivs i NATTEN.md, rapporten till Niclas (den används även dagtid och skrivs över per pass), och sammanfattas i svaret.

## Arbetsgången

1. Lägg leveransen i `underlag/metoder/<leverans>/` och läs allt.
2. Skriv metoden som JavaScript-objekt i `underlag/metoder/<leverans>/<slug>.mjs` med samma fält som `_mall.yaml`, och kör `node scripts/metod-yaml.mjs <fil>`. Då blir citattecken, kolon och radbrytningar aldrig YAML-fel. Filen hamnar i `src/content/stodundervisning/<slug>.yaml`.
3. Taggar ur registret: `npm run taggar`. Ny tagg bara när ingen täcker, i samma commit.
4. Har metoden en lathund: `node scripts/lathund-pdf.mjs <slug>`. Skriptet bygger sajten (ett fel i schemat stoppar här med besked), skriver ut lathunden som pdf, liggande fyra sidor, till `public/stodundervisning/<slug>-lathund.pdf`, kontrollerar sidantal och upphov och skriver manifestet `lathund-pdf.json`. Båda committas med metoden. Word, Drive och pdf erbjuds sedan automatiskt vid varje fil genom `src/components/Filval.astro`.
5. `npm run validera` tills allt går igenom. Kontrollen stannar om pdf:en saknas eller är gjord av en äldre version av metoden eller av koden som ritar lathunden: kör då steg 4 igen.
6. `node scripts/metodprov.mjs <slug> --underlag <mapp>/kompendium.md --bilder`: sidan, Word-filerna, upphovet i varje sidfot, underlagets meningar, lathundens fyra sidor, och skärmbilder till `underlag/prov/<slug>/`. Titta på bilderna och öppna docx-filen i Word.
7. `node scripts/metodgranskning.mjs <slug> --underlag <mapp>/kompendium.md`: Codex granskar paritet och design (nedan) och skriver till `underlag/prov/<slug>/granskning-<datum>.md`. Adjudicera svaret: P1 lagas nu, P2 lagas eller läggs i kön, P3 och innehållsförslag skrivs som beslut till Niclas.
8. Commit "Metod: <titel>" på `innehall/<slug>` eller passets gren, med pdf-filen. Push när passet är klart, en gång; pushen mejlar prenumeranterna.
9. Visa Niclas metadata, passrutinen och ändringarna i hans text.

## Metodriggen

En metod kan också komma från metodriggen i `C:/niclasfohlin.se/metodrigg` (utanför repot, beskriven i DRIFT.md under Metodriggen). Niclas ger ett intag, riggen skriver `methods/<slug>/metod.yaml` i exakt den här modellen och bygger kompendiekapitlet och lathunden ur samma fil. Då finns ingen `.mjs`-fil: kopiera `out/<slug>/<slug>.yaml` till `src/content/stodundervisning/` och gå in i arbetsgången vid steg 6 (lathundens pdf), med riggens intag (`intake/<slug>.md`) som underlag för prov och granskning. Riggens kontroll ersätter inte sajtens: metodprov och Codex körs ändå, mot filerna som byggs här. Ändras modellen här ändras riggens `build/schema.mjs` och `build/modell.mjs` i samma pass.

## Codex-granskningen

Varje ny metod granskas av Codex innan den pushas. `scripts/metodgranskning.mjs` bygger prompten ur `scripts/codex/metod-granskning.md`, lägger med YAML-filen, underlaget, de byggda sidorna, Word-filernas text (pandoc), skärmbilderna och lathundens original som sidbilder när `--lathundbilder <mapp>` pekar på `lathund-sidor/`, och kör Codex i bakgrunden (`--vanta` väntar in svaret i förgrunden, fem till tio minuter; annars visar `codex.log` läget). Den granskar fyra saker: paritet i innehåll (varje del i underlaget finns i YAML, varje del i YAML finns på sidan, i Word-filen och i lathunden, siffrorna stämmer överallt), paritet i design (sidan, utskriften och Word-filen använder samma element och ordning), kvalitet (STIL.md, tillgänglighet, lärarnytta) och läsningen uppifrån och ned som lärare (var tråden tappas, vad som saknas för att köra passet i morgon), och lämnar fynden som P1 (fel en läsare ser), P2 (brister som bör lagas) och P3 (idéer). Claude Code adjudicerar: lagar, köar eller avvisar med skäl, och skriver utfallet i NATTEN.md.

## När modellen växer

En ny del läggs till på fem ställen i samma commit: schemat i `src/content.config.ts`, sidan i `Metod.astro`, Word-filen i `metoddocx.ts`, utskriften i `global.css`, och `_mall.yaml` samt tabellen ovan. Lathundens blocktyper på motsvarande sätt i `Lathund.astro`, `lathundBarn` i `metoddocx.ts` och `.lh-*`.

## Kontroller som gäller

| Vad | Hur |
|---|---|
| Bygget | `npm run validera` |
| Sidan, Word-filerna, underlaget, lathundens sidantal, det maskinella i mottagarläsningen | `node scripts/metodprov.mjs <slug> --underlag <md> --bilder` |
| Mottagarläsning av bilderna | Dela skärmbilderna i bitar, exportera Word-sidorna, läs varje bild som en lärare som ska köra passet i morgon. Regeln: fet stil betyder rubrik, inget annat; inget bryts så att det läses fel; likvärdiga saker ser likadana ut; det läraren behöver kommer först. Se steg 8 i `/ny-metod` |
| Läsbarhet och användbarhet, second opinion | `node scripts/metodgranskning.mjs <slug> --mall scripts/codex/metod-lasbarhet.md --extrabilder underlag/prov/<slug>/granskningsbilder`: Codex läser bara bilderna som lärare, efter att sidan redan är rättad |
| Mobil på riktigt | `node scripts/skarmbild.mjs <url> --mobil` (headless Chrome har en minsta fönsterbredd, `--window-size=390` ljuger) |
| Hela sajten efter en stiländring | `node scripts/skarmbilder.mjs --hojd 2200`: åtta sidor på desktop och mobil till `underlag/prov/sajt/`, sedan Codex med prompten `scripts/codex/stilbyte-granskning.md` och bilderna bifogade |
| Word-filen | `validate.py` i docx-skillen (kräver `pip install defusedxml lxml`); `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/word-pdf.ps1 dist/stodundervisning/<slug>-mallar.docx <ut.pdf>` exporterar filen med Word och skriver sidantalet, `pdftoppm -r 40 -png` gör en bild per sida att läsa; `scripts/word-sidor.ps1` räknar bara sidor |
| Mätning | `npx lighthouse http://localhost:4322/stodundervisning/<slug>` mot `astro preview --port 4322`; målet är 100 på alla fyra och CLS 0 |
| Second opinion | `node scripts/metodgranskning.mjs <slug>` |
