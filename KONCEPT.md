# Koncept: niclasfohlin.se

## Syfte

En egen långsiktig plattform som samlar Niclas Fohlins publicerade artiklar, böcker och praktiska resurser för stödundervisning. Den ska vara enkel att förvalta från Claude Code och publiceras automatiskt via GitHub och Netlify. Sajten ska hålla i många år: Markdown i ett repo, inga inlåsningar, inget som kräver en tjänst för att innehållet ska finnas kvar.

## Vad sajten består av

| Del | Innehåll | Vad läsaren ska kunna göra |
|---|---|---|
| Start | Presentation, senaste texter, ingång till metodbanken och böckerna | Förstå vem Niclas är och hitta vidare på tio sekunder |
| Artiklar | Arkiv med datum, egen ingress, taggar och tydlig hänvisning till originalpubliceringen | Läsa ingressen, gå till originalet, hitta mer på samma tema |
| Böcker | Omslag, presentation, år, förlag, medförfattare, länkar | Se vad böckerna handlar om och var de finns |
| Stödundervisning | Metodbank med område, årskursnivå och taggar | Hitta en metod som passar och använda den i morgon |
| Taggar | Alla teman med antal poster | Se sajten tvärs över innehållstyperna |
| Prenumeration | Formulär med dubbel opt-in och RSS-flöden per innehållstyp | Få ett mejl när det kommer nytt |

## Innehållsmodell

| Typ | Obligatoriskt | Valfritt |
|---|---|---|
| Artikel | titel, ingress, datum, publikation, taggar | originalUrl, typ, medförfattare, utvald, heltext |
| Bok | titel, beskrivning, utgivningsår | förlag, medförfattare, serie, ISBN, omslag, länkar, taggar |
| Metod | titel, ingress, område, årskurs, taggar | format, tid, material, uppdaterad, relaterade |

Område är exakt ett av Matematik, Läsning och Skrivning. Årskurs är en eller flera av F-3, 4-6 och 7-9. Taggar beskriver vad innehållet handlar om eller tränar, till exempel avkodning, läsflyt, taluppfattning, stavning eller textstruktur.

## Taggar som håller över tid

Sajten kommer att växa i flera år. Om taggar skapas fritt får den snart läsflyt, läs-flyt och träna läsflyt som tre olika taggar. Därför finns ett register i src/data/taggar.json med alla tillåtna taggar och deras alias. Bygget stoppar om en post använder något annat. En ny tagg är ett medvetet beslut, inte en bieffekt av att skriva en post.

## Redaktionell automation

Claude Code ska kunna ta emot en URL eller en text, hämta metadata, skriva en egen ingress, välja taggar ur registret, skapa en korrekt post, validera sajten och förbereda en commit. Originalkälla och original-URL bevaras alltid. Kommandona `/ny-artikel`, `/ny-metod` och `/ny-bok` gör det här repeterbart.

Rättigheter: publicerade artiklar visas som ingress plus länk. Hela texten läggs in bara när Niclas säger att avtalet med tidningen medger det.

## Prenumeration

Prenumeration är först en lista i Brevo med dubbel opt-in. Senare kan prenumeranten välja innehållstyp. RSS-flöden finns från start: allt, bara artiklar, bara metoder. Utskick förbereds av Claude Code som utkast och skickas av Niclas. Massutskick kräver alltid godkännande.

## Design

Modern och professionell men personlig. Typografi och läsning väger tyngst. Luft, tydliga kort, hög kontrast, mobil först. Stödundervisning ska kännas som ett verktygsbibliotek med filtrering, inte som en blogg. Designsystemet ligger som variabler i src/styles/global.css och får utvecklas efter faktisk användning. Undvik dekor som inte hjälper läsningen.

## Teknik

Astro 7 med TypeScript och Content Collections, Markdown, GitHub, Netlify. Statiskt bygge. Netlify Functions för det lilla som behöver en server. Inga databaser i v1. Hemligheter i Netlifys miljövariabler, aldrig i repot.

## Ordning för utvecklingen

1. Informationsarkitektur och designsystem utifrån den grund som finns.
2. Startsida som håller.
3. Metodbanken med filtrering på område, årskurs och tagg.
4. Artikelarkiv med filtrering på publikation och tagg.
5. Böcker med omslag.
6. Om-sidan med underlag från Niclas.
7. Prenumeration kopplad till Brevo.
8. Riktigt innehåll in, exempelposter ut.
