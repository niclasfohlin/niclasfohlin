// Prov av appen Stöd (K-505, DRIFT.md under Appen Stöd). Läser det byggda i dist, som npm run validera bygger:
//
// | Prov | Vad |
// |---|---|
// | Manifestet | Namnen, start_url och scope /stodundervisning, display standalone och ikonerna i 192 och 512 punkter, också den maskbara (https://web.dev/articles/install-criteria) |
// | Ikonerna | Varje bild finns och har sitt mått, och iPhones ikon på 180 punkter |
// | Sidhuvudet | Sidorna under /stodundervisning har manifestet, appens ikon och namnet Stöd; resten av sajten har sajtens ikon och inget manifest |
// | Service workern | /sw-stod.js finns, med en cacheregel i netlify.toml |
// | Raden | I Chrome, med telefonen härmad: gömd på en dator och i appen; på Android först när webbläsaren erbjuder installation, och på Planera insatsen först när planen är sparad; på iPhone med tre steg och rätt rad före och efter sparandet; krysset gömmer den också efter en ny laddning |
//
//   node scripts/appprov.mjs
//
// Kräver Chrome, som scripts/planprov.mjs.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const rot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dist = join(rot, 'dist');
const fel = [];
const ska = (namn, ok, info) => { if (!ok) fel.push(`${namn}${info === undefined ? '' : `: ${typeof info === 'string' ? info : JSON.stringify(info)}`}`); };
const las = (p) => (existsSync(join(dist, p)) ? readFileSync(join(dist, p), 'utf8') : '');

// ---------- Manifestet, ikonerna, sidhuvudet och service workern ----------
let manifest = {};
try { manifest = JSON.parse(las('stodundervisning/manifest.webmanifest')); } catch { /* prövas nedan */ }
ska('manifestet finns', !!manifest.name);
ska('manifestet: namnen', manifest.name === 'Stödundervisning' && manifest.short_name === 'Stöd', [manifest.name, manifest.short_name]);
ska('manifestet: appen börjar i metodbanken och rymmer /stodundervisning', manifest.start_url === '/stodundervisning' && manifest.scope === '/stodundervisning' && manifest.id === '/stodundervisning', [manifest.start_url, manifest.scope, manifest.id]);
ska('manifestet: display standalone', manifest.display === 'standalone', manifest.display);
const ikoner = manifest.icons ?? [];
for (const [storlek, syfte] of [['192x192', undefined], ['512x512', undefined], ['512x512', 'maskable']]) {
  ska(`manifestet: ikonen ${storlek}${syfte ? ' maskbar' : ''}`, ikoner.some((i) => i.sizes === storlek && i.purpose === syfte), ikoner);
}
const matt = async (adress) => { const p = join(dist, adress); if (!existsSync(p)) return null; const m = await sharp(p).metadata(); return `${m.width}x${m.height}`; };
for (const i of ikoner) ska(`ikonen ${i.src} har sitt mått`, (await matt(i.src)) === i.sizes, [i.src, await matt(i.src)]);
ska('iPhones ikon är 180 × 180', (await matt('/stodundervisning/app/ikon-180.png')) === '180x180');

