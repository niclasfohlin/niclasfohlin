// Lär dig metoden (K-628): sidan /metoder/<id>/lar-dig för en undervisningsmetod med plan.skattningar. Här läses det sidan
// visar ur metodens fil, som JSON till sidans skript (src/scripts/lardig.ts), och bygget stannar på en metod vars plan inte
// går att räkna. Motorn och allt som räknar står i standarden (src/lib/standard/plan.js, under Lär dig metoden), och
// formen och faserna i underlag/prov/metoder/PLANERA-LAGRET.md och riggens standard för undervisningsmetoder, avsnitt 16.
import { metodplan, rentText } from './standard/index.js';
import { metodensAdress, type Um } from './undervisningsmetod';
import { metodensFiler } from './undervisningsmetodfiler';

/** Planens data, som sidan bär som JSON och skriptet räknar med. */
export interface LarDigData {
  id: string;
  titel: string;
  /** Metodens sida, som läsvägen och knapparna leder till. */
  sida: string;
  uppdaterad: string;
  tid: string;
  period: string;
  /** Stegen: `vidare` säger när läraren går vidare, och `fraga` är samma regel som en fråga till Gick det? vid veckans slut. */
  progression: { text?: string; rader: { vecka: string; rubrik: string; fokus?: string; eleverna?: string; roll?: string; vidare?: string; fraga?: string }[] };
  uppfoljning: { text?: string; rader: { id?: string; nar: string; tid: string; vad: string }[] };
  skattningar: { namn: string; vem: 'lararen'; rad: string; text?: string; skala: { fran: number; till: number }; regler: { om: string; rad: string }[] }[];
  /** Planens rader om enskilda lektioner, som Första lektionen, med metodens text. */
  passen: { nar: string; kort?: string; text: string }[];
  fore: string[];
  utvardering: string[];
  rutiner: { namn: string; vecka: number; vad: string; steg: string[]; forsta?: string }[];
  checklista: { rubrik: string; punkter: string[] };
  material: string[];
  film?: { rubrik: string; ingress?: string };
  forbered: { text?: string; fragor: string[] };
  reflektera: string[];
  /** Kärnans fyra: namnet, det som står kvar (förslagen till lärarens mål) och raden att kryssa i dåtid (stödet vid Hur säker). */
  karna: { namn: string; kvar: string; kryss?: string }[];
  /** Så syns lärandet i klassen: stödet vid Hur väl fungerar den. */
  larandet: { rubrik: string; rader: string[] };
  hallFast: { rubrik: string; rader: { sak: string; text: string }[] };
  lasMer: { titel: string; upphov?: string; ar?: number; adress?: string; text: string; slag?: string }[];
  /** Läsvägen i metoden, med ankarna på metodens sida. */
  lasvag: { namn: string; adress: string }[];
  /** Filernas adresser när filen finns, och annars stället på metodens sida där materialet står. */
  filer: { lektionskort: { adress: string; fil: boolean }; planeringsmall: { adress: string; fil: boolean }; materialet: { adress: string; fil: boolean }; observation: { adress: string; fil: boolean } };
}

// Läsvägen före första lektionen (PLANERA-LAGRET.md under Lärarens väg, och K-628): avsnitten på metodens sida, med ankarna
// som metodens sida sätter.
const LASVAGEN = [
  { namn: 'Metoden i korthet', ankare: 'i-korthet' },
  { namn: 'Lektionen', ankare: 'lektionen' },
  { namn: 'Huvudexemplet', ankare: 'huvudexemplet' },
  { namn: 'Före första lektionen', ankare: 'fore-forsta' },
  { namn: 'Första lektionen', ankare: 'forsta-lektionen' },
];

const strang = (x: unknown) => (typeof x === 'string' ? x : '');
const lista = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : strang(d).slice(0, 10));

/** Har metoden Lär dig metoden? En undervisningsmetod med lärarens skattningar i plan.skattningar. */
export const harLarDig = (d: Um) => lista(d.plan?.skattningar).some((x) => (x as { vem?: string })?.vem === 'lararen');

