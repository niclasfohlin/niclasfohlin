// Sakerna i strukturernas bilder (K-650): bord, papper, pappersbollar, kort, pennor, en klocka, pilar för rörelse
// och bubblor med symboler i stället för ord. Allt ritas med samma penna som figurerna.
import { V, plus, minus, ggr, rikt, vrid, ellips, enhet, normal, langd } from './penna.mjs';

export const SYMBOLFARG = { rod: '#e0566e', bla: '#5f72d9', gul: '#efc65a', gron: '#6cc28a', gra: '#9a9aa2' };

// Ett bord i enkel perspektivteckning: skivan som en parallellogram och fyra tunna ben. (x, y) är skivans främre
// vänstra hörn, b bredden, d djupet in i bilden och h benens höjd. `snett` flyttar den bortre kanten i sidled.
export function bord(p, { x, y, b, d = 70, h = 120, snett = 30, farg = null }) {
  const a = V(x, y), bb = V(x + b, y), c = V(x + b + snett, y - d), dd = V(x + snett, y - d);
  const tjock = 7;
  // Benen först, så att skivan täcker deras övre ände.
  p.ny();
  for (const [q, kort] of [[a, 0], [bb, 0], [c, 1], [dd, 1]]) {
    const hojd = kort ? h * 0.82 : h;
    p.streck([V(q.x + 5, q.y + tjock), V(q.x + 4, q.y + tjock + hojd)], { tjock: 1 });
  }
  p.ny().form([a, bb, V(bb.x, bb.y + tjock), V(a.x, a.y + tjock)], farg);
  p.ny().form([a, bb, c, dd], farg);
  return { skiva: [a, bb, c, dd], mitt: V(x + b / 2 + snett / 2, y - d / 2), fram: y, bak: y - d };
}

// Ett papper som ligger eller hålls, med några rader klotter som text.
// symbolStorlek är symbolens storlek i delar av papperets kortare sida, och symbolPlats dess plats i delar av bredden och
// höjden från mitten. rutnat: [kolumner, rader] ritar ett rutnät utan mittruta, som en bricka eller fyra rutor i rad.
export function papper(p, { x, y, b = 46, h = 34, vinkel = 0, rader = 3, farg = null, rutor = 0, symbol = null, symbolStorlek = 0.2, symbolPlats = [-0.22, 0], rutnat = null }) {
  const c = V(x, y);
  const hrn = [V(-b / 2, -h / 2), V(b / 2, -h / 2), V(b / 2, h / 2), V(-b / 2, h / 2)].map((q) => vrid(plus(c, q), c, vinkel));
  p.ny().form(hrn, farg, { tjock: 0.85 });
  if (rutor === 4) {
    // Fyra fält och en ruta i mitten, som i Mötas på mitten.
    p.streck([vrid(V(x, y - h / 2), c, vinkel), vrid(V(x, y + h / 2), c, vinkel)], { tjock: 0.7 });
    p.streck([vrid(V(x - b / 2, y), c, vinkel), vrid(V(x + b / 2, y), c, vinkel)], { tjock: 0.7 });
    p.ny().form([V(-b * 0.18, -h * 0.2), V(b * 0.18, -h * 0.2), V(b * 0.18, h * 0.2), V(-b * 0.18, h * 0.2)].map((q) => vrid(plus(c, q), c, vinkel)), '#f3dc8e', { tjock: 0.75 });
    return;
  }
  if (rutnat) {
    const [k, r] = rutnat;
    for (let i = 1; i < k; i++) p.streck([vrid(V(x - b / 2 + (b * i) / k, y - h / 2), c, vinkel), vrid(V(x - b / 2 + (b * i) / k, y + h / 2), c, vinkel)], { tjock: 0.6 });
    for (let j = 1; j < r; j++) p.streck([vrid(V(x - b / 2, y - h / 2 + (h * j) / r), c, vinkel), vrid(V(x + b / 2, y - h / 2 + (h * j) / r), c, vinkel)], { tjock: 0.6 });
  }
  // En symbol på papperet: det som någon har skrivit eller ritat, samma symbol som i en bubbla.
  if (symbol) symbolen(p, symbol, vrid(V(x + b * symbolPlats[0], y + h * symbolPlats[1]), c, vinkel), Math.min(b, h) * symbolStorlek);
  if (rutnat) return;
  // Raderna börjar efter symbolen, så att de inte går genom den (granskningen av omgång H).
  const fore = symbol ? b * symbolPlats[0] + Math.min(b, h) * symbolStorlek * 1.4 : -Infinity;
  const borjan = Math.max(-b / 2 + b * 0.14, fore);
  for (let i = 0; i < rader; i++) {
    const yy = y - h / 2 + (h / (rader + 1)) * (i + 1);
    const slut = x - b / 2 + b * (i === rader - 1 ? 0.5 : 0.82);
    const pts = [];
    for (let xx = x + borjan; xx < slut; xx += 5) pts.push(vrid(V(xx, yy + (pts.length % 2 ? -1.6 : 1.6)), c, vinkel));
    if (pts.length > 1) p.streck(pts, { tjock: 0.55, skak: 0 });
  }
}

