// Sagobladen och berättartärningarna (Skrivkurs: sagoboken, 2026-10-02): datan ur metodens fil, utan Word-kod, så att
// bygget och webbläsaren delar den. En ram med fältet sagoform ritas i Word som ett blad i en sagobok, och en kortlista
// vars rubrik börjar med Tärning och som har sex kort som en tärning att klippa, vika och limma (sagoblad och tarning i
// src/lib/metoddocx.ts, ornamenten i src/lib/sagoform.js). Reglerna är metodriggens (build/modell.mjs, sagobladAv och
// tärningen), så att sajtens Word-fil och riggens kompendium har samma blad.
import type { MetodData } from './metod';
import { bildFor, kortCeller } from './ljudkort';
import { harLastexter } from './ramform';

type Ram = NonNullable<MetodData['ramar']>['ramar'][number];
type Lista = NonNullable<Ram['listor']>[number];
export type Sagoform = NonNullable<Ram['sagoform']>;

export interface Station { nr: string; namn: string; fraga: string; start: string | null; cm: number | null; bild: string | null }
export interface Sagofalt { rubrik: string; fraga: string; start: string | null; cm: number | null }
export interface Sagoblad {
  form: Sagoform['form'];
  // Bokens blad (omslaget, en sida och författarna) kopieras in i den tryckta boken, så de har ingen sidfot.
  bokblad: boolean;
  ram: 'lindorm' | 'slinga';
  rita: boolean;
  titel: string;
  undertitel: string | null;
  namnrader: string[];
  text: string | null;
  radMm?: number;
  kortbilder?: Record<string, (string | null)[]>;
  falt: Sagofalt[];
  stationer: Station[];
  listor: { rubrik: string; rader: string[][] }[];
  // Rutan Till läraren som en rad i sidfoten, som på boksidan.
  not: string;
}

// Bildbankens bild för ett ord på en tärning eller vid en station: hela ordet först och sedan utan en eller ett, så att
// "en drake" är draken och "drake" pappersdraken i Ljudlek.
export const bildForSida = (ord: string): string | null => bildFor(ord) ?? bildFor(String(ord ?? '').trim().replace(/^(en|ett)\s+/i, ''));

const lararen = (rubrik: string) => /^Till läraren$/i.test(rubrik.trim());

// Bladen för en ram med sagoform: ett, eller för sagans väg med sidor ett per sida med stationerna delade lika, och varje
// sida har ramen, rubriken, namnraden och rutan Till läraren (Niclas 2026-10-02: för lite rader i mallarna).
export function sagobladAv(ram: Ram, d: Pick<MetodData, 'elevblad'>): Sagoblad[] {
  const s = ram.sagoform!;
  const not = ram.delar.filter((del) => lararen(del.rubrik)).flatMap((del) => del.falt.map((f) => (f.rubrik && !lararen(f.rubrik) ? `${f.rubrik}: ${f.text}` : f.text))).join(' ');
  const blad = d.elevblad?.[ram.rubrik] ?? {};
  const falt = ram.delar.filter((del) => !lararen(del.rubrik)).flatMap((del) => del.falt).map((f) => {
    const [fraga, start] = String(f.text ?? '').split('\n').map((x) => x.trim());
    return { rubrik: f.rubrik, fraga: fraga ?? '', start: start || null, cm: blad[f.rubrik] ?? null };
  });
  const stationer = falt.map((f, i) => {
    const m = f.rubrik.match(/^(\d+)\s+(.+)$/);
    const ord = s.bilder?.[i];
    return { nr: m ? m[1] : String(i + 1), namn: m ? m[2] : f.rubrik, fraga: f.fraga, start: f.start, cm: f.cm, bild: ord ? bildFor(ord) : null };
  });
  const ett: Sagoblad = {
    form: s.form, bokblad: ['omslag', 'sida', 'forfattare'].includes(s.form), ram: s.ram ?? 'slinga', rita: !!s.rita,
    titel: s.titel ?? ram.rubrik, undertitel: s.undertitel ?? null, namnrader: (ram.huvud ?? []).map((h) => h.rubrik), text: ram.text[0] ?? null,
    radMm: s.radMm, kortbilder: s.kortbilder, falt, stationer, listor: (ram.listor ?? []).map((l) => ({ rubrik: l.rubrik ?? '', rader: l.rader })),
    not: not ? `Till läraren: ${not}` : '',
  };
  if (s.form !== 'vag' || !((s.sidor ?? 1) > 1)) return [ett];
  const per = Math.ceil(stationer.length / s.sidor!);
  return Array.from({ length: s.sidor! }, (_, k) => ({ ...ett, stationer: stationer.slice(k * per, (k + 1) * per) })).filter((x) => x.stationer.length);
}

// En tärning: en kortlista (d.kort) vars rubrik börjar med Tärning och som har sex kort, ett ord eller några per sida.
export const arTarning = (d: Pick<MetodData, 'kort'>, l: Lista): boolean =>
  /^Tärning\b/i.test(l.rubrik ?? '') && (d.kort?.listor ?? []).some((t) => (l.rubrik ?? '').includes(t)) && kortCeller(l).length === 6;

export interface Tarning { nr: number; fraga: string; sidor: { ord: string; bild: string | null }[]; allaOrd: string[] }
// Tärningens nummer ur rubriken (1 i "Tärning 1A · Vem?"), frågan efter " · " och orden på alla tärningar i ramen, så
// att varje ord står i samma storlek som det längsta (riggens frågerunda 2026-10-02).
export function tarningAv(l: Lista, ram: Ram, d: Pick<MetodData, 'kort'>): Tarning {
  const led = (l.rubrik ?? '').split(' · ');
  const allaOrd = (ram.listor ?? []).filter((x) => arTarning(d, x)).flatMap((x) => kortCeller(x));
  return {
    nr: Number((l.rubrik ?? '').match(/^Tärning\s+(\d+)/i)?.[1] ?? 1),
    fraga: led.length > 1 ? led[led.length - 1] : '',
    sidor: kortCeller(l).map((ord) => ({ ord, bild: bildForSida(ord) })),
    allaOrd,
  };
}

export const harSagoform = (d: Pick<MetodData, 'ramar' | 'kort'>): boolean =>
  (d.ramar?.ramar ?? []).some((r) => !!r.sagoform || (r.listor ?? []).some((l) => arTarning(d, l)));
// Cinzel och Cinzel Decorative i Word-filen: boksidorna och sagobladen.
export const harBoktypsnitt = (d: MetodData): boolean => harLastexter(d) || harSagoform(d);

// Bildbankens bilder som sagobladen och tärningarna ritar: stationernas rundlar, frågekortens och tärningarnas sidor.
// Word-filens resurser läser dem vid bygget och hämtar dem i webbläsaren (src/lib/metodresurser.ts, stodundervisning/index.astro).
export function sagoBilder(d: MetodData): string[] {
  const ut = new Set<string>();
  for (const ram of d.ramar?.ramar ?? []) {
    const s = ram.sagoform;
    for (const ord of [...(s?.bilder ?? []), ...Object.values(s?.kortbilder ?? {}).flat()]) { const b = ord ? bildFor(ord) : null; if (b) ut.add(b); }
    for (const l of ram.listor ?? []) if (arTarning(d, l)) for (const k of kortCeller(l)) { const b = bildForSida(k); if (b) ut.add(b); }
  }
  return [...ut];
}
