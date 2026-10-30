// Filtret i metodbankerna, en rot för Stödundervisning och Metoder (K-463, K-642; Niclas 2026-10-30 om Metoder: "Se
// stödundervisning som förlaga"): formuläret .mbf med rutorna överst, som var och en fäller ut sina val som knappar med
// antalet metoder, Visar N metoder med Rensa, förklaringen under rutorna för ett val som har en, adressen som speglar valen
// och statistiken för varje val. Ett val som inte ger någon metod går inte att göra. Vad ett kort passar och det som bara
// den ena banken gör efter ett val (täckningskartan och områdenas avsnitt i Stödundervisning, områdets rad på korten i
// Metoder) ger bankens sida. Utan JavaScript visas alla metoder och inget filter (global.css, html.js).
//
// En panel kan ha ett reglage i stället för knapparna, för ett filter vars val har en ordning (Metoders Används i, Stöd och
// Svårighet; Niclas 2026-10-30: "Tre av dem kan göras i en slider istället för enskilda kort"): webbläsarens eget
// <input type="range" data-reglage="<namn>"> med ett läge per radioknapp, och lägenas ord och antal under banan. Radio-
// knapparna bär valet som förut, så att adressen, antalen, Rensa och statistiken är desamma. Ett läge går alltid att nå,
// och ett läge utan metoder visar inga metoder och är svagt, eftersom ett läge visar metoderna i just det läget.

export type Valen = Record<string, string>;

export interface Bankensfilter {
  /** Formuläret .mbf, med rutorna [data-ruta], panelerna [data-panel] och radioknapparna, en grupp per namn. */
  form: HTMLFormElement;
  /** Korten som filtreras. */
  kort: HTMLElement[];
  /** Radioknapparnas namn, i adressens ordning. */
  namn: readonly string[];
  /** Om ett kort passar valen. Ett tomt val är Alla. */
  passar: (kort: HTMLElement, val: Valen) => boolean;
  /** Statistikens händelse för ett val: adressens början och titelns början, som "filter:" och "Metodbanken". */
  statistik: { adress: string; titel: string };
  /** Ett värde i adressen som inte är ett val, som en gammal länk: sätter valet och svarar true när det tog hand om det. */
  adressensVarde?: (namn: string, varde: string, satt: (namn: string, varde: string) => void) => boolean;
  /** Om en knapp utan metoder ska döljas helt i stället för att bara stängas av; undefined låter den stå. */
  dolj?: (radio: HTMLInputElement, tom: boolean, val: Valen) => boolean | undefined;
  /** Det banken gör efter varje filtrering, med valen och om något är valt. */
  efter?: (val: Valen, aktiv: boolean) => void;
}

