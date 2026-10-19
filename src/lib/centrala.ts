// De centrala sakerna (Niclas 2026-10-14: "en ny typ av stil för en central sida, strategi eller mall. En metod kan ha
// det och även dela med andra den här huvudstrategin eller saken"): det en metod bygger på och som läraren behöver för
// hand. En sak är en sida, som Ta fram ett skrivkort, eller en pdf, som Lässtrategier. Registret är src/data/centrala.json,
// och en metod visar en sak med fältet centrala i sin fil (src/content.config.ts), sin egen sak eller en som flera metoder
// delar. Varje sak har samma blå knapp med sitt namn på fyra ställen i varje metod som visar den: under ingressen
// ([id].astro), överst i menyn och i texten direkt efter meningen som säger vad saken är (Metod.astro), och på metodens kort
// i metodbanken (Metodkort.astro). Word-filen har namnet och adressen som länk på samma ställe i texten (metoddocx.ts),
// och mejlet om en ny metod har en rad med länken (nytt.json.ts). En ny sak är en post i registret och raderna i
// metodfilerna, utan ny kod. scripts/utskriftsformat.mjs prövar efter bygget att varje sak finns och att den korta adressen
// leder dit. Modulen läser inga filer, eftersom webbläsaren bygger Word-filen med samma kod (metoddocx.ts).
//
// Varje sak hör till en del i rutan i metodbanken (Verktygsruta.astro, Niclas 2026-10-18): verktyg, det läraren tar fram
// under lektionen, eller stödmaterial, det läraren har till hands. Ett formulär, som Vår grupp, är ett tredje slag: en
// kort adress som leder till Googles sida för att kopiera formuläret och sammanställningen (netlify.toml, 302). Det visas
// av bladet i metoden som har fältet google med samma adress (Pabordet.astro), med bladets egen knapp och utan de blå
// knapparna, så att det inte blir två knappar för samma sak.
import data from '../data/centrala.json';
import { sammaRubrik } from './film';
import { fastaAntal } from './standard/index.js';

// Databasernas substantiv, som provet av fasta antal i registret letar efter (fastaAntal i standarden).
const DATABASENS_ORD = ['problem', 'problemen', 'texter', 'texterna', 'lästexter', 'faktatexter', 'skrivkort', 'kort', 'korten', 'aktiviteter', 'aktivitetskort', 'brainbreaks'];

/** En post i registret. adress är sidan, pdf:en under /stodundervisning/ eller formulärets korta adress. kort är en kort
 *  adress som Netlify leder till adress (netlify.toml) och som står i Word-filen. metod är metoden som saken hör till, när
 *  den inte är gemensam. del är rutans rubrik i metodbanken. mejl är det som följer på länken i mejlet om en ny metod. */
export type Central = { id: string; namn: string; slag: 'sida' | 'pdf' | 'formular'; del: 'verktyg' | 'stodmaterial'; adress: string; kort?: string; metod?: string; mejl: string };
export const CENTRALA = data as Central[];
export const centralAv = (id: string) => CENTRALA.find((c) => c.id === id);

/** Registrets fel, som stoppar bygget (src/content.config.ts). */
export function registerFel(): string[] {
  const fel: string[] = [];
  CENTRALA.forEach((c, i) => {
    const vem = `src/data/centrala.json, post ${i + 1} (${c.id ?? 'utan id'})`;
    if (!/^[a-z0-9-]+$/.test(c.id ?? '')) fel.push(`${vem}: id skrivs med a-z, 0-9 och bindestreck.`);
    if (CENTRALA.findIndex((x) => x.id === c.id) !== i) fel.push(`${vem}: id finns redan.`);
    if (!c.namn?.trim()) fel.push(`${vem}: namn är knappens text och saknas.`);
    if (c.slag !== 'sida' && c.slag !== 'pdf' && c.slag !== 'formular') fel.push(`${vem}: slag är sida, pdf eller formular.`);
    if (c.del !== 'verktyg' && c.del !== 'stodmaterial') fel.push(`${vem}: del är verktyg eller stodmaterial, rubriken i rutan i metodbanken.`);
    if (c.slag === 'formular' && (!/^\/[a-z0-9-]+$/.test(c.adress ?? '') || c.kort !== undefined || !c.metod)) fel.push(`${vem}: ett formulär har den korta adressen som adress (som /vargrupp, utan kort) och metoden vars blad har fältet google.`);
    if (c.slag === 'pdf' && !/^\/stodundervisning\/[a-z0-9-]+\.pdf$/.test(c.adress ?? '')) fel.push(`${vem}: en pdf ligger i public/stodundervisning/ och har adressen /stodundervisning/<namn>.pdf.`);
    if (c.slag === 'sida' && !/^\/[a-z0-9/-]+$/.test(c.adress ?? '')) fel.push(`${vem}: en sidas adress börjar med / och har inget filnamn.`);
    if (c.kort !== undefined && !/^\/[a-z0-9-]+$/.test(c.kort)) fel.push(`${vem}: kort är en adress med ett led, som /skrivkort.`);
    if (!c.mejl?.trim()) fel.push(`${vem}: mejl är det som följer på länken i mejlet om en ny metod och saknas.`);
    // Registret säger inte hur stora databaserna är: talen står på sidorna, som räknar dem (METODER.md under Antalen, K-450).
    for (const t of fastaAntal(`${c.namn ?? ''} ${c.mejl ?? ''}`, DATABASENS_ORD, ['teman', 'kategorier'])) fel.push(`${vem}: "${t}" är ett fast antal av en databas poster och slutar stämma när databasen växer. Skriv utan antal.`);
  });
  return fel;
}

