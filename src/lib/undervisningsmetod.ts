// Undervisningsmetodens sida (K-621): det sidan räknar ur metodens fil, en rot för sidan, Lär dig metoden och filerna.
// Delarna och utfallens gränser står i standarden (src/lib/standard/undervisningsmetod.js), som riggen också läser.
// Modulen läser inga filer själv, så att sidans skript kan läsa den; filerna läser src/lib/undervisningsmetodfiler.ts. Den
// importerar src/lib/strategier.ts, som läser strategierna, och sidans skript får därför bara importera typer härifrån.
import type { CollectionEntry } from 'astro:content';
import type { MetodSak } from './metodsaker';
import { strategikortetI, strategiernaAv } from './strategier';
import { esc, tidensMatt, periodensLangd, delarnaAv, delarnasText, slagensOrd, talText, utfallensGranser, utfallensPar, utfallsord, arSaksord, sakensFormer, sakernasText, slugAv, liten, skyddaRegex, uppraknat, forstaLektionensForm } from './standard/index.js';

// Schemat prövar huvudet, faktan, profilen och källorna och släpper igenom resten tills mallen och piloten har samma fält
// (K-627), så sidan läser resten som metodens fil har det.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Um = CollectionEntry<'undervisningsmetoder'>['data'] & { centrala?: { id: string; efterText: string }[] } & Record<string, any>;

export const metodensAdress = (id: string) => `/metoder/${id}`;

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
/** Filerna i rutan Ladda ner och skriv ut, standardens rader (NEDLADDNINGENS_RADER i standarden): allt, bara metoden och bara
 * lathunden, och filmerna efter dem. De andra filerna har sin knapp där saken står på sidan. */
export const NEDLADDNINGENS_SLAG: UmSlag[] = ['allt', 'metoden', 'lathund'];
/** Avsnittet med strukturkorten som metoden importerar (fältet strukturkort). */
export const STRUKTURKORTEN = 'Strukturkorten';
/** Metodkortet, rutan med forskningen överst på sidan (Metodprofil.astro), som texterna nämner. */
export const METODKORTET = 'Metodkortet';

/**
 * Metodens saker (STIL.md under Hänvisningar): det metoden har ett namn på och sidan en egen plats för, med en knapp som
 * skriver ut eller laddar ner det. Lektionskortet, varje blad i Materialet för klassen, materialet i sin helhet,
 * planeringsmallen, observationsmallen, referensbladet och lathunden, och metodkortet, som är en del av sidan och skrivs ut
 * med metoden (slag avsnitt, utan egen knapp), och strukturkorten och strukturerna som metoden importerar ur verktyget
 * Strukturer, som läses ur verktygets filer och kommer in som o.strukturer (metodensStrukturer i src/lib/strukturer.ts). Namnen kommer ur metodens fil och UM_NAMN och adresserna ur sidans ankare,
 * så att ett nytt blad eller namn följer med av sig själv. Standarden hittar namnen i en text (sakdelar) och de namn som
 * ingen sak har (olankadeSaker), som i Stödundervisning (src/lib/metodsaker.ts). Adresserna är hela, så att lathundens
 * sida kan länka hit. Utan lektionskortets fil, när kortet väntar på Niclas ja (VANTAR i scripts/metoderfiler.mjs), är
 * kortet ingen sak, så att ingen länk leder till en knapp som inte finns.
 */
