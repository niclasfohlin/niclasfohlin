---
description: Förbered ett nyhetsbrev från det som publicerats sedan förra utskicket. Skickar aldrig.
---
1. Läs utskick/SENASTE.md om den finns. Den innehåller datumet för förra utskicket. Finns den inte: utgå från de senaste 30 dagarna.
2. Lista artiklar, metoder och böcker med datum efter det. Inga utkast.
3. Skriv ett utkast till nyhetsbrev enligt STIL.md: en kort hälsning, en rubrik och två meningar per post med länk till sidan på niclasfohlin.se, avslutning som landar i något läsaren kan göra. Inga punktlistor.
4. Spara till utskick/<datum>.md. Uppdatera utskick/SENASTE.md med dagens datum först när utskicket är skickat.
5. Skicka aldrig utan Niclas ord. Berätta att utkastet ligger i utskick/. Vill han: lägg upp det som kampanj i Brevo med `node scripts/brevo.mjs anrop POST /emailCampaigns <json>` (avsändare id 2, lista 2, som i netlify/lib/utskick.mjs) utan att skicka, och skicka med `anrop POST /emailCampaigns/<id>/sendNow` först när han läst utkastet och sagt skicka. Mejlen om nytt innehåll går automatiskt efter deploy och rör inte det här.
