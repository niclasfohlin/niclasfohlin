// Verktyget Strukturer (K-650, underlag/prov/strukturer/UPPDRAGET.md): strukturerna ur grundbokens bank som sidor,
// /strukturer med alla och /strukturer/<id> för en, med bilden, stegen, förslagen och strukturkortet att skriva ut.
// Strukturerna står i src/content/strukturer/, en per fil; bilderna ritas i bygget ur scenerna i scripts/strukturer/scener/
// (src/pages/strukturer/[id].svg.ts), och korten är pdf:er som scripts/strukturer/kort.mjs gör med Chrome och som
// committas, med manifestet src/data/strukturkort.json. Bygget stannar på en struktur som visas men vars kort saknas eller
// är äldre än strukturen, och på ett manifest som är äldre än filen med alla kort.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CollectionEntry } from 'astro:content';
import { publicerade } from './innehall';
import { STRUKTURENS_SLAG, strukturkortetsInnehall, strukturkortetsFil, STRUKTURKORTEN_ALLA } from './standard/index.js';
import manifest from '../data/strukturkort.json';
import topplistan from '../data/strukturer-topp.json';

export type Struktur = CollectionEntry<'strukturer'>;
export type Slag = keyof typeof STRUKTURENS_SLAG;

/** Verktygets sida. */
export const STRUKTURERNAS_ADRESS = '/strukturer';
export const strukturensAdress = (id: string) => `/strukturer/${id}`;
export const bildensAdress = (id: string) => `/strukturer/${id}.svg`;
export const kortetsAdress = (id: string) => `/strukturer/kort/${strukturkortetsFil(id)}`;
export const ALLA_KORTENS_ADRESS = `/strukturer/kort/${STRUKTURKORTEN_ALLA.fil}`;

/** Slagen i verktygets ordning, med en rad om vad slaget är. */
export const SLAGEN: { slag: Slag; namn: string; farg: string; ljus: string; text: string }[] = [
  { slag: 'par', ...STRUKTURENS_SLAG.par, text: 'Eleverna arbetar två och två.' },
  { slag: 'grupp', ...STRUKTURENS_SLAG.grupp, text: 'Tre eller fler arbetar ihop vid sitt bord.' },
  { slag: 'klass', ...STRUKTURENS_SLAG.klass, text: 'Hela klassen rör sig eller står i en form samtidigt.' },
];

/** Slagets färg som css-variabel, för style på kortet, raden och sidan. */
export const slagensStil = (slag: string) => `--slag: ${STRUKTURENS_SLAG[slag as Slag].farg}; --slag-ljus: ${STRUKTURENS_SLAG[slag as Slag].ljus}`;

/** Förslagens områden, med namnet och färgen, i den ordning de står på sidan. */
export const OMRADENA = {
  lasning: { namn: 'Läsning', farg: 'var(--farg-lasning)' },
  skrivning: { namn: 'Skrivning', farg: 'var(--farg-skrivning)' },
  matematik: { namn: 'Matematik', farg: 'var(--farg-accent)' },
  socialt: { namn: 'Socialt', farg: 'var(--farg-socialt)' },
} as const;

type Manifest = Record<string, { innehall?: string; summa?: string; kb: number; kort?: string[] }>;
const MANIFESTET = manifest as Manifest;
const scenen = (scen: string) => readFileSync(join(process.cwd(), 'scripts', 'strukturer', 'scener', `${scen}.yaml`), 'utf8');

let provat = false;
// Korten är pdf:er som görs i förväg: ett kort som saknas eller är äldre än strukturen stoppar bygget, så att ett kort
// aldrig visar andra steg än sidan.
function provaKorten(alla: Struktur[]) {
  if (provat) return;
  const fel: string[] = [];
  for (const s of alla) {
    const m = MANIFESTET[s.id];
    if (!m) fel.push(`${s.data.namn}: kortet saknas i src/data/strukturkort.json`);
    else if (m.innehall !== strukturkortetsInnehall(s.data, scenen(s.data.bild!.scen))) fel.push(`${s.data.namn}: kortet är äldre än strukturen eller scenen`);
    if (!existsSync(join(process.cwd(), 'public', 'strukturer', 'kort', strukturkortetsFil(s.id)))) fel.push(`${s.data.namn}: public/strukturer/kort/${strukturkortetsFil(s.id)} saknas`);
  }
  const allas = MANIFESTET[STRUKTURKORTEN_ALLA.nyckel]?.kort ?? [];
  if (alla.length && [...allas].sort().join() !== alla.map((s) => s.id).sort().join()) fel.push('Filen med alla kort har inte samma strukturer som sidan');
  if (fel.length) throw new Error(`Strukturkorten:\n  ${fel.join('\n  ')}\nGör om dem med node scripts/strukturer/kort.mjs --vid-behov (npm run validera gör det).`);
  provat = true;
}

/** Strukturerna som visas, efter namnet. De som går upp i en annan struktur (vantar) visas inte. */
export async function strukturerna(): Promise<Struktur[]> {
  const alla = (await publicerade('strukturer')).filter((s) => !s.data.vantar && s.data.bild).sort((a, b) => a.data.namn.localeCompare(b.data.namn, 'sv'));
  provaKorten(alla);
  return alla;
}

/** Kortets adress med version, för listans hämtningar, som länkarna på sidorna får av scripts/filversion.mjs. */
export const kortetsAdressMedVersion = (id: string) => `${kortetsAdress(id)}?v=${(MANIFESTET[id]?.summa ?? '').slice(0, 8)}`;

/** Filen med alla korts storlek, som "6 MB" eller "800 kB". */
export function allaKortensStorlek(): string {
  const kb = MANIFESTET[STRUKTURKORTEN_ALLA.nyckel]?.kb ?? 0;
  return kb >= 1000 ? `${(kb / 1024).toFixed(1).replace('.', ',')} MB` : `${kb} kB`;
}

/**
 * Topplistan när bygget gjordes: de strukturer som visats och skrivits ut mest de senaste 30 dagarna, ur GoatCounter
 * (src/data/strukturer-topp.json, som scripts/strukturer/topplistan.mjs skriver). Sidan visar den när minst fem strukturer
 * har besök (Niclas 2026-10-31: "en topplista över de 5 mest tittade på och nedladdade strukturerna").
 */
export function topplistanIBygget(finns: Set<string>): string[] {
  const t = topplistan as { strukturer: { id: string; antal: number }[] };
  const ids = t.strukturer.filter((x) => x.antal > 0 && finns.has(x.id)).map((x) => x.id);
  return ids.length >= 5 ? ids.slice(0, 5) : [];
}

/** Platshållarna i bankens steg står i kursiv, som *frågan*: som html, med resten av texten skyddad. */
export const stegHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*([^*]+)\*/g, '<em>$1</em>');
