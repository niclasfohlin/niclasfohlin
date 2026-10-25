// Planera insatsen (K-489; Niclas 2026-10-24: "Man får val att göra och sedan skickas till rätt sak per vecka?"). Sidan
// räknar planen med standardens planmotor (src/lib/standard/plan.js) ur metodens fält, som sidan bär som JSON
// (src/lib/insatsplan.ts). En plan som inte är sparad är ett förslag: planen överst med Spara planen, och valen under. En
// sparad plan, eller en plan ur en länk, visar först veckan gruppen är i: nästa pass med materialet, veckans pass,
// skattningen, veckans fokus och uppföljningen. Efter sista passet visar den Efter insatsen, med uppföljningen efter och
// utvärderingen (granskningarna av Codex och Opus 2026-10-24). Veckorna följer gruppen: Upprepa veckan tar samma vecka en
// gång till, och lov, flyttade och inställda pass flyttar resten fram.
//
// Planen är två saker (Niclas samma dag: "både blir ett sätt att planera insatsen och följa den över tid. Men att man
// enkelt bara kan ha en planläggare"): bara planen, eller Följ insatsen, ett val. Den som följer insatsen bockar passen
// som blev av, skattar varje vecka hur väl eleverna (eller gruppen) klarar insatsens mål på egen hand, 1 till 5, och gör
// avstämningen mitt i och utvärderingen efter. Målet står i planen och ovanför skattningen, med en penna att skriva om det
// med (Niclas: "målet står sedan ... ovanför skattningen vecka för vecka. Så man vet vad man skattar för"). Närvaron och
// veckans gång är med när läraren vill (Niclas: "kan finnas om du gör det snyggt och smidigt men inte ett krav om man inte
// fyller i den"). Elevernas namn och allt läraren för in stannar i webbläsaren och följer aldrig med länken,
// kalenderfilen, statistiken eller texterna som kopieras.
import {
  BESLUT, dagarText, dagText, datumText, dokumentationstext, elevensResultat, elevtext, forstaMandagen, forval, forvaldLangd, GRUPPEN, helgdag, isoVecka, kalenderfil, kodaVal,
  LANGSTA, lasVal, malText, metodplan, minuterText, mittVeckan, nastaPass, passensMinuter, passetsDag, passetsRoller, passetsTid, planera, planvecka, plusDagar,
  mandagen, rensaFoljd, rentaTider, rentMal, riktning, sakdelar, sammanstallning, sammanstallningstext, SKALAN, skattningsfragan, spannKort, stegUtanfor, tidsspann, tidText,
  uppfoljningensTillfallen, uppraknat, utanNamn, veckansDagar, veckanFor, veckodag, veckonyckel, VECKODAGAR,
  type Foljd, type Pass, type Plan, type PlanVecka, type Sammanstallning, type SammanstallningElev, type Val,
} from '../lib/standard/index.js';
import type { PlanData } from '../lib/insatsplan';
import { idagLokalt, iTurOrdning, lasPlaner, narText, nuTid, nyttId, planensNamn, raknaPagaende, rensaPlan, schemaAv, skiljNamnen, skrivPlaner, type SparadPlan } from './insatser-lagring';
import { kanSkrivaUtPdf, skrivUt } from './pdfutskrift';
import { elevPdf, gruppPdf } from './planpdf';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const sida = $('plan');
const data: PlanData = JSON.parse($('pl-data').textContent ?? '{}');
const mp = metodplan({ tid: data.tid, period: data.period, progression: data.progression, uppfoljning: data.uppfoljning, plan: { passen: data.passen } }).plan!;
const idag = idagLokalt();
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const stor = (s: string) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);
const nar = (rad: number) => data.uppfoljning.rader[rad]?.nar ?? '';

type HelFoljd = Required<Omit<Foljd, 'avstamning' | 'utvardering' | 'narvaro'>> & Pick<Foljd, 'avstamning' | 'utvardering' | 'narvaro'>;
const tomFoljd = (): HelFoljd => ({ gjorda: [], elever: [], franvaro: {}, vecka: {}, skattning: {}, resultat: {} });
interface Aktiv { id: string; namn: string; val: Val; folj: boolean; foljd: HelFoljd; sparad: boolean; franLank: boolean; uppdaterad?: string; kopia?: string }
const nyAktiv = (val: Val = forval(mp, idag), franLank = false, id = nyttId()): Aktiv => ({ id, namn: '', val, folj: false, foljd: tomFoljd(), sparad: false, franLank });
const fran = lasVal(location.hash);
const { planer, ok: lagringOk } = lasPlaner();
// Planerna för metoden, med nästa pass först och en plan som är slut sist (granskningen 2026-10-24: "Öppna den plan som har
// nästa pass").
const mina = () => lasPlaner().planer.filter((p) => p.metod === data.id).sort(iTurOrdning(idag));
// Planens innehåll som text, med nycklarna i ordning och det införda rensat, så att samma plan ger samma text var den än
// kommer ifrån: lagringen, en kopia eller sidan.
const kanon = (x: unknown): string => JSON.stringify(x, (_, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v));
const innehallAv = (p: { val: string; namn?: string; folj?: boolean; foljd?: unknown }) => kanon([p.val, p.namn ?? '', !!p.folj, rensaFoljd(p.foljd)]);
// Den aktiva planens innehåll som fliken senast läste eller sparade, så att en annan fliks ändring av en annan plan inte
// tar över den här (Codex 2026-10-24).
let senast = '';
const franSparad = (p: SparadPlan): Aktiv => {
  senast = innehallAv(p);
  return { id: p.id, namn: p.namn ?? '', val: lasVal(p.val)?.val ?? forval(mp, idag), folj: !!p.folj, foljd: { ...tomFoljd(), ...(p.foljd ?? {}) }, sparad: true, franLank: false, uppdaterad: p.uppdaterad, kopia: p.kopia };
};
let aktiv: Aktiv;
// Vyn som visas: en vecka i planen, Före första passet eller Efter insatsen. Utan val visas veckan gruppen är i (nuVy).
type Vy = number | 'efter' | 'fore';
let visa: Vy | undefined = fran?.visa;
let notis = '';
{
  const egna = planer.filter((p) => p.metod === data.id).sort(iTurOrdning(idag));
  const sparad = fran?.id ? egna.find((p) => p.id === fran.id) : undefined;
  if (fran && sparad) {
    aktiv = franSparad(sparad);
    if (sparad.val !== kodaVal(fran.val)) notis = 'Planen i den här webbläsaren visas. Den har ändrats efter att länken skapades.';
  } else if (fran) {
    aktiv = nyAktiv(fran.val, true, fran.id ?? nyttId());
    notis = 'Planen kommer från en länk. Spara den, så finns den i den här webbläsaren. Det som förts in när insatsen följs finns bara i den webbläsare där det skrevs.';
  } else if (egna.length) aktiv = franSparad(egna[0]);
  else aktiv = nyAktiv();
}
let plan: Plan = planera(mp, aktiv.val);

// ---------- Lagringen och länken ----------
const lank = (vecka?: number | 'fore') => `${location.origin}${location.pathname}#${kodaVal(aktiv.val, { id: aktiv.id, ...(vecka ? { visa: vecka } : {}) })}`;
const bockade = () => plan.pass.filter((p) => aktiv.foljd.gjorda.includes(passetsDag(p))).length;
const sparadAv = (): SparadPlan => ({ id: aktiv.id, metod: data.id, titel: data.titel, omrade: data.omrade, namn: aktiv.namn, val: kodaVal(aktiv.val), folj: aktiv.folj, foljd: aktiv.foljd, andrad: nuTid(), uppdaterad: aktiv.uppdaterad ?? data.uppdaterad, ...(aktiv.kopia ? { kopia: aktiv.kopia } : {}), schema: schemaAv(plan, aktiv.val), bockade: bockade() });
function spara(): boolean {
  if (!aktiv.sparad) return true;
  const egen = sparadAv();
  const ok = skrivPlaner([egen, ...lasPlaner().planer.filter((p) => p.id !== aktiv.id)]);
  if (ok) senast = innehallAv(egen);
  return ok;
}
// Kopian av datumen som metodbanken och metodens sida läser görs om när en plan öppnas, så att den följer metoden som den
// är nu, också för en plan som kom som kopia från en annan metods sida (Codex 2026-10-24). Det är ingen ändring av planen,
// så tiden för den senaste ändringen står kvar.
function friskaUpp() {
  if (!aktiv.sparad) return;
  const p = lasPlaner().planer.find((x) => x.id === aktiv.id);
  if (!p) return;
  const ny = { ...p, schema: schemaAv(plan, aktiv.val), bockade: bockade() };
  if (JSON.stringify([p.schema, p.bockade]) !== JSON.stringify([ny.schema, ny.bockade])) skrivPlaner([ny, ...lasPlaner().planer.filter((x) => x.id !== p.id)]);
}
// Adressen bär valen, men inte veckan läraren har bläddrat till, så att sidan öppnar veckan gruppen är i nästa gång.
function uppdateraAdressen() {
  if (aktiv.sparad || aktiv.franLank) history.replaceState(null, '', `#${kodaVal(aktiv.val, { id: aktiv.id })}`);
}
const harInfort = () => aktiv.foljd.gjorda.length > 0 || Object.keys(aktiv.foljd.skattning).length > 0 || aktiv.foljd.elever.length > 0 || Object.keys(aktiv.foljd.resultat).length > 0 || !!aktiv.foljd.avstamning?.beslut || !!aktiv.foljd.utvardering?.beslut;
// Gick det inte att spara, säger beskedet vad som håller: kopian när läraren har fört in något, annars länken.
function sparfel() {
  if (aktiv.folj && harInfort()) visaBesked('Det gick inte att spara i den här webbläsaren. Spara en kopia som fil, så finns det du har fört in kvar.', { text: 'Spara en kopia', gor: sparaKopia, kvar: true });
  else visaBesked('Planen gick inte att spara i den här webbläsaren. Kopiera länken, så finns planen kvar.', { text: 'Kopiera länken', gor: () => void kopieraLanken(), kvar: true });
}

