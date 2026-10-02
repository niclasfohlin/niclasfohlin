// Sagoformen (Skrivkurs: sagoboken, Niclas 2026-10-02): ornamenten till sagornas mallar, ritade som SVG i kod. Niclas:
// "Handlar det om sagor ska de kännas som just de centrala mallarna kommer från Narnia. Snirklar och som kurbits ...
// längs upp i mallen och en drake som är som en ram runt en sida." Allt ritas här ur kurvor: kurbitsens blad som
// rullar in sig, blomman i mitten, slingan längs överkanten, lindormen som ringlar runt sidan och rundlarna vid
// sagans steg. Färgerna är kurbitsmålningens, rött, grönt, blått och ockra, med mörkbrun kontur, nära boksidans.
// Måtten är millimeter. build-docx.js lägger bilderna i tabellceller, så att sidan går att skriva i i Word och Google.
// Ur metodriggens build/sagoform.js (2026-10-02), som riggen delar med sajten (TILL-SAJTEN för Skrivkurs: sagoboken):
// samma kod, men bilderna kommer som SVG-text (sajtens bildbank, public/bildbank/, via Word-filens resurser) och
// typsnittens mått importeras (src/data/typsnitt/glyfer-andika.json och glyfer-cinzel.json, ur Andika och Cinzel, OFL),
// så att ornamenten ritas likadant vid bygget och när Word-filen byggs i webbläsaren. Rättas en form, rättas den i
// riggen också.
import glyferAndika from '../data/typsnitt/glyfer-andika.json';
import glyferCinzel from '../data/typsnitt/glyfer-cinzel.json';

const F = {
  kontur: '#3A2D24', rod: '#B5412F', rodMork: '#8C2A1E', gron: '#4E7A43', gronMork: '#2F5634', gronLjus: '#8DB06A',
  bla: '#3D6B8C', blaMork: '#284B66', blaLjus: '#86AECB', ockra: '#C9922E', guld: '#E3B653', kram: '#F6ECD6', vit: '#FFF9EC',
};
const r1 = (v) => Math.round(v * 10) / 10;
const xy = (p) => `${r1(p[0])} ${r1(p[1])}`;
const linje = (pts) => `M${pts.map(xy).join('L')}`;
const form = (pts) => `${linje(pts)}Z`;

// ---------------------------------------------------------------- kurvor
// Catmull-Rom genom punkterna: mjuka kurvor som går genom varje punkt.
function genom(punkter, n = 24) {
  const P = [punkter[0], ...punkter, punkter[punkter.length - 1]];
  const ut = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      ut.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  ut.push(punkter[punkter.length - 1]);
  return ut;
}
// En logaritmisk spiral kring c: från radien r0 vid vinkeln a0, varv varv åt riktning (1 medsols i SVG), och radien
// gånger krymp för varje varv.
function spiral(c, r0, a0, varv, krymp, riktning = 1, n = 160) {
  const ut = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + riktning * t * varv * 2 * Math.PI, r = r0 * Math.pow(krymp, t * varv);
    ut.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
  }
  return ut;
}
const langder = (pts) => { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; };
// Punkterna jämnt längs kurvan, n delar.
function jamna(pts, n) {
  const L = langder(pts), tot = L[L.length - 1], ut = [];
  let j = 0;
  for (let i = 0; i <= n; i++) {
    const s = (tot * i) / n;
    while (j < L.length - 2 && L[j + 1] < s) j++;
    const f = (s - L[j]) / (L[j + 1] - L[j] || 1);
    ut.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f]);
  }
  return ut;
}
const langd = (pts) => { const L = langder(pts); return L[L.length - 1]; };
// Normalen till vänster om färdriktningen (i SVG, där y går nedåt, är det åt höger sett på pappret när kurvan går uppåt).
function normaler(pts) {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
}
// En form runt kurvan: bredd(s) ger avståndet åt vänster och åt höger, s från 0 till 1 längs kurvan.
function kring(pts, bredd) {
  const n = normaler(pts), v = [], h = [];
  pts.forEach((p, i) => {
    const s = i / (pts.length - 1), [bv, bh] = bredd(s, i);
    v.push([p[0] + n[i][0] * bv, p[1] + n[i][1] * bv]);
    h.push([p[0] - n[i][0] * bh, p[1] - n[i][1] * bh]);
  });
  return [...v, ...h.reverse()];
}
// Del av kurvan, s från a till b.
const del = (pts, a, b) => pts.slice(Math.round(a * (pts.length - 1)), Math.round(b * (pts.length - 1)) + 1);
const spegla = (pts, x0) => pts.map(([x, y]) => [2 * x0 - x, y]);
const flytta = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
const vrid = (pts, c, a) => pts.map(([x, y]) => { const dx = x - c[0], dy = y - c[1]; return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)]; });
const skala = (pts, c, k) => pts.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]);

// ---------------------------------------------------------------- ritning
// Ritningen samlas som former och drag, så att en halva kan speglas till den andra. Konturen är tunn och mörkbrun,
// som penseldragen i en kurbitsmålning.
class Ritning {
  constructor() { this.el = []; }
  yta(pts, fyll, o = {}) { this.el.push({ t: 'yta', pts, fyll, o }); return this; }
  drag(pts, farg, tjock = 0.35, o = {}) { this.el.push({ t: 'drag', pts, farg, tjock, o }); return this; }
  prick(p, r, fyll, o = {}) { this.el.push({ t: 'prick', p, r, fyll, o }); return this; }
  // Speglar det som ritats sedan fran kring den lodräta linjen x = x0 och lägger kopian efter. En inlagd bild (ra)
  // speglas med en transform.
  spegla(x0, fran = 0) {
    const sp = ([x, y]) => [2 * x0 - x, y];
    this.el.push(...this.el.slice(fran).map((e) => (e.t === 'prick' ? { ...e, p: sp(e.p), b: undefined }
      : e.t === 'ra' ? { ...e, svg: `<g transform="translate(${r1(2 * x0)} 0) scale(-1 1)">${e.svg}</g>`, b: [2 * x0 - e.b[2], e.b[1], 2 * x0 - e.b[0], e.b[3]] }
        : { ...e, pts: e.pts.map(sp), b: undefined })));
    return this;
  }
  get antal() { return this.el.length; }
  // Elementen som svg. Drag i följd med samma färg och tjocklek, och ytor utan kontur i följd med samma färg, blir en
  // enda path, så att filen blir liten (ordningen och utseendet är desamma).
  text() {
    const ut = [];
    let grupp = null;
    const stang = () => { if (grupp) { ut.push(grupp.borja + grupp.d.join('') + grupp.sluta); grupp = null; } };
    for (const e of this.el) {
      let nyckel = null, d = null, borja = '', sluta = '';
      if (e.t === 'drag') {
        nyckel = `d|${e.farg}|${e.tjock}|${e.o.opacitet ?? ''}|${e.o.streck ?? ''}`;
        d = linje(e.pts);
        borja = `<path fill="none" stroke="${e.farg}" stroke-width="${e.tjock}" stroke-linecap="round" stroke-linejoin="round"${e.o.opacitet ? ` stroke-opacity="${e.o.opacitet}"` : ''}${e.o.streck ? ` stroke-dasharray="${e.o.streck}"` : ''} d="`;
        sluta = '"/>';
      } else if (e.t === 'yta' && e.o.kontur === false) {
        nyckel = `y|${e.fyll}|${e.o.opacitet ?? ''}`;
        d = form(e.pts);
        borja = `<path fill="${e.fyll}"${e.o.opacitet ? ` fill-opacity="${e.o.opacitet}"` : ''} d="`;
        sluta = '"/>';
      }
      if (nyckel) {
        if (grupp && grupp.nyckel === nyckel) grupp.d.push(d);
        else { stang(); grupp = { nyckel, d: [d], borja, sluta }; }
        continue;
      }
      stang();
      if (e.t === 'yta') ut.push(`<path d="${form(e.pts)}" fill="${e.fyll}" stroke="${e.o.kontur ?? F.kontur}" stroke-width="${e.o.tjock ?? 0.35}" stroke-linejoin="round"${e.o.opacitet ? ` fill-opacity="${e.o.opacitet}"` : ''}/>`);
      else if (e.t === 'prick') ut.push(`<circle cx="${r1(e.p[0])}" cy="${r1(e.p[1])}" r="${Math.round(e.r * 100) / 100}" fill="${e.fyll}"${e.o.kontur ? ` stroke="${e.o.kontur}" stroke-width="${e.o.tjock ?? 0.3}"` : ''}/>`);
      else if (e.t === 'ra') ut.push(e.svg);
    }
    stang();
    return ut.join('');
  }
  svg(x, y, b, h) { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r1(x)} ${r1(y)} ${r1(b)} ${r1(h)}" width="${r1(b)}mm" height="${r1(h)}mm">${this.text()}</svg>`; }
}

