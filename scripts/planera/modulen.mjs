// Modulens filer, en lista för allt som behöver veta vad modulen är (Niclas 2026-10-31: principerna ska läsas "så fort modulen
// rörs i kod"): planprovets spärrar mot drift och dubbletter läser koden, liggaren (steg.mjs) räknar modulen som ändrad, och
// kroken .claude/hooks/modulen.mjs lägger principerna i PLANERA.md i sammanhanget. Förut hade planprovet och liggaren var sin
// lista, och liggarens saknade Lär dig metoden. En ny fil i modulen skrivs här.

/** Koden: standardens rötter, webbläsarens rötter och lagren ovanför, som planprovets spärrar läser. */
export const MODULENS_FILER = ['src/lib/standard/index.js', 'src/lib/standard/plan.js', 'src/lib/standard/saker.js', 'src/lib/standard/text.js', 'src/scripts/webblasaren.ts', 'src/lib/insatsplan.ts', 'src/lib/metodsaker.ts', 'src/lib/sakfiler.ts', 'src/lib/planbar.ts', 'src/scripts/planera.ts', 'src/scripts/planpdf.ts', 'src/scripts/insatser-lagring.ts', 'src/scripts/insatser.ts', 'src/scripts/appen.ts', 'src/scripts/appdelen.ts', 'src/scripts/raknare.ts', 'src/lib/appen.ts', 'src/components/Planera.astro', 'src/components/AppRad.astro', 'src/components/AppLank.astro', 'src/components/Insatslista.astro', 'src/components/PlanernasKnappar.astro', 'src/components/PlanNotis.astro', 'src/pages/app/index.astro', 'src/components/StodForValet.astro', 'src/scripts/skattning.ts', 'src/scripts/lardig.ts', 'src/lib/lardig.ts', 'src/scripts/lardigpdf.ts', 'src/components/LarDig.astro', 'src/pages/metoder/[id]/lar-dig.astro', 'src/scripts/byggstenar.ts', 'src/components/PlanHuvud.astro', 'src/components/PlanFilen.astro', 'src/components/PlanVersion.astro', 'src/components/OppnaPlaner.astro'];

/** Det som också ändrar modulen men inte läses av spärrarna: planens sida, valet av kurs i en serie med kurser (PlaneraKurser.astro, som liggaren räknade förut), schemat och proven. */
export const MODULENS_ANDRA = ['src/pages/stodundervisning/[id]/planera.astro', 'src/components/PlaneraKurser.astro', 'src/content.config.ts', 'scripts/planprov.mjs'];

/** Hör filen till modulen? Sökvägen relativt repots rot, med / eller \. */
export const iModulen = (rel) => {
  const f = String(rel).replace(/\\/g, '/');
  return MODULENS_FILER.includes(f) || MODULENS_ANDRA.includes(f);
};
