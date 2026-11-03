// Det sajten väver in i en metod (Niclas 2026-11-01: "De kan vävas in på sajten och behövs inte i själva docx för
// metoden", "Med en standard och en rot är det som en placeholder att bara med en kodsnutt läggs in" och "Det är lite så
// jag tänker man ska sådda med verktyg när nya kommer"): ett verktyg sås i en metod på metodens sida, utan att metodens fil
// ändras, och i Word-filen och pdf:en bara när metoden har verktygets knapp i början (vavIWord nedan). Roten är två register. src/data/centrala.json har verktygets standard i fältet vav:
// rutans text och kortradens rad. src/data/sadd.json har sådden, metodens ja med platserna: var, med filmernas ord för
// platsen (src/lib/film.ts), formen och de delar av verktyget som står där, som strukturerna. Filmruta.astro ritar det på
// platsen med Vavruta.astro, bland filmerna och bilderna På bordet, så att varje plats i en metod går att använda utan ny
// kod. Ett nytt verktyg är en rad i registren, och ett verktyg med namngivna delar också en rad i DELAR nedan.
//
// Två former (METODER.md under Sådden): kortraden, där metoden nämner en del av verktyget, med delarnas små kort och en rad
// till verktyget; och rutan, där eleverna arbetar med verktygets delar i passets kärna, med texten, korten och verktygets
// knapp. Står verktygets knapp redan på platsen (fältet centrala), står den inte en gång till, och inte heller kortradens rad.
import register from '../data/sadd.json';
import { CENTRALA, lasbarAdress, tolkaTextplats, type Central } from './centrala';
import { passar, sammaRubrik, tolkaEfter, type FilmPlats } from './film';
import { bildensAdress, slagensStil, strukturensAdress, strukturernaAv } from './strukturer';
import { strategiernaAv, strategiensAdress, strategiernasStil } from './strategier';
import { strukturnamnetI } from './standard/index.js';

export const VAVFORMER = ['kort', 'ruta'] as const;
type Form = (typeof VAVFORMER)[number];
/** Hur en del hör till metoden när metoden inte nämner den: eleverna gör redan dess steg (form), eller den passar till
 *  delen av passet (forslag, Niclas 2026-11-01: "Egentligen bör alla ha minst en sådd av strukturer"). */
export const VAVSLAG = ['form', 'forslag'] as const;
type Slag = (typeof VAVSLAG)[number];
/** En plats i registret: efter är platsen, form kortraden eller rutan, delar id:n på verktygets delar, och om den del av
 *  passet som har delens form, när metoden inte nämner delen (Berättaren och Skrivaren i Skrivkurs: sagoboken). */
type Rad = { efter: string; form?: Form; delar?: string[]; om?: string; slag?: Slag };
type Ja = { skal: string; vav?: Rad[] };
/** En del av verktyget som ett litet kort: bilden och namnet leder till delens sida. */
export type Del = { id: string; namn: string; andra: string[]; rad: string; adress: string; bild?: { src: string; bredd: number; hojd: number }; bilder?: (string | null)[]; nr?: number; stil?: string };
/** Det som ritas på en plats: verktyget, metoden, formen, delarna, om metoden nämner någon av dem och om verktygets knapp
 *  redan står där. */
export type Vav = { vav: Central; metod: string; form: Form; delar: Del[]; namngivna: boolean; om?: string; slag: Slag; knappenFinns: boolean };

// Var delarna av ett verktyg står: namnet, raden under och sidan. Strukturerna läses ur src/content/strukturer/, och
// strategierna (K-702) ur src/content/strategier/, med berättelsens tre bilder och numret, som på /strategier.
const DELAR: Record<string, (ids: string[], vem: string) => Del[]> = {
  strukturer: (ids, vem) => strukturernaAv(ids, vem).map((s) => ({ id: s.id, namn: s.namn, andra: s.andra, rad: s.syfte, adress: strukturensAdress(s.id), bild: { src: bildensAdress(s.id), bredd: 900, hojd: 560 }, stil: slagensStil(s.slag) })),
  strategier: (ids, vem) => strategiernaAv(ids, vem).map((s) => ({ id: s.id, namn: s.namn, andra: [], rad: s.mening, adress: strategiensAdress(s.id), bilder: s.bilder, nr: s.nr, stil: strategiernasStil })),
};

