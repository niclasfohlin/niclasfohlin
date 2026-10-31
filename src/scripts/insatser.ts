// Din insats och Dina insatser (Planera insatsen, K-489; Codex-granskningen av utkastet 2026-10-24: "För flera grupper
// behövs Mina planer ... Annars förloras vägen tillbaka"). Lärarens sparade planer, ur webbläsaren
// (src/scripts/insatser-lagring.ts): på metodens sida raden under undertiteln med veckan i planen och nästa pass, och i
// metodbanken en rad per plan, den som har nästa pass först, och planerna som är slut hopfällda sist. Utan sparade planer
// syns ingenting. Samma kod visar Dina planer i Metoder, med planerna ur Lär dig metoden (K-628; Niclas 2026-10-30: "Om man
// sparar en metod ska den dyka upp under metoder som en sparad metod också med kommande, pågående och avslutad [likt]
// stödundervisning. [Men] Lär dig metoden ska bara såklart hamna i metoder"): elementets data-samling väljer samlingen och
// orden, och Stödundervisning visar aldrig Metoders planer eller tvärtom. Appens sida, /app, visar båda listorna med samma kod
// (K-644, src/components/Insatslista.astro).
import { esc, liten, PLANERA } from '../lib/standard/index.js';
import { allaPlanerna, APPENS_PLANER, idagLokalt, iSamlingen, iTurOrdning, oppnaPlanerna, SAMLINGENS_ORD, valdaFiler, lageAv, lasPlaner, nastaPassAv, planensAdress, planensNamn, raknaPagaende, samlingen, skiljNamnen, STATUSNAMN, statusAv, vidNyttDygn, type Samling, type SparadPlan } from './insatser-lagring';
import { iAppen } from './webblasaren';
import { goatFor } from './byggstenar';
import { APPEN } from '../lib/appen';
import { laddaNer } from './skattning';

// Dagens datum, som listorna läser om när ett nytt dygn har börjat medan sidan stod öppen (vidNyttDygn nedan).
let idag = idagLokalt();
// Samlingens planer och ord: insatserna i Stödundervisning och planerna i Lär dig metoden under Metoder.
const samlingAv = (el: HTMLElement): Samling => samlingen({ samling: el.dataset.samling });
const planerI = (samling: Samling) => iSamlingen(lasPlaner().planer, samling);
// En plan som pågår säger det till statistiken, en gång i veckan (K-504); bara insatserna i Stödundervisning räknas.
raknaPagaende(planerI('stodundervisning'), idag);
const FARG: Record<string, string> = { Läsning: 'var(--farg-lasning)', Skrivning: 'var(--farg-skrivning)', Socialt: 'var(--farg-socialt)', Matematik: 'var(--farg-accent)' };

// Insatsens läge som ett märke i Betas form (statusAv i src/scripts/insatser-lagring.ts).
const marke = (p: SparadPlan) => { const s = statusAv(p, idag); return `<span class="pl-status ${s}">${STATUSNAMN[s]}</span>`; };

const din = document.getElementById('pl-din');
function ritaDin() {
  if (!din) return;
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
    // En knapp som rutan ersätter, som Lär dig metoden på metodens sida under Metoder, går undan när rutan visar planen med
    // sin länk (lagningen inför lanseringen, A9).
    for (const k of document.querySelectorAll<HTMLElement>('[data-din-ersatter]')) k.hidden = true;
  }
}
ritaDin();

// Listorna med planerna (src/components/Insatslista.astro): en på varje bank och två på appens sida, en för varje samling
// (K-644). Varje lista ritas för sig. Knapparna Ladda ner planer och Öppna planer står under en banks lista och på appens
// sida en gång under båda listorna, och de gäller alltid alla planer i båda samlingarna, i en zip, så att samma knapp gör
// samma sak på varje sida (src/components/PlanernasKnappar.astro; lagningen inför lanseringen, A1; Niclas 2026-10-31:
// "Ladda ner alla planer oavsett om man är på stöd eller metoder", "I zip").
const listorna = [...document.querySelectorAll<HTMLElement>('.pl-insatser[data-samling]')];
for (const lista of listorna) ritaListan(lista);
// Ett nytt dygn medan sidan står öppen: raden och listorna ritas om med dagens läge, utan att knapparna läggs till igen
// (vidNyttDygn; rotprovet 2026-10-31, Codex fynd 3).
vidNyttDygn((ny) => { idag = ny; ritaDin(); for (const lista of listorna) ritaListan(lista, false); raknaPagaende(planerI('stodundervisning'), idag); }, idag);
// Appens par står, som listorna där, också utan planer, med Öppna planer, men inte i en webbläsare som inte sparar.
for (const block of document.querySelectorAll<HTMLElement>('[data-alla-planer]')) {
  if (!lasPlaner().ok) continue;
  block.hidden = false;
  knapparna(block);
}
// I appen står varför planerna ska laddas ner (APPENS_PLANER), en gång, under det sista paret knappar med planer att ladda
// ner, så att en sida med två listor inte säger det två gånger.
if (iAppen()) {
  const rad = [...document.querySelectorAll<HTMLElement>('[data-alla-appen]')].filter((r) => { const b = r.closest<HTMLElement>('.pl-insatser, [data-alla-planer]'); return !!b && !b.hidden && !!b.querySelector('[data-alla-ner]:not([hidden])'); }).pop();
  if (rad) { rad.textContent = APPENS_PLANER; rad.hidden = false; }
}
/**
 * Knapparna Ladda ner planer och Öppna planer i blocket (PlanernasKnappar.astro), för alla planer i båda samlingarna: Ladda
 * ner planer ger en zip med varje plans fil och syns när det finns planer, och Öppna planer tar en zip eller flera filer och
 * lägger varje plan i sin samling, med samma rot som Öppna en nedladdad plan i metoden (Niclas 2026-10-28). Beskedet efter
 * Öppna planer står kvar efter omladdningen.
 */