export function undervisningsmetodensSaker(d: Um, id: string, o: { lektionskort?: boolean; tabeller?: string[]; strukturer?: { id: string; namn: string }[]; banktexter?: { namn: string; former: string[]; adress: string }[] } = {}): MetodSak[] {
  const sida = metodensAdress(id);
  // Ett namn som är ett ord för en sak (Planeringsmallen, Affischen Så visar du) hittas också med liten bokstav; ett annat,
  // som Stegen, bara som en titel, med stor bokstav mitt i en mening (arSaksord i standarden), så att "skriv stegen" inte
  // blir en länk. Ett namn som metoden själv skriver med liten bokstav i sin lista över materialet, faktarutans material och
  // Materialets inledning, är metodens ord för saken och hittas också med liten bokstav: "symbolerna" och "fraserna att
  // låna" i kooperativt lärande (lagningen inför lanseringen, D4: de var inga länkar fast bladen har egen plats och knapp).
  const materialet = [...(d.material ?? []), ...(d.ramar?.text ?? [])].join('\n');
  const iMaterialet = (namn: string) => new RegExp(`(^|[^\\p{L}])${skyddaRegex(liten(namn))}(?![\\p{L}])`, 'u').test(materialet);
  const sak = (namn: string, adress: string, extra: Partial<MetodSak> = {}): MetodSak => ({ namn, adress, ...(arSaksord(namn) || iMaterialet(namn) ? {} : { versal: true }), ...extra });
  const saker: MetodSak[] = o.lektionskort === false ? [] : [sak(UM_NAMN.lektionskort, `${sida}#materialet`)];
  // En fri tabell med en egen fil, som Grovplaneringen i Testbaserat lärande (o.tabeller, sakernasFiler i
  // src/lib/undervisningsmetodfiler.ts), är en sak med knappen under tabellen (K-684). En med en rad i menyn har en egen plats
  // på sidan, som Frågor att låna i Formativ bedömning, och skrivs ut med metoden.
  for (const t of (d.tabeller ?? []) as { rubrik: string; meny?: boolean }[]) {
    if (o.tabeller?.includes(t.rubrik)) saker.push(sak(t.rubrik, `${sida}#${slugAv(t.rubrik)}`));
    else if (t.meny) saker.push(sak(t.rubrik, `${sida}#${slugAv(t.rubrik)}`, { slag: 'avsnitt' }));
  }
  if (d.ramar) {
    saker.push(sak(d.ramar.rubrik ?? UM_NAMN.materialet, `${sida}#materialet-for-klassen`));
    // Ett blad vars rubrik har en etikett före kolon, som "Strukturen, vecka 1: Ping-pong-prat", hittas också med namnet
    // efter kolon, som texten skriver det (G6).
    for (const r of d.ramar.ramar ?? []) {
      const s = sak(r.rubrik, `${sida}#${bladetsAnkare(r.rubrik)}`);
      const efterKolon = /^[^:]+:\s+(\S.*)$/.exec(r.rubrik)?.[1];
      saker.push(efterKolon ? { ...s, former: [...sakensFormer(r.rubrik), efterKolon] } : s);
    }
  }
  // Bankens texter som metoden pekar ut, ur verktyg som metoden visar med fältet centrala (sakernasFiler): titeln med numret,
  // som den står, så att bara hänvisningen blir en länk. En form med en siffra hittas också först i en tabellcell.
  for (const t of o.banktexter ?? []) saker.push({ namn: t.namn, former: t.former, versal: true, adress: t.adress });
  // Strukturerna som metoden importerar ur verktyget Strukturer (fältet strukturkort, K-661): avsnittet Strukturkorten och
  // varje struktur med sitt namn, som leder till strukturens sida, så att Ping-pong-prat i texten är strukturen.
  if (d.strukturkort) {
    saker.push(sak(STRUKTURKORTEN, `${sida}#strukturkorten`));
    // Bara med stor bokstav, som en titel: verbet "turas om" är ingen länk till Turas om (granskningen 2026-11-01, P1).
    for (const x of o.strukturer ?? []) saker.push({ ...sak(x.namn, `/strukturer/${x.id}`), versal: true });
  }
  // Strategierna för lärande som metoden visar ur verktyget Strategier (fältet strategikort eller sajtens sådd, K-699,
  // K-702): avsnittet Strategikorten, metodens blad när det har ett namn, som Strategibladet, och varje strategi med sitt
  // namn med stor bokstav, som leder till strategins sida. En metod som lär ut strategierna i sitt fält strategikort länkar
  // namnen också först i en mening (forst i sakdelar), där det är strategin och inte verbet.
  const sk = strategikortetI(id, d);
  if (sk) {
    // Har metoden ett eget blad med namnet, som Strategikorten i Reciprok undervisning, leder namnet till bladet.
    if (!((d.ramar?.ramar ?? []) as { rubrik: string }[]).some((r) => r.rubrik === 'Strategikorten')) saker.push(sak('Strategikorten', `${sida}#strategierna`));
    const blad = (d as { strategikort?: { blad?: string } }).strategikort?.blad;
    // Bladet har sin knapp i avsnittet, som de andra sakerna, och namnet i texten leder dit.
    if (blad) saker.push(sak(blad, `${sida}#strategierna`));
    for (const x of strategiernaAv(sk.strategier, `${d.titel}: strategikort`)) saker.push({ ...sak(x.namn, `/strategier/${x.id}`), versal: true, ...((d as { strategikort?: unknown }).strategikort ? { forst: true } : {}) });
  }
  if (d.planeringsmall) saker.push(sak(UM_NAMN.planeringsmall, `${sida}#planeringsmallen`));
  if (d.observation) saker.push(sak(UM_NAMN.observation, `${sida}#observationsmallen`));
  saker.push(sak(UM_NAMN.referensblad, `${sida}#referensbladet`));
  if (d.lathund) for (const namn of [UM_NAMN.lathund, umKort('lathund')]) saker.push(sak(namn, `${sida}/lathund`));
  saker.push(sak(METODKORTET, `${sida}#metodkortet`, { slag: 'avsnitt' }));
  return saker;
}
/** Ett stegs ankare i lektionen på metodens sida, del-<namn>, som remsan, Lär dig metoden och utfallens knapp leder till. */
export const stegetsAnkare = (namn: string) => `del-${namn.toLocaleLowerCase('sv').replace(/[^a-zåäö0-9]+/g, '-')}`;
/** Utfallens ruta i ett steg, som knappen Utfallet i Lär dig metoden leder till (verifieringen 2026-11-02: knappen ledde till
 * stegets början, en och en halv skärm ovanför utfallen). */
