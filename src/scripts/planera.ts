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
  arDatum, AVSLUTANDE, AVSLUTAS_EFTER, BESLUT, BESLUTEN, forlangdaVal, insatsenAvslutad, insatsenSlut, planensSistaDag, beslutText, dagarText, dagKort, dagText, datumspann, datumText, decimal, delensTid, dokumentationstext, efterDatum, elevensResultat, elevensVarden, elevtext, esc, filnamnet, forstaMandagen, forval, forvaldLangd, gangen, GRUPPEN, iDatumordning, klockslag, liten, mening, metodveckan, minuterAv, minuterISpann, narvaronText, passensRad, passetsBeskrivning, plusMinuter, prickarna, resultatText, riktningText, sakspann, skattadeVeckor, skattningenText, stapelnsKant, stor, talText, sammaElev, skattningenMittI, uppfoljningensNamn, uppfoljningensRader, veckansPass, veckodagKort, veckorI, veckornaIPlanen, helgdag, isoVecka, kalenderfil, kalendervecka, kalenderveckaUtskriven, kodaVal,
  hogstaPassnr, LANGSTA, lasVal, malText, passetMedNr, passnummerText, PLANERA, metodplan, minuterText, mittVeckan, nastaObockade, passensMinuter, passetsDag, passetsRoller, passetsTid, planera, PLANKNAPPAR, planvecka, planveckanKort, planveckansNamn, plusDagar,
  bytDagar, ELEVLISTANS_LANGD, elevernasNamn, kapaVidOrd, mandagen, narensVikt, passetsLage, rensaFoljd, rentaFore, rentaTider, rentMal, riktning, sakdelar, sammanstallning, sammanstallningstext, SKALAN, skattningsfragan, spannKort, stegUtanfor, tidsspann, tidText,
  uppfoljningensTillfallen, uppraknat, utanNamn, utvarderingenText, avslutetText, kalenderveckornaFor, veckansDagar, veckansNamn, veckanFor, veckodag, veckonyckel, VECKODAGAR, type Veckonamn,
  type Foljd, type Pass, type Plan, type PlanVecka, type Sammanstallning, type SammanstallningElev, type Val,
} from '../lib/standard/index.js';
import type { PlanData } from '../lib/insatsplan';
import { idagLokalt, iTurOrdning, lagringenArNyare, lasPlaner, lasPlanfil, narText, nuTid, NYARE_VERSION, nyttId, planensAdress, planensNamn, planfilen, raknaPagaende, schemaAv, skiljNamnen, skrivPlaner, STATUSNAMN, statusAv, type SparadPlan } from './insatser-lagring';
import { kanSkrivaUtPdf, skrivUt } from './pdfutskrift';
import { elevPdf, gruppPdf } from './planpdf';
import { iAppen, vagenUt, vagenUtText, webblasaren } from './webblasaren';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const sida = $('plan');
const data: PlanData = JSON.parse($('pl-data').textContent ?? '{}');
const mp = metodplan({ tid: data.tid, period: data.period, progression: data.progression, uppfoljning: data.uppfoljning, plan: { passen: data.passen } }).plan!;
const idag = idagLokalt();
// Uppföljningens rad med sitt namn ur standarden, som i raden, texterna och pdf:en: Efter insatsen, och en vecka som i planen.
const uppfNamn = (rad: number) => uppfoljningensNamn(plan, info(), rad);

