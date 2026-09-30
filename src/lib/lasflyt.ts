// Lästräningstexter (Upprepad läsning, K-063): en mening med stöd har en båge under varje ordgrupp och vanliga
// mellanrum mellan orden, som i läsmaterial med "scooping" (phrase-cued text), och bindestreck i orden. I metodens
// fil binder bågtecknet ‿ (mellan hårda mellanslag) ihop orden i en ordgrupp, och ordfog efter bindestrecken håller
// ihop orddelarna. Word kan inte rita en båge under text, därför ritas meningen som en bild (SVG) i Word-filen; på
// sidan ritar CSS bågen under varje ordgrupp (Laskort.astro). Måtten är metodriggens (build/lasflyt.js), så att
// korten ser likadana ut i riggens kompendium och på sajten. Inga Node-beroenden: koden körs också i webbläsaren.
//
// Elevens typsnitt (K-130, riggens docs/elevmaterial.md): med typsnitt Andika mäts orden med Andikas bredder och ritas
// som Andikas konturer ur src/data/andika-glyfer.json (riggens design/typsnitt/andika/glyfer.json, Andika 7.000, SIL
// OFL 1.1, samma som filmerna har). Word ritar då läskortet likadant var det än öppnas, utan att typsnittet behöver
// finnas på datorn, och bågarna står under orden.
import GLYFER from '../data/andika-glyfer.json';

export const BAGE = '‿';
type Glyf = { d?: string; adv: number };
const glyfer = (GLYFER as { enheter: number; glyfer: Record<string, Glyf> });
const glyf = (c: string): Glyf | undefined => glyfer.glyfer[c];
const andika = (typsnitt: string) => typsnitt === 'Andika';

// Arials bredder i tusendelar av teckenhöjden, mätta ur arial.ttf (samma som Helvetica), som i riggen.
const BREDD: Record<string, number> = {
  a: 556, b: 556, c: 500, d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222, m: 833, n: 556,
  o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556, v: 500, w: 722, x: 500, y: 500, z: 500,
  å: 556, ä: 556, ö: 556, é: 556, ü: 556,
  A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 500, K: 667, L: 556, M: 833, N: 722,
  O: 778, P: 667, Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  Å: 667, Ä: 667, Ö: 778, É: 667, Ü: 722,
  0: 556, 1: 556, 2: 556, 3: 556, 4: 556, 5: 556, 6: 556, 7: 556, 8: 556, 9: 556,
  ' ': 278, '.': 278, ',': 278, '!': 278, '?': 556, ':': 278, ';': 278, '”': 333, '"': 355, "'": 191, '’': 222,
  '-': 333, '–': 556, '(': 333, ')': 333, '«': 556, '»': 556,
};
const matt = (text: string, storlek: number, typsnitt = 'Arial') => (andika(typsnitt)
  ? [...text].reduce((a, c) => a + (glyf(c)?.adv ?? glyfer.enheter / 2), 0) * storlek / glyfer.enheter
  : [...text].reduce((a, c) => a + (BREDD[c] ?? 556), 0) * storlek / 1000);
// Glyfernas banor i relativa steg och hela enheter, som riggens build/lasflyt.js och build/film.mjs: ett tal utan
// kommando upprepar det förra, och efter M är det L. Då räcker ett M med ordets läge före varje glyf.
function kompakt(d: string): string {
  const t = d.match(/[MLHVQCZ]|-?\d*\.?\d+/g) ?? [];
  const kom = (c: string, tal: number[]) => c + tal.map((v, j) => (j === 0 || v < 0 ? String(v) : ` ${v}`)).join('');
  let ut = '';
  let x = 0, y = 0, sx = 0, sy = 0, i = 0, sista = '';
  while (i < t.length) {
    let c = t[i];
    if (/^[MLHVQCZ]$/.test(c)) i++; else c = sista === 'M' ? 'L' : sista;
    sista = c;
    const n = () => Math.round(Number(t[i++]));
    if (c === 'M' || c === 'L') { const nx = n(), ny = n(); ut += kom(c.toLowerCase(), [nx - x, ny - y]); x = nx; y = ny; if (c === 'M') { sx = x; sy = y; } }
    else if (c === 'H') { const nx = n(); ut += kom('h', [nx - x]); x = nx; }
    else if (c === 'V') { const ny = n(); ut += kom('v', [ny - y]); y = ny; }
    else if (c === 'Q') { const ax = n(), ay = n(), nx = n(), ny = n(); ut += kom('q', [ax - x, ay - y, nx - x, ny - y]); x = nx; y = ny; }
    else if (c === 'C') { const ax = n(), ay = n(), bx = n(), by = n(), nx = n(), ny = n(); ut += kom('c', [ax - x, ay - y, bx - x, by - y, nx - x, ny - y]); x = nx; y = ny; }
    else if (c === 'Z') { ut += 'z'; x = sx; y = sy; }
    else break;
  }
  return ut;
}
const KOMPAKT = new Map<string, string>();
const kompaktGlyf = (c: string) => { if (!KOMPAKT.has(c)) KOMPAKT.set(c, glyf(c)?.d ? kompakt(glyf(c)!.d!) : ''); return KOMPAKT.get(c)!; };
// Ett ord som en bana i Andikas konturer, med baslinjen i (x, y).
function ordBana(ord: string, x: number, y: number, storlek: number, farg: string): string {
  let d = '';
  let u = 0;
  for (const c of ord) { const k = kompaktGlyf(c); if (k) d += `M${u} 0${k}`; u += glyf(c)?.adv ?? glyfer.enheter / 2; }
  const k = storlek / glyfer.enheter;
  return d ? `<path d="${d}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(5)} ${(-k).toFixed(5)})" fill="#${farg}"/>` : '';
}
const xml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Textens bredd i Andika i punkter, för strecket i ett ensamt bråk i Word (brakStycken i metoddocx.ts).
export const andikaBredd = (text: string, storlek: number) => matt(text, storlek, 'Andika');

