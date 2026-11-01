// Sakerna i strukturernas bilder (K-650): bord, papper, pappersbollar, kort, pennor, en klocka, pilar för rörelse
// och bubblor med symboler i stället för ord. Allt ritas med samma penna som figurerna.
import { V, plus, minus, ggr, rikt, vrid, ellips, enhet, normal, langd, slump } from './penna.mjs';

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
// På ett papper med rutnät står raderna i rutorna (önskemål A efter omtaget): `rader` är ett tal för alla rutor eller en
// lista med ett tal per ruta, rad för rad, som [3, 1] för en full vänsterspalt och en nästan tom högerspalt. Utan `rader`
// är rutorna tomma, som förut. Rutan med symbolen får inga rader.
export function papper(p, { x, y, b = 46, h = 34, vinkel = 0, rader, farg = null, rutor = 0, symbol = null, symbolStorlek = 0.2, symbolPlats = [-0.22, 0], rutnat = null }) {
  rader ??= rutnat ? 0 : 3;
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
  if (rutnat) {
    const [k, r] = rutnat, rb = b / k, rh = h / r;
    for (let j = 0; j < r; j++) for (let i = 0; i < k; i++) {
      const n = Array.isArray(rader) ? rader[j * k + i] ?? 0 : rader;
      const x0 = -b / 2 + i * rb, y0 = -h / 2 + j * rh;
      // Rutan där symbolen står får inga rader.
      if (!n || (symbol && b * symbolPlats[0] > x0 && b * symbolPlats[0] < x0 + rb && h * symbolPlats[1] > y0 && h * symbolPlats[1] < y0 + rh)) continue;
      klotter(p, c, vinkel, x0 + rb * 0.14, x0 + rb * 0.86, y0, rh, n);
    }
    return;
  }
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

// Rader klotter i en ruta på ett papper: från x0 till x1 och i höjden från y0 och rh nedåt, räknat från papperets mitt
// c, vridet med papperet. Den sista raden är kortare, som när en text slutar.
function klotter(p, c, vinkel, x0, x1, y0, rh, n) {
  const steg = Math.max(3, Math.min(5, (x1 - x0) / 6));
  for (let i = 0; i < n; i++) {
    const yy = y0 + (rh / (n + 1)) * (i + 1);
    const slut = i === n - 1 && n > 1 ? x0 + (x1 - x0) * 0.55 : x1;
    const pts = [];
    for (let xx = x0; xx < slut; xx += steg) pts.push(vrid(V(c.x + xx, c.y + yy + (pts.length % 2 ? -1.4 : 1.4)), c, vinkel));
    if (pts.length > 1) p.streck(pts, { tjock: 0.55, skak: 0 });
  }
}

// En pappersboll, en skrynklig klump med veck. Varje boll har sin form och sina veck ur ett eget frö (`fro`, annars
// bollens plats), så att bollarna i en hög inte ser stämplade ut (önskemål D efter omtaget, som referensen 1-snobollen).
// Kanten går in och ut runt bollen, och vecken är korta brutna linjer från kanten in mot mitten, åt olika håll, så att
// de inte ser ut som ett ansikte (granskningen av omgång C och D).
export function boll(p, { x, y, r = 13, farg = '#efc65a', fro = null }) {
  const s = slump(fro ?? `boll ${Math.round(x)} ${Math.round(y)} ${r}`);
  const c = V(x, y), n = 9 + Math.floor(s() * 4), vrid0 = s() * 360, platt = s.mellan(0.82, 0.96);
  const pts = Array.from({ length: n }, (_, i) => {
    const t = ((i + s.mellan(-0.25, 0.25)) / n) * 360 + vrid0;
    const k = (i % 2 ? s.mellan(0.8, 0.92) : s.mellan(0.98, 1.12));
    const d = rikt(t);
    return plus(c, V(d.x * r * k, d.y * r * k * platt));
  });
  p.ny().form(pts, farg, { tjock: 0.85 });
  const antal = 2 + Math.floor(s() * 3);
  const start = s() * 360;
  for (let i = 0; i < antal; i++) {
    const t = start + (i * 360) / antal + s.mellan(-30, 30);
    const a = plus(c, ggr(rikt(t), r * s.mellan(0.5, 0.75)));
    const b = plus(c, ggr(rikt(t + s.mellan(-50, 50)), r * s.mellan(0.05, 0.3)));
    const knack = plus(ggr(plus(a, b), 0.5), ggr(normal(minus(b, a)), r * s.mellan(-0.18, 0.18)));
    p.streck(s() < 0.5 ? [a, knack, b] : [a, b], { tjock: 0.55, skak: 0 });
  }
}

// Ett kort, som en lapp med en symbol på.
export function kort(p, { x, y, b = 28, h = 38, vinkel = 0, farg = '#ffffff', symbol = null }) {
  const c = V(x, y);
  p.ny().form([V(-b / 2, -h / 2), V(b / 2, -h / 2), V(b / 2, h / 2), V(-b / 2, h / 2)].map((q) => vrid(plus(c, q), c, vinkel)), farg, { tjock: 0.85 });
  if (symbol) symbolen(p, symbol, c, Math.min(b, h) * 0.32);
}

// En penna, från spetsen och åt ett håll. `bredd` är pennans tjocklek (förval 7,2), som Kloka pennans stora penna
// (önskemål P efter omtaget). En tjock penna får den vässade spetsen i träets färg och stiftet mörkt, och ett
// suddgummi i änden, så att den syns som en penna och inte som en pinne.
export function penna(p, { x, y, vinkel = 200, l = 40, farg = '#efc65a', bredd = 7.2 }) {
  const s = V(x, y), d = rikt(vinkel), n = normal(d), w = bredd / 2;
  const spets = s, a = plus(s, ggr(d, 9 * (bredd / 7.2))), b = plus(s, ggr(d, l));
  if (bredd < 12) {
    p.ny().form([spets, plus(a, ggr(n, w)), plus(b, ggr(n, w)), minus(b, ggr(n, w)), minus(a, ggr(n, w))], farg, { tjock: 0.75, glid: 0.3 });
    return;
  }
  const gummi = minus(b, ggr(d, Math.min(l * 0.14, bredd * 1.1)));
  p.ny().form([plus(a, ggr(n, w)), plus(gummi, ggr(n, w)), minus(gummi, ggr(n, w)), minus(a, ggr(n, w))], farg, { tjock: 0.85, glid: 0.3 });
  p.form([plus(gummi, ggr(n, w)), plus(b, ggr(n, w * 0.92)), minus(b, ggr(n, w * 0.92)), minus(gummi, ggr(n, w))], '#f2b9c6', { tjock: 0.85, glid: 0.3 });
  p.form([spets, plus(a, ggr(n, w)), minus(a, ggr(n, w))], '#f1dcbf', { tjock: 0.85, glid: 0.2 });
  const stift = plus(s, ggr(d, 9 * (bredd / 7.2) * 0.32));
  p.form([spets, plus(stift, ggr(n, w * 0.32)), minus(stift, ggr(n, w * 0.32))], '#3c3c42', { tjock: 0.6, glid: 0 });
}

// En klocka med visare. `tid` är den del av varvet som har gått, från tolv och medsols till visaren, som en fylld
// tårtbit, så att det syns att tiden går och är bestämd (önskemål G efter omtaget, för PPT – Par på tid). Utan `tid`
// har klockan två visare.
export function klocka(p, { x, y, r = 20, tid = null, farg = '#e56b82' }) {
  const c = V(x, y);
  p.ny().form(ellips(c, r, r, { n: 20 }), '#f3dc8e');
  if (tid == null) {
    p.streck([c, V(x, y - r * 0.65)], { tjock: 0.9, skak: 0 });
    p.streck([c, V(x + r * 0.45, y + r * 0.1)], { tjock: 0.9, skak: 0 });
    return;
  }
  const del = Math.max(0.02, Math.min(1, tid)), n = Math.max(3, Math.ceil(del * 24));
  const kant = (k) => plus(c, ggr(rikt(180 - k * del * 360), r * 0.8));
  p.form([c, ...Array.from({ length: n + 1 }, (_, i) => kant(i / n))], farg, { botten: false, tjock: 0.7, glid: 0.2 });
  p.streck([c, kant(1)], { tjock: 1.1, skak: 0 });
  p.prick(ellips(c, r * 0.06, r * 0.06, { n: 8 }), '#3c3c42');
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
    // En vante med tummen ut åt sidan och en kort handled, en enda form, så att den syns som en hand också i 16
    // punkter (önskemål F efter omtaget: fem smala fingrar blev en kam i liten storlek).
    const pts = [V(-0.34, 0.95), V(-0.36, 0.45), V(-0.5, 0.3), V(-0.78, 0.02), V(-0.82, -0.2), V(-0.66, -0.26), V(-0.46, -0.04),
      V(-0.48, -0.42), V(-0.36, -0.8), V(0, -0.96), V(0.36, -0.82), V(0.52, -0.4), V(0.5, 0.15), V(0.38, 0.45), V(0.36, 0.95)];
    p.form(pts.map((q) => plus(c, ggr(q, s))), f || '#f1c9b8', { botten: false, tjock: 0.6, glid: 0 });
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
// `tjock` är strecket i delar av linjens bredd (förval 0,7); ett tjockare streck blir också lite mörkare, så att ringen
// eller linjen syns tydligt (önskemål B efter omtaget, i stället för tre linjer bredvid varandra).
const golvfarg = (tjock) => (tjock > 1.2 ? '#97979f' : '#a9a9b2');
export function golvring(p, { x, y, rx, ry, streck = 26, tjock = 0.7, farg = golvfarg(tjock) }) {
  p.ny();
  for (let i = 0; i < streck; i++) {
    const t0 = (i / streck) * Math.PI * 2, t1 = t0 + (Math.PI * 2 / streck) * 0.55;
    const pts = [0, 0.5, 1].map((k) => { const t = t0 + (t1 - t0) * k; return V(x + Math.cos(t) * rx, y + Math.sin(t) * ry); });
    p.streck(pts, { tjock, skak: 0, farg });
  }
}

// En linje på golvet, streckad och ljus, som linjen mellan två led i Snöbollen. `tjock` som på golvringen.
export function golvlinje(p, { fran, till, streck = 14, tjock = 0.7, farg = golvfarg(tjock) }) {
  const a = V(...fran), b = V(...till);
  p.ny();
  for (let i = 0; i < streck; i++) {
    const t0 = i / streck, t1 = t0 + 0.55 / streck;
    p.streck([plus(a, ggr(minus(b, a), t0)), plus(a, ggr(minus(b, a), t1))], { tjock, skak: 0, farg });
  }
}

// En dörr i en vägg: karmen, öppningen och dörrbladet på glänt, som Lär varandras dörr som eleven just har kommit in
// genom (önskemål E efter omtaget). (x, y) är tröskelns mitt, b karmens bredd och h dess höjd. `glant` är den del av
// öppningen som syns förbi dörrbladet (0 stängd, 1 helt öppen), och `sida` är gångjärnens sida, V eller H. Bladet har
// gått in i rummet bakom, så att dess fria kant är lite kortare, och har ett handtag vid kanten.
export function dorr(p, { x, y, b = 110, h = 230, glant = 0.5, sida = 'V', farg = '#ecd9b4' }) {
  const k = b * 0.08, x0 = x - b / 2 + k, x1 = x + b / 2 - k, topp = y - h + k;
  p.ny().form([V(x - b / 2, y - h), V(x + b / 2, y - h), V(x + b / 2, y), V(x - b / 2, y)], '#ffffff', { tjock: 1 });
  p.form([V(x0, topp), V(x1, topp), V(x1, y), V(x0, y)], '#d8dbe0', { tjock: 0.9 });
  const bredd = (x1 - x0) * Math.max(0, Math.min(1, 1 - glant)), s = sida === 'H' ? -1 : 1;
  const fast = s > 0 ? x0 : x1, fri = fast + s * bredd, kort = (y - topp) * 0.035;
  p.form([V(fast, topp), V(fri, topp + kort), V(fri, y - kort * 0.4), V(fast, y)], farg, { tjock: 0.9 });
  p.form(ellips(V(fri - s * bredd * 0.16, topp + (y - topp) * 0.53), Math.max(2.5, b * 0.035), Math.max(2.5, b * 0.035), { n: 8 }), '#9a9aa2', { tjock: 0.6, glid: 0 });
}

// En mapp, uppslagen med en rygg i mitten och en ficka på högra sidan där papperen sticker upp, eller stängd med
// ryggen till vänster (önskemål F efter omtaget, för Läxkontroll i grupps mapp). (x, y) är mitten, b och h hela
// mappens mått, `blad` antalet papper i fickan och `farg` mappens färg; fickan är en mörkare ton av den.
export function mapp(p, { x, y, b = 160, h = 56, vinkel = 0, farg = '#9bbae0', ficka = '#7f9fd0', uppslagen = true, blad = 2 }) {
  const c = V(x, y);
  const ruta = (x0, y0, x1, y1) => [V(x0, y0), V(x1, y0), V(x1, y1), V(x0, y1)].map((q) => vrid(plus(c, q), c, vinkel));
  const sida = uppslagen ? b / 2 : b;
  const hoger = uppslagen ? 0 : -b / 2;
  p.ny();
  if (uppslagen) p.form(ruta(-b / 2, -h / 2, 0, h / 2), farg, { tjock: 0.9 });
  p.form(ruta(hoger, -h / 2, b / 2, h / 2), farg, { tjock: 0.9 });
  // Papperen i fickan sticker upp över dess kant, lite vridna åt olika håll.
  for (let i = 0; i < blad; i++) {
    const m = hoger + sida * (0.36 + (0.3 * i) / Math.max(1, blad - 1)), bb = sida * 0.56, hh = h * 0.78;
    const v = (i % 2 ? 1 : -1) * (4 + 2 * i);
    const mitt = vrid(plus(c, V(m, -h * 0.06)), c, vinkel);
    papper(p, { x: mitt.x, y: mitt.y, b: bb, h: hh, vinkel: vinkel + v, rader: 3 });
  }
  // Fickan: den nedre delen av sidan, med en sned överkant, framför papperen.
  p.ny().form([V(hoger + sida * 0.06, h * 0.02), V(b / 2 - sida * 0.04, -h * 0.08), V(b / 2 - sida * 0.04, h / 2 - h * 0.06), V(hoger + sida * 0.06, h / 2 - h * 0.06)]
    .map((q) => vrid(plus(c, q), c, vinkel)), ficka, { tjock: 0.85 });
  // Ryggen: i mitten på en uppslagen mapp, till vänster på en stängd.
  const rygg = uppslagen ? 0 : -b / 2 + b * 0.06;
  p.streck([vrid(plus(c, V(rygg, -h / 2)), c, vinkel), vrid(plus(c, V(rygg, h / 2)), c, vinkel)], { tjock: 1.1, skak: 0 });
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
