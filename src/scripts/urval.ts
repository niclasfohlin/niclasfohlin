// Urvalet i metodbankerna, en rot för Stödundervisning och Metoder (K-621; Niclas 2026-10-30: "Det ska finnas en checkruta
// också likt stödundervisning för [att] ladda ner hela metoden i hörnet"): kryssrutan Välj på varje kort, rutan nederst som
// ligger fast när något är valt, räkningen med metodernas namn, Rensa och minnet under besöket. Det som laddas ner skiljer
// sig och står i bankens sida: Stödundervisning bygger en Word-fil med de valda metoderna (src/pages/stodundervisning/
// index.astro), och Metoder hämtar varje vald metods Word-fil, en fil eller flera i en zip (src/pages/metoder/index.astro).
// Utan JavaScript syns varken kryssrutorna eller rutan (global.css, html.js).

export interface Urvalet {
  /** Ett besked i rutan. Ett lyckat besked försvinner efter en stund; ett fel står kvar tills läsaren rensar eller lyckas. */
  visaStatus: (html: string, tillfalligt?: boolean) => void;
  /** Beskedets rad, som Drive skriver sina besked i (src/scripts/drive.ts). */
  status: HTMLElement;
  /** Stoppar timern, så att ett besked som någon annan skriver inte raderas av ett tidigare. */
  behallStatus: () => void;
  /** Laddar ner de valda: knapparna står avstängda och rutan kvar medan arbetet pågår. Inget när inget är valt. */
  arbeta: (arbete: (valda: HTMLInputElement[]) => Promise<void>) => Promise<void>;
}

/**
 * Urvalet för rutan samla, med kryssrutorna name="valda" på sidans kort (.kort) och urvalet sparat under nyckeln i
 * sessionStorage. Rutans knappar för att ladda ner står i .samla-knappar och är avstängda när inget är valt. vidAntalet får
 * antalet valda efter varje ändring, så att banken kan ge knappen namnet efter vad den ger, som Metoders zip-fil med flera
 * Word-filer (lagningen inför lanseringen, A4).
 */
export function urvalet(samla: HTMLFormElement, nyckel: string, vidAntalet?: (antal: number) => void): Urvalet {
  const boxar = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="valda"]'));
  const knappar = Array.from(samla.querySelectorAll<HTMLButtonElement>('.samla-knappar button:not([data-rensa])'));
  const valda = samla.querySelector('[data-valda]') as HTMLElement;
  const status = samla.querySelector('[data-status]') as HTMLElement;
  const rensa = samla.querySelector('[data-rensa]') as HTMLButtonElement;
  let arbetar = false;
  // Ett lyckat besked försvinner efter en stund; timern stoppas om något nytt händer, så att den inte raderar ett senare fel.
  let statusTimer: number | undefined;
  const behallStatus = () => window.clearTimeout(statusTimer);
  const visaStatus = (html: string, tillfalligt = false) => {
    behallStatus();
    status.innerHTML = html;
    if (tillfalligt) statusTimer = window.setTimeout(() => { status.textContent = ''; }, 8000);
  };
  const markerade = () => boxar.filter((b) => b.checked);

  function uppdatera() {
    const n = markerade().length;
    for (const k of knappar) k.disabled = arbetar || n === 0;
    // Rutan ligger fast nederst bara när en metod är vald, så att den inte står över korten i onödan (K-463).
    samla.classList.toggle('har-valda', n > 0 || arbetar || Boolean(status.textContent));
    rensa.hidden = n === 0;
    const namn = markerade().map((b) => b.closest('.kort')?.querySelector('h3')?.textContent?.trim()).filter(Boolean);
    valda.textContent = n === 0 ? 'Inga metoder valda' : `${n === 1 ? '1 metod vald' : `${n} metoder valda`}: ${namn.join(', ')}`;
    for (const b of boxar) b.closest('.kort')?.classList.toggle('vald', b.checked);
    vidAntalet?.(n);
  }
  // Urvalet minns under besöket, så att läraren kan läsa en metod och komma tillbaka.
  const spara = () => { try { sessionStorage.setItem(nyckel, JSON.stringify(markerade().map((b) => b.value))); } catch { /* utan lagring */ } };
  try {
    const sparade = JSON.parse(sessionStorage.getItem(nyckel) ?? '[]') as string[];
    for (const b of boxar) if (sparade.includes(b.value)) b.checked = true;
  } catch { /* utan lagring */ }
  for (const b of boxar) b.addEventListener('change', () => { uppdatera(); spara(); });
  rensa.addEventListener('click', () => { for (const b of boxar) b.checked = false; visaStatus(''); uppdatera(); spara(); });
  uppdatera();

  async function arbeta(arbete: (valda: HTMLInputElement[]) => Promise<void>) {
    const valda = markerade();
    if (valda.length === 0 || arbetar) return;
    arbetar = true;
    uppdatera();
    try { await arbete(valda); } finally { arbetar = false; uppdatera(); }
  }
  return { visaStatus, status, behallStatus, arbeta };
}
