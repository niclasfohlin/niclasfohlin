#!/usr/bin/env node
// Likhetsprovet för strukturernas bilder (K-650): motorn ritar om Niclas referensbilder ur scenerna i likhet/, och
// ett ark ställer varje referens bredvid motorns bild, med mätningen av båda (matstil.mjs) under. Arket läses av en
// granskare med frågorna i .claude/skills/strukturbilder/SKILL.md under Likhetsprovet, och sedan av Niclas.
// Referenserna ligger i underlag/prov/strukturer/referens/, som git ignorerar, så provet görs där de finns.
//
//   node scripts/strukturer/likhet.mjs [--ut <fil.png>]    förval: underlag/prov/strukturer/pilot/likhet.png
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import YAML from 'yaml';
import { ritaScen, tillPng } from './rita.mjs';
import { mat } from './matstil.mjs';

const HAR = dirname(fileURLToPath(import.meta.url));
const ROT = join(HAR, '..', '..');
const REF = join(ROT, 'underlag', 'prov', 'strukturer', 'referens');
const args = process.argv.slice(2);
const ut = args.includes('--ut') ? args[args.indexOf('--ut') + 1] : join(ROT, 'underlag', 'prov', 'strukturer', 'pilot', 'likhet.png');
mkdirSync(dirname(ut), { recursive: true });

const B = 560, H = 348, RAD = 40;
const scener = readdirSync(join(HAR, 'likhet')).filter((f) => f.endsWith('.yaml')).sort();
const rutor = [];
const text = (s, x, y, storlek = 15, vikt = 400) => `<text x="${x}" y="${y}" font-family="Segoe UI, Arial" font-size="${storlek}" font-weight="${vikt}" fill="#333">${s.replace(/&/g, '&amp;')}</text>`;
let y = 50;
const svgText = [text('Likhetsprovet: referensen till vänster, motorns bild till höger', 20, 32, 20, 700)];
const tmp = join(dirname(ut), '_likhet');
mkdirSync(tmp, { recursive: true });
for (const fil of scener) {
  const scen = YAML.parse(readFileSync(join(HAR, 'likhet', fil), 'utf8'));
  const ref = readdirSync(REF).find((f) => f.startsWith(scen.id) && /\.(png|jpe?g)$/i.test(f));
  if (!ref) { console.error(`Referensen till ${scen.id} saknas`); continue; }
  const png = await tillPng(ritaScen(scen), 900);
  const egen = join(tmp, `${scen.id}.png`);
  writeFileSync(egen, png);
  const [mr, me] = [await mat(join(REF, ref)), await mat(egen)];
  const rad = (m) => `luft ${Math.round(m.luft * 100)} %, linjen ${(m.linje.delAvBredden * 1000).toFixed(1)} ‰ av bredden, kritan ${m.krita}`;
  const refBild = await sharp(join(REF, ref)).flatten({ background: '#fff' }).resize(B, H, { fit: 'contain', background: '#fff' }).png().toBuffer();
  const egenBild = await sharp(png).resize(B, H, { fit: 'contain', background: '#fff' }).png().toBuffer();
  rutor.push({ input: refBild, left: 20, top: y }, { input: egenBild, left: 40 + B, top: y });
  svgText.push(text(`${scen.id}: ${rad(mr)}`, 20, y + H + 22, 14), text(`motorn: ${rad(me)}`, 40 + B, y + H + 22, 14));
  y += H + RAD + 10;
}
const bredd = 60 + 2 * B, hojd = y + 10;
const bakgrund = `<svg xmlns="http://www.w3.org/2000/svg" width="${bredd}" height="${hojd}"><rect width="100%" height="100%" fill="#fff"/>${svgText.join('')}</svg>`;
await sharp(Buffer.from(bakgrund)).composite(rutor.map((r) => ({ ...r }))).png().toFile(ut);
console.log(`Skrev ${ut} med ${scener.length} par.`);