export const harBagar = (text: string) => String(text).includes(BAGE);

// Ordgrupperna i en mening: vanliga mellanslag skiljer grupperna, bågtecknet binder orden i en grupp. Ordfogen tas
// bort; bindestrecken står kvar, eftersom kortet med stöd visar orddelarna.
export function ordgrupper(text: string): string[][] {
  return String(text).split(' ').filter(Boolean).map((g) => g.split(/ ?‿ ?/).map((ord) => ord.replace(/⁠/g, '')));
}

// Skiljetecken och citattecken står utanför bågen: citattecken före gruppens första ord, skiljetecken efter det sista.
export function delaTecken(grupp: string[]): { fore: string; ord: string; efter: string } {
  const text = grupp.join(' ');
  const fore = (text.match(/^[”"«(]+/) ?? [''])[0];
  const efter = (text.slice(fore.length).match(/[.,!?:;”"»)]+$/) ?? [''])[0];
  return { fore, ord: text.slice(fore.length, text.length - efter.length), efter };
}

// Meningen utan stöd, som texten ska vara i kolumnen Utan stöd: bågtecknet och dess hårda mellanslag blir ett vanligt
// mellanslag, och ordfog och bindestreck i orden tas bort. Schemat prövar att det stämmer (content.config.ts).
export const utanStod = (text: string) => String(text).replace(/ ?‿ ?/g, ' ').replace(/-⁠?/g, '').replace(/⁠/g, '');

// Ritar meningen i en bredd (pt). Radbryter mellan ordgrupper, aldrig inne i en grupp. Svarar med SVG och måtten i pt.
export function bagSvg(text: string, o: { bredd: number; storlek?: number; farg?: string; bageFarg?: string; typsnitt?: string; radfaktor?: number }) {
  const { bredd, storlek = 18, farg = '1F2937', bageFarg = '2E6DB4', typsnitt = 'Arial', radfaktor = 2.0 } = o;
  const mellan = matt(' ', storlek, typsnitt);
  const grupper = ordgrupper(text).map((ord) => {
    const bredder = ord.map((w) => matt(w, storlek, typsnitt));
    return { ord, bredder, bredd: bredder.reduce((a, b) => a + b, 0) + mellan * (ord.length - 1), x: 0 };
  });
  const rader: (typeof grupper)[] = [];
  let rad: typeof grupper = [];
  let x = 0;
  for (const g of grupper) {
    const start = rad.length ? x + mellan : 0;
    if (rad.length && start + g.bredd > bredd) { rader.push(rad); rad = []; x = 0; }
    const gx = rad.length ? x + mellan : 0;
    rad.push({ ...g, x: gx });
    x = gx + g.bredd;
  }
  if (rad.length) rader.push(rad);
  const radhojd = storlek * radfaktor, bas = storlek * 1.0, djup = storlek * 0.32, luft = storlek * 0.22;
  const hojd = rader.length * radhojd;
  const delar: string[] = [];
  rader.forEach((r, ri) => {
    const y = ri * radhojd + bas;
    for (const g of r) {
      let ox = g.x;
      g.ord.forEach((w, wi) => {
        delar.push(andika(typsnitt) ? ordBana(w, ox, y, storlek, farg) : `<text x="${ox.toFixed(2)}" y="${y.toFixed(2)}" font-family="${typsnitt}" font-size="${storlek}" fill="#${farg}">${xml(w)}</text>`);
        ox += g.bredder[wi] + mellan;
      });
      // Bågen går från den första bokstaven i gruppens första ord till den sista bokstaven i det sista, en bit under
      // baslinjen, och är djupast på mitten. Den slutar en bit före ett skiljetecken sist i gruppen, så att den inte går
      // in under det (K-082, som riggen).
      const fore = (g.ord[0].match(/^[”"«(]+/) ?? [''])[0];
      const efter = (g.ord[g.ord.length - 1].match(/[.,!?:;”"»)]+$/) ?? [''])[0];
      const x1 = g.x + matt(fore, storlek, typsnitt) + storlek * 0.03;
      const x2 = g.x + g.bredd - matt(efter, storlek, typsnitt) - storlek * (efter ? 0.12 : 0.03);
      const y1 = y + luft;
      delar.push(`<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${((x1 + x2) / 2).toFixed(2)} ${(y1 + 2 * djup).toFixed(2)} ${x2.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="#${bageFarg}" stroke-width="${(storlek * 0.075).toFixed(2)}" stroke-linecap="round"/>`);
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bredd.toFixed(2)}pt" height="${hojd.toFixed(2)}pt" viewBox="0 0 ${bredd.toFixed(2)} ${hojd.toFixed(2)}">${delar.join('')}</svg>`;
  return { svg, bredd, hojd };
}
