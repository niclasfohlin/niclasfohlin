// Metodens saker i en text (sajtens K-493; Niclas 2026-10-24: "Om något är specifikt namngivet från metoden. Ett test. Ett
// papper. En text. En specifik lektion. Då ska det vara hyperlänkat från planen", och "Du får försöka skapa en definition
// vad namngivet och specifikt är som bör länkas"). En sak är något som metoden har ett namn på och sajten en egen adress
// för: ett blad, ett kort, en mall, ett test, en text i banken, en lektion. Sajten bygger listan över sakerna ur metodens
// fil och ger dem adresserna; här hittas namnen i en text, i de former svenskan ger dem, och här finns spärren mot ett
// namn som ingen sak har, så att sajten och riggen prövar lika. Reglerna står i sajtens STIL.md under Hänvisningar.

// Huvudord som gör ett ord till ett namn på en sak, med grundformen först och sedan de bestämda formerna och deras
// genitiv: lyssningsbladet, ledtrådsbladen, samtalskortets, planeringsmallarna. Ett namn i grundform, som Sifferkort,
// får formerna av sitt huvudord (Codex 2026-10-24).
const HUVUDORD = {
  blad: ['blad', 'bladet', 'bladen', 'bladets', 'bladens'],
  kort: ['kort', 'kortet', 'korten', 'kortets', 'kortens'],
  mall: ['mall', 'mallen', 'mallar', 'mallarna', 'mallens', 'mallarnas'],
  protokoll: ['protokoll', 'protokollet', 'protokollen', 'protokollets', 'protokollens'],
  schema: ['schema', 'schemat', 'scheman', 'schemats', 'schemana'],
  kontrakt: ['kontrakt', 'kontraktet', 'kontrakten', 'kontraktets'],
  lista: ['lista', 'listan', 'listor', 'listorna', 'listans', 'listornas'],
  test: ['test', 'testet', 'testen', 'testets'],
  diplom: ['diplom', 'diplomet', 'diplomen', 'diplomets'],
  lathund: ['lathund', 'lathunden', 'lathundar', 'lathundarna', 'lathundens'],
};
// De bestämda formerna, som spärren letar efter; en grundform som "kort" är också ett vanligt ord.
const BESTAMDA = Object.values(HUVUDORD).flatMap((f) => f.slice(1)).filter((f) => !['mallar', 'scheman', 'listor', 'lathundar'].includes(f)).sort((a, b) => b.length - a.length);
// Huvudordet som ett ord slutar på, med den längsta formen först, så att "kortet" inte läses som "kort" och "et".
const huvudordet = (ord) => {
  const sma = ord.toLowerCase();
  let bast;
  for (const former of Object.values(HUVUDORD)) for (const f of former) if (sma.endsWith(f) && (!bast || f.length > bast.form.length)) bast = { former, form: f };
  return bast;
};

/**
 * Är namnet ett ord för en sak: ett ord som slutar på ett av huvudorden (Lyssningsbladet, Sifferkort, Lathunden) eller ett
 * långt sammansatt ord (Samtalsreglerna)? Ett sådant namn hittas också med liten bokstav; ett annat namn, som "Min
 * huvudperson", bara som en titel, med stor bokstav mitt i en mening (Codex 2026-10-24: "min huvudperson" i en mening om
 * lärarens figur blev en länk till bladet).
 * @param {string} namn
 */
export function arSaksord(namn) {
  const n = String(namn ?? '').trim();
  return !/\s/.test(n) && (!!huvudordet(n) || n.length >= 12);
}

/**
 * Formerna av en saks namn, som metodens rubriker skriver det i bestämd form: "Samtalskortet" ger samtalskortet,
 * samtalskortets och samtalskorten, och "Startmeningarna" ger startmeningen. Första bokstaven får vara stor eller liten.
 * @param {string} namn
 * @returns {string[]}
 */
