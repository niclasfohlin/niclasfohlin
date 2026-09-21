# Drift

Så når riggen varje tjänst, var inloggningarna ligger och vilka anrop som fungerar. Värden på hemligheter står aldrig här eller någon annanstans i repot. Läget som beskrivs gäller 2026-09-21; ändras något, ändra här i samma commit.

## Riggen

Windows 11, Node 22.12, Git Bash som skal i Claude Code. Verktygen och var de ligger:

| Verktyg | Var | Används till |
|---|---|---|
| `netlify` (Netlify CLI) | `%APPDATA%\npm` | deployer, miljövariabler, Blobs, funktioner lokalt |
| `gh` (GitHub CLI) | `%APPDATA%\npm`, installerad i `%LOCALAPPDATA%\Programs\gh` | repo, PR, API |
| `python scripts/loopia.py` | repot | DNS hos Loopia via LoopiaAPI |
| `node scripts/brevo.mjs` | repot | Brevo: status, domän, kampanjer, valfritt anrop |
| `pandoc` | sökvägen | docx och pptx till text |
| Chrome headless | `C:\Program Files\Google\Chrome\Application\chrome.exe` | utskrift till pdf, Lighthouse |
| `node scripts/skarmbild.mjs` | repot | en skärmbild via CDP med riktig mobilemulering |
| `node scripts/skarmbilder.mjs` | repot | sajtens viktigaste sidor på desktop och mobil ur dist, till underlag/prov/sajt/ |
| Word via COM (PowerShell) | Office | visuell kontroll av docx; ExportAsFixedFormat hänger på den här datorn |
| `codex.exe` | `%LOCALAPPDATA%\Programs\OpenAI\Codex\bin` | second opinion, se Codex nedan |
| `npx lighthouse` | npm | mätning mot `astro preview --port 4322` |

npm-skripten: `dev`, `build`, `preview`, `check`, `validera` (register, astro check, build), `taggar`, `texter`, `ko`, `ko:prov`.

Astro 7 kör `astro preview` som en bakgrundsprocess med låsfil: en andra `astro preview` startar inte utan avslutar tyst med hänvisning till den första, och `taskkill` på skalet dödar den inte. Skripten startar därför med `--ignore-lock` och stänger sin egen; en kvarglömd server syns med `npx astro preview status` och stoppas med `npx astro preview stop`.

## Hemligheter

| Vad | Var den ligger | Hur den används |
|---|---|---|
| GitHub-inloggning | `%APPDATA%\GitHub CLI\hosts.yml`, konto niclasfohlin | `gh` läser den själv |
| Netlify-inloggning | `%APPDATA%\netlify\Config\config.json` | `netlify` läser den själv. Miljövariabeln `NETLIFY_AUTH_TOKEN` ska inte vara satt i skalet: den skuggar inloggningen. Kör `unset NETLIFY_AUTH_TOKEN` om den finns. |
| Brevo API-nyckel | Netlify, `BREVO_API_KEY` (hemlig), och lokalt i `.env` i repots rot (git-ignorerad) | funktionerna läser den ur miljön; `scripts/brevo.mjs` tar den ur miljövariabeln eller `.env` och skriver aldrig ut den. Netlify CLI maskar hemliga värden (`netlify env:get` visar bara de sista tecknen), så saknas `.env` skapar Niclas en ny nyckel i Brevo (SMTP & API, API keys) och lämnar den i en fil; den sätts med `netlify env:set BREVO_API_KEY <värde> --secret` och skrivs i `.env` |
| Utskickets delade hemlighet | Netlify, `UTSKICK_HEMLIGHET` (hemlig) | byggpluginen anropar funktionen utskick med den |
| Loopias API-användare | `.claude/settings.local.json` som `LOOPIA_USER` och `LOOPIA_PASSWORD` (git-ignorerad) | Claude Code sätter dem i miljön, `scripts/loopia.py` läser dem |

Reglerna: hemligheter committas aldrig, skrivs aldrig ut i chatten eller i loggar, och efterfrågas aldrig som värde. Lösenord som Niclas ändå skriver används inte och sparas inte; be honom byta. En inloggning som kräver webbläsaren (`gh auth login`, `netlify login`) startas i bakgrunden så att koden eller länken syns i utdatan, och Niclas klickar; steget skrivs i INSTRUKTIONER.docx. Appens läge Auto stoppar hantering av nycklar, sammanslagning till main och ändring av egna behörigheter; en driftsession begär läget bypassPermissions och Niclas godkänner på kortet.