// En form runt kurvan med rundad ände: som kring, och en halvcirkel runt den sista punkten.
function kringRund(pts, bredd) {
  const n = normaler(pts), v = [], h = [];
  pts.forEach((p, i) => {
    const s = i / (pts.length - 1), [bv, bh] = bredd(s, i);
    v.push([p[0] + n[i][0] * bv, p[1] + n[i][1] * bv]);
    h.push([p[0] - n[i][0] * bh, p[1] - n[i][1] * bh]);
  });
  const sist = pts.length - 1, p = pts[sist], [bv, bh] = bredd(1, sist), nn = n[sist], t = [nn[1], -nn[0]];
  const bage = [];
  for (let k = 1; k < 12; k++) { const a = (k / 12) * Math.PI, r = bv * (1 - k / 12) + bh * (k / 12); bage.push([p[0] + r * (Math.cos(a) * nn[0] + Math.sin(a) * t[0]), p[1] + r * (Math.cos(a) * nn[1] + Math.sin(a) * t[1])]); }
  return [...v, ...bage, ...h.reverse()];
}
// En kvadratisk båge från a till b, med toppen hojd ut åt vänster om färdriktningen.
function bage(a, b, hojd, n = 10) {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  const k = [m[0] - (dy / l) * hojd * 2, m[1] + (dx / l) * hojd * 2];
  const ut = [];
  for (let i = 0; i <= n; i++) { const t = i / n; ut.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * k[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * k[1] + t * t * b[1]]); }
  return ut;
}

// Kurbitsbladet: ett fylligt blad som sveper ut från foten och rullar in sig. Kurvan går från foten till spiralens slut.
// c: spiralens mitt, r0: radien där spiralen börjar, a0: vinkeln dit, riktning 1 medsols på pappret. bredd: bladets
// största bredd. bage böjer stjälken mellan foten och spiralen. Bladet har flikar på utsidan, en ljus åder på
// insidan och vita penseldrag, fjädrar, från utsidan in, som i dalmålning.
function kurbitsblad(R, { fot, c, r0, a0, varv = 0.9, riktning = 1, bredd = 5, farg = F.gron, ljus = F.gronLjus, krymp = 0.5, flikar = 4, bage: bj = 0.15, fjadrar = true, slut = 0.42 }) {
  const sp = spiral(c, r0, a0, varv, krymp, riktning, 140);
  const start = sp[0], tx = sp[1][0] - sp[0][0], ty = sp[1][1] - sp[0][1], tl = Math.hypot(tx, ty) || 1;
  const bak = [start[0] - (tx / tl) * r0 * 0.7, start[1] - (ty / tl) * r0 * 0.7];
  const dx = bak[0] - fot[0], dy = bak[1] - fot[1];
  const mitt = [(fot[0] + bak[0]) / 2 - dy * bj, (fot[1] + bak[1]) / 2 + dx * bj];
  const kurva = jamna([...genom([fot, mitt, bak, start], 12).slice(0, -1), ...sp], 260);
  const n = normaler(kurva);
  const k = Math.round((kurva.length - 1) * 0.8);
  const inre = Math.sign(n[k][0] * (c[0] - kurva[k][0]) + n[k][1] * (c[1] - kurva[k][1])) || 1;
  const profil = (s) => (s < 0.3 ? Math.pow(Math.sin(((s + 0.02) / 0.32) * Math.PI / 2), 0.9) : 1 - ((s - 0.3) / 0.7) * (1 - slut));
  const flik = (s) => (flikar && s > 0.1 && s < 0.78 ? 1 + 0.13 * Math.abs(Math.sin(((s - 0.1) / 0.68) * Math.PI * flikar)) : 1);
  const sidor = (s) => { const b = bredd * profil(s), ut = b * 0.6 * flik(s), inn = b * 0.4; return inre > 0 ? [inn, ut] : [ut, inn]; };
  R.yta(kringRund(kurva, sidor), farg);
  // Ådern: en ljus rand längs insidan.
  const a = del(kurva, 0.05, 0.97);
  R.yta(kring(a, (s) => { const b = bredd * profil(0.05 + s * 0.92); return inre > 0 ? [b * 0.33, -b * 0.06] : [-b * 0.06, b * 0.33]; }), ljus, { kontur: false });
  // Fjädrarna: korta vita drag från utsidan in, lutade mot spetsen, ungefär en millimeter isär.
  if (fjadrar) {
    const L = langd(kurva), steg = Math.max(0.005, 1.35 / L);
    for (let s = 0.14; s < 0.74; s += steg) {
      const i = Math.round(s * (kurva.length - 1)), p = kurva[i], nn = n[i], j = Math.min(kurva.length - 1, i + 3);
      const t = [kurva[j][0] - p[0], kurva[j][1] - p[1]], tl = Math.hypot(...t) || 1;
      const [bv, bh] = sidor(s), ut = inre > 0 ? bh : bv, u = -inre;
      // Draget är längst en bit in på bladet och kortare mot spetsen.
      const lang = 0.62 - 0.5 * Math.max(0, (s - 0.3) / 0.44);
      const fran = [p[0] + nn[0] * u * ut * 0.84, p[1] + nn[1] * u * ut * 0.84];
      const mitt = [p[0] + nn[0] * u * ut * (0.84 - lang * 0.5) + (t[0] / tl) * ut * 0.12, p[1] + nn[1] * u * ut * (0.84 - lang * 0.5) + (t[1] / tl) * ut * 0.12];
      const till = [p[0] + nn[0] * u * ut * (0.84 - lang) + (t[0] / tl) * ut * 0.3, p[1] + nn[1] * u * ut * (0.84 - lang) + (t[1] / tl) * ut * 0.3];
      R.drag([fran, mitt, till], F.vit, 0.2, { opacitet: 0.8 });
    }
  }
  return kurva;
}

// En tulpan: tre kronblad på en kort stjälk, i rött med gult hjärta. p är blommans fot, a vinkeln (0 rakt upp).
function tulpan(R, p, storlek, a = 0, farg = F.rod, hjarta = F.guld) {
  const k = storlek / 10;
  const f = (pts) => vrid(flytta(skala(pts, [0, 0], k), p[0], p[1]), p, a);
  R.yta(f(genom([[0, 0], [-4, -2.6], [-5.4, -8.6], [-2.4, -7], [0, -10.6], [2.4, -7], [5.4, -8.6], [4, -2.6], [0, 0]], 8)), farg);
  R.yta(f(genom([[0, -1.4], [-1.7, -4.2], [0, -8.4], [1.7, -4.2], [0, -1.4]], 8)), hjarta, { tjock: 0.25 });
  R.drag(f(genom([[-3.6, -6.9], [-3.1, -4.6], [-2.2, -3]], 6)), F.vit, 0.4, { opacitet: 0.9 });
}

// En knopp: en droppe med en liten krona.
function knopp(R, p, storlek, a = 0, farg = F.bla, hjarta = F.ockra) {
  const k = storlek / 10;
  const f = (pts) => vrid(flytta(skala(pts, [0, 0], k), p[0], p[1]), p, a);
  R.yta(f(genom([[0, 0], [-3.4, -4], [-2.6, -8], [0, -10], [2.6, -8], [3.4, -4], [0, 0]], 8)), farg);
  R.yta(f(genom([[0, -2.4], [-1.5, -5], [0, -7.6], [1.5, -5], [0, -2.4]], 8)), hjarta, { tjock: 0.25 });
}

