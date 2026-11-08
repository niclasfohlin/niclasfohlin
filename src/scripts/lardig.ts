// Lär dig metoden (K-628; Niclas 2026-10-30: "En rot på allt, men som en egen harness för metoder ... Och ge stöd att
// långsamt [lära] sig metoden i steg för steg"). Sidan räknar lärarens plan med standardens motor (src/lib/standard/plan.js,
// under Lär dig metoden) ur metodens fält, som sidan bär som JSON (src/lib/lardig.ts), och ritar den. Här räknas inget som
// motorn kan räkna: veckorna, stegen, ett förlängt steg, loven, veckorna efter stegen, linjerna och reglerna kommer därifrån.
//
// Lärarens väg har tre faser (Niclas samma natt: "Inför är då att förbereda sig, plocka fram material, [läsa] in sig på
// metoden. Efter är att utveckla metoden. Nå stadigvarande form. Läsa på mer."): Före, stegen en vecka var eller längre, och
// Efter. Varje vecka slutar med veckans stund: Gick det?, de två skattningarna med tio knappar och linjen, som Lärarens
// skattning i Gruppstärkande aktiviteter (src/scripts/skattning.ts), veckans kommentar och en rad om varje klass, som fälls
// ut, där läraren också kan skatta hur det gick i klassen. Mitt i stegen lyfter planen fram klassen som har gått sämst, och
// läraren kan avsluta planen med en anledning, som i Planera insatsen (K-631). Planen sparas i webbläsaren och som fil i samma
// format som Planera insatsen, med samlingen metoder (src/scripts/insatser-lagring.ts). Det läraren för in följer aldrig med
// någon länk eller statistik. Det som båda sidorna ritar lika, beskedet, lovknapparna, listorna, raden överst och avslutet,
// står i src/scripts/byggstenar.ts (K-630).
import {
  ANLEDNINGENS_LANGD, veckansRubrik, arDatum, datumspann, forensMening, forstaLektionensMening, julensText, julveckorna, efterStegensTakt, uppfoljningIDatumordning, gickDetSvaret, gickDetsFoljd, lovveckornaAttValja, linjenRitas, medDecimaler, veckornaMedDatum, infordaDatum, klassenHarNagot, borttagnasBesked, planveckansKort, sistaInfort, klassernasSkalaText, larDigetsLagetFor, larDigetsMittLast, larDigetsSteg, larDigetsStart, klasslistansBesked, sakdelar, veckorI, periodensText, regelnIVeckan, skolveckan, skolveckansText, stegetsRad, SKATTNINGARNAS_GRANS, dagarMellan, dagOchManad, dagText, decimal, esc, filnamnet, forstaLektionen, gangen, larDigetsForval, harInfortEfter, isoVecka, kalendervecka, klassensFraga, KLASSERNAS_SKALA, klasserUrText, larDigetsAvslutText, larDigetsKvar, larDigetsMetodplan,
  larDigetsRegler, larDigSammanstallning, lasVal, lovetsText, mandagen, medVardet, mening, mittIFragan, mittIText, MITT_I_LANGD, passetsLage, passetTraffas, planera, planveckansNamn, plusDagar, PLANERA, rensaFoljd, rentMal, rentText, sakernasText, spannKort,
  rutinensRubrik, stor, talText, uppraknat, veckansPass, veckonyckel, vidareMening, granslinjensText, obesvaradVecka, skalansAndar, svaraGickDet, KLASSENS_NAMN, KLASSLISTANS_LANGD, KLASSNOTENS_LANGD, KOMMENTARENS_LANGD, type Foljd, type LarDigSammanstallning, type Plan, type PlanVecka, type Val,
} from '../lib/standard/index.js';
import type { LarDigData } from '../lib/lardig';
import { BESKEDETS_NYCKEL, idagLokalt, iSamlingen, kopiansAlder, kopiansText, lagringenArNyare, lasPlaner, NYARE_VERSION, nyttId, planenUrFaltet, planfilen, samlingen, schemaAv, skrivPlaner, skrivPlanen, sparadPlan, bytPlanen, filenErsatterNyare, filensFraga, flikensPlan, vidAndraFlikar, vidNyttDygn, OPPNAD_UR_FILEN, oppnaPaSinSida, SAMLINGENS_ORD, type SparadPlan } from './insatser-lagring';
import { laddaNer, linjegraf, pdfOrd, skalansAndarRad, skalansKnappar, visaPdf } from './skattning';
import { $, ANGRA_AVSLUTET, anledningenIFaltet, avslutaKnappen, avslutsformularet, avslutsrutan, beskedet, etikettlista, filensSkal, goatFor, knappen, lagesraden, linjensRegler, lovknapp, notisen, remsansKnapp, vidTryck, markeraAnledningen, webblasarensRad, webblasarensTryck } from './byggstenar';
import { larDigPdf } from './lardigpdf';

const data: LarDigData = JSON.parse($('ld-data').textContent ?? '{}');
const rader = data.uppfoljning.rader;
// Metodens plan ur motorn, med lärarens skattningar; sidan byggs bara när den går att räkna (larDigFel).
const mp = larDigetsMetodplan(data).plan!;
// Dagens datum, som sidan läser om när ett nytt dygn har börjat medan den stod öppen (vidNyttDygn nedan).
let idag = idagLokalt();
// Nyckeln för ett besked när sidan laddas om efter att planer har öppnats ur flera filer (oppnaPlanerna).
const BESKED = BESKEDETS_NYCKEL.metoder;

// skapad är dagen planen sparades första gången, där Före börjar (Niclas 2026-10-30: "'Före' är från man sparar planen till
// datumet för när man valt första lektionen").
interface Aktiv { id: string; val: Val; foljd: Foljd; sparad: boolean; kopia?: string; skapad: string; uppdaterad?: string }
const nyAktiv = (): Aktiv => ({ id: nyttId(), val: larDigetsForval(mp, idag), foljd: rensaFoljd({}), sparad: false, skapad: idag });
// Planens innehåll när fliken senast läste eller sparade den, så att en annan fliks ändring visas här (vidAndraFlikar).
const minne = flikensPlan();
const franSparad = (p: SparadPlan): Aktiv => (minne.minns(p), { id: p.id, val: lasVal(p.val)?.val ?? larDigetsForval(mp, idag), foljd: rensaFoljd(p.foljd), sparad: true, skapad: p.skapad ?? (arDatum(p.andrad.slice(0, 10)) ? p.andrad.slice(0, 10) : idag), ...(p.kopia ? { kopia: p.kopia } : {}), ...(p.uppdaterad ? { uppdaterad: p.uppdaterad } : {}) });
// En plan per lärare och metod (Niclas 2026-10-30): planen för metoden i samlingen Metoder, den senast ändrade, eller den som
// adressen pekar på (planensAdress).
const minaPlaner = () => iSamlingen(lasPlaner().planer, 'metoder').filter((p) => p.metod === data.id).sort((a, b) => (a.andrad < b.andrad ? 1 : a.andrad > b.andrad ? -1 : 0));
let aktiv: Aktiv = (() => {
  const fran = new URLSearchParams(location.hash.slice(1)).get('p');
  const egna = minaPlaner();
  const p = (fran ? egna.find((x) => x.id === fran) : undefined) ?? egna[0];
  return p ? franSparad(p) : nyAktiv();
})();
// Planen ur valen, med veckan Mitt i låst i valen när den har börjat (larDigetsMittLast i standarden), så att ett steg som
// förlängs efteråt inte flyttar den till en annan vecka och en annan klass (granskningen rot-3, fynd 1).
const planen = (): Plan => { const p = planera(mp, aktiv.val); const mitt = aktiv.val.mitt ? undefined : larDigetsMittLast(p, idag); if (!mitt) return p; aktiv.val = { ...aktiv.val, mitt }; return planera(mp, aktiv.val); };
let plan: Plan = planen();
const rakna = () => { plan = planen(); };
const samman = (): LarDigSammanstallning => larDigSammanstallning(plan, aktiv.val, aktiv.foljd, idag);

// ---------- Lagringen ----------
const sparadAv = (): SparadPlan => sparadPlan(aktiv, data, plan, { samling: 'metoder', namn: '', folj: true, skapad: aktiv.skapad, bockade: 0 });
function spara(): boolean {
  if (!aktiv.sparad) return true;
  // Har en annan flik sparat under tiden, visar fliken planen med båda flikarnas ändringar, och kopian av datumen räknas ur de
  // sammanslagna valen (flikensPlan; rotprovet 2026-10-31, Codex fynd 1).
  const ok = minne.skriv(sparadAv(), (ihop) => { aktiv = franSparad(ihop); rakna(); return sparadAv(); });
  if (!ok) visaBesked(lagringenArNyare() ? NYARE_VERSION : 'Planen gick inte att spara i den här webbläsaren. Ladda ner den som fil, så finns den kvar.');
  return ok;
}
// Det läraren skriver sparas en stund efter sista tangenten, och direkt när sidan lämnas.
let skrivTimer = 0;
const sparaSnart = () => { window.clearTimeout(skrivTimer); skrivTimer = window.setTimeout(() => { skrivTimer = 0; spara(); renderaKopia(); }, 500); };
const skrivKlart = () => {
  const lista = document.getElementById('ld-klasser') as HTMLTextAreaElement | null;
  if (klasslistanAndrad && lista) lasKlasslistan(lista);
  if (skrivTimer) { window.clearTimeout(skrivTimer); skrivTimer = 0; spara(); }
};
addEventListener('pagehide', skrivKlart);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') skrivKlart(); });

// ---------- Beskedet ----------
// Beskedet längst ned på skärmen, som i Planera insatsen (byggstenarna).
const visaBesked = beskedet('ld-toast');

// En ändring med Ångra: ändringen görs, planen räknas om, sparas och ritas, och Ångra tar tillbaka valen och det som var
// infört. En ändring som inte går att göra säger varför och returnerar false.
function andra(gor: () => void | false, meddelande?: () => string, kanAngra = false) {
  const fore = { val: structuredClone(aktiv.val), foljd: structuredClone(aktiv.foljd) };
  if (gor() === false) return;
  // En ändring i Före sparar planen av sig själv första gången (sparaForet).
  const forsta = !aktiv.sparad && visa === 'fore';
  if (forsta) aktiv.sparad = true;
  rakna(); spara(); rendera();
  const text = [forsta ? 'Planen är sparad i den här webbläsaren.' : '', meddelande?.() ?? ''].filter(Boolean).join(' ');
  if (text) visaBesked(text, kanAngra ? { text: 'Ångra', gor: () => { aktiv.val = fore.val; aktiv.foljd = fore.foljd; rakna(); spara(); rendera(); visaBesked('Ändringen är ångrad.'); } } : undefined);
}

