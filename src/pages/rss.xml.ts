import type { APIContext } from 'astro';
import { artikelPoster, metodPoster, bygg } from '../lib/rss';

export async function GET(context: APIContext) {
  const poster = [...(await artikelPoster()), ...(await metodPoster())]
    .sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0));
  return bygg('allt nytt', 'Nya artiklar och metoder för stödundervisning.', poster, context.site);
}