// ---------- Valen ----------
const start = $<HTMLInputElement>('pl-start');
const dagknappar = [...sida.querySelectorAll<HTMLButtonElement>('#pl-dagar [data-dag]')];
const langdknappar = [...sida.querySelectorAll<HTMLButtonElement>('#pl-langd [data-langd]')];
const minutknappar = [...sida.querySelectorAll<HTMLButtonElement>('#pl-minuter [data-minuter]')];
const nivaknappar = [...sida.querySelectorAll<HTMLButtonElement>('#pl-nivaer [data-niva]')];
const namnfalt = $<HTMLInputElement>('pl-namn');
const elevfalt = $<HTMLTextAreaElement>('pl-elever');
const foljruta = $<HTMLInputElement>('pl-folj');
const narvaroruta = $<HTMLInputElement>('pl-narvaro');
const tidFran = $<HTMLSelectElement>('pl-tid-fran');
const borjaval = document.getElementById('pl-borja') as HTMLSelectElement | null;
const tidTill = $<HTMLSelectElement>('pl-tid-till');
// Passets längd utan klockslag, och passens längd i planen: klockslagen när läraren har satt dem (Codex 2026-10-24).
const minuter = () => aktiv.val.minuter ?? mp.minuter.max;
const passensLangd = () => passensMinuter(aktiv.val, minuter());
const nivaNamn = () => (data.bank?.nivaer ?? data.nivaer)?.find((n) => n.slug === aktiv.val.niva)?.namn;
const harElever = () => aktiv.folj && aktiv.foljd.elever.length > 0;
const narvaroPa = () => harElever() && !!aktiv.foljd.narvaro;
// De som skattas: eleverna, eller gruppen när läraren följer insatsen utan elevlista.
const vem = () => (harElever() ? aktiv.foljd.elever : [{ id: GRUPPEN, namn: 'Gruppen' }]);
const KORTDAG = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre'];
const plusMinuter = (tid: string, m: number) => { const t = Number(tid.slice(0, 2)) * 60 + Number(tid.slice(3, 5)) + m; return t >= 24 * 60 ? '23:59' : `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
// Olika tider olika dagar: valet står öppet så länge dagarna har olika tider eller läraren har valt det.
let olikaTider = false;

function renderaVal() {
  start.value = aktiv.val.start;
  for (const b of dagknappar) b.setAttribute('aria-pressed', String(aktiv.val.dagar.includes(Number(b.dataset.dag))));
  // En längd som inte står bland knapparna (en längre period ur en länk eller en förlängning) får en egen knapp.
  if (!langdknappar.some((b) => Number(b.dataset.langd) === aktiv.val.langd)) {
    const b = langdknappar[langdknappar.length - 1].cloneNode() as HTMLButtonElement;
    b.dataset.langd = String(aktiv.val.langd);
    b.textContent = String(aktiv.val.langd);
    langdknappar[langdknappar.length - 1].after(b);
    langdknappar.push(b);
    b.addEventListener('click', () => valjLangd(b));
  }
  for (const b of langdknappar) b.setAttribute('aria-pressed', String(Number(b.dataset.langd) === aktiv.val.langd));
  const langd = passensLangd();
  for (const b of minutknappar) b.setAttribute('aria-pressed', String(langd.length === 1 && Number(b.dataset.minuter) === langd[0]));
  for (const b of nivaknappar) b.setAttribute('aria-pressed', String(b.dataset.niva === aktiv.val.niva));
  if (borjaval) {
    borjaval.value = String(aktiv.val.borja ?? 1);
    // Börja på ändrar vad varje vecka i planen är, så den går att ändra tills något är fört in: bockar, skattningar,
    // veckans gång och resultat (Codex 2026-10-25, två gånger: det som förts in hamnade under ett annat steg).
    const last = harFortIn();
    borjaval.disabled = last;
    $('pl-borja-not').hidden = !last;
  }
  if (document.activeElement !== namnfalt) namnfalt.value = aktiv.namn;
  const antal = aktiv.val.dagar.length;
  const varning = $('pl-dagar-varning');
  const utanfor = antal < mp.takt.min || antal > mp.takt.max;
  varning.hidden = !utanfor;
  if (utanfor) varning.textContent = `Du har valt ${antal === 1 ? 'en dag' : `${antal} dagar`} i veckan. Metoden har ${mp.takt.min === mp.takt.max ? mp.takt.min : `${mp.takt.min} till ${mp.takt.max}`} pass i veckan.`;
  $('pl-bockvarning').hidden = !flyttar();
  // Datumet är dagen planen börjar från; första passet är första valda dag från och med den, efter lov och röda dagar
  // (de kalla läsarna 2026-10-24: fältet sa 26 oktober när planen började 27 oktober eller 2 november).
  $('pl-forsta-pass').textContent = plan.forstaPass ? `Första passet: ${dagText(plan.forstaPass)}.` : '';
  renderaTider();
  // Lovet: planens veckor och två till, som knappar med veckans datum. En lovvecka flyttar planen fram. Är veckan först
  // eller sist i raden lov kommer en vecka till, så att ett lov på flera veckor går att trycka in (Niclas 2026-10-25:
  // "markera 52 som lov ... så finns ingen till vecka som knapp efter").
  const lov = new Set(aktiv.val.lov ?? []);
  let forstaLov = plusDagar(forstaMandagen(aktiv.val), -14), sistaLov = plusDagar(plan.efter, 7);
  for (let i = 0; i < 10 && lov.has(veckonyckel(forstaLov)); i++) forstaLov = plusDagar(forstaLov, -7);
  for (let i = 0; i < 10 && lov.has(veckonyckel(sistaLov)); i++) sistaLov = plusDagar(sistaLov, 7);
  const veckor: string[] = [];
  for (let m = forstaLov; m <= sistaLov && veckor.length < 42; m = plusDagar(m, 7)) veckor.push(m);
  $('pl-lovveckor').innerHTML = veckor.map((m) => { const k = veckonyckel(m); const pa = lov.has(k); return `<button type="button" class="pl-chip pl-lovchip" data-lovvecka="${k}" aria-pressed="${pa}" aria-label="Vecka ${isoVecka(m).vecka}, ${esc(spannKort(m, plusDagar(m, 4)))}${pa ? ', lov' : ''}"><span>v. ${isoVecka(m).vecka}</span><small>${esc(spannKort(m, plusDagar(m, 4)))}</small></button>`; }).join('');
  foljruta.checked = aktiv.folj;
  $('pl-elevruta').hidden = !aktiv.folj;
  narvaroruta.checked = !!aktiv.foljd.narvaro;
  if (document.activeElement !== elevfalt) elevfalt.value = aktiv.foljd.elever.map((e) => e.namn).join('\n');
  $('pl-elever-bort').hidden = !aktiv.foljd.elever.length;
  visaElevNot();
}

// Tiderna väljs i listor med klockslag var femte minut från 07.00 till 18.00, så att bara riktiga tider går att välja
// och de ser likadana ut i alla telefoner (Niclas 2026-10-24: "en väljare som bara klarar korrekta tider"). Slutet går
// bara att välja efter början. En tid ur en länk som inte står i listan får stå med, så att den syns.
const KLOCKSLAG = Array.from({ length: 11 * 12 + 1 }, (_, i) => { const m = 7 * 60 + i * 5; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; });
const tidval = (valt: string | undefined, efter?: string) => {
  const lista = [...new Set([...KLOCKSLAG, ...(valt ? [valt] : [])])].sort().filter((k) => (efter ? k > efter : k < KLOCKSLAG[KLOCKSLAG.length - 1]));
  return `${efter ? '' : '<option value="">Ingen tid</option>'}${lista.map((k) => `<option value="${k}"${k === valt ? ' selected' : ''}>${k.replace(':', '.')}</option>`).join('')}`;
};
const slutval = (fran: string | undefined, till: string | undefined) => (fran ? tidval(till, fran) : '<option value="">–</option>');

// Tiderna: en rad för alla dagar, eller en rad per dag när dagarna har olika tider.
function renderaTider() {
  const tider = rentaTider(aktiv.val.tider);
  const dagar = [...aktiv.val.dagar].sort();
  const varden = dagar.map((d) => tider[String(d)]);
  const lika = varden.every((x) => (x ? x[0] === varden[0]?.[0] && x[1] === varden[0]?.[1] : !varden[0]));
  if (!lika && Object.keys(tider).length) olikaTider = true;
  $('pl-tid-alla').hidden = olikaTider;
  $('pl-tid-dagar').hidden = !olikaTider;
  const knapp = $('pl-tid-olika');
  knapp.textContent = olikaTider ? 'Samma tid alla dagar' : 'Olika tider olika dagar';
  knapp.setAttribute('aria-expanded', String(olikaTider));
  const forsta = lika ? varden[0] : undefined;
  tidFran.innerHTML = tidval(forsta?.[0]);
  tidTill.innerHTML = slutval(forsta?.[0], forsta?.[1]);
  tidTill.disabled = !forsta;
  // Olika tider: en tabell med dagen till vänster och Börjar och Slutar i två jämna kolumner, rubrikerna en gång överst
  // (Niclas 2026-10-24: "Ändra tider per pass är inte så snyggt uppradat").
  $('pl-tid-dagar').innerHTML = `<span></span><span class="pl-tidrubrik" aria-hidden="true">Börjar</span><span class="pl-tidrubrik" aria-hidden="true">Slutar</span>${dagar.map((d) => {
    const t = tider[String(d)];
    return `<span class="pl-tiddag">${KORTDAG[d - 1]}</span><select class="pl-falt pl-tid" data-tiddag="${d}" data-del="0" aria-label="${VECKODAGAR[d - 1]}, passet börjar">${tidval(t?.[0])}</select><select class="pl-falt pl-tid" data-tiddag="${d}" data-del="1" aria-label="${VECKODAGAR[d - 1]}, passet slutar"${t ? '' : ' disabled'}>${slutval(t?.[0], t?.[1])}</select>`;
  }).join('')}`;
}
// En dags tid: början och slutet. En ny början flyttar slutet med, så att passet är lika långt som förut, och ett pass
// utan tid får passets längd ur metoden.
const minutAv = (tid: string) => Number(tid.slice(0, 2)) * 60 + Number(tid.slice(3, 5));
function sattTid(dagar: number[], fran: string, till?: string) {
  const tider = { ...rentaTider(aktiv.val.tider) };
  for (const d of dagar) {
    if (!fran) { delete tider[String(d)]; continue; }
    const forra = tider[String(d)];
    const langd = forra ? minutAv(forra[1]) - minutAv(forra[0]) : minuter();
    tider[String(d)] = [fran, till && till > fran ? till : plusMinuter(fran, langd)];
  }
  return tider;
}
tidFran.addEventListener('change', () => andra(() => { aktiv.val.tider = sattTid(aktiv.val.dagar, tidFran.value); }));
tidTill.addEventListener('change', () => { if (tidFran.value) andra(() => { aktiv.val.tider = sattTid(aktiv.val.dagar, tidFran.value, tidTill.value); }); });
$('pl-tid-dagar').addEventListener('change', (e) => {
  const f = e.target as HTMLSelectElement;
  const d = Number(f.dataset.tiddag);
  if (!d) return;
  const [fran, till] = [...$('pl-tid-dagar').querySelectorAll<HTMLSelectElement>(`[data-tiddag="${d}"]`)].map((x) => x.value);
  andra(() => { aktiv.val.tider = sattTid([d], fran, f.dataset.del === '1' ? till : undefined); });
  $('pl-tid-dagar').querySelector<HTMLSelectElement>(`[data-tiddag="${d}"][data-del="${f.dataset.del}"]`)?.focus();
});
$('pl-tid-olika').addEventListener('click', () => {
  if (olikaTider) {
    // Samma tid alla dagar: den första dagens tid gäller alla.
    const tider = rentaTider(aktiv.val.tider);
    const forsta = [...aktiv.val.dagar].sort().map((d) => tider[String(d)]).find(Boolean);
    olikaTider = false;
    andra(() => { aktiv.val.tider = forsta ? sattTid(aktiv.val.dagar, forsta[0], forsta[1]) : {}; });
  } else { olikaTider = true; renderaTider(); }
});

// Varje ändring räknar om planen, sparar en sparad plan och ritar om. En ändring som flyttar passen kan ångras.
const ogonblick = () => ({ val: structuredClone(aktiv.val), foljd: structuredClone(aktiv.foljd), namn: aktiv.namn, folj: aktiv.folj });
function aterstall(o: ReturnType<typeof ogonblick>, meddelande: string) {
  aktiv.val = o.val; aktiv.foljd = o.foljd; aktiv.namn = o.namn; aktiv.folj = o.folj;
  plan = planera(mp, aktiv.val);
  const ok = spara();
  uppdateraAdressen();
  rendera();
  if (!ok) sparfel(); else visaBesked(meddelande);
}
function andra(fn: () => void, meddelande?: string | (() => string | undefined), kanAngra = false) {
  const fore = kanAngra ? ogonblick() : null;
  fn();
  plan = planera(mp, aktiv.val);
  const ok = spara();
  uppdateraAdressen();
  rendera();
  const text = typeof meddelande === 'function' ? meddelande() : meddelande;
  if (!ok) sparfel();
  else if (text) visaBesked(text, fore ? { text: 'Ångra', gor: () => aterstall(fore, 'Ändringen är ångrad.'), kvar: true } : undefined);
}
// Ändras planen långt från sammanfattningen säger beskedet hur planen blev (de kalla läsarna 2026-10-24: ändringen
// syntes inte där läraren stod).
const iVyn = (el: Element) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
const sammanfattning = () => (plan.forstaPass && plan.sistaPass ? `${plan.pass.length} pass, ${dagText(plan.forstaPass)} till ${dagText(plan.sistaPass)}` : 'inga pass');
const nyPlan = (forst?: string) => () => [forst, utanforPlanen(), iVyn($('pl-summa')) ? '' : `Planen: ${sammanfattning()}.`].filter(Boolean).join(' ') || undefined;
// Det läraren skriver i ett fält sparas utan att sidan ritas om, så att fältet behåller markören.
function sparaTyst() {
  if (!spara()) sparfel();
  renderaSamman();
}
// En ändring som flyttar passen i en plan med bockar säger vad som hände och kan ångras.
function harFortIn(): boolean { return aktiv.foljd.gjorda.length > 0 || Object.keys(aktiv.foljd.skattning).length > 0 || Object.keys(aktiv.foljd.vecka).length > 0 || Object.keys(aktiv.foljd.resultat).length > 0; }
const flyttar = () => aktiv.sparad && harFortIn();
// Det som har förts in men står utanför planen efter en ändring: bockar på dagar utan pass och skattningar i veckor som
// planen inte har. Det står kvar på sina datum och syns igen när planen ändras tillbaka.
function utanforPlanen(): string {
  const dagar = new Set(plan.pass.map(passetsDag));
  const mandagar = new Set(plan.veckor.map((v) => v.mandag));
  const bockar = aktiv.foljd.gjorda.filter((d) => !dagar.has(d)).length;
  const veckor = new Set([...Object.keys(aktiv.foljd.skattning).filter((m) => Object.keys(aktiv.foljd.skattning[m] ?? {}).length), ...Object.keys(aktiv.foljd.vecka)].filter((m) => !mandagar.has(m))).size;
  const delar = [bockar ? `${bockar === 1 ? 'ett bockat pass' : `${bockar} bockade pass`}` : '', veckor ? `${veckor === 1 ? 'en vecka' : `${veckor} veckor`} med skattningar` : ''].filter(Boolean);
  return delar.length ? `${stor(uppraknat(delar))} står nu utanför planen. Det finns kvar och syns igen om du ändrar tillbaka.` : '';
}

$('pl-val').addEventListener('submit', (e) => e.preventDefault());
start.addEventListener('change', () => {
  // Ett tomt datum eller ett år långt bort säger till, och planen behåller sitt datum (buggjakten 2026-10-24: år 0001 blev 1901).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start.value) || start.value < '2000-01-01' || start.value > '2099-12-31') {
    const tomt = !start.value;
    start.value = aktiv.val.start;
    visaBesked(tomt ? 'Planen behöver ett datum, så den har kvar sitt.' : 'Välj ett datum mellan år 2000 och 2099. Planen har kvar sitt datum.');
    return;
  }
  andra(() => { aktiv.val.start = start.value; }, nyPlan(flyttar() ? 'Passen har flyttats.' : undefined), flyttar());
});
for (const b of dagknappar) b.addEventListener('click', () => {
  const dag = Number(b.dataset.dag);
  const har = aktiv.val.dagar.includes(dag);
  if (har && aktiv.val.dagar.length === 1) { visaBesked('Planen behöver minst en dag.'); return; }
  andra(() => {
    aktiv.val.dagar = har ? aktiv.val.dagar.filter((x) => x !== dag) : [...aktiv.val.dagar, dag].sort();
    // En ny dag får samma tid som de andra, när de har samma.
    const tider = rentaTider(aktiv.val.tider);
    const forsta = Object.values(tider)[0];
    if (!har && forsta && !olikaTider) aktiv.val.tider = { ...tider, [String(dag)]: forsta };
    if (har) { const t = { ...tider }; delete t[String(dag)]; aktiv.val.tider = t; }
  }, nyPlan(flyttar() ? 'Passen har flyttats.' : undefined), flyttar());
});
const valjLangd = (b: HTMLButtonElement) => andra(() => { aktiv.val.langd = Number(b.dataset.langd); }, nyPlan(flyttar() ? 'Antalet veckor är ändrat.' : undefined), flyttar());
for (const b of langdknappar) b.addEventListener('click', () => valjLangd(b));
// Med klockslag flyttar en ny längd passens slut, så att tiderna och längden säger samma sak (Codex 2026-10-24).
for (const b of minutknappar) b.addEventListener('click', () => andra(() => {
  const n = Number(b.dataset.minuter);
  aktiv.val.minuter = n;
  aktiv.val.tider = Object.fromEntries(Object.entries(rentaTider(aktiv.val.tider)).map(([d, [fran]]) => [d, [fran, plusMinuter(fran, n)]]));
}));
for (const b of nivaknappar) b.addEventListener('click', () => andra(() => { aktiv.val.niva = aktiv.val.niva === b.dataset.niva ? undefined : b.dataset.niva; }));
// Börja på: en stege, som läslistorna, börjar där gruppen är, och planen får de steg som är kvar (de kalla testarna
// 2026-10-24: alla började på Läslista start).
borjaval?.addEventListener('change', () => {
  const n = Number(borjaval.value);
  andra(() => { aktiv.val.borja = n > 1 ? n : undefined; aktiv.val.langd = forvaldLangd(mp, n); }, nyPlan(`Planen börjar på ${borjaval.selectedOptions[0]?.textContent ?? ''}.`), flyttar());
});
// Gruppens namn står i planen direkt och ritas och sparas en stund efter sista tangenten (Codex 2026-10-24: ett byte av plan
// under tiden gav namnet till nästa plan).
let namnTimer = 0;
namnfalt.addEventListener('input', () => {
  aktiv.namn = namnfalt.value.trim().slice(0, 40);
  window.clearTimeout(namnTimer);
  namnTimer = window.setTimeout(() => { namnTimer = 0; andra(() => {}); }, 400);
});
$('pl-lovveckor').addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('[data-lovvecka]');
  if (!b) return;
  const k = b.dataset.lovvecka!;
  const har = (aktiv.val.lov ?? []).includes(k);
  andra(() => { aktiv.val.lov = har ? aktiv.val.lov!.filter((x) => x !== k) : [...(aktiv.val.lov ?? []), k].sort(); }, () => `${har ? `Vecka ${Number(k.slice(5))} är inte lov längre.` : `Vecka ${Number(k.slice(5))} är lov.`} Planen: ${sammanfattning()}.`, true);
  $('pl-lovveckor').querySelector<HTMLButtonElement>(`[data-lovvecka="${k}"]`)?.focus();
});
foljruta.addEventListener('change', () => andra(() => { aktiv.folj = foljruta.checked; if (aktiv.folj) bedOmVaraktig(); }, foljruta.checked ? 'Du följer insatsen. Veckan visar passen att bocka och skattningen mot målet.' : 'Planen visar bara planen. Det du har fört in finns kvar om du slår på uppföljningen igen.'));
narvaroruta.addEventListener('change', () => andra(() => { aktiv.foljd = { ...aktiv.foljd, narvaro: narvaroruta.checked }; }, narvaroruta.checked ? 'Under varje bockat pass står eleverna. Tryck på den som inte var med.' : 'Närvaron noteras inte. Det du har fört in finns kvar.'));
// Elevlistan: en elev per rad, högst tolv. Varje rad minns sin elev medan läraren skriver: ett namn som står kvar är samma
// elev, ett rättat namn på en rad är radens elev, och en rad som står tom en stund behåller sin elev tills läraren skriver
// igen (granskningen 2026-10-24: "Ali" som blev "Ali S." tappade sina skattningar; Codex samma dag: en paus med raden tom
// gav ett nytt id, och en borttagen rad gav nästa elev den borttagnas id). En ny elev behåller sitt id medan läraren
// skriver namnet. Vad som togs bort sägs när läraren lämnar fältet, och under fältet står det som inte kom med
// (buggjakten samma dag: den trettonde eleven och den andra Kalle försvann utan besked).
type Elev = { id: string; namn: string };
// fore: listan när läraren började skriva, och det som var infört då. radId: eleven som varje rad hör till.
let redigering: { plan: string; fore: Elev[]; foljd: HelFoljd; nya: Map<number, string>; radId: (string | undefined)[] } | null = null;
let elevNot = { plan: '', text: '' };
let elevTimer = 0;
const forNamn = (n: string) => n.split(' ')[0].toLocaleLowerCase('sv');
function lasElevlistan(text: string, r: NonNullable<typeof redigering>) {
  const sett = new Set<string>();
  const dubbletter: string[] = [], utanfor: string[] = [], kortade: string[] = [], enBokstav: string[] = [];
  const rader = text.split('\n').map((x) => {
    const hel = x.trim().replace(/\s+/g, ' ');
    // Ett namn får vara högst 30 tecken och kortas vid ett ord, inte mitt i det.
    const n = hel.length > 30 ? hel.slice(0, 31).replace(/\s+\S*$/, '').slice(0, 30) || hel.slice(0, 30) : hel;
    if (n !== hel) kortade.push(n);
    if (n.length === 1) enBokstav.push(n);
    if (!n) return '';
    if (sett.has(n.toLocaleLowerCase('sv'))) { dubbletter.push(n); return ''; }
    sett.add(n.toLocaleLowerCase('sv'));
    if (sett.size > 12) { utanfor.push(n); return ''; }
    return n;
  });
  // Samma namn som nu eller som när läraren började skriva är samma elev, så att ett namn som ändras fram och tillbaka
  // behåller sitt id.
  const kanda = [...aktiv.foljd.elever, ...r.fore];
  const anvanda = new Set<string>();
  const lika = rader.map((n) => { if (!n) return null; const e = kanda.find((x) => x.namn === n && !anvanda.has(x.id)); if (e) anvanda.add(e.id); return e ? { id: e.id, namn: n } : null; });
  const namnFor = (id: string) => aktiv.foljd.elever.find((x) => x.id === id)?.namn ?? r.fore.find((x) => x.id === id)?.namn;
  const radId: (string | undefined)[] = [];
  const elever = rader.flatMap((n, i): Elev[] => {
    // En tom rad behåller sin elev, så att ett namn som skrivs om efter en paus är samma elev.
    if (!n) { radId[i] = r.radId[i]; return []; }
    if (lika[i]) { radId[i] = lika[i]!.id; return [lika[i]!]; }
    // Ett nytt namn på en rad som har en elev är samma elev med rättat namn, om eleven inte står kvar på en annan rad.
    const agare = r.radId[i];
    if (agare && !anvanda.has(agare) && !rader.some((x, j) => j !== i && x === namnFor(agare))) { anvanda.add(agare); radId[i] = agare; return [{ id: agare, namn: n }]; }
    let id = r.nya.get(i);
    if (!id || anvanda.has(id)) { id = `e${nyttId().slice(0, 4)}`; r.nya.set(i, id); }
    anvanda.add(id);
    radId[i] = id;
    return [{ id, namn: n }];
  });
  r.radId = radId;
  return { elever, dubbletter: [...new Set(dubbletter)], utanfor, kortade, enBokstav: [...new Set(enBokstav)] };
}
// Ett namn som lämnar listan blir "en elev" i lärarens meningar, så att det inte följer med texten som kopieras när listan
// inte längre känner det (Codex 2026-10-24).
function utanGamlaNamn(namn: Elev[]) {
  if (!namn.length) return;
  const f = aktiv.foljd;
  const tvatta = <T extends { not?: string }>(x: T): T => (x.not ? { ...x, not: utanNamn(x.not, namn) } : x);
  f.vecka = Object.fromEntries(Object.entries(f.vecka).map(([k, v]) => [k, tvatta(v)]));
  if (f.avstamning) f.avstamning = tvatta(f.avstamning);
  if (f.utvardering) f.utvardering = tvatta(f.utvardering);
}
// Ångra efter en borttagen elev: namnen tillbaka i de meningar som fick "en elev", men inget annat, så att det som har
// förts in sedan står kvar (Codex 2026-10-24: Ångra lade tillbaka allt som stod när läraren började skriva).
function medNamnIgen(fore: HelFoljd, namn: Elev[]) {
  const f = aktiv.foljd;
  const igen = <T extends { not?: string }>(nu: T | undefined, da: T | undefined): T | undefined => (nu?.not && da?.not && nu.not === utanNamn(da.not, namn) ? { ...nu, not: da.not } : nu);
  f.vecka = Object.fromEntries(Object.entries(f.vecka).map(([k, v]) => [k, igen(v, fore.vecka[k]) ?? v]));
  f.avstamning = igen(f.avstamning, fore.avstamning);
  f.utvardering = igen(f.utvardering, fore.utvardering);
}
const startaRedigering = () => { if (!redigering || redigering.plan !== aktiv.id) redigering = { plan: aktiv.id, fore: aktiv.foljd.elever, foljd: structuredClone(aktiv.foljd), nya: new Map(), radId: aktiv.foljd.elever.map((e) => e.id) }; };
// skriver: medan läraren skriver. tyst: sidan sparar, som när läraren byter flik, och redigeringen fortsätter (Codex
// 2026-10-24: ett flikbyte mitt i ett namn gav eleven ett nytt id). klar: läraren har lämnat fältet. slut: planen byts.
function uppdateraElevlistan(lage: 'skriver' | 'tyst' | 'klar' | 'slut') {
  window.clearTimeout(elevTimer);
  elevTimer = 0;
  if (!redigering || redigering.plan !== aktiv.id) { redigering = null; return; }
  const r = redigering;
  const { elever, dubbletter, utanfor, kortade, enBokstav } = lasElevlistan(elevfalt.value, r);
  aktiv.foljd.elever = elever;
  $('pl-elever-bort').hidden = !elever.length;
  elevNot = { plan: aktiv.id, text: [
    utanfor.length ? `${uppraknat(utanfor)} kom inte med: elevlistan rymmer tolv elever.` : '',
    ...dubbletter.map((n) => `${n} står två gånger. Skriv två olika namn, som ${n} A och ${n} B.`),
    kortade.length ? `Ett namn får vara högst 30 tecken, så ${uppraknat(kortade.map((x) => `"${x}"`))} är ${kortade.length === 1 ? 'kortat' : 'kortade'}.` : '',
    // En enda bokstav går inte att skilja från ett ord i en mening ("I dag"), så den byts inte mot "en elev" i texten som kopieras.
    enBokstav.length ? `${uppraknat(enBokstav)} har en bokstav och byts inte ut i texten som kopieras. Skriv minst två, som förnamnet eller två initialer.` : '',
  ].filter(Boolean).join(' ') };
  visaElevNot();
  const borta = r.fore.filter((e) => !elever.some((x) => x.id === e.id));
  const gamla = r.fore.filter((e) => { const ny = elever.find((x) => x.id === e.id); return !ny || forNamn(ny.namn) !== forNamn(e.namn); });
  if (lage === 'klar' || lage === 'slut') {
    utanGamlaNamn(gamla);
    redigering = null;
  }
  if (lage === 'klar' && document.activeElement !== elevfalt) elevfalt.value = elever.map((e) => e.namn).join('\n');
  sparaTyst();
  renderaVeckan();
  if (lage !== 'klar') return;
  const gruppSkattad = !r.fore.length && Object.values(aktiv.foljd.skattning).some((v) => v?.[GRUPPEN]);
  if (borta.length) visaBesked(`${uppraknat(borta.map((e) => e.namn))} ${borta.length === 1 ? 'är borttagen' : 'är borttagna'} ur elevlistan.`, { text: 'Ångra', kvar: true, gor: () => {
    if (aktiv.id !== r.plan) return;
    aktiv.foljd.elever = r.fore;
    medNamnIgen(r.foljd, gamla);
    elevNot = { plan: '', text: '' };
    sparaTyst();
    elevfalt.value = r.fore.map((e) => e.namn).join('\n');
    rendera();
    visaBesked('Elevlistan är tillbaka.');
  } });
  else if (gruppSkattad && elever.length) visaBesked('Gruppens skattningar finns kvar i sammanställningen, under Gruppen.');
}
// Gruppens storlek mot metodens (faktarutans grupp), så att en grupp som metoden inte är skriven för syns (de kalla
// testarna 2026-10-24: Seriesamtal är för en till fyra elever).
const storlekNot = () => {
  const n = aktiv.foljd.elever.length, g = data.grupp;
  if (!n || !g || (!(g.max && n > g.max) && !(g.min && n < g.min))) return '';
  return `Metoden är skriven för ${g.text.charAt(0).toLocaleLowerCase('sv')}${g.text.slice(1).replace(/\.$/, '')}, och listan har ${n === 1 ? 'en' : n}.`;
};
const visaElevNot = () => { const t = [elevNot.plan === aktiv.id ? elevNot.text : '', storlekNot()].filter(Boolean).join(' '); $('pl-elever-not').textContent = t; $('pl-elever-not').hidden = !t; };
elevfalt.addEventListener('focus', startaRedigering);
elevfalt.addEventListener('input', () => {
  startaRedigering();
  window.clearTimeout(elevTimer);
  elevTimer = window.setTimeout(() => uppdateraElevlistan('skriver'), 600);
});
elevfalt.addEventListener('blur', () => { if (redigering) uppdateraElevlistan('klar'); });
$('pl-elever-bort').addEventListener('click', (e) => fragaForst(e.currentTarget as HTMLElement, 'Ta bort elevernas namn och allt som förts in om dem?', 'Ta bort', () => {
  const fore = ogonblick();
  andra(() => {
    const kvar = (r: Record<string, Record<string, number>>): Record<string, Record<string, number>> => Object.fromEntries(Object.entries(r).map(([k, v]): [string, Record<string, number>] => [k, v[GRUPPEN] ? { [GRUPPEN]: v[GRUPPEN] } : {}]));
    utanGamlaNamn(aktiv.foljd.elever);
    aktiv.foljd = { ...aktiv.foljd, elever: [], franvaro: {}, resultat: {}, skattning: kvar(aktiv.foljd.skattning) };
    elevNot = { plan: '', text: '' };
  });
  visaBesked('Elevernas namn och det som förts in om dem är borttaget.', { text: 'Ångra', kvar: true, gor: () => aterstall(fore, 'Eleverna är tillbaka.') });
}));

// ---------- Målet ----------
// Insatsens mål: metodens, eller det läraren har skrivit med pennan (Niclas 2026-10-24: "En sådan där typisk skriv knapp
// vid målet för att redigera det", "en liten penna symbol"). Det står i planen, ovanför skattningen och i utvärderingen.
const aktivtMal = () => aktiv.val.mal || data.mal;
const PENNA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L18.5 9.5l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';
const malRad = (plats: string, penna = true) => (aktivtMal()
  ? `<div class="pl-mal" data-malplats="${plats}"><p class="pl-maltext"><span class="pl-etikett">Mål</span>${esc(malText(aktivtMal()))}</p>${penna ? `<button type="button" class="pl-penna" data-mal-andra aria-label="Skriv om målet" title="Skriv om målet">${PENNA}</button>` : ''}</div>`
  : '');
function oppnaMal(plats: string) {
  rendera();
  const rad = sida.querySelector<HTMLElement>(`.pl-mal[data-malplats="${plats}"]`);
  if (!rad) return;
  rad.classList.add('andras');
  rad.innerHTML = `<label class="pl-etikett" for="pl-malfalt">Mål</label><textarea class="pl-falt pl-textfalt pl-malfalt" id="pl-malfalt" rows="3" maxlength="200">${esc(aktivtMal())}</textarea><p class="pl-hjalp">Skriv målet för gruppen, utan elevernas namn. Det är målet du skattar eleverna mot; veckornas innehåll är metodens.</p><p class="pl-andra-knappar"><button type="button" class="knapp liten" data-mal-klar>Klar</button>${aktiv.val.mal ? '<button type="button" class="knapp sekundar liten" data-mal-metodens>Metodens mål</button>' : ''}<button type="button" class="pl-textknapp" data-mal-avbryt>Avbryt</button></p>`;
  const f = rad.querySelector<HTMLTextAreaElement>('textarea')!;
  f.focus();
  f.setSelectionRange(f.value.length, f.value.length);
  f.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sparaMal(f.value); }
    else if (e.key === 'Escape') { e.preventDefault(); rendera(); }
  });
}
function sparaMal(text: string) {
  const ny = rentMal(text);
  const eget = ny && ny !== rentMal(data.mal) ? ny : undefined;
  if (eget === aktiv.val.mal) { rendera(); return; }
  andra(() => { aktiv.val.mal = eget; }, eget ? 'Målet är ändrat.' : 'Metodens mål gäller igen.', true);
}

// ---------- Planen ----------
// En vecka som tas flera gånger säger vilken gång (buggjakten 2026-10-24: tre likadana "3 igen"): igen, en tredje gång.
const GANGEN = ['', 'igen', 'en tredje gång', 'en fjärde gång', 'en femte gång'];
const gangen = (v: PlanVecka) => (v.igen ? plan.veckor.filter((x) => x.innehall === v.innehall && x.nr <= v.nr).length - 1 : 0);
const rubrikVecka = (v: PlanVecka) => `Vecka ${planvecka(plan, v)}${v.igen ? ` ${GANGEN[gangen(v)] ?? `för ${gangen(v) + 1}:e gången`}` : ''}`;
const radFor = (v: PlanVecka) => (v.steg !== null && v.steg !== undefined ? data.progression?.rader[v.steg] : undefined);
// Progressionens rader i veckan: veckans rad, eller i en progression i pass raderna för veckans pass, i ordning (betan
// 2026-10-24: Seriesamtal har sina steg pass för pass).
const radernaI = (v: PlanVecka) => {
  const rad = radFor(v);
  if (rad) return [rad];
  const steg = [...new Set(v.pass.map((n) => plan.pass[n - 1].steg).filter((x): x is number => x !== null && x !== undefined))].sort((a, b) => a - b);
  return steg.map((i) => data.progression!.rader[i]).filter(Boolean);
};
const uppfoljningI = (v: PlanVecka) => plan.uppfoljning.flatMap((u) => u.tillfallen.filter((t) => t.vecka === v.nr).map((t) => ({ ...u, ...t })));
const efterUppfoljning = () => plan.uppfoljning.filter((u) => u.typ === 'efter');
// Uppföljningen efter heter Efter insatsen i planen, och en rad som görs några veckor efter heter som i metoden, så att
// två rader inte heter likadant (de kalla testarna 2026-10-24: "Efter insatsen: v. 50. Efter insatsen: v. 1.").
const uppfNamn = (u: Plan['uppfoljning'][number]) => (u.typ === 'efter' && efterUppfoljning()[0]?.rad === u.rad ? 'Efter insatsen' : nar(u.rad));
// Vyn som sidan öppnar: Före till första passets dag, veckan gruppen är i, och Efter insatsen när sista passet har varit
// (Opus och Sonnet 2026-10-24: Före som en egen flik först bland veckorna).
const nuVy = (): Vy => (plan.sistaPass && idag > plan.sistaPass ? 'efter' : plan.forstaPass && idag < plan.forstaPass && harFore() ? 'fore' : veckanFor(plan, idag)?.nr ?? 1);
// Planen har börjat när dess första vecka har börjat; före det är ingen vecka den här veckan (de kalla läsarna 2026-10-24).
const harBorjat = () => !!plan.veckor.length && idag >= plan.veckor[0].mandag;
const visadVy = (): Vy => (visa === 'efter' || (visa === 'fore' && harFore()) || (typeof visa === 'number' && plan.veckor[visa - 1]) ? visa : nuVy());
const gjort = (dag: string) => aktiv.foljd.gjorda.includes(dag);
const passetsTidText = (p: Pass) => { const t = passetsTid(aktiv.val, p); return t ? tidsspann(t) : ''; };
// Veckans pass som små rutor: bockat, varit men inte bockat, och kommande.
const rutor = (v: PlanVecka) => {
  const pass = v.pass.map((n) => plan.pass[n - 1]);
  const antal = pass.filter((p) => gjort(passetsDag(p))).length;
  return `<span class="pl-rutor" role="img" aria-label="${antal} av ${pass.length} pass bockade">${pass.map((p) => `<span class="pl-ruta${gjort(passetsDag(p)) ? ' gjord' : p.datum <= idag ? ' varit' : ''}"></span>`).join('')}</span>`;
};

function renderaSumma() {
  const n = plan.pass.length;
  const dagar = stor(dagarText(aktiv.val));
  // Uppföljningen efter heter Efter insatsen i planen; metodens egen rubrik står i Efter insatsen (de kalla läsarna:
  // "Efter sex till åtta veckor" i en plan på sex veckor).
  const uppf = plan.uppfoljning.filter((u) => u.tillfallen.length).map((u) => `${uppfNamn(u)}: ${uppraknat([...new Set(u.tillfallen.map((t) => `v. ${isoVecka(t.datum).vecka}`))])}`);
  const antal = aktiv.val.dagar.length;
  const farre = antal < mp.takt.min || antal > mp.takt.max ? `Metoden har ${mp.takt.min === mp.takt.max ? mp.takt.min : `${mp.takt.min} till ${mp.takt.max}`} pass i veckan, och planen har ${antal}.` : '';
  const samma = plan.forstaPass && plan.sistaPass && plan.forstaPass.slice(0, 4) === plan.sistaPass.slice(0, 4);
  // Pass mellan jul och trettondagen: loven skiljer sig mellan skolor, så planen föreslår inget, men säger till.
  const iJulen = (datum: string) => { const [, m, d] = datum.split('-').map(Number); return (m === 12 && d >= 21) || (m === 1 && d <= 6); };
  // Bara det som kommer (verifieringen 2026-10-25: varningen stod kvar efter insatsen).
  const kommer = (datum: string) => iJulen(datum) && datum >= idag;
  const julveckor = [...new Set(plan.pass.map((p) => p.datum).filter(kommer).map((d) => `v. ${isoVecka(d).vecka}`))];
  const julUppfoljning = [...new Set(efterUppfoljning().flatMap((u) => u.tillfallen.map((x) => x.datum)).filter(kommer).map((d) => `v. ${isoVecka(d).vecka}`))];
  // Klockslag som ger andra längder än metodens säger till, som dagarna, så att ett felval syns (Codex 2026-10-24).
  const langd = passensLangd();
  const metodensLangd = mp.minuter.min === mp.minuter.max ? `${mp.minuter.max}` : `${mp.minuter.min} till ${mp.minuter.max}`;
  const annanLangd = langd.some((x) => x < mp.minuter.min || x > mp.minuter.max) ? `Metoden har pass om ${metodensLangd} minuter, och tiderna ger ${minuterText(langd)}.` : '';
  // Ett förslag som redan har varit helt är ett felval av år eller datum (buggjakten 2026-10-24). En insats som pågår går att
  // föra in i efterhand utan besked.
  const redanVarit = !aktiv.sparad && !aktiv.franLank && plan.sistaPass && plan.sistaPass < idag ? `Planen har redan varit: sista passet var ${dagText(plan.sistaPass)}${plan.sistaPass.slice(0, 4) === idag.slice(0, 4) ? '' : ` ${plan.sistaPass.slice(0, 4)}`}. Välj ett senare datum under Från och med.` : '';
  // Progressionens steg som planen inte når, och veckor som metodens progression inte har något för (de kalla testarna
  // 2026-10-24: sex veckor nådde inte Läslista 6, utan att planen sa det).
  const langdText = mp.stegEnhet === 'pass' ? `${plan.pass.length} pass` : `${aktiv.val.langd} ${aktiv.val.langd === 1 ? 'vecka' : 'veckor'}`;
  const ejNadda = data.progression ? stegUtanfor(mp, plan).filter((x) => !x.vidBehov).map((x) => data.progression!.rader[x.rad].kort) : [];
  const kortare = ejNadda.length ? `Med ${langdText} når gruppen inte ${uppraknat(ejNadda)} i metoden.` : '';
  const tomma = data.progression && mp.stegEnhet === 'veckor' ? plan.veckor.filter((v) => v.steg === null).length : 0;
  const langre = tomma ? `Planen är längre än metodens progression, så ${tomma === 1 ? 'en vecka' : `${tomma} veckor`} har inget eget fokus i metoden.` : '';
  $('pl-summa-text').innerHTML = n
    ? `<p class="pl-tal">${n} pass om ${esc(minuterText(langd))} minuter</p><p>${esc(dagar)}, ${esc(samma ? datumText(plan.forstaPass!).replace(/ \d{4}$/, '') : datumText(plan.forstaPass!))} till ${esc(datumText(plan.sistaPass!))}.</p>${uppf.length ? `<p>${esc(uppf.join('. '))}.</p>` : ''}${[redanVarit, farre, annanLangd, kortare, langre].filter(Boolean).map((x) => `<p class="pl-varning">${esc(x)}</p>`).join('')}${julveckor.length ? `<p class="pl-varning">Planen har pass i ${esc(uppraknat(julveckor))}, vid jul och nyår. Är det lov hos er, tryck på ${julveckor.length > 1 ? 'veckorna' : 'veckan'} under Lov${aktiv.sparad ? ' i Ändra planen' : ''}.</p>` : ''}${julUppfoljning.length ? `<p class="pl-varning">Uppföljningen efter insatsen hamnar i ${esc(uppraknat(julUppfoljning))}, vid jul och nyår. Är det lov hos er, gör den första veckan efter lovet.</p>` : ''}${malRad('planen')}`
    : '<p>Planen har inga pass. Välj dagar och första passet.</p>';
  // Texten till åtgärdsprogrammet följer planen, och rutan är så hög som texten.
  // Rutan står när planen är klar, alltså sparad eller ur en länk (Niclas 2026-10-24: "när man gjort klart planeringen").
  const ap = $<HTMLTextAreaElement>('pl-aptext');
  $('pl-ap').hidden = !n || (!aktiv.sparad && !aktiv.franLank);
  ap.value = n ? vanligText(atgardstext()) : '';
  $('pl-spara').hidden = aktiv.sparad;
  $('pl-kalender').hidden = !aktiv.sparad && !aktiv.franLank;
  $('pl-ta-bort').hidden = !aktiv.sparad;
  $('pl-sparad').textContent = aktiv.sparad ? 'Planen sparas i den här webbläsaren.' : lagringOk ? 'Planen är ett förslag tills du sparar den.' : 'Webbläsaren sparar inget här.';
}

function renderaVeckor() {
  const vy = (aktiv.sparad || aktiv.franLank) && (harBorjat() || nuVy() === 'fore') ? nuVy() : null;
  const klick = aktiv.sparad || aktiv.franLank;
  // Veckorna går att öppna när planen är sparad; i ett förslag är de en lista.
  const rad = (attr: string, inner: string) => (klick ? `<button type="button" class="pl-veckoknapp" ${attr}>${inner}</button>` : `<div class="pl-veckoknapp">${inner}</div>`);
  const rader: string[] = [];
  const lovFore = (v: PlanVecka) => plan.lovveckor.filter((m) => m < v.mandag && (v.nr === 1 || m > plan.veckor[v.nr - 2].mandag));
  const lovrad = (m: string) => `<li class="pl-lovvecka"><span class="pl-v">Lov</span><span class="pl-d">${esc(spannKort(m, plusDagar(m, 4)))}</span><span class="pl-innehall"><span class="pl-pass">v. ${isoVecka(m).vecka}</span><span class="pl-fokus">Inga pass</span><button type="button" class="pl-textknapp" data-lov-bort="${esc(veckonyckel(m))}" aria-label="Ta bort lovet vecka ${isoVecka(m).vecka}">Ta bort lovet</button></span></li>`;
  const foljer = klick && aktiv.folj;
  const mitt = mittVeckan(plan);
  for (const v of plan.veckor) {
    for (const m of lovFore(v)) rader.push(lovrad(m));
    const { fran: f, till: t } = veckansDagar(plan, v);
    const steg = radernaI(v)[0];
    const forsta = v.pass[0], sista = v.pass[v.pass.length - 1];
    const passText = v.pass.length ? (forsta === sista ? `Pass ${forsta}` : `Pass ${forsta}–${sista}`) : 'Inga pass';
    const marken = [
      ...uppfoljningI(v).map((u) => `<span class="pl-markering uppf">${esc(/^vecka \d+$/i.test(nar(u.rad).trim()) ? 'Uppföljning' : nar(u.rad))}</span>`),
      ...(aktiv.folj && v.nr === mitt && v.nr !== plan.veckor.length ? ['<span class="pl-markering stam">Avstämning</span>'] : []),
      ...(v.bortfall.length ? [`<span class="pl-markering bort">${v.bortfall.length === 1 ? 'Ett pass faller bort' : `${v.bortfall.length} pass faller bort`}</span>`] : []),
      ...(vy === v.nr ? ['<span class="pl-markering nu">Den här veckan</span>'] : []),
    ];
    rader.push(`<li class="${vy === v.nr ? 'nu' : ''}${v.igen ? ' igen' : ''}">${rad(`data-vy="${v.nr}"`, `<span class="pl-v">${esc(rubrikVecka(v))}</span><span class="pl-d">${esc(spannKort(f, t))}</span><span class="pl-innehall"><span class="pl-pass">${passText} · v. ${v.vecka.vecka}${foljer && v.pass.length ? rutor(v) : ''}</span>${steg ? `<span class="pl-fokus">${esc(steg.kort)}</span>` : ''}${marken.length ? `<span class="pl-marken">${marken.join('')}</span>` : ''}</span>`)}</li>`);
  }
  // Före första passet först, med det som görs då (Opus och Sonnet 2026-10-24).
  if (harFore() && plan.veckor.length) {
    const marken = uppfoljningensTillfallen(plan).filter((x) => x.vecka === 0).map((x) => `<span class="pl-markering uppf">${esc(nar(x.rad))}</span>`).join('');
    rader.unshift(`<li class="fore${vy === 'fore' ? ' nu' : ''}">${rad('data-vy="fore"', `<span class="pl-v">Före</span><span class="pl-d">${esc(idag > plusDagar(plan.fore.mandag, 4) && plan.forstaPass ? `före ${spannKort(plan.forstaPass, plan.forstaPass)}` : spannKort(plan.fore.mandag, plusDagar(plan.fore.mandag, 4)))}</span><span class="pl-innehall"><span class="pl-pass">v. ${isoVecka(plan.fore.mandag).vecka}</span><span class="pl-fokus">Före första passet</span>${marken ? `<span class="pl-marken">${marken}</span>` : ''}</span>`)}</li>`);
  }
  for (const m of plan.lovveckor.filter((x) => plan.veckor.length && x > plan.veckor[plan.veckor.length - 1].mandag)) rader.push(lovrad(m));
  if (plan.veckor.length) {
    // Efter insatsen: metodens uppföljning efter och, när läraren följer insatsen, utvärderingen.
    const efter = efterUppfoljning();
    const datum = efter.flatMap((u) => u.tillfallen.map((x) => x.datum)).sort()[0] ?? plan.efter;
    const marken = [
      ...efter.slice(0, 1).map(() => '<span class="pl-markering uppf">Uppföljningen efter</span>'),
      ...(aktiv.folj ? ['<span class="pl-markering stam">Utvärdering</span>'] : []),
      ...(vy === 'efter' ? ['<span class="pl-markering nu">Nu</span>'] : []),
    ];
    rader.push(`<li class="efter${vy === 'efter' ? ' nu' : ''}">${rad('data-vy="efter"', `<span class="pl-v">Efter</span><span class="pl-d">${esc(spannKort(datum, plusDagar(datum, 4)))}</span><span class="pl-innehall"><span class="pl-pass">v. ${isoVecka(datum).vecka}</span><span class="pl-fokus">Efter insatsen</span>${marken.length ? `<span class="pl-marken">${marken.join('')}</span>` : ''}</span>`)}</li>`);
  }
  $('pl-veckor').innerHTML = rader.join('');
}

// ---------- Veckan ----------
// Filernas knappar (snabbmallen, lektionskorten, lathunden) står i sidan, så att bygget sätter filernas version på dem
// (scripts/filversion.mjs) och utskriftsknapparnas skript (SkrivUtPdf.astro) binder dem. Veckan har platser för dem, och
// knapparna flyttas tillbaka till sin gömda plats först varje gång veckan ritas om (granskningarna 2026-10-24: lathunden
// och snabbmallen föll bort vid vartannat tryck) och sedan in på sina platser.
const filer = $('pl-filer');
const filnamn = () => [...filer.querySelectorAll<HTMLElement>('[data-fil]')].map((el) => el.dataset.fil!);
const plats = (namn: string) => (filer.querySelector(`[data-fil="${namn}"]`) ? `<span data-plats="${namn}"></span>` : '');
// En text ur metodens tabeller står utan punkt; som stycke får den en, om den inte redan slutar med ett tecken.
const mening = (s: string) => (/[.!?:”"]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
// Det metoden namnger är en länk dit det finns (K-493; Niclas 2026-10-24: "Ett test. Ett papper. En text. En specifik
// lektion. Då ska det vara hyperlänkat från planen"): bladen, korten, mallarna, testen, texterna och lektionerna, ur
// metodens egen fil (src/lib/metodsaker.ts). En sak på bankens nivåer, som kartläggningens text före, leder till planens nivå.
// Veckan som visas, för en sak som finns en gång för några veckor (Mina lärdomar: vecka 1–2).
let lankVecka: number | undefined;
const sakLank = (s: PlanData['saker'][number], text: string) => {
  const adress = (aktiv.val.niva && s.nivaer?.[aktiv.val.niva]) || (lankVecka !== undefined && s.veckor?.[String(lankVecka)]) || s.adress;
  return `<a href="${esc(adress)}" data-goatcounter-click="planera:${esc(data.id)}:sak" data-goatcounter-title="${esc(data.titel)}: ${esc(s.namn)} från planen">${esc(text)}</a>`;
};
// Ett spann av saker med nummer, som "Bildserie 2–6", är en länk till varje sak när alla finns: Bildserie 2, 3, 4, 5 och 6
// (de kalla testarna 2026-10-24: spannet var ingen länk). Annars står spannet som text. Namnet är ett eller två ord, och
// står ett ord med stor bokstav före ett namn på ett ord, som i "Laminerat Bildserie 1–6", är namnet det sista ordet.
const SPANN = /(\p{Lu}\p{L}+(?: \p{L}+)?) (\d+)\s*[–-]\u2060?\s*(\d+)/gu;
const medSpann = (text: string) => {
  let ut = '', fran = 0;
  for (const m of text.matchAll(SPANN)) {
    const a = Number(m[2]), b = Number(m[3]);
    const spannet = (namn: string) => (b > a && b - a <= 7 ? Array.from({ length: b - a + 1 }, (_, i) => data.saker.find((s) => s.namn === `${namn} ${a + i}`)) : []);
    const namn = [m[1], m[1].split(' ').pop()!].find((n) => { const s = spannet(n); return s.length && s.every(Boolean); });
    if (!namn) continue;
    const start = m.index! + m[1].length - namn.length;
    ut += esc(text.slice(fran, start)) + spannet(namn).map((s, i, alla) => `${i === 0 ? '' : i === alla.length - 1 ? ' och ' : ', '}${sakLank(s!, i === 0 ? `${namn} ${a}` : String(a + i))}`).join('');
    fran = m.index! + m[0].length;
  }
  return ut + esc(text.slice(fran));
};
const lankad = (text: string) => sakdelar(text, data.saker).map((x) => (x.sak === undefined ? medSpann(x.text) : sakLank(data.saker[x.sak], x.text))).join('');
const kortDag = (d: string) => `${stor(VECKODAGAR[veckodag(d) - 1].slice(0, 3))} ${Number(d.slice(8))}/${Number(d.slice(5, 7))}`;
const skala = (attr: string, valt: number | undefined, namn: string) => `<div class="pl-skala" role="group" aria-label="${esc(namn)}">${[1, 2, 3, 4, 5].map((x) => `<button type="button" class="pl-skalsteg" ${attr}="${x}" aria-pressed="${valt === x}" aria-label="${x}, ${esc(SKALAN[x - 1].toLocaleLowerCase('sv'))}">${x}</button>`).join('')}</div>`;
const RIKTNING: Record<string, string> = { upp: 'framåt', samma: 'som förut', ned: 'bakåt' };
// Veckans gång för gruppen i ord, så att den inte förväxlas med skattningens siffror (de kalla läsarna 2026-10-24).
const GANG = ['Svår', 'Ganska svår', 'Okej', 'Bra', 'Mycket bra'];
const PIL: Record<string, string> = { upp: '↑', samma: '→', ned: '↓' };
const riktningText = (e: SammanstallningElev) => { const r = riktning(e); return r ? `${e.forsta!.varde} till ${e.senaste!.varde}, ${RIKTNING[r]}` : e.senaste ? `${e.senaste.varde}, en skattning` : 'Inte skattad än'; };
const beslutsknappar = (slag: 'avstamning' | 'utvardering', val: string[]) => `<div class="pl-beslut" role="group" aria-label="${slag === 'avstamning' ? 'Avstämningens beslut' : 'Utvärderingens beslut'}">${val.map((b) => `<button type="button" class="knapp sekundar liten" data-beslut="${slag}|${b}" aria-pressed="${aktiv.foljd[slag]?.beslut === b}">${esc(BESLUT[b as keyof typeof BESLUT])}</button>`).join('')}</div>`;
// Resultaten i metodens uppföljning före och efter för en elev, till utvärderingen: det första resultatet före och det
// senaste efter, efter datum.
const foreOchEfter = (e: SammanstallningElev) => {
  const alla = elevensResultat(plan, e.resultat);
  const fore = alla.find((x) => x.typ === 'fore');
  const efter = [...alla].reverse().find((x) => x.typ === 'efter');
  return [fore ? `före ${fore.varde}` : '', efter ? `efter ${efter.varde}` : ''].filter(Boolean).join(', ');
};
// Ett namn går att trycka på var det står, och fäller ut elevens utveckling under raden: i skattningen, avstämningen och
// utvärderingen (Niclas 2026-10-24: "trycka på ett namn och se dennes utveckling", "både sammanställning av alla elever i
// gruppen och en elev när som. Utan att skapa mer krångel"). Det som är utfällt står kvar när veckan ritas om.
const utfallda = new Set<string>();
const utfalld = (plats: string, id: string) => utfallda.has(`${aktiv.id}|${plats}|${id}`);
const namnknapp = (plats: string, e: { id: string; namn: string }) => `<button type="button" class="pl-elevnamn pl-namnknapp" data-utveckling="${esc(plats)}|${esc(e.id)}" aria-expanded="${utfalld(plats, e.id)}">${esc(e.namn)}</button>`;
const utvecklingsruta = (plats: string, e: SammanstallningElev | undefined, s: Sammanstallning) => (e && utfalld(plats, e.id) ? `<div class="pl-utveckling">${utveckling(e, s, plats === 'skatta')}</div>` : '');
const riktningar = (s: Sammanstallning, plats: string, medResultat = false) => `<ul class="pl-riktningar">${s.elever.map((e) => {
  const r = riktning(e);
  const res = medResultat ? foreOchEfter(e) : '';
  return `<li>${namnknapp(plats, e)}<span class="pl-riktning${r ? ` ${r}` : ''}">${r ? `<span aria-hidden="true">${PIL[r]} </span>` : ''}${esc(riktningText(e))}${res ? `<span class="pl-res-kort">${esc(stor(res))}</span>` : ''}</span>${utvecklingsruta(plats, e, s)}</li>`;
}).join('')}</ul>`;
const resultatfalt = (nyckel: string) => (harElever() ? `<div class="pl-resultat"><span class="pl-hjalp">Resultat för varje elev, om du vill, som poäng eller antal rätt</span>${aktiv.foljd.elever.map((e) => `<label><span>${esc(e.namn)}</span><input class="pl-falt" type="text" maxlength="40" data-resultat="${esc(nyckel)}|${esc(e.id)}" value="${esc(aktiv.foljd.resultat[nyckel]?.[e.id] ?? '')}" /></label>`).join('')}</div>` : '');
const uppfRad = (x: { nyckel: string; rad: number; datum: string; vecka: number | null }) => `<li><span class="pl-etikett">${esc(nar(x.rad))} · ${x.vecka === null ? `v. ${isoVecka(x.datum).vecka}` : esc(dagText(x.datum))}</span><p>${lankad(data.uppfoljning.rader[x.rad].vad)}</p>${resultatfalt(x.nyckel)}</li>`;
const meningsfalt = (id: string, etikett: string, attr: string, varde: string) => `<label class="pl-etikett" for="${id}">${esc(etikett)}</label><input class="pl-falt pl-brett" type="text" id="${id}" maxlength="200" ${attr} value="${esc(varde)}" /><p class="pl-hjalp">Meningen står i sammanställningen och i texten som kopieras, utan elevernas namn.</p>`;
const forlangSteg = (n: number) => (mp.period.enhet === 'pass' ? n * aktiv.val.dagar.length : n);
const forlangText = (n: number) => (mp.period.enhet === 'pass' ? `${n * aktiv.val.dagar.length} pass` : `${n} ${n === 1 ? 'vecka' : 'veckor'}`);

// Veckorna överst i veckan, så att läraren ser var gruppen är och kan titta i förväg med ett tryck (Niclas 2026-10-24:
// "Lite svårt att hitta till vecka 2 ... Man kan ske vill titta lite i förväg"). Veckan gruppen är i har en prick, och
// veckan som visas är vald. Sidan öppnar själv den vecka gruppen är i.
function remsa(vald: Vy) {
  const nu = harBorjat() || nuVy() === 'fore' ? nuVy() : null;
  const knapp = (vy: Vy, text: string, namn: string) => `<button type="button" class="pl-remsa-vecka${nu === vy ? ' nu' : ''}" data-vy="${vy}" aria-pressed="${vald === vy}" aria-label="${esc(namn)}${nu === vy ? (vy === 'fore' ? ', nu' : ', den här veckan') : ''}">${text}</button>`;
  return `<nav class="pl-remsa" aria-label="Veckorna i planen"><span class="pl-etikett">Veckorna</span><div class="pl-remsa-knappar">${harFore() ? knapp('fore', 'Före', 'Före första passet') : ''}${plan.veckor.map((v) => knapp(v.nr, `${planvecka(plan, v)}${v.igen ? `<small>${gangen(v) > 1 ? `${gangen(v) + 1}:e` : 'igen'}</small>` : ''}`, `${rubrikVecka(v)}, ${spannKort(veckansDagar(plan, v).fran, veckansDagar(plan, v).till)}`)).join('')}${knapp('efter', 'Efter', 'Efter insatsen')}</div></nav>`;
}

// Rutor som ska stå öppna efter nästa ritning, fast veckan som visas byts (Ändra veckan efter Upprepa veckan).
const haltOppen = new Set<string>();
function renderaVeckan() {
  const sektion = $('pl-veckan');
  for (const el of sektion.querySelectorAll<HTMLElement>('[data-fil]')) filer.append(el);
  if ((!aktiv.sparad && !aktiv.franLank) || !plan.veckor.length) { sektion.hidden = true; sektion.innerHTML = ''; delete sektion.dataset.vy; return; }
  const vy = visadVy();
  // Rutorna som läraren har fällt ut står kvar utfällda när samma vecka ritas om.
  const oppna = sektion.dataset.vy === String(vy) ? new Set([...sektion.querySelectorAll<HTMLDetailsElement>('details[data-ruta]')].filter((d) => d.open).map((d) => d.dataset.ruta!)) : new Set<string>();
  for (const r of haltOppen) oppna.add(r);
  haltOppen.clear();
  sektion.innerHTML = (vy === 'efter' ? efterDelar() : vy === 'fore' ? foreDelar(oppna) : veckansDelar(plan.veckor[vy - 1], oppna)).join('');
  for (const ruta of sektion.querySelectorAll<HTMLElement>('[data-plats]')) { const el = filer.querySelector(`[data-fil="${ruta.dataset.plats}"]`); if (el) ruta.replaceWith(el); }
  sektion.hidden = false;
  sektion.dataset.vy = String(vy);
}

// Att justera insatsen: metodens egna sätt när metoden har dem (plan.justera), annars veckan en gång till, nivån när
// planen har nivåer och elevhälsan (de kalla testarna 2026-10-24: "byt nivå" stod också där planen inte har nivåer).
function justeraText() {
  const satt = data.justera?.length ? data.justera.map(mening) : [
    'Ta samma vecka en gång till under Ändra veckan.',
    ...((data.bank || data.nivaer) ? ['Byt nivå under Ändra planen.'] : []),
  ];
  return `<ul class="pl-justera">${[...satt, 'Ta upp det med elevhälsan.'].map((x) => `<li>${lankad(x)}</li>`).join('')}</ul>`;
}

// ---------- Passet ----------
// Passet i rutan med nästa pass (betan 2026-10-24: ingen av de fem kalla testarna kunde hålla första passet bara efter
// planen; Opus och Sonnet föreslog var för sig samma form): passets namn med dess roll ur metodens plan, och delarna som
// tunna rader med tiden, som fälls ut till det läraren gör och säger. Ett pass med egen tabell i metoden, som pass 1 i
// Seriesamtal, har den tabellens delar. Har passet en tid lika lång som delarna står klockslagen.
const rollerFor = (p: Pass) => {
  const rader = passetsRoller(plan, p, mp.passen);
  // Den mest bestämda raden om passets plats i insatsen, och raderna om platsen i veckan.
  const typ = (r: number) => mp.passen[r].nar.typ;
  const iInsatsen = rader.filter((r) => typ(r) === 'pass' || typ(r) === 'sista').slice(0, 1);
  return [...iInsatsen, ...rader.filter((r) => typ(r) === 'veckor'), ...rader.filter((r) => typ(r) === 'vecka')].map((r) => data.passen![r]);
};
// Passets namn: det första korta namnet bland passets roller, eller rollens ord före kolon.
const rollNamn = (p: Pass) => { for (const r of rollerFor(p)) { const k = r.kort ?? (/^[^:]{3,30}:/.test(r.text) ? r.text.split(':')[0] : ''); if (k) return k; } return ''; };
const fasFran = (tid: string) => { const m = tid.match(/^(\d+)/); return m ? Number(m[1]) : null; };
const fasTill = (tid: string) => { const m = tid.match(/(\d+)\s*[–-]\u2060?\s*(\d+)/); return m ? Number(m[2]) : null; };
const goat = (vad: string, titel: string) => `data-goatcounter-click="planera:${esc(data.id)}:${vad}" data-goatcounter-title="${esc(data.titel)}: ${esc(titel)}"`;
function passetsRuta(p: Pass | undefined, oppna: Set<string>, mitt = ''): string {
  const roller = p ? rollerFor(p) : [];
  const tabell = roller.find((r) => r.tabell)?.tabell;
  const egna = tabell?.delar?.length ? tabell : undefined;
  const delar = egna ? egna.delar! : data.passet?.delar ?? [];
  if (!delar.length && !roller.length) return '';
  const tid = p ? passetsTid(aktiv.val, p) : undefined;
  const slut = Math.max(0, ...delar.map((d) => fasTill(d.tid) ?? 0));
  const klockslag = !!tid && slut > 0 && minutAv(tid[1]) - minutAv(tid[0]) === slut;
  const tidFor = (t: string) => { const f = fasFran(t); return klockslag && f !== null ? tidText(plusMinuter(tid![0], f)) : t.replace(/\u2060/g, '').replace(/\s*min$/, ''); };
  const stegFor = (fas: string) => (egna ? undefined : data.passet?.steg?.rader.find((s) => s.namn.toLowerCase() === fas.toLowerCase()));
  const rad = (nyckel: string, tidtext: string, namn: string, inne: string) => `<details class="pl-del" data-ruta="del-${nyckel}"${oppna.has(`del-${nyckel}`) ? ' open' : ''}><summary><span class="pl-deltid">${esc(tidtext)}</span><span class="pl-delnamn">${esc(namn)}</span></summary><div class="pl-deltext">${inne}</div></details>`;
  const fore = [
    ...(egna?.fore ?? []).map((f) => `<p><span class="pl-etikett">${esc(f.nar)}</span>${lankad(mening(f.vad))}</p>`),
    // Tidsschemats förberedelse säger det som gäller just passet (i pass 2 ett blad till varje par), och checklistan står
    // efter med sin rubrik när den gäller varje pass (Codex 2026-10-25: checklistan ensam tappade förberedelser).
    ...(!egna && data.passet?.fore ? [`<p>${lankad(mening(data.passet.fore))}</p>`] : []),
    ...(!data.forstaChecklista && data.checklista.length ? [`${data.checklistaRubrik ? `<p class="pl-checkrubrik">${esc(data.checklistaRubrik)}</p>` : ''}<ol class="pl-checklista">${data.checklista.map((x) => `<li>${lankad(x)}</li>`).join('')}</ol>`] : []),
  ];
  const rader = [
    ...(fore.length ? [rad(egna ? 'egen-fore' : 'fore', '', 'Före passet', fore.join(''))] : []),
    ...delar.map((d, i) => {
      const s = stegFor(d.fas);
      const fraser = s?.fraser.length ? `<ul class="pl-fraser">${s.fraser.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
      return rad(`${egna ? 'egen-' : ''}${i}`, tidFor(d.tid), d.fas, `<p>${lankad(mening(d.vad))}</p>${fraser}`);
    }),
    // En rad utan minuter, som "Hemma, cirka 20 min": ordet före kommat i tidens spalt och resten efter delens namn.
    ...(!egna ? (data.passet?.andra ?? []).map((r, i) => { const [forst, ...rest] = r.tid.split(','); return rad(`andra-${i}`, forst.trim(), [r.fas, ...rest.map((x) => x.trim())].join(', '), `<p>${lankad(mening(r.vad))}</p>`); }) : []),
    ...(data.passet?.efter ? [rad('efter', '', 'Efter passet', `<p>${lankad(mening(data.passet.efter))}</p>`)] : []),
  ];
  const namn = p ? `<p class="pl-passnamn">Pass ${p.nr} av ${plan.pass.length}${rollNamn(p) ? ` · ${esc(rollNamn(p))}` : ''}</p>` : '';
  // Rollens text utan namnet före kolon, när namnet redan står i passets namn ("Du tänker högt: du läser högt …").
  const utanNamnet = (r: (typeof roller)[number]) => { const k = r.kort ?? ''; return k && r.text.toLowerCase().startsWith(`${k.toLowerCase()}:`) ? stor(r.text.slice(k.length + 1).trim()) : r.text; };
  const roll = roller.map((r) => `<p class="pl-roll">${lankad(mening(utanNamnet(r)))}</p>`).join('');
  const tabellRad = tabell ? `<p class="pl-not">${egna ? 'Delarna står i metodens tabell' : 'Passet står i metodens tabell'} <a href="${esc(tabell.adress)}" ${goat('passets-tabell', 'passets tabell från planen')}>${esc(tabell.namn)}</a>.</p>` : '';
  const rubrik = egna ? 'Passets delar' : data.passet?.rubrik ?? 'Passets delar';
  if (!egna && data.passet?.not) rader.push(rad('mer', '', 'Mer om passet', `<p>${lankad(mening(data.passet.not))}</p>`));
  const inledning = !egna && data.passet?.text ? `<p class="pl-not pl-delinledning">${lankad(mening(data.passet.text))}</p>` : '';
  return `${namn}${roll}${tabellRad}${mitt}${rader.length ? `<div class="pl-delar"><p class="pl-delrubrik">${esc(stor(rubrik))}${klockslag ? ', med passets klockslag' : ''}</p>${inledning}${rader.join('')}</div>` : ''}`;
}

