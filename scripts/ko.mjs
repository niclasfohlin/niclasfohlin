#!/usr/bin/env node
// Kön för niclasfohlin.se. Registret ligger i KO.md och skrivs bara av det här skriptet.
//
//   node scripts/ko.mjs lagg "<vad>" --var <fil> [--prio 1|2|3] [--drabbar lasare|rigg]
//                                   [--ur K-003 | --utanfor "<vad du höll på med>"] [--behovs "<vad Niclas gör>"]
//   node scripts/ko.mjs inkorg                 gör poster av raderna under ## Inkorg i KO.md
//   node scripts/ko.mjs lista [--alla]
//   node scripts/ko.mjs visa K-003
//   node scripts/ko.mjs starta K-003 [--gren natt/2026-09-20]
//   node scripts/ko.mjs klar K-003 --atgard "<vad som gjordes>" [--anda validera|ren|gren|kotak --skal "<varför>"]
//   node scripts/ko.mjs stang K-003 --skal "<underlaget som visar att posten är onödig>"
//   node scripts/ko.mjs blockera K-003 --behovs "<vad Niclas måste göra>"
//   node scripts/ko.mjs ateroppna K-003
//   node scripts/ko.mjs prio K-003 3 --skal "<varför>"
//   node scripts/ko.mjs rattelse K-003 --text "<det som visade sig fel i åtgärden>"
//   node scripts/ko.mjs prov                   kör köns egna prov i en tillfällig katalog
//
// Inga beroenden. Exitkod 0 = gjort, 1 = fel eller nekat, 3 = stannat (posten väntar på Niclas).
//
// Reglerna, och varför de finns:
//   Prio 1 görs nu, prio 2 i tur och ordning, prio 3 vilar tills ett annat jobb ändå ska ändra
//   samma fil. Därför kräver prio 3 --var: utan berörd fil finns inget som kan väcka posten.
//   --drabbar lasare betyder att en läsare av sajten ser något fel: det blir prio 1. --drabbar rigg
//   betyder att bara arbetssättet är drabbat: det blir prio 3. Så växer inte kön av småfynd.
//   Medan en post pågår kräver lagg antingen --ur <den posten> eller --utanfor. klar vägrar när
//   fler än två nya poster bär [UR <id>]: så många betyder att roten inte hittades.
//   klar kör npm run validera och kräver att allt är committat på postens gren. Sedan slås grenen
//   ihop till main och pushas; Netlify bygger.

import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HAR = fileURLToPath(import.meta.url);
const rot = process.env.KO_ROT ? resolve(process.env.KO_ROT) : resolve(dirname(HAR), '..');
const KOFIL = join(rot, 'KO.md');
const KOLUMNER = [['id', 'Id'], ['vad', 'Vad'], ['var', 'Var'], ['prio', 'Prio'], ['status', 'Status'], ['atgard', 'Åtgärd'], ['andrad', 'Ändrad'], ['behovs', 'Behövs']];
const GRINDAR = ['validera', 'ren', 'gren', 'kotak', 'pagar'];
const idag = () => new Date().toISOString().slice(0, 10);

const HUVUD = `# Kö

Riggens kö för niclasfohlin.se. Registret längst ner skrivs av \`scripts/ko.mjs\`; skriv inte i
tabellen för hand. Det du vill ha gjort skriver du under **Inkorg**, en uppgift per rad, så gör
\`node scripts/ko.mjs inkorg\` poster av raderna. \`/natt\` arbetar igenom den körbara kön.

| Kommando | Gör |
|---|---|
| \`node scripts/ko.mjs lista\` | den körbara kön, det blockerade och det vilande |
| \`node scripts/ko.mjs lagg "<vad>" --var <fil> --prio 1\\|2\\|3\` | ny post. \`--drabbar lasare\` ger prio 1, \`--drabbar rigg\` prio 3 |
| \`node scripts/ko.mjs starta K-003\` | relevansprövar, byter till grenen \`ko/K-003\` och märker posten pågår |
| \`node scripts/ko.mjs klar K-003 --atgard "<vad>"\` | kör \`npm run validera\`, kräver ren gren, stänger posten |
| \`node scripts/ko.mjs stang K-003 --skal "<underlag>"\` | avför en post som visat sig onödig |
| \`node scripts/ko.mjs blockera K-003 --behovs "<vad>"\` | posten väntar på Niclas |

Statusar: **öppen**, **pågår**, **blockerad**, **klar**, **stängd**. Prio 1 görs nu, prio 2 i tur
och ordning, **prio 3 vilar** tills ett annat jobb ändå ska ändra samma fil. **Behövs** säger vad
Niclas måste göra: inloggningar i webbläsaren, längre nyhetsbrev, rättigheter och fakta om honom själv.
`;

