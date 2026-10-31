// Prov av appen Metodbanken (K-505, K-644, DRIFT.md under Appen Metodbanken). Läser det byggda i dist, som npm run validera bygger:
//
// | Prov | Vad |
// |---|---|
// | Manifestet | Namnen, start_url /app, scope /, id /stodundervisning, display standalone och ikonerna i 192 och 512 punkter, också den maskbara (https://web.dev/articles/install-criteria), ur src/lib/appen.ts |
// | Ikonerna | Varje bild finns och har sitt mått, och iPhones ikon på 180 punkter |
// | Sidhuvudet | Sidorna under /app, /stodundervisning och /metoder har manifestet, appens ikon, namnet Metodbanken och data-appdel; en artikel har sajtens ikon och inget manifest. Raden Hem står på varje sida utom /app |
// | Appens sida | /app har en egen titel och beskrivning, ingen spärr för sökmotorerna, står i sajtkartan och har de två bankerna, erbjudandet och listorna för båda samlingarna |
// | Länken | Bankerna, Planera insatsen och Lär dig metoden har länken Appen Metodbanken till /app och inte längre erbjudandet |
// | Beskedet | webblasarensBesked i src/scripts/webblasaren.ts: Safari i iPhone och iPad, en apps webbläsare, appen, Chrome i Android och en dator |
// | Service workern | /sw-stod.js finns, med delarna ur src/lib/appen.ts och en cacheregel i netlify.toml |
// | Erbjudandet | I Chrome, med telefonen härmad, på /app: på en dator och i Android först när webbläsaren erbjuder installation; på iPhone med tre steg, raden om planerna och utfällt från beskedet; i en apps webbläsare vägen ut; krysset gömmer det i 30 dagar; aldrig i appen |
// | I appen | Listorna på /app med planer i båda samlingarna och utan planer, stilmallens regler för appen och länken bara på pekskärm |
// | Beskedet i sidan | Planera insatsen och Lär dig metoden i Safari i iPhone med beskedet och knappen till /app, och inte i appen eller i Chrome i Android |
// | Utan nät | Service workern sparar /app, Metoder, Planera insatsen och Lär dig metoden och öppnar dem när provets server har stängts |
//
//   node scripts/appprov.mjs
//
// Kräver Chrome, som scripts/planprov.mjs. Lär dig metoden finns i dist bara när bygget tar med Metoders utkast
// (METODER_UTKAST=1, src/lib/innehall.ts); annars säger provet att den sidan inte är prövad.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const rot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dist = join(rot, 'dist');
const fel = [];
const obs = [];
const ska = (namn, ok, info) => { if (!ok) fel.push(`${namn}${info === undefined ? '' : `: ${typeof info === 'string' ? info : JSON.stringify(info)}`}`); };
const las = (p) => (existsSync(join(dist, p)) ? readFileSync(join(dist, p), 'utf8') : '');
const { APPEN, APPENS_DELAR } = await import(pathToFileURL(join(rot, 'src/lib/appen.ts')).href);
const w = await import(pathToFileURL(join(rot, 'src/scripts/webblasaren.ts')).href);
const { PLANKNAPPAR } = await import(pathToFileURL(join(rot, 'src/lib/standard/index.js')).href);

// ---------- Manifestet, ikonerna, sidhuvudet och service workern ----------
let manifest = {};
try { manifest = JSON.parse(las(APPEN.manifest.slice(1))); } catch { /* prövas nedan */ }
ska('manifestet finns där appen Stöd hade det', !!manifest.name, APPEN.manifest);
ska('manifestet: namnen', manifest.name === 'Metodbanken: Stöd och Metoder' && manifest.short_name === 'Metodbanken' && manifest.name === APPEN.fulltNamn && manifest.short_name === APPEN.namn, [manifest.name, manifest.short_name]);
ska('manifestet: appen börjar på /app, rymmer hela sajten och har appen Stöds id', manifest.start_url === '/app' && manifest.scope === '/' && manifest.id === '/stodundervisning', [manifest.start_url, manifest.scope, manifest.id]);
ska('manifestet: display standalone', manifest.display === 'standalone', manifest.display);
const ikoner = manifest.icons ?? [];
for (const [storlek, syfte] of [['192x192', undefined], ['512x512', undefined], ['512x512', 'maskable']]) {
  ska(`manifestet: ikonen ${storlek}${syfte ? ' maskbar' : ''}`, ikoner.some((i) => i.sizes === storlek && i.purpose === syfte), ikoner);
}
const matt = async (adress) => { const p = join(dist, adress); if (!existsSync(p)) return null; const m = await sharp(p).metadata(); return `${m.width}x${m.height}`; };
for (const i of ikoner) ska(`ikonen ${i.src} har sitt mått`, (await matt(i.src)) === i.sizes, [i.src, await matt(i.src)]);
ska('iPhones ikon är 180 × 180', (await matt('/stodundervisning/app/ikon-180.png')) === '180x180');

