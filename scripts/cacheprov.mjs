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

const toml = readFileSync(join(rot, 'netlify.toml'), 'utf8').replace(/\r\n/g, '\n');
// Ett block i taget, fram till nästa tabell: blocket för "/*" har säkerhetsrubrikerna men ingen Cache-Control, och får
// inte låna nästa blocks regel.
const regler = toml.split(/^\[\[headers\]\]\s*$/m).slice(1).map((b) => b.split(/^\[\[(?!headers\.)/m)[0])
  .map((b) => ({ monster: b.match(/^\s*for\s*=\s*"([^"]+)"/m)?.[1], varde: b.match(/^\s*Cache-Control\s*=\s*"([^"]+)"/m)?.[1] }))
  .filter((r) => r.monster && r.varde)
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
console.log(`cacheprov: alla ${provade} filer i dist som inte är sidor träffar en cacheregel i netlify.toml (${regler.length} regler).`);
