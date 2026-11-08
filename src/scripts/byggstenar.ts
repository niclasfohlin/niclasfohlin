// Byggstenarna i planens sidor (K-630; underlag/prov/metoder/PLANERA-LAGRET.md under Rot och lager): det som Planera insatsen
// (src/scripts/planera.ts) och Lär dig metoden (src/scripts/lardig.ts) ritar och binder lika, så att det står på ett ställe
// och inte glider isär (Niclas 2026-10-30: "Den modulen ska vara clean och aldrig ha flera saker som räknar på en och samma
// sak"). Här räknas inget: det som räknas och de texter som visas på flera ställen står i standarden
// (src/lib/standard/plan.js), och det som sparas i src/scripts/insatser-lagring.ts. Varje sida anropar byggstenen med sina
// egna element och ord.
import { ANLEDNINGENS_LANGD, AVSLUTETS_ANLEDNINGAR, esc, isoVecka, kalendervecka, kalenderveckaUtskriven, lovetLast, PLANKNAPPAR, skolveckan, spannKort, stor, utanFogar, veckonyckel } from '../lib/standard/index.js';
import { APPENS_PLANER, LISTANS_KNAPPAR, STATUSNAMN, type Samling, type Status } from './insatser-lagring.ts';
import { iAppen, vagenUt, webblasaren, webblasarensBesked } from './webblasaren.ts';

/** Statistikens namn för ett tryck, en rot för båda lagren och samlingarna (granskningen rot-3, fynd 14): samlingens led, metoden och vad, och titeln med metodens namn. Svaret ger attributen. */
export const goatFor = (led: string, metod: string, titel: string) => (vad: string, text: string) => `data-goatcounter-click="${esc(led)}:${esc(metod)}:${vad}" data-goatcounter-title="${esc(titel)}: ${esc(text)}"`;
/** Ett element i sidan ur sitt id. */
export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
/** Knappen, eller elementet som väljaren säger, som ett tryck i en ruta träffade. */
export const knappen = <T extends Element = HTMLButtonElement>(e: Event, valjare = 'button') => (e.target as Element).closest<T>(valjare);
/** Ett tryck på en knapp i rutan, som rutan tar hand om: rutans knappar ritas om, så trycket lyssnas efter på rutan. */
export const vidTryck = (ruta: HTMLElement, gor: (b: HTMLButtonElement) => void) => ruta.addEventListener('click', (e) => { const b = knappen(e); if (b) gor(b); });
/** En rad med knappar, eller inget utan knappar. */
export const knappraden = (knappar: string[]) => (knappar.length ? `<p class="pl-andra-knappar">${knappar.join('')}</p>` : '');

/**
 * Text till urklipp, som vanlig text utan ordfogarna som håller ihop F–5 och 2–6 på sidan (verifieringen 2026-10-25), med
 * en reserv för webbläsare utan urklippets API; false när den inte gick att kopiera.
 */
export async function kopiera(text: string): Promise<boolean> {
  text = utanFogar(text);
  // En apps egen webbläsare kan låta skrivningen vänta utan svar; efter en sekund kopieras texten på det äldre sättet, så
  // att läraren alltid får ett besked (granskningen inför lanseringen, B4).
  try { await Promise.race([navigator.clipboard.writeText(text), new Promise((_, nej) => setTimeout(() => nej(new Error('svarar inte')), 1000))]); return true; } catch {
    const t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.append(t); t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    t.remove();
    return ok;
  }
}
// En knapp som har gjort det den ska säger det själv en stund, intill där läraren tryckte (de kalla läsarna 2026-10-24:
// "Kopiera texten ger ingen bekräftelse").
export function kvittera(knapp: HTMLElement, text: string) {
  if (!knapp.dataset.text) knapp.dataset.text = knapp.textContent ?? '';
  knapp.textContent = `${text} ✓`;
  knapp.classList.add('pl-kvitto');
  window.setTimeout(() => { if (knapp.dataset.text) knapp.textContent = knapp.dataset.text; knapp.classList.remove('pl-kvitto'); delete knapp.dataset.text; }, 3000);
}

