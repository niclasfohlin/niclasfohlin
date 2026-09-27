import type { CollectionEntry } from 'astro:content';

// Metodens data som den ser ut i bygget och i webbläsaren. I metoder.json är datumet en sträng.
export type MetodData = Omit<CollectionEntry<'stodundervisning'>['data'], 'uppdaterad'> & { uppdaterad?: Date | string };

// Lathundens tredje sida, Mallen, har tre former. En tom tabell som enda block utöver en not är ett blad att bygga på
// (mattan). En ifylld tabell som enda block utöver en not är ett kort att ha på bordet (strategikortet i Upprepad
// läsning, K-061): raderna stort över sidan, så att eleven kan läsa det vid bordet. Annars flödar blocken. Samma
// regel på sidan (Lathund.astro), i Word (metoddocx.ts) och i PowerPoint och pdf (metodpptx.ts).
export type LathundMall = NonNullable<MetodData['lathund']>['mall'];
export type LathundTabell = Extract<LathundMall['block'][number], { typ: 'tabell' }>;
export function lathundForm(mall: LathundMall): { form: 'matta' | 'kort' | 'block'; tabell?: LathundTabell; not?: string } {
  const tabell = mall.block.find((b): b is LathundTabell => b.typ === 'tabell');
  if (!tabell || mall.block.filter((b) => b.typ !== 'not').length !== 1) return { form: 'block' };
  const nasta = mall.block[mall.block.indexOf(tabell) + 1];
  const not = nasta?.typ === 'not' ? nasta.text : undefined;
  return { form: tabell.rader.every((r) => r.every((c) => !c.trim())) ? 'matta' : 'kort', tabell, not };
}

// Ramarnas listor har två former för eleven ur metodriggen (Upprepad läsning, 2026-09-27). En lästräningstext är en
// lista med två kolumner där den ena har bågtecken (‿): den blir två läskort, med stöd och utan (K-063, lasflyt.ts).
// En kort lista ensam i sin ram, högst åtta rader och 30 tecken per cell och utan skrivkolumn, är ett kort att ha på
// bordet och ritas stort (K-062). Samma regler på sidan (Metod.astro) och i Word (metoddocx.ts), som i riggen.
type RamLista = { rubrik?: string; kolumner?: string[]; rader: string[][] };
export function laskortKolumn(l: RamLista): number | undefined {
  if ((l.kolumner ?? []).length !== 2) return undefined;
  return [0, 1].find((ci) => l.rader.some((r) => String(r[ci] ?? '').includes('‿')));
}
// Numret och titeln ur listans rubrik: "6 · Sandslottet".
export function laskortRubrik(l: RamLista): { nr: string; titel: string } {
  const m = (l.rubrik ?? '').match(/^(\d+)\s*·\s*(.+)$/);
  return { nr: m ? m[1] : '', titel: m ? m[2] : (l.rubrik ?? '') };
}
export function arEttKort(listor: RamLista[], l: RamLista): boolean {
  const n = Math.max(...l.rader.map((r) => r.length), l.kolumner?.length ?? 1);
  const skrivkolumn = Array.from({ length: n }, (_, i) => l.rader.every((r) => !(r[i] ?? '').trim())).some(Boolean);
  return listor.length === 1 && laskortKolumn(l) === undefined && !skrivkolumn && l.rader.length <= 8 && l.rader.every((r) => r.every((c) => String(c).length <= 30));
}
export interface MetodPost { id: string; data: MetodData }

export const UPPHOV = '© Niclas Fohlin';
export const SAJT = 'niclasfohlin.se';
export function metodAdress(bas: string, id: string): string {
  return `${bas.replace(/\/$/, '')}/stodundervisning/${id}`;
}

const ORDNING = ['F-3', '4-6', '7-9'];

// "4-6, 7-9" blir "åk 4–9" när nivåerna hänger ihop, annars räknas de upp.
export function arskursSpann(arskurs: readonly string[]): string {
  const valda = ORDNING.filter((a) => arskurs.includes(a));
  if (valda.length === 0) return '';
  const forsta = ORDNING.indexOf(valda[0]);
  const sista = ORDNING.indexOf(valda[valda.length - 1]);
  if (sista - forsta + 1 !== valda.length) return valda.map((a) => (a.startsWith('F') ? a.replace('-', '–') : `åk ${a.replace('-', '–')}`)).join(', ');
  const start = valda[0].split('-')[0];
  const slut = valda[valda.length - 1].split('-')[1];
  return start === 'F' ? `F–${slut}` : `åk ${start}–${slut}`;
}

