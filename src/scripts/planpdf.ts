// Sammanställningen som pdf (Planera insatsen, K-489; Niclas 2026-10-24: "kunna få ut det enkelt (samt skriva ut) på
// gruppnivå och elevnivå"). Pdf:en görs i webbläsaren av lärarens egen plan, med pdf-lib, som hämtas först när någon
// trycker, och lämnar aldrig enheten. Den bär elevernas namn, eftersom den är lärarens egen utskrift; texterna som
// kopieras till dokumentationen har inga namn. Typsnittet är pdf:ens eget (Helvetica). Ett tecken som det inte har skrivs
// utan sina accenter, så att utskriften aldrig går sönder (Niclas: "Ł, Ş och č är så ovanliga att du kan hoppa över dem").
import type { PDFFont, PDFPage } from 'pdf-lib';
import { datumText, elevensResultat, GRUPPEN, isoVecka, SKALAN, uppraknat, type Plan, type Sammanstallning, type SammanstallningElev } from '../lib/standard/index.js';

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
  beslut: Record<string, string>;
}

async function dokument(titel: string) {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  doc.setTitle(ren(titel));
  doc.setAuthor('Planera insatsen, niclasfohlin.se');
  doc.setLanguage('sv-SE');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fet = await doc.embedFont(StandardFonts.HelveticaBold);
  const farg = { text: rgb(0.08, 0.13, 0.17), svag: rgb(0.29, 0.35, 0.4), accent: rgb(0.11, 0.31, 0.57), kant: rgb(0.88, 0.9, 0.92), gron: rgb(0.12, 0.42, 0.27), ljus: rgb(0.95, 0.96, 0.98), mitt: rgb(0.95, 0.9, 0.95) };
  let sida: PDFPage = doc.addPage(A4);
  let y = A4[1] - KANT;
  const sidor: PDFPage[] = [sida];
  const ny = () => { sida = doc.addPage(A4); sidor.push(sida); y = A4[1] - KANT; };
  const plats = (h: number) => { if (y - h < KANT + 30) ny(); };
  // Text med radbrytning inom bredden.
  const text = (s: string, o: { storlek?: number; fet?: boolean; farg?: ReturnType<typeof rgb>; x?: number; bredd?: number; luft?: number } = {}) => {
    const storlek = o.storlek ?? 10.5, f: PDFFont = o.fet ? fet : font, x = o.x ?? KANT, bredd = o.bredd ?? A4[0] - KANT - x;
    const rader: string[] = [];
    for (const stycke of ren(s).split('\n')) {
      let rad = '';
      for (const ord of stycke.split(' ')) {
        const prov = rad ? `${rad} ${ord}` : ord;
        if (f.widthOfTextAtSize(prov, storlek) > bredd && rad) { rader.push(rad); rad = ord; } else rad = prov;
      }
      rader.push(rad);
    }
    for (const r of rader) {
      plats(storlek * 1.4);
      sida.drawText(r, { x, y: y - storlek, size: storlek, font: f, color: o.farg ?? farg.text });
      y -= storlek * 1.4;
    }
    y -= o.luft ?? 0;
  };
  // En rubrik står aldrig ensam sist på en sida: den får plats med det som följer, behov punkter.
  const rubrik = (s: string, behov = 40) => { plats(behov + 30); y -= 10; text(s, { storlek: 13, fet: true, luft: 4 }); };
  // Staplar vecka för vecka (1 till 5), med veckans nummer under, en markering vid avstämningen och, för en elev när
  // läraren noterar närvaron, veckans pass som prickar: fylld var med, ring var inte med, streck inte bockat.
  const staplar = (varden: (number | undefined)[], etiketter: string[], o: { hojd?: number; mitt?: number | null; pass?: ('med' | 'borta' | 'inte')[][] } = {}) => {
    const h = o.hojd ?? 70, n = varden.length, bredd = A4[0] - 2 * KANT - 24;
    const steg = Math.min(46, bredd / Math.max(n, 1)), b = steg * 0.62;
    const total = h + 34 + (o.pass ? 14 : 0) + (o.mitt ? 12 : 0);
    plats(total);
    if (o.mitt) y -= 12;
    const botten = y - h - 6, x0 = KANT + 24;
    if (o.mitt) sida.drawRectangle({ x: x0 + (o.mitt - 1) * steg + 1, y: botten - 2, width: steg - 2, height: h + 14, color: farg.mitt });
    for (let v = 1; v <= 5; v++) {
      const ly = botten + (v / 5) * h;
      sida.drawLine({ start: { x: x0 - 4, y: ly }, end: { x: x0 + n * steg, y: ly }, thickness: 0.5, color: farg.kant });
      sida.drawText(String(v), { x: KANT + 6, y: ly - 3, size: 7.5, font, color: farg.svag });
    }
    varden.forEach((x, i) => {
      const bx = x0 + i * steg + (steg - b) / 2;
      if (x) {
        sida.drawRectangle({ x: bx, y: botten, width: b, height: (x / 5) * h, color: farg.accent });
        sida.drawText(String(x), { x: bx + b / 2 - 2.5, y: botten + (x / 5) * h + 3, size: 8, font: fet, color: farg.text });
      } else sida.drawRectangle({ x: bx, y: botten, width: b, height: 1.2, color: farg.kant });
      const e = ren(etiketter[i]);
      sida.drawText(e, { x: bx + b / 2 - font.widthOfTextAtSize(e, 7.5) / 2, y: botten - 12, size: 7.5, font, color: farg.svag });
      (o.pass?.[i] ?? []).forEach((p, j, alla) => {
        const px = bx + b / 2 + (j - (alla.length - 1) / 2) * 7, py = botten - 22;
        if (p === 'med') sida.drawCircle({ x: px, y: py, size: 2.4, color: farg.gron });
        else if (p === 'borta') sida.drawCircle({ x: px, y: py, size: 2.4, borderColor: farg.gron, borderWidth: 0.8 });
        else sida.drawLine({ start: { x: px - 2, y: py }, end: { x: px + 2, y: py }, thickness: 0.8, color: farg.kant });
      });
    });
    // Veckan mitt i insatsen i ett ljust fält, som på sidan; fältet ritas först, så att staplarna står ovanpå.
    if (o.mitt) {
      const mx = x0 + (o.mitt - 1) * steg;
      sida.drawText('Mitt i', { x: mx + steg / 2 - font.widthOfTextAtSize('Mitt i', 7) / 2, y: botten + h + 6, size: 7, font, color: farg.svag });
    }
    y -= total - (o.mitt ? 12 : 0);
  };
  const avsluta = async (fot: string) => {
    sidor.forEach((s, i) => s.drawText(ren(`${fot} · sida ${i + 1} av ${sidor.length}`), { x: KANT, y: 28, size: 8, font, color: farg.svag }));
    return doc.save();
  };
  return { text, rubrik, staplar, avsluta, farg };
}

