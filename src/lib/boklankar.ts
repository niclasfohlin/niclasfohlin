// Hänvisningarna i texten blir länkar, av sig själva, på sidan och i Word: Niclas böcker, hänvisningarna till dem och
// verktygen.
//
// Böckerna (K-362; Niclas 2026-10-16, ur metodriggens allmänna brev: "När en av mina böcker nämns ska den internlänka till
// den bokens sida på sajten. Det ska alltid ske automatiskt."). En bok som nämns med sin titel länkar till sin sida.
// Böckerna läses ur src/content/bocker/, så att en ny bok länkas utan ny kod, och en bok som är utkast länkas inte. En
// titel med undertitel efter kolon nämns oftast med huvudtiteln, delen före kolonet ("Grundbok i kooperativt lärande"),
// så både hela titeln och huvudtiteln hittas, den längsta först. Två böcker med samma huvudtitel (Kooperativt lärande i
// praktiken) länkas bara med hela titeln. En titel länkas där den står som en titel: med stor bokstav mitt i en mening
// ("Boken Gruppstärkande ledarskap beskriver"), med författare och år efter ("Gruppstärkande ledarskap (Fohlin och
// Wilson, 2023)") eller med året före, som i en källförteckning. Först i en mening kan titelns ord vara ämnet och inte
// boken (Meningsfull undervisning, Särskilda undervisningsgrupper), och där länkas den inte.
//
// Hänvisningarna till böckerna (K-459; Niclas 2026-10-19: "Vill även att ALLA där det står Fohlin eller hänvisas till
// Fohlin är länk till boken den hänvisar till. Fohlin 2027 ska hänvisas till generella https://niclasfohlin.se/bocker
// sidan"). Standarden hittar dem (fohlinHanvisningar i src/lib/standard/), och här avgörs boken: den titel som står
// direkt före parentesen eller i hänvisningen, annars den enda boken med samma år och medförfattare. En bok som inte är
// utgiven ("utkommer 2027", eller ett år som inte har kommit) länkar till sidan med alla böcker, /bocker. En hänvisning
// som kan gälla flera böcker, eller en bok som inte finns på sajten, stoppar bygget (hanvisningsFel nedan), så att
// titeln skrivs ut eller boken läggs in.
//
// Verktygen (K-458; Niclas samma dag: "Känns konstigt att inte hänvisa direkt till en sida när sajten faktiskt har den
// ... En hänvisning till ett verktyg ska leda till länken"). En central sak som nämns med sitt namn, som "Ta fram ett
// matteproblem" eller "Lässtrategier" (src/data/centrala.json, sidorna och pdf:erna), länkar till saken, och en adress på
// sajten som står som text, som "niclasfohlin.se/lastexter", länkar dit. På sidan får ett stycke som skickar läsaren till
// ett verktyg ("finns på sidan Ta fram ett matteproblem") verktygets knapp efter sig, om inte knappen redan står där.
//
// Det gäller varje fält i varje metod: på sidan lägger Boklankar.astro länkarna i sidans färdiga HTML, och i Word gör
// metoddocx.ts det i textens löpor. Reglerna står i STIL.md under Hänvisningar. Modulen läser inga filer själv, eftersom
// webbläsaren bygger Word-filen med samma kod.
import { CENTRALA, centralKnappHtml, centralLank, lasbarAdress, type Central } from './centrala';
import { fohlinHanvisningar, type FohlinHanvisning } from './standard/index.js';

const FILER = import.meta.glob<string>('../content/bocker/*.md', { eager: true, query: '?raw', import: 'default' });

export interface Bok { id: string; titel: string; ar: number; medforfattare: string[] }
type Namn = { text: string; adress: string };

