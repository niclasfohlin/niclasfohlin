---
name: strukturbilder
description: Rita eller rätta en bild till verktyget Strukturer (K-650) med bildmotorn i scripts/strukturer/. Läs den innan en scen skrivs, en bild ritas om, motorn ändras eller en bild granskas, också när grundbokens bank får en ny struktur.
---

# Strukturbilder

Varje struktur i verktyget Strukturer har en bild som gör att läraren känner igen strukturen och ser den framför sig när den görs (Niclas 2026-10-31: "Bilderna ska enkelt göra att man kan identifiera strukturen och se den framför sig när den sker"). Bilderna ritas av en motor ur en kort scenfil per struktur, i stilen ur Niclas referensbilder, så att alla bilder blir lika och en rättning i motorn slår igenom i alla. Ingen bild ritas för hand och ingen svg rättas för hand: rätta scenen eller motorn.

Uppdraget i sin helhet står i `underlag/prov/strukturer/UPPDRAGET.md` (git ignorerar mappen; den finns på Niclas dator).

## Reglerna för en bild

Niclas gav dem 2026-10-31 när han såg de första bilderna. De gäller varje bild.

| Regel | Niclas ord | Så prövas den |
|---|---|---|
| En huvudscen | "helst EN [scen] för en struktur. Inte en stökig med flera sekvenser. En strukturs huvudscen" | Bilden visar det ögonblick som bäst känns igen, utan rutor eller flera steg. Granskaren prövar det |
| En grupp eller en klass, alla i fokus | "En grupp. Eller en hel klass (men färre än 12 figurer jämt i fokus" | Motorn stannar på en scen med fler än elva figurer (`HOGST_FIGURER` i `rita.mjs`). Inga små figurer långt bak |
| Lärandet syns mellan eleverna | "Man vill se lärandet 'mellan' elevens och hur de pekar, tänker, lutar sig in mot ett gemensamt material" | Scenen använder `tittar`, `pekar`, `nar` och `lutar` mot varandra eller mot det gemensamma materialet. Ingen tittar ut ur bilden utan skäl |
| Bubblorna bär strukturen | "deras pratbubblor handlar om stilistiskt något i strukturen. Inte bara på måfå. Dvs om de berättar vad de tänker, eller annat" | Varje bubbla har fältet `visar`, och motorn stannar annars. Tankebubbla när någon tänker själv, pratbubbla när någon säger det, samma symbol hos två när de är överens eller när den ena tar upp det den andra sa, frågetecknet när någon frågar |
| Figurerna skiljer sig lite, utan kön | "Lite skillnad i smal eller lite kraftigare kropp. Och lite skillnad i storlek också. De ska inte gå att se pojke eller flicka" | Motorn ger varje figur hudton, byggnad och längd ur sin plats i scenen. Inget hår, samma kläder |
| Skarp i A5, liten på sidan | "Ska vara en halv A4a och inte se suddiga ut. Men också optimeras för hur de ska komprimeras för sina färger" | Sidan får svg (8–26 kB komprimerad i piloten). Utskriften får png i 1600 punkter med en palett av så få färger som bilden tål. Kritan är vektorstreck, inte brus |
| Ingen text i bilden | UPPDRAGET.md under Bilderna | Namnet står i sajtens typsnitt, aldrig i bilden. Symboler i bubblorna, aldrig ord |

Det som skiljer lika strukturer åt står i förgrunden: EPA, EPK och APE; Rondellen, Runda bordet och Talkort; Speed-dating och Inre–yttre cirkel. Den som skriver en scen läser stegen i grundbokens bank först (`C:/grundbok-repo/docs/strukturer.md`) och följer dem: Inre–yttre cirkel har en ring som flyttar sig, inte två, eftersom stegen säger så.

## Stilen

Stilen är mätt i referensbilderna (`underlag/prov/strukturer/referens/`, Niclas egna, inte i git) med `scripts/strukturer/matstil.mjs`, som skriver delen `matt` i `scripts/strukturer/stil.json`. Motorn läser `linje` och `krita` därifrån.

