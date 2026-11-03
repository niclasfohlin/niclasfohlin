#!/usr/bin/env node
// Provet av verktyget Strategier (K-699, underlag/prov/strategier/UPPDRAGET.md), efter bygget i npm run validera, som
// scripts/strukturer/prov.mjs:
//
//   utkasten   en strategi som är utkast har ingen sida i dist och inget kort i public/strategier/kort/, så att ett utkast
//              aldrig går ut (bygget är produktionens)
//   sidorna    varje strategi som visas har sin sida i dist med namnet, meningen, stegen och knappen till kortet, och
//              verktygets sida länkar till den
//   korten     varje kort är två sidor, framsidan och baksidan, med namnet på båda; filen med alla kort har ett ark per
//              två kort med strategierna i numrens ordning, och bladet med alla är ett A4 med varje namn. Läst med pdftotext
//   åt andra hållet  samma läsning av ordningen på en omvänd lista ska stanna, så att provet ser felet det letar efter
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { strategikortetsFil, STRATEGIKORTEN_ALLA, STRATEGIBLADET } from '../../src/lib/standard/strategier.js';

const ROT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(ROT, 'dist');
const KORT = join(ROT, 'public', 'strategier', 'kort');
const MAPP = join(ROT, 'src', 'content', 'strategier');
const alla = readdirSync(MAPP).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => ({ id: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync(join(MAPP, f), 'utf8')) }));
const visas = alla.filter((s) => !s.utkast).sort((a, b) => a.nr - b.nr);
const utkast = alla.filter((s) => s.utkast);
const fel = [];
const html = (vag) => { const f = join(DIST, vag, 'index.html'); return existsSync(f) ? readFileSync(f, 'utf8') : null; };
const text = (pdf, ...sidor) => execFileSync('pdftotext', ['-enc', 'UTF-8', ...(sidor.length ? ['-f', String(sidor[0]), '-l', String(sidor[1] ?? sidor[0])] : []), pdf, '-'], { encoding: 'utf8' });
const sidorna = (pdf) => Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }))?.[1] ?? 0);
const enRad = (t) => t.replace(/\s+/g, ' ');

for (const s of utkast) {
  if (html(join('strategier', s.id))) fel.push(`${s.namn} är utkast men har en sida i dist`);
  if (existsSync(join(KORT, strategikortetsFil(s.id)))) fel.push(`${s.namn} är utkast men har ett kort i public/strategier/kort/`);
}

const verktyget = html('strategier');
if (!verktyget) fel.push('dist/strategier/index.html saknas');
for (const s of visas) {
  const sida = html(join('strategier', s.id));
  if (!sida) { fel.push(`${s.namn}: dist/strategier/${s.id}/index.html saknas`); continue; }
  for (const t of [s.namn, s.framsida.mening, ...s.baksida.saGorDu.map((x) => x.text)]) if (!enRad(sida).includes(t.replace(/&/g, '&amp;'))) fel.push(`${s.namn}: sidan saknar "${t}"`);
  if (!sida.includes(`/strategier/kort/${strategikortetsFil(s.id)}`)) fel.push(`${s.namn}: sidan har ingen knapp till kortet`);
  if (verktyget && !verktyget.includes(`href="/strategier/${s.id}"`)) fel.push(`${s.namn}: verktygets sida länkar inte till strategin`);
  const kort = join(KORT, strategikortetsFil(s.id));
  if (!existsSync(kort)) { fel.push(`${s.namn}: kortet saknas`); continue; }
  if (sidorna(kort) !== 2) fel.push(`${s.namn}: kortet har ${sidorna(kort)} sidor, inte två`);
  for (const sida of [1, 2]) if (!enRad(text(kort, sida)).includes(s.namn)) fel.push(`${s.namn}: kortets sida ${sida} saknar namnet`);
}

