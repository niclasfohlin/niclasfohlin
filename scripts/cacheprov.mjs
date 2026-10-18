#!/usr/bin/env node
// Cacheprovet (Verktyg och stödmaterial, arbetsordern steg 0; DRIFT.md under Krediter): varje fil i dist som inte är en
// sida ska träffa en cacheregel i netlify.toml. Utan regel skickar Netlify max-age=0, och då hämtar webbläsare och
// Facebook filen på nytt varje gång: så hämtades delningsbilden 6 131 gånger på ett dygn 2026-09-27. En ny mapp eller
// filtyp utan regel stoppar därför valideringen här, före uppladdningen.
//
//   node scripts/cacheprov.mjs            prövar dist (körs i npm run validera efter bygget)
//
// Netlifys mönster: * matchar vad som helst, också snedstreck (prövat mot sajten 2026-10-18: /stodundervisning/*.jpg
// gav ett dygns cache för en bild i en undermapp). Sidorna (html) har Netlifys förval med must-revalidate med avsikt, så
// att en ändring syns direkt; de och filerna i UTAN_REGEL prövas inte.
//
// Sidorna som tar fram kort och poster ur en databas (Ta fram ett skrivkort, en aktivitet, en brainbreak och ett
// matteproblem) har sin data i en egen fil bredvid sig (src/lib/kortdata.ts), och provet stoppar en sådan sida som är
// större än HOGST_SIDA: då står datan i sidan igen. Facebook hämtar sidan varje gång länken delas eller förhandsvisas,
// och okomprimerad (K-410); skrivkortssidan var 287 kB och drog 251 MB på ett dygn 2026-10-16 (DRIFT.md under
// Krediter). Niclas 2026-10-18: "Se till att du bygger så databasen kommer fram billigt utan en massa krediter i onödan
// redan från början."
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(rot, 'dist');
if (!existsSync(dist)) { console.error('cacheprov: dist saknas; bygg först.'); process.exit(1); }

// Filer som ska hämtas färska varje gång, med skälet.
const UTAN_REGEL = new Map([
  ['/rss.xml', 'flödet ska visa nya texter direkt'],
  ['/artiklar/rss.xml', 'flödet ska visa nya texter direkt'],
  ['/stodundervisning/rss.xml', 'flödet ska visa nya metoder direkt'],
  // Laddas utan version när läsaren närmar sig kommentarerna (Kommentarer.astro). Med max-age=0 frågar webbläsaren om
  // filen har ändrats och får 304 utan innehåll; en längre cache kräver version på adressen (K-421).
  ['/kommentarer/klient.js', 'laddas utan version; 304 räcker tills adressen har version'],
  ['/nytt.json', 'läses av utskicket i bygget, inte av läsarna'],
  ['/robots.txt', 'liten och sällan hämtad'],
  ['/delning/kort.json', 'förteckningen som scripts/delningskort.mjs läser i bygget'],
]);
const SIDKARTA = /^\/sitemap[-\w]*\.xml$/;
const HOGST_SIDA = 64 * 1024;
// En Ta fram-sida är också en lista över databasens poster, en rad per post (TaFramRad.astro), som läsaren ser utan
// JavaScript, och den växer med databasen (Niclas 2026-10-18: verktygen ska vara skalbara). Provet räknar därför sidan
// utan raderna mot HOGST_SIDA och varje rad för sig mot HOGST_RAD: en rad med data i sig blir större än så. Raderna var
// omkring 0,8 kB med 60 matteproblem och 1,1 till 1,2 kB med faktatexterna, som har en länk till (Modellen) och en längre
// rad ur lärarens sida; varje länk bär postens titel i sitt namn, så att en skärmläsare vet vilken post den gäller.
const HOGST_RAD = 1280;
const RAD = /<li class="tf-post[\s\S]*?<\/li>/g;

