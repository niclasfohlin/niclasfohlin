// Veckans material (Niclas 2026-10-06 om Ordverkstad i grupp: "Man måste leta omkring för att hitta vecka 2 på 3
// ställen", och ordkorten "ska kunna tillhöra varje text och förlaga"; "Det är inte första gången detta händer"). Det
// gäller "allt som har med speciellt material för en vecka att göra (och inte bara är generellt material)". I en kurs
// med veckor (en ram med lektioner, där varje del är en vecka) hör det material som nämner en enda vecka till den veckan:
//   en ram vars rubrik har veckan som ett led, som "Förlaga, vecka 2: Välkommen till Äventyrsbadet", och
//   en lista med kort att klippa vars rubrik har veckan som ett led, som "Vecka 2 · Ordkort".
// Ett led är det som står mellan komma, kolon och punkten " · ". "Protokollet: vecka 1–3" nämner tre veckor och gäller
// hela kursen, liksom allt som inte nämner någon vecka.
//
// Sidan och utskriften (Metod.astro) och Word-filerna (metoddocx.ts) ställer veckans material direkt efter veckans sida,
// i filens ordning, och materialets lista (ramindex.ts) får en rad per vecka med länkar till det. Allt annat står kvar i
// filens ordning, efter veckorna: en ram vars listor står vid veckorna (Ordkorten) står kvar med sin text och sin ruta
// Till läraren, bland det som gäller hela kursen. Inga nya fält: en ny metod får det av sig själv när materialet heter
// efter veckan. Bygget stannar på en rubrik som nämner en vecka som inte finns, flera veckor eller en lista vid en vecka
// som inte är kort (veckofel, content.config.ts), och scripts/veckoprov.mjs i npm run validera stannar tills kursens
// sortering är genomgången. Inga Node-beroenden, så att filen också kan köras i webbläsaren, där Word-filen av flera
// metoder byggs.
import { forstaLed } from './karta';

type Lista = { rubrik?: string };
type Ram = { rubrik: string; lektioner?: boolean; delar: { rubrik: string }[]; listor?: Lista[] };
type Metod = { ramar?: { ramar: Ram[] }; kort?: { listor: string[] } };

/** Något som hör till en vecka: en hel ram, eller en lista i en ram. namn är vad det är utan veckan ("Förlaga", "Ordkort"). */
export type Veckosak = { typ: 'ram'; ri: number; namn: string } | { typ: 'lista'; ri: number; li: number; namn: string };
/** En vecka: delens index i ramen med lektioner, första ledet ("Vecka 2"), hela rubriken och veckans material. */
export interface Vecka { di: number; led: string; rubrik: string; saker: Veckosak[] }
export interface Veckomaterial {
  /** Ramen med lektioner, som index i ramarna. */
  ri: number;
  veckor: Vecka[];
  /** Ramar som står vid en vecka i sin helhet: ramens index och veckans. */
  ramar: Map<number, number>;
  /** Listor som står vid en vecka: ramens index, och listans index med veckans. */
  listor: Map<number, Map<number, number>>;
}

