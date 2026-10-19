// En Word-fils innehåll som en kontrollsumma: är det samma fil som förut, eller som den som ligger ute?
// Två skript frågar: scripts/bankpdf.mjs (ska pdf:en göras om?) och scripts/googleprov.mjs --andrade (vilka Word-filer
// skiljer sig från dem på sajten?). Summan räknar det läsaren ser: texten, tabellerna och formerna i document.xml,
// sidhuvudena och sidfötterna, bildernas svg och fotona (jpg), och typsnitten som filen bäddar in. Den räknar inte det som
// skiftar utan att filen ändras:
//   bildernas löpnummer och interna id (K-212: numren beror på i vilken ordning bygget gör filerna),
//   radsluten i en svg-fil, som git checkar ut med CRLF på Windows och Netlify har med LF (K-178: googleprov räknade
//   58 filer som ändrade 2026-10-12, fast 17 var det, och jämförelsen tog över en timme),
//   reservbilderna (png), som ritas ur svg-filerna vid bygget med verktyg som kan skilja i bildpunkter mellan datorn och
//   Netlify, och filens datum.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const DELAR = /^word\/(document|header\d*|footer\d*)\.xml$/;

/** Kontrollsumman av en Word-fils innehåll. data: filen som Buffer. forst: något som ska räknas med, som typsnittens summa.
 * allt: räkna också formatmallarna, numreringen och png-bilder som inte är en svg-bilds reservbild. Jämförelsen med filerna
 * som ligger ute (googleprov.mjs) behöver det: en ändrad textstorlek i en formatmall ändrar sidorna utan att document.xml
 * ändras (granskningen 2026-10-12). Bankens pdf:er räknas utan, så att deras summor står kvar. */
export async function wordinnehall(data, forst = '', { allt = false } = {}) {
  const zip = await JSZip.loadAsync(data);
  const delar = [];
  const utanId = (xml) => xml
    .replace(/\s(?:id|name)="[^"]*"/g, '')
    .replace(/\sr:(?:embed|id|link)="[^"]*"/g, '')
    .replace(/\sw:(?:id|rsid\w*)="[^"]*"/g, '')
    // Bokmärkena där en ram eller ett blad börjar (sidkartan i src/lib/metoddocx.ts) syns inte och ändrar inga sidor.
    .replace(/<w:bookmark(?:Start|End)\b[^>]*\/>/g, '');
  for (const namn of Object.keys(zip.files).sort()) {
    if (DELAR.test(namn)) delar.push(`${namn.replace(/\d+/g, '#')}:${sha(utanId(await zip.file(namn).async('string')))}`);
  }
  // Sidhuvudenas och sidfötternas nummer i filnamnen kan skifta; summorna sorteras.
  delar.sort();
  const bilder = [];
  for (const namn of Object.keys(zip.files)) {
    if (/^word\/media\/.+\.svg$/i.test(namn)) bilder.push(sha((await zip.file(namn).async('string')).replace(/\r\n/g, '\n')));
    // Foton, som litteraturlistans omslag, är filer ur public/ och lika överallt.
    else if (/^word\/media\/.+\.jpe?g$/i.test(namn)) bilder.push(sha(await zip.file(namn).async('nodebuffer')));
  }
  if (allt) {
    for (const namn of ['word/styles.xml', 'word/numbering.xml']) if (zip.file(namn)) delar.push(`${namn}:${sha(utanId(await zip.file(namn).async('string')))}`);
    // En svg-bild har en reservbild i png, som bilden själv pekar ut (a:blip med svgBlip i sig). Andra png-bilder är
    // fristående och räknas.
    const reserv = new Set();
    for (const namn of Object.keys(zip.files).filter((n) => DELAR.test(n))) {
      const rels = zip.file(`${namn.replace('word/', 'word/_rels/')}.rels`);
      if (!rels) continue;
      const mal = new Map();
      for (const m of (await rels.async('string')).matchAll(/<Relationship\b[^>]*>/g)) {
        const id = m[0].match(/\bId="([^"]+)"/)?.[1];
        const target = m[0].match(/\bTarget="([^"]+)"/)?.[1];
        if (id && target) mal.set(id, target);
      }
      const xml = await zip.file(namn).async('string');
      for (const m of xml.matchAll(/<a:blip\b[^>]*>/g)) {
        // En bild utan svg (ett foto) har en tom a:blip, som slutar med snedstreck.
        if (m[0].endsWith('/>')) continue;
        const id = m[0].match(/r:embed="([^"]+)"/)?.[1];
        const slut = xml.indexOf('</a:blip>', m.index);
        if (id && slut > 0 && xml.slice(m.index, slut).includes('svgBlip') && mal.has(id)) reserv.add(`word/${mal.get(id)}`);
      }
    }
    for (const namn of Object.keys(zip.files)) if (/^word\/media\/.+\.png$/i.test(namn) && !reserv.has(namn)) bilder.push(sha(await zip.file(namn).async('nodebuffer')));
  }
  return sha([forst, ...delar, ...bilder.sort()].join('\n'));
}

// Summan som Word-filens pdf bär i public/stodundervisning/bank-pdf.json (scripts/bankpdf.mjs gör pdf:en om när den
// ändras, och scripts/googleprov.mjs återanvänder pdf:en när den stämmer): innehållet ovan och typsnitten som Word-filerna
// bäddar in, så att ett nytt tecken i elevens typsnitt gör om pdf:en. Faktatexternas Anton räknas bara för en Word-fil
// som bär typsnittet, så att de pdf:er som gjordes innan typsnittet fanns behöll sina summor (Faktatextsamtal i grupp,
// 2026-10-13). rot är repots rot.
const TYPSNITT = ['public/fonts/ljudlek-elev/LjudlekElev-Regular.ttf', 'public/fonts/boksida/Cinzel-dokument.ttf', 'public/fonts/boksida/CinzelDecorative-dokument.ttf'];
const ANTON = 'public/fonts/faktatext/Anton-dokument.ttf';
const shaAv = (b) => createHash('sha256').update(b).digest('hex');
const typsnittensSumma = new Map();
export async function wordPdfensSumma(data, rot) {
  if (!typsnittensSumma.has(rot)) {
    const typsnitt = shaAv(TYPSNITT.map((f) => (existsSync(join(rot, f)) ? shaAv(readFileSync(join(rot, f))) : `saknas:${f}`)).join('|'));
    const anton = existsSync(join(rot, ANTON)) ? shaAv(readFileSync(join(rot, ANTON))) : `saknas:${ANTON}`;
    typsnittensSumma.set(rot, { typsnitt, anton });
  }
  const { typsnitt, anton } = typsnittensSumma.get(rot);
  const tabell = await (await JSZip.loadAsync(data)).file('word/fontTable.xml')?.async('string') ?? '';
  return wordinnehall(data, /w:name="Anton"/.test(tabell) ? `${typsnitt}|${anton}` : typsnitt);
}