export function sakensFormer(namn) {
  const n = String(namn ?? '').trim();
  if (!n) return [];
  const former = new Set([n, `${n}s`]);
  const huvud = /\s/.test(n) ? undefined : huvudordet(n);
  if (huvud) {
    const stam = n.slice(0, n.length - huvud.form.length);
    for (const f of huvud.former) former.add(`${stam}${f}`);
  } else if (/arna$/.test(n)) {
    const stam = n.slice(0, -4);
    for (const f of ['en', 'ens', 'arnas']) former.add(`${stam}${f}`);
  } else if (/et$/.test(n)) {
    const stam = n.slice(0, -2);
    for (const f of ['en', 'ens', 'ets']) former.add(`${stam}${f}`);
  }
  return [...former];
}

const skydda = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// En form som söks: hela ord, och första bokstaven stor eller liten om inte saken är en titel, som bara står som den är.
const formMonster = (f, versal) => (versal ? skydda(f) : `[${skydda(f.charAt(0).toLocaleLowerCase('sv'))}${skydda(f.charAt(0).toLocaleUpperCase('sv'))}]${skydda(f.slice(1))}`);
// Först i en mening, där varje ord har stor bokstav, är en titel inte säkert en titel ("Inte än har eleverna …").
const forstIMening = (fore) => /(^|[.!?:]\s*|\n\s*)$/.test(fore);

/**
 * Texten i delar, där en del med sak är ett namn på en av sakerna: den längsta träffen först, och bara hela ord. En titel
 * (versal) hittas bara som den står och inte först i en mening.
 * @param {string} text
 * @param {{ namn: string, former?: string[], versal?: boolean }[]} saker
 * @returns {{ text: string, sak?: number }[]}
 */
export function sakdelar(text, saker) {
  if (!text || !saker?.length) return [{ text: text ?? '' }];
  const traffar = [];
  saker.forEach((s, i) => {
    for (const f of s.former ?? sakensFormer(s.namn)) {
      if (!f) continue;
      for (const m of text.matchAll(new RegExp(`(^|[^\\p{L}\\p{N}])(${formMonster(f, s.versal)})(?![\\p{L}\\p{N}])`, 'gu'))) {
        const start = m.index + m[1].length;
        if (s.versal && forstIMening(text.slice(0, start))) continue;
        traffar.push({ start, slut: start + m[2].length, sak: i });
      }
    }
  });
  if (!traffar.length) return [{ text }];
  const valda = [];
  for (const t of traffar.sort((a, b) => a.start - b.start || b.slut - a.slut)) if (!valda.some((v) => t.start < v.slut && v.start < t.slut)) valda.push(t);
  valda.sort((a, b) => a.start - b.start);
  const ut = [];
  let fran = 0;
  for (const t of valda) {
    if (t.start > fran) ut.push({ text: text.slice(fran, t.start) });
    ut.push({ text: text.slice(t.start, t.slut), sak: t.sak });
    fran = t.slut;
  }
  if (fran < text.length) ut.push({ text: text.slice(fran) });
  return ut;
}

/**
 * Namn i texten som ser ut som en sak i metoden men inte är någon av sakerna: ett sammansatt ord på blad, kort, mall,
 * protokoll, schema, kontrakt, lista, test eller diplom i bestämd form, som "lyssningsbladet". Bygget stannar på dem, så att
 * en text aldrig nämner ett blad som metoden inte har, också efter en ändring i metoden. Ett ord för sig, som "korten",
 * säger inte vilken sak det är och prövas inte.
 * @param {string} text
 * @param {{ namn: string, former?: string[], versal?: boolean }[]} saker
 * @returns {string[]}
 */
export function olankadeSaker(text, saker) {
  const fritt = sakdelar(text ?? '', saker ?? []).filter((d) => d.sak === undefined).map((d) => d.text).join('\n');
  // Utan lookbehind, som Safari före 16.4 inte kan: tecknet före ordet fångas.
  const ord = [...fritt.matchAll(new RegExp(`(^|[^\\p{L}])(\\p{L}{3,}(?:${BESTAMDA.join('|')}))(?![\\p{L}])`, 'giu'))].map((m) => m[2]);
  return [...new Set(ord)];
}
