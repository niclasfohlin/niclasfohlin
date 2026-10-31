#!/usr/bin/env node
// Ritar strukturernas bilder (K-650) ur scener: en kort fil per bild som säger vilka figurer, var de står och i vilken
// ställning, och sakerna runt dem. Stilen står i stil.json, figurerna och sakerna i figurer/, och skillen som säger
// hur en scen skrivs i .claude/skills/strukturbilder/SKILL.md.
//
//   node scripts/strukturer/rita.mjs <scen.yaml> [...] [--ut <mapp>] [--png <bredd>]
//        ritar varje scen till <id>.svg i mappen (förval: bredvid scenen) och med --png också <id>.png i den bredden
//
// Bilden är 900 × 560 enheter, som referensernas form (450 × 280), och beskärs efter det som ritats, så att figurerna
// fyller bilden. Scenens delar ritas i den ordning de står, så det som står längre fram i bilden står senare i listan.
//
// En bild är strukturens huvudscen: ett ögonblick, inte flera steg (Niclas 2026-10-31: "helst EN [scen] för en
// struktur ... inte en stökig med flera sekvenser"), med en grupp eller en hel klass med högst elva figurer, alla i
// fokus ("färre än 12 figurer"). Motorn stannar på en scen med fler. Likhetsprovet ritar om Niclas referenser i deras
// egen form och får därför ha flera lägen (`likhetsprov: true`).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import YAML from 'yaml';
import { penna, V, plus } from './figurer/penna.mjs';
import { figur, KLADER } from './figurer/figur.mjs';
import * as saker from './figurer/saker.mjs';

const HAR = dirname(fileURLToPath(import.meta.url));
export const STIL = JSON.parse(readFileSync(join(HAR, 'stil.json'), 'utf8'));
export const BREDD = 900, HOJD = 560;

// Figurerna får olika hudtoner och tröjor efter sin plats i scenen, när scenen inte säger något annat, så att en
// grupp aldrig blir likadan.
const TROJOR = ['gul', 'ljusbla', 'gron', 'rosa', 'rod', 'lila', 'bla', 'orange', 'turkos', 'ljusgron'];
// Byggnad och längd skiljer sig lite mellan figurerna, som hudtonen, i en följd som inte upprepar sig i en grupp.
const BYGG = [0, 0.8, -0.6, 0.3, -0.9, 0.5, -0.3, 1, -0.1];
const STORLEK = [1, 0.95, 1.04, 0.97, 1.02, 0.93, 1.0, 1.05, 0.96];
export const HOGST_FIGURER = 11;
const BYXOR = ['rosa', 'vit', 'ljusbla', 'beige'];

// Djupet: en figur längre bak i bilden (mindre y) är lite mindre, som i referenserna.
function djupskala(scen, y) {
  if (scen.djup === false) return 1;
  const [bak, fram] = scen.djupRam || [300, 540];
  const t = Math.max(0, Math.min(1, (y - bak) / (fram - bak)));
  return 0.84 + 0.16 * t;
}

// Gör om scenens grupper (led, ring) till figurer.
function utvidga(delar) {
  const ut = [];
  for (const d of delar) {
    const [slag] = Object.keys(d);
    const o = d[slag];
    if (slag === 'led') {
      const [x0, y0] = o.fran, [x1, y1] = o.till;
      for (let i = 0; i < o.antal; i++) {
        const t = o.antal === 1 ? 0 : i / (o.antal - 1);
        const enskild = (o.figurer || [])[i] || {};
        ut.push({ figur: { ...o, ...enskild, x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, fran: undefined, till: undefined, figurer: undefined } });
      }
    } else if (slag === 'ring') {
      const [cx, cy] = o.mitt;
      const lista = [];
      for (let i = 0; i < o.antal; i++) {
        const t = ((o.start ?? 0) + (i / o.antal) * 360) * Math.PI / 180;
        const x = cx + Math.sin(t) * o.rx, y = cy - Math.cos(t) * o.ry;
        const enskild = (o.figurer || [])[i] || {};
        // Ansiktet vänder sig in mot mitten när figuren står i ringens främre halva syns ryggen.
        const fram = Math.cos(t) < -0.3;
        lista.push({ figur: { ...o, ansikte: fram && o.inat ? 'bak' : o.ansikte, blick: Math.max(-1, Math.min(1, (cx - x) / o.rx)), ...enskild, x, y, mitt: undefined, figurer: undefined } });
      }
      ut.push(...lista.sort((a, b) => a.figur.y - b.figur.y));
    } else ut.push(d);
  }
  return ut;
}

