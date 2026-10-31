#!/usr/bin/env node
// Mäter stilen i Niclas referensbilder till strukturernas bilder (K-650) och skriver delen `matt` i stil.json.
// Referenserna ligger i underlag/prov/strukturer/referens/, som git ignorerar, så mätningen görs om bara där de finns.
// Det som inte går att mäta med säkerhet, huvudets och kroppens proportioner, står för hand under `hand` i stil.json
// och skrivs inte över.
//
//   node scripts/strukturer/matstil.mjs            mäter och skriver stil.json
//   node scripts/strukturer/matstil.mjs --visa     mäter och skriver ut, utan att skriva
//
// Mätningen per bild:
//   luft      andelen vita bildpunkter (ljushet över 235 och nästan ingen mättnad)
//   linje     andelen mörka bildpunkter (ljushet under 110) och linjens bredd: för varje punkt i linjen med kanten
//             (ljushet under 170 och grå) den kortaste av den vågräta och den lodräta sträckan genom punkten,
//             medelvärdet över bilden, i bildpunkter och i delar av bildens bredd
//   farger    de vanligaste färgerna i ytorna (inte vitt och inte linjen), i grupper om 24 steg per kanal, med andel
//   krita     hur ojämn färgen är i ytorna: medelvärdet av ljushetens spridning i 5 × 5-rutor där alla punkter är yta
import sharp from 'sharp';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HAR = dirname(fileURLToPath(import.meta.url));
const REF = join(HAR, '..', '..', 'underlag', 'prov', 'strukturer', 'referens');
const UT = join(HAR, 'stil.json');
const visa = process.argv.includes('--visa');

const ljus = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const mattnad = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx ? (mx - mn) / mx : 0; };
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

export async function mat(fil) {
  const { data, info } = await sharp(fil).flatten({ background: '#ffffff' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: B, height: H } = info;
  const px = (x, y) => { const i = (y * B + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };
  const slag = new Uint8Array(B * H); // 0 vitt, 1 linje, 2 yta
  const kant = new Uint8Array(B * H); // linjen med sin grå kant
  let vita = 0, morka = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
    const [r, g, b] = px(x, y), l = ljus(r, g, b);
    if (l > 235 && mattnad(r, g, b) < 0.08) { slag[y * B + x] = 0; vita++; }
    else if (l < 110) { slag[y * B + x] = 1; morka++; }
    else slag[y * B + x] = 2;
    if (l < 170 && mattnad(r, g, b) < 0.3) kant[y * B + x] = 1;
  }
  // Rubriken står överst i referenserna och är inte bildens linje: den översta femtedelen räknas inte i linjens bredd.
  const fran = Math.round(H * 0.2);
  const bredder = [];
  for (let y = fran; y < H; y++) for (let x = 0; x < B; x++) {
    if (!kant[y * B + x]) continue;
    let v = x, h = x, u = y, n = y;
    while (v > 0 && kant[y * B + v - 1]) v--;
    while (h < B - 1 && kant[y * B + h + 1]) h++;
    while (u > fran && kant[(u - 1) * B + x]) u--;
    while (n < H - 1 && kant[(n + 1) * B + x]) n++;
    bredder.push(Math.min(h - v + 1, n - u + 1));
  }
  const grupper = new Map();
  let ytor = 0;
  for (let y = fran; y < H; y++) for (let x = 0; x < B; x++) {
    if (slag[y * B + x] !== 2) continue;
    const [r, g, b] = px(x, y);
    // Kanten mellan linjen och vitt är grå och är ingen färg.
    if (mattnad(r, g, b) < 0.1) continue;
    ytor++;
    const k = [r, g, b].map((v) => Math.floor(v / 24)).join(',');
    const e = grupper.get(k) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b; grupper.set(k, e);
  }
  const farger = [...grupper.values()].sort((a, b) => b.n - a.n).slice(0, 8)
    .map((e) => ({ hex: hex(e.r / e.n, e.g / e.n, e.b / e.n), andel: +(e.n / ytor).toFixed(3) }));
  const spridning = [];
  for (let y = fran; y + 5 <= H; y += 5) for (let x = 0; x + 5 <= B; x += 5) {
    const l = [];
    let hel = true;
    for (let j = 0; j < 5 && hel; j++) for (let i = 0; i < 5; i++) {
      if (slag[(y + j) * B + x + i] !== 2) { hel = false; break; }
      l.push(ljus(...px(x + i, y + j)));
    }
    if (!hel) continue;
    const m = l.reduce((a, b) => a + b, 0) / l.length;
    spridning.push(Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / l.length));
  }
  const linjebredd = +(bredder.reduce((a, b) => a + b, 0) / (bredder.length || 1)).toFixed(2);
  return {
    storlek: [B, H],
    luft: +(vita / (B * H)).toFixed(3),
    linje: { andel: +(morka / (B * H)).toFixed(4), bredd: linjebredd, delAvBredden: +(linjebredd / B).toFixed(4) },
    farger,
    krita: +(spridning.reduce((a, b) => a + b, 0) / (spridning.length || 1)).toFixed(2),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!existsSync(REF)) { console.error(`Referenserna saknas i ${REF}. Mätningen görs bara där de finns.`); process.exit(1); }
  const filer = readdirSync(REF).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
  const matt = {};
  for (const f of filer) matt[f] = await mat(join(REF, f));
  const alla = Object.values(matt);
  const sammanfattning = {
    luft: +(alla.reduce((a, m) => a + m.luft, 0) / alla.length).toFixed(3),
    linjeDelAvBredden: median(alla.map((m) => m.linje.delAvBredden)),
    krita: +(alla.reduce((a, m) => a + m.krita, 0) / alla.length).toFixed(2),
  };
  if (visa) { console.log(JSON.stringify({ sammanfattning, matt }, null, 2)); process.exit(0); }
  const stil = existsSync(UT) ? JSON.parse(readFileSync(UT, 'utf8')) : {};
  stil.matt = { datum: new Date().toISOString().slice(0, 10), sammanfattning, bilder: matt };
  writeFileSync(UT, JSON.stringify(stil, null, 2) + '\n');
  console.log(`Skrev ${UT}: ${filer.length} bilder, luft ${sammanfattning.luft}, linjen ${sammanfattning.linjeDelAvBredden} av bredden, krita ${sammanfattning.krita}.`);
}
