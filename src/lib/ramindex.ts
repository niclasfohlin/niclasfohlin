// Materialets innehåll på metodens sida (K-152; Niclas 2026-10-01 om Textsamtal i grupp: "bara en massa länkar",
// "Någon form av struktur kring vad som är vad"): ramarna som en ordnad lista i stället för en rad med en länk per ram.
// Listan byggs ur ramarnas rubriker och lästexterna (ramform.ts), utan nya fält, så att en ny metod får den av sig själv:
//   en lästext och dess lärarsida ("Lärarens sida: <nivå>, <vad>, <titel>") blir en rad med två länkar under sin nivå,
//   och nivåns översikt ("Lärarens sidor: <nivå>", med en översiktstabell) blir nivåns första rad;
//   ramar vars rubriker börjar med samma led före kolon ("Åk 1: talen 0–30", "Åk 1: Läxa 1–5") står under ledet;
//   övriga ramar står var för sig. Allt i den ordning ramarna först kommer.
// Bara sidan läser listan; utskriften gömmer den och Word har sina egna rubriker.
import { lastexter } from './ramform';

/** En länk till en ram: ramens nummer (ankaret ram-<nr>) och texten. */
export interface Ramlank { nr: number; namn: string }
/** En rad: etiketten före (textens nummer, ledet), länken och en andra länk efter (lärarsidan, med sin etikett). */
export interface Indexrad { etikett?: string; lank: Ramlank; extra?: Ramlank & { etikett: string } }
export interface Indexniva { typ: 'niva'; namn: string; nivaNr: number; oversikt?: Ramlank; rader: Indexrad[] }
export type Indexpost = { typ: 'rad'; rad: Indexrad } | { typ: 'led'; namn: string; rader: Indexrad[] } | Indexniva;

type Ram = Parameters<typeof lastexter>[0][number];
const versal = (s: string) => s.charAt(0).toLocaleUpperCase('sv') + s.slice(1);

export function ramindex<R extends Ram>(ramar: R[]): Indexpost[] {
  const texter = lastexter(ramar);
  const nivaer = new Map<string, Indexniva>();
  const anvanda = new Set<number>();
  // Lästexterna, i sin ordning, under sin nivå. Textens nummer är etiketten ("text 1" blir 1), annars vad den är
  // ("Kartläggning före").
  ramar.forEach((ram, i) => {
    const l = texter.get(ram);
    if (!l) return;
    if (!nivaer.has(l.niva)) nivaer.set(l.niva, { typ: 'niva', namn: l.niva, nivaNr: l.nivaNr, rader: [] });
    const nr = l.vad.match(/^text (\d+)$/i)?.[1];
    nivaer.get(l.niva)!.rader.push({ etikett: nr ?? versal(l.vad), lank: { nr: i + 1, namn: l.titel } });
    anvanda.add(i);
  });
  // Lärarsidan till en lästext: "<namn>: <nivå>, <vad>, <titel>" med samma nivå, vad och titel. Nivåns översikt:
  // "<namn>: <nivå>" med en översiktstabell.
  ramar.forEach((ram, i) => {
    if (anvanda.has(i)) return;
    const s = ram.rubrik.match(/^([^:]+): ([^,]+), ([^,]+), (.+)$/);
    const rad = s && nivaer.get(s[2])?.rader.find((r) => !r.extra && r.lank.namn === s[4] && texter.get(ramar[r.lank.nr - 1])?.vad === s[3]);
    if (s && rad) { rad.extra = { nr: i + 1, namn: s[4], etikett: s[1] }; anvanda.add(i); return; }
    // Spärren (K-155; Niclas 2026-10-01: "Görs det automatiskt rätt i framtiden?"): en ram som heter som en lärarsida på en
    // av metodens nivåer men inte hittar sin lästext, eller vars lästext redan har en lärarsida, är en felskriven rubrik.
    // Den skulle hamna på fel plats i listan, så bygget stannar och säger vilken rubrik som ska rättas.
    if (s && nivaer.has(s[2])) throw new Error(`Materialets lista: ramen "${ram.rubrik}" heter som en lärarsida på nivån ${s[2]}, men ${nivaer.get(s[2])!.rader.some((r) => r.lank.namn === s[4] && texter.get(ramar[r.lank.nr - 1])?.vad === s[3]) ? 'lästexten har redan en lärarsida' : `ingen lästext heter "${s[2]}, ${s[3]}: ${s[4]}"`}. Rätta rubriken i metodfilen, så att lärarsidan har samma nivå, vad och titel som sin text (METODER.md, Elevmaterial i en ram).`);
    const o = ram.rubrik.match(/^([^:]+): (.+)$/);
    const niva = o && ram.oversikt ? nivaer.get(o[2]) : undefined;
    if (niva && !niva.oversikt) { niva.oversikt = { nr: i + 1, namn: ram.rubrik }; anvanda.add(i); }
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
      poster.push({ forst: ovriga[k].nr, post: { typ: 'led', namn: led, rader: ovriga.slice(k, slut).map((x) => ({ lank: { nr: x.nr, namn: x.ram.rubrik.slice(led.length + 2) } })) } });
      k = slut - 1;
    } else poster.push({ forst: ovriga[k].nr, post: { typ: 'rad', rad: { lank: { nr: ovriga[k].nr, namn: ovriga[k].ram.rubrik } } } });
  }
  // Varje ram har exakt en länk i listan, så att ingen ram försvinner ur den eller står två gånger.
  const lankade = poster.flatMap(({ post: p }) => (p.typ === 'rad' ? [p.rad.lank.nr] : [...(p.typ === 'niva' && p.oversikt ? [p.oversikt.nr] : []), ...p.rader.flatMap((r) => [r.lank.nr, ...(r.extra ? [r.extra.nr] : [])])]));
  if (lankade.length !== ramar.length || new Set(lankade).size !== ramar.length) throw new Error(`Materialets lista: ${ramar.length} ramar men ${new Set(lankade).size} olika länkar av ${lankade.length} (src/lib/ramindex.ts).`);
  return poster.sort((a, b) => a.forst - b.forst).map((p) => p.post);
}
