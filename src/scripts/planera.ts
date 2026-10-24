// Planera insatsen (K-489; Niclas 2026-10-24: "Man får val att göra och sedan skickas till rätt sak per vecka?"). Sidan
// räknar planen med standardens planmotor (src/lib/standard/plan.js) ur metodens fält, som sidan bär som JSON
// (src/lib/insatsplan.ts). En plan som inte är sparad är ett förslag: valen och planen. En sparad plan, eller en plan ur
// en länk, visar först veckan gruppen är i, med nästa pass överst, veckans fokus, uppföljningen och texterna med veckans
// slag (Codex-granskningen av utkastet 2026-10-24). Veckorna följer gruppen: Upprepa veckan tar samma vecka en gång till,
// och lov, flyttade och inställda pass flyttar resten fram.
//
// Planen är två saker (Niclas samma dag: "både blir ett sätt att planera insatsen och följa den över tid. Men att man
// enkelt bara kan ha en planläggare"): bara planen, eller Följ insatsen, ett val. Den som följer insatsen bockar passen
// som blev av, skattar varje vecka hur väl eleverna (eller gruppen) klarar metodens förmåga på egen hand, 1 till 5, och
// gör avstämningen mitt i och utvärderingen efter. Närvaron och veckans gång är med när läraren vill (Niclas: "kan finnas
// om du gör det snyggt och smidigt men inte ett krav om man inte fyller i den"). Elevernas namn och allt läraren för in
// stannar i webbläsaren och följer aldrig med länken, kalenderfilen, statistiken eller texterna som kopieras.
import {
  BESLUT, dagText, datumText, dokumentationstext, elevtext, forval, GRUPPEN, helgdag, isoVecka, kalenderfil, kodaVal, lasVal, mandagen,
  metodplan, mittVeckan, nastaPass, passetsDag, planera, plusDagar, riktning, sammanstallning, sammanstallningstext, SKALAN, skattningsfragan,
  spannKort, uppfoljningensTillfallen, uppraknat, veckansDagar, veckanFor, veckodag, veckonyckel, VECKODAGAR,
  type Foljd, type Plan, type PlanVecka, type Sammanstallning, type SammanstallningElev, type Val,
} from '../lib/standard/index.js';
import type { PlanData } from '../lib/insatsplan';
import { idagLokalt, lasPlaner, narText, nyttId, schemaAv, skrivPlaner, type SparadPlan } from './insatser-lagring';
import { kanSkrivaUtPdf, skrivUt } from './pdfutskrift';
import { elevPdf, gruppPdf } from './planpdf';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const sida = $('plan');
const data: PlanData = JSON.parse($('pl-data').textContent ?? '{}');
const mp = metodplan({ tid: data.tid, period: data.period, progression: data.progression, uppfoljning: data.uppfoljning }).plan!;
const idag = idagLokalt();
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const stor = (s: string) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);
const nar = (rad: number) => data.uppfoljning.rader[rad]?.nar ?? '';

type HelFoljd = Required<Omit<Foljd, 'avstamning' | 'utvardering'>> & Pick<Foljd, 'avstamning' | 'utvardering'>;
const tomFoljd = (): HelFoljd => ({ gjorda: [], elever: [], franvaro: {}, vecka: {}, skattning: {}, resultat: {} });
interface Aktiv { id: string; namn: string; val: Val; folj: boolean; foljd: HelFoljd; sparad: boolean; franLank: boolean; uppdaterad?: string; kopia?: string }
const nyAktiv = (val: Val = forval(mp, idag), franLank = false, id = nyttId()): Aktiv => ({ id, namn: '', val, folj: false, foljd: tomFoljd(), sparad: false, franLank });
const fran = lasVal(location.hash);
const { planer, ok: lagringOk } = lasPlaner();
const mina = () => lasPlaner().planer.filter((p) => p.metod === data.id).sort((a, b) => (a.andrad < b.andrad ? 1 : -1));
const franSparad = (p: SparadPlan): Aktiv => ({ id: p.id, namn: p.namn ?? '', val: lasVal(p.val)?.val ?? forval(mp, idag), folj: !!p.folj, foljd: { ...tomFoljd(), ...(p.foljd ?? {}) }, sparad: true, franLank: false, uppdaterad: p.uppdaterad, kopia: p.kopia });
let aktiv: Aktiv;
let visa: number | undefined = fran?.visa;
let besked = '';
{
  const egna = planer.filter((p) => p.metod === data.id).sort((a, b) => (a.andrad < b.andrad ? 1 : -1));
  const sparad = fran?.id ? egna.find((p) => p.id === fran.id) : undefined;
  if (fran && sparad) {
    aktiv = franSparad(sparad);
    if (sparad.val !== kodaVal(fran.val)) besked = 'Planen på den här enheten visas. Den har ändrats efter att länken skapades.';
  } else if (fran) {
    aktiv = nyAktiv(fran.val, true, fran.id ?? nyttId());
    besked = 'Planen kommer från en länk. Spara den, så finns den på den här enheten. Det som förts in när insatsen följs finns bara på den enhet där det skrevs.';
  } else if (egna.length) aktiv = franSparad(egna[0]);
  else aktiv = nyAktiv();
}
let plan: Plan = planera(mp, aktiv.val);

