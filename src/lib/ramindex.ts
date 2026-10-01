// Materialets innehåll på metodens sida (K-152; Niclas 2026-10-01 om Textsamtal i grupp: "bara en massa länkar",
// "Någon form av struktur kring vad som är vad"): ramarna som en ordnad lista i stället för en rad med en länk per ram.
// Listan byggs ur ramarnas rubriker och lästexterna (ramform.ts), utan nya fält, så att en ny metod får den av sig själv:
//   en lästext och dess lärarsida ("Lärarens sida: <nivå>, <vad>, <titel>") blir en rad med två länkar under sin nivå,
//   och nivåns översikt ("Lärarens sidor: <nivå>") blir nivåns första rad;
//   ramar vars rubriker börjar med samma led före kolon ("Åk 1: talen 0–30", "Åk 1: Läxa 1–5") står under ledet;
//   övriga ramar står var för sig. Allt i den ordning ramarna först kommer.
// Bara sidan läser listan; utskriften gömmer den och Word har sina egna rubriker. scripts/ramindexprov.mjs prövar
// listan och spärren nedan i npm run validera.
import { lastexter } from './ramform';

/** En länk till en ram: ramens nummer (ankaret ram-<nr>) och texten. */
export interface Ramlank { nr: number; namn: string }
/** En rad: etiketten före (textens nummer, ledet), länken och en andra länk efter (lärarsidan, med sin etikett). */
export interface Indexrad { etikett?: string; lank: Ramlank; extra?: Ramlank & { etikett: string } }
export interface Indexniva { typ: 'niva'; namn: string; nivaNr: number; oversikt?: Ramlank; rader: Indexrad[] }
export type Indexpost = { typ: 'rad'; rad: Indexrad } | { typ: 'led'; namn: string; rader: Indexrad[] } | Indexniva;

type Ram = Parameters<typeof lastexter>[0][number];
const versal = (s: string) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);
// Lärarens sidor heter som i riggen och som arLararsida i Metod.astro, som ger dem ett eget blad i utskriften.
const LARARSIDA = /^Lärarens sida: (.+)$/;
const LARARSIDOR = /^Lärarens sidor: (.+)$/;

