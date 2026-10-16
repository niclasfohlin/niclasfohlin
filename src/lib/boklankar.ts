// Niclas böcker länkar till bokens sida när de nämns (K-362; Niclas 2026-10-16, ur metodriggens allmänna brev: "När en
// av mina böcker nämns ska den internlänka till den bokens sida på sajten. Det ska alltid ske automatiskt."). Det gäller
// varje fält i varje metod: på sidan lägger Boklankar.astro länkarna i sidans färdiga HTML, och i Word gör metoddocx.ts
// det i textens löpor. Böckerna läses ur src/content/bocker/, så att en ny bok länkas utan ny kod, och en bok som är
// utkast länkas inte. Modulen läser inga filer själv, eftersom webbläsaren bygger Word-filen med samma kod.
//
// En titel med undertitel efter kolon nämns oftast med huvudtiteln, delen före kolonet ("Grundbok i kooperativt
// lärande"), så både hela titeln och huvudtiteln hittas, den längsta först. Två böcker med samma huvudtitel (Kooperativt
// lärande i praktiken) länkas bara med hela titeln. En titel länkas där den står som en titel: med stor bokstav mitt i en
// mening ("Boken Gruppstärkande ledarskap beskriver"), med författare och år efter ("Gruppstärkande ledarskap (Fohlin
// och Wilson, 2023)") eller med året före, som i en källförteckning. Först i en mening kan titelns ord vara ämnet och
// inte boken (Meningsfull undervisning, Särskilda undervisningsgrupper), och där länkas den inte.

const FILER = import.meta.glob<string>('../content/bocker/*.md', { eager: true, query: '?raw', import: 'default' });

export interface Bok { id: string; titel: string }
type Namn = { text: string; adress: string };

function lasBok(sokvag: string, kalla: string): Bok | undefined {
  const id = sokvag.replace(/^.*\//, '').replace(/\.md$/, '');
  if (id.startsWith('_')) return undefined;
  const huvud = kalla.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  if (/^utkast:\s*true\s*$/m.test(huvud)) return undefined;
  const titel = huvud.match(/^titel:\s*(.+?)\s*$/m)?.[1]?.replace(/^(["'])(.*)\1$/, '$2');
  return titel ? { id, titel } : undefined;
}
export const BOCKER: Bok[] = Object.entries(FILER).map(([s, k]) => lasBok(s, k)).filter((b): b is Bok => Boolean(b));
export const bokAdress = (id: string) => `/bocker/${id}`;

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

// Står träffen som en titel? Först i texten eller efter ett meningsslut är den det bara med året före eller efter.
const AR_EFTER = /^\s*\([^()]*\b(1[89]|20)\d\d\b[^()]*\)/;
const AR_FORE = /\((1[89]|20)\d\d[a-z]?\)\.?\s*$/;
function somTitel(fore: string, efter: string): boolean {
  const forst = !/\S/.test(fore.replace(/[”"'(\[–—-]\s*$/, '')) || /[.!?]["”']?\s+$/.test(fore);
  return !forst || AR_EFTER.test(efter) || AR_FORE.test(fore);
}

/** Texten i delar, där en del med adress är en boktitel som ska bli en länk. */
export function bokdelar(text: string): { text: string; adress?: string }[] {
  if (!MONSTER || !text) return [{ text }];
  const ut: { text: string; adress?: string }[] = [];
  let fran = 0;
  for (const m of text.matchAll(MONSTER)) {
    const i = m.index!;
    if (!somTitel(text.slice(0, i), text.slice(i + m[0].length))) continue;
    if (i > fran) ut.push({ text: text.slice(fran, i) });
    ut.push({ text: m[0], adress: NAMN.find((n) => n.text === m[0])!.adress });
    fran = i + m[0].length;
  }
  if (fran < text.length) ut.push({ text: text.slice(fran) });
  return ut.length ? ut : [{ text }];
}

// Sidans HTML: texten mellan taggarna får länkarna, utom inne i det som redan är en länk eller en knapp, rubrikerna och
// det som inte är text (skript, stilar, svg, formulärets fält). Astros HTML är välformad, så taggarna räcker för att
// veta var texten står; ett skript eller en stil hoppas över i sin helhet, eftersom innehållet kan ha tecknet <. Texten
// läses som den står i HTML, eftersom titlarna inte har några tecken som skrivs om (&, < och >).
const HOPPA = new Set(['a', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'script', 'style', 'svg', 'title', 'summary', 'label', 'textarea', 'select', 'option', 'noscript', 'code', 'pre', 'template']);
const TOMMA = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/** Lägger länkar till böckerna i HTML. klass är länkens klass. */
export function lankaBocker(html: string, klass = 'boklank'): string {
  if (!MONSTER) return html;
  let ut = '';
  let hoppa = 0;
  const stack: string[] = [];
  const tagg = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
  let fran = 0;
  let m: RegExpExecArray | null;
  const text = (t: string) => {
    if (hoppa || !t.trim()) return t;
    const delar = bokdelar(t);
    if (delar.length === 1 && !delar[0].adress) return t;
    return delar.map((d) => (d.adress ? `<a class="${klass}" href="${d.adress}">${d.text}</a>` : d.text)).join('');
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
      const plats = stack.lastIndexOf(namn);
      if (plats >= 0) { for (const s of stack.splice(plats)) if (HOPPA.has(s)) hoppa--; }
    } else {
      stack.push(namn);
      if (HOPPA.has(namn)) hoppa++;
    }
  }
  return ut + text(html.slice(fran));
}