// ---------- Vyerna ----------
// Vyn som visas: Före, en vecka i stegen (veckans nummer i planen) eller Efter.
type Vy = 'fore' | 'efter' | number;
const standardVy = (): Vy => { if (!aktiv.sparad) return 'fore'; const s = samman(); return s.fas === 'fore' ? 'fore' : s.fas === 'efter' ? 'efter' : s.nu ?? 1; };
let visa: Vy = standardVy();
// Stegets rad i progressionen, också för en vecka utan egen rad, som hör till steget före (larDigetsSteg i standarden).
const stegRad = (v: { nr?: number; steg?: number | null }) => { const r = larDigetsSteg(plan).rad(v); return r !== null ? data.progression.rader[r] : undefined; };
// Stegets namn med ledet, som metodens sida och lathunden skriver veckan, "Klimatet: …" (veckansRubrik i standarden).
const rubrikerna = data.progression.rader.map((r) => veckansRubrik(r, { vecka: false, nummer: false }));
const stegNamn = (v: { nr?: number; steg?: number | null }) => { const r = larDigetsSteg(plan).rad(v); return r !== null ? rubrikerna[r] ?? '' : ''; };
// Stegen i planen: antalet, ett stegs nummer och det sista steget (larDigetsSteg i standarden).
const steg = () => larDigetsSteg(plan);
const goat = goatFor(SAMLINGENS_ORD.metoder.led, data.id, data.titel);
const knapplank = (adress: string, text: string, vad: string) => `<a class="knapp sekundar ld-knapp" href="${esc(adress)}" ${goat(vad, text)}>${esc(text)}</a>`;
// Det som var utfällt står kvar när vyn ritas om.
const oppnaRutor = () => new Set([...document.querySelectorAll<HTMLDetailsElement>('#ld-vyn details[data-ruta][open], #ld-samman details[data-ruta][open]')].map((d) => d.dataset.ruta!));
const oppen = (o: Set<string>, ruta: string) => (o.has(ruta) ? ' open' : '');
// Stegets regel som en fråga (fraga), som varje steg har (undervisningsmetodensFel), så att regeln står en gång.
const fraganFor = (rad?: LarDigData['progression']['rader'][number]) => rad?.fraga ?? '';
// Veckan med ett steg som har varit utan svar på Gick det?, som står överst tills den har svar (obesvaradVecka i standarden),
// utom i en avslutad plan.
const obesvarad = () => (aktiv.sparad && !aktiv.foljd.avslut ? obesvaradVecka(plan, aktiv.foljd, idag, aktiv.skapad) : null);
const tillSamman = (s: LarDigSammanstallning) => (aktiv.sparad && s.harNagot ? '<p class="ld-tillsamman"><button type="button" class="pl-textknapp" data-till-samman>Till sammanställningen</button></p>' : '');

// Raden överst i en sparad plan, som i Planera insatsen (lagesraden i byggstenarna): läget som märke, som under Dina planer
// (statusAv), var läraren är och knappen Avsluta planen med formuläret under raden. En avslutad plan har rutan med bocken,
// avslutet med anledningen och Ångra avslutet, och planen grå och streckad (K-631). Formuläret står kvar öppet med det
// läraren har skrivit när sidan ritas om.
let avslutaOppen = false;
let avslutaUtkast = '';
let nyssAvslutad = false;
function renderaLage(s: LarDigSammanstallning) {
  const ruta = $('ld-lage');
  const lage = aktiv.sparad ? larDigetsLagetFor(plan, idag, !!aktiv.foljd.avslut).lage : null;
  $('ld').classList.toggle('pl-avslutad-plan', lage === 'avslutad');
  if (!lage) { avslutaOppen = false; ruta.className = 'ld-lage'; ruta.innerHTML = ''; return; }
  if (s.avslut) {
    avslutaOppen = false;
    ruta.className = 'ld-lage';
    ruta.innerHTML = avslutsrutan({ rubrik: 'Planen är avslutad', text: `${larDigetsAvslutText(s.avslut)} Sammanställningen och allt du har fört in finns kvar.`, knappar: [s.harNagot ? '<button type="button" class="knapp liten" data-till-samman>Till sammanställningen</button>' : '', ANGRA_AVSLUTET].filter(Boolean), ny: nyssAvslutad });
    return;
  }
  const forsta = forstaLektionen(plan);
  const nu = s.nu ? plan.veckor[s.nu - 1] : undefined;
  const o = obesvarad();
  const saknas = o && stegRad(o) ? ` Du har inte svarat om steg ${steg().nummer(o)} sitter.` : '';
  const text = s.fas === 'fore' && forsta ? forstaLektionensMening(data.startNamn, forsta, idag)
    : s.fas === 'under' && nu ? `Nu: steg ${steg().nummer(nu)} av ${steg().antal}, ${stegNamn(nu)}${gangen(plan, nu) ? ', en vecka till' : ''}.${saknas}`
    : s.fas === 'efter' ? `Nu: efter stegen. Du skattar ${efterStegensTakt()}.${saknas}` : '';
  const kanAvsluta = lage === 'pagaende';
  if (!kanAvsluta) avslutaOppen = false;
  ruta.className = `pl-lage ld-lage ${lage}`;
  const formularet = kanAvsluta ? avslutsformularet({ id: 'ld-avsluta', oppen: avslutaOppen, samling: 'metoder', fore: '<p>Planen stannar i dag, där du är. Sammanställningen och allt du har fört in står kvar.</p>', not: avslutaUtkast, hjalp: 'Anledningen står i sammanställningen. Avslutet går att ångra.', knapp: 'Avsluta i dag', goat: goat('avsluta', 'planen avslutad') }) : '';
  ruta.innerHTML = lagesraden(lage, text, { knappar: [kanAvsluta ? avslutaKnappen('Avsluta planen', 'ld-avsluta', avslutaOppen) : ''], under: formularet });
}
// Avsluta i dag: avslutet med dagen och anledningen i fältet, också ett tomt fält, och Ångra i beskedet.
function avslutaKlar() {
  const not = rentText($<HTMLInputElement>('ld-avsluta-not').value, ANLEDNINGENS_LANGD);
  andra(() => { aktiv.foljd = { ...aktiv.foljd, avslut: { datum: idag, ...(not ? { not } : {}) } }; nyssAvslutad = true; avslutaOppen = false; avslutaUtkast = ''; }, () => 'Planen är avslutad. Sammanställningen och allt du har fört in finns kvar.', true);
  $('ld-lage').scrollIntoView({ block: 'start' });
  $('ld-lage').querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
}
// Ångra avslutet: planen pågår igen, med allt som var infört.
function angraAvslutet() {
  andra(() => { const { avslut: _, ...utan } = aktiv.foljd; aktiv.foljd = utan; }, () => 'Avslutet är ångrat. Planen pågår igen.', true);
  $('ld-lage').querySelector<HTMLElement>('[data-gor="avsluta"]')?.focus({ preventScroll: true });
}

function renderaRemsa(s: LarDigSammanstallning) {
  const knapp = (vy: Vy, k: { tal: string; om: string }, nu: boolean, etikett: string) => remsansKnapp(vy, k, { nu, vald: String(visa) === String(vy), etikett, steg: true });
  const nuNr = s.fas === 'under' ? s.nu : null;
  const stegen = plan.veckor.map((v) => knapp(v.nr, planveckansKort(plan, v), nuNr === v.nr, `${planveckansNamn(plan, v).Text}, ${stegNamn(v)}`));
  // Kolumnerna i den minsta telefonen: alla på en rad upp till sex, och annars jämna rader, så att ingen knapp står ensam
  // (formgranskningen 2026-10-30).
  const antal = plan.veckor.length + 2;
  $('ld-remsa').innerHTML =`<p class="pl-etikett">Din väg</p><div class="pl-remsa-knappar" style="--ld-kolumner: ${antal <= 6 ? antal : Math.ceil(antal / 2)}">${knapp('fore', { tal: 'Före', om: '' }, s.fas === 'fore' && aktiv.sparad, 'Före första lektionen')}${stegen.join('')}${knapp('efter', { tal: 'Efter', om: '' }, s.fas === 'efter', 'Efter stegen')}</div>`;
}

// ---------- Före ----------
// Startveckan: veckorna från åtta veckor bakåt till trettio veckor fram, och planens egen.
// Före, från dagen planen sparas till första lektionen, i ord: "omkring tre veckor".
const forePerioden = () => {
  const forsta = forstaLektionen(plan) ?? aktiv.val.start;
  const fran = aktiv.sparad ? aktiv.skapad : idag;
  const dagar = dagarMellan(fran, forsta);
  return { forsta, fran, dagar, tid: periodensText(dagar) };
};
// Veckorna från fran till och med till.
const aktivaKlasser = () => (aktiv.foljd.klasser ?? []).filter((k) => !k.borta);

// Uppföljningens rader med veckan för första tillfället, före och efter stegen, i datumordning.
const uppfMedVeckan = (lista: Plan['uppfoljning']) => etikettlista(uppfoljningIDatumordning(lista).map((u) => ({ etikett: uppfNar(u.rad, skolveckansText(mandagen(u.tillfallen[0].datum))), html: esc(veckornaMedDatum(rader[u.rad].vad, plan)) })));
// Uppföljningens rad med planens veckor (veckornaMedDatum i standarden), och veckans datum när raden inte redan säger veckan.
const uppfNar = (rad: number, datum: string) => { const nar = veckornaMedDatum(rader[rad].nar, plan); return nar === rader[rad].nar ? `${nar}, ${datum}` : nar; };
// Planens rad överst i Före: stegen och om planen är sparad. Den ritas om när Före sparas av sig själv.
const summaHtml = () => {
  const f = forePerioden();
  const fore = f.dagar > 0 ? `Före: från ${dagOchManad(f.fran)} till första lektionen, ${dagText(f.forsta)}${f.tid ? `, ${f.tid}` : ''}.` : forstaLektionensMening(data.startNamn, f.forsta, idag);
  const veckan = plan.veckor[0]?.mandag ?? f.forsta;
  // Lektioner mellan jul och trettondagen säger till, som i Planera insatsen (julveckorna och julensText i standarden; B16).
  const julen = aktiv.foljd.avslut ? '' : julensText(julveckorna(plan.pass.map((p) => p.datum), idag), 'lektioner', 'under När du börjar');
  return `<p>${esc(fore)}</p><p>${esc(`${stor(talText(steg().antal))} steg från ${kalendervecka(isoVecka(veckan).vecka)}. Varje steg tar en vecka eller längre.`)}</p>${julen ? `<p class="pl-varning">${esc(julen)}</p>` : ''}${aktiv.sparad ? '<p class="pl-not">Planen är sparad i den här webbläsaren.</p>' : '<p class="pl-not">Planen sparas i den här webbläsaren av sig själv när du fyller i något.</p>'}`;
};
const uppdateraSumma = () => { const el = document.getElementById('ld-summa'); if (el) el.innerHTML = summaHtml(); };

