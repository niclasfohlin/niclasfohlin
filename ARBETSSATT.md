# Arbetssätt

Så här jobbar Claude Code i det här repot. Filen läses vid start och igen efter varje kompaktering.

## Grenar och commits

Main är det som ligger ute. Allt arbete sker på en gren: `innehall/<slug>` för poster, `sajt/<beskrivning>` för kod och design, `natt/<datum>` för nattkörningar. En hook stoppar commits direkt på main. Varje commit gör en sak och har ett meddelande som säger vad: "Artikel: Nej till no excuses", "Sajt: filtrering i metodbanken".

Före varje commit: `npm run validera`. Det sätter dagens datum i en metod som har ändrats (Niclas 2026-10-03: "När metoden ändras ska datumet ändras"; `scripts/datumkoll.mjs`), kör registerkontrollen, krymper nya bilder, gör om lathundarnas pdf och mäter Word-lathunden i Word och Google Dokument där metoden eller koden har ändrats (kräver Google-inloggningen, DRIFT.md), kör `astro check` och `astro build`, prövar att varje text i en metod står både i Word-filen och i sidans utskrift (`scripts/paritet.mjs`), prövar Word-filerna mot reglerna för Word och Google Dokument (`scripts/wordregler.mjs`) och ritar de delningskort som saknas. Går det inte igenom committas inget.

När arbetet är klart och `npm run validera` är grönt slår du själv ihop grenen till main och pushar. Netlify bygger och deployar varje push till main, och varje lyckat bygge drar 15 krediter från månadspotten på 1000, som fylls på den 20:e. Trafiken drar också, så saldot sjunker även utan byggen; `npm run krediter` visar det verkliga saldot och vad som drar. Därför: samla arbetet och pusha main högst en gång per arbetspass eller nattkörning, aldrig ett bygge per post. Rör pushen bara skript, dokumentation eller kön: skriv `[skip netlify]` sist i commit-meddelandet, så byggs inget. Netlify läser märket på den senaste commiten i pushen; en push med sajtändringar ska därför sluta med en commit utan märket, annars ligger de på main utan att ha byggts. Testa lokalt med `npm run validera`, `npm run dev` och `netlify functions:serve`; starta aldrig byggen på Netlify för att testa. Efter pushen: `node scripts/deploykoll.mjs` väntar in bygget för HEAD (omkring en minut), säger grönt eller rött och visar om prenumeranterna mejlades. Beskriv sedan för Niclas vad som gjorts och var det syns. Blev bygget rött: laga eller backa, och skriv vad som hände.

Kreditspärren (Niclas 2026-09-27): vid 100 krediter kvar laddas inget upp. Spärren stänger när nästa bygge skulle ta saldot under 100. Läget står i en rad vid varje nytt uppdrag och efter en kompaktering, och kroken stoppar en push till main, `netlify deploy --prod` och nya byggen när spärren är stängd. Säg då till Niclas och arbeta vidare lokalt: grenar, `npm run validera` och sammanslagning till main som vanligt, men main pushas inte. Säkerhetskopiera det som väntar med `git push origin main:vantar-pa-krediter`; Netlify bygger bara main. Medan spärren är stängd släpper kroken bara en push där varje ny commit bär `[skip netlify]`, så väntar sajtändringar på main går inte heller en ren dokumentationsändring upp; lägg den i reservgrenen. Kör pushen som ett eget kommando: kroken prövar hela kommandot, och en kedja med `git merge … && git push` stoppas helt. När krediterna är påfyllda laddas allt upp med en enda push av main, och det nya mejlas i ett utskick; ta sedan bort reservgrenen med `git push origin --delete vantar-pa-krediter` (allt i den finns då på main). `KREDITSPARR=av` först i kommandot släpper igenom en push, bara när Niclas sagt det.

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

## Innan du börjar en uppgift

Kör `git status` och `git branch --show-current`. Läs de filer uppgiften rör innan du ändrar dem. Rör bara det uppgiften gäller. Hittar du något annat som borde fixas: lägg det i kön med `node scripts/ko.mjs lagg "<vad>" --var <fil>`, gör det inte i samma commit.

