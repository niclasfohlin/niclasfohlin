// Strukturkorten två och två på A4 (K-650): webbläsaren skriver ut ett urval och bygget gör filen med alla kort ur samma
// funktion, så att utskriften är densamma. Varje kort är en pdf med två stående A4 och kortet på den övre halvan,
// framsidan och baksidan (scripts/strukturer/kort.mjs). Här tas den övre halvan av varje sida och läggs uppe eller nere på
// ett nytt A4 i den ordning standarden säger (strukturkortensArk), med en streckad linje att klippa längs mellan korten.
// Vanlig JavaScript med pdf-lib som argument, så att webbläsaren kan hämta pdf-lib först när någon skriver ut och bygget
// och provet kan köra samma kod.
import { strukturkortensArk } from './standard/strukturer.js';

const A4 = [595.28, 841.89];

/**
 * @param {typeof import('pdf-lib')} pdflib
 * @param {ArrayBuffer[] | Uint8Array[]} kort  kortens pdf:er i den ordning de ska skrivas ut
 * @param {{ titel?: string }} [o]
 * @returns {Promise<Uint8Array>}
 */
export async function strukturkortenTvaOchTva(pdflib, kort, { titel = 'Strukturkort' } = {}) {
  const { PDFDocument, rgb } = pdflib;
  const ut = await PDFDocument.create();
  ut.setTitle(titel);
  ut.setAuthor('Niclas Fohlin');
  const halva = A4[1] / 2;
  const kallor = await Promise.all(kort.map((b) => PDFDocument.load(b)));
  const inbaddat = new Map();
  const halvan = async (i, del) => {
    const nyckel = `${i}-${del}`;
    if (!inbaddat.has(nyckel)) {
      const sida = kallor[i].getPage(del === 'fram' ? 0 : 1);
      inbaddat.set(nyckel, await ut.embedPage(sida, { left: 0, bottom: halva, right: A4[0], top: A4[1] }));
    }
    return inbaddat.get(nyckel);
  };
  for (const ark of strukturkortensArk(kort.length)) {
    const sida = ut.addPage(A4);
    sida.drawPage(await halvan(ark.uppe, ark.del), { x: 0, y: halva });
    if (ark.nere !== null) sida.drawPage(await halvan(ark.nere, ark.del), { x: 0, y: 0 });
    sida.drawLine({ start: { x: 0, y: halva }, end: { x: A4[0], y: halva }, thickness: 1, color: rgb(0.6, 0.65, 0.69), dashArray: [4, 3] });
  }
  return ut.save();
}
