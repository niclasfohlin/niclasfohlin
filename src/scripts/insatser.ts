// Din insats och Dina insatser (Planera insatsen, K-489; Codex-granskningen av utkastet 2026-10-24: "För flera grupper
// behövs Mina planer ... Annars förloras vägen tillbaka"). Lärarens sparade planer, ur webbläsaren
// (src/scripts/insatser-lagring.ts): på metodens sida raden under undertiteln med veckan i planen och nästa pass, och i
// metodbanken en rad per plan, den som har nästa pass först, och planerna som är slut hopfällda sist. Utan sparade planer
// syns ingenting.
import { esc, liten, PLANERA } from '../lib/standard/index.js';
import { allaPlanerna, idagLokalt, iTurOrdning, oppnaPlanerna, valdaFiler, lageAv, lasPlaner, nastaPassAv, planensAdress, planensNamn, raknaPagaende, skiljNamnen, STATUSNAMN, statusAv, type SparadPlan } from './insatser-lagring';

const idag = idagLokalt();
const { planer } = lasPlaner();
// En plan som pågår säger det till statistiken, en gång i veckan (K-504).
raknaPagaende(planer, idag);
const FARG: Record<string, string> = { Läsning: 'var(--farg-lasning)', Skrivning: 'var(--farg-skrivning)', Socialt: 'var(--farg-socialt)', Matematik: 'var(--farg-accent)' };

// Insatsens läge som ett märke i Betas form (statusAv i src/scripts/insatser-lagring.ts).
const marke = (p: SparadPlan) => { const s = statusAv(p, idag); return `<span class="pl-status ${s}">${STATUSNAMN[s]}</span>`; };

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
    din.innerHTML = `<p><span class="pl-din-etikett">${esc(etikett)}${egna.length > 1 ? '' : ` · <span class="pl-din-namn">${esc(planensNamn(p))}</span>`}</span>${marke(p)}${esc(egna.length > 1 ? `${planensNamn(p)}: ${liten(lage.text)}` : lage.text)}</p><a href="${esc(planensAdress(p, lage.vecka))}" data-goatcounter-click="planera:${esc(p.metod)}:din-insats" data-goatcounter-title="${esc(din.dataset.titel ?? p.titel)}: Din insats på metodens sida">${egna.length > 1 ? 'Planerna' : 'Veckan i planen'}</a>`;
    din.hidden = false;
  }
}

const lista = document.getElementById('pl-insatser');
if (lista && planer.length) {
  // Den som har nästa pass först. En avslutad plan står hopfälld sist, så att listan inte växer med gamla grupper.
  const rad = (p: SparadPlan) => {
    const lage = lageAv(p, idag);
    const gjorda = p.folj ? p.bockade ?? 0 : 0;
    const om = [lage.text, gjorda ? `${gjorda} pass bockade` : ''].filter(Boolean).join(' · ');
    return `<li style="--omr:${FARG[p.omrade ?? ''] ?? 'var(--farg-accent)'}"><a href="${esc(planensAdress(p, lage.vecka))}" data-goatcounter-click="insatser:metodbanken" data-goatcounter-title="Metodbanken: en plan under Dina insatser"><span class="pl-metod">${esc(p.titel)} · ${esc(namnen.get(p.id) ?? planensNamn(p))}</span><span class="pl-om">${marke(p)}${esc(om)}</span><span class="pl-pil" aria-hidden="true">${statusAv(p, idag) === 'avslutad' || nastaPassAv(p, idag) === '9999' ? 'Efter ›' : 'Veckan ›'}</span></a></li>`;
  };
  const ordnade = [...planer].sort(iTurOrdning(idag));
  // Två planer med samma namn för samma metod skiljs åt med ett nummer.
  const namnen = new Map<string, string>();
  for (const m of new Set(ordnade.map((p) => p.metod))) {
    const egna = ordnade.filter((p) => p.metod === m);
    skiljNamnen(egna.map(planensNamn)).forEach((n, i) => namnen.set(egna[i].id, n));
  }
  // Pågående och kommande står öppna, i tur och ordning; de avslutade fälls ihop sist, så att listan håller också med
  // tjugo insatser och fler (Niclas 2026-10-25: "att avslutade läggs under en lista som kan tryckas ut").
  const pagar = ordnade.filter((p) => statusAv(p, idag) !== 'avslutad');
  const slut = ordnade.filter((p) => statusAv(p, idag) === 'avslutad');
  lista.querySelector('ul')!.innerHTML = pagar.map(rad).join('');
  const fall = lista.querySelector<HTMLElement>('.pl-avslutade');
  if (fall) {
    fall.hidden = !slut.length;
    fall.innerHTML = slut.length ? `<details><summary>${slut.length === 1 ? 'En avslutad insats' : `${slut.length} avslutade insatser`}</summary><ul>${slut.map(rad).join('')}</ul></details>` : '';
  }
  lista.hidden = false;
  // Ladda ner alla mina planer, en zip med varje plans fil, och Öppna nedladdade planer, en zip eller flera filer, med
  // samma rot som Öppna en nedladdad plan i metoden (Niclas 2026-10-28). Beskedet står kvar efter att listan har ritats om.
  const besked = document.getElementById('pl-alla-besked');
  try { const b = sessionStorage.getItem('pl-alla-besked'); if (b && besked) { besked.textContent = b; besked.hidden = false; sessionStorage.removeItem('pl-alla-besked'); } } catch { /* utan lagring */ }
  document.getElementById('pl-alla-ner')?.addEventListener('click', () => {
    const fil = allaPlanerna(PLANERA.version, idag);
    if (!fil) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(fil.blob);
    a.download = fil.namn;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    if (besked) { besked.textContent = 'Alla planer är nedladdade i en zip. Lägg den bland skolans filer. Den har elevernas namn, så dela den inte.'; besked.hidden = false; }
  });
  document.getElementById('pl-alla-oppna')?.addEventListener('change', (e) => { const filer = valdaFiler(e); if (filer.length) void oppnaPlanerna(filer, 'pl-alla-besked'); });
}
