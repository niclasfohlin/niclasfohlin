import type { APIContext } from 'astro';
import { artikelPoster, bygg } from '../../lib/rss';

export async function GET(context: APIContext) {
  return bygg('artiklar', 'Publicerade artiklar, krönikor och debattinlägg.', await artikelPoster(), context.site);
}
