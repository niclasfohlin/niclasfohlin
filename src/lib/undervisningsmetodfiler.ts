// En undervisningsmetods filer (K-621): dokumenten som metodriggen bygger ur metodens fil, Word och pdf, och bilderna av
// bladen, i public/metoder/ med fasta namn. scripts/metoderfiler.mjs tar in dem ur riggens out/<id>/ och prövar att de är
// byggda ur samma metodfil som sajten visar (filer.json). Sidan visar en knapp bara för en fil som finns. Filernas namn står
// i src/lib/undervisningsmetod.ts (UM_NAMN), där metodens saker också läser dem och som sidans skript kan läsa utan filerna.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { liten, slugAv } from './standard/index.js';
import { UM_NAMN, UM_SLAG, umRad, umStam, type Um, type UmSlag } from './undervisningsmetod';
import { parse } from 'yaml';
import { bankAv, enhetAdress, nivaFarger } from './bank';
import { metodensCentrala } from './centrala';
import { medTemana } from './faktatemaihop.js';
import { matteproblemen, type Matteproblem } from './matteproblem';

const bankerna = new Map<string, ReturnType<typeof bankAv>>();
/** Banken i en metod i Stödundervisning, med databasens teman som textsidorna (medDatabasen), läst direkt ur filerna eftersom
 *  sakerna räknas utan samlingarna: faktatexterna i temana hade annars fallit bort (Codex 2026-11-07). */
function metodensBank(metod: string) {
  const fil = join(process.cwd(), 'src', 'content', 'stodundervisning', `${metod}.yaml`);
  if (!existsSync(fil)) return null;
  const mapp = join(process.cwd(), 'src', 'content', 'faktateman');
  const teman = existsSync(mapp) ? readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => ({ id: f.replace(/\.yaml$/, ''), data: parse(readFileSync(join(mapp, f), 'utf8')) })).filter((t) => t.data.metod === metod) : [];
  return bankAv(medTemana(parse(readFileSync(fil, 'utf8')), teman));
}
/**
 * Bankens texter som metoden pekar ut, ur metoderna vars bank den visar med fältet centrala: titeln med sitt nummer, som
 * Tackfisken (20) och Skrapet på dörren (Mellan, text 2), och titeln i en tabellcell bredvid nivån, som Någon har varit här
 * med Mellan, text 15 i Reciprok undervisning (STIL.md under Hänvisningar, raden En sak i metoden). Bara titeln räcker inte:
 * bankernas titlar är också vanliga ord, som Lappen, Skolan och Nästan, och "Nästan alla kan" är ingen text. En titel med
 * flera ord länkas också utan numret.
 */
function bankensTexter(d: Um): { namn: string; former: string[]; adress: string }[] {
  const text = JSON.stringify(d);
  const ut: { namn: string; former: string[]; adress: string }[] = [];
  for (const c of metodensCentrala(d)) {
    if (!c.metod) continue;
    if (!bankerna.has(c.metod)) bankerna.set(c.metod, metodensBank(c.metod));
    for (const e of bankerna.get(c.metod)?.enheter ?? []) {
      const titel = e.l.titel;
      if (!titel || e.nr === undefined) continue;
      const former = [`${titel} (${e.nr})`, `${titel} (${e.l.niva}, text ${e.nr})`].filter((f) => text.includes(f));
      const iCell = text.includes(`"${titel}","${e.l.niva}, text ${e.nr}"`);
      if (former.length || iCell) ut.push({ namn: titel, former: [...former, ...(titel.includes(' ') ? [titel] : [])], adress: enhetAdress(c.metod, e) });
    }
  }
  // Ett problem som metoden pekar ut med metodens eller verktygets namn, nivån och numret, som ”Problemlösning i grupp, Bas,
  // problem 1” och ”Ta fram ett matteproblem, Medel, problem 14” (Tänkande klassrum 2026-11-14, K-761): problemets sida i
  // metoden, eller problemet i verktyget när det bara står där.
  const v = metodensProblemverktyg(d);
  for (const p of v?.alla ?? []) {
    const iMetoden = `${v!.titel}, ${p.niva}, ${p.l.vad}`;
    if (p.enhet && text.includes(iMetoden)) ut.push({ namn: iMetoden, former: [iMetoden], adress: enhetAdress(v!.c.metod!, p.enhet) });
    const iVerktyget = `${v!.c.namn}, ${p.niva}, ${p.l.vad}`;
    if (text.includes(iVerktyget)) ut.push({ namn: iVerktyget, former: [iVerktyget], adress: `${v!.c.adress}#${p.id}` });
  }
  return ut;
}

