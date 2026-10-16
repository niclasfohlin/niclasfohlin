// Aktivitetskortet och brainbreakkortet i webbläsaren (Gruppstärkande aktiviteter, 2026-10-16), ritade ur
// databasernas data (src/lib/aktiviteter.ts, aktiviteterData och brainbreaksData). Formen är riggens (build/kortform.js)
// och samma som i Word (src/lib/aktivitetskortform.ts): ett band i kortets färg med kategorin eller ordet Brainbreak och
// numret, namnet i elevens typsnitt, bilden i en enda linje och texten. Stilarna står under Aktivitetskorten och
// brainbreakkorten i global.css. Sidorna som slumpar korten och deras delningskort ritar med samma kod.
import { ejBryt } from '../lib/metod';

export type Kategori = { id: string; namn: string; farg: string };
export type Aktivitet = { id: string; kategori: string; nr: number; namn: string; rad: string; grupp: string; tid: string; plats: string; beroring?: boolean; material: string[]; steg: string[]; tanka: string[]; bild: string; alt: string; pdf: string };
export type Aktivitetsdata = { kategorier: Kategori[]; kort: Aktivitet[] };
export type Kanal = { id: string; namn: string; kanal: string; strom: string; reserv: string; sida: string };
export type Brainbreak = { id: string; nr: number; kategori: string; namn: string; minuter: number; slag: string; musik: string; plats: string; beroring?: boolean; text: string; bild: string; alt: string };
export type Brainbreakdata = { farg: string; kategorier: { id: string; namn: string; farg: string }[]; musik: Kanal[]; kort: Brainbreak[] };

// Ett spann som "i grupper om 3–5" bryts aldrig efter tankstrecket, som i metodens text (ejBryt i src/lib/metod.ts).
export const el = (tag: string, klass?: string, text?: string) => { const e = document.createElement(tag); if (klass) e.className = klass; if (text !== undefined) e.textContent = ejBryt(text); return e; };
const NBSP = ' ';

function bandet(vanster: string, hoger: string) {
  const band = el('p', 'kb-band');
  band.append(el('span', 'kb-band-namn', vanster), el('span', 'kb-band-nr', hoger));
  return band;
}
function bilden(src: string, alt: string) {
  const i = document.createElement('img');
  i.className = 'kb-bild';
  i.src = src;
  i.alt = alt;
  i.width = 600;
  i.height = 400;
  i.decoding = 'async';
  return i;
}

/** Aktivitetskortet. liten är formen bland sex: bandet, namnet, raden och bilden, utan stegen. */
export function aktivitetskortet(data: Aktivitetsdata, k: Aktivitet, liten: boolean): HTMLElement {
  const kat = data.kategorier.find((x) => x.id === k.kategori)!;
  const f = el('article', `aktivitetskort${liten ? ' liten' : ''}`);
  f.style.setProperty('--kat', kat.farg);
  f.dataset.kort = k.id;
  f.append(bandet(kat.namn, String(k.nr)));
  const huvud = el('div', 'kb-huvud');
  huvud.append(el(liten ? 'p' : 'h2', 'kb-namn', k.namn), el('p', 'kb-rad', k.rad));
  if (!liten) huvud.append(el('p', 'kb-fakta', [k.grupp, k.tid, k.plats, ...(k.beroring ? ['Rör vid varandra'] : [])].join(`${NBSP}·${NBSP} `)));
  f.append(huvud, bilden(k.bild, k.alt));
  if (liten) return f;
  const steg = el('section', 'kb-steg');
  steg.append(el('h3', 'kb-rubrik', 'Så gör ni'));
  const ol = el('ol');
  for (const s of k.steg) ol.append(el('li', undefined, s));
  steg.append(ol);
  const fot = el('div', 'kb-tva');
  const kolumn = (rubrik: string, rader: string[]) => {
    const d = el('section', 'kb-kolumn');
    d.append(el('h3', 'kb-rubrik', rubrik));
    const ul = el('ul');
    for (const r of rader.length ? rader : ['Inget']) ul.append(el('li', undefined, r));
    d.append(ul);
    return d;
  };
  fot.append(kolumn('Material', k.material), kolumn('Att tänka på', k.tanka));
  f.append(steg, fot);
  return f;
}

