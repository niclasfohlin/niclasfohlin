#!/usr/bin/env node
// Provet för verktyget Innehåll (K-793, K-795, K-796), efter bygget i npm run validera: sidan /innehall, dess adresser och
// filer, rutan Verktyg och Stödmaterial i båda bankerna, kortet i varje metod i Metoder och blocket i Före i Lär dig metoden.
// Det som prövas här och inte i intaget (scripts/innehall/intag.mjs) är det sajten har byggt.
//
//   node scripts/innehall/prov.mjs
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(ROT, 'dist');
const fel = [];
const html = (sida) => { const f = join(DIST, sida, 'index.html'); return existsSync(f) ? readFileSync(f, 'utf8') : null; };
// Texten i ett stycke html som läsaren ser den: utan taggar, med tecknen avkodade och ett mellanslag mellan orden.
const textAv = (h) => h.replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const v = JSON.parse(readFileSync(join(ROT, 'src', 'data', 'innehall', 'verktyget.json'), 'utf8'));
const register = JSON.parse(readFileSync(join(ROT, 'src', 'data', 'innehall-i-metoder.json'), 'utf8'));
// Riggens förslag, som meningarna läses ur (src/lib/metodersadd.ts): en ny plats i ett förslag prövas av sajten innan den gäller.
const forslag = new Map((JSON.parse(readFileSync(join(ROT, 'src', 'data', 'innehall', 'sadd-forslag.json'), 'utf8')).sadd ?? []).map((x) => [x.metod, x]));

// Sidan: adresserna som Börja här, korten, kartan och sådden leder till.
const sidan = html('innehall');
if (!sidan) fel.push('dist/innehall/index.html saknas');
else {
  const ankare = ['borja-har', 'mallarna', 'exempel', 'kartan', 'forskningen', ...v.fragor.map((f) => `fraga-${f.nr.toLowerCase()}`), ...v.avsnitt.map((a) => a.id), ...v.mallar.map((m) => `mall-${m.id}`)];
  for (const a of ankare) if (!sidan.includes(`id="${a}"`)) fel.push(`/innehall saknar adressen #${a}`);
  for (const [, a] of sidan.matchAll(/href="#([^"]+)"/g)) if (!sidan.includes(`id="${a}"`)) fel.push(`/innehall har en länk till #${a}, som sidan inte har`);
  // Frågorna i rutan Börja här i datans ordning, och varje fråga i Tänk till.
  const ordning = [...sidan.matchAll(/<span class="ih-fraga">([^<]+)<\/span>/g)].map((m) => m[1]);
  if (ordning.join(' | ') !== v.fragor.map((f) => f.fraga).join(' | ')) fel.push(`Börja här har frågorna ${ordning.join(' | ')} och ska ha ${v.fragor.map((f) => f.fraga).join(' | ')}`);
  // Varje fil som sidan leder till finns i bygget, och länken bär filens version.
  const filer = [...sidan.matchAll(/(?:href|src|srcset|data-drive-src)="(\/(?:innehall|stodundervisning)\/[^"]+\.(?:pdf|docx|svg|webp))(\?v=[0-9a-f]+)?"/g)];
  for (const [, fil, version] of filer) {
    if (!existsSync(join(DIST, fil))) fel.push(`/innehall leder till ${fil}, som saknas i bygget`);
    if (!version) fel.push(`/innehall leder till ${fil} utan filens version (scripts/filversion.mjs)`);
  }
  for (const m of v.mallar) {
    const fil = m.slag === 'elevblad' ? `/innehall/${m.id}.pdf` : `/stodundervisning/innehall-${m.id}.pdf`;
    if (!filer.some(([, f]) => f === fil)) fel.push(`/innehall har ingen knapp till ${m.namn} (${fil})`);
    if (!filer.some(([, f]) => f === `/innehall/minibild-${m.id}.webp`)) fel.push(`/innehall visar inte bladet ${m.namn} som minibild`);
  }
  for (const e of v.exempel) if (!filer.some(([, f]) => f === `/stodundervisning/innehall-${e.id}.pdf`)) fel.push(`/innehall har ingen knapp till exemplet ${e.titel}`);
  // Exemplen visar mallen ifylld på sidan, ur samma papper som pdf:en (de kalla testarna 2026-11-16: svaren stod bara i
  // pdf:en): varje rad i exemplets delar står på sidan.
  const sidansText = textAv(sidan);
  for (const e of v.exempel) {
    const p = JSON.parse(readFileSync(join(ROT, 'src', 'data', 'innehall', 'papper', `${e.id}.json`), 'utf8'));
    for (const d of p.delar ?? []) for (const r of d.rader) for (const c of r) for (const rad of String(c).split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean)) {
      if (!sidansText.includes(rad)) fel.push(`/innehall visar inte hela exemplet ${e.titel}: ”${rad.slice(0, 60)}” i ${d.rubrik} saknas`);
    }
  }
  if (/utkast/i.test(sidan.replace(/<script[\s\S]*?<\/script>/g, ''))) fel.push('/innehall har ordet utkast');
}

