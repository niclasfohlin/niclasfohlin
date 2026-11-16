// Sådden i Metoder: sajtens register per verktyg, eftersom metodernas filer är riggens och inte ändras när ett verktyg sås
// (K-702). Strategierna står i src/data/strategier-i-metoder.json, strukturerna i src/data/strukturer-i-metoder.json och
// verktyget Innehåll i src/data/innehall-i-metoder.json (K-796). En rot för vävningen (src/lib/vav.ts), för kontrollen att
// en sak visas och för rutan Verktyg och Stödmaterial (src/lib/centrala.ts, Verktygsruta.astro), så att ett verktyg som bara
// sås i Metoder, som Innehåll (Niclas 2026-11-15: ”Denna är mer för metoder. Så stödundervisning behöver den inte”), räknas
// som visat utan en särskild regel på varje ställe.
import strategierIMetoder from '../data/strategier-i-metoder.json';
import strukturerIMetoder from '../data/strukturer-i-metoder.json';
import innehallIMetoder from '../data/innehall-i-metoder.json';
import innehalletsForslag from '../data/innehall/sadd-forslag.json';

/** En plats i en metod i Metoder: efter är platsen (steg N, karna: <komponent>, tabell: <rubrik> eller arbetsomradet),
 *  delar id:n på verktygets delar, om delen av lektionen och slag hur delen hör till metoden. mening är kortets rad när
 *  verktyget självt är kortet, som Innehåll, med riggens mening för just det valet i metoden. */
export type Metodplats = { efter: string; form?: 'kort' | 'ruta'; delar?: string[]; om?: string; slag?: 'form' | 'forslag'; mening?: string };
type Register = Record<string, { platser?: Metodplats[] } | string | undefined>;
const platserI = (r: Register) => (metod: string): Metodplats[] => { const x = r[metod]; return typeof x === 'object' ? x.platser ?? [] : []; };

// Innehålls mening till kortet läses ur riggens leverans (src/data/innehall/sadd-forslag.json, som scripts/innehall/intag.mjs
// skriver), så att den har en rot och följer med nästa leverans; sajtens register har platsen, delen av lektionen och skälet
// (Codex 2026-11-15). scripts/innehall/prov.mjs stannar när riggen föreslår en annan plats än registrets.
const innehalletsMeningar = new Map(((innehalletsForslag as { sadd?: { metod: string; plats: string; mening: string }[] }).sadd ?? []).map((x) => [x.metod, x]));
/** Riggens förslag för metoden: platsen och meningen. */
export const innehalletsForslagFor = (metod: string) => innehalletsMeningar.get(metod);

/** Verktygen som sås i Metoder och platserna i en metod, per verktyg. */
export const METODERS_SADD: Record<string, (metod: string) => Metodplats[]> = {
  strategier: platserI(strategierIMetoder as unknown as Register),
  strukturer: platserI(strukturerIMetoder as unknown as Register),
  innehall: (metod) => platserI(innehallIMetoder as unknown as Register)(metod).map((p) => ({ ...p, mening: innehalletsMeningar.get(metod)?.mening })),
};
const REGISTREN: Record<string, Register> = { strategier: strategierIMetoder as unknown as Register, strukturer: strukturerIMetoder as unknown as Register, innehall: innehallIMetoder as unknown as Register };

/** Sås saken i någon metod i Metoder? Metoderna är registrets, utan _om. */
export function sasIMetoder(sak: string): boolean {
  const r = REGISTREN[sak];
  if (!r) return false;
  return Object.keys(r).filter((k) => !k.startsWith('_')).some((m) => (METODERS_SADD[sak]?.(m) ?? []).length > 0);
}
