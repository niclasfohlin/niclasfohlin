# Arbetssätt

Så här jobbar Claude Code i det här repot. Filen läses vid start och igen efter varje kompaktering.

## Grenar och commits

Main är det som ligger ute. Allt arbete sker på en gren: `innehall/<slug>` för poster, `sajt/<beskrivning>` för kod och design, `natt/<datum>` för nattkörningar. En hook stoppar commits direkt på main. Varje commit gör en sak och har ett meddelande som säger vad: "Artikel: Nej till no excuses", "Sajt: filtrering i metodbanken".

Före varje commit: `npm run validera`. Det kör registerkontrollen, `astro check` och `astro build`. Går det inte igenom committas inget.

Push, sammanslagning till main och deploy är Niclas beslut. När arbetet är klart: beskriv vad som gjorts, vilken gren det ligger på och exakt vilka kommandon han kör för att granska och slå ihop.

## Innan du börjar en uppgift

Kör `git status` och `git branch --show-current`. Läs de filer uppgiften rör innan du ändrar dem. Rör bara det uppgiften gäller. Hittar du något annat som borde fixas: lägg det i kön med `node scripts/ko.mjs lagg "<vad>" --var <fil>`, gör det inte i samma commit.

## Kön

Kön ligger i KO.md och sköts av `scripts/ko.mjs`. Registret skrivs bara av skriptet; det Niclas vill ha gjort skriver han under Inkorg i KO.md, och `node scripts/ko.mjs inkorg` gör poster av raderna. KO.md står i .gitignore: den är arbetsläge, inte innehåll, och ska varken byta utseende med grenen eller krocka vid en sammanslagning.

En post tas med `starta`, som ställer relevansfrågorna och byter till grenen `ko/<id>` från main (eller till en gren du anger, som nattens). Den stängs med `klar`, som kör `npm run validera`, kräver att allt ligger i git på postens gren och vägrar när fler än två nya poster bär `[UR <id>]`: så många fynd ur en post betyder att roten inte hittades. En onödig post avförs med `stang` och ett underlag. Det som kräver Niclas blockeras med `blockera --behovs`.

Prio 1 görs nu, prio 2 i tur och ordning, prio 3 vilar tills ett annat jobb ändå ska ändra samma fil och kräver därför `--var`. `--drabbar lasare` ger prio 1 (en läsare av sajten ser felet), `--drabbar rigg` ger prio 3 (bara arbetssättet är drabbat). `node scripts/ko.mjs` utan argument visar alla kommandon, `npm run ko:prov` kör köns egna prov.

## Innehåll

Poster skapas från `_mall.md` i respektive mapp. Taggar och publikationer tas från registren i `src/data/`. Kör `npm run taggar` för att se vad som finns innan du väljer. Exempelposterna `exempel-*.md` är utkast som visar hur det ska se ut. Ta bort dem när riktigt innehåll finns.

Ingresser och beskrivningar skrivs enligt STIL.md. De är Niclas röst utåt. Är du osäker på ton eller fakta: fråga, eller skriv ett förslag och markera det tydligt som förslag.

## Design och kod

KONCEPT.md beskriver målet. Utveckla iterativt: en sak i taget, testa i `npm run dev`, gör commit. Designtokens ligger i `src/styles/global.css`. Nya komponenter i `src/components/`. Håll HTML semantisk och tillgänglig. Inga tunga beroenden.

Astro 7 är strikt med HTML. Stäng alla taggar. Lägg inte block-element i `<p>`. Skriv `{" "}` där mellanrum mellan inline-element behövs.

## Drift och hemligheter

Läs aldrig `.env`. Be aldrig om värdet på en nyckel. Niclas sätter hemligheter med `netlify env:set` i sin egen terminal; du verifierar med `netlify env:list` att namnet finns. Kör aldrig interaktiva inloggningar (`gh auth login`, `netlify login`, `netlify init`); de hänger i din terminal. Skriv i stället exakt vad Niclas ska köra och verifiera efteråt.

## Nattkörning

`/natt` arbetar igenom den körbara kön på en egen gren, en post i taget genom `starta` och `klar`, och skriver rapporten till `../niclasfohlin-nattlogg.md` utanför repot. Filen skrivs över varje gång. Under natten tar Claude Code egna beslut i allt utom det som kräver Niclas: push, deploy, hemligheter, utskick, personfakta och rättigheter. Sådant blockeras i kön med en rad om vad som behövs.

## Texterna

Alla kända texter av Niclas ligger i `underlag/texter/`, ett blad per text med fulltext och metadata, och `underlag/texter/register.json` är listan. `npm run texter` visar vilka som saknar post på sajten. En post skapas ur bladet med `/ny-artikel <slug>`: egen ingress, taggar ur registret, länk till originalet. Fulltexten läggs in i posten bara när Niclas sagt att rättigheterna medger det, och då sätts `heltext: true`.

## När du fastnar

Tre försök på samma sak räcker. Beskriv sedan vad du provat, vad du tror är fel och vad du behöver. Gissa inte fram fakta om Niclas, hans böcker eller hans artiklar. Gissa inte API-detaljer; leta upp dokumentationen eller fråga.
