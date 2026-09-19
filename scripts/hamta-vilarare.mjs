// Hämtar Vi Lärare-sidor, läser byline, datum, rubrik, etikett, tidningens ingress och brödtext
// ur sidans egen HTML, och skriver ett blad per text i underlag/texter-format. Mäter ur källan,
// inte ur en avskrift.
//   node scripts/hamta-vilarare.mjs <urlfil> <utkatalog> [--bara-tabell]
// urlfilen har en adress per rad, valfritt följd av tab och en egen slug. Rader som börjar med #
// hoppas över. Bladet skrivs bara när bylinen är Niclas Fohlin, i bylinefältet eller som signatur
// i texten. Efter hämtningen: lägg raden i underlag/texter/register.json och skapa posten med
// /ny-artikel <slug>. Tidningens utdragscitat, faktarutor och länklistor tas bort ur brödtexten.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [urlfil, ut, flagga] = process.argv.slice(2);
if (!urlfil || !ut) { console.error('node hamta.mjs <urlfil> <utkatalog>'); process.exit(2); }
mkdirSync(ut, { recursive: true });

const NAMN = { auml: 'ä', ouml: 'ö', aring: 'å', Auml: 'Ä', Ouml: 'Ö', Aring: 'Å', eacute: 'é', Eacute: 'É', uuml: 'ü', nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', bdquo: '„', hellip: '…', ndash: '–', mdash: '—', shy: '', laquo: '«', raquo: '»', deg: '°', middot: '·' };
const avkoda = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&([a-zA-Z]+);/g, (m, n) => (n in NAMN ? NAMN[n] : m))
  .replace(/­/g, '');
