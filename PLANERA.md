# Planera: så får en metod planen, och så byggs modulen ut

Den här filen är arbetsgången för Planera insatsen: stegen i ordning, proven och agenternas uppdrag, hur fynden lagas och när planen är klar att publiceras (Niclas 2026-10-25: "skapa ett arbetsätt för hur en metod för denna modul. Vilka tester du kör och i vilken ordning", "reviderar löpande" och "Plock ut de som du anser är bra av allt du kört dig med att bygga tills dessa fem"). Planens fält, orden i dem och de automatiska proven står i METODER.md under Planera insatsen. Filen skrivs om efter varje omgång, och det som ändrades står sist under Ändringar.

## Två slags arbete

| Arbete | Exempel | Stegen |
|---|---|---|
| En metod får planen | En metod som ligger ute får planens fält, eller en ny metod kommer från riggen med dem | 1 till 6, 10 och 12 |
| Modulen ändras | En ny form av metod, en ny del i planen eller en rättning i koden, som alla metoder får | 1 till 12 |

Innehållet i en metod prövas på den metoden. En ändring i modulen prövas på alla metoder som kan planeras, eftersom den gäller dem alla.

Planen syns på metodens sida, med knappen Planera insatsen och märket Beta, så snart metoden kan planeras och main pushas: det finns ingen annan spärr. Därför görs stegen 1 till 11 på en gren och en testversion, och pushen är steg 12. Märket Beta står så länge modulens version börjar med 0 (METODER.md under Versionerna).

## Stegen

| Steg | Vad du gör | Så här | Klart när |
|---|---|---|---|
| 1. Fälten | Metodens fält för planen, efter tabellen Vad metoden behöver nedan | Riggen skriver dem i leveransen (K-491); i en metod som ligger ute skriver du in dem | `npm run validera` stannar inte på `insatsplanFel` |
| 2. Valideringen | Hela valideringen, med planprovet | `npm run validera` | Grön, och raderna med ! är lästa |
| 3. Läs själv | Planen i telefonbredd som läraren läser den: förslaget, Före, en vecka med varje pass och Efter insatsen | `node scripts/skarmbild.mjs <adress> <bild> --mobil`, och hela texten med `node scripts/plantext.mjs <id>` | Inget ser fel ut och inget står två gånger |
| 4. Länkgranskningen | Det planen namnger men inte länkar, länkar som leder fel, begrepp som är länkade, och allmänna ord för en bestämd sak som läraren behöver, som kortet eller bubblorna, som ska bytas mot sakens namn (STIL.md under Hänvisningar) | `node scripts/plantext.mjs <id>`, sedan en agent per metod med uppdraget `lankgranskning` | Inga P1 kvar |
| 5. Testversionen | Ett utkast hos Netlify, utan bygge och byggkrediter | `node scripts/utkast.mjs --namn <namn>`, med ett nytt namn varje omgång | Adressen svarar |
| 6. Kalla testare | En lärare per metod som först får bara planen och sedan hela metoden | Uppdraget `kall-testare`, med en roll per metod | Testaren kan hålla pass 1 efter planen, och ingen P1 |
| 7. Användbarheten | En granskare som följer läraren från första besöket till efter insatsen, i telefon och på dator | Uppdraget `anvandbarhet` | Ingen P1 |
| 8. Buggjakten | Två jägare som ändrar allt och prövar att det som står stämmer | Uppdraget `buggjakt`, en Sonnet och en Haiku | Ingen P1 |
| 8b. Samma sak överallt | En provare som följer en vecka, ett datum, en skattning, ett pass och målet genom alla vyer: planen, veckan, diagrammen, sammanställningen, pdf:erna, texterna, åtgärdsprogrammet och kalendern, före och efter en ändring | Uppdraget `konsistens`, Opus. Först kontrollerar planprovet samma sak i koden (Spärren mot drift nedan) | Ingen P1 eller P2: samma sak heter och visar likadant överallt |
| 9. Codex | Granskning av koden i ändringen | Uppdraget `kodgranskning`, Codex med `gpt-6-astra` och xhigh i läsläge (METODER.md under Codex-granskningen) | Ingen P1 |
| 10. Laga | Fynden, efter Så lagas fynden nedan | | P1 lagade, P2 lagade eller i kön, P3 och innehållsfrågor till Niclas |
| 11. Verifieringen | En ny provare, som inte har sett sidan, prövar det som lagades på en ny testversion | Uppdraget `verifiering` | Ingen P1, och läraren kan använda planen med en grupp nästa vecka |
| 12. Uppladdningen | Kontroll före uppladdning, Google-provet för nya Word-filer, sammanslagning, push och deploykontroll | `node scripts/googleprov.mjs --andrade --mapp`, sedan ARBETSSATT.md under Uppladdning | Klart för publicering, nedan |

