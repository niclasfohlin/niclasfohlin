// Ta fram ur en bank i webbläsaren (src/components/TaFram.astro, src/lib/tafram.ts). Raderna står i sidan; datafilen med
// texterna och utskrifterna hämtas i bakgrunden när sidan är klar och väntas in vid Visa stort och utskriften, så att
// sidan går att använda direkt. Listan att skriva ut och slumpen är desamma som på Ta fram en aktivitet: en bock på
// varje post, listan bredvid på en bred skärm och i en rad längst ned i telefonen, och en post kommer inte fram igen
// förrän urvalets alla har varit framme. Det som sparas i webbläsaren: nivån, taggen, det som har visats och listan.
// Lösningsförslaget i Visa stort ritas av samma funktion som på problemets sida i metoden (src/lib/losningsforslag.ts).
import { dra, el, lagring } from './kortbanken';
import { ettkortLank, flerakortKnapp } from './pdfutskrift';
import { hamtplan, type PostUtskrift } from '../lib/standard/index.js';
import { losningsforslagHtml, losningsstegen, losningsstegHtml, type LosningsforslagVy } from '../lib/losningsforslag';

// Lösningsförslaget står i datafilen utan problemet, som posten redan har, och rutan står en gång (taFramData).
type Lf = Omit<LosningsforslagVy, 'problem' | 'ruta'>;
type Post = { id: string; niva: string; nivaSlug: string; nr: number; titel: string; tagg?: string; sida: string; losning?: string; bild: { adress: string; alt: string }; stycken: string[]; fragor: string[]; utskrift: { post: PostUtskrift; med: PostUtskrift }; losningsforslag?: Lf };
type Data = { poster: Post[]; filer: Record<string, { adress: string; byte: number }>; nivaer: { namn: string; slug: string; farg: string; antal: number }[]; losningsruta?: LosningsforslagVy['ruta'] };

const sida = document.querySelector<HTMLElement>('.tafram')!;
const metod = sida.dataset.metod!;
const led = sida.dataset.led!;
const titel = sida.dataset.titel!;
// Bankens ord och det som skrivs ut med posterna, som problem och lösningsförslagen (src/lib/bank.ts, src/lib/tafram.ts).
const ord = { en: sida.dataset.en!, flera: sida.dataset.flera!, alla: sida.dataset.alla!, bestamd: sida.dataset.bestamd! };
const folje = sida.dataset.folje!;
const foljeEn = sida.dataset.foljeEn!;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const raknaHandelse = (path: string, title: string) => (window as { goatcounter?: { count: (v: object) => void } }).goatcounter?.count({ path, title, event: true });

document.documentElement.classList.add('tf-js');
for (const x of sida.querySelectorAll<HTMLElement>('[data-js]')) x.hidden = false;

// ---------- Datafilen ----------
let lofte: Promise<Data> | undefined;
const data = () => (lofte ??= fetch(sida.dataset.kortdata!).then((s) => { if (!s.ok) throw new Error(`svaret ${s.status}`); return s.json() as Promise<Data>; }).catch((fel) => { lofte = undefined; throw fel; }));
// Den som bara tittar hämtar den inte: den hämtas vid första tryck eller tangent på sidan, så att Visa stort och
// utskriften brukar ha den när de behöver den.
const forsta = () => { data().then(visaStorlek).catch(() => {}); };
for (const h of ['pointerdown', 'keydown']) sida.addEventListener(h, forsta, { once: true, passive: true });

// ---------- Raderna ----------
const nivaer = [...sida.querySelectorAll<HTMLElement>('.tf-niva')];
const rader = [...sida.querySelectorAll<HTMLLIElement>('.tf-post')];
const rad = new Map(rader.map((r) => [r.id, r]));
const nivaAv = (r: HTMLElement) => r.closest<HTMLElement>('.tf-niva')!;
const namnAv = (id: string) => { const r = rad.get(id)!; return { nr: r.dataset.nr!, titel: r.dataset.titel!, niva: nivaAv(r).dataset.nivanamn!, farg: nivaAv(r).style.getPropertyValue('--niva') }; };
const nivaKnappar = [...sida.querySelectorAll<HTMLButtonElement>('.tf-val .sk-niva')];
const taggKnappar = [...sida.querySelectorAll<HTMLButtonElement>('.tf-val .tf-tagg')];

