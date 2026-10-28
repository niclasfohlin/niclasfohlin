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
  arDatum, AVSLUTANDE, AVSLUTAS_EFTER, BESLUT, lektionernasMal, BESLUTEN, forlangdaVal, insatsenAvslutad, insatsenSlut, planensSistaDag, beslutText, dagarText, dagKort, dagText, datumspann, datumText, decimal, delensTidI, dokumentationstext, dokumentationsrader, efterDatum, elevensResultat, elevensVarden, elevtext, esc, filnamnet, forstaMandagen, forval, forvaldLangd, gangen, GRUPPEN, iDatumordning, klockslag, liten, mening, metodveckan, minuterAv, minuterISpann, narvaronText, passensRad, passetsBeskrivning, plusMinuter, prickarna, resultatText, riktningText, sakspann, skattadeVeckor, skattningenText, stapelnsKant, stor, talText, sammaElev, skattningenMittI, uppfoljningensNamn, uppfoljningensRader, veckansPass, veckodagKort, veckorI, veckornaIPlanen, helgdag, isoVecka, kalenderfil, kalendervecka, kalenderveckaUtskriven, kodaVal,
  hogstaPassnr, LANGSTA, lasVal, malText, passetMedNr, passnummerText, PLANERA, metodplan, minuterText, mittVeckan, nastaObockade, passensMinuter, passetsDag, passetsLangder, passetsVisadeRoller, passetsTid, planera, PLANKNAPPAR, planvecka, planveckanKort, planveckansNamn, plusDagar,
  bytDagar, delarIFoljd, elevenHarNagot, narvaronKort, passensNarvaro, prickarnasText, formularetText, linjen, rensadLank, skattningensGranser, skattningensText, stegetsNamn, stegetsSpann, ELEVLISTANS_LANGD, elevernasNamn, kapaVidOrd, mandagen, passetsLage, rensaFoljd, rentaFore, rentaTider, rentaPasstider, passetsEgenTid, radText, rentMal, riktning, sakdelar, sammanstallning, sammanstallningstext, SKALAN, skattningsfragan, spannKort, stegUtanfor, tidsspann, tidText,
  ELEVERNAS_KOLUMN, kursensPassnummer, variantenFor, upprepaIVeckan, vidareMening, vidareProvasI, uppfoljningensTillfallen, uppraknat, utanNamn, utvarderingenText, avslutetText, kalenderveckornaFor, veckansDagar, veckansNamn, veckanFor, veckodag, veckonyckel, VECKODAGAR, FORE_PASSET, type Veckonamn,
  type Foljd, type Pass, type Skala, type Plan, type PlanVecka, type Sammanstallning, type SammanstallningElev, type Val,
} from '../lib/standard/index.js';
import type { PlanData, PlanSkattning } from '../lib/insatsplan';
// Lektionerna i en serie med lektionsbank (K-551).
import { antalBockade, lektionernaPaVeckorna, LEKTIONENS_GRANS, RESULTATETS_LANGD, utanFogar, lektionensForslag, meningarna, ORDNINGSTAL, rentaLektioner, vidareTillLektion } from '../lib/standard/index.js';
import type { PlanLektion } from '../lib/insatsplan';
import { APPENS_PLANER, idagLokalt, oppnaPlanerna, valdaFiler, iTurOrdning, lagringenArNyare, lasPlaner, lasPlanfil, narText, nuTid, NYARE_VERSION, nyttId, planensAdress, planensNamn, planfilen, raknaPagaende, schemaAv, skiljNamnen, skrivPlaner, STATUSNAMN, statusAv, type SparadPlan } from './insatser-lagring';
import { kanSkrivaUtPdf, skrivUt } from './pdfutskrift';
import { tidrad } from './tidrad';
import { elevPdf, gruppPdf } from './planpdf';
import { iAppen, vagenUt, vagenUtText, webblasaren } from './webblasaren';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const sida = $('plan');
let data: PlanData = JSON.parse($('pl-data').textContent ?? '{}');
// Seriens data när metoden är en serie med lektionsbank (K-551). En vecka med vald lektion ritas med lektionens innehåll i
// data (medLektion), och seriens står kvar här. iLektion säger att veckan ritas med en lektion, vars mål veckan skattas mot.
const serien: PlanData | undefined = data.lektioner?.length ? data : undefined;
let iLektion = false;
// Lektionen som veckan ritas med, eller ingen (medLektion).
let aktuell: PlanLektion | undefined;
// Metodens egna skattningar läses på sajten, där metodens tabeller finns, och följer med sidans data (K-559).
// Metodens plan ur planens data, med metodens egna skattningar, förvalet i veckor (plan.veckoval) och veckorna före start
// (plan.foreVeckor) och den sista radens vecka (plan.sistaRaden), så att sidan har samma plan som motorn (Rimligheten
// 2026-10-26: Chambers boksamtal visade fem veckor fast metoden säger åtta, och Före en vecka fast metoden säger tre).
// Planprovet stoppar ett fält som inte följer med.
const mpAv = (d: PlanData) => ({ ...metodplan({ tid: d.tid, period: d.period, progression: d.progression, uppfoljning: d.uppfoljning, plan: { passen: d.passen, ...(d.extraPass ? { extraPass: true } : {}), ...(d.veckoval?.forval ? { veckoval: { text: d.veckoval.text, mer: d.veckoval.mer.namn, forval: d.veckoval.forval } } : {}), ...(d.foreVeckor ? { foreVeckor: d.foreVeckor } : {}), ...(d.sistaRaden ? { sistaRaden: true } : {}), ...(d.versionsval ? { versionsval: { versioner: d.versionsval.versioner.map((v) => ({ namn: v.namn, ...(v.veckor ? { veckor: v.veckor } : {}) })) } } : {}) } }).plan!, skattningar: d.skattningar ?? [] });
// Planens val av version (plan.versionsval, K-576; Niclas 2026-10-27): sidans data och metodens plan i den version som
// planen har. Den första versionen är sidans data, och de andra lägger sina fält över den. rakna() räknar planen i
// planens version, så att valet följer med efter Ångra, en annan plan och en plan ur en fil.
const bas: PlanData = data;
const versionensData = (slug?: string): PlanData => { const v = bas.versionsval?.versioner.find((x) => x.slug === slug); return v ? ({ ...bas, ...v.data } as PlanData) : bas; };
let mp = mpAv(data);
const mpFor = (val: Val) => (bas.versionsval ? mpAv(versionensData(val.version)) : mp);
// En version som bestämmer veckorna, som Guideboken, har alltid sina veckor, också i en plan ur en länk med ett annat
// antal (steg 4b 2026-10-27: Guideboken fick förvalets fem veckor). En sådan version förlängs inte.
function tillVersionen() {
  if (!bas.versionsval) return;
  data = versionensData(aktiv.val.version);
  mp = mpAv(data);
  const v = bas.versionsval.versioner.find((x) => x.slug === aktiv.val.version) ?? bas.versionsval.versioner[0];
  if (v?.veckor && aktiv.val.langd !== v.veckor) aktiv.val.langd = v.veckor;
}
function rakna() { tillVersionen(); plan = planera(mp, aktiv.val); }
const idag = idagLokalt();
// Uppföljningens rad med sitt namn ur standarden, som i raden, texterna och pdf:en: Efter insatsen, och en vecka som i planen.
const uppfNamn = (rad: number) => uppfoljningensNamn(plan, info(), rad);

type HelFoljd = Required<Omit<Foljd, 'avstamning' | 'utvardering' | 'narvaro' | 'oppen' | 'borttagna' | 'lamnade' | 'listan' | 'matt' | 'lankar' | 'lektionPa'>> & Pick<Foljd, 'avstamning' | 'utvardering' | 'narvaro' | 'oppen' | 'borttagna' | 'lamnade' | 'listan' | 'matt' | 'lankar' | 'lektionPa'>;
const tomFoljd = (): HelFoljd => ({ gjorda: [], elever: [], franvaro: {}, vecka: {}, skattning: {}, resultat: {} });
interface Aktiv { id: string; namn: string; val: Val; folj: boolean; foljd: HelFoljd; sparad: boolean; franLank: boolean; uppdaterad?: string; kopia?: string }
// Veckorna med ett värde i metodens egna skattningar (K-559), som räknas som infört, som skattningarna mot målet.
const mattVeckor = () => Object.values(aktiv.foljd.matt ?? {}).flatMap((v) => Object.keys(v ?? {}));
// En metod med en egen skattning av gruppen, som Gruppstärkande aktiviteters Lärarens skattning, följer insatsen från början,
// eftersom skattningen är en del av metoden, och läraren kan välja bort det (Niclas 2026-10-28: "Tycker den ska med om den
// är en del av metoden. Men kan ju väljas bort också"). En sparad plan behåller lärarens val.
const foljerFranBorjan = () => (data.skattningar ?? []).some((x) => x.vem === 'gruppen' && !!x.skala);
const nyAktiv = (val: Val = forval(mp, idag), franLank = false, id = nyttId()): Aktiv => ({ id, namn: '', val, folj: foljerFranBorjan(), foljd: tomFoljd(), sparad: false, franLank });
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
tillVersionen();
let plan: Plan = planera(mp, aktiv.val);

// ---------- Lagringen och länken ----------
const lank = (vecka?: number | 'fore') => `${location.origin}${location.pathname}#${kodaVal(aktiv.val, { id: aktiv.id, ...(vecka ? { visa: vecka } : {}) })}`;
const bockade = () => antalBockade(plan, aktiv.foljd.gjorda);
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
    const pl = egen ? plan : planera(mpFor(val), val);
    const ny = { ...p, schema: schemaAv(pl, val), bockade: egen ? bockade() : antalBockade(pl, p.foljd?.gjorda) };
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
// Lärarens länkar till formuläret och sammanställningen står inte i länken till planen, så de räknas som infört (Codex
// 2026-10-26).
const harLankar = () => Object.values(aktiv.foljd.lankar ?? {}).some((l) => !!(l?.formular || l?.sammanstallning));
const harInfort = () => aktiv.foljd.gjorda.length > 0 || Object.keys(aktiv.foljd.skattning).length > 0 || mattVeckor().length > 0 || harLankar() || aktiv.foljd.elever.length > 0 || Object.keys(aktiv.foljd.resultat).length > 0 || !!aktiv.foljd.avstamning?.beslut || !!aktiv.foljd.utvardering?.beslut;
// Gick det inte att spara, säger beskedet vad som håller: kopian när läraren har fört in något, annars länken.
function sparfel() {
  if (lagringenArNyare()) visaBesked(NYARE_VERSION, { text: 'Ladda om sidan', gor: () => location.reload(), kvar: true });
  else if ((aktiv.folj && harInfort()) || harLankar()) visaBesked('Det gick inte att spara i den här webbläsaren. Ladda ner planen som fil, så finns det du har fört in kvar.', { text: PLANKNAPPAR.laddaNer, gor: sparaKopia, kvar: true });
  else visaBesked('Planen gick inte att spara i den här webbläsaren. Kopiera länken, så finns planen kvar.', { text: 'Kopiera länken', gor: () => void kopieraLanken(), kvar: true });
}

// ---------- Valen ----------
const start = $<HTMLInputElement>('pl-start');
const dagknappar = [...sida.querySelectorAll<HTMLButtonElement>('#pl-dagar [data-dag]')];
const langdknappar = [...sida.querySelectorAll<HTMLButtonElement>('#pl-langd [data-langd]')];
const minutknappar = [...sida.querySelectorAll<HTMLButtonElement>('#pl-minuter [data-minuter]')];
const nivaknappar = [...sida.querySelectorAll<HTMLButtonElement>('#pl-nivaer [data-niva]')];
const versionsknappar = [...sida.querySelectorAll<HTMLButtonElement>('#pl-versioner [data-version]')];
// Ingångarna i en serie med lektionsbank (K-551): lektionen i vecka 1.
const ingangsknappar = [...sida.querySelectorAll<HTMLButtonElement>('#pl-ingangar [data-ingang]')];
const namnfalt = $<HTMLInputElement>('pl-namn');
const elevfalt = $<HTMLTextAreaElement>('pl-elever');
const foljruta = $<HTMLInputElement>('pl-folj');
const narvaroruta = $<HTMLInputElement>('pl-narvaro');
const tidFran = $<HTMLSelectElement>('pl-tid-fran');
const borjaval = document.getElementById('pl-borja') as HTMLSelectElement | null;
const tidTill = $<HTMLSelectElement>('pl-tid-till');
// Passets längd utan klockslag, och passens längd i planen: klockslagen när läraren har satt dem (Codex 2026-10-24).
// Utan val är längden förvalet ur faktarutans spann (passetsLangder, K-564): det hela passet, eller steget i mitten.
const minuter = () => aktiv.val.minuter ?? passetsLangder(mp.minuter).forval;
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
  // En metod med en enda längd har ingen knapp att välja, bara metodens rad, tills en förlängning ger en längd till
  // (Rimligheten 2026-10-26: ett val med en enda knapp såg ut som ett fel).
  langdknappar[0].parentElement!.hidden = langdknappar.length < 2;
  const langd = passensLangd();
  for (const b of minutknappar) b.setAttribute('aria-pressed', String(langd.length === 1 && Number(b.dataset.minuter) === langd[0]));
  for (const b of nivaknappar) b.setAttribute('aria-pressed', String(b.dataset.niva === aktiv.val.niva));
  for (const b of versionsknappar) b.setAttribute('aria-pressed', String(b.dataset.version === (aktiv.val.version ?? bas.versionsval?.versioner[0].slug)));
  lasVersion();
  for (const b of ingangsknappar) b.setAttribute('aria-pressed', String(Number(b.dataset.ingang) === (aktiv.val.lektioner ?? [])[0]));
  if (borjaval) {
    borjaval.value = String(aktiv.val.borja ?? 1);
    lasBorja();
  }
  if (document.activeElement !== namnfalt) namnfalt.value = aktiv.namn;
  // Under dagarna: när insatsen har börjat gäller nya dagar från i dag, och ett byte står med dagarna före (K-546).
  const byte = $('pl-dagar-byte');
  const harByte = rentaFore(aktiv.val.fore).length > 0;
  byte.hidden = !harByte && !dagarFranIdag();
  byte.textContent = harByte ? `${stor(dagarText(aktiv.val, plan))}.` : byte.hidden ? '' : 'Ändrar du dagarna gäller de från i dag, och passen som har varit och dagens pass står kvar.';
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
  // Uppföljningen efter insatsen kan ligga senare, som fyra veckor efter sista passet, och dess vecka går också att trycka
  // som lov (verifieringen 2026-10-26: uppföljningen i jullovet, när listan slutade två veckor efter planen).
  const sistaUppf = plan.uppfoljning.flatMap((u) => u.tillfallen.map((t) => mandagen(t.datum))).reduce((a, b) => (b > a ? b : a), '');
  if (sistaUppf > sistaLov) sistaLov = sistaUppf;
  // I sommarlovet går alla lovets veckor att trycka, så att uppföljningen kan flytta förbi lovet.
  for (let i = 0; i < 10 && sistaLov && iSommarlovet(sistaLov); i++) sistaLov = plusDagar(sistaLov, 7);
  for (let i = 0; i < 10 && lov.has(veckonyckel(forstaLov)); i++) forstaLov = plusDagar(forstaLov, -7);
  for (let i = 0; i < 10 && lov.has(veckonyckel(sistaLov)); i++) sistaLov = plusDagar(sistaLov, 7);
  const veckor: string[] = [];
  // Taket räcker till planens längsta längd och uppföljningen efter den (Codex 2026-10-26: 42 veckor räckte inte).
  for (let m = forstaLov; m <= sistaLov && veckor.length < 70; m = plusDagar(m, 7)) veckor.push(m);
  $('pl-lovveckor').innerHTML = veckor.map((m) => { const k = veckonyckel(m); const pa = lov.has(k); return `<button type="button" class="pl-chip pl-lovchip" data-lovvecka="${k}" aria-pressed="${pa}"${lovetLast(m) ? ' disabled' : ''} aria-label="${stor(kalenderveckaUtskriven(isoVecka(m).vecka))}, ${esc(spannKort(m, plusDagar(m, 4)))}${pa ? ', lov' : ''}"><span>${kalendervecka(isoVecka(m).vecka)}</span><small>${esc(spannKort(m, plusDagar(m, 4)))}</small></button>`; }).join('');
  $('pl-lov-not').hidden = !veckor.some(lovetLast);
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
const tidval = (valt: string | undefined, efter?: string, tom: string | null = 'Ingen tid') => {
  const lista = [...new Set([...KLOCKSLAG, ...(valt ? [valt] : [])])].sort().filter((k) => (efter ? k > efter : k < KLOCKSLAG[KLOCKSLAG.length - 1]));
  return `${efter || tom === null ? '' : `<option value="">${tom}</option>`}${lista.map((k) => `<option value="${k}"${k === valt ? ' selected' : ''}>${tidText(k)}</option>`).join('')}`;
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
  const plats = f.getBoundingClientRect().top;
  andra(() => { aktiv.val.tider = sattTid([d], fran, f.dataset.del === '1' ? till : undefined); });
  fokusPaPlats($('pl-tid-dagar').querySelector<HTMLSelectElement>(`[data-tiddag="${d}"][data-del="${f.dataset.del}"]`), plats);
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
  rakna();
  const ok = spara();
  uppdateraAdressen();
  rendera();
  if (!ok) sparfel(); else visaBesked(meddelande);
}
function andra(fn: () => void, meddelande?: string | (() => string | undefined), kanAngra = false) {
  const fore = kanAngra ? ogonblick() : null;
  const planenFore = plan, idFore = aktiv.id, lektionerFore = JSON.stringify(aktiv.val.lektioner ?? []);
  fn();
  rakna();
  // I en serie följer veckornas lektioner sina måndagar när något är infört, så att en skattning står kvar mot samma
  // lektions mål när veckorna flyttas (lektionernaPaVeckorna, Codex 2026-10-27). Inte när ändringen själv gällde
  // lektionerna eller en annan plan, som ett byte av lektion, Ångra eller en annan plan.
  if (serien && aktiv.id === idFore && JSON.stringify(aktiv.val.lektioner ?? []) === lektionerFore && harFortIn() && ((aktiv.val.lektioner ?? []).length || Object.keys(aktiv.foljd.lektionPa ?? {}).length)) {
    const { lektioner, minne } = lektionernaPaVeckorna(planenFore, plan, aktiv.val.lektioner ?? [], aktiv.foljd.lektionPa);
    aktiv.foljd.lektionPa = minne;
    if (JSON.stringify(lektioner) !== JSON.stringify(aktiv.val.lektioner)) { aktiv.val.lektioner = lektioner; rakna(); }
  }
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
const nyPlan = (forst?: string | (() => string | undefined)) => () => [typeof forst === 'function' ? forst() : forst, utanforPlanen(), iVyn($('pl-summa')) ? '' : `Planen: ${sammanfattning()}.`].filter(Boolean).join(' ') || undefined;
// Det läraren skriver i ett fält sparas utan att sidan ritas om, så att fältet behåller markören.
function sparaTyst() {
  if (!spara()) sparfel();
  renderaSamman();
}
// En ändring som flyttar passen i en plan med bockar säger vad som hände och kan ångras.
// Det som har förts in räknas på värdena, så att en skattning, en mening eller ett resultat som har tömts inte räknas (Codex
// 2026-10-25). Ett resultat räknas från ett datum: dess nyckel är uppföljningens rad och tillfällets datum.
const harSkattning = () => Object.values(aktiv.foljd.skattning).some((v) => Object.keys(v ?? {}).length > 0) || mattVeckor().length > 0;
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
// Versionen ändrar vad varje vecka är, så den låses som Börja på av det som har förts in, och en ny plan byter den (Codex
// 2026-10-27: bockar och skattningar i Guideboken hamnade under Skattjaktens pass, och en veckoanteckning låste inte).
// Allt som har förts in låser, var det än ligger, så att en flyttad start inte släpper ett resultat före den (Codex samma dag).
function lasVersion() {
  if (!versionsknappar.length) return;
  const last = harFortIn();
  for (const b of versionsknappar) b.disabled = last;
  $('pl-version-not').hidden = !last;
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
  const dagar = new Set([...plan.pass.map(passetsDag), ...(extraPassetsDatum() ? [extraPassetsDatum()!] : [])]);
  const mandagar = new Set(plan.veckor.map((v) => v.mandag));
  const bockar = aktiv.foljd.gjorda.filter((d) => !dagar.has(d)).length;
  const veckor = new Set([...Object.keys(aktiv.foljd.skattning).filter((m) => Object.keys(aktiv.foljd.skattning[m] ?? {}).length), ...Object.keys(aktiv.foljd.vecka), ...mattVeckor()].filter((m) => !mandagar.has(m))).size;
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
  const forst = franIdag ? 'Dagarna gäller från i dag, och passen som har varit och dagens pass står kvar.' : flyttar() ? 'Passen har flyttats.' : undefined;
  // En ny dag utan tid, när de andra dagarna har olika tider, sägs i beskedet, så att klockslagen inte försvinner tyst
  // (verifieringen 2026-10-26: efter ett byte till måndag och onsdag stod passen utan tid).
  const utanTid = () => (!har && Object.keys(rentaTider(aktiv.val.tider)).length > 0 && !rentaTider(aktiv.val.tider)[String(dag)] ? `${stor(VECKODAGAR[dag - 1])} har ingen tid än. Välj den under Tid, om du vill.` : '');
  andra(() => {
    // Tiden som dagarna har, när de har samma (en tid för en dag före ett byte räknas inte).
    const tider = rentaTider(aktiv.val.tider);
    const forsta = [...aktiv.val.dagar].sort().map((d) => tider[String(d)]).find(Boolean);
    aktiv.val = bytDagar(aktiv.val, har ? aktiv.val.dagar.filter((x) => x !== dag) : [...aktiv.val.dagar, dag], franIdag ? idag : undefined, plan);
    // En ny dag får samma tid som de andra, när de har samma. En dag som har en tid sedan förut, före ett byte, behåller
    // den, så att passen som har varit behåller sina klockslag (Codex 2026-10-25).
    if (!har && forsta && !olikaTider && !rentaTider(aktiv.val.tider)[String(dag)]) aktiv.val.tider = { ...rentaTider(aktiv.val.tider), [String(dag)]: forsta };
  }, nyPlan(() => [forst, utanTid()].filter(Boolean).join(' ') || undefined), franIdag || flyttar());
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
// Planens val av version (K-576): versionen och dess veckor, med besked och Ångra. Den första versionen är förvald och står
// inte i länken.
for (const b of versionsknappar) b.addEventListener('click', () => {
  const vv = bas.versionsval;
  const v = vv?.versioner.find((x) => x.slug === b.dataset.version);
  if (!vv || !v || harFortIn()) return;
  andra(() => { aktiv.val.version = v.slug === vv.versioner[0].slug ? undefined : v.slug; if (v.veckor) aktiv.val.langd = v.veckor; }, `${vv.rubrik}: ${v.namn}.`, true);
});
// Ingången byter vecka 1:s lektion som veckans val gör: en skattning som gällde den förra lektionen tas bort med besked och
// Ångra (Codex 2026-10-27).
for (const b of ingangsknappar) b.addEventListener('click', () => {
  let bort: ReturnType<typeof valjLektion> = false;
  const nr = Number(b.dataset.ingang);
  andra(() => { bort = valjLektion(1, nr); }, () => (bort ? `Vecka 1 tar ${lektionen(nr)?.namn ?? ''}. Veckans skattning gällde ${bort === 'lektion' ? 'den förra lektionens mål' : 'målet för hela serien'} och är borttagen.` : undefined), true);
});
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
  const plats = b.getBoundingClientRect().top;
  const har = (aktiv.val.lov ?? []).includes(k);
  andra(() => { aktiv.val.lov = har ? aktiv.val.lov!.filter((x) => x !== k) : [...(aktiv.val.lov ?? []), k].sort(); }, () => `${har ? `Inget lov i ${kalendervecka(Number(k.slice(5)))} längre.` : `Lov i ${kalendervecka(Number(k.slice(5)))}.`} Planen: ${sammanfattning()}.`, true);
  fokusPaPlats($('pl-lovveckor').querySelector<HTMLButtonElement>(`[data-lovvecka="${k}"]`), plats);
});
foljruta.addEventListener('change', () => andra(() => { aktiv.folj = foljruta.checked; if (aktiv.folj) bedOmVaraktig(); }, foljruta.checked ? 'Du följer insatsen. Veckan visar passen att bocka och skattningen mot målet.' : 'Planen visar bara planen. Det du har fört in finns kvar om du slår på uppföljningen igen.'));
narvaroruta.addEventListener('change', () => andra(() => { aktiv.foljd = { ...aktiv.foljd, narvaro: narvaroruta.checked }; }, narvaroruta.checked ? 'Under varje bockat pass står eleverna. Tryck på den som inte var med.' : 'Närvaron noteras inte. Det du har fört in finns kvar.'));
// Elevlistan: en elev per rad, högst tolv. Varje rad minns sin elev medan läraren skriver: ett namn som står kvar är samma
// elev, ett rättat namn på en rad är radens elev, och en rad som står tom en stund behåller sin elev tills läraren skriver
// igen (granskningen 2026-10-24: "Ali" som blev "Ali S." tappade sina skattningar; Codex samma dag: en paus med raden tom
// gav ett nytt id, och en borttagen rad gav nästa elev den borttagnas id). En ny elev behåller sitt id medan läraren
// skriver namnet. Vad som togs bort sägs när läraren lämnar fältet, och under fältet står det som inte kom med
// (buggjakten samma dag: den trettonde eleven och den andra Kalle försvann utan besked).
type Elev = { id: string; namn: string; utkast?: true; fran?: string };
// fore: listan när läraren började skriva, och det som var infört då. radId: eleven som varje rad hör till. start: radernas
// elever när läraren började skriva.
let redigering: { plan: string; fore: Elev[]; foljd: HelFoljd; nya: Map<number, string>; radId: (string | undefined)[]; start: (string | undefined)[]; lamnade: Elev[] } | null = null;
let elevNot = { plan: '', text: '' };
let elevTimer = 0;
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
  // Eleverna som har lämnat listan sparas med planen (lamnade), så att en elev som skrivs in igen får tillbaka det som förts
  // in, också efter en omladdning (verifieringen av K-559 2026-10-26).
  const kanda = [...aktiv.foljd.elever, ...r.fore, ...r.lamnade];
  const franFor = (id: string) => kanda.find((x) => x.id === id)?.fran;
  const medFran = (id: string, namn: string): Elev => { const f = franFor(id); return { id, namn, ...(f ? { fran: f } : {}) }; };
  const anvanda = new Set<string>();
  // En elev som lämnade listan med ett halvskrivet namn från en annan flik (ett utkast) känns igen på förnamnet, när inget
  // namn i listan är detsamma (Codex 2026-10-26: Bea A från en annan flik gav Bea Andersson ett nytt id).
  const somUtkast = (n: string) => r.lamnade.find((x) => x.utkast && sammaElev(x.namn, n) && !anvanda.has(x.id) && !rader.includes(x.namn));
  const lika = rader.map((n) => { if (!n) return null; const e = kanda.find((x) => x.namn === n && !anvanda.has(x.id)) ?? somUtkast(n); if (e) anvanda.add(e.id); return e ? medFran(e.id, n) : null; });
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
    if (agare) { anvanda.add(agare); radId[i] = agare; return [medFran(agare, n)]; }
    let id = r.nya.get(i);
    if (!id || anvanda.has(id)) { id = `e${nyttId().slice(0, 4)}`; r.nya.set(i, id); }
    anvanda.add(id);
    radId[i] = id;
    // En elev som kommer till i en lista som fanns en dag före i dag, när ett pass är bockat före i dag, har dagens datum, så
    // att närvaron räknas från i dag. En lista som skrivs in i flera steg samma dag är gruppen från början (Codex 2026-10-26).
    const sen = r.fore.length > 0 && (!aktiv.foljd.listan || aktiv.foljd.listan < idag) && aktiv.foljd.gjorda.some((d) => d < idag);
    return [{ id, namn: n, ...(sen ? { fran: idag } : {}) }];
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
const startaRedigering = () => { if (!redigering || redigering.plan !== aktiv.id) redigering = { plan: aktiv.id, fore: aktiv.foljd.elever, foljd: structuredClone(aktiv.foljd), nya: new Map(), radId: aktiv.foljd.elever.map((e) => e.id), start: aktiv.foljd.elever.map((e) => e.id), lamnade: aktiv.foljd.lamnade ?? [] }; };
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
  // Eleverna som lämnar listan sparas med planen varje gång listan sparas, också medan läraren skriver, så att en annan flik
  // och en omladdning känner igen dem. Listan räknas från den när ändringen började, så att inget halvt namn stannar där
  // (Codex 2026-10-26). En elev som kommer tillbaka säger det, med Ångra.
  const lamnade = [...r.lamnade.filter((x) => !borta.some((b) => b.id === x.id) && !elever.some((e) => e.id === x.id)), ...borta].slice(-64);
  // Dagen listan fick sin första elev, men inte när eleverna kommer tillbaka från en tidigare lista, som en plan sparad före
  // ändringen som töms och skrivs in igen (Codex 2026-10-26).
  const nyLista = !r.fore.length && elever.length > 0 && !aktiv.foljd.listan && !elever.some((e) => r.lamnade.some((x) => x.id === e.id));
  aktiv.foljd = { ...aktiv.foljd, lamnade: lamnade.length ? lamnade : undefined, ...(nyLista ? { listan: idag } : {}) };
  const tillbaka = elever.filter((e) => !r.fore.some((x) => x.id === e.id) && r.lamnade.some((x) => x.id === e.id));
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
    aktiv.foljd = { ...aktiv.foljd, lamnade: r.lamnade.length ? r.lamnade : undefined };
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
  // En elev som kommer tillbaka sägs alltid, också när en annan togs bort i samma ändring, så att en namne som fick en tidigare
  // elevs skattningar syns och går att ångra (Codex 2026-10-26).
  const tillbakaText = tillbaka.length ? ` ${uppraknat(tillbaka.map((e) => e.namn))} är tillbaka i listan, med det som förts in.` : '';
  if (bara.length) visaBesked(`${uppraknat(bara.map((e) => e.namn))} ${bara.length === 1 ? 'är borttagen' : 'är borttagna'} ur elevlistan.${tillbakaText}`, angra);
  else if (rattade.length) visaBesked(`${uppraknat(rattade)}, med det som förts in.${tillbakaText}`, angra);
  else if (tillbaka.length) visaBesked(tillbakaText.trim(), angra);
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
  f.elever = f.elever.map((e) => (e.id === ny.id ? { id: forut.id, namn: e.namn, ...(forut.fran ? { fran: forut.fran } : {}) } : e));
  for (const varden of [...Object.values(f.skattning), ...Object.values(f.resultat)] as Record<string, unknown>[]) {
    if (varden[ny.id] !== undefined) { varden[forut.id] = varden[ny.id]; delete varden[ny.id]; }
  }
  for (const [dag, lista] of Object.entries(f.franvaro)) f.franvaro[dag] = [...new Set(lista.map((x) => (x === ny.id ? forut.id : x)))];
  f.lamnade = (f.lamnade ?? []).filter((x) => x.id !== forut.id);
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
    aktiv.foljd = { ...aktiv.foljd, elever: [], franvaro: {}, resultat: {}, skattning: kvar(aktiv.foljd.skattning), borttagna: [], lamnade: undefined, listan: undefined };
    elevNot = { plan: '', text: '' };
    elevFraga = { plan: '', par: [] };
  });
  visaBesked('Elevernas namn och det som förts in om dem är borttaget.', { text: 'Ångra', kvar: true, gor: () => aterstall(fore, 'Eleverna är tillbaka.') });
}));