/** Planens data ur metodens fil. */
export function larDigData(id: string, d: Um): LarDigData {
  const sida = metodensAdress(id);
  const kallor = new Map(lista(d.kallor).map((k) => [strang((k as { id?: string }).id), k as { titel?: string; text?: string; adress?: string }]));
  const filer = metodensFiler(id);
  const fil = (slag: 'lektionskort' | 'planeringsmall' | 'materialet' | 'observation', ankare: string) => { const f = filer[slag]; return f?.pdf || f?.docx ? { adress: (f.pdf ?? f.docx)!, fil: true } : { adress: `${sida}#${ankare}`, fil: false }; };
  return {
    id, titel: d.titel, sida, uppdaterad: iso(d.uppdaterad), tid: d.tid, period: d.period,
    progression: { text: strang(d.progression?.text) || undefined, rader: lista(d.progression?.rader).map((r) => { const x = r as Record<string, unknown>; return { vecka: String(x.vecka ?? ''), rubrik: strang(x.rubrik), fokus: strang(x.fokus) || undefined, eleverna: strang(x.eleverna) || undefined, roll: strang(x.roll) || undefined, vidare: strang(x.vidare) || undefined, fraga: strang(x.fraga) || undefined }; }) },
    uppfoljning: { text: strang(d.uppfoljning?.text) || undefined, rader: lista(d.uppfoljning?.rader).map((r) => { const x = r as Record<string, unknown>; return { ...(x.id ? { id: String(x.id) } : {}), nar: strang(x.nar), tid: strang(x.tid), vad: strang(x.vad) }; }) },
    skattningar: lista(d.plan?.skattningar).filter((x) => (x as { vem?: string })?.vem === 'lararen').map((s) => { const x = s as Record<string, any>; return { namn: strang(x.namn), vem: 'lararen' as const, rad: strang(x.rad), ...(x.text ? { text: strang(x.text) } : {}), skala: { fran: Number(x.skala?.fran), till: Number(x.skala?.till) }, regler: lista(x.regler).map((r) => ({ om: strang((r as { om?: string }).om), rad: strang((r as { rad?: string }).rad) })) }; }),
    passen: lista(d.plan?.passen).map((p) => { const x = p as Record<string, unknown>; return { nar: strang(x.nar), ...(x.kort ? { kort: strang(x.kort) } : {}), text: strang(x.text) }; }),
    fore: lista(d.plan?.fore).map(strang).filter(Boolean),
    utvardering: lista(d.plan?.utvardering).map(strang).filter(Boolean),
    rutiner: lista(d.rutiner?.rader).map((r) => { const x = r as Record<string, unknown>; return { namn: strang(x.namn), vecka: Number(x.vecka), vad: strang(x.vad), steg: lista(x.steg).map(strang).filter(Boolean), ...(x.forsta ? { forsta: strang(x.forsta) } : {}) }; }),
    checklista: { rubrik: strang(d.checklista?.rubrik) || 'Före första lektionen', punkter: lista(d.checklista?.punkter).map(strang).filter(Boolean) },
    material: lista(d.material).map(strang).filter(Boolean),
    ...(d.film ? { film: { rubrik: strang(d.film.rubrik) || 'Filmen', ...(d.film.ingress ? { ingress: strang(d.film.ingress) } : {}) } } : {}),
    forbered: { text: strang(d.uppdrag?.forbered?.text) || undefined, fragor: lista(d.uppdrag?.forbered?.fragor).map(strang).filter(Boolean) },
    reflektera: lista(d.uppdrag?.reflektera).map(strang).filter(Boolean),
    karna: lista(d.karna?.komponenter).map((k) => { const x = k as Record<string, unknown>; return { namn: strang(x.namn), kvar: strang(x.kvar), ...(x.kryss ? { kryss: strang(x.kryss) } : {}) }; }).filter((k) => k.namn && k.kvar),
    larandet: { rubrik: strang(d.larandet?.rubrik) || 'Så syns lärandet i klassen', rader: lista(d.larandet?.omraden).map((x) => strang((x as { syns?: string }).syns)).filter(Boolean) },
    hallFast: { rubrik: strang(d.hallFast?.rubrik) || 'Fem saker att hålla fast vid', rader: lista(d.hallFast?.rader).map((r) => ({ sak: strang((r as { sak?: string }).sak), text: strang((r as { text?: string }).text) })).filter((r) => r.sak) },
    lasMer: lista(d.lasMer).map((l) => {
      const x = l as Record<string, any>;
      const k = x.kalla ? kallor.get(strang(x.kalla)) : undefined;
      // En post ur referenslistan har källans titel och adress, och upphovet är referensens namn före året.
      const upphov = x.upphov ? strang(x.upphov) : k?.text ? rentText(strang(k.text).split(/\s\(\d{4}/)[0], 120) : undefined;
      return { titel: strang(x.titel) || strang(k?.titel), ...(upphov ? { upphov } : {}), ...(x.ar ? { ar: Number(x.ar) } : {}), ...(x.adress || k?.adress ? { adress: strang(x.adress) || strang(k?.adress) } : {}), text: strang(x.text), ...(x.slag ? { slag: strang(x.slag) } : {}) };
    }).filter((l) => l.titel),
    lasvag: LASVAGEN.map((x) => ({ namn: x.namn, adress: `${sida}#${x.ankare}` })),
    filer: { lektionskort: fil('lektionskort', 'materialet'), planeringsmall: fil('planeringsmall', 'planeringsmallen'), materialet: fil('materialet', 'materialet-for-klassen'), observation: fil('observation', 'observationsmallen') },
  };
}

/**
 * Felen som stoppar bygget: en plan som motorn inte kan räkna, och det Lär dig metoden behöver i metoden, stegen med det
 * eleverna lär sig, lärarens drag och när läraren går vidare, och lärarens skattningar med en skala.
 */
export function larDigFel(data: LarDigData): string[] {
  const { fel } = metodplan({ tid: data.tid, period: data.period, progression: data.progression, uppfoljning: data.uppfoljning, plan: { passen: data.passen, skattningar: data.skattningar } });
  const egna: string[] = [];
  if (!data.progression.rader.length) egna.push('Metoden har ingen progression, och Lär dig metoden tar ett steg i taget ur den.');
  data.progression.rader.forEach((r, i) => { if (!r.rubrik || !r.eleverna || !r.roll) egna.push(`Progressionens rad "${r.vecka}" behöver rubrik, eleverna och roll.`); if (!r.vidare && i < data.progression.rader.length - 1) egna.push(`Progressionens rad "${r.vecka}" behöver vidare, som blir frågan Gick det?.`); });
  if (!data.skattningar.length) egna.push('Metoden har inga skattningar med vem: lararen i plan.skattningar.');
  return [...fel, ...egna].map((x) => `${data.titel}: ${x}`);
}
