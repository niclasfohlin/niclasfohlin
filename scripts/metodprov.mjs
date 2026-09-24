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

import { existsSync, readFileSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import JSZip from 'jszip';

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
  const fotter = Object.keys(zip.files).filter((f) => /^word\/footer\d*\.xml$/.test(f));
  let upphov = 0;
  for (const f of fotter) if ((await zip.file(f).async('string')).includes('© Niclas Fohlin')) upphov++;
  const sektioner = (dokument?.match(/<w:sectPr/g) || []).length;
  const stilar = await zip.file('word/styles.xml')?.async('string');
  const dubbla = ['Heading1', 'Heading2'].filter((s) => (stilar?.match(new RegExp(`w:styleId="${s}"`, 'g')) || []).length > 1);
  const text = (dokument || '').replace(/<[^>]+>/g, ' ');
  text.includes(metod.titel) ? ok(`${namn}: titeln finns`) : nej(`${namn}: titeln saknas`);
  upphov === fotter.length && fotter.length > 0 ? ok(`${namn}: upphov i ${upphov} sidfötter, ${sektioner} sektioner`) : nej(`${namn}: upphov i ${upphov} av ${fotter.length} sidfötter`);
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
    const bild = (adress, fil, extra = []) => execFileSync(process.execPath, [join(rot, 'scripts/skarmbild.mjs'), adress, join(mapp, fil), ...extra], { stdio: 'ignore', timeout: 90000 });
    const tryck = (adress, fil) => execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${join(mapp, fil)}`, adress], { stdio: 'ignore', timeout: 60000 });
    try {
      bild(url, 'desktop.png');
      bild(url, 'mobil.png', ['--mobil']);
      tryck(url, 'utskrift.pdf');
      ok(`skärmbilder i ${mapp}: desktop.png, mobil.png, utskrift.pdf`);
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
