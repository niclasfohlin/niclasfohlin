// Utskriften av kort och poster på sidorna som tar fram dem (Ta fram ett skrivkort, Ta fram en aktivitet, Ta fram ett
// matteproblem). Ett kort eller en post är en pdf, sidor ur Word-filens pdf som scripts/pdfdelar.mjs klipper ut (METODER.md
// under Utskriften). Flera fogas ihop här, med pdf-lib, som hämtas först när någon skriver ut flera. Där webbläsaren kan
// skriva ut en pdf direkt (Chromium på datorn) öppnas utskriftsrutan, som knapparna i src/components/SkrivUtPdf.astro gör;
// annars öppnas pdf:en i en ny flik.
//
// Filerna hämtas samtidigt, högst sex åt gången. En lista ur en databas kan i stället för posternas egna pdf:er hämta
// källfilen en gång och ta sidorna därifrån, när det är mindre att hämta (hamtplan i src/lib/standard/; K-424: varje
// utklippt pdf bär källfilens alla typsnitt).

// Bara typerna: pdf-lib själv hämtas först när någon skriver ut flera.
import type { PDFDocument, PDFPage } from 'pdf-lib';

/** Det som ska hämtas och, i ordning, var sidorna finns: en hel fil (index null) eller vissa sidor ur den. */
export interface Hamtplan { hamta: { adress: string }[]; sidor: { adress: string; index: number[] | null }[] }

/** Sant där webbläsaren kan skriva ut en pdf ur en dold ram: Chromium på datorn, med pdf-läsaren påslagen. */
export function kanSkrivaUtPdf(): boolean {
  const ua = (navigator as Navigator & { userAgentData?: { mobile: boolean } }).userAgentData;
  return ua?.mobile === false && navigator.pdfViewerEnabled === true;
}

/** Öppnar utskriftsrutan för pdf:en, ur en dold ram. Går det inte öppnas pdf:en i en ny flik. */
export function skrivUt(url: string) {
  document.querySelector('iframe.skriv-ut-pdf')?.remove();
  const ram = document.createElement('iframe');
  ram.className = 'skriv-ut-pdf';
  ram.title = 'Pdf för utskrift';
  ram.tabIndex = -1;
  ram.setAttribute('aria-hidden', 'true');
  ram.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  ram.addEventListener('load', () => { try { ram.contentWindow!.focus(); ram.contentWindow!.print(); } catch { window.open(url, '_blank'); } }, { once: true });
  ram.src = url;
  document.body.append(ram);
}

/** Kör uppgifterna med högst n åt gången. */
async function iTur<T>(xs: T[], n: number, gor: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => { while (i < xs.length) await gor(xs[i++]); }));
}

/**
 * Planens sidor som en pdf, med titeln och Niclas Fohlin som författare. Ger en adress till pdf:en. Är planen en enda hel
 * fil ges dess adress, utan att något fogas ihop.
 */
export async function fogaIhopPlan(plan: Hamtplan, titel: string): Promise<string> {
  if (plan.sidor.length === 1 && plan.sidor[0].index === null) return plan.sidor[0].adress;
  const pdfLib = await import('pdf-lib');
  const filer = new Map<string, PDFDocument>();
  await iTur(plan.hamta, 6, async ({ adress }) => {
    const svar = await fetch(adress);
    if (!svar.ok) throw new Error(`${adress}: ${svar.status}`);
    filer.set(adress, await pdfLib.PDFDocument.load(await svar.arrayBuffer()));
  });
  const ut = await pdfLib.PDFDocument.create();
  const index = (s: Hamtplan['sidor'][number]) => s.index ?? filer.get(s.adress)!.getPageIndices();
  // Sidorna ur samma fil kopieras i ett anrop, så att filens typsnitt följer med en gång och inte en gång per post.
  const behov = new Map<string, number[]>();
  for (const s of plan.sidor) behov.set(s.adress, [...new Set([...(behov.get(s.adress) ?? []), ...index(s)])]);
  const kopior = new Map<string, Map<number, PDFPage>>();
  for (const [adress, idx] of behov) {
    const sidor = await ut.copyPages(filer.get(adress)!, idx);
    kopior.set(adress, new Map(idx.map((i, n) => [i, sidor[n]])));
  }
  for (const s of plan.sidor) for (const i of index(s)) ut.addPage(kopior.get(s.adress)!.get(i)!);
  ut.setTitle(titel);
  ut.setAuthor('Niclas Fohlin');
  return URL.createObjectURL(new Blob([new Uint8Array(await ut.save())], { type: 'application/pdf' }));
}

/** Kortens pdf:er i ordning som en pdf (fogaIhopPlan med varje kort som en hel fil). */
export const fogaIhop = (adresser: string[], titel: string) =>
  fogaIhopPlan({ hamta: [...new Set(adresser)].map((adress) => ({ adress })), sidor: adresser.map((adress) => ({ adress, index: null })) }, titel);

/**
 * Knappen som skriver ut flera kort eller poster: fogar ihop dem när den trycks och skriver ut dem, eller öppnar pdf:en i
 * en ny flik. las läses i trycket, så att det är det som står i listan just då, och får vara asynkron (sidan kan behöva
 * hämta sin data). Under tiden säger knappen vantText, och går det inte säger den det en stund.
 */
type Utskriftsval = { adresser?: string[]; plan?: Hamtplan; titel: string } | null;
export function flerakortKnapp(knapp: HTMLElement, las: () => Utskriftsval | Promise<Utskriftsval>, vantText = 'Fogar ihop korten …') {
  const direkt = kanSkrivaUtPdf();
  const tomt = (s: Utskriftsval) => !s || !(s.plan?.sidor.length || s.adresser?.length);
  knapp.addEventListener('click', async (e) => {
    e.preventDefault();
    if (knapp.getAttribute('aria-busy') === 'true' || knapp.getAttribute('aria-disabled') === 'true') return;
    const val = las();
    if (!(val instanceof Promise) && tomt(val)) return;
    knapp.setAttribute('aria-busy', 'true');
    const text = knapp.textContent;
    knapp.textContent = vantText;
    // Fliken öppnas medan knappen trycks, så att webbläsaren inte stoppar den som ett fönster som öppnar sig självt.
    const flik = direkt ? null : window.open('', '_blank');
    try {
      const svar = await val;
      if (tomt(svar)) { flik?.close(); knapp.textContent = text; knapp.removeAttribute('aria-busy'); return; }
      const url = svar!.plan ? await fogaIhopPlan(svar!.plan, svar!.titel) : await fogaIhop(svar!.adresser!, svar!.titel);
      if (direkt) skrivUt(url); else if (flik) flik.location.href = url; else location.assign(url);
      knapp.textContent = text;
    } catch {
      flik?.close();
      knapp.textContent = 'Det gick inte. Försök igen';
      window.setTimeout(() => { knapp.textContent = text; }, 4000);
    }
    knapp.removeAttribute('aria-busy');
  });
}

/** Länken till ett korts pdf: utskriftsrutan där det går, och med en tangent nedtryckt pdf:en i en ny flik. */
export function ettkortLank(lank: HTMLAnchorElement) {
  const direkt = kanSkrivaUtPdf();
  lank.addEventListener('click', (e) => {
    if (!direkt || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || lank.getAttribute('href') === '#') return;
    e.preventDefault();
    skrivUt(lank.href);
  });
}
