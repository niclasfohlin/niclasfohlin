// Bildserierna (Seriesamtal och ritprat, 2026-10-03): rutor i en serie om en social situation, ritade i kod. Niclas:
// "materialet ska innehålla sekvensbilder i 5 olika sekvenser för sociala situationer" och "fina och enkla mallar för
// serien, ex en på 4 bilder och en på 6 bilder", och efter den första analysen: "Glada gubbar och gungan mm känns lite
// barnsligt". Därför har personerna kroppar och kläder i stället för streck, två åldrar (yngre, runt åtta år, och
// äldre, runt tolv) och en vuxen, och ansiktena är neutrala utom där serien kräver en känsla. I den sista rutan kan
// ansiktena vara tomma, så att gruppen bestämmer känslorna.
//
// Scenerna står som data i methods/<slug>/bildserier.json: personerna en gång (ålder, hud, kläder, hår) och varje ruta
// som en lista med delar (bakgrund, saker, figurer och bubblor) i den ordning de ritas. Måtten i en ruta är 800 × 450.
// build-docx.js lägger rutorna i ett serieblad, build/film.mjs i ytan serie, och bygget skriver dem som svg till sajten.
// Ur metodriggens build/serieritning.js (2026-10-04), som riggen delar med sajten (TILL-SAJTEN för Seriesamtal):
// samma kod, men som ES-modul, med Andikas glyfer ur src/data/typsnitt/glyfer-andika.json (samma som riggens
// design/typsnitt/andika/glyfer.json, som sagoform.js också läser) och utan lasSerier, eftersom sajten importerar
// scenfilerna i src/data/bildserier/ (src/lib/bildserier-bygge.ts). Glyferna görs om till korta banor i en egen kopia,
// så att sagoform.js får dem som de är. Koden körs bara vid bygget: rutorna blir svg-filer under
// /stodundervisning/<id>/serier/, som sidan visar och Word-filen bäddar in. Rättas en form, rättas den i riggen också.
import glyferAndika from '../data/typsnitt/glyfer-andika.json';

const B = 800, H = 450;
const K = '#2E2A27';
const HUD = { ljus: '#F5D3B5', mellan: '#E2AF86', varm: '#C98E60', mork: '#A56E48', djup: '#80533A' };
const TYPSNITT = "Andika, 'Segoe UI', Arial, sans-serif";
// Pennan: rutor med stil: streck ritas som du ritar dem medan eleven berättar, med streckgubbar i en blå penna.
const PENNA = '#2B4C8C';
let STRECK = false;
const n = (v) => Math.round(v);
// Bokstäverna i Andika som banor (design/typsnitt/andika/glyfer.json), gjorda om till korta relativa banor som i
// build/film.mjs, så att en ruta med text håller sig liten och ser likadan ut i Word, Google Dokument och på sajten.
const GLYFER = { ...glyferAndika, glyfer: { ...glyferAndika.glyfer } };
function kompakt(d) {
  const t2 = d.match(/[MLHVQCZ]|-?\d*\.?\d+/g) ?? [];
  const kom = (c, tal) => c + tal.map((v, j) => (j === 0 || v < 0 ? String(v) : ` ${v}`)).join('');
  let ut = '', x = 0, y = 0, sx = 0, sy = 0, i = 0, sista = '';
  while (i < t2.length) {
    let c = t2[i];
    if (/^[MLHVQCZ]$/.test(c)) i++;
    else c = sista === 'M' ? 'L' : sista;
    sista = c;
    const tal = () => Math.round(Number(t2[i++]));
    if (c === 'M' || c === 'L') { const nx = tal(), ny = tal(); ut += kom(c.toLowerCase(), [nx - x, ny - y]); x = nx; y = ny; if (c === 'M') { sx = x; sy = y; } }
    else if (c === 'H') { const nx = tal(); ut += kom('h', [nx - x]); x = nx; }
    else if (c === 'V') { const ny = tal(); ut += kom('v', [ny - y]); y = ny; }
    else if (c === 'Q') { const ax = tal(), ay = tal(), nx = tal(), ny = tal(); ut += kom('q', [ax - x, ay - y, nx - x, ny - y]); x = nx; y = ny; }
    else if (c === 'C') { const ax = tal(), ay = tal(), bx = tal(), by = tal(), nx = tal(), ny = tal(); ut += kom('c', [ax - x, ay - y, bx - x, by - y, nx - x, ny - y]); x = nx; y = ny; }
    else if (c === 'Z') { ut += 'z'; x = sx; y = sy; }
  }
  return ut;
}
for (const [c, g] of Object.entries(GLYFER.glyfer)) if (g.d) GLYFER.glyfer[c] = { ...g, d: kompakt(g.d) };
const textBredd = (text, storlek) => [...String(text)].reduce((s, c) => s + (GLYFER.glyfer[c]?.adv ?? 500), 0) * (storlek / GLYFER.enheter);
// En rad text som en bana, med baslinjen på y. ankare: mitt (standard), start eller slut.
function textBana(text, x, y, storlek, o = {}) {
  const k = storlek / GLYFER.enheter, bredd = textBredd(text, storlek);
  const x0 = o.ankare === 'start' ? x : o.ankare === 'slut' ? x - bredd : x - bredd / 2;
  let d = '', u = 0;
  for (const c of String(text)) { const g = GLYFER.glyfer[c]; if (g?.d) d += `M${u} 0${g.d}`; u += g?.adv ?? 500; }
  return d ? `<path d="${d}" transform="translate(${x0.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(4)} ${(-k).toFixed(4)})" fill="${o.farg ?? '#2E2A27'}"/>` : '';
}
// Texten delad i rader som ryms i bredden, ord för ord.
function rader(text, storlek, bredd) {
  const ut = [];
  for (const ord of String(text).split(' ')) {
    const sista = ut[ut.length - 1];
    if (sista && textBredd(`${sista} ${ord}`, storlek) <= bredd) ut[ut.length - 1] = `${sista} ${ord}`; else ut.push(ord);
  }
  return ut;
}
const p2 = (p) => `${n(p[0])} ${n(p[1])}`;
const poly = (pts, fyll, o = {}) => `<path d="M${pts.map(p2).join('L')}Z" fill="${fyll}"${o.kant === false ? '' : ` stroke="${o.kant ?? K}" stroke-width="${o.sw ?? 3}" stroke-linejoin="round"`}/>`;
const rekt = (x, y, b, h, fyll, o = {}) => `<rect x="${n(x)}" y="${n(y)}" width="${n(b)}" height="${n(h)}"${o.rx ? ` rx="${o.rx}"` : ''} fill="${fyll}"${o.kant === false ? '' : ` stroke="${o.kant ?? K}" stroke-width="${o.sw ?? 3}"`}/>`;
const linje = (a, b2, o = {}) => `<path d="M${p2(a)}L${p2(b2)}" stroke="${o.farg ?? K}" stroke-width="${o.sw ?? 3}" stroke-linecap="round" fill="none"/>`;
const ring = (x, y, rr, fyll, o = {}) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rr)}" fill="${fyll}"${o.kant === false ? '' : ` stroke="${o.kant ?? K}" stroke-width="${o.sw ?? 3}"`}/>`;
const ellips = (x, y, rx, ry, fyll, o = {}) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fyll}"${o.kant === false ? '' : ` stroke="${o.kant ?? K}" stroke-width="${o.sw ?? 3}"`}/>`;
const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// En färg ljusare (t > 0) eller mörkare (t < 0), för skuggor och kanter på kläder.
function ton(hex, t) {
  const v = parseInt(hex.slice(1), 16), c = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  const u = c.map((x) => Math.round(t >= 0 ? x + (255 - x) * t : x * (1 + t)));
  return `#${u.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

// ---------------------------------------------------------------- leder
// Leden mellan två delar (armbåge, knä) ur början, målet och delarnas längd. Av de två möjliga lederna väljs den som
// valj säger: den lägre för en arm, den som pekar framåt för ett ben.
function led(a, mal, l1, l2, valj) {
  const dx = mal[0] - a[0], dy = mal[1] - a[1];
  let d = Math.hypot(dx, dy) || 0.01;
  const max = l1 + l2 - 0.5;
  const t = d > max ? [a[0] + (dx / d) * max, a[1] + (dy / d) * max] : mal;
  d = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.5), max);
  const v = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const bas = Math.atan2(t[1] - a[1], t[0] - a[0]);
  const c = [bas + v, bas - v].map((w) => [a[0] + Math.cos(w) * l1, a[1] + Math.sin(w) * l1]);
  return { mitt: valj(c[0], c[1]) ? c[0] : c[1], slut: t };
}
// En arm eller ett ben med kontur: först en mörk bred linje, sedan färgen ovanpå. hud är den del närmast handen som
// inte har ärm (kortärmat).
function lem(pts, bredd, farg) {
  const d = `M${pts.map(p2).join('L')}`;
  return `<path d="${d}" fill="none" stroke="${K}" stroke-width="${bredd + 5}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${farg}" stroke-width="${bredd}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const vrid = (p, c, grader) => {
  const v = (grader * Math.PI) / 180, dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(v) - dy * Math.sin(v), c[1] + dx * Math.sin(v) + dy * Math.cos(v)];
};

// ---------------------------------------------------------------- figuren
// Måtten för en yngre elev (runt åtta år), en äldre (runt tolv) och en vuxen. Huvudet är mindre i förhållande till
// kroppen ju äldre personen är: 4,6, 5,6 och 6,4 huvuden.
const MATT = {
  yngre: { R: 24, hals: 6, kropp: 68, ben: 92, axlar: 50, hoft: 42, arm: 72, armB: 12, benB: 15 },
  aldre: { R: 23, hals: 8, kropp: 82, ben: 116, axlar: 58, hoft: 46, arm: 88, armB: 12.5, benB: 16 },
  vuxen: { R: 23, hals: 9, kropp: 98, ben: 136, axlar: 64, hoft: 52, arm: 100, armB: 13, benB: 17 },
};

