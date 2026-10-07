# niclasfohlin.se, ingången för Codex

Reglerna för sajten står i tre filer, och den här filen upprepar dem inte. Läs dem innan du gör något. Där det står Claude Code gäller regeln också dig.

| Fil | Vad den svarar på |
|---|---|
| CLAUDE.md | Vad sajten är, mandatet, vad bara Niclas gör och var allt annat står |
| ARBETSSATT.md | Hur arbetet går till: grenar, valideringen, uppladdningen, kön, taggarna, drift och hemligheter |
| STIL.md | Hur text skrivs |

Det som bara gäller Codex:

| Sak | Vad som gäller |
|---|---|
| Uppdraget | Codex är oftast andra ögat. En granskning körs i läsläge med en prompt ur `scripts/codex/`, och Claude Code avgör fynden (DRIFT.md under Codex, METODER.md under Codex-granskningen) |
| Speglingen | `.codex/` och `.agents/skills/` är Codex-speglingen av `.claude/`: krokarna i `.codex/hooks.json` med skripten i `.codex/hooks/`, agenten `.codex/agents/granskare.toml` och arbetsflödena `source-command-natt/SKILL.md`, `source-command-uppstart/SKILL.md`, `source-command-utskick/SKILL.md` och `source-command-validera/SKILL.md`. Speglingen är äldre än `.claude/` (K-246). Säger den något annat än CLAUDE.md och ARBETSSATT.md gäller de filerna |
