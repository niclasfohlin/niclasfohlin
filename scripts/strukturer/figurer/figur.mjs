// Figuren i strukturernas bilder (K-650): ett skelett med leder, kroppen och kläderna som ytor runt skelettet och ett
// runt huvud med ett litet ansikte, i stilen ur Niclas referensbilder (stil.json). En ny ställning är nya vinklar.
//
// Måtten är i delar av huvudets höjd H. Figuren står med fötterna i (x, y). Figurerna skiljer sig lite i byggnad
// (`bygg`, -1 smal till 1 kraftig) och längd (`storlek`), som i hudton, utan något som visar pojke eller flicka
// (Niclas 2026-10-31: "Lite skillnad i smal eller lite kraftigare kropp. Och lite skillnad i storlek också. De ska
// inte gå att se pojke eller flicka").
//
// Lärandet mellan eleverna ska synas (Niclas samma dag: "Man vill se lärandet 'mellan' elevens och hur de pekar,
// tänker, lutar sig in mot ett gemensamt material"): `nar` sätter en hand på en punkt (pennan på papperet, en high
// five), `pekar` sträcker armen och ett finger mot en punkt, `tittar` vänder ansiktet dit och `lutar` lutar kroppen
// mot den. Armen räknas ut med två leder, så att armbågen hamnar där en arm böjer sig. Vinklarna är i grader på skärmen: 0 rakt
// ned, 90 åt höger, 180 rakt upp och -90 åt vänster. Armen och benet till vänster på skärmen heter V och till höger H.
import { V, plus, minus, ggr, rikt, vrid, ellips, slang, enhet, langd } from './penna.mjs';

// Proportionerna, mätta för hand ur referenserna (stil.json under hand): huvudet är en fjärdedel av figuren.
export const MATT = {
  huvud: { b: 0.8, h: 1, overlapp: 0.2, nedre: 0.1 },
  bal: { bredd: 0.88, langd: 1.15 },
  arm: { fäste: 0.27, over: 0.68, under: 0.62, w0: 0.118, w1: 0.1, hand: 0.13 },
  ben: { fäste: 0.14, lar: 0.78, smal: 0.72, w0: 0.158, w1: 0.135, fot: 0.17 },
};

// Ställningarna. arm: [överarm, underarm], ben: [lår, smalben], lut: kroppens lutning i grader, positivt åt vänster och
// negativt åt höger, bak: armen som är bakom kroppen. Huvudet lutar med kroppen.
export const STALLNINGAR = {
  sta: { V: [-10, 16], H: [10, -16], benV: [-4, 1], benH: [4, -1] },
  staHanderFram: { V: [-18, 40], H: [18, -40], benV: [-5, -2], benH: [5, 2] },
  kasta: { V: [-12, 30], H: [165, 175], benV: [-10, -4], benH: [8, 2], lut: -4, bak: 'H' },
  kastaV: { V: [-165, -175], H: [12, -30], benV: [-8, -2], benH: [10, 4], lut: 4, bak: 'V' },
  handUpp: { V: [-10, -4], H: [170, 178], benV: [-5, -2], benH: [5, 2] },
  handUppV: { V: [-170, -178], H: [10, 4], benV: [-5, -2], benH: [5, 2] },
  highFiveH: { V: [-20, 35], H: [158, 170], benV: [-8, -3], benH: [6, 2], lut: -6 },
  highFiveV: { V: [-158, -170], H: [20, -35], benV: [-6, -2], benH: [8, 3], lut: 6 },
  halla: { V: [-14, 60], H: [14, -60], benV: [-5, -2], benH: [5, 2] },
  hallaH: { V: [-12, -4], H: [40, 120], benV: [-5, -2], benH: [5, 2] },
  hallaV: { V: [-40, -120], H: [12, 4], benV: [-5, -2], benH: [5, 2] },
  armarIKors: { V: [-14, 85], H: [14, -85], benV: [-5, -2], benH: [5, 2] },
  tanka: { V: [-12, 60], H: [12, -150], benV: [-5, -2], benH: [5, 2] },
  pekaH: { V: [-10, -4], H: [80, 95], benV: [-5, -2], benH: [5, 2] },
  pekaV: { V: [-80, -95], H: [10, 4], benV: [-5, -2], benH: [5, 2] },
  gaH: { V: [-28, -8], H: [22, 50], benV: [-20, -6], benH: [22, 4], lut: -4 },
  gaV: { V: [-22, -50], H: [28, 8], benV: [-22, -4], benH: [20, 6], lut: 4 },
  handPaAxel: { V: [-12, -4], H: [60, 100], benV: [-5, -2], benH: [5, 2] },
  sitta: { V: [-20, 50], H: [20, -50], sitter: true },
  sittaSkriva: { V: [-15, 70], H: [25, -10], sitter: true, lut: 6 },
  lutaSkriva: { V: [-25, 55], H: [30, 35], benV: [-5, -2], benH: [5, 2], lut: 14 },
};