// En pappersboll, skrynklig, med några veck.
export function boll(p, { x, y, r = 13, farg = '#efc65a' }) {
  const pts = ellips(V(x, y), r, r * 0.92, { n: 11 }).map((q, i) => plus(q, ggr(enhet(minus(q, V(x, y))), (i % 2 ? -1 : 1) * r * 0.12 * p.r())));
  p.ny().form(pts, farg, { tjock: 0.85 });
  // Vecken är raka och korta, åt olika håll, så att de inte ser ut som ett leende ansikte (granskningen av omgång C och D).
  p.streck([V(x - r * 0.45, y - r * 0.3), V(x - r * 0.05, y - r * 0.05)], { tjock: 0.55, skak: 0 });
  p.streck([V(x + r * 0.05, y + r * 0.1), V(x + r * 0.15, y + r * 0.5)], { tjock: 0.55, skak: 0 });
  p.streck([V(x + r * 0.2, y - r * 0.4), V(x + r * 0.5, y - r * 0.15)], { tjock: 0.55, skak: 0 });
}

// Ett kort, som en lapp med en symbol på.
export function kort(p, { x, y, b = 28, h = 38, vinkel = 0, farg = '#ffffff', symbol = null }) {
  const c = V(x, y);
  p.ny().form([V(-b / 2, -h / 2), V(b / 2, -h / 2), V(b / 2, h / 2), V(-b / 2, h / 2)].map((q) => vrid(plus(c, q), c, vinkel)), farg, { tjock: 0.85 });
  if (symbol) symbolen(p, symbol, c, Math.min(b, h) * 0.32);
}

// En penna, från spetsen och åt ett håll.
export function penna(p, { x, y, vinkel = 200, l = 40, farg = '#efc65a' }) {
  const s = V(x, y), d = rikt(vinkel), n = normal(d), w = 3.6;
  const spets = s, a = plus(s, ggr(d, 9)), b = plus(s, ggr(d, l));
  p.ny().form([spets, plus(a, ggr(n, w)), plus(b, ggr(n, w)), minus(b, ggr(n, w)), minus(a, ggr(n, w))], farg, { tjock: 0.75, glid: 0.3 });
}

// En klocka med visare.
export function klocka(p, { x, y, r = 20 }) {
  p.ny().form(ellips(V(x, y), r, r, { n: 20 }), '#f3dc8e');
  p.streck([V(x, y), V(x, y - r * 0.65)], { tjock: 0.9, skak: 0 });
  p.streck([V(x, y), V(x + r * 0.45, y + r * 0.1)], { tjock: 0.9, skak: 0 });
}