Steg 6 till 9 körs samtidigt, var och en i bakgrunden med sin egen webbläsare. Codex läser koden och arbetar medan agenterna prövar testversionen.

## Vad metoden behöver

Det här är det en metod behöver för att få planen, och det som sker av sig självt (Niclas 2026-10-25: "Någon slags info om vad metoden behöver för att få modulen som inte glöms bort mellan sessioner"). Varje rad hänvisar till regeln där den står och säger vad som stannar när något saknas, så att nästa session vet det utan att fråga.

| Del | Vad metoden behöver | Var regeln står | Det som stannar |
|---|---|---|---|
| Uppföljningen | En `tid` på varje rad, med orden i tabellen i METODER.md under Fälten i metodens fil, och `perElev` på en rad som görs med en elev i taget. Med en tid på varje rad kan metoden planeras (`planbar` i `src/lib/planbar.ts`), och sidan, knappen Planera insatsen och sakernas filer kommer då av sig själva | METODER.md under Fälten i metodens fil | `insatsplanFel` på en tid som standarden inte läser |
| Progressionen | Kolumnen Vecka eller Pass med standardens ord, `rubrik` när fokus är långt, och `taggar` när veckan ska visa bankens poster | METODER.md under Fälten i metodens fil | `insatsplanFel` på en vecka eller en tagg som inte går att läsa |
| Målet | `plan.mal`, eller ett lektionskort med ett mål | METODER.md under Fälten i metodens fil | `insatsplanFel` på en metod utan båda |
| Passet | Tidsschemat med delar och minuter, och `plan.passen` när passen i veckan skiljer sig åt, med `tabell` för ett pass som går till på ett eget sätt | METODER.md under Planera insatsen, stycket som börjar "Passet står i rutan", och fälten | `insatsplanFel` på en tabell som metoden inte har och på en `nar` som standarden inte läser |
| Före, justera, upprepa och stegen | `plan.fore`, `plan.justera`, `plan.upprepa` och `plan.stege` när metoden har sådant | METODER.md under Fälten i metodens fil | `insatsplanFel` på en stege i en progression som inte är i veckor |
| Namnen | Planens texter nämner bladen, korten, mallarna, testen, texterna och lektionerna med namnen som de står i metoden, så att de blir länkar | STIL.md under Hänvisningar | `insatsplanFel` (`olankadeSaker`) på ett namn som metoden inte har |
| Sakernas filer | Inget. Varje ram, vecka, räkneblad och mall som planen kan leda till får en egen Word-fil och pdf, och en knapp under sig på metodens sida | METODER.md under Utskriften, raden om knappen under en sak som planen kan leda till | `scripts/bankpdf.mjs` på en fil med fler sidor än regeln tillåter, och `scripts/planprov.mjs` på en sak som planen leder till utan knapp och på en fil utan knapp. En ny sorts sak, som kort att klippa, får sin regel i `src/lib/sakfiler.ts` och sin knapp i `Metod.astro`, för alla metoder på en gång |
| Word i Google Dokument | De nya Word-filerna prövas i Google | ARBETSSATT.md under Kontroll före uppladdning | `node scripts/googleprov.mjs --andrade --mapp` |
| Provningen | `npm run validera`, som kör planprovet på alla metoder som kan planeras, och planen läst i telefonbredd som en lärare läser den. En ny förmåga i modulen prövas också av kalla testare och buggjägare | Stegen ovan, och METODER.md under Proven | `scripts/planprov.mjs` |
| Versionen | En ny förmåga i modulen höjer versionen, och raden skrivs i tabellen i samma commit | METODER.md under Versionerna | `scripts/planprov.mjs` på en version som tabellen inte har |

