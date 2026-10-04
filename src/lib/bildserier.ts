// Bildserierna (Seriesamtal, metodriggens TILL-SAJTEN 2026-10-04): tre former med rutor ritade i kod ur metodriggen
// (src/lib/serieritning.js). En ram med serie visar en bildserie ur metodens scenfil (src/data/bildserier/<id>.json),
// en ram med ark ett ark att klippa ut (bubblorna), och en mall med typ serie tomma rutor att rita i. Rutorna ritas vid
// bygget som svg-filer under /stodundervisning/<id>/serier/ (src/pages/stodundervisning/[id]/serier/[fil].svg.ts):
// sidan visar dem, utskriften skriver ut dem och Word-filen bäddar in dem. Webbläsaren som bygger en Word-fil av flera
// metoder hämtar samma filer i stället för att rita dem, så att varje bild är byte för byte den som bygget gjorde
// reservbilden till (src/lib/reservbild.ts). Här står bara adresserna, så att modulen kan köras i webbläsaren;
// scenerna läses och rutorna ritas i src/lib/bildserier-bygge.ts.
import type { MetodData } from './metod';

export type SerieMall = MetodData['mallar'][number];
// Antalet rutor i varje bildserie som metodens ramar visar, ur scenfilen (bildserier-bygge.ts). Webbläsaren får det med
// metoden i metoder.json, så att den vet vilka filer den ska hämta.
export type Serieantal = Record<string, number>;

export const serieMapp = (id: string) => `/stodundervisning/${id}/serier`;
// Mallens namn i filens namn: "Nästa gång" blir nasta-gang.
const filnamn = (s: string) => s.toLowerCase().replace(/[åä]/g, 'a').replace(/ö/g, 'o').replace(/é/g, 'e').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const serieAdress = (id: string, serie: string, nr: number) => `${serieMapp(id)}/${serie}-${nr}.svg`;
export const mallAdress = (id: string, m: SerieMall, nr: number) => `${serieMapp(id)}/mall-${filnamn(m.rubrik)}-${nr}.svg`;
export const arkAdress = (id: string, ark: string) => `${serieMapp(id)}/ark-${ark}.svg`;
export const arSerieMall = (m: SerieMall) => m.typ === 'serie';
// Seriemallens namn på rutorna, när den har namn i stället för nummer.
export const mallEtiketter = (m: SerieMall): string[] | undefined => (Array.isArray(m.etiketter) ? m.etiketter : undefined);

// Rutornas adresser i ordning: en bildserie och en seriemall.
export const serieRutor = (id: string, serie: string, antal: number) => Array.from({ length: antal }, (_, i) => serieAdress(id, serie, i + 1));
export const mallRutor = (id: string, m: SerieMall) => Array.from({ length: m.rutor ?? 0 }, (_, i) => mallAdress(id, m, i + 1));

// Alla filer metoden har, i den ordning de står: bildserierna och arken i ramarnas ordning, sedan mallarna.
export function serieBilder(d: MetodData, id: string, antal: Serieantal = {}): string[] {
  const ut: string[] = [];
  for (const ram of d.ramar?.ramar ?? []) {
    if (ram.serie) {
      const n = antal[ram.serie];
      if (!n) throw new Error(`${id}: bildserien "${ram.serie}" (ramen ${ram.rubrik}) har inga rutor i src/data/bildserier/${id}.json.`);
      ut.push(...serieRutor(id, ram.serie, n));
    }
    if (ram.ark) ut.push(arkAdress(id, ram.ark));
  }
  for (const m of d.mallar.filter(arSerieMall)) ut.push(...mallRutor(id, m));
  return [...new Set(ut)];
}

// En svg-fils mått ur viewBox: rutorna är 800 × 450, sex rutor 520 × 450, två med namn 800 × 720, arket 190 × 260 mm.
export function svgMatt(svg: string | Uint8Array): { bredd: number; hojd: number } {
  const text = typeof svg === 'string' ? svg : new TextDecoder().decode(svg.subarray(0, 300));
  const m = text.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!m) throw new Error('bildserier: svg-filen saknar viewBox');
  return { bredd: Number(m[1]), hojd: Number(m[2]) };
}

// Rutans alternativtext: berättelsens rad om rutan när ramen har en ("Ruta 1" i Berättelsen att läsa högt), annars ramens
// namn och rutans nummer. Samma text på sidan och i Word-filen.
type SerieRam = { rubrik: string; delar: { falt: { rubrik: string; text: string }[] }[] };
export function rutansText(ram: SerieRam, nr: number, antal: number): string {
  const rad = ram.delar.flatMap((d) => d.falt).find((f) => f.rubrik.trim() === `Ruta ${nr}` && f.text.trim());
  return rad ? `Ruta ${nr}: ${rad.text.trim()}` : antal === 1 ? ram.rubrik : `${ram.rubrik}, ruta ${nr}`;
}
