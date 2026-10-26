# Planera: så får en metod planen, och så byggs modulen ut

Den här filen är arbetsgången för Planera insatsen: stegen i ordning, proven och agenternas uppdrag, hur fynden lagas och när planen är klar att publiceras (Niclas 2026-10-25: "skapa ett arbetsätt för hur en metod för denna modul. Vilka tester du kör och i vilken ordning", "reviderar löpande" och "Plock ut de som du anser är bra av allt du kört dig med att bygga tills dessa fem"). Planens fält, orden i dem och de automatiska proven står i METODER.md under Planera insatsen. Filen skrivs om efter varje omgång, och det som ändrades står sist under Ändringar.

## Två slags arbete

| Arbete | Exempel | Stegen |
|---|---|---|
| En metod får planen | En metod som ligger ute får planens fält, eller en ny metod kommer från riggen med dem | 1 till 6, 10 och 12 |
| Många metoder i omgångar | Riggen skriver planens fält i en omgång metoder efter en arbetsorder från sajten, och omgången går upp i en push när den är prövad (Niclas 2026-10-26: "Kör på din plan: Läsning, Ljudlek... En push i taget") | 1 till 6, 10 och 12 för varje metod i omgången, och sedan återkopplingen till riggen (nedan). Ändrar omgången modulen, som omgång 1 och 3 gjorde, gäller också raden under |
| Modulen ändras | En ny form av metod, en ny del i planen eller en rättning i koden, som alla metoder får | 1 till 6 och 9 till 12. Rör ändringen det läraren för in, datum, nycklar eller lagringen också 7, 8 och 8b, och 0 när läraren får se något nytt |

Innehållet i en metod prövas på den metoden. En ändring i modulen prövas på alla metoder som kan planeras, eftersom den gäller dem alla.

Planen syns på metodens sida, med knappen Planera insatsen och märket Beta, så snart metoden kan planeras och main pushas: det finns ingen annan spärr. Därför görs stegen 1 till 11 på en gren och en testversion, och pushen är steg 12. Märket Beta står så länge modulens version börjar med 0 (METODER.md under Versionerna).

## Stegen

| Steg | Vad du gör | Så här | Klart när |
|---|---|---|---|
| 0. Formen | När läraren får se något nytt i planen: två eller tre former från en Sonnet och en Opus, sedan väljer du och visar Niclas bilder innan något byggs (ARBETSSATT.md under Design och kod). Formen bygger på rötter i standarden och på metodens egna fält, och den räknar tryck för läraren i telefonen | Uppdraget `ide` | Niclas har sett bilderna och fått veta vad formen byter bort |
| 1. Metoden som rot och fälten | Metodens premisser, efter Metoden är roten nedan, och sedan planens fält efter tabellen Vad metoden behöver | Riggen skriver dem i leveransen (K-491); i en metod som ligger ute standardiserar du metoden och skriver in fälten | `npm run validera` stannar inte på `tidsschematsFel`, `varianternasFel`, `planensRamFel` eller `insatsplanFel` |
| 2. Valideringen | Hela valideringen, med planprovet | `npm run validera` | Grön, och raderna med ! är lästa |
| 3. Läs själv | Planen i telefonbredd som läraren läser den: förslaget, Före, en vecka med varje pass och Efter insatsen | `node scripts/skarmbild.mjs <adress> <bild> --mobil`, och hela texten med `node scripts/plantext.mjs <id>` | Inget ser fel ut och inget står två gånger |
| 4. Länkgranskningen | Det planen namnger men inte länkar, länkar som leder fel, begrepp som är länkade, och allmänna ord för en bestämd sak som läraren behöver, som kortet eller bubblorna, som ska bytas mot sakens namn (STIL.md under Hänvisningar) | `node scripts/plantext.mjs <id>`, sedan en agent per metod med uppdraget `lankgranskning` | Inga P1 kvar |
| 5. Testversionen | Ett utkast hos Netlify, utan bygge och byggkrediter | `node scripts/utkast.mjs --namn <namn>`, med ett nytt namn varje omgång | Adressen svarar |
| 6. Kalla testare | En lärare per metod som först får bara planen och sedan hela metoden | Uppdraget `kall-testare`, med en roll per metod | Testaren kan hålla pass 1 efter planen, och ingen P1 |
| 7. Användbarheten | En granskare som följer läraren från första besöket till efter insatsen, i telefon och på dator | Uppdraget `anvandbarhet` | Ingen P1 |
| 8. Buggjakten | Två jägare som ändrar allt och prövar att det som står stämmer | Uppdraget `buggjakt`, en Sonnet och en Haiku | Ingen P1 |
| 8b. Samma sak överallt | En provare som följer en vecka, ett datum, en skattning, ett pass och målet genom alla vyer: planen, veckan, diagrammen, sammanställningen, pdf:erna, texterna, åtgärdsprogrammet och kalendern, före och efter en ändring | Uppdraget `konsistens`, Opus. Först kontrollerar planprovet samma sak i koden (Spärren mot drift nedan) | Ingen P1 eller P2: samma sak heter och visar likadant överallt |
| 9. Codex | Granskning av koden i ändringen | Uppdraget `kodgranskning`, Codex med `gpt-6-astra` och xhigh i läsläge (METODER.md under Codex-granskningen) | Ingen P1 |
| 10. Laga | Fynden, efter Så lagas fynden nedan | | Inget känt fel kvar i det som ska upp (ARBETSSATT.md under Kön), och innehållsfrågorna till Niclas |
| 11. Verifieringen | En ny provare, som inte har sett sidan, prövar det som lagades på en ny testversion | Uppdraget `verifiering` | Ingen P1, och läraren kan använda planen med en grupp nästa vecka |
| 12. Uppladdningen | Kontroll före uppladdning, Google-provet för nya Word-filer, sammanslagning, push och deploykontroll | `node scripts/googleprov.mjs --andrade --mapp`, sedan ARBETSSATT.md under Uppladdning | Klart för publicering, nedan |

