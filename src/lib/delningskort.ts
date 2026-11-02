// Delningskorten (Niclas 2026-09-27): bilden som Facebook, LinkedIn, X med flera visar när en sida delas.
// Varje post i samlingarna med sidor (src/lib/samlingar.ts, POSTENS_KORT nedan) och varje huvudsida får ett eget kort,
// 1200 × 630 (Facebooks och LinkedIns mått;
// texten står inom mitten, där alla tjänster visar den). Texten kommer ur posten med samma ord som sidan: titeln,
// och raden över den (Stödundervisning · Matematik · åk 4–6, Metoder · F–9, Krönika · Vi Lärare · 2024, Bok ·
// Studentlitteratur · 2021). Mallen är src/pages/delning/kort/[namn].astro, med färgerna och typsnittet ur global.css.
//
// Filnamnet bär en kontrollsumma av allt som syns på kortet: texten, mallen, designsystemets variabler som mallen
// läser (färgerna och typsnittet) och bilden. Texten står i datorns eget typsnitt (K-137), Segoe UI på Windows där
// npm run validera ritar korten; ritas korten på en annan sorts dator, höj VERSION så att alla ritas om i samma typsnitt.
// En ändring ger alltså alltid en ny adress, korten kan cachas i ett år, och Facebook hämtar det nya
// kortet när sidan delas nästa gång. Det gamla kortet ligger kvar för inlägg som redan delats (K-053). scripts/delningskort.mjs ritar de kort som saknas med Chrome och lägger dem i
// public/delning/ (npm run validera); npm run build stannar om ett kort saknas. En sida utan eget kort, till
// exempel lathunden eller en taggsida, får närmaste överordnade sidas kort.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { site } from '../data/site';
import { publicerade, publikationNamn, textEtikett, matteproblemenPaSidan } from './innehall';
import { medDatabaserna } from './faktateman';
import { arskursText, type MetodPost } from './metod';
import { kortFakta } from './kortfakta';
import { arskursSpannet, SKALA, spannText, type Spann } from './tackning';
import { delningensKort, kortData, skrivkortAdress, skrivkortAv } from './skrivkort';
import { aktiviteterAdress, aktiviteterAv, aktiviteterData, brainbreaksAdress, brainbreaksAv, brainbreaksData, delningensAktiviteter, delningensBrainbreaks } from './aktiviteter';
import { centralAv, CENTRALA } from './centrala';
import { bankAv } from './bank';
import { taFramKortposter, taFramSlag } from './tafram';
import { bokhandledningen } from './handledning';
import { strukturerna, STRUKTURERNAS_ADRESS } from './strukturer';
import { slugAv, STRUKTURENS_SLAG } from './standard/index.js';
import { SAMLINGAR, SAMLINGARNA, postensAdress, type SamlingNyckel } from './samlingar';
import type { CollectionEntry } from 'astro:content';
import { kortetUrFil, OMRADEN, primaraOmraden, type Utkast } from './metodprofil';
import { laget, larandetIKort, svarighetensNiva, kostnadensNiva, SVARIGHETENS_ORD, KOSTNADENS_ORD, type Laget } from './standard/index.js';

