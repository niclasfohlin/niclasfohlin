#!/usr/bin/env node
// Lathundens räkning (Niclas 2026-10-07: "Det blir ingen drift eller knas när det står 1/4 på metoden men den nu är 2/5 i
// pptx och 1/4 i pdf? Värt att tänka till här så det automatiskt blir rätt").
//
// Regeln: lathunden är fyra sidor (src/lib/lathundsidor.ts), och de räknas 1/4 till 4/4 i varje fil: på sidan, i
// pdf:en, i Word-lathunden och i PowerPoint-filen. Filmbilden står först i PowerPoint-filen, heter Filmerna (Filmen för
// en film) och har inget nummer, eftersom metodernas texter hänvisar till lathundens sidor med nummer och samma text
// står i alla filer. Skriptet läser de byggda filerna och stannar när en etikett inte stämmer, när PowerPoint-filens
// filmbild saknas eller har fel antal filmer, eller när spelaren på lathundssidan inte har metodens filmer. Körs i
// npm run validera efter bygget.
//
// Undervisningsmetodernas lathund under Metoder (K-637) prövas på samma sätt: sidorna ur standarden (lathundensSidor)
// räknas 1/4 till 4/4 på sidan, i PowerPoint-filen och i pdf:en, med filmbilden utan nummer först i PowerPoint-filen och
// metodens filmer i spelaren, och pdf:en har fyra liggande A4-sidor med © Niclas Fohlin och niclasfohlin.se på varje.
// Word-lathunden är riggens och räknar sina sidor själv, så den prövas inte här. En metod som är utkast och inte står i
// bygget (utan METODER_UTKAST=1) prövas bara i pdf:en.
//
//   node scripts/lathundprov.mjs            alla publicerade metoder med lathund, ur dist
//   node scripts/lathundprov.mjs <id> …     bara de metoderna
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { parse as parseYaml } from 'yaml';
import { lathundensSidor } from '../src/lib/standard/index.js';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const valda = process.argv.slice(2).filter((a) => !a.startsWith('--'));
// Sidornas namn läses ur modulen som sidan och PowerPoint-filen räknar med, så att provet inte har en egen lista.
const lista = readFileSync(join(rot, 'src/lib/lathundsidor.ts'), 'utf8').match(/LATHUNDENS_SIDOR = \[([^\]]+)\]/);
if (!lista) { console.error('lathundprov: hittar inte LATHUNDENS_SIDOR i src/lib/lathundsidor.ts.'); process.exit(1); }
const SIDOR = [...lista[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const mapp = join(rot, 'src/content/stodundervisning');
const metoder = readdirSync(mapp)
  .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .map((f) => ({ id: f.slice(0, -5), d: parseYaml(readFileSync(join(mapp, f), 'utf8')) }))
  .filter((m) => !m.d.utkast && m.d.lathund && (!valda.length || valda.includes(m.id)));
const dist = join(rot, 'dist/stodundervisning');
if (!existsSync(dist)) { console.error('lathundprov: dist saknas. Kör npm run validera eller npx astro build först.'); process.exit(1); }
const etikett = (namn, nr, antal) => `${namn} · ${nr}/${antal}`;
const tat = (s) => s.replace(/\s+/g, ' ');
let pdftotext = true;
const fel = [];

for (const { id, d } of metoder) {
  const filmer = (d.film ? 1 : 0) + (d.filmer?.length ?? 0);
  const sager = (vad) => fel.push(`${id}: ${vad}`);
  // Lärarens repliker på sidan 2 (lathund.pass.repliker) ska stå som pratbubblor i alla fyra filerna.
  const repliker = (d.lathund?.pass?.repliker ?? []).map((r) => `”${r}”`);
  const utanStyrtecken = (s) => tat(s.replace(/[ ]/g, ' ').replace(/[⁠­]/g, ''));
  const saknade = (text) => repliker.filter((r) => !utanStyrtecken(text).includes(r));

  // PowerPoint-filen: bilderna i sin ordning, filmbilden först när metoden har film.
  const pptx = join(dist, `${id}-lathund.pptx`);
  if (!existsSync(pptx)) sager('PowerPoint-filen saknas i dist');
  else {
    const zip = await JSZip.loadAsync(readFileSync(pptx));
    const pres = await zip.file('ppt/presentation.xml').async('string');
    const rel = await zip.file('ppt/_rels/presentation.xml.rels').async('string');
    const bilder = [...pres.matchAll(/<p:sldId [^>]*r:id="(rId\d+)"/g)].map((m) => rel.match(new RegExp(`Id="${m[1]}"[^>]*Target="([^"]+)"`))?.[1]).map((t) => `ppt/${t}`);
    const namn = [...(filmer ? [filmer === 1 ? 'Filmen' : 'Filmerna'] : []), ...SIDOR];
    if (bilder.length !== namn.length) sager(`PowerPoint-filen har ${bilder.length} bilder, väntat ${namn.length} (${namn.join(', ')})`);
    const fore = filmer ? 1 : 0;
    for (const [i, fil] of bilder.entries()) {
      const xml = await zip.file(fil).async('string');
      // Filmbilden bär bara sitt namn; lathundens sidor räknas från 1 också när filmbilden står före dem.
      const vantad = i < fore ? (namn[i] ?? '').toUpperCase() : etikett((namn[i] ?? '').toUpperCase(), i + 1 - fore, SIDOR.length);
      if (!xml.includes(`<a:t>${vantad}</a:t>`)) sager(`PowerPoint-filens bild ${i + 1} bär inte etiketten "${vantad}"`);
      if (i === 0 && filmer) {
        const antal = (xml.match(/name="Media \d+"/g) ?? []).length;
        if (antal !== filmer) sager(`filmbilden har ${antal} filmer, metoden har ${filmer}`);
        if ((xml.match(/<p:video fullScrn="1">/g) ?? []).length !== filmer) sager('filmbildens filmer saknar uppspelning i helskärm');
      }
      if (i === fore + 1 && saknade(xml.replace(/<[^>]+>/g, ' ')).length) sager(`PowerPoint-filens sida 2 saknar replikerna ${saknade(xml.replace(/<[^>]+>/g, ' ')).join(' ')}`);
    }
  }

  // Lathundssidan: de fyra sidorna, och spelaren med metodens filmer.
  const sida = join(dist, id, 'lathund', 'index.html');
  if (!existsSync(sida)) sager('lathundssidan saknas i dist');
  else {
    const html = readFileSync(sida, 'utf8');
    const funna = [...html.matchAll(/<span class="lh-etikett">([^<]*)<\/span>/g)].map((m) => m[1]);
    const vantade = SIDOR.map((s, i) => etikett(s, i + 1, SIDOR.length));
    if (funna.join(' | ') !== vantade.join(' | ')) sager(`lathundssidan räknar "${funna.join(' | ')}", väntat "${vantade.join(' | ')}"`);
    const iSpelaren = (html.match(/data-filmspelare-film=/g) ?? []).length;
    if (iSpelaren !== filmer) sager(`spelaren på lathundssidan har ${iSpelaren} filmer, metoden har ${filmer}`);
    const bubblor = [...html.matchAll(/<p class="lh-bubbla"[^>]*>([^<]*)<\/p>/g)].map((m) => m[1]).join(' ');
    if (saknade(bubblor).length) sager(`lathundssidan saknar replikerna ${saknade(bubblor).join(' ')}`);
  }

  // Word-lathunden: de fyra sidorna.
  const docx = join(dist, `${id}-lathund.docx`);
  if (!existsSync(docx)) sager('Word-lathunden saknas i dist');
  else {
    const xml = await (await JSZip.loadAsync(readFileSync(docx))).file('word/document.xml').async('string');
    const text = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('');
    for (const [i, s] of SIDOR.entries()) if (!text.includes(etikett(s, i + 1, SIDOR.length))) sager(`Word-lathunden bär inte etiketten "${etikett(s, i + 1, SIDOR.length)}"`);
    if (saknade(text).length) sager(`Word-lathunden saknar replikerna ${saknade(text).join(' ')}`);
  }

  // Pdf:en: de fyra sidorna, en etikett per sida. Poppler finns där pdf:erna görs; saknas det prövas inte pdf:en.
  const pdf = join(rot, 'public/stodundervisning', `${id}-lathund.pdf`);
  if (!existsSync(pdf)) sager('lathundens pdf saknas');
  else if (pdftotext) {
    let sidor;
    try { sidor = execFileSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\f').filter((s) => s.trim()); } catch { pdftotext = false; }
    if (sidor) {
      if (sidor.length !== SIDOR.length) sager(`pdf:en har ${sidor.length} sidor, väntat ${SIDOR.length}`);
      for (const [i, s] of SIDOR.entries()) if (!tat(sidor[i] ?? '').includes(etikett(s.toUpperCase(), i + 1, SIDOR.length))) sager(`pdf:ens sida ${i + 1} bär inte etiketten "${etikett(s.toUpperCase(), i + 1, SIDOR.length)}"`);
      if (saknade(sidor[1] ?? '').length) sager(`pdf:ens sida 2 saknar replikerna ${saknade(sidor[1] ?? '').join(' ')}`);
    }
  }
}

// Undervisningsmetodernas lathund (K-637). Sidhuvudet följer umLathundHuvud i src/lib/lathundsidor.ts: den första sidan bär
// sitt namn i etiketten, "Metoden · 1/4", de andra bara numret, "2/4".
const umMapp = join(rot, 'src/content/undervisningsmetoder');
const umMetoder = readdirSync(umMapp)
  .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .map((f) => ({ id: f.slice(0, -5), d: parseYaml(readFileSync(join(umMapp, f), 'utf8')) }))
  .filter((m) => m.d.lathund && (!valda.length || valda.includes(m.id)));
const umEtikett = (s, antal) => `${s.nr === 1 ? `${s.namn} · ` : ''}${s.nr}/${antal}`;
const umDist = join(rot, 'dist/metoder');
let umByggda = 0;
for (const { id, d } of umMetoder) {
  const filmer = (d.film ? 1 : 0) + (d.filmer?.length ?? 0);
  const sager = (vad) => fel.push(`metoder/${id}: ${vad}`);
  const sidor = lathundensSidor(d);
  const vantade = sidor.map((s) => umEtikett(s, sidor.length));
  if (sidor.length !== 4) sager(`lathunden har ${sidor.length} sidor, ska vara fyra`);
  const sida = join(umDist, id, 'lathund', 'index.html');
  if (existsSync(sida)) {
    umByggda++;
    // PowerPoint-filen: filmbilden först utan nummer, sedan sidorna med sina etiketter.
    const pptx = join(umDist, `${id}-lathund.pptx`);
    if (!existsSync(pptx)) sager('PowerPoint-filen saknas i dist');
    else {
      const zip = await JSZip.loadAsync(readFileSync(pptx));
      const pres = await zip.file('ppt/presentation.xml').async('string');
      const rel = await zip.file('ppt/_rels/presentation.xml.rels').async('string');
      const bilder = [...pres.matchAll(/<p:sldId [^>]*r:id="(rId\d+)"/g)].map((m) => rel.match(new RegExp(`Id="${m[1]}"[^>]*Target="([^"]+)"`))?.[1]).map((t) => `ppt/${t}`);
      const fore = filmer ? 1 : 0;
      if (bilder.length !== sidor.length + fore) sager(`PowerPoint-filen har ${bilder.length} bilder, väntat ${sidor.length + fore}`);
      for (const [i, fil] of bilder.entries()) {
        const xml = await zip.file(fil).async('string');
        const vantad = i < fore ? (filmer === 1 ? 'FILMEN' : 'FILMERNA') : (vantade[i - fore] ?? '').toUpperCase();
        if (!xml.includes(`<a:t>${vantad}</a:t>`)) sager(`PowerPoint-filens bild ${i + 1} bär inte etiketten "${vantad}"`);
        if (i === 0 && filmer) {
          const antal = (xml.match(/name="Media \d+"/g) ?? []).length;
          if (antal !== filmer) sager(`filmbilden har ${antal} filmer, metoden har ${filmer}`);
          if ((xml.match(/<p:video fullScrn="1">/g) ?? []).length !== filmer) sager('filmbildens filmer saknar uppspelning i helskärm');
        }
      }
    }
    // Lathundssidan: sidornas etiketter och spelaren med metodens filmer.
    const html = readFileSync(sida, 'utf8');
    const funna = [...html.matchAll(/<span class="lh-etikett">([^<]*)<\/span>/g)].map((m) => m[1]);
    if (funna.join(' | ') !== vantade.join(' | ')) sager(`lathundssidan räknar "${funna.join(' | ')}", väntat "${vantade.join(' | ')}"`);
    const iSpelaren = (html.match(/data-filmspelare-film=/g) ?? []).length;
    if (iSpelaren !== filmer) sager(`spelaren på lathundssidan har ${iSpelaren} filmer, metoden har ${filmer}`);
  } else if (!d.utkast) sager('lathundssidan saknas i dist');
  // Pdf:en: fyra liggande A4-sidor ur PowerPoint, en etikett och upphovet på varje.
  const pdf = join(rot, 'public/metoder', `${id}-lathund.pdf`);
  if (!existsSync(pdf)) sager('lathundens pdf saknas (scripts/lathund-pdf.mjs)');
  else if (pdftotext) {
    let text;
    try { text = execFileSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\f').filter((s) => s.trim()); } catch { pdftotext = false; }
    if (text) {
      if (text.length !== sidor.length) sager(`pdf:en har ${text.length} sidor, väntat ${sidor.length}`);
      for (const [i, e] of vantade.entries()) {
        const s = tat(text[i] ?? '');
        if (!s.includes(e.toUpperCase())) sager(`pdf:ens sida ${i + 1} bär inte etiketten "${e.toUpperCase()}"`);
        if (!s.includes('© Niclas Fohlin') || !s.includes(`niclasfohlin.se/metoder/${id}/lathund`)) sager(`pdf:ens sida ${i + 1} saknar © Niclas Fohlin och adressen till lathundssidan`);
      }
      const liggande = [...execFileSync('pdfinfo', ['-f', '1', '-l', '99', pdf], { encoding: 'utf8' }).matchAll(/Page\s+\d+ size:\s+([\d.]+) x ([\d.]+)/g)].filter((m) => Number(m[1]) > Number(m[2])).length;
      if (liggande !== text.length) sager(`pdf:en har ${text.length - liggande} stående sidor, ska vara A4 liggande`);
    }
  }
}

if (fel.length) {
  console.error(`lathundprov: ${fel.length} fel. Lathundens sidor räknas 1/${SIDOR.length} till ${SIDOR.length}/${SIDOR.length} i varje fil (src/lib/lathundsidor.ts).\n${fel.map((r) => `  ${r}`).join('\n')}`);
  process.exit(1);
}
console.log(`Lathundarnas räkning: i ${metoder.length} metoder räknas lathundens sidor 1/${SIDOR.length} till ${SIDOR.length}/${SIDOR.length} i varje fil (sidan${pdftotext ? ', pdf:en' : ''}, Word och PowerPoint, där filmbilden står först utan nummer), och filmbilden och spelaren har metodens filmer.${pdftotext ? '' : ' Pdf:erna är inte prövade: pdftotext saknas.'}`);
console.log(`Metodernas lathund: i ${umMetoder.length} undervisningsmetoder räknas sidorna 1/4 till 4/4 i pdf:en${umByggda ? `, och i ${umByggda} av dem på sidan och i PowerPoint-filen, med filmbilden och spelaren` : ' (sidan och PowerPoint-filen står inte i bygget: utkast utan METODER_UTKAST=1)'}.`);
