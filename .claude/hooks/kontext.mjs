// Körs av Claude Code vid SessionStart med matcher "compact", alltså direkt
// efter en autokompaktering. Det som skrivs till stdout läggs in i kontexten
// igen. CLAUDE.md laddas av Claude Code självt; här återställs de filer som
// annars försvinner ur arbetsminnet.
import { readFileSync, existsSync } from 'node:fs';

const filer = ['ARBETSSATT.md', 'STIL.md', 'KO.md'];
const delar = ['Kontexten har kompakterats. Här är arbetssättet och stilreglerna igen. Fortsätt där du var, men kontrollera git status och vilken gren du står på innan du gör något.'];

for (const f of filer) {
  if (!existsSync(f)) continue;
  delar.push(`\n===== ${f} =====\n${readFileSync(f, 'utf8').trim()}`);
}

process.stdout.write(delar.join('\n') + '\n');
