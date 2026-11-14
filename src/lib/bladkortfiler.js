// Minibilderna till metodens små kort (K-728; Niclas 2026-11-07: "Ibland måste också något skapas. Som ex minibilder så det inte
// blir haffsigt arbete OM det behövs"): vilka de är och var de tas ur, en rot för sidan (src/lib/bladkort.ts) och skriptet som
// gör dem (scripts/minibilder.mjs). Vanlig JavaScript, så att skriptet kan läsa filen utan bygget.
import { metodensStrategiblad, metodensStrategikort, metodensStrukturkort, slugAv } from './standard/index.js';

/** Minibildens mått i bildpunkter: kortets bildruta (6,5 rem) med tre bildpunkter per punkt, som en telefon har. */
export const MINIBILDEN = Object.freeze({ bredd: 360, hojd: 244 });

export const minibildensFil = (id, namn) => `${id}-minibild-${slugAv(namn)}.webp`;

/** Namnet på en sak i registrets lista, som står som text eller som { namn, mening }. */
export const sakensNamn = (s) => (typeof s === 'string' ? s : s.namn);

/**
 * Metodens minibilder i kortens ordning, som { namn, fil, kalla, sida, del }: kalla är filen under public/, sida sidan i en pdf
 * och del vilken del av sidan som är saken (hel, eller ovre och nedre när sidan har två kort). Metodens fil och registrets
 * post säger allt, så att en bild inte kan glida isär från sin sak: ett blad är bladets sidbild, strukturkorten och
 * strategikorten är första kortet i metodens pdf, Strategibladet bladets pdf och en mall med egen fil mallens första sida.
 */
export function metodensMinibilder(id, d, post, sidor = {}) {
  if (post.blad) {
    const tabell = (d.tabeller ?? []).find((t) => t.rubrik === post.tabell);
    return (tabell?.rader ?? []).map((r, i) => ({
      namn: r[0],
      fil: minibildensFil(id, r[0]),
      kalla: `public/metoder/${id}-materialet-${post.framsidor[Math.floor(i / post.perSida)]}.png`,
      sida: 1,
      del: post.perSida === 2 ? (i % 2 ? 'nedre' : 'ovre') : 'hel',
    }));
  }
  const bladen = (d.ramar?.ramar ?? []).map((r) => r.rubrik);
  return (post.saker ?? []).map((s) => {
    const namn = sakensNamn(s);
    const bilden = (kalla, del = 'hel') => ({ namn, fil: minibildensFil(id, namn), kalla, sida: 1, del });
    const i = bladen.indexOf(namn);
    // Ett blad med flera sidor bredvid andra blad har sina sidor i src/data/materialets-sidor.json, och bilden är den första.
    if (i >= 0) return bilden(`public/metoder/${id}-materialet-${sidor[id]?.[i]?.bilder?.[0] ?? i + 1}.png`);
    if (namn === 'Strukturkorten') return bilden(`public/strukturer/kort/${metodensStrukturkort(id).fil}`, 'ovre');
    if (namn === 'Strategikorten') return bilden(`public/strategier/kort/${metodensStrategikort(id).fil}`, 'ovre');
    if (namn === 'Strategibladet') return bilden(`public/strategier/kort/${metodensStrategiblad(id).fil}`);
    // En tabell vars rader pekar ut blad i Materialet, som Fyrfältarna i Tänkande klassrum: ett blad som heter "<blad>, <nivå>,
    // <titel>" och en rad med nivån och titeln i två olika celler ("Bas" och "Äpplena"), som tabellensBankblad i
    // src/lib/undervisningsmetodfiler.ts. Tabellen har bilden av det första bladet den pekar ut (K-761).
    const tabellen = (d.tabeller ?? []).find((t) => t.rubrik === namn);
    const pekar = tabellen ? bladen.findIndex((b) => {
      const led = b.split(', ');
      const titel = led.slice(2).join(', ');
      return led.length >= 3 && led[1] !== titel && (tabellen.rader ?? []).some((r) => r.includes(led[1]) && r.includes(titel));
    }) : -1;
    if (pekar >= 0) return bilden(`public/metoder/${id}-materialet-${sidor[id]?.[pekar]?.bilder?.[0] ?? pekar + 1}.png`);
    return bilden(`public/metoder/${id}-tabell-${slugAv(namn)}.pdf`);
  });
}