// Led jämförs utan hänsyn till versaler, hårda mellanslag och ordfogar: "vecka 2" är "Vecka 2".
const jamn = (s: string) => s.toLowerCase().replace(/\u2060/g, '').replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim();
// Skiljetecknen mellan led: komma och kolon före ett mellanslag (så att "0,5" och "10:30" står kvar), punkten " · " och
// radbrytning.
const SKILJE = /\s*(?:[,:](?=\s)|·|\n)\s*/;
/** Rubrikens led: det som står mellan komma, kolon, punkten " · " och radbrytning. */
export const rubrikensLed = (s: string) => s.split(SKILJE).map((x) => x.trim()).filter(Boolean);
const versal = (s: string) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);
const flykt = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type Kurs = { ri: number; veckor: Vecka[]; nycklar: Map<string, number>; ord: string[] };
// En kurs har en ram med lektioner. Har metoden flera (två projekt med var sina veckor) säger "vecka 2" inte vilken
// av dem som menas, och då står materialet kvar i filens ordning.
function kursen(ramar: Ram[]): Kurs | undefined {
  if (ramar.filter((r) => r.lektioner).length !== 1) return undefined;
  const ri = ramar.findIndex((r) => r.lektioner);
  const veckor: Vecka[] = ramar[ri].delar.map((del, di) => ({ di, led: forstaLed(del.rubrik), rubrik: del.rubrik, saker: [] }));
  // Kursens ord: det som står före talet i delarnas första led ("vecka" ur "Vecka 2"), också när kursen börjar med en del
  // utan tal ("Före kursen").
  const ord = [...new Set(veckor.map((v) => jamn(v.led).match(/^(.*\D) \d+$/)?.[1]).filter((x): x is string => !!x))];
  return { ri, veckor, nycklar: new Map(veckor.map((v) => [jamn(v.led), v.di])), ord };
}
// Veckan som en rubrik nämner, när den nämner exakt en.
function veckaFor(k: Kurs, rubrik?: string): number | undefined {
  const traffar = new Set(rubrikensLed(rubrik ?? '').map((l) => k.nycklar.get(jamn(l))).filter((x): x is number => x !== undefined));
  return traffar.size === 1 ? [...traffar][0] : undefined;
}
// Rubriken utan veckans led och skiljetecknet intill, som den står: "Vecka 2 · Läs orden, kolumn för kolumn" blir
// "Läs orden, kolumn för kolumn".
function utanVeckan(rubrik: string, led: string): string {
  const delar = rubrik.split(new RegExp(`(${SKILJE.source})`));
  const i = delar.findIndex((x, j) => j % 2 === 0 && jamn(x) === jamn(led));
  if (i < 0) return rubrik.trim();
  delar.splice(i === 0 ? 0 : i - 1, 2);
  return delar.join('').trim();
}

/** Kursens veckor med sitt material, eller undefined när metoden saknar veckor eller inget material nämner en vecka. */
export function veckomaterial(d: Metod): Veckomaterial | undefined {
  const ramar = d.ramar?.ramar ?? [];
  const k = kursen(ramar);
  if (!k) return undefined;
  const ut: Veckomaterial = { ri: k.ri, veckor: k.veckor, ramar: new Map(), listor: new Map() };
  const titlar = new Map<Veckosak, string>();
  ramar.forEach((ram, ri) => {
    if (ram.lektioner) return;
    const di = veckaFor(k, ram.rubrik);
    if (di !== undefined) {
      ut.ramar.set(ri, di);
      const rest = utanVeckan(ram.rubrik, k.veckor[di].led);
      const sak: Veckosak = { typ: 'ram', ri, namn: versal(rubrikensLed(rest)[0] ?? ram.rubrik) };
      titlar.set(sak, versal(rest));
      k.veckor[di].saker.push(sak);
      return;
    }
    const lagda = new Map<number, number>();
    (ram.listor ?? []).forEach((l, li) => {
      const v = veckaFor(k, l.rubrik);
      if (v === undefined) return;
      lagda.set(li, v);
      k.veckor[v].saker.push({ typ: 'lista', ri, li, namn: versal(utanVeckan(l.rubrik ?? '', k.veckor[v].led) || ram.rubrik) });
    });
    if (lagda.size) ut.listor.set(ri, lagda);
  });
  // Två saker i samma vecka med samma namn (två förlagor) får hela namnet, så att länkarna i listan skiljer sig åt.
  for (const v of k.veckor) {
    const dubbla = v.saker.filter((x) => v.saker.some((y) => y !== x && y.namn === x.namn));
    for (const x of dubbla) if (titlar.has(x)) x.namn = titlar.get(x)!;
  }
  return k.veckor.some((v) => v.saker.length) ? ut : undefined;
}

/** En lista som står vid en vecka ritas som en ram med bara den listan, utan ramens rubrik, text och rutor: listan bär
 * sin egen rubrik ("Vecka 2 · Ordkort"). Samma kopia på sidan (Metod.astro) och i Word (metoddocx.ts). */
