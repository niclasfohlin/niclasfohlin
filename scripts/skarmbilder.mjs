#!/usr/bin/env node
// Skärmbilder av sajtens viktigaste sidor, desktop och mobil, ur det byggda resultatet i dist.
// Startar en förhandsserver, väntar tills den svarar, tar bilderna med scripts/skarmbild.mjs
// (riktig mobilemulering via CDP) och stänger servern. Bilderna hamnar i underlag/prov/sajt/.
//
//   node scripts/skarmbilder.mjs                       standardsidorna
//   node scripts/skarmbilder.mjs /om /bocker/nycklar   bara de angivna sökvägarna
//   node scripts/skarmbilder.mjs --hojd 1400           klipp bilderna vid 1400 px (annars hela sidan)
//
// Kör npm run validera först så att dist är aktuell.

import { existsSync, mkdirSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const hojdIndex = args.indexOf('--hojd');
const hojd = hojdIndex >= 0 ? args[hojdIndex + 1] : undefined;
const sokvagar = args.filter((a, i) => a.startsWith('/') && args[i - 1] !== '--hojd');
const sidor = sokvagar.length > 0 ? sokvagar : ['/', '/stodundervisning', '/stodundervisning/problemlosning-i-grupp', '/stodundervisning/problemlosning-i-grupp/lathund', '/artiklar', '/bocker', '/om', '/prenumerera'];

if (!existsSync(join(rot, 'dist', 'index.html'))) { console.error('dist saknas: kör npm run validera först.'); process.exit(1); }
const mapp = join(rot, 'underlag', 'prov', 'sajt');
mkdirSync(mapp, { recursive: true });

const port = 4324;
// --ignore-lock: Astro 7 kör annars förhandsservern som en bakgrundsprocess med låsfil, och en
// kvarglömd sådan skulle stoppa vår från att starta.
const server = spawn('npx', ['astro', 'preview', '--port', String(port), '--ignore-lock'], { cwd: rot, shell: true, stdio: 'ignore' });
const stang = () => { try { execFileSync('taskkill', ['/F', '/T', '/PID', String(server.pid)], { stdio: 'ignore' }); } catch { server.kill(); } };
const bas = `http://localhost:${port}`;
let svarar = false;
for (let i = 0; i < 60 && !svarar; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  svarar = await fetch(bas + '/', { redirect: 'manual' }).then((r) => r.ok).catch(() => false);
}
if (!svarar) { stang(); console.error('Förhandsservern svarade inte inom 60 sekunder.'); process.exit(1); }

const namn = (s) => (s === '/' ? 'start' : s.replace(/^\//, '').replace(/\//g, '-'));
let fel = 0;
try {
  for (const s of sidor) {
    for (const [suffix, extra] of [['desktop', []], ['mobil', ['--mobil']]]) {
      const fil = join(mapp, `${namn(s)}-${suffix}.png`);
      try {
        execFileSync(process.execPath, [join(rot, 'scripts', 'skarmbild.mjs'), bas + s, fil, ...extra, ...(hojd ? ['--hojd', hojd] : [])], { stdio: 'ignore', timeout: 90000 });
        console.log(`  ok   ${s} (${suffix})`);
      } catch (e) {
        fel++;
        console.log(`  FEL  ${s} (${suffix}): ${e.message}`);
      }
    }
  }
} finally {
  stang();
}
console.log(fel ? `\n${fel} fel. Bilderna i ${mapp}` : `\nAllt ok. Bilderna i ${mapp}`);
process.exit(fel ? 1 : 0);
