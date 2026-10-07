// Filmernas filer utanför sidan (Niclas 2026-10-07): mp4-filen och omslagsbilden som scripts/filmmp4.mjs gör ur varje
// svg-film, zip-filen med metodens filmer (src/pages/stodundervisning/[id]-filmer.zip.ts) och filmbildens inställningar
// i lathundens PowerPoint (src/lib/metodpptx.ts). Svg-filmen är källan. Mp4-filen görs i förväg, eftersom Netlify varken
// har Chrome eller ffmpeg, och bygget stannar om den saknas eller är äldre än sin svg-fil (npm run build kör
// scripts/filmmp4.mjs --kontrollera). Zip-filen och PowerPoint-filen byggs vid varje bygge ur mp4-filerna.
//
// Modulen läser filer från disken och körs bara vid bygget; src/lib/film.ts har det som också webbläsaren behöver.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';
import { FILM_UPPHOV, filmNamn, type MetodFilm } from './film';
import { UPPHOV } from './metod';

const publik = (adress: string) => join(process.cwd(), 'public', adress);
export const mp4Fil = (f: MetodFilm) => publik(`${f.bas}.mp4`);
export const omslagFil = (f: MetodFilm) => publik(`${f.bas}-omslag.png`);
/** Prövar att filmens mp4 och omslagsbild finns; bygget stannar annars med vad som ska göras. */
export function provaFilmfiler(f: MetodFilm, titel: string): void {
  for (const fil of [mp4Fil(f), omslagFil(f)]) {
    if (!existsSync(fil)) throw new Error(`${titel}: ${fil} saknas. Kör npm run validera, som gör filmens mp4 och omslagsbild ur svg-filen (scripts/filmmp4.mjs).`);
  }
}
/** Småbilden i spelaren på lathundssidan: omslagsbilden i litet format (src/pages/stodundervisning/[film]-liten.webp.ts). */
export const SMABILD = { bredd: 384, hojd: 216 };
/** Metodens filmer som mp4, i byte. */
export const filmernasStorlek = (filmer: MetodFilm[]) => filmer.reduce((a, f) => a + statSync(mp4Fil(f)).size, 0);
/** "0,6 MB", med en decimal och minst 0,1. */
export const megabyte = (byte: number) => `${Math.max(0.1, byte / 1048576).toFixed(1).replace('.', ',')} MB`;
/** "filmen" för en film och "filmerna" för flera, så att knappen säger vad den ger. */
export const filmOrd = (antal: number) => (antal === 1 ? 'filmen' : 'filmerna');

