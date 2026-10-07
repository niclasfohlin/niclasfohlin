# niclasfohlin.se

Astro-sajt som byggs av Netlify från GitHub. Innehållet är Markdown och YAML i `src/content/`. Claude Code sköter innehåll, utveckling och drift.

## Kom igång

1. Installera Node 22.12 eller senare. Windows: `winget install OpenJS.NodeJS.LTS`. Mac: `brew install node`.
2. Packa upp zipen. Windows PowerShell: `Expand-Archive niclasfohlin-site-starter.zip`. Mac: `unzip niclasfohlin-site-starter.zip`.
3. Gå in i mappen och kör `npm install` och sedan `npm run dev`.
4. Öppna mappen i Claude Code och skriv `/uppstart`. Kommandot går igenom GitHub, Netlify, domän och Brevo steg för steg enligt `UPPSTART.md`.

Första riktiga uppdraget till Claude Code kan vara:

> Läs CLAUDE.md. Kör node scripts/ko.mjs lista och ta den översta posten, med npm run validera före varje commit. Visa mig resultatet innan du fortsätter.

## Var saker finns

Allt börjar i `CLAUDE.md`: tabellen Var allt står pekar ut varje handbok, och registret i `ARBETSSATT.md` säger vilket avsnitt eller flöde som gäller för en uppgift. Kommandona och skripten står i `DRIFT.md` under Riggen. Den här filen upprepar dem inte.
