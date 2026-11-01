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
//
// En sak som består av namngivna saker, som verktyget Strukturer med EPA, Rondellen och Kloka pennan, har fältet namnen i
// src/data/sadd.json med mappen där sakerna står, med namn och andra namn. En metod som nämner en av dem vid namn, var som
// helst i sin fil, är också en kandidat som ska bedömas (Niclas 2026-11-01: "Men det finns väl många i stöd som har
// strukturer i sig?", och "Du får fixa sådd provet så det inte missar detta": provet hittade bara metoder med sakens
// förmågor och ord för det eleverna gör).
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
const metoder = readdirSync(MAPP).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => { const text = readFileSync(join(MAPP, f), 'utf8'); return { id: f.replace(/\.yaml$/, ''), d: parseYaml(text), text }; }).filter((m) => m.d.utkast !== true);

// De namngivna sakerna i en mapp (fältet namnen): namnet och de andra namnen i varje fil som visas, med stor bokstav som i ett
// namn, så att verbet "turas om" inte räknas. Ett namn med flera ord räknas också utan sitt utropstecken eller frågetecken,
// och ett namn med tankstreck också med "och", som metoderna skriver det: Berätta mera för Berätta mera! och Inre och yttre
// cirkel för Inre–yttre cirkel (Gruppstärkande aktiviteter). Ett namn med ett ord, som Visa! och Rösta!, behåller tecknet,
// eftersom ordet utan det är ett vanligt verb.
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const varianter = (n) => [...new Set([n, ...(n.includes(' ') ? [n.replace(/[!?]$/, '')] : []), n.replace(/\s*–\s*/g, ' och ')])];
function namnenI(s) {
  if (!s?.namnen?.mapp) return [];
  const mapp = join(rot, s.namnen.mapp);
  return readdirSync(mapp).filter((f) => f.endsWith('.yaml') && !f.startsWith('_')).map((f) => ({ id: f.replace(/\.yaml$/, ''), ...parseYaml(readFileSync(join(mapp, f), 'utf8')) })).filter((x) => !x.utkast && !x.vantar)
    .flatMap((x) => [x.namn, ...(x.andra ?? [])].filter((n) => typeof n === 'string').flatMap(varianter).filter((n) => n.length >= 3).map((n) => ({ namn: n, id: x.id, re: new RegExp(`(^|[^\\p{L}])${esc(n)}(?![\\p{L}])`, 'u') })));
}
// Ett verktyg som sajten väver in (src/lib/vav.ts) visas av metodens ja i registret, med platserna i vav, och inte av fältet
// centrala; en del som metoden nämner utan att använda står i inte, med skälet.
const vavs = (s, m) => typeof s?.ja?.[m] === 'object' && Array.isArray(s.ja[m].vav);

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
  const namnen = namnenI(s);
  return metoder.map((m) => {
    const namn = namnen.filter((x) => x.re.test(m.text)).map((x) => x.namn);
    const tranar = (m.d.taggar ?? []).filter((t) => s.tranar.includes(t));
    const belagg = [];
    for (const t of karnan(m.d)) for (const r of monster) { const i = t.search(r); if (i >= 0 && belagg.length < 2) belagg.push(citat(t, i)); }
    return { id: m.id, titel: m.d.titel, arskurs: m.d.arskursText ?? (m.d.arskurs ?? []).join(', '), tranar, belagg, namn, visar: visar(m.d, id) || vavs(s, m.id), kandidat: (tranar.length > 0 && belagg.length > 0) || namn.length > 0 };
  });
}

if (process.argv.includes('--kontrollera')) {
  const fel = [];
  const vantar = [];
  for (const c of delade) {
    const s = register.saker?.[c.id];
    if (!s?.provad || !s.tranar?.length || !s.karna?.length) { fel.push(`${c.id}: ny delad sak utan såddprov. Skriv tranar och karna i src/data/sadd.json, kör node scripts/saddprov.mjs ${c.id}, bedöm varje kandidat med de tre frågorna och skriv ja och nej med skäl och provad med datumet (METODER.md under De centrala sakerna).`); continue; }
    const namnen = namnenI(s);
    for (const m of metoder) {
      const ja = !!s.ja?.[m.id];
      if (visar(m.d, c.id) && !ja) fel.push(`${m.id} visar ${c.id} utan att stå bland dess ja i src/data/sadd.json. Bedöm metoden med de tre frågorna och skriv in den.`);
      if (ja && !visar(m.d, c.id) && !vavs(s, m.id)) vantar.push(`${m.id} (${c.id})`);
      if (!vavs(s, m.id)) continue;
      // Varje del som metoden nämner vid namn får sitt lilla kort, eller står i inte med skälet (Niclas 2026-11-01: "en liten
      // bild på varje struktur som nämns").
      const delar = new Set(s.ja[m.id].vav.flatMap((r) => r.delar ?? []));
      const inte = s.ja[m.id].inte ?? {};
      for (const x of namnen.filter((n) => n.re.test(m.text) && !delar.has(n.id) && !(n.namn in inte))) fel.push(`${m.id} nämner ${x.namn} (${x.id}) utan att den står bland delarna i vav. Lägg den på platsen där metoden nämner den, eller i inte med skälet, i src/data/sadd.json.`);
      for (const n of Object.keys(inte)) if (!namnen.some((x) => x.namn === n && x.re.test(m.text))) fel.push(`${m.id}: inte nämner ${n}, som metoden inte längre nämner. Ta bort raden ur src/data/sadd.json.`);
    }
    for (const k of salla(c.id).filter((x) => x.kandidat && !s.ja?.[x.id] && !s.nej?.[x.id])) fel.push(`${k.id} är en kandidat för ${c.id} som ingen har bedömt (${k.namn.length ? `nämner ${k.namn.join(', ')}` : `tränar ${k.tranar.join(', ')}, i passet ${k.belagg[0]}`}). Kör node scripts/saddprov.mjs ${c.id} och skriv ja eller nej med skäl.`);
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
grupp('Kandidater, tränar det och gör det i passet:', rader.filter((r) => !r.visar && r.kandidat && !r.namn.length), true);
grupp('Kandidater som nämner en av sakerna vid namn:', rader.filter((r) => !r.visar && r.namn.length).map((r) => ({ ...r, titel: `${r.titel}: ${r.namn.join(', ')}` })), false);
grupp('Tränar det men gör det inte i passets kärna (nej utan vidare):', rader.filter((r) => !r.visar && !r.kandidat && r.tranar.length), false);
console.log(`\n${rader.filter((r) => !r.tranar.length && !r.visar).length} metoder tränar inte det saken stöder.`);