/**
 * Beskedet överst i planens sidor (PlanNotis.astro): det som gäller hela sidan, som en plan ur en länk, en metod som har
 * ändrats, en webbläsare som inte sparar och webbläsarens besked. Svaret är funktionen som visar en text med knappar, och en
 * tom text tar bort beskedet.
 */
export const notisen = (id: string) => (text: string, knappar = '') => {
  $(`${id}-text`).textContent = text;
  const k = $(`${id}-knappar`);
  k.innerHTML = knappar;
  k.hidden = !knappar;
  $(id).hidden = !text;
};

// ---------- Webbläsarens besked ----------
// I båda modulerna (K-644; Niclas 2026-10-30: "Måste ha samma kod och rot för både metoder och stödundervisning när man går in
// på modulen i någon av dem"): vilket besked som gäller avgör webblasarensBesked (src/scripts/webblasaren.ts), och här ritas
// knapparna och binds trycken. Knapparnas id börjar med sidans förled, pl i Planera insatsen och ld i Lär dig metoden, och
// adressen är planens adress som den är vid trycket, så att vägen ut fortsätter där läraren är (K-510).
interface Webblasarensrad { forled: string; adress: () => string; goat: (vad: string, text: string) => string }
/** Beskedet om webbläsaren med sina knappar, eller null där inget besked gäller. */
export function webblasarensRad(o: Webblasarensrad): { slag: 'appens' | 'safari'; text: string; knappar: string } | null {
  // Planen skyddas med planens knapp här, och i appen öppnas filen med knappen i appens lista (granskaren 2026-11-08, K-748).
  const b = webblasarensBesked(o.adress(), { laddaNer: PLANKNAPPAR.laddaNer, oppna: LISTANS_KNAPPAR.oppna });
  if (!b) return null;
  // Safari i iPhone och iPad: knappen till appens sida, där stegen står utfällda.
  if (b.slag === 'safari') return { slag: b.slag, text: b.text, knappar: `<a class="knapp liten" id="${o.forled}-till-appen" href="${esc(b.till.href)}" ${o.goat('till-appen', 'Så lägger du till appen, från Safari')}>${esc(b.till.text)}</a>` };
  const w = webblasaren();
  const ut = b.ut ? `<a class="knapp liten" id="${o.forled}-ut" href="${esc(b.ut.href)}" ${o.goat('ut-ur-appen', `${b.ut.text} från ${w.app} webbläsare`)}>${esc(b.ut.text)}</a>` : '';
  return { slag: b.slag, text: b.text, knappar: `${ut}<button type="button" class="knapp liten${b.ut ? ' sekundar' : ''}" id="${o.forled}-ut-kopiera" ${o.goat('lank-ur-appen', `länken kopierad i ${w.app} webbläsare`)}>Kopiera länken</button>` };
}
/**
 * Varför filen skyddar planen, efter texten om planen som fil: i appen att planerna försvinner med appen (APPENS_PLANER),
 * annars inget. I Safari i iPhone och iPad säger beskedet överst att Safari kan radera planen, och meningen står bara där
 * (användbarhetsprovet 2026-10-31: samma mening i två rutor i rad och en gång till i Planen som fil).
 */
export const filensSkal = (_adress: string) => (iAppen() ? APPENS_PLANER : '');
/** Vägen ut får adressen som den är nu: sidan ritar om den efter en ändring, och trycket gör det en gång till. */
export function vagenUtNu(o: Pick<Webblasarensrad, 'forled' | 'adress'>) {
  const ut = document.getElementById(`${o.forled}-ut`) as HTMLAnchorElement | null;
  const dit = ut && vagenUt(o.adress(), webblasaren());
  if (ut && dit) ut.href = dit.href;
}
/** Trycken i beskedet: vägen ut med adressen som den är nu, och Kopiera länken, som kopierar samma adress. */
export function webblasarensTryck(ruta: HTMLElement, o: Pick<Webblasarensrad, 'forled' | 'adress'> & { visaBesked: (text: string) => void }) {
  ruta.addEventListener('click', async (e) => {
    if ((e.target as Element).closest(`#${o.forled}-ut`)) { vagenUtNu(o); return; }
    const knapp = (e.target as Element).closest<HTMLButtonElement>(`#${o.forled}-ut-kopiera`);
    if (!knapp) return;
    const ok = await kopiera(o.adress());
    if (ok) kvittera(knapp, 'Kopierad');
    o.visaBesked(ok ? `Länken är kopierad. Klistra in den i ${webblasaren().ios ? 'Safari' : 'webbläsaren'}.` : 'Länken gick inte att kopiera i den här webbläsaren.');
  });
}

