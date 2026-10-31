// Filtret i metodbankerna, en rot för Stödundervisning och Metoder (K-463, K-642; Niclas 2026-10-30 om Metoder: "Se
// stödundervisning som förlaga"): formuläret .mbf med rutorna överst, som var och en fäller ut sina val som knappar med
// antalet metoder, Visar N metoder med Rensa, förklaringen under rutorna för ett val som har en, adressen som speglar valen
// och statistiken för varje val. Ett val som inte ger någon metod går inte att göra. Vad ett kort passar och det som bara
// den ena banken gör efter ett val (täckningskartan och områdenas avsnitt i Stödundervisning, områdets rad på korten i
// Metoder) ger bankens sida. Utan JavaScript visas alla metoder och inget filter (global.css, html.js).
//
// En panel kan ha ett reglage med två grepp, Från och Till, i stället för knapparna, för ett filter vars lägen har en
// ordning (Metoders Används i, Stöd och Svårighet; Niclas 2026-10-30: "Tre av dem kan göras i en slider" och "Från-Till"):
// behållaren [data-spann="<namn>"] med lägena i data-lagen, ett dolt textfält med namnet som bär spannet i formuläret och
// adressen ("medel-starkt", "medel", tomt för Alla; spannUr och spannText i standarden), två <input type="range"> på samma
// bana och ett ord per läge under banan. Greppen står i varsin ände från början, och då är filtret av. De kan inte korsa
// varandra. Musen och fingret flyttar det närmaste greppet, och står greppen på samma läge avgör dragets riktning vilket
// som flyttas; ett tryck på ett läges ord väljer bara det läget (lagningen inför lanseringen, A5: ett tryck på Visst gav
// Visst–Starkt). Tangentbordet och skärmläsaren använder de två reglagen. Statistiken räknar spannet en gång när ett grepp
// släpps eller en tangent trycks. Står metoder utanför skalan, som en metod med Oklart i området, säger en rad under lägena
// hur många de är och att de bara syns med hela skalan, så att lägenas antal går ihop med Visar (A5).
import { spannText, spannUr } from '../lib/standard/index.js';

export type Valen = Record<string, string>;

export interface Bankensfilter {
  /** Formuläret .mbf, med rutorna [data-ruta], panelerna [data-panel] och radioknapparna, en grupp per namn. */
  form: HTMLFormElement;
  /** Korten som filtreras. */
  kort: HTMLElement[];
  /** Valens namn, i adressens ordning. */
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
  /** Raden under ett reglage för korten som inget läge har, med reglagets namn och de andra valen; utan den en allmän rad. */
  utanfor?: (namn: string, kort: HTMLElement[], val: Valen) => string | undefined;
}

/** Ett reglage med två grepp i en panel. */
interface Spannet { namn: string; ruta?: HTMLButtonElement; behallare: HTMLElement; varde: HTMLInputElement; fran: HTMLInputElement; till: HTMLInputElement; bana: HTMLElement; ord: HTMLButtonElement[]; lagen: string[]; alla: string; bekraftat: string }

const metoder = (n: number) => (n === 1 ? '1 metod' : `${n} metoder`);