// Nivåns rad i en tabell med veckorna och nivåerna, som Talen och bladen i veckorna i De fyra räknesätten (de kalla
// testarna 2026-10-24: passets tal och veckans blad saknades i planen).
function nivansRad(v: PlanVecka): string {
  const t = data.nivaTabell, nivaer = data.nivaer ?? [];
  if (!t || !nivaer.length) return '';
  const niva = nivaer.find((n) => n.slug === aktiv.val.niva);
  if (!niva) return `<div class="pl-nivaval"><p class="pl-not">Välj gruppens nivå, så visar veckan nivåns rad i ${esc(t.rubrik)}.</p><div class="sk-nivaknappar pl-nivaer">${nivaer.map((n) => `<button type="button" class="sk-niva" data-valj-niva="${esc(n.slug)}" style="--niva:${esc(n.farg)}" aria-pressed="false">${esc(n.namn)}</button>`).join('')}</div></div>`;
  const cell = t.veckor[String(v.innehall)]?.[niva.slug];
  if (!cell) return '';
  return `<div class="pl-nivans" style="--niva:${esc(niva.farg)}"><p class="pl-etikett"><a href="${esc(t.adress)}" ${goat('nivans-rad', 'nivåns tal från planen')}>${esc(t.rubrik)}</a> · ${esc(niva.namn)}</p>${cell.split('\n').map((x) => `<p>${lankad(mening(x))}</p>`).join('')}</div>`;
}

