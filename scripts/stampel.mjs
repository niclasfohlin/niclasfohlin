// Valideringens stämpel (K-776; Niclas 2026-11-14: "Måste det köras hela valideringar när små skär fixats?"). När
// npm run validera går grönt skriver scripts/validera.mjs innehållet som valideringen slutade med: trädets summa i git,
// arbetsträdet som det står, med det valideringen själv gjorde om. ko.mjs klar godtar stämpeln i stället för att köra
// valideringen igen, men bara när arbetsträdet är rent och HEAD har exakt det innehållet. Ändras en enda fil, också en
// som git restore har lagt tillbaka, är summan en annan och valideringen körs. Stämpeln ligger i .git, utanför arbetsträdet.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const git = (rot, args, env = {}) => spawnSync('git', args, { cwd: rot, encoding: 'utf8', env: { ...process.env, ...env } });
const gitmapp = (rot) => resolve(rot, git(rot, ['rev-parse', '--git-dir']).stdout.trim());
const filen = (rot) => join(gitmapp(rot), 'validera-stampel.json');

// Arbetsträdets innehåll som git skulle committa det: allt som inte är ignorerat, med git:s egen radslutsregel, i ett
// eget index så att det riktiga inte rörs.
export function arbetstradet(rot) {
  const index = join(gitmapp(rot), 'validera-stampel.index');
  const riktigt = join(gitmapp(rot), 'index');
  try {
    if (existsSync(riktigt)) copyFileSync(riktigt, index);
    const env = { GIT_INDEX_FILE: index };
    if (git(rot, ['add', '-A'], env).status !== 0) return '';
    return git(rot, ['write-tree'], env).stdout.trim();
  } finally {
    rmSync(index, { force: true });
  }
}

export function skrivStampel(rot) {
  const trad = arbetstradet(rot);
  if (trad) writeFileSync(filen(rot), `${JSON.stringify({ trad, tid: new Date().toISOString() })}\n`);
  return trad;
}

// Stämpeln när den gäller HEAD, annars null. Den som frågar prövar själv att arbetsträdet är rent.
export function stampelForHead(rot) {
  try {
    const s = JSON.parse(readFileSync(filen(rot), 'utf8'));
    const head = git(rot, ['rev-parse', 'HEAD^{tree}']).stdout.trim();
    return s.trad && s.trad === head ? s : null;
  } catch {
    return null;
  }
}
