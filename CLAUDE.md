# niclasfohlin.se

Du förvaltar Niclas Fohlins författar- och kunskapssajt. Sajten ska vara snabb, sober och redaktionellt trovärdig. Läsbarhet före effekter. Ingen generisk AI-design.

Det viktigaste först: allt arbete sker på grenar, `npm run validera` går igenom före varje commit, taggar och publikationer tas från registren i `src/data/`, och du slår ihop, pushar och deployar själv när valideringen är grön. Kreditspärren stänger uppladdningen när nästa bygge (15 krediter) skulle ta saldot under 100 Netlify-krediter: arbetet fortsätter lokalt och laddas upp med en enda push när krediterna är påfyllda (`npm run krediter`, DRIFT.md under Krediter). Nytt innehåll mejlas prenumeranterna automatiskt efter deploy; längre nyhetsbrev skickas bara när Niclas säger skicka.

Arbete som inte är ett direkt svar på Niclas går genom kön: `node scripts/ko.mjs lista`, `starta`, `klar`. Ett fel du hittar i förbifarten läggs i kön med `lagg`, det lagas inte i samma commit. Hur kön fungerar står i ARBETSSATT.md.

@ARBETSSATT.md
@STIL.md

## Läs vid behov

| Fil | Vad den svarar på |
|---|---|
| KONCEPT.md | Vad sajten ska bli och varför |
| DRIFT.md | Plattformarna: vad som finns hos GitHub, Netlify, Brevo och Loopia, var inloggningarna ligger, kommandon som fungerar, vad man gör när något är rött; krediterna, kreditspärren och trafiken; besöksstatistiken i GoatCounter; delningskorten, delningsraden och bilderna; kommentarerna |
| METODER.md | Hur en metod tas emot och görs om: modellen, mappningen från kompendium till YAML, lathunden, textreglerna, kontrollerna, Codex-granskningen, metodriggen utanför repot, serier och lektionsbanker (Ljudlek i grupp) |
| UPPSTART.md | Hur drift, konton och behörigheter sattes upp från början |
| KO.md | Kön. `node scripts/ko.mjs lista` visar den, `/natt` arbetar igenom den |
| underlag/texter/ | Alla kända texter av Niclas i fulltext med register. `npm run texter` visar vilka som saknar post |
| src/data/taggar.json | Alla tillåtna taggar med alias |
| src/data/publikationer.json | Alla kända publikationer |
| .claude/commands/ | Färdiga arbetsflöden som `/ny-artikel`, `/ny-metod`, `/uppstart` |

## Stack

Astro 7 med TypeScript och Content Collections (glob-loader, Zod 4 via `astro/zod`). Statiskt bygge. GitHub versionshanterar, Netlify bygger och deployar från `main`. Netlify Functions i `netlify/functions/` för prenumeration och kommentarer. En databas, bara för kommentarerna (Netlify Database); inget CMS. Databasen kostar omkring 1 kredit varje gång den vaknar. Byggen och inloggningar med fel adress väcker den inte, och läsare bara första gången efter att kommentarerna på en sida ändrats, och därför ligger schemat i `netlify/database/schema/` och inte i `netlify/database/migrations/` (DRIFT.md under Kommentarer).

Kommentarerna under artiklar, böcker och metoder är ett lager: `npm run kommentarer -- av` tar bort dem från hela sajten utan rester, och `npm run kommentarer` visar läget och krediterna. Läs DRIFT.md under Kommentarer innan du rör dem.

Astro 7 använder en strikt kompilator: alla taggar måste stängas, ogiltig HTML-nästling rättas inte, och mellanrum mellan inline-element skrivs som `{" "}`. Markdown renderas av Sätteri. Node 22.12 eller senare.

## Tre innehållstyper