// Tre bär i en klase.
function bar(R, p, r, farg = F.rodMork) {
  for (const [dx, dy] of [[0, 0], [-1.7, -1.5], [1.7, -1.5]]) { R.prick([p[0] + dx * r, p[1] + dy * r], r, farg, { kontur: F.kontur, tjock: 0.22 }); R.prick([p[0] + dx * r - r * 0.3, p[1] + dy * r - r * 0.3], r * 0.28, F.vit); }
}

// Kurbitsrosen i mitten: en kopp med bågad kant i lager, ett högt blått kronblad och två ockra bakom, och två gröna
// blad som rullar ut åt sidorna vid foten. p är rosens fot, h dess höjd.
function kurbitsros(R, p, h) {
  const k = h / 30;
  const T = (pts) => flytta(skala(pts, [0, 0], k), p[0], p[1]);
  // Foderbladen, som rullar ut och ned.
  for (const s of [-1, 1]) kurbitsblad(R, { fot: T([[s * 0.4, -1.2]])[0], c: T([[s * 11.6, -6.4]])[0], r0: 5.2 * k, a0: -Math.PI * 0.62 + (s < 0 ? -Math.PI * -0.24 : 0), varv: 0.8, riktning: s, bredd: 4.4 * k, farg: F.gron, ljus: F.gronLjus, bage: 0.12 * s, flikar: 2 });
  // Kronbladen bakom koppen.
  for (const s of [-1, 1]) {
    const pts = T(genom([[s * 2, -14], [s * 6.5, -19], [s * 9.6, -24.5], [s * 7.2, -23.8], [s * 5.4, -25.6], [s * 4.4, -21], [s * 1, -17]], 8));
    R.yta(pts, F.ockra);
    R.drag(T(genom([[s * 3.5, -17], [s * 6.2, -20.6], [s * 7.8, -23]], 6)), F.vit, 0.35, { opacitet: 0.9 });
  }
  R.yta(T(genom([[0, -13], [-3.6, -18], [-3.4, -24], [-1.2, -27.4], [0, -30], [1.2, -27.4], [3.4, -24], [3.6, -18], [0, -13]], 8)), F.bla);
  R.yta(T(genom([[0, -16], [-1.3, -20], [-0.8, -24.5], [0, -26.6], [0.8, -24.5], [1.3, -20], [0, -16]], 8)), F.blaLjus, { kontur: false });
  // Koppen: sidorna och fyra bågar överst.
  const kopp = (skal, mitt) => {
    const dipp = [-9.4, -4.7, 0, 4.7, 9.4].map((x) => [x, -18.4 + Math.abs(x) * 0.08]);
    const topp = [];
    for (let i = 0; i < 4; i++) topp.push(...bage(dipp[i], dipp[i + 1], -1.55 - (i === 1 || i === 2 ? 0.35 : 0), 10).slice(i ? 1 : 0));
    const pts = [...genom([[0, -1.2], [-5.5, -3.6], [-9.4, -9.5], [-10.4, -14.5], [-9.4, -18.4]], 8), ...topp.slice(1), ...genom([[9.4, -18.4], [10.4, -14.5], [9.4, -9.5], [5.5, -3.6], [0, -1.2]], 8).slice(1)];
    return T(skala(pts, mitt, skal));
  };
  R.yta(kopp(1, [0, -2]), F.rod);
  R.yta(kopp(0.8, [0, -1]), F.guld, { tjock: 0.3 });
  R.yta(kopp(0.62, [0, 0]), F.rodMork, { tjock: 0.3 });
  // Solfjädern: ljusa strålar från foten upp i koppen.
  for (const x of [-4.4, -2.2, 0, 2.2, 4.4]) R.drag(T(genom([[x * 0.15, -2.6], [x * 0.6, -7], [x, -10.6]], 6)), F.kram, 0.42);
  // Pärlor på bågarna.
  for (const x of [-7, -2.35, 2.35, 7]) R.prick(T([[x, -19.3 - (Math.abs(x) < 3 ? 0.35 : 0)]])[0], 0.5 * k, F.vit);
  for (const s of [-1, 1]) R.drag(T(genom([[s * 8.2, -6.6], [s * 9.4, -11.5], [s * 8.8, -15.6]], 6)), F.vit, 0.45, { opacitet: 0.9 });
}

// ---------------------------------------------------------------- utsnitt
// En del av ritningen som egen svg: bara formerna som syns i rutan följer med, så att varje bit av ramen blir liten.
function grans(e) {
  if (e.b) return e.b;
  const pts = e.t === 'prick' ? [[e.p[0] - e.r, e.p[1] - e.r], [e.p[0] + e.r, e.p[1] + e.r]] : e.pts;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  e.b = [x0, y0, x1, y1];
  return e.b;
}
Ritning.prototype.utsnitt = function (x, y, b, h) {
  const m = 1.5;
  const synliga = this.el.filter((e) => { const [x0, y0, x1, y1] = grans(e); return x1 >= x - m && x0 <= x + b + m && y1 >= y - m && y0 <= y + h + m; });
  const kopia = new Ritning();
  kopia.el = synliga;
  return kopia.svg(x, y, b, h);
};
// Lägger en annan ritning på den här, flyttad dx, dy.
Ritning.prototype.lagg = function (R2, dx = 0, dy = 0) {
  const f = ([x, y]) => [x + dx, y + dy];
  this.el.push(...R2.el.map((e) => (e.t === 'prick' ? { ...e, p: f(e.p), b: undefined }
    : e.t === 'ra' ? { ...e, svg: `<g transform="translate(${r1(dx)} ${r1(dy)})">${e.svg}</g>`, b: [e.b[0] + dx, e.b[1] + dy, e.b[2] + dx, e.b[3] + dy] }
      : { ...e, pts: e.pts.map(f), b: undefined })));
  return this;
};

// Slingan ritad i en ritning, med övre vänstra hörnet i x0, y0. Delarna längs rankan kommer med så långt bredden räcker:
// först bladet närmast rosen och tulpanen, sedan det blå bladet och bären, sist det lilla bladet och knoppen.
function ritaSlinga(R, x0, y0, bredd, hojd, o = {}) {
  const S = new Ritning();
  const mitt = bredd / 2, bas = hojd * 0.74, h = hojd;
  if (o.bard !== false) {
    S.drag([[3, hojd - 1.6], [bredd - 3, hojd - 1.6]], F.rodMork, 0.6);
    S.drag([[3, hojd - 0.6], [bredd - 3, hojd - 0.6]], F.ockra, 0.3);
  }
  const fran = S.antal;
  const x = (f) => mitt + f * h;
  const rum = (mitt - 2) / h;
  const slut = Math.min(rum - 0.05, 2.75);
  const stjalk = jamna(genom([[x(0.05), bas], [x(Math.min(0.7, slut * 0.4)), bas + 0.03 * h], [x(Math.min(1.5, slut * 0.7)), bas - 0.02 * h], [x(slut), bas - 0.03 * h]], 10), 120);
  S.yta(kring(stjalk, (s) => [0.5 * (1 - s * 0.6), 0.5 * (1 - s * 0.6)]), F.gronMork, { tjock: 0.2 });
  kurbitsblad(S, { fot: [x(0.12), bas - 0.02 * h], c: [x(0.62), bas - 0.42 * h], r0: 0.27 * h, a0: Math.PI / 2, varv: 0.95, riktning: -1, bredd: 0.21 * h, farg: F.gron, ljus: F.gronLjus, flikar: 4, bage: -0.12 });
  if (rum >= 1.28) tulpan(S, [x(1.05), bas - 0.06 * h], 0.38 * h, 0.32, F.rod);
  if (rum >= 2.0) {
    kurbitsblad(S, { fot: [x(1.12), bas + 0.01 * h], c: [x(1.62), bas - 0.36 * h], r0: 0.25 * h, a0: Math.PI / 2, varv: 0.95, riktning: -1, bredd: 0.19 * h, farg: F.bla, ljus: F.blaLjus, flikar: 4, bage: -0.12 });
    bar(S, [x(2.0), bas - 0.2 * h], 0.045 * h);
  }
  if (rum >= 2.66) kurbitsblad(S, { fot: [x(2.05), bas + 0.01 * h], c: [x(2.38), bas - 0.27 * h], r0: 0.17 * h, a0: Math.PI / 2, varv: 0.9, riktning: -1, bredd: 0.13 * h, farg: F.gron, ljus: F.gronLjus, flikar: 3, bage: -0.12 });
  if (rum >= 2.9) knopp(S, [x(2.72), bas - 0.04 * h], 0.26 * h, 1.2, F.rod, F.guld);
  S.spegla(mitt, fran);
  kurbitsros(S, [mitt, hojd - 2.6], hojd - 3.6);
  return R.lagg(S, x0, y0);
}
function kurbitsslinga(bredd, hojd, o = {}) { return ritaSlinga(new Ritning(), 0, 0, bredd, hojd, o).svg(0, 0, bredd, hojd); }

