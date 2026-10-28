// Sammanställningen som pdf (Planera insatsen, K-489; Niclas 2026-10-24: "kunna få ut det enkelt (samt skriva ut) på
// gruppnivå och elevnivå"). Pdf:en görs i webbläsaren av lärarens egen plan, med pdf-lib, som hämtas först när någon
// trycker, och lämnar aldrig enheten. Den bär elevernas namn, eftersom den är lärarens egen utskrift; texterna som
// kopieras till dokumentationen har inga namn. Typsnittet är pdf:ens eget (Helvetica). Ett tecken som det inte har skrivs
// utan sina accenter, så att utskriften aldrig går sönder (Niclas: "Ł, Ş och č är så ovanliga att du kan hoppa över dem").
import type { PDFFont, PDFPage } from 'pdf-lib';
import { BESLUT, beslutText, lektionernasMal, datumspann, datumText, decimal, elevensResultat, elevensVarden, GRUPPEN, mening, narvaronKort, narvaronText, passensRad, prickarna, resultatText, elevenHarNagot, passensNarvaro, prickarnasText, riktningText, skattadeVeckor, skattningensGranser, skattningensText, SKALAN, stegetsSpann, stapelnsKant, utanNamn, utvarderingenText, veckansNamn, type Plan, type Sammanstallning, type Veckonamn } from '../lib/standard/index.js';

const A4: [number, number] = [595.28, 841.89];
const KANT = 50;
// Tecknen som pdf:ens typsnitt har (WinAnsi): ASCII, Latin-1 och några skiljetecken.
const TILLATET = /[\x20-\x7E\xA0-\xFF–—‘’“”„•…€]/;
const ERSATT: Record<string, string> = { Ł: 'L', ł: 'l', Đ: 'D', đ: 'd', ı: 'i', Ø: 'Ø', '→': '-', '↑': '', '↓': '', '⁠': '', '­': '', '​': '' };
const ren = (s: string) => [...s].map((c) => (TILLATET.test(c) ? c : ERSATT[c] ?? [...c.normalize('NFD').replace(/\p{M}/gu, '')].filter((x) => TILLATET.test(x)).join(''))).join('');

export interface PdfInfo {
  metod: string;
  grupp?: string;
  niva?: string;
  /** Insatsens mål som mening, det som eleverna skattas mot. */
  mal: string;
  fragan: string;
  uppfoljning: { nar: string }[];
  /** Metodens ingress, under Innehållet i insatsen i gruppens pdf. */
  ingress?: string;
  /** Metodens undertitel, under Innehållet i insatsen i elevens pdf, som kan gå till hemmet och nästa lärare. */
  undertitel?: string;
  /** Raderna ur texten till åtgärdsprogrammet (dokumentationsrader i standarden). */
  insatsen?: { etikett?: string; text: string }[];
}

