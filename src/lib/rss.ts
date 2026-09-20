import rss, { type RSSFeedItem } from '@astrojs/rss';
import { site } from '../data/site';
import { artiklarSorterade, metoderSorterade, bockerSorterade, publikationNamn } from './innehall';

export async function artikelPoster(): Promise<RSSFeedItem[]> {
  const artiklar = await artiklarSorterade();
  return artiklar.map((a) => ({
    title: a.data.titel,
    description: `${a.data.ingress} (Ursprungligen i ${publikationNamn(a.data.publikation)}.)`,
    pubDate: a.data.datum,
    link: `/artiklar/${a.id}`,
    categories: a.data.taggar,
  }));
}

export async function metodPoster(): Promise<RSSFeedItem[]> {
  const metoder = await metoderSorterade();
  return metoder.map((m) => ({
    title: `${m.data.titel} (${m.data.omrade}, ${m.data.arskurs.join('/')})`,
    description: m.data.ingress,
    pubDate: m.data.uppdaterad ?? new Date(0),
    link: `/stodundervisning/${m.id}`,
    categories: [m.data.omrade, ...m.data.taggar],
  }));
}

export async function bokPoster(): Promise<RSSFeedItem[]> {
  const bocker = await bockerSorterade();
  return bocker.map((b) => ({
    title: `${b.data.titel} (bok)`,
    description: b.data.beskrivning,
    pubDate: new Date(`${b.data.utgivningsar}-01-01`),
    link: `/bocker/${b.id}`,
    categories: [b.data.kategori, ...b.data.taggar],
  }));
}

export function bygg(titel: string, beskrivning: string, poster: RSSFeedItem[], siteUrl: URL | undefined) {
  return rss({
    title: `${site.namn}: ${titel}`,
    description: beskrivning,
    site: siteUrl ?? site.url,
    items: poster,
    customData: `<language>sv-se</language>`,
  });
}