// ---------------------------------------------------------------- lindormen
// Lindormen, sagornas drake i Norden, ringlar runt sidan som en ram (Niclas: "en drake som är som en ram runt en
// sida"). Huvudet står uppe till vänster och tittar in mot rubriken, kroppen går ned längs vänster kant, längs
// nederkanten och upp längs höger kant, och svansen rullar in sig uppe till höger och slutar i ett blad. Frambenet
// håller i sidans övre kant; en lindorm har bara framben. Ryggen med taggar och fjäll vetter utåt och den gula buken
// inåt, mot texten. Mellan huvudet och svansen står kurbitsslingan. bredd och hojd: ramens mått i mm. o.kant:
// avståndet från ramens kant till kroppens mitt; o.topp: höjden på ramens översta rad, där huvudet och slingan står.

// Kroppen ritas i stycken som överlappar, så att en bit av ramen bara behöver styckena den visar.
function stycken(n, langdBit, overlapp = 3) {
  const ut = [];
  for (let a = 0; a < n - 1; a += langdBit) ut.push([Math.max(0, a - overlapp), Math.min(n - 1, a + langdBit + overlapp)]);
  return ut;
}

function lindorm(bredd, hojd, o = {}) {
  const R = new Ritning();
  const k = o.kant ?? 9.5, topp = o.topp ?? 44;
  // Skarvarna mellan bitarna i ramen: { axel: 'x' eller 'y', varde: läget i mm, fran: där skarven börjar längs den andra axeln }.
  const skarvar = o.skarvar ?? [];
  const xV = k, xH = bredd - k, yN = hojd - k;
  const v = (y) => Math.sin(y / 17) * 0.9;
  const sidan = (fran, till, steg) => { const ut = []; for (let y = fran; fran < till ? y < till : y > till; y += steg) ut.push(y); return ut; };
  const mittlinje = genom([
    [22.5, topp - 13], [15, topp - 5], [xV + 0.4, topp + 8],
    ...sidan(topp + 32, yN - 28, 25).map((y) => [xV + v(y), y]),
    [xV + 0.6, yN - 16], [xV + 6, yN - 4.5], [xV + 18, yN - 0.3],
    ...sidan(xV + 45, xH - 30, 25).map((x) => [x, yN + v(x) * 0.8]),
    [xH - 18, yN - 0.3], [xH - 6, yN - 4.5], [xH - 0.6, yN - 16],
    ...sidan(yN - 40, topp + 14, -25).map((y) => [xH - v(y), y]),
    [xH - 0.3, topp + 8], [xH - 2.2, topp - 4], [xH - 8, topp - 12.5],
  ], 16);
  // Svansen rullar in sig uppe till höger, som ett kurbitsblad.
  const sista = mittlinje[mittlinje.length - 1];
  const c = [xH - 15.5, topp - 19];
  const a0 = Math.atan2(sista[1] - c[1], sista[0] - c[0]);
  const svansSpiral = spiral(c, Math.hypot(sista[0] - c[0], sista[1] - c[1]), a0, 0.78, 0.45, -1, 80);
  const kurva = jamna([...mittlinje, ...svansSpiral.slice(1)], Math.round((langd(mittlinje) + langd(svansSpiral)) / 0.9));
  const N = kurva.length - 1, n = normaler(kurva), L = langd(kurva);
  const iAv = (mm) => Math.max(0, Math.min(N, Math.round((mm / L) * N)));
  // Bredden: smal i nacken, full längs sidorna och tunnare mot svansen. Normalen åt vänster pekar utåt.
  const halv = (i) => {
    const mm = (i / N) * L, svans = L - 140;
    if (mm < 30) return 3.1 + 1.9 * Math.sin((mm / 30) * Math.PI / 2);
    if (mm < svans) return 5;
    return 5 - 4.3 * Math.pow((mm - svans) / 140, 1.25);
  };
  const bitar = stycken(N + 1, 22);
  const band = (fill, ut, inn) => { for (const [a, b] of bitar) R.yta(kring(kurva.slice(a, b + 1), (s, i) => { const h = halv(a + i); return [h * ut, h * inn]; }), fill, { kontur: false }); };
  band(F.gron, 1, 1);
  band(F.gronMork, 1, -0.42);
  band(F.guld, -0.3, 0.98);
  // Bukens plattor.
  for (let mm = 4; mm < L - 30; mm += 2.3) {
    const i = iAv(mm), h = halv(i), p = kurva[i], nn = n[i];
    R.drag([[p[0] - nn[0] * h * 0.32, p[1] - nn[1] * h * 0.32], [p[0] - nn[0] * h * 0.94, p[1] - nn[1] * h * 0.94]], F.ockra, 0.26);
  }
  // Fjällen: små bågar i två rader på ryggen, den andra förskjuten.
  for (let mm = 7; mm < L - 34; mm += 4.4) {
    for (const [forskjut, f] of [[0, 0.18], [2.2, 0.62]]) {
      const i = iAv(mm + forskjut), h = halv(i), p = kurva[i], nn = n[i];
      const t = [kurva[Math.min(N, i + 1)][0] - kurva[Math.max(0, i - 1)][0], kurva[Math.min(N, i + 1)][1] - kurva[Math.max(0, i - 1)][1]];
      const tl = Math.hypot(...t) || 1, tt = [t[0] / tl, t[1] / tl], r = h * 0.21;
      const m = [p[0] + nn[0] * h * f, p[1] + nn[1] * h * f];
      const bagen = [];
      for (let q = 0; q <= 6; q++) { const a = Math.PI * (q / 6); bagen.push([m[0] + nn[0] * Math.cos(a) * r + tt[0] * Math.sin(a) * r * 0.95, m[1] + nn[1] * Math.cos(a) * r + tt[1] * Math.sin(a) * r * 0.95]); }
      R.drag(bagen, F.gronLjus, 0.3);
    }
  }
  // Taggarna längs ryggen: röda, varannan större, från nacken till svansen.
  const naraSkarv = (i) => skarvar.some((sk) => Math.abs((sk.axel === 'y' ? kurva[i][1] : kurva[i][0]) - sk.varde) < 4.5);
  for (let j = 0, mm = 16; mm < L - 64; j++, mm += 7.2) {
    const i = iAv(mm), i2 = iAv(mm + 5), im = iAv(mm + 2.3);
    if (naraSkarv(i) || naraSkarv(i2)) continue;
    const stor = j % 2 ? 2.1 : 2.9;
    const a = [kurva[i][0] + n[i][0] * halv(i) * 0.9, kurva[i][1] + n[i][1] * halv(i) * 0.9];
    const b = [kurva[i2][0] + n[i2][0] * halv(i2) * 0.9, kurva[i2][1] + n[i2][1] * halv(i2) * 0.9];
    const spets = [kurva[im][0] + n[im][0] * (halv(im) + stor), kurva[im][1] + n[im][1] * (halv(im) + stor)];
    R.yta(genom([a, [(a[0] + spets[0]) / 2 + n[im][0] * 0.3, (a[1] + spets[1]) / 2 + n[im][1] * 0.3], spets, b], 5), F.rod, { tjock: 0.3 });
  }
  for (const [a, b] of bitar) for (const sida of [1, -1]) R.drag(kurva.slice(a, b + 1).map((p, i) => { const h = halv(a + i); return [p[0] + n[a + i][0] * h * sida, p[1] + n[a + i][1] * h * sida]; }), F.kontur, 0.42);
  // Skarvarna: där kroppen korsar en skarv mellan två bilder bär lindormen två guldringar med en smal vit springa
  // emellan, mitt på skarven. Word lämnar alltid en hårfin glipa mellan två svg-bilder som möts (prövat 2026-10-02), och
  // den hamnar då i springan i stället för tvärs över kroppen.
  for (const sk of skarvar) {
    for (let i = 1; i <= N; i++) {
      const v0 = sk.axel === 'y' ? kurva[i - 1][1] : kurva[i - 1][0], v1 = sk.axel === 'y' ? kurva[i][1] : kurva[i][0];
      if ((v0 - sk.varde) * (v1 - sk.varde) > 0 || v0 === v1) continue;
      if (sk.fran !== undefined && (sk.axel === 'y' ? kurva[i][0] : kurva[i][1]) < sk.fran) continue;
      const p = kurva[i], h = halv(i);
      const tvars = sk.axel === 'y' ? ([a, b], [c, d]) => [[a, c], [b, c], [b, d], [a, d]] : ([a, b], [c, d]) => [[c, a], [d, a], [d, b], [c, b]];
      const mitt = sk.axel === 'y' ? p[0] : p[1];
      const g = 0.5;
      R.yta(tvars([mitt - h - 3.2, mitt + h + 3.2], [sk.varde - g, sk.varde + g]), '#FFFFFF', { kontur: false });
      for (const sida of [-1, 1]) {
        const fran = sk.varde + sida * g, till = sk.varde + sida * (g + 1.5);
        R.yta(tvars([mitt - h - 0.7, mitt + h + 0.7], [Math.min(fran, till), Math.max(fran, till)]), F.guld, { tjock: 0.35 });
        R.prick(sk.axel === 'y' ? [mitt, (fran + till) / 2] : [(fran + till) / 2, mitt], 0.38, F.rodMork);
      }
    }
  }
  // Svansens spets: en röd tulpan.
  const spets = kurva[N], forS = kurva[N - 5];
  tulpan(R, spets, 6.5, Math.atan2(spets[1] - forS[1], spets[0] - forS[0]) + Math.PI / 2, F.rod, F.guld);
  // Frambenet håller i sidans övre kant. En lindorm har bara framben.
  ben(R, [xV + 2.6, topp - 5], [xV + 21, topp - 4], 1, 1);
  huvud(R, [17, topp - 19.5], 1.22);
  if (o.slinga !== false) {
    const v0 = 17 + 1.22 * 36, h0 = c[0] - 13;
    const sb = Math.min(o.slingbredd ?? 999, h0 - v0), sh = Math.min(o.slinghojd ?? 32, topp - 8);
    ritaSlinga(R, v0 + (h0 - v0 - sb) / 2, topp - 4 - sh, sb, sh, { bard: false });
  }
  return R;
}