type Sparat = { niva?: string; tagg: string; sedda: string[]; bockade: string[] };
const { varde: sparat, spara } = lagring<Sparat>(`tafram:${metod}/${led}`, { tagg: '', sedda: [], bockade: [] });
sparat.bockade = sparat.bockade.filter((id) => rad.has(id));
// Nivån är en av nivåerna eller alla (Niclas 2026-10-18: "Vill ha en Alla också i nivån").
const giltigNiva = (n?: string) => n === 'alla' || nivaer.some((x) => x.dataset.niva === n);
if (!giltigNiva(sparat.niva)) sparat.niva = nivaer[0].dataset.niva;

// Bocken i varje rad: den finns bara med JavaScript och ritas här, inte i sidan, i en kolumn som har sin bredd från
// början. Visa stort står i sidan och visas med klassen tf-js, som skriptet före raderna sätter.
const BOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12.5l3.7 3.7 7.3-8"/></svg>';
for (const r of rader) {
  const bock = el('button', 'tf-bock') as HTMLButtonElement;
  bock.type = 'button';
  bock.setAttribute('aria-pressed', 'false');
  bock.setAttribute('aria-label', `${r.dataset.titel} i listan att skriva ut`);
  bock.innerHTML = BOCK;
  r.append(bock);
}

// Taggen i varje rad blir en knapp som visar nivåns poster med samma tagg, som taggen på brainbreakkortet.
for (const t of sida.querySelectorAll<HTMLElement>('.tf-radtagg')) {
  const b = el('button', 'tf-radtagg', t.textContent ?? '') as HTMLButtonElement;
  b.type = 'button';
  b.dataset.tagg = t.dataset.tagg;
  b.title = `Visa ${ord.alla} i ${t.textContent} på nivån`;
  b.addEventListener('click', () => { valjTagg(b.dataset.tagg!); $('tf-poster').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); });
  t.replaceWith(b);
}

function visa() {
  const alla = sparat.niva === 'alla';
  const iNivan = (r: HTMLElement) => alla || nivaAv(r).dataset.niva === sparat.niva;
  const finns = (tagg: string) => rader.some((r) => iNivan(r) && r.dataset.tagg === tagg);
  if (sparat.tagg && !finns(sparat.tagg)) sparat.tagg = '';
  let synliga = 0;
  for (const r of rader) { const med = iNivan(r) && (!sparat.tagg || r.dataset.tagg === sparat.tagg); r.hidden = !med; if (med) synliga++; }
  // En nivå syns när den är vald, eller med Alla när den har poster som syns; med Alla står rubrikerna kvar.
  for (const n of nivaer) n.hidden = alla ? !rader.some((r) => !r.hidden && nivaAv(r) === n) : n.dataset.niva !== sparat.niva;
  sida.classList.toggle('tf-alla', alla);
  for (const b of nivaKnappar) { const pa = b.dataset.niva === sparat.niva; b.setAttribute('aria-pressed', String(pa)); b.classList.toggle('senast', pa); }
  for (const b of taggKnappar) {
    const t = b.dataset.tagg!;
    const n = rader.filter((r) => iNivan(r) && (!t || r.dataset.tagg === t)).length;
    b.querySelector('[data-antal]')!.textContent = String(n);
    b.hidden = !!t && n === 0;
    b.setAttribute('aria-pressed', String(t === sparat.tagg));
  }
  $('tf-tom').hidden = synliga > 0;
  history.replaceState(null, '', `#${sparat.niva}${sparat.tagg ? `/${sparat.tagg}` : ''}`);
  spara();
}
function valjTagg(tagg: string) { sparat.tagg = tagg; visa(); }
for (const b of nivaKnappar) b.addEventListener('click', () => { sparat.niva = b.dataset.niva; visa(); });
for (const b of taggKnappar) b.addEventListener('click', () => valjTagg(b.dataset.tagg!));

