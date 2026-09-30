// Filmerna ur metodriggen (Niclas 2026-09-30). Varje metod har en huvudfilm (fältet film), som står direkt efter
// faktarutan, och högst två extrafilmer (fältet filmer, riggens format), som står vid momentet de förklarar (fältet
// efter): sist i ett avsnitt, efter en fri tabell eller en ram, efter ett steg eller efter ett stycke i inledningen.
// Varje film har fyra stillbilder. Sidan visar filmen, och utskriften och Word-filen visar stillbilderna, på samma plats
// och ur samma fält: Filmruta.astro ritar filmen och utskriftens stillbilder tillsammans, och metoddocx.ts frågar
// filmerVid på samma platser som Metod.astro. scripts/paritet.mjs prövar att varje film står på samma plats i Word och i
// utskriften.
//
// Filerna ligger i public/stodundervisning/ och hittas genom metodens id, som <id>-mallar.docx: huvudfilmen är
// <id>-film.svg, 960 × 540, med stillbilderna <id>-film-1.svg … -4.svg, 960 × 500, och extrafilm nr 2 och 3
// <id>-film2.svg och <id>-film3.svg med <id>-film2-1.svg … -4.svg. Filmen är en svg med CSS-animation som loopar; den
// visas som <img>, eftersom dess CSS har globala regler (g, korta id och @keyframes) som skulle gälla hela sidan om
// svg-filen stod i sidans HTML. Paus (WCAG 2.2.2) byter filmen mot stillbild 1. Med minskad rörelse står filmen still
// av sig själv. Samma modul används av sidan, Word-filerna (metoddocx.ts), bilderna till Word (ljudkort.ts,
// metodensBilder) och schemat (content.config.ts). Inga Node-beroenden, så att den också kan köras i webbläsaren.
import type { MetodData } from './metod';

// Fälten som alla filmer har; platsen (efter) hör bara till extrafilmerna.
export type Film = Omit<NonNullable<MetodData['film']>, 'efter' | 'efterStycke'>;
/** En film på metodens sida, i utskriften och i Word: fältet, filernas adress utan ändelse och platsen. */
export interface MetodFilm { film: Film; bas: string; vid?: FilmPlats; huvud: boolean; nr: number }

// Filmens mått, för sidans img och Word-filens bilder.
export const FILM_MATT = { bredd: 960, hojd: 540 };
export const STILLBILD_MATT = { bredd: 960, hojd: 500 };
export const HOGST_EXTRAFILMER = 2;

export const filmAdress = (f: MetodFilm) => `${f.bas}.svg`;
export const stillbilder = (f: MetodFilm) => [1, 2, 3, 4].map((nr) => `${f.bas}-${nr}.svg`);
/** Filmens namn under filmen: titeln, eller rubriken över stillbilderna ("Så gör eleven"). */
export const filmNamn = (f: MetodFilm) => f.film.titel ?? f.film.rubrik;

// Platserna, med samma ord i sidan (Metod.astro), Word-filen (metoddocx.ts) och schemat. Riggens efter är ett avsnitt
// eller "tabell: <rubrik>"; sajten tar också "ram: <rubrik>", "steg N" och "stycke N". En fri tabell och en ram hittas
// genom sin rubrik, hela eller ledet före kolon ("Ljudstarten" för "Ljudstarten: samma start varje pass").
export const FILMAVSNITT = ['passrutin', 'tidsschema', 'steg', 'arbetsform', 'exempel', 'fastnar', 'roll', 'urval', 'hem', 'progression', 'uppfoljning', 'mal', 'snabbmall', 'checklista', 'grund', 'ramar'] as const;
export type FilmPlats = { stycke: number } | { steg: number } | { tabell: string } | { ram: string } | { avsnitt: (typeof FILMAVSNITT)[number] };
export const EFTER_FORMER = `ett avsnitt (${FILMAVSNITT.join(', ')}), "tabell: <rubrik>", "ram: <rubrik>", "steg <N>" eller "stycke <N>", med N från 1`;
/** Tolkar fältet efter; undefined när texten inte är en plats. */
export function tolkaEfter(efter: string): FilmPlats | undefined {
  const t = efter.trim();
  const rubrik = t.match(/^(tabell|ram):\s*(.+)$/);
  if (rubrik) return rubrik[1] === 'tabell' ? { tabell: rubrik[2].trim() } : { ram: rubrik[2].trim() };
  const tal = t.match(/^(steg|stycke)\s+([1-9]\d*)$/);
  if (tal) return tal[1] === 'steg' ? { steg: Number(tal[2]) } : { stycke: Number(tal[2]) };
  return (FILMAVSNITT as readonly string[]).includes(t) ? { avsnitt: t as (typeof FILMAVSNITT)[number] } : undefined;
}
export const sammaRubrik = (rubrik: string, namn: string) => rubrik === namn || rubrik.split(':')[0].trim() === namn;
/** Beskedet när platsen inte finns i metoden, annars undefined. Schemat och scripts/filmpaket.mjs använder samma regler. */
type MetodForPlats = { inledning?: string[]; steg?: { rader: unknown[] }; tabeller?: { rubrik: string }[]; ramar?: { ramar: { rubrik: string }[] } };
export function platsFel(d: MetodForPlats, v: FilmPlats): string | undefined {
  if ('stycke' in v) { const n = d.inledning?.length ?? 0; return v.stycke > n ? `Inledningen har ${n} stycken; filmen kan inte stå efter stycke ${v.stycke}` : undefined; }
  if ('steg' in v) { const n = d.steg?.rader.length ?? 0; return v.steg > n ? `Metoden har ${n} steg; filmen kan inte stå efter steg ${v.steg}` : undefined; }
  if ('tabell' in v) {
    const alla = d.tabeller ?? [];
    const antal = alla.filter((t) => sammaRubrik(t.rubrik, v.tabell)).length;
    return antal === 1 ? undefined : `${antal ? 'Flera' : 'Ingen'} fri tabell har rubriken "${v.tabell}" (hela rubriken eller ledet före kolon): ${alla.map((t) => t.rubrik).join(' | ') || 'metoden har inga fria tabeller'}`;
  }
  if ('ram' in v) {
    const antal = (d.ramar?.ramar ?? []).filter((r) => sammaRubrik(r.rubrik, v.ram)).length;
    return antal === 1 ? undefined : `${antal ? 'Flera' : 'Ingen'} ram har rubriken "${v.ram}" (hela rubriken eller ledet före kolon)`;
  }
  return (d as Record<string, unknown>)[v.avsnitt] ? undefined : `Metoden har inget avsnitt ${v.avsnitt}`;
}

