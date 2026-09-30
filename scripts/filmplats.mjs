#!/usr/bin/env node
// Ryms huvudfilmens fyra stillbilder på sidan 1, i Word-filen och i sidans utskrift, i alla metoder? (Niclas 2026-09-30:
// varje metod får en huvudfilm efter faktarutan, och bilderna ska stå på sidan 1, alltid.)
//
// Skriptet bygger sajten med FILMPROV=1, så att en metod utan film får en provfilm med bildtexter på 55 tecken, den
// längsta som schemat tillåter (src/lib/film.ts). Metoder med en riktig film prövas med den. Sedan skriver Chrome ut
// varje metodsida och Word gör pdf av varje Word-fil med allt, och skriptet läser sidan 1 i båda: står texten under
// bild 4 där, ryms rutan. Till sist byggs sajten igen utan provfilmen.
//
//   node scripts/filmplats.mjs              alla publicerade metoder
//   node scripts/filmplats.mjs <id> …       bara de metoderna
//   node scripts/filmplats.mjs --utan-bygge använd dist som den är (redan byggd med FILMPROV=1, eller med riktiga filmer)
//
// Kräver Chrome, Word och pdftotext (Poppler). Pdf:erna hamnar i underlag/prov/filmplats/, som git ignorerar.
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { execFileSync, execSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const utanBygge = args.includes('--utan-bygge');
const valda = args.filter((a) => !a.startsWith('--'));
const mapp = join(rot, 'src/content/stodundervisning');
const metoder = readdirSync(mapp)
  .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .map((f) => ({ id: f.slice(0, -5), d: parseYaml(readFileSync(join(mapp, f), 'utf8')) }))
  .filter((m) => !m.d.utkast && (!valda.length || valda.includes(m.id)));
const ut = join(rot, 'underlag/prov/filmplats');
mkdirSync(ut, { recursive: true });
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
if (!chrome) { console.error('filmplats: Chrome hittades inte.'); process.exit(1); }
const PROVTEXT = 'Provtext med femtiofem tecken för att pröva platsen här.';

if (!utanBygge) {
  console.log('Bygger med provfilmen (FILMPROV=1) …');
  execSync('npx astro build', { cwd: rot, stdio: 'ignore', env: { ...process.env, FILMPROV: '1' } });
}
const port = 4324;
const server = spawn('npx', ['astro', 'preview', '--port', String(port), '--ignore-lock'], { cwd: rot, shell: true, stdio: 'ignore' });
const stoppa = () => { try { execFileSync('taskkill', ['/F', '/T', '/PID', String(server.pid)], { stdio: 'ignore' }); } catch { server.kill(); } };
let svarar = false;
for (let i = 0; i < 60 && !svarar; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  svarar = await fetch(`http://localhost:${port}/stodundervisning`, { redirect: 'manual' }).then((r) => r.ok).catch(() => false);
}
if (!svarar) { stoppa(); console.error('filmplats: förhandsservern svarade inte.'); process.exit(1); }

const sida1 = (pdf) => execFileSync('pdftotext', ['-enc', 'UTF-8', '-f', '1', '-l', '1', pdf, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
// Står texten under bild 4 på sidan 1? Provfilmens fyra texter är lika, så där räknas de.
const ryms = (text, d) => (d.film ? text.includes(d.film.stillbilder[3].text) : text.split(PROVTEXT).length - 1 >= 4);
const rader = [];
try {
  for (const { id, d } of metoder) {
    const utskrift = join(ut, `${id}-utskrift.pdf`);
    execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${utskrift}`, `http://localhost:${port}/stodundervisning/${id}`], { stdio: 'ignore', timeout: 60000 });
    const word = join(ut, `${id}-word.pdf`);
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(rot, 'scripts/word-pdf.ps1'), join(rot, 'dist/stodundervisning', `${id}.docx`), word], { stdio: 'ignore', timeout: 180000 });
    const u = ryms(sida1(utskrift), d);
    const w = ryms(sida1(word), d);
    rader.push({ id, film: d.film ? 'egen' : 'prov', u, w });
    console.log(`${u && w ? 'ok ' : 'NEJ'}  ${id.padEnd(32)} utskriften ${u ? 'ja' : 'NEJ'}, Word ${w ? 'ja' : 'NEJ'} (${d.film ? 'metodens film' : 'provfilm'})`);
  }
} finally {
  stoppa();
  if (!utanBygge) {
    console.log('Bygger om utan provfilmen …');
    execSync('npx astro build', { cwd: rot, stdio: 'ignore', env: { ...process.env, FILMPROV: '' } });
  }
}
const fel = rader.filter((r) => !r.u || !r.w);
console.log(fel.length ? `\n${fel.length} av ${rader.length} metoder har inte plats för stillbilderna på sidan 1. Pdf:erna ligger i underlag/prov/filmplats/.` : `\nAlla ${rader.length} metoder har plats för huvudfilmens stillbilder på sidan 1, i Word och i utskriften.`);
process.exit(fel.length ? 1 : 0);