// Det som finns i metoden i stunden: passet på metodens sida, stödet när eleven fastnar och metodens verktyg.
function metodensLankar(): string {
  const lankar: [string, string, string, boolean][] = [
    ...(data.passet ? [[data.passet.adress, 'Passet i metoden', 'passet', false] as [string, string, string, boolean]] : []),
    ...(data.fastnar ?? []).map((f): [string, string, string, boolean] => [f.adress, f.rubrik, 'fastnar', false]),
    ...(data.centrala ?? []).map((c): [string, string, string, boolean] => [c.adress, c.namn, 'central', c.pdf]),
  ];
  return lankar.length ? `<p class="pl-lankar">${lankar.map(([a, t, vad, pdf]) => `<a href="${esc(a)}"${pdf ? ' target="_blank" rel="noopener"' : ''} ${goat(vad, `${t} från planen`)}>${esc(t)}</a>`).join('<span aria-hidden="true"> · </span>')}</p>` : '';
}

// Passet i kalenderns händelse: rollen och delarna med minuter (de kalla testarna 2026-10-24: kalendern hade bara första
// meningen ur veckans fokus).
const passetIKalendern = (p: Pass) => {
  const roller = rollerFor(p);
  const delar = roller.find((r) => r.tabell?.delar?.length)?.tabell?.delar ?? data.passet?.delar ?? [];
  return [roller.map((r) => mening(r.text)).join(' '), delar.length ? `Passet: ${delar.map((d) => `${d.fas} ${d.tid.replace(/\u2060/g, '').replace(/\s*min$/, '')}`).join(', ')}.` : ''].filter(Boolean).join('\n');
};

// Före första passet: kartläggningen eller förtestet, det andra metoden gör före start och checklistan inför första passet,
// med minuterna för gruppen, principerna och gruppen (betan 2026-10-24: de kalla testarna fann det på första passets dag).
const harFore = () => uppfoljningensTillfallen(plan).some((x) => x.vecka === 0) || !!data.fore?.length || (data.forstaChecklista && data.checklista.length > 0);
const tidForGruppen = (rad: number) => {
  const per = data.uppfoljning.rader[rad]?.perElev;
  if (per === undefined) return '';
  const [a, b] = Array.isArray(per) ? per : [per, per];
  const n = harElever() ? aktiv.foljd.elever.length : 0;
  const spann = (x: number, y: number) => (x === y ? `${x}` : `${x}–${y}`);
  return n ? `En elev i taget utanför passen, cirka ${spann(a * n, b * n)} minuter för ${n === 1 ? 'en elev' : `${n} elever`}.` : `En elev i taget utanför passen, ${spann(a, b)} minuter per elev.`;
};
function foreDelar(oppna: Set<string>): string[] {
  lankVecka = plan.veckor[0]?.innehall;
  const fredag = plusDagar(plan.fore.mandag, 4);
  const meta = [`v. ${isoVecka(plan.fore.mandag).vecka}`, ...(aktiv.namn ? [aktiv.namn] : []), ...(nivaNamn() ? [nivaNamn()!] : [])];
  const delar: string[] = [`<header class="pl-veckohuvud"><h2 id="pl-veckan-rubrik" tabindex="-1">Före första passet</h2><p class="meta">${meta.map(esc).join(' · ')}</p></header>`, remsa('fore')];
  const forstaP = [...plan.pass].sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.nr - b.nr))[0];
  const forsta = forstaP ? `${dagText(forstaP.datum)}${passetsTid(aktiv.val, forstaP) ? ` kl. ${tidText(passetsTid(aktiv.val, forstaP)![0])}` : ''}` : '';
  const nartid = idag > fredag ? `Gör det före första passet, ${forsta}.`
    : plan.fore.overLov ? `Veckan före första passet är lov, så gör det veckan före lovet, ${spannKort(plan.fore.mandag, fredag)}. Första passet är ${forsta}.`
    : `Gör det veckan före första passet, ${spannKort(plan.fore.mandag, fredag)}. Första passet är ${forsta}.`;
  const material = [...filnamn().filter((n) => n.startsWith('lektionskort')).map(plats), plats('lathund')].filter(Boolean);
  delar.push(`<div class="pl-nasta pl-forerutan"><span class="pl-etikett">Före start</span><p class="pl-nar">${esc(nartid)}</p>${material.length ? `<p class="metod-centrala">${material.join('')}</p>` : ''}${metodensLankar()}</div>`);
  const saker = [
    ...uppfoljningensTillfallen(plan).filter((x) => x.vecka === 0).map((x) => `<li><span class="pl-etikett">${esc(nar(x.rad))}</span><p>${lankad(data.uppfoljning.rader[x.rad].vad)}</p>${tidForGruppen(x.rad) ? `<p class="pl-not">${esc(tidForGruppen(x.rad))}</p>` : ''}${resultatfalt(x.nyckel)}</li>`),
    ...(data.fore ?? []).map((t) => `<li><p>${lankad(mening(t))}</p></li>`),
  ];
  if (saker.length) delar.push(`<section class="pl-block"><h3>Det du gör före första passet</h3><ul class="pl-uppf">${saker.join('')}</ul></section>`);
  if (data.forstaChecklista && data.checklista.length) delar.push(`<section class="pl-block"><h3>${esc(data.checklistaRubrik ?? 'Före första passet')}</h3><ol class="pl-checklista">${data.checklista.map((x) => `<li>${lankad(x)}</li>`).join('')}</ol></section>`);
  if (data.principer) delar.push(`<section class="pl-block pl-principer"><h3>${esc(data.principer.rubrik)}</h3><p>${lankad(mening(data.principer.text))}</p></section>`);
  if (data.gruppen) delar.push(`<details class="pl-fallut" data-ruta="gruppen"${oppna.has('gruppen') ? ' open' : ''}><summary>${esc(data.gruppen.rubrik)}</summary><p>${lankad(mening(data.gruppen.text))}</p>${data.grupp ? `<p class="pl-not">Metoden: ${esc(data.grupp.text.charAt(0).toLocaleLowerCase('sv') + data.grupp.text.slice(1))}.</p>` : ''}</details>`);
  const forstaV = plan.veckor[0];
  delar.push(`<nav class="pl-bladdra" aria-label="Bläddra mellan veckorna"><span></span><button type="button" class="knapp sekundar liten" data-till="pl-planen">Hela planen</button>${forstaV ? `<button type="button" class="knapp sekundar liten" data-vy="${forstaV.nr}">${esc(rubrikVecka(forstaV))} ›</button>` : '<span></span>'}</nav>`);
  return delar;
}

