// Problemens tre blad (Problemlösning i grupp, metodriggens TILL-SAJTEN 2026-10-10, Det nya punkt 1–3), med samma regler
// som riggens build/modell.mjs, så att riggens metodfil fungerar som den är. Sidan och utskriften (Metod.astro,
// Problemsida.astro, Textpar.astro) och Word-filerna (metoddocx.ts) frågar här, så att formerna inte kan glida isär.
//   Problemets sida: en lästext (lastexter i ramform.ts) vars vad börjar med problem och som har en bild På bordet med
//   efter "ram: <ramens rubrik>". Bilden står mellan problemet och frågan, utan anfang.
//   Två lösningar: två texter (textparAv) i en ram som heter "Två lösningar: <nivå>, <vad>, <titel>", med två bilder På
//   bordet vid ramen, lösning A och B i nummerordning. Elevens blad har de ritade lösningarna, på ett liggande A4, utan
//   lärarens sida före.
//   Lärarens sida till ett problem: en ram som heter "Lärarens sida: <nivå>, <vad>, <titel>" där vad börjar med problem.
//   Problemet och frågorna står först i en ruta, ur problemets egen ram, och de två lösningarna bredvid varandra efter
//   ramens text, med namnen ur ramen Två lösningar.
//   Lösningsförslaget (metodriggens TILL-SAJTEN 2026-10-18; Niclas samma dag: "Varje problem ska ha en sida som har två
//   lösningsförslag och vad läraren bör tänka på", "Måste ha en design som en A4a och stämma"): en ram som heter
//   "Lösningsförslag: <nivå>, problem <n>, <titel>", ett A4 för läraren i problemets form, med riggens regler (build/modell.mjs).
//   Ramen har delarna Svaret (fälten Svaret, Kontroll och Idén) och Lösningarna (Lösning A och B med namnen efter idén,
//   Lösning C med tankevurpan i elevens rader och Om lösning C, lärarens rader om den). Problemet, frågorna, bilden och
//   innehållstaggen kommer ur problemets ram, lösningarnas bilder och frågorna om tankarna bakom ur ramen Två lösningar,
//   och rutan om att visa och jämföra lösningar ur ramen "Lösningsförslagen: <rubrik>", som står en gång i metoden och
//   ritas på varje lösningsförslag. Så står inget två gånger i metodens fil. Källan står i ramens text och i sidfoten.
// Inga Node-beroenden: Word-filen av flera metoder byggs i webbläsaren med samma regler.
import { lastexter, textparAv, type Lastext, type Textpar } from './ramform';
import { paBordetVid, type PaBordet } from './pabordet';
import { losningsforslagMatt } from './boksida';
import type { LfBild, LosningsforslagVy } from './losningsforslag';

type Ram = Parameters<typeof lastexter>[0][number] & Parameters<typeof textparAv>[0] & { innehallstagg?: string };

/** Lösningsförslaget till ett problem, i den form som Word (metoddocx.ts), sidan och Ta fram (src/lib/losningsforslag.ts)
 *  ritar. Databasens problem (riggens out/databas/matteproblem, sajtens kö K-425) får samma form. */
export interface Losningsforslag {
  titel: string; niva: string; nivaNr: number; vad: string;
  /** Innehållstaggen ur problemets ram, och källan, som står i sidfoten. */
  tagg: string; kalla: string;
  problem: { stycken: string[]; fragor: string[]; bild?: PaBordet };
  svaret: string; kontroll: string; iden: string;
  /** Lösning A och B: namnet som det står ("Lösning A: en tabell"), meningen och bilden. */
  losningar: { namn: string; text: string; bild: PaBordet }[];
  /** Lösning C, tankevurpan: namnet, elevens rader och lärarens rader om den. */
  c?: { namn: string; rader: string[]; larare: string[] };
  /** Frågorna om tankarna bakom, ur ramen Två lösningar. */
  fragor: string[];
  /** Rutan om att visa och jämföra lösningar: rubriken och punkterna med sina namn. */
  ruta: { rubrik: string; punkter: { namn: string; text: string }[] };
}
/** Rutans ram: "Lösningsförslagen: <rubrik>" (src/lib/bank.ts räknar den till banken). */
export const LOSNINGSRUTA = /^Lösningsförslagen: /;

export const arProblem = (vad: string) => /^problem(\s|$)/i.test(vad);

export interface Problemformer {
  /** Problemets bild, när ramen är problemets sida. */
  bild: (ram: Ram) => PaBordet | undefined;
  /** Två lösningar: texterna och de två bilderna, när ramen är bladet Två lösningar. */
  losningar: (ram: Ram) => { par: Textpar; bilder: PaBordet[] } | undefined;
  /** Lärarens sida till ett problem: problemets stycken och frågor, och lösningarnas bilder med sina namn. */
  larare: (ram: Ram) => { l: Lastext; bilder: PaBordet[]; namn: string[] } | undefined;
  /** Lösningsförslaget, när ramen är ett. Stoppar bygget när problemets ram, ramen Två lösningar eller rutan saknas. */
  losningsforslag: (ram: Ram) => Losningsforslag | undefined;
}