// Ett ben med tre klor: från axeln på kroppen över armbågen till foten, där klorna griper om sidans kant. sida 1:
// foten åt höger. upp 1: kanten under foten (frambenet), -1: kanten över foten (bakbenet).
function ben(R, axel, fot, sida, upp) {
  const armbage = [(axel[0] + fot[0]) / 2 - sida * 2, Math.min(axel[1], fot[1]) - upp * 4.2];
  const kurva = jamna(genom([axel, armbage, [fot[0] - sida * 2, fot[1] - upp * 0.6], fot], 10), 50);
  R.yta(kringRund(kurva, (s) => { const b = 3 - 1.3 * s; return [b, b]; }), F.gron, { tjock: 0.42 });
  R.drag(del(kurva, 0.12, 0.85).map((p, i, a) => { const nn = normaler(a)[i]; return [p[0] - nn[0] * 1.3 * upp * sida, p[1] - nn[1] * 1.3 * upp * sida]; }), F.guld, 0.9);
  R.drag(del(kurva, 0.15, 0.6).map((p, i, a) => { const nn = normaler(a)[i]; return [p[0] + nn[0] * 1.4 * upp * sida, p[1] + nn[1] * 1.4 * upp * sida]; }), F.gronMork, 0.7);
  // Klorna: tre krökta spetsar i kräm som går över kanten.
  for (const dx of [-1.6, 0.2, 2]) {
    const b = [fot[0] + sida * (1.2 + dx * 0.4) + dx, fot[1] + upp * 0.6];
    const spets = [b[0] + sida * 0.9, b[1] + upp * 2.6];
    R.yta(genom([[b[0] - 0.75, b[1] - upp * 0.4], [b[0] + sida * 0.8, b[1] + upp * 0.9], spets, [b[0] + 0.15, b[1] + upp * 1.2], [b[0] + 0.75, b[1] - upp * 0.2]], 5), F.kram, { tjock: 0.3 });
  }
}

// Huvudet, från sidan och vänt åt höger: lockig nos, en mun som ler med en tunga ute, runt öga med glans, horn som
// rullar in sig och en blå frill bakom käken. p är nackens fäste och k storleken.
function huvud(R, p, k = 1) {
  const T = (pts) => flytta(skala(pts, [0, 0], k), p[0], p[1]);
  const P = (x, y) => T([[x, y]])[0];
  kurbitsblad(R, { fot: P(3.6, -8.2), c: P(-4, -15.6), r0: 3.9 * k, a0: 0.2, varv: 0.85, riktning: -1, bredd: 2.7 * k, farg: F.guld, ljus: F.kram, flikar: 0, krymp: 0.4, fjadrar: false, slut: 0.5 });
  kurbitsblad(R, { fot: P(7.8, -10.2), c: P(3.2, -18.4), r0: 3.2 * k, a0: 0.4, varv: 0.8, riktning: -1, bredd: 2.3 * k, farg: F.ockra, ljus: F.guld, flikar: 0, krymp: 0.4, fjadrar: false, slut: 0.5 });
  kurbitsblad(R, { fot: P(5, 0), c: P(-4.6, 5.4), r0: 4.3 * k, a0: -Math.PI * 0.4, varv: 0.85, riktning: -1, bredd: 3.8 * k, farg: F.bla, ljus: F.blaLjus, flikar: 3 });
  // Underkäken.
  R.yta(T(genom([[11, 0.6], [16, 1.9], [22, 2.9], [27, 3.5], [28.6, 5], [26.4, 6.6], [20, 6.6], [14, 5.6], [9.6, 3.8], [11, 0.6]], 8)), F.gron, { tjock: 0.42 });
  R.yta(T(genom([[12.6, 4.6], [18, 5.6], [24, 6], [26.2, 5.9], [24.4, 6.5], [18, 6.4], [12.6, 4.6]], 6)), F.guld, { kontur: false });
  // Munnen och tungan.
  R.yta(T(genom([[12.6, -0.2], [18, -0.9], [24, -1.4], [28.6, -1.6], [28.3, 0.8], [27, 2.9], [22, 2.4], [16.4, 1.4], [12.6, -0.2]], 8)), F.rodMork, { tjock: 0.3 });
  R.yta(T(genom([[22.5, 1.4], [27, 1.1], [31, 1.9], [33.4, 0.6], [33.1, 2.5], [34.6, 3.9], [32.4, 3.4], [29.4, 3], [25, 2.6], [22.5, 1.4]], 6)), F.rod, { tjock: 0.28 });
  // Två små huggtänder.
  R.yta(T([[25.2, -1.5], [26.8, -1.6], [26, 0.6]]), F.vit, { tjock: 0.22 });
  R.yta(T([[19.4, 2.2], [20.9, 2.3], [20.3, 0.6]]), F.vit, { tjock: 0.22 });
  // Överhuvudet med nosen som rullar upp i en lock och en mungipa som ler.
  R.yta(T(genom([[-1, -3], [1.5, -8.6], [7, -11.6], [12.5, -11], [17, -8.4], [22.5, -7.4], [27.5, -7.6], [30.2, -9.4], [30.4, -11.8], [28.4, -12.6], [27, -11.2], [28.4, -10.3],
    [29.6, -9.6], [31.8, -7.2], [31.4, -3.6], [29.2, -1.9], [24, -1.5], [18, -1], [13.4, -0.4], [11.4, -1.6], [10.6, -0.4], [8, 1.6], [3, 2.6], [-1, -3]], 9)), F.gron, { tjock: 0.48 });
  R.drag(T(genom([[23, -5.8], [28, -6.2], [29.4, -8.7], [28.6, -10.7]], 8)), F.gronLjus, 0.6);
  R.drag(T(genom([[27.3, -4.5], [28.4, -4.9], [28.6, -3.8], [27.7, -3.5]], 6)), F.kontur, 0.45);
  R.drag(T(spiral([7.2, -2.8], 2.7, Math.PI * 0.9, 1.2, 0.35, 1, 40)), F.gronLjus, 0.6);
  R.prick(P(9.6, 0.4), 1.5 * k, F.rod, { kontur: false });
  // Ögat: runt, med stor pupill, glans och ett mjukt ögonlock.
  R.yta(T(genom([[12.4, -6.6], [13.6, -8.6], [16, -9.1], [18, -7.8], [18.2, -6], [16.4, -4.8], [13.8, -5], [12.4, -6.6]], 8)), F.vit, { tjock: 0.38 });
  R.prick(P(15.9, -6.8), 1.55 * k, F.kontur);
  R.prick(P(16.5, -7.5), 0.5 * k, F.vit);
  R.drag(T(genom([[12, -8.6], [15, -10.5], [18.8, -9.2]], 6)), F.kontur, 0.6);
  // Taggarna i nacken.
  for (const [x, y, a] of [[1.6, -6.8, -2.15], [-0.4, -2.4, -2.55]]) R.yta(T([[x - 1.2 * Math.sin(a + 1.6), y], [x + 3.4 * Math.cos(a), y + 3.4 * Math.sin(a)], [x + 1.2, y + 1.4]]), F.rod, { tjock: 0.3 });
}

