---
description: Skapa en metod i Stödundervisning från Niclas kompendium och lathund.
argument-hint: <sökväg till underlag eller beskrivning>
---
Underlag: $ARGUMENTS

Modellen, mappningen från kompendiets rubriker till fälten, lathundens sidor, textreglerna och kontrollerna står i METODER.md. Läs den först, och öppna `src/content/stodundervisning/problemlosning-i-grupp.yaml` som förebild bredvid underlaget. Det här är det körbara flödet.

1. Kopiera uppladdningarna till `underlag/metoder/<leverans>/` (avsändare och månad, som `kungsholmen-2026-09`; git ignorerar mappen) som `kompendium.docx`, `kompendium.pdf`, `lathund.pptx`, `lathund.pdf`. Docx: `pandoc <fil> -t markdown -o underlag/metoder/<leverans>/kompendium.md`. Pdf-sidorna läser du med Read för designen. Bara pptx: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/pptx-till-pdf.ps1 <mapp>/lathund.pptx` och sedan `pdftoppm -r 80 -png <mapp>/lathund.pdf <mapp>/lathund-sidor/sida`. Flera metoder i samma kompendium delas per rubriknivå 2, en post per metod.
2. Bestäm exakt ett område (Matematik, Läsning, Skrivning) och minst en årskursnivå (F-3, 4-6, 7-9). Kompendiernas metoder gäller åk 4–9 om Niclas inte säger annat. Lagernivåer och insatsspår stryks. Saknas något som en publicerad metod behöver (område, årskurs, passrutin eller genomförande, uppföljning): fråga Niclas, hitta inte på.
3. Taggar ur registret: `npm run taggar`. Ny tagg bara när ingen befintlig täcker, och då i samma commit som posten.
4. Skriv metoden som JavaScript-objekt i `underlag/metoder/<leverans>/<slug>.mjs` med samma fält som `_mall.yaml`, lathunden som blocket `lathund`, och kör `node scripts/metod-yaml.mjs <fil>`. Texten är Niclas egen, ordagrant, med bara de avsiktliga ändringarna i METODER.md. Fraser i stegtabellen utan citattecken. Delar som saknas i underlaget utelämnas. Elevantal, passlängd och period skrivs en gång, i `tid` ("<passlängd> per pass, <hur ofta>"), `grupp` och `period`; kortet och lathunden hämtar dem därifrån. `uppdaterad` är dagens datum, `relaterade` pekar åt båda håll (uppdatera de andra metoderna i samma commit), och `utkast: false` sätts när metoden är klar att mejlas.
5. Ingress och undertitel enligt STIL.md: egen text, två till fyra meningar, som fungerar i ett kort och i ett nyhetsbrev.
6. Har metoden en lathund: `node scripts/lathund-pdf.mjs <slug>`. Skriptet bygger sajten (ett fel i schemat stoppar här med besked), skriver ut lathunden som pdf till `public/stodundervisning/` och kontrollerar fyra sidor och upphov. Pdf:en och `lathund-pdf.json` committas med metoden; utan dem stannar validera.
7. `npm run validera` tills allt går igenom. Schemat säger vad som är fel. Ändras metodens text eller stilen efteråt: kör steg 6 igen, annars stannar validera på att pdf:en är gammal.
8. `node scripts/metodprov.mjs <slug> --underlag underlag/metoder/<leverans>/kompendium.md --bilder`. Titta på bilderna i `underlag/prov/<slug>/`: tabellerna på mobil, rutorna, bockarna, sidfoten i utskriften, lathundens fyra sidor. Öppna docx-filen i Word.
9. `node scripts/metodgranskning.mjs <slug> --underlag underlag/metoder/<leverans>/kompendium.md`. Codex granskar paritet i innehåll och design och kvalitet, P1 till P3, i bakgrunden; svaret hamnar i `underlag/prov/<slug>/granskning-<datum>.md`. Adjudicera: P1 lagas nu, P2 lagas eller läggs i kön med `node scripts/ko.mjs lagg`, P3 och allt som rör Niclas text blir beslut i NATTEN.md. Kör steg 6 till 8 igen efter ändringar.
10. Commit "Metod: <titel>" på `innehall/<slug>` eller passets gren, med pdf-filen och manifestet. Push när passet är klart, en gång; pushen mejlar prenumeranterna om nya metoder.
11. Visa Niclas metadata, passrutinen, ändringarna i hans text och Codex-fynden som är hans att avgöra.
