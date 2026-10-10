// Ramarnas form som sidan (Metod.astro, utskriften) och Word-filerna (metoddocx.ts) delar. Inga Node-beroenden.
import { arProtokoll } from './metod';

type Ram = {
  huvud?: { rubrik: string; text: string }[];
  delar: { rubrik: string; falt: { rubrik: string; text: string }[] }[];
  listor?: Lista[];
};

type Lista = { rubrik?: string; kolumner?: string[]; rader: string[][] };

// En lästext (Textsamtal i grupp; Niclas 2026-10-01: lästexterna ska se ut som en gammal bok, ett till ett med
// metodriggen): en ram som heter "<nivå>, <vad>: <titel>", vars första lista heter som titeln och är texten, ett stycke
// per rad, och vars andra och sista lista heter Frågorna, utan kolumner, huvud eller översikt. Samma regel som riggens
// build/modell.mjs (somLastext), så att riggens metodfil fungerar som den är. Word (metoddocx.ts, boksida), sidan och
// utskriften (Metod.astro) ritar den som en boksida, utan ramens text: bladet är elevens. Rutan Till läraren blir en rad
// i sidfoten. Nivåerna numreras i den ordning de först kommer, och knappen i sidfoten får nivåns färg efter numret.
export interface Lastext { niva: string; nivaNr: number; vad: string; titel: string; stycken: string[]; fragor: string[]; not: string }
type RamMedRubrik = Ram & { rubrik: string; oversikt?: unknown };
export function lastexter<R extends RamMedRubrik>(ramar: R[]): Map<R, Lastext> {
  const nivaer: string[] = [];
  const ut = new Map<R, Lastext>();
  for (const ram of ramar) {
    const m = ram.rubrik.match(/^([^,:]+), ([^:]+): (.+)$/);
    const [text, fragor] = ram.listor ?? [];
    if (!m || (ram.listor ?? []).length !== 2 || text.rubrik !== m[3] || fragor.rubrik !== 'Frågorna' || text.kolumner || fragor.kolumner || ram.huvud || ram.oversikt) continue;
    if (!nivaer.includes(m[1])) nivaer.push(m[1]);
    const not = ram.delar.map((del) => `${del.rubrik} · ${del.falt.map((f) => `${f.rubrik}: ${f.text}`).join(' ')}`).join(' ');
    ut.set(ram, { niva: m[1], nivaNr: nivaer.indexOf(m[1]), vad: m[2], titel: m[3], stycken: text.rader.map((r) => String(r[0])), fragor: fragor.rader.map((r) => String(r[0])), not });
  }
  return ut;
}
// Två texter (Texttyper i grupp, metodriggens TILL-SAJTEN 2026-10-09; Niclas 2026-10-08: "en elevversion som alla tittar
// på från en projektor eller är utskriven som ser lite intressant ut med frågor under", och "Alla sådana kontrasterande
// par av texter ska ha detta. I de andra, men även i hela sajten på sikt."): en ram vars första lista har två kolumner och
// en rad, de två texterna sida vid sida, och vars andra och sista lista heter Frågorna, med tre till fem frågor utan
// kolumner. Ramen har inget huvud, ingen översikt och ingen sagoform, och listan med texterna är inte lärarens. Samma regel
// som riggens build/modell.mjs (textparAv), så att riggens metodfil fungerar som den är. Word (textpar i metoddocx.ts),
// sidan och utskriften (Metod.astro, Textpar.astro) ritar först lärarens sida, ramen med texterna och rutorna men utan
// frågorna och med en rad om elevens sida i stället för ramens text, och sedan elevens sida som en boksida på ett eget A4:
// titeln, ramens text, de två texterna i två spalter och frågorna under.
export interface Textpar { titel: string; kolumner: string[]; texter: string[]; fragor: string[]; text: string; not: string }
export const TEXTPAR_RAD = 'Elevens sida kommer efter den här, med texterna sida vid sida och frågorna under. Visa den på tavlan, eller skriv ut den.';
type FormRam = RamMedRubrik & { text?: string[]; sagoform?: unknown; listor?: (Lista & { larare?: boolean })[] };
export function textparAv(ram: FormRam): Textpar | null {
  const listor = ram.listor ?? [];
  const [texter, fragor] = listor;
  if (listor.length !== 2 || (texter.kolumner ?? []).length !== 2 || texter.rader.length !== 1 || texter.larare) return null;
  if (fragor.rubrik !== 'Frågorna' || fragor.kolumner || fragor.rader.length < 3 || fragor.rader.length > 5 || ram.huvud || ram.oversikt || ram.sagoform) return null;
  return {
    titel: texter.rubrik ?? '', kolumner: texter.kolumner!.map(String), texter: texter.rader[0].map((c) => String(c ?? '')),
    fragor: fragor.rader.map((r) => String(r[0] ?? '').replace(/^\d+\.\s*/, '')), text: ram.text?.[0] ?? '', not: ram.rubrik,
  };
}
// Lärarens sida till två texter: ramen med texterna och rutorna, utan frågorna, och raden om elevens sida i stället för
// ramens text, som står på elevens sida.
// Listan med texterna märks, så att Word-filen behåller textens radbrytningar (ett steg per rad i Instruerande text) i
// cellerna, som elevens sida gör; sidan och utskriften gör det med CSS (.m-textpar-larare). Märket är en egenskap med en
// symbol, som följer med när listan kopieras ({ ...l, rubrik } i ramBarn); en WeakSet med listan själv tappade den
// (granskningen av Skrivkurs: sagoboken 2026-10-10).
export const TEXTPAR_LISTA = Symbol('textparLista');
export const arTextparLista = (l: object): boolean => !!(l as { [TEXTPAR_LISTA]?: boolean })[TEXTPAR_LISTA];
export const textparLarare = <R extends FormRam>(ram: R): R => ({ ...ram, text: [TEXTPAR_RAD], listor: [{ ...ram.listor![0], [TEXTPAR_LISTA]: true }] });

