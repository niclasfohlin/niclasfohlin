---
description: Sätt igång projektet steg för steg. Verktyg, GitHub, Netlify, domän och Brevo.
---
Läs UPPSTART.md och gå igenom stegen i ordning. Börja alltid med att ta reda på nuläget innan du föreslår något:

node -v, git --version, gh --version, gh auth status, netlify --version, netlify status, git remote -v, git log --oneline -3.

Rapportera kort vad som redan är klart och vad som återstår. Gör sedan det som är ditt enligt ansvarstabellen i UPPSTART.md.

När ett steg kräver att Niclas gör något i webbläsaren eller i sin egen terminal: skriv exakt vilket kommando han ska köra eller vad han ska klicka, vänta på att han säger klart, och verifiera sedan med ett kommando innan du går vidare.

Kör aldrig interaktiva inloggningar själv (gh auth login, netlify login, netlify init). De hänger i din terminal. Sätt aldrig hemligheter själv och be aldrig Niclas klistra in en nyckel i chatten. Han kör netlify env:set i sin egen terminal, du verifierar med netlify env:list att namnet finns.

Avsluta med att bocka av checklistan i UPPSTART.md, committa på en gren och berätta vad nästa steg är.