// ---------- Målet ----------
// Insatsens mål: metodens, eller det läraren har skrivit med pennan (Niclas 2026-10-24: "En sådan där typisk skriv knapp
// vid målet för att redigera det", "en liten penna symbol"). Det står i planen, ovanför skattningen och i utvärderingen.
const aktivtMal = () => (iLektion ? data.mal : aktiv.val.mal || data.mal);
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
  // En serie med lektionsbank: veckans lektion, eller när den väljs (K-551; Opus 2026-10-26: "Lektionen väljs efter vecka 3").
  if (serien) {
    const l = lektionen(veckansLektion(v));
    return l ? `Lektion ${l.nr} · ${l.namn}` : v.nr === 1 ? 'Ingången väljs i valen' : `Lektionen väljs efter ${rubrikVecka(plan.veckor[v.nr - 2]).toLocaleLowerCase('sv')}`;
  }
  const namn = mp.stegEnhet === 'pass' ? [...new Set(veckansPass(plan, v).map((p) => passetFor(p).namn).filter(Boolean))] : [];
  return uppraknat(namn.length ? namn : [...new Set(radernaI(v).map((r) => r.kort).filter(Boolean))]);
};
const uppfoljningI = (v: PlanVecka) => plan.uppfoljning.flatMap((u) => u.tillfallen.filter((t) => t.vecka === v.nr).map((t) => ({ ...u, ...t })));
const efterUppfoljning = () => plan.uppfoljning.filter((u) => u.typ === 'efter');
// Metodens mätning direkt efter insatsen, veckan efter sista passet, som utvärderingen jämför med. En uppföljning några
// veckor senare, som Kompissamtals fyra veckor efter, väntar utvärderingen inte på (Rimligheten 2026-10-26: utvärderingen
// stod före kartläggningen efter i tio metoder).
// Med plan.utvarderasEfter väntar utvärderingen på den raden, som texttypskursernas nya text efter 4–6 veckor (K-586).
const matningenEfter = () => {
  const rad = data.utvarderasEfter ?? mp.uppfoljning.find((u) => u.tid.typ === 'efter' && !u.tid.veckor)?.rad;
  return rad === undefined ? undefined : plan.uppfoljning.find((u) => u.rad === rad)?.tillfallen[0];
};
const efterVeckan = (datum: string) => `metodens uppföljning efter insatsen, ${kalendervecka(isoVecka(datum).vecka)}`;
// Det utvärderingen jämför, efter det metoden har: en mätning före och efter, bara efter, bara före, eller skattningarna
// vecka för vecka (Rimligheten 2026-10-26: Gruppstärkande aktiviteter har ingen mätning före).
const jamforelsen = () => {
  const fore = plan.uppfoljning.some((u) => u.typ === 'fore'), efter = efterUppfoljning().length > 0;
  // En mätning i vissa veckor eller pass, som Högläsning i pars provtext i vecka 1 och 8, är också metodens uppföljning.
  const matningar = plan.uppfoljning.some((u) => !u.period && u.tillfallen.length > 0 && u.typ !== 'fore' && u.typ !== 'efter');
  // I en serie gäller skattningarna veckans lektion, så de jämförs lektion för lektion (Rimligheten 2026-10-27).
  if (serien) return fore && efter ? 'Jämför skattningarna lektion för lektion, och metodens uppföljning före och efter.' : 'Jämför skattningarna lektion för lektion, och metodens uppföljning.';
  return fore && efter ? 'Jämför skattningarna och metodens uppföljning före och efter.' : fore || efter || matningar ? 'Jämför skattningarna och metodens uppföljning.' : 'Jämför skattningarna från första till sista veckan.';
};
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
// Sommarlovet, v. 26–32, är lov i alla kommuner (den kalla läsaren av Argumenterande text 2026-10-27: Efter kursen hamnade
// i v. 28 utan att planen sa något, och lovknapparna slutade där).
const iSommarlovet = (datum: string) => { const v = isoVecka(datum).vecka; return v >= 26 && v <= 32; };
// Bocken för ett pass som blev av, i veckans lista och för det extra passet före pass 1.
const bockKnapp = (dag: string, etikett: string) => `<button type="button" class="pl-bock${gjort(dag) ? ' ja' : ''}" data-bock="${esc(dag)}" aria-pressed="${gjort(dag)}" aria-label="${esc(etikett)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12.5l3.7 3.7 7.3-8"/></svg></button>`;
// En vecka går att bocka och skatta från sin måndag (Niclas 2026-10-25: "Alltså från måndag 00.01 kan man bocka den veckas
// pass"; buggjakten samma dag: en vecka längre fram gick att skatta, medan sammanställningen sa att inget pass hade varit).
const harBorjatVecka = (mandag: string) => mandag <= idag;
// Det läraren har fört in står kvar under sin vecka i metoden: ett lov ändras inte i den sista veckan med något infört,
// bockar, frånvaro, skattningar, veckans anteckningar och resultat, och inte före den, eftersom lovet flyttar metodens veckor
// och det införda står på sina datum (Codex 2026-10-26: ett lov i efterhand flyttade skattningarna till en annan vecka). Ett
// förslag och en plan utan något infört har ingen sådan vecka.
const sistaInforda = (): string | undefined => {
  const f = aktiv.foljd;
  // Bara det som har ett värde räknas, så att ett resultat som skrevs och raderades inte låser något (Codex 2026-10-26).
  const med = <T>(o: Record<string, T> | undefined, har: (x: T) => boolean) => Object.entries(o ?? {}).filter(([, x]) => har(x)).map(([k]) => k);
  const datum = [...f.gjorda, ...med(f.franvaro, (x) => !!x?.length), ...med(f.skattning, (x) => Object.keys(x ?? {}).length > 0), ...mattVeckor(), ...med(f.vecka, (x) => !!x?.varde || !!x?.not), ...med(f.resultat, (x) => Object.values(x ?? {}).some(Boolean)).map((k) => k.split('-').slice(1).join('-'))].filter(arDatum);
  return datum.length ? datum.sort().at(-1) : undefined;
};
const lovetLast = (mandag: string) => { const s = sistaInforda(); return !!s && mandag <= mandagen(s); };
const passetsTidText = (p: Pass) => { const t = passetsTid(aktiv.val, p); return t ? tidsspann(t) : ''; };
// Veckans pass som små rutor: bockat, varit men inte bockat, och kommande.
const rutor = (v: PlanVecka) => {
  const pass = veckansPass(plan, v);
  const antal = pass.filter((p) => gjort(passetsDag(p))).length;
  return `<span class="pl-rutor" role="img" aria-label="${antal} av ${pass.length} pass bockade">${pass.map((p) => `<span class="pl-ruta${gjort(passetsDag(p)) ? ' gjord' : p.datum <= idag ? ' varit' : ''}"></span>`).join('')}</span>`;
};