const metodbanken = las('stodundervisning/index.html');
const planbara = readdirSync(join(dist, 'stodundervisning'), { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(dist, 'stodundervisning', d.name, 'planera', 'index.html'))).map((d) => d.name);
const planera = planbara.length ? las(`stodundervisning/${planbara[0]}/planera/index.html`) : '';
const artikel = (() => { const m = readdirSync(join(dist, 'artiklar'), { withFileTypes: true }).find((d) => d.isDirectory() && existsSync(join(dist, 'artiklar', d.name, 'index.html'))); return m ? las(`artiklar/${m.name}/index.html`) : ''; })();
for (const [namn, html] of [['metodbanken', metodbanken], ['Planera insatsen', planera]]) {
  ska(`${namn}: manifestet i sidhuvudet`, html.includes('<link rel="manifest" href="/stodundervisning/manifest.webmanifest">'));
  ska(`${namn}: appens ikon för iPhone`, html.includes('<link rel="apple-touch-icon" href="/stodundervisning/app/ikon-180.png">'));
  ska(`${namn}: namnet Stöd under ikonen`, html.includes('<meta name="apple-mobile-web-app-title" content="Stöd">'));
}
ska('metodbanken har raden om appen', metodbanken.includes('data-app data-plats="metodbanken"'));
ska('Planera insatsen har raden om appen', planera.includes('data-app data-plats="planera"'));
ska('en artikel har sajtens ikon och inget manifest', !!artikel && artikel.includes('href="/apple-touch-icon.png"') && !artikel.includes('rel="manifest"'));
ska('service workern finns', las('sw-stod.js').includes("const VERSION = 'stod-"));
const toml = readFileSync(join(rot, 'netlify.toml'), 'utf8');
ska('service workern har ingen cache i netlify.toml', /for = "\/sw-stod\.js"\s+\[headers\.values\]\s+Cache-Control = "no-cache"/.test(toml));
if (fel.length) { console.error(`appprov: ${fel.length} fel:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log(`appprov: manifestet, ikonerna, sidhuvudet på ${planbara.length + 1} sidor i appen och service workern.`);

// ---------- Raden i Chrome ----------
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
  if (telefon.pek) await skicka('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const kor = async (expression) => { const r = await skicka('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) throw new Error(`${expression.slice(0, 80)}: ${r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text}`); return r.result?.result?.value; };
  return {
    undantag,
    oppna: async (url) => { const klar = new Promise((r) => { laddad = r; }); await skicka('Page.navigate', { url }); await Promise.race([klar, vanta(20000)]); await vanta(250); },
    kor,
    rad: () => kor(`(() => { const r = document.querySelector('[data-app]'); return r ? { syns: !r.hidden, knapp: r.querySelector('[data-app-knapp]').textContent.trim(), om: r.querySelector('[data-app-om]').textContent.trim(), not: r.querySelector('[data-app-not]').hidden ? '' : r.querySelector('[data-app-not]').textContent.trim(), steg: !r.querySelector('[data-app-steg]').hidden, expanderad: r.querySelector('[data-app-knapp]').getAttribute('aria-expanded') } : null; })()`),
    stang: () => ws.close(),
  };
}

const metodbankAdress = `${bas}/stodundervisning`;
const planAdress = planbara.length ? `${bas}/stodundervisning/${planbara[0]}/planera` : '';
let stangd = false;
try {
  // En dator: ingen rad.
  let f = await flik({});
  await f.oppna(metodbankAdress);
  ska('på en dator syns raden inte', (await f.rad())?.syns === false, await f.rad());
  f.stang();

  // Android: raden kommer när webbläsaren erbjuder installation, knappen visar frågan, och ett ja gömmer raden.
  f = await flik({ ua: UA.android, pek: true });
  await f.oppna(metodbankAdress);
  ska('Android: raden väntar på att webbläsaren erbjuder installation', (await f.rad())?.syns === false, await f.rad());
  await f.kor('window.__erbjud()');
  const android = await f.rad();
  ska('Android: raden med Installera', android?.syns && android.knapp === 'Installera' && android.expanderad === null, android);
  await f.kor(`document.querySelector('[data-app-knapp]').click()`);
  await vanta(200);
  ska('Android: knappen visar telefonens fråga, och ett ja gömmer raden', (await f.kor('window.__fragat')) === 1 && (await f.rad())?.syns === false, [await f.kor('window.__fragat'), await f.rad()]);
  // Tas appen bort kommer raden tillbaka nästa gång Chrome erbjuder installation (Niclas 2026-10-25).
  await f.kor(`window.dispatchEvent(new Event('appinstalled'))`);
  await f.oppna(metodbankAdress);
  await f.kor('window.__erbjud()');
  ska('Android: efter en installation kommer raden tillbaka när Chrome erbjuder installation igen', (await f.rad())?.syns === true, await f.rad());
  // Planera insatsen: raden först när planen är sparad.
  if (planAdress) {
    await f.oppna(planAdress);
    await f.kor('localStorage.clear()');
    await f.oppna(planAdress);
    await f.kor('window.__erbjud()');
    ska('Android, Planera insatsen: ingen rad före sparandet', (await f.rad())?.syns === false, await f.rad());
    await f.kor(`document.getElementById('pl-spara').click()`);
    await vanta(300);
    const sparad = await f.rad();
    ska('Android, Planera insatsen: raden när planen är sparad', sparad?.syns && sparad.om.startsWith('Ha planen på hemskärmen'), sparad);
  }
  ska('Android: inga fel i sidan', !f.undantag.length, f.undantag);
  f.stang();

  // iPhone: raden med tre steg, och krysset gömmer den också efter en ny laddning.
  f = await flik({ ua: UA.iphone, pek: true });
  await f.oppna(metodbankAdress);
  await f.kor('localStorage.clear()');
  await f.oppna(metodbankAdress);
  const iphone = await f.rad();
  ska('iPhone: raden med Visa hur', iphone?.syns && iphone.knapp === 'Visa hur' && iphone.expanderad === 'false' && !iphone.steg, iphone);
  await f.kor(`document.querySelector('[data-app-knapp]').click()`);
  ska('iPhone: Visa hur fäller ut stegen', (await f.rad())?.steg === true && (await f.rad())?.expanderad === 'true', await f.rad());
  if (planAdress) {
    await f.oppna(planAdress);
    const fore = await f.rad();
    ska('iPhone, Planera insatsen: före sparandet görs planen i appen', fore?.syns && fore.om.startsWith('Planerar du i telefonen?'), fore);
    await f.kor(`document.getElementById('pl-spara').click()`);
    await vanta(300);
    const efter = await f.rad();
    ska('iPhone, Planera insatsen: efter sparandet hur planen flyttas som fil', efter?.syns && efter.om.startsWith('Ha planen på hemskärmen') && efter.not.includes('Ladda ner planen') && efter.not.includes('Öppna en nedladdad plan'), efter);
  }
  await f.oppna(metodbankAdress);
  await f.kor(`document.querySelector('[data-app-stang]').click()`);
  await f.oppna(metodbankAdress);
  ska('iPhone: krysset gömmer raden också efter en ny laddning', (await f.rad())?.syns === false, await f.rad());
  ska('iPhone: inga fel i sidan', !f.undantag.length, f.undantag);
  f.stang();

  // I appen själv: ingen rad.
  f = await flik({ ua: UA.iphone, pek: true, app: true });
  await f.oppna(metodbankAdress);
  await f.kor('localStorage.clear()');
  await f.oppna(metodbankAdress);
  ska('i appen syns raden inte', (await f.rad())?.syns === false, await f.rad());
  // I appen är appen bara Stödundervisning (Niclas 2026-10-25): regeln för appen i stilmallen gömmer sajtens menyrad,
  // metodbankens ingress och sidfotens länkar, och de finns på sidan, så att en klass som byter namn märks. Chrome kan inte
  // härma att sidan körs som app för stilmallen (Emulation.setEmulatedMedia tar inte emot display-mode), så regeln läses
  // ur stilmallen. En metod har länkraden tillbaka till metodbanken.
  const appregler = await f.kor(`(() => { const ut = []; for (const ss of document.styleSheets) { let regler; try { regler = ss.cssRules; } catch { continue; } for (const r of regler) if (r.media && /display-mode/.test(r.media.mediaText) && /standalone/.test(r.media.mediaText)) for (const x of r.cssRules) ut.push([x.selectorText, x.style.display]); } return ut; })()`);
  const gomda = appregler.filter(([, d]) => d === 'none').flatMap(([s]) => s.split(',').map((x) => x.trim()));
  const delar = ['.sidhuvud', '.metodbank-ingress', '.sidfot .lankrad-lista'];
  ska('i appen göms menyraden, metodbankens ingress och sidfotens länkar', delar.every((d) => gomda.includes(d)), appregler);
  ska('delarna som göms i appen finns på metodbanken', (await f.kor(`${JSON.stringify(delar)}.every((d) => !!document.querySelector(d))`)) === true);
  ska('i webbläsaren syns menyraden och metodbankens ingress', (await f.kor(`['.sidhuvud', '.metodbank-ingress'].every((d) => getComputedStyle(document.querySelector(d)).display !== 'none')`)) === true);
  if (planbara.length) {
    await f.oppna(`${bas}/stodundervisning/${planbara[0]}`);
    ska('en metod har länkraden tillbaka till metodbanken', (await f.kor(`!!document.querySelector('.brodsmula a[href="/stodundervisning"]')`)) === true);
  }
  f.stang();
  // Service workern: metodbanken sparas när den installeras och planen när den öppnas, och när servern har stängts, som
  // när telefonen är utan nät, öppnas planen ur kopian och en sida som aldrig öppnats ger sidan Utan nät. Det görs sist,
  // eftersom servern stängs (granskningen 2026-10-25).
  if (planAdress) {
    const sw = await flik({});
    await sw.oppna(metodbankAdress);
    await sw.kor(`navigator.serviceWorker.register('/sw-stod.js', { scope: '/stodundervisning' }).then(() => navigator.serviceWorker.ready).then(() => true)`);
    await vanta(500);
    await sw.oppna(planAdress);
    await vanta(500);
    const ladan = await sw.kor(`caches.open('stod-planer').then((l) => l.keys()).then((k) => k.map((r) => new URL(r.url).pathname))`);
    const plan = new URL(planAdress).pathname;
    ska('service workern sparar metodbanken och planen i planernas låda', ladan?.includes('/stodundervisning') && ladan.includes(plan), ladan);
    const version = las('sw-stod.js').match(/const VERSION = '([^']+)'/)?.[1];
    ska('service workern sparar sajtens filer', ((await sw.kor(`caches.open('${version}-filer').then((l) => l.keys()).then((k) => k.length)`)) ?? 0) > 0, version);
    server.close(); server.closeAllConnections(); stangd = true;
    await sw.oppna(planAdress);
    ska('utan nät öppnas planen ur kopian', ((await sw.kor(`document.querySelector('h1')?.textContent ?? ''`)) ?? '').includes('Planera insatsen'), await sw.kor(`document.title`));
    await sw.oppna(`${bas}/stodundervisning/${planbara[planbara.length - 1]}`);
    ska('utan nät ger en sida som aldrig öppnats sidan Utan nät', ((await sw.kor(`document.querySelector('h1')?.textContent ?? ''`)) ?? '') === 'Telefonen är utan nät', await sw.kor(`document.title`));
    sw.stang();
  }
} catch (e) {
  fel.push(`provet i Chrome avbröts: ${e.message}`);
} finally {
  try { proc.kill(); } catch { /* redan stängd */ }
  if (!stangd) server.close();
  await vanta(300);
  try { rmSync(profil, { recursive: true, force: true }); } catch { /* Chrome släpper profilen senare */ }
}
if (fel.length) { console.error(`appprov: ${fel.length} fel:\n  ${fel.join('\n  ')}`); process.exit(1); }
console.log('appprov: raden prövad i Chrome på en dator, i Android, i iPhone och i appen, på metodbanken och Planera insatsen.');
