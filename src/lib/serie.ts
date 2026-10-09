// Serier i metodbanken (Ljudlek i grupp, 2026-09-29): en generell metod med en lektionsbank, och lektioner som är
// egna metoder med serie, formaga och tranar. Banken byggs här ur lektionerna, så att en ny lektion bara är en ny fil
// och en borttagen lektion försvinner överallt: ur banken på den generella metodens sida och i Word, ur metodbanken,
// startsidan och utskicket, och ur lektionernas meny. Niclas: lektioner ska kunna läggas till och tas bort enkelt.
// Inga Node-beroenden: metoddocx.ts använder typerna också i webbläsaren.
import type { MetodData, MetodPost } from './metod';

export interface Lektion { id: string; titel: string; namn: string; formaga: number; tranar: string }
export interface BankFormaga { nr: number; namn: string; skal?: string; lektioner: Lektion[] }
export interface Serie { id: string; titel: string; rubrik: string; text?: string; not?: string; formagor: BankFormaga[]; lektioner: Lektion[]; ord: SerieOrd }
// Seriens ord, så att en serie av kurser (Texttyper i grupp) inte säger lektion och förmåga: barnet i ental och flertal,
// bestämd och obestämd form, banken som menyn och kortet nämner den, gruppen (Förmåga, Texttyp), rubriken över skälen i
// Word och om namnen bär numret. Ljudlek i grupp har förvalen i schemat (src/content.config.ts, lektionsbank).
export interface SerieOrd { en: string; den: string; flera: string; de: string; meny: string; oversikt: string; iBanken: string; kolumn: string; grupp: string; skalRubrik: string; numrerad: boolean }
const SLAG = {
  lektioner: { en: 'lektion', den: 'lektionen', flera: 'lektioner', de: 'lektionerna', meny: 'Lektionsbanken', oversikt: 'Översikt och lektionsbank', iBanken: 'i lektionsbanken', kolumn: 'Lektionerna och vad eleven tränar' },
  kurser: { en: 'kurs', den: 'kursen', flera: 'kurser', de: 'kurserna', meny: 'Kurserna', oversikt: 'Översikt och kurser', iBanken: 'i serien', kolumn: 'Kursen och vad eleven tränar' },
};
export function serieOrd(bank: NonNullable<MetodData['lektionsbank']>): SerieOrd {
  return { ...SLAG[bank.slag ?? 'lektioner'], grupp: bank.grupp ?? 'Förmåga', skalRubrik: bank.skalRubrik ?? 'Skälet till platsen', numrerad: bank.numrerad ?? true };
}
// Var en lektion står i serien, som faktarutans rad Hör till: "förmåga 3 av 8: Första ljudet", och utan nummer
// "texttyp: Argumenterande text".
export function platsISerien(serie: Serie, formaga: BankFormaga | undefined): string {
  const grupp = serie.ord.grupp.toLocaleLowerCase('sv');
  return serie.ord.numrerad ? `${grupp} ${formaga?.nr ?? ''} av ${serie.formagor.length}: ${formaga?.namn ?? ''}` : `${grupp}: ${formaga?.namn ?? ''}`;
}
// Det en metod vet om sin serie. Den generella metoden har serien med banken; en lektion har dessutom sin plats i
// banken, förmågan och lektionerna före och efter i bankens ordning.
export interface SerieKoppling { serie: Serie; lektion?: Lektion; formaga?: BankFormaga; forra?: Lektion; nasta?: Lektion }
// En metod med sin plats i serien. Följer med i metoder.json, så att Word-filen som byggs i webbläsaren får samma
// lektionsbank som den som byggs vid bygget.
export interface MetodPostISerie extends MetodPost { serie?: SerieKoppling }

// Lektionens namn i banken och menyerna: titeln efter seriens namn och kolon, "Ljudlek: Räkna ljud" blir "Räkna ljud".
export function lektionsnamn(titel: string): string {
  return titel.match(/^[^:]+:\s*(.+)$/)?.[1] ?? titel;
}

// Serierna bland metoderna, med lektionerna under sina förmågor i bokstavsordning. Stoppar bygget med besked när en
// lektion pekar på en serie eller förmåga som inte finns, till exempel en publicerad lektion vars generella metod är
// ett utkast: då skulle lektionen länka till en sida som inte finns.
export function byggSerier(metoder: MetodPost[]): Map<string, Serie> {
  const serier = new Map<string, Serie>();
  for (const m of metoder) {
    const bank = m.data.lektionsbank;
    if (!bank) continue;
    serier.set(m.id, { id: m.id, titel: m.data.titel, rubrik: bank.rubrik, text: bank.text, not: bank.not, formagor: bank.formagor.map((f) => ({ ...f, lektioner: [] })), lektioner: [], ord: serieOrd(bank) });
  }
  const fel: string[] = [];
  for (const m of metoder) {
    const d = m.data;
    if (!d.serie) continue;
    const serie = serier.get(d.serie);
    if (!serie) {
      fel.push(`Lektionen "${d.titel}" (${m.id}.yaml) hör till serien "${d.serie}", som inte finns bland metoderna här. Är den generella metoden ett utkast, eller heter den något annat?`);
      continue;
    }
    const formaga = serie.formagor.find((f) => f.nr === d.formaga);
    if (!formaga) {
      fel.push(`Lektionen "${d.titel}" (${m.id}.yaml) har formaga ${d.formaga}, men lektionsbanken i ${serie.titel} har förmågorna 1–${serie.formagor.length}.`);
      continue;
    }
    formaga.lektioner.push({ id: m.id, titel: d.titel, namn: lektionsnamn(d.titel), formaga: formaga.nr, tranar: d.tranar ?? '' });
  }
  for (const s of serier.values()) {
    for (const f of s.formagor) f.lektioner.sort((a, b) => a.namn.localeCompare(b.namn, 'sv'));
    s.lektioner = s.formagor.flatMap((f) => f.lektioner);
    const iSerien = metoder.filter((m) => m.id === s.id || m.data.serie === s.id);
    fel.push(...okandaLektioner(s, iSerien));
  }
  if (fel.length) throw new Error(`Serierna i metodbanken går inte ihop:\n${fel.join('\n')}`);
  return serier;
}