type HelFoljd = Required<Omit<Foljd, 'avstamning' | 'utvardering' | 'narvaro' | 'oppen' | 'borttagna'>> & Pick<Foljd, 'avstamning' | 'utvardering' | 'narvaro' | 'oppen' | 'borttagna'>;
const tomFoljd = (): HelFoljd => ({ gjorda: [], elever: [], franvaro: {}, vecka: {}, skattning: {}, resultat: {} });
interface Aktiv { id: string; namn: string; val: Val; folj: boolean; foljd: HelFoljd; sparad: boolean; franLank: boolean; uppdaterad?: string; kopia?: string }
const nyAktiv = (val: Val = forval(mp, idag), franLank = false, id = nyttId()): Aktiv => ({ id, namn: '', val, folj: false, foljd: tomFoljd(), sparad: false, franLank });
const fran = lasVal(location.hash);
const { planer, ok: lagringOk, varningar: lagringensVarningar } = lasPlaner();
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
// En plan som läraren öppnar i fliken: ett namn som sparades medan läraren skrev är färdigt, eftersom skrivandet tog slut.
// En plan som en annan flik ändrar läses som den är, så att ett utkast där inte blir ett tidigare namn (Codex 2026-10-25).
const oppnaSparad = (p: SparadPlan): Aktiv => { const a = franSparad(p); a.foljd.elever = a.foljd.elever.map(({ utkast: _utkast, ...e }) => e); return a; };
let aktiv: Aktiv;
// Vyn som visas: en vecka i planen, Före första passet eller Efter insatsen. Utan val visas veckan gruppen är i (nuVy).
type Vy = number | 'efter' | 'fore';
let visa: Vy | undefined = fran?.visa;
let notis = lagringensVarningar.join(' ');
// Ett besked som en annan metods sida lämnade när den öppnade en fil med en plan för den här metoden (Codex 2026-10-25).
let lamnatBesked = '';
try { lamnatBesked = sessionStorage.getItem('pl-besked') ?? ''; sessionStorage.removeItem('pl-besked'); } catch { /* utan lagring */ }
{
  const egna = planer.filter((p) => p.metod === data.id).sort(iTurOrdning(idag));
  const sparad = fran?.id ? egna.find((p) => p.id === fran.id) : undefined;
  if (fran && sparad) {
    aktiv = oppnaSparad(sparad);
    if (sparad.val !== kodaVal(fran.val)) notis = 'Planen i den här webbläsaren visas. Den har ändrats efter att länken skapades.';
  } else if (fran) {
    aktiv = nyAktiv(fran.val, true, fran.id ?? nyttId());
    notis = 'Planen kommer från en länk. Spara den, så finns den i den här webbläsaren. Det som förts in när insatsen följs finns bara i den webbläsare där det skrevs.';
  } else if (egna.length) aktiv = oppnaSparad(egna[0]);
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
// är nu, också för en plan som kom som kopia från en annan metods sida (Codex 2026-10-24). Det görs för alla metodens planer
// i webbläsaren, så att en plan som en äldre version sparade får planens sista dag och läget i Dina insatser räknas rätt
// (Codex 2026-10-25). Det är ingen ändring av planen, så tiden för den senaste ändringen och ordningen står kvar.
function friskaUpp() {
  const planerna = lasPlaner().planer;
  let andrad = false;
  const nya = planerna.map((p) => {
    if (p.metod !== data.id) return p;
    const egen = aktiv.sparad && p.id === aktiv.id;
    const val = egen ? aktiv.val : lasVal(p.val)?.val;
    if (!val) return p;
    const pl = egen ? plan : planera(mp, val);
    const ny = { ...p, schema: schemaAv(pl, val), bockade: egen ? bockade() : pl.pass.filter((x) => (p.foljd?.gjorda ?? []).includes(passetsDag(x))).length };
    if (JSON.stringify([p.schema, p.bockade]) === JSON.stringify([ny.schema, ny.bockade])) return p;
    andrad = true;
    return ny;
  });
  if (andrad) skrivPlaner(nya);
}
// Adressen bär valen, men inte veckan läraren har bläddrat till, så att sidan öppnar veckan gruppen är i nästa gång.
function uppdateraAdressen() {
  if (aktiv.sparad || aktiv.franLank) history.replaceState(null, '', `#${kodaVal(aktiv.val, { id: aktiv.id })}`);
}
const harInfort = () => aktiv.foljd.gjorda.length > 0 || Object.keys(aktiv.foljd.skattning).length > 0 || aktiv.foljd.elever.length > 0 || Object.keys(aktiv.foljd.resultat).length > 0 || !!aktiv.foljd.avstamning?.beslut || !!aktiv.foljd.utvardering?.beslut;
// Gick det inte att spara, säger beskedet vad som håller: kopian när läraren har fört in något, annars länken.
function sparfel() {
  if (lagringenArNyare()) visaBesked(NYARE_VERSION, { text: 'Ladda om sidan', gor: () => location.reload(), kvar: true });
  else if (aktiv.folj && harInfort()) visaBesked('Det gick inte att spara i den här webbläsaren. Ladda ner planen som fil, så finns det du har fört in kvar.', { text: PLANKNAPPAR.laddaNer, gor: sparaKopia, kvar: true });
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
// Passens längd med planens pass, också före ett byte av dagar (Codex 2026-10-25).
const passensLangd = () => passensMinuter(aktiv.val, minuter(), plan);
const nivaNamn = () => (data.bank?.nivaer ?? data.nivaer)?.find((n) => n.slug === aktiv.val.niva)?.namn;
const harElever = () => aktiv.folj && aktiv.foljd.elever.length > 0;
const narvaroPa = () => harElever() && !!aktiv.foljd.narvaro;
// De som skattas: eleverna, eller gruppen när läraren följer insatsen utan elevlista.
const vem = () => (harElever() ? aktiv.foljd.elever : [{ id: GRUPPEN, namn: 'Gruppen' }]);
// Olika tider olika dagar: valet står öppet så länge dagarna har olika tider eller läraren har valt det.
let olikaTider = false;

function renderaVal() {
  start.value = aktiv.val.start;
  for (const b of dagknappar) b.setAttribute('aria-pressed', String(aktiv.val.dagar.includes(Number(b.dataset.dag))));
  // En längd som inte står bland knapparna (en längre period ur en länk eller en förlängning) får en egen knapp, som tas
  // bort när planen har en annan längd, så att en ny plan visar metodens längder (K-544; buggjakten 2026-10-25: 5 stod kvar
  // bredvid metodens sex till åtta efter Ny plan).
  for (const b of langdknappar.filter((x) => x.dataset.egen && Number(x.dataset.langd) !== aktiv.val.langd)) { b.remove(); langdknappar.splice(langdknappar.indexOf(b), 1); }
  if (!langdknappar.some((b) => Number(b.dataset.langd) === aktiv.val.langd)) {
    const b = langdknappar[langdknappar.length - 1].cloneNode() as HTMLButtonElement;
    b.dataset.langd = String(aktiv.val.langd);
    b.dataset.egen = '1';
    b.textContent = String(aktiv.val.langd);
    // Knappen står i ordning bland de andra (steget Samma sak överallt 2026-10-25: "6, 7, 8, 5").
    const efter = langdknappar.find((x) => Number(x.dataset.langd) > aktiv.val.langd);
    if (efter) efter.before(b); else langdknappar[langdknappar.length - 1].after(b);
    langdknappar.splice(efter ? langdknappar.indexOf(efter) : langdknappar.length, 0, b);
    b.addEventListener('click', () => valjLangd(b));
  }
  for (const b of langdknappar) b.setAttribute('aria-pressed', String(Number(b.dataset.langd) === aktiv.val.langd));
  const langd = passensLangd();
  for (const b of minutknappar) b.setAttribute('aria-pressed', String(langd.length === 1 && Number(b.dataset.minuter) === langd[0]));
  for (const b of nivaknappar) b.setAttribute('aria-pressed', String(b.dataset.niva === aktiv.val.niva));
  if (borjaval) {
    borjaval.value = String(aktiv.val.borja ?? 1);
    lasBorja();
  }
  if (document.activeElement !== namnfalt) namnfalt.value = aktiv.namn;
  // Under dagarna: när insatsen har börjat gäller nya dagar från i dag, och ett byte står med dagarna före (K-546).
  const byte = $('pl-dagar-byte');
  const harByte = rentaFore(aktiv.val.fore).length > 0;
  byte.hidden = !harByte && !dagarFranIdag();
  byte.textContent = harByte ? `${stor(dagarText(aktiv.val))}.` : byte.hidden ? '' : 'Ändrar du dagarna gäller de från i dag, och passen som har varit och dagens pass står kvar.';
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
  $('pl-lovveckor').innerHTML = veckor.map((m) => { const k = veckonyckel(m); const pa = lov.has(k); return `<button type="button" class="pl-chip pl-lovchip" data-lovvecka="${k}" aria-pressed="${pa}" aria-label="${stor(kalenderveckaUtskriven(isoVecka(m).vecka))}, ${esc(spannKort(m, plusDagar(m, 4)))}${pa ? ', lov' : ''}"><span>${kalendervecka(isoVecka(m).vecka)}</span><small>${esc(spannKort(m, plusDagar(m, 4)))}</small></button>`; }).join('');
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
const KLOCKSLAG = Array.from({ length: 11 * 12 + 1 }, (_, i) => klockslag(7 * 60 + i * 5));
const tidval = (valt: string | undefined, efter?: string) => {
  const lista = [...new Set([...KLOCKSLAG, ...(valt ? [valt] : [])])].sort().filter((k) => (efter ? k > efter : k < KLOCKSLAG[KLOCKSLAG.length - 1]));
  return `${efter ? '' : '<option value="">Ingen tid</option>'}${lista.map((k) => `<option value="${k}"${k === valt ? ' selected' : ''}>${tidText(k)}</option>`).join('')}`;
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
    return `<span class="pl-tiddag">${stor(veckodagKort(d))}</span><select class="pl-falt pl-tid" data-tiddag="${d}" data-del="0" aria-label="${VECKODAGAR[d - 1]}, passet börjar">${tidval(t?.[0])}</select><select class="pl-falt pl-tid" data-tiddag="${d}" data-del="1" aria-label="${VECKODAGAR[d - 1]}, passet slutar"${t ? '' : ' disabled'}>${slutval(t?.[0], t?.[1])}</select>`;
  }).join('')}`;
}
// En dags tid: början och slutet. En ny början flyttar slutet med, så att passet är lika långt som förut, och ett pass
// utan tid får passets längd ur metoden.
function sattTid(dagar: number[], fran: string, till?: string) {
  const tider = { ...rentaTider(aktiv.val.tider) };
  for (const d of dagar) {
    if (!fran) { delete tider[String(d)]; continue; }
    const forra = tider[String(d)];
    const langd = forra ? minuterAv(forra[1]) - minuterAv(forra[0]) : minuter();
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
const ogonblick = () => ({ plan: aktiv.id, val: structuredClone(aktiv.val), foljd: structuredClone(aktiv.foljd), namn: aktiv.namn, folj: aktiv.folj });
function aterstall(o: ReturnType<typeof ogonblick>, meddelande: string) {
  // Ångra gäller planen som ändrades, aldrig en annan plan som har öppnats sedan (Codex 2026-10-25: Ångra efter ett byte av
  // plan skrev den förra planen över den nya).
  if (o.plan !== aktiv.id) { visaBesked('Ändringen gällde en annan plan och går inte att ångra här.'); return; }
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
// Det som har förts in räknas på värdena, så att en skattning, en mening eller ett resultat som har tömts inte räknas (Codex
// 2026-10-25). Ett resultat räknas från ett datum: dess nyckel är uppföljningens rad och tillfällets datum.
const harSkattning = () => Object.values(aktiv.foljd.skattning).some((v) => Object.keys(v ?? {}).length > 0);
const harVeckans = () => Object.values(aktiv.foljd.vecka).some((v) => !!v?.varde || !!v?.not);
const harResultat = (fran = '') => Object.entries(aktiv.foljd.resultat).some(([k, v]) => k.slice(k.indexOf('-') + 1) >= fran && Object.values(v ?? {}).some(Boolean));
function harFortIn(): boolean { return aktiv.foljd.gjorda.length > 0 || harSkattning() || harVeckans() || harResultat(); }
// Börja på ändrar vad varje vecka i planen är, så den låses av det som hör till planens veckor: bockar, skattningar, veckans
// gång och resultaten från första passet (Codex 2026-10-25, två gånger: det som förts in hamnade under ett annat steg).
// Läsningen före låser inte, eftersom den görs för att välja steget (användbarhetsprovet samma dag), också när starten
// flyttas och läsningens datum inte längre är veckan före (Codex samma dag).
function borjaLast(): boolean {
  return aktiv.foljd.gjorda.length > 0 || harSkattning() || harVeckans() || harResultat(plan.forstaPass ?? '9999');
}
// Låset på båda ställena där steget väljs, i formuläret och under Före, så snart något förs in.
function lasBorja() {
  if (!borjaval) return;
  const last = borjaLast();
  borjaval.disabled = last;
  $('pl-borja-not').hidden = !last;
  const fore = document.getElementById('pl-borja-fore') as HTMLSelectElement | null;
  if (fore) fore.disabled = last;
}
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
// En text som klistras in och är längre än fältets gräns kapas vid ett ord, med tre punkter sist (kapaVidOrd), i stället
// för mitt i ett ord där webbläsaren kapar den (K-543; buggjakten 2026-10-25: "Mycket lång anl." i sammanställningen).
// Elevlistan har ett namn per rad och kapas som förut.
sida.addEventListener('paste', (e) => {
  const falt = e.target;
  if (!(falt instanceof HTMLInputElement || falt instanceof HTMLTextAreaElement) || falt.maxLength <= 0 || falt === elevfalt) return;
  const a = falt.selectionStart ?? falt.value.length, b = falt.selectionEnd ?? a;
  const inklistrat = (e.clipboardData?.getData('text/plain') ?? '').replace(/\s+/g, ' ');
  // Det som ryms är fältets gräns utan texten före och efter markeringen, som står kvar (Codex 2026-10-25: texten efter
  // markören försvann).
  const rum = falt.maxLength - (falt.value.length - (b - a));
  if (inklistrat.length <= rum) return;
  e.preventDefault();
  const del = rum >= 2 ? kapaVidOrd(inklistrat, rum) : '';
  falt.value = falt.value.slice(0, a) + del + falt.value.slice(b);
  falt.setSelectionRange(a + del.length, a + del.length);
  falt.dispatchEvent(new Event('input', { bubbles: true }));
});
start.addEventListener('change', () => {
  // Ett tomt datum eller ett år långt bort säger till, och planen behåller sitt datum (buggjakten 2026-10-24: år 0001 blev 1901).
  if (!arDatum(start.value) || start.value < '2000-01-01' || start.value > '2099-12-31') {
    const tomt = !start.value;
    start.value = aktiv.val.start;
    visaBesked(tomt ? 'Planen behöver ett datum, så den har kvar sitt.' : 'Välj ett datum mellan år 2000 och 2099. Planen har kvar sitt datum.');
    return;
  }
  andra(() => { aktiv.val.start = start.value; }, nyPlan(flyttar() ? 'Passen har flyttats.' : undefined), flyttar());
});
// När insatsen har börjat gäller nya dagar från i dag, så att passen som har varit står kvar med bockarna och frånvaron
// (K-546; verifieringen 2026-10-25: ett byte av dagar räknade om alla pass från startdatumet). Före första passet ändras
// hela planen.
const dagarFranIdag = () => (aktiv.sparad || aktiv.franLank) && !!plan.forstaPass && plan.forstaPass <= idag;
for (const b of dagknappar) b.addEventListener('click', () => {
  const dag = Number(b.dataset.dag);
  const har = aktiv.val.dagar.includes(dag);
  if (har && aktiv.val.dagar.length === 1) { visaBesked('Planen behöver minst en dag.'); return; }
  const franIdag = dagarFranIdag();
  andra(() => {
    // Tiden som dagarna har, när de har samma (en tid för en dag före ett byte räknas inte).
    const tider = rentaTider(aktiv.val.tider);
    const forsta = [...aktiv.val.dagar].sort().map((d) => tider[String(d)]).find(Boolean);
    aktiv.val = bytDagar(aktiv.val, har ? aktiv.val.dagar.filter((x) => x !== dag) : [...aktiv.val.dagar, dag], franIdag ? idag : undefined, plan);
    // En ny dag får samma tid som de andra, när de har samma. En dag som har en tid sedan förut, före ett byte, behåller
    // den, så att passen som har varit behåller sina klockslag (Codex 2026-10-25).
    if (!har && forsta && !olikaTider && !rentaTider(aktiv.val.tider)[String(dag)]) aktiv.val.tider = { ...rentaTider(aktiv.val.tider), [String(dag)]: forsta };
  }, nyPlan(franIdag ? 'Dagarna gäller från i dag, och passen som har varit och dagens pass står kvar.' : flyttar() ? 'Passen har flyttats.' : undefined), franIdag || flyttar());
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
// Valet står i formuläret och under Före, och båda går hit.
function valjBorja(falt: HTMLSelectElement) {
  // Ett val som har hunnit låsas, som när ett resultat skrevs efter att valet ritades, går inte igenom (Codex 2026-10-25).
  if (borjaLast()) { rendera(); visaBesked($('pl-borja-not').textContent ?? ''); return; }
  const n = Number(falt.value);
  andra(() => { aktiv.val.borja = n > 1 ? n : undefined; aktiv.val.langd = forvaldLangd(mp, n); }, nyPlan(`Planen börjar på ${falt.selectedOptions[0]?.textContent ?? ''}.`), flyttar());
}
borjaval?.addEventListener('change', () => valjBorja(borjaval));
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
  andra(() => { aktiv.val.lov = har ? aktiv.val.lov!.filter((x) => x !== k) : [...(aktiv.val.lov ?? []), k].sort(); }, () => `${har ? `Inget lov i ${kalendervecka(Number(k.slice(5)))} längre.` : `Lov i ${kalendervecka(Number(k.slice(5)))}.`} Planen: ${sammanfattning()}.`, true);
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
type Elev = { id: string; namn: string; utkast?: true };
// fore: listan när läraren började skriva, och det som var infört då. radId: eleven som varje rad hör till. start: radernas
// elever när läraren började skriva.
let redigering: { plan: string; fore: Elev[]; foljd: HelFoljd; nya: Map<number, string>; radId: (string | undefined)[]; start: (string | undefined)[] } | null = null;
let elevNot = { plan: '', text: '' };
let elevTimer = 0;
// Elever som har lämnat listan medan sidan är öppen: skriver läraren namnet igen får eleven tillbaka det som förts in.
const borttagna = new Map<string, Elev[]>();
// Frågan under listan när en ny elev kom till i samma ändring som en annan elev togs bort (K-516): en fråga per ny elev, med
// de borttagna eleverna att välja bland. Den står kvar tills läraren svarar, också när listan ändras igen (Codex 2026-10-25).
let elevFraga: { plan: string; par: { ny: Elev; kandidater: Elev[] }[] } = { plan: '', par: [] };
// De nya elever som läraren har svarat Ny elev för, per plan, så att frågan inte kommer igen medan läraren skriver vidare
// (verifieringen 2026-10-25: frågan om Dan kom tillbaka efter varje ändring i listan).
const nyaBesvarade = new Map<string, Set<string>>();
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
    if (sett.size > ELEVLISTANS_LANGD) { utanfor.push(n); return ''; }
    return n;
  });
  // Samma namn som nu eller som när läraren började skriva är samma elev, så att ett namn som ändras fram och tillbaka
  // behåller sitt id.
  const kanda = [...aktiv.foljd.elever, ...r.fore, ...(borttagna.get(r.plan) ?? [])];
  const anvanda = new Set<string>();
  const lika = rader.map((n) => { if (!n) return null; const e = kanda.find((x) => x.namn === n && !anvanda.has(x.id)); if (e) anvanda.add(e.id); return e ? { id: e.id, namn: n } : null; });
  const foreNamn = (id: string) => r.fore.find((x) => x.id === id)?.namn;
  const namnFor = (id: string) => aktiv.foljd.elever.find((x) => x.id === id)?.namn ?? foreNamn(id);
  const radId: (string | undefined)[] = [];
  const elever = rader.flatMap((n, i): Elev[] => {
    // En tom rad behåller sin elev, så att ett namn som skrivs om efter en paus är samma elev.
    if (!n) { radId[i] = r.radId[i]; return []; }
    if (lika[i]) { radId[i] = lika[i]!.id; return [lika[i]!]; }
    // Ett nytt namn på en rad är radens elev med rättat namn när förnamnet är detsamma som elevens när läraren började skriva
    // (sammaElev i standarden), som "Ali" som blir "Ali S.", och eleven inte står kvar på en annan rad. Radens elev är den
    // som raden har nu eller hade när läraren började, så att en paus mitt i ett namn inte byter elev. Ett annat förnamn är
    // en ny elev, och läraren får frågan om det är samma (K-516: Nova på Annas rad fick Annas skattningar och resultat).
    const agare = [r.radId[i], r.start[i]].find((id): id is string => !!id && !anvanda.has(id) && foreNamn(id) !== undefined && sammaElev(foreNamn(id)!, n) && !rader.some((x, j) => j !== i && (x === foreNamn(id) || x === namnFor(id))));
    if (agare) { anvanda.add(agare); radId[i] = agare; return [{ id: agare, namn: n }]; }
    let id = r.nya.get(i);
    if (!id || anvanda.has(id)) { id = `e${nyttId().slice(0, 4)}`; r.nya.set(i, id); }
    anvanda.add(id);
    radId[i] = id;
    return [{ id, namn: n }];
  });
  r.radId = radId;
  // De nya eleverna: de som fick sitt id medan läraren skrev. En elev som känns igen på namnet, också en som togs bort
  // tidigare, är ingen ny elev.
  const nya = new Set(r.nya.values());
  return { elever, dubbletter: [...new Set(dubbletter)], utanfor, kortade, enBokstav: [...new Set(enBokstav)], nyaElever: elever.filter((e) => nya.has(e.id)) };
}
// Ta bort elevernas namn: namnen blir "en elev" i lärarens meningar, eftersom läraren har bett om att namnen tas bort.
// kvar: eleverna som står kvar, vars hela namn skyddas (utanNamn i standarden).
function utanGamlaNamn(namn: { namn: string }[], kvar: Elev[]) {
  if (!namn.length) return;
  const f = aktiv.foljd;
  const tvatta = <T extends { not?: string }>(x: T): T => (x.not ? { ...x, not: utanNamn(x.not, namn, kvar) } : x);
  f.vecka = Object.fromEntries(Object.entries(f.vecka).map(([k, v]) => [k, tvatta(v)]));
  if (f.avstamning) f.avstamning = tvatta(f.avstamning);
  if (f.utvardering) f.utvardering = tvatta(f.utvardering);
}
const startaRedigering = () => { if (!redigering || redigering.plan !== aktiv.id) redigering = { plan: aktiv.id, fore: aktiv.foljd.elever, foljd: structuredClone(aktiv.foljd), nya: new Map(), radId: aktiv.foljd.elever.map((e) => e.id), start: aktiv.foljd.elever.map((e) => e.id) }; };
// skriver: medan läraren skriver. tyst: sidan sparar, som när läraren byter flik, och redigeringen fortsätter (Codex
// 2026-10-24: ett flikbyte mitt i ett namn gav eleven ett nytt id). klar: läraren har lämnat fältet. slut: planen byts.
function uppdateraElevlistan(lage: 'skriver' | 'tyst' | 'klar' | 'slut') {
  window.clearTimeout(elevTimer);
  elevTimer = 0;
  if (!redigering || redigering.plan !== aktiv.id) { redigering = null; return; }
  const r = redigering;
  const { elever, dubbletter, utanfor, kortade, enBokstav, nyaElever } = lasElevlistan(elevfalt.value, r);
  // Ett namn som sparas medan läraren skriver är ett utkast tills hen lämnar fältet, så att en annan flik som läser listan
  // inte sparar det som ett tidigare namn (Codex 2026-10-25: "Be" från en flik tvättade bort ordet "be" i en annan).
  // Ett namn som inte har ändrats behåller sitt märke, också ett utkast från en annan flik (Codex 2026-10-25).
  aktiv.foljd.elever = elever.map((e) => {
    const fore = r.fore.find((x) => x.id === e.id && x.namn === e.namn);
    return fore ? (fore.utkast ? { ...e, utkast: true as const } : e) : lage === 'klar' || lage === 'slut' ? e : { ...e, utkast: true as const };
  });
  $('pl-elever-bort').hidden = !elever.length;
  elevNot = { plan: aktiv.id, text: [
    utanfor.length ? `${uppraknat(utanfor)} kom inte med: elevlistan rymmer ${talText(ELEVLISTANS_LANGD)} elever.` : '',
    ...dubbletter.map((n) => `${n} står två gånger. Skriv två olika namn, som ${n} A och ${n} B.`),
    kortade.length ? `Ett namn får vara högst 30 tecken, så ${uppraknat(kortade.map((x) => `"${x}"`))} är ${kortade.length === 1 ? 'kortat' : 'kortade'}.` : '',
    // En enda bokstav går inte att skilja från ett ord i en mening ("I dag"), så den byts inte mot "en elev" i texten som kopieras.
    enBokstav.length ? `${uppraknat(enBokstav)} har en bokstav och byts inte ut i texten som kopieras. Skriv minst två, som förnamnet eller två initialer.` : '',
  ].filter(Boolean).join(' ') };
  visaElevNot();
  const borta = r.fore.filter((e) => !elever.some((x) => x.id === e.id));
  const gamla = r.fore.filter((e) => { const ny = elever.find((x) => x.id === e.id); return !ny || !sammaElev(e.namn, ny.namn); });
  // Ett namn som lämnar listan sparas med planen när listan sparas, också medan läraren skriver, så att texterna som lämnar
  // webbläsaren tvättar bort det i varje flik (elevernasNamn), och lärarens meningar står kvar som hen skrev dem (K-537;
  // Codex 2026-10-25: en annan flik läste listan utan namnet och meningarna med det).
  // Varje namn som inte längre står i listan sparas, också när en elev bara har fått ett annat efternamn (Codex 2026-10-25:
  // "Ali Andersson" blev "en elev Andersson" när namnet ändrades till Ali Svensson). Namnen jämförs med listan före
  // ändringen, inte med det som sparas medan läraren skriver: ett halvt namn som "Be" skulle tvätta bort ordet "be".
  // Ett utkast från en annan flik är inget tidigare namn.
  const tidigare = r.fore.filter((e) => !e.utkast && !elever.some((x) => x.id === e.id && x.namn === e.namn));
  if (tidigare.length) aktiv.foljd = { ...aktiv.foljd, borttagna: [...new Set([...(aktiv.foljd.borttagna ?? []), ...tidigare.map((e) => e.namn)])] };
  if (lage === 'klar' || lage === 'slut') {
    if (borta.length) borttagna.set(r.plan, [...(borttagna.get(r.plan) ?? []).filter((x) => !borta.some((b) => b.id === x.id)), ...borta]);
    redigering = null;
  }
  if (lage === 'klar' && document.activeElement !== elevfalt) elevfalt.value = elever.map((e) => e.namn).join('\n');
  // En ny elev i samma ändring som en elev togs bort får frågan under listan, med de borttagna att välja bland, och de
  // borttagna sägs där i stället för i ett besked. Det går inte att veta vem en ny elev ersätter ur raderna, eftersom
  // läraren kan flytta och ta bort rader medan hen skriver (Codex 2026-10-25). Frågan kommer medan läraren skriver, inte
  // först när fältet lämnas (Samma sak överallt samma dag), och en fråga som inte är besvarad står kvar så länge den nya
  // eleven står i listan och någon av de borttagna inte gör det.
  const finns = (id: string) => elever.some((e) => e.id === id);
  const kvar = elevFraga.plan === r.plan ? elevFraga.par.map((p) => ({ ...p, kandidater: p.kandidater.filter((k) => !finns(k.id)) })).filter((p) => finns(p.ny.id) && p.kandidater.length) : [];
  const nyaFragor = borta.length ? nyaElever.filter((e) => !kvar.some((p) => p.ny.id === e.id) && !nyaBesvarade.get(r.plan)?.has(e.id)).map((ny) => ({ ny, kandidater: borta })) : [];
  elevFraga = { plan: r.plan, par: [...kvar, ...nyaFragor] };
  visaElevFraga();
  sparaTyst();
  renderaVeckan();
  if (lage !== 'klar') return;
  const gruppSkattad = !r.fore.length && Object.values(aktiv.foljd.skattning).some((v) => v?.[GRUPPEN]);
  const bara = borta.filter((e) => !elevFraga.par.some((p) => p.kandidater.some((k) => k.id === e.id)));
  const angra = { text: 'Ångra', kvar: true, gor: () => {
    if (aktiv.id !== r.plan) return;
    // Namnen som lämnar listan när den återställs sparas också (Codex 2026-10-25: Ali Svensson efter Ångra).
    const ut = aktiv.foljd.elever.filter((e) => !r.fore.some((x) => x.id === e.id && x.namn === e.namn));
    if (ut.length) aktiv.foljd = { ...aktiv.foljd, borttagna: [...new Set([...(aktiv.foljd.borttagna ?? []), ...ut.map((e) => e.namn)])] };
    aktiv.foljd.elever = r.fore;
    elevNot = { plan: '', text: '' };
    elevFraga = { plan: '', par: [] };
    sparaTyst();
    elevfalt.value = r.fore.map((e) => e.namn).join('\n');
    rendera();
    visaBesked('Elevlistan är tillbaka.');
  } };
  // Ett rättat namn är samma elev (sammaElev), och beskedet säger det, så att läraren ser vad som följde med och kan ångra
  // (användbarhetsprovet 2026-10-25: "Dina K fick Dinas utan fråga").
  const rattade = r.fore.flatMap((e) => { const ny = elever.find((x) => x.id === e.id); return ny && ny.namn !== e.namn ? [`${e.namn} heter nu ${ny.namn}`] : []; });
  if (bara.length) visaBesked(`${uppraknat(bara.map((e) => e.namn))} ${bara.length === 1 ? 'är borttagen' : 'är borttagna'} ur elevlistan.`, angra);
  else if (rattade.length) visaBesked(`${uppraknat(rattade)}, med det som förts in.`, angra);
  else if (gruppSkattad && elever.length) visaBesked('Gruppens skattningar finns kvar i sammanställningen, under Gruppen.');
}
// Gruppens storlek mot metodens (faktarutans grupp), så att en grupp som metoden inte är skriven för syns (de kalla
// testarna 2026-10-24: Seriesamtal är för en till fyra elever).
const storlekNot = () => {
  const n = aktiv.foljd.elever.length, g = data.grupp;
  if (!n || !g || (!(g.max && n > g.max) && !(g.min && n < g.min))) return '';
  return `Metoden är skriven för ${liten(g.text).replace(/\.$/, '')}, och listan har ${n === 1 ? 'en' : n}.`;
};
const visaElevNot = () => { const t = [elevNot.plan === aktiv.id ? elevNot.text : '', storlekNot()].filter(Boolean).join(' '); $('pl-elever-not').textContent = t; $('pl-elever-not').hidden = !t; visaElevFraga(); };
// Frågan om samma elev: Samma elev ger den nya eleven den borttagnas id, så att det som förts in följer med namnet. Det som
// förts in om den nya eleven efter ändringen är det senaste och gäller, också där den borttagna hade ett värde samma vecka,
// och Ångra tar tillbaka listan som den var (Codex 2026-10-25: det äldre värdet vann och gick inte att ångra). Ny elev
// låter listan vara.
function visaElevFraga() {
  const ruta = $('pl-elever-fraga');
  const namnPa = (id: string) => aktiv.foljd.elever.find((e) => e.id === id)?.namn;
  const par = elevFraga.plan === aktiv.id ? elevFraga.par.filter((x) => namnPa(x.ny.id)) : [];
  ruta.hidden = !par.length;
  ruta.innerHTML = par.map((x) => {
    const ny = esc(namnPa(x.ny.id)!), en = x.kandidater.length === 1;
    const fraga = en ? `${esc(x.kandidater[0].namn)} är borttagen och ${ny} är ny i listan. Är ${ny} samma elev som ${esc(x.kandidater[0].namn)}, med rättat namn?` : `${esc(uppraknat(x.kandidater.map((k) => k.namn)))} är borttagna och ${ny} är ny i listan. Är ${ny} samma elev som någon av dem?`;
    const knappar = x.kandidater.map((k) => `<button type="button" class="knapp sekundar liten" data-samma-elev="${esc(x.ny.id)}|${esc(k.id)}">${en ? 'Samma elev' : `Samma som ${esc(k.namn)}`}</button>`).join('');
    return `<p>${fraga}</p><p class="pl-andra-knappar">${knappar}<button type="button" class="knapp sekundar liten" data-ny-elev="${esc(x.ny.id)}">Ny elev</button></p>`;
  }).join('');
}
function sammaElevSom(ny: Elev, forut: Elev) {
  const f = aktiv.foljd;
  f.elever = f.elever.map((e) => (e.id === ny.id ? { id: forut.id, namn: e.namn } : e));
  for (const varden of [...Object.values(f.skattning), ...Object.values(f.resultat)] as Record<string, unknown>[]) {
    if (varden[ny.id] !== undefined) { varden[forut.id] = varden[ny.id]; delete varden[ny.id]; }
  }
  for (const [dag, lista] of Object.entries(f.franvaro)) f.franvaro[dag] = [...new Set(lista.map((x) => (x === ny.id ? forut.id : x)))];
  borttagna.set(aktiv.id, (borttagna.get(aktiv.id) ?? []).filter((x) => x.id !== forut.id));
}
$('pl-elever-fraga').addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('button');
  const [nyId, forutId] = (b?.dataset.sammaElev ?? b?.dataset.nyElev ?? '').split('|');
  const x = elevFraga.par.find((p) => p.ny.id === nyId);
  if (!b || !x || elevFraga.plan !== aktiv.id) return;
  const fragorFore = { plan: elevFraga.plan, par: elevFraga.par.map((p) => ({ ny: p.ny, kandidater: [...p.kandidater] })) };
  elevFraga.par = elevFraga.par.filter((p) => p !== x);
  const forut = x.kandidater.find((k) => k.id === forutId);
  const ny = aktiv.foljd.elever.find((el) => el.id === x.ny.id);
  if (!b.dataset.sammaElev || !forut || !ny) {
    if (b.dataset.nyElev) nyaBesvarade.set(aktiv.id, new Set([...(nyaBesvarade.get(aktiv.id) ?? []), x.ny.id]));
    visaElevFraga();
    return;
  }
  // En borttagen elev kan bara vara en av de nya: den som redan står i listan går inte att välja igen, och de andra frågorna
  // erbjuder den inte längre (Codex 2026-10-25: två nya elever kunde få samma elevs id).
  if (aktiv.foljd.elever.some((e) => e.id === forut.id)) { visaElevFraga(); return; }
  const fore = ogonblick();
  sammaElevSom(ny, forut);
  elevFraga.par = elevFraga.par.map((p) => ({ ...p, kandidater: p.kandidater.filter((k) => k.id !== forut.id) })).filter((p) => p.kandidater.length);
  sparaTyst();
  rendera();
  // Ångra tar tillbaka listan och frågorna, så att läraren kan svara igen.
  visaBesked(`${ny.namn} är samma elev som ${forut.namn}, med det som förts in.`, { text: 'Ångra', kvar: true, gor: () => { elevFraga = fragorFore; aterstall(fore, 'Elevlistan är som före.'); visaElevFraga(); } });
});
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
    utanGamlaNamn(elevernasNamn(aktiv.foljd), []);
    aktiv.foljd = { ...aktiv.foljd, elever: [], franvaro: {}, resultat: {}, skattning: kvar(aktiv.foljd.skattning), borttagna: [] };
    elevNot = { plan: '', text: '' };
    elevFraga = { plan: '', par: [] };
    borttagna.delete(aktiv.id);
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
// Veckans namn ur standarden (veckansNamn och planveckanKort), som i sammanställningen, pdf:erna och texterna (K-508).
const rubrikVecka = (v: PlanVecka) => `Vecka ${planveckansNamn(plan, v).plan}`;
const radFor = (v: PlanVecka) => (v.steg !== null && v.steg !== undefined ? data.progression?.rader[v.steg] : undefined);
// Progressionens rader i veckan: veckans rad, eller i en progression i pass raderna för veckans pass, i ordning (betan
// 2026-10-24: Seriesamtal har sina steg pass för pass).
const radernaI = (v: PlanVecka) => {
  const rad = radFor(v);
  if (rad) return [rad];
  const steg = [...new Set(v.pass.map((n) => passetMedNr(plan, n)?.steg).filter((x): x is number => x !== null && x !== undefined))].sort((a, b) => a - b);
  return steg.map((i) => data.progression!.rader[i]).filter(Boolean);
};
// Veckans namn i Hela planen: steget, och i en metod med steg i pass passens namn, som passets rubrik och kalendern säger
// dem (passetFor), så att en vecka med två steg säger båda (K-547; verifieringen 2026-10-25: vecka 1 i Seriesamtal hette
// Bildserie 1, Fönsterplatsen, fast pass 2 samma vecka var Spelet).
const veckansFokus = (v: PlanVecka) => {
  const namn = mp.stegEnhet === 'pass' ? [...new Set(veckansPass(plan, v).map((p) => passetFor(p).namn).filter(Boolean))] : [];
  return uppraknat(namn.length ? namn : [...new Set(radernaI(v).map((r) => r.kort).filter(Boolean))]);
};
const uppfoljningI = (v: PlanVecka) => plan.uppfoljning.flatMap((u) => u.tillfallen.filter((t) => t.vecka === v.nr).map((t) => ({ ...u, ...t })));
const efterUppfoljning = () => plan.uppfoljning.filter((u) => u.typ === 'efter');
// Är passen slut (insatsenSlut), och är insatsen avslutad, av läraren eller av sig själv två veckor efter sista passet
// (insatsenAvslutad), med standardens regler, som metodbanken och metodens sida också läser.
const slutNu = () => insatsenSlut(plan.sistaPass, idag);
const avslutadNu = () => insatsenAvslutad(plan.sistaPass, aktiv.foljd.utvardering?.beslut, idag, aktiv.foljd.oppen, planensSistaDag(plan));
// Dagen då planen avslutas av sig själv, två veckor efter planens sista dag, om läraren inte avslutar den före, och vad
// dagen räknas från.
const sistaDagen = () => planensSistaDag(plan) ?? plan.sistaPass ?? '';
const avslutasSjalv = () => (sistaDagen() ? plusDagar(sistaDagen(), AVSLUTAS_EFTER) : '');
const sjalvFran = () => (sistaDagen() === plan.sistaPass ? 'sista passet' : 'uppföljningen efter insatsen');
// Hur en insats som inte är avslutad fortsätter, lika i lägesraden och i beskeden: före sista passets dag pågår den, och efter
// den pågår den tills läraren avslutar den om hen har öppnat den igen, och annars till dagen då den avslutas av sig själv
// (Codex 2026-10-25: beskedet lovade att planen stod öppen, fast den avslutades av sig själv två veckor senare).
const fortsatter = () => (!slutNu() ? 'Insatsen pågår.' : aktiv.foljd.oppen === plan.sistaPass ? 'Insatsen pågår tills du avslutar den.' : `Planen avslutas av sig själv ${dagText(avslutasSjalv())}, om du inte avslutar den före.`);
// Vyn som sidan öppnar: Före till första passets dag, veckan gruppen är i, och Efter insatsen när passen är slut
// (Opus och Sonnet 2026-10-24: Före som en egen flik först bland veckorna).
const nuVy = (): Vy => (slutNu() ? 'efter' : plan.forstaPass && idag < plan.forstaPass && harFore() ? 'fore' : veckanFor(plan, idag)?.nr ?? 1);
// Planen har börjat när dess första vecka har börjat; före det är ingen vecka den här veckan (de kalla läsarna 2026-10-24).
const harBorjat = () => !!plan.veckor.length && idag >= plan.veckor[0].mandag;
const visadVy = (): Vy => (visa === 'efter' || (visa === 'fore' && harFore()) || (typeof visa === 'number' && plan.veckor[visa - 1]) ? visa : nuVy());
const gjort = (dag: string) => aktiv.foljd.gjorda.includes(dag);
// En vecka går att bocka och skatta från sin måndag (Niclas 2026-10-25: "Alltså från måndag 00.01 kan man bocka den veckas
// pass"; buggjakten samma dag: en vecka längre fram gick att skatta, medan sammanställningen sa att inget pass hade varit).
const harBorjatVecka = (mandag: string) => mandag <= idag;
const passetsTidText = (p: Pass) => { const t = passetsTid(aktiv.val, p); return t ? tidsspann(t) : ''; };
// Veckans pass som små rutor: bockat, varit men inte bockat, och kommande.
const rutor = (v: PlanVecka) => {
  const pass = veckansPass(plan, v);
  const antal = pass.filter((p) => gjort(passetsDag(p))).length;
  return `<span class="pl-rutor" role="img" aria-label="${antal} av ${pass.length} pass bockade">${pass.map((p) => `<span class="pl-ruta${gjort(passetsDag(p)) ? ' gjord' : p.datum <= idag ? ' varit' : ''}"></span>`).join('')}</span>`;
};

function renderaSumma() {
  const n = plan.pass.length;
  const dagar = stor(dagarText(aktiv.val));
  // Uppföljningen efter heter Efter insatsen i planen; metodens egen rubrik står i Efter insatsen (de kalla läsarna:
  // "Efter sex till åtta veckor" i en plan på sex veckor).
  // Uppföljningens rader med standardens ord, som i texterna och pdf:en; en rad efter insatsen som görs några veckor efter
  // heter som i metoden, så att två rader inte heter likadant (de kalla testarna 2026-10-24).
  const uppf = uppfoljningensRader(plan, info());
  const antal = aktiv.val.dagar.length;
  const farre = antal < mp.takt.min || antal > mp.takt.max ? `Metoden har ${mp.takt.min === mp.takt.max ? mp.takt.min : `${mp.takt.min} till ${mp.takt.max}`} pass i veckan, och planen har ${antal}.` : '';
  // Pass mellan jul och trettondagen: loven skiljer sig mellan skolor, så planen föreslår inget, men säger till.
  const iJulen = (datum: string) => { const [, m, d] = datum.split('-').map(Number); return (m === 12 && d >= 21) || (m === 1 && d <= 6); };
  // Bara det som kommer (verifieringen 2026-10-25: varningen stod kvar efter insatsen).
  const kommer = (datum: string) => iJulen(datum) && datum >= idag;
  const julveckor = [...new Set(plan.pass.map((p) => p.datum).filter(kommer).map((d) => kalendervecka(isoVecka(d).vecka)))];
  const julUppfoljning = [...new Set(efterUppfoljning().flatMap((u) => u.tillfallen.map((x) => x.datum)).filter(kommer).map((d) => kalendervecka(isoVecka(d).vecka)))];
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
  const kortare = ejNadda.length && !plan.slut ? `Med ${langdText} når gruppen inte ${uppraknat(ejNadda)} i metoden.` : '';
  const tomma = data.progression && mp.stegEnhet === 'veckor' ? plan.veckor.filter((v) => v.steg === null).length : 0;
  const langre = tomma ? `Planen är längre än metodens progression, så ${tomma === 1 ? 'en vecka' : `${tomma} veckor`} har inget eget fokus i metoden.` : '';
  $('pl-summa-text').innerHTML = n
    ? `<p class="pl-tal">${n} pass om ${esc(minuterText(langd))} minuter</p><p>${esc(dagar)}, ${esc(datumspann(plan.forstaPass!, plan.sistaPass!))}.</p>${plan.slut ? `<p>${esc(utvarderingenText(plan, aktiv.foljd.utvardering, !slutNu()))}</p>` : ''}${uppf.length ? `<p>${esc(uppf.join('. '))}.</p>` : ''}${[redanVarit, farre, annanLangd, kortare, langre].filter(Boolean).map((x) => `<p class="pl-varning">${esc(x)}</p>`).join('')}${julveckor.length ? `<p class="pl-varning">Planen har pass i ${esc(uppraknat(julveckor))}, vid jul och nyår. Är det lov hos er, tryck på ${julveckor.length > 1 ? 'veckorna' : 'veckan'} under Lov${aktiv.sparad ? ' i Ändra planen' : ''}.</p>` : ''}${julUppfoljning.length ? `<p class="pl-varning">Uppföljningen efter insatsen hamnar i ${esc(uppraknat(julUppfoljning))}, vid jul och nyår. Är det lov hos er, gör den första veckan efter lovet.</p>` : ''}${malRad('planen')}`
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
  const lovrad = (m: string) => `<li class="pl-lovvecka"><span class="pl-v">Lov</span><span class="pl-d">${esc(spannKort(m, plusDagar(m, 4)))}</span><span class="pl-innehall"><span class="pl-pass">${kalendervecka(isoVecka(m).vecka)}</span><span class="pl-fokus">Inga pass</span><button type="button" class="pl-textknapp" data-lov-bort="${esc(veckonyckel(m))}" aria-label="Ta bort lovet i ${kalenderveckaUtskriven(isoVecka(m).vecka)}">Ta bort lovet</button></span></li>`;
  const foljer = klick && aktiv.folj;
  const mitt = mittVeckan(plan);
  for (const v of plan.veckor) {
    for (const m of lovFore(v)) rader.push(lovrad(m));
    const { fran: f, till: t } = veckansDagar(plan, v);
    const steg = radernaI(v)[0];
    const passText = passnummerText(v.pass) || 'Inga pass';
    const marken = [
      ...uppfoljningI(v).map((u) => `<span class="pl-markering uppf">${esc(veckorI(data.uppfoljning.rader[u.rad]?.nar) ? 'Uppföljning' : uppfNamn(u.rad))}</span>`),
      ...(aktiv.folj && v.nr === mitt && v.nr !== plan.veckor.length ? ['<span class="pl-markering stam">Avstämning</span>'] : []),
      ...(v.bortfall.length ? [`<span class="pl-markering bort">${v.bortfall.length === 1 ? 'Ett pass faller bort' : `${v.bortfall.length} pass faller bort`}</span>`] : []),
      ...(vy === v.nr ? ['<span class="pl-markering nu">Den här veckan</span>'] : []),
      ...(plan.slut && v.nr === plan.veckor.length ? [`<span class="pl-markering struken">Slutar med pass ${plan.sistaNr}</span>`] : []),
    ];
    rader.push(`<li class="${[vy === v.nr ? 'nu' : '', v.igen ? 'igen' : ''].filter(Boolean).join(' ')}">${rad(`data-vy="${v.nr}"`, `<span class="pl-v">${esc(rubrikVecka(v))}</span><span class="pl-d">${esc(spannKort(f, t))}</span><span class="pl-innehall"><span class="pl-pass">${passText} · ${kalendervecka(v.vecka.vecka)}${foljer && v.pass.length ? rutor(v) : ''}</span>${steg ? `<span class="pl-fokus">${esc(veckansFokus(v))}</span>` : ''}${marken.length ? `<span class="pl-marken">${marken.join('')}</span>` : ''}</span>`)}</li>`);
  }
  // Före första passet först, med det som görs då (Opus och Sonnet 2026-10-24).
  if (harFore() && plan.veckor.length) {
    const marken = uppfoljningensTillfallen(plan).filter((x) => x.vecka === 0).map((x) => `<span class="pl-markering uppf">${esc(uppfNamn(x.rad))}</span>`).join('');
    rader.unshift(`<li class="fore${vy === 'fore' ? ' nu' : ''}">${rad('data-vy="fore"', `<span class="pl-v">Före</span><span class="pl-d">${esc(idag > plusDagar(plan.fore.mandag, 4) && plan.forstaPass ? `före ${spannKort(plan.forstaPass, plan.forstaPass)}` : spannKort(plan.fore.mandag, plusDagar(plan.fore.mandag, 4)))}</span><span class="pl-innehall"><span class="pl-pass">${kalendervecka(isoVecka(plan.fore.mandag).vecka)}</span><span class="pl-fokus">Före första passet</span>${marken ? `<span class="pl-marken">${marken}</span>` : ''}</span>`)}</li>`);
  }
  for (const m of plan.lovveckor.filter((x) => plan.veckor.length && x > plan.veckor[plan.veckor.length - 1].mandag)) rader.push(lovrad(m));
  // Veckorna som avslutet strök, överstrukna och utan att gå att öppna, före Efter insatsen (K-542; Niclas 2026-10-25:
  // "tydligt blir som gråad eller streckad").
  const strukna = plan.struket?.veckor ?? [];
  if (strukna.length) {
    const hela = helaVeckorna(plan);
    const forst = strukna[0], sist = strukna[strukna.length - 1];
    const nr = strukna.flatMap((v) => v.pass);
    const namn = strukna.length === 1 ? `Vecka ${planveckansNamn(hela, forst).plan}` : `Vecka ${planveckansNamn(hela, forst).plan}–${planveckansNamn(hela, sist).plan}`;
    const passText = passnummerText(nr) || 'Inga pass';
    rader.push(`<li class="pl-struken"><div class="pl-veckoknapp"><span class="pl-v">${esc(namn)}</span><span class="pl-d">${esc(spannKort(forst.mandag, plusDagar(sist.mandag, 4)))}</span><span class="pl-innehall"><span class="pl-pass">${esc(passText)} · ${esc(kalenderveckornaFor(strukna.map((v) => v.mandag)))}</span><span class="pl-fokus">${slutNu() || avslutadNu() ? 'Strukna när insatsen avslutades' : 'Stryks när insatsen avslutas'}</span></span></div></li>`);
  }
  if (plan.veckor.length) {
    // Efter insatsen: metodens uppföljning efter och, när läraren följer insatsen, utvärderingen.
    const efter = efterUppfoljning();
    const datum = efter.flatMap((u) => u.tillfallen.map((x) => x.datum)).sort()[0] ?? plan.efter;
    const marken = [
      ...efter.slice(0, 1).map(() => '<span class="pl-markering uppf">Uppföljningen efter</span>'),
      ...(aktiv.folj ? ['<span class="pl-markering stam">Utvärdering</span>'] : []),
      ...(vy === 'efter' ? ['<span class="pl-markering nu">Nu</span>'] : []),
    ];
    rader.push(`<li class="efter${vy === 'efter' ? ' nu' : ''}">${rad('data-vy="efter"', `<span class="pl-v">Efter</span><span class="pl-d">${esc(spannKort(datum, plusDagar(datum, 4)))}</span><span class="pl-innehall"><span class="pl-pass">${kalendervecka(isoVecka(datum).vecka)}</span><span class="pl-fokus">Efter insatsen</span>${marken.length ? `<span class="pl-marken">${marken.join('')}</span>` : ''}</span>`)}</li>`);
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
// står ett ord med stor bokstav före ett namn på ett ord, som i "Laminerat Bildserie 1–6", är namnet det sista ordet
// (sakspann i standarden, som bygget också läser).
const medSpann = (text: string) => {
  let ut = '', fran = 0;
  for (const x of sakspann(text)) {
    const spannet = (namn: string) => x.nummer.map((nr) => data.saker.find((s) => s.namn === `${namn} ${nr}`));
    const namn = x.namn.find((n) => spannet(n).every(Boolean));
    if (!namn) continue;
    const start = x.index + x.text.length - namn.length;
    ut += esc(text.slice(fran, start)) + spannet(namn).map((s, i, alla) => `${i === 0 ? '' : i === alla.length - 1 ? ' och ' : ', '}${sakLank(s!, i === 0 ? `${namn} ${x.nummer[0]}` : String(x.nummer[i]))}`).join('');
    fran = x.index + x.langd;
  }
  return ut + esc(text.slice(fran));
};
// Metodens veckor heter som planens, också när planen börjar högre upp i en stege (veckornaIPlanen i standarden, K-515). Ett
// namn, som Mina lärdomar: vecka 1–2, är sakens namn och står som det är.
const lankad = (text: string) => sakdelar(text, data.saker).map((x) => (x.sak === undefined ? medSpann(veckornaIPlanen(x.text, plan.borja)) : sakLank(data.saker[x.sak], x.text))).join('');
const skala = (attr: string, valt: number | undefined, namn: string) => `<div class="pl-skala" role="group" aria-label="${esc(namn)}">${[1, 2, 3, 4, 5].map((x) => `<button type="button" class="pl-skalsteg" ${attr}="${x}" aria-pressed="${valt === x}" aria-label="${x}, ${esc(SKALAN[x - 1].toLocaleLowerCase('sv'))}">${x}</button>`).join('')}</div>`;
// Veckans gång för gruppen i ord, så att den inte förväxlas med skattningens siffror (de kalla läsarna 2026-10-24).
const GANG = ['Svår', 'Ganska svår', 'Okej', 'Bra', 'Mycket bra'];
const PIL: Record<string, string> = { upp: '↑', samma: '→', ned: '↓' };
// Nivåernas knappar, när veckan behöver gruppens nivå (nivåns rad i en tabell, och bankens poster).
const nivaval = (nivaer: { slug: string; farg: string; namn: string }[]) => `<div class="sk-nivaknappar pl-nivaer">${nivaer.map((n) => `<button type="button" class="sk-niva" data-valj-niva="${esc(n.slug)}" style="--niva:${esc(n.farg)}" aria-pressed="false">${esc(n.namn)}</button>`).join('')}</div>`;
const beslutsknappar = (slag: 'avstamning' | 'utvardering') => `<div class="pl-beslut" role="group" aria-label="${slag === 'avstamning' ? 'Avstämningens beslut' : 'Utvärderingens beslut'}">${BESLUTEN[slag].map((b) => `<button type="button" class="knapp sekundar liten" data-beslut="${slag}|${b}" aria-pressed="${aktiv.foljd[slag]?.beslut === b}">${esc(BESLUT[b as keyof typeof BESLUT])}</button>`).join('')}</div>`;
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
const resultatfalt = (nyckel: string) => (harElever() ? `<div class="pl-resultat"><span class="pl-hjalp">Resultat för varje elev, om du vill</span>${aktiv.foljd.elever.map((e) => `<label><span>${esc(e.namn)}</span><input class="pl-falt" type="text" maxlength="40" data-resultat="${esc(nyckel)}|${esc(e.id)}" value="${esc(aktiv.foljd.resultat[nyckel]?.[e.id] ?? '')}" /></label>`).join('')}</div>` : '');
// Uppföljningens namn ur standarden, som i raden och texterna: Efter insatsen för den första efter insatsen (buggjakten
// 2026-10-25: Efter-sidan sa "Efter sex till åtta veckor" om en plan på fyra veckor).
const uppfRad = (x: { nyckel: string; rad: number; datum: string; vecka: number | null }) => `<li><span class="pl-etikett">${esc(uppfNamn(x.rad))} · ${x.vecka === null ? kalendervecka(isoVecka(x.datum).vecka) : esc(dagText(x.datum))}</span><p>${lankad(data.uppfoljning.rader[x.rad].vad)}</p>${resultatfalt(x.nyckel)}</li>`;
const meningsfalt = (id: string, etikett: string, attr: string, varde: string) => `<label class="pl-etikett" for="${id}">${esc(etikett)}</label><input class="pl-falt pl-brett" type="text" id="${id}" maxlength="200" ${attr} value="${esc(varde)}" /><p class="pl-hjalp">Meningen står i sammanställningen och i texten som kopieras, utan elevernas namn.</p>`;
// Det ett avslut stryker, ur planens struket: passen efter sista passet i veckan och veckorna efter, en eller två veckor med
// namn och fler som ett spann (K-542): "pass 14 och 15 i veckan och vecka 6 till 8 (v. 45–47)". Veckorna heter som i
// planen utan avslutet, så att en upprepning räknas rätt.
const helaVeckorna = (p: Plan) => ({ ...p, veckor: [...p.veckor, ...(p.struket?.veckor ?? [])] });
const struketText = (p: Plan) => {
  const sista = p.veckor[p.veckor.length - 1];
  // Ett pass i en tidigare vecka som har flyttats till efter sista passet stryks också, och då står passen utan i veckan.
  const passen = (p.struket?.pass ?? []).filter((x) => x.vecka <= (sista?.nr ?? 0));
  const iVeckan = passen.every((x) => x.vecka === sista?.nr);
  const veckorna = p.struket?.veckor ?? [];
  const namn = (v: PlanVecka) => planveckansNamn(helaVeckorna(p), v);
  const vText = veckorna.length > 2 ? `vecka ${namn(veckorna[0]).plan} till ${namn(veckorna[veckorna.length - 1]).plan} (${kalenderveckornaFor(veckorna.map((x) => x.mandag))})` : uppraknat(veckorna.map((x) => namn(x).text));
  return uppraknat([passen.length ? `${uppraknat(passen.map((x) => `pass ${x.nr}`))}${iVeckan ? ' i veckan' : ''}` : '', vText].filter(Boolean));
};
// Passen i en vecka som kan bli insatsens sista: de före planens sista pass, efter datum, lika i formuläret och för knappen
// under utvärderingen (Codex 2026-10-25: knappen ledde till en vecka utan formuläret).
const slutpassI = (v: PlanVecka) => iDatumordning(veckansPass(plan, v)).filter((p) => !!plan.sistaPass && p.datum < plan.sistaPass);
// Sista passet i en mening, i dåtid när det har varit: "Sista passet var onsdag 21 oktober." eller "Sista passet är i dag, …".
const sistaPassetText = () => (plan.sistaPass ? `Sista passet ${plan.sistaPass < idag ? 'var' : 'är'} ${plan.sistaPass === idag ? 'i dag, ' : ''}${dagText(plan.sistaPass)}.` : '');
// Vad ett avslut med ett visst sista pass gör med planen, i formuläret innan läraren avslutar (K-542).
function avslutaText(nr: number): string {
  const prov = planera(mp, { ...aktiv.val, slut: nr });
  if (!prov.slut || !prov.sistaPass) return '';
  return `Insatsen slutar med pass ${prov.sistaNr}, ${dagText(prov.sistaPass)}. ${stor(struketText(prov))} stryks ur planen.`;
}
// Insatsen är avslutad: en bock som ritas fram när läraren just har avslutat den, vad som hände och vägen vidare. Allt i
// planen står kvar och går att använda: sammanställningen, utskrifterna och elevernas utveckling (Niclas 2026-10-25: "Vill
// ju ha någon fanfar nästan", och "Man ska fortfarande kunna skriva ut sammanställningen, se elevernas utveckling mm som
// avslutad"). Rutan står under utvärderingens beslut, där läraren tryckte; i veckan säger raden överst samma sak.
let nyssAvslutad = false;
// Hur insatsen avslutades, i en mening, lika i läget överst och i rutan med bocken: tidigare än planerat, av läraren efter
// sista passet, eller av sig själv två veckor efter det.
const hurAvslutad = () => (plan.slut ? utvarderingenText(plan, aktiv.foljd.utvardering, false)
  : AVSLUTANDE.includes(aktiv.foljd.utvardering?.beslut ?? '') ? sistaPassetText()
  : `Planen avslutades av sig själv ${dagText(avslutasSjalv())}, två veckor efter ${sjalvFran()}.`);
const avslutsrutansText = () => [hurAvslutad(), aktiv.foljd.utvardering?.beslut === 'byt' ? 'Gruppen byter insats.' : '', aktiv.folj ? 'Sammanställningen, utskrifterna och elevernas utveckling finns kvar i planen.' : ''].filter(Boolean).join(' ');
function avslutsruta(): string {
  const byt = aktiv.foljd.utvardering?.beslut === 'byt';
  const text = avslutsrutansText();
  const knappar = [
    aktiv.folj ? '<button type="button" class="knapp liten" data-till="pl-samman">Till sammanställningen</button>' : '',
    byt ? '<a class="knapp sekundar liten" href="/stodundervisning">Välj nästa insats</a>' : '',
  ].filter(Boolean);
  return `<div class="pl-avslutad${nyssAvslutad ? ' ny' : ''}"${nyssAvslutad ? ' role="status"' : ''}><svg class="pl-avslutad-bock" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/><path d="M14 24.5l7 7 13-14"/></svg><div><p class="pl-avslutad-rubrik">Insatsen är avslutad</p><p class="pl-avslutad-text">${esc(text)}</p>${knappar.length ? `<p class="pl-andra-knappar">${knappar.join('')}</p>` : ''}</div></div>`;
}
// Planens sista vecka: hur insatsen slutar och vägen till utvärderingen (Niclas 2026-10-25: "det var lite svårt att hitta
// avsluta som finns i sista passet"). En avslutad insats, ett avslut längre fram och Ångra avslutet står i raden överst,
// och inte en gång till här (verifieringen 2026-10-25: samma mening stod två gånger).
function sistaVeckan(v: PlanVecka, nu: Vy): string {
  if (avslutadNu() || plan.slut) return '';
  const tillUtv = aktiv.folj ? ' <button type="button" class="pl-textknapp" data-vy="efter">Till utvärderingen</button>' : '';
  if (!aktiv.folj || nu !== v.nr || !plan.sistaPass) return '';
  return `<p class="pl-paminn">${esc(plan.sistaPass === idag ? 'Sista passet är i dag. Efter passet utvärderar du insatsen och avslutar den.' : `Det här är insatsens sista vecka. Efter sista passet, ${dagText(plan.sistaPass)}, utvärderar du insatsen och avslutar den.`)}${tillUtv}</p>`;
}
// Det en förlängning ger, i pass eller veckor, ur planen den ger.
const forlangText = (n: number) => {
  const ny = planera(mp, forlangdaVal(mp, aktiv.val, n));
  if (mp.period.enhet === 'pass') return `${ny.pass.length - plan.pass.length} pass`;
  const x = ny.veckor.length - plan.veckor.length;
  return `${x} ${x === 1 ? 'vecka' : 'veckor'}`;
};

// Veckorna överst i veckan, så att läraren ser var gruppen är och kan titta i förväg med ett tryck (Niclas 2026-10-24:
// "Lite svårt att hitta till vecka 2 ... Man kan ske vill titta lite i förväg"). Veckan gruppen är i har en prick, och
// veckan som visas är vald. Sidan öppnar själv den vecka gruppen är i.
function remsa(vald: Vy) {
  const nu = harBorjat() || nuVy() === 'fore' ? nuVy() : null;
  // Veckorna som avslutet strök står överstrukna efter planens veckor, utan att gå att öppna (K-542).
  const strukna = (plan.struket?.veckor ?? []).map((v) => { const k = planveckanKort(planvecka(plan, v), gangen(helaVeckorna(plan), v)); return `<span class="pl-remsa-vecka struken" role="img" aria-label="${esc(`Vecka ${planveckansNamn(helaVeckorna(plan), v).plan}, struken`)}">${k.tal}${k.om ? `<small>${k.om}</small>` : ''}</span>`; }).join('');
  const knapp = (vy: Vy, text: string, namn: string) => `<button type="button" class="pl-remsa-vecka${nu === vy ? ' nu' : ''}" data-vy="${vy}" aria-pressed="${vald === vy}" aria-label="${esc(namn)}${nu === vy ? (vy === 'fore' ? ', nu' : ', den här veckan') : ''}">${text}</button>`;
  return `<nav class="pl-remsa" aria-label="Veckorna i planen"><span class="pl-etikett">Veckorna</span><div class="pl-remsa-knappar">${harFore() ? knapp('fore', 'Före', 'Före första passet') : ''}${plan.veckor.map((v) => { const k = planveckanKort(planvecka(plan, v), gangen(plan, v)); return knapp(v.nr, `${k.tal}${k.om ? `<small>${k.om}</small>` : ''}`, `${rubrikVecka(v)}, ${spannKort(veckansDagar(plan, v).fran, veckansDagar(plan, v).till)}`); }).join('')}${strukna}${knapp('efter', 'Efter', 'Efter insatsen')}</div></nav>`;
}

function renderaVeckan() {
  const sektion = $('pl-veckan');
  for (const el of sektion.querySelectorAll<HTMLElement>('[data-fil]')) filer.append(el);
  if ((!aktiv.sparad && !aktiv.franLank) || !plan.veckor.length) { sektion.hidden = true; sektion.innerHTML = ''; delete sektion.dataset.vy; return; }
  const vy = visadVy();
  // Rutorna som läraren har fällt ut står kvar utfällda när samma vecka ritas om.
  const oppna = sektion.dataset.vy === String(vy) ? new Set([...sektion.querySelectorAll<HTMLDetailsElement>('details[data-ruta]')].filter((d) => d.open).map((d) => d.dataset.ruta!)) : new Set<string>();
  sektion.innerHTML = (vy === 'efter' ? efterDelar() : vy === 'fore' ? foreDelar(oppna) : veckansDelar(plan.veckor[vy - 1], oppna)).join('');
  for (const ruta of sektion.querySelectorAll<HTMLElement>('[data-plats]')) { const el = filer.querySelector(`[data-fil="${ruta.dataset.plats}"]`); if (el) ruta.replaceWith(el); }
  sektion.hidden = false;
  sektion.dataset.vy = String(vy);
}

// Att justera insatsen: metodens egna sätt när metoden har dem (plan.justera), annars veckan en gång till, nivån när
// planen har nivåer och elevhälsan (de kalla testarna 2026-10-24: "byt nivå" stod också där planen inte har nivåer). Veckan
// tas om med knappen Upprepa veckan under Efter veckan, som står i varje vecka (användbarhetsprovet 2026-10-25: knappen
// fanns inte i den pågående veckan).
function justeraText() {
  const satt = data.justera?.length ? data.justera.map(mening) : [
    'Ta samma vecka en gång till med knappen Upprepa veckan.',
    ...((data.bank || data.nivaer) ? ['Byt nivå under Ändra planen.'] : []),
  ];
  return `<ul class="pl-justera">${[...satt, 'Ta upp det med elevhälsan.'].map((x) => `<li>${lankad(x)}</li>`).join('')}</ul>`;
}

// ---------- Passet ----------
// Passet i rutan med nästa pass (betan 2026-10-24: ingen av de fem kalla testarna kunde hålla första passet bara efter
// planen; Opus och Sonnet föreslog var för sig samma form): passets namn med dess roll ur metodens plan, och delarna som
// tunna rader med tiden, som fälls ut till det läraren gör och säger. Vad passet är, med namnet, rollerna, delarna och
// förberedelsen, kommer ur standardens passetsBeskrivning, som kalendern också läser (K-515: kalendern valde delarna på
// eget sätt och visade två tidsscheman för samma pass). Har passet en tid lika lång som delarna står klockslagen.
const rollerFor = (p: Pass) => {
  const rader = passetsRoller(plan, p, mp.passen);
  // Den mest bestämda raden om passets plats i insatsen (sista, ett nummer, näst sista eller ett spann), och sedan raderna
  // om metodens veckor och platsen i veckan, i standardens ordning (narensVikt).
  const vikt = (r: number) => narensVikt(mp.passen[r].nar);
  return [...rader.filter((r) => vikt(r) < 2).slice(0, 1), ...rader.filter((r) => vikt(r) >= 2)].map((r) => data.passen![r]);
};
// Passets längd: dagens klockslag när läraren har satt dem, och annars passets längd i planen.
const passetsMinuter = (p: Pass) => { const t = passetsTid(aktiv.val, p); return t ? minuterAv(t[1]) - minuterAv(t[0]) : minuter(); };
// Passet med tidsschemats variant för passet: Läslistors vecka 1–3, Högläsning i pars visning och Upprepad läsnings pass
// på tio minuter (K-515, och riggens omgång 1 2026-10-26).
const passetFor = (p: Pass) => passetsBeskrivning(rollerFor(p), data.passet, passetsLage(plan, p, passetsMinuter(p)));
const fasFran = (tid: string) => { const m = tid.match(/^(\d+)/); return m ? Number(m[1]) : null; };
// En del i passets tabell har tabellens andra kolumner, som Du säger, med sina namn (tabellensDelar).
type Mer = { etikett: string; text: string }[];
const merText = (mer?: Mer) => (mer ?? []).map((m) => `<p><span class="pl-etikett">${esc(m.etikett)}</span> ${lankad(mening(m.text))}</p>`).join('');
const fasTill = (tid: string) => minuterISpann(tid)?.till ?? null;
const goat = (vad: string, titel: string) => `data-goatcounter-click="planera:${esc(data.id)}:${vad}" data-goatcounter-title="${esc(data.titel)}: ${esc(titel)}"`;
function passetsRuta(p: Pass | undefined, oppna: Set<string>, mitt = ''): string {
  const roller = p ? rollerFor(p) : [];
  const b = p ? passetFor(p) : passetsBeskrivning([], data.passet);
  const egna = b.egenOrdning;
  const delar = b.delar;
  if (!delar.length && !roller.length) return '';
  const tid = p ? passetsTid(aktiv.val, p) : undefined;
  const slut = Math.max(0, ...delar.map((d) => fasTill(d.tid) ?? 0));
  const klockslag = !!tid && slut > 0 && minuterAv(tid[1]) - minuterAv(tid[0]) === slut;
  const tidFor = (t: string) => { const f = fasFran(t); return klockslag && f !== null ? tidText(plusMinuter(tid![0], f)) : delensTid(t); };
  const stegFor = (fas: string) => (egna ? undefined : data.passet?.steg?.rader.find((s) => s.namn.toLowerCase() === fas.toLowerCase()));
  const rad = (nyckel: string, tidtext: string, namn: string, inne: string) => `<details class="pl-del" data-ruta="del-${nyckel}"${oppna.has(`del-${nyckel}`) ? ' open' : ''}><summary><span class="pl-deltid">${esc(tidtext)}</span><span class="pl-delnamn">${esc(namn)}</span></summary><div class="pl-deltext">${inne}</div></details>`;
  const fore = [
    ...b.foreRader.map((f) => `<p><span class="pl-etikett">${esc(f.nar)}</span>${lankad(mening(f.vad))}</p>${merText(f.mer)}`),
    // Förberedelsen säger det som gäller just passet (i pass 2 ett blad till varje par), och checklistan står efter med sin
    // rubrik när den gäller varje pass (Codex 2026-10-25: checklistan ensam tappade förberedelser). Ett pass med egen tabell
    // har sin egen förberedelse och ingen checklista, som Boksamtalets bokval (den kalla testaren 2026-10-26).
    ...(b.fore ? [`<p>${lankad(mening(b.fore))}</p>`] : []),
    ...(!egna && !data.forstaChecklista && data.checklista.length ? [`${data.checklistaRubrik ? `<p class="pl-checkrubrik">${esc(data.checklistaRubrik)}</p>` : ''}<ol class="pl-checklista">${data.checklista.map((x) => `<li>${lankad(x)}</li>`).join('')}</ol>`] : []),
  ];
  const rader = [
    ...(fore.length ? [rad(egna ? 'egen-fore' : 'fore', '', 'Före passet', fore.join(''))] : []),
    ...delar.map((d, i) => {
      const s = stegFor(d.fas);
      const fraser = s?.fraser.length ? `<p class="pl-etikett">${esc(data.passet!.steg!.fraserRubrik)}</p><ul class="pl-fraser">${s.fraser.map((x) => `<li>”${esc(x)}”</li>`).join('')}</ul>` : '';
      return rad(`${egna ? 'egen-' : ''}${i}`, tidFor(d.tid), d.fas, `<p>${lankad(mening(d.vad))}</p>${merText((d as { mer?: Mer }).mer)}${fraser}`);
    }),
    // En rad utan minuter, som "Hemma, cirka 20 min": ordet före kommat i tidens spalt och resten efter delens namn.
    ...(!egna ? (data.passet?.andra ?? []).map((r, i) => { const [forst, ...rest] = r.tid.split(','); return rad(`andra-${i}`, forst.trim(), [r.fas, ...rest.map((x) => x.trim())].join(', '), `<p>${lankad(mening(r.vad))}</p>`); }) : []),
    ...(data.passet?.efter ? [rad('efter', '', 'Efter passet', `<p>${lankad(mening(data.passet.efter))}</p>`)] : []),
  ];
  const namn = p ? `<p class="pl-passnamn">Pass ${p.nr} av ${hogstaPassnr(plan)}${b.namn ? ` · ${esc(b.namn)}` : ''}</p>` : '';
  // Rollens text, och en rad ur metodens tabell med kolumnens namn som etikett (K-520).
  const roll = b.texter.map((t) => `<p class="pl-roll">${t.etikett ? `<span class="pl-etikett">${esc(t.etikett)}</span> ` : ''}${lankad(mening(t.text))}</p>`).join('');
  const tabellRad = b.tabell ? `<p class="pl-not">${egna ? 'Delarna står i metodens tabell' : 'Passet står i metodens tabell'} <a href="${esc(b.tabell.adress)}" ${goat('passets-tabell', 'passets tabell från planen')}>${esc(b.tabell.namn)}</a>.</p>` : '';
  const rubrik = egna ? 'Passets delar' : b.rubrik ?? data.passet?.rubrik ?? 'Passets delar';
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
  if (!niva) return `<div class="pl-nivaval"><p class="pl-not">Välj gruppens nivå, så visar veckan nivåns rad i ${esc(t.rubrik)}.</p>${nivaval(nivaer)}</div>`;
  const cell = t.veckor[String(v.innehall)]?.[niva.slug];
  if (!cell) return '';
  return `<div class="pl-nivans" style="--niva:${esc(niva.farg)}"><p class="pl-etikett"><a href="${esc(t.adress)}" ${goat('nivans-rad', 'nivåns tal från planen')}>${esc(t.rubrik)}</a> · ${esc(niva.namn)}</p>${cell.split('\n').map((x) => `<p>${lankad(mening(x))}</p>`).join('')}</div>`;
}

// Det som finns i metoden i stunden: passet på metodens sida, stödet när eleven fastnar och metodens verktyg.
function metodensLankar(): string {
  const lankar: [string, string, string, boolean][] = [
    ...(data.passet ? [[data.passet.adress, 'Passet i metoden', 'passet', false] as [string, string, string, boolean]] : []),
    ...(data.material ? [[data.material.adress, data.material.rubrik, 'materialet', false] as [string, string, string, boolean]] : []),
    ...(data.fastnar ?? []).map((f): [string, string, string, boolean] => [f.adress, f.rubrik, 'fastnar', false]),
    ...(data.centrala ?? []).map((c): [string, string, string, boolean] => [c.adress, c.namn, 'central', c.pdf]),
  ];
  return lankar.length ? `<p class="pl-lankar">${lankar.map(([a, t, vad, pdf]) => `<a href="${esc(a)}"${pdf ? ' target="_blank" rel="noopener"' : ''} ${goat(vad, `${t} från planen`)}>${esc(t)}</a>`).join('<span aria-hidden="true"> · </span>')}</p>` : '';
}

// Passet i kalenderns händelse, som i rutan: namnet, rollerna och delarna med minuter (de kalla testarna 2026-10-24:
// kalendern hade bara första meningen ur veckans fokus). Kalenderfilen skriver metodens veckor som planens.
const passetIKalendern = (p: Pass) => {
  const b = passetFor(p);
  return [[b.namn, ...b.texter.map((t) => (t.etikett ? `${t.etikett}: ${t.text}` : t.text))].filter(Boolean).map((t) => mening(t)).join(' '), b.delar.length ? `Passet: ${b.delar.map((d) => `${d.fas} ${delensTid(d.tid)}`).join(', ')}.` : ''].filter(Boolean).join('\n');
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
  const meta = [kalendervecka(isoVecka(plan.fore.mandag).vecka), ...(aktiv.namn ? [aktiv.namn] : []), ...(nivaNamn() ? [nivaNamn()!] : [])];
  const delar: string[] = [`<header class="pl-veckohuvud"><h2 id="pl-veckan-rubrik" tabindex="-1">Före första passet</h2><p class="meta">${meta.map(esc).join(' · ')}</p></header>`, remsa('fore')];
  const forstaP = iDatumordning(plan.pass)[0];
  const forsta = forstaP ? `${dagText(forstaP.datum)}${passetsTid(aktiv.val, forstaP) ? ` kl. ${tidText(passetsTid(aktiv.val, forstaP)![0])}` : ''}` : '';
  const nartid = idag > fredag ? `Gör det före första passet, ${forsta}.`
    : plan.fore.overLov ? `Veckan före första passet är lov, så gör det veckan före lovet, ${spannKort(plan.fore.mandag, fredag)}. Första passet är ${forsta}.`
    : `Gör det veckan före första passet, ${spannKort(plan.fore.mandag, fredag)}. Första passet är ${forsta}.`;
  const material = [...filnamn().filter((n) => n.startsWith('lektionskort')).map(plats), plats('lathund')].filter(Boolean);
  delar.push(`<div class="pl-nasta pl-forerutan"><span class="pl-etikett">Före start</span><p class="pl-nar">${esc(nartid)}</p>${material.length ? `<p class="metod-centrala">${material.join('')}</p>` : ''}${metodensLankar()}</div>`);
  const saker = [
    ...uppfoljningensTillfallen(plan).filter((x) => x.vecka === 0).map((x) => `<li><span class="pl-etikett">${esc(uppfNamn(x.rad))}</span><p>${lankad(data.uppfoljning.rader[x.rad].vad)}</p>${tidForGruppen(x.rad) ? `<p class="pl-not">${esc(tidForGruppen(x.rad))}</p>` : ''}${resultatfalt(x.nyckel)}</li>`),
    ...(data.fore ?? []).map((t) => `<li><p>${lankad(mening(t))}</p></li>`),
  ];
  if (saker.length) delar.push(`<section class="pl-block"><h3>Det du gör före första passet</h3><ul class="pl-uppf">${saker.join('')}</ul></section>`);
  // Börja på står också här, under läsningen före, så att resultatet leder till valet (användbarhetsprovet 2026-10-25: valet
  // låg hopfällt längst ned i Ändra planen och låstes vid första bocken). Stegen och texterna är formulärets, och valet går
  // till samma funktion.
  if (borjaval) {
    const last = borjaLast();
    const hjalp = borjaval.parentElement?.querySelector('.pl-hjalp:not(.pl-varning)')?.textContent ?? '';
    const steg = [...borjaval.options].map((o) => `<option value="${esc(o.value)}"${Number(o.value) === (aktiv.val.borja ?? 1) ? ' selected' : ''}>${esc(o.textContent ?? '')}</option>`).join('');
    delar.push(`<section class="pl-block pl-borja"><h3><label for="pl-borja-fore">Börja på</label></h3><p>${esc(hjalp)}</p><select class="pl-falt" id="pl-borja-fore" data-borja${last ? ' disabled' : ''}>${steg}</select><p class="pl-not">${esc(last ? $('pl-borja-not').textContent ?? '' : 'Steget går att ändra tills du har bockat ett pass eller skattat.')}</p></section>`);
  }
  if (data.forstaChecklista && data.checklista.length) delar.push(`<section class="pl-block"><h3>${esc(data.checklistaRubrik ?? 'Före första passet')}</h3><ol class="pl-checklista">${data.checklista.map((x) => `<li>${lankad(x)}</li>`).join('')}</ol></section>`);
  if (data.principer) delar.push(`<section class="pl-block pl-principer"><h3>${esc(data.principer.rubrik)}</h3><p>${lankad(mening(data.principer.text))}</p></section>`);
  if (data.gruppen) delar.push(`<details class="pl-fallut" data-ruta="gruppen"${oppna.has('gruppen') ? ' open' : ''}><summary>${esc(data.gruppen.rubrik)}</summary><p>${lankad(mening(data.gruppen.text))}</p>${data.grupp ? `<p class="pl-not">Metoden: ${esc(liten(data.grupp.text))}.</p>` : ''}</details>`);
  const forstaV = plan.veckor[0];
  delar.push(`<nav class="pl-bladdra" aria-label="Bläddra mellan veckorna"><span></span><button type="button" class="knapp sekundar liten" data-till="pl-planen">Hela planen</button>${forstaV ? `<button type="button" class="knapp sekundar liten" data-vy="${forstaV.nr}">${esc(rubrikVecka(forstaV))} ›</button>` : '<span></span>'}</nav>`);
  return delar;
}

// Rutorna som ska stå öppna efter nästa ritning, fast veckan som visas byts (Efter veckan efter Upprepa veckan).
// Passet som rutan visar när läraren har valt ett annat pass i veckan än nästa.
let visatPass: number | undefined;

function veckansDelar(v: PlanVecka, oppna: Set<string>): string[] {
  const rad = radFor(v);
  lankVecka = v.innehall;
  const { fran: f, till: t } = veckansDagar(plan, v);
  const meta = [spannKort(f, t), ...(aktiv.namn ? [aktiv.namn] : []), ...(nivaNamn() ? [nivaNamn()!] : [])];
  const s = sammanstallning(plan, aktiv.foljd, idag);
  const nu = nuVy();
  const passen = veckansPass(plan, v);
  const harVarit = plusDagar(v.mandag, 6) < idag;
  const delar: string[] = [`<header class="pl-veckohuvud"><h2 id="pl-veckan-rubrik" tabindex="-1">${esc(rubrikVecka(v))} i planen</h2><p class="meta">${meta.map(esc).join(' · ')}</p></header>`, remsa(v.nr)];
  // Före första passet står under Före, och vecka 1 säger det tills första passet har varit (Opus 2026-10-24).
  if (harFore() && plan.forstaPass && idag <= plan.forstaPass) delar.push(`<p class="pl-paminn">Det som görs före första passet står under Före. <button type="button" class="pl-textknapp" data-vy="fore">Till Före</button></p>`);
  // Planens sista vecka säger hur insatsen slutar, med vägen till utvärderingen, och i en avslutad insats står rutan
  // Insatsen är avslutad där (K-542).
  if (v.nr === plan.veckor.length) delar.push(sistaVeckan(v, nu));

  // Nästa pass med passet och materialet, eller vad veckan är när läraren har bläddrat till en annan vecka (granskningen
  // 2026-10-24: nästa pass och den bläddrade veckan kunde gälla olika veckor).
  let etikett: string, text: string;
  // Passet som rutan gäller: nästa pass, eller veckans första. Ligger nästa pass i en senare vecka, som på helgen, gäller
  // rutan den veckan, och den säger det (Codex 2026-10-24: söndagen visade förra veckans texter till måndagen). Ett pass
  // som läraren har valt bland veckans pass står i rutan i stället.
  let rutansPass: Pass | undefined;
  let bockatNot = '';
  const valt = visatPass !== undefined ? passen.find((p) => p.nr === visatPass) : undefined;
  const klockan = (p: Pass) => (passetsTid(aktiv.val, p) ? ` kl. ${tidText(passetsTid(aktiv.val, p)![0])}` : '');
  if (valt) {
    rutansPass = valt;
    // Ett valt pass heter så, så att rutan inte läses som att veckan har ett pass (buggjakten 2026-10-25: "Ett pass i veckan").
    etikett = valt.datum < idag ? 'Ett pass som har varit' : 'Valt pass';
    text = `${stor(dagText(valt.datum))}${klockan(valt)}`;
  } else if (nu === v.nr) {
    // Ett pass som är bockat är gjort, så rutan visar nästa pass som inte är bockat och säger vilket som är bockat
    // (nastaObockade i standarden; användbarhetsprovet 2026-10-25: rutan stod kvar på dagens pass efter bocken).
    const { pass: nasta, bockade } = nastaObockade(plan, idag, (p) => gjort(passetsDag(p)));
    if (bockade.length) bockatNot = bockade.length === 1 && bockade[0].datum === idag ? 'Dagens pass är bockat.' : `${stor(uppraknat(bockade.map((p) => `pass ${p.nr}`)))} ${bockade.length === 1 ? 'är bockat' : 'är bockade'}.`;
    rutansPass = nasta ?? undefined;
    etikett = 'Nästa pass';
    text = !nasta ? (bockade.length ? 'Alla pass som är kvar är bockade.' : 'Insatsen är slut.')
      : nasta.datum === plan.forstaPass && nasta.datum > idag ? `Första passet: ${dagText(nasta.datum)}${klockan(nasta)}`
      : `${stor(narText(nasta.datum, idag))}${nasta.datum === idag || nasta.datum === plusDagar(idag, 1) ? `, ${dagText(nasta.datum)}` : ''}${klockan(nasta)}`;
    if (nasta && nasta.vecka !== v.nr) text += `, ${rubrikVecka(plan.veckor[nasta.vecka - 1]).toLocaleLowerCase('sv')} i planen`;
  } else if (harVarit) {
    etikett = 'Veckan har varit';
    rutansPass = passen[0];
    text = passen.length ? `${passnummerText(passen.map((p) => p.nr))}, ${spannKort(f, t)}` : 'Inga pass den veckan';
  } else {
    etikett = 'Veckans första pass';
    const forsta = iDatumordning(passen)[0];
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
    const obockat = veckansPass(plan, forraVeckan).filter((p) => p.datum < idag && !gjort(passetsDag(p))).length;
    const oskattad = !Object.keys(aktiv.foljd.skattning[forraVeckan.mandag] ?? {}).length;
    const delarna = [obockat ? `${obockat === 1 ? 'ett pass' : `${obockat} pass`} som inte är ${obockat === 1 ? 'bockat' : 'bockade'}` : '', oskattad ? 'ingen skattning' : ''].filter(Boolean);
    // Med ett lov emellan heter veckan med sitt namn, så att "förra veckan" aldrig är en vecka långt tillbaka (buggjakten
    // 2026-10-25).
    const intill = forraVeckan.mandag === plusDagar(v.mandag, -7);
    if (delarna.length) paminn = `<p class="pl-paminn pl-forra">${esc(intill ? 'Förra veckan' : planveckansNamn(plan, forraVeckan).Text)} har ${esc(uppraknat(delarna))}. <button type="button" class="pl-textknapp" data-vy="${forraVeckan.nr}">Till ${esc(intill ? 'förra veckan' : rubrikVecka(forraVeckan).toLocaleLowerCase('sv'))}</button></p>`;
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
  if (!ruta && rutansPass && !harVarit) text += `, pass ${rutansPass.nr} av ${hogstaPassnr(plan)}`;
  const veckansSida = kursvecka ? `<p class="metod-centrala"><a class="knapp" href="${esc(kursvecka)}" ${goat('kursvecka', 'veckans lektion från planen')}>${esc(stor(metodveckan(rutansVecka.innehall)))}, med veckans manus</a></p>` : '';
  delar.push(`<div class="pl-nasta${rutansPass && rutansPass.datum >= idag ? ' pl-kommer' : ''}"><span class="pl-etikett">${etikett}</span><p class="pl-nar">${esc(text)}</p>${bockatNot ? `<p class="pl-not">${esc(bockatNot)}</p>` : ''}${tillbaka}${paminn}${veckansSida}${ruta || nivansRad(rutansVecka)}${material.length ? `<p class="metod-centrala">${material.join('')}</p>` : ''}${veckansTexter(rutansRad, oppna, rutansVecka.nr !== v.nr ? rutansVecka : undefined)}${hemma}${metodensLankar()}</div>`);

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
      const veckanHarBorjat = harBorjatVecka(mandagen(p.datum));
      const senare = aktiv.folj && !ar && !veckanHarBorjat ? `<span class="pl-bock senare" title="Går att bocka från ${esc(dagText(mandagen(p.datum)))}"></span>` : '<span></span>';
      const bock = aktiv.folj && (veckanHarBorjat || ar) ? `<button type="button" class="pl-bock${ar ? ' ja' : ''}" data-bock="${esc(dag)}" aria-pressed="${ar}" aria-label="Pass ${p.nr} blev av"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12.5l3.7 3.7 7.3-8"/></svg></button>` : senare;
      const info = [passetsTidText(p), p.flyttatFran ? `Flyttat från ${dagText(p.flyttatFran)}` : ''].filter(Boolean).join(' · ');
      const roll = passetFor(p).namn;
      const iRutan = rutansPass?.nr === p.nr;
      const visa = roll ? (iRutan ? `<span class="pl-passroll">${esc(roll)}</span>` : `<button type="button" class="pl-textknapp pl-passroll" data-visa-pass="${p.nr}" aria-label="Visa pass ${p.nr}, ${esc(roll)}, i rutan">${esc(roll)}</button>`) : '';
      return { datum: p.datum, html: `<li class="${p.datum === idag ? 'idag' : ''}${ar ? ' gjort' : ''}${iRutan && roll ? ' i-rutan' : ''}"><span class="pl-dag">${esc(dagKort(p.datum))}<small>Pass ${p.nr}${p.datum === idag ? ' · i dag' : ''}</small></span><span class="pl-passinfo">${visa}${info ? `<span>${esc(info)}</span>` : ''}</span>${bock}${narvaro}</li>` };
    }),
    ...v.bortfall.map((b) => ({ datum: b.datum, html: `<li class="bort"><span class="pl-dag">${esc(dagKort(b.datum))}<small>Inget pass</small></span><span class="pl-passinfo">${b.varfor === 'helgdag' ? esc(stor(b.namn ?? 'helgdag')) : 'Inställt'}</span>${b.varfor === 'installt' ? `<button type="button" class="pl-textknapp" data-angra="${esc(b.datum)}">Ångra</button>` : '<span></span>'}</li>` })),
    // Passen som avslutet strök, överstrukna, så att det syns vad som inte blir av (Niclas 2026-10-25: "tydligt blir som
    // gråad eller streckad").
    ...(plan.struket?.pass ?? []).filter((p) => p.vecka === v.nr).map((p) => ({ datum: p.datum, html: `<li class="struket"><span class="pl-dag">${esc(dagKort(p.datum))}<small>Pass ${p.nr} · struket</small></span><span class="pl-passinfo"><span>Insatsen ${slutNu() ? 'slutade' : 'slutar'} med pass ${plan.sistaNr}</span></span><span></span></li>` })),
  ].sort(efterDatum);
  const obockade = aktiv.folj ? passen.filter((p) => p.datum <= idag && !gjort(passetsDag(p))) : [];
  // Under passen står Bocka veckans pass till och med i dag, när två eller fler väntar, och Flytta eller ställ in ett pass,
  // synliga i en knappgrupp (Niclas 2026-10-25: Avsluta låg "bakom en rubrik som var bakom en pil"; formen ur en Sonnets
  // och en Opus förslag samma kväll). Knappen säger vad den gör: också dagens pass (de kalla läsarna 2026-10-24).
  const forslagFlytta = iDatumordning(passen).find((p) => p.datum >= idag && !gjort(passetsDag(p))) ?? passen[passen.length - 1];
  const forslagDag = forslagFlytta ? [1, 2, 3, 4].map((i) => plusDagar(forslagFlytta.datum, i)).find((d) => d <= plusDagar(v.mandag, 4) && veckodag(d) <= 5 && !helgdag(d)) : undefined;
  const passknappar = [
    obockade.length >= 2 ? '<button type="button" class="knapp sekundar liten" data-gor="alla">Bocka veckans pass till och med i dag</button>' : '',
    passen.length ? '<button type="button" class="knapp sekundar liten" data-gor="flytta" aria-expanded="false" aria-controls="pl-flytta">Flytta eller ställ in ett pass</button>' : '',
  ].filter(Boolean);
  const alla = passknappar.length ? `<p class="pl-andra-knappar">${passknappar.join('')}</p>` : '';
  const flyttaForm = !passen.length ? '' : `<div class="pl-flytta" id="pl-flytta" hidden><label class="pl-etikett" for="pl-flytta-pass">Passet</label><select class="pl-falt" id="pl-flytta-pass">${passen.map((p) => `<option value="${esc(passetsDag(p))}"${p.nr === forslagFlytta?.nr ? ' selected' : ''}>Pass ${p.nr}, ${esc(dagText(p.datum))}</option>`).join('')}</select><label class="pl-etikett" for="pl-flytta-dag">Ny dag</label><select class="pl-falt" id="pl-flytta-dag">${[0, 1, 2, 3, 4].map((i) => plusDagar(v.mandag, i)).filter((d) => !helgdag(d)).map((d) => `<option value="${d}"${d === forslagDag ? ' selected' : ''}>${esc(stor(dagText(d)))}</option>`).join('')}</select><p class="pl-andra-knappar"><button type="button" class="knapp liten" data-gor="flytta-klar" ${goat('flytta', 'ett pass flyttat')}>Flytta passet</button><button type="button" class="knapp sekundar liten" data-gor="stall-in">Ställ in passet</button></p></div>`;
  // Hjälpraden står tills läraren har bockat ett första pass. I en vecka som inte har börjat säger den när passen går att
  // bocka, och den står där varje gång.
  const veckanBorjat = passen.some((p) => mandagen(p.datum) <= idag);
  const hjalp = !aktiv.folj ? ''
    : !veckanBorjat && passen.length ? '<p class="pl-not">Passen går att bocka när veckan har börjat.</p>'
    : !aktiv.foljd.gjorda.length ? `<p class="pl-not">Bocka passen som blev av, också ett pass som blev av en annan dag i veckan.${narvaroPa() ? ' Under ett bockat pass trycker du på den som inte var med.' : ''}</p>` : '';
  const foljtips = !aktiv.folj && aktiv.sparad ? `<p class="pl-not pl-foljtips">Vill du bocka passen och skatta eleverna mot målet varje vecka? <button type="button" class="pl-textknapp" data-gor="folj">Följ insatsen</button></p>` : '';
  delar.push(`<section class="pl-block" id="pl-passen"><h3>Veckans pass</h3><ol class="pl-passlista">${passrader.map((x) => x.html).join('')}</ol>${alla}${flyttaForm}${hjalp}${foljtips}</section>`);

  // Veckans fokus ur progressionen. En rad som gäller flera veckor säger att fokus är detsamma som förra veckan (de kalla
  // testarna 2026-10-24: vecka 4 och 5 var lika utan förklaring).
  const iPass = !rad && data.progression?.enhet?.toLowerCase() === 'pass';
  const forraV = plan.veckor[v.nr - 2];
  const samma = !!forraV && !v.igen && radernaI(forraV).length > 0 && radernaI(forraV).map((r) => r.vecka).join() === radernaI(v).map((r) => r.vecka).join();
  // Veckan heter som i planen överallt, så rutan säger inte metodens vecka i en stege som börjar högre upp (Samma sak
  // överallt 2026-10-25: "Vecka 4 i metoden" stod under planens vecka 2, och planen hade en egen vecka 4).
  for (const r of radernaI(v)) delar.push(`<div class="pl-fokusruta">${iPass || r.led || r.rubrik ? `<p class="pl-led">${[iPass ? `Pass ${esc(r.vecka.replace(/^pass\s+/i, ''))}` : '', r.rubrik ? lankad(r.rubrik) : '', r.led ? lankad(r.led) : ''].filter(Boolean).join(' · ')}</p>` : ''}<span class="pl-etikett">${iPass ? 'Passens fokus' : 'Veckans fokus'}</span>${samma ? `<p class="pl-not">Samma fokus som ${esc(rubrikVecka(forraV).toLocaleLowerCase('sv'))}: metodens rad gäller ${esc(iPass ? `pass ${r.vecka}` : veckornaIPlanen(`vecka ${r.vecka}`, plan.borja))}.</p>` : ''}<p>${lankad(mening(r.fokus))}</p><span class="pl-etikett">Det du gör</span><p>${lankad(mening(r.roll))}</p></div>`);
  // Metodens principer, hopfällda, där läraren är när något går snett (Opus 2026-10-24).
  if (data.principer) delar.push(`<details class="pl-fallut" data-ruta="principer"${oppna.has('principer') ? ' open' : ''}><summary>${esc(data.principer.rubrik)}</summary><p>${lankad(mening(data.principer.text))}</p></details>`);
  // Metodens uppföljning den här veckan, och det som görs varje vecka eller i varje pass. När läraren följer insatsen med
  // en elevlista får varje tillfälle med datum ett fält per elev för resultatet.
  const tillfallen = uppfoljningensTillfallen(plan).filter((x) => x.vecka === v.nr);
  if (tillfallen.length) delar.push(`<section class="pl-block"><h3>Metodens uppföljning den här veckan</h3><ul class="pl-uppf">${tillfallen.map(uppfRad).join('')}</ul></section>`);
  const lopande = plan.uppfoljning.filter((u) => u.typ === 'lopande');
  if (lopande.length && !aktiv.folj) delar.push(`<details class="pl-fallut" data-ruta="lopande"${oppna.has('lopande') ? ' open' : ''}><summary>Metodens uppföljning ${esc(uppraknat(lopande.map((u) => uppfNamn(u.rad).toLocaleLowerCase('sv'))))}</summary><ul class="pl-uppf">${lopande.map((u) => `<li><p>${lankad(data.uppfoljning.rader[u.rad].vad)}</p></li>`).join('')}</ul></details>`);
  const villkor = plan.uppfoljning.filter((u) => u.typ === 'villkor');
  if (villkor.length) delar.push(`<section class="pl-block"><h3>Håll koll på</h3><ul class="pl-uppf">${villkor.map((u) => `<li><span class="pl-etikett">${esc(uppfNamn(u.rad))}</span><p>${lankad(data.uppfoljning.rader[u.rad].vad)}</p></li>`).join('')}</ul></section>`);

  // Skattningen mot målet, en gång i veckan, efter veckans innehåll (de kalla testarna 2026-10-24: skattningen stod före
  // passet och fokus), och om läraren vill hur veckan gick för gruppen. Inget måste fyllas i.
  if (aktiv.folj) {
    const fragan = skattningsfragan(!harElever());
    const veckans = aktiv.foljd.skattning[v.mandag] ?? {};
    const gang = aktiv.foljd.vecka[v.mandag];
    // En vecka som inte har börjat säger när den går att skatta, i stället för skalan, om inget redan är skattat där.
    const startad = harBorjatVecka(v.mandag) || Object.keys(veckans).length > 0 || !!gang;
    // Underlaget: metodens uppföljning varje vecka, hopfälld vid skattningen (de kalla läsarna: "jag visste inte vad
    // skattningen skulle bygga på").
    const lopandeHar = plan.uppfoljning.filter((u) => u.typ === 'lopande');
    const underlag = lopandeHar.length ? `<details class="pl-fallut pl-underlag" data-ruta="underlag"${oppna.has('underlag') ? ' open' : ''}><summary>Det du bygger skattningen på</summary>${lopandeHar.map((u) => `<p>${lankad(mening(data.uppfoljning.rader[u.rad].vad))}</p>`).join('')}</details>` : '';
    delar.push(`<section class="pl-block pl-folj" id="pl-skatta"><h3>${harElever() ? 'Skatta eleverna' : 'Skatta gruppen'}</h3>${malRad('veckan', false)}<p class="pl-fraga">${esc(fragan)}</p>${startad ? `${lopandeHar.length ? `<p class="pl-not">Skatta i slutet av veckan, efter det du har sett och hört i passen.</p>` : ''}<ul class="pl-skalnamn" aria-hidden="true">${SKALAN.map((x, i) => `<li><b>${i + 1}</b> ${esc(x)}</li>`).join('')}</ul>
      <ul class="pl-skattning">${vem().map((e) => `<li>${namnknapp('skatta', e)}${skala(`data-skatta="${esc(v.mandag)}|${esc(e.id)}" data-steg`, veckans[e.id], `${e.namn}: ${fragan}`)}${utvecklingsruta('skatta', s.elever.find((x) => x.id === e.id), s)}</li>`).join('')}</ul>
      <p class="pl-not pl-utv-tips">${harElever() ? 'Tryck på ett namn, så ser du elevens utveckling.' : 'Tryck på Gruppen, så ser du gruppens utveckling. Vill du skatta var och en? <button type="button" class="pl-textknapp" data-elevlistan>Skriv in eleverna</button>'}${harSamman(s) ? ' <button type="button" class="pl-textknapp" data-till="pl-samman">Hela gruppens sammanställning</button>' : ''}</p>${underlag}
      <details class="pl-gang" data-ruta="gang"${gang?.varde || gang?.not || oppna.has('gang') ? ' open' : ''}><summary>Hur gick veckan för gruppen, om du vill</summary><div class="pl-gangval" role="group" aria-label="Hur gick veckan för gruppen">${GANG.map((x, i) => `<button type="button" class="pl-chip" data-gang="${esc(v.mandag)}" data-varde="${i + 1}" aria-pressed="${gang?.varde === i + 1}">${x}</button>`).join('')}</div><label class="pl-etikett" for="pl-veckonot">En mening om veckan</label><input class="pl-falt pl-brett" type="text" id="pl-veckonot" maxlength="200" data-veckonot="${esc(v.mandag)}" value="${esc(gang?.not ?? '')}" /><p class="pl-hjalp">Meningen står i sammanställningen och i texten som kopieras, utan elevernas namn.</p></details>` : `<p class="pl-not">Du skattar veckan när den har börjat, från ${esc(dagText(v.mandag))}.</p>`}</section>`);
  }
  // Avstämningen mitt i insatsen: varje elevs riktning från första till senaste skattningen, och ett beslut.
  if (aktiv.folj && v.nr === s.mitt && v.nr !== plan.veckor.length) {
    const beslut = aktiv.foljd.avstamning?.beslut;
    delar.push(`<section class="pl-stam"><h3>Avstämning mitt i insatsen</h3><p>Rör sig ${harElever() ? 'eleverna' : 'gruppen'} mot målet? Jämför skattningarna hittills.</p>${riktningar(s, 'stam')}<span class="pl-etikett">Beslut</span>${beslutsknappar('avstamning')}${beslut === 'justera' ? justeraText() : ''}${meningsfalt('pl-stam-not', 'En mening om avstämningen, om du vill', 'data-beslutsnot="avstamning"', aktiv.foljd.avstamning?.not ?? '')}</section>`);
  }

  // Efter veckan: att ta veckan en gång till, med metodens grund när den har en, och snabbmallen för den som bara planerar
  // (de kalla testarna 2026-10-24: Läslistor byter lista först när paren läser orden direkt). Upprepa veckan står här i
  // alla metoder, så att knappen finns på ett ställe och inte bakom en rad som fälls ut (Niclas 2026-10-25). Lov läggs in
  // under Ändra planen, där lovveckorna väljs, och Avsluta insatsen står i raden överst.
  const kanUpprepa = !harVarit;
  const upprepaKnapp = `<button type="button" class="knapp sekundar liten" data-gor="upprepa" ${goat('upprepa', 'veckan upprepad')}>Upprepa veckan</button>`;
  const taBort = v.igen && kanUpprepa ? '<button type="button" class="knapp sekundar liten" data-gor="ta-bort-upprepning">Ta bort upprepningen</button>' : '';
  const efterVeckan = [
    kanUpprepa ? `<p>${data.upprepa ? lankad(mening(data.upprepa)) : 'Behöver gruppen mer tid tar ni samma vecka en gång till, och resten av planen flyttas fram.'}</p><p class="pl-andra-knappar">${upprepaKnapp}${taBort}</p>` : '',
    plats('snabbmall') && !aktiv.folj ? `<p>Skriv i ${esc(filer.querySelector<HTMLElement>('[data-fil="snabbmall"]')?.dataset.namn ?? 'snabbmallen')} vad du såg och vad ni gör nästa vecka.</p><p class="metod-centrala">${plats('snabbmall')}</p>` : '',
  ].filter(Boolean);
  if (efterVeckan.length) delar.push(`<section class="pl-block"><h3>Efter veckan</h3>${efterVeckan.join('')}</section>`);
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
  if (!niva) return `<div class="pl-nivaval"><p class="pl-not">Välj nivå, så visar veckan nivåns ${esc(data.bank.flera)} med ${namn.length > 1 ? 'slagen' : 'slaget'} ${esc(namn.join(', '))}.</p>${nivaval(data.bank.nivaer)}</div>`;
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
  // Metodens uppföljning efter insatsen, en vecka per tillfälle från måndagen. Den som gäller den här veckan, annars nästa,
  // står i rutan överst och i rubriken (verifieringen 2026-10-25: i v. 4 visade planen v. 1, och inget sa att v. 4 gällde).
  const tillfallen = iDatumordning(uppfoljningensTillfallen(plan).filter((x) => x.vecka === null));
  const nuUppf = tillfallen.find((x) => x.datum <= idag && idag <= plusDagar(x.datum, 6));
  const aktuell = nuUppf ?? tillfallen.find((x) => x.datum > idag);
  const datum = aktuell?.datum ?? tillfallen[tillfallen.length - 1]?.datum ?? plan.efter;
  const meta = [kalendervecka(isoVecka(datum).vecka), ...(aktiv.namn ? [aktiv.namn] : []), ...(nivaNamn() ? [nivaNamn()!] : [])];
  const slut = slutNu();
  const avslutad = avslutadNu();
  const delar = [`<header class="pl-veckohuvud"><h2 id="pl-veckan-rubrik" tabindex="-1">Efter insatsen</h2><p class="meta">${meta.map(esc).join(' · ')}</p></header>`, remsa('efter')];
  const knappar = `${nuVy() !== 'efter' ? '<p><button type="button" class="pl-textknapp" data-vy="nu">Till den här veckan</button></p>' : ''}${aktiv.folj && slut ? '<p><button type="button" class="pl-textknapp" data-till="pl-samman">Till sammanställningen</button></p>' : ''}`;
  if ((aktiv.sparad || aktiv.franLank) && plan.pass.length > 0) {
    // Läget, när passen slutar och när planen avslutas står i raden överst, så rutan säger det läraren gör nu: uppföljningen
    // efter insatsen som gäller den här veckan eller nästa (verifieringen 2026-10-25: samma mening stod två gånger).
    if (aktuell) delar.push(`<div class="pl-nasta"><span class="pl-etikett">${aktuell === nuUppf ? 'Den här veckan' : 'Nästa uppföljning'}</span><p class="pl-nar">${esc(`${uppfNamn(aktuell.rad)}, ${kalendervecka(isoVecka(aktuell.datum).vecka)}, ${spannKort(aktuell.datum, plusDagar(aktuell.datum, 4))}`)}</p>${knappar}</div>`);
    else if (knappar) delar.push(knappar);
  } else {
    const sista = plan.sistaPass ? (avslutad ? hurAvslutad() : `${sistaPassetText()}${plan.slut ? ` ${avslutetText(plan, !slut)}` : ''}`) : '';
    delar.push(`<div class="pl-nasta"><span class="pl-etikett">${avslutad ? 'Insatsen är avslutad' : 'Efter sista passet'}</span><p class="pl-nar">${esc(sista)}</p>${knappar}</div>`);
  }
  // Det som kommer efter insatsen i metodens progression, som nästa period i Läslistor i grupp (de kalla testarna
  // 2026-10-24: nästa period stod som veckans fokus i vecka 8).
  const efterRad = plan.efterSteg !== undefined ? data.progression?.rader[plan.efterSteg] : undefined;
  if (efterRad) delar.push(`<div class="pl-fokusruta"><span class="pl-etikett">Efter insatsen i metoden</span><p>${lankad(mening(efterRad.fokus))}</p><p>${lankad(mening(efterRad.roll))}</p></div>`);
  if (tillfallen.length) delar.push(`<section class="pl-block"><h3>Metodens uppföljning efter insatsen</h3><ul class="pl-uppf">${tillfallen.map(uppfRad).join('')}</ul></section>`);
  // Före sista passets dag görs ingen utvärdering här. Den som avslutar insatsen tidigare väljer det sista passet i veckan,
  // och meningen här säger var den står (K-542; Niclas samma kväll: avsluta hittades "lite avigt vid utvärderingen"). Från
  // sista passets dag står utvärderingen här.
  // En utvärdering som redan är ifylld står kvar att ändra (Codex 2026-10-25: den syntes inte men följde med utskrifterna).
  if (aktiv.folj && plan.sistaPass && idag < plan.sistaPass && !plan.slut && !aktiv.foljd.utvardering?.beslut && !aktiv.foljd.utvardering?.not) {
    const kan = harBorjat() && plan.veckor.some((w) => slutpassI(w).length > 0);
    delar.push(`<section class="pl-stam"><h3>Utvärdering efter insatsen</h3><p>${esc(`Utvärderingen görs efter sista passet, ${dagText(plan.sistaPass)}.${kan ? ' Ska insatsen sluta tidigare finns Avsluta insatsen överst i planen.' : ''}`)}</p></section>`);
  } else if (aktiv.folj) {
    const valt = aktiv.foljd.utvardering?.beslut;
    // Förläng insatsen förlänger planen med det läraren väljer här (granskningen: beslutet lät som en ändring men gjorde ingen).
    // Planen förlängs högst till sin största längd, så att länken alltid går att läsa (Codex 2026-10-24).
    // Förlängningen prövas och sägs med det den faktiskt ger, också när strukna veckor kommer tillbaka först (Codex 2026-10-25).
    const kan = [1, 2, 3, 4].filter((n) => forlangdaVal(mp, aktiv.val, n).langd <= LANGSTA);
    const forlang = valt !== 'forlang' ? '' : kan.length ? `<div class="pl-forlang"><span class="pl-etikett">Förläng planen med</span><div class="sk-segment">${kan.map((n) => `<button type="button" class="sk-antal" data-forlang="${n}">${esc(forlangText(n))}</button>`).join('')}</div></div>` : '<p class="pl-not">Planen kan inte bli längre. Gör en ny plan för fortsättningen.</p>';
    delar.push(`<section class="pl-stam"><h3>Utvärdering efter insatsen</h3>${malRad('efter')}<p>Når ${harElever() ? 'eleverna' : 'gruppen'} målet? Jämför skattningarna och metodens uppföljning före och efter.</p>${riktningar(s, 'efter', true)}<span class="pl-etikett">Beslut</span>${beslutsknappar('utvardering')}${AVSLUTANDE.includes(valt ?? '') && avslutad ? avslutsruta() : ''}${forlang}${meningsfalt('pl-utv-not', 'En mening om utvärderingen, om du vill', 'data-beslutsnot="utvardering"', aktiv.foljd.utvardering?.not ?? '')}</section>`);
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
  // Skriv in eleverna öppnar elevlistan under Ändra planen, som annars är hopfälld (K-548; verifieringen 2026-10-25).
  if (d.elevlistan !== undefined) {
    ($('pl-andra') as HTMLDetailsElement).open = true;
    $('pl-elevruta').scrollIntoView({ block: 'center' });
    elevfalt.focus({ preventScroll: true });
    return;
  }
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
    const tidigare = aktiv.foljd[slag]?.beslut;
    // Ett beslut som avslutar och trycks en gång till efter ett avslut tidigare är Ångra avslutet, så att planen inte står kvar
    // avkortad utan beslut. Annars tar trycket bara bort beslutet, och planen blir som före beslutet: en plan som redan hade
    // avslutats av sig själv står kvar avslutad, och Ångra avslutet överst öppnar den (verifieringen 2026-10-25, som valdes
    // före Codex förslag samma kväll att alltid öppna planen: ett tryck på ett beslut ska inte öppna planen för gott).
    if (slag === 'utvardering' && tidigare === beslut && AVSLUTANDE.includes(beslut) && plan.slut) { angraAvslutet(); fokus(`[data-beslut="${slag}|${beslut}"]`); return; }
    const borttaget = slag === 'utvardering' && tidigare === beslut && AVSLUTANDE.includes(beslut);
    // Anledningen till ett avslut är meningen till beslutet Avsluta insatsen, så ett annat beslut efter ett avslut börjar med
    // en tom mening, och Ångra tar tillbaka den (buggjakten 2026-10-25: "Förläng insatsen. Skolans andra arbete tar över.").
    const avslutetsMening = slag === 'utvardering' && !!plan.slut && tidigare === 'avsluta' && beslut !== 'avsluta';
    // Ett beslut som avslutar insatsen märks: rutan Insatsen är avslutad med bocken, planen grå och streckad och ett besked
    // med Ångra (Niclas 2026-10-25: "Avsluta onsdagen 'gör' inget synligt ... Vill ju ha någon fanfar nästan").
    const avslutar = slag === 'utvardering' && AVSLUTANDE.includes(beslut) && !AVSLUTANDE.includes(tidigare ?? '') && insatsenAvslutad(plan.sistaPass, beslut, idag, aktiv.foljd.oppen);
    if (avslutar) nyssAvslutad = true;
    const besked = avslutar ? 'Insatsen är avslutad.' : avslutetsMening ? 'Anledningen till avslutet gällde beslutet att avsluta, så meningen är tom för det nya beslutet.'
      : borttaget ? () => (avslutadNu() ? 'Beslutet är borttaget. Planen är avslutad av sig själv, och Ångra avslutet överst öppnar den igen.' : `Avslutet är ångrat. ${fortsatter()}`) : undefined;
    andra(() => { const fore = aktiv.foljd[slag]; aktiv.foljd = { ...aktiv.foljd, [slag]: { ...(fore ?? {}), beslut: fore?.beslut === beslut ? undefined : beslut, ...(avslutetsMening ? { not: '' } : {}) } }; }, besked, avslutar || avslutetsMening || borttaget);
    fokus(`[data-beslut="${slag}|${beslut}"]`);
    return;
  }
  if (d.forlang) {
    const n = Number(d.forlang);
    if (forlangdaVal(mp, aktiv.val, n).langd > LANGSTA) return;
    // Avstämningen står kvar i sin vecka när insatsen förlängs (mittVeckan i standarden). En insats som avslutades tidigare
    // förlängs genom planens egna veckor, med upprepningarna, så att de strukna veckorna kommer tillbaka i sin ordning först
    // och planen blir längre först när de är slut (K-542; Codex 2026-10-25: en vecka gav två med en upprepning).
    // Beslutet Förläng insatsen är verkställt, så det tas bort, och lärarens mening står kvar: vid det nya slutet görs en ny
    // utvärdering (verifieringen 2026-10-25: Förläng stod kvar som beslut i en plan som sedan avslutades av sig själv).
    andra(() => { aktiv.val = forlangdaVal(mp, aktiv.val, n); if (aktiv.foljd.utvardering?.beslut === 'forlang') aktiv.foljd = { ...aktiv.foljd, utvardering: { ...aktiv.foljd.utvardering, beslut: undefined } }; visa = undefined; }, `Planen är ${forlangText(n)} längre. Vid det nya slutet utvärderar du igen.`, true);
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
  if (gor === 'angra-avslut') { angraAvslutet(); return; }
  if (!gor || !v) return;
  if (gor === 'alla') {
    const dagar = veckansPass(plan, v).filter((p) => p.datum <= idag && !gjort(passetsDag(p))).map(passetsDag);
    andra(() => { aktiv.foljd.gjorda = [...new Set([...aktiv.foljd.gjorda, ...dagar])].sort(); }, `${stor(talText(dagar.length))} pass är bockade.`, true);
  } else if (gor === 'upprepa') andra(() => { aktiv.val.upprepa = [...(aktiv.val.upprepa ?? []), v.innehall]; visa = v.nr + 1; }, `Vecka ${planveckansNamn(plan, v).plan} tas en gång till, och resten av planen flyttas fram en vecka.`, true);
  else if (gor === 'ta-bort-upprepning') andra(() => { const u = [...(aktiv.val.upprepa ?? [])]; u.splice(u.indexOf(v.innehall), 1); aktiv.val.upprepa = u; visa = v.nr - 1; }, 'Upprepningen är borttagen.', true);
  else if (gor === 'flytta') { const ruta = $('pl-flytta'); ruta.hidden = !ruta.hidden; knapp.setAttribute('aria-expanded', String(!ruta.hidden)); if (!ruta.hidden) $('pl-flytta-pass').focus(); }
  else if (gor === 'flytta-klar' || gor === 'stall-in') {
    const ursprung = $<HTMLSelectElement>('pl-flytta-pass').value;
    if (gor === 'stall-in') { andra(() => { const f = { ...(aktiv.val.flytta ?? {}) }; delete f[ursprung]; aktiv.val.flytta = f; aktiv.val.stryk = [...new Set([...(aktiv.val.stryk ?? []), ursprung])]; }, 'Passet är inställt.', true); return; }
    const ny = $<HTMLInputElement>('pl-flytta-dag').value;
    if (!arDatum(ny)) { visaBesked('Välj den nya dagen.'); return; }
    // Passet flyttas inom sin vecka, så att veckans innehåll och numren står kvar (fältets gränser går att skriva förbi).
    if (ny < v.mandag || ny > plusDagar(v.mandag, 6)) { visaBesked(`Välj en dag i samma vecka, ${spannKort(v.mandag, plusDagar(v.mandag, 4))}.`); return; }
    if (veckodag(ny) > 5 || helgdag(ny)) { visaBesked('Den dagen har skolan stängt. Välj en annan dag.'); return; }
    andra(() => { aktiv.val.flytta = { ...(aktiv.val.flytta ?? {}), [ursprung]: ny }; if (ny === ursprung) delete aktiv.val.flytta![ursprung]; }, `Passet flyttas till ${dagText(ny)}.`, true);
  }
});
// Fälten i veckan: det läraren skriver står i planen direkt och sparas en stund efter sista tangenten, utan att veckan
// ritas om, så att ett fält till i samma stund inte tappar det första (Codex 2026-10-24).
let faltTimer = 0;
$('pl-veckan').addEventListener('change', (e) => {
  const falt = e.target;
  if (falt instanceof HTMLSelectElement && falt.hasAttribute('data-borja')) { valjBorja(falt); document.getElementById('pl-borja-fore')?.focus({ preventScroll: true }); }
});
$('pl-veckan').addEventListener('input', (e) => {
  const falt = e.target as HTMLInputElement;
  const text = falt.value.trim();
  if (falt.dataset.resultat) {
    const [nyckel, id] = falt.dataset.resultat.split('|');
    aktiv.foljd.resultat = { ...aktiv.foljd.resultat, [nyckel]: { ...(aktiv.foljd.resultat[nyckel] ?? {}), [id]: text.slice(0, 40) } };
    lasBorja();
  } else if (falt.dataset.veckonot) {
    const m = falt.dataset.veckonot;
    aktiv.foljd.vecka = { ...aktiv.foljd.vecka, [m]: { ...(aktiv.foljd.vecka[m] ?? {}), not: text.slice(0, 200) } };
  } else if (falt.dataset.beslutsnot) {
    const slag = falt.dataset.beslutsnot as 'avstamning' | 'utvardering';
    aktiv.foljd = { ...aktiv.foljd, [slag]: { ...(aktiv.foljd[slag] ?? {}), not: text.slice(0, 200) } };
    // Anledningen till ett avslut står i läget överst, i planens ruta, i rutan med bocken och i texten till
    // åtgärdsprogrammet, som följer med medan läraren skriver, utan att fältet ritas om (Codex 2026-10-25, två gånger).
    if (slag === 'utvardering') {
      renderaLage();
      renderaSumma();
      document.querySelectorAll<HTMLElement>('#pl-veckan .pl-avslutad-text').forEach((el) => { el.textContent = avslutsrutansText(); });
    }
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
const pdfInfo = () => ({ metod: data.titel, grupp: aktiv.namn || undefined, niva: nivaNamn(), mal: malText(aktivtMal()), fragan: skattningsfragan(!harElever()), uppfoljning: data.uppfoljning.rader });
// En knapp som ger en pdf heter Skriv ut där webbläsaren kan skriva ut den direkt, och annars "som pdf", som
// utskriftsknapparna på resten av sajten (SkrivUtPdf.astro).
const pdfOrd = (vad: string) => (kanSkrivaUtPdf() ? `Skriv ut ${vad}` : `${stor(vad)} som pdf`);
const narvaroFor = (e: SammanstallningElev, s: Sammanstallning) => s.veckor.map((v) => v.pass.map((p) => (!p.gjort ? 'inte' : (aktiv.foljd.franvaro[p.dag] ?? []).includes(e.id) ? 'borta' : 'med')));

// Skattningarna vecka för vecka som staplar, små på raden och stora när eleven fälls ut, med en markering vid
// avstämningen och, när läraren noterar närvaron, närvaron som prickar under veckan.
function graf(varden: (number | undefined)[], etiketter: Veckonamn[], o: { stor?: boolean; mitt?: number | null; pass?: string[][]; namn: string }) {
  const stor = o.stor ?? false, steg = stor ? 36 : 9, b = stor ? 22 : 6, h = stor ? 110 : 22, x0 = stor ? 22 : 0, topp = stor ? 34 : 2;
  // Under stapeln står veckan i planen och kalenderveckan på var sin rad, som i planens lista (veckansNamn i standarden).
  const under = stor ? (o.pass ? 54 : 38) : 2, bredd = x0 + varden.length * steg;
  const linjer = stor ? [1, 2, 3, 4, 5].map((n) => `<line x1="${x0 - 4}" x2="${bredd}" y1="${topp + h - (n / 5) * h}" y2="${topp + h - (n / 5) * h}" class="pl-linje"/><text x="8" y="${topp + h - (n / 5) * h + 4}" class="pl-axel">${n}</text>`).join('') : '';
  const staplarna = varden.map((x, i) => {
    const bx = stapelnsKant(x0, i, steg, b);
    const yta = x ? `<rect x="${bx}" y="${topp + h - (x / 5) * h}" width="${b}" height="${(x / 5) * h}" rx="${stor ? 3 : 1}" class="pl-stapel"/>${stor ? `<text x="${bx + b / 2}" y="${topp + h - (x / 5) * h - 4}" class="pl-stapelvarde">${x}</text>` : ''}` : `<rect x="${bx}" y="${topp + h - 1.5}" width="${b}" height="1.5" class="pl-stapel-tom"/>`;
    const etikett = stor ? `<text x="${bx + b / 2}" y="${topp + h + 14}" class="pl-stapeletikett pl-planveckan">${esc(etiketter[i].kort)}</text><text x="${bx + b / 2}" y="${topp + h + 26}" class="pl-stapeletikett">${esc(etiketter[i].kalender)}</text>` : '';
    const prickar = stor && o.pass ? prickarna(bx, b, o.pass[i] ?? []).map(({ x: px, slag: p }) => { const py = topp + h + 42; return p === 'med' ? `<circle cx="${px}" cy="${py}" r="2.6" class="pl-prick"/>` : p === 'borta' ? `<circle cx="${px}" cy="${py}" r="2.4" class="pl-prick borta"/>` : `<line x1="${px - 2}" x2="${px + 2}" y1="${py}" y2="${py}" class="pl-linje"/>`; }).join('') : '';
    return `${yta}${etikett}${prickar}`;
  }).join('');
  // Veckan mitt i insatsen, då läraren stämmer av, står i ett ljust fält bakom stapeln.
  const mitt = stor && o.mitt ? `<rect x="${x0 + (o.mitt - 1) * steg + 1}" y="${topp - 26}" width="${steg - 2}" height="${h + 26}" rx="3" class="pl-mittfalt"/><text x="${x0 + (o.mitt - 1) * steg + steg / 2}" y="${topp - 16}" class="pl-axel pl-mitttext">Mitt i</text>` : '';
  const text = varden.map((x, i) => (x ? `${etiketter[i].text}: ${x}` : '')).filter(Boolean).join(', ');
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
  const varden = elevensVarden(s, e);
  const res = elevensResultat(plan, e.resultat).map((t) => `<li>${esc(resultatText(plan, info(), t))}</li>`).join('');
  const narvaro = elev && e.narvaro !== null && s.gjorda ? `<p>${esc(narvaronText(e, s))}</p>` : '';
  if (!e.skattningar.length && !res && !narvaro) return `<p class="pl-not">${elev ? 'Eleven' : 'Gruppen'} är inte skattad än. Grafen kommer med första skattningen.</p>`;
  // Skattningen i avstämningens vecka, som stapeln under Mitt i, ur standarden (Samma sak överallt 2026-10-25: sidan tog
  // veckan före när eleven inte var skattad mitt i, och visade ett värde innan avstämningen hade varit).
  const mittvarde = skattningenMittI(s, e);
  const prickar = elev && s.narvaro && s.gjorda > 0;
  const r = riktning(e);
  const knappar = elev ? `<p class="pl-andra-knappar"><button type="button" class="knapp sekundar liten" data-elevpdf="${esc(e.id)}" data-goatcounter-click="planera:${esc(data.id)}:elevpdf" data-goatcounter-title="${esc(data.titel)}: en elevs sammanställning som pdf">${esc(pdfOrd('elevens sammanställning'))}<span class="visually-hidden">: ${esc(e.namn)}</span></button><button type="button" class="knapp sekundar liten" data-elevtext="${esc(e.id)}" data-goatcounter-click="planera:${esc(data.id)}:elevtext" data-goatcounter-title="${esc(data.titel)}: en elevs rad kopierad">Kopiera elevens rad<span class="visually-hidden">: ${esc(e.namn)}</span></button></p>` : '';
  return `${medRiktning ? `<p class="pl-riktning${r ? ` ${r}` : ''}">${r ? `<span aria-hidden="true">${PIL[r]} </span>` : ''}${esc(stor(riktningText(e)))}</p>` : ''}<div class="pl-grafruta">${graf(varden, s.veckor.map(veckansNamn), { stor: true, mitt: s.mitt, pass: prickar ? narvaroFor(e, s) : undefined, namn: e.namn })}</div>${prickar ? '<p class="pl-not">Prickarna under veckan är passen: fylld var med, ring var inte med, streck inte bockat.</p>' : ''}${mittvarde ? `<p>Vid avstämningen mitt i: ${mittvarde.varde}, ${esc(SKALAN[mittvarde.varde - 1].toLocaleLowerCase('sv'))}.</p>` : ''}${narvaro}${res ? `<ul class="pl-res">${res}</ul>` : ''}${knappar}`;
}

function renderaSamman() {
  const ruta = $('pl-samman');
  senaste = sammanstallning(plan, aktiv.foljd, idag);
  const s = senaste;
  if (!harSamman(s)) { ruta.hidden = true; ruta.innerHTML = ''; return; }
  const oppna = new Set([...ruta.querySelectorAll<HTMLDetailsElement>('details[data-elev]')].filter((d) => d.open).map((d) => d.dataset.elev));
  const etiketter = s.veckor.map(veckansNamn);
  const delar: string[] = [`<h2 id="pl-samman-rubrik" tabindex="-1">Sammanställningen${s.slut ? '' : ' hittills'}</h2>`, malRad('samman', false)];
  // Ett pass som inte är bockat är inte bockat: sammanställningen säger det läraren har fört in (granskningarna 2026-10-24).
  // Passens rad ur standarden, som i pdf:en och texten som kopieras.
  delar.push(`<p>${esc(passensRad(s))}</p>`);
  const vad = s.grupp ? 'gruppen' : 'eleverna';
  delar.push(`<section class="pl-block"><h3>${s.grupp ? 'Gruppen' : 'Eleverna'}</h3><p class="pl-not">${esc(stor(skattningenText(vad)))}.${s.grupp ? '' : ' Tryck på en elev för grafen och elevens utskrift.'}</p><div class="pl-elevlista">${s.elever.map((e) => {
    const elev = !s.grupp && e.id !== GRUPPEN;
    const varden = elevensVarden(s, e);
    const r = riktning(e);
    return `<details class="pl-elevdetalj" data-elev="${esc(e.id)}"${oppna.has(e.id) ? ' open' : ''}><summary><span class="pl-elevnamn">${esc(e.namn)}</span>${graf(varden, etiketter, { namn: e.namn })}<span class="pl-riktning${r ? ` ${r}` : ''}">${r ? `<span aria-hidden="true">${PIL[r]} </span>` : ''}${esc([riktningText(e), foreOchEfter(e), elev && e.narvaro !== null && s.gjorda ? `med i ${e.narvaro} av ${s.gjorda} pass` : ''].filter(Boolean).join(' · '))}</span></summary>${utveckling(e, s)}</details>`;
  }).join('')}</div></section>`);
  const veckorna = skattadeVeckor(s);
  const noter = s.veckor.filter((v) => v.not);
  if (veckorna.length || noter.length) {
    // En graf med en stapel säger inget; med färre än två veckor står veckan som text.
    const grafen = veckorna.length >= 2 ? `<div class="pl-grafruta">${graf(s.veckor.map((v) => v.skattning), etiketter, { stor: true, mitt: s.mitt, namn: 'Hur veckorna gick, 1 till 5' })}</div><p>Medel ${decimal(s.veckomedel)} av 5.</p>` : veckorna.map((v) => `<p>${esc(veckansNamn(v).Text)}: ${v.skattning} av 5.</p>`).join('');
    delar.push(`<section class="pl-block"><h3>Hur veckorna gick</h3>${grafen}${noter.length ? `<ul class="pl-noter">${noter.map((v) => `<li><span class="pl-etikett">${esc(veckansNamn(v).Text)}</span>${esc(v.not!)}</li>`).join('')}</ul>` : ''}</section>`);
  }
  const beslut = [
    ...(s.avstamning?.beslut || s.avstamning?.not ? [`<li><span class="pl-etikett">Avstämning mitt i insatsen</span>${esc(beslutText(s.avstamning))}</li>`] : []),
    ...(utvarderingenText(plan, s.utvardering, !s.slut) ? [`<li><span class="pl-etikett">Utvärdering efter insatsen</span>${esc(utvarderingenText(plan, s.utvardering, !s.slut))}</li>`] : []),
  ];
  if (beslut.length) delar.push(`<section class="pl-block"><h3>Besluten</h3><ul class="pl-noter">${beslut.join('')}</ul></section>`);
  delar.push(`<p class="pl-knappar"><button type="button" class="knapp" data-gruppdf data-goatcounter-click="planera:${esc(data.id)}:gruppdf" data-goatcounter-title="${esc(data.titel)}: sammanställningen som pdf">${esc(pdfOrd('sammanställningen'))}</button><button type="button" class="knapp sekundar" data-samman data-goatcounter-click="planera:${esc(data.id)}:sammanstallning" data-goatcounter-title="${esc(data.titel)}: sammanställningen kopierad">Kopiera sammanställningen</button></p><p class="pl-not">Utskriften har elevernas namn. Texten som kopieras har inga: ett namn ur elevlistan i en mening blir ”en elev”.</p>`);
  ruta.innerHTML = delar.join('');
  ruta.hidden = false;
}
// En fil som laddas ner, med namnet ur standardens filnamnet (K-519): pdf:erna, kopian och kalenderfilen.
function laddaNer(fil: Blob, filnamn: string) {
  const url = URL.createObjectURL(fil);
  const a = document.createElement('a');
  a.href = url; a.download = filnamn;
  document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
// En pdf som görs i webbläsaren skrivs ut direkt där det går, och laddas annars ner, så att telefonen öppnar den.
async function visaPdf(bytes: Uint8Array, filnamn: string) {
  const fil = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  if (!kanSkrivaUtPdf()) { laddaNer(fil, filnamn); return; }
  const url = URL.createObjectURL(fil);
  skrivUt(url);
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
// Sammanställningens knappar, och elevens när eleven är utfälld i veckan. Sammanställningen räknas när läraren trycker, så att
// det senast ifyllda kommer med.
async function samman(knapp: HTMLButtonElement) {
  // Det läraren skriver i elevlistan räknas klart först, som när hen lämnar fältet, så att ett namn som har lämnat listan inte
  // följer med texten, också när knappen inte tar fokus från fältet (steget Samma sak överallt 2026-10-25: avstämningens
  // mening fick tillbaka namnet när en ny elev skrevs på raden och läraren kopierade utan att lämna fältet).
  if (redigering) uppdateraElevlistan('klar');
  const s = sammanstallning(plan, aktiv.foljd, idag);
  if (knapp.hasAttribute('data-samman')) { const ok = await kopiera(sammanstallningstext(info(), plan, s)); if (ok) kvittera(knapp, 'Kopierad'); visaBesked(ok ? 'Sammanställningen är kopierad, utan elevernas namn.' : 'Texten gick inte att kopiera i den här webbläsaren.'); return; }
  if (knapp.dataset.elevtext) { const ok = await kopiera(elevtext(info(), plan, s, knapp.dataset.elevtext)); if (ok) kvittera(knapp, 'Kopierad'); visaBesked(ok ? 'Elevens rad är kopierad, utan namnet. Klistra in den i elevens dokumentation.' : 'Texten gick inte att kopiera i den här webbläsaren.'); return; }
  if (knapp.hasAttribute('data-gruppdf') || knapp.dataset.elevpdf) {
    knapp.setAttribute('aria-busy', 'true');
    try {
      const id = knapp.dataset.elevpdf;
      const bytes = id ? await elevPdf(plan, s, id, pdfInfo(), idag, aktiv.foljd.franvaro) : await gruppPdf(plan, s, pdfInfo(), idag);
      // Filnamnet säger vad, vem, metoden och dagens datum (K-519), så att varje sammanställning får ett eget namn.
      await visaPdf(bytes, filnamnet('sammanstallning', id ? { vem: s.elever.find((x) => x.id === id)?.namn ?? 'elev', metod: data.id, datum: idag } : { grupp: true, vem: aktiv.namn, metod: data.id, datum: idag }));
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
const kopiansAlder = () => (aktiv.kopia ? Math.round((Date.parse(idag) - Date.parse(aktiv.kopia.slice(0, 10))) / 86400000) : null);
function renderaKopia() {
  const text = $('pl-kopia-text');
  const harFoljd = aktiv.folj && harInfort();
  $('pl-kopia-spara').hidden = !aktiv.sparad;
  $('pl-spara-nere').hidden = aktiv.sparad;
  $('pl-lank').hidden = !aktiv.sparad && !aktiv.franLank;
  const alder = kopiansAlder();
  // Påminnelsen efter en vecka, som Safaris sju dagar (granskningen 2026-10-24).
  text.classList.toggle('pl-paminn', harFoljd && (alder === null || alder > 7));
  text.textContent = !aktiv.sparad && !aktiv.franLank
    ? 'Spara planen, så finns den i den här webbläsaren och går att ladda ner som fil. Har du laddat ner en plan på en annan dator? Öppna den här.'
    : harFoljd
      ? alder === null ? 'Det du för in finns bara i den här webbläsaren. Ladda ner planen och lägg filen där du har skolans filer, så finns den kvar och går att öppna på en annan dator. Länken visar bara planen.'
        : alder > 7 ? `Planen laddades senast ner ${datumText(aktiv.kopia!.slice(0, 10))}. Ladda ner den igen, så kommer det senaste med.` : `Planen laddades senast ner ${datumText(aktiv.kopia!.slice(0, 10))}. Länken visar bara planen; filen har allt.`
      : 'Länken visar planen på en annan dator eller telefon. Planen som fil har allt, också gruppens namn.';
}
function sparaKopia() {
  aktiv.kopia = idag;
  const egen = sparadAv();
  if (aktiv.sparad) skrivPlaner([egen, ...lasPlaner().planer.filter((p) => p.id !== aktiv.id)]);
  // Filen i planens format, med modulens version (planfilen i src/scripts/insatser-lagring.ts).
  const fil = planfilen(egen, PLANERA.version);
  laddaNer(new Blob([fil], { type: 'application/json' }), filnamnet('plan', { vem: aktiv.namn, metod: data.id, datum: idag }));
  renderaKopia();
  visaBesked('Planen är nedladdad. Lägg filen bland skolans filer. Den har elevernas namn, så dela den inte.');
}
$('pl-kopia-spara').addEventListener('click', sparaKopia);
const tidOrd = (andrad?: string) => (!andrad ? 'tidigare' : andrad.includes('T') ? `${datumText(andrad.slice(0, 10))} kl. ${tidText(andrad.slice(11, 16))}` : datumText(andrad.slice(0, 10)));
$<HTMLInputElement>('pl-kopia-fil').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const fil = input.files?.[0];
  input.value = '';
  if (!fil) return;
  let innehall: unknown;
  try { innehall = JSON.parse(await fil.text()); } catch { visaBesked('Filen är inte en nedladdad plan.'); return; }
  // Kopian konverteras från formatets version och rensas innan den ersätter något: fälten som sidan kan visa, och för metoden
  // på den här sidan räknas datumen om ur valen (Codex 2026-10-24: en kopia som hade ändrats för hand gjorde sidan obrukbar).
  // En fil från 0.2.7 och framåt öppnas alltid, och beskedet säger det som saknades när läraren behöver veta det (lasPlanfil).
  const last = lasPlanfil(innehall);
  const p = last?.plan ?? null;
  const valen = p ? lasVal(p.val) : null;
  if (!p || !valen) { visaBesked('Filen är inte en nedladdad plan.'); return; }
  p.val = kodaVal(valen.val);
  if (p.metod === data.id) {
    const pl = planera(mp, valen.val);
    p.schema = schemaAv(pl, valen.val);
    p.bockade = pl.pass.filter((x) => p.foljd!.gjorda!.includes(passetsDag(x))).length;
  }
  skrivVantande(true);
  const finns = lasPlaner().planer.find((x) => x.id === p.id);
  const oppna = () => {
    if (!skrivPlaner([p, ...lasPlaner().planer.filter((x) => x.id !== p.id)])) { if (lagringenArNyare()) sparfel(); else visaBesked('Planen i filen gick inte att spara i den här webbläsaren.'); return; }
    // En kopia av en annan metods plan öppnas på den metodens sida.
    if (p.metod !== data.id) {
      try { sessionStorage.setItem('pl-besked', ['Planen är öppnad ur filen, med allt som förts in.', ...(last?.varningar ?? [])].join(' ')); } catch { /* utan lagring */ }
      location.href = planensAdress(p);
      return;
    }
    aktiv = franSparad(p);
    visa = undefined;
    olikaTider = false;
    plan = planera(mp, aktiv.val);
    uppdateraAdressen();
    rendera();
    ($('pl-andra') as HTMLDetailsElement).open = false;
    visaBesked(['Planen är öppnad ur filen, med allt som förts in.', ...(last?.varningar ?? [])].join(' '), finns ? { text: 'Ångra', kvar: true, gor: () => { skrivPlaner([finns, ...lasPlaner().planer.filter((x) => x.id !== finns.id)]); aktiv = franSparad(finns); plan = planera(mp, aktiv.val); uppdateraAdressen(); rendera(); visaBesked('Planen är som före kopian.'); } } : undefined);
  };
  // En kopia som skulle ersätta något som har ändrats efter den frågar först, också samma dag (granskningen 2026-10-24).
  if (finns && innehallAv(finns) !== innehallAv(p) && (finns.andrad ?? '') >= (p.andrad ?? '')) {
    fragaForst(input.closest('label') as HTMLElement, `Planen i den här webbläsaren ändrades ${tidOrd(finns.andrad)}, och planen i filen ${tidOrd(p.andrad)}. Ersätta den med planen i filen?`, 'Ersätt med filen', oppna);
    return;
  }
  oppna();
});
// Webbläsaren ombeds spara planerna varaktigt, så att den inte rensar dem på egen hand. Den bestämmer själv.
const bedOmVaraktig = () => { try { void navigator.storage?.persist?.(); } catch { /* utan stöd */ } };

// ---------- Flera planer för samma metod ----------
// Dina planer står så snart en plan är sparad, med Ny plan (granskningarna 2026-10-24: med en sparad plan fanns ingen väg
// till en plan för en andra grupp). Planerna står i tur och ordning, som i metodbanken. Av de avslutade står de tre senaste
// med märket Avslutad, och de äldre ligger hopfällda under en rad med en nerpil, så att raden håller också med tjugo planer
// (Niclas 2026-10-25: "se sina 3 senaste avslutad och resten i en rullgardin"). Planen som är öppen står alltid synlig.
const SYNLIGA_AVSLUTADE = 3;
let aldreOppna = false;
function renderaGrupper() {
  const egna = mina();
  const nav = $('pl-grupper');
  nav.hidden = !egna.length;
  if (nav.hidden) { nav.innerHTML = ''; return; }
  const namnen = new Map(skiljNamnen(egna.map(planensNamn)).map((n, i) => [egna[i].id, n]));
  const oppen = (p: SparadPlan) => p.id === aktiv.id && aktiv.sparad;
  const aldre = egna.filter((p) => statusAv(p, idag) === 'avslutad').slice(SYNLIGA_AVSLUTADE).filter((p) => !oppen(p));
  const knapp = (p: SparadPlan) => `<button type="button" class="pl-chip" data-plan="${esc(p.id)}" aria-pressed="${oppen(p)}">${esc(namnen.get(p.id) ?? planensNamn(p))}${statusAv(p, idag) === 'avslutad' ? ` <span class="pl-status avslutad">${STATUSNAMN.avslutad}</span>` : ''}</button>`;
  nav.innerHTML = `<span class="pl-etikett">Dina planer för metoden</span>${egna.filter((p) => !aldre.includes(p)).map(knapp).join('')}<button type="button" class="pl-chip pl-ny" data-plan="ny" aria-pressed="${!aktiv.sparad && !aktiv.franLank}">Ny plan</button>${aldre.length ? `<details class="pl-aldre"${aldreOppna ? ' open' : ''}><summary>${aldre.length === 1 ? 'En äldre avslutad plan' : `${aldre.length} äldre avslutade planer`}</summary><div class="pl-aldre-lista">${aldre.map(knapp).join('')}</div></details>` : ''}`;
}
// Den hopfällda raden står kvar öppen när planerna ritas om.
$('pl-grupper').addEventListener('toggle', (e) => { if ((e.target as Element).matches?.('.pl-aldre')) aldreOppna = (e.target as HTMLDetailsElement).open; }, true);
$('pl-grupper').addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('[data-plan]');
  if (!b) return;
  skrivVantande(true);
  const p = mina().find((x) => x.id === b.dataset.plan);
  aktiv = p ? oppnaSparad(p) : nyAktiv();
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
// Ett besked går också bort när läraren skriver något utanför det, så att Ångra aldrig tar bort det som skrevs efter
// beskedet (Codex 2026-10-25: ögonblicksbilden bakom Ångra hade inte det som förts in sedan).
document.addEventListener('input', (e) => {
  const t = $('pl-toast');
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
function visaNotis(text: string, knappar = '') {
  $('pl-besked-text').textContent = text;
  const k = $('pl-besked-knappar');
  k.innerHTML = knappar;
  k.hidden = !knappar;
  $('pl-besked').hidden = !text;
}
// En app med egen webbläsare, som Facebook och Instagram, har sin egen lagring: en plan som sparas där finns inte i Safari
// eller Chrome på samma telefon (granskningen 2026-10-24; många kommer till sajten från Facebook). Beskedet står också efter
// att planen har sparats, med vägen ut och en knapp som kopierar länken, som håller där vägen ut inte öppnas (K-510,
// src/scripts/webblasaren.ts).
function appensBesked(): [string, string] {
  const w = webblasaren();
  if (!w.app || !lagringOk) return ['', ''];
  // Adressen är planens länk med valen, också de som inte är sparade (Codex 2026-10-25), och den görs om vid trycket.
  const ut = vagenUt(lank(), w);
  const utKnapp = ut ? `<a class="knapp liten" id="pl-ut" href="${esc(ut.href)}" ${goat('ut-ur-appen', `${ut.text} från ${w.app} webbläsare`)}>${esc(ut.text)}</a>` : '';
  return [vagenUtText(w), `${utKnapp}<button type="button" class="knapp liten${ut ? ' sekundar' : ''}" id="pl-ut-kopiera" ${goat('lank-ur-appen', `länken kopierad i ${w.app} webbläsare`)}>Kopiera länken</button>`];
}
// Vägen ut och Kopiera länken i beskedet om en apps egen webbläsare bär planens länk med valen som de är vid trycket, också
// efter ett byte av plan (K-510; Codex 2026-10-25).
$('pl-besked').addEventListener('click', async (e) => {
  const ut = (e.target as Element).closest<HTMLAnchorElement>('#pl-ut');
  const dit = ut && vagenUt(lank(), webblasaren());
  if (ut && dit) { ut.href = dit.href; return; }
  const knapp = (e.target as Element).closest<HTMLButtonElement>('#pl-ut-kopiera');
  if (!knapp) return;
  const ok = await kopiera(lank());
  if (ok) kvittera(knapp, 'Kopierad');
  visaBesked(ok ? `Länken är kopierad. Klistra in den i ${webblasaren().ios ? 'Safari' : 'webbläsaren'}.` : 'Länken gick inte att kopiera i den här webbläsaren.');
});
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

// Spara planen, överst och längst ned före sparandet.
function sparaPlanen() {
  aktiv.sparad = true;
  aktiv.franLank = false;
  if (!spara()) { aktiv.sparad = false; sparfel(); return; }
  bedOmVaraktig();
  raknaPagaende(lasPlaner().planer);
  // Raden om appen Stöd följer om planen är sparad (src/scripts/appen.ts).
  document.dispatchEvent(new Event('planera:sparad'));
  uppdateraAdressen();
  const [appText, appKnappar] = appensBesked();
  notis = appText;
  visaNotis(appText, appKnappar);
  rendera();
  ($('pl-andra') as HTMLDetailsElement).open = false;
  // Läraren kommer till veckan överst, och beskedet säger nästa steg och leder till kalendern och texten till
  // åtgärdsprogrammet under planen (användbarhetsprovet 2026-10-25: efter Spara stod sidan kvar utan besked).
  tillVy(undefined);
  visaBesked(nuVy() === 'fore' ? 'Planen är sparad. Börja med det du gör före första passet.' : 'Planen är sparad i den här webbläsaren.', { text: 'Kalendern och åtgärdsprogrammet', gor: () => { $('pl-planen').scrollIntoView({ block: 'start' }); $('pl-planen-rubrik').focus({ preventScroll: true }); } });
}
$('pl-spara').addEventListener('click', sparaPlanen);
$('pl-spara-nere').addEventListener('click', sparaPlanen);
// Texten till åtgärdsprogrammet: åtgärden, målet, omfattningen, vad eleven arbetar med och uppföljningen.
function atgardstext() {
  const genomforda = aktiv.folj && aktiv.foljd.gjorda.length ? { genomforda: plan.pass.filter((p) => gjort(passetsDag(p))).length } : {};
  return dokumentationstext({ titel: data.titel, undertitel: data.undertitel, adress: data.adress, mal: data.mal, steg: (data.progression?.rader ?? []).map((r) => r.kort), uppfoljning: data.uppfoljning.rader, nivaNamn: nivaNamn() }, plan, aktiv.val, { minuter: minuter(), folj: aktiv.folj, utvardering: aktiv.foljd.utvardering, elever: elevernasNamn(aktiv.foljd), pagar: !!plan.sistaPass && !slutNu(), ...genomforda });
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
  laddaNer(new Blob([vanligText(text)], { type: 'text/calendar;charset=utf-8' }), filnamnet('kalender', { vem: aktiv.namn, metod: data.id, datum: idag }));
  kvittera($('pl-kalender'), 'Hämtad');
  visaBesked('Kalenderfilen är hämtad. Öppna den, så läggs passen och uppföljningen i kalendern. I Google Kalender läggs filen in på datorn.');
});
$('pl-ta-bort').addEventListener('click', (e) => {
  // Frågan säger det som gäller: med det som förts in, och om det finns en kopia (granskningen 2026-10-24).
  const fraga = !(aktiv.folj && harInfort()) ? 'Ta bort planen?' : aktiv.kopia ? `Ta bort planen med allt du har fört in? Du laddade senast ner planen ${datumText(aktiv.kopia.slice(0, 10))}.` : 'Ta bort planen med allt du har fört in? Du har inte laddat ner den.';
  fragaForst(e.currentTarget as HTMLElement, fraga, 'Ta bort planen', () => {
    skrivVantande(true);
    const borttagen = lasPlaner().planer.find((p) => p.id === aktiv.id) ?? sparadAv();
    if (!skrivPlaner(lasPlaner().planer.filter((p) => p.id !== aktiv.id))) { sparfel(); return; }
    aktiv = nyAktiv();
    visa = undefined;
    plan = planera(mp, aktiv.val);
    history.replaceState(null, '', location.pathname);
    rendera();
    ($('pl-andra') as HTMLDetailsElement).open = true;
    visaBesked('Planen är borttagen.', { text: 'Ångra', kvar: true, gor: () => {
      skrivPlaner([borttagen, ...lasPlaner().planer]);
      aktiv = oppnaSparad(borttagen);
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
  renderaLage();
  renderaVal();
  renderaSumma();
  renderaVeckor();
  renderaVeckan();
  renderaSamman();
  renderaKopia();
  renderaGrupper();
  // Bocken ritas fram en gång, när läraren just har avslutat insatsen.
  nyssAvslutad = false;
}

// Lägesraden överst i en sparad plan: planens läge, som märkena i Dina insatser, och lägets viktigaste knapp, på samma
// ställe i varje vecka och varje metod (Niclas 2026-10-25: Avsluta låg "bakom en rubrik som var bakom en pil ... Det är
// en rätt viktig knapp så den nästan ska finnas längst ner och längst upp"; formen A ur en Sonnets och en Opus förslag
// samma kväll, med en knapp, så att två knappar inte gör samma sak). Kommande: första passet. Pågående: sista passet och
// Avsluta insatsen, med formuläret under raden. Ett avslut längre fram: avslutet och Ångra avslutet. Efter sista passet:
// när planen avslutas av sig själv och Till utvärderingen. Avslutad: hur, med bocken som ritas fram, och Ångra avslutet, och
// planen grå och streckad, så att avslutet syns var läraren än är på sidan (samma kväll: "avslutet måste märkas när det
// är tryckt. Både i scrollandet, vid knapptrycket och när man går in på den"). Allt i planen går att använda som förut.
// Formuläret Avsluta insatsen: öppet och med det läraren har valt och skrivit, för planen det öppnades i, så att en
// omritning, som efter en bock eller en ändring i en annan flik, inte tar bort det och ett byte av plan inte tar det med sig
// (Codex 2026-10-25).
let avslutaOppen = false;
let avslutaUtkast: { id: string; nr?: number; not?: string } | null = null;
const avslutaFor = (oppen: boolean) => { avslutaOppen = oppen; if (oppen) avslutaUtkast = { ...(avslutaUtkast?.id === aktiv.id ? avslutaUtkast : {}), id: aktiv.id }; else avslutaUtkast = null; };
// Passen som kan bli insatsens sista, i planens alla veckor, lika för knappen och formuläret (Codex 2026-10-25: knappen stod i
// en plan där inget pass kunde väljas).
const slutpassen = () => plan.veckor.flatMap((w) => slutpassI(w));
function renderaLage() {
  const ruta = $('pl-lage');
  const visas = (aktiv.sparad || aktiv.franLank) && plan.pass.length > 0;
  const avslutad = visas && avslutadNu();
  sida.classList.toggle('pl-avslutad-plan', avslutad);
  ruta.hidden = !visas;
  if (avslutaUtkast && avslutaUtkast.id !== aktiv.id) avslutaFor(false);
  if (!visas) { ruta.innerHTML = ''; avslutaFor(false); return; }
  const lage = avslutad ? 'avslutad' : plan.forstaPass && idag < plan.forstaPass ? 'kommande' : 'pagaende';
  ruta.className = `pl-lage ${lage}${avslutad && nyssAvslutad ? ' ny' : ''}`;
  const angra = '<button type="button" class="knapp sekundar liten" data-gor="angra-avslut">Ångra avslutet</button>';
  // Efter sista passet avslutar läraren insatsen i utvärderingen, och utan Följ insatsen, där ingen utvärdering finns, med
  // knappen här (verifieringen 2026-10-25: raden sa "om du inte avslutar den före" utan någon knapp).
  const tillUtv = aktiv.folj ? '<button type="button" class="knapp sekundar liten" data-vy="efter">Till utvärderingen</button>'
    : `<button type="button" class="knapp sekundar liten" data-gor="avsluta-nu" ${goat('avsluta', 'insatsen avslutad efter sista passet')}>Avsluta insatsen</button>`;
  const kanAvsluta = lage === 'pagaende' && !plan.slut && !slutNu() && slutpassen().length > 0;
  if (!kanAvsluta) avslutaFor(false);
  const [text, knappar] = lage === 'avslutad' ? [`${!plan.slut && AVSLUTANDE.includes(aktiv.foljd.utvardering?.beslut ?? '') ? 'Insatsen är avslutad. ' : ''}${hurAvslutad()}`, [angra]]
    : lage === 'kommande' ? [`Första passet ${dagText(plan.forstaPass!)}.`, []]
    : slutNu() ? [`${sistaPassetText()} ${plan.slut ? avslutetText(plan) : fortsatter()}`, [plan.slut && !aktiv.folj ? '' : tillUtv]]
    : plan.slut ? [utvarderingenText(plan, aktiv.foljd.utvardering, true), [angra]]
    : [`Sista passet ${dagText(plan.sistaPass!)}.`, [kanAvsluta ? `<button type="button" class="knapp sekundar liten" data-gor="avsluta" aria-expanded="${avslutaOppen}" aria-controls="pl-avsluta">Avsluta insatsen</button>` : '']];
  const bock = avslutad ? '<svg class="pl-avslutad-bock" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/><path d="M14 24.5l7 7 13-14"/></svg>' : '';
  const synliga = knappar.filter(Boolean);
  ruta.innerHTML = `<p${avslutad && nyssAvslutad ? ' role="status"' : ''}>${bock}<span class="pl-status ${lage}">${STATUSNAMN[lage]}</span> ${esc(text)}</p>${synliga.length ? `<p class="pl-andra-knappar">${synliga.join('')}</p>` : ''}${kanAvsluta ? avslutaFormular() : ''}`;
}
// Formuläret Avsluta insatsen, under raden överst: planens pass som kan bli det sista, i grupper per vecka, förvalt i veckan
// som visas, dagens pass eller det senaste som har varit i den vecka gruppen är i, vad som stryks, anledningen med två
// förslag, och knappen som säger dagen (Opus 2026-10-25).
function avslutaFormular(): string {
  const mojliga = slutpassen();
  if (!mojliga.length) return '';
  const vy = visadVy(), nu = nuVy();
  const vecka = typeof vy === 'number' ? vy : typeof nu === 'number' ? nu : 1;
  const iVeckan = mojliga.filter((p) => p.vecka === vecka);
  const utkast = avslutaUtkast?.id === aktiv.id ? avslutaUtkast : null;
  const forvalt = mojliga.find((p) => p.nr === utkast?.nr) ?? (vecka === nu ? [...iVeckan].reverse().find((p) => p.datum <= idag) : undefined) ?? iVeckan[iVeckan.length - 1] ?? [...mojliga].reverse().find((p) => p.datum <= idag) ?? mojliga[0];
  const grupper = plan.veckor.filter((w) => mojliga.some((p) => p.vecka === w.nr)).map((w) => `<optgroup label="${esc(`${rubrikVecka(w)}, ${spannKort(veckansDagar(plan, w).fran, veckansDagar(plan, w).till)}`)}">${mojliga.filter((p) => p.vecka === w.nr).map((p) => `<option value="${p.nr}"${p === forvalt ? ' selected' : ''}>${esc(`Pass ${p.nr}, ${dagText(p.datum)}`)}</option>`).join('')}</optgroup>`).join('');
  return `<div class="pl-flytta pl-avsluta" id="pl-avsluta"${avslutaOppen ? '' : ' hidden'}><label class="pl-etikett" for="pl-avsluta-pass">Sista passet</label><select class="pl-falt" id="pl-avsluta-pass">${grupper}</select><p id="pl-avsluta-text">${esc(avslutaText(forvalt.nr))}</p><span class="pl-etikett">Varför, om du vill</span><p class="pl-andra-knappar">${['Gruppen har nått målet', 'Skolans andra arbete tar över'].map((x) => `<button type="button" class="pl-chip" data-anledning="${esc(x)}">${esc(x)}</button>`).join('')}</p><label class="visually-hidden" for="pl-avsluta-not">Anledningen</label><input class="pl-falt pl-brett" type="text" id="pl-avsluta-not" maxlength="200" value="${esc(utkast?.not ?? aktiv.foljd.utvardering?.not ?? '')}" /><p class="pl-hjalp">Skälet står i varje sammanställning, utan elevernas namn. Avslutet går att ångra. Passen i din kalender tar du bort själv.</p><p class="pl-andra-knappar"><button type="button" class="knapp liten" data-gor="avsluta-klar" ${goat('avsluta', 'insatsen avslutad tidigare')}>${esc(`Avsluta efter ${dagText(forvalt.datum)}`)}</button><button type="button" class="pl-textknapp" data-gor="avsluta-avbryt">Avbryt</button></p></div>`;
}
// Planen slutar med passet läraren valde, och anledningen blir utvärderingens mening med beslutet Avsluta insatsen. Veckan
// med det sista passet visas, med det som ströks, och raden överst säger avslutet (K-542).
function avslutaKlar() {
  const nr = Number($<HTMLSelectElement>('pl-avsluta-pass').value);
  const sista = plan.pass.find((p) => p.nr === nr);
  if (!sista) return;
  const not = $<HTMLInputElement>('pl-avsluta-not').value.trim().slice(0, 200);
  andra(() => {
    aktiv.val.mitt ??= mittVeckan(plan) ?? undefined;
    aktiv.val.slut = nr;
    // Anledningen är det som står i fältet, också ett tömt fält (Codex 2026-10-25: den gamla meningen stod kvar).
    aktiv.foljd = { ...aktiv.foljd, utvardering: { ...(aktiv.foljd.utvardering ?? {}), beslut: 'avsluta', not } };
    visa = sista.vecka;
    nyssAvslutad = true;
    avslutaFor(false);
  }, () => `${avslutadNu() ? `Insatsen är avslutad. ${sistaPassetText()}` : `Insatsen slutar med pass ${plan.sistaNr}, ${dagText(plan.sistaPass!)}.`} ${stor(struketText(plan))} ${avslutadNu() ? 'ströks' : 'stryks'} ur planen.`, true);
  $('pl-lage').scrollIntoView({ block: 'start' });
}
$('pl-lage').addEventListener('click', (e) => {
  const knapp = (e.target as Element).closest<HTMLButtonElement>('button');
  if (!knapp) return;
  const gor = knapp.dataset.gor;
  if (gor === 'angra-avslut') { angraAvslutet(); return; }
  if (gor === 'avsluta-klar') { avslutaKlar(); return; }
  // Utan Följ insatsen avslutas insatsen efter sista passet här, med utvärderingens beslut Avsluta insatsen, och Ångra
  // avslutet öppnar den igen (verifieringen 2026-10-25).
  if (gor === 'avsluta-nu') {
    nyssAvslutad = true;
    andra(() => { aktiv.foljd = { ...aktiv.foljd, utvardering: { ...(aktiv.foljd.utvardering ?? {}), beslut: 'avsluta' } }; }, 'Insatsen är avslutad.', true);
    return;
  }
  if (knapp.dataset.vy) { tillVy(knapp.dataset.vy === 'efter' ? 'efter' : Number(knapp.dataset.vy)); return; }
  // Ett förslag på anledning skriver skälet i fältet, där läraren kan skriva vidare.
  if (knapp.dataset.anledning !== undefined) { const falt = $<HTMLInputElement>('pl-avsluta-not'); falt.value = knapp.dataset.anledning; if (avslutaUtkast) avslutaUtkast.not = falt.value; falt.focus(); return; }
  // Formuläret ritas om när det öppnas, med förvalet i veckan som visas, och när det stängs, så att Avbryt tar bort det som
  // valdes och skrevs. Utkastet börjar med det formuläret visar, så att en omritning inte byter förvalt pass (Codex
  // 2026-10-25: förvalet följde veckan som visades vid nästa omritning).
  if (gor === 'avsluta' || gor === 'avsluta-avbryt') {
    avslutaFor(gor === 'avsluta' && !avslutaOppen);
    renderaLage();
    if (avslutaOppen && avslutaUtkast) {
      avslutaUtkast.nr = Number($<HTMLSelectElement>('pl-avsluta-pass').value);
      avslutaUtkast.not = $<HTMLInputElement>('pl-avsluta-not').value;
      $('pl-avsluta-pass').focus();
    } else $('pl-lage').querySelector<HTMLElement>('[data-gor="avsluta"]')?.focus();
  }
});
// Anledningen som läraren skriver står kvar i utkastet, så att en omritning inte tar bort den.
$('pl-lage').addEventListener('input', (e) => { const falt = e.target as HTMLInputElement; if (falt.id === 'pl-avsluta-not' && avslutaUtkast) avslutaUtkast.not = falt.value; });
// Det valda sista passet: texten säger vad som stryks, och knappen dagen.
$('pl-lage').addEventListener('change', (e) => {
  const falt = e.target;
  if (!(falt instanceof HTMLSelectElement) || falt.id !== 'pl-avsluta-pass') return;
  const sista = plan.pass.find((p) => p.nr === Number(falt.value));
  if (!sista) return;
  if (avslutaUtkast) avslutaUtkast.nr = sista.nr;
  $('pl-avsluta-text').textContent = avslutaText(sista.nr);
  $('pl-lage').querySelector('[data-gor="avsluta-klar"]')!.textContent = `Avsluta efter ${dagText(sista.datum)}`;
});

// Ångra avslutet: planen får tillbaka det avslutet strök, och beslutet att avsluta tas bort, så att insatsen pågår igen. Har
// sista passet redan varit lägger Förläng insatsen till veckor (Niclas 2026-10-25: "Ska finnas en ångra knapp som du sa så
// den aktiveras igen och kan läggas till veckor mm").
function angraAvslutet() {
  const tillbaka = plan.struket ? struketText(plan) : '';
  const mening = !!aktiv.foljd.utvardering?.not;
  andra(() => {
    delete aktiv.val.slut;
    const u = aktiv.foljd.utvardering;
    // Beslutet tas bort, och lärarens mening står kvar under utvärderingen, där den går att ändra (Codex 2026-10-25: Ångra
    // avslutet tog bort meningen som läraren hade skrivit).
    if (u && AVSLUTANDE.includes(u.beslut ?? '')) aktiv.foljd = { ...aktiv.foljd, utvardering: { ...u, beslut: undefined } };
    // Ett avslut av sig själv ångras för planens sista pass: förlängs planen avslutas den två veckor efter det nya sista
    // passet (Niclas 2026-10-25: "Man kan ångra det som vanligt").
    const ny = planera(mp, aktiv.val);
    if (ny.sistaPass && insatsenAvslutad(ny.sistaPass, aktiv.foljd.utvardering?.beslut, idag, aktiv.foljd.oppen, planensSistaDag(ny))) aktiv.foljd = { ...aktiv.foljd, oppen: ny.sistaPass };
    if (visa === 'efter') visa = undefined;
  }, () => `${slutNu() ? `Avslutet är ångrat. ${fortsatter()}${aktiv.folj ? ' Förläng insatsen under utvärderingen lägger till veckor.' : ''}` : `Insatsen pågår igen.${tillbaka ? ` ${stor(tillbaka)} är tillbaka i planen.` : ''}`}${mening ? ' Meningen under utvärderingen står kvar.' : ''}`, true);
}

// En annan flik med samma plan: det den sparar visas här också, så att den här fliken inte skriver över det med det den hade
// (Codex 2026-10-24: en bock i en flik försvann när en skattning sparades i en annan). En plan som tas bort i en annan flik
// stängs här.
addEventListener('storage', (e) => {
  if (e.key !== null && e.key !== 'insatser') return;
  const p = aktiv.sparad ? lasPlaner().planer.find((x) => x.id === aktiv.id) : undefined;
  // Ett besked med Ångra gäller det som stod före, så det går bort när en annan flik har ändrat planen (Codex 2026-10-25).
  if (aktiv.sparad && !p) {
    const egna = mina();
    aktiv = egna.length ? franSparad(egna[0]) : nyAktiv();
    visa = undefined; olikaTider = false; redigering = null;
    visaBesked('');
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
    visaBesked('');
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
// Kopiorna i lagringen görs om före första ritningen, så att Dina planer för metoden visar läget som det är (Codex
// 2026-10-25: en plan från 0.2.7 stod som Avslutad i listan och Pågående i raden överst).
friskaUpp();
rendera();
// En plan som pågår säger det till statistiken, en gång i veckan (K-504).
raknaPagaende(lasPlaner().planer);
($('pl-andra') as HTMLDetailsElement).open = !aktiv.sparad;
if (aktiv.uppdaterad && data.uppdaterad && aktiv.uppdaterad < data.uppdaterad && !notis) notis = `Metoden har uppdaterats ${data.uppdateradText ?? data.uppdaterad}, efter att planen gjordes. Planen följer metoden som den är nu.`;
const [appText, appKnappar] = appensBesked();
if (appText) notis = appText;
// Det sidan ser av webbläsaren, längst ned under Webbläsaren, för felsökning: namnet, Client Hints, om sidan känner igen
// en apps egen webbläsare, och om den sparar (Niclas 2026-10-25, om LinkedIns webbläsare på Android). Det står bara här.
{
  const w = webblasaren();
  const ch = (navigator as Navigator & { userAgentData?: { brands?: { brand: string; version: string }[] } }).userAgentData;
  $('pl-teknik').textContent = [
    `Webbläsarens namn: ${navigator.userAgent}`,
    `Client Hints: ${ch?.brands?.length ? ch.brands.map((b) => `${b.brand} ${b.version}`).join(', ') : 'saknas'}`,
    `Sidan känner igen: ${w.app ? `${w.app} egen webbläsare` : iAppen() ? 'appen Stöd' : 'en vanlig webbläsare'}`,
    `Sparar: ${lagringOk ? 'ja' : 'nej'}`,
  ].join('. ') + '.';
}
if (!lagringOk) notis = 'Webbläsaren sparar inget här, till exempel i privat läge. Kopiera länken till planen, så finns den kvar.';
visaNotis(notis, notis === appText ? appKnappar : '');
if (lamnatBesked) visaBesked(lamnatBesked);
uppdateraAdressen();
sida.classList.add('pl-klar');
