#!/usr/bin/env node
// Undervisningsmetodernas filer (K-621): dokumenten som metodriggen bygger ur metodens fil, och filmerna, in i
// public/metoder/ med fasta namn (src/lib/undervisningsmetodfiler.ts), med bilder av bladens sidor till sidan. Riggens
// förteckning out/<id>/filer.json säger vilken metodfil varje dokument byggdes ur (sha256), och skriptet stannar när den
// inte är samma fil som sajten visar: då bygger riggen om. Sajten bygger ingen egen Word-fil, så att filen och sidan inte
// glider isär (underlag/prov/metoder/UPPDRAGET.md, besluten). Utan förteckning tar skriptet riggens filer efter namnen och
// klipper bladen ur pdf:en med allt, och säger att kontrollen saknas.
//
//   node scripts/metoderfiler.mjs                 ta in filerna för varje metod i src/content/undervisningsmetoder/
//   node scripts/metoderfiler.mjs --kontrollera   pröva bara att filerna finns och hör till metodens fil
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import sharp from 'sharp';

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RIGG = process.env.METODRIGG ?? 'C:/metodrigg';
const MAPP = join(ROT, 'src', 'content', 'undervisningsmetoder');
const UT = join(ROT, 'public', 'metoder');
const kontrollera = process.argv.includes('--kontrollera');
// Summan räknas med LF som radslut, som i riggen, så att en kopia med CRLF ger samma summa.
const sha = (f) => createHash('sha256').update(readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
const fel = [];
const varningar = [];
mkdirSync(UT, { recursive: true });

// Sidorna i en pdf som text, en post per sida.
const sidorna = (pdf) => spawnSync('pdftotext', ['-enc', 'UTF-8', '-layout', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).stdout.split('\f');
// Klipper sidorna fran..till (1-baserat, med båda) ur en pdf med pikepdf.
const klipp = (pdf, fran, till, ut) => {
  const r = spawnSync('python', ['-I', '-c', `import pikepdf,sys\nsrc=pikepdf.open(sys.argv[1])\nny=pikepdf.new()\nfor i in range(int(sys.argv[2])-1,int(sys.argv[3])): ny.pages.append(src.pages[i])\nny.save(sys.argv[4], deterministic_id=True)`, pdf, String(fran), String(till), ut], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`klippet ${ut}: ${r.stderr}`);
};
// Bilderna av sidorna, 420 punkter breda, som palett-PNG.
const bilder = async (pdf, stam) => {
  for (const f of readdirSync(UT)) if (f.startsWith(`${stam}-`) && /-\d+\.png$/.test(f)) rmSync(join(UT, f));
  const tmp = join(ROT, 'node_modules', '.cache', 'metoderfiler');
  mkdirSync(tmp, { recursive: true });
  spawnSync('pdftoppm', ['-png', '-r', '72', pdf, join(tmp, 'sida')]);
  const sidor = readdirSync(tmp).filter((f) => f.startsWith('sida')).sort();
  for (const [i, f] of sidor.entries()) {
    await sharp(join(tmp, f)).resize({ width: 840 }).png({ compressionLevel: 9, palette: true, colours: 96 }).toFile(join(UT, `${stam}-${i + 1}.png`));
    rmSync(join(tmp, f));
  }
  return sidor.length;
};

for (const fil of readdirSync(MAPP).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'))) {
  const id = fil.replace(/\.yaml$/, '');
  const d = parse(readFileSync(join(MAPP, fil), 'utf8'));
  const ut = join(RIGG, 'out', id);
  const metodensSha = sha(join(MAPP, fil));
  const forteckning = join(ut, 'filer.json');
  const filer = []; // { slag, kalla, typ }
  if (existsSync(forteckning)) {
    const f = JSON.parse(readFileSync(forteckning, 'utf8'));
    // Riggens filer står i out/<id>/, och lektionskortet i out/material/lektionskort-<id>/.
    const hitta = (namn) => [join(ut, namn), join(RIGG, 'out', 'material', `lektionskort-${id}`, namn)].find((x) => existsSync(x));
    for (const post of f.filer ?? []) {
      const yamlSha = post.metodSha256 ?? f.metodSha256;
      if (yamlSha !== metodensSha) fel.push(`${id}: ${post.namn} är byggd ur en annan metodfil än sajtens (${String(yamlSha).slice(0, 8)} mot ${metodensSha.slice(0, 8)}). Kopiera riggens metod.yaml eller be riggen bygga om.`);
      for (const namn of [post.namn, post.pdf].filter(Boolean)) {
        const kalla = hitta(namn);
        if (!kalla) { fel.push(`${id}: ${namn} saknas hos riggen`); continue; }
        filer.push({ slag: post.slag, kalla, typ: namn.split('.').pop() });
      }
    }
  } else {
    varningar.push(`${id}: riggens förteckning out/${id}/filer.json saknas, så filerna tas efter namnen och kontrollen mot metodfilen saknas`);
    const t = d.titel;
    for (const [slag, namn] of [['allt', `${t}`], ['lathund', `${t} - Att komma igång`]]) for (const typ of ['pdf', 'docx']) if (existsSync(join(ut, `${namn}.${typ}`))) filer.push({ slag, kalla: join(ut, `${namn}.${typ}`), typ });
    const kort = join(RIGG, 'out', 'material', `lektionskort-${id}`);
    for (const typ of ['pdf', 'docx']) if (existsSync(join(kort, `Lektionskort - ${t}.${typ}`))) filer.push({ slag: 'lektionskort', kalla: join(kort, `Lektionskort - ${t}.${typ}`), typ });
  }
  const stam = (slag) => (slag === 'allt' ? id : `${id}-${slag}`);
  if (!kontrollera) for (const f of filer) copyFileSync(f.kalla, join(UT, `${stam(f.slag)}.${f.typ}`));

  // Bladen som riggen inte har lämnat som egna filer klipps ur pdf:en med allt, efter rubrikerna på sidorna.
  const allt = join(UT, `${id}.pdf`);
  const har = new Set(filer.filter((f) => f.typ === 'pdf').map((f) => f.slag));
  if (!kontrollera && existsSync(allt)) {
    const s = sidorna(allt);
    const forsta = (re, fran = 0) => s.findIndex((x, i) => i >= fran && re.test(x));
    const pl = forsta(/^\s*Planering · /m);
    const ob = forsta(/^\s*Observation av en lektion/m);
    const b = forsta(/^\s*B\s+Valet och forskningen/m);
    const a = forsta(/^\s*A\s+Att skriva ut/m);
    const ref = forsta(/^\s*Forskningen bakom/m);
    const las = forsta(/^\s*Läs mer\s*$/m, ref);
    const klippen = [
      ['materialet', a + 1, pl - 1],
      ['planeringsmall', pl, ob - 1],
      ['observation', ob, b - 1],
      ['referensblad', ref, las > ref ? las - 1 : ref],
    ];
    for (const [slag, fran, till] of klippen) {
      if (har.has(slag)) continue;
      if (fran < 0 || till < fran) { varningar.push(`${id}: ${slag} hittades inte i pdf:en med allt`); continue; }
      // Sidor med bara en rad eller två (en tom baksida) tas inte med.
      let slut = till;
      while (slut > fran && s[slut].replace(/\s+/g, ' ').trim().length < 60) slut--;
      klipp(allt, fran + 1, slut + 1, join(UT, `${stam(slag)}.pdf`));
      varningar.push(`${id}: ${slag} klippt ur pdf:en med allt, sidorna ${fran + 1}–${slut + 1}, tills riggen lämnar den som egen fil`);
    }
    for (const slag of ['lektionskort', 'planeringsmall', 'observation', 'materialet']) {
      const pdf = join(UT, `${stam(slag)}.pdf`);
      if (existsSync(pdf)) console.log(`metoderfiler: ${id}, ${slag}: ${await bilder(pdf, stam(slag))} bilder`);
    }
  }

  // Filmerna: riggens svg-filer med sajtens namn, som i Stödundervisning.
  const filmer = [['film', `${id}-film`], ['film2', `${id}-film2`]];
  for (const [rigg, sajt] of filmer) {
    for (const ext of ['', '-1', '-2', '-3', '-4']) {
      const k = join(ut, `${rigg}${ext}.svg`);
      if (existsSync(k) && !kontrollera) copyFileSync(k, join(UT, `${sajt}${ext}.svg`));
    }
  }
  for (const slag of ['allt', 'lathund', 'lektionskort']) if (!existsSync(join(UT, `${stam(slag)}.pdf`))) fel.push(`${id}: ${slag} saknas i public/metoder/`);
}

for (const v of varningar) console.log(`! ${v}`);
if (fel.length) { console.error(fel.map((f) => `metoderfiler: ${f}`).join('\n')); process.exit(1); }
console.log('metoderfiler: klart');