/**
 * Beskedet längst ned på skärmen, där läraren ser det (granskningarna 2026-10-24: beskedet överst syntes inte från knapparna
 * längre ned), med en knapp när något går att ångra. Ett besked utan knapp går bort efter en stund, ett med knapp efter längre,
 * och båda vid nästa tryck någon annanstans eller när läraren skriver något utanför det, så att det inte täcker det läraren
 * gör och Ångra aldrig tar bort det som skrevs efter beskedet (de kalla läsarna 2026-10-24 och Codex 2026-10-25). Svaret är
 * funktionen som visar ett besked, och en tom text tar bort det.
 */
export function beskedet(id: string) {
  let tid = 0, vid = 0, tryckVid = 0, ram = 0;
  let gor: (() => void) | null = null;
  const ruta = () => $(id);
  const gom = () => { ruta().hidden = true; gor = null; };
  // Beskedet täcker aldrig en fråga som läraren ska svara på (data-fraga), som frågan om samma elev eller Ta bort?: skulle det
  // täcka frågan längst ned står det överst, och täcker det den också där flyttas sidan så att frågan står ovanför beskedet
  // (verifieringen 4 inför lanseringen, fynd 1: beskedet låg över Samma elev och Ny elev i telefonen). Platsen prövas när
  // beskedet har ritats, efter det som ritades i samma tryck, och igen när sidan rullar eller ändrar storlek; då flyttas sidan
  // aldrig, så att beskedet inte rullar mot läraren.
  const fri = (flytta: boolean) => {
    const t = ruta();
    t.classList.remove('uppe');
    if (t.hidden) return;
    const fragor = [...document.querySelectorAll<HTMLElement>('[data-fraga]')].filter((f) => !f.hidden && f.getClientRects().length);
    const tacker = () => { const r = t.getBoundingClientRect(); return fragor.find((f) => { const q = f.getBoundingClientRect(); return q.bottom > r.top && q.top < r.bottom; }); };
    if (!tacker()) return;
    t.classList.add('uppe');
    if (!tacker()) return;
    t.classList.remove('uppe');
    const f = tacker();
    if (f && flytta) window.scrollBy(0, f.getBoundingClientRect().bottom - t.getBoundingClientRect().top + 8);
  };
  const friSnart = (flytta = false) => { cancelAnimationFrame(ram); ram = requestAnimationFrame(() => fri(flytta)); };
  const visa = (text: string, atgard?: { text: string; gor: () => void; kvar?: boolean }) => {
    const t = ruta();
    window.clearTimeout(tid);
    gor = atgard?.gor ?? null;
    if (!text) { t.hidden = true; t.innerHTML = ''; return; }
    t.innerHTML = `<p>${esc(text)}</p>${atgard ? `<button type="button" class="pl-toast-knapp" data-toast-gor>${esc(atgard.text)}</button>` : ''}<button type="button" class="pl-toast-stang" data-toast-stang aria-label="Stäng beskedet">×</button>`;
    t.hidden = false;
    vid = performance.now();
    tid = window.setTimeout(gom, atgard ? 30000 : 8000);
    friSnart(true);
  };
  for (const h of ['scroll', 'resize']) window.addEventListener(h, () => { if (!ruta().hidden) friSnart(); }, { passive: true });
  document.addEventListener('pointerdown', () => { tryckVid = performance.now(); }, true);
  // Ett besked som kom av samma tryck, som när ett fält lämnas, står kvar; ett tryck med tangentbordet har inget pointerdown.
  document.addEventListener('click', (e) => { if (e.detail > 0 && vid > tryckVid) return; if (!ruta().hidden && !ruta().contains(e.target as Node)) gom(); }, true);
  document.addEventListener('input', (e) => { if (!ruta().hidden && !ruta().contains(e.target as Node)) gom(); }, true);
  vidTryck(ruta(), (b) => {
    const g = b.hasAttribute('data-toast-gor') ? gor : null;
    gom();
    g?.();
  });
  return visa;
}

