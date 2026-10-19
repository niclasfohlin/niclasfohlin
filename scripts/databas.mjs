#!/usr/bin/env node
// Databasernas intag ur metodriggen (K-454; Niclas 2026-10-19: "Försök sedan med riggen få ihop er hur nytt innehåll
// byggs, formen för dem och hur dessa databaser kan fyllas på med nytt på smidigaste sätt"). Överenskommelsen står i
// riggens out/FRAN-SAJTEN.md (Nytt 2026-10-19 eftermiddag) och out/TILL-SAJTEN.md (svaret samma eftermiddag): riggen
// lägger varje databas i ett eget paket, out/databas/<databas>/, med posterna i poster/, bilderna i bilder/ och en
// TILL-SAJTEN.md med läget överst, och källan står i riggens databas/<databas>/. Sajtens schema är facit, och riggen tar
// nästa lediga nummer ur sajtens main.
//
// Skriptet tar in varje databas som har ett paket, med databasens eget intag, och skriver vad som togs in, vad som var
// oförändrat och vad som stannade i paketets INTAGET.md, det senaste först, så att riggen ser det utan att läsa sajtens
// logg. Ett intag prövar leveransen och stannar innan det kopierar något när en post krockar eller inte håller formen.
// Sedan gör npm run validera resten: sidorna, Word-filerna, pdf:erna och delningskorten. Hur varje databas ser ut står i
// METODER.md under Ta fram ur en bank.
//
//   node scripts/databas.mjs <riggens out/databas>                  tar in alla paket
//   node scripts/databas.mjs <riggens out/databas> faktatexter …    bara de angivna
//   … --prova                                                        säger bara vad som skulle göras
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Databaserna och deras intag. En ny databas läggs till här, med sitt intag och sin form i METODER.md.
const INTAG = {
  matteproblem: { skript: 'scripts/matteproblem.mjs', form: 'poster/<id>.yaml och bilder/<id>-problem.svg, -a.svg och -b.svg' },
  faktatexter: { skript: 'scripts/faktateman.mjs', form: 'poster/<tema>.yaml och bilder/ med pabordet.json och svg-filerna' },
};

const args = process.argv.slice(2);
const prova = args.includes('--prova');
const [mapp, ...valda] = args.filter((a) => !a.startsWith('--'));
if (!mapp || !existsSync(mapp)) {
  console.error('Ange riggens mapp med paketen: node scripts/databas.mjs C:/metodrigg/out/databas [<databas> …] [--prova]');
  process.exit(1);
}
const paket = readdirSync(mapp, { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => x.name).filter((n) => !valda.length || valda.includes(n));
const okanda = paket.filter((n) => !INTAG[n]);
const kanda = paket.filter((n) => INTAG[n]);
if (!kanda.length) {
  console.error(`databas: inga paket att ta in i ${mapp}${okanda.length ? ` (okända: ${okanda.join(', ')})` : ''}. Sajten har intag för ${Object.keys(INTAG).join(' och ')}.`);
  process.exit(1);
}
const nu = new Date();
const tid = `${nu.toISOString().slice(0, 10)} ${nu.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' })}`;
let fel = 0;
for (const namn of kanda) {
  const dir = join(mapp, namn);
  const r = spawnSync(process.execPath, [INTAG[namn].skript, dir, ...(prova ? ['--prova'] : [])], { encoding: 'utf8' });
  const ut = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  const ok = r.status === 0;
  if (!ok) fel++;
  console.log(`${ok ? (prova ? 'prov' : 'ok  ') : 'NEJ '} ${namn}\n${ut.split('\n').map((x) => `     ${x}`).join('\n')}`);
  if (prova) continue;
  // Rapporten till riggen, det senaste först.
  const rapportFil = join(dir, 'INTAGET.md');
  const forut = existsSync(rapportFil) ? readFileSync(rapportFil, 'utf8').replace(/^# [^\n]*\n+(?:[^#][^\n]*\n+)*/, '') : '';
  const avsnitt = `## ${tid}: ${ok ? 'intaget' : 'stannade, inget kopierat'}\n\n${ut.split('\n').map((x) => `    ${x}`).join('\n')}\n\n${ok ? 'Nästa steg på sajten: npm run validera, Google-provet och uppladdningen när Niclas har sagt till. Sajten skriver i out/FRAN-SAJTEN.md när posterna är ute.' : 'Laga källan i riggens databas/, bygg paketet igen och säg till i TILL-SAJTEN.md.'}\n\n`;
  writeFileSync(rapportFil, `# Intaget på sajten: ${namn}\n\nSkrivet av sajtens scripts/databas.mjs, det senaste först. Formen på paketet: ${INTAG[namn].form}.\n\n${avsnitt}${forut}`);
}
if (okanda.length) console.log(`obs  paket som sajten inte har något intag för: ${okanda.join(', ')}`);
if (fel) { console.error(`\ndatabas: ${fel} av ${kanda.length} paket stannade. Läs raderna ovan; inget av dem är kopierat.`); process.exit(1); }
if (!prova) console.log('\nNästa steg: npm run validera.');
