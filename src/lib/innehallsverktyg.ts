// Verktyget Innehåll (K-793; Niclas 2026-11-15: ”en form av artikel med stödmallar”, och om sidan: ”snyggt, designat och
// enkelt att förstå, läsa, hämta rätt mallar”). En artikel om didaktikens vad och varför, med fem frågor och en sist,
// kärnans tre delar (Tänk till, Märk och Fråga eleverna) och fyra mallar. Riggen skriver texten och mallarna, och
// scripts/innehall/intag.mjs tar in leveransen till src/data/innehall/. Formen valdes efter idéuppdrag till en Sonnet och
// en Opus (underlag/prov/innehall/ide/): artikeln i antikvan med Börja här överst, mallarna som små kort som leder till sin
// ruta i texten och knapparna i rutan, så att varje fil har en knapp.
//
// Frågorna har en rot, fragor i datan: rutan Börja här, frågorna i Tänk till, raderna i Min innehållsanalys (intaget prövar
// att de är lika), kortet i metoderna och blocket i Före i Lär dig metoden läser dem därifrån.
import VERKTYGET from '../data/innehall/verktyget.json';
import type { Papper } from './strategipapper';

export type Fraga = { id: string; nr: string; fraga: string; kort: string; text: string; mall: string };
export type Ruta = { rubrik: string; text: string };
export type Tabell = { huvud: string[]; bredder?: number[]; rader: string[][] };
export type Mallruta = { id: string | string[]; rubrik: string; text: string[] };
export type Block = { stycke: string } | { ruta: Ruta } | { fragorna: true } | { tabell: Tabell } | { mall: Mallruta };
export type Avsnitt = { id: string; del?: number; rubrik: string; block: Block[] };
export type Mall = { id: string; namn: string; for: string; slag: 'papper' | 'elevblad' };
export type Exempel = { id: string; titel: string; rubrik: string; ruta: Ruta[] };
export type Verktyget = {
  titel: string;
  underrubrik: string;
  ingress: string;
  borjaHar: { fore: string; efter: string[] };
  fragor: Fraga[];
  avsnitt: Avsnitt[];
  karta: { fil: string; bredd: number; hojd: number; telefon: { fil: string; bredd: number; hojd: number }; alt: string; text: string };
  forskning: { rubrik: string; stycken: string[] };
  kallor: string;
  fore: string;
  mallar: Mall[];
  exempel: Exempel[];
  bild: { fil: string; bredd: number; hojd: number; alt: string };
};

export const INNEHALL = VERKTYGET as Verktyget;
/** Verktygets sida, som står i src/data/centrala.json med samma adress. */
export const INNEHALLETS_ADRESS = '/innehall';
/** Bilden, boken som spegel och fönster, 900 × 560 som strukturernas bilder. */
export const INNEHALLETS_BILD = `${INNEHALLETS_ADRESS}/${INNEHALL.bild.fil}`;
/** Verktygets färger på kortet i metoderna (src/lib/vav.ts), kartans bruna, som --farg-innehall i global.css. */
export const INNEHALLETS_STIL = '--slag: #8a5a1e; --slag-ljus: #fbf3e4; --slag-mork: #5c3a10';

/** Frågans adress på sidan: #fraga-1 till #fraga-5 och #fraga-sist. */
export const fragansAnkare = (f: Fraga): string => `fraga-${f.nr.toLowerCase()}`;
/** Frågans nummer som det står i rutan: 1 till 5 och Sist. */
export const fragansNr = (f: Fraga): string => f.nr;

/** Kärnans tre delar, de avsnitt som har del, i ordning: Tänk till, Märk och Fråga eleverna. */
export const karnansDelar = (): Avsnitt[] => INNEHALL.avsnitt.filter((a) => a.del !== undefined).sort((a, b) => (a.del ?? 0) - (b.del ?? 0));
/** Delens korta namn, rubriken före kolon: ”Tänk till”, ”Märk”, ”Fråga eleverna”. */
export const delensNamn = (a: Avsnitt): string => a.rubrik.split(':')[0].trim();
/** Delens text efter kolon, som står under namnet. */
export const delensFraga = (a: Avsnitt): string => a.rubrik.split(':').slice(1).join(':').trim();

