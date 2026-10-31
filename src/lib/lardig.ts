// Lär dig metoden (K-628): sidan /metoder/<id>/lar-dig för en undervisningsmetod med plan.skattningar. Här läses det sidan
// visar ur metodens fil, som JSON till sidans skript (src/scripts/lardig.ts), och bygget stannar på en metod vars plan inte
// går att räkna. Motorn och allt som räknar står i standarden (src/lib/standard/plan.js, under Lär dig metoden), och
// formen och faserna i underlag/prov/metoder/PLANERA-LAGRET.md och riggens standard för undervisningsmetoder, avsnitt 16.
import { dagAv, forstaHelaLektionen, forstaLektionensForm, forstaVeckansNamn, lasvagen, planensStart, rentText, somLista } from './standard/index.js';
import { metodensAdress, undervisningsmetodensSaker, type Um } from './undervisningsmetod';
import { metodensFiler } from './undervisningsmetodfiler';

/** Planens data, som sidan bär som JSON och skriptet räknar med. */
export interface LarDigData {
  id: string;
  titel: string;
  /** Metodens sida, som läsvägen och knapparna leder till. */
  sida: string;
  uppdaterad: string;
  /** Namnet på första lektionen efter metodens slag, som Den första hela lektionen i strukturerna (forstaLektionensForm). */
  forstaLektionen: string;
  /** Rutan med planens rad om första lektionen i veckan med den: Första lektionen, och i en metod där första hela lektionen kommer senare, som strukturerna, veckans rad (forstaVeckansNamn). */
  forstaVeckan: string;
  /** Dagen planen börjar på efter metodens slag, Första lektionen med eleverna eller i strukturerna Första samarbetet med eleverna (planensStart). */
  startNamn: string;
  /** Den första hela lektionen när den kommer efter vecka 1, med metodens mening och veckan (forstaHelaLektionen). */
  forstaHela?: { namn: string; text: string; vecka: number };
  tid: string;
  period: string;
  /** Stegen: `vidare` säger när läraren går vidare, och `fraga` är samma regel som en fråga till Gick det? vid veckans slut. */
  progression: { text?: string; rader: { vecka: string; rubrik: string; led?: string; fokus?: string; eleverna?: string; roll?: string; vidare?: string; fraga?: string }[] };
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
  /** Kärnans komponenter: namnet, det som står kvar (förslagen till lärarens mål) och raden att kryssa i dåtid (stödet vid Hur säker). */
  karna: { namn: string; kvar: string; kryss?: string }[];
  /** Så syns lärandet i klassen: stödet vid Hur väl fungerar den. */
  larandet: { rubrik: string; rader: string[] };
  hallFast: { rubrik: string; rader: { sak: string; text: string }[] };
  lasMer: { titel: string; upphov?: string; ar?: number; adress?: string; text: string; slag?: string }[];
  /** Metodens saker som en text kan nämna, med adressen: bladen och affischerna i Materialet för klassen, lektionskortet och mallarna. Checklistan länkar dem (sakdelar i standarden). */
  saker: { namn: string; versal?: boolean; adress: string }[];
  /** Läsvägen i metoden, med ankarna på metodens sida. */
  lasvag: { delar: { namn: string; adress: string }[]; minuter: number };
  /** Filernas adresser när filen finns, och annars stället på metodens sida där materialet står. */
  filer: { lektionskort: { adress: string; fil: boolean }; planeringsmall: { adress: string; fil: boolean }; materialet: { adress: string; fil: boolean }; observation: { adress: string; fil: boolean } };
  /** Metodens När det glider och stödet för elever som behöver mer, när metoden har dem, som Mitt i hänvisar till (K-631). */
  glider?: string;
  stod?: { rubrik: string; adress: string };
}


const strang = (x: unknown) => (typeof x === 'string' ? x : '');

/** Har metoden Lär dig metoden? En undervisningsmetod med lärarens skattningar i plan.skattningar. */
export const harLarDig = (d: Um) => somLista(d.plan?.skattningar).some((x) => (x as { vem?: string })?.vem === 'lararen');

