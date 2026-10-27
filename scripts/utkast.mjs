#!/usr/bin/env node
// Utkastet hos Netlify (DRIFT.md under Netlify, raden Ett utkast som Niclas prövar i telefonen): laddar upp det som
// ligger i dist som ett utkast på en fast adress, https://<namn>--niclasfohlin.netlify.app, utan bygge hos Netlify och
// utan funktioner. Det drar bara trafikens krediter, och kommentarsdatabasen kan inte väckas, eftersom funktionerna inte
// finns där. Sökmotorerna hålls ute: medan uppladdningen pågår står robots.txt som Disallow och _headers ger varje sida
// X-Robots-Tag: noindex. Statistiken räknar inte där (Base.astro laddar GoatCounter bara på niclasfohlin.se).
//
//   node scripts/utkast.mjs [--namn verktyg] [--meddelande "<vad>"]
//
// Kör efter npm run validera, så att dist är det validerade bygget. --no-build behövs: utan den bygger Netlify CLI om
// sajten lokalt före uppladdningen och laddar upp det bygget i stället, och kör byggpluginerna (K-412, 2026-10-18).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const varde = (flagga, forval) => (args.includes(flagga) ? args[args.indexOf(flagga) + 1] : forval);
const namn = varde('--namn', 'verktyg');
// Sajten anges alltid: i en arbetskopia utan länk (git worktree) skapade netlify deploy annars en ny sajt (2026-10-27).
const SITE = '8af49398-3862-4b58-84a6-88f68d0064c1';
if (!/^[a-z0-9-]+$/.test(namn)) { console.error('utkast: --namn skrivs med a-z, 0-9 och bindestreck.'); process.exit(1); }
const commit = spawnSync('git', ['-C', rot, 'log', '-1', '--format=%h %s'], { encoding: 'utf8' }).stdout.trim();
const meddelande = varde('--meddelande', `Utkast ${namn}: ${commit}`);
const dist = join(rot, 'dist');
if (!existsSync(join(dist, 'index.html'))) { console.error('utkast: dist saknas; kör npm run validera först.'); process.exit(1); }
const tom = join(rot, '.netlify', 'tomma-funktioner');
mkdirSync(tom, { recursive: true });

const robots = join(dist, 'robots.txt');
const headers = join(dist, '_headers');
const robotsFore = existsSync(robots) ? readFileSync(robots) : undefined;
if (existsSync(headers)) { console.error('utkast: dist/_headers finns redan; ta bort den eller bygg om.'); process.exit(1); }
let adress;
try {
  writeFileSync(robots, 'User-agent: *\nDisallow: /\n');
  writeFileSync(headers, '/*\n  X-Robots-Tag: noindex, nofollow\n');
  const r = spawnSync('netlify', ['deploy', '--site', SITE, '--no-build', '--dir', dist, '--functions', tom, '--alias', namn, '--message', `"${meddelande.replace(/"/g, "'")}"`, '--json'], { cwd: rot, encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`netlify deploy gick inte:\n${(r.stderr || r.stdout).split('\n').slice(-20).join('\n')}`);
  const svar = JSON.parse(r.stdout.slice(r.stdout.indexOf('{')));
  adress = svar.deploy_url;
  if (!adress) throw new Error(`netlify deploy gav ingen adress: ${r.stdout.slice(0, 400)}`);
} finally {
  if (robotsFore) writeFileSync(robots, robotsFore); else rmSync(robots, { force: true });
  rmSync(headers, { force: true });
}

// Kontrollen: noindex på en sida, en kort adress med sin omdirigering, och en pdf med sin cacheregel.
const fragor = [
  ['/stodundervisning', (h) => /noindex/.test(h.get('x-robots-tag') ?? '') ? 'noindex' : `saknar noindex (${h.get('x-robots-tag')})`],
  ['/skrivkort', (h, s) => s === 301 ? `301 till ${h.get('location')}` : `svarade ${s}, inte 301`],
  ['/stodundervisning/lasstrategier.pdf', (h) => /max-age=86400/.test(h.get('cache-control') ?? '') ? 'ett dygns cache' : `cache ${h.get('cache-control')}`],
];
let fel = 0;
for (const [vag, prova] of fragor) {
  const svar = await fetch(new URL(vag, adress), { method: 'HEAD', redirect: 'manual' });
  const text = prova(svar.headers, svar.status);
  if (/saknar|svarade|cache /.test(text)) fel++;
  console.log(`  ${vag}: ${text}`);
}
console.log(`${fel ? 'FEL i utkastet' : 'Utkastet är uppe'}: ${adress} (${meddelande}).`);
process.exit(fel ? 1 : 0);