// Hudtonerna och klädfärgerna. Hudtonerna är olika med avsikt (referenserna har sex), och färgerna är mätta.
export const HUD = ['#f6d6cc', '#f1dcbf', '#e3bf92', '#c08b5c', '#8d5f3f', '#c4c06c', '#f3cfc2'];
export const KLADER = {
  gul: '#efc65a', ljusgul: '#f3dc8e', bla: '#9bbae0', ljusbla: '#b6cbea', gron: '#9edcaa', ljusgron: '#c8edc4',
  rosa: '#f2b9c6', lila: '#c7a8ea', rod: '#e56b82', orange: '#f1a868', turkos: '#8fd3cf', magenta: '#d58fd9',
};
export const BYXOR = { rosa: '#f6dde2', vit: '#ffffff', ljusbla: '#dbe2f6', beige: '#efe5d0', gra: '#e3e3e3' };

const farg = (namn, lista) => (namn && namn.startsWith('#') ? namn : lista[namn] ?? namn);

// Ritar en figur med pennan. Ger figurens punkter: huvudets mitt och topp, munnen, händerna och höften.
// Armen från axeln till en punkt med två leder: armbågen hamnar på den sida där den hänger ned och ut från kroppen.
function tvaLeder(S, T, a, b, sida) {
  const d = minus(T, S);
  const L = Math.max(Math.abs(a - b) * 1.05, Math.min(langd(d), (a + b) * 0.995));
  const e = enhet(d), n = V(-e.y, e.x);
  const A = Math.acos(Math.max(-1, Math.min(1, (a * a + L * L - b * b) / (2 * a * L))));
  const kandidat = (k) => plus(S, plus(ggr(e, Math.cos(A) * a), ggr(n, k * Math.sin(A) * a)));
  const [x, y] = [kandidat(1), kandidat(-1)];
  const poang = (q) => q.y - S.y + 0.8 * sida * (q.x - S.x);
  return [S, poang(x) >= poang(y) ? x : y, plus(S, ggr(e, L))];
}

