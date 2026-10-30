// Sammanställningen i Lär dig metoden som pdf (K-628), lärarens utveckling att ta med till arbetslaget: metoden, lärarens
// mål, klasserna, stegen med antalet veckor, de två skattningarnas linjer vecka för vecka på skalan 1 till 10 med regelns
// råd när en regel slog till, och kommentarerna i veckans ordning, med klassernas under sin vecka. Pdf:en görs i
// webbläsaren med samma byggstenar som Planera insatsens sammanställning (dokument i src/scripts/planpdf.ts), med pdf-lib,
// som hämtas först när läraren trycker, och den lämnar aldrig enheten. Allt som räknas kommer ur standardens
// larDigSammanstallning, som sidan visar.
import { datumspann, datumText, granslinjensText, isoVecka, kalendervecka, larDigetsRegler, liten, mening, plusDagar, skalansAndar, skattningensGranser, talText, uppraknat, type LarDigSammanstallning } from '../lib/standard/index.js';
import { dokument } from './planpdf';

export interface LarDigPdfInfo {
  metod: string;
  /** Lärarens klasser och grupper, de som står i listan. */
  klasser: string[];
  /** Progressionens rubriker, stegens namn i metodens ordning. */
  steg: string[];
  /** Stegens fråga till Gick det? i samma ordning, eller tom när steget inte har någon. */
  fragor: string[];
  /** Frågorna på arbetslagets möte efter stegen (uppdrag.reflektera). */
  reflektera: string[];
  /** Uppföljningens rader, som reglerna pekar på. */
  uppfoljning: { nar: string; vad: string }[];
}

const veckorna = (n: number) => (n === 1 ? 'en vecka' : `${talText(n)} veckor`);

/** Lärarens sammanställning som pdf. */
export async function larDigPdf(s: LarDigSammanstallning, info: LarDigPdfInfo, idag: string): Promise<Uint8Array> {
  const p = await dokument(`Lär dig metoden: ${info.metod}`, 'Lär dig metoden, niclasfohlin.se');
  p.text('Lär dig metoden', { storlek: 20, fet: true, luft: 2 });
  p.text(info.metod, { storlek: 13, fet: true, luft: 2 });
  // Perioden till och med veckan läraren är i, så att veckor som inte har varit inte står med.
  const forsta = s.veckor[0]?.mandag, sista = s.veckor.filter((v) => v.mandag <= idag).at(-1)?.mandag;
  p.text(`${forsta && sista ? `${datumspann(forsta, plusDagar(sista, 4))}. ` : ''}Utskriven ${datumText(idag)}.`, { farg: p.farg.svag, luft: 6 });
  if (s.mal) { p.rubrik('Ditt mål', 30); p.text(mening(s.mal), { luft: 2 }); }
  if (info.klasser.length) { p.rubrik('Klasserna', 30); p.text(mening(uppraknat(info.klasser)), { luft: 2 }); }
  p.rubrik('Stegen', 60);
  // Stegen som läraren har tagit, med det som pågår, och stegen som är kvar på en rad (larDigSammanstallning).
  if (s.stegen.length) p.tabell(s.stegen.map((x) => ({ etikett: `Steg ${x.innehall}`, text: `${x.steg !== null ? `${info.steg[x.steg] ?? ''}, ` : ''}${x.pagar ? `pågår, ${veckorna(x.veckor)} hittills` : veckorna(x.veckor)}.` })), { etikett: 50 });
  if (s.kvar.length) p.text(`Kvar: ${uppraknat(s.kvar.map((x) => (x.steg !== null ? info.steg[x.steg] ?? '' : String(x.innehall))))}.`, { luft: 4 });
  if (s.lov.length) p.text(`Lov ${uppraknat(s.lov.map((m) => kalendervecka(isoVecka(m).vecka)))}.`, { farg: p.farg.svag, storlek: 9.5, luft: 4 });
  const etiketter = s.veckor.map((v) => v.namn);
  // Rubriken står på samma sida som skalans rad och linjen under den. Linjen har sidans hela bredd, skalans ändar står före
  // den och den streckade linjen förklaras under den (de kalla läsarna 2026-10-30).
  for (const [j, l] of s.linjer.entries()) {
    p.rubrik(l.namn, 150);
    if (!l.varden.some((x) => x !== undefined)) { p.text('Inte skattad än.', { luft: 4 }); continue; }
    const andar = skalansAndar(l.namn, j);
    p.text(andar ? `${l.skala.fran} är ${liten(andar.lagst)} och ${l.skala.till} är ${liten(andar.hogst)}, vecka för vecka.` : `${l.skala.fran} till ${l.skala.till}, vecka för vecka.`, { farg: p.farg.svag, storlek: 9.5, luft: 4 });
    p.linje(l.varden, etiketter, { fran: l.skala.fran, till: l.skala.till, granser: skattningensGranser(l), hojd: 80, full: true });
    if (granslinjensText(l.regler)) p.text(granslinjensText(l.regler), { farg: p.farg.svag, storlek: 9.5, luft: 4 });
    const regler = larDigetsRegler({ ...s, linjer: [l] }, info.uppfoljning);
    if (!regler.length) continue;
    for (const r of regler) p.text(mening(r), { luft: 2 });
    // Regelns råd ur metodens uppföljning, en gång för varje regel som slog till.
    const rader = [...new Set(l.galler.flatMap((g) => (g.length ? [l.regler[g[0]].rad] : [])))];
    p.tabell(rader.map((r) => ({ etikett: info.uppfoljning[r]?.nar ?? '', text: mening(info.uppfoljning[r]?.vad ?? '') })));
  }
  const kommentarer = s.veckor.filter((w) => w.kommentar || w.noter.length || (w.gick && !w.efter));
  // Veckan med stegets namn, och under den svaret på Gick det?, veckans kommentar och en rad för varje klass.
  if (kommentarer.length) {
    p.rubrik('Kommentarerna', 50);
    for (const w of kommentarer) {
      p.text(`${w.namn.Text}${w.steg !== null && info.steg[w.steg] ? `, ${info.steg[w.steg]}` : ''}`, { fet: true, luft: 1 });
      const fraga = w.steg !== null ? info.fragor[w.steg] : '';
      const rader = [w.gick && !w.efter ? `${fraga || 'Gick det?'} ${w.gick === 'ja' ? 'Ja.' : 'Inte än.'}` : '', w.kommentar ? mening(w.kommentar) : '', ...w.noter.map((x) => `${x.namn}: ${mening(x.text)}`)].filter(Boolean);
      rader.forEach((r, i) => p.text(r, { x: 62, luft: i === rader.length - 1 ? 8 : 1 }));
    }
  }
  // Frågorna på arbetslagets möte, så att pdf:en går att ta med dit.
  if (info.reflektera.length) {
    p.rubrik('Frågorna på mötet', 60);
    info.reflektera.forEach((x, i) => p.text(`${i + 1}. ${x}`, { luft: i === info.reflektera.length - 1 ? 8 : 2 }));
  }
  p.text('Skattningarna är dina egna och stöder dina beslut vecka för vecka. En förändring i dem visar inte metodens effekt.', { farg: p.farg.svag, storlek: 9.5, luft: 4 });
  return p.avsluta(`${info.metod} · Lär dig metoden på niclasfohlin.se · lärarens egen plan, sparas inte på sajten`);
}
