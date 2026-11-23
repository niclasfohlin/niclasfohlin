// Skattningen med skalans knappar och linjen, som Planera insatsen och Lär dig metoden ritar lika (sajtens K-628; Niclas
// 2026-10-30 om Lär dig metoden: "Du har ju en Planera insats som ser ut med 10 knappar + linjediagram. Den finns väl i
// Gruppstärkande aktiviteter?" och "Bara att ta samma men med annat syfte"). Formen är Lärarens skattning i Gruppstärkande
// aktiviteter (K-559, Niclas godkände den 2026-10-26): knapparna i en rad där de ryms och annars i två rader om fem, och
// linjen vecka för vecka med reglernas gränser streckade. Linjen och reglerna räknas i standarden (linjen i
// src/lib/standard/plan.js), och här ritas de.
import { esc, liten, RAKNAS_FORE, RAKNINGENS_GRANSER, skattningensGranser, stegetsNamn, stor, type Rakningen, type Regel, type Skala, type Veckonamn } from '../lib/standard/index.js';
import { kanSkrivaUtPdf, skrivUt } from './pdfutskrift.ts';

/** En skattning med en skala, som linjen och knapparna ritar: metodens Lärarens skattning eller lärarens egen. */
export interface Skalskattning { namn: string; skala: Skala; regler: Regel[] }

/**
 * Skalans knappar för en vecka: ett tryck per steg, med stegets namn för en skärmläsare när skalan har namn. Knapparna bär
 * veckans måndag och skattningens namn (data-matt och data-instrument), som sidans skript läser, och sidans egna data, som
 * klassen i Lär dig metodens skattning av klasserna (K-631).
 */
export function skalansKnappar(g: Skalskattning, mandag: string, varde: number | undefined, egna: Record<string, string> = {}) {
  const stegen = Array.from({ length: g.skala.till - g.skala.fran + 1 }, (_, k) => g.skala.fran + k);
  const etikett = (n: number) => { const namn = stegetsNamn(g.skala, n); return namn ? `${n}, ${esc(namn.toLocaleLowerCase('sv'))}` : String(n); };
  return `<div class="pl-skala${stegen.length > 6 ? ' pl-skala-lang' : ''}" role="group" aria-label="${esc(`${g.namn}, ${g.skala.fran} till ${g.skala.till}`)}">${stegen.map((n) => `<button type="button" class="pl-skalsteg" data-matt="${esc(mandag)}" data-instrument="${esc(g.namn)}"${Object.entries(egna).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('')} aria-pressed="${varde === n}" aria-label="${etikett(n)}">${n}</button>`).join('')}</div>`;
}

/** Skalans ändar under knapparna, gömda för en skärmläsare, som hör dem i knapparna (stegetsNamn). */
export const skalansAndarRad = (skala: { fran: number; till: number }, andar: { lagst: string; hogst: string }) => `<p class="ld-skalans-andar" aria-hidden="true"><span>${skala.fran} ${esc(andar.lagst)}</span><span>${skala.till} ${esc(andar.hogst)}</span></p>`;
/** Veckan mitt i insatsen, då läraren stämmer av, som ett ljust fält bakom veckan, lika i staplarna och linjen. */
export const mittfaltet = (x0: number, steg: number, topp: number, h: number, mitt: number) => `<rect x="${x0 + (mitt - 1) * steg + 1}" y="${topp - 26}" width="${steg - 2}" height="${h + 26}" rx="3" class="pl-mittfalt"/><text x="${x0 + (mitt - 1) * steg + steg / 2}" y="${topp - 16}" class="pl-axel pl-mitttext">Mitt i</text>`;