// ---------------------------------------------------------------- bilder ur bildbanken
// En bild ur bildbanken (Fluent Emoji, 32 × 32) i ritningen: innehållet utan svg-taggen, flyttat och skalat, så att
// rundlarna och berget har samma bilder som tärningarna.
function bildbank(R, fil, x, y, storlek) {
  const svg = typeof fil === 'string' ? fil : new TextDecoder().decode(fil);
  const vb = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 32 32').split(/\s+/).map(Number);
  const inre = svg.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const k = storlek / vb[2];
  R.el.push({ t: 'ra', svg: `<g transform="translate(${r1(x)} ${r1(y)}) scale(${Math.round(k * 10000) / 10000})">${inre}</g>`, b: [x, y, x + storlek, y + storlek] });
  return R;
}

// ---------------------------------------------------------------- rundeln
// Rundeln vid en station på sagans väg: en ring i guld med små prickar runt om, som pärlorna i en kurbitsmålning, en
// ljus skiva med stationens bild och vägen genom rutan, uppifrån och nedåt, som på Spänningsberget, så att stationerna
// sitter ihop när rutorna står under varandra. bredd och hojd: rutans mått i mm. o.upp och o.ned: stigen fortsätter
// åt det hållet. o.farg: ringens färg.
function rundel(bredd, hojd, fil, o = {}) {
  const R = new Ritning();
  const cx = bredd / 2, cy = o.cy ?? hojd / 2, r = o.r ?? Math.min(bredd, hojd) * 0.36;
  // Stigen: en slingrande prickad väg, bakom rundeln.
  const stig = (fran, till) => {
    const pts = jamna([[cx, fran], [cx, till]], 40);
    R.yta(kring(pts, () => [1.35, 1.35]), F.kram, { kontur: F.ockra, tjock: 0.3 });
    R.drag(pts, F.rodMork, 0.5, { streck: '0.6 1.4' });
  };
  if (o.upp !== false) stig(0, cy - r);
  if (o.ned !== false) stig(cy + r, hojd);
  // Ringen: guld med mörk kontur, sedan en tunn röd ring innanför och pärlor runt om.
  const cirkel = (rr, n = 72) => Array.from({ length: n }, (_, i) => [cx + rr * Math.cos((i / n) * 2 * Math.PI), cy + rr * Math.sin((i / n) * 2 * Math.PI)]);
  R.yta(cirkel(r * 1.0), o.farg ?? F.guld, { tjock: 0.45 });
  for (let i = 0; i < 16; i++) { const a = (i / 16) * 2 * Math.PI; R.prick([cx + r * 0.9 * Math.cos(a), cy + r * 0.9 * Math.sin(a)], r * 0.045, F.rodMork); }
  R.yta(cirkel(r * 0.8), F.vit, { kontur: F.rodMork, tjock: 0.35 });
  if (fil) bildbank(R, fil, cx - r * 0.56, cy - r * 0.56, r * 1.12);
  return R;
}

// ---------------------------------------------------------------- lågorna
// En mätare med fem lågor att färga, för hur spännande en station är. Lågorna har bara kontur, så att eleven kan färga
// dem. bredd och hojd i mm.
function lagor(bredd, hojd, antal = 5) {
  const R = new Ritning();
  const steg = bredd / antal, h = Math.min(hojd * 0.9, steg * 1.25);
  for (let i = 0; i < antal; i++) {
    const x = steg * (i + 0.5), y = hojd - (hojd - h) / 2;
    const k = h / 10;
    const T = (pts) => pts.map(([a, b]) => [x + a * k, y + b * k]);
    R.yta(T(genom([[0, 0], [-3.6, -1.6], [-3.9, -5], [-1.6, -8.2], [-1.2, -6], [0.2, -10], [1.4, -6.8], [2.2, -8], [3.8, -4.6], [3.4, -1.4], [0, 0]], 8)), F.vit, { kontur: F.rodMork, tjock: 0.35 });
    R.yta(T(genom([[0, -1], [-1.5, -2.2], [-1.4, -4.4], [0, -6.2], [1.3, -4.2], [1.3, -2.2], [0, -1]], 6)), F.vit, { kontur: F.ockra, tjock: 0.25 });
  }
  return R.svg(0, 0, bredd, hojd);
}

