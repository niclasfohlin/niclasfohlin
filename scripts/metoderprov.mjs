#!/usr/bin/env node
// Metoderprovet (K-621): undervisningsmetodernas sidor i det byggda dist, i Chrome, som en lärare möter dem. Varje sida
// under /metoder/ (banken, metodens sida och Lär dig metoden) prövas i 320 och 360 punkters bredd med allt utfällt: ingen
// sida rullar i sidled (designgranskningen 2026-10-30: planeringsbladet gjorde metodens sida 343 punkter bred i 320, och
// utskriftsformat.mjs prövar bara Stödundervisning). På metodens sida och lathundens sida leder varje ankare till ett
// element och varje fil som sidan länkar till finns, och på metodens sida står delarna i standardens ordning
// (UNDERVISNINGSMETODENS_DELAR). Lathundens sida säger det lathundens pdf säger (K-632): varje mening på sidan står i
// public/metoder/<id>-lathund.pdf, som sajten gör ur sin PowerPoint-fil sedan K-637 (scripts/lathund-pdf.mjs), och pdf:ens sidfot leder till sidan, som finns för varje metod med lathunden (granskningen
// 2026-10-30: sidfoten ledde till en adress som gav 404). Metodens saker (STIL.md under Hänvisningar,
// undervisningsmetodensSaker i src/lib/undervisningsmetod.ts) är länkar där metodens sida nämner dem, inget namn ser ut som en
// sak som metoden inte har (olankadeSaker i standarden), och varje sak har en knapp under sig vars fil finns, som planprov.mjs
// prövar Stödundervisnings saker. Lagningen inför lanseringen (2026-10-31) gav formens spärrar: i bilaga A står varje fils
// knapp en gång och nedladdningsrutan har bara standardens rader i båda samlingarna, faktarutans material leder till metodens saker, lathundens pdf
// har en knapp överst, rutnäten med kort och delar slutar inte med en tom plats, kortens och remsans namn avstavas på
// svenska, bladen står i hela bredden i telefonen och samlade bredvid bilden på datorn, lathundens kort rymmer sina ord,
// utfallen räknas om för klassens antal, en plan i Lär dig metoden tar knappen med samma länk ur huvudet, och i banken går
// Forskningsstödets lägen ihop med Visar, ett ord väljer bara sitt läge och Välj heter efter zip-filen den ger. Bankens kort
// och rutan nederst har Stödundervisnings Drive och Word, och Drive sparar rätt filer med inloggningen härmad (2026-10-31).
// Körs i npm run validera.
//
//   node scripts/metoderprov.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import JSZip from 'jszip';
import { UNDERVISNINGSMETODENS_DELAR, NEDLADDNINGENS_RADER, KNAPPARNAS_NAMN, meningarna, sakdelar, olankadeSaker, lathundensSidor, utfallensGranser, slugAv } from '../src/lib/standard/index.js';
import { ren, utanHuvudOchFot, pdfText } from './textjamforelse.mjs';
import { MINIBILDEN, metodensMinibilder, sakensNamn } from '../src/lib/bladkortfiler.js';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(rot, 'dist');
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!existsSync(join(dist, 'metoder'))) { console.log('metoderprov: inga sidor under /metoder i dist, inget att pröva.'); process.exit(0); }
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));

// Sidorna: banken, och varje metods sida med dess undersidor.
const sidor = ['/metoder'];
for (const e of readdirSync(join(dist, 'metoder'), { withFileTypes: true })) {
  if (!e.isDirectory() || !existsSync(join(dist, 'metoder', e.name, 'index.html'))) continue;
  sidor.push(`/metoder/${e.name}`);
  for (const u of readdirSync(join(dist, 'metoder', e.name), { withFileTypes: true })) if (u.isDirectory() && existsSync(join(dist, 'metoder', e.name, u.name, 'index.html'))) sidor.push(`/metoder/${e.name}/${u.name}`);
}
const metodsidor = sidor.filter((s) => /^\/metoder\/[^/]+$/.test(s));
const lathundsidor = sidor.filter((s) => /^\/metoder\/[^/]+\/lathund$/.test(s));
const fel = [];
let provadeSaker = 0;