function lasBok(sokvag: string, kalla: string): Bok | undefined {
  const id = sokvag.replace(/^.*\//, '').replace(/\.md$/, '');
  if (id.startsWith('_')) return undefined;
  const huvud = kalla.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  if (/^utkast:\s*true\s*$/m.test(huvud)) return undefined;
  const titel = huvud.match(/^titel:\s*(.+?)\s*$/m)?.[1]?.replace(/^(["'])(.*)\1$/, '$2');
  const ar = Number(huvud.match(/^utgivningsar:\s*(\d{4})\s*$/m)?.[1] ?? NaN);
  const medforfattare = [...(huvud.match(/^medforfattare:\s*\[(.*)\]\s*$/m)?.[1] ?? '').matchAll(/"([^"]+)"|'([^']+)'/g)].map((m) => m[1] ?? m[2]);
  return titel ? { id, titel, ar, medforfattare } : undefined;
}
export const BOCKER: Bok[] = Object.entries(FILER).map(([s, k]) => lasBok(s, k)).filter((b): b is Bok => Boolean(b));
export const bokAdress = (id: string) => `/bocker/${id}`;
/** Sidan med alla böcker: dit leder en hänvisning till en bok som inte är utgiven. */
export const BOCKERNA = '/bocker';

// Namnen som hittas: varje boks hela titel och huvudtiteln, när ingen annan bok har samma huvudtitel. Längst först, så
// att hela titeln vinner över huvudtiteln.
const huvudtitel = (t: string) => t.split(': ')[0];
const NAMN: Namn[] = (() => {
  const antal = new Map<string, number>();
  for (const b of BOCKER) antal.set(huvudtitel(b.titel), (antal.get(huvudtitel(b.titel)) ?? 0) + 1);
  const ut = new Map<string, string>();
  for (const b of BOCKER) {
    ut.set(b.titel, bokAdress(b.id));
    const h = huvudtitel(b.titel);
    if (h !== b.titel && antal.get(h) === 1) ut.set(h, bokAdress(b.id));
  }
  return [...ut].map(([text, adress]) => ({ text, adress })).sort((a, b) => b.text.length - a.text.length);
})();
const skydda = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MONSTER = NAMN.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${NAMN.map((n) => skydda(n.text)).join('|')})(?![\\p{L}\\p{N}])`, 'gu') : undefined;

// Verktygen och stödmaterialen som länkas när de nämns: sidorna och pdf:erna i registret. Ett formulär (Vår grupp) nämns
// oftast som bladet, inte som formuläret, och länkas inte.
const VERKTYG = CENTRALA.filter((c) => c.slag === 'sida' || c.slag === 'pdf').sort((a, b) => b.namn.length - a.namn.length);
const VERKTYGSMONSTER = VERKTYG.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${VERKTYG.map((c) => skydda(c.namn)).join('|')})(?![\\p{L}\\p{N}])`, 'gu') : undefined;
// Niclas forskning: artiklar där han är medförfattare, som länkar till artikelns egen sida (Niclas 2026-10-19 om studien
// på Om-sidan: "Länka gärna den till dess huvudsida artikel"). En hänvisning med förste författaren och året, som
// "(Klang m.fl., 2020)" eller "Klang, Olsson, Wilder, Lindqvist, Fohlin och Nilholm (2020)", blir en länk. En ny artikel
// läggs till här, med adressen till artikelns sida hos tidskriften.
const ARTIKLAR = [{ forfattare: 'Klang', ar: 2020, adress: 'https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.586489/full' }];
const artikelMonster = (a: (typeof ARTIKLAR)[number]) => new RegExp(String.raw`(?<![\p{L}])${a.forfattare}(?:\s+m\.\s?fl\.|(?:,\s+[\p{Lu}][\p{L}-]+)*\s+och\s+[\p{Lu}][\p{L}-]+)?(?:,\s*${a.ar}|\s*\(${a.ar}\))`, 'gu');
/** Hänvisningarna till Niclas forskning i en text: platsen och artikelns adress. */
function artikelhanvisningar(text: string): { start: number; slut: number; adress: string }[] {
  return ARTIKLAR.flatMap((a) => [...text.matchAll(artikelMonster(a))].map((m) => ({ start: m.index!, slut: m.index! + m[0].length, adress: a.adress })));
}
// En adress på sajten som står som text, med en sökväg och en filändelse om den är en fil: "niclasfohlin.se/lastexter",
// "niclasfohlin.se/stodundervisning/lasstrategier.pdf". En adress som är en central sak, med sin adress eller sin korta
// adress, länkar som saken, med samma namn i statistiken som knappen (centralLank).
const ADRESS = /(?<![\p{L}\p{N}.@/])niclasfohlin\.se(\/[a-z0-9][a-z0-9\-/]*[a-z0-9](?:\.(?:pdf|docx|pptx|zip))?)(?![\p{L}\p{N}/])/gu;
const centralMedAdress = (a: string) => CENTRALA.find((c) => c.adress === a || c.kort === a);

// Står träffen som en titel? Först i texten eller efter ett meningsslut är den det bara med året före eller efter.
const AR_EFTER = /^\s*\([^()]*\b(1[89]|20)\d\d\b[^()]*\)/;
const AR_FORE = /\((1[89]|20)\d\d[a-z]?\)\.?\s*$/;
function somTitel(fore: string, efter: string): boolean {
  const forst = !/\S/.test(fore.replace(/[”"'(\[–—-]\s*$/, '')) || /[.!?]["”']?\s+$/.test(fore);
  return !forst || AR_EFTER.test(efter) || AR_FORE.test(fore);
}

const efternamn = (n: string) => n.trim().split(/\s+/).at(-1) ?? '';
const AR_NU = new Date().getFullYear();
const NYASTE = Math.max(0, ...BOCKER.map((b) => b.ar).filter(Number.isFinite));
/** Böckerna som en hänvisning kan gälla: samma år och samma medförfattare ("m.fl." är minst två). */
function bockerFor(h: FohlinHanvisning): Bok[] {
  return BOCKER.filter((b) => b.ar === h.ar && (h.mfl
    ? b.medforfattare.length >= 2
    : b.medforfattare.length === h.medforfattare.length && h.medforfattare.every((e) => b.medforfattare.some((m) => efternamn(m) === e))));
}
/** Vart en hänvisning leder: bokens sida, sidan med alla böcker för en bok som inte är utgiven, eller inget, med skälet. */
export function hanvisningensBok(h: FohlinHanvisning, titelFore?: string): { adress?: string; fel?: string } {
  const mojliga = bockerFor(h);
  // Titeln avgör bland årets böcker, också när medförfattarna inte stämmer: ett kapitel i en antologi har Niclas ensam
  // ("Särskilda undervisningsgrupper (Fohlin, 2026)").
  const titel = h.titel ?? titelFore;
  const medTitel = titel ? BOCKER.find((b) => b.ar === h.ar && (b.titel === titel || huvudtitel(b.titel) === titel)) : undefined;
  if (medTitel) return { adress: bokAdress(medTitel.id) };
  if (mojliga.length === 1) return { adress: bokAdress(mojliga[0].id) };
  // En bok som inte är utgiven: "utkommer", ett år som inte har passerat eller ett år efter sajtens nyaste bok, så att
  // bygget inte stannar av sig självt vid ett årsskifte innan boken finns att lägga in.
  if (!mojliga.length && (h.utkommer || h.ar >= AR_NU || h.ar > NYASTE)) return { adress: BOCKERNA };
  // I en källförteckning kan titeln vara nästa källa ("Fohlin och Wilson, Elbow (1973)"): en titel och ett år som ingen
  // bok har är ingen hänvisning till Niclas böcker.
  if (!mojliga.length && h.titel) return {};
  if (!mojliga.length) return { fel: `"${h.text}": ingen bok på sajten har året ${h.ar} och ${h.mfl ? 'flera medförfattare' : h.medforfattare.length ? `medförfattaren ${h.medforfattare.join(' och ')}` : 'inga medförfattare'}. Lägg in boken i src/content/bocker/ eller artikeln i ARTIKLAR i src/lib/boklankar.ts, eller skriv "utkommer" före året om boken inte är utgiven` };
  return { adress: BOCKERNA, fel: `"${h.text}" kan gälla ${mojliga.length} böcker (${mojliga.map((b) => b.titel).join(', ')}). Skriv bokens titel direkt före parentesen, som "Gruppstärkande ledarskap (Fohlin och Wilson, 2023)"` };
}

export type Del = { text: string; adress?: string; central?: Central };
type Traff = { start: number; slut: number; adress?: string; central?: Central; vikt: number };

/**
 * Texten i delar, där en del med adress är en bok, en hänvisning till en bok eller en adress på sajten, och en del med
 * central är ett verktyg eller ett stödmaterial. Boktitlarna går före hänvisningar som har titeln i sig, och en längre
 * träff före en kortare som börjar på samma ställe.
 */
export function hanvisningsdelar(text: string): Del[] {
  if (!text) return [{ text }];
  const traffar: Traff[] = [];
  const titlar: { start: number; slut: number; namn: string; adress: string }[] = [];
  if (MONSTER) for (const m of text.matchAll(MONSTER)) {
    const i = m.index!;
    if (!somTitel(text.slice(0, i), text.slice(i + m[0].length))) continue;
    const adress = NAMN.find((n) => n.text === m[0])!.adress;
    titlar.push({ start: i, slut: i + m[0].length, namn: m[0], adress });
    traffar.push({ start: i, slut: i + m[0].length, adress, vikt: 3 });
  }
  const artiklar = artikelhanvisningar(text);
  for (const a of artiklar) traffar.push({ ...a, vikt: 4 });
  for (const h of fohlinHanvisningar(text)) {
    // En hänvisning inne i en hänvisning till en artikel ("… Fohlin och Nilholm (2020)") är artikelns.
    if (artiklar.some((a) => h.start < a.slut && a.start < h.slut)) continue;
    // Titeln direkt före parentesen ("Gruppstärkande ledarskap (Fohlin och Wilson, 2023)") säger vilken bok det är.
    const fore = titlar.find((t) => /^\s*\([^()]*$/.test(text.slice(t.slut, h.start)));
    const { adress } = hanvisningensBok(h, fore?.namn);
    if (adress) traffar.push({ start: h.start, slut: h.slut, adress, vikt: 2 });
  }
  if (VERKTYGSMONSTER) for (const m of text.matchAll(VERKTYGSMONSTER)) traffar.push({ start: m.index!, slut: m.index! + m[0].length, central: VERKTYG.find((c) => c.namn === m[0]), vikt: 1 });
  for (const m of text.matchAll(ADRESS)) {
    const c = centralMedAdress(m[1]);
    traffar.push({ start: m.index!, slut: m.index! + m[0].length, ...(c ? { central: c } : { adress: m[1] }), vikt: 1 });
  }
  if (!traffar.length) return [{ text }];
  // Överlappande träffar: en titel inne i en hänvisning vinner, annars den som börjar först och är längst.
  const valda: Traff[] = [];
  for (const t of traffar.sort((a, b) => b.vikt - a.vikt || a.start - b.start || b.slut - a.slut)) {
    if (valda.some((v) => t.start < v.slut && v.start < t.slut)) continue;
    valda.push(t);
  }
  valda.sort((a, b) => a.start - b.start);
  const ut: Del[] = [];
  let fran = 0;
  for (const t of valda) {
    if (t.start > fran) ut.push({ text: text.slice(fran, t.start) });
    ut.push({ text: text.slice(t.start, t.slut), ...(t.adress ? { adress: t.adress } : {}), ...(t.central ? { central: t.central } : {}) });
    fran = t.slut;
  }
  if (fran < text.length) ut.push({ text: text.slice(fran) });
  return ut;
}
/** Adressen som en del leder till i en fil som läses utanför sajten (Word): hela adressen, ett verktyg med sin korta. */
export const delensAdress = (d: Del, sajt: string): string | undefined =>
  d.central ? `${sajt}${lasbarAdress(d.central)}` : d.adress ? (/^https?:/.test(d.adress) ? d.adress : `${sajt}${d.adress}`) : undefined;
/** Bara böckerna och hänvisningarna till dem, som förut (Word-filens löpor läser hanvisningsdelar). */
export const bokdelar = (text: string) => hanvisningsdelar(text);

/** Felen i en text: hänvisningar till Fohlin som inte leder till en bok, och ett verktyg som inte finns ("Ta fram en …"). */
export function hanvisningsFel(text: string): string[] {
  const fel: string[] = [];
  const titlar = MONSTER ? [...text.matchAll(MONSTER)].filter((m) => somTitel(text.slice(0, m.index!), text.slice(m.index! + m[0].length))).map((m) => ({ slut: m.index! + m[0].length, namn: m[0] })) : [];
  const artiklar = artikelhanvisningar(text);
  for (const h of fohlinHanvisningar(text)) {
    if (artiklar.some((a) => h.start < a.slut && a.start < h.slut)) continue;
    const fore = titlar.find((t) => /^\s*\([^()]*$/.test(text.slice(t.slut, h.start)));
    const r = hanvisningensBok(h, fore?.namn);
    if (r.fel) fel.push(r.fel);
  }
  // En sida som texten skickar läsaren till ("på sidan Ta fram en …", "sidorna Ta fram en … och Ta fram en …") ska finnas,
  // med hela namnet. "Ta fram en tankebubbla" i en instruktion är vanlig svenska och prövas inte.
  const NAMNET = String.raw`Ta fram (?:en|ett) [\p{Ll}]+`;
  for (const m of text.matchAll(new RegExp(String.raw`\b[Ss]id(?:an|or|orna)\s+(?:och\s+)?${NAMNET}(?:(?:,\s*|\s+och\s+)${NAMNET})*`, 'gu'))) {
    for (const n of m[0].matchAll(new RegExp(NAMNET, 'gu'))) {
      if (!VERKTYG.some((c) => c.namn === n[0])) fel.push(`"${n[0]}" är ingen sida i src/data/centrala.json, så det kan inte bli en länk. Skriv sidans namn som det står i registret`);
    }
  }
  return fel;
}

// Sidans HTML: texten mellan taggarna får länkarna, utom inne i det som redan är en länk eller en knapp, rubrikerna,
// etiketterna (kolumnernas och fältens namn), upphovsraden (som har sidans egen adress) och det som inte är text (skript,
// stilar, svg, formulärets fält). Astros HTML är välformad, så taggarna räcker för att veta var texten står; ett skript
// eller en stil hoppas över i sin helhet, eftersom innehållet kan ha tecknet <. Texten läses som den står i HTML: namnen
// har inga tecken som skrivs om, och "&" i en hänvisning läser standarden också som &amp;.
const HOPPA = new Set(['a', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'th', 'dt', 'caption', 'script', 'style', 'svg', 'title', 'summary', 'label', 'textarea', 'select', 'option', 'noscript', 'code', 'pre', 'template']);
const HOPPA_KLASS = /\sclass="[^"]*\bupphov\b/;
// Ett stycke i en lista, en cell, ett citat eller en ruta får ingen knapp efter sig: knappen hör till metodens löptext.
const RUTA = new Set(['li', 'td', 'th', 'dd', 'blockquote', 'aside', 'figure']);
const TOMMA = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const attribut = (a: Record<string, string>) => Object.entries(a).map(([k, v]) => ` ${k}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`).join('');
// Ett stycke skickar läsaren till ett verktyg när det säger "sidan", "sidor" eller "sidorna" före verktygets namn.
const SIDAN = /\bsid(?:an|or|orna)\b/;

/**
 * Lägger länkarna i HTML: böckerna och hänvisningarna till dem (klassen boklank), verktygen (verktygslank, med samma
 * adress och namn i statistiken som verktygets knapp) och adresserna på sajten. metod och titel är metodens id och namn,
 * för statistiken och för knappen som ett stycke som skickar läsaren till ett verktyg får efter sig.
 */
export function lankaBocker(html: string, o: { metod?: string; titel?: string; knappar?: boolean } = {}): string {
  if (!MONSTER && !VERKTYGSMONSTER) return html;
  const metod = o.metod ?? '';
  const titel = o.titel ?? '';
  let ut = '';
  let hoppa = 0;
  const stack: { namn: string; hoppar: boolean }[] = [];
  // Styckena som är öppna: deras text, verktygen som nämns i dem, i ordning, och om de får en knapp efter sig.
  const stycken: { text: string; verktyg: { c: Central; plats: number }[]; knapp: boolean }[] = [];
  // Knapparnas adresser i en bit HTML, så att en knapp som redan står i avsnittet inte ritas en gång till.
  const knappar = (h: string) => [...h.matchAll(/<a\s+class="[^"]*\bknapp\b[^"]*"[^>]*?\shref="([^"]*)"/g)].map((k) => k[1]);
  const tagg = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
  let fran = 0;
  let m: RegExpExecArray | null;
  const text = (t: string) => {
    if (hoppa || !t.trim()) return t;
    const delar = hanvisningsdelar(t);
    const stycke = stycken.at(-1);
    let pos = 0;
    const html2 = delar.map((d) => {
      const fore = stycke ? stycke.text.length + pos : 0;
      pos += d.text.length;
      if (d.central) {
        stycke?.verktyg.push({ c: d.central, plats: fore });
        return `<a class="verktygslank"${attribut(centralLank(d.central, metod, titel))}>${d.text}</a>`;
      }
      return d.adress ? `<a class="boklank" href="${d.adress}">${d.text}</a>` : d.text;
    }).join('');
    if (stycke) stycke.text += t;
    return delar.length === 1 && !delar[0].adress && !delar[0].central ? t : html2;
  };
  while ((m = tagg.exec(html))) {
    ut += text(html.slice(fran, m.index));
    ut += m[0];
    fran = tagg.lastIndex;
    const namn = m[2]?.toLowerCase();
    if (!namn) continue;
    if (!m[1] && (namn === 'script' || namn === 'style')) {
      const slut = html.indexOf(`</${namn}>`, fran);
      const till = slut < 0 ? html.length : slut;
      ut += html.slice(fran, till);
      fran = till;
      tagg.lastIndex = till;
      continue;
    }
    if (TOMMA.has(namn) || m[4]) continue;
    if (m[1]) {
      let plats = -1;
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].namn === namn) { plats = i; break; }
      if (plats >= 0) { for (const s of stack.splice(plats)) if (s.hoppar) hoppa--; }
      if (namn === 'p' && stycken.length) {
        const s = stycken.pop()!;
        // Verktygen som stycket skickar läsaren till: de som nämns efter "sidan", i ordning, en gång var.
        const sidan = s.knapp ? s.text.search(SIDAN) : -1;
        const till = sidan < 0 ? [] : [...new Map(s.verktyg.filter((v) => v.plats > sidan).map((v) => [v.c.id, v.c])).values()];
        if (till.length) {
          // Står verktygets knapp redan i samma avsnitt, före stycket eller efter det fram till nästa rubrik, får det ingen
          // till: den som metodens fil sätter (centrala, src/lib/centrala.ts) eller ett stycke före har ritat gäller då.
          const forra = Math.max(...[1, 2, 3, 4, 5, 6].map((n) => ut.lastIndexOf(`<h${n}`)));
          const rubrik = html.slice(fran).search(/<h[1-6][\s>]/);
          const finns = new Set([...knappar(ut.slice(Math.max(0, forra))), ...knappar(rubrik < 0 ? html.slice(fran) : html.slice(fran, fran + rubrik))]);
          const nya = till.filter((c) => !finns.has(c.adress));
          if (nya.length) ut += `<p class="m-central-knapp">${nya.map((c) => centralKnappHtml(c, metod, titel)).join('')}</p>`;
        }
      }
    } else {
      const hoppar = HOPPA.has(namn) || HOPPA_KLASS.test(m[3] ?? '');
      if (namn === 'p') stycken.push({ text: '', verktyg: [], knapp: o.knappar !== false && !hoppa && !stack.some((s) => RUTA.has(s.namn)) });
      stack.push({ namn, hoppar });
      if (hoppar) hoppa++;
    }
  }
  return ut + text(html.slice(fran));
}