Steg 6 till 9 körs samtidigt, var och en i bakgrunden med sin egen webbläsare. Codex läser koden och arbetar medan agenterna prövar testversionen.

Efter pushen av en omgång går återkopplingen till riggen, efter METODER.md under Metodriggen. I en omgång är den en fil för omgången, `out/PLANERA-<n>-ATERKOPPLING.md` i riggen, med svaren på riggens frågor, det sajten ändrade i metoderna, standardens nya rötter, frågorna till riggen och lärdomarna. Sajtens färdiga filer läggs i `out/<slug>/metod.yaml`, som riggen tar in själv, och det som gäller nästa metod står också överst i `out/FRAN-SAJTEN.md`.

## Vad metoden behöver

Det här är det en metod behöver för att få planen, och det som sker av sig självt (Niclas 2026-10-25: "Någon slags info om vad metoden behöver för att få modulen som inte glöms bort mellan sessioner"). Varje rad hänvisar till regeln där den står och säger vad som stannar när något saknas, så att nästa session vet det utan att fråga.

| Del | Vad metoden behöver | Var regeln står | Det som stannar |
|---|---|---|---|
| Uppföljningen | En `tid` på varje rad, med orden i tabellen i METODER.md under Fälten i metodens fil, och `perElev` på en rad som görs med en elev i taget. Med en tid på varje rad kan metoden planeras (`planbar` i `src/lib/planbar.ts`), och sidan, knappen Planera insatsen och sakernas filer kommer då av sig själva | METODER.md under Fälten i metodens fil | `insatsplanFel` på en tid som standarden inte läser |
| Progressionen | Kolumnen Vecka eller Pass med standardens ord, `rubrik` när fokus är långt, och `taggar` när veckan ska visa bankens poster | METODER.md under Fälten i metodens fil | `insatsplanFel` på en vecka eller en tagg som inte går att läsa |
| Målet | Metodens övergripande mål, `mal.overgripande`, som varje metod har | METODER.md, tabellen under Modellen, raden Mål | Schemat på en metod utan mål, och `kortetsMalFel` på ett lektionskort med ett annat mål |
| Passet | Tidsschemat med delar och minuter, `tidsschema.varianter` när passet har andra delar eller tider vissa veckor, i vissa pass eller när det är kortare, `plan.passen` när passen i veckan skiljer sig åt, med rollens text som en rad ur metodens tabell (`ur`) eller ett ordagrant citat och `tabell` för ett pass som går till på ett eget sätt, och `plan.utan` för meningar i tidsschemats text om metodens sida | METODER.md under Tidsschemats varianter, under Planera insatsen, stycket som börjar "Passet står i rutan", och fälten | `tidsschematsFel` på passets tider i en mening, `varianternasFel` på en lathund eller ett lektionskort som säger varianten på eget sätt, `planensRamFel` på tider i planens text och en mening om metodens sida, och `insatsplanFel` på en tabell som metoden inte har och en `nar` som standarden inte läser |
| Före, justera, upprepa och stegen | `plan.fore`, `plan.justera`, `plan.upprepa` och `plan.stege` när metoden har sådant, med texterna som ordagranna citat ur metoden | METODER.md under Fälten i metodens fil | `planensCitatFel` på en mening som inte står så i metoden, och `insatsplanFel` på en stege i en progression som inte är i veckor |
| Nivåerna | `plan.nivaval` när metoden har nivåer att välja mellan, med en text som står i metoden, och `plan.enPerPass` när bankens poster tas en per pass | METODER.md under Fälten i metodens fil, och STIL.md under Stöd för ett val | `nivavaletsFel` på en metod med nivåer utan stöd eller med en för lång text, och `insatsplanFel` på en rubrik som metoden inte har |
| Namnen | Planens texter nämner bladen, korten, mallarna, testen, texterna och lektionerna med namnen som de står i metoden, så att de blir länkar | STIL.md under Hänvisningar | `insatsplanFel` (`olankadeSaker`) på ett namn som metoden inte har |
| Sakernas filer | Inget. Varje ram, vecka, räkneblad och mall som planen kan leda till får en egen Word-fil och pdf, och en knapp under sig på metodens sida | METODER.md under Utskriften, raden om knappen under en sak som planen kan leda till | `scripts/bankpdf.mjs` på en fil med fler sidor än regeln tillåter, och `scripts/planprov.mjs` på en sak som planen leder till utan knapp och på en fil utan knapp. En ny sorts sak, som kort att klippa, får sin regel i `src/lib/sakfiler.ts` och sin knapp i `Metod.astro`, för alla metoder på en gång |
| Word i Google Dokument | De nya Word-filerna prövas i Google | ARBETSSATT.md under Kontroll före uppladdning | `node scripts/googleprov.mjs --andrade --mapp` |
| Provningen | `npm run validera`, som kör planprovet på alla metoder som kan planeras, och planen läst i telefonbredd som en lärare läser den. En ny förmåga i modulen prövas också av kalla testare och buggjägare | Stegen ovan, och METODER.md under Proven | `scripts/planprov.mjs` |
| Versionen | En ny förmåga i modulen höjer versionen, och raden skrivs i tabellen i samma commit | METODER.md under Versionerna | `scripts/planprov.mjs` på en version som tabellen inte har |

## Metoden är roten

Planen tar varje premiss ur metodens egna fält, och metodens sida, Word-filerna, lathunden, lektionskortet, planen och kalendern läser samma rot (Niclas 2026-10-25: "Så att införa denna modul kräver ibland att metoden standardiseras och såddas samt fixad med", och "Det blir som en standard och delad rot mellan metod och modul"). Vad det betyder för metodens fil står i METODER.md under Fälten i metodens fil och Tidsschemats varianter. Steg 1 går igenom metoden så här, och en ny form i modulen gör det för alla metoder med formen:

