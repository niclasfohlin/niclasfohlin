// Din insats och Dina insatser (Planera insatsen, K-489; Codex-granskningen av utkastet 2026-10-24: "För flera grupper
// behövs Mina planer ... Annars förloras vägen tillbaka"). Lärarens sparade planer, ur webbläsaren
// (src/scripts/insatser-lagring.ts): på metodens sida raden under undertiteln med veckan i planen och nästa pass, och i
// metodbanken en rad per plan, den som har nästa pass först. Utan sparade planer syns ingenting.
import { idagLokalt, lageAv, lasPlaner, type SparadPlan } from './insatser-lagring';

const idag = idagLokalt();
const { planer } = lasPlaner();
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const adress = (p: SparadPlan, vecka?: number) => `/stodundervisning/${encodeURIComponent(p.metod)}/planera#${p.val}&p=${encodeURIComponent(p.id)}${vecka ? `&v=${vecka}` : ''}`;
const nyast = (a: SparadPlan, b: SparadPlan) => (a.andrad < b.andrad ? 1 : -1);
const FARG: Record<string, string> = { Läsning: 'var(--farg-lasning)', Skrivning: 'var(--farg-skrivning)', Socialt: 'var(--farg-socialt)', Matematik: 'var(--farg-accent)' };

const din = document.getElementById('pl-din');
if (din) {
  const egna = planer.filter((p) => p.metod === din.dataset.metod).sort(nyast);
  if (egna.length) {
    const p = egna[0];
    const lage = lageAv(p, idag);
    const etikett = egna.length > 1 ? `Dina insatser · ${egna.length} grupper` : `Din insats${p.namn ? ` · ${p.namn}` : ''}`;
    din.innerHTML = `<p><span class="pl-din-etikett">${esc(etikett)}</span>${esc(lage.text)}</p><a href="${esc(adress(p, lage.vecka))}" data-goatcounter-click="planera:${esc(p.metod)}:din-insats" data-goatcounter-title="${esc(din.dataset.titel ?? p.titel)}: Din insats på metodens sida">${egna.length > 1 ? 'Planerna' : 'Veckan i planen'}</a>`;
    din.hidden = false;
  }
}

const lista = document.getElementById('pl-insatser');
if (lista && planer.length) {
  // Den som har nästa pass först; en plan som är slut sist.
  const nasta = (p: SparadPlan) => p.schema.pass.map((x) => x[0]).filter((d) => d >= idag).sort()[0] ?? '9999';
  const rader = [...planer].sort((a, b) => (nasta(a) < nasta(b) ? -1 : nasta(a) > nasta(b) ? 1 : nyast(a, b))).map((p) => {
    const lage = lageAv(p, idag);
    const gjorda = p.folj ? (p.foljd?.gjorda ?? []).length : 0;
    const om = [p.namn, lage.text, gjorda ? `${gjorda} ${gjorda === 1 ? 'pass har' : 'pass har'} blivit av` : ''].filter(Boolean).join(' · ');
    return `<li style="--omr:${FARG[p.omrade ?? ''] ?? 'var(--farg-accent)'}"><a href="${esc(adress(p, lage.vecka))}" data-goatcounter-click="insatser:metodbanken" data-goatcounter-title="Metodbanken: en plan under Dina insatser"><span class="pl-metod">${esc(p.titel)}</span><span class="pl-om">${esc(om)}</span><span class="pl-pil" aria-hidden="true">Veckan ›</span></a></li>`;
  });
  lista.querySelector('ul')!.innerHTML = rader.join('');
  lista.hidden = false;
}
