// Lyftcitaten i texterna (K-617; reglerna i STIL.md under Lyftcitat): en mening ur texten lyft före stället
// där den står, som en krok som får läsaren att läsa vidare (Niclas 2026-10-28: "ett citat i förväg som bygger upp
// spänning i texten och bryter lite mot all text innan"). Citaten står i krönikans fil (fältet citat i
// src/content.config.ts), och platsen sätts här, i bygget, ur textens färdiga html.
//
// Styckena är textens p-element på översta nivån, så att ett stycke i en lista aldrig får ett citat inuti sig. Citaten
// sprids jämnt i texten: citatet med plats k i fältet (0, 1, 2) siktar på stället efter stycke 2 + round(k·(n−2)/m), där
// n är antalet stycken och m antalet citat, och står på det bra ställe som ligger närmast (bra nedan): aldrig mitt i en
// mening som fortsätter efter ett kolon, före en lista eller rubrik, bland repliker eller korta rader, eller närmare än
// två stycken ett annat citat. Ett citat står alltid minst ett helt stycke före stycket där meningen står, så att läsaren
// möter citatet först; därför kan meningen inte stå i textens tre första stycken. Citatet är aria-hidden, eftersom
// meningen redan står i texten och en skärmläsare annars läser den två gånger.
//
// Bygget stannar med krönikans id och citatet när ett citat inte står ordagrant i ett stycke, när meningen står för
// tidigt i texten och när det inte finns något bra ställe före meningen. Texten jämförs utan skillnad i mellanslag, hårda
// mellanslag och osynliga tecken (mjukt bindestreck, ordfog, nollbrett mellanslag). En ellips först eller sist i citatet,
// som i "… och nu ska rent tyckande bära en hel reform.", säger att meningen är avkortad där; resten står ordagrant.
//
// Tidningens utdragscitat (Niclas 2026-10-29: "tidningens utdragscitat ska ju vara stora citaten vi fixat") står som
// tidningen tryckte dem, ofta kortade så att de bär på egen hand: { text, ur }, där text är tidningens version som visas och
// ur är meningen i texten som citatet kommer ur. Det är ur som ska stå ordagrant och som bestämmer platsen.

const OSYNLIGA = /[­​-‍⁠﻿]/g;
const ELLIPS_FORE = /^(?:…|\.\.\.)\s*/;
const ELLIPS_EFTER = /\s*(?:…|\.\.\.)$/;
const VOIDA = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const ORDNING = ['första', 'andra', 'tredje'];
const NAMNGIVNA: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '­' };

// Texten så som den jämförs: utan osynliga tecken, och varje följd av mellanslag, hårda mellanslag och radbrytningar som
// ett enda mellanslag (\s rymmer också U+00A0, U+202F och de smala mellanslagen).
const jamforbar = (text: string) => text.replace(OSYNLIGA, '').replace(/\s+/g, ' ').trim();

const avkoda = (html: string) =>
  html.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (hel, namn: string) => {
    if (namn[0] === '#') return String.fromCodePoint(namn[1] === 'x' || namn[1] === 'X' ? parseInt(namn.slice(2), 16) : parseInt(namn.slice(1), 10));
    return NAMNGIVNA[namn.toLowerCase()] ?? hel;
  });

const skydda = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface Stycke { slut: number; text: string; nasta: string }

/** Ett lyftcitat: en mening ur texten, eller tidningens version med meningen den kommer ur. */
export type Lyftcitat = string | { text: string; ur: string };

// Textens stycken på översta nivån, med var stycket slutar i html:en och dess text. Taggarna räknas för att veta vad som
// ligger på översta nivån; ett p kan inte innehålla ett annat block, så stycket slutar vid sitt </p>.
function stycken(html: string): Stycke[] {
  const ut: Stycke[] = [];
  const tagg = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>|<!--[\s\S]*?-->/g;
  let djup = 0;
  let borjan = -1;
  for (let t = tagg.exec(html); t; t = tagg.exec(html)) {
    if (!t[2]) continue;
    const namn = t[2].toLowerCase();
    const stang = t[1] === '/';
    if (namn === 'p' && !stang && djup === 0) borjan = t.index + t[0].length;
    if (namn === 'p' && stang && djup === 1 && borjan >= 0) {
      // nasta är taggen som följer stycket på översta nivån (p, ul, h2, blockquote …), tom sist i texten.
      const slut = t.index + t[0].length;
      const nasta = (/^\s*(?:<!--[\s\S]*?-->\s*)*<([a-zA-Z][a-zA-Z0-9-]*)/.exec(html.slice(slut))?.[1] ?? '').toLowerCase();
      ut.push({ slut, text: jamforbar(avkoda(html.slice(borjan, t.index).replace(/<[^>]*>/g, ''))), nasta });
      borjan = -1;
    }
    if (VOIDA.has(namn) || t[3] === '/') continue;
    djup += stang ? -1 : 1;
  }
  return ut;
}

