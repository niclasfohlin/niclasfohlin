// Din insats och Dina insatser (Planera insatsen, K-489; Codex-granskningen av utkastet 2026-10-24: "För flera grupper
// behövs Mina planer ... Annars förloras vägen tillbaka"). Lärarens sparade planer, ur webbläsaren
// (src/scripts/insatser-lagring.ts): på metodens sida raden under undertiteln med veckan i planen och nästa pass, och i
// metodbanken en rad per plan, den som har nästa pass först, och planerna som är slut hopfällda sist. Utan sparade planer
// syns ingenting.
import { idagLokalt, iTurOrdning, lageAv, lasPlaner, nastaPassAv, planensNamn, skiljNamnen, type SparadPlan } from './insatser-lagring';

const idag = idagLokalt();
const { planer } = lasPlaner();
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const adress = (p: SparadPlan, vecka?: number) => `/stodundervisning/${encodeURIComponent(p.metod)}/planera#${p.val}&p=${encodeURIComponent(p.id)}${vecka ? `&v=${vecka}` : ''}`;
const FARG: Record<string, string> = { Läsning: 'var(--farg-lasning)', Skrivning: 'var(--farg-skrivning)', Socialt: 'var(--farg-socialt)', Matematik: 'var(--farg-accent)' };

const din = document.getElementById('pl-din');
if (din) {
  // Planen med nästa pass först; med flera grupper står gruppens namn vid läget, så att det syns vilken plan det gäller
  // (granskningen 2026-10-24).
  const egna = planer.filter((p) => p.metod === din.dataset.metod).sort(iTurOrdning(idag));
  if (egna.length) {
    const p = egna[0];
    const lage = lageAv(p, idag);
    // Etiketten står med versaler, och gruppens namn efter den som läraren skrev det (buggjakten 2026-10-24).
    const etikett = egna.length > 1 ? `Dina insatser · ${egna.length} grupper` : 'Din insats';
    din.innerHTML = `<p><span class="pl-din-etikett">${esc(etikett)}${egna.length > 1 ? '' : ` · <span class="pl-din-namn">${esc(planensNamn(p))}</span>`}</span>${esc(egna.length > 1 ? `${planensNamn(p)}: ${lage.text.charAt(0).toLocaleLowerCase('sv')}${lage.text.slice(1)}` : lage.text)}</p><a href="${esc(adress(p, lage.vecka))}" data-goatcounter-click="planera:${esc(p.metod)}:din-insats" data-goatcounter-title="${esc(din.dataset.titel ?? p.titel)}: Din insats på metodens sida">${egna.length > 1 ? 'Planerna' : 'Veckan i planen'}</a>`;
    din.hidden = false;
  }
}

const lista = document.getElementById('pl-insatser');
if (lista && planer.length) {
  // Den som har nästa pass först. En plan som är slut står hopfälld sist, så att listan inte växer med gamla grupper.
  const rad = (p: SparadPlan) => {
    const lage = lageAv(p, idag);
    const gjorda = p.folj ? p.bockade ?? 0 : 0;
    const om = [lage.text, gjorda ? `${gjorda} pass bockade` : ''].filter(Boolean).join(' · ');
    return `<li style="--omr:${FARG[p.omrade ?? ''] ?? 'var(--farg-accent)'}"><a href="${esc(adress(p, lage.vecka))}" data-goatcounter-click="insatser:metodbanken" data-goatcounter-title="Metodbanken: en plan under Dina insatser"><span class="pl-metod">${esc(p.titel)} · ${esc(namnen.get(p.id) ?? planensNamn(p))}</span><span class="pl-om">${esc(om)}</span><span class="pl-pil" aria-hidden="true">${nastaPassAv(p, idag) === '9999' ? 'Efter ›' : 'Veckan ›'}</span></a></li>`;
  };
  const ordnade = [...planer].sort(iTurOrdning(idag));
  // Två planer med samma namn för samma metod skiljs åt med ett nummer.
  const namnen = new Map<string, string>();
  for (const m of new Set(ordnade.map((p) => p.metod))) {
    const egna = ordnade.filter((p) => p.metod === m);
    skiljNamnen(egna.map(planensNamn)).forEach((n, i) => namnen.set(egna[i].id, n));
  }
  const pagar = ordnade.filter((p) => nastaPassAv(p, idag) !== '9999');
  const slut = ordnade.filter((p) => nastaPassAv(p, idag) === '9999');
  lista.querySelector('ul')!.innerHTML = pagar.map(rad).join('');
  const fall = lista.querySelector<HTMLElement>('.pl-avslutade');
  if (fall) {
    fall.hidden = !slut.length;
    fall.innerHTML = slut.length ? `<details><summary>${slut.length === 1 ? 'En insats som är slut' : `${slut.length} insatser som är slut`}</summary><ul>${slut.map(rad).join('')}</ul></details>` : '';
  }
  lista.hidden = false;
}