| Steg | Vad du gör | Så här |
|---|---|---|
| Lista premisserna | Det planen säger om metoden: passets delar och tider, också vissa veckors, veckorna och stegen, uppföljningens tider, gruppens storlek, målet och materialets namn | Metodens fil och `node scripts/plantext.mjs <id>` |
| Hitta roten | Var premissen står i metoden. Ett fält som metodens sida visar är roten. Står den bara i en mening, eller med egna ord i lathunden eller på lektionskortet, har den ingen rot än | Metodens fil och `src/data/lektionskort/` |
| Avgör | Säger två ställen olika, avgör vilket som gäller, med metodens egna ord som belägg, och rätta det andra. Läslistor 2026-10-25: tidsschemats förberedelse och avslutning tog fram boken varje vecka, men passrutinen, lathunden och lektionskortet sa från vecka 4, så raderna fick "från vecka 4" | Beslutet står i svaret till Niclas |
| Standardisera | Saknas ett fält får metoden ett i standarden och modellen, som sidan, Word, lathunden och planen läser, för alla metoder med samma form (METODER.md under När modellen växer). Ett eget fält i `plan` för något som metoden säger är en andra rot, och används inte | Som tidsschemats varianter |
| Så | Pröva det nya fältet mot alla metoder: vilka har samma premiss i löptext? Skriv in fältet där det stöder metoden, med Såddprovets tre frågor (METODER.md under De centrala sakerna) | En genomgång av alla metoders texter med ett skript, som `tidsschematsFel` gjorde för passets tider |
| Spärra | Fältets spärr i standarden stoppar en metod som säger premissen på eget sätt, så att riggen och sajten prövar samma | `npm run validera` |
| Berätta | Det som ändrades i metodens text står i svaret till Niclas, och regeln går till metodriggen | Meddelandet till Metodrigg-sessionen |

## Från fynd till rot

Ett fynd lagas där det kommer ifrån, inte där det syns (Niclas 2026-10-25: "Men se till att du inte bara gör handgrepp på dem. Lös roten och hur dessa löses även på kommande metoder"). Varje fynd får svar på frågorna här innan något lagas, och svaren står i commit-meddelandet eller i svaret till Niclas.

| Fråga | Det som söks |
|---|---|
| Vilket slags fel är det? | Samma sak på två ställen som säger olika (drift), en premiss utan rot i metoden, en nyckel som byter betydelse när något ändras (en elev på en rad, ett pass på en dag), eller ett fall som ingen hade tänkt på |
| Varför kunde det hända? | Leta tills svaret är en regel som saknas, inte ett ställe som var fel: två funktioner som räknar samma sak, en text som modulen läser som data, en identitet som bara bygger på platsen. K-515: Läslistors vecka 1–3 stod i en mening, så sidan och kalendern valde delarna var för sig. K-516: elevlistan visste vem en rad var bara genom raden |
| Var är roten? | En funktion i standarden, ett fält i metoden eller en regel för en nyckel. Lagningen görs där och gäller alla metoder |
| Hur stannar det nästa gång? | En spärr som stoppar bygget när felet kommer tillbaka, prövad åt andra hållet: lägg in felet och se provet stanna |
| Vilket fall saknades? | Fallet står i Scenarierna nedan med provet som prövar det |
| Vad behöver riggen veta? | En regel för metodens fil går till metodriggen samma kväll |

## Scenarierna

Det som händer en lärare med en grupp under en insats, på ett ställe. Planprovet stannar när ett prov i tabellen saknas, så att varje fall prövas vid varje validering, och mallarna för jägarna, steget Samma sak överallt och verifieringen får tabellen av sig själva (`{{scenarier}}` i `scripts/planera/uppdrag.mjs`). Ett nytt fall ur ett fynd står här med sitt prov i samma commit som lagningen.