// Före i den ordning läraren gör det (granskningen 2026-10-30): planen, målet, klasserna, startveckan och loven först, och
// sedan läsningen, arbetslagets första möte, checklistan och materialet.
function renderaFore(o: Set<string>): string {
  const bockat = new Set(aktiv.foljd.bockat ?? []);
  const mal = aktiv.val.mal ?? '';
  const malet = `<div class="ld-delblock"><h4 id="ld-mal-rubrik">Ditt mål med metoden</h4><p class="pl-hjalp">Metoden har inget eget mål. Ditt mål är det du vill kunna när metoden sitter. Tryck på ett av kärnans ${talText(data.karna.length)}, det som metoden bygger på, och skriv om det med egna ord, eller skriv ett eget.</p><div class="ld-val" role="group" aria-labelledby="ld-mal-rubrik">${data.karna.map((k) => `<button type="button" class="ld-valknapp" data-mal="${esc(k.kvar)}" aria-pressed="${mal === k.kvar}"><span class="ld-valnamn">${esc(k.namn)}</span>${esc(k.kvar)}</button>`).join('')}</div><label class="pl-etikett" for="ld-mal">Ditt mål med egna ord</label><textarea class="pl-falt pl-textfalt pl-brett ld-malfalt" id="ld-mal" rows="2" maxlength="200" autocomplete="off">${esc(mal)}</textarea><p class="pl-hjalp">Målet står i veckans stund och i sammanställningen.</p></div>`;
  const klasser = `<div class="ld-delblock"><h4 id="ld-klasser-rubrik">Dina klasser och grupper</h4><label class="pl-etikett" for="ld-klasser">En per rad, högst ${talText(KLASSLISTANS_LANGD)}</label><textarea class="pl-falt pl-textfalt" id="ld-klasser" rows="4" autocomplete="off" spellcheck="false">${esc(aktivaKlasser().map((k) => k.namn).join('\n'))}</textarea><p class="pl-hjalp">Skriv klassens eller gruppens namn, som 3B eller Ma2 grupp 1, och inga elevnamn. Varje vecka kan du skriva en rad om varje klass.</p><p class="pl-hjalp pl-varning" id="ld-klasser-not" role="status" hidden></p></div>`;
  const lov = new Set(aktiv.val.lov ?? []);
  const last = !!sistaInfort(aktiv.foljd, plan);
  // Loven under stegen, och efter stegen till planens sista uppföljning i en rad som fälls ut, så att skattningen efter
  // stegen hoppar över dem.
  // Veckorna att trycka som lov, lika i båda lagren (lovveckornaAttValja i standarden): under stegen, och efter dem i en rad som fälls ut.
  const lovVeckor = lovveckornaAttValja(plan, aktiv.val, mandagen(aktiv.val.start)), stegensSlut = plusDagar(plan.efter, 7);
  const underStegen = lovVeckor.filter((m) => m <= stegensSlut), efterStegenLov = lovVeckor.filter((m) => m > stegensSlut);
  const efterLov = efterStegenLov.length ? `<details class="pl-fallut" data-ruta="lov-efter"${oppen(o, 'lov-efter') || efterStegenLov.some((m) => lov.has(veckonyckel(m))) ? ' open' : ''}><summary>Lov efter stegen</summary><div class="pl-lovveckor">${efterStegenLov.map((m) => lovknapp(m, lov, sistaInfort(aktiv.foljd, plan))).join('')}</div></details>` : '';
  // Första lektionen med eleverna är ett datum, och Före räcker från dagen planen sparas till dess (Niclas 2026-10-30).
  const period = forePerioden();
  const start = `<div class="ld-delblock"><h4>När du börjar</h4><label class="pl-etikett" for="ld-start">${esc(data.startNamn)}</label><input class="pl-falt" type="date" id="ld-start" value="${esc(forstaLektionen(plan) ?? aktiv.val.start)}" min="${plusDagar(idag, -90)}" max="${plusDagar(idag, 365)}"${last ? ' disabled' : ''} /><p class="pl-hjalp">${esc(forensMening(period.fran, period.forsta, idag))} Många behöver två till fyra veckor för att läsa in sig, plocka fram materialet och träffa arbetslaget. Stegen börjar veckan för första lektionen. Metoden: ${esc(data.tid)}.${last ? ' Du har fört in något, så första lektionen står kvar.' : ''}</p><fieldset class="ld-lov"><legend class="pl-etikett">Tryck på veckorna som är lov</legend><div class="pl-lovveckor">${underStegen.map((m) => lovknapp(m, lov, sistaInfort(aktiv.foljd, plan))).join('')}</div><p class="pl-hjalp">Stegen och skattningen hoppar över dem.</p>${efterLov}</fieldset></div>`;
  const planen = `<section class="pl-block ld-planen" aria-labelledby="ld-planen-rubrik"><h3 id="ld-planen-rubrik">Din plan</h3><div class="ld-summa" id="ld-summa">${summaHtml()}</div>${malet}${klasser}${start}${aktiv.sparad ? '' : `<p class="pl-andra-knappar" id="ld-spara-rad"><button type="button" class="knapp sekundar ld-knapp" data-spara ${goat('spara', 'planen sparad')}>Spara förslaget som det är</button></p>`}</section>`;
  const lasvag = `<section class="pl-block" aria-labelledby="ld-las-rubrik"><h3 id="ld-las-rubrik">Läs in dig</h3><p>${esc(`Läs de här delarna av metoden ${data.lasvag.nar}, omkring ${data.lasvag.minuter} minuter.`)}</p><ol class="ld-lasvag">${data.lasvag.delar.map((x) => `<li><a href="${esc(x.adress)}" ${goat('lasvag', x.namn)}>${esc(x.namn)}</a></li>`).join('')}</ol>${data.film ? `<p><a href="${esc(`${data.sida}#filmen`)}" ${goat('filmen', 'filmen från Lär dig metoden')}>Titta på filmen: ${esc(data.film.rubrik)}</a></p>${data.film.ingress ? `<p>${esc(data.film.ingress)}</p>` : ''}` : ''}</section>`;
  // Veckornas gemensamma text, som metodens sida har först under De första veckorna: takten och det som gäller alla veckor, som
  // att vecka 3 och 5 är muntliga i F–1 i Skriva för att lära (Codex andra öga 2026-11-08, K-734: texten fanns i sidans data men
  // visades inte, och stegen visar bara veckans egen rad).
  const veckorna = data.progression.text ? `<section class="pl-block" aria-labelledby="ld-veckorna-rubrik"><h3 id="ld-veckorna-rubrik">${esc(data.progression.rubrik ?? 'De första veckorna')}</h3><p>${medSaker(data.progression.text)}</p></section>` : '';
  // Uppföljningens rader före start, som arbetslagets möte före första lektionen, med veckan före stegen (motorns Före).
  const egna = new Set(mp.skattningar.map((x) => x.rad));
  const foreRader = plan.uppfoljning.filter((u) => u.typ === 'fore' && !egna.has(u.rad) && u.tillfallen.length);
  const motet = data.forbered.fragor.length || foreRader.length ? `<section class="pl-block" aria-labelledby="ld-mote-rubrik"><h3 id="ld-mote-rubrik">Arbetslagets första möte</h3>${foreRader.length ? uppfMedVeckan(foreRader) : ''}${data.forbered.text ? `<p>${esc(data.forbered.text)}</p>` : ''}${data.forbered.fragor.length ? `<p class="pl-etikett">Frågorna att tänka igenom</p><ol class="ld-fragor">${data.forbered.fragor.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}</section>` : '';
  const check = `<section class="pl-block" aria-labelledby="ld-check-rubrik"><h3 id="ld-check-rubrik">Checklistan</h3><ul class="ld-checklista">${data.checklista.punkter.map((p, i) => `<li><label class="pl-kryss"><input type="checkbox" data-bock="${i}"${bockat.has(i) ? ' checked' : ''} /> <span>${medSaker(veckornaMedDatum(p, plan))}</span></label></li>`).join('')}</ul><p class="pl-not" id="ld-check-antal">${esc(checkText())}</p></section>`;
  const f = data.filer;
  const material = `<section class="pl-block" aria-labelledby="ld-mat-rubrik"><h3 id="ld-mat-rubrik">Materialet</h3>${data.material.length ? `<p>${esc(mening(stor(uppraknat(data.material))))}</p>` : ''}<p class="pl-andra-knappar">${knapplank(f.lektionskort.adress, 'Lektionskortet', 'lektionskort')}${knapplank(f.planeringsmall.adress, 'Planeringsmallen', 'planeringsmall')}${f.tabeller.map((x) => knapplank(x.adress, x.namn, `tabell-${x.namn}`)).join('')}${knapplank(f.materialet.adress, f.materialet.namn, 'materialet')}${data.verktyg.map((x) => knapplank(x.adress, x.knapp, `verktyg-${x.namn}`)).join('')}</p>${strukturkortenTillHands()}${strategikortenTillHands()}${f.lektionskort.fil && f.planeringsmall.fil ? '' : '<p class="pl-hjalp">Det som ännu inte finns som fil står på metodens sida.</p>'}</section>`;
  return `<section class="ld-fas" aria-labelledby="ld-vy-rubrik"><h2 id="ld-vy-rubrik" tabindex="-1">Före första lektionen</h2><p class="ld-ingress">Förbered dig, plocka fram materialet och läs in dig. Sedan tar du ett steg i taget.</p>${planen}${lasvag}${veckorna}${motet}${check}${material}<p class="pl-bladdra"><span></span><button type="button" class="pl-textknapp" data-vy="1">Första steget ›</button></p></section>`;
}
// Strukturkorten att ha till hands (Niclas 2026-11-01: "KL ska uppmuntra att ladda ner alla dem och ha till hands i KL
// kursens lär dig"): metodens kort, två och två på A4, och alla kort i verktyget Strukturer.
const strukturkortensKnappar = (k: NonNullable<typeof data.strukturkort>) => `<p class="pl-andra-knappar">${knapplank(k.metodens, `De ${talText(k.antal)} korten som pdf`, 'strukturkort')}${knapplank(k.alla, `Alla ${k.allaAntal} kort (pdf, ${k.allaStorlek})`, 'strukturkort-alla')}</p><p class="pl-hjalp">${esc(k.utskrift)}</p>`;
// Korten till hands före första lektionen, en funktion för strukturkorten och strategikorten (Niclas 2026-11-04 om Lärande på
// kognitionsvetenskaplig grund: "Precis som i KL med strukturer bör planera insatsen i kognitionsvetenskap uppmana att skriva
// ut och laminera alla 18 korten och ha dem till hands", "I före"). Metoden som importerar verktygets kort med sitt eget fält har
// dem här (vid i src/lib/lardig.ts).
const kortenTillHands = (k: { vid: string; antal: number; allaAntal: number }, kort: string, en: string, knappar: string) => k.vid === 'fore' ? `<p>${esc(`Skriv ut och laminera alla ${talText(k.allaAntal)} ${kort} och ha dem till hands. Metoden börjar med ${k.antal === 1 ? 'ett' : `de ${talText(k.antal)}`}, och de andra tar du fram när en lektion behöver en annan ${en}.`)}</p>${knappar}` : '';
const strukturkortenTillHands = () => { const k = data.strukturkort; return k ? kortenTillHands(k, 'strukturkort', 'struktur', strukturkortensKnappar(k)) : ''; };
const strategikortenTillHands = () => { const k = data.strategikort; return k ? kortenTillHands(k, 'strategikort', 'strategi', strategikortensKnappar(k)) : ''; };
// I slaget strategier bygger läraren på med korten när grunden sitter, så de står efter stegen, med metodens egen text (slagensOrd i standarden).
const strukturkortenEfter = () => { const k = data.strukturkort; return k?.vid === 'efter' ? `<section class="pl-block" aria-labelledby="ld-kort-rubrik"><h3 id="ld-kort-rubrik">Strukturkorten</h3><p>${esc(k.text)}</p>${strukturkortensKnappar(k)}</section>` : ''; };
// Strategierna för lärande som metoden visar (K-699, K-702), efter stegen som strukturkorten i slaget strategier: texten, metodens
// kort, alla kort när verktyget har fler än metoden (andra ögat 2026-11-04, P2) och metodens blad när det finns.
const strategikortensKnappar = (k: NonNullable<typeof data.strategikort>) => `<p class="pl-andra-knappar">${knapplank(k.metodens, k.antal === 1 ? 'Kortet som pdf' : `De ${talText(k.antal)} korten som pdf`, 'strategikort')}${k.blad ? knapplank(k.blad.adress, k.blad.namn, 'strategibladet') : ''}${k.allaAntal > k.antal ? knapplank(k.alla, `Alla ${k.allaAntal} kort (pdf, ${k.allaStorlek})`, 'strategikort-alla') : ''}</p><p class="pl-hjalp">${esc(k.utskrift)}</p>`;
const strategikortenEfter = () => { const k = data.strategikort; return k?.vid === 'efter' ? `<section class="pl-block" aria-labelledby="ld-strategier-rubrik"><h3 id="ld-strategier-rubrik">Strategier för lärande</h3><p>${medSaker(k.text)}</p>${strategikortensKnappar(k)}</section>` : ''; };
// Metodens saker i en text som länkar, som checklistans blad och affischer till Materialet för klassen på metodens sida.
const medSaker = (text: string) => sakernasText(text, data.saker, (s, t) => `<a href="${esc(s.adress)}" ${goat('checklistan', s.namn)}>${esc(t)}</a>`, esc);
const checkText = () => { const n = (aktiv.foljd.bockat ?? []).filter((i) => i < data.checklista.punkter.length).length; return `${stor(talText(n))} av ${talText(data.checklista.punkter.length)} klara.`; };

// ---------- Gick det? ----------
// Knapparna Ja och Inte än för en vecka. plats skiljer knapparna åt när samma vecka har dem på två ställen.
const gickKnappar = (v: { mandag: string; steg?: number | null; innehall: number }, plats: string, etikett: string) => {
  const svar = aktiv.foljd.gick?.[v.mandag];
  return `<div class="ld-gickval" role="group" aria-label="${esc(etikett)}"><button type="button" class="ld-gickknapp" data-gick="ja" data-mandag="${v.mandag}" data-plats="${plats}" aria-pressed="${svar === 'ja'}">${steg().sista(v) ? 'Ja, stegen är klara' : 'Ja, nästa steg'}</button><button type="button" class="ld-gickknapp" data-gick="inte" data-mandag="${v.mandag}" data-plats="${plats}" aria-pressed="${svar === 'inte'}">Inte än, en vecka till</button></div>`;
};
// Vad svaret på Gick det? gjorde med planen (gickDetsFoljd i standarden).
const gickText = (mandag: string) => gickDetsFoljd(plan, mandag, aktiv.foljd.gick?.[mandag], rubrikerna);
// Veckan med ett steg utan svar, överst i veckan läraren är i och i Efter, tills den har svar (granskningen 2026-10-30).
function obesvaradRuta(o: PlanVecka): string {
  const rad = stegRad(o);
  const namn = planveckansNamn(plan, o);
  const fragan = fraganFor(rad);
  return `<section class="ld-forra" aria-labelledby="ld-forra-rubrik"><h3 id="ld-forra-rubrik">${esc(`Gick det i ${namn.text}?`)}</h3><p class="ld-forra-steg">${esc(`Steg ${steg().nummer(o)}, ${stegNamn(o)}.`)}</p>${fragan ? `<p${rad?.fraga ? ' class="pl-fraga"' : ''}>${esc(fragan)}</p>` : ''}${gickKnappar(o, 'forra', `Gick det i ${namn.text}?`)}<p class="pl-hjalp">Svarar du Inte än, får steget en vecka till, och veckan efter blir den veckan. <button type="button" class="pl-textknapp" data-vy="${o.nr}">${esc(`Till ${namn.text}`)}</button></p></section>`;
}

// ---------- Veckans stund ----------
// Stödet vid frågorna (riggens standard, avsnitt 16): under Hur säker kärnans kryss i dåtid, och under Hur väl fungerar den
// Så syns lärandet i klassen. Frågorna står i den ordningen i alla metoder. Metodens egen text om skattningen säger samma
// sak som frågor, så den står i stället för listan när metoden har den, och båda står under Det du tänker med, så att
// stunden är kort (granskningen 2026-10-30).
const stodet = (j: number) => (j === 0 ? { rubrik: 'Kärnan, att tänka med', rader: data.karna.flatMap((k) => (k.kryss ? [k.kryss] : [])) } : { rubrik: data.larandet.rubrik, rader: data.larandet.rader });

function skattningen(j: number, w: LarDigSammanstallning['veckor'][number], i: number, s: LarDigSammanstallning, o: Set<string>, medGick: boolean): string {
  const sk = data.skattningar[j], linje = s.linjer[j], egen = mp.skattningar[j];
  if (!sk || !linje || !egen) return '';
  const g = { namn: sk.namn, skala: linje.skala, regler: linje.regler };
  const varde = aktiv.foljd.matt?.[sk.namn]?.[w.mandag];
  const regel = varde !== undefined ? regelnIVeckan(linje, i) : undefined;
  const regelRad = regel ? rader[regel.rad] : undefined;
  // Säger regelns råd en vecka till, står knappen i rutan, samma som Inte än i Gick det?.
  const v = plan.veckor.find((x) => x.mandag === w.mandag);
  const enVeckaTill = !!regelRad && medGick && !!v && /vecka till/.test(regelRad.vad) && aktiv.foljd.gick?.[w.mandag] !== 'inte' && !harInfortEfter(aktiv.foljd, w.mandag, plan);
  const regeln = regelRad ? `<div class="pl-paminn pl-regel"><p><b>${esc(mening(regelRad.nar))}</b> ${medSaker(veckornaMedDatum(mening(regelRad.vad), plan))}</p>${enVeckaTill ? `<p class="pl-andra-knappar"><button type="button" class="knapp sekundar liten" data-gick="inte" data-mandag="${w.mandag}" data-plats="regel-${j}">Ge steget en vecka till</button></p>` : ''}</div>` : '';
  const st = stodet(j);
  const underlag = `<details class="pl-fallut" data-ruta="stod-${j}"${oppen(o, `stod-${j}`)}><summary>Det du tänker med</summary>${sk.text ? `<p>${esc(sk.text)}</p>` : st.rader.length ? `<p class="pl-etikett">${esc(st.rubrik)}</p><ul class="ld-stodlista">${st.rader.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}<p class="pl-etikett">${esc(rader[egen.rad]?.nar ?? '')}</p><p>${esc(rader[egen.rad]?.vad ?? '')}</p></details>`;
  // Linjen när den har två kryss: ett kryss säger inget mer än knappen (som staplarna i Planera insatsen).
  const grafen = linjenRitas(linje) ? `<div class="pl-grafruta">${linjegraf(g, linje.varden, s.axel, { ring: varde === undefined ? i : undefined, undan: true, vidgas: true })}</div>${granslinjensText(linje.regler) ? `<p class="pl-not">${esc(granslinjensText(linje.regler))}</p>` : ''}` : '';
  const andar = skalansAndar(sk.namn, j);
  const andarna = andar ? skalansAndarRad(linje.skala, andar) : '';
  return `<section class="ld-skattning" aria-labelledby="ld-sk-${j}"><h4 id="ld-sk-${j}">${esc(sk.namn)}</h4>${skalansKnappar(g, w.mandag, varde)}${andarna}${regeln}${grafen}${underlag}</section>`;
}

function stunden(w: LarDigSammanstallning['veckor'][number], i: number, s: LarDigSammanstallning, o: Set<string>, medGick: boolean): string {
  const rubrik = '<h3 id="ld-stund-rubrik">Veckans stund</h3>';
  if (aktiv.foljd.avslut) return `<section class="ld-stund" id="ld-stund" aria-labelledby="ld-stund-rubrik">${rubrik}<p class="pl-not">Planen är avslutad. Det du förde in står i sammanställningen. Ångra avslutet överst, så skattar du igen.</p></section>`;
  if (!aktiv.sparad) return `<section class="ld-stund" id="ld-stund" aria-labelledby="ld-stund-rubrik">${rubrik}<p class="pl-not">Fyll i något under Före, eller spara planen där, så skattar du veckan här.</p><p><button type="button" class="pl-textknapp" data-vy="fore">Till Före</button></p></section>`;
  const harNagot = infordaDatum(aktiv.foljd, plan).includes(w.mandag);
  if (w.mandag > idag && !harNagot) return `<section class="ld-stund" id="ld-stund" aria-labelledby="ld-stund-rubrik">${rubrik}<p class="pl-not">${esc(`Veckans stund är i slutet av veckan, ${dagText(skolveckan(w.mandag).till)}.`)}</p></section>`;
  const rad = stegRad(w);
  const svar = aktiv.foljd.gick?.[w.mandag];
  const fragan = fraganFor(rad);
  const gick = medGick && rad ? `<div class="ld-gick"><h4>Gick det?</h4>${fragan ? `<p${rad.fraga ? ' class="pl-fraga"' : ''}>${esc(fragan)}</p>` : ''}${aktivaKlasser().length > 1 ? '<p class="pl-hjalp">Svara för det mesta av klasserna. Går en klass långsammare, skriv det i klassens rad längre ned, så står det vid klassen nästa vecka och i sammanställningen.</p>' : ''}${gickKnappar(w, 'stund', 'Gick det?')}${svar ? `<p class="pl-not">${esc(gickText(w.mandag))}</p>` : ''}</div>` : '';
  const mal = aktiv.val.mal ? `<p class="ld-malrad"><span class="pl-etikett">Ditt mål</span>${esc(mening(aktiv.val.mal))}</p>` : '';
  const kommentar = `<div class="ld-kommentar"><label class="pl-etikett" for="ld-kommentar">Din kommentar för veckan</label><textarea class="pl-falt pl-textfalt pl-brett" id="ld-kommentar" rows="3" maxlength="${KOMMENTARENS_LANGD}" data-kommentar="${w.mandag}">${esc(aktiv.foljd.kommentar?.[w.mandag] ?? '')}</textarea></div>`;
  const klasser = aktivaKlasser();
  const klassrader = klasser.length ? `<div class="ld-klasser"><p class="pl-etikett">Klasserna, om du vill</p><ul class="ld-klasslista">${klasser.map((k) => klassensRad(k, w.mandag, o, s.veckor[i - 1]?.mandag)).join('')}</ul></div>` : '<p class="pl-not">Skriv in dina klasser under Före, så kan du skatta och skriva en rad om varje klass. <button type="button" class="pl-textknapp" data-vy="fore">Till Före</button></p>';
  // Vad linjerna säger, för båda skattningarna i en rad sist i stunden (byggstenarna).
  const regelRader = [...new Set(s.linjer.flatMap((l) => l.regler.map((r) => r.rad)))];
  const reglerna = regelRader.length && s.linjer.some(linjenRitas) ? linjensRegler('linjerna', 'Vad linjerna säger', o.has('linjerna'), regelRader.map((r) => ({ etikett: rader[r]?.nar ?? '', html: esc(mening(rader[r]?.vad ?? '')) }))) : '';
  return `<section class="ld-stund" id="ld-stund" aria-labelledby="ld-stund-rubrik">${rubrik}<p class="pl-hjalp">Några minuter i slutet av veckan. Inget måste fyllas i.</p>${gick}${mal}${data.skattningar.map((_, j) => skattningen(j, w, i, s, o, medGick)).join('')}${kommentar}${klassrader}${reglerna}</section>`;
}

// En klass i veckans stund, som fälls ut (K-631; Niclas 2026-10-30: "skatta hur det gick för olika grupperna från 1-5 (om
// denne vill) per vecka"): frågan med fem knappar i samma form som de tio (skalansKnappar), skalans ändar, och klassens
// kommentar. Raden säger det som är infört när den är hopfälld: talet och om det finns en rad.
function klassensRad(k: { id: string; namn: string }, mandag: string, o: Set<string>, forra?: string): string {
  const t = aktiv.foljd.noter?.[mandag]?.[k.id] ?? '';
  const forraRaden = forra ? aktiv.foljd.noter?.[forra]?.[k.id] : undefined;
  const varde = aktiv.foljd.klassvarden?.[mandag]?.[k.id];
  const g = { namn: klassensFraga(k.namn), skala: KLASSERNAS_SKALA, regler: [] };
  const infort = `${varde !== undefined ? `<span class="ld-klass-har">${esc(`${varde} av ${KLASSERNAS_SKALA.till}`)}</span>` : ''}${t ? '<span class="ld-klass-har ld-klass-rad">En rad</span>' : ''}`;
  return `<li><details class="pl-fallut ld-klass" data-ruta="klass-${esc(k.id)}"${oppen(o, `klass-${k.id}`)}><summary><span class="ld-klassnamn">${esc(k.namn)}</span>${infort}</summary><p class="pl-etikett">${esc(g.namn)}</p>${forraRaden ? `<p class="pl-hjalp">${esc(`Förra veckan: ${forraRaden}`)}</p>` : ''}${skalansKnappar(g, mandag, varde, { klass: k.id })}${skalansAndarRad(KLASSERNAS_SKALA, KLASSERNAS_SKALA)}<label class="pl-etikett" for="ld-not-${esc(k.id)}">${esc(`Din kommentar om ${k.namn}`)}</label><textarea class="pl-falt pl-textfalt pl-brett ld-klassnot" id="ld-not-${esc(k.id)}" rows="2" maxlength="${KLASSNOTENS_LANGD}" data-klassnot="${mandag}|${esc(k.id)}">${esc(t)}</textarea></details></li>`;
}

// ---------- Mitt i ----------
// Mitt i stegen (K-631; Niclas 2026-10-30: "så vecka 3 skulle den klass som fått lägst tills dess lyfts fram med frågan vad
// läraren bör göra för att lyckas bättre med den klassen med hänvisning till metoden (om lämpligt)"): i veckan mitt i
// (larDigetsMittI i standarden) klassen med lägst snitt i veckorna före, med lärarens rader om den, frågan med ett fält som
// sparas i planen, och metodens När det glider och stöd när metoden har dem. Svaret står i sammanställningen.
function mittIRuta(s: LarDigSammanstallning, nr: number): string {
  const k = aktiv.sparad && s.mitt?.nr === nr && s.mitt.mandag <= idag ? s.mitt.klass : null;
  if (!k) return '';
  const noter = k.kommentarer.length ? `<p class="pl-etikett">${esc(`Dina rader om ${k.namn}`)}</p><ul class="ld-klassnoter">${k.kommentarer.map((x) => `<li><span class="ld-klassnamn">${esc(x.vecka)}</span> ${esc(x.text)}</li>`).join('')}</ul>` : '';
  const lankar = [data.glider ? `<a href="${esc(data.glider)}" ${goat('mitt-i', 'När det glider')}>När det glider</a>` : '', data.stod ? `<a href="${esc(data.stod.adress)}" ${goat('mitt-i', data.stod.rubrik)}>${esc(data.stod.rubrik)}</a>` : ''].filter(Boolean);
  return `<section class="ld-mitti" aria-labelledby="ld-mitti-rubrik"><h3 id="ld-mitti-rubrik">Mitt i stegen</h3><p>${esc(mittIText(k))}</p>${noter}<label class="pl-etikett" for="ld-mitti">${esc(mittIFragan(k.namn))}</label><textarea class="pl-falt pl-textfalt pl-brett" id="ld-mitti" rows="3" maxlength="${MITT_I_LANGD}" data-mitti="${esc(k.id)}">${esc(aktiv.foljd.mittI?.[k.id] ?? '')}</textarea>${lankar.length ? `<p class="pl-hjalp">Läs i metoden: ${uppraknat(lankar)}.</p>` : ''}</section>`;
}

// Metodens saker som ett steg namnger, och de som hör till veckan, som Strukturen, vecka 1, ur metodsakerna (STIL.md under
// Hänvisningar; granskningen inför lanseringen, F3). Lektionskortet och planeringsmallen har redan sina knappar.
function veckansSaker(v: PlanVecka, texter: string[]) {
  const forut = new Set(['lektionskortet', 'planeringsmallen']);
  return data.saker.filter((s) => !forut.has(s.namn.toLocaleLowerCase('sv')) && (texter.some((t) => sakdelar(t, [s]).some((x) => x.sak !== undefined)) || s.namn.split(/[,:]\s*/).some((led) => { const w = veckorI(led); return !!w && v.innehall >= w.fran && v.innehall <= w.till; })));
}

// ---------- Steget ----------
function steget(v: PlanVecka, utanVidare = false): string {
  const rad = stegRad(v);
  if (!rad) return '';
  const rutiner = data.rutiner.filter((r) => r.vecka === v.innehall);
  const rutinen = rutiner.map((r) => `<section class="pl-fokusruta ld-rutin"><h4>${esc(rutinensRubrik(r.namn, { kolon: true }))}</h4><p>${medSaker(r.vad)}</p>${r.steg.length ? `<ol>${r.steg.map((x) => `<li>${medSaker(x)}</li>`).join('')}</ol>` : ''}${r.forsta ? `<p><span class="pl-etikett">Första gången</span>${medSaker(r.forsta)}</p>` : ''}</section>`).join('');
  // Planens rader om en viss lektion, som Första lektionen, i veckan som har den lektionen.
  const passen = mp.passen.filter((x) => veckansPass(plan, v).some((p) => passetTraffas(x.nar, passetsLage(plan, p)))).map((x) => data.passen[x.rad]);
  const lektion = passen.map((p) => `<div class="pl-nasta"><p class="pl-etikett">${esc(/^första lektionen$/i.test(p.nar.trim()) ? data.forstaVeckan : stor(p.nar))}${p.kort ? `: ${esc(p.kort)}` : ''}</p><p>${medSaker(p.text)}</p></div>`).join('');
  // Metodens uppföljning i veckan, som besöken och arbetslagets möte, och det som görs varje lektion. Skattningarnas egna
  // rader står vid skattningen, och reglerna när de slår till. En rad som gäller en vecka står med veckan och inte med en dag,
  // eftersom besöket kan vara vilken lektion som helst, och besöket har observationsmallen (granskningen 2026-10-30).
  const egna = new Set(mp.skattningar.map((x) => x.rad));
  const veckans = plan.uppfoljning.filter((u) => !egna.has(u.rad) && u.typ !== 'villkor' && u.typ !== 'lopande' && u.tillfallen.some((t) => t.vecka === v.nr));
  const lopande = plan.uppfoljning.filter((u) => !egna.has(u.rad) && u.typ === 'lopande');
  const nar = (u: (typeof veckans)[number]) => (u.typ === 'vecka' || u.typ === 'intervall' || u.typ === 'sista-veckan' ? skolveckansText(v.mandag) : dagText(u.tillfallen.find((t) => t.vecka === v.nr)!.datum));
  const f = data.filer;
  const mallen = (u: (typeof veckans)[number]) => (rader[u.rad].id === 'observationerna' ? `<p class="pl-andra-knappar">${knapplank(f.observation.adress, 'Observationsmallen', 'observationsmall')}</p>` : '');
  const uppf = veckans.length || lopande.length ? `<section class="pl-block"><h4>Metodens uppföljning</h4>${etikettlista([...veckans.map((u) => ({ etikett: uppfNar(u.rad, nar(u)), html: esc(veckornaMedDatum(rader[u.rad].vad, plan)), efter: mallen(u) })), ...lopande.map((u) => ({ etikett: rader[u.rad].nar, html: esc(veckornaMedDatum(rader[u.rad].vad, plan)) }))])}</section>` : '';
  // Säger veckan att läraren väljer utfall (data.utfallen.veckor), leder en knapp till utfallen på metodens sida, där klassens
  // storlek räknas om.
  const utfallen = data.utfallen?.veckor.includes(rad.vecka) ? knapplank(data.utfallen.adress, data.utfallen.namn, 'utfallen') : '';
  // Ett verktyg som steget eller passet nämner har sin knapp med verktygets korta namn, och står inte en gång till bland sakerna.
  const stegetsTexter = [rad.rubrik, rad.eleverna ?? '', rad.roll ?? '', ...rutiner.flatMap((r) => [r.namn, r.vad, ...r.steg, r.forsta ?? ''])];
  const verktygen = data.verktyg.filter((x) => [...stegetsTexter, ...passen.map((p) => p.text)].some((t) => t.includes(x.namn)));
  const knappar = `<p class="pl-andra-knappar">${knapplank(f.lektionskort.adress, 'Lektionskortet', 'lektionskort')}${utfallen}${knapplank(f.planeringsmall.adress, 'Planeringsmallen', 'planeringsmall')}${veckansSaker(v, stegetsTexter).filter((s) => !verktygen.some((x) => x.adress === s.adress)).map((s) => knapplank(s.adress, s.namn, 'sak')).join('')}${verktygen.map((x) => knapplank(x.adress, x.knapp, `verktyg-${x.namn}`)).join('')}${knapplank(`${data.sida}#vecka-${v.innehall}`, 'Veckan i metoden', 'veckan-i-metoden')}</p>`;
  // Den första hela lektionen i veckan metoden säger, med metodens mening, när den kommer efter vecka 1 (strukturerna).
  const hela = data.forstaHela && data.forstaHela.vecka === v.innehall && !gangen(plan, v) ? `<div class="pl-nasta"><p class="pl-etikett">${esc(data.forstaHela.namn)}</p><p>${medSaker(data.forstaHela.text)}</p></div>` : '';
  // En vecka till för steget är samma sak som svaret Inte än i veckan, så att två knappar aldrig ger två veckor (granskningen
  // 2026-10-30). En vecka som är en vecka till kan tas bort i veckan före, där svaret står.
  const svar = aktiv.foljd.gick?.[v.mandag];
  const last = harInfortEfter(aktiv.foljd, v.mandag, plan);
  const fore = gangen(plan, v) > 0 ? plan.veckor[v.nr - 2] : undefined;
  const fransFore = fore && fore.innehall === v.innehall && aktiv.foljd.gick?.[fore.mandag] === 'inte' && !harInfortEfter(aktiv.foljd, fore.mandag, plan) ? fore : undefined;
  const forlang = aktiv.foljd.avslut ? '' : svar === 'inte'
    ? `<div class="ld-forlang"><p>${esc(gickText(v.mandag))}</p>${last ? '' : `<p class="pl-andra-knappar"><button type="button" class="pl-textknapp" data-gick="inte" data-mandag="${v.mandag}" data-plats="steget">Ta bort veckan till</button></p>`}</div>`
    : `<div class="ld-forlang">${fransFore ? `<p class="pl-andra-knappar"><button type="button" class="pl-textknapp" data-gick="inte" data-mandag="${fransFore.mandag}" data-plats="igen">Ta bort den här veckan</button></p>` : ''}<p class="pl-hjalp">${last ? 'Du har fört in något i en senare vecka, så steget står kvar som det är.' : 'Behöver klasserna eller du mer tid, svarar du Inte än i veckans stund, så får steget en vecka till.'}</p></div>`;
  return `<section class="ld-steget" aria-labelledby="ld-steget-rubrik"><h3 id="ld-steget-rubrik">Veckans steg</h3><div class="pl-elevmal"><span class="pl-etikett">Klasserna lär sig</span><p>${medSaker(rad.eleverna ?? '')}</p></div><div class="ld-drag"><span class="pl-etikett">Du övar</span><p>${medSaker(rad.roll ?? '')}</p></div>${rad.vidare && !utanVidare ? `<p class="ld-vidare">${esc(vidareMening(rad.vidare))}</p>` : ''}${rutinen}${lektion}${hela}${knappar}${uppf}${forlang}</section>`;
}

function renderaVecka(nr: number, s: LarDigSammanstallning, o: Set<string>): string {
  const v = plan.veckor[nr - 1];
  if (!v) return renderaFore(o);
  const i = s.veckor.findIndex((x) => x.mandag === v.mandag && !x.efter);
  const w = s.veckor[i];
  const rad = stegRad(v);
  const namn = planveckansNamn(plan, v);
  const igen = gangen(plan, v);
  const forra = nr > 1 ? `<button type="button" class="pl-textknapp" data-vy="${nr - 1}">‹ ${esc(planveckansNamn(plan, plan.veckor[nr - 2]).Text)}</button>` : '<button type="button" class="pl-textknapp" data-vy="fore">‹ Före</button>';
  const nasta = nr < plan.veckor.length ? `<button type="button" class="pl-textknapp" data-vy="${nr + 1}">${esc(planveckansNamn(plan, plan.veckor[nr]).Text)} ›</button>` : '<button type="button" class="pl-textknapp" data-vy="efter">Efter stegen ›</button>';
  const sist = nr === plan.veckor.length ? `<p class="pl-not">Efter det här steget ses arbetslaget. <button type="button" class="pl-textknapp" data-vy="efter">Mötet och Efter stegen</button></p>` : '';
  const huvud = `<p class="ld-stegnr">${esc(`Steg ${steg().nummer(v)} av ${steg().antal}${igen ? ', en vecka till' : ''}`)}</p><h2 id="ld-vy-rubrik" tabindex="-1">${esc(stegNamn(v) || namn.Text)}</h2><p class="ld-veckans-tid">${esc(`${stor(namn.text)}, ${spannKort(v.mandag, skolveckan(v.mandag).till)}.`)}</p>${tillSamman(s)}`;
  // Veckan med ett steg utan svar står överst i veckan läraren är i, tills den har svar.
  const o2 = obesvarad();
  const iVeckan = s.fas === 'under' && s.nu === v.nr;
  const ruta = iVeckan && o2 && o2.nr !== v.nr ? obesvaradRuta(o2) : '';
  // Steget först måndag till torsdag, och stunden först från fredag (granskningen 2026-10-30: stunden stod överst redan på
  // måndagen, och steget började 2 000 punkter ned). Ordningen följer bara dagen, så att stunden inte flyttar sig under
  // fingret när läraren skattar (användbarhetsprovet 2026-10-31, P1).
  const stundForst = aktiv.sparad && idag >= skolveckan(v.mandag).till;
  const stund = w ? stunden(w, i, s, o, true) : '';
  // När stunden står överst säger Gick det? stegets regel, så att raden Gå vidare när inte står två gånger (formgranskningen 2026-10-30).
  const delar = stundForst ? [stund, steget(v, !!stegRad(v)?.fraga || !!stegRad(v)?.vidare)] : [steget(v), stund];
  return `<section class="ld-fas ld-veckan" aria-labelledby="ld-vy-rubrik">${huvud}${ruta}${mittIRuta(s, nr)}${delar.join('')}${sist}<p class="pl-bladdra">${forra}${nasta}</p></section>`;
}

// ---------- Efter ----------
function renderaEfter(s: LarDigSammanstallning, o: Set<string>): string {
  const efterVeckor = s.veckor.map((w, i) => ({ w, i })).filter((x) => x.w.efter);
  const nu = s.fas === 'efter' ? efterVeckor.find((x) => x.w.nr === s.nu) : undefined;
  // En avslutad plan säger avslutet och lovar ingen uppföljning på datum efter stegen, som Planera insatsen säger att insatsen
  // är avslutad (sonnet-3 inför lanseringen, B12: efter ett avslut i steg 2 stod uppföljningen i v. 8, v. 13 och v. 23).
  const avslutad = !!s.avslut;
  const borjar = s.fas !== 'efter' && !avslutad ? `<p class="pl-not">${esc(`Efter stegen börjar ${kalendervecka(isoVecka(plan.efter).vecka)}, ${dagText(plan.efter)}.`)}</p>` : '';
  const o2 = s.fas === 'efter' ? obesvarad() : null;
  // Metodens uppföljning i stegens sista vecka, som arbetslagets möte efter de första veckorna, med veckan och datumet.
  const sistaSteget = plan.veckor[plan.veckor.length - 1];
  const motesRader = avslutad ? [] : plan.uppfoljning.filter((u) => u.typ !== 'villkor' && u.typ !== 'lopande' && !mp.skattningar.some((x) => x.rad === u.rad) && u.tillfallen.some((x) => x.vecka === sistaSteget?.nr));
  const motet = `<section class="pl-block ld-motet" aria-labelledby="ld-motet-rubrik"><h3 id="ld-motet-rubrik">Mötet med arbetslaget</h3><p>${esc(`Ta med sammanställningen till arbetslagets möte efter de första veckorna, och berätta vad du såg.${data.mote2Text ? ` ${data.mote2Text}` : ''}`)}</p>${motesRader.length ? uppfMedVeckan(motesRader) : ''}${data.reflektera.length ? `<p class="pl-etikett">Frågorna på mötet</p><ol class="ld-fragor">${data.reflektera.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}${aktiv.sparad ? `<p class="pl-andra-knappar"><button type="button" class="knapp sekundar ld-knapp" data-till-samman>Sammanställningen</button><button type="button" class="knapp sekundar ld-knapp" data-samman-pdf ${goat('sammanstallning-pdf', 'sammanställningen som pdf från mötet')}>${esc(pdfOrd('sammanställningen'))}</button></p>` : ''}</section>`;
  const stund = nu ? `<p class="ld-veckans-tid">${esc(`Skattningen ${nu.w.namn.text}.`)}</p>${stunden(nu.w, nu.i, s, o, false)}` : '';
  const hall = data.hallFast.rader.length ? `<section class="pl-block" aria-labelledby="ld-hall-rubrik"><h3 id="ld-hall-rubrik">${esc(data.hallFast.rubrik)}</h3>${etikettlista(data.hallFast.rader.map((r) => ({ etikett: r.sak, html: medSaker(r.text) })))}</section>` : '';
  const efterRader = avslutad ? [] : plan.uppfoljning.filter((u) => u.typ === 'efter' && u.tillfallen.length);
  const uppf = efterRader.length ? `<section class="pl-block" aria-labelledby="ld-uppf-rubrik"><h3 id="ld-uppf-rubrik">Metodens uppföljning efter stegen</h3>${uppfMedVeckan(efterRader)}</section>` : '';
  const las = data.lasMer.length ? `<section class="pl-block" aria-labelledby="ld-lasmer-rubrik"><h3 id="ld-lasmer-rubrik">Läs mer</h3><ul class="ld-lasmer">${data.lasMer.map((l) => `<li>${l.adress ? `<a href="${esc(l.adress)}" rel="noopener" ${goat('las-mer', l.titel)}>${esc(l.titel)}</a>` : `<span class="ld-lasmer-titel">${esc(l.titel)}</span>`}${l.upphov || l.ar ? `<span class="ld-upphov">${esc([l.upphov, l.ar].filter(Boolean).join(', '))}</span>` : ''}${l.text ? `<p>${esc(l.text)}</p>` : ''}</li>`).join('')}</ul></section>` : '';
  return `<section class="ld-fas ld-efter" aria-labelledby="ld-vy-rubrik"><h2 id="ld-vy-rubrik" tabindex="-1">Efter stegen</h2><p class="ld-ingress">${s.avslut ? esc(`${larDigetsAvslutText(s.avslut)} Det du förde in står i sammanställningen.`) : `Klasserna har rutinerna, och du har övat dragen. Nu skattar du ${esc(efterStegensTakt())}, så att linjerna visar hela din utveckling, och läser vidare när du vill.`}</p>${tillSamman(s)}${borjar}${o2 ? obesvaradRuta(o2) : ''}${stund}${motet}${hall}${strukturkortenEfter()}${strategikortenEfter()}${uppf}${las}<p class="pl-bladdra"><button type="button" class="pl-textknapp" data-vy="${plan.veckor.length}">‹ Sista steget</button><span></span></p></section>`;
}

// ---------- Sammanställningen ----------
function renderaSamman(s: LarDigSammanstallning) {
  const ruta = $('ld-samman');
  if (!aktiv.sparad || !s.harNagot) { ruta.hidden = true; ruta.innerHTML = ''; return; }
  const etiketter = s.axel;
  const kvar = larDigetsKvar(s, rubrikerna);
  // Stegen som läraren har tagit, med det som pågår, och stegen som är kvar, med samma meningar som i pdf:en (stegetsRad).
  const stegen = `<section class="pl-block"><h3>Stegen</h3>${s.stegen.length ? `<ul class="ld-stegen">${s.stegen.map((x) => `<li>${esc(stegetsRad(x, rubrikerna))}</li>`).join('')}</ul>` : ''}${kvar ? `<p class="pl-not">${esc(kvar)}</p>` : ''}${s.lov.length ? `<p class="pl-not">${esc(lovetsText(s.lov))}</p>` : ''}</section>`;
  const linjer = s.linjer.map((l) => { const r = larDigetsRegler({ ...s, linjer: [l] }, rader); return `<section class="pl-block"><h3>${esc(l.namn)}</h3>${l.varden.some((x) => x !== undefined) ? `<div class="pl-grafruta">${linjegraf({ namn: l.namn, skala: l.skala, regler: l.regler }, l.varden, etiketter, { undan: true, vidgas: true })}</div>${granslinjensText(l.regler) ? `<p class="pl-not">${esc(granslinjensText(l.regler))}</p>` : ''}` : '<p class="pl-not">Inte skattad än.</p>'}${r.map((x) => `<p class="pl-not">${esc(mening(x.text))}</p>`).join('')}${r.length ? etikettlista([...new Set(r.map((x) => x.rad))].map((rad) => ({ etikett: rader[rad]?.nar ?? '', html: esc(mening(rader[rad]?.vad ?? '')) }))) : ''}</section>`; }).join('');
  const kommentarer = s.kommenterade.length ? `<section class="pl-block"><h3>Kommentarerna</h3><ol class="ld-kommentarer">${s.kommenterade.map((w) => { const r = stegRad(w); return `<li><span class="pl-etikett">${esc(`${w.namn.Text}${r ? `, ${stegNamn(w)}` : ''}`)}</span>${w.gick && !w.efter ? `<p>${esc(gickDetSvaret(r?.fraga, w.gick))}</p>` : ''}${w.kommentar ? `<p>${esc(w.kommentar)}</p>` : ''}${w.noter.length ? `<ul class="ld-klassnoter">${w.noter.map((x) => `<li><span class="ld-klassnamn">${esc(x.namn)}</span> ${esc(x.text)}</li>`).join('')}</ul>` : ''}</li>`; }).join('')}</ol></section>` : '';
  ruta.innerHTML = `<h2 id="ld-samman-rubrik" tabindex="-1">Sammanställningen</h2><p class="pl-not">${esc(`${data.titel}${s.spann ? `, ${datumspann(s.spann.fran, s.spann.till)}` : ''}. Din utveckling med metoden, att ta med till arbetslaget.`)}</p>${s.avslut ? `<p class="ld-malrad"><span class="pl-etikett">Avslutet</span>${esc(larDigetsAvslutText(s.avslut))}</p>` : ''}${s.mal ? `<p class="ld-malrad"><span class="pl-etikett">Ditt mål</span>${esc(mening(s.mal))}</p>` : ''}${s.klasserna ? `<p class="ld-malrad"><span class="pl-etikett">Klasserna</span>${esc(s.klasserna)}</p>` : ''}${stegen}${linjer}${klasstabellen(s)}${mittSvaren(s)}${kommentarer}<p class="pl-not">${esc(SKATTNINGARNAS_GRANS)}</p><p class="pl-andra-knappar"><button type="button" class="knapp ld-knapp" data-samman-pdf ${goat('sammanstallning-pdf', 'sammanställningen som pdf')}>${esc(pdfOrd('sammanställningen'))}</button></p>`;
  ruta.hidden = false;
}

// Klasserna vecka för vecka (klassernasTabell i standarden): en rad per klass i listan och per borttagen klass med
// skattningar, märkt borttagen, veckorna med någon skattning som kolumner, och klassens snitt först. Talen står i cellerna, så att inget sägs bara med färg, och tabellen rullar i sidled i
// sin ruta i en smal telefon, utan att sidan gör det.
function klasstabellen(s: LarDigSammanstallning): string {
  const t = s.klasstabell;
  if (!t.rader.length) return '';
  const namn = t.veckor.map((i) => s.veckor[i].namn);
  const huvud = namn.map((n) => `<th scope="col"><span aria-hidden="true">${esc(n.kort)}<small>${esc(n.kalender)}</small></span><span class="visually-hidden">${esc(n.Text)}</span></th>`).join('');
  const raderna = t.rader.map((r) => `<tr><th scope="row">${esc(r.etikett)}</th><td class="ld-snitt">${r.snitt === null ? '<span class="visually-hidden">inte skattad</span>' : esc(medDecimaler(r.snitt))}</td>${r.varden.map((x) => `<td>${x ?? '<span class="visually-hidden">inte skattad</span>'}</td>`).join('')}</tr>`).join('');
  return `<section class="pl-block"><h3>Klasserna vecka för vecka</h3><p class="pl-not">${esc(klassernasSkalaText())}</p><div class="ld-tabellruta"><table class="ld-tabell ld-klasstabell"><thead><tr><th scope="col">Klassen</th><th scope="col">Snitt</th>${huvud}</tr></thead><tbody>${raderna}</tbody></table></div></section>`;
}
// Svaren Mitt i, under en rubrik med klassen, med vad klassen hade i veckorna före.
const mittSvaren = (s: LarDigSammanstallning) => s.mittSvar.map((x) => `<section class="pl-block"><h3>${esc(`Mitt i: ${x.namn}`)}</h3>${x.hittills ? `<p class="pl-not">${esc(x.hittills)}</p>` : ''}<p class="pl-etikett">${esc(mittIFragan(x.namn))}</p><p>${esc(x.text)}</p></section>`).join('');

// ---------- Planen som fil ----------
function renderaKopia() {
  $('ld-ladda-ner').hidden = !aktiv.sparad;
  $('ld-ta-bort').hidden = !aktiv.sparad;
  const alder = kopiansAlder(aktiv.kopia, idag);
  const text = !aktiv.sparad ? 'Spara planen, så finns den i den här webbläsaren och går att ladda ner som fil. Har du laddat ner en plan på en annan dator? Öppna den här.'
    : alder === null ? 'Det du för in finns bara i den här webbläsaren. Ladda ner planen och lägg filen bland skolans filer, så finns den kvar och går att öppna på en annan dator.'
    : kopiansText(aktiv.kopia!, idag);
  // I appen säger texten varför filen skyddar planen, som i Planera insatsen (filensSkal); i Safari säger beskedet överst det.
  const skal = aktiv.sparad ? filensSkal(sidansAdress()) : '';
  $('ld-kopia-text').textContent = `${text}${skal ? ` ${skal}` : ''}`;
}
/** Sidans adress för vägen ut ur en apps webbläsare och Kopiera länken: planen följer inte med, eftersom den bara finns här. */
function sidansAdress() { return `${location.origin}${location.pathname}`; }

// ---------- Ritningen ----------
// Fokus står kvar på samma sak när vyn ritas om: fältet, knappen i skalan, svaret eller veckan i remsan.
function fokusnyckel(): string | null {
  const a = document.activeElement as HTMLElement | null;
  if (!a || a === document.body) return null;
  if (a.dataset.matt) return `[data-matt="${a.dataset.matt}"][data-instrument="${CSS.escape(a.dataset.instrument ?? '')}"][aria-label="${CSS.escape(a.getAttribute('aria-label') ?? '')}"]`;
  if (a.dataset.gick) return `[data-gick="${a.dataset.gick}"][data-mandag="${a.dataset.mandag}"][data-plats="${CSS.escape(a.dataset.plats ?? '')}"]`;
  for (const attr of ['data-vy', 'data-lovvecka', 'data-mal']) if (a.hasAttribute(attr)) return `[${attr}="${CSS.escape(a.getAttribute(attr) ?? '')}"]`;
  return a.id ? `#${CSS.escape(a.id)}` : null;
}
function rendera(fokusRubrik = false) {
  const nyckel = fokusRubrik ? null : fokusnyckel();
  const o = oppnaRutor();
  const s = samman();
  if (typeof visa === 'number' && !plan.veckor[visa - 1]) visa = plan.veckor.length;
  renderaLage(s);
  renderaRemsa(s);
  $('ld-vyn').innerHTML = visa === 'fore' ? renderaFore(o) : visa === 'efter' ? renderaEfter(s, o) : renderaVecka(visa, s, o);
  renderaSamman(s);
  renderaKopia();
  const el = fokusRubrik ? document.getElementById('ld-vy-rubrik') : nyckel ? document.querySelector<HTMLElement>(nyckel) : null;
  el?.focus({ preventScroll: !fokusRubrik });
  // Bocken ritas fram en gång, när läraren just har avslutat planen.
  nyssAvslutad = false;
}
function tillVy(vy: Vy) {
  visa = vy;
  rendera(true);
  $('ld-remsa').scrollIntoView({ block: 'start' });
}

// ---------- Trycken ----------
$('ld-remsa').addEventListener('click', (e) => {
  const b = knappen(e, '[data-vy]');
  if (b) tillVy(b.dataset.vy === 'fore' || b.dataset.vy === 'efter' ? b.dataset.vy : Number(b.dataset.vy));
});
// Svaret på Gick det?, ur standardens svaraGickDet: Inte än ger steget en vecka till och aldrig två för samma svar, och ett
// annat svar tar bort den igen. Rådets knapp för en vecka till i veckans stund är samma svar. Beskedet säger vad planen gjorde.
function gickDet(mandag: string, svar: 'ja' | 'inte') {
  const fore = aktiv.foljd.gick?.[mandag];
  let r: ReturnType<typeof svaraGickDet> | undefined;
  andra(() => {
    r = svaraGickDet(plan, aktiv.val, aktiv.foljd, mandag, svar);
    aktiv.val = r.val;
    aktiv.foljd = { ...aktiv.foljd, gick: r.gick };
  }, () => {
    const ny = aktiv.foljd.gick?.[mandag];
    if (r?.last && (ny === 'inte' || fore === 'inte')) return 'Svaret är sparat. Planen ändras inte, eftersom du har fört in något i en senare vecka.';
    if (!ny) return fore === 'inte' && r?.andrad ? 'Svaret och veckan till är borttagna.' : 'Svaret är borttaget.';
    return `${fore === 'inte' && r?.andrad ? 'Veckan till är borttagen. ' : ''}${gickText(mandag)}${ny === 'inte' && r?.andrad ? ' Veckorna efter flyttar fram.' : ''}`;
  }, true);
}
// Före sparas av sig själv vid första ändringen (granskningen 2026-10-30: det som fylldes i före Spara planen försvann när
// läraren läste metoden och kom tillbaka). Sedan sparas varje ändring, och det som skrivs en stund efter sista tangenten.
function sparaForet(snart = false) {
  // Målet och klasserna står i sammanställningen, så den ritas om med varje ändring i Före (Codex 2026-10-31, fynd 8).
  renderaSamman(samman());
  if (aktiv.sparad) { if (snart) sparaSnart(); else spara(); return; }
  aktiv.sparad = true;
  if (!spara()) { aktiv.sparad = false; return; }
  uppdateraSumma();
  document.getElementById('ld-spara-rad')?.remove();
  const s = samman();
  renderaLage(s); renderaRemsa(s); renderaKopia();
  visaBesked('Planen är sparad i den här webbläsaren.');
}
$('ld-vyn').addEventListener('click', (e) => {
  const b = knappen(e);
  if (!b || b.disabled) return;
  if (b.dataset.vy) { tillVy(b.dataset.vy === 'fore' || b.dataset.vy === 'efter' ? b.dataset.vy : Number(b.dataset.vy)); return; }
  if (b.hasAttribute('data-spara')) {
    skrivKlart();
    aktiv.sparad = true;
    if (!spara()) { aktiv.sparad = false; return; }
    visa = standardVy();
    rendera(true);
    visaBesked('Planen är sparad i den här webbläsaren. Ladda ner den som fil ibland, så finns den kvar.');
    return;
  }
  if (b.dataset.mal !== undefined) {
    const mal = aktiv.val.mal === b.dataset.mal ? undefined : rentMal(b.dataset.mal) || undefined;
    aktiv.val = { ...aktiv.val, ...(mal ? { mal } : {}) };
    if (!mal) delete aktiv.val.mal;
    const falt = document.getElementById('ld-mal') as HTMLInputElement | null;
    if (falt) falt.value = mal ?? '';
    for (const x of document.querySelectorAll<HTMLButtonElement>('[data-mal]')) x.setAttribute('aria-pressed', String(x.dataset.mal === mal));
    sparaForet();
    return;
  }
  if (b.dataset.lovvecka) {
    const k = b.dataset.lovvecka;
    andra(() => { const lov = new Set(aktiv.val.lov ?? []); if (lov.has(k)) lov.delete(k); else lov.add(k); aktiv.val = { ...aktiv.val, lov: [...lov].sort() }; }, () => ((aktiv.val.lov ?? []).includes(k) ? 'Veckan är lov, och det som kommer efter flyttar fram.' : 'Lovet är borttaget.'), true);
    return;
  }
  if (b.dataset.gick && b.dataset.mandag) { gickDet(b.dataset.mandag, b.dataset.gick === 'inte' ? 'inte' : 'ja'); return; }
  // Klassens skattning i veckans stund, och lärarens skattningar: samma tal igen tar bort det (medVardet i standarden).
  if (b.dataset.klass && b.dataset.matt) {
    const id = b.dataset.klass, mandag = b.dataset.matt, n = Number(b.textContent);
    andra(() => { aktiv.foljd = { ...aktiv.foljd, klassvarden: medVardet(aktiv.foljd.klassvarden, mandag, id, aktiv.foljd.klassvarden?.[mandag]?.[id] === n ? undefined : n) }; });
    return;
  }
  if (b.dataset.matt && b.dataset.instrument) {
    const namn = b.dataset.instrument, mandag = b.dataset.matt, n = Number(b.textContent);
    andra(() => { aktiv.foljd = { ...aktiv.foljd, matt: medVardet(aktiv.foljd.matt, namn, mandag, aktiv.foljd.matt?.[namn]?.[mandag] === n ? undefined : n) }; });
    return;
  }
  if (b.hasAttribute('data-till-samman')) { tillSammanstallningen(); return; }
  if (b.hasAttribute('data-samman-pdf')) void sammanstallningenSomPdf(b);
});
$('ld-vyn').addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.bock !== undefined) {
    const i = Number(t.dataset.bock);
    const bockat = new Set(aktiv.foljd.bockat ?? []);
    if (t.checked) bockat.add(i); else bockat.delete(i);
    aktiv.foljd = { ...aktiv.foljd, bockat: [...bockat].sort((a, b) => a - b) };
    const antal = document.getElementById('ld-check-antal');
    if (antal) antal.textContent = checkText();
    sparaForet();
    return;
  }
  if (t.id === 'ld-start') {
    const m = t.value;
    if (!arDatum(m)) return;
    andra(() => { if (sistaInfort(aktiv.foljd, plan)) return false; aktiv.val = larDigetsStart(aktiv.val, m); }, () => forstaLektionensMening(data.startNamn, forstaLektionen(plan) ?? m, idag, plan.veckor[0]?.mandag ?? m));
    return;
  }
  if (t.id === 'ld-klasser') lasKlasslistan(t as unknown as HTMLTextAreaElement);
});
// Klasslistan räknas när läraren lämnar fältet, och när sidan lämnas med markören kvar i det (Codex 2026-10-31, fynd 6).
let klasslistanAndrad = false;
function lasKlasslistan(t: HTMLTextAreaElement) {
  klasslistanAndrad = false;
    // Klasserna räknas när läraren lämnar fältet, så att ett namn som skrivs inte blir en klass bokstav för bokstav. Fältet
    // visar sedan listan som sparades, och raden under säger det som inte kom med (granskningen 2026-10-30).
    const forut = aktiv.foljd.klasser ?? [];
    // Det läraren skrev läses först, så att beskedet säger det som inte kom med, också sedan fältet visar listan som sparades
    // (verifieringen inför lanseringen, B15: beskedet läste den rensade listan och var alltid tomt).
    const skrivet = t.value;
    // En klass med en rad, en skattning eller ett svar Mitt i står kvar som borttagen (klassenHarNagot i standarden).
    const klasser = klasserUrText(skrivet, forut, nyttId, (id) => klassenHarNagot(aktiv.foljd, id));
    aktiv.foljd = { ...aktiv.foljd, ...(klasser.length ? { klasser } : {}) };
    if (!klasser.length) delete aktiv.foljd.klasser;
    t.value = aktivaKlasser().map((k) => k.namn).join('\n');
    const not = document.getElementById('ld-klasser-not');
    const text = klasslistansBesked(skrivet);
    if (not) { not.textContent = text; not.hidden = !text; }
  sparaForet();
  // En klass som lämnar listan sägs med Ångra, ur samma rot som elevlistan i Planera insatsen (borttagnasBesked), och beskedet
  // säger att det som förts in står kvar i sammanställningen, märkt borttagen, eftersom den är lärarens egen logg
  // (verifieringen 4 inför lanseringen, fynd 2: 5A med en skattning togs bort utan besked och utan Ångra). Ångra lägger
  // tillbaka listan som den var.
  const borta = forut.filter((k) => !k.borta && !aktivaKlasser().some((x) => x.id === k.id));
  const id = aktiv.id;
  if (borta.length) visaBesked(borttagnasBesked(borta.map((k) => ({ namn: k.namn, harInfort: klassenHarNagot(aktiv.foljd, k.id) })), { klasser: true }), { text: 'Ångra', kvar: true, gor: () => {
    if (aktiv.id !== id) return;
    aktiv.foljd = { ...aktiv.foljd, klasser: forut };
    spara(); rendera();
    visaBesked('Listan med klasserna är tillbaka.');
  } });
}
$('ld-vyn').addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (t.id === 'ld-klasser') { klasslistanAndrad = true; return; }
  if (t.id === 'ld-mal') {
    const mal = rentMal(t.value);
    if (mal) aktiv.val = { ...aktiv.val, mal }; else delete aktiv.val.mal;
    for (const x of document.querySelectorAll<HTMLButtonElement>('[data-mal]')) x.setAttribute('aria-pressed', String(x.dataset.mal === mal));
    sparaForet(true);
    return;
  }
  if (t.dataset.kommentar) {
    const kommentar = { ...(aktiv.foljd.kommentar ?? {}) };
    if (t.value.trim()) kommentar[t.dataset.kommentar] = t.value.slice(0, KOMMENTARENS_LANGD); else delete kommentar[t.dataset.kommentar];
    aktiv.foljd = { ...aktiv.foljd, kommentar };
    sparaSnart();
    return;
  }
  if (t.dataset.klassnot) {
    const [mandag, id] = t.dataset.klassnot.split('|');
    const noter = { ...(aktiv.foljd.noter ?? {}) };
    const veckan = { ...(noter[mandag] ?? {}) };
    if (t.value.trim()) veckan[id] = t.value.slice(0, KLASSNOTENS_LANGD); else delete veckan[id];
    if (Object.keys(veckan).length) noter[mandag] = veckan; else delete noter[mandag];
    aktiv.foljd = { ...aktiv.foljd, noter };
    const har = t.closest('details')?.querySelector('summary');
    if (har) { const finns = har.querySelector('.ld-klass-rad'); if (t.value.trim() && !finns) har.insertAdjacentHTML('beforeend', '<span class="ld-klass-har ld-klass-rad">En rad</span>'); if (!t.value.trim()) finns?.remove(); }
    sparaSnart();
    return;
  }
  // Svaret Mitt i för klassen, som sparas med planen.
  if (t.dataset.mitti) {
    aktiv.foljd = { ...aktiv.foljd, mittI: { ...(aktiv.foljd.mittI ?? {}), [t.dataset.mitti]: t.value.slice(0, MITT_I_LANGD) } };
    if (!t.value.trim()) { const { [t.dataset.mitti]: _, ...utan } = aktiv.foljd.mittI ?? {}; aktiv.foljd = { ...aktiv.foljd, mittI: utan }; }
    sparaSnart();
  }
});
// Sammanställningen ritas om när läraren lämnar ett fält, så att kommentaren står där.
$('ld-vyn').addEventListener('focusout', (e) => { const t = e.target as HTMLElement; if (t.dataset.kommentar || t.dataset.klassnot || t.dataset.mitti) { skrivKlart(); renderaSamman(samman()); } });
$('ld-samman').addEventListener('click', (e) => { const b = knappen(e, '[data-samman-pdf]'); if (b) void sammanstallningenSomPdf(b); });
// Till sammanställningen, från veckan, Efter och raden överst.
function tillSammanstallningen() { $('ld-samman').scrollIntoView({ block: 'start' }); $('ld-samman-rubrik')?.focus({ preventScroll: true }); }
// Raden överst: Avsluta planen öppnar och stänger formuläret, ett förslag skriver anledningen i fältet, och avslutet ångras.
vidTryck($('ld-lage'), (b) => {
  const gor = b.dataset.gor;
  if (gor === 'avsluta' || gor === 'avsluta-avbryt') {
    avslutaOppen = gor === 'avsluta' && !avslutaOppen;
    if (!avslutaOppen) avslutaUtkast = '';
    renderaLage(samman());
    document.querySelector<HTMLElement>(avslutaOppen ? '#ld-avsluta [data-anledning]' : '#ld-lage [data-gor="avsluta"]')?.focus();
    return;
  }
  if (gor === 'avsluta-klar') { avslutaKlar(); return; }
  if (gor === 'angra-avslut') { angraAvslutet(); return; }
  if (b.hasAttribute('data-till-samman')) { tillSammanstallningen(); return; }
  const falt = document.getElementById('ld-avsluta-not') as HTMLInputElement | null;
  const anledning = falt ? anledningenIFaltet(b, falt) : null;
  if (anledning !== null) avslutaUtkast = anledning;
});
$('ld-lage').addEventListener('input', (e) => { const f = e.target as HTMLInputElement; if (f.id === 'ld-avsluta-not') { avslutaUtkast = f.value; markeraAnledningen(f); } });