// ---------------------------------------------------------------- berget
// Spänningsberget: en väg som går från dalen uppför berget till toppen och ned på andra sidan, med en rundel för varje
// station. Stationernas höjd är spänningen i en saga som är byggd efter vägen: lågt i början, en vilopaus vid
// hjälparen och toppen vid det värsta. bredd och hojd i mm; stationer: bildfilerna i ordning.
function berget(bredd, hojd, stationer) {
  const R = new Ritning();
  const n = stationer.length;
  // Stationernas lägen: x jämnt fördelade, y efter spänningen.
  // Toppen står där frågan ”Hur ska det gå?” hör hemma, vid Det värsta i sex steg och vid Problemet i fyra steg, och
  // Lösningen ligger lägre i båda (innehållsrundan 2026-10-02).
  const spanning = n === 6 ? [0.12, 0.42, 0.36, 0.95, 0.55, 0.12] : [0.12, 0.9, 0.55, 0.12];
  const fot = hojd - 8, topp = 14;
  const pos = stationer.map((_, i) => [bredd * (0.1 + (0.8 * i) / (n - 1)), fot - spanning[i] * (fot - topp)]);
  // Bergen bakom: två bleka toppar och berget med snö på toppen.
  const toppen = pos.reduce((a, p) => (p[1] < a[1] ? p : a));
  R.yta([[bredd * 0.02, fot + 4], ...genom([[bredd * 0.08, fot - 6], [bredd * 0.22, fot - 26], [bredd * 0.34, fot - 14]], 8), [bredd * 0.4, fot + 4]], '#E7EDE3', { kontur: false });
  R.yta([[bredd * 0.6, fot + 4], ...genom([[bredd * 0.66, fot - 12], [bredd * 0.83, fot - 30], [bredd * 0.97, fot - 8]], 8), [bredd * 0.99, fot + 4]], '#E7EDE3', { kontur: false });
  const berg = [[toppen[0] - bredd * 0.36, fot + 4], ...genom([[toppen[0] - bredd * 0.3, fot - 4], [toppen[0] - bredd * 0.12, toppen[1] + 18], [toppen[0] - 3, toppen[1] - 6], [toppen[0] + 4, toppen[1] - 7], [toppen[0] + bredd * 0.14, toppen[1] + 20], [toppen[0] + bredd * 0.32, fot - 2]], 10), [toppen[0] + bredd * 0.38, fot + 4]];
  R.yta(berg, '#D9E3D2', { kontur: F.gronMork, tjock: 0.35 });
  // Snön på toppen.
  R.yta(genom([[toppen[0] - 9, toppen[1] + 5], [toppen[0] - 3, toppen[1] - 5.6], [toppen[0] + 4, toppen[1] - 6.4], [toppen[0] + 10, toppen[1] + 6], [toppen[0] + 5, toppen[1] + 3], [toppen[0] + 1, toppen[1] + 7], [toppen[0] - 3, toppen[1] + 3], [toppen[0] - 9, toppen[1] + 5]], 6), F.vit, { kontur: F.gronMork, tjock: 0.3 });
  // Marken: en grön kulle längs foten.
  R.yta([[0, fot + 6], ...genom([[0, fot - 1], [bredd * 0.25, fot + 1.5], [bredd * 0.5, fot - 1], [bredd * 0.75, fot + 1.5], [bredd, fot - 1]], 12), [bredd, fot + 6]], F.gronLjus, { kontur: F.gronMork, tjock: 0.35 });
  // Vägen mellan stationerna: en ljus väg med en röd prickad mittlinje.
  const vag = jamna(genom(pos, 18), 300);
  R.yta(kring(vag, () => [1.8, 1.8]), F.kram, { kontur: F.ockra, tjock: 0.35 });
  R.drag(vag, F.rodMork, 0.55, { streck: '0.7 1.5' });
  // Rundlarna och siffrorna.
  stationer.forEach((fil, i) => {
    const [x, y] = pos[i], r = 7.2;
    const cirkel = (rr) => Array.from({ length: 60 }, (_, j) => [x + rr * Math.cos((j / 60) * 2 * Math.PI), y + rr * Math.sin((j / 60) * 2 * Math.PI)]);
    R.yta(cirkel(r), F.guld, { tjock: 0.4 });
    R.yta(cirkel(r * 0.8), F.vit, { kontur: F.rodMork, tjock: 0.3 });
    bildbank(R, fil, x - r * 0.55, y - r * 0.55, r * 1.1);
    // Numret i en liten röd sköld under rundeln.
    R.yta(genom([[x - 2.6, y + r - 0.6], [x + 2.6, y + r - 0.6], [x + 2.5, y + r + 2.6], [x, y + r + 4.2], [x - 2.5, y + r + 2.6], [x - 2.6, y + r - 0.6]], 4), F.rodMork, { tjock: 0.3 });
    R.el.push({ t: 'ra', svg: siffra(i + 1, x, y + r + 2.3, 3.4), b: [x - 2, y + r, x + 2, y + r + 4] });
  });
  return R.svg(0, 0, bredd, hojd);
}

