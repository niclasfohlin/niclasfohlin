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
    typ: z.enum(['artikel', 'kronika', 'debatt', 'intervju', 'annat']).default('artikel'),
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

// Stödundervisning: metodbanken. Exakt ett område, minst en årskursnivå.
const stodundervisning = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/stodundervisning' }),
  schema: z.object({
    titel: z.string(),
    ingress,
    omrade: z.enum(['Matematik', 'Läsning', 'Skrivning']),
    arskurs: z.array(z.enum(['F-3', '4-6', '7-9'])).min(1, 'Ange minst en årskursnivå.'),
    taggar,
    // Hur metoden används. Flera värden går bra.
    format: z.array(z.enum(['enskilt', 'par', 'liten grupp', 'helklass'])).default([]),
    // Fritext, t.ex. "10 minuter per pass, fyra pass i veckan".
    tid: z.string().optional(),
    material: z.array(z.string()).default([]),
    uppdaterad: z.coerce.date().optional(),
    // id på andra metoder som hör ihop med denna.
    relaterade: z.array(z.string()).default([]),
    utkast: z.boolean().default(false),
  }),
});

export const collections = { artiklar, bocker, stodundervisning };