| Fall | Det som händer | Provet |
|---|---|---|
| S1 | Planen börjar mitt i en vecka eller en lördag | `start på en lördag börjar nästa vecka med metodens vecka 1`; `start en onsdag ger 17 pass` |
| S2 | Röda dagar och lov, också före starten och efter att planen är gjord | `påskens dagar faller bort`; `lov i valen flyttar planen`; `veckan före är lov: före första passet veckan före lovet`; `kalenderveckorna: veckor i följd ihop, och ett lov bryter följden`; `åtgärdsprogrammet: ett lov mitt i ett steg står inte med i stegets veckor`; `ett lov går bara att lägga efter det som har förts in` |
| S3 | Planen går över nyår | `över nyåret med vecka 53 som lov`; `kalenderveckornas spann, också över nyår` |
| S4 | En vecka tas om | `upprepad vecka ger 21 pass`; `texten till åtgärdsprogrammet följer den upprepade veckan`; `en vecka tas inte om när något är infört i en senare vecka`; `Ta bort upprepningen går inte när något är infört i den upprepade veckan, och ett tomt värde låser inget` |
| S5 | Ett pass flyttas eller ställs in, och Ångra | `flyttat pass`; `inställt pass ger 17 pass`; `ångrat inställt pass`; `sista passet efter datum när det sista passet flyttas före ett annat` |
| S6 | Gruppen börjar högre upp i en stege | `en stege som börjar på vecka 3`; `metodens veckor som planens`; `stegen: rutan med veckans fokus säger inte metodens vecka`; `stegen: variantens mening och metodens texter med planens vecka`; `kalendern skriver metodens veckor som planens`; `Börja på står under Före med formulärets steg`; `läsningen före låser inte Börja på`; `en bock låser Börja på, under Före och i formuläret`; `läsningen före låser inte Börja på när starten flyttas`; `ett resultat efter start låser Börja på direkt`; `ett låst Börja på ändrar inte planen` |
| S7 | Passet ser annorlunda ut vissa veckor | `stegen: passet i vecka 1 har variantens tider`; `stegen: kalendern visar passet som sidan, med ett tidsschema`; `metodens sida säger varianten med standardens mening` |
| S8 | Läraren sätter tider, olika för olika dagar | `olika tider olika dagar`; `kalenderfilen med tider har ett pass per händelse med klockslaget`; `en ny dag utan tid sägs i beskedet` |
| S9 | Ett namn rättas, också efter en paus | `ett rättat namn behåller elevens skattningar`; `en paus med raden tom behåller eleven`; `en paus mitt i ett namn byter inte elev`; `ett rättat namn sägs i beskedet, med Ångra`; `en rad som töms en stund behåller namnet i lärarens mening` |
| S10 | En elev slutar och en ny kommer på samma rad | `en ny elev på en annan elevs rad är en ny elev`; `sidan frågar om det är samma elev`; `en obesvarad fråga står kvar`; `Samma elev ger Nora Beas skattningar`; `Ångra tar tillbaka listan och frågan`; `en borttagen rad och ett nytt namn: läraren väljer bland de borttagna`; `en borttagen elev kan bara vara en av de nya`; `Ångra tar tillbaka båda frågorna`; `frågan kommer inte igen efter svaret Ny elev` |
| S11 | En elev tas bort och kommer tillbaka | `en borttagen rad ger inte nästa elev dess id`; `Ångra lägger tillbaka elevlistan`; `Bea får tillbaka det som förts in när namnet skrivs igen`; `en elev som togs bort tidigare känns igen och är ingen fråga`; `namnen ur en text skyddar de elever som står kvar` |
| S12 | För många elever och samma namn två gånger | `en trettonde elev och samma namn två gånger sägs under listan, och gruppens storlek` |
| S13 | Två grupper i samma metod | `två planer för metoden`; `pågående insatser: planerna i sina veckor, och :2 för en andra plan för samma metod` |
| S14 | Samma plan i två flikar | `en bock i en annan flik syns i den här` |
| S15 | En webbläsare som inte sparar | `utan lagring visas förslaget och beskedet` |
| S16 | Planen på en annan dator, med länken eller kopian | `planen ur länken visas utan namn och utan uppföljning`; `kopian öppnas med allt`; `en kopia som har ändrats för hand öppnas utan fel` |
| S17 | Sidan öppnas i en apps egen webbläsare | `vägen ut på iPhone: Safari, med planen`; `i en apps webbläsare: felsökningen säger namnet och vad sidan känner igen` |
| S18 | Helgen före en ny vecka | `på söndagen gäller rutan nästa pass och dess vecka` |
| S19 | Insatsen är slut: utvärdering och förlängning | `efter insatsen: sidan visar Efter insatsen`; `förläng med två veckor`; `förlängningen flyttar inte resultatet efter`; `förlängningen flyttar inte avstämningen`; `en förlängd insats har kvar avstämningens vecka` |
| S20 | Filerna som laddas ner, var och en med eget namn | `filnamnen på det som laddas ner`; `kalenderfilens namn säger vad, metoden och datumet`; `planens fil heter plan, gruppen, metoden och datumet`; `förslaget har Spara planen också längst ned` |
| S21 | Elevernas namn lämnar aldrig webbläsaren | `ett namn som lämnar listan följer inte med texten som kopieras medan läraren skriver`; `sammanställningen kopieras utan namn`; `inga namn i statistikens händelser`; `länken till planen utan namnet` |
| S22 | Dagens pass är gjort, och en vecka längre fram | `nästa pass som inte är bockat, med de bockade före det`; `ett bockat pass ger nästa pass i rutan, och rutan säger det`; `utan bocken gäller rutan passet igen`; `en vecka som inte har börjat har streckade ringar och inga bockar`; `en vecka som inte har börjat säger när den går att skatta, utan skalan` |
| S23 | Insatsen avslutas en eller två veckor tidigare, en viss dag | `en insats som avslutas tidigare slutar med sitt sista pass`; `avsluta onsdagen: fredagens pass i veckan är struket`; `avslutet följer dagen för det valda passet, också med ett flyttat pass`; `avslutet: passen behåller sina nummer och roller, också när ett flyttat pass före sista passet stryks`; `passens nummer i en text, med luckan när ett pass är struket`; `slutet följer med när starten flyttas`; `ett slut som inte stryker något gäller inte`; `avslutet i en mening`; `utvärderingen med avslutet och anledningen`; `avstämningen i en insats som avslutades före den finns inte`; `en avstämning i en vecka som planen inte längre har står inte i sammanställningen`; `länken bär slutet`; `avsluta: formuläret under lägesraden väljer dagens pass och säger vad som stryks`; `avsluta: förvalet står kvar när planen ritas om i en annan vecka`; `avsluta: texten följer det valda passet`; `avsluta: formuläret står kvar med det valda passet och anledningen när planen ritas om`; `efter insatsen: uppföljningen den här veckan står i rutan och rubriken`; `utan Följ insatsen: raden överst har Avsluta insatsen efter sista passet`; `utan Följ insatsen: Avsluta insatsen avslutar, och Ångra avslutet står överst`; `utan Följ insatsen: Ångra avslutet öppnar insatsen igen, utan utvärderingens förlängning`; `avsluta: planen slutar med det valda passet, och anledningen är utvärderingens mening`; `avsluta: veckan, planens ruta och texten till åtgärdsprogrammet säger avslutet`; `förlängning efter ett avslut går genom planens egna veckor`; `resultat i veckor som planen inte har visas inte`; `sista passet går före ett eget nummer`; `avsluta: texten till åtgärdsprogrammet följer en ändrad anledning`; `avsluta: ett lov före slutet flyttar slutet med passen`; `avsluta: ett tömt fält ger ingen anledning`; `avsluta: kalenderfilen har bara passen till och med det sista`; `avsluta: planens fil bär slutet och beslutet`; `avsluta: planen öppnas ur filen avslutad`; `pdf:erna och texten efter ett avslut: avslutet med anledningen, perioden till sista passet och ingen avstämning` |
| S24 | Avslutet märks och går att ångra | `veckans knappar står synliga, och Avsluta insatsen i lägesraden överst`; `lägesraden: en plan som inte har börjat är kommande, med första passet och utan knapp`; `avsluta: det strukna står överstruket i veckan, remsan och veckolistan`; `avsluta: rutan med bocken, läget överst med Ångra avslutet och planen grå`; `avsluta i utvärderingen: rutan med bocken, läget överst och planen grå`; `avsluta i utvärderingen: en gång till öppnar insatsen igen`; `avsluta: Ångra avslutet tar tillbaka planen`; `Dina insatser: läget som ett märke och i tur och ordning`; `Dina insatser: de avslutade hopfällda sist, den senast avslutade först`; `Dina planer för metoden: de tre senast avslutade och de äldre hopfällda` |
| S25 | Två veckor efter sista passet | `insatsen är slut efter sista passets dag, också när läraren har avslutat den samma dag`; `planens sista dag är uppföljningen efter, och avslutet av sig själv räknas från den`; `ett beslut som tas bort lämnar planen avslutad av sig själv`; `avsluta med dagens pass: passet står kvar i rutan och Nu på veckan`; `insatsen avslutas av läraren eller av sig själv två veckor efter sista passet`; `en insats som läraren har öppnat igen avslutas av sig själv först efter nästa sista pass`; `efter insatsen: passen är slut, och planen säger när den avslutas av sig själv`; `Dina insatser: en plan vars utvärdering återstår säger det`; `två veckor efter sista passet är planen avslutad av sig själv`; `Ångra avslutet öppnar planen igen för det sista passet` |
| S27 | Läraren byter dagar när insatsen har börjat | `ett byte av dagar gäller från bytets dag, och passen före står kvar`; `länken bär bytet av dagar, och dagarna i en mening säger det`; `passdagarna före, på och efter bytets dag`; `bytet av dagar: från ett datum står dagarna före kvar, samma dag ändras bytet, och tillbaka utan en annan dag tar bort det`; `byte av dagar: det hållna passet står kvar med bocken, och de nya dagarna gäller från i dag`; `byte av dagar: tillbaka till dagarna före tar bort bytet`; `ett byte på startdagen och ett flyttat pass som hölls före bytet står kvar`; `ett pass i dag på en dag som väljs bort igen samma dag står kvar med sitt nummer och sin tid, och dagarna efter ändras inte`; `ett flyttat pass i dag på en dag som väljs bort igen står kvar med sitt nummer`; `ett pass som flyttades till efter bytet behåller sitt nummer`; `ett flyttat pass som har hållits står kvar när dagarna går tillbaka`; `ett pass som flyttades till en senare dag kommer inte tillbaka när dagen läggs till igen`; `period i pass: ett fast pass som ställs in tar ingen plats`; `en flytt efter ett byte ändrar inte numret på ett pass som har hållits`; `period i pass: ett flyttat pass i dag står kvar när en dag till läggs till samma dag`; `ett flyttat första pass håller kvar startveckan, och ett hållet flyttat pass behåller sitt nummer`; `ett hållet pass som flyttades till bytets dag behåller sitt nummer när en ny dag kommer före det`; `ett senare byte ändrar inte numren på pass som har hållits`; `period i pass: de fasta passen räknas först efter ett byte`; `passens längd räknas med dagarna före ett byte` |
| S28 | En elev tas bort medan planen är öppen i två flikar | `namnen som texterna tvättar bort: eleverna och de som har stått i listan`; `en borttagen elev sparas med planen, och lärarens mening står kvar`; `en elev som togs bort i en annan flik följer inte med texten som kopieras`; `ett nytt efternamn sparar det tidigare namnet`; `Ångra efter ett nytt efternamn sparar namnet som lämnar listan`; `Ta bort elevernas namn tömmer också namnen som har stått i listan`; `ett utkast från en annan flik sparas inte som ett tidigare namn`; `ett utkast som läses in när sidan öppnas är färdigt och sparas när det tas bort`; `en plan som öppnas under Dina planer har inga utkast, och namnet sparas när det tas bort` |
| S26 | Planerna och filerna från 0.2.7 öppnas i en ny version | `planens format: provfilerna från 0.2.7 finns`; `planens format: en fil ur en nyare version öppnas och säger det, och en annan fil är ingen plan`; `planens format: planen ur lagringen från 0.2.7 öppnas med allt`; `planens format: planen ur 0.2.7 laddas ner i den här versionens format`; `planens format: filen från 0.2.7 öppnas på en annan dator med allt`; `planens format: en fil för en annan metod öppnas på metodens sida med beskedet`; `planens format: planerna ur en nyare version öppnas och sidan säger det`; `planens format: ett långt val kapas inte`; `planens format: en lagring från en nyare version skrivs inte över` |
| S29 | Gruppens nivå väljs i formuläret eller i passet | `stödet för nivåvalet`; `varje nivåval i metoderna har Stöd för valet med metodens text och en länk`; `bankens poster en per pass: passet visar sitt problem på gruppens nivå, med länk` |

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
| `verifiering.md` | En lärare som inte har sett sidan, efter lagningarna | Opus, omkring 150 kommandon | idag, forsta, andra, metoder, adress, port, tak, svar, och lagat: det som lagades, sagt som läraren märker det |
| `ide.md` | En Sonnet och en Opus när en ny form ska väljas, innan något byggs | Sonnet och Opus | fraga_kort, fraga, varfor, niclas, innehall, bilder, metoder, adress, svar |