const katalog = (del) => (existsSync(join(dist, del)) ? readdirSync(join(dist, del), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []);
const planbara = katalog('stodundervisning').filter((m) => existsSync(join(dist, 'stodundervisning', m, 'planera', 'index.html')));
const larDiga = katalog('metoder').filter((m) => existsSync(join(dist, 'metoder', m, 'lar-dig', 'index.html')));
const artikeln = katalog('artiklar').find((m) => existsSync(join(dist, 'artiklar', m, 'index.html')));
const SIDOR = {
  appen: 'app/index.html',
  metodbanken: 'stodundervisning/index.html',
  metoder: 'metoder/index.html',
  'en metod': planbara.length ? `stodundervisning/${planbara[0]}/index.html` : '',
  'Planera insatsen': planbara.length ? `stodundervisning/${planbara[0]}/planera/index.html` : '',
  'Lär dig metoden': larDiga.length ? `metoder/${larDiga[0]}/lar-dig/index.html` : '',
};
for (const [namn, fil] of Object.entries(SIDOR)) {
  if (!fil) continue;
  const html = las(fil);
  ska(`${namn}: sidan finns`, !!html, fil);
  ska(`${namn}: manifestet i sidhuvudet`, html.includes(`<link rel="manifest" href="${APPEN.manifest}">`));
  ska(`${namn}: appens ikon för iPhone`, html.includes('<link rel="apple-touch-icon" href="/stodundervisning/app/ikon-180.png">'));
  ska(`${namn}: namnet Metodbanken under ikonen`, html.includes('<meta name="apple-mobile-web-app-title" content="Metodbanken">'));
  ska(`${namn}: hör till appens delar (data-appdel)`, /<html[^>]* data-appdel/.test(html));
  ska(`${namn}: ${namn === 'appen' ? 'ingen rad Hem på appens egen sida' : 'raden Hem till /app'}`, namn === 'appen' ? !html.includes('class="app-hem"') : html.includes('<nav class="app-hem"') && html.includes('href="/app"'));
  // Base.astro har ett enda skript som byggs, det för appens delar (src/scripts/appdelen.ts).
  ska(`${namn}: skriptet för appens delar`, html.includes('src="/_astro/Base.astro_astro_type_script_index_0_lang.'));
}
if (!larDiga.length) obs.push('Lär dig metoden finns inte i dist (bygget utan METODER_UTKAST=1), så den sidan är inte prövad');
const artikel = artikeln ? las(`artiklar/${artikeln}/index.html`) : '';
ska('en artikel har sajtens ikon, inget manifest, inget skript för appens delar och sajtens meny, och raden Hem för appen', !!artikel && artikel.includes('href="/apple-touch-icon.png"') && !artikel.includes('rel="manifest"') && !/<html[^>]* data-appdel/.test(artikel) && !artikel.includes('Base.astro_astro_type_script') && artikel.includes('<nav class="app-hem"'));

// Appens sida: titel, beskrivning, sökmotorerna, bankerna, erbjudandet och listorna.
const appen = las('app/index.html');
ska('appens sida har en egen titel och beskrivning', appen.includes(`<title>${APPEN.namn} · Niclas Fohlin</title>`) && appen.includes(`<meta name="description" content="${APPEN.beskrivning}">`), appen.match(/<title>[^<]*<\/title>/)?.[0]);
ska('appens sida har ingen spärr för sökmotorerna och står i sajtkartan', !appen.includes('noindex') && readdirSync(dist).filter((f) => /^sitemap-\d+\.xml$/.test(f)).some((f) => las(f).includes('<loc>https://niclasfohlin.se/app</loc>')));
ska('appens sida har Stöd och Metoder överst', /<nav class="app-val"[^>]*>\s*<a class="app-valet" href="\/stodundervisning"[\s\S]*?>Stöd<[\s\S]*?<a class="app-valet" href="\/metoder"[\s\S]*?>Metoder</.test(appen));
ska('appens sida har erbjudandet och listorna för båda samlingarna', appen.includes('data-app ') && appen.includes('data-samling="stodundervisning" data-plats="app"') && appen.includes('data-samling="metoder" data-plats="app"'));
// Länken till appen ersätter erbjudandet på bankerna och i planens sidor.
for (const [namn, fil] of Object.entries(SIDOR)) {
  if (!fil || ['appen', 'en metod'].includes(namn)) continue;
  const html = las(fil);
  ska(`${namn}: länken Appen Metodbanken till /app, och inte erbjudandet`, /<p class="app-lank"><a href="\/app"[^>]*>[\s\S]*?Appen Metodbanken<\/a><\/p>/.test(html) && !html.includes('data-app '), fil);
}

// Service workern och dess delar, som ska vara appens delar ur src/lib/appen.ts.
const sw = las('sw-stod.js');
ska('service workern finns', sw.includes("const VERSION = 'stod-"));
const swDelar = JSON.parse((sw.match(/const DELAR = (\[[^\]]*\])/)?.[1] ?? '[]').replace(/'/g, '"'));
ska('service workerns delar är appens delar (src/lib/appen.ts)', JSON.stringify(swDelar) === JSON.stringify(APPENS_DELAR), [swDelar, APPENS_DELAR]);
const toml = readFileSync(join(rot, 'netlify.toml'), 'utf8');
ska('service workern har ingen cache i netlify.toml', /for = "\/sw-stod\.js"\s+\[headers\.values\]\s+Cache-Control = "no-cache"/.test(toml));

// Beskedet i planens sidor, en funktion för båda modulerna.
{
  const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const ADRESS = 'https://niclasfohlin.se/stodundervisning/til-i-grupp/planera#p=abc123';
  const besked = (ua, o = {}) => w.webblasarensBesked(ADRESS, PLANKNAPPAR, w.webblasaren(ua, o), !!o.iAppen);
  const safari = besked(IOS);
  ska('beskedet: Safari i iPhone rekommenderar appen, med knappen till /app', safari?.slag === 'safari' && safari.text.startsWith('Gör planen i appen Metodbanken.') && safari.text.includes('sju dagar') && safari.text.includes(PLANKNAPPAR.laddaNer) && safari.till.href === '/app#lagg-till' && safari.till.text === 'Så lägger du till appen', safari);
  ska('beskedet: Chrome, Edge och Firefox i iPhone har Safari i namnet men får inte Safaris besked', ['CriOS/130.0.6723.90', 'EdgiOS/130.0.2849.80', 'FxiOS/132.0'].every((m) => besked(IOS.replace('Version/18.0', m)) === null));
  ska('beskedet: en iPad som säger att den är en Mac får samma besked', besked('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', { macMedPek: true })?.slag === 'safari');
  ska('beskedet: Facebooks webbläsare i iPhone får vägen ut och inte Safaris besked', besked(`${IOS.replace(' Safari/604.1', '')} [FBAN/FBIOS;FBAV/485.0]`)?.slag === 'appens');
  ska('beskedet: inget i appen', besked(IOS, { iAppen: true }) === null);
  ska('beskedet: inget i Chrome i Android och på en dator', besked('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36') === null && besked('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36') === null);
}
if (fel.length) { console.error(`appprov: ${fel.length} fel:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`appprov: manifestet, ikonerna, sidhuvudet, appens sida, länken, beskedet och service workern.`);

// ---------- I Chrome ----------
const chrome = process.env.CHROME ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!chrome) { console.error('appprov: hittar inte Chrome. Sätt CHROME=<sökväg>.'); process.exit(1); }
const TYPER = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPER[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const bas = `http://127.0.0.1:${server.address().port}`;
const port = 9600 + Math.floor(Math.random() * 300);
const profil = join(tmpdir(), `appprov-${port}`);
mkdirSync(profil, { recursive: true });
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profil}`, 'about:blank'], { stdio: 'ignore' });
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  facebook: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/485.0.0.43.70;FBLC/sv_SE]',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
};
// Telefonen härmas i sidan innan dess skript körs: webbläsarens namn, pekskärmen och om sidan körs som app.
const harma = ({ ua, pek, app }) => `(() => {
  ${ua ? `Object.defineProperty(navigator, 'userAgent', { get: () => ${JSON.stringify(ua)} });` : ''}
  const mm = window.matchMedia.bind(window);
  window.matchMedia = (q) => { const r = mm(q); if (/pointer:\\s*coarse/.test(q)) return { ...r, matches: ${!!pek}, media: q }; if (/display-mode:\\s*standalone/.test(q)) return { ...r, matches: ${!!app}, media: q }; return r; };
  // Chrome i provet erbjuder installation på riktigt, eftersom manifestet håller; den frågan stoppas, så att bara provets
  // egen kommer fram, när provet vill.
  window.addEventListener('beforeinstallprompt', (e) => { if (!e.__prov) e.stopImmediatePropagation(); }, true);
  window.__fragat = 0;
  window.__erbjud = (svar = 'accepted') => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.__prov = true; e.prompt = async () => { window.__fragat++; }; e.userChoice = Promise.resolve({ outcome: svar }); window.dispatchEvent(e); };
})();`;
async function flik(telefon) {
  let info;
  for (let i = 0; i < 40 && !info; i++) { await vanta(250); try { info = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { /* Chrome har inte startat än */ } }
  if (!info) throw new Error('Chrome svarade inte på DevTools-porten.');
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((r, x) => { ws.onopen = r; ws.onerror = x; });
  let nr = 0;
  const vantande = new Map();
  let laddad = () => {};
  const undantag = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && vantande.has(d.id)) { vantande.get(d.id)(d); vantande.delete(d.id); }
    else if (d.method === 'Page.loadEventFired') laddad();
    else if (d.method === 'Runtime.exceptionThrown') undantag.push(d.params.exceptionDetails?.exception?.description ?? d.params.exceptionDetails?.text);
  };
  const skicka = (method, params = {}) => new Promise((r) => { const id = ++nr; vantande.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await skicka('Page.enable');
  await skicka('Runtime.enable');
  await skicka('Page.addScriptToEvaluateOnNewDocument', { source: harma(telefon) });
  // En pekskärm i telefonens bredd: stilmallens (pointer: coarse) följer pekskärmen.
  if (telefon.pek) { await skicka('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await skicka('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); }
  const kor = async (expression) => { const r = await skicka('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(`${expression.slice(0, 80)}: ${r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text}`); return r.result?.result?.value; };
  return {
    undantag,
    oppna: async (url) => { const klar = new Promise((r) => { laddad = r; }); await skicka('Page.navigate', { url }); await Promise.race([klar, vanta(20000)]); await vanta(250); },
    kor,
    rad: () => kor(`(() => { const r = document.querySelector('[data-app]'); if (!r) return null; const ut = r.querySelector('[data-app-ut]'); return { syns: !r.hidden, knapp: r.querySelector('[data-app-knapp]').hidden ? '' : r.querySelector('[data-app-knapp]').textContent.trim(), ut: ut.hidden ? '' : ut.getAttribute('href'), om: r.querySelector('[data-app-om]').textContent.trim(), not: r.querySelector('[data-app-not]').hidden ? '' : r.querySelector('[data-app-not]').textContent.trim(), steg: !r.querySelector('[data-app-steg]').hidden, expanderad: r.querySelector('[data-app-knapp]').getAttribute('aria-expanded') }; })()`),
    bredd: async (bredd) => { await skicka('Emulation.setDeviceMetricsOverride', { width: bredd, height: 844, deviceScaleFactor: 2, mobile: true }); await vanta(200); return kor('document.documentElement.scrollWidth <= innerWidth'); },
    besked: (id) => kor(`(() => { const b = document.getElementById('${id}'); return b && !b.hidden ? { text: b.querySelector('[role="status"]').textContent, knapp: b.querySelector('a[href^="/app"]')?.getAttribute('href') ?? '' } : null; })()`),
    stang: () => ws.close(),
  };
}

// Planer i båda samlingarna, med datumen räknade från i dag i webbläsaren: en insats som pågår, en som kommer och en som är
// avslutad i Stödundervisning, och en plan i Lär dig metoden som är i Före.
const PLANERNA = `(() => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(x); };
  const stod = (id, titel, omrade, dagar) => ({ id, metod: id === 'prov01' ? 'textsamtal-i-grupp' : id === 'prov02' ? 'seriesamtal' : 'til-i-grupp', samling: 'stodundervisning', titel, omrade, namn: 'Prov ' + id.slice(-1), val: '', andrad: d(0) + 'T10:00:00', schema: { pass: dagar.map((n, i) => [d(n), Math.floor(i / 2) + 1, i + 1]), veckor: [[1, 1, 0, d(dagar[0]), d(dagar[1])], [2, 2, 0, d(dagar[2] ?? dagar[1]), d(dagar[3] ?? dagar[1])]] } });
  const planer = [stod('prov01', 'Textsamtal i grupp', 'Läsning', [-7, -3, 4, 8]), stod('prov02', 'Seriesamtal', 'Socialt', [10, 14]), stod('prov03', 'TIL i grupp', 'Läsning', [-70, -60])];
  planer.push({ id: 'prov04', metod: ${JSON.stringify(larDiga[0] ?? 'explicit-undervisning')}, samling: 'metoder', titel: 'Lär dig, provet', namn: '', val: '', andrad: d(0) + 'T10:00:00', skapad: d(0), schema: { pass: [], veckor: [[1, 1, 0, d(14), d(18)], [2, 2, 0, d(21), d(25)]] } });
  localStorage.setItem('insatser', JSON.stringify({ v: 1, planer }));
  return true;
})()`;

let stangd = false;
try {
  // En dator: erbjudandet först när Chrome erbjuder installation.
  let f = await flik({});
  await f.oppna(`${bas}/app`);
  ska('på en dator väntar erbjudandet på att Chrome erbjuder installation', (await f.rad())?.syns === false, await f.rad());
  await f.kor('window.__erbjud()');
  ska('på en dator med Chromes erbjudande: Installera', (await f.rad())?.knapp === 'Installera', await f.rad());
  ska('på en dator syns inte länken till appen på bankerna', (await (async () => { await f.oppna(`${bas}/stodundervisning`); return f.kor(`getComputedStyle(document.querySelector('.app-lank')).display`); })()) === 'none');
  ska('raden Hem syns inte i webbläsaren', (await f.kor(`getComputedStyle(document.querySelector('.app-hem')).display`)) === 'none');
  f.stang();

  // Android: erbjudandet kommer när webbläsaren erbjuder installation, knappen visar frågan, och ett ja gömmer det.
  f = await flik({ ua: UA.android, pek: true });
  await f.oppna(`${bas}/app`);
  await f.kor('localStorage.clear()');
  await f.oppna(`${bas}/app`);
  ska('Android: erbjudandet väntar på att webbläsaren erbjuder installation', (await f.rad())?.syns === false, await f.rad());
  await f.kor('window.__erbjud()');
  const android = await f.rad();
  ska('Android: erbjudandet med Installera', android?.syns && android.knapp === 'Installera' && android.expanderad === null, android);
  await f.kor(`document.querySelector('[data-app-knapp]').click()`);
  await vanta(200);
  ska('Android: knappen visar telefonens fråga, och ett ja gömmer erbjudandet', (await f.kor('window.__fragat')) === 1 && (await f.rad())?.syns === false, [await f.kor('window.__fragat'), await f.rad()]);
  // Tas appen bort kommer erbjudandet tillbaka nästa gång Chrome erbjuder installation (Niclas 2026-10-25).
  await f.kor(`window.dispatchEvent(new Event('appinstalled'))`);
  await f.oppna(`${bas}/app`);
  await f.kor('window.__erbjud()');
  ska('Android: efter en installation kommer erbjudandet tillbaka när Chrome erbjuder installation igen', (await f.rad())?.syns === true, await f.rad());
  // Bankerna och Planera insatsen har länken i telefonen, och Planera insatsen inget besked i Chrome i Android.
  await f.oppna(`${bas}/stodundervisning`);
  ska('Android: länken Appen Metodbanken syns på metodbanken', (await f.kor(`getComputedStyle(document.querySelector('.app-lank')).display`)) === 'block');
  ska('Android: metodbanken visar inget erbjudande', (await f.rad()) === null);
  if (planbara.length) {
    await f.oppna(`${bas}/stodundervisning/${planbara[0]}/planera`);
    ska('Android: länken Appen Metodbanken syns i Planera insatsen', (await f.kor(`getComputedStyle(document.querySelector('.app-lank')).display`)) === 'block');
    ska('Android: Planera insatsen har inget besked om Safari', !(await f.besked('pl-besked'))?.text?.includes('Gör planen i appen'), await f.besked('pl-besked'));
  }
  ska('Android: inga fel i sidan', !f.undantag.length, f.undantag);
  f.stang();

  // iPhone: erbjudandet med tre steg, raden om planerna, krysset i 30 dagar och stegen utfällda från beskedet.
  f = await flik({ ua: UA.iphone, pek: true });
  await f.oppna(`${bas}/app`);
  await f.kor('localStorage.clear()');
  await f.oppna(`${bas}/app`);
  const iphone = await f.rad();
  ska('iPhone: erbjudandet med Visa hur, utan rad om planer när inga är sparade', iphone?.syns && iphone.knapp === 'Visa hur' && iphone.expanderad === 'false' && !iphone.steg && !iphone.not, iphone);
  await f.kor(`document.querySelector('[data-app-knapp]').click()`);
  ska('iPhone: Visa hur fäller ut stegen', (await f.rad())?.steg === true && (await f.rad())?.expanderad === 'true', await f.rad());
  // Listorna utan planer: raden om var planerna görs och Öppna planer, utan Ladda ner planer.
  const tomma = await f.kor(`[...document.querySelectorAll('.pl-insatser')].map((l) => ({ syns: !l.hidden, tom: l.querySelector('[data-tom]')?.hidden === false ? l.querySelector('[data-tom]').textContent.trim() : '', ner: !l.querySelector('[data-alla-ner]').hidden }))`);
  ska('appens sida utan planer: båda listorna säger var planerna görs, med Öppna planer', tomma?.length === 2 && tomma.every((x) => x.syns && x.tom && !x.ner) && tomma[0].tom.startsWith('Inga insatser än.') && tomma[1].tom.startsWith('Inga planer än.'), tomma);
  await f.kor(PLANERNA);
  await f.oppna(`${bas}/app`);
  ska('iPhone: med sparade planer säger erbjudandet hur de flyttas till appen', (await f.rad())?.not.includes('Ladda ner planer här och Öppna planer i appen'), await f.rad());
  // Appens sida med stegen utfällda och planerna rullar inte i sidled i 320 och 360 punkter.
  await f.kor(`document.querySelector('[data-app-knapp]').click()`);
  ska('appens sida rullar inte i sidled i 320 och 360 punkter', (await f.bredd(320)) && (await f.bredd(360)));
  await f.bredd(390);
  if (planbara.length) {
    // Beskedet i Planera insatsen, och knappen till /app med stegen utfällda.
    await f.oppna(`${bas}/stodundervisning/${planbara[0]}/planera`);
    const b = await f.besked('pl-besked');
    ska('iPhone i Safari: Planera insatsen rekommenderar appen, med knappen till /app', b?.text.includes('Gör planen i appen Metodbanken.') && b.knapp === '/app#lagg-till', b);
    ska('iPhone: länken Appen Metodbanken syns i Planera insatsen', (await f.kor(`getComputedStyle(document.querySelector('.app-lank')).display`)) === 'block');
  }
  if (larDiga.length) {
    await f.oppna(`${bas}/metoder/${larDiga[0]}/lar-dig`);
    const b = await f.besked('ld-notis');
    ska('iPhone i Safari: Lär dig metoden rekommenderar appen med samma besked, med knappen till /app', b?.text.includes('Gör planen i appen Metodbanken.') && b.knapp === '/app#lagg-till', b);
  }
  await f.oppna(`${bas}/app`);
  await f.kor(`document.querySelector('[data-app-stang]').click()`);
  await f.oppna(`${bas}/app`);
  ska('iPhone: krysset gömmer erbjudandet också efter en ny laddning', (await f.rad())?.syns === false, await f.rad());
  // Läraren kommer från en annan sida, som beskedet i Planera insatsen; samma sida med ett nytt # laddas inte om.
  await f.oppna(`${bas}/stodundervisning`);
  await f.oppna(`${bas}/app#lagg-till`);
  const fran = await f.rad();
  ska('iPhone: från beskedet står erbjudandet med stegen utfällda, också efter krysset', fran?.syns && fran.steg && fran.expanderad === 'true', fran);
  await f.kor(`localStorage.setItem('appen-kryss', new Date(Date.now() - 31 * 86400000).toISOString())`);
  await f.oppna(`${bas}/app`);
  ska('iPhone: erbjudandet kommer tillbaka efter 30 dagar', (await f.rad())?.syns === true, await f.rad());
  ska('iPhone: inga fel i sidan', !f.undantag.length, f.undantag);
  f.stang();

  // En apps egen webbläsare i iPhone: vägen ut till Safari i stället för stegen.
  f = await flik({ ua: UA.facebook, pek: true });
  await f.oppna(`${bas}/app`);
  const fb = await f.rad();
  ska('i Facebooks webbläsare: erbjudandet med vägen ut till Safari', fb?.syns && fb.knapp === '' && fb.ut.startsWith('x-safari-https://') && fb.om.includes('Facebooks egen webbläsare'), fb);
  f.stang();

  // I appen själv: inget erbjudande, inget besked om Safari, listorna med planerna, och stilmallens regler för appen.
  f = await flik({ ua: UA.iphone, pek: true, app: true });
  await f.oppna(`${bas}/app`);
  await f.kor('localStorage.clear()');
  await f.kor(PLANERNA);
  await f.oppna(`${bas}/app`);
  ska('i appen syns erbjudandet inte', (await f.rad())?.syns === false, await f.rad());
  const listorna = await f.kor(`[...document.querySelectorAll('.pl-insatser')].map((l) => ({ id: l.id, syns: !l.hidden, rader: [...l.querySelectorAll(':scope > ul > li')].map((x) => x.querySelector('.pl-status')?.textContent + ':' + x.querySelector('.pl-metod')?.textContent), avslutade: l.querySelector('.pl-avslutade summary')?.textContent ?? '', appen: l.querySelector('[data-alla-appen]').hidden ? '' : l.querySelector('[data-alla-appen]').textContent }))`);
  const [stod, metoder] = listorna ?? [];
  ska('i appen: Dina insatser med pågående och kommande, och de avslutade hopfällda', stod?.syns && stod.rader.join('|') === 'Pågående:Textsamtal i grupp · Prov 1|Kommande:Seriesamtal · Prov 2' && stod.avslutade === 'En avslutad insats', stod);
  ska('i appen: Dina planer med planen i Lär dig metoden', metoder?.syns && metoder.rader.length === 1 && metoder.rader[0].startsWith('Kommande:Lär dig, provet'), metoder);
  ska('i appen: att planerna bara finns i appen står en gång, under den sista listan', !stod?.appen && metoder?.appen.startsWith('Planerna finns bara i appen'), [stod?.appen, metoder?.appen]);
  ska('i appen: trycket på en plan räknas som appens', (await f.kor(`document.querySelector('#pl-insatser-stod li a').dataset.goatcounterClick`)) === 'insatser:app');
  // Chrome kan inte härma att sidan körs som app för stilmallen (Emulation.setEmulatedMedia tar inte emot display-mode), så
  // reglerna läses ur stilmallen, och delarna som de gömmer finns på sidorna, så att en klass som byter namn märks.
  const appregler = await f.kor(`(() => { const ut = []; for (const ss of document.styleSheets) { let regler; try { regler = ss.cssRules; } catch { continue; } for (const r of regler) if (r.media && /display-mode/.test(r.media.mediaText) && /standalone/.test(r.media.mediaText)) for (const x of r.cssRules) ut.push([x.selectorText, x.style.display]); } return ut; })()`);
  const gomda = appregler.filter(([, d]) => d === 'none').flatMap(([s]) => s.split(',').map((x) => x.trim()));
  const delar = ['[data-appdel] .sidhuvud', '.metodbank-ingress', '[data-appdel] .sidfot .lankrad-lista', '.app-lank'];
  ska('i appen göms sajtens meny och sidfotens länkar på appens sidor, bankernas ingress och länken till appen', delar.every((d) => gomda.includes(d)), appregler);
  ska('i appen syns raden Hem', appregler.some(([s, d]) => s === '.app-hem' && d === 'block'), appregler);
  for (const [sida, valjare] of [['/stodundervisning', ['.sidhuvud', '.metodbank-ingress', '.sidfot .lankrad-lista', '.app-lank', '.app-hem']], ['/metoder', ['.sidhuvud', '.metodbank-ingress', '.app-lank', '.app-hem']]]) {
    await f.oppna(`${bas}${sida}`);
    ska(`delarna som göms och visas i appen finns på ${sida}, med data-appdel`, (await f.kor(`document.documentElement.hasAttribute('data-appdel') && ${JSON.stringify(valjare)}.every((d) => !!document.querySelector(d))`)) === true);
  }
  if (planbara.length) {
    await f.oppna(`${bas}/stodundervisning/${planbara[0]}/planera`);
    ska('i appen: inget besked om Safari i Planera insatsen', !(await f.besked('pl-besked'))?.text?.includes('Gör planen i appen'), await f.besked('pl-besked'));
  }
  if (larDiga.length) {
    await f.oppna(`${bas}/metoder/${larDiga[0]}/lar-dig`);
    ska('i appen: inget besked om Safari i Lär dig metoden', (await f.besked('ld-notis')) === null, await f.besked('ld-notis'));
  }
  ska('i appen: inga fel i sidan', !f.undantag.length, f.undantag);
  f.stang();

  // Service workern: appens sida sparas när den installeras, Metoder, Planera insatsen och Lär dig metoden när de öppnas, och
  // när servern har stängts, som när telefonen är utan nät, öppnas de ur kopian, och en sida som aldrig öppnats ger sidan Utan
  // nät. Det görs sist, eftersom servern stängs (granskningen 2026-10-25).
  const swf = await flik({});
  await swf.oppna(`${bas}/app`);
  await swf.kor(`navigator.serviceWorker.register('/sw-stod.js', { scope: '/' }).then(() => navigator.serviceWorker.ready).then(() => true)`);
  await vanta(500);
  const oppnade = ['/metoder', ...(planbara.length ? [`/stodundervisning/${planbara[0]}/planera`] : []), ...(larDiga.length ? [`/metoder/${larDiga[0]}/lar-dig`] : [])];
  for (const s of oppnade) { await swf.oppna(`${bas}${s}`); await vanta(400); }
  const ladan = await swf.kor(`caches.open('stod-planer').then((l) => l.keys()).then((k) => k.map((r) => new URL(r.url).pathname))`);
  ska('service workern sparar appens sida, Metoder och planens sidor i planernas låda', ['/app', ...oppnade].every((s) => ladan?.includes(s)), ladan);
  const version = sw.match(/const VERSION = '([^']+)'/)?.[1];
  ska('service workern sparar sajtens filer', ((await swf.kor(`caches.open('${version}-filer').then((l) => l.keys()).then((k) => k.length)`)) ?? 0) > 0, version);
  // En ny version tar bort den gamla lådan för filer, men flyttar först filerna som de sparade sidorna läser, med delarna som
  // skripten läser in (Codex 2026-10-31: planens sida stod kvar utan nät, men dess skript försvann med den gamla lådan). Provet
  // lägger filerna i en låda med ett äldre namn och installerar service workern på nytt.
  const flyttad = await swf.kor(`(async () => {
    const ny = await caches.open('${version}-filer'), gammal = await caches.open('stod-0-filer');
    for (const k of await ny.keys()) await gammal.put(k, await ny.match(k));
    await caches.delete('${version}-filer');
    const r = await navigator.serviceWorker.register('/sw-stod.js?prov=ny-version', { scope: '/' });
    const w = r.installing || r.waiting;
    if (w) await new Promise((ok) => { w.addEventListener('statechange', () => { if (w.state === 'activated') ok(); }); setTimeout(ok, 5000); });
    const lador = await caches.keys();
    return { gammal: lador.includes('stod-0-filer'), filer: (await (await caches.open('${version}-filer')).keys()).length };
  })()`);
  ska('en ny version av service workern tar bort den gamla lådan och flyttar filerna som de sparade sidorna läser', flyttad && !flyttad.gammal && flyttad.filer > 0, flyttad);
  server.close(); server.closeAllConnections(); stangd = true;
  const rubrik = () => swf.kor(`document.querySelector('h1')?.textContent ?? ''`);
  await swf.oppna(`${bas}/app`);
  ska('utan nät öppnas appens sida ur kopian', (await rubrik()) === 'Metodbanken', await rubrik());
  await swf.oppna(`${bas}/metoder`);
  ska('utan nät öppnas Metoder ur kopian', (await rubrik()) === 'Metoder', await rubrik());
  if (planbara.length) {
    await swf.oppna(`${bas}/stodundervisning/${planbara[0]}/planera`);
    ska('utan nät öppnas Planera insatsen ur kopian', ((await rubrik()) ?? '').includes('Planera insatsen'), await rubrik());
  }
  if (larDiga.length) {
    await swf.oppna(`${bas}/metoder/${larDiga[0]}/lar-dig`);
    await vanta(400);
    ska('utan nät öppnas Lär dig metoden ur kopian, med skripten', ((await rubrik()) ?? '').includes('Lär dig metoden') && (await swf.kor(`(document.getElementById('ld-vyn')?.children.length ?? 0) > 0`)) === true, await rubrik());
  }
  await swf.oppna(`${bas}/stodundervisning/${planbara[planbara.length - 1] ?? 'finns-inte'}`);
  ska('utan nät ger en sida som aldrig öppnats sidan Utan nät', (await rubrik()) === 'Telefonen är utan nät', await rubrik());
  swf.stang();
} catch (e) {
  fel.push(`provet i Chrome avbröts: ${e.message}`);
} finally {
  try { proc.kill(); } catch { /* redan stängd */ }
  if (!stangd) server.close();
  await vanta(300);
  try { rmSync(profil, { recursive: true, force: true }); } catch { /* Chrome släpper profilen senare */ }
}
for (const o of obs) console.log(`appprov: obs, ${o}.`);
if (fel.length) { console.error(`appprov: ${fel.length} fel:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log('appprov: erbjudandet på /app prövat i Chrome på en dator, i Android, i iPhone, i en apps webbläsare och i appen; listorna, beskedet i planens sidor och service workern utan nät.');