// Ett spann som "F–3" eller "åk 4–9" får aldrig brytas så att siffran hamnar på nästa rad
// ("F–" / "2" läses fel). Ett osynligt ordfogtecken (U+2060) efter tankstrecket hindrar brytningen.
// En rad som börjar med en kort etikett och kolon ("Fråga alltid först: vad har ni gjort hittills?") delas i
// etiketten, som ritas fet, och resten, som ritas mager: fet stil betyder rubrik (K-025). Utan etikett är allt resten.
export function etikettOchText(rad: string): { etikett: string; text: string } {
  const m = rad.match(/^([^:]{2,30}):\s+(.+)$/s);
  return m ? { etikett: `${m[1]}:`, text: m[2] } : { etikett: '', text: rad };
}

export function ejBryt(text: string): string {
  return text.replace(/(\S)–(?=\d)/g, '$1–⁠');
}

// Årskursen som läsaren ser: arskursText när metoden anger en ("åk 3–6"), annars nivåerna.
export function arskursText(d: Pick<MetodData, 'arskurs' | 'arskursText'>): string {
  return ejBryt(d.arskursText ?? arskursSpann(d.arskurs));
}

// Raden under rubriken i kort, dokument och sökresultat.
export function metaRad(d: MetodData): string {
  return [d.omrade, arskursText(d), d.tid, d.grupp].filter(Boolean).join(' · ');
}

export function datumText(d?: Date | string): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(d));
}

// Sant när metoden har minst en mall att ladda ner: snabbmall, checklista, mål, kontrakt, schema, ramar eller diplom.
export function harMallar(d: MetodData): boolean {
  return Boolean(d.snabbmall || d.checklista || d.mal || d.hem?.kontrakt || d.hem?.schema || d.ramar || d.diplom);
}

// En ram där alla fält är tomma är en mall att fylla i.
export function ramArTom(ram: { huvud?: { text: string }[]; delar: { falt: { text: string }[] }[] }): boolean {
  return ram.delar.every((del) => del.falt.every((f) => !f.text.trim())) && (ram.huvud ?? []).every((f) => !f.text.trim());
}

export function harLathund(d: MetodData): boolean {
  return Boolean(d.lathund);
}

const versal = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const gemen = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

// Lathundens fyra faktarutor. Passlängd och frekvens ur tid ("20 minuter per pass, två till tre pass
// i veckan"), perioden ur period, gruppen ur grupp, innehållet ur lathunden.
export function lathundFakta(d: MetodData): { rubrik: string; text: string }[] {
  const [passlangd, ...rest] = (d.tid ?? '').split(/ per pass,?\s*/);
  // "Två pass i veckan och ett tredje när det går, i fem veckor": kommat hindrar läsningen "när det går i fem veckor".
  const ofta = rest.join(' ').trim();
  const frekvens = [ofta, d.period ? gemen(d.period) : ''].filter(Boolean).join(/ när /.test(ofta) ? ', i ' : ' i ');
  return [
    { rubrik: 'Passlängd', text: versal(passlangd.trim()) || '' },
    { rubrik: 'Grupp', text: d.grupp ?? '' },
    { rubrik: 'Frekvens', text: versal(frekvens) },
    { rubrik: 'Innehåll', text: d.lathund?.innehall ?? '' },
  ].filter((f) => f.text);
}

// Faktaremsan på metodkortet i metodbanken: årskurs, grupp, passlängd och hur ofta, ur samma
// fält som lathundens faktarutor, så att kortet aldrig säger emot metoden.
export function kortFakta(d: MetodData): { rubrik: string; text: string }[] {
  // Tiden skrivs "20 minuter per pass, två till tre pass i veckan" (se _mall.yaml). Saknas " per pass"
  // går den inte att dela säkert och visas då hel under Tid.
  const [passlangd, ...rest] = (d.tid ?? '').split(/ per pass,?\s*/);
  const tid = rest.length > 0
    ? [{ rubrik: 'Pass', text: versal(passlangd.trim()) }, { rubrik: 'Hur ofta', text: versal(rest.join(' ').trim()) }]
    : [{ rubrik: 'Tid', text: d.tid ?? '' }];
  return [
    { rubrik: 'Årskurs', text: arskursText(d).replace(/^åk\s*/, '') },
    { rubrik: 'Grupp', text: d.grupp ?? '' },
    ...tid,
  ].filter((f) => f.text);
}

// Arbetsformen som en rad: "Gemensamt (läraren leder) → i par (eleverna prövar) → gemensamt igen (…)".
export function arbetsformRad(d: MetodData): string {
  if (!d.arbetsform) return '';
  return d.arbetsform.delar
    .map((x, i) => {
      const namn = x.rubrik.replace(/^\d+\.\s*/, '');
      return `${i === 0 ? versal(namn) : gemen(namn)} (${gemen(x.text)})`;
    })
    .join(' → ');
}