/** En lovvecka som knapp: kalenderveckan och skolveckans dagar, tryckt när veckan är lov, och låst när något är infört i veckan eller senare, ur det senast införda datumet (lovetLast i standarden). */
export function lovknapp(m: string, lov: Set<string>, sista: string | undefined) {
  const k = veckonyckel(m), pa = lov.has(k), v = isoVecka(m).vecka, dagar = esc(spannKort(m, skolveckan(m).till));
  return `<button type="button" class="pl-chip pl-lovchip" data-lovvecka="${k}" aria-pressed="${pa}"${lovetLast(m, sista) ? ' disabled' : ''} aria-label="${stor(kalenderveckaUtskriven(v))}, ${dagar}${pa ? ', lov' : ''}"><span>${kalendervecka(v)}</span><small>${dagar}</small></button>`;
}

/** En vecka i remsan överst, i båda lagren: talet och vilken gång, vald när den visas, och märkt när den är veckan läraren eller gruppen är i, med steg som det aktuella steget för en skärmläsare. */
export const remsansKnapp = (vy: string | number, k: { tal: string; om: string }, o: { nu: boolean; vald: boolean; etikett: string; steg?: boolean }) => `<button type="button" class="pl-remsa-vecka${o.nu ? ' nu' : ''}" data-vy="${vy}" aria-pressed="${o.vald}" aria-label="${esc(o.etikett)}"${o.steg && o.nu ? ' aria-current="step"' : ''}>${esc(k.tal)}${k.om ? `<small>${esc(k.om)}</small>` : ''}</button>`;
/** En lista med en etikett och en text per rad, som metodens uppföljning (pl-uppf). Texten och det som står efter den är HTML. */
export const etikettlista = (rader: { etikett?: string; html?: string; efter?: string }[]) => `<ul class="pl-uppf">${rader.map((r) => `<li>${r.etikett ? `<span class="pl-etikett">${esc(r.etikett)}</span>` : ''}${r.html ? `<p>${r.html}</p>` : ''}${r.efter ?? ''}</li>`).join('')}</ul>`;
/** En ruta som fälls ut och står kvar utfälld när sidan ritas om (data-ruta). Rubriken är text och det som står i rutan HTML. */
export const fallut = (ruta: string, rubrik: string, inne: string, oppen: boolean) => `<details class="pl-fallut" data-ruta="${esc(ruta)}"${oppen ? ' open' : ''}><summary>${esc(rubrik)}</summary>${inne}</details>`;
/** Vad linjen säger: skattningens regler med uppföljningens råd, i en ruta som fälls ut, och hur veckorna räknas. */
export const linjensRegler = (ruta: string, rubrik: string, oppen: boolean, rader: { etikett: string; html: string }[]) => fallut(ruta, rubrik, `<p class="pl-hjalp">Veckorna räknas i följd, och en vecka utan skattning bryter följden.</p>${etikettlista(rader)}`, oppen);

// ---------- Avslutet ----------
// Formuläret Avsluta, raden överst och rutan med bocken, i båda lagren (Planera insatsen K-542; Lär dig metoden K-631, Niclas
// 2026-10-30: "Läraren ska också kunna avsluta likt stödundervisning med två förvalda [rimliga] skäl eller skriva i själv").

/** Bocken i raden överst och i rutan, som ritas fram när läraren just har avslutat planen. */
const BOCKEN = '<svg class="pl-avslutad-bock" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/><path d="M14 24.5l7 7 13-14"/></svg>';
/**
 * Raden överst i en sparad plan: läget som märke, som i listan med planerna (statusAv), och texten, med bocken när planen är
 * avslutad, och lägets knappar och det som står under dem, som formuläret Avsluta.
 */