// Linjen i metodens skattning av gruppen: kryss vecka för vecka på metodens skala, reglernas gränser streckade, och i veckan
// platsen för veckan som kommer som en streckad ring (Niclas godkände formen 2026-10-26). Under krysset står veckan i
// planen och kalenderveckan, som under staplarna. Lär dig metoden väljer två saker som Planera insatsen inte har (K-628; de
// kalla läsarna och formgranskningen 2026-10-30): undan sätter ett tal under punkten när det annars står på den streckade
// gränsen, och vidgas låter diagrammet växa med rutan, upp till en och en halv gång, så att det inte tar halva bredden på en
// dator. Utan dem ritas linjen som förut.
export function linjegraf(g: Skalskattning, varden: (number | undefined)[], etiketter: Veckonamn[], o: { ring?: number; mitt?: number | null; undan?: boolean; vidgas?: boolean } = {}) {
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
  const paGransen = (b: number) => !!o.undan && granser.some((gr) => y(gr) > b - 21 && y(gr) < b - 5);
  const kryss = punkter.map(([a, b, n]) => `<circle cx="${a}" cy="${b}" r="5" class="pl-punkt"/><text x="${a}" y="${paGransen(b) ? b + 17 : b - 9}" class="pl-stapelvarde">${n}</text>`).join('');
  const ring = o.ring !== undefined ? `<circle cx="${x(o.ring)}" cy="${topp + h / 2}" r="6" class="pl-ring"/>` : '';
  const etikett = etiketter.map((e, i) => `<text x="${x(i)}" y="${topp + h + 14}" class="pl-stapeletikett pl-planveckan">${esc(e.kort)}</text><text x="${x(i)}" y="${topp + h + 26}" class="pl-stapeletikett">${esc(e.kalender)}</text>`).join('');
  const mitt = o.mitt ? mittfaltet(x0, steg, topp, h, o.mitt) : '';
  const text = punkter.length ? varden.flatMap((n, i) => (n === undefined ? [] : [`${etiketter[i].text}: ${n}`])).join(', ') : 'inte skattad än';
  const matt = o.vidgas ? `style="width: clamp(${bredd}px, 100%, ${Math.round(bredd * 1.5)}px); height: auto"` : `width="${bredd}" height="${topp + h + under}"`;
  return `<svg class="pl-graf stor pl-linjegraf" viewBox="0 0 ${bredd} ${topp + h + under}" ${matt} role="img" aria-label="${esc(`${g.namn}, ${fran} till ${till}: ${text}`)}">${mitt}${axlar}${banan}${kryss}${ring}${etikett}</svg>`;
}

// ---------- Det läraren räknar om en elev (K-815) ----------
/** Så många tal står i raden innan läraren trycker Fler: 0 till 6, som de flesta veckor räcker till. */
const RAKNAS_FORST = 6;
/**
 * Talen för en sak och en vecka, eller veckan före start: 0 till 6 och Fler, som fäller ut resten. Noll är en knapp som de
 * andra, så att en vecka utan svåra stunder är ett svar, och en vecka utan vald knapp är inte räknad. Knapparna bär veckans
 * måndag, eller ordet för veckan före start, och sakens namn, som sidans skript läser.
 */
export function antalsknappar(sak: string, vecka: string, varde: number | undefined, alla: boolean) {
  const till = alla || (varde ?? 0) > RAKNAS_FORST ? RAKNINGENS_GRANSER.hogst : RAKNAS_FORST;
  const tal = Array.from({ length: till + 1 }, (_, n) => n);
  const etikett = (n: number) => (n === RAKNINGENS_GRANSER.hogst ? `${n} eller fler` : String(n));
  return `<div class="pl-skala pl-raknetal" role="group" aria-label="${esc(sak)}">${tal.map((n) => `<button type="button" class="pl-skalsteg" data-rakna="${esc(vecka)}" data-antal="${esc(sak)}" data-tal="${n}" aria-pressed="${varde === n}" aria-label="${esc(`${sak}: ${etikett(n)}`)}">${n === RAKNINGENS_GRANSER.hogst ? `${n}+` : n}</button>`).join('')}${till === RAKNAS_FORST ? `<button type="button" class="pl-skalsteg pl-fler" data-fler="${esc(sak)}" aria-label="${esc(`${sak}: fler än ${RAKNAS_FORST}`)}">Fler</button>` : ''}</div>`;
}
/**
 * Diagrammet över det läraren räknar om eleven: en ruta staplar för varje sak på samma veckor och med samma höjd per stund,
 * med riktningen i ord och en pil vid namnet, så att ingen färg behöver läsas (Niclas 2026-11-22: "ett stapeldiagram likt
 * Gruppstärkande aktiviteter har"; formen ur en Sonnets och en Opus idéer 2026-11-23). Veckan före start är en stapel med
 * ram, och dess nivå går som en streckad linje genom veckorna. Noll har en låg fot med siffran, en vecka som har varit utan
 * antal ett tunt streck, och veckan läraren är i en streckad stapel tills den är räknad.
 */
