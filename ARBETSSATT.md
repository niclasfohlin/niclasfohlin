# Arbetssätt

Så här jobbar Claude Code i det här repot. Filen läses in med CLAUDE.md vid start och efter varje kompaktering. Vad sajten är, mandatet och vad bara Niclas gör står i CLAUDE.md.

## Register

Läs raden för det du ska göra. Avsnitten står i den här filen, ett per steg, och går att läsa var för sig. Flödena är egna filer som läses när uppgiften kommer.

| När du ska | Läs |
|---|---|
| börja en uppgift, vilken som helst | Innan du börjar en uppgift, och Kön när uppgiften inte är ett direkt svar på Niclas |
| göra en commit | Grenar och commits |
| ladda upp till sajten | Kontroll före uppladdning, sedan Uppladdning |
| ta emot en ny metod | flödet `/ny-metod` (`.claude/commands/ny-metod.md`) och METODER.md |
| ändra en metod som ligger ute, eller koden som bygger metoderna | METODER.md, och Design och kod |
| lägga upp en artikel | flödet `/ny-artikel` (`.claude/commands/ny-artikel.md`), Texterna och Innehåll |
| lägga upp en bok | flödet `/ny-bok` (`.claude/commands/ny-bok.md`) och Innehåll |
| tagga en post, skapa en tagg eller lägga in en bild | Innehåll |
| skriva en ingress, en beskrivning eller en rapport till Niclas | STIL.md |
| ändra kod eller design | Design och kod, och KONCEPT.md |
| sköta en tjänst, logga in eller röra en hemlighet | Drift, och DRIFT.md |
| arbeta igenom kön på natten | flödet `/natt` (`.claude/commands/natt.md`) och Nattkörning |
| skriva ett längre nyhetsbrev | flödet `/utskick` (`.claude/commands/utskick.md`) och CLAUDE.md under Prenumeration och utskick |
| bara köra valideringen | flödet `/validera` (`.claude/commands/validera.md`) |
| sätta upp riggen från början | flödet `/uppstart` (`.claude/commands/uppstart.md`) och UPPSTART.md |
| komma vidare när du har fastnat | När du fastnar |

## Innan du börjar en uppgift

Kör `git status` och `git branch --show-current`. Läs de filer uppgiften rör innan du ändrar dem. Rör bara det uppgiften gäller. Hittar du något annat som borde fixas: lägg det i kön med `node scripts/ko.mjs lagg "<vad>" --var <fil>`, gör det inte i samma commit.

## Kön

Arbete som inte är ett direkt svar på Niclas går genom kön. Kön ligger i KO.md och sköts av `scripts/ko.mjs`. Registret skrivs bara av skriptet; det Niclas vill ha gjort skriver han under Inkorg i KO.md, och `node scripts/ko.mjs inkorg` gör poster av raderna. KO.md står i .gitignore: den är arbetsläge, inte innehåll, och ska varken byta utseende med grenen eller krocka vid en sammanslagning.

En post tas med `starta`, som ställer relevansfrågorna och byter till grenen `ko/<id>` från main (eller till en gren du anger, som nattens). Den stängs med `klar`, som kör `npm run validera`, kräver att allt ligger i git på postens gren och vägrar när fler än två nya poster bär `[UR <id>]`: så många fynd ur en post betyder att roten inte hittades. Ett fynd under en post som hör till samma arbete lagas i samma post när det är litet, som en egen commit; annars läggs det med `lagg --ur <id>`. En onödig post avförs med `stang` och ett underlag. Det som kräver Niclas blockeras med `blockera --behovs`.

Prio 1 görs nu, prio 2 i tur och ordning, prio 3 vilar tills ett annat jobb ändå ska ändra samma fil och kräver därför `--var`. `--drabbar lasare` ger prio 1 (en läsare av sajten ser felet), `--drabbar rigg` ger prio 3 (bara arbetssättet är drabbat). `node scripts/ko.mjs` utan argument visar alla kommandon, `npm run ko:prov` kör köns egna prov.

