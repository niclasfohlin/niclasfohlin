import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import taggarData from './data/taggar.json';
import publikationerData from './data/publikationer.json';
import bildbankData from './data/bildbank.json';
import { BAGE, ordgrupper, utanStod } from './lib/lasflyt';
import { EFTER_FORMER, HOGST_EXTRAFILMER, platsFel, tolkaEfter } from './lib/film';

// Registren är den enda sanningen om vilka taggar och publikationer som finns.
// Ett okänt värde stoppar bygget med ett tydligt besked om vad som ska göras.

const taggIds = new Set(taggarData.taggar.map((t) => t.id));
const taggAlias = new Map<string, string>();
for (const t of taggarData.taggar) {
  for (const a of t.alias) taggAlias.set(a.toLowerCase(), t.id);
  taggAlias.set(t.label.toLowerCase(), t.id);
}

const publikationIds = new Set(publikationerData.publikationer.map((p) => p.id));
const publikationAlias = new Map<string, string>();
for (const p of publikationerData.publikationer) {
  for (const a of p.alias) publikationAlias.set(a.toLowerCase(), p.id);
  publikationAlias.set(p.namn.toLowerCase(), p.id);
}

const tagg = z.string().superRefine((varde, ctx) => {
  if (taggIds.has(varde)) return;
  const forslag = taggAlias.get(varde.toLowerCase());
  ctx.addIssue({
    code: 'custom',
    message: forslag
      ? `Taggen "${varde}" är ett alias. Använd "${forslag}".`
      : `Okänd tagg "${varde}". Använd en befintlig tagg från src/data/taggar.json eller lägg till den där först (kör npm run taggar för att se listan).`,
  });
});

const publikation = z.string().superRefine((varde, ctx) => {
  if (publikationIds.has(varde)) return;
  const forslag = publikationAlias.get(varde.toLowerCase());
  ctx.addIssue({
    code: 'custom',
    message: forslag
      ? `Publikationen "${varde}" skrivs "${forslag}".`
      : `Okänd publikation "${varde}". Lägg till den i src/data/publikationer.json först.`,
  });
});

const taggar = z.array(tagg).default([]);
const ingress = z.string().min(40, 'Ingressen ska vara minst 40 tecken.').max(320, 'Ingressen ska vara högst 320 tecken. Resten hör hemma i brödtexten.');

// Artiklar: texter som oftast är publicerade någon annanstans först.
const artiklar = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/artiklar' }),
  schema: z.object({
    titel: z.string(),
    ingress,
    datum: z.coerce.date(),
    publikation,
    originalUrl: z.url().optional(),
    typ: z.enum(['artikel', 'kronika', 'debatt', 'intervju', 'podd', 'annat']).default('artikel'),
    medforfattare: z.array(z.string()).default([]),
    taggar,
    utvald: z.boolean().default(false),
    // Sant bara när rättigheterna uttryckligen medger att hela texten ligger här.
    heltext: z.boolean().default(false),
    utkast: z.boolean().default(false),
  }),
});

// Böcker: presentation, omslag och länkar. Kategorin styr rubrikerna på /bocker.
export const bokKategorier = ['Kooperativt lärande', 'Pedagogik', 'Läromedel', 'Kapitel i andra böcker'] as const;
const bocker = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/bocker' }),
  schema: z.object({
    titel: z.string(),
    beskrivning: ingress,
    kategori: z.enum(bokKategorier),
    utgivningsar: z.number().int().min(1990).max(2100),
    forlag: z.string().optional(),
    medforfattare: z.array(z.string()).default([]),
    // För antologier: redaktören och titeln på Niclas kapitel.
    redaktor: z.string().optional(),
    kapitel: z.string().optional(),
    serie: z.string().optional(),
    isbn: z.string().optional(),
    sidor: z.number().int().positive().optional(),
    // Sökväg under public/, t.ex. /images/bocker/nycklar.jpg
    omslag: z.string().startsWith('/').optional(),
    lankar: z.array(z.object({ text: z.string(), url: z.url() })).default([]),
    taggar,
    utkast: z.boolean().default(false),
  }),
});

