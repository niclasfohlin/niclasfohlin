// Körs av Claude Code vid SessionStart med matcher "compact", alltså direkt efter en autokompaktering. Det som skrivs
// till stdout läggs in i kontexten igen.
//
// Högst 10 000 tecken (code.claude.com/docs/en/hooks): skriver en krok mer sparas utdatan i en fil, och sessionen ser
// bara de första 2 000 tecknen. Kroken skrev förut ARBETSSATT.md, STIL.md och hela KO.md, 180 000 tecken 2026-10-07,
// så varken kön eller krediterna kom fram. CLAUDE.md med ARBETSSATT.md och STIL.md (@-importerna) läser Claude Code in
// igen av sig självt efter en kompaktering, så de skrivs inte här. Kroken skriver det som annars försvinner ur
// arbetsminnet: grenen, krediterna och köns läge i kort form. Blir utdatan ändå för lång kortas kön, som står sist.
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const TAK = 9000;
const kor = (cmd, args, timeout = 15000) => { try { return (spawnSync(cmd, args, { encoding: 'utf8', timeout }).stdout || '').trim(); } catch { return ''; } };
const kort = (text, n) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text);

const delar = ['Kontexten har kompakterats. CLAUDE.md, ARBETSSATT.md och STIL.md har Claude Code läst in igen av sig självt, och de gäller som förut. Fortsätt där du var, men kör git status och git branch --show-current innan du gör något.'];

// Grenen, det som inte ligger i git och det som inte är pushat.
const gren = kor('git', ['branch', '--show-current']);
const andrat = kor('git', ['status', '--short']).split('\n').filter(Boolean).length;
const opushat = Number(kor('git', ['rev-list', '--count', 'origin/main..main'])) || 0;
delar.push(`\n===== Git =====\nGren: ${gren || 'okänd'}. ${andrat ? `${andrat} filer är ändrade och inte committade.` : 'Arbetsträdet är rent.'}${opushat ? ` main ligger ${opushat} commits före origin/main: de är inte pushade.` : ''}`);

// Kreditspärrens läge, så att det är känt innan arbetet fortsätter (scripts/krediter.mjs, DRIFT.md under Krediter).
const krediter = kor(process.execPath, ['scripts/krediter.mjs', '--rad'], 25000);
delar.push(`\n===== Krediterna =====\n${krediter || 'Netlify-krediterna gick inte att läsa. Kör npm run krediter före uppladdning.'}`);

// Kön i kort form ur registret i KO.md: det som pågår, prio 1 och det som väntar på Niclas, och antalet av resten.
if (existsSync('KO.md')) {
  const ko = readFileSync('KO.md', 'utf8');
  const poster = [];
  for (const rad of ko.split(/\r?\n/)) {
    const m = rad.match(/^\| (K-\d+) \| (.*) \| ([123]) \| (öppen|pågår|blockerad|klar|stängd) \| (.*) \| ([^|]*) \| ([^|]*) \|\s*$/);
    if (m) poster.push({ id: m[1], vad: m[2], prio: m[3], status: m[4], behovs: m[7].trim() });
  }
  const ar = (status) => poster.filter((p) => p.status === status);
  const oppna = ar('öppen');
  const rader = [];
  for (const p of ar('pågår')) rader.push(`PÅGÅR  ${p.id}  ${kort(p.vad, 260)}`);
  for (const p of oppna.filter((q) => q.prio === '1')) rader.push(`Prio 1  ${p.id}  ${kort(p.vad, 260)}`);
  for (const p of ar('blockerad')) rader.push(`Väntar på Niclas  ${p.id}  ${kort(p.vad, 150)}${p.behovs && p.behovs !== '-' ? `\n    Behövs: ${kort(p.behovs, 200)}` : ''}`);
  const inkorg = (ko.split(/^## Inkorg\s*$/m)[1] ?? '').split(/^## /m)[0].split(/\r?\n/).filter((r) => r.trim() && !r.trim().startsWith('(')).length;
  delar.push(`\n===== Kön =====\n${rader.join('\n') || 'Inget pågår, ingen post har prio 1 och inget väntar på Niclas.'}\nDessutom ${oppna.filter((p) => p.prio === '2').length} öppna poster i prio 2 och ${oppna.filter((p) => p.prio === '3').length} vilande i prio 3.${inkorg ? ` Inkorgen i KO.md har ${inkorg} rader från Niclas: node scripts/ko.mjs inkorg.` : ''} Hela kön: node scripts/ko.mjs lista. En post: node scripts/ko.mjs visa <id>.`);
}

let ut = `${delar.join('\n')}\n`;
if (ut.length > TAK) ut = `${ut.slice(0, TAK - 130)}\n… kortat av kroken, som får skriva högst 10 000 tecken. Hela kön: node scripts/ko.mjs lista.\n`;
process.stdout.write(ut);