export const utfalletsAnkare = (namn: string) => `${stegetsAnkare(namn)}-utfallet`;
/** Knappens namn för materialet: bladets när metoden har ett enda blad, som Strategikorten, så att knappen säger vad filen är. */
export const materialetsNamn = (d: Um) => { const r = (d.ramar?.ramar ?? []) as { rubrik: string }[]; return r.length === 1 ? r[0].rubrik : UM_NAMN.materialet; };
/** Bladets ankare i Materialet för klassen, ur namnet. */
export const bladetsAnkare = (namn: string) => `blad-${slugAv(namn)}`;

/**
 * Texten som HTML med metodens saker som länkar och hänvisningarna till källorna som länkar till referensbladet (medKallor):
 * en rot för varje text på metodens sida. Böckerna och verktygen länkar Boklankar.astro runt sidan.
 */
export function medSaker(text: string, saker: MetodSak[], kallor: Set<string>, sidor: { titel: string; href: string }[] = []): string {
  return sakernasText(String(text ?? ''), saker, (s, t) => `<a href="${esc(s.adress)}" class="um-sak">${esc(t)}</a>`, (t) => medKallor(t, kallor, sidor));
}
/**
 * Ett utfalls text som HTML: metodens saker som länkar, som i medSaker, och talen för klassens storlek i resten (utfallensTal),
 * så att "Skriv frågan i grovplaneringen" leder till grovplaneringen (granskningen av Testbaserat lärande 2026-11-02).
 */
export function utfalletsText(text: string, n: number, saker: MetodSak[]): string {
  return sakernasText(String(text ?? ''), saker, (s, t) => `<a href="${esc(s.adress)}" class="um-sak">${esc(t)}</a>`, (t) => utfallensTal(t, n));
}

/** Utfallets gräns i en klass med n elever, ur utfallensGranser i standarden, med vad talen räknar (utfallsord): "Högst 5 av 28 med fel." */
export function utfalletsGrans(id: 'nastanAlla' | 'deFlesta' | 'halften', n: number, ord = 'med fel'): string {
  const g = utfallensGranser(n);
  return id === 'nastanAlla' ? `Högst ${g.nastanAlla} av ${n} ${ord}.` : id === 'deFlesta' ? `${g.deFlesta[0]}–${g.deFlesta[1]} av ${n} ${ord}.` : `${g.halften} eller fler av ${n} ${ord}.`;
}
/** Regeln bakom gränserna, i ord, som utfallensGranser räknar (standarden, avsnitt 7), med vad metodens tal räknar (utfallsord). */
export const utfallensRegel = (ord = 'med fel') => (ord === 'med fel'
  ? 'Nästan alla kan när högst en av fem har fel, avrundat nedåt. Hälften eller färre kan när hälften eller fler har fel, avrundat uppåt.'
  : `Nästan alla kan när högst en av fem är ${ord.replace(/^elever /, '')}, avrundat nedåt. Hälften eller färre kan när hälften eller fler är det, avrundat uppåt.`);
/** Klassens antal som utfallen i metodens text räknar med: talet efter "av" i den första gränsen, annars 28. */
export const utfallensElever = (redo?: Record<string, string>) => Number(String(redo?.nastanAlla ?? '').match(/\bav (\d+)/)?.[1] ?? 28);
/**
 * Utfallets text som HTML, där gränserna för klassens antal står som tal som sidans skript räknar om när läraren skriver
 * ett annat antal elever (granskare-3 nr 2): "Högst 5 av 28", "6–13 av 28", "14 eller fler av 28", "14 eller fler" och
 * "fler än 5 av 28" ur texten blir element med standardens tal, och klassens antal efter "av" också i Hälften eller färre
 * (lagningen inför lanseringen, F2: "13 eller fler av 28" stod kvar med 25 elever). Talen räknas av utfallensGranser, i
 * skriptet också. En metod som också säger paren, "alltså högst två par", får dem räknade på samma sätt (utfallensPar).
 */
