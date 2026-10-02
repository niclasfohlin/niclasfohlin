#!/usr/bin/env node
// Provar en metod i stödundervisning efter bygget: att sidan och Word-filerna finns i dist,
// att upphovet står i varje Word-sektion, att modellens delar syns på sidan, att texten ur
// underlaget finns kvar, och tar skärmbilder med Chrome om det finns.
//
//   node scripts/metodprov.mjs <id>                          Kontrollera dist för metoden
//   node scripts/metodprov.mjs <id> --underlag <fil.md>      Jämför också meningarna i underlaget
//   node scripts/metodprov.mjs <id> --bilder                 Skärmbilder (desktop, mobil, utskrift) till underlag/prov/<id>/
//
// Kör npm run validera först så att dist är aktuell. Avslutar med 1 vid fel.

import { existsSync, readFileSync, readdirSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import JSZip from 'jszip';
import { wordPdfSync } from 'wordparitet';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
if (!id) {
  console.error('Ange metodens id: node scripts/metodprov.mjs <id> [--underlag <fil>] [--bilder]');
  process.exit(1);
}
const underlag = args.includes('--underlag') ? args[args.indexOf('--underlag') + 1] : null;
const bilder = args.includes('--bilder');
const fel = [];
const ok = (text) => console.log(`  ok   ${text}`);
const nej = (text) => { fel.push(text); console.log(`  FEL  ${text}`); };

// 1. Källfilen och modellen.
const yamlFil = join(rot, 'src/content/stodundervisning', `${id}.yaml`);
if (!existsSync(yamlFil)) { console.error(`Hittar inte ${yamlFil}`); process.exit(1); }
const metod = parseYaml(readFileSync(yamlFil, 'utf8'));
console.log(`\n${metod.titel} (${id})`);
const delar = ['inledning', 'upplagg', 'gruppen', 'principer', 'passrutin', 'tidsschema', 'steg', 'arbetsform', 'tabeller', 'exempel', 'fastnar', 'roll', 'urval', 'hem', 'progression', 'uppfoljning', 'mal', 'snabbmall', 'checklista', 'grund', 'ramar', 'diplom'];
const finns = delar.filter((d) => metod[d] && (!Array.isArray(metod[d]) || metod[d].length));
console.log(`  delar i modellen: ${finns.join(', ')}`);
if (metod.utkast) console.log('  obs  utkast: true, metoden byggs inte i produktion');
// 1b. Dagord där metoden räknar i pass: med färre än fyra pass i veckan är nästa pass inte nästa dag
// (boksamtal och faktatextsamtal sa "nästa dag" till 2026-09-27). En varning, eftersom ordet kan stå i en elevtext.
const talord = { ett: 1, en: 1, två: 2, tre: 3, fyra: 4, fem: 5, sex: 6 };
const hurOfta = (metod.tid ?? '').split(/ per pass,?\s*/)[1] ?? '';
const minstPass = Number(hurOfta.match(/\d+/)?.[0]) || talord[(hurOfta.match(/^[a-zåäö]+/i)?.[0] ?? '').toLowerCase()];
if (minstPass && minstPass < 4) {
  const dagord = [];
  const leta = (v, sti) => {
    if (typeof v === 'string') { if (/nästa dag|dagen efter|i morgon|imorgon/i.test(v)) dagord.push(sti); }
    else if (v && typeof v === 'object') for (const [k, u] of Object.entries(v)) leta(u, sti ? `${sti}.${k}` : k);
  };
  leta(metod, '');
  if (dagord.length) for (const s of dagord) console.log(`  obs  "nästa dag" eller liknande i ${s}, men metoden har ${minstPass} pass i veckan: menas nästa pass?`);
  else ok(`inga dagord där metoden räknar i pass (${minstPass} pass i veckan)`);
}

// 2. Bygget: sidan, JSON och Word-filerna.
const dist = join(rot, 'dist/stodundervisning');
const sida = join(dist, id, 'index.html');
const html = existsSync(sida) ? readFileSync(sida, 'utf8') : '';
html ? ok(`sidan finns (${(statSync(sida).size / 1024).toFixed(1)} kB)`) : nej('sidan saknas i dist; kör npm run validera');
if (html) {
  for (const d of finns.filter((x) => !['inledning', 'upplagg', 'gruppen', 'principer', 'tabeller'].includes(x))) {
    html.includes(`id="${d}"`) ? ok(`avsnittet ${d} finns på sidan`) : nej(`avsnittet ${d} saknas på sidan`);
  }
  html.includes('© Niclas Fohlin') ? ok('upphovet står på sidan') : nej('upphovet saknas på sidan');
  html.includes(`/stodundervisning/${id}.docx`) ? ok('nedladdningslänken finns') : nej('nedladdningslänken saknas');

  // 2b. Mottagarläsning som går att pröva maskinellt. Fet stil betyder rubrik: i en fri tabell
  // eller en ordlista (klassen fri) står rubrikerna i rad 1, så första kolumnen får inte vara radrubrik.
  const friaTabeller = [...html.matchAll(/<table class="m-tabell fri[^"]*">[\s\S]*?<\/table>/g)].map((m) => m[0]);
  const fetForsta = friaTabeller.filter((t) => /<th scope="row"/.test(t)).length;
  fetForsta ? nej(`${fetForsta} fria tabeller har fet första kolumn fast rubrikerna står i rad 1 (MetodTabell radrubrik)`) : ok(`${friaTabeller.length} fria tabeller och listor har vanlig text i första kolumnen`);
  // Ett spann som "F–3" får inte kunna brytas så att siffran hamnar på nästa rad: metod.ts ejBryt lägger ett ordfogtecken.
  const huvud = html.match(/<header class="metod-huvud">[\s\S]*?<\/header>/)?.[0] ?? '';
  const brytbara = [...huvud.matchAll(/\S–(?!⁠)\d/g)].map((m) => m[0]);
  brytbara.length ? nej(`spann som kan brytas över rad i sidhuvudet: ${brytbara.join(', ')} (ejBryt saknas)`) : ok('spannen i sidhuvudet kan inte brytas över rad');
  // En tabellrad skriven med versaler är en mellanrubrik och ska ritas som rubrikrad, inte som vanlig rad.
  const versalRader = [...html.matchAll(/<tr>(?:<td[^>]*>(?:<span class="forsta">)?[^<]*<\/span>?<\/td>){2,}<\/tr>/g)].map((m) => m[0]).filter((r) => { const celler = [...r.matchAll(/>([^<]+)</g)].map((x) => x[1].trim()).filter(Boolean); return celler.length > 1 && celler.every((c) => c === c.toUpperCase() && /\p{L}/u.test(c)); });
  versalRader.length ? nej(`${versalRader.length} rader med bara versaler ritas som vanliga rader i stället för mellanrubrik`) : ok('inga versalrader ritas som vanliga rader');
}
const json = join(dist, 'metoder.json');
if (existsSync(json)) {
  const alla = JSON.parse(readFileSync(json, 'utf8')).metoder;
  alla.some((m) => m.id === id) ? ok('metoden finns i metoder.json') : nej('metoden saknas i metoder.json');
} else nej('metoder.json saknas');

async function provaDocx(fil, namn) {
  if (!existsSync(fil)) { nej(`${namn} saknas`); return; }
  const zip = await JSZip.loadAsync(readFileSync(fil));
  const dokument = await zip.file('word/document.xml')?.async('string');
  // Upphovet per sektion: i sidfoten, eller på boksidorna (lästexterna) i sidhuvudet, där sidfoten är riggens rad Till
  // läraren och nivåns knapp. Varje sektion ska bära © Niclas Fohlin i den ena eller den andra.
  const rels = (await zip.file('word/_rels/document.xml.rels')?.async('string')) ?? '';
  const delar = new Map([...rels.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], `word/${m[2].replace(/^\/?word\//, '')}`]));
  const harUpphov = new Map();
  for (const f of Object.keys(zip.files).filter((x) => /^word\/(header|footer)\d*\.xml$/.test(x))) harUpphov.set(f, (await zip.file(f).async('string')).includes('© Niclas Fohlin'));
  const sektionsdelar = [...(dokument ?? '').matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)].map((m) => [...m[0].matchAll(/<w:(?:header|footer)Reference\b[^>]*r:id="([^"]+)"/g)].map((r) => delar.get(r[1])));
  const sektioner = sektionsdelar.length;
  const upphov = sektionsdelar.filter((d) => d.some((f) => harUpphov.get(f))).length;
  const fotter = { length: sektioner };
  const stilar = await zip.file('word/styles.xml')?.async('string');
  const dubbla = ['Heading1', 'Heading2'].filter((s) => (stilar?.match(new RegExp(`w:styleId="${s}"`, 'g')) || []).length > 1);
  const text = (dokument || '').replace(/<[^>]+>/g, ' ');
  text.includes(metod.titel) ? ok(`${namn}: titeln finns`) : nej(`${namn}: titeln saknas`);
  upphov === fotter.length && fotter.length > 0 ? ok(`${namn}: upphov i alla ${sektioner} sektioner`) : nej(`${namn}: upphov i ${upphov} av ${fotter.length} sektioner (sidfoten, eller sidhuvudet på en boksida)`);
  dubbla.length === 0 ? ok(`${namn}: en definition per rubrikstil`) : nej(`${namn}: dubbla stilar ${dubbla.join(', ')}`);
  console.log(`       ${(statSync(fil).size / 1024).toFixed(1)} kB`);
}
await provaDocx(join(dist, `${id}.docx`), 'allt om metoden (docx)');
await provaDocx(join(dist, `${id}-mallar.docx`), 'mallarna (docx)');
if (metod.lathund) {
  const lathund = join(dist, id, 'lathund', 'index.html');
  existsSync(lathund) && readFileSync(lathund, 'utf8').includes('© Niclas Fohlin') ? ok('lathundssidan finns med upphov') : nej('lathundssidan saknas eller saknar upphov');
  html.includes(`/stodundervisning/${id}/lathund`) ? ok('metodsidan länkar till lathunden') : nej('metodsidan länkar inte till lathunden');
  await provaDocx(join(dist, `${id}-lathund.docx`), 'lathunden (docx)');
  // Lathunden som PowerPoint: exakt fyra bilder, upphovet i varje bilds anteckning.
  const pptx = join(dist, `${id}-lathund.pptx`);
  if (existsSync(pptx)) {
    const zip = await JSZip.loadAsync(readFileSync(pptx));
    const bilder = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    const noter = Object.keys(zip.files).filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f));
    let upphov = 0;
    for (const f of noter) if ((await zip.file(f).async('string')).includes('© Niclas Fohlin')) upphov++;
    bilder.length === 4 ? ok('lathunden (pptx): fyra bilder') : nej(`lathunden (pptx): ${bilder.length} bilder, ska vara fyra`);
    upphov === 4 ? ok('lathunden (pptx): upphov i alla fyra anteckningar') : nej(`lathunden (pptx): upphov i ${upphov} av 4 anteckningar`);
    html.includes(`/stodundervisning/${id}-lathund.pptx`) ? ok('metodsidan länkar till lathundens pptx') : nej('metodsidan länkar inte till lathundens pptx');
    console.log(`       ${(statSync(pptx).size / 1024).toFixed(1)} kB`);
  } else nej('lathunden (pptx) saknas i dist');
} else console.log('  obs  ingen lathund i metoden');