// Rutorna som ska stå öppna efter nästa ritning, fast veckan som visas byts (Ändra veckan efter Upprepa veckan).
// Passet som rutan visar när läraren har valt ett annat pass i veckan än nästa.
let visatPass: number | undefined;

function veckansDelar(v: PlanVecka, oppna: Set<string>): string[] {
  const rad = radFor(v);
  lankVecka = v.innehall;
  const { fran: f, till: t } = veckansDagar(plan, v);
  const meta = [spannKort(f, t), ...(aktiv.namn ? [aktiv.namn] : []), ...(nivaNamn() ? [nivaNamn()!] : [])];
  const s = sammanstallning(plan, aktiv.foljd, idag);
  const nu = nuVy();
  const passen = v.pass.map((n) => plan.pass[n - 1]);
  const harVarit = plusDagar(v.mandag, 6) < idag;
  const delar: string[] = [`<header class="pl-veckohuvud"><h2 id="pl-veckan-rubrik" tabindex="-1">${esc(rubrikVecka(v))} i planen</h2><p class="meta">${meta.map(esc).join(' · ')}</p></header>`, remsa(v.nr)];
  // Före första passet står under Före, och vecka 1 säger det tills första passet har varit (Opus 2026-10-24).
  if (harFore() && plan.forstaPass && idag <= plan.forstaPass) delar.push(`<p class="pl-paminn">Det som görs före första passet står under Före. <button type="button" class="pl-textknapp" data-vy="fore">Till Före</button></p>`);

  // Nästa pass med passet och materialet, eller vad veckan är när läraren har bläddrat till en annan vecka (granskningen
  // 2026-10-24: nästa pass och den bläddrade veckan kunde gälla olika veckor).
  let etikett: string, text: string;
  // Passet som rutan gäller: nästa pass, eller veckans första. Ligger nästa pass i en senare vecka, som på helgen, gäller
  // rutan den veckan, och den säger det (Codex 2026-10-24: söndagen visade förra veckans texter till måndagen). Ett pass
  // som läraren har valt bland veckans pass står i rutan i stället.
  let rutansPass: Pass | undefined;
  const valt = visatPass !== undefined ? passen.find((p) => p.nr === visatPass) : undefined;
  const klockan = (p: Pass) => (passetsTid(aktiv.val, p) ? ` kl. ${tidText(passetsTid(aktiv.val, p)![0])}` : '');
  if (valt) {
    rutansPass = valt;
    etikett = valt.datum < idag ? 'Ett pass som har varit' : 'Ett pass i veckan';
    text = `${stor(dagText(valt.datum))}${klockan(valt)}`;
  } else if (nu === v.nr) {
    const nasta = nastaPass(plan, idag);
    rutansPass = nasta ?? undefined;
    etikett = 'Nästa pass';
    text = !nasta ? 'Insatsen är slut.'
      : nasta.nr === 1 && nasta.datum > idag ? `Första passet: ${dagText(nasta.datum)}${klockan(nasta)}`
      : `${stor(narText(nasta.datum, idag))}${nasta.datum === idag || nasta.datum === plusDagar(idag, 1) ? `, ${dagText(nasta.datum)}` : ''}${klockan(nasta)}`;
    if (nasta && nasta.vecka !== v.nr) text += `, ${rubrikVecka(plan.veckor[nasta.vecka - 1]).toLocaleLowerCase('sv')} i planen`;
  } else if (harVarit) {
    etikett = 'Veckan har varit';
    rutansPass = passen[0];
    text = passen.length ? `Pass ${passen[0].nr}${passen.length > 1 ? `–${passen[passen.length - 1].nr}` : ''}, ${spannKort(f, t)}` : 'Inga pass den veckan';
  } else {
    etikett = 'Veckans första pass';
    const forsta = [...passen].sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.nr - b.nr))[0];
    rutansPass = forsta;
    text = forsta ? `${stor(dagText(forsta.datum))}${klockan(forsta)}` : 'Inga pass den veckan';
  }
  const rutansVecka = rutansPass ? plan.veckor[rutansPass.vecka - 1] : v;
  const rutansRad = rutansPass && rutansPass.steg !== null && rutansPass.steg !== undefined ? data.progression?.rader[rutansPass.steg] : rad;
  const tillbaka = valt ? `<p><button type="button" class="pl-textknapp" data-visa-pass="">${nu === v.nr ? 'Till nästa pass' : 'Till veckans första pass'}</button></p>`
    : nu === 'fore' ? ''
    : nu !== v.nr ? `<p><button type="button" class="pl-textknapp" data-vy="nu">${nu === 'efter' ? 'Till Efter insatsen' : 'Till den här veckan'}</button></p>`
    : rutansVecka.nr !== v.nr ? `<p><button type="button" class="pl-textknapp" data-vy="${rutansVecka.nr}">Till ${esc(rubrikVecka(rutansVecka).toLocaleLowerCase('sv'))}</button></p>` : '';
  // Förra veckan utan bockar eller skattning säger till, med en väg dit (de kalla läsarna 2026-10-24: glömda veckor syntes
  // ingenstans).
  const forraVeckan = plan.veckor[v.nr - 2];
  let paminn = '';
  if (aktiv.folj && nu === v.nr && forraVeckan && harBorjat()) {
    const obockat = forraVeckan.pass.map((n) => plan.pass[n - 1]).filter((p) => p.datum < idag && !gjort(passetsDag(p))).length;
    const oskattad = !Object.keys(aktiv.foljd.skattning[forraVeckan.mandag] ?? {}).length;
    const delarna = [obockat ? `${obockat === 1 ? 'ett pass' : `${obockat} pass`} som inte är ${obockat === 1 ? 'bockat' : 'bockade'}` : '', oskattad ? 'ingen skattning' : ''].filter(Boolean);
    if (delarna.length) paminn = `<p class="pl-paminn pl-forra">Förra veckan har ${esc(uppraknat(delarna))}. <button type="button" class="pl-textknapp" data-vy="${forraVeckan.nr}">Till förra veckan</button></p>`;
  }
  const kursvecka = data.kursveckor?.[String(rutansVecka.innehall)];
  const material = [
    ...(data.bank ? [`<a class="knapp" href="${esc(data.bank.adress)}${aktiv.val.niva ? `#${esc(aktiv.val.niva)}` : ''}" ${goat('material', 'Ta fram från planen')}>${esc(data.bank.namn)}</a>`] : []),
    ...filnamn().filter((n) => n.startsWith('lektionskort')).map(plats),
    plats('lathund'),
    // Den som följer insatsen skriver veckan på sidan, så snabbmallen är material bland det andra (de kalla läsarna:
    // två ställen för veckans mening).
    ...(aktiv.folj ? [plats('snabbmall')] : []),
  ].filter(Boolean);
  // Hemmets del varje vecka, som läxan i De fyra räknesätten, när passets tidsschema inte redan har den (TIL:s Hemma).
  const hemma = data.hem && !data.passet?.andra.length ? `<p class="pl-hemma"><span class="pl-etikett">Hemma</span> <a href="${esc(data.hem.adress)}" ${goat('hemma', 'hemmet från planen')}>${esc(data.hem.rubrik)}</a></p><p>${lankad(mening(data.hem.text))}</p>` : '';
  lankVecka = rutansVecka.innehall;
  const ruta = passetsRuta(rutansPass, oppna, nivansRad(rutansVecka));
  if (!ruta && rutansPass && !harVarit) text += `, pass ${rutansPass.nr} av ${plan.pass.length}`;
  const veckansSida = kursvecka ? `<p class="metod-centrala"><a class="knapp" href="${esc(kursvecka)}" ${goat('kursvecka', 'veckans lektion från planen')}>Vecka ${rutansVecka.innehall} i metoden, med veckans manus</a></p>` : '';
  delar.push(`<div class="pl-nasta"><span class="pl-etikett">${etikett}</span><p class="pl-nar">${esc(text)}</p>${tillbaka}${paminn}${veckansSida}${ruta || nivansRad(rutansVecka)}${material.length ? `<p class="metod-centrala">${material.join('')}</p>` : ''}${veckansTexter(rutansRad, oppna, rutansVecka.nr !== v.nr ? rutansVecka : undefined)}${hemma}${metodensLankar()}</div>`);

  lankVecka = v.innehall;
  // Veckans pass, med passets roll, bockarna när läraren följer insatsen och, med närvaron, eleverna under ett bockat pass.
  // Ett annat pass än det i rutan visas i rutan med ett tryck på rollen.
  const passrader = [
    ...passen.map((p) => {
      const dag = passetsDag(p);
      const ar = gjort(dag);
      const borta = aktiv.foljd.franvaro[dag] ?? [];
      const narvaro = aktiv.folj && ar && narvaroPa() ? `<div class="pl-narvaro" role="group" aria-label="Vilka var med i pass ${p.nr}">${aktiv.foljd.elever.map((e) => { const med = !borta.includes(e.id); return `<button type="button" class="pl-chip pl-elev" data-narvaro="${esc(dag)}|${esc(e.id)}" aria-pressed="${med}" aria-label="${esc(e.namn)} ${med ? 'var med' : 'var inte med'}">${esc(e.namn)}</button>`; }).join('')}</div>` : '';
      // Veckans pass går att bocka från måndagen i passets vecka, också ett pass senare i veckan som blev av en annan dag,
      // utan att planen ändras (Niclas 2026-10-25: "Alltså från måndag 00.01 kan man bocka den veckas pass"). I en vecka som
      // inte har börjat står en streckad ring på bockens plats, så att raden ser likadan ut i alla veckor (samma natt: "Förut
      // fanns en bock för passen men nu hittar jag inte det").
      const veckanHarBorjat = mandagen(p.datum) <= idag;
      const senare = aktiv.folj && !ar && !veckanHarBorjat ? `<span class="pl-bock senare" title="Går att bocka från ${esc(dagText(mandagen(p.datum)))}"></span>` : '<span></span>';
      const bock = aktiv.folj && (veckanHarBorjat || ar) ? `<button type="button" class="pl-bock${ar ? ' ja' : ''}" data-bock="${esc(dag)}" aria-pressed="${ar}" aria-label="Pass ${p.nr} blev av"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12.5l3.7 3.7 7.3-8"/></svg></button>` : senare;
      const info = [passetsTidText(p), p.flyttatFran ? `Flyttat från ${dagText(p.flyttatFran)}` : ''].filter(Boolean).join(' · ');
      const roll = rollNamn(p);
      const iRutan = rutansPass?.nr === p.nr;
      const visa = roll ? (iRutan ? `<span class="pl-passroll">${esc(roll)}</span>` : `<button type="button" class="pl-textknapp pl-passroll" data-visa-pass="${p.nr}" aria-label="Visa pass ${p.nr}, ${esc(roll)}, i rutan">${esc(roll)}</button>`) : '';
      return { datum: p.datum, html: `<li class="${p.datum === idag ? 'idag' : ''}${ar ? ' gjort' : ''}${iRutan && roll ? ' i-rutan' : ''}"><span class="pl-dag">${esc(kortDag(p.datum))}<small>Pass ${p.nr}${p.datum === idag ? ' · i dag' : ''}</small></span><span class="pl-passinfo">${visa}${info ? `<span>${esc(info)}</span>` : ''}</span>${bock}${narvaro}</li>` };
    }),
    ...v.bortfall.map((b) => ({ datum: b.datum, html: `<li class="bort"><span class="pl-dag">${esc(kortDag(b.datum))}<small>Inget pass</small></span><span class="pl-passinfo">${b.varfor === 'helgdag' ? esc(stor(b.namn ?? 'helgdag')) : 'Inställt'}</span>${b.varfor === 'installt' ? `<button type="button" class="pl-textknapp" data-angra="${esc(b.datum)}">Ångra</button>` : '<span></span>'}</li>` })),
  ].sort((a, b) => (a.datum < b.datum ? -1 : 1));
  const obockade = aktiv.folj ? passen.filter((p) => p.datum <= idag && !gjort(passetsDag(p))) : [];
  // Knappen säger vad den gör: också dagens pass (de kalla läsarna 2026-10-24).
  const alla = obockade.length >= 2 ? '<p class="pl-andra-knappar"><button type="button" class="knapp sekundar liten" data-gor="alla">Bocka veckans pass till och med i dag</button></p>' : '';
  // Hjälpraden står tills läraren har bockat ett första pass. I en vecka som inte har börjat säger den när passen går att
  // bocka, och den står där varje gång.
  const veckanBorjat = passen.some((p) => mandagen(p.datum) <= idag);
  const hjalp = !aktiv.folj ? ''
    : !veckanBorjat && passen.length ? '<p class="pl-not">Passen går att bocka när veckan har börjat.</p>'
    : !aktiv.foljd.gjorda.length ? `<p class="pl-not">Bocka passen som blev av, också ett pass som blev av en annan dag i veckan.${narvaroPa() ? ' Under ett bockat pass trycker du på den som inte var med.' : ''}</p>` : '';
  const foljtips = !aktiv.folj && aktiv.sparad ? `<p class="pl-not pl-foljtips">Vill du bocka passen och skatta eleverna mot målet varje vecka? <button type="button" class="pl-textknapp" data-gor="folj">Följ insatsen</button></p>` : '';
  delar.push(`<section class="pl-block" id="pl-passen"><h3>Veckans pass</h3><ol class="pl-passlista">${passrader.map((x) => x.html).join('')}</ol>${alla}${hjalp}${foljtips}</section>`);

  // Veckans fokus ur progressionen. En rad som gäller flera veckor säger att fokus är detsamma som förra veckan (de kalla
  // testarna 2026-10-24: vecka 4 och 5 var lika utan förklaring).
  const iPass = !rad && data.progression?.enhet?.toLowerCase() === 'pass';
  const forraV = plan.veckor[v.nr - 2];
  const samma = !!forraV && !v.igen && radernaI(forraV).length > 0 && radernaI(forraV).map((r) => r.vecka).join() === radernaI(v).map((r) => r.vecka).join();
  const metodensVecka = (plan.borja ?? 1) > 1 && !iPass ? `Metodens vecka ${v.innehall}` : '';
  for (const r of radernaI(v)) delar.push(`<div class="pl-fokusruta">${iPass || r.led || metodensVecka ? `<p class="pl-led">${[iPass ? `Pass ${esc(r.vecka.replace(/^pass\s+/i, ''))}` : '', metodensVecka, r.led ? lankad(r.led) : ''].filter(Boolean).join(' · ')}</p>` : ''}<span class="pl-etikett">${iPass ? 'Passens fokus' : 'Veckans fokus'}</span>${samma ? `<p class="pl-not">Samma fokus som ${esc(rubrikVecka(forraV).toLocaleLowerCase('sv'))}: metodens rad gäller ${iPass ? 'pass' : 'vecka'} ${esc(r.vecka)}.</p>` : ''}<p>${lankad(mening(r.fokus))}</p><span class="pl-etikett">Det du gör</span><p>${lankad(mening(r.roll))}</p></div>`);
  // Metodens principer, hopfällda, där läraren är när något går snett (Opus 2026-10-24).
  if (data.principer) delar.push(`<details class="pl-fallut" data-ruta="principer"${oppna.has('principer') ? ' open' : ''}><summary>${esc(data.principer.rubrik)}</summary><p>${lankad(mening(data.principer.text))}</p></details>`);
  // Metodens uppföljning den här veckan, och det som görs varje vecka eller i varje pass. När läraren följer insatsen med
  // en elevlista får varje tillfälle med datum ett fält per elev för resultatet.
  const tillfallen = uppfoljningensTillfallen(plan).filter((x) => x.vecka === v.nr);
  if (tillfallen.length) delar.push(`<section class="pl-block"><h3>Metodens uppföljning den här veckan</h3><ul class="pl-uppf">${tillfallen.map(uppfRad).join('')}</ul></section>`);
  const lopande = plan.uppfoljning.filter((u) => u.typ === 'lopande');
  if (lopande.length && !aktiv.folj) delar.push(`<details class="pl-fallut" data-ruta="lopande"${oppna.has('lopande') ? ' open' : ''}><summary>Metodens uppföljning ${esc(uppraknat(lopande.map((u) => nar(u.rad).toLocaleLowerCase('sv'))))}</summary><ul class="pl-uppf">${lopande.map((u) => `<li><p>${lankad(data.uppfoljning.rader[u.rad].vad)}</p></li>`).join('')}</ul></details>`);
  const villkor = plan.uppfoljning.filter((u) => u.typ === 'villkor');
  if (villkor.length) delar.push(`<section class="pl-block"><h3>Håll koll på</h3><ul class="pl-uppf">${villkor.map((u) => `<li><span class="pl-etikett">${esc(nar(u.rad))}</span><p>${lankad(data.uppfoljning.rader[u.rad].vad)}</p></li>`).join('')}</ul></section>`);

  // Skattningen mot målet, en gång i veckan, efter veckans innehåll (de kalla testarna 2026-10-24: skattningen stod före
  // passet och fokus), och om läraren vill hur veckan gick för gruppen. Inget måste fyllas i.
  if (aktiv.folj) {
    const fragan = skattningsfragan(!harElever());
    const veckans = aktiv.foljd.skattning[v.mandag] ?? {};
    const gang = aktiv.foljd.vecka[v.mandag];
    // Underlaget: metodens uppföljning varje vecka, hopfälld vid skattningen (de kalla läsarna: "jag visste inte vad
    // skattningen skulle bygga på").
    const lopandeHar = plan.uppfoljning.filter((u) => u.typ === 'lopande');
    const underlag = lopandeHar.length ? `<details class="pl-fallut pl-underlag" data-ruta="underlag"${oppna.has('underlag') ? ' open' : ''}><summary>Det du bygger skattningen på</summary>${lopandeHar.map((u) => `<p>${lankad(mening(data.uppfoljning.rader[u.rad].vad))}</p>`).join('')}</details>` : '';
    delar.push(`<section class="pl-block pl-folj" id="pl-skatta"><h3>${harElever() ? 'Skatta eleverna' : 'Skatta gruppen'}</h3>${malRad('veckan', false)}<p class="pl-fraga">${esc(fragan)}</p>${lopandeHar.length ? `<p class="pl-not">Skatta i slutet av veckan, efter det du har sett och hört i passen.</p>` : ''}<ul class="pl-skalnamn" aria-hidden="true">${SKALAN.map((x, i) => `<li><b>${i + 1}</b> ${esc(x)}</li>`).join('')}</ul>
      <ul class="pl-skattning">${vem().map((e) => `<li>${namnknapp('skatta', e)}${skala(`data-skatta="${esc(v.mandag)}|${esc(e.id)}" data-steg`, veckans[e.id], `${e.namn}: ${fragan}`)}${utvecklingsruta('skatta', s.elever.find((x) => x.id === e.id), s)}</li>`).join('')}</ul>
      <p class="pl-not pl-utv-tips">${harElever() ? 'Tryck på ett namn, så ser du elevens utveckling.' : 'Tryck på Gruppen, så ser du gruppens utveckling.'}${harSamman(s) ? ' <button type="button" class="pl-textknapp" data-till="pl-samman">Hela gruppens sammanställning</button>' : ''}</p>${underlag}
      <details class="pl-gang" data-ruta="gang"${gang?.varde || gang?.not || oppna.has('gang') ? ' open' : ''}><summary>Hur gick veckan för gruppen, om du vill</summary><div class="pl-gangval" role="group" aria-label="Hur gick veckan för gruppen">${GANG.map((x, i) => `<button type="button" class="pl-chip" data-gang="${esc(v.mandag)}" data-varde="${i + 1}" aria-pressed="${gang?.varde === i + 1}">${x}</button>`).join('')}</div><label class="pl-etikett" for="pl-veckonot">En mening om veckan</label><input class="pl-falt pl-brett" type="text" id="pl-veckonot" maxlength="200" data-veckonot="${esc(v.mandag)}" value="${esc(gang?.not ?? '')}" /><p class="pl-hjalp">Meningen står i sammanställningen och i texten som kopieras, utan elevernas namn.</p></details></section>`);
  }
  // Avstämningen mitt i insatsen: varje elevs riktning från första till senaste skattningen, och ett beslut.
  if (aktiv.folj && v.nr === s.mitt && v.nr !== plan.veckor.length) {
    const beslut = aktiv.foljd.avstamning?.beslut;
    delar.push(`<section class="pl-stam"><h3>Avstämning mitt i insatsen</h3><p>Rör sig ${harElever() ? 'eleverna' : 'gruppen'} mot målet? Jämför skattningarna hittills.</p>${riktningar(s, 'stam')}<span class="pl-etikett">Beslut</span>${beslutsknappar('avstamning', ['fortsatt', 'justera'])}${beslut === 'justera' ? justeraText() : ''}${meningsfalt('pl-stam-not', 'En mening om avstämningen, om du vill', 'data-beslutsnot="avstamning"', aktiv.foljd.avstamning?.not ?? '')}</section>`);
  }

  // Efter veckan: metodens grund för att ta veckan en gång till, med knappen, och snabbmallen för den som bara planerar (de
  // kalla testarna 2026-10-24: Läslistor byter lista först när paren läser orden direkt).
  const kanLov = passen.every((p) => p.datum >= idag) && !harVarit;
  const forslagFlytta = [...passen].sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.nr - b.nr)).find((p) => p.datum >= idag && !gjort(passetsDag(p))) ?? passen[passen.length - 1];
  const forslagDag = forslagFlytta ? [1, 2, 3, 4].map((i) => plusDagar(forslagFlytta.datum, i)).find((d) => d <= plusDagar(v.mandag, 4) && veckodag(d) <= 5 && !helgdag(d)) : undefined;
  const kanUpprepa = !harVarit;
  const upprepaKnapp = `<button type="button" class="knapp sekundar liten" data-gor="upprepa" ${goat('upprepa', 'veckan upprepad')}>Upprepa veckan</button>`;
  const efterVeckan = [
    data.upprepa && kanUpprepa ? `<p>${lankad(mening(data.upprepa))}</p><p class="pl-andra-knappar">${upprepaKnapp}</p>` : '',
    plats('snabbmall') && !aktiv.folj ? `<p>Skriv i snabbmallen vad du såg och vad ni gör nästa vecka.</p><p class="metod-centrala">${plats('snabbmall')}</p>` : '',
  ].filter(Boolean);
  if (efterVeckan.length) delar.push(`<section class="pl-block"><h3>Efter veckan</h3>${efterVeckan.join('')}</section>`);

  // Ändra veckan: bara det som inte skriver om det som har varit (granskningen 2026-10-24: ett lov i en vecka som har
  // varit tog bort dess bockar). Lov när inget pass i veckan har varit, upprepa medan veckan pågår, flytta alltid.
  // Upprepa veckan står under Efter veckan när metoden säger när veckan tas om, så att knappen finns på ett ställe.
  const upprepaHar = kanUpprepa && !data.upprepa;
  const knappar = [
    upprepaHar ? upprepaKnapp : '',
    v.igen && kanUpprepa ? '<button type="button" class="knapp sekundar liten" data-gor="ta-bort-upprepning">Ta bort upprepningen</button>' : '',
    kanLov ? `<button type="button" class="knapp sekundar liten" data-gor="lov" ${goat('lov', 'lov i planen')}>Lov den här veckan</button>` : '',
    passen.length ? '<button type="button" class="knapp sekundar liten" data-gor="flytta" aria-expanded="false" aria-controls="pl-flytta">Flytta eller ställ in ett pass</button>' : '',
  ].filter(Boolean);
  if (knappar.length) {
    const vad = [upprepaHar ? 'upprepa' : '', kanLov ? 'lov' : '', 'flytta ett pass'].filter(Boolean);
    delar.push(`<details class="pl-fallut" data-ruta="andra-veckan"${oppna.has('andra-veckan') ? ' open' : ''}><summary>${vad.length > 1 ? `Ändra veckan: ${esc(uppraknat(vad).replace(' och ', ' eller '))}` : 'Flytta eller ställ in ett pass'}</summary>${upprepaHar ? '<p class="pl-not">Behöver gruppen mer tid tar ni samma vecka en gång till, och resten av planen flyttas fram.</p>' : ''}<p class="pl-andra-knappar">${knappar.join('')}</p>
      <div class="pl-flytta" id="pl-flytta" hidden><label class="pl-etikett" for="pl-flytta-pass">Passet</label><select class="pl-falt" id="pl-flytta-pass">${passen.map((p) => `<option value="${esc(passetsDag(p))}"${p.nr === forslagFlytta?.nr ? ' selected' : ''}>Pass ${p.nr}, ${esc(dagText(p.datum))}</option>`).join('')}</select><label class="pl-etikett" for="pl-flytta-dag">Ny dag</label><select class="pl-falt" id="pl-flytta-dag">${[0, 1, 2, 3, 4].map((i) => plusDagar(v.mandag, i)).filter((d) => !helgdag(d)).map((d) => `<option value="${d}"${d === forslagDag ? ' selected' : ''}>${esc(stor(dagText(d)))}</option>`).join('')}</select><p class="pl-andra-knappar"><button type="button" class="knapp liten" data-gor="flytta-klar" ${goat('flytta', 'ett pass flyttat')}>Flytta passet</button><button type="button" class="knapp sekundar liten" data-gor="stall-in">Ställ in passet</button></p></div></details>`);
  }
  const forra = plan.veckor[v.nr - 2], nasta = plan.veckor[v.nr];
  const bakat = forra ? `<button type="button" class="knapp sekundar liten" data-vy="${forra.nr}">‹ ${esc(rubrikVecka(forra))}</button>` : harFore() ? '<button type="button" class="knapp sekundar liten" data-vy="fore">‹ Före</button>' : '<span></span>';
  delar.push(`<nav class="pl-bladdra" aria-label="Bläddra mellan veckorna">${bakat}<button type="button" class="knapp sekundar liten" data-till="pl-planen">Hela planen</button>${nasta ? `<button type="button" class="knapp sekundar liten" data-vy="${nasta.nr}">${esc(rubrikVecka(nasta))} ›</button>` : '<button type="button" class="knapp sekundar liten" data-vy="efter">Efter insatsen ›</button>'}</nav>`);
  return delar;
}