export function ritaScen(scen) {
  const p = penna(scen.id || 'scen', { linje: STIL.linje, krita: STIL.krita });
  const figurer = {};
  let nr = 0;
  const skala = scen.skala || 64;
  // Ett mål (pekar, nar, tittar, lutar) är en punkt [x, y] eller namnet på en sak eller figur i scenen. En figurs namn
  // ger dess huvud, och namn.V eller namn.H dess hand, när figuren redan är ritad.
  const namngivna = {};
  for (const d of utvidga(scen.delar || [])) {
    const [slag] = Object.keys(d), o = d[slag];
    if (o?.namn && slag !== 'figur') namngivna[o.namn] = [o.x, o.y];
    if (o?.namn && slag === 'figur') {
      // Innan figuren är ritad: huvudet och axlarna uppskattade ur var den står.
      const s = o.skala || scen.skala || 64;
      namngivna[o.namn] = [o.x, o.y - 3.2 * s];
      namngivna[`${o.namn}.axelV`] = [o.x - 0.33 * s, o.y - 2.5 * s];
      namngivna[`${o.namn}.axelH`] = [o.x + 0.33 * s, o.y - 2.5 * s];
    }
  }
  const punkt = (t) => {
    if (t == null || Array.isArray(t)) return t;
    const [namn, hand] = String(t).split('.');
    if (hand && figurer[namn]) { const h = hand.startsWith('axel') ? figurer[namn].axlar[hand.slice(4)] : figurer[namn].hander[hand]; return [h.x, h.y]; }
    if (namngivna[t]) return namngivna[t];
    if (figurer[namn]) return [figurer[namn].huvud.x, figurer[namn].huvud.y];
    if (namngivna[namn]) return namngivna[namn];
    throw new Error(`Målet ${t} finns inte i scenen ${scen.id}`);
  };
  const plats = (o) => {
    // En sak kan sitta i en figurs hand: hand: [figurens namn, V eller H].
    if (o.hand) { const [namn, sida] = o.hand; const h = figurer[namn].hander[sida]; return { ...o, x: h.x + (o.dx || 0), y: h.y + (o.dy || 0) }; }
    return o;
  };
  const efter = {};
  for (const d of utvidga(scen.delar || [])) {
    const [slag] = Object.keys(d);
    const o = d[slag];
    rita(slag, o);
    for (const f of (o?.namn && efter[o.namn]) || []) f();
  }
  function rita(slag, o) {
    if (slag === 'figur') {
      const i = nr++;
      if (nr > HOGST_FIGURER && !scen.likhetsprov) throw new Error(`Scenen ${scen.id} har fler än ${HOGST_FIGURER} figurer: en huvudscen har en grupp eller en klass med högst ${HOGST_FIGURER}`);
      const f = figur(p, {
        ...o,
        pekar: punkt(o.pekar), tittar: punkt(o.tittar), lutar: punkt(o.lutar),
        nar: o.nar && Object.fromEntries(Object.entries(o.nar).map(([k, v]) => [k, punkt(v)])),
        bygg: o.bygg ?? BYGG[(i + (scen.byggStart || 0)) % BYGG.length],
        storlek: o.storlek ?? STORLEK[(i * 2 + 1) % STORLEK.length],
        skala: (o.skala || skala) * djupskala(scen, o.y),
        hud: o.hud ?? (i * 3 + (scen.hudStart || 0)) % 7,
        trojan: o.trojan || TROJOR[(i + (scen.trojStart || 0)) % TROJOR.length],
        byxor: o.byxor || BYXOR[i % BYXOR.length],
      });
      figurer[o.namn ?? String(i)] = f;
      figurer[String(i)] = f;
      // Armar som når ut över en sak ritas när saken är ritad (armarEfter: sakens namn).
      if (o.armarEfter) (efter[o.armarEfter] ||= []).push(f.senare);
    } else if (slag === 'punkt') {
      // En punkt med ett namn, att peka, nå eller titta mot, som mitten av ett papper. Den ritas inte.
    } else if (slag === 'bubbla') {
      // En bubbla bär något i strukturen (Niclas 2026-10-31: "deras pratbubblor handlar om stilistiskt något i
      // strukturen. Inte bara på måfå"): scenen säger vad den visar, och granskaren prövar det mot stegen.
      if (!o.visar) throw new Error(`Bubblan i scenen ${scen.id} säger inte vad den visar i strukturen (fältet visar)`);
      const f = figurer[String(o.till)];
      const x = f.topp.x + (o.dx ?? 0), y = f.topp.y - (o.dy ?? 40);
      saker.bubbla(p, { ...o, x, y, mot: o.tanke ? V(f.topp.x, f.topp.y) : f.mun });
    } else if (slag in saker && typeof saker[slag] === 'function') {
      saker[slag](p, plats(o));
    } else throw new Error(`Okänd del i scenen ${scen.id}: ${slag}`);
  }
  for (const namn of Object.keys(efter)) if (!namngivna[namn]) throw new Error(`armarEfter: ${namn} finns inte i scenen ${scen.id}`);
  const [vx, vy, vb, vh] = (scen.ram || beskar(p.ruta(), scen.luft ?? 0.05)).map((n) => Math.round(n));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vb} ${vh}" width="${BREDD}" height="${HOJD}"><defs>${p.defs()}</defs><rect x="${vx}" y="${vy}" width="${vb}" height="${vh}" fill="#fff"/>\n${p.svg()}\n</svg>\n`;
}

