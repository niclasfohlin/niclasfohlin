#!/usr/bin/env node
// Utskriftsknapparna (Niclas 2026-10-10: "Kolla också bara att stående och liggande sidor korrekt är gjorda för det med
// utskriftens knapp", och "Om du hittar fel sedan behöver det lösas att det inte någonsin blir fel på det igen kring
// stående och liggande"; 2026-10-13: "Vill inte ha glidning här. Så bättre med ett system för skriv ut knapparna", och
// "System med att den drar från sidorna eller Yaml kommer aldrig få exakt paritet med pdf. Så bättre med ett system som
// alltid blir 1:1"). Sedan 2026-10-13 skriver ingen knapp ut sidan: varje knapp är en länk till en pdf
// (data-skriv-ut-pdf, SkrivUtPdf.astro), och pdf:en är en Word-fil som Word har sparat, eller sidor ur en sådan
// (scripts/bankpdf.mjs, scripts/pdfdelar.mjs). Stående och liggande, sidornas brytning och texten är därför Word-filens.
// Det här skriptet prövar det som återstår: att varje knapp leder till en pdf som finns och är den som knappen säger.
//
// Varje metodsida, varje enhets och rams sida och varje lathundssida öppnas i Chrome, och så prövas:
//   varje länk med data-skriv-ut-pdf leder till en pdf i dist, med minst en sida;
//   en knapp som säger att bladet ligger (data-liggande) ger bara liggande sidor, och en knapp som säger hur många sidor
//   den högst är (data-sidor-hogst) ger inte fler;
//   metodens sida har knappen Allt, som leder till Word-filen med allt som pdf, och knappen Metoden precis när sidan har
//   material (data-material i Metod.astro, src/lib/material.ts);
//   pdf:en bakom Metoden har varje avsnitt i beskrivningen som Allt har, och inget av materialet;
//   ingen knapp på sidan skriver ut sidan själv (de gamla märkena data-skriv-ut och data-skriv-ut-blad), och inget skript i
//   bygget anropar window.print;
//   varje central sak (src/data/centrala.json) finns i bygget, en pdf bär namnet och upphovet, och den korta adressen
//   leder dit (netlify.toml), och varje lektionskort som en knapp leder till finns, bär ordet och upphovet och är högst
//   ett A4. Det prövas varje gång, före sidorna.
// Att pdf:erna är gjorda av de Word-filer som ligger i bygget prövar scripts/bankpdf.mjs --kontrollera, och delarna klipps
// ur dem vid varje bygge.
//
// En sida prövas bara när den eller någon av dess pdf:er har ändrats sedan förra godkända körningen: resultatet sparas i
// node_modules/.cache/utskriftsformat.json.
//
//   node scripts/utskriftsformat.mjs              alla sidor som har ändrats (körs i npm run validera, efter pdf:erna)
//   node scripts/utskriftsformat.mjs --alla       alla sidor
//   node scripts/utskriftsformat.mjs <id> …       bara de metoderna, med sina undersidor
//   node scripts/utskriftsformat.mjs --sidor      skriv också varje knapp med pdf:ens sidantal
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

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(rot, 'dist');
const args = process.argv.slice(2);
const alla = args.includes('--alla');
const visaSidor = args.includes('--sidor');
const valda = args.filter((a) => !a.startsWith('--'));
const FLIKAR = 4;
const cacheFil = join(rot, 'node_modules/.cache/utskriftsformat.json');
const sha = (b) => createHash('sha1').update(b).digest('hex');

