// Ta fram ett matteproblems poster: metodens problem och databasens (K-425). Databasens problem står i
// src/content/matteproblem/, en post per problem, som metodriggen gör (out/databas/matteproblem; formen i riggens
// FRAN-SAJTEN, Nytt 2026-10-18 kväll). Ett problem ur databasen är problemets A4 och lösningsförslagets A4 och inget mer
// (Niclas 2026-10-18: "Tänkte mer att det är problemets A4a och dess lösningsförslag. Sedan kan just metoden
// Problemlösning i grupp ha sidor"), och sidan visar det efter metodens tio på nivån, med nummer 11 och uppåt. Problemets
// sida och lösningsförslaget ritas av samma kod som metodens (src/lib/problemform.ts, metoddocx.ts, losningsforslag.ts),
// med rutan Visa och jämför lösningar ur metodens ram och metodens nivåfärger, så att de ser likadana ut.
//
// Sidans filer är en per nivå med alla nivåns problem, metodens och databasens, i numrets ordning: bara problemen
// (matteproblem-<nivå>) och problemen med lösningsförslagen (matteproblem-<nivå>-med-losningsforslag). Varje posts pdf
// klipps ur dem (scripts/pdfdelar.mjs), och kartan i filen säger var posten står: ram är postens plats i filen gånger
// två, och lösningsförslaget ett mer. Metodens egna filer, för metodens sida och problemens sidor, är som förut
// (src/lib/bank.ts). Inga Node-beroenden.
import { bankAv, type Bankenhet } from './bank';
import { metodensPaBordet, type PaBordet } from './pabordet';
import { LOSNINGSRUTA, problemformer, type Losningsforslag } from './problemform';
import type { Lastext } from './ramform';
import type { MetodData } from './metod';
import { slugAv, UPPTAGNA_LED } from './standard/index.js';
import type { Utskrift } from './utskrift';

/** Databasens namn i adresserna: bilderna under /stodundervisning/matteproblem/ och filerna matteproblem-<nivå>. */
export const DATABAS = 'matteproblem';
type Losningsdata = { namn: string; text: string; bild: string };
/** En post i src/content/matteproblem/ (schemat i src/content.config.ts). */
export interface Matteproblemdata {
  niva: string; nr: number; titel: string; innehallstagg: string; kalla?: string;
  problem: { text: string[]; fragor: string[]; bild: string };
  losningsforslag: { svaret: string; kontroll: string; iden: string; a: Losningsdata; b: Losningsdata; c: { rader: string[]; om: string; fraga: string }; fragor: string[] };
}
/** Ett problem på sidan: metodens eller databasens, med texten, bilden och lösningsförslaget som Word och sidan ritar. */
export interface Matteproblem {
  id: string; niva: string; nivaNr: number; nr: number; titel: string; tagg: string;
  l: Lastext; bild: PaBordet; lf: Losningsforslag;
  /** Metodens enhet, när problemet står i metoden. */
  enhet?: Bankenhet;
}

/** En bild ur databasen: problemets, lösning A:s eller lösning B:s. */
export const databasbild = (id: string, vad: 'problem' | 'a' | 'b') => `/stodundervisning/${DATABAS}/${id}-${vad}.svg`;
const bild = (id: string, vad: 'problem' | 'a' | 'b', rubrik: string, text: string): PaBordet =>
  ({ bild: { nr: 0, rubrik, text, efter: `ram: ${rubrik}` }, adress: databasbild(id, vad), matt: { bredd: 960, hojd: 540 } });
// Textalternativet till en lösnings bild börjar med lösningens namn ("Lösning A, rita och byta kulor. Eleven …"), som
// bildens rubrik redan säger.
const utanNamn = (text: string) => text.replace(/^Lösning [AB], [^.]+\.\s*/, '');

type Metod = { id: string; data: MetodData };
/** Alla problem i Ta fram ett matteproblem, nivå för nivå och i numrets ordning: metodens bank och databasens poster.
 *  Stoppar bygget när en post har ett id som kan förväxlas med en sida, ett nummer som redan finns på nivån eller en nivå
 *  som metoden inte har. */
