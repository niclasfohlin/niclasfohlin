#!/usr/bin/env node
// Länkarna till metodens saker på stödmetodernas sidor (K-767; STIL.md under Hänvisningar, raden En sak i metoden) och
// länkarna ut från sajten, [text](https://…) (K-768), prövade i bygget (dist): varje länk till en sak leder till en sida
// eller fil som finns och till ett ankare som står på den sidan, en sak länkas högst en gång under varje rubrik (h2 och h3,
// lankaBocker i src/lib/boklankar.ts), och ingen länk ut står kvar som text med hakparentes och adress. Provet prövas åt
// andra hållet först, med en sida som har en död länk, en sak två gånger under samma rubrik och en länk som text.
//
//   node scripts/saklankprov.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(rot, 'dist');
const idn = new Map();
const ankarePa = (vag) => {
  const f = join(dist, vag, 'index.html');
  if (!existsSync(f)) return null;
  if (!idn.has(f)) idn.set(f, new Set([...readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return idn.get(f);
};

/** Felen på en sida: html är sidan, vag dess adress, och finns säger om en adress på sajten finns, med ankarets id:n. */
export function sidansFel(vag, html, finns) {
  const fel = [];
  const kropp = html.slice(html.indexOf('<article'), html.lastIndexOf('</article>') + 1);
  // Rubrikerna delar sidan i avsnitt, och en sak länkas en gång i varje.
  const delar = kropp.split(/<h[23][\s>]/);
  delar.forEach((del, i) => {
    const sedda = new Map();
    for (const [, href, text] of del.matchAll(/<a class="m-sak" href="([^"]+)">([^<]*)<\/a>/g)) {
      const [adress, ankare] = href.split('#');
      const vagen = adress.replace(/^\//, '').replace(/\?.*$/, '');
      const mal = /\.[a-z0-9]+$/i.test(vagen) ? (existsSync(join(dist, vagen)) ? new Set() : null) : finns(vagen);
      if (!mal) fel.push(`${vag}: "${text}" leder till ${adress}, som inte finns`);
      else if (ankare && !mal.has(ankare)) fel.push(`${vag}: "${text}" leder till #${ankare}, som inte står på ${adress}`);
      if (sedda.has(href)) fel.push(`${vag}: "${text}" är en länk två gånger under samma rubrik (avsnitt ${i}), och en sak länkas en gång under varje rubrik`);
      sedda.set(href, true);
    }
  });
  const text = kropp.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  for (const m of text.matchAll(/\[[^\]\n]{1,80}\]\(https?:\/\/[^)\s]+\)/g)) fel.push(`${vag}: länken ${m[0]} står som text och är ingen länk (webbdelar i standarden)`);
  return fel;
}

// Åt andra hållet: en död sida, ett dött ankare, samma sak två gånger under en rubrik och en länk som text stoppas, och samma
// sak under två rubriker går igenom.
{
  const finns = (v) => (v === 'stodundervisning/prov' ? new Set(['ramar']) : null);
  const sida = (inne) => `<article>${inne}</article>`;
  const fall = [
    [sida('<h2>A</h2><p><a class="m-sak" href="/stodundervisning/prov#ramar">x</a></p><h2>B</h2><p><a class="m-sak" href="/stodundervisning/prov#ramar">x</a></p>'), 0],
    [sida('<h2>A</h2><p><a class="m-sak" href="/stodundervisning/borta#ramar">x</a></p>'), 1],
    [sida('<h2>A</h2><p><a class="m-sak" href="/stodundervisning/prov#mallar">x</a></p>'), 1],
    [sida('<h2>A</h2><p><a class="m-sak" href="/stodundervisning/prov#ramar">x</a> och <a class="m-sak" href="/stodundervisning/prov#ramar">x</a></p>'), 1],
    [sida('<p>Köp [Magneter](https://example.com/a) i butiken.</p>'), 1],
  ];
  for (const [html, n] of fall) {
    const f = sidansFel('prov', html, finns);
    if (f.length !== n) { console.error(`saklankprov: provet gav ${f.length} fel i stället för ${n}:\n  ${f.join('\n  ')}`); process.exit(1); }
  }
}

const mapp = join(dist, 'stodundervisning');
if (!existsSync(mapp)) { console.error('saklankprov: dist saknas. Kör npx astro build först.'); process.exit(1); }
const fel = [];
let lankar = 0;
let sidor = 0;
for (const id of readdirSync(mapp)) {
  const f = join(mapp, id, 'index.html');
  if (!existsSync(f) || !existsSync(join(rot, 'src', 'content', 'stodundervisning', `${id}.yaml`))) continue;
  const html = readFileSync(f, 'utf8');
  sidor++;
  lankar += (html.match(/<a class="m-sak" /g) ?? []).length;
  fel.push(...sidansFel(`/stodundervisning/${id}`, html, ankarePa));
}
if (fel.length) { console.error(`saklankprov: ${fel.length} fel\n  ${fel.slice(0, Number(process.env.SAKLANK_VISA ?? 40)).join('\n  ')}`); process.exit(1); }
console.log(`saklankprov: ${lankar} länkar till metodens saker på ${sidor} stödmetoders sidor leder dit de ska, en gång under varje rubrik, och inga länkar ut står som text.`);