export const MALL = 'src/pages/delning/kort/[namn].astro';
// Kortet för sidan som slumpar skrivkort har en egen mall, som bara räknas in i det kortet, och så har korten för
// sidorna som slumpar aktivitetskort och brainbreaks.
export const SKRIVKORTSMALL = 'src/pages/delning/skrivkort/[namn].astro';
export const KORTBANKSMALL = { aktiviteter: 'src/pages/delning/aktiviteter/[namn].astro', brainbreaks: 'src/pages/delning/brainbreaks/[namn].astro' } as const;
// Metodbankens kort (/stodundervisning) har också en egen mall: en bit av täckningskartan och tre av bankens metodkort i
// en trappa (Niclas 2026-10-18 valde förslaget bland tre: "Kör E"). Kartans rader är den första metoden i varje område,
// i kartans ordning. Metoderna i trappan visar tre av de fyra områdena; de byts när Niclas vill, och bygget stannar om
// en av dem inte längre är publicerad.
export const METODBANKSMALL = 'src/pages/delning/metodbank/[namn].astro';
// Sidorna Ta fram ett matteproblem, en lästext och en faktatext har en egen mall med tre av bankens poster i en solfjäder,
// en ur varje nivå, i problemets form (boksidan). Posterna byts när Niclas vill; finns en inte längre stannar bygget.
// Lästexterna är tre enkla texter som inte är känsliga (översikterna under Lärarens sidor i Textsamtal i grupp), och
// faktatexterna en ur varje tema, med sin första bild. Varje temas sida har samma mall med tre av temats texter.
export const TAFRAMSMALL = 'src/pages/delning/tafram/[namn].astro';
export const TAFRAMENS_POSTER: Record<string, string[]> = { matteproblem: ['bas-7', 'medel-5', 'avancerat-8'], lastexter: ['lattlast-1', 'mellan-3', 'avancerad-3'], faktatexter: ['bas-1', 'medel-3', 'avancerat-3'] };
export const METODBANKENS_METODER = ['fyra-raknesatten', 'laslistor-i-grupp', 'ordverkstad-i-grupp'];
// Raden under titeln, utan antalet metoder (Niclas 2026-10-18: "Antal uppdaterad ju löpande", och "Metoder i eller
// metoder för").
const METODBANKENS_RAD = 'Metoder i matematik, läsning, skrivning och socialt samspel';
// Metoder, /metoder, har ett eget kort i metodbankens anda (Niclas 2026-10-31: "Bygg gärna ert eget snyggt delningskort för
// metoder som du förut byggde för stödundervisning. Något lite mer intressant än standard"): titeln och raden till vänster
// och bankens metodkort till höger i en trappa, ritade med bankens eget kort (src/components/Metodprofil.astro, bank och
// forsmak), med titeln, faktan och Lärande totalt. Trappan har de publicerade metoderna i bankens ordning, högst tre, så att
// en ny metod kommer med av sig själv. Varje metod har ett eget kort i en egen mall: titeln stort, faktan och Lärande
// totalt till vänster, och metodkortets rader för områdena till höger, ur metodkortet på metodens sida.
export const METODERMALL = 'src/pages/delning/metoder/[namn].astro';
export const UNDERVISNINGSMETODSMALL = 'src/pages/delning/undervisningsmetod/[namn].astro';
// Verktyget Strukturer har ett eget kort i verktygskortens form: titeln till vänster och tre strukturer i en solfjäder,
// en ur varje slag, med bilden ur bildmotorn (Niclas 2026-11-02: "Fixa delningskortet för strukturer så det blir lite mer
// spännande"). Strukturerna byts när Niclas vill; finns en inte längre stannar bygget.
export const STRUKTURERNASMALL = 'src/pages/delning/strukturer/[namn].astro';
export const STRUKTURERNAS_KORT = ['turas-om', 'visa', 'beratta-mera'];
// Varje verktyg i registret (src/data/centrala.json, del verktyg) har ett kort i en egen mall och aldrig standardkortet
// med porträttet (Niclas samma dag: "Alla verktyg ska alltid ha ett mer spännande delningskort än standard").
// Standardkortets slag står här, och bygget stannar på ett verktyg med ett av dem (DRIFT.md under Delning och bilder).
const STANDARDKORT: Kort['typ'][] = ['start', 'om', 'avsnitt', 'artikel', 'bok', 'metod', 'handledning'];
const METODERNAS_RAD = 'Undervisningsmetoder för hela klassen';
const HOGST_I_TRAPPAN = 3;
// Metodbankens kort är bara text och färgade ytor och sparas som PNG med palett: 41 kB, mot 89 kB som JPEG, utan skillnad
// som syns förstorad (2026-10-18). Kortet ska delas många gånger, och varje tjänst som visar länken hämtar bilden.
// Kort med foton och teckningar, som skrivkorten, blir sämre och större i en palett och är JPEG. Kortet för Ta fram ett
// matteproblem har text, streckbilder och ytor och blir också mindre i en palett: 57 kB mot 113 kB (2026-10-18).
// Korten för Metoder och dess metoder är också text, staplar och ytor.
const PNG: Kort['typ'][] = ['metodbank', 'tafram', 'metoder', 'undervisningsmetod'];
// Avsnitten i global.css som korten på de egna mallarna ritas med. Aktivitetskorten och brainbreakkorten läser
// skrivkortens färger, så deras kort räknar in båda avsnitten; skrivkortens kort bara sitt eget.
const SKRIVKORTSSTIL = '/* Skrivkorten och sidan som slumpar dem';
const KORTBANKSSTIL = '/* Aktivitetskorten och brainbreakkorten';
// Där stilarna som korten räknar in slutar. Ett avsnitt efter den raden ritar inte om dem (2026-10-24: Planera insatsens
// stilar sist i filen gav två kort nya adresser fast inget på dem hade ändrats).
const KORTENS_SLUT = '/* Slut på stilarna som delningskorten på de egna mallarna räknar in';
// Höjs när något som påverkar korten ändras utanför filerna som räknas in nedan.
const VERSION = 1;

export interface Kort {
  sida: string; // sidans adress, t.ex. /stodundervisning/brakkurs-i-grupp
  namn: string; // filnamnets början, t.ex. stodundervisning-brakkurs-i-grupp
  typ: 'start' | 'om' | 'avsnitt' | 'metodbank' | 'artikel' | 'bok' | 'metod' | 'handledning' | 'skrivkort' | 'aktiviteter' | 'brainbreaks' | 'tafram' | 'metoder' | 'undervisningsmetod' | 'strukturer';
  etikett: string; // raden över titeln, tom på huvudsidorna
  titel: string;
  undertitel: string;
  bild: string; // porträttet, eller bokens omslag
  farg: string; // designsystemets variabel för strecket och raden över titeln
  fil: string; // /delning/<namn>-<kontrollsumma>.jpg, eller .png för metodbankens kort (PNG nedan)
  /** Sidan som slumpar skrivkort: metoden och korten som står på kortet (src/lib/skrivkort.ts, delningensKort). */
  skrivkort?: { metod: string; kort: string[] };
  /** Sidorna som slumpar aktivitetskort och brainbreaks: metoden och korten som står på kortet (src/lib/aktiviteter.ts). */
  kortbank?: { slag: keyof typeof KORTBANKSMALL; metod: string; kort: string[] };
  /** Metodbanken: kartans skala och rader och metodkorten i trappan, med det som syns av dem. */
  metodbank?: { skala: string[]; rader: { omrade: string; titel: string; spann: Spann }[]; metoder: { id: string; titel: string; omrade: string; fakta: { rubrik: string; text: string }[]; ingress: string }[] };
  /** Verktyget Strukturer: strukturerna i solfjädern, med det som syns av dem och scenen som bilden ritas ur. */
  strukturer?: { id: string; namn: string; syfte: string; slag: string; slagNamn: string; scen: string }[];
  /** Ta fram ur en bank: metoden och posterna som står på kortet (src/lib/tafram.ts). */
  tafram?: { metod: string; poster: string[] };
  /** Metoder: metodkorten i trappan, med det som syns av dem (titeln, faktan och Lärande totalt). */
  metoder?: Metodkortet[];
  /** En metod under Metoder: det som syns av metodkortet, faktan och Lärande totalt och raderna för områdena. */
  undervisningsmetod?: Metodkortet & { rader: { namn: string; under?: string; laget: Laget }[]; primara: string[]; infor: { namn: string; niva: number; ord: string }[] };
}
type Metodkortet = { id: string; titel: string; fakta: [string, string][]; larande: Laget; kommentar: string };