/** Filtret: kopplar formuläret och filtrerar en gång efter adressens val. Ger filtrera, för den som ändrar något utanför. */
export function bankfiltret(o: Bankensfilter): { filtrera: () => void } {
  const { form, kort, namn, passar } = o;
  const antal = form.querySelector('[data-antal]') as HTMLElement;
  const rutor = Array.from(form.querySelectorAll<HTMLButtonElement>('[data-ruta]'));
  const paneler = Array.from(form.querySelectorAll<HTMLElement>('[data-panel]'));
  const radioknappar = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
  const forklaringen = form.querySelector<HTMLElement>('[data-forklaring-not]');
  const rensaRad = form.querySelector<HTMLElement>('[data-rensa-rad]');
  const tom = form.querySelector<HTMLElement>('[data-tom]');
  const spannen: Spannet[] = Array.from(form.querySelectorAll<HTMLElement>('[data-spann]')).map((b) => {
    const n = b.dataset.spann ?? '';
    const varde = b.querySelector<HTMLInputElement>(`input[name="${n}"]`)!;
    return { namn: n, ruta: rutor.find((r) => r.dataset.ruta === n), behallare: b, varde, fran: b.querySelector('[data-grepp="fran"]')!, till: b.querySelector('[data-grepp="till"]')!, bana: b.querySelector('.mbf-bana')!, ord: Array.from(b.querySelectorAll<HTMLButtonElement>('[data-lage]')), lagen: (b.dataset.lagen ?? '').split(' '), alla: b.dataset.alla ?? 'Alla', bekraftat: varde.value };
  });
  // Spannet som lägenas nummer, med hela banan för Alla.
  const lasSpann = (s: Spannet): [number, number] => { const x = spannUr(s.lagen, s.varde.value); return x ? [s.lagen.indexOf(x.fran), s.lagen.indexOf(x.till)] : [0, s.lagen.length - 1]; };
  const ordet = (s: Spannet, i: number) => s.ord[i]?.querySelector('[data-text]')?.textContent ?? '';
  // En ruta fäller ut sina val och fäller ihop de andra; samma ruta igen, Escape eller ett val fäller ihop.
  function oppna(falt: string | null) {
    for (const r of rutor) r.setAttribute('aria-expanded', String(r.dataset.ruta === falt));
    for (const p of paneler) p.hidden = p.dataset.panel !== falt;
  }
  // Öppnas en ruta med tangentbordet (klicket har detail 0) går fokus till det valda i panelen, eller till Från i ett
  // reglage. Panelen står efter alla rutorna i formuläret.
  for (const r of rutor) r.addEventListener('click', (h) => {
    const falt = r.getAttribute('aria-expanded') === 'true' ? null : r.dataset.ruta ?? null;
    oppna(falt);
    if (falt && h.detail === 0) (spannen.find((s) => s.namn === falt)?.fran ?? form.querySelector<HTMLInputElement>(`input[name="${falt}"]:checked`))?.focus();
  });
  form.addEventListener('keydown', (h) => {
    if (h.key !== 'Escape') return;
    const oppen = rutor.find((r) => r.getAttribute('aria-expanded') === 'true');
    if (oppen) { oppna(null); oppen.focus(); }
  });
  // Ett tryck eller klick på en knapp väljer och fäller ihop. Med tangentbordet byter piltangenterna val utan att
  // fälla ihop (deras klick har detail 0), och Enter fäller ihop. Ett reglage står kvar öppet, så att läraren ser greppen
  // flytta och kan fortsätta dra.
  for (const p of paneler) {
    p.addEventListener('click', (h) => {
      const knapp = (h.target as HTMLElement).closest('label');
      if (h.detail === 0 || !knapp || knapp.querySelector('input')?.disabled) return;
      window.setTimeout(() => stang(p), 0);
    });
    p.addEventListener('keydown', (h) => { if (h.key === 'Enter' && (h.target as HTMLElement).matches('input')) { h.preventDefault(); stang(p); } });
  }
  function stang(p: HTMLElement) {
    oppna(null);
    rutor.find((r) => r.dataset.ruta === p.dataset.panel)?.focus();
  }
  // Rutornas värden, knapparnas antal och förklaringen under rutorna, efter valen. Ett val som inte ger någon metod går
  // inte att göra. I ett reglage står antalet i just det läget under varje ord, och ett läge utan metoder är svagt.
  function visaVal(val: Valen, synliga: number) {
    for (const r of radioknappar) {
      const n = kort.filter((k) => passar(k, { ...val, [r.name]: r.value })).length;
      const knapp = r.closest('label') as HTMLElement;
      (knapp.querySelector('[data-n]') as HTMLElement).textContent = String(n);
      const tomt = n === 0 && !r.checked;
      r.disabled = tomt;
      knapp.classList.toggle('noll', tomt);
      const dold = o.dolj?.(r, tomt, val);
      if (dold !== undefined) knapp.hidden = dold;
    }
    for (const g of form.querySelectorAll<HTMLElement>('[data-grupp]')) g.hidden = !g.querySelector('label:not([hidden])');
    for (const r of rutor) {
      if (spannen.some((s) => s.ruta === r)) continue;
      const vald = radioknappar.find((x) => x.name === r.dataset.ruta && x.checked);
      const text = vald?.closest('label')?.querySelector('[data-text]')?.textContent ?? '';
      (r.querySelector('[data-varde]') as HTMLElement).textContent = text;
      r.classList.toggle('valt', Boolean(vald?.value));
    }
    const rader: string[] = radioknappar.filter((x) => x.checked && x.value && x.closest('label')?.hasAttribute('data-forklaring'))
      .map((x) => `${x.closest('label')?.querySelector('[data-text]')?.textContent}: ${x.closest('label')?.getAttribute('data-forklaring')}`);
    for (const s of spannen) {
      s.ord.forEach((ord, i) => {
        const n = kort.filter((k) => passar(k, { ...val, [s.namn]: s.lagen[i] })).length;
        (ord.querySelector('[data-n]') as HTMLElement).textContent = String(n);
        ord.classList.toggle('noll', n === 0);
      });
      const [a, b] = lasSpann(s), alla = a === 0 && b === s.lagen.length - 1;
      s.fran.value = String(a);
      s.till.value = String(b);
      s.behallare.style.setProperty('--fran', String(a));
      s.behallare.style.setProperty('--till', String(b));
      s.behallare.classList.toggle('lika', a === b);
      s.ord.forEach((ord, i) => ord.classList.toggle('inom', !alla && i >= a && i <= b));
      s.fran.setAttribute('aria-valuetext', `${ordet(s, a)}, ${metoder(synliga)}`);
      s.till.setAttribute('aria-valuetext', `${ordet(s, b)}, ${metoder(synliga)}`);
      if (s.ruta) {
        (s.ruta.querySelector('[data-varde]') as HTMLElement).textContent = alla ? s.alla : a === b ? ordet(s, a) : `${ordet(s, a)}–${ordet(s, b)}`;
        s.ruta.classList.toggle('valt', !alla);
      }
      // Förklaringen för varje läge i spannet som har en, som Stöds.
      if (!alla) for (let i = a; i <= b; i++) { const f = s.ord[i]?.getAttribute('data-forklaring'); if (f) rader.push(`${ordet(s, i)}: ${f}`); }
      // Korten som passar de andra valen men inget läge, och därför bara syns med hela skalan.
      const raden = s.behallare.querySelector<HTMLElement>('[data-utanfor]');
      if (raden) {
        const utan = kort.filter((k) => passar(k, { ...val, [s.namn]: '' }) && !s.lagen.some((l) => passar(k, { ...val, [s.namn]: l })));
        raden.textContent = utan.length ? o.utanfor?.(s.namn, utan, val) ?? `${metoder(utan.length)} står utanför skalan och syns bara med hela skalan.` : '';
        raden.hidden = !utan.length;
      }
    }
    // Förklaringen för varje val som har en, som Intensivträning under Upplägg, en rad per val.
    if (forklaringen) {
      forklaringen.replaceChildren(...rader.map((t) => { const rad = document.createElement('span'); rad.textContent = t; return rad; }));
      forklaringen.hidden = !rader.length;
    }
    if (rensaRad) rensaRad.hidden = !namn.some((n) => val[n]);
  }

  const parametrar = new URLSearchParams(location.search);
  const satt = (n: string, v: string) => { const falt = form.elements.namedItem(n) as RadioNodeList | HTMLInputElement | null; if (falt) falt.value = v; };
  for (const n of namn) {
    const v = parametrar.get(n);
    // Ett värde som inte finns längre (en gammal länk) lämnar Alla valt, om inte banken känner igen det, och så gör ett val
    // utan metoder, som står avstängt från bygget: valet stod annars i rutan utan att filtrera (provet 2026-10-30). Ett
    // spann skrivs om i sin form, och ett som reglaget inte har är Alla.
    if (!v || o.adressensVarde?.(n, v, satt)) continue;
    const s = spannen.find((x) => x.namn === n);
    if (s) { s.varde.value = spannText(s.lagen, spannUr(s.lagen, v)); s.bekraftat = s.varde.value; continue; }
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
    antal.textContent = metoder(synliga);
    if (tom) tom.hidden = synliga > 0;
    visaVal(val, synliga);
    const q = new URLSearchParams();
    for (const n of namn) if (val[n]) q.set(n, val[n]);
    const frageDel = q.toString();
    history.replaceState(null, '', frageDel ? `?${frageDel}` : location.pathname);
    o.efter?.(val, aktiv);
  }

  // Reglagen. Ett grepp flyttas till ett läge och kan inte passera det andra; under dragningen följer korten med, och
  // spannet bekräftas, och räknas i statistiken, när greppet släpps.
  const flytta = (s: Spannet, vilket: 'fran' | 'till', i: number) => {
    let [a, b] = lasSpann(s);
    if (vilket === 'fran') a = Math.min(i, b); else b = Math.max(i, a);
    s.varde.value = spannText(s.lagen, { fran: s.lagen[a], till: s.lagen[b] });
    filtrera();
  };
  const bekrafta = (s: Spannet) => {
    if (s.varde.value === s.bekraftat) return;
    s.bekraftat = s.varde.value;
    s.varde.dispatchEvent(new Event('change', { bubbles: true }));
  };
  // Det närmaste greppet till ett läge; mitt emellan Från.
  const narmast = (s: Spannet, i: number): 'fran' | 'till' => { const [a, b] = lasSpann(s); return i <= a ? 'fran' : i >= b ? 'till' : i - a <= b - i ? 'fran' : 'till'; };
  for (const s of spannen) {
    const lageVid = (x: number) => { const r = s.bana.getBoundingClientRect(); return Math.min(s.lagen.length - 1, Math.max(0, Math.round(((x - r.left) / r.width) * s.lagen.length - 0.5))); };
    // Musen och fingret: ett tryck flyttar det närmaste greppet, och ett drag flyttar det, eller, när greppen står på samma
    // läge, det grepp som dragets riktning pekar ut. Ett finger som drar uppåt eller nedåt rullar sidan (touch-action).
    let drag: { id: number; vilket: 'fran' | 'till' | null; rort: boolean } | null = null;
    s.bana.addEventListener('pointerdown', (h) => {
      if (h.button !== 0) return;
      const i = lageVid(h.clientX), [a, b] = lasSpann(s);
      drag = { id: h.pointerId, vilket: a === b && i === a ? null : narmast(s, i), rort: false };
      s.bana.setPointerCapture(h.pointerId);
      h.preventDefault();
    });
    s.bana.addEventListener('pointermove', (h) => {
      if (!drag || h.pointerId !== drag.id) return;
      const i = lageVid(h.clientX), [a] = lasSpann(s);
      if (!drag.vilket) { if (i === a) return; drag.vilket = i < a ? 'fran' : 'till'; }
      drag.rort = true;
      flytta(s, drag.vilket, i);
    });
    const slapp = (h: PointerEvent) => {
      if (!drag || h.pointerId !== drag.id) return;
      if (!drag.rort && h.type === 'pointerup') flytta(s, drag.vilket ?? narmast(s, lageVid(h.clientX)), lageVid(h.clientX));
      drag = null;
      bekrafta(s);
    };
    s.bana.addEventListener('pointerup', slapp);
    s.bana.addEventListener('pointercancel', slapp);
    // Tangentbordet och skärmläsaren: ett grepp stannar vid det andra.
    for (const g of [s.fran, s.till]) {
      g.addEventListener('input', () => flytta(s, g === s.fran ? 'fran' : 'till', Number(g.value)));
      g.addEventListener('change', (h) => { h.stopPropagation(); bekrafta(s); });
    }
    // Ett tryck på ett ord under banan väljer bara det läget: båda greppen dit.
    s.ord.forEach((ord, i) => ord.addEventListener('click', () => { s.varde.value = spannText(s.lagen, { fran: s.lagen[i], till: s.lagen[i] }); filtrera(); bekrafta(s); }));
  }

  // Rensa döljer sig själv, så fokus går till den första rutan.
  for (const b of form.querySelectorAll('[data-rensa-filter]')) b.addEventListener('click', () => { form.reset(); for (const s of spannen) s.bekraftat = s.varde.value; oppna(null); filtrera(); rutor[0]?.focus(); });
  form.addEventListener('change', filtrera);
  // Statistiken: ett val räknas en gång, här, och inte på etiketten, där klicket och webbläsarens klick på
  // radioknappen räknades var för sig (granskningen 2026-10-19). Statistiksidan har en egen rad för valen. Ett spann
  // räknas med rutans ord, som "Visst–Starkt".
  form.addEventListener('change', (h) => {
    const r = h.target as HTMLInputElement;
    const s = spannen.find((x) => x.varde === r);
    if (r.type !== 'radio' && !s) return;
    const fraga = rutor.find((x) => x.dataset.ruta === r.name)?.querySelector('.mbf-namn')?.textContent ?? r.name;
    const text = s ? s.ruta?.querySelector('[data-varde]')?.textContent ?? r.value : r.closest('label')?.querySelector('[data-text]')?.textContent ?? r.value;
    (window as unknown as { goatcounter?: { count?: (x: object) => void } }).goatcounter?.count?.({ event: true, path: `${o.statistik.adress}${r.name}:${r.value || 'alla'}`, title: `${o.statistik.titel}: ${fraga} ${text}` });
  });
  filtrera();
  return { filtrera };
}
