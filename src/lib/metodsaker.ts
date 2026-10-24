// Metodens saker med sina adresser (K-493; Niclas 2026-10-24: "Om något är specifikt namngivet från metoden. Ett test. Ett
// papper. En text. En specifik lektion. Då ska det vara hyperlänkat från planen. Men fundera på hur det görs utan drift om
// metoden uppdateras"). En sak är något som metoden har ett namn på och sajten en egen adress för. Listan byggs ur
// metodens fil vid varje bygge, med adresserna som sajten själv ger sakerna (metodens ankare, bankens sidor, filerna), så
// att ett nytt eller ändrat namn följer med av sig själv. Standarden hittar namnen i en text (sakdelar) och säger vilka
// namn som ingen sak har (olankadeSaker), och bygget stannar på dem (insatsplanFel). Reglerna står i STIL.md under
// Hänvisningar.
import type { MetodData } from './metod';
import { harLathund, passOrd, passOversikt } from './metod';
import { bankAv, enhetAdress } from './bank';
import { mallarnasAnkare, metodensAnkare, metodensAvsnitt } from './metodankare';
import { metodensLektionskort } from './lektionskort';
import { CENTRALA, lasbarAdress } from './centrala';
import { arSaksord, slugAv } from './standard/index.js';

/** En sak med sin adress. nivaer: adressen på varje nivå, när saken finns på bankens nivåer (kartläggningens text före). */
export interface MetodSak { namn: string; former?: string[]; versal?: boolean; adress: string; nivaer?: Record<string, string> }

// Formerna av en sak som heter med två led eller fler, som "kartläggning före": kartläggningen före, kartläggningens text
// före och kartläggningens texter före.
const ledensFormer = (vad: string) => {
  const [forsta, ...resten] = vad.trim().split(/\s+/);
  const r = resten.length ? ` ${resten.join(' ')}` : '';
  return [`${forsta}${r}`, `${forsta}en${r}`, `${forsta}ens text${r}`, `${forsta}ens texter${r}`];
};

// Ett namn som är ett ord för en sak (Lyssningsbladet, Samtalsreglerna) hittas också med liten bokstav; ett annat namn,
// som "Min huvudperson", bara som en titel, med stor bokstav mitt i en mening (arSaksord i standarden).
const sak = (namn: string, adress: string, extra: Partial<MetodSak> = {}): MetodSak => ({ namn, adress, ...(arSaksord(namn) ? {} : { versal: true }), ...extra });

/** Metodens saker: materialets ramar, mallarna, snabbmallen, lektionskorten, lathunden, bankens texter och verktygen. */
export function metodensSaker(d: MetodData, id: string): MetodSak[] {
  const sida = `/stodundervisning/${id}`;
  const saker: MetodSak[] = [];
  const bank = bankAv(d);
  const ramar = d.ramar?.ramar ?? [];
  // Materialets ramar leder till ramen på metodens sida, där bladet står med sin knapp Skriv ut. Namnet är rubrikens första
  // led ("Lärarhandledningen: Läs mellan raderna tillsammans" heter Lärarhandledningen). Bankens texter och deras sidor
  // står på egna sidor och kommer nedan; bankens lärarhandledning har sin egen sida.
  const { ramAnkare } = metodensAnkare(d, metodensAvsnitt(d, { pass: !!passOversikt(d), stegen: passOrd(d).stegen }));
  const nivaNamn = new Map((bank?.nivaer ?? []).map((n) => [n.namn, n.slug]));
  const perNamn = new Map<string, { adress: string; niva?: string }[]>();
  ramar.forEach((r, ri) => {
    // Nivåernas översikter heter som nivåerna, och en nivå är ett urval, ingen sak.
    if ((bank?.ramar.has(ri) || bank?.oversikter.has(ri)) && bank.handledning !== ri) return;
    const [namn, efter] = r.rubrik.split(':').map((x) => x.trim());
    if (!namn) return;
    const adress = bank?.handledning === ri ? `${sida}/texter/lararhandledning` : `${sida}#${ramAnkare[ri]}`;
    perNamn.set(namn, [...(perNamn.get(namn) ?? []), { adress, ...(efter && nivaNamn.has(efter) ? { niva: nivaNamn.get(efter)! } : {}) }]);
  });
  for (const [namn, platser] of perNamn) {
    if (platser.length === 1) saker.push(sak(namn, platser[0].adress));
    // Samma namn på varje nivå ("Lärarens sidor: Lättläst") leder till nivåns; utan nivå till den första.
    else if (platser.every((p) => p.niva)) saker.push(sak(namn, platser[0].adress, { nivaer: Object.fromEntries(platser.map((p) => [p.niva!, p.adress])) }));
  }
  // Kontraktet och schemat under Hem och skola (TIL i grupp) står i materialet med egna ankare; namnet är rubrikens första
  // ord, som Lässchema i "Lässchema TIL" (Codex 2026-10-24).
  if (d.hem?.kontrakt) saker.push(sak(d.hem.kontrakt.rubrik.split(/\s+/)[0], `${sida}#kontraktet`));
  if (d.hem?.schema) saker.push(sak(d.hem.schema.rubrik.split(/\s+/)[0], `${sida}#schemat`));
  // Mallarna, var och en med sitt ankare under Mallar att skriva ut, och alla tillsammans.
  const mallAnkare = mallarnasAnkare(d);
  d.mallar.forEach((m, i) => saker.push(sak(m.rubrik, `${sida}#${mallAnkare[i]}`)));
  if (d.mallar.length) saker.push(sak('Planeringsmallarna', `${sida}#mallar`));
  if (d.snabbmall) {
    saker.push(sak('Snabbmallen', `${sida}#snabbmall`));
    if (d.snabbmall.rubrik) saker.push(sak(d.snabbmall.rubrik, `${sida}#snabbmall`));
  }
  // Lektionskorten: kortets namn, och "lektionskortet" när metoden har ett enda.
  const kort = metodensLektionskort(d, id);
  for (const k of kort) if (k.namn) saker.push(sak(k.namn, k.adress));
  if (kort.length === 1) saker.push(sak('Lektionskortet', kort[0].adress));
  if (harLathund(d)) saker.push(sak('Lathunden', `${sida}/lathund`));
  // Bankens texter och problem: titeln, som den står och inte först i en mening, och en text utan nummer, som
  // kartläggningens text före, på planens nivå.
  if (bank) {
    const titlar = new Map<string, string[]>();
    for (const e of bank.enheter) if (e.l.titel) titlar.set(e.l.titel, [...(titlar.get(e.l.titel) ?? []), enhetAdress(id, e)]);
    for (const [titel, adresser] of titlar) if (adresser.length === 1 && titel.length >= 4) saker.push({ namn: titel, former: [titel], versal: true, adress: adresser[0] });
    const utanNummer = new Map<string, Record<string, string>>();
    for (const e of bank.enheter) if (e.nr === undefined) utanNummer.set(e.l.vad, { ...(utanNummer.get(e.l.vad) ?? {}), [slugAv(e.l.niva)]: enhetAdress(id, e) });
    for (const [vad, nivaer] of utanNummer) saker.push({ namn: vad, former: ledensFormer(vad), adress: `${sida}#ramar`, nivaer });
  }
  // Verktygen och stödmaterialen på sajten, som texten nämner med namnet i registret (STIL.md under Hänvisningar).
  for (const c of CENTRALA) if (c.slag !== 'formular') saker.push({ namn: c.namn, former: [c.namn], versal: true, adress: lasbarAdress(c) });
  return saker;
}