type Problemen = { alla: Matteproblem[]; nivaer: { namn: string; farg: string }[]; titel: string };
const problemen = new Map<string, Problemen | null>();
/** Problemen i ett verktyg som metoden visar med fältet centrala, när verktygets bank är problem, som Ta fram ett
 *  matteproblem: metodens bank och databasens poster i src/content/matteproblem/, läst direkt ur filerna som bankens
 *  texter, med nivåerna och deras färger och metodens titel. */
function verktygetsProblem(metod: string): Problemen | null {
  if (!problemen.has(metod)) {
    const fil = join(process.cwd(), 'src', 'content', 'stodundervisning', `${metod}.yaml`);
    const data = existsSync(fil) ? parse(readFileSync(fil, 'utf8')) : null;
    const bank = data ? bankAv(data) : null;
    const mapp = join(process.cwd(), 'src', 'content', 'matteproblem');
    const databas = bank?.ord.slug === 'problem' && existsSync(mapp) ? readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => ({ id: f.replace(/\.yaml$/, ''), data: parse(readFileSync(join(mapp, f), 'utf8')) })) : [];
    // Nivåernas färger som på bankens sidor (nivaFarger i src/lib/bank.ts), utan #, som nivåskylten tar dem (src/lib/nivaer.ts).
    const farger = bank ? nivaFarger(data, bank) : {};
    problemen.set(metod, bank?.ord.slug === 'problem' ? { alla: matteproblemen({ id: metod, data }, databas), nivaer: bank.nivaer.map((n) => ({ namn: n.namn, farg: farger[n.namn].replace(/^#/, '').toUpperCase() })), titel: data.titel } : null);
  }
  return problemen.get(metod)!;
}
/** Verktyget som metoden visar och vars bank är problem, med dess problem. */
function metodensProblemverktyg(d: Um) {
  for (const c of metodensCentrala(d)) {
    const p = c.metod ? verktygetsProblem(c.metod) : null;
    if (p) return { c, ...p };
  }
  return null;
}

/**
 * Bladen i en bank (K-761; Niclas 2026-11-14 om Tänkande klassrums femton fyrfältare: "Behöver ju enkelt kunna läsa och
 * trycka på problemen. Ha dem som små bildkort att trycka på? Integrera den i verktyget problem på något smidigt sätt?"):
 * blad i Materialet för klassen som heter "<blad>, <nivå>, <titel>", där nivån och titeln är ett problem i verktyget som
 * metoden visar med fältet centrala, som "Fyrfältaren, Medel, Borden" och problemet Borden på Medel i Ta fram ett
 * matteproblem. Bladet är problemet i metodens form, och minst två med samma namn före nivån är en bank. Varje blad har en
 * egen sida, /metoder/<id>/<nivå>-<titel> (src/pages/metoder/[id]/[blad].astro), som korten leder till, och problemet i
 * verktyget leder tillbaka. Allt läses ur metodens namn och verktygets problem, så att nästa metod med en sådan bank får
 * samma sida.
 */
export interface Bankblad {
  /** Bladets plats bland ramarna i Materialet för klassen. */
  i: number;
  rubrik: string; slag: string; niva: string; titel: string; farg: string;
  /** Sidans led och adress. */
  slug: string; adress: string;
  problem: { id: string; tagg: string; bild: { adress: string; bredd: number; hojd: number }; enhet?: string; verktyg: string; fler: string; nivan: string };
  /** Verktyget som problemet står i, med namnet och adressen ur registret (src/data/centrala.json). */
  verktyget: { namn: string; adress: string };
}
export function metodensBankblad(id: string, d: Um): Bankblad[] {
  const v = metodensProblemverktyg(d);
  if (!v) return [];
  const nivaerna = v.nivaer.map((n) => n.namn);
  const alla = ((d.ramar?.ramar ?? []) as { rubrik: string }[]).flatMap((r, i) => {
    const led = r.rubrik.split(', ');
    if (led.length < 3 || !nivaerna.includes(led[1])) return [];
    const titel = led.slice(2).join(', ');
    const p = v.alla.find((x) => x.niva === led[1] && x.titel === titel);
    if (!p) return [];
    const slug = `${slugAv(led[1])}-${slugAv(titel)}`;
    return [{
      i, rubrik: r.rubrik, slag: led[0], niva: led[1], titel, farg: v.nivaer.find((n) => n.namn === led[1])!.farg,
      slug, adress: `/metoder/${id}/${slug}`, verktyget: { namn: v.c.namn, adress: v.c.adress },
      problem: { id: p.id, tagg: p.tagg, bild: { adress: p.bild.adress, bredd: p.bild.matt.bredd, hojd: p.bild.matt.hojd }, enhet: p.enhet && v.c.metod ? enhetAdress(v.c.metod, p.enhet) : undefined, verktyg: `${v.c.adress}#${p.id}`, nivan: `${v.c.adress}#${slugAv(p.niva)}`, fler: `${v.c.adress}#${slugAv(p.niva)}${p.tagg ? `/${slugAv(p.tagg)}` : ''}` },
    }];
  });
  // En bank är minst två blad med samma namn före nivån; ett ensamt blad med en problemtitel är inget.
  const banken = alla.filter((b) => alla.filter((x) => x.slag === b.slag).length >= 2);
  const slugs = new Set<string>();
  for (const b of banken) {
    if (slugs.has(b.slug) || ['lar-dig', 'lathund'].includes(b.slug)) throw new Error(`${d.titel}: bladet ${b.rubrik} får adressen /metoder/${id}/${b.slug}, som en annan sida redan har.`);
    slugs.add(b.slug);
  }
  return banken;
}
/**
 * Bladen som en fri tabell pekar ut, rad för rad, när varje rad har en cell med ett blads nivå och en med dess titel, som
 * tabellen Fyrfältarna i Tänkande klassrum (Bas, Äpplena, Taluppfattning, ordet). Sidan visar då tabellen som bildkort i
 * nivåernas ordning (Bankbladkort.astro), och tabellen står kvar som den är i riggens Word-fil. Annars null.
 */
export function tabellensBankblad(rader: string[][], banken: Bankblad[]): Bankblad[] | null {
  if (!rader.length || banken.length < 2) return null;
  const bladen = rader.map((r) => banken.find((b) => r.includes(b.niva) && r.includes(b.titel)));
  return bladen.every(Boolean) && new Set(bladen).size === bladen.length ? (bladen as Bankblad[]) : null;
}
/** Bladen i banken som leder till ett problem i verktyget, för länken vid problemet (TaFramRad.astro): problemets adress i
 *  verktyget, som /stodundervisning/problemlosning-i-grupp/problem#medel-2, och bladets sida, namn och metod. */
export function bankbladenTillProblemen(metoder: { id: string; data: Um }[]): Map<string, { adress: string; slag: string; metod: string }[]> {
  const ut = new Map<string, { adress: string; slag: string; metod: string }[]>();
  for (const m of metoder) for (const b of metodensBankblad(m.id, m.data)) ut.set(b.problem.verktyg, [...(ut.get(b.problem.verktyg) ?? []), { adress: b.adress, slag: b.slag, metod: m.data.titel }]);
  return ut;
}

/**
 * Bladens textalternativ ur riggens Word-fil med materialet, efter bildens namn, som är bladets rubrik: det som syns och står
 * på bladet, i hela meningar (STIL.md under Bildtexter; andra ögat på Tänkande klassrum 2026-11-14: rutornas uppgifter fanns
 * bara i bilden, och textalternativet var bladets namn). Riggen skriver texten ur bladets scen, så sidan säger samma sak som
 * Word-filen. Ett blad utan text i Word-filen har sitt namn, som förut.
 */
const textalternativen = new Map<string, Map<string, string>>();
export async function bladensTextalternativ(id: string): Promise<Map<string, string>> {
  if (!textalternativen.has(id)) {
    const fil = join(MAPP, `${id}-materialet.docx`);
    const ut = new Map<string, string>();
    if (existsSync(fil)) {
      const { default: JSZip } = await import('jszip');
      const xml = (await (await JSZip.loadAsync(readFileSync(fil))).file('word/document.xml')?.async('string')) ?? '';
      const avkoda = (t: string) => t.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (hela, k: string) => (k[0] === '#' ? String.fromCodePoint(k[1].toLowerCase() === 'x' ? parseInt(k.slice(2), 16) : Number(k.slice(1))) : ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[k.toLowerCase()] ?? hela));
      for (const m of xml.matchAll(/<wp:docPr\b[^>]*>/g)) {
        const namn = /\bname="([^"]*)"/.exec(m[0])?.[1];
        const alt = /\bdescr="([^"]*)"/.exec(m[0])?.[1];
        if (namn && alt && !ut.has(avkoda(namn))) ut.set(avkoda(namn), avkoda(alt));
      }
    }
    textalternativen.set(id, ut);
  }
  return textalternativen.get(id)!;
}

