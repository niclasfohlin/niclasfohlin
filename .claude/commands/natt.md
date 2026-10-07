---
description: Arbeta självständigt igenom kön och skriv en morgonrapport.
---
Det här är en nattkörning. Niclas läser rapporten i morgon och tar inga beslut nu.

1. Kör `node scripts/ko.mjs inkorg` och sedan `node scripts/ko.mjs lista`. Den körbara kön är nattens arbete, prio 1 först. Blockerat och vilande rörs inte.
2. Skapa grenen natt/<datum> från main: `git switch main && git switch -c natt/<datum>`. Ta en post i taget: `node scripts/ko.mjs starta K-0xx --gren natt/<datum>`. Svara på relevansfrågorna som skrivs ut innan du rör något. Gör arbetet som en eller flera commits på grenen, med `npm run validera` grönt före varje commit, och stäng posten med `node scripts/ko.mjs klar K-0xx --atgard "<vad som gjordes>"`. Visar sig posten onödig: `node scripts/ko.mjs stang K-0xx --skal "<underlaget>"`. Kräver den Niclas: `node scripts/ko.mjs blockera K-0xx --behovs "<vad>"`.
3. Ta egna beslut i frågor om innehåll, design, kod och drift. Det enda som blockeras är det som bara Niclas gör (listan i CLAUDE.md).
4. Hittar du något under arbetet gäller ARBETSSATT.md under Kön: det lilla lagas i samma post, resten läggs med `node scripts/ko.mjs lagg "<vad>" --var <fil> --ur K-0xx`. Vägrar `klar` för att posterna är för många: leta efter roten i stället för att lägga fler.
5. Fastnar du på en post i mer än några försök: lämna den, skriv varför i rapporten och gå vidare. Posten står kvar som pågår tills nästa körning avgör.
6. När kön är genomarbetad, och först då: `git switch main && git merge --ff-only natt/<datum>` och sedan, som ett eget kommando, `git push` (skälet står i ARBETSSATT.md under Uppladdning). En enda push för hela natten. Märket för en push utan bygge, vad som gäller när kreditspärren är stängd och kontrollen efter pushen står i ARBETSSATT.md under Uppladdning; är spärren stängd skrivs det först i NATTEN.md. Blev bygget rött: laga på en ny commit eller backa med `git revert`.
7. Skriv rapporten till NATTEN.md i repots rot. Skriv över filen, den ska inte växa. Innehåll: vad som gjordes med post-id och commit-hash, vad som ligger ute och var det syns, vad som blockerades och varför, beslut Niclas ska känna till, vad du föreslår som nästa steg, samt utdraget ur `node scripts/ko.mjs lista --alla`. Kräver ett steg Niclas i webbläsaren: skriv det i INSTRUKTIONER.docx också.
