// Byggstenarna i planens sidor (K-630; underlag/prov/metoder/PLANERA-LAGRET.md under Rot och lager): det som Planera insatsen
// (src/scripts/planera.ts) och Lär dig metoden (src/scripts/lardig.ts) ritar och binder lika, så att det står på ett ställe
// och inte glider isär (Niclas 2026-10-30: "Den modulen ska vara clean och aldrig ha flera saker som räknar på en och samma
// sak"). Här räknas inget: det som räknas och de texter som visas på flera ställen står i standarden
// (src/lib/standard/plan.js), och det som sparas i src/scripts/insatser-lagring.ts. Varje sida anropar byggstenen med sina
// egna element och ord.
import { ANLEDNINGENS_LANGD, AVSLUTETS_ANLEDNINGAR, esc, isoVecka, kalendervecka, kalenderveckaUtskriven, lovetLast, skolveckan, spannKort, stor, veckonyckel } from '../lib/standard/index.js';
import { STATUSNAMN, type Samling, type Status } from './insatser-lagring.ts';

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
 * Beskedet längst ned på skärmen, där läraren ser det (granskningarna 2026-10-24: beskedet överst syntes inte från knapparna
 * längre ned), med en knapp när något går att ångra. Ett besked utan knapp går bort efter en stund, ett med knapp efter längre,
 * och båda vid nästa tryck någon annanstans eller när läraren skriver något utanför det, så att det inte täcker det läraren
 * gör och Ångra aldrig tar bort det som skrevs efter beskedet (de kalla läsarna 2026-10-24 och Codex 2026-10-25). Svaret är
 * funktionen som visar ett besked, och en tom text tar bort det.
 */
export function beskedet(id: string) {
  let tid = 0, vid = 0, tryckVid = 0;
  let gor: (() => void) | null = null;
  const ruta = () => $(id);
  const gom = () => { ruta().hidden = true; gor = null; };
  const visa = (text: string, atgard?: { text: string; gor: () => void; kvar?: boolean }) => {
    const t = ruta();
    window.clearTimeout(tid);
    gor = atgard?.gor ?? null;
    if (!text) { t.hidden = true; t.innerHTML = ''; return; }
    t.innerHTML = `<p>${esc(text)}</p>${atgard ? `<button type="button" class="pl-toast-knapp" data-toast-gor>${esc(atgard.text)}</button>` : ''}<button type="button" class="pl-toast-stang" data-toast-stang aria-label="Stäng beskedet">×</button>`;
    t.hidden = false;
    vid = performance.now();
    tid = window.setTimeout(gom, atgard ? 30000 : 8000);
  };
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
export const linjensRegler = (ruta: string, rubrik: string, oppen: boolean, rader: { etikett: string; html: string }[]) => fallut(ruta, rubrik, `<p class="pl-hjalp">Veckorna räknas i följd, och en vecka utan kryss bryter följden.</p>${etikettlista(rader)}`, oppen);

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
  const forslag = AVSLUTETS_ANLEDNINGAR[o.samling].map((x) => `<button type="button" class="pl-chip" data-anledning="${esc(x)}">${esc(x)}</button>`).join('');
  return `<div class="pl-flytta pl-avsluta" id="${o.id}"${o.oppen ? '' : ' hidden'}>${o.fore}<span class="pl-etikett">Varför, om du vill</span><p class="pl-andra-knappar">${forslag}</p><label class="visually-hidden" for="${o.id}-not">Anledningen</label><input class="pl-falt pl-brett" type="text" id="${o.id}-not" maxlength="${ANLEDNINGENS_LANGD}" value="${esc(o.not)}" /><p class="pl-hjalp">${esc(o.hjalp)}</p><p class="pl-andra-knappar"><button type="button" class="knapp liten" data-gor="avsluta-klar" ${o.goat}>${esc(o.knapp)}</button><button type="button" class="pl-textknapp" data-gor="avsluta-avbryt">Avbryt</button></p></div>`;
}
/** Ett förslag på anledning skriver den i fältet, där läraren kan skriva vidare. Svaret är fältets text, eller null när knappen inte är ett förslag. */
export function anledningenIFaltet(knapp: HTMLElement, falt: HTMLInputElement): string | null {
  if (knapp.dataset.anledning === undefined) return null;
  falt.value = knapp.dataset.anledning;
  falt.focus();
  return falt.value;
}
