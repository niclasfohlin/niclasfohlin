// PreToolUse-hook för Bash. Stoppar "git commit" på grenen main så att allt
// arbete sker på grenar och main bara ändras genom en medveten sammanslagning.
// Den allra första committen i ett tomt repo släpps igenom.
import { execSync } from 'node:child_process';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  let cmd = '';
  try { cmd = JSON.parse(input)?.tool_input?.command ?? ''; } catch { process.exit(0); }
  if (!/\bgit\s+commit\b/.test(cmd)) process.exit(0);

  let gren = '';
  try { gren = execSync('git rev-parse --abbrev-ref HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { process.exit(0); }
  if (gren !== 'main' && gren !== 'master') process.exit(0);

  try { execSync('git rev-parse --verify HEAD', { stdio: 'ignore' }); } catch { process.exit(0); }

  process.stderr.write('Du står på main. Skapa en gren först (git switch -c innehall/<slug> eller sajt/<beskrivning>) och committa där. main ändras bara genom sammanslagning som Niclas godkänt.\n');
  process.exit(2);
});
