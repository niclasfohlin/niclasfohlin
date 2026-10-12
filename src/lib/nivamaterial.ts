// Nivåer i materialet (Niclas 2026-10-12 om Chambers boksamtal i grupp: listan för nivåerna "vart tråkig mot andra.
// Förut har det varit en färgmarkering där och lite tydlighet kring pilen"). Ramar som heter efter metodens nivåer,
// `<led>: <nivå>` eller `<led>: <nivå>, <vad>` med nivån ur `nivaer` (Böckerna: Bas, om nivån och Böckerna: Bas), är
// nivåns material. På metodens sida står varje nivå som en rad i nivåns färg som fälls ut, med nivåns ramar i, som
// nivåerna i en bank (Bank.astro, samma stilar). Regeln har inga egna fält, så en ny metod får raderna av sig själv.
// Ramarna ska stå i följd i filen, nivå för nivå, annars gäller regeln inte och ramarna står var för sig som förut:
// sidan har då samma ordning som Word. Nivåns ramar finns också som egna filer, Word och pdf, en per nivå och en för alla
// nivåer (nivafiler), i nedladdningsrutan och i nivån, som bankens filer. Inga Node-beroenden.
import type { Niva } from './nivaer';
import { veckomaterial } from './veckomaterial';
import { bankAv } from './bank';

type Ram = { rubrik: string; oversikt?: { rader: string[][] } };
/** En nivå: nivån med sin färg, ramarnas index i filens ordning, antalet rader i nivåns översikter (böckerna) och
 * ramarnas namn till länkarna överst i den utfällda nivån: det som står efter nivån i ramens namn (Om nivån), och ledet
 * för ramen som bara heter som nivån (Böckerna). */
export interface Nivarad { niva: Niva; slug: string; ramar: number[]; antal: number; lankar: { ri: number; namn: string }[] }
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
        const namnAv = (ri: number) => { const rest = ramar[ri].rubrik.slice(led.length + 2 + n.length).replace(/^, /, ''); return rest ? rest.charAt(0).toLocaleUpperCase('sv') + rest.slice(1) : led; };
        return { niva: egna[0].niva, slug: slug(n), ramar: egna.map((r) => r.ri), antal: egna.reduce((s, r) => s + (ramar[r.ri].oversikt?.rader.length ?? 0), 0), lankar: egna.map((r) => ({ ri: r.ri, namn: namnAv(r.ri) })) };
      }),
      ramar: new Set(rader.map((r) => r.ri)),
      forst: rader[0].ri,
    };
  }
  return undefined;
}

/** Metodens nivåmaterial med sidans villkor: inte i en kurs där material står vid veckorna (veckomaterial.ts), och inte i en metod med en bank. */
export function metodensNivamaterial(d: { nivaer?: Niva[]; ramar?: { ramar: (Ram & { lektioner?: boolean; listor?: { rubrik?: string; rader: string[][] }[]; delar?: unknown[] })[] } }): Nivamaterial | undefined {
  if (!d.ramar || veckomaterial(d as Parameters<typeof veckomaterial>[0])) return undefined;
  // En metod med en bank har sina nivåer där (Bank.astro, med samma ankare niva-<nivå>): två uppsättningar nivårader på en
  // sida vore svårare att läsa, så regeln gäller inte då.
  if (bankAv(d as Parameters<typeof bankAv>[0])) return undefined;
  return nivamaterial(d.ramar.ramar, d.nivaer ?? []);
}

/** En fil med en nivås material, eller alla nivåers: /stodundervisning/<id>-<led>-<nivå>.docx och .pdf, som bankens filer. */
export interface Nivafil { namn: string; niva?: Nivarad; rubrik: string; ramar: number[] }
export function nivafiler(id: string, nm: Nivamaterial): Nivafil[] {
  return [undefined, ...nm.nivaer].map((n) => ({
    namn: `${id}-${slug(nm.led)}-${n ? n.slug : 'alla'}`,
    niva: n,
    rubrik: `${n ? n.niva.namn : 'Alla nivåer'}: ${nm.led.toLocaleLowerCase('sv')}`,
    ramar: n ? n.ramar : nm.nivaer.flatMap((x) => x.ramar),
  }));
}
