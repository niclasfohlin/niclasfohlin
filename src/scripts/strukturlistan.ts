// Listan Att skriva ut i verktyget Strukturer (K-650): bockarna på korten på /strukturer, knappen Lägg i Att skriva ut på
// en strukturs sida och listan, som på en bred skärm står i en spalt bredvid korten och i telefonen bakom en rad längst ned,
// som på Ta fram en aktivitet (src/pages/stodundervisning/[id]/aktiviteter.astro, och dess klasser ak-valda i
// global.css). Listan sparas i webbläsaren och i länken, #lista=a,b,c, så att samma lista går att öppna på en annan enhet.
//
// Skriv ut listan hämtar de valda kortens pdf:er och lägger dem två och två på A4 med pdf-lib, framsidorna på sida 1 och
// baksidorna på sida 2 i samma ordning (src/lib/strukturkort.js, strukturkortensArk i standarden), och skriver ut, som
// knapparna i src/scripts/pdfutskrift.ts. Varje kort i en utskrift räknas i statistiken, så att topplistan räknar det.
import { el, lagring } from './kortbanken';
import { kanSkrivaUtPdf, skrivUt } from './pdfutskrift';

type Sparat = { valda: string[] };
type Strukturen = { namn: string; slag: string; farg: string; kort: string };

