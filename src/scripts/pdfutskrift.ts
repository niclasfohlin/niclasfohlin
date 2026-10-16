// Utskriften av kort på sidorna som slumpar dem (Ta fram ett skrivkort och Ta fram en aktivitet). Ett kort är kortets pdf,
// en sida ur Word-filens pdf som scripts/pdfdelar.mjs klipper ut (METODER.md under Utskriften). Flera kort fogas ihop här
// av kortens pdf:er, med pdf-lib, som hämtas först när någon skriver ut flera. Där webbläsaren kan skriva ut en pdf direkt
// (Chromium på datorn) öppnas utskriftsrutan, som knapparna i src/components/SkrivUtPdf.astro gör; annars öppnas pdf:en
// i en ny flik.

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

/** Kortens pdf:er i ordning som en pdf, med titeln och Niclas Fohlin som författare. Ger en adress till pdf:en. */
export async function fogaIhop(adresser: string[], titel: string): Promise<string> {
  const { PDFDocument } = await import('pdf-lib');
  const ut = await PDFDocument.create();
  for (const adress of adresser) {
    const svar = await fetch(adress);
    if (!svar.ok) throw new Error(`${adress}: ${svar.status}`);
    const kalla = await PDFDocument.load(await svar.arrayBuffer());
    for (const s of await ut.copyPages(kalla, kalla.getPageIndices())) ut.addPage(s);
  }
  ut.setTitle(titel);
  ut.setAuthor('Niclas Fohlin');
  return URL.createObjectURL(new Blob([new Uint8Array(await ut.save())], { type: 'application/pdf' }));
}

/**
 * Knappen som skriver ut flera kort: fogar ihop deras pdf:er när den trycks och skriver ut dem, eller öppnar pdf:en i en
 * ny flik. adresser och titel läses i trycket, så att de är de kort som står på skärmen just då. Under tiden säger
 * knappen att korten fogas ihop, och går det inte säger den det en stund.
 */
export function flerakortKnapp(knapp: HTMLElement, las: () => { adresser: string[]; titel: string }) {
  const direkt = kanSkrivaUtPdf();
  knapp.addEventListener('click', async (e) => {
    e.preventDefault();
    if (knapp.getAttribute('aria-busy') === 'true') return;
    const { adresser, titel } = las();
    if (!adresser.length) return;
    knapp.setAttribute('aria-busy', 'true');
    const text = knapp.textContent;
    knapp.textContent = 'Fogar ihop korten …';
    // Fliken öppnas medan knappen trycks, så att webbläsaren inte stoppar den som ett fönster som öppnar sig självt.
    const flik = direkt ? null : window.open('', '_blank');
    try {
      const url = await fogaIhop(adresser, titel);
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