// ---------- argument ----------
const argv = process.argv.slice(2);
const kmd = argv[0];
const pos = [];
const flaggor = {};
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const n = a.slice(2);
    const nasta = argv[i + 1];
    if (nasta !== undefined && !nasta.startsWith('--')) { flaggor[n] = nasta; i++; } else flaggor[n] = true;
  } else pos.push(a);
}
const flagga = (n) => flaggor[n];
const fel = (msg, kod = 1) => { console.error(msg); process.exit(kod); };

// ---------- registret ----------
const cell = (s) => String(s ?? '').replace(/\|/g, '¦').replace(/\s*\n\s*/g, ' ').trim() || '-';
function lasKo() {
  if (!existsSync(KOFIL)) return { inkorg: [], poster: [] };
  const text = readFileSync(KOFIL, 'utf8').replace(/\r\n/g, '\n');
  const inkorg = [];
  const im = text.match(/^## Inkorg\s*\n([\s\S]*?)(?=^## |\n*$)/m);
  if (im) for (const rad of im[1].split('\n')) {
    const t = rad.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim();
    if (t && !t.startsWith('(') && !t.startsWith('<!--')) inkorg.push(t);
  }
  const poster = [];
  const rm = text.match(/^## Register\s*\n([\s\S]*)$/m);
  if (rm) for (const rad of rm[1].split('\n')) {
    if (!/^\|\s*K-\d{3,}\s*\|/.test(rad)) continue;
    const c = rad.split('|').slice(1, -1).map((x) => x.trim());
    const p = {};
    KOLUMNER.forEach(([k], i) => { p[k] = c[i] === '-' || c[i] === undefined ? '' : c[i]; });
    poster.push(p);
  }
  return { inkorg, poster };
}
function skrivKo({ inkorg, poster }) {
  const rader = [
    HUVUD,
    '## Inkorg',
    '',
    ...(inkorg.length ? inkorg.map((r) => '- ' + r) : ['(Skriv en uppgift per rad. `node scripts/ko.mjs inkorg` gör poster av dem och tömmer listan.)']),
    '',
    '## Register',
    '',
    '| ' + KOLUMNER.map(([, r]) => r).join(' | ') + ' |',
    '|' + KOLUMNER.map(() => '---').join('|') + '|',
    ...poster.map((p) => '| ' + KOLUMNER.map(([k]) => cell(p[k])).join(' | ') + ' |'),
    '',
  ];
  writeFileSync(KOFIL, rader.join('\n'), 'utf8');
}
const nyttId = (poster) => 'K-' + String(poster.reduce((m, p) => Math.max(m, +p.id.slice(2) || 0), 0) + 1).padStart(3, '0');
const hitta = (poster, id) => {
  const p = poster.find((x) => x.id === id);
  if (!p) fel(`Hittar inte ${id} i kön.`);
  return p;
};
const korbar = (p) => (p.status === 'öppen' || p.status === 'pågår') && p.prio !== '3';

// ---------- git ----------
function git(args, tyst = false) {
  const r = spawnSync('git', args, { cwd: rot, encoding: 'utf8' });
  if (r.status !== 0 && !tyst) fel(`git ${args.join(' ')} misslyckades:\n${(r.stderr || r.stdout || '').trim()}`);
  return r;
}
const iGit = () => git(['rev-parse', '--is-inside-work-tree'], true).status === 0;
const grenNu = () => git(['rev-parse', '--abbrev-ref', 'HEAD'], true).stdout?.trim() || '';
// KO.md står i .gitignore och committas aldrig. Registret är arbetsläge, inte innehåll: låg det i
// git skulle det byta utseende med grenen (en post som pågår på ko/K-003 vore öppen på main) och
// krocka vid varje sammanslagning. Det mättes i köns eget prov innan regeln skrevs. KO.md räknas
// därför inte när arbetsträdet prövas; allt annat ska ligga i git innan en post startas eller blir klar.
const arRen = () => (git(['status', '--porcelain'], true).stdout || '').split('\n').filter((r) => r.trim() && !/\sKO\.md$/.test(r)).length === 0;
const grenAvPost = (p) => (p.atgard.match(/på grenen (\S+)/) || [])[1] || '';
const bokfor = (ko) => skrivKo(ko);

// ---------- kommandon ----------
if (!kmd || kmd === 'hjalp' || kmd === '--help') {
  console.log(readFileSync(HAR, 'utf8').split('\n').filter((r) => r.startsWith('//')).map((r) => r.slice(3)).join('\n'));
  process.exit(0);
}

if (kmd === 'lagg') {
  const vad = pos[0];
  if (!vad || vad.length < 10) fel('lagg kräver en beskrivning: lagg "<vad som är fel eller ska göras>"');
  const ko = lasKo();
  const varFil = flagga('var') && flagga('var') !== true ? String(flagga('var')) : '';
  const drabbar = flagga('drabbar');
  let prio = flagga('prio') ? String(flagga('prio')) : '';
  if (drabbar && !['lasare', 'rigg'].includes(drabbar)) fel('--drabbar tar lasare eller rigg: ser en läsare av sajten felet, eller bara den som arbetar i riggen?');
  if (drabbar === 'lasare') { if (prio && prio !== '1') fel('--drabbar lasare är prio 1: en läsare ser felet.'); prio = '1'; }
  if (drabbar === 'rigg') { if (prio && prio !== '3') fel('--drabbar rigg är prio 3 och vilar: ingen läsare ser felet.'); prio = '3'; }
  if (!prio) prio = '2';
  if (!['1', '2', '3'].includes(prio)) fel('--prio tar 1, 2 eller 3.');
  if (prio === '3' && !varFil) fel('Prio 3 vilar tills ett annat jobb rör samma fil, så den kräver --var <fil>. Utan fil kan posten aldrig väckas.');
  const pagar = ko.poster.filter((p) => p.status === 'pågår');
  let markering = '';
  if (pagar.length) {
    const ur = flagga('ur');
    const utanfor = flagga('utanfor');
    if (ur && ur !== true) {
      if (!pagar.some((p) => p.id === ur)) fel(`--ur ${ur}: den posten pågår inte. Pågår: ${pagar.map((p) => p.id).join(', ')}.`);
      markering = ` [UR ${ur}]`;
    } else if (utanfor && utanfor !== true) {
      markering = ` [UTANFÖR: ${utanfor}]`;
    } else {
      fel(`${pagar.map((p) => p.id).join(', ')} pågår. Är fyndet ur det arbetet: --ur ${pagar[0].id}. Hör det inte dit: --utanfor "<vad du höll på med>". Första valet är att laga det i samma omgång utan ny post.`);
    }
  }
  const id = nyttId(ko.poster);
  const behovs = flagga('behovs') && flagga('behovs') !== true ? String(flagga('behovs')) : '';
  ko.poster.push({ id, vad: vad + markering, var: varFil, prio, status: behovs ? 'blockerad' : 'öppen', atgard: '', andrad: idag(), behovs });
  bokfor(ko);
  console.log(`${id} lagd: prio ${prio}${prio === '3' ? ' (vilande)' : ''}${behovs ? ', blockerad. Behövs: ' + behovs : ''}.`);
  if (pagar.length && markering.startsWith(' [UR')) {
    const n = ko.poster.filter((p) => p.vad.includes(`[UR ${flagga('ur')}]`)).length;
    if (n > 2) console.log(`Obs: ${n} poster bär [UR ${flagga('ur')}]. klar vägrar över två: hitta roten eller dela jobbet.`);
  }
  process.exit(0);
}

if (kmd === 'inkorg') {
  const ko = lasKo();
  if (!ko.inkorg.length) { console.log('Inkorgen är tom.'); process.exit(0); }
  for (const rad of ko.inkorg) {
    const id = nyttId(ko.poster);
    ko.poster.push({ id, vad: rad, var: '', prio: '2', status: 'öppen', atgard: '', andrad: idag(), behovs: '' });
    console.log(`${id}  ${rad}`);
  }
  ko.inkorg = [];
  bokfor(ko);
  console.log('Poster gjorda av inkorgen, prio 2. Sätt prio och fil med: node scripts/ko.mjs prio K-0xx 1 --skal "…"');
  process.exit(0);
}

if (kmd === 'lista') {
  const ko = lasKo();
  const rad = (p, extra = '') => `  ${p.id}  ${extra}${(p.var || '-').padEnd(34).slice(0, 34)}  ${p.vad.slice(0, 90)}`;
  const kor = ko.poster.filter(korbar).sort((a, b) => a.prio.localeCompare(b.prio) || a.id.localeCompare(b.id));
  const block = ko.poster.filter((p) => p.status === 'blockerad');
  const vil = ko.poster.filter((p) => p.prio === '3' && (p.status === 'öppen' || p.status === 'pågår'));
  if (ko.inkorg.length) console.log(`Inkorgen har ${ko.inkorg.length} rad(er). Kör: node scripts/ko.mjs inkorg\n`);
  if (!kor.length) console.log('Inga poster i den körbara kön.');
  else {
    console.log('KÖRBAR KÖ, prio 1 först. Ta den översta: node scripts/ko.mjs starta <id>');
    for (const p of kor) console.log(rad(p, `${p.prio}  ${p.status === 'pågår' ? 'PÅGÅR ' : '      '}`));
  }
  if (block.length) {
    console.log('\nBLOCKERAT, väntar på Niclas:');
    for (const p of block) console.log(`  ${p.id}  ${p.vad.slice(0, 70)}\n         Behövs: ${p.behovs || '?'}`);
  }
  if (vil.length) {
    console.log('\nVILANDE, prio 3. Tas med när ett annat jobb ändå ska ändra samma fil:');
    for (const p of vil) console.log(rad(p));
  }
  if (flagga('alla')) {
    const rest = ko.poster.filter((p) => p.status === 'klar' || p.status === 'stängd');
    if (rest.length) { console.log('\nKLARA OCH STÄNGDA:'); for (const p of rest) console.log(`  ${p.id}  ${p.status.padEnd(7)} ${p.andrad}  ${p.vad.slice(0, 60)}`); }
  } else {
    const n = ko.poster.filter((p) => p.status === 'klar' || p.status === 'stängd').length;
    if (n) console.log(`\n${n} klara eller stängda. Kör med --alla för hela kön.`);
  }
  process.exit(0);
}

if (kmd === 'visa') {
  const p = hitta(lasKo().poster, pos[0]);
  for (const [k, r] of KOLUMNER) console.log(`${r.padEnd(8)} ${p[k] || '-'}`);
  process.exit(0);
}

if (kmd === 'starta') {
  const id = pos[0];
  const ko = lasKo();
  const p = hitta(ko.poster, id);
  if (p.status === 'klar' || p.status === 'stängd') fel(`${id} är redan ${p.status}.`);
  if (p.status === 'blockerad') fel(`${id} är blockerad. Behövs: ${p.behovs || '?'}\nDet är Niclas som gör det. Kör ateroppna ${id} när det är gjort.`, 3);
  const pagar = ko.poster.filter((q) => q.status === 'pågår' && q.id !== id);
  if (pagar.length && flagga('anda') !== 'pagar') fel(`${pagar.map((q) => q.id).join(', ')} pågår redan. En post i taget: gör klart, eller --anda pagar --skal "<varför två samtidigt>".`);
  if (p.prio === '3') console.log(`Obs: ${id} är vilande (prio 3). Den ska bara tas med när ett annat jobb ändå rör ${p.var || 'samma fil'}.`);
  console.log(`RELEVANSPRÖVA FÖRST. Posten skrevs ${p.andrad}.`);
  console.log('  1. Finns felet eller behovet kvar i dagens kod och innehåll?');
  console.log('  2. Vem märker det, och när?');
  console.log('  3. Motiverar nyttan ändringen, valideringen och underhållet?');
  console.log(`  Är svaret nej: node scripts/ko.mjs stang ${id} --skal "<vad som visar det>"`);
  let gren = '';
  if (iGit()) {
    if (!arRen()) fel('Arbetsträdet är inte rent. Committa eller lägg undan (git stash) innan du startar en post.');
    // Registret committas där du står innan grenen byts, så att KO.md aldrig hindrar bytet.
    bokfor(ko);
    gren = flagga('gren') && flagga('gren') !== true ? String(flagga('gren')) : `ko/${id}`;
    const finns = git(['rev-parse', '--verify', '--quiet', gren], true).status === 0;
    if (finns) git(['switch', gren]);
    else {
      // Postens gren utgår från main, inte från den gren du råkar stå på: annars bygger posten
      // vidare på en annan posts osammanslagna ändringar och Niclas kan inte slå ihop dem var för sig.
      if (git(['rev-parse', '--verify', '--quiet', 'main'], true).status === 0) git(['switch', 'main']);
      git(['switch', '-c', gren]);
    }
  }
  p.status = 'pågår';
  p.andrad = idag();
  p.atgard = `startad ${idag()}${gren ? ' på grenen ' + gren : ''}`;
  bokfor(ko);
  console.log(`${id} pågår${gren ? ' på grenen ' + gren : ''}. Rör bara det posten gäller. Före klar: allt committat och npm run validera grönt.`);
  process.exit(0);
}

if (kmd === 'klar') {
  const id = pos[0];
  const ko = lasKo();
  const p = hitta(ko.poster, id);
  if (p.status !== 'pågår') fel(`${id} pågår inte (status ${p.status}). Bara en startad post kan bli klar; en onödig post avförs med stang.`, p.status === 'blockerad' ? 3 : 1);
  const atgard = flagga('atgard');
  if (!atgard || atgard === true || String(atgard).length < 10) fel('klar kräver --atgard "<vad som gjordes>", så att nästa läsare av kön ser det utan att läsa diffen.');
  const anda = flagga('anda') && flagga('anda') !== true ? String(flagga('anda')).split(',') : [];
  for (const a of anda) if (!GRINDAR.includes(a)) fel(`--anda tar ${GRINDAR.join(', ')}.`);
  if (anda.length && (!flagga('skal') || flagga('skal') === true)) fel('--anda kräver --skal "<varför grinden får forceras>". Det skrivs in i åtgärden.');
  const stopp = [];
  const forcerat = [];
  const prova = (namn, ok, text) => { if (ok) return; if (anda.includes(namn)) forcerat.push(`${namn}: ${text}`); else stopp.push(`[${namn}] ${text}`); };

  const inneIGit = iGit();
  if (inneIGit) {
    const nu = grenNu();
    const vantad = grenAvPost(p);
    prova('gren', nu !== 'main' && nu !== 'master' && (!vantad || vantad === nu), nu === 'main' || nu === 'master' ? `du står på ${nu}; arbetet ska ligga på postens gren${vantad ? ' ' + vantad : ''}` : `du står på ${nu} men posten startades på ${vantad}`);
    prova('ren', arRen(), 'arbetsträdet har ändringar som inte är committade; klar gäller bara det som ligger i git');
  }
  const kotakN = ko.poster.filter((q) => q.vad.includes(`[UR ${id}]`) && q.status !== 'stängd').length;
  prova('kotak', kotakN <= 2, `${kotakN} nya poster bär [UR ${id}]; över två betyder att roten inte hittades eller att jobbet är för stort`);

  let valideraUt = '';
  if (!stopp.length || anda.includes('validera')) {
    const cmd = process.env.KO_VALIDERA;
    const r = cmd
      ? spawnSync(cmd, { cwd: rot, encoding: 'utf8', shell: true })
      : spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'validera'], { cwd: rot, encoding: 'utf8', shell: process.platform === 'win32' });
    valideraUt = ((r.stdout || '') + (r.stderr || '')).trim();
    prova('validera', r.status === 0, 'npm run validera är rött:\n' + valideraUt.split('\n').slice(-12).join('\n'));
  }
  if (/\b(utskick|skicka)/i.test(String(atgard))) console.log('Obs: åtgärden nämner utskick. Ett massutskick går ut först när Niclas sagt skicka.');

  if (stopp.length) {
    console.error(`${id} är INTE klar. ${stopp.length} grind(ar) stänger:\n  ${stopp.join('\n  ')}\nGrindarna finns för att en ändring som bryter sajten annars går in tyst. Forcera bara med --anda <grind> --skal "<varför>".`);
    process.exit(1);
  }
  p.status = 'klar';
  p.andrad = idag();
  p.atgard = `${atgard}${forcerat.length ? ' [FORCERAT: ' + forcerat.join('; ') + ' — skäl: ' + flagga('skal') + ']' : ''}`;
  bokfor(ko);
  const gren = inneIGit ? grenNu() : '';
  console.log(`${id} är klar.${forcerat.length ? ' FORCERAT förbi ' + forcerat.map((f) => f.split(':')[0]).join(', ') + '; det står kvar i åtgärden.' : ''}`);
  if (gren) console.log(`Slå ihop och pusha, så bygger Netlify:\n  git log main..${gren} --oneline\n  git switch main && git merge ${gren} && git push`);
  process.exit(0);
}