export function figur(p, o) {
  const H = o.skala * (o.storlek ?? 1);
  const bygg = Math.max(-1, Math.min(1, o.bygg ?? 0));
  const st = typeof o.stallning === 'object' ? o.stallning : STALLNINGAR[o.stallning || 'sta'];
  if (!st) throw new Error(`Ställningen ${o.stallning} finns inte`);
  const m = MATT;
  const r = p.r;
  const hud = typeof o.hud === 'number' ? HUD[o.hud % HUD.length] : o.hud || HUD[0];
  const trojan = farg(o.trojan || 'gul', KLADER);
  const byxor = farg(o.byxor || 'rosa', BYXOR);
  const blick = o.blick ?? 0; // -1 vänster, 1 höger: ansiktet vrids åt det hållet
  // Varje figur står lite olika: kroppen lutar, huvudet vrids och armarna hänger olika, ur scenens slump.
  const darr = (g) => g + r.mellan(-1, 1) * (o.stel ? 0 : 6);
  const st0 = st;
  const stJ = { ...st0, V: st0.V.map(darr), H: st0.H.map(darr) };
  const fot = V(o.x, o.y);
  const mot = (t) => (t ? V(t[0], t[1]) : null);
  const lutMot = mot(o.lutar);
  const lut = (st.lut ?? 0) + (o.lut ?? 0) + (o.stel ? 0 : r.mellan(-2.5, 2.5))
    // lut är positivt åt vänster (rikt(180 + lut) nedan), så ett mål till höger ger ett negativt lut.
    // En stående figur lutar högst 7 grader och en sittande 14: mer, och den stående ser ut att buga med raka ben
    // (granskningen av omgång A 2026-10-31).
    + (lutMot ? Math.max(-(st.sitter ? 14 : 7), Math.min(st.sitter ? 14 : 7, -((lutMot.x - fot.x) / H) * 8)) : 0);
  const sitter = !!st.sitter;

  // Benen och höften.
  const benlangd = (m.ben.lar + m.ben.smal) * H;
  const hoft = sitter ? V(fot.x, fot.y - m.ben.smal * H * 0.9) : V(fot.x, fot.y - benlangd * 0.97);
  const bal = (st.bal ?? m.bal.langd) * H;
  const axel = plus(hoft, ggr(rikt(180 + lut), bal));
  const tvar = enhet(vrid(V(1, 0), V(0, 0), -lut));
  const led = (start, vinklar, langder) => {
    const a = plus(start, ggr(rikt(vinklar[0] + lut * 0.3), langder[0] * H));
    const b = plus(a, ggr(rikt(vinklar[1] + lut * 0.3), langder[1] * H));
    return [start, a, b];
  };

  const delar = [];
  const ben = (sida) => {
    const fast = plus(hoft, ggr(tvar, sida * m.ben.fäste * H * (1 + 0.1 * bygg)));
    let punkter;
    if (sitter) {
      const fram = o.vand === 'vanster' ? -1 : 1;
      const kna = plus(fast, V(fram * m.ben.lar * H * 0.8, -0.05 * H));
      punkter = [fast, kna, plus(kna, V(fram * 0.05 * H, m.ben.smal * H * 0.85))];
    } else punkter = led(fast, sida < 0 ? st.benV : st.benH, [m.ben.lar, m.ben.smal]);
    const sist = punkter[2];
    // Foten är en liten rund sko under benets ände, åt det håll figuren vänder sig, ritad före benet så att benet
    // står i den.
    const riktning = o.vand === 'vanster' ? -1 : o.vand === 'hoger' ? 1 : sida * 0.5;
    delar.push({ z: 1, rita: () => {
      const k = 1 + 0.1 * bygg;
      if (!sitter) p.ny().form(ellips(plus(sist, V(riktning * m.ben.fot * H * 0.45, m.ben.w1 * H * 0.55)), m.ben.fot * H * 0.72, m.ben.w1 * H * 0.62, { n: 12 }), '#ffffff', { tjock: 0.9 });
      p.ny().form(slang(punkter, [m.ben.w0 * H * k, m.ben.w1 * H * 1.05 * k, m.ben.w1 * H * 0.95 * k]), byxor);
    } });
    return sist;
  };
  if (!o.utanBen) { ben(-1); ben(1); }

  // Bålen: en mjuk säck med axlar som sluttar ut under huvudet, lite smalare vid höften, som i referenserna. Överkanten
  // är smal och står bakom huvudet, så att ingen nacke syns. Punkterna är i delar av H, tvärs över och nedåt från
  // axlarnas mitt.
  const SACK = [[-0.16, -0.02], [-0.28, 0.06], [-0.37, 0.2], [-0.41, 0.42], [-0.44, 0.72], [-0.44, 1.0], [-0.37, 1.13],
    [0, 1.17], [0.37, 1.13], [0.44, 1.0], [0.44, 0.72], [0.41, 0.42], [0.37, 0.2], [0.28, 0.06], [0.16, -0.02], [0, -0.04]];
  const ner = rikt(lut);
  const kropp = SACK.map(([tx, ty]) => plus(axel, plus(ggr(tvar, tx * H * m.bal.bredd * (1 + 0.13 * bygg)), ggr(ner, ty * bal / 1.18))));
  delar.push({ z: 2, rita: () => p.ny().form(kropp, trojan) });

  // Armarna: ärmen i tröjans färg och handen som en rund vante i hudens färg. Överarmen står bakom bålen, så att armen
  // kommer ut ur axeln utan en linje där den börjar. En underarm som går in framför kroppen ritas framför bålen och
  // börjar vid armbågen utan linje tvärs över, så att armen ser ut att böja sig fram.
  const hander = {};
  const senare = [];
  const arm = (sida) => {
    const fast = plus(plus(axel, ggr(tvar, sida * m.arm.fäste * H * (1 + 0.13 * bygg))), ggr(ner, 0.22 * H));
    const namn = sida < 0 ? 'V' : 'H';
    const a = m.arm.over * H, b = m.arm.under * H;
    let punkter, finger = null;
    const pekMot = mot(o.pekar);
    const pekarHar = pekMot && (o.pekarMed ? o.pekarMed === namn : (pekMot.x >= axel.x ? 'H' : 'V') === namn);
    if (o.nar?.[namn]) punkter = tvaLeder(fast, mot(o.nar[namn]), a, b, sida);
    else if (pekarHar) {
      // Handen stannar en bit före punkten och fingret pekar resten av vägen.
      const d = minus(pekMot, fast), L = Math.min(langd(d) - 0.2 * H, (a + b) * 0.97);
      punkter = tvaLeder(fast, plus(fast, ggr(enhet(d), Math.max(L, (a + b) * 0.5))), a, b, sida);
      finger = pekMot;
    } else {
      // En figur utan ben är en byst: armar som hänger slutar vid bålens kant, så att händerna inte ser ut som fötter.
      const kort = o.utanBen && (o.stallning ?? 'sta') === 'sta' ? 0.55 : 1;
      punkter = led(fast, sida < 0 ? stJ.V : stJ.H, [m.arm.over * kort, m.arm.under * kort]);
    }
    const [, armbage, hand] = punkter;
    hander[namn] = hand;
    const handform = () => {
      const c = plus(hand, ggr(enhet(minus(hand, armbage)), m.arm.hand * H * 0.55));
      if (finger) {
        const d = enhet(minus(finger, c));
        // Ett kort, tjockt finger: ett långt och smalt ser ut som en pinne eller en krita (granskningen av pilotomgången).
        const spets = plus(c, ggr(d, Math.min(langd(minus(finger, c)) - 0.04 * H, 0.24 * H)));
        p.ny().form(slang([c, spets], 0.065 * H), hud, { tjock: 0.85 });
      }
      // Handen är en vante: en tumme på sidan in mot kroppen och handen över den, i hudens färg.
      const ut = enhet(minus(hand, armbage)), in_ = V(-ut.y * sida, ut.x * sida);
      p.ny().form(ellips(plus(c, plus(ggr(in_, -m.arm.hand * H * 0.75), ggr(ut, -m.arm.hand * H * 0.2))), m.arm.hand * H * 0.42, m.arm.hand * H * 0.32, { n: 10, vinkel: Math.atan2(ut.y, ut.x) * 180 / Math.PI }), hud, { slat: true, glid: 0.4 });
      p.ny().form(ellips(c, m.arm.hand * H * 0.92, m.arm.hand * H * 1.05, { n: 14, vinkel: Math.atan2(ut.y, ut.x) * 180 / Math.PI + 90 }), hud, { slat: true, glid: 0.5 });
    };
    const lx = (q) => (q.x - axel.x) * tvar.x + (q.y - axel.y) * tvar.y;
    const ly = (q) => (q.x - axel.x) * ner.x + (q.y - axel.y) * ner.y;
    // Underarmen står framför bålen när handen är framför kroppen, från hakan till höften.
    // En figur som syns bakifrån har armarna bakom bålen: vi ser ryggen, och armarna går bort från oss (pilotomgången
    // 2026-10-31). Den ritas efter det den sträcker sig mot, som ett bord den sitter vid.
    const framfor = o.ansikte === 'bak' ? false : (o.fram ?? st.fram)?.includes(namn) ?? (sida * lx(hand) < 0.3 * H && ly(hand) > -0.75 * H && ly(hand) < bal + 0.3 * H);
    const bak = (o.bak ?? st.bak) === namn;
    const k = 1 + 0.1 * bygg;
    const w = [m.arm.w0 * H * k, m.arm.w1 * H * 1.05 * k, m.arm.w1 * H * k];
    if (o.armarEfter && o.ansikte !== 'bak' && (o.nar?.[namn] || pekarHar)) {
      // Armen når ut över något som ritas efter figuren, som en bordsskiva: den ritas när scenen säger till, hel och
      // utan linje där den går ut ur axeln.
      senare.push(() => {
        const u = slang(punkter, w);
        p.ny().form(u, trojan, { kant: u.utanStart });
        handform();
      });
    } else if (framfor && !bak) {
      // Står armbågen vid kroppens kant får underarmen en rund armbåge; bara en armbåge inne på bålen börjar utan linje,
      // annars blir underarmen en smal mörk kil (granskningen av omgång G).
      const armbageInne = Math.abs(lx(armbage)) < 0.28 * H;
      delar.push({ z: 1.5, rita: () => p.ny().form(slang([fast, armbage], [w[0], w[1]]), trojan) });
      delar.push({ z: 3, rita: () => {
        const u = slang([armbage, hand], [w[1] * 1.08, w[2] * 1.08]);
        p.ny().form(u, trojan, armbageInne ? { kant: u.utanStart } : {});
        handform();
      } });
    } else {
      delar.push({ z: bak ? 0 : 1.5, rita: () => { p.ny().form(slang(punkter, w), trojan); handform(); } });
    }
  };
  arm(-1); arm(1);

  // Huvudet: ett ägg med den breda änden nedåt, lite vridet med lutningen.
  const hc0 = plus(axel, ggr(rikt(180 + lut), (m.huvud.h / 2 - m.huvud.overlapp) * H));
  // Blicken: ansiktet vänds mot det figuren tittar på, och huvudet lutar sig ned mot det som ligger lägre.
  const tittMot = mot(o.tittar);
  const blickUt = tittMot ? Math.max(-1, Math.min(1, (tittMot.x - hc0.x) / (1.1 * H))) : blick;
  const nedat = tittMot ? Math.max(-0.6, Math.min(1, (tittMot.y - hc0.y) / (2.2 * H))) : (o.nedat ?? 0);
  // Huvudet lutar mot det figuren tittar på, mer när det ligger lägre, som när man lutar sig in över ett papper.
  const hl = (o.huvudLut ?? (o.stel ? 0 : r.mellan(-7, 7)) + (tittMot ? Math.sign(tittMot.x - hc0.x) * (6 + Math.max(0, nedat) * 10) : 0)) - lut * 0.6;
  const hc = hc0;
  const hb = m.huvud.b * H / 2, hh = m.huvud.h * H / 2;
  delar.push({ z: 4, rita: () => {
    p.ny().form(ellips(hc, hb, hh, { n: 32, nedre: m.huvud.nedre, vinkel: hl }), hud, { slat: true });
    // En glad figur som tittar på något har öppna ögon, så att man ser vart den tittar (granskningen av omgång A och F).
    const slagAnsikte = (o.ansikte || 'glad') === 'glad' && tittMot ? 'ser' : (o.ansikte || 'glad');
    if (o.ansikte !== 'bak') ansikte(p, hc, hb, hh, blickUt, slagAnsikte, hl, nedat);
  } });

  for (const d of delar.sort((a, b) => a.z - b.z)) d.rita();
  return {
    huvud: hc, topp: plus(hc, V(0, -hh)), mun: vrid(plus(hc, V(blickUt * hb * 0.3, hh * 0.35)), hc, hl),
    hander, hoft, axel, H, sida: (s) => plus(hc, V(s * hb, 0)),
    // Axeln, för en hand på någons axel: ute på axelns rundning och inte vid halsen (granskningen av omgång H och E).
    axlar: { V: plus(plus(axel, ggr(tvar, -0.38 * H)), ggr(ner, 0.26 * H)), H: plus(plus(axel, ggr(tvar, 0.38 * H)), ggr(ner, 0.26 * H)) },
    // Armarna som ritas senare, efter det som scenen säger i armarEfter.
    senare: () => senare.forEach((f) => f()),
  };
}

