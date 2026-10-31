import type { APIRoute, GetStaticPaths } from 'astro';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { ritaScen } from '../../../scripts/strukturer/rita.mjs';
import { strukturerna } from '../../lib/strukturer';

// /strukturer/<id>.svg: strukturens bild, ritad i bygget ur scenen i scripts/strukturer/scener/ med bildmotorn
// (scripts/strukturer/rita.mjs, skillen .claude/skills/strukturbilder/SKILL.md), så att sidan och kortet har samma bild ur
// samma scen och ingen bild läggs in för hand. Netlify packar svg, så en bild är omkring 10 till 30 kB över nätet.
export const getStaticPaths: GetStaticPaths = async () =>
  (await strukturerna()).map((s) => ({ params: { id: s.id }, props: { scen: s.data.bild!.scen } }));

export const GET: APIRoute = ({ props }) => {
  const scen = YAML.parse(readFileSync(join(process.cwd(), 'scripts', 'strukturer', 'scener', `${props.scen}.yaml`), 'utf8'));
  return new Response(ritaScen(scen), { headers: { 'Content-Type': 'image/svg+xml' } });
};