// Filnamnet i zip-filen: metodens titel, filmens nummer och filmens namn, utan tecken som Windows inte tillåter i
// filnamn. Kolonet i en titel (Skrivkurs: sagoboken) blir ett bindestreck.
const rensa = (s: string) => s.replace(/\s*:\s*/g, ' - ').replace(/[\\/*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
export const zipNamn = (titel: string, f: MetodFilm) => `${rensa(titel)}, film ${f.nr} - ${rensa(filmNamn(f))}.mp4`;
// Samma datum på varje fil i zip-filen, så att filen blir densamma vid varje bygge när filmerna är desamma och länkens
// version (scripts/filversion.mjs) inte byts i onödan.
const DATUM = new Date(Date.UTC(2026, 0, 1, 12));

/** Texten om upphovet som följer med filmerna: allt som laddas ner bär upphovet, och bildernas licens kräver sin rad. */
export function upphovstext(titel: string, adress: string, filmer: MetodFilm[]): string {
  const rader = [
    `${filmer.length === 1 ? 'Filmen' : 'Filmerna'} till ${titel}`,
    '',
    ...filmer.map((f) => `Film ${f.nr}: ${filmNamn(f)}, ${Math.round(f.film.sekunder)} sekunder`),
    '',
    'Metoden står i metodbanken på niclasfohlin.se:',
    adress,
    '',
    `${UPPHOV}, niclasfohlin.se`,
    FILM_UPPHOV,
    '',
  ];
  // Teckenmärket först och Windows radslut, så att Anteckningar visar å, ä, ö och © rätt.
  return String.fromCharCode(0xfeff) + rader.join('\r\n');
}

/** Metodens filmer som zip: mp4-filerna som de är och en textfil om upphovet. */
export async function filmZip(titel: string, adress: string, filmer: MetodFilm[]): Promise<Buffer> {
  const zip = new JSZip();
  for (const f of filmer) {
    provaFilmfiler(f, titel);
    zip.file(zipNamn(titel, f), readFileSync(mp4Fil(f)), { date: DATUM, compression: 'STORE' });
  }
  zip.file('Upphov.txt', upphovstext(titel, adress, filmer), { date: DATUM, compression: 'DEFLATE' });
  return zip.generateAsync({ type: 'nodebuffer' });
}

// Filmens uppspelning i PowerPoint, så som PowerPoint själv skriver den när en film läggs in och Spela upp i helskärm
// är valt: ett klick på filmen spelar eller pausar den (interactiveSeq, togglePause), och filmen visas i helskärm
// (p:video fullScrn). Tre filmer i bredd är små på en projektor, och textraden i filmen ska gå att läsa.
const klick = (form: string, tn: number) => `<p:seq concurrent="1" nextAc="seek"><p:cTn id="${tn}" restart="whenNotActive" fill="hold" evtFilter="cancelBubble" nodeType="interactiveSeq"><p:stCondLst><p:cond evt="onClick" delay="0"><p:tgtEl><p:spTgt spid="${form}"/></p:tgtEl></p:cond></p:stCondLst><p:endSync evt="end" delay="0"><p:rtn val="all"/></p:endSync><p:childTnLst><p:par><p:cTn id="${tn + 1}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="${tn + 2}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="${tn + 3}" presetID="2" presetClass="mediacall" presetSubtype="0" fill="hold" nodeType="clickEffect"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst><p:cmd type="call" cmd="togglePause"><p:cBhvr><p:cTn id="${tn + 4}" dur="1" fill="hold"/><p:tgtEl><p:spTgt spid="${form}"/></p:tgtEl></p:cBhvr></p:cmd></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn><p:nextCondLst><p:cond evt="onClick" delay="0"><p:tgtEl><p:spTgt spid="${form}"/></p:tgtEl></p:cond></p:nextCondLst></p:seq>`;
const helskarm = (form: string, tn: number) => `<p:video fullScrn="1"><p:cMediaNode vol="80000"><p:cTn id="${tn}" fill="hold" display="0"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${form}"/></p:tgtEl></p:cMediaNode></p:video>`;

const xmlText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Sätter filmernas uppspelning på filmbilden i en PowerPoint-fil från pptxgenjs och komprimerar filen. bild är
 * filmbildens nummer i filen (1 när den står först), beskrivningar filmernas textalternativ i bildens ordning, och datum
 * filens datum.
 *
 * pptxgenjs ger en film samma form-id som en textruta på bilden. PowerPoint tål det tills något pekar på id:t, men med
 * uppspelningsinställningen kallar PowerPoint filen skadad (mätt 2026-10-07). Varje form på bilden får därför först ett
 * eget id i ordning, så som PowerPoint själv gör när filen sparas om. Varje film får också sin beskrivning som
 * textalternativ, så att en skärmläsare säger mer än Media 0.
 *
 * Datumet sätts på varje del i filen och i filens egenskaper, i stället för byggets klockslag, så att filen blir
 * densamma vid varje bygge när metoden och filmerna är desamma. Annars byter länken version och filen laddas upp på nytt
 * vid varje deploy fast inget har ändrats (granskningen 2026-10-07).
 */
export async function filmbildensUppspelning(pptx: Buffer, bild: number, beskrivningar: string[], datum?: Date): Promise<Buffer> {
  const zip = await JSZip.loadAsync(pptx);
  const fil = `ppt/slides/slide${bild}.xml`;
  const kalla = zip.file(fil);
  if (!kalla) throw new Error(`PowerPoint-filen har ingen bild ${bild}`);
  const antal = beskrivningar.length;
  let lopnr = 0;
  let xml = (await kalla.async('string')).replace(/<p:cNvPr id="\d+"/g, () => `<p:cNvPr id="${++lopnr}"`);
  const former = [...xml.matchAll(/<p:cNvPr id="(\d+)" name="Media \d+">/g)].map((m) => m[1]);
  if (former.length !== antal) throw new Error(`Filmbilden har ${former.length} filmer i PowerPoint-filen, väntat ${antal}`);
  let film = 0;
  xml = xml.replace(/(<p:cNvPr id="\d+" name="Media \d+")>/g, (_hel, borjan: string) => `${borjan} descr="${xmlText(beskrivningar[film++])}">`);
  const slut = '</p:clrMapOvr></p:sld>';
  if (!xml.endsWith(slut)) throw new Error('Filmbildens slut ser inte ut som väntat; pptxgenjs kan ha ändrat sin form');
  const barn = former.map((f, i) => klick(f, 2 + i * 5)).join('') + former.map((f, i) => helskarm(f, 2 + former.length * 5 + i)).join('');
  xml = `${xml.slice(0, -'</p:sld>'.length)}<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>${barn}</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing></p:sld>`;
  zip.file(fil, xml);
  if (datum) {
    const stund = datum.toISOString().replace(/\.\d{3}Z$/, 'Z');
    const egenskaper = zip.file('docProps/core.xml');
    if (egenskaper) zip.file('docProps/core.xml', (await egenskaper.async('string')).replace(/(<dcterms:(created|modified)[^>]*>)[^<]*</g, `$1${stund}<`));
    for (const del of Object.values(zip.files)) del.date = datum;
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
}