// En symbol i en bubbla eller på ett kort: triangel, kvadrat, cirkel, penna, kugghjul, hand, hjarta, stjarna, bok,
// fraga (en krok och en prick, utan bokstav), utrop, bock och kryss.
export function symbolen(p, namn, c, s) {
  const [slag, farg] = String(namn).split(':');
  const f = SYMBOLFARG[farg] || farg || { triangel: SYMBOLFARG.rod, kvadrat: SYMBOLFARG.bla, cirkel: SYMBOLFARG.gul, hjarta: SYMBOLFARG.rod, stjarna: SYMBOLFARG.gul }[slag] || null;
  const fyll = (pts) => p.form(pts, f, { botten: false, tjock: 0.6, glid: 0 });
  if (slag === 'triangel') fyll([V(c.x, c.y - s), V(c.x + s * 0.95, c.y + s * 0.75), V(c.x - s * 0.95, c.y + s * 0.75)]);
  else if (slag === 'kvadrat') fyll([V(c.x - s * 0.8, c.y - s * 0.8), V(c.x + s * 0.8, c.y - s * 0.8), V(c.x + s * 0.8, c.y + s * 0.8), V(c.x - s * 0.8, c.y + s * 0.8)]);
  else if (slag === 'cirkel') fyll(ellips(c, s * 0.85, s * 0.85, { n: 14 }));
  else if (slag === 'hjarta') fyll([V(c.x, c.y + s), V(c.x - s, c.y - s * 0.1), V(c.x - s * 0.55, c.y - s * 0.75), V(c.x, c.y - s * 0.35), V(c.x + s * 0.55, c.y - s * 0.75), V(c.x + s, c.y - s * 0.1)]);
  else if (slag === 'stjarna') fyll(Array.from({ length: 10 }, (_, i) => plus(c, ggr(rikt(180 + i * 36), i % 2 ? s * 0.45 : s))));
  else if (slag === 'penna') penna(p, { x: c.x - s * 0.7, y: c.y + s * 0.7, vinkel: 135, l: s * 2.1, farg: f || '#efc65a' });
  else if (slag === 'kugghjul') {
    for (const [dx, dy, k] of [[-0.45, -0.2, 0.62], [0.5, 0.35, 0.5]]) {
      const m = V(c.x + dx * s, c.y + dy * s), r = s * k;
      const pts = Array.from({ length: 24 }, (_, i) => plus(m, ggr(rikt(i * 15), (i % 3 === 0 ? 1.25 : 1) * r * 0.8)));
      p.form(pts, f || '#c3cdf2', { botten: false, tjock: 0.6, glid: 0 });
      p.form(ellips(m, r * 0.28, r * 0.28, { n: 8 }), '#ffffff', { botten: false, tjock: 0.5, glid: 0 });
    }
  } else if (slag === 'hand') {
    const pts = [V(-0.6, 0.9), V(-0.65, -0.1), V(-0.5, -0.75), V(-0.25, -0.15), V(-0.15, -0.95), V(0.05, -0.2), V(0.2, -0.9), V(0.32, -0.15), V(0.55, -0.6), V(0.65, 0.2), V(0.45, 0.9)];
    p.form(pts.map((q) => plus(c, ggr(q, s))), f || '#f6d6cc', { botten: false, tjock: 0.6, glid: 0 });
  } else if (slag === 'bok') {
    fyll([V(c.x - s, c.y - s * 0.6), V(c.x, c.y - s * 0.4), V(c.x + s, c.y - s * 0.6), V(c.x + s, c.y + s * 0.7), V(c.x, c.y + s * 0.9), V(c.x - s, c.y + s * 0.7)]);
    p.streck([V(c.x, c.y - s * 0.4), V(c.x, c.y + s * 0.9)], { tjock: 0.6, skak: 0 });
  } else if (slag === 'fraga') {
    p.streck([V(c.x - s * 0.45, c.y - s * 0.4), V(c.x - s * 0.2, c.y - s * 0.85), V(c.x + s * 0.35, c.y - s * 0.8), V(c.x + s * 0.4, c.y - s * 0.3), V(c.x, c.y + s * 0.05), V(c.x, c.y + s * 0.35)], { tjock: 1.3 });
    p.prick(ellips(V(c.x, c.y + s * 0.8), s * 0.13, s * 0.13, { n: 8 }), '#2b2b2e');
  } else if (slag === 'bock') {
    p.streck([V(c.x - s * 0.8, c.y), V(c.x - s * 0.2, c.y + s * 0.65), V(c.x + s * 0.85, c.y - s * 0.75)], { tjock: 1.6, skak: 0, farg: f || '#3f9a5c' });
  } else if (slag === 'kryss') {
    p.streck([V(c.x - s * 0.7, c.y - s * 0.7), V(c.x + s * 0.7, c.y + s * 0.7)], { tjock: 1.6, skak: 0, farg: f || '#d9485f' });
    p.streck([V(c.x + s * 0.7, c.y - s * 0.7), V(c.x - s * 0.7, c.y + s * 0.7)], { tjock: 1.6, skak: 0, farg: f || '#d9485f' });
  } else if (slag === 'utrop') {
    p.streck([V(c.x, c.y - s * 0.9), V(c.x, c.y + s * 0.3)], { tjock: 1.4 });
    p.prick(ellips(V(c.x, c.y + s * 0.8), s * 0.13, s * 0.13, { n: 8 }), '#2b2b2e');
  } else throw new Error(`Symbolen ${slag} finns inte`);
}

