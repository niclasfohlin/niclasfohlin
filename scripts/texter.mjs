#!/usr/bin/env node
// Texterna i underlag/texter: registret, vilka som har post på sajten och vilka som saknar.
//
//   node scripts/texter.mjs                 hela registret, nyast först
//   node scripts/texter.mjs --saknar-post   bara texter utan post i src/content/artiklar
//   node scripts/texter.mjs --kontrollera   registret mot disken, avsluta med 1 vid fel
//
// Registret är underlag/texter/register.json. Varje rad pekar på ett blad med fulltext (när den
// finns) och på posten på sajten (när den finns). Bladet är arkiv, posten är det läsaren ser.
// Inga beroenden.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTER = join(rot, 'underlag', 'texter', 'register.json');
if (!existsSync(REGISTER)) { console.error('Hittar inte underlag/texter/register.json.'); process.exit(1); }
const reg = JSON.parse(readFileSync(REGISTER, 'utf8'));
const texter = [...reg.texter].sort((a, b) => b.datum.localeCompare(a.datum));
const arg = process.argv[2];

function postUrl(fil) {
  const m = readFileSync(join(rot, fil), 'utf8').match(/^originalUrl:\s*"?([^"\n]+)"?\s*$/m);
  return m ? m[1].trim() : '';
}

if (arg === '--kontrollera') {
  const fel = [];
  const artiklar = join(rot, 'src', 'content', 'artiklar');
  const poster = existsSync(artiklar) ? readdirSync(artiklar).filter((f) => f.endsWith('.md') && !f.startsWith('_')) : [];
  const urlerIRegistret = new Set(texter.map((t) => t.originalUrl));
  for (const f of poster) {
    const u = postUrl(join('src', 'content', 'artiklar', f));
    if (u && !urlerIRegistret.has(u)) fel.push(`src/content/artiklar/${f}: originalUrl finns inte i registret. Lägg till texten i underlag/texter/register.json.`);
  }
  const slugs = new Set();
  for (const t of texter) {
    if (slugs.has(t.slug)) fel.push(`registret: sluggen ${t.slug} står två gånger`);
    slugs.add(t.slug);
    if (t.fulltext && !existsSync(join(rot, t.fulltext))) fel.push(`${t.slug}: bladet ${t.fulltext} saknas`);
    if (t.post && !existsSync(join(rot, t.post))) fel.push(`${t.slug}: posten ${t.post} saknas`);
    if (t.post && postUrl(t.post) !== t.originalUrl) fel.push(`${t.slug}: postens originalUrl skiljer sig från registrets`);
    if (!t.datum || !/^\d{4}-\d{2}-\d{2}$/.test(t.datum)) fel.push(`${t.slug}: datum saknas eller är fel skrivet`);
  }
  if (fel.length) { console.error(fel.join('\n')); process.exit(1); }
  console.log(`Registret OK: ${texter.length} texter, ${texter.filter((t) => t.post).length} med post, ${texter.filter((t) => t.fulltext).length} med fulltext.`);
  process.exit(0);
}

const urval = arg === '--saknar-post' ? texter.filter((t) => !t.post) : texter;
for (const t of urval) {
  const status = t.post ? 'post   ' : 'SAKNAR ';
  console.log(`${t.datum}  ${status} ${(t.typ || '-').padEnd(8)} ${t.publikation.padEnd(17)} ${t.slug.padEnd(52)} ${t.titel}`);
}
console.log(`\n${urval.length} av ${texter.length} texter${arg === '--saknar-post' ? ' saknar post. Skapa en med /ny-artikel <slug>.' : '.'}`);
