# Ändringar i standarden

## 0.11.0, 2026-10-25

- `plan.js`, Planera 0.2 (sajtens K-494, efter fem kalla testare som inte kunde hålla första passet bara efter planen): `tolkaPassen` och `passetsRoller` för planens `passen` (platsen i veckan eller numret i insatsen, det mest bestämda först), `forvaldLangd` (förvalet når progressionens sista steg när det ryms i perioden), `planvecka` och valet `borja` för en stege som börjar högre upp, `stegUtanfor` för de steg planen inte når, och planens `fore` (veckan före första passet, förbi ett lov, med uppföljningen före som vecka 0) och `efterSteg` (progressionens rad `Efter vecka N`, som inte tar någon vecka). `perElev` på uppföljningens rader är ett av planens fält. Kalenderfilen har det som görs före första passet över hela veckan före och passet i beskrivningen, och texten till dokumentationen tar bort undertitelns årskurser också i formen "för F–6" och skriver en rad som heter efter insatsens vecka som "Vecka 4 i insatsen". Efter användbarhetsprovet, fem kalla testare, två buggjägare och Codex samma natt: uppföljningen efter N veckor räknas från sista passet och vanlig efter från veckan med det sista passet, också när passen i planens sista veckor är inställda; en rad efter insatsen heter "Efter insatsen" i texterna; och `saker.js` hittar ett långt namn på -ning i sina bestämda former, så att "Kartläggningen" leder till Kartläggning. Efter länkgranskningen samma natt: huvudorden matta och intyg (räknemattans ark, kursintyget), och ett namn i flera ord som börjar med ett huvudord får det första ordets andra former, så att "en mall med fyra rutor" leder till Mallen med fyra rutor.

## 0.10.0, 2026-10-24

- `plan.js`, Planera insatsen (sajtens K-489): planmotorn, med ordlistan för uppföljningens `tid`, progressionens veckor och pass, röda dagar, ISO-veckor, upprepade veckor, lov, flyttade och inställda pass, länken, texten till dokumentationen, kalenderfilen och sammanställningen när läraren följer insatsen. Niclas: "Planera insatsen gillar jag", och "bygg EN som du testar på flera olika sätt att den funkar. dvs en standard". Riggen kan pröva att en metod går att planera med `planFel`. `utanPlanensFalt` ger metodens fil utan planens fält, så att de inte ger ett nytt datum, gör om lathunden eller prövas mot Word. Efter granskningarna av Codex och Opus och Niclas önskemål samma dag: insatsens mål (`plan.mal`, `val.mal`, `malText`, `rentMal`) som skattningen gäller, passens tider (`val.tider`, `rentaTider`, `passetsTid`, `tidText`, `tidsspann`, `dagarText`) med klockslag i kalenderfilen, texten till åtgärdsprogrammet med vad eleven arbetar med vecka för vecka (`dokumentationstext`), närvaron som ett val (`foljd.narvaro`), bockade pass i stället för pass som blev av, gruppens skattningar kvar när eleverna kommer efteråt, och `utanNamn`, som byter elevlistans namn mot "en elev" i texterna som kopieras. Efter Codex granskning av koden och två buggjägare samma dag: första och sista passet efter datum också när ett pass flyttas, ett spann av pass i uppföljningen är alla passen i det, passens längd ur klockslagen (`passensMinuter`, `minuterText`), en största längd som länken och förlängningen delar (`LANGSTA`), resultatens nyckel med tillfällets datum så att ett resultat står kvar på sin dag (`elevensResultat`), en mening utan beslut med i texten, kalenderfilen med en händelse per pass också utan klockslag, och `rensaFoljd`, som rensar det läraren har fört in till det sidan kan visa. Efter den andra buggjägaren: en plan som börjar efter veckans sista valda dag börjar veckan efter (`forstaMandagen`), sammanställningen räknar de bockade bland passen som har varit (`gjordaVarit`), en dag utan tid säger "utan tid", och veckor över nyår skrivs "vecka 52 till vecka 1". `saker.js` hittar metodens saker i en text och säger vilka namn som ingen sak har (sajtens K-493).

## 0.9.0, 2026-10-20

- `BILDTEXT`, `meningarI` och `bildtextFel`: bildtexten under en bild är en till tre meningar och högst 250 tecken och börjar inte med "Bilden", och ett blad har sitt textalternativ i `alt` (sajtens K-486, STIL.md under Bildtexter). Niclas: "Tror du behöver en stringens för bildtext. Dvs vad bildtext har och hur lång den får vara", och om innehållet: "Sådant som bilden eller kortet i sig inte kan berätta, eller som förtydligar bildens roll i metoden väldigt kort". Riggen prövar samma sak före leveransen, och sajten stannar bygget.

## 0.8.0, 2026-10-19

- `faktaIFastForm`, `gruppensElever`, `tidensVeckotakt` och `periodensLangd`: faktarutans grupp, tid och period i fast form för metodbankens kort, "2–6 elever", "30 min", "3–5 pass/vecka", "6–8 veckor" (sajtens K-465). Niclas: "Skulle vilja ha en bättre standard på dessa för alla ... att det står tydligt och lika". Ett fält som inte går att läsa ger null, och sajten stoppar metoden.

