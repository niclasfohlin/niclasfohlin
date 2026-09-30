// Reservbilderna i Word-filerna (Niclas 2026-09-30: i Google Dokument blev filmens fyra bilder blå rutor, "Måste lösas").
//
// Word ritar bilderna i Word-filerna som SVG: filmernas stillbilder, bildkorten, läskorten med stöd och bågarna.
// Google Dokument, också när filen sparas med Drive-knappen, LibreOffice och äldre Word ritar i stället reservbilden,
// en PNG som ligger bredvid varje SVG i filen. Den var en punkt, som blev en blå ruta. Nu är reservbilden samma bild,
// ritad ur samma SVG vid varje bygge (src/lib/metodresurser.ts), så att Word och Google Dokument visar samma sak och
// ingen bild görs i förväg eller för hand.
//
// Filen som webbläsaren bygger när läsaren väljer flera metoder (src/pages/stodundervisning/index.astro) hämtar
// reservbilderna från /stodundervisning/reservbild/<nyckel>.png, som samma bygge ritade ur samma SVG
// (src/pages/stodundervisning/reservbild/[nyckel].png.ts). Nyckeln är bildens innehåll och bredd, så en ändrad bild
// får en ny nyckel och kan aldrig få en gammal reservbild. Inga Node-beroenden, så att den också kan köras i webbläsaren.

export const RESERVBILD_MAPP = '/stodundervisning/reservbild';

// Reservbilden ritas i dubbla skärmupplösningen (omkring 190 punkter per tum på papper), högst 1600 pixlar bred.
export const reservBredd = (bredd: number) => Math.max(1, Math.min(1600, Math.round(bredd * 2)));

// Bildens nyckel: en 64-bitars kontrollsumma av SVG-filen (cyrb53, två halvor) och reservbildens bredd.
export function reservNyckel(svg: Uint8Array, bredd: number): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (const b of svg) {
    h1 = Math.imul(h1 ^ b, 2654435761);
    h2 = Math.imul(h2 ^ b, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}-${reservBredd(bredd)}`;
}

export const reservAdress = (nyckel: string) => `${RESERVBILD_MAPP}/${nyckel}.png`;

// En punkt, bara medan filen byggs en första gång för att se vilka bilder den har (samlaReservbilder). Den hamnar aldrig
// i en färdig fil: scripts/paritet.mjs stannar valideringen om den gör det.
const PUNKT = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
export const PUNKT_PNG = Uint8Array.from(atob(PUNKT), (c) => c.charCodeAt(0));

// Reservbilderna en fil behöver: bygg filen med den här som png, och läs sedan behovet.
export function samlaReservbilder() {
  const behov = new Map<string, { svg: Uint8Array; bredd: number }>();
  return { behov, png: (svg: Uint8Array, bredd: number) => { behov.set(reservNyckel(svg, bredd), { svg, bredd }); return PUNKT_PNG; } };
}