function renderaSumma() {
  const n = plan.pass.length;
  const dagar = stor(dagarText(aktiv.val, plan));
  // Uppföljningen efter heter Efter insatsen i planen; metodens egen rubrik står i Efter insatsen (de kalla läsarna:
  // "Efter sex till åtta veckor" i en plan på sex veckor).
  // Uppföljningens rader med standardens ord, som i texterna och pdf:en; en rad efter insatsen som görs några veckor efter
  // heter som i metoden, så att två rader inte heter likadant (de kalla testarna 2026-10-24).
  const uppf = uppfoljningensRader(plan, info());
  const antal = aktiv.val.dagar.length;
  // Med färre dagar än metodens pass säger planen vilket av veckans pass som faller bort, i en metod där veckans pass har var
  // sitt innehåll (K-580; de kalla testarna 2026-10-27: Textsamtals tredje pass föll bort, och texterna hänvisade till det).
  // Har metoden en rad för veckans sista pass, tar den det sista av planens pass, och det som faller bort ligger före det.
  const borta = antal < mp.takt.min && veckansPassRaknas ? Array.from({ length: mp.takt.min - antal }, (_, i) => veckansPassMedNamn(antal + i + (harVeckansSista ? 0 : 1))) : [];
  const farre = antal < mp.takt.min || antal > mp.takt.max ? `Metoden har ${mp.takt.min === mp.takt.max ? mp.takt.min : `${mp.takt.min} till ${mp.takt.max}`} pass i veckan, och planen har ${antal}.${borta.length ? ` ${stor(borta.join(' och '))} faller då bort varje vecka.` : ''}` : '';
  // Pass mellan jul och trettondagen: loven skiljer sig mellan skolor, så planen föreslår inget, men säger till.
  const iJulen = (datum: string) => { const [, m, d] = datum.split('-').map(Number); return (m === 12 && d >= 21) || (m === 1 && d <= 6); };
  // Bara det som kommer (verifieringen 2026-10-25: varningen stod kvar efter insatsen).
  const kommer = (datum: string) => iJulen(datum) && datum >= idag;
  const julveckor = [...new Set(plan.pass.map((p) => p.datum).filter(kommer).map((d) => kalendervecka(isoVecka(d).vecka)))];
  // Före i v. 44, som är höstlov i de flesta kommuner, säger till som julen, när veckan inte har varit (Rimligheten
  // 2026-10-26: kartläggningen före hamnade i höstlovet i tolv metoder utan att planen sa något).
  // Det extra passet före pass 1 (Rimligheten 2026-10-27: Egen ram lades i v. 44 utan varning).
  const extraDatum = extraPassetsDatum();
  // Det extra passet veckan före pass 1 kan ha varit när planen görs mitt i den veckan, eller när veckan är lov; planen
  // säger det och vad läraren gör, tills passet är bockat (verifieringen 2026-10-27: tisdag 27 oktober en onsdag).
  const extraVarit = extraDatum && extraDatum < idag && plan.forstaPass && plan.forstaPass >= idag && !gjort(extraDatum) ? `Det extra passet före pass 1 hamnar ${dagText(extraDatum)}, som redan har varit. Välj ett senare datum under Från och med, så kommer det veckan före det nya första passet.` : '';
  // Före i en vecka som redan har varit, när planen görs mitt i veckan före första passet eller senare, säger det och vad
  // läraren gör, tills första passet har varit (verifieringen 2026-10-28: Före stod i v. 43 när planen gjordes i v. 44).
  const foreVarit = harFore() && plan.fore.mandag < mandagen(idag) && plan.forstaPass && plan.forstaPass >= idag ? `Det du gör före första passet hamnar i ${kalendervecka(isoVecka(plan.fore.mandag).vecka)}, som redan har varit. Gör det så snart du kan före första passet, eller välj ett senare datum under Från och med${aktiv.sparad ? ' i Ändra planen' : ''}, så hamnar det före det nya första passet.` : '';
  const hostlov = (harFore() && plan.fore.mandag >= mandagen(idag) && isoVecka(plan.fore.mandag).vecka === 44) || (!!extraDatum && extraDatum >= idag && isoVecka(extraDatum).vecka === 44);
  // Uppföljningen görs under en vecka: bara en skolvecka som är helt i julen säger till.
  const efterDatum = efterUppfoljning().flatMap((u) => u.tillfallen.map((x) => x.datum));
  const julUppfoljning = [...new Set(efterDatum.filter((d) => kommer(d) && iJulen(plusDagar(mandagen(d), 4))).map((d) => kalendervecka(isoVecka(d).vecka)))];
  const sommarUppfoljning = [...new Set(efterDatum.filter((d) => d >= idag && iSommarlovet(d)).map((d) => kalendervecka(isoVecka(d).vecka)))];
  const lovetsUppfoljning = (veckor: string[], nar: string, tryck: string) => (veckor.length ? `<p class="pl-varning">Uppföljningen efter insatsen hamnar i ${esc(uppraknat(veckor))}, ${nar}. ${tryck} under Lov${aktiv.sparad ? ' i Ändra planen' : ''}, så flyttar uppföljningen till veckan efter lovet.</p>` : '');
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
    ? `<p class="pl-tal">${n} pass om ${esc(minuterText(langd))} minuter</p>${extraPassetsText() ? `<p>Och det extra passet före pass 1, ${esc(extraPassetsText())}.</p>` : ''}<p>${esc(dagar)}, ${esc(datumspann(plan.forstaPass!, plan.sistaPass!))}.</p>${plan.slut ? `<p>${esc(utvarderingenText(plan, aktiv.foljd.utvardering, !slutNu()))}</p>` : ''}${uppf.length ? `<p>${esc(uppf.join('. '))}.</p>` : ''}${[redanVarit, extraVarit, foreVarit, farre, annanLangd, kortare, langre].filter(Boolean).map((x) => `<p class="pl-varning">${esc(x)}</p>`).join('')}${julveckor.length ? `<p class="pl-varning">Planen har pass i ${esc(uppraknat(julveckor))}, vid jul och nyår, när de flesta skolor har jullov. Är det lov hos er, tryck på ${julveckor.length > 1 ? 'veckorna' : 'veckan'} under Lov${aktiv.sparad ? ' i Ändra planen' : ''}.</p>` : ''}${hostlov ? `<p class="pl-varning">Det du gör före första passet hamnar i v. 44, som är höstlov i de flesta kommuner. Är det lov hos er, gör det efter lovet före första passet, eller tryck på v. 44 under Lov${aktiv.sparad ? ' i Ändra planen' : ''}, så flyttar det till veckan före lovet.</p>` : ''}${lovetsUppfoljning(julUppfoljning, 'vid jul och nyår', `Är det lov hos er, tryck på ${julUppfoljning.length > 1 ? 'veckorna' : 'veckan'}`)}${lovetsUppfoljning(sommarUppfoljning, 'under sommarlovet', 'Tryck på sommarlovets veckor')}${malRad('planen')}`
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
  const lovrad = (m: string) => `<li class="pl-lovvecka"><span class="pl-v">Lov</span><span class="pl-d">${esc(spannKort(m, plusDagar(m, 4)))}</span><span class="pl-innehall"><span class="pl-pass">${kalendervecka(isoVecka(m).vecka)}</span><span class="pl-fokus">Inga pass</span>${lovetLast(m) ? '' : `<button type="button" class="pl-textknapp" data-lov-bort="${esc(veckonyckel(m))}" aria-label="Ta bort lovet i ${kalenderveckaUtskriven(isoVecka(m).vecka)}">Ta bort lovet</button>`}</span></li>`;
  const foljer = klick && aktiv.folj;
  const mitt = mittVeckan(plan);
  for (const v of plan.veckor) {
    for (const m of lovFore(v)) rader.push(lovrad(m));
    const { fran: f, till: t } = veckansDagar(plan, v);
    const steg = radernaI(v)[0];
    const passText = passnummerText(v.pass) || 'Inga pass';
    const marken = [
      // I en serie veckans lektion, så att läraren ser i listan när lektionen byts (Rimligheten 2026-10-27).
      ...(serien && lektionen(veckansLektion(v)) ? [`<span class="pl-markering lektion">${esc(lektionen(veckansLektion(v))!.namn)}</span>`] : []),
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
// Snabbmallen: lektionens i en vecka med lektion, annars metodens, och dess namn.
const snabbmallen = () => (aktuell && plats(`lektion-${aktuell.nr}-snabbmall`)) || plats('snabbmall');
const snabbmallensNamn = () => filer.querySelector<HTMLElement>(`[data-fil="${aktuell && filer.querySelector(`[data-fil="lektion-${aktuell.nr}-snabbmall"]`) ? `lektion-${aktuell.nr}-snabbmall` : 'snabbmall'}"]`)?.dataset.namn ?? 'snabbmallen';
// Det metoden namnger är en länk dit det finns (K-493; Niclas 2026-10-24: "Ett test. Ett papper. En text. En specifik
// lektion. Då ska det vara hyperlänkat från planen"): bladen, korten, mallarna, testen, texterna och lektionerna, ur
// metodens egen fil (src/lib/metodsaker.ts). En sak på bankens nivåer, som kartläggningens text före, leder till planens nivå.
// Veckan som visas, för en sak som finns en gång för några veckor (Mina lärdomar: vecka 1–2).
let lankVecka: number | undefined;
// Sakerna som uppföljningens rader nämner, som kartläggningen före och efter.
const matningensSaker = new Set(data.uppfoljning.rader.flatMap((r) => sakdelar(r.vad, data.saker).filter((x) => x.sak !== undefined).map((x) => data.saker[x.sak!].namn)));
const sakLank = (s: PlanData['saker'][number], text: string) => {
  const nivan = aktiv.val.niva ? s.nivaer?.[aktiv.val.niva] : undefined;
  const veckans = lankVecka !== undefined ? s.veckor?.[String(lankVecka)] : undefined;
  if (s.baraVeckorna && lankVecka !== undefined && !veckans) return esc(text);
  const adress = nivan || veckans || s.adress;
  const lank =(a: string, t: string) => `<a href="${esc(a)}" data-goatcounter-click="planera:${esc(data.id)}:sak" data-goatcounter-title="${esc(data.titel)}: ${esc(s.namn)} från planen">${esc(t)}</a>`;
  // En sak på nivåerna leder utan vald nivå också till varje nivå, så att läraren väljer och inte hamnar på den första
  // (Rimligheten 2026-10-26: Problemlösningens kartläggning före ledde alltid till Bas, fast nivån väljs efter den). En sak
  // som uppföljningens mätning nämner, som kartläggningen, leder också med en vald nivå till varje nivå, eftersom
  // mätningen avgör nivån och eleven görs om på den nivå hen landade (verifieringen 2026-10-27, K-595).
  const nivaerna = (data.bank?.nivaer ?? data.nivaer ?? []).filter((n) => s.nivaer?.[n.slug]);
  if ((nivan && !matningensSaker.has(s.namn)) || nivaerna.length < 2) return lank(adress, text);
  return `${lank(adress, text)} (${nivaerna.map((n) => lank(s.nivaer![n.slug], n.namn)).join(', ')})`;
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
const GANG = ['Dåligt', 'Ganska dåligt', 'Okej', 'Bra', 'Mycket bra'];
const PIL: Record<string, string> = { upp: '↑', samma: '→', ned: '↓' };
// Nivåernas knappar, när veckan behöver gruppens nivå (nivåns rad i en tabell, och bankens poster).
// Stödet för nivåvalet under knapparna, samma nerpil som under formulärets nivåer (K-557; Niclas 2026-10-26: "Bör alltid
// finnas vid ett sådant val i Planeras modul"): en kopia av formulärets, så att texten och länken står på ett ställe.
// Kopian har sin plats som ruta, så att den står öppen kvar när veckan ritas om (Codex 2026-10-26).
const nivastod = (plats: string, oppna?: Set<string>) => {
  const el = document.getElementById('pl-nivastod');
  if (!el) return '';
  const kopia = el.cloneNode(true) as HTMLElement;
  kopia.removeAttribute('id');
  kopia.dataset.ruta = `nivastod-${plats}`;
  kopia.toggleAttribute('open', !!oppna?.has(`nivastod-${plats}`));
  return kopia.outerHTML;
};
const nivaval = (nivaer: { slug: string; farg: string; namn: string }[], plats: string, oppna?: Set<string>) => `<div class="sk-nivaknappar pl-nivaer">${nivaer.map((n) => `<button type="button" class="sk-niva" data-valj-niva="${esc(n.slug)}" style="--niva:${esc(n.farg)}" aria-pressed="false">${esc(n.namn)}</button>`).join('')}</div>${nivastod(plats, oppna)}`;
const beslutsknappar = (slag: 'avstamning' | 'utvardering') => `<div class="pl-beslut" role="group" aria-label="${slag === 'avstamning' ? 'Avstämningens beslut' : 'Utvärderingens beslut'}">${BESLUTEN[slag].map((b) => `<button type="button" class="knapp sekundar liten" data-beslut="${slag}|${b}" aria-pressed="${aktiv.foljd[slag]?.beslut === b}">${esc(BESLUT[b as keyof typeof BESLUT])}</button>`).join('')}</div>`;
// Resultaten i metodens uppföljning för en elev: det första resultatet före, och i utvärderingen varje resultat efter
// insatsen och i avstämningen de som har gjorts under insatsen, efter datum (de kalla testarna 2026-10-27: "Två veckor
// efter" tog bort resultatet efter insatsen, och Säg, skriv och läs avgör avstämningen med Skrivkollen efter vecka 4).
const foreOchEfter = (e: SammanstallningElev, plats: string) => {
  const alla = elevensResultat(plan, e.resultat);
  const fore = alla.find((x) => x.typ === 'fore');
  const sedan = alla.filter((x) => (plats === 'efter' ? x.typ === 'efter' : x.typ !== 'fore' && x.typ !== 'efter'));
  // Med uppföljningens namn, "Före samtal 1: 5", så att resultatet inte läses som skattningen (den kalla testaren 2026-10-26).
  return [...(fore ? [fore] : []), ...sedan].map((x) => `${uppfNamn(x.rad)}: ${x.varde}`).join(', ');
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
  const res = medResultat ? foreOchEfter(e, plats) : '';
  return `<li>${namnknapp(plats, e)}<span class="pl-riktning${r ? ` ${r}` : ''}">${r ? `<span aria-hidden="true">${PIL[r]} </span>` : ''}${esc(riktningText(e))}${res ? `<span class="pl-res-kort">${esc(stor(res))}</span>` : ''}</span>${utvecklingsruta(plats, e, s)}</li>`;
}).join('')}</ul>`;
// Det läraren för in står vid fältet, med metodens skala (K-579), som "Resultat för varje elev, om du vill: ljud av 21".
// Skalan står över fälten och inte i dem, där den klipps av i telefonen (den kalla läsaren av Berättelseramen 2026-10-27).
const resultatfalt = (nyckel: string) => { const skala = data.uppfoljning.rader[Number(nyckel.split('-')[0])]?.resultat; return harElever() ? `<div class="pl-resultat"><span class="pl-hjalp">Resultat för varje elev, om du vill${skala ? `: ${esc(skala)}` : ''}</span>${aktiv.foljd.elever.map((e) => `<label><span>${esc(e.namn)}</span><input class="pl-falt" type="text" maxlength="${RESULTATETS_LANGD}" data-resultat="${esc(nyckel)}|${esc(e.id)}" value="${esc(aktiv.foljd.resultat[nyckel]?.[e.id] ?? '')}" /></label>`).join('')}</div>` : ''; };
// Uppföljningens namn ur standarden, som i raden och texterna: Efter insatsen för den första efter insatsen (buggjakten
// 2026-10-25: Efter-sidan sa "Efter sex till åtta veckor" om en plan på fyra veckor).
// Resultat per elev hör till uppföljningens mätningar, före, efter och vid ett visst pass eller en viss vecka, och inte till
// det som görs varje pass, varje vecka eller varannan vecka (den kalla testaren av Gruppstärkande aktiviteter 2026-10-26: läraren
// skattade på tre ställen).
// En rad som gäller en följd av veckor, som Kort utan beröring vecka 1–4, säger vad läraren gör under perioden och är ingen
// mätning, så den har inga fält för resultat (K-559 2026-10-26).
const periodensRad = (rad: number) => !!plan.uppfoljning.find((u) => u.rad === rad)?.period;
const medResultat = (rad: number, nyckel: string) => (['lopande', 'intervall', 'villkor'].includes(plan.uppfoljning.find((u) => u.rad === rad)?.typ ?? '') || periodensRad(rad) ? '' : resultatfalt(nyckel));
// Uppföljningen som görs i ett visst pass står i rutan med passet: det uppföljningen gör i ett pass med datum, och det
// eleverna fyller i under ett pass (K-559).
// En tid med plats i veckan (veckans första pass i vecka 6) gäller ett bestämt pass, som pass N, och står i passets ruta.
const iPassetsRuta = (rad: number) => ['intervall', 'pass', 'sista-passet'].includes(plan.uppfoljning.find((u) => u.rad === rad)?.typ ?? '') || !!plan.uppfoljning.find((u) => u.rad === rad)?.plats || (data.skattningar ?? []).some((x) => x.vem === 'eleverna' && x.rad === rad);
// En rad i veckans uppföljning. Står texten redan i rutan med passet, har raden bara namnet, dagen och resultaten
// (Rimligheten 2026-10-26: gruppreflektionen stod tre gånger på veckans sida).
// En mätning med en elev i taget görs under veckan och står med veckans dagar, inte med ett datum (Rimligheten 2026-10-26:
// Högläsning i pars provtext, några elever om dagen, stod på veckans sista pass).
const uppfDagen = (x: { rad: number; datum: string; vecka: number | null }) => x.vecka === null ? kalendervecka(isoVecka(x.datum).vecka)
  : data.uppfoljning.rader[x.rad]?.perElev !== undefined && x.vecka > 0 ? esc(`${kalendervecka(isoVecka(x.datum).vecka)}, ${spannKort(mandagen(x.datum), plusDagar(mandagen(x.datum), 4))}`)
  : esc(dagText(x.datum));
// En rad i uppföljningen som är ett pass, som passet när gruppen samlas efter kursen, har passets delar att fälla ut, ur
// metodens tabell (K-553).
const uppfPasset = (rad: number) => {
  const t = data.uppfoljning.rader[rad].passet;
  if (!t?.delar?.length) return '';
  return `<details class="pl-fallut"><summary>Passets delar</summary><ul class="pl-uppf">${t.delar.map((d, _i, alla) => `<li><span class="pl-etikett">${esc(delensTidI(d.tid, alla))} · ${esc(d.fas)}</span><p>${lankad(mening(d.vad))}</p>${merText(d.mer)}</li>`).join('')}</ul><p class="pl-not">Delarna står i metodens tabell <a href="${esc(t.adress)}" ${goat('passets-tabell', 'passets tabell från uppföljningen')}>${esc(t.namn)}</a>.</p></details>`;
};
// Med tiden för gruppen när mätningen görs en elev i taget utanför passen, som under Före (Rimligheten 2026-10-27: Skrivkollen
// efter vecka 4 och 8 tar en timme med fyra elever, och det stod bara under Före).
// Uppföljningens text med tiden för gruppen, en rot för veckan och Före.
const uppfText = (rad: number) => `<p>${lankad(data.uppfoljning.rader[rad].vad)}</p>${tidForGruppen(rad) ? `<p class="pl-not">${esc(tidForGruppen(rad))}</p>` : ''}`;
const uppfRad = (x: { nyckel: string; rad: number; datum: string; vecka: number | null }, utanText = false) => `<li><span class="pl-etikett">${esc(uppfNamn(x.rad))} · ${uppfDagen(x)}</span>${utanText ? '' : `${uppfText(x.rad)}${uppfPasset(x.rad)}`}${medResultat(x.rad, x.nyckel)}</li>`;
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
  // Utvärderingen avgör om insatsen slutar, och den väntar på metodens mätning efter (Rimligheten 2026-10-26).
  const m = matningenEfter();
  const sedan = m ? `kommer ${efterVeckan(m.datum)}, och sedan utvärderar du insatsen` : 'utvärderar du insatsen';
  return `<p class="pl-paminn">${esc(plan.sistaPass === idag ? `Sista passet är i dag. Efter passet ${sedan}.` : `Det här är insatsens sista vecka. Efter sista passet, ${dagText(plan.sistaPass)}, ${sedan}.`)}${tillUtv}</p>`;
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
  sektion.innerHTML = (vy === 'efter' ? efterDelar() : vy === 'fore' ? medLektion(plan.veckor[0] ? veckansLektion(plan.veckor[0]) : 0, () => foreDelar(oppna)) : veckansDelar(plan.veckor[vy - 1], oppna)).join('');
  for (const ruta of sektion.querySelectorAll<HTMLElement>('[data-plats]')) { const el = filer.querySelector(`[data-fil="${ruta.dataset.plats}"]`); if (el) ruta.replaceWith(el); }
  sektion.hidden = false;
  sektion.dataset.vy = String(vy);
}

// Upprepa veckan finns där veckorna har var sitt innehåll: en progression i veckor eller planens pass för vissa veckor, som
// Upprepad läsnings text i veckan. Där veckorna är lika, som i Gruppstärkande aktiviteter, eller där passen följer på
// varandra, som samtalen i Kompissamtal, boken i Chambers boksamtal och serierna i Seriesamtal, finns inget att ta om
// (Rimligheten 2026-10-26).
// Metoden räknar passen i veckan när planens pass står efter sin plats i veckan, som veckans första och andra pass.
const veckansPassRaknas = (data.passen ?? []).some((x) => /^veckans (första|andra|tredje|fjärde|femte|sista|övriga)( pass)?$/i.test(x.nar.trim()));
// En rad för veckans sista pass ger det sista av veckans pass sitt innehåll, också när veckan har färre pass än metoden, så
// det som faller bort är inte det sista (Rimligheten 2026-10-27: Ordverkstads tidning låg på onsdagen när fredagen föll).
// Insatsens sista pass, "sista passet" utan vecka, är inte veckans (Codex 2026-10-27: Faktatextsamtals varning sa att
// Läspasset föll bort).
const harVeckansSista = (data.passen ?? []).some((x) => /^veckans sista|^sista passet i vecka/i.test(x.nar.trim()));
// Veckans pass N med planens namn för det, när en rad gäller veckans N:e pass i alla veckor, som "veckans andra pass, Dag 2"
// (K-580: planen sa inte vilket pass som föll bort).
function veckansPassMedNamn(n: number): string {
  const kort = (data.passen ?? []).find((x) => x.kort && new RegExp(`^veckans ${ORDNINGSTAL[n]}( pass)?$`, 'i').test(x.nar.trim()))?.kort;
  return `veckans ${ORDNINGSTAL[n]} pass${kort ? `, ${kort},` : ''}`;
}
// När veckan skattas, i en vecka som inte har börjat: efter veckans sista pass, med metodens egen mening om den finns, och
// en vecka utan pass säger det (Rimligheten 2026-10-26: "i slutet av veckan" om en onsdag, och en vecka utan pass som
// skulle skattas efter sitt sista pass).
const skattasNar = (v: PlanVecka, egenMening: boolean) => !veckansPass(plan, v).length ? 'Veckan har inga pass.'
  : egenMening ? `Veckans sista pass är ${dagText(veckansDagar(plan, v).till)}.` : `Du skattar veckan efter dess sista pass, ${dagText(veckansDagar(plan, v).till)}.`;
// En metod kan stänga av knappen (plan.utanUpprepa), som texttypskurserna med bokade besök (K-586).
const veckorAttTaOm = !data.utanUpprepa && mp.stegEnhet === 'veckor' && (mp.steg.length > 0 || (data.passen ?? []).some((p) => /^vecka\s+\d/i.test(p.nar)));
// Att justera insatsen: metodens egna sätt när metoden har dem (plan.justera), annars veckan en gång till, nivån när
// planen har nivåer och elevhälsan (de kalla testarna 2026-10-24: "byt nivå" stod också där planen inte har nivåer). Veckan
// tas om med knappen Upprepa veckan under Efter veckan, som står i varje vecka (användbarhetsprovet 2026-10-25: knappen
// fanns inte i den pågående veckan).
function justeraText() {
  const satt = data.justera?.length ? data.justera.map(mening) : [
    ...(veckorAttTaOm ? ['Ta samma vecka en gång till med knappen Upprepa veckan.'] : []),
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
// Den mest bestämda raden om passets plats i insatsen, med raderna som har samma när, och sedan raderna om metodens veckor
// och platsen i veckan, i standardens ordning (passetsVisadeRoller). En rad med samma när som en variant följer varianten.
const rollerFor = (p: Pass) => passetsVisadeRoller(plan, p, mp.passen, data.passet?.varianter).map((r) => data.passen![r]);
// Passets längd: dagens klockslag när läraren har satt dem, och annars passets längd i planen.
const passetsMinuter = (p: Pass) => { const t = passetsTid(aktiv.val, p); return t ? minuterAv(t[1]) - minuterAv(t[0]) : minuter(); };
// Passet med tidsschemats variant för passet: Läslistors vecka 1–3, Högläsning i pars visning och Upprepad läsnings pass
// på tio minuter (K-515, och riggens omgång 1 2026-10-26).
// Passets delar ur veckans sida (plan.veckansPass, K-553), när varken en rad med tabell eller en variant gäller passet:
// kursens pass N i veckans fält "Pass N". Sidan och kalendern får samma delar, eftersom båda läser passetFor.
const medVeckansPass = (p: Pass, roller: ReturnType<typeof rollerFor>) => {
  if (!data.veckansPass) return roller;
  // En variant av tidsschemat gäller passets delar, men ett fält som bara säger det som skiljer, som Sagobokens station och
  // drag i pass 7–10, gäller också under varianten (riggens leverans 2026-10-27: stationen och draget stod inte i planen).
  const iVarianten = !!variantenFor(data.passet?.varianter, passetsLage(plan, p, passetsMinuter(p)));
  const nr = kursensPassnummer(plan, mp.takt.min, p, mp.period.enhet === 'veckor' ? mp.period.max ?? mp.period.min : undefined);
  // Fältet "Dag N" på veckans sida är veckans pass N, med nyckeln vecka.N (Värdeskapande, K-576), före kursens nummer.
  const lage = passetsLage(plan, p);
  const tabell = (lage.vecka && lage.plats ? data.veckansPass[`${lage.vecka}.${lage.plats}`] : undefined) ?? (nr !== null ? data.veckansPass[String(nr)] : undefined);
  if (!tabell || (iVarianten && !tabell.skillnad)) return roller;
  // Passets slag ur fältets första mening, som "Planeringspass", är passets namn när planens rader inte ger något (K-585).
  // Utan slag och utan namn ur planens rader heter passet som fältet, "Dag 2", så att det går att öppna i veckans lista
  // (Rimligheten 2026-10-27: Värdeskapandes jakt och besöksdag i sista veckan gick inte att öppna).
  const slag = tabell.slag ? [{ nar: '', kort: tabell.slag }] : roller.some((r) => r.kort) ? [] : [{ nar: '', kort: tabell.namn.split(', ').pop() ?? '' }];
  // Ett fält som bara säger det som skiljer står överst och i passets delar, också i ett pass som planens rad leder till en
  // tabell, som Sagobokens bokpass, och leder till veckans sida (K-585).
  if (tabell.skillnad) {
    const sidan = roller.some((r) => r.tabell) ? [] : [{ nar: '', tabell: { namn: tabell.namn, adress: tabell.adress, sida: true } }];
    return [...roller, ...slag, ...sidan, ...tabell.skillnad.texter.map((t) => ({ nar: '', text: t })), ...tabell.skillnad.iDelar.map((r) => ({ nar: '', del: r.del, text: r.text })), ...tabell.skillnad.ovrigt.map((o) => ({ nar: '', text: `${o.etikett}: ${o.text}` }))];
  }
  if (roller.some((r) => r.tabell?.delar?.length)) return roller;
  return [...roller, ...slag, { nar: '', tabell }];
};
const passetFor = (p: Pass) => passetsBeskrivning(medVeckansPass(p, rollerFor(p)), data.passet, passetsLage(plan, p, passetsMinuter(p)));
const fasFran = (tid: string) => { const m = tid.match(/^(\d+)/); return m ? Number(m[1]) : null; };
// En del i passets tabell har tabellens andra kolumner, som Du säger, med sina namn (tabellensDelar).
type Mer = { etikett: string; text: string }[];
const merText = (mer?: Mer) => (mer ?? []).map((m) => `<p><span class="pl-etikett">${esc(m.etikett)}</span> ${lankad(mening(m.text))}</p>`).join('');
// Passets egna rader, överst eller i en del: rollens citat, och en rad ur metodens tabell med kolumnens namn (K-520).
const rollRader = (t: { etikett: string; text: string }[]) => t.map((x) => `<p class="pl-roll">${x.etikett ? `<span class="pl-etikett">${esc(x.etikett)}</span> ` : ''}${lankad(mening(x.text))}</p>`).join('');
const fasTill = (tid: string) => minuterISpann(tid)?.till ?? null;
const goat = (vad: string, titel: string) => `data-goatcounter-click="planera:${esc(data.id)}:${vad}" data-goatcounter-title="${esc(data.titel)}: ${esc(titel)}"`;
// Efter passet: planens rad för delen först, sedan passets eget efter ur tabellen eller veckans fält, och sist metodens
// allmänna rad (riggen 2026-10-27, K-553). En tabells egen rad och en rad med istallet står i stället för metodens, men
// veckans fält har den med, som texttypskursernas lappar (K-585). En rot för rutan och kalendern (Codex 2026-10-27:
// kalendern saknade Berättelseramens rad om de två versionerna till pass 9).
function efterPasset(b: ReturnType<typeof passetFor>): string[] {
  const allman = data.passet?.efter && (!b.egenOrdning || b.delar.length) && !b.efterIstallet && !(b.tabell?.efter && !b.tabell.sida) ? data.passet.efter : '';
  return [...(b.efterForst ?? []).map(radText), b.tabell?.efter ?? '', allman].filter(Boolean);
}
function passetsRuta(p: Pass | undefined, oppna: Set<string>, mitt = ''): string {
  const roller = p ? rollerFor(p) : [];
  const b = p ? passetFor(p) : passetsBeskrivning([], data.passet);
  const egna = b.egenOrdning;
  const delar = b.delar;
  const postRad = p ? passetsPostRad(p, oppna) : '';
  if (!delar.length && !roller.length && !postRad) return '';
  const tid = p ? passetsTid(aktiv.val, p) : undefined;
  const slut = Math.max(0, ...delar.map((d) => fasTill(d.tid) ?? 0));
  // Klockslag bara när delarna följer på varandra från minut 0; en metod som säger delarnas längd behåller dem (delarIFoljd).
  const klockslag = !!tid && slut > 0 && delarIFoljd(delar) && minuterAv(tid[1]) - minuterAv(tid[0]) === slut;
  const tidFor = (t: string) => { const f = fasFran(t); return klockslag && f !== null ? tidText(plusMinuter(tid![0], f)) : delensTidI(t, delar); };
  // En del där passets rad står i stället för delens vanliga text har inte metodens allmänna fraser (passetsBeskrivning).
  const stegFor = (d: { fas: string; istallet?: true }) => (egna || d.istallet ? undefined : data.passet?.steg?.rader.find((s) => s.namn.toLowerCase() === d.fas.toLowerCase()));
  const rad = (nyckel: string, tidtext: string, namn: string, inne: string) => `<details class="pl-del" data-ruta="del-${nyckel}"${oppna.has(`del-${nyckel}`) ? ' open' : ''}><summary><span class="pl-deltid">${esc(tidtext)}</span><span class="pl-delnamn">${esc(namn)}</span></summary><div class="pl-deltext">${inne}</div></details>`;
  const fore = [
    // Passets egen rad om förberedelsen först, som en rad med del Före passet (Bråkkursens köpta sats).
    ...(b.foreForst ? [rollRader(b.foreForst)] : []),
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
      const s = stegFor(d);
      // Fraserna kommer ur metodens exempel, med dess text, person och tal, så den första säger det en gång (Rimligheten
      // 2026-10-26: "Om du var Sam" i serier utan Sam, och Sandslottet i alla arton pass). En del fraser, som Kompissamtals
      // regler i Starta, sägs varje gång, så noten säger bara att det som hör till exemplet byts (K-596).
      const forsta = i === delar.findIndex((x) => !!stegFor(x)?.fraser.length);
      const fraser = s?.fraser.length ? `<p class="pl-etikett">${esc(data.passet!.steg!.fraserRubrik)}</p><ul class="pl-fraser">${s.fraser.map((x) => `<li>”${esc(x)}”</li>`).join('')}</ul>${forsta ? '<p class="pl-not">Fraserna är metodens förslag. Byt det som hör till metodens exempel, som namn och tal, mot det ni gör i dag.</p>' : ''}` : '';
      // Passets egen rad för delen först, och delens vanliga text efter, utom när raden står i stället för den.
      return rad(`${egna ? 'egen-' : ''}${i}`, tidFor(d.tid), d.fas, `${rollRader(d.forst ?? [])}${d.vad ? `<p>${lankad(mening(d.vad))}</p>` : ''}${merText((d as { mer?: Mer }).mer)}${rollRader(d.sist ?? [])}${fraser}`);
    }),
    // En rad utan minuter, som "Hemma, cirka 20 min": ordet före kommat i tidens spalt och resten efter delens namn.
    ...(!egna ? (data.passet?.andra ?? []).map((r, i) => { const [forst, ...rest] = r.tid.split(','); return rad(`andra-${i}`, forst.trim(), [r.fas, ...rest.map((x) => x.trim())].join(', '), `<p>${lankad(mening(r.vad))}</p>`); }) : []),
    ...((() => {
      const texter = efterPasset(b);
      return texter.length ? [rad('efter', '', 'Efter passet', texter.map((t) => `<p>${lankad(mening(t))}</p>`).join(''))] : [];
    })()),
  ];
  // I en metod som räknar passen i veckan, där planens pass står efter sin plats i veckan, säger rutan också veckans pass,
  // så att "dagens pass i veckans ram" leder till rätt kort (Rimligheten 2026-10-26: Bråkkursens pass 3 av 10 är metodens
  // pass 1 i vecka 2).
  // Rutan säger då passet som metoden: veckan och passet i veckan först, som korten "Vecka 2 · Pass 1", och planens nummer
  // sist (andra rundan av Rimligheten samma dag: "Pass 3 av 10" först ledde fortfarande till fel kort).
  const iVeckan = p && veckansPassRaknas ? passetsLage(plan, p).plats : 0;
  // Metodens vecka, som på korten, och "i metoden" när planens vecka heter något annat, efter en stege som börjar högre upp
  // eller en vecka som har tagits om.
  const pv = p ? plan.veckor[p.vecka - 1] : undefined;
  const metodens = !pv ? '' : String(planveckansNamn(plan, pv).plan) === String(pv.innehall) ? rubrikVecka(pv) : stor(metodveckan(pv.innehall));
  // Heter passet redan efter sin plats i veckan, som Värdeskapandes "Dag 1", står inte "pass 1" också (samma sak överallt
  // 2026-10-27: "Vecka 2 · pass 1 · Dag 1 · 3 av 8").
  const sammaPlats = !!b.namn && new RegExp(`^(?:dag|pass) ${iVeckan}$`, 'i').test(b.namn.trim());
  const namn = !p ? '' : iVeckan ? `<p class="pl-passnamn">${esc(metodens)}${sammaPlats ? '' : ` · pass ${iVeckan}`}${b.namn ? ` · ${esc(b.namn)}` : ''} · ${p.nr} av ${hogstaPassnr(plan)}</p>`
    : `<p class="pl-passnamn">Pass ${p.nr} av ${hogstaPassnr(plan)}${b.namn ? ` · ${esc(b.namn)}` : ''}</p>`;
  // Rollens text, och en rad ur metodens tabell med kolumnens namn som etikett (K-520).
  const roll = rollRader(b.texter);
  const tabellRad = b.tabell ? `<p class="pl-not">${b.tabell.sida ? 'Delarna står på veckans sida' : egna ? 'Delarna står i metodens tabell' : 'Passet står i metodens tabell'} <a href="${esc(b.tabell.adress)}" ${goat('passets-tabell', 'passets tabell från planen')}>${esc(b.tabell.namn)}</a>.</p>` : '';
  const rubrik = egna ? 'Passets delar' : b.rubrik ?? data.passet?.rubrik ?? 'Passets delar';
  if (!egna && data.passet?.not) rader.push(rad('mer', '', 'Mer om passet', `<p>${lankad(mening(data.passet.not))}</p>`));
  const inledning = [...(b.rubrik && b.variantText ? [b.variantText] : []), ...(!egna && data.passet?.text ? [data.passet.text] : [])].map((t) => `<p class="pl-not pl-delinledning">${lankad(mening(t))}</p>`).join('');
  // Ett pass med egen tabell som är längre än planens pass, som Kortskrivnings första pass på 25 minuter med pass på 10–15,
  // säger till, som uppföljningen i ett pass (K-585; modulens lista efter riggens leverans 2026-10-27).
  const behover = tabellensMinuter(b);
  const langre = p && behover > passetsMinuter(p) ? `<p class="pl-varning">Det här passet behöver minst ${behover} minuter, och passet är ${passetsMinuter(p)}. Boka längre tid den dagen.</p>` : '';
  // Det uppföljningen gör i passet står efter passets delar, eftersom det görs efter aktiviteten, som gruppreflektionen
  // (andra rundan av Rimligheten 2026-10-26: reflektionen och Efteråt stod före aktiviteten).
  return `${namn}${roll}${postRad}${tabellRad}${mitt}${rader.length ? `<div class="pl-delar"><p class="pl-delrubrik">${esc(stor(rubrik))}${klockslag ? ', med passets klockslag' : ''}</p>${inledning}${rader.join('')}</div>` : ''}${langre}${p ? uppfoljningIPasset(p, oppna) : ''}`;
}

// Passets post i banken, när metoden tar bankens poster i tur och ordning, en per pass (plan.enPerPass; Problemlösning:
// "Börja med metodens problem på nivån, i ordning, ett per pass"): metodens poster på planens nivå efter nummer, och passet
// har posten på samma plats som passets nummer (de kalla testarna 2026-10-26: "nästa problem" hade inget namn).
// Det metodens uppföljning gör i just det här passet, som Gruppstärkande aktiviteters gruppreflektion varannan vecka och
// Kompissamtals uppföljning efter samtal 3, står också i rutan med passet (den kalla testaren 2026-10-26: gruppreflektionen
// syntes bara under veckans uppföljning). Det som görs i varje pass står redan i passets delar.
// Det eleverna fyller i under ett pass med en egen text, som Vår grupp, står med metodens text och inte också med
// uppföljningens rad, och säger till när passet är kortare än det behöver (andra rundan av Rimligheten 2026-10-26).
const instrumentet = (rad: number) => (data.skattningar ?? []).find((x) => x.vem === 'eleverna' && x.rad === rad);
const uppfoljningenIPasset = (p: Pass) => plan.uppfoljning.filter((u) => iPassetsRuta(u.rad) && u.tillfallen.some((t) => t.datum === p.datum));
// Minuterna som passet behöver när det är längre än planens pass: ett pass med egen tabell, som Kortskrivnings första pass
// på 25 minuter med pass på 10–15, och det eleverna fyller i under passet, som Vår grupp. Rutan säger till, och
// kalenderfilen säger det i händelsen (verifieringen 2026-10-27, K-595: filen bokade 15 minuter där rutan sa 25).
// Också en variant vars delar följer på varandra och räcker längre än passet, som Gruppstärkande aktiviteters första pass
// på 20 minuter med pass på tio (Codex 2026-10-28).
const tabellensMinuter = (b: ReturnType<typeof passetFor>) => (b.egenOrdning || delarIFoljd(b.delar) ? Math.max(0, ...b.delar.map((d) => fasTill(d.tid) ?? 0)) : 0);
const passetBehover = (p: Pass) => Math.max(tabellensMinuter(passetFor(p)), ...uppfoljningenIPasset(p).map((u) => instrumentet(u.rad)?.minuter ?? 0));
const uppfoljningIPasset = (p: Pass, oppna: Set<string>) => uppfoljningenIPasset(p).map((u) => {
  const x = instrumentet(u.rad);
  const langd = passetsMinuter(p);
  const kort = x?.minuter && langd < x.minuter ? `<p class="pl-varning">Det här passet behöver minst ${x.minuter} minuter, och passet är ${langd}. Boka längre tid den dagen.</p>` : '';
  return `<p class="pl-roll"><span class="pl-etikett">${esc(uppfNamn(u.rad))}</span>${x?.text ? '' : ` ${lankad(mening(data.uppfoljning.rader[u.rad].vad))}`}</p>${kort}${elevernasKnappar(u.rad, oppna)}`;
}).join('');
type PassetsPost = { namn: string; adress: string } | { slut: string; namn: string; adress: string };
function passetsPost(p: Pass): PassetsPost | undefined {
  const b = data.bank, niva = b?.nivaer.find((n) => n.slug === aktiv.val.niva);
  if (!b?.enPerPass || !niva) return undefined;
  const poster = niva.poster.filter((x) => x.sida).sort((x, y) => x.nr - y.nr);
  const post = poster[p.nr - 1];
  return post ? { namn: `${post.titel} (${niva.namn}, ${b.en} ${post.nr})`, adress: post.sida! } : { slut: `Metodens ${b.flera} på nivån ${niva.namn} räcker till pass ${poster.length}. Ta nästa ur ${b.namn}.`, namn: b.namn, adress: `${b.adress}#${niva.slug}` };
}
function passetsPostRad(p: Pass, oppna?: Set<string>): string {
  const b = data.bank;
  if (!b?.enPerPass) return '';
  if (!aktiv.val.niva) return `<div class="pl-nivaval"><p class="pl-not">Välj gruppens nivå, så visar passet sitt ${esc(b.en)}.</p>${nivaval(b.nivaer, 'pass', oppna)}</div>`;
  const x = passetsPost(p);
  if (!x) return '';
  if ('slut' in x) return `<p class="pl-not">${esc(x.slut.slice(0, -x.namn.length - 1))}<a href="${esc(x.adress)}" ${goat('material', 'Ta fram från planen')}>${esc(x.namn)}</a>.</p>`;
  return `<p class="pl-roll"><span class="pl-etikett">Passets ${esc(b.en)}</span> <a href="${esc(x.adress)}" ${goat('passets-post', `passets ${b.en} från planen`)}>${esc(x.namn)}</a></p>`;
}

// Nivåns rad i en tabell med veckorna och nivåerna, som Talen och bladen i veckorna i De fyra räknesätten (de kalla
// testarna 2026-10-24: passets tal och veckans blad saknades i planen).
function nivansRad(v: PlanVecka, oppna?: Set<string>): string {
  const t = data.nivaTabell, nivaer = data.nivaer ?? [];
  if (!t || !nivaer.length) return '';
  const niva = nivaer.find((n) => n.slug === aktiv.val.niva);
  if (!niva) return `<div class="pl-nivaval"><p class="pl-not">Välj gruppens nivå, så visar veckan nivåns rad i ${esc(t.rubrik)}.</p>${nivaval(nivaer, 'vecka', oppna)}</div>`;
  const cell = t.veckor[String(v.innehall)]?.[niva.slug];
  if (!cell) return '';
  return `<div class="pl-nivans" style="--niva:${esc(niva.farg)}"><p class="pl-etikett"><a href="${esc(t.adress)}" ${goat('nivans-rad', 'nivåns tal från planen')}>${esc(t.rubrik)}</a> · ${esc(niva.namn)}</p>${cell.split('\n').map((x) => `<p>${lankad(mening(x))}</p>`).join('')}</div>`;
}

// Det som finns i metoden i stunden: passet på metodens sida, stödet när eleven fastnar och metodens verktyg.
// Passet i metoden leder till passets egen tabell när passet har en, som Ordverkstads skrivpass och tidningens pass
// (länkgranskningen 2026-10-27: länken ledde alltid till ordpasset).
// Passet i metoden leder dit passets delar står: passets tabell, eller veckans sida när passet har sina delar därifrån.
// Veckans sida med bara det som skiljer har tidsschemats delar, och då leder länken till tidsschemat (Rimligheten
// 2026-10-27: Berättelseramens pass 1 och Högläsning i pars möte med de yngre ledde till ett pass med andra delar).
function metodensLankar(p?: Pass): string {
  const egen = p ? passetFor(p).tabell : undefined;
  const passetsAdress = egen?.adress && (!egen.sida || egen.delar?.length) ? egen.adress : data.passet?.adress;
  const lankar: [string, string, string, boolean][] = [
    ...(passetsAdress ? [[passetsAdress, 'Passet i metoden', 'passet', false] as [string, string, string, boolean]] : []),
    ...(data.material ? [[data.material.adress, data.material.rubrik, 'materialet', false] as [string, string, string, boolean]] : []),
    ...(data.fastnar ?? []).map((f): [string, string, string, boolean] => [f.adress, f.rubrik, 'fastnar', false]),
    ...(data.centrala ?? []).map((c): [string, string, string, boolean] => [c.adress, c.namn, 'central', c.pdf]),
  ];
  return lankar.length ? `<p class="pl-lankar">${lankar.map(([a, t, vad, pdf]) => `<a href="${esc(a)}"${pdf ? ' target="_blank" rel="noopener"' : ''} ${goat(vad, `${t} från planen`)}>${esc(t)}</a>`).join('<span aria-hidden="true"> · </span>')}</p>` : '';
}

// Passet i kalenderns händelse, som i rutan: namnet, rollerna och delarna med minuter (de kalla testarna 2026-10-24:
// kalendern hade bara första meningen ur veckans fokus). Kalenderfilen skriver metodens veckor som planens.
// I en serie med veckans lektion (Codex 2026-10-27: kalendern skrev seriens allmänna pass fast veckan hade Bokstavsgympa).
const iPassetsLektion = <T>(p: Pass, gor: () => T): T => medLektion(plan.veckor[p.vecka - 1] ? veckansLektion(plan.veckor[p.vecka - 1]) : 0, gor);
const passetIKalendern = (p: Pass) => iPassetsLektion(p, () => {
  const b = passetFor(p);
  // Passets problem med adressen på en egen rad, så att ingen punkt hamnar i länken.
  const x = passetsPost(p);
  const post = x ? ['slut' in x ? x.slut : `${stor(data.bank!.en)}: ${x.namn}.`, `${location.origin}${x.adress}`] : [];
  const rader = (t: { etikett: string; text: string }[]) => t.map((r) => mening(radText(r))).join(' ');
  // Passets egna rader i en del står efter delarna med delens namn, som i rutan (passetsBeskrivning).
  const iDelarna = [...(b.foreForst ? [`${FORE_PASSET}: ${rader(b.foreForst)}`] : []), ...b.delar.filter((d) => d.forst?.length || d.sist?.length).map((d) => `${d.fas}: ${rader([...(d.forst ?? []), ...(d.sist ?? [])])}`)];
  return [[b.namn, ...b.texter.map((t) => (t.etikett ? `${t.etikett}: ${t.text}` : t.text))].filter(Boolean).map((t) => mening(t)).join(' '), ...post, b.delar.length ? `Passet: ${b.delar.map((d) => `${d.fas} ${delensTidI(d.tid, b.delar)}`).join(', ')}.` : '', ...iDelarna, efterPasset(b).length ? `Efter passet: ${efterPasset(b).map((t) => mening(t)).join(' ')}` : ''].filter(Boolean).join('\n');
});

// Före första passet: kartläggningen eller förtestet, det andra metoden gör före start och checklistan inför första passet,
// med minuterna för gruppen, principerna och gruppen (betan 2026-10-24: de kalla testarna fann det på första passets dag).
const harFore = () => uppfoljningensTillfallen(plan).some((x) => x.vecka === 0) || !!data.fore?.length || (data.forstaChecklista && data.checklista.length > 0);
const tidForGruppen = (rad: number) => {
  const per = data.uppfoljning.rader[rad]?.perElev;
  if (per === undefined) return '';
  const [a, b] = Array.isArray(per) ? per : [per, per];
  const n = harElever() ? aktiv.foljd.elever.length : 0;
  // Utan elevlista står minuterna per elev redan i raden, som "cirka tolv minuter per elev" (Rimligheten 2026-10-27).
  if (!n && /minuter per elev/i.test(data.uppfoljning.rader[rad]?.vad ?? '')) return '';
  const spann = (x: number, y: number) => (x === y ? `${x}` : `${x}–${y}`);
  return n ? `En elev i taget utanför passen, cirka ${spann(a * n, b * n)} minuter för ${n === 1 ? 'en elev' : `${n} elever`}.` : `En elev i taget utanför passen, ${spann(a, b)} minuter per elev.`;
};
// Dagen och tiden för versionens extra pass före pass 1, som "tisdag 27 oktober kl. 9.00", eller tomt (K-576).
const extraPassetsDatum = () => plan.extraDag;
function extraPassetsText(): string {
  const d = extraPassetsDatum();
  if (!d) return '';
  const t = rentaTider(aktiv.val.tider)[String(veckodag(d))];
  return `${dagText(d)}${t ? ` kl. ${tidText(t[0])}` : ''}`;
}
function foreDelar(oppna: Set<string>): string[] {
  lankVecka = plan.veckor[0]?.innehall;
  const fredag = plusDagar(plan.fore.mandag, 4);
  const meta = [kalendervecka(isoVecka(plan.fore.mandag).vecka), ...(aktiv.namn ? [aktiv.namn] : []), ...(nivaNamn() ? [nivaNamn()!] : [])];
  const delar: string[] = [`<header class="pl-veckohuvud"><h2 id="pl-veckan-rubrik" tabindex="-1">Före första passet</h2><p class="meta">${meta.map(esc).join(' · ')}</p></header>`, remsa('fore')];
  const extraDag = extraPassetsText();
  // Det extra passet bockas som veckans pass, från måndagen i dess vecka (den kalla läsaren av Berättelseramen 2026-10-27).
  const extraDatum = extraPassetsDatum();
  const extraBock = aktiv.folj && extraDatum && harBorjatVecka(mandagen(extraDatum)) ? `<p class="pl-extrabock">${bockKnapp(extraDatum, 'Det extra passet blev av')}<span>${gjort(extraDatum) ? 'Passet blev av.' : 'Bocka när passet har blivit av.'}</span></p>` : '';
  const forstaP = iDatumordning(plan.pass)[0];
  const forsta = forstaP ? `${dagText(forstaP.datum)}${passetsTid(aktiv.val, forstaP) ? ` kl. ${tidText(passetsTid(aktiv.val, forstaP)![0])}` : ''}` : '';
  // En metod vars förberedelser tar flera veckor börjar så många skolveckor före (plan.foreVeckor; Rimligheten 2026-10-26:
  // Boksamtalets läsintervjuer och böcker hann inte på en vecka).
  const veckorFore = mp.foreVeckor ?? 1;
  const nartid = idag > fredag ? `Gör det före första passet, ${forsta}.`
    : veckorFore > 1 ? `Börja senast ${talText(veckorFore)} skolveckor före första passet, ${spannKort(plan.fore.mandag, fredag)}${plan.fore.overLov ? ', med lovet oräknat' : ''}. Första passet är ${forsta}.`
    : plan.fore.overLov ? `Veckan före första passet är lov, så gör det senast veckan före lovet, ${spannKort(plan.fore.mandag, fredag)}. Första passet är ${forsta}.`
    : `Gör det senast veckan före första passet, ${spannKort(plan.fore.mandag, fredag)}. Första passet är ${forsta}.`;
  const material = [...filnamn().filter((n) => n.startsWith(aktuell ? `lektion-${aktuell.nr}-kort` : 'lektionskort')).map(plats), plats('lathund')].filter(Boolean);
  // Det extra passet före pass 1 kommer först, och på sin dag säger rutan det (verifieringen 2026-10-27: på morgonen sa
  // rutan bara att första passet var den 10 november).
  const forstaRad = extraDatum && extraDatum >= idag ? `${extraDatum === idag ? 'I dag är det' : 'Först kommer det'} extra passet, ${extraDag}. ${nartid}` : nartid;
  delar.push(`<div class="pl-nasta pl-forerutan"><p class="pl-nar">${esc(forstaRad)}</p>${material.length ? `<p class="metod-centrala">${material.join('')}</p>` : ''}${metodensLankar()}</div>`);
  const saker = [
    ...uppfoljningensTillfallen(plan).filter((x) => x.vecka === 0).map((x) => `<li><span class="pl-etikett">${esc(uppfNamn(x.rad))}</span>${uppfText(x.rad)}${medResultat(x.rad, x.nyckel)}</li>`),
    // Versionens extra pass före pass 1 står med sin dag och tid (extraPassetsDag; Rimligheten 2026-10-27: Egen ram).
    ...(extraDag ? [`<li><span class="pl-etikett">${esc(data.extraPass?.rubrik ?? 'Det extra passet')}, ${esc(extraDag)}</span>${data.extraPass?.delar?.length ? `<ul class="pl-delar">${data.extraPass.delar.map((d, _i, alla) => `<li><span class="pl-etikett">${esc(delensTidI(d.tid, alla))} ${esc(d.fas)}</span> ${lankad(mening(d.vad))}</li>`).join('')}</ul>` : ''}${extraBock}</li>`] : []),
    ...(data.fore ?? []).map((t) => `<li><p>${lankad(mening(t))}</p></li>`),
    // I en serie materialet till vecka 1:s lektion, som skrivs ut och lamineras före första passet (Rimligheten 2026-10-27).
    ...(aktuell && data.material?.text ? [`<li><span class="pl-etikett">${esc(data.material.rubrik)} till ${esc(aktuell.namn)}</span><p>${lankad(mening(data.material.text))}</p><p><a href="${esc(data.material.adress)}" ${goat('materialet', 'materialet från planen')}>${esc(data.material.rubrik)} i ${esc(aktuell.namn)}</a></p></li>`] : []),
  ];
  if (saker.length) delar.push(`<section class="pl-block"><h3>Det du gör</h3><ul class="pl-uppf">${saker.join('')}</ul></section>`);
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
  if (data.gruppen) delar.push(`<details class="pl-fallut" data-ruta="gruppen"${oppna.has('gruppen') ? ' open' : ''}><summary>${esc(data.gruppen.rubrik)}</summary><p>${lankad(mening(data.gruppen.text))}</p></details>`);
  const forstaV = plan.veckor[0];
  delar.push(`<nav class="pl-bladdra" aria-label="Bläddra mellan veckorna"><span></span><button type="button" class="knapp sekundar liten" data-till="pl-planen">Hela planen</button>${forstaV ? `<button type="button" class="knapp sekundar liten" data-vy="${forstaV.nr}">${esc(rubrikVecka(forstaV))} ›</button>` : '<span></span>'}</nav>`);
  return delar;
}

// Rutorna som ska stå öppna efter nästa ritning, fast veckan som visas byts (Efter veckan efter Upprepa veckan).
// Passet som rutan visar när läraren har valt ett annat pass i veckan än nästa.
let visatPass: number | undefined;

// ---------- Lektionerna i en serie ----------
// En serie med lektionsbank, som Ljudlek i grupp, har en enda planerare (K-551; Niclas 2026-10-26: "Ljudlek får därmed bara
// EN planerare som är samma för alla och som kan väljas lektioner i. Smidigast"). Ingången är lektionen i vecka 1, och
// läraren väljer sedan lektion vecka för vecka. Veckan visar den valda lektionens pass, mål och regel för att gå vidare,
// och efter veckan frågar planen om gruppen tar samma lektion igen eller nästa, med förslaget ifyllt. Formen valdes efter
// Opus och Sonnet samma kväll: lektionen i veckans rubrik, bytet i rutan med passet och frågan under Efter veckan.
const lektionen = (nr: number) => serien?.lektioner!.find((l) => l.nr === nr);
const nastaLektion = (nr: number) => serien?.lektioner!.find((l) => l.nr > nr);
// Veckans lektion, förmågans nummer, eller 0 när läraren inte har valt den än.
const veckansLektion = (v: PlanVecka) => (aktiv.val.lektioner ?? [])[v.nr - 1] ?? 0;
// Veckornas lektioner med namn och mål till sammanställningen, som jämför skattningar bara mot samma lektions mål.
const veckornasLektioner = () => (serien ? plan.veckor.map((v) => { const l = lektionen(veckansLektion(v)); return l ? { namn: l.namn, mal: l.mal } : null; }) : undefined);
// Byts en veckas lektion tas veckans skattning bort, eftersom den gällde den förra lektionens mål eller seriens, och Ångra tar
// tillbaka den (Codex 2026-10-27: skattningen av Bokstavsgympa stod kvar mot Räkna ljuds mål och styrde förslaget). Svaret
// säger vilket mål skattningen som togs bort gällde, eller false.
function valjLektion(vecka: number, nr: number): 'lektion' | 'serien' | false {
  const k = [...(aktiv.val.lektioner ?? [])];
  while (k.length < vecka) k.push(0);
  const forra = k[vecka - 1];
  k[vecka - 1] = nr;
  aktiv.val.lektioner = rentaLektioner(k);
  const pv = plan.veckor[vecka - 1];
  if (forra === nr || !pv || !Object.keys(aktiv.foljd.skattning[pv.mandag] ?? {}).length) return false;
  const kvar = { ...aktiv.foljd.skattning };
  delete kvar[pv.mandag];
  aktiv.foljd.skattning = kvar;
  return forra ? 'lektion' : 'serien';
}
// Det som ritas med lektionens innehåll: passet, målet, checklistan, principerna och lektionens saker, så att modulens
// vanliga delar visar lektionen. Seriens uppföljning, veckor och filer står kvar. Det som var förut kommer tillbaka efteråt.
// En vecka utan lektion ritas med seriens data, också inne i en annan veckas lektion (Codex 2026-10-27: rutan i Bokstavsgympas
// vecka visade Bokstavsgympas pass för nästa vecka, som inte hade någon lektion).
function medLektion<T>(nr: number, gor: () => T): T {
  if (!serien) return gor();
  const l = lektionen(nr);
  const forra = data, forraI = iLektion, forraL = aktuell;
  // Seriens uppföljning med lektionens rad efter sin, som ljudkollens uppgifter för lektionen var tredje vecka (Rimligheten
  // 2026-10-27: planen sa "uppgiften för gruppens förmåga" och lät läraren räkna ut vilken).
  const uppfoljning = l ? { ...serien.uppfoljning, rader: serien.uppfoljning.rader.map((r) => { const x = l.uppfoljning.find((y) => y.nar === r.nar); return x ? { ...r, vad: `${mening(r.vad)} ${l.namn}: ${mening(x.vad)}` } : r; }) } : serien.uppfoljning;
  data = l ? { ...serien, mal: l.mal, delmal: l.delmal, ...(l.malAdress ? { malAdress: l.malAdress } : {}), passet: l.passet, checklista: l.checklista, checklistaRubrik: l.checklistaRubrik, forstaChecklista: false, principer: l.principer ?? serien.principer, saker: [...l.saker, ...serien.saker], uppfoljning, ...(l.material ? { material: l.material } : {}) } : serien;
  iLektion = !!l;
  aktuell = l;
  try { return gor(); } finally { data = forra; iLektion = forraI; aktuell = forraL; }
}
// En lektion i listan att välja ur: numret, namnet och vad den tränar, och märket Förslag.
const lektionsrad = (vecka: number, l: PlanLektion, vald: boolean, forslag: boolean) => `<li><button type="button" class="pl-lektionsrad" data-valj-lektion="${vecka}|${l.nr}" aria-pressed="${vald}"><span class="pl-lektion-nr" aria-hidden="true">${l.nr}</span><span class="pl-lektion-text"><span class="pl-lektion-namn">${esc(l.namn)}${forslag ? ' <span class="pl-markering stam">Förslag</span>' : ''}</span>${l.tranar ? `<span class="pl-lektion-tranar">${esc(stor(l.tranar))}</span>` : ''}</span></button></li>`;
const lektionslista = (vecka: number, vald: number, forslag: number, oppna: Set<string>, rubrik: string) => `<details class="pl-fallut pl-lektionsval" data-ruta="lektioner-${vecka}"${oppna.has(`lektioner-${vecka}`) ? ' open' : ''}><summary>${esc(rubrik)}</summary><ol class="pl-lektioner">${serien!.lektioner!.map((l) => lektionsrad(vecka, l, l.nr === vald, l.nr === forslag)).join('')}</ol></details>`;
const lektionsknapp = (vecka: number, l: PlanLektion, text: string, primar: boolean) => `<button type="button" class="knapp ${primar ? '' : 'sekundar '}liten" data-valj-lektion="${vecka}|${l.nr}">${esc(text)}</button>`;
// Veckans skattningar mot lektionens mål, de elever som står i listan nu eller gruppens när listan är tom, som skattningen i
// veckan (Codex 2026-10-27: en elev som togs bort ur listan räknades i snittet).
const veckansVarden = (v: PlanVecka) => vem().map((e) => aktiv.foljd.skattning[v.mandag]?.[e.id]).filter((x): x is number => typeof x === 'number');
// Veckans rubrik: veckan och lektionen i en serie, och annars veckan i planen.
const veckansRubrik = (v: PlanVecka) => { const l = serien ? lektionen(veckansLektion(v)) : undefined; return l ? `${rubrikVecka(v)} · ${l.namn}` : `${rubrikVecka(v)} i planen`; };
// Vad eleverna blir bättre på i lektionens vecka, ur det lektionen tränar, överst i veckan som progressionens rad.
const lektionensRiktning = (v: PlanVecka) => { const l = serien ? lektionen(veckansLektion(v)) : undefined; return l?.tranar ? `<div class="pl-elevmal"><span class="pl-etikett">${esc(ELEVERNAS_KOLUMN)}</span><p>${lankad(mening(`Att ${l.tranar}`))}</p></div>` : ''; };
// Lektionens rader, var gruppen börjar och när ni tar nästa rad, ur lektionens tabell och upplägg. Öppna i lektionens första
// vecka, när läraren väljer raden (de kalla testarna 2026-10-27).
const lektionensRader = (l: PlanLektion, oppen: boolean, vecka: number) => (l.rader ? `<details class="pl-fallut pl-rader" data-ruta="rader-${vecka}"${oppen ? ' open' : ''}><summary>${esc(l.rader.rubrik)}</summary>${l.rader.text.map((t) => `<p>${lankad(mening(t))}</p>`).join('')}<ul class="pl-uppf">${l.rader.rader.map((r) => `<li><span class="pl-etikett">${esc(r.namn)}</span>${r.mer.map((m) => `<p>${esc(m.etikett)}: ${lankad(m.text)}</p>`).join('')}</li>`).join('')}</ul><p><a href="${esc(l.rader.adress)}" ${goat('raderna', 'lektionens rader från planen')}>${esc(l.rader.rubrik)} i ${esc(l.namn)}</a></p></details>` : '');
// Lektionen i rutan med passet: lektionen och bytet, eller frågan när veckan inte har någon lektion än.
function lektionenIRutan(v: PlanVecka, oppna: Set<string>): string {
  if (!serien) return '';
  const l = lektionen(veckansLektion(v));
  if (l) return `<p class="pl-lektionsnamn"><span class="pl-etikett">Lektion ${l.nr} av ${serien.lektioner!.length}</span> <a href="${esc(l.sida)}" ${goat('lektionen', 'lektionen från planen')}>${esc(l.namn)}</a>${l.period ? `. ${esc(stor(l.period))}.` : ''}</p>${lektionensRader(l, oppna.has(`rader-${v.nr}`) || !(v.nr > 1 && veckansLektion(plan.veckor[v.nr - 2]) === l.nr), v.nr)}${lektionslista(v.nr, l.nr, 0, oppna, 'Byt lektion för veckan')}`;
  // Den senaste veckan med lektion, också när en vecka emellan saknar lektion (den kalla testaren 2026-10-27: vecka 6 efter
  // en vecka 5 utan lektion föreslog ingångarna).
  let forra: PlanLektion | undefined;
  for (let i = v.nr - 2; i >= 0 && !forra; i--) forra = lektionen(veckansLektion(plan.veckor[i]));
  const nasta = forra ? nastaLektion(forra.nr) : undefined;
  const ingangar = !forra ? (serien.lektionsval?.ingangar ?? []).flatMap((i) => { const x = lektionen(i.lektion); return x ? [lektionsknapp(v.nr, x, `${i.namn}: ${x.namn}`, false)] : []; }) : [];
  const knappar = forra ? [lektionsknapp(v.nr, forra, `Samma: ${forra.namn}`, false), ...(nasta ? [lektionsknapp(v.nr, nasta, `Nästa: ${nasta.namn}`, false)] : [])] : ingangar;
  return `<div class="pl-lektionsfraga"><p class="pl-fraga">${v.nr === 1 ? 'Var börjar gruppen?' : `Vilken lektion tar ni ${esc(rubrikVecka(v).toLocaleLowerCase('sv'))}?`}</p>${knappar.length ? `<p class="pl-andra-knappar">${knappar.join('')}</p>` : ''}${lektionslista(v.nr, 0, 0, oppna, 'Alla lektioner')}</div>`;
}
// Efter veckan i en serie: lektionens regel för att gå vidare, snittet i veckans skattning mot lektionens mål och frågan om
// nästa vecka, med förslaget som den fyllda knappen (Niclas 2026-10-26: "Upprepa denna lektion eller välj ny för nästa
// vecka?", och "När snittet når över 4 kan man rekommendera att gå till nästa lektion").
function lektionenEfterVeckan(v: PlanVecka, oppna: Set<string>, ovrigt: string[]): string {
  const l = lektionen(veckansLektion(v));
  if (!l) return ovrigt.length ? `<section class="pl-block"><h3>Efter veckan</h3>${ovrigt.join('')}</section>` : '';
  const nasta = plan.veckor[v.nr];
  const n = nastaLektion(l.nr);
  const valdNasta = nasta ? veckansLektion(nasta) : 0;
  // Passen i följd med samma lektion, den här veckans medräknade, mot lektionens veckor räknade i metodens minsta antal pass i
  // veckan, så att planen föreslår samma lektion tills de är nådda (K-578; Niclas 2026-10-27: "ca 2 veckor i rad. Alltså ca
  // 6-10 pass (3-5 i veckan)"). Rimligheten samma dag: två juveckor med två pass var räknades som lektionens två veckor. En
  // vecka utan pass, som när alla pass är inställda, ger inga (Codex samma dag).
  const passIVeckan = (w: PlanVecka) => veckansPass(plan, w).length;
  let passen = passIVeckan(v);
  for (let i = v.nr - 2; i >= 0 && veckansLektion(plan.veckor[i]) === l.nr; i--) passen += passIVeckan(plan.veckor[i]);
  const minPass = (l.veckor?.min ?? 0) * mp.takt.min;
  const { forslag, snitt, forKort } = lektionensForslag(veckansVarden(v), l.veckor, passen / mp.takt.min);
  // Utan regel i lektionen står lektionens mål, som veckan skattas mot.
  const regel = l.vidare ? `<p class="pl-vidare">${lankad(vidareTillLektion(l.vidare, !n))}</p>` : `<p class="pl-vidare"><span class="pl-etikett">Lektionens mål</span> ${esc(malText(l.mal))}</p>`;
  // Skälet till förslaget efter varje vecka (Rimligheten 2026-10-27: efter lektionens andra vecka stod inget skäl).
  // Nästa lektion gäller när lektionens regel ovan är uppfylld, eftersom snittet inte säger vilken rad gruppen har nått
  // (Rimligheten 2026-10-27: Skriv ord tillsammans har regeln i den femte raden, och sex pass räcker inte dit).
  const skalet = !n || forKort ? '' : forslag === 'nasta' ? ` Det är över ${LEKTIONENS_GRANS}, så planen föreslår nästa lektion${l.vidare ? ' när regeln ovan är uppfylld' : ''}.` : ` Det är inte över ${LEKTIONENS_GRANS}, så planen föreslår samma lektion.`;
  const snittet = snitt !== null ? `<p>Snittet i veckans skattning mot lektionens mål är ${esc(decimal(snitt))} av 5.${skalet}</p>`
    : n && !forKort && aktiv.folj ? '<p class="pl-not">Skatta veckan mot lektionens mål, så föreslår planen samma lektion eller nästa.</p>' : '';
  // Lektionens längd, och att planen föreslår samma lektion när gruppen har haft den färre veckor än lektionen tar. Passen
  // räknas från första raden, men ljudkollen sätter ofta gruppen i en senare rad, och då gäller regeln (den stängda
  // Rimligheten 2026-10-27).
  const langd = l.period ? `<p class="pl-not">${esc(l.namn)}: ${esc(liten(l.period))}.${forKort && nasta ? ` ${passen ? `Ni har haft lektionen i ${talText(passen)} pass, och den tar minst ${talText(minPass)}${l.rader ? ' pass från lektionens första rad' : ''}` : 'Veckan hade inga pass'}, så planen föreslår samma lektion ${esc(rubrikVecka(nasta).toLocaleLowerCase('sv'))}.${l.rader && l.vidare && passen ? ' Började gruppen i en senare rad, gäller regeln ovan.' : ''}` : ''}</p>` : '';
  if (!nasta) return `<section class="pl-block pl-lektionen-efter"><h3>Efter veckan</h3>${regel}${snittet}${ovrigt.join('')}</section>`;
  // Den sista lektionen före planens sista vecka: metodens mening om att perioden slutar där (riggens leverans 2026-10-27).
  const klar = !n && serien?.lektionsval?.klar ? `<p class="pl-not">${lankad(mening(serien.lektionsval.klar))}</p>` : '';
  const knappar = [lektionsknapp(nasta.nr, l, `Upprepa ${l.namn}`, forslag === 'upprepa'), ...(n ? [lektionsknapp(nasta.nr, n, `Nästa: ${n.namn}`, forslag === 'nasta')] : [])];
  // Byts lektionen nästa vecka, står den lektionens material här, så att det hinner skrivas ut (Rimligheten 2026-10-27).
  const ny = valdNasta && valdNasta !== l.nr ? lektionen(valdNasta) : undefined;
  // Det lektionens text säger ska göras före första passet, som ljudkollens uppgift, står också här med dagen, så att det
  // hinner göras (den stängda Rimligheten 2026-10-27: uppgift 8 före Från ljud till ord syntes först i lektionens vecka).
  const forsta = ny ? veckansPass(plan, nasta)[0] : undefined;
  const foreForsta = forsta ? (ny?.rader?.text ?? []).flatMap((t) => meningarna(t)).filter((m) => /före första passet/i.test(m)) : [];
  const valt = valdNasta ? `<p class="pl-not">${esc(rubrikVecka(nasta))} tar ${esc(lektionen(valdNasta)?.namn ?? '')}.${ny?.material?.text ? ` <a href="${esc(ny.material.adress)}" ${goat('materialet', 'nästa lektions material från planen')}>${esc(ny.material.rubrik)} i ${esc(ny.namn)}</a>: ${medLektion(ny.nr, () => lankad(mening(ny.material?.text ?? '')))}` : ''}</p>${foreForsta.length && forsta ? `<p class="pl-not"><span class="pl-etikett">Före ${esc(dagText(forsta.datum))}</span> ${foreForsta.map((m) => lankad(mening(m))).join(' ')}</p>` : ''}` : '';
  return `<section class="pl-block pl-lektionen-efter"><h3>Efter veckan</h3>${regel}${snittet}${langd}${klar}<p class="pl-fraga">Upprepa lektionen eller välj ny för ${esc(rubrikVecka(nasta).toLocaleLowerCase('sv'))}?</p><p class="pl-andra-knappar">${knappar.join('')}</p>${valt}${lektionslista(nasta.nr, valdNasta, forslag === 'nasta' && n ? n.nr : 0, oppna, 'Välj en annan lektion')}${ovrigt.join('')}</section>`;
}
// Lektionerna i texten till åtgärdsprogrammet: de valda, med passens datum, och om fler väljs sedan.
function lektionernasText(): { lektioner?: { namn: string; datum: string[] }[]; lektionerSedan?: boolean } {
  if (!serien) return {};
  const grupper: { namn: string; datum: string[] }[] = [];
  let forra = 0;
  for (const v of plan.veckor) {
    const nr = veckansLektion(v);
    const l = lektionen(nr);
    const datum = veckansPass(plan, v).map((x) => x.datum);
    if (!l) { forra = 0; continue; }
    if (nr === forra && grupper.length) grupper[grupper.length - 1].datum.push(...datum);
    else grupper.push({ namn: l.namn, datum });
    forra = nr;
  }
  return { lektioner: grupper.filter((g) => g.datum.length), lektionerSedan: plan.veckor.some((v) => !lektionen(veckansLektion(v))) };
}

function veckansDelar(v: PlanVecka, oppna: Set<string>): string[] {
  return medLektion(veckansLektion(v), () => veckansInnehall(v, oppna));
}

/**
 * Passet som skulle byta plats i veckan om passet från `ursprung` flyttades till `ny`, bland passen som har varit eller är
 * bockade. Passets innehåll följer platsen i veckan, så en sådan flytt skulle skriva om vad ett hållet pass innehöll
 * (verifieringen 2026-10-28: pass 6 flyttat till måndagen, som hade varit, blev Dag 1, och tisdagens pass 5 blev Dag 2).
 */
/** Valen utan passets egen tid, för Flytta tillbaka, Vanlig tid igen och Ställ in (passtider). */
const utanEgenTid = (dag: string) => { const pt = { ...rentaPasstider(aktiv.val.passtider) }; delete pt[dag]; aktiv.val.passtider = pt; };
function rubbatPass(passen: Pass[], ursprung: string, ny: string): Pass | undefined {
  const ordning = (lista: Pass[]) => iDatumordning(lista).map((p) => p.nr);
  const fore = ordning(passen);
  const efter = ordning(passen.map((p) => (passetsDag(p) === ursprung ? { ...p, datum: ny } : p)));
  return passen.find((p) => passetsDag(p) !== ursprung && (p.datum < idag || gjort(passetsDag(p))) && fore.indexOf(p.nr) !== efter.indexOf(p.nr));
}
const rubbatText = (p: Pass) => `Pass ${p.nr} har ${gjort(passetsDag(p)) ? 'blivit av' : 'varit'}, och flytten skulle ändra vad det innehöll. Välj en annan dag, eller ställ in passet.`;

function veckansInnehall(v: PlanVecka, oppna: Set<string>): string[] {
  const rad = radFor(v);
  lankVecka = v.innehall;
  const { fran: f, till: t } = veckansDagar(plan, v);
  const meta = [spannKort(f, t), ...(aktiv.namn ? [aktiv.namn] : []), ...(nivaNamn() ? [nivaNamn()!] : [])];
  const s = sammanstallning(plan, aktiv.foljd, idag, veckornasLektioner());
  const nu = nuVy();
  const passen = veckansPass(plan, v);
  const harVarit = plusDagar(v.mandag, 6) < idag;
  // Vad eleverna blir bättre på den här veckan står överst, ur progressionens rad, som metodens fjärde kolumn (K-572, den
  // smala formen som Niclas valde 2026-10-26).
  // En vecka med pass ur två rader, som Seriesamtals pass 1 och pass 2 i vecka 1, säger raden i varje ruta (den kalla
  // testaren 2026-10-27: två rutor med samma rubrik och inget passnummer).
  const medMal = radernaI(v).filter((r) => r.eleverna);
  const elevmal = medMal.map((r) => `<div class="pl-elevmal"><span class="pl-etikett">${esc(medMal.length > 1 ? `${ELEVERNAS_KOLUMN} · ${liten(data.progression!.enhet)} ${r.vecka}` : ELEVERNAS_KOLUMN)}</span><p>${lankad(mening(r.eleverna!))}</p></div>`).join('');
  const delar: string[] = [`<header class="pl-veckohuvud"><h2 id="pl-veckan-rubrik" tabindex="-1">${esc(veckansRubrik(v))}</h2><p class="meta">${meta.map(esc).join(' · ')}</p></header>`, elevmal, lektionensRiktning(v), remsa(v.nr)];
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
    etikett = passen.length ? 'Veckans första pass' : 'Veckan';
    const forsta = iDatumordning(passen)[0];
    rutansPass = forsta;
    text = forsta ? `${stor(dagText(forsta.datum))}${klockan(forsta)}` : 'Inga pass den veckan';
  }
  const rutansVecka = rutansPass ? plan.veckor[rutansPass.vecka - 1] : v;
  const rutansRad = rutansPass && rutansPass.steg !== null && rutansPass.steg !== undefined ? data.progression?.rader[rutansPass.steg] : rad;
  const tillbaka = valt ? `<p><button type="button" class="pl-textknapp" data-visa-pass="">${nu === v.nr ? 'Till nästa pass' : 'Till veckans första pass'}</button></p>`
    : nu === 'fore' ? ''
    : nu !== v.nr ? `<p><button type="button" class="pl-textknapp" data-vy="nu">${nu === 'efter' ? 'Till Efter insatsen' : 'Till i dag'}</button></p>`
    : rutansVecka.nr !== v.nr ? `<p><button type="button" class="pl-textknapp" data-vy="${rutansVecka.nr}">Till ${esc(rubrikVecka(rutansVecka).toLocaleLowerCase('sv'))}</button></p>` : '';
  // Förra veckan utan bockar eller skattning säger till, med en väg dit (de kalla läsarna 2026-10-24: glömda veckor syntes
  // ingenstans). Förra veckan är veckan före passet i rutan, så att den på helgen är veckan som just har slutat, och den
  // heter den här veckan när det är den som står på sidan (verifieringen 2026-10-28: söndagen pekade på veckan före).
  const forraVeckan = plan.veckor[(nu === v.nr ? rutansVecka.nr : v.nr) - 2];
  const denHar = forraVeckan?.nr === v.nr;
  let paminn = '';
  if (aktiv.folj && nu === v.nr && forraVeckan && harBorjat()) {
    const obockat = veckansPass(plan, forraVeckan).filter((p) => p.datum < idag && !gjort(passetsDag(p))).length;
    // Med metodens skattning av gruppen är förra veckan skattad med krysset, i veckorna då metoden gör den (K-559).
    const gs = gruppensSkattning();
    const oskattad = gs ? skattasVeckan(gs, forraVeckan) && mattVarde(gs.namn, forraVeckan.mandag) === undefined : !Object.keys(aktiv.foljd.skattning[forraVeckan.mandag] ?? {}).length;
    const delarna = [obockat ? `${obockat === 1 ? 'ett pass' : `${obockat} pass`} som inte är ${obockat === 1 ? 'bockat' : 'bockade'}` : '', oskattad ? 'ingen skattning' : ''].filter(Boolean);
    // Med ett lov emellan heter veckan med sitt namn, så att "förra veckan" aldrig är en vecka långt tillbaka (buggjakten
    // 2026-10-25).
    const intill = forraVeckan.mandag === plusDagar(rutansVecka.mandag, -7);
    if (delarna.length && denHar) paminn = `<p class="pl-paminn pl-forra">Den här veckan har ${esc(uppraknat(delarna))}.</p>`;
    else if (delarna.length) paminn = `<p class="pl-paminn pl-forra">${esc(intill ? 'Förra veckan' : planveckansNamn(plan, forraVeckan).Text)} har ${esc(uppraknat(delarna))}. <button type="button" class="pl-textknapp" data-vy="${forraVeckan.nr}">Till ${esc(intill ? 'förra veckan' : rubrikVecka(forraVeckan).toLocaleLowerCase('sv'))}</button></p>`;
  }
  // Regeln som gällde efter förra veckans kryss står överst i rutan veckan efter (K-559; Niclas godkände formen 2026-10-26).
  // Veckan före passet som rutan visar, också när det är nästa veckas pass (Codex 2026-10-26).
  const foreRutan = plan.veckor[rutansVecka.nr - 2];
  const regel = aktiv.folj && nu === v.nr && foreRutan ? regelnEfter(foreRutan) : '';
  // Metodens vecka för passet i rutan, när ett lov eller en röd dag har flyttat kursens pass till en annan av planens veckor
  // (Rimligheten 2026-10-27: Sagobokens pass 26–27 hör till metodens vecka 9, i planens vecka 10).
  const passetsKursnr = rutansPass && data.passensVeckor ? kursensPassnummer(plan, mp.takt.min, rutansPass, mp.period.enhet === 'veckor' ? mp.period.max ?? mp.period.min : undefined) : null;
  const metodensVecka = (passetsKursnr !== null ? data.passensVeckor?.[String(passetsKursnr)] : undefined) ?? rutansVecka.innehall;
  const kursvecka = data.kursveckor?.[String(metodensVecka)];
  // Rutans material och länkar gäller rutans vecka och dess lektion, också när rutan visar nästa veckas pass (Codex
  // 2026-10-27: snabbmallen och Materialet följde den visade veckans lektion).
  const material = medLektion(veckansLektion(rutansVecka), () => [
    ...(data.bank ? [`<a class="knapp" href="${esc(data.bank.adress)}${aktiv.val.niva ? `#${esc(aktiv.val.niva)}` : ''}" ${goat('material', 'Ta fram från planen')}>${esc(data.bank.namn)}</a>`] : []),
    ...filnamn().filter((n) => n.startsWith(serien ? `lektion-${veckansLektion(rutansVecka)}-kort` : 'lektionskort')).map(plats),
    plats('lathund'),
    // Den som följer insatsen skriver veckan på sidan, så snabbmallen är material bland det andra (de kalla läsarna:
    // två ställen för veckans mening).
    ...(aktiv.folj ? [snabbmallen()] : []),
  ].filter(Boolean));
  const rutansLankar = medLektion(veckansLektion(rutansVecka), () => metodensLankar(rutansPass));
  // Hemmets del varje vecka, som läxan i De fyra räknesätten, när passets tidsschema inte redan har den (TIL:s Hemma).
  const hemma = data.hem && !data.passet?.andra.length ? `<p class="pl-hemma"><span class="pl-etikett">Hemma</span> <a href="${esc(data.hem.adress)}" ${goat('hemma', 'hemmet från planen')}>${esc(data.hem.rubrik)}</a></p><p>${lankad(mening(data.hem.text))}</p>` : '';
  // Metodens vecka för passet i rutan, som i en kurs i pass kan vara en annan än planens (Codex 2026-10-27).
  lankVecka = metodensVecka;
  // En vecka utan pass visar inte passets delar, bara varför (Rimligheten 2026-10-26: vecka 10 visade hela aktiviteten).
  const ruta = rutansPass || passen.length ? medLektion(veckansLektion(rutansVecka), () => passetsRuta(rutansPass, oppna, nivansRad(rutansVecka, oppna) + lektionenIRutan(rutansVecka, oppna))) : '';
  if (!ruta && rutansPass && !harVarit) text += `, pass ${rutansPass.nr} av ${hogstaPassnr(plan)}`;
  const veckansSida = kursvecka ? `<p class="metod-centrala"><a class="knapp" href="${esc(kursvecka)}" ${goat('kursvecka', 'veckans lektion från planen')}>${esc(stor(metodveckan(metodensVecka)))}, med veckans manus</a></p>` : '';
  delar.push(`<div class="pl-nasta${rutansPass && rutansPass.datum >= idag ? ' pl-kommer' : ''}"><span class="pl-etikett">${etikett}</span><p class="pl-nar">${esc(text)}</p>${bockatNot ? `<p class="pl-not">${esc(bockatNot)}</p>` : ''}${tillbaka}${regel}${paminn}${veckansSida}${ruta || nivansRad(rutansVecka, oppna)}${material.length ? `<p class="metod-centrala">${material.join('')}</p>` : ''}${veckansTexter(rutansRad, oppna, rutansVecka.nr !== v.nr ? rutansVecka : undefined)}${hemma}${rutansLankar}</div>`);

  lankVecka = v.innehall;
  // Veckans pass, med passets roll, bockarna när läraren följer insatsen och, med närvaron, eleverna under ett bockat pass.
  // Ett annat pass än det i rutan visas i rutan med ett tryck på rollen.
  const passrader = [
    ...passen.map((p) => {
      const dag = passetsDag(p);
      const ar = gjort(dag);
      const borta = aktiv.foljd.franvaro[dag] ?? [];
      const narvaro = aktiv.folj && ar && narvaroPa() ? `<div class="pl-narvaro" role="group" aria-label="Vilka var med i pass ${p.nr}">${aktiv.foljd.elever.filter((e) => !e.fran || p.datum >= e.fran).map((e) => { const med = !borta.includes(e.id); return `<button type="button" class="pl-chip pl-elev" data-narvaro="${esc(dag)}|${esc(e.id)}" aria-pressed="${med}" aria-label="${esc(e.namn)} ${med ? 'var med' : 'var inte med'}">${esc(e.namn)}</button>`; }).join('')}</div>` : '';
      // Veckans pass går att bocka från måndagen i passets vecka, också ett pass senare i veckan som blev av en annan dag,
      // utan att planen ändras (Niclas 2026-10-25: "Alltså från måndag 00.01 kan man bocka den veckas pass"). I en vecka som
      // inte har börjat står en streckad ring på bockens plats, så att raden ser likadan ut i alla veckor (samma natt: "Förut
      // fanns en bock för passen men nu hittar jag inte det").
      const veckanHarBorjat = harBorjatVecka(mandagen(p.datum));
      const senare = aktiv.folj && !ar && !veckanHarBorjat ? `<span class="pl-bock senare" title="Går att bocka från ${esc(dagText(mandagen(p.datum)))}"></span>` : '<span></span>';
      const bock = aktiv.folj && (veckanHarBorjat || ar) ? bockKnapp(dag, `Pass ${p.nr} blev av`) : senare;
      // Ett pass med egen tid säger det, så att läraren ser att bara det passet har den (passtider, Niclas 2026-10-28).
      const egenTid = !!passetsEgenTid(aktiv.val, p);
      const info = [passetsTidText(p), p.flyttatFran ? `Flyttat från ${dagText(p.flyttatFran)}` : egenTid ? 'Ny tid' : ''].filter(Boolean).join(' · ');
      const roll = passetFor(p).namn;
      const iRutan = rutansPass?.nr === p.nr;
      const visa = roll ? (iRutan ? `<span class="pl-passroll">${esc(roll)}</span>` : `<button type="button" class="pl-textknapp pl-passroll" data-visa-pass="${p.nr}" aria-label="Visa pass ${p.nr}, ${esc(roll)}, i rutan">${esc(roll)}</button>`) : '';
      // Ett flyttat pass som inte har blivit av går att flytta tillbaka vid passet, som ett inställt pass ångras vid sin dag
      // (verifieringen 2026-10-28: Ångra stod bara en stund i beskedet).
      // Ett pass med bara en ny tid får tillbaka veckodagens tid på samma sätt.
      const tillbaka = p.flyttatFran && !ar ? `<button type="button" class="pl-textknapp" data-tillbaka="${esc(p.flyttatFran)}">Flytta tillbaka</button>` : egenTid && !ar ? `<button type="button" class="pl-textknapp" data-vanlig-tid="${esc(dag)}">Vanlig tid igen</button>` : '';
      return { datum: p.datum, html: `<li class="${p.datum === idag ? 'idag' : ''}${ar ? ' gjort' : ''}${iRutan && roll ? ' i-rutan' : ''}"><span class="pl-dag">${esc(dagKort(p.datum))}<small>Pass ${p.nr}${p.datum === idag ? ' · i dag' : ''}</small></span><span class="pl-passinfo">${visa}${info ? `<span>${esc(info)}</span>` : ''}${tillbaka}</span>${bock}${narvaro}</li>` };
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
  // Ny dag är en skoldag i veckan från och med i dag, så att ett pass aldrig flyttas till en dag som har varit, och förslaget
  // är en dag som inte ändrar platsen för ett pass som har varit (verifieringen 2026-10-28: förslaget var måndagen, som
  // hade varit, när inget pass fanns senare i veckan).
  const nyaDagar = [0, 1, 2, 3, 4].map((i) => plusDagar(v.mandag, i)).filter((d) => d >= idag && !helgdag(d));
  // Dagen är passets egen när den inte har varit, så att det räcker att byta tiden (Niclas 2026-10-28: "Ska man inte kunna
  // byta tid också på passet om önskas?"), och annars en dag som inte ändrar platsen för ett pass som har varit.
  const forslagDag = forslagFlytta ? (nyaDagar.includes(forslagFlytta.datum) ? forslagFlytta.datum : nyaDagar.find((d) => !rubbatPass(passen, passetsDag(forslagFlytta), d))) : undefined;
  const forslagTid = forslagFlytta ? passetsTid(aktiv.val, forslagFlytta) : undefined;
  const passknappar = [
    obockade.length >= 2 ? '<button type="button" class="knapp sekundar liten" data-gor="alla">Bocka veckans pass till och med i dag</button>' : '',
    passen.length ? '<button type="button" class="knapp sekundar liten" data-gor="flytta" aria-expanded="false" aria-controls="pl-flytta">Flytta eller ställ in ett pass</button>' : '',
  ].filter(Boolean);
  const alla = passknappar.length ? `<p class="pl-andra-knappar">${passknappar.join('')}</p>` : '';
  const flyttaForm = !passen.length ? '' : `<div class="pl-flytta" id="pl-flytta" hidden><label class="pl-etikett" for="pl-flytta-pass">Passet</label><select class="pl-falt" id="pl-flytta-pass">${passen.map((p) => `<option value="${esc(passetsDag(p))}"${p.nr === forslagFlytta?.nr ? ' selected' : ''}>Pass ${p.nr}, ${esc(dagText(p.datum))}</option>`).join('')}</select>${nyaDagar.length ? `<label class="pl-etikett" for="pl-flytta-dag">Dag</label><select class="pl-falt" id="pl-flytta-dag">${nyaDagar.map((d) => `<option value="${d}"${d === forslagDag ? ' selected' : ''}>${esc(stor(dagText(d)))}</option>`).join('')}</select><fieldset class="pl-rad pl-tider pl-flytta-tid"><legend class="pl-etikett">Tid, bara för det här passet</legend><div class="pl-tidrad">${tidrad('pl-flytta-fran', 'pl-flytta-till', tidval(forslagTid?.[0], undefined, forslagTid ? null : 'Ingen tid'), slutval(forslagTid?.[0], forslagTid?.[1]), !forslagTid)}</div></fieldset>` : ''}<p class="pl-andra-knappar">${nyaDagar.length ? `<button type="button" class="knapp liten" data-gor="flytta-klar" ${goat('flytta', 'ett pass flyttat')}>Ändra passet</button>` : ''}<button type="button" class="knapp sekundar liten" data-gor="stall-in">Ställ in passet</button></p></div>`;
  // Hjälpraden står tills läraren har bockat ett första pass. I en vecka som inte har börjat säger den när passen går att
  // bocka, och den står där varje gång.
  const veckanBorjat = passen.some((p) => mandagen(p.datum) <= idag);
  // En vecka utan pass har inget att bocka (Rimligheten 2026-10-26).
  const hjalp = !aktiv.folj || !passen.length ? ''
    : !veckanBorjat ? '<p class="pl-not">Passen går att bocka när veckan har börjat.</p>'
    : !aktiv.foljd.gjorda.length ? `<p class="pl-not">Bocka passen som blev av, också ett pass som blev av en annan dag i veckan.${narvaroPa() ? ' Under ett bockat pass trycker du på den som inte var med.' : ''}</p>` : '';
  // I en metod med en egen skattning av gruppen säger tipset den (K-559).
  const egen = gruppensSkattning();
  const foljtips = !aktiv.folj && aktiv.sparad ? `<p class="pl-not pl-foljtips">${egen ? `Vill du bocka passen och skatta gruppen med ${esc(egen.namn)}?` : 'Vill du bocka passen och skatta eleverna mot målet varje vecka?'} <button type="button" class="pl-textknapp" data-gor="folj">Följ insatsen</button></p>` : '';
  // Ett pass som faller bort på en röd dag i en metod där veckans pass har var sitt innehåll tar en del av veckan med sig,
  // och planen säger det (Rimligheten 2026-10-26: Faktatextsamtals sista modellpass föll på julafton utan ett ord).
  const rod = veckansPassRaknas ? v.bortfall.find((b) => b.varfor === 'helgdag' && b.datum >= idag) : undefined;
  // Meningen säger vad som faller bort: veckans fält för passets plats i veckan, som Värdeskapandes Dag 2 med skattjakten,
  // eller planens namn för veckans pass (Codex 2026-10-27: skattjakten föll på juldagen, och planen sa bara att ett pass föll).
  // Passen som är kvar tar veckans första platser, så det som faller bort är platsen efter dem (Codex samma dag: en röd
  // måndag tar Dag 2, inte Dag 1).
  const rodPlats = rod ? passen.length + 1 : 0;
  const rodVecka = rod && passen[0] ? passetsLage(plan, passen[0]).vecka : undefined;
  const rodFalt = rodVecka ? data.veckansPass?.[`${rodVecka}.${rodPlats}`] : undefined;
  const rodNamn = rodFalt && !harVeckansSista ? `<a href="${esc(rodFalt.adress)}" ${goat('veckans-pass', 'passet som faller bort från planen')}>${esc(rodFalt.namn)}</a>` : '';
  const bortNot = rod ? `<p class="pl-not">Passet ${esc(dagText(rod.datum))} faller bort, ${esc(rod.namn ?? 'en röd dag')}${rodNamn ? `, och med det ${rodNamn}` : ''}. Veckans pass har var sitt innehåll, och planen lägger inget pass i stället, så håll det en annan dag i veckan om ni kan${plan.pass.some((x) => x.datum > rod.datum) ? ', eller ta det som föll bort i nästa pass' : ''}.</p>` : '';
  delar.push(`<section class="pl-block" id="pl-passen"><h3>Veckans pass</h3><ol class="pl-passlista">${passrader.map((x) => x.html).join('')}</ol>${bortNot}${alla}${flyttaForm}${hjalp}${foljtips}</section>`);

  // Veckans fokus ur progressionen. En rad som gäller flera veckor säger att fokus är detsamma som förra veckan (de kalla
  // testarna 2026-10-24: vecka 4 och 5 var lika utan förklaring).
  const iPass = !rad && data.progression?.enhet?.toLowerCase() === 'pass';
  const forraV = plan.veckor[v.nr - 2];
  const samma = !!forraV && !v.igen && radernaI(forraV).length > 0 && radernaI(forraV).map((r) => r.vecka).join() === radernaI(v).map((r) => r.vecka).join();
  // Veckan heter som i planen överallt, så rutan säger inte metodens vecka i en stege som börjar högre upp (Samma sak
  // överallt 2026-10-25: "Vecka 4 i metoden" stod under planens vecka 2, och planen hade en egen vecka 4).
  for (const r of radernaI(v)) delar.push(`<div class="pl-fokusruta">${iPass || r.led || r.rubrik ? `<p class="pl-led">${[iPass ? `Pass ${esc(r.vecka.replace(/^pass\s+/i, ''))}` : '', r.rubrik ? lankad(r.rubrik) : '', r.led ? lankad(r.led) : ''].filter(Boolean).join(' · ')}</p>` : ''}<span class="pl-etikett">${iPass ? 'Passens fokus' : 'Veckans fokus'}</span>${samma ? `<p class="pl-not">Samma fokus som ${esc(rubrikVecka(forraV).toLocaleLowerCase('sv'))}.</p>` : ''}<p>${lankad(mening(r.fokus))}</p><span class="pl-etikett">Det du gör</span><p>${lankad(mening(r.roll))}</p></div>`);
  // Metodens principer, hopfällda, där läraren är när något går snett (Opus 2026-10-24).
  if (data.principer) delar.push(`<details class="pl-fallut" data-ruta="principer"${oppna.has('principer') ? ' open' : ''}><summary>${esc(data.principer.rubrik)}</summary><p>${lankad(mening(data.principer.text))}</p></details>`);
  // En progression med kolumnen När är råd utan veckor (K-553; Niclas 2026-10-26 sa ja): raderna står i en ruta att fälla ut
  // i varje vecka, med det eleverna blir bättre på och när gruppen går vidare, som metodens tabell.
  if (mp.stegEnhet === 'nar' && data.progression) delar.push(`<details class="pl-fallut" data-ruta="progressionen"${oppna.has('progressionen') ? ' open' : ''}><summary>${esc(data.progression.rubrik)}</summary><ul class="pl-uppf">${data.progression.rader.map((r) => `<li><span class="pl-etikett">${esc(r.vecka)}</span><p>${lankad(mening(r.fokus))} ${lankad(mening(r.roll))}</p>${r.eleverna || r.vidare ? `<span class="pl-etikett">${esc(ELEVERNAS_KOLUMN)}</span><p>${[r.eleverna ? lankad(mening(r.eleverna)) : '', r.vidare ? lankad(vidareMening(r.vidare)) : ''].filter(Boolean).join(' ')}</p>` : ''}</li>`).join('')}</ul></details>`);
  // Metodens uppföljning den här veckan, och det som görs varje vecka eller i varje pass. När läraren följer insatsen med
  // en elevlista får varje tillfälle med datum ett fält per elev för resultatet.
  const tillfallen = uppfoljningensTillfallen(plan).filter((x) => x.vecka === v.nr);
  // Det eleverna fyller i, som Vår grupp, har sin text, sina steg och knappar också här, när rutan visar ett annat pass, så att
  // läraren ser det i förväg (verifieringen av K-559 2026-10-26).
  const iRutan = new Set(rutansPass ? [rutansPass.datum] : []);
  // En rad som står i rutan med passet och inte har resultat att föra in står inte en gång till här, och utan rader står inte
  // rubriken (verifieringen 2026-10-27: rubriken stod tom var tredje vecka på dagen för passet).
  const uppfRaderna = tillfallen.flatMap((x) => { const iRutanNu = iRutan.has(x.datum) && iPassetsRuta(x.rad); return iRutanNu && !medResultat(x.rad, x.nyckel) ? [] : [uppfRad(x, iRutanNu).replace(/<\/li>$/, `${iRutanNu ? '' : elevernasKnappar(x.rad, oppna)}</li>`)]; });
  if (uppfRaderna.length) delar.push(`<section class="pl-block"><h3>Metodens uppföljning den här veckan</h3><ul class="pl-uppf">${uppfRaderna.join('')}</ul></section>`);
  const lopande = plan.uppfoljning.filter((u) => u.typ === 'lopande');
  // Namnen som de står i metoden, efter kolon (riggens leverans 2026-10-27: "Metodens uppföljning det jag hör").
  if (lopande.length && !aktiv.folj) delar.push(`<details class="pl-fallut" data-ruta="lopande"${oppna.has('lopande') ? ' open' : ''}><summary>Metodens uppföljning: ${esc(uppraknat(lopande.map((u) => uppfNamn(u.rad))))}</summary><ul class="pl-uppf">${lopande.map((u) => `<li><p>${lankad(data.uppfoljning.rader[u.rad].vad)}</p></li>`).join('')}</ul></details>`);
  const villkor = plan.uppfoljning.filter((u) => u.typ === 'villkor' && !skattningensRader().has(u.rad));
  if (villkor.length) delar.push(`<section class="pl-block"><h3>Håll koll på</h3><ul class="pl-uppf">${villkor.map((u) => `<li><span class="pl-etikett">${esc(uppfNamn(u.rad))}</span><p>${lankad(data.uppfoljning.rader[u.rad].vad)}${dinSammanstallning(data.uppfoljning.rader[u.rad].vad)}</p></li>`).join('')}</ul></section>`);

  // Skattningen mot målet, en gång i veckan, efter veckans innehåll (de kalla testarna 2026-10-24: skattningen stod före
  // passet och fokus), och om läraren vill hur veckan gick för gruppen. Inget måste fyllas i.
  if (aktiv.folj) {
    const fragan = skattningsfragan(!harElever());
    const veckans = aktiv.foljd.skattning[v.mandag] ?? {};
    const gang = aktiv.foljd.vecka[v.mandag];
    // En vecka som inte har börjat säger när den går att skatta, i stället för skalan, om inget redan är skattat där.
    const gs = gruppensSkattning();
    const startad = harBorjatVecka(v.mandag) || Object.keys(veckans).length > 0 || !!gang || (!!gs && mattVarde(gs.namn, v.mandag) !== undefined);
    // Underlaget: metodens uppföljning varje vecka, hopfälld vid skattningen (de kalla läsarna: "jag visste inte vad
    // skattningen skulle bygga på").
    const lopandeHar = plan.uppfoljning.filter((u) => u.typ === 'lopande' && !skattningensRader().has(u.rad));
    // Metodens delmål först, när målet är metodens, och sedan metodens uppföljning varje vecka (tre kalla läsare
    // 2026-10-27: skattningen hade ingen grund). Inledningen är planens egen, eftersom metodens kan säga åt läraren att kryssa
    // före och efter perioden, som i Antalsuppfattning i grupp, och det görs inte vid veckans skattning (K-596).
    const delmal = data.delmal && aktivtMal() === data.mal ? `<p>Metodens delmål, det eleven ska kunna efter perioden:</p><ul class="pl-delmal">${data.delmal.punkter.map((x) => `<li>${lankad(stor(x))}</li>`).join('')}</ul>` : '';
    const underlag = lopandeHar.length || delmal ? `<details class="pl-fallut pl-underlag" data-ruta="underlag"${oppna.has('underlag') ? ' open' : ''}><summary>Det du bygger skattningen på</summary>${delmal}${lopandeHar.map((u) => `<p>${lankad(mening(data.uppfoljning.rader[u.rad].vad))}</p>`).join('')}</details>` : '';
    // Metodens skattning av gruppen (K-559): gruppens skala är metodens, och elevernas 1–5 mot målet står hopfällda under den,
    // så att gruppen inte skattas två gånger. En vecka utan metodens tillfälle har bara elevernas 1–5.
    // Planens skala med namnen och raderna med en skala för varje elev, eller för gruppen, en rot för båda formerna.
    // En mening om veckan, som står i sammanställningen och i texten som kopieras, i båda formerna av skattningen.
    const veckonot = `<label class="pl-etikett" for="pl-veckonot">En mening om veckan</label><input class="pl-falt pl-brett" type="text" id="pl-veckonot" maxlength="200" data-veckonot="${esc(v.mandag)}" value="${esc(gang?.not ?? '')}" /><p class="pl-hjalp">Meningen står i sammanställningen och i texten som kopieras, utan elevernas namn.</p>`;
    const skalnamnen = `<ul class="pl-skalnamn" aria-hidden="true">${SKALAN.map((x, i) => `<li><b>${i + 1}</b> ${esc(x)}</li>`).join('')}</ul>`;
    const raderna = (lista: { id: string; namn: string }[]) => `<ul class="pl-skattning">${lista.map((e) => `<li>${namnknapp('skatta', e)}${skala(`data-skatta="${esc(v.mandag)}|${esc(e.id)}" data-steg`, veckans[e.id], `${e.namn}: ${fragan}`)}${utvecklingsruta('skatta', s.elever.find((x) => x.id === e.id), s)}</li>`).join('')}</ul>`;
    if (gs) {
      const iVeckan = skattasVeckan(gs, v);
      const elevernas = harElever() ? `<details class="pl-fallut pl-elevskattning" data-ruta="elevskattning"${oppna.has('elevskattning') || Object.keys(veckans).length || !iVeckan ? ' open' : ''}><summary>${iVeckan ? 'Skatta också varje elev mot målet, om du vill' : 'Skatta varje elev mot målet, om du vill'}</summary>${malRad('veckan', false)}<p class="pl-fraga">${esc(fragan)}</p>${startad ? `${skalnamnen}${raderna(aktiv.foljd.elever)}<p class="pl-not pl-utv-tips">Tryck på ett namn, så ser du elevens utveckling.</p>` : ''}</details>` : '';
      const mening = startad ? `<details class="pl-gang" data-ruta="gang"${gang?.not || oppna.has('gang') ? ' open' : ''}><summary>En mening om veckan, om du vill</summary>${veckonot}</details>` : '';
      if (iVeckan) delar.push(skattaGruppen(gs, v, s, oppna, startad, elevernas + underlag + mening));
      else if (elevernas) delar.push(`<section class="pl-block pl-folj" id="pl-skatta"><h3>Skatta eleverna</h3>${elevernas}${underlag}</section>`);
    // I en serie skattas veckan mot lektionens mål, så en vecka utan vald lektion skattas inte (användbarheten 2026-10-27:
    // en skattning mot planens mål blev en egen lektion i sammanställningen, och lektionens skattning försvann där).
    } else if (serien && !veckansLektion(v)) delar.push(`<section class="pl-block pl-folj" id="pl-skatta"><h3>${harElever() ? 'Skatta eleverna' : 'Skatta gruppen'}</h3><p class="pl-not">Välj veckans lektion först, så skattar du ${harElever() ? 'eleverna' : 'gruppen'} mot lektionens mål.</p></section>`);
    else delar.push(`<section class="pl-block pl-folj" id="pl-skatta"><h3>${harElever() ? 'Skatta eleverna' : 'Skatta gruppen'}</h3>${malRad('veckan', false)}<p class="pl-fraga">${esc(fragan)}</p>${startad ? `${lopandeHar.length ? `<p class="pl-not">Skatta i slutet av veckan, efter det du har sett och hört i passen.</p>` : ''}${skalnamnen}
      ${raderna(vem())}
      <p class="pl-not pl-utv-tips">${harElever() ? 'Tryck på ett namn, så ser du elevens utveckling.' : 'Tryck på Gruppen, så ser du gruppens utveckling. Vill du skatta var och en? <button type="button" class="pl-textknapp" data-elevlistan>Skriv in eleverna</button>'}${harSamman(s) ? ' <button type="button" class="pl-textknapp" data-till="pl-samman">Hela gruppens sammanställning</button>' : ''}</p>${underlag}
      <details class="pl-gang" data-ruta="gang"${gang?.varde || gang?.not || oppna.has('gang') ? ' open' : ''}><summary>Hur gick veckan för gruppen, om du vill</summary><div class="pl-gangval" role="group" aria-label="Hur gick veckan för gruppen">${GANG.map((x, i) => `<button type="button" class="pl-chip" data-gang="${esc(v.mandag)}" data-varde="${i + 1}" aria-pressed="${gang?.varde === i + 1}">${x}</button>`).join('')}</div>${veckonot}</details>` : `<p class="pl-not">${esc(skattasNar(v, false))}</p>`}</section>`);
  }
  // Avstämningen mitt i insatsen: varje elevs riktning från första till senaste skattningen, och ett beslut.
  if (aktiv.folj && v.nr === s.mitt && v.nr !== plan.veckor.length) {
    const beslut = aktiv.foljd.avstamning?.beslut;
    delar.push(`<section class="pl-stam"><h3>Avstämning mitt i insatsen</h3><p>Rör sig ${harElever() ? 'eleverna' : 'gruppen'} mot målet? Jämför skattningarna${serien ? ' lektion för lektion' : ''} hittills.</p>${linjeruta(s, false)}${sammanstallningarna()}${gruppensSkattning() && !elevernaHarNagot(s) ? '' : riktningar(s, 'stam', true)}<span class="pl-etikett">Beslut</span>${beslutsknappar('avstamning')}${beslut === 'justera' ? justeraText() : ''}${meningsfalt('pl-stam-not', 'En mening om avstämningen, om du vill', 'data-beslutsnot="avstamning"', aktiv.foljd.avstamning?.not ?? '')}</section>`);
  }

  // Efter veckan: att ta veckan en gång till, med metodens grund när den har en, och snabbmallen för den som bara planerar
  // (de kalla testarna 2026-10-24: Läslistor byter lista först när paren läser orden direkt). Upprepa veckan står här i
  // alla metoder, så att knappen finns på ett ställe och inte bakom en rad som fälls ut (Niclas 2026-10-25). Lov läggs in
  // under Ändra planen, där lovveckorna väljs, och Avsluta insatsen står i raden överst.
  // En vecka tas inte om när något är infört i en vecka efter den, eftersom upprepningen flyttar fram veckorna efter och
  // det som står i dem skulle hamna under en annan vecka i metoden (Codex 2026-10-26, samma regel som lovet: lovetLast).
  const kanUpprepa = veckorAttTaOm && !harVarit && !lovetLast(plusDagar(v.mandag, 7));
  const upprepaKnapp = `<button type="button" class="knapp sekundar liten" data-gor="upprepa" ${goat('upprepa', 'veckan upprepad')}>Upprepa veckan</button>`;
  // Att ta bort en upprepning flyttar också den upprepade veckan, så det går inte när något är infört i den (Codex 2026-10-26).
  const taBort = v.igen && kanUpprepa && !lovetLast(v.mandag) ? '<button type="button" class="knapp sekundar liten" data-gor="ta-bort-upprepning">Ta bort upprepningen</button>' : '';
  // Regeln för att gå vidare står först, ur veckans rad i progressionen som metodens fjärde kolumn säger den, i den vecka där
  // den prövas (vidareProvasI), och sedan metodens regel för att ta veckan igen, så som den gäller veckan (upprepaIVeckan,
  // K-572). Annars planens mening om knappen, som i den sista raden, där beslutet efter perioden gäller.
  const vidare = radernaI(v).filter((r) => r.vidare && vidareProvasI(mp, plan, v, data.progression!.rader.indexOf(r))).map((r) => vidareMening(r.vidare!));
  const medRegler = !!data.progression?.rader.some((r) => r.vidare);
  // I planens sista vecka står inte meningarna om hur nästa vecka börjar, eftersom ingen vecka kommer efter (den stängda
  // granskningen av K-583 2026-10-27: Textsamtals vecka 8 sa "nästa veckas pass 1").
  const regeln = upprepaIVeckan(data.upprepa, medRegler, vidare.length > 0);
  const igenRegel = regeln && !regeln.hela && !plan.veckor[v.nr] ? null : regeln;
  const planens = 'Behöver gruppen mer tid tar ni samma vecka en gång till, och resten av planen flyttas fram.';
  const igen = igenRegel?.hela ? lankad(mening(igenRegel.text)) : [planens, ...(igenRegel ? [lankad(mening(igenRegel.text))] : [])].join(' ');
  const efterVeckan = [
    vidare.length ? `<p class="pl-vidare">${lankad(vidare.join(' '))}</p>` : '',
    kanUpprepa ? `<p>${igen}</p><p class="pl-andra-knappar">${upprepaKnapp}${taBort}</p>` : '',
    // Varför knappen saknas, när något är infört senare (verifieringen 2026-10-26: knappen försvann utan förklaring).
    veckorAttTaOm && !kanUpprepa && !harVarit ? '<p class="pl-hjalp">Veckan går inte att ta en gång till när du har bockat, skattat eller skrivit något i en vecka efter den, så att det står kvar under sin vecka.</p>' : '',
    snabbmallen() && !aktiv.folj ? `<p>Skriv i ${esc(snabbmallensNamn())} vad du såg och vad ni gör nästa vecka.</p><p class="metod-centrala">${snabbmallen()}</p>` : '',
  ].filter(Boolean);
  if (serien) { const e = lektionenEfterVeckan(v, oppna, efterVeckan); if (e) delar.push(e); }
  else if (efterVeckan.length) delar.push(`<section class="pl-block"><h3>Efter veckan</h3>${efterVeckan.join('')}</section>`);
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
  if (!niva) return `<div class="pl-nivaval"><p class="pl-not">Välj nivå, så visar veckan nivåns ${esc(data.bank.flera)} med ${namn.length > 1 ? 'slagen' : 'slaget'} ${esc(namn.join(', '))}.</p>${nivaval(data.bank.nivaer, 'texter', oppna)}</div>`;
  const poster = niva.poster.filter((p) => p.taggar.some((x) => rad.taggar!.includes(x)));
  if (!poster.length) return `<p class="pl-not">${rubrik}: nivån ${esc(niva.namn)} har inga ${esc(data.bank.flera)} med ${esc(namn.join(', '))}.</p>`;
  const lista = poster.map((p) => `<li><a href="${esc(data.sida)}/${esc(p.id)}">${p.nr} ${esc(p.titel)}</a><span class="pl-taggar">${esc(p.taggar.map((x) => data.bank!.taggar[x] ?? x).join(', '))}</span><a class="pl-visa" href="${esc(data.bank!.adress)}#${esc(p.id)}" data-goatcounter-click="planera:${esc(data.id)}:post" data-goatcounter-title="${esc(data.titel)}: en post från planen i Ta fram">Visa stort</a></li>`);
  return `<details class="pl-fallut pl-veckans" data-ruta="texter"${oppna.has('texter') ? ' open' : ''}><summary>${rubrik}, ${esc(niva.namn)}: ${poster.length} ${esc(poster.length === 1 ? data.bank.en : data.bank.flera)} med ${namn.length > 1 ? 'slagen' : 'slaget'} ${esc(namn.join(', '))}</summary><p class="pl-not">Välj en till varje pass, efter det du hör i gruppen.</p><ul class="pl-poster">${lista.join('')}</ul></details>`;
}

// Efter insatsen: metodens uppföljning efter, utvärderingen och vägen till sammanställningen (granskningarna 2026-10-24:
// efter sista passet visade sidan fortfarande undervisningsveckan och materialet).
function efterDelar(): string[] {
  lankVecka = undefined;
  const s = sammanstallning(plan, aktiv.foljd, idag, veckornasLektioner());
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
  const knappar = `${nuVy() !== 'efter' ? '<p><button type="button" class="pl-textknapp" data-vy="nu">Till i dag</button></p>' : ''}${aktiv.folj && slut ? '<p><button type="button" class="pl-textknapp" data-till="pl-samman">Till sammanställningen</button></p>' : ''}`;
  if ((aktiv.sparad || aktiv.franLank) && plan.pass.length > 0) {
    // Läget, när passen slutar och när planen avslutas står i raden överst, så rutan säger det läraren gör nu: uppföljningen
    // efter insatsen som gäller den här veckan eller nästa (verifieringen 2026-10-25: samma mening stod två gånger).
    if (aktuell) delar.push(`<div class="pl-nasta"><span class="pl-etikett">${aktuell === nuUppf ? 'Den här veckan' : 'Nästa uppföljning'}</span><p class="pl-nar">${esc(`${uppfNamn(aktuell.rad)}, ${kalendervecka(isoVecka(aktuell.datum).vecka)}, ${spannKort(aktuell.datum, plusDagar(aktuell.datum, 4))}`)}</p>${knappar}${metodensLankar()}</div>`);
    else if (knappar) delar.push(knappar);
  } else {
    const sista = plan.sistaPass ? (avslutad ? hurAvslutad() : `${sistaPassetText()}${plan.slut ? ` ${avslutetText(plan, !slut)}` : ''}`) : '';
    delar.push(`<div class="pl-nasta"><span class="pl-etikett">${avslutad ? 'Insatsen är avslutad' : 'Efter sista passet'}</span><p class="pl-nar">${esc(sista)}</p>${knappar}${metodensLankar()}</div>`);
  }
  // Det som kommer efter insatsen i metodens progression, som nästa period i Läslistor i grupp (de kalla testarna
  // 2026-10-24: nästa period stod som veckans fokus i vecka 8).
  const efterRad = plan.efterSteg !== undefined ? data.progression?.rader[plan.efterSteg] : undefined;
  if (efterRad) delar.push(`<div class="pl-fokusruta"><span class="pl-etikett">Efter insatsen i metoden</span><p>${lankad(mening(efterRad.fokus))}</p><p>${lankad(mening(efterRad.roll))}</p></div>`);
  if (tillfallen.length) delar.push(`<section class="pl-block"><h3>Metodens uppföljning</h3><ul class="pl-uppf">${tillfallen.map((x) => uppfRad(x)).join('')}</ul></section>`);
  // Före sista passets dag görs ingen utvärdering här. Den som avslutar insatsen tidigare väljer det sista passet i veckan,
  // och meningen här säger var den står (K-542; Niclas samma kväll: avsluta hittades "lite avigt vid utvärderingen"). Från
  // sista passets dag står utvärderingen här.
  // En utvärdering som redan är ifylld står kvar att ändra (Codex 2026-10-25: den syntes inte men följde med utskrifterna).
  // En metod som beslutar efter en mätning några veckor senare (plan.utvarderasEfter) väntar till den veckan (K-586; modulens
  // lista efter riggens leverans 2026-10-27: läraren kunde avsluta texttypskursen innan underlaget fanns).
  const vantarPa = data.utvarderasEfter !== undefined ? matningenEfter() : undefined;
  if (aktiv.folj && plan.sistaPass && (idag < plan.sistaPass || (!!vantarPa && idag < mandagen(vantarPa.datum))) && !plan.slut && !aktiv.foljd.utvardering?.beslut && !aktiv.foljd.utvardering?.not) {
    const kan = harBorjat() && plan.veckor.some((w) => slutpassI(w).length > 0);
    const m = matningenEfter();
    delar.push(`<section class="pl-stam"><h3>Utvärdering efter insatsen</h3><p>${esc(`${m ? `Utvärderingen görs när metodens uppföljning efter insatsen är gjord, ${kalendervecka(isoVecka(m.datum).vecka)}.` : `Utvärderingen görs efter sista passet, ${dagText(plan.sistaPass)}.`}${kan ? ' Ska insatsen sluta tidigare finns Avsluta insatsen överst i planen.' : ''}`)}</p></section>`);
  } else if (aktiv.folj) {
    const valt = aktiv.foljd.utvardering?.beslut;
    // Förläng insatsen förlänger planen med det läraren väljer här (granskningen: beslutet lät som en ändring men gjorde ingen).
    // Planen förlängs högst till sin största längd, så att länken alltid går att läsa (Codex 2026-10-24).
    // Förlängningen prövas och sägs med det den faktiskt ger, också när strukna veckor kommer tillbaka först (Codex 2026-10-25).
    const kan = [1, 2, 3, 4].filter((n) => forlangdaVal(mp, aktiv.val, n).langd <= LANGSTA);
    // Bestämmer versionen veckorna, som Värdeskapandes projekt, förlängs planen inte: nästa period är en ny plan
    // (användbarheten 2026-10-27: veckorna efter projektet hade inget innehåll, och sista veckans mätning flyttade med).
    // Likadant en kurs med bestämda pass på veckornas sidor och perioden i pass, som texttypskurserna, där nästa period är en
    // kurs med nästa grupp (riggens leverans samma kväll: förlängningen gav pass 13–18 utan innehåll).
    const versionensVeckor = !!bas.versionsval?.versioner.every((x) => x.veckor);
    const kursensPass = !!data.passensVeckor && mp.period.enhet === 'pass';
    const forlang = valt !== 'forlang' ? '' : versionensVeckor ? `<p class="pl-not">${esc(stor(bas.versionsval!.rubrik.toLocaleLowerCase('sv')))} bestämmer veckorna, så planen förlängs inte. Gör en ny plan för nästa period.</p>` : kursensPass ? '<p class="pl-not">Kursen har sina bestämda pass, så planen förlängs inte. Gör en ny plan för nästa period.</p>' : kan.length ?`<div class="pl-forlang"><span class="pl-etikett">Förläng planen med</span><div class="sk-segment">${kan.map((n) => `<button type="button" class="sk-antal" data-forlang="${n}">${esc(forlangText(n))}</button>`).join('')}</div></div>` : '<p class="pl-not">Planen kan inte bli längre. Gör en ny plan för fortsättningen.</p>';
    delar.push(`<section class="pl-stam"><h3>Utvärdering efter insatsen</h3>${malRad('efter')}<p>Når ${harElever() ? 'eleverna' : 'gruppen'} målet? ${jamforelsen()}</p>${linjeruta(s, false)}${sammanstallningarna()}${gruppensSkattning() && !elevernaHarNagot(s) ? '' : riktningar(s, 'efter', true)}<span class="pl-etikett">Beslut</span>${data.utvardering?.length ? `<ul class="pl-justera">${data.utvardering.map((x) => `<li>${lankad(mening(x))}</li>`).join('')}</ul>` : ''}${harElever() ? '<p class="pl-not">Beslutet gäller gruppen. Går en elev en annan väg, skriv det i meningen nedan.</p>' : ''}${beslutsknappar('utvardering')}${AVSLUTANDE.includes(valt ?? '') && avslutad ? avslutsruta() : ''}${forlang}${meningsfalt('pl-utv-not', 'En mening om utvärderingen, om du vill', 'data-beslutsnot="utvardering"', aktiv.foljd.utvardering?.not ?? '')}</section>`);
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

/**
 * Fokus på en knapp som har ritats om, utan att sidan hoppar: knappen står kvar där den stod på skärmen när läraren
 * tryckte, också när något ovanför den har ändrats (Niclas 2026-10-28, om namnen och skattningen: "Då hoppar scrollingen
 * lite som ett hack, särskilt om man trycker på dem när de är på övre delen av skärmen"). Webbläsarens egen rullning vid
 * fokus flyttade en knapp som stod delvis ovanför skärmen.
 */
function fokusPaPlats(ny: HTMLElement | null | undefined, fore: number) {
  if (!ny) return;
  ny.focus({ preventScroll: true });
  const skillnad = ny.getBoundingClientRect().top - fore;
  if (Math.abs(skillnad) >= 1) window.scrollBy(0, skillnad);
}

// Veckans knappar: bocka, alla pass, närvaro, skattning, beslut, förlänga, upprepa, lov, flytta och ställa in, och bläddra.
$('pl-veckan').addEventListener('click', (e) => {
  const knapp = (e.target as Element).closest<HTMLButtonElement>('button');
  if (!knapp) return;
  const vy = visadVy();
  const v = typeof vy === 'number' ? plan.veckor[vy - 1] : undefined;
  const plats = knapp.getBoundingClientRect().top;
  const fokus = (valjare: string) => fokusPaPlats($('pl-veckan').querySelector<HTMLElement>(valjare), plats);
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
  if (d.matt) {
    // Metodens skattning av gruppen (K-559): ett tryck på det valda steget tar bort krysset.
    const m = d.matt, namn = d.instrument ?? '';
    const varde = Number(knapp.textContent);
    andra(() => { const alla = aktiv.foljd.matt ?? {}; const vecka = { ...(alla[namn] ?? {}) }; if (vecka[m] === varde) delete vecka[m]; else vecka[m] = varde; aktiv.foljd.matt = { ...alla, [namn]: vecka }; });
    fokus(`[data-matt="${m}"][data-instrument="${CSS.escape(namn)}"][aria-label^="${varde},"]`);
    return;
  }
  if (d.gang) {
    const m = d.gang;
    const varde = Number(d.varde);
    andra(() => { const g = aktiv.foljd.vecka[m] ?? {}; aktiv.foljd.vecka = { ...aktiv.foljd.vecka, [m]: { ...g, varde: g.varde === varde ? undefined : varde } }; });
    fokus(`[data-gang="${m}"][data-varde="${varde}"]`);
    return;
  }
  if (d.valjLektion) {
    const [vecka, nr] = d.valjLektion.split('|').map(Number);
    const l = lektionen(nr), pv = plan.veckor[vecka - 1];
    let bort: ReturnType<typeof valjLektion> = false;
    andra(() => { bort = valjLektion(vecka, nr); }, () => (l && pv ? `${rubrikVecka(pv)} tar ${l.namn}.${bort ? ` Veckans skattning gällde ${bort === 'lektion' ? 'den förra lektionens mål' : 'målet för hela serien'} och är borttagen.` : ''}` : undefined), true);
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
  if (d.tillbaka) {
    const fran = d.tillbaka;
    const veckan = plan.veckor.find((x) => veckansPass(plan, x).some((p) => passetsDag(p) === fran));
    const rubbat = veckan && rubbatPass(veckansPass(plan, veckan), fran, fran);
    if (rubbat) { visaBesked(rubbatText(rubbat)); return; }
    andra(() => { const f = { ...(aktiv.val.flytta ?? {}) }; delete f[fran]; aktiv.val.flytta = f; utanEgenTid(fran); }, `Passet är tillbaka på ${dagText(fran)}.`, true);
    return;
  }
  if (d.vanligTid) { const dag = d.vanligTid; andra(() => utanEgenTid(dag), 'Passet har veckodagens tid igen.', true); return; }
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
    if (gor === 'stall-in') { andra(() => { const f = { ...(aktiv.val.flytta ?? {}) }; delete f[ursprung]; aktiv.val.flytta = f; utanEgenTid(ursprung); aktiv.val.stryk = [...new Set([...(aktiv.val.stryk ?? []), ursprung])]; }, 'Passet är inställt.', true); return; }
    const ny = $<HTMLInputElement>('pl-flytta-dag').value;
    if (!arDatum(ny)) { visaBesked('Välj den nya dagen.'); return; }
    // Passet flyttas inom sin vecka, så att veckans innehåll och numren står kvar (fältets gränser går att skriva förbi).
    if (ny < v.mandag || ny > plusDagar(v.mandag, 6)) { visaBesked(`Välj en dag i samma vecka, ${spannKort(v.mandag, plusDagar(v.mandag, 4))}.`); return; }
    if (veckodag(ny) > 5 || helgdag(ny)) { visaBesked('Den dagen har skolan stängt. Välj en annan dag.'); return; }
    if (ny < idag && ny !== ursprung) { visaBesked('Den dagen har varit. Bocka passet om det blev av, eller välj en senare dag.'); return; }
    const rubbat = rubbatPass(veckansPass(plan, v), ursprung, ny);
    if (rubbat) { visaBesked(rubbatText(rubbat)); return; }
    // Tiden gäller bara det här passet (passtider, Niclas 2026-10-28: "Viktigt att det bara blir det pass man ändrar"). En tid
    // som är veckodagens sparas inte, så att passet följer veckodagen när den ändras.
    const pass = veckansPass(plan, v).find((p) => passetsDag(p) === ursprung);
    const fran = $<HTMLSelectElement>('pl-flytta-fran').value, till = $<HTMLSelectElement>('pl-flytta-till').value;
    const veckodagens = rentaTider(aktiv.val.tider)[String(veckodag(ursprung))];
    const vald: [string, string] | undefined = fran && till && till > fran ? [fran, till] : undefined;
    const egen = vald && vald.join() !== veckodagens?.join() ? vald : undefined;
    const tidNu = pass ? passetsEgenTid(aktiv.val, pass) : undefined;
    const nyDag = ny !== (pass?.datum ?? ursprung), nyTid = egen?.join() !== tidNu?.join();
    if (!nyDag && !nyTid) { visaBesked('Välj en annan dag eller en annan tid för passet.'); return; }
    const klockan = vald ? ` kl. ${tidsspann(vald)}` : '';
    andra(() => {
      aktiv.val.flytta = { ...(aktiv.val.flytta ?? {}), [ursprung]: ny };
      if (ny === ursprung) delete aktiv.val.flytta![ursprung];
      if (egen && pass) aktiv.val.passtider = { ...rentaPasstider(aktiv.val.passtider), [ursprung]: [...egen, pass.nr] }; else utanEgenTid(ursprung);
    }, nyDag ? `Passet flyttas till ${dagText(ny)}${klockan}.` : egen ? `Passet är nu${klockan}, bara den dagen.` : 'Passet har veckodagens tid igen.', true);
  }
});
// Fälten i veckan: det läraren skriver står i planen direkt och sparas en stund efter sista tangenten, utan att veckan
// ritas om, så att ett fält till i samma stund inte tappar det första (Codex 2026-10-24).
let faltTimer = 0;
$('pl-veckan').addEventListener('change', (e) => {
  const falt = e.target;
  if (falt instanceof HTMLSelectElement && falt.hasAttribute('data-borja')) { valjBorja(falt); document.getElementById('pl-borja-fore')?.focus({ preventScroll: true }); }
  // Flytta ett pass: dagen och tiden följer passet som väljs, och slutet följer början med passets längd.
  if (falt instanceof HTMLSelectElement && (falt.id === 'pl-flytta-pass' || falt.id === 'pl-flytta-fran')) {
    const pass = plan.pass.find((p) => passetsDag(p) === $<HTMLSelectElement>('pl-flytta-pass').value);
    const franFalt = document.getElementById('pl-flytta-fran') as HTMLSelectElement | null, tillFalt = document.getElementById('pl-flytta-till') as HTMLSelectElement | null;
    // En vecka som har varit har inga tidsfält, bara Ställ in (Codex 2026-10-28).
    if (!franFalt || !tillFalt) return;
    if (falt.id === 'pl-flytta-pass') {
      const t = pass ? passetsTid(aktiv.val, pass) : undefined;
      franFalt.innerHTML = tidval(t?.[0], undefined, t ? null : 'Ingen tid');
      tillFalt.innerHTML = slutval(t?.[0], t?.[1]);
      tillFalt.disabled = !t;
      const dagFalt = document.getElementById('pl-flytta-dag') as HTMLSelectElement | null;
      if (dagFalt && pass && [...dagFalt.options].some((o) => o.value === pass.datum)) dagFalt.value = pass.datum;
    } else {
      const fran = franFalt.value;
      tillFalt.innerHTML = slutval(fran || undefined, fran ? plusMinuter(fran, pass ? passetsMinuter(pass) : minuter()) : undefined);
      tillFalt.disabled = !fran;
    }
  }
  // En sparad länk ger knappen i passet när läraren lämnar fältet (K-559).
  if (falt instanceof HTMLInputElement && falt.dataset.lank) { window.clearTimeout(faltTimer); faltTimer = 0; sparaTyst(); renderaVeckan(); }
});
$('pl-veckan').addEventListener('input', (e) => {
  const falt = e.target as HTMLInputElement;
  const text = falt.value.trim();
  if (falt.dataset.resultat) {
    const [nyckel, id] = falt.dataset.resultat.split('|');
    aktiv.foljd.resultat = { ...aktiv.foljd.resultat, [nyckel]: { ...(aktiv.foljd.resultat[nyckel] ?? {}), [id]: text.slice(0, RESULTATETS_LANGD) } };
    lasBorja();
    lasVersion();
  } else if (falt.dataset.veckonot) {
    const m = falt.dataset.veckonot;
    aktiv.foljd.vecka = { ...aktiv.foljd.vecka, [m]: { ...(aktiv.foljd.vecka[m] ?? {}), not: text.slice(0, 200) } };
    lasVersion();
  } else if (falt.dataset.lank) {
    // Lärarens länkar till sitt formulär och sin sammanställning (K-559): bara en länk som börjar med https sparas.
    const namn = falt.dataset.instrument ?? '', slag = falt.dataset.lank as 'formular' | 'sammanstallning';
    const alla = aktiv.foljd.lankar ?? {};
    const l = { ...(alla[namn] ?? {}) };
    const lank = rensadLank(text);
    if (lank) l[slag] = lank; else delete l[slag];
    aktiv.foljd.lankar = { ...alla, [namn]: l };
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
// Metodens namn med versionen i planens val, som "Skrivkurs: värdeskapande skrivande, Guideboken", på ett ställe för
// sammanställningen, pdf:erna, kalendern och texten till åtgärdsprogrammet (K-576; Codex 2026-10-27: projektet stod bara i
// texten till åtgärdsprogrammet).
const metodensNamn = () => (bas.versionsval ? `${data.titel}, ${(bas.versionsval.versioner.find((x) => x.slug === aktiv.val.version) ?? bas.versionsval.versioner[0]).namn}` : data.titel);
const info = () => ({ titel: metodensNamn(), mal: aktivtMal(), uppfoljning: data.uppfoljning.rader });
let senaste: Sammanstallning = sammanstallning(plan, aktiv.foljd, idag, veckornasLektioner());
// Pdf:ens underlag: Innehållet i insatsen har metodens ingress i gruppens pdf och undertiteln i elevens, och raderna ur
// texten till åtgärdsprogrammet (Niclas 2026-10-28: "Ha en rubrik om Innehållet i insatsen med en text från ingress eller
// metoden").
const pdfInfo = () => ({ metod: metodensNamn(), grupp: aktiv.namn || undefined, niva: nivaNamn(), mal: malText(aktivtMal()), fragan: skattningsfragan(!harElever()), uppfoljning: data.uppfoljning.rader, ingress: data.ingress, undertitel: data.undertitel, insatsen: dokumentationsrader(...atgardsunderlag()) });
// En knapp som ger en pdf heter Skriv ut där webbläsaren kan skriva ut den direkt, och annars "som pdf", som
// utskriftsknapparna på resten av sajten (SkrivUtPdf.astro).
const pdfOrd = (vad: string) => (kanSkrivaUtPdf() ? `Skriv ut ${vad}` : `${stor(vad)} som pdf`);
const narvaroFor = (e: SammanstallningElev, s: Sammanstallning) => passensNarvaro(s, e, aktiv.foljd.franvaro);

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

// ---------- Metodens egna skattningar (K-559) ----------
// En metod med ett eget instrument gör det i planen med metodens skala och vid metodens tillfällen (plan.skattningar i
// metodens fil; REGLER.md i standarden under Metodens egna skattningar). Skattningen av gruppen står vid Skatta gruppen i
// stället för planens skattning av gruppen, med linjen och metodens regler, och det eleverna fyller i, som bladet Vår grupp,
// står i passet där metoden gör det, med bladet, formuläret och lärarens sammanställning.
const gruppensSkattning = (): (PlanSkattning & { skala: Skala }) | undefined => data.skattningar?.find((x): x is PlanSkattning & { skala: Skala } => x.vem === 'gruppen' && !!x.skala);
const skattasVeckan = (x: PlanSkattning, v: PlanVecka) => { const u = plan.uppfoljning.find((y) => y.rad === x.rad); return !!u && (u.typ === 'lopande' || u.tillfallen.some((t) => t.vecka === v.nr)); };
const mattVarde = (namn: string, mandag: string) => aktiv.foljd.matt?.[namn]?.[mandag];
// Raderna som skattningen av gruppen visar själv, när läraren följer insatsen: dess egen rad och reglerna, som annars står
// under Håll koll på.
const skattningensRader = () => { const g = aktiv.folj ? gruppensSkattning() : undefined; return new Set(g ? [g.rad, ...g.regler.map((r) => r.rad)] : []); };
// Regeln som gäller efter en veckas kryss, den första i metodens ordning, med uppföljningens rad som säger vad läraren gör.
function regelnEfter(v: PlanVecka): string {
  const g = gruppensSkattning();
  if (!g) return '';
  const i = plan.veckor.indexOf(v);
  const r = i >= 0 ? linjen(plan, aktiv.foljd, g).galler[i]?.[0] : undefined;
  if (r === undefined) return '';
  const rad = g.regler[r].rad;
  return `<p class="pl-paminn pl-regel"><b>${esc(mening(uppfNamn(rad)))}</b> ${lankad(mening(data.uppfoljning.rader[rad].vad))}${dinSammanstallning(data.uppfoljning.rader[rad].vad)}</p>`;
}
// Linjen i metodens skattning av gruppen: kryss vecka för vecka på metodens skala, reglernas gränser streckade, och i veckan
// platsen för veckan som kommer som en streckad ring (Niclas godkände formen 2026-10-26). Under krysset står veckan i
// planen och kalenderveckan, som under staplarna.
function linjegraf(g: PlanSkattning & { skala: Skala }, varden: (number | undefined)[], etiketter: Veckonamn[], o: { ring?: number; mitt?: number | null } = {}) {
  const { fran, till } = g.skala;
  const steg = 36, x0 = 26, topp = o.mitt ? 34 : 14, h = 120, under = 38, bredd = x0 + varden.length * steg + 4;
  const y = (n: number) => topp + h - ((n - fran) / (till - fran)) * h;
  const granser = skattningensGranser(g);
  const axlar = [...new Set([fran, ...granser, till])].sort((a, b) => a - b).map((n) => `<line x1="${x0 - 4}" x2="${bredd}" y1="${y(n)}" y2="${y(n)}" class="pl-linje${granser.includes(n) ? ' pl-grans' : ''}"/><text x="4" y="${y(n) + 4}" class="pl-axel">${n}</text>`).join('');
  const x = (i: number) => x0 + i * steg + steg / 2;
  const punkter = varden.flatMap((n, i) => (n === undefined ? [] : [[x(i), y(n), n] as const]));
  // Linjen bryts vid en vecka utan kryss, som reglerna, där en vecka utan kryss bryter följden (verifieringen av K-559
  // 2026-10-26: linjen gick förbi en vecka utan skattning, men ingen regel kom).
  const delar: string[][] = [[]];
  varden.forEach((n, i) => { if (n === undefined) { if (delar[delar.length - 1].length) delar.push([]); } else delar[delar.length - 1].push(`${x(i)},${y(n)}`); });
  const banan = delar.filter((d) => d.length > 1).map((d) => `<polyline points="${d.join(' ')}" class="pl-linjen"/>`).join('');
  const kryss = punkter.map(([a, b, n]) => `<circle cx="${a}" cy="${b}" r="5" class="pl-punkt"/><text x="${a}" y="${b - 9}" class="pl-stapelvarde">${n}</text>`).join('');
  const ring = o.ring !== undefined ? `<circle cx="${x(o.ring)}" cy="${topp + h / 2}" r="6" class="pl-ring"/>` : '';
  const etikett = etiketter.map((e, i) => `<text x="${x(i)}" y="${topp + h + 14}" class="pl-stapeletikett pl-planveckan">${esc(e.kort)}</text><text x="${x(i)}" y="${topp + h + 26}" class="pl-stapeletikett">${esc(e.kalender)}</text>`).join('');
  const mitt = o.mitt ? `<rect x="${x0 + (o.mitt - 1) * steg + 1}" y="${topp - 26}" width="${steg - 2}" height="${h + 26}" rx="3" class="pl-mittfalt"/><text x="${x(o.mitt - 1)}" y="${topp - 16}" class="pl-axel pl-mitttext">Mitt i</text>` : '';
  const text = punkter.length ? varden.flatMap((n, i) => (n === undefined ? [] : [`${etiketter[i].text}: ${n}`])).join(', ') : 'inte skattad än';
  return `<svg class="pl-graf stor pl-linjegraf" viewBox="0 0 ${bredd} ${topp + h + under}" width="${bredd}" height="${topp + h + under}" role="img" aria-label="${esc(`${g.namn}, ${fran} till ${till}: ${text}`)}">${mitt}${axlar}${banan}${kryss}${ring}${etikett}</svg>`;
}
// Skatta gruppen med metodens skala (K-559): instrumentets rad med namnet som länk, metodens text, stegen med namnen,
// regeln som gäller efter veckans kryss, linjen och reglerna under Vad linjen säger.
function skattaGruppen(g: PlanSkattning & { skala: Skala }, v: PlanVecka, s: Sammanstallning, oppna: Set<string>, startad: boolean, under: string) {
  const i = plan.veckor.indexOf(v);
  const sk = s.skattningar.find((x) => x.namn === g.namn);
  const varde = mattVarde(g.namn, v.mandag);
  const stegen = Array.from({ length: g.skala.till - g.skala.fran + 1 }, (_, k) => g.skala.fran + k);
  const knappar = `<div class="pl-skala${stegen.length > 6 ? ' pl-skala-lang' : ''}" role="group" aria-label="${esc(`${g.namn}, ${g.skala.fran} till ${g.skala.till}`)}">${stegen.map((n) => `<button type="button" class="pl-skalsteg" data-matt="${esc(v.mandag)}" data-instrument="${esc(g.namn)}" aria-pressed="${varde === n}" aria-label="${n}, ${esc(stegetsNamn(g.skala, n).toLocaleLowerCase('sv'))}">${n}</button>`).join('')}</div>`;
  const namnen = `<ul class="pl-skalnamn" aria-hidden="true">${g.skala.steg.map((x) => `<li><b>${stegetsSpann(x)}</b> ${esc(x.namn)}</li>`).join('')}</ul>`;
  // Hur gruppen ser ut vid varje steg, ur metodens tabell, som fälls ut (den kalla testaren av K-559 2026-10-26).
  const beskrivning = g.skala.steg.some((x) => x.text) ? `<details class="pl-fallut" data-ruta="skalan"${oppna.has('skalan') ? ' open' : ''}><summary>Så ser gruppen ut vid varje steg</summary><ul class="pl-uppf">${[...g.skala.steg].reverse().map((x) => `<li><span class="pl-etikett">${esc(`${stegetsSpann(x)} · ${x.namn}`)}</span>${x.text ? `<p>${lankad(x.text)}</p>` : ''}</li>`).join('')}</ul></details>` : '';
  const grafen = sk?.varden.some((x) => x !== undefined) ? `<div class="pl-grafruta">${linjegraf(g, sk.varden, s.veckor.map(veckansNamn), { ring: varde === undefined && i >= 0 ? i : undefined, mitt: s.mitt })}</div>` : '<p class="pl-not">Linjen kommer med det första krysset.</p>';
  const reglerna = g.regler.length ? `<details class="pl-fallut" data-ruta="linjen"${oppna.has('linjen') ? ' open' : ''}><summary>Vad linjen säger</summary><p class="pl-hjalp">Veckorna räknas i följd, och en vecka utan kryss bryter följden.</p><ul class="pl-uppf">${g.regler.map((r) => `<li><span class="pl-etikett">${esc(uppfNamn(r.rad))}</span><p>${lankad(mening(data.uppfoljning.rader[r.rad].vad))}${dinSammanstallning(data.uppfoljning.rader[r.rad].vad)}</p></li>`).join('')}</ul></details>` : '';
  const samman = harSamman(s) ? '<p class="pl-not"><button type="button" class="pl-textknapp" data-till="pl-samman">Hela gruppens sammanställning</button></p>' : '';
  return `<section class="pl-block pl-folj" id="pl-skatta"><h3>Skatta gruppen</h3><p class="pl-etikett">${lankad(uppfNamn(g.rad))}</p>${g.text ? `<p class="pl-fraga">${lankad(g.text)}</p>` : ''}${startad ? `${knappar}${namnen}${beskrivning}${varde !== undefined ? regelnEfter(v) : ''}${grafen}${reglerna}` : `<p class="pl-not">${esc(skattasNar(v, !!g.text))}</p>`}${samman}${under}</section>`;
}
// Linjen med texten om den, som sammanställningen, avstämningen och utvärderingen visar: värdena och reglerna som gällde,
// med standardens ord (skattningensText).
function linjeruta(s: Sammanstallning, medRegler = true) {
  const g = gruppensSkattning(), sk = g ? s.skattningar.find((x) => x.namn === g.namn) : undefined;
  if (!g || !sk || !sk.varden.some((x) => x !== undefined)) return '';
  const t = skattningensText(s, sk, info());
  return `<div class="pl-grafruta">${linjegraf(g, sk.varden, s.veckor.map(veckansNamn), { mitt: s.mitt })}</div>${medRegler && t.regler.length ? `<p class="pl-not">Det linjen sa: ${esc(t.regler.join('; '))}.</p>` : ''}`;
}
// Det eleverna fyller i, som bladet Vår grupp, i passet där metoden gör det: bladet, formuläret och lärarens
// sammanställning (K-559). Länkarna till lärarens egen kopia sparas bara i den här webbläsaren och i planens fil, och de står
// inte i länken till planen, i utskrifterna eller i texten som kopieras.
function elevernasKnappar(rad: number, oppna: Set<string>) {
  const i = (data.skattningar ?? []).findIndex((x) => x.vem === 'eleverna' && x.rad === rad);
  if (i < 0) return '';
  const x = data.skattningar![i];
  const l = aktiv.foljd.lankar?.[x.namn] ?? {};
  const knappar = [
    x.pdf ? `<a class="knapp sekundar liten" href="${esc(x.pdf)}" target="_blank" rel="noopener" ${goat('skattning-blad', `${x.namn}, bladet från planen`)}>Bladet ${esc(x.namn)}</a>` : '',
    l.formular ? `<a class="knapp sekundar liten" href="${esc(l.formular)}" target="_blank" rel="noopener">Ditt formulär</a>`
      : x.formular ? `<a class="knapp sekundar liten" href="${esc(x.formular)}" target="_blank" rel="noopener" ${goat('skattning-formular', `${x.namn}, formuläret kopierat från planen`)}>Kopiera formuläret</a>` : '',
    l.sammanstallning ? `<a class="knapp sekundar liten" href="${esc(l.sammanstallning)}" target="_blank" rel="noopener">Din sammanställning</a>` : '',
  ].filter(Boolean).join('');
  const har = !!(l.formular || l.sammanstallning);
  // Metodens text om när och hur länge, och stegen ur metodens ram, i passet där det görs (den kalla testaren av K-559
  // 2026-10-26: gruppreflektionen hade ingen tid och inga steg i planen).
  const text = x.text ? `<p>${lankad(x.text)}</p>` : '';
  const steg = x.delar?.length ? `<details class="pl-fallut" data-ruta="instrument-${i}"${oppna.has(`instrument-${i}`) ? ' open' : ''}><summary>${esc(x.delar[0].rubrik)}</summary>${x.delar.map((g, j) => `${j ? `<p class="pl-etikett">${esc(g.rubrik)}</p>` : ''}<ul class="pl-uppf">${g.falt.map((f) => `<li><span class="pl-etikett">${esc(f.rubrik)}</span><p>${lankad(f.text)}</p></li>`).join('')}</ul>`).join('')}</details>` : '';
  const forklaring = !l.formular && x.formular ? `<p class="pl-hjalp">${esc(formularetText(x.namn))}</p>` : '';
  const falt = aktiv.sparad ? `<details class="pl-fallut pl-lankar" data-ruta="lankar-${i}"${oppna.has(`lankar-${i}`) ? ' open' : ''}><summary>${har ? 'Dina länkar' : 'Har du kopierat formuläret? Spara dina länkar här'}</summary><label class="pl-etikett" for="pl-lank-${i}-formular">Länken till ditt formulär</label><input class="pl-falt pl-brett" type="url" inputmode="url" id="pl-lank-${i}-formular" data-lank="formular" data-instrument="${esc(x.namn)}" value="${esc(l.formular ?? '')}" placeholder="https://docs.google.com/forms/…" /><label class="pl-etikett" for="pl-lank-${i}-samman">Länken till din sammanställning</label><input class="pl-falt pl-brett" type="url" inputmode="url" id="pl-lank-${i}-samman" data-lank="sammanstallning" data-instrument="${esc(x.namn)}" value="${esc(l.sammanstallning ?? '')}" placeholder="https://docs.google.com/spreadsheets/…" /><p class="pl-hjalp">Länkarna sparas bara i den här webbläsaren och i planens fil. De står inte i länken till planen, i utskrifterna eller i texten som kopieras.</p></details>` : '';
  return `${text}${steg}${knappar ? `<p class="pl-andra-knappar">${knappar}</p>` : ''}${forklaring}${falt}`;
}
// Lärarens sammanställning av det eleverna har fyllt i, där en text bygger på det, som Kort med beröring och regeln om 7
// eller mer, som också säger Vår grupp (Niclas godkände formen 2026-10-26: Din sammanställning där linjen inte räcker).
const sparadSammanstallning = (x: PlanSkattning) => aktiv.foljd.lankar?.[x.namn]?.sammanstallning;
const dinSammanstallning = (text: string) => (data.skattningar ?? []).filter((x) => x.vem === 'eleverna' && sparadSammanstallning(x) && text.toLocaleLowerCase('sv').includes(x.namn.toLocaleLowerCase('sv'))).map((x) => ` <a class="pl-textknapp" href="${esc(sparadSammanstallning(x)!)}" target="_blank" rel="noopener">Din sammanställning för ${esc(x.namn)}</a>`).join('');
// I avstämningen och utvärderingen står lärarens sammanställningar av det eleverna har fyllt i.
const sammanstallningarna = () => (data.skattningar ?? []).filter((x) => x.vem === 'eleverna' && sparadSammanstallning(x)).map((x) => `<p class="pl-not">${esc(x.namn)}: <a class="pl-textknapp" href="${esc(sparadSammanstallning(x)!)}" target="_blank" rel="noopener">Din sammanställning</a></p>`).join('');
// I en metod med en skattning av gruppen står eleverna i avstämningen, utvärderingen och sammanställningen när någon elev
// är skattad eller har ett resultat (den kalla testaren av K-559 2026-10-26: 22 rader "Inte skattad än").
const elevernaHarNagot = (s: Sammanstallning) => s.elever.some((e) => e.id !== GRUPPEN && elevenHarNagot(s, e));

// Sammanställningen står så snart något är ifyllt, och går att nå från veckan (Niclas 2026-10-24: "både sammanställning av
// alla elever i gruppen och en elev när som").
const ifyllt = (s: Sammanstallning) => s.gjorda > 0 || s.skattningar.some((x) => x.varden.some((y) => y !== undefined)) || s.elever.some((e) => e.skattningar.length) || s.veckor.some((v) => v.skattning || v.not) || Object.keys(aktiv.foljd.resultat).length > 0 || !!(s.avstamning?.beslut || s.avstamning?.not || s.utvardering?.beslut || s.utvardering?.not);
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
  return `${medRiktning ? `<p class="pl-riktning${r ? ` ${r}` : ''}">${r ? `<span aria-hidden="true">${PIL[r]} </span>` : ''}${esc(stor(riktningText(e)))}</p>` : ''}<div class="pl-grafruta">${graf(varden, s.veckor.map(veckansNamn), { stor: true, mitt: s.mitt, pass: prickar ? narvaroFor(e, s) : undefined, namn: e.namn })}</div>${prickar ? `<p class="pl-not">${esc(prickarnasText(e))}</p>` : ''}${mittvarde ? `<p>Vid avstämningen mitt i: ${mittvarde.varde}, ${esc(SKALAN[mittvarde.varde - 1].toLocaleLowerCase('sv'))}.</p>` : ''}${narvaro}${res ? `<ul class="pl-res">${res}</ul>` : ''}${knappar}`;
}

function renderaSamman() {
  const ruta = $('pl-samman');
  senaste = sammanstallning(plan, aktiv.foljd, idag, veckornasLektioner());
  const s = senaste;
  if (!harSamman(s)) { ruta.hidden = true; ruta.innerHTML = ''; return; }
  const oppna = new Set([...ruta.querySelectorAll<HTMLDetailsElement>('details[data-elev]')].filter((d) => d.open).map((d) => d.dataset.elev));
  const etiketter = s.veckor.map(veckansNamn);
  const delar: string[] = [`<h2 id="pl-samman-rubrik" tabindex="-1">Sammanställningen${s.slut ? '' : ' hittills'}</h2>`, malRad('samman', false), ...(lektionernasMal(s) ? [`<p class="pl-not">${esc(lektionernasMal(s))}</p>`] : [])];
  // Ett pass som inte är bockat är inte bockat: sammanställningen säger det läraren har fört in (granskningarna 2026-10-24).
  // Passens rad ur standarden, som i pdf:en och texten som kopieras.
  delar.push(`<p>${esc(passensRad(s))}</p>`);
  const vad = s.grupp ? 'gruppen' : 'eleverna';
  // Metodens skattning av gruppen, med linjen, före eleverna (K-559). Planens egen skattning av gruppen står bara när den
  // har något, eftersom metodens skala är gruppens.
  const gsk = gruppensSkattning(), linje = linjeruta(s);
  if (gsk && linje) delar.push(`<section class="pl-block"><h3>${esc(gsk.namn)}</h3><p class="pl-not">${esc(`${stor(uppfNamn(gsk.rad))}, ${gsk.skala.fran} till ${gsk.skala.till}.`)}</p>${linje}</section>`);
  if (!(gsk && !elevernaHarNagot(s) && !(s.grupp && s.elever.some((e) => e.skattningar.length)))) delar.push(`<section class="pl-block"><h3>${s.grupp ? 'Gruppen' : 'Eleverna'}</h3><p class="pl-not">${esc(stor(skattningenText(vad, true, s.lektioner ? 'lektionens mål' : undefined)))}.${s.grupp ? '' : ' Tryck på en elev för grafen och elevens utskrift.'}</p><div class="pl-elevlista">${s.elever.map((e) => {
    const elev = !s.grupp && e.id !== GRUPPEN;
    const varden = elevensVarden(s, e);
    const r = riktning(e);
    return `<details class="pl-elevdetalj" data-elev="${esc(e.id)}"${oppna.has(e.id) ? ' open' : ''}><summary><span class="pl-elevnamn">${esc(e.namn)}</span>${graf(varden, etiketter, { namn: e.namn })}<span class="pl-riktning${r ? ` ${r}` : ''}">${r ? `<span aria-hidden="true">${PIL[r]} </span>` : ''}${esc([riktningText(e), foreOchEfter(e, 'efter'), elev && e.narvaro !== null && s.gjorda ? narvaronKort(e, s) : ''].filter(Boolean).join(' · '))}</span></summary>${utveckling(e, s)}</details>`;
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
  const s = sammanstallning(plan, aktiv.foljd, idag, veckornasLektioner());
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
const senastNer = () => `Planen laddades senast ner ${datumText(aktiv.kopia!.slice(0, 10))}.`;
const igen = 'Ladda ner den igen, så kommer det senaste med.';
// Påminnelsen om filen, en rot för raden längst ned och lägesraden överst, där läraren är (Niclas 2026-10-28: "mindre troligt
// att de raderas eller försvinner"; utredningen samma dag, underlag/prov/k598/lagring/svar.md: filen är det enda som klarar
// Safaris sju dagar, en rensad skoldator, privat läge och en förlorad telefon). Den står när läraren följer insatsen, har fört
// in något och inte har laddat ner på en vecka, och efter sista passet när filen är äldre än det. I Safari i iPhone, utanför
// appen Stöd, säger den varför.
function kopiansPaminnelse(): string {
  if (!aktiv.sparad || !aktiv.folj || !harFortIn()) return '';
  const alder = kopiansAlder();
  const efterSista = !!plan.sistaPass && plan.sistaPass <= idag && (aktiv.kopia ?? '') < plan.sistaPass;
  if (alder !== null && alder <= 7 && !efterSista) return '';
  const w = webblasaren();
  const safari = iAppen() ? ` ${APPENS_PLANER}` : w.ios && !w.app ? ' Safari tar bort det en sida har sparat efter sju dagar utan besök. I appen Stöd gör det inte.' : '';
  return `${efterSista ? 'Ladda ner planen, så finns hela insatsen med utvärderingen i filen.' : alder === null ? 'Det du för in finns bara i den här webbläsaren. Ladda ner planen, så finns det kvar.' : `${senastNer()} ${igen}`}${safari}`;
}
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
        : alder > 7 ? `${senastNer()} ${igen}` : `${senastNer()} Länken visar bara planen; filen har allt.`
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
  renderaLage();
  visaBesked('Planen är nedladdad. Lägg filen bland skolans filer. Den har elevernas namn, så dela den inte.');
}
$('pl-kopia-spara').addEventListener('click', sparaKopia);
const tidOrd = (andrad?: string) => (!andrad ? 'tidigare' : andrad.includes('T') ? `${datumText(andrad.slice(0, 10))} kl. ${tidText(andrad.slice(11, 16))}` : datumText(andrad.slice(0, 10)));
$<HTMLInputElement>('pl-kopia-fil').addEventListener('change', async (e) => {
  const filer = valdaFiler(e);
  if (!filer.length) return;
  // Flera filer eller en zip läses med samma rot som Öppna nedladdade planer på Stödundervisning, och sidan laddas om med
  // beskedet (Niclas 2026-10-28: "Även ladda upp planer bör kunna göra samma sak i en metod så allt har en rot").
  if (filer.length > 1 || /\.zip$/i.test(filer[0].name)) { await oppnaPlanerna(filer, 'pl-besked'); return; }
  const fil = filer[0];
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
    const pl = planera(mpFor(valen.val), valen.val);
    p.schema = schemaAv(pl, valen.val);
    p.bockade = antalBockade(pl, p.foljd!.gjorda);
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
    rakna();
    uppdateraAdressen();
    rendera();
    ($('pl-andra') as HTMLDetailsElement).open = false;
    visaBesked(['Planen är öppnad ur filen, med allt som förts in.', ...(last?.varningar ?? [])].join(' '), finns ? { text: 'Ångra', kvar: true, gor: () => { skrivPlaner([finns, ...lasPlaner().planer.filter((x) => x.id !== finns.id)]); aktiv = franSparad(finns); rakna(); uppdateraAdressen(); rendera(); visaBesked('Planen är som före kopian.'); } } : undefined);
  };
  // En kopia som skulle ersätta något som har ändrats efter den frågar först, också samma dag (granskningen 2026-10-24).
  if (finns && innehallAv(finns) !== innehallAv(p) && (finns.andrad ?? '') >= (p.andrad ?? '')) {
    fragaForst((e.target as HTMLInputElement).closest('label') as HTMLElement, `Planen i den här webbläsaren ändrades ${tidOrd(finns.andrad)}, och planen i filen ${tidOrd(p.andrad)}. Ersätta den med planen i filen?`, 'Ersätt med filen', oppna);
    return;
  }
  oppna();
});
// Webbläsaren ombeds spara planerna varaktigt, så att den inte rensar dem på egen hand. Den bestämmer själv.
/** Raden Webbläsaren med svaret om varaktig lagring, utan att skriva det två gånger. */
function visaVaraktig(v: boolean | undefined) {
  const teknik = document.getElementById('pl-teknik');
  if (!teknik || v === undefined) return;
  teknik.textContent = `${(teknik.textContent ?? '').replace(/ Sparar varaktigt: (ja|nej)\.$/, '').replace(/\.$/, '')}. Sparar varaktigt: ${v ? 'ja' : 'nej'}.`;
}
// Svaret syns under Webbläsaren när webbläsaren har svarat (Codex 2026-10-28: raden sa nej efter att den hade beviljats).
const bedOmVaraktig = () => { try { void navigator.storage?.persist?.().then(visaVaraktig).catch(() => {}); } catch { /* utan stöd */ } };

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
  rakna();
  history.replaceState(null, '', p ? `#${kodaVal(aktiv.val, { id: aktiv.id })}` : location.pathname);
  friskaUpp();
  rendera();
  ($('pl-andra') as HTMLDetailsElement).open = !aktiv.sparad;
  if (!p) { $('pl-planen').scrollIntoView({ block: 'start' }); visaBesked('En ny plan. Välj när gruppen träffas och spara planen.'); }
});

// ---------- Knapparna ----------
// Text som kopieras eller laddas ned är vanlig text: utan ordfogarna som håller ihop F–5 och 2–6 på sidan (verifieringen
// 2026-10-25: ett osynligt tecken mellan tankstrecket och siffran i texten till åtgärdsprogrammet och i kalenderfilen).
function vanligText(s: string): string { return utanFogar(s); }
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
// Underlaget en gång, så att texten som kopieras och tabellen Innehållet i insatsen i sammanställningens pdf har samma
// rader (dokumentationsrader i standarden).
function atgardsunderlag(): Parameters<typeof dokumentationstext> {
  const genomforda = aktiv.folj && aktiv.foljd.gjorda.length ? { genomforda: antalBockade(plan, aktiv.foljd.gjorda) } : {};
  return [{ titel: metodensNamn(), undertitel: data.undertitel, adress: data.adress, mal: data.mal, steg: (data.progression?.rader ?? []).map((r) => r.kort), uppfoljning: data.uppfoljning.rader, nivaNamn: nivaNamn() }, plan, aktiv.val, { minuter: minuter(), folj: aktiv.folj, utvardering: aktiv.foljd.utvardering, elever: elevernasNamn(aktiv.foljd), pagar: !!plan.sistaPass && !slutNu(), ...genomforda, ...lektionernasText(), ...(extraPassetsDatum() ? { extraPass: { datum: extraPassetsDatum()! } } : {}) }];
}
function atgardstext() { return dokumentationstext(...atgardsunderlag()); }
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
  const extra = extraPassetsDatum();
  const text = kalenderfil({ ...(extra && data.extraPass ? { extraPass: { datum: extra, text: [data.extraPass.rubrik, ...(data.extraPass.delar ?? []).map((d, _i, alla) => `${d.fas} ${delensTidI(d.tid, alla)}: ${d.vad}`), data.extraPass.delar?.length ? '' : data.extraPass.fore ?? ''].filter(Boolean).join('\n') } } : {}), titel: metodensNamn(), uppfoljning: data.uppfoljning.rader, fokus: (data.progression?.rader ?? []).map((r) => r.fokus), passet: passetIKalendern, minuter: (p) => iPassetsLektion(p, () => passetBehover(p)) }, plan, { id: aktiv.id, lank, namn: aktiv.namn || undefined, nu: new Date(), tider: aktiv.val.tider, passtider: aktiv.val.passtider, elever: aktiv.foljd.elever });
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
    rakna();
    history.replaceState(null, '', location.pathname);
    rendera();
    ($('pl-andra') as HTMLDetailsElement).open = true;
    visaBesked('Planen är borttagen.', { text: 'Ångra', kvar: true, gor: () => {
      skrivPlaner([borttagen, ...lasPlaner().planer]);
      aktiv = oppnaSparad(borttagen);
      rakna();
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
  const paminn = kopiansPaminnelse();
  ruta.innerHTML = `<p${avslutad && nyssAvslutad ? ' role="status"' : ''}>${bock}<span class="pl-status ${lage}">${STATUSNAMN[lage]}</span> ${esc(text)}</p>${synliga.length ? `<p class="pl-andra-knappar">${synliga.join('')}</p>` : ''}${kanAvsluta ? avslutaFormular() : ''}${paminn ? `<p class="pl-paminn pl-kopia-overst">${esc(paminn)} <button type="button" class="pl-textknapp" data-gor="kopia" ${goat('kopia-overst', 'planen nedladdad från lägesraden')}>Ladda ner planen</button></p>` : ''}`;
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
  if (gor === 'kopia') { sparaKopia(); return; }
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
    rakna();
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
    rakna();
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
  // Om webbläsaren har beviljat varaktig lagring, som skyddar planerna när enheten får ont om plats (utredningen 2026-10-28),
  // så att det syns när en lärare hör av sig. Sidan ber om den när planen sparas (bedOmVaraktig).
  void (navigator.storage?.persisted?.() ?? Promise.resolve(undefined)).then(visaVaraktig).catch(() => {});
}
if (!lagringOk) notis = 'Webbläsaren sparar inget här, till exempel i privat läge. Kopiera länken till planen, så finns den kvar.';
visaNotis(notis, notis === appText ? appKnappar : '');
if (lamnatBesked) visaBesked(lamnatBesked);
uppdateraAdressen();
sida.classList.add('pl-klar');
