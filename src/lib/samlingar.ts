// Samlingarna med egna sidor (Niclas 2026-10-31: "Du behöver bygga så allt funkar av sig själv hela tiden. Inga drifter", och
// "Det skulle funnits någon spärr eller test som hittat det jag frågar om"): en rad per mapp i src/content vars poster har en
// sida på sajten, så att en ny samling kommer med överallt där det nya syns utan att någon behöver minnas det. Nyckeln är
// mappen i src/content och samlingens namn i src/content.config.ts. Raden har adressens led, namnet för läsaren ur
// huvudsidornas titlar i src/data/site.ts, namnet i bestämd form för en mening, flödet när delen har ett och planens sida när
// metoderna har en plan. Ordningen är ordningen i listorna, med metoderna först, eftersom de flesta besöken går dit.
//
// Det som räknar upp sajtens poster läser tabellen: delningskorten (src/lib/delningskort.ts), alla poster i sin ordning
// (samlingarnasPoster i src/lib/innehall.ts), taggarnas sidor (src/pages/taggar/), statistiksidan (src/pages/statistik.astro),
// sidan som inte finns (src/pages/404.astro) och prenumerationssidan (src/pages/prenumerera.astro), och skripten
// scripts/taggar.mjs och scripts/cacheprov.mjs. En samling som står här men saknas i en av sidornas tabeller stannar astro
// check, och src/content.config.ts stannar bygget på en samling som varken står här eller i UTAN_SIDA. cacheprov.mjs stannar
// på en ny mapp i src/content som inte står här, och på en post med sida som saknas i nytt.json, flödena, webbplatskartan och
// taggarnas sidor eller som har delens delningskort.
//
// Modulen läser inga filer och importerar bara sajtens grunddata, så att skripten kan läsa den med Node.
import type { CollectionKey } from 'astro:content';
import { site } from '../data/site.ts';

export interface Samling {
  /** Adressens led: posten står på /<led>/<id> och delens sida på /<led>. */
  led: string;
  /** Namnet för läsaren, som i menyn: delens titel i src/data/site.ts. */
  namn: string;
  /** Namnet i en mening: "Gå till startsidan, Stödundervisning, Metoder, artiklarna eller böckerna." */
  bestamd: string;
  /** Delens eget flöde, med vad det har i prenumerationssidans mening. Alla delar står också i /rss.xml. */
  flode?: { adress: string; vad: string };
  /** Planens sida under posten, /<led>/<id>/<sida>, med namnet. Statistikens händelser för planen heter efter SAMLINGARNAS_LED i standarden. */
  plan?: { sida: string; namn: string };
}

export const SAMLINGAR = {
  stodundervisning: { led: 'stodundervisning', namn: site.sidor.stodundervisning.titel, bestamd: site.sidor.stodundervisning.titel, flode: { adress: '/stodundervisning/rss.xml', vad: 'bara metoder i stödundervisning' }, plan: { sida: 'planera', namn: 'Planera insatsen' } },
  undervisningsmetoder: { led: 'metoder', namn: site.sidor.metoder.titel, bestamd: site.sidor.metoder.titel, flode: { adress: '/metoder/rss.xml', vad: 'bara metoder för hela klassen' }, plan: { sida: 'lar-dig', namn: 'Lär dig metoden' } },
  artiklar: { led: 'artiklar', namn: site.sidor.artiklar.titel, bestamd: 'artiklarna', flode: { adress: '/artiklar/rss.xml', vad: 'bara artiklar' } },
  bocker: { led: 'bocker', namn: site.sidor.bocker.titel, bestamd: 'böckerna' },
} as const satisfies Partial<Record<CollectionKey, Samling>>;

export type SamlingNyckel = keyof typeof SAMLINGAR;
/** Samlingarna i listornas ordning. */
export const SAMLINGARNA = Object.keys(SAMLINGAR) as SamlingNyckel[];

/** Mapparna i src/content utan egna sidor, med skälet. */
export const UTAN_SIDA = {
  matteproblem: 'posterna står i Ta fram ett matteproblem och i metodens bank, utan egen sida',
  faktateman: 'temana står i Ta fram en faktatext, utan egen sida',
  strukturer: 'utkast tills verktyget Strukturer får sina sidor i K-650 (underlag/prov/strukturer/UPPDRAGET.md, fas 6)',
} as const satisfies Partial<Record<CollectionKey, string>>;

/** Samlingens rad, med alla fält, också de som raden saknar. */
export const samlingen = (samling: SamlingNyckel): Samling => SAMLINGAR[samling];
/** Postens adress, /<led>/<id>. */
export const postensAdress = (samling: SamlingNyckel, id: string) => `/${SAMLINGAR[samling].led}/${id}`;
/** Delens sida, /<led>. */
export const delensAdress = (samling: SamlingNyckel) => `/${SAMLINGAR[samling].led}`;