// Siffror i rundlarnas sköldar, ritade som streck så att de inte behöver ett typsnitt. Formen är enkel och tydlig.
function siffra(n, x, y, h) {
  const S = {
    1: [[[-0.25, -0.3], [0.1, -0.5], [0.1, 0.5]]],
    2: [[[-0.3, -0.25], [-0.1, -0.48], [0.22, -0.45], [0.3, -0.2], [-0.3, 0.5], [0.32, 0.5]]],
    3: [[[-0.3, -0.42], [0.25, -0.45], [0, -0.05], [0.3, 0.15], [0.15, 0.48], [-0.3, 0.42]]],
    4: [[[0.15, 0.5], [0.15, -0.5], [-0.32, 0.18], [0.35, 0.18]]],
    5: [[[0.3, -0.5], [-0.25, -0.5], [-0.28, -0.05], [0.18, -0.05], [0.3, 0.25], [0.12, 0.5], [-0.3, 0.45]]],
    6: [[[0.25, -0.48], [-0.2, -0.2], [-0.3, 0.2], [-0.1, 0.5], [0.22, 0.42], [0.25, 0.05], [-0.28, 0.1]]],
  }[n] ?? [];
  return S.map((pts) => `<path d="${linje(genom(pts.map(([a, b]) => [x + a * h, y + b * h]), 6))}" fill="none" stroke="${F.vit}" stroke-width="${r1(h * 0.16)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
}

// ---------------------------------------------------------------- porträttramen
// En oval ram att rita hjälten i: en dubbel ram i rött och guld med en kurbitsros överst och blad som rullar in sig
// vid foten, som en tavla i en stuga. Inne i ramen är det tomt. bredd och hojd i mm.
function portrattRam(bredd, hojd) {
  const R = new Ritning();
  const cx = bredd / 2, cy = hojd / 2 + 4.5, rx = bredd / 2 - 7, ry = hojd / 2 - 13;
  const oval = (dx, dy) => Array.from({ length: 120 }, (_, i) => { const a = (i / 120) * 2 * Math.PI; return [cx + (rx + dx) * Math.cos(a), cy + (ry + dy) * Math.sin(a)]; });
  // Ramen: en bred guldring mellan två röda linjer, med pärlor i ringen.
  R.yta(oval(3.2, 3.2), F.guld, { kontur: F.rodMork, tjock: 0.5 });
  R.yta(oval(0, 0), F.vit, { kontur: F.rodMork, tjock: 0.45 });
  for (let i = 0; i < 40; i++) { const a = (i / 40) * 2 * Math.PI; R.prick([cx + (rx + 1.6) * Math.cos(a), cy + (ry + 1.6) * Math.sin(a)], 0.42, F.rodMork); }
  // Bladen vid foten och rosen överst.
  for (const s of [-1, 1]) {
    kurbitsblad(R, { fot: [cx, cy + ry + 3], c: [cx + s * 15, cy + ry - 0.5], r0: 5.2, a0: Math.PI / 2, varv: 0.85, riktning: s > 0 ? -1 : 1, bredd: 4.4, farg: s > 0 ? F.gron : F.bla, ljus: s > 0 ? F.gronLjus : F.blaLjus, flikar: 3 });
  }
  tulpan(R, [cx, cy + ry + 4.4], 7.4, 0, F.rod);
  kurbitsros(R, [cx, cy - ry - 0.6], 13.5);
  return R.svg(0, 0, bredd, hojd);
}

// ---------------------------------------------------------------- anfangsrutan
// En ruta för sagans första bokstav: en kvadrat med ett guldband mellan röda linjer, pärlor i bandet och en liten
// tulpan i varje hörn, där eleven skriver den första bokstaven stort. sida i mm.
function anfangsRuta(sida) {
  const R = new Ritning();
  const m = 2.9, s = sida;
  // En liten tulpan i varje hörn, som pekar ut från rutan, bakom ramen.
  for (const [x, y, a] of [[m + 0.9, m + 0.9, -Math.PI / 4], [s - m - 0.9, m + 0.9, Math.PI / 4], [s - m - 0.9, s - m - 0.9, Math.PI * 0.75], [m + 0.9, s - m - 0.9, -Math.PI * 0.75]]) {
    tulpan(R, [x, y], 2.7, a, F.rod);
  }
  R.yta([[m, m], [s - m, m], [s - m, s - m], [m, s - m]], F.guld, { kontur: F.rodMork, tjock: 0.5 });
  R.yta([[m + 1.5, m + 1.5], [s - m - 1.5, m + 1.5], [s - m - 1.5, s - m - 1.5], [m + 1.5, s - m - 1.5]], F.vit, { kontur: F.rodMork, tjock: 0.35 });
  // Pärlor i guldbandet, som i rundlarna.
  for (let i = 0; i < 4; i++) for (let j = 1; j < 4; j++) {
    const t = j / 4, p = [[m + (s - 2 * m) * t, m + 0.8], [s - m - 0.8, m + (s - 2 * m) * t], [m + (s - 2 * m) * t, s - m - 0.8], [m + 0.8, m + (s - 2 * m) * t]][i];
    R.prick(p, 0.32, F.rodMork);
  }
  return R.svg(0, 0, s, s);
}

// ---------------------------------------------------------------- små prydnader
// Prydnaden nederst på ett blad: en liten tulpan mellan två blad som rullar in sig, på en tunn linje. bredd och hojd i mm.
function prydnad(bredd, hojd) {
  const R = new Ritning();
  const cx = bredd / 2, y = hojd - 1.2;
  R.drag([[cx - bredd * 0.42, y], [cx - 9, y]], F.ockra, 0.35);
  R.drag([[cx + 9, y], [cx + bredd * 0.42, y]], F.ockra, 0.35);
  for (const s of [-1, 1]) kurbitsblad(R, { fot: [cx + s * 1, y - 0.4], c: [cx + s * 6.4, y - hojd * 0.42], r0: hojd * 0.3, a0: Math.PI / 2, varv: 0.85, riktning: s > 0 ? -1 : 1, bredd: hojd * 0.22, farg: s > 0 ? F.gron : F.bla, ljus: s > 0 ? F.gronLjus : F.blaLjus, flikar: 2, fjadrar: false });
  tulpan(R, [cx, y - 0.6], hojd * 0.62, 0, F.rod);
  for (const s of [-1, 1]) R.prick([cx + s * bredd * 0.44, y], 0.7, F.rodMork);
  return R.svg(0, 0, bredd, hojd);
}

// ---------------------------------------------------------------- text som banor
// Text ritad med typsnittets egna konturer (design/typsnitt/andika/glyfer.json och cinzel/glyfer.json, gjorda av
// design/typsnitt/glyfer.py), så att den ser likadan ut i Word och Google utan att typsnittet behövs i bilden.
const GLYFER = { andika: glyferAndika, cinzel: glyferCinzel };
const glyfer = (namn) => GLYFER[namn];
// Textens bredd i mm vid storleken em (mm).
function textBredd(text, namn, em) {
  const G = glyfer(namn);
  return [...text].reduce((a, c) => a + (G.glyfer[c]?.adv ?? G.enheter * 0.3), 0) * (em / G.enheter);
}
// Banan för en rad text med baslinjen i y, centrerad kring x.
function textBana(text, namn, em, x, y) {
  const G = glyfer(namn), k = em / G.enheter;
  let pos = x - textBredd(text, namn, em) / 2;
  const delar = [];
  for (const c of text) {
    const g = G.glyfer[c];
    if (g?.d) delar.push(`<path transform="translate(${r1(pos)} ${r1(y)}) scale(${Math.round(k * 100000) / 100000} ${-Math.round(k * 100000) / 100000})" d="${g.d}"/>`);
    pos += (g?.adv ?? G.enheter * 0.3) * k;
  }
  return delar.join('');
}

// ---------------------------------------------------------------- tärningens sida
// En sida på en berättartärning: en ljus bakgrund i tärningens färg, en dubbel ram med en liten blomma i varje hörn,
// frågan i Cinzel överst, bilden ur bildbanken i mitten och ordet i Andika nederst. Varje tärning har sin färg, så att
// gruppen säger ”den röda tärningen” och tärningen går att känna igen också när den ligger på en annan sida.
const TARNINGSFARGER = [
  { farg: '#4E7A43', ljus: '#E8F0E2' },
  { farg: '#3D6B8C', ljus: '#E2ECF3' },
  { farg: '#B07A22', ljus: '#F8EDD6' },
  { farg: '#B5412F', ljus: '#F7E3DE' },
  { farg: '#6E3450', ljus: '#F1E3EA' },
  { farg: '#7A5530', ljus: '#F1E8DC' },
];
function tarningssida({ nr = 1, fraga = '', ord = '', bild = null, sida = 54, allaOrd = null }) {
  const { farg, ljus } = TARNINGSFARGER[(nr - 1) % TARNINGSFARGER.length];
  const R = new Ritning();
  const s = sida, m1 = 2.4, m2 = 3.5;
  const runda = (m, r) => { const pts = []; const horn = [[s - m - r, m + r, -Math.PI / 2], [s - m - r, s - m - r, 0], [m + r, s - m - r, Math.PI / 2], [m + r, m + r, Math.PI]]; for (const [cx, cy, a0] of horn) for (let i = 0; i <= 8; i++) { const a = a0 + (i / 8) * (Math.PI / 2); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return pts; };
  R.yta(runda(0.6, 3.2), ljus, { kontur: false });
  R.yta(runda(m1, 2.6), ljus, { kontur: farg, tjock: 0.6 });
  R.yta(runda(m2, 1.8), ljus, { kontur: farg, tjock: 0.25 });
  // Blommorna i hörnen: fyra kronblad i tärningens färg och en prick i guld.
  for (const [x, y] of [[m1 + 0.2, m1 + 0.2], [s - m1 - 0.2, m1 + 0.2], [s - m1 - 0.2, s - m1 - 0.2], [m1 + 0.2, s - m1 - 0.2]]) {
    for (let i = 0; i < 4; i++) { const a = (i / 4) * 2 * Math.PI + Math.PI / 4; R.prick([x + 1.05 * Math.cos(a), y + 1.05 * Math.sin(a)], 0.85, farg); }
    R.prick([x, y], 0.75, F.guld, { kontur: F.kontur, tjock: 0.2 });
  }
  // Frågan överst, i versaler.
  // Tärningens nummer före frågan, så att gruppen hittar tärning 4 när läraren säger det (sajtens granskning 2026-10-02).
  const etikett = (fraga ? `${nr} · ${fraga}` : String(nr)).toUpperCase();
  const em1 = Math.min(5.2, (s - 16) / Math.max(1, textBredd(etikett, 'cinzel', 1)));
  R.el.push({ t: 'ra', svg: `<g fill="${farg}">${textBana(etikett, 'cinzel', em1, s / 2, 10.2)}</g>`, b: [0, 0, s, 12] });
  // Bilden.
  if (bild) bildbank(R, bild, s / 2 - 12, 12.8, 24);
  // Ordet nederst, så stort som bredden tillåter. Med allaOrd (orden på alla tärningar) står varje ord i den storlek som
  // det längsta ryms i, så att ett långt ord inte blir mindre än ett kort (docs/elevmaterial.md; frågerundan för
  // Skrivkurs: sagoboken, 2026-10-02).
  const em2 = Math.min(7.6, ...[ord, ...(allaOrd ?? [])].map((o) => (s - 12) / Math.max(1, textBredd(o, 'andika', 1))));
  R.el.push({ t: 'ra', svg: `<g fill="${F.kontur}">${textBana(ord, 'andika', em2, s / 2, s - 8.4)}</g>`, b: [0, s - 16, s, s] });
  return R.svg(0, 0, s, s);
}

// ---------------------------------------------------------------- rosetten
// Vägskyltens rosett: rundeln med stationens bild, två kurbitsblad som vingar på var sin sida och en tulpan under, så att
// skylten ser ut som ett emblem i en sagobok. bredd och hojd i mm.
function rosett(bredd, hojd, fil) {
  const R = new Ritning();
  const r = Math.min(hojd * 0.4, bredd * 0.22), cx = bredd / 2, cy = hojd * 0.46;
  for (const s of [-1, 1]) {
    kurbitsblad(R, { fot: [cx + s * r * 0.55, cy + r * 0.78], c: [cx + s * r * 1.62, cy - r * 0.08], r0: r * 0.5, a0: Math.PI / 2, varv: 0.95, riktning: s > 0 ? -1 : 1, bredd: r * 0.42, farg: s > 0 ? F.gron : F.bla, ljus: s > 0 ? F.gronLjus : F.blaLjus, flikar: 4, bage: -0.15 });
  }
  tulpan(R, [cx, cy + r * 1.02], r * 0.32, Math.PI, F.rod);
  for (const s of [-1, 1]) bar(R, [cx + s * r * 0.78, cy + r * 1.22], r * 0.07);
  R.lagg(rundel(bredd, hojd, fil, { upp: false, ned: false, r, cy }));
  return R.svg(0, 0, bredd, hojd);
}

export { F, Ritning, genom, spiral, jamna, langd, normaler, kring, kringRund, bage, del, spegla, flytta, vrid, skala, kurbitsblad, tulpan, knopp, bar, kurbitsros, ritaSlinga, kurbitsslinga, lindorm, ben, huvud, bildbank, rundel, lagor, berget, siffra, portrattRam, anfangsRuta, prydnad, textBana, textBredd, tarningssida, TARNINGSFARGER, rosett };