/** Adressen som läraren skriver eller läser på papper: den korta, annars sakens egen. */
export const lasbarAdress = (c: Central) => c.kort ?? c.adress;

// Platserna i texten. Orden är filmernas (src/lib/film.ts), men knappen står direkt efter texten som öppnar avsnittet
// eller den fria tabellen, där meningen om saken står (riggens brev 2026-10-14: "Meningen sist i stället säger vad
// papperet är och att det finns på metodens sida, och knappen följer på den"), och inte sist i avsnittet som en film.
// I en fri tabell står texten före tabellen, och knappen står alltså mellan dem.
export const TEXTAVSNITT = ['fastnar', 'urval', 'roll', 'hem'] as const;
export type Textplats = { stycke: number } | { tabell: string } | { avsnitt: (typeof TEXTAVSNITT)[number] };
export const TEXTPLATS_FORMER = `ett avsnitt med text (${TEXTAVSNITT.join(', ')}), "tabell: <rubrik>" eller "stycke <N>" i inledningen, med N från 1`;
/** Tolkar fältet efterText; undefined när texten inte är en plats. */
export function tolkaTextplats(efter: string): Textplats | undefined {
  const t = efter.trim();
  const tabell = t.match(/^tabell:\s*(.+)$/);
  if (tabell) return { tabell: tabell[1].trim() };
  const stycke = t.match(/^stycke\s+([1-9]\d*)$/);
  if (stycke) return { stycke: Number(stycke[1]) };
  return (TEXTAVSNITT as readonly string[]).includes(t) ? { avsnitt: t as (typeof TEXTAVSNITT)[number] } : undefined;
}

type MetodForText = {
  pabordet?: { google?: string }[];
  inledning?: string[];
  tabeller?: { rubrik: string; text?: string }[];
  fastnar?: { text: string };
  urval?: { text: string[] };
  roll?: { text: string };
  hem?: { text: string[] };
  centrala?: { id: string; efterText: string }[];
};
/** Texten på platsen, som knappen följer på; undefined när platsen inte finns eller saknar text. */
function platsensText(d: MetodForText, p: Textplats): string | undefined {
  if ('stycke' in p) return d.inledning?.[p.stycke - 1];
  if ('tabell' in p) {
    const t = (d.tabeller ?? []).filter((x) => sammaRubrik(x.rubrik, p.tabell));
    return t.length === 1 ? t[0].text : undefined;
  }
  const v = d[p.avsnitt]?.text;
  return Array.isArray(v) ? v.join(' ') : v;
}
/** Beskedet när platsen inte finns, saknar text eller inte nämner saken, annars undefined. */
export function textplatsFel(d: MetodForText, c: Central, p: Textplats): string | undefined {
  if ('tabell' in p) {
    const antal = (d.tabeller ?? []).filter((x) => sammaRubrik(x.rubrik, p.tabell)).length;
    if (antal !== 1) return `${antal ? 'Flera' : 'Ingen'} fri tabell har rubriken "${p.tabell}" (hela rubriken eller ledet före kolon)`;
  }
  const text = platsensText(d, p);
  if (text === undefined) return 'stycke' in p ? `Inledningen har ${d.inledning?.length ?? 0} stycken` : 'tabell' in p ? `Tabellen "${p.tabell}" har ingen text att stå efter` : `Metoden har inget avsnitt ${p.avsnitt}`;
  // Knappen följer på meningen som säger vad saken är, så att läraren vet vad hen trycker på.
  if (!text.includes(c.namn)) return `Texten nämner inte ${c.namn}: knappen står efter meningen som säger vad saken är och var den finns`;
  return undefined;
}

