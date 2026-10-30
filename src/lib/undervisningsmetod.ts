// Undervisningsmetodens sida (K-621): det sidan räknar ur metodens fil, en rot för sidan, Lär dig metoden och filerna.
// Delarna och utfallens gränser står i standarden (src/lib/standard/undervisningsmetod.js), som riggen också läser.
// Modulen läser inga filer, så att sidans skript kan läsa den; filerna läser src/lib/undervisningsmetodfiler.ts.
import type { CollectionEntry } from 'astro:content';
import type { MetodSak } from './metodsaker';
import { esc, tidensMatt, periodensLangd, UNDERVISNINGSMETODENS_DELAR, delarnasText, utfallensGranser, arSaksord, sakernasText, slugAv } from './standard/index.js';

// Schemat prövar huvudet, faktan, profilen och källorna och släpper igenom resten tills mallen och piloten har samma fält
// (K-627), så sidan läser resten som metodens fil har det.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Um = CollectionEntry<'undervisningsmetoder'>['data'] & Record<string, any>;

export const metodensAdress = (id: string) => `/metoder/${id}`;
/** Metoderna i Stödundervisning som metoden hör ihop med (relaterade), som sidor: deras titlar blir länkar i texten (medSaker). */
export const relateradeSidor = (d: Um, stod: { id: string; data: { titel: string } }[]) => (d.relaterade ?? []).map((rid: string) => stod.find((x) => x.id === rid)).filter((x: unknown): x is { id: string; data: { titel: string } } => !!x).map((x: { id: string; data: { titel: string } }) => ({ titel: x.data.titel, href: `/stodundervisning/${x.id}` }));

/** Filerna som riggen bygger, i nedladdningens ordning (Ladda ner och skriv ut, som i Stödundervisning). */
export type UmSlag = 'allt' | 'metoden' | 'lathund' | 'lektionskort' | 'planeringsmall' | 'materialet' | 'observation' | 'referensblad';
/** Filens namn, som sidan, knapparna och texterna säger det, och sakens namn i metodens saker. */
export const UM_NAMN: Record<UmSlag, string> = {
  allt: 'Allt om metoden', metoden: 'Metoden', lathund: 'Lathunden Att komma igång', lektionskort: 'Lektionskortet', planeringsmall: 'Planeringsmallen',
  materialet: 'Materialet för klassen', observation: 'Observationsmallen', referensblad: 'Referensbladet',
};
export const UM_SLAG = Object.keys(UM_NAMN) as UmSlag[];
/** Filens stam i public/metoder/: <id> för filen med allt, annars <id>-<slag>. */
export const umStam = (id: string, slag: UmSlag) => (slag === 'allt' ? id : `${id}-${slag}`);
/** Filens korta namn, utan lathundens titel: Lathunden. */
export const umKort = (slag: UmSlag) => (slag === 'lathund' ? UM_NAMN.lathund.split(' ')[0] : UM_NAMN[slag]);
/**
 * Raden i Ladda ner och skriv ut, med samma ord som i Stödundervisning (Niclas 2026-10-10: samma knapp heter samma sak på
 * varje metodsida): Allt om metoden, och varje del av den filen som Bara, som Bara metoden och Bara lathunden.
 */
export const umRad = (slag: UmSlag) => (slag === 'allt' ? UM_NAMN.allt : `Bara ${umKort(slag).charAt(0).toLocaleLowerCase('sv')}${umKort(slag).slice(1)}`);
/** Metodkortet, rutan med forskningen överst på sidan (Metodprofil.astro), som texterna nämner. */
export const METODKORTET = 'Metodkortet';

/**
 * Metodens saker (STIL.md under Hänvisningar): det metoden har ett namn på och sidan en egen plats för, med en knapp som
 * skriver ut eller laddar ner det. Lektionskortet, varje blad i Materialet för klassen, materialet i sin helhet,
 * planeringsmallen, observationsmallen, referensbladet och lathunden, och metodkortet, som är en del av sidan och skrivs ut
 * med metoden (slag avsnitt, utan egen knapp). Namnen kommer ur metodens fil och UM_NAMN och adresserna ur sidans ankare,
 * så att ett nytt blad eller namn följer med av sig själv. Standarden hittar namnen i en text (sakdelar) och de namn som
 * ingen sak har (olankadeSaker), som i Stödundervisning (src/lib/metodsaker.ts). Adresserna är hela, så att lathundens
 * sida kan länka hit.
 */
