// Sammanställningen i Lär dig metoden som pdf (K-628), lärarens utveckling att ta med till arbetslaget: metoden, avslutet när
// läraren har avslutat planen, lärarens mål, klasserna, stegen med antalet veckor, de två skattningarnas linjer vecka för vecka
// på skalan 1 till 10 med regelns råd när en regel slog till, klasserna vecka för vecka med sitt snitt, svaren Mitt i (K-631),
// och kommentarerna i veckans ordning, med klassernas under sin vecka. Pdf:en görs i webbläsaren med samma byggstenar som
// Planera insatsens sammanställning (dokument i src/scripts/planpdf.ts), med pdf-lib, som hämtas först när läraren trycker,
// och den lämnar aldrig enheten. Allt som räknas och varje mening som också står på sidan kommer ur standarden
// (larDigSammanstallning och texterna under Lär dig metoden i src/lib/standard/plan.js).
import { STALLENAS_TABELL, datumspann, linjenRitas, medDecimaler, gickDetSvaret, SKATTNINGARNAS_GRANS, klassernasSkalaText, larDigetsAvslutText, larDigetsKvar, larDigetsRegler, lovetsText, mening, mittIFragan, skalansAndar, skalansAndarText, skattningensGranser, granslinjensText, stegetsRad, type LarDigSammanstallning } from '../lib/standard/index.js';
import { dokument } from './planpdf';

export interface LarDigPdfInfo {
  metod: string;
  /** Progressionens rubriker, stegens namn i metodens ordning. */
  steg: string[];
  /** Stegens fråga till Gick det? i samma ordning, eller tom när steget inte har någon. */
  fragor: string[];
  /** Frågorna på arbetslagets möte efter stegen, Möte 2:s frågor (arbetslagetsMoten i standarden). */
  reflektera: string[];
  /** Uppföljningens rader, som reglerna pekar på. */
  uppfoljning: { nar: string; vad: string }[];
}