const saker = (register as unknown as { saker: Record<string, { ja?: Record<string, string | Ja> }> }).saker;
/** De verktyg som vävs in: en post i centrala.json med fältet vav. */
const vavda = () => CENTRALA.filter((c) => c.vav);
const raderFor = (metod: string, c: Central): Rad[] => { const ja = saker[c.id]?.ja?.[metod]; return typeof ja === 'object' ? ja.vav ?? [] : []; };

type MetodForVav = { centrala?: { id: string; efterText: string }[] };
function vavAv(metod: string, d: MetodForVav, c: Central, r: Rad): Vav {
  const delar = DELAR[c.id]?.(r.delar ?? [], `src/data/sadd.json, ${c.id}, ${metod}`) ?? [];
  return {
    vav: c,
    metod,
    form: r.form ?? 'kort',
    delar,
    // Nämner metoden ingen av delarna, arbetar eleverna i samma form utan att metoden säger det, och etiketten säger det.
    namngivna: !delar.length || delar.some((x) => [x.namn, ...x.andra].some((n) => namnetI(n, d, c.id === 'strategier'))),
    om: r.om,
    slag: r.slag ?? 'form',
    // Knappen står redan på platsen när metoden visar verktyget där med fältet centrala (src/lib/centrala.ts).
    knappenFinns: (d.centrala ?? []).some((x) => { if (x.id !== c.id) return false; const t = tolkaTextplats(x.efterText); const v = tolkaEfter(r.efter); return !!t && !!v && passar(v, t); }),
  };
}
/**
 * Det som vävs in i en metod i Metoder (K-702; Niclas 2026-11-03: "Du får ju sådda även denna med små bilder på strategierna
 * på rätt ställe från verktyget"): metoderna där har inga filmplatser, så platsen är sidans egen form, som filmerna i Metoder
 * anger den (steg N för lektionens del N, karna: <komponent>, tabell: <rubrik> och arbetsomradet), och rutan är densamma som
 * i Stödundervisning (Vavruta.astro). Platserna står i sajtens register, src/data/strategier-i-metoder.json.
 */
export function vavtIMetoder(metod: string, d: object, verktyg: string, rader: Rad[]): (Vav & { efter: string })[] {
  const c = vavda().find((x) => x.id === verktyg);
  return c ? rader.map((r) => ({ ...vavAv(metod, d as MetodForVav, c, r), efter: r.efter })) : [];
}

/** Det som vävs in på platsen i metoden, i registrets ordning. */
export function vavtVid(metod: string, d: MetodForVav, plats: FilmPlats): Vav[] {
  return vavda().flatMap((c) => raderFor(metod, c).filter((r) => { const v = tolkaEfter(r.efter); return v && passar(v, plats); }).map((r) => vavAv(metod, d, c, r)));
}
/** Etiketten över det som vävs in, på sidan och i Word: den säger om metoden nämner delen, om eleverna arbetar i samma form
 *  (Skrivkurs: sagoboken och Kloka pennan) eller om delen passar till den delen av passet. Word har etiketten och namnen på
 *  samma rad, med ett komma efter delen av passet. */
