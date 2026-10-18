// Ta fram ur en bank i webbläsaren (src/components/TaFram.astro, src/lib/tafram.ts). Raderna står i sidan; datafilen med
// texterna och utskrifterna hämtas i bakgrunden när sidan är klar och väntas in vid Visa stort och utskriften, så att
// sidan går att använda direkt. Listan att skriva ut är densamma som på Ta fram en aktivitet: en bock på varje post, och
// listan bredvid på en bred skärm och i en rad längst ned i telefonen. Läraren bläddrar och väljer själv; sidan tar inte
// fram någon post på måfå (Niclas 2026-10-18: "Man får bläddra bland dem och sortera sedan välja"). Det som sparas i
// webbläsaren: nivån, taggen och listan. Lösningsförslaget i Visa stort ritas av samma funktion som på problemets sida i
// metoden (src/lib/losningsforslag.ts).
import { el, lagring } from './kortbanken';
import { ettkortLank, flerakortKnapp } from './pdfutskrift';
import { hamtplan, type PostUtskrift } from '../lib/standard/index.js';
import { losningsforslagHtml, losningsstegen, losningsstegHtml, type LosningsforslagVy } from '../lib/losningsforslag';

// Lösningsförslaget står i datafilen utan problemet, som posten redan har, och rutan står en gång (taFramData).
type Lf = Omit<LosningsforslagVy, 'problem' | 'ruta'>;
type Post = { id: string; niva: string; nivaSlug: string; nr: number; titel: string; taggar?: string[]; sida?: string; losning?: string; bild?: { adress: string; alt: string }; stycken: string[]; fragor: string[]; utskrift: { post: PostUtskrift; med: PostUtskrift }; losningsforslag?: Lf; html?: string; modell?: Modell };
// Faktatextens modell (src/lib/tafram.ts, TaFramPost.modell): bladet att visa bredvid texten och skriva ut.
type Bladbild = { adress: string; alt: string };
type Modell = { namn: string; blad: string; sida: string; bild: Bladbild; bildMatt: { bredd: number; hojd: number }; utskrift: PostUtskrift; ifylld?: { sida: string; bild: Bladbild; bildMatt: { bredd: number; hojd: number }; utskrift: PostUtskrift } };
type Data = { poster: Post[]; filer: Record<string, { adress: string; byte: number }>; nivaer: { namn: string; slug: string; farg: string; antal: number }[]; losningsruta?: LosningsforslagVy['ruta'] };

const sida = document.querySelector<HTMLElement>('.tafram')!;
const metod = sida.dataset.metod!;
const led = sida.dataset.led!;
const titel = sida.dataset.titel!;
// Bankens ord och det som skrivs ut med posterna, som problem och lösningsförslagen (src/lib/bank.ts, src/lib/tafram.ts).
const ord = { en: sida.dataset.en!, flera: sida.dataset.flera!, alla: sida.dataset.alla!, bestamd: sida.dataset.bestamd! };
const folje = sida.dataset.folje!;
const foljeEn = sida.dataset.foljeEn!;
// Följesidorna står i egna filer (faktatexterna): listan skriver ut dem för sig, utan texterna.
const forSig = sida.dataset.forsig !== undefined;
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
// Numret och titeln står i radens rubrik (TaFramRad.astro): numret i .tf-nr och titeln efter det.
const rubrikAv = (r: HTMLElement) => { const h = r.querySelector('.tf-titel')!; const nr = h.querySelector('.tf-nr')!.textContent!.trim(); return { nr, titel: h.textContent!.trim().slice(nr.length).trim() }; };
const namnAv = (id: string) => { const r = rad.get(id)!; return { ...rubrikAv(r), niva: nivaAv(r).dataset.nivanamn!, farg: nivaAv(r).style.getPropertyValue('--niva') }; };
const nivaKnappar = [...sida.querySelectorAll<HTMLButtonElement>('.tf-val .sk-niva')];
const taggKnappar = [...sida.querySelectorAll<HTMLButtonElement>('.tf-val .tf-tagg')];
// En post kan ha flera taggar, som en lästexts två slag: raden bär dem i data-taggar.
const harTagg = (r: HTMLElement, tagg: string) => (r.dataset.taggar ?? '').split(' ').includes(tagg);