// Passöversikten: när passrutinens steg har faser slås rutinen, tidsschemat och arbetsformen ihop till
// en remsa (faserna med minuter och arbetsformens delar under) och en tabell med en rad per fas. Raden
// "Före passet" hämtas ur tidsschemat (tiden börjar inte med en siffra), "Efter passet" ur passrutin.efterPasset.
export interface PassFas { fas: string; tid: string; vad: string; minuter: number; steg: { nr: number; text: string }[] }
// En del av arbetsformen i remsan: den övergripande arbetsformen över de faser den gäller (METODER.md,
// Arbetsformen i remsan). tid är delens spann och används bara i beskrivningen för skärmläsare; synligt står
// tiden bara i faserna. Namnet står alltid, också när fasen heter likadant.
export interface PassDel { rubrik: string; text: string; fran: number; antal: number; tid: string }
export interface PassOversikt { rubrik: string; text?: string; fore?: string; efter?: string; efterTabell?: string; faser: PassFas[]; total: number; delar: PassDel[] }
export function passOversikt(d: MetodData): PassOversikt | null {
  const steg = d.passrutin?.steg ?? [];
  if (!d.passrutin || !d.tidsschema || !steg.length || steg.some((s) => typeof s === 'string')) return null;
  const objekt = steg as { text: string; fas: string }[];
  const rader = d.tidsschema.rader;
  const arFore = (r: { tid: string }) => !/^\d/.test(r.tid.trim());
  const fore = rader.find(arFore);
  let nr = 0;
  const faser: PassFas[] = rader.filter((r) => !arFore(r)).map((r) => {
    const m = r.tid.match(/(\d+)\s*[–-]\s*(\d+)/);
    const minuter = m ? Math.max(1, Number(m[2]) - Number(m[1])) : 1;
    const egna = objekt.filter((s) => s.fas.toLowerCase() === r.fas.toLowerCase()).map((s) => ({ nr: ++nr, text: s.text }));
    return { fas: r.fas, tid: r.tid, vad: r.vad, minuter, steg: egna };
  });
  const total = faser.reduce((a, f) => a + f.minuter, 0);
  const index = (fas: string) => faser.findIndex((f) => f.fas.toLowerCase() === fas.toLowerCase());
  const delar = (d.arbetsform?.delar ?? []).filter((x) => x.faser?.length).map((x) => {
    const platser = x.faser!.map(index).filter((i) => i >= 0).sort((a, b) => a - b);
    const forsta = faser[platser[0]].tid.match(/\d+/)?.[0] ?? '';
    const sista = faser[platser[platser.length - 1]].tid.match(/(\d+)\s*[–-]\s*(\d+)/)?.[2] ?? '';
    return { rubrik: x.rubrik.replace(/^\d+\.\s*/, ''), text: x.text, fran: platser[0], antal: platser[platser.length - 1] - platser[0] + 1, tid: forsta && sista ? `${forsta}–${sista} min` : '' };
  });
  return { rubrik: d.tidsschema.rubrik, text: d.tidsschema.text, fore: fore?.vad, efter: d.passrutin.efterPasset, efterTabell: d.tidsschema.efter, faser, total, delar };
}
// Remsans grupper i fasernas ordning: en arbetsform med de faser den gäller, eller en fas utan arbetsform.
// Metod.astro skriver ut faserna och sedan delen, så att ordningen i koden följer passet.
export type PassGrupp = { faser: { fas: PassFas; nr: number }[]; del?: PassDel };
export function passGrupper(p: PassOversikt): PassGrupp[] {
  const ut: PassGrupp[] = [];
  for (let i = 0; i < p.faser.length; i++) {
    const del = p.delar.find((x) => x.fran === i);
    const antal = del ? Math.max(1, del.antal) : 1;
    ut.push({ faser: p.faser.slice(i, i + antal).map((fas, j) => ({ fas, nr: i + j })), del });
    i += antal - 1;
  }
  return ut;
}
// Rutinens steg som texter, oavsett om de har fas.
export function stegTexter(d: MetodData): string[] {
  return (d.passrutin?.steg ?? []).map((s) => (typeof s === 'string' ? s : s.text));
}
// Rubrikerna för passets delar i passöversikten, stegtabellen och menyn (K-065): Fas, Rutinen i N steg, Steg och Stegen,
// eller Del, Passet i N delar, Del och Delarna när passrutin.kallas är delar, för en metod där ordet steg hör till något
// annat, som lästrappan i Upprepad läsning.
export interface PassOrd { fas: string; rutin: (antal: number) => string; steg: string; stegen: string }
export function passOrd(d: MetodData): PassOrd {
  return d.passrutin?.kallas === 'delar'
    ? { fas: 'Del', rutin: (antal) => `Passet i ${antal} delar`, steg: 'Del', stegen: 'Delarna' }
    : { fas: 'Fas', rutin: (antal) => `Rutinen i ${antal} steg`, steg: 'Steg', stegen: 'Stegen' };
}
