# niclasfohlin.se

Astro-sajt som byggs av Netlify från GitHub. Innehållet är Markdown i `src/content/`. Claude Code sköter innehåll, utveckling och drift enligt `CLAUDE.md`.

## Kom igång

1. Installera Node 22.12 eller senare. Windows: `winget install OpenJS.NodeJS.LTS`. Mac: `brew install node`.
2. Packa upp zipen. Windows PowerShell: `Expand-Archive niclasfohlin-site-starter.zip`. Mac: `unzip niclasfohlin-site-starter.zip`.
3. Gå in i mappen och kör `npm install` och sedan `npm run dev`.
4. Öppna mappen i Claude Code och skriv `/uppstart`. Kommandot går igenom GitHub, Netlify, domän och Brevo steg för steg enligt `UPPSTART.md`.

Första riktiga uppdraget till Claude Code kan vara:

> Läs CLAUDE.md. Kör node scripts/ko.mjs lista och ta K-003: skapa poster för texterna i underlag/texter som saknar post, en i taget, med npm run validera före varje commit. Visa mig de tre första innan du fortsätter.

## Var saker finns

| Vad | Var |
|---|---|
| Vad sajten ska bli | KONCEPT.md |
| Hur Claude Code arbetar | CLAUDE.md, ARBETSSATT.md |
| Hur texter skrivs | STIL.md |
| Konton, inloggning, domän, behörigheter | UPPSTART.md |
| Kön | KO.md, sköts av scripts/ko.mjs |
| Alla kända texter i fulltext | underlag/texter/ med register.json |
| Artiklar, böcker, metoder | src/content/artiklar, bocker, stodundervisning |
| Mallar för nya poster | src/content/*/_mall.md |
| Tillåtna taggar och publikationer | src/data/taggar.json, src/data/publikationer.json |
| Scheman | src/content.config.ts |
| Design | src/styles/global.css, src/layouts/Base.astro, src/components |
| Prenumerationsfunktion | netlify/functions/prenumerera.mjs |
| Claude Code: behörigheter, hooks, kommandon | .claude/ |

## Kommandon

| Kommando | Gör |
|---|---|
| `npm run dev` | Utvecklingsserver |
| `npm run validera` | Registerkontroll, kontroll av lathundarnas pdf, typkontroll och bygge. Körs före varje commit |
| `npm run taggar` | Listar alla taggar med antal användningar |
| `node scripts/taggar.mjs --sok läsflyt` | Slår upp om ett ord är en tagg eller ett alias |
| `npm run ko` | Kön: `lista`, `lagg`, `starta`, `klar`, `stang`, `blockera`. Utan argument visas hjälpen |
| `npm run ko:prov` | Köns egna prov i en tillfällig katalog |
| `npm run texter` | Texterna i underlag/texter: vilka som har post på sajten och vilka som saknar |
| `node scripts/hamta-vilarare.mjs <urlfil> underlag/texter` | Hämtar nya Vi Lärare-texter som blad i underlag/texter |
| `npm run build` | Produktionsbygge till dist/ |
| `netlify dev` | Lokal server med Netlify Functions och miljövariabler |

I Claude Code: `/uppstart`, `/ny-artikel <url>`, `/ny-metod <underlag>`, `/ny-bok <titel>`, `/validera`, `/natt`, `/utskick`.
