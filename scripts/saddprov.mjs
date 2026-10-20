// Såddprovet (Niclas 2026-10-20): ett nytt stödmaterial som flera metoder kan dela, som Utveckla högläsning, prövas mot
// alla metoder, och det sås bara där det stöder en central del av metoden och det eleverna tränar: "Tänker att en sådan
// stödmall som kommer ska testas för seeding ... Och bara göra så när den faktiskt stöder en central del av metoden och
// vad de tränar på ... en bedömning som gör att det inte överdrivs och blir massor, utan när det passar." Regeln och de
// tre frågorna står i METODER.md under De centrala sakerna (Sådden).
//
//   node scripts/saddprov.mjs <sakens id>      sållar fram kandidaterna med belägg: metoderna som tränar det saken stöder
//                                              och där eleverna gör det i passet; bedömningen skrivs i src/data/sadd.json
//   node scripts/saddprov.mjs --kontrollera    i npm run validera: stannar på en delad sak utan prov, på en metod som visar
//                                              en sak utan att stå bland dess ja, på en kandidat som ingen har bedömt och
//                                              på en metod med fler än två delade stödmaterial
//
// En delad sak är en post i src/data/centrala.json utan metod och som inte är ett formulär. Skriptet sållar, människan
// bedömer: det ord eller den tagg som skriptet hittar räcker aldrig för ett ja.
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAPP = join(rot, 'src/content/stodundervisning');
const REGISTER = join(rot, 'src/data/sadd.json');
const HOGST = 2;
// De tre frågorna läses ur METODER.md under De centrala sakerna (Sådden), där regeln står, så att de inte står på två ställen.
const handbok = readFileSync(join(rot, 'METODER.md'), 'utf8');
const FRAGOR = handbok.slice(handbok.indexOf('Sådden (')).split(/\r?\n/).filter((r) => /^\| [123]\. /.test(r)).slice(0, 3).map((r) => r.split('|').slice(1, 3).map((x) => x.trim()).join(' Ja när: '));
if (FRAGOR.length !== 3) { console.error('saddprov: hittar inte de tre frågorna i METODER.md under De centrala sakerna (Sådden).'); process.exit(1); }

const centrala = JSON.parse(readFileSync(join(rot, 'src/data/centrala.json'), 'utf8'));
const register = JSON.parse(readFileSync(REGISTER, 'utf8'));
const delade = centrala.filter((c) => !c.metod && c.slag !== 'formular');
const metoder = readdirSync(MAPP).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => ({ id: f.replace(/\.yaml$/, ''), d: parseYaml(readFileSync(join(MAPP, f), 'utf8')) })).filter((m) => m.d.utkast !== true);

// Passets kärna: rutinen, tidsschemat, stegen, arbetsformen och exemplet på ett pass.
const karnan = (d) => [
  d.passrutin?.text, ...(d.passrutin?.steg ?? []).map((s) => s.text),
  d.tidsschema?.text, ...(d.tidsschema?.rader ?? []).map((r) => r.vad),
  ...(d.steg?.rader ?? []).flatMap((r) => [r.fraga, r.gor, ...(r.fraser ?? [])]),
  d.arbetsform?.text, ...(d.arbetsform?.delar ?? []).map((x) => x.text),
  ...[d.exempel?.text ?? []].flat(),
].filter((s) => typeof s === 'string' && s.trim());
const visar = (d, id) => (d.centrala ?? []).some((c) => c.id === id);
const citat = (s, i) => `"…${s.slice(Math.max(0, i - 60), i + 80).replace(/\s+/g, ' ').trim()}…"`;

function salla(id) {
  const s = register.saker?.[id];
  if (!s?.tranar?.length || !s?.karna?.length) return null;
  const monster = s.karna.map((k) => new RegExp(k, 'i'));
  return metoder.map((m) => {
    const tranar = (m.d.taggar ?? []).filter((t) => s.tranar.includes(t));
    const belagg = [];
    for (const t of karnan(m.d)) for (const r of monster) { const i = t.search(r); if (i >= 0 && belagg.length < 2) belagg.push(citat(t, i)); }
    return { id: m.id, titel: m.d.titel, arskurs: m.d.arskursText ?? (m.d.arskurs ?? []).join(', '), tranar, belagg, visar: visar(m.d, id), kandidat: tranar.length > 0 && belagg.length > 0 };
  });
}

