# Metoder: från underlag till sida

Så tas en metod till stödundervisning emot och görs om till en post. Modellen är de tre som redan finns: öppna `src/content/stodundervisning/problemlosning-i-grupp.yaml` bredvid det nya underlaget och följ formen. `problemlosning-i-grupp.yaml` har den rikaste modellen och en lathund med blocket tavla; `boksamtal-i-grupp.yaml` visar en fri tabell efter stegtabellen och en lathund med spalter och skrivruta; `faktatextsamtal-i-grupp.yaml` en fri tabell efter arbetsformen och en lathund med kedja, tabell, snabbmall och not. Det körbara arbetsflödet är `/ny-metod`; den här filen förklarar varför det ser ut som det gör.

## Det som kommer från Niclas

Ett kompendium i docx (och samma i pdf, för designen) med en eller flera metoder efter en fast modell, och en lathund i pptx, pdf eller odp med fyra sidor per metod. Filerna kommer som uppladdningar i chatten, med sökväg. Kopiera dem till `underlag/metoder/<leverans>/`, där `<leverans>` är avsändare och månad, som `kungsholmen-2026-09` (git ignorerar mappen: repot är publikt, underlagen är opublicerade). Namnge dem `kompendium.docx`, `kompendium.pdf`, `lathund.pptx` och `lathund.pdf`; `kompendium.md` och `lathund-sidor/` görs av dig. Den första leveransen ligger i `underlag/metoder/kungsholmen-2026-09/`.

Läs så här: docx med `pandoc <fil> -t markdown -o <mapp>/kompendium.md`; pdf-sidorna med Read (designen: band, rutor, tabeller, bockar). Kommer lathunden bara som pptx eller odp: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pptx-till-pdf.ps1 <mapp>/lathund.pptx` gör pdf:en med PowerPoint, och `pdftoppm -r 80 -png <mapp>/lathund.pdf <mapp>/lathund-sidor/sida` ger en bild per sida att läsa med Read. Texten går också att läsa ur `ppt/slides/slide*.xml` efter uppackning. Flera metoder i samma kompendium delas per rubriknivå 2.

## Modellen

Schemat i `src/content.config.ts` är strikt: ett okänt fält, en tabellrad med fel antal celler eller en okänd tagg stoppar bygget med besked. Delarna är valfria; det som saknas i underlaget utelämnas. Så här hänger kompendiets rubriker, fälten och det som byggs ihop:

| I kompendiet | Fält | Syns som |
|---|---|---|
| Rubrik, underrubrik, faktaruta (tid, period, grupp, material) | `titel`, `undertitel`, `tid`, `period`, `grupp`, `material`, `omrade`, `arskurs`, `taggar`, `format` | sidhuvud och faktaruta, kortet i metodbanken, lathundens faktarutor, docx-framsidan |
| Egen ingress (skrivs av oss) | `ingress` | kortet, startsidan, nyhetsbrevet, description |
| Inledande stycken | `inledning` | första stycket på sidan |
| "Så fungerar insatsen", principer | `upplagg`, `principer` (rubrik, text) | rutor |
| Passrutin | `passrutin` (steg, efter) | numrerad rutinruta, `#passrutin` |
| Tidsschema | `tidsschema` (rader: tid, fas, vad) | tabell, `#tidsschema` |
| "Vad du gör och säger", exempelfraser | `steg` (rader: namn, fraga, gor, fraser) | stegtabell med fraskolumn, `#steg`; fraserna skrivs utan citattecken |
| Arbetsformens delar | `arbetsform` (delar: rubrik, text) | rutor i två spalter, `#arbetsform` |
| Fria tabeller (frågetyper, textstrukturer, mappens innehåll) | `tabeller` (plats efter-inledning, efter-steg, efter-arbetsform eller efter-urval) | rubriktabeller där de hör hemma |
| Exempel på ett pass | `exempel` (valt, text) | `#exempel` |
| När gruppen fastnar | `fastnar` (fragaForst, trappa, efter, motto) | frågeruta, stödtrappa, motto, `#fastnar` |
| Lärarens roll: gör och undvik | `roll` (gor, undvik) | två kolumner, `#roll` |
| Var man hittar texter eller uppgifter, krav | `urval` (text, krav) | `#urval` |
| Hem och skola: möte med vårdnadshavare, kontrakt, schema att fylla i | `hem` (text, kontrakt med inledning och ansvar, schema med kolumner och antal rader) | `#hem`; kontraktet och schemat som egna sidor i planeringsmallarna |
| Progression | `progression` (enhet Vecka eller Pass; rader: vecka, fokus, roll) | tabell, `#progression` |
| Uppföljning | `uppfoljning` (rader: nar, vad) | tabell, `#uppfoljning` |
| Mål | `mal` (punkter) | kryssbar lista, `#mal`, målkollen i mallarna |
| Snabbmall | `snabbmall` (fore, efter) | `#snabbmall`, mallen i docx och lathundens block snabbmall |
| Checklista | `checklista` (punkter) | kryssbar lista, `#checklista`, mallen i docx |
| Grund och källor | `grund` (text, kallor) | `#grund`; källor som (Författare, årtal) |

