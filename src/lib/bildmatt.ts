// Bredd och höjd på en bild under public/, läst ur filhuvudet vid bygget, så att <img> kan få
// width och height och sidan inte hoppar när bilden laddas. PNG, JPEG och WebP; annat ger undefined.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function bildMatt(sokvag: string): { width: number; height: number } | undefined {
  try {
    const b = readFileSync(join(process.cwd(), 'public', sokvag));
    // PNG: IHDR direkt efter signaturen.
    if (b.length > 24 && b.toString('ascii', 1, 4) === 'PNG') return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    // JPEG: leta efter första SOF-markören.
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const markor = b[i + 1];
        if (markor === 0xd8 || (markor >= 0xd0 && markor <= 0xd7) || markor === 0x01 || markor === 0xff) { i += 2; continue; }
        const langd = b.readUInt16BE(i + 2);
        if ((markor >= 0xc0 && markor <= 0xc3) || (markor >= 0xc5 && markor <= 0xc7) || (markor >= 0xc9 && markor <= 0xcb) || (markor >= 0xcd && markor <= 0xcf)) {
          return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
        }
        i += 2 + langd;
      }
    }
    // WebP: VP8 (lossy), VP8L (lossless) eller VP8X (utökad).
    if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const typ = b.toString('ascii', 12, 16);
      if (typ === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
      if (typ === 'VP8L') { const bits = b.readUInt32LE(21); return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }; }
      if (typ === 'VP8X') return { width: (b.readUIntLE(24, 3)) + 1, height: (b.readUIntLE(27, 3)) + 1 };
    }
  } catch { /* saknad eller okänd bild */ }
  return undefined;
}

// Höjden i pixlar när bilden visas i en given bredd, med bevarade proportioner.
export function bildHojd(sokvag: string, bredd: number): number | undefined {
  const m = bildMatt(sokvag);
  return m ? Math.round((bredd * m.height) / m.width) : undefined;
}
