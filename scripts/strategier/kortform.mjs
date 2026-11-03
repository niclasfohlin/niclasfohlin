// Strategikortets form (K-699): ett liggande A5 som strukturkortet (scripts/strukturer/kortform.mjs), med samma ram,
// typsnitt och mått, i strategiernas färg och med strategins nummer i ramens flik där strukturkortet har slaget. Formen
// valdes 2026-11-03 efter idéuppdrag till en Sonnet och en Opus (underlag/prov/strategier/UPPDRAGET.md under Kortet), och
// Niclas såg den samma dag ("Okej!"):
//
//   framsidan   namnet i 80 punkter, ned till 56 och sedan två rader, som strukturkortet ("Ska kunna ses på avstånd");
//               meningen; berättelsens tre kvadratiska bilder med rubriken över och utfallet under och pilar mellan; och
//               handlingen i ett band i strategins färg längst ned, med ikonerna i vita cirklar
//   baksidan    namnet, insikten i en ljus ruta, minnets bild i en spalt till vänster, Så gör du till höger och det som
//               avgör sist under en linje, i 16 punkter ("Större text på baksidan", Niclas om strukturkortet); ryms stegen
//               inte: mindre luft och sedan ned till 14 punkter, och kortet listas som en text att korta
//   raden längst ned  © Niclas Fohlin · niclasfohlin.se på baksidan, som strukturkortet
//
// Varje kort är två stående A4 med kortet på den övre halvan, framsidan och baksidan, och tvaOchTva lägger två kort på
// varje A4 i arkens ordning ur standarden (strukturkortensArk), som filen med alla kort. Sidan mäter sig själv när
// typsnittet har laddats och skriver storlekarna i data-attribut, som scripts/strategier/kort.mjs läser.
import { strukturkortensArk } from '../../src/lib/standard/strukturer.js';
import { STRATEGIERNAS_FARG } from '../../src/lib/standard/strategier.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const STRATEGIKORTETS_STANDARD = Object.freeze({ namn: 80, namnMinst: 56, bak: 16, bakMinst: 14 });