export function lagesraden(lage: Status, text: string, o: { ny?: boolean; knappar?: string[]; under?: string } = {}) {
  const knappar = (o.knappar ?? []).filter(Boolean);
  return `<p${lage === 'avslutad' && o.ny ? ' role="status"' : ''}>${lage === 'avslutad' ? BOCKEN : ''}<span class="pl-status ${lage}">${STATUSNAMN[lage]}</span> ${esc(text)}</p>${knappraden(knappar)}${o.under ?? ''}`;
}
/** Knappen i raden överst som öppnar och stänger formuläret Avsluta. */
export const avslutaKnappen = (text: string, formular: string, oppen: boolean) => `<button type="button" class="knapp sekundar liten" data-gor="avsluta" aria-expanded="${oppen}" aria-controls="${formular}">${esc(text)}</button>`;
/** Knappen som ångrar avslutet, i raden överst och i rutan. */
export const ANGRA_AVSLUTET = '<button type="button" class="knapp sekundar liten" data-gor="angra-avslut">Ångra avslutet</button>';
/** Rutan för en avslutad plan: bocken, rubriken, vad som hände och vägen vidare. Med ny ritas bocken fram och rutan läses upp. */
export const avslutsrutan = (o: { rubrik: string; text: string; knappar: string[]; ny: boolean }) => `<div class="pl-avslutad${o.ny ? ' ny' : ''}"${o.ny ? ' role="status"' : ''}>${BOCKEN}<div><p class="pl-avslutad-rubrik">${esc(o.rubrik)}</p><p class="pl-avslutad-text">${esc(o.text)}</p>${knappraden(o.knappar)}</div></div>`;
/**
 * Formuläret Avsluta: det sidan säger först, som Planera insatsens sista pass, anledningen med samlingens två förslag
 * (AVSLUTETS_ANLEDNINGAR i standarden) eller lärarens egen, vad som händer, och knappen som avslutar och Avbryt. Fältet heter
 * som formuläret med -not efter.
 */
export function avslutsformularet(o: { id: string; oppen: boolean; samling: Samling; fore: string; not: string; hjalp: string; knapp: string; goat: string }) {
  const forslag = AVSLUTETS_ANLEDNINGAR[o.samling].map((x) => `<button type="button" class="pl-chip" data-anledning="${esc(x)}" aria-pressed="${o.not === x}">${esc(x)}</button>`).join('');
  return `<div class="pl-flytta pl-avsluta" id="${o.id}"${o.oppen ? '' : ' hidden'}>${o.fore}<span class="pl-etikett">Varför, om du vill</span><p class="pl-andra-knappar">${forslag}</p><label class="pl-etikett" for="${o.id}-not">Eget skäl</label><input class="pl-falt pl-brett" type="text" id="${o.id}-not" maxlength="${ANLEDNINGENS_LANGD}" value="${esc(o.not)}" /><p class="pl-hjalp">${esc(o.hjalp)}</p><p class="pl-andra-knappar"><button type="button" class="knapp liten" data-gor="avsluta-klar" ${o.goat}>${esc(o.knapp)}</button><button type="button" class="pl-textknapp" data-gor="avsluta-avbryt">Avbryt</button></p></div>`;
}
/** Ett förslag på anledning skriver den i fältet, där läraren kan skriva vidare. Svaret är fältets text, eller null när knappen inte är ett förslag. */
export function anledningenIFaltet(knapp: HTMLElement, falt: HTMLInputElement): string | null {
  if (knapp.dataset.anledning === undefined) return null;
  falt.value = knapp.dataset.anledning;
  markeraAnledningen(falt);
  return falt.value;
}
/** Förslaget som står i fältet syns som valt, också när läraren skriver det själv eller ändrar det (den kalla läsaren 2026-10-30, nr 15). */
export function markeraAnledningen(falt: HTMLInputElement) {
  for (const x of falt.closest('.pl-avsluta')?.querySelectorAll<HTMLElement>('[data-anledning]') ?? []) x.setAttribute('aria-pressed', String(x.dataset.anledning === falt.value.trim()));
}
