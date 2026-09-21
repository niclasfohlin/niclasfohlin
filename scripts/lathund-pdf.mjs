#!/usr/bin/env node
// Lathunden som pdf, liggande A4 på fyra sidor, så att den som skriver ut slipper utskriftsrutans
// inställningar. Bygger sajten, skriver ut med Chrome ur dist, kontrollerar sidantal och upphov
// och lägger filen i public/stodundervisning/ (följer med i bygget) och i dist/. Filerna committas:
// Netlify har ingen Chrome. Ett manifest (lathund-pdf.json) med hash av allt som påverkar lathunden
// gör att kontrollen ser om en pdf är inaktuell, utan Chrome och utan att lita på ändringstider.
//
//   node scripts/lathund-pdf.mjs                 alla metoder med lathund
//   node scripts/lathund-pdf.mjs <id> [<id>…]    bara de angivna
//   node scripts/lathund-pdf.mjs --kontrollera   stanna om en pdf saknas, är inaktuell eller är
//                                                överbliven (körs i npm run validera och npm run build)
//   node scripts/lathund-pdf.mjs --utan-bygge    hoppa över astro build (dist är redan aktuell)

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, renameSync, unlinkSync } from 'node:fs';
import { execFileSync, execSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const kontrollera = args.includes('--kontrollera');
const utanBygge = args.includes('--utan-bygge');
const valda = args.filter((a) => !a.startsWith('--'));

const katalog = join(rot, 'src', 'content', 'stodundervisning');
const metoder = readdirSync(katalog)
  .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .map((f) => ({ id: f.replace(/\.yaml$/, ''), fil: join(katalog, f), data: parseYaml(readFileSync(join(katalog, f), 'utf8')) }))
  .filter((m) => m.data.lathund && !m.data.utkast);
const pdfMapp = join(rot, 'public', 'stodundervisning');
const manifestFil = join(pdfMapp, 'lathund-pdf.json');
const pdfFor = (id) => join(pdfMapp, `${id}-lathund.pdf`);

// Allt som påverkar hur lathunden ser ut: metodens text, komponenterna, stilen, typsnitten.
const gemensamma = ['src/components/Lathund.astro', 'src/components/MetodTabell.astro', 'src/pages/stodundervisning/[id]/lathund.astro', 'src/lib/metod.ts', 'src/styles/global.css', 'src/layouts/Base.astro', 'public/fonts/public-sans-normal.woff2', 'public/fonts/public-sans-italic.woff2'];
const hashAv = (delar) => { const h = createHash('sha256'); for (const d of delar) h.update(d); return h.digest('hex').slice(0, 16); };
const gemensamHash = hashAv(gemensamma.map((f) => (existsSync(join(rot, f)) ? readFileSync(join(rot, f)) : Buffer.from(`saknas:${f}`))));
const kallHash = (m) => hashAv([gemensamHash, readFileSync(m.fil)]);
const filHash = (p) => hashAv([readFileSync(p)]);
const lasManifest = () => { try { return JSON.parse(readFileSync(manifestFil, 'utf8')); } catch { return {}; } };

if (kontrollera) {
  const manifest = lasManifest();
  const fel = [];
  for (const m of metoder) {
    const post = manifest[m.id];
    const pdf = pdfFor(m.id);
    if (!existsSync(pdf)) fel.push(`${m.id}: pdf saknas`);
    else if (!post) fel.push(`${m.id}: saknas i manifestet`);
    else if (post.kalla !== kallHash(m)) fel.push(`${m.id}: pdf:n är gjord av en äldre metod eller äldre kod`);
    else if (post.pdf !== filHash(pdf)) fel.push(`${m.id}: pdf-filen stämmer inte med manifestet`);
  }
  const publicerade = new Set(metoder.map((m) => m.id));
  for (const f of readdirSync(pdfMapp).filter((f) => f.endsWith('-lathund.pdf'))) {
    const id = f.replace(/-lathund\.pdf$/, '');
    if (!publicerade.has(id)) fel.push(`${f}: överbliven, metoden är borttagen, utkast eller utan lathund (ta bort filen och raden i manifestet)`);
  }
  if (fel.length > 0) {
    console.error(`Lathundens pdf:\n  ${fel.join('\n  ')}\nKör: node scripts/lathund-pdf.mjs`);
    process.exit(1);
  }
  console.log(`Lathundens pdf finns och är aktuell för ${metoder.length} metoder.`);
  process.exit(0);
}

const lista = valda.length > 0 ? metoder.filter((m) => valda.includes(m.id)) : metoder;
if (lista.length === 0) { console.error('Ingen metod med lathund att skriva ut.'); process.exit(1); }
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!chrome) { console.error('Chrome hittades inte.'); process.exit(1); }
for (const verktyg of ['pdfinfo', 'pdftotext']) {
  // Poppler-verktygen svarar med felkod på -v; det som avslöjar att de saknas är ENOENT.
  try { execFileSync(verktyg, ['-v'], { stdio: 'ignore' }); } catch (e) { if (e.code === 'ENOENT') { console.error(`${verktyg} (Poppler) krävs för att kontrollera pdf:n.`); process.exit(1); } }
}
if (!utanBygge) {
  console.log('Bygger sajten så att pdf:n görs ur aktuell kod …');
  execSync('npx astro build', { cwd: rot, stdio: 'ignore' });
}
if (!existsSync(join(rot, 'dist', 'index.html'))) { console.error('dist saknas.'); process.exit(1); }
mkdirSync(pdfMapp, { recursive: true });