export function vavensEtikett(v: Vav, efterOm = ': '): string {
  const s = v.vav.vav!;
  const fler = v.delar.length > 1;
  const hur = v.slag === 'forslag' ? (fler ? s.passarFler : s.passar) : (fler ? s.liknarFler : s.liknar);
  return v.namngivna ? s.etikett : v.om ? `${v.om}${efterOm}${hur.charAt(0).toLowerCase()}${hur.slice(1)}` : hur;
}
// Namnet i metodens text, med standardens regel, som såddprovet också läser namnen med (scripts/saddprov.mjs). En strategis
// namn är ett verb, och först i en mening eller i ett av metodens fält är det verbet och inte strategin, som "Blanda
// uppgifter med och utan växling" i Fyra räknesätten (andra ögat på Strategier 2026-11-03; sakdelar i standarden har samma
// regel). JSON har varje fält inom citattecken och radbrytningen som \n.
const metodensText = new WeakMap<object, string>();
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function namnetI(namn: string, d: object, inteForst = false): boolean {
  if (!metodensText.has(d)) metodensText.set(d, JSON.stringify(d));
  const text = metodensText.get(d)!;
  if (!inteForst) return strukturnamnetI(namn, text);
  return [...text.matchAll(new RegExp(`(^|[^\\p{L}])${esc(namn)}(?![\\p{L}])`, 'gu'))].some((m) => !/(^|[.!?:]\s*|\\n\s*|"\s*)$/.test(text.slice(0, m.index + m[1].length)));
}

/** Hur många delar ett verktyg är invävt med innan det också står i början av metodens sida, under ingressen och i menyn,
 *  som metodens egna verktyg (Niclas 2026-11-01: "De som har fler än 2 såddningar i sig kan ha kortet också i början"). */
export const I_BORJAN_FRAN = 3;
/** Verktygen som står i början av metodens sida för att de är invävda med många delar, och som metoden inte redan visar med
 *  fältet centrala. */
const medManga = (metod: string, c: Central) => new Set(raderFor(metod, c).flatMap((r) => r.delar ?? [])).size >= I_BORJAN_FRAN;
const visarSjalv = (d: MetodForVav, c: Central) => (d.centrala ?? []).some((x) => x.id === c.id);
export const vavdaIBorjan = (metod: string, d: MetodForVav): Central[] => vavda().filter((c) => !visarSjalv(d, c) && medManga(metod, c));

/** Det Word-filen har på en plats. Följer med i src/lib/metodresurser.ts och i metoder.json, eftersom metoddocx.ts också körs i
 *  webbläsaren, som inte läser delarnas filer. */
export type VavIWord = { vid: FilmPlats; etikett: string; text?: string; delar: { namn: string; adress: string }[]; verktyg: { namn: string; adress: string }; knappenFinns: boolean };
const iWord = new WeakMap<object, VavIWord[]>();
/** Knappen i början är gränsen (Niclas 2026-11-01: "Att det är spärren mellan sida bara och sådd även i pdf/docx"): en metod
 *  som har verktygets knapp i början har sådden också i Word-filen och därmed i pdf:en, och andra metoder bara på sidan. */
export function vavIWord(metod: string, d: MetodForVav): VavIWord[] {
  if (!iWord.has(d)) iWord.set(d, vavda().filter((c) => visarSjalv(d, c) || medManga(metod, c)).flatMap((c) => raderFor(metod, c).map((r) => {
    const v = vavAv(metod, d, c, r);
    return { vid: tolkaEfter(r.efter)!, etikett: vavensEtikett(v, ', '), text: v.form === 'ruta' ? c.vav!.text : undefined, delar: v.delar.map((x) => ({ namn: x.namn, adress: x.adress })), verktyg: { namn: c.namn, adress: lasbarAdress(c) }, knappenFinns: v.knappenFinns };
  })));
  return iWord.get(d)!;
}

type MetodForPlats = MetodForVav & { inledning?: string[]; tabeller?: { rubrik: string }[]; ramar?: { ramar: { rubrik: string }[] } } & Record<string, unknown>;
/** Beskedet när platsen inte finns i metoden, annars undefined. */
function platsFel(d: MetodForPlats, p: FilmPlats): string | undefined {
  if ('stycke' in p) return (d.inledning?.length ?? 0) >= p.stycke ? undefined : `Inledningen har ${d.inledning?.length ?? 0} stycken`;
  if ('tabell' in p) return (d.tabeller ?? []).filter((t) => sammaRubrik(t.rubrik, p.tabell)).length === 1 ? undefined : `Ingen fri tabell, eller flera, har rubriken "${p.tabell}"`;
  if ('ram' in p) return (d.ramar?.ramar ?? []).filter((r) => sammaRubrik(r.rubrik, p.ram)).length === 1 ? undefined : `Ingen ram, eller flera, har rubriken "${p.ram}"`;
  if ('avsnitt' in p) return d[p.avsnitt] ? undefined : `Metoden har inget avsnitt ${p.avsnitt}`;
  return 'Platsen är ett steg eller en del; väv in efter en tabell, en ram, ett stycke eller ett avsnitt';
}

/** Registrets fel, som stoppar bygget (src/pages/stodundervisning/[id].astro): ett verktyg som vävs in utan text, en metod
 *  som inte finns, en plats som metoden inte har och en del som inte visas. */
export function provaVav(metoder: { id: string; data: MetodForPlats }[]): void {
  const fel: string[] = [];
  for (const c of CENTRALA) {
    const ja = saker[c.id]?.ja ?? {};
    const vavs = Object.values(ja).some((x) => typeof x === 'object' && x.vav);
    if (vavs && !c.vav) fel.push(`src/data/sadd.json väver in ${c.id}, men src/data/centrala.json har inget fält vav med texten.`);
    for (const [metod, x] of Object.entries(ja)) {
      if (typeof x !== 'object' || !x.vav) continue;
      const vem = `src/data/sadd.json, ${c.id}, ${metod}`;
      const m = metoder.find((y) => y.id === metod);
      if (!m) { fel.push(`${vem}: metoden finns inte bland de publicerade.`); continue; }
      if (!x.vav.length) fel.push(`${vem}: vav har ingen plats.`);
      if (x.vav.filter((r) => r.form === 'ruta').length > 1) fel.push(`${vem}: rutan står en gång i en metod, på platsen där eleverna arbetar med verktyget.`);
      x.vav.forEach((r, i) => {
        const p = tolkaEfter(r.efter ?? '');
        if (!p) { fel.push(`${vem}, plats ${i + 1}: efter är en tabell, en ram, ett stycke eller ett avsnitt, som "tabell: <rubrik>".`); return; }
        const pf = platsFel(m.data, p);
        if (pf) fel.push(`${vem}, plats ${i + 1}: ${pf}.`);
        if (r.form !== undefined && !(VAVFORMER as readonly string[]).includes(r.form)) fel.push(`${vem}, plats ${i + 1}: form är ${VAVFORMER.join(' eller ')}.`);
        if (r.slag !== undefined && !(VAVSLAG as readonly string[]).includes(r.slag)) fel.push(`${vem}, plats ${i + 1}: slag är ${VAVSLAG.join(' eller ')}.`);
        if (r.om !== undefined && (!r.om.trim() || /[.!?]$/.test(r.om))) fel.push(`${vem}, plats ${i + 1}: om är den del av passet som har delens form, några ord utan punkt, som "Berättaren och Skrivaren".`);
        if ((r.form ?? 'kort') === 'kort' && !r.delar?.length) fel.push(`${vem}, plats ${i + 1}: kortraden visar delarna som metoden nämner och behöver minst en.`);
        if (r.delar?.length && !DELAR[c.id]) fel.push(`${vem}, plats ${i + 1}: ${c.id} har inga delar att visa (DELAR i src/lib/vav.ts).`);
        else if (r.delar?.length) try { DELAR[c.id](r.delar, vem); } catch (e) { fel.push((e as Error).message); }
      });
    }
  }
  if (fel.length) throw new Error(`Det som vävs in i metoderna:\n  ${fel.join('\n  ')}`);
}
