// Din insats och Dina insatser (Planera insatsen, K-489; Codex-granskningen av utkastet 2026-10-24: "För flera grupper
// behövs Mina planer ... Annars förloras vägen tillbaka"). Lärarens sparade planer, ur webbläsaren
// (src/scripts/insatser-lagring.ts): på metodens sida raden under undertiteln med veckan i planen och nästa pass, och i
// metodbanken en rad per plan, den som har nästa pass först, och planerna som är slut hopfällda sist. Utan sparade planer
// syns ingenting. Samma kod visar Dina planer i Metoder, med planerna ur Lär dig metoden (K-628; Niclas 2026-10-30: "Om man
// sparar en metod ska den dyka upp under metoder som en sparad metod också med kommande, pågående och avslutad [likt]
// stödundervisning. [Men] Lär dig metoden ska bara såklart hamna i metoder"): elementets data-samling väljer samlingen och
// orden, och Stödundervisning visar aldrig Metoders planer eller tvärtom.
import { esc, liten, PLANERA } from '../lib/standard/index.js';
import { allaPlanerna, APPENS_PLANER, idagLokalt, iSamlingen, iTurOrdning, oppnaPlanerna, SAMLINGENS_ORD, valdaFiler, lageAv, lasPlaner, nastaPassAv, planensAdress, planensNamn, raknaPagaende, samlingen, skiljNamnen, STATUSNAMN, statusAv, type Samling, type SparadPlan } from './insatser-lagring';
import { iAppen } from './webblasaren';
import { goatFor } from './byggstenar';
import { laddaNer } from './skattning';

const idag = idagLokalt();
// Samlingens planer och ord: insatserna i Stödundervisning och planerna i Lär dig metoden under Metoder.
const samlingAv = (el: HTMLElement): Samling => samlingen({ samling: el.dataset.samling });
const planerI = (samling: Samling) => iSamlingen(lasPlaner().planer, samling);
// En plan som pågår säger det till statistiken, en gång i veckan (K-504); bara insatserna i Stödundervisning räknas.
raknaPagaende(planerI('stodundervisning'), idag);
const FARG: Record<string, string> = { Läsning: 'var(--farg-lasning)', Skrivning: 'var(--farg-skrivning)', Socialt: 'var(--farg-socialt)', Matematik: 'var(--farg-accent)' };

// Insatsens läge som ett märke i Betas form (statusAv i src/scripts/insatser-lagring.ts).
const marke = (p: SparadPlan) => { const s = statusAv(p, idag); return `<span class="pl-status ${s}">${STATUSNAMN[s]}</span>`; };

const din = document.getElementById('pl-din');
if (din) {
  const ord = SAMLINGENS_ORD[samlingAv(din)];
  // Planen med nästa pass först; med flera grupper står gruppens namn vid läget, så att det syns vilken plan det gäller
  // (granskningen 2026-10-24).
  const egna = planerI(samlingAv(din)).filter((p) => p.metod === din.dataset.metod).sort(iTurOrdning(idag));
  if (egna.length) {
    const p = egna[0];
    const lage = lageAv(p, idag);
    // Etiketten står med versaler, och gruppens namn efter den som läraren skrev det (buggjakten 2026-10-24).
    const etikett = egna.length > 1 ? ord.dina(egna.length) : ord.din;
    din.innerHTML = `<p><span class="pl-din-etikett">${esc(etikett)}${egna.length > 1 ? '' : ` · <span class="pl-din-namn">${esc(planensNamn(p))}</span>`}</span>${marke(p)}${esc(egna.length > 1 ? `${planensNamn(p)}: ${liten(lage.text)}` : lage.text)}</p><a href="${esc(planensAdress(p, lage.vecka))}" ${goatFor(ord.led, p.metod, din.dataset.titel ?? p.titel)('din-insats', ord.pagar)}>${egna.length > 1 ? ord.flera : ord.enLank}</a>`;
    din.hidden = false;
  }
}

