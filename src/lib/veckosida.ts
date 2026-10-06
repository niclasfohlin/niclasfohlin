// Veckans sida i sidans utskrift (en ram med lektioner, De fyra räknesätten i grupp): ryms veckans text, raden ur
// kartan och bilden På bordet på ett A4, som veckosidan i Word (veckansBildHojd i metoddocx.ts)? I utskriften står
// veckans text i 9 punkter med smala etiketter (Niclas 2026-10-04: "Testa En sida med mindre text"), veckan är en sida
// hög och bilden fyller det som blir kvar (global.css, .m-vecka), så webbläsaren mäter själv. Här avgörs bara om det som
// blir kvar räcker till en bild på minst 80 mm av 102 (full bredd); annars står raden ur kartan och bilden i full storlek
// på nästa sida (Niclas: "Om det är två sidor är det bättre att bas, medel och avancerad är på samma sida som på
// bordet"). Uppskattningen räknar tecken per rad med utskriftens mått: satsytan är 261 mm hög och 182 mm bred, fälten
// står i 9 punkter med radavståndet 1,3 i en kolumn på 146 mm bredvid en etikettkolumn på 31 mm. Mätt i utskriften
// 2026-10-04 blev texten 0,77–0,92 av räkningen, i medel 0,88, och raden ur kartan med sin rubrik, bildtexten och
// luften 54–69 mm; bilden fick då 91–102 mm i alla åtta veckor. Rubriken över raden, omkring 6 mm, är sedan borttagen.
const SATS = 259;
const RAD = 4.13; // 9 pt × 1,3
const FALT_LUFT = 2.4;
const RUBRIK = 8;
const TECKEN_PER_RAD = 85;
const ETIKETT_PER_RAD = 13;
const TEXTEN = 0.88;
const KARTRADEN = 34; // utan rubriken över raden (Niclas 2026-10-04)
const KARTCELL_PER_RAD = 30;
const BILDTEXT_PER_RAD = 106;
const MINSTA_BILD = 80;
const rader = (text: string, perRad: number) => text.split('\n').reduce((s, l) => s + Math.max(1, Math.ceil(l.length / perRad)), 0);

export function veckanRyms(falt: { rubrik: string; text: string }[], kartrad: string[] | undefined, bildtext = ''): boolean {
  let text = RUBRIK;
  for (const f of falt) text += Math.max(rader(f.rubrik, ETIKETT_PER_RAD), rader(f.text, TECKEN_PER_RAD)) * RAD + FALT_LUFT;
  text *= TEXTEN;
  let block = 0;
  if (kartrad) block += KARTRADEN + Math.max(...kartrad.map((c) => rader(c, KARTCELL_PER_RAD))) * 3.5;
  if (bildtext) block += rader(`På bordet. ${bildtext}`, BILDTEXT_PER_RAD) * 4.2;
  // Utan bild På bordet (Ordverkstad i grupp) behöver bara raden ur kartan rymmas; annars stod raden ensam på en egen
  // sida efter varje vecka (granskningen 2026-10-06, P1).
  return SATS - text - 3 - block >= (bildtext ? MINSTA_BILD : 0);
}
