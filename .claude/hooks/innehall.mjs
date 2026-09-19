// PostToolUse-hook för Write, Edit och MultiEdit. När en innehållsfil eller
// ett register ändras kontrolleras taggar och publikationer direkt. Fel
// skrivs till stderr med exit 2 så att Claude Code ser dem och rättar innan
// bygget hinner stoppa.
import { spawnSync } from 'node:child_process';
import { relative, resolve } from 'node:path';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', () => {
  let fil = '';
  try { fil = JSON.parse(input)?.tool_input?.file_path ?? ''; } catch { process.exit(0); }
  if (!fil) process.exit(0);

  const rel = relative(process.cwd(), resolve(fil)).replace(/\\/g, '/');
  const arRegister = rel === 'src/data/taggar.json' || rel === 'src/data/publikationer.json';
  const arInnehall = /^src\/content\/[^/]+\/[^_][^/]*\.md$/.test(rel);
  if (!arRegister && !arInnehall) process.exit(0);

  const args = ['scripts/taggar.mjs', '--kontrollera'];
  if (arInnehall) args.push(rel);
  const res = spawnSync(process.execPath, args, { encoding: 'utf8' });

  if (res.status !== 0) {
    process.stderr.write((res.stderr || res.stdout || 'Kontrollen av taggar misslyckades.').trim() + '\n');
    process.exit(2);
  }
  process.exit(0);
});