## Kön

Kön ligger i KO.md och sköts av `scripts/ko.mjs`. Registret skrivs bara av skriptet; det Niclas vill ha gjort skriver han under Inkorg i KO.md, och `node scripts/ko.mjs inkorg` gör poster av raderna. KO.md står i .gitignore: den är arbetsläge, inte innehåll, och ska varken byta utseende med grenen eller krocka vid en sammanslagning.

En post tas med `starta`, som ställer relevansfrågorna och byter till grenen `ko/<id>` från main (eller till en gren du anger, som nattens). Den stängs med `klar`, som kör `npm run validera`, kräver att allt ligger i git på postens gren och vägrar när fler än två nya poster bär `[UR <id>]`: så många fynd ur en post betyder att roten inte hittades. En onödig post avförs med `stang` och ett underlag. Det som kräver Niclas blockeras med `blockera --behovs`.

Prio 1 görs nu, prio 2 i tur och ordning, prio 3 vilar tills ett annat jobb ändå ska ändra samma fil och kräver därför `--var`. `--drabbar lasare` ger prio 1 (en läsare av sajten ser felet), `--drabbar rigg` ger prio 3 (bara arbetssättet är drabbat). `node scripts/ko.mjs` utan argument visar alla kommandon, `npm run ko:prov` kör köns egna prov.

Kommer mycket på en gång, som en ny metod med kommentarer eller flera önskemål i ett meddelande (Niclas 2026-09-27: "Lätt att tappa bort vad du ska göra när det blir en massa nytt jobb"): lägg varje sak i kön med `lagg` innan arbetet börjar, också det som görs direkt, och stäm av mot `node scripts/ko.mjs lista` innan main pushas och innan svaret till Niclas skrivs. Det som väntar på något, som en uppladdning som ska ske med nästa metod, är en blockerad post med `--behovs`, så att den syns i listan och inte tas av en nattkörning.

## Innehåll

Poster skapas från mallen i respektive mapp: `_mall.md` för artiklar och böcker, `_mall.yaml` för metoder. Taggar och publikationer tas från registren i `src/data/`. Kör `npm run taggar` för att se vad som finns innan du väljer. En tagg får en egen sida först när något innehåll använder den. En post har minst två och högst fem taggar, och schemat stoppar annars. En ny tagg prövas alltid mot alla befintliga artiklar, böcker och metoder med `node scripts/taggar.mjs --forslag <id>`, och träffarna avgörs en och en; bygget stoppar en ny tagg som saknar `provad` (datumet för genomgången) i registret. Har en post redan fem taggar byts en ut bara när den nya är uppenbart bättre, det vill säga mer precis om vad posten handlar om, och då går den bredaste av de fem. Den andra taggen är aldrig en utfyllnad (Niclas 2026-10-03). En ny artikel, bok eller metod stoppas av `npm run validera` tills dess taggförslag är lästa och avgjorda: `node scripts/taggar.mjs --post <fil>` listar registrets taggar vars ord står i posten men som saknas, och posten skrivs sedan in med datumet i `src/data/taggprov.json`. Så sker det av sig självt också i en ny session.

Bilder läggs i `public/images/`. `npm run validera` krymper dem till sitt syfte, 480 pixlar breda och 1200 × 630 för en delningsbild, och gör ett PNG-foto till JPEG; ingen skalar för hand. Varje sida får ett eget delningskort med sin titel, som valideringen ritar; committa kortet med posten.

Ingresser och beskrivningar skrivs enligt STIL.md. De är Niclas röst utåt. Är du osäker på ton eller fakta: fråga, eller skriv ett förslag och markera det tydligt som förslag.

## Design och kod

KONCEPT.md beskriver målet. Utveckla iterativt: en sak i taget, testa i `npm run dev`, gör commit. Designtokens ligger i `src/styles/global.css`. Nya komponenter i `src/components/`. Håll HTML semantisk och tillgänglig. Inga tunga beroenden.

