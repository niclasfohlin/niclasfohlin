#!/usr/bin/env node
// Månadsbrevet för hand (K-730). Brevet går ut av sig självt den 1 varje månad från netlify/functions/manadsbrev.mjs. Det här
// skriptet bygger samma brev med samma kod när det ska provas eller skickas utanför tiden, som oktobers brev 2026-11-08, och
// gör också mejlens provfiler. Nyckeln till GoatCounter läses ur GC_NYCKEL och Brevos ur miljön eller .env, och ingen skrivs ut.
//
//   node scripts/manadsbrev.mjs --manad 2026-10 --ut brev.html     bygger brevet till en fil
//   node scripts/manadsbrev.mjs --manad 2026-10 --kampanj          skapar kampanjen i Brevo utan att skicka, och skriver dess id
//   node scripts/manadsbrev.mjs --prov <id> --till <adress>        skickar ett provmejl av kampanjen
//   node scripts/manadsbrev.mjs --schemalagg <id> <tid>            lägger kampanjen på tiden, som 2026-11-08T07:00:00+01:00
//
//   --lokalt              läser nytt.json ur dist och inte från sajten
//   --kom-ur-git          räknar månadens nya ur dagen då filen kom in i git, för en månad innan utskicket sparade dagen
//   --metoder-fran <dag> --metoder-till <dag> --metoder-not <text>
//                         listan Metoder ur en annan period, som när Metoder kom sist i oktober
//   --ps <text>           en mening först i brevets P.S., en gång
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { periodensBesok, sidornasBesok } from '../netlify/lib/goatcounter.mjs';
import { manaden, manadensBrev } from '../netlify/lib/manadsbrev.mjs';
import { manadsMejl } from '../netlify/lib/mejl.mjs';
import { AVSANDARE, SVAR_TILL, brevo } from '../netlify/lib/utskick.mjs';

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SAJT = 'https://niclasfohlin.se';
const args = process.argv.slice(2);
const flagga = (namn) => { const i = args.indexOf(`--${namn}`); return i < 0 ? undefined : args[i + 1] ?? true; };
const brevoNyckel = () => {
  if (process.env.BREVO_API_KEY) return process.env.BREVO_API_KEY.trim();
  const fil = join(ROT, '.env');
  const rad = existsSync(fil) ? readFileSync(fil, 'utf8').split(/\r?\n/).find((r) => r.startsWith('BREVO_API_KEY=')) : undefined;
  if (!rad) throw new Error('BREVO_API_KEY saknas i miljön och i .env.');
  return rad.slice('BREVO_API_KEY='.length).replace(/^["']|["']$/g, '').trim();
};
const listId = () => {
  if (process.env.BREVO_LIST_ID) return Number(process.env.BREVO_LIST_ID);
  return 2; // Lista 2 Prenumeranter (DRIFT.md under Brevo).
};

if (flagga('prov')) {
  await brevo(`/emailCampaigns/${flagga('prov')}/sendTest`, { emailTo: [flagga('till')] }, brevoNyckel());
  console.log(`Provmejlet av kampanj ${flagga('prov')} är skickat.`);
  process.exit(0);
}
if (flagga('schemalagg')) {
  const [id, tid] = args.slice(args.indexOf('--schemalagg') + 1);
  const res = await fetch(`https://api.brevo.com/v3/emailCampaigns/${id}`, { method: 'PUT', headers: { 'api-key': brevoNyckel(), 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduledAt: tid }) });
  if (!res.ok) throw new Error(`Brevo svarade ${res.status}: ${(await res.text()).slice(0, 300)}`);
  console.log(`Kampanj ${id} går ${tid}.`);
  process.exit(0);
}

const manad = manaden(flagga('manad') ?? '');
const gc = process.env.GC_NYCKEL;
if (!gc) throw new Error('GC_NYCKEL saknas i miljön.');
const { poster, samlingar } = flagga('lokalt') ? JSON.parse(readFileSync(join(ROT, 'dist', 'nytt.json'), 'utf8')) : await (await fetch(`${SAJT}/nytt.json`)).json();
const adresser = poster.map((p) => p.url);

// Dagen då varje post kom in i git, ur en enda fråga till git.
function komUrGit() {
  const ut = {};
  const MAPPAR = { artiklar: '/artiklar', bocker: '/bocker', stodundervisning: '/stodundervisning', undervisningsmetoder: '/metoder' };
  let dag = '';
  for (const rad of execSync('git log --reverse --diff-filter=A --format=%ad --date=short --name-only -- src/content/artiklar src/content/bocker src/content/stodundervisning src/content/undervisningsmetoder', { cwd: ROT, encoding: 'utf8', maxBuffer: 1 << 26 }).split(/\r?\n/)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rad)) dag = rad;
    const m = rad.match(/^src\/content\/([a-z]+)\/([^_/][^/]*)\.(md|yaml)$/);
    if (m && MAPPAR[m[1]]) ut[`${MAPPAR[m[1]]}/${m[2]}`] ??= dag;
  }
  return ut;
}

const period = { start: manad.start, slut: manad.slut };
const besok = await sidornasBesok(gc, adresser, period);
const brevet = manadensBrev({ besok, poster, samlingar, summa: await periodensBesok(gc, period), kom: flagga('kom-ur-git') ? komUrGit() : {}, manad });
if (flagga('metoder-fran')) {
  const andra = await sidornasBesok(gc, adresser, { start: new Date(`${flagga('metoder-fran')}T00:00:00+01:00`), slut: new Date(`${flagga('metoder-till')}T00:00:00+01:00`) });
  const metoder = manadensBrev({ besok: andra, poster, samlingar, kom: {}, manad }).listor.find((l) => l.namn === 'Metoder');
  if (!metoder) throw new Error('Perioden för listan Metoder har inga besök.');
  metoder.not = flagga('metoder-not');
  const i = brevet.listor.findIndex((l) => l.namn === 'Metoder');
  if (i >= 0) brevet.listor[i] = metoder; else brevet.listor.splice(1, 0, metoder);
}
if (flagga('ps')) brevet.ps = flagga('ps');
const html = manadsMejl(brevet, SAJT);
console.log(`${brevet.amne}, ${Math.round(Buffer.byteLength(html) / 1024)} kB`);
console.log(`Mest läst: ${brevet.mest?.map((x) => x.titel).join(', ')} (${brevet.mestOrd})`);
console.log(`Månadens nya: ${brevet.nyast?.titel}: ${brevet.nyast?.rad}`);
console.log(brevet.summa ?? '');
for (const l of brevet.listor) console.log(`${l.namn}: ${l.rader.map((r) => `${r.titel} (${r.besok})`).join(', ')}`);
if (flagga('ut')) writeFileSync(flagga('ut'), html);
if (flagga('kampanj')) {
  const k = await brevo('/emailCampaigns', { name: `Månadsbrev ${manad.nyckel}: ${brevet.amne}`, subject: brevet.amne, previewText: brevet.pre, sender: AVSANDARE, replyTo: SVAR_TILL, htmlContent: html, recipients: { listIds: [listId()] } }, brevoNyckel());
  console.log(`Kampanj ${k.id} är skapad och väntar. Inget är skickat.`);
}