export function matteproblemen(metod: Metod, databas: { id: string; data: Matteproblemdata }[]): Matteproblem[] {
  const d = metod.data;
  const bank = bankAv(d);
  if (!bank) throw new Error(`Matteproblemen: ${d.titel} har ingen bank (src/lib/bank.ts).`);
  const ramar = d.ramar!.ramar;
  const former = problemformer(ramar, metodensPaBordet(d, metod.id));
  const nivaer = bank.nivaer.map((n) => n.namn);
  const rutaRam = ramar.find((r) => LOSNINGSRUTA.test(r.rubrik));
  if (!rutaRam) throw new Error(`Matteproblemen: ${d.titel} saknar ramen "Lösningsförslagen: <rubrik>", vars ruta står på varje lösningsförslag (src/lib/problemform.ts).`);
  const ruta = { rubrik: rutaRam.rubrik.replace(LOSNINGSRUTA, ''), punkter: (rutaRam.delar[0]?.falt ?? []).map((f) => ({ namn: f.rubrik, text: f.text })) };
  const metodens: Matteproblem[] = bank.enheter.filter((e) => e.nr !== undefined).map((e) => {
    const ram = ramar[e.ri];
    const b = former.bild(ram);
    const lf = e.post !== undefined ? former.losningsforslag(ramar[e.post]) : undefined;
    if (!b || !e.l.lastext || !lf) throw new Error(`Matteproblemen: ${ram.rubrik} saknar ${!b ? 'sin bild På bordet' : !lf ? 'sitt lösningsförslag' : 'sin text'} (src/lib/problemform.ts).`);
    return { id: e.slug, niva: e.l.niva, nivaNr: e.l.nivaNr, nr: e.nr!, titel: e.l.titel, tagg: ram.innehallstagg ?? '', l: e.l.lastext, bild: b, lf, enhet: e };
  });
  const databasens: Matteproblem[] = databas.map(({ id, data: p }) => {
    const nivaNr = nivaer.indexOf(p.niva);
    if (nivaNr < 0) throw new Error(`Matteproblemen: ${id} har nivån ${p.niva}, som ${d.titel} inte har (${nivaer.join(', ')}).`);
    if (/^[a-z]+-\d+$/.test(id) || (UPPTAGNA_LED as readonly string[]).includes(id) || id !== slugAv(id)) throw new Error(`Matteproblemen: id "${id}" (filnamnet i src/content/matteproblem/) ska vara ur titeln, med a–z, 0–9 och bindestreck, och aldrig av formen bas-1 eller ett av de upptagna leden (${UPPTAGNA_LED.join(', ')}).`);
    const vad = `problem ${p.nr}`;
    const l: Lastext = { niva: p.niva, nivaNr, vad, titel: p.titel, stycken: p.problem.text, fragor: p.problem.fragor, not: p.kalla ?? '' };
    const pbild = bild(id, 'problem', p.titel, p.problem.bild);
    const x = p.losningsforslag;
    const losning = (k: 'a' | 'b') => { const namn = `Lösning ${k.toUpperCase()}: ${x[k].namn}`; return { namn, text: x[k].text, bild: bild(id, k, namn, utanNamn(x[k].bild)) }; };
    const lf: Losningsforslag = {
      titel: p.titel, niva: p.niva, nivaNr, vad, tagg: p.innehallstagg, kalla: p.kalla ?? '',
      problem: { stycken: p.problem.text, fragor: p.problem.fragor, bild: pbild },
      svaret: x.svaret, kontroll: x.kontroll, iden: x.iden, losningar: [losning('a'), losning('b')],
      c: { namn: 'Lösning C: tankevurpa', rader: x.c.rader, larare: [x.c.om, `Fråga: ”${x.c.fraga}”`] },
      fragor: x.fragor, ruta,
    };
    return { id, niva: p.niva, nivaNr, nr: p.nr, titel: p.titel, tagg: p.innehallstagg, l, bild: pbild, lf };
  });
  const alla = [...metodens, ...databasens].sort((a, b) => a.nivaNr - b.nivaNr || a.nr - b.nr);
  for (let i = 1; i < alla.length; i++) if (alla[i].nivaNr === alla[i - 1].nivaNr && alla[i].nr === alla[i - 1].nr) throw new Error(`Matteproblemen: ${alla[i - 1].titel} och ${alla[i].titel} har båda nummer ${alla[i].nr} på nivån ${alla[i].niva}.`);
  const ids = new Set<string>();
  for (const p of alla) { if (ids.has(p.id)) throw new Error(`Matteproblemen: två problem har id ${p.id}.`); ids.add(p.id); }
  return alla;
}

/** Sidans filer: en per nivå, bara problemen eller med lösningsförslagen. */
export interface Matteproblemfil { namn: string; niva: string; med: boolean; rubrik: string; poster: Matteproblem[] }
export function matteproblemfiler(alla: Matteproblem[]): Matteproblemfil[] {
  const nivaer = [...new Set(alla.map((p) => p.niva))];
  return nivaer.flatMap((niva) => {
    const poster = alla.filter((p) => p.niva === niva);
    const bas = `${DATABAS}-${slugAv(niva)}`;
    return [
      { namn: bas, niva, med: false, rubrik: `${niva}: problemen`, poster },
      { namn: `${bas}-med-losningsforslag`, niva, med: true, rubrik: `${niva}: problemen med lösningsförslagen`, poster },
    ];
  });
}

/** En posts två utskrifter ur nivåns filer: problemet, och problemet med lösningsförslaget. */
export function matteproblemetsUtskrifter(alla: Matteproblem[], p: Matteproblem): { post: Utskrift; med: Utskrift } {
  const filer = matteproblemfiler(alla).filter((f) => f.niva === p.niva);
  const [bara, med] = [filer.find((f) => !f.med)!, filer.find((f) => f.med)!];
  const i = bara.poster.indexOf(p);
  const titel = `Matteproblem: ${p.niva}, problem ${p.nr}, ${p.titel}`;
  return {
    post: { namn: `${DATABAS}-${p.id}`, titel, delar: [{ pdf: bara.namn, ram: 2 * i }] },
    med: { namn: `${DATABAS}-${p.id}-med-losningsforslag`, titel: `${titel}, med lösningsförslaget`, delar: [{ pdf: med.namn, ram: 2 * i }, { pdf: med.namn, ram: 2 * i + 1 }] },
  };
}

/** Alla posters utskrifter, för scripts/pdfdelar.mjs (src/pages/stodundervisning/utskrifter.json.ts). */
export const matteproblemensUtskrifter = (alla: Matteproblem[]): Utskrift[] => alla.flatMap((p) => { const u = matteproblemetsUtskrifter(alla, p); return [u.post, u.med]; });