async function dokument(titel: string) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.setTitle(ren(titel));
  doc.setAuthor('Planera insatsen, niclasfohlin.se');
  doc.setLanguage('sv-SE');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fet = await doc.embedFont(StandardFonts.HelveticaBold);
  const farg = { accentRgb: [0.11, 0.31, 0.57], ljusRgb: [0.95, 0.96, 0.98], text: rgb(0.08, 0.13, 0.17), svag: rgb(0.29, 0.35, 0.4), accent: rgb(0.11, 0.31, 0.57), kant: rgb(0.88, 0.9, 0.92), gron: rgb(0.12, 0.42, 0.27), ljus: rgb(0.95, 0.96, 0.98), mitt: rgb(0.95, 0.9, 0.95) };
  let sida: PDFPage = doc.addPage(A4);
  let y = A4[1] - KANT;
  const sidor: PDFPage[] = [sida];
  const ny = () => { sida = doc.addPage(A4); sidor.push(sida); y = A4[1] - KANT; };
  const plats = (h: number) => { if (y - h < KANT + 30) ny(); };
  // Raderna i en text som ryms inom bredden, en rot för texten, tabellernas celler och sidfoten.
  const brytt = (s: string, f: PDFFont, storlek: number, bredd: number) => {
    const rader: string[] = [];
    for (const stycke of ren(s).split('\n')) {
      let rad = '';
      for (const ord of stycke.split(' ')) {
        const prov = rad ? `${rad} ${ord}` : ord;
        if (f.widthOfTextAtSize(prov, storlek) > bredd && rad) { rader.push(rad); rad = ord; } else rad = prov;
      }
      rader.push(rad);
    }
    return rader;
  };
  // Text med radbrytning inom bredden.
  const text = (s: string, o: { storlek?: number; fet?: boolean; farg?: ReturnType<typeof rgb>; x?: number; bredd?: number; luft?: number } = {}) => {
    const storlek = o.storlek ?? 10.5, f: PDFFont = o.fet ? fet : font, x = o.x ?? KANT, bredd = o.bredd ?? A4[0] - KANT - x;
    for (const r of brytt(s, f, storlek, bredd)) {
      plats(storlek * 1.4);
      sida.drawText(r, { x, y: y - storlek, size: storlek, font: f, color: o.farg ?? farg.text });
      y -= storlek * 1.4;
    }
    y -= o.luft ?? 0;
  };
  // En rubrik står aldrig ensam sist på en sida: den får plats med det som följer, behov punkter.
  const rubrik = (s: string, behov = 40) => { plats(behov + 30); y -= 10; text(s, { storlek: 13, fet: true, luft: 4 }); };
  // Staplar vecka för vecka (1 till 5), med veckan i planen och kalenderveckan under, som på sidan (veckansNamn i standarden),
  // en markering vid avstämningen och, för en elev när läraren noterar närvaron, veckans pass som prickar: fylld var med, ring
  // var inte med, streck inte bockat.
  type Stapelval = { hojd?: number; mitt?: number | null; pass?: ('med' | 'borta' | 'inte')[][] };
  // Fältet för Mitt i står ovanför stapelns värde, så att värdet 5 inte täcker det (buggjakten 2026-10-25).
  // Veckan mitt i insatsen i ett ljust fält med ordet Mitt i, som på sidan, ritat först, så att staplarna och linjen står
  // ovanpå.
  const mittfalt = (mitt: number | null | undefined, x0: number, steg: number, botten: number, h: number) => {
    if (!mitt) return;
    const mx = x0 + (mitt - 1) * steg;
    sida.drawRectangle({ x: mx + 1, y: botten - 2, width: steg - 2, height: h + 24, color: farg.mitt });
    sida.drawText('Mitt i', { x: mx + steg / 2 - font.widthOfTextAtSize('Mitt i', 7) / 2, y: botten + h + 15, size: 7, font, color: farg.svag });
  };
  const staplarnasHojd = (o: Stapelval) => (o.hojd ?? 70) + 43 + (o.pass ? 14 : 0) + (o.mitt ? 22 : 0);
  const staplar = (varden: (number | undefined)[], etiketter: Veckonamn[], o: Stapelval = {}) => {
    const h = o.hojd ?? 70, n = varden.length, bredd = A4[0] - 2 * KANT - 24;
    const steg = Math.min(46, bredd / Math.max(n, 1)), b = steg * 0.62;
    const total = staplarnasHojd(o);
    plats(total);
    if (o.mitt) y -= 22;
    const botten = y - h - 6, x0 = KANT + 24;
    mittfalt(o.mitt, x0, steg, botten, h);
    for (let v = 1; v <= 5; v++) {
      const ly = botten + (v / 5) * h;
      sida.drawLine({ start: { x: x0 - 4, y: ly }, end: { x: x0 + n * steg, y: ly }, thickness: 0.5, color: farg.kant });
      sida.drawText(String(v), { x: KANT + 6, y: ly - 3, size: 7.5, font, color: farg.svag });
    }
    varden.forEach((x, i) => {
      const bx = stapelnsKant(x0, i, steg, b);
      if (x) {
        sida.drawRectangle({ x: bx, y: botten, width: b, height: (x / 5) * h, color: farg.accent });
        sida.drawText(String(x), { x: bx + b / 2 - 2.5, y: botten + (x / 5) * h + 3, size: 8, font: fet, color: farg.text });
      } else sida.drawRectangle({ x: bx, y: botten, width: b, height: 1.2, color: farg.kant });
      const iPlanen = ren(etiketter[i].kort), kalender = ren(etiketter[i].kalender);
      sida.drawText(iPlanen, { x: bx + b / 2 - fet.widthOfTextAtSize(iPlanen, 7.5) / 2, y: botten - 12, size: 7.5, font: fet, color: farg.text });
      sida.drawText(kalender, { x: bx + b / 2 - font.widthOfTextAtSize(kalender, 7) / 2, y: botten - 21, size: 7, font, color: farg.svag });
      prickarna(bx, b, o.pass?.[i] ?? []).forEach(({ x: px, slag: p }) => {
        const py = botten - 31;
        if (p === 'med') sida.drawCircle({ x: px, y: py, size: 2.4, color: farg.gron });
        else if (p === 'borta') sida.drawCircle({ x: px, y: py, size: 2.4, borderColor: farg.gron, borderWidth: 0.8 });
        else sida.drawLine({ start: { x: px - 2, y: py }, end: { x: px + 2, y: py }, thickness: 0.8, color: farg.kant });
      });
    });
    y -= total - (o.mitt ? 22 : 0);
  };
  // Ett namn står aldrig ensamt sist på en sida: det får plats med staplarna under (buggjakten och användbarhetsprovet
  // 2026-10-25: elevens namn stod sist på sidan 1 och staplarna på sidan 2).
  const namnMedStaplar = (namn: string, varden: (number | undefined)[], etiketter: Veckonamn[], o: Stapelval = {}) => {
    plats(11.5 * 1.4 + staplarnasHojd(o));
    text(namn, { fet: true, storlek: 11.5 });
    staplar(varden, etiketter, o);
  };
  // Sidfoten står på en rad, eller på två när den är bredare än sidan (gruppens sammanställning 2026-10-28 i telefonen).
  const avsluta = async (fot: string) => {
    sidor.forEach((s, i) => brytt(`${fot} · sida ${i + 1} av ${sidor.length}`, font, 8, A4[0] - 2 * KANT).forEach((r, j, alla) => s.drawText(r, { x: KANT, y: 28 + (alla.length - 1 - j) * 10, size: 8, font, color: farg.svag })));
    return doc.save();
  };
  // En tabell med etiketten till vänster och texten bredvid, med en tunn linje mellan raderna, som Innehållet i insatsen
  // med raderna ur texten till åtgärdsprogrammet (Niclas 2026-10-28). En rad utan etikett går över hela bredden.
  const tabell = (rader: { etikett?: string; text: string }[], o: { etikett?: number; luft?: number } = {}) => {
    const storlek = 9.5, rad = storlek * 1.35, xt = KANT + (o.etikett ?? 112);
    for (const r of rader) {
      const x = r.etikett ? xt : KANT;
      const delar = brytt(r.text, font, storlek, A4[0] - KANT - x - 4), etikett = r.etikett ? brytt(r.etikett, fet, storlek, xt - KANT - 10) : [];
      // En rad som är längre än det som ryms på sidan fortsätter på nästa, rad för rad (Codex 2026-10-28).
      plats(Math.min(Math.max(delar.length, etikett.length), 3) * rad + 8);
      sida.drawLine({ start: { x: KANT, y }, end: { x: A4[0] - KANT, y }, thickness: 0.5, color: farg.kant });
      y -= 4;
      for (let i = 0; i < Math.max(delar.length, etikett.length); i++) {
        if (y - rad < KANT + 30) ny();
        if (etikett[i]) sida.drawText(etikett[i], { x: KANT, y: y - storlek, size: storlek, font: fet, color: farg.text });
        if (delar[i]) sida.drawText(delar[i], { x, y: y - storlek, size: storlek, font, color: farg.text });
        y -= rad;
      }
      y -= 4;
    }
    sida.drawLine({ start: { x: KANT, y }, end: { x: A4[0] - KANT, y }, thickness: 0.5, color: farg.kant });
    y -= o.luft ?? 6;
  };
  // Eleverna vecka för vecka i en tabell (Niclas 2026-10-28: "snygga till sammanställningen"): veckorna i planen med
  // kalenderveckan överst, en rad per elev med skattningen i en ruta vars ton följer värdet, och en sista kolumn, som
  // närvaron. En rad med text i rutorna, som passen, står utan ton. Veckan mitt i insatsen har ett ljust fält i huvudet.
  const matris = (etiketter: Veckonamn[], rader: { namn: string; varden: (number | string | undefined)[]; sist?: string }[], o: { sist?: string; mitt?: number | null } = {}): void => {
    // En lång plan står i flera tabeller med högst sexton veckor, så att veckorna aldrig står ovanpå varandra (Codex
    // 2026-10-28), och den sista kolumnen står i den sista.
    const DEL = 16;
    if (etiketter.length > DEL) {
      for (let i = 0; i < etiketter.length; i += DEL) {
        const sist = i + DEL >= etiketter.length;
        const mitt = o.mitt && o.mitt > i && o.mitt <= i + DEL ? o.mitt - i : null;
        matris(etiketter.slice(i, i + DEL), rader.map((r) => ({ namn: r.namn, varden: r.varden.slice(i, i + DEL), ...(sist && r.sist ? { sist: r.sist } : {}) })), { ...(sist && o.sist ? { sist: o.sist } : {}), mitt });
      }
      return;
    }
    const n = etiketter.length, namnB = 104, sistB = o.sist ? 74 : 0, bredd = A4[0] - 2 * KANT - namnB - sistB, steg = Math.min(34, bredd / Math.max(n, 1));
    const huvudH = 26, radH = 17, x0 = KANT + namnB;
    const huvud = () => {
      if (o.mitt) sida.drawRectangle({ x: x0 + (o.mitt - 1) * steg, y: y - huvudH, width: steg, height: huvudH, color: farg.mitt });
      etiketter.forEach((e, i) => {
        const cx = x0 + i * steg + steg / 2, kort = ren(e.kort), kal = ren(e.kalender);
        sida.drawText(kort, { x: cx - fet.widthOfTextAtSize(kort, 7.5) / 2, y: y - 11, size: 7.5, font: fet, color: farg.text });
        sida.drawText(kal, { x: cx - font.widthOfTextAtSize(kal, 6.5) / 2, y: y - 21, size: 6.5, font, color: farg.svag });
      });
      if (o.sist) sida.drawText(ren(o.sist), { x: x0 + n * steg + 6, y: y - 16, size: 7.5, font: fet, color: farg.text });
      y -= huvudH;
    };
    plats(huvudH + radH * Math.min(rader.length, 3));
    huvud();
    for (const r of rader) {
      // Hela namnet, på flera rader när det är långt, så att två elever med samma förnamn inte heter lika (Codex 2026-10-28).
      const namn = brytt(r.namn, fet, 9, namnB - 8), h = Math.max(radH, namn.length * 11 + 6);
      if (y - h < KANT + 30) { ny(); huvud(); }
      namn.forEach((t, i) => sida.drawText(t, { x: KANT, y: y - 12 - i * 11, size: 9, font: fet, color: farg.text }));
      r.varden.forEach((v, i) => {
        const x = x0 + i * steg;
        if (typeof v === 'number') {
          const t = (v - 1) / 4;
          sida.drawRectangle({ x: x + 2, y: y - radH + 2, width: steg - 4, height: radH - 4, color: rgb(farg.ljusRgb[0] + (farg.accentRgb[0] - farg.ljusRgb[0]) * (0.2 + 0.8 * t), farg.ljusRgb[1] + (farg.accentRgb[1] - farg.ljusRgb[1]) * (0.2 + 0.8 * t), farg.ljusRgb[2] + (farg.accentRgb[2] - farg.ljusRgb[2]) * (0.2 + 0.8 * t)) });
          sida.drawText(String(v), { x: x + steg / 2 - fet.widthOfTextAtSize(String(v), 8.5) / 2, y: y - 12, size: 8.5, font: fet, color: t >= 0.5 ? rgb(1, 1, 1) : farg.text });
        } else if (v) {
          const t = ren(v);
          sida.drawText(t, { x: x + steg / 2 - font.widthOfTextAtSize(t, 7.5) / 2, y: y - 12, size: 7.5, font, color: farg.svag });
        } else sida.drawLine({ start: { x: x + steg / 2 - 3, y: y - 9 }, end: { x: x + steg / 2 + 3, y: y - 9 }, thickness: 0.6, color: farg.kant });
      });
      if (r.sist) sida.drawText(ren(r.sist), { x: x0 + n * steg + 6, y: y - 12, size: 8.5, font, color: farg.text });
      y -= h;
      sida.drawLine({ start: { x: KANT, y }, end: { x: x0 + n * steg + sistB, y }, thickness: 0.4, color: farg.kant });
    }
    y -= 6;
  };
  // Linjen i metodens skattning av gruppen (K-559): kryss vecka för vecka på metodens skala, reglernas gränser streckade,
  // med veckan i planen och kalenderveckan under, som på sidan.
  const linje = (varden: (number | undefined)[], etiketter: Veckonamn[], o: { fran: number; till: number; granser: number[]; hojd?: number; mitt?: number | null }) => {
    const h = o.hojd ?? 90, n = varden.length, bredd = A4[0] - 2 * KANT - 24;
    const steg = Math.min(46, bredd / Math.max(n, 1));
    const total = h + 43 + (o.mitt ? 22 : 0);
    plats(total);
    if (o.mitt) y -= 22;
    const botten = y - h - 6, x0 = KANT + 24;
    const yv = (v: number) => botten + ((v - o.fran) / (o.till - o.fran)) * h;
    mittfalt(o.mitt, x0, steg, botten, h);
    for (const v of [...new Set([o.fran, ...o.granser, o.till])]) {
      const ly = yv(v), streck = o.granser.includes(v);
      sida.drawLine({ start: { x: x0 - 4, y: ly }, end: { x: x0 + n * steg, y: ly }, thickness: streck ? 0.8 : 0.5, color: streck ? farg.accent : farg.kant, ...(streck ? { dashArray: [3, 2] } : {}) });
      sida.drawText(String(v), { x: KANT + 6, y: ly - 3, size: 7.5, font, color: farg.svag });
    }
    const punkter = varden.flatMap((v, i) => (v === undefined ? [] : [{ x: x0 + i * steg + steg / 2, y: yv(v), v }]));
    // Linjen bryts vid en vecka utan kryss, som på sidan.
    varden.forEach((v, i) => { const a = varden[i - 1]; if (i && v !== undefined && a !== undefined) sida.drawLine({ start: { x: x0 + (i - 1) * steg + steg / 2, y: yv(a) }, end: { x: x0 + i * steg + steg / 2, y: yv(v) }, thickness: 1.6, color: farg.accent }); });
    for (const q of punkter) {
      sida.drawCircle({ x: q.x, y: q.y, size: 3, color: farg.accent });
      sida.drawText(String(q.v), { x: q.x - fet.widthOfTextAtSize(String(q.v), 8) / 2, y: q.y + 5, size: 8, font: fet, color: farg.text });
    }
    varden.forEach((_, i) => {
      const cx = x0 + i * steg + steg / 2;
      const iPlanen = ren(etiketter[i].kort), kalender = ren(etiketter[i].kalender);
      sida.drawText(iPlanen, { x: cx - fet.widthOfTextAtSize(iPlanen, 7.5) / 2, y: botten - 12, size: 7.5, font: fet, color: farg.text });
      sida.drawText(kalender, { x: cx - font.widthOfTextAtSize(kalender, 7) / 2, y: botten - 21, size: 7, font, color: farg.svag });
    });
    y -= total - (o.mitt ? 22 : 0);
  };
  return { text, rubrik, staplar, namnMedStaplar, linje, avsluta, tabell, matris, farg };
}

