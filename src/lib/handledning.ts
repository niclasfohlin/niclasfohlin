// Lärarhandledningen till ett tema (K-427, K-434; Faktatextsamtal i grupp, metodriggens leverans 2026-10-18 natt). Niclas
// 2026-10-18: "Varje tema bör ha en lärarhandledning (likt lösningsförslag) för faktatexter. Max 2 sidor och stöd från
// hela metoden ... hur man kan arbeta med temat", och samma natt: "Temat får sin lärarhandledning". Två A4 för den som
// vill läsa temats faktatexter med hela klassen.
//
// Sidan 1 är den gemensamma, ur ramen "Lärarhandledningarna: <rubrik>", som står en gång i metoden och ritas på varje
// handledning men aldrig för sig, som rutan på lösningsförslagen. Dess rubrik efter kolonet och dess text är till den som
// läser metodens fil och står inte på sidan. Sidan 2 är temats egen, ur ramen "Lärarhandledning: <nivå>, <tema>": temats
// ingress (ramens text, som står på sidan 1 under temat) och en del per text, "1 Vattenplaneten: Tankekartan", med
// frågan, orden, modellen och vad ett svar har med. Temat är ramens fält tema, annars det efter kommat.
//
// Word (lararhandledningSida i metoddocx.ts, ett till ett med riggens build-docx.js), temats sida och metodens sida i
// utskriften (Lararhandledning.astro) ritar den ur samma form. Banken (src/lib/bank.ts) räknar ramarna till sig: de står
// varken bland ramarna eller i materialets lista, och handledningen står först på sin nivå. Inga Node-beroenden.
import type { MetodData } from './metod';
import { slugAv } from './standard/index.js';

type Ram = NonNullable<MetodData['ramar']>['ramar'][number];
export interface HandledningFalt { rubrik: string; text: string; kursiv?: boolean }
export interface HandledningDel { rubrik: string; falt: HandledningFalt[] }
export interface Lararhandledning {
  /** Ramens plats bland metodens ramar, nivån och temat. */
  ri: number; niva: string; tema: string;
  /** Temats ingress: ramens text. */
  ingress: string[];
  /** Sidan 1, den gemensamma: delarna ur ramen "Lärarhandledningarna: <rubrik>". */
  gemensam: HandledningDel[];
  /** Sidan 2: en del per text, med numret, titeln och modellen ur delens rubrik ("1 Vattenplaneten: Tankekartan"). */
  texter: { nr?: string; titel: string; modell?: string; falt: HandledningFalt[] }[];
}

export const HANDLEDNING = /^Lärarhandledning: ([^,]+), (.+)$/;
export const HANDLEDNINGARNA = /^Lärarhandledningarna: /;
export const arHandledning = (ram: { rubrik: string }) => HANDLEDNING.test(ram.rubrik);
export const arHandledningarna = (ram: { rubrik: string }) => HANDLEDNINGARNA.test(ram.rubrik);

const falten = (falt: { rubrik: string; text?: string; kursiv?: boolean }[]): HandledningFalt[] => falt.map((f) => ({ rubrik: f.rubrik, text: f.text ?? '', ...(f.kursiv ? { kursiv: true } : {}) }));

/** Metodens lärarhandledningar efter ramens plats, i ramarnas ordning. Stoppar bygget när en handledning saknar den
 *  gemensamma sidan, när två handledningar har samma tema, och när fältet tema säger något annat än rubriken. */
export function lararhandledningar(ramar: Ram[]): Map<number, Lararhandledning> {
  const ut = new Map<number, Lararhandledning>();
  const g = ramar.find(arHandledningarna);
  const teman = new Set<string>();
  ramar.forEach((ram, ri) => {
    const m = ram.rubrik.match(HANDLEDNING);
    if (!m) return;
    if (!g) throw new Error(`${ram.rubrik}: lärarhandledningen behöver ramen "Lärarhandledningarna: <rubrik>", den gemensamma sidan som står först i varje handledning (src/lib/handledning.ts).`);
    const tema = ram.tema ?? m[2];
    if (tema !== m[2]) throw new Error(`${ram.rubrik}: fältet tema är "${tema}", men rubriken säger "${m[2]}" (src/lib/handledning.ts).`);
    if (teman.has(tema)) throw new Error(`${ram.rubrik}: temat ${tema} har redan en lärarhandledning (src/lib/handledning.ts).`);
    teman.add(tema);
    ut.set(ri, {
      ri, niva: m[1], tema, ingress: ram.text ?? [],
      gemensam: g.delar.map((d) => ({ rubrik: d.rubrik, falt: falten(d.falt) })),
      texter: ram.delar.map((d) => {
        const x = d.rubrik.match(/^(\d+)\s+([^:]+?)(?::\s*(.+))?$/);
        return { ...(x ? { nr: x[1] } : {}), titel: x ? x[2] : d.rubrik, ...(x?.[3] ? { modell: x[3] } : {}), falt: falten(d.falt) };
      }),
    });
  });
  return ut;
}

/** Handledningen till ett tema. */
export const handledningenTill = (ramar: Ram[], tema: string) => [...lararhandledningar(ramar).values()].find((h) => h.tema === tema);

/** Antalet texter i ord, som etiketten på sidan 2 säger dem: "VATTEN · FEM TEXTER". */
const TAL = ['', 'en', 'två', 'tre', 'fyra', 'fem', 'sex', 'sju', 'åtta', 'nio', 'tio'];
export const texternasEtikett = (h: Lararhandledning) => `${h.tema} · ${TAL[h.texter.length] ?? h.texter.length} ${h.texter.length === 1 ? 'text' : 'texter'}`.toLocaleUpperCase('sv');
/** Etiketten på sidan 1: "BAS · LÄRARHANDLEDNING". */
export const nivansEtikett = (h: Lararhandledning) => `${h.niva} · Lärarhandledning`.toLocaleUpperCase('sv');
/** Handledningens fil, Word och pdf: <id>-lararhandledning-<tema>. */
export const handledningensFil = (id: string, h: Pick<Lararhandledning, 'tema'>) => `${id}-lararhandledning-${slugAv(h.tema)}`;