// Provfilmen (FILMPROV=1 vid bygget, scripts/filmplats.mjs): en metod utan huvudfilm får en film med Rims filer och
// bildtexter på 55 tecken, så att det går att pröva att stillbilderna ryms på sidan 1 i Word och i utskriften i alla
// metoder innan riggens filmer finns. Aldrig i ett vanligt bygge.
const PROVTEXT = 'Provtext med femtiofem tecken för att pröva platsen här.';
const PROVFILM: Film = {
  sekunder: 20,
  beskrivning: 'Provfilm.',
  rubrik: 'Så gör eleven',
  ingress: 'Fyra bilder ur lektionens film om vad eleven gör. Filmen på metodens sida visar samma sak i rörelse.',
  stillbilder: [1, 2, 3, 4].map(() => ({ text: PROVTEXT })),
};
const provfilm = () => typeof process !== 'undefined' && process.env?.FILMPROV === '1';

/** Metodens filmer: huvudfilmen först, sedan extrafilmerna i fältets ordning. */
export function metodensFilmer(d: MetodData, id: string): MetodFilm[] {
  const ut: MetodFilm[] = [];
  if (d.film) ut.push({ film: d.film, bas: `/stodundervisning/${id}-film`, huvud: true, nr: 1 });
  else if (provfilm()) ut.push({ film: PROVFILM, bas: '/stodundervisning/ljudlek-rim-film', huvud: true, nr: 1 });
  for (const f of d.filmer ?? []) ut.push({ film: f, bas: `/stodundervisning/${id}-film${f.nr}`, vid: tolkaEfter(f.efter), huvud: false, nr: f.nr });
  return ut;
}
export const huvudfilm = (filmer: MetodFilm[]) => filmer.find((f) => f.huvud);

function passar(vid: FilmPlats, plats: FilmPlats): boolean {
  if ('stycke' in vid) return 'stycke' in plats && plats.stycke === vid.stycke;
  if ('steg' in vid) return 'steg' in plats && plats.steg === vid.steg;
  if ('tabell' in vid) return 'tabell' in plats && sammaRubrik(plats.tabell, vid.tabell);
  if ('ram' in vid) return 'ram' in plats && sammaRubrik(plats.ram, vid.ram);
  return 'avsnitt' in plats && plats.avsnitt === vid.avsnitt;
}
/** Extrafilmerna som står på platsen. */
export const filmerVid = (filmer: MetodFilm[], plats: FilmPlats) => filmer.filter((f) => f.vid && passar(f.vid, plats));
/** Stegtabellen delas efter varje steg som har en extrafilm: delarna som [första, sista] steget, räknat från 1. */
export function stegDelar(antal: number, filmer: MetodFilm[]): [number, number][] {
  const ut: [number, number][] = [];
  let fran = 1;
  for (let n = 1; n <= antal; n++) if (n === antal || filmerVid(filmer, { steg: n }).length) { ut.push([fran, n]); fran = n + 1; }
  return ut;
}

// Varje metod har en huvudfilm (Niclas 2026-09-30: "alla ska ha just detta i framtiden"), så att en ny metod kommer från
// metodriggen med sin film och inte får den i efterhand. Metoderna som publicerades före filmerna väntar på riggens
// filmer (K-135) och står här, liksom en ny metod som inte kommer från riggen medan riggen gör dess film ur sajtens fil
// (METODER.md under Filmerna). En publicerad metod utan film som inte står här stoppar bygget, och en metod som har fått
// sin film stoppar bygget tills den är borttagen här (scripts/filmpaket.mjs gör det), så att listan inte blir inaktuell.
// Ett utkast prövas inte, så att en metod kan arbetas med lokalt innan filmen finns.
export const VANTAR_PA_FILM: readonly string[] = [];
export function provaHuvudfilmer(metoder: { id: string; data: MetodData }[]): void {
  const fel = metoder.filter(({ data }) => !data.utkast).flatMap(({ id, data }) => {
    if (!data.film && !VANTAR_PA_FILM.includes(id)) return [`${id} saknar huvudfilm (fältet film). En ny metod kommer från metodriggen med sin film; se METODER.md under Filmerna.`];
    if (data.film && VANTAR_PA_FILM.includes(id)) return [`${id} har fått sin film: ta bort den ur VANTAR_PA_FILM i src/lib/film.ts.`];
    return [];
  });
  if (fel.length) throw new Error(`Filmerna:\n${fel.join('\n')}`);
}