Kommer mycket på en gång, som en ny metod med kommentarer eller flera önskemål i ett meddelande (Niclas 2026-09-27: "Lätt att tappa bort vad du ska göra när det blir en massa nytt jobb"): lägg varje sak i kön med `lagg` innan arbetet börjar, också det som görs direkt, och stäm av mot `node scripts/ko.mjs lista` innan main pushas och innan svaret till Niclas skrivs. Det som väntar på något, som en uppladdning som ska ske med nästa metod, är en blockerad post med `--behovs`, så att den syns i listan och inte tas av en nattkörning.

## Grenar och commits

Main är det som ligger ute. Allt arbete sker på en gren: `innehall/<slug>` för poster, `sajt/<beskrivning>` för kod och design, `natt/<datum>` för nattkörningar. En hook stoppar commits direkt på main. Varje commit är liten, gör en sak och har ett meddelande på svenska som säger vad: "Artikel: Nej till no excuses", "Metod: Seriesamtal", "Sajt: filtrering i metodbanken".

Före varje commit: `npm run validera`. Det kör instruktionernas två prov (`scripts/instruktionsprov.mjs` och `scripts/krokprov.mjs`, CLAUDE.md under Så hålls instruktionerna), sätter dagens datum i en metod som har ändrats (Niclas 2026-10-03: "När metoden ändras ska datumet ändras"; `scripts/datumkoll.mjs`), kör registerkontrollen, prövar materialets lista och att materialet i en kurs i veckor är sorterat i veckans material och det som gäller hela kursen (`scripts/ramindexprov.mjs`, `scripts/veckoprov.mjs`), krymper nya bilder, gör filmernas mp4 ur svg-filmerna där en film är ny eller ändrad (`scripts/filmmp4.mjs`, kräver Chrome och ffmpeg), gör om lathundarnas pdf och mäter Word-lathunden i Word och Google Dokument där metoden eller koden har ändrats (kräver Google-inloggningen, DRIFT.md), kör `astro check` och `astro build`, prövar att varje text i en metod står både i Word-filen och i sidans utskrift (`scripts/paritet.mjs`), prövar lathundens räkning och filmer i varje fil (`scripts/lathundprov.mjs`), prövar Word-filerna mot reglerna för Word och Google Dokument (`scripts/wordregler.mjs`, METODER.md under Word och Google Dokument) och ritar de delningskort som saknas. Går det inte igenom committas inget.

## Kontroll före uppladdning

Niclas ska inte behöva provköra sajten (2026-09-29, efter att delningsraden laddades upp tre gånger på en timme och han hittade felen på sin telefon). Innan main pushas med något som en läsare ser går allt i tabellen igenom. Det som inte går igenom väntar till nästa arbetspass.

| Kontroll | Hur |
|---|---|
| Bygget | `npm run validera` är grönt |
| Sidorna | Varje ändrad sida är läst som bilder i telefonbredd (320 till 430) och på dator, i förhandsvisningen eller med `scripts/skarmbild.mjs` |
| Flödena | Varje knapp och länk är genomgången som läsare på telefon och dator: vad som händer, i vilken app, vilken text som följer med, och att två knappar inte gör samma sak |
| Andra tjänster | Uppgifter om Facebook, LinkedIn, Google och andra kommer ur tjänstens egen dokumentation. Det osäkra skrivs som osäkert och byggs inte på |
| Det som bara går att pröva på en riktig telefon | Appar, telefonens delningsmeny och inloggningar sägs som oprövat till Niclas före pushen, med exakt vad han kan pröva, en gång |
| Word-filerna i Google Dokument | Ändras en Word-fil: `node scripts/googleprov.mjs --andrade --mapp` gör om varje ändrad fil i Google Dokument och i Word, stoppar när ett block som Word-filen själv börjar på en ny sida inte börjar en sida i Google eller tar fler sidor där, när en sida är tom, när text saknas i Google eller när ett ord bryts mitt i, visar annan radbrytning i den fria texten som obs, och ritar ett översiktsark per fil med Words sidor över Googles, som läses sida för sida. Google-versionerna ligger i Drive-mappen "Prov före uppladdning · niclasfohlin.se" (Niclas 2026-09-30: "Granska dem ska du göra. Automatiskt"). Word och Google läser samma inställning olika (exakt radhöjd, ekvationens storlek), så det som är rätt i Word är inte bevisat rätt i Google |
| Det andra ögat | En större ändring granskas (agenten granskare eller Codex) före pushen, och P1 lagas före pushen |
| Rättelser | Samlas till en push per arbetspass, också när Niclas hittar ett fel, om felet inte hindrar läsarna |

