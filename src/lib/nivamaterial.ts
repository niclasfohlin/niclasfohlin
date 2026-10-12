// Nivåer i materialet (Niclas 2026-10-12 om Chambers boksamtal i grupp: listan för nivåerna "vart tråkig mot andra.
// Förut har det varit en färgmarkering där och lite tydlighet kring pilen"). Ramar som heter efter metodens nivåer,
// `<led>: <nivå>` eller `<led>: <nivå>, <vad>` med nivån ur `nivaer` (Böckerna: Bas, om nivån och Böckerna: Bas), är
// nivåns material. På metodens sida står varje nivå som en rad i nivåns färg som fälls ut, med nivåns ramar i, som
// nivåerna i en bank (Bank.astro, samma stilar). Regeln har inga egna fält, så en ny metod får raderna av sig själv.
// Ramarna ska stå i följd i filen, nivå för nivå, annars gäller regeln inte och ramarna står var för sig som förut:
// sidan har då samma ordning som Word. Inga Node-beroenden.
import type { Niva } from './nivaer';

type Ram = { rubrik: string; oversikt?: { rader: string[][] } };
/** En nivå: nivån med sin färg, ramarnas index i filens ordning och antalet rader i nivåns översikter (böckerna). */
export interface Nivarad { niva: Niva; slug: string; ramar: number[]; antal: number }
/** Nivåernas material: ledet före kolon (Böckerna), ordet för det som räknas (böcker), nivåerna och alla ramarna. */
export interface Nivamaterial { led: string; enhet?: string; nivaer: Nivarad[]; ramar: Set<number>; forst: number }

const slug = (s: string) => s.toLowerCase().replace(/å|ä/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Ordet för det nivån har, ur ledet i bestämd form flertal: Böckerna blir böcker och Problemen problem. Ett led som inte
// slutar så ger inget ord, och då står bara talet.
const enhetAv = (led: string): string | undefined => {
  const l = led.toLocaleLowerCase('sv');
  if (/[aeo]rna$/.test(l)) return l.slice(0, -2);
  if (/en$/.test(l) && l.length > 4) return l.slice(0, -2);
  return undefined;
};

/** Metodens nivåmaterial, eller undefined. utanfor: ramar som redan står på ett annat ställe (bankens). */
export function nivamaterial(ramar: Ram[], nivaer: Niva[], utanfor: (ri: number) => boolean = () => false): Nivamaterial | undefined {
  if (nivaer.length < 2) return undefined;
  const grupper = new Map<string, { ri: number; niva: Niva }[]>();
  ramar.forEach((ram, ri) => {
    if (utanfor(ri)) return;
    const m = ram.rubrik.match(/^([^:]+): (.+)$/);
    const niva = m && nivaer.find((n) => m[2] === n.namn || m[2].startsWith(`${n.namn}, `));
    if (!m || !niva) return;
    grupper.set(m[1], [...(grupper.get(m[1]) ?? []), { ri, niva }]);
  });
  for (const [led, rader] of grupper) {
    const namn = [...new Set(rader.map((r) => r.niva.namn))];
    if (namn.length < 2) continue;
    // I följd i filen, och varje nivå för sig.
    const iFoljd = rader.every((r, k) => k === 0 || r.ri === rader[k - 1].ri + 1);
    const nivaForSig = namn.every((n) => { const k = rader.map((r, i) => (r.niva.namn === n ? i : -1)).filter((i) => i >= 0); return k[k.length - 1] - k[0] === k.length - 1; });
    if (!iFoljd || !nivaForSig) continue;
    return {
      led,
      enhet: enhetAv(led),
      nivaer: namn.map((n) => {
        const egna = rader.filter((r) => r.niva.namn === n);
        return { niva: egna[0].niva, slug: slug(n), ramar: egna.map((r) => r.ri), antal: egna.reduce((s, r) => s + (ramar[r.ri].oversikt?.rader.length ?? 0), 0) };
      }),
      ramar: new Set(rader.map((r) => r.ri)),
      forst: rader[0].ri,
    };
  }
  return undefined;
}