const ruta = document.getElementById('st-valda');
if (ruta) {
  const strukturerna: Record<string, Strukturen> = JSON.parse(ruta.dataset.strukturer!);
  const { varde: sparat, spara } = lagring<Sparat>('strukturer:lista', { valda: [] });
  sparat.valda = sparat.valda.filter((id) => id in strukturerna);
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const lista = $<HTMLOListElement>('st-valda-lista');
  const rad = $<HTMLButtonElement>('st-valda-rad');
  const not = $('st-valda-not');
  const rakna = (path: string, title: string) => (window as { goatcounter?: { count: (v: object) => void } }).goatcounter?.count({ path, title, event: true });

  const vald = (id: string) => sparat.valda.includes(id);
  function valj(id: string, pa: boolean) {
    sparat.valda = sparat.valda.filter((x) => x !== id);
    if (pa) sparat.valda.push(id);
    spara();
    visa();
  }

  // Bockarna och knapparna som lägger en struktur i listan: data-valj är strukturens id.
  const knappar = () => [...document.querySelectorAll<HTMLButtonElement>('[data-valj]')];
  function visaKnapp(b: HTMLButtonElement) {
    const id = b.dataset.valj!;
    const med = vald(id);
    b.setAttribute('aria-pressed', String(med));
    const namn = strukturerna[id].namn;
    if (b.classList.contains('st-bock')) {
      b.setAttribute('aria-label', `${namn} i listan att skriva ut`);
      b.title = med ? 'I listan att skriva ut. Tryck för att ta bort' : 'Lägg i listan att skriva ut';
      b.closest('.st-kort')?.classList.toggle('vald', med);
    } else b.textContent = med ? 'Ta bort ur Att skriva ut' : 'Lägg i Att skriva ut';
  }
  // Ett tryck på en bock eller knapp med data-valj, också på kort som topplistan lägger in efter laddningen
  // (src/pages/strukturer/index.astro), som då säger till med händelsen strukturer:ritad.
  document.addEventListener('click', (e) => { const b = (e.target as Element | null)?.closest?.<HTMLElement>('[data-valj]'); if (b) valj(b.dataset.valj!, !vald(b.dataset.valj!)); });
  document.addEventListener('strukturer:ritad', () => visa());

  function visa() {
    const n = sparat.valda.length;
    document.querySelectorAll('.st-valda-antal').forEach((x) => { x.textContent = String(n); });
    $('st-valda-tom').hidden = n > 0;
    lista.replaceChildren(...sparat.valda.map((id) => {
      const s = strukturerna[id];
      const li = el('li', 'ak-valt');
      li.style.setProperty('--kat', s.farg);
      const lank = el('a', 'ak-valt-namn', s.namn) as HTMLAnchorElement;
      lank.href = `/strukturer/${id}`;
      const bort = el('button', 'ak-valt-bort', '×') as HTMLButtonElement;
      bort.type = 'button';
      bort.setAttribute('aria-label', `Ta bort ${s.namn} ur listan`);
      bort.addEventListener('click', () => {
        const i = sparat.valda.indexOf(id);
        valj(id, false);
        const kvar = lista.querySelectorAll<HTMLButtonElement>('.ak-valt-bort');
        if (kvar.length) kvar[Math.min(i, kvar.length - 1)].focus();
        else (rad.offsetParent ? rad : $('st-valda-rubrik')).focus();
      });
      li.append(lank, bort);
      return li;
    }));
    knappar().forEach(visaKnapp);
    ruta!.classList.toggle('har-kort', n > 0);
    $('st-skrivut-valda').setAttribute('aria-disabled', String(n === 0));
    // Listans knapp heter efter antalet, så att den inte delar namn med Skriv ut kortet på strukturens sida (de kalla
    // läsarna 2026-11-01).
    $('st-skrivut-valda').textContent = n ? `Skriv ut ${n} kort` : 'Skriv ut listan';
    $('st-tom').hidden = n === 0;
    $('st-kopiera').hidden = n === 0;
  }

  $('st-tom').addEventListener('click', () => { sparat.valda = []; spara(); visa(); });

  // Listan i telefonen: en rad längst ned med antalet, som fäller ut listan över sidan.
  const stang = () => { ruta.dataset.oppen = 'false'; rad.setAttribute('aria-expanded', 'false'); };
  rad.addEventListener('click', () => { const oppen = ruta.dataset.oppen !== 'true'; ruta.dataset.oppen = String(oppen); rad.setAttribute('aria-expanded', String(oppen)); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ruta.dataset.oppen === 'true') { stang(); rad.focus(); } });

  // Listans länk: verktygets adress med strukturerna i listan.
  $('st-kopiera').addEventListener('click', async () => {
    const url = `${location.origin}/strukturer#lista=${sparat.valda.join(',')}`;
    const knappen = $('st-kopiera');
    try {
      await navigator.clipboard.writeText(url);
      not.textContent = 'Länken är kopierad. Öppna den på en annan enhet, så har du samma lista där.';
      knappen.textContent = 'Länken är kopierad';
    } catch { not.textContent = url; }
    window.setTimeout(() => { not.textContent = ''; knappen.textContent = 'Kopiera listans länk'; }, 8000);
  });

  // Utskriften: korten två och två på A4. Där webbläsaren kan skriva ut en pdf direkt öppnas utskriftsrutan; annars
  // öppnas pdf:en i en ny flik, som öppnas medan knappen trycks, så att webbläsaren inte stoppar den.
  const knapp = $<HTMLAnchorElement>('st-skrivut-valda');
  knapp.addEventListener('click', async (e) => {
    e.preventDefault();
    if (knapp.getAttribute('aria-busy') === 'true' || !sparat.valda.length) return;
    const valda = [...sparat.valda];
    const text = knapp.textContent;
    knapp.setAttribute('aria-busy', 'true');
    knapp.textContent = 'Lägger korten två och två …';
    const direkt = kanSkrivaUtPdf();
    const flik = direkt ? null : window.open('', '_blank');
    try {
      const [pdflib, { strukturkortenTvaOchTva }] = await Promise.all([import('pdf-lib'), import('../lib/strukturkort.js')]);
      const kort = await Promise.all(valda.map(async (id) => {
        const svar = await fetch(strukturerna[id].kort);
        if (!svar.ok) throw new Error(`${id}: ${svar.status}`);
        return svar.arrayBuffer();
      }));
      const bytes = await strukturkortenTvaOchTva(pdflib, kort, { titel: `Strukturkort: ${valda.map((id) => strukturerna[id].namn).join(', ')}` });
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
      if (direkt) skrivUt(url); else if (flik) flik.location.href = url; else location.assign(url);
      rakna('utskrift:strukturer/listan', `Strukturer: utskrift av listan, ${valda.length} kort`);
      for (const id of valda) rakna(`utskrift:strukturer/${id}`, `${strukturerna[id].namn}: strukturkortet utskrivet`);
      knapp.textContent = text;
    } catch {
      flik?.close();
      knapp.textContent = 'Det gick inte. Försök igen';
      window.setTimeout(() => { knapp.textContent = text; }, 4000);
    }
    knapp.removeAttribute('aria-busy');
  });

  // #lista=a,b,c är en lista från en annan enhet: den blir listan, och sidan säger till när den ersätter en annan.
  const fran = decodeURIComponent(location.hash.slice(1)).match(/^lista=(.*)$/);
  if (fran) {
    const nya = [...new Set(fran[1].split(',').filter((id) => id in strukturerna))];
    const ersatt = sparat.valda.length > 0 && sparat.valda.join(',') !== nya.join(',');
    sparat.valda = nya;
    spara();
    if (ersatt) not.textContent = 'Listan kommer från länken och har ersatt den som fanns här.';
    history.replaceState(null, '', location.pathname);
    ruta.dataset.oppen = 'true';
    rad.setAttribute('aria-expanded', 'true');
  }
  visa();
}
