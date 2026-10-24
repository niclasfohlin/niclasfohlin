// Metodens avsnitt och ankare: avsnitten i sidans meny, och ankarna för de fria tabellerna, ramarna, lektionernas delar och
// mallarna, i den ordning metodens sida ger dem. Metodens sida (Metod.astro) och planen (src/lib/metodsaker.ts) läser samma
// funktioner, så att en länk från planen alltid leder till det ankare som sidan har (K-493).
import type { MetodData } from './metod';
import { metodensBlad } from './karta';

// Urvalsavsnittets rubrik är en fråga ("Var hittar du materialet och talen?"); menyn tar dess kärna ("Materialet och
// talen"), så att posten säger vad avsnittet gäller och inte krockar med ramarnas "Material per årskurs" (K-034).
const urvalNamn = (rubrik: string) => {
  const karna = (rubrik.match(/^Var hittar du (.+?)\??$/i) ?? rubrik.match(/^Var (.+?) finns\??$/i))?.[1] ?? rubrik;
  return karna.charAt(0).toLocaleUpperCase('sv') + karna.slice(1);
};

/**
 * Sidnavigationen: de avsnitt som finns, i modellens ordning, med korta namn. pass: metoden har en passöversikt
 * (passOversikt), stegen: stegens namn (passOrd), lektionsbank: menyns namn på den generella metodens lektionsbank.
 */
export function metodensAvsnitt(d: MetodData, o: { pass: boolean; stegen: string; lektionsbank?: string }): { id: string; namn: string }[] {
  return [
    d.passrutin && { id: 'passrutin', namn: o.pass ? 'Passet' : 'Passrutin' },
    d.tidsschema && !o.pass && { id: 'tidsschema', namn: 'Tidsschema' },
    d.steg && { id: 'steg', namn: o.stegen },
    d.arbetsform && { id: 'arbetsform', namn: 'Arbetsform' },
    d.exempel && { id: 'exempel', namn: 'Exempel' },
    d.fastnar && { id: 'fastnar', namn: 'När det fastnar' },
    d.roll && { id: 'roll', namn: 'Lärarens roll' },
    // Heter urvalets kärna som ramarna ("Var hittar du problemen?" och Problemen) står det som en handling, Hitta problemen,
    // så att menyn inte har två poster med samma namn (Problemlösning i grupp, 2026-10-10).
    d.urval && { id: 'urval', namn: d.ramar && urvalNamn(d.urval.rubrik) === d.ramar.rubrik ? `Hitta ${d.ramar.rubrik.toLowerCase()}` : urvalNamn(d.urval.rubrik) },
    o.lektionsbank && { id: 'lektionsbank', namn: o.lektionsbank },
    d.hem && { id: 'hem', namn: 'Hem och skola' },
    d.progression && { id: 'progression', namn: 'Progression' },
    d.uppfoljning && { id: 'uppfoljning', namn: 'Uppföljning' },
    d.mal && { id: 'mal', namn: 'Mål' },
    d.snabbmall && { id: 'snabbmall', namn: 'Snabbmall' },
    d.checklista && { id: 'checklista', namn: 'Checklista' },
    d.grund && { id: 'grund', namn: 'Grunden' },
    d.ramar && { id: 'ramar', namn: d.ramar.rubrik },
    d.diplom && { id: 'diplom', namn: d.diplom.rubrik },
    d.mallar.length > 0 && { id: 'mallar', namn: 'Mallar' },
  ].filter((a): a is { id: string; namn: string } => Boolean(a));
}

// Stabila ankare för rutorna, de fria tabellerna och ramarna, så att en lektion kan länka till avsnittet i den generella
// metoden (Ljudlek i grupp, Seriefot och skriptet i [id].astro): rubrikens första led i gemener, som "Ordbanken" #ordbanken
// och "Dagens ljud: bokstävernas ordning" #dagens-ljud. Ett ankare som redan finns får en siffra efter sig.
export const ankarnamn = (s: string) => s.split(':')[0].toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Ankarna i sidans ordning: tabellerna, ramarna, lektionernas delar och kursens blad (räknebladen, som "Addition 1").
 * ankare ger fler ankare i samma följd (listorna i Metod.astro), så att ett namn aldrig får två ankare.
 */
export function metodensAnkare(d: MetodData, avsnitt: { id: string }[]) {
  const ramar = d.ramar?.ramar ?? [];
  const upptagna = new Set([...avsnitt.map((a) => a.id), 'upplagg', 'gruppen', 'principer', 'lektionsbank', 'ramar', ...ramar.map((_, i) => `ram-${i + 1}`)]);
  const ankare = (s: string) => { let id = ankarnamn(s) || 'avsnitt'; for (let n = 2; upptagna.has(id); n++) id = `${ankarnamn(s)}-${n}`; upptagna.add(id); return id; };
  const tabellAnkare = new Map(d.tabeller.map((t) => [t, ankare(t.rubrik)]));
  const ramAnkare = ramar.map((r) => ankare(r.rubrik));
  // Veckorna som lektioner (en ram med lektioner, De fyra räknesätten, Niclas 2026-10-04): varje del har ett eget ankare, som
  // korten överst i ramen leder till, och ramen står i menyn med namnet efter kolon ("Till läraren: veckorna" blir Veckorna).
  const delAnkare = ramar.map((r) => (r.lektioner ? r.delar.map((del) => ankare(del.rubrik)) : []));
  // Kursens blad (src/lib/karta.ts): ett ankare för varje blad, som kartan och planen leder till.
  const blad = metodensBlad(d);
  const bladAnkare = new Map([...blad].map(([namn, plats]) => [`${plats.ri}-${plats.li}`, ankare(`blad ${namn}`)]));
  return { ankare, tabellAnkare, ramAnkare, delAnkare, blad, bladAnkare };
}

/**
 * Mallarnas ankare under Mallar att skriva ut, som "mall-lyssningsbladet", så att en text kan leda till mallen (K-493). De
 * står för sig, med mall först, och krockar därför inte med ramarnas; två mallar med samma namn får en siffra efter sig.
 */
export function mallarnasAnkare(d: MetodData): string[] {
  const sedda = new Set<string>();
  return d.mallar.map((m) => {
    let id = `mall-${ankarnamn(m.rubrik) || 'mall'}`;
    for (let n = 2; sedda.has(id); n++) id = `mall-${ankarnamn(m.rubrik) || 'mall'}-${n}`;
    sedda.add(id);
    return id;
  });
}
