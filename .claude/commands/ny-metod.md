---
description: Skapa en metod i Stödundervisning från Niclas kompendium och lathund.
argument-hint: <sökväg till underlag eller beskrivning>
---
Underlag: $ARGUMENTS

Modellen, mappningen från kompendiets rubriker till fälten, lathundens sidor, textreglerna och kontrollerna står i METODER.md. Läs den först, och öppna `src/content/stodundervisning/problemlosning-i-grupp.yaml` som förebild bredvid underlaget. Det här är det körbara flödet.

1. Lägg leveransen i `underlag/metoder/<leverans>/` (git ignorerar mappen). Docx: `pandoc <fil> -t markdown -o underlag/metoder/<leverans>/kompendium.md`. Pdf-sidorna läser du med Read för designen. Pptx: packa upp och läs `ppt/slides/slide*.xml`, eller läs pdf-versionen. Flera metoder i samma kompendium delas per rubriknivå 2, en post per metod.
2. Bestäm exakt ett område (Matematik, Läsning, Skrivning) och minst en årskursnivå (F-3, 4-6, 7-9). Kompendiernas metoder gäller åk 4–9 om Niclas inte säger annat. Lagernivåer och insatsspår stryks. Saknas något som en publicerad metod behöver (område, årskurs, passrutin eller genomförande, uppföljning): fråga Niclas, hitta inte på.
3. Taggar ur registret: `npm run taggar`. Ny tagg bara när ingen befintlig täcker, och då i samma commit som posten.
4. Skriv metoden som JavaScript-objekt i `underlag/metoder/<leverans>/<slug>.mjs` med samma fält som `_mall.yaml`, lathunden som blocket `lathund`, och kör `node scripts/metod-yaml.mjs <fil>`. Texten är Niclas egen, ordagrant, med bara de avsiktliga ändringarna i METODER.md. Fraser i stegtabellen utan citattecken. Delar som saknas i underlaget utelämnas. Elevantal, passlängd och period skrivs en gång, i `tid`, `grupp` och `period`; lathunden hämtar dem därifrån.
5. Ingress och undertitel enligt STIL.md: egen text, två till fyra meningar, som fungerar i ett kort och i ett nyhetsbrev.
6. `npm run validera` tills bygget går igenom. Schemat säger vad som är fel.
7. `node scripts/metodprov.mjs <slug> --underlag underlag/metoder/<leverans>/kompendium.md --bilder`. Titta på bilderna i `underlag/prov/<slug>/`: tabellerna på mobil, rutorna, bockarna, sidfoten i utskriften, lathundens fyra sidor. Öppna docx-filen i Word.
8. `node scripts/lathund-pdf.mjs <slug>`: lathunden som pdf till `public/stodundervisning/`, committas med metoden (validera stannar annars). Sedan `node scripts/metodgranskning.mjs <slug> --underlag underlag/metoder/<leverans>/kompendium.md`. Codex granskar paritet i innehåll och design och kvalitet, P1 till P3, i bakgrunden; svaret hamnar i `underlag/prov/<slug>/granskning-<datum>.md`. Adjudicera: P1 lagas nu, P2 lagas eller läggs i kön med `node scripts/ko.mjs lagg`, P3 och allt som rör Niclas text blir beslut i NATTEN.md. Kör validera och metodprov igen efter ändringar.
9. Commit "Metod: <titel>" på `innehall/<slug>` eller passets gren. Push när passet är klart, en gång; pushen mejlar prenumeranterna om nya metoder.
10. Visa Niclas metadata, passrutinen, ändringarna i hans text och Codex-fynden som är hans att avgöra.