// Ordningen i filen med alla kort: framsidorna på varje ark i numrens ordning, uppe före nere.
const ordningen = (pdf, lista) => {
  const ut = [];
  for (let ark = 0; ark < Math.ceil(lista.length / 2); ark++) {
    const t = enRad(text(pdf, 2 * ark + 1));
    const par = lista.slice(2 * ark, 2 * ark + 2);
    const pos = par.map((s) => t.indexOf(s.namn));
    if (pos.some((p) => p < 0) || (pos.length === 2 && pos[0] > pos[1])) ut.push(`ark ${ark + 1} har inte ${par.map((s) => s.namn).join(' och ')} i den ordningen`);
  }
  return ut;
};
if (visas.length) {
  const allaFil = join(KORT, STRATEGIKORTEN_ALLA.fil);
  if (!existsSync(allaFil)) fel.push('Filen med alla kort saknas');
  else {
    if (sidorna(allaFil) !== 2 * Math.ceil(visas.length / 2)) fel.push(`Filen med alla kort har ${sidorna(allaFil)} sidor, inte ${2 * Math.ceil(visas.length / 2)}`);
    fel.push(...ordningen(allaFil, visas).map((f) => `Filen med alla kort: ${f}`));
    if (visas.length > 1 && !ordningen(allaFil, [...visas].reverse()).length) fel.push('Provet av ordningen ser inte en omvänd lista');
  }
  const bladet = join(KORT, STRATEGIBLADET.fil);
  if (!existsSync(bladet)) fel.push('Bladet med alla strategier saknas');
  else {
    if (sidorna(bladet) !== 1) fel.push(`Bladet med alla har ${sidorna(bladet)} sidor, inte en`);
    const t = enRad(text(bladet));
    for (const s of visas) if (!t.includes(s.namn)) fel.push(`Bladet med alla saknar ${s.namn}`);
  }
}

// Sådden (K-702): varje plats i src/data/sadd.json står som en invävd ruta på metodens sida med sina strategier, som
// strukturernas i scripts/strukturer/prov.mjs, och varje metod i Metoder i sajtens register har avsnittet med sina kort.
const saddJa = JSON.parse(readFileSync(join(ROT, 'src', 'data', 'sadd.json'), 'utf8')).saker.strategier?.ja ?? {};
let platser = 0;
for (const [metod, x] of Object.entries(saddJa)) {
  if (typeof x !== 'object' || !x.vav) continue;
  const fil = join(DIST, 'stodundervisning', metod, 'index.html');
  if (!existsSync(fil)) { fel.push(`Sådden: ${metod} har ingen sida i dist`); continue; }
  const rutor = [...readFileSync(fil, 'utf8').matchAll(/<aside class="vav[\s\S]*?<\/aside>/g)].map((m) => m[0]).filter((r) => r.includes('href="/strategier'));
  if (rutor.length !== x.vav.length) { fel.push(`Sådden: ${metod} har ${rutor.length} rutor med strategier på sidan, och src/data/sadd.json ${x.vav.length} platser`); continue; }
  const pasidan = rutor.map((r) => [...r.matchAll(/href="\/strategier\/([a-z0-9-]+)"/g)].map((m) => m[1]).join()).sort();
  const iregistret = x.vav.map((r) => (r.delar ?? []).join()).sort();
  if (pasidan.join(' | ') !== iregistret.join(' | ')) fel.push(`Sådden: ${metod} har strategierna ${pasidan.join(' | ')} på sidan och ska ha ${iregistret.join(' | ')}`);
  platser += x.vav.length;
}
const iMetoder = Object.keys(JSON.parse(readFileSync(join(ROT, 'src', 'data', 'strategier-i-metoder.json'), 'utf8'))).filter((k) => !k.startsWith('_'));
for (const metod of iMetoder) { const sida = html(join('metoder', metod)); if (sida && !sida.includes('id="strategierna"')) fel.push(`Sådden: ${metod} i Metoder saknar avsnittet Strategier för lärande`); }

if (fel.length) { console.error(`Strategier, provet stannade:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`Strategier, sådden: ${platser} platser i ${Object.keys(saddJa).length} metoder i Stödundervisning och avsnittet i ${iMetoder.length} metoder i Metoder.`);
console.log(visas.length
  ? `Strategier: ${visas.length} strategier med sida och kort, filen med alla i numrens ordning (prövad åt andra hållet) och bladet på ett A4; ${utkast.length} utkast utanför sajten.`
  : `Strategier: ingen strategi visas än; ${utkast.length} utkast har varken sida eller kort på sajten.`);