// Rutan Verktyg och Stödmaterial i båda bankerna (Niclas 2026-10-31: speglade).
for (const bank of ['stodundervisning', 'metoder']) {
  const s = html(bank);
  if (!s) { fel.push(`dist/${bank}/index.html saknas`); continue; }
  const ruta = s.match(/<aside class="vr"[\s\S]*?<\/aside>/)?.[0] ?? '';
  if (!/href="\/innehall"/.test(ruta)) fel.push(`Rutan Verktyg i /${bank} saknar Innehåll`);
}

// Kortet i varje metod i Metoder, och blocket i Före.
const metoderna = readdirSync(join(ROT, 'src', 'content', 'undervisningsmetoder')).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => f.replace(/\.yaml$/, ''));
let kort = 0;
for (const m of metoderna) {
  const r = register[m];
  if (!r || !(r.platser?.length || String(r.nej ?? '').trim())) { fel.push(`${m} i Metoder är inte prövad mot Innehåll; skriv den i src/data/innehall-i-metoder.json med platsen eller med nej och skälet`); continue; }
  const sida = html(join('metoder', m));
  if (!sida) continue;
  const rutor = [...sida.matchAll(/<aside class="vav[\s\S]*?<\/aside>/g)].map((x) => x[0]).filter((x) => x.includes('href="/innehall#borja-har"'));
  if (rutor.length !== (r.platser?.length ?? 0)) fel.push(`${m} har ${rutor.length} kort till Innehåll på sidan och ${r.platser?.length ?? 0} platser i src/data/innehall-i-metoder.json; en plats som sidan inte har ritas inte`);
  const f = forslag.get(m);
  for (const p of r.platser ?? []) {
    if (!f?.mening) { fel.push(`${m}: riggens leverans har ingen mening till kortet (src/data/innehall/sadd-forslag.json)`); continue; }
    if (f.plats !== p.efter) fel.push(`${m}: riggen föreslår platsen ${f.plats}, och src/data/innehall-i-metoder.json har ${p.efter}; pröva riggens plats mot metoden och skriv in den`);
    // Hela meningen, i kortets text utan taggar: förut prövades bara de första 40 tecknen, och ett avklippt kort gick igenom (Codex 2026-11-16).
    if (!rutor.some((x) => textAv(x).includes(f.mening.replace(/\s+/g, ' ')))) fel.push(`${m}: kortet till Innehåll saknar meningen ”${f.mening}” hel`);
  }
  kort += rutor.length;
  const larDig = html(join('metoder', m, 'lar-dig'));
  if (larDig && !larDig.includes('"innehall":{')) fel.push(`${m}: Lär dig metoden saknar Innehåll i Före (data.innehall)`);
}

if (fel.length) { console.error(`Innehåll, provet stannade:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`Innehåll: sidan med ${v.fragor.length} frågor, ${v.mallar.length} mallar och ${v.exempel.length} exempel, rutan Verktyg i båda bankerna, ${kort} kort i ${metoderna.length} metoder i Metoder och Före i Lär dig metoden.`);
