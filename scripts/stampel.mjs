// Valideringens stämpel (K-776; Niclas 2026-11-14: "Måste det köras hela valideringar när små skär fixats?"). När
// npm run validera går grönt skriver scripts/validera.mjs innehållet som valideringen slutade med: trädets summa i git,
// arbetsträdet som det står, med det valideringen själv gjorde om. ko.mjs klar godtar stämpeln i stället för att köra
// valideringen igen, men bara när arbetsträdet är rent och HEAD har exakt det innehållet. Ändras en enda fil, också en
// som git restore har lagt tillbaka, är summan en annan och valideringen körs. Stämpeln ligger i .git, utanför arbetsträdet.
//
// Valideringen tar omkring tjugo minuter, och en fil som ändras medan den körs, efter steget som läser den, har ingen
// prövat (andra ögat 2026-11-14, P1). Därför tar valideringen trädet också innan bygget börjar, och stämpeln skrivs bara
// när det som ändrats sedan dess är det som stegen själva skriver: filerna under public/ och mätningarna i
// SKRIVS_AV_STEGEN. Annars säger valideringen vilka filer som ändrades, och klar kör valideringen själv.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const git = (rot, args, env = {}) => spawnSync('git', args, { cwd: rot, encoding: 'utf8', env: { ...process.env, ...env } });
const gitmapp = (rot) => resolve(rot, git(rot, ['rev-parse', '--git-dir']).stdout.trim());
const filen = (rot) => join(gitmapp(rot), 'validera-stampel.json');

/** Det som valideringens steg efter bygget skriver: pdf:erna, bilderna och filerna under public/, och mätningarnas data. */
export const SKRIVS_AV_STEGEN = Object.freeze([/^public\//, /^src\/data\/lathund-word\.json$/, /^src\/data\/sidlas\.json$/]);

// Arbetsträdets innehåll som git skulle committa det: allt som inte är ignorerat, med git:s egen radslutsregel, i ett
// eget index så att det riktiga inte rörs. Tom när git inte kan läsa trädet, som när en fil är låst.
export function arbetstradet(rot) {
  const index = join(gitmapp(rot), 'validera-stampel.index');
  const riktigt = join(gitmapp(rot), 'index');
  try {
    if (existsSync(riktigt)) copyFileSync(riktigt, index);
    const env = { GIT_INDEX_FILE: index };
    const add = git(rot, ['add', '-A'], env);
    if (add.status !== 0) return { trad: '', skal: (add.stderr || add.stdout || '').trim().split('\n')[0] };
    return { trad: git(rot, ['write-tree'], env).stdout.trim(), skal: '' };
  } finally {
    rmSync(index, { force: true });
  }
}

/**
 * Skriver stämpeln för arbetsträdet som det står nu. fore är trädet när bygget började: har något annat än det stegen skriver
 * ändrats sedan dess skrivs ingen stämpel. Svaret säger vad som hände, för valideringens sista rad.
 */
export function skrivStampel(rot, fore) {
  const { trad, skal } = arbetstradet(rot);
  if (!trad) return `Ingen stämpel: git kunde inte läsa arbetsträdet (${skal}). klar kör valideringen själv.`;
  if (fore) {
    const andrade = git(rot, ['diff-tree', '-r', '--name-only', fore, trad]).stdout.split('\n').filter(Boolean);
    const andra = andrade.filter((f) => !SKRIVS_AV_STEGEN.some((m) => m.test(f)));
    if (andra.length) return `Ingen stämpel: ${andra.length} ${andra.length === 1 ? 'fil' : 'filer'} ändrades medan valideringen körde (${andra.slice(0, 5).join(', ')}${andra.length > 5 ? ' …' : ''}). klar kör valideringen själv.`;
  }
  writeFileSync(filen(rot), `${JSON.stringify({ trad, tid: new Date().toISOString() })}\n`);
  return `Stämpeln: valideringen var grön för träd ${trad.slice(0, 8)}, och ko.mjs klar godtar den när HEAD har exakt det innehållet.`;
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