// En pusselbit: en ruta med en knopp ut eller in på varje sida (1 ut, -1 in, 0 rak), i ordningen upp, höger, ned, vänster.
// Delarna i Pussel passar ihop till en helhet (granskningen av omgång E).
export function pusselbit(p, { x, y, s = 40, farg = '#efc65a', vinkel = 0, knoppar = [1, -1, 0, 1], symbol = null }) {
  const c = V(x, y), h = s / 2, k = s * 0.17;
  const hörn = [V(-h, -h), V(h, -h), V(h, h), V(-h, h)];
  const pts = [];
  for (let i = 0; i < 4; i++) {
    const a = hörn[i], b = hörn[(i + 1) % 4], ut = V((b.y - a.y) / s, -(b.x - a.x) / s);
    pts.push(a);
    if (knoppar[i]) {
      const m = ggr(plus(a, b), 0.5), d = enhet(minus(b, a));
      pts.push(minus(m, ggr(d, k * 0.6)));
      for (let j = 0; j <= 6; j++) {
        const t = Math.PI + (j / 6) * Math.PI;
        pts.push(plus(m, plus(ggr(d, Math.cos(t) * k), ggr(ut, -knoppar[i] * (k * 0.9 - Math.sin(t) * k)))));
      }
      pts.push(plus(m, ggr(d, k * 0.6)));
    }
  }
  p.ny().form(pts.map((q) => vrid(plus(c, q), c, vinkel)), farg, { tjock: 0.9 });
  if (symbol) symbolen(p, symbol, c, s * 0.22);
}

// En symbol var som helst: på en tavla, en karta, en affisch eller ett papper, där s är dess halva storlek.
export function symbol(p, { x, y, namn, s = 14 }) {
  p.ny();
  symbolen(p, namn, V(x, y), s);
}

// En skärm som står mellan två elever på ett bord, så att de inte ser varandras papper: en skiva med två små fötter.
export function skarm(p, { x, y, b = 120, h = 90, farg = '#e8dcc2' }) {
  p.ny();
  p.streck([V(x - b * 0.3, y), V(x - b * 0.15, y)], { tjock: 1, skak: 0 });
  p.streck([V(x + b * 0.15, y), V(x + b * 0.3, y)], { tjock: 1, skak: 0 });
  p.ny().form([V(x - b / 2, y - h), V(x + b / 2, y - h * 1.04), V(x + b / 2, y - 3), V(x - b / 2, y)], farg, { tjock: 1 });
}