// Det som går att pröva i HTML: ankarna, filerna och delarnas ordning.
for (const s of [...metodsidor, ...lathundsidor]) {
  const html = readFileSync(join(dist, s, 'index.html'), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/href="#([^"]+)"/g)) if (!ids.has(decodeURIComponent(m[1]))) fel.push(`${s}: länken #${m[1]} leder inte till något element`);
  for (const m of html.matchAll(/(?:href|src|data)="(\/metoder\/[^"?#]+\.(?:pdf|docx|pptx|png|svg|webp|mp4|zip))(?:\?[^"]*)?"/g)) if (!existsSync(join(dist, decodeURIComponent(m[1])))) fel.push(`${s}: filen ${m[1]} saknas`);
  if (lathundsidor.includes(s)) {
    // Lathundens saker leder till metodens sida, och ankaret står där.
    const metod = s.replace(/\/lathund$/, '');
    const metodens = new Set([...readFileSync(join(dist, metod, 'index.html'), 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const m of html.matchAll(new RegExp(`href="${metod}#([^"]+)"`, 'g'))) if (!metodens.has(decodeURIComponent(m[1]))) fel.push(`${s}: länken ${metod}#${m[1]} leder inte till något element på metodens sida`);
    provaSakerna(s, html, ids);
    // Lathundens pdf har en knapp överst, den stora, och inte en till i filvalet bredvid (lagningen inför lanseringen, A10).
    const huvudet = html.slice(html.indexOf('<header class="lathund-huvud"'), html.indexOf('</header>', html.indexOf('<header class="lathund-huvud"')));
    const pdfKnappar = huvudet.split(`href="/metoder/${metod.split('/')[2]}-lathund.pdf`).length - 1;
    if (pdfKnappar !== 1) fel.push(`${s}: lathundens pdf har ${pdfKnappar} knappar överst, ska ha en (Lathundsknappar.astro)`);
    continue;
  }
  const delar = [...html.matchAll(/<section class="um-del" id="del-([a-z-]+)"/g)].map((m) => m[1]);
  const vantat = UNDERVISNINGSMETODENS_DELAR.map((d) => d.id);
  if (delar.join(' ') !== vantat.join(' ')) fel.push(`${s}: delarna står ${delar.join(', ')}, ska vara ${vantat.join(', ')}`);
  // En länk till ett ankare på metodens egen sida med hela adressen, som metodens saker har.
  for (const m of html.matchAll(new RegExp(`href="${s}#([^"]+)"`, 'g'))) if (!ids.has(decodeURIComponent(m[1]))) fel.push(`${s}: länken ${s}#${m[1]} leder inte till något element`);
  provaSakerna(s, html, ids);
  provaFilerna(s, html);
  provaLarDig(s, ids);
}

// Rutan Ladda ner och skriv ut har bara standardens rader, på varje metods sida i Stödundervisning och Metoder
// (NEDLADDNINGENS_RADER; Niclas 2026-11-02: "Det har blivit run off av detta ... Behövs en standard här"). Bankernas tabeller
// efter raderna räknas inte.
let nedladdningsrutor = 0;
for (const samling of ['stodundervisning', 'metoder']) {
  for (const e of readdirSync(join(dist, samling), { withFileTypes: true })) {
    const fil = join(dist, samling, e.name, 'index.html');
    if (!e.isDirectory() || !existsSync(fil)) continue;
    const html = readFileSync(fil, 'utf8');
    const a = html.indexOf('<aside class="nedladdning');
    if (a < 0) continue;
    const b = html.indexOf('<ul class="filrader', a);
    if (b < 0 || b > html.indexOf('</aside>', a)) continue;
    const lista = html.slice(b, html.indexOf('</ul>', b));
    nedladdningsrutor++;
    for (const m of lista.matchAll(/<span class="filrubrik"[^>]*>([^<]+)<\/span>/g)) if (!NEDLADDNINGENS_RADER.includes(m[1].trim())) fel.push(`/${samling}/${e.name}: rutan Ladda ner och skriv ut har raden ${m[1].trim()}, som inte är en av standardens (${NEDLADDNINGENS_RADER.join(', ')})`);
    // Knapparna överst (KNAPPARNAS_NAMN och KNAPPENS_KLASS i standarden): en blå knapp går till en sida eller ett verktyg,
    // en vit öppnar en fil, och namnet är ett kort ord, utom Planera insatsen och Lär dig metoden (Niclas 2026-11-02).
    const h = html.indexOf('<header class="metod-huvud"');
    const topp = h < 0 ? '' : html.slice(html.indexOf('<p class="metod-centrala', h), html.indexOf('</p>', html.indexOf('<p class="metod-centrala', h)));
    for (const k of html.indexOf('<p class="metod-centrala', h) > h && h >= 0 ? topp.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g) : []) {
      const klass = k[1].match(/class="([^"]*)"/)?.[1] ?? '';
      const fil = /href="[^"]+\.(?:pdf|docx)(?:\?[^"]*)?"/.test(k[1]);
      const namn = k[2].replace(/<span class="visually-hidden">[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().replace(/ Beta$/, '');
      if (fil !== /\bsekundar\b/.test(klass)) fel.push(`/${samling}/${e.name}: knappen ${namn} överst ${fil ? 'öppnar en fil men är blå' : 'går till en sida men är vit'} (KNAPPENS_KLASS i standarden)`);
      if (![KNAPPARNAS_NAMN.larDig, KNAPPARNAS_NAMN.planera].includes(namn) && namn.split(' ').length > 2) fel.push(`/${samling}/${e.name}: knappen överst heter ${namn}, ska vara ett kort ord (KNAPPARNAS_NAMN, knapp i src/data/centrala.json)`);
    }
  }
}

// Lär dig metodens data, som sidans skript ritar ur (src/lib/lardig.ts): en vecka vars rad säger att läraren väljer utfall
// har knappen till utfallen, som leder till steget med utfallen på metodens sida, och en fri tabell med egen fil står bland
// filerna i Före (granskningen av Testbaserat lärande 2026-11-02: knappen kom aldrig fram, och inget prov såg det).
function provaLarDig(s, ids) {
  const fil = join(dist, s, 'lar-dig', 'index.html');
  if (!existsSync(fil)) return;
  const json = readFileSync(fil, 'utf8').match(/<script type="application\/json" id="ld-data"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) { fel.push(`${s}/lar-dig: planens data saknas (ld-data)`); return; }
  const data = JSON.parse(json);
  const d = parse(readFileSync(join(rot, 'src', 'content', 'undervisningsmetoder', `${s.split('/')[2]}.yaml`), 'utf8'));
  const harUtfall = (d.steg?.rader ?? []).some((x) => x.redo);
  const veckor = (d.progression?.rader ?? []).filter((r) => /\butfall/i.test(`${r.roll ?? ''} ${r.vidare ?? ''} ${r.eleverna ?? ''}`)).map((r) => String(r.vecka));
  if (harUtfall && veckor.length && data.utfallen?.veckor?.join() !== veckor.join()) fel.push(`${s}/lar-dig: veckorna ${veckor.join(', ')} säger utfall, och knappen till utfallen står i ${data.utfallen?.veckor?.join(', ') || 'ingen'}`);
  // Knappen leder till utfallens ruta, och inte till stegets början en och en halv skärm ovanför (verifieringen 2026-11-02).
  const sidan = readFileSync(join(dist, s, 'index.html'), 'utf8');
  if (data.utfallen && !new RegExp(`class="um-beslutskarta" id="${data.utfallen.adress.split('#')[1]}"`).test(sidan)) fel.push(`${s}/lar-dig: knappen till utfallen leder till ${data.utfallen.adress}, som inte är utfallens ruta på metodens sida`);
  const tabeller = readdirSync(join(dist, 'metoder')).filter((f) => f.startsWith(`${s.split('/')[2]}-tabell-`) && f.endsWith('.pdf'));
  if ((data.filer?.tabeller ?? []).length !== tabeller.length) fel.push(`${s}/lar-dig: metoden har ${tabeller.length} tabeller med egen fil, och Före har ${(data.filer?.tabeller ?? []).length}`);
}

// Rutan Verktyg och Stödmaterial står i båda bankerna med samma saker ur samma rot (Verktygsruta.astro; Niclas 2026-10-31:
// "Alla verktyg ska också finnas på metoder. De ska vara speglade så samma rot finns på båda"). Provet stannar när rutan
// saknas i en av bankerna, när bankerna visar olika saker, under olika rubriker, i olika ordning eller med olika områden och
// årskurser, när rutan i Metoder följer filtret och när Metoders tryck inte har ett eget namn i statistiken. Att rutan i
// Metoder visar allt också med ett val i filtret prövas i Chrome nedan (BANKEN).
const BANKERNA = { stod: '/stodundervisning', metoder: '/metoder' };
const rutan = (sida) => {
  const fil = join(dist, sida, 'index.html');
  const html = existsSync(fil) ? readFileSync(fil, 'utf8') : '';
  const start = html.search(/<aside class="vr"[^>]*\sdata-verktygsruta/);
  if (start < 0) return undefined;
  const aside = html.slice(start, html.indexOf('</aside>', start));
  const delar = aside.split(/<details\b/).slice(1).map((d) => ({
    rubrik: d.match(/<h2 class="vr-rubrik">([^<]*)/)?.[1].trim() ?? '',
    saker: [...d.matchAll(/<a ([^>]*\bclass="vr-rad"[^>]*)>\s*<span class="vr-namn">([^<]*)<\/span>\s*<span class="vr-meta">([^<]*)<\/span>/g)].map((m) => {
      const attr = (n) => m[1].match(new RegExp(`\\s${n}="([^"]*)"`))?.[1] ?? '';
      return { namn: m[2].trim(), vad: `${m[2].trim()} (${attr('href').split('?')[0]}, ${attr('data-omrade')}, ${m[3].trim()})`, handelse: attr('data-goatcounter-click') };
    }),
  }));
  return { foljer: /\sdata-vr-foljer\b/.test(aside.slice(0, aside.indexOf('>'))), delar };
};
const rutorna = Object.fromEntries(Object.entries(BANKERNA).map(([k, s]) => [k, rutan(s)]));
for (const [k, s] of Object.entries(BANKERNA)) if (!rutorna[k]?.delar.some((d) => d.saker.length)) fel.push(`${s}: rutan Verktyg och Stödmaterial saknas eller är tom (Verktygsruta.astro, som båda bankerna tar in)`);
let speglade = 0;
if (rutorna.stod?.delar.length && rutorna.metoder?.delar.length) {
  const { stod, metoder } = rutorna;
  const lista = (r) => r.delar.flatMap((d) => d.saker.map((x) => `${d.rubrik}: ${x.vad}`));
  const [a, b] = [lista(stod), lista(metoder)];
  for (const x of a.filter((y) => !b.includes(y))) fel.push(`/metoder: rutan Verktyg och Stödmaterial saknar ${x}, som står i /stodundervisning`);
  for (const x of b.filter((y) => !a.includes(y))) fel.push(`/metoder: rutan Verktyg och Stödmaterial har ${x}, som inte står så i /stodundervisning`);
  if (a.length === b.length && a.every((x) => b.includes(x)) && a.join('\n') !== b.join('\n')) fel.push(`/metoder: rutan Verktyg och Stödmaterial har sakerna i en annan ordning än /stodundervisning`);
  if (!stod.foljer) fel.push('/stodundervisning: rutan Verktyg och Stödmaterial följer inte bankens filter (data-vr-foljer i Verktygsruta.astro)');
  if (metoder.foljer) fel.push('/metoder: rutan Verktyg och Stödmaterial följer bankens filter, fast sakerna hör till metoderna i Stödundervisning (data-vr-foljer i Verktygsruta.astro)');
  const stodsTryck = new Set(stod.delar.flatMap((d) => d.saker.map((x) => x.handelse)));
  for (const x of metoder.delar.flatMap((d) => d.saker)) if (!/^verktygsruta:metoder:[a-z0-9-]+$/.test(x.handelse) || stodsTryck.has(x.handelse)) fel.push(`/metoder: trycket på ${x.namn} i rutan Verktyg och Stödmaterial heter ${x.handelse || 'inget'} i statistiken, ska vara verktygsruta:metoder:<id> (DRIFT.md under Besöksstatistik)`);
  if (a.join('\n') === b.join('\n')) speglade = a.length;
}

// Drive och Word i bankerna (Niclas 2026-10-31: "Varför har inte Metoder skicka till drive som stödundervisning?"; 2026-10-10:
// samma knapp betyder samma sak på varje sida). Varje kort i Metoder har samma filval som korten i Stödundervisning (Filval.astro):
// samma knappar i samma ordning, med samma ikoner, ord och titlar, och statistikens namn i samma form med metodens namn, för
// metodens fil med allt, samma fil som Välj laddar ner. Rutan nederst har samma knappar som Stödundervisnings
// (Urvalsknappar.astro), utom Word-knappens titel, som säger vad den ger, och Metoders tryck har egna namn i statistiken (DRIFT.md
// under Besöksstatistik). Har rutan Drive säger raden under knapparna vad Drive ger. Att knapparna syns, ryms och sparar rätt
// filer prövas i Chrome nedan (KORTEN och DRIVEN).
const elementet = (html, start) => {
  const tagg = html.slice(start).match(/^<([a-z][a-z0-9]*)/)[1];
  let djup = 0;
  for (const m of html.slice(start).matchAll(new RegExp(`<(/?)${tagg}\\b[^>]*>`, 'g'))) { djup += m[1] ? -1 : 1; if (!djup) return html.slice(start, start + m.index + m[0].length); }
  return html.slice(start);
};
const attr = (a, n) => a.match(new RegExp(`\\s${n}="([^"]*)"`))?.[1];
const harAttr = (a, n) => new RegExp(`\\s${n}(?:=|\\s|$)`).test(a);
// En knapp eller länk i ett filval eller i rutan, med fälten att jämföra och ersatt för det som hör till metoden.
const knappen = (tagg, a, inre, ersatt = (x) => x) => {
  const svg = inre.match(/<svg[\s\S]*?<\/svg>/)?.[0] ?? '';
  const dold = [...inre.matchAll(/<span class="visually-hidden">([^<]*)<\/span>/g)].map((m) => m[1]).join(' ');
  const synlig = inre.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<span class="visually-hidden">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '').trim();
  const falt = {
    taggen: tagg, klassen: attr(a, 'class') ?? '', typen: attr(a, 'type') ?? '', titeln: attr(a, 'title') ?? '',
    märkena: ['data-drive-src', 'data-drive-valda', 'disabled', 'hidden'].filter((n) => harAttr(a, n)).join(' '),
    ordet: synlig, 'texten för skärmläsaren': dold, download: attr(a, 'download') ?? '', 'namnet i Drive': attr(a, 'data-drive-namn') ?? '',
    'namnet i statistiken': attr(a, 'data-goatcounter-click') ?? '', 'titeln i statistiken': attr(a, 'data-goatcounter-title') ?? '', ikonen: svg,
  };
  return { namn: synlig || dold, a, falt: Object.fromEntries(Object.entries(falt).map(([k, v]) => [k, ersatt(v)])) };
};
// Knapparna jämförda med förlagans i /stodundervisning: först namnen i ordning, sedan varje fält utom de som får skilja sig.
const jamfor = (vad, har, forv, rot, far = () => []) => {
  const namnen = (l) => l.map((x) => x.namn).join(', ');
  if (namnen(har.knappar) !== namnen(forv.knappar)) { fel.push(`${vad} har ${namnen(har.knappar) || 'inga knappar'}, där /stodundervisning har ${namnen(forv.knappar)} (${rot})`); return false; }
  let lika = har.grupp === forv.grupp;
  if (!lika) fel.push(`${vad}: knappgruppen heter ${har.grupp} för skärmläsaren, i /stodundervisning ${forv.grupp} (${rot})`);
  har.knappar.forEach((x, i) => {
    for (const [f, v] of Object.entries(x.falt)) {
      const ska = forv.knappar[i].falt[f];
      if (v === ska || far(x).includes(f)) continue;
      lika = false;
      fel.push(`${vad}: ${x.namn} har ${f === 'ikonen' ? 'en annan ikon än' : `${f} ${v || '(inget)'}, där`} /stodundervisning${f === 'ikonen' ? '' : ` har ${ska || '(inget)'}`} (${rot})`);
    }
  });
  return lika;
};
const filvalet = (html) => {
  const start = html.search(/<span class="filval\b/);
  if (start < 0) return undefined;
  const span = elementet(html, start);
  return { grupp: attr(span.slice(0, span.indexOf('>')), 'aria-label') ?? '', knappar: [...span.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)].map((m) => ({ tagg: m[1], a: m[2], inre: m[3] })) };
};
const bankenshtml = Object.fromEntries(Object.entries(BANKERNA).map(([k, s]) => [k, existsSync(join(dist, s, 'index.html')) ? readFileSync(join(dist, s, 'index.html'), 'utf8') : '']));
const bankensKort = (html, klass) => [...html.matchAll(new RegExp(`<article class="kort metodkort[^"]*"[^>]*${klass}`, 'g'))].map((m) => elementet(html, m.index));
const kortetsFilval = (kort) => {
  const titel = kort.match(/<h3><a href="[^"]*">([^<]*)<\/a><\/h3>/)?.[1] ?? '';
  const valj = kort.match(/<input type="checkbox" name="valda"[^>]*?\sdata-fil="([^"]*)"/)?.[1];
  const f = filvalet(kort);
  if (!f) return { titel, valj, utanFiler: !/<label class="valj"/.test(kort) };
  const stam = (f.knappar.map((k) => attr(k.a, 'download')).find(Boolean) ?? '').replace(/\.docx$/, '');
  const ersatt = (x) => [titel, titel.toLocaleLowerCase('sv')].reduce((t, n) => (n ? t.split(n).join('<titel>') : t), x).split(stam || '\u0000').join('<fil>');
  return { titel, valj, grupp: ersatt(f.grupp), knappar: f.knappar.map((k) => knappen(k.tagg, k.a, k.inre, ersatt)), fore: kort.indexOf('class="filval') < kort.search(/<label class="valj"/) };
};
const stodsKort = bankensKort(bankenshtml.stod, 'data-metod').map(kortetsFilval).filter((k) => k.knappar);
const metodersKort = bankensKort(bankenshtml.metoder, 'data-del="metoder"').map(kortetsFilval);
// Förlagan: Stödundervisnings kort i den form de flesta har.
const formen = (k) => JSON.stringify([k.grupp, k.knappar.map((x) => x.falt)]);
const formerna = new Map();
for (const k of stodsKort) formerna.set(formen(k), [...(formerna.get(formen(k)) ?? []), k]);
const forlagan = [...formerna.values()].sort((a, b) => b.length - a.length)[0]?.[0];
let spegladeKort = 0;
if (!forlagan) fel.push('/stodundervisning: korten har inget filval att jämföra Metoders kort med (Metodkort.astro)');
else for (const k of metodersKort) {
  const vad = `/metoder: kortet ${k.titel || '(utan titel)'}`;
  // Utkastets kort, som banken visar utan metoder, har inga filer och varken filval eller Välj.
  if (k.utanFiler) continue;
  if (!k.knappar) { fel.push(`${vad} har ingen rad med ${forlagan.knappar.map((x) => x.namn).join(' och ')}, som korten i /stodundervisning har (Filval i Metodprofil.astro)`); continue; }
  const lika = jamfor(vad, k, forlagan, 'Filval i Metodprofil.astro');
  if (!k.fore) fel.push(`${vad}: filvalet står efter Välj, och i /stodundervisning står det före`);
  // Filvalet ger metodens fil med allt, samma fil som Välj laddar ner, och filen finns.
  for (const x of k.knappar) {
    const fil = (attr(x.a, 'href') ?? attr(x.a, 'data-drive-src') ?? '').split('?')[0];
    if (!fil || !existsSync(join(dist, decodeURIComponent(fil)))) fel.push(`${vad}: ${x.namn} leder till ${fil || 'ingen fil'}, som inte finns i dist`);
    else if (fil !== k.valj) fel.push(`${vad}: ${x.namn} ger ${fil}, men Välj laddar ner ${k.valj ?? 'ingen fil'}`);
  }
  if (lika && k.fore) spegladeKort++;
}
// Rutan nederst: samma knappar som Stödundervisnings, i samma ordning, och egna namn i statistiken.
const rutansKnappar = (html) => {
  const start = html.search(/<span class="samla-knappar"/);
  if (start < 0) return undefined;
  const span = elementet(html, start);
  return { grupp: filvalet(span)?.grupp ?? '', knappar: [...span.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map((m) => knappen('button', m[1], m[2])) };
};
const rutornas = { stod: rutansKnappar(bankenshtml.stod), metoder: rutansKnappar(bankenshtml.metoder) };
let spegladRuta = false;
if (!rutornas.stod) fel.push('/stodundervisning: rutan nederst saknar sina knappar (Urvalsknappar.astro)');
else if (!rutornas.metoder) { if (metodersKort.some((k) => k.knappar)) fel.push('/metoder: rutan nederst saknar sina knappar, fast korten har Välj (Urvalsknappar.astro)'); }
else {
  // Statistikens namn prövas för sig nedan, och Word-knappens titel säger vad den ger: en Word-fil eller Word-filerna.
  spegladRuta = jamfor('/metoder: rutan nederst', rutornas.metoder, rutornas.stod, 'Urvalsknappar.astro', (x) => ['namnet i statistiken', 'titeln i statistiken', ...(x.falt.typen === 'submit' ? ['titeln'] : [])]);
  const stodsTryck = new Set(rutornas.stod.knappar.map((x) => x.falt['namnet i statistiken']).filter(Boolean));
  for (const x of rutornas.metoder.knappar) {
    const tryck = x.falt['namnet i statistiken'];
    if (!tryck) continue;
    const titel = x.falt['titeln i statistiken'];
    const stods = rutornas.stod.knappar.find((y) => y.namn === x.namn);
    if (!/^fil:(drive:)?[a-z0-9-]+\.docx$/.test(tryck) || stodsTryck.has(tryck)) fel.push(`/metoder: ${x.namn} i rutan nederst heter ${tryck} i statistiken, ska vara fil:<namn>.docx eller fil:drive:<namn>.docx och skilja sig från /stodundervisning (DRIFT.md under Besöksstatistik)`);
    if (stods && titel.replace(/^Metoder: /, 'Metodbanken: ') !== stods.falt['titeln i statistiken']) fel.push(`/metoder: ${x.namn} i rutan nederst har titeln ${titel} i statistiken, ska vara som i /stodundervisning med Metoder först`);
  }
  const hjalp = bankenshtml.metoder.match(/<p class="meta samla-hjalp">([^<]*)<\/p>/)?.[1] ?? '';
  if (rutornas.metoder.knappar.some((x) => harAttr(x.a, 'data-drive-valda')) && !/Drive/.test(hjalp)) fel.push(`/metoder: raden under knapparna i rutan nederst säger inte vad Drive ger: "${hjalp}"`);
}

// Filerna att skriva ut (lagningen inför lanseringen, A3 och A10): i bilaga A står varje fils knapp en gång, så att Drive och
// Word för hela materialet inte står under varje blad. Nedladdningsrutan har bara standardens rader (NEDLADDNINGENS_RADER,
// provet ovan; Niclas 2026-11-02: "Det har blivit run off av detta"), så filerna i bilaga A står där och inte i rutan. Faktarutans material leder till metodens saker (D4): en del av listan som
// börjar med en saks namn, som "symbolerna till bordsöarna", är en länk.
function provaFilerna(s, html) {
  const id = s.split('/')[2];
  const bilagan = html.slice(html.indexOf('id="del-att-skriva-ut"'), html.indexOf('id="del-valet"'));
  const antal = new Map();
  for (const m of bilagan.matchAll(/href="(\/metoder\/[^"?#]+\.docx)(?:\?[^"]*)?"/g)) antal.set(m[1], (antal.get(m[1]) ?? 0) + 1);
  for (const [fil, n] of antal) if (n > 1) fel.push(`${s}: ${fil} har ${n} knappar i bilaga A, ska ha en (Umfilknappar.astro: under ett blad står bara bladets pdf)`);
  const saker = JSON.parse(html.match(/<script type="application\/json" id="um-saker">([\s\S]*?)<\/script>/)?.[1] ?? '[]');
  const material = html.match(/<dt class="bred">Material<\/dt><dd class="bred">([\s\S]*?)<\/dd>/)?.[1] ?? '';
  for (const del of material.split(', ')) {
    const text = del.replace(/<[^>]+>/g, '').trim().toLocaleLowerCase('sv');
    const sak = saker.find((x) => x.slag !== 'avsnitt' && (x.former ?? [x.namn]).some((f) => text === f.toLocaleLowerCase('sv') || text.startsWith(`${f.toLocaleLowerCase('sv')} `)));
    if (sak && !del.includes('<a ')) fel.push(`${s}: "${text}" i faktarutans material är ingen länk till ${sak.namn} (undervisningsmetodensSaker i src/lib/undervisningsmetod.ts)`);
  }
}

// Metodens saker på sidan: listan står i sidan (um-saker, ur undervisningsmetodensSaker).
function provaSakerna(s, html, ids) {
  const json = html.match(/<script type="application\/json" id="um-saker">([\s\S]*?)<\/script>/)?.[1];
  if (!json) { fel.push(`${s}: sidan saknar metodens saker (um-saker i src/pages/metoder/[id].astro)`); return; }
  const saker = JSON.parse(json);
  // Texten som läsaren ser och som kan nämna en sak: inte länkarna och knapparna, rubrikerna och huvudena, etiketterna (dt,
  // th, caption, label, filrubriken), raderna som fälls ut (summary, som inte kan ha en länk i sig), navigeringen, det som
  // bara står för skärmläsaren och upphovsraden (STIL.md under Hänvisningar: rubrikerna och etiketterna länkas inte).
  const HOPPA = new Set(['a', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'nav', 'dt', 'th', 'caption', 'label', 'summary', 'script', 'style', 'svg', 'title', 'template', 'textarea', 'select', 'option', 'noscript']);
  const TOMMA = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  // Rutornas rubriker och planeringsbladets etiketter är rubriker och etiketter, som Rutinen: T-kortet och Färdigheten på
  // T-kortet (K-645). Raden under en del av kärnan nämner lektionens delar, och Exit-lappen där är delen och inte bladet.
  // Namnet på kärnans kort är kortets rubrik, också när det är en strategis namn (Lärande på kognitionsvetenskaplig grund), och
  // etiketten över strategiernas små kort är en etikett, också när den nämner en sak, som Färgkortet i Formativ bedömning.
  const KLASS = /\bclass="[^"]*\b(upphov|filrubrik|faktaruta-etikett|visually-hidden|tryck-fot|um-ruta-rubrik|um-blad-etikett|um-kort-moment|um-kort-namn|vav-etikett|film-titel)\b/;
  const tecken = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  const avkoda = (t) => t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (h, k) => (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' || k[1] === 'X' ? parseInt(k.slice(2), 16) : Number(k.slice(1))) : tecken[k.toLowerCase()] ?? h));
  const kropp = html.slice(html.indexOf('<article'), html.lastIndexOf('</article>'));
  const stack = [];
  let hoppa = 0;
  let fran = 0;
  const texter = [];
  for (const m of kropp.matchAll(/<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g)) {
    const text = kropp.slice(fran, m.index);
    if (!hoppa && text.trim()) texter.push(avkoda(text));
    fran = m.index + m[0].length;
    const namn = m[2]?.toLowerCase();
    if (!namn || TOMMA.has(namn) || m[4]) continue;
    if (m[1]) {
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].namn === namn) { for (const x of stack.splice(i)) if (x.hoppar) hoppa--; break; }
    } else {
      const hoppar = HOPPA.has(namn) || KLASS.test(m[3] ?? '') || /\saria-hidden="true"/.test(m[3] ?? '');
      stack.push({ namn, hoppar });
      if (hoppar) hoppa++;
    }
  }
  const utan = new Set();
  const okanda = new Set();
  for (const t of texter) {
    for (const d of sakdelar(t, saker)) if (d.sak !== undefined) utan.add(`"${d.text}" i ”${t.replace(/\s+/g, ' ').trim().slice(0, 70)}”`);
    for (const namn of olankadeSaker(t, saker)) okanda.add(namn);
  }
  for (const u of utan) fel.push(`${s}: ${u} är ingen länk till saken (medSaker i src/lib/undervisningsmetod.ts)`);
  for (const o of okanda) fel.push(`${s}: "${o}" ser ut som en sak, men metoden har ingen sak som heter så. Skriv namnet som saken heter, eller lägg saken i undervisningsmetodensSaker`);
  // Varje sak har en knapp under sig som skriver ut eller laddar ner den, och knappens fil finns. Saken är elementet med
  // ankaret, och knappen står i det. En sak som är en egen sida, som lathunden, har en knapp till sidan, och sidan finns.
  // Metodkortet är en del av sidan (slag avsnitt) och skrivs ut med metoden.
  for (const x of saker.filter((y) => y.slag !== 'avsnitt')) {
    const [vag, ankare] = x.adress.split('#');
    if (!ankare) {
      if (!existsSync(join(dist, vag, 'index.html'))) fel.push(`${s}: ${x.namn} leder till ${vag}, som inte finns i dist`);
      // En struktur ur verktyget Strukturer (K-661) leder till sin sida med sitt kort under Strukturkorten på metodens sida;
      // lathunden länkar dit utan kort.
      // En text i en banks metod, som Någon har varit här, har sin knapp på textens egen sida.
      if (!new RegExp(`<a class="(?:knapp|st-kort)[^"]*" href="${vag}"`).test(html) && !vag.startsWith('/stodundervisning/') && !((vag.startsWith('/strukturer/') || vag.startsWith('/strategier/')) && s.endsWith('/lathund'))) fel.push(`${s}: ${x.namn} har ingen knapp till ${vag}`);
      continue;
    }
    if (vag !== s || !ids.has(ankare)) continue;
    const start = html.search(new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\sid="${ankare}"`));
    const tagg = html.slice(start).match(/^<([a-z][a-z0-9]*)/)[1];
    // Elementets slut: den stängande taggen som går jämnt ut med de öppnande av samma slag.
    let djup = 0;
    let slut = html.length;
    for (const m of html.slice(start).matchAll(new RegExp(`<(/?)${tagg}\\b[^>]*>`, 'g'))) { djup += m[1] ? -1 : 1; if (!djup) { slut = start + m.index + m[0].length; break; } }
    const knappar = [...html.slice(start, slut).matchAll(/<a\b([^>]*)>/g)].map((m) => m[1]).filter((a) => /\sdata-skriv-ut-pdf\b/.test(a) || /\sdownload="[^"]*\.(pdf|docx)"/.test(a)).map((a) => a.match(/\shref="([^"?#]+)/)?.[1]).filter(Boolean);
    if (!knappar.length) fel.push(`${s}#${ankare}: ${x.namn} har ingen knapp under sig som skriver ut eller laddar ner den`);
    for (const k of knappar) if (!existsSync(join(dist, decodeURIComponent(k)))) fel.push(`${s}#${ankare}: knappen under ${x.namn} leder till ${k}, som inte finns`);
  }
  provadeSaker += saker.length;
}

// Lathundens pdf och sidan (K-632; pdf:en är sajtens sedan K-637). Texten jämförs med samma regler som metodernas paritet, och pdf:en utan
// sidhuvud och sidfot (scripts/textjamforelse.mjs). Sidfoten prövas för sig: den ska leda till lathundens sida.
const lathundPdf = new Map();
// Det lathunden säger men pdf:en ännu inte har: en mening på sidan som står i en av de här texterna ur lathundensSidor får
// saknas i pdf:en, som ['vad', (sidor) => texterna]. En rad tas bort när pdf:en har gjorts om, och provet stannar då på
// varje mening som glider isär. Tom sedan pdf:en ritas ur lathundensSidor (riggens dce9e59, K-632, och sajtens K-637).
const VANTAR = [];
const lathundensVantande = new Map();
const lathundenVantar = new Set();
for (const s of metodsidor) {
  const id = s.split('/')[2];
  const pdf = join(rot, 'public', 'metoder', `${id}-lathund.pdf`);
  if (!existsSync(pdf)) continue;
  if (!lathundsidor.includes(`${s}/lathund`)) { fel.push(`${s}: ${id}-lathund.pdf finns, men sidan ${s}/lathund, som pdf:ens sidfot leder till, finns inte`); continue; }
  // Pdf:en ur PowerPoint läses i formernas ordning, så att tabellernas celler inte fogas ihop (pdfText med raw).
  const text = pdfText(pdf, { raw: true });
  if (!text.trim()) { fel.push(`${s}/lathund: ${id}-lathund.pdf gick inte att läsa med pdftotext`); continue; }
  if (!ren(text).includes(ren(`niclasfohlin.se${s}/lathund`))) fel.push(`${s}/lathund: sidfoten i ${id}-lathund.pdf leder inte hit`);
  lathundPdf.set(`${s}/lathund`, ren(utanHuvudOchFot(text)));
  const sidorna = lathundensSidor(parse(readFileSync(join(rot, 'src', 'content', 'undervisningsmetoder', `${id}.yaml`), 'utf8')));
  lathundensVantande.set(`${s}/lathund`, VANTAR.map(([namn, texter]) => [namn, (texter(sidorna) ?? []).filter(Boolean).map(ren)]));
}
// Lathundens texter i Chrome, som läsaren ser dem. Rubrikerna, knapparna, länkarna i bandet och det som bara skärmläsaren
// hör står inte i pdf:en. Ur planeringsbladet läses bara det läraren skrev, eftersom bladets etiketter är sajtens blad
// (Planeringsblad.astro).
const LATHUNDENS_TEXTER = `(() => {
  const lh = document.querySelector('.lh');
  if (!lh) return null;
  const k = lh.cloneNode(true);
  k.querySelectorAll('h2, h3, .lh-kicker, .lh-etikett, .lh-lank, button, .visually-hidden, thead, .um-kort-nr').forEach((e) => e.remove());
  const ut = [];
  for (const blad of k.querySelectorAll('.um-blad')) { blad.querySelectorAll('dd, .um-blad-text, li').forEach((e) => ut.push(e.textContent)); blad.remove(); }
  const LOV = 'p, li, td, th, strong, dd, .um-lh-under';
  k.querySelectorAll(LOV).forEach((e) => { if (!e.querySelector(LOV)) ut.push(e.textContent); });
  return ut.map((t) => t.replace(/\\s+/g, ' ').trim()).filter(Boolean);
})()`;
let lathundensMeningar = 0;

// Formen på metodens sida och lathunden (lagningen inför lanseringen): ett rutnät med kort eller delar slutar inte med en tom
// plats (D2, D3), kortens och remsans namn avstavas på svenska (D1), ett blad i Materialet står i spaltens hela bredd i
// telefonen (D5), och i lathunden ryms varje ord i kärnans kort (A7). Svaret är en lista med det som inte håller.
const RUTNATEN = `for (const g of document.querySelectorAll('.um-kort-rad, .um-ex-remsa, .um-remsa ol')) {
    const sista = g.lastElementChild;
    if (!sista || !sista.getBoundingClientRect().width) continue;
    const cs = getComputedStyle(g);
    const kant = g.getBoundingClientRect().right - parseFloat(cs.paddingRight) - parseFloat(cs.borderRightWidth);
    if (sista.getBoundingClientRect().right < kant - 2) ut.push('raden slutar med en tom plats efter ' + sista.textContent.replace(/\\s+/g, ' ').trim().slice(0, 30) + ' (' + (g.className || g.parentElement.className) + ')');
  }`;
const FORMEN = `(() => {
  const ut = [];
  ${RUTNATEN}
  for (const e of document.querySelectorAll('.um-kort-namn, .um-remsa-namn')) if (getComputedStyle(e).hyphens !== 'auto' || !/^sv/.test(e.closest('[lang]')?.getAttribute('lang') ?? '')) ut.push('avstavas inte på svenska: ' + e.textContent.trim().slice(0, 30));
  for (const a of document.querySelectorAll('.um-sida')) {
    const p = a.parentElement, cs = getComputedStyle(p);
    const inne = p.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (a.getBoundingClientRect().width < inne * 0.95) ut.push('bladet står inte i spaltens bredd: ' + (a.querySelector('img')?.getAttribute('alt') ?? '').slice(0, 40));
  }
  const c = document.createElement('canvas').getContext('2d');
  for (const e of document.querySelectorAll('.lh .um-kort-namn')) {
    c.font = getComputedStyle(e).font;
    for (const o of e.textContent.trim().split(' ')) if (c.measureText(o).width > e.clientWidth + 1) ut.push('ordet ryms inte i kortet: ' + o);
  }
  return ut;
})()`;
// På datorn: rutnäten, och spalten bredvid ett blad i Materialet står samlad uppifrån, utan stora glapp mellan rubriken,
// texten och raden som fälls ut (D6).
const DATORN = `(() => {
  const ut = [];
  ${RUTNATEN}
  for (const p of document.querySelectorAll('.um-blad-post')) {
    const delar = [...p.querySelectorAll(':scope > h4, :scope > p:not(.um-filknappar), :scope > details, :scope > .um-blad-kropp > *')].filter((e) => e.getBoundingClientRect().height);
    for (let i = 1; i < delar.length; i++) { const glapp = delar[i].getBoundingClientRect().top - delar[i - 1].getBoundingClientRect().bottom; if (glapp > 40) ut.push('glapp på ' + Math.round(glapp) + ' punkter i spalten vid ' + (p.querySelector('h4')?.textContent ?? p.id)); }
  }
  return ut;
})()`;
// Banken i telefonen (A4, A5): rutan Verktyg och Stödmaterial visar allt också med ett val i filtret, i varje område går
// Forskningsstödets lägen och raden om metoderna utanför skalan ihop med Visar, ett tryck på ett läges ord väljer bara det
// läget, och med två metoder valda heter knappen efter zip-filen den ger och förklaringen syns.
const BANKEN = `(async () => {
  const ut = [];
  const vanta = (ms) => new Promise((r) => setTimeout(r, ms));
  const talet = (t) => Number(/^\\d+/.exec(String(t ?? '').trim())?.[0] ?? NaN);
  const form = document.getElementById('filter');
  // Rutan Verktyg och Stödmaterial följer inte Metoders filter (Verktygsruta.astro): med ett val i filtret syns allt.
  const valet = form && [...form.querySelectorAll('input[type="radio"]')].find((r) => r.value && !r.disabled);
  if (valet) {
    valet.checked = true;
    valet.dispatchEvent(new Event('change', { bubbles: true }));
    await vanta(30);
  }
  const dolda = [...document.querySelectorAll('[data-verktygsruta] li')].filter((li) => li.hidden).map((li) => li.querySelector('.vr-namn')?.textContent.trim());
  if (dolda.length) ut.push('rutan Verktyg och Stödmaterial döljer ' + dolda.join(', ') + (valet ? ' med ' + valet.name + ' ' + valet.value + ' valt' : '') + ', fast den inte följer filtret här');
  if (valet) { form.querySelector('[data-rensa-filter]').click(); await vanta(30); }
  const reg = form?.querySelector('[data-spann="stod"]');
  if (reg) {
    for (const o of form.querySelectorAll('input[name="omrade"]')) {
      if (o.disabled) continue;
      o.checked = true;
      o.dispatchEvent(new Event('change', { bubbles: true }));
      await vanta(30);
      const lagen = [...reg.querySelectorAll('[data-n]')].reduce((s, x) => s + talet(x.textContent), 0);
      const rad = reg.querySelector('[data-utanfor]');
      const utan = rad && !rad.hidden ? talet(rad.textContent) : 0;
      const visar = talet(form.querySelector('[data-antal]').textContent);
      if (lagen + utan !== visar) ut.push('Forskningsstödet med området ' + (o.closest('label')?.querySelector('[data-text]')?.textContent ?? o.value) + ': lägena har ' + lagen + ' och raden under ' + utan + ', men Visar säger ' + visar);
    }
    form.querySelector('[data-rensa-filter]').click();
    await vanta(30);
    const ord = reg.querySelectorAll('.mbf-lage');
    ord[1].click();
    await vanta(30);
    const fran = reg.querySelector('[data-grepp="fran"]').value, till = reg.querySelector('[data-grepp="till"]').value;
    if (fran !== '1' || till !== '1') ut.push('ett tryck på ' + ord[1].querySelector('[data-text]').textContent + ' valde läget ' + fran + ' till ' + till + ', inte bara det');
    form.querySelector('[data-rensa-filter]').click();
  }
  const boxar = [...document.querySelectorAll('input[name="valda"]')];
  if (boxar.length > 1) {
    boxar[0].click(); boxar[1].click();
    await vanta(30);
    const knappen = document.querySelector('#samla button[type="submit"]')?.textContent.replace(/\\s+/g, ' ').trim() ?? '';
    if (!/zip/.test(knappen)) ut.push('med två metoder valda heter knappen ' + knappen + ', fast den ger en zip-fil');
    const hjalp = document.querySelector('#samla .samla-hjalp');
    if (!hjalp || getComputedStyle(hjalp).display === 'none') ut.push('förklaringen av zip-filen syns inte i telefonen');
    boxar[0].click(); boxar[1].click();
  }
  return ut;
})()`;
// Bankens kort och rutan nederst i telefonen: raden med Drive och Word syns och står inom kortet, som kortet klipper (overflow
// hidden), och med två metoder valda syns rutans knappar, Drive kan tryckas och allt står inom rutan och fönstret.
const KORTEN = `(async () => {
  const ut = [];
  const inom = (e, ram, namn) => { const r = e.getBoundingClientRect(), y = ram.getBoundingClientRect(); if (r.width && (r.right > y.right + 1 || r.left < y.left - 1)) ut.push(namn + ' går utanför ' + (ram.id ? '#' + ram.id : 'kortet') + ' med ' + Math.round(Math.max(r.right - y.right, y.left - r.left)) + ' punkter'); };
  for (const k of document.querySelectorAll('.mp-bank')) {
    const titel = k.querySelector('h3')?.textContent.trim();
    const rad = k.querySelector('.mp-bank-lankar');
    if (!rad) continue;
    for (const e of rad.querySelectorAll(':scope > a, :scope > .valj, .filval > *')) inom(e, k, titel + ': ' + e.textContent.replace(/\\s+/g, ' ').trim().slice(0, 30));
    const drive = rad.querySelector('[data-drive-src]');
    if (rad.querySelector('.filval') && (!drive || getComputedStyle(drive).display === 'none')) ut.push(titel + ': Drive syns inte i kortet');
  }
  const samla = document.getElementById('samla');
  const boxar = [...document.querySelectorAll('input[name="valda"]')];
  if (samla && boxar.length > 1) {
    boxar[0].click(); boxar[1].click();
    await new Promise((r) => setTimeout(r, 30));
    for (const k of samla.querySelectorAll('.samla-knappar button:not([hidden])')) {
      const namn = 'rutans ' + k.textContent.replace(/\\s+/g, ' ').trim().split(':')[0];
      if (getComputedStyle(k).display === 'none') ut.push(namn + ' syns inte med två metoder valda');
      else if (k.disabled) ut.push(namn + ' kan inte tryckas med två metoder valda');
      inom(k, samla, namn);
    }
    const r = samla.getBoundingClientRect();
    if (r.right > document.documentElement.clientWidth + 1 || samla.scrollWidth > samla.clientWidth + 1) ut.push('rutan nederst är bredare än fönstret eller sitt innehåll');
    boxar[0].click(); boxar[1].click();
  }
  return ut;
})()`;
// Drive i banken med Googles inloggning och Drive härmade, eftersom den riktiga inloggningen inte går att pröva utan en
// människa: rutan sparar varje vald metods fil som eget dokument med en rad per metod, en vald metod med rutans besked, och
// kortets Drive kortets fil, och inloggningen kommer före filerna (src/scripts/drive.ts, driveIUrvalet i src/scripts/urval.ts).
const DRIVEN = `(async () => {
  const ut = [];
  const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const vanta = (ms) => new Promise((r) => setTimeout(r, ms));
  const upp = [], ordning = [];
  window.google = { accounts: { oauth2: { initTokenClient: (o) => ({ requestAccessToken: () => { ordning.push('inloggning'); setTimeout(() => o.callback({ access_token: 'prov' }), 5); } }), hasGrantedAllScopes: () => true } } };
  const f = window.fetch;
  window.fetch = async (u, o) => {
    if (String(u).startsWith('https://www.googleapis.com/upload/')) {
      const meta = JSON.parse((await o.body.slice(0, 600).text()).split('\\r\\n')[3]);
      upp.push(meta.name);
      if (meta.mimeType !== DOCX) ut.push(meta.name + ' sparades i Drive som ' + meta.mimeType + ', ska vara en Word-fil');
      return new Response(JSON.stringify({ id: 'prov', webViewLink: 'https://drive.google.com/file/d/prov' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (/\\.docx/.test(String(u))) ordning.push('filen');
    return f(u, o);
  };
  const samla = document.getElementById('samla');
  const status = samla?.querySelector('[data-status]');
  const knapp = samla?.querySelector('[data-drive-valda]');
  const boxar = [...document.querySelectorAll('input[name="valda"]')];
  const filnamn = (b) => (b.dataset.fil ?? '').split('/').pop();
  const tills = async (villkor) => { for (let i = 0; i < 100 && !villkor(); i++) await vanta(50); };
  if (!knapp) ut.push('rutan nederst har ingen Drive');
  else if (boxar.length > 1) {
    boxar[0].click(); boxar[1].click();
    knapp.click();
    await tills(() => (status.textContent.match(/sparad i Drive|Det gick inte/g) ?? []).length >= 2);
    const vantat = [filnamn(boxar[0]), filnamn(boxar[1])];
    if (upp.join(', ') !== vantat.join(', ')) ut.push('Drive med två valda sparade ' + (upp.join(', ') || 'inget') + ', skulle spara ' + vantat.join(', '));
    const rader = [...status.querySelectorAll('.drive-rad')].map((r) => r.textContent);
    const titlar = [boxar[0], boxar[1]].map((b) => b.closest('.kort').querySelector('h3').textContent.trim());
    if (rader.length !== 2 || !rader.every((r, i) => r.startsWith(titlar[i] + ' är sparad i Drive') && r.includes('öppna'))) ut.push('Drive med två valda säger ' + (status.textContent || 'inget') + ', skulle ha en rad per metod med länken');
    if (ordning.length && ordning[0] !== 'inloggning') ut.push('Drive hämtade filerna före inloggningen: ' + ordning.join(', '));
    upp.length = 0;
    boxar[1].click();
    knapp.click();
    await tills(() => /Sparad i Drive|Det gick inte/.test(status.textContent));
    if (upp.join(', ') !== filnamn(boxar[0])) ut.push('Drive med en vald sparade ' + (upp.join(', ') || 'inget') + ', skulle spara ' + filnamn(boxar[0]));
    if (!/^Sparad i Drive: öppna\\.$/.test(status.textContent.trim())) ut.push('Drive med en vald säger ' + (status.textContent || 'inget') + ', skulle säga Sparad i Drive: öppna.');
    boxar[0].click();
  }
  upp.length = 0;
  const kortets = document.querySelector('.mp-bank [data-drive-src]');
  if (kortets) {
    kortets.click();
    await tills(() => /Sparad i Drive|Det gick inte/.test(kortets.closest('.filval').nextElementSibling?.textContent ?? ''));
    const vantat = kortets.dataset.driveNamn;
    if (upp.join(', ') !== vantat) ut.push('kortets Drive sparade ' + (upp.join(', ') || 'inget') + ', skulle spara ' + vantat);
  }
  window.fetch = f;
  return ut;
})()`;
// Utfallen för en annan klass (F2): med tre elever färre räknas alla tre gränserna om, och klassens förra antal står inte
// kvar efter "av". Talen ur standardens utfallensGranser.
const UTFALLEN = `(() => {
  const ut = [];
  for (const r of document.querySelectorAll('[data-utfall]')) {
    const f = r.querySelector('input[type="number"]');
    const n = Number(f.value), m = n - 3;
    f.value = String(m);
    f.dispatchEvent(new Event('input'));
    const g = ${utfallensGranser.toString().replace(/^function\s*\w*/, 'function')}(m);
    const rutor = [...r.querySelectorAll('.um-utfall-ruta')].map((x) => x.textContent.replace(/\\s+/g, ' '));
    const krav = [g.nastanAlla + ' av ' + m, g.deFlesta[0] + '–' + g.deFlesta[1] + ' av ' + m, g.halften + ' eller fler'];
    rutor.forEach((t, i) => { if (t.includes(' av ' + n + ' ')) ut.push('"av ' + n + '" står kvar med ' + m + ' elever: ' + t.slice(0, 60)); if (krav[i] && !t.includes(krav[i])) ut.push('"' + krav[i] + '" saknas med ' + m + ' elever: ' + t.slice(0, 60)); });
    f.value = String(n);
    f.dispatchEvent(new Event('input'));
  }
  return ut;
})()`;

// En enkel server för dist och Chrome utan fönster.
const TYPER = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let fil = join(dist, p);
  if (existsSync(join(fil, 'index.html'))) fil = join(fil, 'index.html');
  if (!existsSync(fil)) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', TYPER[extname(fil)] ?? 'application/octet-stream');
  res.end(readFileSync(fil));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const bas = `http://127.0.0.1:${server.address().port}`;
const port = 9300 + Math.floor(Math.random() * 500);
const profil = join(tmpdir(), `metoderprov-${port}`);
mkdirSync(profil, { recursive: true });
const proc = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, 'about:blank'], { stdio: 'ignore' });
try {
  let info;
  for (let i = 0; i < 40 && !info; i++) { await vanta(250); try { info = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { /* Chrome har inte startat än */ } }
  if (!info) throw new Error('Chrome svarade inte på DevTools-porten.');
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((r, x) => { ws.onopen = r; ws.onerror = x; });
  let nr = 0;
  const vantande = new Map();
  let laddad = () => {};
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && vantande.has(d.id)) { vantande.get(d.id)(d); vantande.delete(d.id); } else if (d.method === 'Page.loadEventFired') laddad(); };
  const skicka = (method, params = {}) => new Promise((r) => { const id = ++nr; vantande.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await skicka('Page.enable');
  const oppna = async (url) => { const klar = new Promise((r) => { laddad = r; }); await skicka('Page.navigate', { url }); await Promise.race([klar, vanta(20000)]); };
  const kor = async (expression) => (await skicka('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
  for (const s of sidor) {
    for (const bredd of [320, 360]) {
      await skicka('Emulation.setDeviceMetricsOverride', { width: bredd, height: 800, deviceScaleFactor: 2, mobile: true });
      await oppna(`${bas}${s}`);
      const bred = await kor(`document.fonts.ready.then(() => { document.querySelectorAll('details').forEach((x) => { x.open = true; }); const W = document.documentElement.clientWidth; const sw = document.documentElement.scrollWidth; if (sw <= W + 1) return ''; const klipps = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (getComputedStyle(a).overflowX !== 'visible') return true; return false; }; for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.width && !klipps(e) && r.right > W + 1 && e.parentElement.getBoundingClientRect().right <= W + 1) return sw + ' punkter bred, ' + e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/)[0] : '') + ' ”' + (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40) + '”'; } return sw + ' punkter bred'; })`);
      if (bred === undefined) fel.push(`${s}: provet i ${bredd} punkter fick inget svar`);
      else if (bred) fel.push(`${s}: rullar i sidled i ${bredd} punkter: ${bred}`);
      // Inget namn i remsan, cellerna eller kortets värden klipps eller går ut ur sin ruta (designgranskningen 2026-10-30), och
      // inget ord i kärnans kort går ut ur kortet (Samarbetsfärdigheter i 390 punkter, K-645).
      const klippt = await kor(`(() => { const ut = []; for (const e of document.querySelectorAll('.um-remsa-namn, .um-celler a, .mp-varde, .mp-namn')) { if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') ut.push(e.textContent.trim().slice(0, 30)); const ram = e.closest('.mp-bank-halv, .mp-rad, .mp-bank-en'); if (ram && e.getBoundingClientRect().right > ram.getBoundingClientRect().right + 1) ut.push(e.textContent.trim().slice(0, 30) + ' (utanför rutan)'); } for (const e of document.querySelectorAll('.um-kort-namn, .um-kort-vad, .um-kort-moment')) if (e.scrollWidth > e.clientWidth + 1) ut.push(e.textContent.trim().slice(0, 30) + ' (ut ur kortet)'); return ut.join(' · '); })()`);
      if (klippt) fel.push(`${s}: i ${bredd} punkter klipps eller går ut: ${klippt}`);
      for (const f of (await kor(FORMEN)) ?? ['provet av formen fick inget svar']) fel.push(`${s}: i ${bredd} punkter: ${f}`);
      if (s === '/metoder') for (const f of (await kor(KORTEN)) ?? ['provet av korten och rutan fick inget svar']) fel.push(`${s}: i ${bredd} punkter: ${f}`);
    }
    if (metodsidor.includes(s)) {
      for (const f of (await kor(UTFALLEN)) ?? ['provet av utfallen fick inget svar']) fel.push(`${s}: utfallen: ${f}`);
      // Med en plan i Lär dig metoden bär rutan Din plan länken, och knappen med samma namn går undan (A9).
      if (await kor(`!!document.getElementById('pl-din')`)) {
        await kor(`(() => { const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(x); }; localStorage.setItem('insatser', JSON.stringify({ v: 1, planer: [{ id: 'prov99', metod: ${JSON.stringify(s.split('/')[2])}, samling: 'metoder', titel: 'Provet', namn: '', val: '', andrad: d(0) + 'T10:00:00', skapad: d(0), schema: { pass: [], veckor: [[1, 1, 0, d(14), d(18)]] } }] })); return true; })()`);
        await oppna(`${bas}${s}`);
        await vanta(300);
        const planen = await kor(`(() => { const din = document.querySelector('#pl-din:not([hidden]) a'); return { din: !!din, samma: din ? [...document.querySelectorAll('.um-toppknappar a')].filter((a) => getComputedStyle(a).display !== 'none' && new URL(a.href).pathname === new URL(din.href).pathname).map((a) => a.textContent.trim()) : [] }; })()`);
        if (!planen?.din || planen.samma.length) fel.push(`${s}: med en plan står en knapp till samma sida som rutan Din plan bredvid den, ${planen?.samma?.join(', ') ?? 'och rutan syns inte'} (data-din-ersatter, src/scripts/insatser.ts)`);
        await kor('localStorage.clear()');
      }
      await skicka('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
      await oppna(`${bas}${s}`);
      for (const f of (await kor(DATORN)) ?? ['provet på datorn fick inget svar']) fel.push(`${s}: på datorn: ${f}`);
    }
    if (s === '/metoder') {
      await skicka('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
      await oppna(`${bas}${s}`);
      for (const f of (await kor(BANKEN)) ?? ['provet av banken fick inget svar']) fel.push(`${s}: ${f}`);
      if (metodersKort.some((k) => k.knappar)) {
        await oppna(`${bas}${s}`);
        for (const f of (await kor(DRIVEN)) ?? ['provet av Drive fick inget svar']) fel.push(`${s}: ${f}`);
      }
    }
    // Varje mening på lathundens sida står i lathundens pdf (K-632, K-637).
    const pdf = lathundPdf.get(s);
    if (!pdf) continue;
    const texter = await kor(LATHUNDENS_TEXTER);
    if (!Array.isArray(texter) || !texter.length) { fel.push(`${s}: lathundens texter gick inte att läsa på sidan`); continue; }
    for (const t of texter) for (const m of meningarna(t)) {
      lathundensMeningar++;
      if (pdf.includes(ren(m))) continue;
      const vantar = lathundensVantande.get(s)?.find(([, texter]) => texter.some((x) => x.includes(ren(m))));
      if (vantar) lathundenVantar.add(vantar[0]);
      else fel.push(`${s}: står inte i ${s.split('/')[2]}-lathund.pdf: "${m.slice(0, 90)}"`);
    }
  }
  // Lär dig metoden i webbläsaren, för metoderna som visar verktyg (fältet centrala): första lektionens ruta länkar bankens texter
  // och verktyget till rätt sidor, verktygets knapp står en gång med sitt korta namn, och med start i slutet av november står
  // raderna efter stegen i datumordning (verifieringen av Reciprok undervisning 2026-11-07, och Codex samma dag: datan bevisar
  // inte det som ritas).
  {
    const mapp = join(rot, 'src', 'content', 'undervisningsmetoder');
    const register = JSON.parse(readFileSync(join(rot, 'src', 'data', 'centrala.json'), 'utf8'));
    // Måndagen i slutet av november som inte har varit, eftersom datumfältet inte tar en dag långt bak i tiden.
    const novemberstart = (() => { for (let ar = new Date().getFullYear(); ; ar++) { const x = new Date(Date.UTC(ar, 10, 23)); x.setUTCDate(x.getUTCDate() + ((8 - x.getUTCDay()) % 7)); if (x > new Date()) return x.toISOString().slice(0, 10); } })();
    const veckan = (etikett) => { const n = Number(/\bv\. (\d+)/.exec(etikett)?.[1]); return n >= 30 ? n : n + 53; };
    await skicka('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    for (const f of readdirSync(mapp).filter((x) => x.endsWith('.yaml') && !x.startsWith('_'))) {
      const id = f.replace(/\.yaml$/, '');
      const d = parse(readFileSync(join(mapp, f), 'utf8'));
      if (!(d.centrala ?? []).length || !existsSync(join(dist, 'metoder', id, 'lar-dig', 'index.html'))) continue;
      await oppna(`${bas}/metoder/${id}/lar-dig`);
      const svar = await kor(`(async () => {
        const vanta = (ms) => new Promise((r) => setTimeout(r, ms));
        const falt = document.getElementById('ld-start');
        falt.value = '${novemberstart}';
        falt.dispatchEvent(new Event('input', { bubbles: true }));
        falt.dispatchEvent(new Event('change', { bubbles: true }));
        await vanta(300);
        document.querySelector('[data-vy="1"]').click();
        await vanta(300);
        const lank = (a) => [a.textContent.trim(), (a.getAttribute('href') ?? '').replace(/\\?.*$/, '')];
        const rutan = [...document.querySelectorAll('.pl-nasta a')].map(lank);
        const knappar = [...document.querySelectorAll('.pl-andra-knappar a')].map(lank);
        document.querySelector('[data-vy="efter"]').click();
        await vanta(300);
        const rader = [...document.querySelectorAll('.pl-uppf .pl-etikett')].map((e) => e.textContent.trim());
        return JSON.stringify({ rutan, knappar, rader });
      })()`);
      if (!svar) { fel.push(`/metoder/${id}/lar-dig: provet i webbläsaren fick inget svar`); continue; }
      const { rutan, knappar, rader } = JSON.parse(svar);
      const passet = (d.plan?.passen ?? []).find((p) => /^första lektionen$/i.test(p.nar ?? ''))?.text ?? '';
      for (const m of passet.matchAll(/[A-ZÅÄÖ][^.:,]*? \((?:Lättläst|Mellan|Avancerad), text (\d+)\)/g)) {
        const l = rutan.find(([t]) => t === m[0]);
        const sidan = l ? join(dist, ...l[1].split('/').filter(Boolean), 'index.html') : '';
        if (!l) fel.push(`/metoder/${id}/lar-dig: "${m[0]}" i första lektionen är ingen länk`);
        else if (!existsSync(sidan) || !readFileSync(sidan, 'utf8').includes(m[0].replace(/ \(.*$/, ''))) fel.push(`/metoder/${id}/lar-dig: "${m[0]}" leder till ${l[1]}, som inte är texten`);
      }
      for (const x of d.centrala) {
        const c = register.find((y) => y.id === x.id);
        if (!passet.includes(c.namn)) continue;
        if (!rutan.some(([t, a]) => t === c.namn && a === c.adress)) fel.push(`/metoder/${id}/lar-dig: ${c.namn} i första lektionen är ingen länk till verktyget`);
        const antal = knappar.filter(([, a]) => a === c.adress).length;
        if (antal !== 1 || !knappar.some(([t, a]) => t === (c.knapp ?? c.namn) && a === c.adress)) fel.push(`/metoder/${id}/lar-dig: under steget står ${antal} knappar till ${c.namn}, och den ska stå en gång med namnet ${c.knapp ?? c.namn}`);
      }
      const veckorna = rader.map(veckan);
      if (!rader.length || veckorna.some((v, i) => i > 0 && v < veckorna[i - 1])) fel.push(`/metoder/${id}/lar-dig: raderna efter stegen står inte i datumordning med start ${novemberstart}: ${rader.join(' | ')}`);
    }
  }
  // De små korten tidigt på sidan (src/data/bladkort.json): de står på de första åtta skärmarna, heter som metoden säger, har
  // sin minibild och leder till saken, där knappen som skriver ut den står (Niclas 2026-11-07: "Analysera om de kan missas av en
  // trött lärare", och om de andra metoderna: "Ibland måste också något skapas. Som ex minibilder"). I ett blad som är flera kort
  // är varje liten bild rätt kort: korten är bilder i pdf:en, så ordningen läses ur sidornas textalternativ i Word-filen, som
  // riggen skriver ur kortens scen: sidan nämner korten uppifrån och ned.
  {
    const register = JSON.parse(readFileSync(join(rot, 'src', 'data', 'bladkort.json'), 'utf8'));
    const manifest = JSON.parse(readFileSync(join(rot, 'src', 'data', 'minibilder.json'), 'utf8'));
    await skicka('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
    for (const [id, p] of Object.entries(register).filter(([k]) => !k.startsWith('_'))) {
      const d = parse(readFileSync(join(rot, 'src', 'content', 'undervisningsmetoder', `${id}.yaml`), 'utf8'));
      const minibilder = metodensMinibilder(id, d, p, JSON.parse(readFileSync(join(rot, 'src', 'data', 'materialets-sidor.json'), 'utf8')));
      const rader = p.blad ? (d.tabeller ?? []).find((t) => t.rubrik === p.tabell)?.rader ?? [] : [];
      const namnen = p.blad ? rader.map((x) => x[0]) : p.saker.map(sakensNamn);
      // Var varje kort ska leda, och filen som knappen där ska skriva ut. Listan står här och inte i koden, så att ett fel i koden syns.
      const bladet = (namn) => ({ ankare: `#blad-${slugAv(namn)}`, fil: `/metoder/${id}-blad-${slugAv(namn)}.pdf` });
      const hemmet = (namn) => {
        if ((d.ramar?.ramar ?? []).some((r) => r.rubrik === namn)) return bladet(namn);
        if (namn === 'Strukturkorten') return { ankare: '#strukturkorten', fil: `/strukturer/kort/strukturkort-${id}.pdf` };
        if (namn === 'Strategikorten') return { ankare: '#strategierna', fil: `/strategier/kort/strategikort-${id}.pdf` };
        if (namn === 'Strategibladet') return { ankare: '#strategierna', fil: `/strategier/kort/strategier-bladet-${id}.pdf` };
        return { ankare: `#${slugAv(namn)}`, fil: `/metoder/${id}-tabell-${slugAv(namn)}.pdf` };
      };
      const hemmen = namnen.map((n) => (p.blad ? bladet(p.blad) : hemmet(n)));
      const allaKnappen = p.blad ? `#blad-${slugAv(p.blad)}` : '#del-att-skriva-ut';
      if (!p.blad && (p.saker.length < 1 || p.saker.length > 3)) fel.push(`/metoder/${id}: de små korten har ${p.saker.length} saker, och provet Den trötta läraren tillåter en till tre`);
      for (const m of minibilder) {
        if (!existsSync(join(dist, 'metoder', m.fil))) fel.push(`/metoder/${id}: minibilden ${m.fil} saknas`);
        if (!manifest[m.fil]) fel.push(`/metoder/${id}: minibilden ${m.fil} står inte i src/data/minibilder.json`);
      }
      await oppna(`${bas}/metoder/${id}`);
      const svar = await kor(`(async () => {
        const vanta = (ms) => new Promise((r) => setTimeout(r, ms));
        const hemmen = ${JSON.stringify(hemmen)};
        const rad = document.querySelector('.um-bladkort');
        const y = (e) => e.getBoundingClientRect().top + scrollY;
        const topp = [...document.querySelectorAll('.um-toppknappar a')].map((a) => [a.textContent.trim(), a.getAttribute('href')]);
        const ut = { topp, finns: !!rad, antal: document.querySelectorAll('.um-bladkort').length, kort: [], skarm: innerHeight, radensY: rad ? y(rad) : 0 };
        if (!rad) return JSON.stringify(ut);
        rad.querySelectorAll('img').forEach((i) => { i.loading = 'eager'; });
        await vanta(900);
        const del = document.getElementById('del-att-skriva-ut');
        for (const [i, a] of [...rad.querySelectorAll('.st-kort')].entries()) {
          const href = a.getAttribute('href');
          const mal = document.getElementById(href.slice(1));
          const img = a.querySelector('img');
          const k = { namn: a.querySelector('.st-kort-namn').textContent.trim(), rad: a.querySelector('.st-kort-rad').textContent.trim(), href, finns: !!mal, bild: img.getAttribute('src').replace(/\\?.*$/, ''), bredd: img.naturalWidth };
          if (mal) {
            a.click();
            await vanta(500);
            k.landar = Math.round(mal.getBoundingClientRect().top);
            // Knappen med sakens egen fil, efter landningen och högst tre skärmar ned, i bilagan Att skriva ut.
            const fil = hemmen[i]?.fil;
            k.knappen = [...del.querySelectorAll('a.knapp, a.sekundar, .knapp a')].filter((x) => (x.getAttribute('href') ?? '').split('?')[0] === fil).map((x) => [x.textContent.trim(), Math.round(x.getBoundingClientRect().top - mal.getBoundingClientRect().top)]).find(([, avstand]) => avstand >= 0 && avstand <= 3 * innerHeight) ?? null;
            k.iBilagan = del.contains(mal);
            k.bilder = mal.querySelectorAll('img').length;
          }
          ut.kort.push(k);
        }
        const alla = rad.querySelector('.um-bladkort-knapp a');
        ut.alla = { text: alla.textContent.trim(), href: alla.getAttribute('href'), finns: !!document.getElementById(alla.getAttribute('href').slice(1)) };
        return JSON.stringify(ut);
      })()`);
      if (!svar) { fel.push(`/metoder/${id}: provet av de små korten fick inget svar`); continue; }
      const r = JSON.parse(svar);
      if (!r.finns) { fel.push(`/metoder/${id}: de små korten saknas`); continue; }
      if (r.antal !== 1) fel.push(`/metoder/${id}: sidan har ${r.antal} rutor med små kort, ska ha en`);
      if (r.kort.map((k) => k.namn).join() !== namnen.join()) fel.push(`/metoder/${id}: de små korten heter ${r.kort.map((k) => k.namn).join(', ')} och ska heta ${namnen.join(', ')}`);
      if (r.radensY > 8 * r.skarm) fel.push(`/metoder/${id}: de små korten står på skärm ${Math.round(r.radensY / r.skarm)} i telefonen, och ska stå tidigt`);
      if (p.knapp) {
        const namn = typeof p.knapp === 'string' ? p.knapp : p.knapp.namn;
        const adress = typeof p.knapp === 'string' ? `#blad-${slugAv(p.blad)}` : `#${slugAv(p.knapp.till)}`;
        if (!r.topp.some(([t, a]) => t === namn && a === adress)) fel.push(`/metoder/${id}: knappen ${namn} står inte överst med länken ${adress}`);
        const sidan = readFileSync(join(dist, 'metoder', id, 'index.html'), 'utf8');
        if (!sidan.includes(`id="${adress.slice(1)}"`)) fel.push(`/metoder/${id}: knappen ${namn} leder till ${adress}, som sidan inte har`);
      }
      if (!r.alla?.finns || r.alla.href !== allaKnappen) fel.push(`/metoder/${id}: knappen ${r.alla?.text} under de små korten leder till ${r.alla?.href} och ska leda till ${allaKnappen}`);
      for (const [i, k] of r.kort.entries()) {
        if (k.href !== hemmen[i]?.ankare) fel.push(`/metoder/${id}: det lilla kortet ${k.namn} leder till ${k.href} och ska leda till ${hemmen[i]?.ankare}`);
        if (!k.finns) { fel.push(`/metoder/${id}: det lilla kortet ${k.namn} leder till ${k.href}, som sidan inte har`); continue; }
        if (!k.iBilagan) fel.push(`/metoder/${id}: det lilla kortet ${k.namn} leder till ${k.href}, som inte står i bilagan Att skriva ut`);
        if (!k.rad) fel.push(`/metoder/${id}: det lilla kortet ${k.namn} saknar raden`);
        if (k.bild !== `/metoder/${minibilder[i]?.fil}`) fel.push(`/metoder/${id}: det lilla kortet ${k.namn} har bilden ${k.bild} och ska ha /metoder/${minibilder[i]?.fil}`);
        if (k.bredd !== MINIBILDEN.bredd) fel.push(`/metoder/${id}: minibilden till ${k.namn} är ${k.bredd} punkter bred och ska vara ${MINIBILDEN.bredd}`);
        if (Math.abs(k.landar) > r.skarm) fel.push(`/metoder/${id}: ett tryck på det lilla kortet ${k.namn} landar ${k.landar} punkter från saken`);
        if (!k.knappen) fel.push(`/metoder/${id}: vid ${k.namn} saknas knappen som skriver ut ${hemmen[i]?.fil}`);
      }
      if (p.blad) {
        if (r.kort[0]?.bilder < p.framsidor.length * 2) fel.push(`/metoder/${id}: bladet visar ${r.kort[0]?.bilder} sidor`);
        const docx = await JSZip.loadAsync(readFileSync(join(rot, 'public', 'metoder', `${id}-materialet.docx`)));
        const alt = [...(await docx.file('word/document.xml').async('string')).matchAll(/<wp:docPr[^>]*descr="([^"]*)"/g)].map((m) => m[1]);
        rader.forEach((x, i) => {
          const sida = p.framsidor[Math.floor(i / p.perSida)];
          const del = i % p.perSida;
          const ren = (s) => s.replace(/[­⁠]/g, '');
          const pa = ren(alt[sida - 1] ?? '');
          const fore = del > 0 ? pa.indexOf(ren(rader[i - 1][0])) : -1;
          if (!minibilder[i]?.kalla.endsWith(`-materialet-${sida}.png`) || minibilder[i].del !== (del ? 'nedre' : 'ovre')) fel.push(`/metoder/${id}: minibilden till ${x[0]} tas ur ${minibilder[i]?.kalla}, ${minibilder[i]?.del}, och ska tas ur sidan ${sida}`);
          if (pa.indexOf(ren(x[0])) <= fore) fel.push(`/metoder/${id}: sidan ${sida} i materialet har inte kortet ${x[0]} som kort ${del + 1} uppifrån: ${pa.slice(0, 80)}`);
        });
      }
    }
  }
  ws.close();
} finally {
  proc.kill();
  server.close();
  try { rmSync(profil, { recursive: true, force: true }); } catch { /* Chrome kan hålla filerna en stund */ }
}
// De centrala saker som en metod visar med fältet centrala har sin knapp överst och efter texten som nämner dem, två gånger
// på sidan, som i Stödundervisning (metodensCentrala och centralaVid i src/lib/centrala.ts; Reciprok undervisning var första
// metoden i Metoder med fältet, och sidan läste det inte). Ett blad med flera sidor har alla sina bilder (scripts/metoderfiler.mjs).
{
  const register = JSON.parse(readFileSync(join(rot, 'src', 'data', 'centrala.json'), 'utf8'));
  const mapp = join(rot, 'src', 'content', 'undervisningsmetoder');
  for (const f of readdirSync(mapp).filter((x) => x.endsWith('.yaml') && !x.startsWith('_'))) {
    const id = f.replace(/\.yaml$/, '');
    const html = join(dist, 'metoder', id, 'index.html');
    if (!existsSync(html)) continue;
    const d = parse(readFileSync(join(mapp, f), 'utf8'));
    const sida = readFileSync(html, 'utf8');
    for (const x of d.centrala ?? []) {
      const c = register.find((y) => y.id === x.id);
      // Knappen är en länk med klassen knapp till sakens adress, med eller utan filens version.
      const knappen = new RegExp(`<a\\b[^>]*\\bclass="knapp[^"]*"[^>]*\\shref="${c.adress.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?[^"]*)?"`);
      const topp = sida.match(/<p class="metod-centrala um-toppknappar">[\s\S]*?<\/p>/)?.[0] ?? '';
      if (!knappen.test(topp)) fel.push(`/metoder/${id}: ${c.namn} står i fältet centrala, men knappen står inte överst på sidan`);
      const rubrik = x.efterText.replace(/^tabell:\s*/, '');
      const slug = rubrik.toLocaleLowerCase('sv').replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const start = sida.indexOf(`<div class="um-fritabell" id="${slug}"`);
      const nasta = start < 0 ? -1 : sida.indexOf('<div class="um-fritabell"', start + 1);
      const platsen = start < 0 ? '' : sida.slice(start, nasta < 0 ? undefined : nasta);
      if (!knappen.test(platsen)) fel.push(`/metoder/${id}: ${c.namn} står i fältet centrala efter ${x.efterText}, men knappen står inte vid tabellen`);
      // Lär dig metoden har verktyget i Materialet (LarDigData.verktyg).
      const larDig = join(dist, 'metoder', id, 'lar-dig', 'index.html');
      if (existsSync(larDig) && !readFileSync(larDig, 'utf8').includes(c.adress)) fel.push(`/metoder/${id}/lar-dig: ${c.namn} står i fältet centrala, men Lär dig metoden har ingen knapp dit`);
    }
    // Lär dig metoden: verktygen är saker, så att passets text länkar dem, och knappen heter som på metodens sida; bankens texter
    // som passet pekar ut är länkar; och materialets knapp heter som bladet när metoden har ett enda (verifieringen av Reciprok
    // undervisning 2026-11-07).
    const ldSida = join(dist, 'metoder', id, 'lar-dig', 'index.html');
    if (existsSync(ldSida)) {
      const ld = JSON.parse(readFileSync(ldSida, 'utf8').match(/<script type="application\/json" id="ld-data">([\s\S]*?)<\/script>/)?.[1] ?? '{}');
      for (const x of d.centrala ?? []) {
        const c = register.find((y) => y.id === x.id);
        if (!ld.saker?.some((s) => s.namn === c.namn && s.adress === c.adress)) fel.push(`/metoder/${id}/lar-dig: ${c.namn} står i fältet centrala, men är ingen sak som texten kan länka`);
        if (!ld.verktyg?.some((v) => v.adress === c.adress && v.knapp === (c.knapp ?? c.namn))) fel.push(`/metoder/${id}/lar-dig: knappen till ${c.namn} heter inte som på metodens sida`);
      }
      // Ett verktyg som metodens text nämner med namnet, som Ta fram ett skrivkort i Skriva för att lära, är en sak i Lär dig metoden
      // som på metodens sida, där Boklankar länkar det; Strategier och Strukturer är vanliga ord och har egna delar (namndaVerktyg i
      // src/lib/boklankar.ts; Codex kodgranskning 2026-11-08, K-734). Listan räknas här ur registret, och provet går åt båda
      // hållen: ett verktyg som texten inte nämner är ingen sak, om det inte står i fältet centrala.
      const texten = JSON.stringify(d);
      for (const c of register.filter((y) => (y.slag === 'sida' || y.slag === 'pdf') && !['Strategier', 'Strukturer'].includes(y.namn))) {
        const sak = ld.saker?.some((s) => s.namn === c.namn && s.adress === c.adress);
        const ska = texten.includes(c.namn) || (d.centrala ?? []).some((x) => x.id === c.id);
        if (sak !== ska) fel.push(`/metoder/${id}/lar-dig: ${c.namn} ${ska ? 'nämns i metoden men är ingen sak som texten kan länka' : 'nämns inte i metoden men är en sak'}`);
      }
      const texterna = (d.plan?.passen ?? []).map((p) => p.text ?? '');
      for (const text of texterna) for (const m of text.matchAll(/[A-ZÅÄÖ][^.:,]*? \((?:Lättläst|Mellan|Avancerad), text \d+\)/g)) {
        const traff = sakdelar(text, ld.saker ?? []).some((y) => y.sak && y.text === m[0]);
        if (!traff) fel.push(`/metoder/${id}/lar-dig: "${m[0]}" i planens text är ingen länk till texten`);
      }
      if ((d.ramar?.ramar ?? []).length === 1 && ld.filer?.materialet?.namn !== d.ramar.ramar[0].rubrik) fel.push(`/metoder/${id}/lar-dig: materialets knapp heter ${ld.filer?.materialet?.namn} och inte som bladet ${d.ramar.ramar[0].rubrik}`);
      if (!readFileSync(join(rot, 'src', 'scripts', 'lardig.ts'), 'utf8').includes('<p>${medSaker(p.text)}</p>')) fel.push('src/scripts/lardig.ts: passets text i Lär dig metoden ska länka metodens saker (medSaker)');
      // Rutinens text om första gången, veckornas gemensamma text och strategitexten länkar metodens saker, som rutinens andra texter
      // (K-734: "Ta ett skrivkort från sidan Ta fram ett skrivkort" var ingen länk), och veckornas text står i Före.
      const lardigKoden = readFileSync(join(rot, 'src', 'scripts', 'lardig.ts'), 'utf8');
      for (const [bit, vad] of [['Första gången</span>${medSaker(r.forsta)}', 'rutinens text om första gången'], ['<p>${medSaker(data.progression.text)}</p>', 'veckornas gemensamma text'], ['<p>${medSaker(k.text)}</p>', 'strategitexten']]) if (!lardigKoden.includes(bit)) fel.push(`src/scripts/lardig.ts: ${vad} i Lär dig metoden ska länka metodens saker (medSaker)`);
      if (d.progression?.text && !ld.progression?.text) fel.push(`/metoder/${id}/lar-dig: veckornas gemensamma text saknas i planens data`);
    }
    // Säger metoden paren vid utfallen räknar sidan om dem med klassens antal (utfallensPar i standarden).
    if (/alltså högst \S+ par\b/.test(JSON.stringify(d.steg ?? {})) && !sida.includes('data-par=')) fel.push(`/metoder/${id}: utfallen säger par, men sidan räknar inte om dem med klassens antal`);
    if ((d.ramar?.ramar ?? []).length === 1) {
      const n = readdirSync(join(rot, 'public', 'metoder')).filter((x) => new RegExp(`^${id}-materialet-\\d+\\.png$`).test(x)).length;
      const visade = new Set([...sida.matchAll(new RegExp(`${id}-materialet-(\\d+)\\.png`, 'g'))].map((m) => m[1])).size;
      if (visade !== n) fel.push(`/metoder/${id}: bladet ${d.ramar.ramar[0].rubrik} har ${n} sidor, men sidan visar ${visade} olika bilder`);
      // Ett blad med flera sidor skrivs ut dubbelsidigt, så materialets pdf är bladets sidor, utan textsidan först.
      const mat = join(rot, 'public', 'metoder', `${id}-materialet.pdf`);
      const bladPdf = join(rot, 'public', 'metoder', `${id}-blad-${(d.ramar.ramar[0].rubrik ?? '').toLocaleLowerCase('sv').replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.pdf`);
      // Ett eget blad som heter Strategikorten behåller namnet, också när verktyget Strategier är sått i metoden: namnet leder
      // till bladet och inte till avsnittet Strategier för lärande.
      const tillAvsnittet = [...sida.matchAll(/<a\b[^>]*href="[^"]*#strategierna"[^>]*>([\s\S]*?)<\/a>/g)].filter((m) => /strategikorten/i.test(m[1]));
      if (d.ramar.ramar[0].rubrik === 'Strategikorten' && tillAvsnittet.length) fel.push(`/metoder/${id}: bladet heter Strategikorten, men ${tillAvsnittet.length} länkar med namnet leder till avsnittet Strategier för lärande`);
      if (n > 1 && (!existsSync(bladPdf) || !existsSync(mat) || !readFileSync(mat).equals(readFileSync(bladPdf)))) fel.push(`/metoder/${id}: bladet ${d.ramar.ramar[0].rubrik} har ${n} sidor, men materialets pdf är inte bladets sidor`);
    }
    // Flera blad, där ett kan ha flera sidor, som Idékorten i Skriva för att lära (K-734; Codex kodgranskning 2026-11-08, fynd 5):
    // varje blad visar sina sidor ur materialets bilder och har en pdf med lika många sidor. Sidorna står i
    // src/data/materialets-sidor.json när ett blad har flera, och annars är sidan bladets nummer. Kartan prövas mot bildernas namn
    // i materialets Word-fil med en egen läsning här, inte med skriptets, så att ett fel i scripts/metoderfiler.mjs syns.
    if ((d.ramar?.ramar ?? []).length > 1) {
      const bladen = d.ramar.ramar.map((r) => r.rubrik);
      const karta = JSON.parse(readFileSync(join(rot, 'src', 'data', 'materialets-sidor.json'), 'utf8'))[id];
      if (karta) {
        const docx = join(rot, 'public', 'metoder', `${id}-materialet.docx`);
        const xml = existsSync(docx) ? await (await JSZip.loadAsync(readFileSync(docx))).file('word/document.xml').async('string') : '';
        const namnen = [...xml.matchAll(/<wp:docPr\b[^>]*\bname="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
        if (JSON.stringify(karta.map((x) => x.blad)) !== JSON.stringify(bladen)) fel.push(`/metoder/${id}: src/data/materialets-sidor.json har bladen ${karta.map((x) => x.blad).join(', ')}, och metoden ${bladen.join(', ')}`);
        if (karta.flatMap((x) => x.bilder).length !== namnen.length) fel.push(`/metoder/${id}: src/data/materialets-sidor.json har ${karta.flatMap((x) => x.bilder).length} sidor, och materialets Word-fil ${namnen.length} bilder`);
        namnen.forEach((namn, i) => {
          const blad = karta.find((x) => x.bilder.includes(i + 1))?.blad;
          // Den längsta rubriken som namnet börjar med är bladet, så att "Kortet till eleven 2" inte räknas till Kortet.
          const vantat = bladen.filter((r) => namn === r || namn.startsWith(`${r} `)).sort((a, b) => b.length - a.length)[0];
          if (blad !== vantat) fel.push(`/metoder/${id}: sidan ${i + 1} i materialet heter "${namn}" och står under ${blad ?? 'inget blad'} i src/data/materialets-sidor.json, men hör till ${vantat ?? 'inget blad'}`);
        });
      }
      for (const [i, namn] of bladen.entries()) {
        const vantat = karta ? karta[i]?.bilder ?? [] : [i + 1];
        const ankare = `blad-${slugAv(namn)}`;
        const start = sida.search(new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\sid="${ankare}"`));
        if (start < 0) { fel.push(`/metoder/${id}: bladet ${namn} har inget ankare #${ankare}`); continue; }
        const tagg = sida.slice(start).match(/^<([a-z][a-z0-9]*)/)[1];
        let djup = 0;
        let slut = sida.length;
        for (const m of sida.slice(start).matchAll(new RegExp(`<(/?)${tagg}\\b[^>]*>`, 'g'))) { djup += m[1] ? -1 : 1; if (!djup) { slut = start + m.index + m[0].length; break; } }
        const visade = [...new Set([...sida.slice(start, slut).matchAll(new RegExp(`${id}-materialet-(\\d+)\\.png`, 'g'))].map((m) => Number(m[1])))];
        if (JSON.stringify(visade) !== JSON.stringify(vantat)) fel.push(`/metoder/${id}: bladet ${namn} visar sidorna ${visade.join(', ') || 'inga'} och ska visa ${vantat.join(', ')}`);
        const pdf = join(rot, 'public', 'metoder', `${id}-blad-${slugAv(namn)}.pdf`);
        const sidorIPdf = existsSync(pdf) ? pdfText(pdf).split('\f').length - 1 : 0;
        if (sidorIPdf !== vantat.length) fel.push(`/metoder/${id}: bladet ${namn} har ${vantat.length} sidor, och knappens pdf ${sidorIPdf}`);
      }
    }
    // Ett led i utfallets första mening som inte räknas om med klassen, som "i rundan högst en av sex" i Skriva för att lära, står
    // som en egen mening på planeringsbladet, och paren efter "alltså" gör det inte, eftersom bladet räknar om dem med klassen
    // (planeringsbladet i src/lib/undervisningsmetod.ts; Codex andra öga 2026-11-08, K-734). Prövat åt båda hållen.
    const redo = (d.steg?.rader ?? []).find((s) => s.redo)?.redo ?? {};
    const gransernaPaBladet = [...sida.matchAll(/<p class="um-utfall-grans">([\s\S]*?)<\/p>/g)].map((m) => m[1].replace(/<[^>]+>/g, ''));
    for (const u of ['nastanAlla', 'deFlesta', 'halften']) {
      const forsta = /^[^.]*\./.exec(String(redo[u] ?? ''))?.[0] ?? '';
      const led = /,\s+([^\s,.][^,.]*)\.$/u.exec(forsta)?.[1];
      if (!led || !gransernaPaBladet.length) continue;
      const mening = `${led.charAt(0).toLocaleUpperCase('sv')}${led.slice(1)}.`;
      const pa = gransernaPaBladet.some((g) => g.includes(mening));
      if (/^alltså\s/u.test(led) ? pa : !pa) fel.push(`/metoder/${id}: planeringsbladets utfall ${u} ${pa ? 'har' : 'saknar'} meningen "${mening}"`);
    }
  }
}
if (fel.length) { console.error(`metoderprov: ${fel.length} fel\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`metoderprov: ${sidor.length} sidor under /metoder rullar inte i sidled i 320 och 360 punkter, inga namn i remsan, cellerna eller kortet klipps, och på ${metodsidor.length} metodsidor leder ankarna och filerna rätt, delarna står i standardens ordning och metodens ${provadeSaker} saker är länkar där de nämns och har en knapp under sig, ${lathundensMeningar} meningar på ${lathundsidor.length} lathundssidor står i lathundens pdf, rutan Verktyg och Stödmaterial har samma ${speglade} saker i Metoder som i Stödundervisning, och ${spegladeKort} kort${spegladRuta ? ' och rutan nederst' : ''} i Metoder har Stödundervisnings ${rutornas.stod?.knappar.filter((x) => !harAttr(x.a, 'data-rensa')).map((x) => x.namn).join(' och ') ?? 'Drive och Word'}.`);
console.log(`metoderprov: rutan Ladda ner och skriv ut har bara standardens rader på ${nedladdningsrutor} metodsidor (NEDLADDNINGENS_RADER).`);
if (lathundenVantar.size) console.log(`! metoderprov: lathundens pdf saknar ännu det sidan visar av ${[...lathundenVantar].join(", ")} (K-632)`);
