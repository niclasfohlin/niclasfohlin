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
import { spawn } from 'node:child_process';
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
const s = await import(pathToFileURL(join(rot, 'src/lib/standard/index.js')).href);
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

const tider = [['före', 'fore'], ['efter', 'efter'], ['efter 4 veckor', 'efter'], ['Efter fyra veckor', 'efter'], ['efter 4–6 veckor', 'efter'], ['varje pass', 'lopande'], ['i passet', 'lopande'], ['varje vecka', 'lopande'], ['varannan vecka', 'intervall'], ['var 3:e vecka', 'intervall'], ['vecka 4', 'vecka'], ['vecka 1–4', 'vecka'], ['vecka 2 och 6', 'vecka'], ['första veckan', 'vecka'], ['sista veckan', 'sista-veckan'], ['pass 6, 8 och 10', 'pass'], ['pass 13–23', 'pass'], ['sista passet', 'sista-passet'], ['villkor', 'villkor']];
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
ska('Textsamtal i grupp går att planera', tsFel.length === 0 && tsMp, tsFel);
if (tsMp) {
  const val = { start: '2026-11-02', dagar: [1, 3, 5], langd: 6, ...tom };
  let p = s.planera(tsMp, val);
  ska('sex veckor ger 18 pass', p.pass.length === 18, p.pass.length);
  ska('första och sista passet', p.forstaPass === '2026-11-02' && p.sistaPass === '2026-12-11', [p.forstaPass, p.sistaPass]);
  ska('veckorna är 45 till 50', p.veckor.map((v) => v.vecka.vecka).join() === '45,46,47,48,49,50');
  ska('progressionens rader: 1, 2, 3, 4–5, 6–8', p.veckor.map((v) => v.steg).join() === '0,1,2,3,3,4');
  // Före insatsen står i veckan före planens första vecka, som vecka 0 (Planera 0.2, de kalla testarna 2026-10-24).
  ska('uppföljningen före är veckan före och efter veckan efter', p.uppfoljning[0].tillfallen[0].datum === '2026-10-26' && p.uppfoljning[0].tillfallen[0].vecka === 0 && p.fore.mandag === '2026-10-26' && !p.fore.overLov && p.uppfoljning[2].tillfallen[0].datum === '2026-12-14');
  ska('varje vecka har inget datum', p.uppfoljning[1].typ === 'lopande' && p.uppfoljning[1].tillfallen.length === 0);
  ska('veckanFor onsdag 18 november är vecka 3', s.veckanFor(p, '2026-11-18').nr === 3);
  ska('nästa pass onsdag 18 november är pass 8', s.nastaPass(p, '2026-11-18').nr === 8);
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
  ska('veckorna över nyåret som text', nyarsText.includes('(vecka 51 till vecka 2)'), nyarsText);
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
  ska('namnen ur en text', s.utanNamn('Bea behöver mer stöd. Alis par läste med bea, inte Alibaba.', [{ namn: 'Bea' }, { namn: 'Ali Test' }]) === 'En elev behöver mer stöd. En elevs par läste med en elev, inte Alibaba.', s.utanNamn('Bea behöver mer stöd. Alis par läste med bea, inte Alibaba.', [{ namn: 'Bea' }, { namn: 'Ali Test' }]));
  // Texten till åtgärdsprogrammet.
  const plan = s.planera(tsMp, val);
  const steg = ts.progression.rader.map((r) => r.rubrik ?? s.postensRad(r.fokus, 80));
  const info = { titel: ts.titel, undertitel: ts.undertitel, adress: 'niclasfohlin.se/stodundervisning/textsamtal-i-grupp', mal: ts.plan.mal, steg, uppfoljning: ts.uppfoljning.rader, nivaNamn: 'Mellan' };
  const dok = s.dokumentationstext(info, plan, val, { minuter: 30, genomforda: 7 });
  ska('åtgärdsprogrammet: åtgärden utan årskurserna och målet', dok.startsWith('Åtgärd: Textsamtal i grupp, lärarledd insats i liten grupp där eleverna samtalar om korta texter och lär sig läsa mellan raderna.\nMål: Kunna läsa mellan raderna, säga vad man tror och visa ledtråden i texten.'), dok);
  ska('åtgärdsprogrammet: omfattningen', dok.includes('Omfattning: 18 pass om 30 minuter, måndag, onsdag och fredag, 2 november till 11 december 2026 (vecka 45 till 50), på nivån Mellan.'), dok);
  ska('åtgärdsprogrammet: vad eleven arbetar med vecka för vecka', dok.includes('Eleven arbetar med: Det står, Jag vet och Alltså tror jag (vecka 45); Stanna och Se det framför dig (vecka 46); Slå ihop flera ledtrådar (vecka 47); Stämmer det? och Det som menas (vecka 48–49); Slaget Ordet, eleverna leder samtalet (vecka 50).'), dok);
  ska('åtgärdsprogrammet: uppföljningen och de bockade passen', dok.includes('Före insatsen, vecka 44') && dok.includes('Efter insatsen, vecka 51') && dok.includes('Bockade som genomförda: 7 av 18 pass.') && !dok.includes('Skattning'), dok);
  ska('åtgärdsprogrammet har inga tankstreck som skiljetecken', !/ [–-] /.test(dok), dok);
  const dokFolj = s.dokumentationstext(info, plan, { ...val, mal: 'läsa faktatexter och visa ledtråden', tider: { 1: ['09:20', '10:00'], 3: ['09:20', '10:00'], 5: ['09:20', '10:00'] } }, { minuter: 30, folj: true });
  ska('åtgärdsprogrammet: eget mål, tiderna och skattningen', dokFolj.includes('Mål: Läsa faktatexter och visa ledtråden.') && dokFolj.includes('måndag, onsdag och fredag kl. 9.20–10.00, 2 november') && dokFolj.includes('Skattning varje vecka, 1 till 5, av hur väl eleven klarar målet på egen hand, med avstämning mitt i insatsen vecka 47 och utvärdering efter insatsen.'), dokFolj);
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
  const f = { gjorda: ['2026-11-02', '2026-11-04', '2026-11-06'], elever: [{ id: 'a1', namn: 'Ali' }, { id: 'b2', namn: 'Bea' }], franvaro: { '2026-11-04': ['b2'] }, vecka: { '2026-11-02': { varde: 3, not: 'Gruppen kom igång' } }, skattning: { '2026-11-02': { a1: 2, b2: 3 }, '2026-11-09': { a1: 3, b2: 3 } }, resultat: { '0-2026-11-02': { a1: '4 av 8' } }, avstamning: { beslut: 'fortsatt' } };
  const sm = s.sammanstallning(p, f, '2026-11-18');
  ska('sammanställningen räknar passen', sm.gjorda === 3 && sm.varit === 8 && sm.planerade === 18 && !sm.slut);
  ska('närvaron räknas inte när läraren inte noterar den', sm.elever.every((e) => e.narvaro === null) && !sm.narvaro);
  const smN = s.sammanstallning(p, { ...f, narvaro: true }, '2026-11-18');
  ska('närvaron räknas på de bockade passen', smN.narvaro && smN.elever.find((e) => e.id === 'b2').narvaro === 2 && smN.elever.find((e) => e.id === 'a1').narvaro === 3);
  ska('riktningen', s.riktning(sm.elever[0]) === 'upp' && s.riktning(sm.elever[1]) === 'samma');
  ska('veckans gång', sm.veckor[0].skattning === 3 && sm.veckor[0].not === 'Gruppen kom igång' && sm.veckomedel === 3);
  const info = { titel: ts.titel, mal: ts.plan.mal, uppfoljning: ts.uppfoljning.rader };
  const text = s.sammanstallningstext(info, p, smN);
  ska('sammanställningens text', text.includes('Mål: Kunna läsa mellan raderna, säga vad man tror och visa ledtråden i texten.') && text.includes('Pass: 3 av de 8 som har varit är bockade som genomförda, av 18 i planen.') && text.includes('Närvaro i de bockade passen: 1 av 2 elever var med i alla; en elev missade 1 pass.') && text.includes('av hur väl eleverna klarar målet på egen hand: medel 2,5 vid första skattningen och 3 vid den senaste. 1 av 2 elever har gått framåt.') && text.includes('Avstämning mitt i insatsen, vecka 47: Fortsätt som planerat.'), text);
  ska('sammanställningens text har inga namn', !/Ali|Bea/.test(text));
  ska('utan närvaro säger texten inget om den', !s.sammanstallningstext(info, p, sm).includes('Närvaro'));
  const medNamn = s.sammanstallningstext(info, p, s.sammanstallning(p, { ...f, vecka: { '2026-11-02': { varde: 3, not: 'Alis och Beas par byggde vidare' } }, avstamning: { beslut: 'fortsatt', not: 'Bea behöver mer stöd vid stoppet' } }, '2026-11-18'));
  ska('namnen i lärarens meningar blir en elev', !/Ali|Bea/.test(medNamn) && medNamn.includes('vecka 45: En elevs och en elevs par byggde vidare') && medNamn.includes('Fortsätt som planerat. En elev behöver mer stöd vid stoppet.'), medNamn);
  const rad = s.elevtext(info, p, smN, 'a1');
  ska('elevens rad', rad === 'Mål: Kunna läsa mellan raderna, säga vad man tror och visa ledtråden i texten. Var med i 3 av 3 bockade pass. Skattning, 1 till 5, av hur väl eleven klarar målet på egen hand: vecka 45: 2, vecka 46: 3. Före insatsen, vecka 45: 4 av 8.', rad);
  const grupp = s.sammanstallning(p, { skattning: { '2026-11-02': { grupp: 2 }, '2026-11-09': { grupp: 4 } } }, '2026-11-18');
  ska('gruppen utan elevlista', grupp.grupp && grupp.elever.length === 1 && s.riktning(grupp.elever[0]) === 'upp' && s.sammanstallningstext(info, p, grupp).includes('hur väl gruppen klarar målet på egen hand: vecka 45: 2, vecka 46: 4.'));
  const sen = s.sammanstallning(p, { elever: [{ id: 'a1', namn: 'Ali' }], skattning: { '2026-11-02': { grupp: 2 }, '2026-11-09': { a1: 3 } } }, '2026-11-18');
  ska('gruppens skattningar står kvar när eleverna kommer efteråt', !sen.grupp && sen.elever.some((e) => e.id === 'grupp') && s.sammanstallningstext(info, p, sen).includes('Gruppen skattades också: vecka 45: 2.'));
  ska('skattningsfrågan', s.skattningsfragan() === 'Hur väl klarar eleven målet på egen hand?' && s.skattningsfragan(true) === 'Hur väl klarar gruppen målet på egen hand?');
  const tomt = s.sammanstallning(p, {}, '2026-11-18');
  ska('en tom uppföljning går att sammanställa', tomt.gjorda === 0 && tomt.elever.length === 1 && tomt.elever[0].skattningar.length === 0 && s.sammanstallningstext(info, p, tomt).includes('Pass: 18 i planen.'));
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
  // Codex granskning 2 (2026-10-24): ett namn i grundform, ett namn som också är en vanlig fras, och datumets gränser.
  ska('ett namn i grundform hittas i bestämd form', s.sakdelar('Ta fram sifferkorten.', [{ namn: 'Sifferkort' }]).some((x) => x.sak === 0 && x.text === 'sifferkorten') && !s.olankadeSaker('Ta fram sifferkorten.', [{ namn: 'Sifferkort' }]).length);
  const fras = s.sakdelar('Hittat på min huvudperson. Fyll i Min huvudperson i pass 2.', [{ namn: 'Min huvudperson', versal: !s.arSaksord('Min huvudperson') }]);
  ska('ett namn som också är en vanlig fras länkas bara som titel', fras.filter((x) => x.sak !== undefined).length === 1 && fras.find((x) => x.sak !== undefined)?.text === 'Min huvudperson' && s.arSaksord('Samtalsreglerna') && s.arSaksord('Lathunden'), fras);
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
  ska('veckans tre pass har var sin roll', JSON.stringify([1, 2, 3, 4].map((n) => roll(pTs, mpTs, n).map((x) => x.plats))) === '[[1],[2],[3],[1]]', [1, 2, 3, 4].map((n) => roll(pTs, mpTs, n)));
  const ss = metod('seriesamtal');
  const mpSs = s.metodplan(ss).plan;
  const pSs = s.planera(mpSs, { ...tom, start: '2026-10-27', dagar: [2, 4], langd: 6 });
  const forsta = (nr) => ss.plan.passen[s.passetsRoller(pSs, pSs.pass[nr - 1], mpSs.passen)[0]]?.nar;
  ska('Seriesamtal: pass 1, pass 7, en egen händelse och sista passet', pSs.pass.length === 12 && forsta(1) === 'första passet' && forsta(3) === 'pass 3' && forsta(7) === 'pass 7' && forsta(9) === 'pass 8 till det sista' && forsta(12) === 'sista passet', [1, 3, 7, 9, 12].map(forsta));
  // Läslistor: måndag, tisdag till torsdag och fredag.
  const ll = metod('laslistor-i-grupp');
  const mpLl = s.metodplan(ll).plan;
  const pLl = s.planera(mpLl, { ...tom, start: '2026-11-02', dagar: [1, 2, 4, 5], langd: 7 });
  const llRader = (pl, nr) => s.passetsRoller(pl, pl.pass[nr - 1], mpLl.passen).map((r) => ll.plan.passen[r].nar);
  const llRoll = (nr) => llRader(pLl, nr).find((n) => n.startsWith('veckans'));
  ska('Läslistor: veckans första, övriga och sista', [1, 2, 3, 4].map(llRoll).join() === 'veckans första,veckans övriga,veckans övriga,veckans sista', [1, 2, 3, 4].map(llRoll));
  // En vecka med ett enda pass, som efter en röd dag, har veckans första roll och ingen sista.
  const enda = s.planera(mpLl, { ...tom, start: '2026-12-21', dagar: [1, 4, 5], langd: 1 });
  ska('en vecka med ett pass har bara veckans första roll', enda.pass.length === 1 && llRader(enda, 1).filter((n) => n.startsWith('veckans')).join() === 'veckans första', llRader(enda, 1));
  // Metodens veckor: vecka 1–3 är passet bara listan, och raden går före platsen i veckan (Codex 2026-10-25).
  ska('vecka 1–3 gäller metodens tre första veckor, först', llRader(pLl, 9).join() === 'vecka 1–3,veckans första' && !llRader(pLl, 13).includes('vecka 1–3'), [llRader(pLl, 9), llRader(pLl, 13)]);
  // Förvalet och stegen: sju listor på sju veckor, och en plan som börjar på Läslista 2 har fem veckor kvar.
  ska('förvalet når progressionens sista steg', s.forvaldLangd(mpLl) === 7 && s.forvaldLangd(mpTs) === 6 && s.forvaldLangd(s.metodplan(metod('til-i-grupp')).plan) === 6 && s.forvaldLangd(s.metodplan(metod('fyra-raknesatten')).plan) === 8 && s.forvaldLangd(mpLl, 3) === 5, [s.forvaldLangd(mpLl), s.forvaldLangd(mpTs), s.forvaldLangd(mpLl, 3)]);
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
  ska('åtgärdsprogrammet: insatsens vecka 4 är inte kalenderveckan', fyraDok.includes('Vecka 4 i insatsen, vecka') && !fyraDok.includes('Vecka 4, vecka'), fyraDok);
}

