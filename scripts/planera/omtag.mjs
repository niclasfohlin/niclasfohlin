#!/usr/bin/env node
// Omtag av en metod som har Planera insatsen (PLANERA.md under Omtag av en metod; Niclas 2026-10-28: "få in hur omtag görs
// på metoder ... Att den checkar av planeringen så den stämmer och är länkad korrekt"). För varje metod: planens text i
// varje version ur bygget (scripts/plantext.mjs, i texttypskurserna också varje årskurs), det som har ändrats i metodens fil
// sedan --bas, och uppdragen till steg 4b (Rimligheten med stängda frågor om det ändrade, mallen rimlighet-andrat) och steg
// 4 (länkgranskningen, mallen lankgranskning). Agenterna startas sedan med en rad var, som skriptet skriver sist.
//
//   node scripts/planera/omtag.mjs <id> [<id> …] --bas <commit> [--ut <mapp>]    förval: underlag/prov/omtag/<dagens datum>
//
// Läser dist, som npm run validera bygger med metodernas planer synliga (en metod med plan.vantar prövas i en
// provversion, PLANERA.md under Lärdomar, rad 5). Kräver Chrome, som plantext.mjs.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const s = await import(pathToFileURL(join(rot, 'src/lib/standard/index.js')).href);
const args = process.argv.slice(2);
const varde = (flagga) => (args.includes(flagga) ? args[args.indexOf(flagga) + 1] : undefined);
const bas = varde('--bas');
const idag = new Date().toISOString().slice(0, 10);
const ut = resolve(varde('--ut') ?? join(rot, 'underlag/prov/omtag', idag));
const ids = args.filter((a, i) => !a.startsWith('--') && !['--bas', '--ut'].includes(args[i - 1]));
if (!ids.length || !bas) { console.error('Så här: node scripts/planera/omtag.mjs <id> [<id> …] --bas <commit> [--ut <mapp>]'); process.exit(1); }
if (!existsSync(join(rot, 'dist/index.html'))) { console.error('omtag: dist saknas; kör npm run validera först, med metodernas planer synliga.'); process.exit(1); }
const rel = (p) => p.replace(/\\/g, '/');
mkdirSync(ut, { recursive: true });
const rader = [];
for (const id of ids) {
  const fil = join(rot, 'src/content/stodundervisning', `${id}.yaml`);
  if (!existsSync(fil)) { console.error(`omtag: ${id} finns inte.`); process.exit(1); }
  const d = parseYaml(readFileSync(fil, 'utf8'));
  if (d.plan?.vantar) console.error(`omtag: ${id} har plan.vantar; bygg en provversion (PLANERA.md under Lärdomar, rad 5).`);
  // Planens text i varje version, med förvalet och versionens slug i länken, som sidan läser den.
  const versioner = d.plan?.versionsval?.versioner?.map((v) => v.namn) ?? [];
  const val = s.forval(s.metodplan(d).plan, idag);
  const varianter = versioner.length ? versioner.map((v) => [s.slugAv(v), s.kodaVal({ ...val, version: s.slugAv(v) })]) : [['standard', '']];
  for (const [namn, hash] of varianter) {
    const r = spawnSync(process.execPath, [join(rot, 'scripts/plantext.mjs'), id, ...(hash ? ['--hash', hash] : []), '--ut', join(ut, 'text', namn)], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(`omtag: plantext ${id} ${namn}: ${(r.stderr || '').trim().split('\n').pop()}`); process.exit(1); }
  }
  // Det som ändrades i metodens fil sedan --bas.
  const diff = execFileSync('git', ['-C', rot, 'diff', '-U2', bas, '--', `src/content/stodundervisning/${id}.yaml`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const andrat = join(ut, `andrat-${id}.md`);
  writeFileSync(andrat, `# Det som ändrades\n\n## ${id}\n\nMetodens fil sedan ${bas}.\n\n\`\`\`diff\n${diff || '(ingen ändring i metodens fil; det ändrade är modulens)\n'}\`\`\`\n`);
  const forsta = varianter[0][0];
  const andra = varianter.slice(1).map(([n]) => `\`${rel(join(ut, 'text', n))}/${id}.md\``);
  const metoder = `| Metod | Fil |\n|---|---|\n| ${d.titel} | \`${id}\` |${andra.length ? `\n\nPlanens text i de andra versionerna står i ${andra.join(' och ')}, med \`-fullt.md\` intill. Läs alla versionerna, och fråga också: visar planen i varje version bara det som gäller den?` : ''}`;
  const uppdrag = (mall, namn, varden) => {
    const r = spawnSync(process.execPath, [join(rot, 'scripts/planera/uppdrag.mjs'), mall, join(ut, namn), ...Object.entries(varden).map(([k, v]) => `${k}=${v}`)], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(`omtag: ${mall}: ${(r.stderr || '').trim()}`); process.exit(1); }
    return rel(join(ut, namn));
  };
  writeFileSync(join(ut, `metoder-${id}.md`), metoder);
  const rim = uppdrag('rimlighet-andrat', `uppdrag-rimlighet-${id}.md`, { metoder: `@${join(ut, `metoder-${id}.md`)}`, andrat: rel(andrat), text: rel(join(ut, 'text', forsta)), svar: rel(join(ut, `svar-rimlighet-${id}.md`)) });
  const lank = uppdrag('lankgranskning', `uppdrag-lankar-${id}.md`, { id, titel: d.titel, text: rel(join(ut, 'text', forsta)), svar: rel(join(ut, `svar-lankar-${id}.md`)) });
  rader.push(`${id}: steg 4b ${rim}`, `${id}: steg 4  ${lank}`);
}
console.log(`Omtaget ligger i ${rel(ut)}. Starta en agent per uppdrag med: "Läs uppdraget i <fil> och gör exakt det som står där. Läs bara de filer uppdraget nämner. Skriv svaret till den fil uppdraget anger."\n${rader.join('\n')}`);