// ---------- Listan att skriva ut ----------
const valda = $('tf-valda');
const lista = $<HTMLOListElement>('tf-valda-lista');
const listrad = $<HTMLButtonElement>('tf-valda-rad');
const bockad = (id: string) => sparat.bockade.includes(id);
function bocka(id: string, pa: boolean) {
  sparat.bockade = sparat.bockade.filter((x) => x !== id);
  if (pa) sparat.bockade.push(id);
  spara();
  visaBockar();
}
for (const r of rader) {
  const b = r.querySelector<HTMLButtonElement>('.tf-bock')!;
  b.addEventListener('click', () => bocka(r.id, !bockad(r.id)));
}
const stang = () => { valda.dataset.oppen = 'false'; listrad.setAttribute('aria-expanded', 'false'); };
listrad.addEventListener('click', () => { const oppen = valda.dataset.oppen !== 'true'; valda.dataset.oppen = String(oppen); listrad.setAttribute('aria-expanded', String(oppen)); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && valda.dataset.oppen === 'true' && !dialog.open) { stang(); listrad.focus(); } });

function visaBockar() {
  const n = sparat.bockade.length;
  for (const r of rader) {
    const pa = bockad(r.id);
    r.classList.toggle('vald', pa);
    const b = r.querySelector<HTMLButtonElement>('.tf-bock')!;
    b.setAttribute('aria-pressed', String(pa));
    b.title = pa ? 'I listan att skriva ut. Tryck för att ta bort' : 'Lägg i listan att skriva ut';
  }
  document.querySelectorAll('.tf-valda .ak-valda-antal').forEach((x) => { x.textContent = String(n); });
  $('tf-valda-tom').hidden = n > 0;
  lista.replaceChildren(...sparat.bockade.map((id) => {
    const p = namnAv(id);
    const li = el('li', 'ak-valt');
    li.style.setProperty('--kat', p.farg);
    const visaKnapp = el('button', 'ak-valt-namn') as HTMLButtonElement;
    visaKnapp.type = 'button';
    visaKnapp.append(el('span', 'ak-nr', `${p.niva} ${p.nr}`), ` · ${p.titel}`);
    visaKnapp.title = `Visa ${p.titel} stort`;
    visaKnapp.addEventListener('click', () => { stang(); void visaStort(id, false); });
    const bort = el('button', 'ak-valt-bort', '×') as HTMLButtonElement;
    bort.type = 'button';
    bort.setAttribute('aria-label', `Ta bort ${p.titel} ur listan`);
    bort.addEventListener('click', () => {
      const i = sparat.bockade.indexOf(id);
      bocka(id, false);
      const kvar = lista.querySelectorAll<HTMLButtonElement>('.ak-valt-bort');
      if (kvar.length) kvar[Math.min(i, kvar.length - 1)].focus();
      else (listrad.offsetParent ? listrad : $('tf-valda-rubrik')).focus();
    });
    li.append(visaKnapp, bort);
    return li;
  }));
  valda.classList.toggle('har-kort', n > 0);
  for (const id of ['tf-skrivut', 'tf-skrivut-med']) $(id).setAttribute('aria-disabled', String(n === 0));
  $('tf-tomlista').hidden = n === 0;
  $('tf-kopiera').hidden = n === 0;
  if (lofte) data().then(visaStorlek).catch(() => {}); else visaStorlek();
}
$('tf-tomlista').addEventListener('click', () => { sparat.bockade = []; spara(); visaBockar(); (listrad.offsetParent ? listrad : $('tf-valda-rubrik')).focus(); });

