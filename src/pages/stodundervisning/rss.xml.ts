import type { APIContext } from 'astro';
import { metodPoster, bygg } from '../../lib/rss';

export async function GET(context: APIContext) {
  return bygg('stödundervisning', 'Nya metoder i metodbanken.', await metodPoster(), context.site);
}