const port = 4326;
const server = spawn('npx', ['astro', 'preview', '--port', String(port), '--ignore-lock'], { cwd: rot, shell: true, stdio: 'ignore' });
const stang = () => { try { execFileSync('taskkill', ['/F', '/T', '/PID', String(server.pid)], { stdio: 'ignore' }); } catch { server.kill(); } };
let svarar = false;
for (let i = 0; i < 60 && !svarar; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  svarar = await fetch(`http://localhost:${port}/`, { redirect: 'manual' }).then((r) => r.ok).catch(() => false);
}
if (!svarar) { stang(); console.error('Förhandsservern svarade inte inom 60 sekunder.'); process.exit(1); }

const manifest = lasManifest();
let fel = 0;
try {
  for (const m of lista) {
    const ut = pdfFor(m.id);
    const tmp = `${ut}.tmp`;
    try {
      execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${tmp}`, `http://localhost:${port}/stodundervisning/${m.id}/lathund`], { stdio: 'ignore', timeout: 60000 });
      const sidor = Number((execFileSync('pdfinfo', [tmp], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/) || [])[1]);
      if (sidor !== 4) throw new Error(`pdf:n är ${sidor} sidor, ska vara fyra`);
      for (let s = 1; s <= 4; s++) {
        const text = execFileSync('pdftotext', ['-f', String(s), '-l', String(s), tmp, '-'], { encoding: 'latin1' });
        if (!text.includes('Niclas Fohlin') || !text.includes(`niclasfohlin.se/stodundervisning/${m.id}/lathund`)) throw new Error(`sida ${s} saknar upphov eller adress`);
      }
      renameSync(tmp, ut);
      const iDist = join(rot, 'dist', 'stodundervisning', `${m.id}-lathund.pdf`);
      if (existsSync(dirname(iDist))) copyFileSync(ut, iDist);
      manifest[m.id] = { kalla: kallHash(m), pdf: filHash(ut), datum: new Date().toISOString().slice(0, 10) };
      console.log(`  ok   ${m.id}: public/stodundervisning/${m.id}-lathund.pdf (fyra sidor, upphov på alla)`);
    } catch (e) {
      fel++;
      if (existsSync(tmp)) unlinkSync(tmp);
      console.log(`  FEL  ${m.id}: ${e.message}`);
    }
  }
} finally {
  stang();
}
const publicerade = new Set(metoder.map((m) => m.id));
for (const id of Object.keys(manifest)) if (!publicerade.has(id)) delete manifest[id];
writeFileSync(manifestFil, JSON.stringify(manifest, null, 2) + '\n');
console.log(fel ? `\n${fel} fel.` : '\nAllt ok. Committa pdf-filerna och lathund-pdf.json tillsammans med metoden.');
process.exit(fel ? 1 : 0);