// En kooperativ struktur på ett A4 (Texttyper i grupp, metodriggens TILL-SAJTEN 2026-10-09; Niclas 2026-10-09: "En social
// aktivitet för varje texttyp beskriven på en sida som en kooperativ struktur som tränar det centrala i texttypen ... en
// designad A4 med en bild som visar den sociala aktiviteten, en tydlig steg för steg beskrivning och en kort ruta med hur
// den används för att träna texttypen"; sidan är både lärarens och elevernas och ligger på bordet när gruppen gör
// strukturen): en ram som heter "Strukturen, <var>: <namn>", vars första lista heter Så gör ni och har fyra till nio steg
// utan kolumner, och vars andra och sista lista har en eller två rader utan kolumner, rutan om vad strukturen tränar.
// Ramens text är raden under namnet, och rutan Till läraren står under ramen, som på boksidan. Bilden är den första bilden
// På bordet med efter "ram: <ramens rubrik>"; fler bilder till ramen (bild A och bild B i Lika och olika) står efter sidan.
// Samma regel som riggens build/modell.mjs (strukturAv). Word (struktur i metoddocx.ts), sidan och utskriften
// (Struktur.astro) ritar den som en boksida på ett eget A4.
export interface Struktur { vid: string; titel: string; steg: string[]; rutaRubrik: string; ruta: string[]; text: string; not: string }
export function strukturAv(ram: FormRam): Struktur | null {
  const m = ram.rubrik.match(/^Strukturen, ([^:]+): (.+)$/);
  const listor = ram.listor ?? [];
  const [steg, ruta] = listor;
  if (!m || listor.length !== 2 || steg.rubrik !== 'Så gör ni' || steg.kolumner || ruta.kolumner) return null;
  if (steg.rader.length < 4 || steg.rader.length > 9 || ruta.rader.length < 1 || ruta.rader.length > 2 || ram.huvud || ram.oversikt || ram.sagoform) return null;
  const not = ram.delar.filter((del) => /^Till läraren$/i.test(del.rubrik.trim())).flatMap((del) => del.falt.map((f) => `${f.rubrik}: ${f.text}`)).join(' ');
  return {
    vid: m[1].trim(), titel: m[2].trim(), steg: steg.rader.map((r) => String(r[0] ?? '').replace(/^\d+\.\s*/, '')),
    rutaRubrik: ruta.rubrik ?? '', ruta: ruta.rader.map((r) => String(r[0] ?? '')), text: ram.text?.[0] ?? '', not: not ? `Till läraren: ${not}` : '',
  };
}