// Sammanställningen som pdf (src/scripts/lardigpdf.ts), som i Planera insatsen: den skrivs ut där webbläsaren kan skriva ut
// en pdf direkt, och laddas annars ner (visaPdf). Den räknas när läraren trycker, så att det senast ifyllda kommer med.
async function sammanstallningenSomPdf(knapp: HTMLButtonElement) {
  skrivKlart();
  knapp.setAttribute('aria-busy', 'true');
  try {
    const bytes = await larDigPdf(samman(), { metod: data.titel, steg: rubrikerna, fragor: data.progression.rader.map((r) => r.fraga ?? ''), reflektera: data.reflektera, uppfoljning: rader }, idag);
    await visaPdf(bytes, filnamnet('sammanstallning', { samling: 'metoder', metod: data.id, datum: idag }));
  } catch { visaBesked('Pdf:en gick inte att göra i den här webbläsaren.'); }
  knapp.removeAttribute('aria-busy');
}

// ---------- Ladda ner, öppna och ta bort ----------
$('ld-ladda-ner').addEventListener('click', () => {
  skrivKlart();
  aktiv.kopia = idag;
  const egen = sparadAv();
  spara();
  laddaNer(new Blob([planfilen(egen, PLANERA.version)], { type: 'application/json' }), filnamnet('plan', { samling: 'metoder', metod: data.id, datum: idag }));
  renderaKopia();
  visaBesked('Planen är nedladdad. Lägg filen bland skolans filer, så går den att öppna på en annan dator.');
});
$<HTMLInputElement>('ld-fil').addEventListener('change', async (e) => {
  skrivKlart();
  // Flera filer eller en zip läses med samma rot som i Planera insatsen, och sidan laddas om med beskedet (planenUrFaltet).
  const valet = await planenUrFaltet(e, BESKED, 'metoder');
  if (!valet) return;
  const last = valet.last;
  if (!last) { visaBesked('Filen är inte en nedladdad plan.'); return; }
  const p = last.plan;
  // En plan för en annan metod, eller i Stödundervisning, sparas och öppnas på sin sida med filens varningar, och en fil som
  // skulle ersätta en nyare plan frågar först, med samma rot som i Planera insatsen (oppnaPaSinSida; rotprovet 2026-10-31, R4).
  if (samlingen(p) !== 'metoder' || p.metod !== data.id) {
    const dar = lasPlaner().planer.find((x) => x.id === p.id);
    const tillSidan = () => { if (!oppnaPaSinSida(p, last.varningar)) visaBesked(lagringenArNyare() ? NYARE_VERSION : 'Planen i filen gick inte att spara i den här webbläsaren.'); };
    if (dar && filenErsatterNyare(dar, p)) { visaBesked(filensFraga(dar, p), { text: 'Ersätt med filen', gor: tillSidan }); return; }
    tillSidan();
    return;
  }
  // En plan per lärare och metod: planen i filen ersätter metodens plan i webbläsaren, och Ångra tar tillbaka den.
  const valen = lasVal(p.val)?.val;
  if (!valen) { visaBesked('Filen är inte en nedladdad plan.'); return; }
  p.schema = schemaAv(planera(mp, valen), valen);
  const forut = lasPlaner().planer;
  const finns = minaPlaner()[0];
  // En fil som skulle ersätta en plan som har ändrats efter den frågar först, som i Planera insatsen (filenErsatterNyare).
  if (finns && filenErsatterNyare(finns, p)) { visaBesked(filensFraga(finns, p), { text: 'Ersätt med filen', gor: () => oppnaFilen(p, last.varningar, forut) }); return; }
  oppnaFilen(p, last.varningar, forut);
});
// En plan som har ändrats utanför fliken visas, i vyn som visades eller i planens egen (andra flikar och en fil).
function visaPlanen(p: SparadPlan, vy: Vy) { aktiv = franSparad(p); rakna(); visa = vy; visaBesked(''); rendera(); }
// Planen ur filen ersätter metodens plan i webbläsaren, och Ångra tar tillbaka den.
function oppnaFilen(p: SparadPlan, varningar: string[], forut: SparadPlan[]) {
  if (!skrivPlaner([p, ...forut.filter((x) => !(samlingen(x) === 'metoder' && x.metod === data.id))])) { visaBesked(lagringenArNyare() ? NYARE_VERSION : 'Planen i filen gick inte att spara i den här webbläsaren.'); return; }
  const gamla = aktiv;
  aktiv = franSparad(p);
  rakna();
  visa = standardVy();
  rendera(true);
  visaBesked([OPPNAD_UR_FILEN, ...varningar].join(' '), { text: 'Ångra', gor: () => { bytPlanen(p.id, forut.find((x) => samlingen(x) === 'metoder' && x.metod === data.id)); aktiv = gamla; rakna(); visa = standardVy(); rendera(true); visaBesked('Planen är som före filen.'); } });
}
$('ld-ta-bort').addEventListener('click', () => {
  skrivKlart();
  const forut = lasPlaner().planer;
  if (!skrivPlaner(forut.filter((x) => x.id !== aktiv.id))) { visaBesked('Planen gick inte att ta bort i den här webbläsaren.'); return; }
  const gamla = aktiv;
  aktiv = nyAktiv();
  rakna();
  visa = 'fore';
  rendera(true);
  visaBesked('Planen är borttagen ur den här webbläsaren.', { text: 'Ångra', gor: () => { bytPlanen(undefined, forut.find((x) => x.id === gamla.id)); aktiv = gamla; rakna(); visa = standardVy(); rendera(true); visaBesked('Planen är tillbaka.'); } });
});

