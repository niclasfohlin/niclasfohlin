#!/usr/bin/env node
// Databasens matteproblem ur en leverans från metodriggen (K-425; riggens out/databas/matteproblem, formen i riggens
// FRAN-SAJTEN, Nytt 2026-10-18 kväll): kopierar posterna till src/content/matteproblem/ och bilderna till
// public/stodundervisning/matteproblem/. Niclas 2026-10-18: verktygen ska vara "skalbara och enkla att bara pusha in nytt
// innehåll med väldigt lite handkraft". Inget skrivs för hand: en ny leverans körs genom skriptet, och npm run validera
// gör resten, raden på Ta fram ett matteproblem, Visa stort, lösningsförslaget, nivåernas Word-filer och pdf:erna
// (src/lib/matteproblem.ts). Bygget stannar på en post som inte håller formen (schemat i src/content.config.ts), inte
// ryms på ett A4 eller tar ett nummer som redan finns på nivån.
//
// Skriptet stannar innan det kopierar något när en post saknar någon av sina tre bilder (<id>-problem.svg, -a.svg och
// -b.svg) eller en bild saknar sin post. En post som har tagits bort hos riggen tas inte bort här: skriptet säger det, och
// den tas bort för hand, eftersom en lärares sparade lista kan peka på den.
//
//   node scripts/matteproblem.mjs <riggens out/databas/matteproblem>          kopierar posterna och bilderna
//   node scripts/matteproblem.mjs <riggens out/databas/matteproblem> --prova  säger bara vad som skulle göras
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const mapp = args.find((a) => !a.startsWith('--'));
const prova = args.includes('--prova');
if (!mapp || !existsSync(join(mapp, 'poster')) || !existsSync(join(mapp, 'bilder'))) {
  console.error('Ange riggens mapp med poster/ och bilder/: node scripts/matteproblem.mjs C:/metodrigg/out/databas/matteproblem [--prova]');
  process.exit(1);
}
const POSTER = 'src/content/matteproblem';
const BILDER = 'public/stodundervisning/matteproblem';
const poster = readdirSync(join(mapp, 'poster')).filter((f) => f.endsWith('.yaml')).map((f) => f.replace(/\.yaml$/, ''));
const bilder = readdirSync(join(mapp, 'bilder')).filter((f) => f.endsWith('.svg'));
const fel = [];
for (const id of poster) for (const vad of ['problem', 'a', 'b']) if (!bilder.includes(`${id}-${vad}.svg`)) fel.push(`posten ${id} saknar bilden ${id}-${vad}.svg`);
for (const b of bilder) if (!poster.includes(b.replace(/-(problem|a|b)\.svg$/, ''))) fel.push(`bilden ${b} har ingen post`);
if (fel.length) { console.error(`FEL  ${fel.length} fel i leveransen, inget kopierat:\n  ${fel.join('\n  ')}`); process.exit(1); }

// Textfiler jämförs utan radslut: git checkar ut dem med CRLF på Windows, och riggen skriver LF (2026-10-19 räknades
// annars alla 30 poster som ändrade fast innehållet var detsamma).
const utanCR = (b) => Buffer.from(b.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
const lika = (a, b) => existsSync(b) && (/\.(yaml|svg)$/.test(a) ? utanCR(readFileSync(a)).equals(utanCR(readFileSync(b))) : readFileSync(a).equals(readFileSync(b)));
let nya = 0, andrade = 0, samma = 0;
if (!prova) { mkdirSync(POSTER, { recursive: true }); mkdirSync(BILDER, { recursive: true }); }
for (const [fran, till] of [...poster.map((id) => [join(mapp, 'poster', `${id}.yaml`), join(POSTER, `${id}.yaml`)]), ...bilder.map((b) => [join(mapp, 'bilder', b), join(BILDER, b)])]) {
  if (lika(fran, till)) { samma++; continue; }
  if (existsSync(till)) andrade++; else nya++;
  if (!prova) copyFileSync(fran, till);
}
const harHar = existsSync(POSTER) ? readdirSync(POSTER).filter((f) => f.endsWith('.yaml')).map((f) => f.replace(/\.yaml$/, '')) : [];
const borta = harHar.filter((id) => !poster.includes(id));
console.log(`${prova ? 'prov' : 'ok  '} matteproblem: ${poster.length} poster och ${bilder.length} bilder i leveransen; ${nya} nya filer, ${andrade} ändrade och ${samma} som redan stämmer${prova ? ' (inget kopierat)' : ''}.`);
if (borta.length) console.log(`obs  ${borta.length} poster finns här men inte i leveransen: ${borta.join(', ')}. Ta bort dem för hand om riggen har tagit bort dem.`);
if (!prova && (nya || andrade)) console.log('Kör npm run validera, som gör Word-filerna, pdf:erna och sidan.');
