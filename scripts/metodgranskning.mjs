#!/usr/bin/env node
// Codex granskar en metod i stödundervisning: paritet mellan underlag, YAML, sida, lathund och
// Word-filer, designparitet mellan skärm, utskrift och docx, och kvalitet. Fynden lämnas som P1 till P3
// och Claude Code adjudicerar dem efteråt (METODER.md, Codex-granskningen).
//
//   node scripts/metodgranskning.mjs <id>                         Granska metoden (kräver npm run validera först)
//   node scripts/metodgranskning.mjs <id> --underlag <fil.md>     Ta med underlaget i jämförelsen
//   node scripts/metodgranskning.mjs <id> --bara-prompt           Skriv bara prompten, kör inte Codex
//   node scripts/metodgranskning.mjs <id> --vanta                 Kör i förgrunden och vänta (fem till tio minuter)
//   node scripts/metodgranskning.mjs <id> --lathundbilder <mapp>  Bifoga lathundens original som sidbilder (png ur lathund.pdf)
//
// Prompten byggs ur scripts/codex/metod-granskning.md. Word-filernas text tas fram med pandoc, och
// skärmbilderna från scripts/metodprov.mjs --bilder bifogas om de finns. Svaret hamnar i
// underlag/prov/<id>/granskning-<datum>.md, loggen i underlag/prov/<id>/codex.log.

import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync, readdirSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
if (!id) { console.error('Ange metodens id: node scripts/metodgranskning.mjs <id> [--underlag <fil>] [--lathundbilder <mapp>] [--bara-prompt] [--vanta]'); process.exit(1); }
const flagga = (namn) => { const i = args.indexOf(namn); return i >= 0 ? args[i + 1] : undefined; };
const underlag = flagga('--underlag');
const lathundMapp = flagga('--lathundbilder');
// --mall <fil>: en annan promptmall än scripts/codex/metod-granskning.md, t.ex. metod-lasbarhet.md.
// --extrabilder <mapp>: alla png i mappen bifogas som skärmbilder (delade sidbilder, Word-sidor).
const mallFil = flagga('--mall');
const extraMapp = flagga('--extrabilder');
// --fragor <fil>: särskilda frågor som sätts in där mallen har {{fragor}}.
const fragorFil = flagga('--fragor');
const baraPrompt = args.includes('--bara-prompt');
const vanta = args.includes('--vanta');

const MODELL = process.env.CODEX_MODELL ?? 'gpt-6-astra';
const ANSTRANGNING = process.env.CODEX_ANSTRANGNING ?? 'xhigh';
const codexExe = [
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Programs', 'OpenAI', 'Codex', 'bin', 'codex.exe'),
  'codex',
].filter(Boolean).find((p) => p === 'codex' || existsSync(p));

const yaml = join(rot, 'src', 'content', 'stodundervisning', `${id}.yaml`);
const sida = join(rot, 'dist', 'stodundervisning', id, 'index.html');
const lathund = join(rot, 'dist', 'stodundervisning', id, 'lathund', 'index.html');
if (!existsSync(yaml)) { console.error(`Ingen metod med id ${id} (${yaml}).`); process.exit(1); }
if (!existsSync(sida)) { console.error('Sidan finns inte i dist. Kör npm run validera först.'); process.exit(1); }
if (underlag && !existsSync(resolve(underlag))) { console.error(`Underlaget finns inte: ${underlag}`); process.exit(1); }

const prov = join(rot, 'underlag', 'prov', id);
const mapp = join(prov, 'granskning');
mkdirSync(mapp, { recursive: true });
const rel = (p) => p.replace(rot + '\\', '').replace(rot + '/', '').replace(/\\/g, '/');

// Word-filernas text, så att Codex kan jämföra utan att öppna docx.
const docxTexter = [];
for (const [fil, namn] of [[`${id}.docx`, 'allt'], [`${id}-mallar.docx`, 'mallar'], [`${id}-lathund.docx`, 'lathund']]) {
  const kalla = join(rot, 'dist', 'stodundervisning', fil);
  if (!existsSync(kalla)) continue;
  const ut = join(mapp, `docx-${namn}.md`);
  try {
    execFileSync('pandoc', [kalla, '-t', 'markdown', '-o', ut], { stdio: 'inherit' });
    docxTexter.push(`- ${rel(ut)} (texten ur dist/stodundervisning/${fil})`);
  } catch {
    console.log(`  obs  pandoc kunde inte läsa ${fil}; Codex får läsa docx-filen själv.`);
    docxTexter.push(`- dist/stodundervisning/${fil}`);
  }
}

