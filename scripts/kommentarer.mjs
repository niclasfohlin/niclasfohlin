#!/usr/bin/env node
// Kommentarernas läge, kreditmätare och avstängning.
//
//   npm run kommentarer                 Läget: på eller av, taket, månadens förbrukning, robotkontrollen
//   npm run kommentarer -- av           Stänger av: funktionen slutar svara och sajten byggs om utan rutan
//   npm run kommentarer -- på           Slår på igen. Kommentarerna ligger kvar i databasen
//   npm run kommentarer -- tak 150      Byter månadens tak i krediter och bygger om
//   npm run kommentarer -- bygg-om      Tömmer mellanlagringen, om listorna ser fel ut
//
// Av och på sätter miljövariabeln KOMMENTARER i Netlify och startar ett produktionsbygge (omkring 15
// krediter), eftersom både sidorna och funktionen läser variabeln först vid nästa bygge. Hur lagret
// hänger ihop står i DRIFT.md under Kommentarer.

import { execSync } from 'node:child_process';
import { LAGER, period, uppskattning } from '../netlify/lib/kommentarer.mjs';
import { hamta } from './krediter.mjs';

const SITE = '8af49398-3862-4b58-84a6-88f68d0064c1';
const kor = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NETLIFY_AUTH_TOKEN: undefined } });
const varde = (namn) => {
  try {
    const ut = kor(`netlify env:get ${namn}`).trim();
    return /no value|not set|finns inte|^$/i.test(ut) ? '' : ut.split('\n').pop().trim();
  } catch {
    return '';
  }
};
const bygg = () => {
  kor(`netlify api createSiteBuild --data "{\\"site_id\\":\\"${SITE}\\"}"`);
  console.log('Ett produktionsbygge är startat. Följ det med: node scripts/deploykoll.mjs (sajten är klar om omkring en minut).');
};

const [kommando = 'status', arg] = process.argv.slice(2);

if (kommando === 'av' || kommando === 'på' || kommando === 'pa') {
  const nytt = kommando === 'av' ? 'av' : 'på';
  kor(`netlify env:set KOMMENTARER ${nytt}`);
  console.log(`KOMMENTARER=${nytt} i Netlify.`);
  bygg();
  if (nytt === 'av') console.log('Rutan försvinner från sidorna med bygget. Kommentarerna ligger kvar i databasen och kommer tillbaka med: npm run kommentarer -- på');
  process.exit(0);
}

if (kommando === 'tak') {
  const tak = Number(arg);
  if (!Number.isFinite(tak) || tak <= 0) {
    console.error('Ange taket i krediter, till exempel: npm run kommentarer -- tak 150');
    process.exit(1);
  }
  kor(`netlify env:set KOMMENTARER_BUDGET ${tak}`);
  console.log(`KOMMENTARER_BUDGET=${tak} i Netlify.`);
  bygg();
  process.exit(0);
}

if (kommando === 'bygg-om') {
  // Tömmer mellanlagringen: listan över sidor med kommentarer, de sparade listorna och CDN:et.
  // Nästa läsare får då allt ur databasen, som vaknar en gång. Behövs bara om något ser fel ut,
  // till exempel efter en import i panelen, som går förbi funktionens krokar.
  const ut = kor(`netlify blobs:list ${LAGER} --prefix lista/ --json`);
  const { blobs = [] } = JSON.parse(ut.slice(ut.indexOf('{')));
  for (const { key } of blobs) kor(`netlify blobs:delete ${LAGER} ${key}`);
  kor(`netlify blobs:delete ${LAGER} sidor`);
  kor(`netlify api purgeCache --data "{\\"body\\":{\\"site_id\\":\\"${SITE}\\",\\"cache_tags\\":[\\"kommentarer\\"]}}"`);
  console.log(`Tömt: listan över sidor, ${blobs.length} sparade listor och CDN:et. Nästa läsare läser ur databasen.`);
  process.exit(0);
}

if (kommando !== 'status') {
  console.error('Okänt kommando. Använd status, av, på, tak <krediter> eller bygg-om.');
  process.exit(1);
}

const nu = new Date();
const nyckel = period(nu);
const periodStart = new Date(`${nyckel.slice('forbrukning-'.length)}T07:00:00Z`);
const lage = varde('KOMMENTARER') || 'på (variabeln saknas, förval)';
const tak = Number(varde('KOMMENTARER_BUDGET')) || 50;
const turnstile = [varde('TURNSTILE_KEY') ? 'nyckel finns' : 'nyckel saknas', varde('TURNSTILE_SECRET') ? 'hemlighet finns' : 'hemlighet saknas'].join(', ');

let f = null;
try {
  const ut = kor(`netlify blobs:get ${LAGER} ${nyckel}`).trim();
  f = JSON.parse(ut.slice(ut.indexOf('{')));
} catch { /* inget räknat än den här perioden */ }
const u = f ? uppskattning(f) : { db: 0, funktion: 0, anrop: 0, summa: 0 };

let saldo = null;
try { saldo = await hamta({ farsk: true }); } catch { /* Netlify svarar inte; raden säger det */ }

const k = (x) => x.toFixed(x < 10 ? 1 : 0).replace('.', ',');
console.log(`Kommentarerna: ${lage}`);
console.log(`Perioden: från ${periodStart.toISOString().slice(0, 10)} (Netlifys period börjar den 20:e)`);
console.log('');
console.log(`Kommentarerna har använt omkring ${k(u.summa)} av taket ${tak} krediter${u.summa >= tak ? ': TAKET NÅTT, nya kommentarer tas inte emot' : ''}.`);
console.log(`  databasen ${k(u.db)}, funktionen ${k(u.funktion)}, anropen ${k(u.anrop)}${f ? `; ${f.anrop} anrop, databasen vaken omkring ${Math.round(f.dbMinuter + (f.dbStart ? (f.dbSenast - f.dbStart) / 60000 + 5 : 0))} minuter` : ''}`);
console.log(saldo ? `Netlify: ${Math.round(saldo.kvar)} krediter kvar av ${Math.round(saldo.totalt)}. Hela räkningen, vad som drar och kreditspärren: npm run krediter` : 'Netlify-saldot gick inte att läsa: npm run krediter');
console.log('');
console.log(`Robotkontrollen (Cloudflare Turnstile): ${turnstile}.`);