// Mallarnas och exemplens filer. Ett papper blir en Word-fil i bankens kedja, /stodundervisning/innehall-<id>.docx, som
// Word sparar som pdf i valideringen (scripts/bankpdf.mjs), som Lässtrategier. Elevernas blad är riggens html, som
// scripts/innehall/elevblad.mjs trycker till /innehall/<id>.pdf med Chrome.
const PAPPER = import.meta.glob<Papper>('../data/innehall/papper/*.json', { eager: true, import: 'default' });
const papperAv = (id: string): Papper | undefined => Object.entries(PAPPER).find(([fil]) => fil.endsWith(`/${id}.json`))?.[1];
/** Filens namn utan ändelse i /stodundervisning/, för ett papper. */
export const papperetsNamn = (id: string): string => `innehall-${id}`;
/** Antalet sidor i ett papper: framsidan, och baksidan när den finns. */
export const papperetsSidor = (p: Papper): number => (p.baksida ? 2 : 1);

/** Mallarna och exemplen som är papper, med Word-filens namn: Word-filerna och pdf:erna görs av dem. */
export function innehalletsPapper(): { id: string; namn: string; rubrik: string; papper: Papper; sidor: number }[] {
  const ut: { id: string; namn: string; rubrik: string; papper: Papper; sidor: number }[] = [];
  for (const m of INNEHALL.mallar.filter((x) => x.slag === 'papper')) {
    const p = papperAv(m.id);
    if (!p) throw new Error(`Innehåll: mallen ${m.namn} saknar sitt papper, src/data/innehall/papper/${m.id}.json. Kör node scripts/innehall/intag.mjs.`);
    ut.push({ id: m.id, namn: papperetsNamn(m.id), rubrik: `Innehåll: ${m.namn}`, papper: p, sidor: papperetsSidor(p) });
  }
  for (const e of INNEHALL.exempel) {
    const p = papperAv(e.id);
    if (!p) throw new Error(`Innehåll: exemplet ${e.titel} saknar sitt papper, src/data/innehall/papper/${e.id}.json. Kör node scripts/innehall/intag.mjs.`);
    ut.push({ id: e.id, namn: papperetsNamn(e.id), rubrik: `Innehåll: ${e.rubrik}`, papper: p, sidor: papperetsSidor(p) });
  }
  return ut;
}
/** Ett pappers innehåll efter Word-filens namn, eller undefined. */
export const innehalletsPapperAv = (namn: string): Papper | undefined => innehalletsPapper().find((x) => x.namn === namn)?.papper;

/** Filerna som en mall eller ett exempel har: Word-filen och dess pdf för ett papper, pdf:en för ett elevblad. */
export function filerFor(id: string): { word?: string; pdf: string; namn: string } {
  const m = INNEHALL.mallar.find((x) => x.id === id);
  const e = INNEHALL.exempel.find((x) => x.id === id);
  if (!m && !e) throw new Error(`Innehåll: ${id} är ingen mall eller inget exempel.`);
  if (m?.slag === 'elevblad') return { pdf: `${INNEHALLETS_ADRESS}/${id}.pdf`, namn: m.namn };
  const bas = `/stodundervisning/${papperetsNamn(id)}`;
  return { word: bas, pdf: `${bas}.pdf`, namn: m?.namn ?? e!.rubrik };
}

/** Mallen som exemplen fyller i: de står efter dess ruta i texten, eftersom de är mallen ifylld (Opus form A). Intaget
 *  prövar att varje exempel har rutan Före, Efter och I klassrummet överst. */
export const EXEMPLENS_MALL = 'min-innehallsanalys';

/** Mallens ruta i texten: avsnittet och rutan där mallens knappar står. */
export function mallensRuta(id: string): { avsnitt: Avsnitt; ruta: Mallruta } | undefined {
  for (const a of INNEHALL.avsnitt) for (const b of a.block) if ('mall' in b && [b.mall.id].flat().includes(id)) return { avsnitt: a, ruta: b.mall };
  return undefined;
}
/** Mallens adress på sidan: rutan där knapparna står. */
export const mallensAnkare = (id: string): string => `mall-${id}`;