// Ansiktet: ögonen och munnen, förskjutna åt det håll figuren tittar.
function ansikte(p, c, b, h, blick, slag, vinkel, nedat = 0) {
  const mitt = V(c.x + blick * b * 0.32, c.y + nedat * h * 0.14);
  const t = (q) => vrid(q, c, vinkel);
  const og = (s) => V(mitt.x + s * b * 0.3 - blick * b * 0.04 * s, mitt.y - h * 0.08);
  const bage = (q, bredd, hojd) => [t(V(q.x - bredd, q.y)), t(V(q.x, q.y - hojd)), t(V(q.x + bredd, q.y))];
  const prick = (q, r) => p.prick(ellips(t(q), r, r * 1.15, { n: 8 }), '#2b2b2e');
  const munY = mitt.y + h * 0.36;
  if (slag === 'glad' || slag === 'skratt') {
    for (const s of [-1, 1]) p.streck(bage(og(s), b * 0.13, h * 0.09), { tjock: 0.85, skak: 0 });
  } else if (slag === 'ser') {
    for (const s of [-1, 1]) prick(V(og(s).x + blick * b * 0.05, og(s).y + nedat * h * 0.03), b * 0.065);
} else if (slag === 'tanka') {
    for (const s of [-1, 1]) prick(V(og(s).x + b * 0.06, og(s).y - h * 0.08), b * 0.06);
  } else if (slag === 'skriva') {
    for (const s of [-1, 1]) p.streck([t(V(og(s).x - b * 0.1, og(s).y + h * 0.04)), t(V(og(s).x + b * 0.1, og(s).y + h * 0.04))], { tjock: 0.8, skak: 0 });
  } else if (slag === 'kisa') {
    p.streck([t(V(og(-1).x - b * 0.12, og(-1).y - h * 0.06)), t(V(og(-1).x + b * 0.08, og(-1).y)), t(V(og(-1).x - b * 0.12, og(-1).y + h * 0.05))], { tjock: 0.8, skak: 0 });
    p.streck([t(V(og(1).x + b * 0.12, og(1).y - h * 0.06)), t(V(og(1).x - b * 0.08, og(1).y)), t(V(og(1).x + b * 0.12, og(1).y + h * 0.05))], { tjock: 0.8, skak: 0 });
  } else {
    for (const s of [-1, 1]) prick(og(s), b * 0.065);
  }
  if (slag === 'prata') {
    p.form(ellips(t(V(mitt.x, munY)), b * 0.12, h * 0.08, { n: 12 }), '#c9545f', { glid: 0 });
  } else if (slag === 'skratt' || slag === 'kisa') {
    p.form([t(V(mitt.x - b * 0.2, munY - h * 0.05)), t(V(mitt.x + b * 0.2, munY - h * 0.05)), t(V(mitt.x + b * 0.1, munY + h * 0.08)), t(V(mitt.x - b * 0.1, munY + h * 0.08))], '#c9545f', { glid: 0 });
  } else if (slag === 'tanka' || slag === 'skriva') {
    p.streck([t(V(mitt.x - b * 0.12, munY)), t(V(mitt.x + b * 0.12, munY + h * 0.01))], { tjock: 0.85, skak: 0 });
  } else {
    p.streck([t(V(mitt.x - b * 0.2, munY - h * 0.03)), t(V(mitt.x, munY + h * 0.06)), t(V(mitt.x + b * 0.2, munY - h * 0.03))], { tjock: 0.9, skak: 0 });
  }
}
