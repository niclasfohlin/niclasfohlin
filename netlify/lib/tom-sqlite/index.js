// Kommentarerna (Waline) använder Postgres. Waline laddar SQLite-drivrutinen i en try, och den
// här tomma klassen står i dess ställe så att better-sqlite3 aldrig installeras eller kompileras.
module.exports = class {};