export function raknadGraf(r: Rakningen, etiketter: Veckonamn[], o: { nu?: number; mitt?: number | null } = {}) {
  const fore = 42, steg = 31, b = 20, topp = 30, luft = 20, under = 40, bredd = fore + etiketter.length * steg + 2;
  const medFore = r.foreRad !== undefined;
  const x0 = medFore ? fore : 4;
  const hogst = Math.max(3, ...r.serier.flatMap((s) => [s.fore ?? 0, ...s.varden.map((v) => v ?? 0)]));
  const enhet = Math.min(14, 120 / hogst);
  let y = 0;
  const rutor = r.serier.map((s) => {
    const max = Math.max(2, s.fore ?? 0, ...s.varden.map((v) => v ?? 0));
    const h = max * enhet, start = y, botten = y + topp + luft + h;
    y = botten + 12;
    const ned = s.mot === 'ned', klass = ned ? 'pl-rakn-ned' : 'pl-rakn-upp';
    const hojd = (n: number) => Math.max(4, n * enhet);
    const rubrik = `<text x="0" y="${start + 16}"><tspan class="pl-rakn-namn ${klass}">${esc(s.namn)}</tspan><tspan dx="7" class="pl-rakn-pil ${klass}">${ned ? '↓' : '↑'}</tspan><tspan dx="5" class="pl-rakn-vart">ska bli ${ned ? 'färre' : 'fler'}</tspan></text>`;
    const mittfalt = o.mitt ? `<rect x="${x0 + (o.mitt - 1) * steg + 1}" y="${start + topp - 4}" width="${steg - 2}" height="${luft + h + 4}" class="pl-mittfalt"/>` : '';
    const fx = (fore - 12 - b) / 2;
    const forestapel = !medFore ? '' : s.fore === undefined
      ? `<rect x="${fx}" y="${botten - 22}" width="${b}" height="22" class="pl-rakn-tom ${klass}"/>`
      : `<rect x="${fx + 1}" y="${botten - hojd(s.fore)}" width="${b - 2}" height="${hojd(s.fore)}" class="pl-rakn-fore ${klass}"/><text x="${fx + b / 2}" y="${botten - hojd(s.fore) - 5}" class="pl-stapelvarde">${s.fore}</text><line x1="${fore - 8}" x2="${bredd}" y1="${botten - s.fore * enhet}" y2="${botten - s.fore * enhet}" class="pl-rakn-niva ${klass}"/>`;
    const staplar = s.varden.map((v, i) => {
      const bx = x0 + i * steg + (steg - b) / 2;
      if (v !== undefined) return `<rect x="${bx}" y="${botten - hojd(v)}" width="${b}" height="${hojd(v)}" rx="2" class="pl-rakn-stapel ${klass}"/><text x="${bx + b / 2}" y="${botten - hojd(v) - 5}" class="pl-stapelvarde">${v}</text>`;
      if (i === o.nu) return `<rect x="${bx}" y="${botten - 22}" width="${b}" height="22" class="pl-rakn-tom ${klass}"/>`;
      return o.nu !== undefined && i < o.nu ? `<rect x="${bx}" y="${botten - 1.5}" width="${b}" height="1.5" class="pl-stapel-tom"/>` : '';
    }).join('');
    return `${mittfalt}${rubrik}${forestapel}${staplar}<line x1="0" x2="${bredd}" y1="${botten}" y2="${botten}" class="pl-rakn-noll"/>`;
  }).join('');
  const ey = y + 4;
  const veckorna = etiketter.map((e, i) => {
    const cx = x0 + i * steg + steg / 2;
    const nu = i === o.nu;
    return `${nu ? `<rect x="${cx - 11}" y="${ey - 12}" width="22" height="17" rx="8.5" class="pl-rakn-nu"/>` : ''}<text x="${cx}" y="${ey + 1}" class="pl-stapeletikett pl-planveckan${nu ? ' pl-rakn-nutext' : ''}">${esc(e.kort)}</text><text x="${cx}" y="${ey + 16}" class="pl-stapeletikett">${esc(e.kalender)}</text>`;
  }).join('');
  const foretext = medFore ? `<text x="${(fore - 12) / 2}" y="${ey + 1}" class="pl-stapeletikett pl-planveckan">Före</text>` : '';
  const mitttext = o.mitt ? `<text x="${x0 + (o.mitt - 1) * steg + steg / 2}" y="${ey + 31}" class="pl-axel pl-mitttext">Mitt i</text>` : '';
  const text = r.serier.map((s) => `${s.namn}, ska bli ${s.mot === 'ned' ? 'färre' : 'fler'}: ${[...(s.fore === undefined ? [] : [`före start ${s.fore}`]), ...s.varden.flatMap((v, i) => (v === undefined ? [] : [`${liten(etiketter[i].text)} ${v}`]))].join(', ') || 'inte räknat än'}`).join('. ');
  const hel = y + under + (o.mitt ? 4 : -8);
  return `<svg class="pl-graf stor pl-raknad" viewBox="0 0 ${bredd} ${hel}" style="width: clamp(${Math.min(bredd, 300)}px, 100%, ${Math.round(bredd * 1.5)}px); height: auto; min-width: ${etiketter.length > 10 ? bredd : 0}px" role="img" aria-label="${esc(text)}">${rutor}${foretext}${veckorna}${mitttext}</svg>`;
}
/** Nyckeln för veckan före start, som antalsknappar bär där en vecka annars har sin måndag. */
export const FORE_START = RAKNAS_FORE;

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