Delarna `arbetsform`, `fastnar`, `roll` och `urval` kräver också `rubrik` och `text` (kompendiets rubrik och inledande stycke), och `urval` kan ha `kravText` före kraven; `_mall.yaml` visar alla fält. Exakt ett `omrade`: det metoden i första hand tränar; tränar den två lika mycket, fråga Niclas. `relaterade` pekar åt båda håll: lägg den nya metoden i de metoder den hör ihop med, i samma commit. `uppdaterad` är dagens datum när posten publiceras eller ändras. `utkast: true` håller metoden utanför produktionen, pdf-kontrollen och mejlet till prenumeranterna, men visar den i `npm run dev`; sätt `utkast: false` när metoden är klar att mejlas, före pushen.

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

Texten i posten är Niclas egen ur underlaget, ordagrant. De enda avsiktliga ändringarna: lagernivåer (lager 1 till 3, RTI, insatsspår) bort, årskurs 4 till 9 om Niclas inte säger annat, kolon i stället för tankstreck i rubriker, "jag" i stället för "du" i checklistan. Elevantalet tas ur lathunden om kompendiet och lathunden säger olika (boksamtal fyra till tio, problemlösning och faktatextsamtal två till åtta). Säger de olika om passlängd, frekvens eller period: sajten följer kompendiet, och avvikelsen skrivs som ett beslut till Niclas. Ingress och undertitel är vår egen text enligt STIL.md. Saknas något som en publicerad metod behöver (område, årskurs, passrutin eller genomförande, uppföljning): fråga Niclas, hitta inte på.

Pushen mejlar prenumeranterna, så metoden pushas när den är klar. Behöver Niclas se den först: visa skärmbilderna och Word-filen från metodprov i chatten, eller håll den som utkast tills han sagt ja. Beslut och avvikelser skrivs i NATTEN.md, rapporten till Niclas (den används även dagtid och skrivs över per pass), och sammanfattas i svaret.

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

## Codex-granskningen

Varje ny metod granskas av Codex innan den pushas. `scripts/metodgranskning.mjs` bygger prompten ur `scripts/codex/metod-granskning.md`, lägger med YAML-filen, underlaget, de byggda sidorna, Word-filernas text (pandoc) och skärmbilderna, och kör Codex i bakgrunden. Den granskar tre saker: paritet i innehåll (varje del i underlaget finns i YAML, varje del i YAML finns på sidan, i Word-filen och i lathunden, siffrorna stämmer överallt), paritet i design (sidan, utskriften och Word-filen använder samma element och ordning) och kvalitet (STIL.md, tillgänglighet, lärarnytta), och lämnar fynden som P1 (fel en läsare ser), P2 (brister som bör lagas) och P3 (idéer). Claude Code adjudicerar: lagar, köar eller avvisar med skäl, och skriver utfallet i NATTEN.md.

## När modellen växer

En ny del läggs till på fem ställen i samma commit: schemat i `src/content.config.ts`, sidan i `Metod.astro`, Word-filen i `metoddocx.ts`, utskriften i `global.css`, och `_mall.yaml` samt tabellen ovan. Lathundens blocktyper på motsvarande sätt i `Lathund.astro`, `lathundBarn` i `metoddocx.ts` och `.lh-*`.

## Kontroller som gäller

| Vad | Hur |
|---|---|
| Bygget | `npm run validera` |
| Sidan, Word-filerna, underlaget, lathundens sidantal | `node scripts/metodprov.mjs <slug> --underlag <md> --bilder` |
| Mobil på riktigt | `node scripts/skarmbild.mjs <url> --mobil` (headless Chrome har en minsta fönsterbredd, `--window-size=390` ljuger) |
| Hela sajten efter en stiländring | `node scripts/skarmbilder.mjs --hojd 2200`: åtta sidor på desktop och mobil till `underlag/prov/sajt/`, sedan Codex med prompten `scripts/codex/stilbyte-granskning.md` och bilderna bifogade |
| Word-filen | `validate.py` i docx-skillen (kräver `pip install defusedxml lxml`), och Word via COM: öppna, PageFit, bläddra, skärmdump |
| Mätning | `npx lighthouse http://localhost:4322/stodundervisning/<slug>` mot `astro preview --port 4322`; målet är 100 på alla fyra och CLS 0 |
| Second opinion | `node scripts/metodgranskning.mjs <slug>` |