const stil = (typsnitt) => `
@font-face { font-family: Fredoka; src: url(${typsnitt}/Fredoka-Regular.ttf); font-weight: 400; }
@font-face { font-family: Fredoka; src: url(${typsnitt}/Fredoka-SemiBold.ttf); font-weight: 600; }
@page { size: A4; margin: 0; }
:root { --blak: #14202b; --blak-svag: #44505c; --strategi: ${STRATEGIERNAS_FARG.farg}; --strategi-mork: ${STRATEGIERNAS_FARG.mork}; --strategi-ljus: ${STRATEGIERNAS_FARG.ljus}; --gra: #9aa5b1; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Fredoka, sans-serif; color: var(--blak); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h2, h3, p, ol, figure { margin: 0; }
.ark { width: 210mm; height: 297mm; position: relative; page-break-after: always; overflow: hidden; }
.kort { position: absolute; left: 0; top: 0; width: 210mm; height: 148.5mm; }
.kort.nere { top: 148.5mm; }
.klipp { position: absolute; left: 0; right: 0; top: 148.5mm; border-top: 0.35mm dashed var(--gra); }
.ram { position: absolute; inset: 10mm 5.5mm 5.5mm 5.5mm; border: 0.9mm solid var(--strategi); border-radius: 3mm; }
.flik { position: absolute; top: -6.4mm; right: 7mm; height: 12mm; background: #fff; padding: 0 2.5mm; display: flex; align-items: center; gap: 2mm; font-weight: 600; font-size: 16pt; line-height: 1; color: var(--strategi-mork); }
.nr { display: grid; place-items: center; width: 12mm; height: 12mm; border-radius: 50%; background: var(--strategi); color: #fff; font-size: 20pt; font-weight: 600; line-height: 1; padding-top: 0.3mm; }
.upphov { position: absolute; bottom: -1.2mm; left: 9mm; background: #fff; padding: 0 2mm; font-size: 7.5pt; line-height: 1; color: #4a5560; }

.fram .inne { position: absolute; inset: 3mm 5mm 4.2mm 5mm; display: flex; flex-direction: column; }
.namn { margin: 0; font-size: ${STRATEGIKORTETS_STANDARD.namn}pt; font-weight: 600; line-height: 1; white-space: nowrap; }
.mening { margin-top: 0.6mm; font-size: 22pt; line-height: 1.15; color: var(--blak-svag); }
.berattelse { margin-top: 4.6mm; display: grid; grid-template-columns: 48mm 1fr 48mm 1fr 48mm; align-items: start; }
.ruta { display: flex; flex-direction: column; align-items: center; text-align: center; }
.ruta-rubrik { font-weight: 600; font-size: 13pt; line-height: 1.2; margin-bottom: 1.5mm; }
.bild { display: grid; place-items: center; width: 48mm; height: 48mm; border-radius: 2.5mm; overflow: hidden; background: #dfeedb; color: #5c7b53; font-size: 14pt; }
.bild img { width: 100%; height: 100%; display: block; }
.utfall { margin-top: 1.8mm; font-weight: 600; font-size: 15pt; line-height: 1.2; }
.tidpil { justify-self: center; width: 11mm; height: 6mm; margin-top: calc(13pt * 1.2 + 1.5mm + 24mm - 3mm); }
.tidpil path { fill: none; stroke: var(--strategi); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.handling { margin-top: auto; height: 14mm; border-radius: 2.5mm; background: var(--strategi); color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 6mm 0 4.5mm; }
.led { display: flex; align-items: center; gap: 2.5mm; font-weight: 600; font-size: 15pt; line-height: 1.05; white-space: nowrap; }
.ikon { flex: none; display: grid; place-items: center; width: 10mm; height: 10mm; border-radius: 50%; background: #fff; }
.ikon img { width: 7mm; height: 7mm; }
.ledpil { flex: none; width: 7mm; height: 4mm; }
.ledpil path { fill: none; stroke: #fff; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; opacity: 0.85; }

.bak .inne { position: absolute; inset: 3mm 5mm 5mm 5mm; display: flex; flex-direction: column; }
.bak .namn { font-size: 32pt; line-height: 1.05; padding-right: 50mm; white-space: normal; }
.insikt { margin-top: 2.4mm; padding: 2.4mm 4mm 2.6mm; border-radius: 2mm; background: var(--strategi-ljus); font-size: 17pt; font-weight: 600; line-height: 1.2; color: var(--strategi-mork); text-wrap: balance; }
.spalter { margin-top: 4mm; display: grid; grid-template-columns: 58mm 1fr; column-gap: 8mm; flex: 1; min-height: 0; }
.minnet { display: flex; flex-direction: column; gap: 1.2mm; }
.minne { display: grid; place-items: center; min-height: 15mm; padding: 1mm; border-radius: 2mm; background: var(--strategi-ljus); text-align: center; line-height: 1.1; }
.minne b { font-size: 15pt; font-weight: 600; }
.minne span { font-size: 11pt; color: var(--blak-svag); }
.pilar { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; align-items: center; min-height: 13mm; }
.pilar div { display: flex; align-items: center; gap: 1.5mm; justify-content: center; font-size: 11pt; line-height: 1.1; }
.pilar svg { flex: none; width: 4mm; height: 11mm; }
.pil path { fill: none; stroke: var(--gra); stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round; }
.pil.betonad path { stroke: var(--strategi); stroke-width: 2.8; }
.pilar .betonad { color: var(--strategi); font-weight: 600; }
.stegyta { min-height: 0; }
.stegyta h3 { margin-bottom: 1mm; font-size: 13pt; font-weight: 600; color: var(--strategi); }
.stegyta ol { padding-left: 7mm; display: grid; gap: 1.6mm; font-size: ${STRATEGIKORTETS_STANDARD.bak}pt; }
.stegyta ol.tat { gap: 0.6mm; }
.stegyta li { line-height: 1.2; text-wrap: pretty; }
.stegyta li::marker { font-weight: 600; color: var(--strategi); }
.stegyta li b { font-weight: 600; }
.avgor { margin-top: 2.4mm; padding-top: 2.4mm; border-top: 0.3mm solid #d8dde3; font-size: ${STRATEGIKORTETS_STANDARD.bak}pt; line-height: 1.2; }
.avgor b { font-weight: 600; color: var(--strategi); margin-right: 2mm; }
`;