// Stödundervisning: metodbanken. Varje metod är en YAML-fil som följer samma modell,
// och sidan, utskriften och docx-filerna byggs ur samma data (src/lib/metoddocx.ts,
// src/components/Metod.astro). Exakt ett område, minst en årskursnivå. Delarna under
// "Modellen" är valfria: det som finns visas, i den ordning de står här.
const text = z.string().trim().min(1, 'Tomt fält.');
const stycken = z.array(text).min(1);
const ruta = z.strictObject({ rubrik: text, text });
// Rutorna överst i metoden (upplagg, gruppen, principer) svarar var på sin fråga och går att överblicka på en
// mobilskärm med luft runt: högst 600 tecken (Niclas 2026-10-03 via metodriggen: längre än så "börjar det bli osnyggt").
const RUTANS_GRANS = 600;
const overstaRuta = z.strictObject({ rubrik: text, text: text.max(RUTANS_GRANS, `En ruta överst i metoden har högst ${RUTANS_GRANS} tecken, så att den går att överblicka på en mobilskärm (Niclas 2026-10-03). Låt huvudbeskedet stå först och detaljerna stå där de hör hemma.`) });
// En film ur metodriggen (src/lib/film.ts): titel bara när filmen ska heta något annat än rubriken, längden, filmens
// steg i ord (textalternativet), rubriken och ingressen över stillbilderna och texten under var och en.
const filmFalt = z.strictObject({
  titel: text.optional(),
  sekunder: z.number().positive(),
  beskrivning: text,
  rubrik: text,
  ingress: text,
  stillbilder: z.array(z.strictObject({ text: text.max(55, 'Högst 55 tecken under en stillbild.') })).length(4, 'Filmen har fyra stillbilder.'),
  // Huvudfilmen står alltid direkt efter faktarutan; riggens äldre fält för platsen ger ett besked i stället för okänt fält.
  efterStycke: z.never({ error: 'Huvudfilmen står alltid efter faktarutan; ta bort efterStycke.' }).optional(),
  efter: z.never({ error: 'Huvudfilmen står alltid efter faktarutan; efter hör bara till extrafilmerna i filmer.' }).optional(),
});
// En punkt med valfri fet inledning: "Det finns inget facit." följt av förklaringen.
const punkt = z.strictObject({ fet: z.string().optional(), text: z.string().optional() }).refine((p) => p.fet || p.text, 'En punkt behöver fet eller text.');
// Tabell med rubrikrad där varje rad har lika många celler som rubriker.
// Ett fält i en ram: rubrik och text. Tom text är ett fält att fylla i; kursiv för mentortexter.
const ramFalt = z.strictObject({ rubrik: text, text: z.string().default(''), kursiv: z.boolean().default(false) });
const rubrikTabell = z.strictObject({ rubrik: text, kolumner: z.array(text).min(2), rader: z.array(z.array(z.string())).min(1) }).superRefine((tabell, ctx) => {
  tabell.rader.forEach((rad, i) => {
    if (rad.length !== tabell.kolumner.length) ctx.addIssue({ code: 'custom', path: ['rader', i], message: `Raden ska ha ${tabell.kolumner.length} celler, lika många som rubrikerna.` });
  });
});
const stodundervisning = defineCollection({
  loader: glob({ pattern: '**/[^_]*.yaml', base: './src/content/stodundervisning' }),
  schema: z.strictObject({
    titel: text,
    // Raden under rubriken, t.ex. "Lärarledd problemlösning i liten grupp för åk 4–9".
    undertitel: z.string().optional(),
    ingress,
    omrade: z.enum(['Matematik', 'Läsning', 'Skrivning', 'Socialt']),
    arskurs: z.array(z.enum(['F-3', '4-6', '7-9'])).min(1, 'Ange minst en årskursnivå.'),
    // Årskursen som läsaren ser när nivåerna inte säger det exakt, t.ex. "åk 3–6" för en metod
    // som ligger under F-3 och 4-6. Filtreringen i metodbanken använder alltid arskurs.
    arskursText: z.string().optional(),
    taggar,
    // Hur metoden används. Flera värden går bra.
    format: z.array(z.enum(['enskilt', 'par', 'liten grupp', 'helklass'])).default([]),
    // Faktarutan, fritext: "20 minuter per pass, två till tre pass i veckan", "Sex till åtta veckor", "Tre till åtta elever".
    tid: z.string().optional(),
    period: z.string().optional(),
    grupp: z.string().optional(),
    // Faktarutans material är egenskaper, som format (Niclas 2026-10-02: "Viktigaste och en länk till rätt ställe", och
    // ingen lång punktlista som gör att rutan växer neråt): högst sex korta delar som står på en rad, utan meningar.
    // Sidan länkar till metodens materialavsnitt eller lathunden för resten, och detaljerna står i metodens text.
    material: z.array(z.string()
      .max(40, 'En del i faktarutans material har högst 40 tecken: det viktigaste, som "tolv berättartärningar". Antal och detaljer står i metodens text.')
      .refine((s) => !/[.,:;]/.test(s), 'En del i faktarutans material är en egenskap, inte en mening: en sak per del, utan punkt, komma, kolon eller semikolon.'))
      .max(6, 'Faktarutans material har högst sex delar, det viktigaste. Allt material står i metodens materialavsnitt och lathunden.')
      .refine((m) => m.join(', ').length <= 110, 'Faktarutans material ryms på några rader: högst 110 tecken tillsammans. Ta färre eller kortare delar.')
      .default([]),
    uppdaterad: z.coerce.date().optional(),
    // Dagen metoden kom ut första gången. uppdaterad följer varje ändring (scripts/datumkoll.mjs), så när många metoder
    // ändras samma dag som en ny kommer ut står den nya ändå först på startsidan (Kompissamtal 2026-10-03).
    publicerad: z.coerce.date().optional(),
    // id på andra metoder som hör ihop med denna.
    relaterade: z.array(z.string()).default([]),
    utkast: z.boolean().default(false),

    // Serier (Ljudlek i grupp, 2026-09-29): en generell metod med en lektionsbank, och lektioner som är egna metoder.
    // En lektion har serie (den generella metodens id), formaga (numret på förmågan i banken) och tranar (vad eleven
    // tränar, som det står i banken). Den generella metoden har lektionsbanken: förmågorna i ordning med nummer, namn
    // och skälet till platsen. Banken byggs ur lektionerna (src/lib/serie.ts), så att en ny lektion bara är en ny fil
    // och en borttagen lektion försvinner ur banken, metodbanken och menyerna utan att den generella metoden ändras.
    serie: z.string().optional(),
    formaga: z.number().int().positive().optional(),
    tranar: z.string().optional(),
    // Filmerna ur metodriggen (Niclas 2026-09-30, src/lib/film.ts), i riggens format. film är huvudfilmen: den står
    // direkt efter faktarutan, och dess fyra stillbilder på sidan 1 i Word och i utskriften. filmer är högst två
    // extrafilmer, nr 2 och 3, var och en vid momentet den förklarar (efter): sist i ett avsnitt, efter en fri tabell
    // eller ram, efter ett steg eller efter ett stycke i inledningen. En extrafilm kräver en huvudfilm. Filerna hittas
    // genom metodens id och filmens nummer: <id>-film.svg och <id>-film-1.svg … -4.svg, <id>-film2.svg och -1.svg … -4.svg.
    film: filmFalt.optional(),
    filmer: z.array(filmFalt.extend({
      nr: z.union([z.literal(2), z.literal(3)], { error: 'nr är 2 eller 3: filerna heter <id>-film2.svg och <id>-film3.svg.' }),
      efter: text.refine((v) => tolkaEfter(v) !== undefined, { error: `efter är ${EFTER_FORMER}.` }),
    })).max(HOGST_EXTRAFILMER, `Högst ${HOGST_EXTRAFILMER} extrafilmer utöver huvudfilmen.`).default([]),
    lektionsbank: z.strictObject({
      rubrik: z.string().default('Lektionsbanken'),
      text: z.string().optional(),
      formagor: z.array(z.strictObject({ nr: z.number().int().positive(), namn: text, skal: z.string().optional() })).min(1),
      not: z.string().optional(),
    }).optional(),

    // Modellen. Ett stycke per rad i listorna; en rad inuti en cell blir en ny rad i cellen.
    inledning: stycken,
    upplagg: overstaRuta.optional(),
    // Så sätter du ihop gruppen: vilka elever som väljs och hur insatsen presenteras för dem.
    gruppen: overstaRuta.optional(),
    principer: overstaRuta.optional(),
    // Passrutinen. Ett steg är en text, eller text med fas (namnet på en rad i tidsschemat). Har stegen
    // faser ritas rutinen, tidsschemat och arbetsformen som en enda passöversikt: fasremsan med minuter
    // och arbetsform, och en tabell med en rad per fas (fas och tid, rutinens steg, vad som händer),
    // med raderna Före passet (ur tidsschemat) och Efter passet (efterPasset).
    passrutin: z.strictObject({
      rubrik: z.string().default('Passrutin: samma ordning varje gång'),
      text: z.string().optional(),
      steg: z.array(z.union([z.string(), z.strictObject({ text, fas: text })])).min(1),
      efter: z.string().optional(),
      efterPasset: z.string().optional(),
      // Vad passets delar kallas i rubrikerna. delar när metoden använder ordet steg för något annat, som lästrappan i
      // Upprepad läsning: då står Del, Rutinen i N delar och Delarna där det annars står Fas, Rutinen i N steg och Stegen (K-065).
      kallas: z.enum(['steg', 'delar']).default('steg'),
    }).optional(),
    tidsschema: z.strictObject({
      rubrik: z.string(),
      text: z.string().optional(),
      rader: z.array(z.strictObject({ tid: z.string(), fas: z.string(), vad: z.string() })).min(1),
      efter: z.string().optional(),
    }).optional(),
    steg: z.strictObject({
      rubrik: z.string().default('Vad du gör och säger i varje steg'),
      text: z.string().optional(),
      fraserRubrik: z.string().default('Exempelfraser: tänk högt och fråga'),
      rader: z.array(z.strictObject({
        namn: z.string(),
        fraga: z.string().optional(),
        gor: z.string(),
        fraser: z.array(z.string()).default([]),
      })).min(1),
    }).optional(),
    // Arbetsformens delar är den övergripande arbetsformen (Läraren visar, Gemensamt, I par, Enskilt, med "igen" när
    // gruppen går tillbaka), inte passets moment; se METODER.md, Arbetsformen i remsan. faser: vilka faser i
    // tidsschemat delen spänner över, för passöversiktens remsa; faser i följd med samma arbetsform blir en del.
    arbetsform: z.strictObject({
      rubrik: z.string(),
      text: z.string(),
      delar: z.array(ruta.extend({ faser: z.array(text).optional() })).min(1),
    }).optional(),
    // Fria tabeller med rubrikrad, t.ex. Chambers frågetyper eller faktatextens strukturer.
    tabeller: z.array(z.strictObject({
      rubrik: z.string(),
      text: z.string().optional(),
      plats: z.enum(['efter-inledning', 'efter-tidsschema', 'efter-steg', 'efter-arbetsform', 'efter-fastnar', 'efter-urval', 'efter-grund']).default('efter-arbetsform'),
      // meny: tabellen står i sidans meny, efter avsnittet den ligger efter, med rubrikens första led som namn. För det läraren
      // letar efter varje pass, som Ljudstarten, Dagens ljud och Ordbanken i Ljudlek i grupp (läsbarheten 2026-09-29).
      meny: z.boolean().optional(),
      kolumner: z.array(text).min(2),
      rader: z.array(z.array(z.string())).min(1),
      not: z.string().optional(),
    }).superRefine((tabell, ctx) => {
      tabell.rader.forEach((rad, i) => {
        if (rad.length !== tabell.kolumner.length) ctx.addIssue({ code: 'custom', path: ['rader', i], message: `Raden ska ha ${tabell.kolumner.length} celler, lika många som rubrikerna.` });
      });
    })).default([]),
    exempel: z.strictObject({
      rubrik: z.string().default('Exempel: så går ett pass till'),
      valt: ruta,
      text: stycken,
      // Visar lathundens tavla (blocket tavla i lathund.mall) efter exemplet, med en valfri text under.
      tavla: z.boolean().default(false),
      tavlaText: z.string().optional(),
    }).optional(),
    fastnar: z.strictObject({
      rubrik: z.string(),
      text: z.string(),
      fragaForst: z.array(z.string()).min(1),
      trappaText: z.string().default('En stödtrappa att gå uppför i stunden. Ge inte nästa steg förrän de har prövat det föregående:'),
      trappa: z.array(z.string()).min(1),
      efter: z.string().optional(),
      motto: z.string().optional(),
    }).optional(),
    roll: z.strictObject({
      rubrik: z.string(),
      text: z.string(),
      gor: z.array(z.string()).min(1),
      undvik: z.array(z.string()).min(1),
    }).optional(),
    urval: z.strictObject({
      rubrik: z.string(),
      text: stycken,
      kravText: z.string().optional(),
      krav: z.array(ruta).min(1),
    }).optional(),
    // Hem och skola: för insatser där hemmet gör en del av arbetet. Text, ett kontrakt med var och
    // ens ansvar, och ett schema att fylla i (en sida i planeringsmallarna).
    hem: z.strictObject({
      rubrik: z.string().default('Hem och skola'),
      text: stycken,
      kontrakt: z.strictObject({
        rubrik: z.string().default('Kontrakt'),
        inledning: text,
        ansvar: z.array(ruta).min(1),
        efter: z.string().optional(),
      }).optional(),
      schema: z.strictObject({
        rubrik: text,
        text: z.string().optional(),
        kolumner: z.array(text).min(2),
        rader: z.number().int().min(1).default(15),
      }).optional(),
    }).optional(),
    progression: z.strictObject({
      rubrik: z.string().default('Progression över insatsperioden'),
      text: z.string().optional(),
      // Första kolumnens rubrik: Vecka för en insats över veckor, Pass för en som räknas i pass.
      enhet: z.string().default('Vecka'),
      // led: överlämnandets led under veckan, t.ex. Jag gör, Vi gör, Ni gör tillsammans, Du gör själv.
      rader: z.array(z.strictObject({ vecka: z.string(), led: z.string().optional(), fokus: z.string(), roll: z.string() })).min(1),
    }).optional(),
    uppfoljning: z.strictObject({
      rubrik: z.string().default('Följ upp effekten'),
      text: z.string().optional(),
      rader: z.array(z.strictObject({ nar: z.string(), vad: z.string() })).min(1),
    }).optional(),
    mal: z.strictObject({
      rubrik: z.string().default('Mål: vad eleven ska kunna göra efter insatsen'),
      text: z.string().default('Efter perioden ska eleven oftare kunna:'),
      punkter: z.array(z.string()).min(1),
    }).optional(),
    snabbmall: z.strictObject({
      rubrik: z.string().default('Snabbmall'),
      text: z.string().optional(),
      fore: z.array(z.string()).min(1),
      efter: z.array(z.string()).min(1),
    }).optional(),
    checklista: z.strictObject({
      rubrik: z.string().default('Checklista inför passet'),
      punkter: z.array(z.string()).min(1),
    }).optional(),
    grund: z.strictObject({
      rubrik: z.string().default('Kort om grunden'),
      text: z.string(),
      kallor: z.string().optional(),
    }).optional(),
    // Ramar: färdiga berättelseramar, textramar eller liknande som metoden arbetar i, sist på sidan
    // efter grunden. Varje ram har en inledning, en valfri översikt (tabell) och delar med fält.
    // En ram där alla fält är tomma är en mall att fylla i: på sidan visas bara inledningen, i
    // planeringsmallarna blir den sidor med skrivrum. huvud är fält att fylla i före delarna.
    ramar: z.strictObject({
      rubrik: z.string().default('Ramarna'),
      text: stycken,
      ramar: z.array(z.strictObject({
        rubrik: text,
        text: stycken,
        oversikt: z.strictObject({ kolumner: z.array(text).min(2), rader: z.array(z.array(z.string())).min(1) }).optional(),
        // Listor: elevmaterial i ramen (ordlistor, bokstäver, meningar, en kort text), flera per ram.
        // Kolumnrubriker bara när de betyder något; utan dem ritas listan utan rubrikrad. Ritas stort,
        // för att läggas på bordet och pekas i. Lärarnoten (delar) står före listorna på sidan och i
        // Word-filen med allt, efter dem i elevkopiorna. En kolumn där alla rader är tomma, bredvid kolumner
        // med text, blir en smal skrivkolumn för en kort anteckning, och listan är då lärarens protokoll i
        // vanlig textstorlek (kartläggningens Före och Efter). Ramens huvud står överst i den första listan.
        listor: z.array(z.strictObject({
          rubrik: z.string().optional(),
          kolumner: z.array(text).min(1).optional(),
          rader: z.array(z.array(z.string()).min(1)).min(1),
          // Lärarens lista bland elevens (kartläggningens uppgifter som läraren läser upp): står i husets typsnitt, inte
          // elevens (K-130, riggens docs/elevmaterial.md). Ett protokoll med skrivkolumn känns igen av sig självt.
          larare: z.boolean().optional(),
          // En bild över varje ord (Kompissamtal, kortet Peka på känslan, 2026-10-03): varje ord har en bild i bildbanken,
          // och sidan, utskriften och Word ritar bilden över ordet, för de yngsta som inte läser (metodriggens bildlistor).
          bilder: z.boolean().optional(),
        }).superRefine((l, ctx) => {
          const n = l.kolumner?.length ?? l.rader[0].length;
          l.rader.forEach((r, i) => { if (r.length !== n) ctx.addIssue({ code: 'custom', path: ['rader', i], message: `Raden ska ha ${n} celler, som ${l.kolumner ? 'rubrikerna' : 'första raden'}.` }); });
        })).optional(),
        huvud: z.array(ramFalt).optional(),
        delar: z.array(z.strictObject({ rubrik: text, falt: z.array(ramFalt).min(1) })).min(1),
        // Sagoformen (Skrivkurs: sagoboken, Niclas 2026-10-02: mallarna ska kännas som sagor, med kurbits överst och en
        // drake som ram, och "Du behåller såklart all snygg design på alla mallar"): ramen ritas i Word som blad i en
        // sagobok (sagoblad i src/lib/metoddocx.ts, ornamenten i src/lib/sagoform.js, båda ur metodriggen). form: vag
        // (sagans väg), berg (Spänningsberget), portratt (hjältens kort), kort (listorna som kort, två på ett A4), omslag,
        // sida och forfattare (bokens blad, utan sidfot), skyltar (vägskyltarna, två på ett A4). ram: lindorm eller
        // slinga (förval). bilder: bildbankens ord för stationerna, i fältens ordning. sidor: sagans väg på flera blad.
        // radMm: radernas höjd. rita: en ruta att rita i bredvid raderna. kortbilder: stationens rundel i stället för
        // radens nummer, per lista och rad (null ger en prick).
        sagoform: z.strictObject({
          form: z.enum(['vag', 'berg', 'portratt', 'kort', 'omslag', 'sida', 'forfattare', 'skyltar']),
          ram: z.enum(['lindorm', 'slinga']).optional(),
          titel: z.string().optional(),
          undertitel: z.string().optional(),
          bilder: z.array(z.string()).optional(),
          sidor: z.number().int().min(1).max(4).optional(),
          radMm: z.number().min(5).max(20).optional(),
          rita: z.boolean().optional(),
          kortbilder: z.record(z.string(), z.array(z.string().nullable())).optional(),
        }).optional(),
      })).min(1),
      efter: z.string().optional(),
    }).optional(),
    // Diplom eller intyg att dela ut efter perioden: en sida i planeringsmallarna. En rad som bara
    // består av understreck blir en skrivlinje.
    diplom: z.strictObject({
      kicker: z.string().optional(),
      rubrik: z.string().default('Diplom'),
      text: z.array(text).min(1),
      underskrifter: z.array(text).default([]),
    }).optional(),
    // Kort att klippa och hålla i handen (bråkkursen): listor i ramarna vars rubrik innehåller någon av texterna
    // ritas som kort med streckad kant, på sidan och i Word. Rubrikens två första led ("Vecka 1 · Pass 1") är
    // kortens grupp: i Word börjar varje grupp på ny sida, och meningskorten får gruppen och ett nummer i hörnet.
    // kopior: listor vars rubrik innehåller texten ritas i så många exemplar i Word, som problemet ett per par.
    // Samma form som metodriggens rigg.json (src/lib/brak.ts har reglerna).
    kort: z.strictObject({
      listor: z.array(z.string()).min(1),
      kopior: z.record(z.string(), z.number().int().min(2).max(10)).optional(),
    }).optional(),
    // Elevens blad: fälten i en ram får en höjd i cm, så att eleven kan skriva och rita i dem och bladet fyller
    // sidan i planeringsmallarna. Nyckeln är ramens rubrik, och fälten heter som i ramen.
    elevblad: z.record(z.string(), z.record(z.string(), z.number().positive().max(20))).default({}),
    // Mallar att skriva ut, klippa och lägga på bordet: bråkplanket och tallinjerna, sist i planeringsmallarna på
    // liggande A4 och som bilder på sidan. Det hela är langdCm långt (standard 26) i planket och på linjen från 0
    // till 1, så att bitarna kan läggas mot linjen. En linje till 2 är lika lång som linjen till 1, så där är det
    // hela hälften så långt. radhojd och mellanrum är i twips, som i riggen.
    // typ matta är ett blad att lägga material på (decimalmattan): kolumner med namnet i ett band, höga rutor som
    // fyller en liggande sida, ett decimalkomma efter kolumn nummer komma och regeln i foten (fot). Med enPerSida
    // får varje kolumn ett eget stående A4 (ett ark per talsort för tiobas). En mattas text är till läraren och står
    // bara på sidan; på bladet står underraden (En matta per elev · Namn).
    // typ rutnat är mattans form med rader: ett band med kolumnnamnen, som får vara tomma för att eleven skriver dem
    // ("Vad kan rubrikerna vara?"), och rader rutor som fyller sidan: sexfältaren, jämförelsetabellen, tabellmallen.
    // typ flode är rutor i följd med en pil mellan och namnet i ett band överst: tidslinjen, orsak-verkan-kedjan,
    // problem-lösning-rutan. Båda är elevblad på liggande A4; texten är till läraren och står bara på sidan.
    mallar: z.array(z.strictObject({
      rubrik: text,
      text: z.string().optional(),
      typ: z.enum(['brakplank', 'tallinjer', 'matta', 'rutnat', 'flode']),
      rader: z.number().int().min(1).max(12).optional(),
      // Ett tomt namn är en rubrik som eleven skriver själv; bara ett rutnät får ha det (se superRefine nedan).
      kolumner: z.array(z.string().trim()).min(1).optional(),
      komma: z.number().int().positive().optional(),
      underrad: z.string().optional(),
      fot: z.string().optional(),
      enPerSida: z.boolean().optional(),
      namnare: z.array(z.number().int().positive()).optional(),
      etiketter: z.boolean().optional(),
      langdCm: z.number().positive().optional(),
      radhojd: z.number().int().positive().optional(),
      mellanrum: z.number().int().positive().optional(),
      linjer: z.array(z.strictObject({ till: z.number().int().positive(), delar: z.number().int().positive(), langdCm: z.number().positive().optional() })).optional(),
    })).default([]),

    // Lathunden: fyra sidor ur Niclas snabbguide (Metoden, Ett pass, Mallen, Material). Egen sida
    // /stodundervisning/<id>/lathund, utskrift i liggande A4 och Word-fil. Faktarutorna passlängd,
    // grupp och period hämtas från tid, grupp och period ovan; kraven från urval, checklistan och
    // snabbmallen från metoden, så att lathunden aldrig säger emot metoden.
    lathund: z.strictObject({
      innehall: text,
      metoden: z.strictObject({
        text: stycken,
        ruta: z.strictObject({ rubrik: text, inledning: z.string().optional(), punkter: z.array(punkt).min(1), efter: z.string().optional() }),
        tabell: rubrikTabell,
        not: z.string().optional(),
      }),
      pass: z.strictObject({
        rubrik: text,
        textRubrik: text,
        // Knappen som skriver ut bara textrutan. Utan värde: "Skriv ut passexemplet" när textRubrik börjar med Gruppen
        // (lärarens berättelse om passet), annars "Skriv ut till eleverna" (passUtskrift i src/lib/metod.ts, K-074).
        utskrift: z.string().optional(),
        titel: z.string().optional(),
        text: stycken,
        forberett: z.strictObject({ rubrik: text, text: stycken }),
        klarTidigt: z.string().optional(),
        schema: z.strictObject({
          rubrik: text,
          rader: z.array(z.strictObject({ tid: text, fas: text, vad: text, fraser: z.array(z.string()).default([]) })).min(1),
        }),
      }),
      mall: z.strictObject({
        rubrik: text,
        underrad: z.string().optional(),
        block: z.array(z.discriminatedUnion('typ', [
          z.strictObject({ typ: z.literal('spalter'), kolumner: z.array(z.strictObject({ namn: text, fraga: text })).min(2), rader: z.number().int().min(1).default(5) }),
          z.strictObject({ typ: z.literal('skrivruta'), rubrik: text, text: z.string().optional(), rader: z.number().int().min(1).default(3) }),
          z.strictObject({
            typ: z.literal('tavla'),
            text,
            fraga: text,
            listor: z.array(z.strictObject({ rubrik: text, punkter: z.array(text).min(1) })).min(1),
            tabell: rubrikTabell,
            annat: z.strictObject({ rubrik: text, rader: z.array(text).min(1) }).optional(),
            svar: z.string().optional(),
            citat: z.array(z.string()).default([]),
          }),
          z.strictObject({ typ: z.literal('snabbmall') }),
          rubrikTabell.extend({ typ: z.literal('tabell') }),
          z.strictObject({ typ: z.literal('kedja'), rubrik: text, steg: z.array(text).min(2), citat: z.string().optional() }),
          z.strictObject({ typ: z.literal('not'), text }),
        ])).min(1),
      }),
      material: z.strictObject({
        rubrik: text,
        kravEtikett: z.string().default('Textkrav'),
        var: z.strictObject({ rubrik: text, punkter: z.array(punkt).min(1), efter: z.string().optional() }),
        bordet: z.array(text).min(1),
        varjePass: z.string().optional(),
      }),
    }).optional(),
  }).superRefine((d, ctx) => {
    // En lektion har serie, formaga och tranar tillsammans, och ingen egen lektionsbank. Att serien och förmågan finns
    // prövas i src/lib/serie.ts, där alla metoder är kända.
    const lektionsfalt = [d.serie, d.formaga, d.tranar].filter((x) => x !== undefined).length;
    if (lektionsfalt > 0 && lektionsfalt < 3) ctx.addIssue({ code: 'custom', path: ['serie'], message: 'En lektion i en serie har serie, formaga och tranar, alla tre.' });
    if (d.serie && d.lektionsbank) ctx.addIssue({ code: 'custom', path: ['lektionsbank'], message: 'En lektion kan inte ha en egen lektionsbank.' });
    // Extrafilmerna: en huvudfilm först, egna nummer och en plats som finns, så att filmen står där den förklarar i
    // sidan, utskriften och Word-filen (src/lib/film.ts).
    if (d.filmer.length && !d.film) ctx.addIssue({ code: 'custom', path: ['filmer'], message: 'En extrafilm kräver en huvudfilm (fältet film), som står efter faktarutan.' });
    // Varje film hittas i Word och i utskriften genom rubriken och ingressen (scripts/paritet.mjs), så de är filmens egna.
    const nycklar = [d.film, ...d.filmer].filter((f) => f !== undefined).map((f) => `${f.rubrik}\n${f.ingress}`);
    nycklar.forEach((n, i) => { if (nycklar.indexOf(n) !== i) ctx.addIssue({ code: 'custom', path: ['filmer', i - 1, 'rubrik'], message: 'Två filmer har samma rubrik och ingress; ge filmen en egen rubrik.' }); });
    d.filmer.forEach((f, i) => {
      const sti = ['filmer', i, 'efter'];
      if (d.filmer.findIndex((x) => x.nr === f.nr) !== i) ctx.addIssue({ code: 'custom', path: ['filmer', i, 'nr'], message: `Två extrafilmer har nr ${f.nr}; filerna skulle krocka.` });
      const v = tolkaEfter(f.efter);
      const fel = v && platsFel(d, v);
      if (fel) ctx.addIssue({ code: 'custom', path: sti, message: `${fel}.` });
    });
    // Förmågorna numreras i följd från 1, så att en lektions formaga aldrig pekar på en annan förmåga än den skrevs för.
    d.lektionsbank?.formagor.forEach((f, i) => { if (f.nr !== i + 1) ctx.addIssue({ code: 'custom', path: ['lektionsbank', 'formagor', i, 'nr'], message: `Förmågan "${f.namn}" ska ha nummer ${i + 1}: förmågorna numreras i följd från 1.` }); });
    // Lathundens block snabbmall hämtar metodens snabbmall; utan den skulle blocket tyst försvinna.
    if (d.lathund?.mall.block.some((b) => b.typ === 'snabbmall') && !d.snabbmall) {
      ctx.addIssue({ code: 'custom', path: ['lathund', 'mall', 'block'], message: 'Blocket snabbmall kräver att metoden har en snabbmall.' });
    }
    // Tavlan i exemplet hämtas ur lathunden.
    if (d.exempel?.tavla && !d.lathund?.mall.block.some((b) => b.typ === 'tavla')) {
      ctx.addIssue({ code: 'custom', path: ['exempel', 'tavla'], message: 'exempel.tavla kräver ett block av typen tavla i lathund.mall.' });
    }
    // Passöversikten: stegens faser och arbetsformens faser måste finnas som rader i tidsschemat.
    const faser = new Set((d.tidsschema?.rader ?? []).map((r) => r.fas.toLowerCase()));
    const medFas = (d.passrutin?.steg ?? []).filter((s): s is { text: string; fas: string } => typeof s !== 'string');
    if (medFas.length && !d.tidsschema) ctx.addIssue({ code: 'custom', path: ['passrutin', 'steg'], message: 'Steg med fas kräver ett tidsschema med samma faser.' });
    for (const s of medFas) if (!faser.has(s.fas.toLowerCase())) ctx.addIssue({ code: 'custom', path: ['passrutin', 'steg'], message: `Fasen "${s.fas}" finns inte som rad i tidsschemat.` });
    if (medFas.length && medFas.length !== d.passrutin!.steg.length) ctx.addIssue({ code: 'custom', path: ['passrutin', 'steg'], message: 'Antingen har alla steg en fas eller inget.' });
    for (const del of d.arbetsform?.delar ?? []) for (const f of del.faser ?? []) if (!faser.has(f.toLowerCase())) ctx.addIssue({ code: 'custom', path: ['arbetsform', 'delar'], message: `Fasen "${f}" finns inte som rad i tidsschemat.` });
    // Lathundens pass är tidsschemat minut för minut: samma faser i samma ordning och samma tider (utan "min",
    // Före passet som Före), med stegnumret "N · " framför de faser som är steg och numren i följd från 1. Så säger
    // lathunden aldrig emot sidan, och ett fel i riggens intag stoppar bygget i stället för att hittas i bilderna.
    if (d.lathund && d.tidsschema) {
      const lh = d.lathund.pass.schema.rader;
      const ts = d.tidsschema.rader;
      const sti = ['lathund', 'pass', 'schema', 'rader'];
      const tid = (t: string) => t.replace(/-/g, '–').replace(/\s*min$/, '').replace(/^Före passet$/, 'Före');
      if (lh.length !== ts.length) ctx.addIssue({ code: 'custom', path: sti, message: `Lathundens pass har ${lh.length} rader och tidsschemat ${ts.length}; de ska vara samma faser.` });
      let nr = 0;
      lh.forEach((r, i) => {
        const m = r.fas.match(/^(\d+) · (.+)$/);
        if (m && Number(m[1]) !== ++nr) ctx.addIssue({ code: 'custom', path: [...sti, i, 'fas'], message: `"${r.fas}" ska ha stegnumret ${nr}: numren går i följd från 1.` });
        const t = ts[i];
        if (!t) return;
        const fas = m ? m[2] : r.fas;
        if (fas !== t.fas) ctx.addIssue({ code: 'custom', path: [...sti, i, 'fas'], message: `Rad ${i + 1} i lathundens pass heter "${fas}" men "${t.fas}" i tidsschemat.` });
        if (tid(r.tid) !== tid(t.tid)) ctx.addIssue({ code: 'custom', path: [...sti, i, 'tid'], message: `Rad ${i + 1} i lathundens pass (${fas}) har tiden "${r.tid}" men "${t.tid}" i tidsschemat.` });
      });
      // Tabellen på lathundens första sida: en cell som börjar med "N · Fas" och tiden "A–B min" på nästa rad ska ha
      // fasens starttid och sluttiden för fasen eller en senare fas (ett steg kan spänna över flera faser).
      const spann = (t: string) => t.match(/^(\d+)[–-](\d+) min/);
      d.lathund.metoden.tabell.rader.forEach((rad, i) => {
        const m = (rad[0] ?? '').match(/^\d+ · ([^\n]+)\n(\d+)[–-](\d+) min/);
        if (!m) return;
        const [, namn, fran, till] = m;
        const cell = ['lathund', 'metoden', 'tabell', 'rader', i, 0];
        const j = ts.findIndex((t) => t.fas === namn);
        if (j < 0) { ctx.addIssue({ code: 'custom', path: cell, message: `"${namn}" i lathundens tabell finns inte som fas i tidsschemat.` }); return; }
        const slut = ts.slice(j).map((t) => spann(t.tid)?.[2]);
        if (spann(ts[j].tid)?.[1] !== fran || !slut.includes(till)) ctx.addIssue({ code: 'custom', path: cell, message: `"${namn}" har tiden ${fran}–${till} min i lathundens tabell men ${ts[j].tid} i tidsschemat.` });
      });
    }
    // Elevens blad: ramen och fälten måste finnas, annars får bladet tyst ingen höjd.
    for (const [ramnamn, falt] of Object.entries(d.elevblad)) {
      const ram = d.ramar?.ramar.find((r) => r.rubrik === ramnamn);
      if (!ram) { ctx.addIssue({ code: 'custom', path: ['elevblad', ramnamn], message: `Ramen "${ramnamn}" finns inte.` }); continue; }
      const namn = new Set(ram.delar.flatMap((del) => del.falt.map((f) => f.rubrik)));
      for (const f of Object.keys(falt)) if (!namn.has(f)) ctx.addIssue({ code: 'custom', path: ['elevblad', ramnamn, f], message: `Fältet "${f}" finns inte i ramen "${ramnamn}".` });
    }
    // Läskorten (K-063): en lista med två kolumner där den ena har bågtecken är en lästräningstext. Kolumnen utan stöd
    // ska vara samma text utan bågar, ordfog och bindestreck, ingen båge får ha fler än fyra ord, och en text har fem
    // till åtta meningar, som i metodriggen. Annars stoppar bygget, så att korten aldrig säger emot varandra.
    (d.ramar?.ramar ?? []).forEach((ram, ri) => (ram.listor ?? []).forEach((l, li) => {
      if ((l.kolumner ?? []).length !== 2) return;
      const k = [0, 1].find((ci) => l.rader.some((r) => (r[ci] ?? '').includes(BAGE)));
      if (k === undefined) return;
      const sti = ['ramar', 'ramar', ri, 'listor', li];
      if (l.rader.length < 5 || l.rader.length > 8) ctx.addIssue({ code: 'custom', path: sti, message: `Lästräningstexten "${l.rubrik ?? ''}" har ${l.rader.length} meningar; den ska ha fem till åtta.` });
      l.rader.forEach((r, i) => {
        if (utanStod(r[k] ?? '') !== (r[1 - k] ?? '')) ctx.addIssue({ code: 'custom', path: [...sti, 'rader', i], message: `Meningen utan stöd ska vara "${utanStod(r[k] ?? '')}", men är "${r[1 - k] ?? ''}".` });
        for (const g of ordgrupper(r[k] ?? '')) if (g.filter((ord) => /\p{L}/u.test(ord)).length > 4) ctx.addIssue({ code: 'custom', path: [...sti, 'rader', i], message: `Bågen "${g.join(' ')}" har fler än fyra ord.` });
      });
    }));
    // Korten: varje text ska träffa minst en lista i ramarna, annars ritas inga kort.
    const listrubriker = (d.ramar?.ramar ?? []).flatMap((r) => (r.listor ?? []).map((l) => l.rubrik ?? ''));
    for (const t of d.kort?.listor ?? []) if (!listrubriker.some((r) => r.includes(t))) ctx.addIssue({ code: 'custom', path: ['kort', 'listor'], message: `Ingen lista i ramarna har "${t}" i rubriken.` });
    d.mallar.forEach((m, i) => { if (m.typ === 'tallinjer' && !m.linjer?.length) ctx.addIssue({ code: 'custom', path: ['mallar', i, 'linjer'], message: 'Tallinjer kräver minst en linje.' }); });
    d.mallar.forEach((m, i) => { if ((m.typ === 'matta' || m.typ === 'rutnat' || m.typ === 'flode') && !m.kolumner?.length) ctx.addIssue({ code: 'custom', path: ['mallar', i, 'kolumner'], message: `Mallen ${m.typ} kräver minst en kolumn.` }); });
    d.mallar.forEach((m, i) => { if (m.typ === 'flode' && (m.kolumner?.length ?? 0) < 2) ctx.addIssue({ code: 'custom', path: ['mallar', i, 'kolumner'], message: 'Ett flöde kräver minst två rutor.' }); });
    d.mallar.forEach((m, i) => { if (m.typ !== 'rutnat' && m.kolumner?.some((k) => !k)) ctx.addIssue({ code: 'custom', path: ['mallar', i, 'kolumner'], message: `Bara ett rutnät får ha tomma kolumnnamn; mallen ${m.typ} behöver namn i varje kolumn.` }); });
    d.mallar.forEach((m, i) => { if (m.komma && m.komma >= (m.kolumner?.length ?? 0)) ctx.addIssue({ code: 'custom', path: ['mallar', i, 'komma'], message: 'Kommat står efter en kolumn som har fler kolumner efter sig.' }); });
    // Citattecknen går jämnt ut i varje stycke, och en radbrytning börjar ett nytt (K-174, Skrivkurs: sagoboken
    // 2026-10-02: musens saga i pass 1 saknade sitt avslutande citattecken, och en mening i tidsschemat hade ett för mycket).
    // "åk" och siffran efter står ihop med ett hårt mellanslag, så att raden aldrig bryts mellan dem, som metodriggens
    // build/tecken.mjs skriver dem (K-188: de äldre metoderna hade vanligt mellanslag på 58 ställen, de nyare hårt).
    const citat = (x: unknown, sti: (string | number)[]): void => {
      if (typeof x === 'string') {
        for (const stycke of x.split('\n')) if ((stycke.match(/”/g) ?? []).length % 2) ctx.addIssue({ code: 'custom', path: sti, message: `Citattecknen ” går inte jämnt ut i stycket "${stycke.length > 90 ? `${stycke.slice(0, 90)}…` : stycke}": ett saknas eller är för mycket.` });
        const ak = x.match(/(?<!\p{L})[åÅ]k (?=\d)/u);
        if (ak) ctx.addIssue({ code: 'custom', path: sti, message: `Skriv "åk" och siffran efter med hårt mellanslag (U+00A0), så att raden inte bryts mellan dem: "…${x.slice(Math.max(0, ak.index! - 30), ak.index! + 12)}…".` });
      } else if (Array.isArray(x)) x.forEach((y, i) => citat(y, [...sti, i]));
      else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) citat(v, [...sti, k]);
    };
    citat(d, []);
    // Sagoformens bilder finns i bildbanken, och kortbilder nämner ramens egna listor, annars saknas rundeln på bladet.
    const iBildbanken = (ord: string) => !!(bildbankData as { ord: Record<string, string> }).ord[ord.trim().toLowerCase()];
    // En lista med bilder har en bild till varje ord, annars står ordet utan sitt ansikte.
    (d.ramar?.ramar ?? []).forEach((r, ri) => (r.listor ?? []).forEach((l, li) => {
      if (l.bilder) for (const ord of l.rader.flat()) if (ord.trim() && !iBildbanken(ord)) ctx.addIssue({ code: 'custom', path: ['ramar', 'ramar', ri, 'listor', li, 'bilder'], message: `Ordet "${ord}" har ingen bild i bildbanken (public/bildbank/ och src/data/bildbank.json), så listan kan inte ritas med bilder.` });
    }));
    (d.ramar?.ramar ?? []).forEach((r, ri) => {
      const s = r.sagoform;
      if (!s) return;
      const sti = ['ramar', 'ramar', ri, 'sagoform'];
      for (const ord of [...(s.bilder ?? []), ...Object.values(s.kortbilder ?? {}).flat()]) if (ord && !iBildbanken(ord)) ctx.addIssue({ code: 'custom', path: sti, message: `Bilden "${ord}" finns inte i bildbanken (public/bildbank/ och src/data/bildbank.json).` });
      for (const lista of Object.keys(s.kortbilder ?? {})) if (!(r.listor ?? []).some((l) => l.rubrik === lista)) ctx.addIssue({ code: 'custom', path: sti, message: `kortbilder nämner listan "${lista}", som ramen inte har.` });
    });
  }),
});

export const collections = { artiklar, bocker, stodundervisning };