// En pratbubbla med svans mot munnen, eller en tankebubbla (moln och små ringar), med symboler i en rad.
export function bubbla(p, { mot, x, y, b, h, symboler = [], tanke = false }) {
  const n = Math.max(1, symboler.length);
  b = b ?? 34 + n * 32;
  h = h ?? 58;
  const c = V(x, y);
  p.ny();
  if (tanke) {
    const pts = Array.from({ length: 30 }, (_, i) => {
      const t = (i / 30) * Math.PI * 2;
      const buk = 1 + 0.09 * Math.abs(Math.sin(t * 4));
      return V(c.x + Math.cos(t) * b / 2 * buk, c.y + Math.sin(t) * h / 2 * buk);
    });
    p.form(pts, null);
    const d = minus(mot, c), l = langd(d);
    for (const [k, r] of [[0.62, 5], [0.8, 3.4]]) p.form(ellips(plus(c, ggr(d, k)), r, r, { n: 10 }), null, { tjock: 0.8 });
  } else {
    // Svansen går ut ur bubblans kant mot munnen och slutar en bit före den.
    const d = enhet(minus(mot, c));
    const kant = V(c.x + d.x * b / 2 * 0.86, c.y + d.y * h / 2 * 0.86);
    const spets = plus(c, ggr(minus(mot, c), 0.7));
    const nn = normal(d);
    const pts = [];
    const vinkelKant = Math.atan2(kant.y - c.y, kant.x - c.x);
    for (let i = 0; i <= 26; i++) {
      const t = vinkelKant + 0.32 + (i / 26) * (Math.PI * 2 - 0.64);
      pts.push(V(c.x + Math.cos(t) * b / 2, c.y + Math.sin(t) * h / 2));
    }
    pts.push(plus(spets, ggr(nn, 1)));
    p.form(pts, null);
  }
  const s = Math.min(h * 0.22, (b - 16) / n / 2.6);
  symboler.forEach((namn, i) => symbolen(p, namn, V(c.x - (n - 1) * s * 1.35 + i * s * 2.7, c.y), s));
}

// En pil för rörelse: en båge med en spets, utan fyllning, som i handritade bilder.
export function pil(p, { fran, till, bage = 0.2, spets = true, tjock = 1 }) {
  const a = V(...fran), b = V(...till), m = plus(ggr(plus(a, b), 0.5), ggr(normal(minus(b, a)), langd(minus(b, a)) * bage));
  const pts = Array.from({ length: 12 }, (_, i) => { const t = i / 11; return plus(plus(ggr(a, (1 - t) ** 2), ggr(m, 2 * t * (1 - t))), ggr(b, t * t)); });
  p.ny().streck(pts, { tjock });
  if (spets) {
    const d = enhet(minus(pts[11], pts[9])), n = normal(d), k = 11;
    p.streck([plus(minus(b, ggr(d, k)), ggr(n, k * 0.7)), b, minus(minus(b, ggr(d, k)), ggr(n, k * 0.7))], { tjock, skak: 0 });
  }
}

// En ring på golvet, streckad och ljus, som visar var eleverna står i en cirkel. Den ritas först, under figurerna.
export function golvring(p, { x, y, rx, ry, streck = 26 }) {
  p.ny();
  for (let i = 0; i < streck; i++) {
    const t0 = (i / streck) * Math.PI * 2, t1 = t0 + (Math.PI * 2 / streck) * 0.55;
    const pts = [0, 0.5, 1].map((k) => { const t = t0 + (t1 - t0) * k; return V(x + Math.cos(t) * rx, y + Math.sin(t) * ry); });
    p.streck(pts, { tjock: 0.7, skak: 0, farg: '#a9a9b2' });
  }
}

// En linje på golvet, streckad och ljus, som linjen mellan två led i Snöbollen.
export function golvlinje(p, { fran, till, streck = 14 }) {
  const a = V(...fran), b = V(...till);
  p.ny();
  for (let i = 0; i < streck; i++) {
    const t0 = i / streck, t1 = t0 + 0.55 / streck;
    p.streck([plus(a, ggr(minus(b, a), t0)), plus(a, ggr(minus(b, a), t1))], { tjock: 0.7, skak: 0, farg: '#a9a9b2' });
  }
}