// Veckans poster i banken, nivåns texter eller problem med veckans taggar, hopfällda i rutan med nästa pass, bredvid
// verktyget (granskningen 2026-10-24: urvalet stod långt ned). Läraren väljer; planen föreslår ingen ordning.
function veckansTexter(rad: ReturnType<typeof radFor>, oppna: Set<string>, annan?: PlanVecka) {
  if (!data.bank || !rad?.taggar?.length) return '';
  const namn = rad.taggar.map((x) => data.bank!.taggar[x] ?? x);
  const niva = data.bank.nivaer.find((n) => n.slug === aktiv.val.niva);
  const rubrik = annan ? `${esc(stor(data.bank.flera))} till ${esc(rubrikVecka(annan).toLocaleLowerCase('sv'))}` : `Veckans ${esc(data.bank.flera)}`;
  if (!niva) return `<div class="pl-nivaval"><p class="pl-not">Välj nivå, så visar veckan nivåns ${esc(data.bank.flera)} med ${namn.length > 1 ? 'slagen' : 'slaget'} ${esc(namn.join(', '))}.</p><div class="sk-nivaknappar pl-nivaer">${data.bank.nivaer.map((n) => `<button type="button" class="sk-niva" data-valj-niva="${esc(n.slug)}" style="--niva:${esc(n.farg)}" aria-pressed="false">${esc(n.namn)}</button>`).join('')}</div></div>`;
  const poster = niva.poster.filter((p) => p.taggar.some((x) => rad.taggar!.includes(x)));
  if (!poster.length) return `<p class="pl-not">${rubrik}: nivån ${esc(niva.namn)} har inga ${esc(data.bank.flera)} med ${esc(namn.join(', '))}.</p>`;
  const lista = poster.map((p) => `<li><a href="${esc(data.sida)}/${esc(p.id)}">${p.nr} ${esc(p.titel)}</a><span class="pl-taggar">${esc(p.taggar.map((x) => data.bank!.taggar[x] ?? x).join(', '))}</span><a class="pl-visa" href="${esc(data.bank!.adress)}#${esc(p.id)}" data-goatcounter-click="planera:${esc(data.id)}:post" data-goatcounter-title="${esc(data.titel)}: en post från planen i Ta fram">Visa stort</a></li>`);
  return `<details class="pl-fallut pl-veckans" data-ruta="texter"${oppna.has('texter') ? ' open' : ''}><summary>${rubrik}, ${esc(niva.namn)}: ${poster.length} ${esc(poster.length === 1 ? data.bank.en : data.bank.flera)} med ${namn.length > 1 ? 'slagen' : 'slaget'} ${esc(namn.join(', '))}</summary><p class="pl-not">Välj en till varje pass, efter det du hör i gruppen.</p><ul class="pl-poster">${lista.join('')}</ul></details>`;
}

// Efter insatsen: metodens uppföljning efter, utvärderingen och vägen till sammanställningen (granskningarna 2026-10-24:
// efter sista passet visade sidan fortfarande undervisningsveckan och materialet).
function efterDelar(): string[] {
  lankVecka = undefined;
  const s = sammanstallning(plan, aktiv.foljd, idag);
  const efter = efterUppfoljning();
  const datum = efter.flatMap((u) => u.tillfallen.map((x) => x.datum)).sort()[0] ?? plan.efter;
  const meta = [`v. ${isoVecka(datum).vecka}`, ...(aktiv.namn ? [aktiv.namn] : []), ...(nivaNamn() ? [nivaNamn()!] : [])];
  const slut = !!plan.sistaPass && idag > plan.sistaPass;
  const delar = [`<header class="pl-veckohuvud"><h2 id="pl-veckan-rubrik" tabindex="-1">Efter insatsen</h2><p class="meta">${meta.map(esc).join(' · ')}</p></header>`, remsa('efter')];
  const sista = plan.sistaPass ? `Sista passet ${slut ? 'var' : 'är'} ${dagText(plan.sistaPass)}.` : '';
  delar.push(`<div class="pl-nasta"><span class="pl-etikett">${slut ? 'Insatsen är slut' : 'Efter sista passet'}</span><p class="pl-nar">${esc(sista)}</p>${nuVy() !== 'efter' ? '<p><button type="button" class="pl-textknapp" data-vy="nu">Till den här veckan</button></p>' : ''}${aktiv.folj && slut ? '<p><button type="button" class="pl-textknapp" data-till="pl-samman">Till sammanställningen</button></p>' : ''}</div>`);
  // Det som kommer efter insatsen i metodens progression, som nästa period i Läslistor i grupp (de kalla testarna
  // 2026-10-24: nästa period stod som veckans fokus i vecka 8).
  const efterRad = plan.efterSteg !== undefined ? data.progression?.rader[plan.efterSteg] : undefined;
  if (efterRad) delar.push(`<div class="pl-fokusruta"><span class="pl-etikett">Efter insatsen i metoden</span><p>${lankad(mening(efterRad.fokus))}</p><p>${lankad(mening(efterRad.roll))}</p></div>`);
  const tillfallen = uppfoljningensTillfallen(plan).filter((x) => x.vecka === null);
  if (tillfallen.length) delar.push(`<section class="pl-block"><h3>Metodens uppföljning efter insatsen</h3><ul class="pl-uppf">${tillfallen.map(uppfRad).join('')}</ul></section>`);
  if (aktiv.folj) {
    const valt = aktiv.foljd.utvardering?.beslut;
    // Förläng insatsen förlänger planen med det läraren väljer här (granskningen: beslutet lät som en ändring men gjorde ingen).
    // Planen förlängs högst till sin största längd, så att länken alltid går att läsa (Codex 2026-10-24).
    const kan = [1, 2, 3, 4].filter((n) => aktiv.val.langd + forlangSteg(n) <= LANGSTA);
    const forlang = valt !== 'forlang' ? '' : kan.length ? `<div class="pl-forlang"><span class="pl-etikett">Förläng planen med</span><div class="sk-segment">${kan.map((n) => `<button type="button" class="sk-antal" data-forlang="${n}">${esc(forlangText(n))}</button>`).join('')}</div></div>` : '<p class="pl-not">Planen kan inte bli längre. Gör en ny plan för fortsättningen.</p>';
    delar.push(`<section class="pl-stam"><h3>Utvärdering efter insatsen</h3>${malRad('efter')}<p>Når ${harElever() ? 'eleverna' : 'gruppen'} målet? Jämför skattningarna och metodens uppföljning före och efter.</p>${riktningar(s, 'efter', true)}<span class="pl-etikett">Beslut</span>${beslutsknappar('utvardering', ['avsluta', 'forlang', 'byt'])}${forlang}${meningsfalt('pl-utv-not', 'En mening om utvärderingen, om du vill', 'data-beslutsnot="utvardering"', aktiv.foljd.utvardering?.not ?? '')}</section>`);
  }
  const sistaV = plan.veckor[plan.veckor.length - 1];
  delar.push(`<nav class="pl-bladdra" aria-label="Bläddra mellan veckorna"><button type="button" class="knapp sekundar liten" data-vy="${sistaV.nr}">‹ ${esc(rubrikVecka(sistaV))}</button><button type="button" class="knapp sekundar liten" data-till="pl-planen">Hela planen</button><span></span></nav>`);
  return delar;
}

// Till en annan vy: överst i veckan, med fokus på rubriken.
function tillVy(vy: Vy | undefined) {
  visa = vy;
  visatPass = undefined;
  renderaVeckan();
  renderaVeckor();
  $('pl-veckan').scrollIntoView({ block: 'start' });
  $('pl-veckan-rubrik')?.focus({ preventScroll: true });
}

// Veckans knappar: bocka, alla pass, närvaro, skattning, beslut, förlänga, upprepa, lov, flytta och ställa in, och bläddra.
$('pl-veckan').addEventListener('click', (e) => {
  const knapp = (e.target as Element).closest<HTMLButtonElement>('button');
  if (!knapp) return;
  const vy = visadVy();
  const v = typeof vy === 'number' ? plan.veckor[vy - 1] : undefined;
  const fokus = (valjare: string) => $('pl-veckan').querySelector<HTMLElement>(valjare)?.focus();
  const d = knapp.dataset;
  if (d.utveckling) {
    const k = `${aktiv.id}|${d.utveckling}`;
    if (utfallda.has(k)) utfallda.delete(k); else utfallda.add(k);
    renderaVeckan();
    fokus(`[data-utveckling="${d.utveckling}"]`);
    return;
  }
  if (d.elevpdf || d.elevtext) { void samman(knapp); return; }
  if (d.bock) {
    const dag = d.bock;
    andra(() => { aktiv.foljd.gjorda = gjort(dag) ? aktiv.foljd.gjorda.filter((x) => x !== dag) : [...aktiv.foljd.gjorda, dag].sort(); });
    fokus(`[data-bock="${dag}"]`);
    return;
  }
  if (d.narvaro) {
    const [dag, id] = d.narvaro.split('|');
    andra(() => { const f = aktiv.foljd.franvaro[dag] ?? []; aktiv.foljd.franvaro = { ...aktiv.foljd.franvaro, [dag]: f.includes(id) ? f.filter((x) => x !== id) : [...f, id] }; });
    fokus(`[data-narvaro="${dag}|${id}"]`);
    return;
  }
  if (d.skatta) {
    // Ett tryck på det valda steget tar bort skattningen.
    const [m, id] = d.skatta.split('|');
    const varde = Number(knapp.textContent);
    andra(() => { const vecka = { ...(aktiv.foljd.skattning[m] ?? {}) }; if (vecka[id] === varde) delete vecka[id]; else vecka[id] = varde; aktiv.foljd.skattning = { ...aktiv.foljd.skattning, [m]: vecka }; });
    fokus(`[data-skatta="${m}|${id}"][aria-label^="${varde},"]`);
    return;
  }
  if (d.gang) {
    const m = d.gang;
    const varde = Number(d.varde);
    andra(() => { const g = aktiv.foljd.vecka[m] ?? {}; aktiv.foljd.vecka = { ...aktiv.foljd.vecka, [m]: { ...g, varde: g.varde === varde ? undefined : varde } }; });
    fokus(`[data-gang="${m}"][data-varde="${varde}"]`);
    return;
  }
  if (d.valjNiva) {
    const niva = (data.bank?.nivaer ?? data.nivaer)?.find((n) => n.slug === d.valjNiva);
    andra(() => { aktiv.val.niva = d.valjNiva; }, niva ? `Nivån är ${niva.namn}. Den går att byta under Ändra planen.` : undefined);
    return;
  }
  if (d.beslut) {
    const [slag, beslut] = d.beslut.split('|') as ['avstamning' | 'utvardering', string];
    andra(() => { const fore = aktiv.foljd[slag]; aktiv.foljd = { ...aktiv.foljd, [slag]: { ...(fore ?? {}), beslut: fore?.beslut === beslut ? undefined : beslut } }; });
    fokus(`[data-beslut="${slag}|${beslut}"]`);
    return;
  }
  if (d.forlang) {
    const n = Number(d.forlang);
    if (aktiv.val.langd + forlangSteg(n) > LANGSTA) return;
    andra(() => { aktiv.val.langd += forlangSteg(n); visa = undefined; }, `Planen är ${forlangText(n)} längre.`, true);
    $('pl-veckan').scrollIntoView({ block: 'start' });
    return;
  }
  if (d.angra) { andra(() => { aktiv.val.stryk = (aktiv.val.stryk ?? []).filter((x) => x !== d.angra); }, 'Passet är tillbaka.'); return; }
  if (d.vy) { tillVy(d.vy === 'nu' ? undefined : d.vy === 'efter' || d.vy === 'fore' ? d.vy : Number(d.vy)); return; }
  // Ett annat pass i veckan i rutan, och tillbaka till nästa pass.
  if (d.visaPass !== undefined) {
    visatPass = d.visaPass ? Number(d.visaPass) : undefined;
    renderaVeckan();
    const ruta = $('pl-veckan').querySelector<HTMLElement>('.pl-nasta');
    ruta?.scrollIntoView({ block: 'start' });
    ruta?.querySelector<HTMLElement>('.pl-passnamn, .pl-nar')?.setAttribute('tabindex', '-1');
    ruta?.querySelector<HTMLElement>('.pl-passnamn, .pl-nar')?.focus({ preventScroll: true });
    return;
  }
  const gor = d.gor;
  if (gor === 'folj') {
    andra(() => { aktiv.folj = true; });
    bedOmVaraktig();
    ($('pl-andra') as HTMLDetailsElement).open = true;
    $('pl-elevruta').scrollIntoView({ block: 'center' });
    elevfalt.focus({ preventScroll: true });
    visaBesked('Du följer insatsen. Skriv eleverna här, en per rad, eller hoppa över och skatta gruppen.');
    return;
  }
  if (!gor || !v) return;
  if (['upprepa', 'ta-bort-upprepning', 'lov', 'flytta-klar', 'stall-in'].includes(gor)) haltOppen.add('andra-veckan');
  if (gor === 'alla') {
    const dagar = v.pass.map((n) => plan.pass[n - 1]).filter((p) => p.datum <= idag && !gjort(passetsDag(p))).map(passetsDag);
    andra(() => { aktiv.foljd.gjorda = [...new Set([...aktiv.foljd.gjorda, ...dagar])].sort(); }, `${stor(dagar.length === 2 ? 'två' : dagar.length === 3 ? 'tre' : String(dagar.length))} pass är bockade.`, true);
  } else if (gor === 'upprepa') andra(() => { aktiv.val.upprepa = [...(aktiv.val.upprepa ?? []), v.innehall]; visa = v.nr + 1; }, `Vecka ${v.innehall} tas en gång till, och resten av planen flyttas fram en vecka.`, true);
  else if (gor === 'ta-bort-upprepning') andra(() => { const u = [...(aktiv.val.upprepa ?? [])]; u.splice(u.indexOf(v.innehall), 1); aktiv.val.upprepa = u; visa = v.nr - 1; }, 'Upprepningen är borttagen.', true);
  else if (gor === 'lov') andra(() => { aktiv.val.lov = [...new Set([...(aktiv.val.lov ?? []), veckonyckel(v.mandag)])].sort(); }, `Vecka ${v.vecka.vecka} är lov. Planen flyttas fram en vecka.`, true);
  else if (gor === 'flytta') { const ruta = $('pl-flytta'); ruta.hidden = !ruta.hidden; knapp.setAttribute('aria-expanded', String(!ruta.hidden)); if (!ruta.hidden) $('pl-flytta-pass').focus(); }
  else if (gor === 'flytta-klar' || gor === 'stall-in') {
    const ursprung = $<HTMLSelectElement>('pl-flytta-pass').value;
    if (gor === 'stall-in') { andra(() => { const f = { ...(aktiv.val.flytta ?? {}) }; delete f[ursprung]; aktiv.val.flytta = f; aktiv.val.stryk = [...new Set([...(aktiv.val.stryk ?? []), ursprung])]; }, 'Passet är inställt.', true); return; }
    const ny = $<HTMLInputElement>('pl-flytta-dag').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ny)) { visaBesked('Välj den nya dagen.'); return; }
    // Passet flyttas inom sin vecka, så att veckans innehåll och numren står kvar (fältets gränser går att skriva förbi).
    if (ny < v.mandag || ny > plusDagar(v.mandag, 6)) { visaBesked(`Välj en dag i samma vecka, ${spannKort(v.mandag, plusDagar(v.mandag, 4))}.`); return; }
    if (veckodag(ny) > 5 || helgdag(ny)) { visaBesked('Den dagen har skolan stängt. Välj en annan dag.'); return; }
    andra(() => { aktiv.val.flytta = { ...(aktiv.val.flytta ?? {}), [ursprung]: ny }; if (ny === ursprung) delete aktiv.val.flytta![ursprung]; }, `Passet flyttas till ${dagText(ny)}.`, true);
  }
});
// Fälten i veckan: det läraren skriver står i planen direkt och sparas en stund efter sista tangenten, utan att veckan
// ritas om, så att ett fält till i samma stund inte tappar det första (Codex 2026-10-24).
let faltTimer = 0;
$('pl-veckan').addEventListener('input', (e) => {
  const falt = e.target as HTMLInputElement;
  const text = falt.value.trim();
  if (falt.dataset.resultat) {
    const [nyckel, id] = falt.dataset.resultat.split('|');
    aktiv.foljd.resultat = { ...aktiv.foljd.resultat, [nyckel]: { ...(aktiv.foljd.resultat[nyckel] ?? {}), [id]: text.slice(0, 40) } };
  } else if (falt.dataset.veckonot) {
    const m = falt.dataset.veckonot;
    aktiv.foljd.vecka = { ...aktiv.foljd.vecka, [m]: { ...(aktiv.foljd.vecka[m] ?? {}), not: text.slice(0, 200) } };
  } else if (falt.dataset.beslutsnot) {
    const slag = falt.dataset.beslutsnot as 'avstamning' | 'utvardering';
    aktiv.foljd = { ...aktiv.foljd, [slag]: { ...(aktiv.foljd[slag] ?? {}), not: text.slice(0, 200) } };
  } else return;
  window.clearTimeout(faltTimer);
  faltTimer = window.setTimeout(() => { faltTimer = 0; sparaTyst(); }, 400);
});
// Det som väntar på att sparas sparas nu: innan läraren byter plan, öppnar en kopia eller tar bort planen, och när sidan
// göms eller lämnas (Codex 2026-10-24: en mening som skrevs strax före ett byte hamnade i nästa plan).
function skrivVantande(avsluta = false) {
  if (redigering) uppdateraElevlistan(avsluta ? 'slut' : 'tyst');
  if (namnTimer) { window.clearTimeout(namnTimer); namnTimer = 0; if (!spara()) sparfel(); }
  if (faltTimer) { window.clearTimeout(faltTimer); faltTimer = 0; sparaTyst(); }
}
addEventListener('pagehide', () => skrivVantande());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') skrivVantande(); });
// Har den här fliken något som inte är sparat än: ett fält, gruppens namn eller elevlistan som läraren skriver i.
const harVantande = () => !!(faltTimer || namnTimer || elevTimer);

