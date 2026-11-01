// Det sajten väver in i en metod (Niclas 2026-11-01: "De kan vävas in på sajten och behövs inte i själva docx för
// metoden", "Med en standard och en rot är det som en placeholder att bara med en kodsnutt läggs in" och "Det är lite så
// jag tänker man ska sådda med verktyg när nya kommer"): ett verktyg sås i en metod på metodens sida, utan att metodens fil,
// Word-filen eller utskriften ändras. Roten är två register. src/data/centrala.json har verktygets standard i fältet vav:
// rutans text och kortradens rad. src/data/sadd.json har sådden, metodens ja med platserna: var, med filmernas ord för
// platsen (src/lib/film.ts), formen och de delar av verktyget som står där, som strukturerna. Filmruta.astro ritar det på
// platsen med Vavruta.astro, bland filmerna och bilderna På bordet, så att varje plats i en metod går att använda utan ny
// kod. Ett nytt verktyg är en rad i registren, och ett verktyg med namngivna delar också en rad i DELAR nedan.
//
// Två former (METODER.md under Sådden): kortraden, där metoden nämner en del av verktyget, med delarnas små kort och en rad
// till verktyget; och rutan, där eleverna arbetar med verktygets delar i passets kärna, med texten, korten och verktygets
// knapp. Står verktygets knapp redan på platsen (fältet centrala), står den inte en gång till, och inte heller kortradens rad.
import register from '../data/sadd.json';
import { CENTRALA, tolkaTextplats, type Central } from './centrala';
import { passar, sammaRubrik, tolkaEfter, type FilmPlats } from './film';
import { bildensAdress, slagensStil, strukturensAdress, strukturernaAv } from './strukturer';

export const VAVFORMER = ['kort', 'ruta'] as const;
type Form = (typeof VAVFORMER)[number];
/** En plats i registret: efter är platsen, form kortraden eller rutan, delar id:n på verktygets delar. */
type Rad = { efter: string; form?: Form; delar?: string[] };
type Ja = { skal: string; vav?: Rad[] };
/** En del av verktyget som ett litet kort: bilden och namnet leder till delens sida. */
export type Del = { id: string; namn: string; andra: string[]; rad: string; adress: string; bild: string; stil?: string };
/** Det som ritas på en plats: verktyget, metoden, formen, delarna, om metoden nämner någon av dem och om verktygets knapp
 *  redan står där. */
export type Vav = { vav: Central; metod: string; form: Form; delar: Del[]; namngivna: boolean; knappenFinns: boolean };

// Var delarna av ett verktyg står: namnet, raden under och sidan. Strukturerna läses ur src/content/strukturer/.
const DELAR: Record<string, (ids: string[], vem: string) => Del[]> = {
  strukturer: (ids, vem) => strukturernaAv(ids, vem).map((s) => ({ id: s.id, namn: s.namn, andra: s.andra, rad: s.syfte, adress: strukturensAdress(s.id), bild: bildensAdress(s.id), stil: slagensStil(s.slag) })),
};

const saker = (register as unknown as { saker: Record<string, { ja?: Record<string, string | Ja> }> }).saker;
/** De verktyg som vävs in: en post i centrala.json med fältet vav. */
const vavda = () => CENTRALA.filter((c) => c.vav);
const raderFor = (metod: string, c: Central): Rad[] => { const ja = saker[c.id]?.ja?.[metod]; return typeof ja === 'object' ? ja.vav ?? [] : []; };

type MetodForVav = { centrala?: { id: string; efterText: string }[] };
/** Det som vävs in på platsen i metoden, i registrets ordning. */
export function vavtVid(metod: string, d: MetodForVav, plats: FilmPlats): Vav[] {
  return vavda().flatMap((c) => raderFor(metod, c).filter((r) => { const v = tolkaEfter(r.efter); return v && passar(v, plats); }).map((r) => {
    const delar = DELAR[c.id]?.(r.delar ?? [], `src/data/sadd.json, ${c.id}, ${metod}`) ?? [];
    return {
    vav: c,
    metod,
    form: r.form ?? 'kort',
    delar,
    // Nämner metoden ingen av delarna, arbetar eleverna i samma form utan att metoden säger det, och etiketten säger det.
    namngivna: !delar.length || delar.some((x) => [x.namn, ...x.andra].some((n) => namnetI(n, d))),
    // Knappen står redan på platsen när metoden visar verktyget där med fältet centrala (src/lib/centrala.ts).
    knappenFinns: (d.centrala ?? []).some((x) => { if (x.id !== c.id) return false; const t = tolkaTextplats(x.efterText); const v = tolkaEfter(r.efter); return !!t && !!v && passar(v, t); }),
    };
  }));
}
// Namnet i metodens text, som såddprovet läser det (scripts/saddprov.mjs): med stor bokstav, också utan utropstecknet i ett
// namn med flera ord och med "och" i stället för tankstrecket.
const metodensText = new WeakMap<object, string>();
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function namnetI(namn: string, d: object): boolean {
  if (!metodensText.has(d)) metodensText.set(d, JSON.stringify(d));
  const text = metodensText.get(d)!;
  const varianter = [namn, ...(namn.includes(' ') ? [namn.replace(/[!?]$/, '')] : []), namn.replace(/\s*–\s*/g, ' och ')];
  return varianter.some((n) => n.length >= 3 && new RegExp(`(^|[^\\p{L}])${esc(n)}(?![\\p{L}])`, 'u').test(text));
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
        if ((r.form ?? 'kort') === 'kort' && !r.delar?.length) fel.push(`${vem}, plats ${i + 1}: kortraden visar delarna som metoden nämner och behöver minst en.`);
        if (r.delar?.length && !DELAR[c.id]) fel.push(`${vem}, plats ${i + 1}: ${c.id} har inga delar att visa (DELAR i src/lib/vav.ts).`);
        else if (r.delar?.length) try { DELAR[c.id](r.delar, vem); } catch (e) { fel.push((e as Error).message); }
      });
    }
  }
  if (fel.length) throw new Error(`Det som vävs in i metoderna:\n  ${fel.join('\n  ')}`);
}
