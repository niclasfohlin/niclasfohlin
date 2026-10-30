// Skattningen med skalans knappar och linjen, som Planera insatsen och Lär dig metoden ritar lika (sajtens K-628; Niclas
// 2026-10-30 om Lär dig metoden: "Du har ju en Planera insats som ser ut med 10 knappar + linjediagram. Den finns väl i
// Gruppstärkande aktiviteter?" och "Bara att ta samma men med annat syfte"). Formen är Lärarens skattning i Gruppstärkande
// aktiviteter (K-559, Niclas godkände den 2026-10-26): knapparna i en rad där de ryms och annars i två rader om fem, och
// linjen vecka för vecka med reglernas gränser streckade. Linjen och reglerna räknas i standarden (linjen i
// src/lib/standard/plan.js), och här ritas de.
import { esc, skattningensGranser, stegetsNamn, stor, type Regel, type Skala, type Veckonamn } from '../lib/standard/index.js';
import { kanSkrivaUtPdf, skrivUt } from './pdfutskrift';

/** En skattning med en skala, som linjen och knapparna ritar: metodens Lärarens skattning eller lärarens egen. */
export interface Skalskattning { namn: string; skala: Skala; regler: Regel[] }

/**
 * Skalans knappar för en vecka: ett tryck per steg, med stegets namn för en skärmläsare när skalan har namn. Knapparna bär
 * veckans måndag och skattningens namn (data-matt och data-instrument), som sidans skript läser.
 */
export function skalansKnappar(g: Skalskattning, mandag: string, varde: number | undefined) {
  const stegen = Array.from({ length: g.skala.till - g.skala.fran + 1 }, (_, k) => g.skala.fran + k);
  const etikett = (n: number) => { const namn = stegetsNamn(g.skala, n); return namn ? `${n}, ${esc(namn.toLocaleLowerCase('sv'))}` : String(n); };
  return `<div class="pl-skala${stegen.length > 6 ? ' pl-skala-lang' : ''}" role="group" aria-label="${esc(`${g.namn}, ${g.skala.fran} till ${g.skala.till}`)}">${stegen.map((n) => `<button type="button" class="pl-skalsteg" data-matt="${esc(mandag)}" data-instrument="${esc(g.namn)}" aria-pressed="${varde === n}" aria-label="${etikett(n)}">${n}</button>`).join('')}</div>`;
}

/** Veckan mitt i insatsen, då läraren stämmer av, som ett ljust fält bakom veckan, lika i staplarna och linjen. */
export const mittfaltet = (x0: number, steg: number, topp: number, h: number, mitt: number) => `<rect x="${x0 + (mitt - 1) * steg + 1}" y="${topp - 26}" width="${steg - 2}" height="${h + 26}" rx="3" class="pl-mittfalt"/><text x="${x0 + (mitt - 1) * steg + steg / 2}" y="${topp - 16}" class="pl-axel pl-mitttext">Mitt i</text>`;

// Linjen i metodens skattning av gruppen: kryss vecka för vecka på metodens skala, reglernas gränser streckade, och i veckan
// platsen för veckan som kommer som en streckad ring (Niclas godkände formen 2026-10-26). Under krysset står veckan i
// planen och kalenderveckan, som under staplarna.
export function linjegraf(g: Skalskattning, varden: (number | undefined)[], etiketter: Veckonamn[], o: { ring?: number; mitt?: number | null } = {}) {
  const { fran, till } = g.skala;
  const steg = 36, x0 = 26, topp = o.mitt ? 34 : 14, h = 120, under = 38, bredd = x0 + varden.length * steg + 4;
  const y = (n: number) => topp + h - ((n - fran) / (till - fran)) * h;
  const granser = skattningensGranser(g);
  const axlar = [...new Set([fran, ...granser, till])].sort((a, b) => a - b).map((n) => `<line x1="${x0 - 4}" x2="${bredd}" y1="${y(n)}" y2="${y(n)}" class="pl-linje${granser.includes(n) ? ' pl-grans' : ''}"/><text x="4" y="${y(n) + 4}" class="pl-axel">${n}</text>`).join('');
  const x = (i: number) => x0 + i * steg + steg / 2;
  const punkter = varden.flatMap((n, i) => (n === undefined ? [] : [[x(i), y(n), n] as const]));
  // Linjen bryts vid en vecka utan kryss, som reglerna, där en vecka utan kryss bryter följden (verifieringen av K-559
  // 2026-10-26: linjen gick förbi en vecka utan skattning, men ingen regel kom).
  const delar: string[][] = [[]];
  varden.forEach((n, i) => { if (n === undefined) { if (delar[delar.length - 1].length) delar.push([]); } else delar[delar.length - 1].push(`${x(i)},${y(n)}`); });
  const banan = delar.filter((d) => d.length > 1).map((d) => `<polyline points="${d.join(' ')}" class="pl-linjen"/>`).join('');
  const kryss = punkter.map(([a, b, n]) => `<circle cx="${a}" cy="${b}" r="5" class="pl-punkt"/><text x="${a}" y="${b - 9}" class="pl-stapelvarde">${n}</text>`).join('');
  const ring = o.ring !== undefined ? `<circle cx="${x(o.ring)}" cy="${topp + h / 2}" r="6" class="pl-ring"/>` : '';
  const etikett = etiketter.map((e, i) => `<text x="${x(i)}" y="${topp + h + 14}" class="pl-stapeletikett pl-planveckan">${esc(e.kort)}</text><text x="${x(i)}" y="${topp + h + 26}" class="pl-stapeletikett">${esc(e.kalender)}</text>`).join('');
  const mitt = o.mitt ? mittfaltet(x0, steg, topp, h, o.mitt) : '';
  const text = punkter.length ? varden.flatMap((n, i) => (n === undefined ? [] : [`${etiketter[i].text}: ${n}`])).join(', ') : 'inte skattad än';
  return `<svg class="pl-graf stor pl-linjegraf" viewBox="0 0 ${bredd} ${topp + h + under}" width="${bredd}" height="${topp + h + under}" role="img" aria-label="${esc(`${g.namn}, ${fran} till ${till}: ${text}`)}">${mitt}${axlar}${banan}${kryss}${ring}${etikett}</svg>`;
}

// En knapp som ger en pdf heter Skriv ut där webbläsaren kan skriva ut den direkt, och annars "som pdf", som
// utskriftsknapparna på resten av sajten (SkrivUtPdf.astro).
export const pdfOrd = (vad: string) => (kanSkrivaUtPdf() ? `Skriv ut ${vad}` : `${stor(vad)} som pdf`);
// En pdf som görs i webbläsaren skrivs ut direkt där det går, och laddas annars ner, så att telefonen öppnar den.
export async function visaPdf(bytes: Uint8Array, filnamn: string) {
  const fil = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  if (!kanSkrivaUtPdf()) { laddaNer(fil, filnamn); return; }
  const url = URL.createObjectURL(fil);
  skrivUt(url);
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/** En fil som laddas ner, med namnet ur standardens filnamnet (K-519): pdf:erna, planen och kalenderfilen. */
export function laddaNer(fil: Blob, filnamn: string) {
  const url = URL.createObjectURL(fil);
  const a = document.createElement('a');
  a.href = url; a.download = filnamn;
  document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
