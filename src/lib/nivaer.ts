// Nivåerna i en metod med nivåer (De fyra räknesätten i grupp: Bas, Medel och Avancerad, Niclas 2026-10-04, fältet
// nivaer). Ett led i en räknebladsrubrik som heter som en nivå blir en skylt i nivåns färg före rubriken, på sidan
// (Elevlista.astro) och i Word (metoddocx.ts), som nivåknappen på Textsamtals boksidor, och ledet står då inte kvar i
// rubriken: "Före och efter · Bas · Räkna i rutnätet" blir skylten Bas och "Före och efter · Räkna i rutnätet".
// scripts/paritet.mjs prövar rubriken med nivån först. Inga Node-beroenden, så att den också kan köras i webbläsaren.
export interface Niva { namn: string; farg: string }

/** Listans nivå och rubriken utan nivåns led, eller rubriken som den är. */
export function listansNiva(nivaer: Niva[], rubrik?: string): { niva?: Niva; rubrik?: string } {
  if (!rubrik || !nivaer.length) return { rubrik };
  const led = rubrik.split(' · ');
  const i = led.findIndex((x) => nivaer.some((n) => n.namn === x.trim()));
  if (i < 0) return { rubrik };
  return { niva: nivaer.find((n) => n.namn === led[i].trim()), rubrik: led.filter((_, j) => j !== i).join(' · ') };
}

// Skyltens text i den färg som ger störst kontrast mot nivåns färg: mörk på gult, vit på grönt och rött.
const kanal = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const luminans = (hex: string) => { const n = parseInt(hex, 16); return 0.2126 * kanal((n >> 16) & 255) + 0.7152 * kanal((n >> 8) & 255) + 0.0722 * kanal(n & 255); };
const kontrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
export const MORK = '14202B';
export function skyltText(farg: string): string {
  const l = luminans(farg);
  return kontrast(l, luminans('FFFFFF')) >= kontrast(l, luminans(MORK)) ? 'FFFFFF' : MORK;
}