/** Lärarens sammanställning som pdf. */
export async function larDigPdf(s: LarDigSammanstallning, info: LarDigPdfInfo, idag: string): Promise<Uint8Array> {
  const p = await dokument(`Lär dig metoden: ${info.metod}`, 'Lär dig metoden, niclasfohlin.se');
  // Planens spann, från första lektionen till det sista stegets sista dag eller dagen läraren avslutade planen, som på sidan
  // (larDigetsSpann i standarden; filerna inför lanseringen, B17: raden slutade på i dag mitt i planen).
  p.huvudet('Lär dig metoden', info.metod, s.spann ? datumspann(s.spann.fran, s.spann.till) : '', idag);
  if (s.avslut) { p.rubrik('Avslutet', 30); p.text(larDigetsAvslutText(s.avslut), { luft: 2 }); }
  if (s.mal) { p.rubrik('Ditt mål', 30); p.text(mening(s.mal), { luft: 2 }); }
  // Klasserna i listan och de borttagna som står kvar med det läraren förde in, som tabellen visar (larDigetsKlasser; B11).
  if (s.klasserna) { p.rubrik('Klasserna', 30); p.text(s.klasserna, { luft: 2 }); }
  p.rubrik('Stegen', 60);
  // Stegen som läraren har tagit, med det som pågår, och stegen som är kvar på en rad (larDigSammanstallning).
  for (const x of s.stegen) p.text(stegetsRad(x, info.steg), { luft: 2 });
  const kvar = larDigetsKvar(s, info.steg);
  if (kvar) p.text(kvar, { luft: 4 });
  if (s.lov.length) p.not(lovetsText(s.lov));
  // Axeln slutar vid avslutet, som på sidan (B13).
  const etiketter = s.axel;
  // Rubriken står på samma sida som skalans rad och linjen under den. Linjen har sidans hela bredd, skalans ändar står före
  // den och den streckade linjen förklaras under den (de kalla läsarna 2026-10-30).
  for (const [j, l] of s.linjer.entries()) {
    p.rubrik(l.namn, 150);
    // Linjen med två kryss, som på sidan (linjenRitas); ett kryss står som ett tal.
    if (!linjenRitas(l)) { const i = l.varden.findIndex((v) => v !== undefined); p.text(i >= 0 ? `Skattad en gång, ${s.veckor[i].namn.text}: ${l.varden[i]} av ${l.skala.till}.` : 'Inte skattad än.', { luft: 4 }); continue; }
    const andar = skalansAndar(l.namn, j);
    p.not(andar ? `${skalansAndarText(l.skala, andar)}, vecka för vecka.` : `${l.skala.fran} till ${l.skala.till}, vecka för vecka.`);
    p.linje(l.varden, etiketter, { fran: l.skala.fran, till: l.skala.till, granser: skattningensGranser(l), hojd: 80, full: true });
    if (granslinjensText(l.regler)) p.not(granslinjensText(l.regler));
    const regler = larDigetsRegler({ ...s, linjer: [l] }, info.uppfoljning);
    if (!regler.length) continue;
    for (const r of regler) p.text(mening(r.text), { luft: 2 });
    // Regelns råd ur metodens uppföljning, en gång för varje regel som slog till, som på sidan.
    const rader = [...new Set(regler.map((r) => r.rad))];
    p.tabell(rader.map((r) => ({ etikett: info.uppfoljning[r]?.nar ?? '', text: mening(info.uppfoljning[r]?.vad ?? '') })));
  }
  // Klasserna vecka för vecka (klassernasTabell), varje klass i listan och en borttagen märkt som borttagen, med talet i varje
  // ruta och klassens snitt sist, som på sidan.
  if (s.klasstabell.rader.length) {
    p.rubrik('Klasserna vecka för vecka', 80);
    p.not(klassernasSkalaText());
    p.matris(s.klasstabell.veckor.map((i) => s.veckor[i].namn), s.klasstabell.rader.map((r) => ({ namn: r.etikett, varden: r.varden, sist: r.snitt === null ? '' : medDecimaler(r.snitt) })), { sist: 'Snitt' });
  }
  // Lektionerna med ställena i ett lager (stallenasTabell), med Ja i veckorna, som på sidan (K-741).
  if (s.stallentabell.rader.length) {
    p.rubrik(STALLENAS_TABELL.rubrik, 80);
    p.not(STALLENAS_TABELL.text);
    p.matris(s.stallentabell.veckor.map((i) => s.veckor[i].namn), s.stallentabell.rader.map((r) => ({ namn: r.etikett, varden: r.ja.map((x) => (x ? 'Ja' : undefined)) })));
  }
  // Svaren Mitt i, under en rubrik med klassen.
  for (const x of s.mittSvar) {
    p.rubrik(`Mitt i: ${x.namn}`, 50);
    if (x.hittills) p.not(x.hittills);
    p.text(mittIFragan(x.namn), { fet: true, luft: 1 });
    p.text(mening(x.text), { luft: 6 });
  }
  // Veckan med stegets namn, och under den svaret på Gick det?, veckans kommentar och en rad för varje klass.
  if (s.kommenterade.length) {
    p.rubrik('Kommentarerna', 50);
    for (const w of s.kommenterade) {
      p.text(`${w.namn.Text}${w.steg !== null && info.steg[w.steg] ? `, ${info.steg[w.steg]}` : ''}`, { fet: true, luft: 1 });
      const fraga = w.steg !== null ? info.fragor[w.steg] : '';
      const rader = [w.gick && !w.efter ? gickDetSvaret(fraga, w.gick) : '', w.kommentar ? mening(w.kommentar) : '', ...w.noter.map((x) => `${x.namn}: ${mening(x.text)}`)].filter(Boolean);
      rader.forEach((r, i) => p.text(r, { x: 62, luft: i === rader.length - 1 ? 8 : 1 }));
    }
  }
  // Frågorna på arbetslagets möte, så att pdf:en går att ta med dit.
  if (info.reflektera.length) {
    p.rubrik('Frågorna på mötet', 60);
    info.reflektera.forEach((x, i) => p.text(`${i + 1}. ${x}`, { luft: i === info.reflektera.length - 1 ? 8 : 2 }));
  }
  p.not(SKATTNINGARNAS_GRANS);
  return p.avsluta(`${info.metod} · Lär dig metoden på niclasfohlin.se · lärarens egen plan, sparas inte på sajten`);
}
