// Metodens saker med sina adresser (K-493; Niclas 2026-10-24: "Om något är specifikt namngivet från metoden. Ett test. Ett
// papper. En text. En specifik lektion. Då ska det vara hyperlänkat från planen. Men fundera på hur det görs utan drift om
// metoden uppdateras"). En sak är något som metoden har ett namn på och sajten en egen adress för. Listan byggs ur
// metodens fil vid varje bygge, med adresserna som sajten själv ger sakerna (metodens ankare, bankens sidor, filerna), så
// att ett nytt eller ändrat namn följer med av sig själv. Standarden hittar namnen i en text (sakdelar) och säger vilka
// namn som ingen sak har (olankadeSaker), och bygget stannar på dem (insatsplanFel). Reglerna står i STIL.md under
// Hänvisningar.
import type { MetodData } from './metod';
import { harLathund, passOrd, passOversikt } from './metod';
import { bankAv, enhetAdress, iBanken } from './bank';
import { mallarnasAnkare, metodensAnkare, metodensAvsnitt } from './metodankare';
import { metodensLektionskort } from './lektionskort';
import { forstaLed } from './karta';
import { CENTRALA, lasbarAdress } from './centrala';
import { arSaksord, forstaLedet, forstaOrdet, slugAv, veckorI } from './standard/index.js';

/**
 * En sak med sin adress. nivaer: adressen på varje nivå, när saken finns på bankens nivåer (kartläggningens text före).
 * veckor: adressen för metodens veckor, när saken finns en gång för några veckor (Mina lärdomar: vecka 1–2).
 */
export interface MetodSak { namn: string; former?: string[]; versal?: boolean; adress: string; nivaer?: Record<string, string>; veckor?: Record<string, string>; slag?: 'avsnitt' | 'tabell' }

// Veckorna som ett led i en rubrik säger: "vecka 3" och "vecka 1–2".
const veckornaI = (led?: string): number[] | undefined => { const v = veckorI(led); return v ? Array.from({ length: v.till - v.fran + 1 }, (_, i) => v.fran + i) : undefined; };

/** Metodens avsnitt, och deras och tabellernas ankare, som metodens sida ger dem (src/lib/metodankare.ts). */
export const sidansAvsnitt = (d: MetodData) => metodensAvsnitt(d, { pass: !!passOversikt(d), stegen: passOrd(d).stegen });
export const sidansAnkare = (d: MetodData) => metodensAnkare(d, sidansAvsnitt(d));

/**
 * Kursens veckor i metoden (en ram med lektioner, som De fyra räknesätten): ankaret för varje veckas lektion, och veckans
 * titel ("Vecka 3 · Hundratal och två växlingar" har titeln Hundratal och två växlingar).
 */