export function undervisningsmetodensSaker(d: Um, id: string): MetodSak[] {
  const sida = metodensAdress(id);
  // Ett namn som är ett ord för en sak (Planeringsmallen, Affischen Så visar du) hittas också med liten bokstav; ett annat,
  // som Stegen, bara som en titel, med stor bokstav mitt i en mening (arSaksord i standarden), så att "skriv stegen" inte
  // blir en länk.
  const sak = (namn: string, adress: string, extra: Partial<MetodSak> = {}): MetodSak => ({ namn, adress, ...(arSaksord(namn) ? {} : { versal: true }), ...extra });
  const saker: MetodSak[] = [sak(UM_NAMN.lektionskort, `${sida}#materialet`)];
  if (d.ramar) {
    saker.push(sak(d.ramar.rubrik ?? UM_NAMN.materialet, `${sida}#materialet-for-klassen`));
    for (const r of d.ramar.ramar ?? []) saker.push(sak(r.rubrik, `${sida}#${bladetsAnkare(r.rubrik)}`));
  }
  if (d.planeringsmall) saker.push(sak(UM_NAMN.planeringsmall, `${sida}#planeringsmallen`));
  if (d.observation) saker.push(sak(UM_NAMN.observation, `${sida}#observationsmallen`));
  saker.push(sak(UM_NAMN.referensblad, `${sida}#referensbladet`));
  if (d.lathund) for (const namn of [UM_NAMN.lathund, umKort('lathund')]) saker.push(sak(namn, `${sida}/lathund`));
  saker.push(sak(METODKORTET, `${sida}#metodkortet`, { slag: 'avsnitt' }));
  return saker;
}
/** Bladets ankare i Materialet för klassen, ur namnet. */
export const bladetsAnkare = (namn: string) => `blad-${slugAv(namn)}`;

/**
 * Texten som HTML med metodens saker som länkar och hänvisningarna till källorna som länkar till referensbladet (medKallor):
 * en rot för varje text på metodens sida. Böckerna och verktygen länkar Boklankar.astro runt sidan.
 */
export function medSaker(text: string, saker: MetodSak[], kallor: Set<string>, sidor: { titel: string; href: string }[] = []): string {
  return sakernasText(String(text ?? ''), saker, (s, t) => `<a href="${esc(s.adress)}" class="um-sak">${esc(t)}</a>`, (t) => medKallor(t, kallor, sidor));
}

/** Utfallets gräns i en klass med n elever, i elever med fel, ur utfallensGranser i standarden: "Högst 5 av 28 med fel." */
export function utfalletsGrans(id: 'nastanAlla' | 'deFlesta' | 'halften', n: number): string {
  const g = utfallensGranser(n);
  return id === 'nastanAlla' ? `Högst ${g.nastanAlla} av ${n} med fel.` : id === 'deFlesta' ? `${g.deFlesta[0]}–${g.deFlesta[1]} av ${n} med fel.` : `${g.halften} eller fler av ${n} med fel.`;
}
/** Regeln bakom gränserna, i ord, som utfallensGranser räknar (standarden, avsnitt 7). */
export const UTFALLENS_REGEL = 'Nästan alla kan när högst en av fem har fel, avrundat nedåt. Hälften eller färre kan när hälften eller fler har fel, avrundat uppåt.';
/** Klassens antal som utfallen i metodens text räknar med: talet efter "av" i den första gränsen, annars 28. */
export const utfallensElever = (redo?: Record<string, string>) => Number(String(redo?.nastanAlla ?? '').match(/\bav (\d+)/)?.[1] ?? 28);
/**
 * Utfallets text som HTML, där gränserna för klassens antal står som tal som sidans skript räknar om när läraren skriver
 * ett annat antal elever (granskare-3 nr 2): "Högst 5 av 28", "6–13 av 28", "14 eller fler" och "fler än 5 av 28" ur
 * texten blir element med standardens tal. Talen räknas av utfallensGranser, i skriptet också.
 */
export function utfallensTal(text: string, n: number): string {
  const g = utfallensGranser(n);
  const tal = (nyckel: string, v: number) => `<span data-grans="${nyckel}">${v}</span>`;
  const av = `<span data-elever>${n}</span>`;
  return esc(String(text ?? ''))
    .replace(new RegExp(`\\b${g.deFlesta[0]}–⁠?${g.deFlesta[1]} av ${n}\\b`, 'g'), `${tal('deFlesta0', g.deFlesta[0])}–${tal('deFlesta1', g.deFlesta[1])} av ${av}`)
    .replace(new RegExp(`\\b${g.nastanAlla} av ${n}\\b`, 'g'), `${tal('nastanAlla', g.nastanAlla)} av ${av}`)
    .replace(new RegExp(`(^|[^–\\d])${g.halften} eller fler\\b`, 'g'), `$1${tal('halften', g.halften)} eller fler`);
}

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
 * i stället för ett tal, så att bladet aldrig har ett tal som källan inte har (granskningen 2026-10-30). En effekt som
 * källan säger inte är säker, "inte säker" eller "ingen säker skillnad", heter Inte säker, vilket tal den än har, så att det
 * stora ordet inte säger Måttlig effekt om ett resultat som raden under kallar osäkert (design-3 nr 14, granskare-3 nr 12).
 */
