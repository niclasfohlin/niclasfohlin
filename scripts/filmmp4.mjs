#!/usr/bin/env node
// Filmerna som mp4 (Niclas 2026-10-07): varje film ur metodriggen, <id>-film.svg, blir också <id>-film.mp4 och en
// omslagsbild, <id>-film-omslag.png, i public/stodundervisning/. Mp4-filen spelar i lathundens PowerPoint, där en svg
// med CSS-animation bara blir en trasig stillbild, och laddas ner i metodens zip (src/lib/filmfil.ts). Svg-filen är
// källan: filmen ritas i Chrome en tidpunkt i taget, 25 bilder per sekund i 1280 × 720, och kodas med ffmpeg (H.264,
// crf 30), 110 till 450 kB per film. Filmen ritas i 97 procent av bilden, så att en smal remsa blir fri nederst, och
// där står upphovet i liten stil i högra hörnet (Niclas: "(c) Niclas Fohlin niclasfohlin.se i liten stil i nedre
// hörnet"); en rad ovanpå filmen skulle krocka med filmens textrad, som kan gå nästan kant till kant.
//
// Omslagsbilden är den innehållsrikaste rutan som står still i filmen, bland de stilla lägen som inte är filmens
// nollställda scen (se omslaget nedan). Den visas i PowerPoint innan filmen spelas, och som småbild i spelaren på
// lathundssidan. Blir valet fel för en film är det filmen som ska ändras, inte bilden: be metodriggen låta filmens
// färdiga läge stå still i minst en sekund (C:/metodrigg/out/FRAN-SAJTEN.md under Filmerna som mp4).
//
// Allt ur en källa utan drift: ingen behöver komma ihåg att göra en mp4. npm run validera kör --vid-behov, som gör de
// filmer som saknar mp4 eller har fått en ny svg-fil och tar bort överblivna filer; bygget på Netlify kör
// --kontrollera och stannar om en publicerad metods film saknar sin mp4 eller har en inaktuell. Filerna committas:
// Netlify har varken Chrome eller ffmpeg. Ett manifest (film-mp4.json) bär kontrollsumman av det som påverkar filen,
// så att kontrollen inte behöver något av dem. Ett utkast får också sin mp4, så att det går att öppna lokalt, men
// kontrollen kräver den inte.
//
//   node scripts/filmmp4.mjs                    alla filmer
//   node scripts/filmmp4.mjs <id>-film2 …       bara de angivna
//   node scripts/filmmp4.mjs --vid-behov        bara de som saknas eller är inaktuella (körs i npm run validera)
//   node scripts/filmmp4.mjs --kontrollera      stanna om en mp4 saknas, är inaktuell eller överbliven (npm run build)
//
// Kräver Chrome (CHROME i miljön eller den vanliga platsen) och ffmpeg med ffprobe (FFMPEG och FFPROBE i miljön, PATH
// eller wingets länkmapp; DRIFT.md under Riggen) när en film ska göras.

import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { parse as parseYaml } from 'yaml';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const kontrollera = args.includes('--kontrollera');
const vidBehov = args.includes('--vid-behov');
const valda = args.filter((a) => !a.startsWith('--'));

// Receptet: ändras något här görs alla filmer om. Måtten är filmens (960 × 540) gånger 4/3.
const BREDD = 1280, HOJD = 720, BILDER = 25, CRF = 30;
const MARKE = '© Niclas Fohlin · niclasfohlin.se';
// Filmen i 97 procent: bilden visar 991 × 557,4 av filmens egna enheter, 15,5 fria på var sida och 17,4 nederst.
const VY = { x: -15.5, y: 0, w: 991, h: 557.4 };
// Filmens vy och bakgrund, som riggen ritar dem (FRAN-SAJTEN.md): remsan under filmen får samma färg.
const FILMVY = '0 0 960 540', BAKGRUND = '#f5f3ee';
// Ett läge räknas som stilla när det står i minst 0,8 sekunder.
const STILLA_MS = 800;
const RECEPT = `mp4 ${BREDD}x${HOJD} ${BILDER} bilder/s libx264 crf ${CRF} veryslow animation yuv420p; vy ${VY.x} ${VY.y} ${VY.w} ${VY.h}; märke "${MARKE}" 10,5; omslag innehållsrikaste stilla rutan som inte är den nollställda scenen, palett 128; v2`;