const veckoetiketter = (s: Sammanstallning) => s.veckor.map(veckansNamn);
// Sidans huvud: rubriken, metoden med nivån, perioden och dagen för utskriften, i gruppens pdf också gruppens namn. Elevens
// pdf har inte gruppens namn, som läraren har skrivit och som kan bära andra elevers namn, eftersom den kan gå till hemmet
// och nästa lärare (Opus idérunda 2026-10-28). Perioden, passens läge, riktningen och besluten står med standardens ord, som
// på sidan och i texterna (K-509).
type Pdf = Awaited<ReturnType<typeof dokument>>;
const huvud = (p: Pdf, rubrik: string, plan: Plan, info: PdfInfo, idag: string, gruppens: boolean) => {
  p.text(rubrik, { storlek: 20, fet: true, luft: 2 });
  p.text([info.metod, gruppens ? info.grupp : '', info.niva ? `nivån ${info.niva}` : ''].filter(Boolean).join(', '), { storlek: 13, fet: true, luft: 2 });
  p.text(`${plan.forstaPass && plan.sistaPass ? datumspann(plan.forstaPass, plan.sistaPass) : ''}. Utskriven ${datumText(idag)}.`, { farg: p.farg.svag, luft: 6 });
};
// Innehållet i insatsen (Niclas 2026-10-28: "Ha en rubrik om Innehållet i insatsen med en text från ingress eller metoden"):
// metodens egen text, ingressen för gruppen och undertiteln för eleven, och raderna ur texten till åtgärdsprogrammet, så
// att pdf:en och texten som kopieras aldrig säger olika saker (dokumentationsrader).
const innehallet = (p: Pdf, text: string | undefined, info: PdfInfo, etiketter: string[]) => {
  const rader = (info.insatsen ?? []).filter((r) => r.etikett && etiketter.includes(r.etikett));
  if (!text && !rader.length) return;
  p.rubrik('Innehållet i insatsen', 70);
  if (text) p.text(mening(text), { luft: 6 });
  if (rader.length) p.tabell(rader);
};
// Målet, och i en serie lektionernas mål under det, med elevens lektioner i elevens pdf (K-551).
const malet = (p: Pdf, info: PdfInfo, s: Sammanstallning, e?: Sammanstallning['elever'][number]) => {
  if (info.mal) { p.rubrik('Målet', 30); p.text(info.mal, { luft: 2 }); }
  if (lektionernasMal(s, e)) p.text(lektionernasMal(s, e), { luft: 2 });
};
// Avstämningen mitt i och utvärderingen efter, med besluten och lärarens mening, i en tabell.
const besluten = (p: Pdf, rader: { etikett: string; text: string }[]) => {
  const med = rader.filter((r) => r.text);
  if (!med.length) return;
  p.rubrik('Avstämning och utvärdering', 40);
  p.tabell(med);
};
// Skalan med frågan, före staplarna.
const skalan = (p: Pdf, info: PdfInfo, luft: number) => p.text(`${info.fragan} 1 till 5: ${SKALAN.map((x, i) => `${i + 1} ${x.toLocaleLowerCase('sv')}`).join(', ')}.`, { farg: p.farg.svag, storlek: 9.5, luft });