export function problemformer(ramar: Ram[], bilder: PaBordet[]): Problemformer {
  const texter = lastexter(ramar);
  const losningsbilder = (rubrik: string) => (/^Två lösningar:/.test(rubrik) ? paBordetVid(bilder, { ram: rubrik }) : []);
  return {
    bild: (ram) => { const l = texter.get(ram); return l && arProblem(l.vad) ? paBordetVid(bilder, { ram: ram.rubrik })[0] : undefined; },
    losningar: (ram) => {
      const par = textparAv(ram);
      const b = par ? losningsbilder(ram.rubrik) : [];
      return par && b.length === 2 ? { par, bilder: b } : undefined;
    },
    larare: (ram) => {
      const m = ram.rubrik.match(/^Lärarens sida: (.+)$/);
      if (!m) return undefined;
      const pram = ramar.find((x) => { const l = texter.get(x); return !!l && arProblem(l.vad) && `${l.niva}, ${l.vad}, ${l.titel}` === m[1]; });
      if (!pram) return undefined;
      const tva = ramar.find((x) => x.rubrik === `Två lösningar: ${m[1]}`);
      const b = tva ? losningsbilder(tva.rubrik) : [];
      return { l: texter.get(pram)!, bilder: b.length === 2 ? b : [], namn: (tva?.listor?.[0]?.kolumner ?? []).map(String) };
    },
    losningsforslag: (ram) => {
      const m = ram.rubrik.match(/^Lösningsförslag: ([^,]+), (problem \d+), (.+)$/);
      if (!m) return undefined;
      const nyckel = `${m[1]}, ${m[2]}, ${m[3]}`;
      const pram = ramar.find((x) => { const l = texter.get(x); return !!l && arProblem(l.vad) && `${l.niva}, ${l.vad}, ${l.titel}` === nyckel; });
      const tva = ramar.find((x) => x.rubrik === `Två lösningar: ${nyckel}`);
      const ruta = ramar.find((x) => LOSNINGSRUTA.test(x.rubrik));
      if (!pram || !tva || !ruta) throw new Error(`${ram.rubrik}: lösningsförslaget behöver problemets ram, ramen Två lösningar och ramen "Lösningsförslagen: <rubrik>" (src/lib/problemform.ts).`);
      const bilderna = losningsbilder(tva.rubrik);
      const par = textparAv(tva);
      if (bilderna.length !== 2 || !par) throw new Error(`${ram.rubrik}: bladet Två lösningar har ${bilderna.length} bilder och ska ha två, med frågorna under (src/lib/problemform.ts).`);
      const l = texter.get(pram)!;
      const falt = (del: string) => ram.delar.find((x) => x.rubrik === del)?.falt ?? [];
      const svar = (namn: string) => falt('Svaret').find((f) => f.rubrik === namn)?.text ?? '';
      const losn = falt('Lösningarna');
      if (losn.length < 2 || !svar('Svaret')) throw new Error(`${ram.rubrik}: lösningsförslaget har delarna Svaret (Svaret, Kontroll, Idén) och Lösningarna (Lösning A och B, och gärna C och Om lösning C), som metodriggens TILL-SAJTEN 2026-10-18 säger.`);
      const rader = (t: string) => String(t).split('\n').filter((r) => r.trim());
      return {
        titel: l.titel, niva: l.niva, nivaNr: l.nivaNr, vad: l.vad, tagg: pram.innehallstagg ?? '', kalla: ram.text?.[0] ?? '',
        problem: { stycken: l.stycken, fragor: l.fragor.map((f) => f.replace(/^\d+\.\s*/, '')), bild: paBordetVid(bilder, { ram: pram.rubrik }).find((x) => !/^Blad: /.test(x.bild.rubrik)) },
        svaret: svar('Svaret'), kontroll: svar('Kontroll'), iden: svar('Idén'),
        losningar: [0, 1].map((k) => ({ namn: losn[k].rubrik, text: losn[k].text, bild: bilderna[k] })),
        ...(losn[2] ? { c: { namn: losn[2].rubrik, rader: rader(losn[2].text), larare: rader(losn[3]?.text ?? '') } } : {}),
        fragor: par.fragor,
        ruta: { rubrik: ruta.rubrik.replace(LOSNINGSRUTA, ''), punkter: (ruta.delar[0]?.falt ?? []).map((f) => ({ namn: f.rubrik, text: f.text })) },
      };
    },
  };
}

/** Lösningsförslaget som data för HTML-bladet (src/lib/losningsforslag.ts): bild ger varje bilds adress och
 *  textalternativ, och lösningarnas bilder får Word-bladets storlek. */
export function losningsforslagVy(lf: Losningsforslag, bild: (b: PaBordet) => LfBild): LosningsforslagVy {
  return {
    titel: lf.titel, niva: lf.niva, vad: lf.vad, tagg: lf.tagg, kalla: lf.kalla,
    problem: { stycken: lf.problem.stycken, fragor: lf.problem.fragor, ...(lf.problem.bild ? { bild: bild(lf.problem.bild) } : {}) },
    svaret: lf.svaret, kontroll: lf.kontroll, iden: lf.iden,
    losningar: lf.losningar.map((l) => ({ namn: l.namn, text: l.text, bild: bild(l.bild) })),
    ...(lf.c ? { c: lf.c } : {}),
    fragor: lf.fragor, ruta: lf.ruta,
    skala: losningsforslagMatt(lf).skala,
  };
}

/** Raden Till läraren under bladet Två lösningar: ramens rutor, som på problemets sida. */
export const losningarnasNot = (ram: { delar: { rubrik: string; falt: { rubrik: string; text: string }[] }[] }) =>
  ram.delar.map((del) => `${del.rubrik} · ${del.falt.map((f) => `${f.rubrik}: ${f.text}`).join(' ')}`).join(' ');
/** Nivån och vad ur "Två lösningar: Bas, problem 1, Äpplena", till knappen i sidfoten. */
export const losningarnasNiva = (rubrik: string) => { const m = rubrik.match(/^Två lösningar: ([^,]+), ([^,]+), (.+)$/); return m ? { niva: m[1], vad: m[2], titel: m[3] } : undefined; };