// ---------- Lagringen och länken ----------
const lank = (vecka?: number) => `${location.origin}${location.pathname}#${kodaVal(aktiv.val, { id: aktiv.id, ...(vecka ? { visa: vecka } : {}) })}`;
function spara(): boolean {
  if (!aktiv.sparad) return true;
  const alla = lasPlaner().planer.filter((p) => p.id !== aktiv.id);
  const ny: SparadPlan = { id: aktiv.id, metod: data.id, titel: data.titel, omrade: data.omrade, namn: aktiv.namn, val: kodaVal(aktiv.val), folj: aktiv.folj, foljd: aktiv.foljd, andrad: idag, uppdaterad: aktiv.uppdaterad ?? data.uppdaterad, ...(aktiv.kopia ? { kopia: aktiv.kopia } : {}), schema: schemaAv(plan) };
  return skrivPlaner([ny, ...alla]);
}
function uppdateraAdressen() {
  if (aktiv.sparad || aktiv.franLank) history.replaceState(null, '', `#${kodaVal(aktiv.val, { id: aktiv.id, ...(visa ? { visa } : {}) })}`);
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
const minuter = () => aktiv.val.minuter ?? mp.minuter.max;
const nivaNamn = () => data.bank?.nivaer.find((n) => n.slug === aktiv.val.niva)?.namn;
const harElever = () => aktiv.folj && aktiv.foljd.elever.length > 0;
// De som skattas: eleverna, eller gruppen när läraren följer insatsen utan elevlista.
const vem = () => (harElever() ? aktiv.foljd.elever : [{ id: GRUPPEN, namn: 'Gruppen' }]);

function renderaVal() {
  start.value = aktiv.val.start;
  for (const b of dagknappar) b.setAttribute('aria-pressed', String(aktiv.val.dagar.includes(Number(b.dataset.dag))));
  // En längd som inte står bland knapparna (en längre period ur en länk) får en egen knapp.
  if (!langdknappar.some((b) => Number(b.dataset.langd) === aktiv.val.langd)) {
    const b = langdknappar[langdknappar.length - 1].cloneNode() as HTMLButtonElement;
    b.dataset.langd = String(aktiv.val.langd);
    b.textContent = String(aktiv.val.langd);
    langdknappar[langdknappar.length - 1].after(b);
    langdknappar.push(b);
    b.addEventListener('click', () => andra(() => { aktiv.val.langd = Number(b.dataset.langd); }));
  }
  for (const b of langdknappar) b.setAttribute('aria-pressed', String(Number(b.dataset.langd) === aktiv.val.langd));
  for (const b of minutknappar) b.setAttribute('aria-pressed', String(Number(b.dataset.minuter) === minuter()));
  for (const b of nivaknappar) b.setAttribute('aria-pressed', String(b.dataset.niva === aktiv.val.niva));
  if (document.activeElement !== namnfalt) namnfalt.value = aktiv.namn;
  const antal = aktiv.val.dagar.length;
  const varning = $('pl-dagar-varning');
  const utanfor = antal < mp.takt.min || antal > mp.takt.max;
  varning.hidden = !utanfor;
  if (utanfor) varning.textContent = `Du har valt ${antal === 1 ? 'en dag' : `${antal} dagar`} i veckan. Metoden har ${mp.takt.min === mp.takt.max ? mp.takt.min : `${mp.takt.min} till ${mp.takt.max}`} pass i veckan.`;
  // Lovet: planens veckor och två till, som knappar att trycka på. En lovvecka flyttar planen fram.
  const lov = new Set(aktiv.val.lov ?? []);
  const veckor: string[] = [];
  for (let m = mandagen(aktiv.val.start); m <= plusDagar(plan.efter, 7) && veckor.length < 40; m = plusDagar(m, 7)) veckor.push(m);
  $('pl-lovveckor').innerHTML = veckor.map((m) => { const k = veckonyckel(m); const pa = lov.has(k); return `<button type="button" class="pl-chip pl-lovchip" data-lovvecka="${k}" aria-pressed="${pa}" aria-label="Vecka ${isoVecka(m).vecka}, ${esc(spannKort(m, plusDagar(m, 4)))}${pa ? ', lov' : ''}">v. ${isoVecka(m).vecka}</button>`; }).join('');
  foljruta.checked = aktiv.folj;
  $('pl-elevruta').hidden = !aktiv.folj;
  if (document.activeElement !== elevfalt) elevfalt.value = aktiv.foljd.elever.map((e) => e.namn).join('\n');
  $('pl-elever-bort').hidden = !aktiv.foljd.elever.length;
}

// Varje ändring räknar om planen, sparar en sparad plan och ritar om.
function andra(fn: () => void, meddelande?: string) {
  fn();
  plan = planera(mp, aktiv.val);
  const ok = spara();
  uppdateraAdressen();
  rendera();
  if (!ok) visaBesked('Planen kunde inte sparas i den här webbläsaren. Kopiera länken till planen, så finns den kvar.');
  else if (meddelande) visaBesked(meddelande);
}
// Det läraren skriver i ett fält sparas utan att sidan ritas om, så att fältet behåller markören.
function sparaTyst() {
  if (!spara()) visaBesked('Planen kunde inte sparas i den här webbläsaren.');
  renderaSamman();
}

$('pl-val').addEventListener('submit', (e) => e.preventDefault());
start.addEventListener('change', () => { if (/^\d{4}-\d{2}-\d{2}$/.test(start.value)) andra(() => { aktiv.val.start = start.value; }); });
for (const b of dagknappar) b.addEventListener('click', () => {
  const dag = Number(b.dataset.dag);
  const har = aktiv.val.dagar.includes(dag);
  if (har && aktiv.val.dagar.length === 1) { visaBesked('Planen behöver minst en dag.'); return; }
  andra(() => { aktiv.val.dagar = har ? aktiv.val.dagar.filter((x) => x !== dag) : [...aktiv.val.dagar, dag].sort(); });
});
for (const b of langdknappar) b.addEventListener('click', () => andra(() => { aktiv.val.langd = Number(b.dataset.langd); }));
for (const b of minutknappar) b.addEventListener('click', () => andra(() => { aktiv.val.minuter = Number(b.dataset.minuter); }));
for (const b of nivaknappar) b.addEventListener('click', () => andra(() => { aktiv.val.niva = aktiv.val.niva === b.dataset.niva ? undefined : b.dataset.niva; }));
let namnTimer = 0;
namnfalt.addEventListener('input', () => { window.clearTimeout(namnTimer); namnTimer = window.setTimeout(() => andra(() => { aktiv.namn = namnfalt.value.trim().slice(0, 40); }), 400); });
$('pl-lovveckor').addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('[data-lovvecka]');
  if (!b) return;
  const k = b.dataset.lovvecka!;
  const har = (aktiv.val.lov ?? []).includes(k);
  andra(() => { aktiv.val.lov = har ? aktiv.val.lov!.filter((x) => x !== k) : [...(aktiv.val.lov ?? []), k].sort(); }, har ? `Vecka ${Number(k.slice(5))} är inte lov längre.` : `Vecka ${Number(k.slice(5))} är lov. Planen hoppar över den.`);
  $('pl-lovveckor').querySelector<HTMLButtonElement>(`[data-lovvecka="${k}"]`)?.focus();
});
foljruta.addEventListener('change', () => andra(() => { aktiv.folj = foljruta.checked; if (aktiv.folj) bedOmVaraktig(); }, foljruta.checked ? 'Du följer insatsen. Veckan visar passen att bocka, skattningen och, mitt i och efter, avstämningen och utvärderingen.' : 'Planen visar bara planen. Det du har fört in finns kvar om du slår på uppföljningen igen.'));
// Elevlistan: en elev per rad. En elev som står kvar behåller sitt id, så att skattningarna och resultaten följer med.
let elevTimer = 0;
elevfalt.addEventListener('input', () => {
  window.clearTimeout(elevTimer);
  elevTimer = window.setTimeout(() => {
    const namn = [...new Set(elevfalt.value.split('\n').map((x) => x.trim().slice(0, 30)).filter(Boolean))].slice(0, 12);
    const fore = aktiv.foljd.elever;
    aktiv.foljd.elever = namn.map((n) => fore.find((e) => e.namn === n) ?? { id: `e${nyttId().slice(0, 4)}`, namn: n });
    $('pl-elever-bort').hidden = !aktiv.foljd.elever.length;
    sparaTyst();
    renderaVeckan();
  }, 500);
});
$('pl-elever-bort').addEventListener('click', (e) => fragaForst(e.currentTarget as HTMLElement, 'Ta bort elevernas namn och allt som förts in om dem?', 'Ta bort', () => {
  const fore = structuredClone(aktiv.foljd);
  andra(() => {
    const kvar = (r: Record<string, Record<string, number>>): Record<string, Record<string, number>> => Object.fromEntries(Object.entries(r).map(([k, v]): [string, Record<string, number>] => [k, v[GRUPPEN] ? { [GRUPPEN]: v[GRUPPEN] } : {}]));
    aktiv.foljd = { ...aktiv.foljd, elever: [], franvaro: {}, resultat: {}, skattning: kvar(aktiv.foljd.skattning) };
  });
  visaBesked('Elevernas namn och det som förts in om dem är borttaget.', () => andra(() => { aktiv.foljd = fore; }, 'Eleverna är tillbaka.'));
}));

// ---------- Planen ----------
const rubrikVecka = (v: PlanVecka) => `Vecka ${v.innehall}${v.igen ? ' igen' : ''}`;
const radFor = (v: PlanVecka) => (v.steg !== null && v.steg !== undefined ? data.progression?.rader[v.steg] : undefined);
const uppfoljningI = (v: PlanVecka) => plan.uppfoljning.flatMap((u) => u.tillfallen.filter((t) => t.vecka === v.nr).map((t) => ({ ...u, ...t })));
const efterUppfoljning = () => plan.uppfoljning.filter((u) => u.typ === 'efter');
// Den här veckan i översikten: bara medan planen pågår, från första veckans måndag till sista passet.
const nuVecka = () => (plan.veckor.length && plan.sistaPass && idag >= plan.veckor[0].mandag && idag <= plan.sistaPass ? veckanFor(plan, idag) : null);
const gjort = (dag: string) => aktiv.foljd.gjorda.includes(dag);
// Veckans pass som små rutor: gjort, varit men inte bockat, och kommande.
const rutor = (v: PlanVecka) => {
  const pass = v.pass.map((n) => plan.pass[n - 1]);
  const antal = pass.filter((p) => gjort(passetsDag(p))).length;
  return `<span class="pl-rutor" role="img" aria-label="${antal} av ${pass.length} pass blev av">${pass.map((p) => `<span class="pl-ruta${gjort(passetsDag(p)) ? ' gjord' : p.datum <= idag ? ' varit' : ''}"></span>`).join('')}</span>`;
};

function renderaSumma() {
  const n = plan.pass.length;
  const dagar = stor(uppraknat([...aktiv.val.dagar].sort().map((d) => VECKODAGAR[d - 1])));
  const tider = plan.uppfoljning.filter((u) => u.tillfallen.length).map((u) => `${nar(u.rad)}: ${uppraknat([...new Set(u.tillfallen.map((t) => `vecka ${isoVecka(t.datum).vecka}`))])}`);
  const samma = plan.forstaPass && plan.sistaPass && plan.forstaPass.slice(0, 4) === plan.sistaPass.slice(0, 4);
  $('pl-summa-text').innerHTML = n
    ? `<p class="pl-tal">${n} pass om ${minuter()} minuter</p><p>${esc(dagar)}, ${esc(samma ? datumText(plan.forstaPass!).replace(/ \d{4}$/, '') : datumText(plan.forstaPass!))} till ${esc(datumText(plan.sistaPass!))}.</p>${tider.length ? `<p>${esc(tider.join('. '))}.</p>` : ''}${aktiv.namn ? `<p class="pl-gruppnamn">${esc(aktiv.namn)}</p>` : ''}`
    : '<p>Planen har inga pass. Välj dagar och första passet.</p>';
  $('pl-spara').hidden = aktiv.sparad;
  $('pl-ta-bort').hidden = !aktiv.sparad;
  $('pl-sparad').textContent = aktiv.sparad
    ? 'Planen sparas på den här enheten. Länken visar planen som den ser ut nu, utan gruppens namn.'
    : lagringOk ? 'Planen är ett förslag tills du sparar den.' : 'Webbläsaren sparar inget här. Kopiera länken till planen, så finns den kvar.';
}