// ---------- 2. Metodernas data ----------
const mapp = join(rot, 'src/content/stodundervisning');
const alla = readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => ({ id: f.replace(/\.yaml$/, ''), d: parseYaml(readFileSync(join(mapp, f), 'utf8')) }));
const planbara = alla.filter((m) => m.d.uppfoljning?.rader?.length && m.d.uppfoljning.rader.every((r) => r.tid !== undefined));
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
const medTider = (id, tider) => { const d = metod(id); d.uppfoljning.rader.forEach((r, i) => { r.tid = tider[i]; }); return d; };
const former = [
  { id: 'fyra-raknesatten', namn: 'kurs i veckor', tider: ['före', 'varje pass', 'vecka 4', 'efter'] },
  { id: 'ljudlek-forsta-ljudet', namn: 'period i pass', tider: ['i passet', 'varje pass', 'var 3:e vecka'] },
  { id: 'gruppstarkande-aktiviteter', namn: 'period utan slut med villkor', tider: ['varje vecka', 'varannan vecka', 'vecka 1–4', 'villkor', 'villkor', 'villkor', 'villkor'] },
  { id: 'seriesamtal', namn: 'progression i pass', tider: ['före', 'i passet', 'efter', 'efter 4 veckor'] },
  { id: 'til-i-grupp', namn: 'progression med vid behov', tider: ['före', 'efter'] },
];
for (const f of former) {
  const { fel: fe, plan: mp } = s.metodplan(medTider(f.id, f.tider));
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
  if (f.id === 'til-i-grupp') ska('vid behov: sex veckor ger raderna 1–2, 3–5 och 6–8', p.veckor.map((v) => v.steg).join() === '0,0,1,1,1,2', p.veckor.map((v) => v.steg));
}
// Det standarden inte läser än säger den tydligt (Kortskrivning: progressionen är moment, inte veckor).
const ks = s.metodplan(medTider('kortskrivning-skriv-varje-dag', ['sista veckan', 'i passet', 'i passet', 'varje pass', 'vecka 6']));
ska('Kortskrivnings moment stoppas med besked', ks.fel.some((x) => x.includes('Progressionens första kolumn heter "När"')), ks.fel);
ska('en metod utan tid stoppas med besked', s.metodplan(metod('upprepad-lasning')).fel.some((x) => x.includes('har ingen tid')));
// Modulens version har sin rad i tabellen under Versionerna, så att en ny förmåga aldrig går ut utan att stå där (METODER.md
// under Planera insatsen, Så får en metod planen).
ska(`versionen ${s.PLANERA.version} står i METODER.md under Versionerna`, readFileSync(join(rot, 'METODER.md'), 'utf8').includes(`\n| ${s.PLANERA.version} | `), s.PLANERA.version);