| Typ | Mapp | URL | Mall | Kommando |
|---|---|---|---|---|
| Artiklar | src/content/artiklar/ | /artiklar/<id> | _mall.md | /ny-artikel |
| Böcker | src/content/bocker/ | /bocker/<id> | _mall.md | /ny-bok |
| Stödundervisning | src/content/stodundervisning/ | /stodundervisning/<id> | _mall.yaml | /ny-metod |

Filer som börjar med `_` läses inte in. `utkast: true` visas lokalt men aldrig i produktion. Scheman ligger i `src/content.config.ts` och är strikta med avsikt.

Artiklar är oftast publicerade i Vi Lärare, Göteborgs-Posten eller en annan tidning först. Posten ska alltid visa var, med länk till originalet. Ingressen är egen text. Hela originaltexten ligger alltid på sajten, med `heltext: true`: Niclas sa 2026-09-24 att alla hans texter i Vi Lärare och andra tidningar ska finnas i fulltext här. Undantaget är poddavsnitt och intervjuer där texten inte är hans; de får länk och egen beskrivning.

Stödundervisning är en metodbank, inte en blogg. Varje metod är en YAML-fil efter modellen i `_mall.yaml` och `src/content.config.ts`: inledning, upplägg, passrutin, tidsschema, steg med exempelfraser, arbetsform, exempel, när gruppen fastnar, lärarens roll, urval, progression, uppföljning, mål, snabbmall, checklista och grund. Sidan, lathunden (`/stodundervisning/<id>/lathund`, fyra sidor ur snabbguiden), utskriften och docx-filerna (`/stodundervisning/<id>.docx` med allt: beskrivning, planeringsmallar och lathund; `<id>-mallar.docx` och `<id>-lathund.docx` för delarna; flera valda metoder i en fil) och lathundens PowerPoint (`/stodundervisning/<id>-lathund.pptx`, fyra bilder kant till kant) byggs ur samma data av `src/components/Metod.astro`, `src/lib/metoddocx.ts` och `src/lib/metodpptx.ts`, och allt som laddas ner bär © Niclas Fohlin och niclasfohlin.se. Exakt ett område (Matematik, Läsning, Skrivning), minst en nivå (F-3, 4-6, 7-9) och taggar för vad den tränar. Delar som saknas i underlaget utelämnas. Genomförandet ska en lärare kunna följa i morgon. En serie (Ljudlek i grupp) är en generell metod med en lektionsbank och lektioner som egna metoder med `serie`, `formaga` och `tranar`; banken, seriens meny och seriens kort byggs ur lektionerna (`src/lib/serie.ts`), så att en lektion läggs till eller tas bort som en fil (METODER.md under Serier och lektionsbanker).

## Registren styr taggar och publikationer

Bygget stoppar om en post använder en tagg eller publikation som inte finns i registret. Det är avsiktligt. Innan du taggar: kör `npm run taggar` och välj bland det som finns. Alias i registret fångar varianter som läsflyt, läs-flyt och träna läsflyt och pekar på en enda tagg. En ny tagg läggs till bara när ingen befintlig täcker samma sak, och då i samma commit som posten, med label, omrade, beskrivning och alias.

Tagg-id skrivs med a-z, 0-9 och bindestreck. Läsaren ser label.

## Prenumeration och utskick

Formuläret på /prenumerera anropar `netlify/functions/prenumerera.mjs`, som lägger till kontakten i Brevo med dubbel opt-in. Utan miljövariabler svarar funktionen 503 och hänvisar till RSS. Miljövariablerna sätter du i Netlify med `netlify env:set`. Hemligheter ligger aldrig i git; var de förvaras står i DRIFT.md, liksom läget i Brevo (avsändaren är nyhetsbrev@niclasfohlin.se med svar till Niclas Gmail).

Varje ny artikel, metod och bok mejlas prenumeranterna automatiskt: byggpluginen `netlify/plugins/utskick` körs efter varje lyckad produktionsdeploy, läser `nytt.json` ur bygget, jämför med det som redan mejlats (Netlify Blobs, lagret `utskick`) och skickar en Brevo-kampanj om det nya. Publicera därför bara det som är klart att mejlas; `utkast: true` hålls utanför.