function renderaVeckor() {
  const nu = nuVecka();
  const rader: string[] = [];
  const lovFore = (v: PlanVecka) => plan.lovveckor.filter((m) => m < v.mandag && (v.nr === 1 || m > plan.veckor[v.nr - 2].mandag));
  const lovrad = (m: string) => `<li class="pl-lovvecka"><span class="pl-v">Lov</span><span class="pl-d">${esc(spannKort(m, plusDagar(m, 4)))}</span><span class="pl-innehall"><span class="pl-pass">Vecka ${isoVecka(m).vecka}</span><span class="pl-fokus">Inga pass</span><button type="button" class="pl-textknapp" data-lov-bort="${esc(veckonyckel(m))}">Ta bort lovet</button></span></li>`;
  const foljer = (aktiv.sparad || aktiv.franLank) && aktiv.folj;
  const mitt = mittVeckan(plan);
  for (const v of plan.veckor) {
    for (const m of lovFore(v)) rader.push(lovrad(m));
    const { fran: f, till: t } = veckansDagar(plan, v);
    const rad = radFor(v);
    const forsta = v.pass[0], sista = v.pass[v.pass.length - 1];
    const passText = v.pass.length ? (forsta === sista ? `Pass ${forsta}` : `Pass ${forsta}–${sista}`) : 'Inga pass';
    const marken = [
      ...uppfoljningI(v).map((u) => `<span class="pl-markering uppf">${esc(nar(u.rad))}</span>`),
      ...(aktiv.folj && v.nr === mitt ? ['<span class="pl-markering stam">Avstämning</span>'] : []),
      ...(aktiv.folj && v.nr === plan.veckor.length ? ['<span class="pl-markering stam">Utvärdering</span>'] : []),
      ...(v.bortfall.length ? [`<span class="pl-markering bort">${v.bortfall.length === 1 ? 'Ett pass faller bort' : `${v.bortfall.length} pass faller bort`}</span>`] : []),
      ...(nu === v ? ['<span class="pl-markering nu">Den här veckan</span>'] : []),
    ];
    rader.push(`<li class="${nu === v ? 'nu' : ''}${v.igen ? ' igen' : ''}"><button type="button" class="pl-veckoknapp" data-vecka="${v.nr}"><span class="pl-v">${esc(rubrikVecka(v))}</span><span class="pl-d">${esc(spannKort(f, t))}</span><span class="pl-innehall"><span class="pl-pass">${passText} · v. ${v.vecka.vecka}${foljer && v.pass.length ? rutor(v) : ''}</span>${rad ? `<span class="pl-fokus">${esc(rad.kort)}</span>` : ''}${marken.length ? `<span class="pl-marken">${marken.join('')}</span>` : ''}</span></button></li>`);
  }
  const efter = efterUppfoljning();
  for (const m of plan.lovveckor.filter((x) => plan.veckor.length && x > plan.veckor[plan.veckor.length - 1].mandag)) rader.push(lovrad(m));
  if (efter.length) {
    const datum = efter.flatMap((u) => u.tillfallen.map((t) => t.datum)).sort();
    rader.push(`<li class="efter"><span class="pl-v">Efter</span><span class="pl-d">${esc(spannKort(datum[0], plusDagar(datum[0], 4)))}</span><span class="pl-innehall"><span class="pl-pass">Uppföljningen · v. ${isoVecka(datum[0]).vecka}</span><span class="pl-fokus">${esc(efter.map((u) => nar(u.rad)).join(', '))}</span></span></li>`);
  }
  $('pl-veckor').innerHTML = rader.join('');
}

