#!/usr/bin/env node
// Stående och liggande sidor i utskriften (Niclas 2026-10-10: "Kolla också bara att stående och liggande sidor korrekt är
// gjorda för det med utskriftens knapp", och "Om du hittar fel sedan behöver det lösas att det inte någonsin blir fel på
// det igen kring stående och liggande"). Varje metodsida och varje enhets sida i en bank skrivs ut med Chrome, en gång per
// utskriftsknapp på sidan (Skriv ut: Allt och Bara beskrivningen i Nedladdning.astro, bladens knappar på en enhets sida),
// genom att knappen trycks som en läsare trycker den. Varje sida i utskriften jämförs med bladet den står på i Word-filen
// med allt (/stodundervisning/<id>.docx), och sidan ska vara liggande precis när bladet är liggande i Word.
//
// Skriptet prövar också gränsen mellan beskrivningen och materialet (data-material i Metod.astro): en metodsida med
// material har knappen Bara beskrivningen, och dess utskrift har varje avsnitt i beskrivningen som Allt har men inget
// av materialet.
//
// Word-filen läses som block: ett nytt block börjar där Word börjar en ny sida (sidbrytning före ett stycke, en sidbrytning
// i texten, ett avsnitt), och blocket är liggande när dess avsnitt är det. En sida i utskriften hör till det block den
// liknar mest (likheten nedan), utan sidfotens ord.
// Lathundens sidor i Word-filen (avsnitten med lathundens adress i sidfoten) räknas inte, eftersom lathunden skrivs ut från sin egen
// sida och har egna prov.
// En sida med färre än MINST_ORD ord som inte står i alla sidor (en mall med bara tal, en tom ruta) prövas inte.
//
// En sida skrivs ut bara när den, stilmallen eller Word-filen har ändrats sedan förra godkända körningen: resultatet sparas
// i node_modules/.cache/utskriftsformat.json. Fyra flikar skriver ut samtidigt.
//
//   node scripts/utskriftsformat.mjs              alla sidor som har ändrats (körs i npm run validera, efter bygget)
//   node scripts/utskriftsformat.mjs --alla       alla sidor
//   node scripts/utskriftsformat.mjs <id> …       bara de metoderna, med sina enheters sidor
//   node scripts/utskriftsformat.mjs --sidor      skriv också sidantalet för varje utskrift
//   node scripts/utskriftsformat.mjs --forklara   skriv vid ett fel de block i Word som sidan liknar mest
//
// Kräver Chrome (som scripts/skarmbild.mjs) och Poppler (pdfinfo, pdftotext). Utan dem säger skriptet obs och släpper
// igenom, som metodprovet.
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(rot, 'dist');
const args = process.argv.slice(2);
const alla = args.includes('--alla');
const visaSidor = args.includes('--sidor');
const forklara = args.includes('--forklara');
const visa = args.includes('--visa');
const valda = args.filter((a) => !a.startsWith('--'));
const MINST_ORD = 2;
const FLIKAR = 4;
const cacheFil = join(rot, 'node_modules/.cache/utskriftsformat.json');
const sha = (b) => createHash('sha1').update(b).digest('hex');