/** Filtret: kopplar formuläret och filtrerar en gång efter adressens val. Ger filtrera, för den som ändrar något utanför. */
export function bankfiltret(o: Bankensfilter): { filtrera: () => void } {
  const { form, kort, namn, passar } = o;
  const antal = form.querySelector('[data-antal]') as HTMLElement;
  const rutor = Array.from(form.querySelectorAll<HTMLButtonElement>('[data-ruta]'));
  const paneler = Array.from(form.querySelectorAll<HTMLElement>('[data-panel]'));
  const radioknappar = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  const forklaringen = form.querySelector<HTMLElement>('[data-forklaring-not]');
  const reglagen = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="range"][data-reglage]'));
  const iReglage = new Set(reglagen.map((g) => g.dataset.reglage));
  const lagen = (g: HTMLInputElement) => radioknappar.filter((r) => r.name === g.dataset.reglage);
  const rensaRad = form.querySelector<HTMLElement>('[data-rensa-rad]');
  const tom = form.querySelector<HTMLElement>('[data-tom]');
  // En ruta fäller ut sina val och fäller ihop de andra; samma ruta igen, Escape eller ett val fäller ihop.
  function oppna(falt: string | null) {
    for (const r of rutor) r.setAttribute('aria-expanded', String(r.dataset.ruta === falt));
    for (const p of paneler) p.hidden = p.dataset.panel !== falt;
  }
  // Öppnas en ruta med tangentbordet (klicket har detail 0) går fokus till det valda i panelen, som står efter alla
  // rutorna i formuläret.
  for (const r of rutor) r.addEventListener('click', (h) => {
    const falt = r.getAttribute('aria-expanded') === 'true' ? null : r.dataset.ruta ?? null;
    oppna(falt);
    if (falt && h.detail === 0) (form.querySelector<HTMLInputElement>(`[data-reglage="${falt}"]`) ?? form.querySelector<HTMLInputElement>(`input[name="${falt}"]:checked`))?.focus();
  });
  form.addEventListener('keydown', (h) => {
    if (h.key !== 'Escape') return;
    const oppen = rutor.find((r) => r.getAttribute('aria-expanded') === 'true');
    if (oppen) { oppna(null); oppen.focus(); }
  });
  // Ett tryck eller klick på en knapp väljer och fäller ihop. Med tangentbordet byter piltangenterna val utan att
  // fälla ihop (deras klick har detail 0), och Enter fäller ihop. Ett reglage står kvar öppet, också när ett ord under
  // banan trycks, så att läraren ser greppet flytta och kan fortsätta dra.
  for (const p of paneler) {
    p.addEventListener('click', (h) => {
      const knapp = (h.target as HTMLElement).closest('label');
      if (h.detail === 0 || !knapp || knapp.querySelector('input')?.disabled || iReglage.has(knapp.querySelector('input')?.name)) return;
      window.setTimeout(() => stang(p), 0);
    });
    p.addEventListener('keydown', (h) => { if (h.key === 'Enter' && (h.target as HTMLElement).matches('input')) { h.preventDefault(); stang(p); } });
  }
  function stang(p: HTMLElement) {
    oppna(null);
    rutor.find((r) => r.dataset.ruta === p.dataset.panel)?.focus();
  }
  // Rutornas värden, knapparnas antal och förklaringen under rutorna, efter valen. Ett val som inte ger någon metod går
  // inte att göra.
  function visaVal(val: Valen) {
    for (const r of radioknappar) {
      const n = kort.filter((k) => passar(k, { ...val, [r.name]: r.value })).length;
      const knapp = r.closest('label') as HTMLElement;
      (knapp.querySelector('[data-n]') as HTMLElement).textContent = String(n);
      const tomt = n === 0 && !r.checked;
      r.disabled = tomt && !iReglage.has(r.name);
      knapp.classList.toggle('noll', tomt);
      const dold = o.dolj?.(r, tomt, val);
      if (dold !== undefined) knapp.hidden = dold;
    }
    for (const g of form.querySelectorAll<HTMLElement>('[data-grupp]')) g.hidden = !g.querySelector('label:not([hidden])');
    // Reglaget står på det valda läget, och skärmläsaren hör lägets ord och antal.
    for (const g of reglagen) {
      const l = lagen(g), i = Math.max(0, l.findIndex((r) => r.checked)), etikett = l[i]?.closest('label');
      const n = etikett?.querySelector('[data-n]')?.textContent ?? '';
      g.value = String(i);
      g.setAttribute('aria-valuetext', `${etikett?.querySelector('[data-text]')?.textContent ?? ''}, ${n === '1' ? '1 metod' : `${n} metoder`}`);
    }
    for (const r of rutor) {
      const vald = radioknappar.find((x) => x.name === r.dataset.ruta && x.checked);
      const text = vald?.closest('label')?.querySelector('[data-text]')?.textContent ?? '';
      (r.querySelector('[data-varde]') as HTMLElement).textContent = text;
      r.classList.toggle('valt', Boolean(vald?.value));
    }
    // Förklaringen för varje val som har en, som Intensivträning under Upplägg, en rad per val.
    if (forklaringen) {
      const rader = radioknappar.filter((x) => x.checked && x.value && x.closest('label')?.hasAttribute('data-forklaring')).map((x) => {
        const rad = document.createElement('span');
        rad.textContent = `${x.closest('label')?.querySelector('[data-text]')?.textContent}: ${x.closest('label')?.getAttribute('data-forklaring')}`;
        return rad;
      });
      forklaringen.replaceChildren(...rader);
      forklaringen.hidden = !rader.length;
    }
    if (rensaRad) rensaRad.hidden = !namn.some((n) => val[n]);
  }

  const parametrar = new URLSearchParams(location.search);
  const satt = (n: string, v: string) => { const falt = form.elements.namedItem(n) as RadioNodeList | null; if (falt) falt.value = v; };
  for (const n of namn) {
    const v = parametrar.get(n);
    // Ett värde som inte finns längre (en gammal länk) lämnar Alla valt, om inte banken känner igen det, och så gör ett val
    // utan metoder, som står avstängt från bygget: valet stod annars i rutan utan att filtrera (provet 2026-10-30).
    if (!v || o.adressensVarde?.(n, v, satt)) continue;
    if (radioknappar.some((r) => r.name === n && r.value === v && !r.disabled)) satt(n, v);
  }

  function filtrera() {
    const data = new FormData(form);
    const val = Object.fromEntries(namn.map((n) => [n, String(data.get(n) ?? '')]));
    const aktiv = namn.some((n) => val[n]);
    let synliga = 0;
    for (const k of kort) {
      k.hidden = !passar(k, val);
      if (!k.hidden) synliga++;
    }
    antal.textContent = synliga === 1 ? '1 metod' : `${synliga} metoder`;
    if (tom) tom.hidden = synliga > 0;
    visaVal(val);
    const q = new URLSearchParams();
    for (const n of namn) if (val[n]) q.set(n, val[n]);
    const frageDel = q.toString();
    history.replaceState(null, '', frageDel ? `?${frageDel}` : location.pathname);
    o.efter?.(val, aktiv);
  }

  // Rensa döljer sig själv, så fokus går till den första rutan.
  for (const b of form.querySelectorAll('[data-rensa-filter]')) b.addEventListener('click', () => { form.reset(); oppna(null); filtrera(); rutor[0]?.focus(); });
  // Reglaget väljer lägets radioknapp. Under dragningen följer korten med, och valet räknas i statistiken när reglaget
  // släpps eller en piltangent trycks, en gång, som ett tryck på en knapp: reglagets egen change går inte vidare, och
  // radioknappens gör det.
  for (const g of reglagen) {
    g.addEventListener('input', () => { const r = lagen(g)[Number(g.value)]; if (r && !r.checked) { r.checked = true; filtrera(); } });
    g.addEventListener('change', (h) => { h.stopPropagation(); lagen(g)[Number(g.value)]?.dispatchEvent(new Event('change', { bubbles: true })); });
  }
  form.addEventListener('change', filtrera);
  // Statistiken: ett val räknas en gång, här, och inte på etiketten, där klicket och webbläsarens klick på
  // radioknappen räknades var för sig (granskningen 2026-10-19). Statistiksidan har en egen rad för valen.
  form.addEventListener('change', (h) => {
    const r = h.target as HTMLInputElement;
    if (r.type !== 'radio') return;
    const fraga = rutor.find((x) => x.dataset.ruta === r.name)?.querySelector('.mbf-namn')?.textContent ?? r.name;
    const text = r.closest('label')?.querySelector('[data-text]')?.textContent ?? r.value;
    (window as unknown as { goatcounter?: { count?: (x: object) => void } }).goatcounter?.count?.({ event: true, path: `${o.statistik.adress}${r.name}:${r.value || 'alla'}`, title: `${o.statistik.titel}: ${fraga} ${text}` });
  });
  filtrera();
  return { filtrera };
}