export type { UmSlag };
export interface UmFil { slag: UmSlag | 'tabell'; namn: string; rad: string; pdf?: string; docx?: string }

const MAPP = join(process.cwd(), 'public', 'metoder');

/** Metodens filer som finns, per slag, med filens namn och raden i Ladda ner och skriv ut. */
export function metodensFiler(id: string): Record<UmSlag, UmFil | undefined> {
  const ut = {} as Record<UmSlag, UmFil | undefined>;
  for (const slag of UM_SLAG) {
    const stam = umStam(id, slag);
    const pdf = existsSync(join(MAPP, `${stam}.pdf`)) ? `/metoder/${stam}.pdf` : undefined;
    const docx = existsSync(join(MAPP, `${stam}.docx`)) ? `/metoder/${stam}.docx` : undefined;
    ut[slag] = pdf || docx ? { slag, namn: UM_NAMN[slag], rad: umRad(slag), pdf, docx } : undefined;
  }
  return ut;
}

export interface UmBild { src: string; bredd: number; hojd: number }

/** Bilderna av bladens sidor, <id>-<slag>-<n>.png, i ordning, med måtten ur filens huvud så att sidan inte hoppar. */
export function metodensBilder(id: string): Record<string, UmBild[]> {
  const ut: Record<string, UmBild[]> = {};
  if (!existsSync(MAPP)) return ut;
  for (const f of readdirSync(MAPP)) {
    const m = f.match(new RegExp(`^${id}-([a-z]+)-(\\d+)\\.png$`));
    if (!m) continue;
    const huvud = readFileSync(join(MAPP, f)).subarray(16, 24);
    (ut[m[1]] ??= [])[Number(m[2]) - 1] = { src: `/metoder/${f}`, bredd: huvud.readUInt32BE(0), hojd: huvud.readUInt32BE(4) };
  }
  return ut;
}

