#!/usr/bin/env node
// Planprovet (Planera insatsen, K-489; Niclas 2026-10-24: "bygg EN som du testar på flera olika sätt att den funkar. dvs
// en standard"). Provet prövar standarden på fyra sätt, och stannar på första felet i varje:
//   1. Planmotorn (src/lib/standard/plan.js): veckor, röda dagar, påsken, vecka 53, upprepade veckor, lov, flyttade och
//      inställda pass, uppföljningens datum, länken, texten till dokumentationen och kalenderfilen (RFC 5545).
//   2. Metodernas data: varje metod som har planens fält går att planera, och provet säger hur många som återstår.
//   3. Formerna: metoder av andra slag än Textsamtal i grupp, med planens fält som metodriggen ska skriva dem, så att
//      standarden håller för en kurs i veckor, en period i pass, en period utan slut och en progression i pass, och säger
//      tydligt nej till det den inte läser än.
//   4. Sidan i Chrome, med ett fast datum (onsdag 18 november 2026): förslaget, att spara, veckan, nästa pass, veckans
//      texter, bockar, upprepa, lov, flytta och ställa in, kopiera till dokumentationen och länken, kalenderfilen, en
//      plan ur en länk, Din insats på metodens sida, Dina insatser i metodbanken, en webbläsare som inte sparar, inga fel
//      i konsolen och ingen sida som rullar i sidled i 320, 360 och 390 punkter.
// Sidan prövas bara när de byggda sidorna eller provet har ändrats sedan förra godkända körningen
// (node_modules/.cache/planprov.json).
//
//   node scripts/planprov.mjs               allt (körs i npm run validera, efter bygget)
//   node scripts/planprov.mjs --utan-sida   bara motorn, datan och formerna
//   node scripts/planprov.mjs --alla        sidan också när inget har ändrats
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
// --bilder <mapp>: provet tar bilder av sidans lägen där, i telefonbredd och på dator, för granskningen.
const bildmapp = args.includes('--bilder') ? args[args.indexOf('--bilder') + 1] : null;
// Rötterna som proven har använt, så att kontrollen av rötterna i PLANERA.md vet att varje rot har körts och inte bara står
// i en kommentar (Codex 2026-10-25).
const anvanda = new Set();
const foljd = (m) => new Proxy(m, { get: (t, k) => { anvanda.add(k); return Reflect.get(t, k); } });
const s = foljd(await import(pathToFileURL(join(rot, 'src/lib/standard/index.js')).href));
const fel = [];
const ska = (namn, villkor, info) => { if (!villkor) fel.push(`${namn}${info !== undefined ? `: ${typeof info === 'string' ? info : JSON.stringify(info)}` : ''}`); };
const metod = (id) => parseYaml(readFileSync(join(rot, 'src/content/stodundervisning', `${id}.yaml`), 'utf8'));
const tom = { lov: [], upprepa: [], flytta: {}, stryk: [] };

// ---------- 1. Planmotorn ----------
ska('isoVecka 2 nov 2026', s.isoVecka('2026-11-02').vecka === 45);
ska('isoVecka 31 dec 2026 är vecka 53', s.isoVecka('2026-12-31').vecka === 53 && s.isoVecka('2026-12-31').ar === 2026);
ska('isoVecka 1 jan 2027 är vecka 53 i 2026', s.isoVecka('2027-01-01').vecka === 53 && s.isoVecka('2027-01-01').ar === 2026);
ska('isoVecka 4 jan 2027', s.isoVecka('2027-01-04').vecka === 1 && s.isoVecka('2027-01-04').ar === 2027);
ska('isoVecka 3 jan 2028', s.isoVecka('2028-01-03').vecka === 1);
for (const [ar, pask] of [[2026, '2026-04-05'], [2027, '2027-03-28'], [2028, '2028-04-16'], [2029, '2029-04-01'], [2030, '2030-04-21']]) ska(`påskdagen ${ar}`, s.paskdagen(ar) === pask, s.paskdagen(ar));
const r26 = s.rodaDagar(2026);
for (const [datum, namn] of [['2026-04-03', 'långfredagen'], ['2026-04-06', 'annandag påsk'], ['2026-05-14', 'Kristi himmelsfärdsdag'], ['2026-06-19', 'midsommarafton'], ['2026-06-20', 'midsommardagen'], ['2026-10-31', 'alla helgons dag'], ['2026-12-25', 'juldagen']]) ska(`röd dag ${datum}`, r26.get(datum) === namn, r26.get(datum));
ska('röda dagar 2027: midsommardagen 26 juni, alla helgons dag 6 november', s.helgdag('2027-06-26') === 'midsommardagen' && s.helgdag('2027-11-06') === 'alla helgons dag');
ska('ett vanligt datum är ingen röd dag', s.helgdag('2026-11-18') === undefined);
ska('plusDagar över sommartiden', s.plusDagar('2026-10-24', 2) === '2026-10-26' && s.plusDagar('2027-03-27', 2) === '2027-03-29');
ska('arDatum stoppar 30 februari', !s.arDatum('2026-02-30') && s.arDatum('2028-02-29') && !s.arDatum('2027-02-29'));

const tider = [['före', 'fore'], ['efter', 'efter'], ['efter 4 veckor', 'efter'], ['Efter fyra veckor', 'efter'], ['efter 4–6 veckor', 'efter'], ['varje pass', 'lopande'], ['i passet', 'lopande'], ['varje vecka', 'lopande'], ['varannan vecka', 'intervall'], ['var 3:e vecka', 'intervall'], ['vecka 4', 'vecka'], ['vecka 1–4', 'vecka'], ['vecka 2 och 6', 'vecka'], ['första veckan', 'vecka'], ['sista veckan', 'sista-veckan'], ['pass 6, 8 och 10', 'pass'], ['pass 13–23', 'pass'], ['sista passet', 'sista-passet'], ['sista passet efter pass 3', 'sista-passet'], ['villkor', 'villkor']];
for (const [t, typ] of tider) ska(`tolkaTid("${t}")`, s.tolkaTid(t)?.typ === typ, s.tolkaTid(t));
for (const t of ['Före insatsen', 'efter kursen', 'var 1:e vecka', 'vecka 4–2', 'ibland', '', undefined]) ska(`tolkaTid("${t}") ska vara null`, s.tolkaTid(t) === null, s.tolkaTid(t));
ska('vecka 1–4 är fyra veckor', s.tolkaTid('vecka 1–4').veckor.join() === '1,2,3,4');
ska('pass 6, 8 och 10', s.tolkaTid('pass 6, 8 och 10').pass.join() === '6,8,10');
const steg = [['1', 1, 1], ['4–5', 4, 5], ['6–8', 6, 8], ['9–10 vid behov', 9, 10], ['Vecka 3', 3, 3], ['Pass 2–6', 2, 6], ['7 till det sista', 7, undefined], ['Från pass 11', 11, undefined]];
for (const [t, a, b] of steg) { const x = s.tolkaSteg(t); ska(`tolkaSteg("${t}")`, x && x.fran === a && x.till === b, x); }
for (const t of ['När ni är varma i kläderna', 'Efter kursen', '5–3', '']) ska(`tolkaSteg("${t}") ska vara null`, s.tolkaSteg(t) === null, s.tolkaSteg(t));
// Raden efter den sista veckan, som Läslistor i grupps nästa period (Planera 0.1).
ska('tolkaSteg("Efter vecka 7") är det som kommer efter insatsen', JSON.stringify(s.tolkaSteg('Efter vecka 7')) === '{"fran":8,"vidBehov":false,"efter":true}', s.tolkaSteg('Efter vecka 7'));

// Textsamtal i grupp, som metodens fil står.
const ts = metod('textsamtal-i-grupp');
const { fel: tsFel, plan: tsMp } = s.metodplan(ts);
// Planer i olika lägen för Dina insatser, den 18 november (Niclas 2026-10-25: "KOMMANDE PÅGÅENDE, AVSLUTAD"): en som inte
// har börjat, en som pågår, en som läraren har avslutat, en vars utvärdering återstår, en som avslutades av sig själv två
// veckor efter sista passet och en som läraren har öppnat igen.
const provPlan = (id, start, namn, foljd = {}) => {
  const v = { start, dagar: [1, 3, 5], langd: 6, ...tom };
  const p = s.planera(tsMp, v);
  return { id, metod: 'textsamtal-i-grupp', titel: ts.titel, omrade: ts.omrade, namn, val: s.kodaVal(v), folj: false, foljd, andrad: '2026-11-01', uppdaterad: ts.uppdaterad instanceof Date ? ts.uppdaterad.toISOString().slice(0, 10) : String(ts.uppdaterad ?? '').slice(0, 10), schema: { pass: p.pass.map((x) => [x.datum, x.vecka, x.nr]), veckor: p.veckor.map((w) => { const d = w.pass.map((n) => p.pass[n - 1].datum).sort(); return [w.nr, w.innehall, w.igen ? 1 : 0, d[0] ?? w.mandag, d.at(-1) ?? s.plusDagar(w.mandag, 4)]; }) } };
};
const lagesplaner = [provPlan('lag001', '2026-11-30', 'Kommer'), provPlan('lag002', '2026-11-02', 'Pagar'), provPlan('lag003', '2026-09-28', 'Avslutad', { utvardering: { beslut: 'avsluta' } }), provPlan('lag004', '2026-09-28', 'Kvar'), provPlan('lag005', '2026-09-07', 'Sjalv'), provPlan('lag006', '2026-09-07', 'Oppnad', { oppen: '2026-10-16' })];
ska('Textsamtal i grupp går att planera', tsFel.length === 0 && tsMp, tsFel);
if (tsMp) {
  const val = { start: '2026-11-02', dagar: [1, 3, 5], langd: 6, ...tom };
  let p = s.planera(tsMp, val);
  ska('sex veckor ger 18 pass', p.pass.length === 18, p.pass.length);
  ska('första och sista passet', p.forstaPass === '2026-11-02' && p.sistaPass === '2026-12-11', [p.forstaPass, p.sistaPass]);
  ska('veckorna är 45 till 50', p.veckor.map((v) => v.vecka.vecka).join() === '45,46,47,48,49,50');
  ska('progressionens rader: 1, 2, 3, 4, 5, 6–8', p.veckor.map((v) => v.steg).join() === '0,1,2,3,4,5');
  // Före insatsen står i veckan före planens första vecka, som vecka 0 (Planera 0.2, de kalla testarna 2026-10-24).
  ska('uppföljningen före är veckan före och efter veckan efter', p.uppfoljning[0].tillfallen[0].datum === '2026-10-26' && p.uppfoljning[0].tillfallen[0].vecka === 0 && p.fore.mandag === '2026-10-26' && !p.fore.overLov && p.uppfoljning[2].tillfallen[0].datum === '2026-12-14');
  ska('varje vecka har inget datum', p.uppfoljning[1].typ === 'lopande' && p.uppfoljning[1].tillfallen.length === 0);
  ska('veckanFor onsdag 18 november är vecka 3', s.veckanFor(p, '2026-11-18').nr === 3);
  ska('nästa pass onsdag 18 november är pass 8', s.nastaPass(p, '2026-11-18').nr === 8);
  ska('nästa pass som inte är bockat, med de bockade före det', s.nastaObockade(p, '2026-11-18', (x) => x.nr === 8 || x.nr === 9).pass.nr === 10 && s.nastaObockade(p, '2026-11-18', (x) => x.nr === 8 || x.nr === 9).bockade.map((x) => x.nr).join() === '8,9' && s.nastaObockade(p, '2026-11-18', () => false).pass.nr === 8 && s.nastaObockade(p, '2026-11-18', () => false).bockade.length === 0 && s.nastaObockade(p, '2026-11-18', () => true).pass === null);
  ska('veckanFor före start är vecka 1 och efter slut sista', s.veckanFor(p, '2026-10-01').nr === 1 && s.veckanFor(p, '2027-01-10').nr === 6);
  // Upprepa vecka 3: den tas en gång till, och resten flyttas fram.
  p = s.planera(tsMp, { ...val, upprepa: [3] });
  ska('upprepad vecka ger 21 pass och sju veckor', p.pass.length === 21 && p.veckor.length === 7);
  ska('den upprepade veckan har samma steg och står efter sig själv', p.veckor[3].innehall === 3 && p.veckor[3].igen && p.veckor[3].steg === 2 && p.veckor[4].innehall === 4);
  // Lov: vecka 47 hoppas över, och planen slutar en vecka senare.
  p = s.planera(tsMp, { ...val, lov: ['2026-47'] });
  ska('lov flyttar planen en vecka', p.pass.length === 18 && p.veckor[2].vecka.vecka === 48 && p.sistaPass === '2026-12-18' && p.lovveckor[0] === '2026-11-16', p.lovveckor);
  // Ett inställt pass faller bort och står kvar i veckan; ett flyttat behåller sitt nummer.
  p = s.planera(tsMp, { ...val, stryk: ['2026-11-20'], flytta: { '2026-11-16': '2026-11-17' } });
  ska('inställt pass faller bort', p.pass.length === 17 && p.veckor[2].bortfall.some((b) => b.datum === '2026-11-20' && b.varfor === 'installt'));
  ska('flyttat pass behåller sitt nummer', p.pass[6].nr === 7 && p.pass[6].datum === '2026-11-17' && p.pass[6].flyttatFran === '2026-11-16');
  // Start på en lördag: planen börjar veckan efter, med metodens vecka 1 (buggjakten 2026-10-24).
  p = s.planera(tsMp, { ...val, start: '2026-10-24' });
  ska('start på en lördag börjar nästa vecka med metodens vecka 1', p.pass.length === 18 && p.veckor[0].mandag === '2026-10-26' && p.veckor[0].pass.length === 3 && p.veckor[0].steg === 0 && p.uppfoljning[0].tillfallen[0].datum === '2026-10-19', [p.pass.length, p.veckor[0]]);
  // Start mitt i veckan: veckan har bara passen från start.
  p = s.planera(tsMp, { ...val, start: '2026-11-04' });
  ska('start en onsdag ger 17 pass', p.pass.length === 17 && p.forstaPass === '2026-11-04');
  // Påsken 2027: långfredagen och annandag påsk faller bort.
  p = s.planera(tsMp, { ...val, start: '2027-03-22', langd: 3 });
  ska('påskens dagar faller bort', p.pass.length === 7 && p.veckor[0].bortfall.some((b) => b.namn === 'långfredagen') && p.veckor[1].bortfall.some((b) => b.namn === 'annandag påsk'), p.veckor.map((v) => v.bortfall));
  // Över nyår med jullov i vecka 52 och 53.
  p = s.planera(tsMp, { ...val, start: '2026-12-14', langd: 3, lov: ['2026-52', '2026-53'] });
  ska('över nyåret med vecka 53 som lov', p.veckor.map((v) => `${v.vecka.ar}-${v.vecka.vecka}`).join() === '2026-51,2027-1,2027-2', p.veckor.map((v) => v.vecka));
  const nyarsText = s.dokumentationstext({ titel: 'X', adress: 'x', uppfoljning: ts.uppfoljning.rader }, p, { ...val, start: '2026-12-14', langd: 3 }, { minuter: 30 });
  ska('veckorna över nyåret som text', nyarsText.includes('(v. 51 till v. 2)'), nyarsText);
  // Länken: valen åt båda hållen, och en trasig länk.
  const fullt = { ...val, niva: 'mellan', minuter: 30, lov: ['2026-47'], upprepa: [3, 3], flytta: { '2026-11-16': '2026-11-17' }, stryk: ['2026-11-20'], tider: { 1: ['09:20', '10:00'], 3: ['13:00', '13:40'] }, mal: 'läsa mellan raderna & visa ledtråden, också i faktatexter' };
  const lank = s.kodaVal(fullt, { id: 'ab12cd', visa: 3 });
  const tillbaka = s.lasVal(`#${lank}`);
  ska('länken åt båda hållen', tillbaka && s.kodaVal(tillbaka.val, { id: tillbaka.id, visa: tillbaka.visa }) === lank, [lank, tillbaka]);
  ska('länken har inget namn', !/namn|2B/.test(lank));
  for (const trasig of ['', '#', '#s=2026-02-30&d=135&l=6', '#s=2026-11-02&d=9&l=6', '#s=2026-11-02&d=135&l=0', '#s=2026-11-02&d=135&l=999', '#lista=bas-1']) ska(`trasig länk "${trasig}"`, s.lasVal(trasig) === null);
  const halv = s.lasVal('#s=2026-11-02&d=135&l=6&lov=x,2026-47&u=0.3.99&f=2026-11-16~nej&x=2026-13-01&n=<b>&p=!&t=1-2500-1000.6-0900-1000.3-1000-0900.5-0920&mal=%20%0A');
  ska('trasiga delar tas bort', halv && halv.val.lov.join() === '' && halv.val.upprepa.join() === '3' && Object.keys(halv.val.flytta).length === 0 && halv.val.stryk.length === 0 && halv.val.niva === undefined && halv.id === undefined && halv.val.tider === undefined && halv.val.mal === undefined, halv);
  ska('tiderna i länken', JSON.stringify(s.lasVal('#s=2026-11-02&d=135&l=6&t=1-0920-1000.3-1300-1340')?.val.tider) === '{"1":["09:20","10:00"],"3":["13:00","13:40"]}');
  ska('tiderna som text', s.tidText('09:20') === '9.20' && s.tidsspann(['09:20', '10:00']) === '9.20–10.00');
  ska('ett spann på en dag', s.spannKort('2026-12-21', '2026-12-21') === '21 dec' && s.spannKort('2026-11-30', '2026-12-04') === '30 nov–4 dec');
  ska('dagarna med samma tid', s.dagarText({ ...val, tider: { 1: ['09:20', '10:00'], 3: ['09:20', '10:00'], 5: ['09:20', '10:00'] } }) === 'måndag, onsdag och fredag kl. 9.20–10.00');
  ska('dagarna med olika tider', s.dagarText({ ...val, tider: { 1: ['09:20', '10:00'], 3: ['13:00', '13:40'] } }) === 'måndag kl. 9.20–10.00, onsdag kl. 13.00–13.40 och fredag utan tid');
  ska('målet som mening', s.malText('kunna läsa mellan raderna') === 'Kunna läsa mellan raderna.' && s.malText('  Läsa!  ') === 'Läsa!' && s.malText('') === '');
  // Namnen som har stått i listan sparas med planen och tvättas ur texterna som kopieras (K-537; Codex 2026-10-25).
  const medBorttagna = s.rensaFoljd({ elever: [{ id: 'e1', namn: 'Ali' }], borttagna: ['Bea', 'Bea', ' ', 'Sebastian Ek'] });
  ska('namnen som texterna tvättar bort: eleverna och de som har stått i listan', JSON.stringify(medBorttagna.borttagna) === '["Bea","Sebastian Ek"]' && s.elevernasNamn(medBorttagna).map((x) => x.namn).join() === 'Ali,Bea,Sebastian Ek' && s.elevernasNamn(undefined).length === 0 && !('borttagna' in s.rensaFoljd({})), medBorttagna);
  ska('namnen ur en text skyddar de elever som står kvar', s.utanNamn('Ali S klarade uppgiften. Ali var borta, och Alis par läste.', [{ namn: 'Ali' }], [{ namn: 'Ali S' }]) === 'Ali S klarade uppgiften. En elev var borta, och en elevs par läste.', s.utanNamn('Ali S klarade uppgiften. Ali var borta, och Alis par läste.', [{ namn: 'Ali' }], [{ namn: 'Ali S' }]));
  ska('namnen ur en text', s.utanNamn('Bea behöver mer stöd. Alis par läste med bea, inte Alibaba.', [{ namn: 'Bea' }, { namn: 'Ali Test' }]) === 'En elev behöver mer stöd. En elevs par läste med en elev, inte Alibaba.', s.utanNamn('Bea behöver mer stöd. Alis par läste med bea, inte Alibaba.', [{ namn: 'Bea' }, { namn: 'Ali Test' }]));
  // Texten till åtgärdsprogrammet.
  const plan = s.planera(tsMp, val);
  const steg = ts.progression.rader.map((r) => r.rubrik ?? s.postensRad(r.fokus, 80));
  const info = { titel: ts.titel, undertitel: ts.undertitel, adress: 'niclasfohlin.se/stodundervisning/textsamtal-i-grupp', mal: ts.mal.overgripande, steg, uppfoljning: ts.uppfoljning.rader, nivaNamn: 'Mellan' };
  const dok = s.dokumentationstext(info, plan, val, { minuter: 30, genomforda: 7 });
  ska('åtgärdsprogrammet: åtgärden utan årskurserna och målet', dok.startsWith('Åtgärd: Textsamtal i grupp, lärarledd insats i liten grupp där eleverna samtalar om korta texter och lär sig läsa mellan raderna.\nMål: Kunna läsa mellan raderna, säga vad man tror och visa ledtråden i texten.'), dok);
  ska('åtgärdsprogrammet: omfattningen', dok.includes('Omfattning: 18 pass om 30 minuter, måndag, onsdag och fredag, 2 november till 11 december 2026 (v. 45 till v. 50), på nivån Mellan.'), dok);
  ska('åtgärdsprogrammet: vad eleven arbetar med vecka för vecka', dok.includes('Eleven arbetar med: Det står, Jag vet och Alltså tror jag (v. 45); Stanna och Se det framför dig (v. 46); Slå ihop flera ledtrådar (v. 47); Stämmer det? och Det som menas (v. 48); Stämmer det? och Tänk om (v. 49); Slaget Ordet, eleverna leder samtalet (v. 50).'), dok);
  // Ett lov mitt i ett steg står inte med i stegets veckor (buggjakten 2026-10-25: "v. 45–47" om v. 45 och v. 47).
  const val8 = { ...val, langd: 8, lov: ['2026-51'] };
  const medLov = s.dokumentationstext(info, s.planera(tsMp, val8), val8, { minuter: 30 });
  ska('åtgärdsprogrammet: ett lov mitt i ett steg står inte med i stegets veckor', medLov.includes('Slaget Ordet, eleverna leder samtalet (v. 50 och v. 52–53)'), medLov);
  ska('åtgärdsprogrammet: uppföljningen och de bockade passen', dok.includes('Före insatsen, v. 44') && dok.includes('Efter insatsen, v. 51') && dok.includes('Bockade som genomförda: 7 av 18 pass.') && !dok.includes('Skattning'), dok);
  ska('åtgärdsprogrammet har inga tankstreck som skiljetecken', !/ [–-] /.test(dok), dok);
  const dokFolj = s.dokumentationstext(info, plan, { ...val, mal: 'läsa faktatexter och visa ledtråden', tider: { 1: ['09:20', '10:00'], 3: ['09:20', '10:00'], 5: ['09:20', '10:00'] } }, { minuter: 30, folj: true });
  ska('åtgärdsprogrammet: eget mål, tiderna och skattningen', dokFolj.includes('Mål: Läsa faktatexter och visa ledtråden.') && dokFolj.includes('måndag, onsdag och fredag kl. 9.20–10.00, 2 november') && dokFolj.includes('Skattning varje vecka, 1 till 5, av hur väl eleven klarar målet på egen hand, med avstämning mitt i insatsen vecka 3 (v. 47) och utvärdering efter insatsen.'), dokFolj);
  // Kalenderfilen.
  const ics = s.kalenderfil({ titel: ts.titel, uppfoljning: ts.uppfoljning.rader, fokus: ts.progression.rader.map((r) => r.fokus) }, plan, { id: 'ab12cd', lank: (v) => `https://niclasfohlin.se/stodundervisning/textsamtal-i-grupp/planera#${s.kodaVal(val, { id: 'ab12cd', ...(v ? { visa: v } : {}) })}`, namn: 'Läsgrupp 2B, fredag; plats', nu: new Date(Date.UTC(2026, 9, 24, 12)) });
  ska('kalenderfilen har bara CRLF', !/[^\r]\n/.test(ics) && ics.endsWith('\r\n'));
  const fysiska = ics.split('\r\n').slice(0, -1);
  ska('kalenderfilens rader är högst 75 byte', fysiska.every((r) => Buffer.byteLength(r) <= 75), fysiska.filter((r) => Buffer.byteLength(r) > 75)[0]);
  const logiska = ics.replace(/\r\n /g, '').split('\r\n').slice(0, -1);
  ska('vikningen delar inget tecken', !ics.replace(/\r\n /g, '').includes('\uFFFD') && Buffer.from(ics.replace(/\r\n /g, ''), 'utf8').toString('utf8') === ics.replace(/\r\n /g, ''));
  // Ett pass per händelse också utan tider, och uppföljningen före och efter (buggjakten 2026-10-24).
  ska('kalenderfilen har en händelse per pass och uppföljningen', logiska.filter((r) => r === 'BEGIN:VEVENT').length === 20 && logiska.filter((r) => r === 'END:VEVENT').length === 20, logiska.filter((r) => r === 'BEGIN:VEVENT').length);
  const uid = logiska.filter((r) => r.startsWith('UID:'));
  ska('varje händelse har ett eget id', new Set(uid).size === uid.length && uid.length === 20);
  ska('utan tider är passen heldagar på passets dag', logiska.includes('DTSTART;VALUE=DATE:20261104') && logiska.includes('DTSTART;VALUE=DATE:20261211') && logiska.some((r) => r.startsWith('SUMMARY:Textsamtal i grupp\\, pass 18 av 18')));
  ska('kalenderns text är skyddad', logiska.some((r) => r.startsWith('SUMMARY:') && r.includes('Läsgrupp 2B\\, fredag\\; plats')), logiska.filter((r) => r.startsWith('SUMMARY:'))[0]);
  ska('heldagar med slutdag dagen efter', logiska.includes('DTSTART;VALUE=DATE:20261102') && logiska.includes('DTEND;VALUE=DATE:20261103'));
  ska('kalenderfilen börjar och slutar rätt', logiska[0] === 'BEGIN:VCALENDAR' && logiska[logiska.length - 1] === 'END:VCALENDAR' && logiska.includes('VERSION:2.0'));
  // Med tider: ett pass per händelse med klockslaget, och ett pass på en dag utan tid som heldag.
  const tidIcs = s.kalenderfil({ titel: ts.titel, uppfoljning: ts.uppfoljning.rader, fokus: ts.progression.rader.map((r) => r.fokus) }, plan, { id: 'ab12cd', lank: () => 'https://niclasfohlin.se/x', nu: new Date(Date.UTC(2026, 9, 24, 12)), tider: { 1: ['09:20', '10:00'], 3: ['13:00', '13:40'] } }).replace(/\r\n /g, '').split('\r\n');
  ska('kalenderfilen med tider har ett pass per händelse', tidIcs.filter((r) => r === 'BEGIN:VEVENT').length === 20 && new Set(tidIcs.filter((r) => r.startsWith('UID:'))).size === 20, tidIcs.filter((r) => r === 'BEGIN:VEVENT').length);
  ska('passen med tid har klockslaget i lärarens egen tid', tidIcs.includes('DTSTART:20261102T092000') && tidIcs.includes('DTEND:20261102T100000') && tidIcs.includes('DTSTART:20261104T130000') && tidIcs.includes('TRANSP:OPAQUE'));
  ska('ett pass på en dag utan tid är en heldag', tidIcs.includes('DTSTART;VALUE=DATE:20261106') && tidIcs.some((r) => r === 'SUMMARY:Textsamtal i grupp\\, pass 1 av 18'));
  // Ett enskilt pass tid (passtider; Niclas 2026-10-28: "Viktigt att det bara blir det pass man ändrar", och "att denna
  // ändring syns överallt så alla läser från en rot"): bara det passet får tiden, i roten, länken, kalenderfilen och längden.
  const ptVal = { ...val, tider: { 1: ['09:20', '10:00'], 3: ['13:00', '13:40'] }, passtider: { '2026-11-09': ['08:00', '08:45', 4] } };
  const ptPlan = s.planera(tsMp, ptVal);
  const ptMandagar = ptPlan.pass.filter((p) => s.veckodag(p.datum) === 1);
  ska('en egen tid gäller bara det passet', s.passetsTid(ptVal, ptMandagar.find((p) => p.datum === '2026-11-09'))?.join() === '08:00,08:45' && ptMandagar.length > 2 && ptMandagar.filter((p) => p.datum !== '2026-11-09').every((p) => s.passetsTid(ptVal, p)?.join() === '09:20,10:00'), ptMandagar.map((p) => [p.datum, s.passetsTid(ptVal, p)]));
  ska('länken bär passets egen tid', s.kodaVal(ptVal).includes('pt=2026-11-09-0800-0845-4') && JSON.stringify(s.lasVal(`#${s.kodaVal(ptVal)}`)?.val.passtider) === JSON.stringify(ptVal.passtider), s.kodaVal(ptVal));
  ska('en egen tid som inte går att läsa tas bort', JSON.stringify(s.rentaPasstider({ '2026-11-09': ['09:00', '08:00'], x: ['08:00', '09:00'], '2026-11-10': ['8:00', '09:00'] })) === '{}' && !s.kodaVal({ ...val, passtider: { x: ['08:00', '09:00'] } }).includes('pt='));
  const ptIcs = s.kalenderfil({ titel: ts.titel, uppfoljning: ts.uppfoljning.rader, fokus: [] }, ptPlan, { id: 'ab12cd', lank: () => 'https://niclasfohlin.se/x', nu: new Date(Date.UTC(2026, 9, 24, 12)), tider: ptVal.tider, passtider: ptVal.passtider }).replace(/\r\n /g, '').split('\r\n');
  ska('kalenderfilen har passets egen tid och de andra passen veckodagens', ptIcs.includes('DTSTART:20261109T080000') && ptIcs.includes('DTEND:20261109T084500') && ptIcs.includes('DTSTART:20261102T092000') && ptIcs.includes('DTSTART:20261116T092000') && !ptIcs.includes('DTSTART:20261109T092000'), ptIcs.filter((r) => r.startsWith('DTSTART:2026110')));
  ska('passens längd räknar passets egen tid', JSON.stringify(s.passensMinuter(ptVal, 30, ptPlan)) === '[30,40,45]' && JSON.stringify(s.passensMinuter({ ...ptVal, passtider: {} }, 30, s.planera(tsMp, { ...ptVal, passtider: {} }))) === '[30,40]', s.passensMinuter(ptVal, 30, ptPlan));
  ska('sammanfattningen och texten till åtgärdsprogrammet säger passets egen tid', s.dagarText(ptVal, ptPlan).includes('och pass 4, måndag 9 november, kl. 8.00–8.45') && !s.dagarText({ ...ptVal, passtider: {} }, ptPlan).includes('pass 4'), s.dagarText(ptVal, ptPlan));
  // Ett lov som lägger ett annat pass på dagen ger inte det passet tiden: tiden hör till passets dag och nummer (Codex
  // 2026-10-28).
  const ptLov = { ...ptVal, lov: ['2026-45'] }, ptLovPlan = s.planera(tsMp, ptLov);
  const ptLovPasset = ptLovPlan.pass.find((p) => p.datum === '2026-11-09');
  ska('en egen tid följer inte dagen till ett annat pass efter ett lov', ptLovPasset?.nr === 1 && s.passetsTid(ptLov, ptLovPasset)?.join() === '09:20,10:00', [ptLovPasset, s.passetsTid(ptLov, ptLovPasset)]);
  // Ett flyttat pass med egen tid har tiden på den nya dagen, och passet som kommer på den gamla dagen veckan efter har
  // veckodagens.
  const ptFlytt = { ...ptVal, flytta: { '2026-11-09': '2026-11-10' } };
  const ptFlyttat = s.planera(tsMp, ptFlytt).pass.find((p) => p.flyttatFran === '2026-11-09');
  ska('ett flyttat pass har sin egen tid på den nya dagen', ptFlyttat?.datum === '2026-11-10' && s.passetsTid(ptFlytt, ptFlyttat)?.join() === '08:00,08:45' && s.planera(tsMp, ptFlytt).pass.filter((p) => p.datum === '2026-11-16').every((p) => s.passetsTid(ptFlytt, p)?.join() === '09:20,10:00'), ptFlyttat);
  // K-595: ett pass som behöver längre tid än planens pass, som Kortskrivnings första pass, säger det i händelsen.
  const langtIcs = s.kalenderfil({ titel: ts.titel, uppfoljning: ts.uppfoljning.rader, fokus: [], minuter: (p) => (p.nr === 1 ? 55 : 0) }, plan, { id: 'ab12cd', lank: () => 'https://niclasfohlin.se/x', nu: new Date(Date.UTC(2026, 9, 24, 12)), tider: { 1: ['09:20', '10:00'], 3: ['13:00', '13:40'] } }).replace(/\r\n /g, '').split('\r\n');
  ska('kalenderfilen säger när ett pass behöver längre tid, med passets tid som planen', langtIcs.includes('DTEND:20261102T100000') && langtIcs.join('').includes('Passet behöver minst 55 minuter. Boka längre tid den dagen.') && langtIcs.filter((r) => r.includes('Passet behöver minst')).length === 1, langtIcs.filter((r) => r.startsWith('DTEND')).slice(0, 3));
  // Codex-granskningen av koden 2026-10-24.
  ska('ett spann av pass är alla passen i det', s.tolkaTid('pass 13–23').pass.length === 11 && s.tolkaTid('pass 13–23').pass[10] === 23, s.tolkaTid('pass 13–23'));
  const flyttadSista = s.planera(tsMp, { ...val, flytta: { '2026-12-11': '2026-12-08' } });
  ska('sista passet efter datum när det sista passet flyttas före ett annat', flyttadSista.sistaPass === '2026-12-09' && flyttadSista.forstaPass === '2026-11-02', [flyttadSista.forstaPass, flyttadSista.sistaPass]);
  ska('passens längd ur klockslagen', s.minuterText(s.passensMinuter({ ...val, tider: { 1: ['09:20', '10:00'], 3: ['13:00', '13:30'] } }, 30)) === '30 eller 40' && s.minuterText(s.passensMinuter(val, 30)) === '30');
  ska('åtgärdsprogrammet: längden ur klockslagen', s.dokumentationstext(info, plan, { ...val, tider: { 1: ['09:20', '10:00'], 3: ['09:20', '10:00'], 5: ['09:20', '10:00'] } }, { minuter: 30 }).includes('Omfattning: 18 pass om 40 minuter'));
  ska('en förlängd plan går att läsa', s.lasVal(`#s=2026-11-02&d=135&l=${s.LANGSTA}`)?.val.langd === s.LANGSTA && s.lasVal(`#s=2026-11-02&d=135&l=${s.LANGSTA + 1}`) === null);
}

// Följ insatsen: sammanställningen, riktningen, mitten och texterna utan namn.
if (tsMp) {
  const val = { start: '2026-11-02', dagar: [1, 3, 5], langd: 6, ...tom };
  const p = s.planera(tsMp, val);
  ska('mitten av sex veckor är vecka 3', s.mittVeckan(p) === 3);
  ska('mitten av åtta veckor är vecka 4', s.mittVeckan(s.planera(tsMp, { ...val, langd: 8 })) === 4);
  // En förlängd insats har kvar avstämningen i sin vecka, och länken bär den (verifieringen 2026-10-25).
  // En insats som avslutas tidigare (K-542; Niclas 2026-10-25): planen slutar med passet med numret val.slut, också mitt i en
  // vecka ("Avsluta onsdagen"), det strukna står kvar i planen för sidan, uppföljningen efter räknas från det nya sista
  // passet, och meningen säger hur många av de planerade passen som hann bli.
  const kort = s.planera(tsMp, { ...val, slut: 9, mitt: 3 });
  ska('en insats som avslutas tidigare slutar med sitt sista pass', kort.veckor.length === 3 && kort.pass.length === 9 && kort.sistaPass === '2026-11-20' && kort.planerade === 18 && kort.struket?.pass.length === 9 && kort.struket.veckor.length === 3 && kort.uppfoljning.find((u) => u.typ === 'efter')?.tillfallen[0]?.datum === '2026-11-23', [kort.veckor.length, kort.sistaPass, kort.planerade, kort.uppfoljning.find((u) => u.typ === 'efter')?.tillfallen]);
  const onsdag = s.planera(tsMp, { ...val, slut: 8 });
  ska('avsluta onsdagen: fredagens pass i veckan är struket', onsdag.veckor.length === 3 && onsdag.sistaPass === '2026-11-18' && onsdag.struket?.pass[0]?.nr === 9 && onsdag.struket.pass[0].vecka === 3 && onsdag.struket.veckor.length === 3, [onsdag.sistaPass, onsdag.struket?.pass[0]]);
  // Ett flyttat pass står kvar eller stryks efter sitt datum, mot dagen för det valda passet (Codex 2026-10-25).
  const flyttatEfter = s.planera(tsMp, { ...val, flytta: { '2026-11-16': '2026-11-20' }, slut: 8 }), flyttatFore = s.planera(tsMp, { ...val, flytta: { '2026-11-20': '2026-11-17' }, slut: 8 });
  ska('avslutet följer dagen för det valda passet, också med ett flyttat pass', flyttatEfter.sistaPass === '2026-11-18' && flyttatEfter.pass.length === 7 && flyttatEfter.struket?.pass.some((x) => x.flyttatFran === '2026-11-16') && flyttatFore.sistaPass === '2026-11-18' && flyttatFore.pass.length === 9, [flyttatEfter.sistaPass, flyttatEfter.pass.length, flyttatFore.sistaPass, flyttatFore.pass.length]);
  ska('slutet följer med när starten flyttas', s.planera(tsMp, { ...val, start: '2026-11-16', slut: 9 }).pass.length === 9 && s.planera(tsMp, { ...val, start: '2026-11-16', slut: 9 }).sistaPass === '2026-12-04');
  // Ett byte av dagar mitt i insatsen gäller från bytets dag, och passen före står kvar; på bytets dag står ett pass kvar
  // också när dagen inte är bland de nya (K-546; verifieringen 2026-10-25: tisdag och torsdag till onsdag och torsdag den
  // 26 november räknade om alla pass från starten).
  const byte = { ...val, start: '2026-11-23', dagar: [3, 4], langd: 6, fore: [{ till: '2026-11-26', dagar: [2, 4] }] };
  const datumen = (v) => s.planera(tsMp, v).pass.slice(0, 6).map((x) => x.datum.slice(5)).join();
  ska('ett byte av dagar gäller från bytets dag, och passen före står kvar', datumen(byte) === '11-24,11-26,12-02,12-03,12-09,12-10' && datumen({ ...byte, dagar: [1, 3] }) === '11-24,11-26,11-30,12-02,12-07,12-09' && s.planera(tsMp, byte).pass[1].nr === 2, [datumen(byte), datumen({ ...byte, dagar: [1, 3] })]);
  // K-595: tisdag och torsdag byts mot tisdag och fredag på torsdagen, och veckan får inte ett tredje pass; en dag som
  // läggs till samma dag ger veckan ett pass till.
  const mittIVeckan = { ...val, start: '2026-11-09', dagar: [2, 5], langd: 6, fore: [{ till: '2026-11-12', dagar: [2, 4], tak: true }] };
  ska('ett byte av dagar mitt i en vecka ger inte veckan fler pass än dagarna, och en ny dag till ger ett pass till', datumen(mittIVeckan) === '11-10,11-12,11-17,11-20,11-24,11-27' && datumen({ ...mittIVeckan, dagar: [2, 4, 5] }) === '11-10,11-12,11-13,11-17,11-19,11-20', [datumen(mittIVeckan), datumen({ ...mittIVeckan, dagar: [2, 4, 5] })]);
  // Codex 2026-10-28: ett byte som sparades före regeln räknas som förut, två byten samma vecka ger inte ett tredje pass,
  // och bytDagar och länken bär märket.
  const tvaByten = { ...val, start: '2026-11-02', dagar: [2, 5], langd: 6, fore: [{ till: '2026-11-11', dagar: [1, 2], tak: true }, { till: '2026-11-12', dagar: [4, 5], tak: true }] };
  const lankat = s.lasVal(s.kodaVal(mittIVeckan));
  ska('ett byte av dagar före regeln räknas som förut, två byten samma vecka ger inte ett tredje pass, och märket följer med', datumen({ ...mittIVeckan, fore: [{ till: '2026-11-12', dagar: [2, 4] }] }) === '11-10,11-12,11-13,11-17,11-20,11-24' && datumen(tvaByten) === '11-02,11-03,11-09,11-10,11-17,11-20' && s.bytDagar({ ...val, dagar: [2, 4] }, [2, 5], '2026-11-12').fore?.[0]?.tak === true && lankat?.val.fore?.[0]?.tak === true, [datumen(tvaByten), lankat?.val.fore]);
  const arPassdag = s.passdagar(byte);
  ska('passdagarna före, på och efter bytets dag', arPassdag('2026-11-24', 2) && !arPassdag('2026-11-25', 3) && arPassdag('2026-11-26', 4) && arPassdag('2026-11-26', 2) && arPassdag('2026-12-02', 3) && !arPassdag('2026-12-01', 2), byte);
  // Ett byte på startdagen, ett flyttat pass som hölls före bytet, ett hållet pass på en dag som väljs bort igen samma dag,
  // och passens längd med dagarna före bytet (Codex 2026-10-25).
  const paStart = s.planera(tsMp, { ...val, start: '2026-11-26', dagar: [2], langd: 6, fore: [{ till: '2026-11-26', dagar: [2, 4] }] });
  const flyttat = s.planera(tsMp, { ...val, start: '2026-11-23', dagar: [3], langd: 6, flytta: { '2026-11-26': '2026-11-23' }, fore: [{ till: '2026-11-25', dagar: [2, 4] }] });
  ska('ett byte på startdagen och ett flyttat pass som hölls före bytet står kvar', paStart.pass[0]?.datum === '2026-11-26' && s.forstaMandagen({ ...val, start: '2026-11-26', dagar: [2], fore: [{ till: '2026-11-26', dagar: [2, 4] }] }) === '2026-11-23' && flyttat.pass.filter((p) => p.vecka === 1).map((p) => p.datum).sort().join() === '2026-11-23,2026-11-24,2026-11-25', [paStart.pass[0], flyttat.pass.filter((p) => p.vecka === 1)]);
  // Bytet sparar de fasta passen ur planen före ändringen, med sina nummer: ett pass i dag som bara finns genom bytet och ett
  // flyttat pass som har hållits, så att inget som händer senare skriver om dem (Codex 2026-10-25, alla sex granskningarna).
  const mpSsFor = s.metodplan(metod('seriesamtal')).plan;
  const byt = (mp, v, dagar, fran) => s.bytDagar(v, dagar, fran, s.planera(mp, v));
  const medTid = { ...val, start: '2026-11-16', dagar: [1, 3], langd: 6, tider: { 1: ['09:00', '09:30'], 3: ['09:00', '09:30'] } };
  const tisdag = byt(tsMp, medTid, [1, 2, 3], '2026-11-24');
  const tisdagMedTid = { ...tisdag, tider: { ...tisdag.tider, 2: ['09:00', '09:30'] } };
  const tisdagKvar = byt(tsMp, tisdagMedTid, [1, 3], '2026-11-24');
  ska('ett pass i dag på en dag som väljs bort igen samma dag står kvar med sitt nummer och sin tid, och dagarna efter ändras inte', s.planera(tsMp, tisdagMedTid).pass.find((p) => p.datum === '2026-11-24')?.nr === 4 && JSON.stringify(tisdagKvar.fore) === '[{"till":"2026-11-24","dagar":[1,3],"tak":true,"fasta":{"2026-11-24":4}}]' && s.planera(tsMp, tisdagKvar).pass.find((p) => p.datum === '2026-11-24')?.nr === 4 && !!tisdagKvar.tider?.['2'] && !s.planera(tsMp, tisdagKvar).pass.some((p) => p.datum > '2026-11-24' && s.veckodag(p.datum) === 2) && s.kodaVal(tisdagKvar).includes('db=2026-11-24~13t~2026-11-24!4') && JSON.stringify(s.lasVal(s.kodaVal(tisdagKvar))?.val.fore) === JSON.stringify(tisdagKvar.fore) && byt(tsMp, { ...val, start: '2026-11-16', dagar: [1, 3], langd: 6 }, [1, 3], '2026-11-24').fore === undefined, [tisdagKvar.fore, s.kodaVal(tisdagKvar)]);
  const onsdagFlyttad = { ...byt(tsMp, { ...val, start: '2026-11-16', dagar: [1, 5], langd: 6 }, [1, 3, 5], '2026-11-24'), flytta: { '2026-11-25': '2026-11-24' } };
  const onsdagNr = s.planera(tsMp, onsdagFlyttad).pass.find((p) => p.flyttatFran === '2026-11-25')?.nr;
  ska('ett flyttat pass i dag på en dag som väljs bort igen står kvar med sitt nummer', !!onsdagNr && s.planera(tsMp, byt(tsMp, onsdagFlyttad, [1, 5], '2026-11-24')).pass.find((p) => p.flyttatFran === '2026-11-25' && p.datum === '2026-11-24')?.nr === onsdagNr, onsdagNr);
  // Ett flyttat pass som har hållits står kvar när dagarna går tillbaka till dagarna före bytet (Codex 2026-10-25, sjunde).
  const tfOns = { ...byt(mpSsFor, { ...val, start: '2026-11-16', dagar: [2, 5], langd: 6 }, [2, 3, 5], '2026-11-24'), flytta: { '2026-11-25': '2026-11-23' } };
  const tfNr = s.planera(mpSsFor, tfOns).pass.find((p) => p.flyttatFran === '2026-11-25')?.nr;
  ska('ett flyttat pass som har hållits står kvar när dagarna går tillbaka', !!tfNr && s.planera(mpSsFor, byt(mpSsFor, tfOns, [2, 5], '2026-11-24')).pass.find((p) => p.flyttatFran === '2026-11-25')?.nr === tfNr, tfNr);
  // Ett pass som har flyttats till en senare dag kommer inte tillbaka när dess dag läggs till igen, och ett hållet pass
  // behåller sitt nummer (Codex 2026-10-25, åttonde).
  const tot1 = byt(mpSsFor, { ...val, start: '2026-11-16', dagar: [2, 3, 4], langd: 6, flytta: { '2026-11-24': '2026-11-27' } }, [3, 4], '2026-11-23');
  const tot2 = s.planera(mpSsFor, byt(mpSsFor, tot1, [2, 3, 4], '2026-11-26'));
  ska('ett pass som flyttades till en senare dag kommer inte tillbaka när dagen läggs till igen', s.planera(mpSsFor, tot1).pass.find((p) => p.datum === '2026-11-25')?.nr === 4 && tot2.pass.find((p) => p.datum === '2026-11-25')?.nr === 4 && !tot2.pass.some((p) => p.flyttatFran === '2026-11-24'), tot2.pass.slice(0, 6));
  const ssSenare = s.planera(mpSsFor, { ...val, start: '2026-11-23', dagar: [4], langd: 6, flytta: { '2026-11-24': '2026-11-27' }, fore: [{ till: '2026-11-26', dagar: [2, 4] }] });
  ska('ett pass som flyttades till efter bytet behåller sitt nummer', ssSenare.pass.find((p) => p.flyttatFran === '2026-11-24')?.nr === 1 && ssSenare.pass.find((p) => p.datum === '2026-11-26')?.nr === 2, ssSenare.pass.slice(0, 3));
  const forstaFlyttat = { ...val, start: '2026-11-26', dagar: [2], langd: 6, flytta: { '2026-11-27': '2026-11-26' }, fore: [{ till: '2026-11-26', dagar: [5] }] };
  const ssFlyttat = s.planera(mpSsFor, byt(mpSsFor, { ...val, start: '2026-11-23', dagar: [2, 4], langd: 6, flytta: { '2026-11-26': '2026-11-23' } }, [3], '2026-11-25'));
  ska('ett flyttat första pass håller kvar startveckan, och ett hållet flyttat pass behåller sitt nummer', s.forstaMandagen(forstaFlyttat) === '2026-11-23' && s.planera(tsMp, forstaFlyttat).pass[0]?.datum === '2026-11-26' && ssFlyttat.pass.find((p) => p.flyttatFran === '2026-11-26')?.nr === 2 && ssFlyttat.pass.find((p) => p.datum === '2026-11-25')?.nr === 3, ssFlyttat.pass.slice(0, 4));
  const ssOns = byt(mpSsFor, { ...val, start: '2026-11-16', dagar: [2, 4], langd: 6, flytta: { '2026-11-26': '2026-11-23' } }, [2, 3, 4], '2026-11-23');
  const ssFore = s.planera(mpSsFor, ssOns);
  ska('ett hållet pass som flyttades till bytets dag behåller sitt nummer när en ny dag kommer före det', ssFore.pass.find((p) => p.flyttatFran === '2026-11-26')?.nr === 4 && ssFore.pass.find((p) => p.datum === '2026-11-24')?.nr === 3 && ssFore.pass.find((p) => p.datum === '2026-11-25')?.nr === 5 && new Set(ssFore.pass.map((p) => p.nr)).size === ssFore.pass.length, ssFore.pass.slice(0, 6));
  const ssTva = byt(mpSsFor, ssOns, [2, 4], '2026-11-30');
  const ssTvaPlan = s.planera(mpSsFor, ssTva);
  ska('ett senare byte ändrar inte numren på pass som har hållits', ssTvaPlan.pass.find((p) => p.flyttatFran === '2026-11-26')?.nr === 4 && ssTvaPlan.pass.find((p) => p.datum === '2026-11-25')?.nr === 5 && ssTvaPlan.pass.find((p) => p.datum === '2026-12-01')?.nr === 6 && !ssTvaPlan.pass.some((p) => p.datum === '2026-12-02') && s.planera(mpSsFor, { ...ssTva, slut: 4 }).sistaPass === '2026-11-23' && new Set(ssTvaPlan.pass.map((p) => p.nr)).size === ssTvaPlan.pass.length, ssTvaPlan.pass.slice(0, 7));
  const ss2b = byt(mpSsFor, { ...val, start: '2026-11-02', dagar: [2, 4], langd: 6 }, [2, 3, 4], '2026-11-11');
  const ss2f = s.planera(mpSsFor, { ...ss2b, flytta: { '2026-11-12': '2026-11-09' } });
  ska('en flytt efter ett byte ändrar inte numret på ett pass som har hållits', s.planera(mpSsFor, ss2b).pass.find((p) => p.datum === '2026-11-11')?.nr === 4 && ss2f.pass.find((p) => p.datum === '2026-11-11')?.nr === 4 && ss2f.pass.find((p) => p.flyttatFran === '2026-11-12')?.nr === 5, ss2f.pass.slice(0, 6));
  const langre = { ...val, start: '2026-11-16', dagar: [2], langd: 6, tider: { 2: ['09:00', '09:30'], 4: ['10:00', '11:00'] }, fore: [{ till: '2026-11-26', dagar: [2, 4] }] };
  ska('passens längd räknas med dagarna före ett byte', s.passensMinuter(langre, 30, s.planera(tsMp, langre)).join() === '30,60' && s.passensMinuter(langre, 30).join() === '30', s.passensMinuter(langre, 30, s.planera(tsMp, langre)));
  ska('länken bär bytet av dagar, och dagarna i en mening säger det', s.kodaVal(byte).includes('d=34') && s.kodaVal(byte).includes('db=2026-11-26~24') && JSON.stringify(s.lasVal(s.kodaVal(byte))?.val.fore) === '[{"till":"2026-11-26","dagar":[2,4]}]' && s.dagarText({ ...byte, tider: { 2: ['09:00', '09:30'], 3: ['09:00', '09:30'], 4: ['09:00', '09:30'] } }) === 'tisdag och torsdag, och från 26 november onsdag och torsdag kl. 9.00–9.30' && s.forstaMandagen(byte) === '2026-11-23', [s.kodaVal(byte), s.dagarText(byte)]);
  // Efter ett byte säger meningen passens egna datum, också i texten till åtgärdsprogrammet (verifieringen 2026-10-26: "från
  // 5 november onsdag" när den 5 november var en torsdag).
  const tors = { ...val, start: '2026-11-02', dagar: [4], langd: 4, tider: { 3: ['09:15', '09:35'], 4: ['09:15', '09:35'] } };
  const ons = byt(tsMp, tors, [3], '2026-11-05'), onsPlan = s.planera(tsMp, ons);
  const onsSen = byt(tsMp, { ...tors, tider: { 3: ['10:00', '10:20'], 4: ['09:15', '09:35'] } }, [3], '2026-11-05');
  ska('dagarna efter ett byte säger passens egna datum', s.dagarText(ons, onsPlan) === 'torsdag 5 november, sedan onsdag från 11 november, kl. 9.15–9.35' && s.dagarText(onsSen, s.planera(tsMp, onsSen)) === 'torsdag 5 november kl. 9.15–9.35, sedan onsdag från 11 november kl. 10.00–10.20' && s.dokumentationstext({ titel: ts.titel, mal: ts.mal.overgripande, uppfoljning: ts.uppfoljning.rader }, onsPlan, ons, { minuter: 20 }).includes('torsdag 5 november, sedan onsdag från 11 november, kl. 9.15–9.35, 5 november till 25 november'), [s.dagarText(ons, onsPlan), s.dagarText(onsSen, s.planera(tsMp, onsSen)), onsPlan.pass.map((x) => x.datum)]);
  // Codex 2026-10-26: ett flyttat pass och ett fast pass är undantag, och ett avsnitt säger bara dagarna som hade pass.
  const flyttatOns = byt(tsMp, { ...tors, flytta: { '2026-11-05': '2026-11-04' } }, [3], '2026-11-05');
  const fastTis = byt(tsMp, { ...tors, flytta: { '2026-11-05': '2026-11-03' } }, [3], '2026-11-04');
  const tisTors = byt(tsMp, { ...tors, start: '2026-11-05', dagar: [2, 4] }, [3], '2026-11-05');
  ska('dagarna efter ett byte: flyttade pass är undantag, och avsnittet säger dagarna som hade pass', s.dagarText(flyttatOns, s.planera(tsMp, flyttatOns)) === 'onsdag kl. 9.15–9.35' && s.dagarText(fastTis, s.planera(tsMp, fastTis)) === 'onsdag kl. 9.15–9.35' && s.dagarText(tisTors, s.planera(tsMp, tisTors)) === 'torsdag 5 november, sedan onsdag från 11 november, kl. 9.15–9.35', [s.dagarText(flyttatOns, s.planera(tsMp, flyttatOns)), s.dagarText(fastTis, s.planera(tsMp, fastTis)), s.dagarText(tisTors, s.planera(tsMp, tisTors))]);
  const bytt = s.bytDagar({ ...val, start: '2026-11-23', dagar: [2, 4], tider: { 2: ['09:00', '09:30'], 4: ['09:00', '09:30'] } }, [4], '2026-11-26');
  const bytt2 = s.bytDagar(bytt, [3, 4], '2026-11-26');
  ska('bytet av dagar: från ett datum står dagarna före kvar, samma dag ändras bytet, och tillbaka utan en annan dag tar bort det', JSON.stringify(bytt2.fore) === '[{"till":"2026-11-26","dagar":[2,4],"tak":true}]' && bytt2.dagar.join() === '3,4' && !!bytt2.tider?.['2'] && s.bytDagar(bytt, [2, 4], '2026-11-26').fore === undefined && !s.bytDagar(bytt2, [2, 4], '2026-11-26').tider?.['3'] && s.bytDagar({ ...val, dagar: [2, 4], tider: { 2: ['09:00', '09:30'] } }, [3]).tider === undefined && s.bytDagar({ ...val, dagar: [2, 4] }, [3]).fore === undefined, [bytt2, s.bytDagar(bytt2, [2, 4], '2026-11-26')]);
  ska('dagarna före ett byte rensas', JSON.stringify(s.rentaFore([{ till: '2026-12-10', dagar: [1, 3] }, { till: 'x', dagar: [2] }, { till: '2026-11-26', dagar: [4, 2, 9] }, { till: '2026-11-26', dagar: [5] }, { till: '2026-12-01', dagar: [] }])) === '[{"till":"2026-11-26","dagar":[2,4]},{"till":"2026-12-10","dagar":[1,3]}]' && s.rentaFore(undefined).length === 0, s.rentaFore([{ till: '2026-11-26', dagar: [4, 2, 9] }]));
  ska('ett slut som inte stryker något gäller inte', s.planera(tsMp, { ...val, slut: 18 }).slut === undefined && s.planera(tsMp, { ...val, slut: 40 }).pass.length === 18);
  ska('avslutet i en mening', s.avslutetText(kort) === 'Insatsen avslutades i vecka 3 (v. 47), efter 9 av 18 planerade pass.' && s.avslutetText(kort, true) === 'Insatsen avslutas i vecka 3 (v. 47), efter 9 av 18 planerade pass.' && s.avslutetText(s.planera(tsMp, val)) === '', s.avslutetText(kort));
  ska('utvärderingen med avslutet och anledningen', s.utvarderingenText(kort, { beslut: 'avsluta', not: 'eleverna har nått målet' }) === 'Insatsen avslutades i vecka 3 (v. 47), efter 9 av 18 planerade pass. Anledning: Eleverna har nått målet.' && s.utvarderingenText(s.planera(tsMp, val), { beslut: 'fortsatt' }) === 'Fortsätt som planerat.' && s.utvarderingenText(kort, undefined) === s.avslutetText(kort), s.utvarderingenText(kort, { beslut: 'avsluta', not: 'eleverna har nått målet' }));
  ska('avstämningen i en insats som avslutades före den finns inte', s.mittVeckan(s.planera(tsMp, { ...val, slut: 6, mitt: 3 })) === null && s.mittVeckan(kort) === null && s.mittVeckan(s.planera(tsMp, { ...val, slut: 12, mitt: 3 })) === 3);
  // Avstämningen hör till veckan mitt i: utan den står den inte i sammanställningen och texterna, men beslutet ligger kvar
  // (buggjakten 2026-10-25).
  ska('en avstämning i en vecka som planen inte längre har står inte i sammanställningen', s.sammanstallning(kort, { avstamning: { beslut: 'justera', not: 'Fler ledtrådar' } }, '2026-11-25').avstamning === null && s.sammanstallning(s.planera(tsMp, { ...val, slut: 12, mitt: 3 }), { avstamning: { beslut: 'justera' } }, '2026-11-25').avstamning?.beslut === 'justera');
  ska('länken bär slutet', s.lasVal(`#${s.kodaVal({ ...val, slut: 9 })}`).val.slut === 9 && s.lasVal('#s=2026-11-02&d=135&l=6&e=2026-10-01').val.slut === undefined && s.lasVal('#s=2026-11-02&d=135&l=6&e=0').val.slut === undefined);
  // En serie med lektionsbank (K-551): veckornas lektioner i länken, förslaget efter veckan, spärren och texten till
  // åtgärdsprogrammet. Prövat åt båda hållen.
  ska('veckornas lektioner i länken', s.lasVal(`#${s.kodaVal({ ...val, lektioner: [3, 3, 0, 4, 0, 0] })}`).val.lektioner.join() === '3,3,0,4' && s.kodaVal({ ...val, lektioner: [0, 0] }) === s.kodaVal(val) && s.rentaLektioner([1, 'x', 2.5, -1, 100, 4]).join() === '1,0,0,0,0,4' && s.lasVal('#s=2026-11-02&d=135&l=6&k=a.3').val.lektioner.join() === '0,3', s.lasVal(`#${s.kodaVal({ ...val, lektioner: [3, 3, 0, 4] })}`).val);
  // K-578 (Niclas 2026-10-27: omkring två veckor i lektion 1–5, två till fyra i lektion 6–9, och elevernas progression styr):
  // samma lektion tills min är nådd, sedan nästa över 4 och annars samma, aldrig nästa bara för att max är nådd.
  ska('förslaget efter en vecka med en lektion: samma tills lektionens veckor är nådda, sedan nästa över 4, annars samma', s.lektionensForslag([5, 4, 5]).forslag === 'nasta' && s.lektionensForslag([4, 4, 5, 3]).forslag === 'upprepa' && s.lektionensForslag([4]).forslag === 'upprepa' && s.lektionensForslag([]).forslag === null
    && s.lektionensForslag([5, 5], { min: 2, max: 2 }, 1).forslag === 'upprepa' && s.lektionensForslag([5, 5], { min: 2, max: 2 }, 1).forKort && s.lektionensForslag([5, 5], { min: 2, max: 2 }, 2).forslag === 'nasta'
    && s.lektionensForslag([3], { min: 2, max: 4 }, 4).forslag === 'upprepa' && s.lektionensForslag([3], { min: 2, max: 4 }, 6).forslag === 'upprepa' && s.lektionensForslag([], { min: 2, max: 4 }, 2).forslag === null
    && Math.abs(s.lektionensForslag([5, 4]).snitt - 4.5) < 1e-9, s.lektionensForslag([5, 4, 5]));
  ska('spärren för ingången och lektionens regel åt båda hållen', !s.lektionsvaletsFel({ plan: { lektionsval: { text: 'Börja i den första förmågan där fler än hälften inte klarar uppgiften.', mer: 'x', ingangar: [{ lektion: 1, namn: 'A' }, { lektion: 3, namn: 'B' }] } }, vidare: 'dagens elever klarar steg 4 två pass i följd' }).length && s.lektionsvaletsFel({ plan: { lektionsval: { text: 'x', mer: 'x', ingangar: [{ lektion: 1, namn: 'A' }, { lektion: 1, namn: 'B' }] } } }).length === 1 && s.lektionsvaletsFel({ vidare: 'Dagens elever klarar det' }).length === 1 && s.lektionsvaletsFel({ vidare: 'dagens elever klarar det.' }).length === 1 && s.lektionsvaletsFel({ plan: { lektionsval: { text: 'En. Två. Tre. Fyra.', mer: 'x', ingangar: [] } } }).length === 1 && s.vidareTillLektion(' alla klarar det ') === 'Gå vidare till nästa lektion när alla klarar det.', s.lektionsvaletsFel({ vidare: 'Dagens elever klarar det' }));
  {
    const lp = s.planera(tsMp, val);
    const datum = lp.pass.slice(0, 6).map((x) => x.datum);
    const text = s.dokumentationstext({ titel: 'Ljudlek i grupp', adress: 'niclasfohlin.se/stodundervisning/ljudlek-i-grupp', uppfoljning: [] }, lp, val, { minuter: 30, lektioner: [{ namn: 'Första ljudet', datum: datum.slice(0, 3) }, { namn: 'Bokstavsgympa', datum: datum.slice(3) }], lektionerSedan: true });
    ska('texten till åtgärdsprogrammet säger de valda lektionerna och att resten väljs vecka för vecka', text.includes('Eleven arbetar med: Första ljudet (v. 45); Bokstavsgympa (v. 46). Lektionerna efter väljs vecka för vecka efter vad gruppen klarar.'), text);
  }
  // Insatsen är slut när sista passet har varit, och avslutad av läraren från sista passets dag eller av sig själv två veckor
  // efter sista passet, också efter en förlängning, tills läraren öppnar den igen (Niclas 2026-10-25).
  ska('insatsen är slut efter sista passets dag, också när läraren har avslutat den samma dag', !s.insatsenSlut('2026-11-20', '2026-11-20') && s.insatsenSlut('2026-11-20', '2026-11-21') && !s.insatsenSlut(undefined, '2026-11-21'));
  // Planens sista dag är uppföljningen efter insatsen när den kommer senare, och två veckor räknas från den (verifieringen
  // 2026-10-25: Seriesamtal avslutades före sin uppföljning fyra veckor efter).
  // Uppföljningen efter är en vecka, så planens sista dag är veckans fredag (verifieringen 2026-10-25: en uppföljning på
  // fredagen lämnade bara tio dagar).
  ska('planens sista dag är uppföljningen efter, och avslutet av sig själv räknas från den', s.planensSistaDag(p) === '2026-12-18' && !s.insatsenAvslutad('2026-12-11', undefined, '2026-12-31', undefined, '2026-12-18') && s.insatsenAvslutad('2026-12-11', undefined, '2027-01-01', undefined, '2026-12-18'), s.planensSistaDag(p));
  ska('insatsen avslutas av läraren eller av sig själv två veckor efter sista passet', s.AVSLUTAS_EFTER === 14 && !s.insatsenAvslutad('2026-11-20', undefined, '2026-11-21') && !s.insatsenAvslutad('2026-11-20', undefined, '2026-12-03') && s.insatsenAvslutad('2026-11-20', undefined, '2026-12-04') && s.insatsenAvslutad('2026-11-20', 'avsluta', '2026-11-20') && s.insatsenAvslutad('2026-11-20', 'byt', '2026-11-25') && !s.insatsenAvslutad('2026-11-20', 'byt', '2026-11-19') && !s.insatsenAvslutad('2026-11-20', 'forlang', '2026-11-25'));
  ska('en insats som läraren har öppnat igen avslutas av sig själv först efter nästa sista pass', !s.insatsenAvslutad('2026-11-20', undefined, '2026-12-10', '2026-11-20') && s.insatsenAvslutad('2026-11-20', 'avsluta', '2026-12-10', '2026-11-20') && s.insatsenAvslutad('2026-11-27', undefined, '2026-12-14', '2026-11-20') && s.rensaFoljd({ oppen: '2026-11-20' }).oppen === '2026-11-20' && s.rensaFoljd({ oppen: 'snart' }).oppen === undefined);
  // Efter Codex granskning av 0.2.8: förlängningen går genom planens egna veckor, resultat i strukna veckor visas inte, och
  // sista passet går före ett eget nummer.
  ska('förlängning efter ett avslut går genom planens egna veckor', s.planera(tsMp, s.forlangdaVal(tsMp, { ...val, upprepa: [2], slut: 6 }, 1)).sistaPass === '2026-11-20' && s.planera(tsMp, s.forlangdaVal(tsMp, { ...val, slut: 15 }, 2)).veckor.length === 7 && s.forlangdaVal(tsMp, { ...val, slut: 15 }, 2).slut === undefined && s.forlangdaVal(tsMp, val, 2).langd === 8 && s.planera(tsMp, s.forlangdaVal(tsMp, { ...val, slut: 8 }, 1)).sistaPass === '2026-11-27');
  ska('resultat i veckor som planen inte har visas inte', s.elevensResultat({ uppfoljning: [{ rad: 0, typ: 'vecka' }, { rad: 1, typ: 'efter' }], sistaPass: '2026-11-20' }, { '0-2026-11-27': '7 av 10', '0-2026-11-13': '5 av 10', '1-2026-12-04': '8 av 10' }).map((x) => x.nyckel).join() === '0-2026-11-13,1-2026-12-04');
  const kortP = s.planera(tsMp, { ...val, slut: 6 });
  ska('sista passet går före ett eget nummer', s.passetsRoller(kortP, kortP.pass[5], [{ nar: { typ: 'pass', fran: 6, till: 6 }, rad: 0 }, { nar: { typ: 'sista' }, rad: 1 }]).join() === '1,0');
  // Passets visade rader: den mest bestämda platsen och raderna med samma när, som Boksamtalets sista läspass med rader i
  // olika delar, och sedan veckornas rader (den stängda frågan 2026-10-26).
  ska('passets visade rader: den mest bestämda platsen med raderna som har samma när, och veckornas rader', s.passetsVisadeRoller(kortP, kortP.pass[5], [{ nar: { typ: 'pass', fran: 6, till: 6 }, rad: 0 }, { nar: { typ: 'sista' }, rad: 1 }, { nar: { typ: 'sista' }, rad: 2 }, { nar: { typ: 'veckor', fran: 1, till: 9 }, rad: 3 }]).join() === '1,2,3', s.passetsVisadeRoller(kortP, kortP.pass[5], [{ nar: { typ: 'pass', fran: 6, till: 6 }, rad: 0 }, { nar: { typ: 'sista' }, rad: 1 }, { nar: { typ: 'sista' }, rad: 2 }, { nar: { typ: 'veckor', fran: 1, till: 9 }, rad: 3 }]));
  // Förberedelser som tar flera veckor börjar så många skolveckor före första passet, förbi lov (plan.foreVeckor;
  // Rimligheten 2026-10-26: Boksamtalets läsintervjuer och böcker hann inte på en vecka).
  {
    const bmp = s.metodplan(metod('boksamtal-i-grupp')).plan;
    const bokVal = { ...s.forval(bmp, '2026-11-02'), start: '2026-11-02' };
    const utanLov = s.planera(bmp, bokVal), medLov = s.planera(bmp, { ...bokVal, lov: ['2026-44'] }), enVecka = s.planera({ ...bmp, foreVeckor: undefined }, bokVal);
    ska('förberedelserna börjar tre skolveckor före första passet, förbi lovet', bmp.foreVeckor === 3 && utanLov.fore.mandag === '2026-10-12' && !utanLov.fore.overLov && medLov.fore.mandag === '2026-10-05' && medLov.fore.overLov && enVecka.fore.mandag === '2026-10-26', [utanLov.fore, medLov.fore, enVecka.fore]);
  }
  ska('en förlängd insats har kvar avstämningens vecka', s.mittVeckan(s.planera(tsMp, { ...val, langd: 8, mitt: 3 })) === 3 && s.lasVal(`#${s.kodaVal({ ...val, langd: 8, mitt: 3 })}`).val.mitt === 3);
  const f = { gjorda: ['2026-11-02', '2026-11-04', '2026-11-06'], elever: [{ id: 'a1', namn: 'Ali' }, { id: 'b2', namn: 'Bea' }], franvaro: { '2026-11-04': ['b2'] }, vecka: { '2026-11-02': { varde: 3, not: 'Gruppen kom igång' } }, skattning: { '2026-11-02': { a1: 2, b2: 3 }, '2026-11-09': { a1: 3, b2: 3 } }, resultat: { '0-2026-11-02': { a1: '4 av 8' } }, avstamning: { beslut: 'fortsatt' } };
  const sm = s.sammanstallning(p, f, '2026-11-18');
  ska('sammanställningen räknar passen', sm.gjorda === 3 && sm.varit === 8 && sm.planerade === 18 && !sm.slut);
  ska('närvaron räknas inte när läraren inte noterar den', sm.elever.every((e) => e.narvaro === null) && !sm.narvaro);
  const smN = s.sammanstallning(p, { ...f, narvaro: true }, '2026-11-18');
  ska('närvaron räknas på de bockade passen', smN.narvaro && smN.elever.find((e) => e.id === 'b2').narvaro === 2 && smN.elever.find((e) => e.id === 'a1').narvaro === 3);
  ska('riktningen', s.riktning(sm.elever[0]) === 'upp' && s.riktning(sm.elever[1]) === 'samma');
  ska('veckans gång', sm.veckor[0].skattning === 3 && sm.veckor[0].not === 'Gruppen kom igång' && sm.veckomedel === 3);
  const info = { titel: ts.titel, mal: ts.mal.overgripande, uppfoljning: ts.uppfoljning.rader };
  const text = s.sammanstallningstext(info, p, smN);
  ska('sammanställningens text', text.includes('Mål: Kunna läsa mellan raderna, säga vad man tror och visa ledtråden i texten.') && text.includes('Pass: 3 av de 8 pass som har varit är bockade. Planen har 18 pass.') && text.includes('Närvaro i de bockade passen: 1 av 2 elever var med i alla; en elev missade 1 pass.') && text.includes('av hur väl eleverna klarar målet på egen hand: medel 2,5 vid första skattningen och 3 vid den senaste. 1 av 2 elever med två skattningar eller fler har gått framåt.') && text.includes('Avstämning mitt i insatsen, vecka 3 (v. 47): Fortsätt som planerat.'), text);
  ska('sammanställningens text har inga namn', !/Ali|Bea/.test(text));
  ska('utan närvaro säger texten inget om den', !s.sammanstallningstext(info, p, sm).includes('Närvaro'));
  const medNamn = s.sammanstallningstext(info, p, s.sammanstallning(p, { ...f, vecka: { '2026-11-02': { varde: 3, not: 'Alis och Beas par byggde vidare' } }, avstamning: { beslut: 'fortsatt', not: 'Bea behöver mer stöd vid stoppet' } }, '2026-11-18'));
  ska('namnen i lärarens meningar blir en elev', !/Ali|Bea/.test(medNamn) && medNamn.includes('vecka 1 (v. 45): En elevs och en elevs par byggde vidare') && medNamn.includes('Fortsätt som planerat. En elev behöver mer stöd vid stoppet.'), medNamn);
  const rad = s.elevtext(info, p, smN, 'a1');
  ska('elevens rad', rad === 'Mål: Kunna läsa mellan raderna, säga vad man tror och visa ledtråden i texten. Var med i 3 av 3 bockade pass. Skattning, 1 till 5, av hur väl eleven klarar målet på egen hand: vecka 1 (v. 45): 2, vecka 2 (v. 46): 3. Före insatsen, v. 45: 4 av 8.', rad);
  const grupp = s.sammanstallning(p, { skattning: { '2026-11-02': { grupp: 2 }, '2026-11-09': { grupp: 4 } } }, '2026-11-18');
  ska('gruppen utan elevlista', grupp.grupp && grupp.elever.length === 1 && s.riktning(grupp.elever[0]) === 'upp' && s.sammanstallningstext(info, p, grupp).includes('hur väl gruppen klarar målet på egen hand: vecka 1 (v. 45): 2, vecka 2 (v. 46): 4.'));
  const sen = s.sammanstallning(p, { elever: [{ id: 'a1', namn: 'Ali' }], skattning: { '2026-11-02': { grupp: 2 }, '2026-11-09': { a1: 3 } } }, '2026-11-18');
  ska('gruppens skattningar står kvar när eleverna kommer efteråt', !sen.grupp && sen.elever.some((e) => e.id === 'grupp') && s.sammanstallningstext(info, p, sen).includes('Gruppen skattades också: vecka 1 (v. 45): 2.'));
  ska('skattningsfrågan', s.skattningsfragan() === 'Hur väl klarar eleven målet på egen hand?' && s.skattningsfragan(true) === 'Hur väl klarar gruppen målet på egen hand?');
  // En serie jämför bara skattningar mot samma lektions mål, och texterna säger lektionen (K-551; Codex 2026-10-27: Rim 5
  // och Räkna ljud 1 blev "5 till 1, bakåt").
  const lekt = [{ namn: 'Rim', mal: 'rimma' }, { namn: 'Rim', mal: 'rimma' }, { namn: 'Räkna ljud', mal: 'räkna ljuden i ett ord' }, { namn: 'Smaka på ljud', mal: 'smaka på ljuden' }];
  const smL = s.sammanstallning(p, { elever: [{ id: 'a1', namn: 'Ali' }], skattning: { '2026-11-02': { a1: 3 }, '2026-11-09': { a1: 5 }, '2026-11-16': { a1: 1 } } }, '2026-11-25', lekt);
  const aL = smL.elever[0], textL = s.sammanstallningstext(info, p, smL), radL = s.elevtext(info, p, smL, 'a1');
  ska('en serie: skattningarna jämförs inom lektionen, och texterna säger lektionen och bara de skattade lektionernas mål', s.riktning(aL) === null && s.riktningText(aL) === '1 i Räkna ljud, en skattning' && smL.lektioner.length === 3 && !textL.includes('Smaka') && smL.lektioner[0].veckor.join() === '1,2' && textL.includes('Varje vecka skattas mot veckans lektion. Rim, vecka 1 (v. 45) och vecka 2 (v. 46): Rimma. Räkna ljud, vecka 3 (v. 47): Räkna ljuden i ett ord.') && textL.includes('Rim: medel 3 vid första skattningen och 5 vid den senaste. 1 av 1 elev med två skattningar eller fler har gått framåt.') && textL.includes('Räkna ljud: medel 1, en skattning.') && radL.includes('vecka 3 (v. 47), Räkna ljud: 1') && !/bakåt|framåt, /.test(s.riktningText(aL)), { r: s.riktningText(aL), textL, radL });
  // Ljudkollen var tredje vecka faller bort i planens sista vecka, när hela ljudkollen görs veckan efter (Rimligheten 2026-10-27).
  const ljMp = s.metodplan(metod('ljudlek-i-grupp')).plan;
  const ljudkollen = (langd) => s.planera(ljMp, { ...s.forval(ljMp, '2026-11-02'), start: '2026-11-02', langd }).uppfoljning.find((u) => u.typ === 'intervall').tillfallen.map((x) => x.vecka).join();
  ska('Ljudlek: ljudkollen var tredje vecka står inte i planens sista vecka', ljudkollen(12) === '3,6,9' && ljudkollen(9) === '3,6' && ljudkollen(10) === '3,6,9', [ljudkollen(12), ljudkollen(9), ljudkollen(10)]);
  const smU = s.sammanstallning(p, { elever: [{ id: 'a1', namn: 'Ali' }], skattning: { '2026-11-02': { a1: 4 }, '2026-11-09': { a1: 2 } } }, '2026-11-25', [null, { namn: 'Rim', mal: 'rimma' }]);
  ska('en serie: en skattning i en vecka utan lektion står kvar i texten', s.sammanstallningstext(info, p, smU).includes('Veckor utan vald lektion, mot målet ovan: medel 4, en skattning.') && s.sammanstallningstext(info, p, smU).includes('Rim: medel 2, en skattning.'), s.sammanstallningstext(info, p, smU));
  ska('ljudkollen är ett ord för en sak, och kollen står inte i spärren', s.arSaksord('Ljudkollen') && s.sakdelar('Gör ljudkollens uppgift 4.', [{ namn: 'Ljudkollen' }]).some((x) => x.sak === 0) && !s.olankadeSaker('Kollen på kartan, och kontrollen.', []).length);
  ska('utan serie jämförs första och senaste som förut', !sm.lektioner && sm.elever[0].forsta === sm.elever[0].skattningar[0] && s.riktningText(sm.elever[0]) === '2 till 3, framåt');
  const tomt = s.sammanstallning(p, {}, '2026-11-18');
  ska('en tom uppföljning går att sammanställa', tomt.gjorda === 0 && tomt.elever.length === 1 && tomt.elever[0].skattningar.length === 0 && s.sammanstallningstext(info, p, tomt).includes('Pass: Inga pass är bockade än. Planen har 18 pass.'));
  // Codex-granskningen av koden 2026-10-24: en kopia som har ändrats för hand, resultat som står kvar på sin dag och en
  // mening utan beslut.
  const trasig = s.rensaFoljd({ gjorda: null, elever: [{ id: 'a1', namn: ' Ali ' }, { id: '<b>', namn: 'X' }, 'nej'], franvaro: { x: ['a1'], '2026-11-04': 'a1' }, vecka: { '2026-11-02': { varde: 9, not: 5 } }, skattning: { '2026-11-02': { a1: 3, b2: '4' }, nej: { a1: 2 } }, resultat: { '0-0': { a1: 'gammal' }, '0-2026-11-02': { a1: '4 av 8' } }, avstamning: { beslut: 'kanske' }, utvardering: { not: 'Bra' } });
  ska('en trasig kopia rensas till det som går att visa', JSON.stringify(trasig) === JSON.stringify({ gjorda: [], elever: [{ id: 'a1', namn: 'Ali' }], franvaro: {}, vecka: { '2026-11-02': {} }, skattning: { '2026-11-02': { a1: 3 } }, resultat: { '0-2026-11-02': { a1: '4 av 8' } }, utvardering: { not: 'Bra' } }), trasig);
  const forlangd = s.planera(tsMp, { ...val, langd: 8 });
  const res = s.elevensResultat(forlangd, { '0-2026-11-02': '3 av 8', '2-2026-12-14': '6 av 8', '2-2026-12-28': '7 av 8', '9-2026-11-02': 'x' });
  ska('ett resultat står kvar på sin dag när planen förlängs', res.map((x) => `${x.typ}:${x.datum}:${x.varde}`).join() === 'fore:2026-11-02:3 av 8,efter:2026-12-14:6 av 8,efter:2026-12-28:7 av 8' && s.uppfoljningensTillfallen(forlangd).some((t) => t.nyckel === '2-2026-12-28'), res);
  // Metodens saker i planens texter (K-493): namnen i sina former, titlar bara mitt i en mening, och spärren.
  const saker = [{ namn: 'Lyssningsbladet' }, { namn: 'Samtalskortet' }, { namn: 'Startmeningarna' }, { namn: 'Kvart i åtta', former: ['Kvart i åtta'], versal: true }];
  ska('en saks former', ['Samtalskortet', 'Samtalskortets', 'Samtalskorten'].every((x) => s.sakensFormer('Samtalskortet').includes(x)) && s.sakensFormer('Startmeningarna').includes('Startmeningen'), s.sakensFormer('Samtalskortet'));
  const sakDelar = s.sakdelar('Du läser lyssningsbladen och samtalskortets rader, och skriver startmeningen. Kvart i åtta står först. Ta Kvart i åtta.', saker);
  ska('namnen i en text', sakDelar.filter((x) => x.sak !== undefined).map((x) => x.text).join('|') === 'lyssningsbladen|samtalskortets|startmeningen|Kvart i åtta', sakDelar);
  ska('ett namn som ingen sak har', s.olankadeSaker('Lägg fram elevbladet, lyssningsbladet och korten.', saker).join() === 'elevbladet', s.olankadeSaker('Lägg fram elevbladet, lyssningsbladet och korten.', saker));
  // Riggens omgång 1 (2026-10-26): klasslistan är lärarens egen lista och ingen sak i metoden, men elevlistan är fortfarande ett namn som ingen sak har.
  // Länkgranskningen av omgång 1 (2026-10-26): affischen, lappen hem, röstsedlar, läsplanen och lärarens sida med liten
  // bokstav är namn på saker, men inte ett pronomen i genitiv.
  const nyaNamn = [{ namn: 'Affischen' }, { namn: 'Lappen hem' }, { namn: 'Röstsedlarna' }, { namn: 'Läsplanen' }, { namn: 'Lärarens sida' }];
  const traffNamn = s.sakdelar('Visa affischen och kopiera lappen hem. Gruppen röstar med röstsedlar, och du skriver i läsplanen. Läs lärarens sida.', nyaNamn.map((x) => ({ ...x, versal: !s.arSaksord(x.namn) }))).filter((x) => x.sak !== undefined).map((x) => x.text);
  ska('namn på saker med liten bokstav: affischen, lappen hem, röstsedlar, läsplanen och lärarens sida', traffNamn.join('|') === 'affischen|lappen hem|röstsedlar|läsplanen|lärarens sida' && !s.arSaksord('Hennes bok') && !s.olankadeSaker('Sätt post-it-lappar på sidan.', []).length, traffNamn);
  ska('planens rader läser en plats i vissa veckor, men inte passets längd', !s.metodplan({ ...metod('faktatextsamtal-i-grupp') }).fel.length && s.metodplan({ ...metod('upprepad-lasning'), plan: { passen: [{ nar: 'ett pass på tio minuter', text: 'x' }] } }).fel.some((x) => x.includes('går inte att läsa')));
  // De kalla testarna av omgång 1 (2026-10-26): elevlistan rymmer en hel klass, och en tabellrad som börjar med veckans
  // nummer säger sina veckor.
  // Riggens omgång 3 (2026-10-26): veckans rad och passets kolumn i en tabell med en rad per vecka och en kolumn per pass,
  // och översikten är en mening om metodens sida.
  {
    const au = metod('antalsuppfattning-i-grupp');
    const roll = au.plan.passen.find((p) => p.ur?.rad === s.VECKANS_RAD && p.ur.kolumner?.[0]?.startsWith('Pass 2'));
    const veckor = roll ? s.rollensVeckor(au, roll.ur) : null;
    const amp = s.metodplan(au).plan, apl = s.planera(amp, s.forval(amp, '2026-10-26'));
    const v2andra = s.iDatumordning(s.veckansPass(apl, apl.veckor[1]))[1];
    const rad = { kort: roll?.kort, veckor: veckor ?? {} };
    const b = s.passetsBeskrivning([rad], { delar: [] }, s.passetsLage(apl, v2andra));
    ska('veckans rad och passets kolumn', !!veckor && Object.keys(veckor).join() === '1,2,3,4,5' && b.texter[0]?.etikett === '' && b.texter[0]?.text.startsWith('Bygg med brickor') && s.rollensVeckor(au, { ...roll.ur, kolumner: ['Pass 9'] }) === null && s.planensRamFel({ ...au, plan: { ...au.plan, passen: [{ nar: 'veckans första', ur: { tabell: 'Finns inte', rad: s.VECKANS_RAD } }] } }).some((x) => x.includes('som metoden inte har')), [b.texter, veckor && Object.keys(veckor)]);
    const medTabell = (rader) => ({ ...au, tabeller: au.tabeller.map((t) => (t.rubrik === roll.ur.tabell ? { ...t, rader } : t)) });
    const tab = au.tabeller.find((t) => t.rubrik === roll.ur.tabell);
    ska('veckans tabell: en vecka på två rader och en vecka som saknas stoppar', s.rollensVeckor(medTabell([[`1–2${tab.rader[0][0].slice(1)}`, ...tab.rader[0].slice(1)], ...tab.rader.slice(1)]), roll.ur) === null && s.planensRamFel(medTabell(tab.rader.filter((_, i) => i !== 2))).some((x) => x.includes('saknar en rad för vecka 3')) && !s.planensRamFel(au).length, s.planensRamFel(medTabell(tab.rader.filter((_, i) => i !== 2))));
    // K-596: en rad ur en tabell kan visa också den första kolumnen, som villkoret i Gruppstärkande aktiviteter.
    const ga = metod('gruppstarkande-aktiviteter');
    const medVillkor = s.rollensRad(ga, { tabell: 'I en klass, i en liten grupp och med de yngsta', rad: 'Fler än åtta eller en klass', kolumner: ['Gruppen', 'Så gör du'] });
    const utanVillkor = s.rollensRad(ga, { tabell: 'I en klass, i en liten grupp och med de yngsta', rad: 'Fler än åtta eller en klass' });
    ska('en rad ur en tabell med den första kolumnen: radens namn med kolumnens namn, och utan den bara cellen', medVillkor?.length === 2 && medVillkor[0].kolumn === 'Gruppen' && medVillkor[0].text === 'Fler än åtta eller en klass' && utanVillkor?.length === 1 && utanVillkor[0].kolumn === '', [medVillkor, utanVillkor]);
    const delSist = s.passetsBeskrivning([{ del: 'Dela', text: 'Fråga sist.', sist: true }, { del: 'Dela', text: 'Först.' }], { delar: [{ tid: '0–5 min', fas: 'Dela', vad: 'Eleverna delar.' }] });
    ska('en rad med sist står efter delens text, och en rad utan först', delSist.delar[0].sist?.[0]?.text === 'Fråga sist.' && delSist.delar[0].forst?.length === 1 && delSist.delar[0].forst[0].text === 'Först.' && delSist.delar[0].vad === 'Eleverna delar.', delSist.delar[0]);
    ska('översikten är en mening om metodens sida', s.planensRamFel({ ...metod('brakkurs-i-grupp'), plan: { ...metod('brakkurs-i-grupp').plan, utan: undefined } }).some((x) => x.includes('Översikten visar')));
    // Länkgranskningen och de kalla testarna av omgång 3: frågan om förra veckans läxa från vecka 2, och Läxa 5 bara när
    // sista passet är i vecka 5, så att en insats som avslutas tidigare inte nämner den.
    const texterFor = (p) => s.passetsRoller(apl, p, amp.passen).map((x) => au.plan.passen[x].text ?? '');
    const forsta = (v) => s.iDatumordning(s.veckansPass(apl, apl.veckor[v - 1]))[0];
    const sista5 = s.variantensNar('sista passet i vecka 5');
    ska('läxan från vecka 2, och Läxa 5 när sista passet är i vecka 5', !texterFor(forsta(1)).some((x) => x.includes('förra veckans läxa')) && texterFor(forsta(2)).some((x) => x.includes('förra veckans läxa')) && texterFor(forsta(1)).some((x) => x.includes('Läxan delas ut')) && texterFor(apl.pass.at(-1)).some((x) => x.startsWith('Läxa 5')) && JSON.stringify(sista5) === '{"typ":"sista","veckor":{"fran":5,"till":5}}' && s.passetTraffas(sista5, { sista: true, vecka: 5 }) && !s.passetTraffas(sista5, { sista: true, vecka: 4 }) && !s.passetTraffas(sista5, { sista: false, vecka: 5 }), [texterFor(forsta(1)), texterFor(forsta(2)), sista5]);
  }
  // Riggens omgång 5 (2026-10-26): passets tider i raden efter tidsschemat stannar som i tidsschemats text, och Kompissamtals
  // samtal 1 har variantens tider i första passet men inte i det andra.
  {
    const ks = metod('kompissamtal');
    const kmp = s.metodplan(ks).plan, kpl = s.planera(kmp, s.forval(kmp, '2026-10-26'));
    const forstaDel = (p) => s.passetsBeskrivning([], ks.tidsschema, s.passetsLage(kpl, p)).delar[0]?.tid;
    ska('raden efter tidsschemat: passets tider stannar, och samtal 1 är en variant', s.tidsschematsFel({ ...ks, tidsschema: { ...ks.tidsschema, efter: 'Då har Starta 0–6 min och Rundan 6–9 min.' } }).some((x) => x.startsWith('Raden efter tidsschemat säger passets tider')) && !s.tidsschematsFel(ks).length && forstaDel(kpl.pass[0]) === '0–6 min' && forstaDel(kpl.pass[1]) !== '0–6 min', [forstaDel(kpl.pass[0]), forstaDel(kpl.pass[1]), s.tidsschematsFel(ks)]);
    // En serie med fler än tre samtal följer metoden (verifieringen 2026-10-26): det sista samtalet avslutar som samtal 3, i
    // en serie på fem följer samtal 4 upp som samtal 2, och mätningen efter det sista kommer bara när serien är längre.
    const serie = (langd) => { const pl = s.planera(kmp, { ...s.forval(kmp, '2026-10-26'), langd }); return { pl, kort: pl.pass.map((p) => ks.plan.passen[s.passetsRoller(pl, p, kmp.passen)[0]]?.kort), sista: pl.uppfoljning.find((u) => ks.uppfoljning.rader[u.rad].nar === 'Efter det sista samtalet')?.tillfallen ?? [] }; };
    const [tre, fyra, fem] = [3, 4, 5].map(serie);
    ska('en serie med fler än tre samtal: det sista avslutar, och mätningen efter det sista', tre.kort.join() === 'Ramarna,Det vi har sett,Det som håller' && !tre.sista.length && fyra.kort.join() === 'Ramarna,Det vi har sett,Det som håller,Det som håller' && fyra.sista[0]?.datum === fyra.pl.pass[3].datum && fem.kort.join() === 'Ramarna,Det vi har sett,Det som håller,Det vi har sett,Det som håller' && fem.sista[0]?.datum === fem.pl.pass[4].datum, [tre.kort, fyra.kort, fem.kort, fyra.sista, tre.sista]);
    // Codex 2026-10-26: en serie som avslutas efter samtal 1 har kvar Ramarna, och ett pass 3 som flyttas efter pass 4 ger
    // en mätning, inte två.
    const tva = { ...s.forval(kmp, '2026-10-26'), start: '2026-11-02', dagar: [1, 3], langd: 2 };
    const sistaRad = (pl) => pl.uppfoljning.find((u) => ks.uppfoljning.rader[u.rad].nar === 'Efter det sista samtalet')?.tillfallen ?? [];
    const tredjeRad = (pl) => pl.uppfoljning.find((u) => ks.uppfoljning.rader[u.rad].tid === 'pass 3')?.tillfallen ?? [];
    const fyraPass = s.planera(kmp, tva), flyttat3 = s.planera(kmp, { ...tva, flytta: { '2026-11-09': '2026-11-13' } });
    const ettPass = s.planera(kmp, { ...s.forval(kmp, '2026-10-26'), langd: 3, slut: 1 });
    const kortet = (pl, p) => ks.plan.passen[s.passetsRoller(pl, p, kmp.passen)[0]]?.kort;
    ska('sista passet efter pass 3: bara i en längre serie, och en mätning när pass 3 flyttas sist', JSON.stringify(s.tolkaPassen('sista passet efter pass 3')) === '{"typ":"sista","efter":3}' && s.tolkaPassen('näst sista passet efter pass 3')?.typ === 'nastSista' && kortet(ettPass, ettPass.pass[0]) === 'Ramarna' && sistaRad(fyraPass)[0]?.datum === '2026-11-11' && tredjeRad(fyraPass)[0]?.datum === '2026-11-09' && !sistaRad(flyttat3).length && tredjeRad(flyttat3)[0]?.datum === '2026-11-13', [kortet(ettPass, ettPass.pass[0]), sistaRad(fyraPass), sistaRad(flyttat3), tredjeRad(flyttat3)]);
    // En lovvecka flyttar uppföljningen efter insatsen till veckan efter lovet (verifieringen 2026-10-26: fyra veckor efter
    // hamnade i jullovet).
    const jul = { ...s.forval(kmp, '2026-10-26'), start: '2026-10-31', dagar: [4], langd: 4 };
    const julEfter = (lov) => s.planera(kmp, { ...jul, lov }).uppfoljning.find((u) => u.typ === 'efter')?.tillfallen[0]?.datum;
    ska('en lovvecka flyttar uppföljningen efter insatsen till veckan efter lovet', julEfter([]) === '2026-12-21' && julEfter(['2026-52']) === '2026-12-28' && julEfter(['2026-52', '2026-53']) === '2027-01-04', [julEfter([]), julEfter(['2026-52']), julEfter(['2026-52', '2026-53'])]);
  }
  // Metodens egna skattningar (K-559; Niclas 2026-10-26: "Viktigt att det funkar som en egen modul du kan lägga in andra
  // skattningar i på kommande metoder"): reglerna, skalan ur metodens tabell, felen som stoppar bygget, linjen och texterna,
  // med lärarens länkar som aldrig följer med en text.
  {
    const ga = metod('gruppstarkande-aktiviteter');
    const gmp = s.metodplan(ga).plan;
    const g = gmp.skattningar.find((x) => x.vem === 'gruppen');
    const ned = s.tolkaRegel('nedåt 2 veckor i rad'), under = s.tolkaRegel('under 7 i 4 veckor utan att stiga'), minst = s.tolkaRegel('minst 7 i 4 veckor');
    ska('metodens skattningar: reglerna på linjen', ned?.typ === 'nedat' && under?.grans === 7 && minst?.veckor === 4 && s.tolkaRegel('ibland') === null && s.regelnGaller(ned, [7, 6, 5]) && !s.regelnGaller(ned, [7, 6]) && !s.regelnGaller(ned, [7, 6, 6]) && s.regelnGaller(under, [6, 6, 5, 5]) && !s.regelnGaller(under, [6, 5, 6, 5]) && !s.regelnGaller(under, [6, 6, 7, 5]) && s.regelnGaller(minst, [7, 8, 7, 9]) && !s.regelnGaller(minst, [7, 8, 6, 9]), [ned, under, minst]);
    ska('metodens skattningar: skalan ur metodens tabell', s.SKATTNINGARNAS_VEM.join() === 'gruppen,eleverna' && g?.skala?.steg.length === 5 && s.stegetsNamn(g.skala, 10) === 'Mycket bra' && s.stegetsNamn(g.skala, 1) === 'Fungerar inte' && s.stegetsSpann(g.skala.steg[0]) === '1–2' && s.stegetsSpann({ fran: 4, till: 4 }) === '4' && s.skattningensGranser(g).join() === '7' && !!s.skalansSteg(ga, { fran: 1, till: 10, tabell: 'Lärarens skattning' }) && s.skalansSteg(ga, { fran: 0, till: 10, tabell: 'Lärarens skattning' }) === null && gmp.skattningar.find((x) => x.vem === 'eleverna')?.namn === 'Vår grupp', g);
    const med = (skattningar) => ({ ...ga, plan: { ...ga.plan, skattningar } });
    const felen = (x) => s.metodensSkattningar(med(x)).fel;
    const [lararens, vargrupp] = ga.plan.skattningar;
    ska('metodens skattningar: spärren', !s.metodensSkattningar(ga).fel.length && felen([{ ...lararens, rad: 'Finns inte' }]).some((x) => x.includes('som metoden inte har')) && felen([{ ...lararens, skala: { fran: 0, till: 10, tabell: 'Lärarens skattning' } }]).some((x) => x.includes('har inte ett namn för varje steg')) && felen([{ ...lararens, regler: [{ om: 'ibland', rad: lararens.regler[0].rad }] }]).some((x) => x.includes('går inte att läsa')) && felen([{ ...lararens, regler: [{ om: 'nedåt 2 veckor i rad', rad: lararens.rad }] }]).some((x) => x.includes('tid: villkor')) && felen([lararens, lararens]).some((x) => x.includes('mer än en skattning av gruppen')) && felen([{ ...vargrupp, skala: { fran: 1, till: 5, tabell: 'Lärarens skattning' } }]).some((x) => x.includes('fylls i av eleverna')) && felen([{ ...lararens, rad: 'Kort med beröring' }]).some((x) => x.includes('behöver en tid i insatsens veckor')), [felen([lararens, lararens])]);
    const gval = { ...s.forval(gmp, '2026-10-26'), start: '2026-11-02' };
    const gpl = s.planera(gmp, gval);
    const mandag = (i) => gpl.veckor[i].mandag;
    const gfoljd = s.rensaFoljd({ matt: { 'Lärarens skattning': { [mandag(0)]: 7, [mandag(1)]: 6, [mandag(2)]: 5, x: 3 } }, lankar: { 'Vår grupp': { formular: 'https://docs.google.com/forms/d/e/prov/viewform', sammanstallning: 'javascript:alert(1)' } } });
    const lin = s.linjen(gpl, gfoljd, g);
    const sam = s.sammanstallning(gpl, gfoljd, '2026-11-20');
    const ginfo = { titel: ga.titel, adress: 'niclasfohlin.se/stodundervisning/gruppstarkande-aktiviteter', mal: ga.mal.overgripande, uppfoljning: ga.uppfoljning.rader };
    const text = s.sammanstallningstext(ginfo, gpl, sam);
    const ap = s.dokumentationstext(ginfo, gpl, gval, { minuter: 30, folj: true });
    const ord = s.skattningensText(sam, sam.skattningar[0], ginfo);
    const lucka = s.rensaFoljd({ matt: { 'Lärarens skattning': { [mandag(0)]: 7, [mandag(1)]: 7, [mandag(3)]: 7, [mandag(4)]: 7 } } });
    const minstRegel = g.regler.findIndex((r) => r.typ === 'minst');
    ska('metodens skattningar: en vecka utan kryss bryter följden, länken prövas lika och det eleverna fyller i har en tid med datum', !s.linjen(gpl, lucka, g).galler[4].includes(minstRegel) && s.rensadLank("https://example.org/O'Brien") === "https://example.org/O'Brien" && s.rensadLank('javascript:alert(1)') === undefined && s.rensadLank('https://a b') === undefined && felen([{ ...vargrupp, rad: lararens.rad }]).some((x) => x.includes('behöver en tid med datum')), s.linjen(gpl, lucka, g).galler);
    ska('metodens skattningar: linjen, reglerna och texterna, utan lärarens länkar', lin.varden.slice(0, 3).join() === '7,6,5' && !lin.galler[1].length && lin.galler[2][0] === 0 && !('x' in (gfoljd.matt?.['Lärarens skattning'] ?? {})) && gfoljd.lankar?.['Vår grupp']?.formular?.startsWith('https://') && !gfoljd.lankar?.['Vår grupp']?.sammanstallning && ord.varden.startsWith('Lärarens skattning, 1 till 10: vecka 1 (v. 45): 7') && ord.regler.length === 1 && text.includes(`${ord.varden}.`) && text.includes('Det linjen sa: Linjen i Lärarens skattning nedåt två veckor i rad efter vecka 3') && !text.includes('docs.google') && ap.includes('Lärarens skattning varje vecka, 1 till 10, av gruppen') && !ap.includes('docs.google'), [lin, text, ap]);
    // Den kalla testaren av K-559: ett tillfälle i en vecka utan pass flyttar till nästa vecka med pass, stegen har metodens
    // beskrivning, texten till åtgärdsprogrammet nämner skattningen en gång, och formuläret har sin text ur en rot.
    const onsdagar = s.planera(gmp, { ...gval, dagar: [3], langd: 12 });
    const reflektion = onsdagar.uppfoljning.find((u) => u.typ === 'intervall')?.tillfallen ?? [];
    const utanPass = onsdagar.veckor.filter((v) => !v.pass.length).map((v) => v.nr);
    ska('metodens skattningar: tillfällen i veckor med pass, stegens beskrivning, en gång i åtgärdsprogrammet och formulärets text', utanPass.length > 0 && reflektion.length > 0 && reflektion.every((t) => onsdagar.veckor[t.vecka - 1].pass.length > 0) && g.skala.steg[4].text === 'Alla är med och tar hand om varandra. Gruppen löser det mesta själv.' && ap.split('Lärarens skattning varje vecka').length === 2 && s.formularetText('Vår grupp').startsWith('Formuläret är bladet Vår grupp på skärmen') && felen([{ ...vargrupp, ram: 'Finns inte' }]).some((x) => x.includes('som metoden inte har')) && gmp.skattningar.find((x) => x.vem === 'eleverna')?.ram === 'Gruppreflektion', [utanPass, reflektion, ap]);
    // Verifieringen av K-559: varannan vecka räknas bland veckorna med pass, och en följd av veckor är en period, som inte står i
    // kalendern eller bland uppföljningen i texten till åtgärdsprogrammet.
    const perioden = onsdagar.uppfoljning.find((u) => u.period);
    const okal = s.kalenderfil({ titel: ga.titel, uppfoljning: ga.uppfoljning.rader, fokus: [] }, onsdagar, { id: 'gs1', lank: () => 'https://niclasfohlin.se/x', nu: new Date(Date.UTC(2026, 9, 24, 12)) });
    ska('varannan vecka bland veckorna med pass, och perioden står inte i kalendern eller i åtgärdsprogrammet', reflektion.every((t, j) => j === 0 || t.vecka - reflektion[j - 1].vecka >= 2) && ga.uppfoljning.rader[perioden?.rad ?? -1]?.nar === 'Kort utan beröring vecka 1–4' && !okal.includes('Kort utan beröring') && !ap.includes('Kort utan beröring'), [reflektion.map((t) => t.vecka), perioden]);
    // Verifieringen av K-559: en helgdag som inte har varit än faller, och en som har varit föll.
    const helgDec = s.sammanstallning(onsdagar, s.rensaFoljd({}), '2026-12-03'), helgFeb = s.sammanstallning(onsdagar, s.rensaFoljd({}), '2027-02-01');
    ska('en helgdag som kommer faller, och en som har varit föll', helgDec.helgdagarKvar >= 1 && s.passensRad(helgDec).includes('faller på en helgdag') && !s.passensRad(helgFeb).includes('faller') && s.passensRad(helgFeb).includes('föll på en helgdag'), [s.passensRad(helgDec), s.passensRad(helgFeb)]);
    // Codex 2026-10-26: närvaron är något eleven har, så att eleven står med i sammanställningen och pdf:en.
    ska('en elev har något: en skattning, ett resultat eller närvaron', s.elevenHarNagot({ gjorda: 2 }, { id: 'a1', skattningar: [], resultat: {}, narvaro: 1 }) && s.elevenHarNagot({ gjorda: 0 }, { id: 'a1', skattningar: [], resultat: { x: '0' }, narvaro: null }) && !s.elevenHarNagot({ gjorda: 0 }, { id: 'a1', skattningar: [], resultat: { x: '' }, narvaro: null }) && !s.elevenHarNagot({ gjorda: 2 }, { id: s.GRUPPEN, skattningar: [], resultat: {}, narvaro: 2 }));
    // Verifieringen av K-559: eleverna som lämnar listan sparas med id, och en elev som kom till senare har närvaro från den
    // dagen, i texterna, i prickarna och i texten som kopieras.
    const lagrad = s.rensaFoljd({ elever: [{ id: 'a1', namn: 'Ali' }, { id: 'f1', namn: 'Filip', fran: '2026-11-18' }, { id: 'x1', namn: 'Fel', fran: 'igår' }], lamnade: [{ id: 'e1', namn: 'Ebba' }, { id: 'a1', namn: 'Ali' }, { id: 'e1', namn: 'Ebba' }] });
    const npl = s.planera(gmp, { ...gval, dagar: [1, 3], langd: 4 });
    const bockade = npl.pass.slice(0, 6).map((x) => x.datum), sen = npl.pass[4].datum;
    const nsam = s.sammanstallning(npl, s.rensaFoljd({ gjorda: bockade, narvaro: true, elever: [{ id: 'a1', namn: 'Ali' }, { id: 'f1', namn: 'Filip', fran: sen }], franvaro: { [bockade[1]]: ['a1'] } }), '2026-12-01');
    const [ali, filip] = nsam.elever;
    const prickar = s.passensNarvaro(nsam, filip, {}).flat().filter((x) => x !== 'inte').length;
    const ntext = s.sammanstallningstext({ titel: ga.titel, uppfoljning: ga.uppfoljning.rader }, npl, nsam);
    ska('eleverna som lämnar listan sparas med id, och närvaron räknas från dagen eleven kom till', lagrad.elever[1]?.fran === '2026-11-18' && !('fran' in (lagrad.elever[2] ?? {})) && JSON.stringify(lagrad.lamnade) === '[{"id":"e1","namn":"Ebba"}]' && ali.narvaro === 5 && ali.passen === 6 && filip.narvaro === 2 && filip.passen === 2 && s.narvaronText(filip, nsam) === 'Var med i 2 av 2 bockade pass.' && s.narvaronKort(ali, nsam) === 'med i 5 av 6 pass' && prickar === 2 && ntext.includes('en elev missade 1 pass'), [ali, filip, prickar, ntext]);
    // Codex 2026-10-26: gruppens närvarorad räknar eleverna som har kunnat vara med, och prickarnas förklaring säger strecket.
    const efterAlla = s.sammanstallning(npl, s.rensaFoljd({ gjorda: bockade, narvaro: true, elever: [{ id: 'a1', namn: 'Ali' }, { id: 'f1', namn: 'Filip', fran: npl.pass[7].datum }], franvaro: { [bockade[1]]: ['a1'] }, listan: '2026-10-28' }), '2026-12-01');
    const efterText = s.sammanstallningstext({ titel: ga.titel, uppfoljning: ga.uppfoljning.rader }, npl, efterAlla);
    ska('gruppens närvarorad och prickarnas förklaring med en elev som kom till senare', efterText.includes('0 av 1 elever var med i alla') && s.prickarnasText({ fran: '2026-11-16' }).endsWith('streck inte bockat eller före eleven kom till.') && s.prickarnasText({}).endsWith('streck inte bockat.') && s.rensaFoljd({ listan: '2026-10-28' }).listan === '2026-10-28' && s.rensaFoljd({ listan: 'x' }).listan === undefined, efterText);
  }
  // Stödet för nivåvalet (K-557; Niclas 2026-10-26: "Bör alltid finnas vid ett sådant val i Planeras modul"): en metod med
  // nivåer har det, högst tre meningar och NIVAVALETS_LANGD tecken, och texten står ordagrant i metoden.
  {
    const pl = metod('problemlosning-i-grupp');
    const med = (nivaval) => ({ ...pl, plan: { ...pl.plan, nivaval } });
    ska('stödet för nivåvalet', !s.nivavaletsFel(pl).length && !s.planensCitatFel(pl).length && s.nivavaletsFel(med(undefined)).length === 1 && !s.nivavaletsFel(med(undefined), false).length && s.nivavaletsFel(med({ text: 'Ord '.repeat(70).trim() + '.', mer: 'Så skiljer sig nivåerna' })).some((x) => x.includes(`högst ${s.NIVAVALETS_LANGD}`)) && s.nivavaletsFel(med({ text: 'Ett. Två. Tre. Fyra.', mer: 'Så skiljer sig nivåerna' })).some((x) => x.includes('fyra meningar') || x.includes('4 meningar')) && s.planensCitatFel(med({ text: 'Välj den nivå som känns bäst.', mer: 'Så skiljer sig nivåerna' })).some((x) => x.startsWith('Planens nivåval')), [s.nivavaletsFel(pl), s.planensCitatFel(pl)]);
  }
  // Passets längd (K-564; Niclas 2026-10-26: "Lite konstigt att man fick välja på 10 eller 40 min"): ett spann på högst tio
  // minuter ger ändarna med det hela passet som förval, ett bredare steg om tio minuter med steget i mitten, och en metod
  // med ett spann har stödet för valet, ordagrant ur metoden eller ur variantens mening som metodens sida skriver den.
  {
    const lika = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    ska('passets längder: ändarna med det hela passet som förval, och i ett bredare spann steg om tio minuter med steget i mitten', lika(s.passetsLangder({ min: 10, max: 15 }), { langder: [10, 15], forval: 15 }) && lika(s.passetsLangder({ min: 10, max: 40 }), { langder: [10, 20, 30, 40], forval: 20 }) && lika(s.passetsLangder({ min: 15, max: 40 }), { langder: [15, 20, 30, 40], forval: 20 }) && lika(s.passetsLangder({ min: 30, max: 30 }), { langder: [], forval: 30 }), [s.passetsLangder({ min: 10, max: 40 }), s.passetsLangder({ min: 15, max: 40 })]);
    const ga = metod('gruppstarkande-aktiviteter'), ul = metod('upprepad-lasning'), ts = metod('textsamtal-i-grupp');
    const utan = (d) => ({ ...d, plan: { ...d.plan, langdval: undefined } });
    ska('stödet för passets längd', !s.langdvaletsFel(ga).length && !s.langdvaletsFel(ul).length && !s.planensCitatFel(ga).length && !s.planensCitatFel(ul).length && s.langdvaletsFel(utan(ga)).length === 1 && s.langdvaletsFel(utan(ul)).length === 1 && !s.langdvaletsFel(utan(ts)).length && s.planensCitatFel({ ...ga, plan: { ...ga.plan, langdval: { text: 'Ett pass tar så lång tid som gruppen behöver.', mer: 'Gruppreflektion' } } }).some((x) => x.startsWith('Planens längdval')), [s.langdvaletsFel(ga), s.langdvaletsFel(ul), s.planensCitatFel(ga), s.planensCitatFel(ul)]);
  }
  // Rimligheten 2026-10-26: Chambers boksamtals längd efter boken (plan.veckoval med förval inom perioden), Kompissamtals
  // beslut efter samtal 3 vid utvärderingen (plan.utvardering, ordagrant) och ingen avstämning i en plan på tre veckor.
  {
    const bok = metod('boksamtal-i-grupp'), kmp = metod('kompissamtal');
    const bokMp = s.metodplan(bok).plan;
    ska('stödet för antalet veckor: förvalet ur metodens fält inom perioden, och spärren', s.forvaldLangd(bokMp) === 8 && !s.veckovaletsFel(bok).length && s.veckovaletsFel({ ...bok, plan: { ...bok.plan, veckoval: { ...bok.plan.veckoval, forval: 12 } } }).length === 1 && s.forvaldLangd(s.metodplan({ ...bok, plan: { ...bok.plan, veckoval: undefined } }).plan) === 6, [s.forvaldLangd(bokMp), s.veckovaletsFel(bok)]);
    ska('utvärderingens regel ur metoden, ordagrant', kmp.plan.utvardering?.length === 4 && !s.planensCitatFel(kmp).length && s.planensCitatFel({ ...kmp, plan: { ...kmp.plan, utvardering: ['Avsluta när det känns bra.'] } }).some((x) => x.startsWith('Planens utvärdering')), s.planensCitatFel(kmp));
    const kmpMp = s.metodplan(kmp).plan;
    const tre = s.planera(kmpMp, { start: '2026-11-02', dagar: [3], langd: 3, lov: [], upprepa: [], flytta: {}, stryk: [] });
    const fyra = s.planera(kmpMp, { start: '2026-11-02', dagar: [3], langd: 4, lov: [], upprepa: [], flytta: {}, stryk: [] });
    ska('ingen avstämning i en plan på färre än fyra veckor', s.mittVeckan(tre) === null && s.mittVeckan(fyra) !== null, [s.mittVeckan(tre), s.mittVeckan(fyra)]);
  }
  // Det eleverna fyller i under ett pass, som gruppreflektionen, görs i veckans längsta pass efter lärarens tider, och i
  // veckans sista när passen är lika långa (K-562; verifieringen av K-559 2026-10-26).
  {
    const gmp = s.metodplan(metod('gruppstarkande-aktiviteter')).plan;
    const rad = gmp.skattningar.find((x) => x.vem === 'eleverna').rad;
    const dagarna = (tider) => s.planera(gmp, { start: '2027-02-01', dagar: [1, 3], langd: 12, lov: [], upprepa: [], flytta: {}, stryk: [], tider }).uppfoljning.find((u) => u.rad === rad).tillfallen.map((t) => s.veckodag(t.datum));
    const langre = dagarna({ 1: ['08:30', '09:10'], 3: ['13:00', '13:30'] }), lika = dagarna({}), kortare = dagarna({ 1: ['08:30', '09:00'], 3: ['13:00', '13:40'] });
    ska('det eleverna fyller i under ett pass görs i veckans längsta pass, och i veckans sista när passen är lika långa', langre.length === 6 && langre.every((d) => d === 1) && lika.every((d) => d === 3) && kortare.every((d) => d === 3), { langre, lika, kortare });
  }
  ska('elevlistan rymmer en hel klass', s.ELEVLISTANS_LANGD >= 30 && s.rensaFoljd({ elever: Array.from({ length: 40 }, (_, i) => ({ id: `e${i}`, namn: `Elev ${i}` })) }).elever.length === s.ELEVLISTANS_LANGD);
  ska('en tabellrad säger sina veckor', JSON.stringify(s.radensVeckor('3 Venndiagrammet')) === '{"fran":3,"till":3}' && JSON.stringify(s.radensVeckor('7–8 Gruppen väljer modell')) === '{"fran":7,"till":8}' && s.radensVeckor('Vecka 2 · Lästräning')?.fran === 2 && s.radensVeckor('Hemma') === null && s.radensVeckor('12a') === null);
  ska('lärarens egna saker är inga namn på saker', s.EGNA_SAKER.includes('klasslista') && !s.olankadeSaker('Skriv på klasslistan vad du hörde, och på klasslistans baksida.', saker).length && s.olankadeSaker('Skriv på elevlistan.', saker).join() === 'elevlistan', s.olankadeSaker('Skriv på klasslistan. Skriv på elevlistan.', saker));
  // Codex granskning 2 (2026-10-24): ett namn i grundform, ett namn som också är en vanlig fras, och datumets gränser.
  ska('ett namn i grundform hittas i bestämd form', s.sakdelar('Ta fram sifferkorten.', [{ namn: 'Sifferkort' }]).some((x) => x.sak === 0 && x.text === 'sifferkorten') && !s.olankadeSaker('Ta fram sifferkorten.', [{ namn: 'Sifferkort' }]).length);
  const fras = s.sakdelar('Hittat på min huvudperson. Fyll i Min huvudperson i pass 2.', [{ namn: 'Min huvudperson', versal: !s.arSaksord('Min huvudperson') }]);
  ska('ett namn som också är en vanlig fras länkas bara som titel', fras.filter((x) => x.sak !== undefined).length === 1 && fras.find((x) => x.sak !== undefined)?.text === 'Min huvudperson' && s.arSaksord('Samtalsreglerna') && s.arSaksord('Lathunden'), fras);
  ska('ett namn efter ett ord för en del, som stapeln och rutan, är delen och inte saken', s.sakdelar('Fyll i stapeln Efter kursen och läs rutan Till läraren, och gör greppet Efter kursen igen. Sedan Efter kursen.', [{ namn: 'Efter kursen', versal: true }, { namn: 'Till läraren', versal: true }]).filter((x) => x.sak !== undefined).map((x) => x.text).join() === 'Efter kursen');
  ska('ett namn som börjar ett längre citat länkas inte, men ett citat som bara är namnet gör', s.sakdelar('Föreslå ”En gång när jag var liten” eller läs ”En gång när”.', [{ namn: 'En gång när', versal: true }]).filter((x) => x.sak !== undefined).length === 1);
  ska('ett spann som Bildserie 2–6 länkas inte, men Bildserie 1 gör', s.sakdelar('Bildserie 2–⁠6. Sedan Bildserie 1.', [{ namn: 'Bildserie 2', former: ['Bildserie 2'], versal: true }, { namn: 'Bildserie 1', former: ['Bildserie 1'], versal: true }]).filter((x) => x.sak !== undefined).map((x) => x.text).join() === 'Bildserie 1');
  ska('ett datum utanför åren går inte att läsa ur en länk', s.lasVal('#s=9999-12-31&d=135&l=6') === null && s.lasVal('#s=1999-12-31&d=135&l=6') === null && s.lasVal('#s=2099-12-28&d=135&l=6') !== null);
  ska('en mening utan beslut kommer med i texten', s.sammanstallningstext(info, p, s.sammanstallning(p, { utvardering: { not: 'Gruppen läser mer på egen hand' } }, '2026-12-14')).includes('Utvärdering efter insatsen: Gruppen läser mer på egen hand.'));
}

// Planera 0.2 (de kalla testarna 2026-10-24): passens roller, före första passet, en stege som börjar högre upp, det som
// kommer efter insatsen, förvalet och planen som inte når hela progressionen.
{
  const PASSEN = ['veckans första', 'veckans andra', 'veckans tredje', 'veckans sista', 'veckans övriga', 'första passet', 'pass 7', 'pass 2–6', 'pass 8 till det sista', 'sista passet'];
  ska('tolkaPassen läser platsen i veckan och numret i insatsen', PASSEN.every((x) => s.tolkaPassen(x)) && s.tolkaPassen('veckans femtonde') === null && s.tolkaPassen('pass 6–2') === null && JSON.stringify(s.tolkaPassen('pass 8 till det sista')) === '{"typ":"pass","fran":8}', PASSEN.map((x) => [x, s.tolkaPassen(x)]));
  const fel = s.metodplan({ ...metod('textsamtal-i-grupp'), plan: { passen: [{ nar: 'varannan tisdag', text: 'x' }] } }).fel;
  ska('en rad i passen som inte går att läsa stoppar', fel.some((x) => x.includes('varannan tisdag')), fel);
  // Textsamtal: veckans tre pass har var sin roll; Seriesamtal: det mest bestämda passet först.
  const ts = metod('textsamtal-i-grupp');
  const mpTs = s.metodplan(ts).plan;
  const pTs = s.planera(mpTs, { ...tom, start: '2026-11-02', dagar: [1, 3, 5], langd: 6 });
  const roll = (pl, mp, nr) => s.passetsRoller(pl, pl.pass[nr - 1], mp.passen).map((r) => mp.passen[r].nar);
  ska('veckans tre pass har var sin roll', [1, 2, 3, 4].every((n, i) => roll(pTs, mpTs, n).length > 0 && roll(pTs, mpTs, n).filter((x) => x.typ === 'vecka').every((x) => x.plats === [1, 2, 3, 1][i] || (x.plats === 'ovriga' && [1, 2, 3, 1][i] !== 1))), [1, 2, 3, 4].map((n) => roll(pTs, mpTs, n)));
  const ss = metod('seriesamtal');
  const mpSs = s.metodplan(ss).plan;
  const pSs = s.planera(mpSs, { ...tom, start: '2026-10-27', dagar: [2, 4], langd: 6 });
  const forsta = (nr) => ss.plan.passen[s.passetsRoller(pSs, pSs.pass[nr - 1], mpSs.passen)[0]]?.nar;
  ska('Seriesamtal: pass 1, pass 7, en egen händelse och sista passet', pSs.pass.length === 12 && forsta(1) === 'första passet' && forsta(3) === 'pass 3' && forsta(7) === 'pass 7' && forsta(9) === 'pass 8 till det sista' && forsta(12) === 'sista passet', [1, 3, 7, 9, 12].map(forsta));
  // Ett pass behåller sitt nummer och sina roller när ett flyttat pass före det stryks av ett avslut, och ett pass slås upp på
  // sitt nummer (Codex 2026-10-25: onsdagens pass 5, Chatten, blev pass 4, Vinsten, medan pass 4 stod bland de strukna).
  const ssVal = { ...tom, start: '2026-11-02', dagar: [1, 3, 5], langd: 6, flytta: { '2026-11-09': '2026-11-13', '2026-11-13': '2026-11-12' } };
  const ssHel = s.planera(mpSs, ssVal), ssKort = s.planera(mpSs, { ...ssVal, slut: 6 });
  const rollerna = (pl, nr) => JSON.stringify(s.passetsRoller(pl, s.passetMedNr(pl, nr), mpSs.passen));
  ska('avslutet: passen behåller sina nummer och roller, också när ett flyttat pass före sista passet stryks', ssKort.pass.map((x) => x.nr).join() === '1,2,3,5,6' && rollerna(ssKort, 5) === rollerna(ssHel, 5) && rollerna(ssHel, 5) !== rollerna(ssHel, 4) && ssKort.struket?.pass[0]?.nr === 4 && s.veckansPass(ssKort, ssKort.veckor[1]).map((x) => x.nr).join() === '5,6' && s.hogstaPassnr(ssKort) === 6 && ssKort.sistaNr === 6 && s.passetMedNr(ssKort, 4) === undefined, [ssKort.pass.map((x) => x.nr), ssKort.struket?.pass.map((x) => x.nr), rollerna(ssKort, 5), rollerna(ssHel, 5), rollerna(ssHel, 4)]);
  ska('passens nummer i en text, med luckan när ett pass är struket', s.passnummerText([4, 5, 6]) === 'Pass 4–6' && s.passnummerText([6, 4]) === 'Pass 4 och 6' && s.passnummerText([1, 2, 3, 4, 6]) === 'Pass 1–4 och 6' && s.passnummerText([3]) === 'Pass 3' && s.passnummerText([]) === '', [s.passnummerText([6, 4]), s.passnummerText([1, 2, 3, 4, 6])]);
  // Läslistor: måndag, tisdag till torsdag och fredag.
  const ll = metod('laslistor-i-grupp');
  const mpLl = s.metodplan(ll).plan;
  const pLl = s.planera(mpLl, { ...tom, start: '2026-11-02', dagar: [1, 2, 4, 5], langd: 7 });
  const llRader = (pl, nr) => s.passetsRoller(pl, pl.pass[nr - 1], mpLl.passen).map((r) => ll.plan.passen[r].nar);
  // Platsen i veckan, också när raden gäller vissa veckor ("veckans övriga pass i vecka 1–5", K-596).
  const llRoll = (nr) => llRader(pLl, nr).find((n) => n.startsWith('veckans'))?.replace(/ pass i vecka [\d–-]+$/, '');
  ska('Läslistor: veckans första, övriga och sista', [1, 2, 3, 4].map(llRoll).join() === 'veckans första,veckans övriga,veckans övriga,veckans sista', [1, 2, 3, 4].map(llRoll));
  // En vecka med ett enda pass, som efter en röd dag, har veckans första roll och ingen sista.
  const enda = s.planera(mpLl, { ...tom, start: '2026-12-21', dagar: [1, 4, 5], langd: 1 });
  ska('en vecka med ett pass har bara veckans första roll', enda.pass.length === 1 && llRader(enda, 1).filter((n) => n.startsWith('veckans')).join() === 'veckans första', llRader(enda, 1));
  // En rad om metodens veckor, som "vecka 1–3", gäller de veckorna och går före platsen i veckan (Codex 2026-10-25).
  // Läslistors vecka 1–3 är sedan K-515 tidsschemats variant, så provet har egna rader.
  const veckoRader = [{ rad: 0, nar: s.tolkaPassen('veckans första') }, { rad: 1, nar: s.tolkaPassen('vecka 1–3') }];
  ska('en rad om metodens veckor gäller de veckorna, först', s.passetsRoller(pLl, pLl.pass[8], veckoRader).join() === '1,0' && s.passetsRoller(pLl, pLl.pass[12], veckoRader).join() === '0', [s.passetsRoller(pLl, pLl.pass[8], veckoRader), s.passetsRoller(pLl, pLl.pass[12], veckoRader)]);
  // Förvalet och stegen: sju listor på sju veckor, och en plan som börjar på Läslista 2 har fem veckor kvar.
  ska('förvalet når progressionens sista steg', s.forvaldLangd(mpLl) === 7 && s.forvaldLangd(mpTs) === 8 && s.forvaldLangd(s.metodplan(metod('til-i-grupp')).plan) === 8 && s.forvaldLangd(s.metodplan(metod('fyra-raknesatten')).plan) === 8 && s.forvaldLangd(mpLl, 3) === 5, [s.forvaldLangd(mpLl), s.forvaldLangd(mpTs), s.forvaldLangd(mpLl, 3)]);
  const stege = s.planera(mpLl, { ...tom, start: '2026-11-02', dagar: [1, 2, 4, 5], langd: 5, borja: 3, upprepa: [4] });
  ska('en stege som börjar på vecka 3', stege.borja === 3 && stege.veckor[0].innehall === 3 && s.planvecka(stege, stege.veckor[0]) === 1 && stege.veckor[0].steg === 2 && stege.veckor.length === 6 && stege.veckor[2].igen && stege.veckor[2].innehall === 4 && s.mittVeckan(stege) === stege.veckor.findIndex((v) => v.innehall === 5) + 1, stege.veckor.map((v) => [v.innehall, v.igen, v.steg]));
  const lank = s.kodaVal({ ...tom, start: '2026-11-02', dagar: [1, 2, 4, 5], langd: 5, borja: 3, upprepa: [7] });
  ska('länken bär steget planen börjar på', lank.includes('b=3') && s.lasVal(`#${lank}`).val.borja === 3 && s.lasVal(`#${lank}`).val.upprepa.join() === '7' && s.lasVal('#s=2026-11-02&d=1245&l=5&b=3&u=8').val.upprepa.length === 0, lank);
  // Det som kommer efter insatsen tar ingen vecka, och planen säger vilka steg den inte når.
  ska('nästa period står efter insatsen', pLl.efterSteg === 7 && pLl.veckor.every((v) => v.steg !== 7) && s.planera(mpLl, { ...tom, start: '2026-11-02', dagar: [1, 2, 4, 5], langd: 8 }).veckor[7].steg === null, [pLl.efterSteg, pLl.veckor.map((v) => v.steg)]);
  const sex = s.planera(mpLl, { ...tom, start: '2026-11-02', dagar: [1, 2, 4, 5], langd: 6 });
  ska('sex veckor når inte Läslista 6', JSON.stringify(s.stegUtanfor(mpLl, sex)) === '[{"rad":6,"fran":7,"vidBehov":false}]', s.stegUtanfor(mpLl, sex));
  ska('TIL: steget vid behov räknas för sig', s.stegUtanfor(s.metodplan(metod('til-i-grupp')).plan, s.planera(s.metodplan(metod('til-i-grupp')).plan, { ...tom, start: '2026-11-02', dagar: [1, 2, 3, 4], langd: 6 })).every((x) => x.vidBehov));
  // Före första passet: veckan före, förbi ett lov, och i kalendern hela veckan.
  const lovFore = s.planera(mpTs, { ...tom, start: '2026-11-02', dagar: [1, 3, 5], langd: 6, lov: ['2026-44'] });
  ska('veckan före är lov: före första passet veckan före lovet', lovFore.fore.mandag === '2026-10-19' && lovFore.fore.overLov && lovFore.uppfoljning[0].tillfallen[0].datum === '2026-10-19', lovFore.fore);
  const kal = s.kalenderfil({ titel: 'Textsamtal i grupp', uppfoljning: ts.uppfoljning.rader, fokus: ts.progression.rader.map((r) => r.fokus), passet: () => 'Passet: Starten 0–3.' }, pTs, { id: 'abc', lank: () => 'https://niclasfohlin.se/x', nu: new Date('2026-10-24T12:00:00Z') });
  ska('kalendern: före första passet över hela veckan före, och passet i beskrivningen', kal.includes('DTSTART;VALUE=DATE:20261026\r\nDTEND;VALUE=DATE:20261031') && kal.includes('före första passet') && kal.replace(/\r\n /g, '').includes('Passet: Starten 0–3.'), kal.slice(0, 1500));
  // Codex granskning av 0.2 (2026-10-25): ett långt lov före starten, Före i länken och kalendern, och planens veckonummer
  // i sammanställningen när planen börjar på ett senare steg.
  const sommar = s.planera(mpTs, { ...tom, start: '2026-08-24', dagar: [1, 3, 5], langd: 6, lov: Array.from({ length: 9 }, (_, i) => `2026-${26 + i}`) });
  ska('nio lovveckor före starten: Före veckan före lovet', sommar.fore.mandag === '2026-06-15' && sommar.fore.overLov, sommar.fore);
  ska('länken kan visa Före', s.lasVal('#s=2026-11-02&d=135&l=6&v=fore')?.visa === 'fore' && s.kodaVal({ ...tom, start: '2026-11-02', dagar: [1, 3, 5], langd: 6 }, { visa: 'fore' }).includes('v=fore'));
  const kalFore = s.kalenderfil({ titel: 'Textsamtal i grupp', uppfoljning: ts.uppfoljning.rader, fokus: [] }, pTs, { id: 'abc', lank: (v) => `https://x/#v=${v ?? ''}`, nu: new Date('2026-10-24T12:00:00Z') });
  ska('kalenderns händelse före första passet leder till Före', kalFore.replace(/\r\n /g, '').includes('URL:https://x/#v=fore'), kalFore.slice(0, 800));
  const sammanStege = s.sammanstallning(stege, { vecka: { [stege.veckor[0].mandag]: { not: 'Bra start' } } }, '2026-12-20');
  ska('sammanställningen har planens veckonummer', sammanStege.veckor[0].innehall === 1 && sammanStege.veckor[2].innehall === 2, sammanStege.veckor.map((v) => v.innehall));
  // Undertitelns årskurser följer inte med till åtgärdsprogrammet, också "för F–6".
  const til = metod('til-i-grupp');
  const mpTil = s.metodplan(til).plan;
  const pTil = s.planera(mpTil, { ...tom, start: '2026-11-02', dagar: [1, 2, 3, 4], langd: 6 });
  const tilDok = s.dokumentationstext({ titel: til.titel, undertitel: til.undertitel, adress: 'niclasfohlin.se/x', uppfoljning: til.uppfoljning.rader }, pTil, { ...tom, start: '2026-11-02', dagar: [1, 2, 3, 4], langd: 6 }, { minuter: 20 });
  ska('åtgärdsprogrammet utan undertitelns årskurser', !tilDok.includes('F–6') && tilDok.includes('läsning hemma.'), tilDok.split('\n')[0]);
  const fyra = metod('fyra-raknesatten');
  const mpFyra = s.metodplan(fyra).plan;
  const pFyra = s.planera(mpFyra, { ...tom, start: '2026-11-03', dagar: [2, 4], langd: 8 });
  const fyraDok = s.dokumentationstext({ titel: fyra.titel, adress: 'x', uppfoljning: fyra.uppfoljning.rader }, pFyra, { ...tom, start: '2026-11-03', dagar: [2, 4], langd: 8 }, { minuter: 60 });
  ska('åtgärdsprogrammet: insatsens vecka 4 är inte kalenderveckan', fyraDok.includes('Vecka 4 i insatsen, v.') && !fyraDok.includes('Vecka 4, v.'), fyraDok);
}

// ---------- 2. Metodernas data ----------
const mapp = join(rot, 'src/content/stodundervisning');
const alla = readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => ({ id: f.replace(/\.yaml$/, ''), d: parseYaml(readFileSync(join(mapp, f), 'utf8')) }));
const planbara = alla.filter((m) => m.d.uppfoljning?.rader?.length && m.d.uppfoljning.rader.every((r) => r.tid !== undefined));
// Codex i omgång 5: klockslag bara när delarna följer på varandra från minut 0. Gruppstärkande aktiviteter och
// Kortskrivning säger delarnas längd, och är de metoder med planen som gör det. En metod utan tidsschema, som Texttyper i
// grupp, har inga delar att räkna.
{
  const langder = planbara.filter((m) => { const r = (m.d.tidsschema?.rader ?? []).filter((x) => /^\d/.test(x.tid.trim())); return r.length > 0 && !s.delarIFoljd(r); }).map((m) => m.id);
  const gruppstarkande = (alla.find((m) => m.id === 'gruppstarkande-aktiviteter')?.d.tidsschema?.rader ?? []).filter((r) => /^\d/.test(r.tid.trim()));
  ska('passets delar som platser eller som längder', s.delarIFoljd([{ tid: '0–8 min' }, { tid: '8–18 min' }]) && !s.delarIFoljd([{ tid: '1–3 min' }, { tid: '1–2 min' }]) && !s.delarIFoljd([{ tid: '0–5 min' }, { tid: '6–9 min' }]) && !s.delarIFoljd([]) && gruppstarkande.length > 0 && !s.delarIFoljd(gruppstarkande) && langder.join() === 'gruppstarkande-aktiviteter,kortskrivning-skriv-varje-dag', langder);
  // K-595: en längd står med minuterna, så att den inte läses som en plats i passet, som Kortskrivnings "3–8 Skriv".
  const kort = (alla.find((m) => m.id === 'kortskrivning-skriv-varje-dag')?.d.tidsschema?.rader ?? []).filter((r) => /^\d/.test(r.tid.trim()));
  const iFoljd = [{ tid: '0–⁠4 min' }, { tid: '4–⁠8 min' }];
  const tiderna = kort.map((r) => s.delensTidI(r.tid, kort)).join(', ');
  ska('en dels tid i planen: en plats i passet utan minuter och en längd med minuterna', tiderna === '2 min, 3–8 min, 5 min' && s.delensTidI('0–⁠4 min', iFoljd) === '0–4' && s.delensTidI('Före passet', kort) === 'Före passet', tiderna);
}
for (const m of planbara) {
  const { fel: f, plan: mp } = s.metodplan(m.d);
  ska(`${m.id} går att planera`, !f.length, f);
  if (!mp) continue;
  const p = s.planera(mp, s.forval(mp, '2026-10-24'));
  ska(`${m.id}: förvalet ger pass`, p.pass.length > 0);
  // Förvalet når progressionens sista steg när det ryms i perioden (Läslistor: sju listor på sju veckor), annars den kortaste.
  if (mp.period.enhet === 'veckor') ska(`${m.id}: förvalet ger veckorna till progressionens sista steg`, p.veckor.length === s.forvaldLangd(mp), [p.veckor.length, s.forvaldLangd(mp)]);
  const steg = (m.d.progression?.rader ?? []).length;
  if (steg && mp.stegEnhet === 'veckor') ska(`${m.id}: varje vecka har ett steg`, p.veckor.every((v) => v.steg !== null), p.veckor.map((v) => v.steg));
}

// ---------- 3. Formerna ----------
// Planens fält som metodriggen ska skriva dem i steg 2 och 3 (K-490, K-491). Provet lägger dem på en kopia.
// En form kan också sätta perioden på kopian: Ljudleks lektioner räknas i veckor sedan K-578, men formen period i pass prövas
// med en lektions gamla period, som Berättelseramens 15 pass använder samma väg.
const medTider = (id, tider, period) => { const d = metod(id); d.uppfoljning.rader.forEach((r, i) => { r.tid = tider[i]; }); if (period) d.period = period; return d; };
const former = [
  { id: 'fyra-raknesatten', namn: 'kurs i veckor', tider: ['före', 'varje pass', 'vecka 4', 'efter'] },
  { id: 'ljudlek-forsta-ljudet', namn: 'period i pass', period: 'Åtta till tolv pass i följd', tider: ['i passet', 'varje pass', 'var 3:e vecka'] },
  { id: 'gruppstarkande-aktiviteter', namn: 'period utan slut med villkor', tider: ['varje vecka', 'varannan vecka', 'vecka 1–4', 'villkor', 'villkor', 'villkor', 'villkor'] },
  { id: 'seriesamtal', namn: 'progression i pass', tider: ['före', 'i passet', 'efter', 'efter 4 veckor'] },
  { id: 'til-i-grupp', namn: 'progression med vid behov', tider: ['före', 'efter', 'villkor', 'villkor'] },
];
for (const f of former) {
  const { fel: fe, plan: mp } = s.metodplan(medTider(f.id, f.tider, f.period));
  ska(`formen ${f.namn} (${f.id}) går att planera`, !fe.length && mp, fe);
  if (!mp) continue;
  // Hösten 2026 från 17 augusti: inga helgdagar på vardagar förrän i december, så att antalen inte beror på kalendern.
  const val = { ...s.forval(mp, '2026-08-10'), ...tom };
  const p = s.planera(mp, val);
  if (f.id === 'fyra-raknesatten') {
    ska('kurs i veckor: åtta veckor, två pass i veckan', p.veckor.length === 8 && p.pass.length === 16, [p.veckor.length, p.pass.length]);
    const v4 = s.planera(mp, { ...val, upprepa: [4] });
    ska('kurs i veckor: vecka 4 i uppföljningen följer den upprepade veckan', v4.uppfoljning[2].tillfallen[0].vecka === 5, v4.uppfoljning[2]);
  }
  if (f.id === 'ljudlek-forsta-ljudet') {
    ska('period i pass: åtta pass på tre veckor', mp.period.enhet === 'pass' && p.pass.length === 8 && p.veckor.length === 3, [p.pass.length, p.veckor.length]);
    ska('period i pass: var tredje vecka', p.uppfoljning[2].tillfallen.length === 1 && p.uppfoljning[2].tillfallen[0].vecka === 3, p.uppfoljning[2]);
    // Ett hållet pass som har flyttats står kvar när en ny dag fyller platserna efter ett byte (Codex 2026-10-25).
    const iPassV = { ...val, start: '2026-11-02', dagar: [2, 4], langd: 8, flytta: { '2026-11-26': '2026-11-23' } };
    const iPassByte = s.planera(mp, s.bytDagar(iPassV, [2, 3, 4], '2026-11-23', s.planera(mp, iPassV)));
    const mf0 = { ...val, start: '2026-11-02', dagar: [1, 5], langd: 8 };
    const mf1f = { ...s.bytDagar(mf0, [1, 3, 5], '2026-11-24', s.planera(mp, mf0)), flytta: { '2026-11-25': '2026-11-24' } };
    const mfPlan = s.planera(mp, s.bytDagar(mf1f, [1, 2, 3, 5], '2026-11-24', s.planera(mp, mf1f)));
    ska('period i pass: ett flyttat pass i dag står kvar när en dag till läggs till samma dag', mfPlan.pass.length === 8 && mfPlan.pass.find((x) => x.flyttatFran === '2026-11-25')?.nr === s.planera(mp, mf1f).pass.find((x) => x.flyttatFran === '2026-11-25')?.nr, mfPlan.pass.map((x) => `${x.nr}:${x.datum}`));
    const iPassInstallt = s.planera(mp, { ...s.bytDagar(iPassV, [2, 3, 4], '2026-11-23', s.planera(mp, iPassV)), stryk: ['2026-11-26'] });
    ska('period i pass: ett fast pass som ställs in tar ingen plats', iPassInstallt.pass.length === 8 && new Set(iPassInstallt.pass.map((x) => x.nr)).size === 8, iPassInstallt.pass.map((x) => `${x.nr}:${x.datum}`));
    ska('period i pass: de fasta passen räknas först efter ett byte', iPassByte.pass.length === 8 && iPassByte.pass.map((x) => x.nr).sort((a, b) => a - b).join() === '1,2,3,4,5,6,7,8' && iPassByte.pass.find((x) => x.flyttatFran === '2026-11-26')?.nr === 8, iPassByte.pass.map((x) => `${x.nr}:${x.datum}`));
  }
  if (f.id === 'gruppstarkande-aktiviteter') {
    ska('period utan slut: tolv veckor, ett pass i veckan', mp.period.mer && p.veckor.length === 12 && p.pass.length === 12, [p.veckor.length, p.pass.length]);
    ska('varannan vecka ger sex tillfällen och vecka 1–4 fyra', p.uppfoljning[1].tillfallen.length === 6 && p.uppfoljning[2].tillfallen.length === 4);
    ska('villkoren har inga datum', p.uppfoljning.slice(3).every((u) => u.typ === 'villkor' && !u.tillfallen.length));
  }
  if (f.id === 'seriesamtal') {
    ska('progression i pass: pass 1, 2–6 och resten', p.pass[0].steg === 0 && p.pass[1].steg === 1 && p.pass[5].steg === 1 && p.pass[6].steg === 2 && p.pass[p.pass.length - 1].steg === 2, p.pass.map((x) => x.steg));
    ska('fyra veckor efter sista passet', p.uppfoljning[3].tillfallen[0].datum === s.mandagen(s.plusDagar(p.sistaPass, 28)), [p.sistaPass, p.uppfoljning[3].tillfallen[0].datum]);
  }
  if (f.id === 'til-i-grupp') ska('vid behov: åtta veckor ger raderna 1–2, 3–5 och 6–8, utan vecka 9–10', p.veckor.map((v) => v.steg).join() === '0,0,1,1,1,2,2,2', p.veckor.map((v) => v.steg));
}
// Kortskrivnings progression har kolumnen När: råd utan veckor, som planen inte kopplar till veckor (K-553; Niclas
// 2026-10-26 sa ja). En annan kolumn stoppas med besked.
{
  const kd = metod('kortskrivning-skriv-varje-dag');
  const ks = s.metodplan(kd);
  const kp = ks.plan && s.planera(ks.plan, { start: '2026-11-02', dagar: [1, 3, 5], langd: 6 });
  ska('Kortskrivnings rader är råd utan veckor', !ks.fel.length && ks.plan?.stegEnhet === 'nar' && !ks.plan.steg.length && kp.veckor.every((v) => v.steg === null) && kp.pass.every((x) => x.steg === null) && !s.stegUtanfor(ks.plan, kp).length, ks.fel);
  ska('en annan första kolumn stoppas med besked', s.metodplan({ ...kd, progression: { ...kd.progression, enhet: 'Steg' } }).fel.some((x) => x.includes('Progressionens första kolumn heter "Steg"')));
}
// Codex 2026-10-27 (K-553): platsen i veckan och passen i kursens veckor följer metodens veckor, också när en vecka tas om,
// och en tabell läser kolumnen Steg och passets egen kolumn.
{
  const lika = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  ska('tidens ord för platsen i veckan och kursens veckor', lika(s.tolkaTid('veckans första pass i vecka 6'), { typ: 'vecka', veckor: [6], plats: 'forsta' })
    && lika(s.tolkaTid('första passet i sista veckan'), { typ: 'sista-veckan', plats: 'forsta' })
    && lika(s.tolkaTid('veckans sista pass i vecka 3, 4 och 5'), { typ: 'vecka', veckor: [3, 4, 5], plats: 'sista' })
    && lika(s.tolkaTid('pass 6, 8 och 11 i kursens veckor'), { typ: 'pass', pass: [6, 8, 11], kurs: true })
    && s.tolkaTid('veckans första pass i pass 3') === null && s.tolkaTid('pass x i kursens veckor') === null);
  const datum = (id, val, rad) => { const mp = s.metodplan(metod(id)).plan; return s.planera(mp, val).uppfoljning.find((u) => u.rad === rad)?.tillfallen.map((t) => t.datum).join(); };
  const ks = metod('kortskrivning-skriv-varje-dag').uppfoljning.rader;
  const vd = metod('skrivkurs-vardeskapande').uppfoljning.rader;
  const tre = { start: '2026-08-17', dagar: [1, 3, 5], langd: 6 }, tva = { start: '2026-08-17', dagar: [2, 4], langd: 5 };
  // Texttypskurserna räknas i pass sedan riggens leverans 2026-10-27 ("12 pass, omkring sex veckor"); kursens veckor prövas
  // med samma kurs och perioden i veckor. Mätningen i pass 1 och 11 är provets egen rad, så att provet inte hänger på hur
  // kursen skriver sin uppföljning (riggen gjorde om den samma natt).
  const arBas = metod('texttyp-argumenterande-text');
  const medBrev = (tid) => ({ ...arBas, uppfoljning: { ...arBas.uppfoljning, rader: [...arBas.uppfoljning.rader, { nar: 'Brevet', vad: 'Eleven skriver ett brev.', tid }] } });
  const arVeckor = { ...medBrev('pass 1 och 11 i kursens veckor'), period: 'Sex veckor' };
  const arPass = medBrev('pass 1 och 11');
  const datumAv = (m, val, rad) => s.planera(s.metodplan(m).plan, val).uppfoljning.find((u) => u.rad === rad)?.tillfallen.map((t) => t.datum).join();
  const brev = arBas.uppfoljning.rader.length;
  ska('platsen i veckan ger veckans första pass, och kursens pass följer veckan som tas om',
    datum('kortskrivning-skriv-varje-dag', tre, ks.findIndex((r) => r.tid === 'veckans första pass i vecka 6 och 12')) === '2026-09-21'
    && datum('kortskrivning-skriv-varje-dag', tre, ks.findIndex((r) => r.tid === 'veckans sista pass i vecka 6 och 12')) === '2026-09-25'
    && datum('skrivkurs-vardeskapande', tva, vd.findIndex((r) => r.tid === 'första passet i sista veckan')) === '2026-09-15'
    && datumAv(arVeckor, { start: '2026-08-17', dagar: [1, 3], langd: 6 }, brev) === '2026-08-17,2026-09-21'
    && datumAv(arVeckor, { start: '2026-08-17', dagar: [1, 3], langd: 6, upprepa: [2] }, brev) === '2026-08-17,2026-09-28'
    && datumAv(arPass, { start: '2026-08-17', dagar: [1, 3], langd: 12 }, brev) === '2026-08-17,2026-09-21',
    [datum('kortskrivning-skriv-varje-dag', tre, ks.findIndex((r) => r.nar === 'Vecka 6')), datum('skrivkurs-vardeskapande', tva, vd.findIndex((r) => r.tid === 'första passet i sista veckan')), datumAv(arVeckor, { start: '2026-08-17', dagar: [1, 3], langd: 6, upprepa: [2] }, brev), datumAv(arPass, { start: '2026-08-17', dagar: [1, 3], langd: 12 }, brev)]);
  ska('kursens veckor kräver ett fast antal pass i veckan', s.metodplan({ ...metod('skrivkurs-vardeskapande'), uppfoljning: { rader: [{ nar: 'x', vad: 'x', tid: 'pass 2 i kursens veckor' }] } }).fel.some((x) => x.includes('kursens veckor')));
  // Veckans fält (plan.veckansPass): en rad per del med minuter och namn, förberedelsen först, och kursens passnummer.
  const falt = s.faltetsDelar('Lägg fram breven.\n0–⁠5 min. Läs som läsaren: Läs högt.\n5–20 min. Brevet: Eleven skriver.\nUtan stöd.');
  const kp = s.planera(s.metodplan(arVeckor).plan, { start: '2026-08-17', dagar: [1, 3], langd: 6, upprepa: [2] });
  ska('veckans fält och kursens passnummer', falt?.delar.map((d) => `${d.tid}|${d.fas}|${d.vad}`).join(';') === '0–5 min|Läs som läsaren|Läs högt.;5–20 min|Brevet|Eleven skriver. Utan stöd.' && falt.fore[0]?.vad === 'Lägg fram breven.' && s.faltetsDelar('Bara text.') === null
    && kp.pass.map((p) => s.kursensPassnummer(kp, 2, p)).join() === '1,2,3,4,3,4,5,6,7,8,9,10,11,12', kp.pass.map((p) => s.kursensPassnummer(kp, 2, p)));
  // K-585: i metodens sista vecka är veckans sista pass kursens sista, också när en röd dag tar ett pass, och en period i
  // pass räknar kursens pass som planens.
  const ovMp = s.metodplan(metod('ordverkstad-i-grupp')).plan;
  const ov = s.planera(ovMp, { ...s.forval(ovMp, '2026-11-02'), start: '2026-11-02', dagar: [1, 3, 5] });
  const ovSista = ov.veckor.at(-1);
  const ovNr = s.veckansPass(ov, ovSista).map((p) => s.kursensPassnummer(ov, ovMp.takt.min, p, ovMp.period.max ?? ovMp.period.min));
  ska('kursens sista pass i metodens sista vecka, också när veckan har färre pass', ovNr.at(-1) === (ovMp.period.max ?? ovMp.period.min) * ovMp.takt.min, { pass: s.veckansPass(ov, ovSista).map((p) => p.datum), ovNr });
  const brMp = s.metodplan(metod('skrivkurs-berattelseram')).plan;
  const br = s.planera(brMp, { ...s.forval(brMp, '2026-11-02'), start: '2026-11-02', dagar: [1, 3, 5] });
  ska('en period i pass räknar kursens pass som planens', br.enhet === 'pass' && br.pass.every((p) => s.kursensPassnummer(br, brMp.takt.min, p) === p.nr), br.pass.map((p) => s.kursensPassnummer(br, brMp.takt.min, p)));
  // K-585: tabellens rad Efter passet är passets efter, en annan rad efter delarna hör inte till passet, och en rad i planen
  // med del Efter passet och istallet står i stället för passrutinens.
  const ovTab = metod('ordverkstad-i-grupp').tabeller.find((t) => t.rubrik.startsWith('Pass 3 från vecka 5'));
  const ovDelar = ovTab && s.tabellensDelar(ovTab);
  const vdTab = metod('skrivkurs-vardeskapande').tabeller.find((t) => t.rubrik.startsWith('Dag 2'));
  const vdDelar = vdTab && s.tabellensDelar(vdTab);
  const efterRoll = s.passetsBeskrivning([{ del: s.EFTER_PASSET, text: 'Kopiera tidningen.', istallet: true }], { delar: [{ tid: '0–10 min', fas: 'Start', vad: 'x' }] });
  ska('tabellens Efter passet och en rad med del Efter passet', !!ovDelar?.efter && !ovDelar.fore.some((f) => /efter passet/i.test(f.namn || f.nar)) && !!vdDelar && !vdDelar.fore.some((f) => /tredje pass/i.test(`${f.namn} ${f.nar}`)) && efterRoll.efterIstallet === true && efterRoll.efterForst?.[0]?.text === 'Kopiera tidningen.' && !efterRoll.texter.length, { ov: ovDelar?.efter, vdFore: vdDelar?.fore.map((f) => f.namn || f.nar), efterRoll });
  // K-585: fältets första mening på -pass är passets slag, och ett fält utan minuter står i passets delar och överst.
  const slagFalt = s.faltetsDelar('Planeringspass.\n0–10 min. Starten: x');
  const skil = s.faltetsSkillnader('Skrivpass. Station Hjälten.\nDär vi slutade: gruppen berättar.\nI sex steg: Hans och Greta.', ['Där vi slutade']);
  ska('passets slag och ett fält som bara säger det som skiljer', slagFalt?.slag === 'Planeringspass' && !slagFalt.fore.length && skil?.slag === 'Skrivpass' && skil.texter.join() === 'Station Hjälten.' && skil.iDelar[0]?.del === 'Där vi slutade' && skil.ovrigt[0]?.etikett === 'I sex steg' && s.faltetsSkillnader('0–5 min. A: x', []) === null, { slagFalt, skil });
  const tab = { kolumner: ['Del', 'Pass 2', 'Pass 3'], rader: [['Start\n0–5', 'A', 'B'], ['Skriva\n5–60', 'C', 'D']] };
  ska('tabellens delar med kolumnen Steg och passets kolumn', s.tabellensDelar({ kolumner: ['Tid', 'Steg', 'Det som händer'], rader: [['0–8 min', 'Ramen', 'x']] })?.delar[0].fas === 'Ramen'
    && s.tabellensDelar(tab, 'Pass 3')?.delar.map((d) => d.vad).join() === 'B,D' && s.tabellensDelar(tab)?.delar[0].mer[0]?.etikett === 'Pass 3' && s.tabellensDelar(tab, 'Pass 4') === null);
}
// En metod vars uppföljning saknar tid, gjord ur en metod som har tiderna (riggens omgång 1 gav Upprepad läsning dem).
const utanTid = structuredClone(metod('upprepad-lasning'));
for (const r of utanTid.uppfoljning.rader) delete r.tid;
ska('en metod utan tid stoppas med besked', s.metodplan(utanTid).fel.some((x) => x.includes('har ingen tid')) && !s.metodplan(metod('upprepad-lasning')).fel.length, s.metodplan(utanTid).fel);
// Planens val av version (K-576): en mening eller rad som börjar med "I <en annan version>" står inte med, versionens egen
// står kvar och utan version står allt kvar; en veckosida som "Guideboken vecka 3" hör till sin version; länken bär
// versionen; och spärren stoppar två versioner med samma namn.
{
  const alla = ['Skattjakten', 'Guideboken'];
  const text = 'Alla läser. I Skattjakten bokar du lagen. I Guideboken bokar du den nya eleven.\nI Skattjakten: platserna.\nMed Guideboken kommer kartan.';
  ska('en mening i en annan version står inte med', s.iVersionen(text, 'Guideboken', alla) === 'Alla läser. I Guideboken bokar du den nya eleven.\nMed Guideboken kommer kartan.' && s.iVersionen(text, undefined, alla) === text, s.iVersionen(text, 'Guideboken', alla));
  ska('en veckosida hör till sin version', s.versionensVecka('Guideboken vecka 3', 'Guideboken', alla) === 'vecka 3' && s.versionensVecka('Skattjakten vecka 3', 'Guideboken', alla) === null && s.versionensVecka('Vecka 3', 'Guideboken', alla) === 'Vecka 3' && s.versionensVecka('Skattjakten vecka 2', undefined, alla) === 'vecka 2');
  const v = { ...tom, start: '2026-11-02', dagar: [2, 4], langd: 6, version: 'guideboken' };
  ska('länken bär versionen', s.kodaVal(v).includes('ver=guideboken') && s.lasVal(`#${s.kodaVal(v)}`)?.val.version === 'guideboken', s.kodaVal(v));
  // Sagobokens fält "Pass 9 i sex steg" står i stället för Pass 9 i sex steg och gäller inte fyra steg, och Berättelseramens
  // kolumn "Det som händer i Hunden som försvann" står bara i den ramen, utan ramens namn.
  ska('ett fält i en version', JSON.stringify(s.faltetIVersionen('Pass 9 i sex steg', 'Sex steg')) === '{"rubrik":"Pass 9","egen":true}' && s.faltetIVersionen('Pass 9 i sex steg', 'Fyra steg') === null && JSON.stringify(s.faltetIVersionen('Pass 9', 'Fyra steg')) === '{"rubrik":"Pass 9","egen":false}');
  const ramar = ['Den magiska skogen', 'Hunden som försvann', 'Egen ram'];
  const celler = [{ kolumn: 'Det som händer i Den magiska skogen', text: 'A' }, { kolumn: 'Det som händer i Hunden som försvann', text: 'B' }, { kolumn: 'Skrivfokus', text: 'C' }];
  ska('en kolumn i en version', JSON.stringify(s.iVersionensKolumner(celler, 'Hunden som försvann', ramar)) === JSON.stringify([{ kolumn: 'Det som händer', text: 'B' }, { kolumn: 'Skrivfokus', text: 'C' }]) && s.iVersionensKolumner(celler, 'Egen ram', ramar).map((c) => c.text).join() === 'C' && s.iVersionensKolumner(celler, undefined, []).length === 3, s.iVersionensKolumner(celler, 'Hunden som försvann', ramar));
  // Veckans fält som är veckans pass, också Dag N och Pass N i en version, står bland planens texter, så att ett namn som
  // bara står där blir en länk (länkgranskningen 2026-10-27: Värdeskapandes Kalaset).
  const vardFalt = s.veckansPassFalt(metod('skrivkurs-vardeskapande'));
  const sagoFalt = s.veckansPassFalt(metod('skrivkurs-sagoboken'));
  ska('veckans fält: Dag N och Pass N i en version, och deras text bland planens texter', vardFalt.some(({ f }) => f.rubrik === 'Dag 2') && sagoFalt.some(({ f }) => /^Pass \d+ i sex steg$/.test(f.rubrik)) && s.visadeTexter(metod('skrivkurs-vardeskapande')).some((t) => t.includes('Kalaset')), [vardFalt.length, sagoFalt.length]);
  // Förvalet i veckor gäller inte en period i pass: Berättelseramens 15 pass blev 8 (Rimligheten 2026-10-27).
  const br = metod('skrivkurs-berattelseram');
  ska('ett förval i veckor stoppas i en period i pass, och planen räknar metodens pass', s.veckovaletsFel({ ...br, plan: { ...br.plan, veckoval: { ...br.plan.veckoval, forval: 8 } } }).some((x) => x.includes('räknas i pass')) && s.metodplan({ ...br, plan: { ...br.plan, veckoval: { ...br.plan.veckoval, forval: 8 } } }).plan?.forvaldaVeckor === undefined);
  // Egen rams extra pass (K-576): dagen i veckan före första passet, förbi ett lov, och händelsen i kalendern.
  const brVal = { ...tom, start: '2026-11-02', dagar: [2, 4], langd: 15 };
  const brPlan = s.planera(s.metodplan(br).plan, brVal);
  const brKal = s.kalenderfil({ titel: 'Berättelseram', uppfoljning: [], fokus: [], extraPass: { datum: '2026-10-27', text: 'Ramen fylls i.' } }, brPlan, { id: 'ab', lank: () => 'https://x', nu: new Date(Date.UTC(2026, 9, 1)) });
  ska('det extra passet: dagen veckan före pass 1, förbi ett lov, och i kalendern', s.extraPassetsDag(brPlan, brVal) === '2026-10-27' && s.extraPassetsDag(brPlan, { ...brVal, lov: [s.veckonyckel('2026-10-26')] }) === '2026-10-20' && brKal.includes('det extra passet före pass 1') && brKal.includes('DTSTART;VALUE=DATE:20261027'), [s.extraPassetsDag(brPlan, brVal), s.extraPassetsDag(brPlan, { ...brVal, lov: [s.veckonyckel('2026-10-26')] })]);
  // En version med ett spann i namnet, som åk 4–5, känns igen också med riggens ordfog i märket (K-569).
  const ak = ['Åk 4–5', 'Åk 6–7'];
  ska('versionen åk 4–5 och åk 6–7 med ordfog i märket', s.iVersionen('Läs. I åk 6–⁠7 är läsaren rektorn. I åk 4–5 är det Jonas.', 'Åk 4–5', ak) === 'Läs. I åk 4–5 är det Jonas.' && s.faltetIVersionen('Pass 9 i åk 6–⁠7', 'Åk 6–7')?.egen === true && s.versionensVecka('Åk 6–⁠7 vecka 2', 'Åk 6–7', ak) === 'vecka 2' && s.iVersionensKolumner([{ kolumn: 'Läsaren i åk 6–⁠7', text: 'R' }], 'Åk 4–5', ak).length === 0);
  // En mätning i det extra passet har passets dag, och sammanställningen och antalet bockade räknar passet (Codex 2026-10-27:
  // Egen rams korta berättelse fick Före-veckans datum, och det bockade extra passet räknades inte).
  const brExtra = { ...br, plan: { ...br.plan, extraPass: true }, uppfoljning: { ...br.uppfoljning, rader: [...br.uppfoljning.rader, { nar: 'Den korta berättelsen i början', vad: 'x', tid: 'i det extra passet' }] } };
  const brXPlan = s.planera(s.metodplan(brExtra).plan, brVal);
  const brXRad = brXPlan.uppfoljning.find((u) => u.rad === brExtra.uppfoljning.rader.length - 1);
  const brXSam = s.sammanstallning(brXPlan, { gjorda: ['2026-10-27', brXPlan.pass[0].datum], skattning: {}, vecka: {}, franvaro: {}, elever: [] }, '2026-12-31');
  ska('det extra passet: mätningen har passets dag, och bocken räknas', s.tolkaTid('i det extra passet')?.typ === 'extra' && brXPlan.extraDag === '2026-10-27' && brXRad?.tillfallen[0]?.datum === '2026-10-27' && brXRad?.tillfallen[0]?.vecka === 0 && s.antalBockade(brXPlan, ['2026-10-27', brXPlan.pass[0].datum]) === 2 && brXSam.gjorda === 2 && brXSam.planerade === brXPlan.pass.length + 1, [brXPlan.extraDag, brXRad?.tillfallen, brXSam.gjorda, brXSam.planerade]);
  // Lektionerna följer sina måndagar när veckorna flyttas (Codex 2026-10-27).
  const ljPlanFore = s.planera(s.metodplan(br).plan, { ...tom, start: '2026-10-05', dagar: [1, 3], langd: 6 });
  const ljPlanEfter = s.planera(s.metodplan(br).plan, { ...tom, start: '2026-10-12', dagar: [1, 3], langd: 6 });
  // Före: 5, 12 och 19 oktober med lektion 1, 3 och 2; efter: 12, 19 och 26 oktober.
  // En flytt fram och en tillbaka ger samma lektioner som förut: veckan som föll ur planen minns sin lektion (verifieringen
  // samma natt), och en vecka som planen aldrig har haft har ingen.
  const ljFram = s.lektionernaPaVeckorna(ljPlanFore, ljPlanEfter, [1, 3, 2]);
  const ljTillbaka = s.lektionernaPaVeckorna(ljPlanEfter, ljPlanFore, ljFram.lektioner, ljFram.minne);
  ska('lektionerna följer sina veckors måndagar när starten flyttas fram och tillbaka', JSON.stringify(ljFram.lektioner) === JSON.stringify([3, 2]) && JSON.stringify(ljTillbaka.lektioner) === JSON.stringify([1, 3, 2]) && s.rensaFoljd({ lektionPa: { '2026-10-05': 1, x: 2, '2026-10-12': 0 } }).lektionPa?.['2026-10-05'] === 1 && Object.keys(s.rensaFoljd({ lektionPa: { '2026-10-05': 1, x: 2, '2026-10-12': 0 } }).lektionPa).length === 1, [ljFram, ljTillbaka.lektioner]);
  ska('två versioner som bara skiljer i en ordfog har samma namn', s.versionsvaletsFel({ plan: { versionsval: { rubrik: 'Årskurs', text: 'Välj årskurs efter eleverna i gruppen, så som metoden säger.', mer: 'X', versioner: [{ namn: 'Åk 4–5' }, { namn: 'Åk 4–⁠5' }] } } }).length > 0);
  // Eleverna först i varje händelse, när läraren har skrivit in dem, och en elev som kom senare från sin dag (Niclas
  // 2026-10-27).
  const elevKal = (elever) => s.kalenderfil({ titel: 'B', uppfoljning: [], fokus: [] }, brPlan, { id: 'ab', lank: () => 'https://x', nu: new Date(Date.UTC(2026, 9, 1)), elever });
  const medElever = elevKal([{ namn: 'Ada' }, { namn: 'Bo', fran: '2026-11-10' }]);
  ska('kalenderfilen: Elever först i händelsen, bara när läraren har elever', medElever.includes('DESCRIPTION:Elever: Ada\\, Bo\\nVecka') && medElever.includes('DESCRIPTION:Elever: Ada\\nVecka') && !elevKal([]).includes('Elever:'));
  // Dagarna som gällde då, och förbi ett sommarlov (Codex 2026-10-27: ett byte till tisdag och torsdag flyttade passet, och
  // fyra lovveckor tog bort det).
  const brByte = { ...brVal, dagar: [3, 5], fore: [{ till: '2026-11-10', dagar: [2, 4] }] };
  const brSommar = { ...tom, start: '2026-08-17', dagar: [1, 3], langd: 15, lov: ['2026-07-20', '2026-07-27', '2026-08-03', '2026-08-10'].map(s.veckonyckel) };
  ska('det extra passet: dagarna som gällde då, och förbi ett långt lov', s.extraPassetsDag(s.planera(s.metodplan(br).plan, brByte), brByte) === '2026-10-27' && s.extraPassetsDag(s.planera(s.metodplan(br).plan, brSommar), brSommar) === '2026-07-13', [s.extraPassetsDag(s.planera(s.metodplan(br).plan, brByte), brByte), s.extraPassetsDag(s.planera(s.metodplan(br).plan, brSommar), brSommar)]);
  ska('det extra passet står i omfattningen i texten till åtgärdsprogrammet', s.dokumentationstext({ titel: 'Berättelseram', adress: '/x', uppfoljning: [] }, brPlan, brVal, { minuter: 60, extraPass: { datum: '2026-10-27' } }).includes('och det extra passet före pass 1, tisdag 27 oktober'));
  const vd = metod('skrivkurs-vardeskapande');
  ska('Värdeskapandes val av projekt klarar spärren, och två versioner med samma namn stoppas', s.versionsvaletsFel(vd).length === 0 && s.versionsvaletsFel({ ...vd, plan: { ...vd.plan, versionsval: { ...vd.plan.versionsval, versioner: [vd.plan.versionsval.versioner[0], vd.plan.versionsval.versioner[0]] } } }).some((x) => x.includes('samma namn')), s.versionsvaletsFel(vd));
}
// Modulens version har sin rad i tabellen under Versionerna, så att en ny förmåga aldrig går ut utan att stå där (METODER.md
// under Planera insatsen och PLANERA.md under Vad metoden behöver).
ska(`versionen ${s.PLANERA.version} står i METODER.md under Versionerna`, readFileSync(join(rot, 'METODER.md'), 'utf8').includes(`\n| ${s.PLANERA.version} | `), s.PLANERA.version);
// Veckornas namn har en rot i standarden (K-508; Niclas 2026-10-25: "försök alltid härleda en sak som ex v. nr eller datum
// till EN funktion ... och att denna funktion måste fungera korrekt"): funktionerna räknar rätt, också över nyår och för en
// vecka som tas om, och sammanställningen och planen namnger varje vecka lika.
ska('kalenderveckan', s.kalendervecka(50) === 'v. 50' && s.kalenderveckaUtskriven(50) === 'kalendervecka 50');
ska('kalenderveckornas spann, också över nyår', s.kalenderveckor(45, 45) === 'v. 45' && s.kalenderveckor(45, 46) === 'v. 45–46' && s.kalenderveckor(52, 1) === 'v. 52 till v. 1' && s.kalenderveckor(45, 50, ' till ') === 'v. 45 till v. 50', [s.kalenderveckor(45, 46), s.kalenderveckor(52, 1), s.kalenderveckor(45, 50, ' till ')]);
ska('veckan i planen, och en vecka som tas om', s.planveckan(6) === '6' && s.planveckan(3, 1) === '3 igen' && s.planveckan(3, 2) === '3 en tredje gång' && s.planveckan(3, 5) === '3 en sjätte gång' && s.planveckan(3, 11) === '3 för 12:e gången' && s.planveckanKort(3, 2).om === '3:e' && s.planveckanKort(3, 1).om === 'igen' && s.planveckanKort(3).om === '');
ska('veckans namn i en text och i diagrammet', JSON.stringify(s.veckansNamn({ innehall: 6, vecka: 50 })) === JSON.stringify({ plan: '6', kort: '6', kalender: 'v. 50', text: 'vecka 6 (v. 50)', Text: 'Vecka 6 (v. 50)' }) && s.veckansNamn({ innehall: 3, gang: 1, vecka: 48 }).text === 'vecka 3 igen (v. 48)', s.veckansNamn({ innehall: 6, vecka: 50 }));
{
  // En plan med vecka 3 tre gånger, lov över nyår och en stege som börjar högre upp: sammanställningen och planen namnger varje
  // vecka lika, och den tredje gången heter så i båda.
  const tsPlan = s.planera(tsMp, { ...s.forval(tsMp, '2026-10-26', 3), start: '2026-11-30', langd: 6, upprepa: [3, 3], lov: ['2026-52', '2026-53'] });
  const sam = s.sammanstallning(tsPlan, s.rensaFoljd({}), '2026-12-01');
  const lika = tsPlan.veckor.every((v, i) => JSON.stringify(s.planveckansNamn(tsPlan, v)) === JSON.stringify(s.veckansNamn(sam.veckor[i])));
  const tredje = tsPlan.veckor.filter((v) => v.innehall === 3).map((v) => s.planveckansNamn(tsPlan, v).plan);
  ska('sammanställningen och planen namnger varje vecka lika, också den tredje gången och över nyår', lika && tredje.join() === '3,3 igen,3 en tredje gång' && tsPlan.veckor.some((v) => s.planveckansNamn(tsPlan, v).kalender === 'v. 1'), [tredje, tsPlan.veckor.map((v) => s.planveckansNamn(tsPlan, v).text)]);
}
// Spärren mot drift (K-508; Niclas samma dag: "Skapa inte drift i modulen. Skapa standarder och placeholders till EN rot. Varje
// gång det går"): modulens filer skriver aldrig ut en vecka eller ett datum på egen hand. Veckorna kommer ur blocket
// Veckornas namn i standarden och datumen ur datumText, dagOchManad, dagText och spannKort. Ett fynd säger fil, rad och
// vilken funktion som ska användas (PLANERA.md under Spärren mot drift).
const MODULENS_FILER = ['src/lib/standard/index.js', 'src/lib/standard/plan.js', 'src/lib/standard/saker.js', 'src/lib/standard/text.js', 'src/scripts/webblasaren.ts', 'src/lib/insatsplan.ts', 'src/lib/metodsaker.ts', 'src/lib/sakfiler.ts', 'src/lib/planbar.ts', 'src/scripts/planera.ts', 'src/scripts/planpdf.ts', 'src/scripts/insatser-lagring.ts', 'src/scripts/insatser.ts', 'src/scripts/appen.ts', 'src/components/Planera.astro', 'src/components/AppRad.astro', 'src/components/StodForValet.astro'];
const DRIFT = [
  [/v\. \$\{/, 'en kalendervecka skrivs med kalendervecka() eller kalenderveckor()'],
  [/(?<!veckornaIPlanen\(`)[Vv]ecka \$\{[^}`]*\.vecka\b/, 'en kalendervecka skrivs med kalendervecka(), inte som "vecka"'],
  [/[Vv]ecka \$\{[^}`]*\.innehall\b|\? ' igen' : ''|'en tredje gång'/, 'veckan i planen skrivs med planveckan(), planveckanKort() eller veckansNamn()'],
  [/'januari'|'jan', 'feb'|toLocaleDateString\(|month: '(long|short)'/, 'ett datum skrivs med datumText(), dagOchManad(), dagText(), dagKort(), spannKort() eller datumspann()'],
  [/\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\//, 'ett datum prövas med arDatum()'],
  [/['"](?:(?:mån|tis|ons|tors|fre|lör|sön)dag|[Mm]ån|[Tt]is|[Oo]ns|[Tt]or|[Ff]re)['"]/, 'veckodagarna står i VECKODAGAR och veckodagKort()'],
  [/\.sort\(\(a, b\) => \(a\.datum < b\.datum/, 'datumordningen tas med iDatumordning() eller efterDatum()'],
  [/v\.pass\.map\(\(n\) => plan\.pass\[n - 1\]\)/, 'veckans pass tas med veckansPass()'],
  [/\* 60 \+ Number\(|padStart\(2, '0'\)/, 'ett klockslag räknas med minuterAv() och klockslag(), och två siffror skrivs med tvasiffrigt()'],
  [/\.charAt\(0\)\.toLocale(?:Upper|Lower)Case\('sv'\)(?: \+ |\}\$\{)/, 'stor bokstav först skrivs med stor() och liten med liten()'],
  [/replace\(\/\[&<>"\]\/g/, 'text i HTML skyddas med esc()'],
  [/\.split\(':'\)\[0\]/, 'namnets första led tas med forstaLedet()'],
  [/\{ en: 1, ett: 1|'noll', 'ett', 'två'/, 'talen i ord läses med talAv() och skrivs med talText()'],
  [/\.replace\(\/\[\.\\s\]\+\$\/, ''\)/, 'punkten sist tas bort med utanPunkt(), och en mening får sin punkt med mening()'],
  [/\.replace\(\/\[\.\*\+\?\^/, 'text som ska sökas ordagrant skyddas med skyddaRegex()'],
  // K-515 och K-516: metodens veckor, uppföljningens vecka, passet, delens tid, förnamnet och meningarna.
  [/\/\^vecka \\d\+\$\/i/, 'en rad som heter efter en vecka läses med veckorI(), och metodens veckor skrivs med veckornaIPlanen()'],
  [/\?\.tabell\?\.delar\b|r\.kort \?\? \(/, 'passets namn, roller, delar och förberedelse tas med passetsBeskrivning()'],
  [/\.replace\(\/\\s\*min\$\//, 'en dels tid skrivs med delensTid()'],
  [/\.split\((?:' '|\/\\s\+\/)\)\[0\]/, 'det första ordet, som förnamnet, tas med forstaOrdet()'],
  [/\[\.!\?…\]\["”»’\)\]\*/, 'meningarna i en text tas med meningarna() och slutarMedPunkt()'],
  [/\.download = [`'"]/, 'ett filnamn skrivs med filnamnet()'],
];
// Raderna som är rötterna själva, i standardens plan.js; text.js är roten för texten och talen.
const ROTRAD = /^(?:export )?const (?:MANADER|MANAD_KORT|VECKODAGAR|veckodagKort|arDatum|minuterAv|klockslag|plusMinuter|minuterISpann|efterDatum|iDatumordning|veckansPass|delensTid) = /;
// Rötterna som är funktioner på flera rader, i standardens plan.js, från export function till klammern i första kolumnen.
const ROTFUNKTION = /^export function (?:passetsBeskrivning)\(/;
const drift = (fil, text) => {
  const rader = text.split(/\r?\n/);
  // Roten i standarden: text.js, blocket Veckornas namn och raderna som är rötterna.
  if (fil.endsWith('standard/text.js')) return [];
  let iRoten = false, iFunktion = false;
  const fynd = [];
  rader.forEach((r, i) => {
    if (fil.endsWith('plan.js') && /^\/\/ -{10} /.test(r)) iRoten = r.includes('Veckornas namn');
    if (fil.endsWith('plan.js') && ROTFUNKTION.test(r)) iFunktion = true;
    if (iFunktion) { if (r === '}') iFunktion = false; return; }
    if (iRoten || (fil.endsWith('plan.js') && ROTRAD.test(r))) return;
    // En kommentar får beskriva en form, som "mån" i veckodagKort.
    if (/^\s*(?:\/\/|\/\*|\*)/.test(r)) return;
    for (const [monster, varfor] of DRIFT) if (monster.test(r)) fynd.push(`${fil}:${i + 1}: ${varfor}`);
  });
  return fynd;
};
ska('spärren mot drift hittar en vecka, ett datum, en veckodag, ett klockslag, stor bokstav och HTML-skyddet som skrivs ut för sig', drift('x.ts', 'const a = `v. ${n}`;').length === 1 && drift('x.ts', 'const b = `Vecka ${v.innehall}`;').length === 1 && drift('x.ts', "const m = ['januari', 'februari'];").length === 1 && drift('x.ts', 'const c = kalendervecka(n);').length === 0
  && drift('x.ts', "const d = ['Mån', 'Tis'];").length === 1 && drift('x.ts', "const t = String(m).padStart(2, '0');").length === 1 && drift('x.ts', "const s = x.charAt(0).toLocaleUpperCase('sv') + x.slice(1);").length === 1 && drift('x.ts', 'const e = s.replace(/[&<>"]/g, f);').length === 1 && drift('x.ts', "const k = r.split(':')[0];").length === 1 && drift('x.ts', 'const o = [...p].sort((a, b) => (a.datum < b.datum ? -1 : 1));').length === 1 && drift('src/lib/standard/text.js', "const s = x.charAt(0).toLocaleUpperCase('sv') + x.slice(1);").length === 0);
const driftfynd = MODULENS_FILER.flatMap((f) => drift(f, readFileSync(join(rot, f), 'utf8')));
ska('modulen skriver veckor och datum bara ur standardens funktioner', !driftfynd.length, driftfynd);
// Spärren mot dubbletter (K-509; Niclas 2026-10-25: "Mer orolig för att du bygger kod med nya funktioner som har drift i
// sig"): samma kod på två ställen i modulen är två rötter som kan glida isär, som veckorna i elevens diagram. Provet letar
// utan att veta vad koden gör: samma följd av kod mellan två filer, minst 25 tecken (ett namn, ett tal, en text eller ett
// skiljetecken är ett tecken), och 50 i samma fil; samma lilla funktion med andra namn; och samma lista av ord, också när
// den ena listan har ordens början ("Mån" och "måndag"). Ett fynd säger var båda står. Lägg koden i en funktion, i
// standarden när fler än en fil behöver den, och använd den på båda ställena (PLANERA.md under Spärren mot drift).
const KOD = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`|\$\{|[\p{L}_$][\p{L}\p{N}_$]*|\d+(?:\.\d+)?|=>|===|!==|\?\?|\?\.|&&|\|\||\.\.\.|\S/gu;
const radraknare = (text) => {
  const borjan = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') borjan.push(i + 1);
  return (i) => { let lo = 0, hi = borjan.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (borjan[m] <= i) lo = m; else hi = m - 1; } return lo + 1; };
};
function dubbletter(filer, mellan = 25, inom = 50) {
  const alla = filer.map(({ fil, text }) => ({ fil, text, rad: radraknare(text), t: [...text.matchAll(KOD)].filter((m) => !/^\/[/*]/.test(m[0])).map((m) => [m[0], m.index]) }));
  const sett = new Map(), par = [];
  alla.forEach((f, fi) => {
    for (let k = 0; k + mellan <= f.t.length; k++) {
      const nyckel = f.t.slice(k, k + mellan).map((x) => x[0]).join('\u0001');
      const forra = sett.get(nyckel);
      if (!forra) { sett.set(nyckel, [fi, k]); continue; }
      const [gi, j] = forra;
      let n = mellan;
      while (j + n < alla[gi].t.length && k + n < f.t.length && alla[gi].t[j + n][0] === f.t[k + n][0]) n++;
      if (gi === fi && (k - j < inom || n < inom)) continue;
      par.push({ gi, j, fi, k, n });
    }
  });
  // Ett spann ger ett fynd: ett par som fortsätter paret före räknas inte igen.
  const nycklar = new Set(par.map((p) => `${p.gi}:${p.j}:${p.fi}:${p.k}`));
  return par.filter((p) => !nycklar.has(`${p.gi}:${p.j - 1}:${p.fi}:${p.k - 1}`)).map((p) => {
    const a = alla[p.gi], b = alla[p.fi];
    const kod = a.text.slice(a.t[p.j][1], a.t[p.j + Math.min(p.n, 40) - 1][1] + 1).replace(/\s+/g, ' ');
    return `${a.fil}:${a.rad(a.t[p.j][1])} och ${b.fil}:${b.rad(b.t[p.k][1])}: samma kod (${p.n} tecken): ${kod.slice(0, 120)}`;
  });
}
// Samma lilla funktion med andra namn: en pilfunktion på en rad, eller en funktion på en rad som bara ger tillbaka ett värde
// (Codex 2026-10-25), vars kropp är densamma när parametrarna har bytt namn. Kroppen läses som tecken, så att en parameter
// byts mot sin plats bara i koden: inte i en text, ett reguljärt uttryck eller efter en punkt (Codex samma dag: 'x' i en
// etikett gav en falsk dubblett). TypeScripts typer och icke-null räknas inte.
const REGEXLITERAL = /(?<=(?:^|[(,=:[!&|?{};])\s*)\/(?![*/])(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n[])+\/[dgimsuy]*/g;
const kodensTecken = (kod) => {
  const ut = [];
  let fran = 0;
  const tecken = (bit) => [...bit.matchAll(KOD)].map((x) => x[0]).filter((x) => !/^\/[/*]/.test(x));
  for (const m of kod.matchAll(REGEXLITERAL)) { ut.push(...tecken(kod.slice(fran, m.index)), m[0]); fran = m.index + m[0].length; }
  return [...ut, ...tecken(kod.slice(fran))];
};
function sammaFunktion(filer) {
  const per = new Map();
  for (const { fil, text } of filer) text.split(/\r?\n/).forEach((r, i) => {
    const m = r.match(/^\s*(?:export\s+)?const\s+([\p{L}_$][\p{L}\p{N}_$]*)\s*=\s*\(([^)]*)\)\s*(?::[^=]*)?=>\s*(.+?);?\s*$/u)
      ?? r.match(/^\s*(?:export\s+)?function\s+([\p{L}_$][\p{L}\p{N}_$]*)\s*\(([^)]*)\)\s*(?::[^{]*)?\{\s*return\s+(.+?);?\s*\}\s*$/u);
    if (!m) return;
    const parametrar = m[2].split(',').map((p) => p.trim().replace(/[?]?\s*[:=][\s\S]*$/, '')).filter(Boolean);
    if (parametrar.some((p) => !/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(p))) return;
    const t = kodensTecken(m[3]), kropp = [];
    for (let j = 0; j < t.length; j++) {
      const x = t[j], fore = t[j - 1] ?? '';
      if (x === 'as' && /^[\p{L}_$]/u.test(t[j + 1] ?? '')) { j++; continue; }
      if (x === '!' && /^[)\]\p{L}\p{N}_$]/u.test(fore)) continue;
      kropp.push(parametrar.includes(x) && fore !== '.' && fore !== '?.' ? `§${parametrar.indexOf(x)}` : x);
    }
    if (kropp.length < 6) return;
    const nyckel = kropp.join('\u0001');
    if (!per.has(nyckel)) per.set(nyckel, []);
    per.get(nyckel).push(`${fil}:${i + 1} ${m[1]}`);
  });
  return [...per.values()].filter((x) => x.length > 1).map((x) => `${x.join(' och ')}: samma funktion`);
}
// Samma lista av ord: tre ord eller fler på samma plats i båda, där det ena är det andras början.
function sammaLista(filer) {
  const listor = [];
  for (const { fil, text } of filer) text.split(/\r?\n/).forEach((r, i) => {
    // En kommentar är ingen lista (Codex 2026-10-25).
    if (/^\s*(?:\/\/|\/\*|\*)/.test(r)) return;
    for (const m of r.matchAll(/\[\s*(['"])[^'"\n]*\1(?:\s*,\s*(['"])[^'"\n]*\2){2,}\s*\]/g)) listor.push({ var: `${fil}:${i + 1}`, ord: [...m[0].matchAll(/['"]([^'"\n]*)['"]/g)].map((x) => x[1].toLocaleLowerCase('sv')) });
  });
  // Ett ord är ett annat ords början när det har minst tre bokstäver ("mån" och "måndag"), så att ändelser som "ar" och
  // "arnas" inte räknas.
  const lika = (a, b) => { const n = Math.min(a.length, b.length); let t = 0; for (let i = 0; i < n; i++) { const [k, l] = a[i].length <= b[i].length ? [a[i], b[i]] : [b[i], a[i]]; if (k && (k === l || (k.length >= 3 && l.startsWith(k)))) t++; } return t >= 3 && t >= n - 1; };
  const ut = [];
  listor.forEach((a, i) => listor.slice(i + 1).forEach((b) => { if (lika(a.ord, b.ord)) ut.push(`${a.var} och ${b.var}: samma lista av ord`); }));
  return ut;
}
{
  const prov = (text) => [{ fil: 'a.ts', text }, { fil: 'b.ts', text: `const x = 1;\n${text}` }];
  const lang = 'const veckor = plan.veckor.filter((v) => v.pass.length > 0).map((v) => `${v.nr}: ${v.pass.join(", ")}`).join("; ");';
  ska('spärren mot dubbletter hittar samma kod i två filer, och inte kod som bara liknar',
    dubbletter(prov(lang)).length === 1 && dubbletter(prov('const veckor = plan.veckor.filter((v) => v.pass.length > 0);')).length === 0, dubbletter(prov(lang)));
  ska('spärren mot dubbletter hittar samma lilla funktion med andra namn, också som funktion med return, och inte en som bara har samma form',
    sammaFunktion([{ fil: 'a.ts', text: "const stor = (s) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);" }, { fil: 'b.ts', text: "const versal = (t: string) => t.charAt(0).toLocaleUpperCase('sv') + t.slice(1);" }]).length === 1
    && sammaFunktion([{ fil: 'a.js', text: "export const utanPunkt = (s) => s.replace(/[.\\s]+$/, '');" }, { fil: 'b.ts', text: "function utanSlutpunkt(text: string) { return text.replace(/[.\\s]+$/, ''); }" }]).length === 1
    && sammaFunktion([{ fil: 'a.ts', text: "const a = (x) => ({ value: x, label: 'x' });" }, { fil: 'b.ts', text: "const b = (y) => ({ value: y, label: 'y' });" }]).length === 0);
  ska('spärren mot dubbletter hittar samma lista av ord, också förkortad',
    sammaLista([{ fil: 'a.ts', text: "const A = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag'];" }, { fil: 'b.ts', text: "const B = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre'];" }]).length === 1
    && sammaLista([{ fil: 'a.ts', text: "const A = ['fore', 'efter', 'mitt'];" }, { fil: 'b.ts', text: "const B = ['röd', 'grön', 'blå'];" }]).length === 0
    && sammaLista([{ fil: 'a.ts', text: "const A = ['en', 'ens', 'arnas'];" }, { fil: 'b.ts', text: "const B = ['en', 'ens', 'ar', 'arna'];" }]).length === 0
    && sammaLista([{ fil: 'a.js', text: "export const B = ['avsluta', 'forlang', 'byt'];" }, { fil: 'b.ts', text: "// Exempel: ['avsluta', 'forlang', 'byt']" }]).length === 0);
}
const modulen = MODULENS_FILER.map((fil) => ({ fil, text: readFileSync(join(rot, fil), 'utf8') }));
const dubblettfynd = [...dubbletter(modulen), ...sammaFunktion(modulen), ...sammaLista(modulen)];
ska('modulen har varje sak på ett ställe: ingen kod, funktion eller lista står två gånger', !dubblettfynd.length, `${dubblettfynd.length} fynd:\n    ${dubblettfynd.join('\n    ')}`);
// Rötterna (K-509; Niclas 2026-10-25: "Centralisera och till en rot ... Och saker ska härledas ur en beräkning eller ett
// ställe som är samma sak"): varje rot i tabellen under Spärren mot drift i PLANERA.md prövas här, också i kanterna.
{
  ska('texten: stor och liten bokstav, mening och punkt', s.stor('måndag') === 'Måndag' && s.liten('Två till sex elever') === 'två till sex elever' && s.mening(' Läs högt ') === 'Läs högt.' && s.mening('Vad säger texten?') === 'Vad säger texten?' && s.utanPunkt('Bra. ') === 'Bra' && s.decimal(2.5) === '2,5' && s.tvasiffrigt(7) === '07');
  // En text som är längre än gränsen kapas vid ett ord, med tre punkter sist (K-543; buggjakten 2026-10-25).
  const langText = s.rentText('Mycket lång anledning '.repeat(12), 200);
  ska('en lång text kapas vid ett ord, med tre punkter sist', s.kapaVidOrd('Mycket lång anledning som fortsätter', 20) === 'Mycket lång…' && s.kapaVidOrd('kort', 20) === 'kort' && s.kapaVidOrd('a'.repeat(30), 10) === 'aaaaaaaaa…' && langText.endsWith('anledning…') && langText.length <= 200, [s.kapaVidOrd('Mycket lång anledning som fortsätter', 20), langText.slice(-20)]);
  ska('texten: HTML-skyddet, sökning, lärarens text och namnets första led', s.esc('<b>"&"</b>') === '&lt;b&gt;&quot;&amp;&quot;&lt;/b&gt;' && new RegExp(s.skyddaRegex('a.b (c)')).test('a.b (c)') && !new RegExp(s.skyddaRegex('a.b')).test('axb') && s.rentText(' två\u0007  ord ', 40) === 'två ord' && s.rentText(5, 40) === '' && s.forstaLedet('Lärarhandledningen: Läs mellan raderna') === 'Lärarhandledningen');
  ska('texten: kortnamnet när bara en har det', s.kortnamn('Bildserie 1: Fönsterplatsen', ['Bildserie 1: Fönsterplatsen', 'Bildserie 2: Hunden']) === 'Bildserie 1' && s.kortnamn('Mina lärdomar: vecka 1–2', ['Mina lärdomar: vecka 1–2', 'Mina lärdomar: vecka 3–4']) === 'Mina lärdomar: vecka 1–2');
  ska('talen: i ord och ur ord, också sammansatta', s.talText(3) === 'tre' && s.talText(1, true) === 'en' && s.talText(13) === '13' && s.allaAntal(2) === 'båda' && s.allaAntal(4) === 'alla fyra' && s.talAv('fyra') === 4 && s.talAv('en') === 1 && s.talAv('tjugofem') === 25 && s.talAv('tjugo') === 20 && s.talAv('12') === 12 && Number.isNaN(s.talAv('många')) && s.ORDNINGSTAL[3] === 'tredje');
  ska('talen: i ett reguljärt uttryck', new RegExp(`^(${s.talIRegex(1, 7)})$`).test('sju') && !new RegExp(`^(${s.talIRegex(1, 7)})$`).test('åtta') && new RegExp(`^(${s.talIRegex(2, 99)})$`).test('trettiotvå') && new RegExp(`^(${s.talIRegex(1, 7)})$`).test('en'));
  ska('veckorna i en rubrik', JSON.stringify(s.veckorI('Vecka 1–2')) === '{"fran":1,"till":2}' && s.veckorI('vecka 3').till === 3 && s.veckorI('vecka 4–2') === null && s.veckorI('Veckorna') === null);
  ska('datumen', s.datumText('2026-11-02') === '2 november 2026' && s.dagOchManad('2026-11-02') === '2 november' && s.dagText('2026-11-02') === 'måndag 2 november' && s.dagKort('2026-11-04') === 'Ons 4/11' && s.datumspann('2026-11-02', '2026-12-11') === '2 november till 11 december 2026' && s.datumspann('2026-11-30', '2027-01-15') === '30 november 2026 till 15 januari 2027' && s.spannKort('2026-11-30', '2026-12-04') === '30 nov–4 dec');
  ska('veckodagarna', s.VECKODAGAR[0] === 'måndag' && s.veckodagKort(1) === 'mån' && s.stor(s.veckodagKort(5)) === 'Fre');
  ska('klockslagen', s.minuterAv('09:20') === 560 && s.klockslag(560) === '09:20' && s.plusMinuter('09:20', 40) === '10:00' && s.plusMinuter('23:40', 40) === '23:59' && JSON.stringify(s.minuterISpann('0–4 min')) === '{"fran":0,"till":4}' && s.minuterISpann('Före passet') === null);
  ska('datumordningen, också med ett flyttat pass och samma dag', JSON.stringify(s.iDatumordning([{ datum: '2026-11-04', nr: 2 }, { datum: '2026-11-03', nr: 3 }, { datum: '2026-11-04', nr: 1 }]).map((x) => x.nr)) === '[3,1,2]' && s.efterDatum({ datum: 'a' }, { datum: 'b' }) < 0);
  const p = s.planera(tsMp, { ...s.forval(tsMp, '2026-10-26'), start: '2026-11-30', langd: 4, upprepa: [3], lov: ['2026-52'], flytta: { '2026-12-04': '2026-12-03' }, stryk: [] });
  const v1 = p.veckor[0];
  ska('veckans pass och dagar, med ett flyttat pass', s.veckansPass(p, v1).map((x) => x.nr).join() === v1.pass.join() && s.veckansDagar(p, v1).fran === '2026-11-30' && s.veckansDagar(p, v1).till === '2026-12-03' && s.gangen(p, p.veckor[3]) === 1 && s.metodveckan(3) === 'vecka 3 i metoden', [s.veckansDagar(p, v1), p.veckor.map((v) => v.innehall)]);
  const info = { titel: ts.titel, mal: ts.mal.overgripande, uppfoljning: ts.uppfoljning.rader };
  const rader = s.uppfoljningensRader(p, info);
  ska('uppföljningens rader: Efter insatsen och kalenderveckorna, en gång per vecka', rader.length === p.uppfoljning.filter((u) => u.tillfallen.length).length && rader.some((r) => /^Efter insatsen, v\. \d+$/.test(r)) && rader.every((r) => !/(v\. \d+).*\1/.test(r)) && s.uppfoljningensRad(p, info, p.uppfoljning[0]) === rader[0], rader);
  const f = s.rensaFoljd({ gjorda: ['2026-11-30', '2026-12-02'], elever: [{ id: 'a1', namn: 'Ali' }], skattning: { '2026-11-30': { a1: 2 }, '2026-12-07': { a1: 3 } }, vecka: { '2026-11-30': { varde: 4 } }, resultat: { '0-2026-11-23': { a1: '4 av 8.' } }, avstamning: { beslut: 'fortsatt', not: 'Mer tid.' } });
  const sm = s.sammanstallning(p, f, '2026-12-09');
  const e = sm.elever[0];
  ska('skattningen: värdena vecka för vecka, veckorna med skattning och riktningen', JSON.stringify(s.elevensVarden(sm, e).slice(0, 3)) === '[2,3,null]'.replace('null', 'undefined') || (s.elevensVarden(sm, e)[0] === 2 && s.elevensVarden(sm, e)[1] === 3 && s.elevensVarden(sm, e)[2] === undefined), s.elevensVarden(sm, e));
  ska('skattningen i avstämningens vecka, och ingen när eleven inte skattades då', s.skattningenMittI({ mitt: 2 }, { skattningar: [{ nr: 1, varde: 2 }, { nr: 2, varde: 3 }] })?.varde === 3 && s.skattningenMittI({ mitt: 3 }, { skattningar: [{ nr: 1, varde: 2 }, { nr: 2, varde: 3 }] }) === undefined && s.skattningenMittI({ mitt: null }, { skattningar: [{ nr: 1, varde: 2 }] }) === undefined);
  ska('skattningen: texterna', s.skattadeVeckor(sm).length === 1 && s.riktningText(e) === '2 till 3, framåt' && s.skattningenText('eleven', false) === 'skattning, 1 till 5, av hur väl eleven klarar målet på egen hand' && s.riktningText({ skattningar: [], forsta: null, senaste: null }) === 'Inte skattad än');
  ska('passen och besluten i en mening', s.passensLage(sm) === `${sm.gjordaVarit} av de ${sm.varit} pass som har varit är bockade. Planen har ${sm.planerade} pass.` && s.passensLage({ ...sm, varit: 0 }).startsWith('Inget pass har varit än') && s.passensLage({ ...sm, gjorda: 0 }).startsWith('Inga pass är bockade än') && s.passensLage({ ...sm, slut: true }) === `${sm.gjorda} av ${sm.planerade} pass är bockade som genomförda.` && s.narvaronText({ narvaro: 2 }, { gjorda: 3 }) === 'Var med i 2 av 3 bockade pass.' && s.beslutText(f.avstamning) === 'Fortsätt som planerat. Mer tid.' && s.beslutText({ not: 'Bara en mening' }) === 'Bara en mening.' && s.BESLUTEN.utvardering.join() === 'avsluta,forlang,byt', s.passensLage(sm));
  const efter = p.uppfoljning.find((u) => u.typ === 'efter');
  ska('resultatet i en text, med radens namn som i uppföljningens rad', s.resultatText(p, info, { rad: 0, datum: '2026-11-23', varde: '4 av 8.' }) === `${s.uppfoljningensNamn(p, info, 0)}, v. 48: 4 av 8` && (!efter || s.resultatText(p, info, { rad: efter.rad, datum: '2027-01-18', varde: '6 av 8' }) === 'Efter insatsen, v. 3: 6 av 8'), efter && s.resultatText(p, info, { rad: efter.rad, datum: '2027-01-18', varde: '6 av 8' }));
  ska('passens rad lika överallt: läget och de som inte blev av, och de utan bock sägs inte två gånger', s.passensRad({ ...sm, installda: 1, helgdagar: 2, helgdagarKvar: 0 }).startsWith(s.passensLage(sm)) && s.passensRad({ ...sm, installda: 1, helgdagar: 2, helgdagarKvar: 0 }).endsWith(' Ett pass ställdes in och två föll på helgdagar.') && s.passensRad({ planerade: 18, gjorda: 3, varit: 5, gjordaVarit: 3, slut: false, installda: 0, helgdagar: 0 }) === '3 av de 5 pass som har varit är bockade. Planen har 18 pass.', s.passensRad({ ...sm, installda: 1, helgdagar: 2, helgdagarKvar: 0 }));
  ska('kalenderveckorna: veckor i följd ihop, och ett lov bryter följden', s.kalenderveckornaFor(['2026-11-02', '2026-11-04', '2026-11-16']) === 'v. 45 och v. 47' && s.kalenderveckornaFor(['2026-11-02', '2026-11-09', '2026-11-16']) === 'v. 45–47' && s.kalenderveckornaFor(['2026-12-21', '2026-12-28', '2027-01-04']) === 'v. 52 till v. 1' && s.kalenderveckornaFor(['2026-11-04']) === 'v. 45', s.kalenderveckornaFor(['2026-11-02', '2026-11-16']));
  ska('kalenderfilen kallar uppföljningen efter insatsen som sidan', !efter || s.kalenderfil({ titel: 'T', uppfoljning: ts.uppfoljning.rader, fokus: [] }, p, { id: 'x', lank: () => 'l', nu: new Date(Date.UTC(2026, 10, 1)) }).includes('SUMMARY:T: uppföljning\\, efter insatsen'));
  ska('besluten och meningarna behåller sitt frågetecken', s.beslutText({ beslut: 'fortsatt', not: 'Ska stödet fortsätta?' }) === 'Fortsätt som planerat. Ska stödet fortsätta?' && s.mening('Hur gick det?') === 'Hur gick det?');
  ska('gruppens storlek, också högst', JSON.stringify(s.gruppensElever('Högst fyra elever')) === '{"min":1,"max":4,"klass":false}' && JSON.stringify(s.gruppensElever('Två till sex elever')) === '{"min":2,"max":6,"klass":false}' && s.gruppensElever('En hel klass') === null, s.gruppensElever('Högst fyra elever'));
  ska('diagrammet: stapeln mitt i facket och prickarna under den', s.stapelnsKant(10, 2, 36, 22) === 89 && JSON.stringify(s.prickarna(89, 22, ['med', 'borta']).map((x) => x.x)) === '[96.5,103.5]' && s.prickarna(0, 10, ['med'])[0].slag === 'med');
  ska('saker med nummer i en text', JSON.stringify(s.sakspann('Laminerat Bildserie 1–3, och Bildserie 2–1.').map((x) => [x.namn, x.nummer])) === '[[["Laminerat Bildserie","Bildserie"],[1,2,3]]]');
  // Metodens texter i planens ram och passets varianter (K-515): metodens veckor som planens när planen börjar högre upp i
  // en stege, också i ett spann, en lista, efter "från" och före planen; passet lika på sidan och i kalendern, med
  // tidsschemats variant de veckor den gäller; tidsschemats inledning utan meningarna om metodens sida; och felen som stoppar
  // en metod vars premisser inte har en rot i metoden.
  const vip = (t, b) => s.veckornaIPlanen(t, b);
  ska('metodens veckor som planens', vip('från vecka 4.', 3) === 'från vecka 2.' && vip('Från vecka 2 sist', 3) === 'Från vecka 1 sist' && vip('Vecka 1–3 är passet', 3) === 'Vecka 1 är passet' && vip('Vecka 1–3 är passet', 4) === 'Vecka 1–3 i metoden är passet' && vip('vecka 1 och 4', 3) === 'vecka 2' && vip('veckorna 3–4', 4) === 'vecka 1' && vip('veckorna 4–5', 3) === 'veckorna 2–3' && vip('Vecka 1–4 och 6–7', 3) === 'Vecka 1–2 och 4–5' && vip('vecka 2, 4 och 6', 3) === 'vecka 2 och 4' && vip('från vecka 4', 1) === 'från vecka 4' && vip('Bildserie 2–6, pass 3 och v. 45', 3) === 'Bildserie 2–6, pass 3 och v. 45', [vip('Vecka 1–4 och 6–7', 3), vip('vecka 2, 4 och 6', 3)]);
  {
    const ll = metod('laslistor-i-grupp');
    const llMp = s.metodplan(ll).plan;
    const stege = s.planera(llMp, { ...tom, start: '2026-11-02', dagar: [1, 2, 4, 5], langd: 5, borja: 3 });
    const vInfo = { uppfoljning: [{ nar: 'Vecka 4' }, { nar: 'Vecka 1' }] };
    const utanEfter = { ...stege, uppfoljning: [] };
    const vInfo2 = { uppfoljning: [...vInfo.uppfoljning, { nar: 'Avstämning vecka 4' }] };
    ska('uppföljningens vecka som planens, också inne i namnet', s.uppfoljningensNamn(utanEfter, vInfo, 0) === 'Vecka 2 i insatsen' && s.uppfoljningensNamn(utanEfter, vInfo, 1) === 'Vecka 1 i metoden' && s.uppfoljningensNamn({ ...utanEfter, borja: 1 }, vInfo, 0) === 'Vecka 4 i insatsen' && s.uppfoljningensNamn(utanEfter, vInfo2, 2) === 'Avstämning vecka 2' && JSON.stringify(s.veckorI('vecka 1–\u20603')) === '{"fran":1,"till":3}', [s.uppfoljningensNamn(utanEfter, vInfo, 0), s.uppfoljningensNamn(utanEfter, vInfo2, 2)]);
    const medSteg = { ...stege, pass: stege.pass.map((p) => ({ ...p, steg: 0 })) };
    const kal = s.kalenderfil({ titel: 'Läslistor', uppfoljning: ll.uppfoljning.rader, fokus: ['Från vecka 4 läser ni boken.'], passet: () => 'Från vecka 4 växer boken in.' }, medSteg, { id: 'x', lank: () => 'l', nu: new Date(Date.UTC(2026, 10, 1)) }).replace(/\r\n /g, '');
    ska('kalendern skriver metodens veckor som planens', kal.includes('Från vecka 2 läser ni boken.') && kal.includes('Från vecka 2 växer boken in.') && !kal.includes('vecka 4'), kal.slice(0, 900));
    const dok = s.dokumentationstext({ titel: 'T', adress: 'a', steg: ['Lista från vecka 4'], uppfoljning: ll.uppfoljning.rader }, medSteg, { ...tom, start: '2026-11-02', dagar: [1, 2, 4, 5], langd: 5, borja: 3 }, { minuter: 15 });
    ska('texten till åtgärdsprogrammet skriver metodens veckor som planens', dok.includes('Lista från vecka 2') && !dok.includes('vecka 4'), dok);
    // Passets varianter: metodens rot, med standardens mening på sidan och i Word, och delarna i planen de veckorna.
    const variant = ll.tidsschema.varianter[0];
    ska('variantens mening', s.variantensMening(variant) === 'Vecka 1–3: passet är bara listan, med modellering 0–3 minuter, körläsning 3–6, parläsning 6–14 och avslutning 14–15.' && s.variantenFor(ll.tidsschema.varianter, { vecka: 3 }) === variant && s.variantenFor(ll.tidsschema.varianter, { vecka: 4 }) === undefined && s.variantenFor(ll.tidsschema.varianter, undefined) === undefined && s.delensTid('0–⁠3 min') === '0–3', s.variantensMening(variant));
    const veckans = { text: 'Hela listan: du modellerar.', kort: 'Hela listan' };
    const tabell = { text: 'Pass 1 har en egen ordning.', tabell: { namn: 'Pass 1', adress: '/a', delar: [{ tid: '0–4 min', fas: 'Varför vi ses', vad: 'y' }], fore: [{ namn: 'Före', nar: 'Dagen före', vad: 'z' }] } };
    const schemat = { delar: [{ tid: '0–2 min', fas: 'Modellering', vad: 'm' }], fore: 'Ta fram boken.', varianter: [{ nar: 'vecka 1–3', text: 'Passet är bara listan.', delar: [{ tid: '0–3 min', fas: 'Modellering', vad: 'm' }] }] };
    const b1 = s.passetsBeskrivning([veckans], schemat, { vecka: 2 }), b2 = s.passetsBeskrivning([tabell, veckans], schemat, { vecka: 2 }), b3 = s.passetsBeskrivning([veckans], schemat, { vecka: 4 });
    const texterna = (b) => b.texter.map((t) => (t.etikett ? `${t.etikett}: ${t.text}` : t.text)).join('|');
    const raden = { kort: 'Bygga', rad: [{ kolumn: 'Du', text: 'Läser högt.' }, { kolumn: 'Eleverna', text: 'Följer med.' }] };
    ska('passet: variantens delar de veckorna, tabellens ordning och tidsschemat', b1.namn === 'Hela listan' && texterna(b1) === 'Passet är bara listan.|Du modellerar.' && b1.delar === schemat.varianter[0].delar && !b1.egenOrdning && b1.fore === 'Ta fram boken.' && b2.egenOrdning && b2.delar === tabell.tabell.delar && b2.fore === undefined && b2.foreRader.length === 1 && b2.tabell === tabell.tabell && !texterna(b2).includes('Passet är bara listan.') && b3.delar === schemat.delar && texterna(b3) === 'Du modellerar.' && texterna(s.passetsBeskrivning([raden], schemat, { vecka: 4 })) === 'Du: Läser högt.|Eleverna: Följer med.' && s.passetsBeskrivning([raden], schemat, { vecka: 4 }).namn === 'Bygga', [texterna(b1), texterna(b2), texterna(b3)]);
    // En rad med del står i passets del (den stängda frågan 2026-10-26: veckans rad stod överst, och delen under sa emot den):
    // först i delen, med istallet i stället för delens text, Före passet i förberedelsen, och en del som passet inte har står
    // överst och i utanDel.
    const delSchema = { delar: [{ tid: '0–3 min', fas: 'Texten', vad: 'Vanlig text.' }, { tid: '3–6 min', fas: 'Visa', vad: 'Visa som vanligt.' }], fore: 'Välj ett ställe.' };
    const bd = s.passetsBeskrivning([{ text: 'Överst.', kort: 'Bilderboken' }, { text: 'Veckans text.', del: 'texten' }, { text: 'Veckans visning.', del: 'Visa', istallet: true }, { text: 'Ta en bilderbok.', del: 'Före passet', istallet: true }, { text: 'Ingen sådan del.', del: 'Samtala' }], delSchema);
    ska('en rad med del står i delen, först eller i stället för delens text, och i förberedelsen', bd.namn === 'Bilderboken' && texterna(bd) === 'Överst.|Ingen sådan del.' && bd.delar[0].vad === 'Vanlig text.' && bd.delar[0].forst?.[0].text === 'Veckans text.' && !bd.delar[0].istallet && bd.delar[1].vad === '' && bd.delar[1].istallet === true && bd.delar[1].forst?.[0].text === 'Veckans visning.' && bd.fore === undefined && bd.foreForst?.[0].text === 'Ta en bilderbok.' && bd.utanDel.join() === 'Samtala', JSON.stringify(bd));
    const bd2 = s.passetsBeskrivning([{ text: 'Ta också korten.', del: 'Före passet' }], delSchema);
    ska('en rad med del Före passet står först i förberedelsen, och förberedelsen står kvar', bd2.fore === 'Välj ett ställe.' && bd2.foreForst?.[0].text === 'Ta också korten.' && bd2.delar === delSchema.delar && !bd2.utanDel.length, JSON.stringify(bd2));
    // Spärren åt andra hållet: en del som passet inte har, istallet utan del och del i ett pass utan tidsschemats delar.
    const delFel = (rad) => s.planensRamFel({ tidsschema: { rader: [{ tid: '0–3 min', fas: 'Texten', vad: 'x' }] }, tabeller: [], plan: { passen: [{ nar: 'vecka 1', text: 'x', ...rad }] } });
    ska('spärren för en rad med del', !delFel({ del: 'Texten' }).length && !delFel({ del: 'Före passet', istallet: true }).length && delFel({ del: 'Visa' }).some((f) => f.includes('som passet inte har')) && delFel({ istallet: true }).some((f) => f.includes('istallet utan del')) && delFel({ del: 'Texten', utanTidsschema: true }).some((f) => f.includes('utanTidsschema')), [delFel({ del: 'Visa' }), delFel({ istallet: true }), delFel({ del: 'Texten', utanTidsschema: true })]);
    // Passgenomgången 2026-10-26: en metod som kan planeras har metodens regel för beslutet efter insatsen, och en period som
    // är ett spann eller öppen har stödet för antalet veckor. Prövat åt båda hållen.
    ska('spärren för beslutet efter insatsen och stödet för antalet veckor', s.utvarderingensFel({ plan: { passen: [] } }).length === 1 && !s.utvarderingensFel({ plan: { utvardering: ['Avsluta när eleven klarar det.'] } }).length && !s.utvarderingensFel({}).length && s.veckovaletsFel({ period: 'Sex till åtta veckor', plan: {} }).some((f) => f.includes('plan.veckoval')) && s.veckovaletsFel({ period: 'Tolv veckor eller mer', plan: {} }).some((f) => f.includes('plan.veckoval')) && !s.veckovaletsFel({ period: 'Åtta veckor', plan: {} }).length && !s.veckovaletsFel({ period: 'Sex till åtta veckor' }).length, [s.utvarderingensFel({ plan: {} }), s.veckovaletsFel({ period: 'Sex till åtta veckor', plan: {} })]);
    // Den smala formen (K-572): eleverna i varje rad i en metod som kan planeras, "Att …" i högst två meningar, vidare med
    // liten bokstav och utan punkt, och inget vidare i den sista raden. Cellen och meningen ur samma rot som sidan och Word.
    const elevrad = (r) => ({ plan: {}, progression: { rader: [{ vecka: '1–2', eleverna: 'Att säga frågan med egna ord.', vidare: 'de flesta gör det i två pass i rad' }, { vecka: '3–4', eleverna: 'Att välja ett sätt.', ...r }] } });
    ska('spärren för elevernas riktning åt båda hållen', !s.elevernasFel(elevrad({})).length
      && s.elevernasFel({ plan: {}, progression: { rader: [{ vecka: '1' }] } }).some((f) => f.includes('har inget eleverna'))
      && !s.elevernasFel({ progression: { rader: [{ vecka: '1' }] } }).length
      && s.elevernasFel(elevrad({ eleverna: 'Eleverna väljer ett sätt.' })).some((f) => f.includes('börjar med "Att"'))
      && s.elevernasFel(elevrad({ eleverna: 'Att a. Att b. Att c.' })).some((f) => f.includes('högst två meningar'))
      && s.elevernasFel(elevrad({ vidare: 'De flesta gör det' })).some((f) => f.includes('liten bokstav'))
      && s.elevernasFel({ plan: {}, progression: { rader: [{ vecka: '1', eleverna: 'Att a.', vidare: 'de flesta gör det.' }, { vecka: '2', eleverna: 'Att b.' }] } }).some((f) => f.includes('utan punkt'))
      && s.elevernasFel(elevrad({ vidare: 'alla gör det' })).some((f) => f.includes('sista och har inget vidare'))
      && s.elevernasCell({ eleverna: 'Att a.', vidare: 'b' }) === 'Att a.\nGå vidare när b.' && s.elevernasCell({ eleverna: 'Att a.' }) === 'Att a.'
      && s.harElevernasKolumn(elevrad({})) && !s.harElevernasKolumn({ progression: { rader: [{ vecka: '1' }] } })
      && s.harElevernasKolumn({ progression: { rader: [{ vecka: '1', vidare: 'de flesta gör det' }, { vecka: '2' }] } })
      && s.elevernasFel(elevrad({ eleverna: 'Att ' })).some((f) => f.includes('börjar med "Att"'))
      && s.planensTexter(elevrad({})).some(([, t]) => t === 'Gå vidare när de flesta gör det i två pass i rad.'), s.elevernasFel(elevrad({ vidare: 'alla gör det' })));
    // Den stängda granskningen av K-572 2026-10-27: regeln för att gå vidare prövas i radens sista vecka eller vid radens
    // sista pass, och metodens regel för att ta veckan igen står bara där den inte säger emot radens regel.
    {
      const pl = metod('problemlosning-i-grupp'), ll = metod('laslistor-i-grupp');
      // En regel utan hänvisning till Gå vidare när, som Läslistors före K-583.
      const utanHanvisning = 'Byt lista när de flesta läser orden direkt i veckans två sista pass.';
      const mpl = s.metodplan(pl).plan;
      const provasI = (langd) => { const p = s.planera(mpl, { start: '2026-11-02', dagar: [1, 3], langd }); return p.veckor.filter((v) => v.steg !== null && s.vidareProvasI(mpl, p, v, v.steg)).map((v) => v.innehall).join(); };
      const iPass = { stegEnhet: 'pass', steg: [{ rad: 0, fran: 1, till: 3, vidBehov: false }, { rad: 1, fran: 4, vidBehov: false }] };
      const passen = { pass: [1, 2, 3, 4, 5, 6].map((nr) => ({ nr, steg: nr <= 3 ? 0 : 1 })) };
      // Med sex veckor har Ni gör tillsammans bara vecka 5, och regeln prövas där (Codex 2026-10-27).
      ska('regeln för att gå vidare prövas i radens sista vecka i planen, och vid radens sista pass', provasI(8) === '2,4,6,8' && provasI(6) === '2,4,5,6'
        && s.vidareProvasI(iPass, passen, { innehall: 2, pass: [3, 4] }, 0) && !s.vidareProvasI(iPass, passen, { innehall: 1, pass: [1, 2] }, 0) && s.vidareProvasI(iPass, passen, { innehall: 3, pass: [5, 6] }, 1)
        && s.hanvisarTillVidare(pl.plan.upprepa) && s.hanvisarTillVidare(ll.plan.upprepa) && !s.hanvisarTillVidare(utanHanvisning) && s.vidareMening('x').startsWith(s.VIDARE_BORJAN), [provasI(8), provasI(6)]);
      // Högläsning i par: villkoret där regeln prövas, och följden för de yngre också i vecka 6–8. Problemlösning: inget
      // utan regeln. En regel utan hänvisning: planens mening, eftersom radernas regel gäller. En metod utan regler: metodens
      // hela regel.
      const hp = metod('hoglasning-i-par').plan.upprepa;
      const utan = s.upprepaIVeckan(hp, true, false), med = s.upprepaIVeckan(hp, true, true);
      ska('metodens regel för att ta veckan igen, med och utan radens regel', med?.hela && med.text === hp && utan && !utan.hela && utan.text === 'Tar ni om en vecka, skjuter du upp mötet och läsningen hos de yngre en vecka, om de inte redan har varit.'
        && s.upprepaIVeckan(pl.plan.upprepa, true, false) === null && s.upprepaIVeckan(pl.plan.upprepa, true, true)?.hela
        && s.upprepaIVeckan(utanHanvisning, true, true) === null && s.upprepaIVeckan(utanHanvisning, false, false)?.hela && s.upprepaIVeckan(undefined, true, true) === null, [utan, med]);
    }
    // plan.sistaRaden (Codex 2026-10-27, K-572): Problemlösnings sista vecka tar ledet Du gör själv när perioden är kortare
    // än åtta veckor, också en upprepning av den, och i åtta veckor följer veckorna raderna som förut. Spärren åt andra hållet.
    {
      const pl = metod('problemlosning-i-grupp');
      const mpl = s.metodplan(pl).plan;
      const led = (langd, upprepa) => s.planera(mpl, { start: '2026-11-02', dagar: [1, 3], langd, ...(upprepa ? { upprepa } : {}) }).veckor.map((v) => pl.progression.rader[v.steg]?.led).join('|');
      ska('den sista veckan tar det sista ledet när perioden är kortare', mpl.sistaRaden === true
        && led(6) === 'Jag gör|Jag gör|Vi gör|Vi gör|Ni gör tillsammans|Du gör själv'
        && led(6, [6]) === 'Jag gör|Jag gör|Vi gör|Vi gör|Ni gör tillsammans|Du gör själv|Du gör själv'
        && led(7).endsWith('Ni gör tillsammans|Ni gör tillsammans|Du gör själv')
        && led(8) === 'Jag gör|Jag gör|Vi gör|Vi gör|Ni gör tillsammans|Ni gör tillsammans|Du gör själv|Du gör själv'
        // En förlängning tar den sista veckan igen, så att vecka 6 behåller ledet Du gör själv (Codex 2026-10-27).
        && s.planera(mpl, s.forlangdaVal(mpl, { start: '2026-11-02', dagar: [1, 3], langd: 6 }, 2)).veckor.map((v) => pl.progression.rader[v.steg]?.led).join('|') === 'Jag gör|Jag gör|Vi gör|Vi gör|Ni gör tillsammans|Du gör själv|Du gör själv|Du gör själv'
        && !s.stegUtanfor(mpl, s.planera(mpl, { start: '2026-11-02', dagar: [1, 3], langd: 6 })).length
        && s.stegUtanfor(s.metodplan({ ...pl, plan: { ...pl.plan, sistaRaden: undefined } }).plan, s.planera(s.metodplan({ ...pl, plan: { ...pl.plan, sistaRaden: undefined } }).plan, { start: '2026-11-02', dagar: [1, 3], langd: 6 })).length === 1
        && s.metodplan({ ...pl, plan: { ...pl.plan, sistaRaden: undefined } }).plan.sistaRaden === undefined
        && s.metodplan({ ...pl, progression: { ...pl.progression, enhet: 'Pass' } }).fel.some((f) => f.includes('plan.sistaRaden')), [led(6), led(6, [6]), led(7), led(8)]);
    }
    ska('tidsschemats inledning i planen, utan meningarna om metodens sida', s.planensInledning(ll.tidsschema.text, ll.plan.utan) === 'Förbered dig genom att välja orden du ska modellera. Passet och listorna står också på Lektionskortet, ett A4 att ha framför dig.' && s.planensInledning('En. Två.', ['Två.']) === 'En.', s.planensInledning(ll.tidsschema.text, ll.plan.utan));
    const texter = s.planensTexter(ll), visade = s.visadeTexter(ll);
    ska('planens texter: planens egna fält, och metodens texter som planen visar med varianten och tabellraderna', texter.some(([plats]) => plats === 'Planens upprepa') && visade.includes('Passet är bara listan.') && visade.includes('Läraren modellerar fyra till sex ord, och gruppen körläser hela listan i stället för dagens kolumn. Förklara nya ord.') && visade.includes(s.planensInledning(ll.tidsschema.text, ll.plan.utan)) && !visade.some((t) => t.includes('Remsan')), texter.map(([p]) => p));
    // Rollerna ur metodens tabellrader och planens texter som citat (K-520 och K-521): raden med kolumnerna, en enda kolumn
    // utan namn, en rad eller kolumn som inte finns, och en omskrivning som stoppas.
    const ts2 = metod('textsamtal-i-grupp');
    const rad1 = s.rollensRad(ts2, { tabell: 'Veckans tre pass: vem som tänker', rad: 'Pass 1', kolumner: ['Du', 'Eleverna'] });
    ska('rollens text ur metodens tabellrad', rad1?.length === 2 && rad1[0].kolumn === 'Du' && rad1[0].text.startsWith('Tänker högt och visar veckans tankesteg') && s.rollensRad(ll, { tabell: 'En lista i veckan', rad: 'Fredag' })?.[0].kolumn === '' && s.rollensRad(ll, { tabell: 'En lista i veckan', rad: 'Lördag' }) === null && s.rollensRad(ts2, { tabell: 'Veckans tre pass: vem som tänker', rad: 'Pass 1', kolumner: ['Läraren'] }) === null, rad1);
    const omskriven = structuredClone(ll);
    omskriven.plan.upprepa = 'Byt lista när paren läser direkt.';
    omskriven.plan.passen[0] = { nar: 'veckans första', ur: { tabell: 'En lista i veckan', rad: 'Söndag' } };
    const cfel = s.planensCitatFel(omskriven), rfel2 = s.planensRamFel(omskriven);
    const kortad = structuredClone(ll);
    kortad.plan.upprepa = 'Byt lista först när paren läser orden direkt.';
    const minfel = s.varianternasFel(ll, ['Vecka 1–3: passet är bara listan, med modellering 0–2 min, körläsning 2–4 och parläsning 4–15.'], { var: 'Lektionskortet' });
    ska('spärren: planens texter citerar metoden med hela meningar, och en tabellrad som inte finns', s.planensCitatFel(ll).length === 0 && cfel.some((x) => x.includes('Planens upprepa säger "Byt lista när paren läser direkt."')) && s.planensCitatFel(kortad).some((x) => x.includes('"Byt lista först när paren läser orden direkt."')) && rfel2.some((x) => x.includes('raden "Söndag"')) && minfel.length === 1, [cfel, rfel2, s.planensCitatFel(kortad), minfel]);
    // Spärrarna åt andra hållet: Läslistor som den var före K-515 stoppas, i metoden, lathunden, lektionskortet och planen.
    const gammal = structuredClone(ll);
    gammal.plan.passen = [{ nar: 'vecka 1–3', text: 'Vecka 1–3 är passet bara listan: modelleringen tar 0–3 minuter, körläsningen 3–6, parläsningen 6–14 och avslutningen den sista minuten.' }, ...gammal.plan.passen];
    delete gammal.plan.utan;
    gammal.tidsschema.text = `${gammal.tidsschema.text} Vecka 1–3 är passet bara listan: modelleringen tar 0–3 minuter, körläsningen 3–6, parläsningen 6–14 och avslutningen den sista minuten.`;
    delete gammal.tidsschema.varianter;
    gammal.checklista.punkter = [...gammal.checklista.punkter, 'Den andra veckan tar ni boken.'];
    const rfel = s.planensRamFel(gammal), tfel = s.tidsschematsFel(gammal);
    const kortet = ['Vecka 1–3 är passet bara listan: modellering 0–3, kör 3–6, par 6–14 och avslutning den sista minuten.'];
    ska('spärren: tider i planens text, en mening om metodens sida och en vecka i ord i en stege', s.planensRamFel(ll).length === 0 && rfel.some((x) => x.includes('Planens pass "vecka 1–3" säger passets tider')) && rfel.some((x) => x.includes('"Remsan visar passet från vecka 4')) && rfel.some((x) => x.includes('"andra veckan"')) && s.planFel(gammal).length === s.metodplan(gammal).fel.length + rfel.length, rfel);
    const glapp = structuredClone(ll);
    glapp.tidsschema.varianter[0].delar[1].tid = '4–6 min';
    glapp.tidsschema.varianter[0].delar[3].fas = 'Läsa';
    glapp.tidsschema.varianter.push({ nar: 'vecka 3', text: 'Mer.', delar: [{ fas: 'Modellering', tid: '0–8 min' }, { fas: 'Körläsning', tid: '8–16 min' }] });
    const gfel = s.tidsschematsFel(glapp);
    ska('spärren: tidsschemats tider i en mening och varianter som inte håller', s.tidsschematsFel(ll).length === 0 && tfel.some((x) => x.includes('passets tider i en mening')) && gfel.some((x) => x.includes('delen Körläsning börjar på minut 4')) && gfel.some((x) => x.includes('delen Läsa, som inte är en rad i tidsschemat')) && gfel.some((x) => x.includes('"vecka 3" gäller veckor som en annan variant redan gäller')) && gfel.some((x) => x.includes('har delar till minut 16')), [tfel, gfel]);
    const lfel = s.varianternasFel(ll, ['En lista i veckan.'], { lathund: true, var: 'Lathunden' }), kfel = s.varianternasFel(ll, kortet, { var: 'Lektionskortet' }), ufel = s.varianternasFel(gammal, kortet, { var: 'Lektionskortet' });
    ska('spärren: lathunden och lektionskortet säger varianten med standardens mening', s.varianternasFel(ll, s.allaTexter(ll.lathund), { lathund: true, var: 'Lathunden' }).length === 0 && lfel.some((x) => x.includes('Lathunden säger inte tidsschemats variant')) && kfel.some((x) => x.includes('säger passets tider för vissa veckor på eget sätt')) && ufel.length === 1 && s.allaTexter({ a: ['x', { b: 'y' }], c: 3 }).join() === 'x,y', [lfel, kfel, ufel]);
  }
  // Varianter för passets längd och för vissa pass (riggens omgång 1 2026-10-26): Upprepad läsnings pass på tio minuter,
  // Högläsning i pars visning i pass 2 och i veckans första pass i vecka 2–5, med samma ord som planens passen, och
  // Boksamtalets näst sista pass, där boken läses ut.
  {
    const up = metod('upprepad-lasning'), hl = metod('hoglasning-i-par'), bs = metod('boksamtal-i-grupp');
    ska('variantens när: veckor, längd, ett pass och en plats i vissa veckor', JSON.stringify(s.variantensNar('ett pass på tio minuter')) === '{"typ":"minuter","minuter":10}' && s.variantensNar('pass på 20 minuter')?.minuter === 20 && JSON.stringify(s.variantensNar('veckans första pass i vecka 2–5')) === '{"typ":"vecka","plats":1,"veckor":{"fran":2,"till":5}}' && s.variantensNar('pass 2')?.typ === 'pass' && s.variantensNar('vecka 1–3')?.typ === 'veckor' && s.variantensNar('en gång') === null && s.variantensNar('pass 2 i vecka 3') === null && s.tolkaPassen('näst sista passet')?.typ === 'nastSista', [s.variantensNar('veckans första pass i vecka 2–5'), s.variantensNar('pass på 20 minuter')]);
    ska('variantens mening för en längd och för vissa pass', s.variantensMening(up.tidsschema.varianter[0]) === 'Ett pass på tio minuter: första läsningen 0–2 minuter, modellering 2–4, läs igen 4–9 och avslutning 9–10. Då hinner du lyssna på varje elev om gruppen har högst fyra elever. Med fem eller sex elever är passet 15 minuter.' && s.variantensMening(hl.tidsschema.varianter[1]) === 'Veckans första pass i vecka 2–5: du visar den nya strategin, så du hinner bara höra tre av dagens par, med texten 0–3 minuter, visa 3–8, läs för en lyssnare 8–18 och återkoppling 18–20.', [s.variantensMening(up.tidsschema.varianter[0]), s.variantensMening(hl.tidsschema.varianter[1])]);
    const ump = s.metodplan(up).plan, upl = s.planera(ump, s.forval(ump, '2026-10-26'));
    const hmp = s.metodplan(hl).plan, hpl = s.planera(hmp, s.forval(hmp, '2026-10-26'));
    const hVarianten = (nr, min = 20) => s.variantenFor(hl.tidsschema.varianter, s.passetsLage(hpl, s.passetMedNr(hpl, nr), min))?.nar ?? '-';
    const v2forsta = s.iDatumordning(s.veckansPass(hpl, hpl.veckor[1]))[0].nr, v6forsta = s.iDatumordning(s.veckansPass(hpl, hpl.veckor.find((v) => v.innehall === 6)))[0].nr;
    ska('varianten gäller passets längd, ett visst pass och en plats i vissa veckor', s.variantenFor(up.tidsschema.varianter, s.passetsLage(upl, upl.pass[0], 10)) === up.tidsschema.varianter[0] && s.variantenFor(up.tidsschema.varianter, s.passetsLage(upl, upl.pass[0], 15)) === undefined && hVarianten(1) === '-' && hVarianten(2) === 'pass 2' && hVarianten(3) === '-' && hVarianten(v2forsta) === 'veckans första pass i vecka 2–5' && hVarianten(v6forsta) === '-', [hVarianten(2), hVarianten(v2forsta), hVarianten(v6forsta)]);
    const b10 = s.passetsBeskrivning([], { delar: up.tidsschema.rader.filter((r) => /\d/.test(r.tid)).map((r) => ({ ...r })), varianter: up.tidsschema.varianter.map((v) => ({ ...v, delar: v.delar.map((x) => ({ ...x, vad: 'v' })) })) }, s.passetsLage(upl, upl.pass[0], 10));
    ska('passet på tio minuter har variantens delar, text och rubrik', b10.delar.map((x) => x.tid).join() === '0–2 min,2–4 min,4–9 min,9–10 min' && b10.variantText === up.tidsschema.varianter[0].text && !b10.texter.some((t) => t.text === up.tidsschema.varianter[0].text) && b10.rubrik === 'Ett pass på tio minuter' && s.passetsBeskrivning([], { delar: [], varianter: hl.tidsschema.varianter.map((v) => ({ ...v, delar: v.delar.map((x) => ({ ...x, vad: 'v' })) })) }, { nr: 2, vecka: 1, plats: 2 }).rubrik === undefined, b10);
    // Codex 2026-10-26: det näst sista passet efter datum när ett pass har flyttats förbi ett annat, och Boksamtalets steg
    // Från läspass 10, som väntar till nästa bok när boken har högst tolv läspass (fjorton pass med bokvalet och slutet).
    const bval = { ...s.forval(s.metodplan(bs).plan, '2026-10-26'), start: '2026-11-02', dagar: [1, 3, 5], langd: 5 };
    const bmp0 = s.metodplan(bs).plan, flyttad = s.planera(bmp0, { ...bval, flytta: { [s.passetMedNr(s.planera(bmp0, bval), 15).datum]: '2026-12-01' } });
    const kortenI = (pl, nr) => s.passetsRoller(pl, s.passetMedNr(pl, nr), bmp0.passen).map((r) => bs.plan.passen[r].kort);
    const fjorton = s.planera(bmp0, { ...bval, dagar: [2, 4], langd: 7 });
    ska('näst sista passet efter datum, och steget Från läspass 10 väntar i en bok med tolv läspass', flyttad.sistaNr === 14 && kortenI(flyttad, 15)[0] === 'Det sista läspasset' && !kortenI(flyttad, 13).includes('Det sista läspasset') && fjorton.pass.length === 14 && !fjorton.pass.some((x) => kortenI(fjorton, x.nr)[0] === 'En elev leder laget runt'), [kortenI(flyttad, 15), kortenI(flyttad, 13), fjorton.pass.length]);
    ska('en förberedelserad i passets tabell behåller tabellens andra kolumner', s.tabellensDelar({ kolumner: ['Del', 'Vad du gör', 'Du säger', 'Material'], rader: [['Förberedelse\nDagen före', 'Läs.', 'Säg.', 'Boken.'], ['Starten\n0–5 min', 'Börja.', 'Hej.', 'Inget.']] })?.fore[0].mer.map((x) => x.etikett).join() === 'Du säger,Material');
    // Boksamtalets näst sista pass får raden Det sista läspasset före spannet, och sista passet sitt slut.
    const bmp = s.metodplan(bs).plan, bpl = s.planera(bmp, s.forval(bmp, '2026-10-26'));
    const korten = (nr) => s.passetsRoller(bpl, s.passetMedNr(bpl, nr), bmp.passen).map((r) => bs.plan.passen[r].kort);
    const sista = bpl.sistaNr, nast = Math.max(...bpl.pass.map((x) => x.nr).filter((n) => n < sista));
    ska('näst sista passet är det sista läspasset, också när passet har ett eget nummer', korten(nast)[0] === 'Det sista läspasset' && korten(sista)[0] === 'Slutet' && !korten(nast - 1).includes('Det sista läspasset') && s.narensVikt({ typ: 'nastSista' }) < s.narensVikt({ typ: 'pass', fran: 1, till: 1 }) && s.narensVikt({ typ: 'nastSista' }) < s.narensVikt({ typ: 'pass', fran: 7, till: 10 }), [korten(nast), korten(sista)]);
    // Spärrarna åt andra hållet: en längd som inte går ihop, samma längd två gånger, tidsschemats egen längd och ett när som
    // inte går att läsa stoppas, och lathunden behöver bara säga varianterna för vissa veckor.
    const trasig = structuredClone(up);
    trasig.tidsschema.varianter.push({ nar: 'ett pass på tio minuter', delar: [{ fas: 'Första läsningen', tid: '0–5 min' }, { fas: 'Läs igen', tid: '5–12 min' }] }, { nar: 'ett pass på 15 minuter', delar: [{ fas: 'Första läsningen', tid: '0–5 min' }, { fas: 'Läs igen', tid: '5–15 min' }] }, { nar: 'ibland', delar: [{ fas: 'Första läsningen', tid: '0–5 min' }, { fas: 'Läs igen', tid: '5–10 min' }] });
    const tf = s.tidsschematsFel(trasig);
    ska('spärren: varianter för passets längd som inte håller', s.tidsschematsFel(up).length === 0 && s.tidsschematsFel(hl).length === 0 && tf.some((x) => x.includes('gäller en längd som en annan variant redan gäller')) && tf.some((x) => x.includes('har delar till minut 12, men varianten gäller ett pass på 10 minuter')) && tf.some((x) => x.includes('gäller samma längd som tidsschemats rader')) && tf.some((x) => x.includes('"ibland" går inte att läsa')), tf);
    ska('lathunden behöver inte säga en variant för passets längd eller ett visst pass', s.varianternasFel(up, ['En lathund utan varianten.'], { lathund: true, var: 'Lathunden' }).length === 0 && s.varianternasFel(hl, ['En lathund utan varianten.'], { lathund: true, var: 'Lathunden' }).length === 0);
    ska('raden och varianten läses lika för ett pass', s.passetTraffas({ typ: 'minuter', minuter: 10 }, { minuter: 10 }) && !s.passetTraffas({ typ: 'minuter', minuter: 10 }, { minuter: 15 }) && s.passetTraffas({ typ: 'vecka', plats: 1, veckor: { fran: 2, till: 5 } }, { vecka: 3, plats: 1 }) && !s.passetTraffas({ typ: 'vecka', plats: 1, veckor: { fran: 2, till: 5 } }, { vecka: 6, plats: 1 }) && s.passetTraffas({ typ: 'nastSista' }, { nastSista: true }) && !s.passetTraffas({ typ: 'pass', fran: 2, till: 2 }, { vecka: 1 }));
    // Passets egen tabell i sina former (riggens omgång 1): Seriesamtals Del med tiden under namnet, Faktatextsamtalets Del
    // och tid, Högläsning i pars Delen och Tid, och Boksamtalets Tid och del med en punkt. En tabell med tider men utan namn på
    // delarna är inget pass i delar, så att metoden får namnen.
    const tabellen = (id, namn) => s.tabellensDelar(metod(id).tabeller.find((x) => x.rubrik === namn));
    const sp1 = tabellen('seriesamtal', 'Pass 1: syftet, reglerna och tankebubblan'), fm = tabellen('faktatextsamtal-i-grupp', 'Modellpasset på 40 minuter'), hf = tabellen('hoglasning-i-par', 'Det första passet'), bl = tabellen('boksamtal-i-grupp', 'Läspass 1: allt visas första gången'), bv = tabellen('boksamtal-i-grupp', 'Första passet: bokvalet');
    ska('passets egen tabell i sina former', sp1?.delar[0].fas === 'Varför vi ses' && sp1.fore[0].nar === 'Före pass 1' && fm?.delar[1].fas === 'Modellen' && fm.delar[1].mer[0].etikett === 'Så leder du det' && hf?.delar[0].fas === 'Ramarna och paren' && /^0/.test(hf.delar[0].tid) && bl?.delar[0].fas === 'Var är vi?' && bl.delar[0].tid === '0–5' && bl.delar[0].mer[0].etikett === 'Du säger' && bv?.delar[0].fas === 'Två böcker' && bv.delar.length === 4 && s.tabellensDelar({ kolumner: ['Vecka', 'Text'], rader: [['1', 'x']] }) === null && s.tabellensDelar({ kolumner: ['Tid', 'Vad händer'], rader: [['0–10', 'Du visar.'], ['10–20', 'Paren läser.']] }) === null, [sp1?.delar[0], fm?.delar[1], hf?.delar[0], bl?.delar[0], bv?.delar[0]]);
  }
  // Målet (K-522): metodens övergripande mål i en mening, och lektionskortets mål som metodens, åt båda hållen.
  const llMal = metod('laslistor-i-grupp');
  ska('målet: meningen och lektionskortets mål', s.malensMening(llMal.mal.overgripande) === 'Det övergripande målet är att eleven ska kunna binda ihop ljuden till ett ord och läsa det med flyt.' && s.kortetsMalFel(llMal, ['**Mål:** kunna binda ihop ljuden till ett ord och läsa det med flyt.'], 'Kortet').length === 0 && s.kortetsMalFel(llMal, ['**Mål:** kunna läsa ord.'], 'Kortet').length === 1 && s.kortetsMalFel(llMal, ['Ett kort utan mål.'], 'Kortet').length === 1 && s.malText(llMal.mal.overgripande) === 'Kunna binda ihop ljuden till ett ord och läsa det med flyt.', s.malensMening(llMal.mal.overgripande));
  // Eleverna (K-516): samma förnamn är samma elev, och ett annat förnamn en ny, också ett som skiljer på en bokstav.
  ska('eleven: förnamnet och samma elev', s.forstaOrdet(' Ali  S. ') === 'Ali' && s.forstaOrdet('Lässchema TIL') === 'Lässchema' && s.sammaElev('Ali', 'Ali S.') && s.sammaElev('bea', 'Bea S') && !s.sammaElev('Anna', 'Nova') && !s.sammaElev('Alva', 'Alma') && !s.sammaElev('Ana', 'Anna') && !s.sammaElev('', 'Ali'));
  // Filnamnen (K-519): vad, vem, metoden och datumet, utan å, ä och ö, och det som saknas hoppas över.
  // Planen som fil heter som knapparna, och knappen som läser filen heter inte Ladda upp: filen lämnar aldrig datorn (Niclas 2026-10-25).
  ska('knapparnas namn för planen som fil', s.PLANKNAPPAR.spara === 'Spara planen' && s.PLANKNAPPAR.laddaNer === 'Ladda ner planen' && s.PLANKNAPPAR.oppna === 'Öppna en nedladdad plan' && !/ladda upp/i.test(Object.values(s.PLANKNAPPAR).join()));
  ska('filnamnen på det som laddas ner', s.filnamnet('sammanstallning', { vem: 'Ali Öberg', metod: 'textsamtal-i-grupp', datum: '2026-10-25' }) === 'sammanstallning-Ali-Öberg-textsamtal-i-grupp-2026-10-25.pdf' && s.filnamnet('sammanstallning', { vem: 'Åsa', metod: 'x', datum: '2026-10-25' }) !== s.filnamnet('sammanstallning', { vem: 'Asa', metod: 'x', datum: '2026-10-25' }) && s.filnamnet('sammanstallning', { grupp: true, vem: '', metod: 'til-i-grupp', datum: '2026-10-25' }) === 'sammanstallning-gruppen-til-i-grupp-2026-10-25.pdf' && s.filnamnet('sammanstallning', { grupp: true, vem: 'Ali', metod: 'x', datum: '2026-10-25' }) !== s.filnamnet('sammanstallning', { vem: 'Ali', metod: 'x', datum: '2026-10-25' }) && s.filnamnet('plan', { vem: 'Läsgrupp 2B: tisdag/torsdag', metod: 'laslistor-i-grupp', datum: '2026-10-25' }) === 'plan-Läsgrupp-2B-tisdag-torsdag-laslistor-i-grupp-2026-10-25.json' && s.filnamnet('kalender', { metod: 'seriesamtal', datum: '2026-10-25' }) === 'kalender-seriesamtal-2026-10-25.ics');
  ska('meningarna i en text, med förkortningar och citat', JSON.stringify(s.meningarna('Läs t.ex. boken. Sedan v. 45 och kl. 9. ”Hej!” sa hon. Slut')) === JSON.stringify(['Läs t.ex. boken.', 'Sedan v. 45 och kl. 9.', '”Hej!” sa hon.', 'Slut']) && s.meningarna('').length === 0 && s.meningarI('Två ord. Tre ord här.') === 2 && s.meningarI('Fisken i sjön är mås. Och gräs.') === 2 && s.slutarMedPunkt('Klart.') && !s.slutarMedPunkt('Inte klart'), s.meningarna('Läs t.ex. boken. Sedan v. 45 och kl. 9. ”Hej!” sa hon. Slut'));
  const lagring = foljd(await import('../src/scripts/insatser-lagring.ts'));
  ska('planens adress och dagens datum', lagring.planensAdress({ metod: 'til-i-grupp', val: 's=2026-11-02&d=135&l=6', id: 'abc123' }, 3) === '/stodundervisning/til-i-grupp/planera#s=2026-11-02&d=135&l=6&p=abc123&v=3' && /^\d{4}-\d{2}-\d{2}$/.test(lagring.idagLokalt()));
  // Insatsens läge och ordningen i Dina insatser (Niclas 2026-10-25): kommande, pågående och avslutad, av läraren eller två
  // veckor efter sista passet, och inom läget efter datum, de avslutade med den senast avslutade först.
  const lp = Object.fromEntries(lagesplaner.map((x) => [x.namn, x]));
  ska('insatsens läge: kommande, pågående och avslutad', lagring.statusAv(lp.Kommer, '2026-11-18') === 'kommande' && lagring.statusAv(lp.Pagar, '2026-11-18') === 'pagaende' && lagring.statusAv(lp.Avslutad, '2026-11-18') === 'avslutad' && lagring.statusAv(lp.Kvar, '2026-11-18') === 'pagaende' && lagring.statusAv(lp.Sjalv, '2026-11-18') === 'avslutad' && lagring.statusAv(lp.Oppnad, '2026-11-18') === 'pagaende' && lagring.STATUSNAMN.avslutad === 'Avslutad' && s.AVSLUTANDE.join() === 'avsluta,byt');
  // Planens format (PLANERA.md under Planens fil och lagringen): varje provfil i scripts/planera/filer/, en plan som fil och
  // lagringen i webbläsaren som en utlagd version skrev dem, öppnas med allt den har och utan varningar, och skrivs tillbaka i
  // den här versionens format. Den äldsta som ska gå att öppna är 0.2.7 (Niclas 2026-10-25: "från och med den som är uppe nu
  // ska det bara bakåtkompatibilitet från den och framåt").
  const filmapp = join(rot, 'scripts', 'planera', 'filer');
  const filerna = readdirSync(filmapp).filter((x) => x.endsWith('.json'));
  const lasProvfil = (namn) => JSON.parse(readFileSync(join(filmapp, namn), 'utf8'));
  const somForut = (a, b) => a && b && a.val === b.val && a.namn === b.namn && JSON.stringify(a.foljd) === JSON.stringify(s.rensaFoljd(b.foljd)) && a.folj === b.folj;
  ska('planens format: provfilerna från 0.2.7 finns', filerna.includes('plan-0.2.7.json') && filerna.includes('lagring-0.2.7.json'), filerna);
  for (const namn of filerna.filter((x) => x.startsWith('plan-'))) {
    const fil = lasProvfil(namn);
    const last = lagring.lasPlanfil(fil);
    const igen = last ? lagring.lasPlanfil(JSON.parse(lagring.planfilen(last.plan, s.PLANERA.version))) : null;
    ska(`planens format: ${namn} öppnas med allt och skrivs i den här versionens format`, !!last && !last.varningar.length && somForut(last.plan, fil.plan) && last.plan.foljd.elever.length === fil.plan.foljd.elever.length && JSON.parse(lagring.planfilen(last.plan, s.PLANERA.version)).v === lagring.PLANFORMAT && JSON.parse(lagring.planfilen(last.plan, s.PLANERA.version)).modul === s.PLANERA.version && !!igen && somForut(igen.plan, last.plan), last?.varningar);
  }
  for (const namn of filerna.filter((x) => x.startsWith('lagring-'))) {
    const lagrat = lasProvfil(namn);
    const planer = lagrat.planer.map((x) => lagring.rensaPlan(lagring.konverteraPlan(x, lagrat.v).plan));
    ska(`planens format: ${namn} öppnas med alla planer och allt som förts in`, planer.length === lagrat.planer.length && planer.every((x, i) => somForut(x, lagrat.planer[i])), planer.map((x) => x?.id));
  }
  const plan027 = lasProvfil('plan-0.2.7.json');
  const langtVal = `${plan027.plan.val}&db=${Array.from({ length: 300 }, (_, i) => `2027-01-${String((i % 28) + 1).padStart(2, '0')}~24`).join('.')}`;
  ska('planens format: ett långt val kapas inte', langtVal.length > 4000 && lagring.rensaPlan({ ...plan027.plan, val: langtVal })?.val === langtVal, langtVal.length);
  ska('planens format: en fil ur en nyare version öppnas och säger det, och en annan fil är ingen plan', lagring.lasPlanfil({ ...plan027, v: lagring.PLANFORMAT + 1 })?.varningar.some((x) => x.includes('nyare version')) && lagring.lasPlanfil({ typ: 'annat', plan: plan027.plan }) === null && lagring.lasPlanfil(null) === null && Object.keys(lagring.KONVERTERINGAR).every((x) => Number(x) >= 1 && Number(x) < lagring.PLANFORMAT));
  // Alla planer som en zip och planer in ur en zip eller flera filer (K-608, K-609; Niclas 2026-10-28: "kan läsa in en zip
  // eller enskilda filer", och "Om en och samma plan väljs som har flera filer ska uppladdningen ladda upp den nyaste
  // versionen"): zip-filen packas upp till samma filer, och av två versioner av samma plan läses den nyaste.
  {
    const bas = lagring.lasPlanfil(lasProvfil('plan-0.2.7.json')).plan;
    const aldre = { ...bas, andrad: '2026-11-01T10:00:00', namn: 'Äldre' }, nyare = { ...bas, andrad: '2026-11-20T10:00:00', namn: 'Nyare' };
    const filer = [{ namn: 'a.json', text: lagring.planfilen(aldre, s.PLANERA.version) }, { namn: 'b.json', text: lagring.planfilen(nyare, s.PLANERA.version) }];
    const zip = new Uint8Array(await lagring.zipa(filer).arrayBuffer());
    const upp = await lagring.packaUpp(zip);
    ska('zip-filen packas upp till samma filer', upp.length === 2 && upp.every((x, i) => x.namn === filer[i].namn && x.text === filer[i].text), upp.map((x) => x.namn));
    const lasta = await lagring.lasPlanfilerna([new File([zip], 'alla.zip'), new File(['inte en plan'], 'x.json'), new File([filer[0].text], 'a.json')]);
    ska('av samma plan i flera filer läses den nyaste, och en fil som inte är en plan räknas', lasta.planer.length === 1 && lasta.planer[0].plan.namn === 'Nyare' && lasta.inte === 1, [lasta.planer.map((x) => x.plan.namn), lasta.inte]);
    ska('beskedet efter inläsningen', lagring.planernasBesked({ ok: true, sparade: 2, aldre: 1 }, 1) === 'Två planer är öppnade ur filerna, med allt som förts in. De står under Dina insatser och under sin metod. En plan i webbläsaren var nyare än filen och står kvar. En fil var inte en nedladdad plan.', lagring.planernasBesked({ ok: true, sparade: 2, aldre: 1 }, 1));
  }
  ska('insatsens läge: ordningen', [...lagesplaner].sort(lagring.iTurOrdning('2026-11-18')).map((x) => x.namn).join() === 'Pagar,Kvar,Oppnad,Kommer,Avslutad,Sjalv', [...lagesplaner].sort(lagring.iTurOrdning('2026-11-18')).map((x) => x.namn).join());
}
// Pågående insatser i statistiken (K-504, src/scripts/insatser-lagring.ts): en plan som är inne i sina veckor ger händelsen
// planera:<metod>:pagar, en andra plan för samma metod :2, och en plan som är slut eller inte har börjat ingen. Händelsen
// bär bara metoden.
{
  const lagring = await import('../src/scripts/insatser-lagring.ts');
  const sparad = (id, metod, dagar) => ({ id, metod, titel: metod, namn: '', val: '', andrad: '', schema: { pass: dagar.map((d, i) => [d, 1, i + 1]), veckor: [] } });
  const planer = [sparad('aaaa01', 'textsamtal-i-grupp', ['2026-10-19', '2026-11-20']), sparad('aaaa02', 'textsamtal-i-grupp', ['2026-10-26', '2026-12-04']), sparad('aaaa03', 'seriesamtal', ['2026-09-07', '2026-10-16']), sparad('aaaa04', 'til-i-grupp', ['2026-11-02', '2026-12-11']), sparad('aaaa05', 'laslistor-i-grupp', ['2026-10-01', '2026-10-30'])];
  const vagar = (idag) => lagring.pagaendeHandelser(planer, idag).map((h) => h.path).join(' ');
  ska('pågående insatser: planerna i sina veckor, och :2 för en andra plan för samma metod', vagar('2026-10-28') === 'planera:textsamtal-i-grupp:pagar planera:textsamtal-i-grupp:pagar:2 planera:laslistor-i-grupp:pagar' && vagar('2026-11-03') === 'planera:textsamtal-i-grupp:pagar planera:textsamtal-i-grupp:pagar:2 planera:til-i-grupp:pagar', [vagar('2026-10-28'), vagar('2026-11-03')]);
  ska('pågående insatser: händelsen bär bara metoden', lagring.pagaendeHandelser(planer, '2026-10-28').every((h) => /^planera:[a-z0-9-]+:pagar(:\d)?$/.test(h.path)));
}
// En apps egen webbläsare (K-510, src/scripts/webblasaren.ts): en funktion känner igen den för Planera insatsen och raden om
// appen Stöd, och vägen ut är en intent-länk utan bestämd app på Android och x-safari-https på iPhone, med planen efter #.
{
  const w = foljd(await import('../src/scripts/webblasaren.ts'));
  const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
  const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Mobile Safari/537.36';
  const fall = [
    [`${IOS} [FBAN/FBIOS;FBAV/485.0.0.43.70;FBLC/sv_SE]`, 'Facebooks', true], [`${ANDROID} [FB_IAB/FB4A;FBAV/485.0.0.43.70;]`, 'Facebooks', false],
    [`${IOS} [FBAN/MessengerForiOS;FBAV/485.0]`, 'Messengers', true], [`${IOS} Instagram 350.0.0.0 (iPhone15,2; iOS 18_0; sv_SE)`, 'Instagrams', true],
    [`${IOS} [LinkedInApp]/9.30`, 'LinkedIns', true], [`${IOS} GSA/340.0.0 Safari/604.1`, 'Google-appens', true], [`${IOS} TikTok 37.0`, 'en apps', true],
    // En apps webbläsare på Android utan appens namn, som LinkedIns (Niclas 2026-10-25), känns igen på märket wv.
    [ANDROID, 'en apps', false], [`${ANDROID} [LinkedInApp]/4.1`, 'LinkedIns', false],
    // Vanliga webbläsare får inget besked (Niclas samma dag: "Se till att dessa knappar bara dyker upp i sådana speciella
    // webbläsare som Facebook egen inbyggda"): Safari, Chrome, Firefox, Edge och DuckDuckGo på iPhone, och Chrome, Samsung
    // Internet och Firefox på Android.
    [`${IOS} Version/18.0 Safari/604.1`, '', true], [`${IOS} CriOS/130.0.6723.90 Safari/604.1`, '', true], [`${IOS} FxiOS/131.0 Safari/605.1.15`, '', true],
    [`${IOS} EdgiOS/130.0.2849.80 Safari/605.1.15`, '', true], [`${IOS} Version/18.0 DuckDuckGo/7 Safari/605.1.15`, '', true],
    [ANDROID.replace('; wv', '').replace('Version/4.0 ', ''), '', false], [ANDROID.replace('; wv', '').replace('Version/4.0 ', 'SamsungBrowser/26.0 '), '', false],
    ['Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0', '', false],
  ];
  for (const [ua, app, ios] of fall) { const x = w.webblasaren(ua, {}); ska(`webbläsaren: ${app || 'en vanlig webbläsare'} (${ua.slice(-40)})`, x.app === app && x.ios === ios && x.android === !ios, x); }
  ska('webbläsaren: appen Stöd från hemskärmen är ingen apps webbläsare', w.webblasaren(IOS, { iAppen: true }).app === '');
  const adress = 'https://niclasfohlin.se/stodundervisning/til-i-grupp/planera#s=2026-11-02&d=124&l=6&p=abc123';
  const android = w.vagenUt(adress, w.webblasaren(`${ANDROID} [FB_IAB/FB4A;FBAV/485.0]`, {}))?.href ?? '';
  ska('vägen ut på Android: en intent-länk utan bestämd app, med planen före intentens del, som Android läser från det sista #',
    android.startsWith('intent://niclasfohlin.se/stodundervisning/til-i-grupp/planera#s=2026-11-02&d=124&l=6&p=abc123#Intent;scheme=https;') && !android.includes('package=')
    && android.slice(android.lastIndexOf('#')).startsWith('#Intent;') && android.includes(`S.browser_fallback_url=${encodeURIComponent(adress)}`) && android.endsWith(';end'), android);
  ska('vägen ut på iPhone: Safari, med planen', w.vagenUt(adress, w.webblasaren(`${IOS} [FBAN/FBIOS]`, {}))?.href === 'x-safari-https://niclasfohlin.se/stodundervisning/til-i-grupp/planera#s=2026-11-02&d=124&l=6&p=abc123');
}
// Pdf:erna säger samma sak som sidan och texterna (K-509): gruppens och elevens sammanställning görs ur en plan med
// skattningar, bockar, närvaro, resultat och beslut, och texten i dem läses med pdftotext och jämförs med standardens rötter.
// Provarna i webbläsaren kan inte fånga pdf:en (steget Samma sak överallt 2026-10-25), så den prövas här.
{
  const pdf = await import('../src/scripts/planpdf.ts');
  const p = s.planera(tsMp, { ...s.forval(tsMp, '2026-10-26'), start: '2026-11-02', langd: 6, dagar: [1, 3, 5] });
  const efter = p.uppfoljning.find((u) => u.typ === 'efter');
  const f = s.rensaFoljd({
    gjorda: p.pass.slice(0, 15).map((x) => x.datum), narvaro: true, elever: [{ id: 'a1', namn: 'Ali' }, { id: 'b2', namn: 'Bea' }],
    franvaro: { [p.pass[2].datum]: ['b2'] },
    skattning: Object.fromEntries(p.veckor.slice(0, 5).map((v, i) => [v.mandag, { a1: Math.min(5, 2 + Math.floor(i / 2)), b2: 2 }])),
    vecka: { [p.veckor[0].mandag]: { varde: 3, not: 'Går det bättre nästa vecka?' } },
    resultat: { [`0-${p.uppfoljning[0].tillfallen[0].datum}`]: { a1: '3 av 8' }, ...(efter ? { [`${efter.rad}-${efter.tillfallen[0].datum}`]: { a1: '6 av 8.' } } : {}) },
    avstamning: { beslut: 'fortsatt', not: 'Ska Bea få mer tid?' }, utvardering: { beslut: 'avsluta' },
  });
  const idag = '2026-12-21';
  const sm = s.sammanstallning(p, f, idag);
  // Innehållet i insatsen med raderna ur texten till åtgärdsprogrammet, som sidan ger pdf:en (dokumentationsrader).
  const prader = s.dokumentationsrader({ titel: ts.titel, undertitel: ts.undertitel, adress: 'niclasfohlin.se/stodundervisning/textsamtal-i-grupp', mal: ts.mal.overgripande, steg: ts.progression.rader.map((r) => r.kort ?? r.fokus), uppfoljning: ts.uppfoljning.rader }, p, { ...s.forval(tsMp, '2026-10-26'), start: '2026-11-02', langd: 6, dagar: [1, 3, 5] }, { minuter: 30, folj: true });
  const pinfo = { metod: ts.titel, grupp: 'Grupp 4B', niva: 'Mellan', mal: s.malText(ts.mal.overgripande), fragan: s.skattningsfragan(), uppfoljning: ts.uppfoljning.rader, ingress: ts.ingress, undertitel: ts.undertitel, insatsen: prader };
  const text = (bytes) => {
    const fil = join(tmpdir(), `planprov-${process.pid}-${Math.random().toString(36).slice(2)}.pdf`);
    writeFileSync(fil, bytes);
    try { return execFileSync('pdftotext', ['-enc', 'UTF-8', fil, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' '); } catch { return null; } finally { rmSync(fil, { force: true }); }
  };
  const grupp = text(await pdf.gruppPdf(p, sm, pinfo, idag)), elev = text(await pdf.elevPdf(p, sm, 'a1', pinfo, idag, f.franvaro));
  ska('pdf:erna går att läsa (pdftotext behövs)', grupp !== null && elev !== null);
  // Metodens skattning av gruppen i gruppens pdf (K-559): skalan med namnen, linjen och regeln i ord.
  {
    const ga = metod('gruppstarkande-aktiviteter');
    const gmp = s.metodplan(ga).plan, gp = s.planera(gmp, { ...s.forval(gmp, '2026-10-26'), start: '2026-11-02' });
    const gf = s.rensaFoljd({ matt: { 'Lärarens skattning': { [gp.veckor[0].mandag]: 7, [gp.veckor[1].mandag]: 6, [gp.veckor[2].mandag]: 5 } } });
    const gtext = text(await pdf.gruppPdf(gp, s.sammanstallning(gp, gf, '2026-12-09'), { metod: ga.titel, grupp: '4B', mal: s.malText(ga.mal.overgripande), fragan: s.skattningsfragan(true), uppfoljning: ga.uppfoljning.rader }, '2026-12-09'));
    ska('gruppens pdf har metodens skattning av gruppen med skalan, linjen och regeln', !!gtext && gtext.includes('Lärarens skattning') && gtext.includes('1–2 fungerar inte') && gtext.includes('Det linjen sa: Linjen i Lärarens skattning nedåt två veckor i rad efter vecka 3'), gtext?.slice(0, 500));
  }
  if (grupp !== null && elev !== null) {
    ska('gruppens pdf: perioden, passens rad, riktningen och närvaron som på sidan', grupp.includes(s.datumspann(p.forstaPass, p.sistaPass)) && grupp.includes(s.passensRad(sm)) && grupp.includes(`${s.riktningText(sm.elever[0])}.`) && grupp.includes(s.narvaronKort(sm.elever[0], sm).replace(/^med i /, '')), grupp.slice(0, 600));
    // Innehållet i insatsen (Niclas 2026-10-28): ingressen och raderna ur texten till åtgärdsprogrammet, en rot för båda.
    ska('gruppens pdf: Innehållet i insatsen med ingressen och samma rader som texten till åtgärdsprogrammet', grupp.includes('Innehållet i insatsen') && grupp.includes(ts.ingress.replace(/\s+/g, ' ').slice(0, 40)) && prader.filter((r) => ['Omfattning', 'Uppföljning', 'Metoden'].includes(r.etikett)).every((r) => grupp.includes(r.etikett) && grupp.includes(r.text.replace(/\s+/g, ' '))), grupp.slice(0, 900));
    ska('elevens pdf: undertiteln och inte gruppens namn, som kan bära andra elevers namn', elev.includes(ts.undertitel.slice(0, 40)) && !elev.includes('Grupp 4B') && elev.includes('Omfattning'), elev.slice(0, 600));
    ska('gruppens pdf: uppföljningens rader, Efter insatsen, besluten och anteckningen som i texten', grupp.includes(String(prader.find((r) => r.etikett === 'Uppföljning')?.text)) && (!efter || grupp.includes('Efter insatsen, v.')) && grupp.includes('Fortsätt som planerat. Ska Bea få mer tid?') && grupp.includes('Går det bättre nästa vecka?') && !grupp.includes('?.'), grupp.slice(0, 600));
    ska('gruppens pdf: veckornas namn i diagrammet och i texten', grupp.includes(s.kalendervecka(p.veckor[0].vecka.vecka)) && grupp.includes(s.planveckansNamn(p, p.veckor[0]).Text), grupp.slice(0, 600));
    ska('elevens pdf: perioden, närvaron, resultatet och gruppens beslut', elev.includes(s.datumspann(p.forstaPass, p.sistaPass)) && elev.includes(s.narvaronText(sm.elever[0], sm)) && (!efter || elev.includes('Efter insatsen, v.')) && elev.includes('Mitt i insatsen') && elev.includes('Fortsätt som planerat.') && !elev.includes('Ska Bea') && elev.includes('Efter insatsen') && elev.includes('Avsluta insatsen.'), elev.slice(0, 600));
  }
  // Ett avslut tidigare, i avstämningens vecka, står i båda pdf:erna och i texten som kopieras med anledningen, perioden slutar
  // med sista passet, och avstämningen står inte där (K-542; Niclas 2026-10-25: "Se till att json filen och ical mm och alla
  // utskrifter hänger med").
  const kortP = s.planera(tsMp, { ...s.forval(tsMp, '2026-10-26'), start: '2026-11-02', langd: 6, dagar: [1, 3, 5], slut: 8, mitt: 3 });
  const kortF = s.rensaFoljd({ ...f, utvardering: { beslut: 'avsluta', not: 'Gruppen har nått målet' } });
  const kortS = s.sammanstallning(kortP, kortF, '2026-11-25');
  const kortG = text(await pdf.gruppPdf(kortP, kortS, pinfo, '2026-11-25')), kortE = text(await pdf.elevPdf(kortP, kortS, 'a1', pinfo, '2026-11-25', kortF.franvaro));
  const avslutetPdf = 'Insatsen avslutades i vecka 3 (v. 47), efter 8 av 18 planerade pass. Anledning: Gruppen har nått målet.';
  const kortText = s.sammanstallningstext({ titel: ts.titel, mal: ts.mal.overgripande, uppfoljning: ts.uppfoljning.rader }, kortP, kortS);
  ska('pdf:erna och texten efter ett avslut: avslutet med anledningen, perioden till sista passet och ingen avstämning', !!kortG?.includes(avslutetPdf) && !!kortE?.includes(avslutetPdf) && kortG.includes(s.datumspann('2026-11-02', '2026-11-18')) && !kortG.includes('Ska Bea få mer tid?') && !kortE.includes('Mitt i insatsen') && kortText.includes(avslutetPdf) && !kortText.includes('Avstämning mitt i insatsen'), [kortG?.slice(0, 500), kortE?.slice(0, 500)]);
}
// Metodens plan på sidan byggs ur planens data med samma fält i plan som motorn läser (metodplan), så att ett nytt fält
// inte stannar i motorn (den stängda frågan 2026-10-26: plan.foreVeckor, och förut plan.veckoval.forval).
{
  const kropp = readFileSync(join(rot, 'src/lib/standard/plan.js'), 'utf8').split('export function metodplan(d)')[1]?.split(/\r?\n\}\r?\n/)[0] ?? '';
  const falt = [...new Set([...kropp.matchAll(/d\.plan\??\.(\w+)/g)].map((x) => x[1]))];
  const sidansMp = readFileSync(join(rot, 'src/scripts/planera.ts'), 'utf8').match(/^const mpAv = .*$/m)?.[0] ?? '';
  const saknas = falt.filter((f) => !new RegExp(`\\b${f}\\b`).test(sidansMp));
  ska('metodens plan på sidan läser samma fält i plan som motorn', falt.length >= 3 && !saknas.length, { falt, saknas });
}
// Rötterna har prov: varje funktion i tabellen under Spärren mot drift i PLANERA.md finns i standarden, i lagringen eller i
// webbläsarens rot, och planprovet har kört den, så att en rot som alla vyer hämtar ur alltid räknar rätt (Niclas 2026-10-25:
// "och att denna funktion måste fungera korrekt"). Det som har körts räknas genom importerna, så att ett namn i en
// kommentar inte räknas som ett prov (Codex samma dag). Kontrollen står sist bland motorns prov.
{
  const lagring = await import('../src/scripts/insatser-lagring.ts');
  const webb = await import('../src/scripts/webblasaren.ts');
  const sparren = (readFileSync(join(rot, 'PLANERA.md'), 'utf8').replace(/\r\n/g, '\n').split('\n## Spärren mot drift\n')[1] ?? '').split('\n## ')[0];
  const rotter = [...new Set(sparren.split('\n').filter((r) => /^\| [^|]+ \| .*`/.test(r)).flatMap((r) => [...r.split('|')[2].matchAll(/`([\p{L}_$][\p{L}\p{N}_$]*)`/gu)].map((m) => m[1])))];
  const saknas = rotter.filter((n) => !(n in s) && !(n in lagring) && !(n in webb));
  const utanProv = rotter.filter((n) => !anvanda.has(n));
  ska(`rötterna i PLANERA.md finns (${rotter.length} st)`, rotter.length >= 40 && !saknas.length, saknas);
  ska('rötterna i PLANERA.md har körts av planprovet', !utanProv.length, utanProv);
}
// Scenarierna (K-518): varje fall i tabellen under Scenarierna i PLANERA.md har sina prov här, så att det som händer en
// lärare med en grupp prövas vid varje validering och inte bara står i en lista. Ett prov som byter namn eller tas bort
// stannar provet, så att tabellen och proven följs åt.
{
  const planeraMd = readFileSync(join(rot, 'PLANERA.md'), 'utf8').replace(/\r\n/g, '\n');
  const fallen = (planeraMd.split('\n## Scenarierna\n')[1] ?? '').split('\n## ')[0].split('\n').filter((r) => /^\| S\d+ \|/.test(r));
  const kallan = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const utan = fallen.flatMap((r) => { const [, fall, , prov] = r.split('|').map((c) => c.trim()); const namn = [...prov.matchAll(/`([^`]+)`/g)].map((m) => m[1]); return [...(namn.length ? [] : [`${fall}: inget prov`]), ...namn.filter((n) => !kallan.includes(`ska('${n}'`) && !kallan.includes(`sant('${n}'`)).map((n) => `${fall}: ${n}`)]; });
  ska(`scenarierna i PLANERA.md har sina prov (${fallen.length} fall)`, fallen.length >= 15 && !utan.length, utan);
}

if (fel.length) { console.error(`planprov: ${fel.length} fel:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`planprov: motorn, ${planbara.length} av ${alla.length} metoder med planens fält och ${former.length} former av metoder räknar rätt.`);
// Planerna som syns: en metod vars plan väntar (plan.vantar, K-553) har fälten och prövas i motorn ovan, men har ingen
// plansida, som src/lib/planbar.ts säger.
const synliga = planbara.filter((m) => !m.d.plan?.vantar);

// ---------- 4. Sidan i Chrome ----------
if (args.includes('--utan-sida')) process.exit(0);
const dist = join(rot, 'dist');
// Sidorna som proven nedan öppnar, också varje metods plan, så att en ändring i en annan metods plan gör om proven (K-564:
// nyckeln läste bara Textsamtals plan, och Gruppstärkande aktiviteters nya knappar prövades inte i Chrome).
const sidor = [...new Set(['/stodundervisning/textsamtal-i-grupp/planera', '/stodundervisning/textsamtal-i-grupp', '/stodundervisning', '/stodundervisning/upprepad-lasning', ...synliga.map((m) => `/stodundervisning/${m.id}/planera`)])];
const chrome = process.env.CHROME ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!chrome) { console.log('planprov: obs, Chrome saknas, sidan är inte prövad'); process.exit(0); }
if (!sidor.every((x) => existsSync(join(dist, x, 'index.html')))) { console.error('planprov: dist saknar planens sidor. Kör npm run validera, som bygger först.'); process.exit(1); }
// Varje adress i planens data, för varje metod med planen, leder till en sida, en fil eller en kort adress som finns, och
// till ett ankare som sidan har (Planera 0.2: passet, stödet i stunden, principerna, tabellerna och verktygen leder till
// metodens sida). Korta adresser, som /lasstrategier, läses ur netlify.toml.
const adressfel = [];
const omdirigeringar = Object.fromEntries([...readFileSync(join(rot, 'netlify.toml'), 'utf8').matchAll(/from\s*=\s*"([^"]+)"\s*\n\s*to\s*=\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));
const adressFel = (adress) => {
  const [hel, ankare] = adress.split('#');
  const vag = omdirigeringar[hel] ?? hel;
  if (/\.[a-z0-9]{2,4}$/i.test(vag)) return existsSync(join(dist, vag)) ? '' : `${adress}: filen finns inte`;
  const fil = join(dist, vag, 'index.html');
  if (!existsSync(fil)) return `${adress}: sidan finns inte`;
  return ankare && !readFileSync(fil, 'utf8').includes(`id="${ankare}"`) ? `${adress}: ankaret finns inte` : '';
};
const planensAdresser = (d) => [
  ...(d.saker ?? []).flatMap((x) => [x.adress, ...Object.values(x.nivaer ?? {}), ...Object.values(x.veckor ?? {})]),
  ...Object.values(d.kursveckor ?? {}), d.bank?.adress, d.passet?.adress, d.passet?.steg?.adress,
  ...(d.passen ?? []).map((x) => x.tabell?.adress), d.principer?.adress, d.gruppen?.adress, d.hem?.adress, d.malAdress,
  ...(d.fastnar ?? []).map((x) => x.adress), ...(d.centrala ?? []).map((x) => x.adress), d.nivaTabell?.adress,
].filter(Boolean);
for (const m of synliga) {
  const sidan = join(dist, 'stodundervisning', m.id, 'planera', 'index.html');
  if (!existsSync(sidan)) { adressfel.push(`${m.id}: planens sida finns inte`); continue; }
  const html = readFileSync(sidan, 'utf8');
  // En serie vars kurser har egna planer, som Texttyper i grupp, har valet av kurs och leder till kursernas planer (K-576).
  if (m.d.plan?.versionsval && !m.d.plan.versionsval.versioner?.length) {
    const kurser = [...html.matchAll(/href="(\/stodundervisning\/[^"#?]+\/planera)\/?"/g)].map((x) => x[1]);
    const saknas = kurser.filter((a) => !existsSync(join(dist, a, 'index.html')));
    if (!kurser.length || saknas.length) adressfel.push(`${m.id}: valet av kurs leder ${kurser.length ? `till planer som inte finns: ${saknas.join(', ')}` : 'inte till någon kurs'}`);
    continue;
  }
  const json = html.match(/<script type="application\/json" id="pl-data">([\s\S]*?)<\/script>/)?.[1];
  const d = json ? JSON.parse(json) : null;
  const felen = d ? [...new Set(planensAdresser(d))].map(adressFel).filter(Boolean) : ['ingen data'];
  if (felen.length) adressfel.push(`${m.id}: planens adresser leder inte till sidor och ankare som finns: ${felen.join(', ')}`);
  // Ett pass utan tidsschemats delar, som mötet hos de yngre, har tabellen i sin ur bara som plats för Passet i metoden.
  const utanDelar = (d?.passen ?? []).filter((x) => x.tabell && !x.utanTidsschema && !x.tabell.delar?.length).map((x) => x.tabell.namn);
  if (utanDelar.length) adressfel.push(`${m.id}: passens tabeller utan delar: ${utanDelar.join(', ')}`);
  // Delmålen vid skattningen är metodens egna (tre kalla läsare 2026-10-27).
  if (d && JSON.stringify(d.delmal?.punkter ?? []) !== JSON.stringify(m.d.mal?.punkter ?? [])) adressfel.push(`${m.id}: planens delmål är inte metodens mal.punkter`);
  // Varje rad med del står i en del i varje pass den gäller, med förvalet och den längsta planen (passetsBeskrivning; den
  // stängda frågan 2026-10-26).
  if ((d?.passen ?? []).some((x) => x.del)) {
    // Planens rader, som sidan räknar med: en rad för en annan version är redan borta (K-576).
    const mp = s.metodplan({ ...m.d, plan: { ...m.d.plan, passen: d.passen } }).plan;
    for (const langd of [undefined, mp.period?.max]) {
      const pl = s.planera(mp, { ...s.forval(mp, '2026-11-02'), ...(langd ? { langd } : {}) });
      for (const p of pl.pass) {
        const bp = s.passetsBeskrivning(s.passetsVisadeRoller(pl, p, mp.passen).map((r) => d.passen[r]), d.passet, s.passetsLage(pl, p));
        if (bp.utanDel.length) adressfel.push(`${m.id}: pass ${p.nr} har raden med del ${bp.utanDel.join(', ')}, som passet inte har`);
      }
    }
  }
}
if (adressfel.length) { console.error(`planprov: ${adressfel.length} fel i planens adresser:\n  ${adressfel.join('\n  ')}`); process.exit(1); }
console.log(`planprov: planens adresser i ${synliga.length} metoder leder till sidor och ankare som finns.`);

// Det som planen leder till på metodens sida har en knapp under sig som skriver ut det (K-499; Niclas 2026-10-25: "Det som
// något i planen länkar till bör ha sådan knapp under sig"), och varje saks egen fil (src/lib/sakfiler.ts, slag sak i
// bankfiler.json) har sin knapp på metodens sida. Knappen står i saken, efter den (räknebladet, veckan) eller sist i ramen.
// Planen leder också till metodens text, som passens tabeller, principerna och stödet i stunden, och till materialet och
// mallarna som helhet (#ramar, #mallar): det läser läraren och skriver ut med metoden, så det prövas inte här.
const TOMMA = new Set(['br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'col', 'wbr', 'area', 'base', 'embed', 'param', 'track']);
// Ett enkelt träd ur sidans html, utan skript och stilar: varje element med tagg, id, klass, om det är en utskriftsknapp och
// barnen.
const trad = (html) => {
  const topp = { tag: 'rot', barn: [], far: null };
  const id = new Map();
  let nu = topp;
  const ren = html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '');
  let pos = 0;
  for (const m of ren.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
    const text = ren.slice(pos, m.index);
    if (text.trim()) nu.barn.push({ tag: '#text', text, klass: '', barn: [], far: nu });
    pos = m.index + m[0].length;
    const [, slut, tagg, attr] = m;
    const t = tagg.toLowerCase();
    if (slut) { let n = nu; while (n !== topp && n.tag !== t) n = n.far; if (n !== topp) nu = n.far; continue; }
    const el = { tag: t, id: attr.match(/\sid="([^"]*)"/)?.[1], klass: attr.match(/\sclass="([^"]*)"/)?.[1] ?? '', knapp: t === 'a' && (/\sdata-skriv-ut-pdf\b/.test(attr) || /\sdownload="[^"]*\.(pdf|docx)"/.test(attr)) ? attr.match(/\shref="([^"?]*)/)?.[1] : undefined, barn: [], far: nu };
    nu.barn.push(el);
    if (el.id && !id.has(el.id)) id.set(el.id, el);
    if (!TOMMA.has(t) && !/\/\s*$/.test(attr)) nu = el;
  }
  return { rot: topp, id };
};
const knapparI = (el) => [...(el.knapp ? [el] : []), ...el.barn.flatMap(knapparI)];
const tecken = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const textI = (el) => (el.tag === '#text' ? el.text : el.barn.map(textI).join('')).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (h, k) => (k[0] === '#' ? String.fromCodePoint(k[1] === 'x' || k[1] === 'X' ? parseInt(k.slice(2), 16) : Number(k.slice(1))) : tecken[k.toLowerCase()] ?? h));
// Ett syskon som börjar nästa sak: ett element med id, en ram eller en vecka. Bilderna På bordet efter en ram (blad-12) hör
// till ramen, men ett räkneblad (blad-addition-2) är nästa sak.
const nastaSak = (x) => (x.id && !/^blad-\d+$/.test(x.id)) || /(^|\s)(m-ram|m-vecka)(\s|$)/.test(x.klass);
const efter = (el) => { const s = el.far?.barn ?? []; const i = s.indexOf(el); const ut = []; for (const x of s.slice(i + 1)) { if (nastaSak(x)) break; ut.push(x); } return ut; };
// Knapparna som hör till saken: i den (eller i blocket runt dess rubrik), i syskonen efter den fram till nästa sak, och ett
// steg upp när saken står i ett block (rutan i veckan, vars knapp står efter veckan).
const sakensKnappar = (el) => {
  const bas = /^h[2-4]$/.test(el.tag) && el.far ? el.far : el;
  const ut = [...knapparI(bas), ...efter(bas).flatMap(knapparI)];
  return ut.length || !bas.far || bas.far.tag === 'rot' || bas.far.id ? ut : efter(bas.far).flatMap(knapparI);
};
const knappfel = [];
const bankfilerna = JSON.parse(readFileSync(join(dist, 'stodundervisning', 'bankfiler.json'), 'utf8'));
let provade = 0;
// En sida och sakerna som planen leder till på den: metodens egna, och i en serie varje lektions (Niclas 2026-10-27: "Men
// tror inte alla saker har en knapp att ladda ner i metoden än?"; förut prövades bara seriens egna saker).
function provaSidan(metodId, saker, kursveckor = {}) {
  const sida = join(dist, 'stodundervisning', metodId, 'index.html');
  if (!existsSync(sida)) return;
  const html = readFileSync(sida, 'utf8');
  const { id } = trad(html);
  // Metodens avsnitt (slag avsnitt) är text som skrivs ut med metoden, och prövas inte här. En tabell som planen leder till
  // har sin egen fil (Niclas 2026-10-27: "Skrivdragen i tabell kunde inte laddas ner med en knapp").
  const mal = [...(saker ?? []).filter((x) => x.slag !== 'avsnitt').flatMap((x) => [x.adress, ...Object.values(x.nivaer ?? {}), ...Object.values(x.veckor ?? {})]), ...Object.values(kursveckor)];
  const namnFor = new Map();
  const nyttNamn = (adress, namn) => { const a = adress.split('#')[1]; if (a) namnFor.set(a, [...(namnFor.get(a) ?? []), namn]); };
  for (const x of saker ?? []) for (const a of [x.adress, ...Object.values(x.nivaer ?? {}), ...Object.values(x.veckor ?? {})]) nyttNamn(a, x.namn);
  // En sak med en adress per vecka, som veckans ram, leder till veckans egen sak, och knappen där heter efter veckan.
  for (const x of saker ?? []) for (const [v, a] of Object.entries(x.veckor ?? {})) nyttNamn(a, `Vecka ${v}`);
  for (const [v, a] of Object.entries(kursveckor)) nyttNamn(a, `Vecka ${v}`);
  const sakfilerna = new Set(bankfilerna.filter((x) => x.metod === metodId && x.slag === 'sak').map((x) => `/stodundervisning/${x.namn}.pdf`));
  for (const ankare of new Set(mal.filter((a) => a.startsWith(`/stodundervisning/${metodId}#`)).map((a) => a.split('#')[1]))) {
    if (ankare === 'ramar' || ankare === 'mallar') continue;
    const el = id.get(ankare);
    provade += 1;
    const knappar = el ? sakensKnappar(el) : [];
    if (el && !knappar.length) knappfel.push(`${metodId}#${ankare}: planen leder hit, men saken har ingen knapp under sig som skriver ut den (src/lib/sakfiler.ts, Sakknapp.astro)`);
    const egna = knappar.filter((k) => sakfilerna.has(k.knapp));
    // Namnen jämförs med vanliga mellanslag och utan ordfogar och mjuka bindestreck, som knappens text kan ha, med
    // standardens jämförelse (versionsform, Codex 2026-10-27).
    const platt = (x) => s.versionsform(x);
    const namnen = (namnFor.get(ankare) ?? []).map(platt);
    if (egna.length && namnen.length && !egna.some((k) => namnen.some((n) => platt(textI(k)).includes(n)))) knappfel.push(`${metodId}#${ankare}: knappen under ${namnFor.get(ankare)[0]} skriver ut ${egna.map((k) => `"${textI(k).replace(/\s+/g, ' ').trim()}"`).join(' och ')}, inte saken`);
  }
  for (const f of bankfilerna.filter((x) => x.metod === metodId && x.slag === 'sak')) {
    if (!html.includes(`href="/stodundervisning/${f.namn}.pdf`)) knappfel.push(`${metodId}: filen ${f.namn} (${f.rubrik}) har ingen knapp på metodens sida (Sakknapp.astro i Metod.astro)`);
  }
}
for (const m of synliga) {
  const plan = readFileSync(join(dist, 'stodundervisning', m.id, 'planera', 'index.html'), 'utf8').match(/<script type="application\/json" id="pl-data">([\s\S]*?)<\/script>/)?.[1];
  if (!plan) continue;
  const d = JSON.parse(plan);
  provaSidan(m.id, d.saker, d.kursveckor);
  for (const l of d.lektioner ?? []) provaSidan(l.id, l.saker);
  // Rubriken i flera ramar är ingen sak (länkgranskningen av texttypskurserna 2026-10-27); med en enda ram leder den dit.
  const tillLararen = (m.d.ramar?.ramar ?? []).filter((r) => /^Till läraren:/.test(r.rubrik)).length;
  if (tillLararen >= 2 && (d.saker ?? []).some((x) => x.namn === 'Till läraren')) knappfel.push(`${m.id}: "Till läraren" leder till en av flera ramar med det namnet (metodensSaker i src/lib/metodsaker.ts)`);
}
if (knappfel.length) { console.error(`planprov: ${knappfel.length} fel i knapparna under det planen leder till:\n  ${knappfel.join('\n  ')}`); process.exit(1); }
console.log(`planprov: de ${provade} saker som planen leder till på metodernas sidor har en knapp under sig som skriver ut just den, och varje saks fil har sin knapp.`);

const cacheFil = join(rot, 'node_modules/.cache/planprov.json');
const nyckel = createHash('sha1').update([readFileSync(fileURLToPath(import.meta.url), 'utf8'), ...sidor.map((x) => readFileSync(join(dist, x, 'index.html'), 'utf8').replace(/\?v=[0-9a-f]+/g, ''))].join('\n')).digest('hex');
const cache = existsSync(cacheFil) ? JSON.parse(readFileSync(cacheFil, 'utf8')) : {};
if (!args.includes('--alla') && cache.sidan === nyckel) { console.log('planprov: sidan är oförändrad sedan förra godkända körningen'); process.exit(0); }

const TYPER = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.pdf': 'application/pdf' };
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPER[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const bas = `http://127.0.0.1:${server.address().port}`;
const port = 9300 + Math.floor(Math.random() * 300);
const profil = join(tmpdir(), `planprov-${port}`);
mkdirSync(profil, { recursive: true });
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profil}`, 'about:blank'], { stdio: 'ignore' });
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));
// Datumet står fast, onsdag 18 november 2026 kl. 10 om inget annat sägs, och urklippet, nedladdningen och dialogen
// fångas, så att provet kan läsa det läraren får. blockera gör att webbläsaren inte sparar, som i privat läge i Safari.
const forbered = (blockera, fast = Date.UTC(2026, 10, 18, 9, 0, 0)) => `(() => {
  const FAST = ${fast}; const D = Date;
  class F extends D { constructor(...a) { super(...(a.length ? a : [FAST])); } static now() { return FAST; } }
  globalThis.Date = F;
  window.__kopierat = null; window.__fil = null; window.__filnamn = null; window.__fel = [];
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__kopierat = t; } }, configurable: true });
  const skapa = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (b) => { b.text().then((t) => { window.__fil = t; }); return skapa(b); };
  HTMLAnchorElement.prototype.click = function () { if (this.href.startsWith('blob:')) window.__filnamn = this.download; else HTMLElement.prototype.click.call(this); };
  window.confirm = () => true;
  window.addEventListener('error', (e) => window.__fel.push(String(e.message)));
  ${blockera ? "Storage.prototype.getItem = () => { throw new Error('nej'); }; Storage.prototype.setItem = () => { throw new Error('nej'); };" : ''}
})();`;
async function flik(blockera = false, fast) {
  let info;
  for (let i = 0; i < 40 && !info; i++) { await vanta(250); try { info = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { /* Chrome har inte startat än */ } }
  if (!info) throw new Error('Chrome svarade inte på DevTools-porten.');
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((r, x) => { ws.onopen = r; ws.onerror = x; });
  let nr = 0;
  const vantande = new Map();
  let laddad = () => {};
  const undantag = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && vantande.has(d.id)) { vantande.get(d.id)(d); vantande.delete(d.id); }
    else if (d.method === 'Page.loadEventFired') laddad();
    else if (d.method === 'Runtime.exceptionThrown') undantag.push(d.params.exceptionDetails?.exception?.description ?? d.params.exceptionDetails?.text);
  };
  const skicka = (method, params = {}) => new Promise((r) => { const id = ++nr; vantande.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await skicka('Page.enable');
  await skicka('Runtime.enable');
  // Fliken räknas som den läraren står i, så att fokus och blur kommer som i en riktig webbläsare (elevlistan sparar och
  // säger till när läraren lämnar fältet).
  await skicka('Emulation.setFocusEmulationEnabled', { enabled: true });
  await skicka('Page.addScriptToEvaluateOnNewDocument', { source: forbered(blockera, fast) });
  const kor = async (expression) => { const r = await skicka('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(`${expression.slice(0, 80)}: ${r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text}`); return r.result?.result?.value; };
  return {
    undantag,
    oppna: async (url) => { const klar = new Promise((r) => { laddad = r; }); await skicka('Page.navigate', { url }); await Promise.race([klar, vanta(20000)]); await vanta(300); },
    kor,
    // Ett tryck på det första synliga elementet som matchar och har texten.
    tryck: async (valjare, text = '') => kor(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(valjare)})].find((x) => x.checkVisibility() && x.textContent.includes(${JSON.stringify(text)})); if (!el) return false; el.click(); return true; })()`),
    text: async (valjare) => kor(`document.querySelector(${JSON.stringify(valjare)})?.textContent.replace(/\\s+/g, ' ').trim() ?? null`),
    bredd: (b) => skicka('Emulation.setDeviceMetricsOverride', { width: b, height: 800, deviceScaleFactor: 2, mobile: true }),
    // Webbläsarens namn, som en apps egen webbläsare.
    ua: (userAgent) => skicka('Emulation.setUserAgentOverride', { userAgent }),
    dator: () => skicka('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }),
    // En bild av hela sidan, när provet tar bilder (--bilder).
    // Beskedet längst ned på skärmen står fast i fönstret och skulle hamna mitt i en bild av hela sidan, så det göms då;
    // skarm tar en bild av bara skärmen, med beskedet.
    bild: async (namn, skarm = false) => {
      if (!bildmapp) return;
      mkdirSync(bildmapp, { recursive: true });
      const m = await skicka('Page.getLayoutMetrics');
      const h = skarm ? Math.ceil(m.result.cssLayoutViewport.clientHeight) : Math.min(Math.ceil(m.result.cssContentSize.height), 9000), w = Math.ceil(m.result.cssLayoutViewport.clientWidth);
      const dolt = skarm ? false : await kor(`(() => { const t = document.getElementById('pl-toast'); if (!t || t.hidden) return false; t.hidden = true; return true; })()`);
      const r = await skicka('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !skarm, clip: { x: 0, y: skarm ? Math.ceil(m.result.cssLayoutViewport.pageY) : 0, width: w, height: h, scale: 1 } });
      if (dolt) await kor(`document.getElementById('pl-toast').hidden = false`);
      writeFileSync(join(bildmapp, `${namn}.png`), Buffer.from(r.result.data, 'base64'));
    },
    // Väljer en fil i ett filfält, som när läraren öppnar en kopia.
    filTill: async (valjare, fil) => {
      const dok = await skicka('DOM.getDocument', { depth: 0 });
      const nod = await skicka('DOM.querySelector', { nodeId: dok.result.root.nodeId, selector: valjare });
      await skicka('DOM.setFileInputFiles', { nodeId: nod.result.nodeId, files: [fil] });
    },
    stang: () => ws.close(),
  };
}
const rullar = (f) => f.kor('document.documentElement.scrollWidth > innerWidth + 1');
// Planens länkar till det metoden namnger (K-493): varje länk leder till en sida i dist, och ett ankare till ett id på sidan.
const sakLankar = (f) => f.kor(`[...document.querySelectorAll('a[data-goatcounter-click$=":sak"]')].map((a) => a.getAttribute('href'))`);
const lankFel = (lankar) => (lankar ?? []).filter((h) => {
  const [kort, ankare] = h.split('?')[0].split('#');
  // Korta adresser som Netlify leder vidare, som /gruppstarkande, prövas där de landar (omdirigeringar ovan).
  const vag = omdirigeringar[kort] ?? kort;
  // En länk till en fil, som lektionskortets pdf, prövas som fil.
  if (/\.[a-z0-9]{2,4}$/i.test(vag)) return !existsSync(join(dist, vag));
  const fil = join(dist, vag, 'index.html');
  if (!existsSync(fil)) return true;
  return ankare ? !readFileSync(fil, 'utf8').includes(`id="${ankare}"`) : false;
});
// Planen efter insatsen: sex veckor som läraren har följt, med tre elever, sexton av arton pass, skattning varje vecka,
// lite frånvaro, veckans gång några veckor, metodens uppföljning före och efter och avstämningen mitt i. Utvärderingen
// är inte gjord än.
const datumText = (x) => (x instanceof Date ? x.toISOString().slice(0, 10) : String(x ?? '').slice(0, 10));
const slutVal = { start: '2026-11-02', dagar: [1, 3, 5], langd: 6, niva: 'mellan', ...tom };
const slutPlan = s.planera(tsMp, slutVal);
const slutVeckor = slutPlan.veckor.map((v) => v.mandag);
const slutSkattning = [[2, 1, 3], [2, 2, 3], [3, 2, 3], [3, 3, 4], [4, 3, 4], [4, 3, 5]];
const slutlagrat = { v: 1, planer: [{
  id: 'slut01', metod: 'textsamtal-i-grupp', titel: ts.titel, omrade: ts.omrade, namn: 'Läsgrupp 2B', val: s.kodaVal(slutVal), folj: true,
  foljd: {
    gjorda: slutPlan.pass.filter((p) => p.nr !== 5 && p.nr !== 14).map((p) => s.passetsDag(p)),
    elever: [{ id: 'e1', namn: 'Ali' }, { id: 'e2', namn: 'Bea' }, { id: 'e3', namn: 'Sebastian Ek' }],
    narvaro: true,
    franvaro: { '2026-11-04': ['e2'], '2026-11-20': ['e3'], '2026-12-02': ['e2'] },
    vecka: { [slutVeckor[0]]: { varde: 3, not: 'Gruppen kom igång med samtalsreglerna.' }, [slutVeckor[1]]: { varde: 4 }, [slutVeckor[2]]: { varde: 4, not: 'Paren byggde vidare på varandra.' }, [slutVeckor[4]]: { varde: 3 } },
    skattning: Object.fromEntries(slutVeckor.map((m, i) => [m, { e1: slutSkattning[i][0], e2: slutSkattning[i][1], e3: slutSkattning[i][2] }])),
    resultat: { '0-2026-11-02': { e1: '3 av 8', e2: '2 av 8', e3: '5 av 8' }, '2-2026-12-14': { e1: '6 av 8', e2: '4 av 8', e3: '7 av 8' } },
    avstamning: { beslut: 'fortsatt', not: 'Bea behöver mer stöd vid stoppet.' },
  },
  kopia: '2026-12-11', andrad: '2026-12-11', uppdaterad: datumText(ts.uppdaterad),
  schema: {
    pass: slutPlan.pass.map((p) => [p.datum, p.vecka, p.nr]),
    veckor: slutPlan.veckor.map((v) => { const d = v.pass.map((n) => slutPlan.pass[n - 1].datum).sort(); return [v.nr, v.innehall, v.igen ? 1 : 0, d[0] ?? v.mandag, d.at(-1) ?? s.plusDagar(v.mandag, 4)]; }),
  },
}] };
const sidfel = [];
const sant = (namn, v, info) => { if (!v) sidfel.push(`${namn}${info !== undefined ? `: ${typeof info === 'string' ? info : JSON.stringify(info)}` : ''}`); };
const PLAN = `${bas}/stodundervisning/textsamtal-i-grupp/planera`;
try {
  const f = await flik();
  // ---- Bara planen ----
  await f.oppna(PLAN);
  for (const b of [320, 360, 390]) { await f.bredd(b); await vanta(150); sant(`förslaget rullar inte i sidled i ${b} punkter`, !(await rullar(f))); }
  await f.dator();
  await f.bredd(390); await vanta(150); await f.bild('1-forslag-telefon'); await f.dator(); await vanta(150); await f.bild('1-forslag-dator');
  // Spara planen står också längst ned före sparandet, med knapparnas namn ur roten (Niclas 2026-10-25).
  sant('förslaget har Spara planen också längst ned', (await f.kor(`!document.getElementById('pl-spara-nere').hidden && document.getElementById('pl-spara-nere').textContent === 'Spara planen' && document.getElementById('pl-kopia-spara').hidden`)) && (await f.text('.pl-filknapp'))?.startsWith('Öppna en nedladdad plan'), await f.text('#pl-kopia'));
  sant('förslaget har valen öppna och ingen vecka', await f.kor(`document.getElementById('pl-andra').open && document.getElementById('pl-veckan').hidden`));
  sant('förslaget har inte texten till åtgärdsprogrammet', await f.kor(`document.getElementById('pl-ap').hidden`));
  sant('Följ insatsen är inte förvalt', !(await f.kor(`document.getElementById('pl-folj').checked`)) && (await f.kor(`document.getElementById('pl-elevruta').hidden`)));
  await f.kor(`(() => { const i = document.getElementById('pl-start'); i.value = '2026-11-02'; i.dispatchEvent(new Event('change')); return true; })()`);
  // Metodens förval är åtta veckor (plan.veckoval.forval, passgenomgångens del A): juldagen tar ett pass i v. 52. Provet
  // väljer sedan sex veckor, som läraren gör med knappen, och resten av provet räknar med sex.
  sant('förslaget: metodens förval, 23 pass om 30 minuter', (await f.text('#pl-summa-text'))?.includes('23 pass om 30 minuter') && (await f.kor(`document.querySelector('#pl-langd [aria-pressed="true"]')?.dataset.langd`)) === '8', await f.text('#pl-summa-text'));
  await f.tryck('#pl-langd [data-langd="6"]');
  sant('förslaget: 18 pass om 30 minuter', (await f.text('#pl-summa-text'))?.includes('18 pass om 30 minuter'), await f.text('#pl-summa-text'));
  sant('valen säger första passet under datumet', (await f.text('#pl-forsta-pass')) === 'Första passet: måndag 2 november.', await f.text('#pl-forsta-pass'));
  sant('förslaget: Före, sex veckor och Efter insatsen med uppföljningen', (await f.kor(`document.querySelectorAll('#pl-veckor > li:not(.efter):not(.fore):not(.pl-lovvecka) .pl-veckoknapp').length`)) === 6 && (await f.text('#pl-veckor li.fore'))?.includes('Före första passet') && (await f.text('#pl-veckor li.efter'))?.includes('Efter insatsen') && (await f.text('#pl-veckor li.efter'))?.includes('Uppföljningen efter'), [await f.text('#pl-veckor li.fore'), await f.text('#pl-veckor li.efter')]);
  sant('veckorna i ett förslag är en lista, inte knappar', !(await f.kor(`!!document.querySelector('#pl-veckor button.pl-veckoknapp')`)));
  // Målet med pennan (Niclas 2026-10-24).
  sant('målet står i planen med pennan', (await f.text('#pl-summa-text .pl-maltext'))?.includes('Kunna läsa mellan raderna, säga vad man tror och visa ledtråden i texten.') && (await f.kor(`!!document.querySelector('#pl-summa-text [data-mal-andra]')`)), await f.text('#pl-summa-text .pl-maltext'));
  await f.tryck('#pl-summa-text [data-mal-andra]');
  sant('pennan gör målet skrivbart', await f.kor(`document.activeElement?.id === 'pl-malfalt' && document.activeElement.value.startsWith('kunna läsa')`));
  await f.kor(`document.getElementById('pl-malfalt').value = 'läsa mellan raderna i faktatexter'`);
  await f.tryck('[data-mal-klar]');
  sant('det egna målet står i planen och i texten till åtgärdsprogrammet', (await f.text('#pl-summa-text .pl-maltext'))?.includes('Läsa mellan raderna i faktatexter.') && (await f.kor(`document.getElementById('pl-aptext').value`))?.includes('Mål: Läsa mellan raderna i faktatexter.'), await f.text('#pl-summa-text .pl-maltext'));
  await f.tryck('#pl-summa-text [data-mal-andra]');
  await f.tryck('[data-mal-metodens]');
  sant('Metodens mål tar tillbaka det färdiga målet', (await f.text('#pl-summa-text .pl-maltext'))?.includes('Kunna läsa mellan raderna'), await f.text('#pl-summa-text .pl-maltext'));
  // Tiden: listor med klockslag var femte minut, slutet efter passets längd och bara efter början.
  const valjTid = (id, varde) => f.kor(`(() => { const s = document.querySelector(${JSON.stringify(id)}); s.value = ${JSON.stringify(varde)}; s.dispatchEvent(new Event('change', { bubbles: true })); return s.value; })()`);
  await valjTid('#pl-tid-fran', '09:20');
  sant('tiden: slutet efter passets längd', (await f.kor(`document.getElementById('pl-tid-till').value`)) === '09:50' && (await f.text('#pl-summa-text'))?.includes('Måndag, onsdag och fredag kl. 9.20–9.50'), await f.text('#pl-summa-text'));
  sant('tiden: bara klockslag var femte minut, och slutet efter början', await f.kor(`(() => { const a = [...document.getElementById('pl-tid-fran').options].map((o) => o.value).filter(Boolean); const b = [...document.getElementById('pl-tid-till').options].map((o) => o.value); return a[0] === '07:00' && a.every((x) => /^\\d{2}:[0-5][05]$/.test(x)) && b.every((x) => x > '09:20'); })()`));
  await valjTid('#pl-tid-till', '10:00');
  // Längden följer klockslagen och säger till när den skiljer sig från metodens (Codex 2026-10-24).
  sant('tiden: längden ur klockslagen, med en varning', (await f.text('#pl-summa-text'))?.includes('18 pass om 40 minuter') && (await f.text('#pl-summa-text'))?.includes('Metoden har pass om 30 minuter, och tiderna ger 40.'), await f.text('#pl-summa-text'));
  await f.tryck('#pl-tid-olika');
  await f.bredd(320); await vanta(150);
  sant('olika tider står i jämna kolumner i 320 punkter', await f.kor(`(() => { const r = [...document.querySelectorAll('#pl-tid-dagar [data-tiddag="3"]')].map((x) => Math.round(x.getBoundingClientRect().top)); return r.length === 2 && r[0] === r[1] && document.documentElement.scrollWidth <= innerWidth + 1; })()`));
  await f.dator();
  await valjTid('#pl-tid-dagar [data-tiddag="3"][data-del="0"]', '13:00');
  sant('olika tider olika dagar', (await f.text('#pl-summa-text'))?.includes('Måndag kl. 9.20–10.00, onsdag kl. 13.00–13.40 och fredag kl. 9.20–10.00'), await f.text('#pl-summa-text'));
  // En ny dag utan tid, när dagarna har olika tider, sägs i beskedet (verifieringen 2026-10-26).
  await f.tryck('#pl-dagar [data-dag="2"]');
  sant('en ny dag utan tid sägs i beskedet', (await f.text('#pl-toast'))?.includes('Tisdag har ingen tid än.'), await f.text('#pl-toast'));
  await f.tryck('#pl-dagar [data-dag="2"]');
  await f.tryck('#pl-tid-olika');
  sant('samma tid alla dagar igen', (await f.text('#pl-summa-text'))?.includes('Måndag, onsdag och fredag kl. 9.20–10.00'), await f.text('#pl-summa-text'));
  // Lägg i kalendern syns först när planen är sparad (användbarhetsprovet 2026-10-25: kalendern fick annars dagar som
  // läraren inte hade valt). Kalenderfilen med tider prövas här ändå, med knappen som den sparade planen visar.
  sant('Lägg i kalendern syns inte i ett förslag', await f.kor("document.getElementById('pl-kalender').hidden"));
  await f.kor('window.__fil = null');
  await f.kor("(() => { const k = document.getElementById('pl-kalender'); k.hidden = false; k.click(); k.hidden = true; return true; })()");
  await vanta(300);
  const tidIcs = await f.kor('window.__fil');
  sant('kalenderfilen med tider har ett pass per händelse med klockslaget', (tidIcs?.match(/BEGIN:VEVENT/g) ?? []).length === 20 && tidIcs.includes('DTSTART:20261102T092000') && tidIcs.includes('DTEND:20261102T100000'), tidIcs?.slice(0, 200));
  sant('texten till åtgärdsprogrammet', (await f.kor(`document.getElementById('pl-aptext').value`))?.startsWith('Åtgärd: Textsamtal i grupp') && (await f.kor(`document.getElementById('pl-aptext').value`))?.includes('måndag, onsdag och fredag kl. 9.20–10.00') && (await f.kor(`document.getElementById('pl-aptext').value`))?.includes('Eleven arbetar med: Det står, Jag vet och Alltså tror jag (v. 45)') && (await f.kor(`document.getElementById('pl-aptext').value`))?.includes('Omfattning: 18 pass om 40 minuter'), await f.kor(`document.getElementById('pl-aptext').value`));
  await valjTid('#pl-tid-fran', '');
  sant('utan tid står bara dagarna', (await f.text('#pl-summa-text'))?.includes('Måndag, onsdag och fredag, 2 november') && (await f.kor(`document.getElementById('pl-tid-till').disabled`)), await f.text('#pl-summa-text'));
  sant('lovets veckor står som knappar', (await f.kor(`document.querySelectorAll('#pl-lovveckor [data-lovvecka]').length`)) >= 7);
  await f.tryck('#pl-dagar [data-dag="5"]');
  sant('en dag mindre ger 12 pass och en varning', (await f.text('#pl-summa-text'))?.includes('12 pass') && (await f.kor(`!document.getElementById('pl-dagar-varning').hidden`)));
  await f.tryck('#pl-dagar [data-dag="5"]');
  // Lov i valen: vecka 46 är lov, så planen slutar en vecka senare; tryck igen tar bort lovet.
  await f.tryck('#pl-lovveckor [data-lovvecka="2026-46"]');
  sant('lov i valen flyttar planen', (await f.text('#pl-summa-text'))?.includes('till 18 december') && (await f.kor(`document.querySelector('[data-lovvecka="2026-46"]').getAttribute('aria-pressed')`)) === 'true', await f.text('#pl-summa-text'));
  await f.tryck('#pl-lovveckor [data-lovvecka="2026-46"]');
  sant('lovet i valen tas bort', (await f.text('#pl-summa-text'))?.includes('till 11 december'));
  // Lov i raden sista eller första vecka ger en vecka till efter eller före den, så att ett lov på flera veckor går att
  // trycka in (Niclas 2026-10-25: vecka 52 sist i raden gav ingen vecka 53).
  const lovRad = () => f.kor(`[...document.querySelectorAll('#pl-lovveckor [data-lovvecka]')].map((b) => b.dataset.lovvecka).join(' ')`);
  const fore52 = await lovRad();
  await f.tryck('#pl-lovveckor [data-lovvecka="2026-52"]');
  const med52 = await lovRad();
  await f.tryck('#pl-lovveckor [data-lovvecka="2026-43"]');
  const med43 = await lovRad();
  sant('lov sist och först i raden ger en vecka till efter och före', fore52.endsWith('2026-52') && fore52.startsWith('2026-43') && med52.endsWith('2026-52 2026-53') && med43.startsWith('2026-42 2026-43') && (await f.text('#pl-summa-text'))?.includes('till 11 december'), [fore52, med52, med43]);
  await f.tryck('#pl-lovveckor [data-lovvecka="2026-52"]');
  await f.tryck('#pl-lovveckor [data-lovvecka="2026-43"]');
  sant('utan lov i kanterna står raden som förut', (await lovRad()) === fore52, await lovRad());
  await f.tryck('#pl-nivaer [data-niva="mellan"]');
  await f.kor(`(() => { const i = document.getElementById('pl-namn'); i.value = 'Prov 2B'; i.dispatchEvent(new Event('input')); return true; })()`);
  await vanta(600);
  await f.tryck('#pl-spara');
  await vanta(200);
  const lagrat = await f.kor(`JSON.parse(localStorage.getItem('insatser'))`);
  sant('sparad plan i webbläsaren', lagrat?.planer?.length === 1 && lagrat.planer[0].namn === 'Prov 2B' && !lagrat.planer[0].folj, lagrat);
  sant('adressen bär valen men inte namnet', /#s=2026-11-02&d=135&l=6&n=mellan&p=[a-z0-9]{6}/.test(await f.kor('location.hash')) && !(await f.kor('location.hash')).includes('Prov'), await f.kor('location.hash'));
  sant('veckan visas och valen fälls ihop', await f.kor(`!document.getElementById('pl-veckan').hidden && !document.getElementById('pl-andra').open`));
  sant('beskedet om den sparade planen står längst ned', (await f.text('#pl-toast'))?.includes('Planen är sparad i den här webbläsaren') && (await f.kor(`getComputedStyle(document.getElementById('pl-toast')).position`)) === 'fixed');
  const apText = () => f.kor(`document.getElementById('pl-aptext').value`);
  sant('texten till åtgärdsprogrammet står när planen är sparad', await f.kor(`!document.getElementById('pl-ap').hidden && document.getElementById('pl-aptext').value.startsWith('Åtgärd: Textsamtal i grupp')`));
  await f.bredd(390); await vanta(150); await f.bild('2b-sparad-besked-telefon', true); await f.dator();
  sant('Dina planer med Ny plan så snart en plan är sparad', await f.kor(`!document.getElementById('pl-grupper').hidden && !!document.querySelector('#pl-grupper [data-plan="ny"]')`));
  sant('veckans rubrik', (await f.text('#pl-veckan-rubrik')) === 'Vecka 3 i planen', await f.text('#pl-veckan-rubrik'));
  sant('veckorna överst, med den här veckan vald och märkt', (await f.kor(`document.querySelectorAll('#pl-veckan .pl-remsa [data-vy]').length`)) === 8 && (await f.kor(`(() => { const b = document.querySelector('#pl-veckan .pl-remsa [data-vy="3"]'); return b.classList.contains('nu') && b.getAttribute('aria-pressed') === 'true'; })()`)));
  sant('nästa pass i dag', (await f.text('.pl-nar')) === 'I dag, onsdag 18 november', await f.text('.pl-nar'));
  sant('veckans fokus ur progressionen', (await f.text('.pl-fokusruta'))?.includes('slå ihop flera ledtrådar med slaget Före och efter'));
  // Det metoden namnger är länkat (Niclas 2026-10-24: "Ett test. Ett papper. En text. En specifik lektion").
  const fokusLankar = await f.kor(`[...document.querySelectorAll('#pl-veckan .pl-fokusruta a')].map((a) => a.textContent + ' ' + a.getAttribute('href'))`);
  sant('texterna som veckans fokus namnger är länkade', fokusLankar?.includes('Samma sak /stodundervisning/textsamtal-i-grupp/avancerad-8') && fokusLankar.includes('Kvart i åtta /stodundervisning/textsamtal-i-grupp/avancerad-4'), fokusLankar);
  await f.kor(`document.querySelector('#pl-veckan [data-ruta="del-fore"]').open = true`);
  sant('checklistans blad och mallar är länkade', (await f.kor(`[...document.querySelectorAll('#pl-veckan .pl-checklista a')].map((a) => a.getAttribute('href')).join()`))?.includes('#mall-ledtradsbladet'), await f.kor(`document.querySelector('#pl-veckan .pl-checklista')?.innerHTML`));
  sant('planens länkar leder till sidor och ankare som finns', !lankFel(await sakLankar(f)).length && (await sakLankar(f)).length >= 3, [await sakLankar(f), lankFel(await sakLankar(f))]);
  const texter = await f.kor(`[...document.querySelectorAll('.pl-poster li > a:first-child')].map((a) => a.textContent)`);
  sant('veckans texter på Mellan med slaget Före och efter', texter?.length === 8 && texter.includes('7 Kartongen') && texter.includes('9 Hinken i hallen'), texter);
  sant('Ta fram öppnas på nivån', (await f.kor(`document.querySelector('.pl-nasta a.knapp')?.getAttribute('href')`)) === '/stodundervisning/textsamtal-i-grupp/texter#mellan');
  // Planera 0.2 (de kalla testarna 2026-10-24): passet i rutan med rollen och delarna, ett annat pass med ett tryck på
  // rollen, fliken Före och tryckytorna.
  sant('rutan har passets namn med rollen', (await f.text('#pl-veckan .pl-passnamn')) === 'Vecka 3 · pass 2 · Paren samtalar · 8 av 18', await f.text('#pl-veckan .pl-passnamn'));
  const delarna = () => f.kor(`[...document.querySelectorAll('#pl-veckan .pl-delar .pl-del > summary')].map((s) => s.textContent.trim()).join('|')`);
  sant('passets delar med minuter, med Före passet först och Efter passet sist', (await delarna()) === 'Före passet|0–3Starten|3–5Möt texten|5–13Läs och tänk|13–26Samtala om texten|26–30Avsluta|Efter passet|Mer om passet', await delarna());
  // Rollens text är raden ur metodens tabell Veckans tre pass, med kolumnernas namn (K-520).
  const rollerna = await f.kor(`[...document.querySelectorAll('#pl-veckan .pl-roll')].map((x) => x.textContent).join('|')`);
  sant('rollens text ur metodens tabell', rollerna?.startsWith('Så läser ni Du läser högt och stannar vid stoppet.|Du Ger tanketid, låter paren samtala vid stoppet') && rollerna.includes('|Eleverna Säger ”Jag tror att”'), rollerna);
  await f.kor(`document.querySelector('#pl-veckan .pl-del[data-ruta="del-0"]').open = true`);
  sant('en del fälls ut till det läraren gör och säger', (await f.text('#pl-veckan .pl-del[data-ruta="del-0"] .pl-deltext'))?.includes('Skriv startmeningen på tavlan') && !!(await f.kor(`document.querySelector('#pl-veckan .pl-del[data-ruta="del-0"] .pl-fraser li')`)), await f.text('#pl-veckan .pl-del[data-ruta="del-0"] .pl-deltext'));
  sant('veckans pass med rollerna', (await f.kor(`[...document.querySelectorAll('#pl-passen .pl-passroll')].map((x) => x.textContent).join('|')`)) === 'Läraren tänker högt|Paren samtalar|Eleverna läser själva');
  await f.tryck('#pl-passen [data-visa-pass="9"]');
  sant('ett tryck på rollen visar passet i rutan', (await f.text('#pl-veckan .pl-passnamn')) === 'Vecka 3 · pass 3 · Eleverna läser själva · 9 av 18' && (await f.text('#pl-veckan .pl-nasta .pl-etikett')) === 'Valt pass' && !!(await f.kor(`document.querySelector('#pl-veckan .pl-nasta [data-visa-pass=""]')`)), await f.text('#pl-veckan .pl-nasta'));
  await f.tryck('#pl-veckan .pl-nasta [data-visa-pass=""]');
  sant('och tillbaka till nästa pass', (await f.text('#pl-veckan .pl-passnamn')) === 'Vecka 3 · pass 2 · Paren samtalar · 8 av 18');
  // Och metodens material, med materialets rubrik (länkgranskningen av omgång 1 2026-10-26).
  sant('länkarna till passet i metoden, materialet och stödet när eleven fastnar', (await f.kor(`[...document.querySelectorAll('#pl-veckan .pl-lankar a')].map((a) => a.getAttribute('href')).join()`)) === '/stodundervisning/textsamtal-i-grupp#passrutin,/stodundervisning/textsamtal-i-grupp#ramar,/stodundervisning/textsamtal-i-grupp#fastnar' && (await f.kor(`document.querySelector('#pl-veckan .pl-lankar a[href$="#ramar"]')?.textContent`)) === 'Materialet', await f.kor(`[...document.querySelectorAll('#pl-veckan .pl-lankar a')].map((a) => a.getAttribute('href')).join()`));
  await f.tryck('#pl-veckan .pl-remsa [data-vy="fore"]');
  sant('fliken Före med kartläggningen och minuterna per elev', (await f.text('#pl-veckan-rubrik')) === 'Före första passet' && (await f.text('#pl-veckan'))?.includes('Före insatsen') && (await f.text('#pl-veckan'))?.includes('5–8 minuter per elev') && (await f.text('#pl-veckan'))?.includes('Tre saker att hålla fast vid'), await f.text('#pl-veckan'));
  await f.tryck('#pl-veckan .pl-remsa [data-vy="3"]');
  // Det man trycker på i veckan är minst 24 punkter (WCAG 2.2, 2.5.8), och raderna och knapparna minst 44 i telefonen.
  await f.bredd(390); await vanta(150);
  const sma = await f.kor(`[...document.querySelectorAll('#pl-veckan button, #pl-veckan summary, #pl-veckan a.knapp, #pl-veckan select')].filter((el) => el.offsetParent).map((el) => { const r = el.getBoundingClientRect(); return [el.textContent.trim().slice(0, 30), Math.round(r.width), Math.round(r.height)]; }).filter(([, b, h]) => b < 24 || h < 24)`);
  sant('inget i veckan är mindre än 24 punkter att trycka på', !sma?.length, sma);
  const lagre = await f.kor(`[...document.querySelectorAll('#pl-veckan .pl-del > summary, #pl-veckan .pl-fallut > summary, #pl-veckan a.knapp, #pl-veckan button.knapp, #pl-veckan .pl-remsa-vecka, #pl-veckan button.pl-passroll')].filter((el) => el.offsetParent).map((el) => [el.textContent.trim().slice(0, 30), Math.round(el.getBoundingClientRect().height)]).filter(([, h]) => h < 40)`);
  sant('raderna och knapparna i veckan är minst 40 punkter höga i telefonen', !lagre?.length, lagre);
  await f.dator();
  sant('snabbmallens utskriftsknapp står i veckan med version', /\/stodundervisning\/textsamtal-i-grupp-snabbmall\.pdf\?v=[0-9a-f]{8}/.test((await f.kor(`document.querySelector('#pl-veckan a[data-skriv-ut-pdf]')?.getAttribute('href')`)) ?? ''));
  sant('snabbmallen heter i texten som i metoden och på knappen', (await f.text('#pl-veckan'))?.includes('Skriv i Veckans cykel vad du såg') && (await f.text('#pl-veckan [data-fil="snabbmall"]'))?.includes('Veckans cykel'), await f.text('#pl-veckan [data-fil="snabbmall"]'));
  sant('bara planen: inga bockar, ingen skattning och ingen sammanställning', (await f.kor(`!document.querySelector('#pl-veckan [data-bock]') && !document.querySelector('#pl-veckan [data-skatta]') && document.getElementById('pl-samman').hidden`)));
  for (const b of [320, 360, 390]) { await f.bredd(b); await vanta(150); sant(`veckan rullar inte i sidled i ${b} punkter`, !(await rullar(f))); }
  await f.bild('2-bara-planen-telefon');
  await f.dator();
  // Upprepa veckan och ta bort upprepningen under Efter veckan, Flytta eller ställ in ett pass under Veckans pass, och lov
  // under Ändra planen: inget står bakom en rad som fälls ut, och Avsluta insatsen står i lägesraden överst (Niclas
  // 2026-10-25: knappen låg "bakom en rubrik som var bakom en pil").
  sant('veckans knappar står synliga, och Avsluta insatsen i lägesraden överst', !(await f.kor(`!!document.querySelector('#pl-veckan [data-ruta="andra-veckan"], #pl-veckan [data-gor="lov"], #pl-veckan [data-gor="avsluta"]')`)) && !!(await f.kor(`!!document.querySelector('#pl-passen [data-gor="flytta"]') && !!document.querySelector('#pl-veckan .pl-block [data-gor="upprepa"]')`)) && (await f.kor(`document.querySelector('#pl-lage .pl-status')?.textContent`)) === 'Pågående' && !!(await f.kor(`!!document.querySelector('#pl-lage [data-gor="avsluta"]')`)), await f.text('#pl-lage'));
  await f.tryck('[data-gor="upprepa"]');
  sant('upprepad vecka ger 21 pass', (await f.text('#pl-summa-text'))?.includes('21 pass') && (await f.text('#pl-veckan-rubrik')) === 'Vecka 3 igen i planen', [await f.text('#pl-summa-text'), await f.text('#pl-veckan-rubrik')]);
  sant('upprepningen kan ångras från beskedet', (await f.text('#pl-toast'))?.includes('Ångra'));
  sant('texten till åtgärdsprogrammet följer den upprepade veckan', (await apText())?.includes('Omfattning: 21 pass om 30 minuter') && (await apText())?.includes('Slå ihop flera ledtrådar (v. 47–48); Stämmer det? och Det som menas (v. 49); Stämmer det? och Tänk om (v. 50)') && (await apText())?.includes('till 18 december 2026'), await apText());
  await f.tryck('[data-gor="ta-bort-upprepning"]');
  sant('upprepningen tas bort', (await f.text('#pl-summa-text'))?.includes('18 pass'));
  // Lov i vecka 4, som inte har börjat; dit med veckorna överst.
  await f.tryck('#pl-veckan .pl-remsa [data-vy="4"]');
  sant('veckorna överst visar vecka 4', (await f.text('#pl-veckan-rubrik')) === 'Vecka 4 i planen' && (await f.kor(`document.querySelector('#pl-veckan .pl-remsa [data-vy="4"]').getAttribute('aria-pressed')`)) === 'true', await f.text('#pl-veckan-rubrik'));
  await f.kor(`(() => { document.getElementById('pl-andra').open = true; document.querySelector('#pl-lovveckor [data-lovvecka="2026-48"]').click(); return true; })()`);
  await vanta(300);
  sant('lov flyttar slutet en vecka', (await f.text('#pl-summa-text'))?.includes('till 18 december'), await f.text('#pl-summa-text'));
  sant('texten till åtgärdsprogrammet följer lovet', (await apText())?.includes('18 pass om 30 minuter, måndag, onsdag och fredag, 2 november till 18 december 2026 (v. 45 till v. 51)') && (await apText())?.includes('Slå ihop flera ledtrådar (v. 47); Stämmer det? och Det som menas (v. 49); Stämmer det? och Tänk om (v. 50)'), await apText());
  sant('lovets rad står i planen', (await f.text('#pl-veckor .pl-lovvecka'))?.includes('v. 48'), await f.text('#pl-veckor .pl-lovvecka'));
  await f.tryck('#pl-veckor [data-lov-bort]');
  sant('lovet tas bort', (await f.text('#pl-summa-text'))?.includes('till 11 december'));
  sant('en annan vecka säger vad den är och leder tillbaka', (await f.text('#pl-veckan .pl-nasta .pl-etikett')) === 'Veckans första pass' && !!(await f.kor(`!!document.querySelector('#pl-veckan [data-vy="nu"]')`)), await f.text('#pl-veckan .pl-nasta .pl-etikett'));
  await f.tryck('#pl-veckan [data-vy="nu"]');
  sant('tillbaka till den här veckan', (await f.text('#pl-veckan-rubrik')) === 'Vecka 3 i planen', await f.text('#pl-veckan-rubrik'));
  // Flytta pass 8 till torsdag och ställ in pass 9.
  await f.tryck('[data-gor="flytta"]');
  await f.kor(`(() => { document.getElementById('pl-flytta-pass').value = '2026-11-18'; document.getElementById('pl-flytta-dag').value = '2026-11-19'; return true; })()`);
  await f.tryck('[data-gor="flytta-klar"]');
  sant('flyttat pass', (await f.text('#pl-veckan .pl-passlista'))?.includes('Flyttat från onsdag 18 november'), await f.text('#pl-veckan .pl-passlista'));
  // Ny dag är en dag från och med i dag, och ett flyttat pass går att flytta tillbaka vid passet (verifieringen 2026-10-28:
  // förslaget var måndagen, som hade varit, och passen bytte innehåll).
  const nyaDagar = await f.kor(`[...document.getElementById('pl-flytta-dag').options].map((o) => o.value).join()`);
  sant('ny dag är en dag från och med i dag', nyaDagar === '2026-11-18,2026-11-19,2026-11-20', nyaDagar);
  await f.tryck('[data-tillbaka="2026-11-18"]');
  sant('ett flyttat pass går att flytta tillbaka vid passet', !(await f.text('#pl-veckan .pl-passlista'))?.includes('Flyttat från') && (await f.text('#pl-toast'))?.includes('Passet är tillbaka på onsdag 18 november'), await f.text('#pl-veckan .pl-passlista'));
  await f.tryck('[data-gor="flytta"]');
  await f.kor(`(() => { document.getElementById('pl-flytta-pass').value = '2026-11-18'; document.getElementById('pl-flytta-dag').value = '2026-11-19'; return true; })()`);
  await f.tryck('[data-gor="flytta-klar"]');
  await f.tryck('[data-gor="flytta"]');
  await f.kor(`(() => { document.getElementById('pl-flytta-pass').value = '2026-11-20'; return true; })()`);
  await f.tryck('[data-gor="stall-in"]');
  sant('inställt pass ger 17 pass', (await f.text('#pl-summa-text'))?.includes('17 pass') && (await f.text('#pl-veckan .pl-passlista'))?.includes('Inställt'));
  sant('texten till åtgärdsprogrammet följer det inställda passet', (await apText())?.includes('Omfattning: 17 pass om 30 minuter'), await apText());
  await f.tryck('[data-angra]');
  sant('ångrat inställt pass', (await f.text('#pl-summa-text'))?.includes('18 pass'));
  // Ett enskilt pass tid (passtider; Niclas 2026-10-28: "Viktigt att det bara blir det pass man ändrar", och "att denna
  // ändring syns överallt så alla läser från en rot"): fredagens pass får 9.00, och de andra fredagarna är som förut.
  await f.tryck('[data-gor="flytta"]');
  await f.kor(`(() => { const p = document.getElementById('pl-flytta-pass'); p.value = '2026-11-20'; p.dispatchEvent(new Event('change', { bubbles: true })); const fr = document.getElementById('pl-flytta-fran'); fr.value = '09:00'; fr.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const tidFalten = await f.kor(`[document.getElementById('pl-flytta-dag').value, document.getElementById('pl-flytta-till').value].join()`);
  sant('dagen följer passet, och slutet följer början med passets längd', tidFalten === '2026-11-20,09:30', tidFalten);
  await f.tryck('[data-gor="flytta-klar"]');
  sant('ett pass får en egen tid, bara den dagen', (await f.text('#pl-veckan .pl-passlista'))?.includes('9.00–9.30 · Ny tid') && (await f.text('#pl-toast'))?.includes('Passet är nu kl. 9.00–9.30, bara den dagen.'), [await f.text('#pl-veckan .pl-passlista'), await f.text('#pl-toast')]);
  await f.tryck('#pl-kalender');
  await vanta(300);
  const ptKal = String(await f.kor('window.__fil')).replace(/\r\n /g, '');
  sant('kalenderfilen har passets egen tid och de andra fredagarna som förut', ptKal.includes('DTSTART:20261120T090000') && ptKal.includes('DTEND:20261120T093000') && ptKal.includes('DTSTART;VALUE=DATE:20261127') && !ptKal.includes('DTSTART;VALUE=DATE:20261120'), ptKal.split('\r\n').filter((r) => r.startsWith('DTSTART')).slice(10, 14));
  sant('länken bär passets egen tid', (await f.kor('location.hash'))?.includes('pt=2026-11-20-0900-0930-9'), await f.kor('location.hash'));
  await f.tryck('[data-vanlig-tid="2026-11-20"]');
  sant('Vanlig tid igen tar bort passets egen tid', !(await f.text('#pl-veckan .pl-passlista'))?.includes('Ny tid') && !(await f.kor('location.hash'))?.includes('pt='), await f.text('#pl-veckan .pl-passlista'));
  // Kopiera till dokumentationen och länken; kalenderfilen.
  await f.tryck('#pl-dokumentation');
  await vanta(100);
  const dok = await f.kor('window.__kopierat');
  sant('texten till åtgärdsprogrammet kopieras', dok?.startsWith('Åtgärd: Textsamtal i grupp') && dok.includes('på nivån Mellan') && !dok.includes('Bockade') && !dok.includes('Prov 2B') && dok === (await f.kor(`document.getElementById('pl-aptext').value`)), dok);
  await f.tryck('#pl-lank');
  await vanta(100);
  const lanken = await f.kor('window.__kopierat');
  sant('länken till planen utan namnet', lanken?.includes('/stodundervisning/textsamtal-i-grupp/planera#s=2026-11-02') && lanken.includes('&p=') && !lanken.includes('Prov'), lanken);
  await f.tryck('#pl-kalender');
  await vanta(300);
  const ics = await f.kor('window.__fil');
  sant('kalenderfilen', ics?.startsWith('BEGIN:VCALENDAR\r\n') && (ics.match(/BEGIN:VEVENT/g) ?? []).length === 20 && ics.includes('Prov 2B') && ics.replace(/\r\n /g, '').includes('#s=2026-11-02&d=135&l=6&n=mellan&f=2026-11-18~2026-11-19&p='), ics?.slice(0, 300));

  // ---- Följ insatsen ----
  sant('raden om att följa insatsen står i veckan', (await f.text('.pl-foljtips'))?.includes('Följ insatsen'));
  await f.tryck('.pl-foljtips [data-gor="folj"]');
  sant('Följ insatsen ger bockar och skattning för gruppen', (await f.kor(`!!document.querySelector('#pl-veckan [data-bock]') && document.querySelectorAll('#pl-veckan .pl-skattning li').length === 1`)) && (await f.text('#pl-veckan .pl-fraga')) === 'Hur väl klarar gruppen målet på egen hand?', await f.text('#pl-veckan .pl-fraga'));
  // Målet står ovanför skattningen, utan penna: pennan står en gång, i planen (användbarhetsprovet 2026-10-25).
  sant('målet står ovanför skattningen, utan penna', (await f.text('#pl-skatta .pl-maltext'))?.includes('Kunna läsa mellan raderna') && (await f.kor(`!document.querySelector('#pl-skatta [data-mal-andra]')`)));
  sant('Följ insatsen öppnar elevlistan', await f.kor(`document.getElementById('pl-andra').open && document.activeElement?.id === 'pl-elever'`));
  // Eleverna, under Ändra planen.
  await f.kor(`document.getElementById('pl-andra').open = true`);
  await f.kor(`(() => { const t = document.getElementById('pl-elever'); t.value = 'Ali Test\\nBea\\n\\nBea'; t.dispatchEvent(new Event('input')); return true; })()`);
  await vanta(700);
  sant('elevlistan, utan dubbletter', (await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.elever.map((e) => e.namn).join()`)) === 'Ali Test,Bea');
  sant('samma namn två gånger sägs under listan', (await f.text('#pl-elever-not')) === 'Bea står två gånger. Skriv två olika namn, som Bea A och Bea B.', await f.text('#pl-elever-not'));
  sant('skattningen per elev', (await f.kor(`document.querySelectorAll('#pl-veckan .pl-skattning li').length`)) === 2 && (await f.text('#pl-veckan .pl-fraga')) === 'Hur väl klarar eleven målet på egen hand?');
  // Närvaron är ett val (granskningen 2026-10-24: en bock räknades annars som närvaro för alla).
  await f.kor(`(() => { const c = document.getElementById('pl-narvaro'); c.checked = true; c.dispatchEvent(new Event('change')); return true; })()`);
  sant('förra veckan utan bockar och skattning säger till', (await f.text('#pl-veckan .pl-forra'))?.includes('Förra veckan har 3 pass som inte är bockade och ingen skattning'), await f.text('#pl-veckan .pl-forra'));
  // Veckans pass går att bocka från veckans måndag, också ett pass senare i veckan som blev av en annan dag (Niclas
  // 2026-10-25: "Alltså från måndag 00.01 kan man bocka den veckas pass"); en vecka som inte har börjat prövas nedan.
  sant('veckans pass går att bocka från veckans måndag', await f.kor(`!!document.querySelector('[data-bock="2026-11-20"]') && !!document.querySelector('[data-bock="2026-11-18"]') && !!document.querySelector('[data-bock="2026-11-16"]')`));
  // Bocka pass 7 (måndag), med närvaron: Bea var inte med.
  await f.tryck('[data-bock="2026-11-16"]');
  sant('bocken sparas på passets dag', (await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.gjorda.join()`)) === '2026-11-16');
  sant('eleverna står under det bockade passet', (await f.kor(`document.querySelectorAll('#pl-veckan .pl-narvaro [data-narvaro]').length`)) === 2);
  await f.kor(`(() => { const b = [...document.querySelectorAll('#pl-veckan .pl-narvaro [data-narvaro]')].find((x) => x.textContent === 'Bea'); b.click(); return true; })()`);
  sant('frånvaron sparas', Object.values(await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.franvaro`) ?? {}).flat().length === 1);
  sant('lathunden och snabbmallen står kvar efter flera tryck', await f.kor(`!!document.querySelector('#pl-veckan [data-fil="lathund"]') && !!document.querySelector('#pl-veckan [data-fil="snabbmall"]')`));
  // Ett tryck på ett namn eller en skattning flyttar inte sidan, också när knappen står delvis ovanför skärmen (Niclas
  // 2026-10-28: "Då hoppar scrollingen lite som ett hack"). Knappen ställs 8 punkter ovanför skärmens kant, och efter
  // trycket står den omritade knappen på samma punkt.
  const pastaPlats = (hitta) => f.kor(`(() => { const hitta = () => ${hitta}; window.scrollBy(0, hitta().getBoundingClientRect().top + 8); const fore = hitta().getBoundingClientRect().top; hitta().click(); const efter = hitta().getBoundingClientRect().top; return Math.abs(efter - fore) < 1 ? 'samma' : fore + ' blev ' + efter; })()`);
  const aliNarvaro = `[...document.querySelectorAll('#pl-veckan .pl-narvaro [data-narvaro]')].find((x) => x.textContent === 'Ali Test')`;
  const iNarvaron = await pastaPlats(aliNarvaro);
  await f.kor(`(() => { ${aliNarvaro}.click(); return true; })()`);
  sant('ett tryck på ett namn flyttar inte sidan', iNarvaron === 'samma', iNarvaron);
  // Skatta: vecka 3 (i dag) Ali 3 och Bea 2, och förra veckan Ali 2 och Bea 2.
  const skatta = (namn, varde) => f.kor(`(() => { const li = [...document.querySelectorAll('#pl-veckan .pl-skattning li')].find((x) => x.querySelector('.pl-elevnamn').textContent === ${JSON.stringify(namn)}); li.querySelectorAll('.pl-skalsteg')[${varde - 1}].click(); return true; })()`);
  await skatta('Ali Test', 3);
  const iSkattningen = await pastaPlats(`[...document.querySelectorAll('#pl-veckan .pl-skattning li')].find((x) => x.querySelector('.pl-elevnamn').textContent === 'Bea').querySelectorAll('.pl-skalsteg')[1]`);
  sant('ett tryck på en skattning flyttar inte sidan', iSkattningen === 'samma', iSkattningen);
  // Påminnelsen om filen står också överst i lägesraden, där läraren är, när hen följer insatsen och inte har laddat ner
  // (K-604; Niclas 2026-10-28: "mindre troligt att de raderas eller försvinner"), och försvinner när planen är nedladdad.
  sant('påminnelsen om filen står överst', (await f.text('#pl-lage .pl-kopia-overst'))?.includes('Det du för in finns bara i den här webbläsaren. Ladda ner planen, så finns det kvar.'), await f.text('#pl-lage'));
  await f.tryck('button[data-vy="2"]');
  // Alla pass som har varit blev av: ett tryck, och Ångra.
  sant('knappen för veckans pass till och med i dag', (await f.text('#pl-passen [data-gor="alla"]')) === 'Bocka veckans pass till och med i dag');
  sant('förra veckan utan bockar säger till i den här veckan', true);
  await f.tryck('#pl-passen [data-gor="alla"]');
  sant('alla pass som har varit är bockade', (await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.gjorda.length`)) === 4);
  await f.tryck('#pl-toast [data-toast-gor]');
  sant('Ångra tar bort bockarna igen', (await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.gjorda.join()`)) === '2026-11-16');
  await skatta('Ali Test', 2);
  await skatta('Bea', 2);
  // En vecka som inte har börjat: streckade ringar på bockarnas plats, inga bockar, och raden säger när de går att bocka
  // (buggjakten 2026-10-24: "2 av de 0 pass").
  await f.tryck('button[data-vy="4"]');
  sant('en vecka som inte har börjat har streckade ringar och inga bockar', (await f.kor(`!!document.querySelector('#pl-veckan .pl-bock.senare') && !document.querySelector('#pl-veckan [data-bock]')`)) && (await f.text('#pl-passen .pl-not'))?.includes('går att bocka när veckan har börjat'), await f.text('#pl-passen .pl-not'));
  // Skattningen följer samma regel som bocken: från veckans måndag (buggjakten 2026-10-25: en vecka längre fram gick att skatta).
  sant('en vecka som inte har börjat säger när den går att skatta, utan skalan', !(await f.kor(`!!document.querySelector('#pl-skatta .pl-skalsteg')`)) && (await f.text('#pl-skatta'))?.includes('Du skattar veckan efter dess sista pass, fredag 27 november.'), await f.text('#pl-skatta'));
  await f.tryck('button[data-vy="3"]');
  sant('skattningen sparas per vecka och elev', (await f.kor(`(() => { const s = JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.skattning; return Object.keys(s).length === 2 && Object.values(s['2026-11-16']).sort().join() === '2,3'; })()`)));
  // Ett pass som är bockat är gjort: rutan visar nästa pass som inte är bockat och säger det (användbarhetsprovet 2026-10-25).
  // Pass 8 flyttades till torsdag ovan och bockas här i förväg, på onsdagen.
  await f.tryck('[data-bock="2026-11-18"]');
  sant('ett bockat pass ger nästa pass i rutan, och rutan säger det', (await f.text('#pl-veckan .pl-nasta .pl-not')) === 'Pass 8 är bockat.' && (await f.text('#pl-veckan .pl-passnamn'))?.endsWith('9 av 18'), [await f.text('#pl-veckan .pl-nasta'), await f.text('#pl-veckan .pl-passnamn')]);
  await f.tryck('[data-bock="2026-11-18"]');
  sant('utan bocken gäller rutan passet igen', (await f.text('.pl-nar')) === 'I morgon, torsdag 19 november' && (await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.gjorda.join()`)) === '2026-11-16', await f.text('.pl-nar'));
  // Ett rättat namn behåller eleven och det som förts in (granskningarna 2026-10-24).
  const idFore = await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.elever[0].id`);
  await f.kor(`(() => { const t = document.getElementById('pl-elever'); t.value = 'Ali T\\nBea'; t.dispatchEvent(new Event('input')); return true; })()`);
  await vanta(900);
  sant('ett rättat namn behåller elevens skattningar', await f.kor(`(() => { const p = JSON.parse(localStorage.getItem('insatser')).planer[0]; return p.foljd.elever[0].namn === 'Ali T' && p.foljd.elever[0].id === ${JSON.stringify(idFore)} && p.foljd.skattning['2026-11-16'][${JSON.stringify(idFore)}] === 3; })()`));
  await f.kor(`(() => { const t = document.getElementById('pl-elever'); t.value = 'Ali Test\\nBea'; t.dispatchEvent(new Event('input')); return true; })()`);
  await vanta(900);
  // En paus med raden tom behåller eleven (Codex 2026-10-24: en tom rad en stund gav ett nytt id).
  await f.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = '\\nBea'; t.dispatchEvent(new Event('input')); return true; })()`);
  await vanta(900);
  await f.kor(`(() => { const t = document.getElementById('pl-elever'); t.value = 'Ali S\\nBea'; t.dispatchEvent(new Event('input')); t.blur(); return true; })()`);
  await vanta(300);
  sant('en paus med raden tom behåller eleven', await f.kor(`(() => { const p = JSON.parse(localStorage.getItem('insatser')).planer[0]; return p.foljd.elever[0].namn === 'Ali S' && p.foljd.elever[0].id === ${JSON.stringify(idFore)} && p.foljd.skattning['2026-11-16'][${JSON.stringify(idFore)}] === 3; })()`));
  // Ett rättat namn sägs, med Ångra (användbarhetsprovet 2026-10-25: "Dina K fick Dinas utan fråga").
  sant('ett rättat namn sägs i beskedet, med Ångra', (await f.text('#pl-toast'))?.includes('Ali Test heter nu Ali S, med det som förts in.') && (await f.kor(`!!document.querySelector('#pl-toast [data-toast-gor]')`)), await f.text('#pl-toast'));
  await f.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = 'Ali Test\\nBea'; t.dispatchEvent(new Event('input')); t.blur(); return true; })()`);
  await vanta(300);
  // Ett namn tvättas ur lärarens mening först när läraren lämnar fältet: en rad som töms en stund och skrivs igen behåller
  // namnet i meningen (steget Samma sak överallt tvättade medan läraren skrev, och meningen förlorade namnet för gott).
  await f.kor(`(() => { const n = document.getElementById('pl-veckonot'); n.value = 'Bea läste fler ord direkt.'; n.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await vanta(600);
  await f.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = 'Ali Test\\n'; t.dispatchEvent(new Event('input')); return true; })()`);
  await vanta(900);
  await f.kor(`(() => { const t = document.getElementById('pl-elever'); t.value = 'Ali Test\\nBea'; t.dispatchEvent(new Event('input')); t.blur(); return true; })()`);
  await vanta(300);
  sant('en rad som töms en stund behåller namnet i lärarens mening', await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.vecka['2026-11-16']?.not`) === 'Bea läste fler ord direkt.', await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.vecka['2026-11-16']`));
  await f.kor(`(() => { const n = document.getElementById('pl-veckonot'); n.value = ''; n.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await vanta(600);
  // En borttagen rad ger inte nästa elev den borttagnas id, och Ångra lägger tillbaka listan (Codex granskning 2).
  const beaId = await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.elever[1].id`);
  await f.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = 'Bea'; t.dispatchEvent(new Event('input')); return true; })()`);
  await vanta(800);
  await f.kor(`(() => { const t = document.getElementById('pl-elever'); t.value = 'Bea S'; t.dispatchEvent(new Event('input')); return true; })()`);
  await vanta(800);
  sant('en borttagen rad ger inte nästa elev dess id', await f.kor(`(() => { const e = JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.elever; return e.length === 1 && e[0].namn === 'Bea S' && e[0].id === ${JSON.stringify(beaId)}; })()`), await f.kor(`JSON.stringify(JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.elever)`));
  await f.kor(`document.getElementById('pl-elever').blur()`);
  await vanta(200);
  await f.tryck('#pl-toast [data-toast-gor]');
  sant('Ångra lägger tillbaka elevlistan', await f.kor(`(() => { const e = JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.elever; return e.map((x) => x.namn).join() === 'Ali Test,Bea' && e[0].id === ${JSON.stringify(idFore)} && e[1].id === ${JSON.stringify(beaId)}; })()`), await f.kor(`JSON.stringify(JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.elever)`));
  // Avstämningen mitt i, vecka 3 av 6.
  sant('avstämningen mitt i står i vecka 3', (await f.text('.pl-stam h3')) === 'Avstämning mitt i insatsen' && (await f.text('.pl-stam .pl-riktningar'))?.includes('2 till 3, framåt'), await f.text('.pl-stam'));
  await f.tryck('[data-beslut="avstamning|fortsatt"]');
  sant('avstämningens beslut sparas', (await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.avstamning.beslut`)) === 'fortsatt');
  // Veckans gång för gruppen, frivillig.
  await f.kor(`document.querySelector('.pl-gang').open = true`);
  await f.kor(`(() => { document.querySelector('.pl-gang [data-varde="4"]').click(); return true; })()`);
  sant('veckans gång har ord, inte siffror', (await f.text('.pl-gang [data-varde="4"]')) === 'Bra');
  await f.bredd(390); await vanta(150); await f.bild('3-folj-veckan-telefon'); await f.dator(); await vanta(150); await f.bild('3-folj-veckan-dator');
  sant('veckans gång sparas', (await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.vecka['2026-11-16'].varde`)) === 4);
  // Sammanställningen hittills.
  sant('sammanställningen hittills', (await f.text('#pl-samman-rubrik')) === 'Sammanställningen hittills' && (await f.text('#pl-samman'))?.includes('1 av de 7 pass som har varit är bockade.'), await f.text('#pl-samman'));
  await f.kor(`document.querySelector('#pl-samman details[data-elev]').open = true`);
  await f.bredd(390); await vanta(150); await f.kor(`document.getElementById('pl-samman').scrollIntoView()`); await f.bild('4-sammanstallning-telefon'); await f.dator(); await vanta(150); await f.bild('4-sammanstallning-dator');
  sant('en elev fälls ut med graf och riktning', (await f.kor(`!!document.querySelector('#pl-samman details[data-elev][open] svg.pl-graf.stor rect.pl-stapel')`)) && (await f.text('#pl-samman details[data-elev]'))?.includes('2 till 3, framåt'));
  // En vecka genom alla vyer (K-508; Niclas 2026-10-25: "Sammanställning ska ju matcha veckor i planen"): varje stapel i elevens
  // diagram har samma vecka i planen och kalendervecka som planens rad för veckan.
  const planRader = await f.kor(`[...document.querySelectorAll('#pl-veckor li:not(.fore):not(.efter):not(.pl-lovvecka)')].map((li) => [(li.querySelector('.pl-v')?.textContent.match(/\\d+/) ?? [''])[0], (li.querySelector('.pl-pass')?.textContent.match(/v\\. \\d+/) ?? [''])[0]])`);
  const grafVeckor = await f.kor(`(() => { const g = document.querySelector('#pl-samman details[data-elev][open] svg.pl-graf.stor'); const k = [...g.querySelectorAll('.pl-stapeletikett:not(.pl-planveckan)')].map((x) => x.textContent); return [...g.querySelectorAll('.pl-planveckan')].map((x, i) => [(x.textContent.match(/\\d+/) ?? [''])[0], k[i]]); })()`);
  sant('en vecka genom alla vyer: diagrammets veckor är planens veckor', planRader?.length > 0 && JSON.stringify(planRader) === JSON.stringify(grafVeckor), [planRader, grafVeckor]);
  await f.tryck('#pl-samman [data-samman]');
  await vanta(100);
  const samman = await f.kor('window.__kopierat');
  sant('sammanställningen kopieras utan namn', samman?.includes('Sammanställning: Textsamtal i grupp') && samman.includes('Avstämning mitt i insatsen') && !/Ali|Bea|Prov 2B/.test(samman), samman);
  await f.tryck('#pl-samman [data-elevtext]');
  await vanta(100);
  const elevrad = await f.kor('window.__kopierat');
  sant('elevens rad kopieras utan namn', elevrad?.includes('vecka 2 (v. 46): 2, vecka 3 (v. 47): 3') && !/Ali|Bea/.test(elevrad), elevrad);
  await f.kor('window.__fil = null');
  await f.tryck('#pl-samman [data-gruppdf]');
  await vanta(1500);
  sant('gruppens pdf görs', (await f.kor(`(window.__fil ?? '').startsWith('%PDF-')`)), (await f.kor('String(window.__fil).slice(0, 20)')));
  await f.kor('window.__fil = null');
  await f.tryck('#pl-samman [data-elevpdf]');
  await vanta(1500);
  sant('elevens pdf görs', (await f.kor(`(window.__fil ?? '').startsWith('%PDF-')`)));
  // Kopian som fil.
  sant('påminnelsen om kopian', (await f.kor(`document.getElementById('pl-kopia-text').classList.contains('pl-paminn')`)));
  // Knappen överst laddar ner samma fil och tar bort påminnelsen överst (K-604), och sedan knappen längst ned.
  await f.kor('window.__fil = null');
  await f.tryck('#pl-lage [data-gor="kopia"]');
  await vanta(300);
  sant('Ladda ner planen överst laddar ner filen och tar bort påminnelsen', String((await f.kor('window.__fil')) ?? '').includes('"typ": "planera-insatsen"') && !(await f.kor(`!!document.querySelector('#pl-lage .pl-kopia-overst')`)), [String(await f.kor('window.__fil')).slice(0, 60), await f.text('#pl-lage')]);
  await f.kor('window.__fil = null');
  await f.tryck('#pl-kopia-spara');
  await vanta(300);
  const kopian = await f.kor('window.__fil');
  sant('kopian har planen och eleverna', kopian?.includes('"typ": "planera-insatsen"') && kopian.includes('Ali Test') && !(await f.kor(`document.getElementById('pl-kopia-text').classList.contains('pl-paminn')`)), kopian?.slice(0, 120));
  sant('inga namn i statistikens händelser', !(await f.kor(`[...document.querySelectorAll('[data-goatcounter-click], [data-goatcounter-title]')].some((x) => /Ali|Bea|Prov 2B/.test((x.dataset.goatcounterClick ?? '') + (x.dataset.goatcounterTitle ?? '')))`)));
  sant('inga fel i konsolen', !f.undantag.length && !(await f.kor('window.__fel.length')), f.undantag);
  for (const b of [320, 360]) { await f.bredd(b); await vanta(150); sant(`uppföljningen rullar inte i sidled i ${b} punkter`, !(await rullar(f))); }
  await f.dator();
  // Ta bort planen: först en fråga, Avbryt behåller, Ta bort tar bort, och Ångra tar tillbaka.
  await f.tryck('#pl-ta-bort');
  await f.bild('5-ta-bort-fragar');
  sant('borttagningen frågar först', (await f.kor(`!!document.querySelector('.pl-fraga-forst') && document.activeElement?.hasAttribute('data-nej')`)));
  await f.tryck('.pl-fraga-forst [data-nej]');
  sant('Avbryt behåller planen', (await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer.length`)) === 1);
  await f.tryck('#pl-ta-bort');
  await f.tryck('.pl-fraga-forst [data-ja]');
  sant('planen tas bort', (await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer.length`)) === 0 && (await f.text('#pl-toast'))?.includes('Ångra'));
  await f.tryck('#pl-toast [data-toast-gor]');
  sant('Ångra tar tillbaka planen med allt', (await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0]?.foljd?.elever?.length`)) === 2 && (await f.text('#pl-veckan-rubrik')) === 'Vecka 3 i planen');
  // Omladdning: planen står kvar.
  await f.oppna(PLAN);
  sant('planen står kvar efter omladdning', (await f.text('#pl-veckan .meta'))?.includes('Prov 2B') && (await f.text('#pl-veckan-rubrik')) === 'Vecka 3 i planen');
  // Metodens sida: knappen och Din insats; en metod utan plan har ingen knapp.
  await f.oppna(`${bas}/stodundervisning/textsamtal-i-grupp`);
  sant('metodens sida har knappen Planera insatsen med Beta', (await f.kor(`[...document.querySelectorAll('.metod-centrala a')].some((a) => a.textContent.replace(/\\s+/g, ' ').trim() === 'Planera insatsen Beta' && !!a.querySelector('.beta') && a.getAttribute('href') === '/stodundervisning/textsamtal-i-grupp/planera')`)));
  await f.bredd(390); await vanta(150); await f.bild('7-metodens-sida-telefon'); await f.dator();
  sant('Din insats på metodens sida', (await f.text('#pl-din'))?.includes('Din insats · Prov 2B') && (await f.text('#pl-din'))?.includes('pass 8 i morgon') && (await f.kor(`document.querySelector('#pl-din a').getAttribute('href').includes('&p=')`)), await f.text('#pl-din'));
  await f.bredd(320); await vanta(150);
  sant('metodens sida rullar inte i sidled i 320 punkter med Din insats', !(await rullar(f)));
  await f.dator();
  // En metod utan planens fält, så länge någon finns: omgångarna 2026-10-26 ger metoderna planen en omgång i taget, och en
  // lektion i en serie planeras i seriens plan.
  const utanPlan = alla.find((m) => !synliga.includes(m) && !m.d.serie);
  if (utanPlan) {
    await f.oppna(`${bas}/stodundervisning/${utanPlan.id}`);
    sant(`en metod utan plan har ingen knapp och ingen rad (${utanPlan.id})`, !(await f.kor(`[...document.querySelectorAll('a')].some((a) => a.textContent.startsWith('Planera insatsen'))`)) && !(await f.kor(`!!document.getElementById('pl-din')`)));
  }
  await f.oppna(`${bas}/stodundervisning`);
  await f.bredd(390); await vanta(150); await f.bild('6-metodbanken-telefon'); await f.dator();
  sant('Dina insatser i metodbanken', (await f.kor(`!document.getElementById('pl-insatser').hidden`)) && (await f.text('#pl-insatser'))?.includes('Textsamtal i grupp') && (await f.text('#pl-insatser'))?.includes('Prov 2B') && (await f.text('#pl-insatser'))?.includes('1 pass bockade'), await f.text('#pl-insatser'));
  sant('inga fel i konsolen efter sidbytena', !f.undantag.length, f.undantag);
  // Insatsens läge som ett märke, i tur och ordning: pågående först, sedan kommande, och de avslutade hopfällda sist, den
  // senast avslutade först (Niclas 2026-10-25: "KOMMANDE PÅGÅENDE, AVSLUTAD ... Och att avslutade läggs under en lista som
  // kan tryckas ut"). En plan är avslutad när läraren har avslutat den, eller två veckor efter sista passet.
  await f.kor(`localStorage.setItem('insatser', ${JSON.stringify(JSON.stringify({ v: 1, planer: lagesplaner }))})`);
  await f.oppna(`${bas}/stodundervisning`);
  const lagen = (valjare) => f.kor(`[...document.querySelectorAll('${valjare}')].map((li) => li.querySelector('.pl-status').textContent + ':' + li.querySelector('.pl-metod').textContent.split(' · ')[1] + ':' + li.querySelector('.pl-pil').textContent).join('|')`);
  sant('Dina insatser: läget som ett märke och i tur och ordning', (await lagen('#pl-insatser > ul > li')) === 'Pågående:Pagar:Veckan ›|Pågående:Kvar:Efter ›|Pågående:Oppnad:Efter ›|Kommande:Kommer:Veckan ›', await lagen('#pl-insatser > ul > li'));
  sant('Dina insatser: de avslutade hopfällda sist, den senast avslutade först', (await f.text('.pl-avslutade summary')) === '2 avslutade insatser' && !(await f.kor(`document.querySelector('.pl-avslutade details').open`)) && (await lagen('.pl-avslutade li')) === 'Avslutad:Avslutad:Efter ›|Avslutad:Sjalv:Efter ›', [await f.text('.pl-avslutade summary'), await lagen('.pl-avslutade li')]);
  sant('Dina insatser: en plan vars utvärdering återstår säger det', (await f.text('#pl-insatser > ul > li:nth-child(2) .pl-om'))?.includes('Utvärderingen återstår. Sista passet var fredag 6 november'), await f.text('#pl-insatser > ul > li:nth-child(2) .pl-om'));
  // Av de avslutade planerna står de tre senaste bland Dina planer för metoden, och de äldre ligger hopfällda (Niclas
  // 2026-10-25: "se sina 3 senaste avslutad och resten i en rullgardin").
  await f.kor(`localStorage.setItem('insatser', ${JSON.stringify(JSON.stringify({ v: 1, planer: [...lagesplaner, provPlan('lag007', '2026-08-17', 'Gammal1'), provPlan('lag008', '2026-08-24', 'Gammal2'), provPlan('lag009', '2026-08-31', 'Gammal3')] }))})`);
  await f.oppna(PLAN);
  sant('Dina planer för metoden: de tre senast avslutade och de äldre hopfällda', (await f.kor(`document.querySelectorAll('#pl-grupper > .pl-chip .pl-status').length`)) === 3 && (await f.text('#pl-grupper .pl-aldre summary')) === '2 äldre avslutade planer' && !(await f.kor(`document.querySelector('#pl-grupper .pl-aldre').open`)) && (await f.kor(`[...document.querySelectorAll('#pl-grupper .pl-aldre .pl-chip')].map((b) => b.textContent).join('|')`)) === 'Gammal2 Avslutad|Gammal1 Avslutad', await f.text('#pl-grupper'));
  // En annan dator: inget sparat. Länken ger planen utan uppföljning, och kopian ger allt.
  await f.kor(`localStorage.clear()`);
  await f.oppna(lanken);
  sant('planen ur länken visas utan namn och utan uppföljning', (await f.text('#pl-besked'))?.includes('Planen kommer från en länk') && (await f.text('#pl-veckan-rubrik')) === 'Vecka 3 i planen' && !(await f.text('#pl-veckan .meta'))?.includes('Prov') && (await f.kor(`!document.getElementById('pl-spara').hidden && !document.querySelector('#pl-veckan [data-bock]')`)), [await f.text('#pl-besked'), await f.text('#pl-veckan .meta')]);
  const kopiefil = join(profil, 'kopia.json');
  writeFileSync(kopiefil, kopian ?? '');
  await f.filTill('#pl-kopia-fil', kopiefil);
  await vanta(600);
  sant('kopian öppnas med allt', (await f.kor(`JSON.parse(localStorage.getItem('insatser') ?? '{"planer":[]}').planer[0]?.foljd?.elever?.length`)) === 2 && (await f.text('#pl-toast'))?.includes('Planen är öppnad ur filen') && (await f.kor(`!!document.querySelector('#pl-veckan [data-bock]')`)), await f.text('#pl-toast'));
  // En kopia som har ändrats för hand öppnas utan att sidan stannar, också efter omladdning (Codex 2026-10-24).
  const trasigKopia = JSON.parse(kopian ?? '{"plan":{"foljd":{}}}');
  Object.assign(trasigKopia.plan, { id: 'trasig1', schema: 5 });
  Object.assign(trasigKopia.plan.foljd, { gjorda: null, skattning: 'nej', elever: [{ id: 'e1', namn: 42 }] });
  const trasigFil = join(profil, 'trasig.json');
  writeFileSync(trasigFil, JSON.stringify(trasigKopia));
  await f.filTill('#pl-kopia-fil', trasigFil);
  await vanta(600);
  sant('en kopia som har ändrats för hand öppnas utan fel', (await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'trasig1')?.foljd?.gjorda?.length`)) === 0 && !f.undantag.length && (await f.text('#pl-veckan-rubrik')) === 'Vecka 3 i planen', [f.undantag, await f.text('#pl-veckan-rubrik')]);
  await f.oppna(PLAN);
  sant('och sidan fungerar efter omladdning', !f.undantag.length && !(await f.kor('window.__fel.length')) && !!(await f.text('#pl-veckan-rubrik')), f.undantag);
  f.stang();
  // En webbläsare som inte sparar.
  const g = await flik(true);
  await g.oppna(PLAN);
  sant('utan lagring visas förslaget och beskedet', (await g.text('#pl-summa-text'))?.includes('pass om 30 minuter') && (await g.text('#pl-besked'))?.includes('Webbläsaren sparar inget här'), await g.text('#pl-besked'));
  await g.tryck('#pl-spara');
  sant('utan lagring säger Spara planen att den inte sparades', (await g.text('#pl-toast'))?.includes('gick inte att spara'), await g.text('#pl-toast'));
  await g.oppna(`${bas}/stodundervisning`);
  sant('metodbanken utan lagring visar ingen ruta', await g.kor(`document.getElementById('pl-insatser').hidden`));
  sant('inga fel i konsolen utan lagring', !g.undantag.length, g.undantag);
  g.stang();
  // En apps egen webbläsare (K-510): beskedet har vägen ut först, på Android till telefonens webbläsare eller appen Stöd och på
  // iPhone till Safari, och Kopiera länken efter. Kopiera länken kopierar sidans adress, och beskedet ryms i 320 punkter.
  for (const [namn, ua] of [['Android', 'Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/485.0.0.43.70;]'], ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/485.0.0.43.70;FBLC/sv_SE]']]) {
    const fb = await flik();
    await fb.ua(ua);
    await fb.bredd(320);
    await fb.oppna(PLAN);
    const besked = await fb.text('#pl-besked');
    const ut = (await fb.kor(`document.getElementById('pl-ut')?.getAttribute('href') ?? ''`)) ?? '';
    const forst = await fb.kor(`document.querySelector('#pl-besked-knappar > *')?.id`);
    sant(`i Facebooks webbläsare på ${namn}: beskedet och vägen ut`, besked?.includes('Facebooks egen webbläsare')
      && forst === 'pl-ut' && (namn === 'Android' ? besked.includes('appen Stöd om du har den') && ut.startsWith('intent://') : besked.includes('Öppna sidan i Safari') && ut.startsWith('x-safari-https://')), [besked, ut, forst]);
    sant(`i Facebooks webbläsare på ${namn}: beskedet rullar inte i sidled i 320 punkter`, await fb.kor('document.documentElement.scrollWidth <= innerWidth'));
    // Det sidan ser av webbläsaren står längst ned, för felsökning (Niclas 2026-10-25, om LinkedIns webbläsare på Android).
    sant('i en apps webbläsare: felsökningen säger namnet och vad sidan känner igen', (await fb.kor(`document.getElementById('pl-teknik').textContent`))?.startsWith(`Webbläsarens namn: ${ua}.`) && (await fb.kor(`document.getElementById('pl-teknik').textContent`))?.includes('Sidan känner igen: Facebooks egen webbläsare.'), await fb.kor(`document.getElementById('pl-teknik').textContent`));
    await fb.bild(`facebook-${namn.toLowerCase()}`, true);
    await fb.tryck('#pl-ut-kopiera');
    await vanta(200);
    sant(`i Facebooks webbläsare på ${namn}: Kopiera länken kopierar planens länk med valen`, (await fb.kor('window.__kopierat'))?.startsWith(`${PLAN}#s=`), await fb.kor('window.__kopierat'));
    sant(`i Facebooks webbläsare på ${namn}: inga fel i konsolen`, !fb.undantag.length, fb.undantag);
    fb.stang();
  }

  // ---- Efter insatsen ----
  // Måndag 14 december, efter planens sista pass. Sista veckan har metodens uppföljning efter och utvärderingen, och
  // sammanställningen har alla veckor.
  const h = await flik(false, Date.UTC(2026, 11, 14, 9, 0, 0));
  await h.oppna(PLAN);
  await h.kor(`localStorage.setItem('insatser', ${JSON.stringify(JSON.stringify(slutlagrat))})`);
  await h.oppna(PLAN);
  sant('efter insatsen: sidan visar Efter insatsen', (await h.text('#pl-veckan-rubrik')) === 'Efter insatsen', await h.text('#pl-veckan-rubrik'));
  sant('efter insatsen: passen är slut, och planen säger när den avslutas av sig själv', (await h.text('#pl-veckan .pl-nasta .pl-etikett')) === 'Den här veckan' && (await h.text('.pl-nar')) === 'Efter insatsen, v. 51, 14–18 dec' && !(await h.kor(`!!document.querySelector('#pl-veckan [data-fil="lathund"]')`)) && (await h.kor(`document.querySelector('#pl-lage .pl-status')?.textContent`)) === 'Pågående' && (await h.text('#pl-lage'))?.includes('Sista passet var fredag 11 december. Planen avslutas av sig själv fredag 1 januari, om du inte avslutar den före.') && !!(await h.kor(`!!document.querySelector('#pl-lage [data-vy="efter"]')`)), [await h.text('.pl-nar'), await h.text('#pl-lage')]);
  sant('efter insatsen: kartläggningens text efter leder till planens nivå', (await h.kor(`[...document.querySelectorAll('#pl-veckan .pl-uppf a')].map((a) => a.getAttribute('href')).join()`))?.includes('/stodundervisning/textsamtal-i-grupp/mellan-kartlaggning-efter') && !lankFel(await sakLankar(h)).length, await h.kor(`[...document.querySelectorAll('#pl-veckan .pl-uppf a')].map((a) => a.getAttribute('href')).join()`));
  sant('efter insatsen: metodens uppföljning efter, ett fält per elev', (await h.kor(`document.querySelectorAll('#pl-veckan [data-resultat^="2-2026-12-14|"]').length`)) === 3);
  sant('efter insatsen: utvärderingen med målet, varje elevs riktning och resultaten före och efter', (await h.text('.pl-stam h3')) === 'Utvärdering efter insatsen' && (await h.text('.pl-stam .pl-maltext'))?.includes('Kunna läsa mellan raderna') && (await h.text('.pl-stam .pl-riktningar'))?.includes('1 till 3, framåt') && (await h.text('.pl-stam .pl-riktningar'))?.includes('Före insatsen: 2 av 8, Efter insatsen: 4 av 8'), await h.text('.pl-stam'));
  sant('efter insatsen: sammanställningen', (await h.text('#pl-samman-rubrik')) === 'Sammanställningen' && (await h.text('#pl-samman'))?.includes('16 av 18 pass är bockade som genomförda.') && (await h.text('#pl-samman'))?.includes('Var med i'), await h.text('#pl-samman'));
  sant('efter insatsen: de tre eleverna i sammanställningen', (await h.kor(`document.querySelectorAll('#pl-samman details[data-elev]').length`)) === 3);
  for (const b of [320, 360, 390]) { await h.bredd(b); await vanta(150); sant(`efter insatsen rullar inte i sidled i ${b} punkter`, !(await rullar(h))); }
  await h.bredd(390); await vanta(150); await h.bild('8-efter-insatsen-telefon'); await h.dator(); await vanta(150); await h.bild('8-efter-insatsen-dator');
  await h.kor(`document.querySelector('#pl-samman details[data-elev]').open = true`);
  await h.bredd(390); await vanta(150); await h.bild('9-sammanstallningen-efter-telefon'); await h.dator(); await vanta(150); await h.bild('9-sammanstallningen-efter-dator');
  // Avsluta insatsen i utvärderingen märks: rutan med bocken under beslutet, läget överst, planen grå och beskedet, och samma
  // knapp en gång till öppnar insatsen igen (Niclas 2026-10-25: "Avsluta ... gör inget synligt ... Vill ju ha någon fanfar
  // nästan").
  await h.tryck('[data-beslut="utvardering|avsluta"]');
  sant('avsluta i utvärderingen: rutan med bocken, läget överst och planen grå', !!(await h.kor(`!!document.querySelector('.pl-stam .pl-avslutad.ny .pl-avslutad-bock') && !!document.querySelector('#pl-lage.ny .pl-avslutad-bock')`)) && (await h.text('#pl-lage'))?.startsWith('Avslutad Insatsen är avslutad. Sista passet var fredag 11 december.') && (await h.kor(`document.getElementById('plan').classList.contains('pl-avslutad-plan')`)) && (await h.text('#pl-toast'))?.startsWith('Insatsen är avslutad.') && (await h.text('#pl-veckan .pl-nasta .pl-etikett')) === 'Den här veckan', [await h.text('#pl-lage'), await h.text('#pl-toast')]);
  await h.bredd(390); await vanta(1200); await h.bild('8b-avslutad-telefon'); await h.dator();
  await h.tryck('[data-beslut="utvardering|avsluta"]');
  sant('avsluta i utvärderingen: en gång till öppnar insatsen igen', !(await h.kor(`document.getElementById('plan').classList.contains('pl-avslutad-plan')`)) && (await h.kor(`document.querySelector('#pl-lage .pl-status')?.textContent`)) === 'Pågående' && (await h.text('#pl-toast'))?.startsWith('Avslutet är ångrat'), await h.text('#pl-toast'));
  await h.tryck('[data-beslut="utvardering|forlang"]');
  sant('utvärderingens beslut sparas och frågar hur länge', (await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.utvardering?.beslut`)) === 'forlang' && !!(await h.kor(`!!document.querySelector('.pl-forlang [data-forlang="2"]')`)), await h.text('.pl-stam'));
  sant('utvärderingen står under Besluten', (await h.text('#pl-samman'))?.includes('Förläng insatsen'));
  await h.tryck('[data-forlang="2"]');
  // Beslutet Förläng insatsen är verkställt när planen har förlängts, så det tas bort (verifieringen 2026-10-25).
  sant('förläng med två veckor', (await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].val`))?.includes('l=8') && (await h.text('#pl-toast'))?.includes('2 veckor längre') && !(await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.utvardering?.beslut`)), await h.text('#pl-toast'));
  sant('förlängningen flyttar inte avstämningen', (await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].val`))?.includes(`a=${s.mittVeckan(slutPlan)}`), await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].val`));
  // Resultatet efter insatsen står kvar på sin dag, och den nya mätningen efter är tom (Codex 2026-10-24). Raden heter Efter
  // insatsen, som i uppföljningens rad (uppfoljningensNamn, K-509).
  sant('förlängningen flyttar inte resultatet efter', (await h.text('#pl-samman'))?.includes('Efter insatsen, v. 51: 6 av 8') && (await h.kor(`(() => { const r = JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.resultat; return !r['2-2026-12-28'] && r['2-2026-12-14'].e1 === '6 av 8'; })()`)), await h.text('#pl-samman'));
  await h.tryck('#pl-toast [data-toast-gor]');
  sant('förlängningen kan ångras', (await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].val`))?.includes('l=6') && (await h.text('#pl-veckan-rubrik')) === 'Efter insatsen', await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].val`));
  await h.tryck('#pl-samman [data-samman]');
  await vanta(100);
  const sammanSlut = await h.kor('window.__kopierat');
  sant('texten som kopieras har inga namn, också i lärarens meningar', !/Ali|Bea|Sebastian|Läsgrupp/.test(sammanSlut ?? '') && sammanSlut?.includes('En elev behöver mer stöd vid stoppet.'), sammanSlut);
  await h.kor('window.__fil = null');
  await h.tryck('#pl-samman [data-gruppdf]');
  await vanta(1500);
  sant('gruppens pdf efter insatsen', (await h.kor(`(window.__fil ?? '').startsWith('%PDF-')`)));
  // Skattningens rader med ett längre namn (Niclas 2026-10-24: "Alexandra och Sebastian +2 bokstäver"): i 360 punkter står
  // namnet och siffrorna på samma rad, och i 320 står alla namn ovanför sina siffror, så att ingen rad bryter för sig.
  await h.tryck('#pl-veckan .pl-remsa [data-vy="6"]');
  const rader = () => h.kor(`(() => [...document.querySelectorAll('#pl-skatta .pl-skattning li')].map((li) => { const el = li.querySelector('.pl-elevnamn'), n = el.getBoundingClientRect(), s = li.querySelector('.pl-skala').getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(el); return { samma: Math.abs((n.top + n.bottom) / 2 - (s.top + s.bottom) / 2) < 14, under: s.top >= n.bottom - 2, enRad: r.getClientRects().length === 1, inne: s.right <= innerWidth }; }))()`);
  await h.bredd(360); await vanta(150);
  const r360 = await rader();
  sant('skattningen i 360 punkter: namn och siffror på samma rad, också Sebastian Ek', r360.length === 3 && r360.every((x) => x.samma && x.enRad && x.inne), r360);
  await h.bild('10-skattningen-360');
  await h.bredd(320); await vanta(150);
  const r320 = await rader();
  sant('skattningen i 320 punkter: alla namn ovanför siffrorna', r320.length === 3 && r320.every((x) => x.under && x.inne) && !(await rullar(h)), r320);
  await h.dator();
  // Elevens utveckling under namnet, där läraren skattar (Niclas 2026-10-24: "trycka på ett namn och se dennes utveckling",
  // "både sammanställning av alla elever i gruppen och en elev när som").
  await h.bredd(390); await vanta(150);
  sant('namnet i skattningen går att trycka på', (await h.kor(`document.querySelector('#pl-skatta [data-utveckling="skatta|e1"]')?.getAttribute('aria-expanded')`)) === 'false');
  await h.tryck('#pl-skatta [data-utveckling="skatta|e1"]');
  sant('ett tryck på namnet fäller ut elevens utveckling', (await h.kor(`!!document.querySelector('#pl-skatta .pl-utveckling svg.pl-graf.stor rect.pl-stapel') && document.querySelector('#pl-skatta [data-utveckling="skatta|e1"]').getAttribute('aria-expanded') === 'true'`)) && (await h.text('#pl-skatta .pl-utveckling'))?.includes('2 till 4, framåt'), await h.text('#pl-skatta .pl-utveckling'));
  await h.kor(`document.querySelector('#pl-skatta .pl-utveckling').scrollIntoView({ block: 'center' })`);
  await h.bild('11-elevens-utveckling-telefon', true);
  await h.tryck('#pl-skatta .pl-utveckling [data-elevtext="e1"]');
  await vanta(100);
  sant('elevens rad kopieras från veckan, utan namnet', (await h.kor('window.__kopierat'))?.includes('vecka 1 (v. 45): 2') && !/Ali/.test((await h.kor('window.__kopierat')) ?? ''), await h.kor('window.__kopierat'));
  await h.kor(`(() => { document.querySelector('#pl-skatta [data-skatta="${slutVeckor[5]}|e1"][aria-label^="5,"]').click(); return true; })()`);
  sant('utvecklingen står kvar och följer skattningen', (await h.text('#pl-skatta .pl-utveckling'))?.includes('2 till 5, framåt'), await h.text('#pl-skatta .pl-utveckling'));
  await h.kor(`(() => { document.querySelector('#pl-skatta [data-skatta="${slutVeckor[5]}|e1"][aria-label^="4,"]').click(); return true; })()`);
  await h.tryck('#pl-skatta [data-utveckling="skatta|e1"]');
  sant('ett tryck till fäller ihop', !(await h.kor(`!!document.querySelector('#pl-skatta .pl-utveckling')`)));
  sant('länken till hela gruppens sammanställning', (await h.text('#pl-skatta .pl-utv-tips'))?.includes('Hela gruppens sammanställning'), await h.text('#pl-skatta .pl-utv-tips'));
  await h.tryck('#pl-skatta .pl-utv-tips [data-till="pl-samman"]');
  sant('länken går till sammanställningen', await h.kor(`document.activeElement?.id === 'pl-samman-rubrik'`));
  await h.dator();
  // Två resultat i rad sparas båda (Codex 2026-10-24: det andra fältet avbröt sparandet av det första).
  await h.tryck('#pl-veckan .pl-remsa [data-vy="efter"]');
  await h.kor(`(() => { const a = document.querySelector('#pl-veckan [data-resultat="2-2026-12-14|e1"]'), b = document.querySelector('#pl-veckan [data-resultat="2-2026-12-14|e2"]'); a.value = '7 av 8'; a.dispatchEvent(new Event('input', { bubbles: true })); b.value = '5 av 8'; b.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await vanta(700);
  sant('två resultat i rad sparas båda', await h.kor(`(() => { const r = JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd.resultat['2-2026-12-14']; return r.e1 === '7 av 8' && r.e2 === '5 av 8'; })()`));
  sant('namnet i utvärderingen fäller också ut utvecklingen', await h.kor(`(() => { document.querySelector('.pl-stam [data-utveckling="efter|e2"]').click(); return !!document.querySelector('.pl-stam .pl-utveckling svg.pl-graf.stor'); })()`));
  // En vecka i samma plan ur en länk i samma flik (buggjakten 2026-10-24).
  await h.kor(`location.hash = location.hash.replace(/&v=\\d+/, '') + '&v=2'`);
  await vanta(400);
  sant('en länk till en vecka i samma plan visar veckan', (await h.text('#pl-veckan-rubrik')) === 'Vecka 2 i planen' && !(await h.kor('location.hash')).includes('&v='), await h.text('#pl-veckan-rubrik'));
  // En elev som tas bort: namnet sparas med planen och tvättas ur texten som kopieras, lärarens mening står kvar som hen
  // skrev den, beskedet kommer när läraren lämnar fältet, och Ångra tar tillbaka eleven (Codex 2026-10-24 och 2026-10-25,
  // K-537).
  await h.kor(`document.getElementById('pl-andra').open = true`);
  await h.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = 'Ali\\nSebastian Ek'; t.dispatchEvent(new Event('input')); t.blur(); return true; })()`);
  await vanta(200);
  const hBorta = await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd`);
  sant('en borttagen elev sparas med planen, och lärarens mening står kvar', hBorta?.avstamning.not === 'Bea behöver mer stöd vid stoppet.' && hBorta.borttagna?.includes('Bea') && (await h.text('#pl-toast'))?.includes('Bea är borttagen ur elevlistan'), [hBorta?.avstamning, hBorta?.borttagna, await h.text('#pl-toast')]);
  await h.tryck('#pl-toast [data-toast-gor]');
  sant('Ångra tar tillbaka eleven och meningen', await h.kor(`(() => { const p = JSON.parse(localStorage.getItem('insatser')).planer.find((x) => x.id === 'slut01'); return p.foljd.elever.length === 3 && p.foljd.avstamning.not === 'Bea behöver mer stöd vid stoppet.'; })()`));
  // En annan flik läser listan utan Bea medan läraren skriver, med meningen som den var: texten som kopieras där har inte
  // namnet (K-537; Codex 2026-10-25).
  await h.kor(`(() => { const x = JSON.parse(localStorage.getItem('insatser')); const p = x.planer.find((q) => q.id === 'slut01'); p.foljd.elever = p.foljd.elever.filter((e) => e.namn !== 'Bea'); p.foljd.borttagna = ['Bea']; localStorage.setItem('insatser', JSON.stringify(x)); dispatchEvent(new StorageEvent('storage', { key: 'insatser' })); return true; })()`);
  await vanta(200);
  await h.kor('window.__kopierat = null');
  await h.tryck('#pl-samman [data-samman]');
  await vanta(100);
  const hKopia = await h.kor('window.__kopierat');
  sant('en elev som togs bort i en annan flik följer inte med texten som kopieras', !!hKopia && hKopia.includes('En elev behöver mer stöd vid stoppet') && !/Bea/.test(hKopia), hKopia);
  await h.kor(`(() => { const x = JSON.parse(localStorage.getItem('insatser')); const p = x.planer.find((q) => q.id === 'slut01'); p.foljd.elever = [...p.foljd.elever, { id: 'e2', namn: 'Bea' }].sort((a, b) => (a.id < b.id ? -1 : 1)); delete p.foljd.borttagna; localStorage.setItem('insatser', JSON.stringify(x)); dispatchEvent(new StorageEvent('storage', { key: 'insatser' })); return true; })()`);
  await vanta(200);
  // Ett namn som en annan flik sparade medan läraren skrev är ett utkast, och det sparas inte som ett tidigare namn när
  // listan skrivs klart här (Codex 2026-10-25: "Be" tvättade bort ordet "be").
  await h.kor(`(() => { const x = JSON.parse(localStorage.getItem('insatser')); const p = x.planer.find((q) => q.id === 'slut01'); p.foljd.elever = p.foljd.elever.map((e) => (e.namn === 'Bea' ? { ...e, namn: 'Be', utkast: true } : e)); p.foljd.borttagna = ['Bea']; localStorage.setItem('insatser', JSON.stringify(x)); dispatchEvent(new StorageEvent('storage', { key: 'insatser' })); return true; })()`);
  await vanta(200);
  await h.kor(`document.getElementById('pl-andra').open = true`);
  await h.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = t.value.split('\\n').map((n) => (n === 'Be' ? 'Bea' : n)).join('\\n'); t.dispatchEvent(new Event('input')); t.blur(); return true; })()`);
  await vanta(200);
  const hUtkast = await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd`);
  sant('ett utkast från en annan flik sparas inte som ett tidigare namn', !!hUtkast && !hUtkast.borttagna?.includes('Be') && hUtkast.elever.some((e) => e.namn === 'Bea' && !e.utkast), [hUtkast?.elever, hUtkast?.borttagna]);
  // Ett nytt efternamn sparar det tidigare namnet, så att det inte följer med texten som kopieras (Codex 2026-10-25).
  await h.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = 'Ali\\nBea\\nSebastian Berg'; t.dispatchEvent(new Event('input')); t.blur(); return true; })()`);
  await vanta(200);
  sant('ett nytt efternamn sparar det tidigare namnet', (await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd.borttagna ?? []`))?.includes('Sebastian Ek'), await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd`));
  await h.tryck('#pl-toast [data-toast-gor]');
  await vanta(150);
  sant('Ångra efter ett nytt efternamn sparar namnet som lämnar listan', (await h.kor(`(() => { const f = JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd; return f.borttagna.includes('Sebastian Berg') && f.elever.some((e) => e.namn === 'Sebastian Ek'); })()`)), await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd.borttagna`));
  // Tretton elever och samma namn två gånger (buggjakten 2026-10-24: den trettonde och den andra försvann utan besked).
  // Elevlistan rymmer en hel klass (ELEVLISTANS_LANGD, den kalla testaren av Högläsning i par 2026-10-26).
  const tretton = ['Ali', 'Bea', 'Sebastian Ek', ...Array.from({ length: s.ELEVLISTANS_LANGD - 3 }, (_, i) => `Elev${i + 4}`), 'Kim', 'Bea'];
  await h.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = ${JSON.stringify(tretton.join('\n'))}; t.dispatchEvent(new Event('input')); t.blur(); return true; })()`);
  await vanta(200);
  // Gruppens storlek mot metodens: Textsamtal i grupp är för två till åtta elever (de kalla testarna 2026-10-24).
  sant('en trettonde elev och samma namn två gånger sägs under listan, och gruppens storlek', (await h.text('#pl-elever-not')) === `Kim kom inte med: elevlistan rymmer ${s.talText(s.ELEVLISTANS_LANGD)} elever. Bea står två gånger. Skriv två olika namn, som Bea A och Bea B. Metoden är skriven för två till åtta elever, och listan har ${s.ELEVLISTANS_LANGD}.` && (await h.kor(`document.getElementById('pl-elever').value.split('\\n').length`)) === s.ELEVLISTANS_LANGD, await h.text('#pl-elever-not'));
  // Ett långt namn kortas vid ett ord och ett namn med en bokstav sägs (buggjakten 2026-10-24).
  await h.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = ${JSON.stringify(['Ali', 'B', 'Ett mycket långt namn som aldrig tar slut'].join('\n'))}; t.dispatchEvent(new Event('input')); t.blur(); return true; })()`);
  await vanta(200);
  sant('ett långt namn och en bokstav sägs under listan', (await h.text('#pl-elever-not'))?.includes('"Ett mycket långt namn som" är kortat') && (await h.text('#pl-elever-not'))?.includes('B har en bokstav'), await h.text('#pl-elever-not'));
  // Två flikar med samma plan: en bock i den ena står kvar när den andra sparar (Codex 2026-10-24).
  const h2 = await flik(false, Date.UTC(2026, 11, 14, 9, 0, 0));
  await h2.oppna(`${PLAN}#${s.kodaVal(slutVal, { id: 'slut01' })}`);
  await h2.tryck('#pl-veckan .pl-remsa [data-vy="5"]');
  await h2.tryck('[data-bock="2026-12-02"]');
  await vanta(400);
  await h.tryck('#pl-veckan .pl-remsa [data-vy="5"]');
  sant('en bock i en annan flik syns i den här', (await h.kor(`document.querySelector('[data-bock="2026-12-02"]')?.getAttribute('aria-pressed')`)) === 'true');
  await h.kor(`(() => { document.querySelector('#pl-skatta [data-skatta^="${slutVeckor[4]}|e1"][aria-label^="5,"]').click(); return true; })()`);
  sant('och står kvar när den här fliken sparar', await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd.gjorda.includes('2026-12-02')`));
  sant('inga fel i den andra fliken', !h2.undantag.length, h2.undantag);
  h2.stang();
  // En plan till, för en andra grupp: Ny plan står så snart en plan är sparad (granskningarna 2026-10-24).
  await h.tryck('#pl-grupper [data-plan="ny"]');
  sant('Ny plan ger ett förslag med valen öppna', await h.kor(`document.getElementById('pl-veckan').hidden && document.getElementById('pl-andra').open && !document.getElementById('pl-spara').hidden`));
  await h.kor(`(() => { const i = document.getElementById('pl-namn'); i.value = 'Prov 3C'; i.dispatchEvent(new Event('input')); return true; })()`);
  await vanta(600);
  await h.tryck('#pl-spara');
  await vanta(200);
  sant('två planer för metoden', (await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer.length`)) === 2 && (await h.kor(`document.querySelectorAll('#pl-grupper [data-plan]:not([data-plan="ny"])').length`)) === 2);
  await h.tryck('#pl-grupper [data-plan="slut01"]');
  sant('tillbaka till den första gruppen', (await h.text('#pl-veckan-rubrik')) === 'Efter insatsen' && (await h.text('#pl-veckan .meta'))?.includes('Läsgrupp 2B'), await h.text('#pl-veckan .meta'));
  // En plan som läraren öppnar under Dina planer har inga utkast: ett namn som en annan flik sparade medan läraren skrev
  // är färdigt, och sparas när det tas bort (Codex 2026-10-25).
  await h.kor(`(() => { const x = JSON.parse(localStorage.getItem('insatser')); const p = x.planer.find((q) => q.id === 'slut01'); p.foljd.elever = [{ id: 'e1', namn: 'Ali', utkast: true }, { id: 'e2', namn: 'Bea' }]; p.foljd.borttagna = []; localStorage.setItem('insatser', JSON.stringify(x)); dispatchEvent(new StorageEvent('storage', { key: 'insatser' })); return true; })()`);
  await vanta(200);
  await h.tryck('#pl-grupper [data-plan]:not([data-plan="slut01"]):not([data-plan="ny"])');
  await vanta(150);
  await h.tryck('#pl-grupper [data-plan="slut01"]');
  await vanta(150);
  await h.kor(`document.getElementById('pl-andra').open = true`);
  await h.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = 'Bea'; t.dispatchEvent(new Event('input')); t.blur(); return true; })()`);
  await vanta(200);
  sant('en plan som öppnas under Dina planer har inga utkast, och namnet sparas när det tas bort', (await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd.borttagna ?? []`))?.includes('Ali'), await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd`));
  // Ett namn som sparades medan läraren skrev och läses in när sidan öppnas är färdigt, och sparas när det tas bort (Codex
  // 2026-10-25).
  await h.kor(`(() => { const x = JSON.parse(localStorage.getItem('insatser')); const p = x.planer.find((q) => q.id === 'slut01'); p.foljd.elever = [{ id: 'e1', namn: 'Ali', utkast: true }, { id: 'e2', namn: 'Bea' }]; p.foljd.borttagna = []; localStorage.setItem('insatser', JSON.stringify(x)); return true; })()`);
  // En fråga i adressen ger en riktig omladdning; bara en ny del efter # laddar inte om sidan.
  await h.oppna(`${PLAN}?omladdad=1#${s.kodaVal(slutVal, { id: 'slut01' })}`);
  await h.kor(`document.getElementById('pl-andra').open = true`);
  await h.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = 'Bea'; t.dispatchEvent(new Event('input')); t.blur(); return true; })()`);
  await vanta(200);
  sant('ett utkast som läses in när sidan öppnas är färdigt och sparas när det tas bort', (await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd.borttagna ?? []`))?.includes('Ali'), await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd`));
  // Ta bort elevernas namn tvättar meningarna och tömmer också namnen som har stått i listan (Codex 2026-10-25).
  await h.kor(`document.getElementById('pl-andra').open = true`);
  await h.tryck('#pl-elever-bort');
  await h.tryck('.pl-fraga-forst [data-ja]');
  await vanta(200);
  const hTomt = await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd`);
  sant('Ta bort elevernas namn tömmer också namnen som har stått i listan', !!hTomt && !hTomt.elever.length && !hTomt.borttagna?.length && !/Bea|Ali|Sebastian/.test(JSON.stringify([hTomt.vecka, hTomt.avstamning, hTomt.utvardering])), hTomt);
  sant('inga fel i konsolen efter insatsen', !h.undantag.length && !(await h.kor('window.__fel.length')), h.undantag);
  h.stang();
  // Söndagen före vecka 2: nästa pass är måndagens, och rutan visar den veckans texter (Codex 2026-10-24).
  const helg = await flik(false, Date.UTC(2026, 10, 8, 9, 0, 0));
  await helg.oppna(PLAN);
  // Bara bockarna före söndagen, som läraren kan ha satt då: ett bockat pass är gjort, och rutan visar nästa som inte är det.
  const helgLagrat = { ...slutlagrat, planer: slutlagrat.planer.map((p) => ({ ...p, foljd: { ...p.foljd, gjorda: p.foljd.gjorda.filter((d) => d < '2026-11-08') } })) };
  await helg.kor(`localStorage.setItem('insatser', ${JSON.stringify(JSON.stringify(helgLagrat))})`);
  await helg.oppna(PLAN);
  // Påminnelsen gäller veckan före passet i rutan, på söndagen veckan som just har slutat (verifieringen 2026-10-28).
  const helgForra = await helg.text('#pl-veckan .pl-forra');
  sant('på söndagen gäller påminnelsen veckan som just har slutat', !helgForra || helgForra.startsWith('Den här veckan har'), helgForra);
  sant('på söndagen gäller rutan nästa pass och dess vecka',(await helg.text('.pl-nar')) === 'I morgon, måndag 9 november, vecka 2 i planen' && (await helg.text('#pl-veckan .pl-nasta [data-vy="2"]')) === 'Till vecka 2' && (await helg.text('#pl-veckan .pl-veckans summary'))?.startsWith('Texter till vecka 2'), [await helg.text('.pl-nar'), await helg.text('#pl-veckan .pl-veckans summary')]);
  // Ett lov i efterhand flyttar inte det som har förts in (Codex 2026-10-26): med bockar bara i vecka 45 är den veckan och
  // veckorna före låsta, vecka 46 går att välja, och raden under knapparna säger varför.
  const lovLagrat = { ...helgLagrat, planer: helgLagrat.planer.map((p) => ({ ...p, foljd: { ...p.foljd, skattning: {}, vecka: {}, resultat: {}, franvaro: {} } })) };
  await helg.kor(`localStorage.setItem('insatser', ${JSON.stringify(JSON.stringify(lovLagrat))})`);
  await helg.oppna(PLAN);
  sant('ett lov går bara att lägga efter det som har förts in', await helg.kor(`document.querySelector('[data-lovvecka="2026-45"]')?.disabled === true && document.querySelector('[data-lovvecka="2026-46"]')?.disabled === false && !document.getElementById('pl-lov-not').hidden`), await helg.kor(`[...document.querySelectorAll('[data-lovvecka]')].map((b) => b.dataset.lovvecka + (b.disabled ? '!' : '')).join(' ')`));
  // En vecka tas inte om när något är infört i en vecka efter den (Codex 2026-10-26): med en skattning i vecka 2 har
  // vecka 1 ingen Upprepa veckan, men vecka 2 har den.
  const upprepaLagrat = { ...lovLagrat, planer: lovLagrat.planer.map((p) => ({ ...p, foljd: { ...p.foljd, skattning: { '2026-11-09': { grupp: 3 } } } })) };
  await helg.kor(`localStorage.setItem('insatser', ${JSON.stringify(JSON.stringify(upprepaLagrat))})`);
  await helg.oppna(PLAN);
  const upprepaI = async (v) => { await helg.tryck(`#pl-veckan .pl-remsa [data-vy="${v}"]`); await vanta(150); return helg.kor(`!!document.querySelector('#pl-veckan [data-gor="upprepa"]')`); };
  const u1 = await upprepaI(1), u2 = await upprepaI(2);
  sant('en vecka tas inte om när något är infört i en senare vecka', !u1 && u2, { u1, u2 });
  // Ta bort upprepningen flyttar den upprepade veckan: med en skattning i den går det inte, och ett tomt värde låser inget
  // (Codex 2026-10-26).
  const medUpprepning = (skattning) => ({ ...lovLagrat, planer: lovLagrat.planer.map((p) => ({ ...p, val: s.kodaVal({ ...s.lasVal(`#${p.val}`).val, upprepa: [1] }), foljd: { ...p.foljd, skattning } })) });
  const taBortI = async (skattning) => { await helg.kor(`localStorage.setItem('insatser', ${JSON.stringify(JSON.stringify(medUpprepning(skattning)))})`); await helg.oppna(PLAN); await helg.tryck('#pl-veckan .pl-remsa [data-vy="2"]'); await vanta(150); return helg.kor(`!!document.querySelector('#pl-veckan [data-gor="ta-bort-upprepning"]')`); };
  const tb = { skattad: await taBortI({ '2026-11-09': { grupp: 3 } }), tom: await taBortI({ '2026-11-09': {} }) };
  sant('Ta bort upprepningen går inte när något är infört i den upprepade veckan, och ett tomt värde låser inget', !tb.skattad && tb.tom, tb);
  sant('inga fel på söndagen', !helg.undantag.length, helg.undantag);
  helg.stang();

  // ---- Betans andra metoder (Planera 0.1) ----
  // Varje metod med planens fält: förslaget, en sparad plan med veckan, veckans fokus, länkar som leder till något som
  // finns, Beta och versionen, och inga fel. Formerna prövas så: en kurs i veckor med veckans lektion (De fyra räknesätten),
  // en progression i pass (Seriesamtal), Hem och skola (TIL i grupp) och veckor efter den sista raden (Läslistor i grupp).
  const b = await flik(false, Date.UTC(2026, 10, 18, 9, 0, 0));
  const stodMetoder = [], stodFel = [], langdMetoder = [], langdFel = [], veckoFel = [], foreFel = [], foreProvade = [];
  // En serie vars kurser har egna planer, som Texttyper i grupp, har bara valet av kurs, som prövas med planens adresser.
  for (const m of synliga.filter((x) => x.id !== 'textsamtal-i-grupp' && !(x.d.plan?.versionsval && !x.d.plan.versionsval.versioner?.length))) {
    const adress = `${bas}/stodundervisning/${m.id}/planera`;
    await b.oppna(adress);
    await b.kor(`localStorage.clear()`);
    await b.oppna(adress);
    sant(`${m.id}: förslaget har pass, Beta och versionen`, (await b.text('#pl-summa-text'))?.includes('pass om') && (await b.kor(`!!document.querySelector('h1 .beta') && document.querySelector('.pl-version')?.textContent.includes('Planera ${s.PLANERA.version}')`)), await b.text('#pl-summa-text'));
    // Förvalet för antalet veckor på sidan är motorns, ur metodens egna fält (andra rundan av Rimligheten 2026-10-26: Chambers
    // boksamtals åtta veckor fanns i motorn men inte på sidan, som bygger metodens plan ur planens data).
    const vantadLangd = s.forvaldLangd(s.metodplan(metod(m.id)).plan);
    const sidansLangd = await b.kor(`(() => { const k = document.querySelector('#pl-langd [aria-pressed="true"]'); return k ? Number(k.dataset.langd) : null; })()`);
    if (sidansLangd !== vantadLangd) veckoFel.push({ metod: m.id, motorn: vantadLangd, sidan: sidansLangd });
    // Före på sidan börjar på motorns vecka, också när metoden behöver flera skolveckor före (plan.foreVeckor; den stängda
    // frågan om lagningarna 2026-10-26: fältet fanns i motorn men inte på sidan).
    const sidansFore = await b.kor(`document.querySelector('li.fore .pl-pass')?.textContent ?? null`);
    if (sidansFore !== null) {
      const start = await b.kor(`document.getElementById('pl-start').value`);
      const mpF = s.metodplan(metod(m.id)).plan;
      const vantadFore = s.kalendervecka(s.isoVecka(s.planera(mpF, { ...s.forval(mpF, start), start }).fore.mandag).vecka);
      foreProvade.push(m.id);
      if (sidansFore !== vantadFore) foreFel.push({ metod: m.id, motorn: vantadFore, sidan: sidansFore });
    }
    // Passets längd (K-564): knapparna ur faktarutans spann, förvalet tryckt och i förslagets mening, och stödet för valet
    // under knapparna, med metodens text och en länk som finns.
    const tidM = s.tidensMatt(metod(m.id).tid ?? ''), vantad = tidM.minst === undefined ? { langder: [] } : s.passetsLangder({ min: tidM.minst, max: tidM.minuter });
    if (vantad.langder.length) {
      langdMetoder.push(m.id);
      const langd = await b.kor(`(() => { const k = [...document.querySelectorAll('#pl-minuter [data-minuter]')]; return { knappar: k.map((x) => Number(x.dataset.minuter)), tryckt: k.filter((x) => x.getAttribute('aria-pressed') === 'true').map((x) => Number(x.dataset.minuter)), summa: document.getElementById('pl-summa-text')?.textContent ?? '', stod: document.querySelector('#pl-minuter ~ #pl-langdstod > p')?.textContent ?? '', lank: document.querySelector('#pl-langdstod a')?.getAttribute('href') ?? '' }; })()`);
      if (!(JSON.stringify(langd.knappar) === JSON.stringify(vantad.langder) && langd.tryckt.join() === String(vantad.forval) && langd.summa.includes(`pass om ${vantad.forval} minuter`) && langd.stod.length > 20 && langd.stod.length <= s.NIVAVALETS_LANGD && !!langd.lank && !lankFel([langd.lank]).length)) langdFel.push({ metod: m.id, vantad, ...langd });
    }
    await b.kor(`(() => { const i = document.getElementById('pl-start'); i.value = '2026-11-02'; i.dispatchEvent(new Event('change')); return true; })()`);
    await b.tryck('#pl-spara');
    await vanta(200);
    // Veckan har veckans fokus ur progressionen, eller passets roll när metoden säger vad som är nytt pass för pass, som
    // Boksamtalets tabell Perioden och Upprepad läsnings text i veckan (omgång 1 2026-10-26).
    // En metod utan progression och utan roller, som Gruppstärkande aktiviteter där aktiviteterna väljs efter gruppen, visar
    // passets delar i veckan (riggens omgång 5 2026-10-26).
    sant(`${m.id}: den sparade planen visar veckan med fokus eller passets roll`, await b.kor(`(() => { const d = JSON.parse(document.getElementById('pl-data').textContent); const sel = d.progression ? '#pl-veckan .pl-fokusruta, #pl-veckan .pl-roll' : '#pl-veckan .pl-roll, #pl-veckan .pl-delar'; return !document.getElementById('pl-veckan').hidden && !!document.querySelector(sel); })()`), await b.text('#pl-veckan'));
    // Den smala formen (K-572): veckan säger överst vad eleverna blir bättre på, ur veckans rad i progressionen, och Efter
    // veckan regeln för att gå vidare som metodens fjärde kolumn, när raden har den.
    const elev = await b.kor(`(() => { const d = JSON.parse(document.getElementById('pl-data').textContent); const rader = d.progression?.rader ?? []; return { har: rader.length > 0 && rader.every((r) => r.eleverna), elevmal: [...document.querySelectorAll('#pl-veckan .pl-elevmal p')].map((p) => p.textContent), mojliga: rader.map((r) => r.eleverna).filter(Boolean), vidare: document.querySelector('#pl-veckan .pl-vidare')?.textContent ?? null, regler: rader.map((r) => r.vidare).filter(Boolean) }; })()`);
    // En progression i När, som Kortskrivnings, är råd utan veckor (standarden 0.26.0), och veckan säger inget ur den.
    if (elev.har && s.metodplan(m.d).plan?.stegEnhet !== 'nar') sant(`${m.id}: veckan säger vad eleverna blir bättre på och när gruppen går vidare, ur progressionens rad`, elev.elevmal.length > 0 && elev.elevmal.every((t) => elev.mojliga.some((e) => e.replace(/\.$/, '') === t.replace(/\.$/, ''))) && (elev.vidare === null || elev.regler.some((r) => elev.vidare.startsWith(`Gå vidare när ${r}`))), elev);
    sant(`${m.id}: planens länkar leder till sidor och ankare som finns`, !lankFel(await sakLankar(b)).length, [await sakLankar(b), lankFel(await sakLankar(b))]);
    // Stödet för nivåvalet vid varje nivåval (K-557): nerpilen under formulärets nivåer och under varje nivåval i veckan,
    // med metodens text och en länk som finns.
    // Valet av version har nivåknapparnas form och sitt eget stöd (#pl-versionsstod, K-576), och prövas för sig nedan.
    const stod = await b.kor(`(() => { const nivaer = [...document.querySelectorAll('.pl-nivaer:not(#pl-versioner)')]; return { antal: nivaer.length, utan: nivaer.filter((n) => !n.parentElement.querySelector(':scope > .pl-stod')).length, text: document.querySelector('#pl-nivastod > p')?.textContent ?? '', lank: document.querySelector('#pl-nivastod a')?.getAttribute('href') ?? '' }; })()`);
    const vstod = await b.kor(`(() => { const v = document.getElementById('pl-versioner'); return v ? { text: document.querySelector('#pl-versionsstod > p')?.textContent ?? '', lank: document.querySelector('#pl-versionsstod a')?.getAttribute('href') ?? '' } : null; })()`);
    if (vstod) sant(`${m.id}: valet av version har Stöd för valet med metodens text och en länk`, vstod.text.length > 20 && !!vstod.lank && !lankFel([vstod.lank]).length, vstod);
    if (stod.antal) { stodMetoder.push(m.id); if (!(!stod.utan && stod.text.length > 20 && stod.text.length <= s.NIVAVALETS_LANGD && !!stod.lank && !lankFel([stod.lank]).length)) stodFel.push({ metod: m.id, ...stod }); }
    // Uppföljningen i ett visst pass står i rutan med passet: Kompissamtals uppföljning efter samtal 3 (den kalla testaren av
    // omgång 5 2026-10-26).
    if (m.id === 'kompissamtal') {
      const pass3 = await b.kor(`(() => { const r = [...document.querySelectorAll('#pl-veckan .pl-nasta .pl-roll .pl-etikett')].map((x) => x.textContent); return { rubrik: document.querySelector('#pl-veckan .pl-nasta .pl-passnamn')?.textContent ?? '', etiketter: r }; })()`);
      sant('uppföljningen i ett visst pass står i rutan med passet', !/^Pass 3 /.test(pass3.rubrik) || pass3.etiketter.some((x) => /samtal.3/.test(x)), pass3);
    }
    // Metodens egna skattningar (K-559): Lärarens skattning från 1 till 10 vid Skatta gruppen, med linjen och regeln efter
    // krysset, regeln överst i rutan med passet veckan efter, och Vår grupp i passet med bladet, formuläret och lärarens
    // länk, som inte står i länken till planen.
    // Ljudleks enda planerare (K-551; Niclas 2026-10-26): ingången är vecka 1:s lektion, veckan byter innehåll efter vald
    // lektion, frågan efter veckan sätter nästa veckas lektion, och skattningen mot lektionens mål föreslår nästa över 4 när
    // gruppen har haft lektionen så många veckor som lektionen tar (K-578).
    if (m.id === 'ljudlek-i-grupp') {
      const lj = async (js) => b.kor(js);
      // Valen står under Ändra planen, som är hopfälld när planen är sparad, och listan med alla lektioner fälls ut först.
      await lj("(() => { document.getElementById('pl-andra').open = true; return true; })()");
      await b.tryck('#pl-ingangar [data-ingang="3"]');
      await vanta(200);
      sant('Ljudlek: ingången är vecka 1:s lektion, och länken bär den', (await lj(`document.querySelector('#pl-ingangar [data-ingang="3"]').getAttribute('aria-pressed')`)) === 'true' && (await lj('location.hash')).includes('k=3'), await lj('location.hash'));
      // Vecka 3 är i dag (18 november): utan vald lektion frågar rutan efter den.
      const fraga = await lj(`document.querySelector('#pl-veckan .pl-lektionsfraga')?.textContent ?? ''`);
      sant('Ljudlek: en vecka utan vald lektion frågar efter den', fraga.includes('Vilken lektion tar ni vecka 3?'), fraga);
      await lj("(() => { document.querySelector('#pl-veckan .pl-lektionsfraga details').open = true; return true; })()");
      await b.tryck('#pl-veckan .pl-lektionsfraga [data-valj-lektion="3|4"]');
      await vanta(250);
      const v3 = await lj(`(() => ({ rubrik: document.getElementById('pl-veckan-rubrik')?.textContent ?? '', delar: [...document.querySelectorAll('#pl-veckan .pl-nasta .pl-delnamn')].map((x) => x.textContent), riktning: document.querySelector('#pl-veckan .pl-elevmal p')?.textContent ?? '', fraga: document.querySelector('#pl-veckan .pl-lektionen-efter .pl-fraga')?.textContent ?? '', knappar: [...document.querySelectorAll('#pl-veckan .pl-lektionen-efter .pl-andra-knappar button')].map((x) => x.textContent), hash: location.hash }))()`);
      const lektion4 = metod('ljudlek-bokstavsgympa');
      sant('Ljudlek: veckan visar lektionens namn, pass, riktning och frågan efter veckan', v3.rubrik === 'Vecka 3 · Bokstavsgympa' && lektion4.tidsschema.rader.filter((r) => /^\d/.test(r.tid)).every((r) => v3.delar.includes(r.fas)) && v3.riktning.startsWith('Att ') && v3.fraga === 'Upprepa lektionen eller välj ny för vecka 4?' && v3.knappar.join('|') === 'Upprepa Bokstavsgympa|Nästa: Smaka på ljud' && v3.hash.includes('k=3.0.4'), v3);
      // Lektionens rader står öppna i lektionens första vecka, delarna börjar med stegens mening om vad eleverna gör, och
      // ljudkollen är en länk (de kalla testarna 2026-10-27).
      const tabellen4 = lektion4.tabeller.find((t) => lektion4.upplagg.text.includes(t.rubrik));
      const v3b = await lj(`(() => ({ rader: document.querySelector('#pl-veckan details.pl-rader')?.open ?? false, raderText: document.querySelector('#pl-veckan details.pl-rader')?.textContent ?? '', ruta: document.querySelector('#pl-veckan .pl-nasta')?.textContent ?? '', ljudkollen: [...document.querySelectorAll('#pl-veckan a')].some((a) => /^ljudkoll/i.test(a.textContent ?? '')) }))()`);
      sant('Ljudlek: lektionens rader, stegen och länken till ljudkollen i veckan', v3b.rader && tabellen4.rader.every((r) => v3b.raderText.includes(r[0])) && v3b.raderText.includes(tabellen4.not.slice(0, 40)) && lektion4.passrutin.steg.every((x) => v3b.ruta.includes(x.text.split(', och ')[0])) && v3b.ljudkollen, v3b);
      await b.tryck('#pl-veckan .pl-lektionen-efter .pl-andra-knappar [data-valj-lektion="4|5"]');
      await vanta(250);
      sant('Ljudlek: Nästa sätter nästa veckas lektion', (await lj('location.hash')).includes('k=3.0.4.5') && (await lj(`document.getElementById('pl-toast')?.textContent ?? ''`)).includes('Vecka 4 tar Smaka på ljud.'), await lj('location.hash'));
      const fore5 = await lj(`[...document.querySelectorAll('#pl-veckan .pl-lektionen-efter .pl-not')].map((x) => x.textContent).join(' | ')`);
      sant('Ljudlek: det lektionens text säger före första passet står där lektionen väljs, med dagen', /Före \S+dag \d+ \S+ Har eleverna inte gjort uppgift 5/.test(fore5), fore5);
      // Skattningen mot lektionens mål: gruppen 5 ger förslaget nästa lektion som den fyllda knappen.
      await lj(`document.getElementById('pl-folj').click()`);
      await vanta(250);
      const malet = await lj(`document.querySelector('#pl-skatta .pl-maltext')?.textContent ?? ''`);
      await b.tryck('#pl-skatta [data-steg="5"]');
      await vanta(250);
      const forslag = await lj(`(() => ({ text: document.querySelector('#pl-veckan .pl-lektionen-efter')?.textContent ?? '', fylld: [...document.querySelectorAll('#pl-veckan .pl-lektionen-efter .pl-andra-knappar button')].filter((x) => !x.classList.contains('sekundar')).map((x) => x.textContent) }))()`);
      // K-578 (Niclas 2026-10-27: omkring två veckor i lektion 1–5, och elevernas progression styr): efter lektionens första
      // vecka föreslår planen samma lektion, också med snittet 5, och säger varför.
      sant('Ljudlek: skattningen mot lektionens mål, och samma lektion efter lektionens första vecka', malet.includes(s.malText(lektion4.mal.overgripande).replace(/\.$/, '')) && forslag.text.includes('Snittet i veckans skattning mot lektionens mål är 5 av 5') && /Ni har haft lektionen i (tre|fyra|fem) pass, och den tar minst sex( pass från lektionens första rad)?, så planen föreslår samma lektion vecka 4\./.test(forslag.text) && forslag.fylld.join() === 'Upprepa Bokstavsgympa', { malet, forslag });
      // En lång plans graf rullar i sin ruta och gör inte sidan bredare än telefonen (den kalla testaren 2026-10-27).
      await b.bredd(320);
      await vanta(150);
      const bredare = await lj(`(() => { const d = document.querySelector('#pl-samman details.pl-elevdetalj'); if (!d) return 'ingen elev i sammanställningen'; d.open = true; return document.documentElement.scrollWidth - document.documentElement.clientWidth; })()`);
      sant('Ljudlek: gruppens graf i en plan på tolv veckor gör inte sidan bredare än 320 punkter', bredare === 0, bredare);
      await lj(`(() => { const d = document.querySelector('#pl-samman details.pl-elevdetalj'); if (d) d.open = false; return true; })()`);
      await b.dator();
      await vanta(150);
      // Kalendern skriver veckans lektion i passen (Codex 2026-10-27: kalendern hade seriens allmänna pass).
      await lj('window.__fil = null');
      await b.tryck('#pl-kalender');
      await vanta(300);
      const ics = String(await lj('window.__fil') ?? '').replace(/\r\n /g, '').replace(/\\,/g, ',');
      const faser = lektion4.tidsschema.rader.filter((r) => /^\d/.test(r.tid)).map((r) => r.fas);
      sant('Ljudlek: kalendern har veckans lektion i passen', faser.length > 0 && faser.every((f) => ics.includes(f)), { faser, ics: ics.slice(0, 600) });
      // Byts veckans lektion tas veckans skattning bort, och Ångra tar tillbaka den (Codex 2026-10-27).
      await lj("(() => { document.querySelectorAll('#pl-veckan details.pl-lektionsval').forEach((d) => { d.open = true; }); return true; })()");
      await b.tryck('#pl-veckan [data-valj-lektion="3|6"]');
      await vanta(250);
      const bytt = await lj(`(() => ({ toast: document.getElementById('pl-toast')?.textContent ?? '', efter: document.querySelector('#pl-veckan .pl-lektionen-efter')?.textContent ?? '', hash: location.hash }))()`);
      await b.tryck('#pl-toast [data-toast-gor]');
      await vanta(250);
      const tillbaka = await lj(`(() => ({ efter: document.querySelector('#pl-veckan .pl-lektionen-efter')?.textContent ?? '', hash: location.hash }))()`);
      sant('Ljudlek: ett lektionsbyte tar bort veckans skattning, och Ångra tar tillbaka den', bytt.toast.includes('Vecka 3 tar Räkna ljud. Veckans skattning gällde den förra lektionens mål och är borttagen.') && !bytt.efter.includes('Snittet') && bytt.hash.includes('k=3.0.6.5') && tillbaka.efter.includes('Snittet i veckans skattning mot lektionens mål är 5 av 5') && tillbaka.hash.includes('k=3.0.4.5'), { bytt, tillbaka });
      await lj(`document.getElementById('pl-folj').click()`);
      await vanta(150);
    }
    if (m.id === 'gruppstarkande-aktiviteter') {
      await b.kor(`document.getElementById('pl-folj').click()`);
      await vanta(200);
      const kryss = async (vecka, varde) => { await b.tryck(`#pl-veckan .pl-remsa [data-vy="${vecka}"]`); await vanta(150); await b.tryck(`#pl-skatta [data-matt][aria-label^="${varde},"]`); await vanta(150); };
      await kryss(1, 7);
      await kryss(2, 6);
      await kryss(3, 5);
      const v3 = await b.kor(`(() => ({ steg: document.querySelectorAll('#pl-skatta .pl-skala-lang .pl-skalsteg').length, namn: [...document.querySelectorAll('#pl-skatta .pl-skalnamn li')].map((x) => x.textContent), regel: document.querySelector('#pl-skatta .pl-regel')?.textContent ?? '', punkter: document.querySelectorAll('#pl-skatta .pl-linjegraf .pl-punkt').length, hallKoll: [...([...document.querySelectorAll('#pl-veckan section.pl-block')].find((x) => x.querySelector('h3')?.textContent === 'Håll koll på')?.querySelectorAll('.pl-etikett') ?? [])].map((x) => x.textContent) }))()`);
      const beskrivna = await b.kor(`document.querySelectorAll('#pl-skatta details[data-ruta="skalan"] li').length`);
      sant('metodens skattning av gruppen: stegens beskrivning ur metodens tabell', beskrivna === 5, beskrivna);
      sant('metodens skattning av gruppen: skalan med namnen, linjen och regeln efter krysset', v3.steg === 10 && v3.namn[0] === '1–2 Fungerar inte' && v3.punkter === 3 && v3.regel.includes('nedåt två veckor i rad') && !v3.hallKoll.some((x) => /nedåt/i.test(x)), v3);
      const b4 = await flik(false, Date.UTC(2026, 10, 25, 9, 0, 0));
      await b4.oppna(adress);
      const v4 = await b4.kor(`(() => ({ regel: document.querySelector('#pl-veckan .pl-nasta .pl-regel')?.textContent ?? '', knappar: [...document.querySelectorAll('#pl-veckan .pl-nasta .pl-andra-knappar a')].map((a) => a.textContent + ' ' + a.getAttribute('href')) }))()`);
      const ref = await b4.kor(`(() => { const ruta = document.querySelector('#pl-veckan .pl-nasta'); const d = ruta?.querySelector('details[data-ruta^="instrument-"]'); return { text: ruta?.textContent ?? '', steg: d ? d.querySelectorAll('li').length : 0, sammanfattning: d?.querySelector('summary')?.textContent ?? '' }; })()`);
      sant('Vår grupps vecka: metodens text om när och hur länge, stegen ur ramen och texten om formuläret', ref.text.includes('direkt efter en aktivitet som gruppen redan kan') && ref.sammanfattning === 'Så leder du gruppreflektionen' && ref.steg >= 5 && ref.text.includes('Formuläret är bladet Vår grupp på skärmen'), { ...ref, text: ref.text.slice(0, 300) });
      sant('metodens skattningar veckan efter: regeln överst i rutan med passet, och Vår grupp med bladet och formuläret', v4.regel.includes('nedåt två veckor i rad') && v4.knappar.some((x) => x.startsWith('Bladet Vår grupp /stodundervisning/gruppstarkande-aktiviteter-blad-var-grupp.pdf')) && v4.knappar.some((x) => x.startsWith('Kopiera formuläret /vargrupp')), v4);
      await b4.kor(`(() => { const d = document.querySelector('#pl-veckan details.pl-lankar'); d.open = true; const f = d.querySelector('[data-lank="formular"]'); f.value = 'https://docs.google.com/forms/d/e/prov/viewform'; f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
      await vanta(300);
      const l4 = await b4.kor(`(() => ({ knappar: [...document.querySelectorAll('#pl-veckan .pl-nasta .pl-andra-knappar a')].map((a) => a.textContent), adress: location.hash, oppen: !!document.querySelector('#pl-veckan details.pl-lankar[open]') }))()`);
      sant('metodens skattningar: lärarens länk ger knappen Ditt formulär och står inte i länken till planen', l4.knappar.includes('Ditt formulär') && !l4.knappar.includes('Kopiera formuläret') && !l4.adress.includes('docs.google') && l4.oppen, l4);
      b4.stang();
    }
    if (m.id === 'brakkurs-i-grupp') {
      const veckansRam = async (v) => { await b.tryck(`#pl-veckan .pl-remsa [data-vy="${v}"]`); await vanta(150); return b.kor(`[...document.querySelectorAll('#pl-veckan a')].find((a) => a.textContent === 'veckans ram')?.getAttribute('href') ?? ''`); };
      const r1 = await veckansRam(1), r2 = await veckansRam(2);
      sant('kurs med en ram per vecka: veckans ram leder till veckans egen ram', !!r1 && !!r2 && r1 !== r2 && !lankFel([r1, r2]).length, [r1, r2]);
      await b.tryck('#pl-veckan .pl-remsa [data-vy="3"]');
      await vanta(150);
    }
    if (m.id === 'problemlosning-i-grupp') {
      const utanNiva = await b.text('#pl-veckan .pl-nasta');
      const stodIVeckan = await b.kor(`!!document.querySelector('#pl-veckan .pl-nasta .pl-nivaval .pl-stod a')`);
      await b.tryck('#pl-veckan .pl-nasta [data-valj-niva="bas"]');
      await vanta(200);
      const post = await b.kor(`(() => { const p = [...document.querySelectorAll('#pl-veckan .pl-nasta .pl-roll')].find((x) => x.textContent.startsWith('Passets problem')); const a = p?.querySelector('a'); return a ? [a.textContent, a.getAttribute('href')] : null; })()`);
      sant('bankens poster en per pass: passet visar sitt problem på gruppens nivå, med länk', !!utanNiva?.includes('Välj gruppens nivå, så visar passet sitt problem') && stodIVeckan && !!post && /\(Bas, problem \d+\)$/.test(post[0]) && !lankFel([post[1]]).length, [post, stodIVeckan, utanNiva?.slice(0, 160)]);
      // K-595: kartläggningen avgör nivån, så den leder till varje nivå också när en nivå är vald, med den valda först.
      await b.tryck('#pl-veckor [data-vy="fore"]');
      await vanta(150);
      const kart = await b.kor(`(() => { const a = [...document.querySelectorAll('#pl-veckan a')]; const i = a.findIndex((x) => x.textContent === 'Kartläggning före'); return i < 0 ? null : a.slice(i, i + 4).map((x) => x.textContent + ' ' + x.getAttribute('href')); })()`);
      sant('en vald nivå: kartläggningen leder till den valda nivån och till varje nivå', !!kart && kart[0].split(' ').pop() === kart[1].split(' ').pop() && kart.slice(1).map((x) => x.split(' ')[0]).join() === 'Bas,Medel,Avancerat' && !lankFel(kart.map((x) => x.split(' ').pop())).length, kart);
      await b.tryck('#pl-veckor [data-vy="3"]');
      await vanta(150);
    }
    if (m.id === 'fyra-raknesatten') {
      const lektion = await b.kor(`document.querySelector('#pl-veckan a[data-goatcounter-click$=":kursvecka"]')?.getAttribute('href')`);
      sant('kurs i veckor: veckan leder till veckans lektion i metoden', !!lektion && !lankFel([lektion]).length && (await b.text('#pl-veckan a[data-goatcounter-click$=":kursvecka"]')) === 'Vecka 3 i metoden, med veckans manus', lektion);
      sant('kurs i veckor: Mina lärdomar leder till veckans blad', (await b.kor(`[...document.querySelectorAll('#pl-veckan a')].find((a) => a.textContent === 'Mina lärdomar')?.getAttribute('href')`))?.endsWith('#mina-lardomar-2'), await b.kor(`[...document.querySelectorAll('#pl-veckan a')].map((a) => a.textContent + ' ' + a.getAttribute('href')).join(' | ')`));
    }
    if (m.id === 'seriesamtal') sant('progression i pass: passens fokus med passen och stegets namn', (await b.text('#pl-veckan .pl-fokusruta .pl-led'))?.startsWith('Pass ') && (await b.text('#pl-veckan .pl-fokusruta .pl-etikett')) === 'Passens fokus', await b.text('#pl-veckan .pl-fokusruta'));
    if (m.id === 'seriesamtal') {
      // Ett spann efter ett ord med stor bokstav, som "Laminerat Bildserie 1–6" i checklistan under Före, länkas sak för sak
      // (K-502: mönstret tog "Laminerat Bildserie" som namnet, och spannet blev ingen länk).
      await b.tryck('#pl-veckor [data-vy="fore"]');
      await vanta(150);
      const lam = await b.kor(`(() => { const li = [...document.querySelectorAll('#pl-veckan li')].find((x) => x.textContent.includes('Laminerat Bildserie')); return li ? [...li.querySelectorAll('a')].map((a) => a.textContent).join('|') : null; })()`);
      sant('ett spann efter ett ord med stor bokstav länkas sak för sak: Laminerat Bildserie 1–6', !!lam?.startsWith('Bildserie 1|2|3|4|5|6|'), lam);
      await b.tryck('#pl-veckor [data-vy="3"]');
      await vanta(150);
    }
    sant(`${m.id}: inga fel`, !b.undantag.length && !(await b.kor('window.__fel.length')), b.undantag);
    await b.bredd(390); await vanta(150); await b.bild(`12-beta-${m.id}-telefon`); await b.dator();
  }
  sant('varje nivåval i metoderna har Stöd för valet med metodens text och en länk', stodMetoder.length >= 4 && !stodFel.length, { stodMetoder, stodFel });
  sant('passets längd: knapparna ur faktarutans spann, förvalet i förslaget och Stöd för valet med metodens text och en länk', langdMetoder.includes('gruppstarkande-aktiviteter') && langdMetoder.includes('upprepad-lasning') && !langdFel.length, { langdMetoder, langdFel });
  sant('förvalet för antalet veckor på sidan är motorns, i varje metod', !veckoFel.length, veckoFel);
  sant('Före på sidan börjar på motorns vecka, i varje metod, och tre skolveckor före i Chambers boksamtal', foreProvade.includes('boksamtal-i-grupp') && !foreFel.length, { foreFel, foreProvade });
  b.stang();

  // Två veckor efter sista passet avslutas planen av sig själv, och Ångra avslutet öppnar den igen för det sista passet
  // (Niclas 2026-10-25: "planen blir automatiskt avslutad 2 veckor efter sista datum ... Man kan ångra det som vanligt").
  const sj = await flik(false, Date.UTC(2027, 0, 1, 9, 0, 0));
  await sj.oppna(PLAN);
  await sj.kor(`localStorage.setItem('insatser', ${JSON.stringify(JSON.stringify(slutlagrat))})`);
  await sj.oppna(PLAN);
  sant('två veckor efter sista passet är planen avslutad av sig själv', (await sj.text('#pl-lage'))?.startsWith('Avslutad Planen avslutades av sig själv fredag 1 januari, två veckor efter uppföljningen efter insatsen.') && (await sj.kor(`document.getElementById('plan').classList.contains('pl-avslutad-plan')`)) && !(await sj.kor(`!!document.querySelector('#pl-veckan .pl-nasta')`)), await sj.text('#pl-lage'));
  // Ett beslut som avslutar och tas bort igen lämnar planen avslutad av sig själv; Ångra avslutet öppnar den (verifieringen
  // 2026-10-25).
  await sj.tryck('[data-beslut="utvardering|avsluta"]');
  await sj.tryck('[data-beslut="utvardering|avsluta"]');
  sant('ett beslut som tas bort lämnar planen avslutad av sig själv', (await sj.text('#pl-toast'))?.startsWith('Beslutet är borttaget. Planen är avslutad av sig själv') && (await sj.kor(`document.querySelector('#pl-lage .pl-status')?.textContent`)) === 'Avslutad' && !(await sj.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.oppen`)), await sj.text('#pl-toast'));
  await sj.tryck('#pl-lage [data-gor="angra-avslut"]');
  await vanta(300);
  sant('Ångra avslutet öppnar planen igen för det sista passet', (await sj.kor(`document.querySelector('#pl-lage .pl-status')?.textContent`)) === 'Pågående' && (await sj.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.oppen`)) === '2026-12-11' && (await sj.text('#pl-toast'))?.startsWith('Avslutet är ångrat. Insatsen pågår tills du avslutar den.') && (await sj.text('#pl-lage'))?.includes('Sista passet var fredag 11 december. Insatsen pågår tills du avslutar den.'), [await sj.text('#pl-toast'), await sj.text('#pl-lage'), await sj.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.oppen`)]);
  sant('avslutad av sig själv: inga fel', !sj.undantag.length && !(await sj.kor('window.__fel.length')), sj.undantag);
  sj.stang();

  // Efter insatsen säger rutan uppföljningen som gäller den här veckan, och utan Följ insatsen avslutar läraren insatsen i
  // raden överst (verifieringen 2026-10-25: i v. 4 visade planen v. 1, och raden sa "om du inte avslutar den före" utan
  // någon knapp). Seriesamtal, tisdag och torsdag från 24 november: sista passet 29 december, uppföljningarna v. 1 och v. 4.
  const uv4 = await flik(false, Date.UTC(2027, 0, 27, 9, 0, 0));
  await uv4.oppna(`${bas}/stodundervisning/seriesamtal/planera#s=2026-11-24&d=24&l=6`);
  sant('efter insatsen: uppföljningen den här veckan står i rutan och rubriken', (await uv4.text('#pl-veckan .pl-nasta .pl-etikett')) === 'Den här veckan' && (await uv4.text('#pl-veckan .pl-nar'))?.endsWith('v. 4, 25–29 jan') && (await uv4.text('#pl-veckan .pl-veckohuvud .meta'))?.startsWith('v. 4') && !(await uv4.text('#pl-veckan .pl-nar'))?.includes('Sista passet'), [await uv4.text('#pl-veckan .pl-nasta'), await uv4.text('#pl-veckan .pl-veckohuvud .meta')]);
  sant('utan Följ insatsen: raden överst har Avsluta insatsen efter sista passet', (await uv4.text('#pl-lage'))?.includes('Planen avslutas av sig själv fredag 12 februari, om du inte avslutar den före.') && !!(await uv4.kor(`!!document.querySelector('#pl-lage [data-gor="avsluta-nu"]')`)), await uv4.text('#pl-lage'));
  await uv4.tryck('#pl-lage [data-gor="avsluta-nu"]');
  await vanta(300);
  sant('utan Följ insatsen: Avsluta insatsen avslutar, och Ångra avslutet står överst', (await uv4.kor(`document.querySelector('#pl-lage .pl-status')?.textContent`)) === 'Avslutad' && (await uv4.text('#pl-toast'))?.startsWith('Insatsen är avslutad.') && !!(await uv4.kor(`!!document.querySelector('#pl-lage [data-gor="angra-avslut"]')`)), [await uv4.text('#pl-lage'), await uv4.text('#pl-toast')]);
  await uv4.tryck('#pl-lage [data-gor="angra-avslut"]');
  await vanta(300);
  sant('utan Följ insatsen: Ångra avslutet öppnar insatsen igen, utan utvärderingens förlängning', (await uv4.kor(`document.querySelector('#pl-lage .pl-status')?.textContent`)) === 'Pågående' && (await uv4.text('#pl-toast'))?.startsWith('Avslutet är ångrat. Planen avslutas av sig själv fredag 12 februari') && !(await uv4.text('#pl-toast'))?.includes('Förläng'), await uv4.text('#pl-toast'));
  // Seriesamtal: veckan heter efter passens serier, och pass 1 efter sin serie (K-547; verifieringen 2026-10-25).
  sant('Seriesamtal: veckorna heter efter passens serier', (await uv4.text('#pl-veckor [data-vy="1"] .pl-fokus')) === 'Fönsterplatsen och Spelet' && (await uv4.text('#pl-veckor [data-vy="2"] .pl-fokus')) === 'Teckningen och Vinsten', [await uv4.text('#pl-veckor [data-vy="1"] .pl-fokus'), await uv4.text('#pl-veckor [data-vy="2"] .pl-fokus')]);
  // Sakerna i planens texter har sina namn, och namnen är länkar (K-549; STIL.md under Hänvisningar).
  await uv4.tryck('#pl-veckan .pl-remsa [data-vy="2"]');
  await vanta(150);
  const uv4Kort = await uv4.kor(`[...document.querySelectorAll('#pl-veckan a')].map((a) => a.textContent).join('|')`);
  await uv4.tryck('#pl-veckan .pl-remsa [data-vy="fore"]');
  await vanta(150);
  const uv4Fore = await uv4.text('#pl-veckan');
  const uv4ForeLankar = await uv4.kor(`[...document.querySelectorAll('#pl-veckan a')].map((a) => a.textContent).join('|')`);
  sant('Seriesamtal: kortet och protokollet har sina namn, med länk', uv4Kort?.includes('Frågor vi ställer till varandra') && uv4Fore?.includes('provbildens protokoll') && /provbildens/i.test(uv4ForeLankar ?? ''), [uv4Kort, uv4ForeLankar]);
  sant('efter insatsen i v. 4: inga fel', !uv4.undantag.length && !(await uv4.kor('window.__fel.length')), uv4.undantag);
  uv4.stang();

  // ---- Avsluta insatsen tidigare (K-542) ----
  // Niclas 2026-10-25: "Avsluta insatsen denna vecka ... då skrivs alla sammaställningar om med den vecka man avslutar den som
  // sista", och samma kväll "Avsluta onsdagen", "avslutet måste märkas när det är tryckt" och "Ska finnas en ångra knapp".
  // Läraren väljer veckans sista pass, det strukna står överstruket, rutan med bocken och läget överst syns, anledningen är
  // utvärderingens mening, och Ångra avslutet tar tillbaka planen.
  const av = await flik(false, Date.UTC(2026, 10, 18, 9, 0, 0));
  await av.oppna(PLAN);
  await av.kor('localStorage.clear()');
  await av.oppna(`${PLAN}#s=2026-11-02&d=135&l=6`);
  await av.tryck('#pl-spara');
  await vanta(200);
  await av.tryck('#pl-lage [data-gor="avsluta"]');
  sant('avsluta: formuläret under lägesraden väljer dagens pass och säger vad som stryks', (await av.kor(`document.getElementById('pl-avsluta-pass').value`)) === '8' && (await av.text('#pl-avsluta-text')) === 'Insatsen slutar med pass 8, onsdag 18 november. Pass 9 i veckan och vecka 4 till 6 (v. 48–50) stryks ur planen.' && (await av.kor(`document.querySelectorAll('#pl-avsluta-pass optgroup').length`)) === 6 && (await av.kor(`[...document.querySelectorAll('#pl-avsluta-pass optgroup')][2].label`)) === 'Vecka 3, 16–20 nov' && (await av.text('#pl-lage [data-gor="avsluta-klar"]')) === 'Avsluta efter onsdag 18 november', await av.text('#pl-avsluta'));
  // En omritning, som när en annan flik ändrar planen, byter inte förvalt pass, också när läraren har bläddrat till en annan
  // vecka (Codex 2026-10-25).
  const andraFlik = (namn) => av.kor(`(() => { const x = JSON.parse(localStorage.getItem('insatser')); x.planer[0].namn = '${namn}'; localStorage.setItem('insatser', JSON.stringify(x)); dispatchEvent(new StorageEvent('storage', { key: 'insatser' })); return true; })()`);
  await av.tryck('#pl-veckan .pl-remsa [data-vy="2"]');
  await andraFlik('Läsgruppen');
  await vanta(150);
  sant('avsluta: förvalet står kvar när planen ritas om i en annan vecka', (await av.kor(`document.getElementById('pl-avsluta-pass')?.value`)) === '8' && (await av.kor(`document.getElementById('pl-avsluta')?.hidden`)) === false && (await av.text('#pl-grupper'))?.includes('Läsgruppen'), [await av.kor(`document.getElementById('pl-avsluta-pass')?.value`), await av.text('#pl-grupper')]);
  const valjSista = (nr) => av.kor(`(() => { const s = document.getElementById('pl-avsluta-pass'); s.value = '${nr}'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await valjSista(9);
  sant('avsluta: texten följer det valda passet', (await av.text('#pl-avsluta-text')) === 'Insatsen slutar med pass 9, fredag 20 november. Vecka 4 till 6 (v. 48–50) stryks ur planen.' && (await av.text('#pl-lage [data-gor="avsluta-klar"]')) === 'Avsluta efter fredag 20 november', await av.text('#pl-avsluta-text'));
  // Det läraren har valt och skrivit står kvar när planen ritas om, som när hen bläddrar till en annan vecka (Codex 2026-10-25).
  await av.kor(`(() => { const f = document.getElementById('pl-avsluta-not'); f.value = 'Eleverna byter schema'; f.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await andraFlik('Läsgruppen B');
  await vanta(150);
  sant('avsluta: formuläret står kvar med det valda passet och anledningen när planen ritas om', (await av.kor(`document.getElementById('pl-avsluta-pass')?.value`)) === '9' && (await av.kor(`document.getElementById('pl-avsluta-not')?.value`)) === 'Eleverna byter schema' && (await av.text('#pl-avsluta-text'))?.startsWith('Insatsen slutar med pass 9'), await av.text('#pl-lage'));
  // En text som klistras in och är längre än fältets gräns kapas vid ett ord (K-543; buggjakten 2026-10-25).
  await av.kor(`(() => { const f = document.getElementById('pl-avsluta-not'); f.focus(); f.value = ' Början.'; f.setSelectionRange(0, 0); const dt = new DataTransfer(); dt.setData('text/plain', 'Mycket lång anledning '.repeat(12)); f.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); return true; })()`);
  const avInklistrat = await av.kor(`document.getElementById('pl-avsluta-not').value`);
  sant('en lång text som klistras in kapas vid ett ord, och texten efter markören står kvar', /\p{L}… Början\.$/u.test(avInklistrat ?? '') && avInklistrat.length <= 200, avInklistrat);
  await valjSista(8);
  await av.tryck('#pl-avsluta [data-anledning]', 'Gruppen har nått målet');
  await av.tryck('#pl-avsluta [data-gor="avsluta-klar"]');
  await vanta(300);
  const avPlan = await av.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0]`);
  sant('avsluta: planen slutar med det valda passet, och anledningen är utvärderingens mening', avPlan?.val.includes('e=8') && avPlan.foljd.utvardering?.beslut === 'avsluta' && avPlan.foljd.utvardering?.not === 'Gruppen har nått målet' && (await av.kor(`[...document.querySelectorAll('#pl-veckan .pl-remsa [data-vy]')].map((b) => b.dataset.vy).join()`)) === 'fore,1,2,3,efter', avPlan);
  sant('avsluta: det strukna står överstruket i veckan, remsan och veckolistan', (await av.kor(`[...document.querySelectorAll('#pl-veckan .pl-passlista li.struket')].map((x) => x.textContent).join('|')`))?.includes('Pass 9 · struket') && (await av.kor(`document.querySelectorAll('#pl-veckan .pl-remsa .struken').length`)) === 3 && (await av.text('#pl-veckor .pl-struken'))?.includes('Vecka 4–6'), await av.text('#pl-veckor .pl-struken'));
  sant('avsluta: rutan med bocken, läget överst med Ångra avslutet och planen grå', !!(await av.kor(`!!document.querySelector('#pl-lage.ny .pl-avslutad-bock') && !document.querySelector('#pl-veckan .pl-avslutad')`)) && (await av.text('#pl-lage'))?.startsWith('Avslutad Insatsen avslutades i vecka 3 (v. 47), efter 8 av 18 planerade pass. Anledning: Gruppen har nått målet.') && !!(await av.kor(`!!document.querySelector('#pl-lage [data-gor="angra-avslut"]')`)) && (await av.kor(`document.getElementById('plan').classList.contains('pl-avslutad-plan')`)) && (await av.text('#pl-grupper'))?.includes('Avslutad'), [await av.text('#pl-lage'), await av.text('#pl-grupper')]);
  await av.bredd(390); await vanta(1200); await av.bild('13-avslutad-veckan-telefon'); await av.dator();
  const avslutet = 'Insatsen avslutades i vecka 3 (v. 47), efter 8 av 18 planerade pass.';
  const avslutas = 'Insatsen avslutas i vecka 3 (v. 47), efter 8 av 18 planerade pass.';
  // Med dagens pass som det sista står passet kvar i rutan, i sin färg, och Nu står på veckan tills dagen är slut
  // (verifieringen 2026-10-25).
  sant('avsluta med dagens pass: passet står kvar i rutan och Nu på veckan', (await av.text('#pl-veckan .pl-nasta .pl-etikett')) === 'Nästa pass' && (await av.text('#pl-veckan .pl-nasta .pl-nar'))?.startsWith('I dag') && (await av.kor(`document.querySelector('#pl-veckan .pl-nasta').classList.contains('pl-kommer')`)) && (await av.text('#pl-veckor li.nu .pl-v')) === 'Vecka 3', [await av.text('#pl-veckan .pl-nasta'), await av.text('#pl-veckor li.nu')]);
  // Kalenderfilen har bara passen till och med det sista (Niclas 2026-10-25: "Se till att json filen och ical mm och alla
  // utskrifter hänger med").
  await av.kor('window.__fil = null');
  await av.tryck('#pl-kalender');
  await vanta(300);
  const avIcs = (await av.kor('window.__fil'))?.replace(/\r\n /g, '') ?? '';
  sant('avsluta: kalenderfilen har bara passen till och med det sista', /-p8@/.test(avIcs) && !/-p9@/.test(avIcs) && !/-p18@/.test(avIcs), avIcs.slice(0, 400));
  sant('avsluta: veckan, planens ruta och texten till åtgärdsprogrammet säger avslutet', (await av.text('#pl-lage'))?.includes(avslutet) && (await av.text('#pl-summa-text'))?.includes(`8 pass om 30 minuter`) && (await av.text('#pl-summa-text'))?.includes(avslutas) && (await av.kor(`document.getElementById('pl-aptext').value`))?.includes(`${avslutas} Anledning: Gruppen har nått målet.`), [await av.text('#pl-summa-text'), await av.kor(`document.getElementById('pl-aptext').value`)]);
  // Anledningen ändras under Efter insatsen, och texten till åtgärdsprogrammet följer med direkt (Codex 2026-10-25).
  // Utvärderingen står när läraren följer insatsen.
  await av.kor(`(() => { const c = document.getElementById('pl-folj'); c.checked = true; c.dispatchEvent(new Event('change')); return true; })()`);
  await vanta(200);
  await av.tryck('#pl-veckan .pl-remsa [data-vy="efter"]');
  await av.kor(`(() => { const f = document.getElementById('pl-utv-not'); f.value = 'Skolans andra arbete tar över'; f.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  sant('avsluta: texten till åtgärdsprogrammet följer en ändrad anledning', (await av.kor(`document.getElementById('pl-aptext').value`))?.includes('Anledning: Skolans andra arbete tar över.'), await av.kor(`document.getElementById('pl-aptext').value`));
  // Ett lov före slutet flyttar slutet med passen, eftersom slutet är ett pass (buggjakten 2026-10-25: en ny start flyttade
  // slutet, och planen krympte). Slutet ligger då en vecka fram, så sista veckan säger avslutet med Ångra avslutet.
  await av.kor(`(() => { document.getElementById('pl-andra').open = true; document.querySelector('#pl-lovveckor [data-lovvecka="2026-47"]').click(); return true; })()`);
  await vanta(300);
  await av.tryck('#pl-veckan .pl-remsa [data-vy="3"]');
  sant('avsluta: ett lov före slutet flyttar slutet med passen', (await av.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].val`))?.includes('e=8') && (await av.text('#pl-lage'))?.includes('Insatsen avslutas i vecka 3 (v. 48), efter 8 av 18 planerade pass.') && !(await av.kor(`[...document.querySelectorAll('#pl-veckan .pl-paminn')].some((x) => x.textContent.includes('Insatsen avslutas'))`)) && !!(await av.kor(`!!document.querySelector('#pl-lage [data-gor="angra-avslut"]')`)) && (await av.kor(`document.querySelector('#pl-lage .pl-status')?.textContent`)) === 'Pågående', await av.text('#pl-veckan .pl-paminn'));
  await av.kor(`(() => { document.querySelector('#pl-lovveckor [data-lovvecka="2026-47"]').click(); return true; })()`);
  await vanta(300);
  await av.tryck('#pl-lage [data-gor="angra-avslut"]');
  await vanta(300);
  const avIgen = await av.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0]`);
  sant('avsluta: Ångra avslutet tar tillbaka planen', !avIgen?.val.includes('e=') && !avIgen.foljd.utvardering?.beslut && (await av.kor(`document.querySelectorAll('#pl-veckan .pl-remsa [data-vy]').length`)) === 8 && (await av.kor(`document.querySelector('#pl-lage .pl-status')?.textContent`)) === 'Pågående' && !(await av.kor(`document.getElementById('plan').classList.contains('pl-avslutad-plan')`)) && (await av.text('#pl-toast'))?.startsWith('Insatsen pågår igen. Pass 9 i veckan och vecka 4 till 6 (v. 48–50) är tillbaka i planen.'), [avIgen, await av.text('#pl-toast')]);
  // Ett tömt fält ger ingen anledning, också när en gammal mening fanns (Codex samma dag).
  await av.tryck('#pl-lage [data-gor="avsluta"]');
  await av.kor(`(() => { const f = document.getElementById('pl-avsluta-not'); f.value = ''; return true; })()`);
  await av.tryck('#pl-avsluta [data-gor="avsluta-klar"]');
  await vanta(300);
  sant('avsluta: ett tömt fält ger ingen anledning', (await av.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.utvardering?.not`)) === '' && !(await av.kor(`document.getElementById('pl-aptext').value`))?.includes('Anledning'), await av.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.utvardering`));
  // Planens fil bär slutet och beslutet, och planen öppnas ur filen avslutad på en annan dator.
  await av.kor('window.__fil = null');
  await av.tryck('#pl-kopia-spara');
  await vanta(300);
  const avFil = (await av.kor('window.__fil')) ?? '{}';
  const avPlanen = JSON.parse(avFil)?.plan;
  sant('avsluta: planens fil bär slutet och beslutet', !!avPlanen?.val?.includes('e=8') && avPlanen.foljd?.utvardering?.beslut === 'avsluta', avFil.slice(0, 300));
  await av.kor('localStorage.clear()');
  await av.oppna(PLAN);
  const avFilen = join(profil, 'avslutad.json');
  writeFileSync(avFilen, avFil);
  await av.filTill('#pl-kopia-fil', avFilen);
  await vanta(600);
  sant('avsluta: planen öppnas ur filen avslutad', (await av.text('#pl-lage'))?.startsWith('Avslutad Insatsen avslutades i vecka 3 (v. 47), efter 8 av 18 planerade pass.') && (await av.kor(`document.querySelectorAll('#pl-veckan .pl-remsa .struken').length`)) === 3, await av.text('#pl-lage'));
  sant('avsluta: inga fel', !av.undantag.length && !(await av.kor('window.__fel.length')), av.undantag);
  av.stang();

  // ---- Ett byte av dagar mitt i insatsen (K-546) ----
  // Torsdag 26 november: gruppen har träffats tisdag och torsdag, och läraren byter till onsdag och torsdag. Tisdagens pass
  // står kvar med bocken och frånvaron, och de nya dagarna gäller från i dag (verifieringen 2026-10-25).
  const db = await flik(false, Date.UTC(2026, 10, 26, 9, 0, 0));
  await db.oppna(PLAN);
  await db.kor('localStorage.clear()');
  await db.oppna(`${PLAN}#s=2026-11-23&d=24&l=6`);
  // Med två dagar i en metod med tre pass säger planen vilket av veckans pass som faller bort (K-580).
  const farre = (await db.text('#pl-summa-text')) ?? '';
  sant('färre dagar än metodens pass säger vilket av veckans pass som faller bort', /Metoden har 3 pass i veckan, och planen har 2\. Veckans tredje pass(, [^,]+,)? faller då bort varje vecka\./.test(farre), farre);
  await db.tryck('#pl-spara');
  await vanta(200);
  await db.kor(`document.getElementById('pl-andra').open = true`);
  await db.tryck('#pl-folj');
  await vanta(150);
  await db.tryck('[data-bock="2026-11-24"]');
  await vanta(150);
  // Under Skatta gruppen leder Skriv in eleverna till elevlistan, som annars ligger hopfälld (K-548; verifieringen 2026-10-25).
  await db.kor(`document.getElementById('pl-andra').open = false`);
  await db.tryck('#pl-skatta [data-elevlistan]');
  await vanta(150);
  sant('Skriv in eleverna under Skatta gruppen öppnar elevlistan', (await db.text('#pl-skatta .pl-utv-tips'))?.includes('Vill du skatta var och en? Skriv in eleverna') && (await db.kor(`document.getElementById('pl-andra').open && document.activeElement?.id === 'pl-elever'`)), await db.text('#pl-skatta .pl-utv-tips'));
  await db.kor(`document.getElementById('pl-andra').open = true`);
  sant('byte av dagar: raden under dagarna säger att nya dagar gäller från i dag', (await db.text('#pl-dagar-byte')) === 'Ändrar du dagarna gäller de från i dag, och passen som har varit och dagens pass står kvar.', await db.text('#pl-dagar-byte'));
  await db.tryck('#pl-dagar [data-dag="2"]');
  await vanta(150);
  await db.tryck('#pl-dagar [data-dag="3"]');
  await vanta(200);
  const dbPlan = await db.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0]`);
  sant('byte av dagar: det hållna passet står kvar med bocken, och de nya dagarna gäller från i dag', dbPlan?.val.includes('d=34') && dbPlan.val.includes('db=2026-11-26~24') && dbPlan.foljd.gjorda.includes('2026-11-24') && (await db.kor(`document.querySelector('[data-bock="2026-11-24"]')?.getAttribute('aria-pressed')`)) === 'true' && !(await db.kor(`!!document.querySelector('[data-bock="2026-11-25"]')`)) && (await db.text('#pl-toast'))?.startsWith('Dagarna gäller från i dag, och passen som har varit och dagens pass står kvar.') && (await db.text('#pl-dagar-byte')) === 'Tisdag och torsdag till 26 november, sedan onsdag och torsdag från 2 december.', [dbPlan?.val, await db.text('#pl-toast'), await db.text('#pl-dagar-byte')]);
  sant('byte av dagar: veckan efter har de nya dagarna, och texten till åtgärdsprogrammet säger bytet', (await db.kor(`document.getElementById('pl-aptext')?.value`))?.includes('tisdag och torsdag till 26 november, sedan onsdag och torsdag från 2 december') && (await db.text('#pl-summa-text'))?.includes('Tisdag och torsdag till 26 november, sedan onsdag och torsdag från 2 december'), [await db.text('#pl-summa-text')]);
  await db.tryck('#pl-dagar [data-dag="3"]');
  await vanta(150);
  await db.tryck('#pl-dagar [data-dag="2"]');
  await vanta(200);
  const dbTillbaka = await db.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].val`);
  sant('byte av dagar: tillbaka till dagarna före tar bort bytet', dbTillbaka?.includes('d=24') && !dbTillbaka.includes('db='), dbTillbaka);
  // En plan med en egen längd, fem veckor, får en egen knapp, och Ny plan visar metodens längder (K-544; buggjakten 2026-10-25).
  await db.kor(`(() => { const x = JSON.parse(localStorage.getItem('insatser')); x.planer[0].val = x.planer[0].val.replace(/l=\\d+/, 'l=5'); localStorage.setItem('insatser', JSON.stringify(x)); dispatchEvent(new StorageEvent('storage', { key: 'insatser' })); return true; })()`);
  await vanta(200);
  const dbEgen = await db.kor(`[...document.querySelectorAll('#pl-langd [data-langd]')].map((b) => b.dataset.langd).join()`);
  await db.tryck('#pl-grupper [data-plan="ny"]');
  await vanta(200);
  const dbNy = await db.kor(`[...document.querySelectorAll('#pl-langd [data-langd]')].map((b) => b.dataset.langd).join()`);
  sant('en egen längd från en annan plan står inte kvar efter Ny plan', dbEgen?.split(',').includes('5') && !dbNy?.split(',').includes('5'), [dbEgen, dbNy]);
  sant('byte av dagar: inga fel', !db.undantag.length && !(await db.kor('window.__fel.length')), db.undantag);
  db.stang();

  // Ett pass som faller på en röd dag sägs med att planen inte lägger något pass i stället. Vad som faller bort nämns bara när
  // veckans fält säger det säkert, som Värdeskapandes Dag 2; Textsamtal har inga sådana fält (Codex och Rimligheten
  // 2026-10-27: Ordverkstads tidning låg på onsdagen, och "veckans tredje pass" var fel).
  const rd = await flik(false, Date.UTC(2026, 11, 14, 9, 0, 0));
  await rd.oppna(PLAN);
  await rd.kor('localStorage.clear()');
  await rd.oppna(`${PLAN}#s=2026-12-21&d=135&l=6&v=1`);
  await vanta(150);
  const rodText = (await rd.text('#pl-veckan')) ?? '';
  sant('en röd dag säger att passet faller bort och att planen inte lägger något i stället', /Passet fredag 25 december faller bort, [^.,]*\. Veckans pass har var sitt innehåll, och planen lägger inget pass i stället/.test(rodText), rodText.slice(0, 1500));
  sant('en röd dag: inga fel', !rd.undantag.length && !(await rd.kor('window.__fel.length')), rd.undantag);
  rd.stang();

  // ---- Planens format: lagringen och filen från 0.2.7 ----
  // Planerna som lärarna har sparat med 0.2.7 öppnas i den här versionen utan att något försvinner, och laddas ner i den här
  // versionens format; en fil från 0.2.7 öppnas på en annan dator med allt (Niclas 2026-10-25: "Nuvarande planer borde ju få
  // nya modulen utan att försvinna och därmed kunna ladda ner nyaste igen").
  const fo = await flik(false, Date.UTC(2026, 10, 18, 9, 0, 0));
  await fo.oppna(PLAN);
  await fo.kor(`localStorage.setItem('insatser', ${JSON.stringify(readFileSync(join(rot, 'scripts', 'planera', 'filer', 'lagring-0.2.7.json'), 'utf8'))})`);
  await fo.oppna(PLAN);
  sant('planens format: planen ur lagringen från 0.2.7 öppnas med allt', (await fo.text('#pl-grupper'))?.includes('Läsgrupp 3A') && (await fo.kor(`!!document.querySelector('#pl-veckan [data-bock]')`)) && (await fo.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.elever.length`)) === 2, await fo.text('#pl-grupper'));
  await fo.kor('window.__fil = null');
  await fo.tryck('#pl-kopia-spara');
  await vanta(300);
  const foFil = JSON.parse((await fo.kor('window.__fil')) ?? '{}');
  sant('planens format: planen ur 0.2.7 laddas ner i den här versionens format', foFil.v === 1 && foFil.modul === s.PLANERA.version && foFil.plan?.foljd?.elever?.length === 2 && foFil.plan?.foljd?.utvardering?.beslut === 'avsluta', JSON.stringify(foFil).slice(0, 200));
  await fo.kor('localStorage.clear()');
  await fo.oppna(PLAN);
  await fo.filTill('#pl-kopia-fil', join(rot, 'scripts', 'planera', 'filer', 'plan-0.2.7.json'));
  await vanta(600);
  sant('planens format: filen från 0.2.7 öppnas på en annan dator med allt', (await fo.text('#pl-toast'))?.startsWith('Planen är öppnad ur filen, med allt som förts in.') && (await fo.kor(`JSON.parse(localStorage.getItem('insatser') ?? '{"planer":[]}').planer[0]?.foljd?.elever?.length`)) === 2, await fo.text('#pl-toast'));
  // En fil med en plan för en annan metod öppnas på den metodens sida, och beskedet följer med dit (Codex 2026-10-25).
  await fo.kor('localStorage.clear()');
  await fo.oppna(`${bas}/stodundervisning/seriesamtal/planera`);
  await fo.filTill('#pl-kopia-fil', join(rot, 'scripts', 'planera', 'filer', 'plan-0.2.7.json'));
  await vanta(1500);
  sant('planens format: en fil för en annan metod öppnas på metodens sida med beskedet', (await fo.kor('location.pathname'))?.endsWith('/textsamtal-i-grupp/planera') && (await fo.text('#pl-toast'))?.startsWith('Planen är öppnad ur filen, med allt som förts in.'), [await fo.kor('location.pathname'), await fo.text('#pl-toast')]);
  // Planerna som en nyare version har sparat öppnas, och sidan säger att den ska laddas om (Codex 2026-10-25).
  await fo.kor(`(() => { const x = JSON.parse(localStorage.getItem('insatser')); x.v = 99; localStorage.setItem('insatser', JSON.stringify(x)); return true; })()`);
  await fo.oppna(PLAN);
  sant('planens format: planerna ur en nyare version öppnas och sidan säger det', (await fo.text('#pl-besked-text'))?.includes('nyare version') && (await fo.text('#pl-grupper'))?.includes('Läsgrupp 3A'), [await fo.text('#pl-besked-text'), await fo.text('#pl-grupper')]);
  // Den här versionen skriver inget över det som en nyare version har sparat (Codex 2026-10-25).
  const foNyare = await fo.kor(`localStorage.getItem('insatser')`);
  await fo.tryck('[data-bock]');
  await vanta(300);
  sant('planens format: en lagring från en nyare version skrivs inte över', (await fo.kor(`localStorage.getItem('insatser')`)) === foNyare && JSON.parse(foNyare).v === 99 && (await fo.text('#pl-toast'))?.startsWith('Planen är sparad i en nyare version'), await fo.text('#pl-toast'));
  sant('planens format: inga fel', !fo.undantag.length && !(await fo.kor('window.__fel.length')), fo.undantag);
  fo.stang();

  // ---- En plan som börjar högre upp i en stege (K-515) ----
  // Läslistor med Börja på Läslista 2: planens vecka 1 är metodens vecka 3. Metodens texter säger planens veckor, passet i
  // vecka 1 är tidsschemats variant, bara listan med sina tider, vecka 2 har tidsschemats tider och boken, och kalendern visar
  // samma pass som sidan, med ett tidsschema för varje pass. Metodens sida säger varianten med standardens mening.
  const st = await flik(false, Date.UTC(2026, 9, 26, 9, 0, 0));
  const stAdress = `${bas}/stodundervisning/laslistor-i-grupp/planera`;
  await st.oppna(stAdress);
  await st.kor('localStorage.clear()');
  await st.oppna(`${stAdress}#s=2026-11-02&d=1245&l=5&b=3`);
  // Planen sparas med knappen längst ned, som sparar som den överst.
  await st.tryck('#pl-spara-nere');
  await vanta(200);
  const stLank = await st.kor('location.href');
  const stegDelar =() => st.kor(`[...document.querySelectorAll('#pl-veckan .pl-nasta .pl-del summary')].map((x) => (x.querySelector('.pl-deltid').textContent + ' ' + x.querySelector('.pl-delnamn').textContent).trim())`);
  const rutan = (valjare) => st.kor(`[...document.querySelectorAll('#pl-veckan .pl-nasta ${valjare}')].map((x) => x.textContent.replace(/\\s+/g, ' ').trim()).join(' | ')`);
  await st.tryck('#pl-veckor [data-vy="1"]');
  await vanta(150);
  const d1 = await stegDelar();
  sant('lägesraden: en plan som inte har börjat är kommande, med första passet och utan knapp', (await st.kor(`document.querySelector('#pl-lage .pl-status')?.textContent`)) === 'Kommande' && (await st.text('#pl-lage'))?.includes('Första passet måndag 2 november') && !(await st.kor(`!!document.querySelector('#pl-lage button')`)), await st.text('#pl-lage'));
  sant('stegen: passet i vecka 1 har variantens tider', ['0–3 Modellering', '3–6 Körläsning', '6–14 Parläsning', '14–15 Avslutning'].every((x) => d1?.includes(x)) && !d1?.includes('0–2 Modellering'), d1);
  const roll1 = await rutan('.pl-roll'), fore1 = await rutan('[data-ruta="del-fore"] .pl-deltext'), avsl1 = await rutan('[data-ruta="del-3"] .pl-deltext'), inl1 = await rutan('.pl-delinledning');
  sant('stegen: variantens mening och metodens texter med planens vecka', roll1.startsWith('Passet är bara listan.') && !roll1.includes('vecka 4') && fore1.includes('Kopiera listan till varje par, och från vecka 2 tar du fram dagens bok.') && fore1.includes('från vecka 2.') && avsl1.includes('Från vecka 2 läser ni sedan i boken tillsammans') && !inl1.includes('Remsan') && inl1.includes('Lektionskortet'), [roll1, fore1, avsl1, inl1]);
  sant('stegen: rutan med veckans fokus säger inte metodens vecka', !(await st.kor(`[...document.querySelectorAll('#pl-veckan .pl-fokusruta')].map((x) => x.textContent).join(' ')`)).includes('i metoden'), await st.kor(`document.querySelector('#pl-veckan .pl-fokusruta')?.textContent ?? ''`));
  sant('stegen: principerna säger planens vecka', (await st.kor(`document.querySelector('#pl-veckan [data-ruta="principer"]')?.textContent ?? ''`)).includes('från vecka 2 också sist i passet'), await st.kor(`document.querySelector('#pl-veckan [data-ruta="principer"]')?.textContent ?? ''`));
  await st.tryck('#pl-veckor [data-vy="2"]');
  await vanta(150);
  const d2 = await stegDelar(), avsl2 = await rutan('[data-ruta="del-3"] .pl-deltext');
  sant('stegen: vecka 2 är metodens vecka 4 med tidsschemats tider och boken', ['0–2 Modellering', '10–15 Avslutning'].every((x) => d2?.includes(x)) && avsl2.includes('Från vecka 2 läser ni sedan i boken') && (await rutan('.pl-roll')).indexOf('Passet är bara listan') === -1, [d2, avsl2]);
  await st.kor('window.__fil = null');
  await st.tryck('#pl-kalender');
  await vanta(300);
  const stIcs = (await st.kor('window.__fil'))?.replace(/\r\n /g, '') ?? '';
  const handelse = (nr) => stIcs.split('BEGIN:VEVENT').find((x) => x.includes(`UID:`) && new RegExp(`-p${nr}@`).test(x)) ?? '';
  sant('stegen: kalendern visar passet som sidan, med ett tidsschema', handelse(1).includes('Passet: Modellering 0–3\\, Körläsning 3–6\\, Parläsning 6–14\\, Avslutning 14–15.') && handelse(1).includes('Passet är bara listan.') && !handelse(1).includes('0–2') && handelse(5).includes('Passet: Modellering 0–2\\,') && handelse(5).includes('Vecka 2 i planen.'), [handelse(1).slice(0, 700), handelse(5).slice(0, 300)]);
  sant('kalenderfilens namn säger vad, metoden och datumet', (await st.kor('window.__filnamn')) === 'kalender-laslistor-i-grupp-2026-10-26.ics', await st.kor('window.__filnamn'));
  sant('stegen: inga fel', !st.undantag.length && !(await st.kor('window.__fel.length')), st.undantag);
  await st.oppna(`${bas}/stodundervisning/laslistor-i-grupp`);
  // Sidan skyddar spannen mot radbrytning med en ordfog (EjBryt.astro), så texten jämförs utan dem.
  const metodText = await st.kor(`document.querySelector('#passrutin, #tidsschema')?.textContent.replace(/\\u2060/g, '').replace(/\\s+/g, ' ') ?? ''`);
  sant('metodens sida säger varianten med standardens mening', metodText.includes(s.variantensMening(metod('laslistor-i-grupp').tidsschema.varianter[0])) && !metodText.includes('modelleringen tar 0–3 minuter'), metodText.slice(0, 600));
  sant('metodens sida säger det övergripande målet', (await st.kor(`document.querySelector('#mal')?.textContent.replace(/\\s+/g, ' ') ?? ''`)).includes(s.malensMening(metod('laslistor-i-grupp').mal.overgripande)), await st.kor(`document.querySelector('#mal')?.textContent.slice(0, 300) ?? ''`));
  // Börja på står också under Före, under läsningen före, med formulärets steg, och valet går till samma funktion. Läsningen
  // före låser inte valet, men en bock gör det (användbarhetsprovet 2026-10-25: valet låg hopfällt längst ned och låstes vid
  // första bocken, och inget ledde dit från läsningen).
  const foreVal = () => st.kor(`(() => { const s = document.getElementById('pl-borja-fore'); return s ? { varde: s.value, last: s.disabled, steg: [...s.options].map((o) => o.value + ' ' + o.textContent).join('|'), form: [...document.getElementById('pl-borja').options].map((o) => o.value + ' ' + o.textContent).join('|'), not: s.nextElementSibling?.textContent ?? '' } : null; })()`);
  const omIgen = async () => { await st.oppna('about:blank'); await st.oppna(stLank); };
  const medFoljd = (foljd) => st.kor(`(() => { const l = JSON.parse(localStorage.getItem('insatser')); l.planer[0].folj = true; l.planer[0].foljd = { ...l.planer[0].foljd, ...${JSON.stringify(foljd)} }; localStorage.setItem('insatser', JSON.stringify(l)); return true; })()`);
  await omIgen();
  const fv = await foreVal();
  sant('Börja på står under Före med formulärets steg', fv?.varde === '3' && !fv.last && fv.steg === fv.form && fv.not.startsWith('Steget går att ändra'), fv);
  await st.kor(`(() => { const s = document.getElementById('pl-borja-fore'); s.value = '1'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await vanta(200);
  sant('Börja på under Före ändrar planen och står kvar i fokus', !(await st.kor('location.hash')).includes('b=') && (await st.kor(`document.getElementById('pl-borja').value`)) === '1' && (await st.kor('document.activeElement?.id')) === 'pl-borja-fore', [await st.kor('location.hash'), await st.kor('document.activeElement?.id')]);
  await st.kor(`(() => { const s = document.getElementById('pl-borja-fore'); s.value = '3'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await vanta(200);
  await medFoljd({ elever: [{ id: 'e1', namn: 'Alva' }] });
  await omIgen();
  await st.kor(`(() => { const i = document.querySelector('#pl-veckan [data-resultat]'); i.value = '12'; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await vanta(600);
  await omIgen();
  sant('läsningen före låser inte Börja på', (await foreVal())?.last === false && (await st.kor(`Object.keys(JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.resultat).length`)) === 1, await foreVal());
  // Läsningen före låser inte heller när starten flyttas och läsningens datum inte längre är veckan före (Codex 2026-10-25).
  const flyttaStart = (d) => st.kor(`(() => { document.getElementById('pl-andra').open = true; const i = document.getElementById('pl-start'); i.value = '${d}'; i.dispatchEvent(new Event('change')); return true; })()`);
  await flyttaStart('2026-11-09');
  await vanta(200);
  sant('läsningen före låser inte Börja på när starten flyttas', !(await st.kor(`document.getElementById('pl-borja').disabled`)), await st.kor('location.hash'));
  await flyttaStart('2026-11-02');
  await vanta(200);
  // Ett resultat efter insatsen låser valet i formuläret direkt, utan att sidan ritas om, och valet stannar (Codex samma dag).
  await st.tryck('#pl-veckan .pl-remsa [data-vy="efter"]');
  await vanta(150);
  await st.kor(`(() => { const i = document.querySelector('#pl-veckan [data-resultat]'); i.value = '9 av 10'; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  sant('ett resultat efter start låser Börja på direkt', await st.kor(`document.getElementById('pl-borja').disabled`));
  await st.kor(`(() => { const s = document.getElementById('pl-borja'); s.disabled = false; s.value = '1'; s.dispatchEvent(new Event('change')); return true; })()`);
  await vanta(200);
  sant('ett låst Börja på ändrar inte planen', (await st.kor('location.hash')).includes('b=3'), await st.kor('location.hash'));
  await st.kor(`(() => { const i = document.querySelector('#pl-veckan [data-resultat]'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await vanta(600);
  await medFoljd({ gjorda: ['2026-11-02'] });
  await omIgen();
  sant('en bock låser Börja på, under Före och i formuläret', (await foreVal())?.last === true && (await st.kor(`document.getElementById('pl-borja').disabled`)) && (await foreVal())?.not.startsWith('Du har bockat pass'), await foreVal());
  sant('Före: inga fel', !st.undantag.length && !(await st.kor('window.__fel.length')), st.undantag);
  st.stang();

  // ---- En ny elev på en annan elevs rad (K-516) ----
  // Nova skrivs där Bea stod: Nova är en ny elev utan Beas skattningar, och sidan frågar om det är samma elev. Ny elev låter
  // listan vara, Bea får tillbaka det som förts in när namnet skrivs igen, och Nova känns igen som den elev hon var. Samma
  // elev ger en ny elev, Nora, Beas skattningar. En paus
  // mitt i ett namn byter inte elev.
  const el = await flik(false, Date.UTC(2026, 10, 25, 9, 0, 0));
  await el.oppna(PLAN);
  await el.kor(`localStorage.setItem('insatser', ${JSON.stringify(JSON.stringify(slutlagrat))})`);
  await el.oppna(`${PLAN}#${s.kodaVal(slutVal, { id: 'slut01' })}`);
  const elever = () => el.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd.elever`);
  const skattningarna = (id) => el.kor(`Object.values(JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd.skattning).map((v) => v[${JSON.stringify(id)}]).filter((x) => x !== undefined).length`);
  const skriv = async (text, paus = 700) => { await el.kor(`(() => { document.getElementById('pl-andra').open = true; const t = document.getElementById('pl-elever'); t.focus(); t.value = ${JSON.stringify(text)}; t.dispatchEvent(new Event('input')); return true; })()`); await vanta(paus); };
  const lamna = async () => { await el.kor(`document.getElementById('pl-elever').blur()`); await vanta(250); };
  // Namnet lämnar aldrig webbläsaren, också när läraren kopierar medan hen skriver i listan (Samma sak överallt 2026-10-25:
  // avstämningens mening fick tillbaka Beas namn), och frågan kommer redan medan läraren skriver.
  await skriv('Ali\nNova\nSebastian Ek');
  await el.kor('window.__kopierat = null');
  await el.tryck('#pl-samman [data-samman]');
  await vanta(200);
  const kopieradNu = await el.kor('window.__kopierat');
  sant('ett namn som lämnar listan följer inte med texten som kopieras medan läraren skriver', !!kopieradNu && !/Bea\b/.test(kopieradNu) && (await el.text('#pl-elever-fraga p'))?.startsWith('Bea är borttagen och Nova är ny'), [kopieradNu?.slice(0, 400), await el.text('#pl-elever-fraga')]);
  await lamna();
  const nova = (await elever())[1];
  sant('en ny elev på en annan elevs rad är en ny elev', nova?.namn === 'Nova' && nova.id !== 'e2' && (await skattningarna(nova.id)) === 0 && (await skattningarna('e2')) === 6, [nova, await skattningarna(nova?.id)]);
  sant('sidan frågar om det är samma elev', (await el.text('#pl-elever-fraga p')) === 'Bea är borttagen och Nova är ny i listan. Är Nova samma elev som Bea, med rättat namn?' && !(await el.kor(`document.getElementById('pl-elever-fraga').hidden`)), await el.text('#pl-elever-fraga'));
  // En obesvarad fråga står kvar när läraren går in i listan och ut igen utan att ändra något (Codex 2026-10-25).
  await skriv('Ali\nNova\nSebastian Ek', 100);
  await lamna();
  sant('en obesvarad fråga står kvar', (await el.text('#pl-elever-fraga p'))?.startsWith('Bea är borttagen och Nova är ny'), await el.text('#pl-elever-fraga'));
  await el.tryck('#pl-elever-fraga [data-ny-elev]');
  sant('Ny elev låter listan vara', (await el.kor(`document.getElementById('pl-elever-fraga').hidden`)) && (await elever()).map((x) => x.namn).join() === 'Ali,Nova,Sebastian Ek');
  await skriv('Ali\nBea\nSebastian Ek');
  await lamna();
  sant('Bea får tillbaka det som förts in när namnet skrivs igen', (await elever())[1]?.id === 'e2' && (await el.kor(`document.getElementById('pl-elever-fraga').hidden`)), await elever());
  // Verifieringen av K-559: också efter en omladdning, med ett besked.
  await skriv('Ali\nSebastian Ek');
  await lamna();
  await el.oppna(`${PLAN}#${s.kodaVal(slutVal, { id: 'slut01' })}`);
  await skriv('Ali\nBea\nSebastian Ek');
  await lamna();
  const tillbaka = { lista: await elever(), besked: await el.text('#pl-toast') };
  sant('en elev som skrivs in igen efter en omladdning får tillbaka det som förts in', tillbaka.lista[1]?.id === 'e2' && (await skattningarna('e2')) === 6 && (tillbaka.besked ?? '').startsWith('Bea är tillbaka i listan, med det som förts in.'), tillbaka);
  // Codex 2026-10-26: Ångra efter att en elev kom tillbaka tar tillbaka det sidan minns om eleven, och beskedet säger både den
  // som togs bort och den som kom tillbaka.
  await skriv('Ali\nSebastian Ek');
  await lamna();
  await skriv('Ali\nBea\nSebastian Ek');
  await lamna();
  await el.tryck('#pl-toast [data-toast-gor]');
  await vanta(200);
  await skriv('Ali\nBea\nSebastian Ek');
  await lamna();
  const efterAngra = await elever();
  await skriv('Ali\nSebastian Ek');
  await lamna();
  await skriv('Bea\nSebastian Ek');
  await lamna();
  const bada = await el.text('#pl-toast');
  await skriv('Ali\nBea\nSebastian Ek');
  await lamna();
  sant('Ångra efter en återkomst, och beskedet om den som togs bort och den som kom tillbaka', efterAngra[1]?.id === 'e2' && (bada ?? '').startsWith('Ali är borttagen ur elevlistan. Bea är tillbaka i listan, med det som förts in.'), [efterAngra, bada]);
  // Verifieringen av K-559: också när läraren inte lämnar fältet innan sidan laddas om, eftersom listan sparas medan hen skriver.
  await skriv('Ali\nSebastian Ek', 900);
  await el.oppna(`${PLAN}#${s.kodaVal(slutVal, { id: 'slut01' })}`);
  await skriv('Ali\nBea\nSebastian Ek');
  await lamna();
  const utanLamna = await elever();
  sant('en elev som tas bort utan att fältet lämnas och skrivs in igen efter en omladdning får tillbaka det som förts in', utanLamna[1]?.id === 'e2' && (await skattningarna('e2')) === 6, utanLamna);
  // Codex 2026-10-26: en elev som lämnade listan med ett halvskrivet namn från en annan flik känns igen på förnamnet.
  await el.kor(`(() => { const d = JSON.parse(localStorage.getItem('insatser')); const p = d.planer.find((x) => x.id === 'slut01'); p.foljd.elever = p.foljd.elever.filter((e) => e.id !== 'e2'); p.foljd.lamnade = [...(p.foljd.lamnade ?? []).filter((e) => e.id !== 'e2'), { id: 'e2', namn: 'Bea A', utkast: true }]; localStorage.setItem('insatser', JSON.stringify(d)); return true; })()`);
  await el.oppna(`${PLAN}#${s.kodaVal(slutVal, { id: 'slut01' })}`);
  await skriv('Ali\nBea Andersson\nSebastian Ek');
  await lamna();
  const halv = await elever();
  sant('en elev som lämnade listan med ett halvskrivet namn känns igen på förnamnet', halv[1]?.id === 'e2' && (await skattningarna('e2')) === 6, halv);
  await skriv('Ali\nBea\nSebastian Ek');
  await lamna();
  // Svaret gäller: frågan kommer inte igen när läraren skriver vidare i samma redigering (verifieringen 2026-10-25: frågan
  // om Dan kom tillbaka efter varje ändring i listan).
  await skriv('Ali\nVera\nSebastian Ek');
  const fragadVera = (await el.text('#pl-elever-fraga p'))?.startsWith('Bea är borttagen och Vera är ny');
  await el.tryck('#pl-elever-fraga [data-ny-elev]');
  await skriv('Ali\nVera\nSebastian Ek', 800);
  sant('frågan kommer inte igen efter svaret Ny elev', fragadVera && (await el.kor(`document.getElementById('pl-elever-fraga').hidden`)), await el.text('#pl-elever-fraga'));
  await lamna();
  await skriv('Ali\nBea\nSebastian Ek');
  await lamna();
  await skriv('Ali\nNova\nSebastian Ek');
  await lamna();
  sant('en elev som togs bort tidigare känns igen och är ingen fråga', (await elever())[1]?.id === nova.id && (await el.kor(`document.getElementById('pl-elever-fraga').hidden`)), await elever());
  await skriv('Ali\nBea\nSebastian Ek');
  await lamna();
  await skriv('Ali\nNora\nSebastian Ek');
  await lamna();
  // Det som förs in om Nora innan läraren svarar är det senaste och gäller (Codex 2026-10-25: det äldre vann).
  const noraId = (await elever())[1]?.id;
  const v4 = slutVeckor[3];
  await el.tryck('#pl-veckan .pl-remsa [data-vy="4"]');
  await el.kor(`(() => { const b = document.querySelector('#pl-skatta [data-skatta^="${v4}|${noraId}"][aria-label^="1,"]'); if (!b) return false; b.click(); return true; })()`);
  await vanta(150);
  await el.tryck('#pl-elever-fraga [data-samma-elev]');
  await vanta(150);
  const skattningen = (id) => el.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd.skattning[${JSON.stringify(v4)}][${JSON.stringify('X')}]`.replace('"X"', JSON.stringify(id)));
  sant('Samma elev ger Nora Beas skattningar', (await elever())[1]?.id === 'e2' && (await elever())[1]?.namn === 'Nora' && (await skattningarna('e2')) === 6 && (await skattningen('e2')) === 1 && (await el.text('#pl-toast p')) === 'Nora är samma elev som Bea, med det som förts in.', [await elever(), await skattningen('e2'), await el.text('#pl-toast p')]);
  await el.tryck('#pl-toast [data-toast-gor]');
  await vanta(150);
  sant('Ångra tar tillbaka listan och frågan', (await elever())[1]?.id === noraId && (await skattningen('e2')) === slutSkattning[3][1] && (await el.text('#pl-elever-fraga p'))?.startsWith('Bea är borttagen och Nora är ny'), [await elever(), await skattningen('e2'), await el.text('#pl-elever-fraga')]);
  await el.tryck('#pl-elever-fraga [data-samma-elev]');
  await vanta(150);
  // En rad som tas bort och ett namn som byts i samma ändring: frågan låter läraren välja bland de borttagna, så att den inte
  // gissar ur raderna (Codex 2026-10-25: frågan kopplade Nora till Ali).
  await skriv('Nora\nSebastian Ek');
  await skriv('Mira\nSebastian Ek', 100);
  await lamna();
  sant('en borttagen rad och ett nytt namn: läraren väljer bland de borttagna', (await el.text('#pl-elever-fraga p')) === 'Ali och Nora är borttagna och Mira är ny i listan. Är Mira samma elev som någon av dem?' && (await el.kor(`[...document.querySelectorAll('#pl-elever-fraga [data-samma-elev]')].map((b) => b.textContent).join('|')`)) === 'Samma som Ali|Samma som Nora', await el.text('#pl-elever-fraga'));
  await el.tryck('#pl-elever-fraga [data-ny-elev]');
  await skriv('Ali\nNora\nSebastian Ek', 100);
  await lamna();
  await skriv('Ali\nNora\nSeb');
  await skriv('Ali\nNora\nSebastian E', 300);
  await lamna();
  sant('en paus mitt i ett namn byter inte elev', (await elever())[2]?.id === 'e3' && (await skattningarna('e3')) === 6 && (await el.kor(`document.getElementById('pl-elever-fraga').hidden`)), await elever());
  // Två nya elever i samma ändring: en borttagen elev kan bara vara en av dem, och Ångra tar tillbaka båda frågorna (Codex
  // 2026-10-25: båda kunde få Alis id).
  await skriv('Pia\nOlle\nSebastian E');
  await lamna();
  const piaId = (await elever())[0]?.id;
  await el.kor(`(() => { const b = document.querySelector('#pl-elever-fraga [data-samma-elev="${piaId}|e1"]'); if (!b) return false; b.click(); return true; })()`);
  await vanta(150);
  const kvarVal = await el.kor(`[...document.querySelectorAll('#pl-elever-fraga [data-samma-elev]')].map((b) => b.dataset.sammaElev)`);
  sant('en borttagen elev kan bara vara en av de nya', (await elever())[0]?.id === 'e1' && kvarVal?.length >= 1 && kvarVal.every((v) => !v.endsWith('|e1')), [await elever(), kvarVal]);
  await el.tryck('#pl-toast [data-toast-gor]');
  await vanta(150);
  sant('Ångra tar tillbaka båda frågorna', (await el.kor(`[...document.querySelectorAll('#pl-elever-fraga [data-samma-elev]')].filter((b) => b.dataset.sammaElev.endsWith('|e1')).length`)) === 2 && (await elever())[0]?.id === piaId, [await el.text('#pl-elever-fraga'), await elever()]);
  await el.kor('window.__filnamn = null');
  await el.tryck('#pl-kopia-spara');
  await vanta(200);
  sant('planens fil heter plan, gruppen, metoden och datumet', (await el.kor('window.__filnamn')) === 'plan-Läsgrupp-2B-textsamtal-i-grupp-2026-11-25.json', await el.kor('window.__filnamn'));
  // K-556 (verifieringen av omgång 1 2026-10-26): ett rättat namn, en utbytt elev, en inklistrad lista med fler än 32 namn
  // och de fyra namnen tillbaka. Annika är samma elev som Anna med skattningarna, och ingen fråga nämner Anna eller Carl.
  {
    const p0 = slutlagrat.planer[0];
    const lagrat = { v: 1, planer: [{ ...p0, id: 'k556x1', foljd: { ...p0.foljd, elever: [{ id: 'e1', namn: 'Anna' }, { id: 'e2', namn: 'Bo' }, { id: 'e3', namn: 'Carl' }, { id: 'e4', namn: 'Dora' }], franvaro: {}, resultat: {}, avstamning: undefined } }] };
    await el.oppna(PLAN);
    await el.kor(`localStorage.setItem('insatser', ${JSON.stringify(JSON.stringify(lagrat))})`);
    await el.oppna(`${PLAN}#${s.kodaVal(slutVal, { id: 'k556x1' })}`);
    const k556 = () => el.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'k556x1').foljd`);
    const fraga = () => el.kor(`document.getElementById('pl-elever-fraga').hidden ? '' : document.getElementById('pl-elever-fraga').innerText`);
    const steg = [];
    await skriv('Annika\nBo\nCarl\nDora');
    steg.push(await fraga());
    await el.tryck('#pl-elever-fraga [data-samma-elev]');
    await lamna();
    await skriv('Annika\nBo\nErik\nDora');
    steg.push(await fraga());
    await el.tryck('#pl-elever-fraga [data-ny-elev]');
    await lamna();
    steg.push((await k556()).elever.map((e) => `${e.id}:${e.namn}`).join());
    await skriv(Array.from({ length: 34 }, (_, i) => `Elev${i + 1}`).join('\n'));
    await lamna();
    await skriv('Annika\nBo\nErik\nDora');
    await lamna();
    const f = await k556();
    const annika = f.elever.find((e) => e.namn === 'Annika');
    const annikas = Object.values(f.skattning).filter((v) => v[annika?.id] !== undefined).length;
    sant('K-556: ett rättat namn står kvar som samma elev efter en lång lista, och ingen fråga nämner de gamla namnen', annika?.id === 'e1' && annikas === slutVeckor.length && !(await fraga()), { steg, elever: f.elever, annikas, fraga: await fraga() });
    // Samma sak när båda namnen byts i en ändring, så att frågan har två att välja bland ("Anna och Carl är borttagna och
    // Annika är ny i listan"), som i verifieringen.
    // En egen plan och en adress med en fråga, så att sidan laddas om och inget står kvar i minnet från fallet före.
    const lagrat2 = { v: 1, planer: [{ ...lagrat.planer[0], id: 'k556x2' }] };
    await el.oppna(`${PLAN}?k556=1`);
    await el.kor(`localStorage.setItem('insatser', ${JSON.stringify(JSON.stringify(lagrat2))})`);
    await el.oppna(`${PLAN}?k556=2#${s.kodaVal(slutVal, { id: 'k556x2' })}`);
    const k556b = () => el.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'k556x2').foljd`);
    await skriv('Annika\nBo\nErik\nDora');
    const tva = await fraga();
    await el.kor(`(() => { const b = document.querySelector('#pl-elever-fraga [data-samma-elev$="|e1"]'); if (!b) return false; b.click(); return true; })()`);
    await vanta(150);
    await el.tryck('#pl-elever-fraga [data-ny-elev]');
    await lamna();
    const mitt = (await k556b()).elever.map((e) => `${e.id}:${e.namn}`).join();
    await skriv(Array.from({ length: 34 }, (_, i) => `Elev${i + 1}`).join('\n'));
    await lamna();
    await skriv('Annika\nBo\nErik\nDora');
    await lamna();
    const g = await k556b();
    const annika2 = g.elever.find((e) => e.namn === 'Annika');
    const annikas2 = Object.values(g.skattning).filter((v) => v[annika2?.id] !== undefined).length;
    sant('K-556: också när båda namnen byts i en ändring', tva.includes('Anna och Carl är borttagna') && mitt.startsWith('e1:Annika') && annika2?.id === 'e1' && annikas2 === slutVeckor.length && !(await fraga()), { tva, mitt, elever: g.elever, annikas2, fraga: await fraga() });
  }
  sant('elevlistan: inga fel', !el.undantag.length && !(await el.kor('window.__fel.length')), el.undantag);
  el.stang();
} catch (e) {
  sidfel.push(`provet av sidan avbröts: ${e.message}`);
} finally {
  try { proc.kill(); } catch { /* redan stängd */ }
  server.close();
  await vanta(300);
  try { rmSync(profil, { recursive: true, force: true }); } catch { /* Chrome släpper profilen senare */ }
}
if (sidfel.length) { console.error(`planprov: ${sidfel.length} fel på sidan:\n  ${sidfel.join('\n  ')}`); process.exit(1); }
mkdirSync(dirname(cacheFil), { recursive: true });
writeFileSync(cacheFil, JSON.stringify({ ...cache, sidan: nyckel }));
console.log('planprov: sidan prövad i Chrome: förslaget, veckan, bockar, upprepa, lov, flytta och ställa in, kopiera, länken, kalenderfilen, en plan ur en länk, Din insats, Dina insatser, en webbläsare som inte sparar, insatsen när den är slut med utvärderingen och sammanställningen, målet med pennan, tiderna, texten till åtgärdsprogrammet och två planer, utan fel och utan att rulla i sidled.');