// Texterna i en serie nämner lektioner med namn: "lektionen Första ljudet", "Lektionerna Rim och Ord och stavelser".
// Står ett namn efter lektionen eller lektionerna som inte är en lektion i serien, har lektionen tagits bort, bytt namn
// eller är ett utkast. Då stannar bygget och säger var, så att texten rättas innan en läsare letar efter lektionen.
function strangar(x: unknown, ut: string[] = []): string[] {
  if (typeof x === 'string') ut.push(x);
  else if (Array.isArray(x)) for (const y of x) strangar(y, ut);
  else if (x && typeof x === 'object' && !(x instanceof Date)) for (const y of Object.values(x)) strangar(y, ut);
  return ut;
}
export function okandaLektioner(serie: Serie, poster: MetodPost[]): string[] {
  const namn = serie.lektioner.map((l) => l.namn).sort((a, b) => b.length - a.length);
  const fel: string[] = [];
  for (const p of poster) {
    for (const s of strangar(p.data)) {
      for (const m of s.matchAll(/(?<!\p{L})[Ll]ektion(?:en|erna)\s+(?=\p{Lu})/gu)) {
        let pos = m.index + m[0].length;
        for (;;) {
          const traff = namn.find((n) => s.startsWith(n, pos) && !/\p{L}/u.test(s[pos + n.length] ?? ''));
          if (!traff) {
            fel.push(`${p.data.titel} (${p.id}.yaml) nämner ”${s.slice(m.index, pos + 30).trim()} …”, men ${serie.titel} har ingen sådan lektion. Lektionerna är ${serie.lektioner.map((l) => l.namn).join(', ') || 'inga'}.`);
            break;
          }
          pos += traff.length;
          const vidare = s.slice(pos).match(/^(?:, | och )(?=\p{Lu})/u);
          if (!vidare) break;
          pos += vidare[0].length;
        }
      }
    }
  }
  return fel;
}

export function serieKoppling(id: string, d: Pick<MetodData, 'serie' | 'lektionsbank'>, serier: Map<string, Serie>): SerieKoppling | undefined {
  if (d.lektionsbank) {
    const serie = serier.get(id);
    return serie && { serie };
  }
  const serie = d.serie ? serier.get(d.serie) : undefined;
  if (!serie) return undefined;
  const i = serie.lektioner.findIndex((l) => l.id === id);
  const lektion = serie.lektioner[i];
  if (!lektion) return { serie };
  return { serie, lektion, formaga: serie.formagor.find((f) => f.nr === lektion.formaga), forra: serie.lektioner[i - 1], nasta: serie.lektioner[i + 1] };
}

// En lektion står inte som eget kort i metodbanken, på startsidan eller i utskickets rubrik: den syns i sin serie.
export function arLektion(d: Pick<MetodData, 'serie'>): boolean {
  return Boolean(d.serie);
}

// Metoderna i läsordning för en samlad fil: varje serie som den generella metoden följd av lektionerna i bankens
// ordning, de andra metoderna som de kom.
export function iSerieordning<T extends MetodPost>(metoder: T[], serier: Map<string, Serie>): T[] {
  const perId = new Map(metoder.map((m) => [m.id, m]));
  const iSerie = new Set([...serier.values()].flatMap((s) => s.lektioner.map((l) => l.id)));
  return metoder
    .filter((m) => !iSerie.has(m.id))
    .flatMap((m) => [m, ...(serier.get(m.id)?.lektioner ?? []).map((l) => perId.get(l.id)).filter((x): x is T => Boolean(x))]);
}

// Seriens kort i metodbanken filtreras på allt som serien tränar: den generella metodens och lektionernas taggar.
export function serieTaggar(serie: Serie, metoder: MetodPost[]): string[] {
  const ids = new Set([serie.id, ...serie.lektioner.map((l) => l.id)]);
  return [...new Set(metoder.filter((m) => ids.has(m.id)).flatMap((m) => m.data.taggar))];
}

// Seriens datum är det senaste i serien, så att en ny lektion lyfter serien på startsidan.
export function serieUppdaterad(serie: Serie, metoder: MetodPost[]): number {
  const ids = new Set([serie.id, ...serie.lektioner.map((l) => l.id)]);
  return Math.max(0, ...metoder.filter((m) => ids.has(m.id)).map((m) => (m.data.uppdaterad ? new Date(m.data.uppdaterad).getTime() : 0)));
}