type Sparat = { niva?: string; tagg: string; bockade: string[] };
const { varde: sparat, spara } = lagring<Sparat>(`tafram:${metod}/${led}`, { tagg: '', bockade: [] });
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
  bock.setAttribute('aria-label', `${rubrikAv(r).titel} i listan att skriva ut`);
  bock.innerHTML = BOCK;
  r.append(bock);
}

// Taggarna i varje rad blir knappar som visar nivåns poster med samma tagg, som taggen på brainbreakkortet, i taggens färg.
for (const r of rader) [...r.querySelectorAll<HTMLElement>('.tf-radtagg')].forEach((t, i) => {
  const b = el('button', t.className, t.textContent ?? '') as HTMLButtonElement;
  b.type = 'button';
  // Chipen står i samma ordning som radens taggar (data-taggar).
  b.dataset.tagg = (r.dataset.taggar ?? '').split(' ')[i];
  b.title = `Visa ${ord.alla} i ${t.textContent} på nivån`;
  b.addEventListener('click', () => { valjTagg(b.dataset.tagg!); $('tf-poster').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); });
  t.replaceWith(b);
});

function visa() {
  const alla = sparat.niva === 'alla';
  const iNivan = (r: HTMLElement) => alla || nivaAv(r).dataset.niva === sparat.niva;
  const finns = (tagg: string) => rader.some((r) => iNivan(r) && harTagg(r, tagg));
  if (sparat.tagg && !finns(sparat.tagg)) sparat.tagg = '';
  let synliga = 0;
  for (const r of rader) { const med = iNivan(r) && (!sparat.tagg || harTagg(r, sparat.tagg)); r.hidden = !med; if (med) synliga++; }
  // Ett tema syns när någon av dess texter syns.
  for (const tema of sida.querySelectorAll<HTMLElement>('.tf-tema')) tema.hidden = ![...tema.querySelectorAll<HTMLElement>('.tf-post')].some((r) => !r.hidden);
  // En nivå syns när den är vald, eller med Alla när den har poster som syns; med Alla står rubrikerna kvar.
  for (const n of nivaer) n.hidden = alla ? !rader.some((r) => !r.hidden && nivaAv(r) === n) : n.dataset.niva !== sparat.niva;
  sida.classList.toggle('tf-alla', alla);
  for (const b of nivaKnappar) { const pa = b.dataset.niva === sparat.niva; b.setAttribute('aria-pressed', String(pa)); b.classList.toggle('senast', pa); }
  for (const b of taggKnappar) {
    const t = b.dataset.tagg!;
    const n = rader.filter((r) => iNivan(r) && (!t || harTagg(r, t))).length;
    b.querySelector('[data-antal]')!.textContent = String(n);
    b.hidden = !!t && n === 0;
    b.setAttribute('aria-pressed', String(t === sparat.tagg));
  }
  $('tf-tom').hidden = synliga > 0;
  history.replaceState(null, '', `#${sparat.niva}${sparat.tagg ? `/${sparat.tagg}` : ''}`);
  spara();
}
// Valet står kvar överst från 48 rem (global.css, .sk-val). Dess höjd står i --tf-val-h, som listans början och listan att
// skriva ut räknar med, så att den första träffen inte hamnar under valet (designgranskningen 2026-10-18 natt). Byter
// läraren nivå eller tagg när listans början ligger ovanför valet, rullar sidan dit.
const valet = sida.querySelector<HTMLElement>('.tf-val');
const valetsHojd = () => (valet && getComputedStyle(valet).position === 'sticky' ? valet.offsetHeight : 0);
if (valet) new ResizeObserver(() => sida.style.setProperty('--tf-val-h', `${valetsHojd()}px`)).observe(valet);
const tillListan = () => { const poster = $('tf-poster'); if (poster.getBoundingClientRect().top < valetsHojd()) poster.scrollIntoView({ block: 'start' }); };
function valjTagg(tagg: string) { sparat.tagg = tagg; visa(); tillListan(); }
for (const b of nivaKnappar) b.addEventListener('click', () => { sparat.niva = b.dataset.niva; visa(); tillListan(); });
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
    visaKnapp.addEventListener('click', () => { stang(); void visaStort(id); });
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
  // Ental när listan har en post (designgranskningen 2026-10-18 natt).
  $('tf-skrivut').textContent = `Skriv ut ${n === 1 ? ord.bestamd : ord.alla}`;
  $('tf-skrivut-med').textContent = forSig ? `Skriv ut ${n === 1 ? foljeEn : folje}` : `Skriv ut med ${n === 1 ? foljeEn : folje}`;
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
  not.textContent = forSig
    ? `${n} ${n === 1 ? ord.en : ord.flera}, omkring ${mb(planFor(d, 'post').byte)}. ${folje.charAt(0).toLocaleUpperCase('sv')}${folje.slice(1)}: omkring ${mb(planFor(d, 'med').byte)}.`
    : `${n} ${n === 1 ? ord.en : ord.flera}, omkring ${mb(planFor(d, 'post').byte)}, eller ${mb(planFor(d, 'med').byte)} med ${folje}.`;
}

