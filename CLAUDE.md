# niclasfohlin.se

Du förvaltar Niclas Fohlins författar- och kunskapssajt. Sajten ska vara snabb, sober och redaktionellt trovärdig. Läsbarhet före effekter. Ingen generisk AI-design.

Den här filen säger vad sajten är, vad du får göra och var allt annat står. Hur arbetet går till står i ARBETSSATT.md, som börjar med ett register: läs raden för det du ska göra. Hur text skrivs står i STIL.md. Båda läses in här nedanför och gäller alltid.

@ARBETSSATT.md
@STIL.md

## Var allt står

| Fil | Vad den svarar på |
|---|---|
| ARBETSSATT.md | Hur arbetet går till, med ett register överst som säger vilket avsnitt eller flöde som gäller för det du ska göra: kön, grenar och commits, valideringen, kontrollen före uppladdning, uppladdningen och kreditspärren, taggarna och var bilderna läggs, kod och design, driften och hemligheterna, nattkörningen och texterna |
| STIL.md | Hur text skrivs på sajten, i kod-kommentarer och i rapporter till Niclas |
| KONCEPT.md | Vad sajten ska bli och varför |
| DRIFT.md | Plattformarna: vad som finns hos GitHub, Netlify, Brevo och Loopia, var inloggningarna ligger, kommandon som fungerar, vad man gör när något är rött; krediterna och trafiken; besöksstatistiken i GoatCounter; delningskorten, delningsraden och bildernas mått; kommentarerna; krokarna; sessionerna och meddelandena till metodriggen |
| METODER.md | Hur en metod tas emot och görs om: modellen, mappningen från kompendium till YAML, lathunden, textreglerna, kontrollerna, Codex-granskningen, metodriggen utanför repot, serier och lektionsbanker (Ljudlek i grupp), kurser i veckor och veckans material (Ordverkstad i grupp), filmerna, Word och Google Dokument |
| wordparitet (`C:/wordparitet`, `node_modules/wordparitet/REGLER.md`) | Word och Google Dokument: reglerna med skäl och mätningar, regelprovet, mätbänken och jämförelserna, i en modul som sajten och metodriggen delar och båda bygger ut (K-158). Hur en ny regel läggs dit står i METODER.md under Word och Google Dokument |
| UPPSTART.md | Hur drift, konton och behörigheter sattes upp från början |
| KO.md | Kön. `node scripts/ko.mjs lista` visar den, `/natt` arbetar igenom den |
| NATTEN.md | Rapporten till Niclas: vad som gjordes och besluten han ska känna till |
| INSTRUKTIONER.docx | Det Niclas själv gör i webbläsaren, steg för steg |
| underlag/texter/ | Alla kända texter av Niclas i fulltext med register. `npm run texter` visar vilka som saknar post |
| src/data/taggar.json | Alla tillåtna taggar med alias |
| src/data/publikationer.json | Alla kända publikationer |
| .claude/commands/ | Flödena, ett per uppgift. Registret i ARBETSSATT.md säger vilket som gäller när |
| README.md | Ingången för en människa som öppnar repot: hur man kommer igång |
| AGENTS.md | Ingången för Codex, som hänvisar hit |

## Så hålls instruktionerna

En regel står på ett ställe (Niclas 2026-10-07: "Saker ska bara stå på ett ställe, annars blir det drift. Och behövs det ska det hänvisas till rätt fil."). Behöver en annan fil regeln hänvisar den dit, med filens namn och rubriken eller orden som stycket börjar med, och upprepar den inte. En ändring görs där regeln står.

Ingen fil ligger utan krok (Niclas 2026-10-07): varje fil i repot nås härifrån, genom en hänvisning i en instruktion, ett skript eller koden, eller genom sin innehållsmapp. En ny fil får sin krok i sitt hem i samma commit.

`npm run validera` prövar båda reglerna, med `scripts/instruktionsprov.mjs` och `scripts/krokprov.mjs`. Vad proven ser och inte ser står i DRIFT.md under Riggen.

## Stack

Astro 7 med TypeScript och Content Collections (glob-loader, Zod 4 via `astro/zod`). Statiskt bygge. Markdown renderas av Sätteri. Node 22.12 eller senare. GitHub versionshanterar, Netlify bygger och deployar från `main`. Netlify Functions i `netlify/functions/` för prenumeration och kommentarer. En databas, bara för kommentarerna (Netlify Database); inget CMS.

Kommentarerna under artiklar, böcker och metoder är ett lager som slås av och på. Läs DRIFT.md under Kommentarer innan du rör dem eller databasen: där står kommandona, vad som väcker databasen och vad det kostar.

## Tre innehållstyper

