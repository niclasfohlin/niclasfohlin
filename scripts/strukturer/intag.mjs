#!/usr/bin/env node
// Intaget av strukturerna (K-650): läser grundbokens bank (docs/strukturer.md) och skriver en fil per struktur i
// src/content/strukturer/<id>.yaml. Banken är källan för namnet, andra namn, syftet och stegen (Niclas 2026-10-31), och
// intaget skriver om dem varje gång. Det sajten äger, slaget, bilden, förslagen, prövningen och om strukturen är ett
// utkast, står kvar. Banken läses med grundbokens egen scripts/strukturbank.js, så att namnen och stegen blir desamma.
//
//   node scripts/strukturer/intag.mjs [--bank <grundbokens rot>] [--slag <slagen.md>] [--prov]
//        --bank   förval C:/grundbok-repo
//        --slag   tabellen med slaget för en ny struktur (förval underlag/prov/strukturer/slagen.md); en ny struktur utan
//                 slag i tabellen stannar intaget
//        --prov   skriver inget: säger vilka strukturer som har ändrats i banken sedan intaget, och vilka som saknas
//
// Kontrollsumman i kalla.summa (strukturensSumma i standarden) är över de fält som kommer ur banken, och schemat stannar
// bygget när de har ändrats för hand. Netlify kan inte läsa grundbokens repo, så det är filerna här som byggs.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { slugAv, strukturensSumma, strukturensFel } from '../../src/lib/standard/index.js';

const ROT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAPP = join(ROT, 'src', 'content', 'strukturer');
const args = process.argv.slice(2);
const varde = (n, f) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : f; };
const BANK = varde('--bank', 'C:/grundbok-repo');
const SLAGFIL = varde('--slag', join(ROT, 'underlag', 'prov', 'strukturer', 'slagen.md'));
const prov = args.includes('--prov');

// Strukturer som enligt sajtens förslag till grundboken går upp i en annan som variant (Niclas 2026-10-31: "Jag säger
// ja", underlag/prov/strukturer/till-grundboken.md). De står som utkast tills banken har avgjort det, och deras bilder
// ritas inte. När banken har slagit ihop dem försvinner de ur banken och tas bort här.
const GAR_UPP_I = {
  'Frågerundan': 'Solfjäder', 'Vi jämför': 'EPK', 'Switcheroo!': 'En får gå', 'Kunskapsbanken': 'Snöbollar i mitten',
  'Påhittad': 'Sant eller falskt', 'Multisvar i par': 'Visa!',
};

if (!existsSync(join(BANK, 'docs', 'strukturer.md'))) { console.error(`Grundbokens bank finns inte i ${BANK}.`); process.exit(1); }
const require = createRequire(import.meta.url);
const bank = require(join(BANK, 'scripts', 'strukturbank.js'));
const banktext = readFileSync(join(BANK, 'docs', 'strukturer.md'), 'utf8');
const commit = execFileSync('git', ['-C', BANK, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
const poster = bank.poster(banktext);

// Slaget ur tabellen: | Struktur | Bankens gruppstorlek | Slag | Skäl |, där slaget kan ha ett frågetecken.
const slagen = new Map();
if (existsSync(SLAGFIL)) {
  for (const rad of readFileSync(SLAGFIL, 'utf8').split(/\r?\n/)) {
    const k = rad.split('|').map((c) => c.trim());
    if (k.length >= 5 && /^(Par|Grupp|Klass)/.test(k[3])) slagen.set(k[1], k[3].replace(/\s*\?$/, '').toLowerCase());
  }
}

const fran = (namn) => {
  const post = poster.find((p) => p.namn === namn);
  if (!post) throw new Error(`Registrets ${namn} har ingen post i banken`);
  return post.delar.filter((d) => d.del === 'Steg').map((d) => d.text.replace(/^\d+\.\s*/, ''));
};

if (!prov) mkdirSync(MAPP, { recursive: true });
const finns = new Set(existsSync(MAPP) ? readdirSync(MAPP).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => f.replace(/\.yaml$/, '')) : []);
const sedda = new Set(), andrade = [], nya = [], fel = [];
for (const r of bank.lasRegister(banktext)) {
  const id = slugAv(r.namn);
  sedda.add(id);
  const fil = join(MAPP, `${id}.yaml`);
  const forut = finns.has(id) ? YAML.parse(readFileSync(fil, 'utf8')) : null;
  const ur = { namn: r.namn, andra: r.andra, syfte: r.syfte, steg: fran(r.namn) };
  const summa = strukturensSumma(ur);
  if (forut && forut.kalla?.summa === summa) continue;
  if (forut) andrade.push(r.namn); else nya.push(r.namn);
  if (prov) continue;
  const slag = forut?.slag ?? slagen.get(r.namn);
  if (!slag) { fel.push(`${r.namn} är ny och har inget slag i ${SLAGFIL}`); continue; }
  const post = {
    ...ur,
    slag,
    kalla: { rubrik: r.namn, commit, summa },
    ...(forut?.bild ? { bild: forut.bild } : {}),
    ...(forut?.forslag ? { forslag: forut.forslag } : {}),
    ...(forut?.provad ? { provad: forut.provad } : {}),
    ...(GAR_UPP_I[r.namn] ? { vantar: `Går upp i ${GAR_UPP_I[r.namn]} som variant: förslag till grundboken 2026-10-31` } : forut?.vantar ? { vantar: forut.vantar } : {}),
    utkast: GAR_UPP_I[r.namn] ? true : forut?.utkast ?? true,
  };
  const brister = strukturensFel(post);
  if (brister.length) { fel.push(`${r.namn}: ${brister.join(' ')}`); continue; }
  const huvud = `# ${r.namn}. Namnet, andra namn, syftet och stegen kommer ur grundbokens bank (docs/strukturer.md) och skrivs om av\n# node scripts/strukturer/intag.mjs: ändra dem i banken. Slaget, bilden och förslagen är sajtens.\n`;
  writeFileSync(fil, huvud + YAML.stringify(post, { lineWidth: 0 }));
}
const borta = [...finns].filter((id) => !sedda.has(id));
const rader = [
  `Banken vid ${commit}: ${sedda.size} strukturer.`,
  nya.length ? `${prov ? 'Saknas på sajten' : 'Nya'} (${nya.length}): ${nya.join(', ')}.` : '',
  andrade.length ? `${prov ? 'Ändrade i banken sedan intaget' : 'Uppdaterade'} (${andrade.length}): ${andrade.join(', ')}.` : '',
  borta.length ? `På sajten men inte i banken (${borta.length}), ta bort dem om banken har slagit ihop eller strukit dem: ${borta.join(', ')}.` : '',
].filter(Boolean);
console.log(rader.join('\n'));
if (fel.length) { console.error(`Intaget stannade på ${fel.length}:\n  ${fel.join('\n  ')}`); process.exit(1); }
if (prov && (nya.length || andrade.length || borta.length)) process.exit(1);