// Listans länk: sidans adress med posterna i listan, som öppnar samma lista i en annan webbläsare.
$('tf-kopiera').addEventListener('click', async () => {
  const url = `${location.origin}${location.pathname}#lista=${sparat.bockade.join(',')}`;
  const not = $('tf-valda-not');
  try { await navigator.clipboard.writeText(url); not.textContent = 'Länken är kopierad. Öppna den på en annan enhet, så har du samma lista där.'; } catch { not.textContent = url; }
  window.setTimeout(() => { not.textContent = ''; }, 6000);
});

// Utskriften: listans poster i listans ordning, bara posterna eller med följesidorna.
const listansTitel = (med: boolean) => `${titel}${med ? (forSig ? `, ${folje}` : `, med ${folje}`) : ''}: ${sparat.bockade.map((id) => namnAv(id).titel).join(', ')}`;
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
// Det som visas bredvid posten: lösningsförslaget till ett problem, eller modellen till en faktatext (K-434; Niclas
// 2026-10-18 natt: "En text i fakta ska ha sin modell likt problem har sin lösning").
const harBredvid = (p?: Post) => !!(p?.losningsforslag || p?.modell);
const bredvidNamn = (p?: Post) => (p?.modell && !p.losningsforslag ? 'modellen' : foljeEn);
// Modellen bredvid texten: den tomma först, eftersom den ifyllda är ett möjligt resultat av modellektionen och rutan ofta
// står på projektorn inför klassen (metodriggens läsning av sidorna 2026-10-18 natt), och en knapp som byter till den
// ifyllda och tillbaka. Under bilden står modellens namn och blad och vilken som syns, som leder till modellens sida, och en
// knapp för var och en som skriver ut den (Niclas 2026-10-18 natt: "en ifylld och en tom att skriva ut").
function modellFigur(m: Modell): HTMLElement {
  const fig = el('figure', 'tf-modell');
  const img = document.createElement('img');
  const text = el('figcaption');
  const sidan = el('a', 'tf-modell-sida') as HTMLAnchorElement;
  sidan.href = m.sida;
  const namn = `${m.namn}, ${m.blad.charAt(0).toLowerCase()}${m.blad.slice(1)}`;
  const knapp = (namn: string, u: PostUtskrift, vad: string) => {
    const a = el('a', 'knapp sekundar', namn) as HTMLAnchorElement;
    a.href = u.adress;
    a.target = '_blank';
    a.rel = 'noopener';
    a.addEventListener('click', () => raknaHandelse(`utskrift:${metod}/${led}:${vad}`, `${titel}: utskrift av ${vad === 'modell' ? 'en tom modell' : 'en ifylld modell'}`));
    return a;
  };
  const byt = m.ifylld ? el('button', 'knapp sekundar tf-modell-byt') as HTMLButtonElement : undefined;
  const visa = (ifylld: boolean) => {
    const b = ifylld && m.ifylld ? m.ifylld : m;
    img.src = b.bild.adress;
    img.alt = b.bild.alt;
    img.width = b.bildMatt.bredd;
    img.height = b.bildMatt.hojd;
    sidan.textContent = m.ifylld ? `${namn}, ${ifylld ? 'ifylld' : 'tom'}` : namn;
    if (byt) byt.textContent = ifylld ? 'Visa den tomma' : 'Visa den ifyllda';
  };
  let ifylld = false;
  if (byt) {
    byt.type = 'button';
    byt.addEventListener('click', () => { ifylld = !ifylld; visa(ifylld); if (ifylld) raknaHandelse(`${led}:${metod}:ifylld-modell`, `${titel}: den ifyllda modellen i Visa stort`); });
  }
  visa(false);
  // Bilden leder till bladet i full storlek, i en ny flik, för projektorn.
  const stor = el('a', 'tf-modell-stor') as HTMLAnchorElement;
  stor.target = '_blank';
  stor.rel = 'noopener';
  stor.title = 'Modellen i full storlek';
  const folj = () => { stor.href = img.src; };
  folj();
  if (byt) byt.addEventListener('click', folj);
  stor.append(img);
  text.append(sidan, ...(byt ? [byt] : []), ...(m.ifylld ? [knapp('Skriv ut den tomma', m.utskrift, 'modell'), knapp('Skriv ut den ifyllda', m.ifylld.utskrift, 'ifylld-modell')] : [knapp('Skriv ut modellen', m.utskrift, 'modell')]));
  fig.append(stor, text);
  return fig;
}
// I stegen A, B, A och B och C finns ingen utskrift som är det som syns, så knappen står bara vid problemet
// (granskningen 2026-10-18: samma steg skrev ut olika material beroende på vad som visades före).
function skrivutLank() {
  const skrivut = $<HTMLAnchorElement>('tf-stort-skrivut');
  if (!stortPost || steg > 0) { skrivut.hidden = true; $('tf-stort-skrivut-med').hidden = true; return; }
  // Med lösningsförslaget skrivs det ut med problemet; modellen har sin egen knapp i rutan bredvid.
  const med = !losningYta.hidden && !!stortPost.losningsforslag;
  skrivut.href = (med ? stortPost.utskrift.med : stortPost.utskrift.post).adress;
  skrivut.textContent = med ? `Skriv ut ${ord.bestamd} och ${foljeEn}` : `Skriv ut ${ord.bestamd}`;
  skrivut.hidden = false;
  // En post utan lösningsförslag: också med följesidan, eller följesidorna för sig (designgranskningen 2026-10-18 natt).
  const skrivutMed = $<HTMLAnchorElement>('tf-stort-skrivut-med');
  skrivutMed.hidden = !!stortPost.losningsforslag;
  if (!stortPost.losningsforslag) skrivutMed.href = stortPost.utskrift.med.adress;
}
function visaLosning(pa: boolean) {
  const p = stortPost;
  const visas = pa && harBredvid(p);
  if (visas && losningYta.dataset.id !== p!.id) {
    if (p!.losningsforslag) losningYta.innerHTML = losningsforslagHtml(bladet(p!), { farg: namnAv(p!.id).farg, rubrik: 'h2', utanProblem: true });
    else losningYta.replaceChildren(modellFigur(p!.modell!));
    losningYta.dataset.id = p!.id;
  }
  losningYta.hidden = !visas;
  dialog.classList.toggle('med-losning', visas);
  losningKnapp.setAttribute('aria-pressed', String(visas));
  losningKnapp.textContent = `${visas ? 'Dölj' : 'Visa'} ${bredvidNamn(p)}`;
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
  losningKnapp.hidden = !harBredvid(stortPost) || iSteg;
  skrivutLank();
  dialog.scrollTop = 0;
}
for (const b of stegKnappar) b.addEventListener('click', () => visaSteg(Number(b.dataset.steg)));
// Piltangenterna och en bläddrares knappar (Page Up och Page Down) byter steg, som i en presentation, och utan steg byter
// de post.
dialog.addEventListener('keydown', (e) => {
  if (!stortPost || e.altKey || e.ctrlKey || e.metaKey) return;
  const fram = e.key === 'ArrowRight' || e.key === 'PageDown';
  const bak = e.key === 'ArrowLeft' || e.key === 'PageUp';
  if (!fram && !bak) return;
  e.preventDefault();
  if (!stortPost.losningsforslag) { bladdra(fram ? 1 : -1); return; }
  visaSteg(steg + (fram ? 1 : -1));
  stegKnappar[steg]?.focus();
});
// Bläddra: förra och nästa post bland raderna som syns, i radernas ordning. Modellen bredvid en faktatext står kvar, den
// tomma, men ett lösningsförslag aldrig: rutan står ofta på projektorn, och nästa problems svar ska visas först när läraren
// trycker (designgranskningen 2026-10-18 natt).
const synligaRader = () => rader.filter((r) => !r.hidden && !nivaAv(r).hidden);
function bladdra(steget: 1 | -1) {
  const synliga = synligaRader();
  const nasta = synliga[synliga.findIndex((r) => r.id === stortId) + steget];
  if (nasta) void visaStort(nasta.id, !losningYta.hidden && !stortPost?.losningsforslag);
}
function visaBladdra() {
  const synliga = synligaRader();
  const i = synliga.findIndex((r) => r.id === stortId);
  $<HTMLButtonElement>('tf-forra').disabled = i <= 0;
  $<HTMLButtonElement>('tf-nasta').disabled = i < 0 || i >= synliga.length - 1;
}
$('tf-forra').addEventListener('click', () => bladdra(-1));
$('tf-nasta').addEventListener('click', () => bladdra(1));

