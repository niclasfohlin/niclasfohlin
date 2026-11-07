#!/usr/bin/env node
// Topplistan i verktyget Strukturer (K-650; Niclas 2026-10-31: "en topplista över de 5 mest tittade på och nedladdade
// strukturerna i verktyget (kan använda goatcounter för att uppdatera den listan)"): räknar varje strukturs besök
// (/strukturer/<id>) och utskrifter (händelsen utskrift:strukturer/<id>, från knappen Skriv ut kortet och från listan
// Att skriva ut) de senaste 30 dagarna ur GoatCounters API och skriver dem till src/data/strukturer-topp.json, som sidan
// /strukturer visar när minst fem strukturer har besök (src/lib/strukturer.ts). En utskrift väger som fem besök (Niclas
// 2026-11-01: "Utskrift av en struktur kanske ger 5 besök?"): ett kort som skrivs ut kommer till användning. Filen med
// alla kort räknas inte per kort, så att den som skriver ut hela leken inte lyfter alla.
//
//   node scripts/strukturer/topplistan.mjs              hämtar listan
//   node scripts/strukturer/topplistan.mjs --vid-behov  bara när listan är äldre än 20 timmar (i npm run validera)
//
// Nyckeln är Niclas och läses bara ur miljön, GC_NYCKEL (Claude Code sätter den ur .claude/settings.local.json), och skrivs
// aldrig ut. Utan nyckel, och när GoatCounter inte svarar eller svarar 429, står listan kvar som den var och skriptet
// säger det med ! utan att stoppa valideringen. Varje körning gör högst 20 anrop mot GoatCounters 500 i timmen, en gång om dygnet
// (DRIFT.md under Besöksstatistik).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strukturernasTopplista } from '../../src/lib/standard/strukturer.js';
import { allaHits } from '../../netlify/lib/goatcounter.mjs';

const ROT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIL = join(ROT, 'src', 'data', 'strukturer-topp.json');
const forut = JSON.parse(readFileSync(FIL, 'utf8'));
if (process.argv.includes('--vid-behov') && forut.datum && Date.now() - Date.parse(forut.datum) < 20 * 3600000) {
  console.log(`Strukturernas topplista är från ${forut.datum.slice(0, 16).replace('T', ' ')}.`);
  process.exit(0);
}
const nyckel = process.env.GC_NYCKEL ?? '';
if (!nyckel) { console.log('  ! Strukturernas topplista: ingen GC_NYCKEL i miljön, så listan står kvar som den var.'); process.exit(0); }

const slut = new Date(); slut.setMinutes(0, 0, 0); slut.setHours(slut.getHours() + 1);
const start = new Date(slut.getTime() - 30 * 86400000);

try {
  const strukturer = strukturernasTopplista(await allaHits(nyckel, { start, slut, tidsgrans: 60000, paus: 400, timeout: 20000 }));
  writeFileSync(FIL, JSON.stringify({ datum: new Date().toISOString(), strukturer }, null, 2) + '\n');
  console.log(`Strukturernas topplista: ${strukturer.length} strukturer med besök eller utskrifter de senaste 30 dagarna.`);
} catch (e) {
  console.log(`  ! Strukturernas topplista: ${e.message}, så listan står kvar som den var.`);
}
