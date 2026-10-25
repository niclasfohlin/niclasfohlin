// Ikonen för appen Stöd (K-505, Niclas 2026-10-25: "E ser okej ut"): fyra rundade rutor i områdenas färger med en vit
// symbol i varje, en bok för Läsning, en penna för Skrivning, ett plus för Matematik och två personer för Socialt, på
// vit botten. Formgiven ur en Sonnets och en Opus förslag, med symbolerna efter Niclas fråga samma morgon. Ikonen är bara
// former, så att bygget ritar den i varje storlek utan typsnitt (src/pages/stodundervisning/app/[ikon].png.ts), och
// färgerna läses ur global.css, så att en ändrad områdesfärg följer med. Den maskbara formen har rutorna inom den säkra
// cirkeln, 80 procent av ytan, eftersom Android rundar ikonen själv.
import css from '../styles/global.css?raw';

const farg = (namn: string) => {
  const m = css.match(new RegExp(`--${namn}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`appikon: hittar inte --${namn} i global.css`);
  return m[1];
};

// Symbolerna i en ruta på 100 × 100 kring rutans mitt. Personernas kant har rutans färg, så att de två skiljs åt.
const BOK = '<path d="M8 22 Q28 14 46 24 L46 80 Q28 70 8 76 Z M54 24 Q72 14 92 22 L92 76 Q72 70 54 80 Z" fill="#fff"/>';
const PENNA = '<g transform="rotate(-45 50 50)"><rect x="10" y="37" width="58" height="26" rx="4" fill="#fff"/><path d="M72 37 L95 50 L72 63 Z" fill="#fff"/></g>';
const PLUS = '<path d="M50 14 V86 M14 50 H86" stroke="#fff" stroke-width="20" stroke-linecap="round" fill="none"/>';
const personer = (kant: string) => `<circle cx="30" cy="28" r="16" fill="#fff"/><circle cx="70" cy="28" r="16" fill="#fff"/><path d="M2 88 Q2 50 30 50 Q58 50 58 88 Z M42 88 Q42 50 70 50 Q98 50 98 88 Z" fill="#fff" stroke="${kant}" stroke-width="5"/>`;

/** Ikonen som svg på 512 × 512: den vanliga, eller den maskbara med rutorna inom Androids säkra cirkel. */
export function appikonSvg({ maskbar = false }: { maskbar?: boolean } = {}): string {
  const omraden = [farg('farg-lasning'), farg('farg-skrivning'), farg('farg-accent'), farg('farg-socialt')];
  const symboler = [BOK, PENNA, PLUS, personer(omraden[3])];
  const [sida, start, steg, radie] = maskbar ? [120, 128, 136, 22] : [164, 80, 188, 30];
  const skala = (sida * 0.64) / 100;
  const rutor = omraden.map((f, i) => {
    const x = start + (i % 2) * steg, y = start + Math.floor(i / 2) * steg;
    const mitt = (v: number) => v + sida / 2 - 50 * skala;
    return `<rect x="${x}" y="${y}" width="${sida}" height="${sida}" rx="${radie}" fill="${f}"/><g transform="translate(${mitt(x)} ${mitt(y)}) scale(${skala})">${symboler[i]}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#ffffff"/>${rutor}</svg>`;
}

/** Bilderna som bygget gör av ikonen: Androids två storlekar och den maskbara, och iPhones hemskärmsikon. */
export const APPIKONER = {
  'ikon-192': { storlek: 192, maskbar: false },
  'ikon-512': { storlek: 512, maskbar: false },
  'ikon-maskbar-512': { storlek: 512, maskbar: true },
  'ikon-180': { storlek: 180, maskbar: false },
} as const;
export type Appikon = keyof typeof APPIKONER;
export const appikonAdress = (ikon: Appikon) => `/stodundervisning/app/${ikon}.png`;
