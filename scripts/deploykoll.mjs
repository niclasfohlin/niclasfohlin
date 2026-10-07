#!/usr/bin/env node
// Väntar in Netlify-bygget för en commit och säger om det blev grönt. Körs efter varje push till main.
//
//   node scripts/deploykoll.mjs              Bygget för HEAD på den gren du står på
//   node scripts/deploykoll.mjs <commit>     Bygget för en viss commit (kort eller lång sha)
//   node scripts/deploykoll.mjs --tyst       Bara slutraden
//
// Frågar Netlify var tionde sekund i upp till fem minuter (ett bygge tar omkring en minut). Matchar på
// commit_ref, inte på ordningen i svaret. Avslutar med 0 när deployen är ready, 1 när den är error
// (med felet utskrivet), 2 om den inte dykt upp eller blivit klar i tid, 3 om netlify inte svarar.
// När bygget är grönt säger skriptet om just den här deployen mejlade prenumeranterna, och visar kreditsaldot.
// Lagret bär det senaste utskicket, inte deployens eget, så raden jämför utskickets tid med när deployen började
// byggas: en push utan nytt innehåll såg annars ut att ha mejlat (K-146).
// [skip netlify] i commit-meddelandet ger ingen deploy alls: då säger skriptet det och avslutar med 0.

import { execSync } from 'node:child_process';
import { hamta, lage, rad } from './krediter.mjs';

const SITE = '8af49398-3862-4b58-84a6-88f68d0064c1';
const args = process.argv.slice(2);
const tyst = args.includes('--tyst');
const kor = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, NETLIFY_AUTH_TOKEN: undefined } });

const commit = (args.find((a) => !a.startsWith('--')) ?? kor('git rev-parse HEAD').trim()).slice(0, 7);
const meddelande = (() => { try { return kor(`git log -1 --format=%B ${commit}`); } catch { return ''; } })();
if (/\[skip netlify\]|\[skip ci\]/i.test(meddelande)) {
  console.log(`${commit}: [skip netlify] i commit-meddelandet, inget bygge. Sajten är oförändrad.`);
  process.exit(0);
}

const deployer = () => {
  const ut = kor(`netlify api listSiteDeploys --data "{\\"site_id\\":\\"${SITE}\\",\\"per_page\\":5}"`);
  return JSON.parse(ut.slice(ut.indexOf('[')));
};
const vanta = (ms) => new Promise((r) => setTimeout(r, ms));

const start = Date.now();
let sett = false;
while (Date.now() - start < 5 * 60 * 1000) {
  let lista;
  try { lista = deployer(); } catch (e) { console.error('netlify svarar inte. Är du inloggad (netlify status)? Är NETLIFY_AUTH_TOKEN satt i skalet? Kör unset NETLIFY_AUTH_TOKEN.'); process.exit(3); }
  const d = lista.find((x) => (x.commit_ref ?? '').startsWith(commit));
  if (d) {
    if (!sett && !tyst) console.log(`deploy ${d.id.slice(0, 8)} för ${commit}: ${d.state}`);
    sett = true;
    if (d.state === 'ready') {
      console.log(`grönt: deploy ${d.id.slice(0, 8)} för ${commit} är ute (${(d.published_at ?? d.updated_at ?? '').slice(0, 16)}).`);
      try {
        const lasLager = () => { const ut = kor('netlify blobs:get utskick skickat'); return JSON.parse(ut.slice(ut.indexOf('{'))); };
        // Det som är publicerat men inte står i lagret är på väg att mejlas: utskicket körs efter att deployen blivit
        // klar, så skriptet väntar in det i upp till en minut i stället för att säga att inget gick.
        const publicerat = await fetch('https://niclasfohlin.se/nytt.json', { cache: 'no-store' }).then((r) => r.json()).then((j) => (j.poster ?? []).map((p) => p.url)).catch(() => []);
        let lager = lasLager();
        const omejlat = () => { const kanda = new Set(lager.urler ?? []); return publicerat.filter((u) => !kanda.has(u)); };
        const hit = () => Boolean(lager.senast?.datum && d.created_at && Date.parse(lager.senast.datum) >= Date.parse(d.created_at));
        const pagar = () => omejlat().length > 0 || (hit() && ['skapar', 'skapad'].includes(lager.senast.status));
        for (let i = 0; i < 6 && pagar(); i++) { await vanta(10000); lager = lasLager(); }
        const s = lager.senast ?? {};
        const vad = `${s.kampanj ? `kampanj ${s.kampanj}` : 'ingen kampanj'}${s.poster?.length ? `, ${s.poster.join(', ')}` : ''}${s.fel ? `, fel: ${s.fel}` : ''}`;
        if (omejlat().length) console.log(`utskick: OBS, nytt innehåll är inte mejlat efter en minut: ${omejlat().join(', ')}. Läs deployens sammanfattning i Netlify (DRIFT.md under Brevo).`);
        else if (hit()) console.log(`utskick: den här deployen mejlade prenumeranterna (${s.status ?? 'okänt läge'}): ${vad}`);
        else console.log(`utskick: inget nytt mejl vid den här deployen, allt publicerat var redan mejlat. Det senaste utskicket gick ${String(s.datum ?? 'okänt datum').slice(0, 10)}: ${vad}`);
      } catch { console.log('utskick: kunde inte läsa lagret (netlify blobs:get utskick skickat).'); }
      try { const k = await hamta({ farsk: true }); console.log(`krediter: ${rad(k, lage(k))}`); } catch (e) { console.log(`krediter: saldot gick inte att läsa (${e.message}); npm run krediter.`); }
      process.exit(0);
    }
    if (d.state === 'error') {
      console.error(`rött: deploy ${d.id.slice(0, 8)} för ${commit} misslyckades. ${d.error_message ?? ''}`);
      console.error(`Bygglogen: netlify logs --source deploy --deploy-id ${d.id} --since 72h`);
      process.exit(1);
    }
    if (!tyst) console.log(`  ${d.state} …`);
  } else if (!tyst) console.log(`  inget bygge för ${commit} än …`);
  await vanta(10000);
}
console.error(`ingen färdig deploy för ${commit} inom fem minuter. Startade inget bygge alls: se webhooken under "När något är rött" i DRIFT.md.`);
process.exit(2);
