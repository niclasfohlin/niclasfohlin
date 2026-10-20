# Stil

Så här skrivs text som ligger på sajten: ingresser, presentationer, metodtexter, om-sidan och nyhetsbrev. Reglerna gäller också kod-kommentarer och rapporter till Niclas.

Niclas har en fullständig skrivmanual, "Att skriva som Niclas Fohlin". Klistra in den under rubriken Skrivmanual längst ner. Tills dess gäller sammanfattningen här.

## Grundton

Direkt och konkret. Korta meningar. Svenska. Texten öppnar i en person, en scen eller en konkret bild och landar i något läsaren kan göra eller en fråga läsaren kan bära med sig. Det viktigaste står först.

Språket ska ge läsaren möjlighet att handla själv. Skriv vad man gör, inte att något är viktigt. Undvik generiska värmefraser och tomma förstärkningar.

## Det som inte används

Inga punktlistor i löptext på sajten. Är något strukturerat: tabell. Inga tankstreck som skiljetecken; använd punkt, komma eller kolon. Inte konstruktionen "inte X, utan Y" och inga radade kontraster. Inga fetstilade nyckelord mitt i stycken, inga emojier, inga rubriker som "Sammanfattningsvis". Inga ord som "genuint" eller "ärligt talat".

Inget bristspråk om elever. Skriv "elever i läs- och skrivsvårigheter", aldrig "svaga elever". Skriv vad undervisningen gör, inte vad eleven saknar.

## Fakta och källor

Forskning refereras som parentescitat: (Författare, årtal). En källa som inte går att verifiera stryks. Inga påhittade siffror, årtal eller titlar. Varifrån fakta om Niclas kommer står i CLAUDE.md under Det här gör bara Niclas.

När en text bemöter en motståndare: erkänn först det som är rimligt i motpartens position, kritisera sedan.

## Hänvisningar

En hänvisning till en sida som sajten har är en länk dit (Niclas 2026-10-19: "Känns konstigt att inte hänvisa direkt till en sida när sajten faktiskt har den ... En hänvisning till ett verktyg ska leda till länken. Samma med hänvisning till Fohlin böcker"). Sajten gör länkarna själv, på sidan och i Word-filerna, också i lathunden, lärarhandledningarna och lektionskorten (`src/lib/boklankar.ts`), om texten skrivs så här:

| Hänvisningen | Så skrivs den | Den leder till |
|---|---|---|
| Ett verktyg eller ett stödmaterial | Med namnet som i registret (`src/data/centrala.json`): "Fler problem finns på sidan Ta fram ett matteproblem." | Verktyget. Ett stycke i metodens löptext som säger "sidan", "sidor" eller "sidorna" före namnet får verktygets knapp efter sig, en gång i avsnittet. Lathunden och lärarhandledningarna får länken men ingen knapp, så att bladen är desamma som i pdf:en |
| En av Niclas böcker | Med titeln: "Boken Gruppstärkande ledarskap beskriver" | Bokens sida |
| En hänvisning till Fohlin | Som parentescitat, "(Fohlin och Wilson, 2025)", eller "Fohlin och Wilson (2025)", också "(se Fohlin och Wilson, 2025, s. 45)" och "Wilson och Fohlin (2025)". Har flera böcker samma år och medförfattare, som tre böcker 2023, står titeln direkt före parentesen: "Gruppstärkande ledarskap (Fohlin och Wilson, 2023)" | Bokens sida, ur titeln eller året och medförfattarna |
| En artikel där Niclas är medförfattare | Med förste författaren och året: "(Klang m.fl., 2020)". Artikeln står i listan i `src/lib/boklankar.ts` | Artikelns sida hos tidskriften |
| En bok som inte är utgiven | Med "utkommer" före året: "(Fohlin och Wilson, utkommer 2027)" | Sidan med alla böcker, niclasfohlin.se/bocker |
| En adress på sajten | Med sökvägen: "niclasfohlin.se/lastexter" | Adressen |

Bygget stannar på en hänvisning till Fohlin som kan gälla flera böcker eller en bok som inte finns på sajten, och på "sidan Ta fram …" när ingen sådan sida finns.

## Ingresser

Två till fyra meningar, minst 40 och högst 320 tecken; schemat stoppar annars. Egen text som säger vad texten hävdar och varför den skrevs. Aldrig originalets ingress i omskriven form. Ingressen ska fungera ensam i ett kort på startsidan och i ett nyhetsbrev.

## Bildtexter

En bild på sajten har två texter med olika läsare (Niclas 2026-10-20: "Tror du behöver en stringens för bildtext. Dvs vad bildtext har och hur lång den får vara"). Bildtexten står under bilden och läses av den som ser bilden. Textalternativet står bakom bilden och läses av den som inte ser den: skärmläsaren, Word och Google.

| Texten | Vad den säger | Längd |
|---|---|---|
| Bildtexten | Vad läraren tittar på och vad det används till i metoden, kort. Det som bilden eller kortet inte kan berätta själv: vem som har gjort det och när, i vilket pass det används och hur det skrivs ut, klipps, viks eller lamineras. Den upprepar inte det som syns eller står i bilden | En till tre meningar och högst 250 tecken |
| Textalternativet | Det som syns och står i bilden, i läsordning och i hela meningar, så att den som inte ser bilden får det som står på bladet | Så långt bilden kräver |

Under sifferkorten står till exempel: ”Ett A4 per elev, att klippa isär. Eleverna lägger talet med korten under det de har byggt på mattan i vecka 2.”

Bildtexten börjar inte med ”Bilden visar” och upprepar inte bildens rubrik. Citat ur bladet står inom citattecken. En bild utan egen bildtext, som en bild i en faktatext eller ett lösningsförslag, har bara textalternativet, eftersom texten runt bilden är dess bildtext. Vilket fält som är vilket står i METODER.md under Bladet.

## Metodtexter

Genomförandet skrivs som steg en lärare kan följa i morgon utan att fråga. Ange tid, material och gruppstorlek. Progression och uppföljning är konkreta: vad som ökar, vad som mäts, hur ofta.

## Skrivmanual

(Klistra in "Att skriva som Niclas Fohlin" här. Vid konflikt gäller manualen före sammanfattningen ovan.)