## Uppladdning

När arbetet är klart och `npm run validera` är grönt slår du själv ihop grenen till main och pushar (mandatet står i CLAUDE.md). En ny artikel eller bok visas först för Niclas, som flödet säger. Slå ihop och pusha som egna kommandon: `git switch main`, `git merge --ff-only <gren>` och sedan `git push origin main` för sig. Kroken prövar kreditspärren mot det som ligger på main när kommandot börjar, och en kedja som både slår ihop och pushar stoppas därför när spärren är stängd, också när den inte bygger något. Netlify bygger och deployar varje push till main, och varje lyckat bygge drar krediter ur periodens pott. Trafiken drar också, så saldot sjunker även utan byggen. Talen står i DRIFT.md under Krediter, och `npm run krediter` visar det verkliga saldot och vad som drar. Därför: samla arbetet och pusha main högst en gång per arbetspass eller nattkörning, aldrig ett bygge per post. Rör pushen bara skript, dokumentation eller kön: skriv `[skip netlify]` sist i commit-meddelandet, så byggs inget. Netlify läser märket på den senaste commiten i pushen; en push med sajtändringar ska därför sluta med en commit utan märket, annars ligger de på main utan att ha byggts. Testa lokalt med `npm run validera`, `npm run dev` och `netlify functions:serve`; starta aldrig byggen på Netlify för att testa. Efter pushen: `node scripts/deploykoll.mjs` väntar in bygget för HEAD (omkring en minut), säger grönt eller rött och säger om just den deployen mejlade prenumeranterna. Öppna sidan som ändrats. Beskriv sedan för Niclas vad som gjorts och var det syns. Blev bygget rött: laga eller backa, och skriv vad som hände.

Kreditspärren (Niclas 2026-09-27): vid 100 krediter kvar laddas inget upp. Spärren stänger när nästa bygge skulle ta saldot under 100. Läget står i en rad vid varje nytt uppdrag och efter en kompaktering, och kroken stoppar en push till main, `netlify deploy --prod` och nya byggen när spärren är stängd. Säg då till Niclas och arbeta vidare lokalt: grenar, `npm run validera` och sammanslagning till main som vanligt, men main pushas inte. Säkerhetskopiera det som väntar med `git push origin main:vantar-pa-krediter`; Netlify bygger bara main. Medan spärren är stängd släpper kroken bara en push där varje ny commit bär `[skip netlify]`, så väntar sajtändringar på main går inte heller en ren dokumentationsändring upp; lägg den i reservgrenen. När krediterna är påfyllda laddas allt upp med en enda push av main, och det nya mejlas i ett utskick; ta sedan bort reservgrenen med `git push origin --delete vantar-pa-krediter` (allt i den finns då på main). `KREDITSPARR=av` först i kommandot släpper igenom en push, bara när Niclas sagt det.

## Innehåll

Poster skapas från mallen i sin mapp (tabellen i CLAUDE.md under Tre innehållstyper).