// Storleken innan utskriften (granskningen 2026-10-18: säg storleken först), ur hämtplanen: posternas egna pdf:er eller
// källfilen en gång, det som är minst.
const mb = (byte: number) => `${(byte / 1048576).toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`;
const planFor = (d: Data, slag: 'post' | 'med') => hamtplan(sparat.bockade.map((id) => ({ id, u: d.poster.find((p) => p.id === id)!.utskrift[slag] })), d.filer);
function visaStorlek(d?: Data) {
  const not = $('tf-storlek');
  const n = sparat.bockade.length;
  if (!n || !d) { not.textContent = ''; return; }
  not.textContent = `${n} ${n === 1 ? ord.en : ord.flera}, omkring ${mb(planFor(d, 'post').byte)}, eller ${mb(planFor(d, 'med').byte)} med ${folje}.`;
}

// Listans länk: sidans adress med posterna i listan, som öppnar samma lista i en annan webbläsare.
$('tf-kopiera').addEventListener('click', async () => {
  const url = `${location.origin}${location.pathname}#lista=${sparat.bockade.join(',')}`;
  const not = $('tf-valda-not');
  try { await navigator.clipboard.writeText(url); not.textContent = 'Länken är kopierad. Öppna den på en annan enhet, så har du samma lista där.'; } catch { not.textContent = url; }
  window.setTimeout(() => { not.textContent = ''; }, 6000);
});

// Utskriften: listans poster i listans ordning, bara posterna eller med följesidorna.
const listansTitel = (med: boolean) => `${titel}${med ? `, med ${folje}` : ''}: ${sparat.bockade.map((id) => namnAv(id).titel).join(', ')}`;
flerakortKnapp($('tf-skrivut'), async () => ({ plan: planFor(await data(), 'post'), titel: listansTitel(false) }), 'Hämtar …');
flerakortKnapp($('tf-skrivut-med'), async () => ({ plan: planFor(await data(), 'med'), titel: listansTitel(true) }), 'Hämtar …');

