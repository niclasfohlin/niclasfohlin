// Pennan till strukturernas bilder (K-650): den handritade linjen, den mjuka färgen och slumpen ur ett fast frö.
// Allt som ritas går genom en penna, så att linjen och färgen är desamma i varje bild och en rättning här slår igenom
// i alla. Måtten kommer ur stil.json (mätt i Niclas referensbilder med matstil.mjs).
//
// En form är en sluten lista av punkter. Pennan ger formen tre lager, i den här ordningen:
//   botten  formen exakt, i vitt, så att det som står bakom inte syns igenom
//   farg    formen förskjuten en aning och fylld med färgen som krita: en ljus ton av färgen och streck i färgen
//           snett över ytan (ett mönster per färg, `kritan`), och färgen går ibland lite utanför linjen, som i
//           referenserna. Strecken är vektorer och inte brus, så att bilden är skarp i A5 och en png med palett
//           av bildens egna färger blir liten (Niclas 2026-10-31: "Ska vara en halv A4a och inte se suddiga ut.
//           Men också optimeras för hur de ska komprimeras för sina färger")
//   linje   konturen med en liten ojämnhet, i linjens färg
// Lagren samlas per del (en figur, ett bord) och läggs i bilden i delens ordning, så att det som står framför täcker.

export const LINJE = '#3c3c42';

// Slumpen: mulberry32 ur ett frö, så att samma scen ger samma bild varje gång.
export function slump(fro) {
  let a = typeof fro === 'number' ? fro >>> 0 : [...String(fro)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 1779033703);
  const nasta = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  nasta.mellan = (a0, b0) => a0 + (b0 - a0) * nasta();
  nasta.val = (lista) => lista[Math.floor(nasta() * lista.length)];
  return nasta;
}

// ---------------------------------------------------------------- geometri
export const V = (x, y) => ({ x, y });
export const plus = (a, b) => V(a.x + b.x, a.y + b.y);
export const minus = (a, b) => V(a.x - b.x, a.y - b.y);
export const ggr = (a, k) => V(a.x * k, a.y * k);
export const langd = (a) => Math.hypot(a.x, a.y);
export const enhet = (a) => { const l = langd(a) || 1; return V(a.x / l, a.y / l); };
export const normal = (a) => { const e = enhet(a); return V(-e.y, e.x); };
// Riktningen för en vinkel i grader: 0 rakt ned, 90 åt höger, 180 rakt upp och -90 åt vänster, som riggens enlinje.
export const rikt = (g) => V(Math.sin((g * Math.PI) / 180), Math.cos((g * Math.PI) / 180));
export const vrid = (p, c, g) => { const r = (g * Math.PI) / 180, d = minus(p, c); return V(c.x + d.x * Math.cos(r) - d.y * Math.sin(r), c.y + d.x * Math.sin(r) + d.y * Math.cos(r)); };

const f = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString();
// Formens storlek, den längsta sidan av rutan runt den: en stor form skrivs i hela enheter.
const storlek = (p) => Math.max(Math.max(...p.map((q) => q.x)) - Math.min(...p.map((q) => q.x)), Math.max(...p.map((q) => q.y)) - Math.min(...p.map((q) => q.y)));

// En ellips som punkter, med `n` punkter. `nedre` gör den nedre halvan bredare (ett ägg med den breda änden nedåt).
export function ellips(c, rx, ry, { n = 28, nedre = 0, vinkel = 0 } = {}) {
  const ut = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const s = Math.sin(t), k = Math.cos(t);
    const bredd = rx * (1 + nedre * Math.max(0, s) - nedre * 0.6 * Math.max(0, -s));
    ut.push(vrid(V(c.x + k * bredd, c.y + s * ry), c, vinkel));
  }
  return ut;
}

// En slang längs en linje av punkter, med halva bredden `w` (ett tal eller en lista per punkt) och runda ändar.
export function slang(punkter, w, { n = 7 } = {}) {
  const b = (i) => (Array.isArray(w) ? w[i] : w);
  const v = [], h = [];
  for (let i = 0; i < punkter.length; i++) {
    const fore = punkter[Math.max(0, i - 1)], efter = punkter[Math.min(punkter.length - 1, i + 1)];
    const no = normal(minus(efter, fore));
    v.push(plus(punkter[i], ggr(no, b(i))));
    h.push(minus(punkter[i], ggr(no, b(i))));
  }
  const ande = (p, mot, r) => {
    const d = enhet(minus(p, mot)), no = V(-d.y, d.x), ut = [];
    for (let i = 1; i < n; i++) {
      const t = (i / n) * Math.PI;
      ut.push(plus(p, plus(ggr(no, Math.cos(t) * r), ggr(d, Math.sin(t) * r))));
    }
    return ut;
  };
  const sist = punkter.length - 1;
  // Vänster sida framåt, runt änden, höger sida bakåt och runt början. `utanStart` är konturen utan början, för en
  // del som går ut ur en annan, som underarmen ur armbågen.
  const slut = ande(punkter[sist], punkter[sist - 1], b(sist));
  const ut = [...v, ...slut, ...h.reverse(), ...ande(punkter[0], punkter[1], b(0))];
  ut.utanStart = [0, v.length + slut.length + h.length - 1];
  return ut;
}

