#!/usr/bin/env node
// Provfilerna till mejlens standard (K-729): varje slags mejl ur riktiga poster i dist/nytt.json, till underlag/prov/mejl/standard/,
// så att formen går att läsa som bilder före en uppladdning. Mallarna står i netlify/lib/mejl.mjs, och scripts/utskicksprov.mjs
// prövar dem. Månadsbrevet görs med scripts/manadsbrev.mjs.
//
//   node scripts/mejlprov.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brev } from '../netlify/lib/utskick.mjs';

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const UT = join(ROT, 'underlag', 'prov', 'mejl', 'standard');
mkdirSync(UT, { recursive: true });
const { poster } = JSON.parse(readFileSync(join(ROT, 'dist', 'nytt.json'), 'utf8'));
const post = (url) => { const p = poster.find((x) => x.url === url); if (!p) throw new Error(url); return p; };
const fall = {
  artikel: ['/artiklar/det-ar-relationen-som-far-kraven-att-bara'],
  artikel2: ['/artiklar/lagg-ner-powerpointen-larare-plocka-upp-pennan'],
  bok: ['/bocker/las-nycklar-till-en-god-lasundervisning'],
  stod: ['/stodundervisning/hoglasning-i-par'],
  serie: ['/stodundervisning/ljudlek-i-grupp', '/stodundervisning/ljudlek-rim', '/stodundervisning/ljudlek-forsta-ljudet'],
  metod: ['/metoder/reciprok-undervisning'],
  metod2: ['/metoder/testbaserat-larande'],
  metod3: ['/metoder/larande-pa-kognitionsvetenskaplig-grund'],
  verktyg: ['/strategier'],
  flera: ['/metoder/explicit-undervisning', '/metoder/kooperativt-larande'],
};
for (const [namn, urler] of Object.entries(fall)) {
  const html = brev(urler.map(post), 'https://niclasfohlin.se', { titel: `Prov: ${namn}` });
  writeFileSync(join(UT, `${namn}.html`), html);
  console.log(namn.padEnd(10), `${(Buffer.byteLength(html) / 1024).toFixed(1)} kB`);
}