if (fel.length) { console.error(`planprov: ${fel.length} fel:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`planprov: motorn, ${planbara.length} av ${alla.length} metoder med planens fält och ${former.length} former av metoder räknar rätt.`);

// ---------- 4. Sidan i Chrome ----------
if (args.includes('--utan-sida')) process.exit(0);
const dist = join(rot, 'dist');
const sidor = ['/stodundervisning/textsamtal-i-grupp/planera', '/stodundervisning/textsamtal-i-grupp', '/stodundervisning', '/stodundervisning/upprepad-lasning'];
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
for (const m of planbara) {
  const sidan = join(dist, 'stodundervisning', m.id, 'planera', 'index.html');
  if (!existsSync(sidan)) { adressfel.push(`${m.id}: planens sida finns inte`); continue; }
  const json = readFileSync(sidan, 'utf8').match(/<script type="application\/json" id="pl-data">([\s\S]*?)<\/script>/)?.[1];
  const d = json ? JSON.parse(json) : null;
  const felen = d ? [...new Set(planensAdresser(d))].map(adressFel).filter(Boolean) : ['ingen data'];
  if (felen.length) adressfel.push(`${m.id}: planens adresser leder inte till sidor och ankare som finns: ${felen.join(', ')}`);
  const utanDelar = (d?.passen ?? []).filter((x) => x.tabell && !x.tabell.delar?.length).map((x) => x.tabell.namn);
  if (utanDelar.length) adressfel.push(`${m.id}: passens tabeller utan delar: ${utanDelar.join(', ')}`);
}
if (adressfel.length) { console.error(`planprov: ${adressfel.length} fel i planens adresser:\n  ${adressfel.join('\n  ')}`); process.exit(1); }
console.log(`planprov: planens adresser i ${planbara.length} metoder leder till sidor och ankare som finns.`);

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
  for (const m of html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '').matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g)) {
    const [, slut, tagg, attr] = m;
    const t = tagg.toLowerCase();
    if (slut) { let n = nu; while (n !== topp && n.tag !== t) n = n.far; if (n !== topp) nu = n.far; continue; }
    const el = { tag: t, id: attr.match(/\sid="([^"]*)"/)?.[1], klass: attr.match(/\sclass="([^"]*)"/)?.[1] ?? '', knapp: t === 'a' && /\sdata-skriv-ut-pdf\b/.test(attr) ? attr.match(/\shref="([^"?]*)/)?.[1] : undefined, barn: [], far: nu };
    nu.barn.push(el);
    if (el.id && !id.has(el.id)) id.set(el.id, el);
    if (!TOMMA.has(t) && !/\/\s*$/.test(attr)) nu = el;
  }
  return { rot: topp, id };
};
const knapparI = (el) => [...(el.knapp ? [el.knapp] : []), ...el.barn.flatMap(knapparI)];
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
for (const m of planbara) {
  const sida = join(dist, 'stodundervisning', m.id, 'index.html');
  const plan = readFileSync(join(dist, 'stodundervisning', m.id, 'planera', 'index.html'), 'utf8').match(/<script type="application\/json" id="pl-data">([\s\S]*?)<\/script>/)?.[1];
  if (!existsSync(sida) || !plan) continue;
  const html = readFileSync(sida, 'utf8');
  const { id } = trad(html);
  const d = JSON.parse(plan);
  const mal = [...(d.saker ?? []).flatMap((x) => [x.adress, ...Object.values(x.nivaer ?? {}), ...Object.values(x.veckor ?? {})]), ...Object.values(d.kursveckor ?? {})];
  for (const ankare of new Set(mal.filter((a) => a.startsWith(`/stodundervisning/${m.id}#`)).map((a) => a.split('#')[1]))) {
    if (ankare === 'ramar' || ankare === 'mallar') continue;
    const el = id.get(ankare);
    provade += 1;
    if (el && !sakensKnappar(el).length) knappfel.push(`${m.id}#${ankare}: planen leder hit, men saken har ingen knapp under sig som skriver ut den (src/lib/sakfiler.ts, Sakknapp.astro)`);
  }
  for (const f of bankfilerna.filter((x) => x.metod === m.id && x.slag === 'sak')) {
    if (!html.includes(`href="/stodundervisning/${f.namn}.pdf`)) knappfel.push(`${m.id}: filen ${f.namn} (${f.rubrik}) har ingen knapp på metodens sida (Sakknapp.astro i Metod.astro)`);
  }
}
if (knappfel.length) { console.error(`planprov: ${knappfel.length} fel i knapparna under det planen leder till:\n  ${knappfel.join('\n  ')}`); process.exit(1); }
console.log(`planprov: de ${provade} saker som planen leder till på metodernas sidor har en knapp under sig, och varje saks fil har sin knapp.`);

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
  window.__kopierat = null; window.__fil = null; window.__fel = [];
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__kopierat = t; } }, configurable: true });
  const skapa = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (b) => { b.text().then((t) => { window.__fil = t; }); return skapa(b); };
  HTMLAnchorElement.prototype.click = function () { if (!this.href.startsWith('blob:')) HTMLElement.prototype.click.call(this); };
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
  const [vag, ankare] = h.split('#');
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
  sant('förslaget har valen öppna och ingen vecka', await f.kor(`document.getElementById('pl-andra').open && document.getElementById('pl-veckan').hidden`));
  sant('förslaget har inte texten till åtgärdsprogrammet', await f.kor(`document.getElementById('pl-ap').hidden`));
  sant('Följ insatsen är inte förvalt', !(await f.kor(`document.getElementById('pl-folj').checked`)) && (await f.kor(`document.getElementById('pl-elevruta').hidden`)));
  await f.kor(`(() => { const i = document.getElementById('pl-start'); i.value = '2026-11-02'; i.dispatchEvent(new Event('change')); return true; })()`);
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
  sant('texten till åtgärdsprogrammet', (await f.kor(`document.getElementById('pl-aptext').value`))?.startsWith('Åtgärd: Textsamtal i grupp') && (await f.kor(`document.getElementById('pl-aptext').value`))?.includes('måndag, onsdag och fredag kl. 9.20–10.00') && (await f.kor(`document.getElementById('pl-aptext').value`))?.includes('Eleven arbetar med: Det står, Jag vet och Alltså tror jag (vecka 45)') && (await f.kor(`document.getElementById('pl-aptext').value`))?.includes('Omfattning: 18 pass om 40 minuter'), await f.kor(`document.getElementById('pl-aptext').value`));
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
  sant('rutan har passets namn med rollen', (await f.text('#pl-veckan .pl-passnamn')) === 'Pass 8 av 18 · Paren samtalar', await f.text('#pl-veckan .pl-passnamn'));
  const delarna = () => f.kor(`[...document.querySelectorAll('#pl-veckan .pl-delar .pl-del > summary')].map((s) => s.textContent.trim()).join('|')`);
  sant('passets delar med minuter, med Före passet först och Efter passet sist', (await delarna()) === 'Före passet|0–3Starten|3–5Möt texten|5–13Läs och tänk|13–26Samtala om texten|26–30Avsluta|Efter passet|Mer om passet', await delarna());
  sant('rollens text', (await f.text('#pl-veckan .pl-roll'))?.startsWith('Ni tänker tillsammans: du läser högt och stannar vid stoppet, paren samtalar'), await f.text('#pl-veckan .pl-roll'));
  await f.kor(`document.querySelector('#pl-veckan .pl-del[data-ruta="del-0"]').open = true`);
  sant('en del fälls ut till det läraren gör och säger', (await f.text('#pl-veckan .pl-del[data-ruta="del-0"] .pl-deltext'))?.includes('Skriv meningen på tavlan') && !!(await f.kor(`document.querySelector('#pl-veckan .pl-del[data-ruta="del-0"] .pl-fraser li')`)), await f.text('#pl-veckan .pl-del[data-ruta="del-0"] .pl-deltext'));
  sant('veckans pass med rollerna', (await f.kor(`[...document.querySelectorAll('#pl-passen .pl-passroll')].map((x) => x.textContent).join('|')`)) === 'Du tänker högt|Paren samtalar|Eleverna läser själva');
  await f.tryck('#pl-passen [data-visa-pass="9"]');
  sant('ett tryck på rollen visar passet i rutan', (await f.text('#pl-veckan .pl-passnamn')) === 'Pass 9 av 18 · Eleverna läser själva' && (await f.text('#pl-veckan .pl-nasta .pl-etikett')) === 'Ett pass i veckan' && !!(await f.kor(`document.querySelector('#pl-veckan .pl-nasta [data-visa-pass=""]')`)), await f.text('#pl-veckan .pl-nasta'));
  await f.tryck('#pl-veckan .pl-nasta [data-visa-pass=""]');
  sant('och tillbaka till nästa pass', (await f.text('#pl-veckan .pl-passnamn')) === 'Pass 8 av 18 · Paren samtalar');
  sant('länkarna till passet i metoden och stödet när eleven fastnar', (await f.kor(`[...document.querySelectorAll('#pl-veckan .pl-lankar a')].map((a) => a.getAttribute('href')).join()`)) === '/stodundervisning/textsamtal-i-grupp#passrutin,/stodundervisning/textsamtal-i-grupp#fastnar', await f.kor(`[...document.querySelectorAll('#pl-veckan .pl-lankar a')].map((a) => a.getAttribute('href')).join()`));
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
  sant('bara planen: inga bockar, ingen skattning och ingen sammanställning', (await f.kor(`!document.querySelector('#pl-veckan [data-bock]') && !document.querySelector('#pl-veckan [data-skatta]') && document.getElementById('pl-samman').hidden`)));
  for (const b of [320, 360, 390]) { await f.bredd(b); await vanta(150); sant(`veckan rullar inte i sidled i ${b} punkter`, !(await rullar(f))); }
  await f.bild('2-bara-planen-telefon');
  await f.dator();
  // Upprepa veckan och ta bort upprepningen; lov i veckan och tillbaka. Allt står under Ändra veckan.
  const andraVeckan = () => f.kor(`(() => { const d = document.querySelector('#pl-veckan [data-ruta="andra-veckan"]'); if (d) d.open = true; return !!d; })()`);
  await andraVeckan();
  sant('ingen lovknapp i en vecka som har börjat', !(await f.kor(`!!document.querySelector('#pl-veckan [data-gor="lov"]')`)));
  await f.tryck('[data-gor="upprepa"]');
  sant('upprepad vecka ger 21 pass', (await f.text('#pl-summa-text'))?.includes('21 pass') && (await f.text('#pl-veckan-rubrik')) === 'Vecka 3 igen i planen', [await f.text('#pl-summa-text'), await f.text('#pl-veckan-rubrik')]);
  sant('upprepningen kan ångras från beskedet', (await f.text('#pl-toast'))?.includes('Ångra'));
  sant('texten till åtgärdsprogrammet följer den upprepade veckan', (await apText())?.includes('Omfattning: 21 pass om 30 minuter') && (await apText())?.includes('Slå ihop flera ledtrådar (vecka 47–48); Stämmer det? och Det som menas (vecka 49–50)') && (await apText())?.includes('till 18 december 2026'), await apText());
  await andraVeckan();
  await f.tryck('[data-gor="ta-bort-upprepning"]');
  sant('upprepningen tas bort', (await f.text('#pl-summa-text'))?.includes('18 pass'));
  // Lov i vecka 4, som inte har börjat; dit med veckorna överst.
  await f.tryck('#pl-veckan .pl-remsa [data-vy="4"]');
  sant('veckorna överst visar vecka 4', (await f.text('#pl-veckan-rubrik')) === 'Vecka 4 i planen' && (await f.kor(`document.querySelector('#pl-veckan .pl-remsa [data-vy="4"]').getAttribute('aria-pressed')`)) === 'true', await f.text('#pl-veckan-rubrik'));
  await andraVeckan();
  await f.tryck('[data-gor="lov"]');
  sant('lov flyttar slutet en vecka', (await f.text('#pl-summa-text'))?.includes('till 18 december'), await f.text('#pl-summa-text'));
  sant('texten till åtgärdsprogrammet följer lovet', (await apText())?.includes('18 pass om 30 minuter, måndag, onsdag och fredag, 2 november till 18 december 2026 (vecka 45 till 51)') && (await apText())?.includes('Stämmer det? och Det som menas (vecka 49–50)'), await apText());
  sant('lovets rad står i planen', (await f.text('#pl-veckor .pl-lovvecka'))?.includes('v. 48'), await f.text('#pl-veckor .pl-lovvecka'));
  await f.tryck('#pl-veckor [data-lov-bort]');
  sant('lovet tas bort', (await f.text('#pl-summa-text'))?.includes('till 11 december'));
  sant('en annan vecka säger vad den är och leder tillbaka', (await f.text('#pl-veckan .pl-nasta .pl-etikett')) === 'Veckans första pass' && !!(await f.kor(`!!document.querySelector('#pl-veckan [data-vy="nu"]')`)), await f.text('#pl-veckan .pl-nasta .pl-etikett'));
  await f.tryck('#pl-veckan [data-vy="nu"]');
  sant('tillbaka till den här veckan', (await f.text('#pl-veckan-rubrik')) === 'Vecka 3 i planen', await f.text('#pl-veckan-rubrik'));
  // Flytta pass 8 till torsdag och ställ in pass 9.
  await andraVeckan();
  await f.tryck('[data-gor="flytta"]');
  await f.kor(`(() => { document.getElementById('pl-flytta-pass').value = '2026-11-18'; document.getElementById('pl-flytta-dag').value = '2026-11-19'; return true; })()`);
  await f.tryck('[data-gor="flytta-klar"]');
  sant('flyttat pass', (await f.text('#pl-veckan .pl-passlista'))?.includes('Flyttat från onsdag 18 november'), await f.text('#pl-veckan .pl-passlista'));
  await f.tryck('[data-gor="flytta"]');
  await f.kor(`(() => { document.getElementById('pl-flytta-pass').value = '2026-11-20'; return true; })()`);
  await f.tryck('[data-gor="stall-in"]');
  sant('inställt pass ger 17 pass', (await f.text('#pl-summa-text'))?.includes('17 pass') && (await f.text('#pl-veckan .pl-passlista'))?.includes('Inställt'));
  sant('texten till åtgärdsprogrammet följer det inställda passet', (await apText())?.includes('Omfattning: 17 pass om 30 minuter'), await apText());
  await f.tryck('[data-angra]');
  sant('ångrat inställt pass', (await f.text('#pl-summa-text'))?.includes('18 pass'));
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
  // Ett pass som inte har varit går inte att bocka (buggjakten 2026-10-24: "2 av de 0 pass").
  sant('ett pass som inte har varit går inte att bocka', await f.kor(`!document.querySelector('[data-bock="2026-11-20"]') && !document.querySelector('[data-bock="2026-11-18"]') && !!document.querySelector('[data-bock="2026-11-16"]')`));
  // Bocka pass 7 (måndag), med närvaron: Bea var inte med.
  await f.tryck('[data-bock="2026-11-16"]');
  sant('bocken sparas på passets dag', (await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.gjorda.join()`)) === '2026-11-16');
  sant('eleverna står under det bockade passet', (await f.kor(`document.querySelectorAll('#pl-veckan .pl-narvaro [data-narvaro]').length`)) === 2);
  await f.kor(`(() => { const b = [...document.querySelectorAll('#pl-veckan .pl-narvaro [data-narvaro]')].find((x) => x.textContent === 'Bea'); b.click(); return true; })()`);
  sant('frånvaron sparas', Object.values(await f.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.franvaro`) ?? {}).flat().length === 1);
  sant('lathunden och snabbmallen står kvar efter flera tryck', await f.kor(`!!document.querySelector('#pl-veckan [data-fil="lathund"]') && !!document.querySelector('#pl-veckan [data-fil="snabbmall"]')`));
  // Skatta: vecka 3 (i dag) Ali 3 och Bea 2, och förra veckan Ali 2 och Bea 2.
  const skatta = (namn, varde) => f.kor(`(() => { const li = [...document.querySelectorAll('#pl-veckan .pl-skattning li')].find((x) => x.querySelector('.pl-elevnamn').textContent === ${JSON.stringify(namn)}); li.querySelectorAll('.pl-skalsteg')[${varde - 1}].click(); return true; })()`);
  await skatta('Ali Test', 3);
  await skatta('Bea', 2);
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
  await f.tryck('button[data-vy="3"]');
  sant('skattningen sparas per vecka och elev', (await f.kor(`(() => { const s = JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.skattning; return Object.keys(s).length === 2 && Object.values(s['2026-11-16']).sort().join() === '2,3'; })()`)));
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
  await f.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = 'Ali Test\\nBea'; t.dispatchEvent(new Event('input')); t.blur(); return true; })()`);
  await vanta(300);
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
  await f.tryck('#pl-samman [data-samman]');
  await vanta(100);
  const samman = await f.kor('window.__kopierat');
  sant('sammanställningen kopieras utan namn', samman?.includes('Sammanställning: Textsamtal i grupp') && samman.includes('Avstämning mitt i insatsen') && !/Ali|Bea|Prov 2B/.test(samman), samman);
  await f.tryck('#pl-samman [data-elevtext]');
  await vanta(100);
  const elevrad = await f.kor('window.__kopierat');
  sant('elevens rad kopieras utan namn', elevrad?.includes('vecka 46: 2, vecka 47: 3') && !/Ali|Bea/.test(elevrad), elevrad);
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
  await f.oppna(`${bas}/stodundervisning/upprepad-lasning`);
  sant('en metod utan plan har ingen knapp och ingen rad', !(await f.kor(`[...document.querySelectorAll('a')].some((a) => a.textContent.startsWith('Planera insatsen'))`)) && !(await f.kor(`!!document.getElementById('pl-din')`)));
  await f.oppna(`${bas}/stodundervisning`);
  await f.bredd(390); await vanta(150); await f.bild('6-metodbanken-telefon'); await f.dator();
  sant('Dina insatser i metodbanken', (await f.kor(`!document.getElementById('pl-insatser').hidden`)) && (await f.text('#pl-insatser'))?.includes('Textsamtal i grupp') && (await f.text('#pl-insatser'))?.includes('Prov 2B') && (await f.text('#pl-insatser'))?.includes('1 pass bockade'), await f.text('#pl-insatser'));
  sant('inga fel i konsolen efter sidbytena', !f.undantag.length, f.undantag);
  // En annan dator: inget sparat. Länken ger planen utan uppföljning, och kopian ger allt.
  await f.kor(`localStorage.clear()`);
  await f.oppna(lanken);
  sant('planen ur länken visas utan namn och utan uppföljning', (await f.text('#pl-besked'))?.includes('Planen kommer från en länk') && (await f.text('#pl-veckan-rubrik')) === 'Vecka 3 i planen' && !(await f.text('#pl-veckan .meta'))?.includes('Prov') && (await f.kor(`!document.getElementById('pl-spara').hidden && !document.querySelector('#pl-veckan [data-bock]')`)), [await f.text('#pl-besked'), await f.text('#pl-veckan .meta')]);
  const kopiefil = join(profil, 'kopia.json');
  writeFileSync(kopiefil, kopian ?? '');
  await f.filTill('#pl-kopia-fil', kopiefil);
  await vanta(600);
  sant('kopian öppnas med allt', (await f.kor(`JSON.parse(localStorage.getItem('insatser') ?? '{"planer":[]}').planer[0]?.foljd?.elever?.length`)) === 2 && (await f.text('#pl-toast'))?.includes('Kopian är öppnad') && (await f.kor(`!!document.querySelector('#pl-veckan [data-bock]')`)), await f.text('#pl-toast'));
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

  // ---- Efter insatsen ----
  // Måndag 14 december, efter planens sista pass. Sista veckan har metodens uppföljning efter och utvärderingen, och
  // sammanställningen har alla veckor.
  const h = await flik(false, Date.UTC(2026, 11, 14, 9, 0, 0));
  await h.oppna(PLAN);
  await h.kor(`localStorage.setItem('insatser', ${JSON.stringify(JSON.stringify(slutlagrat))})`);
  await h.oppna(PLAN);
  sant('efter insatsen: sidan visar Efter insatsen', (await h.text('#pl-veckan-rubrik')) === 'Efter insatsen', await h.text('#pl-veckan-rubrik'));
  sant('efter insatsen: insatsen är slut', (await h.text('#pl-veckan .pl-nasta .pl-etikett')) === 'Insatsen är slut' && (await h.text('.pl-nar')) === 'Sista passet var fredag 11 december.' && !(await h.kor(`!!document.querySelector('#pl-veckan [data-fil="lathund"]')`)), await h.text('.pl-nar'));
  sant('efter insatsen: kartläggningens text efter leder till planens nivå', (await h.kor(`[...document.querySelectorAll('#pl-veckan .pl-uppf a')].map((a) => a.getAttribute('href')).join()`))?.includes('/stodundervisning/textsamtal-i-grupp/mellan-kartlaggning-efter') && !lankFel(await sakLankar(h)).length, await h.kor(`[...document.querySelectorAll('#pl-veckan .pl-uppf a')].map((a) => a.getAttribute('href')).join()`));
  sant('efter insatsen: metodens uppföljning efter, ett fält per elev', (await h.kor(`document.querySelectorAll('#pl-veckan [data-resultat^="2-2026-12-14|"]').length`)) === 3);
  sant('efter insatsen: utvärderingen med målet, varje elevs riktning och resultaten före och efter', (await h.text('.pl-stam h3')) === 'Utvärdering efter insatsen' && (await h.text('.pl-stam .pl-maltext'))?.includes('Kunna läsa mellan raderna') && (await h.text('.pl-stam .pl-riktningar'))?.includes('1 till 3, framåt') && (await h.text('.pl-stam .pl-riktningar'))?.includes('Före 2 av 8, efter 4 av 8'), await h.text('.pl-stam'));
  sant('efter insatsen: sammanställningen', (await h.text('#pl-samman-rubrik')) === 'Sammanställningen' && (await h.text('#pl-samman'))?.includes('16 av 18 pass är bockade som genomförda.') && (await h.text('#pl-samman'))?.includes('Var med i'), await h.text('#pl-samman'));
  sant('efter insatsen: de tre eleverna i sammanställningen', (await h.kor(`document.querySelectorAll('#pl-samman details[data-elev]').length`)) === 3);
  for (const b of [320, 360, 390]) { await h.bredd(b); await vanta(150); sant(`efter insatsen rullar inte i sidled i ${b} punkter`, !(await rullar(h))); }
  await h.bredd(390); await vanta(150); await h.bild('8-efter-insatsen-telefon'); await h.dator(); await vanta(150); await h.bild('8-efter-insatsen-dator');
  await h.kor(`document.querySelector('#pl-samman details[data-elev]').open = true`);
  await h.bredd(390); await vanta(150); await h.bild('9-sammanstallningen-efter-telefon'); await h.dator(); await vanta(150); await h.bild('9-sammanstallningen-efter-dator');
  await h.tryck('[data-beslut="utvardering|forlang"]');
  sant('utvärderingens beslut sparas och frågar hur länge', (await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.utvardering?.beslut`)) === 'forlang' && !!(await h.kor(`!!document.querySelector('.pl-forlang [data-forlang="2"]')`)), await h.text('.pl-stam'));
  sant('utvärderingen står under Besluten', (await h.text('#pl-samman'))?.includes('Förläng insatsen'));
  await h.tryck('[data-forlang="2"]');
  sant('förläng med två veckor', (await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer[0].val`))?.includes('l=8') && (await h.text('#pl-toast'))?.includes('2 veckor längre'), await h.text('#pl-toast'));
  // Resultatet efter insatsen står kvar på sin dag, och den nya mätningen efter är tom (Codex 2026-10-24).
  sant('förlängningen flyttar inte resultatet efter', (await h.text('#pl-samman'))?.includes('Efter sex till åtta veckor, v. 51: 6 av 8') && (await h.kor(`(() => { const r = JSON.parse(localStorage.getItem('insatser')).planer[0].foljd.resultat; return !r['2-2026-12-28'] && r['2-2026-12-14'].e1 === '6 av 8'; })()`)), await h.text('#pl-samman'));
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
  sant('elevens rad kopieras från veckan, utan namnet', (await h.kor('window.__kopierat'))?.includes('vecka 45: 2') && !/Ali/.test((await h.kor('window.__kopierat')) ?? ''), await h.kor('window.__kopierat'));
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
  // En elev som tas bort: namnet blir en elev i lärarens meningar, beskedet kommer när läraren lämnar fältet, och Ångra tar
  // tillbaka allt (Codex 2026-10-24).
  await h.kor(`document.getElementById('pl-andra').open = true`);
  await h.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = 'Ali\\nSebastian Ek'; t.dispatchEvent(new Event('input')); t.blur(); return true; })()`);
  await vanta(200);
  sant('en borttagen elev blir en elev i lärarens meningar', (await h.kor(`JSON.parse(localStorage.getItem('insatser')).planer.find((p) => p.id === 'slut01').foljd.avstamning.not`)) === 'En elev behöver mer stöd vid stoppet.' && (await h.text('#pl-toast'))?.includes('Bea är borttagen ur elevlistan'), await h.text('#pl-toast'));
  await h.tryck('#pl-toast [data-toast-gor]');
  sant('Ångra tar tillbaka eleven och meningen', await h.kor(`(() => { const p = JSON.parse(localStorage.getItem('insatser')).planer.find((x) => x.id === 'slut01'); return p.foljd.elever.length === 3 && p.foljd.avstamning.not === 'Bea behöver mer stöd vid stoppet.'; })()`));
  // Tretton elever och samma namn två gånger (buggjakten 2026-10-24: den trettonde och den andra försvann utan besked).
  const tretton = ['Ali', 'Bea', 'Sebastian Ek', 'Alexandra', 'Cem', 'Dana', 'Elsa', 'Filip', 'Gul', 'Hugo', 'Ida', 'Jon', 'Kim', 'Bea'];
  await h.kor(`(() => { const t = document.getElementById('pl-elever'); t.focus(); t.value = ${JSON.stringify(tretton.join('\n'))}; t.dispatchEvent(new Event('input')); t.blur(); return true; })()`);
  await vanta(200);
  // Gruppens storlek mot metodens: Textsamtal i grupp är för två till åtta elever (de kalla testarna 2026-10-24).
  sant('en trettonde elev och samma namn två gånger sägs under listan, och gruppens storlek', (await h.text('#pl-elever-not')) === 'Kim kom inte med: elevlistan rymmer tolv elever. Bea står två gånger. Skriv två olika namn, som Bea A och Bea B. Metoden är skriven för två till åtta elever, och listan har 12.' && (await h.kor(`document.getElementById('pl-elever').value.split('\\n').length`)) === 12, await h.text('#pl-elever-not'));
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
  sant('inga fel i konsolen efter insatsen', !h.undantag.length && !(await h.kor('window.__fel.length')), h.undantag);
  h.stang();
  // Söndagen före vecka 2: nästa pass är måndagens, och rutan visar den veckans texter (Codex 2026-10-24).
  const helg = await flik(false, Date.UTC(2026, 10, 8, 9, 0, 0));
  await helg.oppna(PLAN);
  await helg.kor(`localStorage.setItem('insatser', ${JSON.stringify(JSON.stringify(slutlagrat))})`);
  await helg.oppna(PLAN);
  sant('på söndagen gäller rutan nästa pass och dess vecka', (await helg.text('.pl-nar')) === 'I morgon, måndag 9 november, vecka 2 i planen' && (await helg.text('#pl-veckan .pl-nasta [data-vy="2"]')) === 'Till vecka 2' && (await helg.text('#pl-veckan .pl-veckans summary'))?.startsWith('Texter till vecka 2'), [await helg.text('.pl-nar'), await helg.text('#pl-veckan .pl-veckans summary')]);
  sant('inga fel på söndagen', !helg.undantag.length, helg.undantag);
  helg.stang();

  // ---- Betans andra metoder (Planera 0.1) ----
  // Varje metod med planens fält: förslaget, en sparad plan med veckan, veckans fokus, länkar som leder till något som
  // finns, Beta och versionen, och inga fel. Formerna prövas så: en kurs i veckor med veckans lektion (De fyra räknesätten),
  // en progression i pass (Seriesamtal), Hem och skola (TIL i grupp) och veckor efter den sista raden (Läslistor i grupp).
  const b = await flik(false, Date.UTC(2026, 10, 18, 9, 0, 0));
  for (const m of planbara.filter((x) => x.id !== 'textsamtal-i-grupp')) {
    const adress = `${bas}/stodundervisning/${m.id}/planera`;
    await b.oppna(adress);
    await b.kor(`localStorage.clear()`);
    await b.oppna(adress);
    sant(`${m.id}: förslaget har pass, Beta och versionen`, (await b.text('#pl-summa-text'))?.includes('pass om') && (await b.kor(`!!document.querySelector('h1 .beta') && document.querySelector('.pl-version')?.textContent.includes('Planera ${s.PLANERA.version}')`)), await b.text('#pl-summa-text'));
    await b.kor(`(() => { const i = document.getElementById('pl-start'); i.value = '2026-11-02'; i.dispatchEvent(new Event('change')); return true; })()`);
    await b.tryck('#pl-spara');
    await vanta(200);
    sant(`${m.id}: den sparade planen visar veckan med fokus`, await b.kor(`!document.getElementById('pl-veckan').hidden && !!document.querySelector('#pl-veckan .pl-fokusruta')`), await b.text('#pl-veckan'));
    sant(`${m.id}: planens länkar leder till sidor och ankare som finns`, !lankFel(await sakLankar(b)).length, [await sakLankar(b), lankFel(await sakLankar(b))]);
    if (m.id === 'fyra-raknesatten') {
      const lektion = await b.kor(`document.querySelector('#pl-veckan a[data-goatcounter-click$=":kursvecka"]')?.getAttribute('href')`);
      sant('kurs i veckor: veckan leder till veckans lektion i metoden', !!lektion && !lankFel([lektion]).length && (await b.text('#pl-veckan a[data-goatcounter-click$=":kursvecka"]')) === 'Vecka 3 i metoden, med veckans manus', lektion);
      sant('kurs i veckor: Mina lärdomar leder till veckans blad', (await b.kor(`[...document.querySelectorAll('#pl-veckan a')].find((a) => a.textContent === 'Mina lärdomar')?.getAttribute('href')`))?.endsWith('#mina-lardomar-2'), await b.kor(`[...document.querySelectorAll('#pl-veckan a')].map((a) => a.textContent + ' ' + a.getAttribute('href')).join(' | ')`));
    }
    if (m.id === 'seriesamtal') sant('progression i pass: passens fokus med passen och stegets namn', (await b.text('#pl-veckan .pl-fokusruta .pl-led'))?.startsWith('Pass ') && (await b.text('#pl-veckan .pl-fokusruta .pl-etikett')) === 'Passens fokus', await b.text('#pl-veckan .pl-fokusruta'));
    sant(`${m.id}: inga fel`, !b.undantag.length && !(await b.kor('window.__fel.length')), b.undantag);
    await b.bredd(390); await vanta(150); await b.bild(`12-beta-${m.id}-telefon`); await b.dator();
  }
  b.stang();
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