const lista = document.getElementById('pl-insatser');
const planer = lista ? planerI(samlingAv(lista)) : [];
const listansOrd = SAMLINGENS_ORD[lista ? samlingAv(lista) : 'stodundervisning'];
if (lista && planer.length) {
  // Den som har nästa pass först. En avslutad plan står hopfälld sist, så att listan inte växer med gamla grupper.
  const rad = (p: SparadPlan) => {
    const lage = lageAv(p, idag);
    const gjorda = p.folj ? p.bockade ?? 0 : 0;
    const om = [lage.text, gjorda ? `${gjorda} pass bockade` : ''].filter(Boolean).join(' · ');
    return `<li style="--omr:${FARG[p.omrade ?? ''] ?? 'var(--farg-accent)'}"><a href="${esc(planensAdress(p, lage.vecka))}" data-goatcounter-click="insatser:metodbanken" data-goatcounter-title="${esc(listansOrd.lista)}"><span class="pl-metod">${esc(p.titel)} · ${esc(namnen.get(p.id) ?? planensNamn(p))}</span><span class="pl-om">${marke(p)}${esc(om)}</span><span class="pl-pil" aria-hidden="true">${samlingen(p) === 'metoder' ? 'Planen ›' : statusAv(p, idag) === 'avslutad' || nastaPassAv(p, idag) === '9999' ? 'Efter ›' : 'Veckan ›'}</span></a></li>`;
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
  const pagar = samlingAv(lista) === 'metoder' ? ordnade : ordnade.filter((p) => statusAv(p, idag) !== 'avslutad');
  // I Metoder, en plan per metod, står en avslutad plan kvar bland de andra och fälls inte ihop (den kalla läsaren 2026-10-30).
  const slut = samlingAv(lista) === 'metoder' ? [] : ordnade.filter((p) => statusAv(p, idag) === 'avslutad');
  lista.querySelector('ul')!.innerHTML = pagar.map(rad).join('');
  const fall = lista.querySelector<HTMLElement>('.pl-avslutade');
  if (fall) {
    fall.hidden = !slut.length;
    fall.innerHTML = slut.length ? `<details><summary>${listansOrd.avslutade(slut.length)}</summary><ul>${slut.map(rad).join('')}</ul></details>` : '';
  }
  lista.hidden = false;
  // Ladda ner alla mina planer, en zip med varje plans fil, och Öppna nedladdade planer, en zip eller flera filer, med
  // samma rot som Öppna en nedladdad plan i metoden (Niclas 2026-10-28). Beskedet står kvar efter att listan har ritats om.
  const besked = document.getElementById('pl-alla-besked');
  // I appen står varför planerna ska laddas ner, under knapparna (APPENS_PLANER).
  const appen = document.getElementById('pl-alla-appen');
  if (appen && iAppen()) { appen.textContent = APPENS_PLANER; appen.hidden = false; }
  try { const b = sessionStorage.getItem('pl-alla-besked'); if (b && besked) { besked.textContent = b; besked.hidden = false; sessionStorage.removeItem('pl-alla-besked'); } } catch { /* utan lagring */ }
  document.getElementById('pl-alla-ner')?.addEventListener('click', () => {
    const fil = allaPlanerna(PLANERA.version, idag, lista ? samlingAv(lista) : 'stodundervisning');
    if (!fil) return;
    laddaNer(fil.blob, fil.namn);
    if (besked) { besked.textContent = 'Alla planer är nedladdade i en zip. Lägg den bland skolans filer. Den har elevernas namn, så dela den inte.'; besked.hidden = false; }
  });
  document.getElementById('pl-alla-oppna')?.addEventListener('change', (e) => { const filer = valdaFiler(e); if (filer.length) void oppnaPlanerna(filer, 'pl-alla-besked', lista ? samlingAv(lista) : 'stodundervisning'); });
}
