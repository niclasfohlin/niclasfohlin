// Delningskorten (Niclas 2026-09-27): bilden som Facebook, LinkedIn, X med flera visar när en sida delas.
// Varje artikel, bok och metod och varje huvudsida får ett eget kort, 1200 × 630 (Facebooks och LinkedIns mått;
// texten står inom mitten, där alla tjänster visar den). Texten kommer ur posten med samma ord som sidan: titeln,
// och raden över den (Stödundervisning · Matematik · åk 4–6, Krönika · Vi Lärare · 2024, Bok · Studentlitteratur
// · 2021). Mallen är src/pages/delning/kort/[namn].astro, med färgerna och typsnittet ur global.css.
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
import { publicerade, publikationNamn, typLabel, matteproblemenPaSidan } from './innehall';
import { arskursText, kortFakta, type MetodPost } from './metod';
import { arskursSpannet, SKALA, spannText, type Spann } from './tackning';
import { delningensKort, kortData, skrivkortAdress, skrivkortAv } from './skrivkort';
import { aktiviteterAdress, aktiviteterAv, aktiviteterData, brainbreaksAdress, brainbreaksAv, brainbreaksData, delningensAktiviteter, delningensBrainbreaks } from './aktiviteter';
import { centralAv } from './centrala';
import { bankAv } from './bank';
import { taFramKortposter, taFramSlag } from './tafram';

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
// Sidorna Ta fram ett matteproblem och Ta fram en lästext har en egen mall med tre av bankens poster i en solfjäder, en ur
// varje nivå, i problemets form (boksidan). Posterna byts när Niclas vill; finns en inte längre stannar bygget. Lästexterna
// är tre enkla texter som inte är känsliga (översikterna under Lärarens sidor i Textsamtal i grupp), och faktatexterna
// en ur varje tema, med sin första bild.
export const TAFRAMSMALL = 'src/pages/delning/tafram/[namn].astro';
export const TAFRAMENS_POSTER: Record<string, string[]> = { matteproblem: ['bas-7', 'medel-5', 'avancerat-8'], lastexter: ['lattlast-1', 'mellan-3', 'avancerad-3'], faktatexter: ['bas-1', 'medel-3', 'avancerat-3'] };
export const METODBANKENS_METODER = ['fyra-raknesatten', 'laslistor-i-grupp', 'ordverkstad-i-grupp'];
// Raden under titeln, utan antalet metoder (Niclas 2026-10-18: "Antal uppdaterad ju löpande", och "Metoder i eller
// metoder för").
const METODBANKENS_RAD = 'Metoder i matematik, läsning, skrivning och socialt samspel';
// Metodbankens kort är bara text och färgade ytor och sparas som PNG med palett: 41 kB, mot 89 kB som JPEG, utan skillnad
// som syns förstorad (2026-10-18). Kortet ska delas många gånger, och varje tjänst som visar länken hämtar bilden.
// Kort med foton och teckningar, som skrivkorten, blir sämre och större i en palett och är JPEG. Kortet för Ta fram ett
// matteproblem har text, streckbilder och ytor och blir också mindre i en palett: 57 kB mot 113 kB (2026-10-18).
const PNG: Kort['typ'][] = ['metodbank', 'tafram'];
// Avsnitten i global.css som korten på de egna mallarna ritas med. Aktivitetskorten och brainbreakkorten läser
// skrivkortens färger, så deras kort räknar in båda avsnitten; skrivkortens kort bara sitt eget.
const SKRIVKORTSSTIL = '/* Skrivkorten och sidan som slumpar dem';
const KORTBANKSSTIL = '/* Aktivitetskorten och brainbreakkorten';
// Höjs när något som påverkar korten ändras utanför filerna som räknas in nedan.
const VERSION = 1;