export function kursensVeckor(d: MetodData, id: string): Record<string, { adress: string; titel: string }> {
  const { delAnkare } = sidansAnkare(d);
  const ut: Record<string, { adress: string; titel: string }> = {};
  (d.ramar?.ramar ?? []).forEach((r, ri) => {
    if (!r.lektioner) return;
    r.delar.forEach((del, di) => { const v = veckornaI(forstaLed(del.rubrik)); if (v?.length === 1 && !ut[v[0]]) ut[v[0]] = { adress: `/stodundervisning/${id}#${delAnkare[ri][di]}`, titel: del.rubrik.split(' · ').slice(1).join(' · ').trim() }; });
  });
  return ut;
}

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
  const avsnitt = sidansAvsnitt(d);
  const { ramAnkare, tabellAnkare, blad, bladAnkare } = metodensAnkare(d, avsnitt);
  const nivaNamn = new Map((bank?.nivaer ?? []).map((n) => [n.namn, n.slug]));
  const perNamn = new Map<string, { adress: string; niva?: string; veckor?: number[]; oversikt?: boolean }[]>();
  ramar.forEach((r, ri) => {
    // Nivåernas översikter heter som nivåerna, och en nivå är ett urval, ingen sak. En översikt med ett namn och nivån efter
    // kolon, som "Lärarens sidor: Mellan", är en sak på varje nivå (länkgranskningen 2026-10-25: "sidan om den under
    // Lärarens sidor" stod i varje pass utan länk).
    const [namn, efter] = r.rubrik.split(':').map((x) => x.trim());
    const oversikt = !!bank?.oversikter.has(ri) && !!efter && nivaNamn.has(efter) && !nivaNamn.has(namn);
    if (iBanken(bank, ri) && bank.handledning !== ri && !oversikt) return;
    if (!namn) return;
    const adress = bank?.handledning === ri ? `${sida}/texter/lararhandledning` : `${sida}#${ramAnkare[ri]}`;
    const veckor = veckornaI(efter);
    perNamn.set(namn, [...(perNamn.get(namn) ?? []), { adress, ...(efter && nivaNamn.has(efter) ? { niva: nivaNamn.get(efter)! } : {}), ...(veckor ? { veckor } : {}), ...(oversikt ? { oversikt } : {}) }]);
  });
  for (const [namn, platser] of perNamn) {
    if (platser.length === 1) saker.push(sak(namn, platser[0].adress));
    // Samma namn på varje nivå ("Lärarens sidor: Lättläst") leder till nivåns, och samma namn för olika veckor ("Mina
    // lärdomar: vecka 1–2") till veckans; utan nivå eller vecka till den första. Annars leder namnet till den första ramen,
    // som i en serie av blad ("Övningsblad: Addition" och de andra) där den första är början.
    // Nivåernas översikter leder utan nivå till materialet, som kartläggningens texter.
    else if (platser.every((p) => p.niva)) saker.push(sak(namn, platser.every((p) => p.oversikt) ? `${sida}#ramar` : platser[0].adress, { nivaer: Object.fromEntries(platser.map((p) => [p.niva!, p.adress])) }));
    else if (platser.every((p) => p.veckor)) saker.push(sak(namn, platser[0].adress, { veckor: Object.fromEntries(platser.flatMap((p) => p.veckor!.map((v) => [String(v), p.adress]))) }));
    else saker.push(sak(namn, platser[0].adress));
  }
  // En rams titel efter kolon, som "Åt båda hållen" i "Läxa: Åt båda hållen" och "Fönsterplatsen" i "Bildserie 1:
  // Fönsterplatsen", är också ett namn på ramen, när titeln börjar med stor bokstav och ingen annan ram har den
  // (länkgranskningen 2026-10-25: "bladet Åt båda hållen" och "Lägg Fönsterplatsen på A3" blev ingen länk).
  const titlar = new Map<string, string[]>();
  ramar.forEach((r, ri) => {
    if (iBanken(bank, ri)) return;
    const titel = r.rubrik.split(':').slice(1).join(':').trim();
    // En titel med liten bokstav räknas när den är ett ord för en sak, som "lärarens protokoll".
    if (titel && (/^\p{Lu}/u.test(titel) || arSaksord(titel)) && !nivaNamn.has(titel) && !veckornaI(titel)) titlar.set(titel, [...(titlar.get(titel) ?? []), `${sida}#${ramAnkare[ri]}`]);
  });
  // Titeln länkas bara som titel, med stor bokstav mitt i en mening, så att "multiplikation" inte leder till Övningsblad:
  // Multiplikation.
  for (const [titel, adresser] of titlar) if (adresser.length === 1 && !perNamn.has(titel)) saker.push(/^\p{Lu}/u.test(titel) ? { ...sak(titel, adresser[0]), versal: true } : sak(titel, adresser[0]));
  // Materialets avsnitt, som "Kursens material", och kursens veckor och blad: "vecka 3" leder till veckans lektion i en kurs
  // med veckor, och "Addition 1" till bladet (src/lib/karta.ts).
  if (d.ramar?.rubrik) saker.push(sak(d.ramar.rubrik, `${sida}#ramar`));
  for (const [v, { adress }] of Object.entries(kursensVeckor(d, id))) saker.push({ namn: `Vecka ${v}`, former: [`Vecka ${v}`, `vecka ${v}`], adress });
  for (const [namn, plats] of blad) { const a = bladAnkare.get(`${plats.ri}-${plats.li}`); if (a) saker.push({ namn, former: [namn], versal: true, adress: `${sida}#${a}` }); }
  // Ett blad med en titel efter kolon, som "Du som leder: läs en rad i taget", heter också det första ledet, när inget annat
  // blad och ingen annan sak har det (länkgranskningen av omgång 1 2026-10-26: "kortet Du som leder" blev ingen länk).
  const bladensLed = new Map<string, string[]>();
  for (const [namn, plats] of blad) { const a = bladAnkare.get(`${plats.ri}-${plats.li}`); if (a && namn.includes(':')) bladensLed.set(forstaLedet(namn), [...(bladensLed.get(forstaLedet(namn)) ?? []), `${sida}#${a}`]); }
  for (const [led, adresser] of bladensLed) if (led && adresser.length === 1 && !saker.some((s) => s.namn.toLowerCase() === led.toLowerCase())) saker.push(sak(led, adresser[0]));
  // Kontraktet och schemat under Hem och skola (TIL i grupp) står i materialet med egna ankare; namnet är rubrikens första
  // ord, som Lässchema i "Lässchema TIL" (Codex 2026-10-24).
  if (d.hem?.kontrakt) saker.push(sak(forstaOrdet(d.hem.kontrakt.rubrik), `${sida}#kontraktet`));
  if (d.hem?.schema) saker.push(sak(forstaOrdet(d.hem.schema.rubrik), `${sida}#schemat`));
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
  // Lathundens tredje sida, som kortet Säg varje gång i De fyra räknesätten, har sin egen knapp som skriver ut den, och
  // metodens filmer står i spelaren överst på lathundssidan, med en knapp som laddar ner dem (Niclas 2026-10-25: det som
  // behövs ska namnges och länkas, "annars ha knapp för ladda ner").
  const mallensNamn = d.lathund?.mall?.rubrik?.trim();
  if (harLathund(d) && mallensNamn && !saker.some((s) => s.namn.toLowerCase() === mallensNamn.toLowerCase())) saker.push(sak(mallensNamn, `${sida}/lathund#lh-3`));
  if (harLathund(d) && d.film) saker.push({ namn: 'filmerna', former: ['filmerna', 'Filmerna', 'metodens filmer', 'metodens film', 'Metodens filmer', 'Metodens film'], adress: `${sida}/lathund#lathund-film` });
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
  // Metodens avsnitt och tabeller med sina rubriker, som "Talen och bladen i veckorna" och "Var hittar du bildserierna och
  // händelserna?": en text som säger rubriken leder dit (länkgranskningen 2026-10-25; STIL.md under Hänvisningar: en
  // hänvisning till en sida som sajten har är en länk dit). Namnet är rubrikens första led, eller hela rubriken när det
  // första ledet är ett pass eller en vecka i ordningen ("Pass 1: syftet …"), som inte länkas för sig. Ett namn som en sak
  // redan har blir inget nytt. Avsnitten och tabellerna är metodens text, som skrivs ut med metoden, så planprovet kräver
  // ingen knapp under dem (slag); kursintyget är ett blad, med sin egen fil (src/lib/sakfiler.ts).
  const tagna = new Set(saker.map((s) => s.namn.toLowerCase()));
  const rubrikensNamn = (rubrik: string) => { const forsta = forstaLedet(rubrik); return /^(pass|vecka|veckorna|nivå)\b/i.test(forsta) ? rubrik.trim() : forsta; };
  const avsnittet = (rubrik: string | undefined, adress: string, slag?: MetodSak['slag']) => {
    const namn = rubrik ? rubrikensNamn(rubrik) : '';
    if (!namn || tagna.has(namn.toLowerCase())) return;
    tagna.add(namn.toLowerCase());
    saker.push(sak(namn, adress, slag ? { slag } : {}));
  };
  const rutor = d as unknown as Record<string, { rubrik?: string } | undefined>;
  for (const a of avsnitt) if (a.id !== 'ramar' && a.id !== 'mallar') avsnittet(rutor[a.id]?.rubrik, `${sida}#${a.id}`, a.id === 'diplom' ? undefined : 'avsnitt');
  avsnittet(d.gruppen?.rubrik, `${sida}#gruppen`, 'avsnitt');
  avsnittet(d.principer?.rubrik, `${sida}#principer`, 'avsnitt');
  for (const t of d.tabeller) { const a = tabellAnkare.get(t); if (a) avsnittet(t.rubrik, `${sida}#${a}`, 'tabell'); }
  // Verktygen och stödmaterialen på sajten, som texten nämner med namnet i registret (STIL.md under Hänvisningar).
  for (const c of CENTRALA) if (c.slag !== 'formular') saker.push({ namn: c.namn, former: [c.namn], versal: true, adress: lasbarAdress(c) });
  return saker;
}
