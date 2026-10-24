#!/usr/bin/env node
// Läsarens webbläsare: en Chrome som en kall läsare styr med korta kommandon, som en lärare med en telefon (K-492). Kalla
// läsare, testare och buggjägare är agenter som prövar en testversion med det här verktyget utan att läsa koden; hur de
// får sina uppdrag och hur svaren vägs står i METODER.md under Planera insatsen, i stycket Proven.
//
//   node scripts/lasare.mjs serve <port> --bilder <mapp>     startar Chrome och tar emot kommandon på porten (körs i bakgrunden)
//   node scripts/lasare.mjs <port> <kommando> [argument …]   ett kommando; svaret skrivs ut
//
// Kommandona:
//   oppna <adress>            öppnar sidan
//   ladda | tillbaka | adress laddar om sidan, går tillbaka i historiken, eller skriver adressen
//   telefon | dator           skärmen som en iPhone (390 × 844) eller en dator (1280 × 900)
//   datum <ÅÅÅÅ-MM-DD> | datum av   låtsas att det är den dagen (sidan laddas om), eller tillbaka till i dag
//   text [del]                sidans synliga text, eller bara den del vars rubrik eller etikett innehåller orden
//   knappar                   det som går att trycka på, skriva i eller välja, synligt på sidan, numrerat
//   tryck <nr | text>         trycker på det numrerade eller det vars text innehåller orden
//   skriv <nr | etikett> <text>    skriver i ett fält (ersätter det som står där)
//   valj <nr | etikett> <alternativ>   väljer i en lista, efter värde eller synlig text
//   kryss <nr | etikett>      kryssar i eller ur en ruta
//   rulla ned | upp | topp | botten | <nr>   rullar en skärm, till toppen, till botten eller till det numrerade
//   bild <namn> [hel]         bild av skärmen, eller av hela sidan i delar; svaret säger var filerna ligger
//   kopierat                  texten som sidan senast kopierade
//   filer                     filerna som sidan har hämtat, med början av textfilerna
//   besked                    beskedet längst ned och notisen överst
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const args = process.argv.slice(2);
if (args[0] === 'serve') await serve(Number(args[1]), args.includes('--bilder') ? args[args.indexOf('--bilder') + 1] : '.');
else {
  const port = Number(args[0]);
  try {
    const svar = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', body: JSON.stringify(args.slice(1)) });
    console.log(await svar.text());
  } catch (e) { console.log(`Webbläsaren svarar inte på port ${port}: ${e.message}`); process.exit(1); }
}