const mapp = join(rot, 'public', 'stodundervisning');
const manifestFil = join(mapp, 'film-mp4.json');
const katalog = join(rot, 'src', 'content', 'stodundervisning');
// Varje metods filmer: huvudfilmen <id>-film och extrafilmerna <id>-film2 och <id>-film3 (src/lib/film.ts).
const filmer = readdirSync(katalog)
  .filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))
  .map((f) => ({ id: f.replace(/\.yaml$/, ''), data: parseYaml(readFileSync(join(katalog, f), 'utf8')) }))
  .flatMap((m) => [
    ...(m.data.film ? [{ bas: `${m.id}-film`, film: m.data.film }] : []),
    ...(m.data.filmer ?? []).map((f) => ({ bas: `${m.id}-film${f.nr}`, film: f })),
  ].map((x) => ({ ...x, id: m.id, metod: m.data.titel, namn: x.film.titel ?? x.film.rubrik, utkast: Boolean(m.data.utkast) })));
const svgFor = (f) => join(mapp, `${f.bas}.svg`);
const mp4For = (bas) => join(mapp, `${bas}.mp4`);
const omslagFor = (bas) => join(mapp, `${bas}-omslag.png`);
const titelFor = (f) => `${f.metod}: ${f.namn}`;

const hashAv = (delar) => { const h = createHash('sha256'); for (const d of delar) h.update(d); return h.digest('hex').slice(0, 16); };
// Svg-filen hashas med LF oavsett radslut: arbetskopian på Windows kan ha CRLF, Netlifys utcheckning LF.
const kallHash = (f) => hashAv([RECEPT, titelFor(f), readFileSync(svgFor(f), 'utf8').replace(/\r\n/g, '\n')]);
const filHash = (p) => hashAv([readFileSync(p)]);
const lasManifest = () => { try { return JSON.parse(readFileSync(manifestFil, 'utf8')); } catch { return {}; } };
const skrivManifest = (m) => writeFileSync(manifestFil, `${JSON.stringify(Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b))), null, 2)}\n`);

/** Varför filmens mp4 inte duger, eller undefined när den är aktuell. */
function felFor(f, manifest) {
  const post = manifest[f.bas];
  if (!existsSync(svgFor(f))) return 'svg-filen saknas';
  if (!existsSync(mp4For(f.bas))) return 'mp4 saknas';
  if (!existsSync(omslagFor(f.bas))) return 'omslagsbilden saknas';
  if (!post) return 'saknas i manifestet';
  if (post.kalla !== kallHash(f)) return 'mp4-filen är gjord av en äldre svg-fil, en äldre titel eller ett äldre recept';
  if (post.mp4 !== filHash(mp4For(f.bas))) return 'mp4-filen stämmer inte med manifestet';
  if (post.omslag !== filHash(omslagFor(f.bas))) return 'omslagsbilden stämmer inte med manifestet';
  return undefined;
}
// Filer som inte hör till någon film: en film som har tagits bort eller bytt nummer.
const kanda = new Set(filmer.flatMap((f) => [`${f.bas}.mp4`, `${f.bas}-omslag.png`]));
const overblivna = () => readdirSync(mapp).filter((n) => (/-film\d?\.mp4$/.test(n) || /-film\d?-omslag\.png$/.test(n)) && !kanda.has(n));

if (kontrollera) {
  const manifest = lasManifest();
  // Ett utkast byggs inte i produktion, så dess film krävs inte; finns filerna prövas de ändå inte här.
  const kravda = filmer.filter((f) => !f.utkast);
  const fel = kravda.map((f) => [f, felFor(f, manifest)]).filter(([, e]) => e).map(([f, e]) => `${f.bas}: ${e}`);
  for (const n of overblivna()) fel.push(`${n}: filen hör inte till någon film`);
  for (const bas of Object.keys(manifest)) if (!filmer.some((f) => f.bas === bas)) fel.push(`${bas}: står i manifestet men är ingen film`);
  if (fel.length) {
    console.error(`Filmerna som mp4:\n${fel.map((r) => `  ${r}`).join('\n')}\nKör npm run validera (eller node scripts/filmmp4.mjs --vid-behov) och committa filerna i public/stodundervisning/: mp4-filerna, omslagsbilderna och film-mp4.json.`);
    process.exit(1);
  }
  console.log(`Filmerna som mp4: ${kravda.length} filmer har en aktuell mp4 och omslagsbild.`);
  process.exit(0);
}

