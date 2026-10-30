// Undervisningsmetodens sida (K-621): det sidan räknar ur metodens fil, en rot för sidan, Lär dig metoden och filerna.
// Delarna och utfallens gränser står i standarden (src/lib/standard/undervisningsmetod.js), som riggen också läser.
import type { CollectionEntry } from 'astro:content';
import { esc, tidensMatt, periodensLangd, UNDERVISNINGSMETODENS_DELAR, delarnasText } from './standard/index.js';

// Schemat prövar huvudet, faktan, profilen och källorna och släpper igenom resten tills mallen och piloten har samma fält
// (K-627), så sidan läser resten som metodens fil har det.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Um = CollectionEntry<'undervisningsmetoder'>['data'] & Record<string, any>;

export const metodensAdress = (id: string) => `/metoder/${id}`;

/** Huvudexemplets ämne i ord, som delarnas text säger det ("i matematik"). */
const AMNEN: Record<string, string> = { lasning: 'läsning', skrivning: 'skrivning', matematik: 'matematik', 'so-no': 'SO och NO', 'praktisk-estetiska': 'ett praktiskt-estetiskt ämne' };
export const AMNESNAMN: Record<string, string> = { lasning: 'Läsning', skrivning: 'Skrivning', matematik: 'Matematik', 'so-no': 'SO och NO', 'praktisk-estetiska': 'Praktisk-estetiska ämnen' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exempletsAmne = (e: Record<string, any>): string => e.amnesnamn ?? AMNESNAMN[e.amne] ?? e.amne;

/** Delarna med metodens rad och övergångsmening. */
export function metodensDelar(d: Um) {
  const minuter = tidensMatt(d.tid).minuter;
  const veckor = periodensLangd(d.period)?.min;
  const huvud = (d.amnesexempel ?? []).find((e: { huvud?: boolean }) => e.huvud);
  const andra = (d.amnesexempel ?? []).filter((e: { huvud?: boolean }) => !e.huvud).length;
  return UNDERVISNINGSMETODENS_DELAR.map((del) => ({ ...del, ...delarnasText(del, { minuter, veckor, amne: huvud ? (huvud.amnesnamn?.toLocaleLowerCase('sv') ?? AMNEN[huvud.amne]) : undefined, andra, progression: d.progression?.text }) }));
}

/** En hänvisnings nyckel som riggens id för källan: å och ä som a, ö som o, é som e, m.fl. som m-fl, och året sist. */
export const kallansId = (namn: string, ar: string) => `${namn} ${ar}`.toLocaleLowerCase('sv').replace(/m\.fl\./g, 'm-fl').replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Texten som HTML där varje hänvisning (Författare, årtal) i en parentes leder till sin post i referensbladet (riggens
 * förslag 2026-10-29). En hänvisning som inte är en källa i metoden står som text.
 */
export function medKallor(text: string, kallor: Set<string>, sidor: { titel: string; href: string }[] = []): string {
  let t = esc(String(text ?? ''));
  // En metod som sajten har, som De fyra räknesätten i grupp, är en länk dit (STIL.md under Hänvisningar).
  for (const s of sidor) t = t.replace(esc(s.titel), `<a href="${s.href}">${esc(s.titel)}</a>`);
  return t.replace(/\(([^()]*\d{4}[^()]*)\)/g, (hel, inne: string) => {
    const delar = inne.split(/;\s*/).map((del) => {
      const m = del.match(/^(.*?),?\s+(\d{4}[a-z]?)$/);
      if (!m) return del;
      const id = kallansId(m[1].replace(/^se\s+/, ''), m[2]);
      return kallor.has(id) ? `<a href="#kalla-${id}" class="um-kalla">${del}</a>` : del;
    });
    return `(${delar.join('; ')})`;
  });
}

/** Gruppernas rubrik och förklaring i referensbladet, i bladets ordning. */
export const KALLGRUPPER = [
  { id: 'oversikt', namn: 'Metastudier', text: 'Sammanställningar av många studier. De bär nivåerna i metodkortet.' },
  { id: 'experiment', namn: 'Experimentella studier och RCT', text: 'En grupp fick metoden och en jämförbar grupp fick den inte, ofta efter lottning.' },
  { id: 'annan', namn: 'Övriga', text: 'Artiklar, översikter och klassrumsstudier som beskriver kärnan och lektionen.' },
] as const;

export const OMRADESORD: Record<string, string> = { larande: 'Lärande totalt', lasning: 'Läsning', skrivning: 'Skrivning', matematik: 'Matematik', amnen: 'Ämnen', socialt: 'Socialt' };
export const SLAGORD: Record<string, string> = { metaanalys: 'Metaanalys', 'systematisk-oversikt': 'Systematisk översikt', studie: 'Studie', artikel: 'Artikel', vagledning: 'Vägledning', rapport: 'Rapport', bok: 'Bok', ovrigt: 'Övrigt' };

/**
 * Effektens tal och ord ur källans effekt, som riggens referensblad visar dem: "Måttlig effekt: g = 0,31 i 14 studier"
 * blir talet 0,31. Ingen effekt blir ≈ 0, också när källan har två tal åt olika håll, och en effekt utan tal visar ordet
 * i stället för ett tal, så att bladet aldrig har ett tal som källan inte har (granskningen 2026-10-30).
 */
export function effektensDelar(effekt: string): { ord: string; tal: string; resten: string } {
  const [ord, ...rest] = effekt.split(':');
  const resten = rest.join(':').trim();
  const ordet = ord.trim();
  const funnet = resten.match(/(?:[dg]\s*=\s*)?(−?\d+,\d+)/)?.[1];
  // Det stora talet med högst två decimaler, som de andra; raden under har källans eget tal.
  const avrundat = funnet && /,\d{3,}$/.test(funnet) ? (Math.round(Number(funnet.replace('−', '-').replace(',', '.')) * 100) / 100).toFixed(2).replace('.', ',').replace('-', '−') : funnet;
  const tal = /^ingen/i.test(ordet) ? '≈ 0' : avrundat ?? ordet.split(' ')[0];
  return { ord: ordet, tal, resten };
}

/** Källans länk: DOI till doi.org och ERIC till eric.ed.gov, som riggens mall säger, och annars adressen. */
export function kallansLank(k: { doi?: string; eric?: string; adress?: string }): { href: string; text: string } | null {
  if (k.doi) return { href: `https://doi.org/${k.doi}`, text: `DOI ${k.doi}` };
  if (k.eric) return { href: `https://eric.ed.gov/?id=${k.eric}`, text: `ERIC ${k.eric}` };
  return k.adress ? { href: k.adress, text: new URL(k.adress).hostname.replace(/^www\./, '') } : null;
}

/** Komponentens nummer i kärnan, 1 till 4, ur namnet. */
export const komponentensNr = (d: Um, namn: string) => (d.karna?.komponenter ?? []).findIndex((k: { namn: string }) => k.namn === namn) + 1;

/** Kärnans komponenter som bär en lektionsdel, med numren (`moment`). */
export const karnanI = (d: Um, fas: string) => (d.karna?.komponenter ?? []).map((k: { namn: string; moment?: string[] }, i: number) => ({ nr: i + 1, namn: k.namn, moment: k.moment ?? [] })).filter((k: { moment: string[] }) => k.moment.includes(fas) || k.moment.includes('hela lektionen'));

/** Tidsschemats rad för en del, som minuterna och arbetsformen. */
export const tidsschematsRad = (d: Um, fas: string) => (d.tidsschema?.rader ?? []).find((r: { fas: string }) => r.fas === fas);
