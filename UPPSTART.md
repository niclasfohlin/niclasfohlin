# Uppstart

Målet: koden ligger på GitHub, Netlify bygger varje push till main, niclasfohlin.se pekar på Netlify, och Claude Code har rätt behörigheter för att sköta resten. Kommandot `/uppstart` i Claude Code går igenom det här dokumentet steg för steg, kontrollerar nuläget och säger vad Niclas ska göra när ett steg kräver inloggning eller ett klick i webbläsaren.

Det här dokumentet beskriver hur uppsättningen gjordes. Dagens läge hos varje tjänst, kommandon som fungerar och var inloggningarna ligger står i DRIFT.md, och där det här dokumentet säger annat gäller DRIFT.md: repot heter `niclasfohlin` och är publikt, och `NETLIFY_AUTH_TOKEN` används inte (inloggningen ligger i Netlify CLI:s egen config).

## Vem gör vad

| Steg | Niclas | Claude Code |
|---|---|---|
| Installera Node, Git, GitHub CLI, Netlify CLI | Ingenting | Installerar och kontrollerar versioner |
| Logga in i GitHub och Netlify | Klickar i webbläsaren när inloggningen startats | Startar `gh auth login` och `netlify login` i bakgrunden, verifierar med `gh auth status` och `netlify status` |
| Skapa repo och första push | Ingenting | `gh repo create` och push |
| Koppla Netlify till repot | Ingenting | Skapar sajten, länkar repot och kontrollerar bygget |
| Domän | Säger om domänen har e-post hos Loopia, och byter namnservrar eller lägger DNS-poster om Claude Code saknar API-åtkomst | Lägger till domänen i Netlify och kontrollerar HTTPS |
| Brevo | Skapar kontot och API-nyckeln | Skapar lista och mall, sätter miljövariabler, testar formuläret |
| Löpande innehåll och utveckling | Läser NATTEN.md och säger till när något ska ändras | Allt annat, inklusive sammanslagning, push och deploy |

Niclas gav 2026-09-19 Claude Code fullt mandat att sköta tjänsterna. Det som ändå kräver Niclas är konton och inloggningar där en människa måste klicka, och de stegen står i INSTRUKTIONER.docx. Lösenord lämnas aldrig till Claude Code; nycklar och token som Niclas skapar för riggen får däremot ligga i lokala, git-ignorerade filer.

## Steg 1: verktyg

Node 22.12 eller senare krävs. Kontrollera med `node -v`.

| Verktyg | Windows | Mac |
|---|---|---|
| Node.js | `winget install OpenJS.NodeJS.LTS` | `brew install node` |
| Git | `winget install Git.Git` | `brew install git` |
| GitHub CLI | `winget install GitHub.cli` | `brew install gh` |
| Netlify CLI | `npm install -g netlify-cli` | `npm install -g netlify-cli` |

Starta om terminalen efter installation så att sökvägarna hittas. Claude Code på Windows behöver Git for Windows för att hooks ska fungera.

På Niclas dator (2026-09-20): Node 24.19, Git 2.55, Netlify CLI 27.8 i `%APPDATA%\npm`, och GitHub CLI 2.101 installerad utan administratörsrättigheter i `%LOCALAPPDATA%\Programs\gh\bin` och kopierad till `%APPDATA%\npm\gh.exe` så att `gh` hittas på samma sökväg som `netlify`.

## Steg 2: lokalt

I projektmappen: `npm install` och sedan `npm run dev`. Sajten svarar på adressen Astro visar, oftast http://localhost:4321. `npm run validera` ska gå igenom utan fel innan något annat görs.

## Steg 3: GitHub

Claude Code startar `gh auth login -h github.com -p https -w` i bakgrunden. Utdatan visar en engångskod. Niclas öppnar https://github.com/login/device, klistrar in koden och godkänner. Inloggningen sparas i `%APPDATA%\GitHub CLI\hosts.yml`. Claude Code verifierar med `gh auth status` och kör `gh auth setup-git` så att git pushar med samma inloggning.

Sedan skapar Claude Code repot och pushar:

```
git init -b main
git add -A
git commit -m "Startprojekt"
gh repo create niclasfohlin-site --private --source=. --remote=origin --push
```

Repot är privat. Innehållet är publikt på sajten ändå, men repot behöver inte vara det.

## Steg 4: Netlify

Inloggning på ett av två sätt. Antingen startar Claude Code `netlify login` i bakgrunden och Niclas godkänner i webbläsaren, så sparas inloggningen i `%APPDATA%\netlify\Config\config.json`. Eller så skapar Niclas en personal access token under User settings, Applications i Netlify, och Claude Code lägger den som miljövariabeln `NETLIFY_AUTH_TOKEN` i `.claude/settings.local.json` (git-ignorerad) och på användarkontot med `setx`.

Sedan skapar Claude Code sajten (`netlify sites:create --name niclasfohlin`), länkar mappen (`netlify link`) och kopplar repot så att Netlify bygger varje push till main. Kopplingen till GitHub kräver att Netlifys GitHub-app får åtkomst till repot; det klicket gör Niclas i Netlify under Site configuration, Build & deploy, Continuous deployment, om Claude Code inte kan sätta upp deploy key och webhook via API. Tills kopplingen finns deployar Claude Code med `netlify deploy --prod --build`.