const veckoetiketter = (s: Sammanstallning) => s.veckor.map((v) => `v. ${v.vecka}`);
// En mening slutar med punkt, också lärarens egen anteckning.
const medPunkt = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const riktningsord = (e: SammanstallningElev) => {
  if (e.skattningar.length < 2) return e.senaste ? `En skattning: ${e.senaste.varde}.` : 'Inte skattad.';
  const r = e.senaste!.varde > e.forsta!.varde ? 'framåt' : e.senaste!.varde < e.forsta!.varde ? 'bakåt' : 'samma som förut';
  return `Från ${e.forsta!.varde} till ${e.senaste!.varde}, ${r}.`;
};
const periodText = (plan: Plan) => (plan.forstaPass && plan.sistaPass ? `${datumText(plan.forstaPass)} till ${datumText(plan.sistaPass)}` : '');
// Passen som läraren har bockat: ett pass som inte är bockat är inte bockat (granskningarna 2026-10-24).
// De bockade bland passen som har varit, som på sidan, så att ett pass som är bockat i förväg inte räknas (Codex 2026-10-24).
const passText = (s: Sammanstallning) => (!s.gjorda ? 'Inga pass är bockade.' : s.slut ? `${s.gjorda} av ${s.planerade} pass är bockade som genomförda.` : !s.varit ? `Inget pass har varit än. Planen har ${s.planerade} pass.` : `${s.gjordaVarit} av de ${s.varit} pass som har varit är bockade. Planen har ${s.planerade} pass.`);

