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
// När bygget är grönt visas också utskickslagret, så att man ser om prenumeranterna mejlades.
// [skip netlify] i commit-meddelandet ger ingen deploy alls: då säger skriptet det och avslutar med 0.

import { execSync } from 'node:child_process';

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
        const ut = kor('netlify blobs:get utskick skickat');
        const lager = JSON.parse(ut.slice(ut.indexOf('{')));
        const s = lager.senast ?? {};
        console.log(`utskick: ${s.status ?? 'okänt'}${s.kampanj ? `, kampanj ${s.kampanj}` : ''}${s.poster?.length ? `, ${s.poster.join(', ')}` : ''}${s.fel ? `, fel: ${s.fel}` : ''}`);
      } catch { console.log('utskick: kunde inte läsa lagret (netlify blobs:get utskick skickat).'); }
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