// 3. Underlaget: meningar som ska finnas kvar i YAML-filen.
if (underlag) {
  const norm = (s) => s.toLowerCase().replace(/[”“"’'*_`|<>#•]/g, '').replace(/\s+/g, ' ').replace(/[–—-]/g, '-').replace(/\s\./g, '.').trim();
  const text = readFileSync(resolve(underlag), 'utf8').replace(/<[^>]+>/g, ' ').replace(/^\|?[-:| ]+\|?$/gm, ' ').replace(/\|/g, ' . ').replace(/^\s*[-•>]\s*/gm, '').replace(/^\s*\d+\.\s+/gm, '');
  const meningar = [...new Set(text.split(/(?<=[.?!])\s+|\n+/).map(norm).filter((m) => m.length >= 25))];
  const yaml = norm(readFileSync(yamlFil, 'utf8'));
  const saknas = meningar.filter((m) => !yaml.includes(m));
  console.log(`  underlag: ${meningar.length} meningar, ${meningar.length - saknas.length} finns ordagrant, ${saknas.length} avviker:`);
  for (const s of saknas) console.log(`       - ${s}`);
  console.log('       (avvikelser är ofta avsiktliga ändringar eller tabellformat; läs igenom listan)');
}

// 4. Skärmbilder med Chrome, om det finns.
if (bilder) {
  const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
  if (!chrome) nej('Chrome hittades inte, inga skärmbilder');
  else {
    const mapp = join(rot, 'underlag/prov', id);
    mkdirSync(mapp, { recursive: true });
    const port = 4323;
    // --ignore-lock: Astro 7 kör annars förhandsservern som en bakgrundsprocess med låsfil, och en
    // kvarglömd sådan skulle stoppa vår från att starta.
    const server = spawn('npx', ['astro', 'preview', '--port', String(port), '--ignore-lock'], { cwd: rot, shell: true, stdio: 'ignore' });
    const url = `http://localhost:${port}/stodundervisning/${id}`;
    // Vänta tills servern svarar på riktigt; en fast väntetid gav felsidor som skärmbilder.
    let svarar = false;
    for (let i = 0; i < 60 && !svarar; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      svarar = await fetch(url, { redirect: 'manual' }).then((r) => r.ok).catch(() => false);
    }
    if (!svarar) {
      nej(`förhandsservern svarade inte på ${url} inom 60 sekunder, inga skärmbilder`);
      try { execFileSync('taskkill', ['/F', '/T', '/PID', String(server.pid)], { stdio: 'ignore' }); } catch { server.kill(); }
      console.log(fel.length ? `\n${fel.length} fel.` : '\nAllt ok.');
      process.exit(1);
    }
    // Skärmbilderna tas med scripts/skarmbild.mjs, som emulerar en riktig mobil; headless Chrome
    // har en minsta fönsterbredd och ger annars en beskuren bredare sida. Utskriften tas direkt.
    const bild = (adress, fil, extra = []) => execFileSync(process.execPath, [join(rot, 'scripts/skarmbild.mjs'), adress, join(mapp, fil), ...extra], { stdio: 'ignore', timeout: 600000 });
    const tryck = (adress, fil) => execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${join(mapp, fil)}`, adress], { stdio: 'ignore', timeout: 60000 });
    // Förra körningens skärmbilder tas bort först, så att mappen bara har bilder av sidan som den är nu (granskningen
    // 2026-09-30: mobil-8.png var tre dagar äldre än resten).
    for (const f of readdirSync(mapp)) if (/^(lathund-)?(desktop|mobil)(-\d+)?\.png$/.test(f)) unlinkSync(join(mapp, f));
    try {
      bild(url, 'desktop.png');
      bild(url, 'mobil.png', ['--mobil']);
      tryck(url, 'utskrift.pdf');
      ok(`skärmbilder i ${mapp}: desktop.png, mobil.png, utskrift.pdf`);
      // Utskriften av sidan ska likna Word-filen: varje mall på en egen liggande sida i riktigt mått (arken per talsort
      // hänvisar till planeringsmallarna i stället). Sidantalet skrivs ut, så att en utskrift som växer syns.
      try {
        const info = execFileSync('pdfinfo', ['-f', '1', '-l', '9999', join(mapp, 'utskrift.pdf')], { encoding: 'utf8' });
        const storlekar = [...info.matchAll(/Page\s+\d+ size:\s+([\d.]+) x ([\d.]+)/g)];
        const liggande = storlekar.filter((s) => Number(s[1]) > Number(s[2])).length;
        const mallar = (metod.mallar ?? []).filter((m) => !(m.typ === 'matta' && m.enPerSida)).length;
        if (mallar) liggande >= mallar ? ok(`utskriften: ${storlekar.length} sidor, varav ${liggande} liggande för ${mallar} mallar`) : nej(`utskriften har ${liggande} liggande sidor, men metoden har ${mallar} mallar som ska stå liggande`);
        else ok(`utskriften: ${storlekar.length} sidor`);
      } catch { console.log('  obs  pdfinfo saknas, utskriftens sidor är inte räknade'); }
      // Huvudfilmens stillbilder (fältet film): rutan står på sidan 1, direkt efter faktarutan, både i utskriften och i
      // Word-filen med allt (Niclas 2026-09-30: "på s. 1 alltid"). Att varje film står i båda, och extrafilmerna på samma
      // plats i båda, prövar scripts/paritet.mjs i varje validering; att bygget har en huvudfilm, src/lib/film.ts.
      // Word-filen med allt som pdf, gjord av Word (wordPdfSync i wordparitet), så att sidorna prövas som Word lägger dem.
      const wordPdf = join(mapp, 'word.pdf');
      let wordSidor;
      try {
        wordPdfSync(join(rot, 'dist/stodundervisning', `${id}.docx`), wordPdf, { timeout: 180000 });
        wordSidor = execFileSync('pdftotext', ['-enc', 'UTF-8', wordPdf, '-'], { encoding: 'utf8' }).split('\f').map((t) => t.replace(/\s+/g, ' '));
      } catch { console.log('  obs  Word eller pdftotext saknas, Word-filens sidor är inte prövade'); }
      if (metod.film) {
        const sista = metod.film.stillbilder[3].text;
        const sida1 = (pdf) => execFileSync('pdftotext', ['-enc', 'UTF-8', '-f', '1', '-l', '1', pdf, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
        try {
          sida1(join(mapp, 'utskrift.pdf')).includes(sista) ? ok('utskriften: huvudfilmens fyra stillbilder står på sidan 1') : nej(`utskriften: huvudfilmens stillbilder ryms inte på sidan 1 (”${sista}” står inte där); korta faktarutans Material eller ingressen`);
        } catch { console.log('  obs  pdftotext saknas, filmens stillbilder i utskriften är inte prövade'); }
        if (wordSidor) (wordSidor[0] ?? '').includes(sista) ? ok('Word: huvudfilmens fyra stillbilder står på sidan 1') : nej(`Word: huvudfilmens stillbilder ryms inte på sidan 1 (”${sista}” står inte där); korta faktarutans Material eller ingressen`);
      }
      // En sida i Word med bara sidhuvud och sidfot (granskningen 2026-09-30: tomma sidor efter mattorna, när elevens
      // typsnitt gav raderna dubbel höjd): texten utan raderna med adressen och sidnumret är tom.
      if (wordSidor) {
        const tomma = wordSidor.map((t, i) => [i + 1, t.split(metod.titel).join('').replace(/niclasfohlin\.se\S*/g, '').replace(/Sida \d+ av \d+/g, '').replace(/Niclas Fohlin|Mall|Lathund/gi, '').replace(/[\s·©]/g, '')]).filter(([i, t]) => !t && i < wordSidor.length).map(([i]) => i);
        tomma.length ? nej(`Word: sidan ${tomma.join(', ')} har bara sidhuvud och sidfot`) : ok(`Word: ${wordSidor.length - 1} sidor, ingen tom`);
      }
      // Läskorten (K-063): varje lästräningstext är ett A4 med båda korten, med stöd och utan stöd, som i Word. Står
      // korten på var sin sida har texten eller utskriftens mått vuxit (Upprepad läsning 2026-09-27: en marginal på 1 em
      // under varje mening gav 16 sidor i stället för 8).
      const laskort = (metod.ramar?.ramar ?? []).flatMap((r) => r.listor ?? []).filter((l) => (l.rader ?? []).some((r) => r.some((c) => String(c).includes('‿'))));
      if (laskort.length) {
        try {
          const sidor = execFileSync('pdftotext', ['-enc', 'UTF-8', join(mapp, 'utskrift.pdf'), '-'], { encoding: 'utf8' }).split('\f').map((s) => s.replace(/\s+/g, ' '));
          const isar = laskort.map((l) => (l.rubrik ?? '').match(/^\d+/)?.[0]).filter((nr) => nr && !sidor.some((s) => s.includes(`Lästräningstext ${nr} · med stöd`) && s.includes(`Lästräningstext ${nr} · utan stöd`)));
          isar.length ? nej(`läskorten för text ${isar.join(', ')} står på var sin sida i utskriften; varje text ska vara ett A4 med båda korten`) : ok(`utskriften: ${laskort.length} lästräningstexter, båda korten på samma sida`);
          if (wordSidor) {
            const isarW = laskort.map((l) => (l.rubrik ?? '').match(/^\d+/)?.[0]).filter((nr) => nr && !wordSidor.some((s) => s.includes(`Lästräningstext ${nr} · med stöd`) && s.includes(`Lästräningstext ${nr} · utan stöd`)));
            isarW.length ? nej(`Word: läskorten för text ${isarW.join(', ')} står på var sin sida; varje text ska vara ett A4 med båda korten`) : ok(`Word: ${laskort.length} lästräningstexter, båda korten på samma sida`);
          }
        } catch { console.log('  obs  pdftotext saknas, läskortens sidor i utskriften är inte prövade'); }
      }
      // Boksidorna (lästexterna, K-148; Niclas 2026-10-01: "En text per sida ska det vara. Så se till att inte blir något
      // knas. Varje text ska kunna skrivas ut så."): varje lästext står på en egen sida, med titeln, slutet av texten och
      // den sista frågan, i utskriften och i Word. Växer en text över sidan står slutet på nästa, och provet stannar; två
      // texter på samma sida stoppar också. Lästexten känns igen som i src/lib/ramform.ts (lastexter).
      const lastexter = (metod.ramar?.ramar ?? []).filter((ram) => {
        const m = String(ram.rubrik ?? '').match(/^([^,:]+), ([^:]+): (.+)$/);
        const [text, fragor] = ram.listor ?? [];
        return !!m && (ram.listor ?? []).length === 2 && text.rubrik === m[3] && fragor.rubrik === 'Frågorna' && !text.kolumner && !fragor.kolumner && !ram.huvud && !ram.oversikt;
      });
      if (lastexter.length) {
        const norm = (s) => String(s).normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
        // Textens och den sista frågans sista ord, vart för sig: en kort text slutar i raden under anfanget, och pdftotext
        // läser då ut den raden före resten (Saga A om räven i Skrivkurs: sagoboken, 2026-10-02), så att ett svep över de
        // sista tecknen inte hittas fast texten står hel på sidan.
        const sistaOrd = (s) => String(s).split(/\s+/).map(norm).filter(Boolean).slice(-6);
        const nycklar = lastexter.map((ram) => {
          const [text, fragor] = ram.listor;
          return { rubrik: ram.rubrik, delar: [norm(text.rubrik), ...sistaOrd(text.rader.at(-1)[0]), ...sistaOrd(fragor.rader.at(-1)[0])] };
        });
        const prova = (sidor, var_) => {
          const ns = sidor.map(norm);
          const paSida = ns.map((s) => nycklar.filter((k) => k.delar.every((x) => s.includes(x))));
          const inteEn = nycklar.filter((k) => paSida.filter((p) => p.includes(k)).length !== 1).map((k) => k.rubrik);
          const delade = paSida.map((p, i) => [i + 1, p]).filter(([, p]) => p.length > 1).map(([i]) => i);
          if (inteEn.length) nej(`${var_}: ${inteEn.length} lästexter står inte hela på en egen sida (${inteEn.slice(0, 4).join('; ')}${inteEn.length > 4 ? ' …' : ''}); varje text ska vara ett A4`);
          else if (delade.length) nej(`${var_}: två lästexter på samma sida (sidan ${delade.join(', ')})`);
          else ok(`${var_}: ${lastexter.length} lästexter, en hel sida var`);
        };
        try { prova(execFileSync('pdftotext', ['-enc', 'UTF-8', join(mapp, 'utskrift.pdf'), '-'], { encoding: 'utf8' }).split('\f'), 'utskriften'); } catch { console.log('  obs  pdftotext saknas, boksidorna i utskriften är inte prövade'); }
        if (wordSidor) prova(wordSidor, 'Word');
      }
      // Lärarens sidor (riggens ramar som heter Lärarens sida): varje sida står hel på ett blad, med rubriken och det sista
      // fältet på samma sida, i utskriften och i Word (granskningen 2026-10-01: i utskriften delades de på två eller tre).
      const lararsidor = (metod.ramar?.ramar ?? []).filter((ram) => /^Lärarens sida\b/.test(String(ram.rubrik ?? '')) && ram.delar?.length);
      if (lararsidor.length) {
        const norm = (s) => String(s).normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
        const nycklar = lararsidor.map((ram) => ({ rubrik: ram.rubrik, delar: [norm(ram.rubrik), norm(ram.delar.at(-1).falt.at(-1).text).slice(-40)] }));
        const prova = (sidor, var_) => {
          const ns = sidor.map(norm);
          const inteEn = nycklar.filter((k) => ns.filter((s) => k.delar.every((x) => s.includes(x))).length !== 1).map((k) => k.rubrik);
          inteEn.length ? nej(`${var_}: ${inteEn.length} av ${lararsidor.length} lärarsidor står inte hela på ett blad (${inteEn.slice(0, 3).join('; ')}${inteEn.length > 3 ? ' …' : ''})`) : ok(`${var_}: ${lararsidor.length} lärarsidor, ett helt blad var`);
        };
        try { prova(execFileSync('pdftotext', ['-enc', 'UTF-8', join(mapp, 'utskrift.pdf'), '-'], { encoding: 'utf8' }).split('\f'), 'utskriften'); } catch { console.log('  obs  pdftotext saknas, lärarsidorna i utskriften är inte prövade'); }
        if (wordSidor) prova(wordSidor, 'Word');
      }
  console.log('       Läs bilderna som en lärare som ska köra passet i morgon: fet stil betyder rubrik, inget bryts så att det läses fel,');
  console.log('       likvärdiga saker ser likadana ut, det läraren behöver kommer först. Dela höga bilder i bitar innan du läser dem.');
      if (metod.lathund) {
        const lurl = `${url}/lathund`;
        bild(lurl, 'lathund-desktop.png');
        bild(lurl, 'lathund-mobil.png', ['--mobil']);
        tryck(lurl, 'lathund-utskrift.pdf');
        try {
          const info = execFileSync('pdfinfo', [join(mapp, 'lathund-utskrift.pdf')], { encoding: 'utf8' });
          const sidor = Number((info.match(/Pages:\s+(\d+)/) || [])[1]);
          sidor === 4 ? ok('lathundens utskrift är fyra sidor') : nej(`lathundens utskrift är ${sidor} sidor, ska vara fyra`);
        } catch { console.log('  obs  pdfinfo saknas, sidantalet i lathund-utskrift.pdf är inte räknat'); }
      }
    } catch (e) {
      nej(`skärmbilderna misslyckades: ${e.message}`);
    } finally {
      // Förhandsservern startas via ett skal, så hela trädet stängs.
      try { execFileSync('taskkill', ['/F', '/T', '/PID', String(server.pid)], { stdio: 'ignore' }); } catch { server.kill(); }
    }
  }
}

console.log(fel.length ? `\n${fel.length} fel.` : '\nAllt ok.');
process.exit(fel.length ? 1 : 0);
