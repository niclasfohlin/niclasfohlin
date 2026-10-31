import type { APIContext } from 'astro';
import { undervisningsmetodPoster, bygg } from '../../lib/rss';

export async function GET(context: APIContext) {
  return bygg('metoder', 'Nya metoder för hela klassen.', await undervisningsmetodPoster(), context.site);
}
