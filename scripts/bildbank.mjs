#!/usr/bin/env node
// Bildbanken till bildkorten (Ljudlek i grupp, 2026-09-29): en SVG per ord ur Microsofts Fluent Emoji (MIT-licens,
// public/bildbank/LICENSE-fluent-emoji.txt), samma bilder som i metodriggens design/bilder/fluent/. Ett kort vars ord
// har en bild här ritas som vikkort, och bokstavskartan tar sina bilder härifrån (src/lib/ljudkort.ts).
//
// Förteckningen src/data/bildbank.json säger vilket ord varje fil hör till. Filnamnen är ASCII (båt blir baat.svg), så
// att adressen är densamma hos Netlify, i webbläsaren och i Word, och ordet står i förteckningen. En ny bild från
// riggen läggs i public/bildbank/ med ordet som namn (båt.svg); skriptet byter namnet och för in ordet. Allt görs av
// npm run validera, och bygget stannar om förteckningen och mappen inte stämmer.
//
//   node scripts/bildbank.mjs                 för in nya bilder och stryker borttagna (körs i npm run validera)
//   node scripts/bildbank.mjs --kontrollera   ändrar inget; slutkod 1 om förteckningen och mappen inte stämmer

import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAPP = join(rot, 'public', 'bildbank');
const FORTECKNING = join(rot, 'src', 'data', 'bildbank.json');
const kontrollera = process.argv.includes('--kontrollera');

// Samma omskrivning som ljudkort.ts gör när den letar efter en bild: å aa, ä ae, ö oe, é e.
const ascii = (ord) => ord.normalize('NFC').toLowerCase().replace(/å/g, 'aa').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/é/g, 'e');
const gammal = existsSync(FORTECKNING) ? JSON.parse(readFileSync(FORTECKNING, 'utf8')).ord ?? {} : {};
const filer = existsSync(MAPP) ? readdirSync(MAPP).filter((f) => f.toLowerCase().endsWith('.svg')) : [];
const ny = {};
const andringar = [];
// Filer som redan är förtecknade behåller sitt ord.
const kanda = new Map(Object.entries(gammal).map(([ord, fil]) => [fil, ord]));
for (const fil of filer) {
  const namn = fil.slice(0, -4).normalize('NFC');
  const ord = kanda.get(fil) ?? namn.toLowerCase();
  const malfil = `${ascii(ord)}.svg`;
  if (!/^[a-z0-9-]+\.svg$/.test(malfil)) { console.error(`Ordet "${ord}" (${fil}) går inte att skriva som filnamn med a–z.`); process.exit(1); }
  if (fil !== malfil) {
    andringar.push(`${fil} heter ${malfil}`);
    if (!kontrollera) renameSync(join(MAPP, fil), join(MAPP, malfil));
  }
  if (ny[ord] && ny[ord] !== malfil) { console.error(`Ordet "${ord}" har två bilder: ${ny[ord]} och ${malfil}.`); process.exit(1); }
  ny[ord] = malfil;
}
for (const ord of Object.keys(gammal)) if (!ny[ord]) andringar.push(`${ord} har ingen bild längre`);
for (const [ord, fil] of Object.entries(ny)) if (gammal[ord] !== fil) andringar.push(`${ord}: ${fil}`);
const sorterad = Object.fromEntries(Object.entries(ny).sort(([a], [b]) => a.localeCompare(b, 'sv')));
const text = `${JSON.stringify({ kalla: 'Fluent Emoji, © Microsoft Corporation, MIT-licens (public/bildbank/LICENSE-fluent-emoji.txt)', ord: sorterad }, null, 2)}\n`;
const sammaText = existsSync(FORTECKNING) && readFileSync(FORTECKNING, 'utf8').replace(/\r\n/g, '\n') === text;
if (kontrollera) {
  if (andringar.length || !sammaText) {
    console.error(`Bildbanken och src/data/bildbank.json stämmer inte (${andringar.slice(0, 5).join('; ') || 'förteckningen är inte skriven av skriptet'}). Kör npm run validera och committa resultatet.`);
    process.exit(1);
  }
  console.log(`Bildbanken stämmer (${Object.keys(ny).length} bilder).`);
} else {
  if (!sammaText) writeFileSync(FORTECKNING, text);
  console.log(andringar.length ? `Bildbanken: ${andringar.length} ändringar (${andringar.slice(0, 3).join('; ')}${andringar.length > 3 ? ' …' : ''}). Committa public/bildbank och src/data/bildbank.json.` : `Bildbanken stämmer (${Object.keys(ny).length} bilder).`);
}