Taggar och publikationer tas från registren i `src/data/`, och bygget stoppar en post som använder en tagg eller publikation som inte finns där. Det är avsiktligt. Innan du taggar: kör `npm run taggar` och välj bland det som finns. `node scripts/taggar.mjs --sok <ord>` slår upp om ett ord redan är en tagg, ett alias eller en publikation. Alias i registret fångar varianter som läsflyt, läs-flyt och träna läsflyt och pekar på en enda tagg. Tagg-id skrivs med a-z, 0-9 och bindestreck, och läsaren ser label. En tagg får en egen sida först när något innehåll använder den.

En post har minst två och högst fem taggar, och schemat stoppar annars. Den andra taggen är aldrig en utfyllnad (Niclas 2026-10-03). Har en post redan fem taggar byts en ut bara när den nya är uppenbart bättre, det vill säga mer precis om vad posten handlar om, och då går den bredaste av de fem. En ny artikel, bok eller metod stoppas av `npm run validera` tills dess taggförslag är lästa och avgjorda: `node scripts/taggar.mjs --post <fil>` listar registrets taggar vars ord står i posten men som saknas, och posten skrivs sedan in med datumet i `src/data/taggprov.json`. Så sker det av sig självt också i en ny session.

En helt ny tagg skapas bara när fyra saker stämmer: ingen befintlig tagg eller alias täcker ämnet (täcker en nästan, får den ett alias i stället), ämnet är det posten huvudsakligen handlar om eller tränar, genomgången av alla poster hittar minst en post till eller fler texter om ämnet är på väg, och namnet är lärarens eget ord med alias för de ord lärare söker på. Den läggs till i samma commit som posten, med label, omrade, beskrivning och alias. Den prövas alltid mot alla befintliga artiklar, böcker och metoder med `node scripts/taggar.mjs --forslag <id>`, och träffarna avgörs en och en. Den bär `motivering`, `provad` (datumet för genomgången) och, när den bara har en post, `fler` i registret, och bygget stoppar den annars. Ett ord får bara höra till en tagg.

Bilder läggs i `public/images/`, och ingen skalar för hand: `npm run validera` krymper dem till sitt syfte och ritar ett delningskort per sida, så ingen sida behöver en egen delningsbild. Committa bilden och kortet med posten. Måtten, kvaliteten, cachen och hur korten ritas står i DRIFT.md under Delning och bilder.

Ingresser och beskrivningar skrivs enligt STIL.md. De är Niclas röst utåt. Är du osäker på ton eller fakta: fråga, eller skriv ett förslag och markera det tydligt som förslag.

## Design och kod

KONCEPT.md beskriver målet. Utveckla iterativt: en sak i taget, testa i `npm run dev`, gör commit. Designsystemet ligger i `src/styles/global.css` som variabler: bygg vidare där i stället för att sprida färger och mått i komponenter. Nya komponenter i `src/components/`. Semantisk HTML, tangentbordsnavigering, kontrast och alt-texter. Mobil först. Inga nya beroenden utan skäl, och inga UI-ramverk för det som CSS och lite vanilla JS löser. Varje sida har unik title och description. Canonical, Open Graph, sitemap och RSS finns i Base.astro och ska vara kvar.

En källa, ingen drift (Niclas 2026-09-27): allt en läsare får, sidan, utskriften, lathunden, Word och PowerPoint, byggs ur metodens fil vid varje bygge. Det enda som görs i förväg är delningskorten, filmernas mp4 med omslagsbild, gjorda ur svg-filmen, lathundens pdf, som är lathunden i A4 liggande ur samma kod som PowerPoint-filen (som är 16:9), sparad som pdf av PowerPoint, och Word-lathundens textstorlek per sida, uppmätt i Word och Google Dokument (`src/data/lathund-word.json`). `npm run validera` gör om dem automatiskt när posten eller koden har ändrats, och bygget stannar om en gammal pdf, en film utan aktuell mp4 eller ett saknat kort ändå pushas. Inget görs om för hand, och ingen fil läggs in som måste göras om för hand. En rättning i formen görs i den gemensamma koden (Metod.astro, Lathund.astro, metoddocx.ts, metodpptx.ts, global.css), aldrig i en enskild metod, så att alla metoder och nya metoder får den automatiskt. Utskriftsknapparna skriver ut sidan, och metodens pdf får läraren genom Spara som PDF. `metodprov.mjs --bilder` skriver ut sidan och lathunden med Chrome och kontrollerar dem.