// ---------- Visa stort ----------
const dialog = $<HTMLDialogElement>('tf-stort');
let stortId: string | undefined;
let franFokus: HTMLElement | null = null;
const stortBock = $<HTMLButtonElement>('tf-stort-bock');
const visaStortBock = () => {
  const pa = !!stortId && bockad(stortId);
  stortBock.setAttribute('aria-pressed', String(pa));
  $('tf-stort-bock-text').textContent = pa ? 'I listan' : 'Lägg i listan';
};
// Lösningsförslaget i rutan (Niclas 2026-10-18: "Synas brevid varandra när man trycker på problemet i pc och under
// varandra i mobil?"): bredvid problemet på en bred skärm, under det i telefonen. Utskriften i rutan är det som syns.
const losningKnapp = $<HTMLButtonElement>('tf-stort-losning');
const losningYta = $('tf-stort-lf');
let stortPost: Post | undefined;
let losningsruta: LosningsforslagVy['ruta'] | undefined;
// Bladet ur posten: problemet, bilden och frågorna står i posten, och rutan en gång i datafilen.
const bladet = (p: Post): LosningsforslagVy => ({ ...p.losningsforslag!, problem: { stycken: p.stycken, fragor: p.fragor, bild: p.bild }, ruta: losningsruta ?? { rubrik: '', punkter: [] } });
// I stegen A, B, A och B och C finns ingen utskrift som är det som syns, så knappen står bara vid problemet
// (granskningen 2026-10-18: samma steg skrev ut olika material beroende på vad som visades före).
function skrivutLank() {
  const skrivut = $<HTMLAnchorElement>('tf-stort-skrivut');
  if (!stortPost || steg > 0) { skrivut.hidden = true; return; }
  const med = !losningYta.hidden;
  skrivut.href = (med ? stortPost.utskrift.med : stortPost.utskrift.post).adress;
  skrivut.textContent = med ? `Skriv ut ${ord.bestamd} och ${foljeEn}` : `Skriv ut ${ord.bestamd}`;
  skrivut.hidden = false;
}
function visaLosning(pa: boolean) {
  const lf = stortPost?.losningsforslag;
  const visas = pa && !!lf;
  if (visas && losningYta.dataset.id !== stortPost!.id) {
    losningYta.innerHTML = losningsforslagHtml(bladet(stortPost!), { farg: namnAv(stortPost!.id).farg, rubrik: 'h2', utanProblem: true });
    losningYta.dataset.id = stortPost!.id;
  }
  losningYta.hidden = !visas;
  dialog.classList.toggle('med-losning', visas);
  losningKnapp.setAttribute('aria-pressed', String(visas));
  losningKnapp.textContent = visas ? `Dölj ${foljeEn}` : `Visa ${foljeEn}`;
  skrivutLank();
}
// Stegen på helskärm (Niclas 2026-10-18, med metodriggens ordning): problemet, lösning A, lösning B, A och B, och C.
// Steget Problemet är rutan som den är; de andra står i ytan tf-visning, och lärarens blad står bara vid problemet.
const stegRad = $('tf-steg');
const stegKnappar = [...stegRad.querySelectorAll<HTMLButtonElement>('button')];
const visning = $('tf-visning');
const sidorna = $('tf-stort-sidor');
let steg = 0;
let stegRaknade = false;
const antalSteg = () => (stortPost?.losningsforslag ? losningsstegen(stortPost.losningsforslag).length : 1);
function visaSteg(n: number) {
  const lf = stortPost?.losningsforslag;
  steg = lf ? Math.max(0, Math.min(n, antalSteg() - 1)) : 0;
  stegRad.hidden = !lf;
  dialog.classList.toggle('med-steg', !!lf);
  stegKnappar.forEach((b, i) => { b.hidden = !lf || i >= antalSteg(); if (i === steg) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
  const iSteg = steg > 0 && !!lf;
  sidorna.hidden = iSteg;
  visning.hidden = !iSteg;
  if (iSteg) {
    visning.innerHTML = losningsstegHtml(lf!, steg);
    if (!stegRaknade) { stegRaknade = true; raknaHandelse(`${led}:${metod}:losningarna`, `${titel}: lösningarna på helskärm`); }
  } else visning.replaceChildren();
  losningKnapp.hidden = !lf || iSteg;
  skrivutLank();
  dialog.scrollTop = 0;
}
for (const b of stegKnappar) b.addEventListener('click', () => visaSteg(Number(b.dataset.steg)));
// Piltangenterna och en bläddrares knappar (Page Up och Page Down) byter steg, som i en presentation.
dialog.addEventListener('keydown', (e) => {
  if (!stortPost?.losningsforslag || e.altKey || e.ctrlKey || e.metaKey) return;
  const fram = e.key === 'ArrowRight' || e.key === 'PageDown';
  const bak = e.key === 'ArrowLeft' || e.key === 'PageUp';
  if (!fram && !bak) return;
  e.preventDefault();
  visaSteg(steg + (fram ? 1 : -1));
  stegKnappar[steg]?.focus();
});

losningKnapp.addEventListener('click', () => {
  const pa = !!losningYta.hidden;
  visaLosning(pa);
  if (!pa) return;
  raknaHandelse(`${led}:${metod}:losningsforslag`, `${titel}: Lösningsförslag i Visa stort`);
  // I telefonen står bladet under problemet: rutan rullar dit.
  if (!matchMedia('(min-width: 64rem)').matches) losningYta.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
});

async function visaStort(id: string, franTaFram: boolean, medLosning = false) {
  const r = rad.get(id)!;
  const p = namnAv(id);
  stortId = id;
  const oppna = !dialog.open;
  if (oppna) franFokus = document.activeElement as HTMLElement | null;
  const antal = rader.filter((x) => nivaAv(x) === nivaAv(r)).length;
  const tagg = r.dataset.tagg ? r.querySelector('.tf-radtagg')?.textContent : '';
  $('tf-stort-etikett').textContent = `${p.niva} · ${ord.en} ${p.nr} av ${antal}${tagg ? ` · ${tagg}` : ''}`;
  $('tf-stort-etikett').style.setProperty('--niva', p.farg);
  $('tf-stort-sida').style.setProperty('--bok-niva', p.farg);
  $('tf-stort-titel').textContent = p.titel;
  const bild = $<HTMLImageElement>('tf-stort-bild');
  bild.src = r.querySelector<HTMLImageElement>('.tf-bild')!.getAttribute('src')!;
  bild.alt = '';
  $('tf-stort-text').replaceChildren(el('p', 'tf-stort-vantar', 'Hämtar …'));
  $('tf-stort-fraga').replaceChildren();
  $('tf-stort-nasta').hidden = !franTaFram;
  $<HTMLAnchorElement>('tf-stort-sidan').href = r.querySelector<HTMLAnchorElement>('.tf-sidlank')!.href;
  // Lösningsförslaget står dolt tills läraren trycker, också när ett nytt problem visas i samma ruta, och rutan börjar
  // vid problemet.
  stortPost = undefined;
  stegRaknade = false;
  losningKnapp.hidden = true;
  visaLosning(false);
  visaSteg(0);
  const skrivut = $<HTMLAnchorElement>('tf-stort-skrivut');
  skrivut.hidden = true;
  visaStortBock();
  // Namnet och etiketten står där innan rutan öppnas, så att skärmläsaren läser rätt problem.
  if (oppna) dialog.showModal();
  dialog.scrollTop = 0;
  let d: Data;
  try { d = await data(); } catch { $('tf-stort-text').replaceChildren(el('p', undefined, 'Det gick inte att hämta. Ladda om sidan, eller öppna sidan med knappen nedanför.')); return; }
  if (stortId !== id) return;
  const post = d.poster.find((x) => x.id === id)!;
  bild.alt = post.bild.alt;
  $('tf-stort-text').replaceChildren(...post.stycken.map((s) => { const e = el('p'); s.split('\n').forEach((rd, i) => { if (i) e.append(document.createElement('br')); e.append(rd); }); return e; }));
  const fraga = $('tf-stort-fraga');
  fraga.replaceChildren(el('p', 'problemsida-fraga-rubrik', post.fragor.length > 1 ? 'Frågorna' : 'Frågan'));
  if (post.fragor.length > 1) {
    const ol = el('ol');
    post.fragor.forEach((f, i) => { const li = el('li'); li.append(el('span', 'boksida-nr', `${i + 1}.`), el('span', undefined, f)); ol.append(li); });
    fraga.append(ol);
  } else fraga.append(el('p', undefined, post.fragor[0] ?? ''));
  stortPost = post;
  losningsruta = d.losningsruta;
  visaSteg(0);
  visaLosning(medLosning);
  if (medLosning && post.losningsforslag && !matchMedia('(min-width: 64rem)').matches) losningYta.scrollIntoView({ block: 'start' });
}
stortBock.addEventListener('click', () => { if (stortId) { bocka(stortId, !bockad(stortId)); visaStortBock(); } });
$('tf-stang').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
// Fokus går tillbaka dit läraren var, eller till listan när knappen inte längre finns eller syns (listan ritas om när
// bocken ändras, och i telefonen fälls den ihop när ett problem visas).
dialog.addEventListener('close', () => {
  stortId = undefined;
  if (franFokus?.isConnected && franFokus.offsetParent !== null) franFokus.focus();
  else (listrad.offsetParent ? listrad : $('tf-valda-rubrik')).focus();
});
ettkortLank($<HTMLAnchorElement>('tf-stort-skrivut'));
for (const r of rader) {
  const visaKnapp = r.querySelector<HTMLButtonElement>('.tf-visa')!;
  const oppna = () => { raknaHandelse(`${led}:${metod}:visa-stort`, `${titel}: Visa stort`); void visaStort(r.id, false); };
  visaKnapp.addEventListener('click', oppna);
  r.querySelector('.tf-bild')!.addEventListener('click', oppna);
  // Länken Lösningsförslag leder utan JavaScript till bladet på problemets sida i metoden; med JavaScript öppnar den
  // rutan med problemet och lösningsförslaget.
  r.querySelector('.tf-losning')?.addEventListener('click', (e) => {
    const m = e as MouseEvent;
    if (m.ctrlKey || m.metaKey || m.shiftKey || m.button !== 0) return;
    e.preventDefault();
    raknaHandelse(`${led}:${metod}:losningsforslag`, `${titel}: Lösningsförslag i Visa stort`);
    void visaStort(r.id, false, true);
  });
}

// ---------- Ta fram ett ----------
// Ett av de poster som syns, inte ett som står i listan, och inte samma igen förrän urvalets alla har varit framme.
function taFram() {
  const urval = rader.filter((r) => !r.hidden && !bockad(r.id)).map((r) => ({ id: r.id }));
  if (!urval.length) {
    $('tf-tom').hidden = false;
    $('tf-tom').textContent = `Alla ${ord.flera} som syns står i listan att skriva ut. Ta bort ett ur listan, eller välj en annan nivå eller tagg.`;
    return;
  }
  const r = dra(urval, 1, sparat.sedda);
  sparat.sedda = r.sedda;
  spara();
  void visaStort(r.valda[0].id, true);
}
$('tf-tafram').addEventListener('click', taFram);
$('tf-stort-nasta').addEventListener('click', taFram);

// ---------- Adressen ----------
// #bas och #bas/geometri är nivån och taggen, #bas-3 är ett problem, och #lista=bas-1,bas-3 är en lista från en annan
// enhet: den blir listan att skriva ut, och sidan säger till när den ersätter en annan lista. Adressen läses när sidan
// öppnas och när den ändras (hashchange); sidans egna ändringar av adressen ger ingen sådan händelse.
function lasAdressen() {
  let hash = location.hash.slice(1);
  try { hash = decodeURIComponent(hash); } catch { /* en trasig adress läses som den står */ }
  const fran = hash.match(/^lista=(.*)$/);
  if (fran) {
    const nya = [...new Set(fran[1].split(',').filter((id) => rad.has(id)))];
    const ersatt = sparat.bockade.length > 0 && sparat.bockade.join(',') !== nya.join(',');
    sparat.bockade = nya;
    if (ersatt) $('tf-valda-not').textContent = 'Listan kommer från länken och har ersatt den som fanns här.';
    valda.dataset.oppen = 'true';
    listrad.setAttribute('aria-expanded', 'true');
  } else if (rad.has(hash)) {
    sparat.niva = nivaAv(rad.get(hash)!).dataset.niva;
    sparat.tagg = '';
  } else {
    const [niva, tagg] = hash.split('/');
    if (giltigNiva(niva)) { sparat.niva = niva; sparat.tagg = tagg ?? ''; }
  }
  visa();
  visaBockar();
  // En lista från adressen eller minnet behöver datan för storleken.
  if (sparat.bockade.length) forsta();
  // Ett problem i adressen står kvar i den, så att en omladdning visar samma problem.
  if (rad.has(hash)) { history.replaceState(null, '', `#${hash}`); rad.get(hash)!.scrollIntoView({ block: 'center' }); }
}
lasAdressen();
window.addEventListener('hashchange', lasAdressen);
// Startstilen (skriptet före raderna i TaFram.astro) har gjort sitt: nu bär nivåerna och raderna hidden själva.
document.getElementById('tf-tidig')?.remove();
