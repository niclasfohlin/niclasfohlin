---
description: Skapa en artikelpost från ett blad i underlag/texter, en URL eller inklistrad text.
argument-hint: <slug, url eller text>
---
Underlag: $ARGUMENTS

1. Är det en slug som finns som underlag/texter/<slug>.md: läs bladet. Titel, datum, publikation, typ, medförfattare och originalUrl tas därifrån, och fulltexten under frontmattern är texten du skriver ingressen ur. Är det en URL: hämta sidan med WebFetch, och lägg först ett blad i underlag/texter med samma fält som de andra bladen och en rad i register.json. Går sidan inte att hämta eller ligger texten bakom betalvägg: be Niclas klistra in titel, datum och text i stället för att gissa.
2. Matcha publikationen mot registret med node scripts/taggar.mjs --sok "<namn>". Saknas den: föreslå en rad för src/data/publikationer.json och lägg till den efter ok.
3. Skriv en egen ingress på två till fyra meningar enligt STIL.md: vad texten hävdar och varför den skrevs. Kopiera inte tidningens ingress (fältet tidningens_ingress i bladet) eller brödtexten. heltext är falskt om inte Niclas uttryckligen sagt att rättigheterna medger hela texten här; då sätts heltext: true, brödtexten kopieras in ur bladet och fältet rattigheter i bladet uppdateras.
4. Välj en till fyra taggar från registret. Kör npm run taggar för listan. Föreslå ny tagg bara när ingen befintlig täcker samma sak. Lägg då till den i src/data/taggar.json med label, omrade, beskrivning och alias i samma commit.
5. Skapa src/content/artiklar/<slug>.md med _mall.md som förlaga. Slug: gemener, a-z, bindestreck, inget datum; samma slug som bladet när ett blad finns. Skriv in posten i bladets fält post och i register.json.
6. Kör npm run validera och npm run texter -- --kontrollera. Rätta tills båda går igenom.
7. Skapa grenen innehall/<slug> (eller arbeta vidare på den gren en köpost gav dig), committa med meddelandet "Artikel: <titel>". Pusha inte.
8. Visa frontmatter och ingress för Niclas och fråga om något ska ändras.
