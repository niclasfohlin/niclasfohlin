import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import taggarData from './data/taggar.json';
import publikationerData from './data/publikationer.json';

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
// En punkt med valfri fet inledning: "Det finns inget facit." följt av förklaringen.
const punkt = z.strictObject({ fet: z.string().optional(), text: z.string().optional() }).refine((p) => p.fet || p.text, 'En punkt behöver fet eller text.');
// Tabell med rubrikrad där varje rad har lika många celler som rubriker.
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
    omrade: z.enum(['Matematik', 'Läsning', 'Skrivning']),
    arskurs: z.array(z.enum(['F-3', '4-6', '7-9'])).min(1, 'Ange minst en årskursnivå.'),
    taggar,
    // Hur metoden används. Flera värden går bra.
    format: z.array(z.enum(['enskilt', 'par', 'liten grupp', 'helklass'])).default([]),
    // Faktarutan, fritext: "20 minuter per pass, två till tre pass i veckan", "Sex till åtta veckor", "Tre till åtta elever".
    tid: z.string().optional(),
    period: z.string().optional(),
    grupp: z.string().optional(),
    material: z.array(z.string()).default([]),
    uppdaterad: z.coerce.date().optional(),
    // id på andra metoder som hör ihop med denna.
    relaterade: z.array(z.string()).default([]),
    utkast: z.boolean().default(false),

    // Modellen. Ett stycke per rad i listorna; en rad inuti en cell blir en ny rad i cellen.
    inledning: stycken,
    upplagg: ruta.optional(),
    principer: ruta.optional(),
    passrutin: z.strictObject({
      rubrik: z.string().default('Passrutin: samma ordning varje gång'),
      text: z.string().optional(),
      steg: z.array(z.string()).min(1),
      efter: z.string().optional(),
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
    arbetsform: z.strictObject({
      rubrik: z.string(),
      text: z.string(),
      delar: z.array(ruta).min(1),
    }).optional(),
    // Fria tabeller med rubrikrad, t.ex. Chambers frågetyper eller faktatextens strukturer.
    tabeller: z.array(z.strictObject({
      rubrik: z.string(),
      text: z.string().optional(),
      plats: z.enum(['efter-steg', 'efter-arbetsform']).default('efter-arbetsform'),
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
    progression: z.strictObject({
      rubrik: z.string().default('Progression över insatsperioden'),
      text: z.string().optional(),
      // Första kolumnens rubrik: Vecka för en insats över veckor, Pass för en som räknas i pass.
      enhet: z.string().default('Vecka'),
      rader: z.array(z.strictObject({ vecka: z.string(), fokus: z.string(), roll: z.string() })).min(1),
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
    // Lathundens block snabbmall hämtar metodens snabbmall; utan den skulle blocket tyst försvinna.
    if (d.lathund?.mall.block.some((b) => b.typ === 'snabbmall') && !d.snabbmall) {
      ctx.addIssue({ code: 'custom', path: ['lathund', 'mall', 'block'], message: 'Blocket snabbmall kräver att metoden har en snabbmall.' });
    }
  }),
});

export const collections = { artiklar, bocker, stodundervisning };
