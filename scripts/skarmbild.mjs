#!/usr/bin/env node
// Skärmbild av en sida med Chrome via DevTools-protokollet, med riktig mobilemulering.
// Headless Chrome har en minsta fönsterbredd, så --window-size=390 ger en beskuren bredare sida;
// det här skriptet sätter i stället skärmens mått med Emulation.setDeviceMetricsOverride.
//
//   node scripts/skarmbild.mjs <url> <ut.png>               Dator, 1280 px bred, hela sidan
//   node scripts/skarmbild.mjs <url> <ut.png> --mobil       Mobil, 390 px, mobilläge, hela sidan
//   node scripts/skarmbild.mjs <url> <ut.png> --bredd 768   Egen bredd
//   node scripts/skarmbild.mjs <url> <ut.png> --hojd 2000   Bara sidans övre del
//   node scripts/skarmbild.mjs <url> <ut.png> --js "<uttryck>"   Kör ett uttryck i sidan först, som att fälla ut en nivå
//                                                              (document.querySelector('details').open = true)
//   node scripts/skarmbild.mjs <url> <ut.png> --fran <väljare>  Börja bilden vid elementet, med --hojd som höjd
//
// En sida som är högre än 6 000 punkter sparas i delar, <ut>-1.png, <ut>-2.png och så vidare, var och en högst
// 6 000 punkter hög: Chrome ritar inte hela ytan på en gång, och nederdelen blev annars vit (K-037).
//
// Kräver Chrome (Windows-sökvägen nedan eller CHROME i miljön) och Node 22 eller senare.

import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
// Värdena efter --bredd, --hojd, --js och --fran är inte adressen eller filen.
const [url, ut] = args.filter((a, i) => !a.startsWith('--') && !['--bredd', '--hojd', '--js', '--fran'].includes(args[i - 1]));
if (!url || !ut) {
  console.error('Ange url och utfil: node scripts/skarmbild.mjs <url> <ut.png> [--mobil] [--bredd <px>]');
  process.exit(1);
}
const mobil = args.includes('--mobil');
const bredd = args.includes('--bredd') ? Number(args[args.indexOf('--bredd') + 1]) : mobil ? 390 : 1280;
// --hojd <px> tar bara sidans övre del, för mycket långa sidor.
const maxHojd = args.includes('--hojd') ? Number(args[args.indexOf('--hojd') + 1]) : Infinity;
const js = args.includes('--js') ? args[args.indexOf('--js') + 1] : undefined;
const fran = args.includes('--fran') ? args[args.indexOf('--fran') + 1] : undefined;
const dpr = mobil ? 2 : 1;
// Sidor högre än DEL punkter tas i avsnitt och sparas som <ut>-1.png, <ut>-2.png … (K-037).
const DEL = 6000;
const AVSNITT = 1000;
const chrome = process.env.CHROME ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
if (!chrome) { console.error('Hittar inte Chrome. Sätt CHROME=<sökväg>.'); process.exit(1); }

const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--user-data-dir=${process.env.TEMP ?? '/tmp'}/skarmbild-${port}`, 'about:blank'], { stdio: 'ignore' });
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let mal;
  for (let i = 0; i < 40 && !mal; i++) {
    await vanta(250);
    try {
      const svar = await fetch(`http://127.0.0.1:${port}/json/list`);
      const lista = await svar.json();
      mal = lista.find((t) => t.type === 'page');
    } catch { /* Chrome har inte startat än */ }
  }
  if (!mal) throw new Error('Chrome svarade inte på DevTools-porten.');

  const ws = new WebSocket(mal.webSocketDebuggerUrl);
  await new Promise((r, x) => { ws.onopen = r; ws.onerror = x; });
  let nr = 0;
  const vantande = new Map();
  const handelser = [];
  ws.onmessage = (m) => {
    const data = JSON.parse(m.data);
    if (data.id && vantande.has(data.id)) { vantande.get(data.id)(data); vantande.delete(data.id); }
    else if (data.method) handelser.push(data.method);
  };
  const skicka = (method, params = {}) => new Promise((r) => { const id = ++nr; vantande.set(id, r); ws.send(JSON.stringify({ id, method, params })); });

  await skicka('Page.enable');
  await skicka('Emulation.setDeviceMetricsOverride', { width: bredd, height: mobil ? 844 : 900, deviceScaleFactor: mobil ? 2 : 1, mobile: mobil });
  if (mobil) await skicka('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  await skicka('Emulation.setTouchEmulationEnabled', { enabled: mobil });
  await skicka('Page.navigate', { url });
  for (let i = 0; i < 80 && !handelser.includes('Page.loadEventFired'); i++) await vanta(100);
  await vanta(400);
  const utvardera = async (expression) => (await skicka('Runtime.evaluate', { expression, returnByValue: true })).result.result.value;
  if (js) { await utvardera(js); await vanta(400); }
  const topp = fran ? Math.max(0, Math.floor(await utvardera(`(() => { const e = document.querySelector(${JSON.stringify(fran)}); return e ? e.getBoundingClientRect().top + scrollY - 12 : 0; })()`))) : 0;
  const hojd = Math.min(maxHojd, await utvardera('Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight))') - topp);
  const bredast = await utvardera('Math.ceil(document.documentElement.scrollWidth)');
  const sidled = bredast > bredd ? `, OBS sidan är ${bredast} px bred och rullar i sidled` : '';
  if (hojd <= DEL) {
    await skicka('Emulation.setDeviceMetricsOverride', { width: bredd, height: topp ? (mobil ? 844 : 900) : hojd, deviceScaleFactor: dpr, mobile: mobil });
    await vanta(200);
    const klipp = Number.isFinite(maxHojd) || topp ? { clip: { x: 0, y: topp, width: bredd, height: hojd, scale: 1 } } : {};
    const svar = await skicka('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, ...klipp });
    writeFileSync(ut, Buffer.from(svar.result.data, 'base64'));
    console.log(`${ut}: ${bredd}x${hojd} css-px${sidled}`);
  } else {
    // Långa sidor (K-037): Chrome ritar inte en yta på 100 000 pixlar, och nederdelen blev vit. Sidan rullas
    // i avsnitt om AVSNITT punkter, och avsnitten sätts ihop till delbilder på högst DEL punkter.
    const sharp = (await import('sharp')).default;
    await skicka('Emulation.setDeviceMetricsOverride', { width: bredd, height: AVSNITT, deviceScaleFactor: dpr, mobile: mobil });
    const delar = [];
    for (let start = 0, n = 1; start < hojd; start += DEL, n++) {
      const slut = Math.min(hojd, start + DEL);
      const bitar = [];
      for (let y = start; y < slut; y += AVSNITT) {
        const h = Math.min(AVSNITT, slut - y);
        await skicka('Runtime.evaluate', { expression: `window.scrollTo(0, ${y})` });
        await vanta(250);
        const svar = await skicka('Page.captureScreenshot', { format: 'png', clip: { x: 0, y, width: bredd, height: h, scale: 1 } });
        bitar.push({ input: Buffer.from(svar.result.data, 'base64'), top: Math.round((y - start) * dpr), left: 0 });
      }
      const fil = ut.replace(/(\.png)?$/i, `-${n}.png`);
      await sharp({ create: { width: bredd * dpr, height: Math.round((slut - start) * dpr), channels: 4, background: '#ffffff' } }).composite(bitar).png().toFile(fil);
      delar.push(fil);
    }
    console.log(`${delar.length} delar, ${bredd}x${hojd} css-px${sidled}:\n  ${delar.join('\n  ')}`);
  }
  ws.close();
} finally {
  proc.kill();
}