// Gör en lista punkter tätare, så att ojämnheten får plats mellan dem.
function tata(p, steg, sluten) {
  const ut = [];
  ut.fran = [];
  const n = sluten ? p.length : p.length - 1;
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    const k = Math.max(1, Math.ceil(langd(minus(b, a)) / steg));
    ut.fran.push(ut.length);
    for (let j = 0; j < k; j++) ut.push(plus(a, ggr(minus(b, a), j / k)));
  }
  if (!sluten) { ut.fran.push(ut.length); ut.push(p[p.length - 1]); }
  return ut;
}

// Mjuk kurva genom punkterna (Catmull-Rom som kubiska Bézier).
export function kurva(p, sluten = true, dec = 1) {
  if (p.length < 2) return '';
  const q = (i) => (sluten ? p[(i + p.length) % p.length] : p[Math.max(0, Math.min(p.length - 1, i))]);
  const f = (n) => (Math.round(n * 10 ** dec) / 10 ** dec).toString();
  let d = `M${f(p[0].x)} ${f(p[0].y)}`;
  const n = sluten ? p.length : p.length - 1;
  for (let i = 0; i < n; i++) {
    const p0 = q(i - 1), p1 = q(i), p2 = q(i + 1), p3 = q(i + 2);
    const c1 = plus(p1, ggr(minus(p2, p0), 1 / 6)), c2 = minus(p2, ggr(minus(p3, p1), 1 / 6));
    d += `C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return sluten ? d + 'Z' : d;
}

// Ojämnheten: en långsam våg längs linjen, så att linjen ser dragen ut för hand och inte ritad med linjal.
function skakig(p, r, styrka, sluten) {
  const t = tata(p, 14, sluten);
  const fas1 = r() * 6.3, fas2 = r() * 6.3, v1 = r.mellan(0.05, 0.09), v2 = r.mellan(0.17, 0.29);
  const ut = t.map((q, i) => {
    const fore = t[Math.max(0, i - 1)], efter = t[Math.min(t.length - 1, i + 1)];
    const no = normal(minus(efter, fore));
    const a = styrka * (0.7 * Math.sin(i * v1 + fas1) + 0.3 * Math.sin(i * v2 + fas2));
    return plus(q, ggr(no, a));
  });
  ut.fran = t.fran;
  return ut;
}

// En penna för en bild. `skala` är bildens enhet (huvudets höjd i scenen), som linjen och ojämnheten följer.
export function penna(fro, stil) {
  const r = slump(fro);
  const bredd = stil.linje; // linjens bredd i bildens enheter
  const lager = [];
  const ruta = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const vidga = (pts) => { for (const q of pts) { ruta.x0 = Math.min(ruta.x0, q.x); ruta.y0 = Math.min(ruta.y0, q.y); ruta.x1 = Math.max(ruta.x1, q.x); ruta.y1 = Math.max(ruta.y1, q.y); } };
  const formerna = [];
  let nr = 0;
  const monster = new Map();
  // Kritans mönster för en färg: en ton, några fläckar av olika täthet och korta drag åt flera håll, som krita eller
  // akvarell. Ett eget frö per färg, så att ytorna inte ser stämplade ut. `slat` ger huden ett mjukare mönster med
  // färre drag, så att ansiktena blir nästan släta. Dragen står inne i rutan, så att mönstret möts utan skarvar.
  const kritan = (farg, slat = false) => {
    const nyckel = farg + (slat ? 's' : '');
    if (monster.has(nyckel)) return monster.get(nyckel).id;
    const id = 'k' + farg.replace('#', '') + (slat ? 's' : '');
    const k = stil.krita, rr = slump(fro + nyckel), S = k.ruta;
    const dampa = slat ? 0.35 : 1;
    const delar = [];
    for (let i = 0; i < k.flackar; i++) {
      const rx = rr.mellan(12, 30), ry = rx * rr.mellan(0.5, 0.9);
      const cx = rr.mellan(rx, S - rx), cy = rr.mellan(rx, S - rx);
      delar.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" opacity="${(rr.mellan(0.12, 0.3) * dampa).toFixed(2)}"/>`);
    }
    const antal = Math.round(k.streck * (slat ? 0.3 : 1));
    for (let i = 0; i < antal; i++) {
      const l = rr.mellan(k.langd[0], k.langd[1]), w = rr.mellan(k.bredd[0], k.bredd[1]);
      const v = rr.mellan(-k.spridning, k.spridning) * Math.PI / 180;
      const hx = Math.abs(Math.cos(v)) * l / 2 + w, hy = Math.abs(Math.sin(v)) * l / 2 + w;
      const cx = rr.mellan(hx, S - hx), cy = rr.mellan(hy, S - hy);
      const op = (rr.mellan(k.tackning[0], k.tackning[1]) * dampa).toFixed(2);
      delar.push(`<path d="M${f(cx - Math.cos(v) * l / 2)} ${f(cy - Math.sin(v) * l / 2)}L${f(cx + Math.cos(v) * l / 2)} ${f(cy + Math.sin(v) * l / 2)}" stroke-width="${f(w)}" opacity="${op}"/>`);
    }
    monster.set(nyckel, { id, svg: `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${S}" height="${S}" patternTransform="rotate(${f(k.vinkel + rr.mellan(-8, 8))})"><rect width="${S}" height="${S}" fill="${farg}" opacity="${slat ? Math.min(0.85, k.ton + 0.25) : k.ton}"/><g fill="${farg}" stroke="${farg}" stroke-linecap="round">${delar.join('')}</g></pattern>` });
    return id;
  };
  const del = () => { const d = { botten: [], farg: [], linje: [] }; lager.push(d); return d; };
  let akt = del();

  return {
    r,
    // Börjar en ny del, som läggs över de förra.
    ny() { akt = del(); return this; },
    // En sluten form med färg och linje. `farg` null ger bara botten och linje, `linje` false bara färg.
    form(p, farg, { linje = true, botten = true, tjock = 1, glid = 1, kant = null, slat = false } = {}) {
      // Formen skrivs en gång i defs och används för botten, färgen och linjen, så att filen blir liten. `kant` är en
      // del av konturen, från och med en punkt till och med en annan, som ritas i stället för hela.
      const id = 'p' + (nr++).toString(36);
      vidga(p);
      const sk = skakig(p, r, bredd * 0.45, true);
      const dec = storlek(p) > 40 ? 0 : 1;
      formerna.push(`<path id="${id}" d="${kurva(sk, true, dec)}"/>`);
      if (botten) akt.botten.push(`<use href="#${id}"/>`);
      if (farg) {
        // Färgen glider lite ur linjen, som när man färglägger för hand.
        const dx = r.mellan(-1, 1) * bredd * 1.5 * glid, dy = r.mellan(-1, 1) * bredd * 1.5 * glid;
        akt.farg.push(`<use href="#${id}" x="${f(dx)}" y="${f(dy)}" fill="url(#${kritan(farg, slat)})"/>`);
      }
      const sw = f(bredd * tjock * r.mellan(0.8, 1.15));
      if (linje && kant) akt.linje.push(`<path d="${kurva(sk.slice(sk.fran[kant[0]], sk.fran[kant[1]] + 1), false, dec)}" stroke-width="${sw}"/>`);
      else if (linje) {
        // En stor form får en liten glipa i linjen, som när pennan lyfts, genom ett streckmönster på samma form.
        const omkrets = sk.reduce((a, q, i) => a + langd(minus(sk[(i + 1) % sk.length], q)), 0);
        const glipa = omkrets > 140 && r() < 0.65
          ? ` stroke-dasharray="${f(omkrets * r.mellan(0.2, 0.8), 0)} ${f(bredd * r.mellan(1.6, 2.6))} ${f(omkrets, 0)}"` : '';
        akt.linje.push(`<use href="#${id}" stroke-width="${sw}"${glipa}/>`);
      }
      return this;
    },
    // En öppen linje, som en mun, ett ögonbryn eller en pil.
    streck(p, { tjock = 1, skak = 1, farg = null } = {}) {
      vidga(p);
      const q = skak ? skakig(p, r, bredd * 0.35 * skak, false) : p;
      akt.linje.push(`<path d="${kurva(q, false)}" fill="none" stroke-width="${f(bredd * tjock * r.mellan(0.9, 1.1))}"${farg ? ` stroke="${farg}"` : ''}/>`);
      return this;
    },
    // En fylld liten form utan linje, som ögon och symboler i en bubbla.
    prick(p, farg) { akt.linje.push(`<path d="${kurva(p)}" fill="${farg}" stroke="none"/>`); return this; },
    // Rutan runt allt som har ritats, för att beskära bilden efter innehållet.
    ruta() { return { ...ruta }; },
    // Kritans mönster, till bildens defs.
    defs() { return [...monster.values()].map((m) => m.svg).join('') + formerna.join(''); },
    // Lagren som svg, i delarnas ordning.
    svg() {
      return lager.map((d) => [
        d.botten.length ? `<g fill="#fff">${d.botten.join('')}</g>` : '',
        d.farg.length ? `<g>${d.farg.join('')}</g>` : '',
        d.linje.length ? `<g fill="none" stroke="${LINJE}" stroke-linecap="round" stroke-linejoin="round">${d.linje.join('')}</g>` : '',
      ].join('')).join('\n');
    },
  };
}