// Mätningen i sidan: framsidans namn krymper tills det ryms på en rad, ned till 56 punkter, och får sedan två rader;
// baksidans text står i 16 punkter, får mindre luft och sedan mindre text ned till 14 när den inte ryms.
const MATNING = `<script>document.fonts.ready.then(() => {
  const S = ${JSON.stringify(STRATEGIKORTETS_STANDARD)};
  for (const n of document.querySelectorAll('.fram .namn')) {
    let pt = S.namn; n.style.fontSize = pt + 'pt';
    while (n.scrollWidth > n.clientWidth && pt > S.namnMinst) { pt -= 2; n.style.fontSize = pt + 'pt'; }
    if (n.scrollWidth > n.clientWidth) n.style.whiteSpace = 'normal';
    n.dataset.pt = pt; n.dataset.rader = Math.round(n.getBoundingClientRect().height / (pt * 1.333));
  }
  for (const inne of document.querySelectorAll('.bak .inne')) {
    const ol = inne.querySelector('ol'), avgor = inne.querySelector('.avgor');
    const ryms = () => inne.scrollHeight <= inne.clientHeight + 1 && ol.getBoundingClientRect().bottom <= avgor.getBoundingClientRect().top + 1;
    let pt = S.bak;
    if (!ryms()) { ol.classList.add('tat'); ol.dataset.tat = '1'; }
    while (!ryms() && pt > S.bakMinst) { pt -= 0.5; ol.style.fontSize = pt + 'pt'; avgor.style.fontSize = pt + 'pt'; }
    ol.dataset.pt = pt;
    if (!ryms()) ol.dataset.rymsInte = '1';
  }
  for (const f of document.querySelectorAll('.fram .inne')) if (f.scrollHeight > f.clientHeight + 1) f.dataset.rymsInte = '1';
  document.body.dataset.klar = '1';
});</script>`;

const PIL = '<svg class="tidpil" viewBox="0 0 22 12" aria-hidden="true"><path d="M2 6h17M14 1.5 19.5 6 14 10.5"/></svg>';
const LEDPIL = '<svg class="ledpil" viewBox="0 0 14 8" aria-hidden="true"><path d="M1 4h11M9 1l3 3-3 3"/></svg>';
// Minnets pilar står lodrätt mellan rutorna: nedåt från den övre delen till den nedre, uppåt tillbaka.
const minnetsPil = (ned, betonad) => `<svg class="pil${betonad ? ' betonad' : ''}" viewBox="0 0 8 22" aria-hidden="true"><path d="${ned ? 'M4 2v17M1 16l3 3 3-3' : 'M4 20V4M1 7l3-3 3 3'}"/></svg>`;

/**
 * Minnets bild ur strategins iMinnet: delarna som rutor under varandra och pilarna mellan dem, betonad i strategins färg.
 * @param {{ delar: { namn: string, text?: string }[], pilar?: { fran: string, till: string, text: string, betonad?: boolean }[] }} m
 */