Enkla figurer med runda, kala huvuden som ägg och små ansikten, olika hudtoner, en tunn mörkgrå linje som darrar lite och har små glipor, och färg som krita eller akvarell i korta drag åt flera håll, som glider lite ur linjen. Huden är slätare än kläderna. Vit bakgrund och mycket luft, omkring 85 procent vitt. Bord och saker i enkel linjeteckning.

## Motorn

| Fil | Vad |
|---|---|
| `scripts/strukturer/rita.mjs` | Läser en scen och ritar den till svg, och med `--png` till png. Beskär bilden efter innehållet i formen 900 × 560 |
| `scripts/strukturer/figurer/penna.mjs` | Pennan: linjen, kritans mönster, slumpen ur ett fast frö. Varje form skrivs en gång och används för botten, färg och linje |
| `scripts/strukturer/figurer/figur.mjs` | Figuren: skelettet, ställningarna, bålen, armarna med två leder, huvudet och ansiktet |
| `scripts/strukturer/figurer/saker.mjs` | Bord, papper, bollar, kort, pennor, klocka, bubblor, symboler, pilar, ringar på golvet |
| `scripts/strukturer/symboler.mjs` | Symbolerna och färgerna för Par, Grupp och Klass, en rot för kortet, filtret och sidan |
| `scripts/strukturer/likhet.mjs` | Likhetsprovet: ritar om referenserna ur `scripts/strukturer/likhet/` och ställer dem sida vid sida |
| `scripts/strukturer/scener/` | En scen per struktur, `<id>.yaml` |

```
node scripts/strukturer/rita.mjs scripts/strukturer/scener/<id>.yaml --ut <mapp> --png 900
node scripts/strukturer/likhet.mjs
node scripts/strukturer/matstil.mjs
```

## Scenen

En scen är en lista av delar som ritas i ordning: det som står längre fram i bilden står senare i listan.

```yaml
# Kloka pennan: tänkaren löser uppgiften högt, och den med kloka pennan skriver ned det tänkaren säger.
id: kloka-pennan
skala: 80            # huvudets höjd i bildens enheter
djup: false          # sant: figurer längre bak blir lite mindre
delar:
  - figur: { namn: tankaren, x: 395, y: 436, stallning: sitta, utanBen: true, ansikte: prata,
             tittar: bladet, lutar: bladet, pekar: [448, 392], armarEfter: bladet }
  - figur: { namn: skrivaren, x: 540, y: 440, stallning: sitta, utanBen: true, ansikte: skriva,
             tittar: bladet, lutar: bladet, nar: { V: [488, 376], H: [530, 400] }, armarEfter: bladet }
  - bord: { x: 300, y: 470, b: 330, d: 100, h: 55, snett: 20 }
  - papper: { namn: bladet, x: 466, y: 398, b: 96, h: 58, vinkel: -6, symbol: triangel }
  - penna: { x: 474, y: 400, vinkel: 150, l: 50 }
  - bubbla: { till: tankaren, dx: -55, dy: 44, symboler: [triangel],
              visar: "Tänkaren säger lösningen högt, och skrivaren skriver ned just det" }
```

| Fält på en figur | Vad |
|---|---|
| `x`, `y` | Där fötterna står. En figur som sitter har fötterna på golvet under stolen |
| `stallning` | `sta`, `staHanderFram`, `kasta`, `handUpp`, `highFiveH`, `halla`, `armarIKors`, `tanka`, `pekaH`, `gaH`, `handPaAxel`, `sitta` och fler i `STALLNINGAR` i `figur.mjs` |
| `ansikte` | `glad`, `skratt`, `prata`, `tanka`, `skriva`, `kisa`, eller `bak` för en figur som syns bakifrån |
| `tittar`, `lutar`, `pekar` | En punkt `[x, y]` eller ett namn i scenen: en sak, en `punkt`, en figur (dess huvud) eller `figur.V`, `figur.H`, `figur.axelV`, `figur.axelH` |
| `nar` | `{ V: mål, H: mål }`: handen når målet, och armen räknas ut med två leder |
| `armarEfter` | Namnet på en sak som armarna ska ritas efter, som papperet på ett bord |
| `utanBen` | Figuren är en byst, bakom ett bord eller längst fram i bilden |
| `trojan`, `byxor`, `hud`, `bygg`, `storlek` | Sätts av motorn ur figurens plats; sätt dem bara med skäl |

