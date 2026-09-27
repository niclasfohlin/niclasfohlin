// Lästräningstexter (Upprepad läsning, K-063): en mening med stöd har en båge under varje ordgrupp och vanliga
// mellanrum mellan orden, som i läsmaterial med "scooping" (phrase-cued text), och bindestreck i orden. I metodens
// fil binder bågtecknet ‿ (mellan hårda mellanslag) ihop orden i en ordgrupp, och ordfog efter bindestrecken håller
// ihop orddelarna. Word kan inte rita en båge under text, därför ritas meningen som en bild (SVG) i Word-filen; på
// sidan ritar CSS bågen under varje ordgrupp (Laskort.astro). Måtten är metodriggens (build/lasflyt.js), så att
// korten ser likadana ut i riggens kompendium och på sajten. Inga Node-beroenden: koden körs också i webbläsaren.

export const BAGE = '‿';

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
const matt = (text: string, storlek: number) => [...text].reduce((a, c) => a + (BREDD[c] ?? 556), 0) * storlek / 1000;
const xml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
  const mellan = matt(' ', storlek);
  const grupper = ordgrupper(text).map((ord) => {
    const bredder = ord.map((w) => matt(w, storlek));
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
        delar.push(`<text x="${ox.toFixed(2)}" y="${y.toFixed(2)}" font-family="${typsnitt}" font-size="${storlek}" fill="#${farg}">${xml(w)}</text>`);
        ox += g.bredder[wi] + mellan;
      });
      // Bågen går från den första bokstaven i gruppens första ord till den sista bokstaven i det sista, en bit under
      // baslinjen, och är djupast på mitten.
      const fore = (g.ord[0].match(/^[”"«(]+/) ?? [''])[0];
      const efter = (g.ord[g.ord.length - 1].match(/[.,!?:;”"»)]+$/) ?? [''])[0];
      const x1 = g.x + matt(fore, storlek) + storlek * 0.03;
      const x2 = g.x + g.bredd - matt(efter, storlek) - storlek * 0.03;
      const y1 = y + luft;
      delar.push(`<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${((x1 + x2) / 2).toFixed(2)} ${(y1 + 2 * djup).toFixed(2)} ${x2.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="#${bageFarg}" stroke-width="${(storlek * 0.075).toFixed(2)}" stroke-linecap="round"/>`);
    }
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bredd.toFixed(2)}pt" height="${hojd.toFixed(2)}pt" viewBox="0 0 ${bredd.toFixed(2)} ${hojd.toFixed(2)}">${delar.join('')}</svg>`;
  return { svg, bredd, hojd };
}