/** Gruppens sammanställning som pdf. */
export async function gruppPdf(plan: Plan, s: Sammanstallning, info: PdfInfo, idag: string): Promise<Uint8Array> {
  const p = await dokument(`Sammanställning: ${info.metod}`);
  p.text('Sammanställning', { storlek: 20, fet: true, luft: 2 });
  p.text([info.metod, info.grupp, info.niva ? `nivån ${info.niva}` : ''].filter(Boolean).join(', '), { storlek: 13, fet: true, luft: 2 });
  p.text(`${periodText(plan)}. Utskriven ${datumText(idag)}.`, { farg: p.farg.svag, luft: 6 });
  if (info.mal) { p.rubrik('Målet', 30); p.text(info.mal, { luft: 2 }); }
  p.rubrik('Passen');
  p.text(passText(s), { luft: 2 });
  if (s.gjorda) p.text(s.veckor.map((v) => `Vecka ${v.innehall}${v.igen ? ' igen' : ''} (v. ${v.vecka}): ${v.gjorda} av ${v.planerade}`).join('. ') + '.', { farg: p.farg.svag, storlek: 9.5 });
  p.rubrik(s.grupp ? 'Gruppen' : 'Eleverna', 110);
  p.text(`${info.fragan} 1 till 5: ${SKALAN.map((x, i) => `${i + 1} ${x.toLocaleLowerCase('sv')}`).join(', ')}.`, { farg: p.farg.svag, storlek: 9.5, luft: 4 });
  for (const e of s.elever) {
    p.text(e.namn, { fet: true, storlek: 11.5 });
    p.staplar(s.veckor.map((v) => e.skattningar.find((x) => x.nr === v.nr)?.varde), veckoetiketter(s), { hojd: 40, mitt: s.mitt });
    p.text([riktningsord(e), e.id !== GRUPPEN && e.narvaro !== null && s.gjorda ? `Var med i ${e.narvaro} av ${s.gjorda} bockade pass.` : '', ...elevensResultat(plan, e.resultat).map((t) => `${info.uppfoljning[t.rad]?.nar}, vecka ${isoVecka(t.datum).vecka}: ${t.varde}.`)].filter(Boolean).join(' '), { luft: 8 });
  }
  const veckorna = s.veckor.filter((v) => v.skattning);
  if (veckorna.length || s.veckor.some((v) => v.not)) {
    p.rubrik('Hur veckorna gick', veckorna.length ? 120 : 30);
    if (veckorna.length) { p.staplar(s.veckor.map((v) => v.skattning), veckoetiketter(s), { hojd: 60, mitt: s.mitt }); p.text(`Medel ${String(s.veckomedel).replace('.', ',')} av 5.`, { luft: 4 }); }
    for (const v of s.veckor.filter((x) => x.not)) p.text(`Vecka ${v.innehall}${v.igen ? ' igen' : ''} (v. ${v.vecka}): ${medPunkt(v.not!)}`, { storlek: 10 });
  }
  if (s.avstamning?.beslut || s.avstamning?.not) { p.rubrik('Avstämning mitt i insatsen'); p.text(medPunkt([s.avstamning.beslut ? info.beslut[s.avstamning.beslut] : '', s.avstamning.not ?? ''].filter(Boolean).map((x) => x.replace(/[.\s]+$/, '')).join('. '))); }
  if (s.utvardering?.beslut || s.utvardering?.not) { p.rubrik('Utvärdering efter insatsen'); p.text(medPunkt([s.utvardering.beslut ? info.beslut[s.utvardering.beslut] : '', s.utvardering.not ?? ''].filter(Boolean).map((x) => x.replace(/[.\s]+$/, '')).join('. '))); }
  const tider = plan.uppfoljning.filter((u) => u.tillfallen.length).map((u) => `${info.uppfoljning[u.rad]?.nar}, ${uppraknat(u.tillfallen.map((t) => `vecka ${isoVecka(t.datum).vecka}`))}`);
  if (tider.length) { p.rubrik('Metodens uppföljning'); p.text(`${tider.join('. ')}.`); }
  return p.avsluta(`${info.metod} · Planera insatsen på niclasfohlin.se · lärarens egen plan, sparas inte på sajten`);
}