// ---------- Veckan ----------
// Filernas knappar (snabbmallen, lektionskorten, lathunden) står i sidan, så att bygget sätter filernas version på dem
// (scripts/filversion.mjs) och utskriftsknapparnas skript (SkrivUtPdf.astro) binder dem. Veckan har platser för dem, och
// knapparna flyttas dit och tillbaka när veckan ritas om, så att Skriv ut alltid ger utskriftsrutan.
const filer = $('pl-filer');
const filnamn = () => [...filer.querySelectorAll<HTMLElement>('[data-fil]')].map((el) => el.dataset.fil!);
const plats = (namn: string) => (filer.querySelector(`[data-fil="${namn}"]`) ? `<span data-plats="${namn}"></span>` : '');
// En text ur metodens tabeller står utan punkt; som stycke får den en, om den inte redan slutar med ett tecken.
const mening = (s: string) => (/[.!?:”"]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const kortDag = (d: string) => `${stor(VECKODAGAR[veckodag(d) - 1].slice(0, 3))} ${Number(d.slice(8))}/${Number(d.slice(5, 7))}`;
const skala = (attr: string, valt: number | undefined, namn: string) => `<div class="pl-skala" role="group" aria-label="${esc(namn)}">${[1, 2, 3, 4, 5].map((x) => `<button type="button" class="pl-skalsteg" ${attr}="${x}" aria-pressed="${valt === x}" aria-label="${x}, ${esc(SKALAN[x - 1].toLocaleLowerCase('sv'))}">${x}</button>`).join('')}</div>`;
const RIKTNING: Record<string, string> = { upp: 'framåt', samma: 'som förut', ned: 'bakåt' };
const PIL: Record<string, string> = { upp: '↑', samma: '→', ned: '↓' };
const riktningText = (e: SammanstallningElev) => { const r = riktning(e); return r ? `${e.forsta!.varde} till ${e.senaste!.varde}, ${RIKTNING[r]}` : e.senaste ? `${e.senaste.varde}, en skattning` : 'Inte skattad än'; };
const beslutsknappar = (slag: 'avstamning' | 'utvardering', val: string[]) => `<div class="pl-beslut" role="group" aria-label="${slag === 'avstamning' ? 'Avstämningens beslut' : 'Utvärderingens beslut'}">${val.map((b) => `<button type="button" class="knapp sekundar liten" data-beslut="${slag}|${b}" aria-pressed="${aktiv.foljd[slag]?.beslut === b}">${esc(BESLUT[b as keyof typeof BESLUT])}</button>`).join('')}</div>`;

function renderaVeckan() {
  const sektion = $('pl-veckan');
  if ((!aktiv.sparad && !aktiv.franLank) || !plan.veckor.length) { for (const el of sektion.querySelectorAll<HTMLElement>('[data-fil]')) filer.append(el); sektion.hidden = true; sektion.innerHTML = ''; return; }
  const v = (visa && plan.veckor[visa - 1]) || veckanFor(plan, idag)!;
  const rad = radFor(v);
  const { fran: f, till: t } = veckansDagar(plan, v);
  const nasta = nastaPass(plan, idag);
  const meta = [spannKort(f, t), ...(aktiv.namn ? [aktiv.namn] : []), ...(nivaNamn() ? [nivaNamn()!] : [])];
  const s = sammanstallning(plan, aktiv.foljd, idag);
  const sista = v.nr === plan.veckor.length;
  const delar: string[] = [];
  // Veckan står i den ordning läraren gör saker (Niclas 2026-10-24: "Tänk till på användarvänlighet och smidigt för
  // specialläraren"): före passet, efter passet och sist i veckan.
  delar.push(`<header class="pl-veckohuvud"><h2 id="pl-veckan-rubrik" tabindex="-1">${esc(rubrikVecka(v))} i planen</h2><p class="meta">${meta.map(esc).join(' · ')}</p></header>`);

  // Nästa pass, med det läraren behöver till det: verktyget, lektionskortet och lathunden.
  let nastaText: string;
  const efter = efterUppfoljning();
  if (!nasta) nastaText = `Insatsen är slut.${efter.length ? ` ${stor(nar(efter[0].rad).toLocaleLowerCase('sv'))}: vecka ${isoVecka(efter[0].tillfallen[0]?.datum ?? plan.efter).vecka}.` : ''}${aktiv.folj ? ' Sammanställningen står under planen.' : ''}`;
  else if (nasta.nr === 1 && nasta.datum > idag) nastaText = `Första passet: ${dagText(nasta.datum)}`;
  else nastaText = `${stor(narText(nasta.datum, idag))}${nasta.datum === idag || nasta.datum === plusDagar(idag, 1) ? `, ${dagText(nasta.datum)}` : ''}, pass ${nasta.nr} av ${plan.pass.length}`;
  const material = [
    ...(data.bank ? [`<a class="knapp" href="${esc(data.bank.adress)}${aktiv.val.niva ? `#${esc(aktiv.val.niva)}` : ''}" data-goatcounter-click="planera:${esc(data.id)}:material" data-goatcounter-title="${esc(data.titel)}: Ta fram från planen">${esc(data.bank.namn)}</a>`] : []),
    ...filnamn().filter((n) => n.startsWith('lektionskort')).map(plats),
    plats('lathund'),
  ].filter(Boolean);
  delar.push(`<div class="pl-nasta"><span class="pl-etikett">Nästa pass</span><p class="pl-nar">${esc(nastaText)}</p>${material.length ? `<p class="metod-centrala">${material.join('')}</p>` : ''}</div>`);

  if (rad) delar.push(`<div class="pl-fokusruta">${rad.led ? `<p class="pl-led">${esc(rad.led)}</p>` : ''}<span class="pl-etikett">Veckans fokus</span><p>${esc(mening(rad.fokus))}</p><span class="pl-etikett">Det du gör</span><p>${esc(mening(rad.roll))}</p></div>`);

  // Metodens uppföljning den här veckan, och det som görs varje vecka eller i varje pass. När läraren följer insatsen med
  // en elevlista får varje tillfälle med datum ett fält per elev för resultatet.
  const tillfallen = uppfoljningensTillfallen(plan).filter((x) => x.vecka === v.nr || (sista && x.vecka === null));
  const resultatfalt = (nyckel: string) => (harElever() ? `<div class="pl-resultat">${aktiv.foljd.elever.map((e) => `<label><span>${esc(e.namn)}</span><input class="pl-falt" type="text" maxlength="40" data-resultat="${esc(nyckel)}|${esc(e.id)}" value="${esc(aktiv.foljd.resultat[nyckel]?.[e.id] ?? '')}" /></label>`).join('')}</div>` : '');
  const uppf = tillfallen.map((x) => `<li><span class="pl-etikett">${esc(nar(x.rad))} · ${x.vecka === null ? `vecka ${isoVecka(x.datum).vecka}` : esc(dagText(x.datum))}</span><p>${esc(data.uppfoljning.rader[x.rad].vad)}</p>${resultatfalt(x.nyckel)}</li>`);
  if (uppf.length) delar.push(`<section class="pl-block"><h3>Metodens uppföljning den här veckan</h3><ul class="pl-uppf">${uppf.join('')}</ul></section>`);
  const lopande = plan.uppfoljning.filter((u) => u.typ === 'lopande');
  if (lopande.length) delar.push(`<details class="pl-fallut"><summary>${esc(uppraknat(lopande.map((u) => nar(u.rad))))}: metodens uppföljning</summary><ul class="pl-uppf">${lopande.map((u) => `<li><p>${esc(data.uppfoljning.rader[u.rad].vad)}</p></li>`).join('')}</ul></details>`);
  const villkor = plan.uppfoljning.filter((u) => u.typ === 'villkor');
  if (villkor.length) delar.push(`<section class="pl-block"><h3>Håll koll på</h3><ul class="pl-uppf">${villkor.map((u) => `<li><span class="pl-etikett">${esc(nar(u.rad))}</span><p>${esc(data.uppfoljning.rader[u.rad].vad)}</p></li>`).join('')}</ul></section>`);

  // Veckans poster i banken: nivåns texter eller problem med veckans taggar. Läraren väljer; planen föreslår ingen ordning.
  if (data.bank && rad?.taggar?.length) {
    const namn = rad.taggar.map((x) => data.bank!.taggar[x] ?? x);
    const niva = data.bank.nivaer.find((n) => n.slug === aktiv.val.niva);
    const rubrik = `Veckans ${esc(data.bank.flera)}`;
    if (!niva) delar.push(`<section class="pl-block"><h3>${rubrik}</h3><p class="pl-not">Välj nivå under Ändra planen, så visar veckan nivåns ${esc(data.bank.flera)} med ${namn.length > 1 ? 'slagen' : 'slaget'} ${esc(namn.join(', '))}.</p></section>`);
    else {
      const poster = niva.poster.filter((p) => p.taggar.some((x) => rad.taggar!.includes(x)));
      const lista = poster.map((p) => `<li><a href="${esc(data.sida)}/${esc(p.id)}">${p.nr} ${esc(p.titel)}</a><span class="pl-taggar">${esc(p.taggar.map((x) => data.bank!.taggar[x] ?? x).join(', '))}</span><a class="pl-visa" href="${esc(data.bank!.adress)}#${esc(p.id)}" data-goatcounter-click="planera:${esc(data.id)}:post" data-goatcounter-title="${esc(data.titel)}: en post från planen i Ta fram">Visa stort</a></li>`);
      // Listan är hopfälld, som långa listor på sajten, med antalet och veckans slag i raden.
      delar.push(poster.length
        ? `<details class="pl-fallut pl-veckans"><summary>${rubrik}, ${esc(niva.namn)}: ${poster.length} med ${namn.length > 1 ? 'slagen' : 'slaget'} ${esc(namn.join(', '))}</summary><p class="pl-not">Välj en till varje pass, efter det du hör i gruppen.</p><ul class="pl-poster">${lista.join('')}</ul></details>`
        : `<section class="pl-block"><h3>${rubrik}, ${esc(niva.namn)}</h3><p class="pl-not">Nivån har inga ${esc(data.bank.flera)} med ${esc(namn.join(', '))}.</p></section>`);
    }
  }
  if (data.checklista.length) delar.push(`<details class="pl-fallut"><summary>Före passet, ${data.checklista.length} saker</summary><ol class="pl-checklista">${data.checklista.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></details>`);

  // Veckans pass och det som faller bort. När läraren följer insatsen bockas passen som blev av, och med en elevlista
  // står eleverna under ett bockat pass: alla är med tills läraren trycker på den som inte var där.
  const passrader = [
    ...v.pass.map((n) => {
      const p = plan.pass[n - 1];
      const dag = passetsDag(p);
      const ar = gjort(dag);
      const borta = aktiv.foljd.franvaro[dag] ?? [];
      const narvaro = aktiv.folj && ar && harElever() ? `<div class="pl-narvaro" role="group" aria-label="Vilka var med i pass ${n}">${aktiv.foljd.elever.map((e) => { const med = !borta.includes(e.id); return `<button type="button" class="pl-chip pl-elev" data-narvaro="${esc(dag)}|${esc(e.id)}" aria-pressed="${med}" aria-label="${esc(e.namn)} ${med ? 'var med' : 'var inte med'}">${esc(e.namn)}</button>`; }).join('')}</div>` : '';
      const bock = aktiv.folj ? `<button type="button" class="pl-bock${ar ? ' ja' : ''}" data-bock="${esc(dag)}" aria-pressed="${ar}" aria-label="Pass ${n} blev av"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12.5l3.7 3.7 7.3-8"/></svg></button>` : '<span></span>';
      return { datum: p.datum, html: `<li class="${p.datum === idag ? 'idag' : ''}${ar ? ' gjort' : ''}"><span class="pl-dag">${esc(kortDag(p.datum))}<small>Pass ${n}${p.datum === idag ? ' · i dag' : ''}</small></span><span class="pl-passinfo">${p.flyttatFran ? `Flyttat från ${esc(dagText(p.flyttatFran))}` : ''}</span>${bock}${narvaro}</li>` };
    }),
    ...v.bortfall.map((b) => ({ datum: b.datum, html: `<li class="bort"><span class="pl-dag">${esc(kortDag(b.datum))}<small>Inget pass</small></span><span class="pl-passinfo">${b.varfor === 'helgdag' ? esc(stor(b.namn ?? 'helgdag')) : 'Inställt'}</span>${b.varfor === 'installt' ? `<button type="button" class="pl-textknapp" data-angra="${esc(b.datum)}">Ångra</button>` : '<span></span>'}</li>` })),
  ].sort((a, b) => (a.datum < b.datum ? -1 : 1));
  const flyttbara = v.pass.map((n) => plan.pass[n - 1]);
  const passNot = [aktiv.folj ? 'Bocka passen som blev av.' : '', harElever() ? 'Under ett bockat pass trycker du på den som inte var med, om du vill.' : '', 'Behöver gruppen mer tid tar ni samma vecka en gång till, och resten av planen flyttas fram.'].filter(Boolean).join(' ');
  delar.push(`<section class="pl-block"><h3>Veckans pass</h3><ol class="pl-passlista">${passrader.map((x) => x.html).join('')}</ol>
    <p class="pl-andra-knappar"><button type="button" class="knapp sekundar liten" data-gor="upprepa" data-goatcounter-click="planera:${esc(data.id)}:upprepa" data-goatcounter-title="${esc(data.titel)}: veckan upprepad">Upprepa veckan</button>${v.igen ? '<button type="button" class="knapp sekundar liten" data-gor="ta-bort-upprepning">Ta bort upprepningen</button>' : ''}<button type="button" class="knapp sekundar liten" data-gor="lov" data-goatcounter-click="planera:${esc(data.id)}:lov" data-goatcounter-title="${esc(data.titel)}: lov i planen">Lov den här veckan</button>${flyttbara.length ? '<button type="button" class="knapp sekundar liten" data-gor="flytta" aria-expanded="false" aria-controls="pl-flytta">Flytta eller ställ in ett pass</button>' : ''}</p>
    <div class="pl-flytta" id="pl-flytta" hidden><label class="pl-etikett" for="pl-flytta-pass">Passet</label><select class="pl-falt" id="pl-flytta-pass">${flyttbara.map((p) => `<option value="${esc(passetsDag(p))}">Pass ${p.nr}, ${esc(dagText(p.datum))}</option>`).join('')}</select><label class="pl-etikett" for="pl-flytta-dag">Ny dag</label><input class="pl-falt" type="date" id="pl-flytta-dag" min="${v.mandag}" max="${plusDagar(v.mandag, 6)}" /><p class="pl-andra-knappar"><button type="button" class="knapp liten" data-gor="flytta-klar" data-goatcounter-click="planera:${esc(data.id)}:flytta" data-goatcounter-title="${esc(data.titel)}: ett pass flyttat">Flytta passet</button><button type="button" class="knapp sekundar liten" data-gor="stall-in">Ställ in passet</button></p></div>
    <p class="pl-not">${esc(passNot)}</p></section>`);

  // Skattningen: en gång i veckan, hur väl eleverna (eller gruppen) klarar metodens förmåga på egen hand, och om läraren
  // vill hur veckan gick för gruppen. Inget av det måste fyllas i.
  if (aktiv.folj) {
    const fragan = skattningsfragan(data.formaga, !harElever());
    const veckans = aktiv.foljd.skattning[v.mandag] ?? {};
    const gang = aktiv.foljd.vecka[v.mandag];
    delar.push(`<section class="pl-block pl-folj"><h3>Skatta veckan</h3><p class="pl-fraga">${esc(fragan)}</p><ul class="pl-skalnamn" aria-hidden="true">${SKALAN.map((x, i) => `<li><b>${i + 1}</b> ${esc(x)}</li>`).join('')}</ul>
      <ul class="pl-skattning">${vem().map((e) => `<li><span class="pl-elevnamn">${esc(e.namn)}</span>${skala(`data-skatta="${esc(v.mandag)}|${esc(e.id)}" data-steg`, veckans[e.id], `${e.namn}: ${fragan}`)}</li>`).join('')}</ul>
      <details class="pl-gang"${gang?.varde || gang?.not ? ' open' : ''}><summary>Hur gick veckan för gruppen, om du vill</summary>${skala(`data-gang="${esc(v.mandag)}" data-steg`, gang?.varde, 'Hur gick veckan för gruppen, 1 till 5')}<p class="pl-not">1 betyder att det var svårt och 5 att det gick mycket bra.</p><label class="pl-etikett" for="pl-veckonot">En mening om veckan</label><input class="pl-falt pl-brett" type="text" id="pl-veckonot" maxlength="200" data-veckonot="${esc(v.mandag)}" value="${esc(gang?.not ?? '')}" /></details></section>`);
  }

  // Avstämningen mitt i insatsen och utvärderingen efter, när läraren följer insatsen: varje elevs riktning från första
  // till senaste skattningen, och ett beslut med en mening.
  const riktningar = () => `<ul class="pl-riktningar">${s.elever.map((e) => { const r = riktning(e); return `<li><span class="pl-elevnamn">${esc(e.namn)}</span><span class="pl-riktning${r ? ` ${r}` : ''}">${r ? `<span aria-hidden="true">${PIL[r]} </span>` : ''}${esc(riktningText(e))}</span></li>`; }).join('')}</ul>`;
  if (aktiv.folj && v.nr === s.mitt && !sista) {
    const valt = aktiv.foljd.avstamning?.beslut;
    delar.push(`<section class="pl-stam"><h3>Avstämning mitt i insatsen</h3><p>Rör sig ${harElever() ? 'eleverna' : 'gruppen'} i rätt riktning? Jämför skattningarna hittills.</p>${riktningar()}${beslutsknappar('avstamning', ['fortsatt', 'justera'])}${valt === 'justera' ? '<p class="pl-not">Ta samma vecka en gång till, byt nivå under Ändra planen eller ta upp det med elevhälsan.</p>' : ''}<label class="pl-etikett" for="pl-stam-not">En mening om avstämningen, om du vill</label><input class="pl-falt pl-brett" type="text" id="pl-stam-not" maxlength="200" data-beslutsnot="avstamning" value="${esc(aktiv.foljd.avstamning?.not ?? '')}" /></section>`);
  }
  if (aktiv.folj && sista) {
    const valt = aktiv.foljd.utvardering?.beslut;
    delar.push(`<section class="pl-stam"><h3>Utvärdering efter insatsen</h3><p>Jämför skattningarna och metodens uppföljning före och efter.</p>${riktningar()}${beslutsknappar('utvardering', ['avsluta', 'forlang', 'byt'])}${valt === 'forlang' ? '<p class="pl-not">Välj fler veckor under Ändra planen, så fortsätter planen.</p>' : ''}<label class="pl-etikett" for="pl-utv-not">En mening om utvärderingen, om du vill</label><input class="pl-falt pl-brett" type="text" id="pl-utv-not" maxlength="200" data-beslutsnot="utvardering" value="${esc(aktiv.foljd.utvardering?.not ?? '')}" /></section>`);
  }

  if (plats('snabbmall')) delar.push(`<section class="pl-block"><h3>Efter veckan</h3><p>Skriv i snabbmallen vad du såg och vad ni gör nästa vecka.</p><p class="metod-centrala">${plats('snabbmall')}</p></section>`);
  // Den som bara planerar ser en rad om uppföljningen, så att valet går att hitta utan att stå i vägen.
  if (!aktiv.folj && aktiv.sparad) delar.push(`<p class="pl-not pl-foljtips">Vill du bocka passen, skatta eleverna varje vecka och stämma av mitt i? <button type="button" class="pl-textknapp" data-gor="folj">Följ insatsen</button></p>`);
  const forra = plan.veckor[v.nr - 2], nastaV = plan.veckor[v.nr];
  delar.push(`<nav class="pl-bladdra" aria-label="Veckorna i planen">${forra ? `<button type="button" class="knapp sekundar liten" data-vecka="${forra.nr}">‹ ${esc(rubrikVecka(forra))}</button>` : '<span></span>'}<a class="knapp sekundar liten" href="#pl-planen" data-hela>Hela planen</a>${nastaV ? `<button type="button" class="knapp sekundar liten" data-vecka="${nastaV.nr}">${esc(rubrikVecka(nastaV))} ›</button>` : '<span></span>'}</nav>`);
  // Knapparna tillbaka till sin gömda plats innan veckan ritas om, och sedan in på sina platser i den nya veckan.
  for (const el of sektion.querySelectorAll<HTMLElement>('[data-fil]')) filer.append(el);
  sektion.innerHTML = delar.join('');
  for (const ruta of sektion.querySelectorAll<HTMLElement>('[data-plats]')) { const el = filer.querySelector(`[data-fil="${ruta.dataset.plats}"]`); if (el) ruta.replaceWith(el); }
  sektion.hidden = false;
  sektion.dataset.vecka = String(v.nr);
}

// Veckans knappar: bocka, närvaro, skattning, beslut, upprepa, lov, flytta och ställa in, och bläddra.
$('pl-veckan').addEventListener('click', (e) => {
  const mal = e.target as Element;
  const vNr = Number($('pl-veckan').dataset.vecka);
  const v = plan.veckor[vNr - 1];
  const fokus = (valjare: string) => $('pl-veckan').querySelector<HTMLElement>(valjare)?.focus();
  const knapp = mal.closest<HTMLButtonElement>('button');
  if (!knapp) return;
  const d = knapp.dataset;
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
    const varde = Number(knapp.textContent);
    andra(() => { const g = aktiv.foljd.vecka[m] ?? {}; aktiv.foljd.vecka = { ...aktiv.foljd.vecka, [m]: { ...g, varde: g.varde === varde ? undefined : varde } }; });
    fokus(`[data-gang="${m}"][aria-label^="${varde},"]`);
    return;
  }
  if (d.beslut) {
    const [slag, beslut] = d.beslut.split('|') as ['avstamning' | 'utvardering', string];
    andra(() => { const fore = aktiv.foljd[slag]; aktiv.foljd = { ...aktiv.foljd, [slag]: { ...(fore ?? {}), beslut: fore?.beslut === beslut ? undefined : beslut } }; });
    fokus(`[data-beslut="${slag}|${beslut}"]`);
    return;
  }
  if (d.angra) { andra(() => { aktiv.val.stryk = (aktiv.val.stryk ?? []).filter((x) => x !== d.angra); }, 'Passet är tillbaka.'); return; }
  if (d.vecka) { visa = Number(d.vecka); uppdateraAdressen(); renderaVeckan(); $('pl-veckan').scrollIntoView({ block: 'start' }); $('pl-veckan-rubrik').focus(); return; }
  const gor = d.gor;
  if (gor === 'folj') { andra(() => { aktiv.folj = true; }, 'Du följer insatsen. Bocka passen och skatta veckan längre ned i veckan.'); bedOmVaraktig(); return; }
  if (!gor || !v) return;
  if (gor === 'upprepa') andra(() => { aktiv.val.upprepa = [...(aktiv.val.upprepa ?? []), v.innehall]; visa = v.nr + 1; }, `Vecka ${v.innehall} tas en gång till, och resten av planen flyttas fram en vecka.`);
  else if (gor === 'ta-bort-upprepning') andra(() => { const u = [...(aktiv.val.upprepa ?? [])]; u.splice(u.indexOf(v.innehall), 1); aktiv.val.upprepa = u; visa = v.nr - 1; }, 'Upprepningen är borttagen.');
  else if (gor === 'lov') andra(() => { aktiv.val.lov = [...new Set([...(aktiv.val.lov ?? []), veckonyckel(v.mandag)])].sort(); }, `Vecka ${v.vecka.vecka} är lov. Planen flyttas fram en vecka.`);
  else if (gor === 'flytta') { const ruta = $('pl-flytta'); ruta.hidden = !ruta.hidden; knapp.setAttribute('aria-expanded', String(!ruta.hidden)); if (!ruta.hidden) $('pl-flytta-pass').focus(); }
  else if (gor === 'flytta-klar' || gor === 'stall-in') {
    const ursprung = $<HTMLSelectElement>('pl-flytta-pass').value;
    if (gor === 'stall-in') { andra(() => { const f = { ...(aktiv.val.flytta ?? {}) }; delete f[ursprung]; aktiv.val.flytta = f; aktiv.val.stryk = [...new Set([...(aktiv.val.stryk ?? []), ursprung])]; }, 'Passet är inställt.'); return; }
    const ny = $<HTMLInputElement>('pl-flytta-dag').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ny)) { visaBesked('Välj den nya dagen.'); return; }
    if (veckodag(ny) > 5 || helgdag(ny)) { visaBesked('Den dagen har skolan stängt. Välj en annan dag.'); return; }
    andra(() => { aktiv.val.flytta = { ...(aktiv.val.flytta ?? {}), [ursprung]: ny }; if (ny === ursprung) delete aktiv.val.flytta![ursprung]; }, `Passet flyttas till ${dagText(ny)}.`);
  }
});
// Fälten i veckan sparas medan läraren skriver, utan att veckan ritas om.
let faltTimer = 0;
$('pl-veckan').addEventListener('input', (e) => {
  const falt = e.target as HTMLInputElement;
  window.clearTimeout(faltTimer);
  faltTimer = window.setTimeout(() => {
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
    sparaTyst();
  }, 400);
});

$('pl-veckor').addEventListener('click', (e) => {
  const bort = (e.target as Element).closest<HTMLButtonElement>('[data-lov-bort]');
  if (bort) { andra(() => { aktiv.val.lov = (aktiv.val.lov ?? []).filter((x) => x !== bort.dataset.lovBort); }, 'Lovet är borttaget, och planen flyttas tillbaka.'); return; }
  const b = (e.target as Element).closest<HTMLButtonElement>('[data-vecka]');
  if (!b) return;
  visa = Number(b.dataset.vecka);
  if (!aktiv.sparad && !aktiv.franLank) return;
  uppdateraAdressen();
  renderaVeckan();
  $('pl-veckan').scrollIntoView({ block: 'start' });
});

// ---------- Sammanställningen ----------
const info = () => ({ titel: data.titel, formaga: data.formaga, uppfoljning: data.uppfoljning.rader });
let senaste: Sammanstallning = sammanstallning(plan, aktiv.foljd, idag);
const pdfInfo = () => ({ metod: data.titel, grupp: aktiv.namn || undefined, niva: nivaNamn(), fragan: skattningsfragan(data.formaga, !harElever()), uppfoljning: data.uppfoljning.rader, beslut: BESLUT as Record<string, string> });
// En knapp som ger en pdf heter Skriv ut där webbläsaren kan skriva ut den direkt, och annars "som pdf", som
// utskriftsknapparna på resten av sajten (SkrivUtPdf.astro).
const pdfOrd = (vad: string) => (kanSkrivaUtPdf() ? `Skriv ut ${vad}` : `${stor(vad)} som pdf`);
const narvaroFor = (e: SammanstallningElev) => senaste.veckor.map((v) => v.pass.map((p) => (!p.gjort ? 'inte' : (aktiv.foljd.franvaro[p.dag] ?? []).includes(e.id) ? 'borta' : 'med')));

// Skattningarna vecka för vecka som staplar, små på raden och stora när eleven fälls ut, med en markering vid
// avstämningen och, när läraren bockar passen, närvaron som prickar under veckan.
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

function renderaSamman() {
  const ruta = $('pl-samman');
  senaste = sammanstallning(plan, aktiv.foljd, idag);
  const s = senaste;
  const ifyllt = s.gjorda > 0 || s.elever.some((e) => e.skattningar.length) || s.veckor.some((v) => v.skattning || v.not) || Object.keys(aktiv.foljd.resultat).length > 0 || !!s.avstamning?.beslut || !!s.utvardering?.beslut;
  if ((!aktiv.sparad && !aktiv.franLank) || !aktiv.folj || !(ifyllt || s.slut)) { ruta.hidden = true; ruta.innerHTML = ''; return; }
  const oppna = new Set([...ruta.querySelectorAll<HTMLDetailsElement>('details[data-elev]')].filter((d) => d.open).map((d) => d.dataset.elev));
  const etiketter = s.veckor.map((v) => `v. ${v.vecka}`);
  const delar: string[] = [`<h2 id="pl-samman-rubrik">Sammanställningen${s.slut ? '' : ' hittills'}</h2>`];
  const rad = s.slut ? `${s.gjorda} av ${s.planerade} pass blev av.` : `${s.gjorda} av de ${s.varit} pass som har varit blev av. Planen har ${s.planerade} pass.`;
  delar.push(`<section class="pl-block"><h3>Passen</h3><p>${esc(rad)}</p><ol class="pl-veckorader">${s.veckor.map((v) => `<li><span class="pl-v">${esc(`Vecka ${v.innehall}${v.igen ? ' igen' : ''}`)}</span><span class="pl-rutor" role="img" aria-label="${v.gjorda} av ${v.planerade} pass blev av">${v.pass.map((p) => `<span class="pl-ruta${p.gjort ? ' gjord' : p.datum <= idag ? ' varit' : ''}"></span>`).join('')}</span><span class="pl-d">v. ${v.vecka}</span></li>`).join('')}</ol></section>`);
  const tillfallen = uppfoljningensTillfallen(plan);
  const fragan = skattningsfragan(data.formaga, s.grupp);
  delar.push(`<section class="pl-block"><h3>${s.grupp ? 'Gruppen' : 'Eleverna'}</h3><p class="pl-not">${esc(fragan)} 1 till 5, vecka för vecka.${s.grupp ? '' : ' Tryck på en elev för grafen och elevens utskrift.'}</p><div class="pl-elevlista">${s.elever.map((e) => {
    const varden = s.veckor.map((v) => e.skattningar.find((x) => x.nr === v.nr)?.varde);
    const r = riktning(e);
    const res = tillfallen.filter((t) => e.resultat[t.nyckel]).map((t) => `<li>${esc(nar(t.rad))}, vecka ${isoVecka(t.datum).vecka}: ${esc(e.resultat[t.nyckel])}</li>`).join('');
    const narvaro = !s.grupp && s.gjorda ? `<p>Var med i ${e.narvaro} av ${s.gjorda} pass som blev av.</p>` : '';
    const mittvarde = s.mitt ? e.skattningar.filter((x) => x.nr <= s.mitt!).pop() : undefined;
    return `<details class="pl-elevdetalj" data-elev="${esc(e.id)}"${oppna.has(e.id) ? ' open' : ''}><summary><span class="pl-elevnamn">${esc(e.namn)}</span>${graf(varden, etiketter, { namn: e.namn })}<span class="pl-riktning${r ? ` ${r}` : ''}">${r ? `<span aria-hidden="true">${PIL[r]} </span>` : ''}${esc(riktningText(e))}</span></summary>
      <div class="pl-grafruta">${graf(varden, etiketter, { stor: true, mitt: s.mitt, pass: !s.grupp && aktiv.foljd.gjorda.length ? narvaroFor(e) : undefined, namn: e.namn })}</div>
      ${!s.grupp && aktiv.foljd.gjorda.length ? '<p class="pl-not">Prickarna under veckan är passen: fylld var med, ring var inte med, streck passet blev inte av.</p>' : ''}
      ${mittvarde ? `<p>Vid avstämningen mitt i: ${mittvarde.varde}, ${esc(SKALAN[mittvarde.varde - 1].toLocaleLowerCase('sv'))}.</p>` : ''}${narvaro}${res ? `<ul class="pl-res">${res}</ul>` : ''}
      ${s.grupp ? '' : `<p class="pl-andra-knappar"><button type="button" class="knapp sekundar liten" data-elevpdf="${esc(e.id)}" data-goatcounter-click="planera:${esc(data.id)}:elevpdf" data-goatcounter-title="${esc(data.titel)}: en elevs sammanställning som pdf">${esc(pdfOrd('elevens sammanställning'))}<span class="visually-hidden">: ${esc(e.namn)}</span></button><button type="button" class="knapp sekundar liten" data-elevtext="${esc(e.id)}" data-goatcounter-click="planera:${esc(data.id)}:elevtext" data-goatcounter-title="${esc(data.titel)}: en elevs rad kopierad">Kopiera raden utan namnet<span class="visually-hidden">: ${esc(e.namn)}</span></button></p>`}</details>`;
  }).join('')}</div></section>`);
  const veckorna = s.veckor.filter((v) => v.skattning);
  const noter = s.veckor.filter((v) => v.not);
  if (veckorna.length || noter.length) delar.push(`<section class="pl-block"><h3>Hur veckorna gick</h3>${veckorna.length ? `<div class="pl-grafruta">${graf(s.veckor.map((v) => v.skattning), etiketter, { stor: true, mitt: s.mitt, namn: 'Hur veckorna gick, 1 till 5' })}</div><p>Medel ${String(s.veckomedel).replace('.', ',')} av 5.</p>` : ''}${noter.length ? `<ul class="pl-noter">${noter.map((v) => `<li><span class="pl-etikett">Vecka ${v.innehall}${v.igen ? ' igen' : ''} · v. ${v.vecka}</span>${esc(v.not!)}</li>`).join('')}</ul>` : ''}</section>`);
  const beslut = [
    ...(s.avstamning?.beslut || s.avstamning?.not ? [`<li><span class="pl-etikett">Avstämning mitt i insatsen</span>${esc(mening([s.avstamning.beslut ? BESLUT[s.avstamning.beslut as keyof typeof BESLUT] : '', s.avstamning.not ?? ''].filter(Boolean).map((x) => x.replace(/[.\s]+$/, '')).join('. ')))}</li>`] : []),
    ...(s.utvardering?.beslut || s.utvardering?.not ? [`<li><span class="pl-etikett">Utvärdering efter insatsen</span>${esc(mening([s.utvardering.beslut ? BESLUT[s.utvardering.beslut as keyof typeof BESLUT] : '', s.utvardering.not ?? ''].filter(Boolean).map((x) => x.replace(/[.\s]+$/, '')).join('. ')))}</li>`] : []),
  ];
  if (beslut.length) delar.push(`<section class="pl-block"><h3>Besluten</h3><ul class="pl-noter">${beslut.join('')}</ul></section>`);
  delar.push(`<p class="pl-knappar"><button type="button" class="knapp" data-gruppdf data-goatcounter-click="planera:${esc(data.id)}:gruppdf" data-goatcounter-title="${esc(data.titel)}: sammanställningen som pdf">${esc(pdfOrd('sammanställningen'))}</button><button type="button" class="knapp sekundar" data-samman data-goatcounter-click="planera:${esc(data.id)}:sammanstallning" data-goatcounter-title="${esc(data.titel)}: sammanställningen kopierad">Kopiera utan namn</button></p><p class="pl-not">Utskriften har elevernas namn. Texten som kopieras har inga namn, så att den kan klistras in i skolans dokumentation.</p>`);
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
$('pl-samman').addEventListener('click', async (e) => {
  const mal = e.target as Element;
  const knapp = mal.closest<HTMLButtonElement>('button');
  if (!knapp) return;
  if (knapp.hasAttribute('data-samman')) { visaBesked((await kopiera(sammanstallningstext(info(), plan, senaste))) ? 'Sammanställningen är kopierad, utan elevernas namn.' : 'Texten gick inte att kopiera i den här webbläsaren.'); return; }
  if (knapp.dataset.elevtext) { visaBesked((await kopiera(elevtext(info(), plan, senaste, knapp.dataset.elevtext))) ? 'Elevens rad är kopierad, utan namnet. Klistra in den i elevens dokumentation.' : 'Texten gick inte att kopiera i den här webbläsaren.'); return; }
  if (knapp.hasAttribute('data-gruppdf') || knapp.dataset.elevpdf) {
    knapp.setAttribute('aria-busy', 'true');
    try {
      const id = knapp.dataset.elevpdf;
      const bytes = id ? await elevPdf(plan, senaste, id, pdfInfo(), idag, aktiv.foljd.franvaro) : await gruppPdf(plan, senaste, pdfInfo(), idag);
      await visaPdf(bytes, id ? filnamnAv(senaste.elever.find((x) => x.id === id)?.namn ?? 'elev', data.titel) : filnamnAv('sammanstallning', data.titel, aktiv.namn));
    } catch { visaBesked('Pdf:en gick inte att göra i den här webbläsaren. Kopiera texten i stället.'); }
    knapp.removeAttribute('aria-busy');
  }
});

// ---------- Kopian ----------
// Planen och allt läraren har fört in sparas också som en fil som läraren lägger där skolans filer finns, så att
// uppföljningen går att flytta till en annan dator och inte försvinner om webbläsaren rensas (Niclas 2026-10-24: "risk att
// saker försvinner"; Safari raderar det en webbplats har sparat efter sju dagars användning utan besök på den, WebKit
// 2020). Filen har elevernas namn; den skickas ingenstans.
const KOPIANS_TYP = 'planera-insatsen';
const kopiansAlder = () => (aktiv.kopia ? Math.round((Date.parse(idag) - Date.parse(aktiv.kopia)) / 86400000) : null);
function renderaKopia() {
  const ruta = $('pl-kopia');
  ruta.hidden = false;
  const text = $('pl-kopia-text');
  const harFoljd = aktiv.folj && (aktiv.foljd.gjorda.length > 0 || Object.keys(aktiv.foljd.skattning).length > 0 || aktiv.foljd.elever.length > 0);
  $('pl-kopia-spara').hidden = !aktiv.sparad;
  const alder = kopiansAlder();
  text.classList.toggle('pl-paminn', harFoljd && (alder === null || alder > 14));
  text.textContent = !aktiv.sparad
    ? 'Har du en kopia av en plan, till exempel från en annan dator? Öppna den här.'
    : harFoljd
      ? alder === null ? 'Det du för in finns bara i den här webbläsaren. Spara en kopia där du har skolans filer, så finns den kvar och går att öppna på en annan dator.'
        : alder > 14 ? `Senaste kopian är från ${datumText(aktiv.kopia!)}. Spara en ny, så kommer det senaste med.` : `Senaste kopian sparades ${datumText(aktiv.kopia!)}.`
      : 'En kopia som fil går att öppna på en annan dator.';
}
$('pl-kopia-spara').addEventListener('click', () => {
  aktiv.kopia = idag;
  spara();
  const egen = lasPlaner().planer.find((p) => p.id === aktiv.id);
  const fil = JSON.stringify({ typ: KOPIANS_TYP, v: 1, sparad: idag, plan: egen }, null, 1);
  const url = URL.createObjectURL(new Blob([fil], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = filnamnAv('planera-insatsen', data.titel, aktiv.namn, idag).replace(/\.pdf$/, '.json');
  document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  renderaKopia();
  visaBesked('Kopian är sparad som fil. Lägg den där du har skolans filer. Den har elevernas namn, så dela den inte.');
});
$<HTMLInputElement>('pl-kopia-fil').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const fil = input.files?.[0];
  input.value = '';
  if (!fil) return;
  let innehall: { typ?: string; v?: number; plan?: SparadPlan };
  try { innehall = JSON.parse(await fil.text()); } catch { visaBesked('Filen är inte en kopia av en plan.'); return; }
  const p = innehall?.plan;
  if (innehall?.typ !== KOPIANS_TYP || !p || typeof p.id !== 'string' || typeof p.metod !== 'string' || !lasVal(p.val ?? '')) { visaBesked('Filen är inte en kopia av en plan.'); return; }
  const finns = lasPlaner().planer.find((x) => x.id === p.id);
  if (finns && finns.andrad > (p.andrad ?? '') && !window.confirm('Planen på den här enheten är nyare än kopian. Ersätta den med kopian?')) return;
  if (!skrivPlaner([p, ...lasPlaner().planer.filter((x) => x.id !== p.id)])) { visaBesked('Kopian gick inte att spara i den här webbläsaren.'); return; }
  // En kopia av en annan metods plan öppnas på den metodens sida.
  if (p.metod !== data.id) { location.href = `/stodundervisning/${encodeURIComponent(p.metod)}/planera#${p.val}&p=${encodeURIComponent(p.id)}`; return; }
  aktiv = franSparad(p);
  visa = undefined;
  plan = planera(mp, aktiv.val);
  uppdateraAdressen();
  rendera();
  ($('pl-andra') as HTMLDetailsElement).open = false;
  visaBesked('Kopian är öppnad, med allt som förts in.');
});
// Webbläsaren ombeds spara planerna varaktigt, så att den inte rensar dem på egen hand. Den bestämmer själv.
const bedOmVaraktig = () => { try { void navigator.storage?.persist?.(); } catch { /* utan stöd */ } };

// ---------- Flera planer för samma metod ----------
function renderaGrupper() {
  const egna = mina();
  const nav = $('pl-grupper');
  nav.hidden = egna.length < 2 && !(egna.length === 1 && !aktiv.sparad);
  if (nav.hidden) { nav.innerHTML = ''; return; }
  nav.innerHTML = `<span class="pl-etikett">Dina planer</span>${egna.map((p) => `<button type="button" class="pl-chip" data-plan="${esc(p.id)}" aria-pressed="${p.id === aktiv.id && aktiv.sparad}">${esc(p.namn || `Plan från ${datumText(lasVal(p.val)?.val.start ?? idag)}`)}</button>`).join('')}<button type="button" class="pl-chip" data-plan="ny" aria-pressed="${!aktiv.sparad && !aktiv.franLank}">Ny plan</button>`;
}
$('pl-grupper').addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('[data-plan]');
  if (!b) return;
  const p = mina().find((x) => x.id === b.dataset.plan);
  aktiv = p ? franSparad(p) : nyAktiv();
  visa = undefined;
  plan = planera(mp, aktiv.val);
  history.replaceState(null, '', p ? `#${kodaVal(aktiv.val, { id: aktiv.id })}` : location.pathname);
  rendera();
  ($('pl-andra') as HTMLDetailsElement).open = !aktiv.sparad;
});

