// Symbolerna för strukturernas slag, Par, Grupp och Klass (K-650): en rot för kortet, filtret och strukturens sida.
// De är ritade i bildernas stil, med runda huvuden och tunn mörk linje, men så enkla att de syns i 16 punkter och i
// svartvitt: två huvuden för Par, fyra runt ett bord för Grupp och sju i två rader för Klass. Färgen är slagets och
// bär aldrig slaget ensam, eftersom korten ofta skrivs ut i svartvitt.
//
//   import { SLAGEN, symbol } from './symboler.mjs'
//   symbol('par')            svg med viewBox 0 0 48 48, i slagets färg
//   symbol('par', { farg })   med en annan färg, som vitt på en mörk yta
//   symbol('par', { klass })  med en annan klass än st-symbol, eller ingen med klass: ''

// Slagens färger är förslag (2026-10-31), skilda från ämnenas (Läsning grön, Skrivning plommon, Matematik blå,
// Socialt rost) och hämtade ur bildernas färger: blått, ockra och rosenrött.
export const SLAGEN = {
  par: { namn: 'Par', farg: '#2a7a96', ljus: '#dcedf3' },
  grupp: { namn: 'Grupp', farg: '#a8730e', ljus: '#f6ead2' },
  klass: { namn: 'Klass', farg: '#b8475f', ljus: '#f6e0e5' },
};

const LINJE = '#2b2b30';
const huvud = (x, y, r, fyll) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fyll}" stroke="${LINJE}" stroke-width="2.2"/>`;
const axlar = (x, y, b, fyll) => `<path d="M${x - b} ${y + b * 0.95}C${x - b} ${y + b * 0.1} ${x - b * 0.55} ${y - b * 0.15} ${x} ${y - b * 0.15}C${x + b * 0.55} ${y - b * 0.15} ${x + b} ${y + b * 0.1} ${x + b} ${y + b * 0.95}" fill="${fyll}" stroke="${LINJE}" stroke-width="2.2" stroke-linejoin="round"/>`;

export function symbol(slag, { farg, klass = 'st-symbol' } = {}) {
  const s = SLAGEN[slag];
  if (!s) throw new Error(`Slaget ${slag} finns inte`);
  const f = farg || s.farg;
  const ljus = farg ? '#ffffff' : s.ljus;
  let inne;
  if (slag === 'par') {
    // Två figurer, huvud och axlar, lite vända mot varandra.
    inne = axlar(15, 34, 11, f) + huvud(15, 20, 7.5, ljus) + axlar(33, 34, 11, f) + huvud(33, 20, 7.5, ljus);
  } else if (slag === 'grupp') {
    // Fyra huvuden runt ett bord, sett uppifrån.
    inne = `<rect x="15" y="15" width="18" height="18" rx="3" fill="${f}" stroke="${LINJE}" stroke-width="2.2"/>`
      + huvud(24, 7.5, 5.5, ljus) + huvud(24, 40.5, 5.5, ljus) + huvud(7.5, 24, 5.5, ljus) + huvud(40.5, 24, 5.5, ljus);
  } else {
    // Sju huvuden i två rader, med axlarna i slagets färg.
    const rad = (y, xs, r) => xs.map((x) => axlar(x, y + r * 1.2, r * 1.25, f) + huvud(x, y, r, ljus)).join('');
    inne = rad(12, [9, 19.7, 30.3, 41], 5) + rad(29, [14, 24, 34], 5.6);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"${klass ? ` class="${klass}"` : ''} aria-hidden="true">${inne}</svg>`;
}