const chrome = process.env.CHROME ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const harPoppler = (() => { try { execFileSync('pdfinfo', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; } })();
if (!chrome || !harPoppler) { console.log(`utskriftsformat: obs, ${!chrome ? 'Chrome' : 'Poppler (pdfinfo)'} saknas, stående och liggande sidor är inte prövade`); process.exit(0); }
if (!existsSync(join(dist, 'stodundervisning'))) { console.error('utskriftsformat: dist saknas. Kör npm run validera, som bygger först.'); process.exit(1); }

// Sidorna: varje metod med sin Word-fil, och enheternas sidor under den (src/lib/bank.ts). Lathunden har egen utskrift och
// egna prov (scripts/lathundprov.mjs).
const metodMapp = join(dist, 'stodundervisning');
const metoder = readdirSync(metodMapp, { withFileTypes: true })
  .filter((x) => x.isDirectory() && existsSync(join(metodMapp, x.name, 'index.html')) && existsSync(join(metodMapp, `${x.name}.docx`)))
  .map((x) => x.name)
  .filter((id) => !valda.length || valda.includes(id));
const sidor = metoder.flatMap((id) => [
  { id, adress: `/stodundervisning/${id}` },
  ...readdirSync(join(metodMapp, id), { withFileTypes: true })
    .filter((x) => x.isDirectory() && x.name !== 'lathund' && existsSync(join(metodMapp, id, x.name, 'index.html')))
    .map((x) => ({ id, adress: `/stodundervisning/${id}/${x.name}` })),
]);

// Word-filens block, med orientering och ord.
const avkoda = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
// Texten utan mellanrum och tecken, för att se om ett stycke står i en utskrift oavsett radbrytningar.
const platt = (text) => text.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const ord = (text) => new Set(text.normalize('NFC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2));
const liggande = (sectPr) => {
  const m = sectPr.match(/<w:pgSz\b[^>]*>/)?.[0] ?? '';
  const w = Number(m.match(/w:w="(\d+)"/)?.[1] ?? 0);
  const h = Number(m.match(/w:h="(\d+)"/)?.[1] ?? 0);
  return /w:orient="landscape"/.test(m) || w > h;
};
async function wordBlock(docx, { medLathund = false } = {}) {
  const zip = await JSZip.loadAsync(readFileSync(docx));
  const xml = await zip.file('word/document.xml').async('string');
  // Ett avsnitts sidfot, ur relationerna: lathundens sidor har lathundens adress i sidfoten, niclasfohlin.se/
  // stodundervisning/<id>/lathund (sektion med lathund i src/lib/metoddocx.ts).
  const rels = await zip.file('word/_rels/document.xml.rels').async('string');
  const huvuden = new Map();
  const huvud = async (sect) => {
    const id = sect.match(/<w:footerReference\b[^>]*r:id="([^"]+)"/)?.[1];
    const mal = id && rels.match(new RegExp(`Id="${id}"[^>]*Target="([^"]+)"`))?.[1];
    if (!mal) return '';
    if (!huvuden.has(mal)) huvuden.set(mal, avkoda(((await zip.file(`word/${mal}`)?.async('string')) ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim());
    return huvuden.get(mal);
  };
  const kropp = xml.slice(xml.indexOf('<w:body>') + 8, xml.lastIndexOf('</w:body>'));
  // Kroppens element på översta nivån: stycken och tabeller (ett stycke kan ha stycken i en textruta, en tabell stycken).
  const element = [];
  let djup = 0;
  let start = -1;
  for (const m of kropp.matchAll(/<(\/)?(w:p|w:tbl|w:sdt)(?=[\s>/])[^>]*?(\/)?>/g)) {
    if (m[1]) { djup--; if (djup === 0) element.push(kropp.slice(start, m.index + m[0].length)); }
    else if (m[3]) { if (djup === 0) element.push(m[0]); }
    else { if (djup === 0) start = m.index; djup++; }
  }
  // Kroppens eget avsnitt, det sista, står sist i kroppen.
  const slutSect = kropp.slice(kropp.lastIndexOf('<w:sectPr'));
  const block = [];
  let avsnitt = [];
  let nu = { text: [] };
  const nytt = () => { if (nu.text.length) { avsnitt.push(nu); block.push(nu); } nu = { text: [] }; };
  for (const e of element) {
    const ppr = e.startsWith('<w:p') ? (e.match(/^<w:p\b[^>]*>\s*<w:pPr>([\s\S]*?)<\/w:pPr>/)?.[1] ?? '') : '';
    // En tabell börjar en ny sida när dess första stycke gör det.
    const forsta = ppr || (e.match(/<w:p\b[^>]*>\s*<w:pPr>([\s\S]*?)<\/w:pPr>/)?.[1] ?? '');
    if (/<w:pageBreakBefore(?:\s*\/>|\s+w:val="(?:1|true|on)"\s*\/>)/.test(forsta)) nytt();
    nu.text.push(avkoda([...e.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map((t) => t[1]).join(' ')));
    if (/<w:br\b[^>]*w:type="page"/.test(e)) nytt();
    const sect = ppr.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/)?.[0];
    if (sect) { nytt(); const h = await huvud(sect); for (const b of avsnitt) { b.liggande = liggande(sect); b.lathund = /\/lathund(\s|$)/.test(h); } avsnitt = []; }
  }
  nytt();
  const h = await huvud(slutSect);
  for (const b of avsnitt) { b.liggande = liggande(slutSect); b.lathund = /\/lathund(\s|$)/.test(h); }
  return block.filter((b) => medLathund || !b.lathund).map((b) => ({ liggande: !!b.liggande, ord: ord(b.text.join(' ')), borjan: b.text.join(' ').replace(/\s+/g, ' ').trim().slice(0, 60) }));
}

// En liten server för dist, så att sidorna läses som på sajten, med sina absoluta adresser.
const TYPER = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.json': 'application/json', '.mp4': 'video/mp4', '.pdf': 'application/pdf' };
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPER[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const bas = `http://127.0.0.1:${server.address().port}`;

const blockAv = new Map();
// Lathundens blad att lägga på bordet (talsortsmattan, Bråket på fyra sätt) står bland mallarna i Word-filen med allt
// men skrivs ut från lathundens sida: blocken som lathundens egen Word-fil också har märks, och regeln åt andra hållet
// nedan kräver inte att de står på metodens sida.
const blockFor = (id) => {
  if (!blockAv.has(id)) blockAv.set(id, (async () => {
    const block = await wordBlock(join(metodMapp, `${id}.docx`));
    const fil = join(metodMapp, `${id}-lathund.docx`);
    const lathund = existsSync(fil) ? await wordBlock(fil, { medLathund: true }) : [];
    const lik = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n / Math.max(1, a.size + b.size - n); };
    for (const b of block) b.lathundblad = lathund.some((l) => lik(b.ord, l.ord) >= 0.8);
    return block;
  })());
  return blockAv.get(id);
};

// Vad som avgör en sidas utskrift: sidan utan filernas version (?v=), dess stilmallar och Word-filens block, alltså text och
// format utan byggtiden och bildernas löpnummer, som scripts/bankpdf.mjs (K-212), och skriptet självt.
const css = new Map();
const nyckel = async (s) => {
  const html = readFileSync(join(dist, s.adress, 'index.html'), 'utf8').replace(/\?v=[0-9a-f]+/g, '');
  const mallar = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => {
    if (!css.has(m[1])) css.set(m[1], readFileSync(join(dist, m[1].split('?')[0])));
    return css.get(m[1]);
  });
  const word = JSON.stringify((await blockFor(s.id)).map((b) => [b.liggande, b.lathundblad, [...b.ord].sort().join(' ')]));
  return sha(Buffer.concat([Buffer.from(html), ...mallar, Buffer.from(word), readFileSync(fileURLToPath(import.meta.url))]));
};
const cache = existsSync(cacheFil) ? JSON.parse(readFileSync(cacheFil, 'utf8')) : {};
const nycklar = await Promise.all(sidor.map(async (s) => ({ ...s, nyckel: await nyckel(s) })));
const att = nycklar.filter((s) => alla || cache[s.adress] !== s.nyckel);
if (!att.length) { console.log(`utskriftsformat: ${sidor.length} sidor, ingen ändrad sedan förra körningen`); server.close(); process.exit(0); }

const port = 9800 + Math.floor(Math.random() * 150);
const mapp = join(tmpdir(), `utskriftsformat-${port}`);
mkdirSync(mapp, { recursive: true });
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--user-data-dir=${mapp}/profil`, 'about:blank'], { stdio: 'ignore' });
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));

// En flik i Chrome, styrd med DevTools-protokollet.
async function flik() {
  let info;
  for (let i = 0; i < 40 && !info; i++) {
    await vanta(250);
    try { info = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { /* Chrome har inte startat än */ }
  }
  if (!info) throw new Error('Chrome svarade inte på DevTools-porten.');
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((r, x) => { ws.onopen = r; ws.onerror = x; });
  let nr = 0;
  const vantande = new Map();
  let laddad = () => {};
  ws.onmessage = (m) => {
    const data = JSON.parse(m.data);
    if (data.id && vantande.has(data.id)) { vantande.get(data.id)(data); vantande.delete(data.id); }
    else if (data.method === 'Page.loadEventFired') laddad();
  };
  const skicka = (method, params = {}) => new Promise((r) => { const id = ++nr; vantande.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await skicka('Page.enable');
  return {
    oppna: async (url) => { const klar = new Promise((r) => { laddad = r; }); await skicka('Page.navigate', { url }); await Promise.race([klar, vanta(20000)]); },
    kor: async (expression) => (await skicka('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value,
    pdf: async () => Buffer.from((await skicka('Page.printToPDF', { preferCSSPageSize: true, printBackground: false })).result.data, 'base64'),
  };
}

const fel = [];
const obs = [];
const rader = [];
const klara = {};
async function prova(f, s, nr) {
  const block = await blockFor(s.id);
  await f.oppna(`${bas}${s.adress}`);
  // Knapparna på sidan, som läsaren ser dem: utskriftsrutans val och bladens knappar på en enhets sida.
  const knappar = await f.kor(`[...document.querySelectorAll('[data-skriv-ut], [data-skriv-ut-blad]')].map((k, i) => ({ i, synlig: k.checkVisibility(), namn: k.textContent.replace(/\\s+/g, ' ').trim(), typ: k.dataset.skrivUt ?? 'blad', blad: k.dataset.skrivUtBlad, utan: k.dataset.skrivUt === 'beskrivning' }))`) ?? [];
  // Knappar som stilmallen gömmer (Bara beskrivningen på en sida utan material) trycks inte, som läsaren inte kan trycka dem.
  const synliga = knappar.filter((k) => k.synlig);
  const lagen = synliga.length ? synliga : [{ i: -1, namn: 'webbläsarens utskrift' }];
  let godkand = true;
  // Beskrivningen och materialet (data-material i Metod.astro): sidans avsnitt på översta nivån, med de första texterna i
  // vart och ett, och om avsnittet är material. Har sidan material ska knappen Bara beskrivningen finnas, och
  // tvärtom (Nedladdning.astro, global.css).
  const delar = await f.kor(`[...document.querySelectorAll('section[id]')].filter((x) => !x.parentElement.closest('section[id]')).map((x) => ({ id: x.id, material: x.hasAttribute('data-material'), prover: [...x.querySelectorAll('h2, h3, h4, p, figcaption, td')].slice(0, 12).map((e) => e.textContent) }))`) ?? [];
  const harMaterial = delar.some((x) => x.material);
  if (synliga.some((k) => k.typ === 'allt') && harMaterial !== synliga.some((k) => k.utan)) {
    godkand = false;
    fel.push(`${s.adress}: sidan ${harMaterial ? 'har material men ingen knapp Bara beskrivningen' : 'har knappen Bara beskrivningen men inget material'} (data-material i Metod.astro, global.css)`);
  }
  const utskrivet = new Map();
  for (const k of lagen) {
    // Knappen trycks som av en läsare; dess skript gör sidan klar och anropar window.print, som här bara säger till.
    const nadde = await f.kor(`new Promise((klar) => {
      const knapp = [...document.querySelectorAll('[data-skriv-ut], [data-skriv-ut-blad]')][${k.i}];
      window.print = () => klar(true);
      if (!knapp) { klar(true); return; }
      knapp.click();
      setTimeout(() => klar(false), 15000);
    })`);
    if (nadde === false) { godkand = false; fel.push(`${s.adress} (${k.namn}): knappen anropade aldrig utskriften inom 15 sekunder`); }
    // Bilderna som bara står i utskriften hämtas, som knappen gör, också för webbläsarens egen utskrift.
    await f.kor(`Promise.race([Promise.all([...document.images].map((b) => { b.loading = 'eager'; return b.complete ? 0 : new Promise((r) => { b.onload = b.onerror = r; }); })), new Promise((r) => setTimeout(r, 8000))])`);
    const fil = join(mapp, `sida-${nr}.pdf`);
    writeFileSync(fil, await f.pdf());
    const info = execFileSync('pdfinfo', ['-f', '1', '-l', '99999', fil], { encoding: 'utf8' });
    const format = [...info.matchAll(/Page\s+\d+ size:\s+([\d.]+) x ([\d.]+)/g)].map((m) => Number(m[1]) > Number(m[2]));
    const texter = execFileSync('pdftotext', ['-enc', 'UTF-8', fil, '-'], { encoding: 'utf8' }).split('\f').slice(0, format.length);
    const sidord = texter.map(ord);
    utskrivet.set(k.typ, platt(texter.join(' ')));
    // Ord som står på nästan varje sida (sidfotens upphov och adress) säger inget om bladet.
    const antal = new Map();
    for (const o of sidord) for (const w of o) antal.set(w, (antal.get(w) ?? 0) + 1);
    const vanliga = new Set(format.length >= 4 ? [...antal].filter(([, n]) => n >= format.length * 0.6).map(([w]) => w) : []);
    // Sidfotens ord (global.css, --tryck-text: © Niclas Fohlin · niclasfohlin.se/stodundervisning/<id>/<enhet>) står i
    // Word-filens sidfot, som inte läses, och räknas inte heller här, också när utskriften bara är ett blad.
    for (const w of ord(`niclas fohlin niclasfohlin se ${s.adress}`)) vanliga.add(w);
    // Hur stor del av ett blocks ord som står på en sida, med sidans alla ord: ett liggande blad i Word (Ledtrådsbladet i
    // Textsamtal i grupp) står i utskriften på en sida med lärarens text om bladet, som Word har i beskrivningen.
    const iSidan = (b, i) => { let n = 0; for (const w of b.ord) if (sidord[i].has(w)) n++; return n / Math.max(1, b.ord.size); };
    const fel1 = (text, matt) => {
      godkand = false;
      fel.push(text);
      if (forklara && matt) for (const m of matt.slice(0, 4)) fel.push(`       likhet ${m.likhet.toFixed(3)}, täckning ${m.tackning.toFixed(2)}, precision ${m.precision.toFixed(3)}, ${m.b.liggande ? 'liggande' : 'stående'}, ${m.b.ord.size} ord: ${m.b.borjan}`);
    };
    format.forEach((ligger, i) => {
      const o = new Set([...sidord[i]].filter((w) => !vanliga.has(w)));
      if (visa) console.log(`  ${s.adress} (${k.namn}) s. ${i + 1}: ${ligger ? 'liggande' : 'stående'}, ${o.size} egna ord: ${texter[i].replace(/\s+/g, ' ').trim().slice(0, 70)}`);
      if (o.size < MINST_ORD) { if (ligger) fel1(`${s.adress} (${k.namn}): sidan ${i + 1} är liggande men har för lite text för att jämföras med Word (${texter[i].replace(/\s+/g, ' ').trim().slice(0, 50)})`); else obs.push(`${s.adress} (${k.namn}): sidan ${i + 1}, stående, har för lite text för att jämföras med Word`); return; }
      // En liggande sida som har ett liggande blad ur Word är rätt, också när lärarens text om bladet står på samma sida.
      if (ligger && block.some((b) => b.liggande && b.ord.size >= MINST_ORD && iSidan(b, i) >= 0.8)) return;
      // Likheten är täckningen (hur stor del av sidans ord blocket har) gånger roten ur precisionen (hur stor del av
      // blockets ord som står på sidan). Roten gör att en lång beskrivning som har sidans ord vinner över ett litet blad
      // som den bara berättar om (Bråket på fyra sätt i Bråkkurs i grupp), och att ett blad vinner över beskrivningen när
      // sidan är bladet (Två lösningar, vars bilder inte har text i utskriften).
      const matt = block.map((b) => {
        let gemensamma = 0;
        for (const w of o) if (b.ord.has(w)) gemensamma++;
        const tackning = gemensamma / o.size;
        const precision = gemensamma / Math.max(1, b.ord.size);
        return { b, tackning, precision, likhet: tackning * Math.sqrt(precision) };
      });
      matt.sort((a, b) => b.likhet - a.likhet);
      const bast = matt[0]?.b;
      // En stående sida utan motsvarighet i Word-filens text (bokstavskorten, upphovet sist) noteras; en liggande är ett fel,
      // eftersom ett liggande blad alltid har sitt blad i Word.
      if (!bast || matt[0].tackning < 0.5) {
        const text = `${s.adress} (${k.namn}): sidan ${i + 1}, ${ligger ? 'liggande' : 'stående'}, hittas inte i Word-filen (${texter[i].replace(/\s+/g, ' ').trim().slice(0, 50)})`;
        if (ligger) fel1(text, matt); else obs.push(text);
        return;
      }
      if (bast.liggande !== ligger) fel1(`${s.adress} (${k.namn}): sidan ${i + 1} av ${format.length} är ${ligger ? 'liggande' : 'stående'}, men i Word står bladet ${bast.liggande ? 'liggande' : 'stående'} ("${bast.borjan}")`, matt);
    });
    // Åt andra hållet: ett liggande blad i Word som står helt på en sida i utskriften ska stå på en liggande sida där.
    // Bladet räknas som helt på sidan när nästan alla dess ord står där, och det har så många ord att en beskrivning som
    // bara nämner bladet inte har dem alla.
    // Bara beskrivningen (Nedladdning.astro) har inga blad, så där prövas det inte.
    if (!k.utan) for (const b of block.filter((x) => x.liggande && !x.lathundblad && x.ord.size >= MINST_ORD)) {
      const sidorna = format.map((_, i) => i).filter((i) => iSidan(b, i) >= 0.9);
      if (sidorna.length && !sidorna.some((i) => format[i])) fel1(`${s.adress} (${k.namn}): bladet "${b.borjan}" är liggande i Word men står på en stående sida i utskriften (sidan ${sidorna.map((i) => i + 1).join(', ')})`);
    }
    // En enhets knapp för ett blad skriver ut bladet på en sida (Lärarens sida, Problemet, Två lösningar).
    if (k.blad && format.length !== 1) fel1(`${s.adress} (${k.namn}): bladet blir ${format.length} sidor i utskriften, ska vara en`);
    rader.push(`${s.adress} (${k.namn}): ${format.length} sidor, ${format.filter(Boolean).length} liggande`);
  }
  // Bara beskrivningen har varje avsnitt i beskrivningen som Allt har, och inget avsnitt som är material.
  if (utskrivet.has('allt') && utskrivet.has('beskrivning')) {
    for (const x of delar) {
      // Den första texten i avsnittet som står precis en gång i utskriften av allt: en mening som beskrivningen också har
      // (Ett stående A4 per talsort i De fyra räknesätten, under Material och under Mallar) säger inget om avsnittet.
      const allt = utskrivet.get('allt');
      const prov = x.prover.map((t) => platt(t).slice(0, 30)).find((t) => t.length >= 20 && allt.indexOf(t) >= 0 && allt.indexOf(t) === allt.lastIndexOf(t));
      if (!prov) continue;
      const med = utskrivet.get('beskrivning').includes(prov);
      if (x.material && med) { godkand = false; fel.push(`${s.adress} (Bara beskrivningen): materialet #${x.id} står med i utskriften`); }
      if (!x.material && !med) { godkand = false; fel.push(`${s.adress} (Bara beskrivningen): beskrivningens avsnitt #${x.id} saknas i utskriften`); }
    }
  }
  if (godkand) klara[s.adress] = s.nyckel;
}