## Agenterna och uppdragen

Mallarna står i `scripts/planera/`, med verktygets kommandon i `verktyget.md`, som fylls i där mallen säger {{verktyget}}. `node scripts/planera/uppdrag.mjs <mall> <ut.md> namn=värde …` fyller i en mall och stannar på en lucka; ett värde som börjar med @ läses ur en fil. Uppdraget och svaret läggs i `underlag/prov/<sak>/`, som git ignorerar.

| Mall | Vem | Modell och tak | Det som fylls i |
|---|---|---|---|
| `lankgranskning.md` | En granskare per metod, utan webbläsare: läser planens text ur `scripts/plantext.mjs` mot metodens platser | Opus | titel, id, svar |
| `kall-testare.md` | En lärare per metod, i två steg: först bara planen, sedan hela metoden | Opus eller Sonnet, omkring 120 kommandon | metod, id, adress, port, roll, tak, svar |
| `anvandbarhet.md` | En granskare för alla metoderna, djupast i två | Opus, omkring 130 kommandon | nytt, metoder, djupast, adress, port, tak, svar |
| `buggjakt.md` | Två jägare på olika modeller | Sonnet och Haiku, omkring 110 kommandon | nytt, forsta, andra, adress, port, tak, svar |
| `konsistens.md` | En provare som följer samma sak genom alla vyer | Opus, omkring 130 kommandon | nytt, forsta, andra, adress, port, tak, svar |
| `kodgranskning.md` | Codex i läsläge | `gpt-6-astra`, xhigh | version, bakgrund, bas, nytt, leta |
| `verifiering.md` | En lärare som inte har sett sidan, efter lagningarna | Opus, omkring 150 kommandon | idag, forsta, andra, metoder, adress, port, tak, svar |
| `ide.md` | En Sonnet och en Opus när en ny form ska väljas, innan något byggs | Sonnet och Opus | fraga_kort, fraga, varfor, niclas, innehall, bilder, metoder, adress, svar |

En agent som använder sidan får en egen webbläsare. Starta `node scripts/lasare.mjs serve <port> --bilder <mapp>` i bakgrunden, en port per agent från 9641, och vänta tills `node scripts/lasare.mjs <port> adress` svarar. Agenten (general-purpose) får bara en kort uppmaning: läs uppdraget och gör exakt det, styr webbläsaren med kommandona i uppdraget, läs inga andra filer, och skriv svaret dit uppdraget säger. Stoppa webbläsaren när agenten är klar. Codex startas med prompten på stdin: `codex exec -m gpt-6-astra -c model_reasoning_effort=xhigh --sandbox read-only --skip-git-repo-check -o <svar.md> - < <prompt.md>`, och loggen läses direkt efter starten, eftersom kvoten tar slut ibland.

Rollerna som gav mest, ur kvällarna 2026-10-24 och 2026-10-25:

| Roll | Det den hittade |
|---|---|
| En lärare per metod med en konkret grupp: årskurs, elevernas behov, aldrig använt metoden, planerar i telefonen | Att planen inte bar passet (0.1), och vad i metoden planen saknade |
| En som bara planerar: lov, kalendern och texten till åtgärdsprogrammet, och vill inte fylla i mer än hen måste | Att sparandet och kalendern stod före valen |
| En som följer en grupp i tiden med `datum`: bockar, skattar, avstämningen och efter insatsen | Datum, bockar och skattningar som hamnade fel när planen ändrades |
| En med bråttom och två grupper, ovan vid digitala verktyg | Det som var svårt att hitta och två knappar som gjorde samma sak |
| En jägare som försöker få sidan att gå sönder, med det konstiga: lördagar, lov alla veckor, tecken som `<b>` | En start på en lördag, och det som förts in som försvann |

## Så lagas fynden