export function ramindex<R extends Ram>(ramar: R[]): Indexpost[] {
  const texter = lastexter(ramar);
  const nivaer = new Map<string, Indexniva>();
  const anvanda = new Set<number>();
  // Lärarsidans rubrik efter "Lärarens sida: " är textens nivå, vad och titel med kommatecken emellan, så att ett
  // kommatecken i vad eller titel inte spelar någon roll.
  const nycklar = new Map<string, Indexrad>();
  // Lästexterna, i sin ordning, under sin nivå. Textens nummer är etiketten ("text 1" blir 1), annars vad den är
  // ("Kartläggning före").
  ramar.forEach((ram, i) => {
    const l = texter.get(ram);
    if (!l) return;
    if (!nivaer.has(l.niva)) nivaer.set(l.niva, { typ: 'niva', namn: l.niva, nivaNr: l.nivaNr, rader: [] });
    const nr = l.vad.match(/^text (\d+)$/i)?.[1];
    const rad: Indexrad = { etikett: nr ?? versal(l.vad), lank: { nr: i + 1, namn: l.titel } };
    nivaer.get(l.niva)!.rader.push(rad);
    nycklar.set(`${l.niva}, ${l.vad}, ${l.titel}`, rad);
    anvanda.add(i);
  });
  // Spärren (K-155, K-156; Niclas 2026-10-01: "Görs det automatiskt rätt i framtiden?"): i en metod med lästexter ska
  // varje Lärarens sida hitta sin text och varje Lärarens sidor sin nivå. En felskriven rubrik skulle hamna på fel plats i
  // listan, så bygget stannar och säger vilken rubrik som ska rättas. Andra ramar känns aldrig igen som lärarsidor.
  const stopp = (text: string): never => { throw new Error(`Materialets lista: ${text} Metodens nivåer är ${[...nivaer.keys()].join(', ')} (METODER.md, Elevmaterial i en ram).`); };
  if (nivaer.size) ramar.forEach((ram, i) => {
    if (anvanda.has(i)) return;
    const sida = ram.rubrik.match(LARARSIDA);
    if (sida) {
      const rad = nycklar.get(sida[1]);
      const delar = sida[1].split(', ');
      const textensRubrik = delar.length >= 3 ? `${delar[0]}, ${delar[1]}: ${delar.slice(2).join(', ')}` : sida[1];
      if (!rad) stopp(`ramen "${ram.rubrik}" hittar ingen lästext som heter "${textensRubrik}". Lärarens sida ska heta Lärarens sida: <nivå>, <vad>, <titel>, med samma nivå, vad och titel som texten.`);
      else if (rad.extra) stopp(`ramen "${ram.rubrik}" är en andra lärarsida till texten "${textensRubrik}" (den första är "${ramar[rad.extra.nr - 1].rubrik}").`);
      else { rad.extra = { nr: i + 1, namn: rad.lank.namn, etikett: 'Lärarens sida' }; anvanda.add(i); }
      return;
    }
    const sidor = ram.rubrik.match(LARARSIDOR);
    if (sidor) {
      const niva = nivaer.get(sidor[1]);
      if (!niva) stopp(`ramen "${ram.rubrik}" hör inte till någon av metodens nivåer.`);
      else if (niva.oversikt) stopp(`ramen "${ram.rubrik}" är en andra översikt för nivån ${sidor[1]}.`);
      else { niva.oversikt = { nr: i + 1, namn: ram.rubrik }; anvanda.add(i); }
    }
  });
  // En nivå står där dess första ram står.
  const poster: { forst: number; post: Indexpost }[] = [...nivaer.values()].map((n) => ({
    forst: Math.min(...[n.oversikt, ...n.rader.flatMap((r) => [r.lank, r.extra])].filter((x) => x !== undefined).map((x) => x.nr)),
    post: n,
  }));
  // Övriga ramar: ett led före kolon som två eller fler ramar i följd delar blir en grupp, annars en rad var.
  const ovriga = ramar.map((ram, i) => ({ ram, nr: i + 1 })).filter(({ nr }) => !anvanda.has(nr - 1));
  for (let k = 0; k < ovriga.length; k++) {
    const led = ovriga[k].ram.rubrik.match(/^([^:]+): (.+)$/)?.[1];
    let slut = k + 1;
    if (led) while (slut < ovriga.length && ovriga[slut].ram.rubrik.startsWith(`${led}: `)) slut++;
    if (led && slut - k >= 2) {
      poster.push({ forst: ovriga[k].nr, post: { typ: 'led', namn: led, rader: ovriga.slice(k, slut).map((x) => ({ lank: { nr: x.nr, namn: versal(x.ram.rubrik.slice(led.length + 2)) } })) } });
      k = slut - 1;
    } else poster.push({ forst: ovriga[k].nr, post: { typ: 'rad', rad: { lank: { nr: ovriga[k].nr, namn: ovriga[k].ram.rubrik } } } });
  }
  // Varje ram har exakt en länk i listan, så att ingen ram försvinner ur den eller står två gånger.
  const lankade = poster.flatMap(({ post: p }) => (p.typ === 'rad' ? [p.rad.lank.nr] : [...(p.typ === 'niva' && p.oversikt ? [p.oversikt.nr] : []), ...p.rader.flatMap((r) => [r.lank.nr, ...(r.extra ? [r.extra.nr] : [])])]));
  if (lankade.length !== ramar.length || new Set(lankade).size !== ramar.length) throw new Error(`Materialets lista: ${ramar.length} ramar men ${new Set(lankade).size} olika länkar av ${lankade.length} (src/lib/ramindex.ts).`);
  return poster.sort((a, b) => a.forst - b.forst).map((p) => p.post);
}