## 0.7.0, 2026-10-19

- `tidensMatt`, `arIntensiv`, `arLektioner` och `mojligaUpplagg`, med uppläggens taggar och gränser: metodens upplägg ur faktarutans tid, så att sajten och riggen prövar samma sak (sajtens K-463). En metod har exakt ett upplägg, `intensivtraning` (högst 30 minuter, 3–5 dagar i veckan), `lektionsupplagg` (minst 30 minuter, alltid vid 40 eller mer) eller `aterkommande-pass` (högst 40 minuter, en eller två gånger i veckan); där tiden rymmer två avgör innehållet. Niclas: "Intensivträning är något som sker 30min eller kortare 3-5 dagar i veckan för att höja en förmåga".

## 0.6.1, 2026-10-19

- `fohlinHanvisningar` läser fler former (granskningen samma dag): Fohlin sist av två ("Wilson och Fohlin (2025)"), Lisa Fohlin som medförfattare ("Fohlin, Fohlin och Wilson (2020)"), "se" eller "jfr" före och sidan efter i en parentes ("(se Fohlin och Wilson, 2023, s. 45)", länken är författarna och året) och "&" som "&amp;" i HTML. Titeln i en källförteckning går inte över ett meningsslut. `medforfattare` är alla namn utom ett Fohlin.

## 0.6.0, 2026-10-19

- `fohlinHanvisningar`: hänvisningarna till Niclas Fohlins böcker i en text, i en parentes ("(Fohlin och Wilson, 2023)"), med året efter ("Fohlin och Wilson (2025)") och i en källförteckning ("Fohlin och Wilson, Skriv! (utkommer 2027)"), med platsen, medförfattarna, året och titeln, så att sajten och riggen gör dem till länkar till boken (sajtens K-459). Niclas: "Vill även att ALLA där det står Fohlin eller hänvisas till Fohlin är länk till boken den hänvisar till. Fohlin 2027 ska hänvisas till generella https://niclasfohlin.se/bocker sidan".

## 0.5.0, 2026-10-19

- `fastaAntal`: de fasta antalen av en databas poster (från fem) och grupper (från två) i en text, som "tjugofem texter", "fem på varje nivå" eller "tre teman" (sajtens K-450). Niclas: "Hela tanken är att databaserna ska kunna växa och allt då hänger med utan att du måste kontrollera varenda liten text i metoderna", och "Försök hålla antal och annat ur lathundar och filer. Eftersom det inte blir bra skalbarhet". Texten säger var posterna finns, och sidorna som räknar dem visar talen; sajten och riggen stannar på ett fast antal.

## 0.4.0, 2026-10-18

- `Post.sida` är valfri: en post ur en databas utan metod, som databasens matteproblem (sajtens K-425), har ingen egen sida. Finns sidan prövas den som förut.
- `Post.losning` för en post utan sida är postens pdf med lösningsförslaget, med version. En post med sida har lösningsförslaget på sidan, som förut.
- `Post.id` kan vara ur titeln, som `glassen`, för en post utan metod. Formen är densamma: a–z, 0–9 och bindestreck, och inget upptaget led.

## 0.3.0, 2026-10-18

- `Post.taggar` i stället för `Post.tagg`: en post kan ha flera innehållstaggar, som en lästext har två slag av frågor mellan raderna (Ta fram en lästext, sajtens K-419). `postFel` kräver minst en tagg när databasen har taggar och bara sådana.
- `Post.bild` är valfri: lästexterna har inga bilder. Finns bilden prövas adressen och textalternativet som förut.
- Taggarna kan vara metodens egna slag i stället för ämnets (INNEHALLSTAGGAR), när metoden har en tabell över dem; sajten läser dem ur metoden.

## 0.2.1, 2026-10-18

- `Post.utskrift`: slaget `med` är problemet med lösningsförslaget när banken har lösningsförslag (metodriggens blad, sajtens K-423), och med lärarens sida annars. Formen är densamma; bara beskrivningen ändras.

## 0.2.0, 2026-10-18

- `INNEHALLSTAGGAR` och `innehallstaggar`: innehållstaggarna, databasens sista nivå efter nivån och slaget (Niclas 2026-10-18). Matematikens fem ur Lgr22.
- `postensRad`: postens egen första mening, kortad vid ett ord.
- `Post` och `PostUtskrift` (JSDoc och `index.d.ts`): postens form för Ta fram-sidorna, med lösningsförslaget och utskrifternas källfiler.
- `postFel` och `databasFel`: kontrollerna som listor med fel.
- `hamtplan`: posternas egna pdf:er eller källfilen en gång, det som är minst att hämta (K-424).

## 0.1.0, 2026-10-18

- `slugAv`: en funktion för alla adresser som görs ur namn, i stället för fyra (`bank.ts`, `bladmaterial.ts`, `nivamaterial.ts`, `ovrigt.ts`), som gjorde olika med é, è och ü (K-416). Tecknen över bokstäverna tas bort med Unicodes uppdelning, så samma svar som förut för svenska bokstäver och é, è och ü, och andra accenter blir bokstaven i stället för ett bindestreck.
- `UPPTAGNA_LED`: de reserverade leden på ett ställe, med `problem`, `texter` och `faktatexter` för Ta fram-sidorna.