export function veckansLista<R extends { text: string[]; delar: unknown[]; listor?: unknown[] }>(ram: R, li: number): R {
  return { ...ram, text: [], delar: [], huvud: undefined, oversikt: undefined, serie: undefined, ark: undefined, sagoform: undefined, listor: [ram.listor![li]] };
}

// Ett led som ser ut som en av kursens delar: kursens ord och ett tal ("Vecka 9").
const enhetsled = (led: string, k: Kurs) => k.ord.some((o) => new RegExp(`^${flykt(o)} \\d+$`).test(jamn(led)));
// Ett led som fortsätter en uppräkning efter en vecka: "4 och 6" i "vecka 2, 4 och 6".
const upprakning = (led: string) => /^\d+(\s*(,|och)\s*\d+)*$/.test(jamn(led)) || /^och \d+$/.test(jamn(led));

/** Rubriker som bygget stannar på (content.config.ts), eftersom materialet annars skulle hamna fel utan att någon ser
 * det: en vecka som inte finns ("Vecka 9 · Ordkort" i en kurs på åtta veckor), flera veckor i en rubrik, en uppräkning
 * ("vecka 2, 4 och 6") och en lista vid en vecka som inte är kort att klippa. */
export function veckofel(d: Metod): { ri: number; li?: number; text: string }[] {
  const ramar = d.ramar?.ramar ?? [];
  const k = kursen(ramar);
  if (!k || !k.ord.length) return [];
  const fel: { ri: number; li?: number; text: string }[] = [];
  const spann = `Det som hör till flera veckor skrivs som ett spann, som "${k.ord[0]} 1–3", och gäller då hela kursen.`;
  const prova = (rubrik: string | undefined, vad: string, ri: number, li?: number) => {
    const alla = rubrikensLed(rubrik ?? '');
    const led = alla.filter((l) => enhetsled(l, k));
    const okanda = led.filter((l) => !k.nycklar.has(jamn(l)));
    if (okanda.length) fel.push({ ri, li, text: `${vad} "${rubrik}" nämner ${okanda.join(' och ')}, som inte finns bland kursens ${k.veckor.length} delar (${k.veckor[0].led} till ${k.veckor.at(-1)!.led}).` });
    else if (new Set(led.map(jamn)).size > 1) fel.push({ ri, li, text: `${vad} "${rubrik}" nämner flera av kursens delar (${led.join(', ')}). ${spann}` });
    else if (alla.some((l, i) => i > 0 && enhetsled(alla[i - 1], k) && upprakning(l))) fel.push({ ri, li, text: `${vad} "${rubrik}" räknar upp flera av kursens delar efter varandra. ${spann}` });
  };
  ramar.forEach((ram, ri) => {
    if (ram.lektioner) return;
    prova(ram.rubrik, 'Ramen', ri);
    const ramensVecka = veckaFor(k, ram.rubrik);
    (ram.listor ?? []).forEach((l, li) => {
      prova(l.rubrik, 'Listan', ri, li);
      // Vid en vecka står hela ramar och kort att klippa. En annan lista (en läxa, en ordlista, ett räkneblad) har ramens
      // namnrad, ruta och sidor att hålla ihop med, och det gör bara en egen ram.
      const v = ramensVecka === undefined ? veckaFor(k, l.rubrik) : undefined;
      if (v !== undefined && !(d.kort?.listor ?? []).some((t) => (l.rubrik ?? '').includes(t))) {
        fel.push({ ri, li, text: `Listan "${l.rubrik}" i ramen "${ram.rubrik}" hör till ${k.veckor[v].led} men är inte kort att klippa (kort.listor). Vid en vecka står hela ramar och kort: skriv bladet som en egen ram per vecka, "<vad>, ${k.veckor[v].led.toLowerCase()}: <titel>".` });
      }
    });
  });
  return fel;
}