export interface Kort {
  sida: string; // sidans adress, t.ex. /stodundervisning/brakkurs-i-grupp
  namn: string; // filnamnets början, t.ex. stodundervisning-brakkurs-i-grupp
  typ: 'start' | 'om' | 'avsnitt' | 'metodbank' | 'artikel' | 'bok' | 'metod' | 'skrivkort' | 'aktiviteter' | 'brainbreaks' | 'tafram';
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
  /** Ta fram ur en bank: metoden och posterna som står på kortet (src/lib/tafram.ts). */
  tafram?: { metod: string; poster: string[] };
}

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

let alla: Promise<Kort[]> | undefined;

export function allaKort(): Promise<Kort[]> {
  alla ??= (async () => {
    const utan: Omit<Kort, 'fil'>[] = [];
    const lagg = (k: Omit<Kort, 'fil' | 'namn'>) => utan.push({ ...k, namn: k.sida === '/' ? 'start' : k.sida.slice(1).replace(/\//g, '-') });
    const portratt = site.portratt;
    const metoder = await publicerade('stodundervisning');

    lagg({ sida: '/', typ: 'start', etikett: '', titel: site.namn, undertitel: site.rad, bild: portratt, farg: '--farg-accent' });
    for (const [nyckel, s] of Object.entries(site.sidor)) {
      // Om-sidan har porträttet till höger och därmed en smal spalt: där står raden under namnet i stället för beskrivningen.
      const om = nyckel === 'om';
      if (nyckel === 'stodundervisning') lagg({ sida: `/${nyckel}`, typ: 'metodbank', ...metodbanken(metoder), titel: s.titel, undertitel: METODBANKENS_RAD, bild: portratt, farg: '--farg-accent' });
      else lagg({ sida: `/${nyckel}`, typ: om ? 'om' : 'avsnitt', etikett: '', titel: s.titel, undertitel: om ? site.rad : forstaMeningen(s.beskrivning), bild: portratt, farg: '--farg-accent' });
    }
    for (const a of await publicerade('artiklar')) {
      const ar = a.data.datum.getFullYear();
      const var_ = a.data.publikation === 'egen' ? '' : ` · ${publikationNamn(a.data.publikation)}`;
      const [titel, undertitel] = dela(a.data.titel);
      lagg({ sida: `/artiklar/${a.id}`, typ: 'artikel', etikett: `${typLabel(a.data.typ)}${var_} · ${ar}`, titel, undertitel, bild: portratt, farg: '--farg-accent' });
    }
    for (const b of await publicerade('bocker')) {
      const [titel, undertitel] = dela(b.data.titel);
      const etikett = ['Bok', b.data.forlag, b.data.utgivningsar].filter(Boolean).join(' · ');
      lagg({ sida: `/bocker/${b.id}`, typ: 'bok', etikett, titel, undertitel, bild: b.data.omslag ?? portratt, farg: '--farg-accent' });
    }
    for (const m of metoder) {
      const [titel, undertitel] = dela(m.data.titel);
      lagg({ sida: `/stodundervisning/${m.id}`, typ: 'metod', etikett: `Stödundervisning · ${m.data.omrade} · ${arskursText(m.data)}`, titel, undertitel: undertitel || m.data.undertitel || '', bild: portratt, farg: FARG[m.data.omrade] ?? '--farg-accent' });
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
      }
      if (bank && slag === 'faktatexter') {
        // Temana som sidan har dem (bankens tema, där ramens fält tema går före etiketten; Codex-granskningen 2026-10-18 natt).
        const texter = bank.enheter.filter((e) => e.nr !== undefined);
        const teman = new Set(texter.map((e) => e.tema).filter(Boolean)).size;
        lagg({ sida: `/stodundervisning/${m.id}/${bank.ord.slug}`, typ: 'tafram', etikett: `Faktatexter · ${arskursText(m.data)}`, titel: centralAv(slag)?.namn ?? 'Ta fram en faktatext', undertitel: `${texter.length} faktatexter i ${TAL[teman] ?? teman} teman, var och en med sin modell, att visa stort och skriva ut`, bild: portratt, farg: FARG[m.data.omrade] ?? '--farg-accent', tafram: { metod: m.id, poster: TAFRAMENS_POSTER[slag] } });
      }
      const bb = brainbreaksAv(m.id);
      if (bb) lagg({ sida: brainbreaksAdress(m.id), typ: 'brainbreaks', etikett: `Brainbreaks · ${arskursText(m.data)}`, titel: centralAv('brainbreaks')?.namn ?? 'Ta fram en brainbreak', undertitel: `${bb.kort.length} brainbreaks, sex i taget, stora på skärmen med en klocka och musik`, bild: portratt, farg: FARG[m.data.omrade] ?? '--farg-accent', kortbank: { slag: 'brainbreaks', metod: m.id, kort: delningensBrainbreaks(bb) } });
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
    const kortbankSumma = (s: NonNullable<Kort['kortbank']>) => {
      const data = s.slag === 'aktiviteter' ? aktiviteterData(s.metod, aktiviteterAv(s.metod)!, s.kort) : brainbreaksData(s.metod, brainbreaksAv(s.metod)!, s.kort);
      return [las(KORTBANKSMALL[s.slag]).toString('utf8').replace(/\r\n/g, '\n'), las('src/scripts/kortbanken.ts').toString('utf8').replace(/\r\n/g, '\n'), css.slice(css.indexOf(SKRIVKORTSSTIL)), JSON.stringify(data, (nyckel, varde) => (nyckel === 'pdf' ? undefined : varde)),
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
    // som står på kortet: titeln, nivån, numret, taggarna i sina färger, första stycket, första frågan och bilden, inte
    // resten av texten.
    const bokfarger = css.match(/:root \{ --bok-[^}]*\}/)?.[0] ?? '';
    const taggfarger = css.match(/:root \{ --tagg-[^}]*\}/)?.[0] ?? '';
    const taframSumma = (t: NonNullable<Kort['tafram']>) => {
      const poster = taFramKortposter(metoder.find((m) => m.id === t.metod)!, t.poster).map((p) => ({ titel: p.titel, niva: p.niva, nr: p.nr, en: p.en, farg: p.farg, taggar: p.taggar, stycke: p.stycken[0] ?? '', fraga: p.fragor[0] ?? '', fragor: p.fragor.length > 1, bild: p.bild }));
      return [las(TAFRAMSMALL).toString('utf8').replace(/\r\n/g, '\n'), stycke('/* Boksidan (Boksida.astro)', '/* Två lösningar (Textpar.astro'), bokfarger, taggfarger, JSON.stringify(poster), ...poster.filter((p) => p.bild).map((p) => bildSumma(p.bild.replace(/^\//, '')))].join('|');
    };
    const metodbankSumma = () => {
      const mall = las(METODBANKSMALL).toString('utf8').replace(/\r\n/g, '\n');
      const kortet = las('src/components/Metodkort.astro').toString('utf8').replace(/\r\n/g, '\n');
      const stil = [stycke('\n* { box-sizing', '\n.hopp-lank'), stycke('\n.kort {', '\n.meta {'), stycke('/* Metodbanken: korten', '\n.samla {')].join('|');
      return [mall, kortet, stil, designsystem('--farg-accent', mall + stil)].join('|');
    };
    return utan.map((k) => {
      const h = createHash('sha256');
      for (const del of [...gemensamt, designsystem(k.farg), JSON.stringify(k), bildSumma(k.bild), bildSumma(portratt), ...(k.skrivkort ? [skrivkortSumma(k.skrivkort)] : []), ...(k.kortbank ? [kortbankSumma(k.kortbank)] : []), ...(k.metodbank ? [metodbankSumma()] : []), ...(k.tafram ? [taframSumma(k.tafram)] : [])]) h.update(del);
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