if (process.argv.includes('--kontrollera')) {
  const fel = [];
  const vantar = [];
  for (const c of delade) {
    const s = register.saker?.[c.id];
    if (!s?.provad || !s.tranar?.length || !s.karna?.length) { fel.push(`${c.id}: ny delad sak utan såddprov. Skriv tranar och karna i src/data/sadd.json, kör node scripts/saddprov.mjs ${c.id}, bedöm varje kandidat med de tre frågorna och skriv ja och nej med skäl och provad med datumet (METODER.md under De centrala sakerna).`); continue; }
    for (const m of metoder) {
      const ja = !!s.ja?.[m.id];
      if (visar(m.d, c.id) && !ja) fel.push(`${m.id} visar ${c.id} utan att stå bland dess ja i src/data/sadd.json. Bedöm metoden med de tre frågorna och skriv in den.`);
      if (ja && !visar(m.d, c.id)) vantar.push(`${m.id} (${c.id})`);
    }
    // Saker som såddes före provet (fore) prövas bara åt ena hållet: ingen metod visar dem utan ett ja.
    if (s.fore) continue;
    for (const k of salla(c.id).filter((x) => x.kandidat && !s.ja?.[x.id] && !s.nej?.[x.id])) fel.push(`${k.id} är en kandidat för ${c.id} som ingen har bedömt (tränar ${k.tranar.join(', ')}, i passet ${k.belagg[0]}). Kör node scripts/saddprov.mjs ${c.id} och skriv ja eller nej med skäl.`);
  }
  for (const m of metoder) {
    const n = (m.d.centrala ?? []).filter((x) => delade.some((c) => c.id === x.id && c.del === 'stodmaterial')).length;
    if (n > HOGST) fel.push(`${m.id} visar ${n} delade stödmaterial. Högst ${HOGST}: välj de två som stöder metodens kärna mest.`);
  }
  if (fel.length) { console.error(`Såddprovet stoppar:\n  ${fel.join('\n  ')}`); process.exit(1); }
  console.log(`Såddprovet: ${delade.length} delade saker är prövade mot ${metoder.length} metoder, och varje metod som visar en av dem står bland dess ja${vantar.length ? `; väntar på metodens mening: ${vantar.join(', ')}` : ''}.`);
  process.exit(0);
}

const id = process.argv[2];
const c = delade.find((x) => x.id === id);
if (!c) { console.error(`Ange en delad sak ur src/data/centrala.json: ${delade.map((x) => x.id).join(', ')}.`); process.exit(1); }
const rader = salla(id);
if (!rader) { console.error(`${id} saknar tranar (förmågornas taggar) och karna (orden för det eleverna gör i passet) i src/data/sadd.json. Skriv dem först.`); process.exit(1); }
const s = register.saker[id];
const visa = (r) => `  ${r.titel} (${r.id}, ${r.arskurs})`;
console.log(`Såddprovet för ${c.namn}: tränar ${s.tranar.join(', ')}, i passet ${s.karna.join(' | ')}\n`);
console.log('Bedöm varje kandidat med de tre frågorna. Ja på alla tre ger ett ja, tveksamt är nej, och en metod har högst två delade stödmaterial:');
for (const f of FRAGOR) console.log(`  ${f}`);
const grupp = (rubrik, lista, med) => { if (!lista.length) return; console.log(`\n${rubrik}`); for (const r of lista) { console.log(visa(r)); if (med) for (const b of r.belagg) console.log(`      ${b}`); } };
grupp('Visar redan saken:', rader.filter((r) => r.visar), false);
grupp('Kandidater, tränar det och gör det i passet:', rader.filter((r) => !r.visar && r.kandidat), true);
grupp('Tränar det men gör det inte i passets kärna (nej utan vidare):', rader.filter((r) => !r.visar && !r.kandidat && r.tranar.length), false);
console.log(`\n${rader.filter((r) => !r.tranar.length && !r.visar).length} metoder tränar inte det saken stöder.`);