Grenar som pushas får en förhandsvisning på egen adress. Claude Code verifierar med `netlify status` och kontrollerar det senaste bygget med `netlify api listSiteDeploys`.

## Steg 5: domän

I Netlify: Site configuration, Domain management, Add a domain, niclasfohlin.se. Netlify visar vilka DNS-poster registraren ska ha. Två vägar:

| Väg | Vad som görs | När |
|---|---|---|
| Netlify DNS | Byt namnservrar hos registraren till Netlifys | Enklast, Netlify sköter allt |
| Egen DNS | Lägg A-post för apex och CNAME för www enligt Netlifys anvisning | När DNS ska ligga kvar hos registraren |

HTTPS-certifikat utfärdas automatiskt när DNS pekar rätt, vanligtvis inom en timme. Ställ in att www skickas till apex eller tvärtom under Domain management.

## Steg 6: Brevo och prenumeration

Formuläret på /prenumerera fungerar utan Brevo men svarar då att prenumerationen inte är påslagen och hänvisar till RSS. För att slå på:

1. Niclas skapar konto på brevo.com med niclas.fohlin@gmail.com och bekräftar e-postadressen.
2. Niclas skapar en API-nyckel under SMTP & API, API keys, och lägger den i filen `.env` i projektmappen som `BREVO_API_KEY=...` (git ignorerar filen).
3. Claude Code skapar listan Prenumeranter och mallen för dubbel opt-in via Brevos API, sätter `BREVO_API_KEY`, `BREVO_LIST_ID`, `BREVO_DOI_TEMPLATE_ID` och `SITE_URL` i Netlify med `netlify env:set`, och testar formuläret med `netlify dev`.
4. Avsändaren måste vara verifierad i Brevo. Först verifierades niclas.fohlin@gmail.com (Brevo mejlar en länk som Niclas klickar). Sedan 2026-09-21 är domänen niclasfohlin.se autentiserad i Brevo med fyra DNS-poster hos Loopia (två CNAME för DKIM, en TXT med brevo-code på roten och en TXT för DMARC på _dmarc), och avsändaren är Niclas Fohlin <nyhetsbrev@niclasfohlin.se> med svar till niclas.fohlin@gmail.com. Adressen har ingen brevlåda; reply-to gör att svar ändå landar hos Niclas. Avsändaren står i `netlify/lib/utskick.mjs` och i mallen för dubbel opt-in i Brevo.

Funktionens anrop mot Brevo verifieras mot Brevos aktuella API-dokumentation första gången den testas skarpt.

Utskick sker som kampanj i Brevo. `/utskick` skriver utkastet och kan lägga upp kampanjen; den skickas när Niclas läst och sagt skicka.

## Steg 7: Claude Codes behörigheter

`.claude/settings.json` ligger i repot och gäller alla som öppnar mappen i Claude Code. Claude Code får inte ändra sina egna behörigheter (appen stoppar det som självmodifiering), så den filen redigerar Niclas. Målet är:

| Nivå | Vad | Varför |
|---|---|---|
| Tillåtet utan fråga | node, npm, npx, git, gh, netlify, curl, powershell, setx, winget, filkommandon, filläsning och redigering, webbhämtning | Riggen ska kunna sköta tjänsterna själv |
| Frågar först | gh repo delete, netlify sites:delete | Går inte att ångra |
| Stoppat | rm -rf, git push --force | Oåterkalleliga kommandon |

Appens permission-läge avgör också vad som går. I läget Auto bedömer en klassificerare varje kommando och stoppar allt som liknar hantering av hemligheter, deploy eller ändring av egna behörigheter, oavsett vad settings.json säger. Ska Claude Code sköta driften behöver sessionen köras i läget som inte frågar (bypassPermissions). Claude Code kan begära bytet själv; Niclas godkänner det på kortet som visas.

Tre hooks körs automatiskt: efter kompaktering läses ARBETSSATT.md, STIL.md och KO.md in igen; commit på main stoppas; när en innehållsfil sparas kontrolleras taggar och publikation direkt.

Personliga avvikelser och lokala token läggs i `.claude/settings.local.json`, som git ignorerar.

## Checklista

| Klart | Steg |
|---|---|
| [ ] | Node 22.12+, Git, gh och netlify-cli installerade |
| [ ] | `npm install` och `npm run validera` går igenom |
| [ ] | `gh auth status` visar inloggad |
| [ ] | Repot niclasfohlin-site finns på GitHub och main är pushad |
| [ ] | `netlify status` visar länkad sajt och bygget är grönt |
| [ ] | niclasfohlin.se svarar med HTTPS |
| [ ] | Brevo: lista, mall och nyckel finns; miljövariabler satta |
| [ ] | Formuläret testat med `netlify dev` och bekräftelsemejl mottaget |
| [ ] | Skrivmanualen inklistrad i STIL.md |
| [ ] | Exempelposterna borttagna och första riktiga innehållet inne |