async function serve(port, bildmapp) {
  bildmapp = resolve(bildmapp);
  mkdirSync(bildmapp, { recursive: true });
  const nedladdat = join(bildmapp, 'hamtat');
  mkdirSync(nedladdat, { recursive: true });
  const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(existsSync);
  const dport = port + 1000;
  // Profilen ligger utanför repot, så att typkontrollen och git aldrig ser Chromes egna filer.
  const profil = join(tmpdir(), `lasare-profil-${port}`);
  spawn(chrome, [`--remote-debugging-port=${dport}`, '--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profil}`, 'about:blank'], { stdio: 'ignore' });
  const vanta = (ms) => new Promise((r) => setTimeout(r, ms));
  let info;
  // En egen flik, som provet av planen gör: den första fliken syns inte alltid i listan i Chrome utan fönster.
  for (let i = 0; i < 80 && !info; i++) { await vanta(250); try { info = await (await fetch(`http://127.0.0.1:${dport}/json/new?about:blank`, { method: 'PUT' })).json(); } catch { /* startar */ } }
  if (!info) { console.log('Chrome startade inte.'); process.exit(1); }
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let nr = 0;
  const vantande = new Map();
  let laddad = () => {};
  // En sida som laddar: från det att ramen börjar ladda tills sidan har laddat klart.
  let laddar = false;
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && vantande.has(d.id)) { vantande.get(d.id)(d); vantande.delete(d.id); } else if (d.method === 'Page.frameStartedLoading') laddar = true; else if (d.method === 'Page.loadEventFired') { laddar = false; laddad(); } };
  const skicka = (method, params = {}) => new Promise((r) => { const id = ++nr; vantande.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const kor = async (expression) => { const r = await skicka('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.result?.exceptionDetails) return `FEL: ${r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text}`; return r.result?.result?.value; };
  await skicka('Page.enable');
  await skicka('Runtime.enable');
  await skicka('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: nedladdat });
  let datum = null;
  let skriptId = null;
  const forbered = () => `(() => {
    ${datum ? `const FAST = ${Date.parse(`${datum}T09:00:00`)}; const D = Date; const borjan = D.now();
    class F extends D { constructor(...a) { super(...(a.length ? a : [FAST + (D.now() - borjan)])); } static now() { return FAST + (D.now() - borjan); } }
    globalThis.Date = F;` : ''}
    window.__kopierat = null;
    try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__kopierat = t; sessionStorage.setItem('__kopierat', t); } }, configurable: true }); } catch {}
  })();`;
  const sattSkript = async () => {
    if (skriptId) await skicka('Page.removeScriptToEvaluateOnNewDocument', { identifier: skriptId });
    skriptId = (await skicka('Page.addScriptToEvaluateOnNewDocument', { source: forbered() })).result.identifier;
  };
  await sattSkript();
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  let skarm = 'telefon';
  const telefon = async () => { skarm = 'telefon'; await skicka('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await skicka('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); await skicka('Network.setUserAgentOverride', { userAgent: IPHONE }); };
  const dator = async () => { skarm = 'dator'; await skicka('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }); await skicka('Emulation.setTouchEmulationEnabled', { enabled: false }); await skicka('Network.setUserAgentOverride', { userAgent: '' }); };
  await telefon();
  const oppna = async (url) => { const klar = new Promise((r) => { laddad = r; }); await skicka('Page.navigate', { url }); await Promise.race([klar, vanta(20000)]); await vanta(500); };
  // Det synliga som går att använda, numrerat: knappar, länkar, fält, listor, kryssrutor och rubriker som fäller ut.
  const LISTA = `(() => {
    const synlig = (el) => el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) && el.getClientRects().length;
    const alla = [...document.querySelectorAll('a[href], button, input, select, textarea, summary, label.knapp')].filter((el) => synlig(el) || (el.type === 'checkbox' && el.closest('label') && synlig(el.closest('label'))) || (el.type === 'file' && synlig(el.closest('label'))));
    document.querySelectorAll('[data-lasare]').forEach((el) => el.removeAttribute('data-lasare'));
    return alla.map((el, i) => {
      el.setAttribute('data-lasare', String(i + 1));
      const etikett = (el.labels?.[0]?.innerText || el.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim();
      const text = (el.innerText || el.value || '').replace(/\\s+/g, ' ').trim();
      const slag = el.tagName === 'A' ? 'länk' : el.tagName === 'SELECT' ? 'lista' : el.tagName === 'TEXTAREA' ? 'textruta' : el.tagName === 'SUMMARY' ? 'fäller ut' : el.tagName === 'INPUT' ? (el.type === 'checkbox' ? 'kryssruta' : el.type === 'file' ? 'fil' : el.type === 'date' ? 'datum' : 'fält') : 'knapp';
      const lage = el.tagName === 'SELECT' ? ' = ' + (el.selectedOptions[0]?.text ?? '') : el.type === 'checkbox' ? (el.checked ? ' (ikryssad)' : ' (tom)') : el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? ' = "' + (el.value || '').slice(0, 60) + '"' : el.getAttribute('aria-pressed') === 'true' ? ' (vald)' : el.tagName === 'SUMMARY' ? (el.parentElement.open ? ' (utfälld)' : ' (hopfälld)') : '';
      return '[' + (i + 1) + '] ' + slag + ' ' + JSON.stringify((text || etikett).slice(0, 90)) + (etikett && text && etikett !== text ? ' (' + etikett.slice(0, 60) + ')' : '') + lage;
    }).join('\\n');
  })()`;
  const hitta = (vad) => `(() => {
    const vad = ${JSON.stringify(String(vad))};
    if (/^\\d+$/.test(vad)) return document.querySelector('[data-lasare="' + vad + '"]');
    const synlig = (el) => el.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true }) && el.getClientRects().length;
    const kandidater = [...document.querySelectorAll('a[href], button, input, select, textarea, summary, label')].filter((el) => synlig(el) || (el.type === 'checkbox' && el.closest('label') && synlig(el.closest('label'))));
    const text = (el) => ((el.innerText || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.labels?.[0]?.innerText || '') + ' ' + (el.placeholder || '')).replace(/\\s+/g, ' ').trim().toLowerCase();
    const v = vad.toLowerCase();
    return kandidater.find((el) => text(el) === v) || kandidater.find((el) => text(el).startsWith(v)) || kandidater.find((el) => text(el).includes(v)) || null;
  })()`;
  const efter = async () => {
    await vanta(350);
    // Ledde trycket till en ny sida väntar svaret in den, och sidans skript.
    for (let i = 0; i < 60 && laddar; i++) await vanta(250);
    await vanta(laddar ? 0 : 450);
    return kor(`(() => {
      const t = document.getElementById('pl-toast'); const b = document.getElementById('pl-besked');
      const delar = [];
      if (t && !t.hidden && t.innerText.trim()) delar.push('Beskedet längst ned: ' + t.innerText.replace(/\\s+/g, ' ').trim());
      if (b && !b.hidden && b.innerText.trim()) delar.push('Notisen överst: ' + b.innerText.replace(/\\s+/g, ' ').trim());
      const a = document.activeElement; if (a && a !== document.body) delar.push('I fokus: ' + (a.innerText || a.value || a.getAttribute('aria-label') || a.tagName).replace(/\\s+/g, ' ').trim().slice(0, 80));
      return delar.join('\\n') || 'Inget besked.';
    })()`);
  };
  const bild = async (namn, hel) => {
    const m = await skicka('Page.getLayoutMetrics');
    const vp = m.result.cssLayoutViewport, hojd = Math.ceil(m.result.cssContentSize.height);
    const filer = [];
    const ta = async (y, h, fil) => { const r = await skicka('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!hel, clip: { x: 0, y, width: vp.clientWidth, height: h, scale: 1 } }); writeFile(fil, Buffer.from(r.result.data, 'base64')); filer.push(fil); };
    if (!hel) await ta(vp.pageY, vp.clientHeight, join(bildmapp, `${namn}.png`));
    else for (let y = 0, i = 1; y < hojd && i <= 12; y += vp.clientHeight, i++) await ta(y, Math.min(vp.clientHeight, hojd - y), join(bildmapp, `${namn}-${i}.png`));
    return `Bilder: ${filer.join(', ')}${hel && hojd > vp.clientHeight * 12 ? ' (sidan är längre än tolv skärmar; resten är inte med)' : ''}`;
  };
  const { writeFileSync: writeFile } = await import('node:fs');

  const gor = async ([kommando, ...a]) => {
    switch (kommando) {
      case 'oppna': await oppna(a[0]); return `Öppnad: ${await kor('document.title')}\n${await efter()}`;
      case 'ladda': { const klar = new Promise((r) => { laddad = r; }); await kor('location.reload()'); await Promise.race([klar, vanta(15000)]); await vanta(600); return `Omladdad: ${await kor('document.title')}
${await efter()}`; }
      case 'tillbaka': { const klar = new Promise((r) => { laddad = r; }); await kor('history.back()'); await Promise.race([klar, vanta(4000)]); await vanta(600); return `Tillbaka: ${await kor('document.title')} (${await kor('location.pathname + location.hash')})
${await efter()}`; }
      case 'adress': return kor('location.href');
      case 'telefon': await telefon(); await kor('location.reload()'); await vanta(1500); return 'Skärmen är en iPhone, 390 × 844.';
      case 'dator': await dator(); await kor('location.reload()'); await vanta(1500); return 'Skärmen är en dator, 1280 × 900.';
      case 'datum': datum = a[0] === 'av' ? null : a[0]; await sattSkript(); await kor('location.reload()'); await vanta(1500); return datum ? `Det är nu ${datum}, kl. 9 (sidan är omladdad).` : 'Datumet är dagens igen.';
      case 'text': {
        const del = a.join(' ');
        return kor(`(() => {
          const rot = document.querySelector('main') || document.body;
          let el = rot;
          if (${JSON.stringify(del)}) { const v = ${JSON.stringify(del.toLowerCase())}; const h = [...rot.querySelectorAll('h1,h2,h3,summary,.pl-etikett,legend')].find((x) => x.innerText.toLowerCase().includes(v)); el = h ? (h.closest('section,details,fieldset,div') || h.parentElement) : rot; }
          return el.innerText.replace(/\\n{3,}/g, '\\n\\n').slice(0, 7000);
        })()`);
      }
      case 'knappar': return kor(LISTA);
      case 'tryck': {
        const r = await kor(`(() => { const el = ${hitta(a.join(' '))}; if (!el) return 'Hittar inget att trycka på som heter så.'; el.scrollIntoView({ block: 'center' }); const t = (el.innerText || el.getAttribute('aria-label') || el.value || '').replace(/\\s+/g, ' ').trim(); if (el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(el.type))) { el.focus(); return 'Fältet har fokus: ' + t; } el.click(); return 'Tryckte på: ' + t.slice(0, 80); })()`);
        return `${r}\n${await efter()}`;
      }
      case 'skriv': {
        const [vem, ...ord] = a;
        const r = await kor(`(() => { const funnen = ${hitta(vem)}; const el = funnen?.tagName === 'LABEL' ? (funnen.control || funnen.querySelector('select, input, textarea')) : funnen; if (!el) return 'Hittar inget fält som heter så.'; el.scrollIntoView({ block: 'center' }); el.focus(); el.value = ${JSON.stringify(ord.join(' ').replace(/\\n/g, '\n'))}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return 'Skrev i: ' + ((el.labels?.[0]?.innerText || el.getAttribute('aria-label') || el.id) + '').replace(/\\s+/g, ' ').trim(); })()`);
        await vanta(900);
        await kor('document.activeElement?.blur()');
        return `${r}\n${await efter()}`;
      }
      case 'valj': {
        const [vem, ...ord] = a;
        const r = await kor(`(() => { const funnen = ${hitta(vem)}; const el = funnen?.tagName === 'LABEL' ? (funnen.control || funnen.querySelector('select, input, textarea')) : funnen; if (!el || el.tagName !== 'SELECT') return 'Hittar ingen lista som heter så.'; const v = ${JSON.stringify(ord.join(' '))}.toLowerCase(); const o = [...el.options].find((x) => x.value.toLowerCase() === v || x.text.toLowerCase() === v) || [...el.options].find((x) => x.text.toLowerCase().includes(v)); if (!o) return 'Listan har inget sådant alternativ. Alternativen: ' + [...el.options].map((x) => x.text).slice(0, 40).join(', '); el.value = o.value; el.dispatchEvent(new Event('change', { bubbles: true })); return 'Valde: ' + o.text; })()`);
        return `${r}\n${await efter()}`;
      }
      case 'kryss': {
        const r = await kor(`(() => { const funnen = ${hitta(a.join(' '))}; const el = funnen?.tagName === 'LABEL' ? (funnen.control || funnen.querySelector('input')) : funnen; const box = el?.type === 'checkbox' ? el : el?.querySelector?.('input[type=checkbox]'); if (!box) return 'Hittar ingen kryssruta som heter så.'; box.click(); return (box.checked ? 'Ikryssad: ' : 'Urkryssad: ') + (box.labels?.[0]?.innerText ?? '').trim(); })()`);
        return `${r}\n${await efter()}`;
      }
      case 'rulla': {
        const v = a[0] ?? 'ned';
        await kor(v === 'ned' ? 'scrollBy(0, innerHeight * 0.85)' : v === 'upp' ? 'scrollBy(0, -innerHeight * 0.85)' : v === 'topp' ? 'scrollTo(0, 0)' : v === 'botten' ? 'scrollTo(0, document.body.scrollHeight)' : `document.querySelector('[data-lasare="${v}"]')?.scrollIntoView({ block: 'center' })`);
        await vanta(300);
        return kor('`Rullat. Skärmen visar ${Math.round(scrollY)} till ${Math.round(scrollY + innerHeight)} av ${document.body.scrollHeight} punkter.`');
      }
      case 'bild': return bild(a[0] ?? `bild-${Date.now()}`, a[1] === 'hel');
      case 'kopierat': return (await kor('window.__kopierat ?? sessionStorage.getItem("__kopierat")')) ?? 'Inget har kopierats.';
      case 'filer': {
        const filer = readdirSync(nedladdat).filter((f) => !f.endsWith('.crdownload'));
        return filer.length ? filer.map((f) => { const p = join(nedladdat, f); const s = statSync(p).size; return `${f} (${s} byte)${/\.(ics|json|txt)$/.test(f) ? `\n${readFileSync(p, 'utf8').slice(0, 1500)}` : ''}`; }).join('\n\n') : 'Inga hämtade filer.';
      }
      case 'besked': return efter();
      default: return `Okänt kommando: ${kommando}. Kommandona: oppna, ladda, tillbaka, adress, telefon, dator, datum, text, knappar, tryck, skriv, valj, kryss, rulla, bild, kopierat, filer, besked.`;
    }
  };
  createServer((req, res) => {
    let kropp = '';
    req.on('data', (d) => { kropp += d; });
    req.on('end', async () => {
      let ut;
      try { ut = await gor(JSON.parse(kropp || '[]')); } catch (e) { ut = `FEL: ${e.message}`; }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(String(ut ?? ''));
    });
  }).listen(port, '127.0.0.1', () => console.log(`Läsarens webbläsare är redo på port ${port}. Bilder och hämtade filer i ${bildmapp}.`));
}