/**
 * Metodens sidor utöver metodens egen, Lär dig metoden och lathunden, när metoden har dem: namnet, adressen, klassen på
 * bankens kort och det som följer på länken i mejlet om en ny metod, en rot för bankens kort (src/pages/metoder/index.astro)
 * och mejlet (src/pages/nytt.json.ts), som en metod i Stödundervisning har sina centrala saker där. Orden i mejlet kommer ur
 * sidornas ingresser (LarDig.astro och src/pages/metoder/[id]/lathund.astro).
 */
export const metodensSidor = (id: string, d: Um) => [
  ...(harLarDig(d) ? [{ text: 'Lär dig metoden', href: `${metodensAdress(id)}/lar-dig`, klass: 'central-lank', mejl: 'ett steg i taget, där klasserna varje vecka övar en rutin och du ett drag, och du skattar hur det gick' }] : []),
  ...(d.lathund ? [{ text: 'Lathund', href: `${metodensAdress(id)}/lathund`, klass: 'lathund-lank', mejl: 'fyra sidor att ha bredvid sig när du börjar, med metoden, vägen till måndag, planeringen av en lektion och de första veckorna' }] : []),
];

/** Planens data ur metodens fil. */
export function larDigData(id: string, d: Um): LarDigData {
  const sida = metodensAdress(id);
  const kallor = new Map(somLista(d.kallor).map((k) => [strang((k as { id?: string }).id), k as { titel?: string; text?: string; adress?: string }]));
  const filer = metodensFiler(id);
  const fil = (slag: 'lektionskort' | 'planeringsmall' | 'materialet' | 'observation', ankare: string) => { const f = filer[slag]; return f?.pdf || f?.docx ? { adress: (f.pdf ?? f.docx)!, fil: true } : { adress: `${sida}#${ankare}`, fil: false }; };
  return {
    id, titel: d.titel, sida, uppdaterad: dagAv(d.uppdaterad), forstaLektionen: forstaLektionensForm(d).namn, forstaVeckan: forstaVeckansNamn(d), startNamn: planensStart(d), ...(forstaHelaLektionen(d) ? { forstaHela: forstaHelaLektionen(d)! } : {}), tid: d.tid, period: d.period,
    progression: { text: strang(d.progression?.text) || undefined, rader: somLista(d.progression?.rader).map((r) => { const x = r as Record<string, unknown>; return { vecka: String(x.vecka ?? ''), rubrik: strang(x.rubrik), ...(x.led ? { led: strang(x.led) } : {}), fokus: strang(x.fokus) || undefined, eleverna: strang(x.eleverna) || undefined, roll: strang(x.roll) || undefined, vidare: strang(x.vidare) || undefined, fraga: strang(x.fraga) || undefined }; }) },
    uppfoljning: { text: strang(d.uppfoljning?.text) || undefined, rader: somLista(d.uppfoljning?.rader).map((r) => { const x = r as Record<string, unknown>; return { ...(x.id ? { id: String(x.id) } : {}), nar: strang(x.nar), tid: strang(x.tid), vad: strang(x.vad) }; }) },
    skattningar: somLista(d.plan?.skattningar).filter((x) => (x as { vem?: string })?.vem === 'lararen').map((s) => { const x = s as Record<string, any>; return { namn: strang(x.namn), vem: 'lararen' as const, rad: strang(x.rad), ...(x.text ? { text: strang(x.text) } : {}), skala: { fran: Number(x.skala?.fran), till: Number(x.skala?.till) }, regler: somLista(x.regler).map((r) => ({ om: strang((r as { om?: string }).om), rad: strang((r as { rad?: string }).rad) })) }; }),
    passen: somLista(d.plan?.passen).map((p) => { const x = p as Record<string, unknown>; return { nar: strang(x.nar), ...(x.kort ? { kort: strang(x.kort) } : {}), text: strang(x.text) }; }),
    fore: somLista(d.plan?.fore).map(strang).filter(Boolean),
    utvardering: somLista(d.plan?.utvardering).map(strang).filter(Boolean),
    rutiner: somLista(d.rutiner?.rader).map((r) => { const x = r as Record<string, unknown>; return { namn: strang(x.namn), vecka: Number(x.vecka), vad: strang(x.vad), steg: somLista(x.steg).map(strang).filter(Boolean), ...(x.forsta ? { forsta: strang(x.forsta) } : {}) }; }),
    checklista: { rubrik: strang(d.checklista?.rubrik) || 'Före första lektionen', punkter: somLista(d.checklista?.punkter).map(strang).filter(Boolean) },
    material: somLista(d.material).map(strang).filter(Boolean),
    ...(d.film ? { film: { rubrik: strang(d.film.rubrik) || 'Filmen', ...(d.film.ingress ? { ingress: strang(d.film.ingress) } : {}) } } : {}),
    forbered: { text: strang(d.uppdrag?.forbered?.text) || undefined, fragor: somLista(d.uppdrag?.forbered?.fragor).map(strang).filter(Boolean) },
    reflektera: somLista(d.uppdrag?.reflektera).map(strang).filter(Boolean),
    karna: somLista(d.karna?.komponenter).map((k) => { const x = k as Record<string, unknown>; return { namn: strang(x.namn), kvar: strang(x.kvar), ...(x.kryss ? { kryss: strang(x.kryss) } : {}) }; }).filter((k) => k.namn && k.kvar),
    larandet: { rubrik: strang(d.larandet?.rubrik) || 'Så syns lärandet i klassen', rader: somLista(d.larandet?.omraden).map((x) => strang((x as { syns?: string }).syns)).filter(Boolean) },
    hallFast: { rubrik: strang(d.hallFast?.rubrik) || 'Fem saker att hålla fast vid', rader: somLista(d.hallFast?.rader).map((r) => ({ sak: strang((r as { sak?: string }).sak), text: strang((r as { text?: string }).text) })).filter((r) => r.sak) },
    lasMer: somLista(d.lasMer).map((l) => {
      const x = l as Record<string, any>;
      const k = x.kalla ? kallor.get(strang(x.kalla)) : undefined;
      // En post ur referenslistan har källans titel och adress, och upphovet är referensens namn före året.
      const upphov = x.upphov ? strang(x.upphov) : k?.text ? rentText(strang(k.text).split(/\s\(\d{4}/)[0], 120) : undefined;
      return { titel: strang(x.titel) || strang(k?.titel), ...(upphov ? { upphov } : {}), ...(x.ar ? { ar: Number(x.ar) } : {}), ...(x.adress || k?.adress ? { adress: strang(x.adress) || strang(k?.adress) } : {}), text: strang(x.text), ...(x.slag ? { slag: strang(x.slag) } : {}) };
    }).filter((l) => l.titel),
    // Metodens saker som på metodens sida och i lathunden (undervisningsmetodensSaker), med samma ankare, så att samma ord leder
    // till samma sak (granskningen rot-3, fynd 6, och den kalla läsaren 2026-10-30, nr 12).
    saker: undervisningsmetodensSaker(d, id, { lektionskort: !!filer.lektionskort }),
    lasvag: (() => { const l = lasvagen(d); return { delar: l.delar.map((x) => ({ namn: x.namn, adress: `${sida}#${x.ankare}` })), minuter: l.minuter }; })(),
    filer: { lektionskort: fil('lektionskort', 'materialet'), planeringsmall: fil('planeringsmall', 'planeringsmallen'), materialet: fil('materialet', 'materialet-for-klassen'), observation: fil('observation', 'observationsmallen') },
    // När det glider står på metodens sida när metoden har det svåraste, fallgroparna eller det du håller fast vid, och stödet
    // när metoden har det (src/components/Undervisningsmetod.astro).
    ...(d.hinder || somLista(d.fallgropar?.rader).length || d.hallFast ? { glider: `${sida}#nar-det-glider` } : {}),
    ...(d.stod?.rubrik ? { stod: { rubrik: strang(d.stod.rubrik), adress: `${sida}#mer-stod` } } : {}),
  };
}

