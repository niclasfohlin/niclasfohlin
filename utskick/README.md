# Utskick

Två sorters mejl går till prenumeranterna i Brevo (listan Prenumeranter).

Mejl om nytt innehåll går automatiskt. `netlify/functions/deploy-succeeded.mjs` körs efter varje lyckad deploy av main, läser `/nytt.json` (alla publicerade artiklar, metoder och böcker), jämför med det som redan mejlats i Netlify Blobs (lagret `utskick`, nyckeln `skickat`) och skickar en kampanj om det som tillkommit. Första körningen registrerar allt utan att skicka. Kontrollera läget med `netlify blobs:get utskick skickat`.

Längre nyhetsbrev skrivs med `/utskick` och landar här som utkast. `SENASTE.md` innehåller bara datumet för det senast skickade. Ingen text i den här mappen skickas automatiskt; Niclas läser, justerar och säger skicka.