Astro 7 använder en strikt kompilator: alla taggar måste stängas, ogiltig HTML-nästling rättas inte, inga block-element läggs i `<p>`, och mellanrum mellan inline-element skrivs som `{" "}`.

## Drift

Claude Code sköter driften direkt från riggen: GitHub med `gh`, Netlify med `netlify`, Brevo med `node scripts/brevo.mjs`, DNS hos Loopia med `python scripts/loopia.py`. Vad som finns hos varje tjänst, var inloggningarna ligger, vilka kommandon som fungerar och vad man gör när något är rött står i DRIFT.md.

Hemligheter ligger aldrig i git, skrivs aldrig ut i chatten eller i loggar och efterfrågas aldrig som värde. Lösenord som Niclas ändå skriver används inte och sparas inte; be honom byta. `NETLIFY_AUTH_TOKEN` ska inte vara satt i skalet.

En inloggning som kräver webbläsaren (`gh auth login`, `netlify login`) startas i bakgrunden så att koden eller länken syns i utdatan, och Niclas gör klickandet enligt INSTRUKTIONER.docx. Fastnar ett steg på att en människa måste göra det: skriv steget i INSTRUKTIONER.docx och NATTEN.md och gå vidare med nästa sak.

## Nattkörning

`/natt` arbetar igenom den körbara kön på en egen gren, en post i taget genom `starta` och `klar`, slår ihop grenen till main och pushar när valideringen är grön, och skriver rapporten till `NATTEN.md` i repots rot. Git ignorerar filen, och den skrivs över varje gång. Under natten tar Claude Code egna beslut i allt utom det som bara Niclas gör (listan i CLAUDE.md). Sådant blockeras i kön med en rad om vad som behövs, och steget skrivs in i INSTRUKTIONER.docx. Vad som får lämna utkastläget står i CLAUDE.md under Prenumeration och utskick.

## Texterna

Alla kända texter av Niclas ligger i `underlag/texter/`, ett blad per text med fulltext och metadata, och `underlag/texter/register.json` är listan. `npm run texter` visar vilka som saknar post på sajten. En post skapas ur bladet med `/ny-artikel <slug>`: egen ingress, taggar ur registret, och var texten först publicerades, alltid med länk till originalet. Hela originaltexten ligger alltid på sajten: fulltexten kopieras in i posten ur bladet och `heltext: true` sätts. Niclas sa 2026-09-24 att alla hans texter i Vi Lärare och andra tidningar ska finnas i fulltext här, och det gäller utan att du frågar per text. Ett poddavsnitt eller en intervju där texten är någon annans får länk och egen beskrivning.

## Metoder ur underlag

Niclas lämnar metoder till stödundervisning som kompendier (docx och pdf) med en fast modell och lathundar (pptx, pdf). Hur en metod tas emot, görs om till YAML, provas, granskas av Codex och läggs in står i METODER.md, med de publicerade metoderna som förebild; det körbara flödet är `/ny-metod`. Underlagen ligger i `underlag/metoder/`, som git ignorerar eftersom repot är publikt.

## När du fastnar

Tre försök på samma sak räcker. Beskriv sedan vad du provat, vad du tror är fel och vad du behöver. Gissa inte API-detaljer; leta upp dokumentationen eller fråga. Fakta om Niclas gissas aldrig fram (CLAUDE.md under Det här gör bara Niclas).
