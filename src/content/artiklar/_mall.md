---
# Mall för artikel. Filer som börjar med _ läses inte in av sajten.
# Filnamn: kort slug utan datum, t.ex. nej-till-no-excuses.md
titel: "Artikelns titel"
ingress: "Egen ingress på två till fyra meningar som beskriver vad texten säger, utan att kopiera originalets ingress."
datum: 2026-01-01
# id från src/data/publikationer.json, t.ex. vi-larare, goteborgs-posten, egen
publikation: "vi-larare"
originalUrl: "https://www.vilarare.se/..."
# artikel, kronika, debatt, intervju, podd eller annat
typ: "kronika"
# Bara i en replik eller slutreplik, som har typ debatt: texten den svarar på, med länk när den finns. En replik svarar
# på någon annans text, en slutreplik på någons replik till Niclas text, och svarade är då Niclas text på sajten.
# replik:
#   slag: "slutreplik"
#   titel: "Rubriken på texten den svarar på"
#   av: "Författaren"
#   tidning: "Vi Lärare"
#   url: "https://www.vilarare.se/..."
#   svarade: "id-pa-niclas-text"
medforfattare: []
# id från src/data/taggar.json. Återanvänd före att lägga till.
taggar: ["skolpolitik"]
utvald: false
# Alltid sant för Niclas egna texter (hans besked 2026-09-24). Falskt bara för poddavsnitt
# och intervjuer där texten är någon annans.
heltext: true
utkast: true
---

Hela originaltexten ur bladet i underlag/texter, ordagrant. Är heltext falskt (podd,
intervju) kan här i stället ligga en egen kommentar eller en bakgrund.