const hitta = (namn, miljo, platser) => {
  if (process.env[miljo] && existsSync(process.env[miljo])) return process.env[miljo];
  const funnen = platser.find((p) => p && existsSync(p));
  if (funnen) return funnen;
  try { return execFileSync(process.platform === 'win32' ? 'where' : 'which', [namn], { encoding: 'utf8' }).split(/\r?\n/)[0].trim() || undefined; } catch { return undefined; }
};
const winget = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links') : '';
const verktyg = () => {
  const chrome = hitta('chrome', 'CHROME', ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome']);
  const ffmpeg = hitta('ffmpeg', 'FFMPEG', [winget && join(winget, 'ffmpeg.exe')]);
  const ffprobe = hitta('ffprobe', 'FFPROBE', [winget && join(winget, 'ffprobe.exe'), ffmpeg && join(dirname(ffmpeg), process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe')]);
  const saknas = [!chrome && 'Chrome (sätt CHROME=<sökväg>)', !ffmpeg && 'ffmpeg (winget install Gyan.FFmpeg.Essentials, eller sätt FFMPEG=<sökväg>)', !ffprobe && 'ffprobe (följer med ffmpeg)'].filter(Boolean);
  if (saknas.length) { console.error(`Filmerna som mp4 kan inte göras: ${saknas.join(', ')} saknas. Se DRIFT.md under Riggen.`); process.exit(1); }
  return { chrome, ffmpeg, ffprobe };
};
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));

/** Prövar att svg-filen har formen som skriptet räknar med (riggens avtal) och svarar filmens längd i sekunder. */
function filmensLangd(f) {
  const svg = readFileSync(svgFor(f), 'utf8');
  const langder = [...new Set([...svg.matchAll(/animation:\s*[\w-]+\s+([\d.]+)s/g)].map((m) => Number(m[1])))];
  if (!langder.length) throw new Error(`${f.bas}: hittar ingen animation i svg-filen (formen är animation:<namn> <sekunder>s … infinite)`);
  if (langder.length > 1) throw new Error(`${f.bas}: animationerna har olika längd (${langder.join(', ')} s); alla ska ha filmens längd, annars hackar filmen där den börjar om`);
  const vy = svg.match(/<svg[^>]*viewBox="([^"]+)"/)?.[1];
  if (vy !== FILMVY) throw new Error(`${f.bas}: vyn är "${vy}", väntat "${FILMVY}"`);
  const bakgrund = svg.match(/<rect[^>]*fill="([^"]+)"/)?.[1];
  if (bakgrund?.toLowerCase() !== BAKGRUND) throw new Error(`${f.bas}: filmens första rektangel har färgen ${bakgrund}, väntat bakgrunden ${BAKGRUND}; remsan under filmen får annars en annan färg än filmen`);
  if (Math.abs(langder[0] - f.film.sekunder) > 0.5) throw new Error(`${f.bas}: svg-filens film är ${langder[0]} s men metodens fält säger ${f.film.sekunder} s`);
  return langder[0];
}