| Vad | Hur |
|---|---|
| Pröva påståendet | Ett fynd är ett påstående tills det är prövat. Återskapa det i en vanlig webbläsare eller i koden, och läs agentens bild. Verktyget visar inte webbläsarens utskrift och följer inte en ny flik, så ett fynd om en utskriftsknapp, ett lektionskort eller en länk prövas i en vanlig webbläsare innan det räknas |
| P1 | Lagas före uppladdningen |
| P2 | Lagas samma omgång när det är litet, annars i kön med `node scripts/ko.mjs lagg … --ur <post>` |
| P3 och innehållet | Det metoden säger, som en text, en vecka eller ett pass, ändras inte på egen hand. Frågan går till Niclas i NATTEN.md eller i svaret, med testarens ord och ett förslag |
| Lagningen görs i modulen | En lagning görs i modulen och gäller alla metoder, aldrig `if (metod === …)`. En metods eget innehåll ändras i dess fält |
| En spärr | Ett fel som kan komma tillbaka får en spärr i planprovet, som knappen under varje sak och versionen i tabellen. Spärren prövas åt andra hållet: lägg in felet och se att provet stannar |
| Granskare som säger emot varandra | Välj det som gör det enklare för läraren och säg varför, som när användbarhetsprovet ville ha checklistan ensam och Codex visade att den tappade förberedelser |
| Niclas egna val | Ett val han har gjort byts inte bort utan att han får veta det först |
| Sedan | Steg 2 igen, och steg 11 när omgången hade en P1 |

## Klart för publicering

Planen för en metod, eller en ny version av modulen, är klar att ladda upp när allt i tabellen stämmer.

| Villkor | Prövat av |
|---|---|
| `npm run validera` är grön, och raderna med ! är lästa | Valideringen |
| Planprovet: motorn, adresserna, knappen under varje sak och sidan i Chrome | `scripts/planprov.mjs` i valideringen |
| Ingen P1 kvar från länkgranskningen, testarna, användbarheten, jägarna, Codex eller verifieringen | Svaren i `underlag/prov/<sak>/` |
| Word-filerna ryms i Google Dokument | `node scripts/googleprov.mjs --andrade --mapp` |
| Versionen står i tabellen under Versionerna i METODER.md | Planprovet |
| Det som bara går att pröva på en riktig telefon, som kalenderfilen, kopian och utskriften, är sagt som oprövat till Niclas, en gång | Svaret till Niclas |
| Niclas har sagt ladda upp. För betan på fem metoder sa han det 2026-10-24: "När du är fullt nöjd, ladda upp detta på sajten" | Hans ord |

Efter uppladdningen: `node scripts/deploykoll.mjs`, öppna planen för varje ny metod på den riktiga adressen, och skriv i NATTEN.md vad som är ute och vad som är oprövat. Ett brev om en ny del av planen skrivs med `/utskick` och går ut när Niclas säger det.

## Spärren mot drift

Ett värde eller en text som visas på flera ställen har en funktion, en rot, och sidan, pdf:erna, texterna som kopieras och texten till åtgärdsprogrammet hämtar det därifrån (Niclas 2026-10-25: "Standardisera och försök alltid härleda en sak som ex v. nr eller datum till EN funktion. Skapa inte drift i modulen", och samma dag: "Centralisera och till en rot ... Inte ha kopierade koder på olika ställen"). Rötterna står i standarden (`src/lib/standard/plan.js`, `saker.js` och `text.js`), och det som bara webbläsaren kan veta i `src/scripts/insatser-lagring.ts` och `src/scripts/webblasaren.ts`. Planprovet stannar på tre sätt, med fil och rad:

| Provet | Vad det hittar | Hur det vet |
|---|---|---|
| Rötterna har prov | En funktion i tabellen nedan som inte finns, eller som planprovet inte prövar | Det läser tabellen här, letar efter funktionen i rötterna och efter ett prov av den, också i kanterna som nyår och en vecka som tas om |
| Mönstren | En vecka, ett datum, en veckodag, ett klockslag, stor bokstav, HTML-skyddet, namnets första led, talen i ord eller datumordningen som en fil skriver på egen hand | `DRIFT` i `scripts/planprov.mjs`, med funktionen som ska användas |
| Dubbletterna | Samma kod på två ställen, minst 25 tecken mellan två filer och 50 i samma fil; samma lilla funktion med andra namn; och samma lista av ord, också förkortad ("Mån" och "måndag") | Det jämför koden utan att veta vad den gör, så det hittar också det ingen har tänkt på |

