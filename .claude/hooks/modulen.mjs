// PostToolUse-krok för Read, Write, Edit och MultiEdit. När en fil i modulen (scripts/planera/modulen.mjs) läses eller
// ändras, läggs principerna ur PLANERA.md under Principerna för modulen i sammanhanget, så att jag och varje agent har
// dem innan något ändras (Niclas 2026-10-31: "automatiskt läses av dig och agenter så fort modulen rörs i kod").
// Texten läses ur PLANERA.md varje gång, så att principerna står på ett ställe. En gång per session och agent, och igen
// efter en timme, så att de finns kvar efter en kompaktering utan att upprepas vid varje fil.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => (input += d));
process.stdin.on('end', async () => {
  let h;
  try { h = JSON.parse(input); } catch { process.exit(0); }
  const fil = h?.tool_input?.file_path ?? '';
  if (!fil) process.exit(0);
  const rot = process.cwd();
  const { iModulen } = await import(pathToFileURL(join(rot, 'scripts/planera/modulen.mjs')).href);
  if (!iModulen(relative(rot, resolve(fil)))) process.exit(0);

  const nyckel = `${h.session_id ?? ''}:${h.agent_id ?? h.transcript_path ?? ''}`;
  const minne = join(tmpdir(), 'niclasfohlin-modulen-principer.json');
  let sett = {};
  try { if (existsSync(minne)) sett = JSON.parse(readFileSync(minne, 'utf8')); } catch { sett = {}; }
  const nu = Date.now();
  if (sett[nyckel] && nu - sett[nyckel] < 60 * 60 * 1000) process.exit(0);

  const planera = readFileSync(join(rot, 'PLANERA.md'), 'utf8');
  const avsnitt = planera.match(/## Principerna för modulen\r?\n([\s\S]*?)\r?\n## /)?.[1]?.replace(/\r/g, '').trim();
  if (!avsnitt) process.exit(0);
  sett[nyckel] = nu;
  try { writeFileSync(minne, JSON.stringify(sett)); } catch { /* utan minne kommer principerna igen nästa gång */ }
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `Du rör modulen. Principerna för modulen, ur PLANERA.md:\n\n${avsnitt}` } }));
  process.exit(0);
});