if (kmd === 'stang') {
  const id = pos[0];
  const skal = flagga('skal');
  if (!skal || skal === true) fel('stang kräver --skal "<underlaget>": kod, commit, sida eller den post som redan täcker samma sak.');
  const ko = lasKo();
  const p = hitta(ko.poster, id);
  if (p.status === 'klar' || p.status === 'stängd') fel(`${id} är redan ${p.status}.`);
  p.status = 'stängd';
  p.andrad = idag();
  p.atgard = `AVFÖRD: ${skal}`;
  bokfor(ko);
  console.log(`${id} avförd.`);
  process.exit(0);
}

if (kmd === 'blockera') {
  const id = pos[0];
  const behovs = flagga('behovs');
  if (!behovs || behovs === true) fel('blockera kräver --behovs "<vad Niclas måste göra>".');
  const ko = lasKo();
  const p = hitta(ko.poster, id);
  if (p.status === 'klar' || p.status === 'stängd') fel(`${id} är ${p.status}.`);
  p.status = 'blockerad';
  p.behovs = String(behovs);
  p.andrad = idag();
  bokfor(ko);
  console.log(`${id} blockerad. Behövs: ${behovs}`);
  process.exit(0);
}

if (kmd === 'ateroppna') {
  const id = pos[0];
  const ko = lasKo();
  const p = hitta(ko.poster, id);
  if (p.status !== 'blockerad' && p.status !== 'stängd') fel(`${id} är ${p.status}; bara blockerade och stängda poster återöppnas.`);
  p.status = 'öppen';
  p.behovs = '';
  p.andrad = idag();
  bokfor(ko);
  console.log(`${id} är öppen igen.`);
  process.exit(0);
}