## GitHub

Repot är github.com/niclasfohlin/niclasfohlin, publikt, huvudgren main. En hook stoppar commits direkt på main; arbeta på `innehall/<slug>`, `sajt/<beskrivning>` eller `natt/<datum>` och slå ihop med `git merge --ff-only`. Varje push till main bygger på Netlify. Ändringar som inte rör sajten (skript, dokumentation, KO) får `[skip netlify]` sist i commit-meddelandet på den commit som pushas, så att inget bygge startar.

| Uppgift | Kommando |
|---|---|
| Inloggad? | `gh auth status` |
| Repot | `gh repo view niclasfohlin/niclasfohlin` |

Repot är publikt: Niclas opublicerade underlag (kompendier, lathundar, CV) ligger i `underlag/metoder/`, som git ignorerar.

## Netlify

Sajten heter niclasfohlin (id `8af49398-3862-4b58-84a6-88f68d0064c1`, team niclas-fohlin, https://niclasfohlin.netlify.app) och bygger main via deploy key och webhook. Planen är Personal med 1000 krediter per månad sedan 2026-09-20; ett bygge kostar omkring 15. Därför en push per arbetspass, aldrig testbyggen på Netlify. `pretty_urls` är avslaget, "Powered by"-brickan är avstängd, Netlify DNS används inte.

| Uppgift | Kommando |
|---|---|
| Senaste deployerna | `netlify api listSiteDeploys --data '{"site_id":"8af49398-3862-4b58-84a6-88f68d0064c1","per_page":3}'` (fälten `state`, `commit_ref`, `error_message`) |
| Miljövariabler | `netlify env:list`, `netlify env:get NAMN`, `netlify env:set NAMN varde --secret` |
| Utskickets minne | `netlify blobs:get utskick skickat` (lagret utskick, nyckeln skickat) |
| Funktionsloggar | `netlify logs --source functions --function utskick --json --since 30m` |
| Funktioner lokalt | `netlify functions:serve` eller `netlify dev` (läser produktionens variabler) |

Miljövariablerna i Netlify: `BREVO_API_KEY` (hemlig), `UTSKICK_HEMLIGHET` (hemlig), `BREVO_LIST_ID` (2), `BREVO_DOI_TEMPLATE_ID` (1), `SITE_URL` (https://niclasfohlin.se), `NODE_VERSION` (22.12.0).

Utskicket efter deploy: byggpluginen `netlify/plugins/utskick` (onSuccess, bara produktion) anropar funktionen `netlify/functions/utskick.mjs` på den nya deployen; logiken i `netlify/lib/utskick.mjs` läser `nytt.json` ur bygget, jämför med lagret och skapar och skickar en Brevo-kampanj "Nytt <datum>: <titlar>" om det som tillkommit. Lagret uppdateras i två steg (skapar, skapad, skickad, eller avbruten med fel), så ett misslyckat utskick upprepas aldrig; en avbruten kampanj skickas för hand i Brevo. Första körningen på en ny rigg registrerar allt utan att skicka.

Efter varje push: kontrollera att deployen är `ready`, läs lagret om innehåll tillkommit, och öppna sidan som ändrats.

## Brevo

Kontot är niclas.fohlin@gmail.com på gratisplanen (300 mejl per dag). IP-begränsningen (Security, Authorised IPs) måste förbli avstängd, annars stoppas Netlify. Det som finns:

| Vad | Läge |
|---|---|
| Lista 2 Prenumeranter | dit formuläret på /prenumerera lägger kontakter med dubbel opt-in |
| Mall 1 Bekräfta prenumeration | dubbel opt-in, avsändare id 2, svar till Gmail |
| Avsändare id 1 | Niclas Fohlin <niclas.fohlin@gmail.com>, verifierad via mejl, används inte längre |
| Avsändare id 2 | Niclas Fohlin <nyhetsbrev@niclasfohlin.se>, aktiv på autentiserad domän; det är den utskicken använder (`AVSANDARE` i `netlify/lib/utskick.mjs`, svar till `SVAR_TILL`) |
| Domänen niclasfohlin.se | autentiserad 2026-09-21: DKIM via två CNAME, brevo-code som TXT på roten, DMARC p=none på _dmarc |
| Kampanjer | "Nytt <datum>: <titlar>" skapas av utskicket; längre nyhetsbrev skrivs med `/utskick` och skickas bara på Niclas ord |

Kommandon: `node scripts/brevo.mjs status`, `doman`, `autentisera`, `kampanjer [antal]`, `anrop <METOD> <sökväg> [json]`. API-dokumentationen: https://developers.brevo.com/reference. Ändra aldrig avsändare eller mall utan att skriva in det nya läget här.

## Google Drive-knappen

Vid varje Word-fil finns valet Word, Drive och för lathunden pdf (`src/components/Filval.astro`). Drive-knappen sparar filen i läsarens egen Google Drive genom Googles Drive-API med behörigheten `drive.file` (bara filer sajten själv skapar), helt i webbläsaren (`src/scripts/drive.ts`); Googles skript laddas först när någon trycker. Den kräver ett OAuth-klient-id för webb från ett Google Cloud-projekt som Niclas äger: konsentskärm av typen extern med appnamnet niclasfohlin.se, behörigheten drive.file (icke känslig, ingen granskning av Google), publicerad, och en klient med tillåtna JavaScript-ursprung `https://niclasfohlin.se` och `http://localhost:4321` till `4326`. Klient-id:t är ingen hemlighet och står i `src/data/site.ts` som `driveKlientId`; tomt betyder att knapparna inte visas. Steget för Niclas står i INSTRUKTIONER.docx.

## Loopia och domänen

niclasfohlin.se är registrerad hos Loopia till 2027-09-19, DNS hos Loopia (ns1 och ns2.loopia.se, zonen är DNSSEC-signerad). LoopiaAPI hanterar bara domäner och DNS; e-postalias skapas av Niclas i Loopia Kundzon (steget står i INSTRUKTIONER.docx när det behövs).

| Uppgift | Kommando |
|---|---|
| Alla poster för roten | `python scripts/loopia.py poster` (eller `poster www`, `poster _dmarc`) |
| Lägg till | `python scripts/loopia.py lagg <subdomän> <TYP> <värde> [ttl] [prio]` |
| Ändra, ta bort | `andra <subdomän> <record_id> <TYP> <värde> [ttl]`, `tabort <subdomän> <record_id>` |

Zonen 2026-09-21:

| Post | Värde | För |
|---|---|---|
| @ A | 75.2.60.5 | Netlifys lastbalanserare |
| www CNAME | niclasfohlin.netlify.app | Netlify |
| @ MX 10, 20 | mailcluster.loopia.se, mail2.loopia.se | Loopias vidarebefordran av mejl till nyhetsbrev@ |
| @ TXT | brevo-code:… | Brevos ägarkontroll |
| _dmarc TXT | v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com | DMARC |
| brevo1._domainkey, brevo2._domainkey CNAME | b1 och b2.niclasfohlin-se.dkim.brevo.com | DKIM |

Lärdom om DNS: ett uppslag som görs innan posten finns cachas som "finns inte" i upp till en timme (zonens negativa TTL). Lägg till posten, kontrollera mot ns1.loopia.se (`Resolve-DnsName <namn> -Type TXT -Server 93.188.0.20`), och be först därefter tjänsten kontrollera.

## Codex

Second opinion från Codex CLI (gpt-6-astra, xhigh; config i `~/.codex/config.toml`), i bakgrunden, fem till tio minuter:

```
cat prompt.txt | codex exec -m gpt-6-astra -c model_reasoning_effort=xhigh --sandbox read-only --skip-git-repo-check -o svar.md -
```

Bilder bifogas med `-i fil.png`. Codex läser koden och `dist/` men har ingen webbläsare. I read-only ändrar den inget; med workspace-write kontrollera `git status` efteråt. För metoder finns `node scripts/metodgranskning.mjs <id>`, se METODER.md. Claude Code adjudicerar alltid svaret: det som stärker sajten genomförs, det som är Niclas beslut skrivs i NATTEN.md.

## När något är rött

Bygget rött: läs `error_message` i deployen och bygglogen (`netlify api getSiteDeploy --data '{"deploy_id":"<id>"}'`), laga på en ny commit eller backa med `git revert`, pusha en gång. Utskicket avbrutet: lagret visar `senast.status` och `senast.fel`; skicka kampanjen för hand i Brevo och skriv vad som hände i NATTEN.md. Formuläret svarar 503: en miljövariabel saknas i Netlify. Inloggning som slutat gälla: `gh auth login` eller `netlify login` i bakgrunden, Niclas klickar.