/** Krönikans html med lyftcitaten insatta efter sina stycken. Utan citat kommer html:en tillbaka som den är. */
export function sattInLyftcitat(html: string, citat: readonly Lyftcitat[] | undefined, id: string): string {
  if (!citat?.length) return html;
  const delar = stycken(html);
  const n = delar.length;
  const m = citat.length;
  const fel: string[] = [];
  const platser: { efter: number; c: string }[] = [];
  // Ett bra ställe efter stycke g (räknat från 1): stycket slutar inte med kolon, nästa sak i texten är ett stycke och inte
  // en lista, en rubrik eller ett citat, ingen av de två är en replik, och de är inte båda korta, som i en följd av
  // repliker eller korta rader (urvalet av citaten 2026-10-28: elva texter fick annars citatet mitt i en dialog, mellan ett
  // kolon och det som följer eller precis före en mellanrubrik).
  // En replik börjar med tankstreck eller citattecken, eller med ett namn och kolon före citattecknet, också med en
  // scenanvisning, som "Adam: ”Ehh …”" och "Adam (förnedrad): ”Jag förstår …”". Ett kort stycke där en mening i citattecken
  // följer på berättelsen, som "Hon suckade. ”Jag pratar om mat …”", är också en replik (Codex 2026-10-29: citatet stod
  // annars mellan dialogens sista rad och dess poäng).
  const replik = (s: Stycke) => /^[–—\-”"»]/.test(s.text)
    || /^\p{Lu}[\p{L}-]*(?: \p{Lu}[\p{L}-]*)?(?: \([^)]*\))?: ?[”"»]/u.test(s.text)
    || (s.text.length < 250 && /[.!?…]\s*[”"»]\p{Lu}/u.test(s.text));
  const kort = (s: Stycke) => s.text.length < 90;
  const bra = (g: number) => {
    const fore = delar[g - 1], efter = delar[g];
    return !!fore && !!efter && fore.nasta === 'p' && !/:$/.test(fore.text) && !replik(fore) && !replik(efter) && !(kort(fore) && kort(efter));
  };
  citat.forEach((lc, k) => {
    // c är texten som visas, ur meningen i texten som den kommer ur.
    const c = typeof lc === 'string' ? lc : lc.text;
    const ur = typeof lc === 'string' ? lc : lc.ur;
    const sokt = jamforbar(ur).replace(ELLIPS_FORE, '').replace(ELLIPS_EFTER, '');
    const kalla = delar.findIndex((s) => s.text.includes(sokt)) + 1;
    if (!sokt || kalla === 0) {
      fel.push(`"${ur}" står inte ordagrant i något stycke i texten. Ett citat är en mening ur texten, ordagrant; en ellips först eller sist får visa att meningen är avkortad.`);
      return;
    }
    if (kalla <= 3) {
      fel.push(`"${ur}" står i textens ${ORDNING[kalla - 1]} stycke. Citatet står efter andra stycket och minst ett stycke före meningen, så meningen behöver stå i fjärde stycket eller senare; välj en annan mening.`);
      return;
    }
    // Det bra stället närmast den jämna platsen, före meningen och minst två stycken från ett annat citat; finns inget
    // från andra stycket och framåt får citatet stå efter första stycket.
    const jamn = 2 + Math.round((k * (n - 2)) / m);
    const fritt = (g: number) => bra(g) && platser.every((q) => Math.abs(q.efter - g) >= 2);
    const efter = Array.from({ length: Math.max(0, kalla - 3) }, (_, i) => i + 2).filter(fritt)
      .sort((a, b) => Math.abs(a - jamn) - Math.abs(b - jamn) || a - b)[0] ?? (fritt(1) ? 1 : 0);
    if (!efter) {
      fel.push(`"${c}" har inget bra ställe före sin mening: varje mellanrum före den bryter en mening som fortsätter, en lista, en rubrik, repliker eller ett annat citat. Välj en mening som står längre fram i texten.`);
      return;
    }
    platser.push({ efter, c });
  });
  if (fel.length) throw new Error(`Lyftcitaten i ${id} (fältet citat i src/content/artiklar/${id}.md):\n${fel.join('\n')}`);
  let ut = html;
  for (const { efter, c } of [...platser].sort((a, b) => b.efter - a.efter)) {
    const slut = delar[efter - 1].slut;
    // En ellips först hålls ihop med ordet efter, så att den aldrig står ensam på citatets första rad.
    const text = skydda(c.trim()).replace(/^(…|\.\.\.) /, '$1 ');
    // Ett citat på två eller tre meningar står i en lite mindre grad (lyftcitat-lang i global.css), så att det inte tar hela
    // skärmen i telefonen.
    const lang = c.trim().length > 140 ? ' lyftcitat-lang' : '';
    ut = `${ut.slice(0, slut)}\n<aside class="lyftcitat${lang}" aria-hidden="true"><p>${text}</p></aside>${ut.slice(slut)}`;
  }
  return ut;
}