Proven gäller filerna i `MODULENS_FILER`, också standardens `index.js`. Sidans prov följer en vecka genom planens lista och elevens diagram, pdf:ernas text prövas mot rötterna, och steg 8b följer samma sak genom alla vyer som läraren ser dem.

| Sak | Roten |
|---|---|
| Kalenderveckan | `kalendervecka`, `kalenderveckor` och, för skärmläsare, `kalenderveckaUtskriven` |
| Veckan i planen | `planveckan`, `planveckanKort`, `gangen`, `veckansNamn` och `planveckansNamn` |
| Metodens vecka, när en stege börjar högre upp | `metodveckan` |
| Veckorna i en rubrik, "vecka 1–2" | `veckorI` |
| Veckans pass och datumordningen | `veckansPass`, `veckansDagar`, `efterDatum` och `iDatumordning` |
| Ett datum | `datumText`, `dagOchManad`, `dagText`, `dagKort`, `spannKort`, `datumspann` och `arDatum` |
| Dagens datum | `idagLokalt` i `src/scripts/insatser-lagring.ts` |
| Veckodagarna | `VECKODAGAR` och `veckodagKort` |
| Ett klockslag | `minuterAv`, `klockslag`, `plusMinuter`, `minuterISpann`, `tidText` och `tidsspann` |
| Talen | `talAv`, `talText`, `talIRegex`, `allaAntal` och `ORDNINGSTAL` |
| Texten | `stor`, `liten`, `mening`, `utanPunkt`, `decimal`, `tvasiffrigt`, `esc`, `skyddaRegex`, `rentText`, `forstaLedet` och `kortnamn` |
| Uppföljningen | `uppfoljningensNamn`, `uppfoljningensRad`, `uppfoljningensRader` och `resultatText` |
| Skattningen | `skattningenText`, `elevensVarden`, `skattadeVeckor` och `riktningText` |
| Passen och besluten | `passensRad`, `passensLage`, `narvaronText`, `beslutText` och `BESLUTEN` |
| Diagrammet | `stapelnsKant` och `prickarna` |
| Saker med nummer, "Bildserie 2–6" | `sakspann` |
| Planens adress | `planensAdress` i `src/scripts/insatser-lagring.ts` |
| En apps egen webbläsare | `webblasaren` och `vagenUt` i `src/scripts/webblasaren.ts` |

En ny sak som visas på flera ställen får sin rot och sitt prov i samma commit, och står i tabellen här; skrivs den på ett känt sätt får den också sitt mönster i `DRIFT`. En ny fil i modulen står i `MODULENS_FILER`. Säger spärren att samma kod står två gånger: lägg koden i en funktion, i standarden när fler än en fil behöver den, och använd den på båda ställena.

## Lärdomar

