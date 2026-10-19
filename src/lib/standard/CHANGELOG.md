# Ändringar i standarden

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