if (kmd === 'prio') {
  const [id, ny] = pos;
  if (!['1', '2', '3'].includes(ny)) fel('prio <id> <1|2|3> --skal "<varför>"');
  if (!flagga('skal') || flagga('skal') === true) fel('prio kräver --skal.');
  const ko = lasKo();
  const p = hitta(ko.poster, id);
  if (ny === '3' && !p.var) fel(`Prio 3 kräver berörd fil i kolumnen Var; ${id} har ingen. Utan fil kan posten aldrig väckas.`);
  p.prio = ny;
  p.andrad = idag();
  p.atgard = (p.atgard ? p.atgard + ' ' : '') + `[prio ${ny} ${idag()}: ${flagga('skal')}]`;
  bokfor(ko);
  console.log(`${id} har prio ${ny}.`);
  process.exit(0);
}

if (kmd === 'rattelse') {
  const id = pos[0];
  const text = flagga('text');
  if (!text || text === true) fel('rattelse kräver --text "<vad som visade sig fel>".');
  const ko = lasKo();
  const p = hitta(ko.poster, id);
  if (p.status !== 'klar' && p.status !== 'stängd') fel(`${id} är ${p.status}; en rättelse gäller en avslutad post. Är den öppen: ändra den i stället.`);
  p.atgard = `${p.atgard} RÄTTELSE ${idag()}: ${text}`;
  bokfor(ko);
  console.log(`Rättelse skriven på ${id}.`);
  process.exit(0);
}