// Skärmbilder från metodprov --bilder, om de finns.
const bilder = ['desktop.png', 'mobil.png', 'lathund-desktop.png', 'lathund-mobil.png']
  .map((b) => join(prov, b)).filter((b) => existsSync(b));
const pdfer = ['utskrift.pdf', 'lathund-utskrift.pdf'].map((b) => join(prov, b)).filter((b) => existsSync(b));
// Lathundens original som sidbilder (pdftoppm ur lathund.pdf), när --lathundbilder pekar på mappen.
const original = lathundMapp && existsSync(resolve(lathundMapp))
  ? readdirSync(resolve(lathundMapp)).filter((f) => /\.png$/i.test(f)).sort().map((f) => join(resolve(lathundMapp), f))
  : [];
if (lathundMapp && !original.length) console.warn(`Inga png-bilder i ${lathundMapp}: lathundens original bifogas inte.`);
const extra = extraMapp && existsSync(resolve(extraMapp))
  ? readdirSync(resolve(extraMapp)).filter((f) => /\.png$/i.test(f)).sort().map((f) => join(resolve(extraMapp), f))
  : [];
if (extraMapp && !extra.length) console.warn(`Inga png-bilder i ${extraMapp}.`);

const datum = new Date().toISOString().slice(0, 10);
const mall = readFileSync(mallFil ? resolve(mallFil) : join(rot, 'scripts', 'codex', 'metod-granskning.md'), 'utf8');
const prompt = mall
  .replaceAll('{{id}}', id)
  .replaceAll('{{datum}}', datum)
  .replaceAll('{{fragor}}', fragorFil ? readFileSync(resolve(fragorFil), 'utf8').trim() : '(inga särskilda frågor)')
  .replaceAll('{{yaml}}', rel(yaml))
  .replaceAll('{{underlag}}', underlag ? rel(resolve(underlag)) : '(inget underlag angivet: hoppa över jämförelsen med underlaget)')
  .replaceAll('{{sida}}', rel(sida))
  .replaceAll('{{lathund}}', existsSync(lathund) ? rel(lathund) : '(metoden har ingen lathund)')
  .replaceAll('{{docx}}', docxTexter.join('\n') || '- (inga Word-filer i dist)')
  .replaceAll('{{bilder}}', [...bilder.map((b) => `- ${rel(b)} (bifogad som bild)`), ...original.map((b, i) => `- ${rel(b)} (lathundens original ur Niclas pptx, sida ${i + 1}, bifogad som bild: jämför lathunden på sajten mot den)`), ...extra.map((b) => `- ${rel(b)} (bifogad som bild)`), ...pdfer.map((p) => `- ${rel(p)} (utskriften som pdf, läs med pdftotext om det finns)`)].join('\n') || '- (inga skärmbilder: kör node scripts/metodprov.mjs ' + id + ' --bilder först)');
const promptFil = join(mapp, 'prompt.md');
writeFileSync(promptFil, prompt);
console.log(`Prompten ligger i ${rel(promptFil)}${bilder.length + original.length + extra.length ? `, ${bilder.length + original.length + extra.length} bilder bifogas` : ''}.`);
if (baraPrompt) process.exit(0);
if (!codexExe) { console.error('Hittar inte Codex CLI (codex.exe i %LOCALAPPDATA%\\Programs\\OpenAI\\Codex\\bin eller codex i PATH).'); process.exit(1); }

const svar = join(prov, `granskning-${datum}.md`);
const logg = join(prov, 'codex.log');
const codexArgs = ['exec', '-m', MODELL, '-c', `model_reasoning_effort=${ANSTRANGNING}`, '--sandbox', 'read-only', '--skip-git-repo-check', '-o', svar];
for (const b of [...bilder, ...original, ...extra]) codexArgs.push('-i', b);
codexArgs.push('-');

const loggFd = openSync(logg, 'w');
const barn = spawn(codexExe, codexArgs, { cwd: rot, stdio: ['pipe', loggFd, loggFd], detached: !vanta, windowsHide: true });
barn.stdin.end(prompt);
if (vanta) {
  barn.on('exit', (kod) => {
    console.log(kod === 0 ? `Klart. Svaret ligger i ${rel(svar)}.` : `Codex avslutade med kod ${kod}, se ${rel(logg)}.`);
    process.exit(kod ?? 1);
  });
} else {
  barn.unref();
  console.log(`Codex kör i bakgrunden (${MODELL}, ${ANSTRANGNING}), fem till tio minuter. Svaret hamnar i ${rel(svar)}, loggen i ${rel(logg)}.`);
  console.log('Adjudicera sedan: P1 lagas nu, P2 lagas eller köas, P3 och innehållsförslag blir beslut till Niclas i NATTEN.md.');
}
