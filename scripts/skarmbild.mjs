#!/usr/bin/env node
// Skärmbild av en sida med Chrome via DevTools-protokollet, med riktig mobilemulering.
// Headless Chrome har en minsta fönsterbredd, så --window-size=390 ger en beskuren bredare sida;
// det här skriptet sätter i stället skärmens mått med Emulation.setDeviceMetricsOverride.
//
//   node scripts/skarmbild.mjs <url> <ut.png>               Dator, 1280 px bred, hela sidan
//   node scripts/skarmbild.mjs <url> <ut.png> --mobil       Mobil, 390 px, mobilläge, hela sidan
//   node scripts/skarmbild.mjs <url> <ut.png> --bredd 768   Egen bredd
//
// Kräver Chrome (Windows-sökvägen nedan eller CHROME i miljön) och Node 22 eller senare.

import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const [url, ut] = args.filter((a) => !a.startsWith('--'));
if (!url || !ut) {
  console.error('Ange url och utfil: node scripts/skarmbild.mjs <url> <ut.png> [--mobil] [--bredd <px>]');
  process.exit(1);
}
const mobil = args.includes('--mobil');
const bredd = args.includes('--bredd') ? Number(args[args.indexOf('--bredd') + 1]) : mobil ? 390 : 1280;
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
  const hojd = await utvardera('Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight))');
  const bredast = await utvardera('Math.ceil(document.documentElement.scrollWidth)');
  await skicka('Emulation.setDeviceMetricsOverride', { width: bredd, height: hojd, deviceScaleFactor: mobil ? 2 : 1, mobile: mobil });
  await vanta(200);
  const svar = await skicka('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  writeFileSync(ut, Buffer.from(svar.result.data, 'base64'));
  console.log(`${ut}: ${bredd}x${hojd} css-px${bredast > bredd ? `, OBS sidan är ${bredast} px bred och rullar i sidled` : ''}`);
  ws.close();
} finally {
  proc.kill();
}
