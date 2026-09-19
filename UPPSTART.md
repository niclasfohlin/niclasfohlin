# Uppstart

Målet: koden ligger på GitHub, Netlify bygger varje push till main, niclasfohlin.se pekar på Netlify, och Claude Code har rätt behörigheter för att sköta resten. Kommandot `/uppstart` i Claude Code går igenom det här dokumentet steg för steg, kontrollerar nuläget och säger vad Niclas ska göra när ett steg kräver inloggning eller ett klick i webbläsaren.

## Vem gör vad

| Steg | Niclas | Claude Code |
|---|---|---|
| Installera Node, Git, GitHub CLI, Netlify CLI | Kör installationerna | Kontrollerar versioner, säger vad som saknas |
| Logga in i GitHub och Netlify | Kör `gh auth login` och `netlify login` i egen terminal | Verifierar med `gh auth status` och `netlify status` |
| Skapa repo och första push | Godkänner | Skapar repot med `gh repo create` och pushar |
| Koppla Netlify till repot | Kör `netlify init` och svarar på frågorna | Verifierar med `netlify status`, kontrollerar netlify.toml |
| Domän | Lägger till domänen i Netlify och pekar DNS | Kontrollerar att sajten svarar på domänen |
| Brevo | Skapar konto, lista, mall och API-nyckel; sätter miljövariabler | Verifierar att namnen finns, testar formuläret med `netlify dev` |
| Löpande innehåll och utveckling | Granskar, slår ihop till main | Allt annat |

Hemligheter passerar aldrig chatten. Claude Code läser inte `.env`, kör inte `netlify env:set` och ber inte om nyckelvärden.

## Steg 1: verktyg

Node 22.12 eller senare krävs. Kontrollera med `node -v`.

| Verktyg | Windows | Mac |
|---|---|---|
| Node.js | `winget install OpenJS.NodeJS.LTS` | `brew install node` |
| Git | `winget install Git.Git` | `brew install git` |
| GitHub CLI | `winget install GitHub.cli` | `brew install gh` |
| Netlify CLI | `npm install -g netlify-cli` | `npm install -g netlify-cli` |

Starta om terminalen efter installation så att sökvägarna hittas. Claude Code på Windows behöver Git for Windows för att hooks ska fungera.

## Steg 2: lokalt

I projektmappen: `npm install` och sedan `npm run dev`. Sajten svarar på adressen Astro visar, oftast http://localhost:4321. `npm run validera` ska gå igenom utan fel innan något annat görs.

## Steg 3: GitHub

Niclas kör `gh auth login` i sin terminal och väljer GitHub.com, HTTPS och inloggning via webbläsare. Claude Code verifierar med `gh auth status`.

Sedan skapar Claude Code repot och pushar (Niclas godkänner varje kommando):

```
git init -b main
git add -A
git commit -m "Startprojekt"
gh repo create niclasfohlin-site --private --source=. --remote=origin --push
```

Repot är privat. Innehållet är publikt på sajten ändå, men repot behöver inte vara det.

## Steg 4: Netlify

Niclas kör `netlify login` och sedan `netlify init` i projektmappen. Välj "Create & configure a new site", välj team, ge sajten namnet niclasfohlin. Netlify läser byggkommando och publiceringsmapp från netlify.toml. Netlify ber om att få koppla GitHub-kontot; godkänn åtkomst till repot niclasfohlin-site.

Efter det bygger Netlify automatiskt varje push till main. Grenar som pushas får en förhandsvisning på egen adress. Claude Code verifierar med `netlify status` och `netlify open:site`.

Claude Code deployar aldrig med `netlify deploy`. Deploy är en push till main, och den gör Niclas.

## Steg 5: domän

I Netlify: Site configuration, Domain management, Add a domain, niclasfohlin.se. Netlify visar vilka DNS-poster registraren ska ha. Två vägar:

| Väg | Vad som görs | När |
|---|---|---|
| Netlify DNS | Byt namnservrar hos registraren till Netlifys | Enklast, Netlify sköter allt |
| Egen DNS | Lägg A-post för apex och CNAME för www enligt Netlifys anvisning | När DNS ska ligga kvar hos registraren |

HTTPS-certifikat utfärdas automatiskt när DNS pekar rätt, vanligtvis inom en timme. Ställ in att www skickas till apex eller tvärtom under Domain management.

## Steg 6: Brevo och prenumeration

Formuläret på /prenumerera fungerar utan Brevo men svarar då att prenumerationen inte är påslagen och hänvisar till RSS. För att slå på:

1. Skapa konto på brevo.com.
2. Contacts, Lists: skapa listan "Prenumeranter". Notera list-id (ett tal).
3. Campaigns, Templates: skapa en mall för dubbel opt-in med en bekräftelselänk. Notera mall-id. Brevo har färdiga DOI-mallar att utgå från.
4. SMTP & API, API keys: skapa en nyckel för sajten.
5. I projektmappen, i egen terminal:

```
netlify env:set BREVO_API_KEY "nyckeln"
netlify env:set BREVO_LIST_ID "3"
netlify env:set BREVO_DOI_TEMPLATE_ID "7"
netlify env:set SITE_URL "https://niclasfohlin.se"
```

Claude Code verifierar med `netlify env:list` att namnen finns och testar formuläret lokalt med `netlify dev`, som hämtar variablerna från Netlify. Funktionens anrop mot Brevo ska verifieras mot Brevos aktuella API-dokumentation första gången den testas skarpt.

Utskick sker som kampanj i Brevo. `/utskick` skriver utkastet, Niclas skickar.

## Steg 7: Claude Codes behörigheter

`.claude/settings.json` ligger i repot och gäller alla som öppnar mappen i Claude Code.

| Nivå | Vad | Varför |
|---|---|---|
| Tillåtet utan fråga | npm, node, astro, git utom push, gh för läsning, netlify för läsning och lokal körning, filläsning och redigering, webbhämtning | Vardagsarbetet ska flyta |
| Frågar först | git push, git reset, git rebase, gh repo create, netlify deploy, netlify env:set, rm | Sådant som ändrar det som ligger ute eller inte går att ångra |
| Stoppat | Läsa .env, rm -rf, git push --force | Hemligheter och oåterkalleliga kommandon |

Tre hooks körs automatiskt: efter kompaktering läses ARBETSSATT.md, STIL.md och KO.md in igen; commit på main stoppas; när en innehållsfil sparas kontrolleras taggar och publikation direkt.

Personliga avvikelser läggs i `.claude/settings.local.json`, som git ignorerar.

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