/**
 * Gruppens sammanställning som pdf, för läraren, rektor och elevhälsan: Innehållet i insatsen med samma rader som texten till
 * åtgärdsprogrammet, målet, Så gick det med en tabell där varje elev har en rad och varje vecka en kolumn, utvecklingen
 * elev för elev, veckornas anteckningar, och avstämningen och utvärderingen (Niclas 2026-10-28: "snygga till
 * sammanställningen"; formen ur en Sonnets och en Opus idéer samma dag).
 */
export async function gruppPdf(plan: Plan, s: Sammanstallning, info: PdfInfo, idag: string): Promise<Uint8Array> {
  const p = await dokument(`Sammanställning: ${info.metod}`);
  huvud(p, 'Sammanställning', plan, info, idag, true);
  innehallet(p, info.ingress, info, ['Omfattning', 'Eleven arbetar med', 'Uppföljning', 'Metoden']);
  malet(p, info, s);
  p.rubrik('Så gick det', 110);
  p.text(passensRad(s), { luft: 4 });
  // Metodens skattning av gruppen, med linjen och reglerna som gällde, före eleverna (K-559).
  for (const sk of s.skattningar) {
    const t = skattningensText(s, sk, info);
    if (!t.varden) continue;
    p.rubrik(sk.namn, 150);
    p.text(`${sk.skala.fran} till ${sk.skala.till}: ${sk.skala.steg.map((x) => `${stegetsSpann(x)} ${x.namn.toLocaleLowerCase('sv')}`).join(', ')}.`, { farg: p.farg.svag, storlek: 9.5, luft: 4 });
    p.linje(sk.varden, veckoetiketter(s), { fran: sk.skala.fran, till: sk.skala.till, granser: skattningensGranser(sk), mitt: s.mitt });
    if (t.regler.length) p.text(`Det linjen sa: ${t.regler.join('; ')}.`, { luft: 8 });
  }
  // Eleverna med något infört står i tabellen och de andra i en mening, och med metodens egen skala för gruppen står
  // eleverna bara när någon har något (den kalla testaren av K-559 2026-10-26). Överst passen vecka för vecka och sist
  // veckans skattning av gruppen, när läraren har gjort den.
  const visas = s.elever.filter((e) => elevenHarNagot(s, e)), utan = s.elever.filter((e) => !elevenHarNagot(s, e));
  const planens = !s.skattningar.length || visas.length > 0;
  const narvaro = (e: (typeof s.elever)[number]) => (e.id !== GRUPPEN && e.narvaro !== null && s.gjorda ? narvaronKort(e, s).replace(/^med i /, '') : '');
  const veckorna = skattadeVeckor(s);
  const rader = [
    ...(s.gjorda ? [{ namn: 'Bockade pass', varden: s.veckor.map((v) => (v.varit ? `${v.gjorda}/${v.planerade}` : '')) }] : []),
    ...(planens ? visas.map((e) => ({ namn: e.namn, varden: elevensVarden(s, e), sist: narvaro(e) })) : []),
    ...(veckorna.length ? [{ namn: 'Veckan', varden: s.veckor.map((v) => v.skattning) }] : []),
  ];
  if (rader.length) {
    p.matris(veckoetiketter(s), rader, { sist: visas.some((e) => narvaro(e)) ? 'Närvaro' : undefined, mitt: s.mitt });
    if (planens && visas.length) skalan(p, info, 4);
    if (veckorna.length) p.text(`Veckans skattning av gruppen, medel ${decimal(s.veckomedel)} av 5.`, { farg: p.farg.svag, storlek: 9.5, luft: 4 });
  }
  if (planens && utan.length) p.text(s.grupp ? 'Gruppen är inte skattad än.' : `Inte skattade än: ${utan.map((e) => e.namn).join(', ')}.`, { luft: 8 });
  // Utvecklingen elev för elev: riktningen och metodens resultat före och efter.
  const utvecklingen = (planens ? visas : []).map((e) => ({ etikett: e.namn, text: [`${riktningText(e)}.`, ...elevensResultat(plan, e.resultat).map((t) => mening(resultatText(plan, info, t)))].join(' ') }));
  if (utvecklingen.length) { p.rubrik('Utvecklingen', 40); p.tabell(utvecklingen); }
  const anteckningar = s.veckor.filter((v) => v.not).map((v) => ({ etikett: veckansNamn(v).Text, text: mening(v.not!) }));
  if (anteckningar.length) { p.rubrik('Veckornas anteckningar', 40); p.tabell(anteckningar); }
  // Utvärderingen, med avslutet och anledningen när insatsen avslutades tidigare (utvarderingenText i standarden, K-542).
  besluten(p, [
    { etikett: 'Mitt i insatsen', text: s.avstamning?.beslut || s.avstamning?.not ? beslutText(s.avstamning) : '' },
    { etikett: 'Efter insatsen', text: utvarderingenText(plan, s.utvardering, !s.slut) },
  ]);
  return p.avsluta(`${info.metod} · Planera insatsen på niclasfohlin.se · lärarens egen plan, sparas inte på sajten`);
}

