// Strukturkortets form (K-650): ett liggande A5, framsidan med namnet och bilden och baksidan med namnet, stegen och en
// miniatyr av bilden, i en ram i slagets färg med slagets symbol mitt på ramens överkant. Formen är den Niclas valde
// 2026-10-31 ur skisserna (underlag/prov/strukturer/UPPDRAGET.md under Läget):
//
//   namnet på framsidan    fyller bredden, 80 punkter ned till 56, och ett långt namn får två rader ("Ska kunna ses på
//                          avstånd", "det syns iaf tydligt 5m bort")
//   stegen på baksidan     18 punkter; ryms de inte: mindre luft mellan stegen och sedan ned till 16 punkter, och kortet
//                          listas som en text att korta ("Ja till 18 som standard. Och att steg 1 är att skriva texten
//                          kortare och enklare")
//   ramen                  överkanten 10 mm från arkets kant och de andra kanterna 5,5 mm, så att symbolens yttersta del
//                          står 4,5 mm från kanten ("Så precis yttersta på symbolen sträcker sig till 4.5mm")
//   miniatyren             utan ram, direkt på det vita, och stegen går runt den ("Bara bilden baksida utan border")
//   typsnittet             Fredoka ("Föredra Fredoka"), i fasta vikter i scripts/strukturer/typsnitt/, gjorda med
//                          fontTools instancer ur Googles variabla Fredoka, med licensen i OFL-Fredoka.txt
//   raden längst ned       © Niclas Fohlin · niclasfohlin.se ("Kanske bara ha niclasfohlin.se"), och ingen text om
//                          utskrift eller klippning på arket ("Ingen text om klipp mm i själva kortet")
//
// Varje kort är två stående A4 med kortet på den övre halvan: framsidan och baksidan. Utskriften av ett urval lägger två
// kort på varje A4 (src/lib/strukturkort.ts). Sidan mäter sig själv när typsnittet har laddats och skriver storlekarna i
// data-attribut, som scripts/strukturer/kort.mjs läser.
import { symbol, SLAGEN } from './symboler.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Bankens platshållare står i kursiv, som *frågan*.
const steget = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

export const KORTETS_STANDARD = Object.freeze({ steg: 18, stegMinst: 16, namn: 80, namnMinst: 56 });

const stil = (typsnitt) => `
@font-face { font-family: Fredoka; src: url(${typsnitt}/Fredoka-Regular.ttf); font-weight: 400; }
@font-face { font-family: Fredoka; src: url(${typsnitt}/Fredoka-SemiBold.ttf); font-weight: 600; }
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Fredoka, sans-serif; color: #14202b; }
.ark { width: 210mm; height: 297mm; position: relative; page-break-after: always; overflow: hidden; }
.kort { position: absolute; left: 0; top: 0; width: 210mm; height: 148.5mm; }
.ram { position: absolute; inset: 10mm 5.5mm 5.5mm 5.5mm; border: 0.9mm solid var(--slag); border-radius: 3mm; }
.flik { position: absolute; top: -6.4mm; right: 7mm; background: #fff; padding: 0 2.5mm; display: flex; align-items: center; gap: 2mm; font-weight: 600; font-size: 16pt; color: color-mix(in srgb, var(--slag) 82%, #000); }
.flik svg { width: 12mm; height: 12mm; }
.namn { position: absolute; left: 5mm; margin: 0; font-weight: 600; }
.fram .namn { right: 5mm; top: 3mm; font-size: ${KORTETS_STANDARD.namn}pt; line-height: 1; white-space: nowrap; }
.fram img { position: absolute; left: 50%; transform: translateX(-50%); top: var(--bildtopp, 31mm); height: calc(148.5mm - var(--bildtopp, 31mm) - 9mm); width: 186mm; object-fit: contain; }
.bak .namn { right: 60mm; top: 5mm; font-size: 32pt; line-height: 1.05; }
.stegyta { position: absolute; left: 4mm; right: 3mm; top: 7mm; bottom: 8mm; }
.mini { float: right; width: 52mm; height: 32mm; margin: 0 0 2mm 4mm; object-fit: contain; object-position: right top; }
.stegyta ol { margin: 0; padding: 15mm 0 0 9mm; font-size: ${KORTETS_STANDARD.steg}pt; line-height: 1.28; }
.stegyta li { margin: 0 0 0.35em; padding-left: 1mm; }
.stegyta li::marker { font-weight: 600; }
.stegyta ol.tat li { margin-bottom: 0.12em; }
.upphov { position: absolute; bottom: -1.2mm; left: 9mm; background: #fff; padding: 0 2mm; font-size: 7.5pt; line-height: 1; color: #4a5560; }
.klipp { position: absolute; left: 0; right: 0; top: 148.5mm; border-top: 0.35mm dashed #9aa5b1; }
`;

