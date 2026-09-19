---
description: Arbeta självständigt igenom kön och skriv en morgonrapport.
---
Det här är en nattkörning. Niclas läser rapporten i morgon och tar inga beslut nu.

1. Kör `node scripts/ko.mjs inkorg` och sedan `node scripts/ko.mjs lista`. Den körbara kön är nattens arbete, prio 1 först. Blockerat och vilande rörs inte.
2. Skapa grenen natt/<datum> från main: `git switch main && git switch -c natt/<datum>`. Ta en post i taget: `node scripts/ko.mjs starta K-0xx --gren natt/<datum>`. Svara på relevansfrågorna som skrivs ut innan du rör något. Gör arbetet som en eller flera commits på grenen, med `npm run validera` grönt före varje commit, och stäng posten med `node scripts/ko.mjs klar K-0xx --atgard "<vad som gjordes>"`. Visar sig posten onödig: `node scripts/ko.mjs stang K-0xx --skal "<underlaget>"`. Kräver den Niclas: `node scripts/ko.mjs blockera K-0xx --behovs "<vad>"`.
3. Ta egna beslut i frågor om innehåll, design och kod. Det enda som blockeras är sådant som kräver Niclas enligt CLAUDE.md: push, deploy, hemligheter, massutskick, personfakta om Niclas och rättigheter till hela texter.
4. Hittar du något under arbetet: laga det i samma post om det är litet. Annars `node scripts/ko.mjs lagg "<vad>" --var <fil> --ur K-0xx`. Klar vägrar över två sådana poster; leta då efter roten i stället för att lägga fler.
5. Fastnar du på en post i mer än några försök: lämna den, skriv varför i rapporten och gå vidare. Posten står kvar som pågår tills nästa körning avgör.
6. Skriv rapporten till ../niclasfohlin-nattlogg.md, alltså en mapp upp från repot. Skriv över filen, den ska inte växa. Innehåll: vad som gjordes med post-id och commit-hash, vad som blockerades och varför, vad du föreslår som nästa steg, utdraget ur `node scripts/ko.mjs lista --alla`, samt exakt vilka kommandon Niclas kör för att granska grenen och slå ihop den (git log main..natt/<datum> --oneline, git diff main..natt/<datum> --stat, git switch main && git merge natt/<datum> && git push).
7. Pusha inte. Slå inte ihop med main.
