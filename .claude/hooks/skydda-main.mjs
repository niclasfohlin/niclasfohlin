// PreToolUse-hook för Bash. Två spärrar.
//
// 1. Stoppar "git commit" på grenen main så att allt arbete sker på grenar och main bara ändras genom
//    en medveten sammanslagning. Den allra första committen i ett tomt repo släpps igenom.
// 2. Kreditspärren (Niclas 2026-09-27): stoppar det som bygger sajten på Netlify när nästa bygge skulle
//    ta saldot under 100 krediter: push till main, netlify deploy --prod, createSiteBuild och
//    npm run kommentarer av, på och tak, som bygger om. En push där varje ny commit bär [skip netlify]
//    bygger inget och släpps. KREDITSPARR=av först i kommandot släpper igenom, och används bara när
//    Niclas sagt det. Saldot läses färskt av scripts/krediter.mjs --grind; se DRIFT.md under Krediter.
import { execFileSync, spawnSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const git = (args) => execFileSync('git', args, { cwd: rot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const SKIP = /\[skip (netlify|ci)\]/i;

// Vad i kommandot som bygger sajten på Netlify, eller null.
function byggerSajten(cmd, gren) {
  if (/\bnetlify\s+deploy\b[^\n;&|]*\s--prod\b/.test(cmd)) return 'netlify deploy --prod';
  if (/\bcreateSiteBuild\b/.test(cmd)) return 'ett produktionsbygge (createSiteBuild)';
  if (/\bkommentarer(\.mjs)?\s+(--\s+)?(av|på|pa|tak)(?=\s|$)/.test(cmd)) return 'npm run kommentarer, som bygger om sajten';
  for (const del of cmd.split(/&&|\|\||;|\n|\|/)) {
    const m = del.match(/\bgit\s+push\b(.*)$/);
    if (!m) continue;
    const ord = m[1].trim().split(/\s+/).filter(Boolean);
    if (ord.includes('--dry-run') || ord.includes('-n')) continue;
    const refs = ord.filter((o) => !o.startsWith('-')).slice(1);
    const kallor = [];
    if (ord.includes('--all') || ord.includes('--mirror')) kallor.push('main');
    else if (refs.length === 0 && gren === 'main') kallor.push('main');
    for (const r of refs) {
      const [src, dst] = r.replace(/^\+/, '').split(':');
      const mal = (dst ?? src).replace(/^refs\/heads\//, '');
      if ((mal === 'HEAD' ? gren : mal) === 'main') kallor.push(src || '');
    }
    for (const k of kallor) {
      if (!k) return 'en borttagning av main';
      // Bygger inget när varje commit som inte redan ligger på origin/main bär [skip netlify].
      try {
        const nya = git(['log', `origin/main..${k}`, '--format=%B%x00']).split('\0').map((s) => s.trim()).filter(Boolean);
        if (nya.every((c) => SKIP.test(c))) continue;
      } catch { /* okänd ref: pröva spärren */ }
      return 'en push till main';
    }
  }
  return null;
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  let cmd = '';
  try { cmd = JSON.parse(input)?.tool_input?.command ?? ''; } catch { process.exit(0); }
  let gren = '';
  try { gren = git(['rev-parse', '--abbrev-ref', 'HEAD']); } catch { process.exit(0); }

  if (/\bgit\s+commit\b/.test(cmd) && (gren === 'main' || gren === 'master')) {
    let historik = true;
    try { git(['rev-parse', '--verify', 'HEAD']); } catch { historik = false; }
    if (historik) {
      process.stderr.write('Du står på main. Skapa en gren först (git switch -c innehall/<slug> eller sajt/<beskrivning>) och committa där. main ändras bara genom sammanslagning av en gren när npm run validera är grönt.\n');
      process.exit(2);
    }
  }

  const bygger = byggerSajten(cmd, gren);
  if (!bygger || /\bKREDITSPARR=av\b/.test(cmd)) process.exit(0);
  const r = spawnSync(process.execPath, [join(rot, 'scripts', 'krediter.mjs'), '--grind'], { cwd: rot, encoding: 'utf8', timeout: 25000 });
  if (r.status === 0) process.exit(0);
  const rad = (r.stdout || '').trim();
  if (r.status === 1) {
    process.stderr.write(`Kreditspärren stoppar ${bygger}. ${rad}\nSkriv KREDITSPARR=av först i kommandot bara om Niclas sagt att det ska upp ändå.\n`);
  } else {
    process.stderr.write(`Kreditspärren kunde inte läsa saldot och stoppar ${bygger}. ${rad || r.error?.message || ''}\nPröva igen om en stund. Skriv KREDITSPARR=av först i kommandot bara om Niclas sagt att det ska upp ändå.\n`);
  }
  process.exit(2);
});