// Mätningen i sidan: namnet krymper tills det ryms på en rad, ned till 56 punkter, och får sedan två rader; stegen står
// i 18 punkter, får mindre luft och sedan mindre text ned till 16 när de inte ryms. Resultatet står i data-attribut.
const MATNING = `<script>document.fonts.ready.then(() => {
  const S = ${JSON.stringify(KORTETS_STANDARD)};
  for (const n of document.querySelectorAll('.fram .namn')) {
    let pt = S.namn; n.style.fontSize = pt + 'pt';
    while (n.scrollWidth > n.clientWidth && pt > S.namnMinst) { pt -= 2; n.style.fontSize = pt + 'pt'; }
    if (n.scrollWidth > n.clientWidth) n.style.whiteSpace = 'normal';
    n.dataset.pt = pt; n.dataset.rader = Math.round(n.getBoundingClientRect().height / (pt * 1.333));
    n.closest('.kort').style.setProperty('--bildtopp', (3 + n.getBoundingClientRect().height / 3.7795 + 3) + 'mm');
  }
  for (const ol of document.querySelectorAll('.stegyta ol')) {
    const ryms = () => ol.lastElementChild.getBoundingClientRect().bottom <= ol.parentElement.getBoundingClientRect().bottom;
    let pt = S.steg;
    if (!ryms()) { ol.classList.add('tat'); ol.dataset.tat = '1'; }
    while (!ryms() && pt > S.stegMinst) { pt -= 0.5; ol.style.fontSize = pt + 'pt'; }
    ol.dataset.pt = pt;
    if (!ryms()) ol.dataset.rymsInte = '1';
  }
  document.body.dataset.klar = '1';
});</script>`;

/**
 * Korten som en sida att skriva ut: för varje kort ett A4 med framsidan och ett med baksidan, kortet på den övre halvan.
 * @param {{ id: string, namn: string, slag: 'par'|'grupp'|'klass', steg: string[], bild: string }[]} kort  bild är bildens adress
 * @param {{ typsnitt: string }} o  mappen med Fredoka, som adress
 */
export function kortenHtml(kort, { typsnitt }) {
  const sida = (k, del) => {
    const s = SLAGEN[k.slag];
    const flik = `<div class="flik">${symbol(k.slag, { klass: '' })}<span>${s.namn}</span></div>`;
    const inne = del === 'fram'
      ? `<h2 class="namn">${esc(k.namn)}</h2><img src="${esc(k.bild)}" alt="">`
      : `<h2 class="namn">${esc(k.namn)}</h2><div class="stegyta"><img class="mini" src="${esc(k.bild)}" alt=""><ol>${k.steg.map((t) => `<li>${steget(t)}</li>`).join('')}</ol></div><div class="upphov">© Niclas Fohlin · niclasfohlin.se</div>`;
    return `<div class="ark" data-id="${esc(k.id)}" data-sida="${del}"><div class="kort ${del}" style="--slag:${s.farg}"><div class="ram">${flik}${inne}</div></div><div class="klipp"></div></div>`;
  };
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>Strukturkort</title><style>${stil(typsnitt)}</style></head><body>${kort.map((k) => sida(k, 'fram') + sida(k, 'bak')).join('')}${MATNING}</body></html>`;
}
