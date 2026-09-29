// Delningsraden är ett lager som kommentarerna (src/lib/kommentarer.ts): false tar bort raderna och skriptet från
// artiklar, metoder och böcker vid nästa bygge. Knapparna och skriptet ligger i src/components/Delning.astro; se
// DRIFT.md under Delningsraden. Flaggan ligger här och inte i site.ts, eftersom lathundarnas pdf görs om när site.ts ändras.
export const delningPa = true;