// Det som syns av en metods metodkort på korten för Metoder, ur samma rötter som kortet på sidan (Metodprofil.astro).
const umKort = (m: Utkast): Metodkortet => ({ id: m.id, titel: m.titel, fakta: m.fakta, larande: laget(m.evidens.larande), kommentar: larandetIKort(m.evidens.larande) ?? '' });
const umRader = (m: Utkast) => ({
  rader: OMRADEN.filter((o) => o.id !== 'larande').map((o) => ({ namn: o.namn, ...(o.under ? { under: o.under } : {}), laget: laget(m.evidens[o.id]) })),
  primara: primaraOmraden(m.evidens),
  infor: [{ namn: 'Svårighet att införa', niva: svarighetensNiva(m.svarighet), ord: SVARIGHETENS_ORD[svarighetensNiva(m.svarighet)] }, { namn: 'Kostnad att införa', niva: kostnadensNiva(m.kostnad), ord: KOSTNADENS_ORD[kostnadensNiva(m.kostnad)] }],
});

// Reglerna i global.css som en lista, utan kommentarerna, med @media- och @container-blocket som regeln står i, så att ett
// kort kan räkna in just de regler som når det.
function cssRegler(css: string): { valjare: string; text: string }[] {
  const ut: { valjare: string; text: string }[] = [];
  const ga = (text: string, inom: string) => {
    let i = 0;
    for (;;) {
      const start = text.indexOf('{', i);
      if (start < 0) return;
      const valjare = text.slice(i, start).trim();
      let djup = 1, j = start + 1;
      for (; j < text.length && djup; j++) { if (text[j] === '{') djup++; else if (text[j] === '}') djup--; }
      const kropp = text.slice(start + 1, j - 1);
      if (/^@(media|supports|container|layer)\b/.test(valjare)) ga(kropp, `${inom}${valjare} `);
      else ut.push({ valjare: `${inom}${valjare}`, text: `${inom}${valjare} { ${kropp.trim()} }` });
      i = j;
    }
  };
  ga(css.replace(/\/\*[\s\S]*?\*\//g, ''), '');
  return ut;
}
// Klasserna i metodkortet (Metodprofil.astro och Staplar.astro), i banken och på metodens sida. Korten för Metoder räknar in
// reglerna som nämner dem och alla :root-block, så att korten ritas om när metodkortets form ändras och inte annars.
const METODKORTETS_KLASSER = /\.(?:kort(?:-topp|-fakta|-rad)?|metodkort|metodprofil|faktaruta(?:-etikett)?|mp-[\w-]+|amne|forsmak|beta|visually-hidden)(?![\w-])/;

// Små tal med bokstäver, som i sajtens texter.
const TAL = ['noll', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio', 'elva', 'tolv'];
const FARG: Record<string, string> = { Matematik: '--farg-accent', Läsning: '--farg-lasning', Skrivning: '--farg-skrivning', Socialt: '--farg-socialt' };
const las = (sokvag: string) => readFileSync(join(process.cwd(), sokvag));

// Designsystemets variabler som kortet läser: de som mallen nämner och strecket färgas med, med sina värden ur
// :root-blocket i början av global.css. En ny variabel som kortet inte läser ritar alltså inte om korten (K-156).
// Strecket har områdets färg (FARG). De tre första områdenas färger har räknats in i varje korts summa sedan K-156 och
// står kvar där, så att korten behåller sina adresser; ett nytt områdes färg räknas bara in i sina egna kort, så att
// ett nytt område inte ritar om alla kort (Socialt 2026-10-03 hade annars ritat om 103 kort).
const GRUNDFARGER = ['--farg-accent', '--farg-lasning', '--farg-skrivning'];
let designVarden: Map<string, string> | undefined;
function designsystem(farg: string, mall = las(MALL).toString('utf8')): string {
  if (!designVarden) {
    const css = las('src/styles/global.css').toString('utf8').replace(/\r\n/g, '\n');
    const start = css.indexOf(':root {');
    designVarden = new Map([...css.slice(start, css.indexOf('\n}', start)).matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  }
  const varden = designVarden;
  const lasta = new Set([...mall.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]).concat(GRUNDFARGER, farg));
  return [...lasta].filter((v) => varden.has(v)).sort().map((v) => `${v}: ${varden.get(v)}`).join('\n');
}

// "Bråkkurs i grupp: förstå, räkna och tänka i bråk" blir titeln "Bråkkurs i grupp" och undertiteln
// "Förstå, räkna och tänka i bråk".
function dela(text: string): [string, string] {
  const i = text.indexOf(': ');
  if (i < 0) return [text, ''];
  const rest = text.slice(i + 2);
  return [text.slice(0, i), rest.charAt(0).toLocaleUpperCase('sv') + rest.slice(1)];
}
const forstaMeningen = (text: string) => text.split(/(?<=\.)\s/)[0];
// Årskurserna som metoderna tillsammans täcker, från den tidigaste till den senaste.
const omfanget = (spann: Spann[]): Spann => [Math.min(...spann.map((x) => x[0])), Math.max(...spann.map((x) => x[1]))];

// Kortet för en post, en rad per samling i roten (src/lib/samlingar.ts), så att en ny samling får sina kort av sig själv: en
// samling i roten utan sin rad här stannar astro check, och scripts/cacheprov.mjs stannar på en post vars sida har delens
// kort (Niclas 2026-10-31: "Inga drifter"; Metoders poster hade /metoders kort). Fälten står i samma ordning som de alltid
// har stått, eftersom kontrollsumman läser kortet som text och en ny ordning skulle rita om alla kort. Metoders kort har
// metodens bläck, som metodens sida och kort (--amnefarg i global.css), och raden över titeln är sidans brödsmula.
type Post<K extends SamlingNyckel> = { id: string; data: CollectionEntry<K>['data'] };
type Postkort = Omit<Kort, 'sida' | 'namn' | 'fil'>;
const POSTENS_KORT: { [K in SamlingNyckel]: (p: Post<K>) => Postkort } = {
  stodundervisning: (m) => {
    const [titel, undertitel] = dela(m.data.titel);
    return { typ: 'metod', etikett: `${SAMLINGAR.stodundervisning.namn} · ${m.data.omrade} · ${arskursText(m.data)}`, titel, undertitel: undertitel || m.data.undertitel || '', bild: site.portratt, farg: FARG[m.data.omrade] ?? '--farg-accent' };
  },
  // En metod under Metoder har en egen mall (UNDERVISNINGSMETODSMALL) med det som syns av metodkortet.
  undervisningsmetoder: (u) => {
    const [titel, undertitel] = dela(u.data.titel);
    const m = kortetUrFil(u.id, u.data);
    return { typ: 'undervisningsmetod', etikett: `${SAMLINGAR.undervisningsmetoder.namn} · ${arskursText(u.data)}`, titel, undertitel: undertitel || u.data.undertitel || '', bild: site.portratt, farg: '--farg-mork', undervisningsmetod: { ...umKort(m), ...umRader(m) } };
  },
  artiklar: (a) => {
    const ar = a.data.datum.getFullYear();
    const var_ = a.data.publikation === 'egen' ? '' : ` · ${publikationNamn(a.data.publikation)}`;
    const [titel, undertitel] = dela(a.data.titel);
    return { typ: 'artikel', etikett: `${textEtikett(a.data)}${var_} · ${ar}`, titel, undertitel, bild: site.portratt, farg: '--farg-accent' };
  },
  bocker: (b) => {
    const [titel, undertitel] = dela(b.data.titel);
    const etikett = ['Bok', b.data.forlag, b.data.utgivningsar].filter(Boolean).join(' · ');
    return { typ: 'bok', etikett, titel, undertitel, bild: b.data.omslag ?? site.portratt, farg: '--farg-accent' };
  },
};

let alla: Promise<Kort[]> | undefined;

export function allaKort(): Promise<Kort[]> {
  alla ??= (async () => {
    const utan: Omit<Kort, 'fil'>[] = [];
    const lagg = (k: Omit<Kort, 'fil' | 'namn'>) => utan.push({ ...k, namn: k.sida === '/' ? 'start' : k.sida.slice(1).replace(/\//g, '-') });
    const portratt = site.portratt;
    // Metoderna med databasens teman (src/lib/faktateman.ts), som Ta fram-sidorna och temanas sidor har dem.
    const metoder = await medDatabaserna(await publicerade('stodundervisning'));
    // Metoderna under Metoder i bankens ordning, efter titeln, som trappan på kortet för /metoder tar dem.
    const undervisningsmetoder = (await publicerade('undervisningsmetoder')).sort((a, b) => a.data.titel.localeCompare(b.data.titel, 'sv'));

    lagg({ sida: '/', typ: 'start', etikett: '', titel: site.namn, undertitel: site.rad, bild: portratt, farg: '--farg-accent' });
    for (const [nyckel, s] of Object.entries(site.sidor)) {
      // Om-sidan har porträttet till höger och därmed en smal spalt: där står raden under namnet i stället för beskrivningen.
      const om = nyckel === 'om';
      if (nyckel === 'stodundervisning') lagg({ sida: `/${nyckel}`, typ: 'metodbank', ...metodbanken(metoder), titel: s.titel, undertitel: METODBANKENS_RAD, bild: portratt, farg: '--farg-accent' });
      // Metoder har bankens kort när en metod är publicerad, och annars avsnittets kort.
      else if (nyckel === SAMLINGAR.undervisningsmetoder.led && undervisningsmetoder.length) lagg({ sida: `/${nyckel}`, typ: 'metoder', etikett: `Metodbank · ${spannText(omfanget(undervisningsmetoder.map((u) => arskursSpannet(u.data))))}`, titel: s.titel, undertitel: METODERNAS_RAD, bild: portratt, farg: '--farg-mork', metoder: undervisningsmetoder.slice(0, HOGST_I_TRAPPAN).map((u) => umKort(kortetUrFil(u.id, u.data))) });
      else lagg({ sida: `/${nyckel}`, typ: om ? 'om' : 'avsnitt', etikett: '', titel: s.titel, undertitel: om ? site.rad : forstaMeningen(s.beskrivning), bild: portratt, farg: '--farg-accent' });
    }
    // Verktyget Strukturer (K-650) har verktygskortets form med tre strukturer (STRUKTURERNASMALL), och strukturernas sidor
    // får det, som närmaste överordnade sida.
    const allaStrukturer = await strukturerna();
    if (allaStrukturer.length) {
      const valda = STRUKTURERNAS_KORT.map((id) => {
        const s = allaStrukturer.find((x) => x.id === id);
        if (!s) throw new Error(`Strukturernas delningskort: strukturen ${id} finns inte. Byt den i STRUKTURERNAS_KORT i src/lib/delningskort.ts.`);
        return { id: s.id, namn: s.data.namn, syfte: s.data.syfte, slag: s.data.slag, slagNamn: STRUKTURENS_SLAG[s.data.slag as keyof typeof STRUKTURENS_SLAG].namn, scen: s.data.bild!.scen };
      });
      lagg({ sida: STRUKTURERNAS_ADRESS, typ: 'strukturer', etikett: 'Kooperativt lärande', titel: 'Strukturer', undertitel: `${allaStrukturer.length} kort för samarbete i par, i grupp och i hela klassen, att skriva ut`, bild: portratt, farg: '--farg-accent', strukturer: valda });
    }
    // Ett kort per post i varje samling i roten (POSTENS_KORT).
    const poster: { [K in SamlingNyckel]: Post<K>[] } = { stodundervisning: metoder, undervisningsmetoder, artiklar: await publicerade('artiklar'), bocker: await publicerade('bocker') };
    for (const s of SAMLINGARNA) for (const p of poster[s] as Post<SamlingNyckel>[]) lagg({ sida: postensAdress(s, p.id), ...(POSTENS_KORT[s] as (x: Post<SamlingNyckel>) => Postkort)(p) });
    for (const m of metoder) {
      // Sidan som slumpar skrivkort har ett eget kort med tre skrivkort och klockan (Niclas 2026-10-14: "en direktlänk
      // till slumpgeneratorn som har egen delabild").
      const sk = skrivkortAv(m.id);
      if (sk) lagg({ sida: skrivkortAdress(m.id), typ: 'skrivkort', etikett: `Skrivkort · ${arskursText(m.data)}`, titel: 'Ta fram ett skrivkort', undertitel: `${sk.kort.length} kort i tre nivåer, stora på skärmen med en klocka som alla ser`, bild: portratt, farg: FARG[m.data.omrade] ?? '--farg-accent', skrivkort: { metod: m.id, kort: delningensKort(sk) } });
      // Sidorna som slumpar aktivitetskort och brainbreaks har var sitt kort med tre av sidans kort (Niclas 2026-10-14:
      // en sida att dela får en egen delningsbild i en egen mall).
      const ak = aktiviteterAv(m.id);
      if (ak) lagg({ sida: aktiviteterAdress(m.id), typ: 'aktiviteter', etikett: `Aktivitetskort · ${arskursText(m.data)}`, titel: centralAv('aktiviteter')?.namn ?? 'Ta fram en aktivitet', undertitel: `${ak.kort.length} aktiviteter i ${TAL[ak.kategorier.length] ?? ak.kategorier.length} kategorier, sex i taget, att samla i en lista och skriva ut`, bild: portratt, farg: FARG[m.data.omrade] ?? '--farg-accent', kortbank: { slag: 'aktiviteter', metod: m.id, kort: delningensAktiviteter(ak) } });
      // Sidorna Ta fram ett matteproblem och Ta fram en lästext har ett kort med tre av posterna (Niclas 2026-10-14: en sida
      // att dela får en egen delningsbild i en egen mall).
      const bank = bankAv(m.data);
      const slag = bank ? taFramSlag(bank) : undefined;
      if (bank && slag === 'matteproblem') {
        const delar = new Set(bank.enheter.map((e) => m.data.ramar!.ramar[e.ri].innehallstagg).filter(Boolean)).size;
        // Sidan har metodens och databasens problem (src/lib/matteproblem.ts).
        const antal = (await matteproblemenPaSidan())?.alla.length ?? bank.enheter.length;
        lagg({ sida: `/stodundervisning/${m.id}/${bank.ord.slug}`, typ: 'tafram', etikett: `Matteproblem · ${arskursText(m.data)}`, titel: centralAv(slag)?.namn ?? 'Ta fram ett matteproblem', undertitel: `${antal} problem på ${TAL[bank.nivaer.length] ?? bank.nivaer.length} nivåer${delar ? ` och i kursplanens ${TAL[delar] ?? delar} delar` : ''}, att visa stort och skriva ut`, bild: portratt, farg: FARG[m.data.omrade] ?? '--farg-accent', tafram: { metod: m.id, poster: TAFRAMENS_POSTER[slag] } });
      }
      if (bank && slag === 'lastexter') {
        const texter = bank.enheter.filter((e) => e.nr !== undefined).length;
        lagg({ sida: `/stodundervisning/${m.id}/${bank.ord.slug}`, typ: 'tafram', etikett: `Lästexter · ${arskursText(m.data)}`, titel: centralAv(slag)?.namn ?? 'Ta fram en lästext', undertitel: `${texter} texter på ${TAL[bank.nivaer.length] ?? bank.nivaer.length} nivåer med frågor mellan raderna, att visa stort och skriva ut`, bild: portratt, farg: FARG[m.data.omrade] ?? '--farg-accent', tafram: { metod: m.id, poster: TAFRAMENS_POSTER[slag] } });
        // Lärarhandledningens sida har ett eget kort med handledningens titel, så att den som delar handledningen inte visar
        // Ta fram en lästext (K-444; Niclas 2026-10-19: "Att alla har en bra dela bild"). Raden under titeln är sidans.
        const h = bokhandledningen(m.data.ramar?.ramar ?? []);
        if (h) lagg({ sida: `/stodundervisning/${m.id}/${bank.ord.slug}/lararhandledning`, typ: 'handledning', etikett: `Lärarhandledning · ${arskursText(m.data)}`, titel: h.titel, undertitel: 'Två sidor om hur hela klassen eller en grupp läser en text tillsammans, i par, med stoppet, frågorna och samtalet', bild: portratt, farg: FARG[m.data.omrade] ?? '--farg-accent' });
      }
      if (bank && slag === 'faktatexter') {
        // Temana som sidan har dem (bankens tema, där ramens fält tema går före etiketten; Codex-granskningen 2026-10-18 natt).
        const texter = bank.enheter.filter((e) => e.nr !== undefined);
        const teman = new Set(texter.map((e) => e.tema).filter(Boolean)).size;
        lagg({ sida: `/stodundervisning/${m.id}/${bank.ord.slug}`, typ: 'tafram', etikett: `Faktatexter · ${arskursText(m.data)}`, titel: centralAv(slag)?.namn ?? 'Ta fram en faktatext', undertitel: `${texter.length} faktatexter i ${TAL[teman] ?? teman} teman, var och en med sin modell, att visa stort och skriva ut`, bild: portratt, farg: FARG[m.data.omrade] ?? '--farg-accent', tafram: { metod: m.id, poster: TAFRAMENS_POSTER[slag] } });
        // Varje temas sida har ett eget kort med temats namn och tre av dess texter, den första, den mittersta och den sista,
        // så att den som delar ett tema visar det temat (K-444; Niclas 2026-10-19: "Att alla har en bra dela bild"). Ett nytt
        // tema får sitt kort av sig självt. Temats namn är unikt i banken, och adressen är temats sida ([id]/texter/[tema]).
        for (const tema of new Set(texter.map((e) => e.tema).filter((x): x is string => !!x))) {
          const egna = texter.filter((e) => e.tema === tema);
          const valda = [...new Set([0, Math.floor((egna.length - 1) / 2), egna.length - 1])].map((i) => egna[i].slug);
          const handledd = egna.some((e) => e.handledning !== undefined);
          // Raden under titeln ryms på tre rader (kortets gräns): "Fem faktatexter med sina modeller och temats lärarhandledning".
          const tal = TAL[egna.length] ?? String(egna.length);
          lagg({ sida: `/stodundervisning/${m.id}/${bank.ord.slug}/${slugAv(tema)}`, typ: 'tafram', etikett: `Faktatexter · ${egna[0].l.niva} · ${arskursText(m.data)}`, titel: tema, undertitel: `${tal.charAt(0).toLocaleUpperCase('sv')}${tal.slice(1)} faktatexter med sina modeller${handledd ? ' och temats lärarhandledning' : ', att visa stort och skriva ut'}`, bild: portratt, farg: FARG[m.data.omrade] ?? '--farg-accent', tafram: { metod: m.id, poster: valda } });
        }
      }
      const bb = brainbreaksAv(m.id);
      if (bb) lagg({ sida: brainbreaksAdress(m.id), typ: 'brainbreaks', etikett: `Brainbreaks · ${arskursText(m.data)}`, titel: centralAv('brainbreaks')?.namn ?? 'Ta fram en brainbreak', undertitel: `${bb.kort.length} brainbreaks, sex i taget, stora på skärmen med en klocka och musik`, bild: portratt, farg: FARG[m.data.omrade] ?? '--farg-accent', kortbank: { slag: 'brainbreaks', metod: m.id, kort: delningensBrainbreaks(bb) } });
    }

    // Varje verktyg har ett kort i en egen mall, aldrig standardkortet (STANDARDKORT ovan).
    for (const c of CENTRALA.filter((x) => x.del === 'verktyg' && x.slag === 'sida')) {
      const k = utan.find((x) => x.sida === c.adress);
      if (!k || STANDARDKORT.includes(k.typ)) throw new Error(`Delningskorten: verktyget ${c.namn} (${c.adress}) har ${k ? 'standardkortet' : 'inget eget kort'}. Ett verktyg har alltid ett kort i en egen mall, mer spännande än standardkortet (DRIFT.md under Delning och bilder).`);
    }
    const gemensamt = [String(VERSION), las(MALL).toString('utf8').replace(/\r\n/g, '\n')];
    const bilder = new Map<string, string>();
    const bildSumma = (b: string) => bilder.get(b) ?? bilder.set(b, createHash('sha256').update(las(join('public', b))).digest('hex')).get(b)!;
    // Skrivkortens kort ritas med kortets egen kod och form (src/scripts/skrivkortet.ts och avsnittet om skrivkorten i
    // global.css), med korten och deras bilder: allt det räknas in, så att kortet ritas om när något av det ändras.
    // Avsnittet slutar där aktivitetskortens börjar, med ett radslut som när det var sist i filen, så att kortet behöll
    // sin adress när aktivitetskorten kom (2026-10-16).
    const css = las('src/styles/global.css').toString('utf8').replace(/\r\n/g, '\n');
    const skrivkortsStil = css.slice(css.indexOf(SKRIVKORTSSTIL), css.includes(KORTBANKSSTIL) ? css.indexOf(KORTBANKSSTIL) : undefined).replace(/\n+$/, '\n');
    const skrivkortSumma = (s: NonNullable<Kort['skrivkort']>) => {
      const data = kortData(s.metod, skrivkortAv(s.metod)!, s.kort);
      return [las(SKRIVKORTSMALL).toString('utf8').replace(/\r\n/g, '\n'), las('src/scripts/skrivkortet.ts').toString('utf8').replace(/\r\n/g, '\n'), skrivkortsStil, JSON.stringify(data),
        ...Object.values(data.bilder).map((b) => bildSumma(b.stor.replace(/^\//, '')))].join('|');
    };
    // Aktivitetskorten och brainbreakkorten ritas med sidornas kod och form (src/scripts/kortbanken.ts och avsnitten om
    // skrivkorten och korten i global.css), med korten och deras bilder. Kortens pdf-adresser ritas inte och räknas inte
    // in, så att en ny pdf inte ritar om kortet (K-411).
    // Avsnitten slutar vid KORTENS_SLUT, med ett radslut som när de var sist i filen, så att korten behöll sina adresser.
    const kortbanksStil = css.slice(css.indexOf(SKRIVKORTSSTIL), css.includes(KORTENS_SLUT) ? css.indexOf(KORTENS_SLUT) : undefined).replace(/\n+$/, '\n');
    const kortbankSumma = (s: NonNullable<Kort['kortbank']>) => {
      const data = s.slag === 'aktiviteter' ? aktiviteterData(s.metod, aktiviteterAv(s.metod)!, s.kort) : brainbreaksData(s.metod, brainbreaksAv(s.metod)!, s.kort);
      return [las(KORTBANKSMALL[s.slag]).toString('utf8').replace(/\r\n/g, '\n'), las('src/scripts/kortbanken.ts').toString('utf8').replace(/\r\n/g, '\n'), kortbanksStil, JSON.stringify(data, (nyckel, varde) => (nyckel === 'pdf' ? undefined : varde)),
        ...data.kort.map((k) => bildSumma(k.bild.replace(/^\//, '')))].join('|');
    };
    // Metodbankens kort ritas med bankens eget metodkort (src/components/Metodkort.astro) och dess stilar i global.css:
    // grundreglerna för text och länkar, kortets ram och avsnittet om metodbankens kort. Bara de räknas in, så att kortet
    // inte ritas om varje gång något annat i global.css ändras.
    const stycke = (fran: string, till: string) => {
      const a = css.indexOf(fran), b = css.indexOf(till, a + 1);
      if (a < 0 || b < 0) throw new Error(`Delningskorten: hittar inte "${fran.trim()}" följt av "${till.trim()}" i global.css; rätta stycket i src/lib/delningskort.ts.`);
      return css.slice(a, b);
    };
    // Ta fram-kortets poster ritas i boksidans form (avsnittet om boksidan i global.css och boksidans färger), med det
    // som står på kortet: titeln, nivån, numret, taggarna i sina färger, första stycket och bilden eller, utan bild, hela
    // texten, och första frågan.
    const bokfarger = css.match(/:root \{ --bok-[^}]*\}/)?.[0] ?? '';
    const taggfarger = css.match(/:root \{ --tagg-[^}]*\}/)?.[0] ?? '';
    const taframSumma = (t: NonNullable<Kort['tafram']>) => {
      const poster = taFramKortposter(metoder.find((m) => m.id === t.metod)!, t.poster).map((p) => ({ titel: p.titel, niva: p.niva, nr: p.nr, en: p.en, farg: p.farg, taggar: p.taggar, stycken: p.stycken, fraga: p.fragor[0] ?? '', fragor: p.fragor.length > 1, bild: p.bild }));
      return [las(TAFRAMSMALL).toString('utf8').replace(/\r\n/g, '\n'), stycke('/* Boksidan (Boksida.astro)', '/* Två lösningar (Textpar.astro'), bokfarger, taggfarger, JSON.stringify(poster), ...poster.filter((p) => p.bild).map((p) => bildSumma(p.bild.replace(/^\//, '')))].join('|');
    };
    // Strukturernas kort ritas med bilderna ur bildmotorn (scripts/strukturer/), ur varje strukturs scen.
    const lf = (f: string) => las(f).toString('utf8').replace(/\r\n/g, '\n');
    const motorn = ['rita.mjs', 'stil.json', 'figurer/penna.mjs', 'figurer/figur.mjs', 'figurer/saker.mjs'].map((f) => lf(join('scripts', 'strukturer', f)));
    const strukturernasSumma = (s: NonNullable<Kort['strukturer']>) => [lf(STRUKTURERNASMALL), ...motorn, ...s.map((x) => lf(join('scripts', 'strukturer', 'scener', `${x.scen}.yaml`)))].join('|');
    const metodbankSumma = () => {
      const mall = las(METODBANKSMALL).toString('utf8').replace(/\r\n/g, '\n');
      const kortet = las('src/components/Metodkort.astro').toString('utf8').replace(/\r\n/g, '\n');
      const stil = [stycke('\n* { box-sizing', '\n.hopp-lank'), stycke('\n.kort {', '\n.meta {'), stycke('/* Metodbanken: korten', '\n.samla {')].join('|');
      return [mall, kortet, stil, designsystem('--farg-accent', mall + stil)].join('|');
    };
    // Korten för Metoder och dess metoder ritas med metodkortet (Metodprofil.astro och Staplar.astro) och de regler i
    // global.css som når det, utöver grundreglerna för text och länkar, och mallen.
    const metodkortetsSumma = (mallen: string, farg: string) => {
      const mall = las(mallen).toString('utf8').replace(/\r\n/g, '\n');
      const kod = ['src/components/Metodprofil.astro', 'src/components/Staplar.astro'].map((f) => las(f).toString('utf8').replace(/\r\n/g, '\n'));
      const stil = [stycke('\n* { box-sizing', '\n.hopp-lank'), ...cssRegler(css).filter((r) => r.valjare === ':root' || METODKORTETS_KLASSER.test(r.valjare)).map((r) => r.text)].join('\n');
      return [mall, ...kod, stil, designsystem(farg, mall + stil)].join('|');
    };
    return utan.map((k) => {
      const h = createHash('sha256');
      for (const del of [...gemensamt, designsystem(k.farg), JSON.stringify(k), bildSumma(k.bild), bildSumma(portratt), ...(k.skrivkort ? [skrivkortSumma(k.skrivkort)] : []), ...(k.kortbank ? [kortbankSumma(k.kortbank)] : []), ...(k.metodbank ? [metodbankSumma()] : []), ...(k.tafram ? [taframSumma(k.tafram)] : []), ...(k.metoder ? [metodkortetsSumma(METODERMALL, k.farg)] : []), ...(k.undervisningsmetod ? [metodkortetsSumma(UNDERVISNINGSMETODSMALL, k.farg)] : []), ...(k.strukturer ? [strukturernasSumma(k.strukturer)] : [])]) h.update(del);
      return { ...k, fil: `/delning/${k.namn}-${h.digest('hex').slice(0, 10)}.${PNG.includes(k.typ) ? 'png' : 'jpg'}` };
    });
  })();
  return alla;
}

// Metodbankens kort: raden över titeln, kartans rader och metodkorten i trappan, ur metoderna. Kartan har samma ordning
// som täckningskartan (src/components/Tackning.astro): det som börjar tidigast först, sedan det kortaste, sedan namnet.
function metodbanken(alla: MetodPost[]): Pick<Kort, 'etikett' | 'metodbank'> {
  const huvud = alla.filter((m) => !m.data.serie);
  const rader = huvud.map((m) => ({ m, sp: arskursSpannet(m.data) }));
  const ordning = (a: (typeof rader)[number], b: (typeof rader)[number]) => a.sp[0] - b.sp[0] || (a.sp[1] - a.sp[0]) - (b.sp[1] - b.sp[0]) || a.m.data.titel.localeCompare(b.m.data.titel, 'sv');
  const forsta = site.omraden.map((o) => rader.filter((r) => r.m.data.omrade === o).sort(ordning)[0]).filter(Boolean);
  const valda = METODBANKENS_METODER.map((id) => {
    const m = huvud.find((x) => x.id === id);
    if (!m) throw new Error(`Metodbankens delningskort: metoden ${id} är inte publicerad. Byt den i METODBANKENS_METODER i src/lib/delningskort.ts.`);
    return m;
  });
  const fran = Math.min(...rader.map((r) => r.sp[0])), till = Math.max(...rader.map((r) => r.sp[1]));
  return {
    etikett: `Metodbank · ${spannText([fran, till])}`,
    metodbank: {
      skala: SKALA,
      rader: forsta.map(({ m, sp }) => ({ omrade: m.data.omrade, titel: dela(m.data.titel)[0], spann: sp })),
      metoder: valda.map((m) => ({ id: m.id, titel: m.data.titel, omrade: m.data.omrade, fakta: kortFakta(m.data), ingress: m.data.ingress })),
    },
  };
}

// Kortet för en sida: sidans eget, annars närmaste överordnade sidas, annars startsidans.
export async function kortFor(adress: string): Promise<Kort> {
  const kort = await allaKort();
  const karta = new Map(kort.map((k) => [k.sida, k]));
  let sida = decodeURI(adress).replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/+$/, '') || '/';
  while (!karta.has(sida) && sida !== '/') sida = sida.slice(0, sida.lastIndexOf('/')) || '/';
  return karta.get(sida) ?? kort[0];
}