`/utskick` skriver ett längre nyhetsbrev som utkast till `utskick/` och kan lägga upp det som kampanj i Brevo. Det skickas först när Niclas läst utkastet och sagt skicka.

## Kvalitet

1. `npm run validera` går igenom före varje commit. Den kontrollerar register, krymper nya bilder till sitt syfte, gör om lathundarnas pdf och mäter Word-lathunden i Word och Google Dokument där något har ändrats (Google-inloggningen i DRIFT.md), kontrollerar typer och bygge, prövar att varje text i en metod står både i Word-filen och i sidans utskrift (`scripts/paritet.mjs`), prövar Word-filerna mot reglerna för Word och Google Dokument (`scripts/wordregler.mjs`, METODER.md under Word och Google Dokument) och ritar de delningskort som saknas.
2. Små commits med tydliga meddelanden på svenska: "Artikel: ...", "Metod: ...", "Sajt: ...".
3. Inga nya beroenden utan skäl. Inga UI-ramverk för det som CSS och lite vanilla JS löser.
4. Semantisk HTML, tangentbordsnavigering, kontrast och alt-texter. Mobil först.
5. Varje sida har unik title och description. Canonical, Open Graph, sitemap och RSS finns i Base.astro och ska vara kvar. Varje sida får ett eget delningskort, 1200 × 630 med sidans titel, ur `src/lib/delningskort.ts` och mallen `src/pages/delning/kort/[namn].astro`; ingen sida behöver en egen delningsbild. Bilder under `public/images/` krymps automatiskt till sitt syfte (`scripts/bilder.mjs`), och cachen står i `netlify.toml`.
6. Designsystemet ligger i `src/styles/global.css` som variabler. Bygg vidare där i stället för att sprida färger och mått i komponenter.
7. Allt ur en källa utan drift (Niclas 2026-09-27): sidan, utskriften, lathunden, Word och PowerPoint byggs ur metodens fil vid varje bygge. Det enda som görs i förväg är delningskorten, lathundens pdf, som är lathunden i A4 liggande ur samma kod som PowerPoint-filen (som är 16:9), sparad som pdf av PowerPoint, och Word-lathundens textstorlek per sida, uppmätt i Word och Google Dokument (`src/data/lathund-word.json`), och `npm run validera` gör om dem automatiskt när posten eller koden har ändrats; bygget stannar om en gammal pdf eller ett saknat kort ändå pushas. Inget görs om för hand. Utskriftsknapparna skriver ut sidan, och metodens pdf får läraren genom Spara som PDF. En rättning i formen görs i den gemensamma koden (Metod.astro, Lathund.astro, metoddocx.ts, metodpptx.ts, global.css), aldrig i en enskild metod, så att alla metoder och nya metoder får den automatiskt.

## Mandat

Niclas gav 2026-09-19 Claude Code fullt mandat att sköta sajten och tjänsterna runt den: GitHub, Netlify, Brevo, domänen och koden. Du slår ihop till main, pushar, deployar, sätter miljövariabler, lägger till taggar och publikationer och löser driftproblem utan att fråga, så länge `npm run validera` är grönt och kreditspärren är öppen. Beslut Niclas ska känna till skrivs i NATTEN.md eller i svaret, efteråt. Verktygen, var inloggningarna ligger och anropen som fungerar står i DRIFT.md.

## Det här gör bara Niclas

1. Skapar konton och loggar in där en människa måste klicka i webbläsaren. Vad han ska göra, steg för steg, står i INSTRUKTIONER.docx.
2. Säger skicka innan ett längre nyhetsbrev går ut. Mejlen om nytt innehåll går automatiskt.
3. Lämnar fakta om sig själv och sina böcker. Du frågar efter underlag, du hittar inte på.
4. Avgör rättigheterna. Hans stående besked 2026-09-24: alla hans artiklar ligger alltid i fulltext på sajten, utan att du frågar per text.
