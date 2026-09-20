import type { APIContext } from 'astro';
import { artikelPoster, metodPoster, bokPoster, bygg } from '../lib/rss';

export async function GET(context: APIContext) {
  const poster = [...(await artikelPoster()), ...(await metodPoster()), ...(await bokPoster())]
    .sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0));
  return bygg('allt nytt', 'Nya artiklar, metoder för stödundervisning och böcker.', poster, context.site);
}