// Beskär till det som ritats, med luft runt om, i bildens form 900 × 560.
function beskar(r, luft) {
  const kant = Math.max(r.x1 - r.x0, r.y1 - r.y0) * luft + 6;
  let x = r.x0 - kant, y = r.y0 - kant, b = r.x1 - r.x0 + 2 * kant, h = r.y1 - r.y0 + 2 * kant;
  const form = BREDD / HOJD;
  if (b / h < form) { const nb = h * form; x -= (nb - b) / 2; b = nb; } else { const nh = b / form; y -= (nh - h) / 2; h = nh; }
  return [x, y, b, h];
}

export async function tillPng(svg, bredd, { palett = 0 } = {}) {
  const sharp = (await import('sharp')).default;
  const bild = sharp(Buffer.from(svg), { density: Math.round(72 * (bredd / BREDD) * 1.02) }).resize({ width: bredd });
  return palett ? bild.png({ palette: true, colours: palett, dither: 0, effort: 10, compressionLevel: 9 }).toBuffer() : bild.png().toBuffer();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const varde = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const filer = args.filter((a, i) => !a.startsWith('--') && !['--ut', '--png'].includes(args[i - 1]));
  const ut = varde('--ut');
  const png = varde('--png');
  for (const fil of filer) {
    const scener = YAML.parse(readFileSync(fil, 'utf8'));
    for (const scen of Array.isArray(scener) ? scener : [scener]) {
      const svg = ritaScen(scen);
      const mapp = ut || dirname(fil);
      mkdirSync(mapp, { recursive: true });
      writeFileSync(join(mapp, `${scen.id}.svg`), svg);
      if (png) writeFileSync(join(mapp, `${scen.id}.png`), await tillPng(svg, Number(png)));
      console.log(`${scen.id}: ${(Buffer.byteLength(svg) / 1024).toFixed(1)} kB svg`);
    }
  }
}