En agent som använder sidan får en egen webbläsare. Starta `node scripts/lasare.mjs serve <port> --bilder <mapp>` i bakgrunden, en port per agent från 9641, och vänta tills `node scripts/lasare.mjs <port> adress` svarar. Agenten (general-purpose) får bara en kort uppmaning: läs uppdraget och gör exakt det, styr webbläsaren med kommandona i uppdraget, läs inga andra filer, och skriv svaret dit uppdraget säger. Stoppa webbläsaren när agenten är klar. Codex startas med prompten på stdin: `codex exec -m gpt-6-astra -c model_reasoning_effort=xhigh --sandbox read-only --skip-git-repo-check -o <svar.md> - < <prompt.md>`, och loggen läses direkt efter starten, eftersom kvoten tar slut ibland. Codex kan granska det som inte är committat: `git diff <bas>` visar arbetsträdet, och prompten säger det, så att granskningen går medan valideringen gör det.

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
| P2 | Lagas före uppladdningen när det rör det som laddas upp, också när det fanns före omgången. I kön bara det som rör något annat (ARBETSSATT.md under Kön) |
| Samma del ger nya fynd i varje granskning | Laga inte fall för fall. Leta efter principen som gör hörnfallen möjliga och byt den, och be sedan om en smal granskning av just bytet: högst två eller tre fynd, bara P1 som går att återskapa (Lärdomar nedan) |
| Metoden eller modulen | Avgör var felet sitter (Niclas 2026-10-26: "Du får förtydliga saker i metoderna om det behövs ... Så du måste ibland adjudicera när modul eller metod är det som behöver något"). Säger metoden något otydligt, förtydligas metoden: sakens namn, var saken står, vilken vecka något gäller, en mening på rätt plats, eller tider som metoden redan säger i en mening som en variant. Saknar modulen en rot som flera metoder behöver, får standarden en liten rot. Välj det enklaste som gör planen rätt, med en spärr i stället för en gissning ("Enkelhet före än mer plotter") |
| Nytt innehåll | Det metoden inte säger, som tider den saknar, en ny övning eller ett annat val, skriver sajten inte. Frågan går till riggen i återkopplingen eller till Niclas i NATTEN.md, med testarens ord och ett förslag, och stoppar inte uppladdningen. Omgång 3: Problemlösnings första pass säger att Planera tar längre tid, men metoden har inga tider för det |
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
| Planprovet: motorn, adresserna, knappen under varje sak, scenarierna och sidan i Chrome | `scripts/planprov.mjs` i valideringen |
| Inget känt fel kvar från länkgranskningen, testarna, användbarheten, jägarna, Codex eller verifieringen i det som laddas upp, också ett fel som fanns före omgången. Ett fel i något annat än modulen och omgångens metoder går i kön och sägs i svaret till Niclas (ARBETSSATT.md under Kön) | Svaren i `underlag/prov/<sak>/` |
| Word-filerna ryms i Google Dokument | `node scripts/googleprov.mjs --andrade --mapp` |
| Versionen står i tabellen under Versionerna i METODER.md | Planprovet |
| Planerna i webbläsaren och filerna från 0.2.7 och framåt öppnas med allt (Planens fil och lagringen ovan) | Planprovet med provfilerna i `scripts/planera/filer/` |
| Det som bara går att pröva på en riktig telefon, som kalenderfilen, kopian och utskriften, är sagt som oprövat till Niclas, en gång | Svaret till Niclas |
| Niclas har sagt ladda upp. För betan på fem metoder sa han det 2026-10-24: "När du är fullt nöjd, ladda upp detta på sajten", och för omgångarna till alla metoder 2026-10-26: "En push i taget" | Hans ord |