// Ansiktet: ögon, ögonbryn, näsa och mun kring huvudets mitt. tom ritar inget, så att gruppen bestämmer känslan.
function ansikte(typ, R, vand, blick) {
  if (typ === 'tom') return vand ? `<path d="M${n(vand * 5.5 * (R / 24) + vand * 9 * (R / 24))} ${n(3 * (R / 24))}q${n(vand * 3 * (R / 24))} ${n(3 * (R / 24))} 0 ${n(5 * (R / 24))}" fill="none" stroke="${K}" stroke-width="${2 * (R / 24)}" stroke-linecap="round" opacity=".55"/>` : '';
  const s = R / 24, dx = vand * 5.5 * s, by = blick === 'ner' ? 3 * s : blick === 'upp' ? -3 * s : 0;
  const bx = blick === 'hoger' ? 2.5 * s : blick === 'vanster' ? -2.5 * s : 0;
  let ut = '';
  const ogon = [-8.5, 8.5].map((x) => [dx + x * s * (vand ? 0.92 : 1), -1 * s + by]);
  if (typ === 'skrattar') {
    for (const [x, y] of ogon) ut += `<path d="M${n(x - 4 * s)} ${n(y + 1)}Q${n(x)} ${n(y - 5 * s)} ${n(x + 4 * s)} ${n(y + 1)}" fill="none" stroke="${K}" stroke-width="${2.6 * s}" stroke-linecap="round"/>`;
    ut += `<path d="M${n(dx - 8 * s)} ${n(9 * s)}Q${n(dx)} ${n(10 * s)} ${n(dx + 8 * s)} ${n(9 * s)}Q${n(dx + 6 * s)} ${n(19 * s)} ${n(dx)} ${n(19 * s)}Q${n(dx - 6 * s)} ${n(19 * s)} ${n(dx - 8 * s)} ${n(9 * s)}Z" fill="#7B3B33" stroke="${K}" stroke-width="${2.2 * s}" stroke-linejoin="round"/>`;
  } else {
    for (const [x, y] of ogon) ut += `<ellipse cx="${n(x + bx)}" cy="${n(y)}" rx="${(2.8 * s).toFixed(1)}" ry="${(3.5 * s).toFixed(1)}" fill="${K}"/><circle cx="${(x + bx + 0.9 * s).toFixed(1)}" cy="${(y - 1.2 * s).toFixed(1)}" r="${(0.9 * s).toFixed(1)}" fill="#fff"/>`;
  }
  // Ögonbrynen: raka i det neutrala ansiktet, höjda i det förvånade, sänkta inåt i det allvarliga.
  const lut = { forvanad: [0, -3], allvarlig: [2.5, 0], ledsen: [-2, 1.5], skrattar: [0, -1] }[typ] ?? [0, 0];
  for (const [i, [x, y]] of ogon.entries()) {
    const sida = i ? 1 : -1, yy = y - 9 * s + lut[1] * s;
    ut += `<path d="M${n(x - 4.5 * s)} ${n(yy + sida * lut[0] * s * -0.5)}L${n(x + 4.5 * s)} ${n(yy + sida * lut[0] * s * 0.5)}" stroke="${K}" stroke-width="${2.4 * s}" stroke-linecap="round"/>`;
  }
  if (vand) ut += `<path d="M${n(dx + vand * 9 * s)} ${n(3 * s)}q${n(vand * 3 * s)} ${n(3 * s)} 0 ${n(5 * s)}" fill="none" stroke="${K}" stroke-width="${2 * s}" stroke-linecap="round" opacity=".55"/>`;
  if (typ === 'forvanad') ut += `<ellipse cx="${n(dx)}" cy="${n(13 * s)}" rx="${(3 * s).toFixed(1)}" ry="${(3.8 * s).toFixed(1)}" fill="${K}"/>`;
  else if (typ === 'le') ut += `<path d="M${n(dx - 6 * s)} ${n(11 * s)}Q${n(dx)} ${n(15 * s)} ${n(dx + 6 * s)} ${n(11 * s)}" fill="none" stroke="${K}" stroke-width="${2.4 * s}" stroke-linecap="round"/>`;
  else if (typ === 'ledsen') ut += `<path d="M${n(dx - 6 * s)} ${n(15 * s)}Q${n(dx)} ${n(11 * s)} ${n(dx + 6 * s)} ${n(15 * s)}" fill="none" stroke="${K}" stroke-width="${2.4 * s}" stroke-linecap="round"/>`;
  else if (typ !== 'skrattar') ut += `<path d="M${n(dx - 5.5 * s)} ${n(13 * s)}L${n(dx + 5.5 * s)} ${n(13 * s)}" stroke="${K}" stroke-width="${2.4 * s}" stroke-linecap="round"/>`;
  return ut;
}

// Håret i två lager: det som syns bakom huvudet (långt hår, hästsvans, knut) och det som ligger över hjässan.
function har(stil, farg, R, vand) {
  const s = R / 24, v = vand || 0, m = ton(farg, -0.25);
  const kant = `stroke="${K}" stroke-width="${2.6 * s}" stroke-linejoin="round"`;
  const bak = [], fram = [];
  // Hjässan: en kalott som slutar vid öronen, med luggen åt det håll personen tittar.
  const kalott = (djup = 0) => `<path d="M${n(-R - 1 - v * 2 * s)} ${n(2 * s + djup)}C${n(-R - 4)} ${n(-R * 1.5)} ${n(R + 4)} ${n(-R * 1.5)} ${n(R + 1 - v * 2 * s)} ${n(2 * s + djup)}C${n(R * 0.7)} ${n(-R * 0.45)} ${n(R * 0.1 + v * 8 * s)} ${n(-R * 0.62)} ${n(-R * 0.25 + v * 6 * s)} ${n(-R * 0.5)}C${n(-R * 0.55)} ${n(-R * 0.45)} ${n(-R * 0.85)} ${n(-R * 0.3)} ${n(-R - 1 - v * 2 * s)} ${n(2 * s + djup)}Z" fill="${farg}" ${kant}/>`;
  if (stil === 'kort') fram.push(kalott(-6 * s));
  else if (stil === 'sidbena') {
    fram.push(`<path d="M${n(-R - 1)} ${n(-2 * s)}C${n(-R - 5)} ${n(-R * 1.52)} ${n(R + 5)} ${n(-R * 1.55)} ${n(R + 1)} ${n(-2 * s)}C${n(R * 0.85)} ${n(-R * 0.6)} ${n(R * 0.3)} ${n(-R * 0.9)} ${n(-R * 0.2 * v - R * 0.3)} ${n(-R * 0.72)}C${n(-R * 0.7)} ${n(-R * 0.55)} ${n(-R * 0.95)} ${n(-R * 0.3)} ${n(-R - 1)} ${n(-2 * s)}Z" fill="${farg}" ${kant}/>`);
    fram.push(`<path d="M${n(-R * 0.3 - v * R * 0.2)} ${n(-R * 0.75)}Q${n(R * 0.2)} ${n(-R * 1.05)} ${n(R * 0.75)} ${n(-R * 0.5)}" fill="none" stroke="${m}" stroke-width="${2 * s}" stroke-linecap="round"/>`);
  } else if (stil === 'lockigt') {
    let d = '';
    const lock = 9;
    for (let i = 0; i <= lock; i++) {
      const w = Math.PI + (i / lock) * Math.PI;
      d += ring(Math.cos(w) * R * 0.98, Math.sin(w) * R * 0.98 - 2 * s, R * 0.34, farg, { sw: 2.6 * s });
    }
    fram.push(`<g>${d}${ellips(0, -R * 0.42, R * 0.92, R * 0.6, farg, { kant: false })}</g>`);
  } else if (stil === 'hastsvans' || stil === 'knut' || stil === 'langt' || stil === 'flator' || stil === 'bob') {
    const baksida = -(v || 1);
    if (stil === 'hastsvans') bak.push(`<path d="M${n(baksida * R * 0.7)} ${n(-R * 0.7)}C${n(baksida * R * 1.7)} ${n(-R * 0.6)} ${n(baksida * R * 1.75)} ${n(R * 0.6)} ${n(baksida * R * 1.25)} ${n(R * 1.15)}C${n(baksida * R * 1.25)} ${n(R * 0.45)} ${n(baksida * R * 1.05)} ${n(-R * 0.1)} ${n(baksida * R * 0.75)} ${n(-R * 0.2)}Z" fill="${farg}" ${kant}/>`
      + ring(baksida * R * 0.8, -R * 0.62, 4 * s, '#D2544B', { sw: 2 * s }));
    if (stil === 'knut') bak.push(ring(baksida * R * 0.35, -R * 1.02, R * 0.42, farg, { sw: 2.6 * s }));
    if (stil === 'langt') bak.push(`<path d="M${n(-R * 1.05)} ${n(-R * 0.2)}C${n(-R * 1.25)} ${n(R * 0.9)} ${n(-R * 1.1)} ${n(R * 1.6)} ${n(-R * 0.75)} ${n(R * 1.75)}L${n(R * 0.75)} ${n(R * 1.75)}C${n(R * 1.1)} ${n(R * 1.6)} ${n(R * 1.25)} ${n(R * 0.9)} ${n(R * 1.05)} ${n(-R * 0.2)}Z" fill="${farg}" ${kant}/>`);
    if (stil === 'bob') bak.push(`<path d="M${n(-R * 1.08)} ${n(-R * 0.2)}C${n(-R * 1.2)} ${n(R * 0.5)} ${n(-R * 1.1)} ${n(R * 0.85)} ${n(-R * 0.8)} ${n(R * 0.9)}L${n(R * 0.8)} ${n(R * 0.9)}C${n(R * 1.1)} ${n(R * 0.85)} ${n(R * 1.2)} ${n(R * 0.5)} ${n(R * 1.08)} ${n(-R * 0.2)}Z" fill="${farg}" ${kant}/>`);
    if (stil === 'flator') for (const sida of [-1, 1]) bak.push(`<path d="M${n(sida * R * 0.85)} ${n(-R * 0.1)}C${n(sida * R * 1.15)} ${n(R * 0.5)} ${n(sida * R * 1.1)} ${n(R * 1.1)} ${n(sida * R * 1.0)} ${n(R * 1.45)}" fill="none" stroke="${K}" stroke-width="${11 * s}" stroke-linecap="round"/><path d="M${n(sida * R * 0.85)} ${n(-R * 0.1)}C${n(sida * R * 1.15)} ${n(R * 0.5)} ${n(sida * R * 1.1)} ${n(R * 1.1)} ${n(sida * R * 1.0)} ${n(R * 1.45)}" fill="none" stroke="${farg}" stroke-width="${6 * s}" stroke-linecap="round"/>`);
    fram.push(kalott(stil === 'langt' || stil === 'bob' ? 6 * s : -2 * s));
    fram.push(`<path d="M${n(-R * 0.15 + v * 4 * s)} ${n(-R * 0.98)}Q${n(-R * 0.1 + v * 2 * s)} ${n(-R * 0.75)} ${n(-R * 0.3 + v * 6 * s)} ${n(-R * 0.55)}" fill="none" stroke="${m}" stroke-width="${1.8 * s}" stroke-linecap="round"/>`);
  } else if (stil === 'kortlockigt') {
    let d = '';
    for (let i = 0; i <= 7; i++) { const w = Math.PI * 1.05 + (i / 7) * Math.PI * 0.9; d += ring(Math.cos(w) * R * 0.86, Math.sin(w) * R * 0.86 - 2 * s, R * 0.27, farg, { sw: 2.4 * s }); }
    fram.push(`<g>${d}${ellips(0, -R * 0.45, R * 0.8, R * 0.42, farg, { kant: false })}</g>`);
  } else if (stil === 'snagg') fram.push(kalott(-11 * s));
  return { bak: bak.join(''), fram: fram.join('') };
}