// Har metoden lästexter, som blir boksidor? Då bär Word-filen Cinzel och Cinzel Decorative (public/fonts/boksida/).
export const harLastexter = (d: { ramar?: { ramar: RamMedRubrik[] } }): boolean => lastexter(d.ramar?.ramar ?? []).size > 0;
// Har metoden boksidor av något slag: lästexter, elevens sida till två texter eller strukturer? Då bär Word-filen Cinzel.
export const harBoksidor = (d: { ramar?: { ramar: FormRam[] } }): boolean => harLastexter(d) || (d.ramar?.ramar ?? []).some((r) => !!textparAv(r) || !!strukturAv(r));
export const BOKTYPSNITT_TTF = { cinzel: '/fonts/boksida/Cinzel-dokument.ttf', dekor: '/fonts/boksida/CinzelDecorative-dokument.ttf' };

// En text med frågor (screeningens nivå 6–8 i Ljudlek i grupp, som i Niclas original): två kolumner, texten som eleven
// läser till vänster och frågorna som läraren läser upp till höger. Kolumnen till höger är frågor när varje ifylld rad
// slutar med frågetecken. Texten står för sig och frågorna för sig, kursivt och mindre, på sidan och i Word.
export function harFragor(l: Lista): boolean {
  if (l.kolumner || !l.rader.length || !l.rader.every((r) => r.length === 2 && (r[0] ?? '').trim())) return false;
  const fragor = l.rader.map((r) => (r[1] ?? '').trim()).filter(Boolean);
  return fragor.length > 0 && fragor.every((f) => f.endsWith('?'));
}
// Textens storlek efter längden, som i originalet, där de längre texterna står mindre: några korta meningar (nivå 6),
// en kort berättelse (nivå 7) och en längre (nivå 8). Räknat i tecken i textkolumnen.
export function textlangd(l: Lista): 'kort' | 'mellan' | 'lang' {
  const tecken = l.rader.reduce((a, r) => a + (r[0] ?? '').length, 0);
  return tecken <= 100 ? 'kort' : tecken <= 300 ? 'mellan' : 'lang';
}

// En ram är elevens blad när rubriken eller första stycket säger det ("Ljudkollen, elevens blad", "Elevens blad till
// screeningen före insatsen har två sidor") och den har listor som eleven läser, inte bara lärarens protokoll. I Word blir
// den ett eget blad att lägga på bordet (metoddocx.ts), och sidan säger att bladet finns i planeringsmallarna.
export function arElevensBlad(ram: { rubrik: string; text: string[]; listor?: Lista[] }): boolean {
  const sager = /elevens blad/i.test(ram.rubrik) || /^(Det här är elevens blad|Elevens blad)/i.test(ram.text[0] ?? '');
  return sager && (ram.listor ?? []).some((l) => !arProtokoll(l));
}

// Ett protokoll vars not och listor inte ryms på ett A4 delas: noten (frågorna) på en sida och huvudet (elevens namn) med
// listorna på nästa, så att sidan med tabellerna går att kopiera per elev, som i metodriggen (Protokollet för
// screeningen och ljudkollen i Ljudlek i grupp, granskningen 2026-09-29). Ryms allt står noten kvar med listorna på samma
// sida, som i Upprepad läsning (K-071). Höjden räknas grovt: en rad not om 95 tecken är 0,5 cm och en tabellrad 0,75 cm,
// och en sida har omkring 22 cm för ramen.
export function protokollDelas(ram: Ram): boolean {
  const listor = ram.listor ?? [];
  if (!listor.length || !listor.every(arProtokoll) || !ram.huvud?.length || !ram.delar.length) return false;
  const tecken = ram.delar.flatMap((d) => d.falt).reduce((a, f) => a + f.rubrik.length + f.text.length, 0);
  const rader = listor.reduce((a, l) => a + l.rader.length + (l.kolumner ? 1 : 0) + 1, 0);
  return (tecken / 95) * 0.5 + rader * 0.75 > 22;
}