/** En elevs sammanställning som pdf: skattningen och närvaron vecka för vecka, riktningen och resultaten. */
export async function elevPdf(plan: Plan, s: Sammanstallning, id: string, info: PdfInfo, idag: string, franvaro: Record<string, string[]>): Promise<Uint8Array> {
  const e = s.elever.find((x) => x.id === id)!;
  const p = await dokument(`${e.namn}: ${info.metod}`);
  p.text(e.namn, { storlek: 20, fet: true, luft: 2 });
  p.text([info.metod, info.grupp, info.niva ? `nivån ${info.niva}` : ''].filter(Boolean).join(', '), { storlek: 13, fet: true, luft: 2 });
  p.text(`${periodText(plan)}. Utskriven ${datumText(idag)}.`, { farg: p.farg.svag, luft: 6 });
  if (info.mal) { p.rubrik('Målet', 30); p.text(info.mal, { luft: 2 }); }
  p.rubrik('Vecka för vecka', 180);
  p.text(`${info.fragan} 1 till 5: ${SKALAN.map((x, i) => `${i + 1} ${x.toLocaleLowerCase('sv')}`).join(', ')}.`, { farg: p.farg.svag, storlek: 9.5, luft: 6 });
  const narvaro = s.narvaro && e.narvaro !== null && s.gjorda > 0;
  const pass = narvaro ? s.veckor.map((v) => v.pass.map((x) => (!x.gjort ? 'inte' : (franvaro[x.dag] ?? []).includes(id) ? 'borta' : 'med') as 'med' | 'borta' | 'inte')) : undefined;
  p.staplar(s.veckor.map((v) => e.skattningar.find((x) => x.nr === v.nr)?.varde), veckoetiketter(s), { hojd: 110, mitt: s.mitt, pass });
  if (narvaro) p.text('Prickarna under veckan är passen: fylld var med, ring var inte med, streck inte bockat.', { farg: p.farg.svag, storlek: 8.5, luft: 6 });
  p.rubrik('Utvecklingen');
  p.text(riktningsord(e));
  if (narvaro) p.text(`Var med i ${e.narvaro} av ${s.gjorda} bockade pass.`);
  for (const t of elevensResultat(plan, e.resultat)) p.text(`${info.uppfoljning[t.rad]?.nar}, vecka ${isoVecka(t.datum).vecka}: ${t.varde}.`);
  if (s.avstamning?.beslut) p.text(`Gruppens avstämning mitt i insatsen: ${info.beslut[s.avstamning.beslut]}.`);
  if (s.utvardering?.beslut) p.text(`Utvärdering efter insatsen: ${info.beslut[s.utvardering.beslut]}.`);
  return p.avsluta(`${e.namn} · ${info.metod} · Planera insatsen på niclasfohlin.se · lärarens egen plan`);
}