// En figur som står, går eller sitter. Läget (x, y) är mitt mellan fötterna på golvet, eller mitt på sätet när
// personen sitter (sitter: true). vand är kroppens riktning: 1 (åt höger), -1 (åt vänster) eller 0 (mot betraktaren),
// och ser är huvudets, när personen vrider på huvudet. Händerna är lägen [x, y] eller namn på vanliga lägen (ner, mage,
// hoft, fram, peka, vinka, mobil, kamera, bricka, bord, kind, ut, fram-upp). haller ritar en sak i handen. En person
// som sitter bakom ett bord ritas två gånger: först utan armar (utan: armar), sedan bordet och sist bara armarna
// (bara: armar), så att händerna ligger på bordet.
function figur(p0, d0) {
  // En person i bakgrunden ritas grå och utan ansikte, så att seriens personer syns först.
  const p = d0.bakgrund ? { ...p0, troja: '#C3C9D0', byxor: '#9AA3AD', hud: '#E6E1DC', har: { ...(p0.har ?? {}), farg: '#A7AEB6' }, ryggsack: p0.ryggsack ? '#B5BCC4' : p0.ryggsack } : p0;
  const d = d0.bakgrund ? { ...d0, ansikte: 'tom', troja: undefined } : d0;
  const f = figurRita(p, d);
  // Namnskylten: namnet i Andika på en vit skylt under fötterna, eller där namnXY säger.
  // Varje person med namn får sin skylt, om inte scenen säger namn: false.
  const namn = d.namn === false || d.bara ? null : (typeof d.namn === 'string' ? d.namn : p.namn ?? null);
  if (namn && !(d.stil === 'streck' || STRECK)) {
    const [nx, ny] = d.namnXY ?? [d.x, Math.min(d.y + 30, H - 14)];
    const bb = textBredd(namn, 26) + 22;
    f.skylt = rekt(nx - bb / 2, ny - 21, bb, 30, '#FFFFFF', { rx: 9, sw: 2 }) + textBana(namn, nx, ny + 1, 26);
  }
  return f;
}
function figurRita(p, d) {
  const M = MATT[p.alder] ?? MATT.yngre, R = M.R, v = d.vand ?? 0, sv = d.ser ?? v;
  const hud = HUD[p.hud] ?? p.hud ?? HUD.ljus;
  const troja = d.troja ?? p.troja ?? '#7A8CA6', byxor = d.byxor ?? p.byxor ?? '#3D4A63', sko = p.skor ?? '#3B3632';
  const klader = d.klader ?? p.klader;
  const x = d.x, y = d.y;
  const sitter = !!d.sitter;
  const hoft = sitter ? [x, y - 6] : [x, y - M.ben - 6];
  const axel = [hoft[0], hoft[1] - M.kropp];
  const huvud = [axel[0] + sv * 2, axel[1] - M.hals - R * 0.92];
  const lut = d.lutning ?? 0;
  const ut = [];
  // Benen. Den som sitter från sidan har låren framåt och smalbenen ned, och den som sitter framifrån har knäna strax
  // under höften och smalbenen ned mot betraktaren. Går (ga) har ett ben fram och ett bak, och snubblar har det bakre
  // benet högt bak.
  const benX = M.hoft * 0.26, halvBen = M.ben / 2;
  const ben = [-1, 1].map((sida) => {
    const start = [hoft[0] + sida * benX, hoft[1]];
    if (sitter) {
      const knä = v ? [start[0] + v * halvBen, start[1] + 2] : [start[0] + sida * 3, start[1] + 10];
      const fot = [knä[0] + (v ? v * 3 : sida * 3), Math.min(d.golv ?? 1e9, knä[1] + halvBen) - 4];
      return { sida, pts: [start, knä, fot] };
    }
    let fot;
    if (d.ben === 'ga') fot = [start[0] + (sida === (v || 1) ? 1 : -1) * M.ben * 0.3 * (v || 1) * (v ? 1 : 0), y - 4];
    else if (d.ben === 'snubblar') fot = sida === -(v || 1) ? [start[0] - v * M.ben * 0.75, hoft[1] - M.ben * 0.08] : [start[0] + v * M.ben * 0.35, y - 4];
    else fot = [start[0] + sida * 5, y - 4];
    const knä = led(start, fot, halvBen, halvBen, (a, b2) => (v ? (a[0] - b2[0]) * v > 0 : a[1] < b2[1]));
    return { sida, pts: [start, knä.mitt, knä.slut] };
  });
  const benRit = (b2) => {
    const f = b2.pts[2];
    const skoX = f[0] + (v ? v * 7 : b2.sida * 3);
    return lem(b2.pts, M.benB, byxor) + `<ellipse cx="${n(skoX)}" cy="${n(f[1] + 3)}" rx="${v ? 13 : 9}" ry="7" fill="${sko}" stroke="${K}" stroke-width="2.5"/>`;
  };
  // Det bortre benet och den bortre armen ritas före kroppen, det närmare efter.
  const nara = v || 1;
  const forstBort = (a, b2) => (a.sida === nara ? 1 : 0) - (b2.sida === nara ? 1 : 0);

  const S = M.axlar / 2, Hh = M.hoft / 2;
  const axelLed = (sida) => [axel[0] + sida * (S - M.armB * 0.45), axel[1] + M.armB * 0.6];
  // Händernas vanliga lägen. Lägen som ligger mot kroppen (mage, höft, kind, bricka, mobil) har armbågen utåt, och
  // armar som når framåt har den nedåt.
  const UTAT = new Set(['mage', 'hoft', 'kind', 'mobil', 'kamera']);
  const handLage = (namn, sida) => {
    if (Array.isArray(namn)) return lut ? vrid(namn, hoft, -lut) : namn;
    const a = axelLed(sida), L = M.arm, mitt = axel[0], riktning = v || sida;
    switch (namn) {
      case 'mage': return [mitt + sida * 3 + v * 7, axel[1] + M.kropp * 0.6];
      case 'hoft': return [mitt + sida * (S + 8), axel[1] + M.kropp * 0.82];
      case 'fram': return [a[0] + riktning * L * 0.6, a[1] + L * 0.62];
      case 'peka': return [a[0] + riktning * L * 0.95, a[1] + L * 0.2];
      case 'peka-ner': return [a[0] + riktning * L * 0.8, a[1] + L * 0.55];
      case 'vinka': return [a[0] + sida * L * 0.42, a[1] - L * 0.7];
      case 'mobil': return [mitt + v * L * 0.38 + sida * (v ? 4 : 7), axel[1] + M.kropp * 0.4];
      case 'kamera': return [mitt + v * L * 0.6 + sida * 6, huvud[1] + R * 0.3];
      case 'bricka': return [mitt + v * L * 0.3 + sida * (v ? 12 : S + 6), axel[1] + M.kropp * 0.9];
      case 'bord': return [a[0] + riktning * L * 0.72, d.bordY ?? a[1] + L * 0.62];
      case 'kind': return [huvud[0] + sida * R * 0.6, huvud[1] + R * 0.8];
      case 'ut': return [a[0] + sida * L * 0.78, a[1] + L * 0.32];
      case 'kna': return v ? [hoft[0] + v * M.ben * 0.3 + sida * 3, hoft[1] - 8] : [mitt + sida * (S - 4), hoft[1] + 4];
      case 'fram-upp': return [a[0] + riktning * L * 0.82 + sida * 6, a[1] - L * 0.1];
      default: return [a[0] + sida * 6, a[1] + L * 0.95];
    }
  };
  const hander = d.hander ?? {};
  const armar = [-1, 1].map((sida) => {
    const namn = hander[sida === -1 ? 'v' : 'h'] ?? 'ner';
    const a = axelLed(sida), mal = handLage(namn, sida), l = M.arm / 2;
    const utat = UTAT.has(namn);
    // Lägre armbåge först, och utåt när båda är lika låga.
    const arm = led(a, mal, l, l, (c1, c2) => (utat ? (c1[0] - c2[0]) * sida > 0 : (c1[1] - c2[1]) + (c1[0] - c2[0]) * sida * 0.5 > 0));
    return { sida, pts: [a, arm.mitt, arm.slut] };
  });
  const armRit = (arm) => {
    let s2 = '';
    if (d.kortarmad ?? p.kortarmad) {
      const [a, m] = arm.pts, mitt = [a[0] + (m[0] - a[0]) * 0.6, a[1] + (m[1] - a[1]) * 0.6];
      s2 += lem(arm.pts, M.armB - 1.5, hud) + lem([a, mitt], M.armB + 1, troja);
    } else s2 += lem(arm.pts, M.armB, troja);
    const h = arm.pts[2], m = arm.pts[1];
    if (d.pekar === (arm.sida === -1 ? 'v' : 'h')) {
      const l = Math.hypot(h[0] - m[0], h[1] - m[1]) || 1, f = [h[0] + ((h[0] - m[0]) / l) * 13, h[1] + ((h[1] - m[1]) / l) * 13];
      s2 += lem([h, f], 4.5, hud);
    }
    return s2 + ring(h[0], h[1], M.armB * 0.62, hud, { sw: 2.5 });
  };
  const armOrdning = [...armar].sort(forstBort);
  if (STRECK || d.stil === 'streck') {
    // En streckgubbe som du ritar medan eleven berättar: huvudet, kroppen, armarna och benen som streck i pennans färg,
    // ansiktet som två prickar och ett streck, och håret som några streck, med hästsvans och flätor för den som har dem.
    const sw = 4.5, drag = (pts) => `<path d="M${pts.map(p2).join('L')}" fill="none" stroke="${PENNA}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const hals = [axel[0], axel[1] - M.hals];
    let s2 = [...ben].map((b2) => drag([hoft, b2.pts[1], b2.pts[2]])).join('') + drag([hals, hoft]);
    s2 += armar.map((arm) => drag([[axel[0], axel[1] + 6], arm.pts[1], arm.pts[2]])).join('');
    const [hx, hy] = huvud, stil = d.har ?? p.har?.stil ?? 'kort';
    s2 += `<circle cx="${n(hx)}" cy="${n(hy)}" r="${n(R)}" fill="#fff" stroke="${PENNA}" stroke-width="${sw}"/>`;
    if (stil === 'hastsvans') s2 += drag([[hx - (sv || 1) * R * 0.8, hy - R * 0.55], [hx - (sv || 1) * R * 1.45, hy - R * 0.2], [hx - (sv || 1) * R * 1.3, hy + R * 0.5]]);
    if (stil === 'flator' || stil === 'langt') for (const sida of [-1, 1]) s2 += drag([[hx + sida * R * 0.9, hy - R * 0.3], [hx + sida * R * 1.1, hy + R * 0.6], [hx + sida * R * 1.0, hy + R * 1.2]]);
    if (stil === 'lockigt' || stil === 'kortlockigt') for (const k of [-0.75, -0.25, 0.25, 0.75]) s2 += `<path d="M${n(hx + k * R - R * 0.22)} ${n(hy - R * 0.9 + Math.abs(k) * R * 0.3)}a${n(R * 0.22)} ${n(R * 0.22)} 0 1 1 ${n(R * 0.44)} 0" fill="none" stroke="${PENNA}" stroke-width="${sw}" stroke-linecap="round"/>`;
    else for (const k of [-0.5, -0.1, 0.3]) s2 += drag([[hx + k * R, hy - R * 0.98], [hx + k * R + R * 0.2, hy - R * 1.32]]);
    const ans = d.ansikte ?? 'neutral';
    if (ans !== 'tom') {
      const dx = sv * R * 0.25;
      s2 += [-0.35, 0.35].map((o) => `<circle cx="${n(hx + dx + o * R)}" cy="${n(hy - R * 0.1)}" r="3.2" fill="${PENNA}"/>`).join('');
      s2 += ans === 'glad' ? `<path d="M${n(hx + dx - R * 0.3)} ${n(hy + R * 0.35)}Q${n(hx + dx)} ${n(hy + R * 0.62)} ${n(hx + dx + R * 0.3)} ${n(hy + R * 0.35)}" fill="none" stroke="${PENNA}" stroke-width="${sw}" stroke-linecap="round"/>`
        : ans === 'ledsen' ? `<path d="M${n(hx + dx - R * 0.3)} ${n(hy + R * 0.55)}Q${n(hx + dx)} ${n(hy + R * 0.3)} ${n(hx + dx + R * 0.3)} ${n(hy + R * 0.55)}" fill="none" stroke="${PENNA}" stroke-width="${sw}" stroke-linecap="round"/>`
        : ans === 'arg'
        ? drag([[hx + dx - R * 0.3, hy + R * 0.48], [hx + dx, hy + R * 0.38], [hx + dx + R * 0.3, hy + R * 0.48]]) + drag([[hx + dx - R * 0.55, hy - R * 0.5], [hx + dx - R * 0.15, hy - R * 0.32]]) + drag([[hx + dx + R * 0.55, hy - R * 0.5], [hx + dx + R * 0.15, hy - R * 0.32]])
        : drag([[hx + dx - R * 0.25, hy + R * 0.42], [hx + dx + R * 0.25, hy + R * 0.42]]);
    }
    s2 += [].concat(d.haller ?? []).map((sak) => { const hv = armar[0].pts[2], hh = armar[1].pts[2]; const h = sak.hand === 'v' ? hv : sak.hand === 'h' ? hh : [(hv[0] + hh[0]) / 2, (hv[1] + hh[1]) / 2]; return SAKER[sak.typ]({ x: h[0] + (sak.dx ?? 0), y: h[1] + (sak.dy ?? 0), ...sak, vand: v }); }).join('');
    if (d.namn) s2 += textBana(d.namn === true ? (p.namn ?? '') : d.namn, x, y + 34, 26, { farg: PENNA });
    const ank = { mun: [hx + sv * 6, hy + R * 0.5], huvud, topp: [hx, hy - R * 1.35], R };
    return { svg: s2, ...ank };
  }
  const sakerIHanden = () => [].concat(d.haller ?? []).map((sak) => {
    const hv = armar[0].pts[2], hh = armar[1].pts[2];
    const handen = sak.hand === 'v' ? hv : sak.hand === 'h' ? hh : [(hv[0] + hh[0]) / 2, (hv[1] + hh[1]) / 2];
    return SAKER[sak.typ]({ x: handen[0] + (sak.dx ?? 0), y: handen[1] + (sak.dy ?? 0), ...sak, vand: sak.vand ?? v });
  }).join('');
  const lutad = (s2) => (lut ? `<g transform="rotate(${lut} ${n(hoft[0])} ${n(hoft[1])})">${s2}</g>` : s2);
  // Bubblornas spetsar pekar på munnen och huvudet, också när personen lutar.
  const ankare = { mun: vrid([huvud[0] + sv * 6, huvud[1] + R * 0.55], hoft, lut), huvud: vrid(huvud, hoft, lut), topp: vrid([huvud[0], huvud[1] - R * 1.05], hoft, lut), R };
  if (d.bara === 'armar') return { svg: lutad(armOrdning.map(armRit).join('') + sakerIHanden()), ...ankare };

  const kropp = [];
  const rygg = p.ryggsack ?? d.ryggsack, ryggFarg = rygg === true ? '#5A6B7F' : rygg;
  if (rygg) {
    const bs = -(v || 1);
    kropp.push(rekt(bs > 0 ? axel[0] + S * 0.35 : axel[0] - S * 1.25, axel[1] + 6, S * 0.9, M.kropp * 0.76, ryggFarg, { rx: 8 }));
  }
  if (klader === 'luvtroja') kropp.push(`<path d="M${n(axel[0] - S * 0.62)} ${n(axel[1] + 4)}Q${n(axel[0])} ${n(axel[1] - M.hals - R * 0.55)} ${n(axel[0] + S * 0.62)} ${n(axel[1] + 4)}Z" fill="${ton(troja, -0.12)}" stroke="${K}" stroke-width="3" stroke-linejoin="round"/>`);
  if (d.utan !== 'armar') for (const arm of armOrdning.slice(0, v ? 1 : 0)) kropp.push(armRit(arm));
  // Bålen: axlarna rundade och tröjan lite vidare nedtill, med en mörkare kant.
  const bal = [[axel[0] - S, axel[1] + 10], [axel[0] - S + 6, axel[1]], [axel[0] + S - 6, axel[1]], [axel[0] + S, axel[1] + 10], [hoft[0] + Hh + 3, hoft[1] + 4], [hoft[0] - Hh - 3, hoft[1] + 4]];
  kropp.push(`<path d="M${p2(bal[0])}Q${n(axel[0] - S)} ${n(axel[1])} ${p2(bal[1])}L${p2(bal[2])}Q${n(axel[0] + S)} ${n(axel[1])} ${p2(bal[3])}L${p2(bal[4])}L${p2(bal[5])}Z" fill="${troja}" stroke="${K}" stroke-width="3" stroke-linejoin="round"/>`);
  kropp.push(`<path d="M${n(hoft[0] - Hh - 1)} ${n(hoft[1] - 3)}L${n(hoft[0] + Hh + 1)} ${n(hoft[1] - 3)}" stroke="${ton(troja, -0.22)}" stroke-width="5"/>`);
  if (klader === 'luvtroja') {
    kropp.push(`<path d="M${n(axel[0] - 5)} ${n(axel[1] + 4)}l-2 22M${n(axel[0] + 5)} ${n(axel[1] + 4)}l2 22" stroke="${ton(troja, 0.6)}" stroke-width="3" stroke-linecap="round"/>`);
    kropp.push(`<path d="M${n(axel[0] - S * 0.55)} ${n(hoft[1] - 8)}L${n(axel[0] - S * 0.42)} ${n(axel[1] + M.kropp * 0.6)}L${n(axel[0] + S * 0.42)} ${n(axel[1] + M.kropp * 0.6)}L${n(axel[0] + S * 0.55)} ${n(hoft[1] - 8)}" fill="none" stroke="${ton(troja, -0.25)}" stroke-width="2.5" stroke-linejoin="round"/>`);
  }
  if (klader === 'lagtroja' && d.nummer) kropp.push(textBana(String(d.nummer), axel[0] + v * 3, axel[1] + M.kropp * 0.4, n(M.kropp * 0.3), { farg: '#fff' }));
  if (klader === 'kofta') kropp.push(`<path d="M${n(axel[0] + v * 4)} ${n(axel[1] + 8)}L${n(hoft[0] + v * 4)} ${n(hoft[1] + 3)}" stroke="${ton(troja, -0.3)}" stroke-width="2.5"/>` + [0.3, 0.5, 0.7].map((t) => ring(axel[0] + v * 4 + 5, axel[1] + M.kropp * t, 2.2, ton(troja, -0.4), { kant: false })).join(''));
  if (rygg) {
    const bs = -(v || 1);
    kropp.push(`<path d="M${n(axel[0] + bs * S * 0.2)} ${n(axel[1] + 2)}Q${n(axel[0] - bs * S * 0.15)} ${n(axel[1] + M.kropp * 0.45)} ${n(axel[0] + bs * S * 0.15)} ${n(axel[1] + M.kropp * 0.76)}" fill="none" stroke="${ton(ryggFarg, -0.25)}" stroke-width="5" stroke-linecap="round"/>`);
  }
  // Halsen och huvudet.
  kropp.push(rekt(axel[0] - R * 0.22 + sv, axel[1] - M.hals - 4, R * 0.44, M.hals + 8, hud, { sw: 2.5 }));
  kropp.push(`<path d="M${n(axel[0] - R * 0.32)} ${n(axel[1] + 1)}Q${n(axel[0])} ${n(axel[1] + 9)} ${n(axel[0] + R * 0.32)} ${n(axel[1] + 1)}" fill="${hud}" stroke="${K}" stroke-width="2.5"/>`);
  const harDelar = har(d.har ?? p.har?.stil ?? 'kort', p.har?.farg ?? '#4A3426', R, sv);
  const huvudet = [harDelar.bak];
  // Örat på den sida som syns: bakom ansiktet när personen tittar åt sidan, båda när hen tittar rakt fram.
  for (const o of sv ? [-sv] : [-1, 1]) huvudet.push(ellips(o * R * 0.93, R * 0.08, R * 0.2, R * 0.27, hud, { sw: 2.5 }));
  huvudet.push(ellips(0, 0, R * 0.98, R * 1.04, hud, { sw: 3 }));
  if (d.glasogon ?? p.glasogon) {
    const dx = sv * 5.5 * (R / 24);
    huvudet.push([-8.5, 8.5].map((ox) => ring(dx + ox * (R / 24), -1, 6.5 * (R / 24), 'none', { sw: 2 })).join('') + linje([dx - 2.5, -2], [dx + 2.5, -2], { sw: 2 }));
  }
  huvudet.push(ansikte(d.ansikte ?? 'neutral', R, sv, d.blick));
  huvudet.push(harDelar.fram);
  const lutHuvud = d.huvudLut ?? (d.blick === 'ner' ? sv * 8 : 0);
  kropp.push(`<g transform="translate(${n(huvud[0])} ${n(huvud[1])})${lutHuvud ? ` rotate(${lutHuvud})` : ''}">${huvudet.join('')}</g>`);
  if (d.utan !== 'armar') { for (const arm of armOrdning.slice(v ? 1 : 0)) kropp.push(armRit(arm)); kropp.push(sakerIHanden()); }

  if (d.utan !== 'ben') for (const b2 of [...ben].sort(forstBort)) ut.push(benRit(b2));
  ut.push(lutad(kropp.join('')));
  return { svg: ut.join(''), ...ankare };
}

// ---------------------------------------------------------------- bubblorna
// Pratbubblan: en rundad ruta med en spets mot munnen. Tankebubblan: ett moln med två små bubblor ned mot huvudet.
// Båda är tomma, så att eleverna skriver eller ritar i dem. En bild i bubblan (bild) är en liten sak ur SAKER.
function pratbubbla(d0, mot) {
  // En replik (text) står i bubblan i Andika, och bubblan får sin storlek efter texten.
  const TS = d0.storlek ?? 30, radH = TS * 1.25;
  const textRader = d0.text ? rader(d0.text, TS, d0.max ?? 300) : [];
  const d = textRader.length ? { ...d0, b: Math.max(d0.b ?? 0, Math.max(...textRader.map((r) => textBredd(r, TS))) + 44), h: Math.max(d0.h ?? 0, textRader.length * radH + 30) } : d0;
  const { x, y, b, h } = d;
  const kant = STRECK ? PENNA : K;
  const [tx, ty] = mot ?? [x, y + h];
  const kantY = ty > y ? y + h / 2 : y - h / 2;
  const bas = Math.max(x - b / 2 + 26, Math.min(x + b / 2 - 26, x + (tx - x) * 0.35));
  const halv = Math.min(16, b * 0.12);
  // Spetsen slutar en bit från munnen, så att den inte går in i ansiktet.
  const dx = tx - bas, dy = ty - kantY, l = Math.hypot(dx, dy) || 1, kort = Math.min(l * 0.82, l - 12);
  const spets = [bas + (dx / l) * kort, kantY + (dy / l) * kort];
  const r2 = Math.min(28, h / 2);
  return `<path d="M${n(bas - halv)} ${n(kantY)}L${p2(spets)}L${n(bas + halv)} ${n(kantY)}" fill="#fff" stroke="${kant}" stroke-width="3" stroke-linejoin="round"/>`
    + rekt(x - b / 2, y - h / 2, b, h, '#fff', { rx: r2, kant })
    + `<path d="M${n(bas - halv + 2)} ${n(kantY)}L${n(bas + halv - 2)} ${n(kantY)}" stroke="#fff" stroke-width="5"/>`
    + (d.bild ? SAKER[d.bild.typ ?? d.bild]({ x, y, storlek: Math.min(b, h) * 0.55, ...(typeof d.bild === 'object' ? d.bild : {}) }) : '')
    + textRader.map((r, i) => textBana(r, x, y - ((textRader.length - 1) * radH) / 2 + i * radH + TS * 0.34, TS, { farg: kant })).join('');
}
function tankebubbla(d, mot) {
  const { x, y, b, h } = d;
  const kant = STRECK ? PENNA : K;
  const antal = Math.max(8, Math.round((b + h) / 34));
  const rx = b / 2 - h * 0.16, ry = h / 2 - h * 0.16, liten = h * 0.2;
  const cirklar = Array.from({ length: antal }, (_, i) => {
    const w = (i / antal) * Math.PI * 2;
    return [x + Math.cos(w) * rx, y + Math.sin(w) * ry, liten * (i % 2 ? 1.05 : 1.25)];
  });
  // Konturen: varje cirkel med en kant på 6, och sedan fyllningarna ovanpå, som täcker den inre halvan av kanterna.
  let moln = cirklar.map(([cx, cy, rr]) => ring(cx, cy, rr, '#fff', { sw: 6, kant })).join('');
  moln += cirklar.map(([cx, cy, rr]) => ring(cx, cy, rr, '#fff', { kant: false })).join('');
  moln += ellips(x, y, rx + 2, ry + 2, '#fff', { kant: false });
  const [tx, ty] = mot ?? [x, y + h];
  const fran = [x + (tx - x) * 0.2, y + (h / 2) * Math.sign(ty - y || 1)];
  for (const [f, rr] of [[0.42, 9], [0.72, 6]]) moln += ring(fran[0] + (tx - fran[0]) * f, fran[1] + (ty - fran[1]) * f, rr, '#fff', { sw: 2.6, kant });
  return moln;
}

// ---------------------------------------------------------------- sakerna
// Sakerna i rummen och i händerna. Varje sak läser sitt läge (x, y) och sina egna fält.
const TRA = '#C89A68', TRA_M = '#9C7046', VIT = '#FFFFFF';
const SAKER = {
  // Väggen och golvet: en färg upp till golvlinjen och en annan under.
  rum: (d) => rekt(0, 0, B, d.golv ?? 360, d.vagg ?? '#EEE7DC', { kant: false }) + rekt(0, d.golv ?? 360, B, H - (d.golv ?? 360), d.golvfarg ?? '#CDB79A', { kant: false })
    + linje([0, d.golv ?? 360], [B, d.golv ?? 360], { sw: 3, farg: ton(d.golvfarg ?? '#CDB79A', -0.35) })
    + (d.list ? rekt(0, (d.golv ?? 360) - 12, B, 12, ton(d.vagg ?? '#EEE7DC', -0.12), { kant: false }) : ''),
  // Ett fönster med utsikt: dag (himmel och ett träd), kvall (mörkblå himmel och en måne) eller morgon.
  fonster: (d) => {
    const { x, y, b, h } = d, ut = d.utsikt ?? 'dag';
    const himmel = ut === 'kvall' ? '#2E3E66' : ut === 'morgon' ? '#CFE3F2' : '#BFE0F5';
    let s = rekt(x, y, b, h, himmel, { sw: 4 });
    if (ut === 'kvall') s += ring(x + b * 0.72, y + h * 0.3, Math.min(b, h) * 0.12, '#F4E3A1', { kant: false }) + ring(x + b * 0.76, y + h * 0.26, Math.min(b, h) * 0.1, himmel, { kant: false }) + [[0.2, 0.25], [0.4, 0.55], [0.3, 0.7]].map(([fx, fy]) => ring(x + b * fx, y + h * fy, 2, '#E8EEF8', { kant: false })).join('');
    else {
      s += `<path d="M${n(x + 2)} ${n(y + h * 0.78)}Q${n(x + b * 0.3)} ${n(y + h * 0.66)} ${n(x + b * 0.6)} ${n(y + h * 0.76)}T${n(x + b - 2)} ${n(y + h * 0.72)}L${n(x + b - 2)} ${n(y + h - 2)}L${n(x + 2)} ${n(y + h - 2)}Z" fill="#9CC48A"/>`;
      if (d.trad !== false) s += rekt(x + b * 0.26 - 4, y + h * 0.5, 8, h * 0.3, '#8A6A4A', { kant: false }) + ring(x + b * 0.26, y + h * 0.42, Math.min(b, h) * 0.16, '#6FA35E', { kant: false });
    }
    s += `<path d="M${n(x + b / 2)} ${n(y)}L${n(x + b / 2)} ${n(y + h)}M${n(x)} ${n(y + h * 0.45)}L${n(x + b)} ${n(y + h * 0.45)}" stroke="#F7F4EE" stroke-width="7"/>` + rekt(x, y, b, h, 'none', { sw: 4 });
    return s + rekt(x - 8, y + h, b + 16, 9, '#F2EEE6', { sw: 2.5 });
  },
  // Ett bord sett lite ovanifrån: skivan som en smal fyrhörning och benen ned till golvet.
  bord: (d) => {
    const { x, y, b } = d, djup = d.djup ?? 26, golv = d.golv ?? 410, farg = d.farg ?? TRA;
    return linje([x - b / 2 + 14, y + 8], [x - b / 2 + 14, golv], { sw: 9, farg: ton(farg, -0.35) }) + linje([x + b / 2 - 14, y + 8], [x + b / 2 - 14, golv], { sw: 9, farg: ton(farg, -0.35) })
      + poly([[x - b / 2 + 18, y - djup], [x + b / 2 - 18, y - djup], [x + b / 2, y], [x - b / 2, y]], ton(farg, 0.18)) + rekt(x - b / 2, y, b, 12, farg, { sw: 3 });
  },
  // Benen på ett bord som står bakom figurerna ritas för sig, så att skivan kan ritas efter dem (bordfram).
  stol: (d) => {
    const { x, y } = d, v = d.vand ?? 1, golv = d.golv ?? 410, farg = d.farg ?? '#6C8EB5';
    return linje([x - v * 22, y], [x - v * 30, y - 80], { sw: 8, farg: ton(farg, -0.3) }) + rekt(x - v * 34 - 6, y - 92, 12, 50, farg, { rx: 5, sw: 2.5 })
      + linje([x - 20, y + 6], [x - 22, golv], { sw: 6, farg: ton(farg, -0.35) }) + linje([x + 20, y + 6], [x + 22, golv], { sw: 6, farg: ton(farg, -0.35) }) + rekt(x - 28, y - 4, 56, 12, farg, { rx: 4, sw: 2.5 });
  },
  // En spelplan med en bana av rutor och precis de pjäser som pjaser säger, liggande på bordet.
  spelplan: (d) => {
    const { x, y } = d, b = d.b ?? 120, djup = d.djup ?? 22;
    let s = poly([[x - b / 2 + 10, y - djup], [x + b / 2 - 10, y - djup], [x + b / 2, y], [x - b / 2, y]], '#F3E3B5', { sw: 2.5 });
    for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6; s += ellips(x - b / 2 + 14 + t * (b - 28), y - djup / 2, 5, 3, ['#D96B5B', '#6FA3D6', '#E8C14E', '#7DB86A'][i % 4], { sw: 1.5 }); }
    for (const [i, farg] of (d.pjaser ?? ['#3C7F5A', '#E2B53A']).entries()) {
      const px = x - b * 0.25 + i * b * 0.38, py = y - djup * 0.45;
      s += `<path d="M${n(px - 6)} ${n(py)}L${n(px - 3)} ${n(py - 15)}L${n(px + 3)} ${n(py - 15)}L${n(px + 6)} ${n(py)}Z" fill="${farg}" stroke="${K}" stroke-width="2"/>` + ring(px, py - 18, 5, farg, { sw: 2 });
    }
    return s;
  },
  // Ett papper på bordet: med teckningen upp (ritat) eller baksidan upp, som en vit fyrhörning.
  papper: (d) => {
    const { x, y } = d, b = d.b ?? 60, djup = d.djup ?? 14, vr = d.vrid ?? 0;
    let s = poly([[x - b / 2 + 6, y - djup], [x + b / 2 + 6, y - djup], [x + b / 2, y], [x - b / 2, y]], d.farg ?? VIT, { sw: 2 });
    if (d.ritat) s += ring(x - b * 0.15, y - djup * 0.55, djup * 0.32, '#E8B83A', { kant: false }) + `<path d="M${n(x)} ${n(y - djup * 0.3)}l${n(b * 0.12)} ${n(-djup * 0.45)}l${n(b * 0.12)} ${n(djup * 0.45)}Z" fill="#D9604F"/>` + linje([x - b * 0.4, y - 3], [x + b * 0.4, y - 3], { sw: 2, farg: '#6FA35E' });
    return vr ? `<g transform="rotate(${vr} ${n(x)} ${n(y)})">${s}</g>` : s;
  },
  // Pappersbitar som ligger kvar efter en lektion: små remsor i några färger.
  bitar: (d) => {
    const { x, y } = d, b = d.b ?? 90;
    const farger = ['#F2C14E', '#8EC3E6', '#F29E8E', '#FFFFFF', '#A9D18E'];
    let s = '';
    for (let i = 0; i < (d.antal ?? 5); i++) { const bx = x - b / 2 + ((i * 37) % b), by = y - 4 - ((i * 7) % 12); s += `<path d="M${n(bx)} ${n(by)}l14 -3l2 6l-14 3Z" fill="${farger[i % farger.length]}" stroke="${K}" stroke-width="1.5"/>`; }
    return s;
  },
  // Papperskorgen, med något som sticker upp (innehall: teckning).
  papperskorg: (d) => {
    const { x } = d, golv = d.golv ?? 410, h = d.h ?? 70, b = d.b ?? 58;
    let s = '';
    if (d.innehall === 'papper') s += `<path d="M${n(x - 16)} ${n(golv - h + 4)}l6 -16l14 4l-4 14Z" fill="#fff" stroke="${K}" stroke-width="2"/><path d="M${n(x + 2)} ${n(golv - h + 4)}l10 -14l12 8l-8 8Z" fill="#F2C14E" stroke="${K}" stroke-width="2"/>`;
    s += poly([[x - b / 2, golv - h], [x + b / 2, golv - h], [x + b / 2 - 8, golv], [x - b / 2 + 8, golv]], d.farg ?? '#7C9A8E');
    return s + linje([x - b / 2 + 2, golv - h + 10], [x + b / 2 - 2, golv - h + 10], { sw: 2, farg: ton(d.farg ?? '#7C9A8E', -0.3) });
  },
  // En rad skåp i korridoren, med ventiler och handtag.
  skap: (d) => {
    const { x, y } = d, antal = d.antal ?? 5, b = d.b ?? 70, h = d.h ?? 250, farg = d.farg ?? '#7FA1BF';
    let s = '';
    for (let i = 0; i < antal; i++) {
      const sx = x + i * b;
      s += rekt(sx, y, b, h, i % 2 ? farg : ton(farg, -0.06), { sw: 3 });
      for (let k = 0; k < 3; k++) s += linje([sx + b * 0.3, y + 18 + k * 8], [sx + b * 0.7, y + 18 + k * 8], { sw: 2.5, farg: ton(farg, -0.35) });
      s += rekt(sx + b - 16, y + h * 0.48, 6, 22, ton(farg, -0.4), { kant: false, rx: 3 });
    }
    return s;
  },
  // En väska på golvet, som någon kan snubbla på.
  vaska: (d) => {
    const { x } = d, golv = d.golv ?? 410, farg = d.farg ?? '#3F6E8C';
    return `<path d="M${n(x - 22)} ${n(golv - 34)}Q${n(x)} ${n(golv - 58)} ${n(x + 22)} ${n(golv - 34)}" fill="none" stroke="${K}" stroke-width="4"/>` + rekt(x - 40, golv - 36, 80, 36, farg, { rx: 10 }) + linje([x - 30, golv - 22], [x + 30, golv - 22], { sw: 2, farg: ton(farg, -0.3) });
  },
  // En mobil i handen. Med blixt syns en blixt, som när någon tar en bild.
  mobil: (d) => {
    const { x, y } = d, s = d.storlek ?? 1, v = d.vand || 1, vr = d.vrid ?? 0;
    let t = rekt(x - 8 * s, y - 15 * s, 16 * s, 30 * s, '#2F3640', { rx: 3, sw: 2 }) + rekt(x - 5.5 * s, y - 12 * s, 11 * s, 22 * s, d.skarm ?? '#8FB8E0', { kant: false, rx: 1 });
    if (d.blixt) for (const w of [-40, -10, 20]) { const a = (w * Math.PI) / 180; t += linje([x + v * 14 * s + Math.cos(a) * v * 8, y - 12 * s + Math.sin(a) * 8], [x + v * 14 * s + Math.cos(a) * v * 22, y - 12 * s + Math.sin(a) * 22], { sw: 3, farg: '#E8B83A' }); }
    return vr ? `<g transform="rotate(${vr} ${n(x)} ${n(y)})">${t}</g>` : t;
  },
  // En bricka med tallrik och glas, som någon bär med båda händerna.
  bricka: (d) => {
    const { x, y } = d, b = d.b ?? 74;
    return poly([[x - b / 2, y - 4], [x + b / 2, y - 4], [x + b / 2 - 6, y + 6], [x - b / 2 + 6, y + 6]], '#C6CED6', { sw: 2.5 }) + ellips(x - 8, y - 9, 18, 6, '#FFFFFF', { sw: 2 }) + ellips(x - 8, y - 11, 10, 3, '#E7A65A', { kant: false }) + rekt(x + 18, y - 24, 10, 18, '#E9F2F8', { sw: 2 });
  },
  // En tallrik med kniv och gaffel: lunchen, som en liten bild i en bubbla.
  tallrik: (d) => {
    const { x, y } = d, s = (d.storlek ?? 60) / 60;
    return ring(x, y, 20 * s, '#fff', { sw: 2.5 }) + ring(x, y, 13 * s, '#F1EDE6', { sw: 1.5 }) + linje([x - 30 * s, y - 16 * s], [x - 30 * s, y + 18 * s], { sw: 3 }) + `<path d="M${n(x - 35 * s)} ${n(y - 16 * s)}v8M${n(x - 25 * s)} ${n(y - 16 * s)}v8M${n(x - 35 * s)} ${n(y - 8 * s)}q5 5 10 0" fill="none" stroke="${K}" stroke-width="2.5" stroke-linecap="round"/>` + `<path d="M${n(x + 30 * s)} ${n(y + 18 * s)}V${n(y - 16 * s)}q6 4 0 16" fill="none" stroke="${K}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  },
  // Ett skrattande ansikte, som en reaktion i en chatt.
  skratt: (d) => {
    const { x, y } = d, rr = (d.storlek ?? 30) / 2;
    return ring(x, y, rr, '#F6C945', { sw: 2 }) + `<path d="M${n(x - rr * 0.55)} ${n(y - rr * 0.15)}q${n(rr * 0.2)} ${n(-rr * 0.3)} ${n(rr * 0.4)} 0M${n(x + rr * 0.15)} ${n(y - rr * 0.15)}q${n(rr * 0.2)} ${n(-rr * 0.3)} ${n(rr * 0.4)} 0" fill="none" stroke="${K}" stroke-width="2" stroke-linecap="round"/>`
      + `<path d="M${n(x - rr * 0.5)} ${n(y + rr * 0.15)}Q${n(x)} ${n(y + rr * 0.9)} ${n(x + rr * 0.5)} ${n(y + rr * 0.15)}Z" fill="#7B3B33" stroke="${K}" stroke-width="1.5"/>`;
  },
  // En stor mobil som visar klassens chatt: bilden som någon lade ut och svaren under den.
  chatt: (d) => {
    const { x, y } = d, b = d.b ?? 180, h = d.h ?? 300;
    let s = rekt(x, y, b, h, '#2F3640', { rx: 22, sw: 3 }) + rekt(x + 10, y + 30, b - 20, h - 50, '#F4F6F9', { kant: false, rx: 6 }) + rekt(x + b / 2 - 18, y + 12, 36, 6, '#59626E', { kant: false, rx: 3 });
    s += rekt(x + 10, y + 30, b - 20, 28, '#5B7DB1', { kant: false });
    for (let i = 0; i < 3; i++) s += ring(x + 28 + i * 16, y + 44, 6, ['#F2C14E', '#E07B39', '#8E6BBF'][i], { sw: 1.5 });
    // Bilden i chatten: en liten person som snubblar, i en bubbla från den som lade ut den.
    const bx = x + 22, by = y + 70, bb = b - 44, bh = bb * 0.62;
    s += rekt(bx - 4, by - 4, bb + 8, bh + 8, '#DDE7F3', { rx: 10, kant: false }) + rekt(bx, by, bb, bh, '#CFD8E3', { kant: false, rx: 4 }) + rekt(bx, by + bh * 0.72, bb, bh * 0.28, '#B9A88E', { kant: false });
    s += `<g transform="translate(${n(bx + bb * 0.5)} ${n(by + bh * 0.72)}) scale(${(bh / 260).toFixed(3)})">${d.bild ?? ''}</g>`;
    for (const [i, sida] of (d.svar ?? [1, -1, 1]).entries()) {
      const sy = by + bh + 22 + i * 40, sx = sida > 0 ? x + b - 22 - 70 : x + 22;
      s += rekt(sx, sy, 70, 32, sida > 0 ? '#D7EBD2' : '#FFFFFF', { rx: 14, sw: 2 });
      s += [0, 1].map((k) => SAKER.skratt({ x: sx + 20 + k * 30, y: sy + 16, storlek: 22 })).join('');
    }
    return s;
  },
  // Sängen i ett rum på kvällen, sedd från sidan.
  sang: (d) => {
    const { x, y } = d, b = d.b ?? 300, golv = d.golv ?? 410;
    return rekt(x - 6, y - 70, 18, golv - y + 70, TRA_M, { rx: 4 }) + rekt(x, y, b, 34, '#E8E2D6', { rx: 8 }) + rekt(x + b * 0.32, y - 6, b * 0.68, 40, d.tacke ?? '#7E9CC9', { rx: 10 }) + rekt(x + 10, y - 24, 70, 28, '#FFFFFF', { rx: 12 })
      + linje([x + 10, y + 34], [x + 10, golv], { sw: 9, farg: TRA_M }) + linje([x + b - 10, y + 34], [x + b - 10, golv], { sw: 9, farg: TRA_M });
  },
  // En lampa som lyser, på ett nattduksbord.
  lampa: (d) => {
    const { x, y } = d, golv = d.golv ?? 410;
    return ring(x, y - 70, 54, '#F8E7A8', { kant: false }) + rekt(x - 30, y, 60, golv - y, TRA, { sw: 3 }) + linje([x, y], [x, y - 50], { sw: 4 }) + poly([[x - 26, y - 50], [x + 26, y - 50], [x + 16, y - 86], [x - 16, y - 86]], '#F3D46B', { sw: 3 });
  },
  // En tavla på väggen i klassrummet.
  tavla: (d) => {
    const { x, y } = d, b = d.b ?? 220, h = d.h ?? 110;
    return rekt(x, y, b, h, '#FBFCFD', { sw: 4 }) + rekt(x + b * 0.1, y + h, b * 0.8, 8, '#B8BEC6', { sw: 2 }) + linje([x + 20, y + 30], [x + b * 0.5, y + 30], { sw: 3, farg: '#9DB4CF' }) + linje([x + 20, y + 52], [x + b * 0.7, y + 52], { sw: 3, farg: '#9DB4CF' });
  },
  // En hylla med spel och lådor, som på fritids.
  hylla: (d) => {
    const { x, y } = d, b = d.b ?? 200;
    let s = '';
    for (const [k, hy] of [0, 60].entries()) {
      s += rekt(x, y + hy + 46, b, 8, TRA_M, { sw: 2.5 });
      const farger = k ? ['#D96B5B', '#6FA3D6', '#7DB86A'] : ['#E8B83A', '#8E6BBF', '#3AA6A0', '#D96B5B'];
      farger.forEach((f, i) => { s += rekt(x + 10 + i * (b - 20) / farger.length, y + hy + 46 - (22 + (i % 2) * 10), (b - 20) / farger.length - 6, 22 + (i % 2) * 10, f, { sw: 2, rx: 2 }); });
    }
    return s;
  },
  // Ett matsalsbord sett framifrån, med bänk.
  langbord: (d) => {
    const { x, y } = d, b = d.b ?? 280, golv = d.golv ?? 410, farg = d.farg ?? '#C9A57A';
    return linje([x - b / 2 + 16, y + 10], [x - b / 2 + 16, golv], { sw: 9, farg: ton(farg, -0.35) }) + linje([x + b / 2 - 16, y + 10], [x + b / 2 - 16, golv], { sw: 9, farg: ton(farg, -0.35) })
      + poly([[x - b / 2 + 20, y - 30], [x + b / 2 - 20, y - 30], [x + b / 2, y], [x - b / 2, y]], ton(farg, 0.2)) + rekt(x - b / 2, y, b, 12, farg, { sw: 3 });
  },
  // Ett glas på bordet. Med valt: true ligger det på sidan, och mjölken har runnit ut åt det håll vand säger, langd lång.
  glas: (d) => {
    const { x, y } = d;
    const glaset = (gx, gy) => poly([[gx - 12, gy - 38], [gx + 12, gy - 38], [gx + 9, gy], [gx - 9, gy]], '#EEF4F9', { sw: 2.5 });
    if (!d.valt) return glaset(x, y) + poly([[x - 10, y - 26], [x + 10, y - 26], [x + 8, y - 3], [x - 8, y - 3]], '#FFFFFF', { kant: false });
    const v = d.vand ?? 1, L = d.langd ?? 92;
    const pol = [[0, -2], [0.2, -9], [0.42, -6], [0.6, -11], [0.82, -7], [1, -4], [1.04, 2], [0.8, 6], [0.5, 4], [0.25, 7], [0, 5]].map(([f, dy]) => [x + v * (f * L + 34), y + dy]);
    return `<path d="M${pol.map(p2).join('L')}Z" fill="#FFFFFF" stroke="#7F9DBD" stroke-width="2.5" stroke-linejoin="round"/>`
      + `<g transform="rotate(${v * 84} ${n(x)} ${n(y)})">${glaset(x, y)}</g>`
      + [[30, -22], [48, -30], [16, -34], [62, -20]].map(([dx, dy]) => ellips(x + v * dx, y + dy, 4.5, 3.5, '#FFFFFF', { sw: 1.8, kant: '#7F9DBD' })).join('');
  },
  // En kon från en liten sak till en stor bild av den, som när mobilen visas förstorad.
  zoom: (d) => `<path d="M${p2(d.fran)}L${n(d.till[0])} ${n(d.till[1])}L${n(d.till[0])} ${n(d.till[2])}Z" fill="#C9D3DE" opacity=".55"/>`,
  // Rörelsestreck bakom någon som går eller en sak som rör sig.
  fart: (d) => {
    const { x, y } = d, v = d.vand ?? 1;
    return [0, 1, 2].map((k) => linje([x - v * (10 + k * 4), y - 16 + k * 16], [x - v * (40 + k * 6), y - 16 + k * 16], { sw: 3, farg: '#8C8C8C' })).join('');
  },
  // Bussen inifrån, sedd från förarplatsen bakåt: tak, sidoväggar med fönster, golvet och mittgången.
  buss: (d) => {
    const vx = 400, vy = 175, ut = d.utsikt ?? 'dag';
    const himmel = ut === 'dag' ? '#BFE0F5' : '#CFE3F2';
    let s = rekt(0, 0, B, H, '#DCE3EA', { kant: false });
    s += poly([[0, 0], [B, 0], [vx + 120, vy - 70], [vx - 120, vy - 70]], '#EEF1F4', { kant: false });
    s += poly([[0, H], [vx - 120, vy + 90], [vx + 120, vy + 90], [B, H]], '#8F98A3', { kant: false });
    s += poly([[vx - 30, vy + 90], [vx + 30, vy + 90], [vx + 110, H], [vx - 110, H]], '#7A838E', { kant: false });
    s += rekt(vx - 120, vy - 70, 240, 160, '#D3DAE2', { sw: 2.5 }) + rekt(vx - 90, vy - 50, 180, 70, himmel, { sw: 3 });
    // Fönstren längs sidoväggarna, som band som smalnar av mot bakrutan.
    for (const sida of [-1, 1]) {
      const yt = (t) => 24 + t * (vy - 52 - 24), yb = (t) => 236 + t * (vy + 16 - 236);
      const xt = (t) => (sida < 0 ? 0 + t * (vx - 120) : B - t * (B - vx - 120));
      for (const [a, b2] of [[0.02, 0.42], [0.47, 0.68], [0.72, 0.9]]) {
        s += poly([[xt(a), yt(a)], [xt(b2), yt(b2)], [xt(b2), yb(b2)], [xt(a), yb(a)]], himmel, { sw: 3 });
        if (a < 0.1) s += `<path d="M${p2([xt(a) + sida * 8, yb(a) - 10])}Q${p2([xt((a + b2) / 2), yb((a + b2) / 2) - 60])} ${p2([xt(b2), yb(b2) - 30])}L${p2([xt(b2), yb(b2)])}L${p2([xt(a), yb(a)])}Z" fill="#9CC48A"/>` + poly([[xt(a), yt(a)], [xt(b2), yt(b2)], [xt(b2), yb(b2)], [xt(a), yb(a)]], 'none', { sw: 3 });
      }
      s += linje([xt(0), 18], [xt(0.95), vy - 64], { sw: 6, farg: '#B9C2CB' });
    }
    return s;
  },
  // Ett dubbelsäte i bussen, sett framifrån: ryggstödet och dynan. Två platser bredvid varandra.
  bussate: (d) => {
    const { x, y } = d, b = d.b ?? 300, h = d.h ?? 150, farg = d.farg ?? '#4D6FA0', s2 = d.skala ?? 1;
    const rygg = rekt(x - b / 2, y - h, b, h, farg, { rx: 22 * s2 }) + linje([x, y - h + 14 * s2], [x, y - 10 * s2], { sw: 2.5, farg: ton(farg, -0.3) }) + `<path d="M${n(x - b / 2 + 16)} ${n(y - h + 20)}H${n(x + b / 2 - 16)}" stroke="${ton(farg, 0.25)}" stroke-width="6" stroke-linecap="round"/>`;
    if (d.bara === 'rygg') return rygg;
    const dyna = rekt(x - b / 2 + 4, y - 4, b - 8, 26 * s2, ton(farg, -0.12), { rx: 8 * s2 });
    if (d.bara === 'dyna') return dyna;
    return rygg + dyna;
  },
  // Ett huvud i en stol längre bak: klasskamrater som syns över ryggstöden.
  kamrat: (d) => {
    const { x, y } = d, rr = d.r ?? 16;
    return ellips(x, y, rr, rr * 1.06, HUD[d.hud] ?? HUD.ljus, { sw: 2.5 }) + `<path d="M${n(x - rr - 1)} ${n(y)}C${n(x - rr - 2)} ${n(y - rr * 1.3)} ${n(x + rr + 2)} ${n(y - rr * 1.3)} ${n(x + rr + 1)} ${n(y)}C${n(x + rr * 0.5)} ${n(y - rr * 0.6)} ${n(x - rr * 0.5)} ${n(y - rr * 0.6)} ${n(x - rr - 1)} ${n(y)}Z" fill="${d.harfarg ?? '#5A3D2B'}" stroke="${K}" stroke-width="2.2"/>`;
  },
  // En dörr i väggen.
  dorr: (d) => {
    const { x, y } = d, b = d.b ?? 110, golv = d.golv ?? 410;
    return rekt(x, y, b, golv - y, d.farg ?? '#B88D62', { sw: 3 }) + ring(x + b - 18, y + (golv - y) * 0.55, 6, '#D9D2C5', { sw: 2 });
  },
  // En klocka på väggen: tiden visar om det är morgon eller kväll.
  klocka: (d) => {
    const { x, y } = d, rr = d.r ?? 22, t = d.tid ?? [8, 0];
    const tim = ((t[0] % 12) + t[1] / 60) / 12 * Math.PI * 2, min = (t[1] / 60) * Math.PI * 2;
    return ring(x, y, rr, '#FFFFFF', { sw: 3 }) + linje([x, y], [x + Math.sin(tim) * rr * 0.5, y - Math.cos(tim) * rr * 0.5], { sw: 3 }) + linje([x, y], [x + Math.sin(min) * rr * 0.75, y - Math.cos(min) * rr * 0.75], { sw: 2.5 });
  },
  // Fyra i rad på bordet: ett blått ställ med hål och brickor i två färger, ett spel för två.
  fyraIRad: (d) => {
    const { x, y } = d, b = d.b ?? 120, h = b * 0.82, kol = 7, rad = 6, c = b / kol;
    let s = rekt(x - b / 2 - 6, y - 6, b + 12, 8, '#2F5FA8', { rx: 3, sw: 2 }) + rekt(x - b / 2, y - h, b, h, '#3B6FBF', { rx: 4, sw: 2.5 });
    const lagda = d.brickor ?? [[0, 0, 'r'], [1, 0, 'g'], [2, 0, 'r'], [3, 0, 'g'], [2, 1, 'g'], [3, 1, 'r'], [3, 2, 'g'], [4, 0, 'r']];
    for (let i = 0; i < kol; i++) for (let j = 0; j < rad; j++) {
      const bricka = lagda.find(([a, bb]) => a === i && bb === j);
      s += ring(x - b / 2 + c * (i + 0.5), y - c * (j + 0.5) - 2, c * 0.33, bricka ? (bricka[2] === 'r' ? '#D9534A' : '#F2C230') : '#F3F1EC', { sw: 1.2 });
    }
    return s;
  },
  // Ett pingisbord från sidan, ute på rasten: skivan, nätet i mitten och benen.
  pingisbord: (d) => {
    const { x, y } = d, b = d.b ?? 320, golv = d.golv ?? 420;
    return linje([x - b / 2 + 30, y + 10], [x - b / 2 + 40, golv], { sw: 9, farg: '#4A4F55' }) + linje([x + b / 2 - 30, y + 10], [x + b / 2 - 40, golv], { sw: 9, farg: '#4A4F55' })
      + poly([[x - b / 2 + 16, y - 20], [x + b / 2 - 16, y - 20], [x + b / 2, y], [x - b / 2, y]], '#3C8C6A') + rekt(x - b / 2, y, b, 10, '#2F6E53', { sw: 3 })
      + linje([x - b / 2 + 8, y - 10], [x + b / 2 - 8, y - 10], { sw: 2, farg: '#E9F3EE' })
      + rekt(x - 4, y - 46, 8, 46, '#F3F5F7', { sw: 2.5 }) + `<path d="M${n(x - 3)} ${n(y - 40)}V${n(y - 4)}M${n(x + 3)} ${n(y - 40)}V${n(y - 4)}" stroke="#9AA5AE" stroke-width="1.5"/>`;
  },
  // En pingisracket i handen.
  racket: (d) => {
    const { x, y } = d, v = d.vand || 1, vr = d.vrid ?? -30 * v;
    return `<g transform="rotate(${vr} ${n(x)} ${n(y)})">${rekt(x - 3.5, y - 2, 7, 18, '#8A5A36', { rx: 3, sw: 2 })}${ellips(x, y - 16, 15, 17, '#D9443A', { sw: 2.5 })}</g>`;
  },
  pingisboll: (d) => ring(d.x, d.y, d.r ?? 7, '#FFFFFF', { sw: 2.5 }),
  // En bänk vid väggen, sedd framifrån.
  bank: (d) => {
    const { x, y } = d, b = d.b ?? 200, golv = d.golv ?? 420;
    return linje([x - b / 2 + 16, y + 8], [x - b / 2 + 16, golv], { sw: 8, farg: '#6E5A48' }) + linje([x + b / 2 - 16, y + 8], [x + b / 2 - 16, golv], { sw: 8, farg: '#6E5A48' }) + rekt(x - b / 2, y - 6, b, 16, '#B58A5E', { rx: 4, sw: 2.5 });
  },
  // Ett staket långt bort på skolgården.
  staket: (d) => {
    const { y } = d, x0 = d.x0 ?? 0, x1 = d.x1 ?? B, h = d.h ?? 60;
    let s = rekt(x0, y + 8, x1 - x0, 6, '#8C949C', { kant: false }) + rekt(x0, y + h * 0.6, x1 - x0, 6, '#8C949C', { kant: false });
    for (let x = x0 + 10; x < x1; x += 34) s += rekt(x, y, 7, h, '#9AA3AB', { kant: false, rx: 2 });
    return s;
  },
  // En pall i pennans stil, att sitta på i ritstödet.
  pall: (d) => `<path d="M${n(d.x - 34)} ${n(d.y)}H${n(d.x + 34)}M${n(d.x - 26)} ${n(d.y)}L${n(d.x - 30)} ${n(d.golv ?? d.y + 70)}M${n(d.x + 26)} ${n(d.y)}L${n(d.x + 30)} ${n(d.golv ?? d.y + 70)}" stroke="${PENNA}" stroke-width="4.5" stroke-linecap="round" fill="none"/>`,
  // Text i rutan i Andika, som ordet under en pose i ritstödet.
  text: (d) => textBana(d.text, d.x, d.y, d.storlek ?? 28, { farg: d.farg ?? (STRECK ? PENNA : K), ankare: d.ankare }),
  // Det du ritar på en plan: marken som ett streck, ett mål med nät och en boll.
  mark: (d) => `<path d="M${n(d.x0 ?? 30)} ${n(d.y)}L${n(d.x1 ?? 770)} ${n(d.y)}" stroke="${PENNA}" stroke-width="4" stroke-linecap="round"/>`,
  mal: (d) => {
    const { x, y } = d, b = d.b ?? 120, h = d.h ?? 90;
    let s = `<path d="M${n(x)} ${n(y)}V${n(y - h)}H${n(x + b)}V${n(y)}" fill="none" stroke="${PENNA}" stroke-width="4.5" stroke-linejoin="round"/>`;
    for (let i = 1; i < 4; i++) s += `<path d="M${n(x + (b * i) / 4)} ${n(y - h)}V${n(y)}M${n(x)} ${n(y - (h * i) / 4)}H${n(x + b)}" stroke="${PENNA}" stroke-width="1.5" opacity=".6"/>`;
    return s;
  },
  boll: (d) => `<circle cx="${n(d.x)}" cy="${n(d.y)}" r="${d.r ?? 13}" fill="#fff" stroke="${PENNA}" stroke-width="3.5"/><path d="M${n(d.x - 6)} ${n(d.y - 4)}l6 -4l6 4l-2 7h-8z" fill="${PENNA}"/>`,
  // Text som en del av bilden, som ett nummer på en dörr. Används sparsamt: bildserierna har inga ord.
  bild: (d) => d.svg ?? '',
};

// ---------------------------------------------------------------- rutan
// En ruta: ramen, numret i övre vänstra hörnet och, i den första rutan, en liten ruta för platsen (som hos Gray).
function ramOchNummer(nr, o = {}) {
  const b = o.bredd ?? B, h = o.hojd ?? H;
  let s = rekt(2, 2, b - 4, h - 4, 'none', { rx: 16, sw: 4 });
  if (o.etikett) {
    const eb = textBredd(o.etikett, 30) + 28;
    s += rekt(16, 14, eb, 44, '#FFFFFF', { rx: 10, sw: 2.5 }) + textBana(o.etikett, 16 + eb / 2, 45, 30);
  } else if (nr != null) s += ring(36, 36, 21, '#FFFFFF', { sw: 3 }) + textBana(String(nr), 36, 46, 28);
  // Platsen och tiden i en bildserie, som "I bussen" eller "Nästa morgon".
  if (o.plats) {
    const pb = textBredd(o.plats, 28) + 26;
    s += rekt(64, 15, pb, 42, '#FFFFFF', { rx: 9, sw: 2.5 }) + textBana(o.plats, 64 + pb / 2, 45, 28);
  }
  // I mallarna: platsen och vilka som var med i den första rutan, och en rad för det som händer i varje ruta.
  if (o.platsen) {
    const pb = Math.min(330, b - 84);
    s += rekt(64, 15, pb, 78, '#FFFFFF', { rx: 9, sw: 2.5 }) + textBana('Platsen', 76, 44, 24, { ankare: 'start', farg: '#5D5852' }) + linje([166, 48], [64 + pb - 14, 48], { sw: 1.5, farg: '#9A948C' })
      + textBana('Vilka', 76, 80, 24, { ankare: 'start', farg: '#5D5852' }) + linje([142, 84], [64 + pb - 14, 84], { sw: 1.5, farg: '#9A948C' });
  }
  if (o.textrad) s += textBana('Det här händer:', 22, h - 22, 22, { ankare: 'start', farg: '#7A746C' }) + linje([22 + textBredd('Det här händer:', 22) + 8, h - 20], [b - 22, h - 20], { sw: 1.5, farg: '#9A948C' });
  return s;
}

// Rutans innehåll ur scenens delar, utan ram: bakgrunden, sakerna, figurerna och bubblorna i listans ordning.
function innehall(ruta, personer) {
  const figurer = {};
  STRECK = ruta.stil === 'streck';
  const ut = [];
  // Namnskyltarna ritas sist, så att inget bord eller ben skymmer dem.
  const skyltar = [];
  for (const del of ruta.delar ?? []) {
    if (del.typ === 'figur') {
      const p = personer[del.vem];
      if (!p) throw new Error(`serieritning: personen "${del.vem}" finns inte i personer`);
      const f = figur(p, del);
      figurer[del.vem] = f;
      ut.push(f.svg);
      if (f.skylt) skyltar.push(f.skylt);
    } else if (del.typ === 'prat') ut.push(pratbubbla(del, del.vem ? figurer[del.vem]?.mun : del.mot));
    else if (del.typ === 'tanke') ut.push(tankebubbla(del, del.vem ? figurer[del.vem]?.topp : del.mot));
    else if (SAKER[del.typ]) {
      // En chatt kan visa en person som en liten bild (bildAv), ritad med samma figur.
      const extra = del.bildAv ? { bild: figur(personer[del.bildAv.vem], { ...del.bildAv, x: 0, y: 0, namn: false }).svg } : {};
      ut.push(SAKER[del.typ]({ ...del, ...extra }));
    } else throw new Error(`serieritning: okänd del "${del.typ}"`);
  }
  STRECK = false;
  return ut.join('') + skyltar.join('');
}

// Rutans innehåll utan svg-element: den vita ytan, scenen klippt till ramen, ramen och numret. id är klippets id, som
// ska vara unikt i den fil där rutan står (filmen har flera rutor i samma fil).
function rutaInnehall(ruta, personer, o = {}) {
  const b = o.bredd ?? B, h = o.hojd ?? H, id = o.id ?? 'r';
  const klipp = ruta ? `<defs><clipPath id="${id}"><rect x="2" y="2" width="${b - 4}" height="${h - 4}" rx="16"/></clipPath></defs>` : '';
  const fyllning = ruta ? `<g clip-path="url(#${id})">${innehall(ruta, personer)}</g>` : '';
  return `${klipp}<rect x="2" y="2" width="${b - 4}" height="${h - 4}" rx="16" fill="#FFFFFF"/>${fyllning}${ramOchNummer(o.nr, { bredd: b, hojd: h, platsen: o.platsen, plats: ruta?.plats, etikett: o.etikett, textrad: o.textrad })}`;
}
// Hela rutan som en svg-fil: 800 × 450 med ram och nummer. Utan ruta blir den tom, till mallarna.
function rutaSvg(ruta, personer, o = {}) {
  const b = o.bredd ?? B, h = o.hojd ?? H;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${b} ${h}" width="${b}" height="${h}">${rutaInnehall(ruta, personer, o)}</svg>`;
}

// En series rutor som svg-filer, med nummer, och platsens ruta i den första när serien har fler än en ruta.
function serieRutor(data, id, o = {}) {
  const serie = data.serier[id];
  if (!serie) throw new Error(`serieritning: bildserien "${id}" finns inte`);
  const flera = serie.rutor.length > 1;
  return serie.rutor.map((ruta, i) => rutaSvg(ruta, data.personer, { nr: flera ? i + 1 : null, platsen: flera && i === 0 && o.platsen !== false && !ruta.plats, id: `${id}-${i + 1}` }));
}
// En tom ruta till mallarna med fyra och sex rutor.
function tomRuta(nr, o = {}) {
  return rutaSvg(null, {}, { nr: o.etikett ? null : nr, etikett: o.etikett, platsen: !o.etikett && nr === 1, textrad: o.textrad ?? !o.etikett, bredd: o.bredd ?? B, hojd: o.hojd ?? H });
}
// En malls tomma rutor (rigg.json serier.mallar), samma i Word och i filerna till sajten. Sex rutor är smalare, så att
// tre ryms i bredd. Två rutor med etiketter, som bladet Nästa gång, är högre, så att eleven har plats att rita.
function mallRutor(antal, etiketter) {
  const matt = antal === 6 ? { bredd: 520, hojd: 450 } : antal === 2 ? { hojd: 720 } : {};
  return Array.from({ length: antal }, (_, i) => tomRuta(i + 1, { ...matt, ...(etiketter?.[i] ? { etikett: etiketter[i] } : {}) }));
}

// ---------------------------------------------------------------- arken att klippa ut
// Bubblorna att klippa ut och laminera (Niclas 2026-10-03: "färdiga pratbubblor man klipper ut och sätter dit som är
// laminerade och man använder mini-whiteboard penna"). Måtten är millimeter, och arket fyller ett A4 med 1 cm marginal,
// 190 × 260. Varje bubbla har ett streckat klipp runt sig, rakt, så att det går fort att klippa. Tankebubblan är cirka
// 8,5 × 4,8 cm, så att en elev i åk 1 får plats med några ord (perspektivgranskningen av bildserierna, fynd 3).
const ARK = { b: 190, h: 260 };
const klipp = (x, y, b, h) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${b.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="none" stroke="#8C8C8C" stroke-width="0.35" stroke-dasharray="2 1.6"/>`;
// En bubbla i rutornas enheter (400 i bredd), skalad till bredden i mm.
const iMm = (svg, x, y, bMm, bEnh) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(bMm / bEnh).toFixed(4)})">${svg}</g>`;
function ropabubbla(cx, cy, b, h) {
  const pts = [];
  const spetsar = 22;
  for (let i = 0; i < spetsar * 2; i++) {
    const w = (i / (spetsar * 2)) * Math.PI * 2, f = i % 2 ? 0.8 : 1;
    pts.push([cx + Math.cos(w) * (b / 2) * f, cy + Math.sin(w) * (h / 2) * f]);
  }
  return poly(pts, '#fff', { sw: 3 });
}
function bubbelark() {
  // Sex tankebubblor, tre pratbubblor och en ropa-bubbla: tankarna är det eleverna skriver mest. Hjärtat 0–10 hör till
  // en egen serie, där allt ritas på papperet (omtaget 2026-10-04), så arket har inga hjärtan.
  let s = '';
  const vx = [2, 98], radH = 50, boxH = 47;
  const tanke = (x, y) => klipp(x, y, 90, boxH) + iMm(tankebubbla({ x: 200, y: 100, b: 370, h: 172 }, [200, 202]), x + 2, y + 2, 86, 400);
  const prat = (x, y) => klipp(x, y, 90, boxH) + iMm(pratbubbla({ x: 200, y: 96, b: 370, h: 160 }, [150, 226]), x + 2, y + 2, 86, 400);
  for (let r = 0; r < 3; r++) for (const x of vx) s += tanke(x, 2 + r * radH);
  for (const x of vx) s += prat(x, 2 + 3 * radH);
  const y5 = 2 + 4 * radH;
  s += klipp(vx[0], y5, 90, boxH) + iMm(ropabubbla(200, 106, 380, 195), vx[0] + 2, y5 + 1, 86, 400);
  s += prat(vx[1], y5);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ARK.b} ${ARK.h}" width="${ARK.b}mm" height="${ARK.h}mm">${s}</svg>`;
}
// Känsloansiktena att lägga på de tomma ansiktena i den sista rutan: kortet Peka på känslans bilder och ord, två
// satser, 4 × 6 brickor. bild(ord) ger bildens svg ur bildbanken.
function kanslark(ord, bild) {
  const defs = [], s = [];
  const kol = 4, b = 46, h = 41;
  ord.forEach((o, i) => {
    const svg = bild(o);
    const vb = svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 32 32';
    const inre = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    defs.push(`<g id="kansla-${i}"><svg viewBox="${vb}" width="24" height="24">${inre}</svg></g>`);
  });
  for (let sats = 0; sats < 2; sats++) ord.forEach((o, i) => {
    const k = sats * ord.length + i, x = 1 + (k % kol) * (b + 1.5), y = 1 + Math.floor(k / kol) * (h + 1.5);
    s.push(klipp(x, y, b, h) + `<use href="#kansla-${i}" x="${(x + (b - 24) / 2).toFixed(1)}" y="${(y + 3).toFixed(1)}"/>` + textBana(o, x + b / 2, y + h - 6, 7));
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ARK.b} ${ARK.h}" width="${ARK.b}mm" height="${ARK.h}mm"><defs>${defs.join('')}</defs>${s.join('')}</svg>`;
}

export { B, H, ARK, serieRutor, tomRuta, mallRutor, rutaSvg, rutaInnehall, innehall, figur, SAKER, bubbelark, kanslark, tankebubbla };