const chrome = process.env.CHROME ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const harPoppler = (() => { try { execFileSync('pdfinfo', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; } })();
if (!chrome || !harPoppler) { console.log(`utskriftsformat: obs, ${!chrome ? 'Chrome' : 'Poppler (pdfinfo)'} saknas, utskriftsknapparna är inte prövade`); process.exit(0); }
if (!existsSync(join(dist, 'stodundervisning'))) { console.error('utskriftsformat: dist saknas. Kör npm run validera, som bygger först.'); process.exit(1); }

// Sidorna: varje metods sida, dess undersidor (enheterna, ramarna med blad) och lathundssidan.
const metodMapp = join(dist, 'stodundervisning');
const metoder = readdirSync(metodMapp, { withFileTypes: true })
  .filter((x) => x.isDirectory() && existsSync(join(metodMapp, x.name, 'index.html')) && existsSync(join(metodMapp, `${x.name}.docx`)))
  .map((x) => x.name)
  .filter((id) => !valda.length || valda.includes(id));
const sidor = metoder.flatMap((id) => [
  { id, adress: `/stodundervisning/${id}`, metodsida: true },
  ...readdirSync(join(metodMapp, id), { withFileTypes: true })
    .filter((x) => x.isDirectory() && existsSync(join(metodMapp, id, x.name, 'index.html')))
    .map((x) => ({ id, adress: `/stodundervisning/${id}/${x.name}`, metodsida: false })),
]);

// Inget skript i bygget skriver ut sidan: den enda utskriften är pdf:ens, ur ramen som SkrivUtPdf.astro lägger dit
// (contentWindow.print). Skripten ligger i dist/_astro och direkt i sidorna, där Astro lägger de små.
const SKRIVER_UT = /(?<![\w.])(?:window\.|self\.|globalThis\.)?print\(\)/;
const skriptMapp = join(dist, '_astro');
const skriverUt = [
  ...(existsSync(skriptMapp) ? readdirSync(skriptMapp).filter((f) => f.endsWith('.js') && SKRIVER_UT.test(readFileSync(join(skriptMapp, f), 'utf8'))) : []),
  ...sidor.filter((s) => [...readFileSync(join(dist, s.adress, 'index.html'), 'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].some((m) => SKRIVER_UT.test(m[1]))).map((s) => s.adress),
];
if (skriverUt.length) { console.error(`utskriftsformat: ${skriverUt.join(', ')} anropar window.print. En knapp som skriver ut öppnar en pdf (SkrivUtPdf.astro), och ingen knapp skriver ut sidan.`); process.exit(1); }

// En pdf i dist: sidornas format och texten, lästa en gång.
const platt = (text) => text.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const pdfer = new Map();
const pdf = (adress) => {
  const fil = join(dist, decodeURIComponent(adress.split('?')[0]));
  if (!pdfer.has(fil)) {
    if (!existsSync(fil)) pdfer.set(fil, null);
    else {
      const info = execFileSync('pdfinfo', ['-f', '1', '-l', '99999', fil], { encoding: 'utf8' });
      const format = [...info.matchAll(/Page\s+\d+ size:\s+([\d.]+) x ([\d.]+)/g)].map((m) => Number(m[1]) > Number(m[2]));
      pdfer.set(fil, { fil, format, summa: sha(readFileSync(fil)), text: undefined });
    }
  }
  return pdfer.get(fil);
};
const textI = (p) => { if (p.text === undefined) p.text = platt(execFileSync('pdftotext', ['-enc', 'UTF-8', p.fil, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 })); return p.text; };

// De centrala sakerna (src/data/centrala.json, src/lib/centrala.ts), som knapparna leder till: varje sak finns i bygget,
// en pdf bär sitt namn och © Niclas Fohlin och niclasfohlin.se, som allt annat som laddas ner (CLAUDE.md under Tre
// innehållstyper), och varje kort adress står i netlify.toml och leder till sakens adress. Prövas varje gång.
{
  const toml = readFileSync(join(rot, 'netlify.toml'), 'utf8');
  const omleder = new Map([...toml.matchAll(/\[\[redirects\]\]\s+from\s*=\s*"([^"]+)"\s+to\s*=\s*"([^"]+)"\s+status\s*=\s*(\d+)/g)].map((m) => [m[1], { till: m[2], status: Number(m[3]) }]));
  const fel = [];
  for (const c of JSON.parse(readFileSync(join(rot, 'src/data/centrala.json'), 'utf8'))) {
    if (c.slag === 'pdf') {
      const fil = join(dist, c.adress);
      if (!existsSync(fil)) fel.push(`${c.id}: ${c.adress} saknas i bygget; pdf:en läggs i public${c.adress}`);
      else {
        const text = execFileSync('pdftotext', ['-enc', 'UTF-8', fil, '-'], { encoding: 'utf8' }).normalize('NFC').replace(/\s+/g, ' ');
        for (const [krav, prov] of [[c.namn, text.includes(c.namn)], ['© Niclas Fohlin', /©\s*Niclas Fohlin/.test(text)], ['niclasfohlin.se', text.includes('niclasfohlin.se')]]) if (!prov) fel.push(`${c.id}: pdf:en saknar "${krav}"`);
      }
    } else if (!existsSync(join(dist, c.adress, 'index.html'))) fel.push(`${c.id}: sidan ${c.adress} finns inte i bygget`);
    if (c.kort) {
      const o = omleder.get(c.kort);
      if (!o || o.till !== c.adress || o.status !== 301) fel.push(`${c.id}: netlify.toml leder inte ${c.kort} till ${c.adress} med status 301`);
    }
  }
  // Lektionskorten (src/lib/lektionskort.ts, Niclas 2026-10-17): varje knapp till ett kort leder till en pdf i bygget som
  // bär ordet Lektionskort, © Niclas Fohlin och niclasfohlin.se, och varje kort i public/stodundervisning/ har en knapp.
  // Ett kort är högst ett A4 (Niclas 2026-10-17: "Tänker de ska vara max en a4a i framtiden"); Säg, skriv och läs kort
  // kom före regeln och har en baksida med alla meningar.
  {
    const FORE_REGELN = new Set(['sag-skriv-och-las-lektionskort.pdf']);
    const lankade = new Set();
    const lasKort = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) lasKort(p); else if (e.name === 'index.html') for (const m of readFileSync(p, 'utf8').matchAll(/href="\/stodundervisning\/([a-z0-9-]+-lektionskort(?:-[23])?\.pdf)/g)) lankade.add(m[1]); } };
    lasKort(join(dist, 'stodundervisning'));
    for (const f of lankade) {
      const fil = join(dist, 'stodundervisning', f);
      if (!existsSync(fil)) { fel.push(`lektionskortet ${f} saknas i bygget; pdf:en från metodriggen läggs i public/stodundervisning/${f}`); continue; }
      const text = execFileSync('pdftotext', ['-enc', 'UTF-8', fil, '-'], { encoding: 'utf8' }).normalize('NFC').replace(/\s+/g, ' ');
      for (const [krav, prov] of [['Lektionskort', text.includes('Lektionskort')], ['© Niclas Fohlin', /©\s*Niclas Fohlin/.test(text)], ['niclasfohlin.se', text.includes('niclasfohlin.se')]]) if (!prov) fel.push(`lektionskortet ${f}: pdf:en saknar "${krav}"`);
      const sidor = Number(execFileSync('pdfinfo', [fil], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/)?.[1] ?? 0);
      if (sidor > 1 && !FORE_REGELN.has(f)) fel.push(`lektionskortet ${f} har ${sidor} sidor; ett lektionskort är högst ett A4 (METODER.md under Lektionskortet)`);
      // Varje sida bär upphovet, eftersom ett kort skrivs ut och lamineras en sida i taget (granskningen 2026-10-17, P1:
      // Säg, skriv och läs kort hade upphovet bara på baksidan).
      for (let s = 1; s <= sidor; s++) {
        const sida = execFileSync('pdftotext', ['-enc', 'UTF-8', '-f', String(s), '-l', String(s), fil, '-'], { encoding: 'utf8' }).normalize('NFC').replace(/\s+/g, ' ');
        if (!/©\s*Niclas Fohlin/.test(sida) || !sida.includes('niclasfohlin.se')) fel.push(`lektionskortet ${f}: sidan ${s} saknar © Niclas Fohlin och niclasfohlin.se`);
      }
    }
    for (const f of readdirSync(join(rot, 'public', 'stodundervisning')).filter((f) => /-lektionskort(-[23])?\.pdf$/.test(f))) if (!lankade.has(f)) fel.push(`lektionskortet ${f} ligger i public/stodundervisning/ men ingen metod visar det (fältet lektionskort)`);
  }
  // Ett blad med fältet google (bladet som Google Formulär, Gruppstärkande aktiviteter 2026-10-16): knappens korta
  // adress leder i netlify.toml till Googles sida för att kopiera ett kalkylark, så att knappen aldrig går till en
  // sida som inte finns.
  const knappar = new Set();
  const las = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) las(p); else if (e.name === 'index.html') for (const m of readFileSync(p, 'utf8').matchAll(/class="m-blad-google"><a[^>]*href="([^"]+)"/g)) knappar.add(m[1]); } };
  las(join(dist, 'stodundervisning'));
  for (const k of knappar) {
    const o = omleder.get(k);
    if (!o || !/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]+\/copy$/.test(o.till) || o.status !== 302) fel.push(`bladet med google ${k}: netlify.toml leder inte ${k} till Googles sida för att kopiera ett kalkylark med status 302`);
  }
  if (fel.length) {
    for (const f of fel) console.error(`  fel  ${f}`);
    console.error('utskriftsformat: de centrala sakerna, lektionskorten eller bladens Google-knappar stämmer inte med registret, src/data/centrala.json, metodernas fält lektionskort eller netlify.toml.');
    process.exit(1);
  }
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

// Vad som avgör en sidas knappar: sidan utan filernas version (?v=), pdf:erna den länkar till, och skriptet självt.
const nyckel = (s) => {
  const html = readFileSync(join(dist, s.adress, 'index.html'), 'utf8');
  const lankar = [...html.matchAll(/href="([^"]+\.pdf)(?:\?v=[0-9a-f]+)?"/g)].map((m) => m[1]).sort();
  return sha([html.replace(/\?v=[0-9a-f]+/g, ''), ...lankar.map((l) => pdf(l)?.summa ?? `saknas:${l}`), readFileSync(fileURLToPath(import.meta.url), 'utf8')].join('\n'));
};
const cache = existsSync(cacheFil) ? JSON.parse(readFileSync(cacheFil, 'utf8')) : {};
const nycklar = sidor.map((s) => ({ ...s, nyckel: nyckel(s) }));
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
  };
}

const fel = [];
const rader = [];
const klara = {};
let knappar = 0;
async function prova(f, s) {
  await f.oppna(`${bas}${s.adress}`);
  let godkand = true;
  const nej = (text) => { godkand = false; fel.push(`${s.adress}: ${text}`); };
  // Knapparna som läsaren ser dem: länkarna till pdf:erna, och de gamla knapparna som skrev ut sidan.
  const lankar = await f.kor(`[...document.querySelectorAll('a[data-skriv-ut-pdf]')].map((k) => ({ synlig: k.checkVisibility(), namn: (k.querySelector('[data-direkt]') ?? k).dataset.direkt ?? ((k.closest('[role=group]')?.parentElement?.querySelector('[data-direkt]')?.dataset.direkt ?? '') + ' ' + k.textContent.replace(/\\s+/g, ' ').trim()), overst: !!k.closest('.enhet-knappar'), href: k.getAttribute('href'), slag: k.dataset.skrivUtPdf, liggande: k.dataset.liggande !== undefined, hogst: Number(k.dataset.sidorHogst) || 0, nyFlik: k.target === '_blank' }))`) ?? [];
  const titel = s.metodsida ? '' : ((await f.kor(`document.querySelector('.enhet-huvud h1')?.textContent ?? ''`)) ?? '').replace(/\s+/g, ' ').trim();
  const gamla = await f.kor(`document.querySelectorAll('[data-skriv-ut], [data-skriv-ut-blad], [data-skriv-ut-mall], [data-skriv-ut-text]').length`) ?? 0;
  if (gamla) nej(`${gamla} knappar skriver ut sidan själv (data-skriv-ut, data-skriv-ut-blad). En knapp som skriver ut är en länk till en pdf (SkrivUtPdf.astro)`);
  for (const k of lankar.filter((x) => x.synlig)) {
    knappar += 1;
    const namn = k.namn.replace(/\s+/g, ' ').trim();
    if (!/\.pdf(\?|$)/.test(k.href ?? '')) { nej(`knappen "${namn}" leder inte till en pdf (${k.href})`); continue; }
    const p = pdf(k.href);
    if (!p) { nej(`knappen "${namn}" leder till ${k.href.split('?')[0]}, som inte finns i bygget. Kör npm run validera, som gör pdf:erna`); continue; }
    if (!p.format.length) { nej(`knappen "${namn}": pdf:en har inga sidor`); continue; }
    if (!k.nyFlik) nej(`knappen "${namn}" öppnar inte pdf:en i en ny flik, så läsaren lämnar sidan där utskriften inte kan göras direkt`);
    if (k.liggande && !p.format.every(Boolean)) nej(`knappen "${namn}": bladet ligger, men pdf:en har en stående sida`);
    if (k.hogst && p.format.length > k.hogst) nej(`knappen "${namn}": pdf:en är ${p.format.length} sidor, ska vara ${k.hogst === 1 ? 'en' : `högst ${k.hogst}`}`);
    // Knappen överst på en enhets eller en rams sida ger enhetens egna sidor: sidans rubrik står i pdf:en. Så syns en karta
    // som pekar på en annan enhets sidor (granskningen 2026-10-13, P1).
    if (k.overst && titel && !textI(p).includes(platt(titel))) nej(`knappen "${namn}": pdf:en har inte sidans rubrik "${titel}", så den är klippt ur fel sidor`);
    rader.push(`${s.adress} (${namn}): ${p.format.length} sidor, ${p.format.filter(Boolean).length} liggande`);
  }
  if (s.metodsida) {
    // Beskrivningen och materialet (data-material i Metod.astro): sidans avsnitt på översta nivån, med de första texterna
    // i vart och ett, och om avsnittet är material.
    const delar = await f.kor(`[...document.querySelectorAll('section[id]')].filter((x) => !x.parentElement.closest('section[id]')).map((x) => ({ id: x.id, material: x.hasAttribute('data-material'), prover: [...x.querySelectorAll('h2, h3, h4, p, figcaption, td')].slice(0, 12).map((e) => e.textContent) }))`) ?? [];
    const harMaterial = delar.some((x) => x.material);
    const allt = lankar.find((k) => k.slag === 'allt');
    const metoden = lankar.find((k) => k.slag === 'metoden');
    if (!allt) nej('sidan har ingen knapp Skriv ut: Allt (Nedladdning.astro)');
    else if (allt.href.split('?')[0] !== `/stodundervisning/${s.id}.pdf`) nej(`knappen Allt leder till ${allt.href}, ska vara Word-filen med allt som pdf`);
    if (harMaterial !== !!metoden) nej(`sidan ${harMaterial ? 'har material men ingen knapp Metoden' : 'har knappen Metoden men inget material'} (data-material i Metod.astro, src/lib/material.ts)`);
    // Pdf:en bakom Metoden har varje avsnitt i beskrivningen som Allt har, och inget avsnitt som är material.
    const pa = allt && pdf(allt.href);
    const pm = metoden && pdf(metoden.href);
    if (pa && pm) {
      const alltText = textI(pa);
      const sidtext = platt((await f.kor('document.body.textContent')) ?? '');
      const metodText = textI(pm);
      if (pm.format.length >= pa.format.length) nej(`pdf:en bakom Metoden är ${pm.format.length} sidor och den bakom Allt ${pa.format.length}: Metoden ska vara utan materialet`);
      for (const x of delar) {
        // Den första texten i avsnittet som står precis en gång på sidan och precis en gång i filen med allt: en mening som
        // beskrivningen också har (Ett stående A4 per talsort i De fyra räknesätten, under Material och under Mallar) säger
        // inget om avsnittet.
        const en = (text, t) => text.indexOf(t) >= 0 && text.indexOf(t) === text.lastIndexOf(t);
        const prov = x.prover.map((t) => platt(t).slice(0, 30)).find((t) => t.length >= 20 && en(sidtext, t) && en(alltText, t));
        if (!prov) continue;
        const med = metodText.includes(prov);
        if (x.material && med) nej(`materialet #${x.id} står med i pdf:en bakom Metoden`);
        if (!x.material && !med) nej(`beskrivningens avsnitt #${x.id} saknas i pdf:en bakom Metoden`);
      }
    }
  }
  if (godkand) klara[s.adress] = s.nyckel;
}

try {
  const flikar = await Promise.all(Array.from({ length: Math.min(FLIKAR, att.length) }, () => flik()));
  let i = 0;
  await Promise.all(flikar.map(async (f) => { while (i < att.length) { const nr = i++; await prova(f, att[nr]); } }));
} finally {
  proc.kill();
  server.close();
  await vanta(500);
  try { rmSync(mapp, { recursive: true, force: true }); } catch { /* Chrome släpper profilen strax */ }
}

mkdirSync(dirname(cacheFil), { recursive: true });
writeFileSync(cacheFil, JSON.stringify({ ...cache, ...klara }, null, 1));
if (visaSidor) for (const r of rader.sort()) console.log(`  ${r}`);
for (const f of fel) console.error(`  fel  ${f}`);
console.log(`utskriftsformat: ${att.length} av ${sidor.length} sidor prövade, ${knappar} utskriftsknappar${fel.length ? `, ${fel.length} fel` : ', och varje knapp leder till sin pdf ur Word-filerna'}`);
process.exit(fel.length ? 1 : 0);