export function utfallensTal(text: string, n: number): string {
  const g = utfallensGranser(n);
  const p = utfallensPar(n);
  const tal = (nyckel: string, v: number) => `<span data-grans="${nyckel}">${v}</span>`;
  const par = (nyckel: string, v: number) => `<span data-par="${nyckel}">${talText(v)}</span>`;
  const av = `<span data-elever>${n}</span>`;
  return esc(String(text ?? ''))
    .replace(new RegExp(`\\bhögst ${talText(p.nastanAlla)} par\\b`, 'g'), `högst ${par('nastanAlla', p.nastanAlla)} par`)
    .replace(new RegExp(`\\b${talText(p.deFlesta[0])} till ${talText(p.deFlesta[1])} par\\b`, 'g'), `${par('deFlesta0', p.deFlesta[0])} till ${par('deFlesta1', p.deFlesta[1])} par`)
    .replace(new RegExp(`\\b${talText(p.halften)} par eller fler\\b`, 'g'), `${par('halften', p.halften)} par eller fler`)
    .replace(new RegExp(`\\b${g.deFlesta[0]}–⁠?${g.deFlesta[1]} av ${n}\\b`, 'g'), `${tal('deFlesta0', g.deFlesta[0])}–${tal('deFlesta1', g.deFlesta[1])} av ${av}`)
    .replace(new RegExp(`\\b${g.nastanAlla} av ${n}\\b`, 'g'), `${tal('nastanAlla', g.nastanAlla)} av ${av}`)
    .replace(new RegExp(`(^|[^–\\d])${g.halften} eller fler( av ${n})?\\b`, 'g'), (_m, fore: string, avN?: string) => `${fore}${tal('halften', g.halften)} eller fler${avN ? ` av ${av}` : ''}`);
}

/**
 * Spalterna på dator för en rad kort, som kärnans kort och exemplets rad med kärnan: lika många som korten när de är fem
 * eller färre, och annars så få rader som möjligt med högst fem i varje (lagningen inför lanseringen, D2: Kärnans fem stod
 * fyra och ett).
 */
export const kortensKolumner = (n: number) => (n <= 5 ? Math.max(1, n) : Math.ceil(n / Math.ceil(n / 5)));