Efter uppladdningen: `node scripts/deploykoll.mjs`, öppna planen för varje ny metod på den riktiga adressen, och skriv i NATTEN.md vad som är ute och vad som är oprövat. Ett brev om en ny del av planen skrivs med `/utskick` och går ut när Niclas säger det.

## Planens fil och lagringen

Det läraren har sparat i webbläsaren, och planen som fil från Ladda ner planen, går alltid att öppna i en senare version av modulen, med allt det har (Niclas 2026-10-25: "bakåtkompatibilitet med äldre json filer. Så nya itterationer funkar med den och lägger in data som finns och varnar bara när data inte finns i den gamla om det behövs", "Det ska in i hur modulen är gjord och byggs. I värsta fall ska en konvertering ske mot gamla filer om det blir stor drift", och "från och med den som är uppe nu ska det bara bakåtkompatibilitet från den och framåt"). Det gäller från 0.2.7.

| Regel | Så |
|---|---|
| Ett format | Lagringen, `{ v, planer }` under nyckeln `insatser`, och filen, `{ typ, v, modul, sparad, plan }`, har samma plan och samma version, `PLANFORMAT`. `lasPlaner` och `lasPlanfil` i `src/scripts/insatser-lagring.ts` läser dem och `skrivPlaner` och `planfilen` skriver dem; ingen annan kod gör det |
| Ett fält läggs till | Det får sitt standardvärde när det saknas (`rensaPlan` och `rensaFoljd`), och formatet behåller sin version |
| Ett fält byter betydelse eller tas bort | Formatet får en ny version och `KONVERTERINGAR` en konvertering från versionen före (`konverteraPlan` kör dem i ordning). Konverteringen säger det som saknades när läraren behöver veta det, och beskedet efter Öppna en nedladdad plan visar det. Blir skillnaden stor räknar konverteringen om planen ur valen |
| Länken | `lasVal` hoppar över det den inte känner igen. En del av länken som byter betydelse får ett nytt namn, aldrig en ny betydelse |
| En nyare version | En fil eller lagring ur en nyare version öppnas med det sidan känner igen, och beskedet ber läraren ladda om sidan. Är lagringen ur en nyare version skriver sidan inget i den (`lagringenArNyare` i `skrivPlaner`), så att det som den nyare versionen sparade och den här inte känner till står kvar, och sparfelet säger varför (Codex 2026-10-25) |
| Provfilerna | `scripts/planera/filer/` har filen och lagringen som varje version som ändrar formatet skrev dem, från 0.2.7: `plan-0.2.7.json` och `lagring-0.2.7.json`. En ny version av formatet lägger till sina, och de gamla tas aldrig bort. Planprovet öppnar alla, i motorn och i sidan, och prövar att allt som förts in kommer med och skrivs tillbaka i den nya versionens format |

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
| Metodens vecka, när en stege börjar högre upp | `metodveckan`, och i metodens texter `veckornaIPlanen` |
| Veckorna i en rubrik, "vecka 1–2", och i början av en tabellrad, "7–8 Gruppen väljer modell" | `veckorI` och `radensVeckor` |
| Veckans pass och datumordningen | `veckansPass`, `veckansDagar`, `efterDatum` och `iDatumordning` |
| Ett datum | `datumText`, `dagOchManad`, `dagText`, `dagKort`, `spannKort`, `datumspann` och `arDatum` |
| Dagens datum | `idagLokalt` i `src/scripts/insatser-lagring.ts` |
| Veckodagarna | `VECKODAGAR` och `veckodagKort` |
| Ett klockslag | `minuterAv`, `klockslag`, `plusMinuter`, `minuterISpann`, `tidText` och `tidsspann` |
| Passets delar som platser i passet, när de följer på varandra från minut 0 | `delarIFoljd` |
| Talen | `talAv`, `talText`, `talIRegex`, `allaAntal` och `ORDNINGSTAL` |
| Texten | `stor`, `liten`, `mening`, `utanPunkt`, `decimal`, `tvasiffrigt`, `esc`, `skyddaRegex`, `rentText`, `forstaLedet`, `kortnamn`, `meningarna`, `slutarMedPunkt`, `allaTexter` och `forstaOrdet` |
| Eleverna i elevlistan | `sammaElev` |
| Passet på sidan och i kalendern, med tidsschemats varianter för vissa veckor, vissa pass och ett kortare pass | `passetsBeskrivning`, `delensTid`, `variantensMening`, `variantensNar`, `variantenFor`, `tidsschematsFel` och `varianternasFel` |
| Var ett pass står i planen, som planens rader och varianterna läser det | `passetsLage`, `passetTraffas` och `narensVikt` |
| Ett pass med egen tabell, i tabellernas former | `tabellensDelar` |
| Metodens saker i en text, och lärarens och elevernas egna saker som inte länkas | `sakdelar`, `olankadeSaker` och `EGNA_SAKER` |
| Metodens texter i planen | `planensInledning`, `planensTexter`, `visadeTexter`, `planensRamFel`, `rollensRad`, `rollensVeckor`, `VECKANS_RAD` och `planensCitatFel` |
| Stödet för nivåvalet | `nivavaletsFel` och `NIVAVALETS_LANGD` |
| Filnamnen på det som laddas ner | `filnamnet` |
| Knapparnas namn för planen som fil | `PLANKNAPPAR` |
| Uppföljningen | `uppfoljningensNamn`, `uppfoljningensRad`, `uppfoljningensRader` och `resultatText` |
| Skattningen | `skattningenText`, `elevensVarden`, `skattadeVeckor`, `skattningenMittI` och `riktningText` |
| Nästa pass | `nastaPass`, och `nastaObockade` för rutan med nästa pass, som hoppar över det som är bockat |
| Avslutet och utvärderingen | `avslutetText`, `utvarderingenText` och `forlangdaVal` |
| Insatsen slut och avslutad, av läraren eller av sig själv två veckor efter planens sista dag | `insatsenSlut`, `insatsenAvslutad`, `planensSistaDag`, `AVSLUTANDE` och `AVSLUTAS_EFTER` |
| Ett pass ur sitt nummer, och passens nummer i en text, när numren har en lucka efter ett avslut | `passetMedNr`, `hogstaPassnr` och `passnummerText` |
| Dagarna, och ett byte av dagar mitt i insatsen | `bytDagar`, `passdagar`, `rentaFore`, `dagarText` och `passensMinuter` |
| Elevernas namn i texterna som lämnar webbläsaren | `elevernasNamn` och `utanNamn` |
| Hur många elever elevlistan rymmer | `ELEVLISTANS_LANGD` |
| En text som läraren skriver eller klistrar in, med en gräns | `rentText` och `kapaVidOrd` |
| Insatsens läge och ordning i Dina insatser | `statusAv`, `STATUSNAMN` och `iTurOrdning` i `src/scripts/insatser-lagring.ts` |
| Planens format, lagringen och filen | `PLANFORMAT`, `KONVERTERINGAR`, `konverteraPlan`, `lasPlanfil` och `planfilen` i `src/scripts/insatser-lagring.ts` |
| Passen och besluten | `passensRad`, `passensLage`, `narvaronText`, `beslutText` och `BESLUTEN` |
| Diagrammet | `stapelnsKant` och `prickarna` |
| Målet | `malText`, `malensMening` och `kortetsMalFel` |
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
| En mening i metoden som säger passets tider, veckor eller delar är data, inte text. Den får ett fält i metoden, som sidan och planen läser, och spärren stoppar meningen | K-515: Läslistors vecka 1–3 stod i en mening i tidsschemat, i lathunden och på lektionskortet med var sina ord, och planen hade en egen kopia. Sidan och kalendern valde delarna var för sig |
| Det som sparas om en elev, ett pass eller en vecka behöver en nyckel som håller när det runt den ändras. Pröva vad som händer när det nyckeln bygger på byts: raden får ett annat namn, passet en annan dag, veckan ett lov före sig | K-516: elevlistan visste vem en rad var bara genom raden, så en ny elev fick den gamlas skattningar. Nu avgör förnamnet, och läraren får frågan när det inte räcker |
| Ett värde som visas på flera ställen har en funktion, också en fils namn | K-519: alla sammanställningar hette lika |
| Provverktyget lämnar inte ett fält och följer inte fokus som en webbläsare gör. Ett fynd som bara verktyget framkallar lagas där det går ut, som texten som kopieras, aldrig genom att skriva om det läraren har skrivit medan hen skriver | 2026-10-25: namnen tvättades ur lärarens meningar medan hen skrev, efter ett fynd där verktyget kopierade utan att lämna elevlistan, och en rad som tömdes en stund tappade namnet i meningen för gott |
| En regel om ett pass gäller också ett pass som har flyttats eller bockats i förväg: pröva regeln med provets flyttade pass | Rutan med nästa pass hoppade först bara över dagens bockade pass, och provet hade flyttat pass 8 till dagen efter |
| Det som inget senare får skriva om sparas när det händer, och räknas inte fram ur nuläget | K-546 2026-10-25: så länge passens nummer räknades om ur planen som den var nu, hittade Codex ett nytt hörnfall i bytet av dagar i var och en av nio granskningar, för att en senare flytt eller ett senare byte skrev om historiken. När bytet sparade numren när det gjordes tog felen slut |
| Det som sparas medan läraren skriver är ett utkast tills hen är klar, och en annan flik läser det som utkast | K-537: ett halvt namn, "Be", som en flik sparade medan läraren skrev, blev ett tidigare namn i en annan flik och tvättade bort ordet "be" ur texterna |
| En granskning av en lagning är smal: det som ändrades, högst två eller tre fynd, bara P1 som går att återskapa | En bred granskning efter varje lagning gav nya hörnfall längre bort, och arbetet tog aldrig slut |
| Planen visar passets form, och det som är veckans eller passets eget innehåll nås med ett tryck från passet: veckans ram med det läraren visar och lyssnar efter, passets problem, nivåns rad | De kalla testarna i omgång 1 och 3: planen bar undervisningens form men inte dess innehåll, när länkarna ledde till början av materialet och passet inte sa vilket problem det hade |
| En spärr på ett sätt att flytta det som är infört gäller alla sätt som flyttar samma sak, ur samma funktion: lovet, Upprepa veckan och Ta bort upprepningen | Codex i omgång 3: lovet var låst efter det som var infört, men en upprepning flyttade fortfarande skattningarna till en annan vecka i metoden. Nu läser alla tre `lovetLast` |
| Kör de snabba proven före hela valideringen: instruktionsprovet, krokprovet, planprovet med `--utan-sida` och `npx astro check`, omkring en minut tillsammans | Omgång 3: valideringen stannade fyra gånger på sådant som de snabba proven hade sett, och varje varv tog åtta till tio minuter |