function knapparna(block: HTMLElement) {
  const ner = block.querySelector<HTMLElement>('[data-alla-ner]');
  if (!ner) return;
  const samling = null;
  const nyckel = 'pl-alla-besked:alla';
  const besked = block.querySelector<HTMLElement>('[data-alla-besked]');
  ner.hidden = !lasPlaner().planer.length;
  try { const b = sessionStorage.getItem(nyckel); if (b && besked) { besked.textContent = b; besked.hidden = false; sessionStorage.removeItem(nyckel); } } catch { /* utan lagring */ }
  block.querySelector('[data-alla-oppna]')?.addEventListener('change', (e) => { const filer = valdaFiler(e); if (filer.length) void oppnaPlanerna(filer, nyckel, samling); });
  ner.addEventListener('click', () => {
    const fil = allaPlanerna(PLANERA.version, idag, samling);
    if (!fil) return;
    laddaNer(fil.blob, fil.namn);
    if (besked) { besked.textContent = 'Alla planer är nedladdade i en zip. Lägg den bland skolans filer. Den har elevernas namn, så dela den inte.'; besked.hidden = false; }
  });
}
function ritaListan(lista: HTMLElement, medKnappar = true) {
  const samling = samlingAv(lista);
  const planer = planerI(samling);
  const listansOrd = SAMLINGENS_ORD[samling];
  // Trycket på en plan räknas där listan står, metodbanken eller appens sida (insatser:metodbanken och insatser:app).
  const var_ = lista.dataset.plats === 'app' ? 'app' : 'metodbanken';
  const tom = lista.querySelector<HTMLElement>('[data-tom]');
  // Utan planer syns listan på appens sida med raden om var planerna görs, och på en bank som raden om planer i en fil med
  // Öppna planer, utan rubriken, men inte i en webbläsare som inte sparar.
  if (!planer.length) {
    const iEnFil = lista.querySelector<HTMLElement>('[data-tom-bank]');
    if (!(tom || iEnFil) || !lasPlaner().ok) return;
    if (tom) tom.hidden = false;
    if (iEnFil) { iEnFil.hidden = false; lista.classList.add('pl-insatser-tom'); }
    lista.hidden = false;
    if (medKnappar) knapparna(lista);
    return;
  }
  lista.classList.remove('pl-insatser-tom');
  // Den som har nästa pass först. En avslutad plan står hopfälld sist, så att listan inte växer med gamla grupper.
  const rad = (p: SparadPlan) => {
    const lage = lageAv(p, idag);
    const gjorda = p.folj ? p.bockade ?? 0 : 0;
    const om = [lage.text, gjorda ? `${gjorda} pass bockade` : ''].filter(Boolean).join(' · ');
    return `<li style="--omr:${FARG[p.omrade ?? ''] ?? 'var(--farg-accent)'}"><a href="${esc(planensAdress(p, lage.vecka))}" data-goatcounter-click="insatser:${var_}" data-goatcounter-title="${esc(var_ === 'app' ? `Appen ${APPEN.namn}: en plan under ${listansOrd.listan}` : listansOrd.lista)}"><span class="pl-metod">${esc(p.titel)} · ${esc(namnen.get(p.id) ?? planensNamn(p))}</span><span class="pl-om">${marke(p)}${esc(om)}</span><span class="pl-pil" aria-hidden="true">${samlingen(p) === 'metoder' ? 'Planen ›' : statusAv(p, idag) === 'avslutad' || nastaPassAv(p, idag) === '9999' ? 'Efter ›' : 'Veckan ›'}</span></a></li>`;
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
  const pagar = samling === 'metoder' ? ordnade : ordnade.filter((p) => statusAv(p, idag) !== 'avslutad');
  // I Metoder, en plan per metod, står en avslutad plan kvar bland de andra och fälls inte ihop (den kalla läsaren 2026-10-30).
  const slut = samling === 'metoder' ? [] : ordnade.filter((p) => statusAv(p, idag) === 'avslutad');
  lista.querySelector('ul')!.innerHTML = pagar.map(rad).join('');
  const fall = lista.querySelector<HTMLElement>('.pl-avslutade');
  if (fall) {
    fall.hidden = !slut.length;
    fall.innerHTML = slut.length ? `<details><summary>${listansOrd.avslutade(slut.length)}</summary><ul>${slut.map(rad).join('')}</ul></details>` : '';
  }
  lista.hidden = false;
  if (medKnappar) knapparna(lista);
}