/**
 * Bladens egna pdf:er i Materialet för klassen, <id>-blad-<namn>.pdf, ett blad per sida i materialets pdf (ett enda blad kan ha flera sidor), i metodens
 * ordning (ramar.ramar). scripts/metoderfiler.mjs klipper ut dem ur materialets pdf, så att knappen under ett blad skriver
 * ut just det bladet (STIL.md under Hänvisningar: en bestämd sak har en knapp). Ett blad utan fil får ingen egen knapp.
 */
export const bladetsStam = (id: string, namn: string) => `${id}-blad-${slugAv(namn)}`;
export function metodensBlad(id: string, rubriker: string[]): { namn: string; pdf?: string }[] {
  return rubriker.map((namn) => { const stam = bladetsStam(id, namn); return { namn, ...(existsSync(join(MAPP, `${stam}.pdf`)) ? { pdf: `/metoder/${stam}.pdf` } : {}) }; });
}

/**
 * En fri tabell med egen fil, som Grovplaneringen i Testbaserat lärande, en mall att skriva i Word eller Google (K-684;
 * Niclas till riggen 2026-11-02: "Då vill man ju ofta mest ha en bra mall för drive eller docx"). Filen heter
 * <id>-tabell-<rubrik>, som tabellernas filer i Stödundervisning, och riggen lämnar den i filer.json med slag tabell
 * (scripts/metoderfiler.mjs). Tabellen får knappen under sig och en rad i Ladda ner och skriv ut, och den är en sak.
 */
export const tabellensStam = (id: string, rubrik: string) => `${id}-tabell-${slugAv(rubrik)}`;
export function metodensTabellfiler(id: string, rubriker: string[]): UmFil[] {
  return rubriker.flatMap((rubrik) => {
    const stam = tabellensStam(id, rubrik);
    const pdf = existsSync(join(MAPP, `${stam}.pdf`)) ? `/metoder/${stam}.pdf` : undefined;
    const docx = existsSync(join(MAPP, `${stam}.docx`)) ? `/metoder/${stam}.docx` : undefined;
    return pdf || docx ? [{ slag: 'tabell' as const, namn: rubrik, rad: `Bara ${liten(rubrik)}`, pdf, docx }] : [];
  });
}

/**
 * Det metodens saker behöver veta om filerna (undervisningsmetodensSaker): om lektionskortet finns, och vilka fria tabeller
 * som har en egen fil. En rot för metodens sida, lathunden och Lär dig metoden, så att samma ord leder till samma sak.
 */
export const sakernasFiler = (id: string, d: Um) => ({
  banktexter: bankensTexter(d),
  // Ett blad i en bank heter också utan nivån, som texten skriver det: ”Fyrfältaren Borden” för Fyrfältaren, Medel, Borden.
  bankblad: metodensBankblad(id, d).map((b) => ({ rubrik: b.rubrik, form: `${b.slag} ${b.titel}` })),
  // Bladets namn utan nivå och titel, som "Fyrfältaren" i "Skriv ut Fyrfältaren", leder till korten, där läraren väljer
  // vilket (andra ögat på Tänkande klassrum 2026-11-14).
  banksamlingar: ((banken) => [...new Set(banken.map((b) => b.slag))].flatMap((slag) => {
    const t = ((d.tabeller ?? []) as { rubrik: string; rader: string[][] }[]).find((x) => tabellensBankblad(x.rader, banken.filter((b) => b.slag === slag)));
    return t ? [{ namn: slag, adress: `#${slugAv(t.rubrik)}` }] : [];
  }))(metodensBankblad(id, d)),
  lektionskort: !!metodensFiler(id).lektionskort,
  tabeller: metodensTabellfiler(id, ((d.tabeller ?? []) as { rubrik: string }[]).map((t) => t.rubrik)).map((f) => f.namn),
});