## Ändringar

| Datum | Vad |
|---|---|
| 2026-10-25 | Första versionen, ur provningen av Planera 0.1 och 0.2 på fem metoder: länkgranskningen, testarna i två steg, användbarheten, buggjakten, Codex och verifieringen, med mallarna i `scripts/planera/` |
| 2026-10-26 | Genomgången efter omgång 1 och 3 (K-558, Niclas samma morgon): omgångarnas och modulens steg efter vad de behövde, återkopplingen till riggen i en omgång, metoden eller modulen och nytt innehåll under Så lagas fynden, fallen ur omgångarna under Scenarierna, och tre lärdomar |
| 2026-10-26 | Genomgången inför utrullningen till alla metoder (K-555): steg 0, formen, med designfrågans regel i ARBETSSATT.md; arbetet i omgångar med riggen; lagningen och villkoren för publicering efter regeln om kända fel; och lärdomarna från 0.2.9 |
| 2026-10-25 | Länkgranskningen letar också efter allmänna ord för en bestämd sak, efter Niclas regel samma dag: det som behövs namnges och länkas, eller har en knapp för att ladda ner |
| 2026-10-25 | Arbetssättet efter K-515, K-516 och K-519 (K-518; Niclas samma dag: "Lös roten och hur dessa löses även på kommande metoder och hur det görs in i arbetssättet för modulen också"): Metoden är roten, med steg 1 som går igenom metodens premisser och standardiserar metoden; Från fynd till rot; Scenarierna, prövade av planprovet och givna till jägarna; och en P1 i något som redan ligger ute |
| 2026-10-25 | Efter provningen av 0.2.6: en rot räknas som prövad när proven kör den, inte när namnet står i provet; spärren läser också en funktion med return och texter som tecken, och inte listor i kommentarer (Codex); pdf:ernas text prövas i planprovet; läsarens webbläsare ser ut som en mobil i telefonläget, så att pdf:erna hämtas och steg 8b kan läsa dem |
| 2026-10-25 | Spärren mot drift läser också dubbletterna och att rötterna har prov, och tabellen under den har alla rötter (K-509) |
| 2026-10-25 | Spärren mot drift i planprovet, steget 8b Samma sak överallt med uppdraget `konsistens`, och kodgranskningens punkt om drift, efter att elevens diagram och planen namngav veckorna olika (Niclas: "fundera på arbetssättet ... och hur detta eller liknande saker hade kunnat hittas") |