export function effektensDelar(effekt: string): { ord: string; tal: string; resten: string } {
  const [ord, ...rest] = effekt.split(':');
  const resten = rest.join(':').trim();
  const ordet = /\binte säker\b|\bingen säker skillnad\b/i.test(effekt) ? 'Inte säker' : ord.trim();
  const funnet = resten.match(/(?:[dg]\s*=\s*)?(−?\d+,\d+)/)?.[1];
  // Det stora talet med högst två decimaler, som de andra; raden under har källans eget tal.
  const avrundat = funnet && /,\d{3,}$/.test(funnet) ? (Math.round(Number(funnet.replace('−', '-').replace(',', '.')) * 100) / 100).toFixed(2).replace('.', ',').replace('-', '−') : funnet;
  const tal = /^ingen/i.test(ord.trim()) ? '≈ 0' : avrundat ?? ordet.split(' ')[0];
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

/** Planeringsbladets egna ord, som bladet på sidan (Planeringsblad.astro) och i lathundens filer (metodpptx.ts) skriver. */
export const BLADETS_ORD = {
  klass: 'Klass', amne: 'Ämne', datum: 'Datum', lektion: 'Lektion i arbetsområdet', mal: 'När lektionen är slut ska eleverna kunna', belagg: 'Så ser jag att de kan: exit-lappen',
  fore: 'Före lektionen', forberett: 'Förberett', blad: 'Blad och facit', stod: 'Stöd, till vem', lektionen: 'Lektionen', minuterna: 'minuterna i', karnan: 'kärnan',
  beslutet: 'Beslutet', elever: 'elever i dag:', efter: 'Efter lektionen', karnanIlektionen: 'Kärnan i lektionen',
} as const;
/** Ett fält i planeringen som lista: en lista, en text som lista med en rad, eller tom. */
export const bladetsLista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);
/** En rad på planeringsbladet bryts efter en mittpunkt och aldrig i ett tal (designgranskningen 2026-10-30: 14 blev 1 och 4). */
export const bladetsRad = (t?: string) => t?.replace(/ · /g, ' · ');

/**
 * Planeringsbladets regler (riggens standard, avsnitt 11) för en ifylld plan, som Planeringsblad.astro och lathundens
 * PowerPoint-fil och pdf ritar bladet ur (src/lib/metodpptx.ts), så att bladet säger samma sak på sidan och i filerna.
 * Etiketterna kommer ur metodens planeringsmall. Med variant har delarna variantens minuter, som första lektionens
 * (granskningen 2026-10-30: förlagan till lektion 1 visade 40-minutersschemats tider). Utfallets text är stegets redo utan
 * den första meningen, som mallen och lektionskortet har den, och gränsen för klassens antal ger utfalletsGrans. Efter
 * lektionens etiketter står utan understrecken där läraren skriver, och exit-lapparnas rad har högarna efter kolon, som
 * läraren ringar in på det tomma bladet; på det ifyllda står bara namnet (granskare-3 nr 14).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function planeringsbladet(d: Um, plan: Record<string, any>, variant?: string) {
  const mall = d.planeringsmall ?? {};
  const varianten = variant ? (d.tidsschema?.varianter ?? []).find((v: { nar: string }) => v.nar === variant) : undefined;
  const delensTid = (fas: string): string | undefined => varianten?.delar?.find((x: { fas: string }) => x.fas === fas)?.tid ?? tidsschematsRad(d, fas)?.tid;
  const kontrollen = (d.steg?.rader ?? []).find((s: { redo?: unknown }) => s.redo);
  const utfalletsText = (id: string) => String(kontrollen?.redo?.[id] ?? '').replace(/^[^.]*\.\s*/, '');
  const delarna = (mall.delar ?? []) as { fas: string; skriv?: string; not?: string }[];
  const planensDel = (fas: string) => bladetsRad((plan.delar ?? []).find((x: { fas: string }) => x.fas === fas)?.text as string | undefined);
  const kryss = new Set<number>(plan.efter?.kryss ?? []);
  const etikett = (falt: string, forval: string, kolon = false) => { const t = String(mall.efter?.[falt] ?? forval).replace(/[:_\s]+$/, '').replace(/:\s*_+.*$/, '').split(/\s{2,}/)[0]; return kolon ? t.split(':')[0] : t; };
  return { mall, varianten, delensTid, utfalletsText, delarna, planensDel, kryss, etikett };
}
