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
const delar = ['inledning', 'upplagg', 'principer', 'passrutin', 'tidsschema', 'steg', 'arbetsform', 'tabeller', 'exempel', 'fastnar', 'roll', 'urval', 'progression', 'uppfoljning', 'mal', 'snabbmall', 'checklista', 'grund'];
const finns = delar.filter((d) => metod[d] && (!Array.isArray(metod[d]) || metod[d].length));
console.log(`  delar i modellen: ${finns.join(', ')}`);
if (metod.utkast) console.log('  obs  utkast: true, metoden byggs inte i produktion');

// 2. Bygget: sidan, JSON och Word-filerna.
const dist = join(rot, 'dist/stodundervisning');
const sida = join(dist, id, 'index.html');
const html = existsSync(sida) ? readFileSync(sida, 'utf8') : '';
html ? ok(`sidan finns (${(statSync(sida).size / 1024).toFixed(1)} kB)`) : nej('sidan saknas i dist; kör npm run validera');
if (html) {
  for (const d of finns.filter((x) => !['inledning', 'upplagg', 'principer', 'tabeller'].includes(x))) {
    html.includes(`id="${d}"`) ? ok(`avsnittet ${d} finns på sidan`) : nej(`avsnittet ${d} saknas på sidan`);
  }
  html.includes('© Niclas Fohlin') ? ok('upphovet står på sidan') : nej('upphovet saknas på sidan');
  html.includes(`/stodundervisning/${id}.docx`) ? ok('nedladdningslänken finns') : nej('nedladdningslänken saknas');
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
await provaDocx(join(dist, `${id}.docx`), 'hela metoden (docx)');
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
    const server = spawn('npx', ['astro', 'preview', '--port', String(port)], { cwd: rot, shell: true, stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 5000));
    const url = `http://localhost:${port}/stodundervisning/${id}`;
    const kor = (extra) => execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', ...extra, url], { stdio: 'ignore', timeout: 60000 });
    try {
      kor(['--window-size=1280,7000', `--screenshot=${join(mapp, 'desktop.png')}`]);
      kor(['--window-size=390,10000', `--screenshot=${join(mapp, 'mobil.png')}`]);
      kor(['--no-pdf-header-footer', `--print-to-pdf=${join(mapp, 'utskrift.pdf')}`]);
      ok(`skärmbilder i ${mapp}: desktop.png, mobil.png, utskrift.pdf`);
      if (metod.lathund) {
        const lurl = `${url}/lathund`;
        const korL = (extra) => execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', ...extra, lurl], { stdio: 'ignore', timeout: 60000 });
        korL(['--window-size=1280,5000', `--screenshot=${join(mapp, 'lathund-desktop.png')}`]);
        korL(['--window-size=390,9000', `--screenshot=${join(mapp, 'lathund-mobil.png')}`]);
        korL(['--no-pdf-header-footer', `--print-to-pdf=${join(mapp, 'lathund-utskrift.pdf')}`]);
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
