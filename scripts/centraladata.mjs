// Stödmaterialens innehåll ur metodriggen (K-488; Niclas 2026-10-20: "De tre (och kommande sådda) stödmaterial läggs på
// slutet ... Funkar inte det enkelt att lösa utan drift?"): riggens papper.json för en central sak som är en pdf, som
// Lässtrategier, till src/data/centrala/<id>.json. Sajten ritar materialet ur den i Word med src/lib/strategipapper.ts,
// som lektionskorten, sist i filen med allt för varje metod som har det och som materialets egen fil, vars pdf knappen och
// den korta adressen öppnar. Så kommer sidan i Allt och pdf:en ur samma data (METODER.md under De centrala sakerna).
//
//   node scripts/centraladata.mjs <riggens out/material/<id>> [<fler>]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const centrala = JSON.parse(readFileSync(join(rot, 'src/data/centrala.json'), 'utf8'));
const mappar = process.argv.slice(2);
if (!mappar.length) { console.error('Ange riggens mapp för materialet, som C:/metodrigg/out/material/lasstrategier.'); process.exit(1); }
mkdirSync(join(rot, 'src/data/centrala'), { recursive: true });
for (const mapp of mappar) {
  const id = basename(mapp);
  const c = centrala.find((x) => x.id === id);
  if (!c || c.slag !== 'pdf') { console.error(`${id}: ingen central sak som är en pdf i src/data/centrala.json.`); process.exit(1); }
  const fil = join(mapp, 'papper.json');
  if (!existsSync(fil)) { console.error(`${id}: ${fil} saknas.`); process.exit(1); }
  const papper = JSON.parse(readFileSync(fil, 'utf8'));
  if (papper.design !== 'strategipapper') { console.error(`${id}: papper.json har designen ${papper.design}, och sajten ritar bara strategipapper (src/lib/strategipapper.ts).`); process.exit(1); }
  writeFileSync(join(rot, 'src/data/centrala', `${id}.json`), `${JSON.stringify(papper, null, 1)}\n`);
  console.log(`ok   ${id}: src/data/centrala/${id}.json`);
}