Saker: `bord`, `papper` (med `rader`, `symbol` eller `rutor: 4` för fyra fält och en ruta i mitten), `boll`, `kort`, `penna`, `klocka`, `tavla` (med `rutor` eller `rader`), `tarning`, `markor`, `pil`, `rorelse`, `stralar`, `golvring`, `golvlinje` och `punkt` (ett namn att peka mot, som inte ritas). En sak kan sitta i en hand med `hand: [figurens namn, V eller H]`.

## Så komponeras en scen

Det här lärde pilotbilderna (2026-10-31). Rita, titta på bilden i full storlek och i 300 punkters bredd, rätta scenen och rita igen.

| Situationen | Så |
|---|---|
| Elever som sitter bakom ett bord | `stallning: sitta` och `utanBen: true`. Bordets framkant omkring 0,4 H under figurens `y` och djupet `d` omkring 1,2 H, så att bålen syns ovanför skivan. Papperet nära bordets bakkant, nära eleverna. `armarEfter` med papperets namn, så att armarna ligger på skivan. Korta bordsben (`h` 50–60) när benen bara tar plats |
| En hand som ska nå något | Armen är omkring 1,3 H lång från axeln. Ett mål längre bort ger en rak, stel arm: flytta figuren närmare i stället. En hand på papperet med pennan: `nar` till pennans övre ände och pennan med spetsen på papperet, ritad efter armarna |
| Två som möts | `tittar` på varandra och `lutar` mot varandra. En high five: båda `nar` samma punkt strax ovanför huvudena, inom räckhåll, och `stralar` där |
| En ring eller ett led | `golvring` eller `golvlinje` först, under figurerna, så att formen syns. Figurerna längst bak först i listan. Färre och tydligare figurer hellre än en folkhop: fyra par läses bättre än tio |
| En figur som syns bakifrån | `ansikte: bak`, och den står längre fram i bilden och lite vid sidan, så att den inte täcker den den talar med |
| Bubblorna | `dx` och `dy` från huvudets topp. En bubbla per sak som strukturen bär, högst tre i en bild. Samma symbol hos två när de är överens eller när den ena tar upp det den andra sa |
| Storleken | Bilden beskärs efter innehållet, så luften styrs av hur figurerna står. Högst elva figurer. En grupp vid ett bord: `skala` 70–80. En klass i en ring: 55–65 |
| Det som skiljer | Läs stegen och leta efter det som bara den här strukturen har: lapparna i luften, ringen som flyttar, rutan i mitten, papperet som går runt, kortet på ryggen. Det ska synas först |


## Likhetsprovet

Motorn provas mot Niclas referenser innan nya bilder ritas och efter varje ändring i motorn. `likhet.mjs` ritar arket. En granskare läser det med de här frågorna och svarar ja eller nej och sedan det den ser:

1. Linjen: tjocklek, ojämnhet och färg som referensernas?
2. Proportionerna: huvudet mot kroppen, bålens, armarnas och benens form?
3. Färgerna och hudtonerna: samma familj?
4. Ytorna: krita eller akvarell som går lite utanför linjen?
5. Luften: lika mycket vitt, lika enkla bord och saker?
6. Levande eller stela figurer?
7. Syns lärandet mellan eleverna, och bär bubblorna strukturen?

Referensernas EPA och APE har tre lägen i en bild. Likhetsprovet ritar dem så, eftersom det jämför stilen med just de bilderna (`likhetsprov: true` i scenen); strukturernas bilder har en huvudscen.

## Granskningen av en bild

En granskare läser tio bilder och strukturernas steg (mallen i `underlag/prov/strukturer/mallar/bildgranskare.md`) och prövar reglerna ovan: att bilden visar strukturen när den görs, att den inte förväxlas med en annan, att lärandet syns mellan eleverna och att varje bubbla bär det som dess `visar` säger.