// En annan flik med samma plan (vidAndraFlikar i lagringen, som i Planera insatsen): det den sparar visas här, och en plan som
// tas bort där stängs här (Codex 2026-10-31, fynd 2).
vidAndraFlikar({
  aktiv: () => aktiv, minne, vantar: () => skrivTimer !== 0 || klasslistanAndrad,
  borta: (besked) => { const egna = minaPlaner(); aktiv = egna.length ? franSparad(egna[0]) : nyAktiv(); rakna(); visa = standardVy(); rendera(true); visaBesked(besked); },
  andrad: (p) => visaPlanen(p, visa),
});

// Ett nytt dygn medan sidan står öppen, som i en telefon över natten: det som väntar sparas, och planen räknas och ritas om med
// dagens datum, så att läget, veckan och Avsluta i dag gäller i dag (vidNyttDygn; rotprovet 2026-10-31, Codex fynd 3).
vidNyttDygn((ny) => { skrivKlart(); idag = ny; rakna(); rendera(); }, idag);

// ---------- Start ----------
rendera();
// Webbläsarens besked överst, med samma byggsten som Planera insatsen (K-644): i en apps egen webbläsare vägen ut och Kopiera
// länken, och i Safari i iPhone och iPad att planen görs i appen Metodbanken. Inget när webbläsaren inte sparar.
{
  // En avslutad plan behöver inte beskedet om appen, och när beskedet om Safari står är dess knapp vägen till appen, så att
  // länken i huvudet inte står en gång till (granskningen inför lanseringen, B7 och B8).
  const rad = lasPlaner().ok && !aktiv.foljd.avslut ? webblasarensRad({ forled: 'ld', adress: sidansAdress, goat }) : null;
  if (rad) notisen('ld-notis')(rad.text, rad.knappar);
  if (rad?.slag === 'safari') document.querySelector<HTMLElement>('.ld .app-lank')?.setAttribute('hidden', '');
  webblasarensTryck($('ld-notis'), { forled: 'ld', adress: sidansAdress, visaBesked });
}
{
  let lamnat = '';
  try { lamnat = sessionStorage.getItem(BESKED) ?? ''; sessionStorage.removeItem(BESKED); } catch { /* utan lagring */ }
  if (lamnat) visaBesked(lamnat);
}
