#!/usr/bin/env node
// Lathunden som pdf, liggande A4 på fyra sidor, så att den som skriver ut slipper utskriftsrutans
// inställningar. Skrivs ut av Chrome ur det byggda resultatet och läggs i public/stodundervisning/
// (som följer med i bygget) och i dist/ (så att den aktuella förhandsvisningen stämmer).
// Filerna committas: Netlify har ingen Chrome.
//
//   node scripts/lathund-pdf.mjs                 alla metoder med lathund
//   node scripts/lathund-pdf.mjs <id> [<id>…]    bara de angivna
//   node scripts/lathund-pdf.mjs --kontrollera   stanna om en metod med lathund saknar pdf eller har en
//                                                äldre än sin YAML-fil (körs i npm run validera)
//
// Kör npm run validera först så att dist är aktuell.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, copyFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const kontrollera = args.includes('--kontrollera');
const valda = args.filter((a) => !a.startsWith('--'));

const katalog = join(rot, 'src', 'content', 'stodundervisning');
const metoder = readdirSync(katalog)
  .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .map((f) => ({ id: f.replace(/\.yaml$/, ''), fil: join(katalog, f), data: parseYaml(readFileSync(join(katalog, f), 'utf8')) }))
  .filter((m) => m.data.lathund && !m.data.utkast);
const pdfMapp = join(rot, 'public', 'stodundervisning');
const pdfFor = (id) => join(pdfMapp, `${id}-lathund.pdf`);

if (kontrollera) {
  const saknas = metoder.filter((m) => !existsSync(pdfFor(m.id)) || statSync(pdfFor(m.id)).mtimeMs < statSync(m.fil).mtimeMs);
  if (saknas.length > 0) {
    console.error(`Lathundens pdf saknas eller är äldre än metoden för: ${saknas.map((m) => m.id).join(', ')}.\nKör: npm run build && node scripts/lathund-pdf.mjs ${saknas.map((m) => m.id).join(' ')}`);
    process.exit(1);
  }
  console.log(`Lathundens pdf finns och är aktuell för ${metoder.length} metoder.`);
  process.exit(0);
}

const lista = valda.length > 0 ? metoder.filter((m) => valda.includes(m.id)) : metoder;
if (lista.length === 0) { console.error('Ingen metod med lathund att skriva ut.'); process.exit(1); }
if (!existsSync(join(rot, 'dist', 'index.html'))) { console.error('dist saknas: kör npm run build först.'); process.exit(1); }
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!chrome) { console.error('Chrome hittades inte.'); process.exit(1); }
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

let fel = 0;
try {
  for (const m of lista) {
    const ut = pdfFor(m.id);
    try {
      execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${ut}`, `http://localhost:${port}/stodundervisning/${m.id}/lathund`], { stdio: 'ignore', timeout: 60000 });
      let sidor = '?';
      try { sidor = (execFileSync('pdfinfo', [ut], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/) || [])[1] ?? '?'; } catch { /* pdfinfo saknas */ }
      if (sidor !== '?' && sidor !== '4') { fel++; console.log(`  FEL  ${m.id}: pdf:n är ${sidor} sidor, ska vara fyra`); continue; }
      const iDist = join(rot, 'dist', 'stodundervisning', `${m.id}-lathund.pdf`);
      if (existsSync(dirname(iDist))) copyFileSync(ut, iDist);
      console.log(`  ok   ${m.id}: public/stodundervisning/${m.id}-lathund.pdf (${sidor} sidor)`);
    } catch (e) {
      fel++;
      console.log(`  FEL  ${m.id}: ${e.message}`);
    }
  }
} finally {
  stang();
}
console.log(fel ? `\n${fel} fel.` : '\nAllt ok. Committa pdf-filerna tillsammans med metoden.');
process.exit(fel ? 1 : 0);