try {
  const flikar = await Promise.all(Array.from({ length: Math.min(FLIKAR, att.length) }, () => flik()));
  let i = 0;
  await Promise.all(flikar.map(async (f) => { while (i < att.length) { const nr = i++; await prova(f, att[nr], nr); } }));
} finally {
  proc.kill();
  server.close();
  await vanta(500);
  try { rmSync(mapp, { recursive: true, force: true }); } catch { /* Chrome släpper profilen strax */ }
}

mkdirSync(dirname(cacheFil), { recursive: true });
writeFileSync(cacheFil, JSON.stringify({ ...cache, ...klara }, null, 1));
if (visaSidor) for (const r of rader.sort()) console.log(`  ${r}`);
if (forklara) for (const o of obs) console.log(`  obs  ${o}`);
for (const f of fel) console.error(`  fel  ${f}`);
console.log(`utskriftsformat: ${att.length} av ${sidor.length} sidor utskrivna, ${rader.length} utskrifter${fel.length ? `, ${fel.filter((x) => !x.startsWith('       ')).length} fel` : ', stående och liggande som i Word'}${obs.length ? ` (${obs.length} sidor utan motsvarighet i Word-filens text prövades inte; --forklara visar dem)` : ''}`);
process.exit(fel.length ? 1 : 0);
