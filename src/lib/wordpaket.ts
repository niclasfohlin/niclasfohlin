// Packar en Word-fil med likadana sidhuvuden och sidfötter som en och samma del (K-151). docx-biblioteket skriver ett
// eget sidhuvud och en egen sidfot för varje avsnitt, också när de är likadana: Word-filen med hela De fyra räknesätten
// hade 18 par, där 13 sidhuvuden och 12 sidfötter var samma text, och Textsamtal i grupps mallfil 115 par, 158 av 371 kB.
// Niclas vill ha lågt fotavtryck i docx (2026-10-05, och "lågt kb" 2026-09-30).
//
// Filen byggs med bibliotekets egen packare (Packer.compiler, den som Packer.toBuffer och Packer.toBlob använder), så att
// webbläsaren inte behöver ett eget zip-bibliotek. Före packningen slås delar med samma innehåll och samma relationer
// ihop: avsnittens relationer pekar på den första av dem, och de andra tas bort ur filen och ur [Content_Types].xml.
// Varje avsnitt har kvar sin egen hänvisning till sidhuvudet och sidfoten, så Word och Google Dokument läser filen som
// förut (scripts/wordjmf.mjs och scripts/googleprov.mjs, 2026-10-05). Körs vid bygget och i webbläsaren
// (src/pages/stodundervisning/index.astro); inga Node-beroenden.
import { Packer, type File as WordDokument } from 'docx';

type ZipDel = { async(typ: 'string'): Promise<string> };
type Zip = {
  files: Record<string, unknown>;
  file(namn: string): ZipDel | null;
  file(namn: string, data: string): unknown;
  remove(namn: string): unknown;
  generateAsync(o: { type: string; mimeType: string; compression: string }): Promise<unknown>;
};
const kompilator = (Packer as unknown as { compiler: { compile(dok: WordDokument, formatera?: unknown, ersatt?: unknown[]): Zip } }).compiler;
const WORD_TYP = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const egnaRelationer = (del: string) => del.replace(/^word\//, 'word/_rels/') + '.rels';
const nummer = (del: string) => Number(del.match(/(\d+)\.xml$/)?.[1] ?? 0);

/** Slår ihop sidhuvuden och sidfötter med samma innehåll i den kompilerade filen. Ger antalet delar som togs bort. */
async function delaLikadana(zip: Zip): Promise<number> {
  // Sidhuvudena först och sedan sidfötterna, var för sig i nummerordning, så att den första av likadana delar behålls.
  const arHuvud = (n: string) => n.startsWith('word/header');
  const delar = Object.keys(zip.files).filter((n) => /^word\/(header|footer)\d+\.xml$/.test(n)).sort((a, b) => (arHuvud(a) === arHuvud(b) ? nummer(a) - nummer(b) : arHuvud(a) ? -1 : 1));
  if (delar.length < 2) return 0;
  const relFil = 'word/_rels/document.xml.rels';
  let relationer = await zip.file(relFil)!.async('string');
  let typer = await zip.file('[Content_Types].xml')!.async('string');
  const forsta = new Map<string, string>();
  let borttagna = 0;
  for (const del of delar) {
    const egna = zip.file(egnaRelationer(del));
    const nyckel = [arHuvud(del) ? 'header' : 'footer', await zip.file(del)!.async('string'), egna ? await egna.async('string') : ''].join('\u0000');
    const kort = del.slice('word/'.length);
    const behallen = forsta.get(nyckel);
    if (!behallen) { forsta.set(nyckel, kort); continue; }
    relationer = relationer.split(`Target="${kort}"`).join(`Target="${behallen}"`);
    typer = typer.replace(new RegExp(`<Override[^>]*PartName="/word/${kort.replace('.', '\\.')}"[^>]*/>`), '');
    zip.remove(del);
    if (egna) zip.remove(egnaRelationer(del));
    borttagna++;
  }
  zip.file(relFil, relationer);
  zip.file('[Content_Types].xml', typer);
  return borttagna;
}

/** Word-filen som bytes (vid bygget) eller som en Blob (i webbläsaren), med likadana sidhuvuden och sidfötter delade. */
export async function packaWord(dok: WordDokument, typ: 'nodebuffer'): Promise<Uint8Array>;
export async function packaWord(dok: WordDokument, typ: 'blob'): Promise<Blob>;
export async function packaWord(dok: WordDokument, typ: 'nodebuffer' | 'blob'): Promise<Uint8Array | Blob> {
  const zip = kompilator.compile(dok, undefined, []);
  await delaLikadana(zip);
  return (await zip.generateAsync({ type: typ, mimeType: WORD_TYP, compression: 'DEFLATE' })) as Uint8Array | Blob;
}
