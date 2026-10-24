## Verktyget

Din webbläsare är redan igång. Varje kommando är ett anrop i skalet:

```
node "{{skript}}" {{port}} <kommando> [argument]
```

| Kommando | Vad det gör |
|---|---|
| `oppna <adress>` | öppnar en sida |
| `ladda`, `tillbaka`, `adress` | laddar om, går tillbaka i historiken, eller visar adressen |
| `telefon`, `dator` | skärmen som en iPhone eller en dator (telefon från början) |
| `datum <ÅÅÅÅ-MM-DD>`, `datum av` | låtsas att det är en annan dag (sidan laddas om) |
| `text`, `text <rubrik>` | sidans text, eller en del av den |
| `knappar` | det som går att trycka på, skriva i eller välja, numrerat, med adressen när det är en länk |
| `tryck <nr eller text>` | trycker, efter numret i senaste `knappar` eller efter orden på knappen |
| `skriv <nr eller etikett> <text>` | skriver i ett fält; `\n` ger en ny rad |
| `valj <nr eller etikett> <alternativ>` | väljer i en lista |
| `kryss <nr eller etikett>` | kryssar i eller ur en ruta |
| `rulla ned`, `rulla upp`, `rulla topp`, `rulla botten`, `rulla <nr>` | rullar |
| `bild <namn>`, `bild <namn> hel` | bild av skärmen eller av hela sidan |
| `kopierat` | texten som sidan senast kopierade |
| `filer` | filerna som sidan har hämtat, med början av textfilerna |
| `besked` | beskedet längst ned på skärmen och notisen överst |

Numren i `knappar` gäller tills sidan ändras; ta `knappar` igen efter ett tryck som ändrar sidan. Sidans text visar etiketter med versaler, så "Din insats" kan stå som DIN INSATS. En knapp som skriver ut öppnar en pdf, och ett lektionskort öppnas i en ny flik; verktyget visar inte det, så räkna inte det som ett fel, men skriv om knappen saknas eller leder till fel adress.