const passar = (vid: Textplats, plats: Textplats) => ('stycke' in vid ? 'stycke' in plats && plats.stycke === vid.stycke
  : 'tabell' in vid ? 'tabell' in plats && sammaRubrik(plats.tabell, vid.tabell)
    : 'avsnitt' in plats && plats.avsnitt === vid.avsnitt);
/** Metodens centrala saker, i fältets ordning. */
export const metodensCentrala = (d: MetodForText): Central[] => (d.centrala ?? []).map((x) => centralAv(x.id)).filter((c): c is Central => !!c);
/** Sakerna vars knapp står efter texten på platsen. */
export const centralaVid = (d: MetodForText, plats: Textplats): Central[] => (d.centrala ?? []).filter((x) => { const v = tolkaTextplats(x.efterText); return v && passar(v, plats); }).map((x) => centralAv(x.id)).filter((c): c is Central => !!c);

/** Länkens attribut: en pdf öppnas i en ny flik, där läraren skriver ut den eller sparar den, och trycket räknas som
 *  andra utskrifter i statistiken (DRIFT.md under Besöksstatistik). En sida räknas som sida. */
export function centralLank(c: Central, metod: string, titel: string): Record<string, string> {
  if (c.slag === 'sida') return { href: c.adress };
  // Ett formulär räknas som bladets knapp Kopiera formuläret och sammanställningen (Pabordet.astro).
  if (c.slag === 'formular') return { href: c.adress, target: '_blank', rel: 'noopener', 'data-goatcounter-click': `google:${c.id}`, 'data-goatcounter-title': `${titel}: ${c.namn}, formuläret kopierat` };
  return { href: c.adress, target: '_blank', rel: 'noopener', 'data-goatcounter-click': `utskrift:${metod}/${c.id}`, 'data-goatcounter-title': `${titel}: ${c.namn} som pdf` };
}

const skyddad = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Knappen till en central sak som HTML: Centralknapp.astro ritar den, och länkningen i texten (src/lib/boklankar.ts)
 *  lägger den efter ett stycke som skickar läsaren till saken, så att knappen ser likadan ut överallt. */
export function centralKnappHtml(c: Central, metod: string, titel: string, klass = 'knapp', medTitel = false): string {
  const attr = Object.entries(centralLank(c, metod, titel)).map(([k, v]) => ` ${k}="${skyddad(v)}"`).join('');
  return `<a class="${skyddad(klass)}"${attr}>${skyddad(c.namn)}${medTitel ? `<span class="visually-hidden">: ${skyddad(titel)}</span>` : ''}${c.slag === 'pdf' ? '<span class="visually-hidden">, pdf</span>' : ''}</a>`;
}

/** Metoderna som en sak hör till men inte visar, och saker som ingen metod visar: fel som stoppar bygget ([id].astro). */
export function provaCentrala(metoder: { id: string; data: MetodForText }[]): void {
  const fel = CENTRALA.flatMap((c) => {
    // Ett formulär visas av bladet med fältet google, inte av fältet centrala.
    if (c.slag === 'formular') {
      const m = metoder.find((x) => x.id === c.metod);
      if (!m) return [`src/data/centrala.json: ${c.id} hör till ${c.metod}, som inte finns bland de publicerade metoderna.`];
      if (!m.data.pabordet?.some((b) => b.google === c.adress)) return [`${c.metod} har inget blad med google: ${c.adress}, som visar formuläret ${c.id}.`];
      if (metoder.some((x) => x.data.centrala?.some((y) => y.id === c.id))) return [`${c.id} är ett formulär och visas av bladets knapp; ta bort det ur fältet centrala.`];
      return [];
    }
    if (c.metod) {
      const m = metoder.find((x) => x.id === c.metod);
      if (!m) return [`src/data/centrala.json: ${c.id} hör till ${c.metod}, som inte finns bland de publicerade metoderna.`];
      if (!m.data.centrala?.some((x) => x.id === c.id)) return [`${c.metod} visar inte sin centrala sak ${c.id}: lägg den i fältet centrala med sin plats i texten.`];
    }
    if (!metoder.some((m) => m.data.centrala?.some((x) => x.id === c.id))) return [`src/data/centrala.json: ingen publicerad metod visar ${c.id}.`];
    return [];
  });
  if (fel.length) throw new Error(`De centrala sakerna:\n${fel.join('\n')}`);
}