$('pl-veckor').addEventListener('click', (e) => {
  const bort = (e.target as Element).closest<HTMLButtonElement>('[data-lov-bort]');
  if (bort) { andra(() => { aktiv.val.lov = (aktiv.val.lov ?? []).filter((x) => x !== bort.dataset.lovBort); }, 'Lovet är borttaget, och planen flyttas tillbaka.', true); return; }
  const b = (e.target as Element).closest<HTMLButtonElement>('button[data-vy]');
  if (!b || (!aktiv.sparad && !aktiv.franLank)) return;
  tillVy(b.dataset.vy === 'efter' || b.dataset.vy === 'fore' ? b.dataset.vy : Number(b.dataset.vy));
});

// ---------- Sammanställningen ----------
const info = () => ({ titel: data.titel, mal: aktivtMal(), uppfoljning: data.uppfoljning.rader });
let senaste: Sammanstallning = sammanstallning(plan, aktiv.foljd, idag);
const pdfInfo = () => ({ metod: data.titel, grupp: aktiv.namn || undefined, niva: nivaNamn(), mal: malText(aktivtMal()), fragan: skattningsfragan(!harElever()), uppfoljning: data.uppfoljning.rader, beslut: BESLUT as Record<string, string> });
// En knapp som ger en pdf heter Skriv ut där webbläsaren kan skriva ut den direkt, och annars "som pdf", som
// utskriftsknapparna på resten av sajten (SkrivUtPdf.astro).
const pdfOrd = (vad: string) => (kanSkrivaUtPdf() ? `Skriv ut ${vad}` : `${stor(vad)} som pdf`);
const narvaroFor = (e: SammanstallningElev, s: Sammanstallning) => s.veckor.map((v) => v.pass.map((p) => (!p.gjort ? 'inte' : (aktiv.foljd.franvaro[p.dag] ?? []).includes(e.id) ? 'borta' : 'med')));

// Skattningarna vecka för vecka som staplar, små på raden och stora när eleven fälls ut, med en markering vid
// avstämningen och, när läraren noterar närvaron, närvaron som prickar under veckan.
function graf(varden: (number | undefined)[], etiketter: string[], o: { stor?: boolean; mitt?: number | null; pass?: string[][]; namn: string }) {
  const stor = o.stor ?? false, steg = stor ? 36 : 9, b = stor ? 22 : 6, h = stor ? 110 : 22, x0 = stor ? 22 : 0, topp = stor ? 22 : 2;
  const under = stor ? (o.pass ? 40 : 24) : 2, bredd = x0 + varden.length * steg;
  const linjer = stor ? [1, 2, 3, 4, 5].map((n) => `<line x1="${x0 - 4}" x2="${bredd}" y1="${topp + h - (n / 5) * h}" y2="${topp + h - (n / 5) * h}" class="pl-linje"/><text x="8" y="${topp + h - (n / 5) * h + 4}" class="pl-axel">${n}</text>`).join('') : '';
  const staplarna = varden.map((x, i) => {
    const bx = x0 + i * steg + (steg - b) / 2;
    const yta = x ? `<rect x="${bx}" y="${topp + h - (x / 5) * h}" width="${b}" height="${(x / 5) * h}" rx="${stor ? 3 : 1}" class="pl-stapel"/>${stor ? `<text x="${bx + b / 2}" y="${topp + h - (x / 5) * h - 4}" class="pl-stapelvarde">${x}</text>` : ''}` : `<rect x="${bx}" y="${topp + h - 1.5}" width="${b}" height="1.5" class="pl-stapel-tom"/>`;
    const etikett = stor ? `<text x="${bx + b / 2}" y="${topp + h + 14}" class="pl-stapeletikett">${esc(etiketter[i])}</text>` : '';
    const prickar = stor && o.pass ? (o.pass[i] ?? []).map((p, j, alla) => { const px = bx + b / 2 + (j - (alla.length - 1) / 2) * 7, py = topp + h + 28; return p === 'med' ? `<circle cx="${px}" cy="${py}" r="2.6" class="pl-prick"/>` : p === 'borta' ? `<circle cx="${px}" cy="${py}" r="2.4" class="pl-prick borta"/>` : `<line x1="${px - 2}" x2="${px + 2}" y1="${py}" y2="${py}" class="pl-linje"/>`; }).join('') : '';
    return `${yta}${etikett}${prickar}`;
  }).join('');
  // Veckan mitt i insatsen, då läraren stämmer av, står i ett ljust fält bakom stapeln.
  const mitt = stor && o.mitt ? `<rect x="${x0 + (o.mitt - 1) * steg + 1}" y="${topp - 12}" width="${steg - 2}" height="${h + 12}" rx="3" class="pl-mittfalt"/><text x="${x0 + (o.mitt - 1) * steg + steg / 2}" y="${topp - 3}" class="pl-axel pl-mitttext">Mitt i</text>` : '';
  const text = varden.map((x, i) => (x ? `${etiketter[i]}: ${x}` : '')).filter(Boolean).join(', ');
  return `<svg class="pl-graf${stor ? ' stor' : ''}" viewBox="0 0 ${bredd} ${topp + h + under}" width="${bredd}" height="${topp + h + under}" role="img" aria-label="${esc(`${o.namn}: ${text || 'inte skattad än'}`)}">${mitt}${linjer}${staplarna}</svg>`;
}

// Sammanställningen står så snart något är ifyllt, och går att nå från veckan (Niclas 2026-10-24: "både sammanställning av
// alla elever i gruppen och en elev när som").
const ifyllt = (s: Sammanstallning) => s.gjorda > 0 || s.elever.some((e) => e.skattningar.length) || s.veckor.some((v) => v.skattning || v.not) || Object.keys(aktiv.foljd.resultat).length > 0 || !!(s.avstamning?.beslut || s.avstamning?.not || s.utvardering?.beslut || s.utvardering?.not);
const harSamman = (s: Sammanstallning) => (aktiv.sparad || aktiv.franLank) && aktiv.folj && (ifyllt(s) || s.slut);

// En elevs utveckling, eller gruppens: skattningen vecka för vecka som graf med avstämningen mitt i, närvaron, resultaten i
// metodens uppföljning och elevens utskrift. Den står när eleven fälls ut i sammanställningen och under namnet i veckan, så
// att det är samma sak var läraren än trycker. medRiktning sätter riktningen överst, där raden inte redan säger den.
function utveckling(e: SammanstallningElev, s: Sammanstallning, medRiktning = false) {
  const elev = !s.grupp && e.id !== GRUPPEN;
  const varden = s.veckor.map((v) => e.skattningar.find((x) => x.nr === v.nr)?.varde);
  const res = elevensResultat(plan, e.resultat).map((t) => `<li>${esc(nar(t.rad))}, v. ${isoVecka(t.datum).vecka}: ${esc(t.varde)}</li>`).join('');
  const narvaro = elev && e.narvaro !== null && s.gjorda ? `<p>Var med i ${e.narvaro} av ${s.gjorda} bockade pass.</p>` : '';
  if (!e.skattningar.length && !res && !narvaro) return `<p class="pl-not">${elev ? 'Eleven' : 'Gruppen'} är inte skattad än. Grafen kommer med första skattningen.</p>`;
  const mittvarde = s.mitt ? e.skattningar.filter((x) => x.nr <= s.mitt!).pop() : undefined;
  const prickar = elev && s.narvaro && s.gjorda > 0;
  const r = riktning(e);
  const knappar = elev ? `<p class="pl-andra-knappar"><button type="button" class="knapp sekundar liten" data-elevpdf="${esc(e.id)}" data-goatcounter-click="planera:${esc(data.id)}:elevpdf" data-goatcounter-title="${esc(data.titel)}: en elevs sammanställning som pdf">${esc(pdfOrd('elevens sammanställning'))}<span class="visually-hidden">: ${esc(e.namn)}</span></button><button type="button" class="knapp sekundar liten" data-elevtext="${esc(e.id)}" data-goatcounter-click="planera:${esc(data.id)}:elevtext" data-goatcounter-title="${esc(data.titel)}: en elevs rad kopierad">Kopiera elevens rad<span class="visually-hidden">: ${esc(e.namn)}</span></button></p>` : '';
  return `${medRiktning ? `<p class="pl-riktning${r ? ` ${r}` : ''}">${r ? `<span aria-hidden="true">${PIL[r]} </span>` : ''}${esc(stor(riktningText(e)))}</p>` : ''}<div class="pl-grafruta">${graf(varden, s.veckor.map((v) => `v. ${v.vecka}`), { stor: true, mitt: s.mitt, pass: prickar ? narvaroFor(e, s) : undefined, namn: e.namn })}</div>${prickar ? '<p class="pl-not">Prickarna under veckan är passen: fylld var med, ring var inte med, streck inte bockat.</p>' : ''}${mittvarde ? `<p>Vid avstämningen mitt i: ${mittvarde.varde}, ${esc(SKALAN[mittvarde.varde - 1].toLocaleLowerCase('sv'))}.</p>` : ''}${narvaro}${res ? `<ul class="pl-res">${res}</ul>` : ''}${knappar}`;
}

function renderaSamman() {
  const ruta = $('pl-samman');
  senaste = sammanstallning(plan, aktiv.foljd, idag);
  const s = senaste;
  if (!harSamman(s)) { ruta.hidden = true; ruta.innerHTML = ''; return; }
  const oppna = new Set([...ruta.querySelectorAll<HTMLDetailsElement>('details[data-elev]')].filter((d) => d.open).map((d) => d.dataset.elev));
  const etiketter = s.veckor.map((v) => `v. ${v.vecka}`);
  const delar: string[] = [`<h2 id="pl-samman-rubrik" tabindex="-1">Sammanställningen${s.slut ? '' : ' hittills'}</h2>`, malRad('samman', false)];
  // Ett pass som inte är bockat är inte bockat: sammanställningen säger det läraren har fört in (granskningarna 2026-10-24).
  const obockade = Math.max(0, s.slut ? s.planerade - s.gjorda : s.varit - s.gjordaVarit);
  const passText = !s.gjorda ? 'Inga pass är bockade än.' : !s.varit ? `Inget pass har varit än. Planen har ${s.planerade} pass.` : `${s.slut ? `${s.gjorda} av ${s.planerade} pass är bockade som genomförda.` : `${s.gjordaVarit} av de ${s.varit} pass som har varit är bockade. Planen har ${s.planerade} pass.`}${obockade ? ` ${obockade} ${obockade === 1 ? 'pass som har varit är inte bockat' : 'pass som har varit är inte bockade'}.` : ''}`;
  delar.push(`<p>${esc(passText)}</p>`);
  const vad = s.grupp ? 'gruppen' : 'eleverna';
  delar.push(`<section class="pl-block"><h3>${s.grupp ? 'Gruppen' : 'Eleverna'}</h3><p class="pl-not">Skattningen av hur väl ${vad} klarar målet på egen hand, 1 till 5, vecka för vecka.${s.grupp ? '' : ' Tryck på en elev för grafen och elevens utskrift.'}</p><div class="pl-elevlista">${s.elever.map((e) => {
    const elev = !s.grupp && e.id !== GRUPPEN;
    const varden = s.veckor.map((v) => e.skattningar.find((x) => x.nr === v.nr)?.varde);
    const r = riktning(e);
    return `<details class="pl-elevdetalj" data-elev="${esc(e.id)}"${oppna.has(e.id) ? ' open' : ''}><summary><span class="pl-elevnamn">${esc(e.namn)}</span>${graf(varden, etiketter, { namn: e.namn })}<span class="pl-riktning${r ? ` ${r}` : ''}">${r ? `<span aria-hidden="true">${PIL[r]} </span>` : ''}${esc([riktningText(e), foreOchEfter(e), elev && e.narvaro !== null && s.gjorda ? `med i ${e.narvaro} av ${s.gjorda} pass` : ''].filter(Boolean).join(' · '))}</span></summary>${utveckling(e, s)}</details>`;
  }).join('')}</div></section>`);
  const veckorna = s.veckor.filter((v) => v.skattning);
  const noter = s.veckor.filter((v) => v.not);
  if (veckorna.length || noter.length) {
    // En graf med en stapel säger inget; med färre än två veckor står veckan som text.
    const grafen = veckorna.length >= 2 ? `<div class="pl-grafruta">${graf(s.veckor.map((v) => v.skattning), etiketter, { stor: true, mitt: s.mitt, namn: 'Hur veckorna gick, 1 till 5' })}</div><p>Medel ${String(s.veckomedel).replace('.', ',')} av 5.</p>` : veckorna.map((v) => `<p>Vecka ${v.innehall}${v.igen ? ' igen' : ''} (v. ${v.vecka}): ${v.skattning} av 5.</p>`).join('');
    delar.push(`<section class="pl-block"><h3>Hur veckorna gick</h3>${grafen}${noter.length ? `<ul class="pl-noter">${noter.map((v) => `<li><span class="pl-etikett">Vecka ${v.innehall}${v.igen ? ' igen' : ''} · v. ${v.vecka}</span>${esc(v.not!)}</li>`).join('')}</ul>` : ''}</section>`);
  }
  const beslut = [
    ...(s.avstamning?.beslut || s.avstamning?.not ? [`<li><span class="pl-etikett">Avstämning mitt i insatsen</span>${esc(mening([s.avstamning.beslut ? BESLUT[s.avstamning.beslut as keyof typeof BESLUT] : '', s.avstamning.not ?? ''].filter(Boolean).map((x) => x.replace(/[.\s]+$/, '')).join('. ')))}</li>`] : []),
    ...(s.utvardering?.beslut || s.utvardering?.not ? [`<li><span class="pl-etikett">Utvärdering efter insatsen</span>${esc(mening([s.utvardering.beslut ? BESLUT[s.utvardering.beslut as keyof typeof BESLUT] : '', s.utvardering.not ?? ''].filter(Boolean).map((x) => x.replace(/[.\s]+$/, '')).join('. ')))}</li>`] : []),
  ];
  if (beslut.length) delar.push(`<section class="pl-block"><h3>Besluten</h3><ul class="pl-noter">${beslut.join('')}</ul></section>`);
  delar.push(`<p class="pl-knappar"><button type="button" class="knapp" data-gruppdf data-goatcounter-click="planera:${esc(data.id)}:gruppdf" data-goatcounter-title="${esc(data.titel)}: sammanställningen som pdf">${esc(pdfOrd('sammanställningen'))}</button><button type="button" class="knapp sekundar" data-samman data-goatcounter-click="planera:${esc(data.id)}:sammanstallning" data-goatcounter-title="${esc(data.titel)}: sammanställningen kopierad">Kopiera sammanställningen</button></p><p class="pl-not">Utskriften har elevernas namn. Texten som kopieras har inga: ett namn ur elevlistan i en mening blir ”en elev”.</p>`);
  ruta.innerHTML = delar.join('');
  ruta.hidden = false;
}
// En pdf som görs i webbläsaren skrivs ut direkt där det går, och laddas annars ner, så att telefonen öppnar den.
async function visaPdf(bytes: Uint8Array, filnamn: string) {
  const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }));
  if (kanSkrivaUtPdf()) skrivUt(url);
  else { const a = document.createElement('a'); a.href = url; a.download = filnamn; document.body.append(a); a.click(); a.remove(); }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
const filnamnAv = (...delar: string[]) => `${delar.map((d) => d.toLocaleLowerCase('sv').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).filter(Boolean).join('-')}.pdf`;
// Sammanställningens knappar, och elevens när eleven är utfälld i veckan. Sammanställningen räknas när läraren trycker, så att
// det senast ifyllda kommer med.
async function samman(knapp: HTMLButtonElement) {
  const s = sammanstallning(plan, aktiv.foljd, idag);
  if (knapp.hasAttribute('data-samman')) { const ok = await kopiera(sammanstallningstext(info(), plan, s)); if (ok) kvittera(knapp, 'Kopierad'); visaBesked(ok ? 'Sammanställningen är kopierad, utan elevernas namn.' : 'Texten gick inte att kopiera i den här webbläsaren.'); return; }
  if (knapp.dataset.elevtext) { const ok = await kopiera(elevtext(info(), plan, s, knapp.dataset.elevtext)); if (ok) kvittera(knapp, 'Kopierad'); visaBesked(ok ? 'Elevens rad är kopierad, utan namnet. Klistra in den i elevens dokumentation.' : 'Texten gick inte att kopiera i den här webbläsaren.'); return; }
  if (knapp.hasAttribute('data-gruppdf') || knapp.dataset.elevpdf) {
    knapp.setAttribute('aria-busy', 'true');
    try {
      const id = knapp.dataset.elevpdf;
      const bytes = id ? await elevPdf(plan, s, id, pdfInfo(), idag, aktiv.foljd.franvaro) : await gruppPdf(plan, s, pdfInfo(), idag);
      await visaPdf(bytes, id ? filnamnAv(s.elever.find((x) => x.id === id)?.namn ?? 'elev', data.titel) : filnamnAv('sammanstallning', data.titel, aktiv.namn));
    } catch { visaBesked('Pdf:en gick inte att göra i den här webbläsaren. Kopiera texten i stället.'); }
    knapp.removeAttribute('aria-busy');
  }
}
$('pl-samman').addEventListener('click', (e) => { const knapp = (e.target as Element).closest<HTMLButtonElement>('button'); if (knapp) void samman(knapp); });