| Lärdom | Varför |
|---|---|
| Låt testaren först få bara planen och sedan hela metoden | Steg 1 visar vad planen bär ensam, steg 2 vad den saknar. Alla fem testarna av 0.1 svarade "delvis" först där |
| Ge agenterna ett högre tak när metodens sida är lång, omkring 120 till 150 kommandon | Testarna av betan tog 100 till 170 |
| Ladda aldrig upp en ny testversion på samma adress medan en agent arbetar; ge den ett nytt namn | Agenten prövar annars två versioner utan att veta det |
| Ändra inte `src/lib/metod.ts` för planen | Filen ingår i lathundarnas kontrollsumma, och en ändring gör om alla lathundars pdf (2026-10-24: regeln planbar flyttades till `src/lib/planbar.ts`) |
| En ny fil i repot får sin krok i samma commit | Krokprovet stannar valideringen direkt annars |
| Skriv skript med Write, aldrig i en heredoc | Snedstreck försvinner, och `\n` blir riktiga radbrytningar |
| Ett datum i ett prov står fast, och en ny regel om tid prövas i en vecka som har börjat och i en som inte har det | Bocken från veckans måndag (Niclas 2026-10-25) ändrade två prov |
| Fråga Codex om det som ändrats, med en stängd lista över det nya och det att leta efter | En öppen fråga ger en stor granskning som tar längre tid |
| Saknar ett namn länk fast saken finns: se att texten står bland de texter planen letar namn i (`visadeTexter` i `src/lib/insatsplan.ts`), och att namnets form finns (`sakensFormer` i standarden) | Länkgranskningen 2026-10-25: tidsschemats inledning och gruppens text låg utanför listan, och räknemattans och kursintyget saknade sina former |
| En länk till en fil prövas som fil, en länk till en sida som sida | Planprovet läste lektionskortets pdf som en sida och stannade |
| Ett namn som gör checklistan eller uppföljningen längre kan tippa lathundens fjärde sida, där båda står i en spalt som i flera metoder redan är full. Mät spalten före valideringen: hämta `/stodundervisning/<id>-lathund.pptx` ur förhandsservern och läs raderna med ! i dess logg. Flytta hellre en del av en punkt till en annan punkt än att göra en punkt en rad längre | K-502: Seriesamtals spalt hade 0,007 tum till godo, och namnen sköt ut upphovsraden i Textsamtals pdf |
| GoatCounter räknar besökare och inte händelser: samma händelse två gånger från samma webbläsare räknas en gång. Det som ska räknas flera gånger i samma webbläsare får egna namn | Pågående insatser 2026-10-25: en lärare med två grupper i samma metod räknades som en, så den andra planen heter `pagar:2` |
| Leta efter kopior med en maskin, inte med ögonen: samma kod, samma lilla funktion och samma lista på två ställen i modulen | 2026-10-25: en skanning utan kunskap om koden hittade 62 kopior, som beslutens text och raden om bockade pass på sidan och i pdf:en, talen i ord i sex tabeller och gruppens storlek läst på två sätt. Ingen av dem hade hittats av proven som prövar en vy i taget. Nu är det spärren Dubbletterna, och varje rot i tabellen under Spärren mot drift har ett prov |
| Pröva en sak genom alla vyer, inte varje vy för sig: samma vecka, samma datum och samma skattning ska heta och visa likadant överallt. Ett värde som visas på flera ställen får en funktion i standarden innan något använder det | 2026-10-25: elevens diagram skrev v. 45 till v. 50 där planen sa vecka 1 till 6. Användbarheten, de kalla testarna och buggjakten prövade varje vy för sig och såg det inte, och tre sätt att skriva en vecka hade vuxit fram i koden. Nu finns Spärren mot drift, steg 8b och kodgranskningens punkt 6 |
| Ett namn som är ett vanligt ord länkas bara som titel, med stor bokstav mitt i en mening | "multiplikation" blev annars en länk till Övningsblad: Multiplikation |

## Ändringar

| Datum | Vad |
|---|---|
| 2026-10-25 | Första versionen, ur provningen av Planera 0.1 och 0.2 på fem metoder: länkgranskningen, testarna i två steg, användbarheten, buggjakten, Codex och verifieringen, med mallarna i `scripts/planera/` |
| 2026-10-25 | Länkgranskningen letar också efter allmänna ord för en bestämd sak, efter Niclas regel samma dag: det som behövs namnges och länkas, eller har en knapp för att ladda ner |
| 2026-10-25 | Efter provningen av 0.2.6: en rot räknas som prövad när proven kör den, inte när namnet står i provet; spärren läser också en funktion med return och texter som tecken, och inte listor i kommentarer (Codex); pdf:ernas text prövas i planprovet; läsarens webbläsare ser ut som en mobil i telefonläget, så att pdf:erna hämtas och steg 8b kan läsa dem |
| 2026-10-25 | Spärren mot drift läser också dubbletterna och att rötterna har prov, och tabellen under den har alla rötter (K-509) |
| 2026-10-25 | Spärren mot drift i planprovet, steget 8b Samma sak överallt med uppdraget `konsistens`, och kodgranskningens punkt om drift, efter att elevens diagram och planen namngav veckorna olika (Niclas: "fundera på arbetssättet ... och hur detta eller liknande saker hade kunnat hittas") |