// ---------- Knapparna ----------
async function kopiera(text: string): Promise<boolean> {
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
// Beskedet överst, med en knapp när något går att ångra.
let angra: (() => void) | null = null;
function visaBesked(text: string, angraMed?: () => void) {
  const b = $('pl-besked');
  angra = angraMed ?? null;
  b.innerHTML = text ? `${esc(text)}${angra ? ' <button type="button" class="pl-textknapp" data-angra-besked>Ångra</button>' : ''}` : '';
  b.hidden = !text;
}
$('pl-besked').addEventListener('click', (e) => { if ((e.target as Element).closest('[data-angra-besked]') && angra) { const g = angra; angra = null; g(); } });
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
  if (!spara()) { aktiv.sparad = false; visaBesked('Planen kunde inte sparas i den här webbläsaren. Kopiera länken till planen, så finns den kvar.'); return; }
  bedOmVaraktig();
  uppdateraAdressen();
  rendera();
  ($('pl-andra') as HTMLDetailsElement).open = false;
  visaBesked('Planen är sparad på den här enheten. Den finns också under Dina insatser i metodbanken.');
  $('pl-veckan').scrollIntoView({ block: 'start' });
});
$('pl-dokumentation').addEventListener('click', async () => {
  const genomforda = aktiv.folj && aktiv.foljd.gjorda.length ? { genomforda: plan.pass.filter((p) => gjort(passetsDag(p))).length } : {};
  const text = dokumentationstext({ titel: data.titel, undertitel: data.undertitel, adress: data.adress, mal: data.mal, uppfoljning: data.uppfoljning.rader, nivaNamn: nivaNamn() }, plan, aktiv.val, { minuter: minuter(), ...genomforda });
  visaBesked((await kopiera(text)) ? 'Texten till dokumentationen är kopierad. Klistra in den i skolans dokumentation.' : 'Texten gick inte att kopiera i den här webbläsaren.');
});
$('pl-lank').addEventListener('click', async () => {
  visaBesked((await kopiera(lank())) ? 'Länken till planen är kopierad. Gruppens namn och det som förts in följer inte med.' : 'Länken gick inte att kopiera. Den står i adressfältet.');
  uppdateraAdressen();
});
$('pl-kalender').addEventListener('click', () => {
  const text = kalenderfil({ titel: data.titel, uppfoljning: data.uppfoljning.rader, fokus: (data.progression?.rader ?? []).map((r) => r.fokus) }, plan, { id: aktiv.id, lank, namn: aktiv.namn || undefined, nu: new Date() });
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${data.id}-plan.ics`;
  document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  visaBesked('Kalenderfilen är hämtad. Öppna den, så läggs veckorna och uppföljningen i din kalender. I Google Kalender läggs filen in på datorn.');
});
$('pl-ta-bort').addEventListener('click', (e) => fragaForst(e.currentTarget as HTMLElement, 'Ta bort planen från den här enheten, med allt som förts in? En kopia som fil och länken till planen finns kvar.', 'Ta bort planen', () => {
  const borttagen = lasPlaner().planer.find((p) => p.id === aktiv.id);
  skrivPlaner(lasPlaner().planer.filter((p) => p.id !== aktiv.id));
  aktiv = nyAktiv();
  visa = undefined;
  plan = planera(mp, aktiv.val);
  history.replaceState(null, '', location.pathname);
  rendera();
  ($('pl-andra') as HTMLDetailsElement).open = true;
  visaBesked('Planen är borttagen från den här enheten.', borttagen ? () => {
    skrivPlaner([borttagen, ...lasPlaner().planer]);
    aktiv = franSparad(borttagen);
    plan = planera(mp, aktiv.val);
    uppdateraAdressen();
    rendera();
    ($('pl-andra') as HTMLDetailsElement).open = false;
    visaBesked('Planen är tillbaka.');
  } : undefined);
}));
sida.addEventListener('click', (e) => {
  if ((e.target as Element).closest('[data-hela]')) { e.preventDefault(); $('pl-planen').scrollIntoView({ block: 'start' }); }
});

function rendera() {
  renderaVal();
  renderaSumma();
  renderaVeckor();
  renderaVeckan();
  renderaSamman();
  renderaKopia();
  renderaGrupper();
  sida.classList.toggle('pl-har-plan', aktiv.sparad || aktiv.franLank);
}

// Start: en sparad plan visar veckan och har valen ihopfällda; ett förslag har valen öppna.
rendera();
($('pl-andra') as HTMLDetailsElement).open = !aktiv.sparad;
if (aktiv.uppdaterad && data.uppdaterad && aktiv.uppdaterad < data.uppdaterad && !besked) besked = `Metoden har uppdaterats ${data.uppdateradText ?? data.uppdaterad}, efter att planen gjordes. Planen följer metoden som den är nu.`;
if (!lagringOk) besked = 'Webbläsaren sparar inget här, till exempel i privat läge. Kopiera länken till planen, så finns den kvar.';
visaBesked(besked);
uppdateraAdressen();
sida.classList.add('pl-klar');