const text = (html) => avkoda(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();

function tolka(h, url) {
  const r = { url };
  const h1 = h.match(/<h1 class="article-heading[^"]*hidden--mobile"[^>]*>([\s\S]*?)<\/h1>/) || h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (h1) {
    const spann = h1[1].match(/<span class="editorial-titleAuthor">([\s\S]*?)<\/span>/);
    r.forfattarprefix = spann ? text(spann[1]) : '';
    r.titel = text(h1[1].replace(/<span class="editorial-titleAuthor">[\s\S]*?<\/span>/, ''));
    r.publicerad_rubrik = (r.forfattarprefix ? r.forfattarprefix + ' ' : '') + r.titel;
  }
  const bylines = [...h.matchAll(/class="article-bylineAuthor[^"]*"[^>]*>([\s\S]*?)<\/address>/g)].map((m) => text(m[1]));
  r.byline = [...new Set(bylines)].join(' | ');
  const d = h.match(/class="article-date"[^>]*\sdate="(\d{4}-\d{2}-\d{2})"/);
  r.datum = d ? d[1] : '';
  const pre = h.match(/<p class="article-preamble[^"]*">([\s\S]*?)<\/p>/);
  if (pre) {
    const tag = pre[1].match(/<span class="article-tag[^"]*">([\s\S]*?)<\/span>/);
    r.etikett = tag ? text(tag[1]) : '';
    r.tidningens_ingress = text(pre[1].replace(/<span class="article-tag[^"]*">[\s\S]*?<\/span>/, ''));
  }
  const start = h.indexOf('<div class="editorial">');
  if (start >= 0) {
    let slut = h.length;
    for (const mark of ['</article>', '<footer class="article-footer"', 'class="article-related', 'class="editorial-related']) {
      const i = h.indexOf(mark, start);
      if (i > 0 && i < slut) slut = i;
    }
    // debattsidornas faktaruta (<aside>: "Vill du skriva en debattartikel…") är redaktionens
    const del = h.slice(start, slut).replace(/<aside\b[\s\S]*?<\/aside>/g, '');
    // Ett blockquote är antingen tidningens utdragscitat, en mening ur texten upprepad i stor
    // stil, eller ett citat som hör till texten (Körlings ord i hyllningen). Skillnaden mäts:
    // delar citatet mer än hälften av sina ordföljder med brödtexten är det ett utdrag och stryks.
    const block = [...del.matchAll(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>|<(p|h2|h3|h4|li)\b[^>]*>([\s\S]*?)<\/\2>/g)];
    const norm = (s) => s.toLowerCase().replace(/[^a-zåäöé0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    // utdragen kan också vara hämtade ur tidningens ingress, så den räknas med i jämförelsen
    const brod = norm(block.filter((b) => !b[1]).map((b) => text(b[3])).join(' ') + ' ' + (r.tidningens_ingress || ''));
    const brodGram = new Set(); for (let i = 0; i + 3 < brod.length; i++) brodGram.add(brod.slice(i, i + 4).join(' '));
    const arUtdrag = (t) => { const w = norm(t); if (w.length < 6) return false; let n = 0, tot = 0; for (let i = 0; i + 3 < w.length; i++) { tot++; if (brodGram.has(w.slice(i, i + 4).join(' '))) n++; } return tot > 0 && n / tot >= 0.5; };
    // ingressens citat i repris som vanligt stycke: nästan alla ordföljder finns i ingressen
    const ingGram = new Set(); { const w = norm(r.tidningens_ingress || ''); for (let i = 0; i + 3 < w.length; i++) ingGram.add(w.slice(i, i + 4).join(' ')); }
    const arIngressRepris = (t) => { const w = norm(t); if (w.length < 5 || !ingGram.size) return false; let n = 0, tot = 0; for (let i = 0; i + 3 < w.length; i++) { tot++; if (ingGram.has(w.slice(i, i + 4).join(' '))) n++; } return tot > 0 && n / tot >= 0.8; };
    const stycken = [];
    // ett stycke som bara är en länk, med eller utan fetstil inuti
    const bara_lank = (html) => { const inre = html.replace(/<(?!\/?a\b)[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim(); return /^<a\b[^>]*>[\s\S]*<\/a>$/.test(inre) && !/<\/a>[^<]*\S[^<]*<a\b/.test(inre); };
    // <br> inuti ett stycke ger egna rader: så skrivs signaturer och redaktionens uppmaningar
    const rader = (html) => text(html).split('\n').map((s) => s.trim()).filter(Boolean);
    for (const b of block) {
      if (b[1] !== undefined) {
        const delar = [...b[1].matchAll(/<(p|cite|footer)\b[^>]*>([\s\S]*?)<\/\1>/g)].flatMap((m) => rader(m[2]));
        const citat = delar.length ? delar : rader(b[1]);
        if (!citat.length || arUtdrag(citat[0])) continue;
        for (const c of citat) stycken.push({ t: c, lank: false });
        continue;
      }
      const lank = bara_lank(b[3]);
      for (const t of rader(b[3])) {
        // "LÄS MER <länk>" överst och "LÄS ÄVEN" nederst är tidningens, inte textens
        if (/^(Läs (också|mer|även)|Relaterat)\b/i.test(t)) continue;
        // ett kort stycke som är ingressens citat i repris är också ett utdrag
        if (b[2] === 'p' && t.length < 300 && arIngressRepris(t)) continue;
        stycken.push({ t: (b[2] === 'h2' || b[2] === 'h3' || b[2] === 'h4') ? '## ' + t : (b[2] === 'li' ? '- ' + t : t), lank });
      }
    }
    // debattsidornas "Vill du skriva en debattartikel…" och "Mejla till oss" är redaktionens, inte textens
    const upp = stycken.findIndex((s) => /^(-\s*)?(Vill du skriva en debattartikel|Mejla till oss|Detta är en debattartikel|Det här är en debattartikel)/i.test(s.t));
    if (upp >= 0) stycken.splice(upp);
    // avslutande stycken och listpunkter som bara är en länk är också tidningens, inte textens
    while (stycken.length && stycken[stycken.length - 1].lank) stycken.pop();
    r.stycken = stycken.map((s) => s.t);
    // Debattartiklar saknar bylinefält och signeras i stället i texten. Signaturen är den sista
    // raden som börjar med Niclas Fohlin, eventuellt med medförfattare på raden bredvid.
    if (!r.byline) {
      const svans = r.stycken.slice(-4);
      const sign = svans.filter((s) => /^(Niclas Fohlin|Jennie Wilson)\b/.test(s) && s.length < 160);
      if (sign.length) r.byline = sign.map((s) => s.split(/[,.]| är | Speciall/)[0].trim()).join(', ') + ' (signatur i texten)';
    }
    // Debatt- och kommentarsidor lägger tidningens ingress som första stycke i kroppen, ibland
    // utöver preamble-fältet. Ett kort första stycke som talar om Niclas i tredje person är
    // tidningens, inte hans.
    if (r.stycken.length && /Niclas Fohlin/.test(r.stycken[0]) && !/^Jag\b/.test(r.stycken[0]) && r.stycken[0].length < 450) {
      const bort = r.stycken.shift();
      if (!r.tidningens_ingress) r.tidningens_ingress = bort;
    }
  } else r.stycken = [];
  r.ord = r.stycken.join(' ').split(/\s+/).filter(Boolean).length;
  return r;
}

const slugAv = (url) => {
  let s = url.replace(/\/+$/, '').split('/').pop().toLowerCase();
  s = s.replace(/^(niclas-fohlin-|fohlin-|speciallararen-|slutreplik-|replik-|lararnas-)/, '').replace(/-\d{5,}$/, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return s;
};

const y = (s) => JSON.stringify(String(s));
// En rad per text: url, valfritt följt av tab och en egen slug.
const urls = readFileSync(urlfil, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.split(/\t+/));
const rader = [];
const idag = new Date().toISOString().slice(0, 10);
for (const [url, egenSlug] of urls) {
  let h = '';
  let status = 0;
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', accept: 'text/html' }, redirect: 'follow' });
    status = res.status;
    h = await res.text();
  } catch (e) { rader.push({ url, fel: String(e.message) }); continue; }
  if (status !== 200) { rader.push({ url, fel: 'http ' + status }); continue; }
  const r = tolka(h, url);
  r.slug = egenSlug || slugAv(url);
  r.forfattare_ok = /niclas fohlin/i.test(r.byline);
  rader.push(r);
  if (flagga === '--bara-tabell') continue;
  if (!r.forfattare_ok || !r.datum || !r.titel) continue;
  const typ = /krönika/i.test(r.etikett || '') ? 'kronika' : /debatt|slutreplik|kommentar|replik/i.test(r.etikett || '') ? 'debatt' : 'artikel';
  const medf = r.byline.replace(/\s*\(.*\)$/, '').split(/,\s*/).map((s) => s.trim()).filter((n) => n && n !== 'Niclas Fohlin');
  const fm = [
    '---',
    `titel: ${y(r.titel)}`,
    `publicerad_rubrik: ${y(r.publicerad_rubrik)}`,
    `kalla: ${y(url)}`,
    `datum: ${r.datum}`,
    'publikation: "vi-larare"',
    `etikett: ${y(r.etikett || '')}`,
    `typ: ${y(typ)}`,
    `forfattarskap: ${y(medf.length ? 'medförfattare' : 'författare')}`,
    `medforfattare: [${medf.map(y).join(', ')}]`,
    `byline: ${y(r.byline)}`,
    `hamtad: ${idag}`,
    `ord: ${r.ord}`,
    'rattigheter: "ej bekräftade av Niclas"',
    'post: ""',
    ...(r.tidningens_ingress ? [`tidningens_ingress: ${y(r.tidningens_ingress)}`] : []),
    '---',
    '',
    r.stycken.join('\n\n'),
    '',
  ].join('\n');
  writeFileSync(join(ut, r.slug + '.md'), fm, 'utf8');
}
writeFileSync(join(ut, '_hamtning.json'), JSON.stringify(rader.map(({ stycken, ...rest }) => rest), null, 2) + '\n', 'utf8');
for (const r of rader) {
  if (r.fel) { console.log(`FEL  ${r.url}  ${r.fel}`); continue; }
  console.log(`${r.forfattare_ok ? 'OK ' : 'NEJ'}  ${r.datum || '????-??-??'}  ${String(r.ord).padStart(5)} ord  ${(r.etikett || '-').padEnd(16)}  ${r.byline.padEnd(34)}  ${r.titel}`);
}