/** Ritar filmens rutor i Chrome: lika rutor i följd blir en ruta som visas längre. Svarar rutorna med sin tid. */
async function ritaRutor(f, chrome, tmp, port, sekunder) {
  // En egen port per arbetare och en egen profil per film, så att två Chrome aldrig delar webbläsare.
  const profil = join(tmpdir(), `filmmp4-chrome-${f.bas}`);
  rmSync(profil, { recursive: true, force: true });
  const proc = spawn(chrome, [`--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--user-data-dir=${profil}`, 'about:blank'], { stdio: 'ignore' });
  const slutad = new Promise((r) => proc.once('exit', r));
  const rutor = [];
  try {
    let mal;
    for (let i = 0; i < 60 && !mal; i++) {
      await vanta(250);
      try { mal = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch { /* Chrome har inte startat än */ }
    }
    if (!mal) throw new Error('Chrome svarade inte på DevTools-porten.');
    const ws = new WebSocket(mal.webSocketDebuggerUrl);
    await new Promise((r, x) => { ws.onopen = r; ws.onerror = x; });
    let nr = 0, laddad = false;
    const vantande = new Map();
    ws.onmessage = (m) => {
      const data = JSON.parse(m.data);
      if (data.id && vantande.has(data.id)) { vantande.get(data.id)(data); vantande.delete(data.id); } else if (data.method === 'Page.loadEventFired') laddad = true;
    };
    const skicka = (method, params = {}) => new Promise((r) => { const id = ++nr; vantande.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
    const kor = async (expression) => {
      const svar = (await skicka('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result;
      if (svar.exceptionDetails) throw new Error(`${f.bas}: ${svar.exceptionDetails.exception?.description ?? svar.exceptionDetails.text}`);
      return svar.result.value;
    };
    await skicka('Page.enable');
    await skicka('Emulation.setDeviceMetricsOverride', { width: 960, height: 540, deviceScaleFactor: BREDD / 960, mobile: false });
    // Filmen ska röra sig också på en dator där Windows animeringar är avstängda: filmens egen regel för minskad
    // rörelse stänger annars av den.
    await skicka('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await skicka('Page.navigate', { url: pathToFileURL(svgFor(f)).href });
    for (let i = 0; i < 100 && !laddad; i++) await vanta(100);
    await vanta(400);
    // Vyn vidgas så att filmen står i 97 procent med en fri remsa nederst, och upphovet skrivs i remsans högra hörn.
    await kor(`(() => {
      const s = document.documentElement;
      s.setAttribute('viewBox', '${VY.x} ${VY.y} ${VY.w} ${VY.h}');
      s.style.background = '${BAKGRUND}';
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', '960'); t.setAttribute('y', '552'); t.setAttribute('text-anchor', 'end');
      t.setAttribute('font-family', 'IBM Plex Sans, Segoe UI, Arial, sans-serif'); t.setAttribute('font-size', '10.5'); t.setAttribute('fill', '#4b5866');
      t.textContent = ${JSON.stringify(MARKE)};
      s.appendChild(t);
      return 1;
    })()`);
    const antal = await kor('document.getAnimations().length');
    if (!antal) throw new Error(`${f.bas}: filmen har inga animationer i Chrome`);
    const steg = 1000 / BILDER;
    let forra = '';
    for (let t = 0; t < sekunder * 1000 - 1; t += steg) {
      await kor(`(async () => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ${t}; } await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return 1; })()`);
      const png = Buffer.from((await skicka('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 960, height: 540, scale: 1 } })).result.data, 'base64');
      const summa = createHash('sha1').update(png).digest('hex');
      if (summa === forra) rutor.at(-1).ms += steg;
      else { const fil = join(tmp, `r${String(rutor.length).padStart(4, '0')}.png`); writeFileSync(fil, png); rutor.push({ fil, ms: steg, t }); forra = summa; }
    }
    ws.close();
  } finally {
    proc.kill();
    // Chrome släpper profilen först när processen är slut; går mappen inte att ta bort ligger den kvar i temp.
    await Promise.race([slutad, vanta(5000)]);
    for (let i = 0; i < 5; i++) { try { rmSync(profil, { recursive: true, force: true }); break; } catch { await vanta(400); } }
  }
  if (rutor.length < 10) throw new Error(`${f.bas}: bara ${rutor.length} olika rutor; filmen rör sig inte`);
  return rutor;
}

/**
 * Omslaget: den innehållsrikaste rutan som står still, bortsett från den allra första. Rutans storlek som png är måttet
 * på innehållet: mer ritat ger en större fil. Den ruta som står still längst duger inte som regel, eftersom den kan vara
 * filmens tomma början (De fyra räknesätten, film 2). Ett stilla läge som ovanför textraden är likt filmens första ruta
 * är filmens nollställda scen, där allt är bortplockat medan slutsatsens text står kvar, och räknas inte: en hög med
 * kuber ger en större png än den färdiga rektangeln (De fyra räknesätten, film 3; granskningen 2026-10-07).
 */
async function valjOmslag(rutor) {
  // Bilden ovanför filmens textrad, i var fjärde bildpunkt: det räcker för att skilja två scener åt.
  const ovanTexten = async (fil) => sharp(fil).extract({ left: 0, top: 0, width: BREDD, height: Math.round(HOJD * 0.86) }).resize(BREDD / 2, null, { kernel: 'nearest' }).removeAlpha().raw().toBuffer();
  const forsta = await ovanTexten(rutor[0].fil);
  const olikhet = async (fil) => {
    const b = await ovanTexten(fil);
    let olika = 0;
    for (let i = 0; i < b.length; i += 3) if (Math.abs(b[i] - forsta[i]) + Math.abs(b[i + 1] - forsta[i + 1]) + Math.abs(b[i + 2] - forsta[i + 2]) > 48) olika++;
    return olika / (b.length / 3);
  };
  const storst = (lista) => lista.reduce((a, r) => (statSync(r.fil).size > statSync(a.fil).size ? r : a));
  const stilla = rutor.slice(1).filter((r) => r.ms >= STILLA_MS);
  const egna = [];
  for (const r of stilla) if ((await olikhet(r.fil)) >= 0.005) egna.push(r);
  return storst(egna.length ? egna : stilla.length ? stilla : rutor.slice(1));
}

/** Gör filmens mp4 och omslagsbild och svarar manifestets post. */
async function gor(f, v, port) {
  const sekunder = filmensLangd(f);
  const tmp = join(tmpdir(), `filmmp4-${f.bas}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  try {
    const rutor = await ritaRutor(f, v.chrome, tmp, port, sekunder);
    // ffmpegs lista: varje ruta med sin tid, den sista en gång till (så vill formatet ha det).
    const sokvag = (p) => p.replaceAll('\\', '/');
    writeFileSync(join(tmp, 'lista.txt'), `${rutor.map((r) => `file '${sokvag(r.fil)}'\nduration ${(r.ms / 1000).toFixed(4)}`).join('\n')}\nfile '${sokvag(rutor.at(-1).fil)}'\n`);
    const ut = join(tmp, 'film.mp4');
    execFileSync(v.ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'lista.txt'),
      '-vf', `fps=${BILDER},format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'animation', '-crf', String(CRF), '-movflags', '+faststart', '-an',
      '-metadata', `title=${titelFor(f)}`, '-metadata', 'artist=Niclas Fohlin', '-metadata', 'copyright=© Niclas Fohlin, niclasfohlin.se',
      '-metadata', `comment=https://niclasfohlin.se/stodundervisning/${f.id} · Bilderna i filmerna: Fluent Emoji, © Microsoft Corporation, MIT-licens.`, ut]);
    // Kontrollen: rätt mått och rätt längd, annars kastas filen.
    const strom = JSON.parse(execFileSync(v.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,codec_name:format=duration', '-of', 'json', ut], { encoding: 'utf8' }));
    const s = strom.streams[0], langd = Number(strom.format.duration);
    if (s.codec_name !== 'h264' || s.width !== BREDD || s.height !== HOJD) throw new Error(`${f.bas}: mp4-filen blev ${s.codec_name} ${s.width} × ${s.height}`);
    if (Math.abs(langd - sekunder) > 0.3) throw new Error(`${f.bas}: mp4-filen blev ${langd} s, filmen är ${sekunder} s`);
    const vald = await valjOmslag(rutor);
    const omslag = await sharp(vald.fil).resize(BREDD, HOJD).png({ palette: true, colours: 128, effort: 10 }).toBuffer();
    copyFileSync(ut, mp4For(f.bas));
    writeFileSync(omslagFor(f.bas), omslag);
    console.log(`  ${f.bas}: ${sekunder} s, ${rutor.length} rutor, mp4 ${Math.round(statSync(mp4For(f.bas)).size / 1024)} kB, omslaget ${(vald.t / 1000).toFixed(1)} s in, ${Math.round(omslag.length / 1024)} kB`);
    return { kalla: kallHash(f), mp4: filHash(mp4For(f.bas)), omslag: filHash(omslagFor(f.bas)), sekunder, omslagVid: Number((vald.t / 1000).toFixed(2)) };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const manifest = lasManifest();
for (const v of valda) if (!filmer.some((f) => f.bas === v)) { console.error(`${v} är ingen film. Filmerna heter <id>-film, <id>-film2 och <id>-film3.`); process.exit(1); }
const urval = valda.length ? filmer.filter((f) => valda.includes(f.bas)) : vidBehov ? filmer.filter((f) => felFor(f, manifest)) : filmer;

// Överblivet tas bort: filer och manifestposter för filmer som inte finns längre.
if (!valda.length) {
  for (const n of overblivna()) { unlinkSync(join(mapp, n)); console.log(`  ${n}: borttagen, filen hör inte till någon film`); }
  let andrat = false;
  for (const bas of Object.keys(manifest)) if (!filmer.some((f) => f.bas === bas)) { delete manifest[bas]; andrat = true; }
  if (andrat) skrivManifest(manifest);
}
if (!urval.length) { console.log(`Filmerna som mp4: ${filmer.length} filmer har en aktuell mp4 och omslagsbild.`); process.exit(0); }

const v = verktyg();
console.log(`Filmerna som mp4: gör ${urval.length} av ${filmer.length} (${BREDD} × ${HOJD}, ${BILDER} bilder per sekund, crf ${CRF}).`);
// Tre filmer i taget: varje arbetare har sin egen port, och rutorna är det som tar tid.
const ko = [...urval];
const fel = [];
const port0 = 9300 + Math.floor(Math.random() * 500);
await Promise.all(Array.from({ length: Math.min(3, ko.length) }, async (_, i) => {
  for (let f = ko.shift(); f; f = ko.shift()) {
    try { manifest[f.bas] = await gor(f, v, port0 + i); skrivManifest(manifest); } catch (e) { fel.push(`${f.bas}: ${e.message}`); }
  }
}));
if (fel.length) { console.error(`Filmerna som mp4, fel:\n${fel.map((r) => `  ${r}`).join('\n')}`); process.exitCode = 1; } else console.log(`Filmerna som mp4: ${urval.length} gjorda. Committa mp4-filerna, omslagsbilderna och film-mp4.json i public/stodundervisning/.`);
