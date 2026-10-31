// Det minsta som sidornas skript delar utan att läsa in standarden (K-644): appens skript står på varje sida i appens delar
// (src/scripts/appdelen.ts) och ska vara litet. src/scripts/insatser-lagring.ts lämnar dem vidare till planens sidor.

/** Dagens datum i läsarens egen tid, ÅÅÅÅ-MM-DD. */
export const idagLokalt = () => new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/** GoatCounter, när count.js har laddats; det laddas bara på sajtens egen adress (Base.astro) och kan vara stoppat. */
export const goatcounter = () => (window as { goatcounter?: { count?: (v: object) => void } }).goatcounter;
