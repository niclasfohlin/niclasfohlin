// Inga antal av databasernas poster i metodernas text (K-450; Niclas 2026-10-19: "Hela tanken är att databaserna ska kunna
// växa och allt då hänger med utan att du måste kontrollera varenda liten text i metoderna", och "Försök hålla antal och
// annat ur lathundar och filer. Eftersom det inte blir bra skalbarhet"). Metodens text står också i Word-filerna,
// pdf:erna och lathunden, som görs om och läggs i git när texten ändras, så ett tal som följde databasen skulle göra om
// dem varje gång databasen växer. Texten säger därför var posterna finns, och sidorna som räknar dem (Ta fram, bankens
// nivåer, korten) visar talen. Här står databasens ord och spärren, som publicerade (src/lib/innehall.ts) kör: ett fast
// antal av databasens poster, som "tjugofem texter", stoppar bygget, utom fraserna som står med sitt skäl i
// src/data/fasta-antal.json. Reglerna står i METODER.md under Antalen och databaserna.
import { bankAv } from './bank';
import { skrivkortAv } from './skrivkort';
import { aktiviteterAv, brainbreaksAv } from './aktiviteter';
import { fastaAntal } from './standard/index.js';
import undantag from '../data/fasta-antal.json';
import type { MetodData } from './metod';

type Metod = { id: string; data: MetodData };
type Undantag = Record<string, { fras: string; skal: string }[]>;

/**
 * En metods databasord: postens substantiv (ord), som spärren letar efter från fem, och det posterna står i (grupper,
 * teman och kategorier), som den letar efter från två. En metod utan databas har inga.
 */
export function metodensDatabasord(m: Metod): { ord: string[]; grupper: string[] } {
  const ord: string[] = [];
  const grupper: string[] = [];
  const bank = bankAv(m.data);
  if (bank) {
    ord.push(bank.ord.flera, bank.ord.alla);
    if (bank.ord.flera === 'texter') ord.push('lästexter', 'lästexterna', 'faktatexter', 'faktatexterna');
    if (bank.enheter.some((e) => e.tema)) grupper.push('teman', 'temana');
  }
  if (skrivkortAv(m.id)) ord.push('skrivkort', 'skrivkorten', 'kort', 'korten');
  if (aktiviteterAv(m.id)) { ord.push('aktiviteter', 'aktiviteterna', 'aktivitetskort', 'aktivitetskorten', 'kort', 'korten'); grupper.push('kategorier', 'kategorierna'); }
  if (brainbreaksAv(m.id)) { ord.push('brainbreaks', 'brainbreakkort', 'brainbreakkorten', 'kort', 'korten'); grupper.push('kategorier', 'kategorierna'); }
  return { ord: [...new Set(ord)], grupper: [...new Set(grupper)] };
}

/** De fasta antalen av databasens poster i en metods text, utom fraserna i src/data/fasta-antal.json, med var de står. */
export function metodensFastaAntal(m: Metod): string[] {
  const { ord, grupper } = metodensDatabasord(m);
  if (!ord.length && !grupper.length) return [];
  const tillatna = ((undantag as Undantag)[m.id] ?? []).map((u) => u.fras);
  const fel: string[] = [];
  const ga = (v: unknown, vag: string) => {
    if (typeof v === 'string') { for (const t of fastaAntal(v, ord, grupper)) if (!tillatna.some((f) => f.includes(t) && v.includes(f))) fel.push(`${vag}: "${t}"`); }
    else if (Array.isArray(v)) v.forEach((x, i) => ga(x, `${vag}.${i}`));
    else if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) for (const [k, x] of Object.entries(v)) ga(x, vag ? `${vag}.${k}` : k);
  };
  ga(m.data, '');
  return fel;
}