/** Brainbreakkortet, gruppens kort som visas stort. liten är formen bland sex: bandet, namnet, kategorin och bilden.
 *  Bandet säger Brainbreak, och kategorin, som Lek eller Lugn, står som en tagg under namnet, i kategorins färg, som också
 *  är kortets kant och band (Niclas 2026-10-16: "Att de heter Brainbreak i bandet men med en tagg lugn"). Med vidTagg
 *  är taggen en knapp som ger sex nya ur kategorin (Niclas 2026-10-16: "Kan du göra taggen klickbar så man kommer till 6
 *  nya om man trycker på den"). Bland sex är hela kortet knappen som väljer det, och där är taggen en etikett. */
export function brainbreakkortet(data: Brainbreakdata, k: Brainbreak, liten: boolean, vidTagg?: (kategori: string) => void): HTMLElement {
  const kat = data.kategorier.find((x) => x.id === k.kategori);
  const f = el('article', `brainbreakkort${liten ? ' liten' : ''}`);
  f.style.setProperty('--kat', kat?.farg ?? data.farg);
  f.dataset.kort = k.id;
  f.append(bandet('Brainbreak', `${k.minuter}${NBSP}min${NBSP}·${NBSP}${k.nr}`));
  const huvud = el('div', 'kb-huvud');
  huvud.append(el(liten ? 'p' : 'h2', 'kb-namn', k.namn));
  if (kat && vidTagg && !liten) {
    const t = el('button', 'kb-tagg', kat.namn) as HTMLButtonElement;
    t.type = 'button';
    t.title = `Sex nya ur ${kat.namn}`;
    t.setAttribute('aria-label', `Sex nya ur ${kat.namn}`);
    // Två korsade pilar: knappen slumpar.
    t.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 4h4v4M4 20 20 4M20 16v4h-4M15 15l5 5M4 4l5 5" /></svg>');
    t.addEventListener('click', () => vidTagg(kat.id));
    huvud.append(t);
  } else if (kat) huvud.append(el('p', 'kb-tagg', kat.namn));
  if (k.beroring) huvud.append(el('p', 'kb-fakta', 'Rör vid varandra'));
  f.append(huvud, bilden(k.bild, k.alt));
  if (!liten) f.append(el('p', 'kb-text', k.text));
  return f;
}

// Slumpen, som på sidan Ta fram ett skrivkort: ett kort kommer inte igen förrän urvalets alla kort har varit framme.
// sedda är korten som har visats, och den börjar om för urvalet när det inte finns nog med kort som inte har visats. De
// kort som redan står på skärmen dras inte igen i samma tryck.
const blanda = <T>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export function dra<T extends { id: string }>(urval: T[], n: number, sedda: string[]): { valda: T[]; sedda: string[] } {
  const visade = new Set(sedda);
  let nya = urval.filter((k) => !visade.has(k.id));
  const valda = blanda(nya).slice(0, n);
  let kvar = sedda;
  if (valda.length < n) {
    const iUrvalet = new Set(urval.map((k) => k.id));
    kvar = sedda.filter((id) => !iUrvalet.has(id));
    nya = urval.filter((k) => !valda.includes(k));
    valda.push(...blanda(nya).slice(0, n - valda.length));
  }
  return { valda, sedda: [...kvar, ...valda.map((k) => k.id)] };
}

/** Det som sparas i webbläsaren, under nyckel. Utan lagring (privat fönster) fungerar sidan ändå. */
export function lagring<T extends object>(nyckel: string, forval: T): { varde: T; spara: () => void } {
  let varde = forval;
  try { varde = { ...forval, ...JSON.parse(localStorage.getItem(nyckel) ?? '{}') }; } catch { /* utan lagring */ }
  return { varde, spara: () => { try { localStorage.setItem(nyckel, JSON.stringify(varde)); } catch { /* utan lagring */ } } };
}
