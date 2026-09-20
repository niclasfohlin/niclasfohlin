# Arbetssätt

Så här jobbar Claude Code i det här repot. Filen läses vid start och igen efter varje kompaktering.

## Grenar och commits

Main är det som ligger ute. Allt arbete sker på en gren: `innehall/<slug>` för poster, `sajt/<beskrivning>` för kod och design, `natt/<datum>` för nattkörningar. En hook stoppar commits direkt på main. Varje commit gör en sak och har ett meddelande som säger vad: "Artikel: Nej till no excuses", "Sajt: filtrering i metodbanken".

Före varje commit: `npm run validera`. Det kör registerkontrollen, `astro check` och `astro build`. Går det inte igenom committas inget.

När arbetet är klart och `npm run validera` är grönt slår du själv ihop grenen till main och pushar. Netlify bygger och deployar varje push till main, och varje bygge drar krediter från gratisplanens månadspott (300 krediter; 75 procent var förbrukade 2026-09-20 efter kvällens många byggen). Därför: samla arbetet och pusha main högst en gång per arbetspass eller nattkörning, aldrig ett bygge per post. Testa lokalt med `npm run validera`, `npm run dev` och `netlify functions:serve`; starta aldrig byggen på Netlify för att testa. Kontrollera att bygget blev grönt (`netlify api listSiteDeploys --data '{"site_id":"<id>"}'` visar det senaste) och beskriv sedan för Niclas vad som gjorts och var det syns. Blev bygget rött: laga eller backa, och skriv vad som hände.

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

## Drift

Claude Code sköter driften direkt från riggen. Verktygen ligger i `%APPDATA%\npm`: `netlify` (Netlify CLI) och `gh` (GitHub CLI, installerad utan administratörsrättigheter i `%LOCALAPPDATA%\Programs\gh` och kopierad dit). Netlify nås med `netlify`, GitHub med `gh`, Brevo med API-nyckeln i Netlifys miljövariabler, och domänens DNS hos Loopia med `python scripts/loopia.py` (LoopiaAPI; API-användaren ligger som `LOOPIA_USER` och `LOOPIA_PASSWORD` i `.claude/settings.local.json`).

Sajten heter niclasfohlin på Netlify (id 8af49398-3862-4b58-84a6-88f68d0064c1, team niclas-fohlin) och bygger main i repot github.com/niclasfohlin/niclasfohlin via deploy key och webhook. Domänen niclasfohlin.se pekar med A-post på Netlifys lastbalanserare och www med CNAME på niclasfohlin.netlify.app, båda satta i Loopias DNS. Miljövariabeln `NETLIFY_AUTH_TOKEN` ska inte vara satt i skalet: den skuggar CLI:ts sparade inloggning.

Inloggningarna ligger utanför repot: Netlify CLI i `%APPDATA%\netlify\Config\config.json` (efter `netlify login`) eller som miljövariabeln `NETLIFY_AUTH_TOKEN` på användarens konto, GitHub CLI i `%APPDATA%\GitHub CLI\hosts.yml` (efter `gh auth login`). Hemligheter ligger aldrig i git: `.env`, `.claude/settings.local.json` och `.netlify/` ignoreras, och produktionens värden sätts med `netlify env:set` och läses av `netlify dev`.

En inloggning som kräver webbläsaren (`gh auth login`, `netlify login`) startas i bakgrunden så att koden som ska klistras in syns i utdatan, och Niclas gör klickandet enligt INSTRUKTIONER.docx. Fastnar ett steg på att en människa måste göra det: skriv steget i INSTRUKTIONER.docx och NATTEN.md och gå vidare med nästa sak.

## Nattkörning

`/natt` arbetar igenom den körbara kön på en egen gren, en post i taget genom `starta` och `klar`, slår ihop grenen till main och pushar när valideringen är grön, och skriver rapporten till `NATTEN.md` i repots rot. Git ignorerar filen, och den skrivs över varje gång. Under natten tar Claude Code egna beslut i allt utom det som kräver Niclas: längre nyhetsbrev, personfakta och inloggningar som kräver webbläsaren. Allt som pushas till main mejlas prenumeranterna automatiskt, så bara färdigt innehåll lämnar utkastläget. Sådant blockeras i kön med en rad om vad som behövs, och steget skrivs in i INSTRUKTIONER.docx.

## Texterna

Alla kända texter av Niclas ligger i `underlag/texter/`, ett blad per text med fulltext och metadata, och `underlag/texter/register.json` är listan. `npm run texter` visar vilka som saknar post på sajten. En post skapas ur bladet med `/ny-artikel <slug>`: egen ingress, taggar ur registret, länk till originalet. Fulltexten läggs in i posten bara när Niclas sagt att rättigheterna medger det, och då sätts `heltext: true`.

## När du fastnar

Tre försök på samma sak räcker. Beskriv sedan vad du provat, vad du tror är fel och vad du behöver. Gissa inte fram fakta om Niclas, hans böcker eller hans artiklar. Gissa inte API-detaljer; leta upp dokumentationen eller fråga.