| Typ | Mapp | URL | Mall | Kommando |
|---|---|---|---|---|
| Artiklar | src/content/artiklar/ | /artiklar/<id> | _mall.md | /ny-artikel |
| Böcker | src/content/bocker/ | /bocker/<id> | _mall.md | /ny-bok |
| Stödundervisning | src/content/stodundervisning/ | /stodundervisning/<id> | _mall.yaml | /ny-metod |

Filer som börjar med `_` läses inte in. `utkast: true` visas lokalt men aldrig i produktion. Scheman ligger i `src/content.config.ts` och är strikta med avsikt. Taggar och publikationer styrs av registren i `src/data/`; reglerna står i ARBETSSATT.md under Innehåll.

Artiklar är oftast publicerade i Vi Lärare, Göteborgs-Posten eller en annan tidning först. Hur en post görs ur en text, och vad som gäller för hela texten, står i ARBETSSATT.md under Texterna.

Stödundervisning är en metodbank, inte en blogg. Varje metod är en YAML-fil efter modellen i `_mall.yaml` och `src/content.config.ts`, med exakt ett område (Matematik, Läsning, Skrivning, Socialt), minst en nivå (F-3, 4-6, 7-9) och taggar för vad den tränar. Ur den filen bygger `src/components/Metod.astro`, `src/lib/metoddocx.ts` och `src/lib/metodpptx.ts` allt läraren får, och allt som laddas ner bär © Niclas Fohlin och niclasfohlin.se.

| Vad läraren får | Adress |
|---|---|
| Sidan, som också är utskriften: allt eller bara beskrivningen (METODER.md under Utskriften) | `/stodundervisning/<id>` |
| Lathunden, fyra sidor ur snabbguiden, med metodens filmer i en spelare överst | `/stodundervisning/<id>/lathund` |
| Word-filen med allt: beskrivning, planeringsmallar och lathund | `/stodundervisning/<id>.docx` |
| Delarna var för sig | `<id>-mallar.docx` och `<id>-lathund.docx` |
| Flera valda metoder i en Word-fil | sätts ihop av det läraren väljer i metodbanken, `/stodundervisning/` |
| Lathundens PowerPoint, med filmerna på en bild först och sedan lathundens fyra bilder kant till kant | `/stodundervisning/<id>-lathund.pptx` |
| Filmerna som mp4 i en zip-fil | `/stodundervisning/<id>-filmer.zip` |
| I en metod med en bank av problem eller texter i nivåer: varje problem eller text på en egen sida, med lärarens sida och de andra bladen | `/stodundervisning/<id>/<nivå>-<nummer>` |
| Bankens blad, per nivå och för alla nivåer, bara problemen eller med lärarens sida och de andra bladen, i Word och pdf | `/stodundervisning/<id>-problem-<nivå>.docx` och `.pdf`, med `-med-lararens-sida` |

Modellens delar, lathunden, filmerna, banken, serier med lektionsbank och kurser i veckor står i METODER.md. Läs den innan du rör en metod eller koden som bygger den.

## Prenumeration och utskick

Formuläret på /prenumerera anropar `netlify/functions/prenumerera.mjs`, som lägger till kontakten i Brevo med dubbel opt-in. Utan miljövariabler svarar funktionen 503 och hänvisar till RSS. Miljövariablerna sätter du i Netlify med `netlify env:set`. Läget i Brevo står i DRIFT.md (avsändaren är nyhetsbrev@niclasfohlin.se med svar till Niclas Gmail).

Varje ny artikel, metod och bok mejlas prenumeranterna automatiskt: byggpluginen `netlify/plugins/utskick` körs efter varje lyckad produktionsdeploy, läser `nytt.json` ur bygget, jämför med det som redan mejlats (Netlify Blobs, lagret `utskick`) och skickar en Brevo-kampanj om det nya. Publicera därför bara det som är klart att mejlas; `utkast: true` hålls utanför.

`/utskick` skriver ett längre nyhetsbrev som utkast till `utskick/` och kan lägga upp det som kampanj i Brevo. Vem som säger skicka står under Det här gör bara Niclas.

## Mandat

Niclas gav 2026-09-19 Claude Code fullt mandat att sköta sajten och tjänsterna runt den: GitHub, Netlify, Brevo, domänen och koden. Du slår ihop till main, pushar, deployar, sätter miljövariabler, lägger till taggar och publikationer och löser driftproblem utan att fråga, så länge `npm run validera` är grönt och kreditspärren är öppen. Beslut Niclas ska känna till skrivs i NATTEN.md eller i svaret, efteråt.

## Det här gör bara Niclas

1. Skapar konton och loggar in där en människa måste klicka i webbläsaren.
2. Säger skicka innan ett längre nyhetsbrev går ut, när han har läst utkastet. Mejlen om nytt innehåll går automatiskt.
3. Lämnar fakta om sig själv, sina böcker och sina artiklar. Du frågar efter underlag, du hittar inte på.
4. Avgör rättigheterna. Hans stående besked om artiklarna står i ARBETSSATT.md under Texterna.