export function minnetsBild(m) {
  const delar = m.delar ?? [];
  const ruta = (d) => `<div class="minne"><div><b>${esc(d.namn)}</b>${d.text ? `<br><span>${esc(d.text)}</span>` : ''}</div></div>`;
  const ut = [];
  delar.forEach((d, i) => {
    ut.push(ruta(d));
    if (i === delar.length - 1) return;
    const mellan = (m.pilar ?? []).filter((p) => [p.fran, p.till].includes(d.namn) && [p.fran, p.till].includes(delar[i + 1].namn));
    if (mellan.length) ut.push(`<div class="pilar">${mellan.map((p) => `<div class="${p.betonad ? 'betonad' : ''}">${minnetsPil(p.fran === d.namn, p.betonad)}${esc(p.text)}</div>`).join('')}</div>`);
  });
  return `<figure class="minnet" aria-hidden="true">${ut.join('')}</figure>`;
}

/**
 * Korten som en sida att skriva ut. Förvalt: för varje kort ett A4 med framsidan och ett med baksidan, kortet på den
 * övre halvan. Med tvaOchTva två kort på varje A4, i arkens ordning ur standarden.
 * @param {{ id: string, nr: number, namn: string, mening: string, berattelsen: { rubrik: string, utfall: string, bild?: string }[], handling: { text: string, ikon: string }[], insikt: string, minnet: object, steg: { rubrik: string, text: string }[], avgor: { rubrik: string, text: string } }[]} kort  bild och ikon är adresser
 * @param {{ typsnitt: string, tvaOchTva?: boolean, titel?: string }} o  typsnitt är mappen med Fredoka, som adress
 */
export function kortenHtml(kort, { typsnitt, tvaOchTva = false, titel = 'Strategikort' }) {
  const flik = (k) => `<div class="flik"><span class="nr">${k.nr}</span><span>Strategi</span></div>`;
  const kortet = (k, del, nere = false) => {
    const inne = del === 'fram'
      ? `<div class="inne"><h2 class="namn">${esc(k.namn)}</h2><p class="mening">${esc(k.mening)}</p>
        <div class="berattelse">${k.berattelsen.map((b) => `<div class="ruta"><span class="ruta-rubrik">${esc(b.rubrik)}</span><span class="bild">${b.bild ? `<img src="${esc(b.bild)}" alt="">` : 'Bild'}</span><span class="utfall">${esc(b.utfall)}</span></div>`).join(PIL)}</div>
        <div class="handling">${k.handling.map((h) => `<div class="led"><span class="ikon"><img src="${esc(h.ikon)}" alt=""></span><span>${esc(h.text)}</span></div>`).join(LEDPIL)}</div></div>`
      : `<div class="inne"><h2 class="namn">${esc(k.namn)}</h2><p class="insikt">${esc(k.insikt)}</p>
        <div class="spalter">${minnetsBild(k.minnet)}<section class="stegyta"><h3>Så gör du</h3><ol>${k.steg.map((s) => `<li><b>${esc(s.rubrik.replace(/\.?$/, '.'))}</b> ${esc(s.text)}</li>`).join('')}</ol></section></div>
        <p class="avgor"><b>${esc(k.avgor.rubrik)}</b>${esc(k.avgor.text)}</p></div><div class="upphov">© Niclas Fohlin · niclasfohlin.se</div>`;
    return `<div class="kort ${del}${nere ? ' nere' : ''}" data-id="${esc(k.id)}"><div class="ram">${flik(k)}${inne}</div></div>`;
  };
  const sida = (k, del) => `<div class="ark" data-id="${esc(k.id)}" data-sida="${del}">${kortet(k, del)}<div class="klipp"></div></div>`;
  const sidorna = tvaOchTva
    ? strukturkortensArk(kort.length).map((a) => `<div class="ark" data-sida="${a.del}">${kortet(kort[a.uppe], a.del)}${a.nere === null ? '' : kortet(kort[a.nere], a.del, true)}<div class="klipp"></div></div>`)
    : kort.map((k) => sida(k, 'fram') + sida(k, 'bak'));
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>${esc(titel)}</title><style>${stil(typsnitt)}</style></head><body>${sidorna.join('')}${MATNING}</body></html>`;
}
