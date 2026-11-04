// Strategikortets form (K-699): ett liggande A5 som strukturkortet (scripts/strukturer/kortform.mjs), med samma mått,
// typsnitt och plats på arket, i strategiernas färg och med strategins nummer i en flik där strukturkortet har slaget.
// Formen valdes 2026-11-03 efter två idéuppdrag till en Sonnet och en Opus (underlag/prov/strategier/UPPDRAGET.md under
// Kortet). Niclas bad om mer design ("Kan du inte köra korten lite mer moderna och notebookLM bra", "Lite mer design tack",
// "Och informationsgrafik för bilderna på framsidan"), såg Sonnets form och sa "Tycker det ser okej ut":
//
//   ytan        en ljust violett panel i ramens ställe, med vita ytor ovanpå, och fliken som en vit tablett med numret
//   framsidan   namnet i 80 punkter, ned till 56 och sedan två rader, som strukturkortet ("Ska kunna ses på avstånd");
//               meningen; berättelsens tre kvadratiska bilder med vit kant och rubriken över, utfallen under som en mätare
//               från ljus till mörk violett, som syns också i gråskala; och handlingen i ett band med ikonerna i vita cirklar
//   baksidan    namnet, insikten med glödlampan i en vit ruta, minnets bild i en vit ruta till vänster med den första delen
//               ljus och den sista djup, Så gör du som numrerade steg längs en linje, och det som avgör med rubriken som en
//               etikett, i 16 punkter ("Större text på baksidan", Niclas om strukturkortet); ryms stegen inte: mindre luft
//               och sedan ned till 14 punkter, och kortet listas som en text att korta
//   raden längst ned  © Niclas Fohlin · niclasfohlin.se på baksidan
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
:root { --blak: #14202b; --blak-svag: #44505c; --gra: #9aa5b1; --strategi: ${STRATEGIERNAS_FARG.farg}; --strategi-mork: ${STRATEGIERNAS_FARG.mork}; --strategi-ljus: ${STRATEGIERNAS_FARG.ljus}; --kant: #d8d2ef; --mellan: #a69bd9; --skugga: rgba(60, 49, 114, 0.28); }
* { box-sizing: border-box; }
body { margin: 0; font-family: Fredoka, sans-serif; color: var(--blak); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h2, p, ol, figure { margin: 0; }
.ark { width: 210mm; height: 297mm; position: relative; page-break-after: always; overflow: hidden; }
.kort { position: absolute; left: 0; top: 0; width: 210mm; height: 148.5mm; }
.kort.nere { top: 148.5mm; }
.klipp { position: absolute; left: 0; right: 0; top: 148.5mm; border-top: 0.35mm dashed var(--gra); }
.panel { position: absolute; inset: 10mm 5.5mm 5.5mm 5.5mm; border-radius: 6mm; background: linear-gradient(180deg, #ece8f8 0%, #f6f4fc 70%, #f9f8fd 100%); box-shadow: inset 0 0 0 0.3mm var(--kant); }
.flik { position: absolute; top: -6mm; right: 8mm; display: flex; align-items: center; height: 12mm; padding-right: 4.5mm; border-radius: 6mm; background: #fff; box-shadow: 0 0.6mm 0 var(--kant); font-weight: 600; font-size: 16pt; line-height: 1; color: var(--strategi-mork); }
.nr { display: grid; place-items: center; flex: none; width: 12mm; height: 12mm; border-radius: 50%; background: linear-gradient(150deg, #6a59c0, var(--strategi-mork)); color: #fff; font-size: 20pt; font-weight: 600; line-height: 1; padding-top: 0.3mm; }
.flik .nr { margin-right: 2.4mm; }
.upphov { position: absolute; bottom: 1.5mm; right: 6mm; font-size: 7.5pt; line-height: 1; color: #4a5560; }
.ikon { flex: none; display: grid; place-items: center; width: 10mm; height: 10mm; border-radius: 50%; background: #fff; }
.ikon img { width: 7mm; height: 7mm; }

.fram .inne { position: absolute; inset: 3mm 5mm 4mm 5mm; display: flex; flex-direction: column; }
.namn { margin: 0; font-size: ${STRATEGIKORTETS_STANDARD.namn}pt; font-weight: 600; line-height: 1; white-space: nowrap; letter-spacing: -0.005em; }
.mening { margin-top: 0.4mm; font-size: 22pt; line-height: 1.15; color: var(--blak-svag); }
.remsa { margin-top: 3.4mm; display: grid; grid-template-columns: 46mm 1fr 46mm 1fr 46mm; align-items: start; }
.ruta { display: flex; flex-direction: column; align-items: center; }
.ruta-rubrik { font-weight: 600; font-size: 13pt; line-height: 1.2; margin-bottom: 1.4mm; color: var(--strategi-mork); }
.bild { display: grid; place-items: center; width: 46mm; height: 46mm; overflow: hidden; border: 1.1mm solid #fff; border-radius: 4.5mm; background: #dfeedb; box-shadow: 0 0.6mm 0 var(--kant); color: #5c7b53; font-size: 14pt; }
.bild img { display: block; width: 100%; height: 100%; }
.utfall { width: 46mm; margin-top: 2mm; padding: 1.6mm 0 1.8mm; border-radius: 3mm; text-align: center; font-weight: 600; font-size: 15pt; line-height: 1.15; }
.u1 { background: #e4dff5; }
.u2 { background: var(--mellan); }
.u3 { background: var(--strategi); color: #fff; }
.tidpil { justify-self: center; width: 10.5mm; height: 10.5mm; margin-top: calc(13pt * 1.2 + 1.4mm + 23mm - 5.25mm); border-radius: 50%; background: #fff; box-shadow: 0 0.6mm 0 var(--kant); }
.tidpil path { fill: none; stroke: var(--strategi); stroke-width: 2.1; stroke-linecap: round; stroke-linejoin: round; }
.handling { margin-top: auto; height: 14mm; border-radius: 7mm; background: linear-gradient(90deg, var(--strategi), var(--strategi-mork)); color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 7mm 0 2mm; }
.led { display: flex; align-items: center; gap: 2.5mm; font-weight: 600; font-size: 15pt; line-height: 1.05; white-space: nowrap; }
.ledpil { flex: none; width: 7mm; height: 4mm; }
.ledpil path { fill: none; stroke: #fff; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; opacity: 0.85; }

.bak .inne { position: absolute; inset: 3mm 5mm 5.4mm 5mm; display: flex; flex-direction: column; }
.bak .namn { font-size: 30pt; line-height: 1.05; padding-right: 52mm; white-space: normal; }
.insikt { margin-top: 1.8mm; display: flex; align-items: center; gap: 3.5mm; padding: 1.8mm 4mm 1.8mm 2.4mm; border-radius: 4mm; background: #fff; box-shadow: 0 0.6mm 0 var(--kant); }
.insikt .ikon { width: 12mm; height: 12mm; background: var(--strategi-ljus); }
.insikt .ikon img { width: 8.5mm; height: 8.5mm; }
.insikt p { font-size: 18pt; font-weight: 600; line-height: 1.18; color: var(--strategi-mork); text-wrap: balance; }
.spalter { margin-top: 2.6mm; flex: 1; min-height: 0; display: grid; grid-template-columns: 54mm 1fr; column-gap: 6mm; }
.minnet { display: flex; flex-direction: column; justify-content: space-between; padding: 2.4mm; border-radius: 4mm; background: #fff; box-shadow: 0 0.6mm 0 var(--kant); }
.minne { display: grid; place-items: center; min-height: 15mm; padding: 0.8mm; border-radius: 3mm; text-align: center; line-height: 1.1; background: linear-gradient(180deg, #ece8f8, #ddd6f3); }
.minne b { font-size: 15pt; font-weight: 600; }
.minne span { font-size: 12pt; color: var(--blak-svag); }
.minne.mitt { background: var(--mellan); }
.minne.djup { background: linear-gradient(180deg, var(--strategi), var(--strategi-mork)); color: #fff; }
.minne.djup span { color: #e4dff5; }
.pilar { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; align-items: center; padding: 1mm 0; }
.pilar div { display: flex; flex-direction: column; align-items: center; gap: 0.8mm; text-align: center; line-height: 1.1; font-size: 12pt; color: var(--blak-svag); }
.pilar svg { width: 7mm; height: 17mm; }
.pil path { fill: none; stroke: var(--gra); stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; }
.pil.betonad path { fill: var(--strategi); stroke: var(--strategi); stroke-width: 0.8; }
.pilar .betonad { font-size: 13pt; font-weight: 600; color: var(--strategi); }
.minnet.tre .minne { min-height: 11.5mm; }
.minnet.tre .minne span { font-size: 11pt; }
.minnet.tre .pilar { padding: 0.4mm 0; }
.minnet.tre .pilar div { flex-direction: row; gap: 1.2mm; font-size: 11pt; }
.minnet.tre .pilar svg { width: 5mm; height: 8mm; }
.stegyta { min-height: 0; }
.stegyta ol { position: relative; padding: 0; list-style: none; counter-reset: s; display: grid; gap: 3.4mm; font-size: ${STRATEGIKORTETS_STANDARD.bak}pt; }
.stegyta ol.tat { gap: 1.4mm; }
.stegyta ol::before { content: ""; position: absolute; left: 3.6mm; top: 4mm; bottom: 4mm; width: 0.5mm; background: var(--kant); }
.stegyta li { position: relative; counter-increment: s; padding-left: 11mm; line-height: 1.2; text-wrap: pretty; }
.stegyta li::before { content: counter(s); position: absolute; left: 0; top: -0.2mm; display: grid; place-items: center; width: 7.6mm; height: 7.6mm; border-radius: 50%; background: var(--strategi); color: #fff; font-size: 12pt; font-weight: 600; line-height: 1; padding-top: 0.2mm; }
.stegyta li b { font-weight: 600; }
.avgor { margin-top: 2.4mm; padding: 1.8mm 4mm; border-radius: 4mm; background: var(--strategi-ljus); font-size: ${STRATEGIKORTETS_STANDARD.bak}pt; line-height: 1.25; text-wrap: pretty; }
.avgor b { display: inline-block; margin-right: 2.2mm; padding: 0.2mm 3mm 0.5mm; border-radius: 4mm; background: var(--strategi); color: #fff; font-weight: 600; line-height: 1.2; }
`;

// Mätningen i sidan: framsidans namn krymper tills det ryms på en rad, ned till 56 punkter, och får sedan två rader;
// baksidans text står i 16 punkter, får mindre luft och sedan mindre text ned till 14 när den inte ryms. En framsida som
// ändå flödar över märks.
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

const PIL = '<svg class="tidpil" viewBox="0 0 22 22" aria-hidden="true"><path d="M8.5 5.5 14.5 11 8.5 16.5"/></svg>';
const LEDPIL = '<svg class="ledpil" viewBox="0 0 14 8" aria-hidden="true"><path d="M1 4h11M9 1l3 3-3 3"/></svg>';
// Minnets pilar står lodrätt mellan rutorna: nedåt från den övre delen till den nedre, uppåt tillbaka; den betonade är fylld.
const minnetsPil = (ned, betonad) => `<svg class="pil${betonad ? ' betonad' : ''}" viewBox="0 0 8 22" aria-hidden="true"><path d="${betonad ? (ned ? 'M4 21 7.6 15.8H5.5V1H2.5V15.8H0.4Z' : 'M4 1 7.6 6.2H5.5V21H2.5V6.2H0.4Z') : ned ? 'M4 2v17M1 16l3 3 3-3' : 'M4 20V4M1 7l3-3 3 3'}"/></svg>`;

/**
 * Minnets bild ur strategins iMinnet: delarna som rutor under varandra, den första ljus och den sista djup, och pilarna
 * mellan dem, den betonade fylld i strategins färg.
 * @param {{ delar: { namn: string, text?: string }[], pilar?: { fran: string, till: string, text: string, betonad?: boolean }[] }} m
 */
export function minnetsBild(m) {
  const delar = m.delar ?? [];
  const slag = (i) => (i === delar.length - 1 ? ' djup' : i > 0 ? ' mitt' : '');
  const ruta = (d, i) => `<div class="minne${slag(i)}"><div><b>${esc(d.namn)}</b>${d.text ? `<br><span>${esc(d.text)}</span>` : ''}</div></div>`;
  const ut = [];
  delar.forEach((d, i) => {
    ut.push(ruta(d, i));
    if (i === delar.length - 1) return;
    const mellan = (m.pilar ?? []).filter((p) => [p.fran, p.till].includes(d.namn) && [p.fran, p.till].includes(delar[i + 1].namn));
    if (mellan.length) ut.push(`<div class="pilar">${mellan.map((p) => `<div class="${p.betonad ? 'betonad' : ''}">${minnetsPil(p.fran === d.namn, p.betonad)}${esc(p.text)}</div>`).join('')}</div>`);
  });
  return `<figure class="minnet${delar.length > 2 ? ' tre' : ''}" aria-hidden="true">${ut.join('')}</figure>`;
}

/**
 * Bladet med strategierna (K-699): ett liggande A4 med numret, namnet och meningen för varje strategi, och meningen till
 * mitten överst, för väggens mitt med korten runt omkring (Niclas om väggen i klassrummet, riggens brev 2026-11-03). Samma
 * funktion gör verktygets blad med alla strategier och metodens blad med sina, ur fältet strategikort. Rubriken är alltid
 * Strategier, för den är vad eleverna läser på väggen, och bladets namn (titel) står bara i dokumentets titel.
 * @param {{ nr: number, namn: string, mening: string }[]} strategier
 * @param {{ typsnitt: string, titel: string, mitten?: string }} o
 */
export function bladetHtml(strategier, { typsnitt, titel, mitten }) {
  // Spalterna efter antalet, så att bladet alltid är ett A4: tre för en metods fem, fyra till tolv och fem till tjugo.
  const kolumner = strategier.length <= 6 ? 3 : strategier.length <= 12 ? 4 : 5;
  // Storleken efter antalet: en metods fem står stort, och numret står mitt för namnet och meningen, som rutans text står mitt
  // i rutan (verifieringen 2026-11-04: numret stod mitt i rutan och texten överst, med en tom yta under).
  const m = strategier.length <= 6 ? { nr: 16, nrPt: 26, namn: 26, rad: 17, pad: '5mm 6mm', gap: 5 } : strategier.length <= 12 ? { nr: 12, nrPt: 19, namn: 18, rad: 13, pad: '3mm 4mm', gap: 4 } : { nr: 10, nrPt: 16, namn: 15, rad: 11, pad: '2.5mm 3mm', gap: 3 };
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>${esc(titel)}</title><style>${stil(typsnitt)}
@page { size: A4 landscape; margin: 0; }
.blad { width: 297mm; height: 210mm; padding: 12mm 14mm 10mm; display: flex; flex-direction: column; gap: 6mm; position: relative; background: linear-gradient(180deg, #ece8f8 0%, #f6f4fc 60%, #f9f8fd 100%); }
.blad h1 { margin: 0; font-size: 40pt; font-weight: 600; line-height: 1; color: var(--strategi-mork); }
.blad .mitten { margin: 0; padding: 4mm 6mm; border-radius: 4mm; background: #fff; box-shadow: 0 0.6mm 0 var(--kant); font-size: 18pt; font-weight: 600; line-height: 1.2; color: var(--strategi-mork); }
.blad ol { list-style: none; margin: 0; padding: 0; flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(${kolumner}, minmax(0, 1fr)); grid-auto-rows: 1fr; gap: ${m.gap}mm; }
.blad li { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: auto auto; gap: 1mm 3mm; align-content: center; min-height: 0; padding: ${m.pad}; border-radius: 4mm; background: #fff; box-shadow: 0 0.6mm 0 var(--kant); overflow: hidden; }
.blad li .nr { grid-row: span 2; width: ${m.nr}mm; height: ${m.nr}mm; font-size: ${m.nrPt}pt; align-self: center; color: #fff; }
.blad li b { align-self: end; font-size: ${m.namn}pt; font-weight: 600; line-height: 1.1; }
.blad li .rad { align-self: start; font-size: ${m.rad}pt; line-height: 1.22; color: var(--blak-svag); }
.blad .upphov { left: 14mm; right: auto; bottom: 4mm; }
</style></head><body><div class="blad"><h1>Strategier</h1>${mitten ? `<p class="mitten">${esc(mitten)}</p>` : ''}
<ol>${strategier.map((s) => `<li><span class="nr">${s.nr}</span><b>${esc(s.namn)}</b><span class="rad">${esc(s.mening)}</span></li>`).join('')}</ol>
<div class="upphov">© Niclas Fohlin · niclasfohlin.se/strategier</div></div><script>document.fonts.ready.then(() => { document.body.dataset.klar = '1'; });</script></body></html>`;
}

/**
 * Korten som en sida att skriva ut. Förvalt: för varje kort ett A4 med framsidan och ett med baksidan, kortet på den
 * övre halvan. Med tvaOchTva två kort på varje A4, i arkens ordning ur standarden.
 * @param {{ id: string, nr: number, namn: string, mening: string, berattelsen: { rubrik: string, utfall: string, bild?: string }[], handling: { text: string, ikon: string }[], insikt: string, insiktensIkon: string, minnet: object, steg: { rubrik: string, text: string }[], avgor: { rubrik: string, text: string } }[]} kort  bild och ikonerna är adresser
 * @param {{ typsnitt: string, tvaOchTva?: boolean, titel?: string }} o  typsnitt är mappen med Fredoka, som adress
 */
export function kortenHtml(kort, { typsnitt, tvaOchTva = false, titel = 'Strategikort' }) {
  const flik = (k) => `<div class="flik"><span class="nr">${k.nr}</span>Strategi</div>`;
  const kortet = (k, del, nere = false) => {
    const inne = del === 'fram'
      ? `<div class="inne"><h2 class="namn">${esc(k.namn)}</h2><p class="mening">${esc(k.mening)}</p>
        <div class="remsa">${k.berattelsen.map((b, i) => `<div class="ruta"><span class="ruta-rubrik">${esc(b.rubrik)}</span><span class="bild">${b.bild ? `<img src="${esc(b.bild)}" alt="">` : 'Bild'}</span><span class="utfall u${i + 1}">${esc(b.utfall)}</span></div>`).join(PIL)}</div>
        <div class="handling">${k.handling.map((h) => `<div class="led"><span class="ikon"><img src="${esc(h.ikon)}" alt=""></span><span>${esc(h.text)}</span></div>`).join(LEDPIL)}</div></div>`
      : `<div class="inne"><h2 class="namn">${esc(k.namn)}</h2>
        <div class="insikt"><span class="ikon"><img src="${esc(k.insiktensIkon)}" alt=""></span><p>${esc(k.insikt)}</p></div>
        <div class="spalter">${minnetsBild(k.minnet)}<section class="stegyta"><ol>${k.steg.map((s) => `<li><b>${esc(s.rubrik.replace(/\.?$/, '.'))}</b> ${esc(s.text)}</li>`).join('')}</ol></section></div>
        <p class="avgor"><b>${esc(k.avgor.rubrik)}</b>${esc(k.avgor.text)}</p></div><div class="upphov">© Niclas Fohlin · niclasfohlin.se</div>`;
    return `<div class="kort ${del}${nere ? ' nere' : ''}" data-id="${esc(k.id)}"><div class="panel">${flik(k)}${inne}</div></div>`;
  };
  const sida = (k, del) => `<div class="ark" data-id="${esc(k.id)}" data-sida="${del}">${kortet(k, del)}<div class="klipp"></div></div>`;
  const sidorna = tvaOchTva
    ? strukturkortensArk(kort.length).map((a) => `<div class="ark" data-sida="${a.del}">${kortet(kort[a.uppe], a.del)}${a.nere === null ? '' : kortet(kort[a.nere], a.del, true)}<div class="klipp"></div></div>`)
    : kort.map((k) => sida(k, 'fram') + sida(k, 'bak'));
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><title>${esc(titel)}</title><style>${stil(typsnitt)}</style></head><body>${sidorna.join('')}${MATNING}</body></html>`;
}
