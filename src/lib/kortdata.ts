// Kortens data på sidorna som slumpar kort (Ta fram ett skrivkort, Ta fram en aktivitet, Ta fram en brainbreak) står i
// en egen fil bredvid sidan, `<sidan>.json`, och inte i själva sidan (2026-10-16). Facebooks robot hämtar sidan varje
// gång länken delas eller förhandsvisas, omkring 1 350 gånger ett dygn för skrivkorten, och korten var 90 procent av
// sidan: 51 av 57 kB över nätet. Robotarna hämtar inte filen, och läsarens webbläsare sparar den ett dygn
// (netlify.toml). Adressen bär datans version, så att en ändrad kortsamling alltid hämtas på nytt.
import { createHash } from 'node:crypto';

/** Filens adress med datans version: `<sidan>.json?v=<åtta tecken>`. Filen görs av sidans endpoint med samma data. */
export const kortdataAdress = (sida: string, data: unknown) => `${sida}.json?v=${createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 8)}`;

/** Svaret från sidans endpoint. */
export const kortdataSvar = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
