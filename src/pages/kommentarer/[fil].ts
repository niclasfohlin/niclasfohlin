// Kommentarernas skript, /kommentarer/klient.js. Filen byggs bara när kommentarerna är på
// (src/lib/kommentarer.ts): står de på av finns den inte i bygget alls. Klienten är vanlig
// JavaScript som skickas som den är, med stilen inlagd som konstanten STIL, så att den inte delar
// något med sajtens övriga skript.
import type { APIRoute, GetStaticPaths } from 'astro';
import klient from '../../lib/kommentarer-klient.js?raw';
import stil from '../../styles/kommentarer.css?raw';
import { kommentarerPa } from '../../lib/kommentarer';

export const getStaticPaths: GetStaticPaths = () => (kommentarerPa ? [{ params: { fil: 'klient.js' } }] : []);

// Hela kommentarsrader och indrag tas bort, inget annat: klientens mallsträngar börjar sina rader i
// första kolumnen och tål det. Stilen blir en rad utan kommentarer.
const kod = klient
  .split('\n')
  .map((rad) => rad.trim())
  .filter((rad) => rad && !rad.startsWith('//') && !/^\/\*.*\*\/$/.test(rad))
  .join('\n');
const css = stil.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, ' ').trim();

export const GET: APIRoute = () =>
  new Response(`const STIL = ${JSON.stringify(css)};\n${kod}`, {
    headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
  });