/** Huvudexemplets ämne i ord, som delarnas text säger det ("i matematik"). */
const AMNEN: Record<string, string> = { lasning: 'läsning', skrivning: 'skrivning', matematik: 'matematik', 'so-no': 'SO och NO', 'praktisk-estetiska': 'ett praktiskt-estetiskt ämne' };
export const AMNESNAMN: Record<string, string> = { lasning: 'Läsning', skrivning: 'Skrivning', matematik: 'Matematik', 'so-no': 'SO och NO', 'praktisk-estetiska': 'Praktisk-estetiska ämnen' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exempletsAmne = (e: Record<string, any>): string => e.amnesnamn ?? AMNESNAMN[e.amne] ?? e.amne;
/** Ämnet på ett ifyllt blad: planens eget, som första lektionen i Formativ bedömning, som är samhällskunskap där huvudexemplet är matematik, annars exemplets. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const planensAmne = (plan: Record<string, any> | undefined, e?: Record<string, any>): string | undefined => (plan?.amne ? AMNESNAMN[plan.amne] ?? plan.amne : e ? exempletsAmne(e) : undefined);

/** Delarna med metodens rad och övergångsmening. */
export function metodensDelar(d: Um) {
  const minuter = tidensMatt(d.tid).minuter;
  const veckor = periodensLangd(d.period)?.min;
  const huvud = (d.amnesexempel ?? []).find((e: { huvud?: boolean }) => e.huvud);
  const andra = (d.amnesexempel ?? []).filter((e: { huvud?: boolean }) => !e.huvud).length;
  return delarnaAv(d).map((del) => ({ ...del, ...delarnasText(del, { minuter, veckor, amne: huvud ? (huvud.amnesnamn?.toLocaleLowerCase('sv') ?? AMNEN[huvud.amne]) : undefined, andra, progression: d.progression?.text }) }));
}

/** En hänvisnings nyckel som riggens id för källan: å och ä som a, ö som o, é som e, m.fl. som m-fl, och året sist. */
export const kallansId = (namn: string, ar: string) => `${namn} ${ar}`.toLocaleLowerCase('sv').replace(/m\.fl\./g, 'm-fl').replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Texten som HTML där varje hänvisning (Författare, årtal) i en parentes leder till sin post i referensbladet (riggens
 * förslag 2026-10-29). En hänvisning som inte är en källa i metoden står som text.
 */
export function medKallor(text: string, kallor: Set<string>, sidor: { titel: string; href: string }[] = []): string {
  let t = esc(String(text ?? ''));
  // En metod som sajten har, som De fyra räknesätten i grupp eller explicit undervisning, är en länk dit (STIL.md under
  // Hänvisningar), också med liten bokstav först inne i en mening. En metod som står i två listor, som relaterade och
  // passar.metoder, länkas en gång.
  for (const s of new Map(sidor.map((x) => [x.href, x])).values()) {
    const m = t.match(new RegExp(`(^|[^\\p{L}])(${[esc(s.titel), esc(liten(s.titel))].map(skyddaRegex).join('|')})(?!\\p{L})`, 'u'));
    if (m) t = `${t.slice(0, m.index! + m[1].length)}<a href="${s.href}">${m[2]}</a>${t.slice(m.index! + m[0].length)}`;
  }
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
  klass: 'Klass', amne: 'Ämne', datum: 'Datum', lektion: 'Lektion i arbetsområdet', mal: 'När lektionen är slut ska eleverna kunna', belagg: 'Så ser jag att de kan',
  fore: 'Före lektionen', forberett: 'Förberett', blad: 'Blad och facit', stod: 'Stöd, till vem', lektionen: 'Lektionen', minuterna: 'minuterna i', karnan: 'kärnan',
  beslutet: 'Beslutet', elever: 'elever i dag:', efter: 'Efter lektionen', karnanIlektionen: 'Kärnan i lektionen',
} as const;
/** Bladets ord för en metod: zonen och beslutet heter efter metodens slag (slagensOrd i standarden), som i riggens Word-fil. */
export const bladetsOrd = (d: Um) => { const o = slagensOrd(d); return { ...BLADETS_ORD, lektionen: o.zon, beslutet: o.bladetsBeslut }; };
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
  // En del som varianten inte har får ingen tid: första lektionen i Formativ bedömning har ingen Start och ingen Exit-lapp.
  const delensTid = (fas: string): string | undefined => (varianten?.delar ? varianten.delar.find((x: { fas: string }) => x.fas === fas)?.tid : tidsschematsRad(d, fas)?.tid);
  // Beslutet står efter den del där läraren ser om klassen är redo, stegets redo: Kontrollera i explicit undervisning och
  // Var och en visar i kooperativt lärande.
  const kontrollen = (d.steg?.rader ?? []).find((s: { redo?: unknown }) => s.redo);
  const beslutetsFas: string | undefined = kontrollen?.namn;
  const utfalletsText = (id: string) => String(kontrollen?.redo?.[id] ?? '').replace(/^[^.]*\.\s*/, '');
  const delarna = (mall.delar ?? []) as { fas: string; skriv?: string; not?: string }[];
  const planensDel = (fas: string) => bladetsRad((plan.delar ?? []).find((x: { fas: string }) => x.fas === fas)?.text as string | undefined);
  const kryss = new Set<number>(plan.efter?.kryss ?? []);
  const etikett = (falt: string, forval: string, kolon = false) => { const t = String(mall.efter?.[falt] ?? forval).replace(/[:_\s]+$/, '').replace(/:\s*_+.*$/, '').split(/\s{2,}/)[0]; return kolon ? t.split(':')[0] : t; };
  // Lektionen som variantens minuter gäller, i en mening: första lektionen, och i en metod med strukturer den första hela
  // lektionen (forstaLektionensForm i standarden, K-645).
  const variantensNamn: string | undefined = varianten ? (varianten.nar === 'första lektionen' ? liten(forstaLektionensForm(d).namn) : varianten.nar) : undefined;
  // Kärnans nummer vid en del, uppräknade med komma och och: "kärnan 1, 2, 4 och 5" (riggens punkt 8).
  const karnansNr = (fas: string) => { const k = karnanI(d, fas); return k.length ? `${BLADETS_ORD.karnan} ${uppraknat(k.map((x: { nr: number }) => String(x.nr)))}` : ''; };
  return { mall, varianten, variantensNamn, delensTid, utfalletsText, utfallensOrd: utfallsord(kontrollen?.redo), delarna, planensDel, kryss, etikett, beslutetsFas, karnansNr };
}