losningKnapp.addEventListener('click', () => {
  const pa = !!losningYta.hidden;
  visaLosning(pa);
  if (!pa) return;
  raknaHandelse(`${led}:${metod}:losningsforslag`, `${titel}: Lösningsförslag i Visa stort`);
  // I telefonen står bladet under problemet: rutan rullar dit.
  if (!matchMedia('(min-width: 64rem)').matches) losningYta.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
});

async function visaStort(id: string, medLosning = false) {
  const r = rad.get(id)!;
  const p = namnAv(id);
  stortId = id;
  visaBladdra();
  const oppna = !dialog.open;
  if (oppna) franFokus = document.activeElement as HTMLElement | null;
  // Numret av nivåns poster, eller av temats när posten står i ett tema.
  const tema = r.dataset.tema;
  const antal = rader.filter((x) => nivaAv(x) === nivaAv(r) && x.dataset.tema === tema).length;
  const taggar = [...r.querySelectorAll('.tf-radtagg')].map((x) => x.textContent).join(' · ');
  $('tf-stort-etikett').textContent = `${p.niva}${tema ? ` · ${tema}` : ''} · ${ord.en} ${p.nr} av ${antal}${taggar ? ` · ${taggar}` : ''}`;
  $('tf-stort-etikett').style.setProperty('--niva', p.farg);
  $('tf-stort-sida').style.setProperty('--bok-niva', p.farg);
  $('tf-stort-titel').textContent = p.titel;
  // Bilden är radens, när posten har en; en lästext står utan, och texten får då hela bredden.
  const bild = $<HTMLImageElement>('tf-stort-bild');
  const radbild = r.querySelector<HTMLImageElement>('.tf-bild');
  $('tf-stort-bildrad').hidden = !radbild;
  dialog.classList.toggle('utan-bild', !radbild);
  if (radbild) bild.src = radbild.getAttribute('src')!; else bild.removeAttribute('src');
  bild.alt = '';
  $('tf-stort-text').replaceChildren(el('p', 'tf-stort-vantar', 'Hämtar …'));
  $('tf-stort-fraga').replaceChildren();
  // En faktatext står i sin egen form (Faktatext.astro), som datafilen har ritat; annars problemets form.
  const fakta = r.dataset.fakta !== undefined;
  const faktaYta = $('tf-stort-fakta');
  $('tf-stort-sida').hidden = fakta;
  faktaYta.hidden = !fakta;
  if (fakta) faktaYta.replaceChildren(el('p', 'tf-stort-vantar', 'Hämtar …'));
  // Posten i metoden, när den står där; ett problem ur databasen har ingen sida.
  const sidlank = r.querySelector<HTMLAnchorElement>('.tf-sidlank');
  const stortSidan = $<HTMLAnchorElement>('tf-stort-sidan');
  stortSidan.hidden = !sidlank;
  if (sidlank) stortSidan.href = sidlank.href;
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
  if (fakta) {
    faktaYta.innerHTML = post.html ?? '';
    stortPost = post;
    visaSteg(0);
    visaLosning(medLosning);
    return;
  }
  bild.alt = post.bild?.alt ?? '';
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
  const oppna = () => { raknaHandelse(`${led}:${metod}:visa-stort`, `${titel}: Visa stort`); void visaStort(r.id); };
  visaKnapp.addEventListener('click', oppna);
  r.querySelector('.tf-bild')?.addEventListener('click', oppna);
  // Länken Lösningsförslag leder utan JavaScript till bladet på problemets sida i metoden; med JavaScript öppnar den
  // rutan med problemet och lösningsförslaget. Lärarens sida till en lästext leder alltid till sidan i metoden.
  if (r.dataset.lf !== undefined) r.querySelector('.tf-losning')?.addEventListener('click', (e) => {
    const m = e as MouseEvent;
    if (m.ctrlKey || m.metaKey || m.shiftKey || m.button !== 0) return;
    e.preventDefault();
    // En länk till en pdf har sitt namn i statistiken (data-goatcounter-click), som GoatCounter räknar själv.
    if (!(e.currentTarget as HTMLElement).hasAttribute('data-goatcounter-click')) raknaHandelse(`${led}:${metod}:losningsforslag`, `${titel}: Lösningsförslag i Visa stort`);
    void visaStort(r.id, true);
  });
  // Länken Modellen leder utan JavaScript till modellens sida; med JavaScript visar den texten och modellen bredvid.
  if (r.dataset.modell !== undefined) r.querySelector('.tf-modell-lank')?.addEventListener('click', (e) => {
    const m = e as MouseEvent;
    if (m.ctrlKey || m.metaKey || m.shiftKey || m.button !== 0) return;
    e.preventDefault();
    raknaHandelse(`${led}:${metod}:modell`, `${titel}: Modellen i Visa stort`);
    void visaStort(r.id, true);
  });
}
// Lägg temats texter i listan (TaFram.astro, temats rubrik): alla temats poster, i ordning, utan dubbletter.
for (const b of sida.querySelectorAll<HTMLButtonElement>('.tf-tema-lista')) b.addEventListener('click', () => {
  const ids = (b.dataset.poster ?? '').split(' ').filter((id) => rad.has(id));
  for (const id of ids) if (!bockad(id)) sparat.bockade.push(id);
  spara();
  visaBockar();
  $('tf-valda-not').textContent = `Temats ${ids.length} ${ord.flera} står i listan att skriva ut.`;
  window.setTimeout(() => { $('tf-valda-not').textContent = ''; }, 6000);
});

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
