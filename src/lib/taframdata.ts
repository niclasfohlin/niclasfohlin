// Datafilen bredvid en Ta fram-sida (src/lib/tafram.ts, taFramData) med det som bara Astro kan rita: en faktatext som
// Faktatext.astro ritar den på metodens sida, för Visa stort. Sidan och datafilens endpoint läser samma data, så att
// adressens version (src/lib/kortdata.ts) också täcker texten, och en ändrad faktatext hämtas på nytt. Filen finns för
// sig, eftersom tafram.ts också läses av delningskortens kod, som inte ritar Astro-komponenter.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Faktatext from '../components/Faktatext.astro';
import { medVersion, taFramData, type TaFram } from './tafram';

type Data = ReturnType<typeof taFramData>;
type Post = Data['poster'][number] & { html?: string };

// Bilderna och länkarna till dem i texten får sin version, som i sidorna (scripts/filversion.mjs), så att en ändrad
// bild hämtas på nytt.
const medVersioner = (html: string) => html.replace(/(src|href)="(\/stodundervisning\/[^"?#]+\.(?:svg|png|jpg))"/g, (_, a: string, adress: string) => `${a}="${medVersion(adress)}"`);

const cache = new WeakMap<TaFram, Promise<Omit<Data, 'poster'> & { poster: Post[] }>>();
/** Datafilen: taFramData och, för en faktatext, texten som HTML (html). */
export function taFramDatafil(t: TaFram) {
  if (!cache.has(t)) cache.set(t, (async () => {
    const data = taFramData(t);
    if (!t.poster.some((p) => p.fakta)) return data;
    const c = await AstroContainer.create();
    const html = new Map<string, string>();
    for (const p of t.poster) {
      if (!p.fakta) continue;
      const props = { f: p.fakta.f, id: `tf-fakta-${p.id}`, ankare: `tf-fakta-titel-${p.id}`, farg: p.farg, rubrik: p.fakta.rubrik, bilder: p.fakta.bilder, las: p.fakta.las };
      html.set(p.id, medVersioner(await c.renderToString(Faktatext, { props })));
    }
    return { ...data, poster: data.poster.map((p) => (html.has(p.id) ? { ...p, html: html.get(p.id) } : p)) };
  })());
  return cache.get(t)!;
}