/** Material som ser ut att höra till veckorna utan att stå vid dem. scripts/veckoprov.mjs frågar, och inskrivningen
 * kräver ett skäl:
 *   en rubrik där kursens ord och ett tal står utan att vara ett eget led ("Förlaga vecka 2: …", "Vecka 2 – Ordkort"),
 *   en ram med lika många listor som kursen har veckor, eller dubbelt så många, och
 *   lika många ramar som veckor, eller dubbelt så många, med samma första led ("Förlaga 1: …" till "Förlaga 8: …"). */
export function veckofragor(d: Metod): string[] {
  const ramar = d.ramar?.ramar ?? [];
  const k = kursen(ramar);
  if (!k || k.veckor.length < 2) return [];
  const vm = veckomaterial(d);
  const n = k.veckor.length;
  const fria = (ri: number) => !ramar[ri].lektioner && !vm?.ramar.has(ri);
  const ut: string[] = [];
  const nastan = (rubrik: string | undefined) => k.ord.some((o) => {
    const m = jamn(rubrik ?? '').match(new RegExp(`(^|[^\\p{L}])${flykt(o)} \\d+(?!\\d)(\\s*[–-]\\s*\\d+)?`, 'u'));
    return !!m && !m[2];
  });
  ramar.forEach((ram, ri) => {
    if (!fria(ri)) return;
    if (nastan(ram.rubrik)) ut.push(`Ramen "${ram.rubrik}" nämner en vecka utan att veckan är ett eget led. Hör den till veckan, ska den heta "<vad>, ${k.veckor[0].led.toLowerCase()}: <titel>".`);
    const lagda = vm?.listor.get(ri);
    const kvar = (ram.listor ?? []).filter((_, li) => !lagda?.has(li));
    for (const l of kvar) if (nastan(l.rubrik)) ut.push(`Listan "${l.rubrik}" i ramen "${ram.rubrik}" nämner en vecka utan att veckan är ett eget led. Hör den till veckan, ska den heta "${k.veckor[0].led} · <vad>".`);
    if (!lagda && (kvar.length === n || kvar.length === 2 * n)) ut.push(`Ramen "${ram.rubrik}" har ${kvar.length} listor och kursen ${n} veckor. Är det listor per vecka, ska de heta "${k.veckor[0].led} · <vad>", så att de står vid sin vecka.`);
  });
  // Ramar med samma första led, utan siffrorna sist i ledet ("Förlaga 1" och "Förlaga 2" är samma led).
  const grupper = new Map<string, number[]>();
  ramar.forEach((ram, ri) => {
    if (!fria(ri) || vm?.listor.has(ri)) return;
    const led = jamn(rubrikensLed(ram.rubrik)[0] ?? '').replace(/ \d+$/, '');
    grupper.set(led, [...(grupper.get(led) ?? []), ri]);
  });
  for (const grupp of grupper.values()) {
    if (grupp.length === n || grupp.length === 2 * n) ut.push(`${grupp.length} ramar börjar med "${rubrikensLed(ramar[grupp[0]].rubrik)[0]}" och kursen har ${n} veckor. Är det ramar per vecka, ska de heta "<vad>, ${k.veckor[0].led.toLowerCase()}: <titel>", så att de står vid sin vecka.`);
  }
  return ut;
}

/** Veckorna som nämns i rubrikerna i en metod utan en ram med lektioner ("Vecka 1: Lika delar", "Vecka 2 · Åk 1 · …").
 * Där kan koden inte ställa materialet vid veckan, så scripts/veckoprov.mjs frågar hur veckans material står samlat. */
export function veckorUtanKurs(d: Metod): number[] {
  const ramar = d.ramar?.ramar ?? [];
  if (kursen(ramar)) return [];
  const tal = new Set<number>();
  const las = (rubrik?: string) => { for (const m of jamn(rubrik ?? '').matchAll(/(?:^|[^\p{L}])vecka (\d+)(?!\d)(\s*[–-]\s*\d+)?/gu)) if (!m[2]) tal.add(Number(m[1])); };
  for (const ram of ramar) { las(ram.rubrik); for (const l of ram.listor ?? []) las(l.rubrik); }
  return [...tal].sort((a, b) => a - b);
}