// En tavla på väggen med en ram och, om scenen vill, rutor eller rader klotter: läraren skriver exempel i två rutor.
export function tavla(p, { x, y, b = 220, h = 120, rutor = 0, rader = 0 }) {
  const c = V(x, y);
  p.ny().form([V(x - b / 2, y - h / 2), V(x + b / 2, y - h / 2), V(x + b / 2, y + h / 2), V(x - b / 2, y + h / 2)], '#f4f6f4', { tjock: 1 });
  for (let i = 0; i < rutor; i++) {
    const bb = (b - 30) / rutor, x0 = x - b / 2 + 15 + i * bb;
    p.form([V(x0 + 5, y - h / 2 + 15), V(x0 + bb - 5, y - h / 2 + 15), V(x0 + bb - 5, y + h / 2 - 15), V(x0 + 5, y + h / 2 - 15)], null, { tjock: 0.7, botten: false });
  }
  for (let i = 0; i < rader; i++) {
    const yy = y - h / 2 + (h / (rader + 1)) * (i + 1), pts = [];
    for (let xx = x - b / 2 + 20; xx < x + b / 2 - 30; xx += 7) pts.push(V(xx, yy + (pts.length % 2 ? -2 : 2)));
    p.streck(pts, { tjock: 0.6, skak: 0 });
  }
  return c;
}

// En tärning, sedd snett ovanifrån, med prickarna på ovansidan.
export function tarning(p, { x, y, s = 22, farg = '#ffffff', prickar = 3 }) {
  const a = V(x - s / 2, y - s / 4), b = V(x, y - s / 2), c = V(x + s / 2, y - s / 4), d = V(x, y);
  p.ny().form([a, b, c, d], farg, { tjock: 0.85 });
  p.form([a, d, V(d.x, d.y + s * 0.6), V(a.x, a.y + s * 0.6)], farg, { tjock: 0.85 });
  p.form([d, c, V(c.x, c.y + s * 0.6), V(d.x, d.y + s * 0.6)], farg, { tjock: 0.85 });
  const m = V(x, y - s / 4);
  const lagen = { 1: [[0, 0]], 2: [[-0.25, 0], [0.25, 0]], 3: [[-0.28, 0.05], [0, 0], [0.28, -0.05]] }[prickar] || [[0, 0]];
  for (const [dx, dy] of lagen) p.prick(ellips(V(m.x + dx * s, m.y + dy * s), s * 0.07, s * 0.05, { n: 8 }), '#2b2b2e');
}

// En markör, som en bricka eller ett talkort: en liten rund platta i en färg.
export function markor(p, { x, y, r = 9, farg = '#e0566e' }) {
  p.ny().form(ellips(V(x, y), r, r * 0.62, { n: 12 }), farg, { tjock: 0.8, glid: 0.3 });
}

// Rörelsestreck bakom en sak i luften, och små strålar runt en high five.
export function rorelse(p, { x, y, riktning = 0, langd: l = 22, antal = 3 }) {
  const d = rikt(riktning), n = normal(d);
  p.ny();
  for (let i = 0; i < antal; i++) {
    const o = (i - (antal - 1) / 2) * 7;
    const a = plus(V(x, y), ggr(n, o));
    p.streck([a, plus(a, ggr(d, l * (i === 1 ? 1 : 0.7)))], { tjock: 0.7, skak: 0 });
  }
}

export function stralar(p, { x, y, r = 22, antal = 7 }) {
  p.ny();
  for (let i = 0; i < antal; i++) {
    const d = rikt(110 + (i * 140) / (antal - 1) + 0);
    p.streck([plus(V(x, y), ggr(d, r)), plus(V(x, y), ggr(d, r * 1.45))], { tjock: 0.75, skak: 0 });
  }
}