// ---------- Planen på en annan dator ----------
// Planen och allt läraren har fört in sparas också som en fil som läraren lägger där skolans filer finns, så att
// uppföljningen går att flytta till en annan dator och inte försvinner om webbläsaren rensas (Niclas 2026-10-24: "risk att
// saker försvinner"; Safari raderar det en webbplats har sparat efter sju dagars användning utan besök på den, WebKit
// 2020). Filen har elevernas namn; den skickas ingenstans. Kopian görs av det sidan har nu, inte av det som är sparat,
// så att den håller också när webbläsaren inte sparar (granskningen 2026-10-24).
const KOPIANS_TYP = 'planera-insatsen';
const kopiansAlder = () => (aktiv.kopia ? Math.round((Date.parse(idag) - Date.parse(aktiv.kopia.slice(0, 10))) / 86400000) : null);
function renderaKopia() {
  const text = $('pl-kopia-text');
  const harFoljd = aktiv.folj && harInfort();
  $('pl-kopia-spara').hidden = !aktiv.sparad;
  $('pl-lank').hidden = !aktiv.sparad && !aktiv.franLank;
  const alder = kopiansAlder();
  // Påminnelsen efter en vecka, som Safaris sju dagar (granskningen 2026-10-24).
  text.classList.toggle('pl-paminn', harFoljd && (alder === null || alder > 7));
  text.textContent = !aktiv.sparad && !aktiv.franLank
    ? 'Har du en kopia av en plan, till exempel från en annan dator? Öppna den här.'
    : harFoljd
      ? alder === null ? 'Det du för in finns bara i den här webbläsaren. Spara en kopia som fil där du har skolans filer, så finns den kvar och går att öppna på en annan dator. Länken visar bara planen.'
        : alder > 7 ? `Senaste kopian är från ${datumText(aktiv.kopia!.slice(0, 10))}. Spara en ny, så kommer det senaste med.` : `Senaste kopian sparades ${datumText(aktiv.kopia!.slice(0, 10))}. Länken visar bara planen; kopian har allt.`
      : 'Länken visar planen på en annan dator eller telefon. En kopia som fil har allt, också gruppens namn.';
}
function sparaKopia() {
  aktiv.kopia = idag;
  const egen = sparadAv();
  if (aktiv.sparad) skrivPlaner([egen, ...lasPlaner().planer.filter((p) => p.id !== aktiv.id)]);
  const fil = JSON.stringify({ typ: KOPIANS_TYP, v: 1, sparad: egen.andrad, plan: egen }, null, 1);
  const url = URL.createObjectURL(new Blob([fil], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = filnamnAv('planera-insatsen', data.titel, aktiv.namn, idag).replace(/\.pdf$/, '.json');
  document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  renderaKopia();
  visaBesked('Kopian har hämtats. Lägg filen bland skolans filer. Den har elevernas namn, så dela den inte.');
}
$('pl-kopia-spara').addEventListener('click', sparaKopia);
const tidOrd = (andrad?: string) => (!andrad ? 'tidigare' : andrad.includes('T') ? `${datumText(andrad.slice(0, 10))} kl. ${tidText(andrad.slice(11, 16))}` : datumText(andrad.slice(0, 10)));
$<HTMLInputElement>('pl-kopia-fil').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const fil = input.files?.[0];
  input.value = '';
  if (!fil) return;
  let innehall: { typ?: string; v?: number; plan?: unknown };
  try { innehall = JSON.parse(await fil.text()); } catch { visaBesked('Filen är inte en kopia av en plan.'); return; }
  // Kopian rensas innan den ersätter något: fälten som sidan kan visa, och för metoden på den här sidan räknas datumen om
  // ur valen (Codex 2026-10-24: en kopia som hade ändrats för hand gjorde sidan obrukbar).
  const p = innehall?.typ === KOPIANS_TYP ? rensaPlan(innehall.plan) : null;
  const valen = p ? lasVal(p.val) : null;
  if (!p || !valen) { visaBesked('Filen är inte en kopia av en plan.'); return; }
  p.val = kodaVal(valen.val);
  if (p.metod === data.id) {
    const pl = planera(mp, valen.val);
    p.schema = schemaAv(pl, valen.val);
    p.bockade = pl.pass.filter((x) => p.foljd!.gjorda!.includes(passetsDag(x))).length;
  }
  skrivVantande(true);
  const finns = lasPlaner().planer.find((x) => x.id === p.id);
  const oppna = () => {
    if (!skrivPlaner([p, ...lasPlaner().planer.filter((x) => x.id !== p.id)])) { visaBesked('Kopian gick inte att spara i den här webbläsaren.'); return; }
    // En kopia av en annan metods plan öppnas på den metodens sida.
    if (p.metod !== data.id) { location.href = `/stodundervisning/${encodeURIComponent(p.metod)}/planera#${p.val}&p=${encodeURIComponent(p.id)}`; return; }
    aktiv = franSparad(p);
    visa = undefined;
    olikaTider = false;
    plan = planera(mp, aktiv.val);
    uppdateraAdressen();
    rendera();
    ($('pl-andra') as HTMLDetailsElement).open = false;
    visaBesked('Kopian är öppnad, med allt som förts in.', finns ? { text: 'Ångra', kvar: true, gor: () => { skrivPlaner([finns, ...lasPlaner().planer.filter((x) => x.id !== finns.id)]); aktiv = franSparad(finns); plan = planera(mp, aktiv.val); uppdateraAdressen(); rendera(); visaBesked('Planen är som före kopian.'); } } : undefined);
  };
  // En kopia som skulle ersätta något som har ändrats efter den frågar först, också samma dag (granskningen 2026-10-24).
  if (finns && innehallAv(finns) !== innehallAv(p) && (finns.andrad ?? '') >= (p.andrad ?? '')) {
    fragaForst(input.closest('label') as HTMLElement, `Planen i den här webbläsaren ändrades ${tidOrd(finns.andrad)}, efter kopian från ${tidOrd(p.andrad)}. Ersätta den med kopian?`, 'Ersätt med kopian', oppna);
    return;
  }
  oppna();
});
// Webbläsaren ombeds spara planerna varaktigt, så att den inte rensar dem på egen hand. Den bestämmer själv.
const bedOmVaraktig = () => { try { void navigator.storage?.persist?.(); } catch { /* utan stöd */ } };

// ---------- Flera planer för samma metod ----------
// Dina planer står så snart en plan är sparad, med Ny plan (granskningarna 2026-10-24: med en sparad plan fanns ingen väg
// till en plan för en andra grupp).
function renderaGrupper() {
  const egna = mina();
  const nav = $('pl-grupper');
  nav.hidden = !egna.length;
  if (nav.hidden) { nav.innerHTML = ''; return; }
  const namnen = skiljNamnen(egna.map(planensNamn));
  nav.innerHTML = `<span class="pl-etikett">Dina planer för metoden</span>${egna.map((p, i) => `<button type="button" class="pl-chip" data-plan="${esc(p.id)}" aria-pressed="${p.id === aktiv.id && aktiv.sparad}">${esc(namnen[i])}</button>`).join('')}<button type="button" class="pl-chip pl-ny" data-plan="ny" aria-pressed="${!aktiv.sparad && !aktiv.franLank}">Ny plan</button>`;
}
$('pl-grupper').addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('[data-plan]');
  if (!b) return;
  skrivVantande(true);
  const p = mina().find((x) => x.id === b.dataset.plan);
  aktiv = p ? franSparad(p) : nyAktiv();
  visa = undefined;
  olikaTider = false;
  plan = planera(mp, aktiv.val);
  history.replaceState(null, '', p ? `#${kodaVal(aktiv.val, { id: aktiv.id })}` : location.pathname);
  friskaUpp();
  rendera();
  ($('pl-andra') as HTMLDetailsElement).open = !aktiv.sparad;
  if (!p) { $('pl-planen').scrollIntoView({ block: 'start' }); visaBesked('En ny plan. Välj när gruppen träffas och spara planen.'); }
});

// ---------- Knapparna ----------
// Text som kopieras eller laddas ned är vanlig text: utan ordfogarna som håller ihop F–5 och 2–6 på sidan (verifieringen
// 2026-10-25: ett osynligt tecken mellan tankstrecket och siffran i texten till åtgärdsprogrammet och i kalenderfilen).
function vanligText(s: string): string { return s.replace(/\u2060/g, ''); }
async function kopiera(text: string): Promise<boolean> {
  text = vanligText(text);
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.append(t); t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    t.remove();
    return ok;
  }
}
// Beskedet efter ett tryck står längst ned på skärmen, där läraren ser det (granskningarna 2026-10-24: beskedet överst
// syntes inte från knapparna längre ned), med en knapp när något går att ångra. Ett besked utan knapp går bort efter en
// stund; ett med Ångra står kvar tills läraren stänger det eller trycker på något annat.
let toastTid = 0;
let toastVid = 0;
let toastGor: (() => void) | null = null;
function visaBesked(text: string, atgard?: { text: string; gor: () => void; kvar?: boolean }) {
  const t = $('pl-toast');
  window.clearTimeout(toastTid);
  toastGor = atgard?.gor ?? null;
  if (!text) { t.hidden = true; t.innerHTML = ''; return; }
  t.innerHTML = `<p>${esc(text)}</p>${atgard ? `<button type="button" class="pl-toast-knapp" data-toast-gor>${esc(atgard.text)}</button>` : ''}<button type="button" class="pl-toast-stang" data-toast-stang aria-label="Stäng beskedet">×</button>`;
  t.hidden = false;
  toastVid = performance.now();
  toastTid = window.setTimeout(() => { t.hidden = true; toastGor = null; }, atgard ? 30000 : 8000);
}
// Ett besked går bort vid nästa tryck någon annanstans, så att det inte täcker det läraren gör (de kalla läsarna
// 2026-10-24). Trycket som ger ett nytt besked tar först bort det gamla.
let tryckVid = 0;
document.addEventListener('pointerdown', () => { tryckVid = performance.now(); }, true);
document.addEventListener('click', (e) => {
  const t = $('pl-toast');
  // Ett besked som kom av samma tryck, som när fältet lämnas, står kvar; ett tryck med tangentbordet har inget pointerdown.
  if (e.detail > 0 && toastVid > tryckVid) return;
  if (!t.hidden && !t.contains(e.target as Node)) { t.hidden = true; toastGor = null; }
}, true);
$('pl-toast').addEventListener('click', (e) => {
  const b = (e.target as Element).closest('button');
  if (!b) return;
  const g = b.hasAttribute('data-toast-gor') ? toastGor : null;
  $('pl-toast').hidden = true;
  toastGor = null;
  g?.();
});
// Det som gäller hela sidan står överst: en plan ur en länk, en metod som har ändrats och en webbläsare som inte sparar.
function visaNotis(text: string) {
  const b = $('pl-besked');
  b.textContent = text;
  b.hidden = !text;
}
// Ett tryck som tar bort något frågar först i sidan, med Avbryt förvalt (Niclas 2026-10-24: "med någon spärr för
// misstryck"), och det borttagna går att ångra efteråt.
function fragaForst(knapp: HTMLElement, fraga: string, ja: string, gor: () => void) {
  if (knapp.nextElementSibling?.classList.contains('pl-fraga-forst')) return;
  const ruta = document.createElement('div');
  ruta.className = 'pl-fraga-forst';
  ruta.setAttribute('role', 'group');
  ruta.setAttribute('aria-label', fraga);
  ruta.innerHTML = `<p>${esc(fraga)}</p><p class="pl-andra-knappar"><button type="button" class="knapp liten pl-farlig" data-ja>${esc(ja)}</button><button type="button" class="knapp sekundar liten" data-nej>Avbryt</button></p>`;
  knapp.hidden = true;
  knapp.after(ruta);
  ruta.querySelector<HTMLButtonElement>('[data-nej]')!.focus();
  ruta.addEventListener('click', (e) => {
    const b = (e.target as Element).closest('button');
    if (!b) return;
    ruta.remove();
    knapp.hidden = false;
    if (b.hasAttribute('data-ja')) gor(); else knapp.focus();
  });
}

$('pl-spara').addEventListener('click', () => {
  aktiv.sparad = true;
  aktiv.franLank = false;
  if (!spara()) { aktiv.sparad = false; sparfel(); return; }
  bedOmVaraktig();
  raknaPagaende(lasPlaner().planer);
  // Raden om appen Stöd följer om planen är sparad (src/scripts/appen.ts).
  document.dispatchEvent(new Event('planera:sparad'));
  uppdateraAdressen();
  notis = '';
  visaNotis('');
  rendera();
  ($('pl-andra') as HTMLDetailsElement).open = false;
  // Läraren kommer till veckan överst, och beskedet säger nästa steg och leder till kalendern och texten till
  // åtgärdsprogrammet under planen (användbarhetsprovet 2026-10-25: efter Spara stod sidan kvar utan besked).
  tillVy(undefined);
  visaBesked(nuVy() === 'fore' ? 'Planen är sparad. Börja med det du gör före första passet.' : 'Planen är sparad i den här webbläsaren.', { text: 'Kalendern och åtgärdsprogrammet', gor: () => { $('pl-planen').scrollIntoView({ block: 'start' }); $('pl-planen-rubrik').focus({ preventScroll: true }); } });
});
// Texten till åtgärdsprogrammet: åtgärden, målet, omfattningen, vad eleven arbetar med och uppföljningen.
function atgardstext() {
  const genomforda = aktiv.folj && aktiv.foljd.gjorda.length ? { genomforda: plan.pass.filter((p) => gjort(passetsDag(p))).length } : {};
  return dokumentationstext({ titel: data.titel, undertitel: data.undertitel, adress: data.adress, mal: data.mal, steg: (data.progression?.rader ?? []).map((r) => r.kort), uppfoljning: data.uppfoljning.rader, nivaNamn: nivaNamn() }, plan, aktiv.val, { minuter: minuter(), folj: aktiv.folj, ...genomforda });
}
// En knapp som har gjort det den ska säger det själv en stund, intill där läraren tryckte (de kalla läsarna 2026-10-24:
// "Kopiera texten ger ingen bekräftelse").
function kvittera(knapp: HTMLElement, text: string) {
  if (!knapp.dataset.text) knapp.dataset.text = knapp.textContent ?? '';
  knapp.textContent = `${text} ✓`;
  knapp.classList.add('pl-kvitto');
  window.setTimeout(() => { if (knapp.dataset.text) knapp.textContent = knapp.dataset.text; knapp.classList.remove('pl-kvitto'); delete knapp.dataset.text; }, 3000);
}
$('pl-dokumentation').addEventListener('click', async (e) => {
  // Knappen tas innan kopieringen: efter en await är e.currentTarget tom.
  const knapp = e.currentTarget as HTMLElement;
  const ok = await kopiera(atgardstext());
  if (ok) kvittera(knapp, 'Kopierad');
  visaBesked(ok ? 'Texten är kopierad. Klistra in den i åtgärdsprogrammet under Åtgärder.' : 'Texten gick inte att kopiera här. Markera texten i rutan och kopiera den.');
});
// Ett tryck i rutan markerar hela texten, så att den går att kopiera också där knappen inte kan.
$<HTMLTextAreaElement>('pl-aptext').addEventListener('focus', (e) => (e.target as HTMLTextAreaElement).select());
async function kopieraLanken() {
  const ok = await kopiera(lank());
  if (ok) kvittera($('pl-lank'), 'Kopierad');
  visaBesked(ok ? 'Länken är kopierad. Den visar planen, men inte gruppens namn eller det som förts in.' : 'Länken gick inte att kopiera. Den står i adressfältet.');
  uppdateraAdressen();
}
$('pl-lank').addEventListener('click', () => void kopieraLanken());
$('pl-kalender').addEventListener('click', () => {
  const text = kalenderfil({ titel: data.titel, uppfoljning: data.uppfoljning.rader, fokus: (data.progression?.rader ?? []).map((r) => r.fokus), passet: passetIKalendern }, plan, { id: aktiv.id, lank, namn: aktiv.namn || undefined, nu: new Date(), tider: aktiv.val.tider });
  const url = URL.createObjectURL(new Blob([vanligText(text)], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${data.id}-plan.ics`;
  document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  kvittera($('pl-kalender'), 'Hämtad');
  visaBesked('Kalenderfilen är hämtad. Öppna den, så läggs passen och uppföljningen i kalendern. I Google Kalender läggs filen in på datorn.');
});
$('pl-ta-bort').addEventListener('click', (e) => {
  // Frågan säger det som gäller: med det som förts in, och om det finns en kopia (granskningen 2026-10-24).
  const fraga = !(aktiv.folj && harInfort()) ? 'Ta bort planen?' : aktiv.kopia ? `Ta bort planen med allt du har fört in? Din senaste kopia är från ${datumText(aktiv.kopia.slice(0, 10))}.` : 'Ta bort planen med allt du har fört in? Du har ingen kopia av den.';
  fragaForst(e.currentTarget as HTMLElement, fraga, 'Ta bort planen', () => {
    skrivVantande(true);
    const borttagen = lasPlaner().planer.find((p) => p.id === aktiv.id) ?? sparadAv();
    skrivPlaner(lasPlaner().planer.filter((p) => p.id !== aktiv.id));
    aktiv = nyAktiv();
    visa = undefined;
    plan = planera(mp, aktiv.val);
    history.replaceState(null, '', location.pathname);
    rendera();
    ($('pl-andra') as HTMLDetailsElement).open = true;
    visaBesked('Planen är borttagen.', { text: 'Ångra', kvar: true, gor: () => {
      skrivPlaner([borttagen, ...lasPlaner().planer]);
      aktiv = franSparad(borttagen);
      plan = planera(mp, aktiv.val);
      uppdateraAdressen();
      rendera();
      ($('pl-andra') as HTMLDetailsElement).open = false;
      visaBesked('Planen är tillbaka.');
    } });
  });
});
// Knappar och länkar som för läraren till en annan del av sidan: Hela planen, Till sammanställningen.
sida.addEventListener('click', (e) => {
  const mal = (e.target as Element).closest<HTMLElement>('[data-till], [data-mal-andra], [data-mal-klar], [data-mal-metodens], [data-mal-avbryt]');
  if (!mal) return;
  if (mal.dataset.till) { e.preventDefault(); const dit = $(mal.dataset.till); dit.scrollIntoView({ block: 'start' }); dit.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true }); return; }
  if (mal.hasAttribute('data-mal-andra')) { oppnaMal(mal.closest<HTMLElement>('.pl-mal')!.dataset.malplats!); return; }
  if (mal.hasAttribute('data-mal-klar')) { sparaMal($<HTMLTextAreaElement>('pl-malfalt').value); return; }
  if (mal.hasAttribute('data-mal-metodens')) { sparaMal(''); return; }
  if (mal.hasAttribute('data-mal-avbryt')) rendera();
});

function rendera() {
  // Sidans form först (en spalt för ett förslag, två för en sparad plan på en bred skärm), så att rutorna mäts i den.
  sida.classList.toggle('pl-har-plan', aktiv.sparad || aktiv.franLank);
  renderaVal();
  renderaSumma();
  renderaVeckor();
  renderaVeckan();
  renderaSamman();
  renderaKopia();
  renderaGrupper();
}

// En annan flik med samma plan: det den sparar visas här också, så att den här fliken inte skriver över det med det den hade
// (Codex 2026-10-24: en bock i en flik försvann när en skattning sparades i en annan). En plan som tas bort i en annan flik
// stängs här.
addEventListener('storage', (e) => {
  if (e.key !== null && e.key !== 'insatser') return;
  const p = aktiv.sparad ? lasPlaner().planer.find((x) => x.id === aktiv.id) : undefined;
  if (aktiv.sparad && !p) {
    const egna = mina();
    aktiv = egna.length ? franSparad(egna[0]) : nyAktiv();
    visa = undefined; olikaTider = false; redigering = null;
    plan = planera(mp, aktiv.val);
    history.replaceState(null, '', aktiv.sparad ? `#${kodaVal(aktiv.val, { id: aktiv.id })}` : location.pathname);
    rendera();
    visaNotis('Planen togs bort i en annan flik.');
    return;
  }
  if (p && innehallAv(p) !== senast) {
    // Det den här fliken har skrivit men inte sparat än går före: det sparas strax och vinner.
    if (harVantande()) { renderaGrupper(); return; }
    const vy = visa;
    aktiv = franSparad(p);
    visa = vy; redigering = null;
    plan = planera(mp, aktiv.val);
    uppdateraAdressen();
    rendera();
    return;
  }
  renderaGrupper();
});
// En länk till en annan plan i samma flik byter bara det som står efter #, och sidan läses då om, så att planen i länken
// visas (buggjakten 2026-10-24). En länk till en vecka i samma plan visar veckan.
addEventListener('hashchange', () => {
  const ny = lasVal(location.hash);
  if (!ny) return;
  if (kodaVal(ny.val, { id: ny.id }) !== kodaVal(aktiv.val, { id: aktiv.id })) { location.reload(); return; }
  if (ny.visa) tillVy(ny.visa);
  uppdateraAdressen();
});

// Start: en sparad plan visar veckan och har valen ihopfällda; ett förslag har valen öppna.
rendera();
friskaUpp();
// En plan som pågår säger det till statistiken, en gång i veckan (K-504).
raknaPagaende(lasPlaner().planer);
($('pl-andra') as HTMLDetailsElement).open = !aktiv.sparad;
if (aktiv.uppdaterad && data.uppdaterad && aktiv.uppdaterad < data.uppdaterad && !notis) notis = `Metoden har uppdaterats ${data.uppdateradText ?? data.uppdaterad}, efter att planen gjordes. Planen följer metoden som den är nu.`;
// En app med egen webbläsare, som Facebook och Instagram, har sin egen lagring: en plan som sparas där finns inte i Safari
// eller Chrome på samma telefon (granskningen 2026-10-24; många kommer till sajten från Facebook).
const app = /FBAN|FBAV|FB_IAB/.test(navigator.userAgent) ? 'Facebooks' : /Instagram/.test(navigator.userAgent) ? 'Instagrams' : '';
if (app) notis = `Du har öppnat sidan i ${app} egen webbläsare. En plan som sparas här finns bara här. Öppna sidan i Safari eller Chrome, så hittar du planen igen.`;
if (!lagringOk) notis = 'Webbläsaren sparar inget här, till exempel i privat läge. Kopiera länken till planen, så finns den kvar.';
visaNotis(notis);
uppdateraAdressen();
sida.classList.add('pl-klar');