En källa, ingen drift: allt en läsare får (sidan, utskriften, lathunden, Word och PowerPoint) byggs ur metodens fil. Det enda som görs i förväg är delningskorten, lathundens pdf, som är lathunden i A4 liggande ur samma kod som PowerPoint-filen, sparad som pdf, och Word-lathundens textstorlek per sida, uppmätt i Word och Google Dokument, och `npm run validera` gör om dem automatiskt; bygget stannar om en gammal pdf eller ett saknat kort ändå pushas. Lägg aldrig in en fil som måste göras om för hand, och gör en rättning i formen i den gemensamma koden, inte i en enskild metod, så att den gäller alla metoder och nya automatiskt. Utskriften är sidans utskrift, och metodens pdf får läraren genom Spara som PDF. `metodprov.mjs --bilder` skriver ut sidan och lathunden med Chrome och kontrollerar dem.

Astro 7 är strikt med HTML. Stäng alla taggar. Lägg inte block-element i `<p>`. Skriv `{" "}` där mellanrum mellan inline-element behövs.

## Drift

Claude Code sköter driften direkt från riggen: GitHub med `gh`, Netlify med `netlify`, Brevo med `node scripts/brevo.mjs`, DNS hos Loopia med `python scripts/loopia.py`. Vad som finns hos varje tjänst, var inloggningarna ligger, vilka kommandon som fungerar och vad man gör när något är rött står i DRIFT.md. Hemligheter ligger aldrig i git och skrivs aldrig ut; `NETLIFY_AUTH_TOKEN` ska inte vara satt i skalet.

En inloggning som kräver webbläsaren (`gh auth login`, `netlify login`) startas i bakgrunden så att koden som ska klistras in syns i utdatan, och Niclas gör klickandet enligt INSTRUKTIONER.docx. Fastnar ett steg på att en människa måste göra det: skriv steget i INSTRUKTIONER.docx och NATTEN.md och gå vidare med nästa sak.

## Nattkörning

`/natt` arbetar igenom den körbara kön på en egen gren, en post i taget genom `starta` och `klar`, slår ihop grenen till main och pushar när valideringen är grön, och skriver rapporten till `NATTEN.md` i repots rot. Git ignorerar filen, och den skrivs över varje gång. Under natten tar Claude Code egna beslut i allt utom det som kräver Niclas: längre nyhetsbrev, personfakta och inloggningar som kräver webbläsaren. Allt som pushas till main mejlas prenumeranterna automatiskt, så bara färdigt innehåll lämnar utkastläget. Sådant blockeras i kön med en rad om vad som behövs, och steget skrivs in i INSTRUKTIONER.docx.

## Texterna

Alla kända texter av Niclas ligger i `underlag/texter/`, ett blad per text med fulltext och metadata, och `underlag/texter/register.json` är listan. `npm run texter` visar vilka som saknar post på sajten. En post skapas ur bladet med `/ny-artikel <slug>`: egen ingress, taggar ur registret, länk till originalet. Fulltexten kopieras alltid in i posten ur bladet och `heltext: true` sätts; Niclas besked 2026-09-24 gäller alla hans texter. Ett poddavsnitt eller en intervju där texten är någon annans får länk och egen beskrivning.

## Metoder ur underlag

Niclas lämnar metoder till stödundervisning som kompendier (docx och pdf) med en fast modell och lathundar (pptx, pdf). Hur en metod tas emot, görs om till YAML, provas, granskas av Codex och läggs in står i METODER.md, med de publicerade metoderna som förebild; det körbara flödet är `/ny-metod`. Underlagen ligger i `underlag/metoder/`, som git ignorerar eftersom repot är publikt.

## När du fastnar

Tre försök på samma sak räcker. Beskriv sedan vad du provat, vad du tror är fel och vad du behöver. Gissa inte fram fakta om Niclas, hans böcker eller hans artiklar. Gissa inte API-detaljer; leta upp dokumentationen eller fråga.