if (kmd === 'prov') {
  // Köns egna prov: ett tomt git-repo i en tillfällig katalog, en attrapp för npm run validera
  // som läser sin exitkod ur en fil, och varje grind prövad röd och grön.
  const t = mkdtempSync(join(tmpdir(), 'ko-prov-'));
  mkdirSync(join(t, 'scripts'));
  copyFileSync(HAR, join(t, 'scripts', 'ko.mjs'));
  writeFileSync(join(t, '.gitignore'), 'KO.md\n');
  writeFileSync(join(t, 'validera.status'), '0');
  writeFileSync(join(t, 'validera.mjs'), "import { readFileSync } from 'node:fs'; process.exit(+readFileSync('validera.status','utf8').trim());");
  writeFileSync(join(t, 'package.json'), '{"name":"ko-prov","type":"module","scripts":{"validera":"node validera.mjs"}}');
  const g = (...a) => spawnSync('git', a, { cwd: t, encoding: 'utf8' });
  g('init', '-q', '-b', 'main'); g('config', 'user.email', 'prov@example.com'); g('config', 'user.name', 'prov');
  g('add', '.'); g('commit', '-q', '-m', 'start');
  const ko = (...a) => {
    const r = spawnSync(process.execPath, [join(t, 'scripts', 'ko.mjs'), ...a], { cwd: t, encoding: 'utf8', env: { ...process.env, KO_ROT: t, KO_VALIDERA: 'node validera.mjs' } });
    return { kod: r.status, ut: (r.stdout || '') + (r.stderr || '') };
  };
  const reg = () => readFileSync(join(t, 'KO.md'), 'utf8');
  const krav = [];
  const ska = (namn, ok, ut) => { krav.push([namn, ok]); if (!ok) console.log(`RÖTT  ${namn}\n${(ut || '').trim().split('\n').map((r) => '      ' + r).join('\n')}`); };

  let r = ko('lagg', 'Startsidan visar utkast i produktionsbygget');
  ska('lagg utan prio ger K-001 prio 2, exit 0', r.kod === 0 && /K-001 lagd: prio 2/.test(r.ut), r.ut);
  r = ko('lagg', 'Kommentaren i Base.astro är inaktuell', '--drabbar', 'rigg');
  ska('drabbar rigg utan --var nekas, exit 1', r.kod === 1 && /--var/.test(r.ut), r.ut);
  r = ko('lagg', 'Kommentaren i Base.astro är inaktuell', '--drabbar', 'rigg', '--var', 'src/layouts/Base.astro');
  ska('drabbar rigg med --var blir prio 3 vilande', r.kod === 0 && /prio 3 \(vilande\)/.test(r.ut), r.ut);
  r = ko('lagg', 'Länken till originalet är trasig på en artikelsida', '--drabbar', 'lasare', '--var', 'src/components/Kalla.astro');
  ska('drabbar lasare blir prio 1', r.kod === 0 && /K-003 lagd: prio 1/.test(r.ut), r.ut);
  r = ko('lagg', 'Fel prio och drabbar tillsammans', '--drabbar', 'lasare', '--prio', '2');
  ska('drabbar lasare med --prio 2 nekas', r.kod === 1, r.ut);
  r = ko('lista');
  ska('lista visar K-003 före K-001 och K-002 som vilande', r.kod === 0 && r.ut.indexOf('K-003') < r.ut.indexOf('K-001') && /VILANDE[\s\S]*K-002/.test(r.ut), r.ut);
  ska('KO.md står utanför git och syns inte som ändring', !/KO.md/.test(g('status', '--porcelain').stdout), g('status', '--porcelain').stdout);
  r = ko('starta', 'K-003');
  ska('starta byter till ko/K-003 och märker pågår', r.kod === 0 && g('rev-parse', '--abbrev-ref', 'HEAD').stdout.trim() === 'ko/K-003' && /\| K-003 \|[^\n]*\| pågår \|/.test(reg()), r.ut);
  r = ko('starta', 'K-001');
  ska('starta en andra post medan K-003 pågår nekas', r.kod === 1 && /pågår redan/.test(r.ut), r.ut);
  r = ko('lagg', 'Fynd under arbetet utan markering');
  ska('lagg medan en post pågår kräver --ur eller --utanfor', r.kod === 1 && /--ur K-003/.test(r.ut), r.ut);
  r = ko('lagg', 'Fynd som hör till ett annat arbete', '--utanfor', 'såg det när jag läste Kalla.astro');
  ska('lagg --utanfor går igenom', r.kod === 0, r.ut);
  for (const n of [1, 2, 3]) r = ko('lagg', `Fynd nummer ${n} ur K-003`, '--ur', 'K-003');
  ska('tre poster [UR K-003] går att lägga', r.kod === 0 && /3 poster bär \[UR K-003\]/.test(r.ut), r.ut);
  writeFileSync(join(t, 'andrad.txt'), 'x');
  r = ko('klar', 'K-003', '--atgard', 'rättade länken i Kalla.astro');
  ska('klar med ocommittat arbete nekas på ren, exit 1', r.kod === 1 && /\[ren\]/.test(r.ut), r.ut);
  g('add', '.'); g('commit', '-q', '-m', 'K-003: lagning');
  r = ko('klar', 'K-003', '--atgard', 'rättade länken i Kalla.astro');
  ska('klar med tre [UR] nekas på kotak', r.kod === 1 && /\[kotak\]/.test(r.ut) && !/\[ren\]/.test(r.ut), r.ut);
  r = ko('stang', 'K-007', '--skal', 'dubblett av K-006');
  ska('stang avför en UR-post', r.kod === 0, r.ut);
  writeFileSync(join(t, 'validera.status'), '1');
  g('add', '.'); g('commit', '-q', '-m', 'validera rött');
  r = ko('klar', 'K-003', '--atgard', 'rättade länken i Kalla.astro');
  ska('klar med rött validera nekas', r.kod === 1 && /\[validera\]/.test(r.ut), r.ut);
  writeFileSync(join(t, 'validera.status'), '0');
  g('add', '.'); g('commit', '-q', '-m', 'validera grönt');
  r = ko('klar', 'K-003', '--atgard', 'rättade länken i Kalla.astro');
  ska('klar går igenom när grindarna är gröna och skriver merge-raderna', r.kod === 0 && /\| K-003 \|[^\n]*\| klar \|/.test(reg()) && /git merge ko\/K-003/.test(r.ut), r.ut);
  r = ko('klar', 'K-003', '--atgard', 'igen');
  ska('klar på en klar post nekas', r.kod === 1, r.ut);
  r = ko('rattelse', 'K-003', '--text', 'länken var rätt, felet satt i datumet');
  ska('rattelse på en klar post skrivs in', r.kod === 0 && /RÄTTELSE/.test(reg()), r.ut);
  r = ko('rattelse', 'K-001', '--text', 'x');
  ska('rattelse på en öppen post nekas', r.kod === 1, r.ut);
  r = ko('blockera', 'K-001', '--behovs', 'Niclas bekräftar rättigheterna');
  ska('blockera sätter Behövs', r.kod === 0 && /blockerad \|[^\n]*Niclas bekräftar/.test(reg()), r.ut);
  r = ko('starta', 'K-001');
  ska('starta en blockerad post stannar med exit 3', r.kod === 3 && /Behövs/.test(r.ut), r.ut);
  r = ko('ateroppna', 'K-001');
  ska('ateroppna gör posten öppen', r.kod === 0 && /\| K-001 \|[^\n]*\| öppen \|/.test(reg()), r.ut);
  r = ko('starta', 'K-001');
  ska('starta från en klar posts gren utgår från main', r.kod === 0 && g('rev-parse', '--abbrev-ref', 'HEAD').stdout.trim() === 'ko/K-001' && !/K-003: lagning/.test(g('log', '--oneline').stdout), r.ut + g('log', '--oneline').stdout);
  g('switch', '-q', 'main');
  r = ko('klar', 'K-001', '--atgard', 'gjorde något på fel gren');
  ska('klar på main nekas på gren', r.kod === 1 && /\[gren\]/.test(r.ut), r.ut);
  r = ko('klar', 'K-001', '--atgard', 'gjorde något på fel gren', '--anda', 'gren');
  ska('--anda utan --skal nekas', r.kod === 1 && /--skal/.test(r.ut), r.ut);
  r = ko('klar', 'K-001', '--atgard', 'gjorde något på fel gren', '--anda', 'gren', '--skal', 'provet');
  ska('--anda gren --skal släpper igenom och skriver FORCERAT', r.kod === 0 && /FORCERAT: gren/.test(reg()), r.ut);
  r = ko('prio', 'K-004', '3', '--skal', 'liten');
  ska('prio 3 utan fil nekas', r.kod === 1 && /Var/.test(r.ut), r.ut);
  const text = reg().replace(/^## Inkorg\s*\n[\s\S]*?(?=^## Register)/m, '## Inkorg\n\n- Gå igenom startsidan i mobilbredd\n- Lägg till bokomslag\n\n');
  writeFileSync(join(t, 'KO.md'), text);
  r = ko('inkorg');
  ska('inkorg gör poster av raderna och tömmer listan', r.kod === 0 && /Gå igenom startsidan i mobilbredd/.test(reg()) && !/^- Gå igenom/m.test(reg()), r.ut);
  r = ko('lista', '--alla');
  ska('lista --alla visar klara', r.kod === 0 && /KLARA OCH STÄNGDA/.test(r.ut), r.ut);

  rmSync(t, { recursive: true, force: true });
  const roda = krav.filter(([, ok]) => !ok);
  console.log(`\nKöns prov: ${krav.length - roda.length} gröna, ${roda.length} röda av ${krav.length}.`);
  process.exit(roda.length ? 1 : 0);
}

fel(`Okänt kommando: ${kmd}. Kör node scripts/ko.mjs utan argument för hjälp.`);
