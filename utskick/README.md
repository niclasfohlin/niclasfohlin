# Utskick

Två sorters mejl går till prenumeranterna i Brevo (listan Prenumeranter).

Mejl om nytt innehåll går automatiskt. Byggpluginen `netlify/plugins/utskick` (logiken i `netlify/lib/utskick.mjs`) körs i steget onSuccess efter varje lyckad produktionsdeploy, läser `nytt.json` ur den byggda sajten (alla publicerade artiklar, metoder och böcker), jämför med det som redan mejlats i Netlify Blobs (lagret `utskick`, nyckeln `skickat`) och skickar en Brevo-kampanj om det som tillkommit. Första körningen registrerar allt utan att skicka. Resultatet står i deployens sammanfattning i Netlify och i bygglogen; kontrollera lagret med `netlify blobs:get utskick skickat`.

Längre nyhetsbrev skrivs med `/utskick` och landar här som utkast. `SENASTE.md` innehåller bara datumet för det senast skickade. Ingen text i den här mappen skickas automatiskt; Niclas läser, justerar och säger skicka.