/**
 * En elevs sammanställning som pdf, som kan gå till hemmet och nästa lärare: Innehållet i insatsen med metodens undertitel,
 * målet, skattningen och närvaron vecka för vecka, utvecklingen med resultaten, och avstämningen och utvärderingen utan andra
 * elevers namn.
 */
export async function elevPdf(plan: Plan, s: Sammanstallning, id: string, info: PdfInfo, idag: string, franvaro: Record<string, string[]>): Promise<Uint8Array> {
  const e = s.elever.find((x) => x.id === id)!;
  const p = await dokument(`${e.namn}: ${info.metod}`);
  huvud(p, e.namn, plan, info, idag, false);
  innehallet(p, info.undertitel, info, ['Omfattning', 'Eleven arbetar med', 'Metoden']);
  malet(p, info, s, e);
  p.rubrik('Vecka för vecka', 180);
  skalan(p, info, 6);
  const narvaro = s.narvaro && e.narvaro !== null && s.gjorda > 0;
  const pass = narvaro ? passensNarvaro(s, e, franvaro) : undefined;
  p.staplar(elevensVarden(s, e), veckoetiketter(s), { hojd: 110, mitt: s.mitt, pass });
  if (narvaro) p.text(prickarnasText(e), { farg: p.farg.svag, storlek: 8.5, luft: 6 });
  p.rubrik('Utvecklingen');
  p.text(`${riktningText(e)}.`);
  if (narvaro) p.text(narvaronText(e, s));
  for (const t of elevensResultat(plan, e.resultat)) p.text(mening(resultatText(plan, info, t)));
  // Utvärderingen med lärarens mening, och avslutet med anledningen när insatsen avslutades tidigare (K-542; Niclas
  // 2026-10-25: "kommer med på totala sammaställningen och för varje elev"). Meningen gäller gruppen, så de andra elevernas
  // namn står inte i den här elevens utskrift.
  besluten(p, [
    // Avstämningen med beslutet utan lärarens mening, som kan handla om de andra eleverna.
    { etikett: 'Mitt i insatsen', text: s.avstamning?.beslut ? `${BESLUT[s.avstamning.beslut as keyof typeof BESLUT] ?? s.avstamning.beslut}.` : '' },
    { etikett: 'Efter insatsen', text: utanNamn(utvarderingenText(plan, s.utvardering, !s.slut), s.namnen.filter((x) => x.namn !== e.namn), [e]) },
  ]);
  return p.avsluta(`${e.namn} · ${info.metod} · Planera insatsen på niclasfohlin.se · lärarens egen plan`);
}
