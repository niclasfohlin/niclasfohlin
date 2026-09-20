---
name: "source-command-validera"
description: "Kontrollera taggar, typer och bygge. Sammanfatta vad som behöver rättas."
---

# source-command-validera

Use this skill when the user asks to run the migrated source command `validera`.

## Command Template

Kör npm run validera. Om något stoppar: förklara felet med en mening, rätta det om det är entydigt vad som ska göras, och kör igen. Om rättningen kräver ett beslut (ny tagg, ny publikation, borttagen post): föreslå och fråga.

Rapportera till sist med tre rader: vad som kontrollerades, vad som rättades, vad som väntar på Niclas.
