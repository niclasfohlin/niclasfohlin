#!/usr/bin/env node
// Planens spärrar för en metod på några sekunder, under ett omtag (PLANERA.md under Omtag av en metod): standardens planFel,
// det bygget stannar på i planens fält, som ett citat som inte står så i metoden, en rad ur en tabell som metoden inte har
// eller en del som passet inte har. Bygget prövar sedan resten, som namnen och sakernas knappar (insatsplanFel).
//
//   node scripts/planera/metodprov.mjs <id> [<id> …]     slutkod 1 när en metod har fel
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const s = await import(pathToFileURL(join(rot, 'src/lib/standard/index.js')).href);
const ids = process.argv.slice(2);
if (!ids.length) { console.error('Så här: node scripts/planera/metodprov.mjs <id> [<id> …]'); process.exit(1); }
// Schemats gränser för planens listor och resultatets längd (src/content.config.ts), som bygget annars stannar på först.
const GRANSER = { fore: 4, justera: 4, utvardering: 5 };
const schemat = (d) => [
  ...Object.entries(GRANSER).filter(([k, max]) => (d.plan?.[k]?.length ?? 0) > max).map(([k, max]) => `plan.${k} har ${d.plan[k].length} rader, och schemat tar högst ${max}.`),
  ...(d.plan?.versionsval?.versioner ?? []).filter((v) => (v.fore?.length ?? 0) > GRANSER.fore).map((v) => `Versionen ${v.namn} har ${v.fore.length} rader under fore, och schemat tar högst ${GRANSER.fore}.`),
  ...(d.uppfoljning?.rader ?? []).filter((r) => (r.resultat ?? '').length > s.RESULTATETS_LANGD).map((r) => `Resultatet på raden "${r.nar}" har ${r.resultat.length} tecken, och schemat tar högst ${s.RESULTATETS_LANGD}.`),
  // Rutorna överst i metoden har högst 600 tecken, och "åk" står med hårt mellanslag före siffran.
  ...['upplagg', 'gruppen', 'principer'].filter((k) => typeof d[k]?.text === 'string' && d[k].text.length > 600).map((k) => `${k}.text har ${d[k].text.length} tecken, och en ruta överst i metoden tar högst 600.`),
  ...(/[Åå]k \d/.test(JSON.stringify(d)) ? ['"åk" och siffran efter står med vanligt mellanslag; skriv ett hårt mellanslag (U+00A0) mellan dem.'] : []),
];
// Ett resultat som läraren har sparat hör till uppföljningens rad efter dess plats, så en rad som finns på main behåller
// sin plats, och en ny rad läggs sist (Codex 2026-10-28, K-596: två nya rader före Efter i TIL tog efterresultatet).
const platserna = (id, d) => {
  let main;
  try { main = parseYaml(execFileSync('git', ['-C', rot, 'show', `origin/main:src/content/stodundervisning/${id}.yaml`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch { return []; }
  const fore = (main?.uppfoljning?.rader ?? []).map((r) => r.nar);
  const nu = (d.uppfoljning?.rader ?? []).map((r) => r.nar);
  return fore.some((n, i) => nu[i] !== n) ? [`Uppföljningens rader har bytt plats mot main (${fore.join(' | ')}). Sparade resultat hör till radens plats: låt raderna stå kvar och lägg en ny rad sist.`] : [];
};
let fel = 0;
for (const id of ids) {
  const d = parseYaml(readFileSync(join(rot, 'src/content/stodundervisning', `${id}.yaml`), 'utf8'));
  const f = [...schemat(d), ...platserna(id, d), ...s.planFel(d)];
  fel += f.length;
  console.log(f.length ? `${id}: ${f.length} fel\n${f.map((x) => `  ${x}`).join('\n')}` : `${id}: inga fel i planens fält`);
}
process.exit(fel ? 1 : 0);