const toml = readFileSync(join(rot, 'netlify.toml'), 'utf8').replace(/\r\n/g, '\n');
// Ett block i taget, fram till nästa tabell: blocket för "/*" har säkerhetsrubrikerna men ingen Cache-Control, och får
// inte låna nästa blocks regel.
const regler = toml.split(/^\[\[headers\]\]\s*$/m).slice(1).map((b) => b.split(/^\[\[(?!headers\.)/m)[0])
  .map((b) => ({ monster: b.match(/^\s*for\s*=\s*"([^"]+)"/m)?.[1], varde: b.match(/^\s*Cache-Control\s*=\s*"([^"]+)"/m)?.[1] }))
  .filter((r) => r.monster && r.varde)
  // En regel som inte cachar (max-age=0, no-store) räknas inte: filen hämtas då på nytt varje gång, som utan regel.
  .filter((r) => !/no-store/.test(r.varde) && (Number(r.varde.match(/max-age=(\d+)/)?.[1] ?? 0) > 0 || /immutable/.test(r.varde)))
  .map((r) => ({ ...r, re: new RegExp(`^${r.monster.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`) }));
if (!regler.length) { console.error('cacheprov: hittar inga cacheregler i netlify.toml.'); process.exit(1); }

const filer = [];
const ga = (mapp) => { for (const f of readdirSync(mapp, { withFileTypes: true })) { const p = join(mapp, f.name); if (f.isDirectory()) ga(p); else filer.push(`/${relative(dist, p).replace(/\\/g, '/')}`); } };
ga(dist);

const utan = [];
let provade = 0;
for (const vag of filer) {
  if (vag.endsWith('.html') || UTAN_REGEL.has(vag) || SIDKARTA.test(vag)) continue;
  provade++;
  if (!regler.some((r) => r.re.test(vag))) utan.push(vag);
}
if (utan.length) {
  // Grupperade på mapp och filtyp, så att det syns vilken regel som saknas.
  const grupper = new Map();
  for (const v of utan) { const k = `${v.slice(0, v.lastIndexOf('/') + 1)}*${v.slice(v.lastIndexOf('.'))}`; grupper.set(k, (grupper.get(k) ?? 0) + 1); }
  console.error(`cacheprov: ${utan.length} av ${provade} filer i dist träffar ingen cacheregel i netlify.toml och skulle få max-age=0:\n  ${[...grupper].map(([k, n]) => `${k} (${n})`).join('\n  ')}\nLägg en [[headers]]-regel för mappen eller filtypen (DRIFT.md under Krediter), eller skriv filen i UTAN_REGEL i scripts/cacheprov.mjs med skälet.`);
  process.exit(1);
}
// Sidorna med data i en egen fil: data-kortdata på sidan.
// Sidorna med data i en egen fil: en sida med en datafil bredvid sig (<sida>/index.html och <sida>.json, src/lib/kortdata.ts)
// eller med attributet data-kortdata, så att provet hittar sidan också om attributet försvinner.
const allaFiler = new Set(filer);
const databassidor = filer.filter((v) => v.endsWith('.html')).map((v) => ({ v, html: readFileSync(join(dist, v)) }))
  .filter((x) => x.html.includes('data-kortdata=') || allaFiler.has(`${x.v.replace(/\/index\.html$/, '')}.json`));
for (const x of databassidor) {
  const rader = [...x.html.toString('utf8').matchAll(RAD)].map((m) => Buffer.byteLength(m[0]));
  x.rader = rader.length;
  x.utan = x.html.length - rader.reduce((a, b) => a + b, 0);
  x.storstaRad = Math.max(0, ...rader);
}
const tunga = databassidor.filter((x) => x.utan > HOGST_SIDA || x.storstaRad > HOGST_RAD);
if (tunga.length) {
  console.error(`cacheprov: ${tunga.length} sidor som hämtar sin data ur en egen fil är för stora (högst ${HOGST_SIDA / 1024} kB utan postraderna och ${HOGST_RAD / 1024} kB per rad):\n  ${tunga.map((x) => `${x.v} (${Math.round(x.utan / 1024)} kB utan raderna${x.rader ? `, största raden ${x.storstaRad} byte` : ''})`).join('\n  ')}\nDatan ska stå i sidans egen fil (src/lib/kortdata.ts), inte i sidan, som Facebook hämtar okomprimerad varje gång länken delas.`);
  process.exit(1);
}
const vikt = databassidor.map((x) => `${x.v.replace(/^\/stodundervisning\/|\/index\.html$|\.html$/g, '')} ${Math.round(x.utan / 1024)}${x.rader ? ` + ${x.rader} rader` : ''}`).join(', ');
console.log(`cacheprov: alla ${provade} filer i dist som inte är sidor träffar en cacheregel i netlify.toml (${regler.length} regler), och sidorna med data i en egen fil är högst ${HOGST_SIDA / 1024} kB utan postraderna, och raderna högst ${HOGST_RAD / 1024} kB var (${vikt}).`);
